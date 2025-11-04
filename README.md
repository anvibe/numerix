# Numerix - Generatore Intelligente di Numeri per Lotterie

Un'applicazione web avanzata per la generazione intelligente di numeri per lotterie italiane, con supporto per AI locale e OpenAI.

## Caratteristiche

- 🎲 **Generazione Intelligente**: Algoritmi avanzati per la selezione dei numeri
- 🤖 **AI Locale**: Sistema di apprendimento basato su feedback e statistiche
- ✨ **AI Avanzata (OpenAI)**: Integrazione opzionale con GPT-4 per raccomandazioni sofisticate
- 📊 **Analisi Statistica**: Analisi approfondita di frequenze, ritardi e pattern
- 📈 **Feedback Learning**: L'AI impara dalle combinazioni non vincenti
- 🎯 **Analisi Vincite**: Confronto tra le tue giocate e i numeri vincenti
- 💾 **Gestione Dati**: Import/export CSV, salvataggio combinazioni
- 🌙 **Tema Scuro**: Interfaccia moderna con supporto tema chiaro/scuro

## Giochi Supportati

- **SuperEnalotto**: 6 numeri + Jolly + SuperStar
- **Lotto**: 5 numeri per ogni ruota
- **10eLotto**: Seleziona 10 numeri da 1 a 90
- **MillionDAY**: Seleziona 5 numeri da 1 a 55

## Configurazione OpenAI (Opzionale)

Per utilizzare l'AI avanzata con OpenAI:

1. Ottieni una chiave API da [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crea un file `.env` nella root del progetto:
   ```
   VITE_OPENAI_API_KEY=your_api_key_here
   ```
3. Riavvia l'applicazione

**Nota**: L'integrazione OpenAI è completamente opzionale. L'app funziona perfettamente con l'AI locale gratuita.

### Costi OpenAI

- Circa $0.01-0.03 per generazione
- Dipende dal modello utilizzato (GPT-4 vs GPT-3.5-turbo)
- Pagamento solo per l'uso effettivo

### Sicurezza

⚠️ **Importante**: In produzione, non esporre mai le chiavi API nel frontend. Usa sempre un proxy backend per le chiamate API.

## Installazione e Avvio

```bash
# Installa le dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev

# Build per produzione
npm run build
```

## Deployment su Vercel

L'applicazione è pronta per essere deployata su Vercel. Vedi [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) per istruzioni dettagliate.

### Quick Start

1. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

2. **Deploy via Vercel Dashboard**:
   - Vai su https://vercel.com
   - Import your Git repository
   - Vercel auto-detecterà le impostazioni
   - Set environment variables
   - Deploy!

3. **Environment Variables** (Richiesti):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY` (opzionale)

Vedi `DEPLOY_VERCEL.md` per dettagli completi.

## Tecnologie Utilizzate

- **React 18** con TypeScript
- **Tailwind CSS** per lo styling
- **Lucide React** per le icone
- **OpenAI API** per l'AI avanzata (opzionale)
- **Vite** come build tool
- **Chart.js** per i grafici
- **jsPDF** per l'export PDF

## Funzionalità AI

### AI Locale (Gratuita)
- Analisi statistica dei dati storici
- Apprendimento da combinazioni non vincenti
- Evitamento di pattern sfortunati
- Bilanciamento tra numeri frequenti e ritardatari

### AI Avanzata (OpenAI)
- Analisi più sofisticata con GPT-4
- Comprensione del linguaggio naturale
- Pattern recognition avanzato
- Raccomandazioni con livello di confidenza
- Spiegazioni dettagliate delle scelte

## Disclaimer

⚠️ Questo strumento fornisce solo suggerimenti basati su dati statistici. Non garantisce vincite. Giocare può causare dipendenza patologica. Gioca responsabilmente.

## Licenza

Questo progetto è stato creato a scopo dimostrativo. Non è affiliato a Sisal, Lottomatica o altri operatori di gioco.