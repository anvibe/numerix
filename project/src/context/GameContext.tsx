import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { MOCK_EXTRACTIONS, calculateGameStatistics } from '../utils/mockData';
import { generateCombination } from '../utils/generators';
import { fetchAndParseLottoCSV } from '../utils/lottoData';
import { fetchAndParseSuperenalottoCSV } from '../utils/superenalottoData';

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
  extractionsData: Record<GameType, ExtractedNumbers[]>;
  addExtraction: (gameType: GameType, extraction: ExtractedNumbers) => void;
  setExtractionsForGame: (gameType: GameType, newExtractions: ExtractedNumbers[]) => void;
  unsuccessfulCombinations: UnsuccessfulCombination[];
  addUnsuccessfulCombination: (combination: Omit<UnsuccessfulCombination, 'id' | 'dateAdded'>) => void;
  deleteUnsuccessfulCombination: (id: string) => void;
  clearUnsuccessfulCombinations: () => void;
}

export const GameContext = createContext<GameContextType>({
  selectedGame: 'superenalotto',
  setSelectedGame: () => {},
  gameConfig: GAMES[0],
  gameStats: calculateGameStatistics('superenalotto', MOCK_EXTRACTIONS, []),
  generateNumbers: () => ({ numbers: [] }),
  savedCombinations: [],
  saveCombination: () => {},
  deleteCombination: () => {},
  clearCombinations: () => {},
  extractionsData: MOCK_EXTRACTIONS,
  addExtraction: () => {},
  setExtractionsForGame: () => {},
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

// Function to load saved extractions from localStorage
const loadSavedExtractions = (): Record<GameType, ExtractedNumbers[]> | null => {
  try {
    const savedExtractions = localStorage.getItem('numerix-extractions');
    if (savedExtractions) {
      const parsedExtractions = JSON.parse(savedExtractions);
      console.log('Loaded extractions from localStorage:', parsedExtractions);
      return parsedExtractions;
    }
  } catch (error) {
    console.error('Failed to load saved extractions:', error);
  }
  return null;
};

// Function to save extractions to localStorage
const saveExtractionsToStorage = (extractionsData: Record<GameType, ExtractedNumbers[]>) => {
  try {
    localStorage.setItem('numerix-extractions', JSON.stringify(extractionsData));
    console.log('Saved extractions to localStorage');
  } catch (error) {
    console.error('Failed to save extractions to localStorage:', error);
  }
};

// Function to load saved unsuccessful combinations from localStorage
const loadSavedUnsuccessfulCombinations = (): UnsuccessfulCombination[] => {
  try {
    const savedData = localStorage.getItem('numerix-unsuccessful-combinations');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log('Loaded unsuccessful combinations from localStorage:', parsed.length, 'combinations');
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Failed to load saved unsuccessful combinations:', error);
  }
  return [];
};

// Function to save unsuccessful combinations to localStorage
const saveUnsuccessfulCombinationsToStorage = (combinations: UnsuccessfulCombination[]) => {
  try {
    localStorage.setItem('numerix-unsuccessful-combinations', JSON.stringify(combinations));
    console.log('Saved unsuccessful combinations to localStorage:', combinations.length, 'combinations');
  } catch (error) {
    console.error('Failed to save unsuccessful combinations to localStorage:', error);
  }
};

// Function to load saved regular combinations from localStorage
const loadSavedCombinations = (): GeneratedCombination[] => {
  try {
    const savedData = localStorage.getItem('numerix-combinations');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log('Loaded saved combinations from localStorage:', parsed.length, 'combinations');
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Failed to load saved combinations:', error);
  }
  return [];
};

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [selectedGame, setSelectedGame] = useState<GameType>('superenalotto');
  const [gameConfig, setGameConfig] = useState<Game>(GAMES[0]);
  const [gameStats, setGameStats] = useState<GameStatistics>(calculateGameStatistics('superenalotto', MOCK_EXTRACTIONS, []));
  
  // Initialize with saved data
  const [savedCombinations, setSavedCombinations] = useState<GeneratedCombination[]>(() => {
    return loadSavedCombinations();
  });
  
  const [unsuccessfulCombinations, setUnsuccessfulCombinations] = useState<UnsuccessfulCombination[]>(() => {
    return loadSavedUnsuccessfulCombinations();
  });
  
  // Initialize with saved data or empty arrays
  const [extractionsData, setExtractionsData] = useState<Record<GameType, ExtractedNumbers[]>>(() => {
    const savedData = loadSavedExtractions();
    if (savedData) {
      return savedData;
    }
    // Return empty arrays instead of MOCK_EXTRACTIONS to avoid overwriting
    return {
      superenalotto: [],
      lotto: [],
      '10elotto': [],
      millionday: []
    };
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Load default CSV data only if no saved data exists
  useEffect(() => {
    const initializeData = async () => {
      const savedData = loadSavedExtractions();
      
      if (!savedData) {
        console.log('No saved data found, loading default CSV files...');
        try {
          const [lottoData, superenalottoData] = await Promise.all([
            fetchAndParseLottoCSV(),
            fetchAndParseSuperenalottoCSV()
          ]);

          const newExtractionsData = {
            superenalotto: superenalottoData,
            lotto: lottoData,
            '10elotto': [],
            millionday: []
          };

          setExtractionsData(newExtractionsData);
          saveExtractionsToStorage(newExtractionsData);
        } catch (error) {
          console.error('Error loading default CSV data:', error);
        }
      } else {
        console.log('Using saved data from localStorage');
      }
      
      setIsInitialized(true);
    };
    
    initializeData();
  }, []);
  
  // Save to localStorage whenever extractionsData changes (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveExtractionsToStorage(extractionsData);
    }
  }, [extractionsData, isInitialized]);
  
  // Update game config and stats when game changes or data changes
  useEffect(() => {
    const game = GAMES.find(g => g.id === selectedGame) || GAMES[0];
    setGameConfig(game);
    
    const newStats = calculateGameStatistics(selectedGame, extractionsData, unsuccessfulCombinations);
    setGameStats(newStats);
  }, [selectedGame, extractionsData, unsuccessfulCombinations]);
  
  // Save combinations to localStorage when they change
  useEffect(() => {
    if (savedCombinations.length >= 0) { // Always save, even if empty
      try {
        localStorage.setItem('numerix-combinations', JSON.stringify(savedCombinations));
        console.log('Saved combinations to localStorage:', savedCombinations.length, 'combinations');
      } catch (error) {
        console.error('Failed to save combinations to localStorage:', error);
      }
    }
  }, [savedCombinations]);

  // Save unsuccessful combinations to localStorage when they change
  useEffect(() => {
    if (unsuccessfulCombinations.length >= 0) { // Always save, even if empty
      saveUnsuccessfulCombinationsToStorage(unsuccessfulCombinations);
    }
  }, [unsuccessfulCombinations]);
  
  const addExtraction = (gameType: GameType, extraction: ExtractedNumbers) => {
    setExtractionsData(prev => ({
      ...prev,
      [gameType]: [extraction, ...prev[gameType]]
    }));
  };

  const setExtractionsForGame = (gameType: GameType, newExtractions: ExtractedNumbers[]) => {
    console.log(`Setting ${newExtractions.length} extractions for ${gameType}`);
    setExtractionsData(prev => ({
      ...prev,
      [gameType]: newExtractions
    }));
  };
  
  const generateNumbers = (
    strategy: 'standard' | 'high-variability' = 'standard',
    wheel?: LottoWheel
  ) => {
    return generateCombination(selectedGame, strategy, gameStats, wheel);
  };
  
  const saveCombination = (
    numbers: number[],
    strategy: 'standard' | 'high-variability',
    wheel?: LottoWheel,
    jolly?: number,
    superstar?: number,
    isAI?: boolean,
    isAdvancedAI?: boolean
  ) => {
    const newCombination: GeneratedCombination = {
      id: uuidv4(),
      gameType: selectedGame,
      numbers,
      date: new Date().toISOString(),
      strategy,
      wheel,
      jolly,
      superstar,
      isAI,
      isAdvancedAI
    };
    
    setSavedCombinations(prev => [newCombination, ...prev]);
  };
  
  const deleteCombination = (id: string) => {
    setSavedCombinations(prev => prev.filter(combo => combo.id !== id));
  };
  
  const clearCombinations = () => {
    setSavedCombinations([]);
  };

  const addUnsuccessfulCombination = (combination: Omit<UnsuccessfulCombination, 'id' | 'dateAdded'>) => {
    const newUnsuccessfulCombination: UnsuccessfulCombination = {
      ...combination,
      id: uuidv4(),
      dateAdded: new Date().toISOString(),
    };
    
    console.log('Adding unsuccessful combination:', newUnsuccessfulCombination);
    setUnsuccessfulCombinations(prev => {
      const updated = [newUnsuccessfulCombination, ...prev];
      console.log('Updated unsuccessful combinations count:', updated.length);
      return updated;
    });
  };

  const deleteUnsuccessfulCombination = (id: string) => {
    setUnsuccessfulCombinations(prev => {
      const updated = prev.filter(combo => combo.id !== id);
      console.log('Deleted unsuccessful combination, remaining:', updated.length);
      return updated;
    });
  };

  const clearUnsuccessfulCombinations = () => {
    console.log('Clearing all unsuccessful combinations');
    setUnsuccessfulCombinations([]);
  };
  
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
        extractionsData,
        addExtraction,
        setExtractionsForGame,
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