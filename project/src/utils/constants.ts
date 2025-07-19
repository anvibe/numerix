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

export const DISCLAIMER = "⚠️ Questo strumento fornisce solo suggerimenti basati su dati statistici. Non garantisce vincite. Giocare può causare dipendenza patologica. Gioca responsabilmente.";