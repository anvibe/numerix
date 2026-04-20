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

// Helper functions
function parseDate(dateText: string): string | null {
  try {
    // Try various date formats
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

function parseNumbers(numbersText: string): number[] {
  const numbers: number[] = [];
  const cleaned = numbersText.replace(/[^\d\s,]/g, '');
  const matches = cleaned.match(/\d+/g);
  
  if (matches) {
    for (const match of matches) {
      const num = parseInt(match, 10);
      if (!isNaN(num) && num > 0 && num <= 90) {
        numbers.push(num);
      }
    }
  }
  
  return numbers;
}

/** Read body as UTF-8 bytes (more reliable than text() for some proxies / encodings). */
async function readBodyAsUtf8(response: Response): Promise<string> {
  const buf = await response.arrayBuffer();
  return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf));
}

async function getFetchImpl(): Promise<typeof fetch> {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch as typeof fetch;
  }
  const nodeFetch = await import('node-fetch');
  return nodeFetch.default as unknown as typeof fetch;
}

const OFFICIAL_SUPERENALOTTO_URL = 'https://www.superenalotto.it/';
const OFFICIAL_FETCH_TIMEOUT_MS = 28_000;

const ITALIAN_MONTH_TO_MM = new Map<string, string>([
  ['gennaio', '01'],
  ['febbraio', '02'],
  ['marzo', '03'],
  ['aprile', '04'],
  ['maggio', '05'],
  ['giugno', '06'],
  ['luglio', '07'],
  ['agosto', '08'],
  ['settembre', '09'],
  ['ottobre', '10'],
  ['novembre', '11'],
  ['dicembre', '12'],
]);

/** e.g. "venerdì 10 aprile 2026" → YYYY-MM-DD */
function parseItalianNewsDateFragment(fragment: string): string | null {
  const normalized = fragment.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const m = normalized.match(/(\d{1,2})\s+([a-zàèéìòù]+)\s+(\d{4})/i);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const monthName = m[2].toLowerCase();
  const mm = ITALIAN_MONTH_TO_MM.get(monthName);
  if (!mm) return null;
  return `${m[3]}-${mm}-${day}`;
}

/**
 * Parses draw lines embedded in superenalotto.it homepage HTML (news teasers).
 * Lottologia is often blocked; the official site is usually reachable from serverless.
 */
function parseExtractionsFromOfficialSuperenalottoHtml(html: string): ExtractedNumbers[] {
  const extractions: ExtractedNumbers[] = [];
  const re =
    /concorso\s+numero\s+(\d+)\s+del\s+SuperEnalotto\s+di\s+([^<]+?)\s+è:\s*((?:\d{1,2},\s*){5}\d{1,2})\.\s*Numero\s+Jolly\s+(\d+),\s*Numero\s+SuperStar\s+(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const [, , dateFragment, numsCsv, jollyStr, superstarStr] = m;
    const date = parseItalianNewsDateFragment(dateFragment);
    if (!date) continue;
    const rawNums = numsCsv.split(',').map((s) => parseInt(s.trim(), 10));
    const numbers = rawNums.filter((n) => !Number.isNaN(n) && n >= 1 && n <= 90);
    if (numbers.length !== 6) continue;
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const jolly = parseInt(jollyStr, 10);
    const superstar = parseInt(superstarStr, 10);
    if (Number.isNaN(jolly) || Number.isNaN(superstar)) continue;

    const dup = extractions.some(
      (ext) =>
        ext.date === date &&
        ext.numbers.length === sortedNumbers.length &&
        ext.numbers.every((n, i) => n === sortedNumbers[i])
    );
    if (!dup) {
      extractions.push({
        date,
        numbers: sortedNumbers,
        jolly,
        superstar,
      });
    }
  }
  return extractions;
}

