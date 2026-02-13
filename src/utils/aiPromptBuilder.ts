import { GameType, GameStatistics, LottoWheel, UnsuccessfulCombination, ExtractedNumbers } from '../types';
import { getGameByType } from './generators';
import { calculateDistributionAnalysis } from './advancedStatistics';
import type { AdvancedStatistics } from './advancedStatistics';

export function buildSystemPrompt(
  gameType: GameType,
  game: { name: string; numbersToSelect: number; maxNumber: number },
  wheel?: LottoWheel
): string {
  return `You are an expert lottery number analyst. IMPORTANT DISCLAIMER:
⚠️ Every lottery combination has the SAME probability of winning. The lottery is uniformly random.
⚠️ These statistics are for ANALYSIS and VISUALIZATION only - they cannot predict outcomes.
⚠️ "Influence Scores" and "Pattern Scores" are RANKING metrics, NOT probabilities.

Your expertise includes:
- Statistical pattern recognition (historical trends, not predictions)
- Influence score analysis (combining historical + recent frequency for ranking)
- Distribution analysis (sum, spread, parity, decade distribution)
- Co-occurrence lift analysis (pairs that appear together more/less than expected)
- Pattern quality scoring (aesthetic criteria for combinations)

Your task is to generate ${game.numbersToSelect} numbers between 1 and ${game.maxNumber} for ${game.name}${wheel ? ` (wheel: ${wheel})` : ''} based on statistical analysis.

ANALYSIS PRINCIPLES (for interesting combinations, NOT winning predictions):
1. Use Influence Scores to rank numbers by historical + recent frequency
2. Consider distribution: target sum ~${Math.round((game.numbersToSelect * (game.maxNumber + 1)) / 2)}, good spread, balanced even/odd
3. Analyze co-occurrence lift - prefer numbers with positive lift scores
4. Avoid numbers frequently in user's unsuccessful combinations (personal preference)
5. Balance frequent numbers with delayed numbers for variety
6. Avoid consecutive sequences (e.g., 5-6-7)
7. Ensure statistical diversity across number ranges
8. Use lift scores to select complementary pairs

HONEST TERMINOLOGY:
- "Influence Score" = ranking metric combining historical + recent patterns (NOT probability)
- "Lift Score" = how often pairs co-occur vs expected (NOT correlation of winning)
- "Pattern Score" = aesthetic quality of combination (NOT winning likelihood)
- "Confidence" = data quality indicator (NOT prediction confidence)

Respond ONLY with a valid JSON object:
{
  "numbers": [array of ${game.numbersToSelect} unique numbers between 1-${game.maxNumber}],
  "jolly": ${gameType === 'superenalotto' ? 'number between 1-90 (different from main numbers)' : 'null'},
  "superstar": ${gameType === 'superenalotto' ? 'number between 1-90' : 'null'},
  "reasons": ["reason1", "reason2", "reason3", "reason4"],
  "confidence": number between 0-100 (data quality indicator),
  "analysis": {
    "distribution_score": number between 0-100,
    "bayesian_confidence": number between 0-100,
    "co_occurrence_score": number between 0-100
  }
}

Generate a DIFFERENT combination each time. There are many statistically interesting combinations.`;
}

