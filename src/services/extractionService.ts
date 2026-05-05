import { getAuthHeaders, supabase, requireAuth } from '../utils/supabaseClient';
import { ExtractedNumbers, GameType, LottoWheel } from '../types';
import { Database } from '../types/supabase';
import { ApiService } from '../utils/apiService';

type ExtractionsRow = Database['public']['Tables']['extractions']['Row'];
type ExtractionsInsert = Database['public']['Tables']['extractions']['Insert'];

// Unique key for deduplication (same as API: date + numbers + wheels + jolly + superstar)
function getExtractionKey(extraction: ExtractedNumbers): string {
  const sortedNumbers = [...extraction.numbers].sort((a, b) => a - b).join(',');
  const wheelsStr = extraction.wheels != null ? JSON.stringify(extraction.wheels) : 'null';
  return `${extraction.date}|${sortedNumbers}|${wheelsStr}|${extraction.jolly ?? 'null'}|${extraction.superstar ?? 'null'}`;
}

// Convert database row to ExtractedNumbers type
const convertRowToExtraction = (row: ExtractionsRow): ExtractedNumbers => {
  return {
    date: row.extraction_date,
    numbers: row.numbers,
    wheels: row.wheels as Record<LottoWheel, number[]> | undefined,
    jolly: row.jolly || undefined,
    superstar: row.superstar || undefined,
  };
};

// Convert ExtractedNumbers to database insert format (created_by must be set by caller for RLS)
const convertExtractionToInsert = (
  gameType: GameType,
  extraction: ExtractedNumbers,
  createdBy: string
): ExtractionsInsert => {
  return {
    game_type: gameType,
    extraction_date: extraction.date,
    numbers: extraction.numbers,
    wheels: extraction.wheels || null,
    jolly: extraction.jolly || null,
    superstar: extraction.superstar || null,
    created_by: createdBy,
  };
};

export const extractionService = {
  // Get all extractions for a specific game type
  // IMPORTANT: Uses pagination to load ALL extractions (overcomes Supabase 1000 row limit)
  async getExtractions(gameType: GameType): Promise<ExtractedNumbers[]> {
    try {
      // Read via server-side endpoint so the base table can stay locked down.
      const headers = await getAuthHeaders();
      const response = await ApiService.get(`/extractions?gameType=${encodeURIComponent(gameType)}`, headers);
      const json = await response.json();
      const allData: ExtractionsRow[] = (json?.data ?? []) as ExtractionsRow[];

      console.log(`[ExtractionService] Loaded ${allData.length} extractions for ${gameType} (via /api)`);

      const mapped = allData.map(convertRowToExtraction);
      // Deduplicate by (date, numbers, wheels, jolly, superstar) - keep first occurrence (order already by extraction_date desc)
      const seen = new Set<string>();
      const deduped = mapped.filter((ext) => {
        const key = getExtractionKey(ext);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (deduped.length < mapped.length) {
        console.log(`[ExtractionService] Deduplicated ${gameType}: ${mapped.length} → ${deduped.length} (removed ${mapped.length - deduped.length} duplicates)`);
      }
      return deduped;
    } catch (error) {
      console.error('Error in getExtractions:', error);
      return [];
    }
  },

  // Add a new extraction (requires auth; created_by set for RLS)
  async addExtraction(gameType: GameType, extraction: ExtractedNumbers): Promise<void> {
    try {
      const user = await requireAuth();
      const insertData = convertExtractionToInsert(gameType, extraction, user.id);

      const { error } = await supabase
        .from('extractions')
        .insert(insertData);

      if (error) {
        console.error('Error adding extraction:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in addExtraction:', error);
      throw error;
    }
  },

  // Bulk insert extractions (useful for CSV imports; requires auth for RLS)
  async bulkInsertExtractions(gameType: GameType, extractions: ExtractedNumbers[]): Promise<void> {
    try {
      const user = await requireAuth();
      const insertData = extractions.map(extraction =>
        convertExtractionToInsert(gameType, extraction, user.id)
      );

      const batchSize = 100;
      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        const { error } = await supabase.from('extractions').insert(batch);
        if (error) {
          console.error('Error in bulk insert batch:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in bulkInsertExtractions:', error);
      throw error;
    }
  },

  // Replace all extractions for a game type that this user created (useful for CSV uploads)
  async replaceExtractions(gameType: GameType, extractions: ExtractedNumbers[]): Promise<void> {
    try {
      const user = await requireAuth();
      // Delete only rows this user created for this game type (RLS requires created_by = auth.uid())
      const { error: deleteError } = await supabase
        .from('extractions')
        .delete()
        .eq('game_type', gameType)
        .eq('created_by', user.id);

      if (deleteError) {
        console.error('Error deleting existing extractions:', deleteError);
        throw deleteError;
      }

      await this.bulkInsertExtractions(gameType, extractions);
    } catch (error) {
      console.error('Error in replaceExtractions:', error);
      throw error;
    }
  },

  // Check if extractions exist for a game type
  async hasExtractions(gameType: GameType): Promise<boolean> {
    try {
      const rows = await this.getExtractions(gameType);
      return rows.length > 0;
    } catch (error) {
      console.error('Error in hasExtractions:', error);
      return false;
    }
  },
  
  // Get total count of extractions for a game type (for diagnostics)
  async getExtractionCount(gameType: GameType): Promise<number> {
    try {
      const rows = await this.getExtractions(gameType);
      return rows.length;
    } catch (error) {
      console.error('Error in getExtractionCount:', error);
      return 0;
    }
  }
};