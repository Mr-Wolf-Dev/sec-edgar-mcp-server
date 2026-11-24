import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { SecHttpClient } from '../../src/adapters/sec-http-client.js';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SecHttpClient', () => {
  it('resolves ticker to CIK and fetches submissions & facts', async () => {
    server.use(
      http.get('https://www.sec.gov/files/company_tickers.json', () =>
        HttpResponse.json({
          '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
        }),
      ),
      http.get('https://data.sec.gov/submissions/CIK0000320193.json', () =>
        HttpResponse.json({
          cik: '0000320193',
          name: 'Apple Inc.',
          tickers: ['AAPL'],
          exchanges: ['Nasdaq'],
          filings: {
            recent: {
              accessionNumber: ['0000320193-26-000100'],
              filingDate: ['2026-11-01'],
              reportDate: ['2026-09-30'],
              form: ['10-K'],
              primaryDocument: ['aapl.htm'],
              primaryDocDescription: ['10-K'],
            },
          },
        }),
      ),
      http.get('https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json', () =>
        HttpResponse.json({
          cik: 320193,
          entityName: 'Apple Inc.',
          facts: {
            'us-gaap': {
              Revenues: {
                units: { USD: [{ val: 400000000000, end: '2026-09-30', form: '10-K' }] },
              },
            },
          },
        }),
      ),
    );

    const client = new SecHttpClient({ retryDelayMs: 0 });
    const cik = await client.resolveCik('AAPL');
    expect(cik).toBe('0000320193');

    const sub = await client.fetchCompanySubmissions('0000320193');
    expect(sub?.filings).toHaveLength(1);

    const facts = await client.fetchCompanyFacts('0000320193', 'AAPL');
    expect(facts?.metrics.revenue?.value).toBe(400000000000);
  });
});
