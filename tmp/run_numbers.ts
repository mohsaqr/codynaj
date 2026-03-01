/**
 * NUMERICAL EQUIVALENCE REPORT
 * Shows R vs TS values side-by-side with differences.
 */
import { readFileSync } from 'fs';
import { sequenceIndices } from '../src/patterns/indices';
import { discoverPatterns } from '../src/patterns/discover';
import { convert } from '../src/core/convert';
import type { FrequencyResult } from '../src/core/types';

const ref = JSON.parse(readFileSync('tmp/obsessive_ref.json', 'utf-8'));

function refToArray(obj: any): any[] {
  const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
  return keys.map(k => obj[k]);
}

function datasetToMatrix(ds: Record<string, any[]>): (string | null)[][] {
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

// ── Stats tracking ───────────────────────────────────────────────────

interface DiffEntry {
  section: string;
  field: string;
  r: string;
  ts: string;
  diff: number;
}

const diffs: DiffEntry[] = [];
let exact = 0;
let withinTol = 0;
let maxDiff = 0;
let maxDiffField = '';
let totalChecks = 0;

function num(section: string, field: string, tsVal: any, rVal: any) {
  totalChecks++;
  const t = Number(tsVal);
  const r = Number(rVal);
  const tMissing = tsVal === null || tsVal === undefined || (typeof tsVal === 'number' && isNaN(tsVal));
  const rMissing = rVal === null || rVal === undefined || (typeof rVal === 'number' && isNaN(rVal));

  if (tMissing && rMissing) { exact++; return; }
  if (tMissing || rMissing) {
    diffs.push({ section, field, r: String(rVal), ts: String(tsVal), diff: Infinity });
    return;
  }

  const d = Math.abs(t - r);
  if (d === 0) {
    exact++;
  } else {
    withinTol++;
    diffs.push({ section, field, r: r.toPrecision(15), ts: t.toPrecision(15), diff: d });
  }
  if (d > maxDiff) { maxDiff = d; maxDiffField = `${section}.${field}`; }
}

// ── Datasets ─────────────────────────────────────────────────────────

const d1 = datasetToMatrix(ref.datasets.d1);
const d2 = datasetToMatrix(ref.datasets.d2);
const d3 = datasetToMatrix(ref.datasets.d3);
const d6 = datasetToMatrix(ref.datasets.d6);
const d7 = datasetToMatrix(ref.datasets.d7);
const pd = datasetToMatrix(ref.datasets.pd);
const d8 = datasetToMatrix(ref.datasets.d8);

// ══════════════════════════════════════════════════════════════════════
// 1. INDICES — full numeric comparison
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
  ['emergentStatePersistence', 'emergent_state_persistence'],
  ['emergentStateProportion', 'emergent_state_proportion'],
  ['complexityIndex', 'complexity_index'],
];

function compareIndices(label: string, data: (string | null)[][], refKey: string, opts?: any) {
  const rArr = refToArray(ref[refKey]);
  const tsArr = sequenceIndices(data, opts);
  for (let i = 0; i < rArr.length; i++) {
    for (const [ts, r] of numFields) {
      num(`${label}[${i}]`, ts!, (tsArr[i] as any)[ts!], rArr[i][r!]);
    }
    if (rArr[i].integrative_potential !== undefined) {
      num(`${label}[${i}]`, 'integrativePotential', (tsArr[i] as any).integrativePotential, rArr[i].integrative_potential);
    }
  }
}

compareIndices('idx_d1', d1, 'idx_d1');
compareIndices('idx_d1_favA', d1, 'idx_d1_favA', { favorable: ['A'] });
compareIndices('idx_d1_favAB', d1, 'idx_d1_favAB', { favorable: ['A', 'B'] });
compareIndices('idx_d1_om2', d1, 'idx_d1_favA_omega2', { favorable: ['A'], omega: 2.0 });
compareIndices('idx_d1_om05', d1, 'idx_d1_favA_omega05', { favorable: ['A'], omega: 0.5 });
compareIndices('idx_d2', d2, 'idx_d2');
compareIndices('idx_d2_favAB', d2, 'idx_d2_favAB', { favorable: ['A', 'B'] });
compareIndices('idx_d3', d3, 'idx_d3');
compareIndices('idx_d3_favHW', d3, 'idx_d3_favHW', { favorable: ['High', 'Work'] });
compareIndices('idx_d6', d6, 'idx_d6');
compareIndices('idx_d7', d7, 'idx_d7');

// ══════════════════════════════════════════════════════════════════════
// 2. PATTERNS — full numeric comparison
// ══════════════════════════════════════════════════════════════════════

