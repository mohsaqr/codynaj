import { describe, it, expect } from 'vitest';
import { discoverPatterns } from '../src/patterns/discover';

// ── Synthetic test data ───────────────────────────────────────────────

// 10 sequences × 6 time points
const data: (string | null)[][] = [
  ['A', 'B', 'A', 'C', 'B', 'A'],
  ['B', 'A', 'C', 'B', 'A', 'C'],
  ['A', 'B', 'C', 'A', 'B', 'C'],
  ['C', 'A', 'B', 'A', 'C', 'B'],
  ['A', 'A', 'B', 'B', 'C', 'C'],
  ['B', 'C', 'A', 'B', 'C', 'A'],
  ['A', 'B', 'A', 'B', 'A', 'B'],
  ['C', 'C', 'A', 'A', 'B', 'B'],
  ['B', 'A', 'B', 'A', 'B', 'A'],
  ['A', 'C', 'B', 'A', 'C', 'B'],
];

/*
 * R equivalence:
 * df <- data.frame(
 *   t1=c("A","B","A","C","A","B","A","C","B","A"),
 *   t2=c("B","A","B","A","A","C","B","C","A","C"),
 *   t3=c("A","C","C","B","B","A","A","A","B","B"),
 *   t4=c("C","B","A","A","B","B","B","A","A","A"),
 *   t5=c("B","A","B","C","C","C","A","B","B","C"),
 *   t6=c("A","C","C","B","C","A","B","B","A","B")
 * )
 * discover_patterns(df, type="ngram", len=2:3, min_freq=1)
 */

// ── N-gram discovery ──────────────────────────────────────────────────

describe('discoverPatterns — ngrams', () => {
  it('discovers 2-grams with correct frequency', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
    });
    expect(result.patterns.length).toBeGreaterThan(0);

    // All patterns should be 2-grams (contain exactly one "->")
    for (const p of result.patterns) {
      expect(p.pattern.split('->').length).toBe(2);
      expect(p.length).toBe(2);
    }

    // A->B should be frequent (appears in rows 0,2,4,6,7,8)
    const ab = result.patterns.find(p => p.pattern === 'A->B');
    expect(ab).toBeDefined();
    expect(ab!.frequency).toBeGreaterThan(3);
  });

  it('discovers 3-grams', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [3],
      minFreq: 1,
      minSupport: 0,
    });
    expect(result.patterns.length).toBeGreaterThan(0);
    for (const p of result.patterns) {
      expect(p.pattern.split('->').length).toBe(3);
      expect(p.length).toBe(3);
    }
  });

  it('filters by minFreq', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 5,
      minSupport: 0,
    });
    for (const p of result.patterns) {
      expect(p.frequency).toBeGreaterThanOrEqual(5);
    }
  });

  it('filters by minSupport', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0.5,
    });
    for (const p of result.patterns) {
      expect(p.support).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('filters by start', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
      start: ['A'],
    });
    for (const p of result.patterns) {
      expect(p.pattern.startsWith('A')).toBe(true);
    }
  });

  it('filters by end', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
      end: ['C'],
    });
    for (const p of result.patterns) {
      expect(p.pattern.endsWith('C')).toBe(true);
    }
  });

  it('filters by contain', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
      contain: ['B'],
    });
    for (const p of result.patterns) {
      expect(p.pattern).toContain('B');
    }
  });

  it('computes support correctly', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
    });
    // Support = count / n, count = sequences containing pattern
    for (const p of result.patterns) {
      expect(p.support).toBeCloseTo(p.count / 10, 10);
    }
  });

  it('computes proportion within length group', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
    });
    const totalFreq = result.patterns.reduce((s, p) => s + p.frequency, 0);
    for (const p of result.patterns) {
      expect(p.proportion).toBeCloseTo(p.frequency / totalFreq, 10);
    }
  });

  it('computes lift correctly', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
    });
    for (const p of result.patterns) {
      expect(p.lift).toBeGreaterThan(0);
    }
  });

  it('returns results sorted by frequency descending', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
    });
    for (let i = 1; i < result.patterns.length; i++) {
      expect(result.patterns[i]!.frequency).toBeLessThanOrEqual(
        result.patterns[i - 1]!.frequency,
      );
    }
  });
});

// ── Gapped patterns ───────────────────────────────────────────────────

