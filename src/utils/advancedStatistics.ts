import { ExtractedNumbers, GameType, GameStatistics, Frequency } from '../types';

// Advanced statistical analysis interfaces
export interface DistributionAnalysis {
  sum: number;                    // Sum of all numbers
  spread: number;                 // Range (max - min)
  evenOddRatio: number;           // Ratio of even to odd numbers
  decadeDistribution: number[];   // Distribution across decades (1-10, 11-20, etc.)
  consecutiveSequences: number;   // Number of consecutive sequences
  gapAnalysis: number[];          // Gaps between consecutive numbers
  averageGap: number;             // Average gap between numbers
  numberDensity: number;          // How spread out numbers are (lower = more clustered)
}

export interface CoOccurrence {
  numbers: [number, number];
  count: number;
  frequency: number;              // Percentage of extractions where both appear
  expectedFrequency: number;       // Expected frequency if independent
  correlation: number;           // Correlation coefficient (-1 to 1)
}

export interface BayesianProbability {
  number: number;
  priorProbability: number;       // Base probability from historical frequency
  likelihood: number;            // Likelihood given recent patterns
  posteriorProbability: number;  // Bayesian updated probability
  confidence: number;            // Confidence in the prediction
}

export interface ExpectedValue {
  combination: number[];
  expectedMatches: number;        // Expected number of matches
  winProbability: number[];      // Probability of 0, 1, 2, ... matches
  expectedValue: number;         // Expected monetary value (if prize data available)
}

export interface AdvancedStatistics {
  distribution: DistributionAnalysis;
  coOccurrences: CoOccurrence[];
  bayesianProbabilities: BayesianProbability[];
  expectedValues: ExpectedValue[];
  patternScore: number;          // Overall pattern score (0-100)
}

// Calculate distribution analysis for a combination
export function calculateDistributionAnalysis(
  numbers: number[]
): DistributionAnalysis {
  if (numbers.length === 0) {
    return {
      sum: 0,
      spread: 0,
      evenOddRatio: 0,
      decadeDistribution: [],
      consecutiveSequences: 0,
      gapAnalysis: [],
      averageGap: 0,
      numberDensity: 0,
    };
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  const spread = sorted[sorted.length - 1] - sorted[0];
  
  const evenCount = sorted.filter(n => n % 2 === 0).length;
  const oddCount = sorted.length - evenCount;
  const evenOddRatio = oddCount > 0 ? evenCount / oddCount : evenCount;
  
  // Decade distribution (for 1-90 range, 9 decades)
  const decades = Array(9).fill(0);
  sorted.forEach(num => {
    const decade = Math.floor((num - 1) / 10);
    if (decade >= 0 && decade < 9) {
      decades[decade]++;
    }
  });
  
  // Count consecutive sequences
  let consecutiveSequences = 0;
  let currentSequence = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentSequence++;
    } else {
      if (currentSequence >= 2) consecutiveSequences++;
      currentSequence = 1;
    }
  }
  if (currentSequence >= 2) consecutiveSequences++;
  
  // Gap analysis
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  const averageGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  
  // Number density (variance of gaps - lower = more clustered)
  const gapVariance = gaps.length > 0
    ? gaps.reduce((acc, gap) => acc + Math.pow(gap - averageGap, 2), 0) / gaps.length
    : 0;
  const numberDensity = 1 / (1 + gapVariance); // Normalized density score
  
  return {
    sum,
    spread,
    evenOddRatio,
    decadeDistribution: decades,
    consecutiveSequences,
    gapAnalysis: gaps,
    averageGap,
    numberDensity,
  };
}

// Calculate optimal distribution for a game type
export function calculateOptimalDistribution(
  gameType: GameType,
  maxNumber: number,
  numbersToSelect: number
): DistributionAnalysis {
  // Optimal distribution based on historical winning patterns
  const optimalSum = (numbersToSelect * (maxNumber + 1)) / 2; // Average sum
  const optimalSpread = maxNumber * 0.7; // 70% of range
  const optimalEvenOddRatio = numbersToSelect % 2 === 0 ? 1 : 0.8; // Balanced
  
  // Optimal decade distribution (spread across decades)
  const optimalDecadeDistribution = Array(9).fill(numbersToSelect / 9);
  
  return {
    sum: optimalSum,
    spread: optimalSpread,
    evenOddRatio: optimalEvenOddRatio,
    decadeDistribution: optimalDecadeDistribution,
    consecutiveSequences: 0, // Optimal = no consecutive sequences
    gapAnalysis: [],
    averageGap: maxNumber / numbersToSelect,
    numberDensity: 0.5, // Balanced density
  };
}

