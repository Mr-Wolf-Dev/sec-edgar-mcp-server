import type { CompanyProfile } from '../domain/edgar-parser.js';
import type { CompanyFinancialSummary, NormalizedFiling } from '../domain/edgar-schema.js';

export interface EdgarSource {
  resolveCik(tickerOrCik: string): Promise<string | null>;
  fetchCompanySubmissions(
    cik: string,
  ): Promise<{ profile: CompanyProfile; filings: NormalizedFiling[] } | null>;
  fetchCompanyFacts(cik: string, ticker: string | null): Promise<CompanyFinancialSummary | null>;
}
