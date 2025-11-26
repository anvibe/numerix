import { Game, LottoWheel } from '../types';
import { 
  Dices, 
  Ticket, 
  ClipboardList, 
  Calendar 
} from 'lucide-react';

export const LOTTO_WHEELS: LottoWheel[] = [
  'Bari', 'Cagliari', 'Firenze', 'Genova', 'Milano',
  'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Nazionale'
];

export const GAMES: Game[] = [
  {
    id: 'superenalotto',
    name: 'SuperEnalotto',
    description: 'Seleziona 6 numeri da 1 a 90',
    icon: 'Dices',
    color: 'border-primary',
    numbersToSelect: 6,
    maxNumber: 90,
    drawDays: ['Martedì', 'Giovedì', 'Sabato'],
  },
  {
    id: 'lotto',
    name: 'Lotto',
    description: 'Seleziona 5 numeri da 1 a 90',
    icon: 'Ticket',
    color: 'border-secondary',
    numbersToSelect: 5,
    maxNumber: 90,
    wheels: LOTTO_WHEELS,
    drawDays: ['Martedì', 'Giovedì', 'Sabato'],
  },
  {
    id: '10elotto',
    name: '10eLotto',
    description: 'Seleziona 10 numeri da 1 a 90',
    icon: 'ClipboardList',
    color: 'border-accent',
    numbersToSelect: 10,
    maxNumber: 90,
  },
  {
    id: 'millionday',
    name: 'MillionDAY',
    description: 'Seleziona 5 numeri da 1 a 55',
    icon: 'Calendar',
    color: 'border-warning',
    numbersToSelect: 5,
    maxNumber: 55,
  }
];

export const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'Dices':
      return Dices;
    case 'Ticket':
      return Ticket;
    case 'ClipboardList':
      return ClipboardList;
    case 'Calendar':
      return Calendar;
    default:
      return Dices;
  }
};

export const DISCLAIMER = "⚠️ Questo strumento fornisce suggerimenti basati su analisi statistica storica. Ogni combinazione ha la STESSA probabilità di vincita (SuperEnalotto: 1 su 622.614.630). Non è possibile \"battere\" una lotteria equa. Giocare può causare dipendenza patologica. Gioca responsabilmente.";