# The Chrome extension

A thin wrapper around the sheet (`app/`). The sheet is a web app; the extension adds what a web page can't do:
- **storage** in `chrome.storage.local` (`platform.js`, which takes the place of `app/platform.js`);
- **sw5e.com**: `bridge.js` runs code in a sw5e.com tab to load your characters, save them, and have sw5e.com's own
  engine compute a character (the check on the sheet's engine). The sheet calls it through `platform.sw5e`
  (`app/sw5e.js`);
- **the toolbar button** (`background.js`): opens the sheet, straight to the character if you're on its sw5e.com page.

SW5E's rules data and books come with the sheet (`app/data/sw5e/`), not through sw5e.com.

## Install
1. Build it: `python dev/build.py` (or run `python dev/serve.py`, which keeps it built). The extension is then in
   `dist/extension/`: the sheet with these files in place of the web ones.
2. Open `chrome://extensions`, switch on **Developer mode** (top right).
3. Click **Load unpacked** and choose `dist/extension/`.
4. Pin the extension (puzzle icon → pin).

The [user guide](../app/README.md) covers using the sheet.

A release zip (`python dev/pack.py`) is the same build without the dev-only `externally_connectable` key, which
lets the dev page (`python dev/serve.py`) use the installed extension to reach sw5e.com.
