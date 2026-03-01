import type {
  OutcomeOptions,
  OutcomeResult,
  OutcomeCoefficient,
  PatternEntry,
} from '../core/types';
import { prepareSequenceData, extractLast } from '../core/prepare';
import { discoverPatterns } from './discover';
import { logisticRegression } from 'carm';

/**
 * Analyze pattern-outcome relationships via logistic regression.
 * Matches R analyze_outcome().
 *
 * @param data Wide-format string matrix
 * @param options Outcome analysis options
 */
export function analyzeOutcome(
  data: (string | null | undefined)[][],
  options: OutcomeOptions,
): OutcomeResult {
  const maxN = options.n ?? 10;
  const freq = options.freq ?? false;
  const priority = options.priority ?? 'chisq';
  const desc = options.desc ?? true;

  // Resolve outcome
  let outcomeVec: string[];
  let seqData = data;

  if (options.outcome === 'lastObs') {
    const prepared = prepareSequenceData(data);
    const extracted = extractLast(prepared.sequences, prepared.alphabet);
    outcomeVec = extracted.group;
    // Reconstruct string data from extracted sequences
    seqData = extracted.sequences.map(row =>
      row.map(v => (isNaN(v) ? null : extracted.alphabet[v - 1]!)),
    );
  } else {
    outcomeVec = options.outcome;
  }

  // Validate binary outcome
  const outcomeGroups = [...new Set(outcomeVec)];
  if (outcomeGroups.length !== 2) {
    throw new Error(`Outcome must have exactly 2 classes, got ${outcomeGroups.length}`);
  }

  // Set reference: first in sorted order or user-specified
  const reference = options.reference ?? outcomeGroups.sort()[0]!;
  const targetGroup = outcomeGroups.find(g => g !== reference)!;

  // Binary encoding: 0 = reference, 1 = target
  const y = outcomeVec.map(v => (v === reference ? 0 : 1));

  // Discover patterns with outcome as group
  const disc = discoverPatterns(seqData, {
    type: options.type ?? 'ngram',
    len: options.len ?? [1, 2],
    gap: options.gap ?? [1],
    minFreq: options.minFreq ?? 5,
    minSupport: options.minSupport ?? 0.01,
    group: outcomeVec,
    start: options.start,
    end: options.end,
    contain: options.contain,
  });

  // Filter: patterns present in both outcome groups
  let filtered = disc.patterns.filter(p => {
    if (!p.groupCounts) return false;
    return outcomeGroups.every(g => (p.groupCounts![`count_${g}`] ?? 0) > 0);
  });

  // Sort by priority
  const sortKey = priority as keyof PatternEntry;
  filtered.sort((a, b) => {
    const va = (a[sortKey] as number) ?? 0;
    const vb = (b[sortKey] as number) ?? 0;
    return desc ? vb - va : va - vb;
  });

  // Take top N
  filtered = filtered.slice(0, maxN);

  // Sort alphabetically by pattern name (matches R arrange(pattern))
  filtered.sort((a, b) => a.pattern.localeCompare(b.pattern));

  if (filtered.length === 0) {
    return {
      coefficients: [],
      pseudoR2: 0,
      aic: 0,
      bic: 0,
      n: y.length,
      patternsUsed: [],
    };
  }

  // Build predictor matrix from raw pattern matrices
  const patternNames = filtered.map(p => p.pattern);
  const n = seqData.length;

  // We need to reconstruct the predictor columns from _raw
  const predictorValues = new Map<string, number[]>();
  for (const r of disc._raw) {
    for (let p = 0; p < r.unique.length; p++) {
      if (patternNames.includes(r.unique[p]!)) {
        const vals = new Array(n).fill(0) as number[];
        for (let i = 0; i < n; i++) {
          vals[i] = r.matrix[i]![p]!;
        }
        predictorValues.set(r.unique[p]!, vals);
      }
    }
  }

  // Build predictor array for logistic regression
  const predictors = patternNames
    .filter(name => predictorValues.has(name))
    .map(name => {
      let values = predictorValues.get(name)!;
      const safeName = name.replace(/->/g, '_to_');
      if (!freq) {
        values = values.map(v => v > 0 ? 1 : 0);
      }
      return { name: safeName, values };
    });

  if (predictors.length === 0) {
    return {
      coefficients: [],
      pseudoR2: 0,
      aic: 0,
      bic: 0,
      n: y.length,
      patternsUsed: [],
    };
  }

  // Call logistic regression from carm
  const result = logisticRegression(y, predictors);

  const coefficients: OutcomeCoefficient[] = result.coefficients.map(c => ({
    name: c.name,
    estimate: c.estimate,
    se: c.se,
    zValue: c.tValue, // logistic uses z not t
    pValue: c.pValue,
    ci: c.ci as [number, number],
  }));

  return {
    coefficients,
    pseudoR2: result.r2,
    aic: result.aic,
    bic: result.bic,
    n: y.length,
    patternsUsed: patternNames,
  };
}
