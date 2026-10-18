// Dev-only stand-in for the extension APIs the viewer uses, so viewer.html can run
// as a normal page from dev/serve.py. Never shipped: it lives outside sw5e-sheet/.
//
//   chrome.storage.local  -> IndexedDB "sw5e-dev" (localStorage is too small for the rules data
//                            and computed sheets), seeded from dev/fixtures/; older dev data kept
//                            in localStorage ("sw5e-dev:" keys) is moved over once
//   chrome.storage.onChanged -> fired for this tab's own writes (as in the extension) and,
//                               via a BroadcastChannel, for writes from other dev tabs
//   chrome.tabs / chrome.scripting -> unavailable; dev/bridge-proxy.js instead routes
//                               loading/recomputing through the installed extension.
//
// URL params: ?reset  clears dev storage and re-seeds from fixtures.
(function () {
  'use strict';
  // Present when an installed extension lists this origin in externally_connectable;
  // dev/bridge-proxy.js uses it to reach the extension.
  window.__realChromeRuntime = window.chrome && window.chrome.runtime;
  const PREFIX = 'sw5e-dev:';
  const SEEDED = '__seeded';
  // Small settings that stay in localStorage (read synchronously by dev/bridge-proxy.js).
  const LOCAL_ONLY = new Set(['extId', 'protectedIds']);
  const listeners = [];
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sw5e-dev-storage') : null;

  const dbReady = new Promise((resolve, reject) => {
    const req = indexedDB.open('sw5e-dev', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  /** Run one IndexedDB request in its own transaction. */
  const idb = (mode, fn) => dbReady.then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', mode);
    const req = fn(tx.objectStore('kv'));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  }));
  const readKey = (k) => idb('readonly', (st) => st.get(k));
  const writeKey = (k, v) => idb('readwrite', (st) => st.put(v, k));
  const deleteKey = (k) => idb('readwrite', (st) => st.delete(k));
  // Like chrome.storage: values are stored as JSON (functions/undefined dropped).
  const jsonCopy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  const params = new URLSearchParams(location.search);
  const ready = (async () => {
    if (params.has('reset')) {
      await idb('readwrite', (st) => st.clear());
      Object.keys(localStorage).filter((k) => k.startsWith(PREFIX) && !LOCAL_ONLY.has(k.slice(PREFIX.length)))
        .forEach((k) => localStorage.removeItem(k));
    }
    // Move dev data that older versions of this shim kept in localStorage.
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIX) || LOCAL_ONLY.has(k.slice(PREFIX.length))) continue;
      try { await writeKey(k.slice(PREFIX.length), JSON.parse(localStorage.getItem(k))); } catch (e) { /* skip bad entries */ }
      localStorage.removeItem(k);
    }
    // Seed fixtures once (or after ?reset). Snapshot files and SW5E raw exports are both accepted;
    // raw exports become raw-only snapshots, since computing needs sw5e.com.
    if (await readKey(SEEDED)) return;
    const snaps = (await readKey('snapshots')) || {};
    try {
      const files = await (await fetch('/dev/fixtures/index.json')).json();
      for (const f of files) {
        const data = await (await fetch('/dev/fixtures/' + encodeURIComponent(f))).json();
        for (const s of Array.isArray(data) ? data : [data]) {
          const snap = s.format === 'sw5e-sheet-snapshot' ? s : {
            format: 'sw5e-sheet-snapshot', version: 1, raw: s, complete: null, refs: null, validation: null,
            error: 'Raw fixture (no computed data) — capture a snapshot with dev/capture.js for full output.',
            source: 'file', loadedAt: Date.now(), meta: null,
          };
          snap.key = snap.key || (snap.raw.id ? 'id:' + snap.raw.id : 'fixture:' + f);
          snaps[snap.key] = snap;
        }
      }
    } catch (e) {
      console.warn('[dev-shim] could not seed fixtures', e);
    }
    await writeKey('snapshots', snaps);
    await writeKey(SEEDED, true);
  })();

  const notify = (changes) => {
    // Match the extension: chrome.storage.onChanged also fires in the tab that wrote.
    setTimeout(() => listeners.forEach((fn) => fn(changes, 'local')), 0);
    if (channel) channel.postMessage(changes);
  };

  const unavailable = (what) => async () => {
    throw new Error(`${what} is not available in the dev harness — use the installed extension, or add a fixture with dev/capture.js`);
  };

  window.chrome = {
    runtime: { getURL: (p) => new URL(p, location.href).href },
    storage: {
      local: {
        async get(keys) {
          await ready;
          const out = {};
          for (const k of [].concat(keys)) {
            const v = await readKey(k);
            if (v !== undefined) out[k] = v;
          }
          return out;
        },
        async set(items) {
          await ready;
          const changes = {};
          for (const [k, v] of Object.entries(items)) {
            const value = jsonCopy(v);
            changes[k] = { oldValue: await readKey(k), newValue: value };
            await writeKey(k, value);
          }
          notify(changes);
        },
        async remove(keys) {
          await ready;
          const changes = {};
          for (const k of [].concat(keys)) {
            const old = await readKey(k);
            if (old === undefined) continue;
            changes[k] = { oldValue: old };
            await deleteKey(k);
          }
          if (Object.keys(changes).length) notify(changes);
        },
      },
      onChanged: { addListener: (fn) => listeners.push(fn) },
    },
    tabs: { get: unavailable('chrome.tabs'), query: unavailable('chrome.tabs'), create: unavailable('chrome.tabs'), remove: async () => {} },
    scripting: { executeScript: unavailable('chrome.scripting') },
  };

  // Other dev tabs writing storage.
  if (channel) channel.onmessage = (e) => listeners.forEach((fn) => fn(e.data, 'local'));

  document.documentElement.dataset.dev = '1';
  console.info('[dev-shim] SW5E sheet running in dev harness');
}());
