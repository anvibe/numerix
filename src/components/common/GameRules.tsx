import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { getGameByType } from '../../utils/generators';

interface GameRulesProps {
  isOpen: boolean;
  onClose: () => void;
}

const GameRules: React.FC<GameRulesProps> = ({ isOpen, onClose }) => {
  const { selectedGame } = useGame();
  const gameConfig = getGameByType(selectedGame);

  if (!isOpen) return null;

  const gameRules = {
    superenalotto: {
      name: 'SuperEnalotto',
      description: 'Il SuperEnalotto è il gioco a premi più alto d\'Italia.',
      howToPlay: [
        'Seleziona 6 numeri da 1 a 90',
        'Puoi scegliere anche il numero Jolly (1-90) e il SuperStar (1-90)',
        'Ogni combinazione costa 1€',
        'Le estrazioni avvengono tre volte alla settimana: martedì, giovedì e sabato'
      ],
      prizes: [
        '6 numeri: Jackpot',
        '5 numeri + Jolly: Premio consistente',
        '5 numeri: Premio consistente',
        '4 numeri: Premio medio',
        '3 numeri: Premio basso',
        '2 numeri: Rimborso'
      ],
      tips: [
        'Il numero Jolly può sostituire uno dei numeri vincenti',
        'Il SuperStar moltiplica le vincite',
        'Puoi giocare più combinazioni per aumentare le probabilità'
      ]
    },
    lotto: {
      name: 'Lotto',
      description: 'Il gioco del Lotto italiano tradizionale.',
      howToPlay: [
        'Seleziona 5 numeri da 1 a 90',
        'Scegli una ruota (Bari, Cagliari, Firenze, Genova, Milano, Napoli, Palermo, Roma, Torino, Venezia o Nazionale)',
        'Ogni combinazione costa 1€',
        'Le estrazioni avvengono tre volte alla settimana: martedì, giovedì e sabato'
      ],
      prizes: [
        '5 numeri: Ambata (premio massimo)',
        '4 numeri: Quaterna',
        '3 numeri: Terno',
        '2 numeri: Ambo',
        '1 numero: Ambata (se giocato su ruota singola)'
      ],
      tips: [
        'Puoi giocare su più ruote contemporaneamente',
        'Ogni ruota ha estrazioni separate',
        'Le vincite variano in base alla ruota scelta'
      ]
    },
    '10elotto': {
      name: '10eLotto',
      description: 'Variante del Lotto con 10 numeri da selezionare.',
      howToPlay: [
        'Seleziona 10 numeri da 1 a 90',
        'Puoi scegliere anche il numero Jolly (1-90)',
        'Ogni combinazione costa 1€',
        'Le estrazioni avvengono ogni 5 minuti durante il giorno'
      ],
      prizes: [
        '10 numeri: Premio massimo',
        '9 numeri: Premio consistente',
        '8 numeri: Premio medio',
        '7 numeri: Premio basso',
        '6 numeri: Rimborso'
      ],
      tips: [
        'Più frequenti rispetto al Lotto tradizionale',
        'Il numero Jolly può sostituire uno dei numeri vincenti',
        'Ideale per chi cerca estrazioni più frequenti'
      ]
    },
    millionday: {
      name: 'MillionDAY',
      description: 'Gioco quotidiano con montepremi garantito.',
      howToPlay: [
        'Seleziona 5 numeri da 1 a 55',
        'Puoi scegliere anche il numero Jolly (1-55)',
        'Ogni combinazione costa 1€',
        'Estrazione giornaliera alle ore 20:30'
      ],
      prizes: [
        '5 numeri: Premio massimo garantito',
        '4 numeri + Jolly: Premio consistente',
        '4 numeri: Premio medio',
        '3 numeri: Premio basso',
        '2 numeri: Rimborso'
      ],
      tips: [
        'Montepremi garantito giornaliero',
        'Il numero Jolly può sostituire uno dei numeri vincenti',
        'Gioco ideale per chi cerca vincite quotidiane'
      ]
    }
  };

  const rules = gameRules[selectedGame];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-300 dark:border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-2xl font-bold">Regole del Gioco: {rules.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-bg-secondary transition-colors"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-text-secondary text-lg">{rules.description}</p>
          </div>

          {/* How to Play */}
          <div>
            <h3 className="text-xl font-semibold mb-3 text-primary">Come Si Gioca</h3>
            <ul className="space-y-2">
              {rules.howToPlay.map((rule, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span className="text-text-secondary">{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prizes */}
          <div>
            <h3 className="text-xl font-semibold mb-3 text-primary">Vincite</h3>
            <ul className="space-y-2">
              {rules.prizes.map((prize, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span className="text-text-secondary">{prize}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-xl font-semibold mb-3 text-primary">Suggerimenti</h3>
            <ul className="space-y-2">
              {rules.tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span className="text-text-secondary">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Game Configuration */}
          <div className="bg-bg-secondary rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-primary">Configurazione Gioco</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Numeri da selezionare:</span>
                <span className="ml-2 font-medium text-primary">{gameConfig.numbersToSelect}</span>
              </div>
              <div>
                <span className="text-text-secondary">Range numeri:</span>
                <span className="ml-2 font-medium text-primary">1 - {gameConfig.maxNumber}</span>
              </div>
              {gameConfig.wheels && (
                <div className="col-span-2">
                  <span className="text-text-secondary">Ruote disponibili:</span>
                  <span className="ml-2 font-medium text-primary">{gameConfig.wheels.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-bg-primary border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameRules;

