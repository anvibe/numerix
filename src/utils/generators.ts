import { GameType, Game, GameStatistics, LottoWheel } from '../types';
import { GAMES } from './constants';
import { 
  calculateAdvancedStatistics, 
  generateAdvancedCombination,
  calculateOptimalCombination,
  calculateDistributionAnalysis,
  calculatePatternScore,
  calculateOptimalDistribution
} from './advancedStatistics';

// Get game configuration by type
export const getGameByType = (gameType: GameType): Game => {
  return GAMES.find((game) => game.id === gameType) || GAMES[0];
};

// Utility to generate random number between min and max (inclusive)
const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Utility to generate a unique number that's not in the exclusion list
const generateUniqueNumberExcluding = (min: number, max: number, exclude: number[]): number => {
  let number: number;
  do {
    number = getRandomNumber(min, max);
  } while (exclude.includes(number));
  return number;
};

// Utility to check if a set of numbers contains a sequence
const hasConsecutiveSequence = (numbers: number[], sequenceLength: number = 3): boolean => {
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  
  for (let i = 0; i <= sortedNumbers.length - sequenceLength; i++) {
    let isSequence = true;
    for (let j = 0; j < sequenceLength - 1; j++) {
      if (sortedNumbers[i + j + 1] !== sortedNumbers[i + j] + 1) {
        isSequence = false;
        break;
      }
    }
    if (isSequence) return true;
  }
  
  return false;
};

// Check if a number is considered "unlucky" based on statistics
const isUnluckyNumber = (number: number, statistics: GameStatistics): boolean => {
  if (!statistics.unluckyNumbers || statistics.unluckyNumbers.length === 0) {
    return false;
  }
  
  // Consider a number unlucky if it appears in the top 5 unlucky numbers
  // and has appeared in more than 20% of unsuccessful combinations
  const unluckyNumber = statistics.unluckyNumbers.find(un => un.number === number);
  return unluckyNumber ? unluckyNumber.percentage > 20 : false;
};

// Check if a pair of numbers is considered "unlucky" based on statistics
const hasUnluckyPair = (numbers: number[], statistics: GameStatistics): boolean => {
  if (!statistics.unluckyPairs || statistics.unluckyPairs.length === 0) {
    return false;
  }
  
  // Check if any pair in the numbers appears in the top unlucky pairs
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      const pair = [numbers[i], numbers[j]].sort((a, b) => a - b);
      const isUnlucky = statistics.unluckyPairs.some(up => 
        up.pair[0] === pair[0] && up.pair[1] === pair[1] && up.count >= 3
      );
      if (isUnlucky) return true;
    }
  }
  
  return false;
};

/**
 * Apply balance criteria to improve combination quality:
 * 1. Even/Odd balance: 2/4 or 3/3, avoid 0/6 or 6/0
 * 2. High/Low balance: mix numbers from both halves (1-45 and 46-90 for SuperEnalotto)
 * 3. Decade distribution: max 2 numbers per decade
 */
