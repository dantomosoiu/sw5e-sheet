# Notes for coding agents

Read, in this order: [README.md](README.md) (what this is), [docs/architecture.md](docs/architecture.md) (the code
map and data flow), [CONTRIBUTING.md](CONTRIBUTING.md) (checks and conventions). [dev/README.md](dev/README.md) has
the tools' main commands (each tool's header comment has all its options); [docs/open-decisions.md](docs/open-decisions.md) the rules decisions already made and the
known gaps. Check there before deciding a rules question again.

## Things that are easy to get wrong
- **No build step for the app:** `app/` is served as it is. Scripts share one global scope in the order of
  `app/index.html`; `dev/headless.js` loads that same list in Node. A new file must be added there.
- **Generated files:** `dist/` (`python dev/build.py`), `app/data/sw5e/` (SW5E's data, `node dev/fetch-sw5e.js`),
  `app/art/items.svg` and `app/art/names.js` (`python dev/art.py`), `docs/wishlist.md` (`python dev/wishlist.py`).
  Edit none of them by hand.
- **The tools find code by its exact text** (the `platform.js` script tag, the `sw5ePageExtract` function, `sw.js`'s
  `VERSION`/`FILES` lines…): docs/architecture.md, "Text the tools rely on".
- **`app/engine.js` copies SW5E's engine exactly, bugs included**, and `node dev/engine-check.js` must stay at 0
  wrong. Rules SW5E's engine leaves out belong in the readers (classes.js, effects.js, choices.js) as effects.
- **Readers work on SW5E's wording.** Prefer a pattern over the sentence to a list of names, quote the sentence in a
  comment, and diff the readings before and after (`node dev/readers.js` for classes.js, `node dev/effects-report.js
  --items` for effects.js): a pattern change can reach sources you didn't mean.
- **A fix isn't done until a check shows it:** `node dev/bump-check.js` for the numbers, then
  `node dev/regress.js`. Read every changed line before `--update`, and commit `dev/regress/expected/` with the change.
- **The checks are slow and memory-hungry:** `dev/regress.js` takes a few minutes. Run one Node check at a time.
  They never run timers or the page's `main()`: code that only runs there needs the dev page.
- **Windows, Git Bash:** heredocs turn `\b` in JavaScript regexes into a backspace character. Write code with the
  editor tools or a script file, and check with `grep -c $'\x08' app/*.js`.
- **sw5e.com is real people's data.** The dev page saves and creates nothing there until `sw5e-dev:protectedIds` is
  set (and the page reloaded); the extension's own page has no such guard. Never save to a character you weren't
  told to use. Never commit ids, e-mail addresses or local paths: the repository is public.
- **A push to `main` publishes the web version** (GitHub Pages).
- **The server (`server/`) holds players' accounts and backups.** Run `node dev/server-check.js` after touching it or
  `app/account.js`; never weaken its checks (the `X-Sheet` header and origin, rate limits, the Google state and
  nonce, not joining a Google sign-in to a password account by e-mail) without saying so. docs/server.md.
- **Keep the docs in step** (CONTRIBUTING.md, "Keep the docs in step"): the user guide `app/README.md` describes every
  visible feature.
