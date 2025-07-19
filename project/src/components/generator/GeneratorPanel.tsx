import React, { useState, useEffect } from 'react';
import { Shuffle, Save } from 'lucide-react';
import NumberDisplay from './NumberDisplay';
import { useGame } from '../../context/GameContext';
import { LottoWheel } from '../../types';

interface GeneratedNumbers {
  numbers: number[];
  jolly?: number;
  superstar?: number;
}

const GeneratorPanel: React.FC = () => {
  const { selectedGame, gameConfig, generateNumbers, saveCombination } = useGame();
  const [strategy, setStrategy] = useState<'standard' | 'high-variability'>('standard');
  const [generatedNumbers, setGeneratedNumbers] = useState<GeneratedNumbers | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState<LottoWheel>('Bari');
  
  useEffect(() => {
    if (selectedGame === 'lotto' && gameConfig.wheels) {
      setSelectedWheel(gameConfig.wheels[0]);
    }
  }, [selectedGame, gameConfig.wheels]);
  
  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedNumbers(null);
    
    setTimeout(() => {
      const result = generateNumbers(strategy, selectedGame === 'lotto' ? selectedWheel : undefined);
      setGeneratedNumbers(result);
      setIsGenerating(false);
    }, 300);
  };
  
  const handleSave = () => {
    if (generatedNumbers) {
      saveCombination(
        generatedNumbers.numbers, 
        strategy, 
        selectedGame === 'lotto' ? selectedWheel : undefined,
        generatedNumbers.jolly,
        generatedNumbers.superstar,
        false
      );
      alert('Combinazione salvata con successo!');
    }
  };
  
  return (
    <div className="card mb-8">
      <h2 className="text-xl font-semibold mb-4">Generatore Intelligente</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Seleziona Strategia
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className={`btn ${
              strategy === 'standard' ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => setStrategy('standard')}
          >
            Combinazione Standard
          </button>
          <button
            className={`btn ${
              strategy === 'high-variability' ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => setStrategy('high-variability')}
          >
            Alta Variabilità
          </button>
        </div>
      </div>
      
      {selectedGame === 'lotto' && gameConfig.wheels && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Seleziona Ruota
          </label>
          <select
            value={selectedWheel}
            onChange={(e) => setSelectedWheel(e.target.value as LottoWheel)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary"
          >
            {gameConfig.wheels.map((wheel) => (
              <option key={wheel} value={wheel}>
                {wheel}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {generatedNumbers && (
        <div className="bg-bg-primary border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-3 text-center">
            {selectedGame === 'lotto' 
              ? `Numeri Generati per ${gameConfig.name} - Ruota di ${selectedWheel}`
              : `Numeri Generati per ${gameConfig.name}`}
          </h3>
          <NumberDisplay 
            numbers={generatedNumbers.numbers}
            gameType={gameConfig.id}
            jolly={generatedNumbers.jolly}
            superstar={generatedNumbers.superstar}
          />
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          className="btn btn-primary flex items-center justify-center"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          <Shuffle className="mr-2 h-5 w-5" />
          {isGenerating ? 'Generazione...' : 'Genera Numeri'}
        </button>
        
        {generatedNumbers && (
          <button
            className="btn btn-accent flex items-center justify-center"
            onClick={handleSave}
          >
            <Save className="mr-2 h-5 w-5" />
            Salva Combinazione
          </button>
        )}
      </div>
    </div>
  );
};

export default GeneratorPanel;