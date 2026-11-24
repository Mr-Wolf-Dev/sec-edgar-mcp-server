import {
  parseCompanyFactsSummary,
  parseSubmissionsResponse,
  parseTickerMap,
  type CompanyProfile,
  type TickerEntry,
} from '../domain/edgar-parser.js';
import {
  padCik,
  type ActorInput,
  type CompanyFinancialSummary,
  type NormalizedFiling,
} from '../domain/edgar-schema.js';
import type { EdgarSource } from '../ports/edgar-source.js';
import { fetchJsonWithRetry } from '../shared/http-client.js';

const DEFAULT_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const DEFAULT_DATA_BASE_URL = 'https://data.sec.gov';

const SEC_HEADERS = {
  'User-Agent': 'MrWolfResearch/1.0 (contact@mrwolf.dev)',
  Accept: 'application/json',
};

export interface SecHttpClientOptions {
  tickersUrl?: string;
  dataBaseUrl?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Keyless HTTP-only SEC EDGAR client with compliant User-Agent and in-memory ticker cache.
 */
export class SecHttpClient implements EdgarSource {
  private readonly tickersUrl: string;
  private readonly dataBaseUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private tickerCache: Map<string, TickerEntry> | null = null;

  constructor(options: SecHttpClientOptions = {}) {
    this.tickersUrl = options.tickersUrl ?? DEFAULT_TICKERS_URL;
    this.dataBaseUrl = options.dataBaseUrl ?? DEFAULT_DATA_BASE_URL;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
  }

  async resolveCik(tickerOrCik: string): Promise<string | null> {
    const trimmed = tickerOrCik.trim();
    if (trimmed.length === 0) {
      return null;
    }

    if (/^\d{1,10}$/.test(trimmed)) {
      return padCik(trimmed);
    }

    if (!this.tickerCache) {
      const payload = await fetchJsonWithRetry(this.tickersUrl, {
        headers: SEC_HEADERS,
        maxRetries: this.maxRetries,
        retryDelayMs: this.retryDelayMs,
      });
      this.tickerCache = parseTickerMap(payload);
    }

    return this.tickerCache.get(trimmed.toUpperCase())?.cik ?? null;
  }

  async fetchCompanySubmissions(
    cik: string,
  ): Promise<{ profile: CompanyProfile; filings: NormalizedFiling[] } | null> {
    const padded = padCik(cik);
    const url = `${this.dataBaseUrl}/submissions/CIK${padded}.json`;

    try {
      const payload = await fetchJsonWithRetry(url, {
        headers: SEC_HEADERS,
        maxRetries: this.maxRetries,
        retryDelayMs: this.retryDelayMs,
      });
      return parseSubmissionsResponse(payload);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('HTTP 404')) {
        return null;
      }
      throw err;
    }
  }

  async fetchCompanyFacts(
    cik: string,
    ticker: string | null,
  ): Promise<CompanyFinancialSummary | null> {
    const padded = padCik(cik);
    const url = `${this.dataBaseUrl}/api/xbrl/companyfacts/CIK${padded}.json`;

    try {
      const payload = await fetchJsonWithRetry(url, {
        headers: SEC_HEADERS,
        maxRetries: this.maxRetries,
        retryDelayMs: this.retryDelayMs,
      });
      return parseCompanyFactsSummary(payload, ticker);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('HTTP 404')) {
        return null;
      }
      throw err;
    }
  }
}

/**
 * Fault-isolated multi-company SEC filings fetcher.
 */
export async function fetchFilingsForTargets(
  source: EdgarSource,
  criteria: Pick<ActorInput, 'tickersOrCiks'>,
): Promise<{ filings: NormalizedFiling[]; notFound: string[] }> {
  const filings: NormalizedFiling[] = [];
  const notFound: string[] = [];

  for (const target of criteria.tickersOrCiks) {
    try {
      const cik = await source.resolveCik(target);
      if (!cik) {
        notFound.push(target);
        continue;
      }
      const sub = await source.fetchCompanySubmissions(cik);
      if (!sub) {
        notFound.push(target);
        continue;
      }
      filings.push(...sub.filings);
    } catch {
      notFound.push(target);
    }
  }

  return { filings, notFound };
}