describe('discoverPatterns — gapped', () => {
  it('discovers gap-1 patterns', () => {
    const result = discoverPatterns(data, {
      type: 'gapped',
      gap: [1],
      minFreq: 1,
      minSupport: 0,
    });
    expect(result.patterns.length).toBeGreaterThan(0);
    // Pattern format: X->*->Y
    for (const p of result.patterns) {
      expect(p.pattern).toMatch(/^[A-C]->\*->[A-C]$/);
      expect(p.length).toBe(3); // gap+2
    }
  });

  it('discovers gap-2 patterns', () => {
    const result = discoverPatterns(data, {
      type: 'gapped',
      gap: [2],
      minFreq: 1,
      minSupport: 0,
    });
    for (const p of result.patterns) {
      expect(p.pattern).toMatch(/^[A-C]->\*\*->[A-C]$/);
      expect(p.length).toBe(4); // gap+2
    }
  });
});

// ── Repeated patterns ─────────────────────────────────────────────────

describe('discoverPatterns — repeated', () => {
  it('discovers repeated-2 patterns', () => {
    const result = discoverPatterns(data, {
      type: 'repeated',
      len: [2],
      minFreq: 1,
      minSupport: 0,
    });
    // All repeated patterns should have identical states
    for (const p of result.patterns) {
      const states = p.pattern.split('->');
      expect(new Set(states).size).toBe(1);
    }
  });

  it('discovers repeated-3 patterns', () => {
    const result = discoverPatterns(data, {
      type: 'repeated',
      len: [3],
      minFreq: 1,
      minSupport: 0,
    });
    for (const p of result.patterns) {
      const states = p.pattern.split('->');
      expect(states.length).toBe(3);
      expect(new Set(states).size).toBe(1);
    }
  });
});

// ── Custom pattern search ─────────────────────────────────────────────

describe('discoverPatterns — custom pattern', () => {
  it('finds exact pattern', () => {
    const result = discoverPatterns(data, {
      pattern: 'A->B',
      minFreq: 1,
      minSupport: 0,
    });
    expect(result.patterns.length).toBe(1);
    expect(result.patterns[0]!.pattern).toBe('A->B');
  });

  it('finds pattern with wildcard', () => {
    const result = discoverPatterns(data, {
      pattern: 'A->*->B',
      minFreq: 1,
      minSupport: 0,
    });
    // Should find various A->?->B patterns
    expect(result.patterns.length).toBeGreaterThan(0);
    for (const p of result.patterns) {
      const states = p.pattern.split('->');
      expect(states[0]).toBe('A');
      expect(states[2]).toBe('B');
    }
  });
});

// ── Grouping + chi-squared ────────────────────────────────────────────

describe('discoverPatterns — with group', () => {
  const group = ['X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y'];

  it('adds group counts and chi-squared', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
      group,
    });
    for (const p of result.patterns) {
      expect(p.groupCounts).toBeDefined();
      expect(p.groupCounts!['count_X']).toBeDefined();
      expect(p.groupCounts!['count_Y']).toBeDefined();
      expect(p.chisq).toBeDefined();
      expect(p.pValue).toBeDefined();
      // Group counts should sum to total count
      expect(p.groupCounts!['count_X']! + p.groupCounts!['count_Y']!).toBe(p.count);
    }
  });

  it('chi-squared p-value is between 0 and 1', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
      group,
    });
    for (const p of result.patterns) {
      expect(p.pValue!).toBeGreaterThanOrEqual(0);
      expect(p.pValue!).toBeLessThanOrEqual(1);
    }
  });
});

// ── Edge cases ────────────────────────────────────────────────────────

describe('discoverPatterns — edge cases', () => {
  it('handles single-element sequences (no patterns for len>=2)', () => {
    const result = discoverPatterns([['A'], ['B'], ['A']], {
      type: 'ngram',
      len: [2],
      minFreq: 1,
      minSupport: 0,
    });
    expect(result.patterns.length).toBe(0);
  });

  it('handles data with nulls', () => {
    const result = discoverPatterns(
      [
        ['A', null, 'B'],
        ['A', 'B', null],
      ],
      { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 },
    );
    // Should find A->B from row 1
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  it('handles multiple lengths simultaneously', () => {
    const result = discoverPatterns(data, {
      type: 'ngram',
      len: [2, 3, 4],
      minFreq: 1,
      minSupport: 0,
    });
    const lengths = new Set(result.patterns.map(p => p.length));
    expect(lengths.has(2)).toBe(true);
    expect(lengths.has(3)).toBe(true);
  });
});
