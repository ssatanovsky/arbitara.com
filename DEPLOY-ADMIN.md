# Arbitara — the content admin

## Using the admin

Go to **https://arbitara.com/admin/** (unlisted, `noindex`). It edits `config.json`
directly on GitHub — no server, no OAuth proxy, no third-party accounts.

**First time — connect once:**
1. Create a fine-grained GitHub token: https://github.com/settings/personal-access-tokens/new
   - Repository access → **Only select repositories** → `ssatanovsky/arbitara.com`
   - Permissions → **Contents** → **Read and write**
2. Copy the token (`github_pat_…`) and paste it into the admin's **Connect** box.

The token is stored **only in your browser** (localStorage). "Disconnect" clears it.

**Then:** flip switches, click **Save changes**. GitHub rebuilds the site and the change is
live on arbitara.com in about a minute.

## What you can switch

- **Password protection** — require a password to view the whole site. You can change the
  password right in the admin (it's hashed in your browser before saving — the plain
  password is never stored).
- **Coming-soon mode** — hide everything behind a holding page with a waitlist form.
- **Announcement banner** — a bar across the top of every page.
- **Practitioner tools** — the access gate on/off, and the checklist / tier diagnostic /
  one-page record individually.
- **Page sections** — show/hide each of the nine sections.

## About the security model

This is a stealth-appropriate **soft** setup, not hard security:
- The password check runs in the browser, so a determined technical visitor could bypass
  it by reading the page source. It keeps casual visitors out — good enough for stealth,
  not a vault.
- The admin's real protection is the GitHub token: without a valid one, the admin page
  can't read or change anything.

## Waitlist emails (Formspree)

The waitlist / coming-soon forms currently **unlock** the tools but don't **store** the
email anywhere. To collect them, set `WAITLIST_ENDPOINT` near the top of `app.js` to your
Formspree form URL (`https://formspree.io/f/xxxxxxxx`).

## Deploying code changes

The site is the repo `ssatanovsky/arbitara.com` (GitHub Pages, files at repo root). Content
switches go through the admin above; code changes are ordinary commits to `main`.
