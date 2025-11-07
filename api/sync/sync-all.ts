import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

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
  const errorInfo: Record<string, unknown> = {
    status,
    message,
    timestamp: new Date().toISOString(),
  };
  if (details && typeof details === 'object') {
    errorInfo.details = details;
  }
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

// Helper functions for date and number parsing
function parseDate(dateText: string): string | null {
  try {
    const cleaned = dateText.replace(/\s+/g, ' ').trim();
    
    // Format: DD/MM/YYYY
    const ddmmyyyy = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Format: YYYY-MM-DD
    const yyyymmdd = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (yyyymmdd) {
      return cleaned;
    }
    
    // Try parsing as Date object
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

// Scrape SuperEnalotto from Lottologia
async function scrapeSuperEnalottoExtractions(): Promise<ExtractedNumbers[]> {
  const extractions: ExtractedNumbers[] = [];
  
  try {
    const url = 'https://www.lottologia.com/superenalotto/archivio-estrazioni/';
    console.log('[scrape] Starting scrape from Lottologia...', url);
    
    // Use native fetch (Node 18+ on Vercel)
    let fetchImpl: (url: string | URL | Request, init?: RequestInit) => Promise<Response>;
    try {
      if (typeof globalThis.fetch === 'function') {
        fetchImpl = globalThis.fetch as typeof fetch;
        console.log('[scrape] Using native fetch');
      } else {
        throw new Error('Native fetch not available');
      }
    } catch (e) {
      console.log('[scrape] Falling back to node-fetch');
      try {
        const nodeFetch = await import('node-fetch');
        fetchImpl = nodeFetch.default as unknown as typeof fetch;
      } catch (importError) {
        console.error('[scrape] Failed to import node-fetch:', importError);
        throw new Error(`Failed to load fetch implementation: ${importError instanceof Error ? importError.message : String(importError)}`);
      }
    }
    
    // Add random delay to appear more human-like (1-3 seconds)
    const delay = Math.floor(Math.random() * 2000) + 1000;
    console.log(`[scrape] Waiting ${delay}ms before request...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Try multiple header configurations
    const headerConfigs: Record<string, string>[] = [
      // Config 1: Minimal headers
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
      // Config 2: Full browser headers
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/',
      },
    ];
    
    let response: Response | null = null;
    let lastError: Error | null = null;
    
    // Try each header configuration with retries
    for (let configIndex = 0; configIndex < headerConfigs.length; configIndex++) {
      const headers = headerConfigs[configIndex];
      
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            const retryDelay = Math.floor(Math.random() * 1000) + 500;
            console.log(`[scrape] Retry attempt ${attempt + 1} with config ${configIndex + 1}, waiting ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
          
          console.log(`[scrape] Making fetch request (config ${configIndex + 1}, attempt ${attempt + 1})...`);
          response = await fetchImpl(url, { headers });
          
          if (response.ok) {
            console.log(`[scrape] Success with config ${configIndex + 1}`);
            break;
          } else if (response.status === 403) {
            console.warn(`[scrape] Got 403 with config ${configIndex + 1}, trying next config...`);
            lastError = new Error(`Lottologia request failed: ${response.status}`);
            response = null;
            continue;
          } else {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            throw new Error(`Lottologia request failed: ${response.status} - ${errorText.substring(0, 200)}`);
          }
        } catch (error) {
          console.error(`[scrape] Request failed (config ${configIndex + 1}, attempt ${attempt + 1}):`, error);
          lastError = error instanceof Error ? error : new Error(String(error));
          response = null;
        }
      }
      
      if (response && response.ok) {
        break;
      }
    }
    
    if (!response || !response.ok) {
      const errorText = lastError?.message || 'All request attempts failed';
      console.error(`[scrape] All attempts failed: ${errorText}`);
      throw new Error(`Lottologia request failed after all attempts: ${errorText}`);
    }
    
    console.log('[scrape] Fetch successful, reading response...');
    const html = await response.text();
    console.log(`[scrape] Fetched HTML, length: ${html.length}`);
    
    if (!html || html.length < 100) {
      throw new Error('Received empty or too short HTML response');
    }
    
    console.log('[scrape] Loading HTML with cheerio...');
    let $: ReturnType<typeof cheerio.load>;
    try {
      $ = cheerio.load(html);
      console.log('[scrape] Cheerio loaded successfully');
    } catch (cheerioError) {
      console.error('[scrape] Cheerio load error:', cheerioError);
      throw new Error(`Failed to parse HTML with cheerio: ${cheerioError instanceof Error ? cheerioError.message : String(cheerioError)}`);
    }
    
    // Parse Lottologia HTML structure - table with class "table table-balls"
    let tableRows = $('table.table-balls tbody tr');
    console.log(`[scrape] Found ${tableRows.length} table rows with selector 'table.table-balls tbody tr'`);
    
    if (tableRows.length === 0) {
      tableRows = $('table tbody tr');
      console.log(`[scrape] Trying 'table tbody tr', found ${tableRows.length} rows`);
      
      if (tableRows.length === 0) {
        tableRows = $('table tr');
        console.log(`[scrape] Trying 'table tr', found ${tableRows.length} rows`);
      }
      
      if (tableRows.length === 0) {
        console.error('[scrape] No table rows found in HTML');
        const sampleHtml = html.substring(0, 1000);
        console.error('[scrape] HTML sample:', sampleHtml);
        return [];
      }
    }
    
    tableRows.each((i, elem) => {
      try {
        const $row = $(elem);
        
        // Skip header row
        if ($row.find('th').length > 0) {
          return;
        }
        
        // Extract date from link href (format: ../estrazione/?date=2025-11-06)
        const dateLink = $row.find('td a').first().attr('href');
        let date: string | null = null;
        
        if (dateLink) {
          const dateMatch = dateLink.match(/date=(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            date = dateMatch[1];
          }
        }
        
        // If no date from link, try to parse from text
        if (!date) {
          const dateText = $row.find('td').first().text().trim();
          date = parseDate(dateText);
        }
        
        // Extract numbers from SERIES column (divs with class ptnum_XX)
        const numbers: number[] = [];
        $row.find('td.SERIES div[class*="ptnum_"]').each((j, numElem) => {
          const $numElem = $(numElem);
          // First try to get from text content
          const numText = $numElem.text().trim();
          if (numText) {
            const num = parseInt(numText, 10);
            if (!isNaN(num) && num >= 1 && num <= 90) {
              numbers.push(num);
              return;
            }
          }
          // If no text, extract from class name (ptnum_09, ptnum_48, etc.)
          const className = $numElem.attr('class') || '';
          const numMatch = className.match(/ptnum_(\d+)/);
          if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            if (!isNaN(num) && num >= 1 && num <= 90) {
              numbers.push(num);
            }
          }
        });
        
        // Extract Jolly from JOLLY column
        let jolly: number | undefined;
        const jollyElem = $row.find('td div.special.ball-gold2, td.JOLLY div.special');
        if (jollyElem.length > 0) {
          const jollyText = jollyElem.text().trim();
          const jollyNum = parseInt(jollyText, 10);
          if (!isNaN(jollyNum) && jollyNum >= 1 && jollyNum <= 90) {
            jolly = jollyNum;
          } else {
            const jollyClass = jollyElem.attr('class') || '';
            const jollyMatch = jollyClass.match(/ptnum_(\d+)/);
            if (jollyMatch) {
              const jollyNum = parseInt(jollyMatch[1], 10);
              if (!isNaN(jollyNum) && jollyNum >= 1 && jollyNum <= 90) {
                jolly = jollyNum;
              }
            }
          }
        }
        
        // Extract Superstar from Superstar column
        let superstar: number | undefined;
        const superstarElem = $row.find('td.Superstar div.special, td:last-child div.special').not('.ball-gold2');
        if (superstarElem.length > 0) {
          const superstarText = superstarElem.text().trim();
          const superstarNum = parseInt(superstarText, 10);
          if (!isNaN(superstarNum) && superstarNum >= 1 && superstarNum <= 90) {
            superstar = superstarNum;
          } else {
            const superstarClass = superstarElem.attr('class') || '';
            const superstarMatch = superstarClass.match(/ptnum_(\d+)/);
            if (superstarMatch) {
              const superstarNum = parseInt(superstarMatch[1], 10);
              if (!isNaN(superstarNum) && superstarNum >= 1 && superstarNum <= 90) {
                superstar = superstarNum;
              }
            }
          }
        }
        
        // Validate and add extraction
        if (date && numbers.length === 6) {
          const sortedNumbers = [...numbers].sort((a, b) => a - b);
          
          extractions.push({
            date,
            numbers: sortedNumbers,
            jolly,
            superstar,
          });
        }
      } catch (err) {
        console.error('[scrape] Error parsing extraction row:', err);
      }
    });
    
    console.log(`[scrape] Parsed ${extractions.length} extractions from Lottologia`);
    
    if (extractions.length === 0) {
      console.warn('[scrape] No extractions parsed - this might indicate a parsing issue');
    }
    
    return extractions;
  } catch (error) {
    console.error('[scrape] Error scraping Lottologia:', error);
    if (error instanceof Error) {
      console.error('[scrape] Error message:', error.message);
      console.error('[scrape] Error stack:', error.stack);
    }
    throw error;
  }
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
      console.log('[sync] Calling scrapeSuperEnalottoExtractions...');
      // Add timeout wrapper
      const scrapePromise = scrapeSuperEnalottoExtractions();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Scraping timeout after 30 seconds')), 30000);
      });
      
      console.log('[sync] Waiting for scrape to complete...');
      extractions = await Promise.race([scrapePromise, timeoutPromise]);
      console.log(`[sync] Scrape completed, got ${extractions.length} extractions`);
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

