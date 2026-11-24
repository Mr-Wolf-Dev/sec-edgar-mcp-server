import type { ActorInput, NormalizedFiling } from './edgar-schema.js';

/**
 * Deduplicates by filingId, filters by form types and filing date window,
 * sorts newest-first, and enforces maxItems.
 */
export function filterAndDeduplicateFilings(
  filings: NormalizedFiling[],
  criteria: Pick<ActorInput, 'forms' | 'filedAfter' | 'filedBefore' | 'maxItems'>,
): NormalizedFiling[] {
  const seen = new Set<string>();
  const formsUpper = new Set(criteria.forms.map((f) => f.trim().toUpperCase()));
  const filtered: NormalizedFiling[] = [];

  for (const filing of filings) {
    if (seen.has(filing.filingId)) {
      continue;
    }
    seen.add(filing.filingId);

    if (formsUpper.size > 0 && !formsUpper.has(filing.form.toUpperCase())) {
      continue;
    }

    if (criteria.filedAfter !== undefined && filing.filingDate < criteria.filedAfter) {
      continue;
    }

    if (criteria.filedBefore !== undefined && filing.filingDate > criteria.filedBefore) {
      continue;
    }

    filtered.push(filing);
  }

  filtered.sort((a, b) => {
    if (a.filingDate === b.filingDate) {
      return a.filingId.localeCompare(b.filingId);
    }
    return b.filingDate.localeCompare(a.filingDate);
  });

  return filtered.slice(0, criteria.maxItems);
}
