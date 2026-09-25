# Passaparola SPA

Frontend TypeScript/Vite per il gioco di referral collegato al questionario Google Form.

Il repository viene pubblicato automaticamente su GitHub Pages dal workflow
`.github/workflows/deploy-pages.yml` a ogni push su `main`.

## Contratto backend

La SPA comunica con la Web App Apps Script tramite un iframe nascosto e `google.script.run`. Questo evita che il browser blocchi la risposta per CORS, come accade con `fetch` diretto da GitHub Pages. L'iframe accetta messaggi solo dall'origine pubblica del sito.

Il backend espone queste operazioni:

- `GET ?api=board` per la classifica pubblica;
- `POST {"action":"join","key":"...","referral":"..."}` per creare l'accesso;
- `POST {"action":"status","key":"..."}` per leggere lo stato personale.

Il backend Apps Script deve restituire la stessa struttura usata dal codice V6:

```json
{
  "board": [{"rank": 1, "id": "ABCDEF123456", "points": 2}],
  "total": 1,
  "updated": "2026-09-25T00:00:00.000Z",
  "player": null
}
```

## Configurazione locale

Creare `.env.local` partendo da `.env.example` e impostare `VITE_API_URL`.

```bash
npm install
npm run dev
npm run build
```

`VITE_API_URL` è l'URL `/exec` della Web App Apps Script. La SPA lo apre come iframe e il foglio resta privato; non inserire credenziali Google nella SPA.

Nel progetto Apps Script devono essere presenti anche `Passaparola_API.gs` e `Passaparola_Bridge.html`. Il bridge viene servito da `doGet?bridge=1` e inoltra le richieste con `google.script.run`.

## Pubblicazione GitHub Pages

Il workflow esegue `npm install`, `npm run build` e pubblica `dist` tramite GitHub Pages.
Per un test locale:

```bash
npm install
npm run dev
```

Dopo il primo deployment, inserire l'URL pubblico nella configurazione Apps Script
tramite `configuraPassaparolaSpa(url)`.

Gli `entryId` del Form non sono necessari: il backend genera i link precompilati con `FormApp` usando gli item reali del modulo.
