const PP = Object.freeze({
  PREFIX: 'QRT_PP1_',
  API_URL: 'https://script.google.com/macros/s/AKfycbxb4mKFseUXTiV3Ms4LmcccD8RjfdrOj2BY1ZJlBuqlCmEvEEKhu6k0OHZqxUFKn2tg/exec',
  SPA_URL: 'https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY/',
  GAME_SHEET_ID: '1kCe_af99n8lk0PjbPeI-1qTlNlSZLxD1xoZrUHQ3_hE',
  TITLE: 'Passaparola · Ricerca Tesi',
  TOKEN_TITLE: 'Codice partecipante Passaparola (precompilato — non modificare)',
  TOKEN_MARKER: 'PP_TOKEN_AUTOMATICO',
  PEOPLE: 'PP_Partecipanti',
  EVENTS: 'PP_Invii',
  BOARD: 'PP_Classifica',
  GUIDE: 'PP_Istruzioni',
  MAX_PEOPLE: 10000,
  MAX_REGISTRATIONS_PER_MINUTE: 60,
  PEOPLE_HEADERS: ['codice_pubblico', 'impronta_chiave_privata', 'invitato_da', 'percorso', 'token_modulo', 'creato_utc'],
  EVENT_HEADERS: ['id_risposta', 'inviato_utc', 'codice_pubblico', 'invitato_da', 'percorso', 'esito'],
  BOARD_HEADERS: ['posizione', 'codice_pubblico', 'compilazioni_da_inviti']
});

function ppProp_(name) { return PP.PREFIX + name; }
function ppProps_() { return PropertiesService.getScriptProperties(); }
function ppActive_() { return ppProps_().getProperty(ppProp_('ACTIVE')) === 'TRUE'; }

function ppSpaUrl_() {
  const configured = String(ppProps_().getProperty(ppProp_('SPA_URL')) || PP.SPA_URL || '').trim();
  if (!/^https:\/\/[^/\s]+(?:\/[^?\s]*)?\/?$/.test(configured) || /YOUR_|REPLACE|PASTE_/i.test(configured)) {
    throw new Error('Configurare PP.SPA_URL con l’URL reale di GitHub Pages prima di attivare il gioco.');
  }
  return configured.replace(/\/+$/, '') + '/';
}

function configuraPassaparolaSpa(url) {
  ppAdmin_();
  const value = String(url || '').trim();
  if (!/^https:\/\/[^/\s]+(?:\/[^?\s]*)?\/?$/.test(value)) throw new Error('URL SPA non valido.');
  ppProps_().setProperty(ppProp_('SPA_URL'), value.replace(/\/+$/, '') + '/');
  return ppSpaUrl_();
}

/** Eseguire nell'editor con l'account proprietario, non dal sito pubblico. */
function ppAdmin_() {
  const active = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  const effective = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!active || active !== effective) throw new Error('Operazione riservata al proprietario del progetto, dall’editor Apps Script.');
}