// Calculate co-occurrences between numbers
export function calculateCoOccurrences(
  extractions: ExtractedNumbers[],
  maxNumber: number,
  minOccurrences: number = 3
): CoOccurrence[] {
  const coOccurrenceMap = new Map<string, number>();
  const totalExtractions = extractions.length;
  
  // Count co-occurrences
  extractions.forEach(extraction => {
    const numbers = extraction.numbers;
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const pair: [number, number] = [numbers[i], numbers[j]].sort((a, b) => a - b) as [number, number];
        const key = `${pair[0]}-${pair[1]}`;
        coOccurrenceMap.set(key, (coOccurrenceMap.get(key) || 0) + 1);
      }
    }
  });
  
  // Calculate frequencies and correlations
  const coOccurrences: CoOccurrence[] = [];
  
  coOccurrenceMap.forEach((count, key) => {
    if (count >= minOccurrences) {
      const [num1, num2] = key.split('-').map(Number);
      
      // Calculate individual frequencies
      const num1Count = extractions.filter(ext => ext.numbers.includes(num1)).length;
      const num2Count = extractions.filter(ext => ext.numbers.includes(num2)).length;
      
      const frequency = (count / totalExtractions) * 100;
      const expectedFrequency = ((num1Count / totalExtractions) * (num2Count / totalExtractions)) * 100;
      
      // Correlation: positive if they appear together more than expected
      const correlation = expectedFrequency > 0
        ? (frequency - expectedFrequency) / expectedFrequency
        : 0;
      
      coOccurrences.push({
        numbers: [num1, num2],
        count,
        frequency,
        expectedFrequency,
        correlation: Math.min(1, Math.max(-1, correlation)), // Clamp to -1, 1
      });
    }
  });
  
  // Sort by correlation (strongest correlations first)
  return coOccurrences.sort((a, b) => b.correlation - a.correlation);
}

// Calculate Bayesian probabilities for numbers
export function calculateBayesianProbabilities(
  extractions: ExtractedNumbers[],
  maxNumber: number,
  recentExtractions: ExtractedNumbers[] = [],
  unsuccessfulCombinations: Array<{ numbers: number[] }> = []
): BayesianProbability[] {
  const totalExtractions = extractions.length;
  const recentCount = recentExtractions.length;
  
  const probabilities: BayesianProbability[] = [];
  
  for (let num = 1; num <= maxNumber; num++) {
    // Prior probability: historical frequency
    const historicalCount = extractions.filter(ext => ext.numbers.includes(num)).length;
    const priorProbability = totalExtractions > 0 ? historicalCount / totalExtractions : 1 / maxNumber;
    
    // Likelihood: probability given recent patterns
    const recentCount_num = recentExtractions.filter(ext => ext.numbers.includes(num)).length;
    const recentLikelihood = recentCount > 0 ? recentCount_num / recentCount : priorProbability;
    
    // Evidence: unsuccessful combinations (avoid numbers that appear frequently in losses)
    const unsuccessfulCount = unsuccessfulCombinations.filter(combo => combo.numbers.includes(num)).length;
    const unsuccessfulRate = unsuccessfulCombinations.length > 0
      ? unsuccessfulCount / unsuccessfulCombinations.length
      : 0;
    
    // Adjust likelihood based on unsuccessful rate (lower unsuccessful rate = higher likelihood)
    const adjustedLikelihood = recentLikelihood * (1 - unsuccessfulRate * 0.5);
    
    // Bayesian update: P(A|B) = P(B|A) * P(A) / P(B)
    // Simplified: posterior = likelihood * prior / normalization
    const posteriorProbability = adjustedLikelihood * priorProbability;
    
    // Confidence based on data quality
    const confidence = Math.min(100, Math.sqrt(totalExtractions + recentCount) * 10);
    
    probabilities.push({
      number: num,
      priorProbability: priorProbability * 100,
      likelihood: adjustedLikelihood * 100,
      posteriorProbability: posteriorProbability * 100,
      confidence,
    });
  }
  
  // Normalize probabilities
  const totalPosterior = probabilities.reduce((sum, p) => sum + p.posteriorProbability, 0);
  if (totalPosterior > 0) {
    probabilities.forEach(p => {
      p.posteriorProbability = (p.posteriorProbability / totalPosterior) * 100;
    });
  }
  
  return probabilities.sort((a, b) => b.posteriorProbability - a.posteriorProbability);
}

