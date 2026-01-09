import React, { Suspense, lazy } from 'react';
import GameSelector from '../components/dashboard/GameSelector';
import StatsOverview from '../components/dashboard/StatsOverview';
import GeneratorPanel from '../components/generator/GeneratorPanel';
import AIRecommendation from '../components/ai/AIRecommendation';
import ExtractionHistory from '../components/history/ExtractionHistory';
import SavedCombinations from '../components/saved/SavedCombinations';
import ProbabilityRealityCheck from '../components/common/ProbabilityRealityCheck';
import { AnalysisSkeleton } from '../components/common/LoadingSkeleton';
import { useGame } from '../context/GameContext';
import MatchVarianceAnalysis from '../components/analysis/MatchVarianceAnalysis';

// Lazy load heavy analysis component for better initial page load
const SavedCombinationsAnalysis = lazy(
  () => import('../components/analysis/SavedCombinationsAnalysis')
);

const Dashboard: React.FC = () => {
  const { 
    selectedGame, 
    savedCombinations, 
    extractionsData,
    gameConfig 
  } = useGame();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Numerix</h1>
      
      <GameSelector />
      
      {/* Reality check - Show true probabilities first */}
      <ProbabilityRealityCheck />
      
      <StatsOverview />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeneratorPanel />
        <AIRecommendation />
      </div>
      
      <ExtractionHistory />
      
      {/* Variance Analysis - Show statistical performance */}
      <MatchVarianceAnalysis
        savedCombinations={savedCombinations}
        extractions={extractionsData[selectedGame] || []}
        selectedWheel={selectedGame === 'lotto' ? 'Bari' : undefined}
      />
      
      {/* Lazy loaded with skeleton fallback */}
      <Suspense fallback={<AnalysisSkeleton />}>
        <SavedCombinationsAnalysis />
      </Suspense>
      
      <SavedCombinations />
    </div>
  );
};

export default Dashboard;