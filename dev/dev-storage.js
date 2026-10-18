// Dev only: injected by dev/serve.py right after app/platform.js. The dev page is the web version of the sheet
// (storage in IndexedDB "sw5e-dev", set by serve.py before platform.js) with two additions:
//   * test characters from dev/fixtures/*.json are put in once (sheet snapshots, or raw SW5E exports, which the
//     sheet's engine computes); `?reset` clears the dev storage and puts them in again;
//   * dev/bridge-proxy.js (injected next) reaches sw5e.com through the installed extension.
(function () {
  'use strict';
  const SEEDED = '__seeded';
  const base = platform.storage;
  const params = new URLSearchParams(location.search);
  const ready = (async () => {
    if (params.has('reset')) for (const k of await base.keys()) await base.remove(k);
    if ((await base.get(SEEDED))[SEEDED]) return;
    const snaps = (await base.get('snapshots')).snapshots || {};
    try {
      const files = await (await fetch('/dev/fixtures/index.json')).json();
      for (const f of files) {
        const data = await (await fetch('/dev/fixtures/' + encodeURIComponent(f))).json();
        for (const s of Array.isArray(data) ? data : [data]) {
          const snap = s.format === 'sw5e-sheet-snapshot' ? s : {
            format: 'sw5e-sheet-snapshot', version: 1, raw: s, complete: null, refs: null, validation: null, error: null,
            source: 'file', loadedAt: Date.now(), meta: null,
          };
          snap.key = snap.key || (snap.raw.id ? 'id:' + snap.raw.id : 'fixture:' + f);
          snaps[snap.key] = snap;
        }
      }
    } catch (e) {
      console.warn('[dev] could not put in the fixtures', e);
    }
    await base.set({ snapshots: snaps, [SEEDED]: true });
  })();
  // The sheet's storage, after the fixtures are in.
  platform.storage = {
    ...base,
    get: async (keys) => { await ready; return base.get(keys); },
    set: async (items) => { await ready; return base.set(items); },
    remove: async (keys) => { await ready; return base.remove(keys); },
  };
  document.documentElement.dataset.dev = '1';
  console.info('[dev] SW5E sheet running as the dev page');
}());
