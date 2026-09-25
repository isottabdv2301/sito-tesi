import "./styles.css";
import { getBoard, getStatus, joinGame, type ApiState, type Player } from "./api";

const STORAGE_KEY = "passaparola_v6_private_key";
const referral = new URLSearchParams(window.location.search).get("ref") || "";
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) throw new Error("Elemento #app mancante.");

app.innerHTML = `
  <div class="wrap">
    <header>
      <div class="brand"><span class="mark" aria-hidden="true">P</span><div><strong>Passaparola</strong><small>Ricerca tesi</small></div></div>
      <a class="header-link" href="#classifica">Vai alla classifica</a>
    </header>
    <div class="page-intro"><div><p class="eyebrow">Compila · invita · partecipa</p><h1>Fai crescere la ricerca.</h1></div><p class="small muted">Ogni compilazione da un tuo invito vale 1 punto.</p></div>
    <div id="error" class="error" role="alert" hidden></div>
    <div id="storage-note" class="notice" hidden>Questo browser non conserva il tuo accesso. Salva il codice privato prima di aprire il questionario.</div>
    <main class="grid">
      <div>
        <section class="card main-card" aria-label="La tua partecipazione"><div class="card-pad">
          <div id="initial-loading" class="loading" role="status">Caricamento della tua partecipazione…</div>
          <div id="join-view" hidden>
            <div id="invitation" class="invited" hidden></div>
            <h2>Entra nel gioco</h2><p class="subline">Aiuta una ricerca universitaria sulle impressioni relative ai prodotti alimentari.</p>
            <ol class="steps"><li><span class="step-no">1</span><div><h3>Compila il questionario</h3><p>Circa 10–12 minuti. Rispondi secondo la tua opinione.</p></div></li><li><span class="step-no">2</span><div><h3>Ricevi il tuo link personale</h3><p>Si sblocca dopo la verifica dell’invio.</p></div></li><li><span class="step-no">3</span><div><h3>Invita e sali in classifica</h3><p>Un punto per ogni nuova compilazione completa.</p></div></li></ol>
            <label class="check"><input id="game-consent" type="checkbox"><span>Partecipo a Passaparola: il mio codice e il punteggio compariranno in classifica. Le risposte del questionario restano riservate.</span></label>
            <button id="join" class="btn primary full" type="button">Crea il mio accesso</button>
            <p class="hint">La partecipazione alla ricerca richiede almeno 18 anni e il rispetto dei criteri indicati nel questionario.</p>
          </div>
          <div id="player-view" hidden>
            <div id="player-status" class="status-label"></div>
            <p class="player-code">Il tuo codice pubblico <strong id="player-id" class="mono"></strong></p>
            <div id="waiting-view" hidden><h2>Il questionario ti aspetta.</h2><p class="subline">Aprilo, invialo e poi torna qui per ricevere il tuo link personale.</p><a id="open-form" class="btn primary full" href="#" target="_blank" rel="noopener noreferrer">Apri il questionario ↗</a><div class="buttons"><button id="verify" type="button" class="btn full">Verifica invio</button></div><p id="verification-note" class="hint">Il link da condividere si sblocca dopo un invio completo e valido.</p></div>
            <div id="complete-view" hidden><h2>Ora tocca al passaparola.</h2><div class="metric-row"><div><div id="points" class="score">0</div><span>compilazioni dai tuoi inviti</span></div><div><div id="position" class="position">—</div><span>la tua posizione</span></div></div><div class="share"><label for="share-link">Questo è il link da condividere</label><input id="share-link" class="field" type="text" readonly><div class="buttons"><button id="copy-link" class="btn primary" type="button">Copia link</button><a id="whatsapp" class="btn" target="_blank" rel="noopener noreferrer">WhatsApp</a><a id="telegram" class="btn" target="_blank" rel="noopener noreferrer">Telegram</a></div><p class="hint">Condividi il link senza anticipare prodotti o domande.</p></div></div>
            <div id="excluded-view" hidden><h2>Grazie per il tuo tempo.</h2><p class="subline">La compilazione non soddisfa i criteri di partecipazione. Questo invio non assegna punti.</p></div>
            <div id="review-view" hidden><h2>L’invio richiede una verifica.</h2><p class="subline">Non è stato possibile confermare completezza o percorso. Contatta l’organizzatrice indicando il codice pubblico.</p><button id="review-check" class="btn full" type="button">Controlla di nuovo</button></div>
            <details class="box" id="recovery-code"><summary>Salva il codice privato di recupero</summary><p>Conservalo per ritrovare il profilo da un altro browser. Per invitare usa il link personale.</p><input id="private-code" class="field mono" type="text" readonly aria-label="Codice privato di recupero"><div class="buttons"><button id="copy-code" class="btn" type="button">Copia codice privato</button></div></details>
          </div>
          <details class="box" id="restore-box"><summary>Hai già partecipato? Recupera il profilo</summary><form id="restore-form"><label class="small" for="restore-code">Codice privato di recupero</label><input id="restore-code" class="field mono" type="text" autocomplete="off" spellcheck="false" placeholder="Incolla il codice salvato" required><div class="buttons"><button id="restore" class="btn" type="submit">Recupera il mio profilo</button></div></form></details>
        </div></section>
        <details class="card rules"><summary>Come vengono contati i punti</summary><ul><li>Un nuovo invio completo dal tuo link vale 1 punto.</li><li>I clic, i duplicati e le uscite anticipate non danno punti.</li><li>Le risposte sul prodotto non modificano il punteggio.</li><li>La classifica mostra soltanto codici pubblici e punti.</li></ul></details>
      </div>
      <section class="card" id="classifica" aria-labelledby="board-title"><div class="board-head"><div><h2 id="board-title">La classifica</h2><span id="board-count" class="count">Partecipazioni completate</span></div><button id="refresh" class="refresh" type="button" aria-label="Aggiorna classifica" title="Aggiorna classifica">↻</button></div><div id="board-loading" class="loading" role="status">Caricamento della classifica…</div><div id="empty-board" class="empty" hidden><div class="empty-symbol" aria-hidden="true">01</div><h3>La prima posizione ti aspetta.</h3><p>La classifica si popola con le prime compilazioni complete.</p></div><div class="table-scroll" id="table-wrap" hidden><table><thead><tr><th>Pos.</th><th>Partecipante</th><th>Punti</th></tr></thead><tbody id="board-body"></tbody></table></div><p id="board-note" class="board-note">1 punto = 1 compilazione completa da un tuo invito.</p></section>
    </main>
    <footer class="bottom">Il gioco usa un codice generato e non richiede nome, email o telefono. Nessuna risposta viene mostrata nella classifica.</footer>
  </div>
  <div id="toast" class="toast" role="status" hidden></div>
`;

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento mancante: ${id}`);
  return element as T;
};

const errorBox = $("error");
const initialLoading = $("initial-loading");
const joinView = $("join-view");
const playerView = $("player-view");
const storageNote = $("storage-note");
const boardLoading = $("board-loading");
const emptyBoard = $("empty-board");
const tableWrap = $("table-wrap");
const boardBody = $("board-body");
const boardCount = $("board-count");
const boardNote = $("board-note");
const invitation = $("invitation");
const playerStatus = $("player-status");
const timer = { id: 0 as number | undefined };
let key = readKey();
let state: ApiState | null = null;
let busy = false;

if (referral) {
  invitation.textContent = /^[A-F0-9]{12}$/.test(referral)
    ? `Hai ricevuto l’invito di ${referral}.`
    : "Questo link di invito non è valido. Chiedi un nuovo link.";
  invitation.hidden = false;
}

function readKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || "";
    return /^[a-f0-9]{64}$/.test(saved) ? saved : "";
  } catch {
    storageNote.hidden = false;
    return "";
  }
}

function saveKey(value: string): void {
  key = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
    storageNote.hidden = localStorage.getItem(STORAGE_KEY) === value;
  } catch {
    storageNote.hidden = false;
    $("recovery-code").setAttribute("open", "true");
  }
}

function randomKey(): string {
  if (!window.crypto?.getRandomValues) throw new Error("Usa un browser aggiornato per creare l’accesso.");
  return Array.from(window.crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, "0")).join("");
}

function showError(error: unknown): void {
  errorBox.textContent = error instanceof Error ? error.message : String(error);
  errorBox.hidden = false;
}

function clearError(): void { errorBox.hidden = true; }

function toast(message: string): void {
  const box = $("toast");
  box.textContent = message;
  box.hidden = false;
  window.setTimeout(() => { box.hidden = true; }, 3500);
}

function setBusy(value: boolean): void {
  busy = value;
  ["join", "verify", "refresh", "restore", "review-check"].forEach((id) => {
    const element = document.getElementById(id) as HTMLButtonElement | null;
    if (element) element.disabled = value;
  });
}

function renderBoard(data: ApiState): void {
  boardLoading.hidden = true;
  boardCount.textContent = `${data.total} ${data.total === 1 ? "partecipante" : "partecipanti"} in classifica`;
  emptyBoard.hidden = data.board.length > 0;
  tableWrap.hidden = data.board.length === 0;
  boardBody.replaceChildren();
  data.board.forEach((row) => {
    const tr = document.createElement("tr");
    if (row.rank === 1) tr.classList.add("rank-one");
    if (data.player?.id === row.id) tr.classList.add("your-row");
    const rank = document.createElement("td"); rank.textContent = String(row.rank);
    const id = document.createElement("td");
    const label = document.createElement("span"); label.className = "mono"; label.textContent = row.id; id.appendChild(label);
    if (data.player?.id === row.id) { const tag = document.createElement("span"); tag.className = "you-tag"; tag.textContent = "TU"; id.appendChild(tag); }
    const points = document.createElement("td"); points.className = "points"; points.textContent = String(row.points);
    tr.append(rank, id, points); boardBody.appendChild(tr);
  });
  boardNote.textContent = data.total > 100 ? "Prime 100 posizioni; la tua posizione completa è nel pannello personale." : "1 punto = 1 compilazione completa da un tuo invito.";
}

function renderPlayer(player: Player | null): void {
  initialLoading.hidden = true;
  joinView.hidden = Boolean(player);
  playerView.hidden = !player;
  if (!player) return;
  $("player-id").textContent = player.id;
  ($("private-code") as HTMLInputElement).value = key;
  ["waiting", "complete", "excluded", "review"].forEach((name) => {
    $(`${name}-view`).hidden = player.status !== name.toUpperCase();
  });
  playerStatus.textContent = { WAITING: "01 · Compila il questionario", COMPLETE: "Invio verificato", EXCLUDED: "Partecipazione conclusa", REVIEW: "Verifica necessaria" }[player.status];
  playerStatus.classList.toggle("success", player.status === "COMPLETE");
  if (player.status === "WAITING") $("open-form").setAttribute("href", player.formUrl);
  if (player.status === "COMPLETE") {
    $("points").textContent = String(player.points);
    $("position").textContent = player.rank ? `#${player.rank}` : "—";
    ($("share-link") as HTMLInputElement).value = player.referralUrl;
    const message = "Ti va di partecipare a una ricerca universitaria? Il questionario richiede circa 10–12 minuti. ";
    $("whatsapp").setAttribute("href", `https://wa.me/?text=${encodeURIComponent(message + player.referralUrl)}`);
    $("telegram").setAttribute("href", `https://t.me/share/url?url=${encodeURIComponent(player.referralUrl)}&text=${encodeURIComponent(message)}`);
  }
}

