# Arbitara — deploying updates & the content admin

## What's new in this change

- **Access gate** on the practitioner tools (pre-decision checklist, tier diagnostic,
  one-page decision record). Locked visitors see a "join the waitlist" card + modal;
  submitting an email unlocks the tools on that device.
- **`config.json`** drives content switches read at page load: page sections, the gate,
  each tool, an announcement banner, and a full coming-soon mode.
- **`/admin/`** — a [Decap CMS](https://decapcms.org) panel to flip those switches with
  a GitHub login. Saving commits `config.json`; the site reflects it ~1 min later.
- Front-end files now live under **`assets/`** (`style.css`, `app.js`, `config.js`).

---

## 1 · Put the code live (one-time git auth, then push)

The live site is the GitHub repo `ssatanovsky/arbitara.com`. Authenticate this machine
once, then push:

**Option A — GitHub CLI (recommended):**
```bash
brew install gh        # skip if already installed
gh auth login          # GitHub.com → HTTPS → "Login with a web browser"
```

**Option B — Personal Access Token:** create a fine-grained token with
`Contents: Read and write` on `ssatanovsky/arbitara.com`. `git push` will prompt for a
password — paste the token there.

Then push (I can run this for you once you're authenticated):
```bash
cd "Arbitara Code/website"
git push -u origin main --force
```
This replaces the old root-level files with the `assets/` layout — intended, and the
`CNAME` file keeps the custom domain. GitHub Pages redeploys in ~1 min. The gate and the
config engine work immediately; `config.json` defaults keep everything visible.

---

## 2 · Turn on admin login (GitHub OAuth — one time)

Decap logs in with GitHub, which needs a tiny OAuth helper (a static site can't hold the
client secret).

**a. Register a GitHub OAuth App** — GitHub → Settings → Developer settings → OAuth Apps →
New OAuth App:
- Homepage URL: `https://arbitara.com`
- Authorization callback URL: `https://<your-proxy-domain>/callback`
- Save the **Client ID** and **Client secret**.

**b. Deploy a free OAuth proxy.** Easiest is a Cloudflare Worker — search "Decap CMS
GitHub OAuth Cloudflare Worker" for a ready template (e.g. `sterlingwes/decap-proxy`).
Set its `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, deploy, and note the URL, e.g.
`https://arbitara-cms-auth.<you>.workers.dev`.

**c. Point Decap at it** — in `admin/config.yml`, uncomment `base_url` under `backend`:
```yaml
backend:
  name: github
  repo: ssatanovsky/arbitara.com
  branch: main
  base_url: https://arbitara-cms-auth.<you>.workers.dev
```
Commit/push that change.

**d. Use it** — visit `https://arbitara.com/admin/`, "Login with GitHub", flip switches,
Save.

> Prefer no proxy at all? Hosting the site on **Netlify** (Identity + Git Gateway) removes
> this whole step, but means moving hosting off GitHub Pages and re-pointing DNS. Say the
> word and I'll lay that out.

---

## Local editing without any OAuth (for testing)

```bash
cd "Arbitara Code/website"
npx decap-server          # runs a local git proxy on :8081
python3 -m http.server 8000
# open http://localhost:8000/admin/  → edits write straight to config.json
```
`local_backend: true` is already set in `admin/config.yml`.

---

## 3 · Waitlist emails (Formspree)

The gate and the coming-soon form already **unlock** the tools, but to actually **collect**
the emails, set `WAITLIST_ENDPOINT` near the top of `app.js` to your Formspree form
URL (`https://formspree.io/f/xxxxxxxx`). Until then, signups aren't stored anywhere.