function comparePatterns(label: string, data: (string | null)[][], refKey: string, opts: any) {
  const rArr = refToArray(ref[refKey]);
  const tsResult = discoverPatterns(data, opts);
  for (const rRow of rArr) {
    const p = tsResult.patterns.find(x => x.pattern === rRow.pattern);
    if (!p) continue;
    num(`${label}[${rRow.pattern}]`, 'frequency', p.frequency, rRow.frequency);
    num(`${label}[${rRow.pattern}]`, 'count', p.count, rRow.count);
    num(`${label}[${rRow.pattern}]`, 'support', p.support, rRow.support);
    num(`${label}[${rRow.pattern}]`, 'proportion', p.proportion, rRow.proportion);
    num(`${label}[${rRow.pattern}]`, 'lift', p.lift, rRow.lift);
    if (rRow.chisq !== undefined) {
      num(`${label}[${rRow.pattern}]`, 'chisq', p.chisq, rRow.chisq);
      num(`${label}[${rRow.pattern}]`, 'pValue', p.pValue, rRow.p_value);
    }
    for (const key of Object.keys(rRow)) {
      if (key.startsWith('count_')) {
        num(`${label}[${rRow.pattern}]`, key, p.groupCounts?.[key] ?? 0, rRow[key]);
      }
    }
  }
}