async function tryScrapeOfficialSuperenalottoHomepage(fetchImpl: typeof fetch): Promise<ExtractedNumbers[]> {
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  console.log('[scrape] Fetching official homepage', OFFICIAL_SUPERENALOTTO_URL);
  const response = await fetchImpl(OFFICIAL_SUPERENALOTTO_URL, {
    headers: {
      'User-Agent': ua,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(OFFICIAL_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Official SuperEnalotto HTTP ${response.status}`);
  }
  const html = await readBodyAsUtf8(response);
  if (html.length < 500) {
    throw new Error('Official SuperEnalotto: HTML unexpectedly short');
  }
  return parseExtractionsFromOfficialSuperenalottoHtml(html);
}

// Export scraping function for use by other modules
// Fetches only the latest extractions (first page)
export async function scrapeSuperEnalottoExtractions(): Promise<ExtractedNumbers[]> {
  try {
    console.log('[scrape] Fetching latest SuperEnalotto extractions...');
    const fetchImpl = await getFetchImpl();

    try {
      const official = await tryScrapeOfficialSuperenalottoHomepage(fetchImpl);
      if (official.length > 0) {
        official.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        console.log(`[scrape] Using official superenalotto.it (${official.length} draw(s) from homepage)`);
        return official;
      }
      console.warn('[scrape] Official site: no draw lines matched (layout may have changed); trying Lottologia');
    } catch (officialErr) {
      console.warn('[scrape] Official site failed:', officialErr);
    }

    return await scrapeLottologiaSuperEnalotto();
  } catch (error) {
    console.error('[scrape] Error in scrapeSuperEnalottoExtractions:', error);
    throw error;
  }
}

// Scrape a specific year only (faster, for incremental syncing)
async function scrapeLottologiaSuperEnalottoByYear(year: number): Promise<ExtractedNumbers[]> {
  const extractions: ExtractedNumbers[] = [];
  const baseUrl = `https://www.lottologia.com/superenalotto/archivio-estrazioni/?anno=${year}`;
  
  try {
    console.log(`[scrape] Starting scrape for year ${year}...`, baseUrl);
    
    // Use native fetch (Node 18+ on Vercel)
    let fetchImpl: (url: string | URL | Request, init?: RequestInit) => Promise<Response>;
    try {
      if (typeof globalThis.fetch === 'function') {
        fetchImpl = globalThis.fetch as typeof fetch;
      } else {
        const nodeFetch = await import('node-fetch');
        fetchImpl = nodeFetch.default as unknown as typeof fetch;
      }
    } catch (e) {
      throw new Error(`Failed to load fetch implementation: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    let page = 1;
    const maxPages = 20; // Max pages per year
    let hasMore = true;
    
    while (hasMore && page <= maxPages) {
      const url = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
      console.log(`[scrape] Fetching year ${year}, page ${page}...`);
      
      try {
        const html = await fetchPage(url, fetchImpl, !!scraperApiKey);
        const beforeCount = extractions.length;
        parseExtractionsFromHTML(html, extractions);
        const newExtractions = extractions.length - beforeCount;
        
        console.log(`[scrape] Year ${year}, page ${page}: Added ${newExtractions} extractions (total: ${extractions.length})`);
        
        // Check if there are more pages
        let hasMorePages = false;
        try {
          const $ = cheerio.load(html);
          const nextButton = $('a').filter((_, el) => {
            const text = $(el).text().trim().toLowerCase();
            return text.includes('next') || text.includes('succ') || text.includes('avanti') || text === '>';
          });
          hasMorePages = nextButton.length > 0 && newExtractions > 0;
        } catch (cheerioError) {
          console.error(`[scrape] Error parsing HTML for pagination check:`, cheerioError);
          hasMorePages = false; // Assume no more pages if parsing fails
        }
        
        hasMore = hasMorePages;
        page++;
        
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      } catch (pageError) {
        console.error(`[scrape] Error fetching year ${year}, page ${page}:`, pageError);
        hasMore = false;
      }
    }
    
    console.log(`[scrape] Completed year ${year}: ${extractions.length} extractions`);
    
    // Sort by date (newest first)
    extractions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    return extractions;
  } catch (error) {
    console.error(`[scrape] Error scraping year ${year}:`, error);
    throw error;
  }
}

/** Lottologia pages are large; short bodies are usually errors, CF challenges, or bad proxy responses. */
const MIN_HTML_LEN = 100;
/** Client must outwait ScraperAPI (proxy + target + render). Keep 2 attempts × this under Vercel maxDuration. */
const SCRAPER_API_CLIENT_TIMEOUT_MS = 72_000;
const DIRECT_FETCH_TIMEOUT_MS = 25_000;

function scraperApiUrl(targetUrl: string, apiKey: string, render: boolean): string {
  const params = new URLSearchParams({
    api_key: apiKey,
    url: targetUrl,
    render: render ? 'true' : 'false',
    country_code: 'it',
  });
  if (process.env.SCRAPER_API_PREMIUM === 'true' || process.env.SCRAPER_API_PREMIUM === '1') {
    params.set('premium', 'true');
  }
  if (
    process.env.SCRAPER_API_ULTRA_PREMIUM === 'true' ||
    process.env.SCRAPER_API_ULTRA_PREMIUM === '1'
  ) {
    params.set('ultra_premium', 'true');
  }
  return `https://api.scraperapi.com/?${params.toString()}`;
}

// Helper function to fetch a single page with ScraperAPI support
async function fetchPage(url: string, fetchImpl: typeof fetch, useScraperAPI: boolean = false): Promise<string> {
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Try ScraperAPI if available — render=false then render=true; long client timeout
  if (useScraperAPI && scraperApiKey) {
    for (const render of [false, true]) {
      try {
        const apiUrl = scraperApiUrl(url, scraperApiKey, render);
        console.log(`[scrape] ScraperAPI request (render=${render})...`);
        const response = await fetchImpl(apiUrl, {
          headers: { 'User-Agent': ua },
          signal: AbortSignal.timeout(SCRAPER_API_CLIENT_TIMEOUT_MS),
        });
        if (response.ok) {
          const html = await readBodyAsUtf8(response);
          if (html.length >= MIN_HTML_LEN) {
            return html;
          }
          console.warn(
            `[scrape] ScraperAPI returned ok but HTML too short (${html.length} chars, render=${render}), trying next...`
          );
        } else {
          const errText = await readBodyAsUtf8(response).catch(() => '');
          console.warn(`[scrape] ScraperAPI HTTP ${response.status}: ${errText.slice(0, 200)}`);
        }
      } catch (scraperError) {
        console.warn('[scrape] ScraperAPI attempt failed:', scraperError);
      }
    }
  }

  // Direct request (Lottologia often returns 200 + empty body to datacenter IPs — ScraperAPI is primary)
  const headerConfigs: Record<string, string>[] = [
    {
      'User-Agent': ua,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
    },
    {
      'User-Agent': ua,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      Referer: 'https://www.google.com/',
    },
    {
      'User-Agent': ua,
      Accept: 'text/html',
      'Accept-Language': 'it-IT,it;q=0.9',
    },
  ];

  let lastError: Error | null = null;
  for (const headers of headerConfigs) {
    try {
      const response = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
      });
      if (response.ok) {
        const html = await readBodyAsUtf8(response);
        if (html.length >= MIN_HTML_LEN) {
          return html;
        }
        lastError = new Error(`Lottologia returned ok but body too short (${html.length} chars)`);
        continue;
      }
      if (response.status === 403) {
        lastError = new Error(`Lottologia request failed: ${response.status}`);
        continue;
      }
      const errorText = await readBodyAsUtf8(response).catch(() => 'Unable to read error response');
      throw new Error(`Lottologia request failed: ${response.status} - ${errorText.substring(0, 200)}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  if (lastError) {
    if (!scraperApiKey) {
      throw new Error(
        `Lottologia request failed: ${lastError.message}. ` +
          `Il sito ha protezioni anti-bot avanzate (Cloudflare). ` +
          `Soluzione GRATUITA: configura SCRAPER_API_KEY in Vercel Environment Variables. ` +
          `ScraperAPI offre un piano GRATUITO con 1000 richieste/mese.`
      );
    }
    throw new Error(
      `${lastError.message} ` +
        `(ScraperAPI e la richiesta diretta sono falliti: controlla crediti ScraperAPI, piano, o blocchi sul target.)`
    );
  }

  throw new Error('All request attempts failed');
}

// Parse extractions from HTML
function parseExtractionsFromHTML(html: string, extractions: ExtractedNumbers[]): void {
  const $ = cheerio.load(html);
  
  // Parse Lottologia HTML structure - table with class "table table-balls"
  let tableRows = $('table.table-balls tbody tr');
  
  if (tableRows.length === 0) {
    tableRows = $('table tbody tr');
    if (tableRows.length === 0) {
      tableRows = $('table tr');
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
        const numText = $numElem.text().trim();
        if (numText) {
          const num = parseInt(numText, 10);
          if (!isNaN(num) && num >= 1 && num <= 90) {
            numbers.push(num);
            return;
          }
        }
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
        
        // Check for duplicates before adding
        const isDuplicate = extractions.some(
          ext => ext.date === date && 
          ext.numbers.length === sortedNumbers.length &&
          ext.numbers.every((num, idx) => num === sortedNumbers[idx])
        );
        
        if (!isDuplicate) {
          extractions.push({
            date,
            numbers: sortedNumbers,
            jolly,
            superstar,
          });
        }
      }
    } catch (err) {
      console.error('Error parsing extraction row:', err);
    }
  });
}

// Scrape SuperEnalotto from Lottologia - only latest extractions (first page)
async function scrapeLottologiaSuperEnalotto(): Promise<ExtractedNumbers[]> {
  const extractions: ExtractedNumbers[] = [];
  const baseUrl = 'https://www.lottologia.com/superenalotto/archivio-estrazioni/';
  
  try {
    console.log('[scrape] Starting scrape from Lottologia (latest extractions only)...', baseUrl);
    
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
    
    // Fetch only the first page (latest extractions)
    console.log('[scrape] Fetching latest extractions (first page only)...');
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    const html = await fetchPage(baseUrl, fetchImpl, !!scraperApiKey);
    
    if (!html || html.length < MIN_HTML_LEN) {
      throw new Error('Received empty or too short HTML response');
    }
    
    // Parse first page only (latest extractions)
    parseExtractionsFromHTML(html, extractions);
    console.log(`[scrape] Parsed ${extractions.length} extractions from latest page`);
    
    // Sort by date (newest first)
    extractions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    if (extractions.length === 0) {
      console.warn('No extractions parsed - this might indicate a parsing issue');
    }
    
    return extractions;
  } catch (error) {
    console.error('Error scraping Lottologia:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
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
    console.log('Starting SuperEnalotto scrape...');
    
    // Scrape extractions
    let extractions: ExtractedNumbers[];
    try {
      extractions = await scrapeLottologiaSuperEnalotto();
    } catch (scrapeError) {
      console.error('Scraping failed:', scrapeError);
      return res.status(500).json({
        error: 'Scraping failed',
        message: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error',
        details: scrapeError instanceof Error ? scrapeError.stack : String(scrapeError),
      });
    }
    
    if (extractions.length === 0) {
      return res.status(500).json({
        error: 'No extractions found',
        message: 'Could not scrape any extractions from available sources',
      });
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
      return res.status(200).json({
        success: true,
        message: 'No new extractions found',
        total: extractions.length,
        new: 0,
      });
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
    
    return res.status(200).json({
      success: true,
      message: `Successfully scraped and inserted ${inserted} new extractions`,
      total: extractions.length,
      new: inserted,
    });
  } catch (error) {
    console.error('Error in SuperEnalotto scraper:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', { errorMessage, errorStack });
    
    return res.status(500).json({
      error: 'Scraping failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    });
  }
}

