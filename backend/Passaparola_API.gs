/**
 * API HTTP per la SPA TypeScript.
 * Questo file va inserito nello stesso progetto Apps Script dei file V6 e Passaparola_Core.
 * Il Google Sheet resta privato: il browser non riceve mai credenziali Google.
 */

function spaApiResponse_(payload, callback) {
  const safeCallback = callback && /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(callback) ? callback : '';
  const body = JSON.stringify(payload);
  if (safeCallback) return ContentService.createTextOutput(safeCallback + '(' + body + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function spaApiHandle_(input) {
  try {
    const action = String(input.action || input.api || 'health').toLowerCase();
    if (action === 'health') return {ok: true, service: 'passaparola-api', active: ppActive_(), time: new Date().toISOString()};
    if (action === 'board') return ppStatus('');
    if (action === 'status') return ppStatus(String(input.key || ''));
    if (action === 'join') return ppJoin(String(input.key || ''), String(input.referral || ''));
    throw new Error('Azione API non riconosciuta.');
  } catch (error) {
    return {ok: false, error: error && error.message ? String(error.message) : 'Errore API non specificato.'};
  }
}

/** Funzione chiamata dall'iframe Apps Script dopo aver verificato l'origine del sito. */
function apiBridgeRequest(input) {
  return spaApiHandle_(input && typeof input === 'object' ? input : {});
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (String(params.bridge || '') === '1') {
    return HtmlService.createHtmlOutputFromFile('Passaparola_Bridge')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('referrer', 'no-referrer');
  }
  return spaApiResponse_(spaApiHandle_(params), params.callback || '');
}

function doPost(e) {
  let input = {};
  try {
    const raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
    input = raw ? JSON.parse(raw) : (e && e.parameter ? e.parameter : {});
  } catch (error) {
    return spaApiResponse_({ok: false, error: 'Corpo della richiesta non valido.'});
  }
  return spaApiResponse_(spaApiHandle_(input));
}
