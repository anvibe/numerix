import OpenAI from 'openai';
import { GameType, GameStatistics, LottoWheel, UnsuccessfulCombination, ExtractedNumbers } from '../types';
import { getGameByType } from './generators';

// OpenAI service class
class OpenAIService {
  private client: OpenAI | null = null;
  private isConfigured = false;

  constructor() {
    // Check if API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
      this.isConfigured = true;
    }
  }

  isAvailable(): boolean {
    return this.isConfigured && this.client !== null;
  }

  async generateAIRecommendation(
    gameType: GameType,
    statistics: GameStatistics,
    unsuccessfulCombinations: UnsuccessfulCombination[],
    recentExtractions: ExtractedNumbers[],
    wheel?: LottoWheel
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

    // Prepare context for OpenAI
    const context = this.prepareContext(gameType, stats, unsuccessfulCombinations, recentExtractions, wheel);

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert lottery number analyst with deep knowledge of statistical patterns, probability theory, and lottery systems. You analyze historical data, unsuccessful combinations, and statistical patterns to generate optimized number recommendations.

Your task is to analyze the provided lottery data and generate ${game.numbersToSelect} numbers between 1 and ${game.maxNumber} for ${game.name}${wheel ? ` (wheel: ${wheel})` : ''}.

Key principles:
1. Avoid numbers that frequently appear in unsuccessful combinations
2. Consider frequency patterns and delays in historical data
3. Balance hot numbers (frequent) with due numbers (delayed)
4. Avoid obvious patterns like consecutive sequences
5. Consider statistical probability and randomness
6. Provide clear reasoning for each recommendation

Respond ONLY with a valid JSON object in this exact format:
{
  "numbers": [array of ${game.numbersToSelect} unique numbers between 1-${game.maxNumber}],
  "jolly": ${gameType === 'superenalotto' ? 'number between 1-90 (different from main numbers)' : 'null'},
  "superstar": ${gameType === 'superenalotto' ? 'number between 1-90' : 'null'},
  "reasons": ["reason1", "reason2", "reason3"],
  "confidence": number between 0-100
}`
          },
          {
            role: "user",
            content: context
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const result = JSON.parse(response);
      
      // Validate the response
      this.validateResponse(result, game);
      
      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate AI recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private prepareContext(
    gameType: GameType,
    statistics: GameStatistics,
    unsuccessfulCombinations: UnsuccessfulCombination[],
    recentExtractions: ExtractedNumbers[],
    wheel?: LottoWheel
  ): string {
    const game = getGameByType(gameType);
    
    let context = `LOTTERY ANALYSIS REQUEST\n\n`;
    context += `Game: ${game.name}\n`;
    context += `Numbers to select: ${game.numbersToSelect}\n`;
    context += `Number range: 1-${game.maxNumber}\n`;
    if (wheel) context += `Wheel: ${wheel}\n`;
    context += `\n`;

    // Add frequent numbers
    if (statistics.frequentNumbers.length > 0) {
      context += `FREQUENT NUMBERS (most drawn):\n`;
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

    // Add recent extractions
    if (recentExtractions.length > 0) {
      context += `RECENT EXTRACTIONS (last 5):\n`;
      recentExtractions.slice(0, 5).forEach(extraction => {
        const numbers = wheel && extraction.wheels ? extraction.wheels[wheel] : extraction.numbers;
        if (numbers && numbers.length > 0) {
          context += `- ${extraction.date}: ${numbers.join(', ')}`;
          if (gameType === 'superenalotto' && extraction.jolly) {
            context += ` (Jolly: ${extraction.jolly})`;
          }
          if (gameType === 'superenalotto' && extraction.superstar) {
            context += ` (SuperStar: ${extraction.superstar})`;
          }
          context += `\n`;
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
      
      // Show recent unsuccessful combinations
      context += `Recent unsuccessful combinations:\n`;
      relevantUnsuccessful.slice(0, 5).forEach(combo => {
        context += `- ${combo.numbers.join(', ')} (${combo.strategy || 'unknown'} strategy)\n`;
      });
      context += `\n`;
    }

    context += `INSTRUCTIONS:\n`;
    context += `Generate ${game.numbersToSelect} optimal numbers considering:\n`;
    context += `1. Avoid numbers that appear frequently in unsuccessful combinations\n`;
    context += `2. Balance between frequent and delayed numbers\n`;
    context += `3. Avoid unlucky pairs and patterns\n`;
    context += `4. Consider recent extraction trends\n`;
    context += `5. Ensure statistical diversity\n`;
    context += `6. Provide confidence level (0-100) based on data quality and patterns\n`;

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
        model: "gpt-3.5-turbo",
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