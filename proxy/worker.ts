/**
 * Proxy CORS opzionale per GitHub Pages.
 * Distribuire come Cloudflare Worker o funzione edge equivalente.
 * Impostare APPS_SCRIPT_URL come variabile d'ambiente del Worker.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  async fetch(request: Request, env: { APPS_SCRIPT_URL: string }): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (!env.APPS_SCRIPT_URL) return new Response(JSON.stringify({ ok: false, error: "APPS_SCRIPT_URL non configurata." }), { status: 500, headers: corsHeaders });

    const target = new URL(env.APPS_SCRIPT_URL);
    const incoming = new URL(request.url);
    incoming.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    const init: RequestInit = { method: request.method, redirect: "follow", headers: { "Content-Type": "text/plain;charset=UTF-8" } };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.text();

    try {
      const upstream = await fetch(target, init);
      const text = await upstream.text();
      return new Response(text, { status: upstream.status, headers: corsHeaders });
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Backend Passaparola non raggiungibile." }), { status: 502, headers: corsHeaders });
    }
  },
};
