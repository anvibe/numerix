import type { VercelRequest, VercelResponse } from '../types.js';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { scrapeSuperEnalottoExtractions } from '../scrape/superenalotto.js';
import { getSupabaseServerClient, requireUserIdFromAuthHeader } from '../_supabaseServer.js';

// Define types locally to avoid import issues
interface ExtractedNumbers {
  date: string;
  numbers: number[];
  wheels?: Record<string, number[]>;
  jolly?: number;
  superstar?: number;
}

function redactScraperApiKey(input: unknown): string {
  const s = typeof input === 'string' ? input : String(input);
  return s.replace(/([?&]api_key=)[^&\s]+/gi, '$1REDACTED');
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return redactScraperApiKey(err.message);
  return redactScraperApiKey(String(err));
}

function safeErrorStack(err: unknown): string {
  if (err instanceof Error) return redactScraperApiKey(err.stack || '');
  return redactScraperApiKey(String(err));
}

// Valid game types
const VALID_GAME_TYPES = ['superenalotto', 'lotto', '10elotto', 'millionday'] as const;
type GameType = typeof VALID_GAME_TYPES[number];

// Lotto wheels
const LOTTO_WHEELS = ['Bari', 'Cagliari', 'Firenze', 'Genova', 'Milano', 'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Nazionale'] as const;
type LottoWheel = typeof LOTTO_WHEELS[number];

/** Outer cap for `scrapeLottoExtractions` (ScraperAPI ×2 + delay + direct retries). Must stay ≤ Vercel `maxDuration` for this route. */
const LOTTO_SCRAPE_RACE_MS = 230_000;

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
  console.error('[sync-all]', {
    ...errorInfo,
    details: typeof details === 'string' ? redactScraperApiKey(details) : details,
  });
  return res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && details
      ? { details: typeof details === 'string' ? redactScraperApiKey(details) : details }
      : {}),
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

