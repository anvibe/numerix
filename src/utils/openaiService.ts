import OpenAI from 'openai';
import { GameType, GameStatistics, LottoWheel, UnsuccessfulCombination, ExtractedNumbers } from '../types';
import { getGameByType } from './generators';
import { calculateAdvancedStatistics, calculateDistributionAnalysis, DistributionAnalysis, CoOccurrence, BayesianProbability } from './advancedStatistics';

// OpenAI service class with latest models support
class OpenAIService {
  private client: OpenAI | null = null;
  private isConfigured = false;
  private model: string = 'gpt-4o'; // Default to latest model: gpt-4o (better performance/cost ratio)
  
  // Available models (in order of preference)
  private availableModels = [
    'gpt-4o',           // Latest: Best performance, faster, cheaper than GPT-4
    'gpt-4-turbo',      // Fast and powerful
    'gpt-4o-mini',      // More affordable, good performance
    'gpt-4',            // Original GPT-4 (fallback)
    'gpt-3.5-turbo'     // Fastest/cheapest (for testing)
  ];

  constructor() {
    // Check if API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
      this.isConfigured = true;
      
      // Allow model override via environment variable
      const modelOverride = import.meta.env.VITE_OPENAI_MODEL;
      if (modelOverride && this.availableModels.includes(modelOverride)) {
        this.model = modelOverride;
      }
    }
  }

  isAvailable(): boolean {
    return this.isConfigured && this.client !== null;
  }

  getModel(): string {
    return this.model;
  }

  setModel(model: string): void {
    if (this.availableModels.includes(model)) {
      this.model = model;
    } else {
      console.warn(`Model ${model} not in available models. Using default: ${this.model}`);
    }
  }

  async generateAIRecommendation(
    gameType: GameType,
    statistics: GameStatistics,
    unsuccessfulCombinations: UnsuccessfulCombination[],
    recentExtractions: ExtractedNumbers[],
    wheel?: LottoWheel,
    advancedStats?: import('../utils/advancedStatistics').AdvancedStatistics
  ): Promise<{
    numbers: number[];
    reasons: string[];
    jolly?: number;
    superstar?: number;
    confidence: number;
  }> {
    if (!this.client) {
      throw new Error('OpenAI client not configured. Please set VITE_OPENAI_API_KEY environment variable.');
    }

    const game = getGameByType(gameType);
    const stats = wheel && statistics.wheelStats ? statistics.wheelStats[wheel] : statistics;

    // Prepare enhanced context with advanced statistics
    const context = this.prepareEnhancedContext(
      gameType, 
      stats, 
      unsuccessfulCombinations, 
      recentExtractions, 
      wheel,
      advancedStats
    );

    try {
      // Add timestamp to prevent caching and encourage variation
      const timestamp = new Date().toISOString();
      const randomSeed = Math.floor(Math.random() * 1000);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are an expert lottery number analyst. IMPORTANT DISCLAIMER:
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

Generate a DIFFERENT combination each time. There are many statistically interesting combinations.`
          },
          {
            role: "user",
            content: `${context}\n\nRequest ID: ${timestamp}-${randomSeed}\nGenerate a unique combination - avoid repeating previous recommendations.`
          }
        ],
        temperature: 0.8, // Higher temperature for more variety while still being data-driven
        max_tokens: 1500, // Increased for more detailed analysis
        response_format: { type: "json_object" } // Force JSON response for better reliability
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      let result;
      try {
        result = typeof response === 'string' ? JSON.parse(response) : response;
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1]);
        } else {
          throw parseError;
        }
      }
      
      // Validate the response
      this.validateResponse(result, game);
      
      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate AI recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private prepareEnhancedContext(
    gameType: GameType,
    statistics: GameStatistics,
    unsuccessfulCombinations: UnsuccessfulCombination[],
    recentExtractions: ExtractedNumbers[],
    wheel?: LottoWheel,
    advancedStats?: import('../utils/advancedStatistics').AdvancedStatistics
  ): string {
    const game = getGameByType(gameType);
    
    let context = `LOTTERY ANALYSIS REQUEST - ADVANCED STATISTICAL ANALYSIS\n\n`;
    context += `Game: ${game.name}\n`;
    context += `Numbers to select: ${game.numbersToSelect}\n`;
    context += `Number range: 1-${game.maxNumber}\n`;
    if (wheel) context += `Wheel: ${wheel}\n`;
    context += `Model: ${this.model}\n`;
    context += `\n`;

    // Add advanced statistics if available
    if (advancedStats) {
      context += `=== STATISTICAL ANALYSIS (for ranking, NOT prediction) ===\n`;
      context += `NOTE: Every combination has the SAME probability of winning. These are ranking scores only.\n\n`;
      
      // Distribution Analysis
      context += `TARGET DISTRIBUTION PATTERNS (aesthetic criteria):\n`;
      context += `- Target Sum: ${advancedStats.distribution.sum.toFixed(1)} (average for ${game.numbersToSelect} numbers from 1-${game.maxNumber})\n`;
      context += `- Target Spread: ${advancedStats.distribution.spread.toFixed(1)} (numbers spread across range)\n`;
      context += `- Target Even/Odd Ratio: ${advancedStats.distribution.evenOddRatio.toFixed(2)} (balanced)\n`;
      context += `- Recommendation Fitness Score: ${advancedStats.patternScore.toFixed(1)}/100\n`;
      context += `\n`;
      
      // Influence Scores (renamed from Bayesian Probabilities)
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
      
      // Co-occurrences with Lift Score
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
      
      // Impact Scores (renamed from Expected Values)
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

    // Add frequent numbers
    if (statistics.frequentNumbers.length > 0) {
      context += `FREQUENT NUMBERS (most drawn historically):\n`;
      statistics.frequentNumbers.slice(0, 10).forEach(item => {
        context += `- ${item.number}: ${item.count} times (${item.percentage.toFixed(1)}%)\n`;
      });
      context += `\n`;
    }

    // Add delayed numbers
    if (statistics.delays.length > 0) {
      context += `DELAYED NUMBERS (longest without appearing):\n`;
      statistics.delays.slice(0, 10).forEach(item => {
        context += `- ${item.number}: ${item.delay} extractions ago\n`;
      });
      context += `\n`;
    }

    // Add unlucky patterns from unsuccessful combinations
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

    // Add recent extractions with distribution analysis
    if (recentExtractions.length > 0) {
      context += `RECENT EXTRACTIONS (last 5) with Distribution Analysis:\n`;
      recentExtractions.slice(0, 5).forEach(extraction => {
        const numbers = wheel && extraction.wheels ? extraction.wheels[wheel] : extraction.numbers;
        if (numbers && numbers.length > 0) {
          const dist = calculateDistributionAnalysis(numbers);
          context += `- ${extraction.date}: [${numbers.join(', ')}]`;
          if (gameType === 'superenalotto' && extraction.jolly) {
            context += ` (Jolly: ${extraction.jolly})`;
          }
          if (gameType === 'superenalotto' && extraction.superstar) {
            context += ` (SuperStar: ${extraction.superstar})`;
          }
          context += ` | Sum=${dist.sum}, Spread=${dist.spread}, `;
          context += `Even/Odd=${(dist.evenOddRatio * 100).toFixed(0)}%\n`;
        }
      });
      context += `\n`;
    }

    // Add unsuccessful combinations summary
    const relevantUnsuccessful = unsuccessfulCombinations.filter(combo => {
      if (combo.gameType !== gameType) return false;
      if (wheel && combo.wheel !== wheel) return false;
      return true;
    });

    if (relevantUnsuccessful.length > 0) {
      context += `UNSUCCESSFUL COMBINATIONS SUMMARY:\n`;
      context += `Total unsuccessful combinations: ${relevantUnsuccessful.length}\n`;
      
      // Show recent unsuccessful combinations with distribution analysis
      context += `Recent unsuccessful combinations (with distribution analysis):\n`;
      relevantUnsuccessful.slice(0, 5).forEach(combo => {
        const dist = calculateDistributionAnalysis(combo.numbers);
        context += `- [${combo.numbers.join(', ')}] (${combo.strategy || 'unknown'}) `;
        context += `| Sum=${dist.sum}, Spread=${dist.spread}\n`;
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
    context += `10. IMPORTANT: Generate a DIFFERENT combination each time\n`;
    context += `11. Many combinations are statistically interesting - explore variety\n`;
    context += `12. Vary approach: sometimes emphasize influence, sometimes lift, sometimes distribution\n`;
    
    // Add a random seed/timestamp to encourage variation
    const variationHint = Math.random() < 0.5 
      ? `\nVARIATION HINT: Focus on exploring alternative statistically optimal combinations. Consider different number ranges and distributions.\n`
      : `\nVARIATION HINT: Try a different approach this time - perhaps emphasize different statistical factors or explore less obvious but still valid combinations.\n`;
    context += variationHint;

    return context;
  }

  private validateResponse(result: any, game: any): void {
    if (!result.numbers || !Array.isArray(result.numbers)) {
      throw new Error('Invalid response: numbers must be an array');
    }

    if (result.numbers.length !== game.numbersToSelect) {
      throw new Error(`Invalid response: must have exactly ${game.numbersToSelect} numbers`);
    }

    if (result.numbers.some((n: any) => typeof n !== 'number' || n < 1 || n > game.maxNumber)) {
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

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini", // Use cheaper model for testing
        messages: [{ role: "user", content: "Test connection. Respond with 'OK'." }],
        max_tokens: 10
      });

      return completion.choices[0]?.message?.content?.includes('OK') || false;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();