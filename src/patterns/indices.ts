import type { IndexResult, IndicesOptions } from '../core/types';
import { prepareSequenceData, rle } from '../core/prepare';

/**
 * Compute per-sequence transition count arrays.
 * Returns trans[i][from][to] counts for each sequence i.
 */
export function computeTransitions(
  sequences: number[][],
  a: number,
): number[][][] {
  const n = sequences.length;
  const k = sequences[0]?.length ?? 0;
  // Allocate 3D array [n][a][a] initialized to 0
  const trans: number[][][] = [];
  for (let i = 0; i < n; i++) {
    const mat: number[][] = [];
    for (let r = 0; r < a; r++) {
      mat.push(new Array(a).fill(0) as number[]);
    }
    trans.push(mat);
  }

  for (let t = 0; t < k - 1; t++) {
    for (let i = 0; i < n; i++) {
      const from = sequences[i]![t]!;
      const to = sequences[i]![t + 1]!;
      if (!isNaN(from) && !isNaN(to)) {
        trans[i]![from - 1]![to - 1]!++;
      }
    }
  }

  return trans;
}

/**
 * Compute cyclic feedback strength: max over lags of state recurrence proportion.
 * Matches R cyclic_strength().
 */
export function cyclicStrength(
  sequences: number[][],
  n: number,
  k: number,
  lastObs: number[],
): number[] {
  const maxStr = new Array(n).fill(0) as number[];

  for (let lag = 2; lag <= k - 1; lag++) {
    const strength = new Array(n).fill(0) as number[];
    for (let j = 0; j < k - lag; j++) {
      for (let i = 0; i < n; i++) {
        const from = sequences[i]![j]!;
        const to = sequences[i]![j + lag]!;
        if (!isNaN(from) && !isNaN(to) && from === to) {
          strength[i]!++;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      // lastObs is 0-based; R uses 1-based last_obs, so add 1
      const lo = lastObs[i]! + 1;
      if (lo > lag) {
        strength[i] = strength[i]! / (lo - lag);
        if (strength[i]! > maxStr[i]!) {
          maxStr[i] = strength[i]!;
        }
      }
    }
  }

  return maxStr;
}

/**
 * Compute 24 per-sequence structural indices.
 * Matches R sequence_indices_().
 *
 * @param data Wide-format string matrix
 * @param options Optional: favorable states, omega
 */
export function sequenceIndices(
  data: (string | null | undefined)[][],
  options?: IndicesOptions,
): IndexResult[] {
  const prepared = prepareSequenceData(data);
  const { sequences, alphabet } = prepared;
  const a = alphabet.length;
  const n = sequences.length;
  const k = sequences[0]?.length ?? 0;

  const trans = computeTransitions(sequences, a);

  const fav: number[] = [];
  if (options?.favorable) {
    for (const f of options.favorable) {
      const idx = alphabet.indexOf(f);
      if (idx >= 0) fav.push(idx + 1);
    }
  }
  const omega = options?.omega ?? 1.0;

  // Count unique values across entire matrix (for entropy normalization)
  // R counts NA as a unique value: u_vals <- length(unique(c(m)))
  const allVals = new Set<number>();
  let hasNaN = false;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      const v = sequences[i]![j]!;
      if (isNaN(v)) { hasNaN = true; }
      else { allVals.add(v); }
    }
  }
  const uVals = allVals.size + (hasNaN ? 1 : 0);

  // Find last non-NaN observation per row (0-based column index)
  const lastObs: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let last = 0;
    for (let j = 0; j < k; j++) {
      if (!isNaN(sequences[i]![j]!)) last = j;
    }
    lastObs[i] = last;
  }

  const cyclic = cyclicStrength(sequences, n, k, lastObs);

  const results: IndexResult[] = [];

  for (let i = 0; i < n; i++) {
    const row = sequences[i]!;
    const p = lastObs[i]! + 1; // 1-based count to last obs (matches R's last_obs)

    // valid count
    let validN = 0;
    for (let j = 0; j < k; j++) {
      if (!isNaN(row[j]!)) validN++;
    }

    // State frequencies using tabulate (1-based, length = max possible value = a)
    const freq = new Array(a).fill(0) as number[];
    for (let j = 0; j < k; j++) {
      const v = row[j]!;
      if (!isNaN(v)) freq[v - 1]!++;
    }
    const prop = freq.map(f => f / validN);

    // RLE for spells
    const runs = rle(row);
    const obsValues: number[] = [];
    const obsSpells: number[] = [];
    for (let j = 0; j < runs.values.length; j++) {
      if (!isNaN(runs.values[j]!)) {
        obsValues.push(runs.values[j]!);
        obsSpells.push(runs.lengths[j]!);
      }
    }

    const meanSpell = obsSpells.length > 0
      ? obsSpells.reduce((s, v) => s + v, 0) / obsSpells.length
      : 0;
    const maxSpell = obsSpells.length > 0
      ? Math.max(...obsSpells)
      : 0;

    // unique states
    let uStates = 0;
    for (let j = 0; j < a; j++) {
      if (freq[j]! > 0) uStates++;
    }

    // Longitudinal entropy: -sum(p * ln(p)) / ln(uVals)
    let longEnt = 0;
    for (let j = 0; j < a; j++) {
      if (prop[j]! > 0) {
        longEnt -= prop[j]! * Math.log(prop[j]!);
      }
    }
    longEnt = uVals > 1 ? longEnt / Math.log(uVals) : 0;

    // Simpson diversity: 1 - sum(p^2)
    let simpson = 0;
    for (let j = 0; j < a; j++) {
      simpson += prop[j]! * prop[j]!;
    }
    simpson = 1.0 - simpson;

    // Self-loop tendency
    const transMat = trans[i]!;
    let self = 0;
    for (let j = 0; j < a; j++) {
      self += transMat[j]![j]!;
    }
    let total = 0;
    for (let r = 0; r < a; r++) {
      for (let c = 0; c < a; c++) {
        total += transMat[r]![c]!;
      }
    }
    const loops = total > 0 ? self / total : 0;

    // Transition rate: (total - self) / (validN - 1)
    const rate = validN > 1 ? (total - self) / (validN - 1) : 0;

    // Transition complexity: non-self transitions with count > 0 / a*(a-1)
    let nonSelfUsed = 0;
    let nonSelfTotal = 0;
    for (let r = 0; r < a; r++) {
      for (let c = 0; c < a; c++) {
        if (r !== c) {
          nonSelfTotal++;
          if (transMat[r]![c]! > 0) nonSelfUsed++;
        }
      }
    }
    const transComp = a > 1 ? nonSelfUsed / (a * (a - 1)) : 0;

    // Initial state persistence
    const initState = row[0]!;
    let initPer: number;
    // Find first position where row differs from initial state or is NA
    let firstDiff = -1;
    for (let j = 1; j < k; j++) {
      if (isNaN(row[j]!) || row[j] !== initState) {
        firstDiff = j;
        break;
      }
    }
    if (firstDiff === -1) {
      initPer = 1.0;
    } else {
      initPer = firstDiff / p;
    }

    // Initial state proportion
    const initProp = !isNaN(initState) ? prop[initState - 1]! : 0;

    // Initial state influence decay: early_prop - late_prop
    const firstThirdEnd = Math.ceil(p / 3);
    const lastThirdStart = Math.ceil(2 * p / 3);
    let earlyCount = 0;
    let earlyTotal = 0;
    for (let j = 0; j < firstThirdEnd; j++) {
      earlyTotal++;
      if (!isNaN(row[j]!) && row[j] === initState) earlyCount++;
    }
    let lateCount = 0;
    let lateTotal = 0;
    for (let j = lastThirdStart - 1; j < p; j++) {
      lateTotal++;
      if (!isNaN(row[j]!) && row[j] === initState) lateCount++;
    }
    const early = earlyTotal > 0 ? earlyCount / earlyTotal : 0;
    const late = lateTotal > 0 ? lateCount / lateTotal : 0;
    const initDecay = early - late;

    // First and last state
    const firstState = !isNaN(initState) ? alphabet[initState - 1]! : '';
    const lastState = !isNaN(row[lastObs[i]!]!)
      ? alphabet[row[lastObs[i]!]! - 1]!
      : '';

    // Dominant state
    let domIdx = 0;
    let domFreq = freq[0]!;
    for (let j = 1; j < a; j++) {
      if (freq[j]! > domFreq) {
        domIdx = j;
        domFreq = freq[j]!;
      }
    }
    const domState = alphabet[domIdx]!;
    const domProp = prop[domIdx]!;

    // Dominant max spell
    let domSpell = 0;
    for (let j = 0; j < obsValues.length; j++) {
      if (obsValues[j] === domIdx + 1 && obsSpells[j]! > domSpell) {
        domSpell = obsSpells[j]!;
      }
    }

    // Emergent state detection
    let emergentState: string | null = null;
    let emergentPer: number | null = null;
    let emergentProp: number | null = null;

    const persisting = obsSpells.filter(s => s >= 3);
    if (persisting.length > 0) {
      // True emergent: spell >= 3 AND spell > domSpell
      let trueState = 0;
      let trueSpell = 0;
      for (let j = 0; j < obsValues.length; j++) {
        if (obsSpells[j]! >= 3 && obsSpells[j]! > domSpell) {
          if (obsSpells[j]! > trueSpell) {
            trueState = obsValues[j]!;
            trueSpell = obsSpells[j]!;
          }
        }
      }

      // Dom emergent: domSpell >= 3 AND dominant != initial
      const domEmergent = domSpell >= 3 && (domIdx + 1) !== initState;

      // Init emergent: max spell of initial state after first spell > init_spell/2 AND >= 3
      const initSpellLen = obsSpells.length > 0 ? obsSpells[0]! : 0;
      let maxInitSpell = 0;
      for (let j = 1; j < obsValues.length; j++) {
        if (obsValues[j] === initState && obsSpells[j]! > maxInitSpell) {
          maxInitSpell = obsSpells[j]!;
        }
      }
      const initEmergent = maxInitSpell * 2 > initSpellLen && maxInitSpell >= 3;

      const candidates = [trueState, domIdx + 1, initState];
      const spellsCandidates = [
        trueSpell,
        domEmergent ? domSpell : 0,
        initEmergent ? maxInitSpell : 0,
      ];

      // Find max
      let maxVal = 0;
      let maxIdx = -1;
      for (let j = 0; j < 3; j++) {
        if (spellsCandidates[j]! > maxVal) {
          maxVal = spellsCandidates[j]!;
          maxIdx = j;
        }
      }
      if (maxIdx >= 0 && maxVal > 0) {
        const cand = candidates[maxIdx]!;
        emergentState = !isNaN(cand) ? alphabet[cand - 1]! : null;
        emergentPer = maxVal;
        emergentProp = !isNaN(cand) ? prop[cand - 1]! : null;
      }
    }

    // Complexity index: 0.4 * norm_ent + 0.4 * trans_density + 0.2 * spell_CV
    // norm_ent = longEnt / log(a)  (R uses log(a) not log2)
    const normEnt = a > 1 ? longEnt / Math.log(a) : 0;
    // Note: R uses longEnt / log(a) where longEnt = -sum(p*log(p))/log(uVals)
    // So normEnt = (-sum(p*log(p))/log(uVals)) / log(a)
    // R code: 0.4 * (long_ent[i] / log(a))
    // long_ent uses log() not log2()

    // trans_density = sum(non-self transitions) / (p - 1)
    let nonSelfSum = 0;
    for (let r = 0; r < a; r++) {
      for (let c = 0; c < a; c++) {
        if (r !== c) nonSelfSum += transMat[r]![c]!;
      }
    }
    const transDensity = p > 1 ? nonSelfSum / (p - 1) : 0;

    // spell_CV = min(sd(spells) / mean(spells), 1.0)
    // R's sd() returns NA for single-value vectors → propagates to compIdx
    let spellCV: number;
    if (obsSpells.length <= 1) {
      spellCV = NaN; // matches R: sd(single_value) = NA
    } else if (meanSpell > 0) {
      let sumSq = 0;
      for (const s of obsSpells) {
        sumSq += (s - meanSpell) * (s - meanSpell);
      }
      const spellSd = Math.sqrt(sumSq / (obsSpells.length - 1));
      spellCV = Math.min(spellSd / meanSpell, 1.0);
    } else {
      spellCV = 0;
    }

    // NaN propagates: if spellCV is NaN, compIdx is NaN (matches R)
    const compIdx = 0.4 * normEnt + 0.4 * transDensity + 0.2 * spellCV;

    // Integrative potential
    let intPot: number | undefined;
    if (fav.length > 0) {
      let sumW = 0;
      let sumPosW = 0;
      const favSet = new Set(fav);
      for (let j = 0; j < p; j++) {
        const w = Math.pow(j + 1, omega);
        sumW += w;
        if (!isNaN(row[j]!) && favSet.has(row[j]!)) {
          sumPosW += w;
        }
      }
      intPot = sumW > 0 ? sumPosW / sumW : 0;
    }

    const result: IndexResult = {
      validN,
      validProportion: validN / p,
      uniqueStates: uStates,
      meanSpellDuration: meanSpell,
      maxSpellDuration: maxSpell,
      longitudinalEntropy: longEnt,
      simpsonDiversity: simpson,
      selfLoopTendency: loops,
      transitionRate: rate,
      transitionComplexity: transComp,
      initialStatePersistence: initPer,
      initialStateProportion: initProp,
      initialStateInfluenceDecay: initDecay,
      cyclicFeedbackStrength: cyclic[i]!,
      firstState,
      lastState,
      dominantState: domState,
      dominantProportion: domProp,
      dominantMaxSpell: domSpell,
      emergentState,
      emergentStatePersistence: emergentPer,
      emergentStateProportion: emergentProp,
      complexityIndex: compIdx,
    };
    if (intPot !== undefined) {
      result.integrativePotential = intPot;
    }

    results.push(result);
  }

  return results;
}
