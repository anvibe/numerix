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
  } = useGame();

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Numerix</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Genera combinazioni, confronta i tuoi risultati e controlla le probabilità con un'interfaccia più chiara e moderna.
        </p>
      </section>
      
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