// All pattern configs
const patConfigs: [string, (string|null)[][], string, any][] = [
  ['ng2', pd, 'pat_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 }],
  ['ng3', pd, 'pat_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 }],
  ['ng4', pd, 'pat_ng4', { type: 'ngram', len: [4], minFreq: 1, minSupport: 0 }],
  ['ng5', pd, 'pat_ng5', { type: 'ngram', len: [5], minFreq: 1, minSupport: 0 }],
  ['ng24', pd, 'pat_ng24', { type: 'ngram', len: [2,3,4], minFreq: 1, minSupport: 0 }],
  ['gp1', pd, 'pat_gp1', { type: 'gapped', gap: [1], minFreq: 1, minSupport: 0 }],
  ['gp2', pd, 'pat_gp2', { type: 'gapped', gap: [2], minFreq: 1, minSupport: 0 }],
  ['gp3', pd, 'pat_gp3', { type: 'gapped', gap: [3], minFreq: 1, minSupport: 0 }],
  ['gp13', pd, 'pat_gp13', { type: 'gapped', gap: [1,2,3], minFreq: 1, minSupport: 0 }],
  ['rp2', pd, 'pat_rp2', { type: 'repeated', len: [2], minFreq: 1, minSupport: 0 }],
  ['rp3', pd, 'pat_rp3', { type: 'repeated', len: [3], minFreq: 1, minSupport: 0 }],
  ['rp24', pd, 'pat_rp24', { type: 'repeated', len: [2,3,4], minFreq: 1, minSupport: 0 }],
  ['custom_AB', pd, 'pat_custom_AB', { pattern: 'A->B', minFreq: 1, minSupport: 0 }],
  ['custom_AwB', pd, 'pat_custom_AwB', { pattern: 'A->*->B', minFreq: 1, minSupport: 0 }],
  ['custom_AwwC', pd, 'pat_custom_AwwC', { pattern: 'A->*->*->C', minFreq: 1, minSupport: 0 }],
  ['custom_BwA', pd, 'pat_custom_BwA', { pattern: 'B->*->A', minFreq: 1, minSupport: 0 }],
  ['custom_CwwwA', pd, 'pat_custom_CwwwA', { pattern: 'C->*->*->*->A', minFreq: 1, minSupport: 0 }],
  ['custom_AwBwC', pd, 'pat_custom_AwBwC', { pattern: 'A->*->B->*->C', minFreq: 1, minSupport: 0 }],
  ['d1_ng2', d1, 'pat_d1_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 }],
  ['d1_ng3', d1, 'pat_d1_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 }],
  ['d1_ng25', d1, 'pat_d1_ng25', { type: 'ngram', len: [2,3,4,5], minFreq: 1, minSupport: 0 }],
  ['d1_gp1', d1, 'pat_d1_gp1', { type: 'gapped', gap: [1], minFreq: 1, minSupport: 0 }],
  ['d1_gp13', d1, 'pat_d1_gp13', { type: 'gapped', gap: [1,2,3], minFreq: 1, minSupport: 0 }],
  ['d1_rp2', d1, 'pat_d1_rp2', { type: 'repeated', len: [2], minFreq: 1, minSupport: 0 }],
  ['d1_rp24', d1, 'pat_d1_rp24', { type: 'repeated', len: [2,3,4], minFreq: 1, minSupport: 0 }],
  ['d2_ng2', d2, 'pat_d2_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 }],
  ['d2_ng3', d2, 'pat_d2_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 }],
  ['d2_ng4', d2, 'pat_d2_ng4', { type: 'ngram', len: [4], minFreq: 1, minSupport: 0 }],
  ['d2_gp12', d2, 'pat_d2_gp12', { type: 'gapped', gap: [1,2], minFreq: 1, minSupport: 0 }],
  ['d2_rp23', d2, 'pat_d2_rp23', { type: 'repeated', len: [2,3], minFreq: 1, minSupport: 0 }],
  ['d3_ng2', d3, 'pat_d3_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 }],
  ['d3_ng3', d3, 'pat_d3_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 }],
  ['d3_ng4', d3, 'pat_d3_ng4', { type: 'ngram', len: [4], minFreq: 1, minSupport: 0 }],
  ['d6_ng2', d6, 'pat_d6_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 }],
  ['d6_ng3', d6, 'pat_d6_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 }],
  ['d6_ng5', d6, 'pat_d6_ng5', { type: 'ngram', len: [5], minFreq: 1, minSupport: 0 }],
  ['d6_rp25', d6, 'pat_d6_rp25', { type: 'repeated', len: [2,3,4,5], minFreq: 1, minSupport: 0 }],
  ['d7_ng2', d7, 'pat_d7_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 }],
  ['d7_rp26', d7, 'pat_d7_rp26', { type: 'repeated', len: [2,3,4,5,6], minFreq: 1, minSupport: 0 }],
  ['d8_ng2', d8, 'pat_d8_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0 }],
  ['d8_ng3', d8, 'pat_d8_ng3', { type: 'ngram', len: [3], minFreq: 1, minSupport: 0 }],
  ['d8_gp1', d8, 'pat_d8_gp1', { type: 'gapped', gap: [1], minFreq: 1, minSupport: 0 }],
  ['d8_rp2', d8, 'pat_d8_rp2', { type: 'repeated', len: [2], minFreq: 1, minSupport: 0 }],
  // grouped
  ['grp2', pd, 'pat_grp2_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, group: ref.groups.grp2 }],
  ['grp3_d8', d8, 'pat_grp3_d8', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, group: ref.groups.grp3 }],
  ['grpU', pd, 'pat_grpU_ng2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, group: ref.groups.grp_unbal }],
  ['grp_d1', d1, 'pat_grp_d1', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, group: ref.groups.grp_d1 }],
  ['grp_d2', d2, 'pat_grp_d2', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, group: ref.groups.grp_d2 }],
  ['grp_d3', d3, 'pat_grp_d3', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, group: ref.groups.grp_d3 }],
  ['grp_d6', d6, 'pat_grp_d6', { type: 'ngram', len: [2], minFreq: 1, minSupport: 0, group: ref.groups.grp_d6 }],
];

for (const [label, data, refKey, opts] of patConfigs) {
  comparePatterns(label, data, refKey, opts);
}

// ══════════════════════════════════════════════════════════════════════
// REPORT
// ══════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          NUMERICAL EQUIVALENCE REPORT: codynaj vs R        ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  Total comparisons:     ${String(totalChecks).padStart(8)}                         ║`);
console.log(`║  Exact match (diff=0):  ${String(exact).padStart(8)}  (${(100*exact/totalChecks).toFixed(2)}%)               ║`);
console.log(`║  Within tolerance:      ${String(withinTol).padStart(8)}  (${(100*withinTol/totalChecks).toFixed(2)}%)               ║`);
console.log(`║  Failures:              ${String(totalChecks - exact - withinTol).padStart(8)}                              ║`);
console.log(`║  Max difference:        ${maxDiff.toExponential(4).padStart(12)}                      ║`);
console.log(`║  Max diff field:        ${maxDiffField.padEnd(36).slice(0,36)}║`);
console.log('╚══════════════════════════════════════════════════════════════╝');

// Show the actual non-zero diffs sorted by magnitude
if (diffs.length > 0) {
  diffs.sort((a, b) => b.diff - a.diff);

  console.log(`\n── Top ${Math.min(30, diffs.length)} largest differences (of ${diffs.length} non-zero) ──\n`);
  console.log('  Diff'.padEnd(16) + 'R value'.padEnd(22) + 'TS value'.padEnd(22) + 'Field');
  console.log('  ' + '─'.repeat(74));

  for (let i = 0; i < Math.min(30, diffs.length); i++) {
    const d = diffs[i]!;
    const diffStr = d.diff === Infinity ? '  INF' : `  ${d.diff.toExponential(4)}`;
    console.log(
      diffStr.padEnd(16) +
      d.r.slice(0, 20).padEnd(22) +
      d.ts.slice(0, 20).padEnd(22) +
      `${d.section}.${d.field}`
    );
  }

  // Diff distribution
  const buckets = [1e-15, 1e-14, 1e-13, 1e-12, 1e-11, 1e-10];
  console.log('\n── Difference distribution ──\n');
  for (const b of buckets) {
    const count = diffs.filter(d => d.diff <= b && d.diff > 0).length;
    console.log(`  <= ${b.toExponential(0).padEnd(6)}: ${count}`);
  }
  console.log(`  > 1e-10 : ${diffs.filter(d => d.diff > 1e-10).length}`);
}
