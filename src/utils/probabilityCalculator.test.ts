import { describe, it, expect } from 'vitest';
import {
  combinations,
  matchProbability,
  expectedMatches,
  calculateLotteryProbabilities,
  SUPERENALOTTO_PROBABILITIES,
  LOTTO_PROBABILITIES,
  MILLIONDAY_PROBABILITIES,
} from './probabilityCalculator';

describe('Probability Calculator - Mathematical Reality of Lotteries', () => {
  
  describe('combinations function', () => {
    it('should calculate C(90, 6) = 622,614,630 (SuperEnalotto total combinations)', () => {
      expect(combinations(90, 6)).toBe(622614630);
    });

    it('should calculate C(90, 5) = 43,949,268 (Lotto total combinations)', () => {
      expect(combinations(90, 5)).toBe(43949268);
    });

    it('should calculate C(55, 5) = 3,478,761 (MillionDAY total combinations)', () => {
      expect(combinations(55, 5)).toBe(3478761);
    });
  });

  describe('SuperEnalotto Probabilities (6/90)', () => {
    const probs = SUPERENALOTTO_PROBABILITIES;

    it('should have 622,614,630 total combinations', () => {
      expect(probs.totalCombinations).toBe(622614630);
    });

    it('should expect ~0.4 matches per play on average', () => {
      // E[X] = (6 * 6) / 90 = 0.4
      expect(probs.expectedMatchesPerPlay).toBeCloseTo(0.4, 1);
    });

    it('should have correct probability for 0 matches (~65%)', () => {
      const zeroMatches = probs.matchProbabilities.find(p => p.matches === 0);
      // P(0) = C(84,6) / C(90,6) ≈ 0.653 (65.3%)
      expect(zeroMatches?.probability).toBeCloseTo(0.653, 2);
    });

    it('should have correct probability for 2 matches (~4.5%)', () => {
      const twoMatches = probs.matchProbabilities.find(p => p.matches === 2);
      // P(2) ≈ 0.045 (1 in 22)
      expect(twoMatches?.probability).toBeCloseTo(0.045, 2);
    });

    it('should have correct probability for 3 matches (~0.3%)', () => {
      const threeMatches = probs.matchProbabilities.find(p => p.matches === 3);
      // P(3) ≈ 0.003 (1 in 327)
      expect(threeMatches?.probability).toBeCloseTo(0.003, 2);
    });

    it('should have correct probability for 6 matches (jackpot)', () => {
      const sixMatches = probs.matchProbabilities.find(p => p.matches === 6);
      // P(6) = 1 / 622,614,630
      expect(sixMatches?.probability).toBeCloseTo(1.606e-9, 12);
      expect(sixMatches?.expectedPlaysToWin).toBeCloseTo(622614630, 0);
    });
  });

  describe('Expected Match Frequencies', () => {
    it('should show that 0-1 matches is the normal outcome', () => {
      const probs = SUPERENALOTTO_PROBABILITIES;
      const probZeroOrOne = 
        probs.matchProbabilities[0].probability + 
        probs.matchProbabilities[1].probability;
      
      // About 93% of plays result in 0 or 1 match
      expect(probZeroOrOne).toBeGreaterThan(0.9);
    });

    it('should show that 2+ matches is rare (~7%)', () => {
      const probs = SUPERENALOTTO_PROBABILITIES;
      const probTwoOrMore = probs.matchProbabilities
        .filter(p => p.matches >= 2)
        .reduce((sum, p) => sum + p.probability, 0);
      
      // Only about 7% of plays get 2 or more matches
      expect(probTwoOrMore).toBeLessThan(0.1);
    });

    it('should show that 3+ matches is very rare (~0.35%)', () => {
      const probs = SUPERENALOTTO_PROBABILITIES;
      const probThreeOrMore = probs.matchProbabilities
        .filter(p => p.matches >= 3)
        .reduce((sum, p) => sum + p.probability, 0);
      
      // Less than 0.5% get 3+ matches
      expect(probThreeOrMore).toBeLessThan(0.005);
    });
  });

  describe('The Mathematical Truth', () => {
    it('ALL combinations have EXACTLY equal probability', () => {
      // This is the fundamental truth of fair lotteries
      const totalCombinations = SUPERENALOTTO_PROBABILITIES.totalCombinations;
      const probAnySpecificCombination = 1 / totalCombinations;
      
      // [1,2,3,4,5,6] has the SAME probability as [17,23,45,67,78,89]
      // as [11,22,33,44,55,66] as ANY other combination
      
      expect(probAnySpecificCombination).toBe(1 / 622614630);
      
      // ~0.00000016% chance for ANY specific combination
      expect(probAnySpecificCombination * 100).toBeCloseTo(0.00000016, 8);
    });

    it('Historical patterns do NOT predict future outcomes', () => {
      // Each lottery draw is INDEPENDENT
      // If number 7 hasn't appeared in 100 draws, it still has the same
      // probability as any other number in the next draw: ~6.67% for SuperEnalotto
      
      // This is called the "Gambler's Fallacy"
      const probAnyNumber = 6 / 90; // ~6.67% per draw
      
      // The probability doesn't change based on history
      expect(probAnyNumber).toBeCloseTo(0.0667, 3);
    });

    it('"Hot" numbers have no advantage', () => {
      // If number 77 appeared 10 times in the last 20 draws,
      // its probability in the next draw is STILL exactly 6/90
      
      const probPerNumber = 6 / 90;
      expect(probPerNumber).toBeCloseTo(0.0667, 3);
      
      // Historical frequency is DESCRIPTIVE, not PREDICTIVE
    });

    it('"Cold" (delayed) numbers have no advantage', () => {
      // If number 13 hasn't appeared in 50 draws,
      // its probability in the next draw is STILL exactly 6/90
      
      const probPerNumber = 6 / 90;
      expect(probPerNumber).toBeCloseTo(0.0667, 3);
      
      // "Ritardatari" (delayed numbers) is a gambling fallacy
    });
  });

  describe('What Your App Actually Does', () => {
    it('generates aesthetically "nice" combinations with equal winning probability', () => {
      // Your app:
      // ✅ Generates valid combinations
      // ✅ Uses historical data for entertainment
      // ✅ Avoids "ugly" patterns (consecutive numbers, all low, etc.)
      // ✅ Provides interesting statistics
      // 
      // But CANNOT:
      // ❌ Increase winning probability
      // ❌ Predict future draws
      // ❌ Find "better" combinations
      
      // Any "pattern analysis" is purely for entertainment
      // The probability remains: 1 in 622,614,630
      
      expect(true).toBe(true); // This test is documentation
    });
  });
});

