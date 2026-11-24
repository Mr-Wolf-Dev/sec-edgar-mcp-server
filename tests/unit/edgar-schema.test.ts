import { describe, expect, it } from 'vitest';
import { padCik, parseActorInput } from '../../src/domain/edgar-schema.js';

describe('padCik', () => {
  it('pads numeric or string CIKs to 10 digits', () => {
    expect(padCik(320193)).toBe('0000320193');
    expect(padCik('789019')).toBe('0000789019');
  });

  it('throws on invalid CIK', () => {
    expect(() => padCik('')).toThrow();
    expect(() => padCik('abc')).toThrow();
  });
});

describe('parseActorInput', () => {
  it('applies defaults and validates date formats', () => {
    expect(parseActorInput(undefined)).toEqual({
      tickersOrCiks: [],
      forms: [],
      maxItems: 50,
    });
    expect(() => parseActorInput({ filedAfter: '2026/11/01' })).toThrow();
    expect(() => parseActorInput({ maxItems: 0 })).toThrow();
  });
});
