export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      extractions: {
        Row: {
          id: string
          game_type: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          extraction_date: string
          numbers: number[]
          wheels: Json | null
          jolly: number | null
          superstar: number | null
          created_at: string
        }
        Insert: {
          id?: string
          game_type: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          extraction_date: string
          numbers: number[]
          wheels?: Json | null
          jolly?: number | null
          superstar?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          game_type?: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          extraction_date?: string
          numbers?: number[]
          wheels?: Json | null
          jolly?: number | null
          superstar?: number | null
          created_at?: string
        }
      }
      saved_combinations: {
        Row: {
          id: string
          user_id: string | null
          game_type: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          numbers: number[]
          strategy: string
          wheel: string | null
          jolly: number | null
          superstar: number | null
          is_ai: boolean
          is_advanced_ai: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          game_type: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          numbers: number[]
          strategy?: string
          wheel?: string | null
          jolly?: number | null
          superstar?: number | null
          is_ai?: boolean
          is_advanced_ai?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          game_type?: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          numbers?: number[]
          strategy?: string
          wheel?: string | null
          jolly?: number | null
          superstar?: number | null
          is_ai?: boolean
          is_advanced_ai?: boolean
          created_at?: string
        }
      }
      unsuccessful_combinations: {
        Row: {
          id: string
          user_id: string | null
          game_type: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          numbers: number[]
          draw_date: string | null
          wheel: string | null
          jolly: number | null
          superstar: number | null
          strategy: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          game_type: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          numbers: number[]
          draw_date?: string | null
          wheel?: string | null
          jolly?: number | null
          superstar?: number | null
          strategy?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          game_type?: 'superenalotto' | 'lotto' | '10elotto' | 'millionday'
          numbers?: number[]
          draw_date?: string | null
          wheel?: string | null
          jolly?: number | null
          superstar?: number | null
          strategy?: string | null
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}