import { describe, expect, it } from 'vitest';
import type { NormalizedFiling } from '../../src/domain/edgar-schema.js';
import { filterAndDeduplicateFilings } from '../../src/domain/filing-filter.js';

const SAMPLES: NormalizedFiling[] = [
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
  {
    filingId: '0000320193:acc-2',
    cik: '0000320193',
    companyName: 'Apple Inc.',
    ticker: 'AAPL',
    sic: '3571',
    sicDescription: 'Electronic Computers',
    accessionNumber: 'acc-2',
    form: '4',
    filingDate: '2026-11-19',
    reportDate: '2026-11-17',
    primaryDocument: 'b.xml',
    description: 'FORM 4',
    documentUrl: 'https://www.sec.gov/b.xml',
    secIndexUrl: 'https://www.sec.gov/idx2',
  },
];

describe('filterAndDeduplicateFilings', () => {
  it('deduplicates, filters by form and date, and sorts newest-first', () => {
    const res = filterAndDeduplicateFilings(SAMPLES, {
      forms: ['10-K'],
      filedAfter: '2026-10-01',
      filedBefore: '2026-12-01',
      maxItems: 50,
    });
    expect(res).toHaveLength(1);
    expect(res[0]?.filingId).toBe('0000320193:acc-1');
  });
});