/** ATTIVAZIONE: usa i file V6 già configurati; non ricrea il questionario. */
function attivaPassaparola() {
  ppAdmin_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = ppProps_();
    if (props.getProperty(CONFIG.PROP_SETUP) !== 'TRUE') {
      throw new Error('Questo progetto non contiene la configurazione V6 esistente. Incolla il codice nello STESSO progetto già pubblicato. Non eseguire setupQuestionarioUnico e non fare il reset.');
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(PP.API_URL)) throw new Error('URL Web App API non valido.');
    const spaUrl = ppSpaUrl_();
    const form = FormApp.openById(props.getProperty(CONFIG.PROP_FORM_ID));
    const dataset = SpreadsheetApp.openById(props.getProperty(CONFIG.PROP_SPREADSHEET_ID));
    if (form.getDestinationId() !== dataset.getId()) throw new Error('Il modulo non è collegato al dataset V6 previsto.');
    // Preflight prima di ogni modifica. Rilegge le domande reali, anche se sono state ritoccate.
    ppInspectForm_(form, props);
    let gameId = props.getProperty(ppProp_('SHEET_ID'));
    if (!gameId && PP.GAME_SHEET_ID && !/^PASTE_|^REPLACE_/i.test(PP.GAME_SHEET_ID)) {
      gameId = PP.GAME_SHEET_ID;
      props.setProperty(ppProp_('SHEET_ID'), gameId);
    }
    if (!gameId) {
      gameId = SpreadsheetApp.create('Passaparola - Classifica Ricerca Tesi').getId();
      props.setProperty(ppProp_('SHEET_ID'), gameId);
    }
    const game = SpreadsheetApp.openById(gameId);
    ppEnsureSheet_(game, PP.PEOPLE, PP.PEOPLE_HEADERS);
    ppEnsureSheet_(game, PP.EVENTS, PP.EVENT_HEADERS);
    ppEnsureSheet_(game, PP.BOARD, PP.BOARD_HEADERS);
    ppEnsureSheet_(game, PP.GUIDE, ['voce', 'valore']);
    if (!props.getProperty(ppProp_('SECRET'))) {
      props.setProperty(ppProp_('SECRET'), Utilities.getUuid() + Utilities.getUuid());
    }
    let tokenItem;
    const storedItemId = props.getProperty(ppProp_('TOKEN_ITEM'));
    if (storedItemId) {
      tokenItem = form.getItemById(Number(storedItemId)).asTextItem();
    } else {
      const candidates = form.getItems(FormApp.ItemType.TEXT).filter(function(item) { return item.getTitle() === PP.TOKEN_TITLE; });
      if (candidates.length > 1) throw new Error('Esistono più campi Passaparola: controllare il modulo prima di proseguire.');
      tokenItem = candidates.length ? candidates[0].asTextItem() : form.addTextItem();
      props.setProperty(ppProp_('TOKEN_ITEM'), String(tokenItem.getId()));
      tokenItem.setTitle(PP.TOKEN_TITLE).setRequired(false).setHelpText(
        'Questo codice collega l’invio al tuo profilo Passaparola e all’invito ricevuto. ' +
        'Non inserire nome o email. Nella classifica sono pubblici soltanto il codice del giocatore e il punteggio; le risposte non vengono pubblicate. ' +
        'Se partecipi al gioco, lascia il codice precompilato. Senza codice puoi inviare il questionario, ma l’invio non dà punti.'
      );
      // Prima dello screening, affinché anche le uscite anticipate siano riconoscibili.
      form.moveItem(tokenItem.getIndex(), 0);
    }
    if (tokenItem.getIndex() > 1) throw new Error('Il campo Passaparola deve rimanere prima dello screening iniziale.');
    const routing = form.getItemById(Number(props.getProperty(CONFIG.PROP_ROUTING_ITEM_ID))).asListItem();
    const templates = {};
    buildRoutes_().forEach(function(route) {
      const url = form.createResponse()
        .withItemResponse(routing.createResponse(route.routeLabel))
        .withItemResponse(tokenItem.createResponse(PP.TOKEN_MARKER)).toPrefilledUrl();
      if (url.indexOf(PP.TOKEN_MARKER) < 0) throw new Error('Precompilazione del codice non riuscita.');
      templates[route.routeLabel] = url;
    });
    props.setProperty(ppProp_('TEMPLATES'), JSON.stringify(templates));
    if (props.getProperty(ppProp_('OLD_CONFIRMATION')) === null) {
      props.setProperty(ppProp_('OLD_CONFIRMATION'), form.getConfirmationMessage());
    }
    form.setConfirmationMessage(
      props.getProperty(ppProp_('OLD_CONFIRMATION')) + '\n\n' +
      'Se partecipi a Passaparola, torna alla scheda del gioco per verificare l’invio e ottenere il tuo link personale. ' +
      'Puoi anche riaprire ' + spaUrl + ' nello stesso browser. ' +
      'L’invio viene verificato automaticamente: attendi qualche istante e premi «Verifica invio». ' +
      'Le uscite anticipate per i criteri di partecipazione o per mancato consenso non danno punti.'
    );
    // Salva una sola volta la situazione storica V6; le riattivazioni non azzerano nulla.
    if (!props.getProperty(ppProp_('BASE_COMPLETED'))) {
      const baseline = {};
      buildRoutes_().forEach(function(route) { baseline['COMPLETED_ROUTE_' + route.routeCode] = getCounter_(props, 'COMPLETED_ROUTE_' + route.routeCode); });
      EXPERIMENTAL_CONDITIONS.forEach(function(c) { baseline['COMPLETED_CONDITION_' + c.code] = getCounter_(props, 'COMPLETED_CONDITION_' + c.code); });
      props.setProperty(ppProp_('BASE_COMPLETED'), JSON.stringify(baseline));
      const start = new Date().toISOString();
      props.setProperty(ppProp_('STARTED'), start);
      props.setProperty(ppProp_('SYNC_CURSOR'), start);
    }
    // Crea prima il nuovo trigger, poi rimuove solo gli omonimi; non tocca altri trigger.
    ppEnsureTrigger_(form);
    if (!ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === 'ppRecoveryTrigger_'; })) {
      ScriptApp.newTrigger('ppRecoveryTrigger_').timeBased().everyMinutes(5).create();
    }
    props.setProperty(ppProp_('ACTIVE'), 'TRUE');
    ppWriteGuide_(game, form, dataset);
    ppRefreshViews_(game);
    console.log('PASSAPAROLA CONFIGURATO. Ora aggiorna la distribuzione ESISTENTE a una nuova versione.');
    console.log('LINK PUBBLICO SPA: ' + spaUrl);
    console.log('API BACKEND: ' + PP.API_URL);
    console.log('PANNELLO PRIVATO: ' + game.getUrl());
    console.log('MODULO ESISTENTE: ' + form.getEditUrl());
    return {link: spaUrl, api: PP.API_URL, pannello: game.getUrl()};
  } finally { lock.releaseLock(); }
}

