import Anthropic from '@anthropic-ai/sdk';
import { GameType, GameStatistics, LottoWheel, UnsuccessfulCombination, ExtractedNumbers } from '../types';
import { getGameByType } from './generators';
import { buildSystemPrompt, buildUserContext, validateAIResponse } from './aiPromptBuilder';

const ANTHROPIC_KEY_STORAGE = 'numerix-anthropic-key';

function getAnthropicKey(): string | undefined {
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __VITE_ANTHROPIC_API_KEY?: string };
    if (win.__VITE_ANTHROPIC_API_KEY) return win.__VITE_ANTHROPIC_API_KEY;
    const stored = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
    if (stored) return stored;
  }
  return import.meta.env.VITE_ANTHROPIC_API_KEY;
}

const ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307'
];

class AnthropicService {
  private model: string = 'claude-sonnet-4-20250514';

  constructor() {
    const override = import.meta.env.VITE_ANTHROPIC_MODEL;
    if (override && ANTHROPIC_MODELS.includes(override)) {
      this.model = override;
    }
  }

  private getClient(): Anthropic | null {
    const apiKey = getAnthropicKey();
    if (!apiKey) return null;
    return new Anthropic({ apiKey });
  }

  isAvailable(): boolean {
    return !!getAnthropicKey();
  }

  getModel(): string {
    return this.model;
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
    const client = this.getClient();
    if (!client) {
      throw new Error('Anthropic client not configured. Please set VITE_ANTHROPIC_API_KEY or add your key in Impostazioni.');
    }

    const game = getGameByType(gameType);
    const stats = wheel && statistics.wheelStats ? statistics.wheelStats[wheel] : statistics;

    const systemPrompt = buildSystemPrompt(gameType, game, wheel);
    const context = buildUserContext(
      gameType, stats, unsuccessfulCombinations, recentExtractions, wheel, advancedStats, this.model
    );
    const timestamp = new Date().toISOString();
    const randomSeed = Math.floor(Math.random() * 1000);
    const userContent = `${context}\n\nRequest ID: ${timestamp}-${randomSeed}\nGenerate a unique combination - avoid repeating previous recommendations.`;

    try {
      const message = await client.messages.create({
        model: this.model,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      });

      const textBlock = message.content.find(block => block.type === 'text');
      const response = textBlock && 'text' in textBlock ? textBlock.text : '';
      if (!response) throw new Error('No response from Anthropic');

      let result: unknown;
      try {
        result = typeof response === 'string' ? JSON.parse(response) : response;
      } catch (parseError) {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) result = JSON.parse(jsonMatch[1]);
        else throw parseError;
      }
      validateAIResponse(result as Parameters<typeof validateAIResponse>[0], game);
      return result as { numbers: number[]; reasons: string[]; jolly?: number; superstar?: number; confidence: number };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Failed to generate AI recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      const message = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test connection. Respond with \'OK\'.' }]
      });
      const textBlock = message.content.find(block => block.type === 'text');
      const text = textBlock && 'text' in textBlock ? textBlock.text : '';
      return text.includes('OK');
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }
}

export const anthropicService = new AnthropicService();
