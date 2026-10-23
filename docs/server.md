# The sheet's server

`server/` is a small server for hosting the sheet yourself, instead of GitHub Pages. It serves the web version and
offers **accounts**: a player who makes one gets every character in their browser backed up to the server, and can
restore them on any other device. Without an account the sheet works exactly as before (characters stay in the
browser), and where the sheet isn't served by this server (GitHub Pages, the Chrome extension, the dev page) the
account features don't show at all.

- **No packages.** Node.js 22.13 or later, with its own `http`, `crypto` and built-in SQLite (`node:sqlite`).
- **Accounts:** an e-mail and a password, and/or Google sign-in (optional, see below).
- **What's kept per character** is the sheet's own backup file for it ("Back up this character": its data, your
  changes, play state, tweak reasons, effects, version history, recent rolls and an uploaded picture), plus the 20
  backups before it.

## How backups work
- **Signed in**, the sheet asks once per browser whether to back up the characters already there. From then on each
  character is sent a few seconds after it changes (only those that changed), and again when the connection comes
  back.
- **Two devices:** every backup is numbered. A browser that writes from an older number than the server's gets the
  newer backup back instead; it merges it in (newer data wins, part by part, as importing a backup file does) and sends
  the result. On every visit, characters here that changed elsewhere are merged in the same way.
- **Restoring** (Account → On the server → Restore) brings in a character that isn't in this browser, or an earlier
  backup of one (Earlier backups). A character removed from a browser isn't brought back by itself.
- **Deleting** from the server leaves the browser's copy alone; deleting the account deletes all of its backups.
- Signing out leaves the characters in the browser.

## Security, in short
- Passwords: scrypt hashes. Sessions: a random token in an HttpOnly, SameSite=Lax cookie (Secure over HTTPS),
  30 days, extended while used; the database keeps only the token's SHA-256. Changing the password signs out the
  account's other browsers.
- Every change must carry the sheet's own `X-Sheet: 1` header, and come from the server's own address when the
  browser names one, so another site can't act for a signed-in player.
- Sign-in, sign-up and password forms are limited per address and per e-mail (20 and 10 per 15 minutes by default).
- Google sign-in uses the authorization code flow with a state cookie and a nonce. An e-mail that already has a
  password account is not joined to a Google sign-in by itself (that would let someone who registered another
  person's e-mail into their account): sign in with the password, then Account → Add Google sign-in.
- There is no e-mail sending: no verification e-mails and no reset links. The server's owner resets a forgotten
  password with `server/admin.js` (below).
- The server never sees sw5e.com credentials; the sheet's sw5e.com features are unchanged.

## Run it locally
```
python dev/build.py                       # the web version, dist/web/
node server/server.js                     # http://localhost:8780/, database in server/data/ (git-ignored)
node dev/server-check.js                  # the server's check: every API, on a temporary database
```
Settings come from the environment, or from a file named by `ENV_FILE` (`KEY=value` lines; see
`deploy/sheet.env.example` and the top of `server/server.js`). Without `PUBLIC_URL` it assumes
`http://localhost:<port>`.

`server/server.js` also serves any static folder (`STATIC_DIR`); it always serves `/api/…` itself. The offline
worker (`app/sw.js`) never answers `/api/…` from its cache.

## Deploy on a DigitalOcean droplet
1. **Create a droplet:** Ubuntu 24.04 LTS; the smallest size is enough to start (1 GB RAM). Add your SSH key.
2. **Give it the code.** With a private repository, make a deploy key on the droplet and add it to the repository
   (GitHub → Settings → Deploy keys, read-only):
   ```
   ssh root@<droplet IP>
   ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519 && cat ~/.ssh/id_ed25519.pub
   ```
3. **Set it up:**
   ```
   git clone git@github.com:<you>/sw5e-sheet.git /opt/sw5e-sheet
   bash /opt/sw5e-sheet/deploy/setup.sh git@github.com:<you>/sw5e-sheet.git            # no domain yet
   bash /opt/sw5e-sheet/deploy/setup.sh git@github.com:<you>/sw5e-sheet.git sheet.example.com   # with one
   ```
   It installs Node.js 22 and Caddy, builds the web version, and sets up the service (`sw5e-sheet`, run by the
   `sheet` user), the settings in `/etc/sw5e-sheet.env`, the database in `/var/lib/sw5e-sheet`, Caddy in front,
   a nightly database copy and the firewall. Running it again is safe: it keeps the settings and the database.
4. **Before there's a domain** the sheet is at `http://<droplet IP>/`, without HTTPS: fine for trying it out, but
   passwords cross the network readable, Google sign-in can't be used (Google needs a domain with HTTPS), and the
   sheet can't be installed as an app. Don't invite players yet.
5. **When there's a domain:** point an `A` record at the droplet's IP, wait until it resolves, set
   `PUBLIC_URL=https://<domain>` in `/etc/sw5e-sheet.env`, and run `setup.sh` again with the domain. Caddy then gets
   a certificate by itself and renews it.

**Updating** to the latest `main`: `sudo bash /opt/sw5e-sheet/deploy/update.sh` (pulls, runs the server check,
builds, restarts; keeps the running version if the check fails). Logs: `journalctl -u sw5e-sheet -f`, and
`/var/log/caddy/sheet.log`.

## Google sign-in
1. In the [Google Cloud console](https://console.cloud.google.com/): a project, then **APIs & Services → OAuth consent
   screen** (External; the app's name, your e-mail; scopes `openid`, `email`, `profile`).
2. **Credentials → Create credentials → OAuth client ID**, type **Web application**. Authorized redirect URI:
   `https://<domain>/api/auth/google/callback` (for trying it locally also `http://localhost:8780/api/auth/google/callback`).
3. Put the client ID and secret in `/etc/sw5e-sheet.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and
   `sudo systemctl restart sw5e-sheet`. The sign-in panel then shows **Sign in with Google**.
While the consent screen is in "Testing", only the test users listed there can sign in; publish it for everyone.

## Running it
```
cd /opt/sw5e-sheet && sudo -u sheet env ENV_FILE=/etc/sw5e-sheet.env node server/admin.js users
… admin.js reset-password <e-mail>        # prints a new password, signs the account out everywhere
… admin.js sign-out <e-mail>
… admin.js delete-user <e-mail> --yes      # the account and all its backups
… admin.js backup <file>                   # a copy of the database while it runs
```
- **Closing sign-ups:** `ALLOW_SIGNUP=false` (existing accounts still sign in).
- **Limits per account:** `MAX_CHARACTERS`, `MAX_ACCOUNT_MB`, `MAX_CHARACTER_MB`.
- **Backups of the server:** the nightly copies are in `/var/lib/sw5e-sheet/backups/` (14 kept). Copy them off the
  droplet too (DigitalOcean's droplet backups, or `scp`). To restore one: `systemctl stop sw5e-sheet`, copy it over
  `/var/lib/sw5e-sheet/sheet.db` (owned by `sheet`), remove `sheet.db-wal` and `sheet.db-shm`, start it again.

## Moving off GitHub Pages
The server doesn't need the repository to be public or Pages to run. Once it's up at its domain, and if you want to:
turn Pages off (Settings → Pages, or remove `.github/workflows/pages.yml`) and make the repository private
(Settings → General → Danger zone). The droplet keeps pulling through its deploy key. Characters people kept on the
Pages site stay in their browsers there (a different address is a different browser storage): they can move them
with More ▾ → Back up all characters, then Import file… on the new address.
