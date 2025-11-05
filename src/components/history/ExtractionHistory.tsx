import React, { useState } from 'react';
import { History, Filter, Plus, Upload, RefreshCw } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import NumberBubble from '../common/NumberBubble';
import { LottoWheel } from '../../types';
import AddExtractionForm from './AddExtractionForm';
import CSVUploader from './CSVUploader';
import { ExtractionSyncService } from '../../utils/apiService';
import { showToast } from '../../utils/toast';

const ExtractionHistory: React.FC = () => {
  const { selectedGame, gameConfig, extractionsData } = useGame();
  const [limit, setLimit] = useState<number>(10);
  const [selectedWheel, setSelectedWheel] = useState<LottoWheel>('Bari');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCSVUploader, setShowCSVUploader] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const extractions = extractionsData[selectedGame];
  const displayExtractions = extractions.slice(0, limit);
  
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await ExtractionSyncService.syncExtractions(selectedGame);
      
      if (result.success) {
        showToast.success(
          result.new > 0
            ? `Sincronizzazione completata! ${result.new} nuove estrazioni aggiunte.`
            : result.message || 'Sincronizzazione completata. Nessuna nuova estrazione trovata.'
        );
        
        // Reload extractions from context
        // The context will automatically reload from Supabase
        window.location.reload();
      } else {
        showToast.error(result.message || 'Errore durante la sincronizzazione');
      }
    } catch (error) {
      console.error('Sync error:', error);
      showToast.error('Errore durante la sincronizzazione: ' + (error instanceof Error ? error.message : 'Errore sconosciuto'));
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <History className="h-6 w-6 text-primary mr-3" />
          <h2 className="text-xl font-semibold">Cronologia Estrazioni</h2>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="btn btn-primary flex items-center text-sm"
            title="Aggiorna le estrazioni dal web"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizzazione...' : 'Aggiorna Estrazioni'}
          </button>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-outline flex items-center text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            {showAddForm ? 'Nascondi Form' : 'Aggiungi Estrazione'}
          </button>
          
          <button
            onClick={() => setShowCSVUploader(!showCSVUploader)}
            className="btn btn-outline flex items-center text-sm"
          >
            <Upload className="h-4 w-4 mr-1" />
            {showCSVUploader ? 'Nascondi CSV' : 'Carica CSV'}
          </button>
        </div>
      </div>
      
      {showAddForm && <AddExtractionForm />}
      {showCSVUploader && <CSVUploader />}
      
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center">
          <Filter className="h-5 w-5 text-text-secondary mr-2" />
          <label className="text-sm font-medium text-text-secondary mr-3">
            Mostra ultime:
          </label>
          <select
            className="bg-bg-primary border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={10}>10 estrazioni</option>
            <option value={20}>20 estrazioni</option>
            <option value={50}>50 estrazioni</option>
            <option value={9999}>Tutte le estrazioni</option>
          </select>
        </div>

        {selectedGame === 'lotto' && (
          <div className="flex items-center">
            <label className="text-sm font-medium text-text-secondary mr-3">
              Ruota:
            </label>
            <select
              className="bg-bg-primary border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5"
              value={selectedWheel}
              onChange={(e) => setSelectedWheel(e.target.value as LottoWheel)}
            >
              {gameConfig.wheels?.map(wheel => (
                <option key={wheel} value={wheel}>{wheel}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-bg-secondary">
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Data</th>
              <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Numeri Estratti</th>
              {selectedGame === 'superenalotto' && (
                <>
                  <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Jolly</th>
                  <th className="py-2 px-4 text-left border-b border-gray-200 dark:border-gray-700">Superstar</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayExtractions.map((extraction, index) => {
              const numbers = selectedGame === 'lotto' && extraction.wheels
                ? extraction.wheels[selectedWheel]
                : extraction.numbers;

              return (
                <tr 
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                    {new Date(extraction.date).toLocaleDateString('it-IT')}
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-2">
                      {numbers.map((number, i) => (
                        <NumberBubble 
                          key={i} 
                          number={number}
                          size="sm"
                        />
                      ))}
                    </div>
                  </td>
                  {selectedGame === 'superenalotto' && (
                    <>
                      <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                        {extraction.jolly && (
                          <NumberBubble 
                            number={extraction.jolly}
                            type="cold"
                            size="sm"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                        {extraction.superstar && (
                          <NumberBubble 
                            number={extraction.superstar}
                            type="hot"
                            size="sm"
                          />
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExtractionHistory;