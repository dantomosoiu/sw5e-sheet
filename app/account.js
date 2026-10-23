/*
 * Accounts on the sheet's own server (server/server.js, docs/server.md): optional. Where the sheet is served by that
 * server, players can make an account (an e-mail and a password, or Google) and every character in the browser is then
 * backed up there, and can be restored on another device. Without an account, or where there's no such server (GitHub
 * Pages, the browser extension, the dev page), the sheet works as before and nothing here shows.
 *
 * What the server keeps of a character is its backup file ("Back up this character": backupData in viewer.js). A
 * backup is sent a few seconds after the character changes, when its fingerprint (the small parts whole, the history
 * and picture by count and time) differs from the one last sent. The server numbers each backup (rev): one written
 * from an older revision than the server's is refused with the newer one, which is merged in (restoreBackups: newer
 * data wins, part by part) and sent again. On sign-in and on each visit, characters here that changed on another
 * device are merged the same way. Characters that are only on the server are restored when the player asks
 * (Account → Restore), so one removed from this browser doesn't come back by itself.
 *
 * Per browser and account, in localStorage "sw5e-account:<user id>": { auto, sent: { key: { fp, rev } } }.
 */
'use strict';

const account = {
  server: false, // this page is served by the sheet's server
  user: null, // { id, email, name, hasPassword, hasGoogle }
  google: false,
  signup: false,
  list: null, // the server's characters: [{ key, name, summary, rev, size, updatedAt }]
  usage: null,
  busy: false,
  timer: null,
  waiting: new Set(), // characters to send
  error: '', // the last backup error, until one works
  lastOk: 0,
  view: 'signin', // signed out: 'signin' | 'register'
  versions: null, // { key, list }
};

const ACCOUNT_KEYS = ['snapshots', 'trackers', 'edits', 'itemState', 'history', 'portraits', 'rolls'];

async function acctApi(method, path, body) {
  const res = await fetch(path.replace(/^\//, ''), {
    method,
    credentials: 'same-origin',
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(method !== 'GET' ? { 'x-sheet': '1' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* not JSON: not the sheet's server */ }
  return { status: res.status, ok: res.ok, json: json || {} };
}

// ------------------------------------------------------------------ per-browser record
const syncKey = () => `sw5e-account:${account.user ? account.user.id : 0}`;
function syncState() {
  try { return JSON.parse(localStorage.getItem(syncKey()) || 'null') || { auto: null, sent: {} }; } catch (e) { return { auto: null, sent: {} }; }
}
function saveSyncState(s) {
  try { localStorage.setItem(syncKey(), JSON.stringify(s)); } catch (e) { /* private window: backups still go, they're just sent again */ }
}

/** A short hash of a string (FNV-1a). */
function acctHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36) + s.length.toString(36);
}
/** What a character's backup is made of, cheaply: the parts that change in play whole, the large ones by count and time. */
function acctFingerprint(key) {
  const snap = state.snapshots[key];
  if (!snap) return '';
  const hist = arr(state.history[key]);
  const pic = state.portraits && state.portraits[key];
  const rolls = rollState.log.filter((x) => x.key === key);
  return acctHash(JSON.stringify([snap.raw, snap.loadedAt, state.trackers[key] || null, state.edits[key] || null, state.itemState[key] || null,
    hist.length, hist.length ? hist[hist.length - 1].at : 0, pic ? pic.at : 0, rolls.length, rolls.length ? rolls[rolls.length - 1].id : 0]));
}
const acctSummary = (snap) => arr(snap && snap.raw && snap.raw.classes).map((c) => `${c.name} ${c.levels}`).join(' / ');

// ------------------------------------------------------------------ backing up
function scheduleBackup(keys, delay = 4000) {
  if (!account.user || !syncState().auto) return;
  for (const k of keys) account.waiting.add(k);
  clearTimeout(account.timer);
  account.timer = setTimeout(() => backupNow(), delay);
}

/** Send every waiting character whose fingerprint changed. */
async function backupNow({ all = false } = {}) {
  if (!account.user || account.busy) return;
  const s = syncState();
  if (!s.auto && !all) return;
  const keys = all ? Object.keys(state.snapshots) : [...account.waiting];
  account.waiting.clear();
  account.busy = true;
  let sent = 0;
  try {
    for (const key of keys) {
      if (!state.snapshots[key]) continue;
      const fp = acctFingerprint(key);
      const mine = s.sent[key];
      if (mine && mine.fp === fp) continue;
      if (await sendCharacter(key, s)) sent++;
    }
    account.error = '';
    account.lastOk = Date.now();
    if (sent) await refreshList();
  } catch (e) {
    account.error = e.message;
    for (const k of keys) account.waiting.add(k);
    // Offline or the server away: try again in a minute (and when the connection comes back).
    clearTimeout(account.timer);
    account.timer = setTimeout(() => backupNow(), 60000);
  } finally {
    account.busy = false;
    saveSyncState(s);
    renderAccount();
  }
  return sent;
}

/** One character to the server; a newer backup there is merged in first. True when sent. */
async function sendCharacter(key, s) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const snap = state.snapshots[key];
    const fp = acctFingerprint(key);
    const ifRev = s.sent[key] ? s.sent[key].rev : null;
    const r = await acctApi('PUT', `/api/characters/${encodeURIComponent(key)}`,
      // (exportedAt 0: the same character sends the same text, which the server doesn't store twice)
      { ifRev, name: snap.raw.name || '', summary: acctSummary(snap), data: backupData(key, 0) });
    if (r.ok) {
      s.sent[key] = { fp, rev: r.json.rev };
      return true;
    }
    if (r.status === 409) {
      // Written from another device since: theirs merged into ours, then ours (with both) sent on top of theirs.
      const cur = r.json.current;
      if (cur && cur.data) await restoreBackups([cur.data]);
      s.sent[key] = { fp: '', rev: cur ? cur.rev : null };
      if (state.current === key) renderAll({ keepTyping: true });
      continue;
    }
    if (r.status === 401) { account.user = null; renderAccount(); throw new Error('Signed out: sign in again to keep backing up.'); }
    throw new Error(r.json.error || `the server answered ${r.status}`);
  }
  throw new Error(`${state.snapshots[key].raw.name || 'a character'} keeps changing on another device`);
}

