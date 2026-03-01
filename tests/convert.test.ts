import { describe, it, expect } from 'vitest';
import { prepareSequenceData, rle, extractLast } from '../src/core/prepare';
import { convert } from '../src/core/convert';
import type { FrequencyResult, EdgeListEntry, ReverseEdgeListEntry } from '../src/core/types';

// ── Synthetic test data ───────────────────────────────────────────────

const data: (string | null)[][] = [
  ['A', 'B', 'A', 'C', 'B'],
  ['B', 'B', 'C', 'A', null],
  ['C', 'A', 'A', 'B', 'A'],
  ['A', 'A', 'A', null, null],
];

// ── prepareSequenceData ───────────────────────────────────────────────

describe('prepareSequenceData', () => {
  it('extracts sorted alphabet from all non-null values', () => {
    const result = prepareSequenceData(data);
    expect(result.alphabet).toEqual(['A', 'B', 'C']);
  });

  it('encodes states as 1-based integers', () => {
    const result = prepareSequenceData(data);
    // A=1, B=2, C=3
    expect(result.sequences[0]).toEqual([1, 2, 1, 3, 2]);
    expect(result.sequences[1]).toEqual([2, 2, 3, 1, NaN]);
    expect(result.sequences[3]).toEqual([1, 1, 1, NaN, NaN]);
  });

  it('handles all-null row', () => {
    const result = prepareSequenceData([[null, null, null]]);
    expect(result.alphabet).toEqual([]);
    expect(result.sequences[0]).toEqual([NaN, NaN, NaN]);
  });

  it('handles empty string as missing', () => {
    const result = prepareSequenceData([['A', '', 'B']]);
    expect(result.alphabet).toEqual(['A', 'B']);
    expect(result.sequences[0]).toEqual([1, NaN, 2]);
  });

  it('handles single-state data', () => {
    const result = prepareSequenceData([['X', 'X', 'X']]);
    expect(result.alphabet).toEqual(['X']);
    expect(result.sequences[0]).toEqual([1, 1, 1]);
  });
});

// ── rle ───────────────────────────────────────────────────────────────

describe('rle', () => {
  it('encodes runs of identical values', () => {
    const result = rle([1, 1, 2, 2, 2, 3, 1]);
    expect(result.values).toEqual([1, 2, 3, 1]);
    expect(result.lengths).toEqual([2, 3, 1, 1]);
  });

  it('handles NaN runs', () => {
    const result = rle([1, NaN, NaN, 2]);
    expect(result.values[0]).toBe(1);
    expect(isNaN(result.values[1]!)).toBe(true);
    expect(result.values[2]).toBe(2);
    expect(result.lengths).toEqual([1, 2, 1]);
  });

  it('handles empty array', () => {
    const result = rle([]);
    expect(result.values).toEqual([]);
    expect(result.lengths).toEqual([]);
  });

  it('handles single element', () => {
    const result = rle([5]);
    expect(result.values).toEqual([5]);
    expect(result.lengths).toEqual([1]);
  });

  it('handles all identical', () => {
    const result = rle([3, 3, 3, 3]);
    expect(result.values).toEqual([3]);
    expect(result.lengths).toEqual([4]);
  });
});

// ── convert frequency ─────────────────────────────────────────────────

describe('convert — frequency', () => {
  it('counts state occurrences per sequence', () => {
    const result = convert(data, 'frequency') as FrequencyResult;
    expect(result.states).toEqual(['A', 'B', 'C']);
    expect(result.ids).toEqual([1, 2, 3, 4]);
    // Row 0: A=2, B=2, C=1
    expect(result.matrix[0]).toEqual([2, 2, 1]);
    // Row 1: A=1, B=2, C=1
    expect(result.matrix[1]).toEqual([1, 2, 1]);
    // Row 2: A=3, B=1, C=1
    expect(result.matrix[2]).toEqual([3, 1, 1]);
    // Row 3: A=3, B=0, C=0
    expect(result.matrix[3]).toEqual([3, 0, 0]);
  });
});

// ── convert onehot ────────────────────────────────────────────────────

describe('convert — onehot', () => {
  it('produces binary presence/absence', () => {
    const result = convert(data, 'onehot') as FrequencyResult;
    expect(result.matrix[0]).toEqual([1, 1, 1]);
    expect(result.matrix[3]).toEqual([1, 0, 0]);
  });
});

// ── convert edgelist ──────────────────────────────────────────────────

describe('convert — edgelist', () => {
  it('produces consecutive transition pairs', () => {
    const result = convert(data, 'edgelist') as EdgeListEntry[];
    // Row 0: A->B, B->A, A->C, C->B  (4 transitions)
    const row0 = result.filter(e => e.id === 1);
    expect(row0.length).toBe(4);
    expect(row0[0]).toEqual({ id: 1, from: 'A', to: 'B' });
    expect(row0[1]).toEqual({ id: 1, from: 'B', to: 'A' });
    expect(row0[2]).toEqual({ id: 1, from: 'A', to: 'C' });
    expect(row0[3]).toEqual({ id: 1, from: 'C', to: 'B' });
  });

  it('skips NaN values in transitions', () => {
    const result = convert(data, 'edgelist') as EdgeListEntry[];
    // Row 1: B,B,C,A,null → B->B, B->C, C->A (3 transitions)
    const row1 = result.filter(e => e.id === 2);
    expect(row1.length).toBe(3);
  });
});

// ── convert reverse ───────────────────────────────────────────────────

describe('convert — reverse', () => {
  it('produces reverse transition pairs', () => {
    const result = convert(data, 'reverse') as ReverseEdgeListEntry[];
    // Row 0: A->B means state=B, previous=A
    const row0 = result.filter(e => e.id === 1);
    expect(row0[0]).toEqual({ id: 1, state: 'B', previous: 'A' });
    expect(row0[1]).toEqual({ id: 1, state: 'A', previous: 'B' });
  });
});

// ── extractLast ───────────────────────────────────────────────────────

describe('extractLast', () => {
  it('extracts last observation as group and removes it', () => {
    const prepared = prepareSequenceData([
      ['A', 'B', 'C'],
      ['B', 'A', 'A'],
      ['C', 'C', 'B'],
    ]);
    const result = extractLast(prepared.sequences, prepared.alphabet);
    expect(result.group).toEqual(['C', 'A', 'B']);
    // After extraction, last position should be NaN
    expect(isNaN(result.sequences[0]![2]!)).toBe(true);
    expect(isNaN(result.sequences[1]![2]!)).toBe(true);
    expect(isNaN(result.sequences[2]![2]!)).toBe(true);
  });
});
