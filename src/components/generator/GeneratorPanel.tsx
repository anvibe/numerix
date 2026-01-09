import React, { useState, useEffect } from 'react';
import { Shuffle, Save, Info, ChevronDown, ChevronUp, Zap, Filter, Target } from 'lucide-react';
import NumberDisplay from './NumberDisplay';
import { useGame } from '../../context/GameContext';
import { LottoWheel } from '../../types';
import { showToast } from '../../utils/toast';
import { GenerationMetadata } from '../../utils/generators';

interface GeneratedNumbers {
  numbers: number[];
  jolly?: number;
  superstar?: number;
  metadata?: GenerationMetadata;
}

const GeneratorPanel: React.FC = () => {
  const { selectedGame, gameConfig, generateNumbers, saveCombination } = useGame();
  const [strategy, setStrategy] = useState<'standard' | 'high-variability'>('standard');
  const [generatedNumbers, setGeneratedNumbers] = useState<GeneratedNumbers | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState<LottoWheel>('Bari');
  const [showTransparency, setShowTransparency] = useState(false);
  
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
      ).then(() => {
        showToast.success('Combinazione salvata con successo!');
      }).catch((error) => {
        showToast.error('Errore durante il salvataggio: ' + error.message);
      });
    }
  };
  
  return (
    <div className="card mb-8">
      <h2 className="text-xl font-semibold mb-4">Generatore Intelligente</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Seleziona Strategia
        </label>
        <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="Selezione strategia di generazione">
          <button
            className={`btn ${
              strategy === 'standard' ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => setStrategy('standard')}
            aria-pressed={strategy === 'standard'}
          >
            Combinazione Standard
          </button>
          <button
            className={`btn ${
              strategy === 'high-variability' ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => setStrategy('high-variability')}
            aria-pressed={strategy === 'high-variability'}
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
          
          {/* Transparency Panel */}
          {generatedNumbers.metadata && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowTransparency(!showTransparency)}
                className="w-full flex items-center justify-between text-left"
                aria-expanded={showTransparency}
              >
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium text-primary">
                    Come sono stati generati questi numeri?
                  </span>
                </div>
                {showTransparency ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              
              {showTransparency && (
                <div className="mt-4 space-y-4 text-sm">
                  {/* Algorithm Overview */}
                  <div className="bg-bg-secondary rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Zap className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-semibold mb-1">Algoritmo Utilizzato</p>
                        <p className="text-text-secondary text-xs">
                          {generatedNumbers.metadata.strategy === 'standard' ? (
                            <>
                              <strong>Strategia Standard:</strong> 60% numeri frequenti, 30% numeri ritardatari, 10% random
                            </>
                          ) : (
                            <>
                              <strong>Alta Variabilità:</strong> 40% numeri poco frequenti, 60% random
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sources */}
                  <div className="bg-bg-secondary rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-semibold mb-2">Origine dei Numeri</p>
                        <div className="space-y-1 text-xs">
                          {generatedNumbers.metadata.sources.frequentNumbers && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-success"></span>
                              <span>
                                <strong>{generatedNumbers.metadata.sources.frequentNumbers.length}</strong> da pool frequenti
                                {generatedNumbers.metadata.sources.frequentNumbers.length > 0 && (
                                  <span className="text-text-secondary">
                                    {' '}({generatedNumbers.metadata.sources.frequentNumbers.join(', ')})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          {generatedNumbers.metadata.sources.delayNumbers && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-warning"></span>
                              <span>
                                <strong>{generatedNumbers.metadata.sources.delayNumbers.length}</strong> da pool ritardatari
                                {generatedNumbers.metadata.sources.delayNumbers.length > 0 && (
                                  <span className="text-text-secondary">
                                    {' '}({generatedNumbers.metadata.sources.delayNumbers.join(', ')})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          {generatedNumbers.metadata.sources.infrequentNumbers && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-info"></span>
                              <span>
                                <strong>{generatedNumbers.metadata.sources.infrequentNumbers.length}</strong> da pool poco frequenti
                                {generatedNumbers.metadata.sources.infrequentNumbers.length > 0 && (
                                  <span className="text-text-secondary">
                                    {' '}({generatedNumbers.metadata.sources.infrequentNumbers.join(', ')})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          {generatedNumbers.metadata.sources.randomFill && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                              <span>
                                <strong>{generatedNumbers.metadata.sources.randomFill.length}</strong> random
                                {generatedNumbers.metadata.sources.randomFill.length > 0 && (
                                  <span className="text-text-secondary">
                                    {' '}({generatedNumbers.metadata.sources.randomFill.join(', ')})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pools Used */}
                  <div className="bg-bg-secondary rounded-lg p-3">
                    <p className="font-semibold mb-2">Pool Utilizzati</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-text-secondary">Frequenti</div>
                        <div className="font-bold">{generatedNumbers.metadata.poolsUsed.frequentPoolSize} numeri</div>
                      </div>
                      <div>
                        <div className="text-text-secondary">Ritardatari</div>
                        <div className="font-bold">{generatedNumbers.metadata.poolsUsed.delayPoolSize} numeri</div>
                      </div>
                      <div>
                        <div className="text-text-secondary">Poco Frequenti</div>
                        <div className="font-bold">{generatedNumbers.metadata.poolsUsed.infrequentPoolSize} numeri</div>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      ⚠️ Utilizza solo i <strong>top 10</strong> numeri di ogni categoria, non tutti i 90 numeri disponibili.
                    </p>
                  </div>
                  
                  {/* Filters Applied */}
                  <div className="bg-bg-secondary rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Filter className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-semibold mb-2">Filtri Applicati</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            {generatedNumbers.metadata.filtersApplied.avoidedConsecutive ? (
                              <span className="text-success">✓</span>
                            ) : (
                              <span className="text-warning">⚠</span>
                            )}
                            <span>Sequenze consecutive evitate</span>
                          </div>
                          {generatedNumbers.metadata.filtersApplied.avoidedUnluckyNumbers > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-success">✓</span>
                              <span>
                                {generatedNumbers.metadata.filtersApplied.avoidedUnluckyNumbers} numeri "sfortunati" evitati
                              </span>
                            </div>
                          )}
                          {generatedNumbers.metadata.filtersApplied.avoidedUnluckyPairs > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-success">✓</span>
                              <span>
                                {generatedNumbers.metadata.filtersApplied.avoidedUnluckyPairs} coppie "sfortunate" evitate
                              </span>
                            </div>
                          )}
                          {generatedNumbers.metadata.filtersApplied.balanceCriteria && (
                            <div className="flex items-center gap-2">
                              <span className="text-success">✓</span>
                              <span>Bilanciamento parità/dispari, decadi, distribuzione</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Important Note */}
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                    <p className="font-semibold text-warning mb-1 text-xs">⚠️ Trasparenza Algoritmica</p>
                    <p className="text-xs text-text-secondary">
                      {generatedNumbers.metadata.note}
                    </p>
                    <p className="text-xs text-text-secondary mt-2">
                      <strong>Non analizza tutte le {generatedNumbers.metadata.totalCombinationsPossible.toLocaleString('it-IT')} combinazioni possibili.</strong>
                      {' '}Usa euristiche basate su statistiche storiche per generare combinazioni "esteticamente piacevoli" in modo rapido.
                    </p>
                    <p className="text-xs text-text-secondary mt-2">
                      <strong>Ogni combinazione ha la stessa probabilità di vincere</strong> - questo algoritmo non aumenta le tue possibilità.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="Azioni generatore">
        <button
          className="btn btn-primary flex items-center justify-center"
          onClick={handleGenerate}
          disabled={isGenerating}
          aria-busy={isGenerating}
          aria-label={isGenerating ? 'Generazione in corso' : 'Genera nuovi numeri'}
        >
          <Shuffle className="mr-2 h-5 w-5" aria-hidden="true" />
          {isGenerating ? 'Generazione...' : 'Genera Numeri'}
        </button>
        
        {generatedNumbers && (
          <button
            className="btn btn-accent flex items-center justify-center"
            onClick={handleSave}
            aria-label="Salva la combinazione generata"
          >
            <Save className="mr-2 h-5 w-5" aria-hidden="true" />
            Salva Combinazione
          </button>
        )}
      </div>
    </div>
  );
};

export default GeneratorPanel;