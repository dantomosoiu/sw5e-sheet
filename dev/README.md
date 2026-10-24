# Developing

The sheet (`app/`) is a web app; the browser extension (`extension/`) wraps it, adding Chrome's storage and the
connection to sw5e.com. Nothing in `dev/` ships.

## Build
```
python dev/build.py         # dist/extension/ = app/ + extension/; dist/web/ = the web version (both git-ignored)
```
`dist/web/` is `app/` for a static host (https, or localhost): its `sw.js` gets the list of every file and a version
(a hash of them all), so the installed app keeps them for offline use and notices a new build. `app/sw.js` itself has
an empty list. `app/pwa.js` registers it only in the web version, never on the dev page.
`dist/web/sw5e-grab.js` is `app/sw5e-grab.js`, the script the "Get characters from sw5e.com" bookmark loads into a
sw5e.com page, with `sw5ePageExtract` from `extension/bridge.js` put in (the same reading as the extension's Load).
It hands the characters to the sheet with postMessage (`awaitCharactersFromSw5e` in `app/sw5e.js` takes them only
from sw5e.com and from the tab that opened it) or copies them for Paste. To try it locally, add a script element
with `src` = `http://127.0.0.1:8765/dist/web/sw5e-grab.js` to a signed-in sw5e.com tab. Files shared to the
installed app (Android) arrive at `share-target` (manifest `share_target`, handled in `sw.js`). GitHub Pages publishes
`dist/web/` on every push to `main` (`.github/workflows/pages.yml`). The phone icons
(`icon192`, `icon512`, `maskable512`) are drawn by `python dev/icons.py` (needs Pillow); the smaller ones are drawn
by hand.

### The extension
Load `dist/extension/` unpacked in `chrome://extensions` (Developer mode). The build writes only what changed and
removes what's gone, so Chrome can keep it loaded while it's rebuilt: a sheet change shows on a page reload. The
extension's `platform.js` takes the place of the web one, and its `index.html` loads `bridge.js` before it. The dev
server below rebuilds it whenever `app/` or `extension/` changes.

The unpacked extension's id comes from the folder's path. To keep one id (and its storage) while the folder moves,
load it from a fixed path that points at the build, e.g. on Windows a directory junction:
`mklink /J C:\sw5e-sheet <repo>\dist\extension`.

## Run the dev page
```
python dev/serve.py        # http://127.0.0.1:8765/
```
- `/` opens the sheet (`app/`) as a web page, with dev additions injected (the files on disk are unchanged):
  storage in IndexedDB "sw5e-dev" (instead of the web version's "sw5e-sheet"), the test characters from
  `dev/fixtures/` if you have made that folder (`dev/dev-storage.js`; `/?reset` clears the dev storage and puts them
  in again; see "Fixtures" below), and sw5e.com through the installed extension (`dev/bridge-proxy.js`).
  `/` redirects to `/app/`.
- Responses are `no-store`: edit a file, reload the page.
- `/dev/phone.html?w=390&h=844` shows the dev page in a phone-sized frame (`?w=800&h=1000`: tablet), same storage.
- `/app/rules.html` is the rules reader (SW5E's books).
- `/web/` is `dist/web/`, the web version as a host serves it: offline worker on, its own storage ("sw5e-sheet"),
  no sw5e.com. Test installing, offline use (DevTools → Network → Offline) and updates there; after a change the
  open page says a new version is ready.
- While it runs, `dist/extension/` and `dist/web/` are kept built.

## What works / what doesn't
- Everything the sheet does by itself: drawing, the rules engine, tracking, rolling, editing, import and export,
  creating characters, the rules reader.
- **Load from SW5E, Sync and Check with sw5e.com go through the installed extension.** `dev/bridge-proxy.js` gives
  the page `platform.sw5e`: a message to the extension's background worker, which runs the real bridge
  (`extension/bridge.js`) against a sw5e.com tab. This needs the extension installed from `dist/extension/` with
  `externally_connectable` in its manifest (dev builds have it; `dev/pack.py` strips it). Extension id defaults to
  `mfikebeffkcgnkppppccnidnneblggaa`; use `/?ext=<id>` once if yours differs. Without the extension (another
  browser, Playwright) the dev page is the plain web version: those buttons are hidden.
- **Protect your real characters first:** in the dev page's console,
  `localStorage.setItem('sw5e-dev:protectedIds', JSON.stringify(['<sw5e.com id>', …]))` (`'[]'` if none), then
  reload. Those characters are never saved to sw5e.com from the dev page nor recorded as test cases; until the list
  is set, the dev page saves, creates and records nothing on sw5e.com (the sheet's own storage works as usual). Test
  saves against a throwaway character. The guard is only in the dev page: the extension's own page saves whatever
  you sync.
- **The extension reloads itself** when its `manifest.json`, `background.js` or `bridge.js` changed on disk: on
  the dev page's next sw5e.com request it notices, reloads, and the page retries (a few seconds; open extension
  tabs close). Reload by hand in `chrome://extensions` only if this check itself changed.

## SW5E's data
`app/data/sw5e/` is the copy of SW5E's rules data, item list and rule books that comes with the sheet (see its
[README](../app/data/sw5e/README.md) for where it's from and whose it is). To update it:
```
node dev/fetch-sw5e.js --check    # what SW5E's data service has that's different; writes nothing
node dev/fetch-sw5e.js            # fetch it into app/data/sw5e/
```
It says which classes, features, items and chapters changed. After a change: `node dev/engine-check.js` and
`node dev/regress.js`, and record SW5E's results again (below) if the data the engine reads changed. The sheet
also fetches newer data by itself when sw5e.com reports a newer data version than its copy.

## Reports
`node dev/effects-report.js [catalog.json] [--items] [--unhandled]` runs `app/effects.js` over every item: how many
get bonuses applied, by stat and item kind; `--items` lists each item's reading, `--unhandled` the stat-like
sentences kept only as notes (candidates for new rules, or deliberately conditional).

`node dev/features-report.js [rules.json] [--unhandled[=N]] [--states] [--class=Name] [--examples]` does the same
for `app/classes.js` over every class feature, archetype feature and class option: how many give effects, uses and
states; `--states` lists the switch-on states it finds (and features worded like one that aren't); `--unhandled`
the stat-like sentences it makes nothing of, after setting aside table-time rules (targets, actions, triggers) and
numbers SW5E computes itself.

`node dev/choices-check.js [rules.json] <character.json | -e '<json>'> [--effects]` prints what `app/choices.js`
and `app/powers.js` make of a character: each class's option lists (with archetype lists and Engineer
modifications), maneuvers, powers known from class and archetype tables, every choice slot (fighting styles,
forms, focuses, improvements, maneuvers and powers given by features, feats and species) with its count, picks and
problems, and with `--effects` what each pick does. The player panels use it to check the rules reading without a
browser.

All three read SW5E's data from `app/data/sw5e/` unless given a file.

`POST /dev/dump/<name>` saves the request body to `dev/dumps/<name>` (git-ignored), to pull data out of the dev
page for analysis.

## The server
`server/` is the sheet's own server (accounts and backups; [docs/server.md](../docs/server.md)). `dev/serve.py` is not
it: the dev page has no accounts.
```
python dev/build.py && node server/server.js     # http://localhost:8780/, database in server/data/
node dev/server-check.js                         # every API on a temporary database, with a stand-in for Google
```

## Regression check
```
node dev/regress.js              # compare every case (exit code 1 when something changed)
node dev/regress.js kadro        # only the cases whose file name contains "kadro"
node dev/regress.js --update     # accept what the sheet shows now
```
Draws each recorded test character with the sheet's own code in Node (`dev/headless.js`: the same scripts as
`app/index.html`, with stand-ins for the page, the platform's storage and a stopped clock; SW5E's data from
`app/data/sw5e/`; no browser, no sw5e.com) and compares the result with `dev/regress/expected/<case>.txt`. Each
report has:
- **Sent to the rules engine:** the tweaks the sheet's effects, features and edits add, and whether SW5E's recorded
  calculation is still for exactly that. "OUT OF DATE" means a change alters what's computed from: the numbers
  can't be checked against SW5E until the case is recorded again (check the tweak lines first).
- **Numbers:** what the rules engine gave (AC, HP, saves, skills, weapons, casting…).
- **Effects and tweaks,** and **Rolls:** every roll the sheet offers (to-hit, damage, critical and two-handed damage,
  checks, saves, powers…) with its bonus by source, options, critical range and warnings.
- **Sheet:** the text of every section, with the hover explanation of each number an effect changed.

Changes are listed by part, old line above new (`--full` shows all of them, `--out=<dir>` writes the reports).
A change you meant: `--update`, and commit the expected files with it. The exit code is 1 only when a case changed:
a new case without expected output yet (just after `bump-check --save`) is listed as new and exits 0.

What the Node runs never do: timers don't run (`setTimeout` is a no-op in `dev/headless.js`, so a recalculation or
save scheduled for later never happens) and the page's `main()` is skipped. Code that only runs there is checked in
the dev page, not by these tools. Nothing runs the checks for you either: GitHub's workflow only builds and publishes.

The cases (`dev/regress/cases/`, 107 of them) are of two kinds, and the demo character (`demo-character`: empty
storage, the sheet adds it; SW5E never computed it). 12 were recorded from test characters on sw5e.com,
with SW5E's own calculation of them (`armstech-test-local`, `kadro-vos-panel`…). The others were made from those by
`dev/bump-check.js --save` to keep a fix fixed (mostly `dice-…`, `choices-…`, `items-…`, `readers-…`, `tweak-…`);
they carry `from: { case, changes }`. A case copied and changed by hand needs `from` as well, or `dev/engine-check.js`
compares it with the original character's SW5E calculation and reports differences. To record the test characters
again (new test characters, or to see whether sw5e.com's engine changed: record, then compare):
1. In the dev page's console: `const rec = await import('/dev/regress-record.js'); await rec.record()`. It has
   sw5e.com compute each character with its edits and effects (nothing is saved there) and writes the dev storage
   with those calculations to `dev/dumps/regress-state.json` (git-ignored). Protected characters (see above) are
   left out.
2. `node dev/regress.js record` makes one case per character, with the sw5e.com ids and the account's id replaced
   by made-up ones (it stops if it finds an e-mail address).
3. `node dev/regress.js` shows what the new recording changes; `--update` accepts it.

### What one change does
```
node dev/bump-check.js --list                                     # the recorded characters
node dev/bump-check.js kadro-vos-panel --item "Strength Enhancer" --attune
node dev/bump-check.js consular-test-local --feat "Tough" --js "raw.tweaks = {}"
```
Draws a recorded character, applies the change (a feat, an item carried, equipped or attuned, another species, or
any JavaScript on the stored character), draws it again and prints the lines of the report that changed: the
numbers, the effects and tweaks, the rolls and the hover explanation of each changed number. It is how to check that
a feat, feature or item raises what it should, and nothing else, with the right reason. `--save NAME` keeps the
changed character as a case, so a fixed bug stays fixed (`node dev/regress.js --update NAME` accepts its output).
It records where it came from (`from`), so dev/engine-check.js doesn't compare it with SW5E's stored calculation,
which is the original character's.

### What the text readers make of every source
```
node dev/readers.js --out before.txt          # every feat, species trait, class/archetype feature, option…
node dev/readers.js --only species --grep "proficien"
```
Prints, for each SW5E source, what the sheet reads from its text (app/classes.js): numbers, proficiencies, advantages,
defenses, choices it asks for, states and uses. Save it before changing a reader and diff after
(`git diff --no-index before.txt after.txt`): every source whose reading changed shows up, not only the one meant.

## The rules engine
`app/engine.js` computes a character from SW5E's character data and rules the way SW5E's engine does, quirks
included (see [docs/engine.md](../docs/engine.md)). It is checked against SW5E's own results:
```
node dev/engine-check.js            # every number SW5E computed, computed again by the engine
node dev/engine-check.js --all      # every field, the rules references and SW5E's validation too
node dev/engine-check.js --missing  # also list what the engine doesn't compute yet
```
SW5E's results come from the regression cases and from `dev/engine/sw5e-results.json`: made-up characters that
cover the rules (every class at a spread of levels, multiclass pairs, every species, armor, weapon and tweak,
edge cases), computed by sw5e.com. Record them again when the engine grows, and as a sanity check from time to
time (sw5e.com can change):
1. `node dev/engine-cases.js` writes the characters (`dev/engine/inputs.json`, git-ignored).
2. In the dev page's console: `const rec = await import('/dev/engine-record.js'); rec.record()`, and wait for
   `rec.progress.finished` (about two minutes). sw5e.com only computes them; nothing is saved there. The whole
   computed sheets go to `dev/dumps/engine-sw5e.json` (git-ignored; `--all` reads them).
3. `node dev/engine-check.js import` keeps their numbers and says what SW5E now computes differently.
4. `node dev/engine-check.js`.

## Art
The item pictures, the class styles' emblems, patterns and scenes are all drawn for this project
([art/README.md](../art/README.md): the style guide and the colour classes).
```
python dev/art.py                 # check art/items/*.svg and build app/art/items.svg (the sprite the sheet loads)
python dev/art.py preview         # dist/art/preview.png: every item picture in four themes, rarity tiles, energy colours
python dev/art.py preview --only lightsaber*,medpac --scale 160
python dev/art.py preview --emblems
python dev/art.py themes --styles engineer,scholar   # the sheet itself in those styles, dark and light
```
`python dev/art-qa.py [--only …] [--all-sheets]` is the pictures' sanity check: symmetry of front-view items (outline
and details), stray fragments, parts cut off by the canvas; a report and review sheets in `dist/art/qa/<run>/`. Flags
kept on purpose are listed, with the reason, in `art/qa-accepted.txt`.
`python dev/art-manifest.py` writes the drawing briefs (one picture per SW5E item), `python dev/art-release.py <batches>`
stages reviewed batches and builds the sprite from reviewed pictures only.
`themes` draws a saved copy of the dev page (`dev/dumps/mock.html`, git-ignored). To make one, open the dev page on a
character and run in its console:
`fetch('/dev/dump/mock.html', {method: 'POST', body: '<!doctype html>
' + document.documentElement.outerHTML})`.
The previews use headless Chrome or Edge (`CHROME=<path>` if it isn't found) and Pillow to stack the images.

Which picture an item gets is `app/art.js` (by name, then by kind), using the picture lists in `app/art/names.js`.
`node dev/art-items.js` shows the tiles (it sets up those lists first, as `require('./app/art.js')` alone doesn't).
`app/art/items.svg` and `app/art/names.js` are written by `python dev/art.py`: don't edit them by hand.
`dev/art-release.py` stages what it builds with `git add`. The art tools need Pillow, and `dev/art-qa.py` numpy too. The screen effects (low HP, conditions, Rage…) are `app/fx.css`,
driven by `screenFx` in viewer.js.

## Fixtures
The repository has no fixtures (the owner's own characters were left out of it); without them the dev page starts
empty, and **New character…** or **Import file…** puts characters in. `dev/fixtures/` is read when it exists, and
git-ignored: fixtures are usually real characters. `dev/fixtures/*.json` are sheet snapshots (`format: "sw5e-sheet-snapshot"`), or raw SW5E exports (computed by
the sheet's engine). To capture fresh snapshots:
1. Open a signed-in `https://sw5e.com/tools/mycharacters` tab.
2. Paste the contents of `http://127.0.0.1:8765/dev/capture.js` into its DevTools console
   (optionally first `window.CAPTURE_ONLY = ['Character name']`).
3. Move the downloaded `*.sheet-snapshot.json` into `dev/fixtures/` and open `/?reset`.

`capture.js` is generated from `extension/bridge.js` on each request, so it always matches the extension's
extraction code. "Export SW5E's copy with its numbers" in the sheet's menu produces the same format. Importing a
file (Import file…) works too and needs no reset.

## Releasing
`python dev/pack.py` builds `dist/extension/` and writes `dist/sw5e-sheet-<version>.zip` with the dev-only
manifest keys removed. Before publishing, unzip it, load it unpacked, and run through the toolbar button, Load from
SW5E, Sync, Check with sw5e.com and Import in the extension's own page: the dev page doesn't cover the extension's
`chrome.storage` or the toolbar button.

Before packing, raise `version` in `extension/manifest.json`: the zip is named after it.

The web version is `dist/web/` (not `app/` as it is: its `sw.js` needs the file list and `sw5e-grab.js` the
extraction code that `dev/build.py` fills in). Any static file server can host it; GitHub Pages does, from `main`.
It keeps its data in the browser's IndexedDB; characters come in as files or through the sw5e.com bookmark.
