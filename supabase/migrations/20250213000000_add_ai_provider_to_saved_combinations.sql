-- Add ai_provider to label saved combinations as OpenAI or Anthropic
-- Existing advanced-AI combinations are treated as OpenAI (backfill)

ALTER TABLE saved_combinations
ADD COLUMN IF NOT EXISTS ai_provider text
CHECK (ai_provider IS NULL OR ai_provider IN ('openai', 'anthropic'));

COMMENT ON COLUMN saved_combinations.ai_provider IS 'AI provider for advanced AI combinations: openai or anthropic. NULL for non-advanced or legacy.';

-- Backfill: all existing is_advanced_ai = true rows get labeled as OpenAI
UPDATE saved_combinations
SET ai_provider = 'openai'
WHERE is_advanced_ai = true AND (ai_provider IS NULL OR ai_provider = '');
