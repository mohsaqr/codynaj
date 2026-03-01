import type { SequenceData, RLEResult } from './types';

/**
 * Prepare sequence data: extract sorted unique alphabet and
 * convert each cell to 1-based integer index (NaN for missing).
 *
 * @param data Wide-format string matrix (rows = sequences, cols = time points).
 *   Null/undefined/empty-string cells treated as missing.
 */
export function prepareSequenceData(data: (string | null | undefined)[][]): SequenceData {
  // Collect all unique non-null, non-empty values
  const stateSet = new Set<string>();
  for (let i = 0; i < data.length; i++) {
    const row = data[i]!;
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      if (v != null && v !== '') {
        stateSet.add(v);
      }
    }
  }
  const alphabet = [...stateSet].sort();
  const stateToIndex = new Map<string, number>();
  for (let i = 0; i < alphabet.length; i++) {
    stateToIndex.set(alphabet[i]!, i + 1); // 1-based
  }

  const sequences: number[][] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i]!;
    const coded: number[] = new Array(row.length);
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      if (v != null && v !== '') {
        coded[j] = stateToIndex.get(v)!;
      } else {
        coded[j] = NaN;
      }
    }
    sequences.push(coded);
  }

  return { sequences, alphabet };
}

/**
 * Run-length encoding matching R's rle() behavior.
 * Each NaN is its own run (since NaN !== NaN, like R's NA != NA → NA).
 */
export function rle(arr: number[]): RLEResult {
  if (arr.length === 0) return { values: [], lengths: [] };

  const values: number[] = [];
  const lengths: number[] = [];
  let current = arr[0]!;
  let len = 1;

  for (let i = 1; i < arr.length; i++) {
    const v = arr[i]!;
    // NaN never equals anything (matches R: NA != NA → NA, treated as FALSE)
    const same = current === v; // NaN === NaN is false in JS
    if (same) {
      len++;
    } else {
      values.push(current);
      lengths.push(len);
      current = v;
      len = 1;
    }
  }
  values.push(current);
  lengths.push(len);

  return { values, lengths };
}

/**
 * Extract last non-missing observation from each sequence as a group label,
 * removing those values from the sequences.
 * Matches R's extract_last().
 */
export function extractLast(
  sequences: number[][],
  alphabet: string[],
): { sequences: number[][]; alphabet: string[]; group: string[] } {
  const n = sequences.length;
  const k = sequences[0]?.length ?? 0;
  const group: string[] = [];
  const lastVals = new Set<number>();

  // Find last non-NaN observation per row
  const lastObs: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = sequences[i]!;
    let last = 0;
    for (let j = 0; j < k; j++) {
      if (!isNaN(row[j]!)) last = j;
    }
    lastObs[i] = last;
    const val = row[last]!;
    group.push(alphabet[val - 1]!);
    lastVals.add(val);
  }

  // Remove last-obs values and remap
  const groups = [...new Set(group)];
  const newAlphabet = alphabet.filter((_, i) => !lastVals.has(i + 1));
  const valMap = new Array(alphabet.length + 1).fill(NaN);
  let idx = 1;
  for (let i = 0; i < alphabet.length; i++) {
    if (!lastVals.has(i + 1)) {
      valMap[i + 1] = idx++;
    }
  }

  const newSeqs: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = sequences[i]!;
    const newRow: number[] = new Array(k);
    for (let j = 0; j < k; j++) {
      const v = row[j]!;
      if (isNaN(v) || lastVals.has(v)) {
        newRow[j] = NaN;
      } else {
        newRow[j] = valMap[v]!;
      }
    }
    // Set the last-obs position to NaN
    newRow[lastObs[i]!] = NaN;
    newSeqs.push(newRow);
  }

  return { sequences: newSeqs, alphabet: newAlphabet, group };
}
