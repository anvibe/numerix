# Extraction Scraping System

## Overview

Il sistema di scraping automatico delle estrazioni consente di aggiornare automaticamente i dati delle lotterie italiane direttamente dal web.

## Architettura

### API Routes (Vercel Serverless Functions)

- **`/api/scrape/superenalotto.ts`**: Scraper per SuperEnalotto da lottologia.com
- **`/api/sync/sync-all.ts`**: Endpoint principale per sincronizzare tutte le estrazioni

### Frontend

- **`src/utils/apiService.ts`**: Servizio API per chiamare gli endpoint di scraping
- **`src/components/history/ExtractionHistory.tsx`**: UI con bottone "Aggiorna Estrazioni"

## Funzionalità

### 1. Scraping Automatico (Cron Job)

Configurato in `vercel.json`:
- **Schedule**: Ogni giorno alle 21:00 (dopo l'estrazione)
- **Endpoint**: `/api/sync/sync-all?gameType=superenalotto`
- **Cron Expression**: `0 21 * * *` (ogni giorno alle 21:00 UTC)

### 2. Scraping Manuale

Gli utenti possono cliccare il bottone "Aggiorna Estrazioni" nella sezione "Cronologia Estrazioni" per sincronizzare manualmente.

### 3. Prevenzione Duplicati

Il sistema controlla automaticamente le estrazioni esistenti in Supabase e inserisce solo quelle nuove.

## Giochi Supportati

### ✅ SuperEnalotto
- **Fonte**: lottologia.com
- **Frequenza Estrazioni**: Martedì, Giovedì, Sabato alle 20:30
- **Dati**: 6 numeri + Jolly + SuperStar

### ⏳ In Sviluppo
- **Lotto**: Estrazione giornaliera
- **10eLotto**: Estrazione giornaliera  
- **MillionDAY**: Estrazione giornaliera

## Configurazione

### Variabili d'Ambiente

Assicurati di avere queste variabili configurate in Vercel:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Le API routes possono accedere anche a:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Dipendenze

- `cheerio`: Parsing HTML
- `@supabase/supabase-js`: Client Supabase
- `@vercel/node`: Types per Vercel serverless functions

## Uso

### Sincronizzazione Manuale

```typescript
import { ExtractionSyncService } from './utils/apiService';

// Sincronizza SuperEnalotto
const result = await ExtractionSyncService.syncSuperEnalotto();

// Sincronizza tutti i giochi
const result = await ExtractionSyncService.syncAllGames();
```

### Risposta API

```json
{
  "success": true,
  "message": "Successfully scraped and inserted X new extractions",
  "total": 100,
  "new": 5
}
```

## Sviluppo Futuro

### Miglioramenti Pianificati

1. **Scraping Multi-Fonte**: Fallback su più fonti (ADM, lottologia.com, etc.)
2. **Scraping Lotto**: Implementare scraper per tutte le ruote del Lotto
3. **Notifiche**: Notificare quando nuove estrazioni vengono aggiunte
4. **Rate Limiting**: Implementare rate limiting più sofisticato
5. **Error Handling**: Migliorare gestione errori e retry logic

### Note Legali

⚠️ **Importante**: 
- Rispettare sempre i `robots.txt` dei siti web
- Implementare ritardi tra le richieste
- Usare User-Agent appropriati
- Verificare Terms of Service dei siti web

## Troubleshooting

### Lo scraping non funziona

1. Verifica le variabili d'ambiente in Vercel
2. Controlla i logs di Vercel Functions
3. Verifica che il sito web non abbia cambiato struttura HTML
4. Controlla se ci sono errori CORS o rate limiting

### Estrazioni duplicate

Il sistema previene automaticamente i duplicati controllando le date. Se vedi duplicati:
1. Verifica che le date siano nel formato corretto (YYYY-MM-DD)
2. Controlla i logs per vedere se ci sono errori di inserimento

### Cron job non si attiva

1. Verifica la configurazione in `vercel.json`
2. Controlla che il progetto sia su un piano Vercel che supporta cron jobs (Pro plan)
3. Verifica i logs di Vercel per errori del cron job

