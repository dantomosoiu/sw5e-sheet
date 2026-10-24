/* SW5E Character Sheet Viewer
 *
 * Data model per character ("snapshot"):
 *   raw       – the SW5E builder character as last loaded or saved (what SW5E exports/imports); with the edits
 *               below it is the character (this copy is the truth; sw5e.com is the check and an optional sync)
 *   complete  – the computed sheet: sw5e.com's own calculation when loaded from there (generateCompleteCharacter),
 *               else the sheet's engine's (engine.js, which follows SW5E's)
 *   refs      – reference entries the sheet needs (maneuvers, feats, class tables…)
 *   validation, error, source, loadedAt
 *
 * Local changes, kept per character (Sync to SW5E sends what its format holds):
 *   trackers  – play state (currentStats), see "play-state tracker"
 *   edits     – field edits (notes, characteristics, credits, XP, inventory), see "field edits";
 *               shown over `raw`/`complete`, and recomputed in the background when they
 *               change derived numbers (inventory: AC, attacks, weight…)
 *   itemState – per character, local only: charges used on items and active effects
 *               (consumables used on the character, or effects received from others).
 *               Effects become temporary tweaks in the copy the sheet is computed from;
 *               they are never saved to sw5e.com.
 *   derived   – cache: the sheet as the rules engine computes it with the edits and active effects.
 * SW5E's rules data and item list come with the sheet (data/sw5e/, see sw5e-data.js and ensureSw5eData).
 * Storage and sw5e.com are reached through `platform` (platform.js: the web page's, or the extension's).
 */

'use strict';

const ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const ABBR = { Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON', Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA' };
const STORE_KEY = 'snapshots';
const LAST_KEY = 'lastCharacter';
const TRACKER_KEY = 'trackers';
const HISTORY_KEY = 'history';
const HISTORY_LIMIT = 25; // versions kept per character
const BACKUP_KEY = 'lastBackupExport';
const BACKUP_INFO_KEY = 'backupInfo'; // { count: characters in the last full backup, characters: { key: when backed up alone } }
const EDITS_KEY = 'edits';
const CATALOG_KEY = 'catalog'; // { dataVersion, fetchedAt, items }: SW5E equipment + enhanced items
const CATALOG_INFO_KEY = 'catalogInfo'; // { dataVersion, fetchedAt, count }: small, read at startup
const RULES_KEY = 'rules'; // { dataVersion, fetchedAt, modules: { classes, archetypes, features, maneuvers, … } }
const RULES_INFO_KEY = 'rulesInfo'; // { dataVersion, fetchedAt }: small, read at startup
const ITEMSTATE_KEY = 'itemState'; // key -> { charges: { itemName: used }, effects: [effect], updatedAt }
const DERIVED_KEY = 'derived'; // key -> { basis, complete, refs, validation, error }
// key -> { data: a data: URL (resized, see uploadPortrait), w, h, name, at }: a picture uploaded from this device. Kept
// only here (and in backups): sw5e.com's "image" is a link, and Sync leaves it alone.
const PORTRAITS_KEY = 'portraits';
// Every write carries this page's id so the storage listener can skip our own writes
// (platform.storage.onChanged also fires in the tab that wrote) and only react to other tabs.
const WRITER_KEY = 'lastWriter';
const PAGE_ID = Math.random().toString(36).slice(2);
let writeSeq = 0;
const writerStamp = () => ({ page: PAGE_ID, seq: ++writeSeq });

const state = {
  snapshots: {}, // key -> snapshot
  trackers: {}, // key -> { stats, updatedAt }: play state tracked locally (see "play-state tracker")
  undo: null, // { key, stats, label }: one-step undo for the last rest/damage/heal
  history: {}, // key -> [{ at, reason, changedAt, raw }], oldest first (see recordHistory)
  edits: {}, // key -> { fields: { path: value }, updatedAt }: field edits not yet on sw5e.com
  editing: null, // { key, section, draft: { path: text } }: the open editor
  confirmDiscard: null, // key whose "Discard" was clicked once
  confirmRemove: null, // "list|index" of the item whose "Remove" was clicked once
  recomputing: null, // key being recomputed with its edits
  catalog: null, // SW5E's item list (see ensureSw5eData)
  catalogInfo: null, // { dataVersion, fetchedAt, count } of a newer item list kept in this browser
  catalogError: null,
  rules: null, // SW5E's rules data (see ensureSw5eData)
  rulesInfo: null, // { dataVersion, fetchedAt } of newer rules data kept in this browser
  sw5eReported: null, // the data version sw5e.com last reported
  rulesError: null,
  addDraft: null, // the "Add an item" form (see renderAddItem)
  itemState: {}, // see ITEMSTATE_KEY
  portraits: {}, // see PORTRAITS_KEY
  derived: {}, // see DERIVED_KEY
  useMenu: null, // "list|index" of the item whose Use menu (on me / on someone else) is open
  effDraft: null, // the "Add an effect" search
  tweakDraft: null, // the "Add a tweak" form
  saving: null, // key of the character being saved to sw5e.com
  lastBackup: null, // when "Export all (backup)" was last used
  current: null, // key
  observer: null,
  filter: '', // the sidebar filter's text (kept across re-renders)
  searching: false, // narrow screens: the filter box is open in the pinned strip
  confirmRemoveChar: null, // key whose "Remove from this viewer" was clicked once
};

// ---------------------------------------------------------------- utilities
const $ = (sel, root = document) => root.querySelector(sel);
const esc = escHtml;
const signed = (n) => {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  return v >= 0 ? `+${v}` : `−${Math.abs(v)}`;
};
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtNum = (n) => (Math.round(n * 100) / 100).toLocaleString();
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const nonEmpty = (v) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '—';
const titleCase = (s) => String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/**
 * The message line in the top bar; on narrow screens a toast that goes away by itself (errors stay longer).
 * `quiet`: background news (a recalculation's progress): dropped while something the player did was said less than
 * 15 s ago, so it never replaces "Synced", "Healed 6" and the like.
 */
function setStatus(msg, kind, quiet, button) {
  if (quiet && Date.now() - num(setStatus.at) < 15000) return;
  // What actions said, for "Recent messages" (a phone's notice goes away by itself).
  if (msg && !quiet) {
    state.statusLog = [{ msg, kind: kind || '', at: Date.now() }].concat(arr(state.statusLog).filter((x) => x.msg !== msg)).slice(0, 15);
  }
  const el = $('#status');
  el.textContent = msg || '';
  for (const b of arr(button)) if (b) el.insertAdjacentHTML('beforeend', ` <button class="linklike" data-act="${esc(b.act)}" data-arg="${esc(b.arg || '')}">${esc(b.label)}</button>`);
  el.className = 'status' + (kind ? ' ' + kind : '') + (msg ? ' fresh' : '');
  el.title = msg || '';
  // Phones: the toast goes just under the pinned strip, wherever it is now (at the top of the page the top bar is
  // above it), so it never covers HP, the filter or the dice button.
  if (msg && window.matchMedia('(max-width: 900px)').matches) {
    const bar = document.querySelector('.side-nav');
    el.style.top = bar ? `${Math.max(8, Math.round(bar.getBoundingClientRect().bottom) + 8)}px` : '';
  }
  clearTimeout(setStatus.timer);
  if (!quiet) setStatus.at = msg ? Date.now() : 0;
  // A notice with a button (Undo, Roll…) stays longer, to be read and used; a long one too (up to 20 s).
  const base = kind === 'error' ? 12000 : arr(button).filter(Boolean).length ? 10000 : 6000;
  if (msg) setStatus.timer = setTimeout(() => el.classList.remove('fresh'), Math.min(20000, base + Math.max(0, String(msg).length - 120) * 50));
}
/** "Recent messages": what the last actions said, newest first. */
function showMessages() {
  let pop = document.getElementById('msgLog');
  if (pop) { pop.remove(); return; }
  pop = document.createElement('div');
  pop.id = 'msgLog';
  pop.className = 'msg-log';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Recent messages');
  const list = arr(state.statusLog);
  pop.innerHTML = `<div class="msg-head"><b>Recent messages</b><button class="btn sm" data-act="messages" aria-label="Close">✕</button></div>
    ${list.length ? `<ul>${list.map((x) => `<li class="${esc(x.kind)}"><span class="faint">${esc(new Date(x.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}</span> ${esc(x.msg)}</li>`).join('')}</ul>` : '<p class="faint">Nothing yet.</p>'}`;
  const bar = document.querySelector('.side-nav');
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  pop.style.top = `${narrow && bar ? Math.max(8, Math.round(bar.getBoundingClientRect().bottom) + 8) : 56}px`;
  document.body.appendChild(pop);
}

/** "First session": the few things a new player does at the table, in the order they come up (W-157). */
const GUIDE_STEPS = [
  ['Get your character', 'Load from SW5E brings in your sw5e.com characters; New character… (More ▾) builds one here. Or try the steps below on the demo character (More ▾ → Demo character).'],
  ['Roll', 'Click any number: a skill, a save, Initiative. The dice open at the bottom: press Roll (or Enter). Shift-click rolls at once. The round dice button (bottom right) opens them for plain dice.'],
  ['Attack', 'Weapons & Attacks: click the to-hit number, roll, then Hit: roll damage (or Critical damage).'],
  ['Take damage or heal', 'Combat & Vitals: type the amount, then Damage, Heal or Temp HP. At 0 HP the death saves appear there.'],
  ['Use a feature', "Class Features: Start (Rage, a stance, a form) or Use; it's listed under Effects until you End it. Uses come back on rests."],
  ['Cast a power', "Force or Tech Casting: Cast on the power's card spends the points; its damage or healing rolls from the card."],
  ['Use an item', 'Equipment & Inventory: Use on a medpac, stim or grenade, on you or on someone else.'],
  ['Rest', 'Combat & Vitals: Short rest (spend Hit Dice there to heal) or Long rest.'],
];
function showGuide() {
  let pop = document.getElementById('msgLog');
  const was = pop && pop.dataset.kind;
  if (pop) pop.remove();
  if (was === 'guide') return;
  pop = document.createElement('div');
  pop.id = 'msgLog';
  pop.dataset.kind = 'guide';
  pop.className = 'msg-log guide';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Your first session');
  pop.innerHTML = `<div class="msg-head"><b>Your first session</b><button class="btn sm" data-act="guide" aria-label="Close">✕</button></div>
    <ol>${GUIDE_STEPS.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join('')}</ol>
    <p class="faint">Everything you change is kept in this browser. Sync to SW5E sends it to sw5e.com; More ▾ → Back up this character saves a file. Hover a dotted number to see where it comes from.</p>`;
  const bar = document.querySelector('.side-nav');
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  pop.style.top = `${narrow && bar ? Math.max(8, Math.round(bar.getBoundingClientRect().bottom) + 8) : 56}px`;
  document.body.appendChild(pop);
}

function keyFor(raw, source) {
  if (raw && raw.id) return 'id:' + raw.id;
  if (raw && raw.localId) return 'local:' + raw.localId;
  return (source || 'file') + ':' + String((raw && raw.name) || 'Unnamed').toLowerCase().replace(/\s+/g, '-');
}

// ------------------------------------------------------------- persistence
async function loadStore() {
  const data = await platform.storage.get([STORE_KEY, LAST_KEY, TRACKER_KEY, HISTORY_KEY, BACKUP_KEY, BACKUP_INFO_KEY, EDITS_KEY, CATALOG_INFO_KEY, RULES_INFO_KEY, ITEMSTATE_KEY, DERIVED_KEY, PORTRAITS_KEY]);
  state.itemState = data[ITEMSTATE_KEY] || {};
  state.portraits = data[PORTRAITS_KEY] || {};
  state.derived = data[DERIVED_KEY] || {};
  state.catalogInfo = data[CATALOG_INFO_KEY] || null;
  state.rulesInfo = data[RULES_INFO_KEY] || null;
  state.snapshots = data[STORE_KEY] || {};
  addDemo(state); // the demo character (demo.js): always there, never stored as a snapshot
  state.trackers = data[TRACKER_KEY] || {};
  state.edits = data[EDITS_KEY] || {};
  state.history = data[HISTORY_KEY] || {};
  state.lastBackup = data[BACKUP_KEY] || null;
  const bi = data[BACKUP_INFO_KEY] || {};
  state.lastBackupCount = bi.count || null;
  state.charBackups = bi.characters || {};
  return data[LAST_KEY] || null;
}
async function saveStore() {
  await platform.storage.set({
    [STORE_KEY]: withoutDemo(state.snapshots), [LAST_KEY]: state.current, [HISTORY_KEY]: state.history, [WRITER_KEY]: writerStamp(),
  });
}
const withoutDemo = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !isDemoKey(k)));
async function saveTrackers() {
  await platform.storage.set({ [TRACKER_KEY]: state.trackers, [WRITER_KEY]: writerStamp() });
}
async function saveEdits() {
  await platform.storage.set({ [EDITS_KEY]: state.edits, [WRITER_KEY]: writerStamp() });
}
async function saveItemState() {
  await platform.storage.set({ [ITEMSTATE_KEY]: state.itemState, [WRITER_KEY]: writerStamp() });
}
async function saveDerived() {
  await platform.storage.set({ [DERIVED_KEY]: state.derived, [WRITER_KEY]: writerStamp() });
}
async function savePortraits() {
  await platform.storage.set({ [PORTRAITS_KEY]: state.portraits, [WRITER_KEY]: writerStamp() });
}

// Version history. sw5e.com is not a backup (its storage can lose characters), so every
// distinct raw character we see is kept here, newest last, capped per character. Removing a
// character from the viewer keeps its history (it's still exported).
// JSON with sorted keys, so the same character serialized in a different key order matches.
const canonical = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));

function recordHistory(key, raw, reason) {
  const list = state.history[key] || (state.history[key] = []);
  const last = list[list.length - 1];
  if (last && canonical(last.raw) === canonical(raw)) return false;
  list.push({ at: Date.now(), reason, changedAt: raw.changedAt || null, raw: clone(raw) });
  if (list.length > HISTORY_LIMIT) list.splice(0, list.length - HISTORY_LIMIT);
  return true;
}

function addSnapshots(results, source, meta, reason) {
  const keys = [];
  if (meta && !meta.engine) noteSw5eDataVersion(meta.dataVersion);
  for (const r of results) {
    if (!r || !r.raw) continue;
    const key = keyFor(r.raw, source);
    state.snapshots[key] = {
      format: 'sw5e-sheet-snapshot', version: 1,
      key, raw: r.raw, complete: r.complete || null, refs: r.refs || null,
      validation: r.validation || null, error: r.error || null,
      source, loadedAt: Date.now(), meta: meta || null,
    };
    // Loaded with SW5E's own calculation: how the sheet's engine compares (Settings, Tweaks & Data → Rules engine).
    if (r.complete && !(meta && meta.engine)) {
      const check = engineCheckOf(r.raw, r.complete, engineCtx());
      if (check) state.snapshots[key].engineCheck = check;
    }
    recordHistory(key, r.raw, reason || (source === 'sw5e' ? 'Loaded from SW5E' : 'Imported from file'));
    keys.push(key);
    // Rolls that came with it (synced from another computer) join the log.
    if (arr(r.raw.rollLog).length) mergeCharacterRolls(key, r.raw.rollLog);
  }
  return keys;
}

/**
 * Everything the viewer stores, as one file: characters, their history, play state and recent rolls. With `onlyKey`,
 * the same for one character ("Back up this character"); importing either file restores it.
 */
async function exportBackup(onlyKey) {
  const stamp = new Date();
  const data = backupData(onlyKey, stamp.getTime());
  const snaps = data.snapshots;
  const name = onlyKey && state.snapshots[onlyKey] ? state.snapshots[onlyKey].raw.name : '';
  download(onlyKey ? `${fileSafe(name || 'character')} backup ${localStamp(stamp)}.json` : `sw5e-sheet-backup-${localStamp(stamp)}.json`, data);
  if (onlyKey) state.charBackups = { ...(state.charBackups || {}), [onlyKey]: stamp.getTime() };
  else {
    state.lastBackup = stamp.getTime();
    state.lastBackupCount = Object.keys(snaps).length;
  }
  await platform.storage.set({ [BACKUP_KEY]: state.lastBackup, [BACKUP_INFO_KEY]: { count: state.lastBackupCount || null, characters: state.charBackups || {} }, [WRITER_KEY]: writerStamp() });
  if (state.current) renderAll({ keepTyping: true });
  setStatus(onlyKey ? `Backed up ${name || 'this character'}: its data, changes, play state, reasons, effects, history and recent rolls. Import the file to restore it.`
    : `Exported a backup of ${plural(Object.keys(snaps).length, 'character')}.`);
}

/** The backup file's contents: every character, or only `onlyKey` (also what an account's server keeps, account.js). */
function backupData(onlyKey, at = Date.now()) {
  // "Back up all" leaves the demo out (demo.js); "Back up this character" on the demo keeps it.
  const pick = (o) => (onlyKey ? (o && o[onlyKey] != null ? { [onlyKey]: o[onlyKey] } : {}) : withoutDemo(o || {}));
  return {
    format: 'sw5e-sheet-backup', version: 1, exportedAt: at,
    snapshots: pick(state.snapshots), trackers: pick(state.trackers), edits: pick(state.edits), itemState: pick(state.itemState),
    history: pick(state.history), portraits: pick(state.portraits || {}),
    rolls: rollState.log.filter((x) => (onlyKey ? x.key === onlyKey : !isDemoKey(x.key))),
  };
}

/**
 * Merge backups in (from files or an account's server) and keep the result; newer data on either side wins, part by
 * part (mergeBackup). Returns the character keys they held.
 */
async function restoreBackups(list) {
  let keys = [];
  for (const b of list) keys = keys.concat(mergeBackup(b));
  if (!list.length) return keys;
  await saveTrackers(); await saveEdits(); await saveItemState(); await savePortraits();
  await saveStore();
  return keys;
}

/** Remember a character's edits and effects before a change, for the Undo in that change's message. */
function rememberForUndo(key, label, removes = false) {
  state.editUndo = { key, label, edits: clone(state.edits[key] || null), effects: clone(arr(state.itemState[key] && state.itemState[key].effects)) };
  // A row goes away and the next one moves up under the pointer: a quick second click is caught by the click guard.
  if (removes) state.removedAt = Date.now();
  return { act: 'edit-undo', label: 'Undo' };
}
async function undoEdit() {
  const u = state.editUndo;
  if (!u || u.key !== state.current) return;
  state.editUndo = null;
  if (u.edits) state.edits[u.key] = u.edits; else delete state.edits[u.key];
  const st = itemStateOf(u.key);
  st.effects = u.effects;
  await saveEdits();
  await saveItemStateFor(u.key, st);
  renderAll();
  scheduleRecompute(u.key);
  setStatus(`Undone: ${u.label}.`);
}

/** Merge a backup file in without losing newer local data. Returns the snapshot keys it touched. */
function mergeBackup(b) {
  const keys = [];
  for (const [key, snap] of Object.entries(b.snapshots || {})) {
    const mine = state.snapshots[key];
    if (!isDemoKey(key) && (!mine || num(snap.loadedAt) > num(mine.loadedAt))) state.snapshots[key] = { ...snap, key };
    keys.push(key);
  }
  for (const [key, t] of Object.entries(b.trackers || {})) {
    const mine = state.trackers[key];
    if (!mine || num(t.updatedAt) > num(mine.updatedAt)) state.trackers[key] = t;
  }
  for (const [key, ed] of Object.entries(b.edits || {})) {
    const mine = state.edits[key];
    if (!mine || num(ed.updatedAt) > num(mine.updatedAt)) state.edits[key] = ed;
  }
  for (const [key, st] of Object.entries(b.itemState || {})) {
    const mine = state.itemState[key];
    if (!mine || num(st.updatedAt) > num(mine.updatedAt)) state.itemState[key] = st;
  }
  for (const [key, pic] of Object.entries(b.portraits || {})) {
    const mine = state.portraits[key];
    if (pic && /^data:image\//.test(pic.data || '') && (!mine || num(pic.at) > num(mine.at))) state.portraits[key] = pic;
  }
  if (arr(b.rolls).length) { rollState.log = mergeRolls(b.rolls); saveRollLog(); }
  for (const [key, list] of Object.entries(b.history || {})) {
    const seen = new Set((state.history[key] || []).map((h) => h.at + '|' + canonical(h.raw)));
    const merged = (state.history[key] || []).concat(arr(list).filter((h) => !seen.has(h.at + '|' + canonical(h.raw))));
    merged.sort((x, y) => x.at - y.at);
    state.history[key] = merged.slice(-HISTORY_LIMIT);
  }
  return keys;
}

// ------------------------------------------------------------- actions
/** Load from SW5E: through the extension, or `result` handed over by the sheet's bookmark on sw5e.com. */
async function loadFromSw5e({ preferredTabId, selectId, result } = {}) {
  const btn = $('#btnLoad');
  btn.disabled = true;
  if (!result) setStatus('Connecting to sw5e.com…');
  try {
    const res = result || await fetchAllFromSw5e({ preferredTabId, onStatus: (m) => setStatus(m) });
    const before = Object.fromEntries(Object.entries(state.snapshots).map(([k, s]) => [k, s.raw]));
    const keys = addSnapshots(res.characters, 'sw5e', res.meta);
    if (!keys.length) {
      setStatus(res.meta && res.meta.loggedIn === false
        ? 'No characters found — sign in on sw5e.com, or import a file.'
        : 'No characters found on sw5e.com.', 'error');
      return;
    }
    // What changed on sw5e.com joins what was changed here (a level-up there keeps the picks made here).
    const clashes = {};
    const olderThere = {};
    for (const k of keys) {
      const theirs = state.snapshots[k].raw;
      if (before[k] && num(theirs.changedAt) && num(theirs.changedAt) < num(before[k].changedAt)) {
        const kept = keepOursOverOlder(k, before[k], theirs);
        if (kept.length) olderThere[k] = kept;
        continue;
      }
      const both = rebaseEdits(k, before[k], theirs);
      if (both.length) clashes[k] = both;
    }
    const byId = (id) => id && keys.find((k) => state.snapshots[k].raw.id === id || state.snapshots[k].raw.localId === id);
    const fresh = keys.filter((k) => !before[k]).sort((a, b) => String(state.snapshots[b].raw.changedAt || '').localeCompare(String(state.snapshots[a].raw.changedAt || '')));
    const openThere = byId(((res.meta && res.meta.sourceUrl) || '').match(/\/mycharacters\/([^/?#]+)/)?.[1]);
    let pick = keys[0];
    let why = '';
    if (selectId && byId(selectId)) pick = byId(selectId);
    else if (openThere && openThere !== state.current) { pick = openThere; why = ' (open on sw5e.com)'; }
    else if (fresh.length) { pick = fresh[0]; why = fresh.length > 1 ? ` (newest of ${fresh.length} new)` : ' (new)'; }
    else if (state.current && keys.includes(state.current)) pick = state.current;
    state.current = pick;
    await saveStore();
    await saveEdits();
    await saveTrackers();
    renderAll();
    scheduleRecompute(pick);
    const shown = why ? ` Showing ${state.snapshots[pick].raw.name || 'Unnamed'}${why}.` : '';
    const older = Object.keys(olderThere);
    const olderNote = older.length ? ` sw5e.com has older copies of ${older.map((k) => state.snapshots[k].raw.name || 'Unnamed').join(', ')} (saves that didn't reach it): yours are kept; Sync to SW5E updates them there.` : '';
    // A level-up made on sw5e.com: say what it brings.
    const was = before[pick] ? Object.fromEntries(arr(before[pick].classes).map((k) => [k.name, num(k.levels)])) : null;
    const ups = was ? arr(state.snapshots[pick].raw.classes).filter((k) => num(k.levels) > num(was[k.name])).map((k) => {
      const g = bdLevelGains(k.name, num(k.levels), k.archetype && k.archetype.name);
      return `${k.name} ${k.levels}${g.features.length ? ` (new: ${g.features.join(', ')})` : ''}`;
    }) : [];
    const levelled = ups.length ? ` New on sw5e.com: ${ups.join('; ')}.` : '';
    const clash = clashes[pick] ? ` Changed both here and on sw5e.com: ${clashes[pick].map(fieldLabel).join(', ')}; your version is kept.` : '';
    setStatus(`Loaded ${plural(keys.length, 'character')} from sw5e.com · ${new Date().toLocaleTimeString()}.${shown}${levelled}${clash}${olderNote}`, older.length ? 'error' : '');
  } catch (e) {
    console.error(e);
    setStatus('Could not load from sw5e.com: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

/** "Get characters from sw5e.com" in the web version: the bookmark, how to use it, and Paste. */
function showFromSw5e() {
  let pop = document.getElementById('msgLog');
  const was = pop && pop.dataset.kind;
  if (pop) pop.remove();
  if (was === 'from-sw5e') return;
  pop = document.createElement('div');
  pop.id = 'msgLog';
  pop.dataset.kind = 'from-sw5e';
  pop.className = 'msg-log guide';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Get characters from sw5e.com');
  pop.innerHTML = `<div class="msg-head"><b>Get characters from sw5e.com</b><button class="btn sm" data-act="from-sw5e" aria-label="Close">✕</button></div>
    <ol>
      <li><b>Add the bookmark</b> (once). On a computer, drag <a class="btn sm" href="${esc(sw5eBookmarkCode())}" title="Drag to your bookmarks bar">SW5E to Sheet</a> to the bookmarks bar.
        On a phone: <button class="btn sm" data-act="copy-bookmark">Copy the bookmark</button>, bookmark any page, then edit that bookmark: name it <i>SW5E to Sheet</i> and paste over its address.</li>
      <li><b>Open sw5e.com</b>, signed in, and open the bookmark there. Chrome on a phone: type <i>SW5E to Sheet</i> in the address bar and tap the bookmark in the list. Safari: Bookmarks → <i>SW5E to Sheet</i>.</li>
      <li><b>Send to the sheet</b>: the sheet opens with your characters. Or <b>Copy</b> there, come back here and <button class="btn sm" data-act="paste-sw5e">Paste</button>.</li>
    </ol>
    <p class="faint">The bookmark reads your characters on sw5e.com the way the browser extension does, using your own sign-in there, and gives them only to this sheet. On an iPhone, the sheet added to the home screen keeps its own storage: use Copy and Paste there.</p>`;
  const bar = document.querySelector('.side-nav');
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  pop.style.top = `${narrow && bar ? Math.max(8, Math.round(bar.getBoundingClientRect().bottom) + 8) : 56}px`;
  document.body.appendChild(pop);
}

/** Paste: what the bookmark copied on sw5e.com, or any character file's text. */
async function pasteFromSw5e() {
  let text = '';
  try { text = await navigator.clipboard.readText(); } catch (e) { setStatus('Could not read the clipboard: ' + e.message, 'error'); return; }
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* said below */ }
  if (isFromSw5e(data)) {
    const pop = document.getElementById('msgLog');
    if (pop && pop.dataset.kind === 'from-sw5e') pop.remove();
    await loadFromSw5e({ result: data.result });
  } else if (data) {
    await importFiles([new File([text], 'pasted.json', { type: 'application/json' })]);
  } else {
    setStatus("The clipboard has no characters: on sw5e.com, open the sheet's bookmark and press Copy first.", 'error');
  }
}

async function importFiles(files) {
  const raws = [];
  const snaps = [];
  const backups = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await f.text());
      for (const item of arr(data)) {
        if (item && item.format === 'sw5e-sheet-backup') backups.push(item);
        else if (item && item.format === 'sw5e-sheet-snapshot' && item.raw) snaps.push(item);
        else if (item && item.characters && Array.isArray(item.characters)) {
          for (const c of item.characters) (c.raw ? snaps.push({ ...c, format: 'sw5e-sheet-snapshot' }) : raws.push(c));
        } else if (item && (item.classes || item.baseAbilityScores || item.species)) raws.push(item);
        else throw new Error('not a recognised SW5E character file');
      }
    } catch (e) {
      setStatus(`Could not read ${f.name}: ${e.message}`, 'error');
      return;
    }
  }
  let keys = await restoreBackups(backups);
  if (snaps.length) keys = keys.concat(addSnapshots(snaps, 'file'));
  if (raws.length) {
    setStatus(engineCtx() ? 'Computing the imported character…' : 'Computing imported character with the SW5E rules engine…');
    try {
      const res = await computeCharacters(raws, { onStatus: (m) => setStatus(m) });
      keys = keys.concat(addSnapshots(res.characters, 'file', res.meta));
    } catch (e) {
      console.error(e);
      keys = keys.concat(addSnapshots(raws.map((raw) => ({
        raw, error: 'Could not reach sw5e.com to compute this character (' + e.message + '). Showing the raw data only.',
      })), 'file'));
    }
  }
  if (keys.length) {
    state.current = keys[0];
    await saveStore();
    renderAll();
    const err = state.snapshots[keys[0]].error;
    setStatus(err ? 'Imported with warnings' : `Imported ${plural(keys.length, 'character')}`, err ? 'error' : '');
  }
}

async function recomputeCurrent() {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  // The sheet computes the numbers itself: this asks sw5e.com for its own calculation of the same character, to check.
  const ctx = engineCtx();
  if (ctx) {
    setStatus("Asking sw5e.com for its calculation, to check the sheet's…");
    try {
      const raw = withEdits(snap.raw, editedFields(snap.key));
      const r = (await computeWithSw5e([raw], { onStatus: (m) => setStatus(m) })).characters[0];
      const check = r && r.complete ? engineCheckOf(raw, r.complete, ctx) : null;
      if (!check) throw new Error((r && r.error) || 'no result');
      snap.engineCheck = check;
      await saveStore();
      renderAll();
      setStatus(check.differences.length
        ? `sw5e.com computes ${plural(check.differences.length + check.more, 'number')} differently: see Settings, Tweaks & Data → Rules engine.`
        : `Checked with sw5e.com: all ${check.compared} numbers the same.`, check.differences.length ? 'error' : '');
    } catch (e) {
      setStatus('Could not check with sw5e.com: ' + e.message, 'error');
    }
    return;
  }
  setStatus('Recomputing with the SW5E rules engine…');
  try {
    const res = await computeWithSw5e([snap.raw], { onStatus: (m) => setStatus(m) });
    const r = res.characters[0];
    Object.assign(snap, { complete: r.complete, refs: r.refs, validation: r.validation, error: r.error, loadedAt: Date.now() });
    await saveStore();
    renderAll();
    setStatus('Recomputed · ' + new Date().toLocaleTimeString());
  } catch (e) {
    setStatus('Could not recompute: ' + e.message, 'error');
  }
}

function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
/** Local "YYYY-MM-DD HHMM" for file names. */
const localStamp = (t) => {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}`;
};
const fileSafe = (s) => String(s || 'character').replace(/[^\w\- ()']+/g, '').trim().replace(/\s+/g, '_') || 'character';

// ------------------------------------------------------------- render: shell
function renderPicker() {
  const sel = $('#charSelect');
  const entries = Object.values(state.snapshots).sort((a, b) => isDemoKey(a.key) - isDemoKey(b.key) || String(a.raw.name).localeCompare(String(b.raw.name)));
  sel.innerHTML = entries.length
    ? entries.map((s) => {
      const c = s.complete;
      const sub = c ? `${c.species || ''} ${c.classText || ''}`.trim() : 'raw';
      const src = isDemoKey(s.key) ? ' · demo' : s.source === 'file' ? ' · file' : '';
      return `<option value="${esc(s.key)}"${s.key === state.current ? ' selected' : ''}>${esc(s.raw.name || 'Unnamed')} — ${esc(sub)}${src}</option>`;
    }).join('')
    : '<option value="">No characters yet</option>';
  sel.disabled = !entries.length;
}

/**
 * Draw the whole sheet. opts.keepTyping: the redraw isn't the user's own doing (a recalculation finished,
 * another tab saved, data loaded): keep what's being typed in the focused box.
 */
function renderAll(opts = {}) {
  // A redraw can move another button under the pointer: see the click guard.
  const probe = probePointer();
  try { renderAllInner(opts); } finally { noteShift(probe); }
}
// The pointer's last position, and the control under it before and after a redraw.
let pointerAt = null;
/** What a control is: a click on it means the same thing when it's the same signature. */
function controlSig(el) {
  const c = el && el.closest && el.closest('[data-inv], [data-track], [data-act], [data-rl], [data-roll], .cls-x, button, select, input, summary, a');
  return c ? [c.tagName, c.dataset.inv, c.dataset.track, c.dataset.act, c.dataset.roll, c.dataset.arg, (c.textContent || '').trim().slice(0, 30)].join('|') : '';
}
function probePointer() {
  if (!pointerAt || Date.now() - pointerAt.at > 5000) return null;
  const el = document.elementFromPoint(pointerAt.x, pointerAt.y);
  return { x: pointerAt.x, y: pointerAt.y, sig: controlSig(el) };
}
/** After a redraw: a different control under the pointer is remembered for a moment (the click guard). */
function noteShift(before) {
  if (!before || !before.sig) return;
  const after = probePointer();
  if (after && after.sig !== before.sig) state.shift = { at: Date.now(), x: before.x, y: before.y, sig: before.sig };
}
function renderAllInner(opts) {
  applyStyle();
  renderPicker();
  const snap = state.snapshots[state.current];
  const sheet = $('#sheet');
  const side = $('#sidebar');
  if (state.create) {
    // The new-character wizard replaces the sheet; keep the focused field focused.
    const ae = document.activeElement;
    const sel = ae && ae.dataset && ae.dataset.cr ? `[data-cr="${ae.dataset.cr}"]${['key', 'a', 'id', 'i', 'j'].filter((k) => ae.dataset[k] != null).map((k) => `[data-${k}="${CSS.escape(ae.dataset[k])}"]`).join('')}` : null;
    side.innerHTML = '';
    delete sheet.dataset.key;
    sheet.innerHTML = bdCreatePage();
    document.title = 'New character · SW5E Sheet';
    const again = sel && sheet.querySelector(sel);
    if (again) again.focus({ preventScroll: true });
    return;
  }
  if (!snap) {
    side.innerHTML = '';
    delete sheet.dataset.key;
    sheet.innerHTML = `
      <div class="welcome">
        <h1>SW5E Character Sheet</h1>
        <p class="muted">See everything about your character on one scrollable page.</p>
        <p><button class="btn primary needs-sw5e" data-act="load">Load my characters from sw5e.com</button>
           <button class="btn primary no-sw5e" data-act="from-sw5e">Get my characters from sw5e.com</button>
           <button class="btn" data-act="cr-new">Create a new character</button>
           <button class="btn" data-act="import">Import a character file…</button></p>
        <p><button class="btn" data-act="demo">Try the demo character</button>
           <span class="faint">Ready-made, to try everything with; it stays in this browser.</span></p>
        <p class="welcome-look"><button class="btn theme-btn" data-act="theme" title="Switch light / dark"><span class="when-dark">${uiIcon('sun')}Light</span><span class="when-light">${uiIcon('moon')}Dark</span></button>
           <button class="btn" data-act="themes" title="Theme: light or dark, a style and screen effects">${uiIcon('palette')}Style</button></p>
        <p class="faint"><span class="needs-sw5e">Loading uses your existing sw5e.com session (an open sw5e.com tab is used if there is one; otherwise one is opened briefly in the background).</span>
        Imports accept the JSON from SW5E's character export, a backup from this sheet, or a snapshot exported from it.</p>
      </div>`;
    document.title = 'SW5E Character Sheet';
    applyScreenFx(null);
    return;
  }
  const model = buildModel(snap);
  applyScreenFx(model);
  document.title = `${snap.raw.name || 'Character'} · SW5E Sheet`;
  // Re-rendering replaces the form controls: keep the focused one focused (and, see opts.keepTyping, what's
  // typed in it), the damage/heal amount (only read when a button is pressed), and the page where it was:
  // the control just used (or what's at the top of the window) stays at the same height on screen.
  const ae = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  const sameChar = sheet.dataset.key === snap.key;
  const focusLoc = ae && sameChar ? locate(ae) : null;
  const anchor = sameChar ? anchorFor(recentControl() || ae) : null;
  const caret = ae && typeof ae.selectionStart === 'number' ? [ae.selectionStart, ae.selectionEnd] : null;
  const typed = opts.keepTyping && ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && !/checkbox|radio|button|submit/.test(ae.type) ? ae.value : null;
  const amount = $('#trackAmount') ? $('#trackAmount').value : '';
  const sections = SECTIONS.map((s) => {
    if (!s.when(model)) return { ...s, html: null };
    if (!isEditing(model, s.id)) return { ...s, html: s.render(model) };
    return { ...s, html: renderEditor(model, s.id) + (s.replace ? '' : s.render(model)) };
  }).filter((s) => s.html !== null);

  // Re-rendering replaces the cards: keep the ones opened or closed (and open <details>) as they were.
  const ui = sameChar ? captureUi(sheet) : null;
  const banners = [live('pending', model, 'div', 'pending-wrap')];
  if (snap.error) banners.push(`<div class="banner bad"><b>Heads up:</b> ${esc(snap.error)}</div>`);
  if (snap.validation && snap.validation.isValid === false) {
    banners.push(`<div class="banner">SW5E validation: ${esc(snap.validation.message || 'character is incomplete')}</div>`);
  }
  sheet.innerHTML = sections.map((s, i) => `
    <section class="section" id="sec-${s.id}" data-title="${esc(s.title)}">${i === 0 ? banners.join('') : ''}
      <h2>${esc(s.title)}${s.sub ? `<span class="sub">${esc(s.sub(model) || '')}</span>` : ''}${s.editor && !isEditing(model, s.id)
        ? `<button class="btn sm ed-btn" data-act="edit" data-arg="${s.id}" title="Edit ${esc(EDITORS[s.id](model).map((f) => fieldLabel(f.path)).slice(0, 4).join(', '))}">Edit</button>` : ''}</h2>
      ${s.html}
    </section>`).join('');

  sheet.dataset.key = snap.key;
  if (ui) restoreUi(sheet, ui);
  syncCardAria(sheet);
  side.innerHTML = renderSidebar(model, sections);
  wireImages(sheet);
  setupScrollSpy();
  applyFilter(state.filter);
  if (amount && $('#trackAmount')) $('#trackAmount').value = amount;
  const again = refocus(focusLoc);
  if (again) {
    if (typed != null && 'value' in again && again.value !== typed) again.value = typed;
    if (caret) try { again.setSelectionRange(caret[0], caret[1]); } catch (e) { /* not a text field */ }
  }
  restoreAnchor(anchor);
}

// ------------------------------------------------------------- keeping your place across redraws
// A redraw replaces the sheet's HTML. An element is remembered by how to find it again: its own data-*
// attributes (or id) within its live part or section and which match it was; failing that, the card, list or
// row around it, by its title within that part.
const BLOCKS = '.card, .cls-list, .cls-pick, .cls-convert, .eff, .stat, .ability, .trk-row, tr, .defs-row, .add-item, .tracker';
const blockLabel = (b) => {
  if (b.classList.contains('tracker') || b.classList.contains('add-item')) return b.className;
  const t = b.querySelector(':scope > .card-head .title, :scope > .cls-head b, :scope > summary b, :scope > .eff-head b, :scope > .label, :scope > .trk-label, :scope > td, :scope > b, .abbr');
  return (t || b).textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
};
function scopeOf(el) {
  const live = el.closest('[data-live]');
  if (live) return { sel: `[data-live="${CSS.escape(live.dataset.live)}"]`, el: live };
  const part = el.closest('.section, #sidebar, #dice');
  return part && part.id ? { sel: '#' + CSS.escape(part.id), el: part } : null;
}
/** How to find `el` again after a redraw, or null. */
function locate(el) {
  if (!el || !el.closest || el === document.body) return null;
  if (el.id) return { id: el.id };
  const scope = scopeOf(el);
  if (!scope) return null;
  const out = { scope: scope.sel, scopeIndex: [...document.querySelectorAll(scope.sel)].indexOf(scope.el) };
  const attrs = [...el.attributes].filter((a) => a.name.startsWith('data-') && a.name !== 'data-live');
  if (attrs.length) {
    out.sel = el.tagName.toLowerCase() + attrs.map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
    out.index = [...scope.el.querySelectorAll(out.sel)].indexOf(el);
  }
  const b = el.closest(BLOCKS);
  if (b && scope.el.contains(b)) {
    out.block = blockLabel(b);
    out.blockIndex = [...scope.el.querySelectorAll(BLOCKS)].filter((x) => blockLabel(x) === out.block).indexOf(b);
  }
  return out;
}
/** What `loc` points to now: { el, exact } (exact: the element itself; otherwise its card/row), or null. */
function relocate(loc) {
  if (!loc) return null;
  if (loc.id) { const el = document.getElementById(loc.id); return el ? { el, exact: true } : null; }
  const scope = document.querySelectorAll(loc.scope)[loc.scopeIndex];
  if (!scope) return null;
  const el = loc.sel ? scope.querySelectorAll(loc.sel)[loc.index] : null;
  if (el) return { el, exact: true };
  const b = loc.block != null ? [...scope.querySelectorAll(BLOCKS)].filter((x) => blockLabel(x) === loc.block)[loc.blockIndex] : null;
  return b ? { el: b, exact: false } : null;
}
/** Focus what `loc` points to (or the first control in its card, e.g. End after Start). */
function refocus(loc) {
  const r = relocate(loc);
  if (!r) return null;
  const el = r.exact ? r.el : r.el.querySelector('.lead button:not([disabled])') || r.el.querySelector('button:not([disabled]), select, input, textarea, [tabindex="0"]');
  if (el) el.focus({ preventScroll: true });
  return el && r.exact ? el : null;
}
// The control last clicked or tapped (buttons don't keep focus everywhere, e.g. Safari).
let lastControl = null;
const recentControl = () => (lastControl && lastControl.el.isConnected && Date.now() - lastControl.at < 4000 ? lastControl.el : null);
/** The bottom of whatever is pinned to the top of the window (the top bar, or the strip on narrow screens). */
function pinnedBottom() {
  let y = 0;
  const bar = $('.topbar');
  if (bar && getComputedStyle(bar).position === 'sticky') y = Math.max(y, bar.getBoundingClientRect().bottom);
  const side = $('#sidebar');
  if (side && getComputedStyle($('.layout')).display === 'block' && side.getBoundingClientRect().top <= 1) y = Math.max(y, side.getBoundingClientRect().bottom);
  return y;
}
/** What to keep in place across a redraw: `prefer` if it's on screen, else what's at the top of the window. */
function anchorFor(prefer) {
  const top = pinnedBottom();
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.height > 0 && r.bottom > top && r.top < window.innerHeight; };
  let el = prefer && prefer.closest && prefer.closest('#sheet') && onScreen(prefer) ? prefer : null;
  if (!el) {
    const sheet = $('#sheet');
    const sr = sheet && sheet.getBoundingClientRect();
    const hit = sr && document.elementFromPoint(sr.left + Math.min(40, sr.width / 2), top + 12);
    el = hit && hit.closest('#sheet') ? (hit.closest(BLOCKS) || hit.closest('.section')) : null;
  }
  const loc = el && locate(el);
  if (!loc) return null;
  const b = el.closest(BLOCKS);
  return { loc, top: el.getBoundingClientRect().top, blockTop: b ? b.getBoundingClientRect().top : null };
}
function restoreAnchor(a) {
  const r = a && relocate(a.loc);
  if (!r) return;
  const was = r.exact ? a.top : a.blockTop;
  if (was == null) return;
  const d = r.el.getBoundingClientRect().top - was;
  if (Math.abs(d) > 1) window.scrollBy({ top: d, behavior: 'instant' });
}

/** Keys for the cards and <details> in a part of the sheet: section, title, and which of that title. */
function uiKeys(root, sel, label) {
  const seen = {};
  return [...root.querySelectorAll(sel)].map((el) => {
    const sec = el.closest('.section');
    const k = `${sec ? sec.id : ''}|${label(el)}`;
    seen[k] = (seen[k] || 0) + 1;
    return [`${k}|${seen[k]}`, el];
  });
}
const cardLabel = (c) => { const t = c.querySelector(':scope > .card-head .title'); return t ? t.textContent.trim() : ''; };
const detailsLabel = (d) => { const s = d.querySelector(':scope > summary'); return d.dataset.ui || (s ? s.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : ''); };
/** Which cards are collapsed/expanded and which <details> are open under `root`. */
function captureUi(root) {
  return {
    cards: new Map(uiKeys(root, '.card', cardLabel).map(([k, c]) => [k, c.classList.contains('collapsed') ? 'collapsed' : c.classList.contains('expanded') ? 'expanded' : ''])),
    details: new Map(uiKeys(root, 'details', detailsLabel).map(([k, d]) => [k, d.open])),
  };
}
function restoreUi(root, ui) {
  for (const [k, c] of uiKeys(root, '.card', cardLabel)) {
    if (!ui.cards.has(k)) continue;
    c.classList.remove('collapsed', 'expanded');
    if (ui.cards.get(k)) c.classList.add(ui.cards.get(k));
  }
  for (const [k, d] of uiKeys(root, 'details', detailsLabel)) if (ui.details.has(k)) d.open = ui.details.get(k);
}
/** Is a card's text shown (not collapsed, or expanded in compact mode)? */
const cardOpen = (c) => !c.classList.contains('collapsed') && (!document.body.classList.contains('compact') || c.classList.contains('expanded'));
function syncCardAria(root = document) {
  root.querySelectorAll('.card:not(.no-toggle) > .card-head').forEach((h) => h.setAttribute('aria-expanded', String(cardOpen(h.parentElement))));
}
function toggleCard(c) {
  if (!c || c.classList.contains('no-toggle')) return;
  if (document.body.classList.contains('compact')) c.classList.toggle('expanded');
  else c.classList.toggle('collapsed');
  syncCardAria(c);
}

/** Local changes that differ from sw5e.com's copy, with Sync / Revert. */
function renderPending(m) {
  const key = m.snap.key;
  const edited = Object.keys(m.edited).map(fieldLabel);
  const what = (state.trackers[key] ? ['play state'] : []).concat(edited);
  const fail = m.stale && state.recomputing !== key && recomputeFail[key];
  const retry = fail ? ` <button class="btn sm" data-act="recompute-retry" title="${esc(fail.message)}">Try again</button>` : '';
  if (isDemoKey(key)) {
    const changed = what.length || arr(state.itemState[key] && state.itemState[key].effects).length;
    return `<div class="banner pending info"><span><b>The demo character.</b> Change anything: it stays in this browser, and isn't synced to
      sw5e.com or backed up to an account.${what.length ? ` Changed: ${esc(what.join(', '))}.` : ''}</span>
      ${changed ? '<span class="pending-btns"><button class="btn sm" data-act="reset-demo" title="Back to the demo as it comes with the sheet (asks first, in More ▾)">Reset…</button></span>' : ''}</div>`;
  }
  // A character made here (or imported) that isn't on the account: it can be saved there as a new character.
  if (!what.length && !m.raw.id) {
    return `<div class="banner pending info"><span>Kept in this browser (and in backups); not on your sw5e.com account.</span>
      <span class="pending-btns"><button class="btn sm needs-sw5e" data-act="save-sw5e" ${state.saving ? 'disabled' : ''} title="Save it to your sw5e.com account as a new character">${state.saving === key ? 'Saving…' : 'Save to sw5e.com'}</button></span></div>`;
  }
  if (!what.length) {
    return state.recomputing === key || m.stale
      ? `<div class="banner pending info"><span${fail ? ` title="${esc(fail.message)}"` : ''}>${state.recomputing === key ? 'Recalculating with your active effects…'
        : fail ? "Couldn't recalculate with your active effects: numbers may be out of date." : 'Numbers not yet recalculated with your active effects.'}</span>${retry}</div>` : '';
  }
  const saving = state.saving === key;
  const note = state.recomputing === key ? ' <span class="faint">· recalculating…</span>'
    : fail ? ` <span class="faint" title="${esc(fail.message)}">· couldn't recalculate the totals</span>${retry}`
      : m.stale ? ' <span class="faint">· totals not recalculated yet</span>' : '';
  const each = m.raw.id && edited.length > 1 && !saving ? `<details class="pending-each"><summary>One at a time…</summary>${Object.keys(m.edited).map((p) => `<span class="pending-field">${esc(fieldLabel(p))}
    <button class="linklike" data-act="discard-field" data-arg="${esc(p)}" title="Drop this change and take sw5e.com's ${esc(fieldLabel(p))} (can be undone)">use sw5e.com's</button></span>`).join('')}</details>` : '';
  return `<div class="banner pending"><span><b>Saved here; not on sw5e.com yet:</b> ${esc(what.join(', '))}${note}${each}</span>
    <span class="pending-btns">${m.raw.id
      ? `<button class="btn primary sm needs-sw5e" data-act="save-sw5e" ${state.saving ? 'disabled' : ''} title="Update the copy on sw5e.com with this data">${saving ? 'Syncing…' : 'Sync to SW5E'}</button>`
      : `<button class="btn primary sm needs-sw5e" data-act="save-sw5e" ${state.saving ? 'disabled' : ''} title="Not on your sw5e.com account yet (kept here and in backups): save it there as a new character">${saving ? 'Saving…' : 'Save to sw5e.com'}</button>`}
    ${edited.length && !saving && m.raw.id ? `<button class="linklike discard" data-act="discard-edits" title="Drop ${esc(edited.join(', '))} and use sw5e.com's copy instead (asks first)">${state.confirmDiscard === key ? `Really drop ${esc(edited.join(', '))}?` : "Revert to SW5E's copy…"}</button>` : ''}</span></div>`;
}

// ------------------------------------------------------------- model
function buildModel(snap) {
  const edited = editedFields(snap.key);
  const raw = withEdits(snap.raw || {}, edited);
  const engine = engineCtx();
  const fx = applyEffects(snap.key, raw, effectsBasis(snap, raw));
  // The sheet's own engine computes at once, with every edit and effect; without its data, sw5e.com does.
  const derive = !!engine || ENGINE_FIELDS.some((p) => p in edited) || fx.effects.length > 0;
  const fresh = engine ? engineDerived(snap.key, fx, engine) : derive ? freshComputed(snap.key, fx.raw) : null;
  // Until SW5E has recalculated with the latest change, the last recalculation is closer than SW5E's plain copy,
  // which has none of the tweaks and effects (e.g. AC with Unarmored Defense); the banner says it's being updated.
  const last = derive && !fresh && state.derived[snap.key] ? state.derived[snap.key] : null;
  const comp = fresh || last;
  const c = completeWithEdits((comp ? comp.complete : snap.complete) || {}, raw, edited);
  // The sheet without any tweak or effect, to tell (and explain) which numbers they changed.
  const base = comp && comp.base ? completeWithEdits(comp.base, raw, edited) : c;
  const refs = (comp && comp.refs) || snap.refs || {};
  const has = !!(fresh || snap.complete);

  const allFeatures = [
    ...arr(c.combatFeatures).map((f) => ({ ...f, combat: true })),
    ...arr(c.nonCombatFeatures).map((f) => ({ ...f, combat: false })),
  ];
  allFeatures.push(...missingClassFeatures(raw, allFeatures));
  const featRefs = refs.feats || {};
  const isFeat = (f) => f.source === 'Feat' || (!f.source && (featRefs[f.name] || 'attributesIncreased' in f || 'customIndex' in f));
  const speciesFeatures = allFeatures.filter((f) => f.source === 'Species');
  const feats = allFeatures.filter(isFeat);
  const classFeatures = allFeatures.filter((f) => !speciesFeatures.includes(f) && !feats.includes(f));

  const maneuverNames = arr(raw.classes).flatMap((k) => arr(k.maneuvers).concat(arr(k.archetype && k.archetype.maneuvers)));
  // Inventory or effects changed but not yet recomputed by SW5E: derived numbers may be out of date.
  const stale = derive && !fresh;
  const m = { snap, raw, c, base, refs, has, allFeatures, speciesFeatures, feats, classFeatures, maneuverNames, edited, stale, fx };
  m.maneuverNames = maneuverNames.concat(slotManeuvers(m)); // Superiority Style and the like
  m.effects = fx.effects;
  m.bumps = base !== c ? diffStats(base, c) : {};
  m.alts = condAlts(m);
  const fUses = featureUses(m);
  m.textUses = fUses.concat(powerUses(m, fUses));
  m.classDice = classDice(m);
  const casters = classCasting(m);
  const highRules = ['force', 'tech'].flatMap((kind) => highLevelRules(m, kind));
  m.t = has ? buildTracker(snap, c, superiorityInfo(m), m.textUses, state.rules && choiceInfo(m) ? choiceInfo(m).superiority : [], highRules, ownCastingPoints(m, casters), supTweaks(m)) : null;
  return m;
}
/**
 * The superiority tweaks with effects merged ({ maxDice, physicalSaveDC, physicalModifier, … }), as sent to the engine;
 * maxDice without a class augment's die, which the sheet's own reading has already (it boosts the class's table row).
 */
function supTweaks(m) {
  const all = (m.fx && m.fx.raw && m.fx.raw.tweaks && m.fx.raw.tweaks.superiority) || {};
  const aug = arr(m.fx && m.fx.tweaks).filter((t) => t.path === 'superiority.maxDice' && t.mod && t.mod.forClass).reduce((s, t) => s + num(t.bonus), 0);
  return aug && all.maxDice ? { ...all, maxDice: engHasOverride(all.maxDice) ? { ...all.maxDice, override: num(all.maxDice.override) - aug } : { ...all.maxDice, bonus: num(all.maxDice.bonus) - aug } } : all;
}

// ------------------------------------------------------------- small render helpers
/** A card: title line (click or Enter/Space to collapse), `lead` (counters and buttons, always shown), facts and text. */
function card({ title, meta = '', chips = [], facts = [], body = '', lead = '', id = '', toggle = true, extraClass = '' }) {
  const factsHtml = facts.filter((f) => f && nonEmpty(f[1])).map(([k, v]) => `<span>${esc(k)} <b>${esc(v)}</b></span>`).join('');
  const hasBody = !!(body && body.trim());
  const canToggle = toggle && (hasBody || factsHtml);
  return `<div class="card${canToggle ? '' : ' no-toggle'} ${extraClass}"${id ? ` id="${esc(id)}"` : ''}>
    <div class="card-head"${canToggle ? ' role="button" tabindex="0"' : ''}><span class="title">${esc(title)}</span>${meta ? `<span class="meta">${meta}</span>` : ''}
      ${chips.length ? `<span class="chips">${chips.join('')}</span>` : ''}</div>
    ${lead && lead.trim() ? `<div class="lead">${lead}</div>` : ''}
    ${factsHtml ? `<div class="facts collapsible">${factsHtml}</div>` : ''}
    ${hasBody ? `<div class="desc">${body}</div>` : ''}
  </div>`;
}
const chip = (text, kind = '') => `<span class="chip ${kind}">${esc(text)}</span>`;
const stat = (label, value, note = '', cls = '') => `<div class="stat${cls ? ' ' + cls : ''}"><div class="label">${esc(label)}</div><div class="value">${value}</div>${note ? `<div class="note">${note}</div>` : ''}</div>`;
const profPip = (p) => {
  const v = String(p || 'none').toLowerCase();
  const cls = v.startsWith('exp') ? 'expertise' : v.startsWith('prof') ? 'proficient' : v.startsWith('half') ? 'half' : '';
  const label = cls ? titleCase(v) : 'Not proficient';
  return `<span class="pip ${cls}" title="${esc(label)}"></span>`;
};
const empty = (text) => `<p class="empty">${esc(text)}</p>`;

function damageText(w) {
  const n = num(w.damageNumberOfDice), die = num(w.damageDieType), bonus = num(w.damageBonus) + num(w.damageDieModifier);
  let s;
  if (die > 0 && n > 0) s = `${n}d${die}` + (bonus ? (bonus > 0 ? `+${bonus}` : `−${Math.abs(bonus)}`) : '');
  else s = String(Math.max(0, n && !die ? bonus : bonus));
  return `${s} ${w.damageType && w.damageType !== 'Unknown' ? w.damageType : ''}`.trim();
}
const propsText = (p) => arr(p).filter((x) => x && x !== '—').join(', ');
/** SW5E's rule text for a weapon or armor property ("versatile (2d4)" → Versatile), or null. */
function propertyRule(prop, kind) {
  const mods = (state.rules && state.rules.modules) || {};
  const lists = kind === 'armor' ? [mods.armorProperties, mods.weaponProperties] : [mods.weaponProperties, mods.armorProperties];
  const s = String(prop).toLowerCase().trim();
  for (const list of lists) {
    const hit = arr(list).filter((x) => x && x.name && s.startsWith(String(x.name).toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
    if (hit) return { name: hit.name, text: String(hit.content || hit.description || '').replace(/^#{2,}\s*[^\n]*\n/, '').trim() };
  }
  return null;
}
/** Properties, each explained on hover, focus or tap (the rules data has their text). */
const propsHtml = (p, kind = 'weapon') => arr(p).filter((x) => x && x !== '—').map((x) => (propertyRule(x, kind)
  ? `<span class="prop-tip" tabindex="0" data-prop="${esc(x)}" data-kind="${kind}">${esc(x)}</span>` : esc(x))).join(', ');

// ------------------------------------------------------------- play-state tracker
// Counters that change during play (HP, dice, points, feature uses, death saves…) are
// tracked locally per character in platform.storage (`trackers`), separate from snapshots
// so reloading from SW5E doesn't wipe them. The shape is SW5E's raw.currentStats, so it can
// later be pushed back to the site. Until first changed here, the SW5E values are shown.
// Rest/damage/heal rules mirror sw5e.com's character sheet (CharacterSheetRest/HitPoints),
// except that a long rest here also clears death saves and lowers exhaustion by one.
const TRACKER_DEFAULTS = {
  hitPointsLost: 0, temporaryHitPoints: 0, techPointsUsed: 0, forcePointsUsed: 0, superiorityDiceUsed: 0,
  hitDiceUsed: {}, deathSaves: { successes: 0, failures: 0 }, hasInspiration: false, featuresTimesUsed: {},
  exhaustion: 0, highLevelCasting: { level6: false, level7: false, level8: false, level9: false }, conditions: [],
};
const clone = (o) => JSON.parse(JSON.stringify(o));

function sw5eStats(raw) {
  const cs = (raw && raw.currentStats) || {};
  const s = { ...clone(TRACKER_DEFAULTS), ...clone(cs) };
  s.deathSaves = { ...TRACKER_DEFAULTS.deathSaves, ...(cs.deathSaves || {}) };
  s.highLevelCasting = { ...TRACKER_DEFAULTS.highLevelCasting, ...(cs.highLevelCasting || {}) };
  s.conditions = arr(cs.conditions).filter((x) => typeof x === 'string');
  return s;
}

/** Tracker values and their limits for the current model. */
/**
 * Limited-use class features (and chosen options) with their uses, read from their text: SW5E's
 * data gives no usage for any feature. Each is worked out for its own class (level, table row).
 * [{ name, maximum, recharge, basis }]; maximum Infinity = unlimited.
 */
function featureUses(m) {
  if (!state.rules) return [];
  const classes = arr(m.raw.classes);
  const sc = m.c.abilityScores || {};
  const mods = Object.fromEntries(ABILITIES.map((a) => [a, num((sc[a] || {}).modifier)]));
  const pb = num(m.c.proficiencyBonus);
  const classOf = (f) => classes.find((k) => k.name === f.sourceName || (k.archetype && k.archetype.name === f.sourceName))
    || (classes.length === 1 ? classes[0] : null);
  // Multiclass Improvement: "You can add your other chosen class's levels to your engineer levels when determining … the
  // number of uses of your Potent Aptitude feature" (half of them: Guardian's Channel the Force): that feature's uses
  // go by the boosted level.
  const boost = (k, name) => (k.name ? multiclassBoosts(m.raw, k) : []).filter((b) => {
    const t = String((rulesModule('multiclassImprovements').find((x) => x.name === k.name) || {}).description || '');
    return new RegExp(`\\buses of (?:your )?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t);
  }).reduce((s, b) => s + num(b.add), 0);
  const ctxFor = (k, name) => ({ level: Math.min(20, num(k.levels) + (name ? boost(k, name) : 0)), pb, mods, row: k.name ? classRow(m.raw, k) : {}, note: name ? featureNoteOf(m.raw, name) : '' });
  const out = [];
  const seen = new Set();
  const add = (name, text, k) => {
    if (!k || seen.has(name)) return;
    // Two benefits with uses of their own ("- When you make an attack roll using your Strength… You can use this feature a
    // number of times equal to your proficiency bonus… - When an effect you control would call for a Strength saving
    // throw… a number of times…": Adaptable Fading): a counter each, named by what it's for.
    const USES = /\byou can use this (?:feature|benefit|ability) (?:a number of times|once|twice|\w+ times)\b/i;
    const pools = String(text || '').split('\n').filter((l) => /^\s*- /.test(l) && USES.test(l));
    if (pools.length > 1) {
      seen.add(name);
      pools.forEach((l, i) => {
        const u = clsUsage(l.replace(/^\s*- /, ''), ctxFor(k, name));
        const what = /\battack rolls?\b/i.test(l) ? 'attack rolls' : /\bsaving throws?\b/i.test(l) ? 'saving throws' : /\bability checks?\b/i.test(l) ? 'ability checks' : /\bdamage\b/i.test(l) ? 'damage' : String(i + 1);
        if (u) out.push({ name: `${name}: ${what}`, ...u, via: [] });
      });
      return;
    }
    const u = clsUsage(text, ctxFor(k, name));
    if (!u) return;
    seen.add(name);
    out.push({ name, ...u, via: clsChosenText(text, featureNoteOf(m.raw, name)).chosen });
  };
  for (const f of m.allFeatures) if (f.source !== 'Species') add(f.name, f.text || f.description || '', classOf(f));
  // Picks made in choice slots, counted at the character's level (splash improvements have no class of their own).
  const total = { name: '', levels: classes.reduce((t, k) => t + num(k.levels), 0) };
  // Species traits with uses ("You can't use this feature again until you finish a long rest": Second Heart).
  for (const f of bdSpeciesTraitFeatures(m)) add(f.name, f.text, classes.length ? total : null);
  for (const f of slotPickFeatures(m)) add(f.name, f.text || '', classes.find((k) => f.owner && k.name === f.owner) || (classes.length ? total : null));
  for (const k of classes) {
    const info = classChoiceInfo(m, k);
    for (const l of (info ? info.lists : [])) for (const p of l.chosen) {
      const o = l.options.find((x) => x.name === p.name);
      if (o) add(p.name, o.text, k);
    }
  }
  // More uses from another feature ("Your maximum focus increases by…half your Wisdom or Charisma modifier": Vow of
  // Serenity): the ability noted for it, else the better one.
  for (const e of arr(m.effects).filter((x) => x.usesPlus)) {
    const u = out.find((x) => x.name.toLowerCase() === String(e.usesPlus.name).toLowerCase());
    if (!u || !Number.isFinite(u.maximum)) continue;
    const note = String(featureNoteOf(m.raw, e.name) || '').toLowerCase();
    const picked = e.usesPlus.abilities.filter((a) => note.includes(a.toLowerCase()));
    const best = Math.max(...(picked.length ? picked : e.usesPlus.abilities).map((a) => mods[a]));
    const n = Math.max(e.usesPlus.min, e.usesPlus.half ? Math.floor(best / 2) : best);
    u.maximum += n;
    u.basis = `${u.basis ? `${u.basis} ` : ''}+${n} (${e.name})`;
  }
  // A feature whose uses are its chosen option's ("Vengeance": Their Power, My Strength's five), when the option has its
  // own counter: that one only.
  const names = new Set(out.map((u) => u.name));
  return out.filter((u) => !arr(u.via).some((n) => n !== u.name && names.has(n))).map(({ via, ...u }) => u);
}

/**
 * Dice and bonuses from the class tables at the character's levels: Sneak Attack "3d6", Martial
 * Arts "d8", Potent Aptitude, Focused Strikes, Kinetic Combat, Ranger's Quarry, superiority die,
 * Rage Damage "+3". [{ cls, column, dice: '3d6' } | { cls, column, bonus: 3 }]
 */
function classDice(m) {
  if (!state.rules) return [];
  const out = [];
  for (const k of arr(m.raw.classes)) {
    const row = classRow(m.raw, k);
    for (const [col, v] of Object.entries(row || {})) {
      if (['Level', 'Features', 'Proficiency Bonus'].includes(col)) continue;
      const d = /^(\d*)d(\d+)$/i.exec(String(v).trim());
      if (d) out.push({ cls: k.name, column: col, dice: `${d[1] || 1}d${d[2]}` });
      else if (/^\+\d+$/.test(String(v).trim()) && /damage/i.test(col)) out.push({ cls: k.name, column: col, bonus: Number(String(v).trim()) });
    }
  }
  // Damage dice from improvements picked in slots ("Once per turn, you can deal an extra 1d6 damage…", Splashclass
  // Operative; "you can deal 1d4 additional damage", Splashclass Scout's quarry), offered on weapon damage rolls.
  for (const f of slotPickFeatures(m)) {
    if (!/improvements$/i.test(f.slotKind || '')) continue;
    const d = /\b(?:an extra|deal) (\d*d\d+)(?: additional)? damage\b|(?<!more than )\b(\d*d\d+) additional damage\b/i.exec(f.text || '');
    if (d) out.push({ cls: f.name, column: `${f.name} (${f.sourceName.toLowerCase()})`, dice: (d[1] || d[2]).replace(/^d/, '1d'), rider: true });
  }
  return out;
}

function buildTracker(snap, c, refsInfo, textUses = [], extraDice = [], highRules = null, ownPoints = {}, supTw = {}) {
  const local = state.trackers[snap.key];
  const s = local ? local.stats : sw5eStats(snap.raw);
  const hp = c.hitPoints || {};
  const sup = c.superiority && typeof c.superiority === 'object' ? c.superiority : null;
  const supRows = refsInfo.flatMap((i) => i.rows);
  const supQty = supRows.filter(([k]) => /quantity|^superiority dice$/i.test(k)).reduce((t, [, v]) => t + num(v), 0);
  const supSizeRow = supRows.find(([k]) => /size/i.test(k));
  const features = arr(c.combatFeatures).concat(arr(c.nonCombatFeatures))
    .filter((f) => f.usage && num(f.usage.maximum) > 0)
    .map((f) => ({ name: f.name, maximum: num(f.usage.maximum), recharge: f.usage.recharge }));
  for (const u of textUses) if (!features.some((f) => f.name === u.name) && Number.isFinite(u.maximum)) features.push(u);
  // Exhaustion 4 or more: "hit point maximum halved" (hpFull is the maximum without it; hit points lost count from it,
  // as SW5E stores them).
  const hpFull = num(hp.maximum);
  const hpHalved = num(s.exhaustion) >= 4;
  const hpMax = hpHalved ? Math.floor(hpFull / 2) : hpFull;
  const lim = {
    hpMax,
    hpFull,
    hpHalved,
    hitDice: arr(hp.hitDice).map((d) => ({ size: d.size, maximum: num(d.maximum) })),
    hitDieBonus: num(hp.resting && hp.resting.hitDieBonus),
    // The dice from the class or archetype table as the sheet reads them (superiorityInfo), with the superiority tweaks:
    // SW5E's engine (and ours, which mirrors it) misreads an archetype's level table (its second column as the count,
    // size 0 without a size column: Deadeye d6, Adept Specialist 20 dice of size 0), so its numbers count only where
    // the sheet reads none. Fighting styles and masteries add dice to the pool (Superiority Style: one, d4 → d12 by level).
    supMax: (supQty > 0 ? engTweaked(supQty, supTw.maxDice || {}) : sup ? num(sup.maxDice) : 0) + extraDice.reduce((t, d) => t + num(d.count), 0),
    supSize: [supSizeRow ? supSizeRow[1] : supQty > 0 ? '' : sup && num(sup.diceSize) ? `d${num(String(sup.diceSize).replace(/\D/g, ''))}` : '', ...extraDice.map((d) => d.size)]
      .filter(Boolean).sort((a, b) => num(String(b).replace(/\D/g, '')) - num(String(a).replace(/\D/g, '')))[0] || '',
    // Points from SW5E's computation, or (casters its engine doesn't know, e.g. Rakatan Order) from the table.
    force: ownPoints.force != null ? num(ownPoints.force) : c.forceCasting ? num(c.forceCasting.maxPoints) : 0,
    tech: ownPoints.tech != null ? num(ownPoints.tech) : c.techCasting ? num(c.techCasting.maxPoints) : 0,
    // Levels cast only once per long rest ("You may only cast force powers at 6th, 7th, 8th, and 9th-level once"):
    // [{ kind, level, keys }] (see highLevelRules); without the rules data, SW5E's 6th to 9th.
    highLevels: highRules && highRules.length ? highRules : [6, 7, 8, 9].filter((l) => l <= Math.max(num(c.forceCasting && c.forceCasting.maxPowerLevel), num(c.techCasting && c.techCasting.maxPowerLevel)))
      .map((l) => ({ kind: '', level: l, keys: [`level${l}`] })),
    features,
  };
  const hdLeft = (size) => {
    const d = lim.hitDice.find((x) => x.size === size);
    return d ? Math.max(0, d.maximum - num(s.hitDiceUsed[size])) : 0;
  };
  return { s, lim, local: !!local, hpCurrent: hpNowOf({ s, lim }), hdLeft };
}
/** Current hit points: the maximum less what's lost, no more than the maximum (halved by exhaustion 4). */
const hpNowOf = (t) => Math.max(0, Math.min(t.lim.hpMax, num(t.lim.hpFull ?? t.lim.hpMax) - num(t.s.hitPointsLost)));
/** The hit point maximum shown: halved by exhaustion 4, said so; otherwise as changed by tweaks/effects (bump). */
function hpMaxHtml(m, t) {
  if (!t.lim.hpHalved) return bump(m, 'hitPoints.maximum', String(t.lim.hpMax));
  return `<span class="bump down" tabindex="0" title="${esc(`Halved by exhaustion (level ${num(t.s.exhaustion)}): ${t.lim.hpFull} without it. It comes back as exhaustion drops below 4.`)}">${t.lim.hpMax}</span>`;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Apply one tracker action to the current character's stats. Returns a label for undo, or null. */
function applyTrackerAction(t, op, arg, amount) {
  const { s, lim } = t;
  const cur = t.hpCurrent;
  switch (op) {
    case 'sup': s.superiorityDiceUsed = clamp(num(s.superiorityDiceUsed) + num(arg), 0, lim.supMax); return `Superiority die ${num(arg) > 0 ? 'spent' : 'back'}`;
    case 'force': s.forcePointsUsed = clamp(num(s.forcePointsUsed) + num(arg), 0, lim.force); return `Force points ${num(arg) > 0 ? '−' : '+'}${Math.abs(num(arg))}`;
    case 'tech': s.techPointsUsed = clamp(num(s.techPointsUsed) + num(arg), 0, lim.tech); return `Tech points ${num(arg) > 0 ? '−' : '+'}${Math.abs(num(arg))}`;
    case 'hd': {
      const [size, delta] = arg.split('|');
      const d = lim.hitDice.find((x) => x.size === size);
      if (d) s.hitDiceUsed[size] = clamp(num(s.hitDiceUsed[size]) + num(delta), 0, d.maximum);
      return `${size} hit die ${num(delta) > 0 ? 'spent' : 'back'}`;
    }
    case 'feat': {
      const [name, delta] = arg.split('|');
      const f = lim.features.find((x) => x.name === name);
      if (f) s.featuresTimesUsed[name] = clamp(num(s.featuresTimesUsed[name]) + num(delta), 0, f.maximum);
      return `${name}: use ${num(delta) > 0 ? 'spent' : 'back'}`;
    }
    case 'ds': { // click the n-th dot: fill up to it, or clear it if it was the last filled one
      const [kind, n] = arg.split('|');
      s.deathSaves[kind] = num(s.deathSaves[kind]) === num(n) ? num(n) - 1 : num(n);
      return `Death save ${kind} ${s.deathSaves[kind]}`;
    }
    case 'featheal': { // Second Wind and the like: spend a use, heal what was rolled
      const f = lim.features.find((x) => x.name === arg);
      if (f && num(s.featuresTimesUsed[arg]) >= f.maximum) return null;
      if (f) s.featuresTimesUsed[arg] = num(s.featuresTimesUsed[arg]) + 1;
      const healed = Math.min(Math.max(0, amount), lim.hpMax - cur);
      s.hitPointsLost = Math.max(0, lim.hpFull - (cur + healed));
      if (healed > 0) s.deathSaves = { successes: 0, failures: 0 };
      return `${arg}: healed ${healed}${healed < amount ? ` (of ${amount}; at maximum)` : ''}`;
    }
    case 'recover': { // recover|Force Recovery|force|4: a use spent for points back after a short rest
      const [name, kind, n] = arg.split('|');
      const f = lim.features.find((x) => x.name === name);
      if (f) s.featuresTimesUsed[name] = clamp(num(s.featuresTimesUsed[name]) + 1, 0, f.maximum);
      const field = kind === 'tech' ? 'techPointsUsed' : 'forcePointsUsed';
      const back = Math.min(num(n), num(s[field]));
      s[field] = num(s[field]) - back;
      return `${name}: ${back} ${kind} points back`;
    }
    case 'cond': { // cond|+Poisoned or cond|-Poisoned
      const on = arg[0] !== '-';
      const name = arg.slice(1);
      const list = arr(s.conditions).filter((x) => x !== name);
      s.conditions = on ? list.concat(name) : list;
      return `${name}${on ? '' : ' ended'}`;
    }
    case 'relent': { // Second Heart and the like: 1 hit point instead of 0, a use spent
      const f = lim.features.find((x) => x.name === arg);
      if (f && num(s.featuresTimesUsed[arg]) >= f.maximum) return null;
      if (f) s.featuresTimesUsed[arg] = num(s.featuresTimesUsed[arg]) + 1;
      s.hitPointsLost = Math.max(0, lim.hpFull - 1);
      s.deathSaves = { successes: 0, failures: 0 };
      return `${arg}: 1 hit point instead of 0`;
    }
    case 'alive': // a GM ruling after massive damage: down at 0 hit points instead of dead
      s.deathSaves = { successes: 0, failures: 0 };
      return 'GM ruling: at 0 HP instead of dead';
    case 'insp': s.hasInspiration = !s.hasInspiration; return s.hasInspiration ? 'Inspiration gained' : 'Inspiration used';
    case 'exh': {
      s.exhaustion = clamp(num(s.exhaustion) + num(arg), 0, 6);
      // At 4 the maximum is halved: hit points above it are gone (and don't come back when it drops again).
      if (s.exhaustion >= 4) s.hitPointsLost = Math.max(num(s.hitPointsLost), lim.hpFull - Math.floor(lim.hpFull / 2));
      return `Exhaustion ${s.exhaustion}${s.exhaustion >= 4 && num(arg) > 0 && s.exhaustion === 4 ? ` (hit point maximum halved: ${Math.floor(lim.hpFull / 2)})` : ''}`;
    }
    case 'hl': s.highLevelCasting[arg] = !s.highLevelCasting[arg]; return `${arg.replace(/\D+/g, '')}th-level casting ${s.highLevelCasting[arg] ? 'used' : 'back'}`;
    case 'hdheal': { // a hit die rolled in the roller: spend it and heal what it rolled
      const d = lim.hitDice.find((x) => x.size === arg);
      if (!d || num(s.hitDiceUsed[arg]) >= d.maximum) return null;
      s.hitDiceUsed[arg] = num(s.hitDiceUsed[arg]) + 1;
      const healed = Math.min(Math.max(0, amount), lim.hpMax - cur);
      s.hitPointsLost = Math.max(0, lim.hpFull - (cur + healed));
      if (amount > 0) s.deathSaves = { successes: 0, failures: 0 };
      return `Spent a ${arg} hit die, healed ${healed}${healed < amount ? ` (of ${amount}; at maximum)` : ''}`;
    }
    case 'hdback': { // a vitapac: n spent hit dice come back (of different sizes: chosen at random, as its text says)
      const back = {};
      for (let i = 0; i < num(arg); i++) {
        const spent = lim.hitDice.flatMap((d) => Array(Math.max(0, Math.floor(num(s.hitDiceUsed[d.size])))).fill(d.size));
        if (!spent.length) break;
        const size = spent[Math.floor(Math.random() * spent.length)];
        s.hitDiceUsed[size] = num(s.hitDiceUsed[size]) - 1;
        back[size] = (back[size] || 0) + 1;
      }
      const n = Object.values(back).reduce((t, v) => t + v, 0);
      return n ? `Regained ${n} hit ${n === 1 ? 'die' : 'dice'} (${Object.entries(back).map(([k, v]) => `${v}${k}`).join(', ')})` : null;
    }
    case 'dsadd': { // a death save rolled in the roller: successes|1, failures|1 or failures|2 (natural 1)
      const [kind, n] = arg.split('|');
      s.deathSaves[kind] = clamp(num(s.deathSaves[kind]) + num(n), 0, 3);
      return `Death save: ${n === '2' ? 'two failures' : kind === 'successes' ? 'a success' : 'a failure'}`;
    }
    case 'nat20': // a natural 20 on a death save: back up with 1 hit point
      s.hitPointsLost = Math.max(0, lim.hpFull - Math.max(cur, 1));
      s.deathSaves = { successes: 0, failures: 0 };
      return 'Natural 20: 1 hit point';
    case 'damage': {
      if (!(amount > 0)) return null;
      const temp = Math.max(0, num(s.temporaryHitPoints) - amount);
      const left = cur + num(s.temporaryHitPoints) - amount;
      if (-left >= lim.hpMax) s.deathSaves.failures = 3; // massive damage
      // Damage while at 0 hit points: a failed death save (a critical hit: two; click the next dot).
      else if (cur === 0 && temp === 0) s.deathSaves.failures = clamp(num(s.deathSaves.failures) + 1, 0, 3);
      s.hitPointsLost = lim.hpFull - (temp > 0 ? cur : Math.max(0, left));
      s.temporaryHitPoints = temp;
      return cur === 0 && temp === 0 ? `Took ${amount} damage at 0 HP (a failed death save)` : `Took ${amount} damage`;
    }
    case 'heal': {
      if (!(amount > 0)) return null;
      const healed = Math.min(amount, lim.hpMax - cur);
      s.hitPointsLost = Math.max(0, lim.hpFull - Math.min(lim.hpMax, cur + amount));
      s.deathSaves = { successes: 0, failures: 0 };
      return `Healed ${healed}${healed < amount ? ` (of ${amount}; at maximum)` : ''}`;
    }
    case 'temp':
      if (!(amount > num(s.temporaryHitPoints))) return null; // temp HP doesn't stack: the higher amount stays
      s.temporaryHitPoints = amount;
      return `Temporary HP ${amount}`;
    case 'short': {
      s.techPointsUsed = 0;
      s.superiorityDiceUsed = 0;
      for (const f of lim.features) if (f.recharge === 'shortRest') s.featuresTimesUsed[f.name] = 0;
      return 'Short rest';
    }
    case 'long': {
      Object.assign(s, { hitPointsLost: 0, temporaryHitPoints: 0, techPointsUsed: 0, forcePointsUsed: 0, superiorityDiceUsed: 0 });
      s.deathSaves = { successes: 0, failures: 0 }; // back to full HP, as with healing
      for (const f of lim.features) s.featuresTimesUsed[f.name] = 0;
      s.highLevelCasting = clone(TRACKER_DEFAULTS.highLevelCasting);
      // Regain half your total hit dice (min 1), largest dice first.
      let budget = Math.max(1, Math.floor(lim.hitDice.reduce((n, d) => n + d.maximum, 0) / 2));
      for (const d of [...lim.hitDice].sort((a, b) => num(b.size.slice(1)) - num(a.size.slice(1)))) {
        const back = Math.min(num(s.hitDiceUsed[d.size]), budget);
        s.hitDiceUsed[d.size] = num(s.hitDiceUsed[d.size]) - back;
        budget -= back;
      }
      s.exhaustion = Math.max(0, num(s.exhaustion) - (num(lim.exhRest) || 1));
      return 'Long rest';
    }
    default: return null;
  }
}

/** A tracker button (or the roller's apply buttons, which pass the amount rolled). */
async function trackerAction(op, arg, rolled) {
  const snap = state.snapshots[state.current];
  if (!snap || !snap.complete) return;
  const m = buildModel(snap);
  const before = clone(m.t.s);
  const input = rolled == null ? $('#trackAmount') : null;
  const amount = rolled != null ? Math.floor(num(rolled)) : input ? Math.floor(num(input.value)) : 0;
  const stack = (state.undoStack || []).filter((u) => u.key === snap.key);
  // Undo goes back one action at a time (the last ten), counters included.
  const pushUndo = (u) => {
    if (state.undo && state.undo.key === snap.key) stack.push(state.undo);
    state.undoStack = stack.slice(-9);
    state.undo = u;
  };
  if (op === 'undo') {
    if (!state.undo || state.undo.key !== snap.key) return;
    m.t.s = state.undo.stats;
    if (state.undo.effects) { // effects a rest or dropping to 0 ended come back
      const st = itemStateOf(snap.key);
      st.effects = state.undo.effects;
      await saveItemStateFor(snap.key, st);
      scheduleRecompute(snap.key);
    }
    setStatus(`Undone: ${state.undo.label}.`);
    state.undo = stack.pop() || null;
    state.undoStack = stack;
  } else if (op === 'sw5e') {
    delete state.trackers[snap.key];
    pushUndo({ key: snap.key, stats: before, label: 'Reset to SW5E values' });
    await saveTrackers();
    refreshTracked();
    return;
  } else {
    if (['damage', 'heal', 'temp'].includes(op) && !(amount > 0)) {
      if (input) input.focus();
      return setStatus(`Type the amount first, then press ${op === 'temp' ? 'Temp HP' : titleCase(op)}.`, 'error');
    }
    if (op === 'long') m.t.lim.exhRest = longRestExhaustion(m)[0];
    // Typed damage against the character's resistances and immunities (the type from the tracker's list, or `arg`).
    const dtype = op === 'damage' ? (arg || ($('#trackType') ? $('#trackType').value : '')) : '';
    const dd = op === 'damage' && dtype ? plDamageAfterDefenses(amount, dtype, defensesOf(m)) : null;
    const taken = dd ? dd.amount : amount;
    let label = op === 'damage' && dd && !taken ? `${amount} ${dtype} damage: none taken (${dd.applied.join(', ')})` : applyTrackerAction(m.t, op, op === 'damage' ? '' : arg, op === 'damage' ? taken : amount);
    if (op === 'damage' && dd && taken) label = `Took ${taken} damage (${amount} ${dtype}${dd.applied.length ? `, ${dd.applied.join(', ')}` : ''})`;
    const hpNow = hpNowOf(m.t);
    // Down to 0: Unconscious (until healed); back up: not any more.
    if (hpNow === 0 && m.t.hpCurrent > 0 && !arr(m.t.s.conditions).includes('Unconscious')) m.t.s.conditions = arr(m.t.s.conditions).concat('Unconscious');
    if (hpNow > 0 && m.t.hpCurrent === 0) m.t.s.conditions = arr(m.t.s.conditions).filter((x) => x !== 'Unconscious');
    // After a short rest: roll a hit die if hurt, and the features that give points back (Force Recovery).
    const restOffers = () => {
      const hd = hpNow < m.t.lim.hpMax ? m.t.lim.hitDice.filter((d) => m.t.hdLeft(d.size) > 0).sort((a, b) => num(b.size.slice(1)) - num(a.size.slice(1)))[0] : null;
      const rec = restRecoveries(m).filter((r) => num(m.t.s[r.kind === 'tech' ? 'techPointsUsed' : 'forcePointsUsed']) > 0);
      return {
        text: hd ? ` ${m.t.lim.hpMax - hpNow} HP missing.` : '',
        buttons: [hd ? { act: 'roll', arg: `hitdie|${hd.size}`, label: `Roll a hit die (${hd.size})` } : null,
          ...rec.map((r) => ({ act: 'recover', arg: `${r.name}|${r.kind}|${r.amount}`, label: `Use ${r.name} (+${r.amount} ${r.kind} points)` }))].filter(Boolean),
      };
    };
    // Effects that end now: on a rest, those that would have run out; at 0 hit points, concentration and Rage.
    const fxBefore = arr(state.itemState[snap.key] && state.itemState[snap.key].effects);
    const ending = op === 'short' || op === 'long' ? fxBefore.filter((e) => endsOnRest(e, op))
      : op === 'damage' && hpNow === 0 && m.t.hpCurrent > 0 ? fxBefore.filter((e) => e.group === 'concentration' || e.group === 'state:raging') : [];
    // Item charges that come back on a long rest.
    const charged = op === 'long' ? itemStateOf(snap.key) : null;
    const recharged = charged ? itemRestCharges(charged) : [];
    if (recharged.length) await saveItemStateFor(snap.key, charged);
    const chargesText = recharged.length ? ` Charges back: ${recharged.map((x) => `${x.name} ${x.all ? '(all)' : `+${x.back}${x.rolled ? ` (rolled ${x.rolled})` : ''}`}`).join(', ')}.` : '';
    if (JSON.stringify(m.t.s) === JSON.stringify(before) && !ending.length && !recharged.length) { // nothing changed: say why where it isn't obvious
      if (op === 'temp') setStatus(`You already have ${num(before.temporaryHitPoints)} temporary hit points; they don't stack (the higher amount stays).`);
      else if (op === 'short') {
        const o = restOffers();
        setStatus(`Short rest: nothing comes back by itself.${o.text}${o.buttons.length ? '' : ' To heal, roll hit dice ("roll d…" in the tracker).'}`, '', false, o.buttons);
      }
      else if (op === 'long') setStatus('Nothing to regain: everything is already back.');
      else if (op === 'heal' || op === 'hdheal') setStatus('At full hit points: nothing to heal.');
      return;
    }
    if (op === 'damage' && taken > 0) fxPulse('hit');
    else if (op === 'heal' || op === 'hdheal') fxPulse('heal');
    else if (op === 'temp') fxPulse('shield');
    if (ending.length) {
      const st = itemStateOf(snap.key);
      st.effects = st.effects.filter((e) => !ending.some((x) => x.id === e.id));
      await saveItemStateFor(snap.key, st);
      renderAll({ keepTyping: true });
      scheduleRecompute(snap.key);
    }
    if (label || ending.length) pushUndo({ key: snap.key, stats: before, label: label || 'Effects ended', effects: ending.length ? fxBefore : null });
    const ended = ending.length ? ` Ended: ${ending.map((e) => e.name).join(', ')}.` : '';
    if (['damage', 'heal', 'temp'].includes(op) && input) input.value = '';
    const hpText = `HP ${hpNow}/${m.t.lim.hpMax}${num(m.t.s.temporaryHitPoints) ? ` + ${num(m.t.s.temporaryHitPoints)} temp` : ''}`;
    // After damage: the concentration save; at 0, a "drop to 1 hit point instead" trait (Second Heart).
    const afterDamage = [];
    if (op === 'damage' && taken > 0) {
      const conc = arr(state.itemState[snap.key] && state.itemState[snap.key].effects).find((e) => e.group === 'concentration');
      if (conc && hpNow > 0) afterDamage.push({ act: 'roll', arg: `conc|${plConcentrationDc(taken)}`, label: `Concentration save (DC ${plConcentrationDc(taken)})` });
      if (hpNow === 0 && m.t.hpCurrent > 0 && num(m.t.s.deathSaves.failures) < 3) {
        for (const f of m.allFeatures.concat(bdSpeciesTraitFeatures(m))) {
          if (!/reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead/i.test(f.text || f.description || '')) continue;
          const use = m.t.lim.features.find((u) => u.name === f.name);
          if (!use || num(m.t.s.featuresTimesUsed[f.name]) < use.maximum) { afterDamage.push({ act: 'relent', arg: f.name, label: `Use ${f.name}: 1 HP instead` }); break; }
        }
      }
    }
    const maybe = dd && dd.maybe.length ? ` Maybe less: ${dd.maybe.join('; ')}.` : '';
    if (op === 'short') {
      const o = restOffers();
      setStatus(`Short rest: ${restGains(before, m.t.s, m.t.lim) || 'done'}.${ended}${o.text}`, '', false, o.buttons);
    }
    else if (op === 'long') {
      // Force Visions: "When you finish a long rest, roll two d20s and record the numbers rolled."
      let fore = '';
      if (num((state.itemState[snap.key] || {}).frenzy)) {
        const st = itemStateOf(snap.key);
        delete st.frenzy;
        await saveItemStateFor(snap.key, st);
      }
      if (hasForesight(m)) {
        const st = itemStateOf(snap.key);
        st.foretell = [rollDie(20), rollDie(20)];
        await saveItemStateFor(snap.key, st);
        fore = ` Foretelling rolls: ${st.foretell.join(' and ')}.`;
      }
      setStatus(`Long rest: ${restGains(before, m.t.s, m.t.lim, longRestExhaustion(m)[1]) || 'done'}.${ended}${chargesText}${fore}`);
    }
    else if (op === 'damage' && num(m.t.s.deathSaves.failures) >= 3 && num(before.deathSaves.failures) < 3) setStatus(`${label}: three failed death saves (damage of at least your hit point maximum kills outright; the GM can rule otherwise on the HP card).${ended}`, 'error');
    else if (op === 'damage' && hpNow === 0 && m.t.hpCurrent > 0) setStatus(`${label}. Down to 0 hit points: unconscious, roll death saves (Death saves → Roll).${ended}${maybe}`, '', false, afterDamage);
    else if (['damage', 'heal', 'temp'].includes(op)) setStatus(`${label}. ${hpText}.${maybe}`, '', false, afterDamage);
    else if (op === 'cond' || op === 'relent') setStatus(`${label}.`);
    else if (op === 'alive') setStatus('At 0 hit points instead of dead: roll death saves (Death saves → Roll).');
    else if (op === 'recover') setStatus(`${label}.`);
  }
  // Back to what SW5E has (e.g. a use spent and given back): nothing local to keep.
  const noZeros = (s) => ({ ...s, featuresTimesUsed: Object.fromEntries(Object.entries(s.featuresTimesUsed || {}).filter(([, v]) => num(v))) });
  if (canonical(noZeros(m.t.s)) === canonical(noZeros(sw5eStats(snap.raw)))) delete state.trackers[snap.key];
  else state.trackers[snap.key] = { stats: m.t.s, updatedAt: Date.now() };
  await saveTrackers();
  refreshTracked();
}

/**
 * Item charges that come back on a long rest, taken off the used ones in `st` (an itemState): "When you complete a long
 * rest, this item regains all missing charges", "All expended charges are regained after you complete a long rest",
 * "This weapon has 6 charges and regains 1d6 charges when you complete a long rest" (rolled); "… daily at dawn" (the
 * long rest stands for the dawn). [{ name, back, all, rolled }].
 */
function itemRestCharges(st) {
  const out = [];
  for (const [name, used] of Object.entries(st.charges || {})) {
    const ref = num(used) > 0 && catalogIndex && catalogIndex.get(name);
    const t = String((ref && (ref.text || ref.description)) || '').replace(/\s+/g, ' ');
    if (!/\blong rest\b|\bat dawn\b/i.test(t)) continue;
    let back = 0;
    let rolled = '';
    let x;
    if (/\bregains? all (?:missing|expended) charges\b|\ball expended charges are regained\b/i.test(t)) back = num(used);
    else if ((x = /\bregains? (\d*d\d+(?: ?\+ ?\d+)?|\d+) (?:expended )?charges\b/i.exec(t))) {
      const p = parseDice(x[1]);
      const n = p ? p.dice.reduce((s, d) => s + rollDie(d.sides), 0) + p.mod : 0;
      back = Math.min(num(used), Math.max(0, n));
      rolled = /d/.test(x[1]) ? `${x[1]}: ${n}` : '';
    }
    if (!back) continue;
    st.charges[name] = num(used) - back;
    if (!st.charges[name]) delete st.charges[name];
    out.push({ name, back, all: back === num(used) && !rolled, rolled });
  }
  return out;
}
/** A feature that heals when used ("regain hit points equal to 1d10 + your fighter level"): its roll spec, or ''. */
function healFeatureRoll(m, name) {
  const f = m.allFeatures.find((x) => x.name === name);
  const x = f && /regain hit points equal to (\d*d\d+) \+ your (\w+) level/i.exec(f.text || f.description || '');
  if (!x) return '';
  const k = arr(m.raw.classes).find((c) => String(c.name).toLowerCase() === x[2].toLowerCase());
  return `featheal|${name}|${x[1].replace(/^d/, '1d')}|${k ? num(k.levels) : num(m.c.currentLevel)}|${k ? `${k.name} level` : 'level'}`;
}
/** Points a feature gives back after a short rest, if it has a use left (Force Recovery: half your consular level +
 * Wisdom or Charisma, at least 1): [{ name, kind, amount }]. */
function restRecoveries(m) {
  const out = [];
  const sc = m.c.abilityScores || {};
  for (const f of m.allFeatures) {
    const x = /when you finish a short rest, you can regain (?:a number of )?(force|tech) points equal to half your (\w+) level(?: \(rounded (up|down)\))?(?: \+ your (\w+)(?: or (\w+))? modifier)?/i.exec(f.text || f.description || '');
    if (!x || out.some((o) => o.name === f.name)) continue;
    const use = m.t && m.t.lim.features.find((u) => u.name === f.name);
    if (use && num(m.t.s.featuresTimesUsed[f.name]) >= use.maximum) continue;
    const k = arr(m.raw.classes).find((c) => String(c.name).toLowerCase() === x[2].toLowerCase());
    const lvl = k ? num(k.levels) : 0;
    const half = x[3] === 'up' ? Math.ceil(lvl / 2) : Math.floor(lvl / 2);
    const mod = Math.max(...[x[4], x[5]].filter(Boolean).map((a) => num((sc[titleCase(a.toLowerCase())] || {}).modifier)), 0);
    out.push({ name: f.name, kind: x[1].toLowerCase(), amount: Math.max(1, half + (x[4] ? mod : 0)) });
  }
  return out;
}

/** Levels of exhaustion a long rest removes, and the feature that says so: [1, ''], or [2, 'Frenzy'] (Frenzied Approach). */
function longRestExhaustion(m) {
  for (const f of m.allFeatures) {
    const x = /finish a long rest, you reduce your exhaustion level by (\w+)/i.exec(f.text || f.description || '');
    if (x && fxNum(x[1]) > 1) return [fxNum(x[1]), f.name];
  }
  return [1, ''];
}

/** A duration in seconds ("1 hour", "up to 10 minutes", "until the end of your next turn"); null if it has no end of its own. */
function durationSeconds(text) {
  const t = String(text || '').toLowerCase();
  const x = /(\d+|an?|one)\s*(round|minute|hour|day|week)s?\b/.exec(t);
  if (x) return (/^\d+$/.test(x[1]) ? Number(x[1]) : 1) * { round: 6, minute: 60, hour: 3600, day: 86400, week: 604800 }[x[2]];
  return /\bturn\b/.test(t) ? 6 : null;
}
/** Does a temporary effect end with this rest? A short rest (1 hour) outlasts effects of an hour or less, a long rest (8
 * hours) those of 8 hours or less, and concentration (sleep ends it). */
function endsOnRest(e, op) {
  if (op === 'long' && (e.group === 'concentration' || /\blong rest\b/i.test(e.duration || ''))) return true;
  const secs = durationSeconds(e.duration);
  return secs != null && secs <= (op === 'long' ? 8 * 3600 : 3600);
}

/** What a rest gave back, for its message. */
function restGains(a, b, lim, exhWhy = '') {
  const out = [];
  const hp = num(a.hitPointsLost) - num(b.hitPointsLost);
  if (hp > 0) out.push(`${hp} HP`);
  if (num(a.forcePointsUsed) > num(b.forcePointsUsed)) out.push(`${num(a.forcePointsUsed) - num(b.forcePointsUsed)} force points`);
  if (num(a.techPointsUsed) > num(b.techPointsUsed)) out.push(`${num(a.techPointsUsed) - num(b.techPointsUsed)} tech points`);
  if (num(a.superiorityDiceUsed) > num(b.superiorityDiceUsed)) out.push(`${num(a.superiorityDiceUsed) - num(b.superiorityDiceUsed)} superiority dice`);
  const hd = lim.hitDice.reduce((t, d) => t + num(a.hitDiceUsed[d.size]) - num(b.hitDiceUsed[d.size]), 0);
  if (hd > 0) out.push(`${hd} hit ${hd === 1 ? 'die' : 'dice'}`);
  const uses = lim.features.filter((f) => num(a.featuresTimesUsed[f.name]) > num(b.featuresTimesUsed[f.name])).map((f) => f.name);
  if (uses.length) out.push(`uses of ${uses.join(', ')}`);
  const parts = out.length ? ['regained ' + out.join(', ')] : [];
  const exh = num(a.exhaustion) - num(b.exhaustion);
  if (exh > 0) parts.push(`${exh === 1 ? 'one level' : `${exh} levels`} of exhaustion gone${exhWhy && exh > 1 ? ` (${exhWhy})` : ''}`);
  return parts.join('; ');
}

const trackedFields = (stats) => Object.fromEntries(Object.keys(TRACKER_DEFAULTS).map((k) => [k, stats[k]]));

// ------------------------------------------------------------- field edits
// Simple fields edited here, kept in state.edits until saved to sw5e.com. Paths are
// 'notes', 'credits', 'experiencePoints' or 'characteristics.<name>' (the bridge refuses others).
const NUMBER_FIELDS = ['credits', 'experiencePoints'];
const ITEM_FIELDS = ['equipment', 'customEquipment']; // edited (and saved) as whole lists
const OBJECT_FIELDS = ['tweaks', 'classes', 'customFeatures', 'featureNotes', 'featureChoices', 'background', 'species', 'baseAbilityScores',
  'settings', 'languageChoices']; // edited (and saved) as a whole value
const LIST_FIELDS = ['customProficiencies', 'customLanguages', 'customFeats', 'creditLog', 'debts']; // lists edited (and saved) whole
// Edits that change what the engine computes.
const ENGINE_FIELDS = ['equipment', 'customEquipment', 'classes', 'background', 'species', 'baseAbilityScores', 'settings', 'customProficiencies', 'customLanguages', 'customFeats'];
const PERSONAL = ['Personality Traits', 'Ideal', 'Bond', 'Flaw'];
const PHYSICAL = ['Gender', 'Place of Birth', 'Age', 'Height', 'Weight', 'Hair', 'Eyes', 'Skin'];
const ALIGNMENTS = ['Lawful Light', 'Neutral Light', 'Chaotic Light', 'Lawful Balanced', 'Balanced Neutral',
  'Chaotic Balanced', 'Lawful Dark', 'Neutral Dark', 'Chaotic Dark'];
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj, path, v) {
  const [top, sub] = path.split('.');
  if (sub) obj[top] = { ...(obj[top] || {}), [sub]: v };
  else obj[top] = v;
}
const editedFields = (key) => (state.edits[key] && state.edits[key].fields) || {};
const fieldLabel = (path) => ({ notes: 'Notes', credits: 'Credits', experiencePoints: 'XP', 'characteristics.alignment': 'Alignment',
  equipment: 'Inventory', customEquipment: 'Custom items', tweaks: 'Tweaks', classes: 'Classes', customFeatures: 'Custom features', featureNotes: 'Feature notes', featureChoices: 'Feature choices',
  background: 'Background', species: 'Species', baseAbilityScores: 'Ability scores', settings: 'Settings', languageChoices: 'Language choices',
  creditLog: 'Credit history', debts: 'Debts', rollLog: 'Recent rolls', characteristics: 'Personality & appearance',
  customProficiencies: 'Proficiencies', customLanguages: 'Languages', customFeats: 'Feats', name: 'Name', image: 'Portrait' }[path]
  || path.replace(/^characteristics\./, ''));
// Same value as SW5E's? (A missing text field equals an empty one.)
const sameField = (path, a, b) => (NUMBER_FIELDS.includes(path) ? num(a) === num(b)
  : ITEM_FIELDS.includes(path) || LIST_FIELDS.includes(path) ? canonical(arr(a)) === canonical(arr(b))
    : OBJECT_FIELDS.includes(path) ? canonical(a || {}) === canonical(b || {}) : String(a ?? '') === String(b ?? ''));

/**
 * An edited field's value over SW5E's copy `raw`. Classes are levelled up here too, so an edited class list is the
 * character's own; a level-up made on sw5e.com meanwhile is merged in on Load (rebaseEdits).
 */
const editValue = (raw, path, v) => v;
function withEdits(raw, fields) {
  if (!Object.keys(fields).length) return raw;
  const out = { ...raw };
  for (const [p, v] of Object.entries(fields)) setPath(out, p, editValue(raw, p, v));
  return out;
}

/**
 * Three-way merge of one value: `b` SW5E's copy when it was last loaded, `t` its copy now, `m` ours. Each side's
 * changes are kept; lists of names take both sides' additions and removals, lists of named entries (classes, items)
 * and objects merge entry by entry. Where both changed the same thing, ours wins and `clash` is set.
 */
function merge3(b, t, m) {
  const same = (x, y) => canonical(x ?? null) === canonical(y ?? null);
  if (same(m, b)) return { value: t };
  if (same(t, b) || same(t, m)) return { value: m };
  const names = (l) => Array.isArray(l) && l.every((x) => x == null || typeof x !== 'object');
  if (names(b ?? []) && names(t) && names(m)) {
    const bs = arr(b);
    const added = t.filter((x) => !bs.includes(x) && !m.includes(x));
    return { value: m.filter((x) => !bs.includes(x) || t.includes(x)).concat(added) };
  }
  const named = (l) => Array.isArray(l) && l.every((x) => x && typeof x === 'object' && typeof x.name === 'string')
    && new Set(l.map((x) => x.name)).size === l.length;
  if (named(b ?? []) && named(t) && named(m)) {
    const bm = new Map(arr(b).map((x) => [x.name, x]));
    const tm = new Map(t.map((x) => [x.name, x]));
    let clash = false;
    const out = [];
    for (const x of m) {
      if (tm.has(x.name)) {
        const r = merge3(bm.get(x.name), tm.get(x.name), x);
        clash = clash || !!r.clash;
        out.push(r.value);
      } else if (!bm.has(x.name)) out.push(x); // added here
      else if (!same(x, bm.get(x.name))) { out.push(x); clash = true; } // changed here, removed there
    }
    for (const x of t) if (!bm.has(x.name) && !out.some((o) => o.name === x.name)) out.push(x); // added there
    return { value: out, clash };
  }
  const obj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  if (obj(b ?? {}) && obj(t) && obj(m)) {
    const out = {};
    let clash = false;
    for (const k of new Set([...Object.keys(t), ...Object.keys(m)])) {
      const r = merge3((b || {})[k], t[k], m[k]);
      clash = clash || !!r.clash;
      if (r.value !== undefined) out[k] = r.value;
    }
    return { value: out, clash };
  }
  return { value: m, clash: true };
}

/**
 * SW5E's copy is older than the one loaded before (a save that never reached its server, e.g. when its sign-in had
 * expired): this viewer's copy is the character, so every field that differs is kept as an edit (Sync puts it back
 * there), and the play state too. Returns the fields kept.
 */
const KEEP_SKIP = ['changedAt', 'builderVersion', 'userId', 'user', 'createdAt', 'id', 'localId', 'currentStats', 'image'];
function keepOursOverOlder(key, base, theirs) {
  const ed = state.edits[key] || { fields: {} };
  const fields = { ...ed.fields };
  const kept = [];
  for (const f of new Set([...Object.keys(base || {}), ...Object.keys(theirs || {})])) {
    if (KEEP_SKIP.includes(f)) continue;
    if (f === 'characteristics') {
      for (const c of new Set([...Object.keys(base.characteristics || {}), ...Object.keys(theirs.characteristics || {})])) {
        const p = `characteristics.${c}`;
        if (p in fields || String((base.characteristics || {})[c] ?? '') === String((theirs.characteristics || {})[c] ?? '')) continue;
        fields[p] = (base.characteristics || {})[c] ?? '';
        kept.push(p);
      }
      continue;
    }
    if (f in fields || canonical(base[f] ?? null) === canonical(theirs[f] ?? null)) continue;
    fields[f] = clone(base[f]);
    kept.push(f);
  }
  if (Object.keys(fields).length) state.edits[key] = { ...ed, fields, updatedAt: Date.now() };
  if (!state.trackers[key] && canonical(trackedFields(sw5eStats(base))) !== canonical(trackedFields(sw5eStats(theirs)))) {
    state.trackers[key] = { stats: sw5eStats(base), updatedAt: Date.now() };
    kept.push('play state');
  }
  return kept;
}

/** SW5E's copy of `key` went from `base` to `theirs` (a Load): merge that into our edits. Returns the fields changed on both sides. */
function rebaseEdits(key, base, theirs) {
  const ed = state.edits[key];
  if (!ed || !base) { pruneEdits(key, theirs); return []; }
  const both = [];
  for (const [p, mine] of Object.entries(ed.fields)) {
    const b = getPath(base, p), t = getPath(theirs, p);
    if (canonical(b ?? null) === canonical(t ?? null)) continue;
    const r = merge3(b, t, mine);
    if (r.clash) both.push(p);
    ed.fields[p] = r.value;
  }
  pruneEdits(key, theirs);
  return both;
}
// The computed sheet copies some of these fields; show the edited values there too.
function completeWithEdits(c, raw, fields) {
  if (!Object.keys(fields).length || !Object.keys(c).length) return c;
  const out = { ...c, characteristics: raw.characteristics, notes: raw.notes };
  if ('credits' in fields) out.credits = fields.credits;
  if ('characteristics.alignment' in fields) out.alignment = fields['characteristics.alignment'];
  if ('experiencePoints' in fields && c.experiencePoints) out.experiencePoints = { ...c.experiencePoints, current: fields.experiencePoints };
  if ('equipment' in fields) {
    out.equipment = mergeEquipment(fields.equipment, c.equipment);
    out.attunement = { ...(c.attunement || {}), current: out.equipment.filter((e) => e.attuned).reduce((t, e) => t + attuneCost(e), 0) };
  }
  if ('customEquipment' in fields) out.customEquipment = fields.customEquipment;
  return out;
}

// ------------------------------------------------------------- effects on the sheet
// Everything that changes the character's numbers (see effects.js): items worn, attuned or
// installed, and temporary effects (consumables used on the character, effects received from
// others). Their numbers become tweaks in the copy the sheet is computed from; the sheet without
// them is kept too (m.base), so every number they change can explain itself on hover (bump()).
const itemStateOf = (key) => clone(state.itemState[key] || { charges: {}, effects: [] });
const itemTargets = (key) => (state.itemState[key] && state.itemState[key].targets) || {};
function setDeep(obj, path, v) {
  const ks = path.split('.');
  let o = obj;
  for (const k of ks.slice(0, -1)) o = (o[k] && typeof o[k] === 'object') ? o[k] : (o[k] = {});
  o[ks[ks.length - 1]] = v;
}
/** Temporary effects; ones saved before effects had mods/notes carried resolved `tweaks`. */
const tempEffects = (key) => arr(state.itemState[key] && state.itemState[key].effects).map((e) => (e.mods ? e
  : { ...e, mods: arr(e.tweaks).map((t) => ({ path: t.path, bonus: t.bonus, label: t.label })), notes: [], target: 'self' }));

const fxCache = new Map(); // item name -> parsed effect (item texts don't change)
function itemEffectOf(ref) {
  if (!ref) return null;
  if (!fxCache.has(ref.name)) fxCache.set(ref.name, parseItemEffect(ref));
  return fxCache.get(ref.name);
}
/** Standard weapons the character carries (what weapon bonuses can be applied to). */
const ownWeapons = (editedRaw) => arr(editedRaw.equipment).map((it, i) => ({ it, i, ref: catalogIndex && catalogIndex.get(it.name) }))
  .filter((x) => x.it.category === 'Equipment' && x.ref && x.ref.equipmentCategory === 'Weapon');
const weaponIndexByName = (editedRaw, name) => {
  const w = name && ownWeapons(editedRaw).find((x) => x.it.name === name);
  return w ? w.i : null;
};

/**
 * The entry an enhanced item at `items[i]` is built on (it carries `enhancedBy`, the enhanced item's name), or -1.
 * Copies of one enhanced item (two Weapon (Fine)) each have their own: the pair shares a `baseLink` id (set when
 * linking). Entries linked before there were ids: a copy that names its base (`baseItem`) takes the first one of
 * that name, the others pair up in order.
 */
function invBaseIndex(items, i) {
  const it = items[i];
  if (!it || it.enhancedBy) return -1;
  const at = (f) => items.map((x, j) => j).filter((j) => items[j] && f(items[j]));
  const pair = (a, b) => !!a.baseLink && a.baseLink === b.baseLink;
  const bases = at((x) => x.enhancedBy === it.name);
  const copies = at((x) => x.name === it.name && !x.enhancedBy);
  const own = bases.find((b) => pair(items[b], it));
  if (own != null) return own;
  const freeB = bases.filter((b) => !copies.some((c) => pair(items[b], items[c])));
  const freeC = copies.filter((c) => !bases.some((b) => pair(items[b], items[c])));
  const named = new Map(); // copy -> base
  for (const c of freeC.filter((x) => items[x].baseItem)) {
    const b = freeB.find((x) => items[x].name === items[c].baseItem && ![...named.values()].includes(x));
    if (b != null) named.set(c, b);
  }
  if (named.has(i)) return named.get(i);
  const restB = freeB.filter((b) => ![...named.values()].includes(b));
  const k = freeC.filter((c) => !named.has(c)).indexOf(i);
  return k >= 0 && k < restB.length ? restB[k] : -1;
}
/** Which copy of an item an entry is, as a key: its name for the first one carried, "Weapon (Fine)#2" for the next. */
function copyKey(items, i) {
  const it = items[i] || {};
  const k = items.slice(0, i).filter((x) => x && x.name === it.name && !x.enhancedBy).length;
  return k ? `${it.name}#${k + 1}` : it.name;
}

/** Effects of the enhanced items the character carries, whether active or not (and why). */
function itemEffects(key, editedRaw, complete) {
  const out = [];
  const entries = arr(complete && complete.equipment);
  const equipment = arr(editedRaw.equipment);
  equipment.forEach((it, i) => {
    if (!isEnhancedEntry(it)) return;
    const ref = entries.find((e) => e.index === i && e.name === it.name && e.isFound) || (catalogIndex && catalogIndex.get(it.name));
    const fx = itemEffectOf(ref);
    if (!fx || fx.activation === 'use') return;
    const how = fxEquipLabel(ref).toLowerCase();
    const active = fx.activation === 'carry' ? qtyOf(it) > 0 : fx.activation === 'attune' ? !!it.attuned : !!it.equipped;
    // An enhanced weapon built on a base weapon the character carries (its linked entry): the bonus goes there.
    // Each copy of an item is its own effect, on its own weapon.
    const linked = invBaseIndex(equipment, i);
    const ck = copyKey(equipment, i);
    const weaponName = fx.target === 'weapon' ? (linked >= 0 ? equipment[linked].name : itemTargets(key)[ck] || null) : null;
    // "…by an amount equal to your level, and it increases by 1 every time you gain a level": at the current level.
    const level = arr(editedRaw.classes).reduce((t, k) => t + num(k.levels), 0);
    const weaponIndex = linked >= 0 && fx.target === 'weapon' ? linked : weaponIndexByName(editedRaw, weaponName);
    // A weapon that gains finesse (or a blaster mighty) uses the better of Strength and Dexterity: from the one it uses.
    const w = weaponIndex != null ? arr(complete && complete.weapons).find((x) => x.index === weaponIndex) : null;
    const swapFrom = (prop) => (w && prop === 'finesse' && w.ability === 'Strength' ? 'Strength' : w && prop === 'mighty' && w.ability === 'Dexterity' ? 'Dexterity' : null);
    // Proficiency steps and half proficiency start from the proficiency SW5E gives (classes, background, tweaks).
    const sc = (complete && complete.abilityScores) || {};
    const rankOf = (path) => {
      const x = /^abilityScores\.(\w+)\.(?:skills\.(.+)|savingThrowModifier)$/.exec(path) || [];
      const a = sc[x[1]] || {};
      return x[2] ? (arr(a.skills).find((k) => k.name === x[2]) || {}).proficiency : (a.savingThrow || {}).proficiency;
    };
    const mods = arr(fx.mods).map((x) => (x.perLevel ? { ...x, bonus: x.perLevel * level, label: x.label.replace(/\+(\d+) per level$/, (p) => `+${x.perLevel * level} (${p})`) }
      : x.property && swapFrom(x.property) ? { ...x, swap: { from: swapFrom(x.property), to: swapFrom(x.property) === 'Strength' ? 'Dexterity' : 'Strength' } }
        : x.profSteps ? { ...x, baseRank: rankOf(x.path) }
          : x.halfProf ? { ...x, baseRank: rankOf(x.path), bonus: Math.floor(num(complete && complete.proficiencyBonus) / 2) } : x));
    // "While using this item as your focus": the player ticks it (itemState.focusOn, per copy); then those bonuses
    // apply (as the conditions they may also have).
    const asFocusOn = !!fx.asFocus && !!((state.itemState[key] && state.itemState[key].focusOn) || {})[ck];
    if (asFocusOn) {
      for (const [j, x] of mods.entries()) {
        if (!x.asFocus) continue;
        const rest = String(x.cond).replace(/,? ?while it's your focus$/, '');
        mods[j] = rest ? { ...x, cond: rest } : (({ cond, ...y }) => y)(x);
      }
    }
    // A set's bonuses ("While wearing and attuned to this armor and Jensaarai Cloak, …") hold with the other pieces
    // attuned too; the ones still missing are listed (setPending).
    const setMet = (names) => arr(names).every((n) => equipment.some((x) => x.attuned && invSameName(x.name, n)));
    const setPending = mods.filter((x) => x.requires && !setMet(x.requires));
    for (const x of setPending) mods.splice(mods.indexOf(x), 1);
    // A class augment's numbers are for its class only ("Fighter Offensive Augment"'s superiority die).
    for (const x of mods.filter((y) => y.forClass && !arr(editedRaw.classes).some((kk) => kk.name === y.forClass))) mods.splice(mods.indexOf(x), 1);
    const kc = fx.classBoosts && arr(editedRaw.classes).find((kk) => kk.name === fx.classBoosts.cls);
    const classChanges = kc ? itemBoostChanges(chClassRow(editedRaw, kc, (state.rules && state.rules.modules) || {}), fx.classBoosts.boosts) : [];
    // "One ability score other than Charisma (chosen by the GM) decreases by 1": the score the item's note names.
    const needs = [];
    // "Your level of proficiency in these tools increases by two steps" (Tool (Fine)): the tool picked on the item
    // (itemState.toolPicks), from the proficiency the character has in it (proficient, or expertise from a custom one).
    let toolPick = null;
    if (fx.toolSteps) {
      const name = ((state.itemState[key] && state.itemState[key].toolPicks) || {})[ck] || '';
      if (name) {
        const lc = name.toLowerCase();
        const custom = arr(editedRaw.customProficiencies).find((p) => p && p.type === 'tool' && String(p.name).toLowerCase() === lc);
        // (and the tools features give: Armstech Engineering's armstech's implements, a feat's expertise)
        const fromFeatures = featureEffects(key, editedRaw, complete).flatMap((x) => arr(x.tools)).filter((t) => String(t.name).toLowerCase() === lc);
        const rank = (custom && /exp/i.test(custom.proficiencyLevel || '')) || fromFeatures.some((t) => /exp/i.test(t.level)) ? 2
          : custom || fromFeatures.length || arr(complete && complete.proficiencies).some((p) => p.type === 'tool' && String(p.name).toLowerCase() === lc) ? 1 : 0;
        const level = FX_PROF_LADDER[Math.min(FX_PROF_LADDER.length - 1, [0, 2, 3][rank] + fx.toolSteps)];
        toolPick = { name, level };
      }
    }
    if (fx.sideEffect) {
      const a = clsNoteNames(it.notes).abilities.find((x) => x !== fx.sideEffect.except);
      if (a) mods.push({ path: `abilityScores.${a}.score`, bonus: -fx.sideEffect.by, label: `${a.slice(0, 3).toUpperCase()} −${fx.sideEffect.by} (side effect)` });
      else needs.push(`the score the GM lowers by ${fx.sideEffect.by} (not ${fx.sideEffect.except})`);
    }
    // "You have resistance to one type of damage while you wear this armor. The DM chooses the type" (Adapted Armor).
    if (/\bresistance to one type of damage\b/i.test(ref.text || '') && !new RegExp(`\\b(?:${PL_DAMAGE_TYPES.join('|')})\\b`, 'i').test(it.notes || '')) needs.push('the damage type the GM chose (resistance)');
    // Proficiencies and always-on advantages in the item's text, read as a feature's are (classes.js), with a choice it
    // asks for ("proficiency in one blaster or vibroweapon of your choice") written in the item's note.
    // (The choices it asks for: picked on the item, itemState.itemPicks, or written in its note.)
    const picked = arr(((state.itemState[key] && state.itemState[key].itemPicks) || {})[ck]);
    const fe = itemFeatureEffects(ref, [it.notes, ...picked].filter(Boolean).join(', '));
    if (fe) {
      for (const a of fe.profs.saves) mods.push({ path: `abilityScores.${a}.savingThrowModifier`, bonus: 0, fields: { proficiency: 'Proficient' }, label: `${a} saves: proficient` });
      for (const k of fe.profs.skills) mods.push({ path: `abilityScores.${FX_SKILLS[k.name]}.skills.${k.name}`, bonus: 0, fields: { proficiency: k.level }, label: `${k.name}: ${String(k.level).toLowerCase()}` });
    }
    // Keen: the weapon's own keen number (its base item's), raised as the modification says, widens its critical range.
    let keen = null;
    if (fx.keen && weaponIndex != null) {
      const ref0 = catalogIndex && catalogIndex.get(equipment[weaponIndex].name);
      const own = num((/^keen (\d+)/i.exec(arr(ref0 && ref0.properties).find((p) => /^keen \d/i.test(p)) || '') || [])[1]);
      keen = !own ? fx.keen.gain : fx.keen.to ? Math.max(own, fx.keen.to) : fx.keen.by ? Math.min(fx.keen.max || 99, own + fx.keen.by) : Math.max(own, fx.keen.gain);
    }
    // Properties it gives the weapon chosen or the armor worn (smart, versatile, brutal, vicious, strength number,
    // absorptive / avoidant / reactive, lightweight), from that item's own.
    let propsNow = null;
    let propsOn = null;
    if (fx.props) {
      propsOn = fx.target === 'weapon' ? weaponIndex : wornArmorIndex(editedRaw);
      const base = propsOn != null && propsOn >= 0 ? catalogIndex && catalogIndex.get(equipment[propsOn].name) : null;
      if (base) propsNow = itemPropsNow(base.properties, fx.props);
      // Smart (15, +2): "This weapon ignores your Dexterity score and proficiency bonus … uses these values instead of
      // yours" (no proficiency bonus "if you lack proficiency with the weapon").
      if (propsNow && propsNow.smart && w && w.ability === 'Dexterity') {
        const dex = num((((complete && complete.abilityScores) || {}).Dexterity || {}).modifier);
        const pb = num(complete && complete.proficiencyBonus);
        const own = num(((equipment[propsOn].tweaks || {}).toHit || {}).bonus) + num((((editedRaw.tweaks || {}).weapon || {}).toHit || {}).bonus);
        const proficient = num(w.attackBonus) - dex - own >= pb;
        const sm = Math.floor((propsNow.smart[0] - 10) / 2);
        const [s, p] = propsNow.smart;
        const toHit = sm - dex + (proficient ? p - pb : 0);
        if (toHit) mods.push({ path: 'weapon.toHit', bonus: toHit, label: `Smart (${s}, +${p}): attack ${signedLabel(toHit)}` });
        if (sm - dex) mods.push({ path: 'weapon.damage', bonus: sm - dex, label: `Smart (${s}, +${p}): damage ${signedLabel(sm - dex)}` });
      }
      // The armor's strength number met now: SW5E's speed has the −10 ft its own number gives; it's given back.
      if (propsNow && 'strength' in propsNow && fx.target !== 'weapon') {
        const was = num((/^strength (\d+)/i.exec(arr(base && base.properties).find((x) => /^strength \d/i.test(x)) || '') || [])[1]);
        const str = num((((complete && complete.abilityScores) || {}).Strength || {}).value);
        if (was > str && (!propsNow.strength || propsNow.strength <= str)) mods.push({ path: 'speed.base', bonus: 10, label: `Speed +10 ft (Strength ${propsNow.strength || 'requirement'} met)` });
      }
    }
    out.push({
      ...fx, mods, id: 'item:' + ck, kind: 'item', name: it.name, index: i, active, propsNow, propsOn,
      why: fx.activation === 'carry' ? 'when you fire it' : fx.activation === 'attune' ? (active ? 'while attuned' : 'needs attunement') : (active ? `while ${how}` : `needs to be ${how}`),
      weaponName, weaponIndex, linked: linked >= 0,
      ...(keen ? { critRange: keen, critWeapons: [weaponIndex] } : {}),
      ...(fe ? { weapons: fe.profs.weapons, tools: fe.profs.tools, armor: fe.profs.armor, advantage: fe.advantage, asks: fe.asks, picked } : {}),
      // The picked tool at the level it comes to (trained, below proficient, changes no number).
      ...(toolPick ? { toolPick, tools: (fe ? fe.profs.tools : []).concat(FX_PROF_LADDER.indexOf(toolPick.level) >= 2
        ? [{ name: toolPick.name, level: toolPick.level === 'proficient' ? 'proficient' : 'expertise' }] : []) } : {}),
      needsChoice: (fe ? fe.needsChoice : []).concat(needs),
      asFocusOn, setPending, freeAttune: !!fx.freeAttune && !!it.attuned && setMet(fx.freeAttune), classChanges,
    });
  });
  return out;
}

/** One item named in another's text ("Jensaraai Armor" is SW5E's typo for Jensaarai Armor): letters only, one off. */
function invSameName(a, b) {
  const x = String(a).toLowerCase().replace(/[^a-z]/g, '');
  const y = String(b).toLowerCase().replace(/[^a-z]/g, '');
  if (x === y) return true;
  if (Math.abs(x.length - y.length) > 1 || x.slice(0, 4) !== y.slice(0, 4) || x.slice(-4) !== y.slice(-4)) return false;
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  const tail = (s) => s.slice(i + 1);
  return tail(x) === tail(y) || tail(x) === y.slice(i) || x.slice(i) === tail(y) || tail(x).split('').reverse().join('') === tail(y).split('').reverse().join('');
}
/** The armor worn (or else the shield): its index in the equipment, or -1 (an armor modification's "this armor"). */
function wornArmorIndex(raw) {
  const eq = arr(raw.equipment);
  const kind = (it) => { const r = it.equipped && catalogIndex && catalogIndex.get(it.name); return r && r.equipmentCategory === 'Armor' ? (/shield/i.test(r.armorClassification || '') ? 'shield' : 'armor') : ''; };
  const a = eq.findIndex((it) => kind(it) === 'armor');
  return a >= 0 ? a : eq.findIndex((it) => kind(it) === 'shield');
}
const ITEM_VERSATILE = ['2d4', '1d10', '1d12', '2d6', '3d4'];
/**
 * A weapon's or armor's properties with what a modification changes ("gains the brutal 1 property. If it already has
 * the brutal property, its brutal number increases by 1, to a maximum of 3"; "versatile damage increases by one step
 * (from 2d4 to d10, …)"; the strength number "reduced by one step (from 15 to 13…)", gone at 11): { name: value }.
 */
function itemPropsNow(baseProps, props) {
  const own = {};
  for (const p of arr(baseProps)) {
    const s = String(p).trim();
    let x;
    if ((x = /^smart \((\d+), \+?(\d+)\)/i.exec(s))) own.smart = [num(x[1]), num(x[2])];
    else if ((x = /^versatile \((\d*d\d+)\)/i.exec(s))) own.versatile = x[1].replace(/^d/, '1d');
    else if ((x = /^(brutal|vicious|absorptive|avoidant|reactive|strength) (\d+)/i.exec(s))) own[x[1].toLowerCase()] = num(x[2]);
    else if (/^lightweight$/i.test(s)) own.lightweight = true;
  }
  const out = {};
  for (const p of props) {
    const had = own[p.name];
    if (p.name === 'strength') { if (had) out.strength = had - 2 * p.down <= 11 ? 0 : had - 2 * p.down; continue; }
    if (p.name === 'smart') out.smart = had ? (p.to ? [p.to, 6] : [Math.min(p.max || 20, had[0] + (p.by || 0)), Math.min(6, had[1] + (p.by || 0))]) : p.value;
    else if (p.name === 'versatile') out.versatile = had ? ITEM_VERSATILE[Math.min(ITEM_VERSATILE.length - 1, Math.max(0, ITEM_VERSATILE.indexOf(had)) + (p.by || 1))] : String(p.value).replace(/^d/, '1d');
    else if (typeof p.value === 'number') out[p.name] = had ? (p.to ? Math.max(had, p.to) : Math.min(p.max || 99, had + (p.by || 0))) : p.value;
    else out[p.name] = p.value;
  }
  return out;
}
/** A weapon's or armor's properties as the sheet uses them: its own, with what modifications in use change. */
function itemPropsOf(m, index, own) {
  const list = arr(own).slice();
  for (const e of arr(m.effects).filter((x) => x.kind === 'item' && x.active && x.propsNow && x.propsOn === index)) {
    for (const [name, v] of Object.entries(e.propsNow)) {
      const i = list.findIndex((p) => new RegExp(`^${name}\\b`, 'i').test(String(p).trim()));
      const text = name === 'smart' ? `smart (${v[0]}, +${v[1]})` : name === 'versatile' ? `versatile (${v})` : v === true ? name : v ? `${name} ${v}` : '';
      if (i >= 0) { if (text) list[i] = text; else list.splice(i, 1); } else if (text) list.push(text);
    }
  }
  return list;
}
/** A weapon's properties (weapons table, dice card): with its modifications'. */
const weaponProps = (m, w) => (w && w.index != null && w.index >= 0 ? itemPropsOf(m, w.index, w.properties) : arr(w && w.properties));
/**
 * An enhanced item's entry: SW5E's category, or (an entry written without one) an item SW5E's catalog lists as
 * enhanced (Resourceful Drive pushed as { name, equipped }).
 */
function isEnhancedEntry(it) {
  if (!it) return false;
  if (it.category) return it.category === 'EnhancedItem';
  const ref = catalogIndex && catalogIndex.get(it.name);
  return !!ref && !ref.equipmentCategory && !!ref.type;
}
/** What classes.js reads in an item's text (proficiencies, advantages, choices), or null when it finds none. */
const itemFeCache = new Map();
function itemFeatureEffects(ref, note) {
  if (!ref || typeof clsFeatureEffects !== 'function' || ref.type === 'Consumable') return null;
  const key = `${ref.name}\n${note || ''}`;
  if (!itemFeCache.has(key)) {
    const fe = clsFeatureEffects(ref.text || ref.description || '', note || '', { level: 0, isWeapon: isWeaponName });
    const p = fe.profs;
    itemFeCache.set(key, p.saves.length || p.skills.length || p.tools.length || p.weapons.length || p.armor.length || fe.advantage.length || fe.needsChoice.length ? fe : null);
  }
  return itemFeCache.get(key);
}
/**
 * Dice an item adds to a weapon's damage on every hit ("deal an additional 1d10 damage with this enhanced weapon",
 * Ostrine Edge's 1d6 of a type the GM chose): [{ dice, type, from }]. The weapons table shows them in the damage, the
 * dice card rolls them with the weapon's.
 */
function weaponExtraDice(m, w) {
  const unarmed = w.name === 'Unarmed Strike';
  return arr(m.fx && m.fx.dice).filter((d) => (unarmed ? d.unarmed : !d.unarmed && d.weaponIndex != null && d.weaponIndex === w.index))
    .map((d) => ({ dice: d.dice, type: d.type || '', from: d.effect.name }));
}
/**
 * A weapon's damage type, or what an item makes it: "Your unarmed strikes with this arm deal 1d4 ion damage"
 * (Iridonian Grav-lev Arm), when the arm's die is the one the strikes use.
 */
function weaponDamageType(m, w) {
  const t = w.damageType && w.damageType !== 'Unknown' ? w.damageType : '';
  if (w.name !== 'Unarmed Strike') return t;
  const arm = arr(m.effects).find((e) => e.kind === 'item' && e.active && e.unarmedType && num(e.unarmedDie) >= num(w.damageDieType));
  return arm ? titleCase(arm.unarmedType) : t;
}
/** A weapon's damage as the weapons table shows it, with the dice items add ("1d8+1d10+5 Kinetic"). */
function weaponDamageText(m, w) {
  const extra = weaponExtraDice(m, w);
  const s = damageText({ ...w, damageType: weaponDamageType(m, w) });
  if (!extra.length) return s;
  const more = extra.map((x) => `+${x.dice}`).join(''); // its own damage type: on the dice card
  return num(w.damageDieType) > 0 && num(w.damageNumberOfDice) > 0 ? s.replace(/^(\d+d\d+)/, `$1${more}`) : `${more.slice(1)}+${s}`;
}

// ------------------------------------------------------------- tweaks
// The character's tweaks (manual adjustments: raw.tweaks, and per-weapon equipment[i].tweaks),
// whether set in sw5e.com's editor or here, are effects too, with an optional (but asked-for)
// reason kept in this viewer (itemState.reasons, keyed by tweak path / "item:<name>.<path>"; a second weapon of the
// same name "item:<name>#2.<path>", so each keeps its own reason).
const reasonsOf = (key) => (state.itemState[key] && state.itemState[key].reasons) || {};
/** A weapon tweak's reason key: by name, numbered from the second entry of that name. */
function weaponTweakKey(items, i, sub) {
  const it = items[i] || {};
  const k = items.slice(0, i).filter((x) => x && x.name === it.name).length;
  return `item:${it.name}${k ? `#${k + 1}` : ''}.${sub}`;
}
/** The character's tweaks as rows: { rkey, path (effect path), value, name, where, index?, sub? }. */
function tweakRows(editedRaw) {
  const rows = fxTweakLeaves(editedRaw.tweaks).map((l) => ({ rkey: l.path, path: l.path, value: l.value, name: fxTweakName(l.path), where: 'tweaks' }));
  arr(editedRaw.equipment).forEach((it, i) => fxTweakLeaves(it.tweaks).forEach((l) => rows.push({
    rkey: weaponTweakKey(arr(editedRaw.equipment), i, l.path), path: `weapon.${l.path}`, sub: l.path, index: i, value: l.value,
    name: `${it.name}: ${TWEAK_NAMES[l.path] || l.path}`, where: 'equipment',
  })));
  return rows;
}
/** Active tweaks as effects (kind 'tweak'), so they're applied and explained like the others. */
function tweakEffects(key, editedRaw) {
  const swRaw = state.snapshots[key].raw;
  const reasons = reasonsOf(key);
  // Tweaks the player keeps although the sheet applies what they were made for (fxTweakTwins).
  const keep = (state.itemState[key] && state.itemState[key].keepTweaks) || {};
  return tweakRows(editedRaw).filter((r) => fxTweakActive(r.value)).map((r) => {
    const orig = r.where === 'tweaks' ? getPath(swRaw.tweaks, r.path) : getPath(((arr(swRaw.equipment)[r.index]) || {}).tweaks, r.sub);
    const fromSw5e = !!orig && canonical(orig) === canonical(r.value);
    const { bonus, ...rest } = r.value;
    const fields = Object.fromEntries(Object.entries(rest).filter(([f, v]) => TWEAK_FIELDS.includes(f) && v != null && v !== ''));
    const reason = reasons[r.rkey] || '';
    return {
      id: 'tweak:' + r.rkey, kind: 'tweak', name: reason || r.name, tweakName: r.name, reason, fromSw5e, rkey: r.rkey, keep: !!keep[r.rkey],
      why: fromSw5e ? 'tweak' : 'tweak (not synced to SW5E yet)',
      target: r.where === 'equipment' ? 'weapon' : 'self', weaponIndex: r.where === 'equipment' ? r.index : null,
      mods: [{ path: r.path, bonus: num(bonus), fields: Object.keys(fields).length ? fields : null, label: `${r.name} ${fxTweakValueText(r.value)}` }],
      notes: [],
    };
  });
}
// ------------------------------------------------------------- class feature effects
// What class/archetype features and chosen options do to the numbers (classes.js reads them from
// the text): ability increases, unarmored AC and speed, proficiencies (saves, skills, tools, and
// weapons described in prose, which the engine doesn't apply), with "choose…" picks taken from
// the feature's notes. They're effects of kind 'feature', applied like tweaks, never saved.
const PROF_RANK = (p) => ({ proficient: 1, expertise: 2 }[String(p || '').toLowerCase()] || 0);
let featureFxCache = null;
// What the player says is in use (itemState.inUse: "biochemist's pack as a tech focus" → true), for the features and
// modifications that only work then; set by featureEffects for featureEffectsUncached.
let featureInUse = {};
function featureEffects(key, editedRaw, complete) {
  if (!state.rules) return [];
  // Cached: the same classes, notes, choices and rules give the same effects (this runs on every redraw).
  const sig = canonical([editedRaw.classes, editedRaw.featureNotes || null, editedRaw.featureChoices || null, editedRaw.background || null,
    editedRaw.customFeats || null, editedRaw.species || null, arr(editedRaw.equipment).map((it) => it.name), castingLevels(complete, editedRaw),
    num(complete && complete.proficiencyBonus), // choice slots' "5 x your proficiency bonus"
    editedRaw.tweaks || null, editedRaw.customProficiencies || null, arr(complete && complete.proficiencies).length, // "if you are already proficient"
    catalogIndex ? catalogIndex.size : 0, // weapons are found through the catalog
    (state.itemState[key] && state.itemState[key].inUse) || null, arr(editedRaw.equipment).map((it) => !!it.equipped)]);
  featureInUse = (state.itemState[key] && state.itemState[key].inUse) || {};
  if (featureFxCache && featureFxCache.rules === state.rules && featureFxCache.sig === sig) return featureFxCache.out;
  const own = featureEffectsUncached(editedRaw);
  const out = proficiencyRules(editedRaw, complete, own.concat(choiceEffects(editedRaw, complete, own)));
  featureFxCache = { rules: state.rules, sig, out };
  return out;
}
/** A skill or saving throw proficiency as a mod: { path, fields: { proficiency }, label }. */
function profMod(kind, name, level, extra = {}) {
  const path = kind === 'save' ? `abilityScores.${name}.savingThrowModifier` : `abilityScores.${FX_SKILLS[name]}.skills.${name}`;
  return { path, bonus: 0, fields: { proficiency: level }, label: `${kind === 'save' ? `${name} saves` : name}: ${String(level).toLowerCase()}`, ...extra };
}
/**
 * "If you are already proficient…" (classes.js profs.upgrades and profs.chains): a grant that becomes expertise when the
 * character already has it (Brawny's Athletics, Titan's Power's Strength saves, Specialist's kit), and grants that need
 * another proficiency first (Armor Expert's medium armor; Resilient Retainer's Intelligence or Charisma saves when it
 * already had Wisdom's). "Already": from anything but the feature itself — the classes and background, the player's
 * tweaks and custom proficiencies, the other features, feats and traits. Chains met are marked (chainsMet) for pickers.
 */
function proficiencyRules(editedRaw, complete, effects) {
  if (!effects.some((e) => arr(e.chains).length || arr(e.mods).some((x) => x.orExpertise) || arr(e.tools).some((t) => t.orExpertise))) return effects;
  const has = new Map(); // "skill:athletics" → who gives it ('base', or effect ids)
  const key = (kind, name) => `${kind}:${String(name).toLowerCase()}`;
  const give = (k, who) => { if (!has.has(k)) has.set(k, new Set()); has.get(k).add(who); };
  const hasOther = (k, who) => [...(has.get(k) || [])].some((x) => x !== who);
  const ofMod = (path) => { const sk = /\.skills\.(.+)$/.exec(path); const sv = /^abilityScores\.(\w+)\.savingThrowModifier$/.exec(path); return sk ? key('skill', sk[1]) : sv ? key('save', sv[1]) : null; };
  for (const k of arr(editedRaw.classes)) for (const s of arr(k.skills).concat(arr(k.expertise))) give(key('skill', s), 'base');
  for (const s of arr(editedRaw.background && editedRaw.background.skills)) give(key('skill', s), 'base');
  arr(editedRaw.classes).forEach((k, i) => {
    const cref = rulesModule('classes').find((x) => x.name === k.name);
    if (!cref) return;
    if (i === 0) for (const a of arr(cref.savingThrows)) give(key('save', a), 'base');
    // The first class's armor ("All armor": light, medium and heavy); another class's multiclass list.
    for (const a of i === 0 ? arr(cref.armorProficiencies) : arr(cref.multiClassProficiencies)) {
      const s = String(a).toLowerCase();
      for (const n of /^all armor$/.test(s) ? ['light armor', 'medium armor', 'heavy armor'] : s.match(/\b(?:light|medium|heavy) armor\b|\bshields?\b/g) || []) give(key('armor', n), 'base');
    }
  });
  for (const p of arr(complete && complete.proficiencies)) if (p.type === 'tool') give(key('tool', p.name), 'base');
  for (const p of arr(editedRaw.customProficiencies)) if (['tool', 'armor', 'skill'].includes(String(p.type).toLowerCase())) give(key(String(p.type).toLowerCase(), p.name), 'base');
  for (const l of fxTweakLeaves(editedRaw.tweaks)) if (l.value && l.value.proficiency && ofMod(l.path)) give(ofMod(l.path), 'base');
  for (const e of effects) {
    for (const x of arr(e.mods)) if (x.fields && x.fields.proficiency && !x.orExpertise && ofMod(x.path)) give(ofMod(x.path), e.id);
    for (const t of arr(e.tools)) if (!t.orExpertise) give(key('tool', t.name), e.id);
    for (const a of arr(e.armor)) give(key('armor', a), e.id);
  }
  return effects.map((e) => {
    if (!arr(e.chains).length && !arr(e.mods).some((x) => x.orExpertise) && !arr(e.tools).some((t) => t.orExpertise)) return e;
    const mods = arr(e.mods).map((x) => {
      if (!x.orExpertise) return x;
      const k = ofMod(x.path);
      const already = hasOther(k, e.id);
      give(k, e.id);
      return already ? { ...x, fields: { proficiency: 'Expertise' }, label: x.label.replace(/: proficient$/, ': expertise (already proficient)') } : x;
    });
    const tools = arr(e.tools).map((t) => {
      if (!t.orExpertise) return t;
      const already = hasOther(key('tool', t.name), e.id);
      give(key('tool', t.name), e.id);
      return already ? { ...t, level: 'expertise' } : t;
    });
    const weapons = arr(e.weapons).slice();
    const armor = arr(e.armor).slice();
    const chainsMet = arr(e.chains).map((c) => {
      if (!c.ifHas.every((h) => hasOther(key(h.kind, h.name), e.id))) return false;
      for (const a of c.saves) { mods.push(profMod('save', a, 'Proficient')); give(key('save', a), e.id); }
      for (const sk of c.skills) { mods.push(profMod('skill', sk.name, sk.level)); give(key('skill', sk.name), e.id); }
      for (const t of c.tools) { tools.push(t); give(key('tool', t.name), e.id); }
      for (const a of c.armor) { armor.push(a); give(key('armor', a), e.id); }
      weapons.push(...c.weapons);
      return true;
    });
    return { ...e, mods, tools, weapons, armor, chainsMet };
  });
}
/**
 * A feature-effect entry from clsFeatureEffects' result (null when it changes nothing). origin: what gives it, for
 * explanations ('class feature', 'feat', 'species trait').
 */
function featureEffectEntry(id, name, why, fe, origin = 'class feature') {
  const mods = fe.mods.slice();
  // "If you are already proficient in it, you instead gain expertise in it": marked, resolved by proficiencyRules.
  const up = (kind, n) => arr(fe.profs.upgrades).some((u) => u.kind === kind && u.name === n) ? { orExpertise: true } : {};
  for (const a of fe.profs.saves) mods.push(profMod('save', a, 'Proficient', up('save', a)));
  for (const sk of fe.profs.skills) mods.push(profMod('skill', sk.name, sk.level, up('skill', sk.name)));
  const tools = fe.profs.tools.map((t) => ({ ...t, ...up('tool', t.name) }));
  const chains = arr(fe.profs.chains);
  const passives = fe.passives || {};
  const other = fe.advantage.length || fe.defenses.length || fe.critRange || fe.halfProf || fe.unarmedStep || fe.unarmedDie || Object.keys(passives).length || fe.substitute || fe.armorAllows || fe.ignoreArmorStrength || fe.usesPlus || fe.darkvisionPlus;
  if (!mods.length && !tools.length && !fe.profs.weapons.length && !fe.profs.armor.length && !chains.length && !fe.needsChoice.length && !other) return null;
  return {
    id, kind: 'feature', origin, name, why, mods, notes: [], needsChoice: fe.needsChoice, weapons: fe.profs.weapons, tools, armor: fe.profs.armor, chains, passives, target: 'self',
    advantage: fe.advantage, defenses: fe.defenses, critRange: fe.critRange, halfProf: fe.halfProf, unarmedStep: fe.unarmedStep,
    unarmedDie: fe.unarmedDie || 0, unarmedFinesse: !!fe.unarmedFinesse, ...(fe.critOn === 'unarmed' ? { critWeapons: ['unarmed'] } : fe.critOn ? { critOn: fe.critOn } : {}),
    ...(fe.darkvisionPlus ? { darkvisionPlus: fe.darkvisionPlus } : {}), ...(fe.usesPlus ? { usesPlus: fe.usesPlus } : {}), ...(fe.substitute ? { substitute: fe.substitute } : {}), ...(fe.armorAllows ? { armorAllows: fe.armorAllows } : {}),
    ...(fe.ignoreArmorStrength ? { ignoreArmorStrength: true } : {}),
  };
}
/**
 * What fighting styles, masteries, weapon focuses/supremacies and improvements picked in slots do:
 * permanent numbers like a feature's, and weapon bonuses on the weapons chosen with a focus. Forms
 * are adopted (Class Features → Start), maneuvers and powers are used, so neither applies here.
 * `features`: the features' own effects (the weapon proficiencies they give).
 */
function choiceEffects(editedRaw, complete, features = []) {
  const res = choiceInfoFor(editedRaw, complete);
  if (!res) return [];
  const out = [];
  // Proficient with the carried weapon at `idx`: by the classes' lists (SW5E's), a proficiency added by hand, the
  // weapon's own tweak, or a feature's ("martial vibroweapons with the finesse property").
  const proficient = (idx) => {
    const it = arr(editedRaw.equipment)[idx] || {};
    const ref = catalogByName(it.name);
    if (!ref) return false;
    const own = PROF_RANK(getPath(it.tweaks || {}, 'toHit.proficiency')) || PROF_RANK(getPath(editedRaw.tweaks || {}, 'weapon.toHit.proficiency'));
    return own > 0 || arr(complete && complete.proficiencies).some((x) => ['weapon', 'other'].includes(x.type) && engWeaponCovered(x.name, ref))
      || arr(editedRaw.customProficiencies).some((x) => x && x.type === 'weapon' && engWeaponCovered(x.name, ref))
      || features.some((e) => arr(e.weapons).some((d) => clsWeaponMatches(d, ref)));
  };
  for (const p of chPickTexts(res)) {
    if (['lightsaberForms', 'maneuvers', 'forcePowers', 'techPowers', 'powers'].includes(p.kind)) continue;
    const origin = p.owner ? 'class feature' : p.species ? 'species trait' : 'feat';
    if (CH_KINDS[p.kind] && CH_KINDS[p.kind].weapons) {
      const wb = chWeaponBenefits(p.text);
      // "You gain the following benefits while wielding any of these weapons, if you are proficient with it".
      const needsProf = /\bif you are proficient with it\b/i.test(p.text);
      for (const wname of p.weapons) {
        const idx = weaponIndexByName(editedRaw, wname);
        if (idx == null || (!wb.mods.length && !wb.critRange) || out.some((x) => x.name === p.name && x.weaponIndex === idx)) continue;
        if (needsProf && !proficient(idx)) continue;
        out.push({
          id: `choice:${p.key}:${p.name}:${wname}`, kind: 'feature', origin, name: p.name, why: `${p.title} (${wname})`, target: 'weapon', weaponIndex: idx,
          mods: wb.mods.map((x) => ({ ...x, label: `${p.name}: ${x.path === 'weapon.damage' ? 'damage' : 'attack'} +${x.bonus}` })), notes: [],
          critRange: wb.critRange, critWeapons: wb.critRange ? [idx] : null, weaponName: wname,
        });
      }
      continue;
    }
    const e = featureEffectEntry(`choice:${p.key}:${p.name}`, p.name, p.title, clsFeatureEffects(p.text, p.note, { level: res.level, pb: num(complete && complete.proficiencyBonus) }), origin);
    if (e) out.push(e);
  }
  return out;
}
function featureEffectsUncached(editedRaw) {
  const parsed = classRules();
  const out = [];
  arr(editedRaw.classes).forEach((k, ci) => {
    const cref = rulesModule('classes').find((x) => x.name === k.name);
    if (!cref || !parsed) return;
    const classStart = out.length; // this class's entries (for a substitute ability or armor allowance below)
    const level = num(k.levels);
    // charLevel: the character's ("your hit point maximum increases by a number equal to your level").
    const ctx = { level, row: classRow(editedRaw, k), isWeapon: isWeaponName, charLevel: arr(editedRaw.classes).reduce((t, x) => t + num(x.levels), 0) };
    const aref = k.archetype && k.archetype.name ? rulesModule('archetypes').find((x) => x.name === k.archetype.name) : null;
    const items = clsTextFeatures(cref.classFeatureText, k.name, 'Class')
      .concat(aref ? clsTextFeatures(aref.text, aref.name, 'Archetype') : [])
      .filter((f) => f.level <= level)
      .map((f) => ({ name: f.name, text: f.text, note: featureNoteOf(editedRaw, f.name), source: f.sourceName, level: f.level }));
    const cls = parsed.classes[k.name];
    const arch = aref ? parsed.archetypes[aref.name] : null;
    for (const [listKey, picks] of Object.entries(k.options || {})) {
      const list = (cls && cls.lists.find((l) => l.key === listKey)) || (arch && arch.lists.find((l) => l.key === listKey));
      const options = list ? list.options.concat((arch && arch.extends[listKey]) || []) : [];
      const mods = /modifications$/i.test(listKey) ? chModInfo(aref, cref, k, level) : null;
      for (const p of arr(picks)) {
        const o = options.find((x) => x.name === p.name);
        if (!o) continue;
        // A modification's "+1 bonus to attack rolls made with this weapon" goes on the modified weapon.
        if (mods && mods.item) {
          const wb = chWeaponBenefits(clsScaleText(o.text, level));
          const wname = arr(k.modifiedItems)[p.item || 0];
          const widx = weaponIndexByName(editedRaw, wname);
          if ((wb.mods.length || wb.critRange) && widx != null) {
            out.push({
              id: `mod:${k.name}:${p.name}:${p.item || 0}`, kind: 'feature', name: p.name, why: `${listKey} (${wname})`, target: 'weapon', weaponIndex: widx,
              mods: wb.mods.map((x) => ({ ...x, label: `${p.name}: ${x.path === 'weapon.damage' ? 'damage' : 'attack'} +${x.bonus}` })), notes: [],
              critRange: wb.critRange, critWeapons: wb.critRange ? [widx] : null, weaponName: wname,
            });
          }
        }
        // Picks in an archetype's own list are read through its feature ("Hunter's Prey"), above. A modification's
        // sentences about the modified weapon ("with this weapon", its critical range) aren't the character's own.
        let text = mods && mods.item && mods.item !== 'armor' ? o.text.split(/(?<=\.)\s+/).filter((x) => !/\bthis weapon\b|\byour modified (?:weapon|lightsaber|lightweapon)\b|critical hit range/i.test(x)).join(' ') : o.text;
        // "While using your biochemist's pack as a tech focus, you gain a +1 bonus to tech attack rolls", "While wearing
        // your gadgeteer harness you have immunity to lightning damage", "While wielding your modified lightsaber, …":
        // only then. A modified item the sheet carries counts while equipped; otherwise the player says so (a
        // checkbox on the effect, itemState.inUse). Until then the bonus is shown as an alternative ("· +2 with your
        // biochemist's pack as a tech focus") and the defenses aren't counted.
        let inUse = null;
        if (mods) {
          const parts = text.split(/(?<=\.)\s+/);
          const condOf = (x) => /\bwhile (using your (?!body\b)([\w' ]+?) as a (?:tech|force) focus|(?:wearing|wielding) your (?!modified armor\b)([\w' ]+?))(?=,|\s+you\b)/i.exec(x);
          const cond = parts.map(condOf).find(Boolean);
          if (cond && !/^as an action\b/i.test(parts.find((x) => condOf(x)) || '')) {
            const label = cond[1].toLowerCase();
            const modified = arr(k.modifiedItems)[p.item || 0];
            const carried = /\bmodified\b/i.test(label) && modified ? arr(editedRaw.equipment).find((x) => x.name === modified) : null;
            const on = carried ? !!carried.equipped : !!featureInUse[label];
            inUse = { key: label, label, on, byItem: !!carried };
            // (with the sentences that go on from it: "This bonus increases to +2 at 9th level…")
            const inCond = parts.map((x, j) => !!condOf(x));
            for (let j = 1; j < parts.length; j++) if (!inCond[j] && inCond[j - 1] && /^(?:this bonus|additionally)\b/i.test(parts[j])) inCond[j] = true;
            items.push({ name: p.name, text: parts.filter((x, j) => inCond[j]).join(' '), note: optionNoteFitting(o, p.note || featureNoteOf(editedRaw, p.name)), source: listKey, inUse });
            text = parts.filter((x, j) => !inCond[j]).join(' ');
          }
        }
        // An armor modification works while the modified armor is worn ("While wearing your modified armor…"; its power
        // fists): not while it's only carried. (An item the sheet can't find: as before.)
        if (mods && mods.item === 'armor') {
          const it = arr(editedRaw.equipment).find((x) => x.name === arr(k.modifiedItems)[p.item || 0]);
          if (it && !it.equipped) continue;
        }
        // A pick of an archetype list that no feature shows as "#### <option>" (Totem Options): read by itself.
        const esc_ = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const viaFeature = items.some((it) => new RegExp(`^#{4,}\\s*${esc_(o.name)}\\s*$`, 'mi').test(it.text || ''));
        // Its choices: on the pick, or in the option card's notes and pickers (Vow of the Focused's ability).
        if (mods || !(arch && arch.lists.some((l) => l.key === listKey)) || !viaFeature) items.push({ name: p.name, text, note: optionNoteFitting(o, p.note || featureNoteOf(editedRaw, p.name)), source: listKey });
      }
      // "For each modification installed in excess of your proficiency bonus, your tech point maximum is reduced by 1."
      const pb = Math.ceil(arr(editedRaw.classes).reduce((t, x) => t + num(x.levels), 0) / 4) + 1;
      if (mods && mods.penalty && arr(picks).length > pb) {
        const n = arr(picks).length - pb;
        out.push({
          id: `mod:${k.name}:penalty`, kind: 'feature', name: `${listKey} beyond proficiency`, why: `${arr(picks).length} modifications installed`, target: 'self',
          mods: [{ path: 'techCasting.maxPoints', bonus: -n, label: `Tech points −${n}` }], notes: [],
        });
      }
    }
    // Multiclass improvements: "you gain 1 force point for each of your other chosen class's levels".
    for (const b of multiclassBoosts(editedRaw, k)) {
      for (const [type, n] of Object.entries(b.points)) {
        if (n) out.push({ id: `mcimp:${k.name}:${type}`, kind: 'feature', name: `Multiclass Improvement (${k.name})`, why: `${b.other} levels`, target: 'self', notes: [],
          mods: [{ path: `${type}Casting.maxPoints`, bonus: n, label: `${type === 'force' ? 'Force' : 'Tech'} points +${n}` }] });
      }
    }
    // The class's own weapon proficiencies (multiclass: its multiclass list): the engine only applies
    // plain ones like "simple blasters", not "martial vibroweapons with the finesse property".
    const weaponProfs = (ci === 0 ? clsJoinProfList(cref.weaponProficiencies) : clsJoinProfList(cref.multiClassProficiencies))
      .filter((p) => /blaster|vibroweapon|lightweapon|weapons/i.test(p));
    if (weaponProfs.length) {
      out.push({ id: `feature:${k.name}:weapons`, kind: 'feature', name: `${k.name} weapon proficiencies`, why: `${k.name} proficiencies`, mods: [], notes: [], weapons: weaponProfs, tools: [], target: 'self' });
    }
    for (const it of items) {
      if (!String(it.text || '').trim()) continue;
      const id = `feature:${it.source}:${it.name}${it.inUse ? ':in-use' : ''}${it.note ? `:${it.note}` : ''}`;
      if (out.some((x) => x.id === id)) continue;
      // featureLevel: the class level it came at ("…increases by 1 again whenever you gain a level in this class").
      const e = featureEffectEntry(id, it.name, `${it.source} feature`, clsFeatureEffects(it.text, it.note, { ...ctx, featureLevel: it.level }));
      if (e && it.inUse) {
        // Only while the item is in use: off, its numbers are alternatives and its defenses and advantages don't count.
        e.inUse = it.inUse;
        e.why = `${e.why}, ${it.inUse.on ? 'while' : 'only while'} ${it.inUse.label}`;
        if (!it.inUse.on) {
          e.mods = e.mods.map((x) => (x.cond ? x : { ...x, cond: `while ${it.inUse.label}` }));
          e.offDefenses = e.defenses;
          e.defenses = [];
          e.advantage = [];
        }
      }
      if (e) out.push(e);
    }
    // A substitute ability for this class's features ("You can substitute Strength, Constitution, or Intelligence … for
    // Wisdom or Charisma for your monk class features": Vow of the Focused) and armor some of them work in ("…the benefits
    // of your Martial Arts and Unarmored Movement features while wearing light or medium armor": Vow of the Sentry).
    // "You gain resistance to damage types for which you have a matching amplifier modification installed" (Elemental
    // Shielding): the types of the amplifiers picked ("Cryo Amplifier, Mk II": its base's "takes cold damage").
    const ampOpts = [...(cls ? cls.lists : []), ...(arch ? arch.lists : [])].flatMap((l) => l.options);
    const ampTypes = [...new Set(Object.values(k.options || {}).flat().map((p) => p && /^(.+? Amplifier)\b/i.exec(p.name || ''))
      .filter(Boolean).map((x) => (/\btakes (\w+) damage\b/i.exec((ampOpts.find((o) => o.name === x[1]) || {}).text || '') || [])[1]).filter(Boolean).map((x) => x.toLowerCase()))];
    for (let i = classStart; i < out.length; i++) {
      if (!arr(out[i].defenses).some((d) => /matching amplifier modification/i.test(d.text))) continue;
      out[i] = { ...out[i], defenses: out[i].defenses.map((d) => (/matching amplifier modification/i.test(d.text)
        ? { ...d, text: ampTypes.length ? `Resistance to ${ampTypes.join(', ')} damage (amplifiers installed)` : 'Resistance to the damage types of your amplifiers (none installed)' } : d)) };
    }
    const sub = out.slice(classStart).find((e) => e.substitute);
    const allow = out.slice(classStart).find((e) => e.armorAllows);
    for (let i = classStart; i < out.length && (sub || allow); i++) {
      let e = out[i];
      if (sub && e !== sub) {
        const swap = (x) => (x.abilityMod && [].concat(x.abilityMod).every((a) => sub.substitute.for.includes(a))
          ? { ...x, abilityMod: [].concat(x.abilityMod, sub.substitute.with), label: `${x.label.replace(/\+ ((?:[A-Z]{3}\/?)+)$/, (all, abs) => `+ ${abs}/${sub.substitute.with.slice(0, 3).toUpperCase()}`)} (${sub.name})` } : x);
        e = { ...e, mods: arr(e.mods).map(swap) };
      }
      if (allow && allow.armorAllows.features.some((f) => f.toLowerCase() === String(e.name).toLowerCase())) {
        e = { ...e, mods: arr(e.mods).map((x) => (x.when && x.when.noArmor ? { ...x, when: allow.armorAllows.when } : x)) };
      }
      out[i] = e;
    }
    // The class's tools ("Tinker's implements, one of your choice"): SW5E's calculation leaves them out. Tool Expertise
    // ("You gain expertise in any tool proficiencies you gain from this class"): those and the one picked for the class.
    if (ci === 0) {
      // Not the choices ("one of your choice", "Any one", "One specialist's kit of your choice"): those are picked.
      const fixedTools = arr(cref.toolProficiencies).filter((x) => !/\bchoice\b|^none$|^(?:any|one)\b/i.test(x));
      const expert = items.some((it) => /\byou gain expertise in any tool proficiencies you gain from this class\b/i.test(it.text || ''));
      const picked = arr(editedRaw.customProficiencies).filter((p) => p && /tool/i.test(p.type || '') && String(p.from || '').toLowerCase() === `class: ${k.name}`.toLowerCase()).map((p) => p.name);
      const tools = fixedTools.concat(expert ? picked : []).map((n) => ({ name: n, level: expert ? 'expertise' : 'proficient' }));
      if (tools.length) out.push({ id: `feature:${k.name}:tools`, kind: 'feature', origin: 'class feature', name: expert ? 'Tool Expertise' : `${k.name} tools`, why: `${k.name} proficiencies`, mods: [], notes: [], weapons: [], tools, target: 'self' });
    }
  });
  out.push(...bdFeatIncreaseEffects(editedRaw), ...bdSpeciesIncreaseEffects(editedRaw));
  // Feats' proficiencies and numbers ("You gain proficiency in the Insight skill", "Your speed increases by 10 feet"):
  // the engine applies none. Their ability increase is a pick (background.feat.abilityScoreImprovements, which the
  // engine applies, or bdFeatIncreaseEffects), so it's left out here.
  const featNames = [editedRaw.background && editedRaw.background.feat && editedRaw.background.feat.name]
    .concat(arr(editedRaw.classes).flatMap((k) => arr(k.abilityScoreImprovements).filter((a) => a && a.type === 'Feat').map((a) => a.name)), arr(editedRaw.customFeats))
    .filter(Boolean);
  for (const name of [...new Set(featNames)]) {
    const ref = rulesModule('feats').find((f) => f.name === name);
    if (!ref || !prIsFeat(ref)) continue; // a rules note picked as a feat ("Class Proficiencies") gives nothing
    const note = featureNoteOf(editedRaw, name);
    const fe = clsFeatureEffects(ref.text || '', note, { level: arr(editedRaw.classes).reduce((t, k) => t + num(k.levels), 0), isWeapon: isWeaponName });
    fe.mods = fe.mods.filter((x) => !/^abilityScores\.\w+\.score$/.test(x.path));
    const e = featureEffectEntry(`feat:${name}${note ? `:${note}` : ''}`, name, 'feat', fe, 'feat');
    if (e) out.push(e);
  }
  // Species traits: their proficiencies ("You have proficiency in the Survival skill"; Coercive's "Persuasion or
  // Intimidation (your choice)" from the trait's notes), numbers ("You have a +1 bonus to AC"; "you can't add more than
  // +3"), advantages (on the dice card), defenses and senses; SW5E's engine applies none of them. And the ones only a
  // species has, below: its walking speed, a hide's or carapace's AC, natural weapons (Toughness is read like Durable).
  const sp = editedRaw.species && editedRaw.species.name && state.rules ? bdSpeciesRef(editedRaw) : null; // a half-human's: with its other half's traits
  for (let tr of arr(sp && sp.traits)) {
    if (/^(?:Ability Score Increase|Age|Alignment|Size|Languages?)$/i.test(tr.name)) continue;
    const note = featureNoteOf(editedRaw, tr.name);
    // A trait with options (Nikto's Adaptation): clsFeatureEffects reads the chosen one; the rest below reads its text.
    const fe = clsFeatureEffects(bdTraitFullText(tr), note, { level: arr(editedRaw.classes).reduce((t, k) => t + num(k.levels), 0), isWeapon: isWeaponName });
    tr = { ...tr, description: bdTraitText(editedRaw, tr) };
    const profs = { ...fe, mods: fe.mods.slice(), critRange: 0, halfProf: false, unarmedStep: 0 };
    // "Your base walking speed is 25 feet": SW5E's engine gives everyone 30. (A half-human's: its other half's.)
    const walk = /\byour base walking speed is (\d+)/i.exec(tr.description || '');
    if (walk && num(walk[1]) !== 30) profs.mods.push({ path: 'speed.base', bonus: num(walk[1]) - 30, label: `Walking speed ${walk[1]} ft` });
    // "It gives you a base AC of 17 (your Dexterity modifier doesn't affect this number). You gain no benefit from wearing
    // armor, but if you are using a shield, you can apply the shield's bonus as normal" (Colicoid): resolved in applyEffects.
    const fixed = /\bbase AC of (\d+) \(your Dexterity modifier doesn't affect this number\)/i.exec(tr.description || '');
    if (fixed) profs.mods.push({ path: 'armorClass', bonus: 0, acFixed: num(fixed[1]), acFormula: true, label: `AC ${fixed[1]} (${tr.name})` });
    const e = featureEffectEntry(`species:${tr.name}${note ? `:${note}` : ''}`, tr.name, `${sp.name} trait`, profs, 'species trait');
    if (e) out.push(e);
  }
  return out;
}

/** What armor and shield the character has equipped (for "while you are not wearing armor"). */
function armorState(raw) {
  const st = { armor: false, heavy: false, shield: false, light: false, lightBase: 0 };
  for (const [i, it] of arr(raw.equipment).entries()) {
    if (!it.equipped) continue;
    const ref = catalogIndex && catalogIndex.get(it.name);
    if (!ref) continue;
    if (ref.equipmentCategory === 'Armor') {
      if (/shield/i.test(ref.armorClassification)) st.shield = true;
      else {
        st.armor = true;
        if (/heavy/i.test(ref.armorClassification)) st.heavy = true;
        // Light armor: its base AC ("11 + Dex modifier"), for "while unarmored or wearing light armor".
        if (/light/i.test(ref.armorClassification)) { st.light = true; st.lightBase = num(String(ref.ac || '').replace(/^\D*(\d+).*$/, '$1')); }
      }
    } else if (invBaseIndex(arr(raw.equipment), i) >= 0) continue; // its base item says what it is
    else if (ref.type === 'Armor') st.armor = true;
    else if (ref.type === 'Shield') st.shield = true;
  }
  for (const it of arr(raw.customEquipment)) if (it.equipped && it.equipmentCategory === 'Armor') { st.armor = true; st.light = false; }
  if (st.heavy) st.light = false;
  return st;
}
/**
 * A two-handed weapon and a shield both equipped (a shield takes a hand): { weapons: [name], shield: name } or null.
 * An enhanced weapon is two-handed when its base item is.
 */
function handsConflict(raw) {
  const on = arr(raw.equipment).filter((it) => it.equipped);
  const refOf = (it) => catalogIndex && catalogIndex.get(it.baseItem || it.name);
  const shield = on.find((it) => { const r = refOf(it); return r && ((r.equipmentCategory === 'Armor' && /shield/i.test(r.armorClassification || '')) || r.type === 'Shield'); });
  if (!shield) return null;
  const weapons = on.filter((it) => !it.enhancedBy).filter((it) => { const r = refOf(it); return r && r.equipmentCategory === 'Weapon' && /\btwo-handed\b/i.test(propsText(r.properties)); });
  return weapons.length ? { weapons: weapons.map((it) => it.label || it.name), shield: shield.label || shield.name } : null;
}
/** An AC "set to" tweak (tweaks.armorClass.override): the value, or null. Armor and shields don't change AC then. */
function acSetByTweak(raw) {
  const tw = (raw.tweaks || {}).armorClass;
  return tw && tw.override != null && tw.override !== '' ? num(tw.override) : null;
}
const handsWarning = (h) => `${h.weapons.join(' and ')} ${h.weapons.length > 1 ? 'are' : 'is'} two-handed and the ${h.shield} takes a hand: you can't attack with ${h.weapons.length > 1 ? 'them' : 'it'} while the shield is equipped.`;
const armorAllows = (when, st) => !when || ((!when.noArmor || !st.armor || (when.orLight && st.light)) && (!when.noShield || !st.shield) && (!when.noHeavy || !st.heavy)
  && (!when.armor || st.armor)); // `armor`: only while wearing armor (an armor modification's agile property)

/** The character with no tweaks at all: the baseline that every adjustment is explained against. */
// SW5E's engine adds the species' language only when the character records it, which its builder doesn't: fill it in.
function withSpeciesLanguage(raw) {
  const sp = raw.species;
  if (!sp || !sp.name || sp.language || !state.rules) return raw;
  const l = String((bdSpeciesRef(raw) || {}).language || ''); // a half-human: its non-human half's
  return l && !/varies|non-verbal/i.test(l) ? { ...raw, species: { ...sp, language: l } } : raw;
}
const stripTweaks = (raw) => ({ ...withSpeciesLanguage(raw), tweaks: {}, equipment: arr(raw.equipment).map(({ tweaks, ...it }) => it) });

/**
 * The edited character with all tweaks and active effects applied, the baseline without any,
 * and what was applied (tweaks, weaponTweaks, conds, effects).
 */
function applyEffects(key, editedRaw, complete) {
  const armor = armorState(editedRaw);
  // Mods aimed at "melee weapon attacks using Strength" (Rage) go to each such weapon and unarmed strikes.
  const weaponsFor = (f) => arr(complete && complete.weapons).filter((w) => (!f.ability || w.ability === f.ability)
    && (!f.melee || !/blaster/i.test(w.weaponClassification || ''))
    // Ranged: a blaster, or a "(range …)" property that isn't thrown (as the engine reads it); never the unarmed strike.
    && (!f.ranged || (w.name !== 'Unarmed Strike' && (/blaster/i.test(w.weaponClassification || '') || arr(w.properties).some((p) => /\(range /i.test(p) && !/^thrown/i.test(String(p).trim()))))));
  const expand = (e) => {
    const plain = arr(e.mods).filter((x) => !x.weaponFilter);
    const out = [{ ...e, mods: plain }];
    for (const x of arr(e.mods).filter((y) => y.weaponFilter)) {
      for (const w of weaponsFor(x.weaponFilter)) {
        const mod = { ...x, weaponFilter: undefined };
        if (w.name === 'Unarmed Strike') out.push({ ...e, mods: [{ ...mod, path: mod.path.replace(/^weapon\./, 'unarmed.') }], target: 'self' });
        else if (w.index != null) out.push({ ...e, mods: [mod], target: 'weapon', weaponIndex: w.index });
      }
    }
    return out;
  };
  // Mods that only work without armor (Unarmored Defense, subdermal armor) are dropped while it's worn.
  const listed = tweakEffects(key, editedRaw)
    .concat(featureEffects(key, editedRaw, complete))
    .concat(itemEffects(key, editedRaw, complete).filter((e) => e.active))
    .concat(tempEffects(key).map((e) => (e.target === 'weapon' ? { ...e, weaponIndex: weaponIndexByName(editedRaw, e.weaponName) }
      // Infused armor or shield: its AC only while it's worn (as an armor modification's).
      : infusedArmorOff(editedRaw, e) ? { ...e, mods: [] } : e)))
    .map((e) => (arr(e.mods).some((x) => x.when) ? { ...e, mods: e.mods.filter((x) => armorAllows(x.when, armor))
      // "13 + your Dexterity modifier" in light armor: what it adds over the armor's own base.
      .map((x) => (x.when && x.when.orLight && armor.armor && x.acBase ? { ...x, bonus: x.acBase - armor.lightBase } : x))
      .filter((x) => !(x.when && x.when.orLight && armor.armor && x.bonus <= 0)) } : e));
  // Effects with the same name don't stack (two Oscillation Calibrators on one vibrorapier, the same stim received twice,
  // two copies of an attuned item): the first applies, the others are listed as not stacking (res.notStacking), unless
  // the player applies one anyway (itemState.stackAnyway), as a repeated tweak is.
  const anyway = (state.itemState[key] && state.itemState[key].stackAnyway) || {};
  const notStacking = [];
  const firstOf = new Map();
  const kept = listed.filter((e) => {
    if (e.kind !== 'item' && e.kind !== 'temporary') return true;
    if (e.target === 'weapon' && e.weaponIndex == null) return true;
    const k = `${String(e.name || '').toLowerCase()}|${e.target === 'weapon' ? `w${e.weaponIndex}` : e.target || 'self'}`;
    const first = firstOf.get(k);
    if (!first) { firstOf.set(k, e); return true; }
    if (first.id === e.id) return true;
    notStacking.push({ id: e.id, name: e.name, of: first.id, kept: !!anyway[e.id], weaponIndex: e.target === 'weapon' ? e.weaponIndex : null });
    return !!anyway[e.id];
  });
  const effects = kept.flatMap(expand);
  // Ability scores before any tweak/effect: the engine's calculation of the character as edited now, without them (a
  // species changed a moment ago has its scores at once); without the engine's data, SW5E's baseline computation once
  // there is one, until then the sheet's scores less their tweak bonuses.
  const engine = engineCtx();
  const base = (engine && engineResult(engine, stripTweaks(editedRaw)).complete) || (state.derived[key] && state.derived[key].base);
  const scores = Object.fromEntries(ABILITIES.map((a) => {
    if (base && base.abilityScores) return [a, num((base.abilityScores[a] || {}).value)];
    const tw = getPath(editedRaw.tweaks || {}, `abilityScores.${a}.score`) || {};
    return [a, num((((complete && complete.abilityScores) || {})[a] || {}).value) - num(tw.bonus)];
  }));
  const res = fxResolve(effects, scores);
  res.notStacking = notStacking;
  // A tweak that sets a number ("set to", override) fixes it, whatever effects would do: theirs are kept aside
  // (res.setByTweak) and explained as such, not applied. Run again before the end for the effects added below.
  res.setByTweak = [];
  const setKey = (t, w) => `${w ? `#${t.index}:` : ''}${t.path}`;
  const keepAside = () => {
    // (A damage die's tweak sets the die by its dieSize; an override there means nothing to SW5E: not a "set to".)
    const sets = (t) => t.effect.kind === 'tweak' && t.fields && engHasOverride(t.fields) && !/damageDice$/.test(t.path);
    const set = new Set(res.tweaks.filter(sets).map((t) => setKey(t)).concat(res.weaponTweaks.filter(sets).map((t) => setKey(t, true))));
    const aside = (w) => (t) => t.effect.kind !== 'tweak' && set.has(setKey(t, w)) && res.setByTweak.push(t);
    res.tweaks = res.tweaks.filter((t) => !aside(false)(t));
    res.weaponTweaks = res.weaponTweaks.filter((t) => !aside(true)(t));
    if (set.has('armorClass')) res.acAlternatives = [];
  };
  keepAside();
  // Martial Arts (martialArtsOf): the unarmed strike's die and finesse like a species' natural weapons, while the armor
  // and shield allow it; the monk weapons' come after the weapon proficiencies, below.
  // A feature that lifts the armor condition for named features ("Your Martial Arts and Unarmored Movement work while
  // wearing light or medium armor", Vow of the Sentry: armorAllows) replaces Martial Arts' own.
  const lifted = (name) => (effects.find((e) => e.armorAllows && arr(e.armorAllows.features).some((f) => String(f).toLowerCase() === String(name).toLowerCase())) || {}).armorAllows;
  const martial = martialArtsOf(editedRaw).filter((x) => (lifted(x.name) ? armorAllows(lifted(x.name).when, armor)
    : !(x.ma.noArmor && armor.armor) && !(x.ma.noShield && armor.shield))).map((x) => {
    const size = num(String((x.ma.column && classRow(editedRaw, x.k)[x.ma.column]) || x.ma.die).replace(/^\d*d/i, ''));
    // The feature's own effect when it has one (Ideal of the Contender: its unarmed die step), else a new one.
    const at = effects.findIndex((y) => y.kind === 'feature' && y.name === x.name && y.target === 'self' && !y.unarmedDie);
    const e = at >= 0 ? { ...effects[at], unarmedDie: size, unarmedFinesse: x.ma.finesse }
      : { id: x.id, kind: 'feature', origin: 'class feature', name: x.name, why: `${x.from || x.k.name} feature`, target: 'self', mods: [], notes: [], unarmedDie: size, unarmedFinesse: x.ma.finesse };
    if (at >= 0) effects[at] = e; else effects.push(e);
    return { ...x, e, size };
  });
  // The final scores, as the engine will have them: a tweak's "set to" is the score (the effects on it are kept aside, and
  // SW5E ignores a bonus beside it), its "bump to" raises the score with everything else to at least that.
  const final = { ...scores };
  const fixed = new Set();
  const floors = {};
  for (const t of res.tweaks) {
    const x = /^abilityScores\.(\w+)\.score$/.exec(t.path);
    if (!x) continue;
    if (t.fields && engHasOverride(t.fields)) { final[x[1]] = num(t.fields.override); fixed.add(x[1]); continue; }
    if (!fixed.has(x[1])) final[x[1]] = num(final[x[1]]) + num(t.bonus);
    if (t.fields && engHasFloor(t.fields)) floors[x[1]] = Math.max(num(floors[x[1]]), num(t.fields.floor));
  }
  for (const [a, n] of Object.entries(floors)) if (!fixed.has(a)) final[a] = Math.max(num(final[a]), n);
  const modOf = (a) => Math.floor(((Number(final[a]) || 10) - 10) / 2);
  // "AC equals 10 + your Dexterity modifier + your Wisdom or Charisma modifier": the modifier of the final score, after
  // items, Perfect Self and temporary effects (fxResolve only knows the scores of the effects before it). The best AC
  // formula is picked again with them.
  // "A base AC of 17 (your Dexterity modifier doesn't affect this number). You gain no benefit from wearing armor, but…
  // a shield's bonus as normal" (a Colicoid's carapace): 17 and the shield, in place of what armor or Dexterity give.
  const shieldBonus = arr(editedRaw.equipment).filter((it) => it.equipped).map((it) => catalogIndex && catalogIndex.get(it.name))
    .filter((r) => r && r.equipmentCategory === 'Armor' && /shield/i.test(r.armorClassification || '')).reduce((t, r) => t + num(String(r.ac || '').replace(/[^\d-]/g, '')), 0);
  const withMod = (t) => {
    // "You can't add more than +3 … from your Dexterity": what the final modifier adds over the cap.
    if (t.mod.capAbility) return { ...t, bonus: -Math.max(0, modOf(t.mod.capAbility) - num(t.mod.capAt)) };
    // "…use your Intelligence modifier instead of your Dexterity modifier when determining your AC": the better one (in medium
    // armor both count up to +2). "Your base AC becomes 13 + your Constitution modifier": over 10 + Dexterity.
    if (t.mod.acSwap) {
      const medium = armor.armor && !armor.light && !armor.heavy;
      const cap = (n) => (medium ? Math.min(n, 2) : n);
      return { ...t, bonus: Math.max(0, cap(Math.max(...[].concat(t.mod.acSwap.to).map(modOf))) - cap(modOf(t.mod.acSwap.from))) };
    }
    if (t.mod.acFrom) return { ...t, bonus: num(t.mod.acFrom.base) - 10 + modOf(t.mod.acFrom.ability) - modOf('Dexterity') };
    if (t.mod.acFixed && base) return { ...t, bonus: num(t.mod.acFixed) - (num(base.armorClass) - shieldBonus) };
    if (!t.mod.abilityMod) return t;
    let b = (t.mod.lowest ? Math.min : Math.max)(...[].concat(t.mod.abilityMod).map(modOf));
    if (t.mod.abilityHalf) b = Math.floor(b / 2); // "half your Charisma modifier\"
    if (t.mod.min != null) b = Math.max(b, t.mod.min);
    return { ...t, bonus: b };
  };
  const formulas = res.tweaks.filter((t) => t.mod.acFormula).concat(arr(res.acAlternatives)).map(withMod);
  const bestAc = formulas.reduce((a, b) => (!a || b.bonus > a.bonus ? b : a), null);
  const takesOff = (t) => !t.mod.capAbility || t.bonus;
  res.tweaks = res.tweaks.map((t) => (t.mod.acFormula ? bestAc : withMod(t))).filter(takesOff);
  res.weaponTweaks = res.weaponTweaks.map((t) => (t.mod.capAbility ? withMod(t) : t)).filter(takesOff);
  res.acAlternatives = formulas.filter((t) => t !== bestAc);
  // "You ignore the strength property of heavy armor" (Gank): the engine slows by 10 ft for worn armor whose Strength
  // number is above the score; taken back.
  const ignores = effects.find((e) => e.ignoreArmorStrength);
  if (ignores) {
    const tooStrong = arr(editedRaw.equipment).some((it) => {
      const ref = it.equipped && catalogIndex && catalogIndex.get(it.name);
      const need = ref && ref.equipmentCategory === 'Armor' && /heavy/i.test(ref.armorClassification || '') ? /\bstrength (\d+)/i.exec(propsText(ref.properties)) : null;
      return need && num(final.Strength) < num(need[1]);
    });
    if (tooStrong) res.tweaks.push({ path: 'speed.base', bonus: 10, fields: null, effect: ignores, mod: { path: 'speed.base', label: 'Speed +10 ft (ignores heavy armor\'s Strength)' } });
  }
  // "You have a number of tech points equal to half of your berserker level, as shown in the Tech Points column of the
  // Industrial Approach Techcasting table, + your Intelligence modifier": SW5E's engine reads an archetype's points only
  // for third-casters, so a sixth-caster's (Industrial Approach) are added here, with SW5E's "at least 1 point".
  for (const kind of ['force', 'tech']) {
    const cast = complete && complete[`${kind}Casting`];
    if (!cast || typeof cast !== 'object') continue;
    const Word = kind === 'force' ? 'Force' : 'Tech';
    let table = 0;
    const dropped = [];
    for (const k of arr(editedRaw.classes)) {
      const lv = num(k.levels);
      const cref = rulesModule('classes').find((x) => x.name === k.name);
      if (cref && cref.casterType === Word && num(cref.casterRatio) > 0) table += num(((cref.levelChanges || {})[String(Math.max(1, Math.min(20, lv)))] || {})[`${Word} Points`]);
      const aref = k.archetype && k.archetype.name ? rulesModule('archetypes').find((x) => x.name === k.archetype.name) : null;
      if (!aref || aref.casterType !== Word || !(num(aref.casterRatio) > 0)) continue;
      const pts = num(engArchetypeRow(aref, lv)[`${Word} Points`]);
      if (Math.abs(num(aref.casterRatio) - 1 / 3) < 0.01) table += pts;
      else if (pts) dropped.push({ name: aref.name, pts });
    }
    if (!dropped.length) continue;
    const m0 = kind === 'tech' ? modOf('Intelligence') : Math.max(modOf('Wisdom'), modOf('Charisma'));
    const all = dropped.reduce((t, d) => t + d.pts, 0);
    const g = Math.max(1, table + all + m0) - Math.max(1, table + m0);
    if (g <= 0) continue;
    const mod = { path: `${kind}Casting.maxPoints`, bonus: g, label: `${Word} points from the ${dropped.map((d) => d.name).join(' and ')} table +${g}` };
    const e = { id: `archpoints:${kind}`, kind: 'feature', origin: 'class feature', name: dropped.map((d) => d.name).join(', '), why: `${Word.toLowerCase()} points (SW5E's engine leaves them out)`, target: 'self', notes: [], mods: [mod] };
    effects.push(e);
    res.tweaks.push({ path: mod.path, bonus: g, fields: null, effect: e, mod });
  }
  // Feats that change the casting ability (castingSwaps): what SW5E's numbers gain with it, from the final scores. "You
  // can use Intelligence instead of the chosen ability": the better of the two, for the powers and points that use it.
  for (const sw of castingSwaps(editedRaw)) {
    const cast = complete && complete[`${sw.kind}Casting`];
    if (!cast || typeof cast !== 'object') continue;
    const e = { id: `castswap:${sw.name}`, kind: 'feature', origin: 'feat', name: sw.name, why: 'feat (casting ability)', target: 'self', notes: [], mods: [],
      needsChoice: sw.chosen || sw.viaInc ? [] : [`one of ${sw.options.join(', ')} (the casting ability it replaces)`] };
    effects.push(e);
    if (!sw.chosen) continue;
    const bestMod = (list) => Math.max(...list.map(modOf));
    const keys = sw.kind === 'tech' ? { tech: ['Intelligence'] } : { light: ['Wisdom'], dark: ['Charisma'], universal: ['Wisdom', 'Charisma'] };
    const gainOf = (list) => (list.includes(sw.from) ? bestMod(list.concat(sw.to)) - bestMod(list) : 0);
    const word = sw.kind === 'tech' ? 'Tech' : 'Force';
    const add = (path, g, what) => {
      if (g <= 0) return;
      const mod = { path, bonus: g, label: `${what}, ${ABBR[sw.to]} instead of ${ABBR[sw.from]} +${g}` };
      e.mods.push(mod);
      res.tweaks.push({ path, bonus: g, fields: null, effect: e, mod });
    };
    for (const [k, list] of Object.entries(keys)) {
      const g = gainOf(list);
      const pre = sw.kind === 'tech' ? 'techCasting.' : `forceCasting.${k}`;
      const name = sw.kind === 'tech' ? 'Tech' : `${titleCase(k)} force`;
      add(sw.kind === 'tech' ? `${pre}attackModifier` : `${pre}AttackModifier`, g, `${name} attack`);
      add(sw.kind === 'tech' ? `${pre}saveDC` : `${pre}SaveDC`, g, `${name} save DC`);
    }
    if (sw.points) add(`${sw.kind}Casting.maxPoints`, gainOf(sw.kind === 'tech' ? ['Intelligence'] : ['Wisdom', 'Charisma']), `${word} points`);
  }
  // Weapon proficiencies from class lists and features: each carried weapon they describe.
  for (const e of effects) {
    // The description naming the weapon itself first ("blaster rifles" for a Blaster rifle, before "blaster pistols"), so
    // the explanation names the right one.
    const named = (d) => arr(editedRaw.equipment).some((it) => [it.name.toLowerCase(), `${it.name.toLowerCase()}s`].includes(String(d).toLowerCase().trim()));
    for (const desc of arr(e.weapons).slice().sort((a, b) => named(b) - named(a))) {
      arr(editedRaw.equipment).forEach((it, i) => {
        const ref = it.category === 'Equipment' && catalogIndex && catalogIndex.get(it.name);
        // Where SW5E's calculation is already proficient (its own list covers the weapon), it's no change: not explained as one.
        const already = ref && arr(complete && complete.proficiencies).some((p) => p && /weapon|other/.test(p.type || '') && engWeaponCovered(p.name, ref));
        if (ref && ref.equipmentCategory === 'Weapon' && clsWeaponMatches(desc, ref) && !res.weaponTweaks.some((t) => t.index === i && t.fields && t.fields.proficiency)) {
          res.weaponTweaks.push({ index: i, path: 'toHit', bonus: 0, fields: { proficiency: 'proficient' }, effect: e, mod: { path: 'weapon.toHit', label: `Proficient: ${desc}`, already } });
        }
      });
    }
  }
  // Martial Arts on monk weapons ("vibroweapons with which you are proficient that lack the dexterity, heavy, special,
  // and two-handed properties"): its die in place of a smaller one, and Dexterity where it's better (finesse).
  const abilityFor = {}; // weapon index → [{ a: ability it can use, e: the effect, finesse }]
  // Monk weapons a feature names (weaponKindsOf: Echani, Whills weapons) count while Martial Arts does (its armor
  // condition); proficiency comes with them ("You gain proficiency with these weapons").
  const kinds = martial.length ? weaponKindsOf(editedRaw) : [];
  const ofKind = (it) => kinds.filter((x) => x.names.some((n) => invSameName(n, it.name) || invSameName(n, it.label || '') || invSameName(n.replace(/s$/, ''), it.name)));
  for (const x of martial.filter((y) => y.ma.weapons)) {
    const profs = arr(complete && complete.proficiencies).filter((p) => p && /weapon|other/.test(p.type || '')).map((p) => p.name)
      .concat(effects.flatMap((e) => arr(e.weapons)));
    arr(editedRaw.equipment).forEach((it, i) => {
      const ref = it.category === 'Equipment' && catalogIndex && catalogIndex.get(it.name);
      const named = ofKind(it);
      if (!ref || ref.equipmentCategory !== 'Weapon' || !(clsWeaponMatches(x.ma.weapons.desc, ref) || named.some((k) => k.monk))) return;
      if (named.some((k) => k.prof) && !res.weaponTweaks.some((t) => t.index === i && t.fields && t.fields.proficiency)) {
        const k = named.find((y) => y.prof);
        res.weaponTweaks.push({ index: i, path: 'toHit', bonus: 0, fields: { proficiency: 'proficient' }, effect: x.e, mod: { path: 'weapon.toHit', label: `Proficient: ${k.kind} weapon (${k.name})` } });
      }
      const proficient = profs.some((d) => clsWeaponMatches(d, ref)) || res.weaponTweaks.some((t) => t.index === i && t.fields && t.fields.proficiency);
      if (!proficient) return;
      if (num(ref.damageNumberOfDice) <= 1 && x.size > num(ref.damageDieType) && !res.weaponTweaks.some((t) => t.index === i && t.path === 'damageDice')) {
        res.weaponTweaks.push({ index: i, path: 'damageDice', bonus: 0, fields: { dieSize: x.size }, effect: x.e, mod: { path: 'weapon.damageDice', label: `${x.name} die (in place of d${num(ref.damageDieType)})` } });
      }
      if (x.ma.finesse) (abilityFor[i] = abilityFor[i] || []).push({ a: 'Dexterity', e: x.e, finesse: true });
    });
  }
  // Attacks that can use another ability (attackGrantsOf): "Weapons that lack the two-handed or special properties are
  // considered to have the finesse property for you" (Blinding Agility), "You can use your choice of Wisdom or Charisma
  // instead of Strength or Dexterity for the attack and damage rolls of your unarmed strikes and monk weapons" (Vow of
  // Spirit), "… for the attack and damage rolls" of a bonded weapon named in the notes (Forceblade Bond).
  const grants = attackGrantsOf(editedRaw).map((g) => {
    const e = { id: g.id, kind: 'feature', name: g.name, why: g.why, target: 'self', mods: [], notes: [] };
    effects.push(e);
    return { ...g, e };
  });
  const monkDesc = martial.map((x) => x.ma.weapons && x.ma.weapons.desc).filter(Boolean);
  arr(editedRaw.equipment).forEach((it, i) => {
    const ref = it.category === 'Equipment' && catalogIndex && catalogIndex.get(it.name);
    if (!ref || ref.equipmentCategory !== 'Weapon') return;
    const ranged = /blaster/i.test(ref.weaponClassification || '') || arr(ref.properties).some((p) => /\(range /i.test(p) && !/^thrown/i.test(p));
    for (const g of grants) {
      const t = g.target;
      const fits = (t.lacking && clsWeaponMatches(`weapons that lack the ${t.lacking} properties`, ref)) || (t.melee && !ranged)
        || (t.monk && (monkDesc.some((d) => clsWeaponMatches(d, ref)) || ofKind(it).some((k) => k.monk))) || arr(t.names).some((n) => invSameName(n, it.name) || invSameName(n, it.label || ''));
      if (fits) for (const a of g.abilities) (abilityFor[i] = abilityFor[i] || []).push({ a, e: g.e, finesse: g.finesse });
    }
  });
  // "You gain a +2 bonus to AC until the start of your next turn, while the weapon is in your hand" (Agile Parry): shown
  // next to AC as an alternative, not applied.
  for (const f of featureTextsOf(editedRaw)) {
    let sub = ''; // the option it's under ("#### Agile Parry If you make an unarmed strike …")
    for (const s0 of String(f.text).replace(/\s+/g, ' ').split(/(?<=\.)\s+(?=[-A-Z_*#])/)) {
      if (/^#{4,}\s/.test(s0) && typeof headingOf === 'function') sub = headingOf(s0);
      // "While you are concentrating on a Force power, you have a +2 bonus to your AC and all saving throws" (Enduring Focus).
      const w = /^(?:[-#*_ ]*[A-Z][\w'’ -]+?\s+)?While you are ([^,]+), you have a \+(\d+) bonus to your AC\b/.exec(s0);
      // "While wielding your modified lightsaber, you gain a +1 bonus to your armor class against melee weapon attacks"
      // (Crossguard, an Artificer modification picked).
      // Only with the modified weapon equipped ("while wielding").
      const modifiedOn = arr(editedRaw.classes).flatMap((k) => arr(k.modifiedItems)).some((n) => arr(editedRaw.equipment).some((it) => it.equipped && invSameName(n, it.name)));
      if (!modifiedOn && /\bWhile wielding your modified \w+, you gain a \+\d+ bonus to your armor class/i.test(s0)) continue;
      const v = /\bWhile wielding your modified \w+, you gain a \+(\d+) bonus to your armor class against melee weapon attacks/i.exec(s0);
      const x = v ? [v[0], v[1]] : w ? [w[0], w[2]] : /^(?:[^.]*?\s)?You gain a \+(\d+) bonus to AC until the start of your next turn\b/.exec(s0);
      if (!x || /\bfor each\b/i.test(s0)) continue;
      const name = sub || f.name;
      const cond = v ? 'vs melee' : w ? `while ${w[1].replace(/ on an? (?:Force|force|tech) power$/, '')}` : name;
      const e = { id: `ac-alt:${name}`, kind: 'feature', name, why: f.k ? `${f.from || f.k.name} feature` : 'feat', target: 'self', mods: [], notes: [] };
      res.conds.push({ path: 'armorClass', bonus: num(x[1]), cond, ammo: null, weaponIndex: null, effect: e, mod: { path: 'armorClass', bonus: num(x[1]), label: `AC +${x[1]}`, cond } });
    }
  }
  // "If you are already proficient with medium armor, instead while you are wearing medium armor, you can add 3, rather
  // than 2, to your AC if you have a Dexterity of 16 or higher" / "… with light armor, instead while you are wearing light
  // armor, your speed increases by 5 feet" (Armor Expert): already proficient = SW5E's list (class, background), not the
  // feat's own grant.
  const armorProfs = arr(complete && complete.proficiencies).filter((p) => p && p.type === 'armor').map((p) => String(p.name).toLowerCase());
  for (const f of featureTextsOf(editedRaw)) {
    const t = String(f.text).replace(/\s+/g, ' ');
    const e = { id: `armor-expert:${f.name}`, kind: 'feature', name: f.name, why: f.k ? `${f.k.name} feature` : 'feat', target: 'self', mods: [], notes: [] };
    const has = (k) => armorProfs.some((p) => p.includes(`${k} armor`) || p === 'all armor');
    let x;
    if ((x = /If you are already proficient with medium armor, instead while you are wearing medium armor, you can add 3, rather than 2, to your AC if you have a Dexterity of (\d+) or higher/i.exec(t))
      && has('medium') && armor.armor && !armor.light && !armor.heavy && num(final.Dexterity) >= num(x[1]) && modOf('Dexterity') >= 3) {
      const mod = { path: 'armorClass', bonus: 1, label: 'AC: DEX up to +3 in medium armor' };
      e.mods.push(mod);
      res.tweaks.push({ path: 'armorClass', bonus: 1, fields: null, effect: e, mod });
    }
    if (/If you are already proficient with light armor, instead while you are wearing light armor, your speed increases by 5 feet/i.test(t) && has('light') && armor.light) {
      const mod = { path: 'speed.base', bonus: 5, label: 'Speed +5 ft in light armor' };
      e.mods.push(mod);
      res.tweaks.push({ path: 'speed.base', bonus: 5, fields: null, effect: e, mod });
    }
    if (e.mods.length) effects.push(e);
  }
  // Each weapon with the best of them, where better than the ability SW5E uses: the difference on attack and damage.
  for (const [i, list] of Object.entries(abilityFor)) {
    const w = arr(complete && complete.weapons).find((y) => y.index === Number(i));
    if (!w || !w.ability) continue;
    const best = list.reduce((b, x) => (modOf(x.a) > modOf(b.a) ? x : b), { a: w.ability });
    const gain = modOf(best.a) - modOf(w.ability);
    if (!best.e || gain <= 0) continue;
    const label = `${best.finesse ? 'Finesse: ' : ''}${ABBR[best.a]} ${signed(modOf(best.a))} instead of ${ABBR[w.ability]} ${signed(modOf(w.ability))}`;
    for (const path of ['toHit', 'damage']) res.weaponTweaks.push({ index: Number(i), path, bonus: gain, fields: null, effect: best.e, mod: { path: `weapon.${path}`, label, finesse: !!best.finesse, ability: best.a } });
  }
  // Tool proficiencies from features (with "choose" picks from notes).
  res.tools = effects.flatMap((e) => arr(e.tools).map((t) => ({ ...t, effect: e })));
  // "Your unarmed strike damage increases by one step" (from SW5E's die: 1 → d4 → d6 → d8 → d10 → d12).
  const seen = new Set();
  const once = (e) => !seen.has(e.id) && seen.add(e.id);
  const unarmed = arr(complete && complete.weapons).find((w) => w.name === 'Unarmed Strike');
  // SW5E's unarmed die comes from a tweak alone (unarmed.damageDice): the tweaks as they are now, not a calculation that
  // may still have one just removed.
  const tweakDie = res.tweaks.filter((t) => t.path === 'unarmed.damageDice' && t.fields && t.fields.dieSize).reduce((d, t) => Math.max(d, num(t.fields.dieSize)), 0);
  // Steps from several features add up (Brawler Style and Mastery: 1 → d4 → d6).
  const stepping = effects.filter((x) => x.unarmedStep && once(x));
  // A species' natural weapons: "Your unarmed strikes deal 1d4 kinetic damage and have the finesse property".
  const natural = effects.filter((x) => num(x.unarmedDie) > 0);
  const natDie = natural.reduce((d, x) => Math.max(d, num(x.unarmedDie)), 0);
  const steps = [0, 4, 6, 8, 10, 12];
  if (stepping.length) {
    const cur = Math.max(0, steps.indexOf(Math.max(tweakDie, natDie)));
    const die = steps[Math.min(steps.length - 1, cur + stepping.reduce((t, e) => t + num(e.unarmedStep), 0))];
    const was = steps[cur] ? `d${steps[cur]}` : '1';
    for (const e of stepping) res.tweaks.push({ path: 'unarmed.damageDice', bonus: 0, fields: { dieSize: die }, effect: e, mod: { path: 'unarmed.damageDice', label: `Unarmed damage up a step (${was} → d${die})` } });
  } else if (natDie > tweakDie) {
    const e = natural.find((x) => num(x.unarmedDie) === natDie);
    res.tweaks.push({ path: 'unarmed.damageDice', bonus: 0, fields: { dieSize: natDie }, effect: e, mod: { path: 'unarmed.damageDice', label: `Unarmed damage die (${tweakDie ? `d${tweakDie}` : '1'} → d${natDie})` } });
  }
  // The unarmed strike's ability: Dexterity with finesse (a species' natural weapons, Martial Arts, Ideal of the
  // Contender), the abilities features allow (Vow of Spirit's Wisdom or Charisma), the best of them over SW5E's Strength.
  const unarmedCan = effects.filter((x) => x.unarmedFinesse).map((e) => ({ a: 'Dexterity', e, finesse: true }))
    .concat(grants.filter((g) => g.target.unarmed || g.target.melee).flatMap((g) => g.abilities.map((a) => ({ a, e: g.e, finesse: g.finesse }))))
    // An item you make unarmed strikes with: "You can use your choice of Strength or Intelligence for the attack and damage
    // rolls" (Shock Arm).
    .concat(effects.filter((e) => e.kind === 'item' && e.unarmedDie).flatMap((e) => {
      const ref = catalogIndex && catalogIndex.get(e.name);
      const x = /You can use your choice of (\w+) or (\w+)(?: modifier)? for the attack and damage rolls/i.exec(String((ref && (ref.text || ref.description)) || ''));
      return x ? [x[1], x[2]].filter((a) => ABBR[a]).map((a) => ({ a, e })) : [];
    }));
  if (unarmedCan.length && unarmed) {
    // From the final scores (a belt that makes Strength 21 ends the gain), not the last calculation.
    const mod = modOf;
    const ab = unarmed.ability || 'Strength';
    const best = unarmedCan.reduce((b, x) => (mod(x.a) > mod(b.a) ? x : b), { a: ab });
    // SW5E's engine adds no negative modifier to unarmed damage (Strength −1: d4 + 0), but does to the attack.
    const gain = { 'unarmed.toHit': mod(best.a) - mod(ab), 'unarmed.damage': mod(best.a) - Math.max(0, mod(ab)) };
    const label = `${best.finesse ? 'Finesse: ' : ''}${ABBR[best.a]} ${signed(mod(best.a))} instead of ${ab.slice(0, 3).toUpperCase()} ${signed(mod(ab))}`;
    if (best.e) for (const path of Object.keys(gain)) if (gain[path] > 0) res.tweaks.push({ path, bonus: gain[path], fields: null, effect: best.e, mod: { path, label, finesse: !!best.finesse, ability: best.a } });
  }
  // With a damage die the unarmed strike deals "the die + your Strength modifier": SW5E's engine (which ours mirrors)
  // drops a negative modifier there (its floor at 0 suits the dieless 1 + Strength). The sheet puts it back.
  const dieNow = res.tweaks.filter((t) => t.path === 'unarmed.damageDice' && t.fields && t.fields.dieSize).reduce((d, t) => Math.max(d, num(t.fields.dieSize)), 0);
  const ownAb = (unarmed && unarmed.ability) || 'Strength';
  if (unarmed && dieNow && modOf(ownAb) < 0 && !res.tweaks.some((t) => t.path === 'unarmed.damage' && t.mod && (t.mod.finesse || t.mod.ability))) {
    const e = { id: 'unarmed:negative', kind: 'feature', name: `${ABBR[ownAb]} modifier`, why: 'with a damage die (rules)', target: 'self', mods: [], notes: [] };
    res.tweaks.push({ path: 'unarmed.damage', bonus: modOf(ownAb), fields: null, effect: e, mod: { path: 'unarmed.damage', label: `${ABBR[ownAb]} modifier with a damage die` } });
  }
  // "Add half your proficiency bonus to any ability check that doesn't already include it": skills
  // without proficiency and initiative (plain ability checks get it in the roller).
  // Some give it on checks of some abilities only (halfProf lists them: Remarkable Athlete, Cunning Intellect).
  const halfFor = (a) => effects.find((x) => x.halfProf === true || (Array.isArray(x.halfProf) && x.halfProf.includes(a)));
  if (effects.some((x) => x.halfProf)) {
    const n = Math.floor(num(complete && complete.proficiencyBonus) / 2);
    const label = `Half proficiency ${signedLabel(n)}`;
    if (n && halfFor('Dexterity')) res.tweaks.push({ path: 'initiative', bonus: n, fields: null, effect: halfFor('Dexterity'), mod: { path: 'initiative', label } });
    for (const a of ABILITIES) {
      const half = halfFor(a);
      if (!half) continue;
      for (const sk of arr((((complete && complete.abilityScores) || {})[a] || {}).skills)) {
        const path = `abilityScores.${a}.skills.${sk.name}`;
        const profd = PROF_RANK(sk.proficiency) > 0 || res.tweaks.some((t) => t.path === path && t.fields && PROF_RANK(t.fields.proficiency) > 0);
        if (n && !profd) res.tweaks.push({ path, bonus: n, fields: null, effect: half, mod: { path, label } });
      }
    }
  }
  const baseRaw = stripTweaks(editedRaw);
  const out = { ...baseRaw, tweaks: {}, equipment: clone(baseRaw.equipment) };
  // Effects added since (finesse, half proficiency, casting swaps…) on a number a tweak sets: aside too. Bonuses add up
  // with a tweak's "bump to" (the engine takes the larger of the sum and the floor).
  keepAside();
  const merged = (cur, t, fields) => ({ ...cur, ...fields, bonus: num(cur.bonus) + num(t.bonus) });
  for (const t of res.tweaks) {
    // Power damage/healing bonuses (the dice card adds them) and the attunement maximum (attunementMax): no engine tweak.
    if (/^(?:(?:force|tech)Powers|attunement)\./.test(t.path)) continue;
    const cur = getPath(out.tweaks, t.path) || {};
    const fields = { ...(t.fields || {}) };
    // Proficiency never goes down (a feature's "proficient" doesn't undo a tweak's "expertise").
    if (fields.proficiency && PROF_RANK(cur.proficiency) > PROF_RANK(fields.proficiency)) delete fields.proficiency;
    setDeep(out.tweaks, t.path, merged(cur, t, fields));
  }
  for (const t of res.weaponTweaks) {
    const it = out.equipment[t.index];
    if (!it) continue;
    it.tweaks = { ...(it.tweaks || {}) };
    it.tweaks[t.path] = merged(it.tweaks[t.path] || {}, t, { ...(t.fields || {}) });
  }
  return { raw: out, baseRaw, ...res, effects, scores: final };
}

// ------------------------------------------------------------- the sheet's own rules engine
// engine.js computes a character the way SW5E's engine on sw5e.com does (checked against it: dev/engine-check.js),
// from the cached rules and item data: numbers update at once and need no sw5e.com. Until both are cached (the
// first run fetches them from sw5e.com), sw5e.com computes. A character loaded from sw5e.com comes with SW5E's own
// calculation, which the sheet compares with the engine's (engineCheckOf, shown under Settings, Tweaks & Data).
function engineCtx() {
  const items = state.catalog && state.catalog.items;
  if (!state.rules || !state.rules.modules || !Array.isArray(items) || typeof engContext !== 'function') return null;
  if (engineCtx.rules !== state.rules || engineCtx.items !== items) {
    Object.assign(engineCtx, { rules: state.rules, items, ctx: engContext({ rules: state.rules.modules, catalog: items }), memo: new Map() });
  }
  return engineCtx.ctx;
}
/** The engine's result for a character (as the bridge returns it), remembered for the same character data. */
function engineResult(ctx, raw) {
  const basis = canonical(raw);
  const memo = engineCtx.memo;
  if (!memo.has(basis)) {
    if (memo.size > 40) memo.delete(memo.keys().next().value);
    memo.set(basis, engComputeCharacter(JSON.parse(basis), ctx));
  }
  return memo.get(basis);
}
/** Computes characters: with the sheet's engine when it has the data, else on sw5e.com. Like computeWithSw5e. */
async function computeCharacters(raws, opts) {
  const ctx = engineCtx();
  if (!ctx) return computeWithSw5e(raws, opts);
  return { characters: raws.map((raw) => engComputeCharacter(clone(raw), ctx)), meta: { engine: true, dataVersion: state.rules.dataVersion, extractedAt: Date.now() } };
}
/** The calculation with the character's edits and effects, by the engine: kept like sw5e.com's (state.derived). */
function engineDerived(key, fx, ctx) {
  const basis = basisOf(fx.raw);
  const had = state.derived[key];
  if (had && had.engine && had.basis === basis) return had;
  const r = engineResult(ctx, fx.raw);
  if (!r.complete) return null;
  const d = {
    basis, complete: r.complete, base: fx.effects.length ? engineResult(ctx, fx.baseRaw).complete : null,
    refs: r.refs, validation: r.validation, error: r.error, at: Date.now(), engine: true,
  };
  state.derived[key] = d;
  clearTimeout(engineDerived.save);
  engineDerived.save = setTimeout(() => saveDerived().catch(() => {}), 1000);
  return d;
}
/** SW5E's own calculation of a character against the engine's: { at, compared, differences }, or null. */
function engineCheckOf(raw, sw5eComplete, ctx) {
  if (!ctx || !sw5eComplete) return null;
  const own = engineResult(ctx, raw).complete;
  if (!own) return null;
  const r = engCheckAgainst(sw5eComplete, own);
  return { at: Date.now(), compared: r.compared, differences: r.differences.slice(0, 50), more: Math.max(0, r.differences.length - 50) };
}

/**
 * Class and archetype features (and picked class options) with Martial Arts' wording (clsMartialArts), for the levels
 * reached: [{ id, name, k (the class), ma }]. Cached for the same classes.
 */
function martialArtsOf(editedRaw) {
  if (typeof clsMartialArts !== 'function') return [];
  return featureTextsOf(editedRaw).filter((f) => f.k).map((f) => ({ id: `martial:${f.k.name}:${f.name}`, name: f.name, k: f.k, from: f.from, ma: clsMartialArts(f.text) })).filter((x) => x.ma);
}
/**
 * The texts of the character's class and archetype features (the levels reached), picked class options and feats:
 * [{ name, text, k (the class; none for a feat), note }]. Cached for the same classes, feats and notes.
 */
function featureTextsOf(editedRaw) {
  if (!state.rules) return [];
  const sig = canonical([arr(editedRaw.classes).map((k) => [k.name, k.levels, k.archetype && k.archetype.name, k.options || null]), featNamesOf(editedRaw), editedRaw.featureNotes || null]);
  if (featureTextsOf.cache && featureTextsOf.cache.rules === state.rules && featureTextsOf.cache.sig === sig) return featureTextsOf.cache.out;
  const out = [];
  const parsed = classRules();
  for (const k of arr(editedRaw.classes)) {
    const cref = rulesModule('classes').find((x) => x.name === k.name);
    if (!cref) continue;
    const aref = k.archetype && k.archetype.name ? rulesModule('archetypes').find((x) => x.name === k.archetype.name) : null;
    const items = clsTextFeatures(cref.classFeatureText, k.name, 'Class').concat(aref ? clsTextFeatures(aref.text, aref.name, 'Archetype') : [])
      .filter((f) => f.level <= num(k.levels));
    // Picked options ("Ideal of the Contender: your unarmed strikes gain the finesse property").
    const cls = parsed && parsed.classes[k.name];
    const arch = parsed && aref ? parsed.archetypes[aref.name] : null;
    for (const [key, picks] of Object.entries(k.options || {})) {
      // The class's list, the archetype's own, and what the archetype adds to the class's (Gambler/Geneticist Discoveries).
      const list = (cls && cls.lists.find((l) => l.key === key)) || (arch && arch.lists.find((l) => l.key === key));
      const options = (list ? list.options : []).concat((arch && arch.extends && arch.extends[key]) || []);
      for (const p of arr(picks)) { const o = options.find((x) => x.name === p.name); if (o) items.push({ name: o.name, text: o.text, note: p.note || '', from: key }); }
    }
    // `from`: what gives it, for explanations ("Sentinel Ideals", "Path of Focus", the vow's list).
    for (const f of items) out.push({ name: f.name, text: f.text, k, note: f.note || featureNoteOf(editedRaw, f.name), from: f.from || f.sourceName || k.name });
  }
  for (const name of featNamesOf(editedRaw)) {
    const ref = rulesModule('feats').find((f) => f.name === name);
    if (ref) out.push({ name, text: ref.text || '', k: null, note: featureNoteOf(editedRaw, name) });
  }
  featureTextsOf.cache = { rules: state.rules, sig, out };
  return out;
}
/**
 * Weapons a feature makes the character's own kind: "Choose two types of weapons to be your Echani weapons … You gain
 * proficiency with these weapons … Weapons of the chosen types are monk weapons for you" (the notes name them), "You gain
 * proficiency in blaster pistols, blaster rifles, ion pistols, ion rifles, and the lightbow, which are your Whills weapons
 * and are monk weapons for you". [{ name, kind, names, monk, prof }]
 */
function weaponKindsOf(editedRaw) {
  const out = [];
  for (const f of featureTextsOf(editedRaw)) {
    const t = String(f.text).replace(/\s+/g, ' ');
    let x;
    if ((x = /\bto be your (\w+) weapons\b/.exec(t)) && /\bWeapons of the chosen types are monk weapons for you\b/.test(t)) {
      const names = String(f.note || featureNoteOf(editedRaw, `${x[1]} Weapons`) || '').split(/\s*[,;]\s*|\s+and\s+/).map((n) => n.trim()).filter(Boolean);
      out.push({ name: f.name, kind: x[1], names, monk: true, prof: /\bYou gain proficiency with these weapons\b/.test(t) });
    } else if ((x = /\bYou gain proficiency in ([^.]+?), which are your (\w+) weapons and are monk weapons for you\b/.exec(t))) {
      out.push({ name: f.name, kind: x[2], names: x[1].split(/,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/^the\s+/i, '').trim()).filter(Boolean), monk: true, prof: true });
    }
  }
  return out;
}
/**
 * Attacks that can use another ability, for good (not a stance's or a state's "for the duration"):
 * - "Weapons that lack the two-handed or special properties are considered to have the finesse property for you"
 *   (Blinding Agility): Dexterity for them;
 * - "You can use your choice of Wisdom or Charisma instead of Strength or Dexterity for the attack and damage rolls of your
 *   unarmed strikes and monk weapons" (Vow of Spirit; "of your melee weapon attacks"); without the attacks named, the
 *   weapons the feature's notes name ("You can use Wisdom or Charisma instead of Strength or Dexterity for the attack and
 *   damage rolls", Forceblade Bond's bonded weapons). "Your choice": the one the notes name, else either.
 * [{ id, name, why, abilities, finesse, target: { lacking, unarmed, melee, monk, names } }]
 */
function attackGrantsOf(editedRaw) {
  const out = [];
  const A = '(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)';
  for (const f of featureTextsOf(editedRaw)) {
    const why = f.k ? `${f.from || f.k.name} feature` : 'feat';
    const sentences = String(f.text).replace(/\s+/g, ' ').split(/(?<=\.)\s+(?=[-A-Z_*#])/);
    // Options listed under "#### Name" in a feature that has you choose ("Mutations…"): only the ones picked.
    const choosing = /\bchoose\b|\bof your choice\b|\bfrom (?:any of )?the following\b/i.test(String(f.text).split(/####/)[0]);
    const picks = arr(editedRaw.classes).flatMap((k) => Object.values(k.options || {}).flatMap((ps) => arr(ps).map((p) => p && p.name))).concat([f.note]).filter(Boolean).join(' | ').toLowerCase();
    let sub = '';
    sentences.forEach((s0, i) => {
      if (/^#{4,}\s/.test(s0)) sub = (/^#+\s*([A-Z][\w'’ -]+?)\s+(?=[A-Z][a-z])/.exec(s0) || [])[1] || '';
      else if (/^#{1,3}\s/.test(s0)) sub = '';
      if (sub && choosing && !picks.includes(sub.toLowerCase())) return;
      const s = s0.replace(/^[-#*_ ]+/, '');
      // A state's ("for the duration", "until the end of your next turn", "while in this stance"): not for good.
      const lead = sentences.slice(Math.max(0, i - 3), i + 1).join(' ');
      if (/\bfor the duration\b|until the (?:start|end) of your next turn|while in this stance|for (?:1|one) minute/i.test(lead)) return;
      let x;
      if ((x = /\b(?:Weapons|weapons) that lack the ([\w ,-]+?) properties are considered to have the finesse property for you/.exec(s))) {
        out.push({ id: `grant:${f.name}`, name: f.name, why, abilities: ['Dexterity'], finesse: true, target: { lacking: x[1] } });
        return;
      }
      // "Your unarmed strikes deal 1d4 kinetic damage, and you can use your choice of your Strength, Dexterity, or Critical
      // Analysis ability modifer for the attack and damage rolls" (Unnatural Weaponry). "Critical Analysis ability": the
      // one its feature names ("…modifier, which is Intelligence").
      if ((x = /\byour unarmed strikes\b[^.]*?\byou can use your choice of (?:your )?([\w, ]+?) modif(?:i)?er for the attack and damage rolls\b/i.exec(s))) {
        const all = featureTextsOf(editedRaw).map((y) => y.text).join(' ');
        const options = [...new Set(x[1].split(/,\s*(?:or\s+)?|\s+or\s+/).map((n) => n.trim()).filter(Boolean)
          .map((n) => (ABBR[n] ? n : (new RegExp(`${n.replace(/ ability$/, '')} ability modifier, which is (\\w+)`, 'i').exec(all) || [])[1])).filter((a) => ABBR[a]))];
        // "Your choice": the one noted, used for both rolls; until then the best of them.
        const picked = options.filter((a) => new RegExp(`\\b(?:${a}|${ABBR[a]})\\b`, 'i').test(f.note || ''));
        if (options.length) out.push({ id: `grant:${f.name}`, name: f.name, why, abilities: picked.length === 1 ? picked : options, options, chosen: picked.length === 1, finesse: false, target: { unarmed: true } });
        return;
      }
      x = new RegExp(`\\bYou can use (?:your choice of )?(${A}(?: or ${A})?)(?: modifier)? instead of (?:Strength|Dexterity)(?: or (?:Strength|Dexterity))? for the attack and damage rolls(?: (?:of|made with) ([^.]+?))?\\.`).exec(s);
      if (!x) return;
      const what = String(x[2] || '');
      if (/\bagainst\b|\bas a part of\b/i.test(what)) return; // against a target, or a power's attack: an option on the roll
      const options = x[1].split(/ or /);
      let abilities = options;
      const chosen = abilities.filter((a) => new RegExp(`\\b(?:${a}|${ABBR[a]})\\b`, 'i').test(f.note || ''));
      if (chosen.length === 1) abilities = chosen;
      const target = what ? { unarmed: /unarmed strikes?/i.test(what), monk: /monk weapons/i.test(what), melee: /melee weapon attacks/i.test(what) }
        : { names: String(f.note || '').split(/\s*[,;]\s*|\s+and\s+/).map((n) => n.trim()).filter(Boolean) };
      out.push({ id: `grant:${f.name}`, name: f.name, why, abilities, options, chosen: chosen.length === 1, finesse: false, target });
    });
  }
  return out;
}
/**
 * "Your choice" of an ability a feature uses for its numbers (decision B: one choice, used for all of them; the best of
 * them until it's made): an attack grant's ("your choice of Wisdom or Charisma instead of Strength or Dexterity": Vow of
 * Spirit, Forceblade Bond; Unnatural Weaponry), an archetype's casting ("+ your Intelligence, Wisdom, or Charisma modifier
 * (your choice)": Archaeologist), written in the feature's notes. [{ name (the feature), options, chosen (name|null), key }].
 */
function abilityChoices(m) {
  if (!state.rules) return [];
  const out = [];
  const add = (name, options, chosen) => { if (options.length > 1 && !out.some((x) => x.name === name)) out.push({ name, options, chosen }); };
  for (const g of attackGrantsOf(m.raw)) if (g.options && g.options.length > 1) add(g.name, g.options, g.chosen ? g.abilities[0] : null);
  for (const c of classCasting(m)) {
    const ab = sourceAbilities(c);
    if (!ab) continue;
    // The one choice for the points (and so the casting): "+ your Intelligence, Wisdom, or Charisma modifier". Light, dark
    // and universal powers' abilities follow the usual rules (as a consular's), not asked.
    const options = [...new Set(arr(ab.points || ab.tech))];
    const name = c.type === 'tech' ? 'Techcasting' : 'Forcecasting';
    add(name, options, castingChoice(m.raw, c.type, options));
  }
  return out;
}
/** The casting ability noted on a Forcecasting/Techcasting card (Archaeologist's "(your choice)"), or null. */
function castingChoice(raw, kind, options) {
  const note = featureNoteOf(raw, kind === 'tech' ? 'Techcasting' : 'Forcecasting');
  const hit = options.filter((a) => new RegExp(`\\b(?:${a}|${ABBR[a]})\\b`, 'i').test(note || ''));
  return hit.length === 1 ? hit[0] : null;
}
/**
 * The calculation effects are worked out against (proficiency bonus, skills, weapons): the engine's, of the character as
 * edited now, when it has the data. SW5E's stored one (from the last Load) misses the sheet's own edits (a level added
 * here), so it's used only without the engine.
 */
function effectsBasis(snap, raw) {
  const engine = engineCtx();
  return (engine && engineResult(engine, raw).complete) || snap.complete || {};
}
/** What the sheet is computed from: the edited character, and with effects applied. */
function derivedInputs(key) {
  const snap = state.snapshots[key];
  const edited = editedFields(key);
  const raw = withEdits(snap.raw, edited);
  const fx = applyEffects(key, raw, effectsBasis(snap, raw));
  return { raw, fx, needed: ENGINE_FIELDS.some((p) => p in edited) || fx.effects.length > 0 };
}
const needsDerived = (key) => !!state.snapshots[key] && derivedInputs(key).needed;
// What SW5E's engine computes from: everything but text and credits, which the sheet shows from the character itself
// (completeWithEdits), so typing notes or paying for something doesn't send the character to sw5e.com again.
// Rolls kept with the character (rollLog) change no number: left out, so earlier results stay valid.
const basisOf = ({ rollLog, ...effRaw }) => canonical({ ...effRaw, notes: null, characteristics: null, featureNotes: null, credits: null }); // eslint-disable-line no-unused-vars
/** SW5E's computation of `effRaw`, if the cached one is for exactly that. */
function freshComputed(key, effRaw) {
  const comp = state.derived[key];
  return comp && comp.basis === basisOf(effRaw) ? comp : null;
}

// Until SW5E has recomputed, inventory is merged locally (mergeEquipment) and the sheet says
// its totals are pending.
const recomputeTimers = {};
// key -> { basis, tries, message }: the last failed recalculation. sw5e.com may be unreachable (offline, signed
// out): try again after 5, 15 and 45 seconds, then wait for a change or "Try again".
const recomputeFail = {};
const RETRY_DELAYS = [5000, 15000, 45000];
function scheduleRecompute(key, delay = 1200) {
  // The sheet's engine recalculates while drawing (buildModel): nothing to wait for.
  if (engineCtx() || !needsDerived(key)) return;
  clearTimeout(recomputeTimers[key]);
  recomputeTimers[key] = setTimeout(() => recomputeDerived(key), delay);
}
async function recomputeDerived(key) {
  if (engineCtx() || !needsDerived(key) || state.recomputing) return;
  const { fx } = derivedInputs(key);
  if (freshComputed(key, fx.raw)) return;
  const basis = basisOf(fx.raw);
  const withFx = fx.effects.length > 0;
  state.recomputing = key;
  refreshTracked(['pending']);
  try {
    // With effects: the sheet with and without them, so changed numbers can be explained.
    const res = await computeWithSw5e(withFx ? [fx.baseRaw, fx.raw] : [fx.raw], { onStatus: (msg) => setStatus(msg, '', true) });
    const r = res.characters[res.characters.length - 1];
    delete recomputeFail[key];
    if (r && r.complete && state.snapshots[key] && basisOf(derivedInputs(key).fx.raw) === basis) {
      state.derived[key] = {
        basis, complete: r.complete, base: withFx ? res.characters[0].complete : null,
        refs: r.refs, validation: r.validation, error: r.error, at: Date.now(),
      };
      await saveDerived();
      setStatus('Numbers updated · ' + new Date().toLocaleTimeString(), '', true);
    }
  } catch (e) {
    console.error(e);
    const prev = recomputeFail[key];
    recomputeFail[key] = { basis, tries: prev && prev.basis === basis ? prev.tries + 1 : 1, message: e.message };
    // Said once per character (the banner keeps saying it), and not over what the last action just reported.
    if (!recomputeFail.told) recomputeFail.told = new Set();
    if (!recomputeFail.told.has(key) && Date.now() - num(setStatus.at) > 4000) {
      recomputeFail.told.add(key);
      setStatus(`Couldn't recalculate the numbers with your changes; they may be out of date (${e.message}).`, 'error');
    }
  } finally {
    state.recomputing = null;
    const failed = recomputeFail[key];
    // A failure changes only the banner: don't redraw the sheet (that would close what's open).
    if (state.current === key) { if (failed) refreshTracked(['pending']); else renderAll({ keepTyping: true }); }
    const now = state.snapshots[key] && needsDerived(key) ? basisOf(derivedInputs(key).fx.raw) : null;
    if (now && !freshComputed(key, derivedInputs(key).fx.raw)) {
      if (!failed || failed.basis !== now) scheduleRecompute(key); // changed meanwhile: try with the new copy
      else if (failed.tries <= RETRY_DELAYS.length) scheduleRecompute(key, RETRY_DELAYS[failed.tries - 1]);
    }
  }
}

// ------------------------------------------------------------- bumped numbers
// Numbers an effect changed are shown with a dotted underline; hovering (or focusing/tapping)
// shows the value without effects and each effect that went into it.
const BUMP_ROOTS = ['abilityScores', 'armorClass', 'initiative', 'speed', 'passivePerception', 'hitPoints', 'techCasting',
  'forceCasting', 'weapons', 'carryingCapacity', 'proficiencyBonus'];
/** Paths of the numbers that differ between two computed sheets: { path: { from, to } }. */
function diffStats(a, b) {
  const out = {};
  const walk = (x, y, path) => {
    if (y && typeof y === 'object') {
      for (const k of Object.keys(y)) if (!['powersKnown', 'description', 'tweaks'].includes(k)) walk(x && x[k], y[k], `${path}.${k}`);
      return;
    }
    const nx = typeof x === 'number' ? x : parseFloat(x);
    const ny = typeof y === 'number' ? y : parseFloat(y);
    if (Number.isFinite(ny) && nx !== ny) out[path] = { from: x, to: y };
  };
  for (const r of BUMP_ROOTS) walk(a && a[r], b && b[r], r);
  return out;
}

/**
 * The abilities a casting number uses (field: lightSaveDC, maxPoints, attackModifier…): Wisdom for light side, Charisma
 * for dark side, both for universal powers and force points, Intelligence for tech; a feat's swap adds its ability.
 */
function castingAbilities(m, kind, field) {
  const k = kind === 'tech' ? 'tech' : /^light/.test(field) ? 'light' : /^dark/.test(field) ? 'dark' : 'universal';
  const list = k === 'light' ? ['Wisdom'] : k === 'dark' ? ['Charisma'] : k === 'universal' ? ['Wisdom', 'Charisma'] : ['Intelligence'];
  return [...new Set(list.concat(castingSwaps(m.raw).filter((s) => s.kind === kind && s.chosen && list.includes(s.from)).map((s) => s.to)))];
}
/** The applied tweaks that can have changed the number at `path`. */
function bumpSources(m, path) {
  const tw = m.fx.tweaks.concat(m.fx.weaponTweaks.map((t) => ({ ...t, path: `weapon@${t.index}.${t.path}` }))).filter((t) => !(t.mod && t.mod.already));
  const scoreOnly = (a) => tw.filter((t) => t.path === `abilityScores.${a}.score`);
  // A number that uses the modifier: a score change counts only when it changed the modifier (DEX 14 → 15 doesn't).
  const score = (a) => (m.bumps[`abilityScores.${a}.modifier`] ? scoreOnly(a) : []);
  let x;
  if ((x = /^abilityScores\.(\w+)\.(?:value|modifier)$/.exec(path))) return scoreOnly(x[1]);
  if ((x = /^abilityScores\.(\w+)\.skills\.(\d+)/.exec(path))) {
    const skill = ((((m.c.abilityScores || {})[x[1]] || {}).skills || [])[x[2]] || {}).name;
    return score(x[1]).concat(tw.filter((t) => t.path === `abilityScores.${x[1]}.skills.${skill}`));
  }
  if ((x = /^abilityScores\.(\w+)\.savingThrow/.exec(path))) return score(x[1]).concat(tw.filter((t) => t.path === `abilityScores.${x[1]}.savingThrowModifier`));
  if ((x = /^abilityScores\.(\w+)/.exec(path))) return score(x[1]);
  if ((x = /^weapons\.(\d+)/.exec(path))) {
    const w = arr(m.c.weapons)[x[1]] || {};
    const part = /attackBonus$/.test(path) ? 'toHit' : /damage/i.test(path) ? 'damage' : null;
    const own = (w.name === 'Unarmed Strike' ? tw.filter((t) => t.path.startsWith('unarmed.'))
      : tw.filter((t) => t.path.startsWith('weapon.') || t.path.startsWith(`weapon@${w.index}.`)))
      // The damage die counts for the damage (an unarmed strike's "1" becomes d4: its damage bonus loses the 1).
      .filter((t) => !part || t.path.endsWith('.' + part) || (part === 'damage' && t.path.endsWith('.damageDice')));
    // A finesse unarmed strike (Unarmed Combatant) goes by Dexterity: an item's Dexterity counts there too.
    const finesse = own.some((t) => t.mod && t.mod.finesse) ? score('Dexterity') : [];
    return own.concat(w.ability ? score(w.ability) : [], finesse);
  }
  // Casting numbers: the tweaks on that very number (a save DC tweak doesn't explain the points), and the abilities it
  // uses (castingAbilities).
  if ((x = /^(force|tech)Casting\.(\w+)$/.exec(path))) return tw.filter((t) => t.path === path).concat(...castingAbilities(m, x[1], x[2]).map(score));
  // A maneuver DC or attack worked out on the sheet (maneuver.Physical.Dexterity.dc): its superiority tweak and the ability.
  if ((x = /^maneuver\.(\w+)\.(\w+)\.(dc|attack)$/.exec(path))) return tw.filter((t) => t.path === `superiority.${x[1].toLowerCase()}${x[3] === 'dc' ? 'SaveDC' : 'Modifier'}`).concat(score(x[2]));
  const rel = {
    armorClass: ['armorClass', 'Dexterity'], initiative: ['initiative', 'Dexterity'], passivePerception: ['passivePerception', 'Wisdom', 'abilityScores.Wisdom.skills.Perception'],
    // Speed goes by Strength only through worn armor's strength number (Muscled Menace's +1 STR doesn't move it otherwise).
    // (only when the change crosses a worn piece's strength number).
    hitPoints: ['hitPoints', 'Constitution'], speed: ['speed'].concat(arr(m.c.equipment).some((e) => e.equipped && e.equipmentCategory === 'Armor' && arr(e.properties).some((p) => {
      const n = num((/^strength (\d+)/i.exec(String(p).trim()) || [])[1]);
      const was = num((((m.base && m.base.abilityScores) || {}).Strength || {}).value), now = num(((m.c.abilityScores || {}).Strength || {}).value);
      return n && (was < n) !== (now < n);
    })) ? ['Strength'] : []),
    carryingCapacity: ['Strength'],
    proficiencyBonus: [], attunement: ['attunement'],
  }[path.split('.')[0]] || ['*'];
  // Carrying capacity and speed (heavy armor's Strength) go by the score itself; the rest by the modifier.
  const byScore = ['carryingCapacity', 'speed'].includes(path.split('.')[0]);
  const scoreFx = (t) => { const a = (/^abilityScores\.(\w+)\.score$/.exec(t.path) || [])[1]; return a && (byScore || m.bumps[`abilityScores.${a}.modifier`]) ? a : null; };
  return tw.filter((t) => rel.some((r) => (r === '*' ? !!scoreFx(t) : ABBR[r] ? scoreFx(t) === r : t.path.startsWith(r))));
}

// Conditional bonuses ("+1 AC vs melee", "with Cryo Cell (Average)") aren't applied: each number
// they touch also shows its alternative value(s), e.g. AC "14 · 15 vs melee".
/** Does this weapon fire that ammunition ("cryo cell" → power-cell weapons, "wrist launcher dart"…)? */
function ammoFits(ammo, w) {
  const t = `${w.name} ${propsText(w.properties)} ${w.description || ''}`.toLowerCase();
  const a = String(ammo).toLowerCase();
  if (/dart|wrist launcher/.test(a)) return /wrist launcher/.test(t);
  if (/rocket/.test(a)) return /rocket/.test(t);
  if (/missile/.test(a)) return /missile|wrist launcher/.test(t);
  if (/torpedo/.test(a)) return /torpedo/.test(t);
  if (/generator/.test(a)) return /power generator/.test(t);
  if (/cartridge/.test(a)) return /cartridge|slug/.test(t);
  if (/cell/.test(a)) return /power cell/.test(t);
  return false;
}
/** The displayed numbers (paths into the computed sheet) a conditional bonus applies to. */
function condPaths(m, cd) {
  const p = cd.path;
  let x;
  if (['armorClass', 'initiative', 'passivePerception'].includes(p) || /^(tech|force)Casting\./.test(p)) return [p];
  if ((x = /^abilityScores\.(\w+)\.savingThrowModifier$/.exec(p))) return [`abilityScores.${x[1]}.savingThrow.modifier`];
  if ((x = /^abilityScores\.(\w+)\.skills\.(.+)$/.exec(p))) {
    const i = arr(((m.c.abilityScores || {})[x[1]] || {}).skills).findIndex((k) => k.name === x[2]);
    return i < 0 ? [] : [`abilityScores.${x[1]}.skills.${i}.modifier`];
  }
  if ((x = /^(weapon|unarmed)\.(toHit|damage)$/.exec(p))) {
    const field = x[2] === 'toHit' ? 'attackBonus' : 'damageBonus';
    return arr(m.c.weapons).map((w, i) => ({ w, i })).filter(({ w }) => (x[1] === 'unarmed' ? w.name === 'Unarmed Strike'
      : cd.ammo ? w.name !== 'Unarmed Strike' && ammoFits(cd.ammo, w)
        : cd.weaponIndex != null ? w.index === cd.weaponIndex : w.name !== 'Unarmed Strike'))
      .flatMap(({ i }) => [`weapons.${i}.${field}`].concat(cd.mod.extraDamage ? [`weapons.${i}.damageBonus`] : []));
  }
  return [];
}
/** { path: [{ cond, bonus, extra, sources: [cond entry] }] }: alternatives per displayed number. */
function condAlts(m) {
  const out = {};
  for (const cd of m.fx.conds) {
    for (const path of condPaths(m, cd)) {
      const isExtra = cd.mod.extraDamage && /damageBonus$/.test(path) && cd.path === 'weapon.toHit';
      const list = out[path] || (out[path] = []);
      let alt = list.find((a) => a.cond === cd.cond);
      if (!alt) list.push(alt = { cond: cd.cond, bonus: 0, extra: [], sources: [] });
      if (isExtra) alt.extra.push(cd.mod.extraDamage);
      else alt.bonus += cd.bonus;
      alt.sources.push(cd);
    }
  }
  return out;
}
/** Numbers shown with a sign (+3) rather than plain (14). */
const SIGNED_PATH = /(modifier|attackBonus|AttackModifier|attackModifier|^initiative)$/;
/** An alternative value, formatted like the number it accompanies. */
function altValue(m, path, alt) {
  const cur = getPath(m.c, path);
  const x = /^weapons\.(\d+)\.damageBonus$/.exec(path);
  if (x) {
    const w = arr(m.c.weapons)[x[1]] || {};
    return damageText({ ...w, damageBonus: num(w.damageBonus) + alt.bonus }).replace(/^(\S+)/, (d) => d + alt.extra.map((e) => '+' + e).join(''));
  }
  const v = num(cur) + alt.bonus;
  return SIGNED_PATH.test(path) ? signed(v) : String(v);
}

/** How an effect applies, for tooltips and the Effects list. */
function effectWhen(e) {
  if (e.kind === 'item' || e.kind === 'tweak' || e.kind === 'feature') return e.why;
  const since = new Date(e.startedAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return `${e.source === 'received' ? 'received' : e.source === 'feature' ? 'started' : e.source === 'power' ? 'cast' : e.source === 'custom' ? 'added' : 'used'}${e.duration ? `, lasts ${e.duration}` : ''}, since ${since}`;
}
function bumpTip(m, path, d) {
  const src = d.to != null && d.to !== '' ? bumpSources(m, path) : [];
  const fmt = (v) => esc(String(v));
  const alts = (m.alts[path] || []).map((a) => `<li><b>${esc(altValue(m, path, a))}</b> ${esc(a.cond)}: ${a.sources.map((cd) => `${esc(cd.mod.extraDamage && /damageBonus$/.test(path) ? '+' + cd.mod.extraDamage + ' damage' : signedLabel(cd.bonus))} · ${esc(cd.effect.name)} <span class="faint">${esc(effectWhen(cd.effect))}</span>`).join('; ')}</li>`);
  const condHtml = alts.length ? `<div class="tip-head" style="margin-top:6px">Only sometimes:</div><ul>${alts.join('')}</ul>` : '';
  if (d.to == null || d.to === '') return condHtml.replace('margin-top:6px', 'margin-top:0');
  // A score change under a number that uses the modifier: what it did to the modifier ("+1 DEX modifier (+2 score)").
  const scoreMod = (t) => {
    const a = (/^abilityScores\.(\w+)\.score$/.exec(t.path) || [])[1];
    if (!a || path.startsWith(`abilityScores.${a}.value`) || path.startsWith(`abilityScores.${a}.modifier`) || !num(t.bonus) || /^(?:carryingCapacity|speed)/.test(path)) return null;
    // Several changes to one score move its modifier together: then each is named as a score change.
    if (src.filter((x) => x.path === t.path).length > 1) return `${signedLabel(num(t.bonus))} ${ABBR[a]} score`;
    const f = num((m.fx.scores || {})[a]);
    const d = Math.floor((f - 10) / 2) - Math.floor((f - num(t.bonus) - 10) / 2);
    return `${signedLabel(d)} ${ABBR[a]} modifier (${signedLabel(num(t.bonus))} score)`;
  };
  const tweakLine = (t) => `<li><b>${esc(scoreMod(t) || fxTweakValueText({ ...(t.fields || {}), bonus: t.bonus }))}</b> ${esc(scoreMod(t) ? '' : t.effect.tweakName)}
      · ${t.effect.reason ? `${esc(t.effect.reason)} ` : ''}<span class="faint">${esc(effectWhen(t.effect))}</span></li>`;
  return `<div class="tip-head">Without tweaks or effects: <b>${fmt(d.from ?? '—')}</b> → now <b>${fmt(d.to)}</b></div>
    ${src.length || carryLines(m, path) ? `<ul>${carryLines(m, path)}${src.map((t) => (t.effect.kind === 'tweak' ? tweakLine(t) : `<li><b>${esc(scoreMod(t) || (!t.bonus && t.fields && t.fields.proficiency ? String(t.fields.proficiency).toLowerCase() : !t.bonus && t.fields && t.fields.dieSize ? `d${t.fields.dieSize}` : signedLabel(t.bonus)))}</b> ${esc(scoreMod(t) ? '' : t.mod.label.replace(/\s*[+\-−]?\d+( ft)?$/, ''))}${t.mod.set != null ? ` <span class="faint">(the item sets it to ${t.mod.set})</span>`
      : t.mod.cap != null && typeof t.mod.bonus === 'number' && t.bonus !== t.mod.bonus ? ` <span class="faint">(capped from ${esc(signedLabel(t.mod.bonus))})</span>` : ''}
      · ${esc(t.effect.name)} <span class="faint">${esc(effectWhen(t.effect))}</span></li>`)).join('')}${setAsideLines(m, src)}</ul>`
      : '<div class="faint">Changed by the tweaks or effects listed under Settings, Tweaks &amp; Data and Combat &amp; Vitals → Effects.</div>'}${condHtml}${acOthers(m, path)}`;
}
/** Under a number a tweak sets: the effects that would change it and don't ("+2 STR · Strength Stim: not applied"). */
function setAsideLines(m, src) {
  const keys = new Set(src.filter((t) => t.effect.kind === 'tweak' && t.fields && engHasOverride(t.fields))
    .map((t) => { const w = /^weapon@(\d+)\.(.+)$/.exec(t.path); return w ? `#${w[1]}:${w[2]}` : t.path; }));
  return arr(m.fx.setByTweak).filter((t) => keys.has(t.index != null ? `#${t.index}:${t.path}` : t.path))
    .map((t) => `<li class="faint"><b>${esc(signedLabel(num(t.bonus)))}</b> ${esc(String((t.mod && t.mod.label) || fxTweakName(t.path)).replace(/\s*[+\-−]?\d+( ft)?$/, ''))} · ${esc(t.effect.name)}: not applied, a tweak sets this number</li>`).join('');
}
/** Under AC: the unarmored formulas that weren't used, because a better one applies. */
function acOthers(m, path) {
  const alt = path === 'armorClass' ? arr(m.fx.acAlternatives) : [];
  return alt.length ? `<div class="tip-head" style="margin-top:6px">Not used (a better AC formula applies):</div><ul>${alt.map((t) => `<li><b>${esc(signedLabel(t.bonus))}</b> ${esc(t.mod.label)} · ${esc(t.effect.name)}</li>`).join('')}</ul>` : '';
}
/**
 * Wrap a displayed number so a change made by effects is marked and explained on hover, and
 * show its conditional alternatives next to it ("14 · 15 vs melee"). opts.noAlts: show no
 * alternatives (the number is derived from the one at `path`, e.g. a passive score).
 */
function bump(m, path, html, calc, opts = {}) {
  const d = calc && calc.from !== calc.to ? calc : !calc && m.bumps[path];
  const alts = opts.noAlts ? [] : (m.alts[path] || []);
  if (!d && !alts.length) return html;
  const cls = d ? (num(d.to) > num(d.from) ? ' up' : ' down') : '';
  const main = `<span class="bump${cls}" tabindex="0" data-bump="${esc(path)}" data-from="${esc(String(d ? d.from : ''))}" data-to="${esc(String(d ? d.to : ''))}">${html}</span>`;
  return alts.length
    ? `${main}<span class="alts">${alts.map((a) => `<span class="alt bump" tabindex="0" data-bump="${esc(path)}" data-from="" data-to=""><span class="sep"> · </span>${esc(altValue(m, path, a))} <small>${esc(a.cond)}</small></span>`).join('')}</span>`
    : main;
}

/** Set several edited fields at once; ones equal to SW5E's copy are dropped. */
async function setEditedFields(snap, patch) {
  const key = snap.key;
  const ed = state.edits[key] || { fields: {} };
  const fields = { ...ed.fields };
  for (const [path, v] of Object.entries(patch)) {
    if (sameField(path, v, getPath(snap.raw, path))) delete fields[path];
    else fields[path] = v;
  }
  if (Object.keys(fields).length) state.edits[key] = { ...ed, fields, updatedAt: Date.now() };
  else delete state.edits[key];
  await saveEdits();
  renderAll();
  scheduleRecompute(key);
}

// ------------------------------------------------------------- inventory
// Rules follow the site's own equipment panel: enhanced items have no equipmentCategory;
// only (non-enhanced) weapons and armor can be equipped, custom items unless they're "Gear";
// enhanced items that require it can be attuned (legendary/artifact count as 2).
let catalogIndex = null; // name -> catalog item
const isEnhanced = (it) => !it.equipmentCategory;
const attuneCost = (e) => (arr(e.rarityOptions).some((r) => /legendary|artifact/i.test(r)) ? 2 : 1);
const qtyOf = (e) => (e.quantity == null || e.quantity === '' ? 1 : num(e.quantity));
const RAW_ITEM_KEYS = ['quantity', 'equipped', 'attuned', 'index', 'tweaks', 'category', 'isFound', 'isCustom'];
// The sheet's own fields on inventory entries: a name and a note of yours, what you paid, an enhanced item's base.
const LOCAL_ITEM_KEYS = ['label', 'notes', 'paid', 'baseItem', 'enhancedBy', 'baseLink', 'addedForBase', 'color'];

/** Inventory entries as the engine would show them: reference data + the character's own fields. */
function mergeEquipment(list, prevComplete) {
  const known = new Map(arr(prevComplete).filter((e) => e.isFound).map((e) => [e.name, e]));
  return arr(list).map((it, i) => {
    let ref = known.get(it.name) || (catalogIndex && catalogIndex.get(it.name)) || null;
    if (ref) ref = Object.fromEntries(Object.entries(ref).filter(([k]) => !RAW_ITEM_KEYS.includes(k)));
    return { ...(ref || {}), ...it, equipped: !!it.equipped, ...(ref && isEnhanced(ref) ? { attuned: !!it.attuned } : {}), index: i, isFound: !!ref };
  });
}
// Enhanced items (not on the site's own panel) can be equipped/installed here so their effects
// apply; the flag is kept by sw5e.com's engine.
const canEquip = (e, custom) => (custom ? e.equipmentCategory !== 'Gear'
  : !!e.isFound && (isEnhanced(e) ? e.type !== 'Consumable' && !e.requiresAttunement : ['Weapon', 'Armor'].includes(e.equipmentCategory)));
const EQUIP_VERB = { Equipped: 'Equip', Installed: 'Install', 'Using as focus': 'Use as focus' };
const canAttune = (e, custom) => !custom && !!e.isFound && isEnhanced(e) && !!e.requiresAttunement;
const atAttuneLimit = (m, e) => {
  const max = attunementMax(m);
  return !e.attuned && max != null && attunementUsed(m) + attuneCost(e) > max;
};
/**
 * The attunement maximum: SW5E's (the proficiency bonus) and what feats add ("Your maximum attunement increases by 1",
 * Investigative Attunement: a mod on attunement.maximum, which SW5E's engine has no tweak for). Null without one.
 */
function attunementMax(m) {
  const att = m.c.attunement || {};
  if (att.maximum == null) return null;
  return num(att.maximum) + arr(m.fx && m.fx.tweaks).filter((t) => t.path === 'attunement.maximum').reduce((s, t) => s + num(t.bonus), 0);
}
/** A catalog item's price in credits, or 0 if it has none. */
const priceOf = (ref) => {
  if (typeof ref.cost === 'number') return ref.cost;
  const m = /^\s*([\d,]+)\s*(cr)?\s*$/i.exec(String(ref.valueText || ''));
  return m ? num(m[1].replace(/,/g, '')) : 0;
};

function setCatalog(cat) {
  state.catalog = cat;
  catalogIndex = new Map(arr(cat && cat.items).map((it) => [it.name, it]));
}

/**
 * SW5E's rules data (classes, archetypes, features, maneuvers, powers, choice lists…) and item list. They come with
 * the sheet (data/sw5e/, see sw5e-data.js). When sw5e.com reports a newer data version (state.sw5eReported), or on
 * `refresh`, SW5E's data service is asked for its data: a newer version is kept in this browser and used from then on.
 */
async function ensureSw5eData({ refresh = false } = {}) {
  if (ensureSw5eData.pending) return ensureSw5eData.pending;
  const behind = () => num(state.sw5eReported) > num(state.rules && state.rules.dataVersion) && !state.sw5eFetchTried;
  if (state.rules && state.catalog && !refresh && !behind()) return;
  const p = ensureSw5eData.pending = (async () => {
    if (!state.rules || !state.catalog) await useKeptSw5eData();
    if (refresh || behind()) await fetchNewSw5eData();
    addDemo(state); // computed now that the engine has its data
  })();
  ensureRules.pending = ensureCatalog.pending = p;
  try {
    state.rulesError = state.catalogError = null;
    await p;
  } catch (e) {
    state.rulesError = state.catalogError = e.message;
    throw e;
  } finally {
    ensureSw5eData.pending = ensureRules.pending = ensureCatalog.pending = null;
  }
}
/** The sheet's own copy, or a newer one fetched before. A kept copy that isn't newer is dropped (it's a cache). */
async function useKeptSw5eData() {
  const [rules, catalog] = await Promise.all([sw5eBundled('rules'), sw5eBundled('catalog')]);
  const newer = (info, own) => !!info && num(info.dataVersion) > num(own.dataVersion);
  const kept = newer(state.rulesInfo, rules) || newer(state.catalogInfo, catalog) ? await platform.storage.get([RULES_KEY, CATALOG_KEY]) : {};
  state.rules = kept[RULES_KEY] && newer(kept[RULES_KEY], rules) ? kept[RULES_KEY] : rules;
  setCatalog(kept[CATALOG_KEY] && newer(kept[CATALOG_KEY], catalog) ? kept[CATALOG_KEY] : catalog);
  if ((state.rulesInfo || state.catalogInfo) && state.rules === rules && state.catalog === catalog) {
    state.rulesInfo = state.catalogInfo = null;
    await platform.storage.remove([RULES_KEY, CATALOG_KEY, RULES_INFO_KEY, CATALOG_INFO_KEY]);
  }
}
/** SW5E's data as its data service has it now: kept and used if it's newer than the sheet's. */
async function fetchNewSw5eData() {
  state.sw5eFetchTried = true;
  const had = num(state.rules && state.rules.dataVersion);
  setStatus("Asking SW5E's data service for its latest rules and item data…", '', true);
  let got;
  try {
    got = await sw5eFetchRulesAndCatalog();
  } catch (e) {
    throw new Error(`${e.message}. The sheet keeps using its own copy${had ? ` (version ${had})` : ''}`);
  }
  const { rules, catalog } = got;
  if (num(rules.dataVersion) <= had) {
    setStatus(`SW5E's rules and item data are up to date (version ${had}).`);
    return;
  }
  state.rules = rules;
  setCatalog(catalog);
  state.rulesInfo = { dataVersion: rules.dataVersion, fetchedAt: rules.fetchedAt };
  state.catalogInfo = { dataVersion: catalog.dataVersion, fetchedAt: catalog.fetchedAt, count: catalog.items.length };
  await platform.storage.set({ [RULES_KEY]: rules, [CATALOG_KEY]: catalog, [RULES_INFO_KEY]: state.rulesInfo, [CATALOG_INFO_KEY]: state.catalogInfo, [WRITER_KEY]: writerStamp() });
  setStatus(`SW5E's rules and item data changed (version ${had} → ${rules.dataVersion}): the sheet uses the new data.`);
}
/** sw5e.com said which data version it has: a newer one than the sheet's is fetched. */
function noteSw5eDataVersion(v) {
  if (v == null || num(v) <= num(state.sw5eReported)) return;
  state.sw5eReported = num(v);
  if (state.rules && num(v) > num(state.rules.dataVersion)) {
    ensureSw5eData().then(() => renderAll({ keepTyping: true })).catch((e) => setStatus("Could not fetch SW5E's newer data: " + e.message, 'error'));
  }
}
/** The SW5E item catalog (see ensureSw5eData). */
async function ensureCatalog({ force = false } = {}) {
  await ensureSw5eData({ refresh: force });
  return state.catalog;
}
/** SW5E's rules data (see ensureSw5eData). */
async function ensureRules({ force = false } = {}) {
  await ensureSw5eData({ refresh: force });
  return state.rules;
}

function loadCatalogThenRender(opts) {
  ensureCatalog(opts).catch((e) => setStatus('Could not load the SW5E item list: ' + e.message, 'error')).finally(() => renderAll({ keepTyping: true }));
}
/** First use of "Add an item": load the item list without disturbing the typing. */
function loadCatalogForAdding() {
  if (state.catalog || ensureCatalog.pending) return;
  const p = ensureCatalog();
  refreshTracked(['addsugg']);
  p.catch((e) => setStatus('Could not load the SW5E item list: ' + e.message, 'error'))
    .finally(() => {
      refreshTracked(['addsugg', 'adddetail', 'effsugg']);
      if (state.current) scheduleRecompute(state.current);
    });
}

/** The current character's item list (with edits), as a copy to change. */
const shownItems = (snap, list) => clone(arr(withEdits(snap.raw, editedFields(snap.key))[list]));

async function inventoryAction(op, arg) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  if (op === 'use') return useItem(arg);
  if (op === 'charge') return rechargeItem(arg);
  if (op === 'use-menu' || op === 'use-cancel') {
    state.useMenu = op === 'use-menu' ? arg : null;
    return renderAll();
  }
  if (op === 'edit' || op === 'edit-cancel' || op === 'sell-menu' || op === 'sell-cancel') {
    if (op.startsWith('edit')) state.itemEdit = op === 'edit' ? arg : null;
    else state.sellMenu = op === 'sell-menu' ? arg : null;
    return renderAll();
  }
  const [list, idx, ...rest] = String(arg).split('|');
  const delta = rest.join('|');
  if (!ITEM_FIELDS.includes(list)) return;
  const items = shownItems(snap, list);
  const it = items[Number(idx)];
  if (!it) return;
  const raw = withEdits(snap.raw, editedFields(snap.key));
  const patch = {};
  let msg = '';
  const linked = () => invBaseIndex(items, items.indexOf(it));
  if (op === 'qty') {
    const was = qtyOf(it);
    it.quantity = Math.max(1, was + Number(delta));
    msg = `${it.name}: ${was} → ${it.quantity}.`;
  } else if (op === 'equip') {
    it.equipped = !it.equipped;
    // An enhanced weapon or armor and its base go on and off together.
    if (linked() >= 0) items[linked()].equipped = it.equipped;
    msg = `${it.name} ${it.equipped ? 'equipped' : 'no longer equipped'}.`;
    const hands = it.equipped && list === 'equipment' ? handsConflict({ ...raw, equipment: items }) : null;
    if (hands) msg += ` ${handsWarning(hands)}`;
    const ref = list === 'equipment' && catalogIndex && catalogIndex.get(it.baseItem || it.name);
    const setAc = acSetByTweak(raw);
    if (setAc != null && ref && (ref.equipmentCategory === 'Armor' || /^(?:Armor|Shield)$/.test(ref.type || ''))) {
      msg += ` Your AC tweak sets AC to ${setAc}, so the ${it.label || it.name} doesn't change it: change the tweak to a bonus, or remove it (Settings, Tweaks & Data).`;
    }
  } else if (op === 'attune') { it.attuned = !it.attuned; msg = `${it.name} ${it.attuned ? 'attuned' : 'no longer attuned'}.`; }
  else if (op === 'remove') {
    if (state.confirmRemove !== arg) {
      state.confirmRemove = arg;
      renderAll();
      return;
    }
    const base = linked() >= 0 ? items[linked()] : null;
    items.splice(Number(idx), 1);
    // Its base goes with it (the base is part of the enhanced item).
    if (base) items.splice(items.indexOf(base), 1);
    msg = `Removed ${it.name}${base ? ` (with its ${base.name})` : ''}.`;
  } else if (op === 'base') {
    linkBase(items, it, delta || '');
    msg = it.baseItem ? `${it.name} is built on a ${it.baseItem}: its numbers are under Weapons & Attacks (or your AC).` : `${it.name} has no base item now.`;
  } else if (op === 'edit-save') {
    const row = document.querySelector(`[data-ie-for="${CSS.escape(arg)}"]`);
    const val = (k) => { const el = row && row.querySelector(`[data-ie="${k}"]`); return el ? el.value.trim() : null; };
    if (list === 'customEquipment') {
      const n = val('name');
      if (n === '') return setStatus('A custom item needs a name.', 'error');
      if (n != null) it.name = n;
      for (const [k, f] of [['weight', 'weight'], ['cost', 'cost']]) { const v = val(k); if (v != null) { if (v === '') delete it[f]; else it[f] = num(v); } }
      const dsc = val('description');
      if (dsc != null) { if (dsc) it.description = dsc; else delete it.description; }
    } else {
      const l = val('label');
      if (l != null) { if (l && l !== it.name) it.label = l; else delete it.label; }
    }
    const note = val('notes');
    if (note != null) { if (note) it.notes = note; else delete it.notes; }
    const color = val('color');
    if (color != null) { if (color) it.color = color; else delete it.color; }
    state.itemEdit = null;
    msg = `${it.label || it.name} updated.`;
  } else if (op === 'sell') {
    const row = document.querySelector(`[data-sell-for="${CSS.escape(arg)}"]`);
    const q = clamp(parseInt((row && row.querySelector('[data-sell="qty"]') || {}).value, 10) || 1, 1, qtyOf(it));
    const p = String((row && row.querySelector('[data-sell="price"]') || {}).value || '0').replace(/[\s,]/g, '').replace(/cr$/i, '');
    if (!/^\d+$/.test(p)) return setStatus('Sale price: a whole number of credits.', 'error');
    const base = linked() >= 0 ? items[linked()] : null;
    if (q >= qtyOf(it)) { items.splice(Number(idx), 1); if (base) items.splice(items.indexOf(base), 1); } else it.quantity = qtyOf(it) - q;
    const cr = num(raw.credits) + parseInt(p, 10);
    Object.assign(patch, { credits: cr, creditLog: creditLogWith(raw, parseInt(p, 10), cr, `Sold ${q} × ${it.label || it.name}`) });
    state.sellMenu = null;
    msg = `Sold ${q} × ${it.label || it.name} for ${fmtNum(parseInt(p, 10))} cr.`;
  } else if (op === 'unpack') {
    const pack = packByName(it.name);
    if (!pack) return;
    const equipment = list === 'equipment' ? items : shownItems(snap, 'equipment');
    const customs = list === 'customEquipment' ? items : shownItems(snap, 'customEquipment');
    customs.splice(customs.indexOf(it), 1);
    for (const x of packEntries(pack, qtyOf(it))) mergeInto(x.list === 'equipment' ? equipment : customs, x.entry);
    Object.assign(patch, { equipment, customEquipment: customs });
    msg = `Unpacked ${it.name}: ${packEntries(pack, qtyOf(it)).map((x) => `${x.entry.quantity}× ${x.entry.name}`).join(', ')}.`;
  } else return;
  state.confirmRemove = null;
  const undo = rememberForUndo(snap.key, msg.replace(/\.$/, ''), op === 'remove');
  await setEditedFields(snap, { [list]: items, ...patch });
  setStatus(msg, '', false, undo);
}

// ------------------------------------------------------------- shots and reloading
/**
 * A weapon's damage bonus by where it comes from, for the roll's breakdown (W-102): the ability modifier, each effect,
 * feature or tweak on weapon damage ("Rage", "Brute Force"), and the rest (the weapon's own bonus, a fighting style
 * SW5E applies). One "damage bonus" while the numbers are being recalculated.
 */
function damageParts(m, w) {
  const total = num(w.damageBonus) + num(w.damageDieModifier);
  const one = [{ label: 'damage bonus', value: total }];
  if (m.stale || !m.fx) return one;
  const unarmed = w.name === 'Unarmed Strike';
  const ab = w.ability && ABBR[w.ability] ? num(((m.c.abilityScores || {})[w.ability] || {}).modifier) : 0;
  const abLabel = `${ABBR[w.ability] || ''} modifier`;
  // Unarmed strikes "do 1 + your Strength modifier kinetic damage" without a damage die, the die and Strength with
  // one; SW5E never goes below 0 there.
  const parts = !unarmed ? [{ label: abLabel, value: ab }]
    : num(w.damageDieType) ? [{ label: abLabel, value: Math.max(0, ab) }]
      : ab >= -1 ? [{ label: 'unarmed strike', value: 1 }, { label: abLabel, value: ab }]
        : [{ label: `1 + ${abLabel} (at least 0)`, value: 0 }];
  const src = arr(m.fx.tweaks).filter((t) => t.path === (unarmed ? 'unarmed.damage' : 'weapon.damage'))
    .concat(unarmed ? [] : arr(m.fx.weaponTweaks).filter((t) => t.index === w.index && t.path === 'damage'));
  for (const t of src) {
    if (!num(t.bonus)) continue;
    // Another ability instead of the weapon's (finesse, Vow of Spirit, Blinding Agility, an item's Finesse Oscillator):
    // it's that ability's modifier, named so ("+5 DEX modifier (Blinding Agility)"), in place of the one it replaces.
    const swapTo = t.mod && (t.mod.ability || (t.mod.finesse ? 'Dexterity' : '') || (t.mod.swap && t.mod.swap.to));
    if (swapTo && ABBR[swapTo]) {
      const own = parts.findIndex((p) => p.label === abLabel);
      const v = num(t.bonus) + (own >= 0 ? parts[own].value : 0);
      const p = { label: `${ABBR[swapTo]} modifier (${t.effect.name})`, value: v };
      if (own >= 0) parts[own] = p; else parts.push(p);
      continue;
    }
    parts.push({ label: t.effect.kind === 'tweak' ? `tweak${t.effect.reason ? ` (${t.effect.reason})` : ''}` : t.effect.name, value: num(t.bonus) });
  }
  const rest = total - parts.reduce((s, p) => s + p.value, 0);
  if (rest < 0) return one; // it doesn't add up (a weapon without the ability modifier): don't guess
  if (rest) parts.push({ label: 'other (weapon, style…)', value: rest });
  return parts.filter((p) => p.value);
}
/** Shots left in a weapon with the reload property: { shots, used, ammo, cells: carried, at: entry index } or null. */
function weaponShots(m, w) {
  const r = invReload(w);
  if (!r) return null;
  const used = num(((state.itemState[m.snap.key] || {}).shots || {})[w.name]);
  const entries = arr(withEdits(m.snap.raw, editedFields(m.snap.key)).equipment);
  const at = invAmmoEntry(entries, r.ammo);
  return { ...r, used: Math.min(used, r.shots), at, cells: at >= 0 ? qtyOf(entries[at]) : 0, cellName: at >= 0 ? entries[at].name : r.ammo };
}
/** An attack with a reloading weapon uses a shot. */
async function weaponFired(wi) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const m = buildModel(snap);
  const w = arr(m.c.weapons)[wi];
  const s = w && weaponShots(m, w);
  if (!s) return;
  const st = itemStateOf(snap.key);
  st.shots = { ...(st.shots || {}), [w.name]: Math.min(s.shots, s.used + 1) };
  await saveItemStateFor(snap.key, st);
  refreshTracked();
  if (s.used + 1 >= s.shots) setStatus(`${w.name}: that was the last shot. Reload it (an action or a bonus action).`, '', false, [{ act: 'reload', arg: String(wi), label: `Reload (${s.cells} ${s.cellName}${s.cells === 1 ? '' : 's'} left)` }]);
}
async function weaponAmmo(op, wi) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const m = buildModel(snap);
  const w = arr(m.c.weapons)[num(wi)];
  const s = w && weaponShots(m, w);
  if (!s) return;
  const st = itemStateOf(snap.key);
  if (op === 'shot') {
    st.shots = { ...(st.shots || {}), [w.name]: clamp(s.used + 1, 0, s.shots) };
    await saveItemStateFor(snap.key, st);
    return refreshTracked();
  }
  // Reload: one cell (or cartridge) from the inventory, all shots back.
  const st2 = { ...(st.shots || {}) };
  delete st2[w.name];
  st.shots = st2;
  await saveItemStateFor(snap.key, st);
  if (s.at >= 0) {
    const items = shownItems(snap, 'equipment');
    const e = items[s.at];
    if (qtyOf(e) > 1) e.quantity = qtyOf(e) - 1; else items.splice(s.at, 1);
    await setEditedFields(snap, { equipment: items });
    return setStatus(`${w.name} reloaded: ${s.shots} shots; ${s.cells - 1} ${s.cellName}${s.cells - 1 === 1 ? '' : 's'} left.`);
  }
  refreshTracked();
  setStatus(`${w.name} reloaded (${s.shots} shots). No ${s.ammo.toLowerCase()} in your inventory to take it from.`);
}

/** Worn armor and shields: their Stealth disadvantage and speed penalties (Strength N, Cumbersome). */
function armorEffectsOf(m) {
  const worn = arr(m.c.equipment).filter((e) => e.equipped && e.equipmentCategory === 'Armor').map((e) => ({ ...e, properties: itemPropsOf(m, e.index, e.properties) }));
  return invArmorEffects(worn, num(((m.c.abilityScores || {}).Strength || {}).value ?? ((m.c.abilityScores || {}).Strength || {}).score));
}

// price: '' = the standard price × quantity; pay: take it from credits (off: found, looted, given…)
// ------------------------------------------------------------- consumables & effects
const CONSUMABLE_CATS = ['Explosive', 'Ammunition', 'Spice', 'AlcoholicBeverage'];

/**
 * How an item is used: consumable? charges ("has five charges", "three uses"; some regain
 * them)? its effect on whoever it's used on (effects.js)? healing to roll? Null if it has no use.
 */
function itemUse(ref, raw) {
  if (!ref) return null;
  const text = String(ref.text || ref.description || '').replace(/\s+/g, ' ');
  const ch = /\b(?:has|with) (\w+) (?:charges|uses)\b/i.exec(text);
  // The class items: "This item can hold a number of charges equal to half your fighter level (rounded up)".
  const cl = /\bcan hold a number of charges equal to half your (\w+) level \(rounded up\)/i.exec(text);
  const clsLevel = cl && raw ? num((arr(raw.classes).find((k) => String(k.name).toLowerCase() === cl[1].toLowerCase()) || {}).levels) : 0;
  const charges = ch && fxNum(ch[1]) ? { max: fxNum(ch[1]), recharges: /regains? [^.]*charges|charges are regained/i.test(text) }
    : clsLevel ? { max: Math.ceil(clsLevel / 2), recharges: true } : null;
  const consumable = ref.type === 'Consumable' || CONSUMABLE_CATS.includes(ref.equipmentCategory) || /^(medpac|poison|emergency rations)/i.test(ref.name || '');
  if (!consumable && !charges) return null;
  const fx = itemEffectOf(ref);
  // Healing on the spot (a medpac) isn't an effect that lasts: nothing to list under Effects.
  const effect = fx && fx.activation === 'use' && (fx.mods.length || fx.duration || (fx.notes.length && !fx.heals)) ? fx : null;
  // Medpacs and repair kits: "The creature rolls two dice equal to the size of their Hit Die and regains hit points equal
  // to the amount rolled + their Constitution modifier (minimum of one hit point)". No Hit Die is spent.
  const hd = /\brolls (\w+) (?:die|dice) equal to the size of their Hit Die\b/i.exec(text);
  const hdRoll = hd && fxNum(hd[1]) ? { count: fxNum(hd[1]) } : null;
  // Vitapacs: "The creature immediately regains two Hit Dice."
  const back = /\bregains (\w+) Hit Dice\b/i.exec(text);
  return { consumable, charges, effect, hdRoll, hdBack: back ? fxNum(back[1]) : 0,
    heals: !!(fx && fx.heals) || /regains? [^.]*hit points|temporary hit points/i.test(text), text };
}

/** A temporary effect from an item (bonuses are resolved, and capped, when applied). */
function makeEffect(ref, fx, source, weaponName) {
  // "…increases their current and maximum tech points by 2d4": rolled now, kept for as long as it lasts.
  const mods = arr(fx.mods).map((x) => {
    const p = x.rollBonus && parseDice(x.rollBonus);
    if (!p) return x;
    const n = p.dice.reduce((s, d) => s + d.sign * rollDie(d.sides), 0) + p.mod;
    return { ...x, bonus: n, label: `${x.label.replace(/\s*\+\d*d\d+.*$/, '')} +${n} (${x.rollBonus} rolled)` };
  });
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'temporary', name: ref.name, source,
    startedAt: Date.now(), duration: fx.duration, group: fx.group, mods, notes: fx.notes,
    target: fx.target, weaponName: weaponName || null, text: ref.text || ref.description || '',
    // A spice's high: a die the dice card offers on some rolls while it lasts.
    ...(fx.riders ? { riders: fx.riders } : {}),
  };
}
/** Start an effect; "only one stimpac/adrenal at a time" replaces the older one. Returns those replaced. */
function startEffect(st, eff) {
  if (st.combat) eff.startRound = st.combat.round;
  const replaced = eff.group ? st.effects.filter((e) => e.group === eff.group) : [];
  st.effects = st.effects.filter((e) => !replaced.includes(e)).concat(eff);
  return replaced;
}

async function saveItemStateFor(key, st) {
  st.updatedAt = Date.now();
  if (!Object.keys(st.charges || {}).length && !arr(st.effects).length && !Object.keys(st.targets || {}).length
    && !Object.keys(st.reasons || {}).length && !st.combat && !arr(st.foretell).length && !st.frenzy
    && !Object.keys(st.shots || {}).length && !Object.keys(st.keepTweaks || {}).length && !Object.keys(st.stackAnyway || {}).length && !Object.keys(st.toolPicks || {}).length && !Object.keys(st.itemPicks || {}).length && !Object.keys(st.inUse || {}).length && !Object.keys(st.focusOn || {}).length) delete state.itemState[key];
  else state.itemState[key] = st;
  await saveItemState();
}

/** Use one item (or one charge of it): on the character itself ("me") or on someone else. */
async function useItem(arg) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const [list, idx, target] = String(arg).split('|');
  const m = buildModel(snap);
  const items = shownItems(snap, list);
  const it = items[Number(idx)];
  const entry = list === 'equipment' ? arr(m.c.equipment).find((e) => e.index === Number(idx) && e.isFound) : it;
  const info = itemUse(entry || (catalogIndex && catalogIndex.get(it && it.name)), m.raw);
  if (!it || !info) return;
  const st = itemStateOf(snap.key);
  let unitGone = !info.charges;
  let note = '';
  if (info.charges) {
    const used = num(st.charges[it.name]) + 1;
    if (used > info.charges.max) return setStatus(`${it.name} has no charges left.`, 'error');
    if (used >= info.charges.max && !info.charges.recharges) {
      delete st.charges[it.name];
      unitGone = true;
      note = ' That was its last charge.';
    } else {
      st.charges[it.name] = used;
      note = ` ${info.charges.max - used} of ${info.charges.max} charges left.`;
    }
  }
  if (unitGone) {
    const q = qtyOf(it) - 1;
    if (q > 0) it.quantity = q;
    else items.splice(Number(idx), 1);
  }
  let replaced = [];
  let weaponNote = '';
  const spentHd = m.t ? m.t.lim.hitDice.reduce((n, d) => n + num(m.t.s.hitDiceUsed[d.size]), 0) : 0;
  if (target === 'me' && info.effect) {
    const weapon = info.effect.target === 'weapon' ? (ownWeapons(m.raw).find((w) => w.it.equipped) || ownWeapons(m.raw)[0]) : null;
    replaced = startEffect(st, makeEffect(entry || it, info.effect, 'used', weapon && weapon.it.name));
    if (info.effect.target === 'weapon') weaponNote = weapon ? ` Applied to your ${weapon.it.name}; change it under Effects.` : ' Choose the weapon under Effects.';
  }
  state.useMenu = null;
  await saveItemStateFor(snap.key, st);
  if (unitGone) await setEditedFields(snap, { [list]: items });
  else { renderAll(); scheduleRecompute(snap.key); }
  // A vitapac on yourself: the hit dice come back on the tracker (undo gives them back to the vitapac's roll).
  let hdNote = '';
  if (target === 'me' && info.hdBack && m.t) {
    if (spentHd) {
      await trackerAction('hdback', String(info.hdBack));
      hdNote = state.undo ? ` ${state.undo.label}.` : '';
    } else hdNote = ' You had no spent hit dice, so none came back.';
  }
  const dice = (n) => (n === 1 ? 'one die' : `${n} dice`);
  const who = target === 'other' ? ' on someone else' : target === 'me' ? ' on yourself' : '';
  const blocked = target === 'me' ? blockedBySetTweak(m, info.effect) : [];
  setStatus(`Used ${it.name}${who}.${note}${weaponNote}${hdNote}${replaced.length ? ` It replaces ${replaced.map((e) => e.name).join(', ')} (only one at a time).` : ''}`
    + (blocked.length ? ` ${blocked.join('; ')}: this ${it.name} won't change it (change the tweak to "bump to" or "add" if it should).` : '')
    + (target === 'me' && info.hdRoll ? ` Its healing (${dice(info.hdRoll.count)} the size of your Hit Die + your Constitution modifier) is rolled in the dice roller: Heal puts it on your hit points.`
      : target === 'other' && info.hdRoll ? ` They regain ${dice(info.hdRoll.count)} the size of their Hit Die + their Constitution modifier in hit points (at least 1).`
        : target === 'me' && info.heals ? ' Roll its healing, then enter it under Combat & Vitals → Heal.' : ''));
  // A medpac or repair kit on yourself: roll it right away (no Hit Die is spent).
  if (target === 'me' && info.hdRoll && m.t) startRoll(`itemheal|${info.hdRoll.count}|${it.name}`, { now: true });
  else if (target === 'me' && info.heals && $('#trackAmount')) $('#trackAmount').focus();
}

async function rechargeItem(arg) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const [list, idx] = String(arg).split('|');
  const it = shownItems(snap, list)[Number(idx)];
  const st = itemStateOf(snap.key);
  if (!it || !num(st.charges[it.name])) return;
  st.charges[it.name] = num(st.charges[it.name]) - 1;
  if (!st.charges[it.name]) delete st.charges[it.name];
  await saveItemStateFor(snap.key, st);
  renderAll();
}

/** Apply an item's effect without having or using the item (e.g. someone else used it on you). */
async function receiveEffect(name) {
  const snap = state.snapshots[state.current];
  const ref = catalogIndex && catalogIndex.get(name);
  const info = itemUse(ref);
  if (!snap || !info || !info.effect) return;
  const st = itemStateOf(snap.key);
  const m = buildModel(snap);
  const weapon = info.effect.target === 'weapon' ? (ownWeapons(m.raw).find((w) => w.it.equipped) || ownWeapons(m.raw)[0]) : null;
  const replaced = startEffect(st, makeEffect(ref, info.effect, 'received', weapon && weapon.it.name));
  state.effDraft = { name: '', hi: 0 };
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(`${ref.name} is now active.${replaced.length ? ` It replaces ${replaced.map((e) => e.name).join(', ')} (only one at a time).` : ''}`);
}

async function endEffect(id) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  const eff = st.effects.find((e) => e.id === id);
  if (!eff) return;
  const undo = rememberForUndo(snap.key, `${eff.name} ended`, true);
  st.effects = st.effects.filter((e) => e !== eff);
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  if (eff.exhaustOnEnd) await trackerAction('exh', String(eff.exhaustOnEnd));
  setStatus(`${eff.name} has ended.${eff.exhaustOnEnd ? ' Frenzy: one level of exhaustion.' : ''}`, '', false, undo);
}

/** "Your own effect": a temporary effect with a name, a duration and one bonus (or none: a reminder). */
async function addCustomEffect() {
  const snap = state.snapshots[state.current];
  const name = ($('#fxcName') || {}).value || '';
  if (!snap || !name.trim()) return setStatus('Give the effect a name.', 'error');
  const path = ($('#fxcPath') || {}).value || '';
  const bonus = Math.trunc(Number(String(($('#fxcBonus') || {}).value || '').replace(/^[−–]/, '-').replace(/^\+/, '')));
  if (path && !Number.isFinite(bonus)) return setStatus('Enter the bonus as a number, e.g. 1 or -2.', 'error');
  const label = path ? `${fxTweakName(path)} ${bonus >= 0 ? '+' : '−'}${Math.abs(bonus)}` : '';
  const st = itemStateOf(snap.key);
  startEffect(st, {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'temporary', source: 'custom', name: name.trim(),
    startedAt: Date.now(), duration: (($('#fxcDur') || {}).value || '').trim(), group: null, target: 'self', notes: path ? [] : [name.trim()],
    mods: path && bonus ? [{ path, bonus, label }] : [],
  });
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(`${name.trim()} is now active${label ? ` (${label})` : ''}. End it under Effects.`);
}

/**
 * Switch on one of an item's modes ("You can choose from the following types of adrenals", Automated Adrenal
 * Package): a temporary effect read from the mode's text, lasting as the item says, replacing the item's other mode
 * ("until a different adrenal is chosen").
 */
async function startItemMode(arg) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const [id, i] = String(arg).split(/\|(?=\d+$)/);
  const e = buildModel(snap).effects.find((x) => x.id === id);
  const mode = e && arr(e.modes)[num(i)];
  if (!mode) return;
  const fx = parseItemEffect({ name: mode.name, type: 'Consumable', text: mode.text }) || { mods: [], notes: [], target: 'self' };
  const st = itemStateOf(snap.key);
  const replaced = startEffect(st, makeEffect({ name: `${mode.name} (${e.name})`, text: mode.text },
    { ...fx, notes: fx.notes.length ? fx.notes : [mode.text], duration: e.duration || fx.duration, group: `mode:${e.name}` }, 'used'));
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(`${mode.name} is on${e.duration ? ` for ${e.duration}` : ''}${replaced.length ? ` (instead of ${replaced.map((x) => x.name).join(', ')})` : ''}. End it under Effects.`);
}
/** What an item's choice is (a weapon proficiency of your choice): kept per item copy (itemState.itemPicks). */
async function setItemPick(id, name) {
  const snap = state.snapshots[state.current];
  if (!snap || !id.startsWith('item:')) return;
  const st = itemStateOf(snap.key);
  st.itemPicks = { ...(st.itemPicks || {}) };
  if (name) st.itemPicks[id.slice(5)] = [name];
  else delete st.itemPicks[id.slice(5)];
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
}
/** Whether the item a modification is in is used as your focus (itemState.focusOn, per item copy). */
async function setItemFocus(id, on) {
  const snap = state.snapshots[state.current];
  if (!snap || !id.startsWith('item:')) return;
  const st = itemStateOf(snap.key);
  st.focusOn = { ...(st.focusOn || {}) };
  if (on) st.focusOn[id.slice(5)] = true;
  else delete st.focusOn[id.slice(5)];
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
}
/** Whether something a feature needs is in use ("using your biochemist's pack as a tech focus"): itemState.inUse. */
async function setInUse(label, on) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  st.inUse = { ...(st.inUse || {}) };
  if (on) st.inUse[label] = true;
  else delete st.inUse[label];
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
}
/** Which tool a Tool (Basic…Champion) item is ("these tools"): kept per item copy (itemState.toolPicks). */
async function setItemTool(id, name) {
  const snap = state.snapshots[state.current];
  if (!snap || !id.startsWith('item:')) return;
  const st = itemStateOf(snap.key);
  st.toolPicks = { ...(st.toolPicks || {}) };
  if (name) st.toolPicks[id.slice(5)] = name;
  else delete st.toolPicks[id.slice(5)];
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
}
/** Which weapon an effect's weapon bonus applies to: an item's (by item name) or a temporary effect's. */
async function setEffectWeapon(id, weaponName) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  if (id.startsWith('item:')) {
    st.targets = { ...(st.targets || {}) };
    if (weaponName) st.targets[id.slice(5)] = weaponName;
    else delete st.targets[id.slice(5)];
  } else {
    const eff = st.effects.find((e) => e.id === id);
    if (!eff) return;
    eff.weaponName = weaponName || null;
  }
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
}

let effectItems = null; // catalog items with an effect on whoever uses them (cached per catalog)
function effectSuggestions() {
  const d = state.effDraft || { name: '' };
  const q = String(d.name).trim().toLowerCase();
  if (!q || !state.catalog) return [];
  if (!effectItems || effectItems.catalog !== state.catalog) {
    effectItems = { catalog: state.catalog, items: state.catalog.items.filter((it) => { const u = itemUse(it); return u && u.effect; }) };
  }
  const hits = effectItems.items.filter((it) => it.name.toLowerCase().includes(q));
  hits.sort((a, b) => (b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name));
  return hits;
}
function renderEffectSuggestions() {
  if (!state.catalog) {
    if (state.catalogError) return `<div class="sugg"><span class="ed-err">Could not load the SW5E item list: ${esc(state.catalogError)}</span> <button class="linklike" data-act="catalog-refresh">Try again</button></div>`;
    return ensureCatalog.pending ? '<div class="sugg"><span class="faint">Loading the SW5E item list…</span></div>' : '';
  }
  const d = state.effDraft || { name: '', hi: 0 };
  if (d.closed) return '';
  const hits = effectSuggestions();
  if (!hits.length) return String(d.name).trim() ? '<div class="sugg"><span class="faint">No SW5E item with an effect matches.</span></div>' : '';
  const hi = clamp(num(d.hi), 0, Math.min(hits.length, SUGGEST_MAX) - 1);
  return `<div class="sugg" role="listbox">${hits.slice(0, SUGGEST_MAX).map((it, i) => {
    const u = itemUse(it).effect;
    const what = u.mods.map((t) => t.label).concat(u.duration ? [u.duration] : []).join(' · ') || 'reminder';
    return `<button type="button" class="sugg-item${i === hi ? ' hi' : ''}" role="option" aria-selected="${i === hi}" data-act="eff-pick" data-arg="${esc(it.name)}"><span>${esc(it.name)}</span><span class="faint">${esc(what)}</span></button>`;
  }).join('')}${hits.length > SUGGEST_MAX ? `<div class="faint sugg-more">${hits.length - SUGGEST_MAX} more; keep typing to narrow it down</div>` : ''}</div>`;
}

/** One effect: its bonuses (as applied: capped ones show it), weapon choice, notes, End. */
function effectRow(m, e) {
  const applied = m.fx.tweaks.concat(m.fx.weaponTweaks).filter((t) => t.effect.id === e.id);
  // Another effect of the same name already applies (on the same weapon): this one doesn't stack, unless applied anyway.
  const dup = arr(m.fx.notStacking).find((x) => x.id === e.id);
  const left = dup && !dup.kept;
  // Infused armor not worn: its AC waits until it is.
  const unworn = infusedArmorOff(m.raw, e);
  const chips = arr(e.mods).map((mod) => {
    if (left) return chip(mod.label);
    if (unworn) return chip(`${mod.label}: only while you wear the ${e.name.replace(/^Infuse Item: /, '')}`, 'warn');
    if (mod.cond) return chip(`${mod.label} ${mod.cond}${mod.extraDamage ? `, +${mod.extraDamage} damage` : ''}`, e.kind === 'item' && !e.active ? '' : 'blue');
    const got = applied.filter((t) => t.mod === mod || (t.mod.path === mod.path && t.mod.label === mod.label));
    if (!e.active && e.kind === 'item') return chip(mod.label);
    // Extra damage dice: on the weapon chosen (shown in its damage and rolled with it).
    if (mod.dice) return arr(m.fx.dice).some((d) => d.effect.id === e.id && d.mod.path === mod.path) ? chip(mod.label, 'good') : chip(`${mod.label}: choose a weapon`, 'warn');
    // "+2 proficiency steps": the level it comes to ("mastery" counts as expertise, the highest the engine knows).
    if (mod.profSteps) {
      const lv = got.find((t) => t.level);
      return lv ? chip(`${mod.label.replace(/:.*$/, '')}: ${lv.level}${/mastery/.test(lv.level) ? ' (counted as expertise)' : ''}`, 'good')
        : chip(`${mod.label}: trained (a level the sheet doesn't count)`);
    }
    if (mod.halfProf && !got.length) return '';
    if (!got.length && mod.property) return chip(`${mod.label}: no change (it already uses the better one, or no weapon chosen)`);
    if (!got.length && mod.scoreAs) return chip(`${mod.label}: no effect (${mod.scoreAs.ability} ${mod.scoreAs.score} or more${mod.path === 'armorClass' ? `, or an AC without ${mod.scoreAs.ability}` : ''})`);
    if (!got.length && mod.when && !armorAllows(mod.when, armorState(m.raw))) return chip(`${mod.label}: not with armor on`);
    if (!got.length && arr(m.fx.setByTweak).some((t) => t.effect.id === e.id && t.mod.path === mod.path)) return chip(`${mod.label}: set by a tweak`);
    if (!got.length && mod.acFormula) return chip(`${mod.label}: another AC formula is better`);
    if (!got.length) return chip(`${mod.label}: no effect`, 'warn');
    const b = got.reduce((s, t) => s + t.bonus, 0);
    // Worked out from the scores ("AC 19 (base)", "AC as DEX 15"): the bonus it comes to.
    const worked = mod.set != null || mod.scoreAs || mod.acFlat != null || mod.abilityMod || mod.swap || mod.property;
    return chip(worked ? `${mod.label} (${signedLabel(b)})` : b === mod.bonus || mod.bonus == null ? mod.label : `${mod.label} → ${signedLabel(b)} (cap)`, 'good');
  });
  // Proficiencies, advantages and choices the item's text gives (as a feature's), and half proficiency on checks.
  if (e.kind === 'item') {
    const on = e.active ? 'good' : '';
    chips.push(...arr(e.weapons).map((w) => chip(`Proficient: ${w}`, on)), ...arr(e.armor).map((a) => chip(`Proficient: ${a}`, on)),
      ...arr(e.tools).map((t) => chip(`${t.name}: ${t.level}`, on)), ...arr(e.advantage).map((a) => chip(ADV_TEXT(a), on)),
      ...arr(e.halfProfChecks).map((a) => chip(`Half proficiency on ${a} checks without it`, on)), ...(e.unarmedDie ? [chip(`Unarmed strikes: d${e.unarmedDie}${e.unarmedType ? ` ${e.unarmedType}` : ''}`, on)] : []),
      ...arr(e.needsChoice).map((c) => `<span class="chip warn" title="Write your choice in the item's note (✎ under Equipment)">Choose ${esc(c)}</span>`));
  }
  // Properties it gives (on the weapon chosen or the armor worn): "brutal 2", "strength 13", "smart (15, +2)".
  if (e.kind === 'item' && e.props) {
    chips.push(...(e.propsNow ? Object.entries(e.propsNow).map(([n, v]) => chip(n === 'smart' ? `smart (${v[0]}, +${v[1]})` : n === 'strength' && !v ? 'no strength requirement'
      : v === true ? n : `${n} ${v}`, e.active ? 'good' : '')) : [chip(e.target === 'weapon' ? 'choose a weapon' : 'no armor worn', 'warn')]));
  }
  // Modes to switch on (Automated Adrenal Package's adrenals): each starts as a temporary effect.
  if (e.kind === 'item' && e.active && e.modes) chips.push(...e.modes.map((x, i) => `<button class="btn sm" data-act="fx-mode" data-arg="${esc(e.id)}|${i}" title="${esc(x.text)}">${esc(x.name)}</button>`));
  // A choice the item's text asks for (Resourceful Drive's "one blaster or vibroweapon of your choice"): a picker.
  if (e.kind === 'item') {
    for (const a of arr(e.asks).filter((x) => ['weapon', 'skill', 'tool'].includes(x.kind) && x.count === 1)) {
      const cur = arr(e.picked).find((p) => askOptions(m, a).includes(p)) || a.chosen[0] || '';
      chips.push(`<label class="fx-weapon${cur ? '' : ' warn-text'}">${esc(a.label.toLowerCase())} <select data-fxpick="${esc(e.id)}"><option value="">choose…</option>${askOptions(m, a).map((n) => `<option${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`);
    }
  }
  // "While using this item as your focus": ticked here.
  if (e.kind === 'item' && e.asFocus) chips.push(`<label class="fx-weapon"><input type="checkbox" data-asfocus="${esc(e.id)}"${e.asFocusOn ? ' checked' : ''}> used as your focus</label>`);
  // Tool (Basic…Champion): which tool it is, picked here; the level it comes to.
  if (e.kind === 'item' && e.toolSteps) {
    const names = [...new Set(bdTools().map((x) => x.name))].sort();
    const cur = e.toolPick ? e.toolPick.name : '';
    chips.push(`<label class="fx-weapon${cur ? '' : ' warn-text'}">tool <select data-fxtool="${esc(e.id)}"><option value="">choose the tool…</option>${names.map((n) => `<option${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`);
    // (proficient and expertise show with the other tools above)
    if (e.toolPick && (e.toolPick.level === 'trained' || /mastery/.test(e.toolPick.level))) {
      chips.push(chip(`${e.toolPick.name}: ${e.toolPick.level}${e.toolPick.level === 'trained' ? " (a level the sheet doesn't count)" : ' (counted as expertise)'}`, e.active && e.toolPick.level !== 'trained' ? 'good' : ''));
    }
  }
  // A set's bonuses still to come ("AC +1 (with Jensaarai Cloak)"), and a piece that takes no attunement slot.
  if (e.kind === 'item') chips.push(...arr(e.setPending).map((x) => chip(`${x.label}: not yet`)), ...(e.freeAttune ? [chip('takes no attunement slot (set)', 'good')] : []));
  // A class augment: the class table numbers it changes ("Rage Damage +2 → +3").
  if (e.kind === 'item') chips.push(...arr(e.classChanges).map((x) => chip(`${x.col} ${x.from} → ${x.to}`, e.active ? 'good' : '')),
    ...(e.classBoosts && !arr(e.classChanges).length ? [chip(`for a ${e.classBoosts.cls}: no change here`)] : []));
  // A keen modification: the weapon's critical range (the dice card's attack rolls use it).
  if (e.kind === 'item' && e.keen) chips.push(e.critRange ? chip(`Keen ${e.critRange}: critical range +${e.critRange}`, e.active ? 'good' : '') : chip(`Keen ${e.keen.gain}: choose a weapon`, 'warn'));
  const weapons = ownWeapons(m.raw);
  // (Its base not equipped while it is: its numbers and options have no weapon roll to go on; equipping either sets both.)
  const baseOff = e.target === 'weapon' && e.linked && e.active && !(arr(m.raw.equipment)[e.weaponIndex] || {}).equipped;
  const weaponPick = e.target === 'weapon' && e.linked ? `<span class="faint">on its ${esc(e.weaponName)}</span>${baseOff ? chip(`its ${e.weaponName} isn't equipped`, 'warn') : ''}` : e.target === 'weapon' ? `<label class="fx-weapon">on <select data-fxweapon="${esc(e.id)}">
      <option value="">choose a weapon…</option>${weapons.map((w) => `<option${w.it.name === e.weaponName ? ' selected' : ''}>${esc(w.it.name)}</option>`).join('')}</select></label>` : '';
  // An item's effect (carried, or a consumable used or received) shows the item.
  const ref = catalogIndex && !['power', 'feature', 'custom'].includes(e.source) ? catalogIndex.get(e.name) : null;
  const on = dup && dup.weaponIndex != null ? ` on the same ${(arr(m.raw.equipment)[dup.weaponIndex] || {}).name || 'weapon'}` : '';
  const dupNote = !dup ? '' : dup.kept
    ? `<div class="warn-text tw-twin">Applied as you chose, on top of the other ${esc(e.name)}${esc(on)}: effects with the same name normally don't stack. <button class="linklike" data-act="fx-stack" data-arg="${esc(e.id)}">Leave it out</button></div>`
    : `<div class="warn-text tw-twin"><span class="chip warn">not applied</span> Another ${esc(e.name)}${esc(on)} already applies, and effects with the same name don't stack: only one counts. <button class="linklike" data-act="fx-stack" data-arg="${esc(e.id)}">Apply it anyway</button> if your GM allows it.</div>`;
  return `<div class="eff${(e.kind === 'item' && !e.active) || left ? ' off' : ''}">
    <div class="eff-head">${ref ? itemTile(ref, 'sm') : ''}<b>${esc(e.name)}</b>${chips.join('')}${weaponPick}
      <span class="faint">${esc(effectWhen(e))}</span>
      ${e.kind === 'item' ? '' : `<button class="btn sm" data-act="effect-end" data-arg="${esc(e.id)}" title="The effect has worn off">End</button>`}</div>
    ${dupNote}
    ${arr(e.notes).length ? `<ul class="eff-notes">${e.notes.map((n) => `<li>${md(n).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>` : ''}
    ${e.counter ? `<div class="eff-count">${esc(e.counter.label)}: <b>${e.counter.max - num(e.counter.used)}</b>/${e.counter.max}
      <button class="btn sm" data-act="fx-count" data-arg="${esc(e.id)}" ${e.counter.max - num(e.counter.used) > 0 ? '' : 'disabled'} title="Use one (and roll ${esc(e.counter.power || '')})">Use one</button></div>` : ''}
  </div>`;
}
/** Use one of an effect's special reactions (Mynock: Saber Reflect), and roll it. */
async function effectCount(id) {
  const snap = state.snapshots[state.current];
  const st = snap && itemStateOf(snap.key);
  const e = st && st.effects.find((x) => x.id === id);
  if (!e || !e.counter || e.counter.used >= e.counter.max) return;
  e.counter.used = num(e.counter.used) + 1;
  await saveItemStateFor(snap.key, st);
  renderAll();
  const p = e.counter.power && rulesPower(e.counter.power);
  if (p && plPowerRolls(p, 0, charLevel(buildModel(snap))).length) startRoll(`pdmg|force|${p.name}|0|0`);
  setStatus(`${e.counter.label}: ${e.counter.max - e.counter.used} left.`);
}

/** Effects on the character: from items carried, and temporary ones (with "Add an effect"). */
function renderEffects(m) {
  const items = itemEffects(m.snap.key, m.raw, effectsBasis(m.snap, m.raw));
  const temps = tempEffects(m.snap.key);
  const on = items.filter((e) => e.active);
  const off = items.filter((e) => !e.active);
  // One row per feature: the parts of one (Ideal of the Contender's unarmed die and its other numbers) together.
  const feats0 = m.fx.effects.filter((e, i, all) => e.kind === 'feature' && all.findIndex((x) => x.id === e.id) === i);
  const feats = feats0.filter((e, i) => feats0.findIndex((x) => x.name === e.name && (x.origin || '') === (e.origin || '')) === i)
    .map((e) => ({ e, also: feats0.filter((x) => x !== e && x.name === e.name && (x.origin || '') === (e.origin || '')) }))
    .map(({ e, also }) => (also.length ? { ...e, ...Object.fromEntries(['mods', 'weapons', 'tools', 'armor', 'advantage', 'defenses', 'needsChoice'].map((k) => [k, [e, ...also].flatMap((x) => arr(x[k]))])),
      critRange: Math.max(...[e, ...also].map((x) => num(x.critRange))), halfProf: [e, ...also].some((x) => x.halfProf), unarmedStep: Math.max(...[e, ...also].map((x) => num(x.unarmedStep))),
      unarmedDie: Math.max(...[e, ...also].map((x) => num(x.unarmedDie))), unarmedFinesse: [e, ...also].some((x) => x.unarmedFinesse) } : e));
  // "Only while using your biochemist's pack as a tech focus": the player says whether it is (a modified item the sheet
  // carries: its Equipped).
  const inUseBox = (e) => (e.inUse && !e.inUse.byItem ? `<label class="fx-weapon"><input type="checkbox" data-inuse="${esc(e.inUse.key)}"${e.inUse.on ? ' checked' : ''}> ${esc(e.inUse.label)}</label>` : '');
  const featRow = (e) => `<div class="eff"><div class="eff-head"><b>${esc(e.name)}</b>${inUseBox(e)}${e.unarmedDie ? chip(`Unarmed strike d${e.unarmedDie}${e.unarmedFinesse ? ', finesse' : ''}`, 'good') : ''}
      ${arr(e.mods).map((x) => (x.cond ? chip(`${x.label} ${x.cond}`, 'blue') : chip(x.label, 'good'))).join('')}${arr(e.weapons).map((w) => chip(`Proficient: ${w}`, 'good')).join('')}
      ${arr(e.tools).map((t) => chip(`${t.name}: ${t.level}`, 'good')).join('')}${arr(e.armor).map((a) => chip(`Proficient: ${a}`)).join('')}
      ${arr(e.advantage).map((a) => chip(ADV_TEXT(a), 'good')).join('')}${e.critRange ? chip(`Critical on ${20 - e.critRange}–20`, 'good') : ''}
      ${e.halfProf ? chip(`Half proficiency on ${halfProfWhich(e)}checks`, 'good') : ''}${e.unarmedStep ? chip('Unarmed die +1 step', 'good') : ''}
      ${arr(e.defenses).map((d) => chip(d.text)).join('')}
      ${arr(e.needsChoice).map((c) => `<span class="chip warn" title="${esc(e.origin === 'feat' ? "Choose it on the feat's card (Feats)" : e.origin === 'species trait' ? "Choose it on the trait's card (Species)" : "Choose it on the feature's card (Class Features)")}">Choose ${esc(c)}</span>`).join('')}
      <span class="faint">${esc(e.why)}</span></div></div>`;
  // "From class features, feats and species traits": what the list holds.
  const origins = ['class feature', 'feat', 'species trait'].filter((o) => feats.some((e) => (e.origin || 'class feature') === o)).map((o) => `${o}s`);
  const fromWhat = origins.length > 1 ? `${origins.slice(0, -1).join(', ')} and ${origins[origins.length - 1]}` : origins[0];
  return `${feats.length ? `<details class="eff-feats"${feats.some((e) => arr(e.needsChoice).length) ? ' open' : ''}><summary><h4>From ${esc(fromWhat)} (${feats.length})</h4></summary>${feats.map(featRow).join('')}</details>` : ''}
    ${on.length ? `<h4>From equipment</h4>${on.map((e) => effectRow(m, e)).join('')}` : ''}
    <h4>Temporary</h4>
    ${temps.map((e) => effectRow(m, e)).join('') || '<p class="empty" style="margin:0 0 8px">No temporary effects.</p>'}
    <div class="add-row eff-add"><span class="add-name"><input data-eff="name" value="${esc((state.effDraft || {}).name || '')}" placeholder="Add an effect someone gave you, e.g. a stim…" autocomplete="off" aria-label="Add an effect">
      ${live('effsugg', m)}</span></div>
    <details class="eff-custom"><summary>Your own effect (something the sheet doesn't know)…</summary>
      <div class="add-row"><input id="fxcName" placeholder="Name, e.g. Bless from Ana" aria-label="Effect name">
        <input id="fxcDur" placeholder="Lasts, e.g. 1 minute" aria-label="How long it lasts">
        <select id="fxcPath" aria-label="What it changes"><option value="">No number (a reminder)</option>${tweakTargetOptions(tweakTargets(m).filter(([p]) => !/^weapon@/.test(p)))}</select>
        <input id="fxcBonus" type="text" inputmode="numeric" placeholder="+1" aria-label="Bonus" style="width:60px">
        <button class="btn sm primary" data-act="fx-custom">Add</button></div>
      <p class="faint" style="font-size:12px;margin:4px 0 0">It's applied like any effect (a dice bonus like Bless's d4 isn't a number: add it in the roller), and ends with End, a rest or Next round when it has run out.</p></details>
    ${off.length ? `<details class="eff-off"><summary>${plural(off.length, 'item')} with effects not in use</summary>${off.map((e) => effectRow(m, e)).join('')}</details>` : ''}
    <p class="faint" style="font-size:12px;margin:8px 0 0">Bonuses are applied to the sheet's numbers in this browser only (not saved to SW5E); changed numbers are underlined: hover or tap them for details. Conditional bonuses and other effects are listed as notes. End temporary effects when they wear off in-game.</p>`;
}

const ADD_DEFAULTS = { cat: 'all', name: '', qty: '1', equip: false, attune: false, pay: false, price: '', hi: 0,
  disc: '', from: '', etype: '', rarity: '', custom: false, cw: '', cc: '', cd: '', base: '' };
const SUGGEST_MAX = 12;
const ADD_CATS = { all: 'All items', Weapon: 'Weapons', Armor: 'Armor', gear: 'Adventuring gear', packs: 'Equipment packs', enhanced: 'Enhanced items' };
const ENH_TYPES = ['Weapon', 'Armor', 'Shield', 'Focus', 'Consumable', 'AdventuringGear', 'CyberneticAugmentation', 'DroidCustomization', 'ItemModification'];
const inAddCat = (it, cat) => (it.pack ? cat === 'all' || cat === 'gear' || cat === 'packs' : cat === 'all' || (cat === 'enhanced' ? isEnhanced(it)
  : !isEnhanced(it) && (cat === 'gear' ? !['Weapon', 'Armor'].includes(it.equipmentCategory) : it.equipmentCategory === cat)));
const itemKind = (it) => (it.pack ? ['Equipment pack'] : isEnhanced(it) ? [titleCase(it.type), invRarityText(it)] : [titleCase(it.equipmentCategory)]).filter(Boolean).join(' · ');

/** SW5E's equipment packs (from the handbook's Equipment chapter), as items to add: { name, pack, cost, text }. */
const equipmentPacks = () => rulesModule('equipmentPacks').map((p) => ({ name: p.name, pack: true, cost: prPackCost(p.text), text: p.text }));
const packByName = (name) => {
  const n = String(name || '').toLowerCase().replace(/[’']/g, "'").replace(/^an?\s+/, '').trim();
  return equipmentPacks().find((p) => p.name.toLowerCase() === n) || null;
};
/** A pack's contents as inventory entries: [{ list: 'equipment' | 'customEquipment', entry }]. */
const packEntries = (pack, times = 1) => prPackContents(pack.text, state.catalog ? state.catalog.items : []).map((x) => (x.item
  ? { list: 'equipment', entry: { name: x.item, quantity: x.qty * times, category: 'Equipment' } }
  : { list: 'customEquipment', entry: { name: x.custom, quantity: x.qty * times, equipmentCategory: 'Gear' } }));
/** Add entries to an item list, onto an entry of the same name when there is one. */
function mergeInto(list, entry) {
  const same = list.find((x) => x.name === entry.name && !x.enhancedBy);
  if (same) { same.quantity = qtyOf(same) + qtyOf(entry); if (entry.paid) same.paid = num(same.paid) + num(entry.paid); return same; }
  list.push(entry);
  return entry;
}
/** A credits change with its line in the history (the last 50). */
const creditLogWith = (raw, delta, balance, note) => arr(raw.creditLog).concat({ at: Date.now(), delta, balance, note: note || '' }).slice(-50);

/** The credits box under Equipment: a new amount, or +n / -n. */
async function adjustCredits(input, noteInput) {
  const snap = state.snapshots[state.current];
  if (!snap || !input) return;
  const t = input.value.replace(/[\s,]/g, '').replace(/^[−–]/, '-').replace(/cr$/i, '');
  if (!t) return;
  if (!/^[+-]?\d+$/.test(t)) return setStatus('Credits: enter a whole number, or +n / −n to adjust.', 'error');
  const raw = withEdits(snap.raw, editedFields(snap.key));
  const cur = num(raw.credits);
  const v = (/^[+-]/.test(t) ? cur : 0) + parseInt(t, 10);
  if (v < 0) return setStatus(`Credits can't go below 0 (that would be ${v}).`, 'error');
  const note = noteInput ? noteInput.value.trim() : '';
  const undo = rememberForUndo(snap.key, 'credits change');
  await setEditedFields(snap, { credits: v, creditLog: creditLogWith(raw, v - cur, v, note) });
  setStatus(`Credits ${fmtNum(cur)} → ${fmtNum(v)} cr${note ? ` (${note})` : ''}.`, '', false, undo);
}

/** Debts and the credits history, under the credits. */
function renderMoney(m) {
  const debts = arr(m.raw.debts);
  const log = arr(m.raw.creditLog).slice().reverse();
  const credits = num(m.raw.credits);
  const when = (at) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${debts.length ? `<div class="debts"><h3>Debts <span class="faint">(${fmtNum(debts.reduce((s, d) => s + num(d.amount), 0))} cr)</span></h3>
      ${debts.map((d) => `<div class="debt">Owe <b>${esc(d.to || 'someone')}</b> ${fmtNum(num(d.amount))} cr${d.note ? ` <span class="faint">for ${esc(d.note)}</span>` : ''}
        <button class="btn sm" data-act="debt-pay" data-arg="${esc(d.id)}" ${credits >= num(d.amount) ? '' : `disabled title="You have ${fmtNum(credits)} cr"`}>Pay back</button>
        <button class="btn sm" data-act="debt-drop" data-arg="${esc(d.id)}" title="Forgiven, or settled another way">Settled</button></div>`).join('')}</div>` : ''}
    ${log.length ? `<details class="credit-log" data-ui="credit-log"><summary>Credit history <span class="faint">(${log.length})</span></summary><ul>${log.map((l) => `<li><span class="faint">${esc(when(l.at))}</span>
      <b class="${l.delta < 0 ? 'bad-text' : 'good-text'}">${l.delta < 0 ? '−' : '+'}${fmtNum(Math.abs(num(l.delta)))} cr</b> → ${fmtNum(num(l.balance))} cr${l.note ? ` · ${esc(l.note)}` : ''}</li>`).join('')}</ul></details>` : ''}`;
}
async function debtAction(op, id) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const raw = withEdits(snap.raw, editedFields(snap.key));
  const d = arr(raw.debts).find((x) => x.id === id);
  if (!d) return;
  const debts = arr(raw.debts).filter((x) => x !== d);
  const undo = rememberForUndo(snap.key, op === 'pay' ? 'paying back' : 'debt settled');
  if (op === 'pay') {
    const cur = num(raw.credits);
    if (cur < num(d.amount)) return setStatus(`Not enough credits: ${fmtNum(num(d.amount))} cr needed, ${fmtNum(cur)} cr available.`, 'error');
    await setEditedFields(snap, { debts, credits: cur - num(d.amount), creditLog: creditLogWith(raw, -num(d.amount), cur - num(d.amount), `Paid back ${d.to || 'a debt'}`) });
    return setStatus(`Paid ${d.to || 'the debt'} back: ${fmtNum(num(d.amount))} cr.`, '', false, undo);
  }
  await setEditedFields(snap, { debts });
  setStatus(`Debt to ${d.to || 'someone'} settled.`, '', false, undo);
}

/** The add panel's price: the typed one, or the standard price × quantity less the discount. */
function addPrice(d, unit, qty) {
  if (String(d.price).trim() !== '') return String(d.price).replace(/[\s,]/g, '').replace(/cr$/i, '');
  const off = clamp(num(String(d.disc).replace('%', '')), 0, 100);
  return String(Math.round(unit * qty * (1 - off / 100)));
}
/**
 * Add what the panel describes: an SW5E item (with the base item of an enhanced weapon or armor), an equipment pack
 * (its contents), or a custom item. `owe`: when the credits fall short, 'all' pays what you have and owes the rest,
 * 'none' owes it all.
 */
async function addItemFromCatalog(owe) {
  const snap = state.snapshots[state.current];
  const d = state.addDraft || ADD_DEFAULTS;
  const fail = (msg, buttons = '') => {
    if (state.addDraft) { state.addDraft.closed = true; refreshTracked(['addsugg']); } // the list would cover the message
    const el = $('#addErr');
    if (el) { el.innerHTML = esc(msg) + buttons; el.hidden = false; }
  };
  if (!snap) return;
  const name = String(d.name).trim();
  const ref = catalogIndex && catalogIndex.get(name);
  const pack = !ref ? packByName(name) : null;
  const custom = !ref && !pack && d.custom && name;
  if (!ref && !pack && !custom) return fail(name ? 'Not in SW5E\'s list: choose a suggestion, or add it as a custom item.' : 'Type an item name first.');
  const qty = parseInt(d.qty, 10);
  if (!(qty >= 1)) return fail('Quantity must be 1 or more.');
  const m = buildModel(snap);
  const raw = withEdits(snap.raw, editedFields(snap.key));
  const items = shownItems(snap, 'equipment');
  const customs = shownItems(snap, 'customEquipment');
  const unit = ref ? priceOf(ref) : pack ? pack.cost : num(d.cc);
  // What it costs: nothing (found, looted), or the price paid (with a discount); a shortfall can be owed.
  let price = 0;
  if (d.pay) {
    const t = addPrice(d, unit, qty);
    if (!/^\d+$/.test(t)) return fail('Price: enter a whole number of credits (0 or more).');
    price = parseInt(t, 10);
  }
  const credits = num(raw.credits);
  let paidNow = price;
  let owed = 0;
  if (price > credits) {
    if (!owe) {
      return fail(`Not enough credits: ${fmtNum(price)} cr needed, ${fmtNum(credits)} cr available.`,
        ` <span class="add-owe">${credits > 0 ? `<button class="btn sm" data-act="add-owe" data-arg="all">Pay ${fmtNum(credits)} cr, owe ${fmtNum(price - credits)}</button>` : ''}<button class="btn sm" data-act="add-owe" data-arg="none">Owe all ${fmtNum(price)} cr</button></span>`);
    }
    paidNow = owe === 'all' ? credits : 0;
    owed = price - paidNow;
  }
  let what;
  if (ref) {
    const equippable = canEquip({ ...ref, isFound: true }, false);
    const attuneable = canAttune({ ...ref, isFound: true }, false) && !atAttuneLimit(m, ref);
    // Same item already carried: add to it rather than listing it twice (an enhanced weapon on a base stays apart).
    const same = !d.base && items.find((x) => x.name === ref.name && !x.enhancedBy);
    const entry = same || { name: ref.name, quantity: qty, category: isEnhanced(ref) ? 'EnhancedItem' : 'Equipment' };
    if (same) same.quantity = qtyOf(same) + qty; else items.push(entry);
    if (equippable && d.equip) entry.equipped = true; else if (equippable && !same) entry.equipped = false;
    if (attuneable && d.attune) entry.attuned = true; else if (attuneable && !same) entry.attuned = false;
    if (price) entry.paid = num(entry.paid) + price;
    if (d.base) linkBase(items, entry, d.base);
    what = `${qty} × ${ref.name}${entry.baseItem ? ` (on a ${entry.baseItem})` : ''}`;
  } else if (pack) {
    for (const x of packEntries(pack, qty)) mergeInto(x.list === 'equipment' ? items : customs, x.entry);
    what = `${qty > 1 ? `${qty} × ` : ''}${pack.name} (unpacked)`;
  } else {
    const entry = { name, quantity: qty, equipmentCategory: 'Gear', ...(d.cw !== '' ? { weight: num(d.cw) } : {}), ...(d.cc !== '' ? { cost: num(d.cc) } : {}), ...(String(d.cd).trim() ? { description: String(d.cd).trim() } : {}), ...(price ? { paid: price } : {}) };
    const same = customs.find((x) => x.name === name);
    if (same) mergeInto(customs, entry); else customs.push(entry);
    what = `${qty} × ${name} (custom)`;
  }
  const patch = { equipment: items, customEquipment: customs };
  if (paidNow || owed) patch.creditLog = creditLogWith(raw, -paidNow, credits - paidNow, `Bought ${what}${d.from ? ` from ${String(d.from).trim()}` : ''}${owed ? `; owe ${fmtNum(owed)} cr` : ''}`);
  if (paidNow) patch.credits = credits - paidNow;
  if (owed) patch.debts = arr(raw.debts).concat({ id: Date.now().toString(36), to: String(d.from).trim() || 'the seller', amount: owed, note: what, at: Date.now() });
  state.addDraft = { ...ADD_DEFAULTS, cat: d.cat, from: d.from };
  const undo = rememberForUndo(snap.key, `adding ${what}`);
  await setEditedFields(snap, patch);
  setStatus(`Added ${what}${price ? ` for ${fmtNum(price)} cr${owed ? ` (${fmtNum(paidNow)} paid, ${fmtNum(owed)} owed${d.from ? ` to ${String(d.from).trim()}` : ''})` : ''}` : ''}.`, '', false, undo);
}

/**
 * Tie an enhanced weapon or armor to its base item: `pick` 'own:<index>' (an item carried) or 'new:<name>' (adds it);
 * '' unties it. The base entry carries `enhancedBy` (the engine computes its numbers; the sheet shows them as the
 * enhanced item's), the enhanced one `baseItem`.
 */
function linkBase(items, enh, pick) {
  const old = invBaseIndex(items, items.indexOf(enh));
  if (old >= 0) {
    if (items[old].addedForBase) items.splice(old, 1);
    else { delete items[old].enhancedBy; delete items[old].baseLink; }
  }
  delete enh.baseItem;
  // The pair's own id, so copies of one enhanced item each keep their base.
  const link = enh.baseLink || (enh.baseLink = Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const [how, val] = String(pick || '').split(/:(.*)/s);
  if (how === 'own') {
    const it = items.find((x, i) => String(i) === val || x === items[Number(val)]);
    const base = items[Number(val)] || it;
    if (!base || base === enh) return;
    if (qtyOf(base) > 1) { // one of a stack becomes the enhanced one's
      base.quantity = qtyOf(base) - 1;
      items.push({ name: base.name, quantity: 1, category: base.category, equipped: !!enh.equipped, enhancedBy: enh.name, baseLink: link });
    } else Object.assign(base, { enhancedBy: enh.name, baseLink: link, equipped: !!enh.equipped });
    enh.baseItem = base.name;
  } else if (how === 'new' && val) {
    items.push({ name: val, quantity: 1, category: 'Equipment', equipped: !!enh.equipped, enhancedBy: enh.name, baseLink: link, addedForBase: true });
    enh.baseItem = val;
  }
}

/** The "Add an item" panel shown while editing Equipment. */
function renderAddItem(m) {
  const d = state.addDraft || (state.addDraft = { ...ADD_DEFAULTS });
  const info = state.catalogInfo;
  const enh = d.cat === 'enhanced' ? `<select data-add="etype" aria-label="Enhanced item type"><option value="">Any type</option>${ENH_TYPES.map((t) => `<option value="${t}"${d.etype === t ? ' selected' : ''}>${esc(titleCase(t))}</option>`).join('')}</select>
      <select data-add="rarity" aria-label="Minimum rarity"><option value="">Any rarity</option>${INV_RARITY_ORDER.map((r) => `<option value="${r}"${d.rarity === r ? ' selected' : ''}>${esc(invRarityText({ rarityText: r }))} or rarer</option>`).join('')}</select>` : '';
  return `<div class="add-item"><h3>Add an item</h3>
    <div class="add-row">
      <select data-add="cat" aria-label="Item category">${Object.entries(ADD_CATS).map(([v, t]) => `<option value="${v}"${d.cat === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>${enh}
      <span class="add-name"><input data-add="name" value="${esc(d.name)}" placeholder="Start typing an item name…" autocomplete="off" aria-label="Item name" aria-autocomplete="list">
        ${live('addsugg', m)}</span>
      <label class="add-qty">Qty <input data-add="qty" type="number" min="1" step="1" value="${esc(d.qty)}"></label>
      <button class="btn primary sm" data-act="inv-add">Add</button>
    </div>
    ${live('adddetail', m)}
    <p id="addErr" class="ed-err" hidden></p>
    ${state.catalog ? `<p class="faint add-src">${plural(state.catalog.items.length, 'item')} from SW5E (data version ${esc(state.catalog.dataVersion)}${info ? `, fetched ${esc(new Date(info.fetchedAt).toLocaleDateString())}` : ''}).
      <button class="linklike" data-act="catalog-refresh" title="Ask SW5E's data service whether it has a newer list">Check for a newer list</button></p>` : ''}
  </div>`;
}
/** Catalog items and packs matching every typed word (best matches first), in the chosen category and filters. */
function addSuggestions() {
  const d = state.addDraft || ADD_DEFAULTS;
  const q = String(d.name).trim();
  const keep = (it) => inAddCat(it, d.cat) && (d.cat !== 'enhanced' || ((!d.etype || it.type === d.etype) && invRarityAtLeast(it, d.rarity)));
  if (!state.catalog || (q && ((catalogIndex && catalogIndex.has(q)) || packByName(q)))) return [];
  // An empty box in a category other than All items (while it has the focus): the whole category, by name.
  if (!q) return d.cat !== 'all' && d.browse ? state.catalog.items.concat(equipmentPacks()).filter(keep).sort((a, b) => a.name.localeCompare(b.name)) : [];
  return invSearch(state.catalog.items.concat(equipmentPacks()), q, keep);
}
/**
 * The suggestions shown: the best few for what's typed; a whole category when browsing it, the list scrolling and
 * growing as it's scrolled (or arrowed) to its end (ADD_BROWSE_STEP rows at a time keeps 1900 enhanced items fast).
 */
const ADD_BROWSE_STEP = 120;
const addShown = (hits) => {
  const d = state.addDraft || ADD_DEFAULTS;
  return String(d.name).trim() ? hits.slice(0, SUGGEST_MAX) : hits.slice(0, Math.max(ADD_BROWSE_STEP, num(d.browseN)));
};
function renderAddSuggestions() {
  if (!state.catalog) {
    const d = state.addDraft || ADD_DEFAULTS;
    if (state.catalogError) return `<div class="sugg"><span class="ed-err">Could not load the SW5E item list: ${esc(state.catalogError)}</span> <button class="linklike" data-act="catalog-refresh">Try again</button></div>`;
    return ensureCatalog.pending || String(d.name).trim() ? '<div class="sugg"><span class="faint">Loading the SW5E item list…</span></div>' : '';
  }
  if ((state.addDraft || ADD_DEFAULTS).closed) return '';
  const hits = addSuggestions();
  const d0 = state.addDraft || ADD_DEFAULTS;
  const typed = String(d0.name).trim();
  const known = (catalogIndex && catalogIndex.has(typed)) || packByName(typed);
  const asCustom = typed && !known && !d0.custom ? `<button type="button" class="sugg-item sugg-custom" data-act="add-custom"><span>Add “${esc(typed)}” as a custom item</span><span class="faint">your own: weight, cost, description</span></button>` : '';
  if (!hits.length) return typed && !known && !d0.custom ? `<div class="sugg"><span class="faint">No SW5E item matches.</span>${asCustom}</div>` : '';
  const shown = addShown(hits);
  const hi = clamp(num(d0.hi), 0, shown.length - 1);
  const price = (it) => (it.pack ? it.cost : !isEnhanced(it) ? priceOf(it) : 0);
  return `<div class="sugg" role="listbox">${typed ? '' : `<div class="faint sugg-more">${plural(hits.length, 'item')} in ${esc(ADD_CATS[d0.cat] || d0.cat)}: type to narrow it down</div>`}${shown.map((it, i) => `<button type="button" class="sugg-item${i === hi ? ' hi' : ''}" role="option" aria-selected="${i === hi}"
      data-act="add-pick" data-arg="${esc(it.name)}"><span class="sugg-name">${it.pack ? '' : itemTile(it, 'sm', '', { inert: true })}${esc(it.name)}</span><span class="faint">${esc([itemKind(it), price(it) ? `${fmtNum(price(it))} cr` : ''].filter(Boolean).join(' · '))}</span></button>`).join('')}
    ${hits.length > shown.length ? `<div class="faint sugg-more">${hits.length - shown.length} more; ${typed ? 'keep typing to narrow it down' : 'scroll for more, or type to narrow it down'}</div>` : ''}${asCustom}</div>`;
}
function pickAddItem(name) {
  const d = state.addDraft || (state.addDraft = { ...ADD_DEFAULTS });
  // Another item: quantity, price and the ticks start over.
  if (d.name !== name) Object.assign(d, { qty: '1', pay: false, price: '', disc: '', equip: false, attune: false, custom: false, base: '' });
  const qty = $('[data-add="qty"]');
  if (qty) qty.value = '1';
  d.name = name;
  d.hi = 0;
  d.moved = false;
  const input = $('[data-add="name"]');
  if (input) { input.value = name; input.focus(); }
  refreshTracked(['addsugg', 'adddetail']);
}
function renderAddDetail(m) {
  const d = state.addDraft || ADD_DEFAULTS;
  const name = String(d.name).trim();
  const ref = catalogIndex && catalogIndex.get(name);
  const pack = !ref ? packByName(name) : null;
  const custom = !ref && !pack && d.custom && name;
  if (!ref && !pack && !custom) return '';
  const qty = Math.max(1, parseInt(d.qty, 10) || 1);
  const price = ref ? priceOf(ref) : pack ? pack.cost : num(d.cc);
  const payRow = `<label class="add-pay"><input type="checkbox" data-add="pay"${d.pay ? ' checked' : ''}> Pay
      <input data-add="price" type="text" inputmode="numeric" value="${esc(addPrice(d, price, qty))}" aria-label="Price paid"> cr</label>
      <label class="add-disc">less <input data-add="disc" type="text" inputmode="numeric" value="${esc(d.disc)}" placeholder="0" aria-label="Discount in percent">%</label>
      <label class="add-from">from <input data-add="from" type="text" value="${esc(d.from)}" placeholder="seller / loot source (optional)" aria-label="Who you buy it from, or where you found it"></label>
      <span class="faint">have ${fmtNum(num(m.raw.credits))} cr${price ? ` · standard price ${fmtNum(price)} cr${pack ? '' : ' each'}` : ''}</span>`;
  if (pack) {
    const contents = prPackContents(pack.text, state.catalog ? state.catalog.items : []);
    return `<div class="add-detail"><div><b>${esc(pack.name)}</b> <span class="muted">Equipment pack · ${fmtNum(pack.cost)} cr</span></div>
      <div class="pack-contents">Unpacks into: ${contents.map((x) => `${x.qty * qty}× ${esc(x.item || x.custom)}${x.custom ? ' <span class="chip">custom</span>' : ''}`).join(', ')}</div>
      <div class="add-checks">${payRow}</div></div>`;
  }
  if (custom) {
    return `<div class="add-detail"><div><b>${esc(name)}</b> <span class="chip">custom</span> <span class="muted">not in SW5E's list: kept as your own item</span></div>
      <div class="add-checks"><label>Weight <input data-add="cw" type="text" inputmode="decimal" value="${esc(d.cw)}" placeholder="0" aria-label="Weight in pounds, each"> lb</label>
        <label>Cost <input data-add="cc" type="text" inputmode="numeric" value="${esc(d.cc)}" placeholder="0" aria-label="Cost in credits, each"> cr each</label></div>
      <label class="add-desc">Description <textarea data-add="cd" rows="2" placeholder="What it is, where it came from…">${esc(d.cd)}</textarea></label>
      <div class="add-checks">${payRow}</div></div>`;
  }
  const r = { ...ref, isFound: true };
  const facts = [itemKind(ref), price ? fmtNum(price) + ' cr' : '', ref.weight ? ref.weight + ' lb' : '',
    ref.requiresAttunement ? 'requires attunement' : '', ref.prerequisite ? 'Prerequisite: ' + ref.prerequisite : ''].filter(Boolean);
  const checks = [
    canEquip(r, false) ? `<label><input type="checkbox" data-add="equip"${d.equip ? ' checked' : ''}> Equipped</label>` : '',
    canAttune(r, false) ? (atAttuneLimit(m, ref) ? '<span class="faint">Attunement slots full</span>'
      : `<label><input type="checkbox" data-add="attune"${d.attune ? ' checked' : ''}> Attuned</label>`) : '',
    payRow,
  ].filter(Boolean);
  return `<div class="add-detail"><div class="add-head">${itemTile(ref, 'lg')}<div><b>${esc(ref.name)}</b> <span class="muted">${esc(facts.join(' · '))}</span></div></div>
    ${baseSelect(m, ref, 'data-add="base"', d.base)}
    ${checks.length ? `<div class="add-checks">${checks.join('')}</div>` : ''}
    ${ref.description || ref.text ? `<details class="item-desc"><summary>Description</summary><div class="desc">${md(ref.description || ref.text)}</div></details>` : ''}</div>`;
}
/** "Base item": what an enhanced weapon, armor or shield is built on, from what you carry or SW5E's list. */
function baseSelect(m, ref, attr, value, except) {
  const bases = state.catalog ? invEnhancedBases(ref, state.catalog.items) : [];
  if (!bases.length) return '';
  const names = new Set(bases.map((b) => b.name));
  const own = arr(withEdits(m.snap.raw, editedFields(m.snap.key)).equipment).map((x, i) => ({ x, i }))
    .filter(({ x, i }) => names.has(x.name) && !x.enhancedBy && i !== except);
  return `<label class="add-base">${bases.length === 1 ? 'Built on' : 'Base item'} <select ${attr} aria-label="Base item">
    <option value="">${value ? 'none' : 'choose… (its damage, AC and weight)'}</option>
    ${own.length ? `<optgroup label="You carry">${own.map(({ x, i }) => `<option value="own:${i}"${value === `own:${i}` ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>` : ''}
    <optgroup label="From SW5E (added with it)">${bases.map((b) => `<option value="new:${esc(b.name)}"${value === `new:${b.name}` ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</optgroup>
  </select></label>`;
}

/** Drop edits that `raw` (SW5E's copy) now matches. */
function pruneEdits(key, raw) {
  const ed = state.edits[key];
  if (!ed) return;
  for (const p of Object.keys(ed.fields)) if (sameField(p, editValue(raw, p, ed.fields[p]), getPath(raw, p))) delete ed.fields[p];
  if (!Object.keys(ed.fields).length) delete state.edits[key];
}

/** The fields each section's editor shows. */
const EDITORS = {
  overview: () => [{ path: 'experiencePoints', label: 'Experience points' }, { path: 'credits', label: 'Credits' },
    { path: 'image', label: 'Portrait: a link to a picture', url: true }],
  personality: (m) => {
    const known = new Set([...PERSONAL, ...PHYSICAL, 'alignment', 'Appearance', 'Backstory']);
    const other = Object.keys(m.raw.characteristics || {}).filter((k) => !known.has(k) && !k.includes('.'));
    return [
      { path: 'characteristics.alignment', label: 'Alignment', list: ALIGNMENTS },
      ...PERSONAL.map((k) => ({ path: 'characteristics.' + k, label: k, long: true })),
      ...PHYSICAL.concat(other).map((k) => ({ path: 'characteristics.' + k, label: k })),
      { path: 'characteristics.Appearance', label: 'Appearance', long: true, rows: 6 },
    ];
  },
  backstory: () => [{ path: 'characteristics.Backstory', label: 'Backstory', long: true, rows: 18 }],
  notes: () => [{ path: 'notes', label: 'Notes', long: true, rows: 12 }],
};
const isEditing = (m, section) => !!state.editing && state.editing.key === m.snap.key && state.editing.section === section;

function renderEditor(m, section) {
  const { draft } = state.editing;
  const fields = EDITORS[section](m);
  const anyNumber = fields.some((f) => NUMBER_FIELDS.includes(f.path));
  const control = (f) => {
    const cur = getPath(m.raw, f.path);
    const v = f.path in draft ? draft[f.path] : cur == null ? '' : String(cur);
    const id = 'ed-' + f.path.replace(/\W+/g, '-');
    const attrs = `id="${id}" data-field="${esc(f.path)}"`;
    if (f.long) return `<textarea ${attrs} rows="${f.rows || 3}">${esc(v)}</textarea>${section === 'personality' && PERSONAL.includes(f.path.replace(/^characteristics\./, '')) ? bdCharacteristicHelper(m, f.path.replace(/^characteristics\./, '')) : ''}`;
    const numeric = NUMBER_FIELDS.includes(f.path);
    if (f.url) {
      return `<input ${attrs} type="url" value="${esc(v)}" autocomplete="off" placeholder="https://…/picture.jpg">
        <small class="faint">The picture itself, not a page showing it: open the picture, then right-click (or long-press) it → Copy image address. Leave empty for none.
          Or <button type="button" class="linklike" data-act="portrait-upload">upload a picture from this device</button> (kept in this browser only).</small>`;
    }
    return `<input ${attrs} type="text" value="${esc(v)}" autocomplete="off"${numeric ? ' inputmode="numeric" placeholder="e.g. 250, +50 or -80"' : ''}${f.list ? ` list="${id}-list"` : ''}>`
      + (f.list ? `<datalist id="${id}-list">${f.list.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>` : '');
  };
  return `<form class="editor" data-editor="${esc(section)}">
    <div class="ed-grid">${fields.map((f) => `<label class="ed-field${f.long ? ' long' : ''}"><span>${esc(f.label)}${f.path in m.edited ? ' <span class="chip warn">edited</span>' : ''}</span>${control(f)}</label>`).join('')}</div>
    <p class="ed-err" hidden></p>
    <div class="ed-actions"><button class="btn primary sm" type="submit">Done</button><button class="btn sm" type="button" data-act="edit-cancel">Cancel</button>
      <span class="faint">${anyNumber ? 'Type a number, or +50 / −80 to add or subtract. ' : 'Markdown works here. '}Saved here when you press Done; Sync to SW5E also puts it on sw5e.com.</span></div>
  </form>`;
}

function editorError(form, msg) {
  const el = form.querySelector('.ed-err');
  el.textContent = msg;
  el.hidden = false;
}

/** "Done" in an editor: keep the fields that differ from SW5E's copy as local edits. */
async function applyEditor(form) {
  const snap = state.snapshots[state.current];
  if (!snap || !state.editing || state.editing.key !== snap.key) return;
  const key = snap.key;
  const shown = withEdits(snap.raw, editedFields(key));
  const fields = { ...editedFields(key) };
  for (const el of form.querySelectorAll('[data-field]')) {
    const path = el.dataset.field;
    let v = el.value;
    if (NUMBER_FIELDS.includes(path)) {
      const t = v.replace(/[\s,]/g, '').replace(/^[−–]/, '-');
      if (!/^[+-]?\d+$/.test(t)) { el.focus(); return editorError(form, `${fieldLabel(path)}: enter a whole number, or +n / −n to adjust.`); }
      v = (/^[+-]/.test(t) ? num(getPath(shown, path)) : 0) + parseInt(t, 10);
      if (v < 0) { el.focus(); return editorError(form, `${fieldLabel(path)} can't go below 0 (that would be ${v}).`); }
    }
    if (path === 'image') {
      v = v.trim();
      if (v && !/^https?:\/\/\S+$/i.test(v)) { el.focus(); return editorError(form, 'Portrait: a link starting with https:// (or leave it empty).'); }
    }
    if (sameField(path, v, getPath(snap.raw, path))) delete fields[path];
    else fields[path] = v;
  }
  const before = canonical(editedFields(key));
  if (Object.keys(fields).length) state.edits[key] = { ...state.edits[key], fields, updatedAt: Date.now() };
  else delete state.edits[key];
  state.editing = null;
  if (canonical(editedFields(key)) !== before) await saveEdits();
  renderAll();
  scheduleRecompute(key);
  const n = Object.keys(editedFields(key)).length;
  setStatus(n ? `Saved. ${plural(n, 'field')} not on sw5e.com yet (Sync to SW5E puts them there).` : 'Saved: same as the copy on sw5e.com.');
}

async function discardEdits() {
  const snap = state.snapshots[state.current];
  if (!snap || !state.edits[snap.key]) return;
  if (state.confirmDiscard !== snap.key) {
    state.confirmDiscard = snap.key;
    refreshTracked();
    return;
  }
  state.confirmDiscard = null;
  delete state.edits[snap.key];
  await saveEdits();
  renderAll();
  setStatus('Discarded the edits; showing the SW5E copy.');
}

/**
 * A character made here (or imported) that isn't on the account yet: save it there as a new character, with its edits
 * and play state, then keep everything this viewer holds for it (effects, reasons, history) under its new key.
 */
async function createOnAccount() {
  const snap = state.snapshots[state.current];
  if (!snap || snap.raw.id || isDemoKey(snap.key) || state.saving) return;
  const key = snap.key;
  const raw = clone(withEdits(snap.raw, editedFields(key)));
  const local = state.trackers[key];
  if (local) raw.currentStats = { ...(raw.currentStats || {}), ...trackedFields(local.stats) };
  if (!raw.localId) raw.localId = `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  state.saving = key;
  refreshTracked();
  recordHistory(key, raw, 'Before saving to SW5E as a new character');
  setStatus('Saving the new character to sw5e.com…');
  try {
    const res = await createOnSw5e(raw, { onStatus: (msg) => setStatus(msg) });
    const [nk] = addSnapshots(res.characters, 'sw5e', res.meta, 'Saved to SW5E as a new character');
    if (!nk || nk === key) throw new Error('sw5e.com returned no id for it');
    for (const k of ['itemState', 'derived', 'portraits']) if (state[k][key]) { state[k][nk] = state[k][key]; delete state[k][key]; }
    state.history[nk] = arr(state.history[key]).concat(arr(state.history[nk])).slice(-HISTORY_LIMIT);
    delete state.history[key];
    delete state.trackers[key];
    delete state.edits[key];
    delete state.snapshots[key];
    state.current = nk;
    state.undo = null;
    await saveStore();
    await saveTrackers();
    await saveEdits();
    await saveItemState();
    await saveDerived();
    await savePortraits();
    // It was already on the account (an earlier try got there first): nothing new was made, and what changed here
    // since goes on as local changes to that copy.
    if (res.save && res.save.existing) {
      const site = state.snapshots[nk].raw;
      const fields = {};
      for (const p of [...ITEM_FIELDS, ...OBJECT_FIELDS, ...LIST_FIELDS, 'credits', 'experiencePoints', 'notes', 'name', 'image']) {
        if (raw[p] !== undefined && canonical(raw[p]) !== canonical(site[p])) fields[p] = clone(raw[p]);
      }
      for (const c of Object.keys(raw.characteristics || {})) {
        if (canonical(raw.characteristics[c]) !== canonical((site.characteristics || {})[c])) fields[`characteristics.${c}`] = raw.characteristics[c];
      }
      if (Object.keys(fields).length) await setEditedFields(state.snapshots[nk], fields);
      setStatus(`${raw.name || 'The character'} was already on your sw5e.com account (an earlier save got there): no second copy was made.${Object.keys(fields).length ? ' Changes made since are kept here: Sync to SW5E sends them.' : ''}`);
      return;
    }
    setStatus(`Saved ${raw.name || 'the character'} to sw5e.com as a new character · ${new Date().toLocaleTimeString()}`);
  } catch (e) {
    console.error(e);
    setStatus('Could not save it to sw5e.com: ' + e.message, 'error');
  } finally {
    state.saving = null;
    renderAll({ keepTyping: true });
    scheduleRecompute(state.current);
  }
}

/** Push local play state and field edits to the character on sw5e.com. */
/**
 * What sw5e.com will show differently after a sync: the effects and features this sheet applies and its engine
 * doesn't (items' effects, class features read from their text, states), as "Armor (Fine): AC +1".
 */
function siteDifferences(m) {
  const by = new Map();
  for (const x of arr(m.fx.tweaks).concat(arr(m.fx.weaponTweaks))) {
    if (!x.effect || x.effect.kind === 'tweak') continue;
    const label = ((x.mod && x.mod.label) || fxTweakName(x.path)).replace(`${x.effect.name}: `, '');
    const list = by.get(x.effect.name) || [];
    if (!list.includes(label)) list.push(label);
    by.set(x.effect.name, list);
  }
  // A tweak's "bump to" is this sheet's own: sw5e.com keeps it with the character but doesn't apply it.
  const bumps = tweakRows(m.raw).filter((r) => tweakMode(r.value) === 'floor').map((r) => `${r.name} bump to ${r.value.floor}`);
  if (bumps.length) by.set('Tweaks', bumps);
  return [...by].map(([name, labels]) => `${name}: ${labels.join(', ')}`);
}
async function saveChangesToSw5e() {
  const snap = state.snapshots[state.current];
  if (snap && isDemoKey(snap.key)) return setStatus("The demo character isn't synced to sw5e.com: create a character of your own for that.");
  if (snap && !snap.raw.id) return createOnAccount();
  if (!snap || !snap.raw.id || state.saving) return;
  const key = snap.key;
  const local = state.trackers[key];
  const fields = clone(editedFields(key));
  if (fields.classes) fields.classes = editValue(snap.raw, 'classes', fields.classes);
  if (!local && !Object.keys(fields).length) return;
  // The latest rolls go along (W-103), so the character's other copies (another computer) have them.
  const rolls = rollsForCharacter(key);
  if (rolls.length && canonical(rolls) !== canonical(arr(snap.raw.rollLog))) fields.rollLog = rolls;
  const sent = local ? clone(trackedFields(local.stats)) : null;
  state.saving = key;
  refreshTracked();
  // SW5E isn't a backup: keep the version we're about to replace.
  recordHistory(key, snap.raw, 'Before saving to SW5E');
  await saveStore();
  setStatus('Syncing to sw5e.com…');
  try {
    const res = await saveToSw5e(
      { id: snap.raw.id, expected: snap.raw, currentStats: sent || undefined, fields },
      { onStatus: (msg) => setStatus(msg) },
    );
    if (res.save && res.save.conflict) {
      console.info('[save] skipped: changed on sw5e.com in', res.save.differs);
      const base = snap.raw;
      addSnapshots(res.characters, 'sw5e', res.meta, 'Loaded from SW5E (changed there; save skipped)');
      const both = rebaseEdits(key, base, state.snapshots[key].raw);
      await saveStore();
      await saveEdits();
      scheduleRecompute(key);
      setStatus('Not synced: this character changed on sw5e.com after it was loaded here. Its changes are now merged with yours. '
        + (both.length ? `Changed on both sides: ${both.map(fieldLabel).join(', ')} (yours kept); check those, then sync again.` : 'Check them, then sync again.'), 'error');
      return;
    }
    addSnapshots(res.characters, 'sw5e', res.meta, 'Synced to SW5E');
    const saved = state.snapshots[key].raw;
    // Drop the local tracker if SW5E now holds exactly these values (and nothing changed meanwhile).
    const now = state.trackers[key];
    if (sent && now && canonical(trackedFields(now.stats)) === canonical(sent)
      && canonical(trackedFields(sw5eStats(saved))) === canonical(sent)) {
      delete state.trackers[key];
    }
    pruneEdits(key, saved);
    const notKept = Object.keys(fields).filter((p) => !sameField(p, fields[p], getPath(saved, p)));
    state.undo = null;
    await saveStore();
    await saveTrackers();
    await saveEdits();
    if (notKept.length) setStatus(`Synced, but sw5e.com didn't keep: ${notKept.map(fieldLabel).join(', ')}. Your values are still here.`, 'error');
    else {
      // Its engine doesn't apply effects or features read from their text (W-021): say which numbers differ there.
      const diff = state.current === key ? siteDifferences(buildModel(state.snapshots[key])) : [];
      setStatus(`Synced to sw5e.com · ${new Date().toLocaleTimeString()}${diff.length
        ? `. sw5e.com shows some numbers without what this sheet adds (its engine doesn't apply them): ${diff.slice(0, 6).join('; ')}${diff.length > 6 ? `; and ${diff.length - 6} more (Combat & Vitals → Effects)` : ''}.` : ''}`);
    }
  } catch (e) {
    console.error(e);
    setStatus('Could not sync to sw5e.com: ' + e.message, 'error');
  } finally {
    state.saving = null;
    if (state.current === key) renderAll({ keepTyping: true });
    scheduleRecompute(key); // a new base copy: re-apply active effects / remaining edits
  }
}

// ------------------------------------------------------------- sections
// In the order they're used: what a turn needs (Combat & Vitals beside the attacks, maneuvers and powers), then the
// character's checks, the gear, how the character is built, its story, and the sheet's own settings. `group` names
// the nav's headings (SECTION_GROUPS); `key` is the section's fixed shortcut, Shift + that key (shortcuts.js).
const SECTION_GROUPS = { play: 'Play', checks: 'Checks', gear: 'Gear', build: 'Build', story: 'Story', sheet: 'Sheet' };
const SECTIONS = [
  // play
  { id: 'overview', group: 'play', key: 'Digit1', title: 'Overview', when: () => true, render: renderOverview, editor: true },
  { id: 'combat', group: 'play', key: 'Digit2', short: 'Combat', title: 'Combat & Vitals', when: (m) => m.has, render: renderCombat },
  { id: 'attacks', group: 'play', key: 'Digit3', short: 'Attacks', title: 'Weapons & Attacks', when: (m) => m.has, render: renderAttacks, count: (m) => arr(m.c.weapons).length },
  { id: 'superiority', group: 'play', key: 'Digit4', short: 'Maneuvers', title: 'Superiority & Maneuvers', when: (m) => m.maneuverNames.length || m.c.superiority, render: renderSuperiority, count: (m) => m.maneuverNames.length },
  { id: 'force', group: 'play', key: 'Digit5', short: 'Force', title: 'Force Casting', when: (m) => m.c.forceCasting || knownPowers(m, 'force').length, render: (m) => renderCasting(m, 'force'), count: (m) => knownPowers(m, 'force').length },
  { id: 'tech', group: 'play', key: 'Digit6', short: 'Tech', title: 'Tech Casting', when: (m) => m.c.techCasting || knownPowers(m, 'tech').length, render: (m) => renderCasting(m, 'tech'), count: (m) => knownPowers(m, 'tech').length },
  // character
  { id: 'abilities', group: 'checks', key: 'Digit7', short: 'Abilities', title: 'Abilities & Saving Throws', when: (m) => m.has, render: renderAbilities },
  { id: 'skills', group: 'checks', key: 'Digit8', title: 'Skills', when: (m) => m.has, render: renderSkills, count: () => 18 },
  { id: 'proficiencies', group: 'checks', key: 'Digit9', short: 'Proficiencies', title: 'Proficiencies & Languages', when: (m) => m.has, render: renderProficiencies },
  // gear
  { id: 'equipment', group: 'gear', key: 'Digit0', short: 'Equipment', title: 'Equipment & Inventory', when: () => true, render: renderEquipment, count: (m) => arr(m.raw.equipment).length + arr(m.raw.customEquipment).length },
  // build
  { id: 'classes', group: 'build', key: 'KeyQ', short: 'Classes', title: 'Classes & Progression', when: (m) => arr(m.raw.classes).length, render: renderClasses, count: (m) => arr(m.raw.classes).length },
  { id: 'features', group: 'build', key: 'KeyW', short: 'Features', title: 'Class Features', when: (m) => m.has, render: renderClassFeatures, count: (m) => m.classFeatures.length },
  { id: 'feats', group: 'build', key: 'KeyE', title: 'Feats', when: (m) => m.has, render: renderFeats, count: (m) => m.feats.length },
  { id: 'custom', group: 'build', key: 'KeyR', short: 'Custom', title: 'Custom Features', when: (m) => arr(m.raw.customFeatures).length, render: renderCustomFeatures, count: (m) => arr(m.raw.customFeatures).length },
  { id: 'species', group: 'build', key: 'KeyT', title: 'Species', when: (m) => m.raw.species && m.raw.species.name, render: renderSpecies, sub: (m) => m.raw.species.name },
  { id: 'background', group: 'build', key: 'KeyY', title: 'Background', when: (m) => m.raw.background && m.raw.background.name, render: renderBackground, sub: (m) => m.raw.background.name },
  // story
  { id: 'personality', group: 'story', key: 'KeyU', short: 'Personality', title: 'Personality & Appearance', when: () => true, render: renderPersonality, editor: true, replace: true },
  { id: 'backstory', group: 'story', key: 'KeyI', title: 'Backstory', when: () => true, render: renderBackstory, editor: true, replace: true },
  { id: 'notes', group: 'story', key: 'KeyO', title: 'Notes', when: () => true, render: renderNotes, editor: true, replace: true },
  // sheet
  { id: 'data', group: 'sheet', key: 'KeyP', short: 'Settings', title: 'Settings, Tweaks & Data', when: () => true, render: renderData },
];

// XP needed for each level (index 0 = level 1): SW5E's table, or the same numbers if the rules aren't loaded yet.
const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
function xpTable() {
  const rows = rulesModule('characterAdvancements').filter((r) => Number.isFinite(Number(r.level)) && Number.isFinite(Number(r.experiencePoints)));
  return rows.length >= 20 ? rows.slice().sort((a, b) => a.level - b.level).map((r) => Number(r.experiencePoints)) : XP_TABLE;
}
/** The XP line under the name: progress to the next level, and levels the XP allows but the character hasn't taken. */
function xpInfo(m, cur) {
  const table = xpTable();
  const level = num(m.c.currentLevel) || arr(m.raw.classes).reduce((n, k) => n + num(k.levels), 0) || 1;
  const reach = Math.max(1, table.filter((x) => cur >= x).length);
  const top = Math.max(level, reach);
  const prev = table[top - 1] || 0, next = table[top];
  const owed = reach - level;
  const note = owed > 0
    ? `<div class="chip warn xp-owed">${esc(`${fmtNum(cur)} XP is enough for level ${reach}: ${plural(owed, 'level')} to take.`)} ${bdLevelUpButton(m, 'Level up')}</div>`
    : reach < level ? `<div class="chip warn">${esc(`Level ${level} usually needs ${fmtNum(table[level - 1])} XP (you have ${fmtNum(cur)}).`)}</div>` : '';
  return {
    pct: next > prev ? clamp(((cur - prev) / (next - prev)) * 100, 0, 100) : 100,
    label: next != null ? `level ${top + 1} at ${fmtNum(next)} (${fmtNum(Math.max(0, next - cur))} to go)` : 'highest level',
    note,
  };
}

function renderOverview(m) {
  const { raw, c } = m;
  const xp = c.experiencePoints || {};
  const cur = num(xp.current != null ? xp.current : raw.experiencePoints);
  const xi = xpInfo(m, cur);
  const link = raw.image && /^https?:/.test(raw.image) ? raw.image : '';
  const upload = portraitOf(m.snap.key);
  const img = upload ? upload.data : link;
  const hidden = img && portraitHidden();
  const classText = c.classText || arr(raw.classes).map((k) => `${k.name}${k.archetype && k.archetype.name ? ` (${k.archetype.name})` : ''} ${k.levels}`).join(', ');
  return `<div class="hero${img && !hidden ? '' : ' no-portrait'}">
    ${img && !hidden ? `<div class="portrait mine"><img data-src="${esc(img)}" data-mine="1" alt="${esc(raw.name || 'Portrait')}">
      <button class="portrait-hide" data-act="portrait-toggle" title="Hide the picture (the chip below shows it again)" aria-label="Hide the picture">–</button></div>` : ''}
    <div>
      <h1>${esc(raw.name || 'Unnamed character')}</h1>
      <div class="line">${esc([c.species || (raw.species && raw.species.name), classText].filter(Boolean).join(' · '))}</div>
      <div class="chips" style="margin-top:8px">
        ${c.currentLevel ? chip('Level ' + c.currentLevel, 'accent') : ''}
        ${c.background || (raw.background && raw.background.name) ? chip('Background: ' + (c.background || raw.background.name)) : ''}
        ${c.alignment || (raw.characteristics && raw.characteristics.alignment) ? chip(c.alignment || raw.characteristics.alignment) : ''}
        ${c.proficiencyBonus ? chip('Proficiency ' + signed(c.proficiencyBonus)) : ''}
        ${live('insp', m, 'span')}
        ${hidden ? '<button class="chip" data-act="portrait-toggle" title="Show the picture again">Show picture</button>' : ''}
        ${link && !upload ? `<a class="chip blue" href="${esc(link)}" target="_blank" rel="noopener">Portrait link ↗</a>` : ''}
        <button class="chip pic-chip" data-act="portrait-upload" title="Pick a picture on this device. It is made smaller and kept in this browser only (and in its backups): Sync to SW5E doesn't send it.">${uiIcon('upload')}${upload ? 'Change picture' : 'Upload a picture'}</button>
        ${upload ? `<button class="chip" data-act="portrait-remove" title="Remove the uploaded picture${link ? ' (the picture link shows again)' : ''}">Remove picture</button>`
          : `<button class="chip" data-act="edit-image" title="A link to a picture on the web (also kept on sw5e.com when you sync)">${link ? 'Change picture link' : 'Picture link…'}</button>`}
      </div>
      ${loadoutStrip(m)}
      <div class="xp">
        <div class="xp-bar"><div style="width:${xi.pct.toFixed(1)}%"></div></div>
        <div class="xp-label"><span>${fmtNum(cur)} XP</span><span>${esc(xi.label)}</span></div>
        ${xi.note}
        ${bdOpenChoicesHtml(m)}
      </div>
    </div>
  </div>`;
}

/** Equipped and attuned gear as a row of tiles under the name (a tap goes to the inventory). */
function loadoutStrip(m) {
  const raw = withEdits(m.snap.raw, editedFields(m.snap.key));
  const ref = (it) => (catalogIndex && catalogIndex.get(it.name)) || it;
  const list = arr(raw.equipment).map((it, i) => ({ it, i })).filter(({ it }) => (it.equipped || it.attuned) && !it.enhancedBy)
    .map(({ it, i }) => {
      const base = arr(raw.equipment)[invBaseIndex(arr(raw.equipment), i)];
      return { it: { ...ref(base || it), ...(base ? { rarityText: invRarity(ref(it)) } : {}), color: it.color || (base && base.color) }, name: it.label || it.name };
    })
    .concat(arr(raw.customEquipment).filter((it) => it.equipped).map((it) => ({ it, name: it.name, custom: true })));
  if (!list.length) return '';
  return `<div class="loadout" aria-label="Equipped and attuned">${list.slice(0, 12).map((x) => itemTile(x.it, '', x.name, { custom: x.custom })).join('')}</div>`;
}
// ------------------------------------------------------------- screen effects (fx.css)
/**
 * What is happening to the character, as words for <html data-fx>: low hit points, conditions, exhaustion, states
 * (Rage, a lightsaber form), concentration, a shield or temporary hit points, inspiration, haste, invisibility.
 */
const screenFxOn = () => { try { return localStorage.getItem('fx') !== 'off'; } catch (e) { return true; } };
function screenFx(m) {
  if (!m || !m.t) return [];
  const t = m.t;
  const out = [];
  const max = num(t.lim.hpMax);
  const hp = num(t.hpCurrent);
  if (max) {
    if (hp <= 0) out.push('down');
    else if (hp <= max * 0.25) out.push('critical');
    else if (hp <= max * 0.5) out.push('bloodied');
  }
  for (const c of arr(t.s.conditions)) out.push('c-' + String(c).toLowerCase().replace(/[^a-z]+/g, '-'));
  const exh = num(t.s.exhaustion);
  if (exh) out.push('exhausted', `exh-${Math.min(6, exh)}`);
  if (num(t.s.temporaryHitPoints) > 0) out.push('temphp');
  if (t.s.hasInspiration) out.push('inspired');
  for (const e of tempEffects(m.snap.key)) {
    const g = String(e.group || '');
    const n = String(e.name || '').toLowerCase();
    if (g === 'concentration') out.push('concentrating');
    if (g === 'state:raging' || /\brage\b/.test(n)) out.push('rage');
    if (g === 'state:lightsaber form') out.push('form');
    if (/shield|barrier|deflect|\bward\b|armor of/.test(n)) out.push('shielded');
    if (/invisib|cloak|camouflage|stealth field|shroud/.test(n)) out.push('cloaked');
    if (/haste|speed|alacrity|celerity|sprint|burst of/.test(n)) out.push('hasted');
  }
  return [...new Set(out)];
}
function applyScreenFx(m) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;
  const v = screenFxOn() ? screenFx(m).join(' ') : '';
  if ((root.dataset.fx || '') === v) return;
  if (v) root.dataset.fx = v; else delete root.dataset.fx;
}
/** A brief flash over the page: 'hit', 'heal', 'shield', 'crit', 'fumble'. */
function fxPulse(kind) {
  if (!screenFxOn() || typeof document === 'undefined') return;
  const el = document.querySelector('.fx-pulse');
  if (!el) return;
  el.className = 'fx-pulse';
  void el.offsetWidth; // restart the animation
  el.className = `fx-pulse ${kind}`;
}

/** The Unarmed Strike's picture for this character: by species (its natural weapons) and skin or fur colour. */
function unarmedOf(m) {
  const raw = withEdits(m.snap.raw, editedFields(m.snap.key));
  const name = raw.species && raw.species.name;
  const ref = rulesModule('species').find((s) => s.name === name) || (m.refs.species || {})[name];
  return unarmedArt(name, ref, raw.characteristics);
}
/** Items whose blade or crystal can have a colour of the player's choosing. */
const hasEnergyColor = (it) => /^light|kyber/.test(itemArt(it).icon);

// Parts of the sheet that show tracked play state. They're rendered inside
// <… data-live="name[:arg]"> wrappers so refreshTracked() can update them in place
// without re-rendering the sheet (which would reset expanded cards, open details…).
const LIVE = {
  hp(m) {
    const { t } = m;
    const pct = t.lim.hpMax ? clamp((t.hpCurrent / t.lim.hpMax) * 100, 0, 100) : 0;
    const temp = num(t.s.temporaryHitPoints);
    return `<div class="label">Hit Points</div><div class="value">${t.hpCurrent} <span class="muted" style="font-size:15px">/ ${hpMaxHtml(m, t)}</span></div>
      <div class="hp-bar"><div style="width:${pct}%"></div></div>
      <div class="note">${t.hpCurrent ? '' : num(t.s.deathSaves.failures) >= 3
        ? '<b class="bad-text">Dead (three failed death saves)</b> <button class="linklike" data-track="alive" title="If the GM rules otherwise: back to 0 hit points and death saves">GM ruling: at 0 HP instead</button> · '
        : num(t.s.deathSaves.successes) >= 3 ? '<b>0 HP, stable</b> · ' : '<b class="bad-text">0 HP: roll death saves</b> · '}${temp ? `Temp HP ${temp}` : 'No temporary HP'}</div>`;
  },
  hd(m) {
    const { t } = m;
    return `<div class="label">Hit Dice</div><div class="value">${t.lim.hitDice.map((d) => `${t.hdLeft(d.size)}/${d.maximum}${esc(d.size)}`).join(' · ') || '—'}</div>
      ${t.lim.hitDieBonus ? `<div class="note">${signed(t.lim.hitDieBonus)} per die spent (Con)</div>` : ''}`;
  },
  points(m, kind) {
    const max = kind === 'force' ? m.t.lim.force : m.t.lim.tech;
    const used = num(kind === 'force' ? m.t.s.forcePointsUsed : m.t.s.techPointsUsed);
    return `<div class="label">${kind === 'force' ? 'Force' : 'Tech'} points</div><div class="value">${max - used} <span class="muted" style="font-size:15px">/ ${bump(m, `${kind}Casting.maxPoints`, String(max))}</span></div>`;
  },
  insp(m) { return m.t && m.t.s.hasInspiration ? chip('Inspired', 'good') : ''; },
  mvitals: renderMiniVitals,
  hl(m) {
    const both = new Set(m.t.lim.highLevels.map((r) => r.kind)).size > 1;
    return m.t.lim.highLevels.flatMap((r) => r.keys.map((k, i) => {
      const v = m.t.s.highLevelCasting[k];
      return chip(`${both ? `${titleCase(r.kind)} ` : ''}${ordinal(r.level)}-level${r.keys.length > 1 ? ` #${i + 1}` : ''}: ${v ? 'used' : 'available'}`, v ? 'bad' : 'good');
    })).join('');
  },
  uses(m, name) {
    const f = m.t && m.t.lim.features.find((x) => x.name === name);
    const heal = f && healFeatureRoll(m, name);
    return f ? counterRow(m.t, `Uses (${f.recharge === 'shortRest' ? 'back on a short or long rest' : 'back on a long rest'})`, f.maximum - num(m.t.s.featuresTimesUsed[name]), f.maximum, 'feat', name + '|',
      (heal ? `${rollable(heal, `roll ${esc(heal.split('|')[2])} + ${esc(heal.split('|')[3])}`, `Use ${name}: roll its healing`)}, then Heal${f.basis ? ' · ' : ''}` : '') + (f.basis ? esc(f.basis) : '')) : '';
  },
  tracker: renderTracker,
  pending: renderPending,
  effects: renderEffects,
  effsugg: renderEffectSuggestions,
  addsugg: renderAddSuggestions,
  adddetail: renderAddDetail,
  side: renderSideSummary,
};
const live = (name, m, tag = 'div', cls = '') => {
  const [fn, arg] = name.split(/:(.*)/s);
  return `<${tag} data-live="${esc(name)}"${cls ? ` class="${cls}"` : ''}>${LIVE[fn](m, arg)}</${tag}>`;
};

function refreshTracked(only) {
  const probe = probePointer();
  try { refreshTrackedInner(only); } finally { noteShift(probe); }
}
function refreshTrackedInner(only) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const m = buildModel(snap);
  applyScreenFx(m);
  const focused = document.activeElement && document.activeElement.id;
  const focusLoc = document.activeElement && document.activeElement !== document.body && document.activeElement.closest('[data-live]') ? locate(document.activeElement) : null;
  const anchor = anchorFor(recentControl());
  const amount = $('#trackAmount');
  const typed = amount ? [amount.value, amount.selectionStart, amount.selectionEnd] : null;
  const dtype = $('#trackType') ? $('#trackType').value : '';
  document.querySelectorAll('[data-live]').forEach((el) => {
    const [fn, arg] = el.dataset.live.split(/:(.*)/s);
    if (only && !only.includes(fn)) return;
    const ui = el.querySelector('details, .card') ? captureUi(el) : null;
    el.innerHTML = LIVE[fn](m, arg);
    if (ui) restoreUi(el, ui);
  });
  const again = $('#trackAmount');
  if (again && typed && again !== amount) again.value = typed[0];
  if ($('#trackType')) $('#trackType').value = dtype;
  if (focused === 'trackAmount' && again) {
    again.focus({ preventScroll: true });
    try { again.setSelectionRange(typed[1], typed[2]); } catch (e) { /* number inputs have no caret */ }
  } else if (focusLoc && (!document.activeElement || document.activeElement === document.body)) refocus(focusLoc);
  restoreAnchor(anchor);
}

/** "left / max" with use/regain buttons, and pips when the pool is small. */
function counterRow(t, label, left, max, op, argPrefix = '', note = '') {
  // Up to 12: one pip each; larger pools (16 or 20 force points): a bar.
  const pips = max <= 12 ? `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span>`
    : max > 0 ? `<span class="pool-bar" role="img" aria-label="${left} of ${max} left"><i style="width:${Math.round((100 * Math.max(0, Math.min(left, max))) / max)}%"></i></span>` : '';
  return `<div class="trk-row">
    <span class="trk-label">${esc(label)}${note ? ` <span class="faint">${note}</span>` : ''}</span>
    ${pips}<span class="trk-count"><b>${left}</b> / ${max}</span>
    <span class="trk-btns"><button class="btn sm" data-track="${op}" data-arg="${esc(argPrefix)}1" ${left <= 0 ? 'disabled' : ''} title="Use one" aria-label="${esc(label)}: use one">−</button><button class="btn sm" data-track="${op}" data-arg="${esc(argPrefix)}-1" ${left >= max ? 'disabled' : ''} title="Regain one" aria-label="${esc(label)}: regain one">+</button></span>
  </div>`;
}

/**
 * Rounds of combat (itemState[key].combat = { round }): Next round ends the temporary effects that have run out
 * ("until the start of your next turn": one round; "1 minute": ten), effects started earlier counting from round 1.
 */
const effectRounds = (e) => {
  const d = String(e.duration || '');
  if (/end of (?:your|its|the target's) next turn/i.test(d)) return 2;
  if (/\bturn\b/i.test(d)) return 1;
  const secs = durationSeconds(d);
  return secs == null ? null : Math.ceil(secs / 6);
};
function renderCombatRound(m) {
  const c = state.itemState[m.snap.key] && state.itemState[m.snap.key].combat;
  return `<div class="trk-round"><span class="trk-label">Combat</span>${c
    ? `<b>Round ${c.round}</b> <button class="btn sm primary" data-act="round-next" title="Ends the effects that have run out">Next round</button> <button class="btn sm" data-act="round-end">End combat</button>`
    : '<button class="btn sm" data-act="round-start" title="Count rounds: effects that last a few rounds end by themselves">Start combat</button>'}</div>`;
}
async function combatRound(op) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  if (op === 'start') { st.combat = { round: 1 }; await saveItemStateFor(snap.key, st); refreshTracked(); return setStatus('Round 1. Next round ends what has run out.'); }
  if (op === 'end') { delete st.combat; await saveItemStateFor(snap.key, st); refreshTracked(); return setStatus('Combat over.'); }
  if (!st.combat) return undefined;
  const undo = rememberForUndo(snap.key, `round ${st.combat.round + 1}`);
  st.combat.round += 1;
  const ended = st.effects.filter((e) => { const r = effectRounds(e); return r != null && st.combat.round - num(e.startRound || 1) >= r; });
  st.effects = st.effects.filter((e) => !ended.includes(e));
  await saveItemStateFor(snap.key, st);
  if (ended.length) { renderAll(); scheduleRecompute(snap.key); } else refreshTracked();
  const exh = ended.reduce((t, e) => t + num(e.exhaustOnEnd), 0);
  if (exh) await trackerAction('exh', String(exh));
  // "Temporary hit points … at the start of each of its turns" (Heroism on you).
  const temps = st.effects.filter((e) => e.power && num(e.castMod) > 0 && (e.onMe || !plPowerEffect(rulesPower(e.power) || {}, 0).forTarget) && plPowerEffect(rulesPower(e.power) || {}, 0).tempHp)
    .map((e) => ({ act: 'pw-temp', arg: String(e.castMod), label: `Temp HP ${e.castMod} (${e.power})` }));
  return setStatus(`Round ${st.combat.round}.${ended.length ? ` Ended: ${ended.map((e) => e.name).join(', ')}.` : ''}`, '', false, (ended.length ? [undo] : []).concat(temps));
}

/** Conditions in the play tracker: each one (with what it does, and ×), and a list to add from. */
function renderConditions(m) {
  const on = arr(m.t.s.conditions);
  const all = rulesModule('conditions').map((c) => c.name).filter((n) => n && !/^exhaustion$/i.test(n));
  const desc = (n) => String((rulesModule('conditions').find((c) => c.name === n) || {}).description || '').replace(/\\r\\n|\r?\n/g, ' ').replace(/\s*-\s+/g, ' ').trim();
  const does = (n) => {
    const r = PL_CONDITION_ROLLS[n] || {};
    const bits = Object.entries(r).map(([k, v]) => `${v === 'fail' ? 'fails' : v === 'adv' ? 'advantage on' : 'disadvantage on'} ${k.replace(/^save:/, '').replace(/^check$/, 'ability checks').replace(/^attack$/, 'attack rolls').replace(/^attack:melee$/, 'melee attack rolls')}${/^save:/.test(k) ? ' saves' : ''}`);
    if (PL_CONDITION_SPEED[n] != null) bits.push(PL_CONDITION_SPEED[n] ? 'speed halved' : 'speed 0');
    return bits.join(', ');
  };
  return `<div class="trk-conds"><span class="trk-label">Conditions</span>
    ${on.map((n) => `<span class="chip bad" title="${esc(desc(n))}">${esc(n)}${does(n) ? ` <small>· ${esc(does(n))}</small>` : ''} <button class="die-x-inline" data-track="cond" data-arg="-${esc(n)}" aria-label="End ${esc(n)}">×</button></span>`).join(' ') || '<span class="faint">None</span>'}
    ${all.length ? `<select class="cls-add" data-cond-add="1" aria-label="Add a condition"><option value="">Add a condition…</option>${all.filter((n) => !on.includes(n)).map((n) => `<option title="${esc(desc(n))}">${esc(n)}</option>`).join('')}</select>` : ''}
    ${on.some((n) => PL_CONDITION_ROLLS[n]) ? '<span class="faint">The dice roller applies them.</span>' : ''}</div>`;
}

// What each level of exhaustion does (SW5E's Exhaustion condition); a level includes all lower ones.
const EXHAUSTION = ['disadvantage on ability checks', 'speed halved', 'disadvantage on attack rolls and saving throws', 'hit point maximum halved', 'speed reduced to 0', 'death'];
function renderTracker(m) {
  const { t } = m;
  const { s, lim } = t;
  const dsDots = (kind, cls) => [1, 2, 3].map((n) => `<button class="dot${num(s.deathSaves[kind]) >= n ? ' on ' + cls : ''}" data-track="ds" data-arg="${kind}|${n}" aria-label="${kind} ${n}"></button>`).join('');
  const rows = [];
  if (lim.supMax) rows.push(counterRow(t, 'Superiority dice', lim.supMax - num(s.superiorityDiceUsed), lim.supMax, 'sup', '', esc(lim.supSize || '')));
  if (lim.force) rows.push(counterRow(t, 'Force points', lim.force - num(s.forcePointsUsed), lim.force, 'force'));
  if (lim.tech) rows.push(counterRow(t, 'Tech points', lim.tech - num(s.techPointsUsed), lim.tech, 'tech'));
  for (const d of lim.hitDice) rows.push(counterRow(t, `Hit dice (${d.size})`, t.hdLeft(d.size), d.maximum, 'hd', d.size + '|', rollable(`hitdie|${d.size}`, `roll ${esc(d.size)}${lim.hitDieBonus ? ' ' + signed(lim.hitDieBonus) : ''}`, 'Roll a hit die') + ', then Heal'));
  for (const f of lim.features) {
    const heal = healFeatureRoll(m, f.name);
    rows.push(counterRow(t, f.name, f.maximum - num(s.featuresTimesUsed[f.name]), f.maximum, 'feat', f.name + '|',
      (heal ? `${rollable(heal, `roll ${esc(heal.split('|')[2])} + ${esc(heal.split('|')[3])}`, `Use ${f.name}: roll its healing`)}, then Heal · ` : '') + (f.recharge === 'shortRest' ? 'short rest' : 'long rest')));
  }
  // Features you switch on (Rage, forms, Force Shield…): Start / End right in the tracker too.
  if (state.rules) {
    const seenState = new Set();
    const ctl = m.allFeatures.concat(pickedOptionFeatures(m), slotPickFeatures(m))
      .filter((f) => !seenState.has(f.name) && seenState.add(f.name))
      .map((f) => { const st = featureState(m, f); return (st && !st.extension ? stateControls(m, f) : '') + featureExtras(m, f, true); }).filter(Boolean);
    if (ctl.length) rows.push(`<div class="trk-row trk-states"><span class="trk-label">Start or end</span><span class="trk-state-btns">${ctl.join('')}</span></div>`);
  }
  const unlimited = (m.textUses || []).filter((u) => !Number.isFinite(u.maximum));
  for (const u of unlimited) rows.push(`<div class="trk-row"><span class="trk-label">${esc(u.name)} <span class="faint">${esc(u.basis)}</span></span><span class="trk-count"><b>Unlimited</b></span></div>`);
  const undo = state.undo && state.undo.key === m.snap.key ? state.undo : null;
  return `<div class="tracker">
    <div class="trk-top">
      <div class="trk-hp">
        <div class="trk-amount">
          <input id="trackAmount" type="number" min="0" step="1" inputmode="numeric" placeholder="Amount" aria-label="Amount of damage or healing" aria-describedby="trackHint" title="Enter: take it as damage · Shift + Enter: heal it">
          <select id="trackType" aria-label="Damage type" title="Damage type: resistances and immunities apply"><option value="">untyped</option>${PL_DAMAGE_TYPES.map((d) => `<option>${d}</option>`).join('')}</select>
          <button class="btn sm" data-track="damage" title="Take the amount as damage: temporary hit points go first, resistances of the chosen type apply, and at 0 hit points death saves begin">Damage</button><button class="btn sm" data-track="heal" title="Regain the amount in hit points, up to your maximum (at 0 hit points this ends dying)">Heal</button><button class="btn sm" data-track="temp" title="Gain the amount as temporary hit points; they don't stack: the higher amount stays">Temp HP</button>
        </div>
        <span class="faint hint-kbd trk-hint" id="trackHint">Enter: Damage · Shift + Enter: Heal</span>
      </div>
      <div class="trk-ds"><span class="trk-label">Death saves</span>
        <span class="ds-pair"><span class="ds-lbl good" title="Successes" aria-hidden="true">✓</span><span class="dots" role="group" aria-label="Successes">${dsDots('successes', 'good')}</span></span>
        <span class="ds-pair"><span class="ds-lbl bad" title="Failures" aria-hidden="true">✗</span><span class="dots" role="group" aria-label="Failures">${dsDots('failures', 'bad')}</span></span>
        <button class="btn sm" data-roll="death" title="Roll a death saving throw">Roll</button></div>
    </div>
    ${rows.length ? `<div class="trk-rows">${rows.join('')}</div>` : ''}
    ${renderConditions(m)}
    ${renderCombatRound(m)}
    ${hasForesight(m) ? `<div class="trk-round"><span class="trk-label">Foretelling (Force Visions)</span>${foretold().length ? foretold().map((n) => `<b class="chip accent">${n}</b>`).join(' ') : '<span class="faint">none left</span>'}
      <button class="btn sm" data-act="foretell-roll" title="Roll two d20s (done for you on a long rest)">Roll 2d20</button></div>` : ''}
    <div class="trk-misc">
      <button class="btn sm${s.hasInspiration ? ' on' : ''}" data-track="insp" aria-pressed="${!!s.hasInspiration}" title="Inspiration from the GM: spend it for advantage on one attack roll, saving throw or ability check (★ Use Inspiration in the dice roller)">${s.hasInspiration ? '★ Inspired' : '☆ Inspiration'}</button>
      <span class="trk-exh" title="${esc(EXHAUSTION.map((x, i) => `${i + 1}: ${x}`).join('\n'))}">Exhaustion <button class="btn sm" data-track="exh" data-arg="-1" ${num(s.exhaustion) <= 0 ? 'disabled' : ''} aria-label="One level of exhaustion less">−</button><b>${num(s.exhaustion)}</b><button class="btn sm" data-track="exh" data-arg="1" ${num(s.exhaustion) >= 6 ? 'disabled' : ''} aria-label="One more level of exhaustion">+</button></span>
      ${num(s.exhaustion) ? `<span class="faint exh-note">${esc(EXHAUSTION.slice(0, num(s.exhaustion)).join('; '))}${num(s.exhaustion) < 6 ? ' (the roller applies the disadvantage)' : ''}</span>` : ''}
      ${(() => { const both = new Set(lim.highLevels.map((r) => r.kind)).size > 1; return lim.highLevels.flatMap((r) => r.keys.map((k, i) => `<button class="btn sm${s.highLevelCasting[k] ? ' used' : ''}" data-track="hl" data-arg="${esc(k)}" title="Cast once per long rest">${both ? `${titleCase(r.kind)} ` : ''}${ordinal(r.level)}-level${r.keys.length > 1 ? ` #${i + 1}` : ''} ${s.highLevelCasting[k] ? 'used' : 'available'}</button>`)).join(''); })()}
    </div>
    <div class="trk-rest">
      <button class="btn" data-track="short" title="Regain superiority dice${lim.tech ? ', tech points' : ''} and short-rest feature uses. Spend hit dice above to heal.">Short rest</button>
      <button class="btn" data-track="long" title="Full HP, regain all points, dice and feature uses, half your hit dice; exhaustion −${longRestExhaustion(m)[0]}${longRestExhaustion(m)[1] ? ` (${esc(longRestExhaustion(m)[1])})` : ''}. Effects of 8 hours or less, and concentration, end.">Long rest</button>
      ${undo ? `<button class="btn" data-track="undo">Undo: ${esc(undo.label)}</button>` : ''}
      ${t.local ? '<span class="faint trk-src">HP and uses: saved here, not on sw5e.com yet.</span>' : ''}
      ${t.local && m.raw.id ? `<button class="btn primary sm needs-sw5e" data-act="save-sw5e" ${state.saving ? 'disabled' : ''}
        title="Update the copy on sw5e.com with these values">${state.saving === m.snap.key ? 'Syncing…' : 'Sync to SW5E'}</button>` : ''}
      ${t.local ? `<button class="linklike faint trk-reset" data-track="sw5e" title="Replace HP, points and uses here with sw5e.com's values (can be undone)">Use sw5e.com's values</button>` : ''}
    </div>
  </div>`;
}

function renderCombat(m) {
  const { c } = m;
  const speed = c.speed || {};
  const conds = arr(c.conditions);
  const condRefs = arr(m.refs.conditions);
  // The armor and shield worn, as pictures in the corner of the Armor Class box.
  const worn = arr(withEdits(m.snap.raw, editedFields(m.snap.key)).equipment).filter((it) => it.equipped)
    .map((it) => ({ it, ref: (catalogIndex && catalogIndex.get(it.name)) || it }))
    .filter(({ ref }) => ref.equipmentCategory === 'Armor' || ['Armor', 'Shield'].includes(ref.type));
  const acArt = worn.length ? `<span class="stat-art">${worn.map(({ it, ref }) => itemTile({ ...ref, color: it.color }, 'sm', it.label || it.name)).join('')}</span>` : '';
  return `
    <div class="grid auto">
      ${stat('Armor Class', bump(m, 'armorClass', esc(c.armorClass)) + acArt, esc(arr(c.armorList).join(', ') || 'Unarmored')
        + (acSetByTweak(m.raw) != null ? ` · <span class="warn-text" title="Armor, shields and effects don't change it while the tweak is there">set to ${acSetByTweak(m.raw)} by a tweak</span>` : '')
        // What can be added against one attack (Deflection's die, Shien Form's half WIS/CHA): acReactions (roller.js).
        + (typeof acReactions === 'function' && acReactions(m).length ? ` · <span title="Against one attack, when you choose (a reaction or a free roll)">vs one attack: ${esc(acReactions(m).join(', '))}</span>` : ''))}
      ${live('hp', m, 'div', 'stat')}
      ${stat('Initiative', rollable('init', bump(m, 'initiative', signed(c.initiative)), 'Roll initiative'))}
      ${(() => {
        const sp = m.t ? plSpeed(m.t.s.conditions, m.t.s.exhaustion) : { factor: 1, why: [] };
        const ae = armorEffectsOf(m);
        // "Your speed is reduced by 10 unless your Strength score meets or exceeds the strength number": SW5E's speed has
        // it already (engSpeed), so it's named, not taken off again; Cumbersome and conditions come on top.
        // A trait that ignores heavy armor's Strength (Gank: ignoreArmorStrength) cancels it: nothing to name.
        const strWhy = arr(m.effects).some((e) => e.ignoreArmorStrength) ? [] : ae.speedWhy.filter((w) => /Strength \d+$/.test(w));
        const extra = ae.speed + (ae.speedWhy.some((w) => /Strength \d+$/.test(w)) ? 10 : 0);
        // A state that says "Your speed is doubled" (Sovereign Protector) while it's on.
        const dbl = m.snap ? tempEffects(m.snap.key).find((e) => arr(e.notes).some((n) => /\byour speed (?:is doubled|doubles)\b/i.test(n))) : null;
        const factor = sp.factor * (dbl ? 2 : 0) || sp.factor;
        const why = sp.why.concat(ae.speedWhy.filter((w) => !/Strength \d+$/.test(w)), dbl ? [`doubled: ${dbl.name}`] : []);
        const now = factor === 1 && !extra ? '' : ` · <b class="${factor > 1 && !extra ? 'good-text' : 'bad-text'}">now ${Math.max(0, Math.floor((num(String(speed.base || '').replace(/\D/g, '')) + extra) * factor))} ft</b> (${esc(why.join(', '))})`;
        // "Whether mounted or on foot, your travel pace is doubled" (Blurrg's Instinct).
        const pace = featureTextsOf(m.raw).find((f) => /\byour travel pace is doubled\b/i.test(f.text));
        const miles = (v) => (pace && v ? `${Math.round(num(String(v).replace(/[^\d.]/g, '')) * 2 * 100) / 100} miles` : v);
        return stat('Speed', bump(m, 'speed.base', esc(speed.base || '—')) + now, esc([strWhy.length ? `−10 ft (${strWhy.join(', ')})` : '', speed.hour && `${miles(speed.hour)}/hour`, speed.day && `${miles(speed.day)}/day`, pace ? `travel pace ×2 (${pace.name})` : ''].filter(Boolean).join(' · ')));
      })()}
      ${stat('Proficiency', signed(c.proficiencyBonus))}
      ${stat('Passive Perception', bump(m, 'passivePerception', esc(c.passivePerception)))}
      ${live('hd', m, 'div', 'stat')}
      ${stat('Vision', esc((/^normal$/i.test(c.vision || 'normal') && (defensesOf(m).find((d) => d.kind === 'sense' && /^Darkvision/.test(d.text)) || {}).text) || titleCase(c.vision || 'normal')))}
    </div>
    ${speed.special ? `<p class="muted" style="margin:10px 0 0">Special movement: ${esc(speed.special)}</p>` : ''}
    <h3>Play tracker</h3>
    ${live('tracker', m)}
    ${arr(m.classDice).length ?`<h3>Class dice</h3><div class="chips class-dice">${m.classDice.map((d) => (d.dice
    ? rollable(`dice|${d.dice}`, chip(`${d.column} ${d.dice}`, 'accent'), `Roll ${d.column} (${d.cls})`)
    : chip(`${d.column} ${signed(d.bonus)}`))).join('')}</div>` : ''}
    ${renderDefenses(m)}
    <h3 id="effects">Effects</h3>
    ${live('effects', m)}
    <h3>Conditions</h3>
    <div class="desc">${conds.length ? conds.map((cn) => {
      const name = typeof cn === 'string' ? cn : cn.name;
      const ref = condRefs.find((r) => r.name === name);
      return `<p><b>${esc(name)}</b>${ref ? ' — ' + md(ref.description).replace(/^<p>|<\/p>$/g, '') : ''}</p>`;
    }).join('') : '<span class="empty">None active (from SW5E)</span>'}</div>
    <h3>Carrying capacity</h3>
    ${renderCarry(m)}`;
}

// ------------------------------------------------------------- defenses & senses
// Resistances, immunities, advantages on saves, senses and other speeds, read from the text of class
// features (and states that are on), species traits and feats. SW5E's data has none of these.
/** "Strength/Dexterity/Constitution " when half proficiency is on some abilities' checks only, '' for every check. */
const halfProfWhich = (e) => (Array.isArray(e.halfProf) ? `${e.halfProf.join('/')} ` : '');
const ADV_TEXT = (a) => (a.kind === 'init' ? 'Advantage on initiative' : a.kind === 'skill' ? `Advantage on ${a.skill} checks`
  : a.kind === 'attack' ? `Advantage on ${a.melee ? 'melee ' : ''}weapon attacks${a.ability ? ` using ${a.ability}` : ''}`
  : `Advantage on ${a.ability} ${a.kind === 'save' ? 'saving throws' : 'checks'}`);
function defensesOf(m) {
  const out = [];
  const add = (list, from, kind) => arr(list).forEach((d) => out.push({ ...d, from, state: kind === 'temporary' }));
  const seen = new Set();
  for (const e of m.effects) {
    if (seen.has(e.id) || !(e.kind === 'feature' || (e.kind === 'temporary' && ['feature', 'power', 'custom'].includes(e.source)))) continue;
    seen.add(e.id);
    add(e.defenses, e.name, e.kind);
    add(arr(e.advantage).map((a) => ({ kind: 'advantage', text: ADV_TEXT(a) })), e.name, e.kind);
    if (e.critRange) add([{ kind: 'other', text: `Critical hit on ${20 - e.critRange}–20 with ${e.critWeapons ? e.weaponName || 'the chosen weapon' : 'weapons'}` }], e.name, e.kind);
    if (e.halfProf) add([{ kind: 'other', text: `Half proficiency on ${halfProfWhich(e)}checks without it` }], e.name, e.kind);
  }
  // An item's damage reduction is itemDefenses' (with the item's wording and number), not listed twice.
  const fromText = (text, from, isItem = false) => {
    const fe = clsFeatureEffects(text || '', '', { level: 0, pb: num(m.c.proficiencyBonus), mods: Object.fromEntries(ABILITIES.map((a) => [a, num(((m.c.abilityScores || {})[a] || {}).modifier)])) });
    add(isItem ? fe.defenses.filter((d) => !/^Damage from .* reduced by\b/.test(d.text)) : fe.defenses, from);
    add(fe.advantage.map((a) => ({ kind: 'advantage', text: ADV_TEXT(a) })), from);
  };
  const sp = m.raw.species && m.raw.species.name && state.rules ? bdSpeciesRef(m.raw) : null;
  const traits = sp && arr(sp.traits).length ? sp.traits.map((t) => ({ name: t.name, text: bdTraitText(m.raw, t) })) : arr(m.speciesFeatures);
  for (const f of traits.concat(arr(m.feats))) fromText(f.text || f.description, f.name);
  // Equipment: enhanced items in use, worn weapons/armor, and other gear carried (a jetpack's flying
  // speed); not consumables, whose effects come from using them.
  for (const it of arr(m.raw.equipment)) {
    const ref = catalogIndex && catalogIndex.get(it.name);
    if (!ref || qtyOf(it) <= 0) continue;
    if (isEnhancedEntry(it)) {
      // In use: attuned, equipped or installed (whether or not it has numbers: Matrix Armor's text alone).
      if (ref.type === 'Consumable' || !(ref.requiresAttunement ? it.attuned : canEquip({ ...ref, isFound: true }, false) ? it.equipped : true)) continue;
    } else if (['Weapon', 'Armor'].includes(ref.equipmentCategory) ? !it.equipped
      : /Consumable|Explosive|Ammunition|Spice|AlcoholicBeverage|Medical/i.test(`${ref.equipmentCategory} ${ref.type}`)) continue;
    const text = itemDefenseText(ref.text || ref.description, it.notes);
    fromText(text, it.name, true);
    add(itemDefenses(text, num(m.c.proficiencyBonus)), it.name);
  }
  // An armor modification's absorptive / avoidant / reactive property (SW5E's armor properties).
  for (const e of m.effects.filter((x, i, all) => x.kind === 'item' && x.propsNow && all.findIndex((y) => y.id === x.id) === i)) {
    const p = e.propsNow;
    if (p.absorptive) add([{ kind: 'other', text: `Damage you take from weapons reduced by ${p.absorptive} (absorptive ${p.absorptive}; not below 1)` }], e.name);
    if (p.avoidant) add([{ kind: 'other', text: `Critical hit range of attacks against you −${p.avoidant} (avoidant ${p.avoidant})` }], e.name);
    if (p.reactive) add([{ kind: 'other', text: `+${p.reactive} AC against the next attack from a creature that hit you, until your next turn (reactive ${p.reactive})` }], e.name);
  }
  // "If you already have darkvision, these goggles increase its range by 30 feet": the longest darkvision from
  // something else, longer (the goggles' own 60 feet otherwise).
  const ft = (d) => num((/^Darkvision (\d+) ft/.exec(d.text) || [])[1]);
  for (const e of m.effects.filter((x) => (x.kind === 'item' || x.kind === 'feature') && x.darkvisionPlus)) {
    const own = out.filter((d) => d.kind === 'sense' && ft(d) && d.from !== e.name);
    const best = own.reduce((a, d) => (ft(d) > ft(a || {}) ? d : a), null);
    if (!best) continue;
    for (let i = out.length - 1; i >= 0; i--) if (out[i].kind === 'sense' && ft(out[i])) out.splice(i, 1);
    out.push({ kind: 'sense', text: `Darkvision ${ft(best) + e.darkvisionPlus} ft`, from: `${best.from} +${e.darkvisionPlus} ft ${e.name}` });
  }
  return out.filter((d, i) => out.findIndex((x) => x.text.toLowerCase() === d.text.toLowerCase()) === i);
}
/**
 * An item's text as defenses are read from it: the modes and options to pick from ("choosing one of the following
 * options: - …", "activate one of the below modes") and what it does for someone else ("give them advantage on saving
 * throws against poison") left out, and a set's bonuses (they need the other pieces); "you are resistant to" and the
 * "resistence" typo read as "you have resistance to"; "resistance to one type of damage" (the GM's choice) as the type
 * the item's note names.
 */
function itemDefenseText(text, note) {
  let t = String(text || '').replace(/\r\n?/g, '\n').replace(/\bresistence\b/gi, 'resistance').replace(/\byou are resistant to\b/gi, 'you have resistance to')
    // "You can activate or deactivate this implant as a bonus action. While active, you gain darkvision…": switched on
    // and off, as classes.js reads a jetpack ("… (when switched on)").
    .replace(/\byou can activate or deactivate (this [a-z ]+?) as an? (bonus )?action\. While active, /gi, (x, what, bonus) => `Activating or deactivating ${what} requires a ${bonus || ''}action and, while active, `)
    // The item is in use: "While wearing it, …", "… while you wear this armor" always hold.
    .replace(/\b(?:while|when) (?:you are )?wearing (?:it|this [a-z ]+?|these [a-z ]+?),\s*/gi, '').replace(/,? while you wear (?:it|this [a-z]+|these [a-z]+)(?=[.,])/gi, '');
  t = t.replace(/[^.\n]*\b(?:one of the following(?: options)?|one of the below modes|the following modes)\b[^\n]*(?:\n+\s*(?:_{3,}|-[^\n]*))+/gi, '');
  const types = String(note || '').toLowerCase().match(new RegExp(`\\b(?:${PL_DAMAGE_TYPES.map((x) => x.toLowerCase()).join('|')})\\b`, 'g'));
  // Until the type is noted, no resistance is listed (the item asks for it).
  t = types ? t.replace(/\bresistance to one type of damage\b/gi, `resistance to ${[...new Set(types)].join(' and ')} damage`)
    : t.replace(/[^.\n]*\bresistance to one type of damage\b[^.\n]*\.?/gi, '');
  let set = false;
  return t.split(/(?<=[.!?])\s+/).filter((s) => {
    if (/^while wearing and attuned to (?:this|these) \w+,? (?:and )?[A-Z]/i.test(s.replace(/^[*_]+[^*_]+[*_]+\s*/, ''))) { set = true; return false; }
    if (set && /^additionally\b/i.test(s)) return false;
    set = false;
    return !/\b(?:a target|give them|another creature|an ally|allies)\b/i.test(s);
  }).join(' ');
}
/**
 * Defenses an item's text gives that classes.js doesn't read (yet): "damage you take is reduced by 2" (Armor
 * (Champion)), "kinetic and energy damage that you take from unenhanced weapons is reduced by an amount equal to your
 * proficiency bonus" (Jensaarai Headgear), "any critical hit against you becomes a normal hit" (Matrix Armor).
 */
function itemDefenses(text, pb) {
  const out = [];
  let x;
  const T = `(?:${PL_DAMAGE_TYPES.join('|')})`;
  if ((x = new RegExp(`\\b((?:${T}(?:,? and |, ))*${T} )?damage (?:that )?you take(?: from ([^.]*?))? is reduced by (\\d+|an amount equal to your proficiency bonus)`, 'i').exec(text))) {
    const n = /^\d+$/.test(x[3]) ? Number(x[3]) : pb;
    out.push({ kind: 'other', text: `${x[1] ? `${x[1][0].toUpperCase()}${x[1].slice(1)}damage` : 'Damage'} you take${x[2] ? ` from ${x[2]}` : ''} reduced by ${n || 'your proficiency bonus'}` });
  }
  if (/\bany critical hit against you becomes a normal hit\b/i.test(text)) out.push({ kind: 'immunity', text: 'Critical hits against you are normal hits' });
  return out;
}
function renderDefenses(m) {
  if (!state.rules) return '';
  const defs = defensesOf(m);
  if (!defs.length) return '';
  const GROUPS = [['resistance', 'Resistances'], ['immunity', 'Immunities'], ['vulnerability', 'Vulnerabilities'], ['advantage', 'Advantages'], ['disadvantage', 'Disadvantages'],
    ['sense', 'Senses'], ['speed', 'Speeds'], ['other', 'Other']];
  return `<h3>Defenses &amp; senses</h3><div class="defs">${GROUPS.map(([k, label]) => {
    const list = defs.filter((d) => d.kind === k);
    // "…checks you make with them": say which feature "them" is in.
    const text = (d) => (/\b(?:it|them|these|those|this)$/i.test(d.text) ? `${d.text} (${d.from})` : d.text);
    return list.length ? `<div class="defs-row"><span class="faint">${label}</span><span class="chips">${list.map((d) => `<span class="chip${d.state ? ' good' : ''}" title="${esc(d.from)}${d.state ? ' (while active)' : ''}">${esc(text(d))}</span>`).join('')}</span></div>` : '';
  }).join('')}</div>`;
}

function renderCarry(m) {
  const cc0 = m.c.carryingCapacity || {};
  const base = (m.base && m.base.carryingCapacity) || cc0;
  const cf = carryFactor(m);
  const cc = cf.factor !== 1 ? { ...cc0, maxCapacity: num(cc0.maxCapacity) * cf.factor, pushDragLift: num(cc0.pushDragLift) * cf.factor } : cc0;
  const w = totalWeight(m);
  const why = cf.factor !== 1 || cf.from.length ? ` <span class="faint" title="SW5E's numbers ${esc(cc0.maxCapacity)} / ${esc(cc0.pushDragLift)} lb, ×${esc(cf.text)}">×${esc(cf.text)} (${esc(cf.from.concat(cf.size ? [cf.size] : []).join(', '))})</span>` : '';
  // The hover explains the number shown (×2 included), from the number without tweaks or effects.
  const calc = (k) => (cf.factor !== 1 ? { from: num(base[k]), to: cc[k] } : undefined);
  return `<div class="grid auto">
    ${stat('Carried', `${fmtNum(w)} lb`, `<span title="Variant encumbrance, if your GM uses it: encumbered, speed −10 ft; heavily encumbered, speed −20 ft and disadvantage on ability checks, attack rolls and saving throws that use Strength, Dexterity or Constitution">${w > num(cc.heavilyEncumbered) ? 'Heavily encumbered' : w > num(cc.encumbered) ? 'Encumbered' : 'Unencumbered'} (variant rule)</span>`)}
    ${stat('Encumbered at', bump(m, 'carryingCapacity.encumbered', `${esc(cc.encumbered ?? '—')} lb`))}
    ${stat('Heavily enc. at', bump(m, 'carryingCapacity.heavilyEncumbered', `${esc(cc.heavilyEncumbered ?? '—')} lb`))}
    ${stat('Max capacity', bump(m, 'carryingCapacity.maxCapacity', `${esc(cc.maxCapacity ?? '—')} lb`, calc('maxCapacity')) + why)}
    ${stat('Push / drag / lift', bump(m, 'carryingCapacity.pushDragLift', `${esc(cc.pushDragLift ?? '—')} lb`, calc('pushDragLift')) + why)}
  </div>`;
}

/**
 * What multiplies the carrying capacity and the weight you can push, drag, or lift: "Your carrying capacity and the
 * weight you can push, drag, or lift doubles. If it would already double, it instead triples." (Powerful Build, Brawny,
 * Bantha's Instinct, Mighty Build, an Iridonian Grav-lev Arm…: ×2, two or more ×3), and size: "For a Tiny creature,
 * halve these weights" (PHB, Size and Strength). From a feature's state ("you can gain the following benefits for 1
 * minute: … doubles", Totemic Might; "While anchored", Heavy Suit) only while that state is on. { factor, text, from, size }.
 */
function carryFactor(m) {
  const DOUBLES = /carrying capacity and the weight you can push, drag, or lift doubles/i;
  const temps = m.snap ? tempEffects(m.snap.key) : [];
  const on = (name) => temps.some((e) => e.name === name || String(e.group || '').toLowerCase() === `state:${String(name).toLowerCase()}`);
  const texts = arr(m.feats).concat(arr(m.allFeatures), state.rules && m.raw ? bdSpeciesTraitFeatures(m) : [], typeof slotPickFeatures === 'function' && state.rules ? slotPickFeatures(m) : [])
    .map((f) => ({ name: f.name, text: f.text || f.description || '' }));
  // Picked class options (Berserker Instincts: Bantha's Instinct).
  if (state.rules) {
    for (const k of arr(m.raw && m.raw.classes)) {
      const info = classChoiceInfo(m, k);
      for (const l of (info ? info.lists : [])) for (const p of l.chosen) { const o = l.options.find((x) => x.name === p.name); if (o) texts.push({ name: o.name, text: o.text || '' }); }
    }
  }
  // Enhanced items in use: equipped (installed), or attuned when they need it (Mighty Build, an Iridonian Grav-lev Arm).
  for (const it of arr(m.raw && m.raw.equipment)) {
    const ref = isEnhancedEntry(it) && catalogIndex && catalogIndex.get(it.name);
    if (ref && (ref.requiresAttunement ? it.attuned : it.equipped)) texts.push({ name: it.name, text: ref.text || ref.description || '' });
  }
  const from = [];
  for (const t of texts) {
    const sentences = String(t.text).replace(/\s+/g, ' ').split(/(?<=\.)\s+(?=[-A-Z_*#])/);
    const i = sentences.findIndex((s) => DOUBLES.test(s));
    if (i < 0 || from.includes(t.name)) continue;
    const lead = sentences.slice(Math.max(0, i - 2), i + 1).join(' ');
    const state = /\bwhile [a-z]+(?:ed|ing)\b|\bfor (?:1|one|10|ten) minutes?\b|\bfollowing benefits\b/i.test(lead);
    if (!state || on(t.name)) from.push(t.name);
  }
  const sp = state.rules && m.raw && m.raw.species ? rulesModule('species').find((x) => x.name === m.raw.species.name) : null;
  const tiny = !!sp && /^tiny$/i.test(String(sp.size || ''));
  const mult = from.length >= 2 ? 3 : from.length ? 2 : 1;
  const factor = mult * (tiny ? 0.5 : 1);
  return { factor, text: factor === 0.5 ? '½' : String(factor), from, size: tiny ? 'Tiny: halved' : '' };
}
/** The carrying-capacity hover's multipliers ("×2 Brawny feat", "×½ Tiny"): list items, or ''. */
function carryLines(m, path) {
  if (!/^carryingCapacity\.(?:maxCapacity|pushDragLift)$/.test(path)) return '';
  const cf = carryFactor(m);
  if (cf.factor === 1 && !cf.from.length) return '';
  return cf.from.map((n, i) => `<li><b>${i === 0 ? '×2' : i === 1 ? '×3 instead' : '(no more)'}</b> ${esc(n)} <span class="faint">"doubles; if it would already double, it instead triples"</span></li>`).join('')
    + (cf.size ? '<li><b>×½</b> Tiny <span class="faint">"For a Tiny creature, halve these weights"</span></li>' : '');
}
/** An ability score's increases the engine applies, each named: [{ n, label }]. */
function abilitySources(m, a) {
  const raw = m.raw;
  const out = [];
  if (state.rules && raw.species && raw.species.name) {
    const inc = bdSpeciesIncrease(raw);
    const n = num(inc.fixed[a]) + num((raw.species.abilityScoreImprovement || {})[a]);
    if (n) out.push({ n, label: raw.species.name });
  }
  if (state.rules) {
    for (const s of prAsiSlots(raw, state.rules.modules)) {
      const n = num(prAsiIncreases(s.value)[a]);
      if (n) out.push({ n, label: `ASI (${s.cls} ${s.level})` });
    }
  }
  const bf = raw.background && raw.background.feat;
  if (bf && num((bf.abilityScoreImprovements || {})[a])) out.push({ n: num(bf.abilityScoreImprovements[a]), label: `${bf.name} (background feat)` });
  const tw = getPath(raw.tweaks || {}, `abilityScores.${a}.score`);
  // A tweak the sheet leaves out (it repeats what the sheet applies by itself) adds nothing.
  const leftOut = arr(m.fx.twins).some((x) => x.effect.rkey === `abilityScores.${a}.score`);
  if (tw && num(tw.bonus) && !leftOut && !m.fx.tweaks.some((t) => t.path === `abilityScores.${a}.score` && t.effect.kind === 'tweak')) out.push({ n: num(tw.bonus), label: 'tweak' });
  return out;
}

function renderAbilities(m) {
  const { c, raw } = m;
  const tweaks = (raw.tweaks && raw.tweaks.abilityScores) || {};
  return `<div class="abilities">${ABILITIES.map((a) => {
    const s = (c.abilityScores || {})[a] || {};
    const base = raw.baseAbilityScores ? raw.baseAbilityScores[a] : null;
    const tw = tweaks[a] && tweaks[a].score;
    const path = `abilityScores.${a}.score`;
    const fx = m.fx.tweaks.filter((t) => t.path === path && !(t.effect.kind === 'tweak' && !num(t.bonus)));
    const fxBonus = fx.reduce((t, x) => t + x.bonus, 0);
    const set = tw && engHasOverride(tw) ? num(tw.override) : null;
    const floor = tw && set == null && engHasFloor(tw) ? num(tw.floor) : null;
    // Without the tweak's "bump to": what the score would be (base, increases, effects).
    const unbumped = floor != null ? num(((m.base.abilityScores || {})[a] || {}).value) + fxBonus : num(s.value);
    const bumped = floor != null && floor > unbumped;
    const diff = base != null ? (bumped ? unbumped : num(s.value)) - num(base) - (m.bumps[`abilityScores.${a}.value`] ? fxBonus : 0) : 0;
    const bits = [];
    if (base != null) bits.push(`base ${base}`);
    const kindNote = (e) => (e.kind === 'feature' ? ` (${e.origin || 'class feature'})` : { temporary: ' (temporary)', tweak: ' (tweak)' }[e.kind] || '');
    if (set != null) {
      // "Set to": the score is the tweak's; what effects would add is shown as not applied.
      bits.push(`set to ${set} by a tweak`);
      for (const x of arr(m.fx.setByTweak).filter((t) => t.path === path)) bits.push(`${signedLabel(num(x.bonus))} from ${x.effect.name}${kindNote(x.effect)}: not applied`);
    } else {
      // Where the rest comes from: the species, each Ability Score Improvement, the background feat's +1, tweaks.
      let left = diff;
      for (const p of abilitySources(m, a)) { bits.push(`${signedLabel(p.n)} ${p.label}`); left -= p.n; }
      if (left) bits.push(`${left > 0 ? '+' : '−'}${Math.abs(left)} other`);
      for (const x of fx) bits.push(`${signedLabel(x.bonus)} from ${x.effect.name}${kindNote(x.effect)}`);
      if (floor != null) bits.push(bumped ? `bumped to ${floor} by a tweak` : `at least ${floor} (a tweak)`);
    }
    const st = s.savingThrow || {};
    const skills = arr(s.skills);
    return `<div class="ability">
      <div class="top${fx.length ? ' boosted' : ''}"><div><div class="abbr">${ABBR[a]}</div><div class="muted" style="font-size:12px">${a}</div></div>
        <div class="mod">${rollable(`check|${a}`, bump(m, `abilityScores.${a}.modifier`, signed(s.modifier)), `Roll a ${a} check`)}</div><div class="score" title="Score">${bump(m, `abilityScores.${a}.value`, esc(s.value))}</div></div>
      <div class="rows">
        <div class="row ${st.proficiency && st.proficiency !== 'none' ? 'p' : ''}"><span class="n">${profPip(st.proficiency)}Saving throw</span><b>${rollable(`save|${a}`, bump(m, `abilityScores.${a}.savingThrow.modifier`, signed(st.modifier)), `Roll a ${a} saving throw`)}</b></div>
        ${skills.map((k, i) => `<div class="row ${k.proficiency && k.proficiency !== 'none' ? 'p' : ''}"><span class="n">${profPip(k.proficiency)}${esc(k.name)}</span><span>${rollable(`skill|${a}|${i}`, bump(m, `abilityScores.${a}.skills.${i}.modifier`, signed(k.modifier)), `Roll ${k.name}`)}</span></div>`).join('')}
      </div>
      <div class="breakdown">${esc(bits.join(' · '))}</div>
    </div>`;
  }).join('')}</div>
  <p class="faint" style="margin:10px 0 0;font-size:12px"><span class="pip"></span>not proficient &nbsp; <span class="pip proficient"></span>proficient &nbsp; <span class="pip expertise"></span>expertise</p>`;
}

function renderSkills(m) {
  const rows = [];
  for (const a of ABILITIES) {
    arr(((m.c.abilityScores || {})[a] || {}).skills).forEach((k, i) => rows.push({ ...k, ability: a, idx: i, path: `abilityScores.${a}.skills.${i}.modifier` }));
  }
  rows.sort((x, y) => x.name.localeCompare(y.name));
  // Passive scores: 10 + the skill's bonus, and what effects add to a passive only (Observant: +5, as with advantage);
  // Perception's is the engine's (passivePerception, with its own tweaks and effects).
  const passiveFx = (name) => arr(m.effects).filter((e) => num((e.passives || {})[name])).map((e) => ({ e, n: num(e.passives[name]) }));
  const passive = (k) => {
    if (k.name === 'Perception' && m.c.passivePerception != null) return bump(m, 'passivePerception', esc(m.c.passivePerception));
    const fx = passiveFx(k.name);
    const n = 10 + num(k.modifier) + fx.reduce((t, x) => t + x.n, 0);
    const shown = bump(m, k.path, String(n), null, { noAlts: true });
    return fx.length ? `<span title="${esc(fx.map((x) => `${signedLabel(x.n)} ${x.e.name}`).join(', '))}">${shown}</span>` : shown;
  };
  return `<div class="table-wrap"><table>
    <thead><tr><th>Skill</th><th>Ability</th><th class="num">Bonus</th><th class="num">Passive</th><th class="col-prof">Proficiency</th></tr></thead>
    <tbody>${rows.map((k) => `<tr class="${k.proficiency && k.proficiency !== 'none' ? 'prof' : ''}">
      <td class="skill-name">${profPip(k.proficiency)}${esc(k.name)}</td><td class="muted">${ABBR[k.ability]}</td>
      <td class="num"><b>${rollable(`skill|${k.ability}|${k.idx}`, bump(m, k.path, signed(k.modifier)), `Roll ${k.name}`)}</b></td><td class="num muted">${passive(k)}</td>
      <td class="col-prof">${k.proficiency && k.proficiency !== 'none' ? esc(titleCase(k.proficiency)) : '<span class="faint">—</span>'}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function renderAttacks(m) {
  const ws = arr(m.c.weapons);
  if (!ws.length) return empty('No weapons equipped.');
  const hc = handsConflict(withEdits(m.snap.raw, editedFields(m.snap.key)));
  return `<div class="table-wrap"><table>
    <thead><tr><th>Weapon</th><th class="num">To hit</th><th>Damage</th><th class="col-ability">Ability</th><th class="col-type">Type</th><th class="col-props">Properties</th></tr></thead>
    <tbody>${ws.map((w, wi) => {
      const ent = w.index >= 0 ? arr(withEdits(m.snap.raw, editedFields(m.snap.key)).equipment)[w.index] : null;
      const shown = ent && ent.enhancedBy ? ent.enhancedBy : ent && ent.label ? ent.label : w.name;
      const sh = weaponShots(m, w);
      // An Engineer's modified weapon: its mods (what they do on a hover or tap), and attunement.
      const mi = modifiedItemsOf(m).find((x) => x.item === w.name);
      const modLine = mi ? `<details class="w-mods"><summary>${esc(mi.what)}${mi.attune ? ' · attuned' : ''} · ${plural(mi.mods.length, 'mod')}</summary>
          ${mi.mods.map((x) => `<div><b>${esc(x.name)}</b>: ${mdInline(String(x.text).replace(/_\*\*[^*]+\*\*_\s*/g, '').replace(/\s+/g, ' ').trim())}</div>`).join('') || '<div class="faint">No modifications installed yet (Classes &amp; Progression).</div>'}</details>` : '';
      const hands = w.equipped !== false && hc && hc.weapons.includes(shown) ? `<span class="chip warn" title="${esc(handsWarning(hc))}">two-handed + shield</span>` : '';
      const enh = ent && ent.enhancedBy && catalogIndex ? catalogIndex.get(ent.enhancedBy) : null;
      // Unarmed: what the species strikes with (fist, claws, bite, horns…), in the character's own colour.
      const tile = w.name === 'Unarmed Strike' ? itemTile(unarmedOf(m), '', `${shown}: ${unarmedOf(m).artIcon.replace('unarmed-', '')}`)
        : itemTile({ ...w, rarityText: enh ? invRarity(enh) : w.rarityText, color: ent && ent.color }, '', shown);
      return `<tr>
      <td><div class="inv-item">${tile}<div class="inv-what"><b>${esc(shown)}</b>${shown !== w.name ? ` <span class="faint">(${esc(w.name)})</span>` : ''}${mi ? ' <span class="chip accent" title="Modified by your Engineer archetype">modified</span>' : ''}${hands ? ` ${hands}` : ''}${w.equipped === false ? ' <span class="chip">not equipped</span>' : ''}${w.isCustom ? ' <span class="chip">custom</span>' : ''}
        ${propsText(weaponProps(m, w)) ? `<div class="m-props">${propsHtml(weaponProps(m, w))}</div>` : ''}${modLine}
        ${sh ? `<div class="shots">Shots <b class="${sh.shots - sh.used ? '' : 'bad-text'}">${sh.shots - sh.used}</b>/${sh.shots}
          <button class="btn sm" data-act="shot" data-arg="${wi}" ${sh.used >= sh.shots ? 'disabled' : ''} title="Fired without rolling here (attacks rolled here count by themselves)">−1</button>
          <button class="btn sm" data-act="reload" data-arg="${wi}" ${sh.used ? '' : 'disabled'} title="Uses one ${esc(sh.ammo.toLowerCase())} from your inventory">Reload</button>
          <span class="faint">${sh.cells} ${esc(sh.cellName)}${sh.cells === 1 ? '' : 's'}</span></div>` : ''}</div></div></td>
      <td class="num"><b>${rollable(`attack|${wi}`, bump(m, `weapons.${wi}.attackBonus`, signed(w.attackBonus)), `Roll an attack with the ${w.name}`)}</b></td>
      <td>${rollable(`damage|${wi}`, bump(m, `weapons.${wi}.damageBonus`, esc(weaponDamageText(m, w))), `Roll ${w.name} damage`)}</td>
      <td class="muted col-ability">${esc(((t) => (t ? `${t.mod.ability || 'Dexterity'} (${t.mod.finesse ? 'finesse' : t.effect.name})` : w.ability || ''))(
        (w.name === 'Unarmed Strike' ? m.fx.tweaks.filter((t) => /^unarmed\./.test(t.path)) : m.fx.weaponTweaks.filter((t) => t.index === w.index)).find((t) => t.mod && (t.mod.finesse || t.mod.ability))))}</td>
      <td class="muted col-type">${esc(titleCase(w.weaponClassification || ''))}</td>
      <td class="col-props">${propsHtml(weaponProps(m, w)) || '<span class="faint">—</span>'}</td></tr>
      ${arr(w.modes).length ? `<tr class="dim"><td colspan="6">Modes: ${arr(w.modes).map((md_) => esc(md_.name || JSON.stringify(md_))).join(' · ')}</td></tr>` : ''}`;
    }).join('')}${specialAttacks(m).map((s) => `<tr>
      <td><div class="inv-item"><div class="inv-what"><b>${esc(s.name)}</b> <span class="chip" title="${esc(s.from)}">special attack</span><div class="m-props">${esc(s.props)}</div></div></div></td>
      <td class="num"><b>${rollable(`pattack|${s.name}|${s.attack}`, signed(s.attack), `Roll ${s.name}'s attack`)}</b></td>
      <td>${rollable(`dice|${s.dice}${s.bonus ? signed(s.bonus) : ''}|${s.name} damage|${s.type}`, esc(`${s.dice}${s.bonus ? signed(s.bonus) : ''} ${titleCase(s.type)}`), `Roll ${s.name}'s damage`)}</td>
      <td class="muted col-ability">${esc(s.ability)}</td><td class="muted col-type">${esc(titleCase(s.kind))}</td><td class="col-props"><span class="faint">${esc(s.props)}</span></td></tr>`).join('')}</tbody>
  </table></div>
  ${ws.some((w) => w.description) ? `<h3>Weapon notes</h3><div class="grid cards">${ws.filter((w) => w.description).map((w) => card({ title: w.name, body: md(w.description) })).join('')}</div>` : ''}`;
}

/**
 * Attacks a feature gives besides the weapons: "This special attack is a ranged focus attack with a range of 30 feet. You
 * are proficient with it, and you add your focus ability modifier to its attack and damage rolls. Its damage is necrotic,
 * … and it uses your Martial Arts die for its damage die" (Ichor Lightning). [{ name, from, attack, dice, bonus, type,
 * ability, kind, props }]
 */
function specialAttacks(m) {
  const out = [];
  const sc = m.c.abilityScores || {};
  const mod = (a) => num((sc[a] || {}).modifier);
  const pb = num(m.c.proficiencyBonus);
  for (const f of arr(m.allFeatures)) {
    const t = String(f.text || f.description || '').replace(/\s+/g, ' ');
    const x = /This special attack is a (ranged|melee) (\w+) attack with a range of (\d+) feet\. You are proficient with it, and you add your ([\w ]+?) modifier to its attack and damage rolls\. Its damage is (\w+)[^.]*?\buses your ([\w' ]+?) die for its damage die/i.exec(t);
    if (!x || out.some((s) => s.name === f.name)) continue;
    // "your focus ability modifier": the monk's, Wisdom or Charisma (the better one); else the ability named.
    const abilities = /focus ability/i.test(x[4]) ? ['Wisdom', 'Charisma'] : ABILITIES.filter((a) => new RegExp(`^${a}$`, 'i').test(x[4]));
    if (!abilities.length) continue;
    // The focus ability chosen on the Focus card ("You use your choice of Wisdom or Charisma for your focus ability").
    const focusNote = /focus ability/i.test(x[4]) ? featureNoteOf(m.raw, 'Focus') : '';
    const noted = abilities.filter((ab) => new RegExp(`\\b(?:${ab}|${ABBR[ab]})\\b`, 'i').test(focusNote));
    const a = noted.length === 1 ? noted[0] : abilities.reduce((b, c) => (mod(c) > mod(b) ? c : b));
    const col = arr(m.classDice).find((d) => d.dice && d.column.toLowerCase() === x[6].toLowerCase());
    if (!col) continue;
    out.push({ name: f.name, from: f.sourceName || f.name, attack: pb + mod(a), dice: col.dice, bonus: mod(a), type: x[5], ability: a, kind: `${x[1]} ${x[2]} attack`, props: `range ${x[3]} ft` });
  }
  return out;
}

function superiorityInfo(m) {
  const out = [];
  for (const k of arr(m.raw.classes)) {
    const ref = (m.refs.classes || {})[k.name];
    const rows = [];
    const lc = ref && ref.levelChanges && state.rules ? classRow(m.raw, k) : ref && ref.levelChanges && ref.levelChanges[String(k.levels)];
    if (lc) {
      for (const [col, v] of Object.entries(lc)) if (/superiority|maneuver/i.test(col)) rows.push([col, v]);
    }
    // An archetype with its own superiority table (Fireteam, Tactical Specialist: in its text) replaces the class's columns.
    const aref = k.archetype && (rulesModule('archetypes').find((a) => a.name === k.archetype.name) || (m.refs.archetypes || {})[k.archetype.name]);
    for (const col of ['Maneuvers Known', 'Superiority Dice Quantity', 'Superiority Dice Size', 'Superiority Dice']) {
      const v = aref ? clsArchetypeTableRaw(aref, col, num(k.levels)) : null;
      if (v == null || v === '') continue;
      const i = rows.findIndex(([c]) => c === col);
      if (i >= 0) rows[i] = [col, v]; else rows.push([col, v]);
    }
    if (rows.length || arr(k.maneuvers).length) out.push({ cls: k, rows });
  }
  return out;
}

function renderSuperiority(m) {
  const { c } = m;
  const sc = c.abilityScores || {};
  const mod = (a) => num((sc[a] || {}).modifier);
  const baseMod = (a) => num((((m.base.abilityScores || {})[a]) || {}).modifier);
  const pb = num(c.proficiencyBonus);
  const best = (list) => list.reduce((b, a) => (mod(a) > mod(b) ? a : b));
  const dcs = [
    ['Physical', best(['Strength', 'Dexterity', 'Constitution'])],
    ['Mental', best(['Intelligence', 'Wisdom', 'Charisma'])],
    ['General', best(ABILITIES)],
  ];
  // Superiority tweaks (physicalSaveDC, physicalModifier…) apply to the DCs and attacks worked out here.
  const tw = supTweaks(m);
  const dcOf = (t, a, md) => engTweaked(8 + pb + md(a), tw[`${t.toLowerCase()}SaveDC`] || {});
  const atkOf = (t, a, md) => pb + engTweaked(md(a), tw[`${t.toLowerCase()}Modifier`] || {});
  const info = superiorityInfo(m);
  const qtyShown = info.reduce((t, i) => t + i.rows.filter(([k]) => /quantity|^superiority dice$/i.test(k)).reduce((s, [, v]) => s + num(v), 0), 0);
  const byType = {};
  const refs = m.refs.maneuvers || {};
  for (const n of m.maneuverNames) {
    const r = refs[n] || rulesManeuver(n) || { name: n };
    (byType[r.type || 'Other'] = byType[r.type || 'Other'] || []).push(r);
  }
  return `
    <div class="grid auto">
      ${m.t && m.t.lim.supMax && m.t.lim.supMax !== qtyShown ? stat('Superiority dice', esc(m.t.lim.supMax), 'with styles, masteries and tweaks') : ''}
      ${info.flatMap((i) => i.rows.map(([k, v]) => stat(`${info.length > 1 ? `${i.cls.name}: ` : ''}${k}`,
        /size/i.test(k) && m.t && String(v) === String(m.t.lim.supSize) ? rollable('supdie', esc(v), 'Roll a superiority die') : esc(v)))).join('')}
      ${dcs.map(([t, a]) => stat(`${t} maneuver DC`, bump(m, `maneuver.${t}.${a}.dc`, String(dcOf(t, a, mod)), { from: 8 + pb + baseMod(a), to: dcOf(t, a, mod) }, { noAlts: true }),
        `${ABBR[a]} · attack ${rollable(`maneuver|${t}|${a}`, bump(m, `maneuver.${t}.${a}.attack`, signed(atkOf(t, a, mod)), { from: signed(pb + baseMod(a)), to: signed(atkOf(t, a, mod)) }, { noAlts: true }), `Roll a ${t.toLowerCase()} maneuver attack`)}`)).join('')}
      ${m.t && m.t.lim.supSize && !info.some((i) => i.rows.some(([k, v]) => /size/i.test(k) && String(v) === String(m.t.lim.supSize)))
        ? stat('Superiority die', rollable('supdie', esc(m.t.lim.supSize), 'Roll a superiority die')) : ''}
    </div>
    <p class="faint" style="font-size:12px;margin:8px 0 0">Dice come from the class table at your level; save DCs are calculated here as 8 + proficiency + your best eligible ability modifier (SW5E's site does not compute superiority). The ability is your choice: another eligible one gives 8 + proficiency + its modifier, and a maneuver attack's dice card lets you switch it.</p>
    ${Object.entries(byType).map(([t, list]) => `<h3>${esc(t)} maneuvers <span class="faint">(${list.length})</span></h3>
      <div class="grid cards">${list.map((r) => card({
        title: r.name, chips: [r.prerequisite ? chip('Prereq: ' + r.prerequisite, 'warn') : '', r.contentSource ? chip(r.contentSource) : ''].filter(Boolean),
        body: r.description ? md(r.description) : '<span class="empty">No description found in SW5E data.</span>',
      })).join('')}</div>`).join('')}`;
}

// ------------------------------------------------------------- powers
// Powers known come from three places: the classes' and archetypes' picks (SW5E's classes[i].forcePowers /
// techPowers and archetype.*, which its engine lists), powers that features, feats and species give (choice
// slots, choices.js; the engine knows nothing of them), and custom powers. Casting spends level + 1 points
// (powers.js), once per long rest for 6th level and up (archetype casters: 4th), and keeps concentration.

const rulesPower = (n) => rulesModule('powers').find((x) => x.name.toLowerCase() === String(n).toLowerCase()) || null;
/** Casting sources of the character's classes (powers.js pwClassCasting). */
const classCasting = (m) => (state.rules ? arr(m.raw.classes).flatMap((k, idx) => pwClassCasting(k, state.rules.modules || {}).map((c) => ({ ...c, k, idx }))) : []);
/** A species trait that rules out a kind of powers: { force: 'Force-Insensitive' | false, tech: … }. */
function speciesCannot(m) {
  const out = { force: false, tech: false };
  const sp = m.raw.species && state.rules ? bdSpeciesRef(m.raw) : null;
  for (const tr of arr(sp && sp.traits)) {
    const mm = /\byou can ?not use (force|tech) powers\b/i.exec(tr.description || '');
    if (mm) out[mm[1].toLowerCase()] = tr.name;
  }
  return out;
}
/** An archetype source SW5E's data calls a non-caster (Rakatan Order, Mechanist): its engine numbers are wrong. */
function blindSource(c) {
  if (c.source !== 'archetype') return false;
  const a = rulesModule('archetypes').find((x) => x.name === c.from);
  return !a || !a.casterType || a.casterType === 'None' || !num(a.casterRatio);
}
/**
 * The casting abilities a source's text names: { points: [ability], light, dark, universal, tech } (lists) or null for
 * the usual ones. "You use your Intelligence or Wisdom for light side powers (your choice), Intelligence or Charisma for
 * dark side powers…, and Intelligence, Wisdom, or Charisma for universal powers" (Archaeologist); "Intelligence, Wisdom,
 * or Charisma is your techcasting ability" (Rakatan); "+ your Intelligence, Wisdom, or Charisma modifier" (points).
 */
function sourceAbilities(c) {
  const a = c.source === 'archetype' ? rulesModule('archetypes').find((x) => x.name === c.from) : null;
  const t = String((a && a.text) || '').replace(/\s+/g, ' ');
  if (!t) return null;
  const list = (s) => String(s || '').split(/,? (?:or |and )?/).filter((x) => ABILITIES.includes(x));
  const L = '((?:Intelligence|Wisdom|Charisma)(?:,? (?:or )?(?:Intelligence|Wisdom|Charisma))*)';
  const out = {};
  let m;
  if ((m = new RegExp(`\\+ your ${L} modifier`, 'i').exec(t))) out.points = list(m[1]);
  if ((m = new RegExp(`You use (?:your )?${L} for light side powers(?: \\(your choice\\))?, ${L} for dark side powers(?: \\(your choice\\))?,? and ${L} for universal powers`, 'i').exec(t))) {
    out.light = list(m[1]); out.dark = list(m[2]); out.universal = list(m[3]);
  }
  if ((m = new RegExp(`${L} is your techcasting ability`, 'i').exec(t))) out.tech = list(m[1]);
  return Object.keys(out).length ? out : null;
}
/**
 * Casting the sheet works out itself, where SW5E's engine gets it wrong: an archetype its data calls a non-caster
 * (Rakatan Order, Mechanist), or one whose casting abilities the engine doesn't use (Archaeologist: Intelligence).
 * Returns { points, abilities, ability, numbers(power) → { dc, attack, ability }, sources: [name], partial } or null.
 * Points: the sources' table points plus one casting modifier (the best allowed); with an engine-known class of the
 * same kind as well, the engine's points plus the other sources' table points ("you only add your casting modifier once").
 */
function ownCasting(m, kind, casters = classCasting(m)) {
  const mine = casters.filter((c) => c.type === kind);
  if (!mine.length) return null;
  const sc = m.c.abilityScores || {};
  const mod = (a) => num((sc[a] || {}).modifier);
  const pb = num(m.c.proficiencyBonus);
  const usual = kind === 'tech' ? ['Intelligence'] : ['Wisdom', 'Charisma'];
  const own = mine.filter((c) => blindSource(c) || (sourceAbilities(c) && [].concat(...Object.values(sourceAbilities(c))).some((a) => !usual.includes(a))));
  if (!own.length) return null;
  const cast = kind === 'force' ? m.c.forceCasting : m.c.techCasting;
  const engineKnows = cast && typeof cast === 'object' && mine.some((c) => !blindSource(c));
  // "(your choice)": the ability noted on the casting card, for points, DC and attack alike; until then the best one.
  const chosenCast = castingChoice(m.raw, kind, [...new Set(own.flatMap((c) => arr((sourceAbilities(c) || {}).points || (sourceAbilities(c) || {}).tech)))]);
  const best = (list) => (chosenCast && list.includes(chosenCast) ? chosenCast : list.reduce((b, a) => (mod(a) > mod(b) ? a : b)));
  const pointAbilities = [...new Set(own.flatMap((c) => (sourceAbilities(c) || {}).points || (sourceAbilities(c) || {}).tech || usual))];
  const ability = best(pointAbilities);
  const points = engineKnows
    ? num(cast.maxPoints) + own.filter(blindSource).reduce((t, c) => t + c.points, 0) + Math.max(0, own.some((c) => !blindSource(c)) ? mod(ability) - Math.max(...usual.map(mod)) : 0)
    : mine.reduce((t, c) => t + c.points, 0) + mod(ability);
  // Numbers for a power, by its alignment and the abilities the source allows. Where SW5E computes the kind's casting
  // too, what tweaks and effects add to its numbers counts here as well (a focus generator's "+1 bonus to the force
  // attack rolls"): SW5E's number less its own 8 + proficiency + ability.
  const numbers = (p) => {
    const ab = Object.assign({}, ...own.map((c) => sourceAbilities(c) || {}));
    const k = kind === 'tech' ? 'tech' : /light/i.test(p.forceAlignment) ? 'light' : /dark/i.test(p.forceAlignment) ? 'dark' : 'universal';
    const list = ab[k] || (kind === 'tech' ? ab.tech || ab.points : null) || pwAbilities(p);
    const a = best(list);
    const extra = { dc: 0, attack: 0 };
    if (engineKnows) {
      const e = mod(engCastAbility(m, kind, k));
      extra.dc = num(cast[kind === 'tech' ? 'saveDC' : `${k}SaveDC`]) - (8 + pb + e);
      extra.attack = num(cast[kind === 'tech' ? 'attackModifier' : `${k}AttackModifier`]) - (pb + e);
    }
    return { dc: 8 + pb + mod(a) + extra.dc, attack: pb + mod(a) + extra.attack, ability: a, options: chosenCast && list.includes(chosenCast) ? [chosenCast] : [...new Set(list)] };
  };
  return { points, abilities: pointAbilities, ability, numbers, sources: own.map((c) => c.from), partial: !!engineKnows, ...numbers({ forceAlignment: 'Universal', powerType: kind === 'tech' ? 'Tech' : 'Force' }) };
}
function ownCastingPoints(m, casters) {
  const out = {};
  for (const kind of ['force', 'tech']) { const o = ownCasting(m, kind, casters); if (o) out[kind] = o.points; }
  return out;
}
/**
 * The highest level the character can cast powers of a kind at: the multiclass table when two classes cast it, else the
 * class or archetype table (SW5E's engine applies the multiclass table to any multiclass character, also when only one
 * class casts), else SW5E's number.
 */
function castMaxLevel(m, kind) {
  const multi = state.rules ? pwMulticlassMax(m.raw, state.rules.modules || {})[kind] : null;
  if (multi != null) return multi;
  const srcs = classCasting(m).filter((c) => c.type === kind);
  if (srcs.length) return srcs.reduce((t, c) => Math.max(t, c.maxLevel), 0);
  const cast = kind === 'force' ? m.c.forceCasting : m.c.techCasting;
  return cast && typeof cast === 'object' ? num(cast.maxPowerLevel) : 0;
}
/**
 * The levels of a kind cast only once per long rest, from the class with the most levels that casts it ("consult the
 * rules for casting in the class in which you have the most levels"), and the Vow of the Devoted's 4th: [{ kind, level,
 * keys }]. SW5E keeps one set (currentStats.highLevelCasting.level6…9): it's used for the main kind, and "force4"-style
 * keys for the other; Making This Up As You Go allows 4th-level force powers twice ("level4", "level4b").
 */
function highLevelRules(m, kind) {
  if (!state.rules) return [];
  const modules = state.rules.modules || {};
  const casters = classCasting(m);
  const main = casters.length ? casters.slice().sort((a, b) => num(b.k.levels) - num(a.k.levels))[0].type : 'force';
  const levels = new Set(pwHighOnce(m.raw, modules, kind));
  let max = castMaxLevel(m, kind);
  const res = choiceInfo(m);
  for (const s of (res ? res.slots : []).filter((x) => x.focus && x.picks.length && /force/i.test(x.kind) && kind === 'force')) {
    for (const l of arr(s.onceLevels)) levels.add(l);
    max = Math.max(max, num(s.levelMax));
  }
  const twice = kind === 'force' && arr(m.raw.classes).some((k) => Object.values(k.options || {}).some((ps) => arr(ps).some((p) => /^Making This Up As You Go$/i.test(p.name))));
  return [...levels].filter((l) => l <= max).sort((a, b) => a - b).map((l) => {
    const key = kind === main ? `level${l}` : `${kind}${l}`;
    return { kind, level: l, keys: twice && l === 4 ? [key, `${key}b`] : [key] };
  });
}
const highUsed = (m, r) => r.keys.filter((k) => m.t.s.highLevelCasting[k]).length;
/**
 * Every power the character knows or can cast of a kind: [{ power, name, level, source, mode ('points' | 'free' | 'once' |
 * 'feature' | 'focus'), freeLevel, use (tracker name), slot, castOnly, invalid }].
 */
function knownPowers(m, kind) {
  const type = kind === 'force' ? 'Force' : 'Tech';
  const out = [];
  const seen = new Set();
  const add = (x) => { const key = `${x.name.toLowerCase()}|${x.source}|${x.mode}`; if (!seen.has(key)) { seen.add(key); out.push(x); } };
  const cast = kind === 'force' ? m.c.forceCasting : m.c.techCasting;
  const casters = classCasting(m);
  const fromClass = {};
  for (const c of casters.filter((x) => x.type === kind)) for (const n of c.chosen) fromClass[String(n).toLowerCase()] = c;
  const max = castMaxLevel(m, kind);
  // A pick the class can't have yet isn't castable: above the max power level, or of the other kind; nor any power of a
  // kind the species can't use ("Force-Insensitive: You can not use force powers").
  const cant = speciesCannot(m)[kind];
  const invalid = (p, c) => (cant ? `${cant}: you can't use ${kind} powers` : !c ? 'not from a class that casts it' : num(p.level) > c.maxLevel ? `above ${c.from}'s max power level (${c.maxLevel})` : '');
  for (const p of arr(cast && cast.powersKnown).filter((x) => x && x.name && x.powerType === type)) {
    const custom = arr(m.raw[kind === 'force' ? 'customForcePowers' : 'customTechPowers']).some((n) => String(n).toLowerCase() === p.name.toLowerCase());
    const c = fromClass[p.name.toLowerCase()];
    add({ power: p, name: p.name, level: num(p.level), source: c ? c.from : custom ? 'Custom power' : 'Class', mode: 'points', invalid: custom ? '' : invalid(p, c) });
  }
  // Powers known without the engine (archetype casters it doesn't recognise, e.g. Rakatan Order).
  for (const c of casters.filter((x) => x.type === kind)) {
    for (const n of c.chosen) {
      const p = rulesPower(n);
      if (p && p.powerType === type) add({ power: p, name: p.name, level: num(p.level), source: c.from, mode: 'points', invalid: invalid(p, c) });
    }
  }
  const res = state.rules ? choiceInfo(m) : null;
  const mine = (s, p) => {
    const castsAs = s.castAs === 'tech' ? 'tech' : s.castAs === 'force' ? 'force' : null;
    return castsAs ? castsAs === kind : p.powerType === type || s.castAs === 'either';
  };
  for (const s of (res ? res.slots : []).filter((x) => /owers$/.test(x.kind))) {
    for (const pk of s.picks) {
      const p = rulesPower(pk.name);
      if (!p || !mine(s, p) || !s.options.some((o) => o.name === p.name)) continue;
      const free = s.free === 'base' ? num(p.level) : s.free;
      const source = p.powerType !== type ? `${s.from} (cast as ${kind})` : s.from;
      const base = { power: p, name: p.name, level: num(p.level), source, slot: s, castOnly: s.castOnly };
      // What the grant allows: once per rest (feats, species, Telekinetic Ministrations), the feature's own uses
      // (System Override), free at will (Holocam on your beast), the vow's focus points, or the usual points.
      const own = s.feature && m.t && m.t.lim.features.some((u) => u.name === s.feature) ? s.feature : null;
      if (s.oncePerRest && own) add({ ...base, mode: 'feature', freeLevel: free, use: own });
      else if (s.oncePerRest) add({ ...base, mode: 'once', freeLevel: free, use: powerUseName(p.name, s) });
      else if (s.useFeature) add({ ...base, mode: 'feature', freeLevel: free, use: s.useFeature });
      else if (s.free != null) add({ ...base, mode: 'free', freeLevel: free });
      else if (s.focus) add({ ...base, mode: 'focus', maxCast: s.levelMax });
      else {
        const none = !casters.some((c) => c.type === kind) && !(cast && typeof cast === 'object');
        add({ ...base, mode: 'points', invalid: s.castOnly || num(p.level) <= max || p.powerType !== type ? '' : none ? `you have no ${kind} points to cast it with` : `above your max power level (${max})` });
      }
    }
  }
  // A power you can't cast with points but can another way (Naturalist: "You can cast it once… without spending tech
  // points"): only that way, not also "Not castable".
  return out.filter((x) => !(x.mode === 'points' && x.invalid && out.some((y) => y !== x && y.name === x.name && y.mode !== 'points' && !y.invalid)));
}
/** Once-per-rest casts: one per power, or one for the feature when it gives several ("Once you've cast a power using this feature…"). */
const powerUseName = (power, slot) => (slot.castOnly && slot.count > 1 && slot.useFeature !== false ? `${String(slot.from).replace(/\s*\(.*$/, '')} (cast)` : `${power} (${String(slot.from).replace(/\s*\(.*$/, '')})`);
/** The Monk's focus points as a tracked use ("Focus": the Focus Points column). */
const focusUse = (m) => (m.t ? m.t.lim.features.find((f) => /^focus$/i.test(f.name)) || m.t.lim.features.find((f) => /focus point/i.test(f.basis || '')) : null);
/** Once-per-rest casts of granted powers, as feature uses for the tracker (back on the rest the text says). */
function powerUses(m, fUses = []) {
  const res = state.rules ? choiceInfo(m) : null;
  if (!res) return [];
  const out = [];
  // A feature whose own uses are counted already ("Once you've used this feature…": Telekinetic Ministrations) spends those.
  for (const s of res.slots.filter((x) => /owers$/.test(x.kind) && x.oncePerRest && !(x.feature && fUses.some((u) => u.name === x.feature)))) {
    for (const p of s.picks) {
      const name = powerUseName(p.name, s);
      if (!out.some((u) => u.name === name)) out.push({ name, maximum: 1, recharge: s.oncePerRest, basis: s.oncePerRest === 'shortRest' ? 'once per short or long rest' : 'once per long rest' });
    }
  }
  return out;
}

/**
 * Casting abilities features give by damage type: "When you cast a force power that deals lightning damage, you can use
 * Wisdom or Charisma as your forcecasting ability for it" (Way of Lightning). [{ kind, damage, abilities, from }]
 */
function damageAbilityRules(m) {
  if (!state.rules) return [];
  const out = [];
  for (const k of arr(m.raw.classes)) {
    const cref = rulesModule('classes').find((x) => x.name === k.name);
    const aref = k.archetype && rulesModule('archetypes').find((a) => a.name === k.archetype.name);
    const feats = (cref ? clsTextFeatures(cref.classFeatureText, k.name, 'Class') : []).concat(aref ? clsTextFeatures(aref.text, aref.name, 'Archetype') : []);
    for (const f of feats.filter((x) => x.level <= num(k.levels))) {
      for (const mm of String(f.text).replace(/\s+/g, ' ').matchAll(/\bWhen you cast an? (force|tech) power that deals (\w+) damage, you can use ((?:Intelligence|Wisdom|Charisma)(?:,? (?:or )?(?:Intelligence|Wisdom|Charisma))*) as your (?:force|tech)casting ability for it/gi)) {
        out.push({ kind: mm[1].toLowerCase(), damage: mm[2].toLowerCase(), abilities: mm[3].split(/,? (?:or )?/).filter((a) => ABILITIES.includes(a)), from: f.name });
      }
    }
  }
  return out;
}
/** Casting numbers for a power: the ability its grant names, the sheet's own casting, SW5E's numbers by alignment, else 8 + PB + ability. */
function powerNumbers(m, kind, p, x = {}) {
  const sc = m.c.abilityScores || {};
  const pb = num(m.c.proficiencyBonus);
  const mod = (a) => num((sc[a] || {}).modifier);
  // "Wisdom or Charisma (your choice) is your forcecasting modifier for these powers" (Evil Eye, species).
  if (x.slot && arr(x.slot.abilities).length) {
    const a = x.slot.abilities.reduce((b, c) => (mod(c) > mod(b) ? c : b));
    return { dc: 8 + pb + mod(a), attack: pb + mod(a), spec: null, ability: a, options: x.slot.abilities };
  }
  for (const r of damageAbilityRules(m)) {
    if (r.kind !== kind || !new RegExp(`\\b${r.damage} damage\\b`, 'i').test(p.description || '')) continue;
    const a = r.abilities.reduce((b, c) => (mod(c) > mod(b) ? c : b));
    return { dc: 8 + pb + mod(a), attack: pb + mod(a), spec: null, ability: a, options: r.abilities, from: r.from };
  }
  const own = ownCasting(m, kind);
  const fromOwn = own && (!own.partial || own.sources.includes(x.source));
  if (fromOwn) return { ...own.numbers(p), spec: null };
  const cast = kind === 'force' ? m.c.forceCasting : m.c.techCasting;
  if (kind === 'force') {
    const k = /light/i.test(p.forceAlignment) ? 'light' : /dark/i.test(p.forceAlignment) ? 'dark' : 'universal';
    if (cast && typeof cast === 'object') return { dc: num(cast[k + 'SaveDC']), attack: num(cast[k + 'AttackModifier']), spec: `force|${k}`, ability: engCastAbility(m, kind, k), options: engCastAbilities(m, kind, k) };
    const best = pwAbilities(p).reduce((b, a) => (mod(a) > mod(b) ? a : b));
    return { dc: 8 + pb + mod(best), attack: pb + mod(best), spec: null, ability: best, options: pwAbilities(p) };
  }
  if (cast && typeof cast === 'object') return { dc: num(cast.saveDC), attack: num(cast.attackModifier), spec: 'tech', ability: engCastAbility(m, kind, 'tech'), options: engCastAbilities(m, kind, 'tech') };
  return { dc: 8 + pb + mod('Intelligence'), attack: pb + mod('Intelligence'), spec: null, ability: 'Intelligence' };
}
/**
 * The ability behind SW5E's casting numbers of a kind ('light', 'dark', 'universal', 'tech'): Wisdom for light side
 * powers, Charisma for dark side, the better of the two for universal ones, Intelligence for tech; a feat's swap
 * (castingSwaps) adds its ability where it replaces one. The best of them, by the character's modifiers.
 */
function engCastAbility(m, kind, k) {
  const sc = m.c.abilityScores || {};
  const mod = (a) => num((sc[a] || {}).modifier);
  return engCastAbilities(m, kind, k).reduce((b, a) => (mod(a) > mod(b) ? a : b));
}
/** The abilities SW5E's casting numbers of a kind may use (universal powers: Wisdom or Charisma; a feat's swap adds one). */
function engCastAbilities(m, kind, k) {
  let list = k === 'light' ? ['Wisdom'] : k === 'dark' ? ['Charisma'] : k === 'universal' ? ['Wisdom', 'Charisma'] : ['Intelligence'];
  for (const s of castingSwaps(m.raw)) if (s.kind === kind && s.chosen && list.includes(s.from)) list = list.concat(s.to);
  return list;
}
/**
 * "Your choice" of ability for a roll (decided: the best one by default, another one picked on the dice card): the spec's
 * end for a power's rolls, "|Ability|Wisdom,Charisma" (nothing when there's only one).
 */
const abilitySpec = (n) => (n && n.ability && arr(n.options).length > 1 ? `|${n.ability}|${n.options.join(',')}` : '');
/** A save DC with the other abilities' DCs ("DC 15 (WIS; CHA 13)"). */
function dcWithOthers(m, n) {
  if (!n.ability || arr(n.options).length < 2) return esc(n.dc);
  const mod = (a) => num(((m.c.abilityScores || {})[a] || {}).modifier);
  const others = n.options.filter((a) => a !== n.ability).map((a) => `${ABBR[a]} ${n.dc - mod(n.ability) + mod(a)}`);
  return `${esc(n.dc)} <span class="faint" title="Your choice: the best one is used; another one gives these">(${ABBR[n.ability]}; ${esc(others.join(', '))})</span>`;
}
/**
 * Feats that change the casting ability: "Choose one from Wisdom or Charisma. … You can use Intelligence instead of the
 * chosen ability as your forcecasting ability. You can add Intelligence instead of the chosen ability when determining
 * your maximum force points" (Cunning Forcecaster); "You can use the chosen ability instead of Intelligence as your
 * techcasting ability…" (Spiritual Techcaster). The chosen ability: the feat's notes, else its ability increase when
 * that is one of the choices. [{ name, kind, from, to, points, chosen, options }]; chosen false: not chosen yet.
 */
/** The character's feats by name: the background's, those taken at improvements, the ones added by hand (all: repeats kept). */
function featNamesOf(raw, all = false) {
  const names = [raw.background && raw.background.feat && raw.background.feat.name]
    .concat(arr(raw.classes).flatMap((k) => arr(k.abilityScoreImprovements).filter((a) => a && a.type === 'Feat').map((a) => a.name)), arr(raw.customFeats).map((f) => (typeof f === 'string' ? f : f && f.name)))
    .filter(Boolean);
  return all ? names : [...new Set(names)];
}
function castingSwaps(raw) {
  if (!state.rules) return [];
  const A = '(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|the chosen ability)';
  const out = [];
  for (const name of featNamesOf(raw)) {
    const t = String((rulesModule('feats').find((f) => f.name === name) || {}).text || '').replace(/\s+/g, ' ');
    const x = new RegExp(`You can use ${A} instead of ${A} as your (force|tech)casting ability`, 'i').exec(t);
    if (!x) continue;
    const choice = /Choose one from ((?:\w+)(?:,? (?:or )?\w+)*)/i.exec(t);
    const options = choice ? choice[1].split(/,? (?:or )?/).filter((a) => ABILITIES.includes(a)) : [];
    const note = featureNoteOf(raw, name);
    const inc = typeof bdFeatIncreases === 'function' ? bdFeatIncreases(raw).find((y) => y.name === name) : null;
    // "Increase the chosen ability score by 1" (Spiritual Techcaster): the +1's pick is the chosen ability, one choice.
    const viaInc = !!inc && /\bincrease the chosen ability score\b/i.test(t);
    const chosen = viaInc ? arr(inc.chosen).find((a) => options.includes(a)) || null
      : options.find((a) => new RegExp(`\\b(?:${a}|${ABBR[a]})\\b`, 'i').test(note)) || (inc ? arr(inc.chosen).find((a) => options.includes(a)) : null) || null;
    const pick = (s) => (/chosen/i.test(s) ? chosen : titleCase(s));
    const kind = x[3].toLowerCase();
    out.push({
      name, kind, from: pick(x[2]), to: pick(x[1]), options, chosen: !!chosen, viaInc,
      points: new RegExp(`You can add ${A} instead of ${A} when determining your maximum ${kind} points`, 'i').test(t),
    });
  }
  return out;
}
/** A power's casting ability modifier ("temporary hit points equal to your forcecasting ability modifier"). */
const powerCastMod = (m, ability) => num((((m.c.abilityScores || {})[ability]) || {}).modifier);
/** Does a power call for a force/tech attack or a saving throw? */
const powerNeedsRoll = (p) => /\b(?:force|tech|power) attack\b|\bmake a (?:melee|ranged) (?:force |tech |power )?attack\b|\bsaving throw\b/i.test(String(p.description || ''));
/**
 * What a power's damage, healing or reduction roll adds, by source: [{ label, value }].
 * - "+ your forcecasting ability modifier": the casting ability's modifier. Not the attack bonus less proficiency: an
 *   item's "+1 bonus to the force attack rolls" (Focus Generator) isn't in the damage.
 * - Bonuses to damage or healing rolls with powers of the kind ("a +1 bonus to its damage and healing rolls with force
 *   powers", Sorcerer's Adrenal): effects on forcePowers.damage / forcePowers.healing, techPowers.damage / techPowers.healing.
 * - "While raging, you add your rage damage to damage rolls from force powers you cast that require a force attack or
 *   saving throw" (Furious Force, Industrious Tech): Rage Damage, while raging.
 * Conditional bonuses (cond) on those paths are offered on the roll instead (powerRollConds).
 */
function powerRollParts(m, kind, p, g, ability) {
  const parts = [];
  if (g.mod && ability) parts.push({ label: `${ABBR[ability]} modifier`, value: powerCastMod(m, ability) });
  if (g.reduce) return parts;
  const path = `${kind}Powers.${g.heal ? 'healing' : 'damage'}`;
  for (const t of arr(m.fx && m.fx.tweaks).filter((x) => x.path === path)) parts.push({ label: t.effect.kind === 'tweak' ? 'tweak' : t.effect.name, value: num(t.bonus) });
  if (!g.heal && m.snap && tempEffects(m.snap.key).some((e) => e.group === 'state:raging') && powerNeedsRoll(p)) {
    const word = kind === 'force' ? 'force' : 'tech';
    const f = arr(m.allFeatures).find((x) => new RegExp(`while raging, you add your rage damage to damage rolls from ${word} powers you cast`, 'i').test(x.text || x.description || ''));
    const rage = f && arr(m.classDice).find((d) => d.bonus && /rage damage/i.test(d.column));
    if (rage) parts.push({ label: `Rage Damage (${f.name})`, value: num(rage.bonus) });
  }
  return parts.filter((x) => x.value);
}
/** Conditional bonuses to a power's damage or healing ("when using this weapon as your focus"), offered unticked. */
function powerRollConds(m, kind, g) {
  if (g.reduce) return [];
  const path = `${kind}Powers.${g.heal ? 'healing' : 'damage'}`;
  return arr(m.fx && m.fx.conds).filter((cd) => cd.path === path).map((cd) => ({ label: `${cd.cond} (${cd.effect.name})`, bonus: num(cd.bonus), extra: [], on: false }));
}
const powerRollBonus = (m, kind, p, g, ability) => powerRollParts(m, kind, p, g, ability).reduce((t, x) => t + x.value, 0);

/** A power that calls for a force/tech attack: its attack roll (and the save DC for one that calls for a save). */
function powerRoll(m, kind, p, x) {
  const d = String(p.description || '');
  const n = powerNumbers(m, kind, p, x);
  const bits = [];
  if (/\b(?:force|tech|power) attack\b|\bmake a (?:melee|ranged) (?:force |tech |power )?attack\b/i.test(d)) {
    bits.push(`Attack ${rollable(n.spec || `pattack|${p.name}|${n.attack}${abilitySpec(n)}`, signed(n.attack), `Roll ${p.name}'s attack`)}`);
  }
  const save = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw\b/i.exec(d);
  if (save) bits.push(`${save[1]} save DC ${dcWithOthers(m, n)}`);
  const lvl = charLevel(m);
  plPowerRolls(p, num(p.level), lvl).forEach((g, i) => {
    const mod = powerRollBonus(m, kind, p, g, n.ability);
    bits.push(`${titleCase(g.heal ? 'Healing' : g.reduce ? 'Reduction' : 'Damage')} ${rollable(`pdmg|${kind}|${p.name}|${num(p.level)}|${i}|${n.ability || ''}${g.mod && arr(n.options).length > 1 ? `|${n.options.join(',')}` : ''}`, `${g.n}d${g.die}${mod ? signed(mod) : ''}`, `Roll ${p.name}'s ${g.label}`)}${g.type ? ` ${esc(g.type)}` : ''}`);
  });
  return bits.length ? `<div class="pw-roll">${bits.join(' · ')}</div>` : '';
}
const charLevel = (m) => num(m.c.currentLevel) || arr(m.raw.classes).reduce((t, k) => t + num(k.levels), 0);
/** The Force-Empowered Casting options (and the like) the character chose: [{ name, text }]. */
function castingOptions(m, kind) {
  if (kind !== 'force' || !state.rules) return [];
  return arr(m.raw.classes).flatMap((k) => {
    const info = classChoiceInfo(m, k);
    const l = info && info.lists.find((x) => /empowered casting/i.test(x.title));
    return l ? l.chosen.map((p) => l.options.find((o) => o.name === p.name)).filter(Boolean).map((o) => ({ name: o.name, text: o.text || '' })) : [];
  }).filter((o) => plCastingOptionCost(o.text, 1) > 0);
}
/** Cast controls on a power card: level (and its cost), once-per-rest, feature-use or free casts, focus points, concentration. */
function castControls(m, kind, x) {
  if (!m.t) return '';
  const p = x.power;
  if (x.invalid) return `<div class="cast-ctl"><span class="chip warn">Not castable: ${esc(x.invalid)}</span></div>`;
  const pts = kind === 'force' ? m.t.lim.force - num(m.t.s.forcePointsUsed) : m.t.lim.tech - num(m.t.s.techPointsUsed);
  const arg = (extra = '') => `${kind}|${x.name}|${x.mode}|${x.use || ''}|${extra}`;
  // "This power no longer requires concentration for you when you target yourself with it" (Path of Ethereality).
  const self = x.slot && x.slot.noConcSelf && p.concentration ? `<button class="btn sm" data-act="pw-cast" data-arg="${esc(arg('self'))}" title="On yourself: no concentration">On yourself</button>` : '';
  const at = x.freeLevel ? ` at ${ordinal(x.freeLevel)} level` : '';
  if (x.mode === 'once') {
    const left = 1 - num(m.t.s.featuresTimesUsed[x.use]);
    return `<div class="cast-ctl"><button class="btn sm primary" data-act="pw-cast" data-arg="${esc(arg())}" ${left > 0 ? '' : 'disabled'} title="Cast without points; once per ${x.slot.oncePerRest === 'shortRest' ? 'short or long' : 'long'} rest">Cast${at} (${left ? 'available' : 'used'})</button>${self}</div>`;
  }
  if (x.mode === 'feature') {
    const u = m.t.lim.features.find((f) => f.name === x.use);
    const left = u ? u.maximum - num(m.t.s.featuresTimesUsed[u.name]) : 0;
    return `<div class="cast-ctl"><button class="btn sm primary" data-act="pw-cast" data-arg="${esc(arg())}" ${left > 0 ? '' : 'disabled'} title="Cast without points; uses ${esc(x.use)}">Cast${at}</button> <span class="faint">${u ? `${left}/${u.maximum} ${esc(x.use)} uses left` : `uses ${esc(x.use)}`}</span>${self}</div>`;
  }
  if (x.mode === 'free') return `<div class="cast-ctl"><button class="btn sm primary" data-act="pw-cast" data-arg="${esc(arg())}" title="Cast without points">Cast free${at}${x.slot && x.slot.target ? ` on your ${esc(x.slot.target)}` : ''}</button>${self}</div>`;
  const rules = highLevelRules(m, kind);
  const usedUp = (l) => { const r = rules.find((y) => y.level === l); return r && highUsed(m, r) >= r.keys.length; };
  const onceNote = (l) => { const r = rules.find((y) => y.level === l); return !r ? '' : usedUp(l) ? ' (used today)' : r.keys.length > 1 ? ` (${r.keys.length - highUsed(m, r)} of ${r.keys.length} left today)` : ' (once per long rest)'; };
  if (x.mode === 'focus') {
    // "Powers you learn through this vow are cast using your focus points, at 1 focus point per power level."
    const focus = focusUse(m);
    const left = focus ? focus.maximum - num(m.t.s.featuresTimesUsed[focus.name]) : 0;
    if (!x.level) return p.concentration ? `<div class="cast-ctl"><button class="btn sm" data-act="pw-cast" data-arg="${esc(arg())}" title="At-will: no focus points; starts concentration">Cast</button></div>` : '';
    const opts = [];
    for (let l = x.level; l <= Math.max(x.level, num(x.maxCast)); l++) opts.push(`<option value="${l}"${usedUp(l) ? ' disabled' : ''}>${ordinal(l)} level · ${l} focus point${l === 1 ? '' : 's'}${onceNote(l)}</option>`);
    return `<div class="cast-ctl"><select data-pw-level="${esc(kind + '|' + x.name)}" aria-label="Cast ${esc(x.name)} at level">${opts.join('')}</select>
      <button class="btn sm primary" data-act="pw-cast" data-arg="${esc(arg())}" ${left >= x.level ? '' : 'disabled'} title="Spend focus points and cast">Cast</button> <span class="faint">${left} focus left</span></div>`;
  }
  // Casting options (Quickened, Twinned…): one per cast, their points on top.
  const copts = castingOptions(m, kind);
  const meta = copts.length ? `<select data-pw-meta="${esc(kind + '|' + x.name)}" aria-label="Casting option"><option value="">No casting option</option>${copts.map((o) => `<option value="${esc(o.name)}">${esc(o.name)} (+${/equal to the power's level/i.test(o.text) ? `${Math.max(1, x.level)}` : plCastingOptionCost(o.text, x.level)})</option>`).join('')}</select>` : '';
  if (!x.level) {
    const does = p.concentration || (p.duration && !/^instant/i.test(String(p.duration).trim())) || plPowerRolls(p, 0, charLevel(m)).length;
    return does ? `<div class="cast-ctl"><button class="btn sm" data-act="pw-cast" data-arg="${esc(arg())}" title="At-will: no points${p.concentration ? '; starts concentration' : ''}">Cast</button>${meta}${self}</div>` : '';
  }
  const max = castMaxLevel(m, kind);
  const opts = [];
  for (let l = x.level; l <= max; l++) opts.push(`<option value="${l}"${usedUp(l) ? ' disabled' : ''}>${ordinal(l)} level · ${pwCost(l)} points${onceNote(l)}</option>`);
  return `<div class="cast-ctl"><select data-pw-level="${esc(kind + '|' + x.name)}" aria-label="Cast ${esc(x.name)} at level">${opts.join('')}</select>${meta}
    <button class="btn sm primary" data-act="pw-cast" data-arg="${esc(arg())}" ${pts >= pwCost(x.level) ? '' : 'disabled'} title="Spend the points and cast">Cast</button>${self}</div>`;
}
async function castPower(arg) {
  const [kind, name, mode, use, extra] = arg.split('|');
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const m = buildModel(snap);
  const x = knownPowers(m, kind).find((y) => y.name === name && y.mode === mode);
  if (!x || !m.t || x.invalid) return;
  const p = x.power;
  // "If you are able to cast powers, you can't cast them or concentrate on them while raging" — unless Furious Force:
  // "as long as the power's casting time is no more than 1 action, the power does not require concentration".
  const raging = tempEffects(snap.key).some((e) => e.group === 'state:raging');
  if (raging) {
    const furious = arr(m.raw.classes).some((k) => k.archetype && /Marauder Approach/i.test(k.archetype.name));
    const quick = /^(?:Action|BonusAction|Reaction)$/i.test(String(p.castingPeriod || (rulesPower(name) || {}).castingPeriod || ''));
    if (!furious || !quick || (p.concentration && extra !== 'self')) return setStatus(`You can't cast ${name} while raging${furious ? ' (Furious Force: 1 action or less, no concentration)' : ''}.`, 'error');
  }
  const rules = highLevelRules(m, kind);
  // A level cast once per long rest: mark the first unused allowance.
  const takeHigh = async (l) => {
    const r = rules.find((y) => y.level === l);
    if (!r) return true;
    const key = r.keys.find((k) => !m.t.s.highLevelCasting[k]);
    if (!key) { setStatus(`You've already cast ${r.keys.length > 1 ? `${r.keys.length} ` : 'a '}${ordinal(l)}-level ${kind} power${r.keys.length > 1 ? 's' : ''} since your last long rest.`, 'error'); return false; }
    await trackerAction('hl', key);
    return true;
  };
  let level = x.level;
  const metaSel = document.querySelector(`[data-pw-meta="${CSS.escape(kind + '|' + name)}"]`);
  const metaOpt = metaSel && metaSel.value ? castingOptions(m, kind).find((o) => o.name === metaSel.value) : null;
  if (mode === 'once') {
    if (1 - num(m.t.s.featuresTimesUsed[use]) <= 0) return setStatus(`${name}: already cast since your last ${x.slot.oncePerRest === 'shortRest' ? 'short or long' : 'long'} rest.`, 'error');
    await trackerAction('feat', `${use}|1`);
    level = x.freeLevel || x.level;
  } else if (mode === 'feature') {
    const u = m.t.lim.features.find((f) => f.name === use);
    if (u && u.maximum - num(m.t.s.featuresTimesUsed[use]) <= 0) return setStatus(`No ${use} uses left.`, 'error');
    if (u) await trackerAction('feat', `${use}|1`);
    level = x.freeLevel || x.level;
  } else if (mode === 'free') level = x.freeLevel || x.level;
  else if (mode === 'focus') {
    const sel = document.querySelector(`[data-pw-level="${CSS.escape(kind + '|' + name)}"]`);
    level = Math.max(x.level, num(sel ? sel.value : x.level));
    const focus = focusUse(m);
    const left = focus ? focus.maximum - num(m.t.s.featuresTimesUsed[focus.name]) : 0;
    if (!focus || level > left) return setStatus(`Not enough focus points: ${name} at ${ordinal(level)} level costs ${level}, ${left} left.`, 'error');
    if (!(await takeHigh(level))) return;
    if (level) await trackerAction('feat', `${focus.name}|${level}`);
  } else if (x.level > 0) {
    const sel = document.querySelector(`[data-pw-level="${CSS.escape(kind + '|' + name)}"]`);
    level = Math.min(castMaxLevel(m, kind), Math.max(x.level, num(sel ? sel.value : x.level)));
    const cost = pwCost(level) + (metaOpt ? plCastingOptionCost(metaOpt.text, level) : 0);
    const left = kind === 'force' ? m.t.lim.force - num(m.t.s.forcePointsUsed) : m.t.lim.tech - num(m.t.s.techPointsUsed);
    if (cost > left) return setStatus(`Not enough ${kind} points: ${name} at ${ordinal(level)} level${metaOpt ? `, ${metaOpt.name}` : ''} costs ${cost}, ${left} left.`, 'error');
    if (!(await takeHigh(level))) return;
    await trackerAction(kind, String(cost));
  }
  // A casting option on a cast that costs no points (at-will, once per rest, a feature use): only its own points.
  const metaCost = metaOpt ? plCastingOptionCost(metaOpt.text, level) : 0;
  if (metaOpt && !(mode === 'points' && x.level > 0)) {
    const left = m.t.lim.force - num(buildModel(snap).t.s.forcePointsUsed);
    if (metaCost > left) return setStatus(`Not enough force points for ${metaOpt.name}: ${metaCost}, ${left} left.`, 'error');
    await trackerAction(kind, String(metaCost));
  }
  // What the power does to whoever it's on (its numbers, defenses, dice it adds to rolls), and its rolls.
  const pfx = plPowerEffect(p, charLevel(m));
  const hasFx = pfx.mods.length || pfx.defenses.length || pfx.riders.length || pfx.tempHp;
  const own = hasFx && !pfx.forTarget ? { mods: pfx.mods, defenses: pfx.defenses, riders: pfx.riders } : {};
  const castNums = powerNumbers(m, kind, p, x);
  const castAbility = castNums.ability;
  const castMod = powerCastMod(m, castAbility);
  // Concentration: a new concentration power ends the one before (not on yourself where the feature says so).
  let note = '';
  if (p.concentration && extra !== 'self') {
    const s2 = itemStateOf(snap.key);
    const replaced = startEffect(s2, {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'temporary', source: 'power', name: `${name} (concentration)`,
      startedAt: Date.now(), duration: String(p.duration || '').replace(/^Concentration,?\s*/i, ''), group: 'concentration', mods: [], notes: [`Concentrating on ${name}${level > x.level ? ` (cast at ${ordinal(level)} level)` : ''}.`], target: 'self',
      power: name, castMod, ...own,
    });
    await saveItemStateFor(snap.key, s2);
    note = replaced.length ? ` Concentration on ${replaced.map((e) => e.name.replace(/ \(concentration\)$/, '')).join(', ')} ended.` : ' Concentrating.';
  } else if (p.concentration) note = ' On yourself: no concentration.';
  // A power that lasts a while without concentration (Battle Precognition, 8 hours): a reminder under Effects; casting it
  // again replaces the earlier one.
  if (!p.concentration && p.duration && !/^instant/i.test(String(p.duration).trim())) {
    const s3 = itemStateOf(snap.key);
    startEffect(s3, {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'temporary', source: 'power', name,
      startedAt: Date.now(), duration: String(p.duration), group: `power:${name}`, mods: [], notes: [`${name}${level > x.level ? ` (cast at ${ordinal(level)} level)` : ''} is active: ${String(p.duration).toLowerCase()}.`], target: 'self',
      power: name, castMod, ...own,
    });
    await saveItemStateFor(snap.key, s3);
    note += ` Listed under Effects for its ${String(p.duration).toLowerCase()}; End it there.`;
  }
  if (Object.keys(own).length) scheduleRecompute(snap.key);
  renderAll(); // the cast buttons show what's left
  // Next steps: its rolls at this level, "On me" for a power whose benefits go to its target, Ashla's hit points.
  const buttons = plPowerRolls(p, level, charLevel(m)).map((g, i) => {
    const b = powerRollBonus(m, kind, p, g, castAbility);
    return { act: 'roll', arg: `pdmg|${kind}|${name}|${level}|${i}|${castAbility || ''}${g.mod && arr(castNums.options).length > 1 ? `|${castNums.options.join(',')}` : ''}`, label: `Roll ${g.label} (${g.n}d${g.die}${b ? signed(b) : ''})` };
  });
  const effectNow = tempEffects(snap.key).find((e) => e.power === name);
  if (hasFx && pfx.forTarget && effectNow) buttons.push({ act: 'pw-onme', arg: effectNow.id, label: 'It\'s on me: apply it' });
  if (pfx.tempHp && !pfx.forTarget && castMod > 0) buttons.push({ act: 'pw-temp', arg: String(castMod), label: `Temp HP ${castMod}` });
  const ashla = /light/i.test(p.forceAlignment || '') && level > 0 && /\bashla\b/i.test(featureNoteOf(m.raw, 'Force Affinity'));
  if (ashla) buttons.push({ act: 'ashla', arg: String(level), label: `Ashla: +${level} HP max on me (1 minute)` });
  const optNote = metaOpt ? `, ${metaOpt.name} (+${metaCost} force point${metaCost === 1 ? '' : 's'})` : '';
  const autoNote = Object.keys(own).length ? ` ${[pfx.mods.length ? pfx.mods.map((x) => x.label).join(', ') : '', pfx.defenses.map((d) => d.text).join(', '), pfx.riders.map((r) => `+${r.dice} on ${r.on.join('/').replace('weapon-damage', 'weapon damage')}`).join(', ')].filter(Boolean).join('; ')} while it lasts.` : '';
  setStatus(`Cast ${name}${level ? ` at ${ordinal(level)} level` : ''}${mode === 'points' && level ? ` (${pwCost(level)} ${kind} points)` : mode === 'focus' && level ? ` (${level} focus points)` : mode === 'once' ? ` (once per ${x.slot.oncePerRest === 'shortRest' ? 'short or long' : 'long'} rest)` : mode === 'feature' ? ` (a use of ${use})` : mode === 'free' ? ' (free)' : ''}${optNote}.${note}${autoNote}`, '', false, buttons);
}

/** "It's on me": a power cast on yourself whose benefits go to its target (Heroism, Guidance): add them to its effect. */
async function powerOnMe(id) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  const e = st.effects.find((x) => x.id === id);
  const p = e && rulesPower(e.power);
  if (!p) return;
  const pfx = plPowerEffect(p, charLevel(buildModel(snap)));
  Object.assign(e, { mods: pfx.mods, defenses: pfx.defenses, riders: pfx.riders, onMe: true });
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  const temp = pfx.tempHp && num(e.castMod) > 0 ? [{ act: 'pw-temp', arg: String(e.castMod), label: `Temp HP ${e.castMod} now` }] : [];
  setStatus(`${p.name} is on you${pfx.defenses.length ? `: ${pfx.defenses.map((d) => d.text).join(', ')}` : ''}${pfx.riders.length ? `${pfx.defenses.length ? ';' : ':'} +${pfx.riders.map((r) => r.dice).join(', +')} offered on ${[...new Set(pfx.riders.flatMap((r) => r.on))].join(' and ').replace('check', 'ability checks')}` : ''}.${pfx.tempHp ? ' Temporary hit points at the start of each of your turns (Next round offers them).' : ''}`, '', false, temp);
}
/** Ashla (Force Affinity): after a light side power, +level hit point maximum (and current) for 1 minute; one at a time. */
async function ashlaBoost(level) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  startEffect(st, {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'temporary', source: 'feature', name: 'Ashla',
    startedAt: Date.now(), duration: '1 minute', group: 'affinity:ashla', notes: [], target: 'self',
    mods: [{ path: 'hitPoints.maximum', bonus: num(level), label: `HP max +${num(level)}` }],
  });
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(`Ashla: hit point maximum and current hit points +${num(level)} for 1 minute.`);
}

/** SW5E's universal DC with the other ability's: " (WIS; CHA 13)" (your choice; the best one by default). */
function castOthers(m, k, dc) {
  const list = engCastAbilities(m, 'force', k);
  return list.length > 1 ? ` ${dcWithOthers(m, { dc, ability: engCastAbility(m, 'force', k), options: list }).replace(/^\S+ /, '')}` : '';
}
function renderCasting(m, kind) {
  const own = ownCasting(m, kind);
  const cast = kind === 'force' ? m.c.forceCasting : m.c.techCasting;
  // Every caster of the kind works out its own numbers (Archaeologist: Intelligence): SW5E's light, dark and universal
  // numbers belong to none of its powers, so the card shows the sheet's.
  const allOwn = !!own && own.partial && classCasting(m).filter((c) => c.type === kind).every((c) => own.sources.includes(c.from));
  const has = cast && typeof cast === 'object' && !(own && !own.partial) && !allOwn;
  const max = castMaxLevel(m, kind);
  const multi = state.rules ? pwMulticlassMax(m.raw, state.rules.modules || {})[kind] != null : false;
  const statsHtml = [
    m.t && m.t.lim[kind] ? live(`points:${kind}`, m, 'div', 'stat') : '',
    has || classCasting(m).some((c) => c.type === kind) ? stat('Max power level', `${esc(max)}`, multi ? 'multiclass table' : '') : '',
    ...(kind === 'force'
      ? (has ? ['light', 'dark', 'universal'].map((k) => stat(k === 'universal' ? 'Universal' : `${titleCase(k)} side`,
        `DC ${bump(m, `forceCasting.${k}SaveDC`, esc(cast[k + 'SaveDC']))}${k === 'universal' ? castOthers(m, k, num(cast[k + 'SaveDC'])) : ''}`, `attack ${rollable(`force|${k}`, bump(m, `forceCasting.${k}AttackModifier`, signed(cast[k + 'AttackModifier'])), `Roll a ${k} force attack`)}`)) : [])
      : (has ? [stat('Save DC', bump(m, 'techCasting.saveDC', esc(cast.saveDC))), stat('Attack', rollable('tech', bump(m, 'techCasting.attackModifier', signed(cast.attackModifier)), 'Roll a tech attack'))] : [])),
    ...(own && allOwn && kind === 'force' ? ['Light', 'Dark', 'Universal'].map((al) => {
      const n = own.numbers({ forceAlignment: al });
      return stat(al === 'Universal' ? al : `${al} side`, `DC ${dcWithOthers(m, n)}`, `attack ${rollable(`pattack|${al} force|${n.attack}${abilitySpec(n)}`, signed(n.attack), `Roll a ${al.toLowerCase()} force attack`)} (${ABBR[n.ability]})`);
    }) : []),
    ...(own && (!own.partial || (allOwn && kind === 'tech')) ? [stat('Save DC', dcWithOthers(m, own), ABBR[own.ability]), stat('Attack', rollable(`pattack|${kind === 'force' ? 'Force' : 'Tech'}|${own.attack}${abilitySpec(own)}`, signed(own.attack), `Roll a ${kind} attack`), ABBR[own.ability])] : []),
  ].filter(Boolean);
  const powers = [];
  const srcOf = (x) => String(x.source).replace(/\s*\(.*$/, '');
  for (const x of knownPowers(m, kind)) {
    const same = powers.find((y) => y.name === x.name && srcOf(y) === srcOf(x));
    if (same) (same.also = same.also || []).push(x); else powers.push(x);
  }
  const byLevel = {};
  for (const x of powers) (byLevel[x.level] = byLevel[x.level] || []).push(x);
  const alignKind = (a) => /light/i.test(a) ? 'light' : /dark/i.test(a) ? 'dark' : 'blue';
  return `<div class="grid auto">${statsHtml.join('')}</div>
    ${highLevelRules(m, kind).length ? `<div style="margin-top:10px">${live('hl', m, 'div', 'chips')}</div>` : ''}
    ${own ? `<p class="faint" style="font-size:12px">${esc(own.sources.join(', '))}: SW5E's numbers don't follow the rules here, so ${own.partial ? 'its powers\' DC and attack (and the extra points)' : 'points (table + the best of ' + esc(own.abilities.join('/')) + '), DC and attack'} are worked out on this sheet.</p>`
      : !has && powers.length ? '<p class="faint" style="font-size:12px">SW5E computes no casting for this character; DCs and attacks below are 8 + proficiency + the casting ability.</p>' : ''}
    ${Object.keys(byLevel).sort((a, b) => a - b).map((lvl) => `<h3>${lvl === '0' ? 'At-will' : ordinal(num(lvl)) + '-level'} powers <span class="faint">(${byLevel[lvl].length})</span></h3>
      <div class="grid cards">${byLevel[lvl].sort((a, b) => a.name.localeCompare(b.name)).map((x) => {
        const p = x.power;
        const pn = powerNumbers(m, kind, p, x);
        const n = has && x.mode === 'points' && !/cast as/.test(x.source) && !(x.slot && arr(x.slot.abilities).length) && !(own && own.sources.includes(x.source)) && !pn.from ? null : pn;
        return card({
          title: p.name,
          chips: [
            p.forceAlignment && p.forceAlignment !== 'None' ? chip(p.forceAlignment, alignKind(p.forceAlignment)) : '',
            p.concentration ? chip('Concentration', 'warn') : '',
            p.prerequisite ? chip('Prereq: ' + p.prerequisite, 'warn') : '',
            x.source !== 'Class' ? chip(x.source, x.mode === 'points' ? '' : 'accent') : '',
            ...[x, ...arr(x.also)].map((y) => (y.mode === 'once' ? chip(y.slot.oncePerRest === 'shortRest' ? 'Once per short rest' : 'Once per long rest') : y.mode === 'feature' ? chip(`Uses ${y.use}`) : y.mode === 'free' ? chip('No points') : '')),
            x.castOnly ? `<span class="chip" title="The feature lets you cast it; it isn't one of the powers you know">cast only</span>` : '',
          ].filter(Boolean),
          facts: [['Casting', p.castingPeriodText || p.castingPeriod], ['Range', p.range], ['Duration', p.duration],
            n ? ['DC / attack', `${n.dc} / ${signed(n.attack)}${n.ability ? ` (${ABBR[n.ability]})` : ''}`] : null, ['Source', p.contentSource]].filter(Boolean),
          lead: [x, ...arr(x.also)].map((y) => castControls(m, kind, y)).join('') + powerRoll(m, kind, p, x),
          body: md(p.description) + (p.higherLevelDescription ? `<p><b>At higher levels.</b></p>${md(p.higherLevelDescription)}` : ''),
        });
      }).join('')}</div>`).join('') || empty('No powers known.')}`;
}

/** The class's powers-known picker (class casting and archetype casting), in its class card. */
/** A class's powers known, with the pickers (`onlyType`: 'force' or 'tech' only, for its Forcecasting/Techcasting card). */
function renderPowerBlocks(m, k, idx, onlyType = null) {
  if (!state.rules) return '';
  // Powers the character knows (learned ones: not those a feature only lets you cast).
  const learned = new Set(['force', 'tech'].flatMap((kind) => knownPowers(m, kind).filter((x) => !x.castOnly).map((x) => x.name.toLowerCase())));
  const res = choiceInfo(m);
  const sources = pwClassCasting(k, state.rules.modules || {}).filter((c) => !onlyType || c.type === onlyType);
  const blocks = sources.map((c) => {
    const T = c.type === 'force' ? 'Force' : 'Tech';
    const chosen = c.chosen;
    const unique = [...new Set(chosen.map((n) => String(n).toLowerCase()))];
    // "If a power is granted to you by a class feature… If you already know that power, you may learn an additional power."
    const extra = (res ? res.slots : []).filter((s) => s.classFeature && s.given && !s.castOnly && s.owner === k.name)
      .flatMap((s) => s.picks.map((p) => p.name.toLowerCase())).filter((n) => unique.includes(n)).length;
    const allowed = c.known + extra;
    const problems = [];
    const cant = speciesCannot(m)[c.type];
    if (cant && chosen.length) problems.push(`${cant}: you can't use ${c.type} powers`);
    if (unique.length > allowed) problems.push(`${unique.length} known, the table gives ${c.known}${extra ? ` (+${extra} for a power a feature also gives)` : ''}`);
    chosen.forEach((n, i) => {
      const p = rulesPower(n);
      if (chosen.findIndex((x) => String(x).toLowerCase() === String(n).toLowerCase()) !== i) { problems.push(`${n} is chosen twice`); return; }
      if (!p) { problems.push(`${n}: not in SW5E's data`); return; }
      if (p.powerType !== T) problems.push(`${n} is a ${p.powerType.toLowerCase()} power`);
      if (num(p.level) > c.maxLevel) problems.push(`${n} is ${ordinal(num(p.level))} level; your max power level is ${c.maxLevel}`);
      const unmet = pwUnmetPrereq(p, [...learned]);
      if (unmet.length) problems.push(`${n} needs ${unmet.join(' and ')} (learn it too)`);
    });
    const avail = rulesModule('powers').filter((p) => p.powerType === T && num(p.level) <= c.maxLevel && !learned.has(p.name.toLowerCase()));
    const byLevel = {};
    for (const p of avail) (byLevel[num(p.level)] = byLevel[num(p.level)] || []).push(p);
    const arg = `${idx}|${c.field}`;
    return `<div class="cls-list"><div class="cls-head"><b>${T} powers</b> ${countChip(unique.length, allowed)}
        <span class="faint">${esc(c.source === 'archetype' ? `${c.from} table${c.replaces ? ` (instead of ${c.replaces}'s)` : ''}` : `${k.name} table`)} · max power level ${c.maxLevel}</span></div>
      ${problems.map((p) => `<div class="slot-problem">${esc(p)}</div>`).join('')}
      <div class="cls-picks">${chosen.map((n, i) => ({ n, i, p: rulesPower(n) }))
        // At-will first, then by level, alphabetical within each (not the order they were learned).
        .sort((a, b) => (a.p ? num(a.p.level) : 99) - (b.p ? num(b.p.level) : 99) || String(a.n).localeCompare(String(b.n))).map(({ n, i, p }) => {
        return `<details class="cls-pick"><summary><b>${esc(n)}</b>${p ? ` <span class="faint">${p.level ? ordinal(num(p.level)) + ' level' : 'at-will'}${p.forceAlignment && p.forceAlignment !== 'None' ? ' · ' + esc(p.forceAlignment) : ''}</span>` : ''}
          <button class="btn sm cls-x" data-act="pw-remove" data-arg="${esc(arg)}|${i}" title="Forget this power" aria-label="Forget ${esc(n)}">×</button></summary>
          ${p ? `${p.prerequisite ? `<div class="faint">Prerequisite: ${esc(p.prerequisite)}</div>` : ''}<div class="desc">${md(p.description || '')}</div>` : ''}</details>`;
      }).join('') || '<span class="faint">None chosen yet.</span>'}</div>
      <select class="cls-add" data-pw-add="${esc(arg)}" aria-label="Learn a ${c.type} power"><option value="">Learn a ${c.type} power…</option>
        ${Object.keys(byLevel).sort((a, b) => a - b).map((l) => `<optgroup label="${l === '0' ? 'At-will' : ordinal(num(l)) + ' level'}">${byLevel[l].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
          const unmet = pwUnmetPrereq(p, [...learned]);
          return `<option value="${esc(p.name)}">${esc(p.name)}${p.forceAlignment && p.forceAlignment !== 'None' ? ` (${esc(p.forceAlignment)})` : ''}${unmet.length ? ` (needs ${esc(unmet.join(', '))})` : ''}</option>`;
        }).join('')}</optgroup>`).join('')}</select>${bdBrowse(`pw|${idx}|${c.field}`, avail.length)}</div>`;
  });
  // Powers stored on a class (or archetype) that doesn't cast them: SW5E lists them, but no table allows them.
  if (onlyType) return blocks.join('');
  for (const [field, T] of [['forcePowers', 'Force'], ['techPowers', 'Tech'], ['archetype.forcePowers', 'Force'], ['archetype.techPowers', 'Tech']]) {
    const list = field.startsWith('archetype.') ? arr(k.archetype && k.archetype[field.slice(10)]) : arr(k[field]);
    if (!list.length || sources.some((c) => c.field === field)) continue;
    const arg = `${idx}|${field}`;
    blocks.push(`<div class="cls-list"><div class="cls-head"><b>${T} powers stored on ${esc(field.startsWith('archetype.') ? (k.archetype && k.archetype.name) || 'the archetype' : k.name)}</b></div>
      <div class="slot-problem">${esc(field.startsWith('archetype.') ? 'This archetype' : `${k.name}`)} doesn't cast ${T.toLowerCase()} powers at this level: these can't be cast. Remove them, or learn them where they belong.</div>
      <div class="cls-picks">${list.map((n, i) => `<details class="cls-pick"><summary><b>${esc(n)}</b><button class="btn sm cls-x" data-act="pw-remove" data-arg="${esc(arg)}|${i}" title="Remove" aria-label="Remove ${esc(n)}">×</button></summary></details>`).join('')}</div></div>`);
  }
  return blocks.join('');
}
async function addClassPower(arg, name) {
  if (!name) return;
  const [idx, field] = arg.split('|');
  await editClass(Number(idx), (k) => {
    if (field.startsWith('archetype.')) k.archetype = { ...(k.archetype || {}), [field.slice(10)]: arr(k.archetype && k.archetype[field.slice(10)]).concat(name) };
    else k[field] = arr(k[field]).concat(name);
  });
  setStatus(`Learned ${name}. Not synced to SW5E yet.`);
}
async function removeClassPower(arg) {
  const [idx, field, i] = arg.split('|');
  let gone = '';
  const undo = rememberForUndo(state.current, 'forgot a power', true);
  await editClass(Number(idx), (k) => {
    if (field.startsWith('archetype.')) {
      const f = field.slice(10);
      const list = arr(k.archetype && k.archetype[f]);
      gone = list[i];
      k.archetype = { ...(k.archetype || {}), [f]: list.filter((_, j) => j !== Number(i)) };
    } else {
      gone = arr(k[field])[i];
      k[field] = arr(k[field]).filter((_, j) => j !== Number(i));
    }
  });
  if (state.editUndo) state.editUndo.label = `forgot ${gone || 'a power'}`;
  setStatus(`Forgot ${gone || 'the power'}.`, '', false, undo);
}

/**
 * Class and archetype features the engine left out or files too late (SW5E's feature data
 * lists e.g. Monk "Focus" only at 11th level), taken from the class/archetype text.
 */
function missingClassFeatures(raw, have) {
  if (!state.rules) return [];
  // The engine's features don't always say which class/archetype they're from: match by name.
  const seen = new Set(have.map((f) => clsBaseName(f.name)));
  const out = [];
  for (const k of arr(raw.classes)) {
    const level = num(k.levels);
    const cref = rulesModule('classes').find((x) => x.name === k.name);
    const aref = k.archetype && k.archetype.name ? rulesModule('archetypes').find((x) => x.name === k.archetype.name) : null;
    const feats = (cref ? clsTextFeatures(cref.classFeatureText, k.name, 'Class') : [])
      .concat(aref ? clsTextFeatures(aref.text, aref.name, 'Archetype') : []);
    for (const f of feats) {
      if (f.level > level || seen.has(clsBaseName(f.name))) continue;
      seen.add(clsBaseName(f.name));
      out.push({ ...f, fromText: true, combat: undefined });
    }
  }
  return out;
}

/**
 * A feature's save DC and damage, worked out for the character ("DC = 8 + your proficiency bonus + your Constitution
 * modifier", "2d6 sonic… increases to 4d6 at 5th level"): at its class's level, or the character's for a trait or feat.
 */
function featureNumberChips(m, f) {
  const k = arr(m.raw.classes).find((x) => x.name === f.sourceName || (x.archetype && x.archetype.name === f.sourceName));
  const mods = Object.fromEntries(ABILITIES.map((a) => [a, num(((m.c.abilityScores || {})[a] || {}).modifier)]));
  const scores = Object.fromEntries(ABILITIES.map((a) => [a, num(((m.c.abilityScores || {})[a] || {}).value)]));
  const n = clsFeatureNumbers(f.text || f.description || '', { level: k ? num(k.levels) : charLevel(m), pb: num(m.c.proficiencyBonus), mods, scores, note: featureNoteOf(m.raw, f.name) });
  if (!n) return [];
  return [n.dc ? `<span class="chip accent" title="${n.dc.score ? `${esc(n.dc.ability)} score + proficiency bonus` : `8 + proficiency bonus + ${esc(n.dc.ability)} modifier`}">DC ${n.dc.value}${n.dc.save ? ` ${esc(n.dc.save)} save` : ''}</span>` : '',
    n.damage ? `<span class="chip accent" title="At your level">${esc(n.damage.dice)} ${esc(n.damage.type)}</span>` : ''];
}
function featureCard(f, m) {
  const lvl = f.levels && f.levels.length > 1 ? `Levels ${f.levels.join(', ')}` : f.level != null ? `Level ${f.level}` : '';
  // (Its own counter, or one per benefit: "Adaptable Fading: attack rolls".)
  const uses = m && m.t ? m.t.lim.features.filter((u) => u.name === f.name || u.name.startsWith(`${f.name}: `)).map((u) => live('uses:' + u.name, m, 'div', 'trk-rows')).join('') : '';
  const meta = f.metadata ? (() => { try { return typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata; } catch (e) { return null; } })() : null;
  const usage = meta && (meta.fe || meta.usage || meta);
  const usageFacts = usage && typeof usage === 'object'
    ? Object.entries(usage).filter(([, v]) => v != null && typeof v !== 'object').map(([k, v]) => [titleCase(k), String(v)])
    : [];
  return card({
    title: f.name,
    meta: esc(lvl),
    chips: [f.combat === false ? chip('Non-combat') : '', f.prerequisite ? chip('Prereq: ' + f.prerequisite, 'warn') : '',
      f.fromText ? `<span class="chip" title="SW5E's feature list leaves this out at your level; taken from the class text">from class text</span>` : '',
      f.source === 'Choice' && f.from ? `<span class="chip" title="Chosen for ${esc(f.from)}">${esc(f.from.split(' › ')[0])}</span>` : '',
      ...(m ? featureNumberChips(m, f) : [])].filter(Boolean),
    facts: usageFacts,
    lead: uses + (m ? stateControls(m, f) + featureExtras(m, f) : ''),
    body: md(f.text || f.description || f.content || '') + (m && f.source !== 'Option' && f.source !== 'Choice' ? featureNoteBox(m, f) : ''),
  });
}

// ------------------------------------------------------------- feature states
// Features you switch on for a while (Rage, Critical Analysis, stances…): Start spends a use (if
// the feature has a counter) and starts a temporary effect with the state's numbers (e.g. Rage
// Damage on melee Strength weapons), its advantages (the roller pre-selects them) and its
// benefits plus other features' "While raging…" lines as notes. End it under Effects.
function featureState(m, f) {
  if (f.form) return chFormState(f.name, f.text || '');
  const k = arr(m.raw.classes).find((x) => x.name === f.sourceName || (x.archetype && x.archetype.name === f.sourceName)) || arr(m.raw.classes)[0];
  const ref = k && rulesModule('classes').find((x) => x.name === k.name);
  return clsFeatureState(f.name, f.text || '', {
    level: num(k && k.levels), row: k ? classRow(m.raw, k) : {},
    note: f.note != null ? f.note : featureNoteOf(m.raw, f.name),
  });
}
// The general rules of lightsaber forms (PHB chapter 6, Customization Options), shown next to Adopt and the form picker.
const FORM_RULES = 'Lightsaber forms (PHB chapter 6): each form you know can be adopted on your turn by using your bonus action, '
  + 'and adopting one replaces the form you were in. What it gives lasts as its text says (most: until the start of your next turn). '
  + 'You can’t choose a form more than once, even if you later get to choose again. Forms are restricted to forcecasters; '
  + 'the general rules name no particular weapon (a form’s own text may).';
const formRules = () => `<details class="form-rules"><summary>Form rules</summary><div>${esc(FORM_RULES)}</div></details>`;
function stateControls(m, f) {
  if (!state.rules || !m.t) return '';
  const st = featureState(m, f);
  if (!st) return '';
  if (st.extension) return `<div class="state-ctl"><span class="chip" title="Applied when you start the state">Adds to: while ${esc(st.word)}</span></div>`;
  const active = tempEffects(m.snap.key).find((e) => e.source === 'feature' && e.name === f.name);
  return `<div class="state-ctl">${active
    ? `<span class="chip good">Active${active.duration ? ` · lasts ${esc(active.duration)}` : ''}</span><button class="btn sm" data-act="effect-end" data-arg="${esc(active.id)}">End</button>`
    : `<button class="btn sm primary" data-act="feat-start" data-arg="${esc(f.name)}" title="${st.form ? 'Adopt this form (bonus action); it replaces the form you were in' : `Start ${esc(f.name)}`}${st.duration ? ` (lasts ${esc(st.duration)})` : ''}">${st.form ? 'Adopt' : 'Start'} ${esc(f.name)}</button>${frenzyOf(m) && st.word === 'raging' ? `<button class="btn sm" data-act="feat-start" data-arg="${esc(f.name)}|frenzy" title="${num((state.itemState[m.snap.key] || {}).frenzy) ? 'You have frenzied since your last long rest: one level of exhaustion when this rage ends' : 'Your first frenzy since your long rest: no ill effect'}">${esc(f.name)} with Frenzy${num((state.itemState[m.snap.key] || {}).frenzy) ? ' (+1 exhaustion)' : ''}</button>` : ''}`}${st.form ? formRules() : ''}</div>`;
}
const frenzyOf = (m) => m.allFeatures.find((f) => /\bgo into a frenzy when you enter your rage\b/i.test(f.text || ''));

/**
 * Controls for class features that do something in play beyond a state: Reckless Attack (this turn), fighting-style
 * marks, Channel the Force (choose an effect, then use it), Infuse Item (pick the item). `compact`: the tracker's row
 * (only the quick ones).
 */
function featureExtras(m, f, compact) {
  if (!state.rules || !m.t) return '';
  const key = m.snap.key;
  const active = (group) => tempEffects(key).find((e) => e.group === group);
  const endBtn = (e, label) => `<span class="chip good">${esc(label || e.name)}${e.duration ? ` · ${esc(e.duration)}` : ''}</span><button class="btn sm" data-act="effect-end" data-arg="${esc(e.id)}">End</button>`;
  const text = f.text || f.description || '';
  if (/^Reckless Attack$/i.test(f.name)) {
    const e = active('state:reckless');
    return `<div class="state-ctl">${e ? endBtn(e, 'Attacking recklessly') : `<button class="btn sm" data-act="reckless" title="Advantage on melee weapon attacks using Strength this turn; attacks against you have advantage until your next turn">Attack recklessly</button>`}</div>`;
  }
  const mark = plMark(text);
  if (mark) {
    const e = active(`mark:${f.name}`);
    return `<div class="state-ctl">${e ? endBtn(e, `Marked (${f.name})`) : `<button class="btn sm" data-act="mark" data-arg="${esc(f.name)}" title="${esc(mark.text)}">Mark a target (${esc(f.name.replace(/ Style$/, ''))})</button>`}</div>`;
  }
  if (compact) return '';
  if (/^Channel the Force$/i.test(f.name) && f.source !== 'Archetype') {
    // The effect is chosen in the card's picker (featureNoteBox).
    const opts = ctfOptions(m);
    const use = m.t.lim.features.find((u) => u.name === f.name);
    const left = use ? use.maximum - num(m.t.s.featuresTimesUsed[f.name]) : 0;
    return `<div class="state-ctl">${opts.map((o) => `<button class="btn sm" data-act="ctf-use" data-arg="${esc(o.name)}" ${left > 0 ? '' : 'disabled'} title="${esc(String(o.text).replace(/\s+/g, ' ').slice(0, 220))}">Use ${esc(o.name)}</button>`).join('')}</div>`;
  }
  if (/^Infuse Item$/i.test(f.name)) {
    const e = active('infuse');
    if (e) return `<div class="state-ctl">${endBtn(e)}</div>`;
    const items = infusable(m);
    if (!items.length) return '';
    return `<div class="state-ctl"><select data-infuse aria-label="Item to infuse">${items.map((x) => `<option value="${x.i}">${esc(x.it.name)} (${x.armor ? 'AC' : 'attack and damage'} +${infuseBonus(m)})</option>`).join('')}</select><button class="btn sm" data-act="infuse" title="Until the end of your next long rest">Infuse</button></div>`;
  }
  return '';
}

/** The Channel the Force effects the character can use: the chosen class one(s) and the focus's. */
function ctfOptions(m) {
  const out = [];
  for (const f of m.allFeatures.filter((x) => /^Channel the Force$/i.test(x.name))) {
    const sub = clsChosenText(f.text || '', featureNoteOf(m.raw, f.name));
    const parts = String(f.text || '').replace(/\r/g, '').split(/^#{4,}\s+/m).slice(1).map((p) => ({ name: p.slice(0, p.indexOf('\n') < 0 ? p.length : p.indexOf('\n')).trim(), text: p.slice(p.indexOf('\n') + 1) }));
    const picked = sub.choice ? parts.filter((p) => sub.chosen.includes(p.name)) : parts;
    for (const p of picked) if (!out.some((o) => o.name === p.name)) out.push({ ...p, from: f.sourceName || '' });
  }
  return out;
}
async function useChannelTheForce(name) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const m = buildModel(snap);
  const o = ctfOptions(m).find((x) => x.name === name);
  const use = m.t.lim.features.find((u) => /^Channel the Force$/i.test(u.name));
  if (!o || !use) return;
  if (use.maximum - num(m.t.s.featuresTimesUsed[use.name]) <= 0) return setStatus('No Channel the Force uses left (they come back on a short or long rest).', 'error');
  await trackerAction('feat', `${use.name}|1`);
  const levels = Object.fromEntries(arr(m.raw.classes).map((k) => [String(k.name).toLowerCase(), num(k.levels)]));
  const mods = Object.fromEntries(Object.entries(m.c.abilityScores || {}).map(([a, v]) => [a, num(v.modifier)]));
  const amt = plFixedAmount(o.text, levels, mods);
  const save = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw\b/i.exec(o.text);
  const dc = save ? powerNumbers(m, 'force', { forceAlignment: 'universal' }).dc : 0;
  const buttons = amt && amt.heal ? [{ act: 'pw-heal', arg: String(amt.amount), label: `Heal ${amt.amount} (on me)` }] : [];
  setStatus(`${name} (Channel the Force; one use spent).${save ? ` ${save[1]} save DC ${dc}.` : ''}${amt ? amt.heal ? ` The creature regains ${amt.amount} hit points.` : ` ${amt.amount} ${amt.type} damage${/half as much/i.test(o.text) ? ', half on a success' : ''}.` : ''}`, '', false, buttons);
}

/**
 * Infuse Item on armor or a shield: "+1 bonus to AC while wearing it" (decision 59), so not while it's only carried.
 * True when the infused one isn't worn (or is gone).
 */
function infusedArmorOff(raw, e) {
  if (!e || e.source !== 'feature' || !/^Infuse Item: /.test(e.name || '') || !arr(e.mods).some((x) => x.path === 'armorClass')) return false;
  const name = e.name.replace(/^Infuse Item: /, '');
  const eq = arr(raw && raw.equipment);
  const at = e.armorIndex != null ? eq[e.armorIndex] : null;
  const it = at && at.name === name ? at : eq.find((x) => x.name === name && x.equipped) || eq.find((x) => x.name === name);
  return !(it && it.equipped);
}
/** Infuse Item: the armor, shields and simple or martial weapons carried that aren't enhanced. */
function infusable(m) {
  return arr(m.raw.equipment).map((it, i) => ({ it, i, ref: catalogIndex && catalogIndex.get(it.name) }))
    .filter((x) => x.it.category === 'Equipment' && x.ref && (x.ref.equipmentCategory === 'Weapon' || x.ref.equipmentCategory === 'Armor'))
    .map((x) => ({ ...x, armor: x.ref.equipmentCategory === 'Armor' }));
}
const infuseBonus = (m) => {
  const k = arr(m.raw.classes).find((x) => /^Engineer$/i.test(x.name));
  const l = num(k && k.levels);
  return l >= 15 ? 3 : l >= 10 ? 2 : 1;
};
async function infuseItem() {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const m = buildModel(snap);
  const sel = document.querySelector('[data-infuse]');
  const x = sel && infusable(m).find((y) => String(y.i) === sel.value);
  if (!x) return;
  const use = m.t.lim.features.find((u) => /^Infuse Item$/i.test(u.name));
  if (use) {
    if (use.maximum - num(m.t.s.featuresTimesUsed[use.name]) <= 0) return setStatus('Infuse Item is used: it comes back on a long rest.', 'error');
    await trackerAction('feat', `${use.name}|1`);
  }
  const b = infuseBonus(m);
  const st = itemStateOf(snap.key);
  startEffect(st, {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'temporary', source: 'feature', name: `Infuse Item: ${x.it.name}`,
    startedAt: Date.now(), duration: 'until the end of your next long rest', group: 'infuse', notes: x.armor ? [`+${b} AC while you wear ${x.it.name}.`] : [],
    ...(x.armor ? { target: 'self', armorIndex: x.i, mods: [{ path: 'armorClass', bonus: b, label: `AC +${b}` }] }
      : { target: 'weapon', weaponName: x.it.name, weaponIndex: x.i, mods: [{ path: 'weapon.toHit', bonus: b, label: `Attack +${b}` }, { path: 'weapon.damage', bonus: b, label: `Damage +${b}` }] }),
  });
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(`${x.it.name} is infused (+${b} ${x.armor ? 'AC' : 'to attack and damage rolls'}) until the end of your next long rest.${x.armor && !x.it.equipped ? ` Its AC counts while you wear it: equip the ${x.it.name}.` : ''}`);
}

/** Reckless Attack and fighting-style marks: short effects with their advantage or their text. */
async function startShortState(kind, name) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const m = buildModel(snap);
  const st = itemStateOf(snap.key);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (kind === 'reckless') {
    startEffect(st, {
      id, kind: 'temporary', source: 'feature', name: 'Reckless Attack', startedAt: Date.now(), duration: 'until your next turn', group: 'state:reckless', target: 'self', mods: [],
      advantage: [{ kind: 'attack', melee: true, ability: 'Strength' }], notes: ['Attack rolls against you have advantage until your next turn.'],
    });
  } else {
    const f = m.allFeatures.concat(pickedOptionFeatures(m), slotPickFeatures(m)).find((x) => x.name === name);
    const mk = f && plMark(f.text || f.description || '');
    if (!mk) return;
    startEffect(st, { id, kind: 'temporary', source: 'feature', name: `${name} mark`, startedAt: Date.now(), duration: mk.duration, group: `mark:${name}`, target: 'self', mods: [], notes: [mk.text] });
  }
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(kind === 'reckless' ? 'Attacking recklessly: advantage on melee Strength attacks this turn; attacks against you have advantage until your next turn.' : `Target marked (${name}); it lasts ${plMark((m.allFeatures.concat(pickedOptionFeatures(m), slotPickFeatures(m)).find((x) => x.name === name) || {}).text || '').duration}.`);
}
async function startFeatureState(arg) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const [name, how] = String(arg).split('|');
  const m = buildModel(snap);
  const candidates = m.allFeatures.concat(pickedOptionFeatures(m), slotPickFeatures(m));
  const f = candidates.find((x) => x.name === name);
  const st = f && featureState(m, f);
  if (!st) return;
  // Spend a use when the feature has a counter.
  const uses = m.t && m.t.lim.features.find((u) => u.name === name);
  if (uses) {
    const left = uses.maximum - num(m.t.s.featuresTimesUsed[name]);
    if (left <= 0) return setStatus(`No ${name} uses left (they come back on a ${uses.recharge === 'shortRest' ? 'short or long' : 'long'} rest).`, 'error');
    await trackerAction('feat', `${name}|1`);
  }
  // Other features that add to this state: their benefits lists (Explosive: "While raging, you gain the
  // following benefits") and lines ("While raging, you have advantage on Dexterity saving throws").
  const extra = [];
  const mods = st.mods.slice();
  const advantage = st.advantage.slice();
  const defenses = arr(st.defenses).slice();
  // Critical range from lines like "While raging, your critical hit range with melee weapon attacks using Dexterity
  // increases by 1" (critOn: which attacks).
  let critRange = 0;
  let critOn = null;
  if (st.word) {
    for (const x of candidates.filter((y) => y.name !== name)) {
      const ext = featureState(m, x);
      if (ext && ext.extension && ext.word === st.word) {
        extra.push(...ext.benefits.map((b) => `${x.name}: ${b}`));
        mods.push(...ext.mods);
        advantage.push(...ext.advantage);
        defenses.push(...arr(ext.defenses));
        continue;
      }
      // SW5E's own feature texts start with "_**Frenzied Approach:** 3rd level_": not part of the first sentence.
      for (const sen of String(x.text || '').replace(/_\*\*[^*]+:\*\*\s*[^_]+_\s*/g, '').replace(/\s+/g, ' ').split(/(?<=\.)\s+/)) {
        const lm = new RegExp(`^While ${st.word}\\b,?\\s*`, 'i').exec(sen);
        if (!lm) continue;
        extra.push(`${x.name}: ${sen}`);
        const note = x.note != null ? x.note : featureNoteOf(m.raw, x.name);
        // With its class's level and table row ("you add your rage damage to the damage roll": the Rage Damage column).
        const xk = arr(m.raw.classes).find((k) => k.name === x.sourceName || (k.archetype && k.archetype.name === x.sourceName)) || arr(m.raw.classes)[0];
        const fe = clsFeatureEffects(sen.slice(lm[0].length).replace(/^./, (c) => c.toUpperCase()), note, xk ? { level: num(xk.levels), row: classRow(m.raw, xk) } : { level: 0 });
        if (fe.critRange) { critRange = Math.max(critRange, fe.critRange); if (fe.critOn && typeof fe.critOn === 'object') critOn = fe.critOn; }
        mods.push(...fe.mods);
        advantage.push(...fe.advantage);
        defenses.push(...fe.defenses);
      }
    }
  }
  const s2 = itemStateOf(snap.key);
  // Frenzy: free the first time after a long rest, then one level of exhaustion when the rage ends.
  let frenzyNote = '';
  if (how === 'frenzy' && frenzyOf(m)) {
    const again = num(s2.frenzy) > 0;
    s2.frenzy = num(s2.frenzy) + 1;
    extra.push(`Frenzy: a single melee weapon attack as a bonus action on each of your turns after this one.${again ? ' One level of exhaustion when this rage ends.' : ' (First frenzy since your long rest: no ill effect.)'}`);
    frenzyNote = again ? ' With Frenzy: one level of exhaustion when it ends.' : ' With Frenzy (free this time).';
  }
  // "…you can cast the saber ward power. When you do so, you have a number of special reactions equal to your
  // proficiency bonus that you can only use to cast the saber reflect force power" (The Way of the Mynock).
  let counter = null;
  const castWith = /\byou can cast the \*([a-z' -]+)\* power\b/i.exec(f.text || '');
  const pw = castWith && rulesPower(castWith[1]);
  if (pw) {
    const pe = plPowerEffect(pw, charLevel(m));
    if (!pe.forTarget) { mods.push(...pe.mods); defenses.push(...pe.defenses); }
    const rx = /special reactions equal to your proficiency bonus that you can only use to cast the \*([a-z' -]+)\* (?:force )?power/i.exec(f.text || '');
    const rp = rx && rulesPower(rx[1]);
    if (rx) counter = { label: `${rp ? rp.name : rx[1]} reactions`, power: rp ? rp.name : rx[1], max: num(m.c.proficiencyBonus), used: 0 };
  }
  if (st.critRange) critRange = Math.max(critRange, st.critRange);
  const eff = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'temporary', source: 'feature', name,
    startedAt: Date.now(), duration: st.duration, group: st.form ? 'state:lightsaber form' : `state:${st.word || name}`, mods, notes: st.benefits.concat(extra),
    advantage, defenses, critRange, ...(critOn ? { critOn } : {}), target: 'self',
    ...(how === 'frenzy' && num(s2.frenzy) > 1 ? { exhaustOnEnd: 1 } : {}), ...(counter ? { counter } : {}),
  };
  // "You can't cast them or concentrate on them while raging": starting a rage ends concentration.
  const ended = st.word === 'raging' ? s2.effects.filter((e) => e.group === 'concentration') : [];
  if (ended.length) s2.effects = s2.effects.filter((e) => !ended.includes(e));
  startEffect(s2, eff);
  await saveItemStateFor(snap.key, s2);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(`${name} ${st.form ? 'adopted' : 'started'}${st.duration ? ` (lasts ${st.duration})` : ''}${uses ? '; one use spent' : ''}.${frenzyNote}${pw ? ` ${pw.name} applies while it lasts.` : ''} End it on its card or under Combat & Vitals → Effects.`);
}

/** The class options the character picked (Berserker Instincts, Discoveries…), as features with their text. */
function pickedOptionFeatures(m) {
  const out = [];
  arr(m.raw.classes).forEach((k) => {
    const info = classChoiceInfo(m, k);
    for (const [listKey, picks] of Object.entries(k.options || {})) {
      const list = info && info.lists.find((l) => l.key === listKey);
      if (list && list.source === 'archetype' && !list.mods) continue; // started from the feature's card
      for (const p of arr(picks)) {
        const opt = list && list.options.find((o) => o.name === p.name);
        if (opt) out.push({ name: p.name, text: opt.text, source: 'Option', sourceName: k.name, note: p.note || '' });
      }
    }
  });
  return out;
}

// Notes on a feature: the choices it asks for ("choose two skills…") or anything else to remember.
// Stored in the character as featureNotes = { "<feature name>": text } (sw5e.com keeps the field).
const featureNoteKey = (f) => clsBaseName(f.name);
/**
 * What a feature's "choose one of the following" reads: its notes plus what's picked in the archetype
 * list of the same name (Hunter's Prey, Elemental Adept), which the class card offers as a list.
 */
function featureNoteOf(raw, name) {
  const parsed = classRules();
  const picks = arr(raw.classes).flatMap((k) => {
    const arch = parsed && k.archetype && parsed.archetypes[k.archetype.name];
    return arch && arch.lists.some((l) => l.key === name) ? arr((k.options || {})[name]).map((p) => p.name) : [];
  });
  return [(raw.featureNotes || {})[clsBaseName(name)] || '', ...picks].filter(Boolean).join(', ');
}
/**
 * What was chosen for a feature in a picker (Classes & Progression): its slot's picks (fighting style, forms), the
 * archetype for the archetype feature, the class option list it names. [] = it has a picker, nothing chosen yet;
 * null = no picker (the notes box is where the choice goes).
 */
function chosenInPicker(m, f) {
  const base = clsBaseName(f.name).toLowerCase();
  const res = state.rules ? choiceInfo(m) : null;
  // A trait's given powers (Kiffar Heritage's Sage: telemetry) aren't a pick: its own choice stays in its card.
  const slots = res ? res.slots.filter((s) => (s.feature && s.feature.toLowerCase() === base) || (s.species && !s.given && String(s.from).toLowerCase().endsWith(`: ${base}`))) : [];
  if (slots.length) return slots.flatMap((s) => s.picks.map((p) => p.name));
  for (const k of arr(m.raw.classes)) {
    if (base === archetypeFeature(k.name)) return k.archetype && k.archetype.name ? [k.archetype.name] : [];
    // A class's Expertise: its picker is on the class card (classes[i].expertise).
    if (base === 'expertise' && f.source !== 'Archetype' && f.sourceName === k.name) return BD_KINDS.cexp.get(m.raw, arr(m.raw.classes).indexOf(k));
    const info = state.rules ? classChoiceInfo(m, k) : null;
    const list = info && info.lists.find((l) => [l.title, l.column].some((t) => t && clsBaseName(t).toLowerCase() === base));
    if (list) return list.chosen.map((p) => p.name);
  }
  return null;
}
/** A feature or list name to compare by: "Discovery" and "Discoveries", "Guardian Aura" and "Guardian Auras" are one. */
const pickerKey = (s) => clsBaseName(s).toLowerCase().replace(/\b(?:known|options?)\b/g, ' ').split(/[^a-z']+/).filter(Boolean)
  .map((w) => w.replace(/ies$/, 'y').replace(/(?<!s)s$/, '')).join(' ');
// The feature that gives a class its maneuvers: "You learn maneuvers that are fueled by special dice called superiority
// dice" (Combat Superiority, Academic Superiority), "You learn two maneuvers of your choice… as shown in the Maneuvers
// Known column" (Champion Superiority, Deadeye Superiority…).
const MANEUVER_FEATURE = /\byou learn maneuvers that are fueled by special dice called superiority dice\b|\byou (?:learn|know) \w+ maneuvers of your choice\b[^.]*\bManeuvers Known column\b/i;
/**
 * The pickers of Classes & Progression that a feature's choices are made with, for its card: the choice slots it gives
 * (fighting style, forms, powers), its class's archetype, Expertise, the class or archetype list it names (Discovery →
 * Discoveries), the maneuvers (Academic Superiority), the powers known (Forcecasting). { html, chosen: [names] } or null.
 */
function featurePickers(m, f) {
  if (!state.rules) return null;
  const base = clsBaseName(f.name).toLowerCase();
  const key = pickerKey(f.name);
  const html = [];
  const chosen = [];
  const res = choiceInfo(m);
  // A trait's given powers (Kiffar Heritage's Sage: telemetry) aren't a pick: its own choice stays in its card.
  for (const s of (res ? res.slots : []).filter((x) => (x.feature && x.feature.toLowerCase() === base) || (x.species && !x.given && String(x.from).toLowerCase().endsWith(`: ${base}`)))) {
    html.push(renderSlot(m, s));
    chosen.push(...s.picks.map((p) => p.name));
  }
  arr(m.raw.classes).forEach((k, idx) => {
    // The feature is this class's, or its archetype's (or it doesn't say).
    const own = !f.sourceName || f.sourceName === k.name || (k.archetype && k.archetype.name === f.sourceName);
    if (!own) return;
    const info = classChoiceInfo(m, k);
    if (base === archetypeFeature(k.name) && info) {
      html.push(`<div class="cls-list">${classArchetypeBlock(m, k, idx, info)}</div>`);
      if (k.archetype && k.archetype.name) chosen.push(k.archetype.name);
    }
    if (base === 'expertise' && f.source !== 'Archetype') {
      const pick = bdExpertisePick(m, k, idx);
      if (pick) { html.push(pick); chosen.push(...BD_KINDS.cexp.get(m.raw, idx)); }
    }
    // The list the feature names (Discovery → Discoveries), the modifications of the item it describes (Modified
    // Weaponry), or the list it counts in prose ("You know two ammunition enhancements of your choice": Special Ammunition).
    const text = String(f.text || f.description || '').replace(/\s+/g, ' ');
    const prose = (l) => { const noun = String(l.title).replace(/\s+options?$/i, '').replace(/s$/i, '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return noun && new RegExp(`\\byou (?:know|learn) (?:one|two|three|four|five) ${noun}s? of your choice\\b`, 'i').test(text); };
    for (const l of (info ? info.lists : []).filter((x) => [x.title, x.key, x.column, x.mods && x.mods.what].some((t) => t && pickerKey(t) === key) || (x.source === 'archetype' && prose(x)))) {
      html.push(classListBlock(m, k, idx, info, l));
      chosen.push(...l.chosen.map((p) => p.name));
    }
    if (info && info.maneuvers && MANEUVER_FEATURE.test(String(f.text || f.description || '').replace(/\s+/g, ' '))) {
      html.push(classManeuverBlock(m, k, idx, info));
      chosen.push(...arr(info.maneuvers.chosen));
    }
    // Forcecasting, Techcasting, and an archetype's "Improved Techcasting" ("You know 7 tech powers of your choice").
    const casting = /^(?:improved )?(force|tech)casting$/i.exec(base);
    if (casting && pwClassCasting(k, state.rules.modules || {}).some((c) => c.type === casting[1])) {
      html.push(renderPowerBlocks(m, k, idx, casting[1]));
      chosen.push(...arr(k[`${casting[1]}Powers`]).concat(arr(k.archetype && k.archetype[`${casting[1]}Powers`])));
    }
  });
  return html.length ? { html: html.join(''), chosen } : null;
}
/**
 * The asks still open, for "Still to choose": [{ label, count, chosen }]. Alternatives (oneOf: Baragwin's "armstech's
 * implements, munitions kits, or two weapons of your choice") are one choice: answered when any of them is, listed once.
 */
function openAsks(asks) {
  const out = [];
  for (const a of asks) {
    const grp = a.oneOf ? asks.filter((x) => x.oneOf === a.oneOf) : [a];
    if (grp[0] !== a) continue;
    if (grp.length > 1) { if (!grp.some((x) => x.chosen.length)) out.push({ label: grp.map((x) => x.label.toLowerCase()).join(' or '), count: 1, chosen: [] }); continue; }
    if (a.chosen.length < a.count) out.push(a);
  }
  return out;
}
/** Of alternatives (oneOf), the one answered: the others' pickers go once one is chosen. */
const askShown = (a, asks) => !a.oneOf || a.chosen.length || !asks.some((x) => x !== a && x.oneOf === a.oneOf && x.chosen.length);
/**
 * A card whose choices are made elsewhere, so it has no "Your choices" box: a species' Ability Score Increase and
 * Languages (their pickers are under Species), and a trait SW5E repeats under another name (Human Versatility as
 * "Proficiency": the rules' own trait's card has the pickers).
 */
function choicesElsewhere(m, f) {
  return f.source === 'Species' && !!state.rules && (/^(?:Ability Score Increase|Languages?|Size|Speed|Age|Alignment)$/i.test(f.name)
    || !bdSpeciesTraitFeatures(m).some((t) => t.name === f.name));
}
/** What a feature asks the player to choose (classes.js asks: one of its options, an ability, skills, tools…). */
function featureAsks(m, f) {
  const text = f.text || f.description || '';
  // A species' increase and languages are picked under Species / Basics. SW5E repeats some traits under another name
  // (Human Versatility as "Proficiency"): only the rules' own trait gets the pickers, the one the sheet reads.
  if (!state.rules || !text) return [];
  if (f.source === 'Species' && (/^(?:Ability Score Increase|Languages?)$/i.test(f.name)
    || !bdSpeciesTraitFeatures(m).some((t) => t.name === f.name))) return [];
  // A trait with options (Kiffar Heritage): the options come with the rules' trait (SW5E's feature text stops at its intro).
  const trait = f.source === 'Species' ? arr((bdSpeciesRef(m.raw) || {}).traits).find((t) => t.name === f.name && arr(t.options).length) : null;
  if (trait) f = { ...f, text: bdTraitFullText(trait) }; // eslint-disable-line no-param-reassign
  const k = arr(m.raw.classes).find((x) => x.name === f.sourceName || (x.archetype && x.archetype.name === f.sourceName));
  const asks = clsFeatureEffects(f.text || text, featureNoteOf(m.raw, f.name), {
    level: k ? num(k.levels) : charLevel(m), pb: num(m.c.proficiencyBonus), row: k ? classRow(m.raw, k) : {}, isWeapon: isWeaponName,
  }).asks;
  // A choice that only comes with "If you already have this proficiency…" (Resilient Retainer): when that holds.
  const fx = arr(m.effects).find((e) => e.kind === 'feature' && e.name === f.name && arr(e.chains).length);
  const met = (a) => !!fx && fx.chains.some((c, i) => arr(fx.chainsMet)[i] && canonical(c.ifHas) === canonical(a.ifHas));
  return asks.filter((a) => !a.ifHas || met(a));
}
const ASK_WORDS = { option: 'one', ability: 'an ability', skill: 'a skill', tool: 'a tool', weapon: 'a weapon', skilltool: 'a skill or tool', expertise: 'a proficiency', damage: 'a damage type' };
/** The tools the character is proficient with (SW5E's list, custom ones, features'). */
const toolProficiencies = (m) => [...new Set(arr(m.c.proficiencies).filter((p) => p.type === 'tool').map((p) => p.name)
  .concat(arr(m.raw.customProficiencies).filter((p) => p && p.type === 'tool').map((p) => p.name), arr(m.fx && m.fx.tools).map((t) => t.name)))]
  .filter((n) => !/^(?:one|two|any)\b|\bchoice\b/i.test(n)); // SW5E lists the class's "One type of gaming set" until it's picked
/**
 * A weapon against an ask's property clause: "that lack the heavy and strength properties" (Weaponmaster's Exploit),
 * "with the finesse property", "without the two-handed property". No clause: fits.
 */
function weaponFitsProps(of, w) {
  const t = String(of || '');
  const props = arr(w && w.properties).map((p) => String(p).toLowerCase());
  const has = (n) => props.some((p) => p === n || p.startsWith(`${n} `));
  const names = (s) => s.split(/,\s*|\s+(?:and|or)\s+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  let m;
  if ((m = /\b(?:that|which) (?:lack|don't have|do not have) the ([\w\s,-]+?) propert(?:y|ies)\b/i.exec(t)) || (m = /\bwithout the ([\w\s,-]+?) propert(?:y|ies)\b/i.exec(t))) return !names(m[1]).some(has);
  if ((m = /\b(?:that have|with) the ([\w\s,-]+?) propert(?:y|ies)\b/i.exec(t))) return names(m[1]).every(has);
  return true;
}
/** An option pick's note without the weapons its words exclude (Weaponmaster's Exploit: no heavy or strength weapons). */
function optionNoteFitting(o, note) {
  const clause = (/[^.]*(?:weapon|blaster)s?\b[^.]*\b(?:that|which) (?:lack|don't have|do not have) the [\w\s,-]+? propert(?:y|ies)\b[^.]*|[^.]*(?:weapon|blaster)s?\b[^.]*\b(?:with|without) the [\w\s,-]+? propert(?:y|ies)\b[^.]*/i.exec(String((o && o.text) || '').replace(/\s+/g, ' ')) || [])[0];
  if (!clause || !note) return note || '';
  return clsNoteTokens(note).filter((n) => { const w = catalogByName(n.replace(/[.;:]+$/, '')); return !(w && w.equipmentCategory === 'Weapon' && !weaponFitsProps(clause, w)); }).join(', ');
}
/** What an ask can be answered with. */
function askOptions(m, a) {
  const tools = bdTools().map((x) => x.name);
  switch (a.kind) {
    case 'skill': {
      // "one Charisma skill of your choice"
      const ab = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) skills?\b/i.exec(a.of || '');
      return a.options || prSkillList().filter((s) => !ab || FX_SKILLS[s] === titleCase(ab[1])).sort();
    }
    case 'tool': {
      // "artisan's implements", "one musical instrument of your choice", "brewer's kit or spicer's kit"
      const fit = prToolChoices(`your choice of ${a.of}`, bdTools()).flatMap((g) => (g.fixed ? [] : g.options));
      return fit.length ? fit : tools;
    }
    case 'weapon': {
      // "two vibroweapons or blasters of your choice", "three blasters of your choice"
      const descs = String(a.of || 'weapons').replace(/^.*?\b(?:a|an|one|two|three)\s+/i, '').replace(/\s+of your choice.*$/i, '')
        .replace(/\s+(?:that|which) (?:lack|have|don't have)\b.*$|\s+(?:with|without) the\b.*$/i, '').split(/\s+or\s+|,\s*/).filter(Boolean);
      const all = state.catalog ? state.catalog.items.filter((w) => w.equipmentCategory === 'Weapon') : [];
      return all.filter((w) => descs.some((d) => clsWeaponMatches(d, w)) && weaponFitsProps(a.of, w)).map((w) => w.name).sort();
    }
    case 'skilltool': return prSkillList().sort().concat(tools);
    // "two maneuvers you know", "a lightsaber form you know".
    case 'maneuver': return [...new Set(arr(m.maneuverNames).map((x) => (typeof x === 'string' ? x : x && x.name)).filter(Boolean))].sort();
    case 'form': return [...new Set(slotPickFeatures(m).filter((x) => x.form).map((x) => x.name))].sort();
    case 'expertise': return [...new Set(bdSkillsKnown(m).concat(toolProficiencies(m), a.chosen))].sort();
    default: return arr(a.options);
  }
}
let catalogLower = null;
/** A catalog item by name, ignoring case ("blaster pistol" as typed in a note). */
function catalogByName(name) {
  if (!catalogIndex) return null;
  if (!catalogLower || catalogLower.src !== catalogIndex) catalogLower = { src: catalogIndex, map: new Map([...catalogIndex].map(([n, it]) => [n.toLowerCase(), it])) };
  return catalogIndex.get(name) || catalogLower.map.get(String(name).toLowerCase()) || null;
}
const isWeaponName = (name) => { const r = catalogByName(name); return !!r && r.equipmentCategory === 'Weapon'; };

/**
 * A feature's pickers (what it asks) and notes box. opts.picked: what's chosen in a picker elsewhere (null: none);
 * opts.choiceText: the text left to choose from in the notes (a feat's, without what other pickers make).
 */
function featureNoteBox(m, f, opts = {}) {
  const key = featureNoteKey(f);
  const note = (m.raw.featureNotes || {})[key] || '';
  // The choices made in Classes & Progression (Discoveries, maneuvers, a fighting style…): the same pickers here.
  const pk = 'picked' in opts ? null : featurePickers(m, f);
  const picked = 'picked' in opts ? opts.picked : pk ? pk.chosen : null;
  const asks = picked == null ? featureAsks(m, f).filter((a) => !opts.asksFilter || opts.asksFilter(a)) : [];
  // What the pickers chose are words of the note (classes.js reads them there); the box shows the rest.
  const lc = (s) => String(s).toLowerCase().replace(/[.;:]+$/, '');
  const managed = new Set(asks.flatMap((a) => a.chosen).concat(arr(picked)).map(lc)); // Expertise: tools are in the note
  const tokens = clsNoteTokens(note);
  const keep = tokens.filter((t) => managed.has(lc(t))).join(', ');
  const rest = keep ? tokens.filter((t) => !managed.has(lc(t))).join(', ') : note;
  // A choice to write down, not one made at the table ("you can choose to", "choose a creature", "(your choice)").
  const choiceWords = String(opts.choiceText != null ? opts.choiceText : f.text || f.description || '')
    .replace(/\b(?:you|it|they|(?:a|the|that) (?:creature|target)) can (?:also )?choose\b[^.]*|\b(?:an?|one|any) (?:other )?(?:enemy|enemies|creatures?|targets?|all(?:y|ies)|points?|spaces?|objects?) (?:of your choice|you choose)\b|\b(?:choose|select) (?:a|an|one|two|up to \w+|any number of)? ?(?:other )?(?:creatures?|targets?|all(?:y|ies)|points?|spaces?|numbers?|hostile|friendly|willing|enemies|enem(?:y|ies))\b|\((?:your choice|of your choice)[^)]*\)|\bat your choice\b/gi, '');
  // A choice to write down: a sentence that chooses, not one made in play ("When…", "As an action…", "On a failed save…",
  // "you may choose to…", "creatures/a direction/one of the following effects of your choice"), nor in a "####"
  // sub-option's text (effects you pick when you use it).
  const lasting = String(choiceWords).split(/^#{4,}\s/m)[0].replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
    .filter((s) => /\b(?:choose|choice|of your choice|select)\b/i.test(s))
    .filter((s) => !/\b(?:when|whenever|as an? (?:bonus )?action|as a reaction|on a (?:failed|successful) save|once per|if|unless|while|until|for the duration|each time|for each|you may choose|can choose to|may instead|must choose|instead choose|choose wisely|(?:creatures?|targets?|all(?:y|ies)|enem(?:y|ies)|points?|directions?) (?:of your choice|you choose)|(?:choose|select) (?:any|up to \w+|each)? ?(?:such )?creatures|deploy your choice|(?:effects?|direction|space|item|object|cloak|appearance|characteristics|damage type|structures?) (?:of|from) (?:your|these)|you make this choice)\b/i.test(s));
  const free = picked == null && !asks.length && !choicesElsewhere(m, f) && lasting.length > 0;
  const chosen = pk ? `<div class="cls-choices feat-pickers">${pk.html}</div>` : picked == null ? ''
    : `<div class="feat-chosen">${picked.length ? `Chosen: <b>${esc(picked.join(', '))}</b>` : '<span class="warn-text">Not chosen yet</span>'} · <a href="#sec-classes">${picked.length ? 'change' : 'choose'} it in Classes &amp; Progression</a></div>`;
  // Languages a class feature teaches (Silver Tongue's two).
  const langs = f.source === 'Class' || f.source === 'Archetype' ? bdFeatureLanguagePicks(m, f.name, asks) : '';
  // An alternative language chosen (Praetorian's Bonus Proficiency): the feature's other choice isn't asked.
  const altLang = langs && /Or instead: a language/.test(langs) && bdFeatureLanguages(m.raw).some((l) => l.name === f.name && l.alt && l.chosen.length);
  if (altLang) asks.splice(0);
  // A weapon picked that the ask's words exclude ("…that lack the heavy and strength properties").
  const misfit = (a) => (a.kind === 'weapon' ? a.chosen.filter((n) => { const w = catalogByName(n); return w && !weaponFitsProps(a.of, w); }) : []);
  const altPick = /Or instead: a language/.test(langs);
  // "Your choice" of the ability the feature's numbers use (Forceblade Bond, an archetype's casting): one picker.
  const abilityPick = (f.source === 'Class' || f.source === 'Archetype' || /casting$/i.test(f.name)) ? abilityChoices(m).filter((x) => x.name === f.name && !asks.some((a) => a.kind === 'ability'))
    .map((x) => bdPickList({ title: 'Ability it uses', from: `your choice of ${x.options.join(' or ')}${x.chosen ? '' : ' (until you choose: the best one)'}`, count: 1, chosen: x.chosen ? [x.chosen] : [], options: x.options, kind: 'fnote', arg: key, word: 'an ability' })).join('') : '';
  const pickers = abilityPick + (altPick ? '' : langs) + asks.filter((a) => askShown(a, asks)).map((a) => bdPickList({
    problem: misfit(a).length ? `${misfit(a).join(', ')}: not one of ${String(a.of).replace(/^.*?\b(?:a|an|one|two|three)\s+/i, '')}` : '',
    title: a.label, from: ['tool', 'weapon'].includes(a.kind) && /\s/.test(a.of) ? a.of : '', count: a.count, chosen: a.chosen, options: askOptions(m, a), kind: 'fnote', arg: key, word: ASK_WORDS[a.kind] || 'one',
    hint: ['tool', 'weapon', 'skilltool'].includes(a.kind) && !state.catalog ? 'The list comes with SW5E\'s item list (Equipment → Add an item loads it).' : '',
  })).join('') + (altPick ? langs : '');
  const box = `<label class="feat-note${free && !note ? ' asks' : ''}"><span>${free ? 'Your choices' : 'Notes'}</span>
    <textarea rows="1" data-feat-note="${esc(key)}" data-feat-keep="${esc(keep)}" placeholder="${free ? 'What you chose (e.g. Persuasion + Forgery kit)' : 'Anything to remember'}" aria-label="Notes for ${esc(f.name)}">${esc(rest)}</textarea></label>`;
  // Choices all made with pickers, or nothing to choose: the notes box only when it holds something, else a small way
  // to add a note.
  const quiet = !free && !String(rest).trim();
  return `${chosen}${pickers ? `<div class="cls-choices feat-asks">${pickers}</div>` : ''}${quiet ? `<details class="feat-note-more"><summary class="faint">Add a note</summary>${box}</details>` : box}`;
}
/** A feature's notes: `keep` is what its pickers chose (kept in front of the typed text). */
async function setFeatureNote(key, text, keep = '') {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const notes = { ...(withEdits(snap.raw, editedFields(snap.key)).featureNotes || {}) };
  const full = [String(keep).trim(), String(text).trim()].filter(Boolean).join(', ');
  if (full) notes[key] = full;
  else delete notes[key];
  await setEditedFields(snap, { featureNotes: notes });
}

function renderClassFeatures(m) {
  const groups = {};
  for (const f of m.classFeatures) {
    const g = f.source === 'Archetype' ? `${f.sourceName} (archetype)` : f.sourceName || f.source || 'Other';
    (groups[g] = groups[g] || []).push(f);
  }
  arr(m.raw.classes).forEach((k) => {
    for (const [listKey, picks] of Object.entries(k.options || {})) {
      const info = classChoiceInfo(m, k);
      const list = info && info.lists.find((l) => l.key === listKey);
      for (const p of arr(picks)) {
        const opt = list && list.options.find((o) => o.name === p.name);
        const g = `${k.name}: ${listKey}`;
        (groups[g] = groups[g] || []).push({ name: p.name + (p.note ? ` (${p.note})` : ''), text: opt ? opt.text : '', source: 'Option', sourceName: opt && opt.source !== k.name ? opt.source : '' });
      }
    }
  });
  // Fighting styles, forms, focuses… picked in choice slots (see the class cards and Feats).
  for (const f of slotPickFeatures(m)) {
    const g = { lightsaberForms: 'Lightsaber forms', fightingStyles: 'Fighting styles', fightingMasteries: 'Fighting masteries', weaponFocuses: 'Weapon focuses', weaponSupremacies: 'Weapon supremacies' }[f.slotKind] || 'Improvements and other choices';
    (groups[g] = groups[g] || []).push(f);
  }
  const keys = Object.keys(groups);
  if (!keys.length) return empty('No class features.');
  return keys.map((g) => `<h3>${esc(g)} <span class="faint">(${groups[g].length})</span></h3>
    <div class="grid cards">${groups[g].sort((a, b) => num(a.level) - num(b.level)).map((f) => featureCard(f, m)).join('')}</div>`).join('');
}

function renderFeats(m) {
  const featRefs = m.refs.feats || {};
  const origin = {};
  const bgFeat = m.raw.background && m.raw.background.feat && m.raw.background.feat.name;
  if (bgFeat) origin[bgFeat] = `Background (${m.raw.background.name})`;
  for (const k of arr(m.raw.classes)) {
    arr(k.abilityScoreImprovements).forEach((a, i) => { if (a && a.type === 'Feat' && a.name) origin[a.name] = `${k.name} ASI #${i + 1}`; });
  }
  if (!m.feats.length) return bdFeatPicks(m) + empty('No feats.');
  // What feats let you choose (Fighting Stylist: a fighting style; Force-Sensitive: powers…).
  const res = choiceInfo(m);
  const featSlots = res ? res.slots.filter((s) => !s.owner && !s.species) : [];
  const slotsHtml = featSlots.length ? `<div class="cls-choices feat-choices"><h3>Choices from your feats</h3>${featSlots.map((s) => renderSlot(m, s)).join('')}</div>` : '';
  return `${slotsHtml}${bdFeatPicks(m)}<div class="grid cards">${m.feats.map((f) => {
    const ref = featRefs[f.name] || {};
    const rules = state.rules ? rulesModule('feats').find((x) => x.name === f.name) : null;
    const text = f.text || ref.text || '';
    // The +1's abilities as the text gives them (SW5E's attributesIncreased can leave one out: Heat Shielded).
    const inc = rules ? prFeatAbilities(rules) : arr(f.attributesIncreased || ref.attributesIncreased);
    const rulesNote = rules && !prIsFeat(rules);
    return card({
      title: f.name,
      chips: [origin[f.name] ? chip(origin[f.name], 'accent') : '', ...(inc.length === 6 ? [chip('+1 to any ability')] : inc.map((a) => chip('+ ' + a))),
        (f.prerequisite || ref.prerequisite) ? chip('Prereq: ' + (f.prerequisite || ref.prerequisite), 'warn') : '',
        rulesNote ? `<span class="chip warn" title="SW5E's feats list holds this rules note from its books: it isn't a feat and gives nothing">Not a feat: a rules note</span>` : '',
        ...(rulesNote ? [] : featureNumberChips(m, { ...f, text }))].filter(Boolean),
      // A feat's own choices (classes.js asks: skills, tools, a damage type…), the languages it teaches, and its notes.
      body: md(text) + (state.rules && !rulesNote ? bdFeatLanguagePicks(m, f.name) + featureNoteBox(m, { ...f, text, source: 'Feat' }, {
        picked: null, choiceText: featSlots.some((s) => s.feat && s.feat.name === f.name) ? '' : bdFeatChoiceText({ text }), asksFilter: bdFeatAskFilter(text),
      }) : ''),
    });
  }).join('')}</div>`;
}

function renderCustomFeatures(m) {
  return `<div class="grid cards">${arr(m.raw.customFeatures).map((f) => card({ title: f.name || 'Unnamed', body: md(f.content || f.text || '') })).join('')}</div>`;
}

// ------------------------------------------------------------- class choices
// Archetype, maneuvers and the class's option lists (Discoveries, Exploits, Instincts…), edited
// here and stored in the character: maneuvers in SW5E's own classes[i].maneuvers (and
// archetype.maneuvers), option picks in classes[i].options = { [list]: [{ name, note }] }, which
// sw5e.com keeps but has no UI for. How many you get comes from the class/archetype tables plus
// options that grant more (e.g. Malleable Maneuvering: two additional maneuvers).
let classRulesCache = null;
function classRules() {
  if (!state.rules) return null;
  if (!classRulesCache || classRulesCache.rules !== state.rules) {
    classRulesCache = { rules: state.rules, parsed: parseClassOptions(state.rules.modules || {}) };
  }
  return classRulesCache.parsed;
}
const rulesModule = (name) => arr(state.rules && state.rules.modules && state.rules.modules[name]);
const rulesManeuver = (n) => rulesModule('maneuvers').find((x) => x.name === n) || null;

/**
 * Lists, counts and picks for one class of the character (null until the rules data is loaded): the
 * class's option lists, its archetype's own lists ("You gain one of the following features of your
 * choice": Hunter's Prey), and maneuvers. See choices.js chClassInfo.
 */
function classChoiceInfo(m, k) {
  const parsed = classRules();
  if (!parsed) return null;
  return chClassInfo(k, state.rules.modules || {}, parsed, { itemOf: (kk, i) => modifiedItemRef(kk, i), rowOf: (kk) => classRow(m.raw, kk) });
}
/** The catalog entry of a class's modified item (Engineer modifications), by its place (0, 1). */
function modifiedItemRef(k, i) {
  const name = arr(k.modifiedItems)[i];
  return (name && catalogIndex && catalogIndex.get(name)) || null;
}
/**
 * The Engineer's modified items (Armstech's modified weapon…) with their modifications:
 * [{ cls, list, what, n, item (its name), attune, mods: [{ name, text }] }].
 */
function modifiedItemsOf(m) {
  if (!state.rules) return [];
  const out = [];
  for (const k of arr(m.raw.classes)) {
    const cref = rulesModule('classes').find((x) => x.name === k.name);
    const aref = k.archetype && k.archetype.name ? rulesModule('archetypes').find((x) => x.name === k.archetype.name) : null;
    const info = cref && aref ? chModInfo(aref, cref, k, num(k.levels)) : null;
    if (!info || !info.item) continue;
    const ci = classChoiceInfo(m, k);
    for (const [listKey, picks] of Object.entries(k.options || {})) {
      if (!/modifications$/i.test(listKey)) continue;
      const list = ci && ci.lists.find((l) => l.key === listKey);
      arr(k.modifiedItems).forEach((name, n) => {
        if (!name) return;
        const mods = arr(picks).filter((p) => num(p.item) === n).map((p) => ({ name: p.name, text: clsScaleText(((list && list.options.find((o) => o.name === p.name)) || {}).text || '', num(k.levels)) }));
        out.push({ cls: k.name, list: listKey, what: info.what, n, item: name, attune: info.attune, mods });
      });
    }
  }
  return out;
}
/**
 * Attunement slots in use: attuned items, plus modified items that require attunement (they're attuned to you), less
 * a set's pieces that "no longer count towards your maximum attunement" (Jensaarai Headgear with the armor).
 */
function attunementUsed(m) {
  const free = arr(m.effects).filter((e, i, all) => e.kind === 'item' && e.freeAttune && all.findIndex((x) => x.id === e.id) === i)
    .reduce((t, e) => t + attuneCost((catalogIndex && catalogIndex.get(e.name)) || {}), 0);
  return num((m.c.attunement || {}).current) + modifiedItemsOf(m).filter((x) => x.attune).length - free;
}
/** What a modified weapon's mods do when it hits: "Celerity Oscillator: Once per turn, when you deal damage…". */
function modHitNotes(m, w) {
  const mi = modifiedItemsOf(m).find((x) => x.item === w.name);
  return mi ? mi.mods.flatMap((md_) => String(md_.text).replace(/_\*\*[^*]+\*\*_\s*/g, '').replace(/\s+/g, ' ').split(/(?<=\.)\s+/)
    .filter((s) => /\bwhen you (?:deal damage|hit|score a critical hit)\b[^.]*\byour modified (?:weapon|lightsaber)\b|\byour modified (?:weapon|lightsaber)\b[^.]*\bhits?\b/i.test(s))
    .map((s) => `${md_.name}: ${s}`)) : [];
}
/** Inventory items that can be an Engineer's modified item: weapons, armor/shields, lightsabers. */
function modifiableItems(m, kind) {
  return arr(m.raw.equipment).filter((it) => {
    const ref = catalogIndex && catalogIndex.get(it.name);
    if (!ref || it.category !== 'Equipment') return false;
    if (kind === 'weapon') return ref.equipmentCategory === 'Weapon';
    if (kind === 'lightsaber') return ref.equipmentCategory === 'Weapon' && /light/i.test(ref.weaponClassification || '');
    if (kind === 'armor') return ref.equipmentCategory === 'Armor';
    return false;
  }).map((it) => it.name).filter((n, i, a) => a.indexOf(n) === i);
}

// ------------------------------------------------------------- choice slots
// Fighting styles, masteries, lightsaber forms, weapon focuses/supremacies, class improvements,
// extra maneuvers and powers that features, options and feats hand out (choices.js), picked here and
// stored in the character as featureChoices. sw5e.com neither records nor applies them.

/** Multiclass improvements and the class-table row they change (choices.js). */
const multiclassBoosts = (raw, k) => chMulticlassBoosts(raw, k, (state.rules && state.rules.modules) || {});
const classRow = (raw, k) => itemClassRow(raw, k, chClassRow(raw, k, (state.rules && state.rules.modules) || {}));
/** The class augments installed ("Berserker Offensive Augment"): [{ name, cls, boosts }] (effects.js classBoosts). */
function itemClassBoosts(raw) {
  return arr(raw.equipment).filter(isEnhancedEntry).map((it) => {
    const fx = itemEffectOf(catalogIndex && catalogIndex.get(it.name));
    const on = fx && fx.classBoosts && (fx.activation === 'attune' ? it.attuned : it.equipped);
    return on ? { name: it.name, ...fx.classBoosts } : null;
  }).filter(Boolean);
}
/**
 * What an augment changes in its class's table row: the column its words name ("Rage damage" → Rage Damage +2 → +3,
 * "Sneak Attack" 3d6 → 3d8, "maneuver" → Maneuvers Known, "Guardian Auras radius" → Aura Radius 5 ft. → 10 ft.), each
 * column once. [{ col, from, to }]. A boost no column matches (Potent Aptitude's uses) changes nothing.
 */
function itemBoostChanges(row, boosts) {
  const STOP = new Set(['your', 'the', 'use', 'uses', 'additional', 'option', 'options', 'feature', 'features', 'die']);
  const stems = (s) => String(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  const same = (a, b) => a.startsWith(b) || b.startsWith(a) || (a.length > 4 && b.length > 4 && a.slice(0, 5) === b.slice(0, 5));
  const fits = { add: (v) => /^\+?\d+$/.test(String(v).trim()), step: (v) => /^\d*d(?:4|6|8|10)$/i.test(String(v).trim()), feet: (v) => /^\d+ ?ft\.?$/i.test(String(v).trim()) };
  const out = [];
  for (const b of boosts) {
    const words = stems(b.phrase);
    const best = Object.keys(row).filter((c) => !['Level', 'Features', 'Proficiency Bonus'].includes(c) && fits[b.kind](row[c]) && !out.some((x) => x.col === c))
      .map((c) => ({ c, score: stems(c).filter((w) => words.some((x) => same(w, x))).length }))
      .filter((x) => x.score > 0).sort((x, y) => y.score - x.score)[0];
    if (!best) continue;
    const v = String(row[best.c]).trim();
    const to = b.kind === 'step' ? v.replace(/d(\d+)$/i, (x, n) => `d${Math.min(12, Number(n) + 2)}`)
      : b.kind === 'feet' ? v.replace(/^\d+/, (n) => String(Number(n) + b.n))
        : `${v.startsWith('+') ? '+' : ''}${num(v) + b.n}`;
    out.push({ col: best.c, from: v, to });
  }
  return out;
}
/** A class's table row with its installed augments' changes. */
function itemClassRow(raw, k, row) {
  const mine = catalogIndex ? itemClassBoosts(raw).filter((b) => b.cls === k.name) : [];
  if (!mine.length) return row;
  const out = { ...row };
  for (const b of mine) for (const x of itemBoostChanges(out, b.boosts)) out[x.col] = x.to;
  return out;
}
/** The highest power level the classes let the character cast, by kind (0: at-will only, -1: none); choices.js adds feat powers. */
function castingLevels(c, raw) {
  const lvl = (cast) => (cast && typeof cast === 'object' && (num(cast.maxPoints) || arr(cast.powersKnown).length) ? num(cast.maxPowerLevel) : -1);
  return chCastingLevels(raw, (state.rules && state.rules.modules) || {}, { force: lvl(c && c.forceCasting), tech: lvl(c && c.techCasting) });
}
const choiceCache = new Map(); // signature -> result (the sheet asks with SW5E's and with the recomputed numbers)
/** Every choice slot with its picks and problems (null until the rules data is loaded). */
function choiceInfoFor(raw, complete) {
  const parsed = classRules();
  if (!parsed) return null;
  const casting = castingLevels(complete, raw);
  const pb = num(complete && complete.proficiencyBonus);
  const skillSig = ABILITIES.flatMap((a) => arr((((complete && complete.abilityScores) || {})[a] || {}).skills)).map((x) => x.name + x.proficiency).join();
  // Ability scores, for feat prerequisites ("Strength 13").
  const scores = complete && complete.abilityScores ? Object.fromEntries(ABILITIES.map((a) => [a, num((complete.abilityScores[a] || {}).value)])) : null;
  const sig = canonical([raw.classes, raw.featureChoices || null, raw.featureNotes || null, raw.background || null, raw.customFeats || null, raw.species || null, casting, pb, skillSig, scores]);
  const hit = choiceCache.get(sig);
  if (hit && hit.rules === state.rules) return hit.res;
  const modules = state.rules.modules || {};
  const rowOf = (k) => classRow(raw, k);
  const cm = chClassManeuvers(raw, modules, parsed, rowOf);
  const classPowerNames = arr(raw.classes).flatMap((k) => ['forcePowers', 'techPowers'].flatMap((f) => arr(k[f]).concat(arr(k.archetype && k.archetype[f]))));
  // Proficient skills, for maneuver prerequisites ("Proficiency in Medicine").
  const skills = ABILITIES.flatMap((a) => arr((((complete && complete.abilityScores) || {})[a] || {}).skills)).filter((x) => PROF_RANK(x.proficiency) > 0).map((x) => x.name);
  const res = choiceSlots(raw, {
    modules, parsed, casting, notes: raw.featureNotes || {}, pb, rowOf,
    classManeuvers: cm.names.length, classManeuverMax: cm.max, classManeuverNames: cm.names, classDice: chClassSupDice(raw, modules), classPowerNames,
    skills: complete && complete.abilityScores ? skills : null, scores,
  });
  if (choiceCache.size > 6) choiceCache.delete(choiceCache.keys().next().value);
  choiceCache.set(sig, { rules: state.rules, res });
  return res;
}
const choiceInfo = (m) => choiceInfoFor(m.raw, m.c);
/** Maneuvers picked in slots (Superiority Style…), on top of the classes' own. */
const slotManeuvers = (m) => {
  const res = state.rules ? choiceInfo(m) : null;
  return res ? res.slots.filter((s) => s.kind === 'maneuvers').flatMap((s) => s.picks.map((p) => p.name)) : [];
};

/** One slot's editor: what's chosen (with notes, weapons and problems) and a list to add from. */
function renderSlot(m, s) {
  // A feat that grants no picks, only problems (Tough without Durable): the problems, without an empty pick row.
  if (s.kind === 'feat') {
    return `<div class="cls-list slot"><div class="cls-head"><b>${esc(s.title)}</b> <span class="faint">${esc(s.label || s.from)}</span></div>
      ${s.problems.map((p) => `<div class="slot-problem">${esc(p)}</div>`).join('')}</div>`;
  }
  const kind = CH_KINDS[s.kind] || {};
  const chosen = new Set(s.picks.map((p) => p.name));
  // Things of this kind chosen elsewhere can't be chosen again (styles, forms, maneuvers, powers).
  const isPower = (kd) => /owers$/.test(kd);
  const elsewhere = new Set((choiceInfo(m) || { slots: [] }).slots.filter((x) => x !== s && (x.kind === s.kind || (isPower(x.kind) && isPower(s.kind)))).flatMap((x) => x.picks.map((p) => p.name)));
  if (s.kind === 'maneuvers') arr(m.raw.classes).forEach((k) => arr(k.maneuvers).concat(arr(k.archetype && k.archetype.maneuvers)).forEach((n) => elsewhere.add(n)));
  if (isPower(s.kind)) arr(m.raw.classes).forEach((k) => ['forcePowers', 'techPowers'].forEach((f) => arr(k[f]).concat(arr(k.archetype && k.archetype[f])).forEach((n) => elsewhere.add(n))));
  const weapons = kind.weapons ? ownWeapons(m.raw) : [];
  const avail = s.options.filter((o) => !chosen.has(o.name) && !elsewhere.has(o.name)).sort((a, b) => (s.allowed ? (s.allowed.includes(b.name) - s.allowed.includes(a.name)) : 0) || a.name.localeCompare(b.name));
  const ctxUnmet = (o) => chUnmet(o.prerequisite, { classes: Object.fromEntries(arr(m.raw.classes).map((k) => [k.name, num(k.levels)])), level: num(choiceInfo(m).level), casting: choiceInfo(m).casting });
  const picks = s.picks.map((p, i) => {
    const o = s.options.find((x) => x.name === p.name);
    return `<details class="cls-pick"><summary><b>${esc(p.name)}</b>${p.auto ? ' <span class="chip" title="Given by the feature; choose another only if you already know it">from the feature</span>' : ''}
        ${p.auto ? '' : `<button class="btn sm cls-x" data-act="slot-remove" data-arg="${esc(s.key)}|${i}" title="Remove" aria-label="Remove ${esc(p.name)}">×</button>`}</summary>
      ${p.auto ? '' : `<input class="cls-note" data-slot-note="${esc(s.key)}|${i}" value="${esc(p.note || '')}" placeholder="Your choices for it, if any" aria-label="Choices for ${esc(p.name)}">`}
      ${weapons.length && !p.auto ? `<div class="slot-weapons"><span class="faint">Applies to:</span> ${weapons.map((w) => `<label><input type="checkbox" data-slot-weapon="${esc(s.key)}|${i}|${esc(w.it.name)}"${arr(p.weapons).includes(w.it.name) ? ' checked' : ''}> ${esc(w.it.name)}</label>`).join(' ')}</div>` : ''}
      ${kind.weapons && !arr(p.weapons).length ? '<div class="faint">Tick the weapons of this group you carry: SW5E\'s data doesn\'t say which weapons belong to it.</div>' : ''}
      ${o ? `${o.prerequisite ? `<div class="faint">Prerequisite: ${esc(o.prerequisite)}</div>` : ''}<div class="desc">${md(o.text || o.description || '')}</div>` : ''}</details>`;
  }).join('');
  // A power the feature gives (Techie's repair droid) leaves nothing to choose.
  const full = s.given || s.picks.filter((p) => !p.auto).length >= s.count;
  const title = s.title + (s.oncePerRest && !/once per/i.test(s.title) ? ' (once per long rest)' : '') + (s.requires && !/requires/.test(s.title) ? ` (needs ${s.requires === 'attack' ? 'an attack roll' : 'a saving throw'})` : '');
  return `<div class="cls-list slot"><div class="cls-head"><b>${esc(title)}</b> ${countChip(s.picks.length, s.count)}
      <span class="faint">${esc(s.label || s.from)}</span></div>
    ${s.hint ? `<div class="slot-hint">${esc(s.hint)}</div>` : ''}
    ${kind.otherClass ? '<div class="slot-hint">Each improvement adds the levels of the other class chosen with it.</div>' : ''}
    ${s.kind === 'lightsaberForms' ? formRules() : ''}
    ${s.problems.map((p) => `<div class="slot-problem">${esc(p)}</div>`).join('')}
    <div class="cls-picks">${picks || '<span class="faint">None chosen yet.</span>'}</div>
    ${full && !s.hint ? '' : `<select class="cls-add" data-slot-add="${esc(s.key)}" aria-label="Choose: ${esc(title)}"><option value="">Choose ${esc(kind.word ? `a ${kind.word}` : 'one')}…</option>
      ${avail.map((o) => {
        const unmet = ctxUnmet(o);
        // Other forms than the feature's own: only once you knew that one already (the hint says when that's the case).
        const tag = s.allowed && !s.allowed.includes(o.name) && !s.hint ? ' (only if you already know the feature\'s form)' : unmet.length ? ` (needs ${unmet.join(', ')})` : '';
        return `<option value="${esc(o.name)}">${esc(o.name)}${esc(tag)}</option>`;
      }).join('')}</select>${bdBrowse(`slot|${s.key}`, avail.length)}`}</div>`;
}

/** Write a change to the character's slot picks. */
async function editSlot(key, change) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const raw = withEdits(snap.raw, editedFields(snap.key));
  const all = clone(raw.featureChoices || {});
  const picks = arr(all[key]).map((p) => (typeof p === 'string' ? { name: p } : p));
  const next = change(picks);
  if (next.length) all[key] = next; else delete all[key];
  await setEditedFields(snap, { featureChoices: all });
}
async function addSlotPick(key, name) {
  if (!name) return;
  await editSlot(key, (picks) => picks.concat({ name }));
  setStatus(`Chose ${name}. Not synced to SW5E yet.`);
}
async function removeSlotPick(arg) {
  const i = arg.lastIndexOf('|');
  const key = arg.slice(0, i);
  let gone = '';
  const undo = rememberForUndo(state.current, 'removed a choice', true);
  await editSlot(key, (picks) => { gone = (picks[Number(arg.slice(i + 1))] || {}).name; return picks.filter((_, j) => j !== Number(arg.slice(i + 1))); });
  if (state.editUndo) state.editUndo.label = `removed ${gone || 'a choice'}`;
  setStatus(`Removed ${gone || 'the choice'}.`, '', false, undo);
}
async function setSlotNote(arg, note) {
  const i = arg.lastIndexOf('|');
  await editSlot(arg.slice(0, i), (picks) => picks.map((p, j) => {
    if (j !== Number(arg.slice(i + 1))) return p;
    const q = { ...p };
    if (String(note).trim()) q.note = String(note).trim(); else delete q.note;
    return q;
  }));
}
async function setSlotWeapon(arg, on) {
  const [key, i, weapon] = (() => { const parts = arg.split('|'); return [parts.slice(0, -2).join('|'), Number(parts[parts.length - 2]), parts[parts.length - 1]]; })();
  await editSlot(key, (picks) => picks.map((p, j) => {
    if (j !== i) return p;
    const ws = arr(p.weapons).filter((w) => w !== weapon).concat(on ? [weapon] : []);
    const q = { ...p, weapons: ws };
    if (!ws.length) delete q.weapons;
    return q;
  }));
  scheduleRecompute(state.current);
}

/** What's picked in slots, as features (cards under Class Features; forms and states can be started). */
function slotPickFeatures(m) {
  const res = state.rules ? choiceInfo(m) : null;
  if (!res) return [];
  return chPickTexts(res).filter((p) => !['maneuvers', 'forcePowers', 'techPowers', 'powers'].includes(p.kind))
    .map((p) => ({ name: p.name, text: p.text, source: 'Choice', sourceName: p.title, from: p.key, note: p.note, form: p.kind === 'lightsaberForms', slotKind: p.kind, owner: p.owner }));
}

const countChip = (have, max) => `<span class="chip ${have > max ? 'bad' : have === max ? 'good' : 'warn'}" title="${have > max ? 'More than the rules allow' : have < max ? `${max - have} still to choose` : 'All chosen'}">${have} / ${max}</span>`;

/** The choices editor in a class's card. */
/** The maneuvers a class knows, with the picker (class card, and the feature that gives them: Combat Superiority…). */
function classManeuverBlock(m, k, idx, info) {
  if (!info || !info.maneuvers) return '';
  const known = new Set(arr(info.maneuvers.chosen));
  const all = rulesModule('maneuvers').slice().sort((a, b) => a.name.localeCompare(b.name));
  const byType = {};
  for (const mv of all) if (!known.has(mv.name)) (byType[mv.type || 'Other'] = byType[mv.type || 'Other'] || []).push(mv);
  return `<div class="cls-list"><div class="cls-head"><b>Maneuvers</b> ${countChip(known.size, info.maneuvers.max)}
      <span class="faint">${esc(info.maneuvers.sources.join(' + '))}</span></div>
    <div class="cls-picks">${[...known].map((n, i) => {
      const mv = rulesManeuver(n);
      const all = m.maneuverNames.map((x) => String(x).toLowerCase());
      const needs = mv ? String(mv.prerequisite || '').split(/,\s*/).map((part) => (/^(.+?) maneuver$/i.exec(part.trim()) || [])[1]).filter((x) => x && x.toLowerCase() !== n.toLowerCase() && !all.includes(x.toLowerCase())) : [];
      return `<details class="cls-pick"><summary><b>${esc(n)}</b>${mv ? ` <span class="faint">${esc(mv.type || '')}</span>` : ''}${needs.map((x) => ` <span class="chip warn">needs ${esc(x)}</span>`).join('')}
        <button class="btn sm cls-x" data-act="cls-remove" data-arg="${idx}|__maneuvers|${i}" title="Forget this maneuver" aria-label="Forget ${esc(n)}">×</button></summary>
        ${mv ? `${mv.prerequisite ? `<div class="faint">Prerequisite: ${esc(mv.prerequisite)}</div>` : ''}<div class="desc">${md(mv.description || '')}</div>` : ''}</details>`;
    }).join('') || '<span class="faint">None chosen yet.</span>'}</div>
    <select class="cls-add" data-cls-add="${idx}|__maneuvers" aria-label="Add a maneuver"><option value="">Add a maneuver…</option>
      ${Object.keys(byType).sort().map((t) => `<optgroup label="${esc(t)}">${byType[t].map((mv) => `<option value="${esc(mv.name)}">${esc(mv.name)}${mv.prerequisite ? ` (needs ${esc(mv.prerequisite)})` : ''}</option>`).join('')}</optgroup>`).join('')}
    </select>${bdBrowse(`man|${idx}`)}</div>`;
}
/** One of a class's option lists (Discoveries, an archetype's list…), with its picks and picker. */
function classListBlock(m, k, idx, info, l) {
  const chosenNames = l.chosen.map((p) => p.name);
  const avail = l.options.filter((o) => o.repeatable || !chosenNames.includes(o.name));
  const bySource = {};
  for (const o of avail) (bySource[o.source] = bySource[o.source] || []).push(o);
  const md_ = l.mods;
  const pb = num(m.c.proficiencyBonus);
  const modHead = md_ ? `<div class="mod-items">${md_.item ? Array.from({ length: md_.items }, (_, n) => {
    const opts = modifiableItems(m, md_.item);
    const cur = arr(k.modifiedItems)[n] || '';
    return `<label>${esc(md_.what)}${md_.items > 1 ? ` ${n + 1}` : ''} <select data-cls-moditem="${idx}|${n}"><option value="">— choose from your inventory —</option>${opts.concat(cur && !opts.includes(cur) ? [cur] : []).map((o) => `<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  }).join('') : `<span class="faint">${esc(md_.what)}</span>`}
    <span class="faint">${md_.perItem} slots${md_.items > 1 ? (md_.total > md_.perItem ? ' each' : ' in all') : ''}</span>
    ${md_.penalty && l.chosen.length > pb ? `<span class="chip warn" title="For each modification installed in excess of your proficiency bonus, your tech point maximum is reduced by 1">Tech points −${l.chosen.length - pb}</span>` : ''}</div>` : '';
  return `<div class="cls-list"><div class="cls-head"><b>${esc(l.title)}</b> ${countChip(l.chosen.length, l.max)}
      <span class="faint">${l.source === 'archetype' ? `${esc(k.archetype.name)}, ${esc(ordinal(l.minLevel || 1))} level${l.swap ? ' · can be changed on a rest' : ''}` : `from the ${esc(k.name)} table (“${esc(l.column)}”)`}</span></div>
    ${modHead}${arr(l.problems).map((p) => `<div class="slot-problem">${esc(p)}</div>`).join('')}${arr(l.hints).map((p) => `<div class="slot-hint">${esc(p)}</div>`).join('')}
    <div class="cls-picks">${l.chosen.map((p, i) => {
      const o = l.options.find((x) => x.name === p.name);
      const tooLow = o && o.minLevel > info.level;
      // Weapons noted for it that its words exclude (Weaponmaster's Exploit: "…that lack the heavy and strength properties").
      const clause = o && (/[^.]*(?:weapon|blaster)s?\b[^.]*\b(?:that|which) (?:lack|don't have|do not have) the [\w\s,-]+? propert(?:y|ies)\b[^.]*|[^.]*(?:weapon|blaster)s?\b[^.]*\b(?:with|without) the [\w\s,-]+? propert(?:y|ies)\b[^.]*/i.exec(String(o.text || '').replace(/\s+/g, ' ')) || [])[0];
      const misfit = clause ? clsNoteTokens(p.note).filter((n) => { const w = catalogByName(n.replace(/[.;:]+$/, '')); return w && w.equipmentCategory === 'Weapon' && !weaponFitsProps(clause, w); }) : [];
      return `<details class="cls-pick"><summary><b>${esc(p.name)}</b>${o && o.source !== k.name ? ` <span class="chip">${esc(o.source)}</span>` : ''}
          ${tooLow ? ` <span class="chip warn">needs ${esc(ordinal(o.minLevel))} level</span>` : ''}${misfit.length ? ` <span class="chip warn" title="${esc(clause.trim())}">${esc(misfit.join(', '))}: not allowed</span>` : ''}${!o ? ' <span class="chip warn">not in SW5E data</span>' : ''}
          <button class="btn sm cls-x" data-act="cls-remove" data-arg="${idx}|${esc(l.key)}|${i}" title="Remove" aria-label="Remove ${esc(p.name)}">×</button></summary>
        ${md_ && md_.items > 1 ? `<label class="faint">On <select data-cls-pickitem="${idx}|${esc(l.key)}|${i}">${Array.from({ length: md_.items }, (_, n) => `<option value="${n}"${(p.item || 0) === n ? ' selected' : ''}>${esc(arr(k.modifiedItems)[n] || `${md_.what} ${n + 1}`)}</option>`).join('')}</select></label>` : ''}
        ${p.note || !o || /\b(?:choose|choice|of your choice|select)\b/i.test(o.text || '') ? `<input class="cls-note" data-cls-note="${idx}|${esc(l.key)}|${i}" value="${esc(p.note || '')}" placeholder="What you chose for it (e.g. Persuasion + Forgery kit)" aria-label="Choices for ${esc(p.name)}">` : ''}
        ${o ? `${o.prerequisite ? `<div class="faint">Prerequisite: ${esc(o.prerequisite)}</div>` : ''}<div class="desc">${md(o.text)}</div>` : ''}</details>`;
    }).join('') || '<span class="faint">None chosen yet.</span>'}</div>
    <select class="cls-add" data-cls-add="${idx}|${esc(l.key)}" aria-label="Add from ${esc(l.title)}"><option value="">Add from ${esc(l.title)}…</option>
      ${Object.entries(bySource).map(([src, opts]) => `<optgroup label="${esc(src)}">${opts.map((o) => `<option value="${esc(o.name)}"${o.minLevel > info.level ? ' disabled' : ''}>${esc(o.name)}${o.minLevel > info.level ? ` (${ordinal(o.minLevel)} level)` : o.prerequisite ? ` (needs ${esc(o.prerequisite)})` : ''}${o.repeatable ? ' (repeatable)' : ''}</option>`).join('')}</optgroup>`).join('')}
    </select>${bdBrowse(`list|${idx}|${l.key}`, avail.length)}</div>`;
}
/** The class's archetype picker. */
function classArchetypeBlock(m, k, idx, info) {
  const archAt = archetypeLevel(k.name);
  const early = num(k.levels) < archAt && !(k.archetype && k.archetype.name);
  const archetype = `<label class="cls-arch">Archetype <select data-cls-arch="${idx}"${early ? ` disabled title="Chosen at ${esc(ordinal(archAt))} ${esc(k.name)} level"` : ''}><option value="">${early ? `— at ${esc(ordinal(archAt))} level —` : '— none —'}</option>${info.archetypes.slice().sort((a, b) => OLD_RULES.test(a) - OLD_RULES.test(b)).map((a) => `<option value="${esc(a)}"${k.archetype && k.archetype.name === a ? ' selected' : ''}>${esc(a)}${OLD_RULES.test(a) ? ' — older rules' : ''}</option>`).join('')}</select></label>${early ? '' : bdBrowse(`arch|${idx}`, info.archetypes.length)}`;
  return archetype;
}
function renderClassChoices(m, k, idx) {
  if (!state.rules) {
    return `<div class="cls-choices"><p class="faint" style="margin:6px 0">${state.rulesError
      ? `Could not load the SW5E rules data: ${esc(state.rulesError)}. <button class="linklike" data-act="rules-load">Try again</button>`
      : `Loading SW5E's rules data for the choices (archetype, maneuvers, ${esc(k.name)} options)…`}</p></div>`;
  }
  const info = classChoiceInfo(m, k);
  if (!info) return '';
  const maneuverBlock = classManeuverBlock(m, k, idx, info);
  const listBlocks = info.lists.map((l) => classListBlock(m, k, idx, info, l)).join('');
  const archetype = classArchetypeBlock(m, k, idx, info);
  // Guardian's "Shien/Djem So Form" archetypes aren't the lightsaber forms of chapter 6 (Shien, Djem So…), picked apart.
  const formArch = info.archetypes.some((a) => / Form$/.test(a)) ? `<div class="slot-hint">The ${esc(k.name)} archetypes named after forms ("Shien/Djem So Form") are ${esc(k.name.toLowerCase())} paths: they give their own features. The lightsaber forms you adopt in a fight (Djem So, Shien, Soresu… from chapter 6) are separate picks, where a feature or feat lets you learn them.</div>` : '';
  const res = choiceInfo(m);
  const slotBlocks = res ? res.slots.filter((s) => s.owner === k.name).map((s) => renderSlot(m, s)).join('') : '';
  return `<div class="cls-choices">${archetype}${formArch}${maneuverBlock}${renderPowerBlocks(m, k, idx)}${listBlocks}${slotBlocks}${renderCustomFeatureMatches(m, k, idx, info)}</div>`;
}

// SW5E's data keeps earlier versions of some archetypes ("Cybertech Engineering (Depreciated)", "… (Old)").
const OLD_RULES = /\((?:depreciated|deprecated|old|legacy)\)/i;
/** The word for a class's archetypes, singular and lower case: "approach", "tradition", "focus". */
function archetypeWord(name) {
  const c = rulesModule('classes').find((x) => x.name === name);
  return String((c && c.archetypeFlavorName) || '').split(' ').pop().replace(/ies$/, 'y').replace(/ches$/, 'ch').replace(/i$/, 'us').replace(/s$/, '').toLowerCase();
}
/** The class level its archetype is chosen at: the first row of its table naming it (3rd for every SW5E class). */
function archetypeLevel(name) {
  const c = rulesModule('classes').find((x) => x.name === name);
  const word = archetypeWord(name);
  const hit = word && Object.entries((c && c.levelChanges) || {}).find(([, row]) => String(row.Features || '').toLowerCase().includes(word));
  return hit ? num(hit[0]) : 3;
}
/** The name of the feature that gives the archetype, lower case ("berserker approach", "monastic order"). */
function archetypeFeature(name) {
  const c = rulesModule('classes').find((x) => x.name === name);
  const word = archetypeWord(name);
  const row = word && Object.values((c && c.levelChanges) || {}).find((r) => String(r.Features || '').toLowerCase().includes(word));
  return row ? (String(row.Features).toLowerCase().split(/,\s*/).find((x) => x.includes(word)) || '').trim() : '';
}

/** Custom features that are really options or class features (sw5e.com workarounds): offer to convert them. */
function customFeatureMatches(m, k, info) {
  const out = [];
  const features = m.allFeatures.map((f) => clsBaseName(f.name));
  arr(m.raw.customFeatures).forEach((f, ci) => {
    const base = clsBaseName(f.name);
    if (!base) return;
    for (const l of info.lists) {
      // Any archetype's additions count here: the archetype may not be set yet.
      const parsed = classRules();
      const all = l.options.concat(...Object.values(parsed.archetypes).filter((a) => a.className === k.name).map((a) => a.extends[l.key] || []));
      const o = all.find((x) => clsBaseName(x.name) === base);
      if (o) { out.push({ ci, f, kind: 'option', list: l.key, option: o }); return; }
    }
    if (info.maneuvers && rulesManeuver(f.name.replace(/\s*\([^)]*\)\s*$/, '').trim())) { out.push({ ci, f, kind: 'maneuver', option: rulesManeuver(f.name.replace(/\s*\([^)]*\)\s*$/, '').trim()) }); return; }
    if (features.includes(base)) out.push({ ci, f, kind: 'duplicate' });
  });
  return out;
}
function renderCustomFeatureMatches(m, k, idx, info) {
  const hits = customFeatureMatches(m, k, info);
  if (!hits.length) return '';
  return `<div class="cls-convert"><b>Custom features that match ${esc(k.name)} choices</b>
    <p class="faint" style="margin:4px 0">Probably added on sw5e.com because it had no way to choose them. Converting keeps your notes and removes the custom copy.</p>
    ${hits.map((h) => `<div class="cls-conv-row"><span>“${esc(h.f.name)}” → ${h.kind === 'option' ? `${esc(h.list)}: <b>${esc(h.option.name)}</b>${h.option.source !== k.name ? ` <span class="chip">${esc(h.option.source)}</span>` : ''}`
      : h.kind === 'maneuver' ? `maneuver <b>${esc(h.option.name)}</b>` : 'already shown under Class Features'}</span>
      <button class="btn sm" data-act="cls-convert" data-arg="${idx}|${h.ci}">${h.kind === 'duplicate' ? 'Remove the copy (keep its notes)' : 'Convert'}</button></div>`).join('')}</div>`;
}

/** Write a change to one class (and optionally the custom features) as edits. */
async function editClass(idx, change, customFeatures) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const raw = withEdits(snap.raw, editedFields(snap.key));
  const classes = clone(arr(raw.classes));
  if (!classes[idx]) return;
  change(classes[idx]);
  const patch = { classes };
  if (customFeatures) patch.customFeatures = customFeatures;
  await setEditedFields(snap, patch);
}
async function addClassChoice(arg, name) {
  if (!name) return;
  const [idx, list] = arg.split('|');
  await editClass(Number(idx), (k) => {
    if (list === '__maneuvers') k.maneuvers = arr(k.maneuvers).concat(name);
    else {
      k.options = { ...(k.options || {}) };
      k.options[list] = arr(k.options[list]).concat({ name });
    }
  });
  setStatus(`Added ${name}. Not synced to SW5E yet.`);
}
async function removeClassChoice(arg) {
  const [idx, list, i] = arg.split('|');
  let gone = '';
  const undo = rememberForUndo(state.current, 'removed a choice', true);
  await editClass(Number(idx), (k) => {
    if (list === '__maneuvers') {
      const own = arr(k.maneuvers);
      if (Number(i) < own.length) { gone = own[i]; k.maneuvers = own.filter((_, j) => j !== Number(i)); } else if (k.archetype) {
        const j = Number(i) - own.length;
        gone = arr(k.archetype.maneuvers)[j];
        k.archetype = { ...k.archetype, maneuvers: arr(k.archetype.maneuvers).filter((_, x) => x !== j) };
      }
    } else {
      const picks = arr((k.options || {})[list]);
      gone = (picks[i] || {}).name;
      k.options = { ...(k.options || {}), [list]: picks.filter((_, j) => j !== Number(i)) };
      if (!k.options[list].length) delete k.options[list];
      if (!Object.keys(k.options).length) delete k.options;
    }
  });
  if (state.editUndo) state.editUndo.label = `removed ${gone || 'a choice'}`;
  setStatus(`Removed ${gone || 'the choice'}.`, '', false, undo);
}
async function setClassNote(arg, note) {
  const [idx, list, i] = arg.split('|');
  await editClass(Number(idx), (k) => {
    const picks = arr((k.options || {})[list]).map((p) => ({ ...p }));
    if (!picks[i]) return;
    if (String(note).trim()) picks[i].note = String(note).trim(); else delete picks[i].note;
    k.options = { ...(k.options || {}), [list]: picks };
  });
}
async function setModifiedItem(arg, name) {
  const [idx, n] = arg.split('|').map(Number);
  await editClass(idx, (k) => {
    const items = arr(k.modifiedItems).slice();
    items[n] = name || null;
    while (items.length && !items[items.length - 1]) items.pop();
    if (items.length) k.modifiedItems = items; else delete k.modifiedItems;
  });
  scheduleRecompute(state.current);
  setStatus(name ? `Modified item: ${name}. Not synced to SW5E yet.` : 'Modified item cleared.');
}
async function setPickItem(arg, n) {
  const [idx, list, i] = arg.split('|');
  await editClass(Number(idx), (k) => {
    const picks = arr((k.options || {})[list]).map((p) => ({ ...p }));
    if (!picks[i]) return;
    if (Number(n)) picks[i].item = Number(n); else delete picks[i].item;
    k.options = { ...(k.options || {}), [list]: picks };
  });
  scheduleRecompute(state.current);
}
async function setArchetype(idx, name) {
  await editClass(Number(idx), (k) => {
    if (name) k.archetype = { ...(k.archetype && k.archetype.name === name ? k.archetype : {}), name };
    else delete k.archetype;
  });
  setStatus(name ? `Archetype: ${name}. Not synced to SW5E yet.` : 'Archetype removed. Not synced to SW5E yet.');
}
async function convertCustomFeature(arg) {
  const [idx, ci] = arg.split('|').map(Number);
  const snap = state.snapshots[state.current];
  const m = buildModel(snap);
  const k = arr(m.raw.classes)[idx];
  const info = k && classChoiceInfo(m, k);
  const hit = info && customFeatureMatches(m, k, info).find((h) => h.ci === ci);
  if (!hit) return;
  const customFeatures = arr(m.raw.customFeatures).filter((_, j) => j !== ci);
  // Keep what the custom feature said beyond the rules text (e.g. the skill/tool chosen) as the note.
  const content = String(hit.f.content || '').trim();
  const feat = hit.kind === 'duplicate' ? m.allFeatures.find((f) => clsBaseName(f.name) === clsBaseName(hit.f.name)) : null;
  const optText = String((hit.option && (hit.option.text || hit.option.description)) || (feat && feat.text) || '').trim();
  const squash = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const extra = content.split(/\n+/).map((l) => l.trim())
    .filter((l) => l && !squash(optText).includes(squash(l)) && clsBaseName(l) !== clsBaseName(hit.f.name)
      && !/^[\w’' ()]+:\s*[\d, and]+(?:st|nd|rd|th)\b.*level\.?$/i.test(l)).join(' ');
  if (hit.kind === 'duplicate' && extra) {
    const notes = { ...(m.raw.featureNotes || {}) };
    const key = clsBaseName(hit.f.name);
    notes[key] = [notes[key], extra].filter(Boolean).join(' ').slice(0, 300);
    await setEditedFields(snap, { featureNotes: notes });
  }
  await editClass(idx, (kk) => {
    if (hit.kind === 'option') {
      kk.options = { ...(kk.options || {}) };
      kk.options[hit.list] = arr(kk.options[hit.list]).concat(extra ? { name: hit.option.name, note: extra.slice(0, 200) } : { name: hit.option.name });
    } else if (hit.kind === 'maneuver') kk.maneuvers = arr(kk.maneuvers).concat(hit.option.name);
  }, customFeatures);
  setStatus(hit.kind === 'duplicate' ? `Removed the custom copy of ${hit.f.name}.` : `Converted “${hit.f.name}” to ${hit.option.name}. Not synced to SW5E yet.`);
}

/** Picks stored for slots the character doesn't have (yet): a feat or level removed, a level not reached. */
function renderOrphanChoices(m) {
  const res = state.rules ? choiceInfo(m) : null;
  if (!res || !res.orphans.length) return '';
  return `<div class="cls-convert"><b>Stored choices not in use</b>
    <p class="faint" style="margin:4px 0">Picks kept for a feature, feat or level the character doesn't have now. They come back if it does again.</p>
    ${res.orphans.map((k) => `<div class="cls-conv-row"><span>${esc(k)}: ${esc(arr((m.raw.featureChoices || {})[k]).map((p) => (p && p.name) || p).join(', '))}</span>
      <button class="btn sm" data-act="slot-orphan-remove" data-arg="${esc(k)}">Remove</button></div>`).join('')}</div>`;
}
function renderClasses(m) {
  const { raw, refs, c } = m;
  const choiceRefs = refs.choices || {};
  const levelUp = bdLevelUpPanel(m);
  const skip = new Set(['name', 'levels', 'hitPoints', 'abilityScoreImprovements', 'archetype', 'maneuvers', 'options', 'forcePowers', 'techPowers', 'modifiedItems', 'skills', 'expertise']);
  return levelUp + arr(raw.classes).map((k, idx) => {
    const ref = (refs.classes || {})[k.name] || {};
    const hd = ref.hitDiceDieType ? `d${ref.hitDiceDieType}` : '';
    const lc = ref.levelChanges || {};
    const row = lc[String(k.levels)] || null;
    const nextRow = lc[String(k.levels + 1)] || null;
    const hpRolls = arr(k.hitPoints);
    const asis = arr(k.abilityScoreImprovements).map((a) => {
      if (!a) return '';
      if (a.type === 'Feat') return chip('Feat: ' + a.name, 'accent');
      const inc = arr(a.abilitiesIncreased).map((x) => `${x.name} +${x.value}`).join(', ');
      return chip((a.type || 'ASI') + (inc ? ': ' + inc : ''));
    }).join('');
    const choiceBlocks = Object.keys(k).filter((key) => !skip.has(key)).concat(
      k.archetype ? Object.keys(k.archetype).filter((key) => !['name', 'maneuvers', 'forcePowers', 'techPowers'].includes(key)).map((key) => 'archetype.' + key) : [],
    ).map((key) => {
      const val = key.startsWith('archetype.') ? k.archetype[key.slice(10)] : k[key];
      const names = arr(val).flatMap((v) => (typeof v === 'string' ? [v] : v && v.name ? [v.name] : []));
      if (!names.length) return '';
      const field = key.replace(/^archetype\./, '');
      const lookup = choiceRefs[field] || {};
      const anchor = field === 'maneuvers' ? '#sec-superiority' : field === 'forcePowers' ? '#sec-force' : field === 'techPowers' ? '#sec-tech' : '';
      const detailed = names.filter((n) => lookup[n]);
      return `<div style="margin-top:8px"><b>${esc(titleCase(field))}</b> ${anchor ? `<a href="${anchor}" class="faint" style="font-size:12px">details ↓</a>` : ''}
        <div class="chips" style="margin-top:4px">${names.map((n) => chip(n)).join('')}</div>
        ${detailed.length ? `<div class="grid cards" style="margin-top:8px">${detailed.map((n) => card({ title: n, body: md(lookup[n].description || lookup[n].text || '') })).join('')}</div>` : ''}</div>`;
    }).join('');
    const tableCols = row ? Object.keys(row).filter((col) => !/^(Level)$/.test(col)) : [];
    return `<div class="card no-toggle" style="margin-bottom:10px">
      <div class="card-head"><span class="title" style="font-size:16px">${esc(k.name)} ${esc(k.levels)}</span>
        ${k.archetype && k.archetype.name ? chip(k.archetype.name, 'accent') : ''}
        ${idx === 0 ? chip('Starting class') : chip('Multiclass')}
        ${ref.casterType && ref.casterType !== 'None' ? chip(ref.casterType + ' caster', 'blue') : ''}</div>
      <div class="facts"><span>Hit die <b>${esc(hd || '—')}</b></span><span>Primary <b>${esc(ref.primaryAbility || '—')}</b></span>
        <span>Saves <b>${esc(arr(ref.savingThrows).join(', ') || '—')}</b></span>
        <span>HP by level <b>${esc([idx === 0 ? `${ref.hitDiceDieType || '?'} (max)` : null, ...hpRolls].filter((x) => x != null).join(', ') || '—')}</b></span></div>
      ${ref.summary ? `<div class="desc muted">${md(ref.summary)}</div>` : ''}
      ${asis ? `<div style="margin-top:8px"><b>Ability score improvements</b><div class="chips" style="margin-top:4px">${asis}</div></div>` : ''}
      ${bdClassProficiencies(m, k, idx)}
      ${renderClassChoices(m, k, idx)}
      ${choiceBlocks}
      ${row ? `<div style="margin-top:10px"><b>Class table</b>
        <dl class="ct-list">${tableCols.map((col) => `<div><dt>${esc(col)}</dt><dd>${md(row[col]).replace(/^<p>|<\/p>$/g, '') || '—'}${nextRow ? ` <span class="faint">→ ${md(nextRow[col]).replace(/^<p>|<\/p>$/g, '') || '—'} at ${esc(nextRow.Level || k.levels + 1)}</span>` : ''}</dd></div>`).join('')}</dl>
        <div class="table-wrap ct-table"><table><thead><tr><th></th>${tableCols.map((col) => `<th>${esc(col)}</th>`).join('')}</tr></thead>
        <tbody><tr><td><b>Now (${esc(row.Level || k.levels)})</b></td>${tableCols.map((col) => {
          const v = String(row[col] || '').trim();
          const d = /^(\d*)d(\d+)$/i.exec(v);
          return `<td>${d ? rollable(`dice|${d[1] || 1}d${d[2]}`, esc(v), `Roll ${col}`) : md(row[col]).replace(/^<p>|<\/p>$/g, '')}</td>`;
        }).join('')}</tr>
        ${nextRow ? `<tr class="dim"><td>Next (${esc(nextRow.Level || k.levels + 1)})</td>${tableCols.map((col) => `<td>${md(nextRow[col]).replace(/^<p>|<\/p>$/g, '')}</td>`).join('')}</tr>` : ''}
        </tbody></table></div></div>` : ''}
      ${ref.armorProficiencies || ref.weaponProficiencies ? `<div class="facts" style="margin-top:8px">
        <span>Armor <b>${esc(arr(ref.armorProficiencies).join(', ') || '—')}</b></span>
        <span>Weapons <b>${esc(arr(ref.weaponProficiencies).join(', ') || '—')}</b></span>
        <span>Tools <b>${esc(arr(ref.toolProficiencies).join(', ') || '—')}</b></span>
        ${idx > 0 && ref.multiClassProficiencies ? `<span>Multiclass grants <b>${esc(arr(ref.multiClassProficiencies).join(', '))}</b></span>` : ''}</div>` : ''}
    </div>`;
  }).join('') + renderOrphanChoices(m) + (c.experiencePoints ? '' : '');
}

function renderSpecies(m) {
  const name = m.raw.species.name;
  const ref = (m.refs.species || {})[name] || {};
  const img = arr(ref.imageUrls)[0];
  const eff = state.rules ? bdSpeciesRef(m.raw) : null; // a half-human's: with its non-human half's
  // A trait with options SW5E's feature text leaves out (Nikto's Adaptation): the card shows them.
  const withOptions = (f) => { const t = arr(ref.traits).concat(arr(eff && eff.traits)).find((x) => x.name === f.name && arr(x.options).length); return t ? { ...f, text: bdTraitFullText(t) } : f; };
  // A half-human's traits from its non-human half (SW5E lists Half-human's own only).
  const inherited = eff && eff.halfOf ? arr(eff.traits).filter((t) => !/^(?:Ability Score Increase|Age|Alignment|Size|Speed|Languages?)$/i.test(t.name) && !m.speciesFeatures.some((f) => f.name === t.name))
    .map((t) => featureCard({ name: t.name, text: bdTraitFullText(t), source: 'Species', sourceName: eff.halfOf }, m)) : [];
  const traits = m.speciesFeatures.length
    ? m.speciesFeatures.map((f) => featureCard(withOptions(f), m)).concat(inherited)
    : arr(ref.traits).map((t) => card({ title: t.name, body: md(t.description) }));
  const asi = m.raw.species.abilityScoreImprovement;
  const asiText = asi && typeof asi === 'object' && Object.keys(asi).length ? Object.entries(asi).map(([a, n]) => `${a} ${signed(n)}`).join(', ') : '';
  return `<div class="hero" style="margin-bottom:12px">
      ${img ? `<div class="portrait"><img data-src="${esc(img)}" alt=""></div>` : ''}
      <dl class="kv">
        ${[['Non-human half', eff && eff.halfOf], ['Size', (eff && eff.halfOf && eff.size) || ref.size], ['Homeworld', ref.homeworld], ['Language', (eff && eff.halfOf && eff.language) || ref.language], ['Average height', ref.heightAverage && `${ref.heightAverage} ${ref.heightRollMod || ''}`],
          ['Average weight', ref.weightAverage && `${ref.weightAverage} ${ref.weightRollMod || ''}`], ['Skin', ref.skinColorOptions], ['Hair', ref.hairColorOptions], ['Eyes', ref.eyeColorOptions],
          ['Distinctions', ref.distinctions], ['Chosen increase', asiText]]
          .filter(([, v]) => nonEmpty(v)).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') || '<dt>Species</dt><dd>' + esc(name) + '</dd>'}
      </dl>
    </div>
    <h3>Traits <span class="faint">(${traits.length})</span></h3>
    <div class="grid cards">${traits.join('') || empty('No traits found.')}</div>
    ${(() => {
      // Powers the species gives (Jawa: ion blast; Esh-Kha: your choice of three).
      const res = choiceInfo(m);
      const slots = res ? res.slots.filter((x) => x.species) : [];
      return slots.length ? `<div class="cls-choices"><h3>Powers from your species</h3>${slots.map((x) => renderSlot(m, x)).join('')}</div>` : '';
    })()}${bdSpeciesPicks(m)}`;
}

function renderBackground(m) {
  const bg = m.raw.background;
  const ref = (m.refs.backgrounds || {})[bg.name] || {};
  const feat = m.c.backgroundFeature;
  return `<dl class="kv" style="margin-bottom:12px">
      ${[['Skill proficiencies', ref.skillProficiencies], ['Tool proficiencies', ref.toolProficiencies], ['Languages', ref.languages],
        ['Starting equipment', ref.equipment], ['Background feat', bg.feat && bg.feat.name], [ref.flavorName, ref.flavorDescription]]
        .filter(([k, v]) => k && nonEmpty(v)).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${/\|\s*:?-{3,}/.test(String(v)) ? md(String(v)) : mdInline(v)}</dd>`).join('')}
    </dl>
    <div class="grid cards">
      ${feat ? card({ title: `Feature: ${feat.name}`, chips: [chip('Background feature', 'accent')], body: md(feat.text) })
        : ref.featureName ? card({ title: `Feature: ${ref.featureName}`, body: md(ref.featureText) }) : ''}
      ${ref.flavorText ? card({ title: 'About this background', body: md(ref.flavorText), extraClass: 'collapsed' }) : ''}
    </div>${bdBackgroundPicks(m)}`;
}

function renderProficiencies(m) {
  const { c, raw } = m;
  const byType = {};
  // Tools are rollable (a check with the ability chosen in the roll card).
  const toolChip = (name, level, label) => rollable(`tool|${name}|${level || 'proficient'}`, chip(label), `Roll a ${name} check`);
  const raisedBy = (name) => arr(m.fx && m.fx.tools).find((t) => t.level === 'expertise' && t.name.toLowerCase() === String(name).toLowerCase());
  // A tool a feature raises to expertise is shown once, at expertise (below), whatever its letter case.
  for (const p of arr(c.proficiencies)) {
    if (p.type === 'tool' && raisedBy(p.name)) continue;
    (byType[p.type || 'other'] = byType[p.type || 'other'] || []).push(p.type === 'tool' ? { html: toolChip(p.name, 'proficient', p.name) } : p.name);
  }
  for (const p of arr(raw.customProficiencies)) {
    if (p.type === 'tool' && raisedBy(p.name) && p.proficiencyLevel !== 'expertise') continue; // shown below, as expertise
    const label = `${p.name}${p.proficiencyLevel && p.proficiencyLevel !== 'proficient' ? ` (${p.proficiencyLevel})` : ''} ✎`;
    (byType[p.type || 'other'] = byType[p.type || 'other'] || []).push(p.type === 'tool' ? { html: toolChip(p.name, p.proficiencyLevel, label) } : label);
  }
  // One row per tool (letter case aside: "armstech's implements" from a class feature, "Armstech's implements" from a
  // feat), at its highest level.
  const fxTools = arr(m.fx && m.fx.tools).filter((t, i, all) => !all.some((x, j) => j !== i && x.name.toLowerCase() === t.name.toLowerCase()
    && (x.level === 'expertise' && t.level !== 'expertise' || (x.level === t.level && j < i))));
  for (const t of fxTools) {
    const same = (n) => String(n).toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(String(n).toLowerCase());
    const already = arr(raw.customProficiencies).some((p) => same(p.name) && (t.level !== 'expertise' || p.proficiencyLevel === 'expertise'))
      || (t.level !== 'expertise' && arr(c.proficiencies).some((p) => p.type === 'tool' && same(p.name)));
    if (!already) (byType.tool = byType.tool || []).push({ html: rollable(`tool|${t.name}|${t.level}`, chip(`${t.name}${t.level === 'expertise' ? ' (expertise)' : ''} · ${t.effect.name}`), `Roll a ${t.name} check`) });
  }
  // Armor and weapons a feature gives (Armstech Engineering, Soresu Form's heavy armor); the class's own list is SW5E's.
  for (const e of arr(m.effects).filter((x) => x.kind === 'feature' && !/:weapons$/.test(x.id))) {
    for (const [type, list] of [['armor', e.armor], ['weapon', e.weapons]]) {
      for (const n of arr(list)) (byType[type] = byType[type] || []).push({ html: `<span class="chip" title="From ${esc(e.name)}">${esc(n)} · ${esc(e.name)}</span>` });
    }
  }
  // The class's "None" (Monk armor) once a feature gives some.
  for (const t of Object.keys(byType)) if (byType[t].some((n) => typeof n === 'object')) byType[t] = byType[t].filter((n) => !(typeof n === 'string' && /^none$/i.test(n.trim())));
  const langs = [...new Set([...arr(c.languages), ...arr(raw.customLanguages)])];
  const order = ['armor', 'weapon', 'tool', 'skill', 'other'];
  const types = Object.keys(byType).sort((a, b) => (order.indexOf(a) + 99 * (order.indexOf(a) < 0)) - (order.indexOf(b) + 99 * (order.indexOf(b) < 0)));
  return `<dl class="kv">
    ${types.map((t) => `<dt>${esc(titleCase(t))}</dt><dd><div class="chips">${byType[t].map((n) => (typeof n === 'object' ? n.html : chip(n))).join('')}</div></dd>`).join('')}
    <dt>Skills & saves</dt><dd><div class="chips">${arr(c.skillAndSaveProficiencies).map((n) => chip(n, 'accent')).join('') || '<span class="empty">None</span>'}</div></dd>
    <dt>Languages</dt><dd><div class="chips">${langs.map((n) => chip(n, 'blue')).join('') || '<span class="empty">None</span>'}</div></dd>
  </dl>
  <p class="faint" style="font-size:12px;margin:8px 0 0">✎ = custom proficiency added on the character.</p>`;
}

function totalWeight(m) {
  const items = arr(m.c.equipment).length ? arr(m.c.equipment) : arr(m.raw.equipment);
  // Lightweight (a modification's): "Armor and shields with this property have their weight reduced by half".
  const light = (e, i) => arr(m.effects).some((x) => x.kind === 'item' && x.active && x.propsNow && x.propsNow.lightweight && x.propsOn === (e.index ?? i));
  const a = items.reduce((s, e, i) => s + num(e.weight) * qtyOf(e) / (light(e, i) ? 2 : 1), 0);
  const b = arr(m.raw.customEquipment).reduce((s, e) => s + num(e.weight) * qtyOf(e), 0);
  return a + b;
}

/** Quantity / equip / attune / remove controls for one inventory row (Equipment edit mode). */
function itemControls(m, e, list, i) {
  const custom = list === 'customEquipment';
  const arg = `${list}|${i}`;
  const qty = qtyOf(e);
  const info = custom || e.isFound !== undefined ? e
    : { ...((catalogIndex && catalogIndex.get(e.name)) || {}), ...e, isFound: !!(catalogIndex && catalogIndex.get(e.name)) };
  return `<span class="inv-ctl">
    <span class="inv-qty"><button class="btn sm" data-inv="qty" data-arg="${esc(arg)}|-1" ${qty <= 1 ? 'disabled' : ''} title="One fewer" aria-label="One fewer ${esc(e.name)}">−</button><b>${qty}</b><button class="btn sm" data-inv="qty" data-arg="${esc(arg)}|1" title="One more" aria-label="One more ${esc(e.name)}">+</button></span>
    ${canEquip(info, custom) ? `<button class="btn sm${e.equipped ? ' on' : ''}" data-inv="equip" data-arg="${esc(arg)}" aria-pressed="${!!e.equipped}">${e.equipped ? (isEnhanced(info) ? fxEquipLabel(info) : 'Equipped') : (isEnhanced(info) ? EQUIP_VERB[fxEquipLabel(info)] : 'Equip')}</button>` : ''}
    ${canAttune(info, custom) ? `<button class="btn sm${e.attuned ? ' on' : ''}" data-inv="attune" data-arg="${esc(arg)}" aria-pressed="${!!e.attuned}" ${atAttuneLimit(m, info) ? 'disabled title="Attunement slots full"' : ''}>${e.attuned ? 'Attuned' : 'Attune'}</button>` : ''}
    ${useControls(m, e, arg, info)}
    ${custom && packByName(e.name) ? `<button class="btn sm" data-inv="unpack" data-arg="${esc(arg)}" title="Replace the pack with what's in it">Unpack</button>` : ''}
    <button class="btn sm" data-inv="edit" data-arg="${esc(arg)}" title="${custom ? 'Edit the item: name, weight, cost, description, note' : 'Your name for it, and a note'}" aria-label="Edit ${esc(e.name)}">✎</button>
    <button class="btn sm" data-inv="sell-menu" data-arg="${esc(arg)}" title="Sell some: they go, the credits come in">Sell</button>
    <button class="btn sm${state.confirmRemove === arg ? ' used' : ''}" data-inv="remove" data-arg="${esc(arg)}" title="Remove from inventory" aria-label="${state.confirmRemove === arg ? `Really remove ${esc(e.name)}?` : `Remove ${esc(e.name)}`}">${state.confirmRemove === arg ? 'Remove?' : '×'}</button>
  </span>`;
}

/**
 * What an effect would change that a "set to" tweak fixes: ["Strength is set to 16 by a tweak"], so a consumable
 * isn't used up for nothing.
 */
function blockedBySetTweak(m, effect) {
  const set = tweakRows(m.raw).filter((r) => r.where === 'tweaks' && tweakMode(r.value) === 'override');
  const out = [];
  for (const x of arr(effect && effect.mods)) {
    if (x.cond || (effect.target === 'weapon')) continue;
    const r = set.find((y) => y.path === x.path);
    if (r && !out.some((s) => s.startsWith(r.name))) out.push(`${r.name.replace(/ score$/, '')} is set to ${r.value.override} by a tweak`);
  }
  return out;
}
/** "Use" for consumables and items with charges: asks "on me / on someone else" when it has an effect. */
function useControls(m, e, arg, info) {
  const u = itemUse(info, m.raw);
  if (!u) return '';
  const used = num((state.itemState[m.snap.key] || { charges: {} }).charges[e.name]);
  const left = u.charges ? u.charges.max - used : null;
  const charges = u.charges ? `<span class="chip${left ? '' : ' bad'}" title="Charges left on the current one">${left}/${u.charges.max} ${u.charges.recharges ? 'charges' : 'left'}</span>`
    + (used ? `<button class="btn sm" data-inv="charge" data-arg="${esc(arg)}" title="Regain one charge">+</button>` : '') : '';
  if (u.charges && !left) return charges;
  if (state.useMenu === arg) {
    const healOnly = (u.heals || u.hdRoll) && !u.effect && !u.hdBack;
    const missing = healOnly && m.t ? m.t.lim.hpMax - m.t.hpCurrent : null;
    const me = missing == null ? 'On me' : missing > 0 ? `On me (${missing} HP missing)` : 'On me (at full HP)';
    // Before it's used: what a "set to" tweak keeps it from changing.
    const blocked = blockedBySetTweak(m, u.effect);
    return `${charges}<span class="use-menu">${blocked.length ? `<span class="warn-text" style="font-size:12px">${esc(blocked.join('; '))}: this won't change it.</span> ` : ''}<button class="btn sm primary" data-inv="use" data-arg="${esc(arg)}|me"${missing === 0 ? ' disabled' : ''} title="${missing === 0 ? 'You are at full hit points: it would heal nothing' : 'Apply it to this character'}">${esc(me)}</button><button class="btn sm" data-inv="use" data-arg="${esc(arg)}|other" title="Use it up without applying it here">On someone else</button><button class="btn sm" data-inv="use-cancel" data-arg="${esc(arg)}">Cancel</button></span>`;
  }
  const asks = u.effect || u.heals || u.hdBack;
  return `${charges}<button class="btn sm" data-inv="${asks ? 'use-menu' : 'use'}" data-arg="${esc(arg)}${asks ? '' : '|'}" title="${esc(u.charges ? 'Use one charge' : 'Use one')}">Use</button>`;
}

function renderEquipment(m) {
  const { c, raw } = m;
  const items = (arr(c.equipment).length ? arr(c.equipment) : arr(raw.equipment)).map((e, i) => ({ ...e, index: e.index ?? i }));
  const custom = arr(raw.customEquipment).map((e, i) => ({ ...e, index: i }));
  const att = c.attunement || {};
  const editing0 = true; // inventory controls are always available
  const editing = editing0;
  const groups = {};
  for (const e of items) {
    const cat = e.equipmentCategory || (e.type ? `Enhanced: ${e.type}` : e.category) || 'Other';
    (groups[cat] = groups[cat] || []).push(e);
  }
  const catOrder = (k) => ['Weapon', 'Armor'].indexOf(k) >= 0 ? ['Weapon', 'Armor'].indexOf(k) : 2;
  // The sheet's own fields on each entry (SW5E's computed copy may leave them out).
  const own = (e, isCustom) => ({ ...e, ...Object.fromEntries(Object.entries(arr(isCustom ? raw.customEquipment : raw.equipment)[e.index] || {}).filter(([k]) => LOCAL_ITEM_KEYS.includes(k))) });
  const rows = (list0, isCustom) => list0.map((e) => own(e, isCustom)).filter((e) => !e.enhancedBy).map((e) => {
    const qty = qtyOf(e);
    const arg = `${isCustom ? 'customEquipment' : 'equipment'}|${e.index}`;
    // An enhanced weapon or armor: its base item's numbers (or the choice of one).
    const bi = !isCustom && isEnhanced(e) ? invBaseIndex(arr(raw.equipment), e.index) : -1;
    const baseE = bi >= 0 ? own(items.find((x) => x.index === bi) || { ...arr(raw.equipment)[bi], index: bi }, false) : null;
    const baseFacts = baseE ? [baseE.ac ? `AC ${baseE.ac}` : '', baseE.damageNumberOfDice && baseE.damageDieType ? damageText({ ...baseE, damageBonus: 0 }) : '', propsText(baseE.properties), baseE.weight ? `${baseE.weight} lb` : ''].filter(Boolean).join(' · ') : '';
    const enhRef = !isCustom && isEnhanced(e) ? (catalogIndex && catalogIndex.get(e.name)) : null;
    const baseLine = baseE ? `<div class="muted inv-base" style="font-size:12.5px">On a <b>${esc(baseE.name)}</b>${baseFacts ? `: ${esc(baseFacts)}` : ''} <button class="linklike" data-inv="base" data-arg="${esc(arg)}|" title="Untie it from its base item (to choose another)">change</button></div>`
      : enhRef ? baseSelect(m, enhRef, `data-inv-base="${esc(arg)}"`, '', e.index) : '';
    const editing = state.itemEdit === arg;
    const selling = state.sellMenu === arg;
    const unitCost = isCustom ? num(e.cost) : priceOf(e);
    const editBox = editing ? `<div class="inv-edit" data-ie-for="${esc(arg)}">
        ${isCustom ? `<label>Name <input data-ie="name" value="${esc(e.name)}"></label><label>Weight <input data-ie="weight" inputmode="decimal" value="${esc(e.weight ?? '')}"> lb</label><label>Cost <input data-ie="cost" inputmode="numeric" value="${esc(e.cost ?? '')}"> cr</label>
          <label class="wide">Description <textarea data-ie="description" rows="2">${esc(e.description || '')}</textarea></label>`
          : `<label>Your name for it <input data-ie="label" value="${esc(e.label || '')}" placeholder="${esc(e.name)}"></label>`}
        ${hasEnergyColor(baseE || e) ? `<label>${itemArt(baseE || e).icon === 'kyber-crystal' ? 'Crystal' : 'Blade'} colour <select data-ie="color"><option value="">${esc(`as drawn (${itemArt({ ...(baseE || e), color: '' }).glow})`)}</option>
          ${ART_COLORS.map((c) => `<option${e.color === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label>` : ''}
        <label class="wide">Note <input data-ie="notes" value="${esc(e.notes || '')}" placeholder="Where it came from, what it's for…"></label>
        <span><button class="btn sm primary" data-inv="edit-save" data-arg="${esc(arg)}">Save</button><button class="btn sm" data-inv="edit-cancel" data-arg="${esc(arg)}">Cancel</button></span></div>` : '';
    const sellBox = selling ? `<div class="inv-edit" data-sell-for="${esc(arg)}">
        <label>Sell <input data-sell="qty" type="number" min="1" max="${qty}" value="1" style="width:56px"> of ${qty}</label>
        <label>for <input data-sell="price" inputmode="numeric" value="${invSellPrice(unitCost, 1)}" style="width:80px"> cr</label>
        <span class="faint">${unitCost ? `half the standard price is ${fmtNum(invSellPrice(unitCost, 1))} cr each` : 'no standard price'}${e.paid ? `; you paid ${fmtNum(num(e.paid))} cr` : ''}</span>
        <span><button class="btn sm primary" data-inv="sell" data-arg="${esc(arg)}">Sell</button><button class="btn sm" data-inv="sell-cancel" data-arg="${esc(arg)}">Cancel</button></span></div>` : '';
    const extra = [
      e.ac ? `AC ${e.ac}` : '', e.armorClassification && e.armorClassification !== 'Unknown' ? e.armorClassification : '',
      e.stealthDisadvantage ? 'Stealth disadvantage' : '', e.strengthRequirement ? `Str ${e.strengthRequirement}` : '',
      e.damageNumberOfDice && e.damageDieType ? damageText({ ...e, damageBonus: 0 }) : '', { html: propsHtml(e.properties, e.equipmentCategory === 'Armor' ? 'armor' : 'weapon') },
      e.rarityText ? invRarityText(e) : '', e.requiresAttunement ? 'Requires attunement' : '', e.attuned ? 'Attuned' : '',
    ].filter((x) => x && (typeof x === 'string' || x.html)).map((x) => (typeof x === 'string' ? esc(x) : x.html)).join(' · ');
    const desc = e.description || e.text || '';
    const weight = num(e.weight) * qty + (baseE ? num(baseE.weight) * qtyOf(baseE) : 0);
    // Its picture: an enhanced weapon or armor looks like its base item, in its own rarity's tile.
    const baseArt = baseE ? itemArt(baseE) : null;
    const tile = itemTile(baseE ? { ...baseE, name: e.name, artIcon: baseArt.icon, artKind: baseArt.kind, rarityText: invRarity(e), color: e.color || baseE.color } : e, '', e.label || e.name, { custom: isCustom });
    const cost = num(e.cost) + (baseE ? num(baseE.cost) : 0);
    return `<tr${e.equipped ? ' class="is-equipped"' : ''}>
      <td><div class="inv-item">${tile}<div class="inv-what"><b>${esc(e.label || e.name)}</b>${e.label ? ` <span class="faint">(${esc(e.name)})</span>` : ''}${isCustom ? ' <span class="chip">custom</span>' : ''}${e.isFound === false ? ' <span class="chip warn">not in SW5E data</span>' : ''}
        ${extra ? `<div class="muted" style="font-size:12.5px">${extra}</div>` : ''}${baseLine}
        ${e.notes ? `<div class="inv-note">${esc(e.notes)}</div>` : ''}
        ${desc ? `<details class="item-desc" data-ui="desc:${esc(e.name)}"><summary>Description</summary><div class="desc" style="font-size:13px">${md(desc)}</div></details>` : ''}
        ${editBox}${sellBox}</div></div></td>
      ${editing0 ? `<td>${itemControls(m, e, isCustom ? 'customEquipment' : 'equipment', e.index)}</td>` : `<td class="num">${qty}</td>`}<td class="num">${weight ? fmtNum(weight) + ' lb' : '—'}</td>
      <td class="num">${cost ? fmtNum(cost) + ' cr' : '—'}${e.paid ? `<div class="faint" style="font-size:12px">paid ${fmtNum(num(e.paid))}</div>` : ''}</td><td class="muted">${esc(e.contentSource || '')}</td></tr>`;
  }).join('');
  const head = editing
    ? '<colgroup><col><col style="width:300px"><col style="width:80px"><col style="width:90px"><col style="width:60px"></colgroup><thead><tr><th>Item</th><th>Qty &amp; actions</th><th class="num">Weight</th><th class="num">Cost</th><th>Source</th></tr></thead>'
    : '<colgroup><col><col style="width:60px"><col style="width:90px"><col style="width:100px"><col style="width:80px"></colgroup><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Weight</th><th class="num">Cost</th><th>Source</th></tr></thead>';
  return `${editing ? renderAddItem(m) : ''}<div class="grid auto" style="margin-bottom:12px">
      ${stat('Credits', fmtNum(num(c.credits != null ? c.credits : raw.credits)) + ' cr', `<form class="credits-adj" data-credits>
        <input type="text" inputmode="numeric" placeholder="+50 / -80" title="A new amount, or +n / -n to add or subtract" aria-label="Change credits" autocomplete="off">
        <input type="text" data-credits-note placeholder="what for (optional)" aria-label="What the change is for" autocomplete="off"><button class="btn sm" type="submit">Apply</button></form>`, 'wide')}
      ${stat('Total weight', fmtNum(totalWeight(m)) + ' lb', c.carryingCapacity ? `of ${num(c.carryingCapacity.maxCapacity) * carryFactor(m).factor} lb max` : '')}
      ${(() => {
        const mods = modifiedItemsOf(m).filter((x) => x.attune);
        const max = attunementMax(m);
        const maxHtml = max == null ? '—' : bump(m, 'attunement.maximum', esc(max), { from: num(att.maximum), to: max });
        return stat('Attunement', `${attunementUsed(m)} / ${maxHtml}`, mods.length ? esc(`incl. ${mods.map((x) => `${x.item} (${x.what.toLowerCase()})`).join(', ')}`) : '');
      })()}
      ${stat('Items', items.filter((e) => !own(e, false).enhancedBy).length + custom.length)}
    </div>
    ${renderMoney(m)}
    ${Object.keys(groups).filter((g) => groups[g].some((e) => !own(e, false).enhancedBy)).sort((a, b) => catOrder(a) - catOrder(b) || a.localeCompare(b)).map((g) => `<h3>${esc(titleCase(g))} <span class="faint">(${groups[g].filter((e) => !own(e, false).enhancedBy).length})</span></h3>
      <div class="table-wrap"><table class="inv">${head}<tbody>${rows(groups[g], false)}</tbody></table></div>`).join('')}
    ${custom.length ? `<h3>Custom items <span class="faint">(${custom.length})</span></h3>
      <div class="table-wrap"><table class="inv">${head}<tbody>${rows(custom, true)}</tbody></table></div>` : ''}
    ${!items.length && !custom.length ? empty('No equipment.') : ''}`;
}

function renderPersonality(m) {
  const ch = m.raw.characteristics || {};
  const personal = ['Personality Traits', 'Ideal', 'Bond', 'Flaw'];
  const physical = ['Gender', 'Place of Birth', 'Age', 'Height', 'Weight', 'Hair', 'Eyes', 'Skin'];
  const known = new Set([...personal, ...physical, 'alignment', 'Appearance', 'Backstory']);
  const other = Object.keys(ch).filter((k) => !known.has(k) && nonEmpty(ch[k]));
  return `<div class="grid two">
      ${personal.map((k) => card({ title: k, body: nonEmpty(ch[k]) ? md(ch[k]) : '<span class="empty">—</span>', toggle: false })).join('')}
    </div>
    <h3>Details</h3>
    <dl class="kv">
      <dt>Alignment</dt><dd>${esc(ch.alignment || '—')}</dd>
      ${physical.concat(other).map((k) => `<dt>${esc(k)}</dt><dd>${nonEmpty(ch[k]) ? esc(ch[k]) : '<span class="faint">—</span>'}</dd>`).join('')}
    </dl>
    ${nonEmpty(ch.Appearance) ? `<h3>Appearance</h3><div class="prose">${md(ch.Appearance)}</div>` : ''}`;
}

function renderBackstory(m) {
  const b = m.raw.characteristics && m.raw.characteristics.Backstory;
  return nonEmpty(b) ? `<div class="prose">${md(b)}</div>` : empty('No backstory yet.');
}

function renderNotes(m) {
  return nonEmpty(m.raw.notes) ? `<div class="prose">${md(m.raw.notes)}</div>` : empty('No notes yet.');
}

/** Stats a tweak can be added to: [path (effect path, weapon@<index>.<sub> for one weapon), label]. */
function tweakTargets(m) {
  const out = [];
  // [path, label, group]: Combat first, then abilities, saves, skills, powers, maneuvers, weapons.
  const group = (p) => (/^(?:tech|force)Casting\./.test(p) ? 'Powers' : /^superiority\./.test(p) ? 'Maneuvers' : /^(?:weapon|unarmed)\./.test(p) ? 'Weapons' : 'Combat');
  for (const [p, label] of Object.entries(TWEAK_NAMES)) if (!['toHit', 'damage', 'damageDice'].includes(p) && group(p) === 'Combat') out.push([p, label, 'Combat']);
  for (const a of ABILITIES) out.push([`abilityScores.${a}.score`, `${a} score`, 'Ability scores']);
  for (const a of ABILITIES) out.push([`abilityScores.${a}.savingThrowModifier`, `${a} saving throw`, 'Saving throws']);
  for (const [skill, a] of Object.entries(FX_SKILLS).sort(([x], [y]) => x.localeCompare(y))) out.push([`abilityScores.${a}.skills.${skill}`, `${skill} (${ABBR[a]})`, 'Skills']);
  for (const [p, label] of Object.entries(TWEAK_NAMES)) if (!['toHit', 'damage', 'damageDice'].includes(p) && group(p) !== 'Combat') out.push([p, label, group(p)]);
  for (const w of ownWeapons(m.raw)) out.push([`weapon@${w.i}.toHit`, `${w.it.name}: attack`, 'Weapons'], [`weapon@${w.i}.damage`, `${w.it.name}: damage`, 'Weapons']);
  return out;
}
/** <option>s of tweak targets in <optgroup>s (typing "AC" in the closed list finds AC, the first Combat entry). */
const tweakTargetOptions = (list, selected = '') => [...new Set(list.map((x) => x[2]))].map((g) => `<optgroup label="${esc(g)}">${list.filter((x) => x[2] === g)
  .map(([p, l]) => `<option value="${esc(p)}"${selected === p ? ' selected' : ''}>${esc(l)}</option>`).join('')}</optgroup>`).join('');

/**
 * A tweak made for something the sheet now applies by itself: its reason names a feature, trait or item whose effect
 * changes the same number ("Wookiee Hide…" on AC, "Zabrak Toughness…" on HP maximum). It's left out (fxTweakTwins),
 * unless the player keeps it. { what ("Hide (Wookiee trait) and Unarmored Defense (Berserker feature)"), kept } or null.
 */
function tweakTwin(m, r) {
  // "Brawny (background feat)", "Tough (feat, Berserker ASI #1)": no parentheses inside parentheses.
  const why = (w) => String(w).replace(/^feat \((background feat)\)$/, '$1').replace(/ \((.+)\)$/, ', $1');
  const what = (t) => t.by.map((e) => `${e.name}${e.why ? ` (${why(e.why)})` : ''}`).join(' and ');
  const t = arr(m.fx.twins).find((x) => x.effect.rkey === r.rkey);
  if (t) return { what: what(t), kept: false };
  const e = m.fx.effects.find((x) => x.kind === 'tweak' && x.rkey === r.rkey && x.keep);
  const again = e && fxTweakTwins([{ ...e, keep: false }].concat(m.fx.effects.filter((x) => x.kind !== 'tweak')))[0];
  return again ? { what: what(again), kept: true } : null;
}
/** Apply an effect although another of the same name already applies (or stop applying it). */
async function stackAnyway(id) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  st.stackAnyway = { ...(st.stackAnyway || {}) };
  if (st.stackAnyway[id]) delete st.stackAnyway[id];
  else st.stackAnyway[id] = true;
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(st.stackAnyway[id] ? 'Applied as well: both count.' : 'Left out: only one of the same name counts.');
}
/** Apply a tweak although the sheet applies what it was made for (or stop applying it). */
async function keepTweak(rkey) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  st.keepTweaks = { ...(st.keepTweaks || {}) };
  if (st.keepTweaks[rkey]) delete st.keepTweaks[rkey];
  else st.keepTweaks[rkey] = true;
  await saveItemStateFor(snap.key, st);
  renderAll();
  scheduleRecompute(snap.key);
  setStatus(st.keepTweaks[rkey] ? 'The tweak is applied again, on top of what the sheet applies.' : 'The tweak is left out: the sheet applies it by itself.');
}

/** Tweaks: every manual adjustment, with its value, reason, and a way to add more. */

function renderTweaks(m) {
  const reasons = reasonsOf(m.snap.key);
  const rows = tweakRows(m.raw);
  const missing = rows.filter((r) => fxTweakActive(r.value) && !reasons[r.rkey]).length;
  const twins = rows.filter((r) => fxTweakActive(r.value) && tweakTwin(m, r) && !tweakTwin(m, r).kept).length;
  const isProf = (p) => /\.skills\.|savingThrowModifier$/.test(p);
  const num_ = (r, f, label, title) => `<label title="${esc(title)}">${label} <input data-tw="${esc(r.rkey)}" data-twf="${f}" type="number" step="1" value="${esc(r.value[f] ?? '')}"></label>`;
  // Each tweak is one of three (tweakMode): "set to" (the number is that, whatever effects would do), "bump to" (at least
  // that: the number with everything else, raised to it; the sheet's own, which sw5e.com keeps but doesn't apply), "add"
  // (a negative amount subtracts). SW5E ignores the added amount while a value is set, so a row from sw5e.com with both
  // shows what's ignored.
  const amount = (r) => {
    const mode = tweakMode(r.value);
    const n = mode === 'override' ? r.value.override : mode === 'floor' ? r.value.floor : num(r.value.bonus);
    return `<select data-tw="${esc(r.rkey)}" data-twf="mode" aria-label="Set to, bump to or add">${TWEAK_MODES.map(([v, l, t]) => `<option value="${v}" title="${esc(t)}"${mode === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <input data-tw="${esc(r.rkey)}" data-twf="amount" type="number" step="1" value="${esc(n)}" title="${esc(tweakModeHelp(mode, n))}" aria-label="Amount">${mode === 'override' && num(r.value.bonus) ? ` <span class="faint">(${esc(signedLabel(num(r.value.bonus)))} ignored while it's set)</span>` : ''}${mode === 'floor' ? ' <span class="faint" title="sw5e.com keeps it with the character but doesn\'t apply it">(this sheet only)</span>' : ''}
      ${mode !== 'bonus' || num(n) ? `<div class="faint tw-mode-help" style="font-size:12px">${esc(tweakModeHelp(mode, n))}</div>` : ''}`;
  };
  const d = state.tweakDraft || {};
  return `<div class="card no-toggle tweaks-card"><div class="card-head"><span class="title">Tweaks (manual adjustments)</span>
      <span class="meta">${rows.length}${missing ? ` · <span class="warn-text">${plural(missing, 'tweak')} without a reason</span>` : ''}${twins ? ` · <span class="warn-text">${plural(twins, 'tweak')} left out (the sheet applies ${twins > 1 ? 'them' : 'it'} by itself)</span>` : ''}</span></div>
    <p class="faint" style="font-size:12.5px;margin:6px 0 8px">From sw5e.com's editor or added here. Give each a reason (kept in this viewer and in backups); hovering or tapping a number they change shows it.</p>
    ${rows.length ? `<div class="table-wrap"><table class="tweaks"><thead><tr><th>Stat</th><th>Adjustment</th><th>Reason</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr>
      <td><b>${esc(r.name)}</b>${fxTweakActive(r.value) ? '' : ' <span class="chip">no change</span>'}${(() => {
        const tw = fxTweakActive(r.value) && tweakTwin(m, r);
        if (!tw) return '';
        const what = esc(tw.what);
        return tw.kept
          ? `<div class="warn-text tw-twin">Applied as you chose, on top of ${what}, which the sheet applies by itself: it counts twice. <button class="linklike" data-act="tweak-keep" data-arg="${esc(r.rkey)}">Leave it out</button></div>`
          : `<div class="warn-text tw-twin"><span class="chip warn">not applied</span> The sheet applies ${what} by itself now: with this tweak it would count twice, so the tweak is left out. Remove it (×), or <button class="linklike" data-act="tweak-keep" data-arg="${esc(r.rkey)}">apply it anyway</button> if it's for something else.</div>`;
      })()}</td>
      <td class="tw-vals">${isProf(r.path)
        ? `<label>Proficiency <select data-tw="${esc(r.rkey)}" data-twf="proficiency">${['', 'Proficient', 'Expertise'].map((o) => `<option value="${o}"${String(r.value.proficiency || '') === o ? ' selected' : ''}>${o || '—'}</option>`).join('')}</select></label> ${amount(r)}`
        : /damageDice$/.test(r.path) ? num_(r, 'dieSize', 'Die', 'Damage die size, e.g. 6 for d6')
          : amount(r)}</td>
      <td><input class="tw-reason${reasons[r.rkey] ? '' : ' missing'}" data-tw-reason="${esc(r.rkey)}" value="${esc(reasons[r.rkey] || '')}" placeholder="Why? e.g. species bonus, DM award…" aria-label="Reason for this tweak"></td>
      <td><button class="btn sm" data-act="tweak-remove" data-arg="${esc(r.rkey)}" title="Remove this tweak">×</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">No tweaks.</p>'}
    <div class="tw-add">
      <select data-twadd="path" aria-label="Stat to adjust"><option value="">Add a tweak to…</option>${tweakTargetOptions(tweakTargets(m), d.path)}</select>
      <select data-twadd="kind" aria-label="Kind of adjustment">${TWEAK_MODES.map(([v, l]) => [v, v === 'bonus' ? 'add (+/−)' : l]).concat([['Proficient', 'proficient'], ['Expertise', 'expertise']]).map(([v, l]) => `<option value="${v}"${(d.kind || 'bonus') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <input data-twadd="value" type="text" inputmode="numeric" placeholder="${/damageDice$/.test(d.path || '') ? 'die, e.g. d4' : 'e.g. 1'}" value="${esc(d.value ?? '')}" aria-label="Amount (a die size like d4 for a damage die)">
      <input data-twadd="reason" class="tw-reason" placeholder="Reason (recommended)" value="${esc(d.reason ?? '')}" aria-label="Reason">
      <button class="btn sm primary" data-act="tweak-add">Add</button>
    </div>
    <p id="twModeHelp" class="faint tw-mode-help" style="font-size:12px;margin:4px 0 0"${TWEAK_MODES.some((x) => x[0] === (d.kind || 'bonus')) ? '' : ' hidden'}>${esc(tweakModeHelp(d.kind || 'bonus', d.value))}</p>
    <p id="twErr" class="ed-err" hidden></p>
  </div>`;
}

function deleteDeep(obj, path) {
  const ks = path.split('.');
  const chain = [obj];
  for (const k of ks.slice(0, -1)) { const next = chain[chain.length - 1][k]; if (!next || typeof next !== 'object') return; chain.push(next); }
  delete chain[chain.length - 1][ks[ks.length - 1]];
  for (let i = chain.length - 1; i > 0; i--) if (!Object.keys(chain[i]).length) delete chain[i - 1][ks[i - 1]];
}
/** Write one tweak (value null = remove it) as an edit of tweaks or of the weapon's item. */
async function writeTweak(snap, row, value) {
  const raw = withEdits(snap.raw, editedFields(snap.key));
  if (row.where === 'tweaks') {
    const tweaks = clone(raw.tweaks || {});
    if (value) setDeep(tweaks, row.path, value);
    else deleteDeep(tweaks, row.path);
    await setEditedFields(snap, { tweaks });
  } else {
    const items = shownItems(snap, 'equipment');
    const it = items[row.index];
    if (!it) return;
    it.tweaks = clone(it.tweaks || {});
    if (value) it.tweaks[row.sub] = value;
    else delete it.tweaks[row.sub];
    if (!Object.keys(it.tweaks).length) delete it.tweaks;
    await setEditedFields(snap, { equipment: items });
  }
}
const currentTweakRow = (snap, rkey) => tweakRows(withEdits(snap.raw, editedFields(snap.key))).find((r) => r.rkey === rkey);
/** The tweak editor's modes: [value, label, what it does]. */
const TWEAK_MODES = [
  ['bonus', 'add', 'Add: adds N (a negative number subtracts) on top of everything else'],
  ['override', 'set to', 'Set to: this number is exactly N; nothing else changes it (effects such as a stim are shown as not applied)'],
  ['floor', 'bump to', 'Bump to: at least N; if everything else gives more, the higher number counts (a minimum; this sheet only)'],
];
/** The mode's explanation with the tweak's own number ("Set to: this number is exactly 16; …"). */
const tweakModeHelp = (mode, n) => {
  const t = (TWEAK_MODES.find((x) => x[0] === mode) || TWEAK_MODES[0])[2];
  return n === '' || n == null ? t : t.replace(/\bN\b/g, String(n));
};
/** A tweak's mode: 'override' (set to), 'floor' (bump to) or 'bonus' (add). */
const tweakMode = (v) => (v.override != null && v.override !== '' ? 'override' : v.floor != null && v.floor !== '' ? 'floor' : 'bonus');
/**
 * A tweak value in one mode only: "set to" and "bump to" carry SW5E's bonus 0 (and override null for "bump to": SW5E's
 * own fields, so sw5e.com sees no change from a bump), "add" no override or floor.
 */
function tweakInMode(value, mode, n) {
  const v = { ...value };
  delete v.floor;
  if (mode === 'override') return { ...v, override: n, bonus: 0 };
  if (mode === 'floor') return { ...v, override: null, bonus: 0, floor: n };
  return { ...v, override: null, bonus: n };
}
async function updateTweak(rkey, field, val) {
  const snap = state.snapshots[state.current];
  const row = snap && currentTweakRow(snap, rkey);
  if (!row) return;
  let value = { ...row.value };
  const mode = tweakMode(value);
  const typed = String(val).trim().replace(/^[−–]/, '-');
  if (field === 'proficiency') { if (val) value.proficiency = val; else delete value.proficiency; }
  else if (field === 'mode') {
    // The same number in the other mode: "set to 16" becomes "bump to 16" or "add 16" (and back).
    const n = mode === 'override' ? num(value.override) : mode === 'floor' ? num(value.floor) : num(value.bonus);
    value = tweakInMode(value, val, n);
  } else if (field === 'amount') {
    if (typed !== '' && !Number.isFinite(Number(typed))) return setStatus('Enter a whole number (a negative one subtracts).', 'error');
    if (mode === 'override') value.override = typed === '' ? null : Math.trunc(Number(typed));
    else if (mode === 'floor') { if (typed === '') delete value.floor; else value.floor = Math.trunc(Number(typed)); }
    else value.bonus = typed === '' ? 0 : Math.trunc(Number(typed));
  } else if (typed === '') value[field] = field === 'bonus' ? 0 : null;
  else if (!Number.isFinite(Number(typed))) return setStatus('Enter a whole number.', 'error');
  else value[field] = Math.trunc(Number(typed));
  await writeTweak(snap, row, value);
  setStatus(`${row.name}: ${fxTweakValueText(value)}. Not synced to SW5E yet.`);
}
async function setTweakReason(rkey, text) {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const st = itemStateOf(snap.key);
  st.reasons = { ...(st.reasons || {}) };
  if (String(text).trim()) st.reasons[rkey] = String(text).trim();
  else delete st.reasons[rkey];
  await saveItemStateFor(snap.key, st);
  renderAll();
}
async function removeTweak(rkey) {
  const snap = state.snapshots[state.current];
  const row = snap && currentTweakRow(snap, rkey);
  if (!row) return;
  await writeTweak(snap, row, null);
  const st = itemStateOf(snap.key);
  if (st.reasons && st.reasons[rkey]) {
    delete st.reasons[rkey];
    await saveItemStateFor(snap.key, st);
  }
  setStatus(`Removed the ${row.name} tweak. Not synced to SW5E yet.`);
}
async function addTweak() {
  const snap = state.snapshots[state.current];
  const d = state.tweakDraft || {};
  const fail = (msg) => { const el = $('#twErr'); if (el) { el.textContent = msg; el.hidden = false; } };
  if (!snap) return;
  if (!d.path) return fail('Choose the stat to adjust.');
  const kind = d.kind || 'bonus';
  const prof = kind === 'Proficient' || kind === 'Expertise';
  if (prof && !/\.skills\.|savingThrowModifier$/.test(d.path)) return fail('Proficiency only applies to skills and saving throws.');
  const die = /damageDice$/.test(d.path);
  const dieSize = die ? Number((/^\s*(?:\d*\s*d)?\s*(\d+)\s*$/i.exec(String(d.value ?? '')) || [])[1]) : 0;
  if (die && ![4, 6, 8, 10, 12, 20].includes(dieSize)) return fail('Enter a die size: d4, d6, d8, d10 or d12.');
  const n = Math.trunc(Number(String(d.value ?? '').replace(/^[−–]/, '-')));
  if (!prof && !die && (String(d.value ?? '').trim() === '' || !Number.isFinite(n))) return fail('Enter an amount (a whole number, e.g. 1 or -1).');
  const raw = withEdits(snap.raw, editedFields(snap.key));
  const w = /^weapon@(\d+)\.(\w+)$/.exec(d.path);
  const row = w
    ? { where: 'equipment', index: Number(w[1]), sub: w[2], rkey: weaponTweakKey(arr(raw.equipment), Number(w[1]), w[2]) }
    : { where: 'tweaks', path: d.path, rkey: d.path };
  const cur = (w ? getPath((arr(raw.equipment)[w[1]] || {}).tweaks, w[2]) : getPath(raw.tweaks, d.path)) || {};
  // One mode at a time (SW5E ignores the added amount while a value is set): adding to an "add" tweak adds to it; a
  // "set to" or "bump to" replaces what's there.
  const value = die ? { ...cur, dieSize } : prof ? { ...cur, proficiency: kind }
    : kind === 'bonus' && tweakMode(cur) === 'bonus' ? tweakInMode(cur, 'bonus', num(cur.bonus) + n) : tweakInMode(cur, kind, n);
  if (String(d.reason || '').trim()) {
    const st = itemStateOf(snap.key);
    st.reasons = { ...(st.reasons || {}), [row.rkey]: String(d.reason).trim() };
    await saveItemStateFor(snap.key, st);
  }
  state.tweakDraft = {};
  await writeTweak(snap, row, value);
  setStatus(`Added a tweak: ${fxTweakName(w ? `weapon.${w[2]}` : d.path)} ${fxTweakValueText(value)}. Not synced to SW5E yet.`);
}

function renderData(m) {
  const { raw, snap } = m;
  const settings = raw.settings || {};
  return `${renderTweaks(m)}<div class="grid two">
      <div class="card no-toggle"><div class="card-head"><span class="title">Builder settings</span></div>
        <dl class="kv" style="margin-top:6px">${Object.entries(settings).map(([k, v]) => `<dt>${esc(titleCase(k))}</dt><dd>${esc(v)}</dd>`).join('') || '<dd class="empty">None</dd>'}</dl></div>
      <div class="card no-toggle"><div class="card-head"><span class="title">Record</span></div>
        <dl class="kv" style="margin-top:6px">
          <dt>Source</dt><dd>${snap.source === 'sw5e' ? 'sw5e.com' : snap.source === 'created' ? 'Created here' : 'Imported file'}</dd>
          <dt>Loaded</dt><dd>${esc(new Date(snap.loadedAt).toLocaleString())}</dd>
          ${raw.changedAt ? `<dt>Last changed on SW5E</dt><dd>${esc(new Date(raw.changedAt).toLocaleString())}</dd>` : ''}
          ${raw.createdAt ? `<dt>Created</dt><dd>${esc(new Date(raw.createdAt).toLocaleString())}</dd>` : ''}
          <dt>Builder version</dt><dd>${esc(raw.builderVersion || '—')}</dd>
          <dt>Validation</dt><dd>${esc((snap.validation && snap.validation.message) || '—')}</dd>
          ${raw.id ? `<dt>Character id</dt><dd><a href="https://sw5e.com/tools/mycharacters/${esc(encodeURIComponent(raw.id))}" target="_blank" rel="noopener">${esc(raw.id)} ↗</a></dd>` : ''}
        </dl></div>
      ${renderHistoryCard(m)}
      ${renderEngineCard(m)}
    </div>
    <details style="margin-top:12px"><summary>Raw SW5E character JSON</summary><pre class="json">${esc(JSON.stringify(raw, null, 2))}</pre></details>
    <details style="margin-top:8px"><summary>Computed character JSON (${engineCtx() ? "the sheet's rules engine" : "from SW5E's rules engine"})</summary><pre class="json">${esc(JSON.stringify(m.c, null, 2))}</pre></details>`;
}

/** Where the numbers come from, and how the sheet's engine compared with sw5e.com's calculation of this character. */
function renderEngineCard(m) {
  const ck = m.snap.engineCheck;
  const when = ck ? new Date(ck.at).toLocaleString() : '';
  let body;
  if (!engineCtx()) body = `<p>${state.rulesError ? `SW5E’s rules and item data didn’t load (${esc(state.rulesError)}), so ${canReachSw5e() ? 'sw5e.com computes the numbers' : 'the numbers are the ones kept with the character'}. <button class="linklike" data-act="rules-load">Try again</button>` : 'Loading SW5E’s rules and item data…'}</p>`;
  else if (!ck) body = `<p>The sheet computes the numbers itself, with SW5E's rules. ${m.raw.id ? '<b>Check with sw5e.com</b> compares them with sw5e.com’s own calculation of this character (it also happens on each Load from SW5E).' : 'A character on sw5e.com is checked against its calculation there on each Load.'}</p>`;
  else if (!ck.differences.length) body = `<p>The sheet computes the numbers itself, with SW5E's rules. sw5e.com's own calculation (${esc(when)}) gave the same: <b>all ${ck.compared} numbers</b>.</p>`;
  else {
    const n = ck.differences.length + (ck.more || 0);
    body = `<p class="warn-text">sw5e.com's own calculation (${esc(when)}) differs on ${esc(plural(n, 'number'))}. The sheet shows its own; please report this (Copy the details).</p>
      <ul class="engine-diffs">${ck.differences.map((d) => `<li><code>${esc(d.path)}</code>: sw5e.com ${esc(d.sw5e)}, the sheet ${esc(d.engine)}</li>`).join('')}${ck.more ? `<li>… ${ck.more} more</li>` : ''}</ul>
      <button class="btn sm" data-act="engine-copy">Copy the details</button>`;
  }
  const data = state.rules ? `<p class="faint">SW5E's rules and item data: version ${esc(state.rules.dataVersion)}, ${state.rulesInfo ? 'fetched from SW5E’s data service' : 'as it comes with the sheet'}.
    SW5E is the work of Galiphile and the SW5E contributors: <a href="rules.html#credits" target="_blank" rel="noopener">credits</a>
    · <a href="rules.html" target="_blank" rel="noopener">the books</a>.</p>` : '';
  return `<div class="card no-toggle"><div class="card-head"><span class="title">Rules engine</span></div>${body}${data}
    ${engineCtx() ? `<p class="needs-sw5e"><button class="btn sm" data-act="recompute" title="Ask sw5e.com for its calculation of this character and compare">Check with sw5e.com</button></p>` : ''}</div>`;
}

function renderHistoryCard(m) {
  const key = m.snap.key;
  const list = arr(state.history[key]).slice().reverse();
  const when = (at) => {
    if (!at) return 'never';
    const day = (x) => { const d = new Date(x); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }; // calendar days
    const days = Math.round((day(Date.now()) - day(at)) / 86400000);
    return `${days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}, ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  const mine = (state.charBackups || {})[key] || null;
  const newest = Math.max(num(mine), num(state.lastBackup)) || null;
  const old = !newest || Date.now() - newest > 14 * 86400000;
  const cur = withEdits(m.snap.raw, editedFields(key));
  return `<div class="card no-toggle"><div class="card-head"><span class="title">Local version history</span><span class="meta">${list.length} / ${HISTORY_LIMIT}</span></div>
    <p class="faint" style="font-size:12px;margin:6px 0">SW5E can lose saved characters, so every version seen here is kept in this browser. Compare a version with the
      character as it is now, or restore it (Undo puts it back).</p>
    <p class="faint backup-line" style="font-size:12px;margin:6px 0">Backups (files you keep): this character <b class="${old ? 'warn-text' : ''}">${esc(when(mine))}</b>
      · <button class="linklike" data-act="export-character">Back up this character</button><br>
      all characters <b>${esc(when(state.lastBackup))}</b>${state.lastBackup && state.lastBackupCount ? ` (${plural(state.lastBackupCount, 'character')})` : ''}
      · <button class="linklike" data-act="export-backup">Back up all characters</button></p>
    <ul class="history">${list.map((h, i) => {
      const arg = `${key}|${h.at}`;
      const same = canonical(versionFields(h.raw)) === canonical(versionFields(cur));
      const diff = state.versionCompare === arg ? versionDiff(cur, h.raw) : null;
      return `<li><span>${esc(new Date(h.at).toLocaleString())}${i === 0 ? ' <span class="chip accent">latest</span>' : ''}${same ? ' <span class="chip good">as now</span>' : ''}<br>
      <span class="faint">${esc(h.reason)}${h.changedAt ? ` · changed on SW5E ${esc(new Date(h.changedAt).toLocaleString())}` : ''}</span></span>
      <span class="hist-btns">${same ? '' : `<button class="btn sm${diff ? ' on' : ''}" data-act="version-compare" data-arg="${esc(arg)}" aria-expanded="${!!diff}" title="What's different from the character now">Compare</button>
        <button class="btn sm" data-act="version-restore" data-arg="${esc(arg)}" title="Make the character this version again (play state stays; Undo puts it back)">Restore</button>`}
      <button class="btn sm" data-act="export-version" data-arg="${esc(arg)}" title="Download this version as a SW5E character file">Export</button></span>
      ${diff ? `<div class="hist-diff">${diff.length ? `<div class="faint">This version → now:</div><ul>${diff.map((d) => `<li><b>${esc(d.label)}</b>: ${esc(d.text)}</li>`).join('')}</ul>` : '<div class="faint">No difference in the character\'s data.</div>'}</div>` : ''}</li>`;
    }).join('') || '<li class="empty">No versions recorded yet.</li>'}</ul></div>`;
}

// ------------------------------------------------------------- versions: compare and restore (W-137)
/** The fields a version restores (play state stays as it is). */
const VERSION_FIELDS = () => [...ITEM_FIELDS, ...OBJECT_FIELDS, ...LIST_FIELDS, 'credits', 'experiencePoints', 'notes', 'name', 'image', 'characteristics'];
const versionFields = (raw) => Object.fromEntries(VERSION_FIELDS().map((p) => [p, raw[p] === undefined ? null : raw[p]]));
/** What differs between a version (`old`) and the character now (`cur`): [{ label, text }]. */
function versionDiff(cur, old) {
  const out = [];
  const short = (v) => { const s = String(v == null || v === '' ? '—' : v).replace(/\s+/g, ' '); return s.length > 60 ? `${s.slice(0, 57)}…` : s; };
  const names = (list) => arr(list).map((it) => `${qtyOf(it) > 1 ? `${qtyOf(it)}× ` : ''}${it.label || it.name}`);
  for (const p of VERSION_FIELDS()) {
    const a = old[p];
    const b = cur[p];
    if (canonical(a ?? null) === canonical(b ?? null)) continue;
    if (p === 'classes') {
      const sum = (l) => arr(l).map((k) => `${k.name} ${k.levels}${k.archetype && k.archetype.name ? ` (${k.archetype.name})` : ''}`).join(' / ') || '—';
      out.push({ label: fieldLabel(p), text: sum(a) === sum(b) ? 'choices differ (skills, powers, options…)' : `${sum(a)} → ${sum(b)}` });
    } else if (ITEM_FIELDS.includes(p)) {
      const was = names(a);
      const now = names(b);
      const gone = was.filter((x) => !now.includes(x));
      const added = now.filter((x) => !was.includes(x));
      out.push({ label: fieldLabel(p), text: [added.length ? `added ${added.join(', ')}` : '', gone.length ? `removed ${gone.join(', ')}` : ''].filter(Boolean).join('; ') || 'equipped, attuned or other details differ' });
    } else if (p === 'characteristics') {
      for (const c of new Set(Object.keys(a || {}).concat(Object.keys(b || {})))) {
        if (canonical((a || {})[c] ?? null) !== canonical((b || {})[c] ?? null)) out.push({ label: titleCase(c), text: `${short((a || {})[c])} → ${short((b || {})[c])}` });
      }
    } else if (typeof (a ?? b) !== 'object') out.push({ label: fieldLabel(p), text: `${short(a)} → ${short(b)}` });
    else if (!Array.isArray(a ?? b)) {
      // An object (feature notes, choices, tweaks…): which of its entries changed.
      const keys = [...new Set(Object.keys(a || {}).concat(Object.keys(b || {})))].filter((k) => canonical((a || {})[k] ?? null) !== canonical((b || {})[k] ?? null));
      out.push({ label: fieldLabel(p), text: keys.length ? `changed: ${short(keys.join(', '))}` : 'differs' });
    } else out.push({ label: fieldLabel(p), text: a == null ? 'added' : b == null ? 'removed' : `${arr(a).length} → ${arr(b).length} entries` });
  }
  return out;
}
/** Make the character a version from its history again: its fields become local changes (Sync sends them). */
async function restoreVersion(arg) {
  const [key, at] = String(arg).split('|');
  const snap = state.snapshots[key];
  const v = arr(state.history[key]).find((h) => String(h.at) === at);
  if (!snap || !v) return;
  const cur = withEdits(snap.raw, editedFields(key));
  const empty = (x) => (Array.isArray(x) ? [] : x && typeof x === 'object' ? {} : typeof x === 'number' ? 0 : '');
  const fields = {};
  for (const p of VERSION_FIELDS()) {
    if (p === 'characteristics') {
      for (const c of new Set(Object.keys(v.raw.characteristics || {}).concat(Object.keys(cur.characteristics || {})))) {
        const want = (v.raw.characteristics || {})[c];
        if (canonical(want ?? null) !== canonical((cur.characteristics || {})[c] ?? null)) fields[`characteristics.${c}`] = want ?? '';
      }
      continue;
    }
    if (canonical(v.raw[p] ?? null) === canonical(cur[p] ?? null)) continue;
    fields[p] = v.raw[p] === undefined ? empty(cur[p]) : clone(v.raw[p]);
  }
  const when = new Date(v.at).toLocaleString();
  if (!Object.keys(fields).length) return setStatus(`The character is already as it was on ${when}.`);
  const undo = rememberForUndo(key, `restored the version of ${when}`, true);
  await setEditedFields(snap, fields);
  recordHistory(key, withEdits(snap.raw, editedFields(key)), `Restored the version of ${when}`);
  await saveStore();
  state.versionCompare = null;
  scheduleRecompute(key);
  renderAll({ keepTyping: true });
  setStatus(`Restored the version of ${when} (${Object.keys(fields).map((p) => fieldLabel(p.replace(/^characteristics\..*/, 'characteristics'))).filter((x, i, l) => l.indexOf(x) === i).join(', ')}). Play state is unchanged; Sync to SW5E sends it there.`, '', false, undo);
}

// ------------------------------------------------------------- sidebar
function renderSideSummary(m) {
  const { c, raw, t } = m;
  const sc = c.abilityScores || {};
  const res = [];
  if (t) {
    const { s, lim } = t;
    if (lim.force) res.push(chip(`FP ${lim.force - num(s.forcePointsUsed)}/${lim.force}`, 'light'));
    if (lim.tech) res.push(chip(`TP ${lim.tech - num(s.techPointsUsed)}/${lim.tech}`, 'blue'));
    if (lim.supMax) res.push(chip(`SD ${lim.supMax - num(s.superiorityDiceUsed)}/${lim.supMax}${lim.supSize || ''}`, 'accent'));
    for (const d of lim.hitDice) res.push(chip(`HD ${t.hdLeft(d.size)}/${d.maximum}${d.size}`));
    if (s.hasInspiration) res.push(chip('Inspired', 'good'));
    for (const c of arr(s.conditions)) res.push(`<a class="chip bad" href="#sec-combat" title="Condition: see Combat & Vitals">${esc(c)}</a>`);
    for (const e of tempEffects(m.snap.key)) res.push(`<a class="chip good" href="#effects" title="Active${e.duration ? `, lasts ${esc(e.duration)}` : ''}: go to Effects (End it there)">${esc(e.name)}</a>`);
    if (num(s.exhaustion)) res.push(chip(`Exhaustion ${num(s.exhaustion)}`, 'warn'));
    if (num(s.deathSaves.successes) || num(s.deathSaves.failures)) res.push(chip(`Death saves ${num(s.deathSaves.successes)}✓ ${num(s.deathSaves.failures)}✗`, 'bad'));
  }
  const temp = t ? num(t.s.temporaryHitPoints) : 0;
  return `<div class="side-name">${esc(raw.name || 'Unnamed')}</div>
      <div class="side-sub">${esc([c.species, c.classText].filter(Boolean).join(' · '))}</div>
      ${m.has ? `<div class="mini-stats">
        <div class="mini-stat"><b>${bump(m, 'armorClass', esc(c.armorClass))}</b><span>AC</span></div>
        <div class="mini-stat"><b>${t.hpCurrent}/${hpMaxHtml(m, t)}${temp ? `<small>+${temp}</small>` : ''}</b><span>HP</span></div>
        <div class="mini-stat"><b>${rollable('init', bump(m, 'initiative', signed(c.initiative)), 'Roll initiative')}</b><span>Init</span></div>
        <div class="mini-stat"><b>${bump(m, 'speed.base', esc(String((c.speed || {}).base || '—').replace(/\s*ft\.?/, '')))}</b><span>Speed ft</span></div>
        <div class="mini-stat"><b>${signed(c.proficiencyBonus)}</b><span>Prof</span></div>
        <div class="mini-stat"><b>${bump(m, 'passivePerception', esc(c.passivePerception))}</b><span>Passive</span></div>
      </div>
      <div class="mini-abil">${ABILITIES.map((a) => `<div title="${a} ${esc((sc[a] || {}).value)}"><span>${ABBR[a]}</span><b>${rollable(`check|${a}`, bump(m, `abilityScores.${a}.modifier`, signed((sc[a] || {}).modifier)), `Roll a ${a} check`)}</b></div>`).join('')}</div>
      ${res.length ? `<div class="mini-res">${res.join('')}</div>` : ''}` : ''}`;
}

/**
 * HP and AC for the pinned strip on narrow screens, and what's active (Rage, a form, concentration, a stim…):
 * states first, then concentration; it links to Effects, where they end.
 */
function renderMiniVitals(m) {
  if (!m.t) return '';
  const temp = num(m.t.s.temporaryHitPoints);
  const rank = (e) => (e.source === 'feature' ? 0 : e.group === 'concentration' ? 1 : 2);
  const act = tempEffects(m.snap.key).sort((a, b) => rank(a) - rank(b));
  const conc = (e) => e.group === 'concentration' && e.name.replace(/ \(concentration\)$/, '');
  const tip = act.length ? `Active: ${act.map((e) => (conc(e) ? `concentrating on ${conc(e)}` : e.name) + (e.duration ? ` (${e.duration})` : '')).join('; ')}. Go to Effects` : '';
  const conds = arr(m.t.s.conditions);
  return `<a class="mv-hp" href="#sec-combat" title="Combat & Vitals"><span class="${m.t.hpCurrent ? '' : 'dying'}" aria-label="Hit points">♥ <b>${m.t.hpCurrent}</b><span class="hpmax"${m.t.lim.hpHalved ? ' title="Halved by exhaustion"' : ''}>/${m.t.lim.hpMax}</span>${temp ? `<span class="faint">+${temp}</span>` : ''}${m.t.s.hasInspiration ? ' <span class="insp" title="Inspired" aria-label="Inspired">★</span>' : ''}</span> <span class="ac" aria-label="Armor class"><span class="faint">AC</span> <b>${esc(m.c.armorClass)}</b></span></a>`
    + (conds.length ? `<a class="mstate cond" href="#sec-combat" title="${esc(`Conditions: ${conds.join(', ')}`)}" aria-label="${esc(`Conditions: ${conds.join(', ')}`)}">${esc(conds[0])}${conds.length + act.length > 1 ? `<small> +${conds.length + act.length - 1}</small>` : ''}</a>`
      : act.length ? `<a class="mstate" href="#effects" title="${esc(tip)}" aria-label="${esc(tip)}">${esc(conc(act[0]) ? `◎ ${conc(act[0])}` : act[0].name)}${act.length > 1 ? `<small> +${act.length - 1}</small>` : ''}</a>` : '');
}

function renderSidebar(m, sections) {
  return `${live('side', m, 'div', 'side-card side-summary')}
    <div class="side-card side-nav${state.searching ? ' searching' : ''}">
      <select class="mbar-only mbar-btn sec-jump" data-jump aria-label="Go to a section, or more actions">
        <option value="" selected>☰</option>
        ${sectionGroups(sections).map(([g, list]) => `<optgroup label="${esc(SECTION_GROUPS[g] || 'Sections')}">${list.map((s) => `<option value="sec:sec-${s.id}">${esc(s.title)}</option>`).join('')}</optgroup>`).join('')}
        <optgroup label="More">${[['load', 'Load from SW5E'], ['import', 'Import file…'], ['cr-new', 'New character…'],
          ...(document.documentElement.dataset.server === 'on' ? [['account', 'Account']] : []), ['messages', 'Recent messages'], ['guide', 'First session guide'], ['export-character', 'Back up this character'], ['export-backup', 'Back up all characters'], ['toggle-compact', 'Compact cards on/off'], ['theme', 'Switch light / dark'], ['themes', 'Theme…']]
          .map(([a, t]) => `<option value="act:${a}">${esc(t)}</option>`).join('')}</optgroup>
      </select>
      ${m.t ? live('mvitals', m, 'span', 'mvitals mbar-only') : ''}
      <input id="filterBox" class="filter-box" type="search" placeholder="Filter cards & rows…  ( / )" autocomplete="off" aria-label="Filter the sheet" value="${esc(state.filter || '')}">
      <ul class="nav" aria-label="Sections">${sectionGroups(sections).map(([g, list]) => `<li class="nav-group" aria-hidden="true">${esc(SECTION_GROUPS[g] || '')}</li>${list.map((s) => {
        const n = s.count ? s.count(m) : null;
        const k = shortcutName(s.key);
        return `<li><a href="#sec-${s.id}" data-sec="sec-${s.id}" title="${esc(s.title)}${k ? ` (${k})` : ''}"${k ? ` aria-keyshortcuts="Shift+${esc(k.replace(/^Shift \+ /, ''))}"` : ''}><span class="nav-ico">${uiIcon(s.id)}</span><span class="nav-full">${esc(s.title)}</span>${s.short ? `<span class="nav-short">${esc(s.short)}</span>` : ''}${n != null ? `<span class="count">${n}</span>` : ''}${k ? `<kbd class="nav-key" aria-hidden="true">${esc(k.replace(/^Shift \+ /, ''))}</kbd>` : ''}</a></li>`;
      }).join('')}`).join('')}</ul>
      <div class="side-tools">
        <button class="btn" data-act="expand-all" title="Open every card">${uiIcon('expand')}Expand all</button>
        <button class="btn" data-act="collapse-all" title="Close every card">${uiIcon('collapse')}Collapse all</button>
        <button class="btn" data-act="top" title="Back to the top">${uiIcon('up')}Top</button>
      </div>
      <div class="side-look" role="group" aria-label="Look and keys">
        <button class="btn theme-btn" data-act="theme" title="Switch light / dark"><span class="when-dark">${uiIcon('sun')}Light</span><span class="when-light">${uiIcon('moon')}Dark</span></button>
        <button class="btn" data-act="themes" title="Theme: light or dark, a style (standard or one per class) and screen effects">${uiIcon('palette')}Style</button>
        <button class="btn keys-btn" data-act="shortcuts" title="Keyboard shortcuts (?)" aria-keyshortcuts="?">${uiIcon('keyboard')}Keys</button>
      </div>
      <button class="btn mbar-only mbar-btn" data-act="explain" aria-pressed="${document.documentElement.dataset.explain === 'on'}" aria-label="Explain mode: tap anything to see what it is" title="Explain mode: tap anything to see what it is and why">ⓘ</button>
      <button class="btn mbar-only mbar-btn" data-act="search-toggle" aria-pressed="${!!state.searching}" aria-label="Filter the sheet" title="${state.searching ? 'Close the filter' : 'Filter the sheet'}">${state.searching ? '✕' : '🔍'}</button>
    </div>`;
}
/** The sections in their groups, in order: [[group, [section…]]…]. */
function sectionGroups(sections) {
  const out = [];
  for (const s of sections) {
    const last = out[out.length - 1];
    if (last && last[0] === (s.group || '')) last[1].push(s);
    else out.push([s.group || '', [s]]);
  }
  return out;
}
/** A shortcut's name as shown: "Shift + 1", "Shift + Q" (from KeyboardEvent.code, so any layout works). */
const shortcutName = (code) => (code ? `Shift + ${code.replace(/^(Digit|Key)/, '')}` : '');

// ------------------------------------------------------------- behaviours
const portraitHidden = () => { try { return localStorage.getItem('portrait') === 'hidden'; } catch (e) { return false; } };
/** The picture uploaded for a character on this device, or null. */
const portraitOf = (key) => {
  const p = key && state.portraits && state.portraits[key];
  return p && typeof p.data === 'string' && /^data:image\//.test(p.data) ? p : null;
};
const PORTRAIT_MAX = 720; // longest side in pixels: sharp at twice the size the overview shows it
/** Open the device's file picker for a character's picture. */
function pickPortrait(key) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
  input.addEventListener('change', () => { if (input.files && input.files[0]) uploadPortrait(key, input.files[0]); }, { once: true });
  input.click();
}
/**
 * Keep a picture file as a character's portrait: drawn again at most PORTRAIT_MAX pixels on its longest side and
 * saved as WebP (JPEG where the browser can't make WebP; PNG when small, which keeps transparency), so a phone photo of
 * several megabytes becomes about 50–150 KB in this browser's storage.
 */
async function uploadPortrait(key, file) {
  if (!/^image\//.test(file.type || '')) return setStatus(`${file.name} isn't a picture.`, 'error');
  if (file.size > 40e6) return setStatus(`${file.name} is too big (over 40 MB).`, 'error');
  setStatus('Preparing the picture…');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('the browser could not open it as a picture'));
      el.src = url;
    });
    const w0 = img.naturalWidth || PORTRAIT_MAX, h0 = img.naturalHeight || PORTRAIT_MAX;
    const scale = Math.min(1, PORTRAIT_MAX / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
    const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const g = canvas.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    let data = canvas.toDataURL('image/webp', 0.86);
    if (!/^data:image\/webp/.test(data)) {
      const png = canvas.toDataURL('image/png');
      data = png.length < 300e3 ? png : canvas.toDataURL('image/jpeg', 0.86);
    }
    state.portraits[key] = { data, w, h, name: file.name, at: Date.now() };
    await savePortraits();
    try { localStorage.setItem('portrait', 'shown'); } catch (e) { /* ignore */ }
    if (state.current === key) renderAll({ keepTyping: true });
    setStatus(`Picture saved in this browser (${w}×${h}, ${Math.round(data.length * 0.75 / 1024)} KB). It stays here: Sync to SW5E doesn't send it; backups keep it.`);
  } catch (e) {
    setStatus(`Could not use ${file.name}: ${e.message}`, 'error');
  } finally {
    URL.revokeObjectURL(url);
  }
  return undefined;
}
function wireImages(root) {
  root.querySelectorAll('img[data-src]').forEach((img) => {
    img.addEventListener('error', () => {
      // The character's own picture that doesn't load: say why it may be, and how to fix it.
      if (img.dataset.mine && img.parentElement) {
        img.parentElement.classList.add('broken');
        img.replaceWith(Object.assign(document.createElement('div'), {
          className: 'portrait-msg',
          innerHTML: 'This link doesn\'t open as a picture (it may be a page showing it). <button class="btn sm" data-act="edit-image">Change it</button>',
        }));
        return;
      }
      // A picture that doesn't load: leave its box out.
      const p = img.parentElement;
      const hero = p && p.classList.contains('portrait') && p.parentElement;
      if (hero && hero.classList.contains('hero')) { p.remove(); hero.classList.add('no-portrait'); } else img.remove();
    }, { once: true });
    img.src = img.dataset.src;
  });
}

/**
 * The section being read: the one crossing a line a quarter of the way down the window (under what's pinned), or the
 * one just jumped to (a short last section may never reach the line). Its link is highlighted; on phones the strip
 * brings it into view, but not while you're touching or swiping the strip.
 */
function setupScrollSpy() {
  if (state.observer) { state.observer.disconnect(); state.observer = null; }
  updateActiveSection();
}
function updateActiveSection() {
  const secs = [...document.querySelectorAll('#sheet .section')].filter((s) => s.offsetHeight && !s.classList.contains('hidden-by-filter'));
  if (!secs.length) return;
  const top = pinnedBottom();
  const line = top + Math.max(40, (window.innerHeight - top) * 0.25);
  const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  let cur = secs.find((s) => { const r = s.getBoundingClientRect(); return r.top <= line && r.bottom > line; })
    || secs.filter((s) => s.getBoundingClientRect().top <= line).pop() || secs[0];
  const jump = state.jumpTo && Date.now() - state.jumpTo.at < 2500 && document.getElementById(state.jumpTo.id);
  if (jump) cur = jump;
  else if (atEnd) cur = secs.filter((s) => s.getBoundingClientRect().top < window.innerHeight - 40).pop() || cur;
  document.querySelectorAll('.nav a').forEach((a) => {
    const on = a.dataset.sec === cur.id;
    if (on === a.classList.contains('active')) return;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    const strip = a.closest('.nav');
    if (on && strip && strip.scrollWidth > strip.clientWidth + 1 && Date.now() - num(state.stripTouchAt) > 2000) {
      const left = a.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
      state.stripAutoAt = Date.now();
      strip.scrollLeft = left - (strip.clientWidth - a.offsetWidth) / 2;
    }
  });
}
/** Go to a section at once (no smooth scroll: a click right after lands where it's aimed). */
function jumpToSection(id) {
  const sec = document.getElementById(id);
  if (!sec) return;
  state.jumpTo = { id, at: Date.now() };
  sec.scrollIntoView({ block: 'start', behavior: 'instant' });
  try { history.replaceState(null, '', '#' + id); } catch (e) { /* file: URLs */ }
  updateActiveSection();
}

// The filter hides cards, rows and boxes that don't contain the text, opens the cards that do (their text
// may be what matched), and hides sections with nothing left.
const FILTER_UNITS = '.card, tbody tr, .ability, dl.kv > dt, .stat, .trk-row, .eff, .cls-pick, .defs-row';
/** The text of `root` that the filter left visible (headings, prose and the units that matched). */
function visibleText(root) {
  let out = '';
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('.hidden-by-filter, select, [hidden], pre.json') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  while (w.nextNode()) out += w.currentNode.nodeValue;
  return out.toLowerCase();
}
function applyFilter(q, opts = {}) {
  const query = String(q || '').trim().toLowerCase();
  const sheet = $('#sheet');
  // Keep a match that's on screen where it is (closing the filter leaves you at what you found).
  const top = opts.keepPlace ? pinnedBottom() : 0;
  const hit = opts.keepPlace ? [...sheet.querySelectorAll('.filter-hit, .cls-pick[open]')].find((el) => { const r = el.getBoundingClientRect(); return r.height && r.bottom > top && r.top < window.innerHeight; }) : null;
  const anchor = opts.keepPlace ? anchorFor(hit || null) : null;
  sheet.querySelectorAll('.hidden-by-filter').forEach((el) => el.classList.remove('hidden-by-filter'));
  sheet.querySelectorAll('.filter-hit').forEach((el) => el.classList.remove('filter-hit'));
  document.querySelectorAll('.nav a').forEach((a) => { a.style.opacity = ''; a.parentElement.hidden = false; });
  const box = $('#filterBox');
  if (box) box.classList.toggle('no-hits', false);
  if (!query) { restoreAnchor(anchor); return; }
  let hits = 0;
  sheet.querySelectorAll(FILTER_UNITS).forEach((el) => {
    const text = el.tagName === 'DT' ? el.textContent + ' ' + (el.nextElementSibling ? el.nextElementSibling.textContent : '') : el.textContent;
    if (text.toLowerCase().includes(query)) {
      if (el.classList.contains('card')) { el.classList.add('filter-hit'); hits++; }
      if (el.tagName === 'DETAILS' || el.classList.contains('cls-pick')) el.open = true;
      return;
    }
    el.classList.add('hidden-by-filter');
    if (el.tagName === 'DT' && el.nextElementSibling) el.nextElementSibling.classList.add('hidden-by-filter');
  });
  // A group whose rows or cards are all hidden goes too, heading included ("Weapon (2)" with no matching weapon).
  sheet.querySelectorAll('.section h3').forEach((h) => {
    const body = h.nextElementSibling;
    if (!body || h.textContent.toLowerCase().includes(query)) return;
    const units = body.matches(FILTER_UNITS) ? [body] : [...body.querySelectorAll(FILTER_UNITS)];
    if (units.length && units.every((u) => u.classList.contains('hidden-by-filter'))) { h.classList.add('hidden-by-filter'); body.classList.add('hidden-by-filter'); }
  });
  sheet.querySelectorAll('.section').forEach((sec) => {
    const any = sec.dataset.title.toLowerCase().includes(query) || visibleText(sec).includes(query);
    if (!any) sec.classList.add('hidden-by-filter');
    else hits++;
    const link = document.querySelector(`.nav a[data-sec="${sec.id}"]`);
    if (link) { link.style.opacity = any ? '' : '.35'; if (link.closest('.side-nav') && getComputedStyle(link.closest('.nav')).flexWrap === 'nowrap') link.parentElement.hidden = !any; }
  });
  if (box) box.classList.toggle('no-hits', !hits);
  restoreAnchor(anchor);
}

function setTheme(t) {
  if (t) document.documentElement.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch (e) { /* ignore */ }
  applyStyle();
}

// Theme styles (themes.css): the standard one, or one per SW5E class, each light or dark. Unless the player picks
// one, the style is the class of the character on screen (the class with most levels).
// [id, name, dark background, dark accent, light background, light accent]: the picker's swatches.
const THEME_STYLES = [
  ['standard', 'Standard', '#0f1218', '#e8b13e', '#f4f2ee', '#b7791f'],
  ['berserker', 'Berserker', '#130c0c', '#e5472f', '#f6eeeb', '#b3261e'],
  ['consular', 'Consular', '#0b1117', '#5ccbc2', '#edf4f5', '#1c8780'],
  ['engineer', 'Engineer', '#0a0f12', '#26d4ee', '#f0f6f8', '#0a86a0'],
  ['fighter', 'Fighter', '#0f1215', '#cda548', '#f1f0ec', '#86661a'],
  ['guardian', 'Guardian', '#090e1b', '#58a6ff', '#edf2fb', '#1b5ed0'],
  ['monk', 'Monk', '#13100b', '#f28f2c', '#f8f1e6', '#b35b0b'],
  ['operative', 'Operative', '#0c0f0d', '#7fe08a', '#eef3ef', '#23803a'],
  ['scholar', 'Scholar', '#14110d', '#d8b25c', '#f2e8d3', '#87561a'],
  ['scout', 'Scout', '#0d120e', '#9fc75c', '#eff3e8', '#4b781c'],
  ['sentinel', 'Sentinel', '#100d17', '#f2c94c', '#f4f1f9', '#7346c2'],
];
const stylePref = () => { try { return localStorage.getItem('style') || 'auto'; } catch (e) { return 'auto'; } };
/** The style of a character's class: the class with most levels (the first of equals). */
function classStyleOf(snap) {
  if (!snap) return 'standard';
  const classes = arr(withEdits(snap.raw, editedFields(snap.key)).classes);
  const main = classes.reduce((best, k) => (!best || num(k.levels) > num(best.levels) ? k : best), null);
  const id = main ? String(main.name || '').toLowerCase() : '';
  return THEME_STYLES.some(([s]) => s === id) ? id : 'standard';
}
/** Puts the chosen (or the character's) style on the page, and the window's colour to match. */
function applyStyle() {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const pref = stylePref();
  const style = pref === 'auto' || !THEME_STYLES.some(([s]) => s === pref) ? classStyleOf(state.snapshots[state.current]) : pref;
  const root = document.documentElement;
  if (root.dataset.style !== style) root.dataset.style = style;
  try { localStorage.setItem('styleShown', style); } catch (e) { /* ignore */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && typeof getComputedStyle === 'function') meta.content = getComputedStyle(root).getPropertyValue('--bg').trim() || meta.content;
}
/** Style (under the section list, or ☰ on phones): light or dark, and the style. */
function showThemes(redraw) {
  let pop = document.getElementById('msgLog');
  const was = pop && pop.dataset.kind;
  if (pop) pop.remove();
  if (was === 'themes' && !redraw) return;
  pop = document.createElement('div');
  pop.id = 'msgLog';
  pop.dataset.kind = 'themes';
  pop.className = 'msg-log guide';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Theme');
  const light = document.documentElement.dataset.theme === 'light';
  const pref = stylePref();
  const mine = classStyleOf(state.snapshots[state.current]);
  const sw = (id) => {
    const s = THEME_STYLES.find(([x]) => x === id) || THEME_STYLES[0];
    const [bg, accent] = light ? [s[4], s[5]] : [s[2], s[3]];
    const mark = s[0] === 'standard' ? `<i class="std" style="background:${accent}"></i>` : `<i style="--e:url(art/themes/${s[0]}-emblem.svg);color:${accent}"></i>`;
    return `<span class="sw" style="background:radial-gradient(circle at 50% 40%, ${bg} 55%, color-mix(in srgb, ${accent} 45%, ${bg}))">${mark}</span>`;
  };
  const opt = (id, name, sub) => `<button data-act="style" data-arg="${id}" aria-pressed="${pref === id}">${sw(id === 'auto' ? mine : id)}<span>${esc(name)}${sub ? `<br><small class="faint">${esc(sub)}</small>` : ''}</span></button>`;
  pop.innerHTML = `<div class="msg-head"><b>Theme</b><button class="btn sm" data-act="themes" aria-label="Close">✕</button></div>
    <div class="theme-modes" role="group" aria-label="Light or dark">${[['dark', 'Dark'], ['light', 'Light']]
    .map(([v, l]) => `<button class="btn sm${(v === 'light') === light ? ' on' : ''}" data-act="theme-mode" data-arg="${v}" aria-pressed="${(v === 'light') === light}">${l}</button>`).join('')}</div>
    <div class="theme-pick" role="group" aria-label="Style">
      ${opt('auto', "The character's class", `now ${(THEME_STYLES.find(([x]) => x === mine) || THEME_STYLES[0])[1]}`)}
      ${THEME_STYLES.map(([id, name]) => opt(id, name)).join('')}
    </div>
    <div class="theme-modes" role="group" aria-label="Screen effects" style="margin-top:8px">${[['on', 'Screen effects on'], ['off', 'Off']]
    .map(([v, l]) => `<button class="btn sm${(v === 'on') === screenFxOn() ? ' on' : ''}" data-act="fx-mode" data-arg="${v}" aria-pressed="${(v === 'on') === screenFxOn()}" title="${v === 'on' ? 'Low hit points, conditions, Rage, concentration, shields and the like show around the sheet; hits, healing and natural 20s flash' : 'No screen effects'}">${l}</button>`).join('')}</div>
    <p class="faint">Kept in this browser. "The character's class" follows the character on screen (the class with most levels); every style has a light and a dark version. Screen effects show what is happening to the character around the sheet.</p>`;
  const bar = document.querySelector('.side-nav');
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  pop.style.top = `${narrow && bar ? Math.max(8, Math.round(bar.getBoundingClientRect().bottom) + 8) : 56}px`;
  document.body.appendChild(pop);
}
function initTheme() {
  let t = null;
  try { t = localStorage.getItem('theme'); } catch (e) { /* ignore */ }
  if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  // Compact cards (titles, counters and buttons; tap to read) start on for phones until chosen in the menu.
  let compact = null;
  try { compact = localStorage.getItem('compact'); } catch (e) { /* ignore */ }
  document.body.classList.toggle('compact', compact == null ? !!(window.matchMedia && window.matchMedia('(max-width: 700px)').matches) : compact === '1');
  syncMenu();
}
/** Menu items that show a setting. */
function syncMenu() {
  const c = $('#compactItem');
  if (c) c.setAttribute('aria-pressed', String(document.body.classList.contains('compact')));
  const r = $('#removeItem');
  if (r) {
    const confirm = !!state.current && state.confirmRemoveChar === state.current;
    const demo = isDemoKey(state.current);
    r.classList.toggle('confirm', confirm);
    r.textContent = demo ? (confirm ? 'Really reset? Your changes to the demo are lost' : 'Reset the demo character')
      : confirm ? 'Really remove? Changes not synced to SW5E are lost' : 'Remove from this viewer';
  }
}

/** Show another character (the picker, the demo's buttons). */
async function openCharacter(key) {
  if (!state.snapshots[key]) return;
  state.create = null;
  state.current = key;
  scheduleRecompute(state.current);
  state.editing = null;
  state.confirmDiscard = null;
  state.confirmRemove = null;
  state.useMenu = null;
  await saveStore();
  renderAll();
  window.scrollTo({ top: 0 });
}

/** The demo as it comes with the sheet: what was done with it here (edits, play state, effects, history, rolls) goes. */
async function resetDemo() {
  for (const k of ['trackers', 'edits', 'itemState', 'portraits', 'history', 'derived']) delete state[k][DEMO_KEY];
  addDemo(state);
  rollState.log = rollState.log.filter((x) => !isDemoKey(x.key));
  saveRollLog();
  state.undo = null;
  state.editUndo = null;
  await saveTrackers(); await saveEdits(); await saveItemState(); await savePortraits(); await saveDerived();
  recordHistory(DEMO_KEY, state.snapshots[DEMO_KEY].raw, 'The demo character');
  await saveStore();
  renderAll();
  scheduleRecompute(DEMO_KEY);
  setStatus('The demo character is back as it comes with the sheet.');
}

async function handleAction(act, arg) {
  const snap = state.snapshots[state.current];
  switch (act) {
    case 'load': return loadFromSw5e();
    case 'import': return $('#fileInput').click();
    case 'recompute': return recomputeCurrent();
    case 'engine-copy': {
      const snap = state.snapshots[state.current];
      const ck = snap && snap.engineCheck;
      if (!ck) return undefined;
      const text = JSON.stringify({ character: snap.raw.name, rules: state.rules && state.rules.dataVersion, checked: new Date(ck.at).toISOString(), compared: ck.compared, differences: ck.differences, more: ck.more || 0 }, null, 1);
      return navigator.clipboard.writeText(text).then(() => setStatus('Copied the differences.'), () => setStatus('Could not copy.', 'error'));
    }
    case 'export-raw':
      if (snap) download(`${fileSafe(snap.raw.name)}.json`, withEdits(snap.raw, editedFields(snap.key)));
      return;
    case 'export-backup':
      return exportBackup();
    case 'export-character':
      return snap ? exportBackup(snap.key) : undefined;
    case 'version-compare':
      state.versionCompare = state.versionCompare === arg ? null : arg;
      return renderAll({ keepTyping: true });
    case 'version-restore':
      return restoreVersion(arg);
    case 'save-sw5e':
      return saveChangesToSw5e();
    case 'edit-undo':
      return undoEdit();
    case 'relent':
      return trackerAction('relent', arg);
    case 'messages': return showMessages();
    case 'guide': return showGuide();
    case 'from-sw5e': return showFromSw5e();
    case 'account': return typeof accountAction === 'function' ? accountAction(arg) : undefined;
    case 'paste-sw5e': return pasteFromSw5e();
    case 'copy-bookmark':
      return navigator.clipboard.writeText(sw5eBookmarkCode())
        .then(() => setStatus('Bookmark copied: bookmark any page, edit it, and paste this as its address.'))
        .catch((e) => setStatus('Could not copy: ' + e.message, 'error'));
    case 'pw-onme': return powerOnMe(arg);
    case 'pw-heal': return trackerAction('heal', '', num(arg));
    case 'reckless': return startShortState('reckless');
    case 'mark': return startShortState('mark', arg);
    case 'ctf-use': return useChannelTheForce(arg);
    case 'infuse': return infuseItem();
    case 'fx-count': return effectCount(arg);
    case 'foretell-roll': {
      if (!snap) return undefined;
      const st = itemStateOf(snap.key);
      st.foretell = [rollDie(20), rollDie(20)];
      await saveItemStateFor(snap.key, st);
      refreshTracked(['tracker']);
      return setStatus(`Foretelling rolls: ${st.foretell.join(' and ')}. Use one on a roll before rolling it.`);
    }
    case 'pw-temp': return trackerAction('temp', '', num(arg));
    case 'ashla': return ashlaBoost(arg);
    case 'round-start': return combatRound('start');
    case 'round-next': return combatRound('next');
    case 'round-end': return combatRound('end');
    case 'fx-custom': return addCustomEffect();
    case 'roll':
      return startRoll(arg);
    case 'recover':
      return trackerAction('recover', arg);
    case 'discard-field': {
      if (!snap || !state.edits[snap.key] || !(arg in state.edits[snap.key].fields)) return undefined;
      const undo = rememberForUndo(snap.key, `took sw5e.com's ${fieldLabel(arg)}`);
      delete state.edits[snap.key].fields[arg];
      if (!Object.keys(state.edits[snap.key].fields).length) delete state.edits[snap.key];
      await saveEdits();
      renderAll();
      scheduleRecompute(snap.key);
      return setStatus(`${fieldLabel(arg)}: now sw5e.com's.`, '', false, undo);
    }
    case 'discard-edits':
      return discardEdits();
    case 'inv-add':
      return addItemFromCatalog();
    case 'add-owe':
      return addItemFromCatalog(arg);
    case 'add-custom': {
      const d = state.addDraft || (state.addDraft = { ...ADD_DEFAULTS });
      d.custom = true;
      d.closed = true;
      refreshTracked(['addsugg', 'adddetail']);
      const w = $('[data-add="cw"]');
      if (w) w.focus();
      return undefined;
    }
    case 'debt-pay': return debtAction('pay', arg);
    case 'debt-drop': return debtAction('drop', arg);
    case 'shot': return weaponAmmo('shot', arg);
    case 'reload': return weaponAmmo('reload', arg);
    case 'add-pick':
      return pickAddItem(arg);
    case 'eff-pick':
      return receiveEffect(arg);
    case 'tweak-add':
      return addTweak();
    case 'feat-start':
      return startFeatureState(arg);
    case 'rules-books':
      // Installed as an app, the books open in the app's own window (with a way back); in a browser, a new tab.
      if (window.matchMedia('(display-mode: standalone)').matches) location.href = 'rules.html';
      else window.open('rules.html', '_blank');
      return undefined;
    case 'app-update':
      return updateOfflineApp();
    case 'rules-load':
      ensureRules().catch((e) => setStatus('Could not load the SW5E rules data: ' + e.message, 'error')).finally(() => renderAll({ keepTyping: true }));
      return undefined;
    case 'cls-remove':
      return removeClassChoice(arg);
    case 'slot-remove':
      return removeSlotPick(arg);
    case 'slot-orphan-remove':
      await editSlot(arg, () => []);
      return setStatus(`Removed the stored picks for ${arg}. Not synced to SW5E yet.`);
    case 'pw-remove':
      return removeClassPower(arg);
    case 'pw-cast':
      return castPower(arg);
    case 'cls-convert':
      return convertCustomFeature(arg);
    case 'tweak-remove':
      return removeTweak(arg);
    case 'tweak-keep':
      return keepTweak(arg);
    case 'fx-stack':
      return stackAnyway(arg);
    case 'fx-mode':
      return startItemMode(arg);
    case 'effect-end':
      return endEffect(arg);
    case 'catalog-refresh':
      return loadCatalogThenRender({ force: true });
    case 'edit': {
      if (!snap) return;
      state.editing = { key: snap.key, section: arg, draft: {} };
      state.confirmRemove = null;
      renderAll();
      const sec = $('#sec-' + arg);
      const first = sec && sec.querySelector('[data-field]');
      if (sec) sec.scrollIntoView({ block: 'start' });
      if (first) first.focus({ preventScroll: true });
      return;
    }
    case 'edit-image': {
      await handleAction('edit', 'overview');
      const el = document.getElementById('ed-image');
      if (el) { el.focus({ preventScroll: true }); el.select(); }
      return;
    }
    case 'portrait-upload': return snap ? pickPortrait(snap.key) : undefined;
    case 'portrait-remove':
      if (!snap || !state.portraits[snap.key]) return undefined;
      delete state.portraits[snap.key];
      await savePortraits();
      renderAll({ keepTyping: true });
      return setStatus('Removed the uploaded picture.');
    case 'shortcuts': return typeof showShortcuts === 'function' ? showShortcuts() : undefined;
    case 'portrait-toggle':
      try { localStorage.setItem('portrait', portraitHidden() ? 'shown' : 'hidden'); } catch (e) { /* ignore */ }
      return renderAll({ keepTyping: true });
    case 'edit-cancel':
      state.editing = null;
      return renderAll();
    case 'export-version': {
      const [key, at] = (arg || '').split('|');
      const v = arr(state.history[key]).find((h) => String(h.at) === at);
      if (v) download(`${fileSafe(v.raw.name)} ${localStamp(v.at)}.json`, v.raw);
      return;
    }
    case 'export-snapshot':
      if (snap) download(`${fileSafe(snap.raw.name)}.sheet-snapshot.json`, snap);
      return;
    case 'toggle-compact': {
      const on = !document.body.classList.contains('compact');
      document.body.classList.toggle('compact', on);
      document.querySelectorAll('.card.expanded,.card.collapsed').forEach((c) => c.classList.remove('expanded', 'collapsed'));
      try { localStorage.setItem('compact', on ? '1' : '0'); } catch (e) { /* ignore */ }
      syncCardAria();
      syncMenu();
      return setStatus(on ? 'Compact cards: only titles, counters and buttons; click a card to read it.' : 'Cards show their full text.');
    }
    case 'search-toggle': {
      state.searching = !state.searching;
      const bar = $('.side-nav');
      if (bar) bar.classList.toggle('searching', state.searching);
      const btn = $('[data-act="search-toggle"]');
      if (btn) { btn.textContent = state.searching ? '✕' : '🔍'; btn.setAttribute('aria-pressed', String(state.searching)); }
      if (state.searching) { const fb = $('#filterBox'); if (fb) fb.focus(); } else if (state.filter) { state.filter = ''; const fb = $('#filterBox'); if (fb) fb.value = ''; applyFilter('', { keepPlace: true }); }
      return undefined;
    }
    case 'recompute-retry':
      if (!snap) return undefined;
      delete recomputeFail[snap.key];
      return recomputeDerived(snap.key);
    case 'theme':
      return setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    case 'themes': return showThemes();
    case 'explain': return typeof toggleExplain === 'function' ? toggleExplain() : undefined;
    case 'theme-mode':
      setTheme(arg === 'light' ? 'light' : 'dark');
      return showThemes(true);
    case 'fx-mode':
      try { localStorage.setItem('fx', arg === 'off' ? 'off' : 'on'); } catch (e) { /* ignore */ }
      applyScreenFx(state.snapshots[state.current] ? buildModel(state.snapshots[state.current]) : null);
      return showThemes(true);
    case 'style':
      try { localStorage.setItem('style', arg); } catch (e) { /* ignore */ }
      applyStyle();
      return showThemes(true);
    case 'remove':
      if (!snap) return;
      // Confirm first: the character's local changes (not yet on sw5e.com) go with it.
      if (state.confirmRemoveChar !== snap.key) {
        state.confirmRemoveChar = snap.key;
        $('#moreMenu').hidden = false;
        return syncMenu();
      }
      state.confirmRemoveChar = null;
      syncMenu();
      $('#moreMenu').hidden = true;
      $('#btnMore').setAttribute('aria-expanded', 'false');
      if (isDemoKey(snap.key)) return resetDemo();
      delete state.snapshots[state.current];
      if (state.trackers[state.current]) {
        delete state.trackers[state.current];
        await saveTrackers();
      }
      if (state.edits[state.current]) {
        delete state.edits[state.current];
        await saveEdits();
      }
      if (state.itemState[state.current]) {
        delete state.itemState[state.current];
        await saveItemState();
      }
      if (state.portraits[state.current]) {
        delete state.portraits[state.current];
        await savePortraits();
      }
      state.current = ownKeys(state.snapshots)[0] || null;
      await saveStore();
      renderAll();
      setStatus('Removed from viewer (nothing was changed on sw5e.com).');
      return;
    case 'demo':
      return openCharacter(DEMO_KEY);
    case 'reset-demo':
      // The banner's Reset: asks in the menu, like Remove.
      state.confirmRemoveChar = DEMO_KEY;
      $('#moreMenu').hidden = false;
      $('#btnMore').setAttribute('aria-expanded', 'true');
      return syncMenu();
    case 'expand-all':
      document.querySelectorAll('#sheet .card').forEach((c) => { c.classList.remove('collapsed'); c.classList.add('expanded'); });
      document.querySelectorAll('#sheet details').forEach((d) => { if (!d.querySelector('pre.json')) d.open = true; });
      return syncCardAria();
    case 'collapse-all':
      document.querySelectorAll('#sheet .card:not(.no-toggle)').forEach((c) => { c.classList.add('collapsed'); c.classList.remove('expanded'); });
      document.querySelectorAll('#sheet details').forEach((d) => (d.open = false));
      return syncCardAria();
    case 'top':
      return window.scrollTo({ top: 0, behavior: 'smooth' });
    default:
      return builderAction(act, arg); // builder.js: pickers, level up, new character
  }
}

function wireUi() {
  $('#btnLoad').addEventListener('click', () => loadFromSw5e());
  $('#btnImport').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (files.length) await importFiles(files);
  });
  $('#charSelect').addEventListener('change', (e) => openCharacter(e.target.value));
  const more = $('#btnMore'), pop = $('#moreMenu');
  more.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.hidden = !pop.hidden;
    more.setAttribute('aria-expanded', String(!pop.hidden));
    if (pop.hidden) state.confirmRemoveChar = null;
    else $('#status').classList.remove('fresh'); // the toast would cover the menu
    syncMenu();
  });
  // The control last used, to keep it in place when the sheet redraws (see anchorFor).
  const noteControl = (e) => {
    const el = e.target.closest && e.target.closest('button, select, input, textarea, a, .card-head, .rollable, summary');
    if (el) lastControl = { el, at: Date.now() };
  };
  document.addEventListener('pointerdown', noteControl, true);
  // Click guard: right after a redraw, a click may land on a button that moved under the pointer (a free medpac from
  // "+" instead of "Use", the next row's × after removing one). Such a click is ignored, and said so; a click on the
  // same button as before the redraw goes through.
  const notePointer = (e) => { pointerAt = { x: e.clientX, y: e.clientY, at: Date.now() }; };
  document.addEventListener('pointermove', notePointer, { passive: true, capture: true });
  document.addEventListener('pointerdown', notePointer, { passive: true, capture: true });
  document.addEventListener('click', (e) => {
    const s = state.shift;
    if (!s || !e.isTrusted || Date.now() - s.at > 700) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 24) return;
    const el = e.target.closest && e.target.closest('[data-inv], [data-track], [data-act], .rollable, .cls-x');
    if (!el || el.closest('#dice, .menu, .topbar') || controlSig(e.target) === s.sig) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    state.shift = null;
    // The last notice's buttons (Undo) stay.
    const keep = [...document.querySelectorAll('#status button[data-act]')].map((b) => ({ act: b.dataset.act, arg: b.dataset.arg, label: b.textContent }));
    setStatus('Click ignored: the sheet changed under your pointer. Click again if you meant that button.', '', false, keep);
  }, true);
  document.addEventListener('keydown', noteControl, true);
  document.addEventListener('change', noteControl, true);
  // The section highlight follows the page; a scroll by hand ends a jump's own highlight.
  let spyTick = 0;
  window.addEventListener('scroll', () => { if (!spyTick) spyTick = requestAnimationFrame(() => { spyTick = 0; updateActiveSection(); }); }, { passive: true });
  const byHand = () => { if (state.jumpTo && Date.now() - state.jumpTo.at > 300) state.jumpTo = null; };
  window.addEventListener('wheel', byHand, { passive: true });
  window.addEventListener('touchmove', byHand, { passive: true });
  // Touching or swiping the section strip: it doesn't slide by itself for a moment.
  document.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('.side-nav')) state.stripTouchAt = Date.now(); }, { passive: true, capture: true });
  document.addEventListener('scroll', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('nav') && Date.now() - num(state.stripAutoAt) > 150) state.stripTouchAt = Date.now();
  }, { passive: true, capture: true });
  // Recent messages close on a click elsewhere or Escape.
  document.addEventListener('click', (e) => { const p = document.getElementById('msgLog'); if (p && !p.contains(e.target) && !(e.target.closest && e.target.closest('[data-act="messages"], [data-act="guide"], [data-jump]'))) p.remove(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const p = document.getElementById('msgLog'); if (p) p.remove(); } });
  document.addEventListener('click', (e) => {
    const invEl = e.target.closest('[data-inv]');
    if (invEl) {
      if (!invEl.disabled) inventoryAction(invEl.dataset.inv, invEl.dataset.arg || '');
      return;
    }
    const trackEl = e.target.closest('[data-track]');
    if (trackEl) {
      if (!trackEl.disabled) trackerAction(trackEl.dataset.track, trackEl.dataset.arg || '');
      return;
    }
    const navEl = e.target.closest('.nav a[data-sec]');
    if (navEl && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      jumpToSection(navEl.dataset.sec);
      return;
    }
    const actEl = e.target.closest('[data-act]');
    if (actEl) {
      if (actEl.dataset.act !== 'remove') closeMenu(); // Remove asks again in the open menu
      handleAction(actEl.dataset.act, actEl.dataset.arg);
      return;
    }
    if (!pop.hidden && !e.target.closest('.menu')) closeMenu();
    if (e.target.closest('#status')) { $('#status').classList.remove('fresh'); return; }
    const head = e.target.closest('.card-head');
    if (head && !e.target.closest('a, button, input, select, textarea, .rollable, .bump')) toggleCard(head.parentElement);
  });
  const closeMenu = () => {
    if (pop.hidden) return;
    pop.hidden = true;
    more.setAttribute('aria-expanded', 'false');
    if (state.confirmRemoveChar) { state.confirmRemoveChar = null; syncMenu(); }
  };
  document.addEventListener('input', (e) => {
    if (e.target.id === 'filterBox') { state.filter = e.target.value; applyFilter(e.target.value, { keepPlace: true }); }
    // Keep editor drafts so a re-render (e.g. another tab's write) doesn't lose typing.
    if (e.target.dataset && e.target.dataset.field && state.editing) state.editing.draft[e.target.dataset.field] = e.target.value;
    if (e.target.dataset && e.target.dataset.twadd) {
      state.tweakDraft = { ...(state.tweakDraft || {}), [e.target.dataset.twadd]: e.target.value };
      const amount = $('[data-twadd="value"]');
      if (e.target.dataset.twadd === 'path' && amount) amount.placeholder = /damageDice$/.test(e.target.value) ? 'die, e.g. d4' : 'e.g. 1';
      // What the chosen mode does, with the number typed.
      const help = $('#twModeHelp');
      const dk = state.tweakDraft.kind || 'bonus';
      if (help) { help.hidden = !TWEAK_MODES.some((x) => x[0] === dk); help.textContent = tweakModeHelp(dk, state.tweakDraft.value); }
      const err = $('#twErr');
      if (err) err.hidden = true;
    }
    if (e.target.dataset && e.target.dataset.eff === 'name') {
      state.effDraft = { name: e.target.value, hi: 0 };
      refreshTracked(['effsugg']);
    }
    const addKey = e.target.dataset && e.target.dataset.add;
    if (addKey) {
      const d = state.addDraft || (state.addDraft = { ...ADD_DEFAULTS });
      d[addKey] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (addKey === 'name') { d.hi = 0; d.moved = false; d.closed = false; }
      if (addKey === 'price') {
        d.pay = true; // typing a price means paying it
        const box = $('[data-add="pay"]');
        if (box) box.checked = true;
      }
      if (addKey === 'name' && d.custom && !e.target.value.trim()) d.custom = false;
      if (addKey === 'disc') {
        d.price = '';
        d.pay = true;
        const box = $('[data-add="pay"]');
        if (box) box.checked = true;
        const name = String(d.name).trim();
        const ref = catalogIndex && catalogIndex.get(name);
        const pk = !ref && packByName(name);
        const unit = ref ? priceOf(ref) : pk ? pk.cost : num(d.cc);
        const pr = $('[data-add="price"]');
        if (pr) pr.value = addPrice(d, unit, Math.max(1, parseInt(d.qty, 10) || 1));
      }
      // Another category: its list from the top.
      if (['cat', 'etype', 'rarity'].includes(addKey)) Object.assign(d, { browseN: 0, hi: 0, moved: false, closed: false });
      if (['cat', 'name', 'etype', 'rarity'].includes(addKey)) refreshTracked(['addsugg', 'adddetail']);
      else if (addKey === 'qty') refreshTracked(['adddetail']);
      const err = $('#addErr');
      if (err) err.hidden = true;
    }
  });
  document.addEventListener('submit', (e) => {
    if (e.target.matches('form[data-credits]')) {
      e.preventDefault();
      adjustCredits(e.target.querySelector('input'), e.target.querySelector('[data-credits-note]'));
      return;
    }
    const form = e.target.closest('form.editor');
    if (!form) return;
    e.preventDefault();
    applyEditor(form);
  });
  // Explanations (changed numbers, rule terms, titles, item cards) on hover, focus, long-press or Explain mode: info.js.
  // Pick lists (Add a maneuver…, Learn a power…, Choose a style…, Archetype): a closed <select> fires "change" on every
  // arrow key and type-ahead letter, so a choice made with the keyboard waits for Enter (leaving the list puts it back);
  // a click or tap in the open list commits at once.
  const PICKS = ['clsAdd', 'clsArch', 'slotAdd', 'pwAdd', 'pickAdd', 'condAdd'];
  const isPick = (el) => !!el && el.tagName === 'SELECT' && PICKS.some((k) => el.dataset[k] != null);
  let lastKey = null;
  document.addEventListener('keydown', (e) => { lastKey = { el: e.target, key: e.key, at: Date.now() }; }, true);
  const commitPick = (el) => {
    delete el.dataset.pending;
    const ds = el.dataset;
    if (ds.clsAdd) addClassChoice(ds.clsAdd, el.value);
    if (ds.clsArch != null) setArchetype(ds.clsArch, el.value);
    if (ds.slotAdd) addSlotPick(ds.slotAdd, el.value);
    if (ds.pwAdd) addClassPower(ds.pwAdd, el.value);
    if (ds.pickAdd) builderPick(ds.pickAdd, el.value);
    if (ds.condAdd && el.value) trackerAction('cond', `+${el.value}`);
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && isPick(e.target) && e.target.dataset.pending) { e.preventDefault(); commitPick(e.target); }
  });
  document.addEventListener('focusout', (e) => {
    if (!isPick(e.target) || !e.target.dataset.pending) return;
    delete e.target.dataset.pending;
    for (const o of e.target.options) o.selected = o.defaultSelected;
    if (![...e.target.options].some((o) => o.defaultSelected)) e.target.selectedIndex = 0;
  });
  document.addEventListener('change', (e) => {
    const ds = e.target.dataset || {};
    if (ds.fxweapon) setEffectWeapon(ds.fxweapon, e.target.value);
    if (ds.fxtool) setItemTool(ds.fxtool, e.target.value);
    if (ds.inuse) setInUse(ds.inuse, e.target.checked);
    if (ds.asfocus) setItemFocus(ds.asfocus, e.target.checked);
    if (ds.fxpick) setItemPick(ds.fxpick, e.target.value);
    if (ds.invBase) inventoryAction('base', `${ds.invBase}|${e.target.value}`);
    if (ds.jump != null) {
      const v = e.target.value;
      e.target.value = '';
      if (v.startsWith('sec:')) jumpToSection(v.slice(4));
      else if (v.startsWith('act:')) handleAction(v.slice(4));
    }
    if (ds.tw && ds.twf) updateTweak(ds.tw, ds.twf, e.target.value);
    if (isPick(e.target)) {
      const typed = lastKey && lastKey.el === e.target && lastKey.key !== 'Enter' && Date.now() - lastKey.at < 1500;
      if (typed) {
        e.target.dataset.pending = '1';
        e.target.title = 'Press Enter to choose it (leaving the list puts it back)';
      } else commitPick(e.target);
    }
    if (ds.clsNote) setClassNote(ds.clsNote, e.target.value);
    if (ds.clsModitem) setModifiedItem(ds.clsModitem, e.target.value);
    if (ds.clsPickitem) setPickItem(ds.clsPickitem, e.target.value);
    if (ds.slotNote) setSlotNote(ds.slotNote, e.target.value);
    if (ds.slotWeapon) setSlotWeapon(ds.slotWeapon, e.target.checked);
    if (ds.featNote != null) setFeatureNote(ds.featNote, e.target.value, ds.featKeep || '');
    if (ds.twReason != null) setTweakReason(ds.twReason, e.target.value);
  });
  document.addEventListener('focusin', (e) => {
    if (e.target.dataset && (e.target.dataset.add === 'name' || e.target.dataset.eff === 'name')) loadCatalogForAdding();
    // "Add an item" in a category: the empty name box lists the whole category while it has the focus.
    if (e.target.dataset && e.target.dataset.add === 'name') {
      const d = state.addDraft || (state.addDraft = { ...ADD_DEFAULTS });
      if (!d.browse) {
        d.browse = true;
        d.browseN = 0;
        if (!String(d.name).trim()) { d.closed = false; d.hi = 0; d.moved = false; }
        refreshTracked(['addsugg']);
      }
    }
  });
  // A category's list scrolled near its end: the next rows.
  document.addEventListener('scroll', (e) => {
    const s = e.target;
    if (!(s.classList && s.classList.contains('sugg') && s.closest && s.closest('.add-name'))) return;
    const d = state.addDraft;
    if (!d || String(d.name).trim() || s.scrollTop + s.clientHeight < s.scrollHeight - 200) return;
    const all = addSuggestions().length;
    if (all <= addShown(addSuggestions()).length) return;
    const top = s.scrollTop;
    d.browseN = addShown(addSuggestions()).length + ADD_BROWSE_STEP;
    refreshTracked(['addsugg']);
    const s2 = document.querySelector('.add-name .sugg');
    if (s2) s2.scrollTop = top;
  }, true);
  document.addEventListener('focusout', (e) => {
    // Leaving the name box (not for one of its suggestions): the category list closes.
    if (!(e.target.dataset && e.target.dataset.add === 'name') && !(e.target.closest && e.target.closest('.add-name .sugg'))) return;
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.add-name')) return;
    const d = state.addDraft;
    if (d && d.browse) {
      d.browse = false;
      if (!String(d.name).trim()) refreshTracked(['addsugg']);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      if (!state.searching && getComputedStyle($('#filterBox') || document.body).display === 'none') handleAction('search-toggle');
      else if ($('#filterBox')) $('#filterBox').focus();
    }
    if (e.key === 'Escape' && !pop.hidden) { closeMenu(); more.focus(); }
    // Escape in the filter clears it (and closes it in the narrow-screen strip).
    if (e.key === 'Escape' && e.target.id === 'filterBox') {
      if (state.searching) handleAction('search-toggle');
      else { state.filter = ''; e.target.value = ''; applyFilter('', { keepPlace: true }); }
    }
    // Cards open and close with Enter or Space on their title line.
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('card-head')) {
      e.preventDefault();
      toggleCard(e.target.parentElement);
    }
    // "Add an item": arrows move through the suggestions, Enter picks one; once the name is a
    // SW5E item, Enter (in the name or quantity box) adds it. Escape closes the suggestions.
    if (e.target.dataset && e.target.dataset.eff === 'name') {
      const d = state.effDraft || (state.effDraft = { name: '', hi: 0 });
      const hits = d.closed && e.key !== 'ArrowDown' ? [] : effectSuggestions().slice(0, SUGGEST_MAX);
      if (e.key === 'ArrowDown' && d.closed) { d.closed = false; }
      if (hits.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        // The first suggestion is already highlighted: the first ↓ stays on it.
        d.hi = clamp(num(d.hi) + (e.key === 'ArrowDown' ? (d.moved ? 1 : 0) : -1), 0, hits.length - 1);
        d.moved = true;
        refreshTracked(['effsugg']);
      } else if (e.key === 'Enter' && hits.length) {
        e.preventDefault();
        receiveEffect(hits[clamp(num(d.hi), 0, hits.length - 1)].name);
      } else if (e.key === 'Escape' && !d.closed) {
        d.closed = true; // closes the suggestions; the text stays
        refreshTracked(['effsugg']);
      }
    }
    const addKey = e.target.dataset && e.target.dataset.add;
    if (addKey === 'name' || addKey === 'qty') {
      const d = state.addDraft || (state.addDraft = { ...ADD_DEFAULTS });
      if (addKey === 'name' && e.key === 'ArrowDown' && d.closed) d.closed = false; // ↓ opens them again
      const all = addKey === 'name' && !d.closed ? addSuggestions() : [];
      let hits = addShown(all);
      // Arrowing past the end of a category's list shows the next rows.
      if (e.key === 'ArrowDown' && d.moved && num(d.hi) >= hits.length - 1 && all.length > hits.length) {
        d.browseN = hits.length + ADD_BROWSE_STEP;
        hits = addShown(all);
      }
      if (hits.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        d.hi = clamp(num(d.hi) + (e.key === 'ArrowDown' ? (d.moved ? 1 : 0) : -1), 0, hits.length - 1);
        d.moved = true;
        refreshTracked(['addsugg']);
        // A long list (a whole category) scrolls to keep the highlighted one in view.
        const hiEl = document.querySelector('.add-name .sugg-item.hi');
        if (hiEl && hiEl.scrollIntoView) hiEl.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (hits.length) pickAddItem(hits[clamp(num(d.hi), 0, hits.length - 1)].name);
        else addItemFromCatalog();
      } else if (e.key === 'Escape' && addKey === 'name' && !d.closed) {
        d.closed = true; // closes the suggestions; the text stays
        refreshTracked(['addsugg']);
      }
    }
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.twadd && e.target.tagName === 'INPUT') { e.preventDefault(); addTweak(); }
    // Ctrl/Cmd+Enter in an editor = Done.
    const form = e.target.closest && e.target.closest('form.editor');
    if (form && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); applyEditor(form); }
  });
  // keep in sync if another viewer tab changes storage (our own writes are already rendered)
  platform.storage.onChanged((changes) => {
    const writer = changes[WRITER_KEY] && changes[WRITER_KEY].newValue;
    if (writer && writer.page === PAGE_ID) return;
    if (changes[TRACKER_KEY]) state.trackers = changes[TRACKER_KEY].newValue || {};
    if (changes[HISTORY_KEY]) state.history = changes[HISTORY_KEY].newValue || {};
    if (changes[BACKUP_KEY]) state.lastBackup = changes[BACKUP_KEY].newValue || null;
    if (changes[BACKUP_INFO_KEY]) {
      const bi = changes[BACKUP_INFO_KEY].newValue || {};
      state.lastBackupCount = bi.count || null;
      state.charBackups = bi.characters || {};
    }
    if (changes[EDITS_KEY]) state.edits = changes[EDITS_KEY].newValue || {};
    if (changes[ITEMSTATE_KEY]) state.itemState = changes[ITEMSTATE_KEY].newValue || {};
    if (changes[DERIVED_KEY]) state.derived = changes[DERIVED_KEY].newValue || {};
    if (changes[PORTRAITS_KEY]) state.portraits = changes[PORTRAITS_KEY].newValue || {};
    if (changes[CATALOG_INFO_KEY] || changes[RULES_INFO_KEY]) {
      // Another tab fetched SW5E's newer data: use it here too.
      if (changes[CATALOG_INFO_KEY]) state.catalogInfo = changes[CATALOG_INFO_KEY].newValue || null;
      if (changes[RULES_INFO_KEY]) state.rulesInfo = changes[RULES_INFO_KEY].newValue || null;
      const inUse = num(state.rules && state.rules.dataVersion);
      if (state.rules && [state.rulesInfo, state.catalogInfo].some((i) => i && num(i.dataVersion) > inUse)) {
        state.rules = null;
        setCatalog(null);
        ensureSw5eData().then(() => renderAll({ keepTyping: true })).catch((e) => setStatus("Could not load SW5E's rules data: " + e.message, 'error'));
      }
    }
    if (changes[STORE_KEY] || changes[EDITS_KEY] || changes[ITEMSTATE_KEY] || changes[DERIVED_KEY]) {
      if (changes[STORE_KEY]) { state.snapshots = changes[STORE_KEY].newValue || {}; addDemo(state); }
      if (!state.snapshots[state.current]) state.current = ownKeys(state.snapshots)[0] || null;
      renderAll({ keepTyping: true });
    } else if (changes[TRACKER_KEY]) {
      refreshTracked();
    }
  });
}

// ------------------------------------------------------------- boot
// Headless runs (dev/regress.js) load this file to draw stored characters without starting the page.
async function main() {
  // Only the browser extension reaches sw5e.com: elsewhere its buttons are hidden (.needs-sw5e).
  document.documentElement.dataset.sw5e = canReachSw5e() ? 'on' : 'off';
  initTheme();
  loadItemArt();
  wireUi();
  const last = await loadStore();
  await loadRollLog(); // again, once storage is surely readable (the dev harness's storage opens late)
  const params = new URLSearchParams(location.search);
  const wantId = params.get('id');
  const tabId = params.get('tab') ? Number(params.get('tab')) : undefined;
  if (wantId) {
    const hit = Object.values(state.snapshots).find((s) => s.raw.id === wantId || s.raw.localId === wantId);
    state.current = hit ? hit.key : (last && state.snapshots[last] ? last : null);
  } else {
    state.current = last && state.snapshots[last] ? last : ownKeys(state.snapshots)[0] || null;
  }
  // Characters cached before version history existed start their history with that copy.
  const unrecorded = Object.values(state.snapshots).filter((s) => !arr(state.history[s.key]).length);
  for (const s of unrecorded) recordHistory(s.key, s.raw, isDemoKey(s.key) ? 'The demo character' : 'Copy already in this viewer');
  if (unrecorded.length) await saveStore();
  // SW5E's rules and item data come with the sheet: with them the numbers are the sheet's own engine's.
  try { await ensureSw5eData(); } catch (e) { console.error(e); setStatus("Could not load SW5E's rules data: " + e.message, 'error'); }
  try { renderAll(); } catch (e) { console.error(e); setStatus('Could not draw the sheet: ' + e.message, 'error'); }
  if (state.current) scheduleRecompute(state.current);
  // Served by the sheet's own server: accounts and backups (account.js); not awaited, the sheet doesn't wait for it.
  if (typeof initAccount === 'function') initAccount().catch((e) => console.warn('Account:', e));
  // Opened by the sheet's bookmark on sw5e.com, or by sharing files to the installed app.
  if (params.get('from') === 'sw5e' || params.has('shared')) history.replaceState(null, '', location.pathname);
  if (params.get('from') === 'sw5e') {
    if (awaitCharactersFromSw5e((result) => loadFromSw5e({ result }))) setStatus('Getting your characters from sw5e.com…');
    return;
  }
  if (params.has('shared') && typeof takeSharedFiles === 'function') {
    const files = await takeSharedFiles();
    if (files.length) await importFiles(files);
    return;
  }
  if ((tabId || wantId) && canReachSw5e()) {
    // Opened from a sw5e.com tab: refresh from it so the sheet is current.
    await loadFromSw5e({ preferredTabId: tabId, selectId: wantId });
  } else if (isDemoKey(state.current)) {
    setStatus('The demo character: try anything. More ▾ → Reset the demo character puts it back as it was.');
  } else if (state.current) {
    const s = state.snapshots[state.current];
    setStatus(`Showing the copy kept in this browser (${new Date(s.loadedAt).toLocaleString()})${canReachSw5e() ? ' — “Load from SW5E” to refresh' : ''}.`);
  }
}
if (!globalThis.SHEET_HEADLESS) main();
