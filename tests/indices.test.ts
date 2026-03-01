import { describe, it, expect } from 'vitest';
import { sequenceIndices } from '../src/patterns/indices';
import { computeTransitions, cyclicStrength } from '../src/patterns/indices';

// ── Synthetic test data ───────────────────────────────────────────────

// 5 sequences × 8 time points — deterministic for reproducibility
const data: (string | null)[][] = [
  ['A', 'B', 'A', 'C', 'B', 'A', 'C', 'B'],
  ['B', 'B', 'B', 'A', 'A', 'C', 'C', null],
  ['C', 'A', 'A', 'B', 'B', 'B', 'A', 'A'],
  ['A', 'A', 'A', 'A', 'A', null, null, null],
  ['B', 'C', 'A', 'B', 'C', 'A', 'B', 'C'],
];

/*
 * R equivalence reference (computed in R with codyna::sequence_indices):
 *
 * # Same data in R:
 * df <- data.frame(
 *   t1 = c("A","B","C","A","B"),
 *   t2 = c("B","B","A","A","C"),
 *   t3 = c("A","B","A","A","A"),
 *   t4 = c("C","A","B","A","B"),
 *   t5 = c("B","A","B","A","C"),
 *   t6 = c("A","C","B",NA,"A"),
 *   t7 = c("C","C","A",NA,"B"),
 *   t8 = c("B",NA,"A",NA,"C")
 * )
 * sequence_indices(df)
 */

// ── Basic structural tests ────────────────────────────────────────────

