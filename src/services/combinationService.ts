import { supabase, requireAuth } from '../utils/supabaseClient';
import { GeneratedCombination, UnsuccessfulCombination, GameType } from '../types';
import { Database } from '../types/supabase';

type SavedCombinationsRow = Database['public']['Tables']['saved_combinations']['Row'];
type SavedCombinationsInsert = Database['public']['Tables']['saved_combinations']['Insert'];
type UnsuccessfulCombinationsRow = Database['public']['Tables']['unsuccessful_combinations']['Row'];
type UnsuccessfulCombinationsInsert = Database['public']['Tables']['unsuccessful_combinations']['Insert'];

// Convert database row to GeneratedCombination type
const convertRowToGeneratedCombination = (row: SavedCombinationsRow & { ai_provider?: string | null }): GeneratedCombination => {
  const raw = row as Record<string, unknown>;
  const ap = raw.ai_provider as string | undefined | null;
  const aiProvider = ap === 'openai' || ap === 'anthropic' ? ap : undefined;
  return {
    id: row.id,
    gameType: row.game_type,
    numbers: row.numbers,
    date: row.created_at,
    strategy: row.strategy as 'standard' | 'high-variability',
    wheel: row.wheel as any,
    jolly: row.jolly || undefined,
    superstar: row.superstar || undefined,
    isAI: row.is_ai,
    isAdvancedAI: row.is_advanced_ai,
    aiProvider,
  };
};

// Convert database row to UnsuccessfulCombination type
const convertRowToUnsuccessfulCombination = (row: UnsuccessfulCombinationsRow): UnsuccessfulCombination => {
  return {
    id: row.id,
    gameType: row.game_type,
    numbers: row.numbers,
    dateAdded: row.created_at,
    drawDate: row.draw_date || undefined,
    wheel: row.wheel as any,
    jolly: row.jolly || undefined,
    superstar: row.superstar || undefined,
    strategy: row.strategy as any,
    notes: row.notes || undefined,
  };
};

export const combinationService = {
  // Saved Combinations
  async getSavedCombinations(): Promise<GeneratedCombination[]> {
    try {
      const user = await requireAuth();
      
      const { data, error } = await supabase
        .from('saved_combinations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved combinations:', error);
        throw error;
      }

      const allCombinations = data.map(convertRowToGeneratedCombination);
      if (process.env.NODE_ENV === 'development' && allCombinations.length > 0) {
        const withAdvanced = allCombinations.filter(c => c.isAdvancedAI);
        if (withAdvanced.length > 0) {
          console.debug('[Numerix] Loaded saved combinations: sample advanced-AI row', { isAdvancedAI: withAdvanced[0].isAdvancedAI, aiProvider: withAdvanced[0].aiProvider });
        }
      }
      
      // Deduplicate by ID first
      const uniqueByIdMap = new Map<string, GeneratedCombination>();
      allCombinations.forEach(combo => {
        if (!uniqueByIdMap.has(combo.id)) {
          uniqueByIdMap.set(combo.id, combo);
        }
      });
      
      // Then deduplicate by actual numbers (keep most recent)
      const uniqueNumbersMap = new Map<string, GeneratedCombination>();
      Array.from(uniqueByIdMap.values()).forEach(combo => {
        const sortedNumbers = [...combo.numbers].sort((a, b) => a - b);
        const numbersKey = `${sortedNumbers.join(',')}-${combo.gameType}`;
        
        if (!uniqueNumbersMap.has(numbersKey)) {
          uniqueNumbersMap.set(numbersKey, combo);
        } else {
          // Keep the most recent one if duplicate found
          const existing = uniqueNumbersMap.get(numbersKey)!;
          if (new Date(combo.date) > new Date(existing.date)) {
            uniqueNumbersMap.set(numbersKey, combo);
          }
        }
      });
      
      const deduplicated = Array.from(uniqueNumbersMap.values());
      
      if (process.env.NODE_ENV === 'development' && allCombinations.length !== deduplicated.length) {
        console.log(`Deduplication: ${allCombinations.length} → ${deduplicated.length} combinations (removed ${allCombinations.length - deduplicated.length} duplicates)`);
      }
      
      return deduplicated;
    } catch (error) {
      console.error('Error in getSavedCombinations:', error);
      return [];
    }
  },

  async saveCombination(combination: Omit<GeneratedCombination, 'id' | 'date'>): Promise<void> {
    try {
      const user = await requireAuth();
      
      // Validate numbers array
      if (!Array.isArray(combination.numbers) || combination.numbers.length === 0) {
        throw new Error('Invalid numbers array');
      }
      
      // Validate numbers are within valid range
      const gameConfigs: Record<string, { max: number; count: number }> = {
        'superenalotto': { max: 90, count: 6 },
        'lotto': { max: 90, count: 5 },
        '10elotto': { max: 90, count: 10 },
        'millionday': { max: 55, count: 5 }
      };
      
      const config = gameConfigs[combination.gameType];
      if (!config) {
        throw new Error('Invalid game type');
      }
      
      // Check count
      if (combination.numbers.length !== config.count) {
        throw new Error(`Per ${combination.gameType} devi selezionare esattamente ${config.count} numeri`);
      }
      
      // Check for duplicates within the combination
      if (new Set(combination.numbers).size !== combination.numbers.length) {
        throw new Error('Non puoi inserire numeri duplicati nella stessa combinazione');
      }
      
      // Check range
      const invalidNumbers = combination.numbers.filter(n => n < 1 || n > config.max);
      if (invalidNumbers.length > 0) {
        throw new Error(`Numeri non validi: ${invalidNumbers.join(', ')}. I numeri devono essere tra 1 e ${config.max}`);
      }
      
      // Check for duplicates before saving
      const sortedNumbers = [...combination.numbers].sort((a, b) => a - b);
      const numbersKey = sortedNumbers.join(',');
      
      const { data: existing } = await supabase
        .from('saved_combinations')
        .select('id, numbers')
        .eq('user_id', user.id)
        .eq('game_type', combination.gameType);
      
      if (existing && existing.length > 0) {
        // Check if this exact combination already exists
        const duplicate = existing.find(existingCombo => {
          const existingSorted = [...existingCombo.numbers].sort((a, b) => a - b);
          return existingSorted.join(',') === numbersKey;
        });
        
        if (duplicate) {
          console.warn('Combination already exists, skipping save:', numbersKey);
          throw new Error('Questa combinazione è già stata salvata');
        }
      }
      
      const insertData: SavedCombinationsInsert = {
        user_id: user.id,
        game_type: combination.gameType,
        numbers: combination.numbers,
        strategy: combination.strategy,
        wheel: combination.wheel || null,
        jolly: combination.jolly || null,
        superstar: combination.superstar || null,
        is_ai: combination.isAI || false,
        is_advanced_ai: combination.isAdvancedAI || false,
        ai_provider: combination.isAdvancedAI && (combination.aiProvider === 'openai' || combination.aiProvider === 'anthropic') ? combination.aiProvider : null,
      };

      const { error } = await supabase
        .from('saved_combinations')
        .insert(insertData);

      if (error) {
        console.error('Error saving combination:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveCombination:', error);
      throw error;
    }
  },
  
  // Cleanup function to remove duplicate combinations
  async removeDuplicateCombinations(): Promise<{ removed: number }> {
    try {
      const user = await requireAuth();
      
      // Get all combinations for this user
      const { data: allCombinations, error: fetchError } = await supabase
        .from('saved_combinations')
        .select('id, game_type, numbers, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      if (!allCombinations) return { removed: 0 };
      
      // Group by game type and find duplicates
      const groups = new Map<string, typeof allCombinations>();
      allCombinations.forEach(combo => {
        const key = combo.game_type;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(combo);
      });
      
      let removedCount = 0;
      const idsToDelete: string[] = [];
      
      // For each game type, find duplicates
      groups.forEach((combos, gameType) => {
        const seen = new Map<string, string>(); // numbersKey -> id to keep
        const duplicatesFound: Array<{ numbers: string, ids: string[] }> = [];
        
        combos.forEach(combo => {
          const sortedNumbers = [...combo.numbers].sort((a, b) => a - b);
          const numbersKey = sortedNumbers.join(',');
          
          if (seen.has(numbersKey)) {
            // Duplicate found - mark older one for deletion
            const existingId = seen.get(numbersKey)!;
            const existingCombo = combos.find(c => c.id === existingId);
            const currentCombo = combo;
            
            // Track duplicates for logging
            const existingDuplicate = duplicatesFound.find(d => d.numbers === numbersKey);
            if (existingDuplicate) {
              existingDuplicate.ids.push(currentCombo.id);
            } else {
              duplicatesFound.push({ numbers: numbersKey, ids: [existingId, currentCombo.id] });
            }
            
            // Keep the most recent one
            if (existingCombo && new Date(existingCombo.created_at) < new Date(currentCombo.created_at)) {
              idsToDelete.push(existingId);
              seen.set(numbersKey, currentCombo.id);
            } else {
              idsToDelete.push(currentCombo.id);
            }
          } else {
            seen.set(numbersKey, combo.id);
          }
        });
        
        if (duplicatesFound.length > 0) {
          console.log(`🔍 Found ${duplicatesFound.length} duplicate number sets for ${gameType}:`, duplicatesFound.slice(0, 5));
        } else {
          console.log(`✅ No duplicates found for ${gameType} - all ${combos.length} combinations are unique by numbers`);
        }
      });
      
      // Delete duplicates
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('saved_combinations')
          .delete()
          .eq('user_id', user.id)
          .in('id', idsToDelete);
        
        if (deleteError) throw deleteError;
        removedCount = idsToDelete.length;
      }
      
      return { removed: removedCount };
    } catch (error) {
      console.error('Error removing duplicates:', error);
      throw error;
    }
  },

  async deleteSavedCombination(id: string): Promise<void> {
    try {
      const user = await requireAuth();
      
      const { error } = await supabase
        .from('saved_combinations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting saved combination:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteSavedCombination:', error);
      throw error;
    }
  },

  async clearSavedCombinations(): Promise<void> {
    try {
      const user = await requireAuth();
      
      const { error } = await supabase
        .from('saved_combinations')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing saved combinations:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in clearSavedCombinations:', error);
      throw error;
    }
  },

  // Unsuccessful Combinations
  async getUnsuccessfulCombinations(): Promise<UnsuccessfulCombination[]> {
    try {
      const user = await requireAuth();
      
      const { data, error } = await supabase
        .from('unsuccessful_combinations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching unsuccessful combinations:', error);
        throw error;
      }

      return data.map(convertRowToUnsuccessfulCombination);
    } catch (error) {
      console.error('Error in getUnsuccessfulCombinations:', error);
      return [];
    }
  },

  async addUnsuccessfulCombination(combination: Omit<UnsuccessfulCombination, 'id' | 'dateAdded'>): Promise<void> {
    try {
      const user = await requireAuth();
      
      const insertData: UnsuccessfulCombinationsInsert = {
        user_id: user.id,
        game_type: combination.gameType,
        numbers: combination.numbers,
        draw_date: combination.drawDate || null,
        wheel: combination.wheel || null,
        jolly: combination.jolly || null,
        superstar: combination.superstar || null,
        strategy: combination.strategy || null,
        notes: combination.notes || null,
      };

      const { error } = await supabase
        .from('unsuccessful_combinations')
        .insert(insertData);

      if (error) {
        console.error('Error adding unsuccessful combination:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in addUnsuccessfulCombination:', error);
      throw error;
    }
  },

  async deleteUnsuccessfulCombination(id: string): Promise<void> {
    try {
      const user = await requireAuth();
      
      const { error } = await supabase
        .from('unsuccessful_combinations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting unsuccessful combination:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteUnsuccessfulCombination:', error);
      throw error;
    }
  },

  async clearUnsuccessfulCombinations(): Promise<void> {
    try {
      const user = await requireAuth();
      
      const { error } = await supabase
        .from('unsuccessful_combinations')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing unsuccessful combinations:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in clearUnsuccessfulCombinations:', error);
      throw error;
    }
  }
};