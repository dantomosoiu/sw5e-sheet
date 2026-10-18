/* The extension's viewer code, loaded in Node without a browser: the same scripts in the same order as
 * viewer.html, in one context, with stand-ins for the page, chrome.storage and the clock. Nothing reaches
 * sw5e.com: computing with SW5E's engine fails, so only stored computations are used.
 *
 *   const { loadSheet } = require('./headless');
 *   const sheet = loadSheet({ storage, now });   // storage: what chrome.storage.local holds
 *   await sheet.ready;                           // loadStore() has run
 *   sheet.ctx.buildModel(...)                    // any of the viewer's functions and state
 */
'use strict';
// The same times on any computer (set before anything reads the clock).
process.env.TZ = 'UTC';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EXT = path.join(__dirname, '..', 'sw5e-sheet');

/** The scripts viewer.html loads, in its order. */
function scriptOrder() {
  const html = fs.readFileSync(path.join(EXT, 'viewer.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((x) => x[1]);
}

/** An element that takes whatever the viewer writes and finds nothing inside. */
function fakeElement(tag = 'div') {
  const el = {
    tagName: String(tag).toUpperCase(), nodeType: 1, id: '', className: '', dataset: {}, style: {}, attributes: [], children: [],
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false, hidden: false, open: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {}, hasAttribute: () => false,
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
    appendChild: (c) => c, append() {}, prepend() {}, remove() {}, replaceWith() {}, insertAdjacentHTML() {}, insertAdjacentElement() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => false, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0 }),
    focus() {}, blur() {}, click() {}, scrollIntoView() {}, scrollTo() {}, setSelectionRange() {},
    offsetTop: 0, offsetHeight: 0, scrollTop: 0, scrollHeight: 0, clientHeight: 0,
  };
  return el;
}

function fakeStorage(initial) {
  const data = new Map(Object.entries(initial || {}).map(([k, v]) => [k, JSON.stringify(v)]));
  // Values are parsed with the sheet's own JSON (set by loadSheet), so they're its objects and arrays.
  let parse = JSON.parse;
  const read = (k) => (data.has(k) ? parse(data.get(k)) : undefined);
  const listeners = [];
  return {
    data,
    useParser: (p) => { parse = p; },
    local: {
      async get(keys) {
        const list = keys == null ? [...data.keys()] : typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
        const out = {};
        for (const k of list) {
          const v = read(k);
          if (v !== undefined) out[k] = v;
          else if (keys && typeof keys === 'object' && !Array.isArray(keys)) out[k] = keys[k];
        }
        return out;
      },
      async set(items) { for (const [k, v] of Object.entries(items)) if (v !== undefined) data.set(k, JSON.stringify(v)); },
      async remove(keys) { for (const k of [].concat(keys)) data.delete(k); },
      async clear() { data.clear(); },
      async getBytesInUse() { return 0; },
    },
    onChanged: { addListener: (f) => listeners.push(f), removeListener() {} },
  };
}

/**
 * Loads the viewer with `storage` as chrome.storage.local and the clock stopped at `now`.
 * Returns { ctx, storage, ready, errors }: ctx is the scripts' shared global scope (functions, state…).
 */
function loadSheet({ storage = {}, now = Date.UTC(2026, 0, 1), locale = 'en-US' } = {}) {
  const store = fakeStorage(storage);
  const errors = [];
  const document = {
    nodeType: 9, title: '', readyState: 'complete', visibilityState: 'visible', hidden: false, activeElement: null,
    body: fakeElement('body'), documentElement: fakeElement('html'), head: fakeElement('head'),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], getElementsByClassName: () => [],
    createElement: fakeElement, createTextNode: () => fakeElement('#text'), createDocumentFragment: () => fakeElement('#fragment'),
    addEventListener() {}, removeEventListener() {}, elementFromPoint: () => null, execCommand: () => false,
  };
  document.activeElement = document.body;
  const media = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  const webStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), key: (i) => [...m.keys()][i] || null, get length() { return m.size; } }; };
  const sandbox = {
    SHEET_HEADLESS: true,
    console: { log() {}, info() {}, debug() {}, warn() {}, error: (...a) => errors.push(a.map(String).join(' ')) },
    document,
    location: { href: 'http://localhost/viewer.html', origin: 'http://localhost', protocol: 'http:', host: 'localhost', pathname: '/viewer.html', search: '', hash: '', reload() {} },
    navigator: { userAgent: 'node', language: locale, languages: [locale], clipboard: { writeText: async () => {} }, onLine: false },
    history: { replaceState() {}, pushState() {} },
    localStorage: webStorage(), sessionStorage: webStorage(),
    matchMedia: media,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    // No timers run: recalculation and saving are scheduled, never done.
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, queueMicrotask,
    addEventListener() {}, removeEventListener() {}, scrollTo() {}, scrollBy() {}, open: () => null, alert() {}, confirm: () => false,
    innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, scrollY: 0, scrollX: 0,
    CSS: { escape: (s) => String(s).replace(/["\\\]\[]/g, '\\$&') },
    URL, URLSearchParams, TextEncoder, TextDecoder, Blob, structuredClone, AbortController,
    fetch: async () => { throw new Error('No network in headless runs'); },
    BroadcastChannel: undefined,
    chrome: {
      storage: store,
      runtime: { id: 'headless', lastError: null, getManifest: () => JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8')), getURL: (p) => `http://localhost/${p}`, sendMessage: async () => { throw new Error('No extension in headless runs'); }, onMessage: { addListener() {} }, connect: () => { throw new Error('No extension in headless runs'); } },
      tabs: { query: async () => { throw new Error('No browser tabs in headless runs'); }, create: async () => { throw new Error('No browser tabs in headless runs'); } },
      scripting: { executeScript: async () => { throw new Error('No browser tabs in headless runs'); } },
    },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  store.useParser(vm.runInContext('JSON.parse', ctx));
  // A stopped clock (in UTC), one locale, and repeatable "random" numbers: the same input draws the same sheet.
  vm.runInContext(`(() => {
    const D = Date, NOW = ${Number(now)}, LOC = ${JSON.stringify(locale)};
    class FixedDate extends D {
      constructor(...a) { super(...(a.length ? a : [NOW])); }
      static now() { return NOW; }
      toLocaleString(l, o) { return super.toLocaleString(l || LOC, { timeZone: 'UTC', ...(o || {}) }); }
      toLocaleDateString(l, o) { return super.toLocaleDateString(l || LOC, { timeZone: 'UTC', ...(o || {}) }); }
      toLocaleTimeString(l, o) { return super.toLocaleTimeString(l || LOC, { timeZone: 'UTC', ...(o || {}) }); }
      getTimezoneOffset() { return 0; }
    }
    globalThis.Date = FixedDate;
    const nl = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function (l, o) { return nl.call(this, l || LOC, o); };
    let seed = 1;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    if (!globalThis.crypto) globalThis.crypto = {};
    globalThis.crypto.getRandomValues = (a) => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; };
    globalThis.crypto.randomUUID = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
  })()`, ctx);
  for (const file of scriptOrder()) {
    const code = fs.readFileSync(path.join(EXT, file), 'utf8');
    vm.runInContext(code, ctx, { filename: path.join(EXT, file) });
  }
  // Script-level const/let (state, SECTIONS…) aren't properties of the global object: reach them by evaluating.
  const get = (expr) => vm.runInContext(expr, ctx);
  const ready = vm.runInContext('loadStore()', ctx);
  return { ctx, get, storage: store, ready, errors };
}

module.exports = { loadSheet, scriptOrder, fakeElement };
