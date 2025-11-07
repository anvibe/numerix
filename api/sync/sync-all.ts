import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { scrapeSuperEnalottoExtractions } from '../scrape/superenalotto';

// Define types locally to avoid import issues
interface ExtractedNumbers {
  date: string;
  numbers: number[];
  wheels?: Record<string, number[]>;
  jolly?: number;
  superstar?: number;
}

// Valid game types
const VALID_GAME_TYPES = ['superenalotto', 'lotto', '10elotto', 'millionday'] as const;
type GameType = typeof VALID_GAME_TYPES[number];

// Helper to return API errors with structured logging
function toApiError(res: VercelResponse, status: number, message: string, details?: unknown) {
  const errorInfo = {
    status,
    message,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };
  console.error('[sync-all]', errorInfo);
  return res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
  });
}

// Get Supabase client (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  // Try service role key for server-side operations (bypasses RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL or SUPABASE_URL environment variable is missing');
  }

  if (!supabaseKey && !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is missing');
  }

  // Use service role key if available (for server-side operations that bypass RLS)
  const key = serviceRoleKey || supabaseKey!;
  
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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

async function syncSuperEnalotto(): Promise<{
  success: boolean;
  message: string;
  total: number;
  new: number;
  error?: string;
}> {
  try {
    console.log('Starting SuperEnalotto sync...');
    
    // Scrape extractions with timeout protection
    let extractions;
    try {
      // Add timeout wrapper
      const scrapePromise = scrapeSuperEnalottoExtractions();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Scraping timeout after 30 seconds')), 30000);
      });
      
      extractions = await Promise.race([scrapePromise, timeoutPromise]);
    } catch (scrapeError) {
      console.error('Error scraping SuperEnalotto:', scrapeError);
      const errorMessage = scrapeError instanceof Error ? scrapeError.message : 'Scraping failed';
      const errorStack = scrapeError instanceof Error ? scrapeError.stack : String(scrapeError);
      console.error('Scrape error details:', { errorMessage, errorStack });
      
      return {
        success: false,
        message: errorMessage,
        total: 0,
        new: 0,
        error: errorStack,
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
    let existingDates = new Set<string>();
    try {
      const supabase = getSupabaseClient();
      const { data: existingExtractions, error: queryError } = await supabase
        .from('extractions')
        .select('extraction_date')
        .eq('game_type', 'superenalotto')
        .limit(10000); // Add limit to prevent huge queries
      
      if (queryError) {
        console.error('Error querying existing extractions:', queryError);
        throw queryError;
      }
      
      if (existingExtractions) {
        existingExtractions.forEach((ext) => {
          existingDates.add(ext.extraction_date);
        });
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return {
        success: false,
        message: dbError instanceof Error ? dbError.message : 'Database query failed',
        total: extractions.length,
        new: 0,
        error: dbError instanceof Error ? dbError.stack : String(dbError),
      };
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
    
    // Insert new extractions in batches with error handling
    const batchSize = 50;
    let inserted = 0;
    const supabase = getSupabaseClient();
    
    for (let i = 0; i < newExtractions.length; i += batchSize) {
      try {
        const batch = newExtractions.slice(i, i + batchSize);
        const insertData = batch.map((ext) => convertExtractionToInsert('superenalotto', ext));
        
        const { error, data } = await supabase
          .from('extractions')
          .insert(insertData)
          .select();
        
        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
          // Continue with other batches instead of failing completely
          console.warn(`Skipping batch ${i / batchSize + 1}, continuing...`);
          continue;
        }
        
        inserted += batch.length;
        console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(newExtractions.length / batchSize)}: ${batch.length} items`);
      } catch (batchError) {
        console.error(`Exception in batch ${i / batchSize + 1}:`, batchError);
        // Continue with next batch
        continue;
      }
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
  // Wrap everything in try-catch to catch initialization errors
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('[sync-all] Handler called', { method: req.method, query: req.query, body: req.body });
    
    // Validate environment variables upfront
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      return toApiError(res, 500, 'VITE_SUPABASE_URL or SUPABASE_URL is not configured');
    }
    
    if (!supabaseKey && !serviceRoleKey) {
      return toApiError(res, 500, 'VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is not configured');
    }
    
    try {
    // Validate input
    const gameType = (req.query.gameType as string) || req.body?.gameType || 'all';
    
    if (!gameType || (gameType !== 'all' && !VALID_GAME_TYPES.includes(gameType as GameType))) {
      return toApiError(res, 400, `Invalid or missing 'gameType'. Must be one of: ${VALID_GAME_TYPES.join(', ')}, or 'all'`);
    }
    
    console.log('[sync-all] Processing gameType:', gameType);
    
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
      // Sync single game (already validated above)
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : String(error);
      const errorName = error instanceof Error ? error.name : 'Error';
      
      console.error('[sync-all] Handler error:', {
        name: errorName,
        message: errorMessage,
        stack: errorStack,
      });
      
      // Detect specific error types
      if (errorName === 'AbortError' || errorMessage.includes('timeout')) {
        return toApiError(res, 504, 'Sync timed out', process.env.NODE_ENV === 'development' ? errorStack : undefined);
      }
      
      if (errorMessage.includes('RLS') || errorMessage.includes('permission denied') || errorMessage.includes('row-level security')) {
        return toApiError(res, 500, 'Database permission error. Check if service role key is configured.', process.env.NODE_ENV === 'development' ? errorStack : undefined);
      }
      
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT')) {
        return toApiError(res, 502, 'Network error during sync', process.env.NODE_ENV === 'development' ? errorStack : undefined);
      }
      
      return toApiError(res, 500, errorMessage, process.env.NODE_ENV === 'development' ? errorStack : undefined);
    }
  } catch (initError) {
    // Catch initialization errors (imports, etc.)
    console.error('Fatal initialization error:', initError);
    const errorMessage = initError instanceof Error ? initError.message : 'Initialization failed';
    const errorStack = initError instanceof Error ? initError.stack : String(initError);
    
    return res.status(500).json({
      error: 'Function initialization failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    });
  }
}