function ppEnsureSheet_(book, name, headers) {
  let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  if (!sheet.getLastRow()) sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  else if (JSON.stringify(sheet.getRange(1, 1, 1, headers.length).getValues()[0]) !== JSON.stringify(headers)) {
    throw new Error('Intestazioni inattese nel foglio ' + name + '. Nessun dato è stato cancellato.');
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function ppEnsureTrigger_(form) {
  const old = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === CONFIG.COMPLETION_TRIGGER; });
  if (old.length === 1 && old[0].getTriggerSourceId() === form.getId()) return;
  ScriptApp.newTrigger(CONFIG.COMPLETION_TRIGGER).forForm(form).onFormSubmit().create();
  old.forEach(function(t) { ScriptApp.deleteTrigger(t); });
}

function ppNormalize_(text) { return String(text).normalize('NFKC').replace(/\s+/g, ' ').trim(); }

/** Legge soltanto la struttura del modulo. Nessun testo di domanda viene riscritto. */
function ppInspectForm_(form, props) {
  const items = form.getItems();
  const routingId = Number(props.getProperty(CONFIG.PROP_ROUTING_ITEM_ID));
  const routing = form.getItemById(routingId).asListItem();
  const routes = buildRoutes_();
  const choices = routing.getChoices();
  const labels = choices.map(function(c) { return c.getValue(); });
  if (labels.length !== 10 || routes.some(function(r) { return labels.indexOf(r.routeLabel) < 0; })) {
    throw new Error('Il campo di accesso non contiene esattamente i 10 percorsi del V6.');
  }
  const routePages = choices.map(function(c) { return c.getGotoPage(); });
  if (routePages.some(function(p) { return !p; }) || new Set(routePages.map(function(p) { return p.getId(); })).size !== 10) {
    throw new Error('Le destinazioni dei 10 percorsi non corrispondono al V6.');
  }
  const lastRoute = Math.max.apply(null, routePages.map(function(p) { return p.getIndex(); }));
  const common = items.find(function(item) { return item.getIndex() > lastRoute && String(item.getType()) === 'PAGE_BREAK'; });
  if (!common) throw new Error('Sezione delle valutazioni comuni non trovata.');
  const checks = [
    ['Hai almeno 18 anni?', 'Sì'],
    ['Vivi stabilmente in Italia o hai trascorso qui la maggior parte della tua vita?', 'Sì'],
    ['Acconsenti volontariamente a partecipare alla ricerca?', 'Sì, acconsento']
  ].map(function(pair) {
    const matches = items.filter(function(item) { return ppNormalize_(item.getTitle()) === ppNormalize_(pair[0]); });
    if (matches.length !== 1 || String(matches[0].getType()) !== 'MULTIPLE_CHOICE') throw new Error('Domanda di screening non riconosciuta: ' + pair[0]);
    const mc = matches[0].asMultipleChoiceItem();
    if (!mc.getChoices().some(function(c) { return c.getValue() === pair[1]; })) throw new Error('Risposta di ammissione modificata: ' + pair[0]);
    return {id: String(mc.getId()), yes: pair[1]};
  });
  const required = [];
  items.forEach(function(item) {
    const type = String(item.getType());
    const afterCommon = item.getIndex() > common.getIndex();
    if (['PAGE_BREAK', 'SECTION_HEADER', 'IMAGE', 'VIDEO'].indexOf(type) >= 0) {
      if (type === 'PAGE_BREAK' && afterCommon && ['CONTINUE', 'SUBMIT'].indexOf(String(item.asPageBreakItem().getPageNavigationType())) < 0) {
        throw new Error('Sono presenti diramazioni nelle valutazioni comuni: verificare la logica prima di attivare il gioco.');
      }
      return;
    }
    const converters = {TEXT: 'asTextItem', PARAGRAPH_TEXT: 'asParagraphTextItem', MULTIPLE_CHOICE: 'asMultipleChoiceItem', LIST: 'asListItem', CHECKBOX: 'asCheckboxItem', SCALE: 'asScaleItem', GRID: 'asGridItem', CHECKBOX_GRID: 'asCheckboxGridItem', DATE: 'asDateItem', DATETIME: 'asDateTimeItem', TIME: 'asTimeItem', DURATION: 'asDurationItem'};
    if (!converters[type]) throw new Error('Tipo domanda non previsto dal V6: ' + type);
    const q = item[converters[type]]();
    if (afterCommon && ['MULTIPLE_CHOICE', 'LIST'].indexOf(type) >= 0 && q.getChoices().some(function(c) {
      const navigation = c.getPageNavigationType();
      return navigation !== null && String(navigation) !== 'CONTINUE';
    })) throw new Error('Diramazione inattesa in una domanda delle valutazioni comuni.');
    // Le sezioni di stimolo V6 non contengono domande: fermarsi se la struttura cambia.
    if (item.getIndex() > routing.getIndex() && item.getIndex() < common.getIndex()) {
      throw new Error('È stata aggiunta una domanda nei percorsi sperimentali. Occorre adattare la verifica degli invii.');
    }
    if (afterCommon && q.isRequired()) {
      required.push({id: String(item.getId()), type: type, rows: type === 'GRID' || type === 'CHECKBOX_GRID' ? q.getRows().length : 0});
    }
  });
  if (required.length < 5) throw new Error('Troppo poche domande comuni obbligatorie: verifica bloccata per evitare punti non validi.');
  return {routingId: String(routingId), tokenId: props.getProperty(ppProp_('TOKEN_ITEM')) || '', checks: checks, required: required};
}

