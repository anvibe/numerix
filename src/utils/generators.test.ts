import { describe, it, expect } from 'vitest';
import { generateCombination, generateAIRecommendation, getGameByType } from './generators';
import { GameStatistics, Frequency, Delay } from '../types';

// Create mock statistics for testing
const createMockStatistics = (): GameStatistics => {
  const frequentNumbers: Frequency[] = Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    count: 100 - i * 5,
    percentage: (100 - i * 5) / 100 * 100,
  }));

  const infrequentNumbers: Frequency[] = Array.from({ length: 10 }, (_, i) => ({
    number: 81 + i,
    count: 10 + i,
    percentage: (10 + i) / 100 * 100,
  }));

  const delays: Delay[] = Array.from({ length: 10 }, (_, i) => ({
    number: 41 + i,
    delay: 50 - i * 3,
  }));

  return {
    frequentNumbers,
    infrequentNumbers,
    delays,
    unluckyNumbers: [],
    unluckyPairs: [],
  };
};

describe('generators', () => {
  describe('getGameByType', () => {
    it('should return SuperEnalotto config', () => {
      const game = getGameByType('superenalotto');
      expect(game.id).toBe('superenalotto');
      expect(game.numbersToSelect).toBe(6);
      expect(game.maxNumber).toBe(90);
    });

    it('should return Lotto config', () => {
      const game = getGameByType('lotto');
      expect(game.id).toBe('lotto');
      expect(game.numbersToSelect).toBe(5);
      expect(game.maxNumber).toBe(90);
      expect(game.wheels).toBeDefined();
    });

    it('should return MillionDay config', () => {
      const game = getGameByType('millionday');
      expect(game.id).toBe('millionday');
      expect(game.numbersToSelect).toBe(5);
      expect(game.maxNumber).toBe(55);
    });

    it('should return 10eLotto config', () => {
      const game = getGameByType('10elotto');
      expect(game.id).toBe('10elotto');
      expect(game.numbersToSelect).toBe(10);
      expect(game.maxNumber).toBe(90);
    });
  });

  describe('generateCombination', () => {
    const mockStats = createMockStatistics();

    it('should generate correct number of numbers for SuperEnalotto', () => {
      const result = generateCombination('superenalotto', 'standard', mockStats);
      expect(result.numbers).toHaveLength(6);
    });

    it('should generate correct number of numbers for Lotto', () => {
      const result = generateCombination('lotto', 'standard', mockStats);
      expect(result.numbers).toHaveLength(5);
    });

    it('should generate correct number of numbers for MillionDay', () => {
      const result = generateCombination('millionday', 'standard', mockStats);
      expect(result.numbers).toHaveLength(5);
    });

    it('should generate numbers within valid range for SuperEnalotto', () => {
      const result = generateCombination('superenalotto', 'standard', mockStats);
      result.numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(90);
      });
    });

    it('should generate numbers within valid range for MillionDay', () => {
      const result = generateCombination('millionday', 'standard', mockStats);
      result.numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(55);
      });
    });

    it('should generate unique numbers', () => {
      const result = generateCombination('superenalotto', 'standard', mockStats);
      const uniqueNumbers = new Set(result.numbers);
      expect(uniqueNumbers.size).toBe(result.numbers.length);
    });

    it('should return sorted numbers', () => {
      const result = generateCombination('superenalotto', 'standard', mockStats);
      const sorted = [...result.numbers].sort((a, b) => a - b);
      expect(result.numbers).toEqual(sorted);
    });

    it('should generate Jolly for SuperEnalotto', () => {
      const result = generateCombination('superenalotto', 'standard', mockStats);
      expect(result.jolly).toBeDefined();
      expect(result.jolly).toBeGreaterThanOrEqual(1);
      expect(result.jolly).toBeLessThanOrEqual(90);
    });

    it('should generate Superstar for SuperEnalotto', () => {
      const result = generateCombination('superenalotto', 'standard', mockStats);
      expect(result.superstar).toBeDefined();
      expect(result.superstar).toBeGreaterThanOrEqual(1);
      expect(result.superstar).toBeLessThanOrEqual(90);
    });

    it('should generate Jolly not in main numbers', () => {
      const result = generateCombination('superenalotto', 'standard', mockStats);
      expect(result.numbers).not.toContain(result.jolly);
    });

    it('should work with high-variability strategy', () => {
      const result = generateCombination('superenalotto', 'high-variability', mockStats);
      expect(result.numbers).toHaveLength(6);
      expect(new Set(result.numbers).size).toBe(6);
    });

    it('should generate different combinations on multiple calls', () => {
      const results = Array.from({ length: 10 }, () => 
        generateCombination('superenalotto', 'standard', mockStats)
      );
      
      const uniqueCombinations = new Set(
        results.map(r => r.numbers.join(','))
      );
      
      // At least some combinations should be different
      expect(uniqueCombinations.size).toBeGreaterThan(1);
    });
  });

  describe('generateAIRecommendation', () => {
    const mockStats = createMockStatistics();

    it('should generate numbers with reasons', () => {
      const result = generateAIRecommendation('superenalotto', mockStats);
      expect(result.numbers).toHaveLength(6);
      expect(result.reasons).toBeDefined();
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should generate valid numbers for Lotto', () => {
      const result = generateAIRecommendation('lotto', mockStats);
      expect(result.numbers).toHaveLength(5);
      result.numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(90);
      });
    });

    it('should generate Jolly and Superstar for SuperEnalotto', () => {
      const result = generateAIRecommendation('superenalotto', mockStats);
      expect(result.jolly).toBeDefined();
      expect(result.superstar).toBeDefined();
    });

    it('should not generate Jolly/Superstar for Lotto', () => {
      const result = generateAIRecommendation('lotto', mockStats);
      expect(result.jolly).toBeUndefined();
      expect(result.superstar).toBeUndefined();
    });

    it('should provide meaningful reasons', () => {
      const result = generateAIRecommendation('superenalotto', mockStats);
      result.reasons.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });
  });
});

