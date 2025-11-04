import React, { useState, useMemo } from 'react';
import { Target, TrendingUp, AlertCircle, Lightbulb, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GeneratedCombination, ExtractedNumbers, LottoWheel } from '../../types';
import NumberBubble from '../common/NumberBubble';
import { getGameByType } from '../../utils/generators';

interface MatchAnalysis {
  savedCombination: GeneratedCombination;
  extraction: ExtractedNumbers;
  matches: number[];
  matchCount: number;
  missingNumbers: number[];
  difference: number; // How many numbers away from winning
  suggestions: {
    remove: number[]; // Numbers to remove
    add: number[]; // Numbers to add
    reason: string;
  } | null;
}

const SavedCombinationsAnalysis: React.FC = () => {
  const { 
    selectedGame, 
    savedCombinations, 
    extractionsData,
    gameConfig 
  } = useGame();
  
  const [selectedWheel, setSelectedWheel] = useState<LottoWheel>('Bari');
  const [filterDifference, setFilterDifference] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Get current game extractions - access directly but memoize processing
  const currentGameExtractions = extractionsData[selectedGame] || [];
  const currentGameExtractionsLength = currentGameExtractions.length;
  const savedCombinationsLength = savedCombinations.length;

  // Filter combinations for current game
  const relevantCombinations = useMemo(() => {
    if (!savedCombinations || savedCombinations.length === 0) {
      return [];
    }
    return savedCombinations.filter(combo => {
      if (combo.gameType !== selectedGame) return false;
      if (selectedGame === 'lotto' && combo.wheel) {
        return combo.wheel === selectedWheel;
      }
      return true;
    });
  }, [savedCombinations, selectedGame, selectedWheel, savedCombinationsLength]);

  // Get relevant extractions - access directly from extractionsData
  const relevantExtractions = useMemo(() => {
    const extractions = extractionsData[selectedGame] || [];
    if (!extractions || extractions.length === 0) {
      return [];
    }
    // Create a copy before sorting to avoid mutating the original array
    return [...extractions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [extractionsData, selectedGame, currentGameExtractionsLength]);

  // Analyze matches between saved combinations and extractions
  const analysisResults = useMemo(() => {
    // Early return if we don't have gameConfig or it's invalid
    if (!gameConfig || !gameConfig.numbersToSelect) {
      return [];
    }

    const numbersToSelect = gameConfig.numbersToSelect;
    const results: MatchAnalysis[] = [];

    relevantCombinations.forEach(combo => {
      relevantExtractions.forEach(extraction => {
        // Get winning numbers based on game type and wheel
        let winningNumbers: number[];
        
        if (selectedGame === 'lotto' && extraction.wheels && selectedWheel) {
          winningNumbers = extraction.wheels[selectedWheel] || [];
        } else {
          winningNumbers = extraction.numbers;
        }

        if (winningNumbers.length === 0) return;

        // Find matches
        const matches = combo.numbers.filter(num => winningNumbers.includes(num));
        const matchCount = matches.length;
        const missingNumbers = winningNumbers.filter(num => !combo.numbers.includes(num));
        const difference = numbersToSelect - matchCount;

        // Include if matches are close (within 2 numbers) or if matchCount >= 2
        // This helps identify combinations that were "almost winning" (i-2 numbers away)
        if (matchCount >= 2 || difference <= 2) {
          // Generate suggestions
          let suggestions: MatchAnalysis['suggestions'] = null;
          
          if (matchCount >= 2 && matchCount < numbersToSelect && relevantExtractions.length > 0) {
            // Find numbers that appear frequently in winning but not in saved combination
            const numbersToRemove: number[] = [];
            const numbersToAdd: number[] = [];

            // Analyze which numbers from saved combo are least likely to win
            // Focus on numbers that are NOT in the matches (the ones that didn't hit)
            const nonMatchingNumbers = combo.numbers.filter(num => !matches.includes(num));
            
            nonMatchingNumbers.forEach(savedNum => {
              const appearsInWins = relevantExtractions.filter(ext => {
                const winNums = selectedGame === 'lotto' && ext.wheels && selectedWheel
                  ? ext.wheels[selectedWheel] || []
                  : ext.numbers;
                return winNums.includes(savedNum);
              }).length;
              
              const frequency = relevantExtractions.length > 0 
                ? appearsInWins / relevantExtractions.length 
                : 0;
              
              // If number appears in less than 15% of wins and didn't match, consider removing
              if (frequency < 0.15) {
                numbersToRemove.push(savedNum);
              }
            });

            // Prioritize adding the missing numbers from this specific extraction
            // These are the exact numbers that would have made this a win
            missingNumbers.forEach(num => {
              if (!numbersToAdd.includes(num) && numbersToAdd.length < difference) {
                numbersToAdd.push(num);
              }
            });

            // Also find numbers that appear frequently in wins but aren't in saved combo
            const allWinningNumbers: number[] = [];
            relevantExtractions.forEach(ext => {
              const winNums = selectedGame === 'lotto' && ext.wheels && selectedWheel
                ? ext.wheels[selectedWheel] || []
                : ext.numbers;
              allWinningNumbers.push(...winNums);
            });

            const numberFrequency: Record<number, number> = {};
            allWinningNumbers.forEach(num => {
              numberFrequency[num] = (numberFrequency[num] || 0) + 1;
            });

            // Find additional numbers that win often but aren't in saved combination
            Object.entries(numberFrequency)
              .sort(([,a], [,b]) => b - a)
              .forEach(([numStr, count]) => {
                const num = parseInt(numStr);
                if (!combo.numbers.includes(num) && 
                    !numbersToAdd.includes(num) &&
                    count > relevantExtractions.length * 0.15) {
                  if (numbersToAdd.length < difference) {
                    numbersToAdd.push(num);
                  }
                }
              });

            if (numbersToRemove.length > 0 || numbersToAdd.length > 0) {
              // Provide specific suggestions based on how close they were
              let reason = '';
              if (difference === 1) {
                reason = `🎯 Quasi perfetto! Mancava solo 1 numero: ${missingNumbers[0]}. Considera di sostituire uno dei numeri non vincenti.`;
              } else if (difference === 2) {
                reason = `🔥 Quasi vincita! Mancavano solo 2 numeri. Ecco come potresti modificare la combinazione per essere più vicino alla vincita.`;
              } else {
                reason = `Per migliorare questa combinazione, considera di sostituire alcuni numeri con frequenza di vincita più alta.`;
              }

              suggestions = {
                remove: numbersToRemove.slice(0, Math.min(2, difference)),
                add: numbersToAdd.slice(0, difference),
                reason
              };
            }
          }

          results.push({
            savedCombination: combo,
            extraction,
            matches,
            matchCount,
            missingNumbers,
            difference,
            suggestions
          });
        }
      });
    });

    // Sort by match count (best matches first), then by date
    return results.sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return new Date(b.extraction.date).getTime() - new Date(a.extraction.date).getTime();
    });
  }, [relevantCombinations, relevantExtractions, selectedGame, selectedWheel, gameConfig?.numbersToSelect]);

  // Filter by difference if selected
  const filteredResults = useMemo(() => {
    if (filterDifference === null) return analysisResults;
    return analysisResults.filter(result => result.difference === filterDifference);
  }, [analysisResults, filterDifference]);

  if (relevantCombinations.length === 0) {
    return (
      <div className="card mb-8">
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analisi Combinazioni</h3>
          <p className="text-text-secondary">
            Salva alcune combinazioni per vedere l'analisi comparativa con le estrazioni.
          </p>
        </div>
      </div>
    );
  }

  if (relevantExtractions.length === 0) {
    return (
      <div className="card mb-8">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analisi Combinazioni</h3>
          <p className="text-text-secondary">
            Aggiungi delle estrazioni per confrontarle con le combinazioni salvate.
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (!gameConfig || !gameConfig.numbersToSelect || analysisResults.length === 0) {
      return {
        totalMatches: 0,
        bestMatch: undefined,
        nearMisses: 0,
        exactWins: 0,
        averageMatches: 0
      };
    }

    const numbersToSelect = gameConfig.numbersToSelect;
    const totalMatches = analysisResults.reduce((sum, r) => sum + r.matchCount, 0);
    const bestMatch = analysisResults[0];
    const nearMisses = analysisResults.filter(r => r.difference <= 2).length;
    const exactWins = analysisResults.filter(r => r.matchCount === numbersToSelect).length;

    return {
      totalMatches,
      bestMatch,
      nearMisses,
      exactWins,
      averageMatches: totalMatches / analysisResults.length || 0
    };
  }, [analysisResults, gameConfig?.numbersToSelect]);

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Target className="h-6 w-6 text-primary mr-3" />
          <h2 className="text-xl font-semibold">Analisi Combinazioni vs Estrazioni</h2>
        </div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="btn btn-outline text-sm"
        >
          <Lightbulb className="h-4 w-4 mr-1" />
          {showSuggestions ? 'Nascondi' : 'Mostra'} Suggerimenti
        </button>
      </div>

      {selectedGame === 'lotto' && gameConfig?.wheels && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Filtra per Ruota
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

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">Totale Match</div>
          <div className="text-2xl font-bold">{stats.totalMatches}</div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">Media Match</div>
          <div className="text-2xl font-bold">{stats.averageMatches.toFixed(1)}</div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">Quasi-Vincite</div>
          <div className="text-2xl font-bold text-warning">{stats.nearMisses}</div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">Vincite Esatte</div>
          <div className="text-2xl font-bold text-success">{stats.exactWins}</div>
        </div>
      </div>

      {/* Filter by difference */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Filtra per differenza (numeri mancanti)
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterDifference(null)}
            className={`btn btn-sm ${filterDifference === null ? 'btn-primary' : 'btn-outline'}`}
          >
            Tutte
          </button>
          {[0, 1, 2, 3].map(diff => (
            <button
              key={diff}
              onClick={() => setFilterDifference(diff)}
              className={`btn btn-sm ${filterDifference === diff ? 'btn-primary' : 'btn-outline'}`}
            >
              Mancavano {diff} {diff === 1 ? 'numero' : 'numeri'}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            Nessun risultato trovato con i filtri selezionati.
          </div>
        ) : (
          filteredResults.slice(0, 10).map((result, index) => {
            const { savedCombination, extraction, matches, matchCount, missingNumbers, difference, suggestions } = result;
            
            // Highlight very recent extractions (last 7 days)
            const extractionDate = new Date(extraction.date);
            const daysAgo = Math.floor((Date.now() - extractionDate.getTime()) / (1000 * 60 * 60 * 24));
            const isRecent = daysAgo <= 7;
            
            return (
              <div 
                key={`${savedCombination.id}-${extraction.date}-${index}`} 
                className={`border rounded-lg p-4 ${
                  isRecent && difference <= 2 
                    ? 'border-warning bg-warning/5 dark:bg-warning/10' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {isRecent && difference <= 2 && (
                  <div className="mb-3 p-2 bg-warning/20 border border-warning/30 rounded text-sm font-medium text-warning">
                    🆕 Estrazione recente ({daysAgo === 0 ? 'oggi' : `${daysAgo} ${daysAgo === 1 ? 'giorno' : 'giorni'} fa`}) - Quasi vincita!
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {matchCount === gameConfig?.numbersToSelect ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : difference <= 2 ? (
                        <AlertCircle className="h-5 w-5 text-warning" />
                      ) : (
                        <XCircle className="h-5 w-5 text-text-secondary" />
                      )}
                      <span className="font-semibold">
                        {matchCount === gameConfig?.numbersToSelect 
                          ? '🎉 VINCITA!' 
                          : difference === 0 
                          ? '✅ Quasi vincita perfetta!' 
                          : `Mancavano ${difference} ${difference === 1 ? 'numero' : 'numeri'}`}
                      </span>
                    </div>
                    <div className="text-sm text-text-secondary">
                      Estrazione del: {new Date(extraction.date).toLocaleDateString('it-IT')}
                      {selectedGame === 'lotto' && result.savedCombination.wheel && (
                        <span> - Ruota: {result.savedCombination.wheel}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {matchCount}/{gameConfig?.numbersToSelect ?? '?'}
                    </div>
                    <div className="text-xs text-text-secondary">Match</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Saved Combination */}
                  <div>
                    <div className="text-sm font-medium text-text-secondary mb-2">
                      Tua Combinazione Salvata:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {savedCombination.numbers.map((num) => {
                        const isMatch = matches.includes(num);
                        return (
                          <NumberBubble
                            key={num}
                            number={num}
                            type={isMatch ? 'hot' : 'selected'}
                            size="sm"
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Winning Extraction */}
                  <div>
                    <div className="text-sm font-medium text-text-secondary mb-2">
                      Numeri Vincenti:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(selectedGame === 'lotto' && extraction.wheels && selectedWheel
                        ? extraction.wheels[selectedWheel] || []
                        : extraction.numbers
                      ).map((num) => {
                        const isMatch = matches.includes(num);
                        return (
                          <NumberBubble
                            key={num}
                            number={num}
                            type={isMatch ? 'hot' : 'cold'}
                            size="sm"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Missing Numbers */}
                {missingNumbers.length > 0 && (
                  <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-md">
                    <div className="text-sm font-medium text-warning mb-2">
                      Numeri mancanti (differenza):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {missingNumbers.map(num => (
                        <NumberBubble
                          key={num}
                          number={num}
                          type="due"
                          size="sm"
                        />
                      ))}
                    </div>
                    <div className="text-xs text-text-secondary mt-2">
                      Questi sono i numeri che avresti dovuto avere per vincere
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {showSuggestions && suggestions && (
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-md">
                    <div className="flex items-start mb-2">
                      <Lightbulb className="h-5 w-5 text-primary mr-2 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-primary mb-2">💡 Suggerimenti per migliorare:</div>
                        <div className="text-sm text-text-secondary mb-3">{suggestions.reason}</div>
                        
                        {suggestions.remove.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium mb-1">Considera di rimuovere:</div>
                            <div className="flex flex-wrap gap-2">
                              {suggestions.remove.map(num => (
                                <NumberBubble
                                  key={num}
                                  number={num}
                                  type="cold"
                                  size="sm"
                                />
                              ))}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">
                              Questi numeri hanno una frequenza di vincita bassa
                            </div>
                          </div>
                        )}

                        {suggestions.add.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-1">Considera di aggiungere:</div>
                            <div className="flex flex-wrap gap-2">
                              {suggestions.add.map(num => (
                                <NumberBubble
                                  key={num}
                                  number={num}
                                  type="hot"
                                  size="sm"
                                />
                              ))}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">
                              Questi numeri hanno una frequenza di vincita alta
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {filteredResults.length > 10 && (
        <div className="mt-4 text-center text-sm text-text-secondary">
          Mostrati i primi 10 risultati su {filteredResults.length} totali
        </div>
      )}
    </div>
  );
};

export default SavedCombinationsAnalysis;