function ppNonempty_(value) {
  if (Array.isArray(value)) return value.length > 0 && value.every(ppNonempty_);
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/** Verifica solo ammissione e completezza. Opinioni e risposte ai controlli NON danno bonus. */
function ppValidateAnswers_(answers, schema) {
  for (let i = 0; i < schema.checks.length; i++) {
    const check = schema.checks[i];
    if (!ppNonempty_(answers[check.id])) return 'INCOMPLETO';
    if (String(answers[check.id]) !== check.yes) return 'ESCLUSO';
  }
  for (let i = 0; i < schema.required.length; i++) {
    const q = schema.required[i];
    const value = answers[q.id];
    if (!ppNonempty_(value)) return 'INCOMPLETO';
    if (q.rows && (!Array.isArray(value) || value.length !== q.rows)) return 'INCOMPLETO';
  }
  return 'COMPLETO';
}

function ppBook_() {
  const id = ppProps_().getProperty(ppProp_('SHEET_ID'));
  if (!id) throw new Error('Passaparola non è ancora configurato.');
  return SpreadsheetApp.openById(id);
}
function ppRows_(book, name, columns) {
  const s = book.getSheetByName(name);
  if (!s) throw new Error('Registro Passaparola mancante.');
  return s.getLastRow() < 2 ? [] : s.getRange(2, 1, s.getLastRow() - 1, columns).getValues();
}
function ppPeople_(book) {
  return ppRows_(book, PP.PEOPLE, PP.PEOPLE_HEADERS.length).map(function(r) {
    return {id: String(r[0]), keyHash: String(r[1]), inviter: String(r[2]), route: String(r[3]), token: String(r[4]), created: String(r[5])};
  });
}
function ppEvents_(book) {
  return ppRows_(book, PP.EVENTS, PP.EVENT_HEADERS.length).map(function(r) {
    return {id: String(r[0]), at: String(r[1]), person: String(r[2]), inviter: String(r[3]), route: String(r[4]), outcome: String(r[5])};
  });
}
function ppHex_(bytes) { return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function ppHash_(value) { return ppHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)); }
function ppHmac_(value) {
  const secret = ppProps_().getProperty(ppProp_('SECRET'));
  if (!secret) throw new Error('Configurazione Passaparola incompleta.');
  return ppHex_(Utilities.computeHmacSha256Signature(value, secret, Utilities.Charset.UTF_8));
}
function ppKey_(key) {
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw new Error('Codice di recupero non valido.');
  return key;
}
function ppId_(key) { return ppHmac_('public:' + key).slice(0, 12).toUpperCase(); }
function ppSame_(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
function ppGetPerson_(people, key) {
  const p = people.find(function(person) { return person.id === ppId_(key); });
  if (p && !ppSame_(p.keyHash, ppHash_(key))) throw new Error('Codice personale non riconosciuto.');
  return p;
}

/** Punteggi ricostruiti dal registro, con deduplicazione difensiva. */
function ppSummary_(people, events) {
  const byId = {};
  const completed = {};
  const latest = {};
  const seen = {};
  people.forEach(function(p) { byId[p.id] = p; });
  events.forEach(function(e) {
    if (seen[e.id]) return;
    seen[e.id] = true;
    const p = byId[e.person];
    if (!p || p.route !== e.route || p.inviter !== e.inviter) return;
    if (e.outcome === 'COMPLETO' && !completed[p.id]) completed[p.id] = e;
    if (e.outcome !== 'DUPLICATO' && e.outcome !== 'DUPLICATO_ESCLUSO') latest[p.id] = e.outcome;
  });
  const scores = {};
  Object.keys(completed).forEach(function(id) { scores[id] = 0; });
  Object.keys(completed).forEach(function(id) {
    const inviter = byId[id].inviter;
    if (inviter && inviter !== id && completed[inviter]) scores[inviter]++;
  });
  const board = Object.keys(completed).map(function(id) { return {id: id, points: scores[id]}; })
    .sort(function(a, b) { return b.points - a.points || a.id.localeCompare(b.id); });
  let rank = 0;
  board.forEach(function(row, i) { if (!i || row.points !== board[i - 1].points) rank = i + 1; row.rank = rank; });
  return {completed: completed, latest: latest, board: board};
}

function ppPublic_(summary) {
  return {board: summary.board.slice(0, 100), total: summary.board.length, updated: new Date().toISOString()};
}
function ppState_(person, summary) {
  const state = ppPublic_(summary);
  if (!person) { state.player = null; return state; }
  const done = !!summary.completed[person.id];
  const row = summary.board.find(function(r) { return r.id === person.id; });
  const last = summary.latest[person.id] || '';
  const status = done ? 'COMPLETE' : last === 'ESCLUSO' ? 'EXCLUDED' : last ? 'REVIEW' : 'WAITING';
  const templates = JSON.parse(ppProps_().getProperty(ppProp_('TEMPLATES')) || '{}');
  const template = templates[person.route];
  if (!template) throw new Error('Collegamento al questionario da aggiornare.');
  state.player = {
    id: person.id, status: status, points: row ? row.points : 0, rank: row ? row.rank : null,
    formUrl: status === 'WAITING' ? template.replace(PP.TOKEN_MARKER, person.token) : '',
    referralUrl: done ? ppSpaUrl_() + '?ref=' + person.id : '',
    reason: last
  };
  return state;
}

/** API pubblica: crea una partecipazione solo su azione esplicita, non aprendo un link. */
function ppJoin(key, referral) {
  ppKey_(key);
  if (!ppActive_()) throw new Error('Il gioco non è ancora attivo.');
  if (typeof referral !== 'string' || (referral && !/^[A-F0-9]{12}$/.test(referral))) throw new Error('Link di invito non valido.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const book = ppBook_();
    const people = ppPeople_(book);
    const events = ppEvents_(book);
    const summary = ppSummary_(people, events);
    let person = ppGetPerson_(people, key);
    if (person) return ppState_(person, summary); // retry, doppio clic e visite successive: stesso percorso.
    if (referral && (!summary.completed[referral] || referral === ppId_(key))) throw new Error('L’invito non è attivo. Chiedi alla persona che ti ha invitato di copiare il link dal proprio pannello.');
    if (people.length >= PP.MAX_PEOPLE) throw new Error('Le nuove partecipazioni sono temporaneamente sospese.');
    const props = ppProps_();
    const minute = String(Math.floor(Date.now() / 60000));
    const rate = JSON.parse(props.getProperty(ppProp_('RATE')) || '{}');
    const count = rate.minute === minute ? Number(rate.count || 0) : 0;
    if (count >= PP.MAX_REGISTRATIONS_PER_MINUTE) throw new Error('Ci sono molti accessi in questo momento. Riprova tra un minuto.');
    props.setProperty(ppProp_('RATE'), JSON.stringify({minute: minute, count: count + 1}));
    const route = assignRouteUnlocked_(); // lock già acquisito; mantiene il bilanciamento V6.
    person = {id: ppId_(key), keyHash: ppHash_(key), inviter: referral, route: route.routeLabel, token: ppHmac_('form:' + key).slice(0, 40), created: new Date().toISOString()};
    book.getSheetByName(PP.PEOPLE).appendRow([person.id, person.keyHash, person.inviter, person.route, person.token, person.created]);
    return ppState_(person, summary);
  } finally { lock.releaseLock(); }
}

/** API pubblica di sola lettura. La chiave privata non è mai restituita dal server. */
function ppStatus(key) {
  if (!ppActive_()) throw new Error('Il gioco non è ancora attivo.');
  const book = ppBook_();
  const people = ppPeople_(book);
  let person = null;
  if (key) person = ppGetPerson_(people, ppKey_(key));
  return ppState_(person, ppSummary_(people, ppEvents_(book)));
}

function onQuestionarioSubmit(e) {
  // Un client web non può creare un oggetto FormResponse con questi metodi.
  if (!e || !e.response || typeof e.response.getId !== 'function' || !e.source || typeof e.source.getId !== 'function') {
    throw new Error('Questa funzione deve essere eseguita dal trigger del modulo.');
  }
  if (!ppActive_()) return onQuestionarioSubmitV6_(e);
  if (e.source.getId() !== ppProps_().getProperty(CONFIG.PROP_FORM_ID)) throw new Error('Modulo inatteso nel trigger.');
  return ppProcessResponse_(e.response);
}

/** Scrive UN solo evento durevole: i punteggi sono una vista, non incrementi separati. */
function ppProcessResponse_(response, providedSchema) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = ppProps_();
    const responseId = String(response.getId() || '');
    if (!responseId) throw new Error('La risposta non risulta inviata.');
    const at = response.getTimestamp().toISOString();
    if (at < props.getProperty(ppProp_('STARTED'))) return 'PRECEDENTE';
    const book = ppBook_();
    const events = ppEvents_(book);
    if (events.some(function(e) { return e.id === responseId; })) {
      ppRefreshViews_(book); // ripara anche un aggiornamento di viste interrotto dopo appendRow.
      return 'GIA_REGISTRATO';
    }
    const form = providedSchema ? null : FormApp.openById(props.getProperty(CONFIG.PROP_FORM_ID));
    const schema = providedSchema || ppInspectForm_(form, props);
    const answers = {};
    response.getItemResponses().forEach(function(item) { answers[String(item.getItem().getId())] = item.getResponse(); });
    const token = String(answers[schema.tokenId] || '').trim();
    const route = String(answers[schema.routingId] || '');
    const people = ppPeople_(book);
    const person = token ? people.find(function(p) { return p.token === token; }) : null;
    const summary = ppSummary_(people, events);
    let outcome = ppValidateAnswers_(answers, schema);
    if (person && summary.completed[person.id]) outcome = 'DUPLICATO';
    else if (person && summary.latest[person.id] === 'ESCLUSO') outcome = 'DUPLICATO_ESCLUSO';
    else if (token && !person) outcome = 'CODICE_SCONOSCIUTO';
    else if (person && outcome !== 'ESCLUSO' && route !== person.route) outcome = 'PERCORSO_MODIFICATO';
    else if (outcome === 'COMPLETO' && !buildRoutes_().some(function(r) { return r.routeLabel === route; })) outcome = 'PERCORSO_MODIFICATO';
    else if (outcome === 'COMPLETO' && !person) outcome = 'SENZA_GIOCO';
    // Per lo screening mancano le sezioni successive: conserva il percorso assegnato nel registro.
    const recordedRoute = person ? person.route : route;
    book.getSheetByName(PP.EVENTS).appendRow([responseId, at, person ? person.id : '', person ? person.inviter : '', recordedRoute, outcome]);
    SpreadsheetApp.flush();
    ppRefreshViews_(book);
    return outcome;
  } finally { lock.releaseLock(); }
}

