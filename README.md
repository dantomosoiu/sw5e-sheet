# SW5E Character Sheet

A character sheet for [SW5E](https://sw5e.com) (Star Wars 5e) characters: everything about the character on one
scrollable page, a dice roller, play tracking (hit points, points, uses, conditions, rests), inventory, creating and
levelling up characters, and SW5E's rule books to read and search. It keeps its own copy of each character (with its
play state and changes) and computes the numbers with its own rules engine, which follows SW5E's and is checked
against it. SW5E's rules data and books come with it, so it works offline.

It is a web app (`app/`) that installs on a phone or computer and works offline, and runs as a Chrome extension (`extension/`, a thin wrapper around the app) that also
connects it to sw5e.com: **Load from SW5E** brings in your sw5e.com characters, **Sync to SW5E** sends them back, and
each load compares the sheet's numbers with sw5e.com's own calculation.

The web version is published from `main` at https://dantomosoiu.github.io/sw5e-sheet/ (GitHub Pages). It can also be
hosted with its own server (`server/`, [docs/server.md](docs/server.md)), which adds optional accounts: signed in, a
player's characters are backed up to the server and can be restored on any device.

The rules are SW5E's, by Galiphile and the SW5E contributors ([credits](app/data/sw5e/credits.md),
[notices](NOTICE.md)). Not affiliated with SW5E, Lucasfilm, Disney or Wizards of the Coast.

## What's here
- `app/`: the sheet, a web app with no build step. Its [README](app/README.md) is the user guide.
  - `app/data/sw5e/`: SW5E's rules data, item list and books, as SW5E publishes them ([where from, and whose](app/data/sw5e/README.md)).
  - `app/platform.js`: where the sheet keeps its data and whether it can reach sw5e.com; the one file a wrapper replaces.
  - `app/engine.js`: the rules engine ([docs/engine.md](docs/engine.md)).
- `art/`: the item pictures, drawn for this project ([style guide](art/README.md)); `dev/art.py` builds them into
  `app/art/`, where the class styles' emblems and background art are too.
- `extension/`: the Chrome extension around the app: manifest, toolbar button, the sw5e.com bridge, and its own
  `platform.js` (Chrome's storage, sw5e.com through a tab). [Installing it](extension/README.md).
- `server/`: the sheet's own server: serves the web version, with accounts (e-mail and password, or Google) and
  character backups ([docs/server.md](docs/server.md)); `deploy/`: setting it up on an Ubuntu droplet.
- `dev/`: development tools ([dev/README.md](dev/README.md)):
  - building the extension and the web version (`python dev/build.py`: `dist/extension/`, `dist/web/`) and
    packing an extension release (`python dev/pack.py`);
  - a server that runs the sheet as a web page (`python dev/serve.py`), with sw5e.com reached through the installed
    extension;
  - the regression check (`node dev/regress.js`), which draws recorded test characters in Node and compares the
    result with what they showed before, and the engine check (`node dev/engine-check.js`) against SW5E's results;
  - fetching SW5E's data again (`node dev/fetch-sw5e.js`), and reports on how SW5E's rules text is read.
- `docs/`:
  - [architecture.md](docs/architecture.md): how the code fits together, start here to work on it;
  - [engine.md](docs/engine.md): how the rules engine computes, SW5E's quirks it follows, and how it's checked;
  - [server.md](docs/server.md): the server, accounts and backups, and deploying it;
  - [open-decisions.md](docs/open-decisions.md): rules decisions and known gaps;
  - [open-source.md](docs/open-source.md) and [phone-app.md](docs/phone-app.md): plans, with their status;
  - records of how the sheet was tested, not kept up to date: [class-audit.md](docs/class-audit.md) (what each class
    needs, 2026-10-16), [wishlist.md](docs/wishlist.md) (every wish from simulated player panels, with its outcome)
    and `docs/panel/` (the panels' briefs, logs and reviews).
- [CONTRIBUTING.md](CONTRIBUTING.md): setting up, checking a change, conventions; [AGENTS.md](AGENTS.md): notes for
  coding agents.

## Developing
Requirements: Python 3 (dev server and build) and Node.js 18 or later (checks and reports); Chrome for the
extension. No packages to install. In short ([CONTRIBUTING.md](CONTRIBUTING.md) has the whole of it):
1. `python dev/serve.py`: serves the sheet at http://127.0.0.1:8765/ from the files on disk, and keeps
   `dist/extension/` and `dist/web/` built.
2. For sw5e.com (Load, Sync): load `dist/extension/` unpacked in `chrome://extensions` (Developer mode), and in the
   dev page's console list the sw5e.com characters that must never be changed from it (see
   [dev/README.md](dev/README.md)).
3. After a change: `node dev/regress.js` and `node dev/engine-check.js`.

## License
The sheet is licensed under the [GNU General Public License v3.0](LICENSE) ([notices](NOTICE.md)). SW5E's rules,
data and books in `app/data/sw5e/` belong to SW5E's authors, who are credited there, and aren't covered by this
license.
