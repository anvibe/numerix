import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { scrapeSuperEnalottoExtractions } from '../scrape/superenalotto.js';

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

// Lotto wheels
const LOTTO_WHEELS = ['Bari', 'Cagliari', 'Firenze', 'Genova', 'Milano', 'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Nazionale'] as const;
type LottoWheel = typeof LOTTO_WHEELS[number];

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

// Note: scrapeSuperEnalottoExtractions is now imported from '../scrape/superenalotto'

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

// Scrape Lotto from Lottologia
async function scrapeLottoExtractions(): Promise<ExtractedNumbers[]> {
  const extractions: ExtractedNumbers[] = [];
  
  try {
    const url = 'https://www.lottologia.com/lotto/archivio-estrazioni/';
    console.log('[scrape-lotto] Starting scrape from Lottologia...', url);
    
    // Use native fetch (Node 18+ on Vercel)
    let fetchImpl: (url: string | URL | Request, init?: RequestInit) => Promise<Response>;
    try {
      if (typeof globalThis.fetch === 'function') {
        fetchImpl = globalThis.fetch as typeof fetch;
        console.log('[scrape-lotto] Using native fetch');
      } else {
        throw new Error('Native fetch not available');
      }
    } catch (e) {
      console.log('[scrape-lotto] Falling back to node-fetch');
      try {
        const nodeFetch = await import('node-fetch');
        fetchImpl = nodeFetch.default as unknown as typeof fetch;
      } catch (importError) {
        console.error('[scrape-lotto] Failed to import node-fetch:', importError);
        throw new Error(`Failed to load fetch implementation: ${importError instanceof Error ? importError.message : String(importError)}`);
      }
    }
    
    // Check for ScraperAPI key
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    
    let response: Response | null = null;
    let lastError: Error | null = null;
    
    // Try ScraperAPI first
    if (scraperApiKey) {
      console.log('[scrape-lotto] Using ScraperAPI to bypass Cloudflare protection...');
      try {
        const scraperApiUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}&render=false`;
        response = await fetchImpl(scraperApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          throw new Error(`ScraperAPI request failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }
        console.log('[scrape-lotto] ScraperAPI request successful');
      } catch (scraperError) {
        console.error('[scrape-lotto] ScraperAPI failed, trying alternatives:', scraperError);
        response = null;
      }
    }
    
    // If ScraperAPI not used or failed, try direct requests
    if (!response || !response.ok) {
      console.log('[scrape-lotto] Attempting direct requests...');
      
      const delay = Math.floor(Math.random() * 2000) + 1000;
      console.log(`[scrape-lotto] Waiting ${delay}ms before request...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const headerConfigs: Record<string, string>[] = [
        {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        },
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
      
      for (let configIndex = 0; configIndex < headerConfigs.length; configIndex++) {
        const headers = headerConfigs[configIndex];
        
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (attempt > 0) {
              const retryDelay = Math.floor(Math.random() * 1000) + 500;
              console.log(`[scrape-lotto] Retry attempt ${attempt + 1} with config ${configIndex + 1}, waiting ${retryDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
            
            console.log(`[scrape-lotto] Making fetch request (config ${configIndex + 1}, attempt ${attempt + 1})...`);
            response = await fetchImpl(url, { headers });
            
            if (response.ok) {
              console.log(`[scrape-lotto] Success with config ${configIndex + 1}`);
              break;
            } else if (response.status === 403) {
              console.warn(`[scrape-lotto] Got 403 with config ${configIndex + 1}, trying next config...`);
              lastError = new Error(`Lottologia request failed: ${response.status}`);
              response = null;
              continue;
            } else {
              const errorText = await response.text().catch(() => 'Unable to read error response');
              throw new Error(`Lottologia request failed: ${response.status} - ${errorText.substring(0, 200)}`);
            }
          } catch (error) {
            console.error(`[scrape-lotto] Request failed (config ${configIndex + 1}, attempt ${attempt + 1}):`, error);
            lastError = error instanceof Error ? error : new Error(String(error));
            response = null;
          }
        }
        
        if (response && response.ok) {
          break;
        }
      }
    }
    
    if (!response || !response.ok) {
      const errorText = lastError?.message || 'All request attempts failed';
      console.error(`[scrape-lotto] All attempts failed: ${errorText}`);
      
      if (!scraperApiKey) {
        throw new Error(
          `Lottologia request failed after all attempts: ${errorText}. ` +
          `Il sito ha protezioni anti-bot avanzate (Cloudflare). ` +
          `Soluzione GRATUITA: configura SCRAPER_API_KEY in Vercel Environment Variables. ` +
          `ScraperAPI offre un piano GRATUITO con 1000 richieste/mese (sufficiente per ~33 sincronizzazioni giornaliere). ` +
          `Registrati su https://www.scraperapi.com/ e ottieni la chiave gratuita.`
        );
      } else {
        throw new Error(`Lottologia request failed after all attempts: ${errorText}`);
      }
    }
    
    console.log('[scrape-lotto] Fetch successful, reading response...');
    const html = await response.text();
    console.log(`[scrape-lotto] Fetched HTML, length: ${html.length}`);
    
    if (!html || html.length < 100) {
      throw new Error('Received empty or too short HTML response');
    }
    
    console.log('[scrape-lotto] Loading HTML with cheerio...');
    let $: ReturnType<typeof cheerio.load>;
    try {
      $ = cheerio.load(html);
      console.log('[scrape-lotto] Cheerio loaded successfully');
    } catch (cheerioError) {
      console.error('[scrape-lotto] Cheerio load error:', cheerioError);
      throw new Error(`Failed to parse HTML with cheerio: ${cheerioError instanceof Error ? cheerioError.message : String(cheerioError)}`);
    }
    
    // Parse Lottologia HTML structure for Lotto - table with class "table table-balls"
    let tableRows = $('table.table-balls tbody tr');
    console.log(`[scrape-lotto] Found ${tableRows.length} table rows with selector 'table.table-balls tbody tr'`);
    
    if (tableRows.length === 0) {
      tableRows = $('table tbody tr');
      console.log(`[scrape-lotto] Trying 'table tbody tr', found ${tableRows.length} rows`);
      
      if (tableRows.length === 0) {
        tableRows = $('table tr');
        console.log(`[scrape-lotto] Trying 'table tr', found ${tableRows.length} rows`);
      }
      
      if (tableRows.length === 0) {
        console.error('[scrape-lotto] No table rows found in HTML');
        const sampleHtml = html.substring(0, 1000);
        console.error('[scrape-lotto] HTML sample:', sampleHtml);
        return [];
      }
    }
    
    // Map wheel names from Lottologia to our wheel names
    const wheelNameMap: Record<string, LottoWheel> = {
      'Bari': 'Bari',
      'Cagliari': 'Cagliari',
      'Firenze': 'Firenze',
      'Genova': 'Genova',
      'Milano': 'Milano',
      'Napoli': 'Napoli',
      'Palermo': 'Palermo',
      'Roma': 'Roma',
      'Torino': 'Torino',
      'Venezia': 'Venezia',
      'Nazionale': 'Nazionale',
      'Naz': 'Nazionale',
    };
    
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
        
        if (!date) {
          return; // Skip if no date found
        }
        
        // Extract numbers for each wheel
        // Lotto table structure: Date, then columns for each wheel (Bari, Cagliari, etc.)
        const wheels: Record<string, number[]> = {};
        let hasValidWheel = false;
        
        // Get header row to identify wheel columns
        const table = $row.closest('table');
        const headerRow = table.find('thead tr, tbody tr').first();
        const headerCells = headerRow.find('th, td').toArray();
        const headers: string[] = [];
        
        headerCells.forEach((header) => {
          const headerText = $(header).text().trim();
          if (headerText && !headerText.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && headerText !== 'Data') {
            headers.push(headerText);
          }
        });
        
        // Get all cells in the current row
        const cells = $row.find('td').toArray();
        if (cells.length < 2) {
          return; // Need at least date + one wheel
        }
        
        // Parse each cell (skip first which is date)
        for (let cellIndex = 1; cellIndex < cells.length; cellIndex++) {
          const $cell = $(cells[cellIndex]);
          
          // Try to extract numbers from this cell
          const numbers: number[] = [];
          
          // Method 1: Look for divs with class ptnum_XX (most reliable)
          $cell.find('div[class*="ptnum_"]').each((j, numElem) => {
            const $numElem = $(numElem);
            const numText = $numElem.text().trim();
            if (numText) {
              const num = parseInt(numText, 10);
              if (!isNaN(num) && num >= 1 && num <= 90) {
                numbers.push(num);
                return;
              }
            }
            // Extract from class name
            const className = $numElem.attr('class') || '';
            const numMatch = className.match(/ptnum_(\d+)/);
            if (numMatch) {
              const num = parseInt(numMatch[1], 10);
              if (!isNaN(num) && num >= 1 && num <= 90) {
                numbers.push(num);
              }
            }
          });
          
          // Method 2: Parse space-separated numbers from text (fallback)
          if (numbers.length === 0) {
            const cellText = $cell.text().trim();
            const textNumbers = cellText.match(/\b([1-9]|[1-8][0-9]|90)\b/g);
            if (textNumbers) {
              textNumbers.forEach(numStr => {
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num >= 1 && num <= 90) {
                  numbers.push(num);
                }
              });
            }
          }
          
          // Remove duplicates and sort
          const uniqueNumbers = [...new Set(numbers)].sort((a, b) => a - b);
          
          // Each wheel should have exactly 5 numbers
          if (uniqueNumbers.length === 5) {
            // Identify which wheel this is
            let wheelName: LottoWheel | null = null;
            
            // Try to match header (cellIndex - 1 because first cell is date)
            const headerIndex = cellIndex - 1;
            if (headerIndex < headers.length) {
              const headerName = headers[headerIndex].trim();
              // Try exact match first
              wheelName = wheelNameMap[headerName] || null;
              
              // Try partial match (e.g., "Bari" matches "Bari")
              if (!wheelName) {
                for (const [key, value] of Object.entries(wheelNameMap)) {
                  if (headerName.includes(key) || key.includes(headerName)) {
                    wheelName = value;
                    break;
                  }
                }
              }
            }
            
            // If no header match, try to infer from position (standard order: Bari, Cagliari, etc.)
            if (!wheelName && cellIndex <= LOTTO_WHEELS.length) {
              wheelName = LOTTO_WHEELS[cellIndex - 1];
            }
            
            if (wheelName) {
              wheels[wheelName] = uniqueNumbers;
              hasValidWheel = true;
            }
          }
        }
        
        // Only add extraction if we have at least one valid wheel
        if (hasValidWheel && date) {
          // Use Bari's numbers as default (or first available wheel)
          const defaultNumbers = wheels['Bari'] || Object.values(wheels)[0] || [];
          
          extractions.push({
            date,
            numbers: defaultNumbers,
            wheels: wheels as Record<LottoWheel, number[]>,
          });
        }
      } catch (err) {
        console.error('[scrape-lotto] Error parsing extraction row:', err);
      }
    });
    
    console.log(`[scrape-lotto] Parsed ${extractions.length} extractions from Lottologia`);
    
    if (extractions.length === 0) {
      console.warn('[scrape-lotto] No extractions parsed - this might indicate a parsing issue');
    }
    
    return extractions;
  } catch (error) {
    console.error('[scrape-lotto] Error scraping Lottologia:', error);
    if (error instanceof Error) {
      console.error('[scrape-lotto] Error message:', error.message);
      console.error('[scrape-lotto] Error stack:', error.stack);
    }
    throw error;
  }
}