function ppRefreshViews_(book) {
  const events = ppEvents_(book);
  const summary = ppSummary_(ppPeople_(book), events);
  const sheet = book.getSheetByName(PP.BOARD);
  const oldRows = Math.max(0, sheet.getLastRow() - 1);
  const rows = summary.board.map(function(r) { return [r.rank, r.id, r.points]; });
  if (rows.length) sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  if (oldRows > rows.length) sheet.getRange(rows.length + 2, 1, oldRows - rows.length, 3).clearContent();
  const props = ppProps_();
  const baseline = JSON.parse(props.getProperty(ppProp_('BASE_COMPLETED')) || '{}');
  const counts = Object.assign({}, baseline);
  const seen = {};
  const validPeople = {};
  const routes = buildRoutes_();
  events.forEach(function(e) {
    if (seen[e.id] || ['COMPLETO', 'SENZA_GIOCO'].indexOf(e.outcome) < 0) return;
    seen[e.id] = true;
    if (e.outcome === 'COMPLETO') { if (validPeople[e.person]) return; validPeople[e.person] = true; }
    const route = routes.find(function(r) { return r.routeLabel === e.route; });
    if (!route) return;
    ['COMPLETED_ROUTE_' + route.routeCode, 'COMPLETED_CONDITION_' + route.conditionCode].forEach(function(k) { counts[k] = Number(counts[k] || 0) + 1; });
  });
  const updates = {};
  Object.keys(counts).forEach(function(k) { updates[CONFIG.PROP_PREFIX + k] = String(counts[k]); });
  props.setProperties(updates, false);
  refreshCounterSheets_(SpreadsheetApp.openById(props.getProperty(CONFIG.PROP_SPREADSHEET_ID)), routes, props);
}