/** The server's list of this account's characters, for the panel. False when signed out meanwhile. */
async function refreshList() {
  const r = await acctApi('GET', '/api/characters');
  if (r.status === 401) { account.user = null; renderAccount(); return false; }
  if (!r.ok) throw new Error(r.json.error || `the server answered ${r.status}`);
  account.list = r.json.characters;
  account.usage = r.json.usage;
  return true;
}

/** Characters here that changed on another device: merged in. Also the server's list, for the panel. */
async function pullChanges() {
  if (!account.user || !(await refreshList())) return;
  const s = syncState();
  if (!s.auto) { renderAccount(); return; }
  const newer = account.list.filter((c) => state.snapshots[c.key] && (!s.sent[c.key] || s.sent[c.key].rev !== c.rev));
  for (const c of newer) {
    const one = await acctApi('GET', `/api/characters/${encodeURIComponent(c.key)}`);
    if (!one.ok) continue;
    await restoreBackups([one.json.data]);
    // Merged: what's here now holds theirs; if ours had more, the next backup sends it on top of their revision.
    s.sent[c.key] = { fp: '', rev: one.json.rev };
  }
  saveSyncState(s);
  if (newer.length) {
    renderAll({ keepTyping: true });
    scheduleBackup(newer.map((c) => c.key), 500);
  }
  renderAccount();
}

// ------------------------------------------------------------------ the panel
function showAccount() {
  let pop = document.getElementById('msgLog');
  const was = pop && pop.dataset.kind;
  if (pop) pop.remove();
  if (was === 'account') return;
  pop = document.createElement('div');
  pop.id = 'msgLog';
  pop.dataset.kind = 'account';
  pop.className = 'msg-log guide account-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Account');
  const bar = document.querySelector('.side-nav');
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  pop.style.top = `${narrow && bar ? Math.max(8, Math.round(bar.getBoundingClientRect().bottom) + 8) : 56}px`;
  document.body.appendChild(pop);
  renderAccount();
  if (account.user) pullChanges().catch((e) => { account.error = e.message; renderAccount(); });
  const first = pop.querySelector('input');
  if (first) first.focus();
}