const applyBalanceCriteria = (
  combination: number[],
  maxNumber: number,
  numbersToSelect: number
): number[] => {
  let improved = [...combination];
  const sorted = [...improved].sort((a, b) => a - b);
  const maxAttempts = 50;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    let needsImprovement = false;

    // 1. Check Even/Odd balance (avoid 0/6 or 6/0, prefer 2/4 or 3/3)
    const evenCount = sorted.filter(n => n % 2 === 0).length;
    const oddCount = sorted.length - evenCount;
    if (evenCount === 0 || oddCount === 0) {
      if (evenCount === 0) {
        // All odd, need to add an even number
        const oddToReplace = sorted[Math.floor(Math.random() * sorted.length)];
        const candidates = [];
        for (let i = 2; i <= maxNumber; i += 2) {
          if (!sorted.includes(i) && i !== oddToReplace) {
            candidates.push(i);
          }
        }
        if (candidates.length > 0) {
          const newEven = candidates[Math.floor(Math.random() * candidates.length)];
          improved = sorted.filter(n => n !== oddToReplace).concat(newEven);
          needsImprovement = true;
        }
      } else if (oddCount === 0) {
        // All even, need to add an odd number
        const evenToReplace = sorted[Math.floor(Math.random() * sorted.length)];
        const candidates = [];
        for (let i = 1; i <= maxNumber; i += 2) {
          if (!sorted.includes(i) && i !== evenToReplace) {
            candidates.push(i);
          }
        }
        if (candidates.length > 0) {
          const newOdd = candidates[Math.floor(Math.random() * candidates.length)];
          improved = sorted.filter(n => n !== evenToReplace).concat(newOdd);
          needsImprovement = true;
        }
      }
    }

    // 2. Check High/Low balance (for SuperEnalotto: 1-45 low, 46-90 high)
    if (maxNumber === 90) {
      const midpoint = 45;
      const lowCount = sorted.filter(n => n <= midpoint).length;
      const highCount = sorted.filter(n => n > midpoint).length;
      
      if (lowCount === 0 || highCount === 0) {
        if (lowCount === 0) {
          // All high, need to add a low number
          const highToReplace = sorted[Math.floor(Math.random() * sorted.length)];
          const candidates = [];
          for (let i = 1; i <= midpoint; i++) {
            if (!sorted.includes(i) && i !== highToReplace) {
              candidates.push(i);
            }
          }
          if (candidates.length > 0) {
            const newLow = candidates[Math.floor(Math.random() * candidates.length)];
            improved = sorted.filter(n => n !== highToReplace).concat(newLow);
            needsImprovement = true;
          }
        } else if (highCount === 0) {
          // All low, need to add a high number
          const lowToReplace = sorted[Math.floor(Math.random() * sorted.length)];
          const candidates = [];
          for (let i = midpoint + 1; i <= maxNumber; i++) {
            if (!sorted.includes(i) && i !== lowToReplace) {
              candidates.push(i);
            }
          }
          if (candidates.length > 0) {
            const newHigh = candidates[Math.floor(Math.random() * candidates.length)];
            improved = sorted.filter(n => n !== lowToReplace).concat(newHigh);
            needsImprovement = true;
          }
        }
      }
    }

    // 3. Check decade distribution (max 2 numbers per decade)
    const decades = Array(9).fill(0);
    sorted.forEach(num => {
      const decade = Math.floor((num - 1) / 10);
      if (decade >= 0 && decade < 9) {
        decades[decade]++;
      }
    });
    
    const overloadedDecades: number[] = [];
    decades.forEach((count, decade) => {
      if (count > 2) {
        overloadedDecades.push(decade);
      }
    });

    if (overloadedDecades.length > 0) {
      const overloadedDecade = overloadedDecades[0];
      const numbersInDecade = sorted.filter(n => {
        const d = Math.floor((n - 1) / 10);
        return d === overloadedDecade;
      });
      
      if (numbersInDecade.length > 0) {
        const toReplace = numbersInDecade[Math.floor(Math.random() * numbersInDecade.length)];
        const underloadedDecades: number[] = [];
        decades.forEach((count, d) => {
          if (count < 2 && d !== overloadedDecade) {
            underloadedDecades.push(d);
          }
        });
        
        if (underloadedDecades.length > 0) {
          const targetDecade = underloadedDecades[Math.floor(Math.random() * underloadedDecades.length)];
          const minInDecade = targetDecade * 10 + 1;
          const maxInDecade = Math.min((targetDecade + 1) * 10, maxNumber);
          const candidates = [];
          for (let i = minInDecade; i <= maxInDecade; i++) {
            if (!sorted.includes(i) && i !== toReplace) {
              candidates.push(i);
            }
          }
          if (candidates.length > 0) {
            const newNumber = candidates[Math.floor(Math.random() * candidates.length)];
            improved = sorted.filter(n => n !== toReplace).concat(newNumber);
            needsImprovement = true;
          }
        }
      }
    }

    if (needsImprovement) {
      improved = ensureUniqueCount(improved, numbersToSelect, maxNumber);
      sorted.splice(0, sorted.length, ...improved.sort((a, b) => a - b));
    } else {
      break;
    }
  }

  return improved.sort((a, b) => a - b);
};

/**
 * Ensures a combination has exactly the required count of unique numbers.
 * Deduplicates, fills missing spots with random numbers that aren't already in the set.
 */