/** Recupero automatico di eventi mancati; nessuna risposta sintetica viene inviata. */
function ppRecoveryTrigger_() {
  if (!ppActive_()) return;
  const started = Date.now();
  const props = ppProps_();
  const cursor = props.getProperty(ppProp_('SYNC_CURSOR')) || props.getProperty(ppProp_('STARTED'));
  const form = FormApp.openById(props.getProperty(CONFIG.PROP_FORM_ID));
  const schema = ppInspectForm_(form, props);
  const responses = form.getResponses(new Date(new Date(cursor).getTime() - 1000))
    .sort(function(a, b) { return a.getTimestamp().getTime() - b.getTimestamp().getTime(); });
  let processed = 0;
  let lastTimestamp = cursor;
  for (let i = 0; i < responses.length; i++) {
    if (Date.now() - started > 220000) break;
    ppProcessResponse_(responses[i], schema);
    lastTimestamp = responses[i].getTimestamp().toISOString();
    processed++;
    // Avanza soltanto dopo un intero gruppo di timestamp identici, senza perdere invii simultanei.
    if (i === responses.length - 1 || responses[i + 1].getTimestamp().getTime() !== responses[i].getTimestamp().getTime()) {
      const lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        const current = props.getProperty(ppProp_('SYNC_CURSOR')) || cursor;
        if (lastTimestamp > current) props.setProperty(ppProp_('SYNC_CURSOR'), lastTimestamp);
      } finally { lock.releaseLock(); }
    }
    if (processed >= 100 && (i === responses.length - 1 || responses[i + 1].getTimestamp().getTime() !== responses[i].getTimestamp().getTime())) break;
  }
  return {verificate: processed, disponibili: responses.length};
}

