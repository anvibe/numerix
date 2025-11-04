import { GameType, Game, GameStatistics, LottoWheel } from '../types';
import { GAMES } from './constants';

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
    const randomCount = game.numbersToSelect - frequentCount - delayCount;
    
    // Get frequent numbers (avoiding unlucky ones)
    const frequentNumbers = generateBasedOnFrequency(
      frequentCount,
      stats,
      true
    );
    
    // Get numbers with delays (avoiding unlucky ones)
    const delayNumbers = generateBasedOnDelays(delayCount, stats)
      .filter(num => !frequentNumbers.includes(num));
    
    // Fill remaining with random numbers (avoiding unlucky patterns)
    let remainingNumbers = generateUniqueRandomNumbers(
      randomCount + (delayCount - delayNumbers.length),
      game.maxNumber,
      stats
    ).filter(num => 
      !frequentNumbers.includes(num) && 
      !delayNumbers.includes(num)
    );
    
    combination = [
      ...frequentNumbers,
      ...delayNumbers,
      ...remainingNumbers.slice(0, game.numbersToSelect - frequentNumbers.length - delayNumbers.length)
    ];
  } else {
    // High variability: more random with some infrequent numbers, still avoiding unlucky patterns
    const infrequentCount = Math.ceil(game.numbersToSelect * 0.4);
    const randomCount = game.numbersToSelect - infrequentCount;
    
    // Get infrequent numbers (with some unlucky avoidance)
    const infrequentNumbers = generateBasedOnFrequency(
      infrequentCount,
      stats,
      false
    );
    
    // Fill remaining with random numbers (avoiding unlucky patterns)
    const randomNumbers = generateUniqueRandomNumbers(randomCount, game.maxNumber, stats)
      .filter(num => !infrequentNumbers.includes(num));
    
    combination = [
      ...infrequentNumbers,
      ...randomNumbers
    ];
  }
  
  // Ensure we have exactly the right number of selections
  if (combination.length > game.numbersToSelect) {
    combination = combination.slice(0, game.numbersToSelect);
  }
  
  // Fill any remaining spots with random numbers if needed
  while (combination.length < game.numbersToSelect) {
    const randomNum = getRandomNumber(1, game.maxNumber);
    if (!combination.includes(randomNum)) {
      combination.push(randomNum);
    }
  }
  
  combination.sort((a, b) => a - b);
  
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

// AI recommendation function with enhanced unlucky pattern avoidance
export const generateAIRecommendation = (
  gameType: GameType,
  statistics: GameStatistics,
  wheel?: LottoWheel
): { numbers: number[]; reasons: string[]; jolly?: number; superstar?: number } => {
  const game = getGameByType(gameType);
  const stats = wheel && statistics.wheelStats ? statistics.wheelStats[wheel] : statistics;
  
  // Start with some hot numbers (frequently drawn) but avoid unlucky ones
  const hotCount = Math.ceil(game.numbersToSelect * 0.4);
  const hotNumbers = generateBasedOnFrequency(hotCount, stats, true);
  
  // Add some due numbers (with long delays) but avoid unlucky ones
  const dueCount = Math.ceil(game.numbersToSelect * 0.3);
  const dueNumbers = generateBasedOnDelays(dueCount, stats)
    .filter(num => !hotNumbers.includes(num));
  
  // Add some balancing numbers for variability, avoiding unlucky patterns
  const balanceCount = game.numbersToSelect - hotNumbers.length - dueNumbers.length;
  const balanceNumbers = generateUniqueRandomNumbers(balanceCount + 5, game.maxNumber, stats)
    .filter(num => !hotNumbers.includes(num) && !dueNumbers.includes(num))
    .slice(0, balanceCount);
  
  // Combine all numbers
  const combination = [
    ...hotNumbers,
    ...dueNumbers,
    ...balanceNumbers
  ].sort((a, b) => a - b);
  
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