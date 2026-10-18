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

## Next
1. **The web version as a phone app** (option 2): a web app manifest and a service worker, so it installs on a home
   screen and opens offline; a host for the files (any static host).
2. **Getting characters onto the phone:** the extension's **Back up all characters** file, imported on the phone,
   works now. Syncing between devices is a separate decision: it needs a server and accounts, or sw5e.com.
3. Option 1 only as a quick experiment, for someone who wants the extension on an Android phone now. Option 3
   isn't recommended.

## Found out (2026-10-18)
- SW5E's data service (`https://sw5eapi.azurewebsites.net/api/`) answers any site (`Access-Control-Allow-Origin: *`),
  and gives exactly the data the extension used to read from sw5e.com's page (checked: every rules list and item).
- The code of SW5E's website, its character builder and engine included, is published:
  [StarWars5e.Site](https://github.com/sangheili868/StarWars5e.Site) (frontend) and
  [StarWars5e.Core](https://github.com/speedreeder/StarWars5e.Core) (backend), with no license file. SW5E's content is
  published under Wizards of the Coast's Fan Content Policy.
