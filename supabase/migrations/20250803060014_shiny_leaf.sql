/*
  # Create Lottery Application Database Schema

  1. New Tables
    - `extractions`
      - `id` (uuid, primary key)
      - `game_type` (text)
      - `extraction_date` (date)
      - `numbers` (integer array)
      - `wheels` (jsonb, for lotto wheels data)
      - `jolly` (integer, nullable)
      - `superstar` (integer, nullable)
      - `created_at` (timestamp)
    
    - `saved_combinations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `game_type` (text)
      - `numbers` (integer array)
      - `strategy` (text)
      - `wheel` (text, nullable)
      - `jolly` (integer, nullable)
      - `superstar` (integer, nullable)
      - `is_ai` (boolean)
      - `is_advanced_ai` (boolean)
      - `created_at` (timestamp)
    
    - `unsuccessful_combinations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `game_type` (text)
      - `numbers` (integer array)
      - `draw_date` (date, nullable)
      - `wheel` (text, nullable)
      - `jolly` (integer, nullable)
      - `superstar` (integer, nullable)
      - `strategy` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Public read access for extractions table
*/

-- Create extractions table (public data)
CREATE TABLE IF NOT EXISTS extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type text NOT NULL CHECK (game_type IN ('superenalotto', 'lotto', '10elotto', 'millionday')),
  extraction_date date NOT NULL,
  numbers integer[] NOT NULL,
  wheels jsonb,
  jolly integer,
  superstar integer,
  created_at timestamptz DEFAULT now()
);

-- Create saved_combinations table (user-specific data)
CREATE TABLE IF NOT EXISTS saved_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('superenalotto', 'lotto', '10elotto', 'millionday')),
  numbers integer[] NOT NULL,
  strategy text NOT NULL DEFAULT 'standard',
  wheel text,
  jolly integer,
  superstar integer,
  is_ai boolean DEFAULT false,
  is_advanced_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create unsuccessful_combinations table (user-specific data)
CREATE TABLE IF NOT EXISTS unsuccessful_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('superenalotto', 'lotto', '10elotto', 'millionday')),
  numbers integer[] NOT NULL,
  draw_date date,
  wheel text,
  jolly integer,
  superstar integer,
  strategy text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsuccessful_combinations ENABLE ROW LEVEL SECURITY;

-- Policies for extractions (public read, authenticated write)
CREATE POLICY "Anyone can read extractions"
  ON extractions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert extractions"
  ON extractions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update extractions"
  ON extractions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for saved_combinations (users can only access their own data)
CREATE POLICY "Users can read own saved combinations"
  ON saved_combinations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved combinations"
  ON saved_combinations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved combinations"
  ON saved_combinations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved combinations"
  ON saved_combinations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for unsuccessful_combinations (users can only access their own data)
CREATE POLICY "Users can read own unsuccessful combinations"
  ON unsuccessful_combinations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unsuccessful combinations"
  ON unsuccessful_combinations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unsuccessful combinations"
  ON unsuccessful_combinations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own unsuccessful combinations"
  ON unsuccessful_combinations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_extractions_game_type_date ON extractions(game_type, extraction_date DESC);
CREATE INDEX IF NOT EXISTS idx_saved_combinations_user_game ON saved_combinations(user_id, game_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unsuccessful_combinations_user_game ON unsuccessful_combinations(user_id, game_type, created_at DESC);