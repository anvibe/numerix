import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { ExtractedNumbers } from '../../src/types';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    console.log('Scraping SuperEnalotto from Lottologia...');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Lottologia request failed: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Parse Lottologia HTML structure
    // Common selectors for extraction tables
    $('table tr, .estrazione-row, .draw-row, .risultato').each((i, elem) => {
      try {
        const $elem = $(elem);
        const rowText = $elem.text();
        
        // Skip header rows
        if (rowText.toLowerCase().includes('data') && rowText.toLowerCase().includes('numero')) {
          return;
        }
        
        // Try to find date in various formats
        let dateText = '';
        let numbersText = '';
        let jollyText = '';
        let superstarText = '';
        
        // Look for date patterns
        const dateMatch = rowText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        if (dateMatch) {
          dateText = dateMatch[1];
        }
        
        // Extract numbers - look for 6 numbers between 1-90
        const numbers = parseNumbers(rowText);
        if (numbers.length >= 6) {
          numbersText = numbers.slice(0, 6).join(' ');
        }
        
        // Look for jolly (usually after the 6 main numbers)
        const jollyMatch = rowText.match(/jolly[:\s]*(\d+)/i) || rowText.match(/(?:^|\s)(\d{1,2})(?:\s|$)/g);
        if (jollyMatch) {
          const jollyNum = parseInt(jollyMatch[0].replace(/\D/g, ''), 10);
          if (jollyNum > 0 && jollyNum <= 90) {
            jollyText = jollyNum.toString();
          }
        }
        
        // Look for superstar
        const superstarMatch = rowText.match(/superstar[:\s]*(\d+)/i);
        if (superstarMatch) {
          superstarText = superstarMatch[1];
        }
        
        if (dateText && numbers.length >= 6) {
          const date = parseDate(dateText);
          const jolly = jollyText ? parseInt(jollyText, 10) : undefined;
          const superstar = superstarText ? parseInt(superstarText, 10) : undefined;
          
          if (date && numbers.length === 6) {
            extractions.push({
              date,
              numbers: numbers.slice(0, 6).sort((a, b) => a - b),
              jolly,
              superstar,
            });
          }
        }
      } catch (err) {
        console.error('Error parsing extraction:', err);
      }
    });
    
    // If table parsing didn't work, try alternative selectors
    if (extractions.length === 0) {
      $('.numero-estratto, .number, .ball').each((i, elem) => {
        // Alternative parsing logic
      });
    }
    
    return extractions;
  } catch (error) {
    console.error('Error scraping Lottologia:', error);
    return [];
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
    const extractions = await scrapeLottologiaSuperEnalotto();
    
    if (extractions.length === 0) {
      return res.status(500).json({
        error: 'No extractions found',
        message: 'Could not scrape any extractions from available sources',
      });
    }
    
    console.log(`Found ${extractions.length} extractions`);
    
    // Check for existing extractions to avoid duplicates
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
    return res.status(500).json({
      error: 'Scraping failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

