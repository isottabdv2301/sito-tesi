# Passaparola: pacchetto SPA + Google Form + Google Sheets

## File Apps Script

Nel progetto Apps Script esistente devono rimanere tre file `.gs`:

1. `Questionario_V6_Core.gs`
2. `Passaparola_Core.gs`
3. `Passaparola_API.gs`

Non lasciare nel progetto una seconda copia completa del vecchio script. Tutti i file `.gs` condividono lo stesso spazio globale: due dichiarazioni di `CONFIG`, `PP` o `doGet` causano errori.

Nel file `Passaparola_Core.gs` impostare:

```javascript
SPA_URL: 'https://TUO-UTENTE.github.io/TUO-REPOSITORY/',
GAME_SHEET_ID: 'ID_DEL_GOOGLE_SHEET_CREATO'
```

`API_URL` deve restare l’URL `/exec` della Web App Apps Script.

## Configurazione del foglio

Il Google Sheet contiene già le schede:

- `PP_Partecipanti`
- `PP_Invii`
- `PP_Classifica`
- `PP_Istruzioni`

Il foglio deve restare privato. La classifica pubblica viene restituita dall’API solo come codice pubblico e punteggio.

## Attivazione Apps Script

1. Salvare i tre file `.gs` nello stesso progetto del questionario V6.
2. Verificare che esista una sola `CONFIG` e una sola funzione `doGet`.
3. Aggiornare `SPA_URL` e `GAME_SHEET_ID`.
4. Eseguire `attivaPassaparola()` dall’editor con l’account proprietario.
5. Autorizzare il progetto.
6. Eseguire `diagnosticaPassaparola()`.
7. Aggiornare la distribuzione esistente con una nuova versione.

Il modulo aggiunge il campo tecnico e genera i link precompilati tramite `FormApp`. Non servono gli `entryId` del Form.

## SPA TypeScript

Nella root del repository SPA:

```bash
npm install
```

Creare `.env.local` partendo da `.env.example`. Se si usa il proxy edge, `VITE_API_URL` deve essere l’URL del proxy, non l’URL diretto Apps Script.

```bash
npm run build
```

Pubblicare la cartella `dist` su GitHub Pages. Il link ottenuto deve essere inserito in `SPA_URL`.

## Proxy CORS

GitHub Pages è un hosting statico. Se il browser blocca le richieste dirette al Web App Apps Script, usare `passaparola-spa/proxy/worker.ts` come proxy CORS. Configurare nel proxy:

```text
APPS_SCRIPT_URL=https://script.google.com/macros/s/ID_DEPLOYMENT/exec
```

Il proxy non deve contenere credenziali Google. Inoltra soltanto le richieste alla Web App.

## Flusso finale

```text
GitHub Pages SPA
        ↓
Proxy CORS opzionale
        ↓
Apps Script API
        ↓
Google Sheet privato

SPA → link precompilato → Google Form → trigger Apps Script → PP_Invii → PP_Classifica
```
