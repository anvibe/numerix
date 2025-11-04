import React, { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ExtractedNumbers, LottoWheel } from '../../types';
import { LOTTO_WHEELS } from '../../utils/constants';
import { showToast } from '../../utils/toast';

const AddExtractionForm: React.FC = () => {
  const { selectedGame, gameConfig, addExtraction } = useGame();
  const [date, setDate] = useState<string>('');
  const [numbers, setNumbers] = useState<string>('');
  const [selectedWheel, setSelectedWheel] = useState<LottoWheel>('Bari');
  const [wheelNumbers, setWheelNumbers] = useState<Record<LottoWheel, string>>(
    LOTTO_WHEELS.reduce((acc, wheel) => ({ ...acc, [wheel]: '' }), {} as Record<LottoWheel, string>)
  );
  const [error, setError] = useState<string>('');
  
  const validateNumbers = (input: string, maxNumber: number, requiredCount: number): number[] | null => {
    const nums = input.split(/[,\s]+/).map(n => parseInt(n.trim(), 10));
    
    // Check if all numbers are valid
    if (nums.some(isNaN)) {
      setError('Inserisci solo numeri validi');
      return null;
    }
    
    // Check if we have the correct number of selections
    if (nums.length !== requiredCount) {
      setError(`Devi inserire esattamente ${requiredCount} numeri`);
      return null;
    }
    
    // Check for duplicates
    if (new Set(nums).size !== nums.length) {
      setError('Non puoi inserire numeri duplicati');
      return null;
    }
    
    // Check number range
    if (nums.some(n => n < 1 || n > maxNumber)) {
      setError(`I numeri devono essere compresi tra 1 e ${maxNumber}`);
      return null;
    }
    
    return nums.sort((a, b) => a - b);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (selectedGame === 'lotto') {
      // Validate each wheel's numbers
      const wheels: Record<LottoWheel, number[]> = {} as Record<LottoWheel, number[]>;
      
      for (const wheel of LOTTO_WHEELS) {
        const validatedNumbers = validateNumbers(wheelNumbers[wheel], gameConfig.maxNumber, 5);
        if (!validatedNumbers) return;
        wheels[wheel] = validatedNumbers;
      }
      
      const newExtraction: ExtractedNumbers = {
        date,
        numbers: wheels.Bari, // Use Bari's numbers as default
        wheels
      };
      
      addExtraction(selectedGame, newExtraction).then(() => {
        showToast.success('Estrazione aggiunta con successo!');
        // Reset form
        setDate('');
        setWheelNumbers(
          LOTTO_WHEELS.reduce((acc, wheel) => ({ ...acc, [wheel]: '' }), {} as Record<LottoWheel, string>)
        );
      }).catch((error) => {
        showToast.error('Errore durante l\'aggiunta: ' + error.message);
      });
      
    } else {
      const validatedNumbers = validateNumbers(numbers, gameConfig.maxNumber, gameConfig.numbersToSelect);
      if (!validatedNumbers) return;
      
      const newExtraction: ExtractedNumbers = {
        date,
        numbers: validatedNumbers
      };
      
      addExtraction(selectedGame, newExtraction).then(() => {
        showToast.success('Estrazione aggiunta con successo!');
        // Reset form
        setDate('');
        setNumbers('');
      }).catch((error) => {
        showToast.error('Errore durante l\'aggiunta: ' + error.message);
      });
    }
  };
  
  return (
    <div className="mb-6 p-4 bg-bg-primary border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Aggiungi Nuova Estrazione</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-text-secondary mb-1">
            Data Estrazione
          </label>
          <input
            type="date"
            id="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
          />
        </div>
        
        {selectedGame === 'lotto' ? (
          <div className="space-y-4">
            {LOTTO_WHEELS.map(wheel => (
              <div key={wheel}>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Ruota di {wheel}
                </label>
                <input
                  type="text"
                  required
                  value={wheelNumbers[wheel]}
                  onChange={(e) => setWheelNumbers(prev => ({
                    ...prev,
                    [wheel]: e.target.value
                  }))}
                  placeholder="Es: 1, 2, 3, 4, 5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <label htmlFor="numbers" className="block text-sm font-medium text-text-secondary mb-1">
              Numeri Estratti (separati da spazi o virgole)
            </label>
            <input
              type="text"
              id="numbers"
              required
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              placeholder={`Es: ${Array(gameConfig.numbersToSelect).fill(0).map((_, i) => i + 1).join(', ')}`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            />
          </div>
        )}
        
        {error && (
          <div className="flex items-center text-error text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
        
        <button
          type="submit"
          className="btn btn-primary w-full flex items-center justify-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Aggiungi Estrazione
        </button>
      </form>
    </div>
  );
};

export default AddExtractionForm;