const ensureUniqueCount = (
  numbers: number[],
  requiredCount: number,
  maxNumber: number,
  existingNumbers: number[] = []
): number[] => {
  // Deduplicate
  const unique = [...new Set(numbers)];
  
  // Create a set of all numbers to exclude (existing + current)
  const excludeSet = new Set([...existingNumbers, ...unique]);
  
  // Fill missing spots with random numbers not in the exclude set
  while (unique.length < requiredCount) {
    const randomNum = getRandomNumber(1, maxNumber);
    if (!excludeSet.has(randomNum)) {
      unique.push(randomNum);
      excludeSet.add(randomNum);
    }
  }
  
  // Trim if somehow we have too many
  return unique.slice(0, requiredCount).sort((a, b) => a - b);
};

// Generate unique random numbers with no consecutive sequences and avoiding unlucky patterns
const generateUniqueRandomNumbers = (count: number, max: number, statistics?: GameStatistics): number[] => {
  const numbers: number[] = [];
  let attempts = 0;
  const maxAttempts = 1000; // Prevent infinite loops
  
  while (numbers.length < count && attempts < maxAttempts) {
    attempts++;
    const randomNum = getRandomNumber(1, max);
    
    if (!numbers.includes(randomNum)) {
      // Check if this number should be avoided due to unlucky statistics
      if (statistics && isUnluckyNumber(randomNum, statistics)) {
        // 70% chance to skip unlucky numbers, but still allow them sometimes for variety
        if (Math.random() < 0.7) {
          continue;
        }
      }
      
      const tempNumbers = [...numbers, randomNum];
      
      // Check for consecutive sequences
      if (tempNumbers.length >= 3 && hasConsecutiveSequence(tempNumbers)) {
        continue;
      }
      
      // Check for unlucky pairs
      if (statistics && tempNumbers.length >= 2 && hasUnluckyPair(tempNumbers, statistics)) {
        // 60% chance to avoid unlucky pairs
        if (Math.random() < 0.6) {
          continue;
        }
      }
      
      numbers.push(randomNum);
    }
  }
  
  // If we couldn't generate enough numbers due to constraints, fill with any valid numbers
  while (numbers.length < count) {
    const randomNum = getRandomNumber(1, max);
    if (!numbers.includes(randomNum)) {
      numbers.push(randomNum);
    }
  }
  
  return numbers.sort((a, b) => a - b);
};

// Generate numbers based on frequency (hot numbers) while avoiding unlucky ones
const generateBasedOnFrequency = (
  count: number,
  statistics: GameStatistics,
  useFrequent: boolean = true
): number[] => {
  const numbers: number[] = [];
  const pool = useFrequent 
    ? statistics.frequentNumbers
    : statistics.infrequentNumbers;
  
  // Filter out unlucky numbers from the pool (but keep some for variety)
  const filteredPool = pool.filter(item => {
    if (!statistics.unluckyNumbers) return true;
    const isUnlucky = isUnluckyNumber(item.number, statistics);
    // Keep 30% of unlucky numbers for variety
    return !isUnlucky || Math.random() < 0.3;
  });
  
  // Create a weighted pool where numbers with higher frequency have higher chance
  const weightedPool: number[] = [];
  
  filteredPool.forEach((item) => {
    const weight = useFrequent ? item.count : 1;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(item.number);
    }
  });
  
  // Select random numbers from the pool
  let attempts = 0;
  while (numbers.length < count && attempts < 1000) {
    attempts++;
    
    if (weightedPool.length === 0) break;
    
    const randomIndex = Math.floor(Math.random() * weightedPool.length);
    const selectedNumber = weightedPool[randomIndex];
    
    if (!numbers.includes(selectedNumber)) {
      const tempNumbers = [...numbers, selectedNumber];
      
      // Check for unlucky pairs
      if (tempNumbers.length >= 2 && hasUnluckyPair(tempNumbers, statistics)) {
        if (Math.random() < 0.6) continue; // 60% chance to avoid
      }
      
      numbers.push(selectedNumber);
    }
  }
  
  return numbers.sort((a, b) => a - b);
};

// Generate numbers based on delays (due numbers) while avoiding unlucky ones
const generateBasedOnDelays = (count: number, statistics: GameStatistics): number[] => {
  const numbers: number[] = [];
  
  // Filter delays to avoid highly unlucky numbers
  const filteredDelays = statistics.delays.filter(delay => {
    const isUnlucky = isUnluckyNumber(delay.number, statistics);
    return !isUnlucky || Math.random() < 0.4; // Keep 40% of unlucky numbers
  });
  
  // Start with numbers that have the longest delays
  for (let i = 0; i < Math.min(count, filteredDelays.length); i++) {
    const candidate = filteredDelays[i].number;
    
    // Check for unlucky pairs
    if (numbers.length > 0 && hasUnluckyPair([...numbers, candidate], statistics)) {
      if (Math.random() < 0.6) continue; // 60% chance to skip
    }
    
    numbers.push(candidate);
  }
  
  return numbers.sort((a, b) => a - b);
};

export interface GenerationMetadata {
  strategy: 'standard' | 'high-variability';
  sources: {
    frequentNumbers?: number[];
    delayNumbers?: number[];
    infrequentNumbers?: number[];
    randomFill?: number[];
  };
  poolsUsed: {
    frequentPoolSize: number;
    delayPoolSize: number;
    infrequentPoolSize: number;
  };
  filtersApplied: {
    avoidedConsecutive: boolean;
    avoidedUnluckyNumbers: number;
    avoidedUnluckyPairs: number;
    balanceCriteria: boolean;
  };
  totalCombinationsPossible: number;
  note: string;
}

interface GeneratedResult {
  numbers: number[];
  jolly?: number;
  superstar?: number;
  metadata?: GenerationMetadata;
}

