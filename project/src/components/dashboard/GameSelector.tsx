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
          <div
            key={game.id}
            className={`game-card ${
              selectedGame === game.id ? 'game-card-selected' : ''
            } ${game.color}`}
            onClick={() => setSelectedGame(game.id)}
          >
            <div className="flex items-center">
              <div className="mr-4">
                <IconComponent className="h-8 w-8 text-text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{game.name}</h3>
                <p className="text-sm text-text-secondary">{game.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GameSelector;