export type {
  SequenceData,
  ConvertResult,
  FrequencyResult,
  EdgeListEntry,
  EdgeListResult,
  ReverseEdgeListEntry,
  ReverseEdgeListResult,
  RLEResult,
  IndexResult,
  IndicesOptions,
  PatternEntry,
  DiscoverOptions,
  PatternResult,
  RawPatterns,
  OutcomeOptions,
  OutcomeResult,
  OutcomeCoefficient,
} from './types';

export { prepareSequenceData, rle, extractLast } from './prepare';
export { convert } from './convert';
