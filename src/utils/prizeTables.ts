import type { GameType } from '../types';

export interface PrizeInfo {
  category: string;
  /** Indicative amount or range (e.g. "~25€" or "25€ - 500€"). Prizes vary by draw. */
  indicativeAmount: string;
}

/**
 * Lotto prize table for giocata di 5 numeri (official payoff table).
 * Source: tabella vincite ufficiale (estratto, ambo, terno, quaterna, cinquina).
 */
const LOTTO_PRIZES: Record<number, PrizeInfo> = {
  1: { category: 'Estratto', indicativeAmount: '2,25 €' },
  2: { category: 'Ambo', indicativeAmount: '25,00 €' },
  3: { category: 'Terno', indicativeAmount: '450,00 €' },
  4: { category: 'Quaterna', indicativeAmount: '24.000,00 €' },
  5: { category: 'Cinquina', indicativeAmount: 'Premio massimo (variabile)' },
};

const SUPERENALOTTO_PRIZES: Record<number, PrizeInfo> = {
  2: { category: '2 numeri', indicativeAmount: 'Rimborso (~5€)' },
  3: { category: '3 numeri', indicativeAmount: '~25€' },
  4: { category: '4 numeri', indicativeAmount: '~250€' },
  5: { category: '5 numeri', indicativeAmount: '~25.000€ - 50.000€' },
  6: { category: '6 numeri', indicativeAmount: 'Jackpot' },
};

const TENELOTTO_PRIZES: Record<number, PrizeInfo> = {
  6: { category: '6 numeri', indicativeAmount: 'Rimborso' },
  7: { category: '7 numeri', indicativeAmount: '~10€ - 50€' },
  8: { category: '8 numeri', indicativeAmount: '~100€ - 500€' },
  9: { category: '9 numeri', indicativeAmount: '~1.000€ - 10.000€' },
  10: { category: '10 numeri', indicativeAmount: 'Premio massimo' },
};

const MILLIONDAY_PRIZES: Record<number, PrizeInfo> = {
  2: { category: '2 numeri', indicativeAmount: 'Rimborso' },
  3: { category: '3 numeri', indicativeAmount: '~5€ - 25€' },
  4: { category: '4 numeri', indicativeAmount: '~50€ - 500€' },
  5: { category: '5 numeri', indicativeAmount: 'Premio massimo garantito' },
};

const PRIZE_TABLES: Record<GameType, Record<number, PrizeInfo>> = {
  lotto: LOTTO_PRIZES,
  superenalotto: SUPERENALOTTO_PRIZES,
  '10elotto': TENELOTTO_PRIZES,
  millionday: MILLIONDAY_PRIZES,
};

/**
 * Returns indicative prize info for a given game and match count, or null if no prize for that match level.
 */
export function getPrizeInfo(gameType: GameType, matchCount: number): PrizeInfo | null {
  const table = PRIZE_TABLES[gameType];
  if (!table || matchCount < 1) return null;
  return table[matchCount] ?? null;
}

export const PRIZE_DISCLAIMER =
  'I premi sono indicativi e variano per ogni estrazione in base al montepremi e al numero di vincitori.';
