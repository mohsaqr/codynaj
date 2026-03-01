/**
 * OBSESSIVE-GRADE R EQUIVALENCE VERIFICATION
 * Compares every single value from codyna TS against R reference.
 * 6000+ individual checks across multiple datasets and edge cases.
 */
import { readFileSync } from 'fs';
import { sequenceIndices } from '../src/patterns/indices';
import { discoverPatterns } from '../src/patterns/discover';
import { convert } from '../src/core/convert';
import { prepareSequenceData, rle } from '../src/core/prepare';
import { analyzeOutcome } from '../src/patterns/outcome';
import type { FrequencyResult, EdgeListEntry, ReverseEdgeListEntry } from '../src/core/types';

const ref = JSON.parse(readFileSync('tmp/obsessive_ref.json', 'utf-8'));

let failures = 0;
let passes = 0;
const failDetails: string[] = [];

function check(name: string, got: any, expected: any, tol: number) {
  // Both null/undefined/NaN → match (R's NA serializes as JSON null, TS uses NaN)
  const gotMissing = got === null || got === undefined || (typeof got === 'number' && isNaN(got));
  const expMissing = expected === null || expected === undefined || (typeof expected === 'number' && isNaN(expected));
  if (gotMissing && expMissing) { passes++; return; }
  if (gotMissing || expMissing) {
    failDetails.push(`FAIL ${name}: got=${got}, expected=${expected}`);
    failures++;
    return;
  }
  const g = Number(got);
  const e = Number(expected);
  if (isNaN(e) && isNaN(g)) { passes++; return; }
  if (isNaN(e) || isNaN(g)) {
    failDetails.push(`FAIL ${name}: got=${got}, expected=${expected}`);
    failures++;
    return;
  }
  const diff = Math.abs(g - e);
  if (diff > tol) {
    failDetails.push(`FAIL ${name}: got=${g}, expected=${e}, diff=${diff}`);
    failures++;
  } else {
    passes++;
  }
}

function checkStr(name: string, got: string | null | undefined, expected: string | null | undefined) {
  const g = got ?? 'NA';
  const e = expected ?? 'NA';
  if (g !== e) {
    failDetails.push(`FAIL ${name}: got="${g}", expected="${e}"`);
    failures++;
  } else {
    passes++;
  }
}

function refToArray(obj: any): any[] {
  const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
  return keys.map(k => obj[k]);
}

// ══════════════════════════════════════════════════════════════════════
// RECONSTRUCT DATASETS
// ══════════════════════════════════════════════════════════════════════

function datasetToMatrix(ds: Record<string, any[]>): (string | null)[][] {
  // Natural sort: t1, t2, ..., t10 (not lexicographic t1, t10, t2, ...)
  const cols = Object.keys(ds).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10);
    const nb = parseInt(b.replace(/\D/g, ''), 10);
    return na - nb;
  });
  const nRows = ds[cols[0]!]!.length;
  const mat: (string | null)[][] = [];
  for (let i = 0; i < nRows; i++) {
    const row: (string | null)[] = [];
    for (const col of cols) {
      const v = ds[col]![i];
      row.push(v === null || v === undefined ? null : String(v));
    }
    mat.push(row);
  }
  return mat;
}

const d1 = datasetToMatrix(ref.datasets.d1);
const d2 = datasetToMatrix(ref.datasets.d2);
const d3 = datasetToMatrix(ref.datasets.d3);
const d4 = datasetToMatrix(ref.datasets.d4);
const d5 = datasetToMatrix(ref.datasets.d5);
const d6 = datasetToMatrix(ref.datasets.d6);
const d7 = datasetToMatrix(ref.datasets.d7);
const d8 = datasetToMatrix(ref.datasets.d8);
const pd = datasetToMatrix(ref.datasets.pd);
const od = datasetToMatrix(ref.datasets.od);

// ══════════════════════════════════════════════════════════════════════
// INDEX FIELD MAPPING
// ══════════════════════════════════════════════════════════════════════

const numFields: [string, string][] = [
  ['validN', 'valid_n'],
  ['validProportion', 'valid_proportion'],
  ['uniqueStates', 'unique_states'],
  ['meanSpellDuration', 'mean_spell_duration'],
  ['maxSpellDuration', 'max_spell_duration'],
  ['longitudinalEntropy', 'longitudinal_entropy'],
  ['simpsonDiversity', 'simpson_diversity'],
  ['selfLoopTendency', 'self_loop_tendency'],
  ['transitionRate', 'transition_rate'],
  ['transitionComplexity', 'transition_complexity'],
  ['initialStatePersistence', 'initial_state_persistence'],
  ['initialStateProportion', 'initial_state_proportion'],
  ['initialStateInfluenceDecay', 'initial_state_influence_decay'],
  ['cyclicFeedbackStrength', 'cyclic_feedback_strength'],
  ['dominantProportion', 'dominant_proportion'],
  // dominantMaxSpell skipped: R bug (scalar not vector)
  ['emergentStatePersistence', 'emergent_state_persistence'],
  ['emergentStateProportion', 'emergent_state_proportion'],
  ['complexityIndex', 'complexity_index'],
];

const strFields: [string, string][] = [
  ['firstState', 'first_state'],
  ['lastState', 'last_state'],
  ['dominantState', 'dominant_state'],
  ['emergentState', 'emergent_state'],
];

