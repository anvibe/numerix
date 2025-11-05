import React from 'react';
import { BookmarkIcon, Download, Trash2, FileText, Save } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';
import { getGameByType } from '../../utils/generators';
import { showToast } from '../../utils/toast';

const SavedCombinations: React.FC = () => {
  const { savedCombinations, deleteCombination, selectedGame } = useGame();
  
  // Filter combinations by selected game type
  let filteredCombinations = savedCombinations.filter(combo => combo.gameType === selectedGame);
  
  // Deduplicate by ID first
  const uniqueByIdMap = new Map<string, typeof savedCombinations[0]>();
  filteredCombinations.forEach(combo => {
    if (!uniqueByIdMap.has(combo.id)) {
      uniqueByIdMap.set(combo.id, combo);
    }
  });
  filteredCombinations = Array.from(uniqueByIdMap.values());
  
  // Also deduplicate by actual numbers (in case same combination saved with different IDs)
  const uniqueNumbersMap = new Map<string, typeof savedCombinations[0]>();
  filteredCombinations.forEach(combo => {
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
  filteredCombinations = Array.from(uniqueNumbersMap.values());
  
  const handleExportCSV = () => {
    if (filteredCombinations.length === 0) {
      showToast.error('Non ci sono combinazioni da esportare.');
      return;
    }
    
    exportToCSV(filteredCombinations);
  };
  
  const handleExportPDF = () => {
    if (filteredCombinations.length === 0) {
      showToast.error('Non ci sono combinazioni da esportare.');
      return;
    }
    
    exportToPDF(filteredCombinations);
  };
  
  const getStrategyDisplay = (combo: typeof savedCombinations[0]) => {
    console.log('Combo flags:', {
      id: combo.id,
      isAI: combo.isAI,
      isAdvancedAI: combo.isAdvancedAI,
      strategy: combo.strategy
    });
    
    // Check for AI Avanzata first (OpenAI)
    if (combo.isAdvancedAI === true) {
      return 'AI Avanzata';
    }
    
    // Check for AI Locale
    if (combo.isAI === true) {
      return 'AI Locale';
    }
    
    // Regular strategies
    return combo.strategy === 'standard' ? 'Standard' : 'Alta Variabilità';
  };
  
  if (filteredCombinations.length === 0) {
    return (
      <div className="card mb-8">
        <div className="flex items-center mb-4">
          <BookmarkIcon className="h-6 w-6 text-primary mr-3" />
          <h2 className="text-xl font-semibold">Combinazioni Salvate</h2>
        </div>
        
        <p className="text-text-secondary text-center py-8">
          Non hai ancora salvato nessuna combinazione per {getGameByType(selectedGame).name}.
        </p>
      </div>
    );
  }
  
  return (
    <div className="card mb-8">
      <div className="flex items-center mb-4 justify-between">
        <div className="flex items-center">
          <BookmarkIcon className="h-6 w-6 text-primary mr-3" />
          <h2 className="text-xl font-semibold">
            Combinazioni Salvate ({filteredCombinations.length})
            {savedCombinations.length !== filteredCombinations.length && (
              <span className="ml-2 text-sm text-text-secondary font-normal">
                ({savedCombinations.length} totali)
              </span>
            )}
          </h2>
        </div>
        
        <div className="flex space-x-2">
          <button
            className="btn btn-outline flex items-center justify-center py-1.5 px-3"
            onClick={handleExportCSV}
          >
            <FileText className="h-4 w-4 mr-1" />
            <span className="text-sm">CSV</span>
          </button>
          <button
            className="btn btn-outline flex items-center justify-center py-1.5 px-3"
            onClick={handleExportPDF}
          >
            <Save className="h-4 w-4 mr-1" />
            <span className="text-sm">PDF</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-bg-secondary">
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Gioco</th>
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Numeri</th>
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Jolly</th>
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">SuperStar</th>
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Data</th>
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Strategia</th>
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredCombinations.map((combo) => (
              <tr 
                key={combo.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  {getGameByType(combo.gameType).name}
                </td>
                <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-1.5">
                    {combo.numbers.map((number, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        {number}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  {combo.jolly && (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium">
                      {combo.jolly}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  {combo.superstar && (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary/10 text-secondary text-xs font-medium">
                      {combo.superstar}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  {new Date(combo.date).toLocaleDateString('it-IT')}
                </td>
                <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  {getStrategyDisplay(combo)}
                </td>
                <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    className="text-error hover:text-error-dark transition-colors"
                    onClick={() => {
                      deleteCombination(combo.id).catch((error) => {
                        showToast.error('Errore durante l\'eliminazione: ' + error.message);
                      });
                    }}
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
      
      <div className="mt-4 flex justify-end">
        <button
          className="btn btn-outline text-error flex items-center justify-center"
          onClick={() => {
            if (confirm(`Sei sicuro di voler eliminare tutte le ${filteredCombinations.length} combinazioni salvate per ${getGameByType(selectedGame).name}?`)) {
              // Delete only combinations for current game
              Promise.all(filteredCombinations.map(combo => 
                deleteCombination(combo.id).catch(error => {
                  showToast.error('Errore durante l\'eliminazione: ' + error.message);
                  throw error;
                })
              )).then(() => {
                showToast.success(`Eliminate ${filteredCombinations.length} combinazioni`);
              }).catch(() => {
                // Error already handled in Promise.all
              });
            }
          }}
        >
          <Trash2 className="mr-2 h-5 w-5" />
          Elimina Tutte
        </button>
      </div>
    </div>
  );
};

export default SavedCombinations;