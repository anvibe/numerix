import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GameType } from '../../types';
import { parseLottoCSV } from '../../utils/lottoData';
import { parseSuperenalottoCSV } from '../../utils/superenalottoData';

interface UploadStatus {
  type: 'success' | 'error' | null;
  message: string;
}

const CSVUploader: React.FC = () => {
  const { setExtractionsForGame } = useGame();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [gameType, setGameType] = useState<GameType>('superenalotto');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ type: null, message: '' });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadStatus({ type: null, message: '' });
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: 'Per favore seleziona un file CSV valido.' 
        });
        setSelectedFile(null);
      }
    }
  };

  const validateCSVFormat = (content: string, gameType: GameType): string | null => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return 'Il file CSV è vuoto.';
    }

    // Find the first actual data line by checking if the line starts with a date pattern
    // and has the minimum required number of fields
    let firstDataLine: string | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      if (gameType === 'superenalotto') {
        // For SuperEnalotto, check if line starts with YYYY-MM-DD format
        // The format can be: "YYYY-MM-DD num1 num2 num3 num4 num5 num6 jolly superstar"
        // or comma-separated: "YYYY-MM-DD","num1 num2 num3 num4 num5 num6","jolly","superstar"
        
        // Remove quotes and check for date pattern at the start
        const cleanLine = trimmedLine.replace(/"/g, '');
        const datePattern = /^\d{4}-\d{2}-\d{2}/;
        
        if (datePattern.test(cleanLine)) {
          // Split by comma first to handle comma-separated format
          const commaParts = cleanLine.split(',').map(p => p.trim());
          
          if (commaParts.length >= 3) {
            // Comma-separated format: Date, Numbers, Jolly, SuperStar
            firstDataLine = trimmedLine;
            break;
          } else {
            // Space-separated format: Date followed by space-separated values
            const spaceParts = cleanLine.split(/\s+/).filter(p => p.trim());
            if (spaceParts.length >= 8) { // Date + 6 numbers + jolly (+ optional superstar)
              firstDataLine = trimmedLine;
              break;
            }
          }
        }
      } else if (gameType === 'lotto') {
        // Remove quotes and split by multiple spaces (2 or more) to handle space-delimited format
        const cleanLine = trimmedLine.replace(/"/g, '');
        const parts = cleanLine.split(/\s{2,}/).map(p => p.trim());
        
        // Check if line starts with DD/MM format and has at least 12 fields (Date + 11 wheels)
        const datePattern = /^\d{1,2}\/\d{1,2}/;
        if (datePattern.test(parts[0]) && parts.length >= 12) {
          firstDataLine = trimmedLine;
          break;
        }
      }
    }

    if (!firstDataLine) {
      if (gameType === 'superenalotto') {
        return 'Nessuna riga di dati valida trovata. Verifica che il formato sia: Data (YYYY-MM-DD), Numeri (6 numeri separati da spazi), Jolly, SuperStar. Esempio: "2025-01-15","06 09 25 28 75 79","83","20" oppure "2025-01-15 06 09 25 28 75 79 83 20"';
      } else {
        return 'Nessuna riga di dati valida trovata. Verifica che il formato sia: Data (DD/MM) seguita da 11 colonne per le ruote del Lotto. Esempio: "15/01"  "41 76 54 04 17"  "34 52 84 54 55"  ...';
      }
    }

    // Validate format based on game type using the first valid data line
    if (gameType === 'superenalotto') {
      // Remove quotes and clean the line
      const cleanLine = firstDataLine.replace(/"/g, '');
      
      // Try comma-separated format first
      const commaParts = cleanLine.split(',').map(p => p.trim());
      
      if (commaParts.length >= 3) {
        // Comma-separated format validation
        if (commaParts.length < 3) {
          return 'Formato SuperEnalotto non valido. Sono richiesti almeno 3 campi: Data, Numeri, Jolly.';
        }

        const numbersStr = commaParts[1].trim();
        const numbers = numbersStr.split(/\s+/).filter(n => n.trim());
        
        if (numbers.length !== 6) {
          return `Formato numeri non valido per SuperEnalotto. Trovati ${numbers.length} numeri, attesi 6 numeri separati da spazi. Esempio: "06 09 25 28 75 79"`;
        }
        
        // Validate that all numbers are valid integers between 1-90
        const validNumbers = numbers.filter(n => {
          const num = parseInt(n.trim(), 10);
          return !isNaN(num) && num >= 1 && num <= 90;
        });
        
        if (validNumbers.length !== 6) {
          return `Formato numeri non valido per SuperEnalotto. Trovati ${validNumbers.length} numeri validi, attesi 6 numeri tra 1 e 90.`;
        }
      } else {
        // Space-separated format validation
        const spaceParts = cleanLine.split(/\s+/).filter(p => p.trim());
        
        if (spaceParts.length < 8) {
          return `Formato SuperEnalotto non valido. Trovati ${spaceParts.length} elementi, attesi almeno 8 (Data + 6 numeri + Jolly).`;
        }
        
        // Extract numbers (positions 1-6 after the date)
        const numbers = spaceParts.slice(1, 7);
        
        // Validate that all numbers are valid integers between 1-90
        const validNumbers = numbers.filter(n => {
          const num = parseInt(n.trim(), 10);
          return !isNaN(num) && num >= 1 && num <= 90;
        });
        
        if (validNumbers.length !== 6) {
          return `Formato numeri non valido per SuperEnalotto. Trovati ${validNumbers.length} numeri validi, attesi 6 numeri tra 1 e 90.`;
        }
        
        // Validate jolly (position 7)
        const jolly = parseInt(spaceParts[7], 10);
        if (isNaN(jolly) || jolly < 1 || jolly > 90) {
          return 'Formato Jolly non valido per SuperEnalotto. Deve essere un numero tra 1 e 90.';
        }
        
        // Validate superstar if present (position 8)
        if (spaceParts.length > 8) {
          const superstar = parseInt(spaceParts[8], 10);
          if (isNaN(superstar) || superstar < 1 || superstar > 90) {
            return 'Formato SuperStar non valido per SuperEnalotto. Deve essere un numero tra 1 e 90.';
          }
        }
      }

    } else if (gameType === 'lotto') {
      // Remove quotes and split by multiple spaces (2 or more) to handle space-delimited format
      const cleanLine = firstDataLine.replace(/"/g, '');
      const parts = cleanLine.split(/\s{2,}/).map(p => p.trim());
      
      if (parts.length < 12) {
        return `Formato Lotto non valido. Trovate ${parts.length} colonne, attese almeno 12 (Data + 11 ruote).`;
      }

      // Check that each wheel has 5 numbers
      for (let i = 1; i <= 11; i++) {
        const wheelData = parts[i];
        if (!wheelData) continue;
        
        const numbers = wheelData.trim().split(/\s+/).filter(n => n.trim());
        if (numbers.length !== 5) {
          return `Formato Lotto non valido. La ruota in colonna ${i + 1} ha ${numbers.length} numeri, attesi 5.`;
        }
        
        // Validate numbers are between 1-90
        const validNumbers = numbers.filter(n => {
          const num = parseInt(n.trim(), 10);
          return !isNaN(num) && num >= 1 && num <= 90;
        });
        
        if (validNumbers.length !== 5) {
          return `Formato Lotto non valido. La ruota in colonna ${i + 1} ha ${validNumbers.length} numeri validi, attesi 5 numeri tra 1 e 90.`;
        }
      }
    }

    return null; // No validation errors
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ 
        type: 'error', 
        message: 'Per favore seleziona un file CSV prima di procedere.' 
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const fileContent = await readFileAsText(selectedFile);
      
      // Validate CSV format before parsing
      const validationError = validateCSVFormat(fileContent, gameType);
      if (validationError) {
        throw new Error(validationError);
      }

      let parsedData;

      if (gameType === 'lotto') {
        parsedData = parseLottoCSV(fileContent);
      } else if (gameType === 'superenalotto') {
        parsedData = parseSuperenalottoCSV(fileContent);
      } else {
        throw new Error('Tipo di gioco non supportato per l\'upload CSV.');
      }

      if (parsedData.length === 0) {
        throw new Error('Nessuna estrazione valida trovata nel file CSV. Verifica che il formato corrisponda al tipo di gioco selezionato.');
      }

      // Update the game data
      setExtractionsForGame(gameType, parsedData);

      setUploadStatus({ 
        type: 'success', 
        message: `File caricato con successo! ${parsedData.length} estrazioni importate per ${gameType === 'lotto' ? 'Lotto' : 'SuperEnalotto'}.` 
      });

      // Reset form
      setSelectedFile(null);
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Errore durante il caricamento del file.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Impossibile leggere il file.'));
        }
      };
      reader.onerror = () => reject(new Error('Errore durante la lettura del file.'));
      reader.readAsText(file);
    });
  };

  return (
    <div className="mb-6 p-4 bg-bg-primary border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Upload className="h-5 w-5 mr-2 text-primary" />
        Carica File CSV Estrazioni
      </h3>
      
      <div className="space-y-4">
        {/* Game Type Selection */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Tipo di Gioco
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="gameType"
                value="superenalotto"
                checked={gameType === 'superenalotto'}
                onChange={(e) => setGameType(e.target.value as GameType)}
                className="mr-2"
              />
              SuperEnalotto
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gameType"
                value="lotto"
                checked={gameType === 'lotto'}
                onChange={(e) => setGameType(e.target.value as GameType)}
                className="mr-2"
              />
              Lotto
            </label>
          </div>
        </div>

        {/* File Selection */}
        <div>
          <label htmlFor="csv-file-input" className="block text-sm font-medium text-text-secondary mb-2">
            Seleziona File CSV
          </label>
          <div className="flex items-center space-x-3">
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-text-secondary
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-white
                hover:file:bg-primary-dark
                file:cursor-pointer cursor-pointer"
            />
            {selectedFile && (
              <div className="flex items-center text-sm text-text-secondary">
                <FileText className="h-4 w-4 mr-1" />
                {selectedFile.name}
              </div>
            )}
          </div>
        </div>

        {/* Upload Status */}
        {uploadStatus.type && (
          <div className={`flex items-start p-3 rounded-md ${
            uploadStatus.type === 'success' 
              ? 'bg-success/10 text-success border border-success/20' 
              : 'bg-error/10 text-error border border-error/20'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm leading-relaxed">{uploadStatus.message}</span>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="btn btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-5 w-5 mr-2" />
          {isUploading ? 'Caricamento in corso...' : 'Carica CSV'}
        </button>

        {/* Format Information */}
        <div className="mt-4 p-3 bg-bg-secondary rounded-md">
          <h4 className="text-sm font-medium text-text-primary mb-2">Formato File CSV:</h4>
          <div className="text-xs text-text-secondary space-y-2">
            {gameType === 'superenalotto' ? (
              <>
                <p><strong>SuperEnalotto formati supportati:</strong></p>
                <div className="ml-2 space-y-2">
                  <div>
                    <p><strong>Formato 1 (comma-separated):</strong> Data, Numeri (6 numeri separati da spazi), Jolly, SuperStar</p>
                    <p><strong>Formato 2 (space-separated):</strong> Data seguito da spazi e tutti i valori</p>
                    <p><strong>Formato Data:</strong> YYYY-MM-DD (es. 2025-01-15)</p>
                    <div className="mt-1 p-2 bg-bg-primary rounded text-xs">
                      <strong>Esempi:</strong><br/>
                      "2025-07-01","06 09 25 28 75 79","83","20"<br/>
                      "2025-06-28","10 35 38 41 51 56","03","51"<br/>
                      2025-07-01 06 09 25 28 75 79 83 20<br/>
                      2025-06-28 10 35 38 41 51 56 03 51
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p><strong>Lotto:</strong> Data, seguito da 11 colonne per le ruote (Bari, Cagliari, Firenze, ecc.)</p>
                <p><strong>Formato Data:</strong> DD/MM (es. 28/06)</p>
                <p><strong>Ogni ruota:</strong> 5 numeri separati da spazi</p>
                <p><strong>Separatore colonne:</strong> Spazi multipli (2 o più spazi)</p>
                <div className="mt-2 p-2 bg-bg-primary rounded text-xs">
                  <strong>Esempio riga:</strong><br/>
                  "28/06"  "41 76 54 04 17"  "34 52 84 54 55"  "21 60 89 51 03"  ...
                </div>
                <div className="mt-2 p-2 bg-bg-primary rounded text-xs">
                  <strong>Ordine ruote:</strong> Bari, Cagliari, Firenze, Genova, Milano, Napoli, Palermo, Roma, Torino, Venezia, Nazionale
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUploader;