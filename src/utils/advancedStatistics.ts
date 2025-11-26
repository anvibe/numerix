import { ExtractedNumbers, GameType, GameStatistics, Frequency } from '../types';

/**
 * IMPORTANT DISCLAIMER:
 * These statistics are for ANALYSIS and VISUALIZATION purposes only.
 * Every lottery combination has the SAME probability of winning.
 * No statistical analysis can create a mathematical edge in a fair lottery.
 * 
 * SuperEnalotto: 6 numbers from 1-90
 * Total combinations: C(90,6) = 622,614,630
 * Probability of 6/6: ~1 in 622 million (same for ANY combination)
 */

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
  expectedFrequency: number;      // Expected frequency if independent
  lift: number;                   // Lift metric: frequency / expectedFrequency (1.0 = independent)
  liftScore: number;              // Bounded lift score using tanh (-1 to 1, smooth)
  correlation: number;            // Alias for liftScore (backward compatibility)
}

/**
 * Influence Score (renamed from "Bayesian Probability")
 * This is a RANKING SCORE, not a true probability.
 * It combines historical frequency with recent patterns for recommendation purposes.
 */
export interface InfluenceScore {
  number: number;
  historicalFrequency: number;    // Raw frequency from historical data (%)
  recentFrequency: number;        // Frequency in recent extractions (%)
  unsuccessfulPenalty: number;    // Penalty from unsuccessful combinations (0-1)
  influenceScore: number;         // Combined ranking score (higher = more recommended)
  normalizedScore: number;        // Normalized to sum to 100 across all numbers
  confidence: number;             // Data quality confidence (0-100)
}

// Keep old interface name for backward compatibility
export type BayesianProbability = InfluenceScore & {
  priorProbability: number;       // Alias for historicalFrequency
  likelihood: number;             // Alias for recentFrequency  
  posteriorProbability: number;   // Alias for normalizedScore
};

/**
 * Impact Score (renamed from "Expected Value")
 * This is a PATTERN QUALITY score, not a monetary expected value.
 * It rewards combinations that would have matched more numbers historically.
 */
export interface ImpactScore {
  combination: number[];
  expectedMatches: number;        // Average matches against historical extractions
  matchDistribution: number[];    // Probability distribution of 0, 1, 2, ... matches
  impactScore: number;            // Pattern quality score (higher matches weighted more)
}

// Keep old interface name for backward compatibility
export type ExpectedValue = ImpactScore & {
  winProbability: number[];       // Alias for matchDistribution
  expectedValue: number;          // Alias for impactScore
};