async function syncLotto(): Promise<{
  success: boolean;
  message: string;
  total: number;
  new: number;
  error?: string;
}> {
  try {
    console.log('Starting Lotto sync...');
    
    // Scrape extractions with timeout protection
    let extractions;
    try {
      console.log('[sync-lotto] Calling scrapeLottoExtractions...');
      const scrapePromise = scrapeLottoExtractions();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Scraping timeout after 30 seconds')), 30000);
      });
      
      console.log('[sync-lotto] Waiting for scrape to complete...');
      extractions = await Promise.race([scrapePromise, timeoutPromise]);
      console.log(`[sync-lotto] Scrape completed, got ${extractions.length} extractions`);
    } catch (scrapeError) {
      console.error('Error scraping Lotto:', scrapeError);
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
    // We need to check both date AND wheels to prevent duplicates
    let existingExtractionsMap = new Map<string, Array<{ wheels: Record<string, number[]> | null }>>();
    let latestExtraction: { date: string; wheels: Record<string, number[]> | null } | null = null;
    try {
      const supabase = getSupabaseClient();
      const { data: existingExtractions, error: queryError } = await supabase
        .from('extractions')
        .select('extraction_date, wheels')
        .eq('game_type', 'lotto')
        .order('extraction_date', { ascending: false })
        .limit(10000);
      
      if (queryError) {
        console.error('Error querying existing extractions:', queryError);
        throw queryError;
      }
      
      if (existingExtractions && existingExtractions.length > 0) {
        latestExtraction = {
          date: existingExtractions[0].extraction_date,
          wheels: existingExtractions[0].wheels as Record<string, number[]> | null
        };
        
        existingExtractions.forEach((ext) => {
          const date = ext.extraction_date;
          if (!existingExtractionsMap.has(date)) {
            existingExtractionsMap.set(date, []);
          }
          existingExtractionsMap.get(date)!.push({ wheels: ext.wheels as Record<string, number[]> | null });
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
    
    // Check if the first scraped extraction matches the latest (new numbers not ready yet)
    if (latestExtraction && extractions.length > 0) {
      const firstScraped = extractions[0];
      
      // Compare wheels data
      const scrapedWheelsStr = JSON.stringify(firstScraped.wheels || {});
      const latestWheelsStr = JSON.stringify(latestExtraction.wheels || {});
      
      if (scrapedWheelsStr === latestWheelsStr && firstScraped.date === latestExtraction.date) {
        return {
          success: true,
          message: 'I nuovi numeri non sono ancora disponibili. L\'ultima estrazione disponibile è ancora la stessa.',
          total: extractions.length,
          new: 0,
        };
      }
    }
    
    // Filter out duplicates - check both date AND wheels
    const newExtractions = extractions.filter((ext) => {
      const date = ext.date;
      const wheelsStr = JSON.stringify(ext.wheels || {});
      
      const existingForDate = existingExtractionsMap.get(date);
      if (!existingForDate) {
        return true; // New date, definitely new
      }
      
      // Check if these exact wheels already exist for this date
      const isDuplicate = existingForDate.some(existing => {
        const existingWheelsStr = JSON.stringify(existing.wheels || {});
        return existingWheelsStr === wheelsStr;
      });
      
      return !isDuplicate;
    });
    
    console.log(`${newExtractions.length} new extractions to insert`);
    
    if (newExtractions.length === 0) {
      return {
        success: true,
        message: 'Nessuna nuova estrazione trovata. Tutte le estrazioni sono già presenti nel database.',
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
        const insertData = batch.map((ext) => convertExtractionToInsert('lotto', ext));
        
        const { error, data } = await supabase
          .from('extractions')
          .insert(insertData)
          .select();
        
        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
          console.warn(`Skipping batch ${i / batchSize + 1}, continuing...`);
          continue;
        }
        
        inserted += batch.length;
        console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(newExtractions.length / batchSize)}: ${batch.length} items`);
      } catch (batchError) {
        console.error(`Exception in batch ${i / batchSize + 1}:`, batchError);
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
    console.error('Error in Lotto sync:', error);
    throw error;
  }
}

async function syncSuperEnalotto(year?: number): Promise<{
  success: boolean;
  message: string;
  total: number;
  new: number;
  error?: string;
}> {
  try {
    console.log('[sync] Starting SuperEnalotto sync...', { year });
    
    const currentYear = new Date().getFullYear();
    const startYear = 1997;
    
    // First, check which years we already have in the database
    let existingYears = new Set<number>();
    try {
      const supabase = getSupabaseClient();
      
      // Get existing years from database
      const { data: existingYearsData, error: dbError } = await supabase
        .from('extractions')
        .select('extraction_date')
        .eq('game_type', 'superenalotto')
        .order('extraction_date', { ascending: false })
        .limit(10000);
      
      if (dbError) {
        console.error('[sync] Database error when checking existing years:', dbError);
        // Continue anyway - we'll just fetch the requested year
      } else if (existingYearsData) {
        existingYearsData.forEach(ext => {
          try {
            const year = new Date(ext.extraction_date).getFullYear();
            if (!isNaN(year)) {
              existingYears.add(year);
            }
          } catch (e) {
            // Skip invalid dates
          }
        });
      }
      
      console.log(`[sync] Found data for years: ${Array.from(existingYears).sort((a, b) => b - a).join(', ') || 'none'}`);
    } catch (dbCheckError) {
      console.error('[sync] Error checking existing years, continuing anyway:', dbCheckError);
      // Continue - we'll just fetch the requested year
    }
    
    // Determine which years to fetch
    let yearsToFetch: number[] = [];
    
    if (year && year >= startYear && year <= currentYear) {
      // Sync specific year if requested
      yearsToFetch = [year];
      console.log(`[sync] Fetching specific year: ${year}`);
    } else {
      // Default behavior: fetch current year + last 2 years + missing years
      // Always fetch current year and last 2 years (for new extractions)
      for (let year = currentYear; year >= Math.max(currentYear - 2, startYear); year--) {
        yearsToFetch.push(year);
      }
      
      // Add missing older years (limit to 5 years per sync to avoid timeout)
      let missingYearsAdded = 0;
      for (let year = currentYear - 3; year >= startYear && missingYearsAdded < 5; year--) {
        if (!existingYears.has(year)) {
          yearsToFetch.push(year);
          missingYearsAdded++;
        }
      }
      
      yearsToFetch.sort((a, b) => b - a); // Sort newest first
    }
    
    console.log(`[sync] Will fetch years: ${yearsToFetch.join(', ')}`);
    
    // Scrape extractions for each year (incremental approach)
    let allExtractions: ExtractedNumbers[] = [];
    let totalScraped = 0;
    
    for (const year of yearsToFetch) {
      try {
        console.log(`[sync] Fetching year ${year}...`);
        const yearExtractions = await scrapeSuperEnalottoExtractions(year);
        if (yearExtractions && yearExtractions.length > 0) {
          allExtractions = allExtractions.concat(yearExtractions);
          totalScraped += yearExtractions.length;
          console.log(`[sync] Year ${year}: ${yearExtractions.length} extractions`);
        } else {
          console.log(`[sync] Year ${year}: No extractions found`);
        }
        
        // Small delay between years
        if (year !== yearsToFetch[yearsToFetch.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (yearError) {
        console.error(`[sync] Error fetching year ${year}:`, yearError);
        const errorMsg = yearError instanceof Error ? yearError.message : String(yearError);
        console.error(`[sync] Year ${year} error details:`, errorMsg);
        // Continue with next year instead of failing completely
        continue;
      }
    }
    
    const extractions = allExtractions;
    console.log(`[sync] Total scraped: ${extractions.length} extractions from ${yearsToFetch.length} years`);
    } catch (scrapeError) {
      console.error('[sync] Error scraping SuperEnalotto:', scrapeError);
      const errorMessage = scrapeError instanceof Error ? scrapeError.message : 'Scraping failed';
      const errorStack = scrapeError instanceof Error ? scrapeError.stack : String(scrapeError);
      const errorName = scrapeError instanceof Error ? scrapeError.name : 'Unknown';
      
      console.error('[sync] Scrape error details:', { 
        errorMessage, 
        errorStack,
        errorName
      });
      
      // Return a more user-friendly error message
      let userMessage = errorMessage;
      if (errorMessage.includes('Cloudflare') || errorMessage.includes('403') || errorMessage.includes('Lottologia request failed')) {
        userMessage = 'Il sito ha bloccato la richiesta. Configura SCRAPER_API_KEY in Vercel per bypassare le protezioni anti-bot.';
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'Il scraping ha impiegato troppo tempo. Riprova più tardi.';
      } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        userMessage = 'Errore di connessione durante lo scraping. Riprova più tardi.';
      }
      
      return {
        success: false,
        message: userMessage,
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
    // We need to check both date AND numbers to prevent duplicates
    let existingExtractionsMap = new Map<string, Set<string>>(); // date -> Set of sorted number strings
    let latestExtraction: { date: string; numbers: number[] } | null = null;
    try {
      const supabase = getSupabaseClient();
      
      // For historical sync, we need to check existing extractions
      // Use pagination with safety limits to prevent timeouts
      let allExistingExtractions: Array<{ extraction_date: string; numbers: number[] }> = [];
      let from = 0;
      const pageSize = 1000;
      const maxPages = 50; // Safety limit: max 50k extractions (should be more than enough)
      let hasMore = true;
      let pageCount = 0;
      
      console.log('[sync] Loading existing extractions from database...');
      while (hasMore && pageCount < maxPages) {
        const { data, error: queryError } = await supabase
          .from('extractions')
          .select('extraction_date, numbers')
          .eq('game_type', 'superenalotto')
          .order('extraction_date', { ascending: false })
          .range(from, from + pageSize - 1);
        
        if (queryError) {
          console.error('Error querying existing extractions:', queryError);
          throw queryError;
        }
        
        if (data && data.length > 0) {
          allExistingExtractions = allExistingExtractions.concat(data);
          pageCount++;
          
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            from += pageSize;
          }
        } else {
          hasMore = false;
        }
      }
      
      if (pageCount >= maxPages) {
        console.warn(`[sync] Reached safety limit of ${maxPages} pages. Loaded ${allExistingExtractions.length} extractions.`);
      }
      
      console.log(`[sync] Loaded ${allExistingExtractions.length} existing extractions from database`);
      
      if (allExistingExtractions.length > 0) {
        // Store the latest extraction separately for comparison
        latestExtraction = {
          date: allExistingExtractions[0].extraction_date,
          numbers: allExistingExtractions[0].numbers || []
        };
        
        // Build a map of date -> Set of sorted number strings for efficient duplicate checking
        allExistingExtractions.forEach((ext) => {
          const date = ext.extraction_date;
          const numbers = ext.numbers || [];
          const sortedNumbers = [...numbers].sort((a, b) => a - b);
          const numbersKey = sortedNumbers.join(',');
          
          if (!existingExtractionsMap.has(date)) {
            existingExtractionsMap.set(date, new Set());
          }
          existingExtractionsMap.get(date)!.add(numbersKey);
        });
        
        console.log(`[sync] Built duplicate map with ${existingExtractionsMap.size} unique dates`);
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
    
    // Check if the first scraped extraction matches the latest (new numbers not ready yet)
    if (latestExtraction && extractions.length > 0) {
      const firstScraped = extractions[0];
      const scrapedNumbersSorted = [...firstScraped.numbers].sort((a, b) => a - b);
      const latestNumbersSorted = [...latestExtraction.numbers].sort((a, b) => a - b);
      
      // Check if numbers match (same date or same numbers)
      const numbersMatch = scrapedNumbersSorted.length === latestNumbersSorted.length &&
        scrapedNumbersSorted.every((num, idx) => num === latestNumbersSorted[idx]);
      
      if (numbersMatch && firstScraped.date === latestExtraction.date) {
        return {
          success: true,
          message: 'I nuovi numeri non sono ancora disponibili. L\'ultima estrazione disponibile è ancora la stessa.',
          total: extractions.length,
          new: 0,
        };
      }
    }
    
    // Filter out duplicates - check both date AND numbers
    const newExtractions = extractions.filter((ext) => {
      const date = ext.date;
      const sortedNumbers = [...ext.numbers].sort((a, b) => a - b);
      const numbersKey = sortedNumbers.join(',');
      
      // Check if this date exists
      const existingNumbersForDate = existingExtractionsMap.get(date);
      if (!existingNumbersForDate) {
        return true; // New date, definitely new
      }
      
      // Check if these exact numbers already exist for this date (using Set for O(1) lookup)
      return !existingNumbersForDate.has(numbersKey);
    });
    
    console.log(`${newExtractions.length} new extractions to insert`);
    
    if (newExtractions.length === 0) {
      return {
        success: true,
        message: 'Nessuna nuova estrazione trovata. Tutte le estrazioni sono già presenti nel database.',
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
    console.error('[sync] Unexpected error in SuperEnalotto sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : String(error);
    
    return {
      success: false,
      message: `Errore imprevisto durante la sincronizzazione: ${errorMessage}`,
      total: 0,
      new: 0,
      error: errorStack,
    };
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
      
      try {
        const lottoResult = await syncLotto();
        results.lotto = lottoResult;
      } catch (error) {
        results.lotto = { 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
      
      // Add other games here as we implement them
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
          // Check if a specific year was requested
          const requestedYear = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
          const result = await syncSuperEnalotto(requestedYear);
          return res.status(200).json({
            gameType,
            year: requestedYear,
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
      
      if (gameType === 'lotto') {
        try {
          const result = await syncLotto();
          return res.status(200).json({
            gameType,
            ...result,
          });
        } catch (syncError) {
          console.error('Error in syncLotto:', syncError);
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

