/**
 * QUESTIONARIO V6 + PASSAPAROLA — codice completo, un solo file.
 *
 * INSTALLAZIONE NEL PROGETTO ESISTENTE (NON CREARE UN NUOVO MODULO)
 * 1. Conserva una copia del vecchio Codice.gs. Sostituisci tutto il suo
 *    contenuto con questo file nello STESSO progetto Apps Script V6.
 * 2. Salva. Seleziona attivaPassaparola dal menu delle funzioni e premi
 *    Esegui. Autorizza con l'account proprietario. Questa funzione aggiunge
 *    il codice tecnico facoltativo al modulo, aggiorna la conferma e crea
 *    un foglio privato per la classifica. Non ricrea domande, immagini,
 *    percorsi, dataset o risposte e non azzera i contatori preesistenti.
 * 3. Distribuisci > Gestisci distribuzioni > scegli la Web App attuale >
 *    Modifica (matita) > Versione: Nuova versione > Distribuisci.
 *    Esegui come: Me. Accesso: Chiunque (se consentito dal tuo account).
 *    Aggiorna la distribuzione esistente per mantenere il link /exec.
 * 4. Esegui diagnosticaPassaparola. Il registro mostra link del gioco
 *    e Spreadsheet privato. Apri /exec in un browser non autenticato.
 *
 * NON eseguire setupQuestionarioUnico o resetConfigurazioneV6.
 * NON aggiungere questo codice accanto al vecchio: contiene già tutto.
 * onQuestionarioSubmit viene eseguita automaticamente, non dal pulsante Esegui.
 *
 * REGOLE: un punto per un invio completo da un invito diretto; nessun punto
 * per clic, auto-inviti dello stesso profilo, duplicati o uscite anticipate.
 * Un codice può completare una sola volta. Senza login non si può impedire
 * che la stessa persona crei profili su browser/dispositivi diversi.
 * Codici e chiavi sono pseudonimi: consentono il collegamento al gioco.
 * Nessuna risposta della ricerca, email o identità è pubblicata in classifica.
 *
 * VERIFICA LOCALE: sintassi, conteggio/idempotenza, percorsi, controlli di
 * ammissione, protezione funzioni amministrative e interfaccia simulata.
 * Non eseguito sul tuo account Google: attivazione e prova reale restano
 * necessarie. Questo file da solo non aggiorna la distribuzione online.
 */

/**
 * QUESTIONARIO - RICERCA TESI
 * Versione definitiva V6
 *
 * Disegno:
 *   2 condizioni sperimentali × 5 prodotti = 10 percorsi.
 *
 * Condizioni:
 *   C1 = prodotto in Italia da azienda italiana.
 *   C2 = prodotto negli Stati Uniti da azienda statunitense.
 *
 * Ogni partecipante vede un solo prodotto e una sola condizione.
 *
 * IMPORTANTE:
 * condividere esclusivamente l’URL del Web App.
 */

const CONFIG = Object.freeze({
  FORM_TITLE: "Questionario - Ricerca Tesi",

  FORM_DESCRIPTION:
    "Sei invitato/a a partecipare a una breve ricerca sulle impressioni " +
    "relative a prodotti alimentari. La compilazione richiede circa 10–12 minuti. " +
    "Vedrai l’immagine di un prodotto e risponderai ad alcune domande. " +
    "Non assaggerai né acquisterai alcun prodotto. La partecipazione è volontaria.",

  SPREADSHEET_NAME:
    "Dataset - Questionario Ricerca Tesi V6",

  OUTPUT_FOLDER_NAME:
    "Questionario Ricerca Tesi - Form unico",

  OUTPUT_FOLDER_ID:
    "1pPXnaNGxIti33SaGsf3J4RdEuhsgFkDN",

  IMAGES_FOLDER_ID:
    "1pPXnaNGxIti33SaGsf3J4RdEuhsgFkDN",

  EXISTING_SPREADSHEET_ID: "",

  SHEET_CONDITIONS: "V6_CONDITIONS",
  SHEET_ROUTES: "V6_ROUTES",
  SHEET_ASSIGNMENTS: "V6_ASSIGNMENTS",
  SHEET_LOG: "V6_LOG",
  SHEET_INSTRUCTIONS: "V6_ISTRUZIONI",

  ROUTING_ITEM_TITLE:
    "Codice di accesso (precompilato — non modificare)",

  COMPLETION_TRIGGER:
    "onQuestionarioSubmit",

  PROP_PREFIX: "QRT_V6_",
  PROP_SETUP: "QRT_V6_SETUP_COMPLETED",
  PROP_FORM_ID: "QRT_V6_FORM_ID",
  PROP_SPREADSHEET_ID: "QRT_V6_SPREADSHEET_ID",
  PROP_ROUTING_ITEM_ID: "QRT_V6_ROUTING_ITEM_ID",
  PROP_RESPONSE_SHEET: "QRT_V6_RESPONSE_SHEET",
  PROP_SEQUENCE: "QRT_V6_ASSIGNMENT_SEQUENCE",

  LIKERT_7: ["1", "2", "3", "4", "5", "6", "7"],
  LIKERT_5: ["1", "2", "3", "4", "5"]
});


/**
 * ============================================================
 * CONDIZIONI SPERIMENTALI
 * ============================================================
 */
const EXPERIMENTAL_CONDITIONS = Object.freeze([
  Object.freeze({
    code: "C1_IT_IT",
    label: "Italia - Italia",
    productionCountry: "Italia",
    promoterName: "100% Italiano (azienda italiana)",
    promoterCountry: "Italiana"
  }),

  Object.freeze({
    code: "C2_US_US",
    label: "Stati Uniti - Stati Uniti",
    productionCountry: "Stati Uniti",
    promoterName: "100% American (azienda americana)",
    promoterCountry: "Statunitense"
  })
]);


/**
 * ============================================================
 * PRODOTTI
 * ============================================================
 */
const PRODUCTS = Object.freeze([
  Object.freeze({
    code: "P01",
    name: "Cornflakes dolci",
    taste: "Dolce",
    imageNames: [
      "P01_Cornflakes.png",
      "01_cornflakes_verde_oliva.png"
    ]
  }),

  Object.freeze({
    code: "P02",
    name: "Yogurt al limone",
    taste: "Aspro",
    imageNames: [
      "P02_Yogurt_greco.png",
      "P02_Yogurt_limone.png",
      "02_yogurt_limone_rosso.png"
    ]
  }),

  Object.freeze({
    code: "P03",
    name: "Snack di patate al formaggio",
    taste: "Salato",
    imageNames: [
      "P03_Snack_patate_formaggio.png",
      "03_snack_formaggio_magenta.png"
    ]
  }),

  Object.freeze({
    code: "P04",
    name: "Aperitivo analcolico bitter",
    taste: "Amaro",
    imageNames: [
      "P04_Aperitivo_bitter.png",
      "04_bitter_analcolico_turchese.png"
    ]
  }),

  Object.freeze({
    code: "P05",
    name: "Noodles istantanei alla salsa di soia",
    taste: "Umami",
    imageNames: [
      "P05_Noodles_soia.png",
      "05_noodles_lilla.png"
    ]
  })
]);


