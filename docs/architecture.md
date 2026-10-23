# How the code fits together

A map for working on the sheet: what each file does, how a character becomes the page you see, and where a change
belongs. The user guide ([app/README.md](../app/README.md)) says what the sheet does; [dev/README.md](../dev/README.md)
has the tools' main commands; [CONTRIBUTING.md](../CONTRIBUTING.md) the way of working.

## The shape of it
- **Plain scripts, no build step, no packages.** `app/index.html` loads every script in order with `<script src>`;
  they share one global scope (no ES modules, no framework, no bundler). A file can use what an earlier one defines,
  and viewer.js's globals (`state`, `esc`, `arr`, `num`…) at call time. The pure files end with
  `if (typeof module !== 'undefined') module.exports = {…}` so the Node tools can `require` them; one that uses
  another finds it as a global or requires it (`typeof X !== 'undefined' ? X : require('./x.js').X`).
- **The same code runs in four places:** the web version (`dist/web/`), the Chrome extension (`dist/extension/`),
  the dev page (`python dev/serve.py`) and Node (`dev/headless.js`, which reads the script list from
  `app/index.html` and runs them in one context with stand-ins for the page). A new script goes in `app/index.html`
  and is then loaded everywhere.
- **What depends on where it runs is behind `platform`** (`app/platform.js`): storage (IndexedDB on the web,
  `chrome.storage.local` in the extension, memory in Node) and `platform.sw5e`, the way to sw5e.com (only the
  extension has one; elsewhere it's null and the buttons that need it are hidden).
- **SW5E's rules data, item list and books ship with the app** (`app/data/sw5e/`, fetched by `dev/fetch-sw5e.js`).
  Never edit them by hand: what SW5E's data gets wrong is corrected in code that reads it, with a comment.

## The files, in load order
| File | Prefix | What it does |
|---|---|---|
| `platform.js` | `platform` | storage and the sw5e.com connection (the one file a wrapper replaces) |
| `md.js` | `md` | a small, safe markdown renderer for SW5E's text |
| `sw5e.js` | | the sheet's calls to sw5e.com (load, compute, save, create), through `platform.sw5e` |
| `sw5e-data.js` | `SW5E_…`, `sw5e…` | reading SW5E's rules and item data, and fetching a newer version from SW5E's data service |
| `effects.js` | `fx…` | **item effects**: reads an item's text into mods (numbers) and notes; `fxResolve` turns effects into tweaks |
| `classes.js` | `cls…` | **the text readers** for class features, archetype features, class options, feats and species traits: what a feature adds (`clsFeatureEffects`), its uses (`clsUsage`), a state you Start (`clsFeatureState`), the choices it asks for; and the class option lists |
| `choices.js` | `ch…` | **choice slots**: picks a feature, feat or species hands out from SW5E's other lists (fighting styles, forms, focuses, improvements, granted maneuvers and powers), stored in `raw.featureChoices` |
| `powers.js` | `pw…` | who casts what: class and archetype casting tables, powers known, power costs, powers granted by features |
| `progression.js` | `pr…` | creating a character and levelling up: the rules, written into the fields SW5E's engine reads |
| `play.js` | `PL_…`, `pl…` | table rules: conditions on rolls and speed, damage against resistances, the concentration save |
| `inventory.js` | `inv…` | item search, rarity names, an enhanced item's base, selling, reloading |
| `engine.js` | `eng…` | **the rules engine**: SW5E's character computation, quirks included ([engine.md](engine.md)) |
| `dice3d.js` | `Dice3D` | the dice drawn in 3D on a canvas (only how a roll looks; the numbers are rolled before) |
| `roller.js` | `roll…`, `rl` | **the dice roller**: what each rollable number rolls (`buildRoll`), the dice dock, the roll log |
| `builder.js` | `bd…` | the pickers and flows that build a character: proficiencies, level up, new character |
| `art/names.js`, `art.js`, `icons.js` | `ART_…`, `art…`, `uiIcon` | item pictures, the sheet's line icons |
| `viewer.js` | | **the sheet**: storage, the character model, edits, effects, tracking, every section's rendering, events (about 9,300 lines) |
| `shortcuts.js` | | keyboard shortcuts |
| `info.js` | | hover, focus and press-and-hold explanations; Explain mode; item cards |
| `pwa.js`, `sw.js` | | the web version's offline app (service worker; `dev/build.py` fills in `sw.js`) |
| `rules.html`, `rules.js` | | the rules reader (SW5E's books) |
| `sw5e-grab.js` | | the bookmark's script that reads characters in a sw5e.com page (web version only) |

The extension (`extension/`) adds `background.js` (the toolbar button), `bridge.js` (runs code in a sw5e.com tab:
reading characters, sw5e.com's own calculation, saving) and its own `platform.js`.

## From a stored character to the page
A character is a **snapshot** (see the top of viewer.js). The storage keys (constants at the top of viewer.js and
roller.js); these are maps by character key:
- `snapshots`: `raw`, SW5E's own character JSON as last loaded or saved, and `complete`, a computed sheet;
- `edits`: the changes made here (`{ fields: { path: value } }`), shown over `raw`: the character is `raw` with
  its edits. A sync folds in what sw5e.com kept (`pruneEdits`) and keeps the rest;
- `trackers`: play state (HP, points, uses, death saves, conditions);
- `itemState`: local only: item charges, active effects (consumables used, effects received) and the states
  started (`inUse`: Rage, a form…);
- `derived` (computed sheets), `history` (versions), `portraits`, `rolls` (the roll log).

And single values: `rules` and `catalog` (a newer SW5E data version, when fetched, with `rulesInfo`/`catalogInfo`),
`lastCharacter`, `lastBackupExport`, `backupInfo`, `rollSettings`, and `lastWriter` (who wrote last, so other tabs
redraw). Per-device preferences are in `localStorage`, not here: theme, style, compact cards, screen effects…

Every redraw builds a model with `buildModel(snap)` (viewer.js):
1. `withEdits(raw, edits)`: the character as edited.
2. `applyEffects(key, raw, complete)` gathers every effect: items worn, attuned or installed (effects.js), active
   consumables and received effects, and `featureEffects`, everything the sheet reads from features, options,
   feats, species traits and choice picks (classes.js, choices.js, powers.js). `fxResolve` turns their numbers
   into **temporary tweaks** on a copy of the character; what isn't a number becomes a note or a conditional
   bonus.
3. The engine computes that copy (`engineDerived` → `engComputeCharacter`), and once more without the effects and
   tweaks, so each changed number can explain itself (`bumpTip`: dotted, with what changed it on hover). Without
   SW5E's data the sheet asks sw5e.com to compute instead (`recomputeDerived`).
4. The model `m` (`m.c` is the computed sheet, `m.raw` the edited character, `m.base` the sheet without effects and tweaks, `m.fx` the effects…) goes to the sections:
   `SECTIONS` (viewer.js) lists each one with its group, keyboard key, when it shows and its `render…` function.
   A redraw keeps open cards, scroll position and focus.

**What the engine does and what the sheet adds are kept apart.** `engine.js` copies SW5E's computation exactly,
bugs included, so its results can be checked against sw5e.com's. Everything SW5E's engine leaves out (most class
features, species traits, item effects, states, conditions) is added as effects and tweaks in step 2, where the
sheet already explains every change. A rule fix almost always belongs in the readers or the effects, not the engine.

**Rolls.** A rollable number carries `data-roll="kind|args"` (`rollable()` in roller.js). `buildRoll(m, spec)`
makes the roll: its base (each modifier, named), the conditional bonuses offered (features, states, items,
maneuvers…), advantage from conditions and states, and its follow-up (an attack's damage). The kinds: `check`,
`save`, `skill`, `tool`, `init`, `attack`, `damage`, `tech`, `force`, `pattack`, `pdmg`, `maneuver`, `supdie`,
`hitdie`, `death`, `conc`, `featheal`, `itemheal`, `dice`.

**Saving.** Changes are written to storage at once (every write is stamped so other tabs redraw). Sync to SW5E
(sw5e.js → bridge.js) sends the edited `raw`; effects, tweak reasons and the sheet's own data that SW5E's format
can't hold stay local. Since 2026-10-16 the sheet's copy (`raw` with its edits, play state and the rest) is the
truth, and sw5e.com is the check (Load compares numbers), an optional sync and never a backup.

## Reading SW5E's text
Most rules come from reading SW5E's own sentences: "You gain a +1 bonus to AC while you are wearing armor",
"Choose one of the following skills", "while your Saber Storm is active". The readers in classes.js and effects.js
are regular expressions over that text, each with the sentence it reads quoted in a comment. Changing one can
change many sources: `node dev/readers.js` before and after shows every source whose reading changed.
`docs/open-decisions.md` records the readings that needed a decision, and what isn't modelled yet.

## Where a change goes
| You want to… | Look at |
|---|---|
| fix a number SW5E itself computes wrong for every character | nowhere: the engine copies SW5E (say so in [engine.md](engine.md)); correct it as an effect if the sheet should |
| make a feature, feat or species trait change a number | classes.js (`clsFeatureEffects` and its readers), checked with `dev/bump-check.js` |
| make an item do something | effects.js (`parseItemEffect`), `dev/effects-report.js` |
| add a choice a feature asks for | classes.js (`asks`) for a feature's own options; choices.js for picks from SW5E's lists |
| add or change a roll | roller.js `buildRoll`, and where the number is drawn (`rollable(...)` in viewer.js) |
| add a section or a card | `SECTIONS` and a `render…` function in viewer.js |
| change creating or levelling up | progression.js (rules), builder.js (pickers and flows) |
| change how the sheet talks to sw5e.com | sw5e.js and extension/bridge.js (test with the extension installed) |

Then: `node dev/regress.js` and the rest of the checks in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Text the tools rely on
The build, the dev server and the Node loader find these by their exact text; changing one breaks them, sometimes
silently:
- `<script src="platform.js"></script>` in `app/index.html`: `dev/build.py` and `dev/serve.py` put the extension's
  or the dev page's scripts around it (they stop if it's missing).
- Every script tag in `app/index.html` written as `<script src="x"></script>`: `dev/headless.js` reads that list;
  a tag with `defer` or `type` is skipped there without a word, so the checks wouldn't load it.
- `async function sw5ePageExtract(x) {` … `}` (closing at column 0) in `extension/bridge.js`: cut out by
  `dev/build.py` and `dev/serve.py` into the bookmark's script and `capture.js`, so it must use nothing outside
  itself. Raise its `meta.bridge` number when it changes.
- `// __SW5E_PAGE_EXTRACT__` in `app/sw5e-grab.js`, and `const VERSION = '…';` / `const FILES = [];` in `app/sw.js`:
  where `dev/build.py` writes into the web version.
