import React, { useState } from 'react';
import { TrendingDown, AlertCircle, Plus } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { LottoWheel } from '../../types';
import { LOTTO_WHEELS } from '../../utils/constants';

const AddUnsuccessfulForm: React.FC = () => {
  const { selectedGame, gameConfig, addUnsuccessfulCombination } = useGame();
  const [numbers, setNumbers] = useState<string>('');
  const [selectedWheel, setSelectedWheel] = useState<LottoWheel>('Bari');
  const [jolly, setJolly] = useState<string>('');
  const [superstar, setSuperstar] = useState<string>('');
  const [drawDate, setDrawDate] = useState<string>('');
  const [strategy, setStrategy] = useState<'standard' | 'high-variability' | 'ai' | 'ai-advanced' | 'manual'>('manual');
  const [notes, setNotes] = useState<string>('');
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
  
  const validateSingleNumber = (input: string, maxNumber: number): number | null => {
    if (!input.trim()) return null;
    
    const num = parseInt(input.trim(), 10);
    if (isNaN(num) || num < 1 || num > maxNumber) {
      return null;
    }
    
    return num;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validatedNumbers = validateNumbers(numbers, gameConfig.maxNumber, gameConfig.numbersToSelect);
    if (!validatedNumbers) return;
    
    let validatedJolly: number | undefined;
    let validatedSuperstar: number | undefined;
    
    // Validate jolly and superstar for SuperEnalotto
    if (selectedGame === 'superenalotto') {
      if (jolly.trim()) {
        validatedJolly = validateSingleNumber(jolly, gameConfig.maxNumber);
        if (validatedJolly === null) {
          setError('Il numero Jolly deve essere compreso tra 1 e 90');
          return;
        }
        
        // Check if jolly is not in main numbers
        if (validatedNumbers.includes(validatedJolly)) {
          setError('Il numero Jolly non può essere uguale a uno dei numeri principali');
          return;
        }
      }
      
      if (superstar.trim()) {
        validatedSuperstar = validateSingleNumber(superstar, gameConfig.maxNumber);
        if (validatedSuperstar === null) {
          setError('Il numero SuperStar deve essere compreso tra 1 e 90');
          return;
        }
      }
    }
    
    // Add the unsuccessful combination
    addUnsuccessfulCombination({
      gameType: selectedGame,
      numbers: validatedNumbers,
      drawDate: drawDate || undefined,
      wheel: selectedGame === 'lotto' ? selectedWheel : undefined,
      jolly: validatedJolly,
      superstar: validatedSuperstar,
      strategy,
      notes: notes.trim() || undefined,
    });
    
    // Reset form
    setNumbers('');
    setJolly('');
    setSuperstar('');
    setDrawDate('');
    setStrategy('manual');
    setNotes('');
    
    alert('Combinazione non vincente aggiunta con successo! L\'AI imparerà da questo feedback.');
  };
  
  return (
    <div className="mb-6 p-4 bg-bg-primary border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <TrendingDown className="h-5 w-5 mr-2 text-error" />
        Aggiungi Combinazione Non Vincente
      </h3>
      
      <p className="text-sm text-text-secondary mb-4">
        Inserisci le combinazioni che hai giocato ma che non hanno vinto. 
        L'AI imparerà da questi dati per evitare pattern simili nelle future generazioni.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="numbers" className="block text-sm font-medium text-text-secondary mb-1">
            Numeri Giocati (separati da spazi o virgole) *
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
        
        {selectedGame === 'lotto' && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Ruota
            </label>
            <select
              value={selectedWheel}
              onChange={(e) => setSelectedWheel(e.target.value as LottoWheel)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            >
              {LOTTO_WHEELS.map((wheel) => (
                <option key={wheel} value={wheel}>
                  {wheel}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {selectedGame === 'superenalotto' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="jolly" className="block text-sm font-medium text-text-secondary mb-1">
                Numero Jolly (opzionale)
              </label>
              <input
                type="text"
                id="jolly"
                value={jolly}
                onChange={(e) => setJolly(e.target.value)}
                placeholder="Es: 45"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="superstar" className="block text-sm font-medium text-text-secondary mb-1">
                Numero SuperStar (opzionale)
              </label>
              <input
                type="text"
                id="superstar"
                value={superstar}
                onChange={(e) => setSuperstar(e.target.value)}
                placeholder="Es: 23"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
              />
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="drawDate" className="block text-sm font-medium text-text-secondary mb-1">
              Data Estrazione (opzionale)
            </label>
            <input
              type="date"
              id="drawDate"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Strategia Utilizzata
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
            >
              <option value="manual">Inserimento Manuale</option>
              <option value="standard">Combinazione Standard</option>
              <option value="high-variability">Alta Variabilità</option>
              <option value="ai">AI Locale</option>
              <option value="ai-advanced">AI Avanzata (OpenAI)</option>
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-text-secondary mb-1">
            Note (opzionale)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Es: Numeri scelti in base a date di compleanno, sogni, ecc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
          />
        </div>
        
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
          Aggiungi Combinazione Non Vincente
        </button>
      </form>
    </div>
  );
};

export default AddUnsuccessfulForm;