import type {
  FrequencyResult,
  EdgeListEntry,
  ReverseEdgeListEntry,
} from './types';
import { prepareSequenceData } from './prepare';

/**
 * Convert wide-format sequence data into various formats.
 *
 * @param data Wide-format string matrix (rows = sequences, cols = time points)
 * @param format Target format: "frequency", "onehot", "edgelist", or "reverse"
 */
export function convert(
  data: (string | null | undefined)[][],
  format: 'frequency' | 'onehot' | 'edgelist' | 'reverse' = 'frequency',
): FrequencyResult | EdgeListEntry[] | ReverseEdgeListEntry[] {
  const prepared = prepareSequenceData(data);
  const { sequences, alphabet } = prepared;
  const n = sequences.length;
  const a = alphabet.length;

  if (format === 'frequency') {
    return convertFrequency(sequences, alphabet, n, a, false);
  }
  if (format === 'onehot') {
    return convertFrequency(sequences, alphabet, n, a, true);
  }
  if (format === 'edgelist') {
    return convertEdgelist(sequences, alphabet, n);
  }
  // reverse
  return convertReverse(sequences, alphabet, n);
}

function convertFrequency(
  sequences: number[][],
  alphabet: string[],
  n: number,
  a: number,
  binary: boolean,
): FrequencyResult {
  const ids: number[] = [];
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    ids.push(i + 1);
    const counts = new Array(a).fill(0) as number[];
    const row = sequences[i]!;
    for (let j = 0; j < row.length; j++) {
      const v = row[j]!;
      if (!isNaN(v)) {
        counts[v - 1]!++;
      }
    }
    if (binary) {
      for (let k = 0; k < a; k++) {
        counts[k] = counts[k]! > 0 ? 1 : 0;
      }
    }
    matrix.push(counts);
  }

  return { ids, states: [...alphabet], matrix };
}

function convertEdgelist(
  sequences: number[][],
  alphabet: string[],
  n: number,
): EdgeListEntry[] {
  const result: EdgeListEntry[] = [];

  for (let i = 0; i < n; i++) {
    const row = sequences[i]!;
    // Build list of valid (non-NaN) observations in order
    const valid: number[] = [];
    for (let j = 0; j < row.length; j++) {
      if (!isNaN(row[j]!)) valid.push(row[j]!);
    }
    for (let j = 0; j < valid.length - 1; j++) {
      result.push({
        id: i + 1,
        from: alphabet[valid[j]! - 1]!,
        to: alphabet[valid[j + 1]! - 1]!,
      });
    }
  }

  return result;
}

function convertReverse(
  sequences: number[][],
  alphabet: string[],
  n: number,
): ReverseEdgeListEntry[] {
  const result: ReverseEdgeListEntry[] = [];

  for (let i = 0; i < n; i++) {
    const row = sequences[i]!;
    const valid: number[] = [];
    for (let j = 0; j < row.length; j++) {
      if (!isNaN(row[j]!)) valid.push(row[j]!);
    }
    for (let j = 1; j < valid.length; j++) {
      result.push({
        id: i + 1,
        state: alphabet[valid[j]! - 1]!,
        previous: alphabet[valid[j - 1]! - 1]!,
      });
    }
  }

  return result;
}
