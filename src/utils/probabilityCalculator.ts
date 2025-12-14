/**
 * TRUE LOTTERY PROBABILITY CALCULATOR
 * 
 * This module calculates the REAL mathematical probabilities of lottery games.
 * These are immutable facts - no algorithm can change them.
 */

/**
 * Calculate the number of combinations C(n, k) = n! / (k! * (n-k)!)
 */
export function combinations(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  
  // Optimize by using the smaller k
  if (k > n - k) k = n - k;
  
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

/**
 * Calculate probability of matching exactly k numbers
 * in a lottery with N total numbers and M drawn numbers, picking P numbers
 * 
 * P(k matches) = C(M, k) * C(N-M, P-k) / C(N, P)
 * 
 * For SuperEnalotto: N=90, M=6 (drawn), P=6 (your picks)
 */
export function matchProbability(
  totalNumbers: number,    // N: total numbers in lottery (e.g., 90)
  drawnNumbers: number,    // M: how many numbers are drawn (e.g., 6)
  yourPicks: number,       // P: how many you pick (e.g., 6)
  matchCount: number       // k: how many you want to match
): number {
  const numerator = combinations(drawnNumbers, matchCount) * 
                    combinations(totalNumbers - drawnNumbers, yourPicks - matchCount);
  const denominator = combinations(totalNumbers, yourPicks);
  return numerator / denominator;
}

/**
 * Calculate expected number of matches per play
 * E[matches] = Σ k * P(k matches)
 */
export function expectedMatches(
  totalNumbers: number,
  drawnNumbers: number,
  yourPicks: number
): number {
  let expected = 0;
  for (let k = 0; k <= Math.min(drawnNumbers, yourPicks); k++) {
    expected += k * matchProbability(totalNumbers, drawnNumbers, yourPicks, k);
  }
  return expected;
}

/**
 * Get full probability breakdown for a lottery game
 */
export interface LotteryProbabilities {
  game: string;
  totalNumbers: number;
  drawnNumbers: number;
  yourPicks: number;
  totalCombinations: number;
  expectedMatchesPerPlay: number;
  matchProbabilities: {
    matches: number;
    probability: number;
    odds: string;
    expectedPlaysToWin: number;
    humanReadable: string;
  }[];
}

export function calculateLotteryProbabilities(
  game: string,
  totalNumbers: number,
  drawnNumbers: number,
  yourPicks: number
): LotteryProbabilities {
  const totalCombinations = combinations(totalNumbers, yourPicks);
  const expectedMatchesValue = expectedMatches(totalNumbers, drawnNumbers, yourPicks);
  
  const matchProbabilities = [];
  
  for (let k = 0; k <= Math.min(drawnNumbers, yourPicks); k++) {
    const prob = matchProbability(totalNumbers, drawnNumbers, yourPicks, k);
    const expectedPlays = prob > 0 ? 1 / prob : Infinity;
    
    let humanReadable = '';
    if (expectedPlays < 2) {
      humanReadable = 'Almost every play';
    } else if (expectedPlays < 30) {
      humanReadable = `About ${Math.round(expectedPlays)} plays`;
    } else if (expectedPlays < 365) {
      humanReadable = `About ${Math.round(expectedPlays / 30)} months (3 plays/week)`;
    } else if (expectedPlays < 365 * 100) {
      humanReadable = `About ${Math.round(expectedPlays / 365)} years (daily play)`;
    } else if (expectedPlays < 365 * 10000) {
      humanReadable = `About ${Math.round(expectedPlays / 365).toLocaleString()} years`;
    } else {
      humanReadable = `Practically never (${Math.round(expectedPlays).toLocaleString()} plays)`;
    }
    
    matchProbabilities.push({
      matches: k,
      probability: prob,
      odds: prob > 0 ? `1 in ${Math.round(1/prob).toLocaleString()}` : 'Never',
      expectedPlaysToWin: expectedPlays,
      humanReadable,
    });
  }
  
  return {
    game,
    totalNumbers,
    drawnNumbers,
    yourPicks,
    totalCombinations,
    expectedMatchesPerPlay: expectedMatchesValue,
    matchProbabilities,
  };
}

// Pre-calculated probabilities for Italian lotteries
export const SUPERENALOTTO_PROBABILITIES = calculateLotteryProbabilities(
  'SuperEnalotto',
  90,  // 1-90
  6,   // 6 numbers drawn
  6    // You pick 6
);

export const LOTTO_PROBABILITIES = calculateLotteryProbabilities(
  'Lotto',
  90,  // 1-90
  5,   // 5 numbers drawn per wheel
  5    // You pick 5
);

export const MILLIONDAY_PROBABILITIES = calculateLotteryProbabilities(
  'MillionDAY',
  55,  // 1-55
  5,   // 5 numbers drawn
  5    // You pick 5
);

/**
 * IMPORTANT: This function demonstrates that ALL combinations have EQUAL probability
 */
export function demonstrateEqualProbability(): void {
  const combination1 = [1, 2, 3, 4, 5, 6];
  const combination2 = [7, 23, 45, 67, 78, 89];
  const combination3 = [11, 22, 33, 44, 55, 66];
  
  // All three have the EXACT same probability
  const prob = 1 / SUPERENALOTTO_PROBABILITIES.totalCombinations;
  
  console.log('=== ALL COMBINATIONS HAVE EQUAL PROBABILITY ===');
  console.log(`[1, 2, 3, 4, 5, 6] = ${prob.toExponential(4)}`);
  console.log(`[7, 23, 45, 67, 78, 89] = ${prob.toExponential(4)}`);
  console.log(`[11, 22, 33, 44, 55, 66] = ${prob.toExponential(4)}`);
  console.log('');
  console.log('The "1,2,3,4,5,6" looks unlikely because humans are bad at understanding randomness.');
  console.log('But statistically, it is EXACTLY as likely as any "random-looking" combination.');
}