function render(data: ApiState): void { state = data; renderBoard(data); renderPlayer(data.player); }

function schedule(): void {
  window.clearTimeout(timer.id);
  if (!state?.player || ["EXCLUDED", "REVIEW"].includes(state.player.status)) return;
  timer.id = window.setTimeout(() => { void refresh(false); }, state.player.status === "WAITING" ? 30000 : 60000);
}

async function refresh(manual: boolean): Promise<void> {
  if (busy) return;
  setBusy(true); if (manual) clearError();
  try {
    const data = key ? await getStatus(key) : await getBoard();
    const wasWaiting = state?.player?.status === "WAITING";
    render(data);
    if (wasWaiting && data.player?.status === "COMPLETE") toast("Invio verificato! Il tuo link è pronto.");
    else if (manual) toast("Classifica aggiornata.");
  } catch (error) {
    showError(error); initialLoading.hidden = true; boardLoading.textContent = "Classifica non disponibile. Premi Aggiorna per riprovare.";
  } finally { setBusy(false); schedule(); }
}

$("join").addEventListener("click", async () => {
  if (busy) return;
  if (!( $("game-consent") as HTMLInputElement).checked) { showError(new Error("Se vuoi partecipare, seleziona la casella sopra.")); return; }
  clearError(); setBusy(true);
  try { if (!key) saveKey(randomKey()); render(await joinGame(key, referral)); $("recovery-code").setAttribute("open", "true"); }
  catch (error) { showError(error); }
  finally { setBusy(false); }
});

$("restore-form").addEventListener("submit", async (event) => {
  event.preventDefault(); if (busy) return;
  const candidate = ($("restore-code") as HTMLInputElement).value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(candidate)) { showError(new Error("Il codice privato deve contenere 64 caratteri esadecimali.")); return; }
  clearError(); setBusy(true);
  try { const data = await getStatus(candidate); if (!data.player) throw new Error("Codice non riconosciuto."); saveKey(candidate); render(data); toast("Profilo recuperato."); }
  catch (error) { showError(error); }
  finally { setBusy(false); }
});

async function copyField(id: string, message: string): Promise<void> {
  const field = $(id) as HTMLInputElement; field.focus(); field.select();
  try { await navigator.clipboard.writeText(field.value); toast(message); }
  catch { document.execCommand("copy"); toast(message); }
}

$("copy-link").addEventListener("click", () => void copyField("share-link", "Link copiato."));
$("copy-code").addEventListener("click", () => void copyField("private-code", "Codice privato copiato."));
["verify", "refresh", "review-check"].forEach((id) => $(id).addEventListener("click", () => void refresh(true)));
document.addEventListener("visibilitychange", () => { if (document.hidden) window.clearTimeout(timer.id); else void refresh(false); });
void refresh(false);
