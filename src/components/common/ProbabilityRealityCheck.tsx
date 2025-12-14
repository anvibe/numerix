import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Percent, Target, Info } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  calculateLotteryProbabilities,
  SUPERENALOTTO_PROBABILITIES,
  LOTTO_PROBABILITIES,
  MILLIONDAY_PROBABILITIES,
  LotteryProbabilities,
} from '../../utils/probabilityCalculator';

/**
 * Component that shows users the TRUE mathematical probabilities
 * of winning the lottery - for honest, transparent gaming information.
 */
const ProbabilityRealityCheck: React.FC = () => {
  const { selectedGame } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Format probability as percentage
  const formatPercent = (prob: number): string => {
    if (prob >= 0.01) {
      return `${(prob * 100).toFixed(1)}%`;
    } else if (prob >= 0.0001) {
      return `${(prob * 100).toFixed(3)}%`;
    } else if (prob >= 0.000001) {
      return `${(prob * 100).toFixed(6)}%`;
    } else {
      return `${(prob * 100).toExponential(2)}%`;
    }
  };

  // Get color based on probability
  const getProbabilityColor = (prob: number): string => {
    if (prob >= 0.1) return 'text-success';
    if (prob >= 0.01) return 'text-warning';
    if (prob >= 0.001) return 'text-orange-500';
    return 'text-error';
  };

  return (
    <div className="card mb-8 border-2 border-warning/30 bg-warning/5">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-0 text-left"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Nascondi probabilità reali' : 'Mostra probabilità reali'}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">🎲 Probabilità Reali - {probs.game}</h2>
            <p className="text-sm text-text-secondary">
              Media match per giocata: <span className="font-bold text-warning">{probs.expectedMatchesPerPlay.toFixed(2)}</span> numeri
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary hidden sm:block">
            {isExpanded ? 'Nascondi' : 'Mostra dettagli'}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Important disclaimer */}
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-warning mb-1">⚠️ Verità Matematica</p>
                <p className="text-text-secondary">
                  Ogni combinazione ha la <strong>stessa identica probabilità</strong> di vincere.
                  [1,2,3,4,5,6] ha le stesse probabilità di qualsiasi altra combinazione.
                  I numeri "caldi" o "ritardatari" <strong>non</strong> aumentano le tue possibilità.
                </p>
              </div>
            </div>
          </div>

          {/* Probability table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Tabella probabilità">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-2 text-left font-semibold">Match</th>
                  <th className="py-3 px-2 text-right font-semibold">Probabilità</th>
                  <th className="py-3 px-2 text-right font-semibold">Odds</th>
                  <th className="py-3 px-2 text-right font-semibold hidden sm:table-cell">Aspettativa</th>
                </tr>
              </thead>
              <tbody>
                {probs.matchProbabilities.map((mp) => (
                  <tr
                    key={mp.matches}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-bg-secondary/50"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="font-medium">
                          {mp.matches === probs.yourPicks ? (
                            <span className="text-success">🎉 {mp.matches}/{probs.yourPicks} (Jackpot)</span>
                          ) : (
                            `${mp.matches}/${probs.yourPicks}`
                          )}
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 px-2 text-right font-mono ${getProbabilityColor(mp.probability)}`}>
                      {formatPercent(mp.probability)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-text-secondary">
                      {mp.odds}
                    </td>
                    <td className="py-3 px-2 text-right text-text-secondary hidden sm:table-cell">
                      {mp.humanReadable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Key statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-secondary rounded-lg p-4 text-center">
              <Percent className="h-5 w-5 text-primary mx-auto mb-2" aria-hidden="true" />
              <div className="text-2xl font-bold text-primary">
                {((probs.matchProbabilities[0].probability + probs.matchProbabilities[1].probability) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-text-secondary">0-1 match (normale)</div>
            </div>
            
            <div className="bg-bg-secondary rounded-lg p-4 text-center">
              <Target className="h-5 w-5 text-warning mx-auto mb-2" aria-hidden="true" />
              <div className="text-2xl font-bold text-warning">
                {probs.expectedMatchesPerPlay.toFixed(2)}
              </div>
              <div className="text-xs text-text-secondary">Match medi/giocata</div>
            </div>
            
            <div className="bg-bg-secondary rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-error">
                {probs.totalCombinations.toLocaleString('it-IT')}
              </div>
              <div className="text-xs text-text-secondary">Combinazioni totali</div>
            </div>
            
            <div className="bg-bg-secondary rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-success">
                {probs.matchProbabilities[probs.yourPicks]?.odds || 'N/A'}
              </div>
              <div className="text-xs text-text-secondary">Odds Jackpot</div>
            </div>
          </div>

          {/* Reality check simulation */}
          <div className="p-4 bg-bg-secondary rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>📊</span> Simulazione: 10 anni di gioco (3 volte/settimana)
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              Se giochi {probs.game} 3 volte a settimana per 10 anni (1.560 giocate):
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {probs.matchProbabilities.slice(0, 4).map((mp) => {
                const expectedIn10Years = 1560 * mp.probability;
                return (
                  <div key={mp.matches} className="bg-bg-primary p-3 rounded border border-gray-200 dark:border-gray-700">
                    <div className="font-semibold">{mp.matches} match</div>
                    <div className="text-lg font-bold text-primary">
                      ~{Math.round(expectedIn10Years)} volte
                    </div>
                  </div>
                );
              })}
            </div>
            {probs.yourPicks >= 4 && (
              <p className="text-xs text-text-secondary mt-3">
                ⚠️ Per {probs.yourPicks - 1}+ match: statisticamente improbabile in 10 anni. 
                Servirebbero centinaia di anni di gioco.
              </p>
            )}
          </div>

          {/* Final message */}
          <div className="text-center text-sm text-text-secondary p-4 border-t border-gray-200 dark:border-gray-700">
            <p>
              <strong>Ricorda:</strong> La lotteria è un gioco d'azzardo. 
              Le statistiche storiche sono solo per <em>intrattenimento</em>, 
              non influenzano le probabilità future.
            </p>
            <p className="mt-2">
              🎰 Gioca responsabilmente. Se il gioco diventa un problema, chiedi aiuto.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProbabilityRealityCheck;