// Calculate expected value for a combination
export function calculateExpectedValue(
  combination: number[],
  extractions: ExtractedNumbers[],
  numbersToSelect: number
): ExpectedValue {
  // Calculate probability of each match count
  const winProbabilities: number[] = Array(numbersToSelect + 1).fill(0);
  
  extractions.forEach(extraction => {
    const matches = combination.filter(num => extraction.numbers.includes(num)).length;
    if (matches <= numbersToSelect) {
      winProbabilities[matches]++;
    }
  });
  
  // Normalize to probabilities
  const total = extractions.length || 1;
  const probabilities = winProbabilities.map(count => count / total);
  
  // Expected number of matches
  const expectedMatches = probabilities.reduce((sum, prob, matches) => sum + prob * matches, 0);
  
  // Expected value (simplified - would need prize data for accurate calculation)
  // Higher matches = higher value
  const expectedValue = probabilities.reduce((sum, prob, matches) => {
    // Simplified: value increases exponentially with matches
    return sum + prob * Math.pow(matches, 2);
  }, 0);
  
  return {
    combination,
    expectedMatches,
    winProbability: probabilities,
    expectedValue,
  };
}

// Calculate overall pattern score for a combination
export function calculatePatternScore(
  distribution: DistributionAnalysis,
  optimalDistribution: DistributionAnalysis,
  bayesianProbabilities: BayesianProbability[],
  combination: number[]
): number {
  let score = 100;
  
  // Compare distribution to optimal
  const sumDiff = Math.abs(distribution.sum - optimalDistribution.sum) / optimalDistribution.sum;
  score -= sumDiff * 20; // Max -20 points
  
  const spreadDiff = Math.abs(distribution.spread - optimalDistribution.spread) / optimalDistribution.spread;
  score -= spreadDiff * 15; // Max -15 points
  
  // Penalize consecutive sequences
  score -= distribution.consecutiveSequences * 10; // -10 per sequence
  
  // Reward good Bayesian probabilities
  const avgBayesianProb = combination.reduce((sum, num) => {
    const prob = bayesianProbabilities.find(p => p.number === num);
    return sum + (prob?.posteriorProbability || 0);
  }, 0) / combination.length;
  
  score += (avgBayesianProb / 100) * 30; // Max +30 points
  
  // Reward good number density (not too clustered, not too spread)
  const densityDiff = Math.abs(distribution.numberDensity - optimalDistribution.numberDensity);
  score -= densityDiff * 10; // Max -10 points
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

// Main function to calculate all advanced statistics
export function calculateAdvancedStatistics(
  gameType: GameType,
  extractions: ExtractedNumbers[],
  unsuccessfulCombinations: Array<{ numbers: number[] }> = [],
  maxNumber: number,
  numbersToSelect: number
): AdvancedStatistics {
  // Get recent extractions (last 20)
  const recentExtractions = extractions.slice(0, 20);
  
  // Calculate co-occurrences
  const coOccurrences = calculateCoOccurrences(extractions, maxNumber);
  
  // Calculate Bayesian probabilities
  const bayesianProbabilities = calculateBayesianProbabilities(
    extractions,
    maxNumber,
    recentExtractions,
    unsuccessfulCombinations
  );
  
  // Calculate optimal distribution
  const optimalDistribution = calculateOptimalDistribution(gameType, maxNumber, numbersToSelect);
  
  // Calculate expected values for top combinations (based on Bayesian probabilities)
  const topNumbers = bayesianProbabilities
    .slice(0, numbersToSelect * 2)
    .map(p => p.number);
  
  // Generate sample combinations and calculate expected values
  const sampleCombinations: number[][] = [];
  // Simple sampling: take top N numbers
  if (topNumbers.length >= numbersToSelect) {
    sampleCombinations.push(topNumbers.slice(0, numbersToSelect));
  }
  
  const expectedValues = sampleCombinations.map(combo =>
    calculateExpectedValue(combo, extractions, numbersToSelect)
  );
  
  // Calculate pattern score for optimal combination
  const optimalCombination = topNumbers.slice(0, numbersToSelect);
  const optimalDistribution_actual = calculateDistributionAnalysis(optimalCombination);
  const patternScore = calculatePatternScore(
    optimalDistribution_actual,
    optimalDistribution,
    bayesianProbabilities,
    optimalCombination
  );
  
  return {
    distribution: optimalDistribution,
    coOccurrences: coOccurrences.slice(0, 20), // Top 20 co-occurrences
    bayesianProbabilities: bayesianProbabilities.slice(0, 30), // Top 30 numbers
    expectedValues: expectedValues.slice(0, 10), // Top 10 combinations
    patternScore,
  };
}

// Generate combination using advanced statistics
export function generateAdvancedCombination(
  advancedStats: AdvancedStatistics,
  numbersToSelect: number,
  maxNumber: number
): number[] {
  // Use Bayesian probabilities to select numbers
  const topNumbers = advancedStats.bayesianProbabilities
    .slice(0, numbersToSelect * 2)
    .map(p => p.number);
  
  // Create weighted selection based on posterior probabilities
  const weightedPool: number[] = [];
  advancedStats.bayesianProbabilities.slice(0, numbersToSelect * 2).forEach(prob => {
    const weight = Math.ceil(prob.posteriorProbability);
    for (let i = 0; i < weight; i++) {
      weightedPool.push(prob.number);
    }
  });
  
  // Select numbers with diversity
  const selected: number[] = [];
  const used = new Set<number>();
  
  while (selected.length < numbersToSelect && weightedPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * weightedPool.length);
    const candidate = weightedPool[randomIndex];
    
    if (!used.has(candidate)) {
      selected.push(candidate);
      used.add(candidate);
    }
  }
  
  // Fill remaining spots if needed
  while (selected.length < numbersToSelect) {
    const randomNum = Math.floor(Math.random() * maxNumber) + 1;
    if (!selected.includes(randomNum)) {
      selected.push(randomNum);
    }
  }
  
  return selected.sort((a, b) => a - b);
}

