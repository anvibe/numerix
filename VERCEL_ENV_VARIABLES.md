# Variabili d'Ambiente Vercel - Guida Completa

## Variabili OBBLIGATORIE

Devi configurare queste variabili in **Vercel Dashboard → Il tuo progetto → Settings → Environment Variables**:

### 1. Supabase URL
- **Nome**: `VITE_SUPABASE_URL` (oppure `SUPABASE_URL`)
- **Valore**: La URL del tuo progetto Supabase
- **Dove trovarla**: Supabase Dashboard → Settings → API → Project URL
- **Esempio**: `https://xxxxx.supabase.co`

### 2. Supabase Anon Key
- **Nome**: `VITE_SUPABASE_ANON_KEY` (oppure `SUPABASE_ANON_KEY`)
- **Valore**: La chiave anon/public del tuo progetto Supabase
- **Dove trovarla**: Supabase Dashboard → Settings → API → anon/public key
- **Esempio**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Variabili RACCOMANDATE (per operazioni server-side)

### 3. Supabase Service Role Key (Raccomandato)
- **Nome**: `SUPABASE_SERVICE_ROLE_KEY`
- **Valore**: La chiave service_role del tuo progetto Supabase
- **Dove trovarla**: Supabase Dashboard → Settings → API → service_role key
- **⚠️ IMPORTANTE**: Questa chiave bypassa RLS (Row Level Security) - usala SOLO per operazioni server-side
- **⚠️ NON esporla mai al client/frontend**
- **Esempio**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Variabili Opzionali

### 4. OpenAI API Key (solo se usi AI avanzata)
- **Nome**: `VITE_OPENAI_API_KEY`
- **Valore**: La tua API key di OpenAI
- **Dove trovarla**: https://platform.openai.com/api-keys

### 5. Anthropic API Key (opzionale, alternativa a OpenAI)
- **Nome**: `VITE_ANTHROPIC_API_KEY`
- **Valore**: La tua API key di Anthropic (Claude)
- **Dove trovarla**: https://console.anthropic.com/settings/keys
- **Nota**: Usa l’interruttore “OpenAI | Anthropic” nella barra in alto per scegliere quale provider usare.

### 6. ScraperAPI Key (per scraping automatico - RACCOMANDATO se hai problemi con 403)
- **Nome**: `SCRAPER_API_KEY`
- **Valore**: La tua API key di ScraperAPI
- **Dove trovarla**: https://www.scraperapi.com/ (registrazione gratuita, 1000 richieste/mese)
- **⚠️ IMPORTANTE**: Questa chiave bypassa protezioni anti-bot come Cloudflare
- **⚠️ NON deve iniziare con `VITE_`** (è solo server-side)
- **Perché è necessaria**: Il sito `lottologia.com` ha protezioni anti-bot avanzate che bloccano le richieste dirette. ScraperAPI gestisce automaticamente queste protezioni.
- **Piano gratuito**: 1000 richieste/mese (sufficiente per ~33 sincronizzazioni giornaliere)

## Come Configurare in Vercel

1. Vai su **Vercel Dashboard** → Seleziona il tuo progetto **numerix**
2. Vai su **Settings** → **Environment Variables**
3. Clicca **Add New**
4. Per ogni variabile:
   - Inserisci il **Name** (es. `VITE_SUPABASE_URL`)
   - Inserisci il **Value** (il valore effettivo)
   - Seleziona gli **Environments** dove applicarla:
     - ✅ **Production** (obbligatorio)
     - ✅ **Preview** (consigliato)
     - ✅ **Development** (opzionale)
5. Clicca **Save**
6. **⚠️ IMPORTANTE**: Dopo aver aggiunto/modificato variabili, devi **Redeploy** il progetto!

## Verifica Configurazione

Dopo aver configurato le variabili:

1. Vai su **Deployments** → Seleziona l'ultimo deployment
2. Clicca sui **...** → **Redeploy**
3. Oppure fai un nuovo commit e push per triggerare un nuovo deploy

## Troubleshooting

### Errore: "VITE_SUPABASE_URL is not configured"
- ✅ Verifica che la variabile sia configurata in Vercel
- ✅ Verifica che sia selezionata per **Production**
- ✅ Fai un **Redeploy** dopo aver aggiunto la variabile

### Errore: "Database permission error" o "RLS"
- ✅ Aggiungi `SUPABASE_SERVICE_ROLE_KEY` in Vercel
- ✅ Verifica che la chiave service_role sia corretta
- ✅ Fai un **Redeploy**

### Le variabili funzionano in locale ma non su Vercel
- ✅ Verifica che le variabili siano configurate per **Production**
- ✅ Verifica che i nomi delle variabili siano esatti (case-sensitive)
- ✅ Fai un **Redeploy** dopo ogni modifica

### Errore: "Lottologia request failed: 403" durante lo scraping
- ✅ **Soluzione**: Aggiungi `SCRAPER_API_KEY` in Vercel Environment Variables
- ✅ Ottieni una chiave gratuita su https://www.scraperapi.com/
- ✅ Il piano gratuito include 1000 richieste/mese (sufficiente per ~33 sincronizzazioni giornaliere)
- ✅ ScraperAPI gestisce automaticamente le protezioni anti-bot come Cloudflare
- ✅ Fai un **Redeploy** dopo aver aggiunto la chiave

## Checklist Pre-Deploy

Prima di fare deploy, assicurati di avere:

- [ ] `VITE_SUPABASE_URL` configurata
- [ ] `VITE_SUPABASE_ANON_KEY` configurata
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurata (raccomandato)
- [ ] `SCRAPER_API_KEY` configurata (opzionale ma raccomandato se usi lo scraping automatico)
- [ ] Tutte le variabili selezionate per **Production**
- [ ] Fatto **Redeploy** dopo aver aggiunto le variabili

## Note Importanti

- ⚠️ Le variabili che iniziano con `VITE_` sono esposte al frontend
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` NON deve iniziare con `VITE_` (è solo server-side)
- ⚠️ Non committare mai le chiavi nel codice (sono già in `.gitignore`)
- ⚠️ Ogni modifica alle variabili richiede un nuovo deploy per essere applicata

