import React from 'react';
import GameSelector from '../components/dashboard/GameSelector';
import StatsOverview from '../components/dashboard/StatsOverview';
import GeneratorPanel from '../components/generator/GeneratorPanel';
import AIRecommendation from '../components/ai/AIRecommendation';
import ExtractionHistory from '../components/history/ExtractionHistory';
import SavedCombinations from '../components/saved/SavedCombinations';
import SavedCombinationsAnalysis from '../components/analysis/SavedCombinationsAnalysis';

const Dashboard: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Numerix</h1>
      
      <GameSelector />
      <StatsOverview />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeneratorPanel />
        <AIRecommendation />
      </div>
      
      <ExtractionHistory />
      <SavedCombinationsAnalysis />
      <SavedCombinations />
    </div>
  );
};

export default Dashboard;