const acctWhen = (t) => (t ? new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
const acctSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function accountHtml() {
  const u = account.user;
  const head = `<div class="msg-head"><b>Account</b><button class="btn sm" data-act="account" data-arg="close" aria-label="Close">✕</button></div>`;
  if (!u) {
    const reg = account.view === 'register';
    return `${head}
      <p>With an account, every character in this browser is backed up to this sheet's server, and can be restored on
      your other devices. Without one, the sheet works just the same: characters stay in this browser.</p>
      ${account.google ? `<p><a class="btn" href="api/auth/google">Sign in with Google</a></p><p class="faint">or with an e-mail and password:</p>` : ''}
      <form data-acct-form="${reg ? 'register' : 'login'}" class="acct-form">
        <label>E-mail <input name="email" type="email" autocomplete="email" required></label>
        <label>Password <input name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" minlength="${reg ? 8 : 1}" required></label>
        ${reg ? '<label>Name (optional) <input name="name" autocomplete="name" maxlength="80"></label>' : ''}
        <button class="btn primary" type="submit">${reg ? 'Create account' : 'Sign in'}</button>
        ${account.signup || !reg ? `<button class="linklike" type="button" data-act="account" data-arg="${reg ? 'view-signin' : 'view-register'}">${reg ? 'I have an account: sign in' : 'New here? Create an account'}</button>` : ''}
      </form>
      ${!account.signup && reg ? '<p class="faint">New accounts are closed on this server.</p>' : ''}
      ${account.formError ? `<p class="bad-text" role="alert">${esc(account.formError)}</p>` : ''}
      <p class="faint">Forgot your password? Ask whoever runs this server to reset it.</p>`;
  }
  const s = syncState();
  const here = Object.keys(state.snapshots);
  const list = account.list || [];
  const onServer = new Map(list.map((c) => [c.key, c]));
  const backedUp = here.filter((k) => s.sent[k] && onServer.has(k) && s.sent[k].rev === onServer.get(k).rev && s.sent[k].fp === acctFingerprint(k));
  const missing = list.filter((c) => !state.snapshots[c.key]);
  let status;
  if (s.auto === null && here.length) {
    status = `<p><b>Back up this browser's ${plural(here.length, 'character')} to ${esc(u.email)}?</b> From then on, every change is
      backed up a few seconds after you make it.</p>
      <p><button class="btn primary" data-act="account" data-arg="auto-on">Back them up</button>
      <button class="btn" data-act="account" data-arg="auto-off">Not on this device</button></p>`;
  } else if (s.auto === false) {
    status = `<p>Characters in this browser aren't backed up to this account. <button class="linklike" data-act="account" data-arg="auto-on">Back them up</button></p>`;
  } else {
    const pending = here.length - backedUp.length;
    status = `<p>${account.error ? `<span class="bad-text">Backup waiting: ${esc(account.error)}</span>`
      : account.busy ? 'Backing up…'
        : pending && account.list ? `${plural(pending, 'character')} to back up.`
          : here.length ? `${here.length === 1 ? 'The character' : `All ${here.length} characters`} in this browser backed up${account.lastOk ? ` (${acctWhen(account.lastOk)})` : ''}.` : 'Nothing in this browser to back up yet.'}
      ${here.length ? '<button class="linklike" data-act="account" data-arg="backup-now">Back up now</button>' : ''}</p>`;
  }
  const rows = list.map((c) => {
    const isHere = !!state.snapshots[c.key];
    const vs = account.versions && account.versions.key === c.key ? account.versions.list : null;
    return `<li><b>${esc(c.name || 'Unnamed')}</b>${c.summary ? ` <span class="faint">${esc(c.summary)}</span>` : ''}
      <div class="faint">backed up ${acctWhen(c.updatedAt)} · ${acctSize(c.size)}${isHere ? ' · in this browser' : ''}</div>
      <div class="acct-row-acts">${isHere ? '' : `<button class="btn sm" data-act="account" data-arg="restore:${esc(encodeURIComponent(c.key))}">Restore</button>`}
      <button class="btn sm" data-act="account" data-arg="versions:${esc(encodeURIComponent(c.key))}">Earlier backups</button>
      <button class="btn sm acct-danger" data-act="account" data-arg="${account.confirmDelete === c.key ? 'delete-yes' : 'delete'}:${esc(encodeURIComponent(c.key))}">${account.confirmDelete === c.key ? 'Really delete from the server?' : 'Delete from server'}</button></div>
      ${vs ? `<ul class="acct-versions">${vs.length ? vs.map((v) => `<li>${acctWhen(v.savedAt)} · ${acctSize(v.size)}
        <button class="btn sm" data-act="account" data-arg="version:${esc(encodeURIComponent(c.key))}:${v.rev}">Restore this</button></li>`).join('') : '<li class="faint">None: this is the only one.</li>'}</ul>` : ''}</li>`;
  }).join('');
  const usage = account.usage ? `<p class="faint">${plural(account.usage.count, 'character')}, ${acctSize(account.usage.bytes)} of ${acctSize(account.usage.maxBytes)}.</p>` : '';
  return `${head}
    <p>Signed in as <b>${esc(u.name || u.email)}</b>${u.name ? ` (${esc(u.email)})` : ''}.</p>
    ${status}
    <h4>On the server</h4>
    ${account.list === null ? '<p class="faint">Loading…</p>' : list.length ? `${missing.length > 1 ? `<p><button class="btn sm" data-act="account" data-arg="restore-all">Restore all ${missing.length} not in this browser</button></p>` : ''}<ul class="acct-list">${rows}</ul>${usage}` : '<p class="faint">No characters backed up yet.</p>'}
    <p class="faint">Restoring merges a backup into this browser: where both have changes, the newer ones are kept, part by part.</p>
    <details class="acct-settings"><summary>Sign-in and account</summary>
      <form data-acct-form="password" class="acct-form">
        ${u.hasPassword ? '<label>Current password <input name="current" type="password" autocomplete="current-password" required></label>' : ''}
        <label>${u.hasPassword ? 'New password' : 'Set a password'} <input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
        <button class="btn sm" type="submit">${u.hasPassword ? 'Change password' : 'Set password'}</button>
      </form>
      ${account.google ? (u.hasGoogle
    ? `<p>Google sign-in is on. ${u.hasPassword ? '<button class="linklike" data-act="account" data-arg="unlink-google">Turn it off</button>' : ''}</p>`
    : '<p><a class="btn sm" href="api/auth/google?link=1">Add Google sign-in</a></p>') : ''}
      <p><button class="btn sm" data-act="account" data-arg="end-others">Sign out on other devices</button></p>
      <form data-acct-form="delete" class="acct-form">
        <p class="faint">Deleting the account deletes every backup on the server. Characters in this browser stay.</p>
        ${u.hasPassword ? '<label>Password <input name="password" type="password" autocomplete="current-password" required></label>'
    : `<label>Type ${esc(u.email)} to confirm <input name="email" autocomplete="off" required></label>`}
        <button class="btn sm acct-danger" type="submit">Delete account</button>
      </form>
    </details>
    ${account.formError ? `<p class="bad-text" role="alert">${esc(account.formError)}</p>` : ''}
    <p><button class="btn" data-act="account" data-arg="logout">Sign out</button> <span class="faint">Characters stay in this browser.</span></p>`;
}

function renderAccount() {
  const item = document.getElementById('accountItem');
  if (item) {
    const s = account.user ? syncState() : null;
    item.textContent = !account.user ? 'Account: sign in to back up…' : account.error ? 'Account · backup waiting' : s && s.auto === null ? 'Account · back up?' : 'Account…';
  }
  const pop = document.getElementById('msgLog');
  if (!pop || pop.dataset.kind !== 'account') return;
  const focused = document.activeElement && pop.contains(document.activeElement) ? document.activeElement.name : null;
  const typed = Object.fromEntries([...pop.querySelectorAll('input')].map((i) => [i.closest('form') ? `${i.closest('form').dataset.acctForm}.${i.name}` : i.name, i.value]));
  const open = pop.querySelector('details.acct-settings') ? pop.querySelector('details.acct-settings').open : false;
  pop.innerHTML = accountHtml();
  // A redraw keeps what was being typed.
  for (const i of pop.querySelectorAll('input')) {
    const k = i.closest('form') ? `${i.closest('form').dataset.acctForm}.${i.name}` : i.name;
    if (typed[k] != null) i.value = typed[k];
    if (focused && i.name === focused) i.focus();
  }
  const det = pop.querySelector('details.acct-settings');
  if (det && open) det.open = true;
}

// ------------------------------------------------------------------ actions
async function accountAction(arg) {
  const [what, key, rev] = String(arg || '').split(':');
  const k = key ? decodeURIComponent(key) : null;
  account.formError = '';
  if (what === 'close') { const pop = document.getElementById('msgLog'); if (pop) pop.remove(); return; }
  if (!what || what === 'open') return showAccount();
  if (what === 'view-signin' || what === 'view-register') { account.view = what.slice(5); return renderAccount(); }
  if (!account.user) return showAccount();
  try {
    if (what === 'auto-on' || what === 'auto-off') {
      const s = syncState();
      s.auto = what === 'auto-on';
      saveSyncState(s);
      renderAccount();
      if (s.auto) {
        await pullChanges();
        const n = await backupNow({ all: true });
        setStatus(account.error ? `Backup waiting: ${account.error}` : `Backed up ${plural(n || 0, 'character')} to your account.`, account.error ? 'error' : '');
      }
    } else if (what === 'backup-now') {
      await pullChanges();
      const n = await backupNow({ all: true });
      setStatus(account.error ? `Backup waiting: ${account.error}` : n ? `Backed up ${plural(n, 'character')}.` : 'Everything was already backed up.', account.error ? 'error' : '');
    } else if (what === 'restore' || what === 'restore-all' || what === 'version') {
      const keys = what === 'restore-all' ? (account.list || []).filter((c) => !state.snapshots[c.key]).map((c) => c.key) : [k];
      const got = [];
      for (const one of keys) {
        const r = await acctApi('GET', what === 'version' ? `/api/characters/${encodeURIComponent(one)}/versions/${rev}` : `/api/characters/${encodeURIComponent(one)}`);
        if (!r.ok) throw new Error(r.json.error || `the server answered ${r.status}`);
        got.push(r.json);
      }
      const restored = await restoreBackups(got.map((x) => x.data));
      // A restored character counts as sent at its revision (an earlier backup restored is sent again as the newest).
      const s = syncState();
      if (what !== 'version') for (const x of got) for (const key2 of Object.keys(x.data.snapshots || {})) s.sent[key2] = { fp: acctFingerprint(key2), rev: x.rev };
      if (s.auto === null) s.auto = true;
      saveSyncState(s);
      if (restored.length) state.current = restored[0];
      await saveStore();
      renderAll();
      if (what === 'version') scheduleBackup(restored, 500);
      setStatus(what === 'version' ? `Restored the backup of ${acctWhen(got[0].savedAt)}, merged with what was here (newer changes kept).`
        : `Restored ${plural(restored.length, 'character')} from your account.`);
    } else if (what === 'versions') {
      if (account.versions && account.versions.key === k) account.versions = null;
      else {
        const r = await acctApi('GET', `/api/characters/${encodeURIComponent(k)}/versions`);
        account.versions = { key: k, list: r.ok ? r.json.versions : [] };
      }
    } else if (what === 'delete') {
      account.confirmDelete = k;
    } else if (what === 'delete-yes') {
      account.confirmDelete = null;
      const r = await acctApi('DELETE', `/api/characters/${encodeURIComponent(k)}`);
      if (!r.ok) throw new Error(r.json.error || `the server answered ${r.status}`);
      const s = syncState();
      delete s.sent[k];
      // Still in this browser and backing up: it would be sent again at the next change, so not until asked.
      saveSyncState(s);
      await pullChanges();
      setStatus(state.snapshots[k] ? 'Deleted from the server. It is still in this browser, and is backed up again when it changes.' : 'Deleted from the server.');
    } else if (what === 'unlink-google') {
      const r = await acctApi('POST', '/api/auth/google/unlink');
      if (!r.ok) throw new Error(r.json.error);
      account.user = r.json.user;
    } else if (what === 'end-others') {
      const r = await acctApi('POST', '/api/sessions/end-others');
      if (!r.ok) throw new Error(r.json.error);
      setStatus('Signed out on every other device.');
    } else if (what === 'logout') {
      await acctApi('POST', '/api/logout');
      clearTimeout(account.timer);
      account.user = null;
      account.list = null;
      account.waiting.clear();
      setStatus('Signed out. Characters stay in this browser.');
    }
  } catch (e) {
    account.formError = e.message;
  }
  renderAccount();
}

async function accountSubmit(form) {
  const kind = form.dataset.acctForm;
  const f = Object.fromEntries(new FormData(form).entries());
  account.formError = '';
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    let r;
    if (kind === 'login' || kind === 'register') {
      r = await acctApi('POST', kind === 'login' ? '/api/login' : '/api/register', f);
      if (!r.ok) throw new Error(r.json.error || `the server answered ${r.status}`);
      account.user = r.json.user;
      await afterSignIn();
      setStatus(kind === 'login' ? `Signed in as ${account.user.email}.` : `Account made: signed in as ${account.user.email}.`);
    } else if (kind === 'password') {
      r = await acctApi('POST', '/api/password', f);
      if (!r.ok) throw new Error(r.json.error);
      account.user = r.json.user;
      setStatus('Password saved. Other devices were signed out.');
    } else if (kind === 'delete') {
      r = await acctApi('POST', '/api/account/delete', f);
      if (!r.ok) throw new Error(r.json.error);
      try { localStorage.removeItem(syncKey()); } catch (e) { /* fine */ }
      account.user = null;
      account.list = null;
      setStatus('Account deleted, with its backups. Characters in this browser stay.');
    }
  } catch (e) {
    account.formError = e.message;
  }
  renderAccount();
}