/**
 * ============================================================
 * SETUP PRINCIPALE
 * ============================================================
 */
function setupQuestionarioUnico() {
  ppAdmin_();
  const props =
    PropertiesService.getScriptProperties();

  if (
    props.getProperty(CONFIG.PROP_SETUP) === "TRUE"
  ) {
    throw new Error(
      "Il setup V6 è già stato completato. " +
      "Esegui mostraStatoQuestionario() per recuperare gli URL."
    );
  }

  const outputFolder =
    getOutputFolder_();

  const spreadsheetInfo =
    getOrCreateSpreadsheet_(props);

  const spreadsheet =
    spreadsheetInfo.spreadsheet;

  prepareControlSheets_(spreadsheet);

  const images =
    loadProductImages_();

  const routes =
    buildRoutes_();

  if (routes.length !== 10) {
    throw new Error(
      "Numero di percorsi errato. Attesi: 10. Trovati: " +
      routes.length
    );
  }

  const formBuild =
    createSingleForm_(routes, images);

  const form =
    formBuild.form;

  moveFileSafely_(
    form.getId(),
    outputFolder
  );

  if (spreadsheetInfo.created) {
    moveFileSafely_(
      spreadsheet.getId(),
      outputFolder
    );
  }

  const responseSheetName =
    connectFormToSpreadsheet_(
      form,
      spreadsheet
    );

  props.setProperties({
    [CONFIG.PROP_FORM_ID]:
      form.getId(),

    [CONFIG.PROP_SPREADSHEET_ID]:
      spreadsheet.getId(),

    [CONFIG.PROP_ROUTING_ITEM_ID]:
      String(formBuild.routingItem.getId()),

    [CONFIG.PROP_RESPONSE_SHEET]:
      responseSheetName || "",

    [CONFIG.PROP_SEQUENCE]:
      "0"
  }, false);

  initializeCounters_(
    props,
    routes
  );

  writeConditionSheets_(
    spreadsheet,
    routes,
    props
  );

  installCompletionTrigger_(form);

  props.setProperty(
    CONFIG.PROP_SETUP,
    "TRUE"
  );

  writeInstructions_(
    spreadsheet,
    form
  );

  logEvent_(
    spreadsheet,
    "SETUP",
    "OK",
    "setupQuestionarioUnico",
    "Form V6 creato con 10 percorsi: " +
    form.getId()
  );

  console.log(
    "FORM (modifica): " +
    form.getEditUrl()
  );

  console.log(
    "FORM diretto, NON DISTRIBUIRE: " +
    form.getPublishedUrl()
  );

  console.log(
    "SPREADSHEET: " +
    spreadsheet.getUrl()
  );

  console.log(
    "WEB APP: " +
    (
      ScriptApp.getService().getUrl() ||
      "Creare o aggiornare il deployment Web App"
    )
  );
}


/**
 * ============================================================
 * WEB APP
 * ============================================================
 */
function questionarioSenzaGioco_() {
  try {
    const route =
      assignRoute_();

    const prefilledUrl =
      buildPrefilledFormUrl_(
        route.routeLabel
      );

    const html =
      "<!doctype html>" +
      "<html>" +
      "<head>" +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>Questionario - Ricerca Tesi</title>" +

      "<style>" +
      "body{" +
      "font-family:Arial,sans-serif;" +
      "text-align:center;" +
      "padding:56px 20px;" +
      "color:#202124" +
      "}" +

      ".box{" +
      "max-width:620px;" +
      "margin:auto" +
      "}" +

      "p{" +
      "font-size:18px;" +
      "line-height:1.5" +
      "}" +

      "a{" +
      "display:inline-block;" +
      "margin-top:18px;" +
      "padding:13px 22px;" +
      "border-radius:8px;" +
      "background:#1a73e8;" +
      "color:#fff;" +
      "text-decoration:none" +
      "}" +
      "</style>" +
      "</head>" +

      "<body>" +
      '<div class="box">' +
      "<p>Stai per essere reindirizzato al questionario.</p>" +

      '<a href="' +
      escapeHtml_(prefilledUrl) +
      '">' +
      "Apri il questionario" +
      "</a>" +
      "</div>" +

      "<script>" +
      "window.location.replace(" +
      JSON.stringify(prefilledUrl) +
      ");" +
      "</script>" +

      "</body>" +
      "</html>";

    return HtmlService
      .createHtmlOutput(html)
      .setTitle(CONFIG.FORM_TITLE)
      .setXFrameOptionsMode(
        HtmlService.XFrameOptionsMode.ALLOWALL
      );

  } catch (error) {
    console.error(
      error.stack || error
    );

    return HtmlService
      .createHtmlOutput(
        "<h2>Si è verificato un errore.</h2>" +
        "<p>Riprova tra poco.</p>"
      )
      .setTitle(CONFIG.FORM_TITLE);
  }
}


/**
 * ============================================================
 * CREAZIONE DEL FORM
 * ============================================================
 */
