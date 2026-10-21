# A phone app: options

## How the code is split (2026-10-18)
The sheet is a web app (`app/`), plain HTML and JavaScript. What depends on where it runs is behind one object,
`platform` (`app/platform.js`):

1. **Storage** (`platform.storage`): the characters, play state, edits, effects, history and rolls.
   - The web version keeps them in IndexedDB (`app/platform.js`).
   - The extension keeps them in `chrome.storage.local` (`extension/platform.js`).
   - The regression check keeps them in memory (`dev/headless.js`).
2. **sw5e.com** (`platform.sw5e`): loading the account's characters, saving them, and sw5e.com's own calculation
   (the check on the sheet's engine). Only the extension has it: `extension/bridge.js` runs code inside a
   sw5e.com tab, using `chrome.tabs` and `chrome.scripting`. The web version has none, and hides the buttons that
   need it. The dev page borrows the installed extension's (`dev/bridge-proxy.js`).

The Chrome extension is a thin wrapper: `dev/build.py` puts `app/` and `extension/` together in `dist/extension/`,
with the extension's `platform.js` in place of the web one.

Everything else is the app's own: the sheet, the rules engine, rolling, tracking, inventory, effects, creating and
levelling up, and the rule books. SW5E's rules data, item list and books come with the app (`app/data/sw5e/`,
fetched from SW5E's public data service), so it works offline.

## Options
| | What | Phones | Effort | The catch |
|---|---|---|---|---|
| 1 | The extension in **Firefox for Android** | Android only | small | Firefox needs background scripts, not a service worker, and its tab and script support on Android needs testing. Users need Firefox. |
| 2 | A **web app** (installable, works offline) | any | medium | Can't reach sw5e.com: characters move by file (Back up → Import) at first. |
| 3 | An **app with a built-in browser** (e.g. Capacitor) running sw5e.com hidden, as the extension uses a tab | Android, iPhone | large | Signing in inside the app, app-store review, breaks when sw5e.com changes. Automating someone else's site in an app needs their agreement. |
| 4 | **Our own rules engine** | any | very large | All of SW5E's character computation. The recorded test cases check it: they hold SW5E's results for each test character. |

## Decided (2026-10-18)
- Our own rules engine (option 4), checked against SW5E's while it's built and as a sanity check from time to time
  after.
- SW5E's data is fetched from SW5E's own published sources and kept with the app, credited to SW5E
  ([open-source.md](open-source.md)).
- The extension is a wrapper around the app.

## Status (2026-10-18)
- **The engine** is built (`app/engine.js`, see [engine.md](engine.md)) and the sheet uses it: every field of SW5E's
  calculation matches on 621 characters SW5E computed, and characters loaded from sw5e.com are checked against
  sw5e.com's own calculation.
- **The app and the extension are split** as above. The app runs as a web page with its own storage: viewing,
  rolling, tracking, editing, creating characters and reading the rules all work there.
- **SW5E's data comes with the app.** A newer version is fetched from SW5E's data service directly, which any site
  may read (it allows every origin), so the web version can update it too.

- **The web version installs as an app** (2026-10-22): `app/manifest.webmanifest`, `app/sw.js` (filled in by
  `dev/build.py` into `dist/web/`) and `app/pwa.js`. The first visit keeps every file (about 9 MB, SW5E's books
  included); the sheet then opens offline, and a new build is offered with "A new version of the sheet is ready ·
  Reload". Checked in Chrome: installable with no errors, offline sheet and books, the update replacing the old
  files. Not yet tried on a real phone (needs a host).

## Next
1. **Publish on GitHub Pages** (see "Hosting" below) and try it on a real phone.
2. **Getting characters onto the phone:** the extension's **Back up all characters** file, imported on the phone,
   works now. Syncing between devices is a separate decision: it needs a server and accounts, or sw5e.com.
3. Option 1 only as a quick experiment, for someone who wants the extension on an Android phone now. Option 3
   isn't recommended.

## Hosting
`python dev/build.py` makes `dist/web/`; a host serves that folder as it is. The host's build command is
`python dev/build.py` and its output folder `dist/web`. A hosted site can be opened by anyone with its address
unless the host restricts it, which matters while the repository is private:
- **GitHub Pages** (chosen, 2026-10-22): `.github/workflows/pages.yml` builds and publishes `dist/web/` on every
  push to `main`. From a private repository it needs a paid GitHub plan, and the site itself is public (anyone
  with its address). Set up once: Settings → Pages → Source: **GitHub Actions**.
- **Cloudflare Pages:** free, builds from a private GitHub repository; Cloudflare Access (free for small teams)
  can limit it to chosen e-mail addresses.
- **Netlify:** free, builds from a private repository; a password needs a paid plan.

## Found out (2026-10-18)
- SW5E's data service (`https://sw5eapi.azurewebsites.net/api/`) answers any site (`Access-Control-Allow-Origin: *`),
  and gives exactly the data the extension used to read from sw5e.com's page (checked: every rules list and item).
- The code of SW5E's website, its character builder and engine included, is published:
  [StarWars5e.Site](https://github.com/sangheili868/StarWars5e.Site) (frontend) and
  [StarWars5e.Core](https://github.com/speedreeder/StarWars5e.Core) (backend), with no license file. SW5E's content is
  published under Wizards of the Coast's Fan Content Policy.
