import { z } from 'zod';

/**
 * Normalizes a numeric or string CIK into a 10-digit zero-padded string.
 */
export function padCik(raw: string | number): string {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 0 || digits.length > 10) {
    throw new Error(`Invalid CIK: "${raw}"`);
  }
  return digits.padStart(10, '0');
}

export const ActorInputSchema = z.object({
  tickersOrCiks: z.array(z.string().trim().min(1)).default([]),
  forms: z.array(z.string().trim().min(1)).default([]),
  filedAfter: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'filedAfter must be YYYY-MM-DD')
    .optional(),
  filedBefore: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'filedBefore must be YYYY-MM-DD')
    .optional(),
  maxItems: z.number().int().min(1).max(1000).default(50),
});

export type ActorInput = z.infer<typeof ActorInputSchema>;

/**
 * Validates and normalizes raw Actor/MCP input.
 */
export function parseActorInput(raw: unknown): ActorInput {
  return ActorInputSchema.parse(raw ?? {});
}

export const NormalizedFilingSchema = z.object({
  filingId: z.string().min(1),
  cik: z.string().length(10),
  companyName: z.string().min(1),
  ticker: z.string().nullable(),
  sic: z.string().nullable(),
  sicDescription: z.string().nullable(),
  accessionNumber: z.string().min(1),
  form: z.string().min(1),
  filingDate: z.string().min(1),
  reportDate: z.string().nullable(),
  primaryDocument: z.string().nullable(),
  description: z.string().nullable(),
  documentUrl: z.string().url(),
  secIndexUrl: z.string().url(),
});

export type NormalizedFiling = z.infer<typeof NormalizedFilingSchema>;

export const FinancialMetricSchema = z.object({
  value: z.number(),
  unit: z.string(),
  endDate: z.string(),
  form: z.string(),
});

export type FinancialMetric = z.infer<typeof FinancialMetricSchema>;

export const CompanyFinancialSummarySchema = z.object({
  cik: z.string().length(10),
  companyName: z.string().min(1),
  ticker: z.string().nullable(),
  metrics: z.record(z.string(), FinancialMetricSchema.nullable()),
});

export type CompanyFinancialSummary = z.infer<typeof CompanyFinancialSummarySchema>;