async function afterSignIn() {
  account.list = null;
  const s = syncState();
  // A browser with no characters yet has nothing to ask about: its characters are backed up as they come.
  if (s.auto === null && !Object.keys(state.snapshots).length) { s.auto = true; saveSyncState(s); }
  renderAccount();
  try {
    await pullChanges();
    if (s.auto) await backupNow({ all: true });
  } catch (e) {
    account.error = e.message;
  }
  renderAccount();
}

// ------------------------------------------------------------------ start
async function initAccount() {
  if (globalThis.SHEET_HEADLESS || typeof platform === 'undefined' || platform.name !== 'web' || !/^https?:$/.test(location.protocol)) return;
  let r;
  try { r = await acctApi('GET', '/api/me'); } catch (e) { return; }
  if (!r.ok || !('signup' in r.json)) return; // not served by the sheet's server
  account.server = true;
  account.user = r.json.user;
  account.google = !!r.json.google;
  account.signup = !!r.json.signup;
  document.documentElement.dataset.server = 'on';
  renderAccount();
  platform.storage.onChanged((changes) => {
    if (!account.user || !ACCOUNT_KEYS.some((k) => k in changes)) return;
    scheduleBackup(Object.keys(state.snapshots));
  });
  window.addEventListener('online', () => { if (account.user) backupNow(); });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest && e.target.closest('form[data-acct-form]');
    if (!form) return;
    e.preventDefault();
    accountSubmit(form);
  });
  // Back from Google.
  const params = new URLSearchParams(location.search);
  const outcome = params.get('account');
  if (outcome) {
    params.delete('account');
    const message = params.get('message');
    params.delete('message');
    history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : ''));
    if (outcome === 'error') { account.formError = message || 'Google sign-in failed.'; showAccount(); return; }
    setStatus(outcome === 'google-linked' ? 'Google sign-in added to your account.' : `Signed in as ${account.user ? account.user.email : ''}.`);
  }
  if (account.user) {
    await afterSignIn();
    if (outcome || syncState().auto === null) showAccount();
  }
}
