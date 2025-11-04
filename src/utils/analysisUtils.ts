import { Frequency } from '../types';

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