export interface AdvancedStatistics {
  distribution: DistributionAnalysis;
  coOccurrences: CoOccurrence[];
  bayesianProbabilities: BayesianProbability[];  // Actually InfluenceScores
  expectedValues: ExpectedValue[];               // Actually ImpactScores
  patternScore: number;           // Recommendation fitness score (0-100)
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

/**
 * Calculate co-occurrences between number pairs.
 * Uses LIFT metric instead of raw correlation to avoid explosion with small expected frequencies.
 * 
 * Lift = observed_frequency / expected_frequency
 * - Lift > 1: numbers appear together MORE than expected
 * - Lift = 1: numbers appear together as expected (independent)
 * - Lift < 1: numbers appear together LESS than expected
 * 
 * LiftScore uses tanh to bound the result smoothly between -1 and 1.
 */
export function calculateCoOccurrences(
  extractions: ExtractedNumbers[],
  maxNumber: number,
  minOccurrences: number = 3
): CoOccurrence[] {
  const coOccurrenceMap = new Map<string, number>();
  const totalExtractions = extractions.length;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[calculateCoOccurrences] Processing ${totalExtractions} extractions for co-occurrence analysis`);
  }
  
  // Count co-occurrences
  extractions.forEach(extraction => {
    const numbers = extraction.numbers || [];
    // Safety check: ensure numbers is an array
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return; // Skip this extraction if no valid numbers
    }
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const pair: [number, number] = [numbers[i], numbers[j]].sort((a, b) => a - b) as [number, number];
        const key = `${pair[0]}-${pair[1]}`;
        coOccurrenceMap.set(key, (coOccurrenceMap.get(key) || 0) + 1);
      }
    }
  });
  
  // Calculate frequencies and lift scores
  const coOccurrences: CoOccurrence[] = [];
  
  coOccurrenceMap.forEach((count, key) => {
    if (count >= minOccurrences) {
      const [num1, num2] = key.split('-').map(Number);
      
      // Calculate individual frequencies
      const num1Count = extractions.filter(ext => ext.numbers.includes(num1)).length;
      const num2Count = extractions.filter(ext => ext.numbers.includes(num2)).length;
      
      const frequency = (count / totalExtractions) * 100;
      // Prevent division by zero with small epsilon
      const expectedFrequency = Math.max(0.0001, 
        ((num1Count / totalExtractions) * (num2Count / totalExtractions)) * 100
      );
      
      // Lift metric: observed / expected (1.0 = independent)
      const lift = frequency / expectedFrequency;
      
      // Bounded lift score using tanh for smooth -1 to 1 range
      // tanh(lift - 1) maps:
      //   lift = 0.5 → ~-0.46 (appear together less than expected)
      //   lift = 1.0 → 0 (independent)
      //   lift = 1.5 → ~0.46 (appear together more than expected)
      //   lift = 2.0 → ~0.76 (strongly co-occur)
      const liftScore = Math.tanh(lift - 1);
      
      coOccurrences.push({
        numbers: [num1, num2],
        count,
        frequency,
        expectedFrequency,
        lift,
        liftScore,
        correlation: liftScore,  // Backward compatibility alias
      });
    }
  });
  
  // Sort by lift score (strongest positive co-occurrences first)
  return coOccurrences.sort((a, b) => b.liftScore - a.liftScore);
}

/**
 * Calculate Influence Scores for numbers (renamed from "Bayesian Probabilities").
 * 
 * IMPORTANT: These are RANKING SCORES, not true probabilities!
 * They combine historical frequency with recent patterns for recommendation purposes.
 * 
 * The lottery draw is uniformly random - every number has the same TRUE probability.
 * These scores are for analysis and visualization only.
 * 
 * Score formula:
 *   influenceScore = historicalFreq * recentFreq * (1 - unsuccessfulPenalty)
 * 
 * This is NOT a proper Bayesian posterior (which would require P(B) normalization),
 * but it's useful as a ranking metric.
 */
export function calculateBayesianProbabilities(
  extractions: ExtractedNumbers[],
  maxNumber: number,
  recentExtractions: ExtractedNumbers[] = [],
  unsuccessfulCombinations: Array<{ numbers: number[] }> = []
): BayesianProbability[] {
  const totalExtractions = extractions.length;
  const recentCount = recentExtractions.length;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[calculateInfluenceScores] Using ${totalExtractions} total extractions, ${recentCount} recent extractions`);
  }
  
  const scores: BayesianProbability[] = [];
  
  for (let num = 1; num <= maxNumber; num++) {
    // Historical frequency (how often this number appeared in all extractions)
    const historicalCount = extractions.filter(ext => {
      const numbers = ext.numbers || [];
      return Array.isArray(numbers) && numbers.includes(num);
    }).length;
    const historicalFrequency = totalExtractions > 0 
      ? (historicalCount / totalExtractions) * 100 
      : 100 / maxNumber;  // Uniform if no data
    
    // Recent frequency (how often in last N extractions)
    const recentCount_num = recentExtractions.filter(ext => {
      const numbers = ext.numbers || [];
      return Array.isArray(numbers) && numbers.includes(num);
    }).length;
    const recentFrequency = recentCount > 0 
      ? (recentCount_num / recentCount) * 100 
      : historicalFrequency;
    
    // Unsuccessful penalty (soft penalty for numbers in user's unsuccessful plays)
    const unsuccessfulCount = unsuccessfulCombinations.filter(combo => combo.numbers.includes(num)).length;
    const unsuccessfulPenalty = unsuccessfulCombinations.length > 0
      ? Math.min(0.5, unsuccessfulCount / unsuccessfulCombinations.length)  // Cap at 0.5 to prevent extreme penalty
      : 0;
    
    // Influence score = product of factors (higher = more recommended)
    // Note: This is a ranking metric, NOT a probability!
    const influenceScore = (historicalFrequency / 100) * (recentFrequency / 100) * (1 - unsuccessfulPenalty);
    
    // Confidence based on data quality (more data = higher confidence)
    const confidence = Math.min(100, Math.sqrt(totalExtractions + recentCount) * 10);
    
    scores.push({
      number: num,
      // New clear names
      historicalFrequency,
      recentFrequency,
      unsuccessfulPenalty,
      influenceScore: influenceScore * 100,  // Scale for readability
      normalizedScore: 0,  // Will be normalized below
      confidence,
      // Backward compatibility aliases
      priorProbability: historicalFrequency,
      likelihood: recentFrequency,
      posteriorProbability: 0,  // Will be set after normalization
    });
  }
  
  // Normalize scores to sum to 100 (for comparison purposes only)
  const totalScore = scores.reduce((sum, s) => sum + s.influenceScore, 0);
  if (totalScore > 0) {
    scores.forEach(s => {
      s.normalizedScore = (s.influenceScore / totalScore) * 100;
      s.posteriorProbability = s.normalizedScore;  // Backward compatibility
    });
  }
  
  // Sort by influence score (highest first)
  return scores.sort((a, b) => b.normalizedScore - a.normalizedScore);
}

