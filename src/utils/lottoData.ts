import { ExtractedNumbers, LottoWheel } from '../types';

export const LOTTO_WHEELS: LottoWheel[] = [
  'Bari', 'Cagliari', 'Firenze', 'Genova', 'Milano',
  'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Nazionale'
];

export async function fetchAndParseLottoCSV(): Promise<ExtractedNumbers[]> {
  try {
    const response = await fetch('/lotto.csv');
    if (!response.ok) {
      throw new Error('Failed to fetch Lotto CSV data');
    }
    const csvContent = await response.text();
    return parseLottoCSV(csvContent);
  } catch (error) {
    console.error('Error loading Lotto data:', error);
    return [];
  }
}

export function parseLottoCSV(csvContent: string): ExtractedNumbers[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const extractions: ExtractedNumbers[] = [];

  // Extract year from the first line
  let year = '2025'; // Default fallback
  const firstLine = lines[0];
  const yearMatch = firstLine.match(/Anno (\d{4})/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // Find the header line with wheel names to determine data start
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Remove quotes and check for header line
    const cleanLine = line.replace(/"/g, '');
    if (cleanLine.includes('Data') && cleanLine.includes('Bari') && cleanLine.includes('Cagliari')) {
      dataStartIndex = i + 1; // Data starts after the header
      break;
    }
  }

  if (dataStartIndex === -1) {
    console.warn('No data header found in Lotto CSV');
    return [];
  }

  // Parse data lines
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip lines that don't contain data or are page indicators
    if (!line.includes('/') || // Must have date with /
        line.includes('page') || 
        line.includes('Powered by') ||
        line.includes('Archivio') ||
        line.includes('lottologia.com') ||
        line.trim() === '' ||
        line.trim() === '""' ||
        line.startsWith(',')) {
      continue;
    }

    // Remove quotes and clean up the line
    const cleanLine = line.replace(/"/g, '').trim();
    
    // Split by multiple spaces to separate date and wheel data
    const parts = cleanLine.split(/\s{2,}/).filter(part => part.trim());
    
    if (parts.length < 12) continue; // Need date + 11 wheels

    const dateStr = parts[0].trim();
    
    // Validate and parse date (format: DD/MM or similar)
    if (!dateStr || !dateStr.includes('/')) continue;
    
    const dateParts = dateStr.split('/');
    if (dateParts.length < 2) continue;
    
    const day = dateParts[0].padStart(2, '0');
    const month = dateParts[1].padStart(2, '0');
    
    // Construct full date
    const fullDate = `${year}-${month}-${day}`;

    // Parse wheel data
    const wheels: Record<LottoWheel, number[]> = {} as Record<LottoWheel, number[]>;
    let hasValidData = false;
    
    LOTTO_WHEELS.forEach((wheel, index) => {
      const wheelData = parts[index + 1]; // +1 because first part is date
      if (!wheelData) {
        wheels[wheel] = [];
        return;
      }

      // Handle space-separated numbers within each wheel
      const numbers = wheelData
        .trim()
        .split(/\s+/)
        .map(n => parseInt(n, 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 90)
        .sort((a, b) => a - b);

      // Each wheel should have exactly 5 numbers
      if (numbers.length === 5) {
        wheels[wheel] = numbers;
        hasValidData = true;
      } else {
        wheels[wheel] = [];
      }
    });

    // Only add extraction if at least one wheel has valid data
    if (hasValidData) {
      extractions.push({
        date: fullDate,
        numbers: wheels.Bari || [], // Use Bari's numbers as default
        wheels
      });
    }
  }

  console.log(`Parsed ${extractions.length} Lotto extractions for year ${year}`);
  return extractions;
}