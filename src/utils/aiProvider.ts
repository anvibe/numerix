import { openAIService } from './openaiService';
import { anthropicService } from './anthropicService';

const PROVIDER_STORAGE = 'numerix-ai-provider';
const DEBUG_PREFIX = '[Numerix AI]';

export type AIProviderId = 'openai' | 'anthropic';

export function getCurrentAIProvider(): AIProviderId {
  if (typeof window === 'undefined') return 'openai';
  const stored = localStorage.getItem(PROVIDER_STORAGE) as AIProviderId | null;
  if (stored === 'openai' || stored === 'anthropic') return stored;
  return 'openai';
}

export const AI_PROVIDER_CHANGED_EVENT = 'numerix-ai-provider-changed';

export function setCurrentAIProvider(provider: AIProviderId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROVIDER_STORAGE, provider);
  console.debug(`${DEBUG_PREFIX} Provider switched to: ${provider === 'openai' ? 'OpenAI' : 'Anthropic'}`);
  window.dispatchEvent(new CustomEvent(AI_PROVIDER_CHANGED_EVENT, { detail: provider }));
}

export function getCurrentAIService(): typeof openAIService | typeof anthropicService {
  const provider = getCurrentAIProvider();
  return provider === 'anthropic' ? anthropicService : openAIService;
}

/** Call when starting a cloud AI request for console debug */
export function logProviderForRequest(): void {
  const provider = getCurrentAIProvider();
  console.debug(`${DEBUG_PREFIX} Generating with: ${provider === 'openai' ? 'OpenAI' : 'Anthropic'}`);
}
