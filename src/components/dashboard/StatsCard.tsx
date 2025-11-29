import React from 'react';
import { Frequency, Delay } from '../../types';
import NumberBubble from '../common/NumberBubble';

interface StatsCardProps {
  title: string;
  icon: React.ReactNode;
  data: Frequency[] | Delay[];
  type: 'hot' | 'cold' | 'due' | 'jolly' | 'superstar';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, icon, data, type }) => {
  const renderData = () => {
    if (!data.length) {
      return <p className="text-text-secondary text-sm">Nessun dato disponibile</p>;
    }
    
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {data.slice(0, 5).map((item) => {
          const number = 'number' in item ? item.number : item.number;
          const value = 'count' in item ? item.count : item.delay;
          
          return (
            <div key={number} className="flex flex-col items-center">
              <NumberBubble number={number} type={type} />
              <span className="text-xs mt-1 text-text-secondary">
                {type === 'due' ? `${value} est.` : `${value}x`}
              </span>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="card">
      <div className="flex items-center mb-3">
        <div className="mr-3">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      
      {renderData()}
    </div>
  );
};

export default StatsCard;