import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { 
  GameType, 
  Game, 
  GameStatistics, 
  GeneratedCombination,
  ExtractedNumbers,
  UnsuccessfulCombination,
  LottoWheel
} from '../types';
import { GAMES } from '../utils/constants';
import { calculateGameStatistics } from '../utils/mockData';
import { generateCombination } from '../utils/generators';
import { fetchAndParseLottoCSV } from '../utils/lottoData';
import { fetchAndParseSuperenalottoCSV } from '../utils/superenalottoData';
import { extractionService } from '../services/extractionService';
import { combinationService } from '../services/combinationService';
import { supabase } from '../utils/supabaseClient';

interface GameContextType {
  selectedGame: GameType;
  setSelectedGame: (game: GameType) => void;
  gameConfig: Game;
  gameStats: GameStatistics;
  generateNumbers: (strategy: 'standard' | 'high-variability', wheel?: LottoWheel) => {
    numbers: number[];
    jolly?: number;
    superstar?: number;
  };
  savedCombinations: GeneratedCombination[];
  saveCombination: (
    numbers: number[], 
    strategy: 'standard' | 'high-variability', 
    wheel?: LottoWheel,
    jolly?: number,
    superstar?: number,
    isAI?: boolean,
    isAdvancedAI?: boolean
  ) => void;
  deleteCombination: (id: string) => void;
  clearCombinations: () => void;
  removeDuplicateCombinations: () => Promise<number>;
  extractionsData: Record<GameType, ExtractedNumbers[]>;
  addExtraction: (gameType: GameType, extraction: ExtractedNumbers) => void;
  setExtractionsForGame: (gameType: GameType, newExtractions: ExtractedNumbers[]) => void;
  reloadExtractions: () => Promise<void>;
  unsuccessfulCombinations: UnsuccessfulCombination[];
  addUnsuccessfulCombination: (combination: Omit<UnsuccessfulCombination, 'id' | 'dateAdded'>) => void;
  deleteUnsuccessfulCombination: (id: string) => void;
  clearUnsuccessfulCombinations: () => void;
}

