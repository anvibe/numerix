import React from 'react';
import { GAMES, getIconComponent } from '../../utils/constants';
import { useGame } from '../../context/GameContext';

const GameSelector: React.FC = () => {
  const { selectedGame, setSelectedGame } = useGame();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {GAMES.map((game) => {
        const IconComponent = getIconComponent(game.icon);
        
        return (
          <button
            type="button"
            key={game.id}
            className={`game-card ${
              selectedGame === game.id ? 'game-card-selected' : ''
            } ${game.color}`}
            onClick={() => setSelectedGame(game.id)}
            aria-pressed={selectedGame === game.id}
          >
            <div className="flex items-center text-left">
              <div className={`mr-4 rounded-lg p-3 ${selectedGame === game.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                <IconComponent className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{game.name}</h3>
                <p className="text-sm text-text-secondary">{game.description}</p>
                {game.drawDays && (
                  <p className="text-xs text-text-secondary mt-1">
                    Estrazioni: {game.drawDays.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default GameSelector;