function createSingleForm_(routes, images) {
  const form =
    FormApp.create(
      CONFIG.FORM_TITLE
    );

  form
    .setTitle(CONFIG.FORM_TITLE)
    .setDescription(CONFIG.FORM_DESCRIPTION)
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setCollectEmail(false)
    .setIsQuiz(false)
    .setAllowResponseEdits(false)
    .setConfirmationMessage(
      "Grazie per la partecipazione."
    );

  try {
    form.setShowLinkToRespondAgain(false);

  } catch (error) {
    console.log(
      "Link nuova risposta non configurabile: " +
      error.message
    );
  }


  /**
   * ==========================================================
   * INFORMAZIONI E CONSENSO
   * ==========================================================
   */
  form
    .addSectionHeaderItem()
    .setTitle(
      "Informazioni, criteri di inclusione e consenso"
    )
    .setHelpText(
      "La partecipazione è volontaria. Puoi interrompere la compilazione " +
      "in qualsiasi momento. Le risposte saranno analizzate in forma anonima " +
      "e il questionario non richiede dati identificativi."
    );

  const ageScreening =
    form
      .addMultipleChoiceItem()
      .setTitle(
        "Hai almeno 18 anni?"
      )
      .setRequired(true);

  const italyPage =
    form
      .addPageBreakItem()
      .setTitle(
        "Criteri di partecipazione"
      );

  const italyScreening =
    form
      .addMultipleChoiceItem()
      .setTitle(
        "Vivi stabilmente in Italia o hai trascorso qui la maggior parte della tua vita?"
      )
      .setRequired(true);

  const consentPage =
    form
      .addPageBreakItem()
      .setTitle(
        "Consenso informato"
      )
      .setHelpText(
        "Vedrai l’immagine di un prodotto alimentare e risponderai ad alcune " +
        "domande sulle tue impressioni. Non assaggerai né acquisterai alcun " +
        "prodotto. Proseguendo dichiari di aver letto queste informazioni e " +
        "di partecipare volontariamente."
      );

  const consentItem =
    form
      .addMultipleChoiceItem()
      .setTitle(
        "Acconsenti volontariamente a partecipare alla ricerca?"
      )
      .setRequired(true);


  /**
   * ==========================================================
   * ROUTING
   * ==========================================================
   */
  const routingPage =
    form
      .addPageBreakItem()
      .setTitle(
        "Accesso al questionario"
      )
      .setHelpText(
        "Il codice seguente è stato assegnato automaticamente. Non modificarlo."
      );

  const routingItem =
    form
      .addListItem()
      .setTitle(
        CONFIG.ROUTING_ITEM_TITLE
      )
      .setRequired(true);


  /**
   * ==========================================================
   * 10 PERCORSI SPERIMENTALI
   * ==========================================================
   */
  const routePages = [];

  routes.forEach(function(route) {
    const page =
      form
        .addPageBreakItem()
        .setTitle(
          "Presentazione del prodotto"
        );

    routePages.push(page);

    /*
     * Prima viene mostrata l’immagine.
     */
    form
      .addImageItem()
      .setImage(
        images[route.productCode]
      );

    /*
     * Sotto l’immagine vengono mostrate le informazioni.
     */
    form
      .addSectionHeaderItem()
      .setTitle(
        "PRODOTTO: " +
        route.productName
      );

    form
      .addSectionHeaderItem()
      .setTitle(
        "LUOGO DI PRODUZIONE: " +
        route.productionCountry
      );

    form
      .addSectionHeaderItem()
      .setTitle(
        "AZIENDA PROMOTRICE: " +
        route.promoterName
      );
  });


  /**
   * ==========================================================
   * VALUTAZIONI COMUNI
   * ==========================================================
   */
  const evaluationPage =
    addEvaluationSections_(form);

  /*
   * Ogni percorso viene inviato direttamente
   * alla sezione delle valutazioni.
   */
  for (
    let i = 0;
    i < routePages.length - 1;
    i++
  ) {
    routePages[i + 1]
      .setGoToPage(
        evaluationPage
      );
  }


  /**
   * COLLEGAMENTO CODICI-PERCORSI
   */
  routingItem.setChoices(
    routes.map(function(route, index) {
      return routingItem.createChoice(
        route.routeLabel,
        routePages[index]
      );
    })
  );


  /**
   * SCREENING ETÀ
   */
  ageScreening.setChoices([
    ageScreening.createChoice(
      "Sì",
      italyPage
    ),

    ageScreening.createChoice(
      "No",
      FormApp.PageNavigationType.SUBMIT
    )
  ]);


  /**
   * SCREENING ITALIA
   */
  italyScreening.setChoices([
    italyScreening.createChoice(
      "Sì",
      consentPage
    ),

    italyScreening.createChoice(
      "No",
      FormApp.PageNavigationType.SUBMIT
    )
  ]);


  /**
   * CONSENSO
   */
  consentItem.setChoices([
    consentItem.createChoice(
      "Sì, acconsento",
      routingPage
    ),

    consentItem.createChoice(
      "No",
      FormApp.PageNavigationType.SUBMIT
    )
  ]);

  try {
    if (
      form.supportsAdvancedResponderPermissions()
    ) {
      form.setPublished(true);
    }

  } catch (error) {
    console.log(
      "Pubblicazione automatica non disponibile: " +
      error.message
    );
  }

  form.setAcceptingResponses(true);

  return {
    form: form,
    routingItem: routingItem
  };
}


/**
 * ============================================================
 * QUESTIONARIO POST-STIMOLO
 * ============================================================
 */
