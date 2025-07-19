import { UnsuccessfulCombination, ExtractedNumbers, WinningAnalysis, GameType, LottoWheel, Frequency } from '../types';

// Calculate how many numbers match between two arrays
const calculateMatches = (numbers1: number[], numbers2: number[]): number[] => {
  return numbers1.filter(num => numbers2.includes(num));
};

// Calculate frequency of numbers in an array of combinations
const calculateNumberFrequency = (combinations: { numbers: number[] }[]): Frequency[] => {
  const counts: Record<number, number> = {};
  let totalCombinations = combinations.length;

  combinations.forEach(combo => {
    combo.numbers.forEach(num => {
      counts[num] = (counts[num] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([number, count]) => ({
      number: parseInt(number),
      count,
      percentage: (count / totalCombinations) * 100
    }))
    .sort((a, b) => b.count - a.count);
};

// Analyze unsuccessful combinations against winning extractions
export const analyzeUnsuccessfulCombinations = (
  unsuccessfulCombinations: UnsuccessfulCombination[],
  extractions: ExtractedNumbers[],
  gameType: GameType,
  wheel?: LottoWheel
): WinningAnalysis => {
  // Filter combinations for the specific game type and wheel
  const relevantCombinations = unsuccessfulCombinations.filter(combo => {
    if (combo.gameType !== gameType) return false;
    if (gameType === 'lotto') {
      return wheel ? combo.wheel === wheel : true;
    }
    return true;
  });

  if (relevantCombinations.length === 0 || extractions.length === 0) {
    return {
      totalMatches: 0,
      matchDetails: [],
      missedOpportunities: [],
      frequencyAnalysis: {
        yourFrequentNumbers: [],
        winningFrequentNumbers: [],
        overlapAnalysis: []
      }
    };
  }

  const matchDetails: WinningAnalysis['matchDetails'] = [];
  const missedOpportunities: WinningAnalysis['missedOpportunities'] = [];

  // Analyze each unsuccessful combination against all extractions
  relevantCombinations.forEach(combo => {
    let bestMatch = 0;
    let bestMatchDetails: any = null;

    extractions.forEach(extraction => {
      // Get the relevant winning numbers based on game type and wheel
      let winningNumbers: number[];
      
      if (gameType === 'lotto' && extraction.wheels && wheel) {
        winningNumbers = extraction.wheels[wheel] || [];
      } else {
        winningNumbers = extraction.numbers;
      }

      if (winningNumbers.length === 0) return;

      const matches = calculateMatches(combo.numbers, winningNumbers);
      const matchCount = matches.length;

      if (matchCount > 0) {
        matchDetails.push({
          extractionDate: extraction.date,
          matchedNumbers: matches,
          matchCount,
          wheel: gameType === 'lotto' ? wheel : undefined
        });
      }

      // Track the best match for missed opportunities analysis
      if (matchCount > bestMatch) {
        bestMatch = matchCount;
        bestMatchDetails = {
          extractionDate: extraction.date,
          winningNumbers,
          yourNumbers: combo.numbers,
          nearMisses: matchCount,
          wheel: gameType === 'lotto' ? wheel : undefined
        };
      }

      // Consider it a "near miss" if you matched 3+ numbers but didn't win
      if (matchCount >= 3) {
        missedOpportunities.push({
          extractionDate: extraction.date,
          winningNumbers,
          yourNumbers: combo.numbers,
          nearMisses: matchCount,
          wheel: gameType === 'lotto' ? wheel : undefined
        });
      }
    });
  });

  // Calculate frequency analysis
  const yourFrequentNumbers = calculateNumberFrequency(relevantCombinations);
  
  // Calculate winning number frequencies
  const winningCombinations = extractions.map(extraction => {
    if (gameType === 'lotto' && extraction.wheels && wheel) {
      return { numbers: extraction.wheels[wheel] || [] };
    }
    return { numbers: extraction.numbers };
  }).filter(combo => combo.numbers.length > 0);
  
  const winningFrequentNumbers = calculateNumberFrequency(winningCombinations);

  // Calculate overlap analysis - how efficient are your frequent numbers
  const overlapAnalysis = yourFrequentNumbers.slice(0, 20).map(yourNum => {
    const winningNum = winningFrequentNumbers.find(w => w.number === yourNum.number);
    const winningFrequency = winningNum ? winningNum.percentage : 0;
    
    // Efficiency: how often your frequent numbers actually appear in winning combinations
    const efficiency = winningFrequency > 0 ? (winningFrequency / yourNum.percentage) * 100 : 0;
    
    return {
      number: yourNum.number,
      yourFrequency: yourNum.percentage,
      winningFrequency,
      efficiency
    };
  }).sort((a, b) => b.efficiency - a.efficiency);

  return {
    totalMatches: matchDetails.reduce((sum, match) => sum + match.matchCount, 0),
    matchDetails: matchDetails.sort((a, b) => b.matchCount - a.matchCount),
    missedOpportunities: missedOpportunities
      .sort((a, b) => b.nearMisses - a.nearMisses)
      .slice(0, 10), // Top 10 near misses
    frequencyAnalysis: {
      yourFrequentNumbers: yourFrequentNumbers.slice(0, 15),
      winningFrequentNumbers: winningFrequentNumbers.slice(0, 15),
      overlapAnalysis: overlapAnalysis.slice(0, 10)
    }
  };
};

// Get insights and recommendations based on the analysis
export const getAnalysisInsights = (analysis: WinningAnalysis): string[] => {
  const insights: string[] = [];

  if (analysis.totalMatches === 0) {
    insights.push("❌ Nessuna delle tue combinazioni ha mai centrato numeri vincenti. Considera di variare la strategia di selezione.");
  } else {
    insights.push(`✅ Le tue combinazioni hanno totalizzato ${analysis.totalMatches} numeri indovinati in ${analysis.matchDetails.length} occasioni diverse.`);
  }

  if (analysis.missedOpportunities.length > 0) {
    const bestNearMiss = analysis.missedOpportunities[0];
    insights.push(`🎯 La tua migliore "quasi-vincita" è stata di ${bestNearMiss.nearMisses} numeri il ${new Date(bestNearMiss.extractionDate).toLocaleDateString('it-IT')}.`);
  }

  // Analyze efficiency of frequent numbers
  const efficientNumbers = analysis.frequencyAnalysis.overlapAnalysis.filter(item => item.efficiency > 80);
  const inefficientNumbers = analysis.frequencyAnalysis.overlapAnalysis.filter(item => item.efficiency < 20);

  if (efficientNumbers.length > 0) {
    insights.push(`💡 I tuoi numeri più "efficienti" sono: ${efficientNumbers.map(n => n.number).join(', ')} - appaiono spesso sia nelle tue giocate che nelle vincite.`);
  }

  if (inefficientNumbers.length > 0) {
    insights.push(`⚠️ Numeri che usi spesso ma vincono raramente: ${inefficientNumbers.map(n => n.number).join(', ')} - considera di ridurne l'uso.`);
  }

  // Pattern analysis
  if (analysis.frequencyAnalysis.yourFrequentNumbers.length > 0) {
    const topYourNumbers = analysis.frequencyAnalysis.yourFrequentNumbers.slice(0, 5);
    const topWinningNumbers = analysis.frequencyAnalysis.winningFrequentNumbers.slice(0, 5);
    
    const commonNumbers = topYourNumbers.filter(yourNum => 
      topWinningNumbers.some(winNum => winNum.number === yourNum.number)
    );

    if (commonNumbers.length > 0) {
      insights.push(`🎲 Numeri che usi spesso e che vincono spesso: ${commonNumbers.map(n => n.number).join(', ')} - continua a includerli!`);
    } else {
      insights.push(`🔄 I tuoi numeri preferiti non coincidono con quelli che vincono più spesso. Prova a bilanciare le tue scelte.`);
    }
  }

  return insights;
};