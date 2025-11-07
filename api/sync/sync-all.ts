import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { scrapeSuperEnalottoExtractions } from '../scrape/superenalotto';
import { ExtractedNumbers } from '../../src/types';

// Get Supabase client (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Helper function to convert extraction to database format
const convertExtractionToInsert = (gameType: string, extraction: ExtractedNumbers) => {
  return {
    game_type: gameType,
    extraction_date: extraction.date,
    numbers: extraction.numbers,
    wheels: extraction.wheels || null,
    jolly: extraction.jolly || null,
    superstar: extraction.superstar || null,
  };
};

async function syncSuperEnalotto() {
  try {
    console.log('Starting SuperEnalotto sync...');
    
    // Scrape extractions
    let extractions;
    try {
      extractions = await scrapeSuperEnalottoExtractions();
    } catch (scrapeError) {
      console.error('Error scraping SuperEnalotto:', scrapeError);
      return {
        success: false,
        message: scrapeError instanceof Error ? scrapeError.message : 'Scraping failed',
        total: 0,
        new: 0,
        error: scrapeError instanceof Error ? scrapeError.stack : String(scrapeError),
      };
    }
    
    if (extractions.length === 0) {
      return {
        success: false,
        message: 'No extractions found',
        total: 0,
        new: 0,
      };
    }
    
    console.log(`Found ${extractions.length} extractions`);
    
    // Check for existing extractions to avoid duplicates
    const supabase = getSupabaseClient();
    const existingDates = new Set<string>();
    const { data: existingExtractions } = await supabase
      .from('extractions')
      .select('extraction_date')
      .eq('game_type', 'superenalotto');
    
    if (existingExtractions) {
      existingExtractions.forEach((ext) => {
        existingDates.add(ext.extraction_date);
      });
    }
    
    // Filter out duplicates
    const newExtractions = extractions.filter(
      (ext) => !existingDates.has(ext.date)
    );
    
    console.log(`${newExtractions.length} new extractions to insert`);
    
    if (newExtractions.length === 0) {
      return {
        success: true,
        message: 'No new extractions found',
        total: extractions.length,
        new: 0,
      };
    }
    
    // Insert new extractions in batches
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < newExtractions.length; i += batchSize) {
      const batch = newExtractions.slice(i, i + batchSize);
      const insertData = batch.map((ext) => convertExtractionToInsert('superenalotto', ext));
      
      const { error } = await supabase
        .from('extractions')
        .insert(insertData);
      
      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }
      
      inserted += batch.length;
    }
    
    console.log(`Successfully inserted ${inserted} extractions`);
    
    return {
      success: true,
      message: `Successfully scraped and inserted ${inserted} new extractions`,
      total: extractions.length,
      new: inserted,
    };
  } catch (error) {
    console.error('Error in SuperEnalotto sync:', error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const gameType = (req.query.gameType as string) || req.body?.gameType || 'all';
    
    if (gameType === 'all') {
      // Sync all games
      const results: any = {};
      
      try {
        const superResult = await syncSuperEnalotto();
        results.superenalotto = superResult;
      } catch (error) {
        results.superenalotto = { 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
      
      // Add other games here as we implement them
      // results.lotto = await syncLotto();
      // results['10elotto'] = await sync10eLotto();
      // results.millionday = await syncMillionDAY();
      
      return res.status(200).json({
        success: true,
        message: 'Sync completed',
        results,
      });
    } else {
      // Sync single game
      if (!['superenalotto', 'lotto', '10elotto', 'millionday'].includes(gameType)) {
        return res.status(400).json({
          error: 'Invalid game type',
          message: `Game type must be one of: superenalotto, lotto, 10elotto, millionday`,
        });
      }
      
      if (gameType === 'superenalotto') {
        try {
          const result = await syncSuperEnalotto();
          return res.status(200).json({
            success: result.success,
            gameType,
            ...result,
          });
        } catch (syncError) {
          console.error('Error in syncSuperEnalotto:', syncError);
          return res.status(500).json({
            success: false,
            error: 'Sync failed',
            message: syncError instanceof Error ? syncError.message : 'Unknown error',
            gameType,
            details: process.env.NODE_ENV === 'development' ? (syncError instanceof Error ? syncError.stack : String(syncError)) : undefined,
          });
        }
      }
      
      // Other games not implemented yet
      return res.status(501).json({
        error: 'Not implemented',
        message: `Scraper for ${gameType} is not yet implemented`,
      });
    }
  } catch (error) {
    console.error('Error in sync handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', { errorMessage, errorStack });
    
    return res.status(500).json({
      error: 'Sync failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    });
  }
}