export function buildUserContext(
  gameType: GameType,
  statistics: GameStatistics,
  unsuccessfulCombinations: UnsuccessfulCombination[],
  recentExtractions: ExtractedNumbers[],
  wheel?: LottoWheel,
  advancedStats?: AdvancedStatistics,
  modelLabel?: string
): string {
  const game = getGameByType(gameType);

  let context = `LOTTERY ANALYSIS REQUEST - ADVANCED STATISTICAL ANALYSIS\n\n`;
  context += `Game: ${game.name}\n`;
  context += `Numbers to select: ${game.numbersToSelect}\n`;
  context += `Number range: 1-${game.maxNumber}\n`;
  if (wheel) context += `Wheel: ${wheel}\n`;
  if (modelLabel) context += `Model: ${modelLabel}\n`;
  context += `\n`;

  if (advancedStats) {
    context += `=== STATISTICAL ANALYSIS (for ranking, NOT prediction) ===\n`;
    context += `NOTE: Every combination has the SAME probability of winning. These are ranking scores only.\n\n`;
    context += `TARGET DISTRIBUTION PATTERNS (aesthetic criteria):\n`;
    context += `- Target Sum: ${advancedStats.distribution.sum.toFixed(1)} (average for ${game.numbersToSelect} numbers from 1-${game.maxNumber})\n`;
    context += `- Target Spread: ${advancedStats.distribution.spread.toFixed(1)} (numbers spread across range)\n`;
    context += `- Target Even/Odd Ratio: ${advancedStats.distribution.evenOddRatio.toFixed(2)} (balanced)\n`;
    context += `- Recommendation Fitness Score: ${advancedStats.patternScore.toFixed(1)}/100\n`;
    context += `\n`;

    if (advancedStats.bayesianProbabilities.length > 0) {
      context += `INFLUENCE SCORES (Top 15 - ranking metric, NOT probabilities):\n`;
      context += `These combine historical frequency + recent patterns for recommendation:\n`;
      advancedStats.bayesianProbabilities.slice(0, 15).forEach(prob => {
        context += `- Number ${prob.number}: Historical=${prob.priorProbability.toFixed(1)}%, `;
        context += `Influence=${prob.posteriorProbability.toFixed(1)}, `;
        context += `Confidence=${prob.confidence.toFixed(1)}%\n`;
      });
      context += `\n`;
    }

    if (advancedStats.coOccurrences.length > 0) {
      context += `CO-OCCURRENCE LIFT SCORES (pairs that appear together more than expected):\n`;
      context += `Lift > 0 means they co-occur more often than random chance would predict.\n`;
      advancedStats.coOccurrences.slice(0, 10).forEach(co => {
        context += `- ${co.numbers[0]}-${co.numbers[1]}: `;
        context += `Observed=${co.frequency.toFixed(1)}%, `;
        context += `Expected=${co.expectedFrequency.toFixed(1)}%, `;
        context += `Lift=${co.lift?.toFixed(2) || 'N/A'}, `;
        context += `LiftScore=${co.correlation.toFixed(2)}\n`;
      });
      context += `\n`;
    }

    if (advancedStats.expectedValues.length > 0) {
      context += `IMPACT SCORES (pattern quality, NOT monetary value):\n`;
      context += `Measures how well combinations matched historical extractions.\n`;
      advancedStats.expectedValues.slice(0, 5).forEach(ev => {
        context += `- Combination [${ev.combination.join(', ')}]: `;
        context += `Avg Matches=${ev.expectedMatches.toFixed(2)}, `;
        context += `Impact=${ev.expectedValue.toFixed(2)}\n`;
      });
      context += `\n`;
    }
  }

  if (statistics.frequentNumbers.length > 0) {
    context += `FREQUENT NUMBERS (most drawn historically):\n`;
    statistics.frequentNumbers.slice(0, 10).forEach(item => {
      context += `- ${item.number}: ${item.count} times (${item.percentage.toFixed(1)}%)\n`;
    });
    context += `\n`;
  }

  if (statistics.delays.length > 0) {
    context += `DELAYED NUMBERS (longest without appearing):\n`;
    statistics.delays.slice(0, 10).forEach(item => {
      context += `- ${item.number}: ${item.delay} extractions ago\n`;
    });
    context += `\n`;
  }

  if (gameType === 'superenalotto' && statistics.jollyStats) {
    if (statistics.jollyStats.frequentNumbers.length > 0) {
      context += `JOLLY STATISTICS - FREQUENT NUMBERS:\n`;
      statistics.jollyStats.frequentNumbers.slice(0, 10).forEach(item => {
        context += `- Jolly ${item.number}: ${item.count} times (${item.percentage.toFixed(1)}%)\n`;
      });
      context += `\n`;
    }
    if (statistics.jollyStats.delays.length > 0) {
      context += `JOLLY STATISTICS - DELAYED NUMBERS:\n`;
      statistics.jollyStats.delays.slice(0, 5).forEach(item => {
        context += `- Jolly ${item.number}: ${item.delay} extractions ago\n`;
      });
      context += `\n`;
    }
  }

  if (gameType === 'superenalotto' && statistics.superstarStats) {
    if (statistics.superstarStats.frequentNumbers.length > 0) {
      context += `SUPERSTAR STATISTICS - FREQUENT NUMBERS:\n`;
      statistics.superstarStats.frequentNumbers.slice(0, 10).forEach(item => {
        context += `- SuperStar ${item.number}: ${item.count} times (${item.percentage.toFixed(1)}%)\n`;
      });
      context += `\n`;
    }
    if (statistics.superstarStats.delays.length > 0) {
      context += `SUPERSTAR STATISTICS - DELAYED NUMBERS:\n`;
      statistics.superstarStats.delays.slice(0, 5).forEach(item => {
        context += `- SuperStar ${item.number}: ${item.delay} extractions ago\n`;
      });
      context += `\n`;
    }
  }

  if (statistics.unluckyNumbers && statistics.unluckyNumbers.length > 0) {
    context += `UNLUCKY NUMBERS (frequently in unsuccessful combinations):\n`;
    statistics.unluckyNumbers.slice(0, 10).forEach(item => {
      context += `- ${item.number}: appeared in ${item.count} unsuccessful combinations (${item.percentage.toFixed(1)}%)\n`;
    });
    context += `\n`;
  }

  if (statistics.unluckyPairs && statistics.unluckyPairs.length > 0) {
    context += `UNLUCKY PAIRS (frequently together in unsuccessful combinations):\n`;
    statistics.unluckyPairs.slice(0, 5).forEach(pair => {
      context += `- ${pair.pair[0]}-${pair.pair[1]}: appeared together ${pair.count} times\n`;
    });
    context += `\n`;
  }

  if (recentExtractions.length > 0) {
    context += `RECENT EXTRACTIONS (last 5) with Distribution Analysis:\n`;
    recentExtractions.slice(0, 5).forEach(extraction => {
      const numbers = wheel && extraction.wheels ? extraction.wheels[wheel] : extraction.numbers;
      if (numbers && numbers.length > 0) {
        const dist = calculateDistributionAnalysis(numbers);
        context += `- ${extraction.date}: [${numbers.join(', ')}]`;
        if (gameType === 'superenalotto' && extraction.jolly) context += ` (Jolly: ${extraction.jolly})`;
        if (gameType === 'superenalotto' && extraction.superstar) context += ` (SuperStar: ${extraction.superstar})`;
        context += ` | Sum=${dist.sum}, Spread=${dist.spread}, Even/Odd=${(dist.evenOddRatio * 100).toFixed(0)}%\n`;
      }
    });
    context += `\n`;
  }

  const relevantUnsuccessful = unsuccessfulCombinations.filter(combo => {
    if (combo.gameType !== gameType) return false;
    if (wheel && combo.wheel !== wheel) return false;
    return true;
  });

  if (relevantUnsuccessful.length > 0) {
    context += `UNSUCCESSFUL COMBINATIONS SUMMARY:\n`;
    context += `Total unsuccessful combinations: ${relevantUnsuccessful.length}\n`;
    context += `Recent unsuccessful combinations (with distribution analysis):\n`;
    relevantUnsuccessful.slice(0, 5).forEach(combo => {
      const dist = calculateDistributionAnalysis(combo.numbers);
      context += `- [${combo.numbers.join(', ')}] (${combo.strategy || 'unknown'}) | Sum=${dist.sum}, Spread=${dist.spread}\n`;
    });
    context += `\n`;
  }

  context += `INSTRUCTIONS (for analysis-based recommendation, NOT prediction):\n`;
  context += `Generate ${game.numbersToSelect} statistically interesting numbers using:\n`;
  context += `1. Influence score analysis (historical + recent frequency ranking)\n`;
  context += `2. Distribution optimization (target sum, spread, parity, decades)\n`;
  context += `3. Co-occurrence lift (select numbers with positive lift scores)\n`;
  context += `4. Pattern quality maximization (aesthetic criteria)\n`;
  context += `5. Avoid patterns from user's unsuccessful combinations (personal preference)\n`;
  context += `6. Balance statistical diversity with pattern quality\n`;
  context += `7. Provide clear reasoning (avoid claiming "higher probability")\n`;
  context += `8. Data quality indicator based on sample size and consistency\n`;
  context += `9. Include distribution_score, influence_confidence, and lift_score in analysis\n`;
  if (gameType === 'superenalotto') {
    context += `10. For JOLLY: Prefer frequent Jolly numbers (see Jolly Statistics above)\n`;
    context += `11. For SUPERSTAR: Consider delayed SuperStar numbers for variety\n`;
    context += `12. IMPORTANT: Generate a DIFFERENT combination each time\n`;
    context += `13. Many combinations are statistically interesting - explore variety\n`;
    context += `14. Vary approach: sometimes emphasize influence, sometimes lift, sometimes distribution\n`;
  } else {
    context += `10. IMPORTANT: Generate a DIFFERENT combination each time\n`;
    context += `11. Many combinations are statistically interesting - explore variety\n`;
    context += `12. Vary approach: sometimes emphasize influence, sometimes lift, sometimes distribution\n`;
  }

  const variationHint = Math.random() < 0.5
    ? `\nVARIATION HINT: Focus on exploring alternative statistically optimal combinations. Consider different number ranges and distributions.\n`
    : `\nVARIATION HINT: Try a different approach this time - perhaps emphasize different statistical factors or explore less obvious but still valid combinations.\n`;
  context += variationHint;

  return context;
}

export function validateAIResponse(
  result: { numbers?: unknown[]; reasons?: unknown[]; confidence?: unknown; jolly?: unknown; superstar?: unknown },
  game: { numbersToSelect: number; maxNumber: number }
): void {
  if (!result.numbers || !Array.isArray(result.numbers)) {
    throw new Error('Invalid response: numbers must be an array');
  }
  if (result.numbers.length !== game.numbersToSelect) {
    throw new Error(`Invalid response: must have exactly ${game.numbersToSelect} numbers`);
  }
  if (result.numbers.some((n: unknown) => typeof n !== 'number' || n < 1 || n > game.maxNumber)) {
    throw new Error(`Invalid response: all numbers must be between 1 and ${game.maxNumber}`);
  }
  if (new Set(result.numbers).size !== result.numbers.length) {
    throw new Error('Invalid response: numbers must be unique');
  }
  if (!result.reasons || !Array.isArray(result.reasons)) {
    throw new Error('Invalid response: reasons must be an array');
  }
  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 100) {
    throw new Error('Invalid response: confidence must be a number between 0-100');
  }
}
