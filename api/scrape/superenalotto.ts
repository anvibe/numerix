import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
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

// Export scraping function for use by other modules
export async function scrapeSuperEnalottoExtractions(): Promise<ExtractedNumbers[]> {
  return await scrapeLottologiaSuperEnalotto();
}

// Scrape SuperEnalotto from Lottologia (more reliable than ADM for now)
async function scrapeLottologiaSuperEnalotto(): Promise<ExtractedNumbers[]> {
  const extractions: ExtractedNumbers[] = [];
  
  try {
    const url = 'https://www.lottologia.com/superenalotto/archivio-estrazioni/';
    console.log('Scraping SuperEnalotto from Lottologia...', url);
    
    // Use native fetch (Node 18+ on Vercel) or fallback to node-fetch
    let fetchImpl: typeof fetch;
    try {
      // Try native fetch first (available in Node 18+)
      if (typeof globalThis.fetch === 'function') {
        fetchImpl = globalThis.fetch;
        console.log('Using native fetch');
      } else {
        throw new Error('Native fetch not available');
      }
    } catch (e) {
      // Fallback to node-fetch
      console.log('Falling back to node-fetch');
      const nodeFetch = await import('node-fetch');
      fetchImpl = nodeFetch.default as typeof fetch;
    }
    
    const response = await fetchImpl(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error(`Lottologia request failed: ${response.status}`, errorText);
      throw new Error(`Lottologia request failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    const html = await response.text();
    console.log(`Fetched HTML, length: ${html.length}`);
    
    if (!html || html.length < 100) {
      throw new Error('Received empty or too short HTML response');
    }
    
    const $ = cheerio.load(html);
    
    // Parse Lottologia HTML structure - table with class "table table-balls"
    let tableRows = $('table.table-balls tbody tr');
    console.log(`Found ${tableRows.length} table rows with selector 'table.table-balls tbody tr'`);
    
    if (tableRows.length === 0) {
      // Try alternative selectors
      tableRows = $('table tbody tr');
      console.log(`Trying 'table tbody tr', found ${tableRows.length} rows`);
      
      if (tableRows.length === 0) {
        tableRows = $('table tr');
        console.log(`Trying 'table tr', found ${tableRows.length} rows`);
      }
      
      if (tableRows.length === 0) {
        console.error('No table rows found in HTML');
        // Log a sample of the HTML for debugging
        const sampleHtml = html.substring(0, 1000);
        console.error('HTML sample:', sampleHtml);
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
            // Try to extract from class name
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
            // Try to extract from class name
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
          // Sort numbers
          const sortedNumbers = [...numbers].sort((a, b) => a - b);
          
          extractions.push({
            date,
            numbers: sortedNumbers,
            jolly,
            superstar,
          });
        }
      } catch (err) {
        console.error('Error parsing extraction row:', err);
      }
    });
    
    console.log(`Parsed ${extractions.length} extractions from Lottologia`);
    
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
    throw error; // Re-throw to let the caller handle it
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