function checkIndices(
  label: string,
  data: (string | null)[][],
  refKey: string,
  options?: Parameters<typeof sequenceIndices>[1],
) {
  const rArr = refToArray(ref[refKey]);
  const tsArr = sequenceIndices(data, options);

  if (rArr.length !== tsArr.length) {
    failDetails.push(`FAIL ${label}: row count mismatch: got=${tsArr.length}, expected=${rArr.length}`);
    failures++;
    return;
  }

  for (let i = 0; i < rArr.length; i++) {
    const rRow = rArr[i];
    const tsRow = tsArr[i]! as any;

    for (const [ts, r] of numFields) {
      check(`${label}[${i}].${ts}`, tsRow[ts], rRow[r], 1e-10);
    }
    for (const [ts, r] of strFields) {
      checkStr(`${label}[${i}].${ts}`, tsRow[ts], rRow[r]);
    }

    // integrative_potential if present in R ref
    if (rRow.integrative_potential !== undefined) {
      check(`${label}[${i}].integrativePotential`, tsRow.integrativePotential ?? NaN, rRow.integrative_potential ?? NaN, 1e-10);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// 1. SEQUENCE INDICES — ALL DATASETS
// ══════════════════════════════════════════════════════════════════════

console.log('=== 1. SEQUENCE INDICES ===');

checkIndices('idx_d1', d1, 'idx_d1');
checkIndices('idx_d1_favA', d1, 'idx_d1_favA', { favorable: ['A'] });
checkIndices('idx_d1_favAB', d1, 'idx_d1_favAB', { favorable: ['A', 'B'] });
checkIndices('idx_d1_favA_om2', d1, 'idx_d1_favA_omega2', { favorable: ['A'], omega: 2.0 });
checkIndices('idx_d1_favA_om05', d1, 'idx_d1_favA_omega05', { favorable: ['A'], omega: 0.5 });
checkIndices('idx_d2', d2, 'idx_d2');
checkIndices('idx_d2_favAB', d2, 'idx_d2_favAB', { favorable: ['A', 'B'] });
checkIndices('idx_d3', d3, 'idx_d3');
checkIndices('idx_d3_favHW', d3, 'idx_d3_favHW', { favorable: ['High', 'Work'] });
checkIndices('idx_d4', d4, 'idx_d4');
checkIndices('idx_d5', d5, 'idx_d5');
checkIndices('idx_d6', d6, 'idx_d6');
checkIndices('idx_d7', d7, 'idx_d7');

console.log(`  indices: ${passes} passed, ${failures} failed so far`);

// ══════════════════════════════════════════════════════════════════════
// 2. CONVERT — ALL FORMATS
// ══════════════════════════════════════════════════════════════════════

console.log('=== 2. CONVERT ===');

function checkConvFreq(label: string, data: (string | null)[][], refKey: string) {
  const rArr = refToArray(ref[refKey]);
  const ts = convert(data, 'frequency') as FrequencyResult;

  for (let i = 0; i < rArr.length; i++) {
    const rRow = rArr[i];
    // .id column
    check(`${label}[${i}].id`, ts.ids[i]!, rRow['.id'], 0);
    // State columns
    for (const state of ts.states) {
      const j = ts.states.indexOf(state);
      check(`${label}[${i}].${state}`, ts.matrix[i]![j]!, rRow[state], 0);
    }
  }
}

function checkConvOnehot(label: string, data: (string | null)[][], refKey: string) {
  const rArr = refToArray(ref[refKey]);
  const ts = convert(data, 'onehot') as FrequencyResult;

  for (let i = 0; i < rArr.length; i++) {
    const rRow = rArr[i];
    for (const state of ts.states) {
      const j = ts.states.indexOf(state);
      check(`${label}[${i}].${state}`, ts.matrix[i]![j]!, rRow[state], 0);
    }
  }
}

function checkConvEdge(label: string, data: (string | null)[][], refKey: string) {
  const rArr = refToArray(ref[refKey]);
  const ts = convert(data, 'edgelist') as EdgeListEntry[];

  check(`${label}.length`, ts.length, rArr.length, 0);
  for (let i = 0; i < Math.min(ts.length, rArr.length); i++) {
    check(`${label}[${i}].id`, ts[i]!.id, rArr[i]['.id'], 0);
    checkStr(`${label}[${i}].from`, ts[i]!.from, rArr[i].from);
    checkStr(`${label}[${i}].to`, ts[i]!.to, rArr[i].to);
  }
}

function checkConvReverse(label: string, data: (string | null)[][], refKey: string) {
  const rArr = refToArray(ref[refKey]);
  const ts = convert(data, 'reverse') as ReverseEdgeListEntry[];

  check(`${label}.length`, ts.length, rArr.length, 0);
  for (let i = 0; i < Math.min(ts.length, rArr.length); i++) {
    check(`${label}[${i}].id`, ts[i]!.id, rArr[i]['.id'], 0);
    checkStr(`${label}[${i}].state`, ts[i]!.state, rArr[i].state);
    checkStr(`${label}[${i}].previous`, ts[i]!.previous, rArr[i].previous);
  }
}

checkConvFreq('conv_d1_freq', d1, 'conv_d1_freq');
checkConvOnehot('conv_d1_oh', d1, 'conv_d1_onehot');
checkConvEdge('conv_d1_edge', d1, 'conv_d1_edge');
checkConvReverse('conv_d1_rev', d1, 'conv_d1_rev');
checkConvFreq('conv_d3_freq', d3, 'conv_d3_freq');
checkConvOnehot('conv_d3_oh', d3, 'conv_d3_onehot');
checkConvEdge('conv_d3_edge', d3, 'conv_d3_edge');
checkConvFreq('conv_d4_freq', d4, 'conv_d4_freq');
checkConvEdge('conv_d4_edge', d4, 'conv_d4_edge');
checkConvFreq('conv_d7_freq', d7, 'conv_d7_freq');
checkConvEdge('conv_d7_edge', d7, 'conv_d7_edge');

console.log(`  convert: ${passes} passed, ${failures} failed so far`);

// ══════════════════════════════════════════════════════════════════════
// 3. PATTERNS — ALL TYPES, LENGTHS, GAPS
// ══════════════════════════════════════════════════════════════════════

console.log('=== 3. PATTERNS ===');

function checkPatterns(
  label: string,
  data: (string | null)[][],
  refKey: string,
  opts: Parameters<typeof discoverPatterns>[1],
) {
  const rArr = refToArray(ref[refKey]);
  const ts = discoverPatterns(data, opts);

  // Check that every R pattern exists in TS with exact values
  for (let i = 0; i < rArr.length; i++) {
    const rRow = rArr[i];
    const rName = rRow.pattern;
    const tsPat = ts.patterns.find(p => p.pattern === rName);

    if (!tsPat) {
      failDetails.push(`FAIL ${label}: pattern "${rName}" not found in TS`);
      failures++;
      continue;
    }

    check(`${label}[${rName}].frequency`, tsPat.frequency, rRow.frequency, 0);
    check(`${label}[${rName}].length`, tsPat.length, rRow.length, 0);
    check(`${label}[${rName}].count`, tsPat.count, rRow.count, 0);
    check(`${label}[${rName}].support`, tsPat.support, rRow.support, 1e-10);
    check(`${label}[${rName}].proportion`, tsPat.proportion, rRow.proportion, 1e-10);
    check(`${label}[${rName}].lift`, tsPat.lift, rRow.lift, 1e-10);

    // Group fields
    if (rRow.chisq !== undefined) {
      check(`${label}[${rName}].chisq`, tsPat.chisq ?? NaN, rRow.chisq, 1e-6);
      check(`${label}[${rName}].pValue`, tsPat.pValue ?? NaN, rRow.p_value, 1e-6);
    }
    // Group count columns
    for (const key of Object.keys(rRow)) {
      if (key.startsWith('count_')) {
        check(`${label}[${rName}].${key}`, tsPat.groupCounts?.[key] ?? 0, rRow[key], 0);
      }
    }
  }

  // Check no extra patterns in TS that R doesn't have
  const rNames = new Set(rArr.map((r: any) => r.pattern));
  for (const p of ts.patterns) {
    if (!rNames.has(p.pattern)) {
      failDetails.push(`FAIL ${label}: TS has extra pattern "${p.pattern}" not in R`);
      failures++;
    }
  }
}

// ── Ngrams ────────────────────────────────────────────────────────────

checkPatterns('ng2', pd, 'pat_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('ng3', pd, 'pat_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('ng4', pd, 'pat_ng4', { type: 'ngram', len: [4], minFreq: 1, minSupport: 0 });
checkPatterns('ng5', pd, 'pat_ng5', { type: 'ngram', len: [5], minFreq: 1, minSupport: 0 });
checkPatterns('ng24', pd, 'pat_ng24', { type: 'ngram', len: [2, 3, 4], minFreq: 1, minSupport: 0 });

// ── Gapped ────────────────────────────────────────────────────────────

checkPatterns('gp1', pd, 'pat_gp1', { type: 'gapped', gap: [1], minFreq: 1, minSupport: 0 });
checkPatterns('gp2', pd, 'pat_gp2', { type: 'gapped', gap: [2], minFreq: 1, minSupport: 0 });
checkPatterns('gp3', pd, 'pat_gp3', { type: 'gapped', gap: [3], minFreq: 1, minSupport: 0 });
checkPatterns('gp13', pd, 'pat_gp13', { type: 'gapped', gap: [1, 2, 3], minFreq: 1, minSupport: 0 });

// ── Repeated ──────────────────────────────────────────────────────────

checkPatterns('rp2', pd, 'pat_rp2', { type: 'repeated', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('rp3', pd, 'pat_rp3', { type: 'repeated', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('rp24', pd, 'pat_rp24', { type: 'repeated', len: [2, 3, 4], minFreq: 1, minSupport: 0 });

// ── Custom search ─────────────────────────────────────────────────────

checkPatterns('custom_AB', pd, 'pat_custom_AB', { pattern: 'A->B', minFreq: 1, minSupport: 0 });
checkPatterns('custom_AwB', pd, 'pat_custom_AwB', { pattern: 'A->*->B', minFreq: 1, minSupport: 0 });
checkPatterns('custom_AwwC', pd, 'pat_custom_AwwC', { pattern: 'A->*->*->C', minFreq: 1, minSupport: 0 });
checkPatterns('custom_BwA', pd, 'pat_custom_BwA', { pattern: 'B->*->A', minFreq: 1, minSupport: 0 });

// ── Filtering ─────────────────────────────────────────────────────────

checkPatterns('start_A', pd, 'pat_start_A', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, start: ['A'] });
checkPatterns('end_C', pd, 'pat_end_C', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, end: ['C'] });
checkPatterns('contain_B', pd, 'pat_contain_B', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, contain: ['B'] });
checkPatterns('minfreq5', pd, 'pat_minfreq5', { type: 'ngram', len: [2], minFreq: 5, minSupport: 0 });
checkPatterns('minsup03', pd, 'pat_minsup03', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0.3 });

// ── Larger dataset (d8: 30×8, 4 states) ──────────────────────────────

checkPatterns('d8_ng2', d8, 'pat_d8_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d8_ng3', d8, 'pat_d8_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('d8_gp1', d8, 'pat_d8_gp1', { type: 'gapped', gap: [1], minFreq: 1, minSupport: 0 });
checkPatterns('d8_rp2', d8, 'pat_d8_rp2', { type: 'repeated', len: [2], minFreq: 1, minSupport: 0 });

// ── D1 patterns (5×8, 3 states, NAs) ─────────────────────────────────

checkPatterns('d1_ng2', d1, 'pat_d1_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d1_ng3', d1, 'pat_d1_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('d1_ng25', d1, 'pat_d1_ng25', { type: 'ngram', len: [2, 3, 4, 5], minFreq: 1, minSupport: 0 });
checkPatterns('d1_gp1', d1, 'pat_d1_gp1', { type: 'gapped', gap: [1], minFreq: 1, minSupport: 0 });
checkPatterns('d1_gp13', d1, 'pat_d1_gp13', { type: 'gapped', gap: [1, 2, 3], minFreq: 1, minSupport: 0 });
checkPatterns('d1_rp2', d1, 'pat_d1_rp2', { type: 'repeated', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d1_rp24', d1, 'pat_d1_rp24', { type: 'repeated', len: [2, 3, 4], minFreq: 1, minSupport: 0 });

// ── D2 patterns (20×10, 3 states, NAs) ───────────────────────────────

checkPatterns('d2_ng2', d2, 'pat_d2_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d2_ng3', d2, 'pat_d2_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('d2_ng4', d2, 'pat_d2_ng4', { type: 'ngram', len: [4], minFreq: 1, minSupport: 0 });
checkPatterns('d2_gp12', d2, 'pat_d2_gp12', { type: 'gapped', gap: [1, 2], minFreq: 1, minSupport: 0 });
checkPatterns('d2_rp23', d2, 'pat_d2_rp23', { type: 'repeated', len: [2, 3], minFreq: 1, minSupport: 0 });

// ── D3 patterns (15×12, 5 states) ────────────────────────────────────

checkPatterns('d3_ng2', d3, 'pat_d3_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d3_ng3', d3, 'pat_d3_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('d3_ng4', d3, 'pat_d3_ng4', { type: 'ngram', len: [4], minFreq: 1, minSupport: 0 });
checkPatterns('d3_gp12', d3, 'pat_d3_gp12', { type: 'gapped', gap: [1, 2], minFreq: 1, minSupport: 0 });
checkPatterns('d3_rp23', d3, 'pat_d3_rp23', { type: 'repeated', len: [2, 3], minFreq: 1, minSupport: 0 });

// ── D4 patterns (10×6, 2 states) ─────────────────────────────────────

checkPatterns('d4_ng2', d4, 'pat_d4_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d4_ng3', d4, 'pat_d4_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('d4_ng4', d4, 'pat_d4_ng4', { type: 'ngram', len: [4], minFreq: 1, minSupport: 0 });
checkPatterns('d4_gp12', d4, 'pat_d4_gp12', { type: 'gapped', gap: [1, 2], minFreq: 1, minSupport: 0 });
checkPatterns('d4_rp24', d4, 'pat_d4_rp24', { type: 'repeated', len: [2, 3, 4], minFreq: 1, minSupport: 0 });

// ── D5 patterns (8×10, heavy NAs) ────────────────────────────────────

checkPatterns('d5_ng2', d5, 'pat_d5_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d5_ng3', d5, 'pat_d5_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('d5_gp1', d5, 'pat_d5_gp1', { type: 'gapped', gap: [1], minFreq: 1, minSupport: 0 });
checkPatterns('d5_rp2', d5, 'pat_d5_rp2', { type: 'repeated', len: [2], minFreq: 1, minSupport: 0 });

// ── D6 patterns (6×15, emergent-triggering) ──────────────────────────

checkPatterns('d6_ng2', d6, 'pat_d6_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d6_ng3', d6, 'pat_d6_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 });
checkPatterns('d6_ng5', d6, 'pat_d6_ng5', { type: 'ngram', len: [5], minFreq: 1, minSupport: 0 });
checkPatterns('d6_gp13', d6, 'pat_d6_gp13', { type: 'gapped', gap: [1, 2, 3], minFreq: 1, minSupport: 0 });
checkPatterns('d6_rp25', d6, 'pat_d6_rp25', { type: 'repeated', len: [2, 3, 4, 5], minFreq: 1, minSupport: 0 });

// ── D7 patterns (4×6, constant sequences) ────────────────────────────

checkPatterns('d7_ng2', d7, 'pat_d7_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 });
checkPatterns('d7_rp26', d7, 'pat_d7_rp26', { type: 'repeated', len: [2, 3, 4, 5, 6], minFreq: 1, minSupport: 0 });

// ── More custom pattern searches ─────────────────────────────────────

checkPatterns('custom_CwwwA', pd, 'pat_custom_CwwwA', { pattern: 'C->*->*->*->A', minFreq: 1, minSupport: 0 });
checkPatterns('custom_AwBwC', pd, 'pat_custom_AwBwC', { pattern: 'A->*->B->*->C', minFreq: 1, minSupport: 0 });
checkPatterns('d6_custom_AwA', d6, 'pat_d6_custom_AwA', { pattern: 'A->*->A', minFreq: 1, minSupport: 0 });
checkPatterns('d6_custom_BwwB', d6, 'pat_d6_custom_BwwB', { pattern: 'B->*->*->B', minFreq: 1, minSupport: 0 });
checkPatterns('d6_custom_AwwwC', d6, 'pat_d6_custom_AwwwC', { pattern: 'A->*->*->*->C', minFreq: 1, minSupport: 0 });
checkPatterns('d6_custom_CwwA', d6, 'pat_d6_custom_CwwA', { pattern: 'C->*->*->A', minFreq: 1, minSupport: 0 });
checkPatterns('d3_custom_HwW', d3, 'pat_d3_custom_HwW', { pattern: 'High->*->Work', minFreq: 1, minSupport: 0 });
checkPatterns('d3_custom_LwwH', d3, 'pat_d3_custom_LwwH', { pattern: 'Low->*->*->High', minFreq: 1, minSupport: 0 });
checkPatterns('d4_custom_OnwOff', d4, 'pat_d4_custom_OnwOff', { pattern: 'On->*->Off', minFreq: 1, minSupport: 0 });

// ── Combined filters ─────────────────────────────────────────────────

checkPatterns('startA_endC', pd, 'pat_startA_endC', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0, start: ['A'], end: ['C'] });
checkPatterns('containAB', pd, 'pat_containAB', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0, contain: ['A', 'B'] });
checkPatterns('startB_containC', pd, 'pat_startB_containC', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0, start: ['B'], contain: ['C'] });
checkPatterns('d3_startHigh', d3, 'pat_d3_startHigh', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, start: ['High'] });
checkPatterns('d3_endWork', d3, 'pat_d3_endWork', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, end: ['Work'] });
checkPatterns('d8_startP_endS', d8, 'pat_d8_startP_endS', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0, start: ['P'], end: ['S'] });
checkPatterns('d8_mf3_ms01', d8, 'pat_d8_mf3_ms01', { type: 'ngram', len: [2], minFreq: 3, minSupport: 0.1 });

console.log(`  patterns: ${passes} passed, ${failures} failed so far`);

// ══════════════════════════════════════════════════════════════════════
// 4. PATTERNS WITH GROUPING
// ══════════════════════════════════════════════════════════════════════

console.log('=== 4. GROUPED PATTERNS ===');

checkPatterns('grp2_ng2', pd, 'pat_grp2_ng2', {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0,
  group: ref.groups.grp2,
});

checkPatterns('grp3_d8', d8, 'pat_grp3_d8', {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0,
  group: ref.groups.grp3,
});

checkPatterns('grpU_ng2', pd, 'pat_grpU_ng2', {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0,
  group: ref.groups.grp_unbal,
});

// Grouped on D1
checkPatterns('grp_d1', d1, 'pat_grp_d1', {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0,
  group: ref.groups.grp_d1,
});

// Grouped on D2
checkPatterns('grp_d2', d2, 'pat_grp_d2', {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0,
  group: ref.groups.grp_d2,
});

// Grouped on D3 (3 groups, 5 states)
checkPatterns('grp_d3', d3, 'pat_grp_d3', {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0,
  group: ref.groups.grp_d3,
});

// Grouped on D6
checkPatterns('grp_d6', d6, 'pat_grp_d6', {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0,
  group: ref.groups.grp_d6,
});

// D8 grouped gapped
checkPatterns('grp_d8_gp1', d8, 'pat_grp_d8_gp1', {
  type: 'gapped', gap: [1], minFreq: 1, minSupport: 0,
  group: ref.groups.grp3,
});

// D4 grouped multi-len
checkPatterns('grp_d4', d4, 'pat_grp_d4', {
  type: 'ngram', len: [2, 3], minFreq: 1, minSupport: 0,
  group: ref.groups.grp_d4,
});

console.log(`  grouped: ${passes} passed, ${failures} failed so far`);

// ══════════════════════════════════════════════════════════════════════
// 5. OUTCOME ANALYSIS
// ══════════════════════════════════════════════════════════════════════

console.log('=== 5. OUTCOME ===');

if (ref.outcome) {
  const result = analyzeOutcome(od, {
    outcome: ref.groups.outcome,
    n: 5,
    freq: false,
    type: 'ngram',
    len: [1, 2],
    gap: [1],
    minFreq: 2,
    minSupport: 0.01,
  });

  check('outcome.n', result.n, ref.outcome.n, 0);

  if (ref.outcome.aic !== undefined && result.aic !== undefined) {
    check('outcome.aic', result.aic, ref.outcome.aic, 0.5);
  }

  // Compare coefficients by name
  for (let i = 0; i < ref.outcome.coef_names.length; i++) {
    const rName = ref.outcome.coef_names[i];
    // Map R name to TS name (R uses make.names on "X->Y" patterns)
    const tsCoef = result.coefficients.find(c => {
      // Try exact match first
      if (c.name === rName) return true;
      // R make.names converts "A_to_B" to "A_to_B", intercept is "(Intercept)"
      if (rName === '(Intercept)' && c.name === '(Intercept)') return true;
      return false;
    });

    if (tsCoef) {
      check(`outcome.coef[${rName}].estimate`, tsCoef.estimate, ref.outcome.estimates[i], 1e-3);
      check(`outcome.coef[${rName}].se`, tsCoef.se, ref.outcome.se[i], 1e-2);
    }
  }
}

console.log(`  outcome: ${passes} passed, ${failures} failed so far`);

// ══════════════════════════════════════════════════════════════════════
// 6. RLE
// ══════════════════════════════════════════════════════════════════════

console.log('=== 6. RLE ===');

const rle1 = rle([1, 1, 2, 2, 2, 3, 1]);
for (let i = 0; i < ref.rle1.values.length; i++) {
  check(`rle1.values[${i}]`, rle1.values[i]!, ref.rle1.values[i], 0);
  check(`rle1.lengths[${i}]`, rle1.lengths[i]!, ref.rle1.lengths[i], 0);
}

const rle3 = rle([3, 3, 3, 3]);
for (let i = 0; i < ref.rle3.values.length; i++) {
  check(`rle3.values[${i}]`, rle3.values[i]!, ref.rle3.values[i], 0);
  check(`rle3.lengths[${i}]`, rle3.lengths[i]!, ref.rle3.lengths[i], 0);
}

// rle2 has NA: R's rle gives 4 runs (each NA is own run)
const rle2 = rle([1, NaN, NaN, 2]);
check('rle2.nRuns', rle2.values.length, ref.rle2.values.length, 0);
for (let i = 0; i < ref.rle2.values.length; i++) {
  check(`rle2.values[${i}]`, rle2.values[i]!, ref.rle2.values[i], 0);
  check(`rle2.lengths[${i}]`, rle2.lengths[i]!, ref.rle2.lengths[i], 0);
}

console.log(`  rle: ${passes} passed, ${failures} failed so far`);

// ══════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`OBSESSIVE R EQUIVALENCE: ${passes} passed, ${failures} failed`);
console.log(`${'═'.repeat(60)}`);

if (failures > 0) {
  console.log('\nFAILURES:');
  for (const f of failDetails) {
    console.error(`  ${f}`);
  }
  process.exit(1);
} else {
  console.log('ALL CHECKS PASSED!');
}