function addEvaluationSections_(form) {
  const evaluationPage =
    form
      .addPageBreakItem()
      .setTitle(
        "Valutazione del prodotto"
      )
      .setHelpText(
        "Rispondi in base alla tua prima impressione. " +
        "Non esistono risposte giuste o sbagliate."
      );


  /**
   * 3. ASPETTATIVA GUSTATIVA
   */
  addGrid_(
    form,

    "Senza assaggiarlo, quanto ti aspetteresti che questo prodotto fosse…",

    "1 = Per nulla; 7 = Moltissimo",

    [
      "Dolce",
      "Aspro",
      "Salato",
      "Amaro",
      "Umami / saporito"
    ],

    CONFIG.LIKERT_7
  );


  /**
   * 4. CONGRUENZA COLORE-GUSTO
   */
  addScale_(
    form,

    "Il colore di questo prodotto è coerente con il gusto che mi aspetterei.",

    1,
    7,

    "Per nulla d’accordo",
    "Del tutto d’accordo"
  );


  /**
   * 5. NATURALEZZA PERCEPITA
   */
  addScale_(
    form,

    "Il colore di questo prodotto mi sembra naturale.",

    1,
    7,

    "Per nulla d’accordo",
    "Del tutto d’accordo"
  );


  /**
   * 6. ARTIFICIALITÀ PERCEPITA
   */
  addScale_(
    form,

    "Il colore di questo prodotto mi sembra artificiale.",

    1,
    7,

    "Per nulla d’accordo",
    "Del tutto d’accordo"
  );


  /**
   * 7. RISCHIO PERCEPITO PER LA SALUTE
   */
  addGrid_(
    form,

    "Pensando al prodotto appena mostrato, indica quanto sei d’accordo con le seguenti affermazioni.",

    "1 = Per nulla d’accordo; 7 = Del tutto d’accordo",

    [
      "Ritengo che il consumo di questo prodotto possa essere dannoso per la mia salute.",
      "Ritengo possibile che il consumo di questo prodotto possa avere conseguenze negative sulla mia salute.",
      "Ritengo che questo prodotto possa comportare un rischio per la salute dei consumatori.",
      "Ritengo che eventuali conseguenze negative per la salute derivanti dal consumo di questo prodotto potrebbero essere serie."
    ],

    CONFIG.LIKERT_7
  );


  /**
   * ==========================================================
   * VALUTAZIONE DELL’AZIENDA E DEL PRODOTTO
   * ==========================================================
   */
  form
    .addPageBreakItem()
    .setTitle(
      "Valutazione dell’azienda e del prodotto"
    );


  /**
   * 8. CREDIBILITÀ DELL’AZIENDA
   *
   * Gli item 4 e 8 sono inversi nell’analisi.
   */
  addGrid_(
    form,

    "Pensando all’azienda che promuove il prodotto, indica quanto sei d’accordo con le seguenti affermazioni.",

    "1 = Per nulla d’accordo; 7 = Del tutto d’accordo",

    [
      "Mi fido di questa azienda.",
      "Ritengo veritiere le affermazioni di questa azienda.",
      "Questa azienda mi sembra onesta.",
      "Fatico a credere a ciò che questa azienda comunica.",
      "Questa azienda sembra avere molta esperienza.",
      "Questa azienda sembra competente in ciò che fa.",
      "Questa azienda sembra possedere una notevole competenza nel proprio settore.",
      "Questa azienda sembra avere poca esperienza."
    ],

    CONFIG.LIKERT_7
  );


  /**
   * 9. ATTEGGIAMENTO VERSO IL PRODOTTO
   */
  addGrid_(
    form,

    "Indica la tua impressione complessiva del prodotto appena mostrato.",

    "Ogni riga va valutata da 1 a 7. " +
    "1 corrisponde al termine a sinistra; " +
    "7 corrisponde al termine a destra.",

    [
      "Poco attraente — Attraente",
      "Cattivo — Buono",
      "Sgradevole — Gradevole",
      "Sfavorevole — Favorevole",
      "Non piacevole — Piacevole"
    ],

    CONFIG.LIKERT_7
  );


  /**
   * 10. INTENZIONE DI ACQUISTO
   */
  addGrid_(
    form,

    "Pensando al prodotto appena mostrato, indica la tua intenzione di acquistarlo.",

    "Ogni riga va valutata da 1 a 7. " +
    "1 corrisponde all’affermazione a sinistra; " +
    "7 corrisponde all’affermazione a destra.",

    [
      "Non lo acquisterei mai — Lo acquisterei sicuramente",
      "Sicuramente non intendo acquistarlo — Sicuramente intendo acquistarlo",
      "Interesse all’acquisto molto basso — Interesse all’acquisto molto alto",
      "Sicuramente non lo acquisterei — Sicuramente lo acquisterei",
      "Probabilmente non lo acquisterei — Probabilmente lo acquisterei"
    ],

    CONFIG.LIKERT_7
  );


  /**
   * 11. INTENZIONE DI ASSAGGIO
   */
  addScale_(
    form,

    "Quanto sarebbe probabile che assaggiassi questo prodotto?",

    1,
    7,

    "Per nulla probabile",
    "Molto probabile"
  );


  /**
   * 12. INTENZIONE DI RACCOMANDAZIONE
   */
  addScale_(
    form,

    "Quanto sarebbe probabile che consigliassi questo prodotto a un’altra persona?",

    1,
    7,

    "Per nulla probabile",
    "Molto probabile"
  );


  /**
   * ==========================================================
   * CONTESTO CULTURALE E FAMILIARITÀ
   * ==========================================================
   */
  form
    .addPageBreakItem()
    .setTitle(
      "Contesto culturale e familiarità"
    );


  /**
   * 13. DISTANZA CULTURALE PERCEPITA
   */
  addGrid_(
    form,

    "Pensando all’Italia e al Paese di provenienza dell’azienda appena presentata, quanto ritieni simili o differenti i due contesti rispetto ai seguenti aspetti?",

    "1 = Molto simili; 7 = Molto differenti",

    [
      "Clima",
      "Ambiente naturale",
      "Ambiente sociale",
      "Condizioni e stile di vita quotidiano",
      "Aspetti pratici della vita quotidiana",
      "Cibo e abitudini alimentari",
      "Vita familiare",
      "Norme e convenzioni sociali",
      "Valori e credenze",
      "Caratteristiche e comportamenti delle persone",
      "Amicizie e relazioni sociali",
      "Lingua e modalità di comunicazione"
    ],

    CONFIG.LIKERT_7
  );


  /**
   * 14. FAMILIARITÀ CON IL PRODOTTO
   */
  addScale_(
    form,

    "Quanto conoscevi già questo tipo di prodotto prima di partecipare allo studio?",

    1,
    7,

    "Per nulla",
    "Moltissimo"
  );


  /**
   * ==========================================================
   * 15. ABITUDINI ALIMENTARI
   * ==========================================================
   *
   * Versione a 6 item e 5 punti.
   * Gli item 1, 4 e 6 sono inversi nell’analisi.
   */
  form
    .addPageBreakItem()
    .setTitle(
      "Abitudini alimentari"
    );

  addGrid_(
    form,

    "Indica quanto ciascuna delle seguenti affermazioni ti descrive.",

    "1 = Questa frase non mi descrive per niente; " +
    "2 = Mi descrive poco; " +
    "3 = Mi descrive abbastanza; " +
    "4 = Mi descrive molto; " +
    "5 = Questa frase mi descrive moltissimo",

    [
      "Provo sempre cibi nuovi e diversi.",
      "Non mi fido dei cibi nuovi.",
      "Il cibo etnico mi sembra strano.",
      "Durante le vacanze sarei disponibile a provare cibi nuovi.",
      "Ho paura di mangiare cibi che non ho mai provato prima.",
      "Mi piace provare nuovi ristoranti etnici."
    ],

    CONFIG.LIKERT_5
  );


  /**
   * ==========================================================
   * 16-19. CONTROLLI
   * ==========================================================
   */
  form
    .addPageBreakItem()
    .setTitle(
      "Domande sul prodotto mostrato"
    )
    .setHelpText(
      "Rispondi facendo riferimento alle informazioni " +
      "presentate insieme all’immagine del prodotto."
    );


  /**
   * 16. MANIPULATION CHECK — AZIENDA
   */
  form
    .addMultipleChoiceItem()
    .setTitle(
      "L’azienda che promuoveva il prodotto era:"
    )
    .setChoiceValues([
      "Italiana",
      "Statunitense",
      "Non ricordo"
    ])
    .setRequired(true);


  /**
   * 17. MANIPULATION CHECK — PRODUZIONE
   */
  form
    .addMultipleChoiceItem()
    .setTitle(
      "Dove era prodotto il prodotto mostrato?"
    )
    .setChoiceValues([
      "In Italia",
      "Negli Stati Uniti",
      "Non ricordo"
    ])
    .setRequired(true);


  /**
   * 18. ATTENTION CHECK — PRODOTTO
   */
  form
    .addMultipleChoiceItem()
    .setTitle(
      "Quale prodotto hai appena valutato?"
    )
    .setChoiceValues([
      "Cornflakes dolci",
      "Yogurt al limone",
      "Snack di patate al formaggio",
      "Aperitivo analcolico bitter",
      "Noodles istantanei alla salsa di soia",
      "Non ricordo"
    ])
    .setRequired(true);


  /**
   * 19. PERCEZIONE DEI COLORI
   */
  form
    .addMultipleChoiceItem()
    .setTitle(
      "Hai difficoltà note nella percezione dei colori?"
    )
    .setChoiceValues([
      "Sì",
      "No",
      "Non so",
      "Preferisco non rispondere"
    ])
    .setRequired(true);


  /**
   * ==========================================================
   * 20. DATI DEMOGRAFICI
   * ==========================================================
   */
  form
    .addPageBreakItem()
    .setTitle(
      "Dati demografici"
    );


  /**
   * ETÀ
   */
  const age =
    form
      .addTextItem()
      .setTitle(
        "Quanti anni hai?"
      )
      .setHelpText(
        "Inserisci la tua età in anni compiuti."
      )
      .setRequired(true);

  age.setValidation(
    FormApp
      .createTextValidation()
      .requireNumberBetween(
        18,
        120
      )
      .build()
  );


  /**
   * GENERE
   */
  form
    .addMultipleChoiceItem()
    .setTitle(
      "Qual è il tuo genere?"
    )
    .setChoiceValues([
      "Donna",
      "Uomo",
      "Non binario/a",
      "Altro / preferisco auto-descrivermi",
      "Preferisco non rispondere"
    ])
    .setRequired(true);


  /**
   * TITOLO DI STUDIO
   */
  form
    .addMultipleChoiceItem()
    .setTitle(
      "Qual è il titolo di studio più alto che hai completato?"
    )
    .setChoiceValues([
      "Scuola secondaria di primo grado",
      "Scuola secondaria di secondo grado",
      "Laurea triennale",
      "Laurea magistrale / ciclo unico",
      "Master / specializzazione",
      "Dottorato",
      "Preferisco non rispondere"
    ])
    .setRequired(true);


  /**
   * REGIONE
   */
  form
    .addListItem()
    .setTitle(
      "Qual è la tua regione di residenza?"
    )
    .setChoiceValues([
      "Abruzzo",
      "Basilicata",
      "Calabria",
      "Campania",
      "Emilia-Romagna",
      "Friuli-Venezia Giulia",
      "Lazio",
      "Liguria",
      "Lombardia",
      "Marche",
      "Molise",
      "Piemonte",
      "Puglia",
      "Sardegna",
      "Sicilia",
      "Toscana",
      "Trentino-Alto Adige",
      "Umbria",
      "Valle d’Aosta",
      "Veneto",
      "Preferisco non rispondere"
    ])
    .setRequired(true);


  /**
   * REGIME ALIMENTARE
   */
  form
    .addCheckboxItem()
    .setTitle(
      "Segui attualmente un particolare regime alimentare o presenti restrizioni alimentari rilevanti?"
    )
    .setHelpText(
      "Puoi selezionare più risposte. Se scegli “Nessuna restrizione particolare” " +
      "o “Preferisco non rispondere”, non selezionare altre opzioni."
    )
    .setChoiceValues([
      "Nessuna restrizione particolare",
      "Vegetariano",
      "Vegano",
      "Allergie/intolleranze alimentari",
      "Restrizioni per motivi di salute",
      "Preferisco non rispondere"
    ])
    .showOtherOption(true)
    .setRequired(true);


  /**
   * ==========================================================
   * 21. DEBRIEFING
   * ==========================================================
   */
  form
    .addPageBreakItem()
    .setTitle(
      "Debriefing"
    )
    .setHelpText(
      "Grazie per la partecipazione. Lo scopo dello studio è analizzare come " +
      "le caratteristiche visive di un prodotto alimentare e le informazioni " +
      "relative alla sua provenienza possano influenzare le aspettative, le " +
      "valutazioni e le intenzioni comportamentali dei consumatori. Alcune " +
      "delle informazioni presentate nel corso del questionario sono state " +
      "manipolate a fini sperimentali e non descrivono un prodotto commerciale reale."
    );

  return evaluationPage;
}