// Calculate optimal combination considering all factors
export function calculateOptimalCombination(
  advancedStats: AdvancedStatistics,
  numbersToSelect: number,
  maxNumber: number,
  coOccurrences: CoOccurrence[]
): number[] {
  // Start with top Bayesian probabilities
  const topBayesian = advancedStats.bayesianProbabilities
    .slice(0, numbersToSelect)
    .map(p => p.number);
  
  // Enhance with co-occurrence analysis
  const enhanced: number[] = [];
  const used = new Set<number>();
  
  // Add first number
  enhanced.push(topBayesian[0]);
  used.add(topBayesian[0]);
  
  // Add numbers that co-occur well with already selected numbers
  for (let i = 1; i < numbersToSelect && enhanced.length < numbersToSelect; i++) {
    if (i < topBayesian.length) {
      const candidate = topBayesian[i];
      
      // Check co-occurrence with already selected numbers
      const coOccurrenceScore = enhanced.reduce((score, selectedNum) => {
        const coOcc = coOccurrences.find(
          co => (co.numbers[0] === candidate && co.numbers[1] === selectedNum) ||
                (co.numbers[0] === selectedNum && co.numbers[1] === candidate)
        );
        return score + (coOcc?.correlation || 0);
      }, 0);
      
      // Prefer numbers with positive co-occurrence
      if (coOccurrenceScore >= 0 || enhanced.length < 2) {
        enhanced.push(candidate);
        used.add(candidate);
      }
    }
  }
  
  // Fill remaining with high Bayesian probability numbers
  for (const prob of advancedStats.bayesianProbabilities) {
    if (enhanced.length >= numbersToSelect) break;
    if (!used.has(prob.number)) {
      enhanced.push(prob.number);
      used.add(prob.number);
    }
  }
  
  // Final fill with random if needed
  while (enhanced.length < numbersToSelect) {
    const randomNum = Math.floor(Math.random() * maxNumber) + 1;
    if (!used.has(randomNum)) {
      enhanced.push(randomNum);
      used.add(randomNum);
    }
  }
  
  return enhanced.sort((a, b) => a - b);
}

