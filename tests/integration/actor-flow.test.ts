import { describe, expect, it } from 'vitest';
import { runFilingExtraction, type EdgarBillingEvent } from '../../src/adapters/apify-actor.js';
import type { NormalizedFiling } from '../../src/domain/edgar-schema.js';
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
    return null;
  },
};

describe('runFilingExtraction', () => {
  it('pushes normalized filings and charges filing-extracted PPE events', async () => {
    const pushed: NormalizedFiling[] = [];
    const charges: Array<{ eventName: EdgarBillingEvent; count: number }> = [];

    const billing: BillingMeter<EdgarBillingEvent> = {
      async charge(eventName, count = 1) {
        charges.push({ eventName, count });
      },
    };

    const result = await runFilingExtraction(
      { tickersOrCiks: ['AAPL'], forms: ['10-K'] },
      {
        source: fakeSource,
        billing,
        pushData: async (items) => {
          pushed.push(...items);
        },
      },
    );

    expect(result).toHaveLength(1);
    expect(pushed).toHaveLength(1);
    expect(charges).toEqual([{ eventName: 'filing-extracted', count: 1 }]);
  });
});