/**
 * ============================================================
 * CREAZIONE GRIGLIA
 * ============================================================
 */
function addGrid_(
  form,
  title,
  helpText,
  rows,
  columns
) {
  return form
    .addGridItem()
    .setTitle(title)
    .setHelpText(helpText)
    .setRows(rows)
    .setColumns(
      columns || CONFIG.LIKERT_7
    )
    .setRequired(true);
}


/**
 * ============================================================
 * CREAZIONE SCALA SINGOLA
 * ============================================================
 */
function addScale_(
  form,
  title,
  lowerBound,
  upperBound,
  leftLabel,
  rightLabel
) {
  return form
    .addScaleItem()
    .setTitle(title)
    .setBounds(
      lowerBound,
      upperBound
    )
    .setLabels(
      leftLabel,
      rightLabel
    )
    .setRequired(true);
}


/**
 * ============================================================
 * CREAZIONE DEI 10 PERCORSI
 * ============================================================
 */
function buildRoutes_() {
  const routes = [];
  let routeNumber = 1;

  EXPERIMENTAL_CONDITIONS
    .forEach(function(condition) {
      PRODUCTS
        .forEach(function(product) {
          routes.push({
            routeCode:
              condition.code +
              "_" +
              product.code,

            routeLabel:
              "Percorso " +
              String(routeNumber)
                .padStart(2, "0"),

            conditionCode:
              condition.code,

            conditionLabel:
              condition.label,

            productCode:
              product.code,

            productName:
              product.name,

            taste:
              product.taste,

            productionCountry:
              condition.productionCountry,

            promoterName:
              condition.promoterName,

            promoterCountry:
              condition.promoterCountry
          });

          routeNumber++;
        });
    });

  return routes;
}


/**
 * ============================================================
 * ASSEGNAZIONE CASUALE E BILANCIATA
 * ============================================================
 */
function assignRoute_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return assignRouteUnlocked_(); } finally { lock.releaseLock(); }
}

function assignRouteUnlocked_() {
  const props =
    PropertiesService.getScriptProperties();

  assertSetupComplete_(props);

  const routes =
    buildRoutes_();

  const condition =
    chooseLeastUsed_(
      EXPERIMENTAL_CONDITIONS,

      function(item) {
        return getCounter_(
          props,
          "ASSIGNED_CONDITION_" +
          item.code
        );
      }
    );

  const conditionRoutes =
    routes.filter(function(route) {
      return (
        route.conditionCode ===
        condition.code
      );
    });

  const route =
    chooseLeastUsed_(
      conditionRoutes,

      function(item) {
        return getCounter_(
          props,
          "ASSIGNED_ROUTE_" +
          item.routeCode
        );
      }
    );

  const conditionCount =
    incrementCounter_(
      props,
      "ASSIGNED_CONDITION_" +
      condition.code
    );

  const routeCount =
    incrementCounter_(
      props,
      "ASSIGNED_ROUTE_" +
      route.routeCode
    );

  const sequence =
    incrementCounterRaw_(
      props,
      CONFIG.PROP_SEQUENCE
    );

  const spreadsheet =
    SpreadsheetApp.openById(
      props.getProperty(
        CONFIG.PROP_SPREADSHEET_ID
      )
    );

  spreadsheet
    .getSheetByName(
      CONFIG.SHEET_ASSIGNMENTS
    )
    .appendRow([
      sequence,
      new Date(),
      route.routeLabel,
      route.conditionCode,
      route.productCode,
      conditionCount,
      routeCount
    ]);

  refreshCounterSheets_(
    spreadsheet,
    routes,
    props
  );

  return route;

}

/**
 * ============================================================
 * SCELTA TRA GLI ELEMENTI MENO UTILIZZATI
 * ============================================================
 */
function chooseLeastUsed_(
  items,
  countFunction
) {
  let minimum = Infinity;
  let candidates = [];

  items.forEach(function(item) {
    const count =
      countFunction(item);

    if (count < minimum) {
      minimum = count;
      candidates = [item];

    } else if (count === minimum) {
      candidates.push(item);
    }
  });

  if (!candidates.length) {
    throw new Error(
      "Nessun percorso disponibile."
    );
  }

  return candidates[
    Math.floor(
      Math.random() *
      candidates.length
    )
  ];
}


/**
 * ============================================================
 * URL PREFILLED
 * ============================================================
 */
