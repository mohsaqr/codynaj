/** Prepared sequence data: integer-coded matrix + alphabet mapping */
export interface SequenceData {
  /** Integer-coded sequences (1-based into alphabet, NaN for missing) */
  sequences: number[][];
  /** Sorted unique non-null states */
  alphabet: string[];
}

/** Result of convert() */
export type ConvertResult = FrequencyResult | EdgeListResult;

export interface FrequencyResult {
  /** Row identifiers (1-based) */
  ids: number[];
  /** State names (column headers) */
  states: string[];
  /** Count or 0/1 matrix [nRows x nStates] */
  matrix: number[][];
}

export interface EdgeListEntry {
  id: number;
  from: string;
  to: string;
}

export interface ReverseEdgeListEntry {
  id: number;
  state: string;
  previous: string;
}

export type EdgeListResult = EdgeListEntry[];
export type ReverseEdgeListResult = ReverseEdgeListEntry[];

/** Run-length encoding result */
export interface RLEResult {
  values: number[];
  lengths: number[];
}

/** Per-sequence index result */
export interface IndexResult {
  validN: number;
  validProportion: number;
  uniqueStates: number;
  meanSpellDuration: number;
  maxSpellDuration: number;
  longitudinalEntropy: number;
  simpsonDiversity: number;
  selfLoopTendency: number;
  transitionRate: number;
  transitionComplexity: number;
  initialStatePersistence: number;
  initialStateProportion: number;
  initialStateInfluenceDecay: number;
  cyclicFeedbackStrength: number;
  firstState: string;
  lastState: string;
  dominantState: string;
  dominantProportion: number;
  dominantMaxSpell: number;
  emergentState: string | null;
  emergentStatePersistence: number | null;
  emergentStateProportion: number | null;
  integrativePotential?: number;
  complexityIndex: number;
}

/** Options for sequenceIndices */
export interface IndicesOptions {
  /** States considered favorable for integrative potential */
  favorable?: string[];
  /** Omega parameter for integrative potential weighting (default 1.0) */
  omega?: number;
}

/** Single pattern entry in discovery results */
export interface PatternEntry {
  pattern: string;
  length: number;
  frequency: number;
  proportion: number;
  count: number;
  support: number;
  lift: number;
  /** Per-group counts (keys are "count_<groupLabel>") */
  groupCounts?: Record<string, number>;
  chisq?: number;
  pValue?: number;
}

/** Options for discoverPatterns */
export interface DiscoverOptions {
  type?: 'ngram' | 'gapped' | 'repeated';
  pattern?: string;
  len?: number[];
  gap?: number[];
  minFreq?: number;
  minSupport?: number;
  start?: string[];
  end?: string[];
  contain?: string[];
  group?: string[] | null;
}

/** Result from discoverPatterns */
export interface PatternResult {
  patterns: PatternEntry[];
  /** Internal raw pattern matrices (used by analyzeOutcome) */
  _raw: RawPatterns[];
}

/** Internal: raw pattern matrix from extraction */
export interface RawPatterns {
  /** Count matrix [nSequences x nUniquePatterns] */
  matrix: number[][];
  /** Unique pattern labels */
  unique: string[];
  /** Pattern length */
  length: number;
}

/** Options for analyzeOutcome */
export interface OutcomeOptions {
  outcome: string[] | 'lastObs';
  reference?: string;
  n?: number;
  freq?: boolean;
  priority?: string;
  desc?: boolean;
  type?: 'ngram' | 'gapped' | 'repeated';
  len?: number[];
  gap?: number[];
  minFreq?: number;
  minSupport?: number;
  start?: string[];
  end?: string[];
  contain?: string[];
}

/** Logistic regression result from analyzeOutcome */
export interface OutcomeResult {
  coefficients: OutcomeCoefficient[];
  pseudoR2: number;
  aic: number;
  bic: number;
  n: number;
  patternsUsed: string[];
}

export interface OutcomeCoefficient {
  name: string;
  estimate: number;
  se: number;
  zValue: number;
  pValue: number;
  ci: [number, number];
}
