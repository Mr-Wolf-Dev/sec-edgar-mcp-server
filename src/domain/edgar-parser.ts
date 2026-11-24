import {
  padCik,
  type CompanyFinancialSummary,
  type FinancialMetric,
  type NormalizedFiling,
} from './edgar-schema.js';

export interface TickerEntry {
  cik: string;
  ticker: string;
  title: string;
}

export interface CompanyProfile {
  cik: string;
  companyName: string;
  tickers: string[];
  exchanges: string[];
  sic: string | null;
  sicDescription: string | null;
  fiscalYearEnd: string | null;
}

/**
 * Parses SEC `company_tickers.json` into a Map keyed by uppercase ticker symbol.
 */
export function parseTickerMap(payload: unknown): Map<string, TickerEntry> {
  const map = new Map<string, TickerEntry>();
  if (!payload || typeof payload !== 'object') {
    return map;
  }

  for (const value of Object.values(payload as Record<string, unknown>)) {
    const row = value as { cik_str?: number | string; ticker?: string; title?: string } | null;
    if (!row?.ticker || row.cik_str === undefined) {
      continue;
    }
    const ticker = row.ticker.trim().toUpperCase();
    map.set(ticker, {
      cik: padCik(row.cik_str),
      ticker,
      title: row.title?.trim() || ticker,
    });
  }

  return map;
}

interface SubmissionsRaw {
  cik?: string | number;
  name?: string;
  tickers?: string[];
  exchanges?: string[];
  sic?: string | null;
  sicDescription?: string | null;
  fiscalYearEnd?: string | null;
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      reportDate?: string[];
      form?: string[];
      primaryDocument?: string[];
      primaryDocDescription?: string[];
    };
  };
}

/**
 * Parses SEC `submissions/CIK##########.json` into CompanyProfile and NormalizedFiling[].
 */
export function parseSubmissionsResponse(payload: unknown): {
  profile: CompanyProfile;
  filings: NormalizedFiling[];
} {
  const raw = payload as SubmissionsRaw | null;
  if (!raw || raw.cik === undefined || !raw.name) {
    throw new Error('Invalid SEC submissions payload.');
  }

  const cik = padCik(raw.cik);
  const cikNumeric = String(Number(cik));
  const tickers = Array.isArray(raw.tickers) ? raw.tickers.filter(Boolean) : [];
  const primaryTicker = tickers[0] ?? null;

  const profile: CompanyProfile = {
    cik,
    companyName: raw.name.trim(),
    tickers,
    exchanges: Array.isArray(raw.exchanges) ? raw.exchanges.filter(Boolean) : [],
    sic: raw.sic?.trim() || null,
    sicDescription: raw.sicDescription?.trim() || null,
    fiscalYearEnd: raw.fiscalYearEnd?.trim() || null,
  };

  const recent = raw.filings?.recent;
  const accessions = recent?.accessionNumber ?? [];
  const filingDates = recent?.filingDate ?? [];
  const reportDates = recent?.reportDate ?? [];
  const forms = recent?.form ?? [];
  const primaryDocs = recent?.primaryDocument ?? [];
  const descriptions = recent?.primaryDocDescription ?? [];

  const filings: NormalizedFiling[] = [];

  for (let i = 0; i < accessions.length; i += 1) {
    const accessionNumber = accessions[i];
    const form = forms[i];
    const filingDate = filingDates[i];
    if (!accessionNumber || !form || !filingDate) {
      continue;
    }

    const accNoDashes = accessionNumber.replaceAll('-', '');
    const primaryDocument = primaryDocs[i]?.trim() || null;
    const secIndexUrl = `https://www.sec.gov/Archives/edgar/data/${cikNumeric}/${accNoDashes}/${accessionNumber}-index.htm`;
    const documentUrl = primaryDocument
      ? `https://www.sec.gov/Archives/edgar/data/${cikNumeric}/${accNoDashes}/${primaryDocument}`
      : secIndexUrl;

    filings.push({
      filingId: `${cik}:${accessionNumber}`,
      cik,
      companyName: profile.companyName,
      ticker: primaryTicker,
      sic: profile.sic,
      sicDescription: profile.sicDescription,
      accessionNumber,
      form: form.trim(),
      filingDate: filingDate.trim(),
      reportDate: reportDates[i]?.trim() || null,
      primaryDocument,
      description: descriptions[i]?.trim() || null,
      documentUrl,
      secIndexUrl,
    });
  }

  return { profile, filings };
}

interface FactUnitPoint {
  val?: number;
  end?: string;
  form?: string;
}

interface CompanyFactsRaw {
  cik?: string | number;
  entityName?: string;
  facts?: {
    'us-gaap'?: Record<
      string,
      {
        units?: Record<string, FactUnitPoint[]>;
      }
    >;
  };
}

const METRIC_TAGS: Array<{ key: string; tags: string[]; preferredUnits: string[] }> = [
  {
    key: 'revenue',
    tags: [
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'Revenues',
      'SalesRevenueNet',
    ],
    preferredUnits: ['USD'],
  },
  {
    key: 'netIncome',
    tags: ['NetIncomeLoss'],
    preferredUnits: ['USD'],
  },
  {
    key: 'assets',
    tags: ['Assets'],
    preferredUnits: ['USD'],
  },
  {
    key: 'liabilities',
    tags: ['Liabilities'],
    preferredUnits: ['USD'],
  },
  {
    key: 'cashAndEquivalents',
    tags: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsAndShortTermInvestments'],
    preferredUnits: ['USD'],
  },
  {
    key: 'epsDiluted',
    tags: ['EarningsPerShareDiluted'],
    preferredUnits: ['USD/shares'],
  },
];

function pickLatestMetric(
  usGaap: Record<string, { units?: Record<string, FactUnitPoint[]> }>,
  tags: string[],
  preferredUnits: string[],
): FinancialMetric | null {
  for (const tag of tags) {
    const units = usGaap[tag]?.units;
    if (!units) {
      continue;
    }
    const unitName = preferredUnits.find((u) => Array.isArray(units[u])) ?? Object.keys(units)[0];
    if (!unitName) {
      continue;
    }
    const points = (units[unitName] ?? []).filter(
      (p) =>
        typeof p.val === 'number' &&
        typeof p.end === 'string' &&
        (p.form === '10-K' || p.form === '10-Q'),
    );
    if (points.length === 0) {
      continue;
    }
    points.sort((a, b) => (b.end ?? '').localeCompare(a.end ?? ''));
    const latest = points[0];
    if (latest && typeof latest.val === 'number' && latest.end && latest.form) {
      return {
        value: latest.val,
        unit: unitName,
        endDate: latest.end,
        form: latest.form,
      };
    }
  }
  return null;
}

/**
 * Extracts latest 10-K/10-Q US-GAAP financial metrics from SEC `companyfacts/CIK##########.json`.
 */
export function parseCompanyFactsSummary(
  payload: unknown,
  ticker: string | null,
): CompanyFinancialSummary {
  const raw = payload as CompanyFactsRaw | null;
  if (!raw || raw.cik === undefined || !raw.entityName) {
    throw new Error('Invalid SEC companyfacts payload.');
  }

  const cik = padCik(raw.cik);
  const usGaap = raw.facts?.['us-gaap'] ?? {};
  const metrics: Record<string, FinancialMetric | null> = {};

  for (const def of METRIC_TAGS) {
    metrics[def.key] = pickLatestMetric(usGaap, def.tags, def.preferredUnits);
  }

  return {
    cik,
    companyName: raw.entityName.trim(),
    ticker,
    metrics,
  };
}