function buildPrefilledFormUrl_(routeLabel) {
  const props =
    PropertiesService
      .getScriptProperties();

  assertSetupComplete_(props);

  const form =
    FormApp.openById(
      props.getProperty(
        CONFIG.PROP_FORM_ID
      )
    );

  const routingItem =
    form
      .getItemById(
        Number(
          props.getProperty(
            CONFIG.PROP_ROUTING_ITEM_ID
          )
        )
      )
      .asListItem();

  return form
    .createResponse()
    .withItemResponse(
      routingItem.createResponse(
        routeLabel
      )
    )
    .toPrefilledUrl();
}


/**
 * ============================================================
 * TRIGGER DI INVIO
 * ============================================================
 */
function onQuestionarioSubmitV6_(e) {
  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    if (!e || !e.response) {
      throw new Error(
        "Evento Form submit non valido."
      );
    }

    const props =
      PropertiesService
        .getScriptProperties();

    const routingItemId =
      Number(
        props.getProperty(
          CONFIG.PROP_ROUTING_ITEM_ID
        )
      );

    let routeLabel = "";

    e.response
      .getItemResponses()
      .some(function(itemResponse) {
        if (
          itemResponse
            .getItem()
            .getId() ===
          routingItemId
        ) {
          routeLabel =
            String(
              itemResponse.getResponse()
            );

          return true;
        }

        return false;
      });

    const routes =
      buildRoutes_();

    const route =
      routes.find(function(item) {
        return (
          item.routeLabel ===
          routeLabel
        );
      });

    if (!route) {
      throw new Error(
        "Percorso non riconosciuto nella risposta: " +
        routeLabel
      );
    }

    incrementCounter_(
      props,
      "COMPLETED_CONDITION_" +
      route.conditionCode
    );

    incrementCounter_(
      props,
      "COMPLETED_ROUTE_" +
      route.routeCode
    );

    const spreadsheet =
      SpreadsheetApp.openById(
        props.getProperty(
          CONFIG.PROP_SPREADSHEET_ID
        )
      );

    refreshCounterSheets_(
      spreadsheet,
      routes,
      props
    );

    logEvent_(
      spreadsheet,
      "FORM_SUBMIT",
      "OK",
      route.routeLabel,
      route.conditionCode +
      " | " +
      route.productCode
    );

  } catch (error) {
    console.error(
      error.stack || error
    );

    throw error;

  } finally {
    lock.releaseLock();
  }
}


/**
 * ============================================================
 * SPREADSHEET
 * ============================================================
 */
function getOrCreateSpreadsheet_(props) {
  const forcedId =
    CONFIG.EXISTING_SPREADSHEET_ID.trim();

  const savedId =
    props.getProperty(
      CONFIG.PROP_SPREADSHEET_ID
    );

  const candidateIds =
    [
      forcedId,
      savedId
    ]
    .filter(function(id) {
      return (
        typeof id === "string" &&
        id.trim() !== ""
      );
    });

  for (
    let i = 0;
    i < candidateIds.length;
    i++
  ) {
    try {
      const spreadsheet =
        SpreadsheetApp.openById(
          candidateIds[i]
        );

      props.setProperty(
        CONFIG.PROP_SPREADSHEET_ID,
        spreadsheet.getId()
      );

      return {
        spreadsheet: spreadsheet,
        created: false
      };

    } catch (error) {
      console.log(
        "Spreadsheet non apribile (ID " +
        candidateIds[i] +
        "): " +
        error.message
      );
    }
  }

  const spreadsheet =
    SpreadsheetApp.create(
      CONFIG.SPREADSHEET_NAME
    );

  props.setProperty(
    CONFIG.PROP_SPREADSHEET_ID,
    spreadsheet.getId()
  );

  return {
    spreadsheet: spreadsheet,
    created: true
  };
}


/**
 * ============================================================
 * COLLEGAMENTO FORM-SPREADSHEET
 * ============================================================
 */
function connectFormToSpreadsheet_(
  form,
  spreadsheet
) {
  const before = {};

  spreadsheet
    .getSheets()
    .forEach(function(sheet) {
      before[
        String(sheet.getSheetId())
      ] = true;
    });

  form.setDestination(
    FormApp.DestinationType.SPREADSHEET,
    spreadsheet.getId()
  );

  SpreadsheetApp.flush();
  Utilities.sleep(500);

  const createdSheet =
    spreadsheet
      .getSheets()
      .find(function(sheet) {
        return !before[
          String(sheet.getSheetId())
        ];
      });

  return createdSheet
    ? createdSheet.getName()
    : "";
}


/**
 * ============================================================
 * FOGLI DI CONTROLLO
 * ============================================================
 */
function prepareControlSheets_(spreadsheet) {
  prepareSheet_(
    spreadsheet,
    CONFIG.SHEET_CONDITIONS,
    [
      "condition_code",
      "condition_label",
      "production_country",
      "promoter_name",
      "promoter_country",
      "assigned",
      "completed"
    ]
  );

  prepareSheet_(
    spreadsheet,
    CONFIG.SHEET_ROUTES,
    [
      "route_label",
      "route_code",
      "condition_code",
      "product_code",
      "product_name",
      "target_taste",
      "production_country",
      "promoter_name",
      "promoter_country",
      "assigned",
      "completed"
    ]
  );

  prepareSheet_(
    spreadsheet,
    CONFIG.SHEET_ASSIGNMENTS,
    [
      "sequence",
      "timestamp",
      "route_label",
      "condition_code",
      "product_code",
      "condition_assigned_count",
      "route_assigned_count"
    ]
  );

  prepareSheet_(
    spreadsheet,
    CONFIG.SHEET_LOG,
    [
      "timestamp",
      "event",
      "status",
      "source",
      "message"
    ]
  );

  prepareSheet_(
    spreadsheet,
    CONFIG.SHEET_INSTRUCTIONS,
    [
      "voce",
      "valore"
    ]
  );
}


function prepareSheet_(
  spreadsheet,
  name,
  headers
) {
  let sheet =
    spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(name);
  }

  sheet.clearContents();

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([headers])
    .setFontWeight("bold");

  sheet.setFrozenRows(1);
}


/**
 * ============================================================
 * SCRITTURA CONDIZIONI E PERCORSI
 * ============================================================
 */
function writeConditionSheets_(
  spreadsheet,
  routes,
  props
) {
  const conditionRows =
    EXPERIMENTAL_CONDITIONS
      .map(function(condition) {
        return [
          condition.code,
          condition.label,
          condition.productionCountry,
          condition.promoterName,
          condition.promoterCountry,

          getCounter_(
            props,
            "ASSIGNED_CONDITION_" +
            condition.code
          ),

          getCounter_(
            props,
            "COMPLETED_CONDITION_" +
            condition.code
          )
        ];
      });

  const routeRows =
    routes.map(function(route) {
      return [
        route.routeLabel,
        route.routeCode,
        route.conditionCode,
        route.productCode,
        route.productName,
        route.taste,
        route.productionCountry,
        route.promoterName,
        route.promoterCountry,

        getCounter_(
          props,
          "ASSIGNED_ROUTE_" +
          route.routeCode
        ),

        getCounter_(
          props,
          "COMPLETED_ROUTE_" +
          route.routeCode
        )
      ];
    });

  writeRows_(
    spreadsheet.getSheetByName(
      CONFIG.SHEET_CONDITIONS
    ),
    conditionRows
  );

  writeRows_(
    spreadsheet.getSheetByName(
      CONFIG.SHEET_ROUTES
    ),
    routeRows
  );
}


