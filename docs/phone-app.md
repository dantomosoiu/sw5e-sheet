# A phone app: options

## Where the code depends on the extension
The sheet is plain HTML and JavaScript. It needs the browser extension in two places:

1. **Storage:** `chrome.storage.local`, used in viewer.js and roller.js (about 20 calls). It holds:
   - the characters, play state, edits, effects, history and rolls;
   - SW5E's rules and item data.

   The dev page replaces it with IndexedDB (`dev/chrome-shim.js`); the regression check replaces it with
   memory (`dev/headless.js`).
2. **sw5e.com:** `runInSw5e` (bridge.js) runs code inside a sw5e.com tab, using `chrome.tabs` and
   `chrome.scripting`. It is used to:
   - load your characters;
   - compute a character with SW5E's engine;
   - fetch the rules and item data;
   - save.

   The dev page replaces it with a call through the installed extension (`dev/bridge-proxy.js`).

Everything else is ordinary page code: the sheet, rolling, tracking, inventory, effects, and creating and
levelling up. The regression check runs it in Node without a browser.

The hard part is the second dependency. SW5E's numbers (AC, skills, attacks, casting) come from sw5e.com's own
code, running in its own page and signed in. A web page or an app can't reach into sw5e.com the way the
extension does.

## Options
| | What | Phones | Effort | The catch |
|---|---|---|---|---|
| 1 | The extension in **Firefox for Android** | Android only | small | Firefox needs background scripts, not a service worker, and its tab and script support on Android needs testing. Users need Firefox. |
| 2 | A **web app** (installable, works offline) | any | medium | No SW5E engine: an effect, an item bonus or a level up can't be recalculated there. Characters move by file (Back up → Import) at first. |
| 3 | An **app with a built-in browser** (e.g. Capacitor) running sw5e.com hidden, as the extension uses a tab | Android, iPhone | large | Signing in inside the app, app-store review, breaks when sw5e.com changes. Automating someone else's site in an app needs their agreement. |
| 4 | **Our own rules engine** | any | very large | All of SW5E's character computation. The recorded test cases check it: they hold SW5E's results for each test character. |

## Decided (2026-10-18)
Our own rules engine (option 4), checked against SW5E's while it's built and as a sanity check from time to time
after. The steps below stand, with the engine as the aim rather than a later option.

**Status (2026-10-18):** the engine is built (`sw5e-sheet/engine.js`, see [engine.md](engine.md)) and the sheet uses
it: every field of SW5E's calculation matches on 621 characters SW5E computed, and characters loaded from sw5e.com
are checked against sw5e.com's own calculation. What a phone version still needs from sw5e.com: the characters
themselves (loading and syncing) and SW5E's rules and item data (fetched once, then kept). Next: the storage seam
and the web app (steps 1 and 2 below), with the rules data brought along in a backup file or fetched directly.

## Recommendation
1. **Two seams first** (small):
   - a storage interface with three implementations: the extension, IndexedDB, and memory;
   - one "SW5E engine" interface whose implementation may be missing.

   The dev shims already have these shapes; the sheet then stops naming `chrome.*` itself.
2. **The web app (option 2)** as the first phone version: viewing, rolling, tracking HP and uses, conditions
   and rests at the table, with the numbers recalculated by the sheet's own engine.
   - Characters come over in a backup file.
   - Syncing between devices is a separate decision: it needs a server and accounts, or sw5e.com.
3. **Our own engine (option 4), in steps,** each checked against the recorded cases. Start with what changes
   most during play: ability modifiers, saves, skills, initiative and passive perception; then AC, weapon
   attacks and damage, then casting. Each step lets more of the sheet recalculate without sw5e.com. This is also
   the owner's long-term aim: the sheet as the only place the character is edited, with nothing relying on
   sw5e.com's workarounds.
4. Option 1 only as a quick experiment, for someone who wants the extension on an Android phone now. Option 3
   isn't recommended.

## To find out
- Whether sw5e.com's rules data can be read from another site (CORS). If it can, a web app could fetch it
  itself; otherwise it comes in a file from the extension.
- Whether the code of SW5E's character builder is published, and under what license. If it is, its
  computation could be reused instead of written again.
