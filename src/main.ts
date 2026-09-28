import "./styles.css";
import { getBoard, getStatus, joinGame, type ApiState, type Player } from "./api";

const SHARE_MESSAGE = "Ciao! ✨Ti chiedo se puoi compilare il mio questionario 🙏🏻\n\nCOME FUNZIONA? ⚙️\n1. Apri il link \n2. Salva il tuo codice\n3. Clicca Compila il questionario \n4. Al termine del questionario troverai un link da condividere \n----> Più persone compileranno il questionario con il tuo link, più salirai in classifica, \nIL PRIMO CLASSIFICATO RICEVERÀ UNA RICOMPENSA 💸💸💸\n\nRICORDATI DI SALVARE IL TUO CODICE COSÌ DA POTER CONTROLLARE IL TUO POSTO IN CLASSIFICA\n\nGrazieeee! 💛";
const invitationMessage = (url: string): string => `${SHARE_MESSAGE}\n\n${url}`;

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
    <div class="notice reward-notice"><strong>Il primo classificato riceverà una RICOMPENSA 💸💸💸</strong><p>Se il giorno <strong>25 ottobre</strong> vedi che il tuo posto in classifica è il <strong>1°</strong>, contattami alla mail: <a href="mailto:isotta2301@gmail.com"><em>isotta2301@gmail.com</em></a> per riscattare la tua <strong>ricompensa</strong>!</p></div>
    <div id="error" class="error" role="alert" hidden></div>
    <div id="storage-note" class="notice" hidden>Questo browser non conserva il tuo accesso. Mantieni aperta questa pagina durante la compilazione.</div>
    <main class="grid">
      <div>
        <section class="card main-card" aria-label="La tua partecipazione"><div class="card-pad">
          <div id="instructions-view">
            <h2>ISTRUZIONI:</h2>
            <ol class="steps">
              <li><span class="step-no" aria-hidden="true">1</span><div>Clicca su <strong>crea il mio accesso</strong> per accedere al questionario</div></li>
              <li><span class="step-no" aria-hidden="true">2</span><div>Clicca su <strong>compila il questionario</strong> e procedi con la compilazione</div></li>
              <li><span class="step-no" aria-hidden="true">3</span><div>Al termine della compilazione troverai il <strong>link da condividere</strong> per iniziare a guadagnare punti (ogni questionario completato con il link da te inviato, vale <strong>1 PUNTO</strong>)</div></li>
              <li><span class="step-no" aria-hidden="true">4</span><div>Monitora la <strong>classifica</strong> per vedere se hai vinto</div></li>
            </ol>
          </div>
          <div id="initial-loading" class="loading" role="status">Caricamento della tua partecipazione…</div>
          <div id="join-view" hidden>
            <div id="invitation" class="invited" hidden></div>
            <label class="check"><input id="game-consent" type="checkbox"><span>Partecipo a Passaparola: il mio codice e il punteggio compariranno in classifica. Le risposte del questionario restano riservate.</span></label>
            <button id="join" class="btn primary full" type="button">Crea il mio accesso</button>
            <p class="hint">La partecipazione alla ricerca richiede almeno 18 anni e il rispetto dei criteri indicati nel questionario.</p>
          </div>
          <div id="player-view" hidden>
            <div id="player-status" class="status-label"></div>
            <p class="player-code">Il tuo codice pubblico è <strong id="player-id" class="mono"></strong></p>
            <div id="waiting-view" hidden><h2>Il questionario ti aspetta.</h2><a id="open-form" class="btn primary full" href="#" target="_blank" rel="noopener noreferrer">Compila il questionario ↗</a><div class="buttons"><button id="verify" type="button" class="btn full">Verifica invio</button></div><p id="verification-note" class="hint">Il link da condividere si sblocca dopo un invio completo e valido.</p></div>
            <div id="complete-view" hidden><h2>Ora tocca al passaparola.</h2><div class="metric-row"><div><div id="points" class="score">0</div><span>compilazioni dai tuoi inviti</span></div><div><div id="position" class="position">—</div><span>la tua posizione</span></div></div><div class="share"><label for="share-link">Questo è il link da condividere</label><input id="share-link" class="field" type="text" readonly><div class="buttons"><button id="copy-message" class="btn primary" type="button">Copia messaggio e link</button><a id="whatsapp" class="btn" target="_blank" rel="noopener noreferrer">WhatsApp</a><a id="telegram" class="btn" target="_blank" rel="noopener noreferrer">Telegram</a></div><p class="hint">Condividi il link senza anticipare prodotti o domande.</p></div></div>
            <div id="excluded-view" hidden><h2>Grazie per il tuo tempo.</h2><p class="subline">La compilazione non soddisfa i criteri di partecipazione. Questo invio non assegna punti.</p></div>
            <div id="review-view" hidden><h2>L’invio richiede una verifica.</h2><p class="subline">Non è stato possibile confermare completezza o percorso. Contatta l’organizzatrice indicando il codice pubblico.</p><button id="review-check" class="btn full" type="button">Controlla di nuovo</button></div>
          </div>
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
  ["join", "verify", "refresh", "review-check"].forEach((id) => {
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
  $("instructions-view").hidden = Boolean(player);
  joinView.hidden = Boolean(player);
  playerView.hidden = !player;
  if (!player) return;
  $("player-id").textContent = player.id;
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
    // Pass the UTF-8 message directly to WhatsApp, avoiding the wa.me redirect.
    $("whatsapp").setAttribute("href", `https://api.whatsapp.com/send?text=${encodeURIComponent(invitationMessage(player.referralUrl))}`);
    $("telegram").setAttribute("href", `https://t.me/share/url?url=${encodeURIComponent(player.referralUrl)}&text=${encodeURIComponent(SHARE_MESSAGE)}`);
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
  try { if (!key) saveKey(randomKey()); render(await joinGame(key, referral)); }
  catch (error) { showError(error); }
  finally { setBusy(false); }
});

async function copyText(text: string, message: string): Promise<void> {
  try {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const temporary = document.createElement("textarea");
      temporary.value = text;
      temporary.readOnly = true;
      temporary.style.position = "fixed";
      temporary.style.left = "-10000px";
      document.body.appendChild(temporary);
      try {
        temporary.select();
        if (!document.execCommand("copy")) throw new Error("Copia non riuscita. Usa WhatsApp o Telegram, oppure seleziona e copia il link.");
      } finally { temporary.remove(); }
    }
    toast(message);
  } catch (error) { showError(error); }
}

$("copy-message").addEventListener("click", () => {
  if (state?.player?.status === "COMPLETE") void copyText(invitationMessage(state.player.referralUrl), "Messaggio e link copiati.");
});
["verify", "refresh", "review-check"].forEach((id) => $(id).addEventListener("click", () => void refresh(true)));
document.addEventListener("visibilitychange", () => { if (document.hidden) window.clearTimeout(timer.id); else void refresh(false); });
void refresh(false);
