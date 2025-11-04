import React from 'react';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import StatsCard from './StatsCard';
import { useGame } from '../../context/GameContext';

const StatsOverview: React.FC = () => {
  const { gameStats } = useGame();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatsCard
        title="Numeri Frequenti"
        icon={<TrendingUp className="h-6 w-6 text-secondary" />}
        data={gameStats.frequentNumbers}
        type="hot"
      />
      
      <StatsCard
        title="Numeri Rari"
        icon={<TrendingDown className="h-6 w-6 text-blue-500" />}
        data={gameStats.infrequentNumbers}
        type="cold"
      />
      
      <StatsCard
        title="Numeri Ritardatari"
        icon={<Clock className="h-6 w-6 text-warning" />}
        data={gameStats.delays}
        type="due"
      />
    </div>
  );
};

export default StatsOverview;