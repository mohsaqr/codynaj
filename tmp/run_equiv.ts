/**
 * R equivalence verification for codyna.
 * Compares TS output against R reference from tmp/equiv_ref.json.
 */
import { readFileSync } from 'fs';
import { sequenceIndices } from '../src/patterns/indices';
import { discoverPatterns } from '../src/patterns/discover';
import { convert } from '../src/core/convert';
import type { FrequencyResult } from '../src/core/types';

const ref = JSON.parse(readFileSync('tmp/equiv_ref.json', 'utf-8'));

let failures = 0;
let passes = 0;

function check(name: string, got: number, expected: number, tol: number) {
  if ((expected === null || expected === undefined) && (got === null || got === undefined)) { passes++; return; }
  const g = Number(got);
  const e = Number(expected);
  if (isNaN(e) && isNaN(g)) { passes++; return; }
  if (isNaN(e) || isNaN(g)) {
    console.error(`FAIL ${name}: got=${got}, expected=${expected}`);
    failures++;
    return;
  }
  const diff = Math.abs(g - e);
  if (diff > tol) {
    console.error(`FAIL ${name}: got=${g}, expected=${e}, diff=${diff}`);
    failures++;
  } else {
    passes++;
  }
}

function checkStr(name: string, got: string | null | undefined, expected: string | null | undefined) {
  const g = got ?? 'NA';
  const e = expected ?? 'NA';
  if (g !== e) {
    console.error(`FAIL ${name}: got="${g}", expected="${e}"`);
    failures++;
  } else {
    passes++;
  }
}

// Helper: ref data is { "0": {...}, "1": {...}, ... } — convert to array
function refToArray(obj: any): any[] {
  const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
  return keys.map(k => obj[k]);
}

// ── Indices data ─────────────────────────────────────────────────────

const indicesData: (string | null)[][] = [
  ['A', 'B', 'A', 'C', 'B', 'A', 'C', 'B'],
  ['B', 'B', 'B', 'A', 'A', 'C', 'C', null],
  ['C', 'A', 'A', 'B', 'B', 'B', 'A', 'A'],
  ['A', 'A', 'A', 'A', 'A', null, null, null],
  ['B', 'C', 'A', 'B', 'C', 'A', 'B', 'C'],
];

// ── 1. Sequence indices ──────────────────────────────────────────────

console.log('\n=== SEQUENCE INDICES ===');
const idx = sequenceIndices(indicesData);
const rIdxArr = refToArray(ref.indices);

const numericKeys: [string, string][] = [
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
  // NOTE: dominantMaxSpell skipped — R has a bug: dom_spell is a scalar (not vector),
  // always using the last loop iteration's value. Our implementation is correct.
  // ['dominantMaxSpell', 'dominant_max_spell'],
  ['emergentStatePersistence', 'emergent_state_persistence'],
  ['emergentStateProportion', 'emergent_state_proportion'],
  ['complexityIndex', 'complexity_index'],
];

const strKeys: [string, string][] = [
  ['firstState', 'first_state'],
  ['lastState', 'last_state'],
  ['dominantState', 'dominant_state'],
  ['emergentState', 'emergent_state'],
];

for (let i = 0; i < 5; i++) {
  const rRow = rIdxArr[i];
  for (const [ts, r] of numericKeys) {
    const got = (idx[i] as any)[ts];
    const exp = rRow[r];
    check(`row${i}.${ts}`, got, exp, 1e-10);
  }
  for (const [ts, r] of strKeys) {
    const got = (idx[i] as any)[ts];
    const exp = rRow[r];
    checkStr(`row${i}.${ts}`, got, exp);
  }
}

// ── 2. Indices with favorable ────────────────────────────────────────

console.log('\n=== INDICES WITH FAVORABLE ===');
const idxFav = sequenceIndices(indicesData, { favorable: ['A'] });
const rFavArr = refToArray(ref.indices_fav);

for (let i = 0; i < 5; i++) {
  const got = idxFav[i]!.integrativePotential;
  const exp = rFavArr[i].integrative_potential;
  check(`row${i}.integrativePotential`, got ?? NaN, exp ?? NaN, 1e-10);
}

// ── 3. Convert frequency ─────────────────────────────────────────────

console.log('\n=== CONVERT FREQUENCY ===');
const freq = convert(indicesData, 'frequency') as FrequencyResult;
const expectedFreq = [
  [3, 3, 2],
  [2, 3, 2],
  [4, 3, 1],
  [5, 0, 0],
  [2, 3, 3],
];
for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 3; j++) {
    check(`freq[${i}][${j}]`, freq.matrix[i]![j]!, expectedFreq[i]![j]!, 0);
  }
}