function sincronizzaInviiPassaparola() { ppAdmin_(); const result = ppRecoveryTrigger_(); console.log(JSON.stringify(result)); return result; }

function diagnosticaPassaparola() {
  ppAdmin_();
  const props = ppProps_();
  const form = FormApp.openById(props.getProperty(CONFIG.PROP_FORM_ID));
  const schema = ppInspectForm_(form, props);
  const book = ppBook_();
  const people = ppPeople_(book);
  const summary = ppSummary_(people, ppEvents_(book));
  const triggers = ScriptApp.getProjectTriggers();
  const result = {
    configurato: ppActive_(), percorsi: buildRoutes_().length, domandeObbligatorieVerificate: schema.required.length,
    campoTecnicoPresente: !!schema.tokenId,
    triggerInvio: triggers.filter(function(t) { return t.getHandlerFunction() === CONFIG.COMPLETION_TRIGGER && t.getTriggerSourceId() === form.getId(); }).length,
    triggerRecupero: triggers.filter(function(t) { return t.getHandlerFunction() === 'ppRecoveryTrigger_'; }).length,
    partecipazioni: people.length, completate: summary.board.length,
    linkPubblico: ppSpaUrl_(), apiBackend: PP.API_URL, pannelloPrivato: book.getUrl(),
    nota: 'La diagnosi non verifica la versione pubblicata né sostituisce una prova reale in browser.'
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function ppWriteGuide_(game, form, dataset) {
  const rows = [
    ['Link pubblico SPA', ppSpaUrl_()], ['API backend', PP.API_URL], ['Pannello privato', game.getUrl()], ['Modulo esistente', form.getEditUrl()], ['Dataset ricerca', dataset.getUrl()],
    ['Regola', '1 punto per ogni nuovo partecipante che completa il questionario dal proprio link. Solo inviti diretti, nessun punto per clic o per invii duplicati.'],
    ['Classifica', 'Solo codici generati e punteggi. A parità di punti la posizione è uguale.'],
    ['Invii senza codice', 'Restano risposte della ricerca ma non partecipano al gioco e non danno punti.'],
    ['Verifica', 'Ammissione allo studio, consenso, percorso assegnato e tutte le domande comuni obbligatorie. I giudizi sul prodotto e le risposte ai controlli non influenzano i punti.'],
    ['Riservatezza', 'Non condividere questo Spreadsheet o il dataset pubblicamente. I codici collegano le risposte al gioco: non sono anonimato assoluto. Non si raccolgono nome, email, telefono o IP tramite questo codice.'],
    ['Limiti duplicati', 'Un invio valido per codice. Senza login non è possibile garantire una persona unica tra browser o dispositivi diversi.'],
    ['Recupero', 'sincronizzaInviiPassaparola() rilegge gli invii reali. Esiste anche un recupero automatico ogni 5 minuti.'],
    ['Diagnosi', 'Eseguire diagnosticaPassaparola() dall’editor. Non eseguire manualmente onQuestionarioSubmit().'],
    ['Contatori V6', 'Lo storico resta invariato. Dopo l’attivazione i completamenti aggiunti sono gli invii completi validati, senza duplicati del gioco. Il dataset grezzo non è modificato.'],
    ['Struttura aggiornata', 'Se cambiano domande di screening o diramazioni, la verifica si ferma. Aggiornare l’integrazione prima di riprendere la raccolta.'],
    ['Recupero personale', 'I partecipanti conservano la chiave privata mostrata nel proprio pannello. La chiave non deve essere condivisa; il link di invito è diverso.'],
    ['Avvio', 'Configurazione completata: aggiornare la distribuzione ESISTENTE scegliendo Nuova versione, Esegui come me, accesso Chiunque.']
  ];
  game.getSheetByName(PP.GUIDE).getRange(2, 1, rows.length, 2).setValues(rows);
}