function writeRows_(sheet, rows) {
  if (!rows.length) {
    return;
  }

  sheet
    .getRange(
      2,
      1,
      rows.length,
      rows[0].length
    )
    .setValues(rows);

  sheet.autoResizeColumns(
    1,
    rows[0].length
  );
}


/**
 * ============================================================
 * AGGIORNAMENTO CONTATORI
 * ============================================================
 */
function refreshCounterSheets_(
  spreadsheet,
  routes,
  props
) {
  const conditionCounts =
    EXPERIMENTAL_CONDITIONS
      .map(function(condition) {
        return [
          getCounter_(
            props,
            "ASSIGNED_CONDITION_" +
            condition.code
          ),

          getCounter_(
            props,
            "COMPLETED_CONDITION_" +
            condition.code
          )
        ];
      });

  spreadsheet
    .getSheetByName(
      CONFIG.SHEET_CONDITIONS
    )
    .getRange(
      2,
      6,
      conditionCounts.length,
      2
    )
    .setValues(conditionCounts);

  const routeCounts =
    routes.map(function(route) {
      return [
        getCounter_(
          props,
          "ASSIGNED_ROUTE_" +
          route.routeCode
        ),

        getCounter_(
          props,
          "COMPLETED_ROUTE_" +
          route.routeCode
        )
      ];
    });

  spreadsheet
    .getSheetByName(
      CONFIG.SHEET_ROUTES
    )
    .getRange(
      2,
      10,
      routeCounts.length,
      2
    )
    .setValues(routeCounts);
}


/**
 * ============================================================
 * INIZIALIZZAZIONE CONTATORI
 * ============================================================
 */
function initializeCounters_(props, routes) {
  EXPERIMENTAL_CONDITIONS
    .forEach(function(condition) {
      setCounterIfMissing_(
        props,
        "ASSIGNED_CONDITION_" +
        condition.code
      );

      setCounterIfMissing_(
        props,
        "COMPLETED_CONDITION_" +
        condition.code
      );
    });

  routes.forEach(function(route) {
    setCounterIfMissing_(
      props,
      "ASSIGNED_ROUTE_" +
      route.routeCode
    );

    setCounterIfMissing_(
      props,
      "COMPLETED_ROUTE_" +
      route.routeCode
    );
  });
}


function setCounterIfMissing_(props, suffix) {
  const key =
    CONFIG.PROP_PREFIX +
    suffix;

  if (
    props.getProperty(key) === null
  ) {
    props.setProperty(
      key,
      "0"
    );
  }
}


function getCounter_(props, suffix) {
  return Number(
    props.getProperty(
      CONFIG.PROP_PREFIX +
      suffix
    ) || 0
  );
}


function incrementCounter_(props, suffix) {
  const key =
    CONFIG.PROP_PREFIX +
    suffix;

  return incrementCounterRaw_(
    props,
    key
  );
}


function incrementCounterRaw_(props, key) {
  const value =
    Number(
      props.getProperty(key) || 0
    ) + 1;

  props.setProperty(
    key,
    String(value)
  );

  return value;
}


/**
 * ============================================================
 * TRIGGER
 * ============================================================
 */
function installCompletionTrigger_(form) {
  ScriptApp
    .getProjectTriggers()
    .forEach(function(trigger) {
      if (
        trigger.getHandlerFunction() ===
        CONFIG.COMPLETION_TRIGGER
      ) {
        ScriptApp.deleteTrigger(
          trigger
        );
      }
    });

  ScriptApp
    .newTrigger(
      CONFIG.COMPLETION_TRIGGER
    )
    .forForm(form)
    .onFormSubmit()
    .create();
}


/**
 * ============================================================
 * IMMAGINI
 * ============================================================
 */
function loadProductImages_() {
  const result = {};

  PRODUCTS.forEach(function(product) {
    result[product.code] =
      findImageFile_(
        product.imageNames
      ).getBlob();
  });

  return result;
}


function findImageFile_(candidateNames) {
  const folder =
    CONFIG.IMAGES_FOLDER_ID
      ? DriveApp.getFolderById(
          CONFIG.IMAGES_FOLDER_ID
        )
      : null;

  for (
    let i = 0;
    i < candidateNames.length;
    i++
  ) {
    const files =
      folder
        ? folder.getFilesByName(
            candidateNames[i]
          )
        : DriveApp.getFilesByName(
            candidateNames[i]
          );

    if (files.hasNext()) {
      return files.next();
    }
  }

  throw new Error(
    "Immagine non trovata. Nomi accettati: " +
    candidateNames.join(", ")
  );
}


/**
 * ============================================================
 * CARTELLA OUTPUT
 * ============================================================
 */
function getOutputFolder_() {
  if (CONFIG.OUTPUT_FOLDER_ID) {
    return DriveApp.getFolderById(
      CONFIG.OUTPUT_FOLDER_ID
    );
  }

  const folders =
    DriveApp.getFoldersByName(
      CONFIG.OUTPUT_FOLDER_NAME
    );

  return folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(
        CONFIG.OUTPUT_FOLDER_NAME
      );
}


function moveFileSafely_(fileId, folder) {
  try {
    DriveApp
      .getFileById(fileId)
      .moveTo(folder);

  } catch (error) {
    console.log(
      "Spostamento non eseguito per " +
      fileId +
      ": " +
      error.message
    );
  }
}


/**
 * ============================================================
 * ISTRUZIONI PER L’ANALISI
 * ============================================================
 */
function writeInstructions_(spreadsheet, form) {
  const webAppUrl =
    ScriptApp
      .getService()
      .getUrl();

  const responseSheet =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CONFIG.PROP_RESPONSE_SHEET
      ) ||
    "Foglio risposte creato da Google Forms";

  const rows = [
    [
      "Titolo",
      CONFIG.FORM_TITLE
    ],

    [
      "Disegno sperimentale",
      "2 condizioni × 5 prodotti = 10 gruppi"
    ],

    [
      "URL Web App da distribuire",
      webAppUrl ||
      "Aggiornare il deployment e rieseguire aggiornaIstruzioni()"
    ],

    [
      "URL diretto del Form",
      form.getPublishedUrl() +
      " — NON DISTRIBUIRE"
    ],

    [
      "Foglio delle risposte",
      responseSheet
    ],

    [
      "Aspettative gustative",
      "Dolce, aspro, salato, amaro e umami sono cinque variabili distinte: non calcolarne la media complessiva."
    ],

    [
      "Colore",
      "Congruenza, naturalezza e artificialità sono tre misure separate."
    ],

    [
      "Rischio per la salute",
      "I quattro item sono orientati nella stessa direzione: valori maggiori indicano maggiore rischio percepito."
    ],

    [
      "Credibilità dell’azienda",
      "Invertire gli item 4 e 8: 1→7; 2→6; 3→5; 4→4; 5→3; 6→2; 7→1."
    ],

    [
      "Atteggiamento verso il prodotto",
      "I cinque item possono essere aggregati dopo la verifica dell’affidabilità."
    ],

    [
      "Intenzione di acquisto",
      "I cinque item possono essere aggregati dopo la verifica dell’affidabilità."
    ],

    [
      "Assaggio e raccomandazione",
      "Mantenere le due domande separate dal punteggio di intenzione di acquisto."
    ],

    [
      "Distanza culturale",
      "Valori maggiori indicano maggiore distanza culturale percepita."
    ],

    [
      "Neofobia alimentare",
      "Scala a 6 item e 5 punti. Invertire gli item 1, 4 e 6: 1→5; 2→4; 3→3; 4→2; 5→1."
    ],

    [
      "Controllo tecnico",
      "Eseguire mostraStatoQuestionario() e diagnosticaQuestionario()."
    ]
  ];

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.SHEET_INSTRUCTIONS
    );

  if (
    sheet.getLastRow() > 1
  ) {
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        2
      )
      .clearContent();
  }

  sheet
    .getRange(
      2,
      1,
      rows.length,
      2
    )
    .setValues(rows);

  sheet.autoResizeColumns(
    1,
    2
  );
}


