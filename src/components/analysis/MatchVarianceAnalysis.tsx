import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertCircle, Info } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GeneratedCombination, ExtractedNumbers, LottoWheel } from '../../types';
import { 
  calculateLotteryProbabilities, 
  SUPERENALOTTO_PROBABILITIES,
  LOTTO_PROBABILITIES,
  MILLIONDAY_PROBABILITIES,
  matchProbability,
  LotteryProbabilities
} from '../../utils/probabilityCalculator';

interface MatchVarianceAnalysisProps {
  savedCombinations: GeneratedCombination[];
  extractions: ExtractedNumbers[];
  selectedWheel?: LottoWheel;
}

interface MatchRecord {
  combination: GeneratedCombination;
  extraction: ExtractedNumbers;
  matchCount: number;
  date: Date;
}

const MatchVarianceAnalysis: React.FC<MatchVarianceAnalysisProps> = ({
  savedCombinations,
  extractions,
  selectedWheel
}) => {
  const { selectedGame, gameConfig } = useGame();
  const [currentWheel, setCurrentWheel] = useState<LottoWheel>(selectedWheel || 'Bari');

  // Get probabilities for the selected game
  const getProbabilities = (): LotteryProbabilities => {
    switch (selectedGame) {
      case 'superenalotto':
        return SUPERENALOTTO_PROBABILITIES;
      case 'lotto':
        return LOTTO_PROBABILITIES;
      case 'millionday':
        return MILLIONDAY_PROBABILITIES;
      case '10elotto':
        return calculateLotteryProbabilities('10eLotto', 90, 20, 10);
      default:
        return SUPERENALOTTO_PROBABILITIES;
    }
  };

  const probs = getProbabilities();

  // Calculate all matches
  const matchRecords = useMemo(() => {
    const records: MatchRecord[] = [];

    savedCombinations
      .filter(combo => combo.gameType === selectedGame)
      .forEach(combo => {
        const comboDate = new Date(combo.date);
        comboDate.setHours(0, 0, 0, 0);

        extractions.forEach(ext => {
          const extDate = new Date(ext.date);
          extDate.setHours(0, 0, 0, 0);

          // Only compare with extractions on or after combination save date
          if (extDate >= comboDate) {
            let winningNumbers: number[];
            
            if (selectedGame === 'lotto') {
              winningNumbers = ext.wheels?.[currentWheel] || [];
            } else {
              winningNumbers = ext.numbers || [];
            }

            if (winningNumbers.length === 0) return;

            // For Lotto, only compare with same wheel
            if (selectedGame === 'lotto' && combo.wheel && combo.wheel !== currentWheel) {
              return;
            }

            const matches = combo.numbers.filter(num => winningNumbers.includes(num));
            const matchCount = matches.length;

            records.push({
              combination: combo,
              extraction: ext,
              matchCount,
              date: extDate,
            });
          }
        });
      });

    // Sort by date (most recent first)
    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [savedCombinations, extractions, selectedGame, currentWheel]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (matchRecords.length === 0) {
      return null;
    }

    const totalPlays = matchRecords.length;
    const matchDistribution = Array(gameConfig.numbersToSelect + 1).fill(0);
    let totalMatches = 0;

    matchRecords.forEach(record => {
      matchDistribution[record.matchCount]++;
      totalMatches += record.matchCount;
    });

    const averageMatches = totalMatches / totalPlays;
    const expectedAverage = probs.expectedMatchesPerPlay;

    // Calculate expected distribution
    const expectedDistribution = matchDistribution.map((_, k) => {
      const prob = matchProbability(
        gameConfig.maxNumber,
        gameConfig.numbersToSelect,
        gameConfig.numbersToSelect,
        k
      );
      return prob * totalPlays;
    });

    // Calculate variance (how much actual differs from expected)
    let variance = 0;
    matchDistribution.forEach((actual, k) => {
      const expected = expectedDistribution[k];
      variance += Math.pow(actual - expected, 2);
    });
    variance = variance / (gameConfig.numbersToSelect + 1);

    // Determine if user is in lucky/normal/unlucky period
    const deviation = averageMatches - expectedAverage;
    const deviationPercent = (deviation / expectedAverage) * 100;
    
    let periodType: 'lucky' | 'normal' | 'unlucky' = 'normal';
    if (deviationPercent > 20) {
      periodType = 'lucky';
    } else if (deviationPercent < -20) {
      periodType = 'unlucky';
    }

    // Recent performance (last 10 plays)
    const recentRecords = matchRecords.slice(0, 10);
    const recentAverage = recentRecords.length > 0
      ? recentRecords.reduce((sum, r) => sum + r.matchCount, 0) / recentRecords.length
      : 0;
    const recentDeviation = recentAverage - expectedAverage;

    // Long-term performance (all plays)
    const longTermAverage = averageMatches;

    return {
      totalPlays,
      matchDistribution,
      expectedDistribution,
      averageMatches,
      expectedAverage,
      deviation,
      deviationPercent,
      periodType,
      variance,
      recentAverage,
      recentDeviation,
      longTermAverage,
      recentRecords: recentRecords.length,
    };
  }, [matchRecords, gameConfig, probs]);

  // Update wheel when selectedGame changes - MUST be before any conditional returns
  useEffect(() => {
    if (selectedGame === 'lotto' && selectedWheel) {
      setCurrentWheel(selectedWheel);
    }
  }, [selectedGame, selectedWheel]);

  // Format percentage - helper function (not a hook, safe to define after hooks)
  const formatPercent = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  // Get color for period type - helper function
  const getPeriodColor = (type: string): string => {
    switch (type) {
      case 'lucky':
        return 'text-success';
      case 'unlucky':
        return 'text-error';
      default:
        return 'text-warning';
    }
  };

  // Get period label - helper function
  const getPeriodLabel = (type: string): string => {
    switch (type) {
      case 'lucky':
        return '🍀 Periodo Fortunato';
      case 'unlucky':
        return '⚠️ Periodo Sfortunato';
      default:
        return '📊 Periodo Normale';
    }
  };

  // Early return AFTER all hooks
  if (!stats || stats.totalPlays === 0) {
    return (
      <div className="card mb-8">
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analisi Varianza</h3>
          <p className="text-text-secondary">
            Salva delle combinazioni e confrontale con le estrazioni per vedere l'analisi statistica.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Analisi Varianza e Performance</h2>
        </div>
        {selectedGame === 'lotto' && gameConfig.wheels && (
          <select
            value={currentWheel}
            onChange={(e) => setCurrentWheel(e.target.value as LottoWheel)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary text-sm"
          >
            {gameConfig.wheels.map((wheel) => (
              <option key={wheel} value={wheel}>
                {wheel}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">Giocate Totali</div>
          <div className="text-2xl font-bold">{stats.totalPlays}</div>
        </div>
        
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">Media Match/Giocata</div>
          <div className="text-2xl font-bold text-primary">
            {stats.averageMatches.toFixed(2)}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Atteso: {stats.expectedAverage.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-1">Deviazione</div>
          <div className={`text-2xl font-bold ${stats.deviation >= 0 ? 'text-success' : 'text-error'}`}>
            {stats.deviation >= 0 ? '+' : ''}{stats.deviation.toFixed(2)}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {stats.deviationPercent >= 0 ? '+' : ''}{stats.deviationPercent.toFixed(1)}%
          </div>
        </div>
        
        <div className={`bg-bg-secondary rounded-lg p-4 border-2 ${
          stats.periodType === 'lucky' ? 'border-success' :
          stats.periodType === 'unlucky' ? 'border-error' :
          'border-warning'
        }`}>
          <div className="text-sm text-text-secondary mb-1">Periodo Attuale</div>
          <div className={`text-lg font-bold ${getPeriodColor(stats.periodType)}`}>
            {getPeriodLabel(stats.periodType)}
          </div>
        </div>
      </div>

      {/* Recent vs Long-term */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Performance Recente</h3>
            <span className="text-xs text-text-secondary">(Ultime {stats.recentRecords} giocate)</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Media Match:</span>
              <span className="font-bold">{stats.recentAverage.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">vs. Atteso:</span>
              <span className={stats.recentDeviation >= 0 ? 'text-success' : 'text-error'}>
                {stats.recentDeviation >= 0 ? '+' : ''}{stats.recentDeviation.toFixed(2)}
              </span>
            </div>
            {stats.recentDeviation < -0.1 && (
              <div className="text-xs text-warning mt-2 p-2 bg-warning/10 rounded">
                ⚠️ Performance recente sotto la media attesa. Questo è normale - la varianza statistica causa fluttuazioni.
              </div>
            )}
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Performance Totale</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Media Match:</span>
              <span className="font-bold">{stats.longTermAverage.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">vs. Atteso:</span>
              <span className={stats.deviation >= 0 ? 'text-success' : 'text-error'}>
                {stats.deviation >= 0 ? '+' : ''}{stats.deviation.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-text-secondary mt-2">
              Su {stats.totalPlays} giocate, hai totalizzato {stats.totalPlays * stats.longTermAverage} match.
            </div>
          </div>
        </div>
      </div>

      {/* Match Distribution Table */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Distribuzione Match: Atteso vs. Reale
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-2 text-left font-semibold">Match</th>
                <th className="py-3 px-2 text-right font-semibold">Atteso</th>
                <th className="py-3 px-2 text-right font-semibold">Reale</th>
                <th className="py-3 px-2 text-right font-semibold">Differenza</th>
                <th className="py-3 px-2 text-right font-semibold hidden sm:table-cell">% Atteso</th>
                <th className="py-3 px-2 text-right font-semibold hidden sm:table-cell">% Reale</th>
              </tr>
            </thead>
            <tbody>
              {stats.matchDistribution.map((actual, k) => {
                const expected = stats.expectedDistribution[k];
                const difference = actual - expected;
                const expectedPercent = probs.matchProbabilities.find(p => p.matches === k)?.probability || 0;
                const actualPercent = stats.totalPlays > 0 ? actual / stats.totalPlays : 0;
                
                return (
                  <tr
                    key={k}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      k === gameConfig.numbersToSelect ? 'bg-success/10' :
                      k >= gameConfig.numbersToSelect - 1 ? 'bg-warning/10' :
                      'hover:bg-bg-secondary/50'
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {k === gameConfig.numbersToSelect ? (
                          <span className="text-success font-bold">🎉 {k}/{gameConfig.numbersToSelect}</span>
                        ) : (
                          <span>{k}/{gameConfig.numbersToSelect}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-text-secondary">
                      {expected.toFixed(1)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-bold">
                      {actual}
                    </td>
                    <td className={`py-3 px-2 text-right font-mono ${
                      difference > 0 ? 'text-success' :
                      difference < 0 ? 'text-error' :
                      'text-text-secondary'
                    }`}>
                      {difference >= 0 ? '+' : ''}{difference.toFixed(1)}
                    </td>
                    <td className="py-3 px-2 text-right text-text-secondary hidden sm:table-cell">
                      {formatPercent(expectedPercent * stats.totalPlays, stats.totalPlays)}
                    </td>
                    <td className="py-3 px-2 text-right hidden sm:table-cell">
                      {formatPercent(actual, stats.totalPlays)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Bar Chart */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Confronto Visivo: Atteso vs. Reale</h3>
        <div className="space-y-3">
          {stats.matchDistribution.map((actual, k) => {
            const expected = stats.expectedDistribution[k];
            const maxValue = Math.max(...stats.matchDistribution, ...stats.expectedDistribution);
            const expectedWidth = maxValue > 0 ? (expected / maxValue) * 100 : 0;
            const actualWidth = maxValue > 0 ? (actual / maxValue) * 100 : 0;
            
            return (
              <div key={k} className="space-y-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">
                    {k} match{k === gameConfig.numbersToSelect ? ' 🎉' : ''}
                  </span>
                  <span className="text-text-secondary">
                    Atteso: {expected.toFixed(1)} | Reale: {actual}
                  </span>
                </div>
                <div className="flex gap-2 h-6">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                    <div
                      className="h-full bg-primary/30 rounded"
                      style={{ width: `${expectedWidth}%` }}
                      title={`Atteso: ${expected.toFixed(1)}`}
                    />
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                    <div
                      className={`h-full rounded ${
                        actual > expected ? 'bg-success' :
                        actual < expected ? 'bg-error' :
                        'bg-warning'
                      }`}
                      style={{ width: `${actualWidth}%` }}
                      title={`Reale: ${actual}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/30 rounded"></div>
            <span>Atteso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-success rounded"></div>
            <span>Reale (sopra atteso)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-error rounded"></div>
            <span>Reale (sotto atteso)</span>
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold mb-2">Interpretazione dei Risultati</h4>
            
            {stats.periodType === 'lucky' && (
              <div className="mb-3 p-3 bg-success/10 border border-success/30 rounded">
                <p className="text-sm font-medium text-success mb-1">🍀 Periodo Fortunato</p>
                <p className="text-xs text-text-secondary">
                  La tua media di {stats.averageMatches.toFixed(2)} match/giocata è superiore all'atteso di {stats.expectedAverage.toFixed(2)}.
                  Questo è statisticamente insolito ma possibile. <strong>Non significa che il sistema funziona meglio</strong> - 
                  è semplicemente varianza statistica positiva. La fortuna non dura per sempre.
                </p>
              </div>
            )}

            {stats.periodType === 'unlucky' && (
              <div className="mb-3 p-3 bg-error/10 border border-error/30 rounded">
                <p className="text-sm font-medium text-error mb-1">⚠️ Periodo Sfortunato</p>
                <p className="text-xs text-text-secondary">
                  La tua media di {stats.averageMatches.toFixed(2)} match/giocata è inferiore all'atteso di {stats.expectedAverage.toFixed(2)}.
                  Questo è normale - la varianza statistica causa fluttuazioni. <strong>Non significa che il sistema funziona peggio</strong> - 
                  è semplicemente varianza statistica negativa. Con più giocate, la media si avvicinerà all'atteso.
                </p>
              </div>
            )}

            {stats.periodType === 'normal' && (
              <div className="mb-3 p-3 bg-warning/10 border border-warning/30 rounded">
                <p className="text-sm font-medium text-warning mb-1">📊 Periodo Normale</p>
                <p className="text-xs text-text-secondary">
                  La tua media di {stats.averageMatches.toFixed(2)} match/giocata è vicina all'atteso di {stats.expectedAverage.toFixed(2)}.
                  Questo è il comportamento statistico normale. Il sistema sta funzionando come previsto.
                </p>
              </div>
            )}

            <div className="space-y-2 text-xs text-text-secondary">
              <p>
                <strong>Varianza Statistica:</strong> Le fluttuazioni sono normali. 
                Su {stats.totalPlays} giocate, una deviazione di {Math.abs(stats.deviation).toFixed(2)} match 
                ({Math.abs(stats.deviationPercent).toFixed(1)}%) è {Math.abs(stats.deviationPercent) < 10 ? 'normale' : 'insolita ma possibile'}.
              </p>
              
              <p>
                <strong>Regressione alla Media:</strong> Se hai avuto un periodo fortunato (es. 4 match), 
                è normale che le performance successive si avvicinino alla media attesa. 
                Questo non significa che il sistema "si è rotto" - è matematica pura.
              </p>
              
              <p>
                <strong>Indipendenza delle Estrazioni:</strong> Ogni estrazione è completamente indipendente. 
                Il fatto che tu abbia ottenuto 4 match in passato non influisce sulle probabilità future. 
                Ogni giocata ha sempre la stessa probabilità: {probs.matchProbabilities[0].probability.toFixed(1)}% per 0 match, 
                {probs.matchProbabilities[1].probability.toFixed(1)}% per 1 match, ecc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchVarianceAnalysis;
