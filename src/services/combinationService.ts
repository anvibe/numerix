import { supabase, requireAuth } from '../utils/supabaseClient';
import { GeneratedCombination, UnsuccessfulCombination, GameType } from '../types';
import { Database } from '../types/supabase';

type SavedCombinationsRow = Database['public']['Tables']['saved_combinations']['Row'];
type SavedCombinationsInsert = Database['public']['Tables']['saved_combinations']['Insert'];
type UnsuccessfulCombinationsRow = Database['public']['Tables']['unsuccessful_combinations']['Row'];
type UnsuccessfulCombinationsInsert = Database['public']['Tables']['unsuccessful_combinations']['Insert'];

// Convert database row to GeneratedCombination type
const convertRowToGeneratedCombination = (row: SavedCombinationsRow): GeneratedCombination => {
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

      return data.map(convertRowToGeneratedCombination);
    } catch (error) {
      console.error('Error in getSavedCombinations:', error);
      return [];
    }
  },

  async saveCombination(combination: Omit<GeneratedCombination, 'id' | 'date'>): Promise<void> {
    try {
      const user = await requireAuth();
      
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