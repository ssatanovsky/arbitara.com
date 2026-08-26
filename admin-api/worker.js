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
 *   Bindings (set by deploy-worker.sh, not the dashboard):
 *     DEMO_API        service binding to the arbitara-demo Worker
 *
 * Content-editing access can also come from the ui-demo prototype's
 * account system (converged accounts, see POST /demo-login below) — this
 * Worker never sees those passwords or shares a signing secret with that
 * system; it just relays a login attempt and, for authenticating later
 * requests, calls that Worker's own GET /whoami to check the bearer token
 * server-side. Reached via the DEMO_API service binding, not a plain
 * fetch() to its public URL — Cloudflare blocks Worker-to-Worker fetches
 * over the public network as a loop-prevention measure (error 1042), so a
 * service binding is required, not optional. A browser on arbitara.com
 * never calls arbitara-demo directly either way, so no CORS changes were
 * needed on its side regardless.
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
// Delegates to the ui-demo account system: is this bearer token a valid,
// currently-active session for an account with role "admin"? One extra
// fetch, only reached when our own session check above didn't already
// authenticate the request (see the `||` short-circuit at the call site).
async function verifyDemoAdmin(token, demoApi) {
  if (!token || !demoApi) return false;
  try {
    const r = await demoApi.fetch("https://arbitara-demo/whoami", { headers: { "Authorization": "Bearer " + token } });
    if (!r.ok) return false;
    const d = await r.json();
    return !!(d && d.role === "admin");
  } catch (e) { return false; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Reflect-and-validate against an allowlist, not a single static string
    // — ALLOW_ORIGIN was previously always echoed back verbatim regardless
    // of the request's real Origin, so anything but the exact string
    // "https://arbitara.com" (localhost dev preview, www.arbitara.com,
    // wherever) got a CORS mismatch and a silent "Failed to fetch" in the
    // browser. Comma-separate multiple origins in the env var.
    const allowedOrigins = String(env.ALLOW_ORIGIN || "https://arbitara.com,http://localhost:8781")
      .split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    const requestOrigin = request.headers.get("Origin") || "";
    const origin = allowedOrigins.indexOf(requestOrigin) >= 0 ? requestOrigin : allowedOrigins[0];
    const repo = env.REPO || "ssatanovsky/arbitara.com";
    const file = env.FILE || "config.json";
    const branch = env.BRANCH || "main";
    const demoApi = env.DEMO_API; // service binding — see verifyDemoAdmin() for why not a plain fetch()
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

    // ---- POST /demo-login  { username, password } -> { token, name, role } ----
    // Lets an arbitara-demo account with role "admin" edit arbitara.com's
    // content, without this Worker ever seeing that account system's
    // signing secret. Just relays the login attempt server-side and passes
    // the resulting token straight back — it's the same token the caller
    // then sends as Authorization: Bearer on /config, /upload, /leads,
    // which verifyDemoAdmin() below checks against demoApi's own /whoami.
    if (url.pathname.endsWith("/demo-login") && request.method === "POST") {
      if (!demoApi) return json({ error: "Account service is not configured (missing DEMO_API binding)." }, 500);
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
      let demoResp;
      try {
        demoResp = await demoApi.fetch("https://arbitara-demo/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: body.username, password: body.password }),
        });
      } catch (e) {
        return json({ error: "Could not reach the account service." }, 502);
      }
      let demoData; try { demoData = await demoResp.json(); } catch (e) { demoData = {}; }
      if (!demoResp.ok) return json({ error: demoData.error || "Incorrect username or password." }, 401);
      if (demoData.role !== "admin") return json({ error: "This account doesn't have content-editing access." }, 403);
      return json({ token: demoData.token, name: demoData.name, role: demoData.role });
    }

    const bearer = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/, "");
    const authed = (await verifySession(env.SESSION_SECRET, bearer)) || (await verifyDemoAdmin(bearer, demoApi));

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

    // ---- POST /upload  { id, contentBase64, contentType } -> { path } ----
    // The server derives the file path from `id` (never trusts a client-supplied
    // path) so this endpoint can only ever write into uploads/<id>.<ext> — no
    // path traversal, no overwriting worker.js / config.json / anything else.
    if (url.pathname.endsWith("/upload") && request.method === "POST") {
      if (!authed) return json({ error: "unauthorized" }, 401);
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }

      const id = String(body.id || "");
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) return json({ error: "invalid id" }, 400);

      const EXT_BY_TYPE = {
        "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
        "image/gif": "gif", "image/svg+xml": "svg",
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      };
      const ext = EXT_BY_TYPE[body.contentType];
      if (!ext) return json({ error: "unsupported file type" }, 400);

      let content = String(body.contentBase64 || "");
      content = content.replace(/^data:[^;]+;base64,/, "");
      if (!content) return json({ error: "empty file" }, 400);
      if (content.length > 14000000) return json({ error: "file too large (max ~10MB)" }, 400);

      const uploadPath = "uploads/" + id + "." + ext;
      const uploadApi = "https://api.github.com/repos/" + repo + "/contents/" + uploadPath;

      // Look up the current sha if this path already has a file (required by
      // GitHub's API to overwrite it; absent means "create new").
      let existingSha;
      const head = await fetch(uploadApi + "?ref=" + branch, { headers: ghHeaders() });
      if (head.ok) { const hd = await head.json(); existingSha = hd.sha; }

      const put = {
        message: "Upload file via admin (" + id + ")",
        content: content,
        branch: branch,
      };
      if (existingSha) put.sha = existingSha;

      const r = await fetch(uploadApi, { method: "PUT", headers: ghHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(put) });
      const d = await r.json();
      if (!r.ok) return json({ error: (d && d.message) || ("GitHub upload failed (" + r.status + ")") }, 502);
      return json({ path: uploadPath });
    }

    // ---- POST /lead  { name, email, jobTitle, companySize, interest, message, source } -> { ok } ----
    // Public — called by anonymous site visitors submitting the contact form.
    // Stores into KV (never the git repo) since leads carry PII and the repo
    // is served publicly. The record is duplicated into KV metadata so
    // GET /leads can list everything with a single call, no per-key reads.
    // Field lengths are capped tightly so the record stays under KV's
    // 1024-byte metadata limit.
    if (url.pathname.endsWith("/lead") && request.method === "POST") {
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
      const name = String(body.name || "").trim().slice(0, 120);
      const email = String(body.email || "").trim().slice(0, 160);
      const jobTitle = String(body.jobTitle || "").trim().slice(0, 120);
      const companySize = String(body.companySize || "").trim().slice(0, 60);
      const interest = String(body.interest || "").trim().slice(0, 60);
      const source = String(body.source || "").trim().slice(0, 60);
      // Capped tighter than the other fields — with everything else maxed
      // out, this still has to fit the metadata record under KV's 1024-byte
      // limit (see the comment above).
      const message = String(body.message || "").trim().slice(0, 300);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: "a valid email is required" }, 400);
      }
      const ts = Date.now();
      const key = "lead:" + ts + ":" + crypto.randomUUID().slice(0, 8);
      const record = { name, email, jobTitle, companySize, interest, message, source, ts };
      await env.LEADS.put(key, JSON.stringify(record), { metadata: record });
      return json({ ok: true });
    }

    // ---- GET /leads -> { leads: [...] } ----
    if (url.pathname.endsWith("/leads") && request.method === "GET") {
      if (!authed) return json({ error: "unauthorized" }, 401);
      const list = await env.LEADS.list({ prefix: "lead:" });
      const leads = list.keys.map((k) => k.metadata).filter(Boolean).sort((a, b) => b.ts - a.ts);
      return json({ leads: leads });
    }

    return json({ error: "not found" }, 404);
  },
};
