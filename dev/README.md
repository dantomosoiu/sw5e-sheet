# Dev harness

Runs the extension's real `viewer.html` as a normal web page so it can be developed and
driven in a browser (including by Claude in Chrome, which can't open `chrome-extension://` pages).
Nothing here is part of the extension: pack and ship only `sw5e-sheet/`.

## Run
```
python dev/serve.py        # http://127.0.0.1:8765/
```
- `/` opens the viewer with `dev/chrome-shim.js` injected (the file on disk is unchanged).
- Dev storage is IndexedDB ("sw5e-dev"; the extension's own storage has no 5 MB cap either). `/?reset` clears it and reloads fixtures.
- Responses are `no-store`: edit a file, reload the page.
- `/dev/phone.html?w=390&h=844` shows the viewer in a phone-sized frame (`?w=800&h=1000`: tablet), same storage.

## What works / what doesn't
- `chrome.storage.local` is backed by localStorage (`sw5e-dev:` keys) and seeded from `dev/fixtures/*.json`.
- Rendering, filter, themes, import/export, switching characters: all real viewer code.
- **Load from SW5E / Recompute / computing imports go through the installed extension.**
  `dev/bridge-proxy.js` (injected after `bridge.js`) replaces `runInSw5e` with a message to the
  extension's background worker, which runs the real bridge against a sw5e.com tab.
  This needs the extension installed from `sw5e-sheet/` with `externally_connectable` in its
  manifest (dev builds have it; `dev/pack.py` strips it). Extension id defaults to
  `mfikebeffkcgnkppppccnidnneblggaa`; use `/?ext=<id>` once if yours differs.
- **Protect your real characters first:** in the dev page's console,
  `localStorage.setItem('sw5e-dev:protectedIds', JSON.stringify(['<sw5e.com id>', …]))` (`'[]'` if none). Those
  characters are never saved to sw5e.com from the dev page nor recorded as test cases; until the list is set,
  the dev page saves and records nothing. Test saves against a throwaway character.
- **The extension reloads itself** when `manifest.json`, `background.js` or `bridge.js` changed on
  disk: on the dev page's next sw5e.com request it notices, reloads, and the page retries (a few
  seconds; installed-viewer tabs close). The code that runs is the extension's, not the dev page's
  copy of `bridge.js`. Reload by hand in `chrome://extensions` only if this check itself changed.

## Dumps and the reports
`POST /dev/dump/<name>` saves the request body to `dev/dumps/<name>` (git-ignored), to pull data
out of the dev page, e.g. the cached SW5E item catalog and rules (run in the dev page's console):

    for (const k of ['catalog', 'rules']) await fetch(`/dev/dump/${k}.json`, { method: 'POST', body: JSON.stringify((await chrome.storage.local.get(k))[k]) })

`node dev/effects-report.js dev/dumps/catalog.json [--items] [--unhandled]` runs
`sw5e-sheet/effects.js` over every item: how many get bonuses applied, by stat and item kind;
`--items` lists each item's reading, `--unhandled` the stat-like sentences kept only as notes
(candidates for new rules, or deliberately conditional).

`node dev/features-report.js dev/dumps/rules.json [--unhandled[=N]] [--states] [--class=Name] [--examples]`
does the same for `sw5e-sheet/classes.js` over every class feature, archetype feature and class
option: how many give effects, uses and states; `--states` lists the switch-on states it finds (and
features worded like one that aren't); `--unhandled` the stat-like sentences it makes nothing of,
after setting aside table-time rules (targets, actions, triggers) and numbers SW5E computes itself.

`node dev/choices-check.js dev/dumps/rules.json <character.json | -e '<json>'> [--effects]` prints what
`sw5e-sheet/choices.js` and `sw5e-sheet/powers.js` make of a character: each class's option lists (with archetype
lists and Engineer modifications), maneuvers, powers known from class and archetype tables, every choice slot
(fighting styles, forms, focuses, improvements, maneuvers and powers given by features, feats and species) with its
count, picks and problems, and with `--effects` what each pick does. The player panels use it to check the rules
reading without a browser.

## Regression check
```
node dev/regress.js              # compare every case (exit code 1 when something changed)
node dev/regress.js kadro        # only the cases whose file name contains "kadro"
node dev/regress.js --update     # accept what the sheet shows now
```
Draws each recorded test character with the viewer's own code in Node (`dev/headless.js`: the same scripts as
`viewer.html`, with stand-ins for the page, `chrome.storage` and a stopped clock; no browser, no sw5e.com) and
compares the result with `dev/regress/expected/<case>.txt`. Each report has:
- **Sent to SW5E's engine:** the tweaks the sheet's effects, features and edits add, and whether the recorded
  calculation is still for exactly that. "OUT OF DATE" means a change alters what SW5E computes from: the numbers
  can't be checked until the case is recorded again (check the tweak lines first).
- **Numbers:** what SW5E's engine gave (AC, HP, saves, skills, weapons, casting…).
- **Effects and tweaks,** and **Rolls:** every roll the sheet offers (to-hit, damage, critical and two-handed damage,
  checks, saves, powers…) with its bonus by source, options, critical range and warnings.
- **Sheet:** the text of every section, with the hover explanation of each number an effect changed.

Changes are listed by part, old line above new (`--full` shows all of them, `--out=<dir>` writes the reports).
A change you meant: `--update`, and commit the expected files with it.

The cases (`dev/regress/cases/`) are the test characters in the dev page, with SW5E's calculation of them. To
record them again (new test characters, or to see whether sw5e.com's engine changed: record, then compare):
1. In the dev page's console: `const rec = await import('/dev/regress-record.js'); await rec.record()`. It
   recalculates each character with SW5E's engine (nothing is saved to sw5e.com) and writes the dev storage and SW5E's
   rules and item data to `dev/dumps/` (git-ignored). Protected characters (see above) are left out.
2. `node dev/regress.js record` makes one case per character, with the sw5e.com ids and the account's id replaced
   by made-up ones (it stops if it finds an e-mail address).
3. `node dev/regress.js` shows what the new recording changes; `--update` accepts it.

The check needs SW5E's rules and item data in `dev/dumps/rules.json` and `catalog.json` (not in the repo; step 1
writes them).

## The own rules engine
`sw5e-sheet/engine.js` computes a character's numbers from SW5E's character data and rules the way SW5E's engine
does, quirks included (see `docs/phone-app.md`). It is checked against SW5E's own results:
```
node dev/engine-check.js            # every number SW5E computed, computed again by the engine
node dev/engine-check.js --missing  # also list what the engine doesn't compute yet
```
SW5E's results come from the regression cases and from `dev/engine/sw5e-results.json`: made-up characters that
cover the rules (every class at a spread of levels, multiclass pairs, every species, armor, weapon and tweak,
edge cases), computed by sw5e.com. Record them again when the engine grows, and as a sanity check from time to
time (sw5e.com can change):
1. `node dev/engine-cases.js` writes the characters (`dev/engine/inputs.json`, git-ignored).
2. In the dev page's console: `const rec = await import('/dev/engine-record.js'); rec.record()`, and wait for
   `rec.progress.finished` (about two minutes). sw5e.com only computes them; nothing is saved there.
3. `node dev/engine-check.js import` keeps their numbers and says what SW5E now computes differently.
4. `node dev/engine-check.js`.

## Fixtures
`dev/fixtures/*.json` are sheet snapshots (`format: "sw5e-sheet-snapshot"`), or raw SW5E exports
(shown without computed data). To capture fresh snapshots:
1. Open a signed-in `https://sw5e.com/tools/mycharacters` tab.
2. Paste the contents of `http://127.0.0.1:8765/dev/capture.js` into its DevTools console
   (optionally first `window.CAPTURE_ONLY = ['Character name']`).
3. Move the downloaded `*.sheet-snapshot.json` into `dev/fixtures/` and open `/?reset`.

`capture.js` is generated from `sw5e-sheet/bridge.js` on each request, so it always matches the
extension's extraction code. The "Export sheet snapshot" menu item in the installed extension
produces the same format.

## Releasing
`python dev/pack.py` writes `dist/sw5e-sheet-<version>.zip` with the dev-only manifest keys
removed. Before publishing, unzip it, load it unpacked, and run through the toolbar button,
Load from SW5E, Recompute and Import in the real viewer — the harness doesn't cover the
viewer's own `chrome.storage` or the toolbar button.