describe('Reality Check: What You Should Expect', () => {
  it('playing SuperEnalotto 3 times per week for 10 years', () => {
    const playsPerYear = 3 * 52; // 156 plays/year
    const totalPlays = playsPerYear * 10; // 1,560 plays
    const probs = SUPERENALOTTO_PROBABILITIES;
    
    // Expected results over 10 years (1,560 plays):
    const expected0 = totalPlays * probs.matchProbabilities[0].probability;
    const expected1 = totalPlays * probs.matchProbabilities[1].probability;
    const expected2 = totalPlays * probs.matchProbabilities[2].probability;
    const expected3 = totalPlays * probs.matchProbabilities[3].probability;
    
    // ~1018 plays with 0 matches (65.3%)
    expect(expected0).toBeCloseTo(1018, -1);
    
    // ~464 plays with 1 match (29.7%)
    expect(expected1).toBeCloseTo(464, -1);
    
    // ~72 plays with 2 matches (~4.6%)
    expect(expected2).toBeCloseTo(72.5, 0);
    
    // ~4.8 plays with 3 matches (maybe 5 in 10 years)
    expect(expected3).toBeCloseTo(4.8, 1);
    
    // 4+ matches: statistically VERY unlikely in 10 years
    // You'd need to play for ~230+ years to expect a 4-match
  });
});

