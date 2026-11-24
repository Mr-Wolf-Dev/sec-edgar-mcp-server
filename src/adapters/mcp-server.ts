import type { Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { parseActorInput } from '../domain/edgar-schema.js';
import { filterAndDeduplicateFilings } from '../domain/filing-filter.js';
import type { EdgarSource } from '../ports/edgar-source.js';
import type { BillingMeter } from '../shared/billing-meter.js';
import { createMcpHttpServer } from '../shared/mcp-http-server.js';
import type { EdgarBillingEvent } from './apify-actor.js';
import { fetchFilingsForTargets } from './sec-http-client.js';

export interface McpServerDependencies {
  source: EdgarSource;
  billing: BillingMeter<EdgarBillingEvent>;
}

function createConfiguredMcpServer(deps: McpServerDependencies): McpServer {
  const server = new McpServer({
    name: 'sec-edgar-mcp-server',
    version: '0.1.0',
  });

  server.registerTool(
    'search_sec_filings',
    {
      description:
        'Search and filter official SEC EDGAR filings (10-K, 10-Q, 8-K, Form 4) by ticker or CIK.',
      inputSchema: {
        tickersOrCiks: z
          .array(z.string().min(1))
          .min(1)
          .describe('Ticker symbols or CIK numbers (e.g. ["AAPL", "NVDA", "0000789019"])'),
        forms: z.array(z.string()).optional().describe('SEC form types (e.g. ["10-K", "10-Q", "8-K"])'),
        filedAfter: z.string().optional().describe('Minimum filing date (YYYY-MM-DD)'),
        filedBefore: z.string().optional().describe('Maximum filing date (YYYY-MM-DD)'),
        maxItems: z.number().int().min(1).max(200).optional().describe('Maximum filings to return'),
      },
    },
    async ({ tickersOrCiks, forms, filedAfter, filedBefore, maxItems }) => {
      const criteria = parseActorInput({
        tickersOrCiks,
        forms: forms ?? [],
        filedAfter,
        filedBefore,
        maxItems: maxItems ?? 25,
      });

      const { filings: rawFilings, notFound } = await fetchFilingsForTargets(deps.source, criteria);
      const filings = filterAndDeduplicateFilings(rawFilings, criteria);
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: filings.length, filings, notFound }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_company_profile',
    {
      description: 'Fetch SEC EDGAR company profile (CIK, SIC, tickers, exchanges, fiscal year end).',
      inputSchema: {
        tickerOrCik: z.string().min(1).describe('Ticker symbol (e.g. "AAPL") or 10-digit CIK'),
      },
    },
    async ({ tickerOrCik }) => {
      const cik = await deps.source.resolveCik(tickerOrCik);
      const sub = cik ? await deps.source.fetchCompanySubmissions(cik) : null;
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { found: sub !== null, profile: sub?.profile ?? null },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_company_financials',
    {
      description:
        'Fetch latest structured XBRL financial metrics (revenue, netIncome, assets, liabilities, cash, EPS) from SEC EDGAR.',
      inputSchema: {
        tickerOrCik: z.string().min(1).describe('Ticker symbol (e.g. "AAPL") or CIK'),
      },
    },
    async ({ tickerOrCik }) => {
      const cik = await deps.source.resolveCik(tickerOrCik);
      const tickerGuess = /^\d+$/.test(tickerOrCik.trim())
        ? null
        : tickerOrCik.trim().toUpperCase();
      const summary = cik ? await deps.source.fetchCompanyFacts(cik, tickerGuess) : null;
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ found: summary !== null, financials: summary }, null, 2),
          },
        ],
      };
    },
  );

  return server;
}

/**
 * Creates a stateless Streamable HTTP MCP server compatible with Apify Standby mode.
 */
export function createEdgarMcpHttpServer(deps: McpServerDependencies): Server {
  return createMcpHttpServer({
    serviceName: 'sec-edgar-mcp-server',
    createServer: () => createConfiguredMcpServer(deps),
  });
}
