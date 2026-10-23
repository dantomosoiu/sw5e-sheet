# Contributing

How to get the sheet running, change it, and check the change. Read [docs/architecture.md](docs/architecture.md)
first for how the code fits together; [dev/README.md](dev/README.md) has the tools' main commands, and each tool's
header comment lists all of its options.

## Set up
Requirements: Python 3 and Node.js 18 or later. Nothing to install: no packages, no build step for the app itself.
Chrome is only needed for the extension, and Python's Pillow (and numpy, for `dev/art-qa.py`) only for the art and
icon tools.
```
python dev/serve.py      # http://127.0.0.1:8765/ : the sheet as a web page, from the files on disk (reload after an edit)
```
The dev page starts with no characters: the repository has none of anyone's own (`dev/fixtures/`, git-ignored, is read if you
make it, see dev/README.md). Make one with **New character…**, or **Import file…** a character exported from sw5e.com.
The recorded test characters in `dev/regress/cases/` are what the checks use, and need no browser.

Load from SW5E, Sync and Check with sw5e.com work only through the Chrome extension, installed from `dist/extension/`
(dev/README.md, "What works / what doesn't"). Before using them from the dev page, list the sw5e.com characters it
must never change (`sw5e-dev:protectedIds`, then reload); until that list is set the dev page saves, creates and
records nothing on sw5e.com. Test saves on a throwaway character. The extension's own page has no such guard.

## Check a change
Every change:
1. `node dev/regress.js` (a few minutes): draws every recorded character (106 cases) with the sheet's code in Node
   and compares it with the accepted output. Read every changed line. If each one is what you meant,
   `node dev/regress.js --update` and commit `dev/regress/expected/` with the change.
2. `node dev/engine-check.js`: the rules engine against SW5E's own results. It must stay at 0 wrong.

And by kind of change:
- **A number** (a feature, feat, trait or item that should raise something):
  `node dev/bump-check.js <case> --feat "…" | --item "…" --attune | --js "…"` prints exactly what changed, with
  each hover explanation. Check that it raises what it should, and nothing else, with the right reason. Keep it as a
  case with `--save <name>`, so it stays fixed.
- **A text reader in classes.js** (features, feats, species traits, options): `node dev/readers.js --out before.txt`
  before, `--out after.txt` after, and `git diff --no-index before.txt after.txt`: every source whose reading
  changed, not only the one you meant. `dev/features-report.js` counts what is read.
- **An item reader in effects.js:** the same with `node dev/effects-report.js --items > before.txt` and after.
- **Choice slots (choices.js, powers.js):** `node dev/choices-check.js <character.json>` prints every slot; it takes
  a character or snapshot file, not a regression case (`node dev/bump-check.js` covers what picks do).
- **The engine:** see [docs/engine.md](docs/engine.md). It copies SW5E, so a difference from SW5E is a bug in the
  engine, even when SW5E's result looks wrong.
- **What you see:** look at it in the dev page, also at phone size (`/dev/phone.html?w=390&h=844`), in light and
  dark. Rendering changes show in the regression output's "Sheet" part.
- **The web version or the extension:** `python dev/build.py`, then `/web/` on the dev server, or reload the
  unpacked extension.

### Regression cases
`dev/regress/cases/*.json` are characters with their stored data and, for the recorded ones, SW5E's calculation
of them. 12 were recorded from test characters on sw5e.com (`*-local`, `*-panel` and the like;
`node dev/regress.js record`); the rest (mostly `dice-…`, `choices-…`, `items-…`, `readers-…`, `tweak-…`) were made
by `bump-check --save` to pin a fix. A case made from another carries `from: { case, changes }`, which tells
`engine-check` not to compare it with the original's SW5E calculation. A case you copy and change by hand needs
`from` too.

## Writing code
- **Match the code around you:** plain functions, the file's prefix (see the architecture table), comments that
  say why, and the SW5E sentence a rule comes from, quoted, next to the code that reads it.
- **Read rules from SW5E's text**, not from a list of names, wherever the text can be read: then every source
  worded the same way works. Name a source only when its wording is unique, and say so.
- **The engine copies SW5E; the sheet's own rules are effects.** Don't "fix" SW5E in `engine.js`. A rule SW5E's
  engine leaves out goes in the readers (classes.js, effects.js, choices.js), where its change is explained on hover.
- **Every changed number explains itself.** A new bonus needs a source label ("+2 (Rage)"), which the hover lists.
- **No libraries or remote files.** The sheet runs offline and as an extension: no CDN, no icon fonts, no npm.
  The only network calls are SW5E's data service and, in the extension, sw5e.com.
- **Words on screen:** plain and short, as the user guide is written. Say what happened and what the player can do.
- **Generated files:** never edit `app/data/sw5e/` (`node dev/fetch-sw5e.js` fetches it), `dist/` (`dev/build.py`),
  `app/art/items.svg` and `app/art/names.js` (`dev/art.py`) or `docs/wishlist.md` (`dev/wishlist.py`) by hand.
- **A pure file using another** finds it as a global in the page and with `require` in Node:
  `typeof prSpeciesOf !== 'undefined' ? prSpeciesOf : require('./progression.js').prSpeciesOf` (see the top of
  choices.js). Without that, the Node tools break while the page works.
- **Text the build depends on:** `dev/build.py`, `dev/serve.py` and `dev/headless.js` find things in the source by
  their exact text; see [docs/architecture.md](docs/architecture.md), "Text the tools rely on".

## Keep the docs in step
In the same commit as the change:
- [app/README.md](app/README.md), the user guide: anything a player can see or do.
- [docs/open-decisions.md](docs/open-decisions.md): a rules reading that needed a choice (numbered, with the
  alternative), and what isn't modelled yet ("Not done yet").
- [docs/engine.md](docs/engine.md): what the engine computes and SW5E's quirks it copies.
- [dev/README.md](dev/README.md): a new tool or option. [docs/architecture.md](docs/architecture.md): a new file,
  storage key or flow.

Records, not kept up to date: `docs/panel/` (simulated player and GM panels, with their briefs), `docs/class-audit.md`
(2026-10-16), and `docs/wishlist.md` (generated from `docs/wishlist.json` by `python dev/wishlist.py`; every item is
resolved). [docs/open-source.md](docs/open-source.md) and [docs/phone-app.md](docs/phone-app.md) are plans with
their status.

## Privacy
The repository is public. Never commit sw5e.com character or account ids, e-mail addresses, local paths or real
players' characters. `dev/regress.js record` replaces ids and refuses a file with an e-mail address; anything you
paste (logs, dumps) is yours to check. `dev/dumps/` and `dist/` are git-ignored.

## Commits and publishing
- Commit messages: a short subject saying what changed, from the player's side where there is one ("Dice land
  flat: the table seen from above, the result face on top"; "Readers: Saber Storm's AC and Totem of the Acklay's Strength only while active").
- Commit the regression outputs with the change that caused them.
- Every push to `main` publishes the web version to GitHub Pages (`.github/workflows/pages.yml`), so push only
  what passes the checks. Nothing runs them for you: the workflow only builds and publishes.

## On Windows
The tools run in PowerShell or Git Bash. In Git Bash, a heredoc that writes JavaScript turns `\b` into a backspace
character: write edits with an editor or a script file (`grep -c $'\x08' app/*.js` finds the damage). The checks load
the whole sheet and SW5E's data in Node: run them one at a time on a small machine (bump-check can run several at
once, each with its own `--out` folder, where memory allows).