const IT_MONTH_TO_MM = new Map<string, string>([
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

function parseItalianDateText(dateText: string): string | null {
  const cleaned = dateText.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const m = cleaned.match(
    /(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)?\s*(\d{1,2})\s+([a-zàèéìòù]+)\s+(\d{4})/
  );
  if (!m) return null;
  const day = m[2].padStart(2, '0');
  const mm = IT_MONTH_TO_MM.get(m[3]);
  if (!mm) return null;
  return `${m[4]}-${mm}-${day}`;
}

function parseSingleLottoExtractionFromAltHtml(html: string): ExtractedNumbers | null {
  const $ = cheerio.load(html);
  const dateRaw =
    $('h3')
      .toArray()
      .map((el) => $(el).text().trim())
      .find((t) => /(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\s+\d{1,2}\s+[a-zàèéìòù]+\s+\d{4}/i.test(t)) ||
    '';
  const date = parseItalianDateText(dateRaw);
  if (!date) return null;

  const wheels: Record<string, number[]> = {};

  // Primary parse: DOM blocks used by estrazionilotto.it
  $('p.ruota').each((_, el) => {
    const rawWheel = $(el).text().trim();
    const wheel = rawWheel.charAt(0).toUpperCase() + rawWheel.slice(1).toLowerCase();
    if (!LOTTO_WHEELS.includes(wheel as LottoWheel)) return;

    const nums = $(el)
      .parent()
      .nextAll('div')
      .slice(0, 5)
      .find('p.numero')
      .toArray()
      .map((n) => parseInt($(n).text().trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 90);

    if (nums.length === 5) {
      wheels[wheel] = nums;
    }
  });

  // Fallback parse: resilient text regex if DOM structure changes.
  const plain = $.text().replace(/\s+/g, ' ');
  for (const wheel of LOTTO_WHEELS) {
    if (wheels[wheel]) continue;
    const re = new RegExp(`${wheel}\\s+(\\d{1,2})\\s+(\\d{1,2})\\s+(\\d{1,2})\\s+(\\d{1,2})\\s+(\\d{1,2})`, 'i');
    const m = plain.match(re);
    if (!m) continue;
    const nums = m.slice(1).map((v) => parseInt(v, 10));
    if (nums.every((n) => n >= 1 && n <= 90)) {
      wheels[wheel] = nums;
    }
  }

  if (Object.keys(wheels).length === 0) return null;
  const defaultNumbers = wheels['Bari'] || Object.values(wheels)[0];
  return { date, numbers: defaultNumbers, wheels };
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function tryScrapeLottoFromEstrazioniLotto(fetchImpl: typeof fetch): Promise<ExtractedNumbers[]> {
  const base = 'https://estrazionilotto.it/';
  const maxLookbackDays = 21; // pull recent history to fill gaps
  const targetCount = 12; // ~3 weeks of draws
  const extracted: ExtractedNumbers[] = [];
  const seenDates = new Set<string>();

  console.log('[scrape-lotto] Trying alternative source...', base);
  for (let i = 0; i <= maxLookbackDays && extracted.length < targetCount; i++) {
    const ref = new Date();
    ref.setDate(ref.getDate() - i);
    const url = i === 0 ? base : `${base}?d=${toYmd(ref)}`;

    try {
      const response = await fetchImpl(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        continue;
      }
      const html = await response.text();
      if (!html || html.length < 500) {
        continue;
      }
      const parsed = parseSingleLottoExtractionFromAltHtml(html);
      if (!parsed || seenDates.has(parsed.date)) {
        continue;
      }
      seenDates.add(parsed.date);
      extracted.push(parsed);
    } catch {
      // ignore single-page failures and continue scanning recent dates
      continue;
    }
  }

  extracted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return extracted;
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
    console.log('[scrape-lotto] Starting Lotto scraping...');
    
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

    // Preferred source: estrazionilotto.it (usually accessible without proxy).
    // Keep Lottologia as fallback when alternative source changes.
    try {
      const alt = await tryScrapeLottoFromEstrazioniLotto(fetchImpl);
      if (alt.length > 0) {
        console.log(`[scrape-lotto] Using alternative source (${alt.length} extraction(s))`);
        return alt;
      }
      console.warn('[scrape-lotto] Alternative source returned no rows, falling back to Lottologia...');
    } catch (altErr) {
      console.warn('[scrape-lotto] Alternative source failed, falling back to Lottologia:', altErr);
    }
    console.log('[scrape-lotto] Falling back to Lottologia...', url);
    
    const MIN_HTML_LEN = 100;
    const SCRAPER_API_CLIENT_TIMEOUT_MS = 72_000;
    const DIRECT_FETCH_TIMEOUT_MS = 25_000;

    const readBodyAsUtf8 = async (res: Response) => {
      const buf = await res.arrayBuffer();
      return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf));
    };

    // Lotto can use a dedicated ScraperAPI account/key (fallback to shared key)
    const scraperApiKey = process.env.SCRAPER_API_KEY_LOTTO || process.env.SCRAPER_API_KEY;

    let response: Response | null = null;
    let lastError: Error | null = null;
    let scraperApiRequiresPremium = false;

    // Try ScraperAPI first (retry with render=true if body is too short — same as superenalotto scraper)
    if (scraperApiKey) {
      for (const render of [false, true]) {
        console.log(`[scrape-lotto] ScraperAPI (render=${render})...`);
        try {
          const params = new URLSearchParams({
            api_key: scraperApiKey,
            url,
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
          const scraperApiUrl = `https://api.scraperapi.com/?${params.toString()}`;
          response = await fetchImpl(scraperApiUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(SCRAPER_API_CLIENT_TIMEOUT_MS),
          });

          if (response.ok) {
            const probe = await readBodyAsUtf8(response.clone());
            if (probe.length >= MIN_HTML_LEN) {
              console.log('[scrape-lotto] ScraperAPI request successful');
              break;
            }
            console.warn(
              `[scrape-lotto] ScraperAPI ok but HTML too short (${probe.length} chars), trying next...`
            );
            response = null;
          } else {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            console.warn(`[scrape-lotto] ScraperAPI ${response.status}: ${errorText.substring(0, 200)}`);
            if (
              errorText.includes('premium=true') ||
              errorText.includes('ultra_premium=true') ||
              errorText.toLowerCase().includes('protected domains may require') ||
              errorText.toLowerCase().includes('does not allow you to use our premium proxies')
            ) {
              scraperApiRequiresPremium = true;
            }
            response = null;
          }
        } catch (scraperError) {
          console.error('[scrape-lotto] ScraperAPI attempt failed:', scraperError);
          response = null;
        }
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
          'Accept-Encoding': 'gzip, deflate',
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
            response = await fetchImpl(url, {
              headers,
              signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
            });
            
            if (response.ok) {
              const probe = await readBodyAsUtf8(response.clone());
              if (probe.length >= MIN_HTML_LEN) {
                console.log(`[scrape-lotto] Success with config ${configIndex + 1}`);
                break;
              }
              console.warn(
                `[scrape-lotto] HTTP 200 but HTML too short (${probe.length} chars) ` +
                `(config ${configIndex + 1}, attempt ${attempt + 1}), retrying...`
              );
              lastError = new Error(`Lottologia returned ok but body too short (${probe.length} chars)`);
              response = null;
              continue;
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
        if (scraperApiRequiresPremium) {
          throw new Error(
            'ScraperAPI segnala dominio protetto. Per Lotto usa una chiave dedicata ' +
              '(SCRAPER_API_KEY_LOTTO) con piano adatto, oppure abilita premium/ultra premium.'
          );
        }
        throw new Error(`Lottologia request failed after all attempts: ${errorText}`);
      }
    }
    
    console.log('[scrape-lotto] Fetch successful, reading response...');
    const html = await readBodyAsUtf8(response);
    console.log(`[scrape-lotto] Fetched HTML, length: ${html.length}`);
    
    if (!html || html.length < MIN_HTML_LEN) {
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
      console.error('[scrape-lotto] Error message:', redactScraperApiKey(error.message));
      console.error('[scrape-lotto] Error stack:', redactScraperApiKey(error.stack || ''));
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
    console.log(`[sync-lotto] scrapeRaceMs=${LOTTO_SCRAPE_RACE_MS} (if logs show 30s/90s, deployment is stale)`);

    // Scrape extractions with timeout protection
    let extractions;
    try {
      console.log('[sync-lotto] Calling scrapeLottoExtractions...');
      const scrapePromise = scrapeLottoExtractions();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(`Scraping timeout after ${Math.round(LOTTO_SCRAPE_RACE_MS / 1000)} seconds`)
            ),
          LOTTO_SCRAPE_RACE_MS
        );
      });
      
      console.log('[sync-lotto] Waiting for scrape to complete...');
      extractions = await Promise.race([scrapePromise, timeoutPromise]);
      console.log(`[sync-lotto] Scrape completed, got ${extractions.length} extractions`);
    } catch (scrapeError) {
      console.error('Error scraping Lotto:', scrapeError);
      const errorMessage = safeErrorMessage(scrapeError);
      const errorStack = safeErrorStack(scrapeError);
      console.error('Scrape error details:', { errorMessage, errorStack });

      let userMessage = errorMessage;
      if (
        errorMessage.includes('premium=true') ||
        errorMessage.includes('ultra_premium=true') ||
        errorMessage.toLowerCase().includes('premium proxies')
      ) {
        userMessage =
          'Il piano della chiave ScraperAPI usata per Lotto non include proxy premium/ultra premium. ' +
          'Usa SCRAPER_API_KEY_LOTTO con piano adeguato, oppure disattiva i flag premium/ultra.';
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'Timeout durante lo scraping Lotto. Riprova più tardi.';
      } else if (
        errorMessage.includes('Cloudflare') ||
        errorMessage.includes('403') ||
        errorMessage.includes('Lottologia request failed')
      ) {
        userMessage = 'Il sito ha bloccato la richiesta. Configura SCRAPER_API_KEY in Vercel per bypassare le protezioni anti-bot.';
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
        message: safeErrorMessage(dbError) || 'Database query failed',
        total: extractions.length,
        new: 0,
        error: safeErrorStack(dbError),
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

async function syncSuperEnalotto(): Promise<{
  success: boolean;
  message: string;
  total: number;
  new: number;
  error?: string;
}> {
  try {
    console.log('[sync] Starting SuperEnalotto sync (latest extractions only)...');
    
    // Test import first
    let scrapeFunction;
    try {
      const scrapeModule = await import('../scrape/superenalotto.js');
      scrapeFunction = scrapeModule.scrapeSuperEnalottoExtractions;
      if (typeof scrapeFunction !== 'function') {
        throw new Error('scrapeSuperEnalottoExtractions is not a function');
      }
      console.log('[sync] Import successful');
    } catch (importError) {
      console.error('[sync] Import error:', importError);
      return {
        success: false,
        message: `Import error: ${safeErrorMessage(importError)}`,
        total: 0,
        new: 0,
        error: safeErrorStack(importError),
      };
    }
    
    // Scrape only the latest extractions (first page)
    let extractions: ExtractedNumbers[] = [];
    try {
      extractions = await scrapeFunction();
    } catch (scrapeErr) {
      console.error('[sync] Scraping error:', scrapeErr);
      const errMsg = safeErrorMessage(scrapeErr);
      console.error('[sync] Scraping error details:', errMsg);
      
      // Return a more user-friendly error message
      let userMessage = errMsg;
      if (errMsg.includes('Cloudflare') || errMsg.includes('403') || errMsg.includes('Lottologia request failed')) {
        userMessage = 'Il sito ha bloccato la richiesta. Configura SCRAPER_API_KEY in Vercel per bypassare le protezioni anti-bot.';
      } else if (errMsg.includes('timeout')) {
        userMessage = 'Timeout durante lo scraping. Riprova più tardi.';
      }
      
      return {
        success: false,
        message: userMessage,
        total: 0,
        new: 0,
        error: safeErrorStack(scrapeErr) || errMsg,
      };
    }
    
    console.log(`[sync] Scraped ${extractions.length} extractions`);
    
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
        message: safeErrorMessage(dbError) || 'Database query failed',
        total: extractions.length,
        new: 0,
        error: safeErrorStack(dbError),
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
    const errorMessage = safeErrorMessage(error) || 'Unknown error occurred';
    const errorStack = safeErrorStack(error);
    
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    await requireUserIdFromAuthHeader(getSupabaseServerClient(), req.headers.authorization);
    
    console.log('[sync-all] Handler called', { 
      method: req.method, 
      query: req.query, 
      body: req.body,
      url: req.url 
    });
    
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
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const bodyGameType = typeof body.gameType === 'string' ? body.gameType : undefined;
    const gameType = (req.query.gameType as string) || bodyGameType || 'all';
    
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
          error: safeErrorMessage(error) || 'Unknown error',
        };
      }
      
      try {
        const lottoResult = await syncLotto();
        results.lotto = lottoResult;
      } catch (error) {
        results.lotto = { 
          success: false,
          error: safeErrorMessage(error) || 'Unknown error',
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
          console.log('[sync-all] Calling syncSuperEnalotto (latest extractions only)...');
          const result = await syncSuperEnalotto();
          console.log('[sync-all] syncSuperEnalotto completed successfully');
          
          return res.status(200).json({
            gameType,
            ...result,
          });
        } catch (syncError) {
          console.error('[sync-all] Error in syncSuperEnalotto:', syncError);
          const errorMessage = safeErrorMessage(syncError) || 'Unknown error';
          const errorStack = safeErrorStack(syncError);
          const errorName = syncError instanceof Error ? syncError.name : 'Error';
          
          console.error('[sync-all] Full error details:', {
            name: errorName,
            message: errorMessage,
            stack: errorStack,
          });
          
          return res.status(500).json({
            success: false,
            error: 'Sync failed',
            message: errorMessage,
            gameType,
            errorName,
            details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
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
            message: safeErrorMessage(syncError) || 'Unknown error',
            gameType,
            details: process.env.NODE_ENV === 'development' ? safeErrorStack(syncError) : undefined,
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
      const errorMessage = safeErrorMessage(error) || 'Unknown error';
      const errorStack = safeErrorStack(error);
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
    const errorMessage = safeErrorMessage(initError) || 'Initialization failed';
    const errorStack = safeErrorStack(initError);
    
    return res.status(500).json({
      error: 'Function initialization failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    });
  }
}
