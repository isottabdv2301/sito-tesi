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

const configuredUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_URL = configuredUrl || "https://script.google.com/macros/s/AKfycbxb4mKFseUXTiV3Ms4LmcccD8RjfdrOj2BY1ZJlBuqlCmEvEEKhu6k0OHZqxUFKn2tg/exec";

async function parseResponse(response: Response): Promise<ApiState> {
  const body = (await response.json()) as ApiState & ApiErrorPayload;
  if (!response.ok || body.ok === false || body.error) {
    throw new Error(body.error || body.message || "La richiesta non è andata a buon fine.");
  }
  return body;
}

async function post(payload: Record<string, unknown>): Promise<ApiState> {
  const response = await fetch(API_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

async function get(action: string): Promise<ApiState> {
  const url = new URL(API_URL);
  url.searchParams.set("api", action);
  const response = await fetch(url, { method: "GET", mode: "cors" });
  return parseResponse(response);
}

export function getBoard(): Promise<ApiState> {
  return get("board");
}

export function getStatus(key: string): Promise<ApiState> {
  return post({ action: "status", key });
}

export function joinGame(key: string, referral: string): Promise<ApiState> {
  return post({ action: "join", key, referral });
}