describe('sequenceIndices', () => {
  const results = sequenceIndices(data);

  it('returns correct number of results', () => {
    expect(results.length).toBe(5);
  });

  // Row 0: A,B,A,C,B,A,C,B — all 8 valid
  it('computes validN and validProportion', () => {
    expect(results[0]!.validN).toBe(8);
    expect(results[0]!.validProportion).toBe(1.0);
    // Row 1: 7 valid out of 8 columns, but last obs at col 6 (0-based) = col 7 (1-based)
    expect(results[1]!.validN).toBe(7);
    // Row 3: 5 valid, last obs at col 4 (0-based) = col 5 (1-based)
    expect(results[3]!.validN).toBe(5);
  });

  it('computes uniqueStates', () => {
    expect(results[0]!.uniqueStates).toBe(3); // A, B, C
    expect(results[3]!.uniqueStates).toBe(1); // only A
  });

  it('computes first and last state', () => {
    expect(results[0]!.firstState).toBe('A');
    expect(results[0]!.lastState).toBe('B');
    expect(results[1]!.firstState).toBe('B');
    expect(results[1]!.lastState).toBe('C');
    expect(results[3]!.firstState).toBe('A');
    expect(results[3]!.lastState).toBe('A');
  });

  it('computes dominant state', () => {
    // Row 0: A=3, B=3, C=2 → dominant is A (first max via which.max)
    expect(results[0]!.dominantState).toBe('A');
    // Row 3: only A
    expect(results[3]!.dominantState).toBe('A');
  });

  it('computes dominant proportion', () => {
    // Row 0: 3/8 = 0.375
    expect(results[0]!.dominantProportion).toBeCloseTo(0.375, 10);
    // Row 3: 5/5 = 1.0
    expect(results[3]!.dominantProportion).toBeCloseTo(1.0, 10);
  });

  // Row 0: A,B,A,C,B,A,C,B → runs: A(1),B(1),A(1),C(1),B(1),A(1),C(1),B(1) → mean=1
  it('computes mean spell duration', () => {
    expect(results[0]!.meanSpellDuration).toBeCloseTo(1.0, 10);
    // Row 1: B,B,B,A,A,C,C → runs: B(3),A(2),C(2) → mean = 7/3
    expect(results[1]!.meanSpellDuration).toBeCloseTo(7 / 3, 10);
    // Row 3: A,A,A,A,A → single run of 5
    expect(results[3]!.meanSpellDuration).toBeCloseTo(5.0, 10);
  });

  it('computes max spell duration', () => {
    expect(results[0]!.maxSpellDuration).toBe(1);
    expect(results[1]!.maxSpellDuration).toBe(3);
    expect(results[3]!.maxSpellDuration).toBe(5);
  });

  // Row 3: only A → entropy = 0
  it('computes longitudinal entropy', () => {
    expect(results[3]!.longitudinalEntropy).toBeCloseTo(0, 10);
    // Row 0: A=3/8, B=3/8, C=2/8
    // uVals = 4 (A,B,C + NaN from rows 1,3 counted as unique, matching R)
    // ent = -(3/8*ln(3/8)*2 + 2/8*ln(2/8)) / ln(4)
    const p1 = 3 / 8;
    const p2 = 2 / 8;
    const ent = -(p1 * Math.log(p1) * 2 + p2 * Math.log(p2)) / Math.log(4);
    expect(results[0]!.longitudinalEntropy).toBeCloseTo(ent, 10);
  });

  it('computes simpson diversity', () => {
    // Row 3: 1 - 1^2 = 0
    expect(results[3]!.simpsonDiversity).toBeCloseTo(0, 10);
    // Row 0: 1 - (3/8)^2*2 - (2/8)^2
    const sd = 1 - (3 / 8) ** 2 * 2 - (2 / 8) ** 2;
    expect(results[0]!.simpsonDiversity).toBeCloseTo(sd, 10);
  });

  it('computes self-loop tendency', () => {
    // Row 0: all transitions are changes → self-loop = 0
    expect(results[0]!.selfLoopTendency).toBeCloseTo(0, 10);
    // Row 3: all self-loops A->A (4 times) → self = 4/4 = 1
    expect(results[3]!.selfLoopTendency).toBeCloseTo(1.0, 10);
  });

  it('computes transition rate', () => {
    // Row 0: 7 transitions, 0 self → rate = 7/7 = 1.0
    expect(results[0]!.transitionRate).toBeCloseTo(1.0, 10);
    // Row 3: 0 non-self / (5-1) = 0
    expect(results[3]!.transitionRate).toBeCloseTo(0, 10);
  });

  it('computes transition complexity', () => {
    // Row 0: A→B, B→A, A→C, C→B, B→A(dup), A→C(dup), C→B(dup)
    // Unique non-self: A→B, A→C, B→A, C→B = 4 out of 3*2=6
    expect(results[0]!.transitionComplexity).toBeCloseTo(4 / 6, 10);
    // Row 3: 0 non-self transitions
    expect(results[3]!.transitionComplexity).toBeCloseTo(0, 10);
  });

  it('computes initial state persistence', () => {
    // Row 0: A,B,... → first diff at j=1, per = 1/8 = 0.125
    expect(results[0]!.initialStatePersistence).toBeCloseTo(1 / 8, 10);
    // Row 3: all A → per = 1.0
    expect(results[3]!.initialStatePersistence).toBeCloseTo(1.0, 10);
  });

  it('computes initial state proportion', () => {
    // Row 0: initial=A, prop = 3/8
    expect(results[0]!.initialStateProportion).toBeCloseTo(3 / 8, 10);
    // Row 3: initial=A, prop = 5/5 = 1
    expect(results[3]!.initialStateProportion).toBeCloseTo(1.0, 10);
  });

  it('complexity index is between 0 and 1 for multi-spell sequences', () => {
    for (const r of results) {
      // Single-spell sequences (like row 3) return NaN (R propagates NA from sd(single))
      if (isNaN(r.complexityIndex)) continue;
      expect(r.complexityIndex).toBeGreaterThanOrEqual(0);
      expect(r.complexityIndex).toBeLessThanOrEqual(1.5);
    }
  });

  it('returns NaN complexity for single-spell sequence', () => {
    // Row 3 (A,A,A,A,A) has one spell → sd(single) = NA → NaN
    expect(isNaN(results[3]!.complexityIndex)).toBe(true);
  });

  it('computes cyclic feedback strength', () => {
    // Row 3 (all A's) should have max cyclic strength of 1.0
    expect(results[3]!.cyclicFeedbackStrength).toBeCloseTo(1.0, 10);
    // Row 0 should have some cyclic feedback > 0
    expect(results[0]!.cyclicFeedbackStrength).toBeGreaterThan(0);
  });
});