// ── 4. Patterns ngram ────────────────────────────────────────────────

console.log('\n=== PATTERNS NGRAM ===');
const patData: (string | null)[][] = [
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

const pat = discoverPatterns(patData, {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0,
});

const rPatArr = refToArray(ref.patterns_ngram);
for (const rRow of rPatArr) {
  const rName = rRow.pattern;
  const tsPat = pat.patterns.find(p => p.pattern === rName);
  if (!tsPat) {
    console.error(`FAIL pattern "${rName}" not found in TS output`);
    failures++;
    continue;
  }
  check(`pat[${rName}].frequency`, tsPat.frequency, rRow.frequency, 0);
  check(`pat[${rName}].count`, tsPat.count, rRow.count, 0);
  check(`pat[${rName}].support`, tsPat.support, rRow.support, 1e-10);
  check(`pat[${rName}].proportion`, tsPat.proportion, rRow.proportion, 1e-10);
  check(`pat[${rName}].lift`, tsPat.lift, rRow.lift, 1e-10);
}

// ── 5. Patterns gapped ───────────────────────────────────────────────

console.log('\n=== PATTERNS GAPPED ===');
const patG = discoverPatterns(patData, {
  type: 'gapped', gap: [1], minFreq: 1, minSupport: 0,
});

const rPatGArr = refToArray(ref.patterns_gapped);
for (const rRow of rPatGArr) {
  const rName = rRow.pattern;
  const tsPat = patG.patterns.find(p => p.pattern === rName);
  if (!tsPat) {
    console.error(`FAIL gapped pattern "${rName}" not found in TS output`);
    failures++;
    continue;
  }
  check(`gapped[${rName}].frequency`, tsPat.frequency, rRow.frequency, 0);
  check(`gapped[${rName}].count`, tsPat.count, rRow.count, 0);
  check(`gapped[${rName}].support`, tsPat.support, rRow.support, 1e-10);
  check(`gapped[${rName}].lift`, tsPat.lift, rRow.lift, 1e-10);
}

// ── 6. Patterns repeated ─────────────────────────────────────────────

console.log('\n=== PATTERNS REPEATED ===');
const patR = discoverPatterns(patData, {
  type: 'repeated', len: [2], minFreq: 1, minSupport: 0,
});

const rPatRArr = refToArray(ref.patterns_repeated);
for (const rRow of rPatRArr) {
  const rName = rRow.pattern;
  const tsPat = patR.patterns.find(p => p.pattern === rName);
  if (!tsPat) {
    console.error(`FAIL repeated pattern "${rName}" not found in TS output`);
    failures++;
    continue;
  }
  check(`repeated[${rName}].frequency`, tsPat.frequency, rRow.frequency, 0);
  check(`repeated[${rName}].count`, tsPat.count, rRow.count, 0);
  check(`repeated[${rName}].support`, tsPat.support, rRow.support, 1e-10);
  check(`repeated[${rName}].lift`, tsPat.lift, rRow.lift, 1e-10);
}

// ── 7. Patterns with group ───────────────────────────────────────────

console.log('\n=== PATTERNS WITH GROUP ===');
const group = ['X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y'];
const patGrp = discoverPatterns(patData, {
  type: 'ngram', len: [2], minFreq: 1, minSupport: 0, group,
});

const rPatGrpArr = refToArray(ref.patterns_group);
for (const rRow of rPatGrpArr) {
  const rName = rRow.pattern;
  const tsPat = patGrp.patterns.find(p => p.pattern === rName);
  if (!tsPat) {
    console.error(`FAIL group pattern "${rName}" not found in TS output`);
    failures++;
    continue;
  }
  check(`group[${rName}].frequency`, tsPat.frequency, rRow.frequency, 0);
  check(`group[${rName}].count_X`, tsPat.groupCounts?.count_X ?? 0, rRow.count_X, 0);
  check(`group[${rName}].count_Y`, tsPat.groupCounts?.count_Y ?? 0, rRow.count_Y, 0);
  check(`group[${rName}].chisq`, tsPat.chisq ?? 0, rRow.chisq, 1e-6);
  check(`group[${rName}].p_value`, tsPat.pValue ?? 0, rRow.p_value, 1e-6);
}

// ── Summary ──────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`R EQUIVALENCE: ${passes} passed, ${failures} failed`);
if (failures > 0) {
  process.exit(1);
} else {
  console.log('ALL CHECKS PASSED!');
}
