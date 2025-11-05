import React, { useState, useEffect } from 'react';
import { Brain, Info, Settings, Sparkles, Zap } from 'lucide-react';
import { generateAIRecommendation } from '../../utils/generators';
import { openAIService } from '../../utils/openaiService';
import { useGame } from '../../context/GameContext';
import NumberBubble from '../common/NumberBubble';
import OpenAISettings from './OpenAISettings';
import { LottoWheel } from '../../types';
import { showToast } from '../../utils/toast';

interface AIResult {
  numbers: number[];
  reasons: string[];
  jolly?: number;
  superstar?: number;
  confidence?: number;
  isOpenAI?: boolean;
}

const AIRecommendation: React.FC = () => {
  const { 
    selectedGame, 
    gameConfig, 
    gameStats, 
    saveCombination, 
    unsuccessfulCombinations,
    extractionsData
  } = useGame();
  
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState<LottoWheel>('Bari');
  const [useOpenAI, setUseOpenAI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    if (selectedGame === 'lotto' && gameConfig.wheels) {
      setSelectedWheel(gameConfig.wheels[0]);
    }
  }, [selectedGame, gameConfig.wheels]);

  // Check if OpenAI is available
  const isOpenAIAvailable = openAIService.isAvailable();
  
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setAiResult(null);
    setError('');
    
    try {
      if (useOpenAI && isOpenAIAvailable) {
        // Use OpenAI for advanced AI recommendation with advanced statistics
        const result = await openAIService.generateAIRecommendation(
          selectedGame,
          gameStats,
          unsuccessfulCombinations,
          extractionsData[selectedGame],
          selectedGame === 'lotto' ? selectedWheel : undefined,
          gameStats.advancedStatistics // Pass advanced statistics
        );
        
        setAiResult({
          ...result,
          isOpenAI: true
        });
      } else {
        // Use local AI recommendation with advanced statistics
        setTimeout(() => {
          const result = generateAIRecommendation(
            selectedGame, 
            gameStats,
            selectedGame === 'lotto' ? selectedWheel : undefined,
            gameStats.advancedStatistics // Pass advanced statistics
          );
          setAiResult({
            ...result,
            confidence: 75, // Default confidence for local AI
            isOpenAI: false
          });
        }, 500);
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Errore durante la generazione AI');
      
      // Fallback to local AI
      if (useOpenAI) {
        setTimeout(() => {
          const result = generateAIRecommendation(
            selectedGame, 
            gameStats,
            selectedGame === 'lotto' ? selectedWheel : undefined,
            gameStats.advancedStatistics // Pass advanced statistics
          );
          setAiResult({
            ...result,
            confidence: 75,
            isOpenAI: false
          });
        }, 500);
      }
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveAI = () => {
    if (aiResult) {
      console.log('Saving AI combination with flags:', {
        isOpenAI: aiResult.isOpenAI,
        isAI: !aiResult.isOpenAI,
        isAdvancedAI: aiResult.isOpenAI
      });
      
      saveCombination(
        aiResult.numbers, 
        'standard',
        selectedGame === 'lotto' ? selectedWheel : undefined,
        aiResult.jolly,
        aiResult.superstar,
        !aiResult.isOpenAI, // isAI (true for local AI, false for OpenAI)
        !!aiResult.isOpenAI   // isAdvancedAI (true for OpenAI, false for local AI)
      ).then(() => {
        showToast.success('Combinazione AI salvata con successo!');
      }).catch((error) => {
        showToast.error('Errore durante il salvataggio: ' + error.message);
      });
    }
  };
  
  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {aiResult?.isOpenAI ? (
            <Sparkles className="h-6 w-6 text-primary mr-3" />
          ) : (
            <Brain className="h-6 w-6 text-primary mr-3" />
          )}
          <h2 className="text-xl font-semibold">
            {aiResult?.isOpenAI ? 'AI Avanzata (OpenAI)' : 'Modalità AI Suggerisci'}
          </h2>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn btn-outline flex items-center text-sm"
        >
          <Settings className="h-4 w-4 mr-1" />
          {showSettings ? 'Nascondi' : 'Impostazioni'}
        </button>
      </div>
      
      {showSettings && <OpenAISettings />}
      
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {isOpenAIAvailable ? (
            <>
              <strong>AI Avanzata Disponibile:</strong> Puoi scegliere tra l'AI locale (gratuita) 
              o l'AI avanzata di OpenAI (più sofisticata, richiede API key).
            </>
          ) : (
            <>
              <strong>AI Locale:</strong> Utilizza un algoritmo di apprendimento semplificato per generare numeri con
              più probabilità di uscita basandosi su pattern statistici e feedback delle combinazioni non vincenti.
            </>
          )}
        </p>
      </div>

      {isOpenAIAvailable && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Tipo di AI
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="aiType"
                checked={!useOpenAI}
                onChange={() => setUseOpenAI(false)}
                className="mr-2"
              />
              <Brain className="h-4 w-4 mr-1" />
              AI Locale (Gratuita)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="aiType"
                checked={useOpenAI}
                onChange={() => setUseOpenAI(true)}
                className="mr-2"
              />
              <Sparkles className="h-4 w-4 mr-1" />
              AI Avanzata (OpenAI)
            </label>
          </div>
        </div>
      )}
      
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
      
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-md">
          <p className="text-error text-sm">{error}</p>
          <p className="text-text-secondary text-xs mt-1">
            Utilizzando l'AI locale come fallback...
          </p>
        </div>
      )}
      
      {aiResult && (
        <div className="bg-bg-primary border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center">
              {aiResult.isOpenAI ? (
                <Sparkles className="h-5 w-5 text-primary mr-2" />
              ) : (
                <Info className="h-5 w-5 text-primary mr-2" />
              )}
              {selectedGame === 'lotto' 
                ? `Suggerimenti AI per la Ruota di ${selectedWheel}:`
                : 'Ecco perché l\'AI ha scelto questi numeri:'}
            </h3>
            
            {aiResult.confidence && (
              <div className="flex items-center">
                <Zap className="h-4 w-4 text-warning mr-1" />
                <span className="text-sm font-medium">
                  Confidenza: {aiResult.confidence}%
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {aiResult.numbers.map((number, index) => (
              <NumberBubble 
                key={index} 
                number={number} 
                type="selected" 
              />
            ))}
          </div>
          
          {selectedGame === 'superenalotto' && (aiResult.jolly || aiResult.superstar) && (
            <div className="flex flex-col items-center gap-2 mb-4">
              {aiResult.jolly && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-secondary">Jolly:</span>
                  <NumberBubble 
                    number={aiResult.jolly} 
                    type="cold"
                    size="md" 
                  />
                </div>
              )}
              
              {aiResult.superstar && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-secondary">SuperStar:</span>
                  <NumberBubble 
                    number={aiResult.superstar} 
                    type="hot"
                    size="md" 
                  />
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-secondary">
              {aiResult.isOpenAI ? 'Analisi AI Avanzata:' : 'Ragionamento AI:'}
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-text-secondary text-sm">
              {aiResult.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
          
          {aiResult.isOpenAI && (
            <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded text-xs text-primary">
              ✨ Questa raccomandazione è stata generata utilizzando l'AI avanzata di OpenAI
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          className="btn btn-primary flex items-center justify-center"
          onClick={handleGenerateAI}
          disabled={isGenerating}
        >
          {aiResult?.isOpenAI || (useOpenAI && isOpenAIAvailable) ? (
            <Sparkles className="mr-2 h-5 w-5" />
          ) : (
            <Brain className="mr-2 h-5 w-5" />
          )}
          {isGenerating ? 'Analisi in corso...' : 
           (useOpenAI && isOpenAIAvailable) ? 'Genera con AI Avanzata' : 'Genera con AI'}
        </button>
        
        {aiResult && (
          <button
            className="btn btn-accent flex items-center justify-center"
            onClick={handleSaveAI}
          >
            <Info className="mr-2 h-5 w-5" />
            Salva Questa Combinazione
          </button>
        )}
      </div>
    </div>
  );
};

export default AIRecommendation;