# SW5E Character Sheet

A character sheet for [SW5E](https://sw5e.com) (Star Wars 5e) characters: everything about the character on one
scrollable page, a dice roller, play tracking (hit points, points, uses, conditions, rests), inventory, and
creating and levelling up characters. It runs as a Chrome extension. The extension keeps its own copy of each
character (with its play state and changes) in the browser; sw5e.com's character engine computes the numbers,
and **Sync to SW5E** sends the character back to sw5e.com.

Not affiliated with SW5E, Lucasfilm, Disney or Wizards of the Coast.

## What's here
- `sw5e-sheet/`: the extension. Its [README](sw5e-sheet/README.md) covers installing (load it unpacked) and using it.
- `dev/`: development tools ([dev/README.md](dev/README.md)):
  - a server that runs the sheet as a web page (`python dev/serve.py`), with sw5e.com reached through the
    installed extension;
  - the regression check (`node dev/regress.js`), which draws recorded test characters in Node and compares
    the result with what they showed before;
  - reports on how SW5E's rules text is read (`dev/effects-report.js`, `dev/features-report.js`,
    `dev/choices-check.js`);
  - packing a release (`python dev/pack.py`).
- `docs/`:
  - [open-decisions.md](docs/open-decisions.md): rules decisions and known gaps;
  - [class-audit.md](docs/class-audit.md): what each class needs;
  - [wishlist.md](docs/wishlist.md): every wish from simulated player panels, with its outcome, and
    `docs/panel/` with their logs;
  - [open-source.md](docs/open-source.md) and [phone-app.md](docs/phone-app.md): plans.

## Developing
Requirements: Chrome, Python 3 (dev server) and Node.js (checks and reports). No packages to install.
1. Load `sw5e-sheet/` unpacked in `chrome://extensions` (Developer mode).
2. `python dev/serve.py`, then open http://127.0.0.1:8765/.
3. In the dev page's console, list the sw5e.com characters that must never be changed from it (see
   [dev/README.md](dev/README.md)).
4. After a change: `node dev/regress.js`.

## License
[GNU General Public License v3.0](LICENSE). SW5E's own rules and item text, which the sheet reads from sw5e.com and
some test cases quote, belongs to its authors and isn't covered by this license.
