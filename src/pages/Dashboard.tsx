@@ .. @@
 import React from 'react';
 import GameSelector from '../components/dashboard/GameSelector';
 import StatsOverview from '../components/dashboard/StatsOverview';
 import GeneratorPanel from '../components/generator/GeneratorPanel';
 import AIRecommendation from '../components/ai/AIRecommendation';
 import ExtractionHistory from '../components/history/ExtractionHistory';
 import SavedCombinations from '../components/saved/SavedCombinations';
 import UnsuccessfulCombinations from '../components/feedback/UnsuccessfulCombinations';
+import ApiStatus from '../components/common/ApiStatus';
 
 const Dashboard: React.FC = () => {
   return (
     <div className="container mx-auto px-4 py-8">
       <h1 className="text-3xl font-bold mb-6">Dashboard Numerix</h1>
       
+      <ApiStatus showDetails={true} />
+      
       <GameSelector />
       <StatsOverview />
       
@@ .. @@
       <ExtractionHistory />
       <UnsuccessfulCombinations />
       <SavedCombinations />
     </div>
   );
 };

export default Dashboard