export const GameContext = createContext<GameContextType>({
  selectedGame: 'superenalotto',
  setSelectedGame: () => {},
  gameConfig: GAMES[0],
  gameStats: calculateGameStatistics('superenalotto', { superenalotto: [], lotto: [], '10elotto': [], millionday: [] }, []),
  generateNumbers: () => ({ numbers: [] }),
  savedCombinations: [],
  saveCombination: () => {},
  deleteCombination: () => {},
  clearCombinations: () => {},
  removeDuplicateCombinations: () => Promise.resolve(0),
  extractionsData: { superenalotto: [], lotto: [], '10elotto': [], millionday: [] },
  addExtraction: () => {},
  setExtractionsForGame: () => {},
  reloadExtractions: () => Promise.resolve(),
  unsuccessfulCombinations: [],
  addUnsuccessfulCombination: () => {},
  deleteUnsuccessfulCombination: () => {},
  clearUnsuccessfulCombinations: () => {},
});

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [selectedGame, setSelectedGame] = useState<GameType>('superenalotto');
  const [gameConfig, setGameConfig] = useState<Game>(GAMES[0]);
  const [gameStats, setGameStats] = useState<GameStatistics>(calculateGameStatistics('superenalotto', { superenalotto: [], lotto: [], '10elotto': [], millionday: [] }, []));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State for data
  const [savedCombinations, setSavedCombinations] = useState<GeneratedCombination[]>([]);
  const [unsuccessfulCombinations, setUnsuccessfulCombinations] = useState<UnsuccessfulCombination[]>([]);
  const [extractionsData, setExtractionsData] = useState<Record<GameType, ExtractedNumbers[]>>({
    superenalotto: [],
    lotto: [],
    '10elotto': [],
    millionday: []
  });
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth check error:', error);
          // Clear invalid tokens if there's an auth error
          if (error.message.includes('refresh_token_not_found') || 
              error.message.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
          }
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!session);
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV === 'development' && (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED')) {
        console.log('Auth state changed:', event);
      }
      
      const wasAuthenticated = isAuthenticated;
      const nowAuthenticated = !!session;
      
      setIsAuthenticated(nowAuthenticated);
      
      if (session) {
        // User signed in, load their data
        loadUserData();
      } else {
        // User signed out, clear user-specific data
        setSavedCombinations([]);
        setUnsuccessfulCombinations([]);
        
        // Clear any cached data when signing out
        if (process.env.NODE_ENV === 'development' && wasAuthenticated && !nowAuthenticated) {
          console.log('User signed out, clearing cached data');
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Load user-specific data
  const loadUserData = async () => {
    if (!isAuthenticated) return;
    
    try {
      // Verify we still have a valid session before loading data
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAuthenticated(false);
        return;
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      setIsAuthenticated(false);
      return;
    }
    
    try {
      const [savedCombs, unsuccessfulCombs] = await Promise.all([
        combinationService.getSavedCombinations(),
        combinationService.getUnsuccessfulCombinations()
      ]);
      
      // Final deduplication safeguard - ensure no duplicates by ID
      const uniqueById = new Map<string, GeneratedCombination>();
      savedCombs.forEach(combo => {
        if (!uniqueById.has(combo.id)) {
          uniqueById.set(combo.id, combo);
        }
      });
      
      // Then deduplicate by numbers
      const uniqueByNumbers = new Map<string, GeneratedCombination>();
      Array.from(uniqueById.values()).forEach(combo => {
        const sortedNumbers = [...combo.numbers].sort((a, b) => a - b);
        const numbersKey = `${sortedNumbers.join(',')}-${combo.gameType}`;
        const existing = uniqueByNumbers.get(numbersKey);
        if (!existing || new Date(combo.date) > new Date(existing.date)) {
          uniqueByNumbers.set(numbersKey, combo);
        }
      });
      
      const deduplicatedCombs = Array.from(uniqueByNumbers.values());
      
      if (process.env.NODE_ENV === 'development' && savedCombs.length !== deduplicatedCombs.length) {
        console.log(`Context deduplication: ${savedCombs.length} → ${deduplicatedCombs.length} combinations`);
      }
      
      setSavedCombinations(deduplicatedCombs);
      setUnsuccessfulCombinations(unsuccessfulCombs);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };
  
  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);
  
  // Function to load extractions data (extracted for reuse)
  const loadExtractionsData = async () => {
    try {
      // Load extractions from Supabase for all game types
      const extractionsPromises = (['superenalotto', 'lotto', '10elotto', 'millionday'] as GameType[]).map(async (gameType) => {
        const extractions = await extractionService.getExtractions(gameType);
        return { gameType, extractions };
      });
      
      const results = await Promise.all(extractionsPromises);
      const newExtractionsData: Record<GameType, ExtractedNumbers[]> = {
        superenalotto: [],
        lotto: [],
        '10elotto': [],
        millionday: []
      };
      
      results.forEach(({ gameType, extractions }) => {
        newExtractionsData[gameType] = extractions;
      });
      
      // If no data exists in Supabase, load from CSV files and populate the database
      const hasSuper = newExtractionsData.superenalotto.length > 0;
      const hasLotto = newExtractionsData.lotto.length > 0;
      
      if (!hasSuper || !hasLotto) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Loading default CSV data and populating Supabase...');
        }
        
        const [lottoData, superenalottoData] = await Promise.all([
          fetchAndParseLottoCSV(),
          fetchAndParseSuperenalottoCSV()
        ]);
        
        // Upload to Supabase if we have data
        if (!hasLotto && lottoData.length > 0) {
          await extractionService.bulkInsertExtractions('lotto', lottoData);
          newExtractionsData.lotto = lottoData;
        }
        
        if (!hasSuper && superenalottoData.length > 0) {
          await extractionService.bulkInsertExtractions('superenalotto', superenalottoData);
          newExtractionsData.superenalotto = superenalottoData;
        }
      }
      
      setExtractionsData(newExtractionsData);
    } catch (error) {
      console.error('Error loading extractions data:', error);
      // Fallback to CSV files if Supabase fails
      try {
        const [lottoData, superenalottoData] = await Promise.all([
          fetchAndParseLottoCSV(),
          fetchAndParseSuperenalottoCSV()
        ]);
        
        setExtractionsData({
          superenalotto: superenalottoData,
          lotto: lottoData,
          '10elotto': [],
          millionday: []
        });
      } catch (csvError) {
        console.error('Error loading CSV fallback data:', csvError);
      }
    }
  };
  
  // Function to reload extractions (for use after scraping)
  const reloadExtractions = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Reloading extractions from Supabase...');
    }
    await loadExtractionsData();
  };
  
  // Load extractions data on initialization
  useEffect(() => {
    if (!isLoading) {
      loadExtractionsData();
    }
  }, [isLoading]);
  
  // Migrate localStorage data to Supabase (one-time migration)
  useEffect(() => {
    const migrateLocalStorageData = async () => {
      if (!isAuthenticated) return;
      
      try {
        // Check if we have localStorage data to migrate
        const localSavedCombinations = localStorage.getItem('numerix-combinations');
        const localUnsuccessfulCombinations = localStorage.getItem('numerix-unsuccessful-combinations');
        
        if (localSavedCombinations) {
          const parsed = JSON.parse(localSavedCombinations);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Migrating saved combinations to Supabase...');
            }
            for (const combo of parsed) {
              try {
                await combinationService.saveCombination({
                  gameType: combo.gameType,
                  numbers: combo.numbers,
                  strategy: combo.strategy,
                  wheel: combo.wheel,
                  jolly: combo.jolly,
                  superstar: combo.superstar,
                  isAI: combo.isAI,
                  isAdvancedAI: combo.isAdvancedAI
                });
              } catch (error) {
                console.error('Error migrating saved combination:', error);
              }
            }
            // Clear localStorage after successful migration
            localStorage.removeItem('numerix-combinations');
          }
        }
        
        if (localUnsuccessfulCombinations) {
          const parsed = JSON.parse(localUnsuccessfulCombinations);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Migrating unsuccessful combinations to Supabase...');
            }
            for (const combo of parsed) {
              try {
                await combinationService.addUnsuccessfulCombination({
                  gameType: combo.gameType,
                  numbers: combo.numbers,
                  drawDate: combo.drawDate,
                  wheel: combo.wheel,
                  jolly: combo.jolly,
                  superstar: combo.superstar,
                  strategy: combo.strategy,
                  notes: combo.notes
                });
              } catch (error) {
                console.error('Error migrating unsuccessful combination:', error);
              }
            }
            // Clear localStorage after successful migration
            localStorage.removeItem('numerix-unsuccessful-combinations');
          }
        }
        
        // Reload user data after migration
        await loadUserData();
      } catch (error) {
        console.error('Error during localStorage migration:', error);
      }
    };
    
    if (isAuthenticated) {
      migrateLocalStorageData();
    }
  }, [isAuthenticated]);
  
  // Update game config and stats when game changes or data changes
  useEffect(() => {
    const game = GAMES.find(g => g.id === selectedGame) || GAMES[0];
    setGameConfig(game);
    
    const extractions = extractionsData[selectedGame];
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GameContext] Calculating statistics for ${selectedGame} with ${extractions.length} extractions`);
    }
    
    const newStats = calculateGameStatistics(selectedGame, extractionsData, unsuccessfulCombinations);
    
    // Log statistics summary (development only)
    if (process.env.NODE_ENV === 'development' && newStats.advancedStatistics) {
      console.log(`[GameContext] Advanced statistics calculated:`, {
        totalExtractions: extractions.length,
        bayesianProbabilities: newStats.advancedStatistics.bayesianProbabilities.length,
        coOccurrences: newStats.advancedStatistics.coOccurrences.length,
        patternScore: newStats.advancedStatistics.patternScore.toFixed(1)
      });
    }
    
    setGameStats(newStats);
  }, [selectedGame, extractionsData, unsuccessfulCombinations]);
  
  const addExtraction = async (gameType: GameType, extraction: ExtractedNumbers) => {
    try {
      await extractionService.addExtraction(gameType, extraction);
      setExtractionsData(prev => ({
        ...prev,
        [gameType]: [extraction, ...prev[gameType]]
      }));
    } catch (error) {
      console.error('Error adding extraction:', error);
      throw error;
    }
  };

  const setExtractionsForGame = async (gameType: GameType, newExtractions: ExtractedNumbers[]) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Setting ${newExtractions.length} extractions for ${gameType}`);
      }
      await extractionService.replaceExtractions(gameType, newExtractions);
      setExtractionsData(prev => ({
        ...prev,
        [gameType]: newExtractions
      }));
    } catch (error) {
      console.error('Error setting extractions for game:', error);
      throw error;
    }
  };
  
  const generateNumbers = (
    strategy: 'standard' | 'high-variability' = 'standard',
    wheel?: LottoWheel,
    includeMetadata: boolean = true
  ) => {
    return generateCombination(selectedGame, strategy, gameStats, wheel, includeMetadata);
  };
  
  const saveCombination = async (
    numbers: number[],
    strategy: 'standard' | 'high-variability',
    wheel?: LottoWheel,
    jolly?: number,
    superstar?: number,
    isAI?: boolean,
    isAdvancedAI?: boolean
  ) => {
    try {
      await combinationService.saveCombination({
        gameType: selectedGame,
        numbers,
        strategy,
        wheel,
        jolly,
        superstar,
        isAI,
        isAdvancedAI
      });
      
      // Reload saved combinations (with deduplication)
      const updatedCombinations = await combinationService.getSavedCombinations();
      
      // Apply deduplication before setting state
      const uniqueById = new Map<string, GeneratedCombination>();
      updatedCombinations.forEach(combo => {
        if (!uniqueById.has(combo.id)) {
          uniqueById.set(combo.id, combo);
        }
      });
      
      const uniqueByNumbers = new Map<string, GeneratedCombination>();
      Array.from(uniqueById.values()).forEach(combo => {
        const sortedNumbers = [...combo.numbers].sort((a, b) => a - b);
        const numbersKey = `${sortedNumbers.join(',')}-${combo.gameType}`;
        const existing = uniqueByNumbers.get(numbersKey);
        if (!existing || new Date(combo.date) > new Date(existing.date)) {
          uniqueByNumbers.set(numbersKey, combo);
        }
      });
      
      setSavedCombinations(Array.from(uniqueByNumbers.values()));
    } catch (error) {
      console.error('Error saving combination:', error);
      throw error;
    }
  };
  
  const deleteCombination = async (id: string) => {
    try {
      await combinationService.deleteSavedCombination(id);
      setSavedCombinations(prev => prev.filter(combo => combo.id !== id));
    } catch (error) {
      console.error('Error deleting combination:', error);
      throw error;
    }
  };
  
  const clearCombinations = async () => {
    try {
      await combinationService.clearSavedCombinations();
      setSavedCombinations([]);
    } catch (error) {
      console.error('Error clearing combinations:', error);
      throw error;
    }
  };
  
  const removeDuplicateCombinations = async (): Promise<number> => {
    try {
      const result = await combinationService.removeDuplicateCombinations();
      // Reload combinations after cleanup
      const updatedCombinations = await combinationService.getSavedCombinations();
      
      // Apply deduplication before setting state
      const uniqueById = new Map<string, GeneratedCombination>();
      updatedCombinations.forEach(combo => {
        if (!uniqueById.has(combo.id)) {
          uniqueById.set(combo.id, combo);
        }
      });
      
      const uniqueByNumbers = new Map<string, GeneratedCombination>();
      Array.from(uniqueById.values()).forEach(combo => {
        const sortedNumbers = [...combo.numbers].sort((a, b) => a - b);
        const numbersKey = `${sortedNumbers.join(',')}-${combo.gameType}`;
        const existing = uniqueByNumbers.get(numbersKey);
        if (!existing || new Date(combo.date) > new Date(existing.date)) {
          uniqueByNumbers.set(numbersKey, combo);
        }
      });
      
      setSavedCombinations(Array.from(uniqueByNumbers.values()));
      return result.removed;
    } catch (error) {
      console.error('Error removing duplicates:', error);
      throw error;
    }
  };

  const addUnsuccessfulCombination = async (combination: Omit<UnsuccessfulCombination, 'id' | 'dateAdded'>) => {
    try {
      await combinationService.addUnsuccessfulCombination(combination);
      
      // Reload unsuccessful combinations
      const updatedCombinations = await combinationService.getUnsuccessfulCombinations();
      setUnsuccessfulCombinations(updatedCombinations);
    } catch (error) {
      console.error('Error adding unsuccessful combination:', error);
      throw error;
    }
  };

  const deleteUnsuccessfulCombination = async (id: string) => {
    try {
      await combinationService.deleteUnsuccessfulCombination(id);
      setUnsuccessfulCombinations(prev => prev.filter(combo => combo.id !== id));
    } catch (error) {
      console.error('Error deleting unsuccessful combination:', error);
      throw error;
    }
  };

  const clearUnsuccessfulCombinations = async () => {
    try {
      await combinationService.clearUnsuccessfulCombinations();
      setUnsuccessfulCombinations([]);
    } catch (error) {
      console.error('Error clearing unsuccessful combinations:', error);
      throw error;
    }
  };
  
  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Caricamento...</p>
        </div>
      </div>
    );
  }
  
  return (
    <GameContext.Provider 
      value={{
        selectedGame,
        setSelectedGame,
        gameConfig,
        gameStats,
        generateNumbers,
        savedCombinations,
        saveCombination,
        deleteCombination,
        clearCombinations,
        removeDuplicateCombinations,
        extractionsData,
        addExtraction,
        setExtractionsForGame,
        reloadExtractions,
        unsuccessfulCombinations,
        addUnsuccessfulCombination,
        deleteUnsuccessfulCombination,
        clearUnsuccessfulCombinations,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};