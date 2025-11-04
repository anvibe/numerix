import React, { useState } from 'react';
import { TrendingDown, Trash2, Plus, BarChart3, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { getGameByType } from '../../utils/generators';
import { analyzeUnsuccessfulCombinations, getAnalysisInsights } from '../../utils/analysisUtils';
import NumberBubble from '../common/NumberBubble';
import AddUnsuccessfulForm from './AddUnsuccessfulForm';

const UnsuccessfulCombinations: React.FC = () => {
  const { 
    selectedGame, 
    unsuccessfulCombinations, 
    deleteUnsuccessfulCombination, 
    clearUnsuccessfulCombinations,
    gameStats,
    extractionsData
  } = useGame();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState<'Bari' | 'Cagliari' | 'Firenze' | 'Genova' | 'Milano' | 'Napoli' | 'Palermo' | 'Roma' | 'Torino' | 'Venezia' | 'Nazionale'>('Bari');
  
  // Filter combinations for the selected game
  const gameCombinations = unsuccessfulCombinations.filter(combo => combo.gameType === selectedGame);
  
  // Get analysis data
  const analysisData = analyzeUnsuccessfulCombinations(
    gameCombinations,
    extractionsData[selectedGame],
    selectedGame,
    selectedGame === 'lotto' ? selectedWheel : undefined
  );
  
  const insights = getAnalysisInsights(analysisData);
  
  const getStrategyDisplay = (strategy?: string) => {
    switch (strategy) {
      case 'standard':
        return 'Standard';
      case 'high-variability':
        return 'Alta Variabilità';
      case 'ai':
        return 'AI Locale';
      case 'ai-advanced':
        return 'AI Avanzata';
      case 'manual':
        return 'Manuale';
      default:
        return 'Non specificata';
    }
  };
  
  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <TrendingDown className="h-6 w-6 text-error mr-3" />
          <h2 className="text-xl font-semibold">Combinazioni Non Vincenti</h2>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-outline flex items-center text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            {showAddForm ? 'Nascondi Form' : 'Aggiungi'}
          </button>
          
          {gameCombinations.length > 0 && (
            <>
              <button
                onClick={() => setShowStats(!showStats)}
                className="btn btn-outline flex items-center text-sm"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                {showStats ? 'Nascondi Statistiche' : 'Statistiche'}
              </button>
              
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="btn btn-outline flex items-center text-sm"
              >
                <Target className="h-4 w-4 mr-1" />
                {showAnalysis ? 'Nascondi Analisi' : 'Analisi Vincite'}
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-warning/10 border-l-4 border-warning rounded-r">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mr-2 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning mb-1">Come funziona il feedback AI:</p>
            <p className="text-text-secondary">
              Inserendo le combinazioni che non hanno vinto, l'AI imparerà a evitare numeri e pattern 
              che sono apparsi frequentemente nelle tue giocate sfortunate. L'analisi confronta anche 
              le tue scelte con i numeri effettivamente vincenti per identificare pattern e opportunità mancate.
            </p>
          </div>
        </div>
      </div>
      
      {showAddForm && <AddUnsuccessfulForm />}
      
      {showAnalysis && gameCombinations.length > 0 && extractionsData[selectedGame].length > 0 && (
        <div className="mb-6 p-4 bg-bg-primary border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Target className="h-5 w-5 mr-2 text-primary" />
              Analisi vs Numeri Vincenti
            </h3>
            
            {selectedGame === 'lotto' && (
              <select
                value={selectedWheel}
                onChange={(e) => setSelectedWheel(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary text-sm"
              >
                <option value="Bari">Bari</option>
                <option value="Cagliari">Cagliari</option>
                <option value="Firenze">Firenze</option>
                <option value="Genova">Genova</option>
                <option value="Milano">Milano</option>
                <option value="Napoli">Napoli</option>
                <option value="Palermo">Palermo</option>
                <option value="Roma">Roma</option>
                <option value="Torino">Torino</option>
                <option value="Venezia">Venezia</option>
                <option value="Nazionale">Nazionale</option>
              </select>
            )}
          </div>
          
          {/* Insights */}
          <div className="mb-6">
            <h4 className="text-md font-medium mb-3">📊 Insights Principali:</h4>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="p-2 bg-bg-secondary rounded text-sm">
                  {insight}
                </div>
              ))}
            </div>
          </div>
          
          {/* Match Details */}
          {analysisData.matchDetails.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium mb-3">🎯 Numeri Indovinati:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                {analysisData.matchDetails.slice(0, 10).map((match, index) => (
                  <div key={index} className="p-2 bg-bg-secondary rounded text-sm">
                    <div className="font-medium text-success">
                      {new Date(match.extractionDate).toLocaleDateString('it-IT')} - {match.matchCount} numeri
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {match.matchedNumbers.map((num, i) => (
                        <NumberBubble key={i} number={num} type="selected" size="sm" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Near Misses */}
          {analysisData.missedOpportunities.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium mb-3">⚡ Quasi-Vincite (3+ numeri):</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                {analysisData.missedOpportunities.slice(0, 6).map((miss, index) => (
                  <div key={index} className="p-2 bg-warning/10 border border-warning/20 rounded text-sm">
                    <div className="font-medium text-warning">
                      {new Date(miss.extractionDate).toLocaleDateString('it-IT')} - {miss.nearMisses} numeri
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      Vincenti: {miss.winningNumbers.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Efficiency Analysis */}
          {analysisData.frequencyAnalysis.overlapAnalysis.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3">📈 Efficienza dei Tuoi Numeri Preferiti:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {analysisData.frequencyAnalysis.overlapAnalysis.slice(0, 9).map((item, index) => (
                  <div key={index} className="p-2 bg-bg-secondary rounded text-sm">
                    <div className="flex items-center justify-between">
                      <NumberBubble 
                        number={item.number} 
                        type={item.efficiency > 80 ? 'selected' : item.efficiency > 40 ? 'hot' : 'due'} 
                        size="sm" 
                      />
                      <span className={`text-xs font-medium ${
                        item.efficiency > 80 ? 'text-success' : 
                        item.efficiency > 40 ? 'text-warning' : 'text-error'
                      }`}>
                        {item.efficiency.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      Usi: {item.yourFrequency.toFixed(1)}% | Vince: {item.winningFrequency.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-secondary mt-2">
                💡 Efficienza = quanto spesso i tuoi numeri preferiti appaiono nelle vincite reali
              </p>
            </div>
          )}
        </div>
      )}
      
      {showStats && gameCombinations.length > 0 && gameStats.unluckyNumbers && (
        <div className="mb-6 p-4 bg-bg-primary border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Statistiche Numeri Sfortunati</h3>
          
          {gameStats.unluckyNumbers.length > 0 ? (
            <div>
              <h4 className="text-md font-medium mb-3">Numeri più frequenti nelle combinazioni non vincenti:</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {gameStats.unluckyNumbers.slice(0, 10).map((item) => (
                  <div key={item.number} className="flex flex-col items-center">
                    <NumberBubble number={item.number} type="due" size="sm" />
                    <span className="text-xs mt-1 text-text-secondary">
                      {item.count}x ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
              
              {gameStats.unluckyPairs && gameStats.unluckyPairs.length > 0 && (
                <div>
                  <h4 className="text-md font-medium mb-3">Coppie più frequenti nelle combinazioni non vincenti:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {gameStats.unluckyPairs.slice(0, 6).map((pair, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-bg-secondary rounded">
                        <NumberBubble number={pair.pair[0]} type="due" size="sm" />
                        <span className="text-text-secondary">+</span>
                        <NumberBubble number={pair.pair[1]} type="due" size="sm" />
                        <span className="text-xs text-text-secondary ml-2">
                          {pair.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-secondary">
              Aggiungi più combinazioni non vincenti per vedere le statistiche dei pattern sfortunati.
            </p>
          )}
        </div>
      )}
      
      {gameCombinations.length === 0 ? (
        <div className="text-center py-8">
          <TrendingDown className="h-12 w-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary mb-4">
            Non hai ancora aggiunto nessuna combinazione non vincente per {getGameByType(selectedGame).name}.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            Aggiungi la Prima Combinazione
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-bg-secondary">
                <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Numeri</th>
                <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Data Aggiunta</th>
                <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Strategia</th>
                {selectedGame === 'lotto' && (
                  <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Ruota</th>
                )}
                {selectedGame === 'superenalotto' && (
                  <>
                    <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Jolly</th>
                    <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">SuperStar</th>
                  </>
                )}
                <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {gameCombinations.map((combo) => (
                <tr 
                  key={combo.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-1.5">
                      {combo.numbers.map((number, i) => (
                        <NumberBubble 
                          key={i} 
                          number={number}
                          type="due"
                          size="sm"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {new Date(combo.dateAdded).toLocaleDateString('it-IT')}
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                    {getStrategyDisplay(combo.strategy)}
                  </td>
                  {selectedGame === 'lotto' && (
                    <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                      {combo.wheel || '-'}
                    </td>
                  )}
                  {selectedGame === 'superenalotto' && (
                    <>
                      <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                        {combo.jolly && (
                          <NumberBubble 
                            number={combo.jolly}
                            type="cold"
                            size="sm"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                        {combo.superstar && (
                          <NumberBubble 
                            number={combo.superstar}
                            type="hot"
                            size="sm"
                          />
                        )}
                      </td>
                    </>
                  )}
                  <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                      className="text-error hover:text-error-dark transition-colors"
                      onClick={() => deleteUnsuccessfulCombination(combo.id)}
                      aria-label="Elimina combinazione"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {gameCombinations.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            className="btn btn-outline text-error flex items-center justify-center"
            onClick={() => {
              if (confirm('Sei sicuro di voler eliminare tutte le combinazioni non vincenti? Questo resetterà l\'apprendimento dell\'AI.')) {
                clearUnsuccessfulCombinations();
              }
            }}
          >
            <Trash2 className="mr-2 h-5 w-5" />
            Elimina Tutte
          </button>
        </div>
      )}
    </div>
  );
};

export default UnsuccessfulCombinations;