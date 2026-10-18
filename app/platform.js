// Where the sheet keeps its data, and whether it can reach sw5e.com: the one file a wrapper replaces.
//
// This is the web version. Storage is IndexedDB (database "sw5e-sheet", or SHEET_DB_NAME when a page sets it
// before this script): localStorage's 5 MB isn't enough for characters with their history. A web page can't
// reach sw5e.com, so `sw5e` is null. The browser extension replaces this file with extension/platform.js
// (chrome.storage, and sw5e.com through a tab); the regression check (dev/headless.js) with one in memory.
//
//   platform.storage.get(keys)       → { key: value } for the keys that are set (values are JSON copies)
//   platform.storage.set({ key: value })
//   platform.storage.remove(keys)
//   platform.storage.onChanged(fn)   fn(changes), changes = { key: { oldValue, newValue } }: for this page's own
//                                    writes too (as chrome.storage does), and for other tabs' writes
//   platform.sw5e                    { run(args, { preferredTabId, onStatus }) } or null (see sw5e.js)

const platform = (() => {
  'use strict';
  const DB_NAME = (typeof SHEET_DB_NAME === 'string' && SHEET_DB_NAME) || 'sw5e-sheet';
  const listeners = [];
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(DB_NAME + ':storage') : null;

  let opening = null;
  const db = () => opening || (opening = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  /** Run one request in its own transaction. */
  const idb = (mode, fn) => db().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction('kv', mode);
    const req = fn(tx.objectStore('kv'));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  }));
  const readKey = (k) => idb('readonly', (st) => st.get(k));
  // Like chrome.storage: values are kept as JSON (functions and undefined dropped).
  const jsonCopy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  const notify = (changes) => {
    setTimeout(() => listeners.forEach((fn) => fn(changes)), 0);
    if (channel) channel.postMessage(changes);
  };
  if (channel) channel.onmessage = (e) => listeners.forEach((fn) => fn(e.data));

  const storage = {
    async get(keys) {
      const out = {};
      for (const k of [].concat(keys)) {
        const v = await readKey(k);
        if (v !== undefined) out[k] = v;
      }
      return out;
    },
    async set(items) {
      const changes = {};
      for (const [k, v] of Object.entries(items)) {
        const value = jsonCopy(v);
        changes[k] = { oldValue: await readKey(k), newValue: value };
        await idb('readwrite', (st) => st.put(value, k));
      }
      notify(changes);
    },
    async remove(keys) {
      const changes = {};
      for (const k of [].concat(keys)) {
        const old = await readKey(k);
        if (old === undefined) continue;
        changes[k] = { oldValue: old };
        await idb('readwrite', (st) => st.delete(k));
      }
      if (Object.keys(changes).length) notify(changes);
    },
    onChanged(fn) { listeners.push(fn); },
    /** Every key (dev tools and backups). */
    keys: () => idb('readonly', (st) => st.getAllKeys()),
  };

  return { name: 'web', storage, sw5e: null };
})();