// Main generator function
export const generateCombination = (
  gameType: GameType, 
  strategy: 'standard' | 'high-variability' = 'standard',
  statistics: GameStatistics,
  wheel?: LottoWheel,
  includeMetadata: boolean = false
): GeneratedResult => {
  const game = getGameByType(gameType);
  const stats = wheel && statistics.wheelStats ? statistics.wheelStats[wheel] : statistics;
  
  // Calculate total combinations for transparency
  const totalCombinations = (() => {
    // C(n, k) = n! / (k! * (n-k)!)
    let result = 1;
    const n = game.maxNumber;
    const k = game.numbersToSelect;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  })();
  
  let combination: number[] = [];
  const metadata: GenerationMetadata = {
    strategy,
    sources: {},
    poolsUsed: {
      frequentPoolSize: stats.frequentNumbers?.length || 0,
      delayPoolSize: stats.delays?.length || 0,
      infrequentPoolSize: stats.infrequentNumbers?.length || 0,
    },
    filtersApplied: {
      avoidedConsecutive: false,
      avoidedUnluckyNumbers: 0,
      avoidedUnluckyPairs: 0,
      balanceCriteria: false,
    },
    totalCombinationsPossible: totalCombinations,
    note: '',
  };
  
  if (strategy === 'standard') {
    // Standard strategy: mix of frequent numbers and some with delays, avoiding unlucky patterns
    const frequentCount = Math.ceil(game.numbersToSelect * 0.6);
    const delayCount = Math.floor(game.numbersToSelect * 0.3);
    
    // Get frequent numbers (avoiding unlucky ones)
    const frequentNumbers = generateBasedOnFrequency(
      frequentCount,
      stats,
      true
    );
    metadata.sources.frequentNumbers = [...frequentNumbers];
    
    // Get numbers with delays (avoiding unlucky ones), excluding already selected
    const delayNumbers = generateBasedOnDelays(delayCount, stats)
      .filter(num => !frequentNumbers.includes(num));
    metadata.sources.delayNumbers = [...delayNumbers];
    
    // Combine what we have so far
    combination = [...frequentNumbers, ...delayNumbers];
    
  } else {
    // High variability: more random with some infrequent numbers, still avoiding unlucky patterns
    const infrequentCount = Math.ceil(game.numbersToSelect * 0.4);
    
    // Get infrequent numbers (with some unlucky avoidance)
    const infrequentNumbers = generateBasedOnFrequency(
      infrequentCount,
      stats,
      false
    );
    metadata.sources.infrequentNumbers = [...infrequentNumbers];
    
    combination = [...infrequentNumbers];
  }
  
  // Track original combination before filling
  const beforeFill = [...combination];
  
  // GUARANTEE: Ensure exactly the right number of UNIQUE selections
  combination = ensureUniqueCount(combination, game.numbersToSelect, game.maxNumber);
  
  // Track what was filled randomly
  const randomFill = combination.filter(num => !beforeFill.includes(num));
  if (randomFill.length > 0) {
    metadata.sources.randomFill = randomFill;
  }
  
  // Apply balance criteria to improve combination quality
  combination = applyBalanceCriteria(combination, game.maxNumber, game.numbersToSelect);
  
  // Check if consecutive sequences were avoided (after all processing)
  metadata.filtersApplied.avoidedConsecutive = !hasConsecutiveSequence(combination);
  
  // Count avoided unlucky numbers
  if (stats.unluckyNumbers) {
    metadata.filtersApplied.avoidedUnluckyNumbers = combination.filter(
      num => !isUnluckyNumber(num, stats)
    ).length;
  }
  
  // Count avoided unlucky pairs
  if (stats.unluckyPairs) {
    let avoidedPairs = 0;
    for (let i = 0; i < combination.length; i++) {
      for (let j = i + 1; j < combination.length; j++) {
        const pair = [combination[i], combination[j]].sort((a, b) => a - b);
        const isUnlucky = stats.unluckyPairs.some(up => 
          up.pair[0] === pair[0] && up.pair[1] === pair[1]
        );
        if (!isUnlucky) avoidedPairs++;
      }
    }
    metadata.filtersApplied.avoidedUnluckyPairs = avoidedPairs;
  }
  
  metadata.filtersApplied.balanceCriteria = true;
  
  // Generate note
  if (strategy === 'standard') {
    metadata.note = `Generato da pool di ${metadata.poolsUsed.frequentPoolSize} numeri frequenti e ${metadata.poolsUsed.delayPoolSize} numeri ritardatari. Non analizza tutte le ${totalCombinations.toLocaleString('it-IT')} combinazioni possibili.`;
  } else {
    metadata.note = `Generato da pool di ${metadata.poolsUsed.infrequentPoolSize} numeri poco frequenti. Maggiore variabilità rispetto alla strategia standard.`;
  }
  
  // For SuperEnalotto, generate Jolly and Superstar numbers using statistics
  if (gameType === 'superenalotto') {
    // Generate Jolly: prefer frequent numbers that aren't in the main combination
    let jolly: number;
    if (statistics.jollyStats && statistics.jollyStats.frequentNumbers.length > 0) {
      // 70% chance to use a frequent jolly, 30% random
      if (Math.random() < 0.7) {
        const frequentJollies = statistics.jollyStats.frequentNumbers
          .filter(f => !combination.includes(f.number))
          .slice(0, 5)
          .map(f => f.number);
        
        if (frequentJollies.length > 0) {
          jolly = frequentJollies[Math.floor(Math.random() * frequentJollies.length)];
        } else {
          jolly = generateUniqueNumberExcluding(1, game.maxNumber, combination);
        }
      } else {
        jolly = generateUniqueNumberExcluding(1, game.maxNumber, combination);
      }
    } else {
      jolly = generateUniqueNumberExcluding(1, game.maxNumber, combination);
    }
    
    // Try to avoid unlucky jolly numbers
    if (stats.unluckyNumbers && isUnluckyNumber(jolly, stats) && Math.random() < 0.7) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = generateUniqueNumberExcluding(1, game.maxNumber, combination);
        if (!isUnluckyNumber(candidate, stats)) {
          jolly = candidate;
          break;
        }
      }
    }
    
    // Generate Superstar: prefer numbers with delays (ritardatari) for variety
    let superstar: number;
    if (statistics.superstarStats && statistics.superstarStats.delays.length > 0) {
      // 60% chance to use a delayed superstar, 40% random
      if (Math.random() < 0.6) {
        const delayedSuperstars = statistics.superstarStats.delays
          .slice(0, 5)
          .map(d => d.number);
        
        if (delayedSuperstars.length > 0) {
          superstar = delayedSuperstars[Math.floor(Math.random() * delayedSuperstars.length)];
        } else {
          superstar = getRandomNumber(1, game.maxNumber);
        }
      } else {
        superstar = getRandomNumber(1, game.maxNumber);
      }
    } else {
      superstar = getRandomNumber(1, game.maxNumber);
    }
    
    // Try to avoid unlucky superstar numbers
    if (stats.unluckyNumbers && isUnluckyNumber(superstar, stats) && Math.random() < 0.7) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = getRandomNumber(1, game.maxNumber);
        if (!isUnluckyNumber(candidate, stats)) {
          superstar = candidate;
          break;
        }
      }
    }
    
    const result: GeneratedResult = { numbers: combination, jolly, superstar };
    if (includeMetadata) {
      result.metadata = metadata;
    }
    return result;
  }
  
  const result: GeneratedResult = { numbers: combination };
  if (includeMetadata) {
    result.metadata = metadata;
  }
  return result;
};

