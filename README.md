# Passaparola SPA

Frontend TypeScript/Vite per il gioco di referral collegato al questionario Google Form.

Il repository viene pubblicato automaticamente su GitHub Pages dal workflow
`.github/workflows/deploy-pages.yml` a ogni push su `main`.

## Contratto backend

La SPA chiama un Web App Apps Script tramite queste operazioni:

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

Il valore di `VITE_API_URL` deve essere un endpoint raggiungibile dal browser e con CORS configurato. Il Web App Apps Script resta il backend autorizzato a leggere e scrivere il Google Sheet. Non inserire credenziali Google nella SPA.

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
