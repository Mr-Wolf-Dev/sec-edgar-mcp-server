import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EdgarBillingEvent } from '../../src/adapters/apify-actor.js';
import { createEdgarMcpHttpServer } from '../../src/adapters/mcp-server.js';
import type { EdgarSource } from '../../src/ports/edgar-source.js';
import type { BillingMeter } from '../../src/shared/billing-meter.js';

const fakeSource: EdgarSource = {
  async resolveCik() {
    return '0000320193';
  },
  async fetchCompanySubmissions() {
    return {
      profile: {
        cik: '0000320193',
        companyName: 'Apple Inc.',
        tickers: ['AAPL'],
        exchanges: ['Nasdaq'],
        sic: '3571',
        sicDescription: 'Electronic Computers',
        fiscalYearEnd: '0930',
      },
      filings: [
        {
          filingId: '0000320193:acc-1',
          cik: '0000320193',
          companyName: 'Apple Inc.',
          ticker: 'AAPL',
          sic: '3571',
          sicDescription: 'Electronic Computers',
          accessionNumber: 'acc-1',
          form: '10-K',
          filingDate: '2026-11-01',
          reportDate: '2026-09-30',
          primaryDocument: 'a.htm',
          description: '10-K',
          documentUrl: 'https://www.sec.gov/a.htm',
          secIndexUrl: 'https://www.sec.gov/idx',
        },
      ],
    };
  },
  async fetchCompanyFacts() {
    return {
      cik: '0000320193',
      companyName: 'Apple Inc.',
      ticker: 'AAPL',
      metrics: {
        revenue: { value: 400000000000, unit: 'USD', endDate: '2026-09-30', form: '10-K' },
      },
    };
  },
};

describe('createEdgarMcpHttpServer', () => {
  const charges: Array<{ eventName: EdgarBillingEvent; count: number }> = [];
  const billing: BillingMeter<EdgarBillingEvent> = {
    async charge(eventName, count = 1) {
      charges.push({ eventName, count });
    },
  };

  let baseUrl = '';
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const server = createEdgarMcpHttpServer({
      source: fakeSource,
      billing,
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    closeServer = () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
  });

  afterAll(async () => {
    await closeServer();
  });

  it('responds 200 on GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      service: 'sec-edgar-mcp-server',
    });
  });

  it('exposes search_sec_filings, get_company_profile, and get_company_financials and charges mcp-query', async () => {
    const client = new Client({ name: 'test-mcp-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'get_company_financials',
      'get_company_profile',
      'search_sec_filings',
    ]);

    const searchRes = await client.callTool({
      name: 'search_sec_filings',
      arguments: { tickersOrCiks: ['AAPL'], forms: ['10-K'] },
    });
    const searchParsed = JSON.parse(
      (searchRes.content as Array<{ type: string; text: string }>)[0]?.text ?? '',
    ) as { count: number };
    expect(searchParsed.count).toBe(1);

    const profileRes = await client.callTool({
      name: 'get_company_profile',
      arguments: { tickerOrCik: 'AAPL' },
    });
    const profileParsed = JSON.parse(
      (profileRes.content as Array<{ type: string; text: string }>)[0]?.text ?? '',
    ) as { found: boolean; profile: { companyName: string } };
    expect(profileParsed.found).toBe(true);
    expect(profileParsed.profile.companyName).toBe('Apple Inc.');

    const finRes = await client.callTool({
      name: 'get_company_financials',
      arguments: { tickerOrCik: 'AAPL' },
    });
    const finParsed = JSON.parse(
      (finRes.content as Array<{ type: string; text: string }>)[0]?.text ?? '',
    ) as { found: boolean; financials: { metrics: { revenue: { value: number } } } };
    expect(finParsed.found).toBe(true);
    expect(finParsed.financials.metrics.revenue.value).toBe(400000000000);

    expect(charges).toEqual([
      { eventName: 'mcp-query', count: 1 },
      { eventName: 'mcp-query', count: 1 },
      { eventName: 'mcp-query', count: 1 },
    ]);

    await transport.close();
  });
});
