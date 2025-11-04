export type GameType = 'superenalotto' | 'lotto' | '10elotto' | 'millionday';

export type LottoWheel = 'Bari' | 'Cagliari' | 'Firenze' | 'Genova' | 'Milano' | 
                        'Napoli' | 'Palermo' | 'Roma' | 'Torino' | 'Venezia' | 'Nazionale';

export interface Game {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
  numbersToSelect: number;
  maxNumber: number;
  wheels?: LottoWheel[];
}

export interface ExtractedNumbers {
  date: string;
  numbers: number[];
  wheels?: Record<LottoWheel, number[]>;
  jolly?: number;
  superstar?: number;
}

export interface Frequency {
  number: number;
  count: number;
  percentage: number;
}

export interface Delay {
  number: number;
  delay: number;
}

export interface GeneratedCombination {
  id: string;
  gameType: GameType;
  numbers: number[];
  date: string;
  strategy: 'standard' | 'high-variability';
  wheel?: LottoWheel;
  jolly?: number;
  superstar?: number;
  isAI?: boolean;
  isAdvancedAI?: boolean;
}

export interface UnsuccessfulCombination {
  id: string;
  gameType: GameType;
  numbers: number[];
  dateAdded: string;
  drawDate?: string;
  wheel?: LottoWheel;
  jolly?: number;
  superstar?: number;
  strategy?: 'standard' | 'high-variability' | 'ai' | 'ai-advanced' | 'manual';
  notes?: string;
}

export interface WinningAnalysis {
  totalMatches: number;
  matchDetails: {
    extractionDate: string;
    matchedNumbers: number[];
    matchCount: number;
    wheel?: LottoWheel;
  }[];
  missedOpportunities: {
    extractionDate: string;
    winningNumbers: number[];
    yourNumbers: number[];
    nearMisses: number; // How many numbers were close to winning
    wheel?: LottoWheel;
  }[];
  frequencyAnalysis: {
    yourFrequentNumbers: Frequency[];
    winningFrequentNumbers: Frequency[];
    overlapAnalysis: {
      number: number;
      yourFrequency: number;
      winningFrequency: number;
      efficiency: number; // How often your frequent numbers actually win
    }[];
  };
}

export interface NearMissMatch {
  number: number;
  type: 'exact' | 'off-by-one';
  winningNumber?: number; // Only for off-by-one matches
}

export interface NearMissResult {
  savedCombination: GeneratedCombination;
  extractionDate: string;
  winningNumbers: number[];
  matches: NearMissMatch[];
  exactMatches: number;
  offByOneMatches: number;
  totalScore: number; // Combined score for ranking
  wheel?: LottoWheel;
}

export interface NearMissAnalysis {
  nearMisses: NearMissResult[];
  totalAnalyzed: number;
  criteriaUsed: string;
}

export interface GameStatistics {
  frequentNumbers: Frequency[];
  infrequentNumbers: Frequency[];
  delays: Delay[];
  unluckyNumbers?: Frequency[];
  unluckyPairs?: { pair: [number, number]; count: number }[];
  wheelStats?: Record<LottoWheel, {
    frequentNumbers: Frequency[];
    infrequentNumbers: Frequency[];
    delays: Delay[];
    unluckyNumbers?: Frequency[];
    unluckyPairs?: { pair: [number, number]; count: number }[];
  }>;
}