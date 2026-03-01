import { describe, it, expect } from 'vitest';
import { analyzeOutcome } from '../src/patterns/outcome';

// ── Synthetic test data ───────────────────────────────────────────────

// 20 sequences × 5 time points with binary outcome
const data: (string | null)[][] = [
  ['A', 'B', 'A', 'C', 'B'],
  ['B', 'A', 'C', 'B', 'A'],
  ['A', 'B', 'C', 'A', 'B'],
  ['C', 'A', 'B', 'A', 'C'],
  ['A', 'A', 'B', 'B', 'C'],
  ['B', 'C', 'A', 'B', 'C'],
  ['A', 'B', 'A', 'B', 'A'],
  ['C', 'C', 'A', 'A', 'B'],
  ['B', 'A', 'B', 'A', 'B'],
  ['A', 'C', 'B', 'A', 'C'],
  ['B', 'B', 'A', 'C', 'A'],
  ['A', 'C', 'A', 'B', 'B'],
  ['C', 'B', 'A', 'A', 'C'],
  ['B', 'A', 'A', 'C', 'B'],
  ['A', 'B', 'C', 'B', 'A'],
  ['C', 'A', 'B', 'C', 'A'],
  ['B', 'C', 'C', 'A', 'B'],
  ['A', 'A', 'B', 'C', 'C'],
  ['C', 'B', 'A', 'B', 'C'],
  ['B', 'A', 'C', 'A', 'B'],
];

const outcome = [
  'Pass', 'Fail', 'Pass', 'Fail', 'Pass',
  'Fail', 'Pass', 'Fail', 'Pass', 'Fail',
  'Pass', 'Pass', 'Fail', 'Fail', 'Pass',
  'Fail', 'Pass', 'Pass', 'Fail', 'Fail',
];

// ── Basic functionality ───────────────────────────────────────────────

describe('analyzeOutcome', () => {
  it('returns regression result with coefficients', () => {
    const result = analyzeOutcome(data, {
      outcome,
      n: 5,
      type: 'ngram',
      len: [1, 2],
      minFreq: 2,
      minSupport: 0.01,
    });
    expect(result.n).toBe(20);
    expect(result.coefficients.length).toBeGreaterThan(0);
    // Should have intercept
    const intercept = result.coefficients.find(c => c.name === '(Intercept)');
    expect(intercept).toBeDefined();
  });

  it('coefficients have valid structure', () => {
    const result = analyzeOutcome(data, {
      outcome,
      n: 3,
      type: 'ngram',
      len: [1, 2],
      minFreq: 2,
      minSupport: 0.01,
    });
    for (const c of result.coefficients) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.estimate).toBe('number');
      expect(typeof c.se).toBe('number');
      expect(typeof c.zValue).toBe('number');
      expect(typeof c.pValue).toBe('number');
      expect(c.ci.length).toBe(2);
      expect(c.ci[0]).toBeLessThanOrEqual(c.ci[1]);
    }
  });

  it('returns model fit statistics', () => {
    const result = analyzeOutcome(data, {
      outcome,
      n: 3,
      type: 'ngram',
      len: [1, 2],
      minFreq: 2,
      minSupport: 0.01,
    });
    expect(typeof result.pseudoR2).toBe('number');
    expect(typeof result.aic).toBe('number');
    expect(typeof result.bic).toBe('number');
    expect(result.patternsUsed.length).toBeGreaterThan(0);
  });

  it('respects n parameter for max patterns', () => {
    const result = analyzeOutcome(data, {
      outcome,
      n: 2,
      type: 'ngram',
      len: [1, 2],
      minFreq: 2,
      minSupport: 0.01,
    });
    // Coefficients include intercept + up to n patterns
    expect(result.patternsUsed.length).toBeLessThanOrEqual(2);
  });

  it('uses binary predictors by default (freq=false)', () => {
    const result = analyzeOutcome(data, {
      outcome,
      n: 3,
      freq: false,
      type: 'ngram',
      len: [1, 2],
      minFreq: 2,
      minSupport: 0.01,
    });
    expect(result.coefficients.length).toBeGreaterThan(0);
  });

  it('uses frequency predictors when freq=true', () => {
    const result = analyzeOutcome(data, {
      outcome,
      n: 3,
      freq: true,
      type: 'ngram',
      len: [1, 2],
      minFreq: 2,
      minSupport: 0.01,
    });
    expect(result.coefficients.length).toBeGreaterThan(0);
  });

  it('handles reference specification', () => {
    const result = analyzeOutcome(data, {
      outcome,
      reference: 'Pass',
      n: 3,
      type: 'ngram',
      len: [1, 2],
      minFreq: 2,
      minSupport: 0.01,
    });
    expect(result.coefficients.length).toBeGreaterThan(0);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────

describe('analyzeOutcome — edge cases', () => {
  it('throws for non-binary outcome', () => {
    expect(() =>
      analyzeOutcome(data, {
        outcome: data.map((_, i) => ['A', 'B', 'C'][i % 3]!),
        n: 3,
        type: 'ngram',
        len: [1, 2],
        minFreq: 2,
        minSupport: 0.01,
      }),
    ).toThrow(/2 classes/);
  });

  it('returns empty result when no patterns survive filtering', () => {
    const result = analyzeOutcome(data, {
      outcome,
      n: 3,
      type: 'ngram',
      len: [2],
      minFreq: 100, // way too high
      minSupport: 0.01,
    });
    expect(result.coefficients.length).toBe(0);
    expect(result.patternsUsed.length).toBe(0);
  });
});
