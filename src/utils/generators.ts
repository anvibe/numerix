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

interface GeneratedResult {
  numbers: number[];
  jolly?: number;
  superstar?: number;
}

// Main generator function
export const generateCombination = (
  gameType: GameType, 
  strategy: 'standard' | 'high-variability' = 'standard',
  statistics: GameStatistics,
  wheel?: LottoWheel
): GeneratedResult => {
  const game = getGameByType(gameType);
  const stats = wheel && statistics.wheelStats ? statistics.wheelStats[wheel] : statistics;
  
  let combination: number[] = [];
  
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
    
    // Get numbers with delays (avoiding unlucky ones), excluding already selected
    const delayNumbers = generateBasedOnDelays(delayCount, stats)
      .filter(num => !frequentNumbers.includes(num));
    
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
    
    combination = [...infrequentNumbers];
  }
  
  // GUARANTEE: Ensure exactly the right number of UNIQUE selections
  combination = ensureUniqueCount(combination, game.numbersToSelect, game.maxNumber);
  
  // For SuperEnalotto, generate Jolly and Superstar numbers (also avoiding unlucky ones)
  if (gameType === 'superenalotto') {
    let jolly = generateUniqueNumberExcluding(1, game.maxNumber, combination);
    
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
    
    let superstar = getRandomNumber(1, game.maxNumber);
    
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
    
    return { numbers: combination, jolly, superstar };
  }
  
  return { numbers: combination };
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
    
    // For SuperEnalotto, generate Jolly and Superstar
    if (gameType === 'superenalotto') {
      // Use influence scores for jolly and superstar too
      const topInfluence = effectiveAdvancedStats.bayesianProbabilities
        .filter(p => !combination.includes(p.number))
        .slice(0, 10)
        .map(p => p.number);
      
      const jolly = topInfluence.length > 0 
        ? topInfluence[Math.floor(Math.random() * topInfluence.length)]
        : generateUniqueNumberExcluding(1, game.maxNumber, combination);
      const superstar = topInfluence.length > 0
        ? topInfluence[Math.floor(Math.random() * topInfluence.length)]
        : getRandomNumber(1, game.maxNumber);
      
      reasons.push(`Jolly ${jolly}: Selezionato per alto punteggio di influenza`);
      reasons.push(`SuperStar ${superstar}: Ottimizzato per pattern statistici`);
      
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
  
  // For SuperEnalotto, generate and explain Jolly and Superstar numbers
  if (gameType === 'superenalotto') {
    let jolly = generateUniqueNumberExcluding(1, game.maxNumber, combination);
    let superstar = getRandomNumber(1, game.maxNumber);
    
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
    
    reasons.push(`Il numero Jolly ${jolly} è stato selezionato come numero complementare.`);
    reasons.push(`Il numero SuperStar ${superstar} è stato generato considerando i pattern di successo.`);
    
    return { numbers: combination, reasons, jolly, superstar };
  }
  
  return { numbers: combination, reasons };
};