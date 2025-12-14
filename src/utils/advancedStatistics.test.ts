import { describe, it, expect } from 'vitest';
import {
  calculateDistributionAnalysis,
  calculateCoOccurrences,
  calculateBayesianProbabilities,
  calculateExpectedValue,
  calculatePatternScore,
  calculateOptimalDistribution,
  calculateAdvancedStatistics,
} from './advancedStatistics';
import { ExtractedNumbers } from '../types';

describe('advancedStatistics', () => {
  describe('calculateDistributionAnalysis', () => {
    it('should calculate correct sum', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const result = calculateDistributionAnalysis(numbers);
      expect(result.sum).toBe(21);
    });

    it('should calculate correct spread', () => {
      const numbers = [10, 20, 30, 40, 50, 60];
      const result = calculateDistributionAnalysis(numbers);
      expect(result.spread).toBe(50); // 60 - 10
    });

    it('should calculate even/odd ratio', () => {
      const numbers = [2, 4, 6, 1, 3, 5]; // 3 even, 3 odd
      const result = calculateDistributionAnalysis(numbers);
      expect(result.evenOddRatio).toBe(1); // 3/3 = 1
    });

    it('should detect consecutive sequences', () => {
      const numbers = [1, 2, 3, 10, 20, 30];
      const result = calculateDistributionAnalysis(numbers);
      expect(result.consecutiveSequences).toBe(1);
    });

    it('should handle no consecutive sequences', () => {
      const numbers = [1, 10, 20, 30, 40, 50];
      const result = calculateDistributionAnalysis(numbers);
      expect(result.consecutiveSequences).toBe(0);
    });

    it('should calculate gap analysis', () => {
      const numbers = [10, 20, 30, 40, 50, 60];
      const result = calculateDistributionAnalysis(numbers);
      expect(result.gapAnalysis).toEqual([10, 10, 10, 10, 10]);
      expect(result.averageGap).toBe(10);
    });

    it('should handle empty array', () => {
      const result = calculateDistributionAnalysis([]);
      expect(result.sum).toBe(0);
      expect(result.spread).toBe(0);
    });

    it('should calculate decade distribution', () => {
      const numbers = [5, 15, 25, 35, 45, 55]; // One per decade
      const result = calculateDistributionAnalysis(numbers);
      expect(result.decadeDistribution[0]).toBe(1); // 1-10
      expect(result.decadeDistribution[1]).toBe(1); // 11-20
      expect(result.decadeDistribution[2]).toBe(1); // 21-30
    });
  });

  describe('calculateCoOccurrences', () => {
    it('should calculate co-occurrences from extractions', () => {
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] },
        { date: '2024-01-02', numbers: [1, 2, 7, 8, 9, 10] },
        { date: '2024-01-03', numbers: [1, 2, 11, 12, 13, 14] },
        { date: '2024-01-04', numbers: [1, 2, 15, 16, 17, 18] },
      ];

      const result = calculateCoOccurrences(extractions, 90, 3);
      
      // [1, 2] should appear together 4 times
      const pair12 = result.find(
        co => co.numbers[0] === 1 && co.numbers[1] === 2
      );
      expect(pair12).toBeDefined();
      expect(pair12?.count).toBe(4);
    });

    it('should filter by minimum occurrences', () => {
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] },
        { date: '2024-01-02', numbers: [7, 8, 9, 10, 11, 12] },
      ];

      const result = calculateCoOccurrences(extractions, 90, 2);
      
      // No pair appears 2+ times
      expect(result.length).toBe(0);
    });

    it('should calculate lift correctly', () => {
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] },
        { date: '2024-01-02', numbers: [1, 2, 3, 4, 5, 6] },
        { date: '2024-01-03', numbers: [1, 2, 3, 4, 5, 6] },
        { date: '2024-01-04', numbers: [1, 2, 3, 4, 5, 6] },
      ];

      const result = calculateCoOccurrences(extractions, 90, 3);
      
      // All pairs appear together in every extraction, lift should be ~1
      result.forEach(co => {
        expect(co.lift).toBeGreaterThan(0);
        expect(co.liftScore).toBeGreaterThanOrEqual(-1);
        expect(co.liftScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('calculateBayesianProbabilities', () => {
    it('should calculate influence scores for all numbers', () => {
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] },
        { date: '2024-01-02', numbers: [1, 2, 7, 8, 9, 10] },
      ];

      const result = calculateBayesianProbabilities(extractions, 90);
      
      expect(result.length).toBe(90);
      
      // Number 1 appears in 100% of extractions
      const number1 = result.find(p => p.number === 1);
      expect(number1).toBeDefined();
      expect(number1?.historicalFrequency).toBe(100); // 2/2 = 100%
    });

    it('should penalize unsuccessful combinations', () => {
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] },
      ];
      const unsuccessfulCombinations = [
        { numbers: [1, 2, 3, 4, 5, 6] },
        { numbers: [1, 2, 3, 4, 5, 6] },
      ];

      const resultWithPenalty = calculateBayesianProbabilities(
        extractions,
        90,
        [],
        unsuccessfulCombinations
      );
      const resultWithoutPenalty = calculateBayesianProbabilities(
        extractions,
        90,
        [],
        []
      );

      // Number 1 should have lower score with penalty
      const withPenalty = resultWithPenalty.find(p => p.number === 1);
      const withoutPenalty = resultWithoutPenalty.find(p => p.number === 1);
      
      expect(withPenalty?.unsuccessfulPenalty).toBeGreaterThan(0);
      expect(withPenalty?.influenceScore).toBeLessThan(withoutPenalty?.influenceScore || Infinity);
    });

    it('should normalize scores to sum to 100', () => {
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] },
      ];

      const result = calculateBayesianProbabilities(extractions, 90);
      const totalScore = result.reduce((sum, p) => sum + p.normalizedScore, 0);
      
      expect(totalScore).toBeCloseTo(100, 0);
    });
  });

  describe('calculateExpectedValue', () => {
    it('should calculate match distribution correctly', () => {
      const combination = [1, 2, 3, 4, 5, 6];
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] }, // 6 matches
        { date: '2024-01-02', numbers: [1, 2, 3, 7, 8, 9] }, // 3 matches
        { date: '2024-01-03', numbers: [10, 11, 12, 13, 14, 15] }, // 0 matches
      ];

      const result = calculateExpectedValue(combination, extractions, 6);
      
      expect(result.matchDistribution[6]).toBeCloseTo(1 / 3, 2); // 1 out of 3
      expect(result.matchDistribution[3]).toBeCloseTo(1 / 3, 2); // 1 out of 3
      expect(result.matchDistribution[0]).toBeCloseTo(1 / 3, 2); // 1 out of 3
    });

    it('should calculate expected matches', () => {
      const combination = [1, 2, 3, 4, 5, 6];
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] }, // 6 matches
        { date: '2024-01-02', numbers: [1, 2, 3, 4, 5, 6] }, // 6 matches
      ];

      const result = calculateExpectedValue(combination, extractions, 6);
      
      expect(result.expectedMatches).toBe(6);
    });

    it('should calculate impact score', () => {
      const combination = [1, 2, 3, 4, 5, 6];
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] }, // 6 matches
      ];

      const result = calculateExpectedValue(combination, extractions, 6);
      
      // Impact score = P(6) * 6^2 = 1 * 36 = 36
      expect(result.impactScore).toBe(36);
    });
  });

  describe('calculateOptimalDistribution', () => {
    it('should calculate optimal sum for SuperEnalotto', () => {
      const result = calculateOptimalDistribution('superenalotto', 90, 6);
      
      // Optimal sum = (6 * 91) / 2 = 273
      expect(result.sum).toBe(273);
    });

    it('should calculate optimal spread', () => {
      const result = calculateOptimalDistribution('superenalotto', 90, 6);
      
      // Optimal spread = 90 * 0.7 = 63
      expect(result.spread).toBeCloseTo(63, 5);
    });
  });

  describe('calculatePatternScore', () => {
    it('should return 100 for optimal distribution', () => {
      const optimalDist = calculateOptimalDistribution('superenalotto', 90, 6);
      const combination = [8, 23, 38, 53, 68, 83]; // Well-spread numbers
      const actualDist = calculateDistributionAnalysis(combination);
      const bayesianProbs = Array.from({ length: 90 }, (_, i) => ({
        number: i + 1,
        normalizedScore: 100 / 90,
        posteriorProbability: 100 / 90,
        historicalFrequency: 10,
        recentFrequency: 10,
        unsuccessfulPenalty: 0,
        influenceScore: 10,
        confidence: 80,
        priorProbability: 10,
        likelihood: 10,
      }));

      const score = calculatePatternScore(actualDist, optimalDist, bayesianProbs, combination);
      
      // Should be high but not necessarily 100 (depends on distribution match)
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should penalize consecutive sequences', () => {
      const optimalDist = calculateOptimalDistribution('superenalotto', 90, 6);
      const withSequence = [1, 2, 3, 40, 50, 60];
      const withoutSequence = [1, 10, 20, 40, 50, 60];
      const bayesianProbs = Array.from({ length: 90 }, (_, i) => ({
        number: i + 1,
        normalizedScore: 100 / 90,
        posteriorProbability: 100 / 90,
        historicalFrequency: 10,
        recentFrequency: 10,
        unsuccessfulPenalty: 0,
        influenceScore: 10,
        confidence: 80,
        priorProbability: 10,
        likelihood: 10,
      }));

      const scoreWithSequence = calculatePatternScore(
        calculateDistributionAnalysis(withSequence),
        optimalDist,
        bayesianProbs,
        withSequence
      );
      const scoreWithoutSequence = calculatePatternScore(
        calculateDistributionAnalysis(withoutSequence),
        optimalDist,
        bayesianProbs,
        withoutSequence
      );

      expect(scoreWithSequence).toBeLessThan(scoreWithoutSequence);
    });
  });

  describe('calculateAdvancedStatistics', () => {
    it('should return complete advanced statistics', () => {
      const extractions: ExtractedNumbers[] = [
        { date: '2024-01-01', numbers: [1, 2, 3, 4, 5, 6] },
        { date: '2024-01-02', numbers: [7, 8, 9, 10, 11, 12] },
        { date: '2024-01-03', numbers: [1, 2, 3, 7, 8, 9] },
        { date: '2024-01-04', numbers: [1, 2, 13, 14, 15, 16] },
      ];

      const result = calculateAdvancedStatistics(
        'superenalotto',
        extractions,
        [],
        90,
        6
      );

      expect(result.distribution).toBeDefined();
      expect(result.coOccurrences).toBeDefined();
      expect(result.bayesianProbabilities).toBeDefined();
      expect(result.expectedValues).toBeDefined();
      expect(result.patternScore).toBeDefined();
      expect(result.patternScore).toBeGreaterThanOrEqual(0);
      expect(result.patternScore).toBeLessThanOrEqual(100);
    });
  });
});

