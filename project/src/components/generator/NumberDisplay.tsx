import React from 'react';
import NumberBubble from '../common/NumberBubble';

interface NumberDisplayProps {
  numbers: number[];
  gameType: string;
  jolly?: number;
  superstar?: number;
}

const NumberDisplay: React.FC<NumberDisplayProps> = ({ 
  numbers, 
  gameType,
  jolly,
  superstar
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-3 mb-2">
        {numbers.map((number, index) => (
          <div 
            key={index} 
            className="animate-bounce-slow" 
            style={{ 
              animationDelay: `${index * 0.1}s`,
              animationDuration: '1s'
            }}
          >
            <NumberBubble 
              number={number} 
              type="selected" 
              size="lg" 
            />
          </div>
        ))}
      </div>
      
      {gameType === 'superenalotto' && (jolly || superstar) && (
        <div className="flex flex-col items-center space-y-2">
          {jolly && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-secondary">Jolly:</span>
              <NumberBubble 
                number={jolly} 
                type="cold"
                size="md" 
              />
            </div>
          )}
          
          {superstar && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-secondary">SuperStar:</span>
              <NumberBubble 
                number={superstar} 
                type="hot"
                size="md" 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NumberDisplay;