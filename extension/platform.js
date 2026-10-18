// The extension's platform for the sheet (it replaces app/platform.js in the extension build, dev/build.py):
// the sheet's data in chrome.storage.local, and sw5e.com through a tab (bridge.js, loaded before this file).
// See app/platform.js for what each part does.

const platform = {
  name: 'extension',
  storage: {
    get: (keys) => chrome.storage.local.get(keys),
    set: (items) => chrome.storage.local.set(items),
    remove: (keys) => chrome.storage.local.remove(keys),
    onChanged: (fn) => chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local') fn(changes); }),
    keys: async () => Object.keys(await chrome.storage.local.get(null)),
  },
  sw5e: { run: (args, opts) => runInSw5e(args, opts) },
};