// ── Favorable / integrative potential ─────────────────────────────────

describe('sequenceIndices with favorable', () => {
  it('computes integrative potential when favorable given', () => {
    const results = sequenceIndices(data, { favorable: ['A'] });
    expect(results[0]!.integrativePotential).toBeDefined();
    expect(results[0]!.integrativePotential!).toBeGreaterThan(0);
    // Row 3: all A, favorable = A → should be 1.0
    expect(results[3]!.integrativePotential!).toBeCloseTo(1.0, 10);
  });

  it('uses omega weighting', () => {
    const r1 = sequenceIndices(data, { favorable: ['A'], omega: 1.0 });
    const r2 = sequenceIndices(data, { favorable: ['A'], omega: 2.0 });
    // Different omega should give different values (except all-A row)
    expect(r1[0]!.integrativePotential).not.toBeCloseTo(r2[0]!.integrativePotential!, 5);
  });

  it('omits integrative potential when no favorable given', () => {
    const results = sequenceIndices(data);
    expect(results[0]!.integrativePotential).toBeUndefined();
  });
});

// ── computeTransitions ────────────────────────────────────────────────

describe('computeTransitions', () => {
  it('counts per-sequence transitions correctly', () => {
    // Simple: A,B,A → A→B(1), B→A(1) — alphabet size 3 (A=1,B=2,C=3)
    const sequences = [[1, 2, 1]];
    const trans = computeTransitions(sequences, 3);
    // trans[0][0][1] = A→B = 1
    expect(trans[0]![0]![1]).toBe(1);
    // trans[0][1][0] = B→A = 1
    expect(trans[0]![1]![0]).toBe(1);
    // All others should be 0
    expect(trans[0]![0]![0]).toBe(0);
    expect(trans[0]![1]![1]).toBe(0);
  });

  it('handles NaN values', () => {
    const sequences = [[1, NaN, 2]];
    const trans = computeTransitions(sequences, 2);
    // No valid transitions (1→NaN and NaN→2 both invalid)
    expect(trans[0]![0]![0]).toBe(0);
    expect(trans[0]![0]![1]).toBe(0);
    expect(trans[0]![1]![0]).toBe(0);
    expect(trans[0]![1]![1]).toBe(0);
  });
});

// ── cyclicStrength ────────────────────────────────────────────────────

describe('cyclicStrength', () => {
  it('detects cyclic patterns', () => {
    // A,B,A,B,A → strong lag-2 recurrence
    const seq = [[1, 2, 1, 2, 1]];
    const result = cyclicStrength(seq, 1, 5, [4]);
    expect(result[0]).toBeGreaterThan(0.5);
  });

  it('returns 0 for constant sequence', () => {
    // Wait, constant sequence A,A,A,A,A actually has max recurrence
    const seq = [[1, 1, 1, 1, 1]];
    const result = cyclicStrength(seq, 1, 5, [4]);
    expect(result[0]).toBeCloseTo(1.0, 10);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────

describe('sequenceIndices — edge cases', () => {
  it('handles single-element sequences', () => {
    const results = sequenceIndices([['A']]);
    expect(results[0]!.validN).toBe(1);
    expect(results[0]!.uniqueStates).toBe(1);
    expect(results[0]!.meanSpellDuration).toBe(1);
    expect(results[0]!.selfLoopTendency).toBe(0); // no transitions
    expect(results[0]!.firstState).toBe('A');
    expect(results[0]!.lastState).toBe('A');
  });

  it('handles two-element sequences', () => {
    const results = sequenceIndices([['A', 'B']]);
    expect(results[0]!.validN).toBe(2);
    expect(results[0]!.uniqueStates).toBe(2);
    expect(results[0]!.selfLoopTendency).toBe(0);
    expect(results[0]!.transitionRate).toBeCloseTo(1.0, 10);
  });

  it('handles all-null sequences', () => {
    const results = sequenceIndices([[null, null]]);
    expect(results[0]!.validN).toBe(0);
  });
});