/**
 * Calculate Impact Score for a combination (renamed from "Expected Value").
 * 
 * IMPORTANT: This is a PATTERN QUALITY score, NOT a monetary expected value!
 * It measures how well this combination would have performed against historical extractions.
 * 
 * Impact Score formula: Σ P(k matches) * k²
 * - Rewards combinations that historically would have matched more numbers
 * - k² weighting means higher matches are valued exponentially more
 * 
 * This does NOT predict future performance - the lottery is random.
 */
export function calculateExpectedValue(
  combination: number[],
  extractions: ExtractedNumbers[],
  numbersToSelect: number
): ExpectedValue {
  // Calculate distribution of match counts against historical extractions
  const matchCounts: number[] = Array(numbersToSelect + 1).fill(0);
  
  extractions.forEach(extraction => {
    const numbers = extraction.numbers || [];
    // Safety check: ensure numbers is an array
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return; // Skip this extraction if no valid numbers
    }
    const matches = combination.filter(num => numbers.includes(num)).length;
    if (matches <= numbersToSelect) {
      matchCounts[matches]++;
    }
  });
  
  // Normalize to distribution (what % of extractions had 0, 1, 2, ... matches)
  const total = extractions.length || 1;
  const matchDistribution = matchCounts.map(count => count / total);
  
  // Expected number of matches = Σ P(k) * k
  const expectedMatches = matchDistribution.reduce((sum, prob, k) => sum + prob * k, 0);
  
  // Impact Score = Σ P(k) * k²
  // This rewards combinations that achieve higher matches more heavily
  // Note: This is a QUALITY SCORE, not monetary expected value!
  const impactScore = matchDistribution.reduce((sum, prob, k) => {
    return sum + prob * Math.pow(k, 2);
  }, 0);
  
  return {
    combination,
    expectedMatches,
    // New clear names
    matchDistribution,
    impactScore,
    // Backward compatibility aliases
    winProbability: matchDistribution,
    expectedValue: impactScore,
  };
}

/**
 * Calculate Recommendation Fitness Score (renamed from "Pattern Score").
 * 
 * This measures how well a combination matches aesthetic/statistical criteria:
 * - Sum close to optimal (~273 for SuperEnalotto)
 * - Good spread across number range
 * - No consecutive sequences
 * - Numbers with high influence scores
 * - Balanced density (not too clustered)
 * 
 * IMPORTANT: A high score does NOT increase winning probability!
 * The lottery is uniformly random. This is purely for recommendation quality.
 * 
 * Score breakdown:
 * - Base: 100 points
 * - Sum deviation: -20 max (further from optimal = worse)
 * - Spread deviation: -15 max
 * - Consecutive sequences: -10 per sequence
 * - Influence score bonus: +30 max (higher influence = better)
 * - Density deviation: -10 max
 */
export function calculatePatternScore(
  distribution: DistributionAnalysis,
  optimalDistribution: DistributionAnalysis,
  influenceScores: BayesianProbability[],
  combination: number[]
): number {
  let score = 100;
  
  // Sum deviation penalty (max -20 points)
  // Measures how close the sum is to the optimal average
  const sumDiff = optimalDistribution.sum > 0 
    ? Math.abs(distribution.sum - optimalDistribution.sum) / optimalDistribution.sum
    : 0;
  score -= Math.min(20, sumDiff * 20);
  
  // Spread deviation penalty (max -15 points)
  // Measures if numbers are spread across the range
  const spreadDiff = optimalDistribution.spread > 0
    ? Math.abs(distribution.spread - optimalDistribution.spread) / optimalDistribution.spread
    : 0;
  score -= Math.min(15, spreadDiff * 15);
  
  // Consecutive sequence penalty (-10 per sequence, max -30)
  // Sequences like 5,6,7 are common but no more likely to win
  score -= Math.min(30, distribution.consecutiveSequences * 10);
  
  // Influence score bonus (max +30 points)
  // Rewards selecting numbers with high historical + recent frequency
  const avgInfluenceScore = combination.reduce((sum, num) => {
    const score = influenceScores.find(s => s.number === num);
    return sum + (score?.normalizedScore || score?.posteriorProbability || 0);
  }, 0) / combination.length;
  
  // Normalize: if avg influence score is ~1.11 (100/90 numbers), give ~10 points
  // If higher than average, give bonus up to 30 points
  score += Math.min(30, (avgInfluenceScore / (100 / 90)) * 10);
  
  // Density deviation penalty (max -10 points)
  // Rewards balanced spacing (not too clustered, not too spread)
  const densityDiff = Math.abs(distribution.numberDensity - optimalDistribution.numberDensity);
  score -= Math.min(10, densityDiff * 10);
  
  // Clamp to 0-100 range
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

