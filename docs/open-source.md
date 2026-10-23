# Publishing the code: checklist

What has been done towards an open repository, and what's still open.

**Status:** the repository is public since 2026-10-22 (github.com/dantomosoiu/sw5e-sheet), not advertised, and
GitHub Pages publishes the web version from `main`. The questions under "Still to decide" are still open.

## Done (2026-10-18)
- **A new repository with a fresh history**, made from the private one by an export that:
  - leaves out the owner's own characters (a sample and a dev fixture);
  - replaces the sw5e.com ids of characters and accounts in the docs;
  - checks every file for e-mail addresses, local paths and ids, and stops if it finds any.
- **No personal ids in the code.** The dev page keeps the characters it must never save or record in the
  browser (`localStorage` `sw5e-dev:protectedIds`). Until that list is set, it saves and records nothing.
- **Test characters with made-up ids.** The regression check's cases are test characters with their sw5e.com
  ids and the account's id replaced (`node dev/regress.js record`). Recording refuses a file that holds an
  e-mail address.

## Decided (2026-10-18)
- **License:** GPL-3.0 (`LICENSE`): changed versions must stay open, as with the SW5e system for Foundry VTT.
- **Author:** the owner's own name and e-mail in the history.
- **The process docs are published:** `docs/panel/`, the wishlist and the class audit, with ids removed. They
  describe simulated players testing on a test account.
- **Own rules engine** for the numbers, checked against SW5E's while it's built and from time to time after
  (see [phone-app.md](phone-app.md)).
- **SW5E's data and books are kept in the repository, with credit** (the owner: SW5E is open, so fetch its docs,
  serve them locally, use them, and credit SW5E as the original source). `app/data/sw5e/` holds SW5E's rules data,
  item list and books as SW5E's own data service publishes them (`node dev/fetch-sw5e.js`), and the test cases keep
  the SW5E text they quote. SW5E is credited in `NOTICE.md`, `app/data/sw5e/README.md` (with SW5E's own credits,
  `credits.md`), the README, the sheet (Settings, Tweaks & Data → Rules engine) and the rules reader (Credits). The
  GPL text in `LICENSE` stays as it is (it may not be changed); the credit sits beside it in `NOTICE.md`.
- **The extension is a wrapper** around the app (`app/` + `extension/`, built by `dev/build.py`).

What SW5E publishes, as found on 2026-10-18 (for the notices, and for the talk with the SW5E team below):
- Its website's code is public on GitHub ([StarWars5e.Site](https://github.com/sangheili868/StarWars5e.Site),
  [StarWars5e.Core](https://github.com/speedreeder/StarWars5e.Core)) with no license file, which by default leaves
  all rights with its authors.
- Its content says it was made under Wizards of the Coast's Fan Content Policy, and credits Galiphile and the SW5E
  contributors. Star Wars is Lucasfilm's.
- SW5E's Foundry VTT system is GPL-3.0 for its software only.
So SW5E is published openly but not under an open license: the repository credits it and keeps it apart from the
GPL (it says so wherever the data is), and asking SW5E before publishing matters more now that the repository
carries their content.

## Still to decide
1. **SW5E.** Before it's shared more widely:
   - tell the SW5E team and ask whether they mind: the repository carries their data and books (credited), and the
     extension runs sw5e.com's own code in a sw5e.com tab to load, compute and save characters;
   - ask whether they'd put a license on their website's code and content, or say how they'd like to be credited.
2. **Name.** "SW5E" is the community project's name. Check whether the SW5E team is fine with it in the name,
   or pick another.
3. **GPL-3.0 only, or "or later".** `NOTICE.md` says version 3; the usual GPL notice adds "or (at your option) any
   later version".

## Before each push
- `node dev/regress.js` and `node dev/engine-check.js`: the checks pass (see [CONTRIBUTING.md](../CONTRIBUTING.md)).
- Search the change for ids and personal details. The export script does this for the first commit; later
  commits are ordinary, so mind recorded cases and pasted logs.