/**
 * ============================================================
 * AGGIORNA ISTRUZIONI
 * ============================================================
 */
function aggiornaIstruzioni() {
  ppAdmin_();
  const props =
    PropertiesService
      .getScriptProperties();

  assertSetupComplete_(props);

  const form =
    FormApp.openById(
      props.getProperty(
        CONFIG.PROP_FORM_ID
      )
    );

  const spreadsheet =
    SpreadsheetApp.openById(
      props.getProperty(
        CONFIG.PROP_SPREADSHEET_ID
      )
    );

  writeInstructions_(
    spreadsheet,
    form
  );
}


/**
 * ============================================================
 * MOSTRA STATO
 * ============================================================
 */
function mostraStatoQuestionario() {
  ppAdmin_();
  const props =
    PropertiesService
      .getScriptProperties();

  assertSetupComplete_(props);

  const form =
    FormApp.openById(
      props.getProperty(
        CONFIG.PROP_FORM_ID
      )
    );

  const spreadsheet =
    SpreadsheetApp.openById(
      props.getProperty(
        CONFIG.PROP_SPREADSHEET_ID
      )
    );

  console.log(
    "FORM modifica: " +
    form.getEditUrl()
  );

  console.log(
    "FORM diretto, NON DISTRIBUIRE: " +
    form.getPublishedUrl()
  );

  console.log(
    "SPREADSHEET: " +
    spreadsheet.getUrl()
  );

  console.log(
    "WEB APP: " +
    (
      ScriptApp.getService().getUrl() ||
      "non distribuito"
    )
  );

  console.log(
    "PERCORSI TOTALI: " +
    buildRoutes_().length
  );

  EXPERIMENTAL_CONDITIONS
    .forEach(function(condition) {
      console.log(
        condition.label +
        " | assegnati=" +

        getCounter_(
          props,
          "ASSIGNED_CONDITION_" +
          condition.code
        ) +

        " | completati=" +

        getCounter_(
          props,
          "COMPLETED_CONDITION_" +
          condition.code
        )
      );
    });
}


/**
 * ============================================================
 * DIAGNOSTICA
 * ============================================================
 */
function diagnosticaQuestionario() {
  ppAdmin_();
  const props =
    PropertiesService
      .getScriptProperties();

  assertSetupComplete_(props);

  const form =
    FormApp.openById(
      props.getProperty(
        CONFIG.PROP_FORM_ID
      )
    );

  const spreadsheet =
    SpreadsheetApp.openById(
      props.getProperty(
        CONFIG.PROP_SPREADSHEET_ID
      )
    );

  const routingItem =
    form
      .getItemById(
        Number(
          props.getProperty(
            CONFIG.PROP_ROUTING_ITEM_ID
          )
        )
      )
      .asListItem();

  const checks = {
    titleCorrect:
      form.getTitle() ===
      CONFIG.FORM_TITLE,

    destinationCorrect:
      form.getDestinationId() ===
      spreadsheet.getId(),

    conditions:
      EXPERIMENTAL_CONDITIONS.length,

    expectedConditions:
      2,

    products:
      PRODUCTS.length,

    expectedProducts:
      5,

    routingChoices:
      routingItem.getChoices().length,

    expectedRoutingChoices:
      10,

    routesGenerated:
      buildRoutes_().length,

    completionTriggers:
      ScriptApp
        .getProjectTriggers()
        .filter(function(trigger) {
          return (
            trigger.getHandlerFunction() ===
            CONFIG.COMPLETION_TRIGGER
          );
        })
        .length,

    acceptingResponses:
      form.isAcceptingResponses()
  };

  console.log(
    JSON.stringify(
      checks,
      null,
      2
    )
  );

  return checks;
}


/**
 * ============================================================
 * RESET V6
 * ============================================================
 *
 * Non cancella Form, Spreadsheet o risposte.
 */
function resetConfigurazioneV6() {
  ppAdmin_();
  if (ppActive_()) throw new Error("Reset bloccato: il gioco usa la configurazione V6 esistente.");
  ScriptApp
    .getProjectTriggers()
    .forEach(function(trigger) {
      if (
        trigger.getHandlerFunction() ===
        CONFIG.COMPLETION_TRIGGER
      ) {
        ScriptApp.deleteTrigger(
          trigger
        );
      }
    });

  const props =
    PropertiesService
      .getScriptProperties();

  const allProperties =
    props.getProperties();

  Object.keys(allProperties)
    .forEach(function(key) {
      if (
        key.indexOf(
          CONFIG.PROP_PREFIX
        ) === 0
      ) {
        props.deleteProperty(key);
      }
    });

  console.log(
    "Configurazione V6 rimossa. Nessun file o dato è stato cancellato."
  );
}


/**
 * ============================================================
 * CONTROLLO SETUP
 * ============================================================
 */
function assertSetupComplete_(props) {
  if (
    props.getProperty(
      CONFIG.PROP_SETUP
    ) !== "TRUE"
  ) {
    throw new Error(
      "Eseguire prima setupQuestionarioUnico()."
    );
  }
}


/**
 * ============================================================
 * LOG
 * ============================================================
 */
function logEvent_(
  spreadsheet,
  eventName,
  status,
  source,
  message
) {
  try {
    const sheet =
      spreadsheet.getSheetByName(
        CONFIG.SHEET_LOG
      );

    sheet.appendRow([
      new Date(),
      eventName,
      status,
      source,
      message
    ]);

  } catch (error) {
    console.error(
      "Errore LOG: " +
      error.message
    );
  }
}


/**
 * ============================================================
 * ESCAPE HTML
 * ============================================================
 */
function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * PASSAPAROLA V1 — estensione del questionario V6.
 * Il registro PP_Invii è la fonte dei punteggi. Nessun clic assegna punti.
 * Le funzioni con suffisso _ non sono esposte a google.script.run.
 */
