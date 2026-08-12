# Password login for /admin/ — one-time setup (Cloudflare Worker)

This makes `arbitara.com/admin/` log in with **just a password**. A tiny Cloudflare
Worker holds your GitHub token + admin password as server-side secrets, so no token
ever lives in the browser.

## 1. Create the GitHub token the Worker will use (once)

- https://github.com/settings/personal-access-tokens/new
- Repository access → **Only select repositories** → `ssatanovsky/arbitara.com`
- Permissions → **Contents** → **Read and write**
- Generate and copy it (`github_pat_…`). You'll paste it into Cloudflare (not the browser admin).

## 2. Create the Worker

- Sign in / sign up (free) at https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**.
- Name it e.g. `arbitara-admin`. Deploy the starter, then **Edit code**.
- Delete the starter code, paste the contents of [`worker.js`](worker.js), **Deploy**.
- Note the URL, e.g. `https://arbitara-admin.<your-subdomain>.workers.dev`.

## 3. Set the secrets

Worker → **Settings** → **Variables and Secrets** → add three **Secrets** (encrypted):

| Name | Value |
|------|-------|
| `GITHUB_TOKEN` | the token from step 1 |
| `ADMIN_PASSWORD` | the password you'll type to log into /admin/ |
| `SESSION_SECRET` | any long random string (e.g. `de8dbbfd3d52bc2eeb63f5d5b565c0ab54e6097694e0887e3a40d69be9e9fdc9`) |

Re-deploy if prompted.

## 4. Point the admin at the Worker

Give me the Worker URL and I'll set `API_BASE` in `admin/index.html` and push. Then
`arbitara.com/admin/` will show a password box — type your `ADMIN_PASSWORD` and you're in.

---

**Notes**
- The `ADMIN_PASSWORD` (login) is separate from the site's public password (which you
  change inside the admin under "Site password protection").
- Sessions last 12 hours; you sign in again after that or when you close the browser.
- To change the admin password later, just edit the `ADMIN_PASSWORD` secret in Cloudflare.
- Free tier is plenty (100k requests/day).
