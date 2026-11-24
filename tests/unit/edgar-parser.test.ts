import { describe, expect, it } from 'vitest';
import {
  parseCompanyFactsSummary,
  parseSubmissionsResponse,
  parseTickerMap,
} from '../../src/domain/edgar-parser.js';

describe('parseTickerMap', () => {
  it('parses SEC company_tickers.json into uppercase ticker map', () => {
    const map = parseTickerMap({
      '0': { cik_str: 320193, ticker: 'aapl', title: 'Apple Inc.' },
    });
    expect(map.get('AAPL')).toEqual({
      cik: '0000320193',
      ticker: 'AAPL',
      title: 'Apple Inc.',
    });
  });
});

describe('parseSubmissionsResponse', () => {
  it('parses profile and builds canonical documentUrl and secIndexUrl', () => {
    const parsed = parseSubmissionsResponse({
      cik: '0000320193',
      name: 'Apple Inc.',
      tickers: ['AAPL'],
      exchanges: ['Nasdaq'],
      sic: '3571',
      sicDescription: 'Electronic Computers',
      fiscalYearEnd: '0930',
      filings: {
        recent: {
          accessionNumber: ['0000320193-26-000100'],
          filingDate: ['2026-11-01'],
          reportDate: ['2026-09-30'],
          form: ['10-K'],
          primaryDocument: ['aapl-20260930.htm'],
          primaryDocDescription: ['10-K'],
        },
      },
    });

    expect(parsed.profile.companyName).toBe('Apple Inc.');
    expect(parsed.filings[0]).toMatchObject({
      filingId: '0000320193:0000320193-26-000100',
      ticker: 'AAPL',
      form: '10-K',
      filingDate: '2026-11-01',
      documentUrl:
        'https://www.sec.gov/Archives/edgar/data/320193/000032019326000100/aapl-20260930.htm',
      secIndexUrl:
        'https://www.sec.gov/Archives/edgar/data/320193/000032019326000100/0000320193-26-000100-index.htm',
    });
  });
});

describe('parseCompanyFactsSummary', () => {
  it('extracts latest 10-K/10-Q US-GAAP metrics', () => {
    const summary = parseCompanyFactsSummary(
      {
        cik: 320193,
        entityName: 'Apple Inc.',
        facts: {
          'us-gaap': {
            Revenues: {
              units: {
                USD: [
                  { val: 390000000000, end: '2025-09-30', form: '10-K' },
                  { val: 410000000000, end: '2026-09-30', form: '10-K' },
                ],
              },
            },
            NetIncomeLoss: {
              units: {
                USD: [{ val: 100000000000, end: '2026-09-30', form: '10-K' }],
              },
            },
          },
        },
      },
      'AAPL',
    );

    expect(summary.metrics.revenue).toEqual({
      value: 410000000000,
      unit: 'USD',
      endDate: '2026-09-30',
      form: '10-K',
    });
    expect(summary.metrics.netIncome?.value).toBe(100000000000);
    expect(summary.metrics.assets).toBeNull();
  });
});
