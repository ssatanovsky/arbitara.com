/**
 * Arbitara admin API — Cloudflare Worker.
 *
 * Holds the GitHub token + admin password server-side, so the /admin/ page can
 * log in with just a password and never handles a GitHub token in the browser.
 *
 * Set these in the Cloudflare dashboard → your Worker → Settings → Variables:
 *   Secrets:
 *     GITHUB_TOKEN    fine-grained PAT with Contents: Read and write on the repo
 *     ADMIN_PASSWORD  the password you'll type to log into /admin/
 *     SESSION_SECRET  any long random string (signs login sessions)
 *   Plain vars (optional — these are the defaults):
 *     ALLOW_ORIGIN    https://arbitara.com
 *     REPO            ssatanovsky/arbitara.com
 *     FILE            config.json
 *     BRANCH          main
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes) {
  let s = btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function decodeB64Utf8(b64) {
  const bin = atob(String(b64).replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return dec.decode(bytes);
}
function encodeB64Utf8(str) {
  const bytes = enc.encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
async function makeSession(secret, hours) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + hours * 3600 * 1000 })));
  return payload + "." + (await hmac(secret, payload));
}
async function verifySession(secret, token) {
  if (!token || token.indexOf(".") < 0) return false;
  const [payload, sig] = token.split(".");
  if (!timingSafeEqual(await hmac(secret, payload), sig)) return false;
  try {
    const data = JSON.parse(dec.decode(b64urlToBytes(payload)));
    return data.exp && Date.now() < data.exp;
  } catch (e) { return false; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOW_ORIGIN || "https://arbitara.com";
    const repo = env.REPO || "ssatanovsky/arbitara.com";
    const file = env.FILE || "config.json";
    const branch = env.BRANCH || "main";
    const ghApi = "https://api.github.com/repos/" + repo + "/contents/" + file;

    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status: status || 200, headers: Object.assign({ "Content-Type": "application/json" }, cors),
    });
    const ghHeaders = (extra) => Object.assign({
      "Authorization": "Bearer " + env.GITHUB_TOKEN,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "arbitara-admin-worker",
    }, extra || {});

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    // ---- POST /login  { password } -> { token } ----
    if (url.pathname.endsWith("/login") && request.method === "POST") {
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
      if (!timingSafeEqual(body && body.password, env.ADMIN_PASSWORD)) {
        await sleep(400); // slow down brute-force attempts
        return json({ error: "Incorrect password." }, 401);
      }
      return json({ token: await makeSession(env.SESSION_SECRET, 12) });
    }

    const authed = await verifySession(env.SESSION_SECRET, (request.headers.get("Authorization") || "").replace(/^Bearer\s+/, ""));

    // ---- GET /config -> { config, sha } ----
    if (url.pathname.endsWith("/config") && request.method === "GET") {
      if (!authed) return json({ error: "unauthorized" }, 401);
      const r = await fetch(ghApi + "?ref=" + branch, { headers: ghHeaders() });
      if (!r.ok) return json({ error: "GitHub read failed (" + r.status + ")" }, 502);
      const d = await r.json();
      return json({ config: JSON.parse(decodeB64Utf8(d.content)), sha: d.sha });
    }

    // ---- PUT /config  { config, sha } -> { sha } ----
    if (url.pathname.endsWith("/config") && request.method === "PUT") {
      if (!authed) return json({ error: "unauthorized" }, 401);
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
      const put = {
        message: "Update content via admin",
        content: encodeB64Utf8(JSON.stringify(body.config, null, 2) + "\n"),
        sha: body.sha,
        branch: branch,
      };
      const r = await fetch(ghApi, { method: "PUT", headers: ghHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(put) });
      const d = await r.json();
      if (!r.ok) return json({ error: (d && d.message) || ("GitHub write failed (" + r.status + ")") }, 502);
      return json({ sha: d.content.sha });
    }

    return json({ error: "not found" }, 404);
  },
};
