export interface BoardRow {
  id: string;
  points: number;
  rank: number;
}

export type PlayerStatus = "WAITING" | "COMPLETE" | "EXCLUDED" | "REVIEW";

export interface Player {
  id: string;
  status: PlayerStatus;
  points: number;
  rank: number | null;
  formUrl: string;
  referralUrl: string;
  reason: string;
}

export interface ApiState {
  board: BoardRow[];
  total: number;
  updated: string;
  player: Player | null;
}

export interface ApiErrorPayload {
  ok?: false;
  error?: string;
  message?: string;
}

interface BridgeResponse {
  type: "passaparola-ready" | "passaparola-response";
  id?: string;
  payload?: unknown;
  error?: string;
}

interface PendingRequest {
  resolve: (value: ApiState) => void;
  reject: (reason: Error) => void;
  timer: number;
}

const configuredUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_URL = configuredUrl || "https://script.google.com/macros/s/AKfycbwcyHebHDURQBfilKiCUBTbPFIpkS4-2GbPAH1Rlx8_XgR4FcNoee6mRWNDjw3wk_CJLw/exec";

let bridgeFrame: HTMLIFrameElement | null = null;
let bridgeOrigin = "";
let bridgePromise: Promise<void> | null = null;
let resolveBridge: (() => void) | null = null;
let rejectBridge: ((error: Error) => void) | null = null;
let bridgeTimer: number | null = null;
let requestSequence = 0;
const pending = new Map<string, PendingRequest>();

function isAppsScriptOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "script.google.com" || host === "googleusercontent.com" || host.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

function toError(value: unknown, fallback: string): Error {
  if (value instanceof Error) return value;
  if (value && typeof value === "object" && "message" in value) return new Error(String((value as { message: unknown }).message));
  return new Error(fallback);
}

/** Apps Script avvolge la pagina HTML in più iframe. Attraversa l'albero
 * dei frame per consegnare la richiesta al documento HTML del bridge. */
function bridgeFrameWindows(): Window[] {
  const root = bridgeFrame?.contentWindow;
  if (!root) return [];
  const result: Window[] = [];
  const queue: Window[] = [root];
  const seen = new Set<Window>();
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    result.push(current);
    try {
      for (let i = 0; i < current.frames.length; i++) queue.push(current.frames[i]);
    } catch {
      // A frame that cannot be inspected is skipped; other descendants remain usable.
    }
  }
  return result;
}

function isBridgeFrameSource(source: MessageEventSource | null): boolean {
  if (!source) return false;
  return bridgeFrameWindows().some((frame) => (frame as unknown) === source);
}

function postToBridgeFrames(message: unknown): void {
  if (!bridgeOrigin) throw new Error("Connessione al backend non pronta.");
  const frames = bridgeFrameWindows();
  if (!frames.length) throw new Error("Frame del backend non disponibile.");
  frames.forEach((frame) => {
    try {
      frame.postMessage(message, bridgeOrigin);
    } catch {
      // Different Apps Script wrapper frames can have different origins.
    }
  });
}

function parsePayload(payload: unknown): ApiState {
  if (!payload || typeof payload !== "object") throw new Error("Risposta del backend non valida.");
  const body = payload as ApiState & ApiErrorPayload;
  if (body.ok === false || body.error) throw new Error(body.error || body.message || "La richiesta non è andata a buon fine.");
  return body;
}

function failBridge(error: Error): void {
  if (bridgeTimer !== null) window.clearTimeout(bridgeTimer);
  bridgeTimer = null;
  const reject = rejectBridge;
  bridgePromise = null;
  resolveBridge = null;
  rejectBridge = null;
  bridgeOrigin = "";
  if (bridgeFrame) bridgeFrame.remove();
  bridgeFrame = null;
  if (reject) reject(error);
}

function onBridgeMessage(event: MessageEvent<BridgeResponse>): void {
  if (!bridgeFrame || !isBridgeFrameSource(event.source) || !isAppsScriptOrigin(event.origin)) return;
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (message.type === "passaparola-ready") {
    bridgeOrigin = event.origin;
    if (bridgeTimer !== null) window.clearTimeout(bridgeTimer);
    bridgeTimer = null;
    const resolve = resolveBridge;
    resolveBridge = null;
    rejectBridge = null;
    if (resolve) resolve();
    return;
  }

  if (message.type !== "passaparola-response" || typeof message.id !== "string") return;
  const request = pending.get(message.id);
  if (!request) return;
  window.clearTimeout(request.timer);
  pending.delete(message.id);
  if (message.error) {
    request.reject(new Error(message.error));
    return;
  }
  try {
    request.resolve(parsePayload(message.payload));
  } catch (error) {
    request.reject(toError(error, "Risposta del backend non valida."));
  }
}

window.addEventListener("message", onBridgeMessage);

function ensureBridge(): Promise<void> {
  if (bridgePromise) return bridgePromise;
  bridgePromise = new Promise<void>((resolve, reject) => {
    resolveBridge = resolve;
    rejectBridge = reject;
    bridgeTimer = window.setTimeout(() => {
      failBridge(new Error("Connessione al backend non riuscita. Aggiorna la Web App Apps Script e verifica che sia accessibile a chiunque."));
    }, 20000);

    const frame = document.createElement("iframe");
    frame.title = "Connessione sicura al backend Passaparola";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.referrerPolicy = "no-referrer";
    Object.assign(frame.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "1px",
      height: "1px",
      border: "0",
      visibility: "hidden",
      pointerEvents: "none",
    });
    frame.addEventListener("error", () => failBridge(new Error("Non riesco ad aprire il collegamento Apps Script.")), { once: true });
    const url = new URL(API_URL);
    url.searchParams.set("bridge", "1");
    frame.src = url.toString();
    bridgeFrame = frame;
    document.body.appendChild(frame);
  });
  return bridgePromise;
}

async function request(payload: Record<string, unknown>): Promise<ApiState> {
  await ensureBridge();
  if (!bridgeFrame?.contentWindow || !bridgeOrigin) throw new Error("Connessione al backend non pronta.");
  const id = `${Date.now()}-${++requestSequence}`;
  return new Promise<ApiState>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error("Il backend Passaparola non ha risposto. Riprova tra poco."));
    }, 30000);
    pending.set(id, { resolve, reject, timer });
    try {
      postToBridgeFrames({ type: "passaparola-request", id, payload });
    } catch (error) {
      window.clearTimeout(timer);
      pending.delete(id);
      reject(toError(error, "Invio della richiesta non riuscito."));
    }
  });
}

export function getBoard(): Promise<ApiState> {
  return request({ action: "board" });
}

export function getStatus(key: string): Promise<ApiState> {
  return request({ action: "status", key });
}

export function joinGame(key: string, referral: string): Promise<ApiState> {
  return request({ action: "join", key, referral });
}
