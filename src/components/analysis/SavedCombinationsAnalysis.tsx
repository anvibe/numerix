import React, { useState } from 'react';
import { Target, AlertCircle, Lightbulb, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GeneratedCombination, ExtractedNumbers, LottoWheel } from '../../types';
import NumberBubble from '../common/NumberBubble';

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
  const [selectedCombinationId, setSelectedCombinationId] = useState<string | null>(null);
  const [selectedExtractionDate, setSelectedExtractionDate] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Calculate combinations and extractions directly (no memoization to avoid React error #310)
  let relevantCombinations = savedCombinations.filter(combo => {
    // Strict filtering by game type
    if (combo.gameType !== selectedGame) return false;
    if (selectedGame === 'lotto' && combo.wheel) {
      return combo.wheel === selectedWheel;
    }
    return true;
  });

  // Deduplicate combinations by ID first
  const uniqueCombinationMap = new Map<string, typeof savedCombinations[0]>();
  relevantCombinations.forEach(combo => {
    if (!uniqueCombinationMap.has(combo.id)) {
      uniqueCombinationMap.set(combo.id, combo);
    }
  });
  relevantCombinations = Array.from(uniqueCombinationMap.values());

  // Also deduplicate by actual numbers (in case same combination saved with different IDs)
  const uniqueNumbersMap = new Map<string, typeof savedCombinations[0]>();
  relevantCombinations.forEach(combo => {
    const sortedNumbers = [...combo.numbers].sort((a, b) => a - b);
    const numbersKey = `${sortedNumbers.join(',')}-${combo.gameType}`;
    if (!uniqueNumbersMap.has(numbersKey)) {
      uniqueNumbersMap.set(numbersKey, combo);
    } else {
      // Keep the most recent one if duplicate found
      const existing = uniqueNumbersMap.get(numbersKey)!;
      if (new Date(combo.date) > new Date(existing.date)) {
        uniqueNumbersMap.set(numbersKey, combo);
      }
    }
  });
  relevantCombinations = Array.from(uniqueNumbersMap.values());

  // Debug: Log to help identify mismatches
  if (process.env.NODE_ENV === 'development') {
    console.log('Analysis Debug:', {
      selectedGame,
      totalSavedCombinations: savedCombinations.length,
      relevantBeforeDedup: savedCombinations.filter(c => c.gameType === selectedGame).length,
      relevantCombinationsCount: relevantCombinations.length,
      relevantCombinationIds: relevantCombinations.map(c => c.id.slice(0, 8)),
      duplicatesRemoved: savedCombinations.filter(c => c.gameType === selectedGame).length - relevantCombinations.length
    });
  }

  const currentGameExtractions = extractionsData[selectedGame] || [];
  let relevantExtractions = currentGameExtractions.length === 0 
    ? [] 
    : [...currentGameExtractions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

  // Apply date filters
  if (filterStartDate) {
    relevantExtractions = relevantExtractions.filter(ext => 
      new Date(ext.date) >= new Date(filterStartDate)
    );
  }
  if (filterEndDate) {
    relevantExtractions = relevantExtractions.filter(ext => 
      new Date(ext.date) <= new Date(filterEndDate)
    );
  }

  // Analyze matches between saved combinations and extractions
  // Calculate directly without useMemo to avoid React error #310
  // Early return if we don't have gameConfig or it's invalid
  if (!gameConfig || !gameConfig.numbersToSelect) {
    return (
      <div className="card mb-8">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Configurazione mancante</h3>
          <p className="text-text-secondary">
            Configurazione del gioco non disponibile.
          </p>
        </div>
      </div>
    );
  }

  // Use already calculated combinations and extractions
  const combos = relevantCombinations;
  let sortedExtractions = relevantExtractions;

  // Filter by selected extraction if specified
  if (selectedExtractionDate) {
    sortedExtractions = sortedExtractions.filter(ext => ext.date === selectedExtractionDate);
  }

  const numbersToSelect = gameConfig.numbersToSelect;
  const results: MatchAnalysis[] = [];

  combos.forEach(combo => {
    sortedExtractions.forEach(extraction => {
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

      // Include ALL combinations, even those with 0 matches
      // Generate suggestions
      let suggestions: MatchAnalysis['suggestions'] = null;
      
      if (matchCount >= 2 && matchCount < numbersToSelect && sortedExtractions.length > 0) {
        // Find numbers that appear frequently in winning but not in saved combination
        const numbersToRemove: number[] = [];
        const numbersToAdd: number[] = [];

        // Analyze which numbers from saved combo are least likely to win
        // Focus on numbers that are NOT in the matches (the ones that didn't hit)
        const nonMatchingNumbers = combo.numbers.filter(num => !matches.includes(num));
        
        nonMatchingNumbers.forEach(savedNum => {
          const appearsInWins = sortedExtractions.filter(ext => {
            const winNums = selectedGame === 'lotto' && ext.wheels && selectedWheel
              ? ext.wheels[selectedWheel] || []
              : ext.numbers;
            return winNums.includes(savedNum);
          }).length;
          
          const frequency = sortedExtractions.length > 0 
            ? appearsInWins / sortedExtractions.length 
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
        sortedExtractions.forEach(ext => {
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
                count > sortedExtractions.length * 0.15) {
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
    });
  });

  // Sort by match count (best matches first), then by date
  const analysisResults = results.sort((a, b) => {
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }
    return new Date(b.extraction.date).getTime() - new Date(a.extraction.date).getTime();
  });

  // Filter by difference and combination (calculate directly without useMemo)
  let filteredResults = filterDifference === null 
    ? analysisResults 
    : analysisResults.filter(result => result.difference === filterDifference);
  
  // Filter by selected combination if specified
  if (selectedCombinationId !== null) {
    filteredResults = filteredResults.filter(result => result.savedCombination.id === selectedCombinationId);
  }

  // If filtering by difference but NOT by a specific extraction or combination,
  // deduplicate to show each saved combination only once (best match)
  if (filterDifference !== null && selectedCombinationId === null && selectedExtractionDate === null) {
    const uniqueCombinations = new Map<string, MatchAnalysis>();
    
    filteredResults.forEach(result => {
      const comboId = result.savedCombination.id;
      const existing = uniqueCombinations.get(comboId);
      
      // Keep the result with the best match (lowest difference, or if same difference, most recent)
      if (!existing || 
          result.matchCount > existing.matchCount ||
          (result.matchCount === existing.matchCount && 
           new Date(result.extraction.date) > new Date(existing.extraction.date))) {
        uniqueCombinations.set(comboId, result);
      }
    });
    
    filteredResults = Array.from(uniqueCombinations.values()).sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return new Date(b.extraction.date).getTime() - new Date(a.extraction.date).getTime();
    });
  }

  // When viewing a specific extraction, ensure we only show relevant combinations
  // and verify they match the saved combinations, and deduplicate by combination ID
  if (selectedExtractionDate) {
    const relevantCombinationIds = new Set(relevantCombinations.map(c => c.id));
    
    // Filter out any results that don't match saved combinations
    filteredResults = filteredResults.filter(result => 
      relevantCombinationIds.has(result.savedCombination.id)
    );
    
    // Deduplicate by combination ID - keep only one result per combination
    // This ensures each saved combination appears only once, even if there are duplicates
    const uniqueCombinations = new Map<string, MatchAnalysis>();
    
    filteredResults.forEach(result => {
      const comboId = result.savedCombination.id;
      const existing = uniqueCombinations.get(comboId);
      
      // If no existing result, or if this one has better match, keep it
      if (!existing || result.matchCount > existing.matchCount) {
        uniqueCombinations.set(comboId, result);
      }
    });
    
    filteredResults = Array.from(uniqueCombinations.values()).sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return new Date(b.extraction.date).getTime() - new Date(a.extraction.date).getTime();
    });
    
    // Debug warning if mismatch detected
    if (process.env.NODE_ENV === 'development' && uniqueCombinations.size !== relevantCombinationIds.size) {
      console.warn('Mismatch detected after deduplication:', {
        uniqueResultCount: uniqueCombinations.size,
        savedCount: relevantCombinationIds.size,
        resultIds: Array.from(uniqueCombinations.keys()).map(id => id.slice(0, 8)),
        savedIds: Array.from(relevantCombinationIds).map(id => id.slice(0, 8))
      });
    }
  }

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

  // Calculate statistics based on filtered results (calculate directly without useMemo)
  const stats = (() => {
    if (!gameConfig || !gameConfig.numbersToSelect || filteredResults.length === 0) {
      return {
        totalMatches: 0,
        bestMatch: undefined,
        nearMisses: 0,
        exactWins: 0,
        averageMatches: 0
      };
    }

    const numbersToSelect = gameConfig.numbersToSelect;
    const totalMatches = filteredResults.reduce((sum, r) => sum + r.matchCount, 0);
    const bestMatch = filteredResults[0];
    const nearMisses = filteredResults.filter(r => r.difference <= 2).length;
    const exactWins = filteredResults.filter(r => r.matchCount === numbersToSelect).length;

    return {
      totalMatches,
      bestMatch,
      nearMisses,
      exactWins,
      averageMatches: totalMatches / filteredResults.length || 0
    };
  })();

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {selectedGame === 'lotto' && gameConfig?.wheels && (
          <div>
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

        {/* Filter by combination dropdown */}
        {relevantCombinations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Filtra per Combinazione Salvata
            </label>
            <select
              value={selectedCombinationId || ''}
              onChange={(e) => setSelectedCombinationId(e.target.value === '' ? null : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary"
            >
              <option value="">Tutte le combinazioni</option>
              {relevantCombinations.map((combo) => (
                <option key={combo.id} value={combo.id}>
                  {combo.numbers.join(', ')}
                  {combo.wheel && ` (${combo.wheel})`}
                  {combo.jolly && ` - Jolly: ${combo.jolly}`}
                  {combo.superstar && ` - Superstar: ${combo.superstar}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Date Filters and Extraction Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Filter by Extraction Date */}
        {relevantExtractions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Seleziona Estrazione
            </label>
            <select
              value={selectedExtractionDate || ''}
              onChange={(e) => setSelectedExtractionDate(e.target.value === '' ? null : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary"
            >
              <option value="">Tutte le estrazioni</option>
              {relevantExtractions.map((ext) => (
                <option key={ext.date} value={ext.date}>
                  {new Date(ext.date).toLocaleDateString('it-IT')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start Date Filter */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Data Inizio
          </label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Data Fine
          </label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary"
          />
        </div>
      </div>

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
          {gameConfig && Array.from({ length: gameConfig.numbersToSelect + 1 }, (_, i) => i).map(diff => (
            <button
              key={diff}
              onClick={() => setFilterDifference(diff)}
              className={`btn btn-sm ${filterDifference === diff ? 'btn-primary' : 'btn-outline'}`}
            >
              Mancavano {diff} {diff === 1 ? 'numero' : 'numeri'} ({gameConfig.numbersToSelect - diff}/{gameConfig.numbersToSelect})
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {selectedExtractionDate && filteredResults.length > 0 && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <div className="font-medium text-primary mb-1">
              📅 Estrazione selezionata: {new Date(selectedExtractionDate).toLocaleDateString('it-IT')}
            </div>
            <div className="text-sm text-text-secondary">
              Mostrate {filteredResults.length} combinazioni uniche per questa estrazione
            </div>
            <div className="text-xs text-text-secondary mt-1">
              Combinazioni salvate per {selectedGame}: {relevantCombinations.length}
              {filterDifference !== null && (
                <span> | Filtro attivo: differenza = {filterDifference}</span>
              )}
            </div>
          </div>
        )}
        
        {filterDifference !== null && selectedCombinationId === null && selectedExtractionDate === null && filteredResults.length > 0 && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <div className="font-medium text-primary mb-1">
              ℹ️ Filtro attivo: Mostrate {filteredResults.length} combinazioni uniche (miglior match per combinazione)
            </div>
            <div className="text-sm text-text-secondary">
              Totale combinazioni salvate: {relevantCombinations.length} | 
              Totale estrazioni: {relevantExtractions.length}
            </div>
          </div>
        )}
        
        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            Nessun risultato trovato con i filtri selezionati.
          </div>
        ) : (
          filteredResults.slice(0, selectedExtractionDate ? filteredResults.length : 10).map((result, index) => {
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
                      <span className="ml-2 text-xs text-text-secondary opacity-70">
                        (ID: {savedCombination.id.slice(0, 8)}...)
                      </span>
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

      {filteredResults.length > 10 && !selectedExtractionDate && (
        <div className="mt-4 text-center text-sm text-text-secondary">
          Mostrati i primi 10 risultati su {filteredResults.length} totali
        </div>
      )}
      
      {/* Clear Date Filters Button */}
      {(filterStartDate || filterEndDate) && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setFilterStartDate('');
              setFilterEndDate('');
            }}
            className="btn btn-outline btn-sm"
          >
            Cancella filtri data
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedCombinationsAnalysis;
