import { ExtractedNumbers } from '../types';

export async function fetchAndParseSuperenalottoCSV(): Promise<ExtractedNumbers[]> {
  try {
    const response = await fetch('/super.csv');
    if (!response.ok) {
      throw new Error('Failed to fetch SuperEnalotto CSV data');
    }
    const csvContent = await response.text();
    return parseSuperenalottoCSV(csvContent);
  } catch (error) {
    console.error('Error loading SuperEnalotto data:', error);
    return [];
  }
}

export function parseSuperenalottoCSV(csvContent: string): ExtractedNumbers[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const extractions: ExtractedNumbers[] = [];

  // Skip header lines and find the start of data
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Remove quotes and check for lines that start with a date pattern (YYYY-MM-DD)
    const cleanLine = line.replace(/"/g, '');
    if (cleanLine.match(/^\d{4}-\d{2}-\d{2}/)) {
      dataStartIndex = i;
      break;
    }
  }

  if (dataStartIndex === -1) {
    console.warn('No data found in SuperEnalotto CSV');
    return [];
  }

  // Parse data lines
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip lines that don't contain data or are page indicators
    if (line.includes('page') || 
        line.includes('Powered by') ||
        line.includes('Archivio') ||
        line.includes('lottologia.com') ||
        line.trim() === '' ||
        line.trim() === '""') {
      continue;
    }

    // Remove quotes and clean up the line
    const cleanLine = line.replace(/"/g, '').trim();
    
    // Skip empty lines
    if (!cleanLine) continue;

    // Extract date using regex (YYYY-MM-DD format)
    const dateMatch = cleanLine.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    
    const dateStr = dateMatch[1];
    
    // Extract the rest of the line after the date
    const restOfLine = cleanLine.substring(dateStr.length).trim();
    
    // Split the remaining content by multiple spaces to get numbers, jolly, and superstar
    const parts = restOfLine.split(/\s+/).filter(part => part.trim());
    
    if (parts.length < 6) continue; // Need at least 6 main numbers
    
    // Parse main numbers (first 6 numbers)
    const numbers = parts.slice(0, 6)
      .map(n => parseInt(n, 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 90)
      .sort((a, b) => a - b);

    // Must have exactly 6 main numbers
    if (numbers.length !== 6) continue;

    // Parse Jolly and Superstar numbers (if available)
    let jolly: number | undefined;
    let superstar: number | undefined;
    
    if (parts.length >= 7) {
      const jollyNum = parseInt(parts[6], 10);
      jolly = !isNaN(jollyNum) && jollyNum >= 1 && jollyNum <= 90 ? jollyNum : undefined;
    }
    
    if (parts.length >= 8) {
      const superstarNum = parseInt(parts[7], 10);
      superstar = !isNaN(superstarNum) && superstarNum >= 1 && superstarNum <= 90 ? superstarNum : undefined;
    }

    extractions.push({
      date: dateStr,
      numbers,
      jolly,
      superstar
    });
  }

  console.log(`Parsed ${extractions.length} SuperEnalotto extractions`);
  return extractions;
}