import { Actor } from 'apify';
import { parseActorInput, type NormalizedFiling } from '../domain/edgar-schema.js';
import { filterAndDeduplicateFilings } from '../domain/filing-filter.js';
import type { EdgarSource } from '../ports/edgar-source.js';
import type { BillingMeter } from '../shared/billing-meter.js';
import { fetchFilingsForTargets } from './sec-http-client.js';

export type EdgarBillingEvent = 'filing-extracted' | 'mcp-query';

export interface ExtractionDependencies {
  source: EdgarSource;
  billing: BillingMeter<EdgarBillingEvent>;
  pushData: (items: NormalizedFiling[]) => Promise<void>;
}

/**
 * Validates input, queries SEC EDGAR, filters/deduplicates, pushes to dataset, and charges PPE events.
 */
export async function runFilingExtraction(
  rawInput: unknown,
  deps: ExtractionDependencies,
): Promise<NormalizedFiling[]> {
  const criteria = parseActorInput(rawInput);
  if (criteria.tickersOrCiks.length === 0) {
    return [];
  }

  const { filings: rawFilings } = await fetchFilingsForTargets(deps.source, criteria);
  const filings = filterAndDeduplicateFilings(rawFilings, criteria);

  if (filings.length > 0) {
    await deps.pushData(filings);
    await deps.billing.charge('filing-extracted', filings.length);
  }

  return filings;
}

/**
 * Runs the standard batch Apify Actor extraction mode.
 */
export async function runActorBatch(
  source: EdgarSource,
  billing: BillingMeter<EdgarBillingEvent>,
): Promise<void> {
  const input = await Actor.getInput();
  await runFilingExtraction(input, {
    source,
    billing,
    pushData: async (items) => {
      await Actor.pushData(items);
    },
  });
}