// AI recommendation function with enhanced unlucky pattern avoidance and advanced statistics
export const generateAIRecommendation = (
  gameType: GameType,
  statistics: GameStatistics,
  wheel?: LottoWheel,
  advancedStats?: import('./advancedStatistics').AdvancedStatistics
): { numbers: number[]; reasons: string[]; jolly?: number; superstar?: number } => {
  const game = getGameByType(gameType);
  const stats = wheel && statistics.wheelStats ? statistics.wheelStats[wheel] : statistics;
  
  // For Lotto: Use PER-WHEEL advanced statistics if available
  // This ensures co-occurrence, influence scores, etc. are wheel-specific
  const effectiveAdvancedStats = (gameType === 'lotto' && wheel && statistics.wheelStats?.[wheel]?.advancedStatistics)
    ? statistics.wheelStats[wheel].advancedStatistics
    : advancedStats;
  
  // If advanced statistics are available (per-wheel for Lotto, global for others), use them with randomization
  if (effectiveAdvancedStats) {
    const optimalDist = calculateOptimalDistribution(gameType, game.maxNumber, game.numbersToSelect);
    
    // Use generateAdvancedCombination for randomization instead of deterministic calculateOptimalCombination
    // This ensures different combinations each time
    let combination = generateAdvancedCombination(
      effectiveAdvancedStats,
      game.numbersToSelect,
      game.maxNumber
    );
    
    // Add some co-occurrence optimization with randomization
    // Take top co-occurring pairs and randomly select from them
    const topCoOccurrences = effectiveAdvancedStats.coOccurrences
      .filter(co => co.correlation > 0)
      .slice(0, 10);
    
    if (topCoOccurrences.length > 0) {
      // Try to include at least one good co-occurring pair
      const randomCoOcc = topCoOccurrences[Math.floor(Math.random() * Math.min(3, topCoOccurrences.length))];
      if (randomCoOcc && !combination.includes(randomCoOcc.numbers[0]) && !combination.includes(randomCoOcc.numbers[1])) {
        // Replace one number with a co-occurring number if beneficial
        const replaceIndex = Math.floor(Math.random() * combination.length);
        const candidate = Math.random() < 0.5 ? randomCoOcc.numbers[0] : randomCoOcc.numbers[1];
        if (!combination.includes(candidate)) {
          combination[replaceIndex] = candidate;
          combination = combination.sort((a, b) => a - b);
        }
      }
    }
    
    // Calculate distribution for generated combination
    const actualDist = calculateDistributionAnalysis(combination);
    const patternScore = calculatePatternScore(
      actualDist,
      optimalDist,
      effectiveAdvancedStats.bayesianProbabilities,
      combination
    );
    
    // Generate reasons based on advanced statistics (using honest terminology)
    // Note: For Lotto, these are PER-WHEEL statistics
    const wheelLabel = (gameType === 'lotto' && wheel) ? ` (Ruota: ${wheel})` : '';
    const reasons: string[] = combination.map(num => {
      const influenceScore = effectiveAdvancedStats.bayesianProbabilities.find(p => p.number === num);
      const coOcc = effectiveAdvancedStats.coOccurrences.filter(co => 
        co.numbers.includes(num)
      ).slice(0, 2);
      
      let reason = '';
      if (influenceScore) {
        // Use honest terminology: "Influence Score" (ranking), not "probability"
        reason = `Numero ${num}: Punteggio Influenza ${influenceScore.posteriorProbability.toFixed(1)} `;
        reason += `(Freq. Storica: ${influenceScore.priorProbability.toFixed(1)}%, `;
        reason += `Freq. Recente: ${influenceScore.likelihood.toFixed(1)}%)`;
      } else {
        reason = `Numero ${num}: Selezionato per distribuzione ottimale`;
      }
      
      if (coOcc.length > 0) {
        reason += `. Lift positivo con altri numeri selezionati.`;
      }
      
      return reason;
    });
    
    reasons.push(`Punteggio Pattern: ${patternScore.toFixed(1)}/100${wheelLabel}`);
    reasons.push(`Distribuzione: Somma=${actualDist.sum.toFixed(0)}, Spread=${actualDist.spread}, Parità=${(actualDist.evenOddRatio * 100).toFixed(0)}%`);
    
    // For SuperEnalotto, generate Jolly and Superstar using statistics
    if (gameType === 'superenalotto') {
      let jolly: number;
      let jollyReason = '';
      
      // Generate Jolly: prefer frequent jolly numbers
      if (statistics.jollyStats && statistics.jollyStats.frequentNumbers.length > 0) {
        const frequentJollies = statistics.jollyStats.frequentNumbers
          .filter(f => !combination.includes(f.number))
          .slice(0, 5);
        
        if (frequentJollies.length > 0) {
          const selected = frequentJollies[Math.floor(Math.random() * frequentJollies.length)];
          jolly = selected.number;
          jollyReason = `Jolly ${jolly}: Numero frequente (apparso ${selected.count} volte, ${selected.percentage.toFixed(1)}%)`;
        } else {
          // Fallback to influence scores
          const topInfluence = effectiveAdvancedStats.bayesianProbabilities
            .filter(p => !combination.includes(p.number))
            .slice(0, 10)
            .map(p => p.number);
          
          jolly = topInfluence.length > 0 
            ? topInfluence[Math.floor(Math.random() * topInfluence.length)]
            : generateUniqueNumberExcluding(1, game.maxNumber, combination);
          jollyReason = `Jolly ${jolly}: Selezionato per alto punteggio di influenza`;
        }
      } else {
        // Fallback to influence scores
        const topInfluence = effectiveAdvancedStats.bayesianProbabilities
          .filter(p => !combination.includes(p.number))
          .slice(0, 10)
          .map(p => p.number);
        
        jolly = topInfluence.length > 0 
          ? topInfluence[Math.floor(Math.random() * topInfluence.length)]
          : generateUniqueNumberExcluding(1, game.maxNumber, combination);
        jollyReason = `Jolly ${jolly}: Selezionato per alto punteggio di influenza`;
      }
      
      let superstar: number;
      let superstarReason = '';
      
      // Generate Superstar: prefer delayed numbers for variety
      if (statistics.superstarStats && statistics.superstarStats.delays.length > 0) {
        const delayedSuperstars = statistics.superstarStats.delays.slice(0, 5);
        
        if (delayedSuperstars.length > 0) {
          const selected = delayedSuperstars[Math.floor(Math.random() * delayedSuperstars.length)];
          superstar = selected.number;
          superstarReason = `SuperStar ${superstar}: Numero ritardatario (ritardo: ${selected.delay} estrazioni)`;
        } else {
          // Fallback to influence scores
          const topInfluence = effectiveAdvancedStats.bayesianProbabilities
            .slice(0, 10)
            .map(p => p.number);
          
          superstar = topInfluence.length > 0
            ? topInfluence[Math.floor(Math.random() * topInfluence.length)]
            : getRandomNumber(1, game.maxNumber);
          superstarReason = `SuperStar ${superstar}: Ottimizzato per pattern statistici`;
        }
      } else {
        // Fallback to influence scores
        const topInfluence = effectiveAdvancedStats.bayesianProbabilities
          .slice(0, 10)
          .map(p => p.number);
        
        superstar = topInfluence.length > 0
          ? topInfluence[Math.floor(Math.random() * topInfluence.length)]
          : getRandomNumber(1, game.maxNumber);
        superstarReason = `SuperStar ${superstar}: Ottimizzato per pattern statistici`;
      }
      
      reasons.push(jollyReason);
      reasons.push(superstarReason);
      
      return { numbers: combination, reasons, jolly, superstar };
    }
    
    return { numbers: combination, reasons };
  }
  
  // Fallback to standard AI recommendation if advanced stats not available
  // Start with some hot numbers (frequently drawn) but avoid unlucky ones
  const hotCount = Math.ceil(game.numbersToSelect * 0.4);
  const hotNumbers = generateBasedOnFrequency(hotCount, stats, true);
  
  // Add some due numbers (with long delays) but avoid unlucky ones
  const dueCount = Math.ceil(game.numbersToSelect * 0.3);
  const dueNumbers = generateBasedOnDelays(dueCount, stats)
    .filter(num => !hotNumbers.includes(num));
  
  // Combine initial selections
  let combination = [...hotNumbers, ...dueNumbers];
  
  // GUARANTEE: Ensure exactly the right number of UNIQUE selections
  combination = ensureUniqueCount(combination, game.numbersToSelect, game.maxNumber);
  
  // Generate reasons for each number
  const reasons: string[] = combination.map(num => {
    const hotNumber = stats.frequentNumbers.find(f => f.number === num);
    const dueNumber = stats.delays.find(d => d.number === num);
    const isUnlucky = stats.unluckyNumbers ? isUnluckyNumber(num, stats) : false;
    
    if (hotNumber) {
      return `Il numero ${num} è uscito ${hotNumber.count} volte nelle ultime estrazioni (${hotNumber.percentage.toFixed(1)}%).`;
    } else if (dueNumber) {
      return `Il numero ${num} non esce da ${dueNumber.delay} estrazioni.`;
    } else {
      return `Il numero ${num} è stato selezionato per bilanciare la combinazione.`;
    }
  });
  
  // Add information about unlucky pattern avoidance
  if (stats.unluckyNumbers && stats.unluckyNumbers.length > 0) {
    reasons.push(`L'AI ha evitato numeri e combinazioni che sono apparsi frequentemente nelle tue combinazioni non vincenti.`);
  }
  
  // For SuperEnalotto, generate and explain Jolly and Superstar numbers using statistics
  if (gameType === 'superenalotto') {
    let jolly: number;
    let jollyReason = '';
    
    // Generate Jolly: prefer frequent jolly numbers
    if (statistics.jollyStats && statistics.jollyStats.frequentNumbers.length > 0) {
      const frequentJollies = statistics.jollyStats.frequentNumbers
        .filter(f => !combination.includes(f.number))
        .slice(0, 5);
      
      if (frequentJollies.length > 0 && Math.random() < 0.7) {
        const selected = frequentJollies[Math.floor(Math.random() * frequentJollies.length)];
        jolly = selected.number;
        jollyReason = `Jolly ${jolly}: Numero frequente (apparso ${selected.count} volte, ${selected.percentage.toFixed(1)}%)`;
      } else {
        jolly = generateUniqueNumberExcluding(1, game.maxNumber, combination);
        jollyReason = `Jolly ${jolly}: Selezionato come numero complementare`;
      }
    } else {
      jolly = generateUniqueNumberExcluding(1, game.maxNumber, combination);
      jollyReason = `Jolly ${jolly}: Selezionato come numero complementare`;
    }
    
    let superstar: number;
    let superstarReason = '';
    
    // Generate Superstar: prefer delayed numbers for variety
    if (statistics.superstarStats && statistics.superstarStats.delays.length > 0) {
      const delayedSuperstars = statistics.superstarStats.delays.slice(0, 5);
      
      if (delayedSuperstars.length > 0 && Math.random() < 0.6) {
        const selected = delayedSuperstars[Math.floor(Math.random() * delayedSuperstars.length)];
        superstar = selected.number;
        superstarReason = `SuperStar ${superstar}: Numero ritardatario (ritardo: ${selected.delay} estrazioni)`;
      } else {
        superstar = getRandomNumber(1, game.maxNumber);
        superstarReason = `SuperStar ${superstar}: Generato considerando i pattern di successo`;
      }
    } else {
      superstar = getRandomNumber(1, game.maxNumber);
      superstarReason = `SuperStar ${superstar}: Generato considerando i pattern di successo`;
    }
    
    // Try to avoid unlucky numbers for jolly and superstar
    if (stats.unluckyNumbers) {
      if (isUnluckyNumber(jolly, stats) && Math.random() < 0.8) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = generateUniqueNumberExcluding(1, game.maxNumber, combination);
          if (!isUnluckyNumber(candidate, stats)) {
            jolly = candidate;
            break;
          }
        }
      }
      
      if (isUnluckyNumber(superstar, stats) && Math.random() < 0.8) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = getRandomNumber(1, game.maxNumber);
          if (!isUnluckyNumber(candidate, stats)) {
            superstar = candidate;
            break;
          }
        }
      }
    }
    
    reasons.push(jollyReason);
    reasons.push(superstarReason);
    
    return { numbers: combination, reasons, jolly, superstar };
  }
  
  return { numbers: combination, reasons };
};