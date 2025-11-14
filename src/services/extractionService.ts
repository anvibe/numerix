import { supabase } from '../utils/supabaseClient';
import { ExtractedNumbers, GameType, LottoWheel } from '../types';
import { Database } from '../types/supabase';

type ExtractionsRow = Database['public']['Tables']['extractions']['Row'];
type ExtractionsInsert = Database['public']['Tables']['extractions']['Insert'];

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

// Convert ExtractedNumbers to database insert format
const convertExtractionToInsert = (
  gameType: GameType,
  extraction: ExtractedNumbers
): ExtractionsInsert => {
  return {
    game_type: gameType,
    extraction_date: extraction.date,
    numbers: extraction.numbers,
    wheels: extraction.wheels || null,
    jolly: extraction.jolly || null,
    superstar: extraction.superstar || null,
  };
};

export const extractionService = {
  // Get all extractions for a specific game type
  // IMPORTANT: Uses pagination to load ALL extractions (overcomes Supabase 1000 row limit)
  async getExtractions(gameType: GameType): Promise<ExtractedNumbers[]> {
    try {
      // First, get the total count
      const { count: totalCount, error: countError } = await supabase
        .from('extractions')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', gameType);

      if (countError) {
        console.error('Error getting extraction count:', countError);
        // Continue anyway, we'll paginate until we get no more data
      }

      // Supabase has a default limit of 1000 rows, so we need to paginate to get all
      let allData: ExtractionsRow[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('extractions')
          .select('*')
          .eq('game_type', gameType)
          .order('extraction_date', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Error fetching extractions:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allData = allData.concat(data);
        }

        // Check if we got all the data
        const receivedCount = data?.length || 0;
        if (receivedCount < pageSize) {
          // Got less than a full page, we're done
          hasMore = false;
        } else if (totalCount !== null && allData.length >= totalCount) {
          // Reached the total count
          hasMore = false;
        } else {
          // Continue to next page
          from += pageSize;
        }
      }

      const finalCount = totalCount || allData.length;
      console.log(`[ExtractionService] Loaded ${allData.length} extractions for ${gameType} (total in DB: ${finalCount})`);
      
      // Verify we got all the data
      if (totalCount !== null && allData.length !== totalCount) {
        console.warn(`[ExtractionService] WARNING: Expected ${totalCount} extractions but loaded ${allData.length} for ${gameType}`);
      }
      
      return allData.map(convertRowToExtraction);
    } catch (error) {
      console.error('Error in getExtractions:', error);
      return [];
    }
  },

  // Add a new extraction
  async addExtraction(gameType: GameType, extraction: ExtractedNumbers): Promise<void> {
    try {
      const insertData = convertExtractionToInsert(gameType, extraction);
      
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

  // Bulk insert extractions (useful for CSV imports)
  async bulkInsertExtractions(gameType: GameType, extractions: ExtractedNumbers[]): Promise<void> {
    try {
      const insertData = extractions.map(extraction => 
        convertExtractionToInsert(gameType, extraction)
      );

      // Insert in batches to avoid hitting limits
      const batchSize = 100;
      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('extractions')
          .insert(batch);

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

  // Replace all extractions for a game type (useful for CSV uploads)
  async replaceExtractions(gameType: GameType, extractions: ExtractedNumbers[]): Promise<void> {
    try {
      // First, delete existing extractions for this game type
      const { error: deleteError } = await supabase
        .from('extractions')
        .delete()
        .eq('game_type', gameType);

      if (deleteError) {
        console.error('Error deleting existing extractions:', deleteError);
        throw deleteError;
      }

      // Then insert new extractions
      await this.bulkInsertExtractions(gameType, extractions);
    } catch (error) {
      console.error('Error in replaceExtractions:', error);
      throw error;
    }
  },

  // Check if extractions exist for a game type
  async hasExtractions(gameType: GameType): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('extractions')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', gameType);

      if (error) {
        console.error('Error checking extractions:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('Error in hasExtractions:', error);
      return false;
    }
  },
  
  // Get total count of extractions for a game type (for diagnostics)
  async getExtractionCount(gameType: GameType): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('extractions')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', gameType);

      if (error) {
        console.error('Error getting extraction count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getExtractionCount:', error);
      return 0;
    }
  }
};