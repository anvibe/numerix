import { ExtractedNumbers, GameStatistics, GameType, LottoWheel, UnsuccessfulCombination, Frequency } from '../types';
import { GAMES, LOTTO_WHEELS } from './constants';
import { calculateAdvancedStatistics } from './advancedStatistics';

// Calculate number frequencies from extractions
export const calculateFrequencies = (
  extractions: ExtractedNumbers[],
  maxNumber: number,
  wheel?: LottoWheel
): { frequentNumbers: any[]; infrequentNumbers: any[] } => {
  const counts = new Array(maxNumber + 1).fill(0);
  let totalExtractions = extractions.length;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[calculateFrequencies] Processing ${totalExtractions} extractions${wheel ? ` for wheel ${wheel}` : ''}`);
  }

  extractions.forEach((extraction) => {
    const numbers = wheel && extraction.wheels 
      ? extraction.wheels[wheel]
      : extraction.numbers;
      
    numbers.forEach((num) => {
      counts[num]++;
    });
  });

  const frequencies = counts
    .map((count, number) => {
      if (number === 0) return null;
      return {
        number,
        count,
        percentage: (count / totalExtractions) * 100,
      };
    })
    .filter(Boolean);

  const sortedFrequencies = [...frequencies].sort((a, b) => b.count - a.count);

  return {
    frequentNumbers: sortedFrequencies.slice(0, 10),
    infrequentNumbers: [...sortedFrequencies].reverse().slice(0, 10),
  };
};

// Calculate delays for each number
export const calculateDelays = (
  extractions: ExtractedNumbers[],
  maxNumber: number,
  wheel?: LottoWheel
): any[] => {
  const lastSeen = new Array(maxNumber + 1).fill(-1);
  const currentExtraction = 0;

  // Find the last extraction each number appeared in
  extractions.forEach((extraction, index) => {
    const numbers = wheel && extraction.wheels 
      ? extraction.wheels[wheel]
      : extraction.numbers;
      
    numbers.forEach((num) => {
      if (lastSeen[num] === -1) {
        lastSeen[num] = index;
      }
    });
  });

  // Calculate delay for each number
  const delays = lastSeen
    .map((lastIndex, number) => {
      if (number === 0 || lastIndex === -1) return null;
      return {
        number,
        delay: lastIndex,
      };
    })
    .filter(Boolean);

  return delays.sort((a, b) => b.delay - a.delay).slice(0, 10);
};

// Calculate unlucky number statistics from unsuccessful combinations
export const calculateUnluckyStatistics = (
  unsuccessfulCombinations: UnsuccessfulCombination[],
  gameType: GameType,
  maxNumber: number,
  wheel?: LottoWheel
): { unluckyNumbers: Frequency[]; unluckyPairs: { pair: [number, number]; count: number }[] } => {
  // Filter combinations for the specific game type and wheel
  const relevantCombinations = unsuccessfulCombinations.filter(combo => {
    if (combo.gameType !== gameType) return false;
    if (wheel && combo.wheel !== wheel) return false;
    if (!wheel && combo.wheel) return false; // For non-lotto games, exclude wheel-specific combinations
    return true;
  });

  if (relevantCombinations.length === 0) {
    return { unluckyNumbers: [], unluckyPairs: [] };
  }

  // Calculate unlucky number frequencies
  const unluckyCounts = new Array(maxNumber + 1).fill(0);
  const pairCounts = new Map<string, number>();

  relevantCombinations.forEach((combo) => {
    combo.numbers.forEach((num) => {
      unluckyCounts[num]++;
    });

    // Calculate pairs
    for (let i = 0; i < combo.numbers.length; i++) {
      for (let j = i + 1; j < combo.numbers.length; j++) {
        const pair = [combo.numbers[i], combo.numbers[j]].sort((a, b) => a - b);
        const pairKey = `${pair[0]}-${pair[1]}`;
        pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
      }
    }
  });

  // Convert to frequency objects
  const unluckyNumbers: Frequency[] = unluckyCounts
    .map((count, number) => {
      if (number === 0 || count === 0) return null;
      return {
        number,
        count,
        percentage: (count / relevantCombinations.length) * 100,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Convert pairs to array and sort by frequency
  const unluckyPairs = Array.from(pairCounts.entries())
    .map(([pairKey, count]) => {
      const [num1, num2] = pairKey.split('-').map(Number);
      return {
        pair: [num1, num2] as [number, number],
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { unluckyNumbers, unluckyPairs };
};

// Calculate game statistics with advanced statistics
export const calculateGameStatistics = (
  gameType: GameType,
  extractionsData: Record<GameType, ExtractedNumbers[]>,
  unsuccessfulCombinations: UnsuccessfulCombination[] = []
): GameStatistics => {
  const extractions = extractionsData[gameType];
  const game = GAMES.find(g => g.id === gameType) || GAMES[0];
  
  if (gameType === 'lotto') {
    // Calculate statistics for each wheel
    const wheelStats: Record<LottoWheel, {
      frequentNumbers: any[];
      infrequentNumbers: any[];
      delays: any[];
      unluckyNumbers?: Frequency[];
      unluckyPairs?: { pair: [number, number]; count: number }[];
    }> = {} as any;
    
    LOTTO_WHEELS.forEach(wheel => {
      const { frequentNumbers, infrequentNumbers } = calculateFrequencies(
        extractions,
        game.maxNumber,
        wheel
      );
      
      const delays = calculateDelays(extractions, game.maxNumber, wheel);
      const { unluckyNumbers, unluckyPairs } = calculateUnluckyStatistics(
        unsuccessfulCombinations,
        gameType,
        game.maxNumber,
        wheel
      );
      
      wheelStats[wheel] = {
        frequentNumbers,
        infrequentNumbers,
        delays,
        unluckyNumbers,
        unluckyPairs
      };
    });
    
    // Calculate advanced statistics for Bari (default wheel)
    const unsuccessfulForWheel = unsuccessfulCombinations.filter(
      combo => combo.gameType === gameType && (!combo.wheel || combo.wheel === 'Bari')
    );
    
    const advancedStats = extractions.length > 0 ? calculateAdvancedStatistics(
      gameType,
      extractions,
      unsuccessfulForWheel,
      game.maxNumber,
      game.numbersToSelect
    ) : undefined;
    
    // Use Bari's stats as default
    return {
      frequentNumbers: wheelStats.Bari.frequentNumbers,
      infrequentNumbers: wheelStats.Bari.infrequentNumbers,
      delays: wheelStats.Bari.delays,
      unluckyNumbers: wheelStats.Bari.unluckyNumbers,
      unluckyPairs: wheelStats.Bari.unluckyPairs,
      wheelStats,
      advancedStatistics: advancedStats
    };
  }
  
  const { frequentNumbers, infrequentNumbers } = calculateFrequencies(
    extractions,
    game.maxNumber
  );
  
  const delays = calculateDelays(extractions, game.maxNumber);
  const { unluckyNumbers, unluckyPairs } = calculateUnluckyStatistics(
    unsuccessfulCombinations,
    gameType,
    game.maxNumber
  );
  
  // Calculate advanced statistics
  const advancedStats = extractions.length > 0 ? calculateAdvancedStatistics(
    gameType,
    extractions,
    unsuccessfulCombinations.filter(combo => combo.gameType === gameType),
    game.maxNumber,
    game.numbersToSelect
  ) : undefined;
  
  return {
    frequentNumbers,
    infrequentNumbers,
    delays,
    unluckyNumbers,
    unluckyPairs,
    advancedStatistics: advancedStats
  };
};

// Mock extraction data for each game
export const MOCK_EXTRACTIONS: Record<GameType, ExtractedNumbers[]> = {
  superenalotto: [], // Will be populated with real data
  lotto: [], // Will be populated with CSV data
  '10elotto': [], // Will be populated with real data
  millionday: [], // Will be populated with real data
};

// Generate initial statistics for each game
export const MOCK_STATISTICS: Record<GameType, GameStatistics> = {
  superenalotto: calculateGameStatistics('superenalotto', MOCK_EXTRACTIONS, []),
  lotto: calculateGameStatistics('lotto', MOCK_EXTRACTIONS, []),
  '10elotto': calculateGameStatistics('10elotto', MOCK_EXTRACTIONS, []),
  millionday: calculateGameStatistics('millionday', MOCK_EXTRACTIONS, []),
};