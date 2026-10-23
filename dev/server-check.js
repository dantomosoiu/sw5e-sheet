/* The server's check: starts server/server.js on a free port with a new database in a temporary folder (and a stand-in
 * for Google's token service), then goes through every API as a browser would: accounts, sign-in, sessions, Google
 * sign-in and linking, character backups with conflicts and versions, the request guards and the static files.
 *
 *   node dev/server-check.js        (exit code 1 when a check fails)
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer, loadConfig } = require('../server/server');

let failed = 0;
const ok = (cond, what) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) failed++; };

/** A browser: keeps its cookies, sends the sheet's header on changes. */
function browser(base) {
  const jar = {};
  const req = async (method, p, body, { header = true, origin } = {}) => {
    const headers = { cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (header && method !== 'GET') headers['x-sheet'] = '1';
    if (origin) headers.origin = origin;
    const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      const v = kv.slice(i + 1);
      if (/Max-Age=0/.test(c)) delete jar[kv.slice(0, i)]; else jar[kv.slice(0, i)] = v;
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  };
  return { req, jar };
}

const backupOf = (key, name, note) => ({
  format: 'sw5e-sheet-backup', version: 1, exportedAt: 1,
  snapshots: { [key]: { format: 'sw5e-sheet-snapshot', key, raw: { name, note }, loadedAt: 1 } },
  trackers: {}, edits: {}, itemState: {}, history: {}, portraits: {}, rolls: [],
});

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-server-'));
  const web = path.join(dir, 'web');
  fs.mkdirSync(web);
  fs.writeFileSync(path.join(web, 'index.html'), '<!doctype html><title>sheet</title>');
  fs.writeFileSync(path.join(dir, 'secret.txt'), 'outside the web folder');
  // Google's token service: the ID token it returns for the code "code-<sub>-<email>".
  let nonce = null;
  const fakeGoogle = async (url, opts) => {
    const code = new URLSearchParams(opts.body).get('code');
    const [, sub, email] = /^code-([^-]+)-(.+)$/.exec(code) || [];
    const claims = { iss: 'https://accounts.google.com', aud: 'gid', exp: Date.now() / 1000 + 600, sub, email, email_verified: true, name: 'G User', nonce };
    const jwt = ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.');
    return new Response(JSON.stringify({ id_token: jwt }), { status: 200 });
  };
  const cfg = loadConfig({ PORT: '0', DATA_DIR: path.join(dir, 'data'), STATIC_DIR: web, GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'gsecret', MAX_CHARACTERS: '3', ATTEMPTS_PER_ADDRESS: '1000', ATTEMPTS_PER_EMAIL: '12' });
  const server = createServer(cfg, { fetchImpl: fakeGoogle, log: () => {} });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  cfg.publicUrl = base;
  try {
    const a = browser(base);
    let r = await a.req('GET', '/api/me');
    ok(r.status === 200 && r.json.user === null && r.json.google === true && r.json.signup === true, 'me: signed out, Google and sign-up on');

    // Accounts
    r = await a.req('POST', '/api/register', { email: 'a@example.com', password: 'short' });
    ok(r.status === 400, 'register: a short password is refused');
    r = await a.req('POST', '/api/register', { email: 'not-an-email', password: 'long enough' });
    ok(r.status === 400, 'register: a bad e-mail is refused');
    r = await a.req('POST', '/api/register', { email: 'a@example.com', password: 'password-a' }, { header: false });
    ok(r.status === 403, "register: without the sheet's header, refused");
    r = await a.req('POST', '/api/register', { email: 'a@example.com', password: 'password-a' }, { origin: 'https://evil.example' });
    ok(r.status === 403, 'register: from another origin, refused');
    r = await a.req('POST', '/api/register', { email: 'a@example.com', password: 'password-a', name: 'Alice' });
    ok(r.status === 200 && r.json.user.email === 'a@example.com' && r.json.user.hasPassword && a.jar.sid, 'register: account made and signed in');
    r = await a.req('GET', '/api/me');
    ok(r.json.user && r.json.user.name === 'Alice', 'me: signed in');
    r = await browser(base).req('POST', '/api/register', { email: 'A@Example.com', password: 'password-x' });
    ok(r.status === 409, 'register: the same e-mail in other case, refused');

    const b = browser(base);
    r = await b.req('POST', '/api/login', { email: 'a@example.com', password: 'wrong-pass' });
    ok(r.status === 401 && !b.jar.sid, 'login: a wrong password is refused');
    r = await b.req('POST', '/api/login', { email: 'nobody@example.com', password: 'whatever1' });
    ok(r.status === 401 && r.json.error === 'Wrong e-mail or password.', "login: an unknown e-mail says the same");
    r = await b.req('POST', '/api/login', { email: 'a@example.com', password: 'password-a' });
    ok(r.status === 200 && b.jar.sid && b.jar.sid !== a.jar.sid, 'login: a second browser signed in');
    const cookie = r.headers.getSetCookie()[0];
    ok(/HttpOnly/.test(cookie) && /SameSite=Lax/.test(cookie), 'session cookie: HttpOnly, SameSite=Lax');

    // Characters
    r = await browser(base).req('GET', '/api/characters');
    ok(r.status === 401, 'characters: signed out, refused');
    r = await a.req('PUT', '/api/characters/k1', { ifRev: null, name: 'Kira', summary: 'Consular 5', data: backupOf('k1', 'Kira', 'one') });
    ok(r.status === 200 && r.json.rev === 1, 'put: first backup, revision 1');
    r = await a.req('PUT', '/api/characters/k1', { ifRev: null, data: backupOf('k1', 'Kira', 'stale') });
    ok(r.status === 409 && r.json.current && r.json.current.rev === 1 && r.json.current.data.snapshots.k1.raw.note === 'one', 'put: written by another device since, 409 with the newer one');
    r = await b.req('PUT', '/api/characters/k1', { ifRev: 1, name: 'Kira', data: backupOf('k1', 'Kira', 'two') });
    ok(r.status === 200 && r.json.rev === 2, 'put: from the other browser, revision 2');
    r = await a.req('PUT', '/api/characters/k1', { ifRev: 1, data: backupOf('k1', 'Kira', 'three') });
    ok(r.status === 409 && r.json.current.rev === 2, 'put: the first browser, behind, gets 409');
    r = await a.req('PUT', '/api/characters/k1', { ifRev: 2, name: 'Kira', data: backupOf('k1', 'Kira', 'three') });
    ok(r.status === 200 && r.json.rev === 3, 'put: after merging, revision 3');
    r = await a.req('PUT', '/api/characters/k1', { ifRev: 3, name: 'Kira', data: backupOf('k1', 'Kira', 'three') });
    ok(r.status === 200 && r.json.rev === 3, 'put: the same backup again, no new revision');
    r = await a.req('PUT', '/api/characters/k2', { ifRev: null, data: backupOf('k1', 'Wrong', 'x') });
    ok(r.status === 400, 'put: a backup of another character is refused');
    r = await a.req('PUT', '/api/characters/k2', { ifRev: null, data: { hello: 1 } });
    ok(r.status === 400, 'put: not a backup, refused');
    r = await a.req('GET', '/api/characters');
    ok(r.status === 200 && r.json.characters.length === 1 && r.json.characters[0].name === 'Kira' && r.json.characters[0].rev === 3 && r.json.usage.count === 1, 'list: one character, its name and revision');
    r = await a.req('GET', '/api/characters/k1');
    ok(r.json.data.snapshots.k1.raw.note === 'three', 'get: the latest backup');
    r = await a.req('GET', '/api/characters/k1/versions');
    ok(r.json.versions.map((v) => v.rev).join() === '2,1', 'versions: the two earlier ones, newest first');
    r = await a.req('GET', '/api/characters/k1/versions/1');
    ok(r.json.data.snapshots.k1.raw.note === 'one', 'version 1: as it was');
    for (const k of ['k2', 'k3']) await a.req('PUT', `/api/characters/${k}`, { ifRev: null, data: backupOf(k, k, '') });
    r = await a.req('PUT', '/api/characters/k4', { ifRev: null, data: backupOf('k4', 'k4', '') });
    ok(r.status === 413, 'put: past the account\'s character limit, refused');
    r = await a.req('DELETE', '/api/characters/k3');
    r = await a.req('GET', '/api/characters/k3');
    ok(r.status === 404, 'delete: gone');
    r = await a.req('PUT', '/api/characters/k%2Fslash', { ifRev: null, data: backupOf('k/slash', 'Slash', '') });
    ok(r.status === 200, 'put: a key with a slash, encoded');

    // Someone else's account sees none of it.
    const c = browser(base);
    await c.req('POST', '/api/register', { email: 'c@example.com', password: 'password-c' });
    r = await c.req('GET', '/api/characters/k1');
    ok(r.status === 404, "another account: can't read them");
    r = await c.req('GET', '/api/characters');
    ok(r.json.characters.length === 0, 'another account: its list is empty');

    // Passwords and sessions
    r = await a.req('POST', '/api/password', { current: 'wrong', password: 'password-a2' });
    ok(r.status === 401, 'password: the wrong current password is refused');
    r = await a.req('POST', '/api/password', { current: 'password-a', password: 'password-a2' });
    ok(r.status === 200, 'password: changed');
    r = await b.req('GET', '/api/me');
    ok(r.json.user === null, 'password change: the other browser is signed out');
    r = await a.req('GET', '/api/me');
    ok(r.json.user !== null, 'password change: this browser stays signed in');
    r = await b.req('POST', '/api/login', { email: 'a@example.com', password: 'password-a2' });
    ok(r.status === 200, 'login: with the new password');

    // Google
    const g = browser(base);
    r = await g.req('GET', '/api/auth/google');
    const loc = new URL(r.headers.get('location'));
    ok(r.status === 303 && loc.hostname === 'accounts.google.com' && loc.searchParams.get('client_id') === 'gid'
      && loc.searchParams.get('redirect_uri') === `${base}/api/auth/google/callback` && g.jar.g_flow, 'google: sent to Google with a state cookie');
    const state = loc.searchParams.get('state');
    nonce = loc.searchParams.get('nonce');
    r = await g.req('GET', `/api/auth/google/callback?state=wrong&code=code-111-g@example.com`);
    ok(r.status === 303 && /account=error/.test(r.headers.get('location')) && !g.jar.sid, 'google: a wrong state is refused');
    r = await g.req('GET', '/api/auth/google');
    let l2 = new URL(r.headers.get('location'));
    nonce = l2.searchParams.get('nonce');
    r = await g.req('GET', `/api/auth/google/callback?state=${l2.searchParams.get('state')}&code=code-111-g@example.com`);
    ok(/account=signed-in/.test(r.headers.get('location')) && g.jar.sid, 'google: a new account, signed in');
    r = await g.req('GET', '/api/me');
    ok(r.json.user && r.json.user.email === 'g@example.com' && r.json.user.hasGoogle && !r.json.user.hasPassword, 'google: the account has Google, no password');
    r = await browser(base).req('POST', '/api/login', { email: 'g@example.com', password: 'anything1' });
    ok(r.status === 401 && /Google/.test(r.json.error), 'login: a Google-only account says to use Google');
    r = await g.req('POST', '/api/auth/google/unlink');
    ok(r.status === 400, "google: can't unlink without a password");
    // Google with the e-mail of a password account: not joined.
    const h = browser(base);
    r = await h.req('GET', '/api/auth/google');
    l2 = new URL(r.headers.get('location'));
    nonce = l2.searchParams.get('nonce');
    r = await h.req('GET', `/api/auth/google/callback?state=${l2.searchParams.get('state')}&code=code-222-a@example.com`);
    ok(/account=error/.test(r.headers.get('location')) && !h.jar.sid, "google: a password account's e-mail is not joined by itself");
    // ...but linked from inside that account.
    r = await a.req('GET', '/api/auth/google?link=1');
    l2 = new URL(r.headers.get('location'));
    nonce = l2.searchParams.get('nonce');
    r = await a.req('GET', `/api/auth/google/callback?state=${l2.searchParams.get('state')}&code=code-222-a@example.com`);
    ok(/account=google-linked/.test(r.headers.get('location')), 'google: linked from the signed-in account');
    r = await h.req('GET', '/api/auth/google');
    l2 = new URL(r.headers.get('location'));
    nonce = l2.searchParams.get('nonce');
    r = await h.req('GET', `/api/auth/google/callback?state=${l2.searchParams.get('state')}&code=code-222-a@example.com`);
    r = await h.req('GET', '/api/me');
    ok(r.json.user && r.json.user.email === 'a@example.com', 'google: now signs in to that account');
    r = await a.req('POST', '/api/auth/google/unlink');
    ok(r.status === 200 && !r.json.user.hasGoogle, 'google: unlinked (the account has a password)');
    // A replayed callback (the nonce no longer matches) is refused.
    r = await h.req('GET', '/api/auth/google');
    l2 = new URL(r.headers.get('location'));
    nonce = 'another';
    r = await h.req('GET', `/api/auth/google/callback?state=${l2.searchParams.get('state')}&code=code-333-z@example.com`);
    ok(/account=error/.test(r.headers.get('location')), 'google: a token for another sign-in is refused');
    void state;

    // Signing out, deleting
    r = await c.req('POST', '/api/logout');
    r = await c.req('GET', '/api/me');
    ok(r.json.user === null && !c.jar.sid, 'logout: signed out');
    r = await a.req('POST', '/api/account/delete', { password: 'nope' });
    ok(r.status === 401, 'delete account: the wrong password is refused');
    r = await a.req('POST', '/api/account/delete', { password: 'password-a2' });
    ok(r.status === 200, 'delete account: done');
    r = await b.req('GET', '/api/characters');
    ok(r.status === 401, "delete account: its other sessions are gone");
    r = await browser(base).req('POST', '/api/login', { email: 'a@example.com', password: 'password-a2' });
    ok(r.status === 401, 'delete account: it no longer signs in');
    const left = server.store.db.prepare('SELECT COUNT(*) AS n FROM characters').get().n + server.store.db.prepare('SELECT COUNT(*) AS n FROM versions').get().n;
    ok(left === 0, 'delete account: its backups and versions are gone');

    // Static files
    r = await a.req('GET', '/');
    ok(r.status === 200 && /<title>sheet/.test(r.text) && r.headers.get('x-content-type-options') === 'nosniff', 'static: the page');
    r = await a.req('GET', '/../secret.txt');
    ok(r.status === 404, 'static: nothing outside the web folder');
    r = await a.req('GET', '/%2e%2e/secret.txt');
    ok(r.status === 404, 'static: nor with an encoded ..');
    r = await a.req('GET', '/api/characters/%E0%A4%A');
    ok(r.status === 400 || r.status === 401, 'api: a malformed key is a 400, not a server error');
    r = await a.req('GET', '/api/nothing');
    ok(r.status === 404 && r.json.error, 'api: an unknown path is a JSON 404');

    // Too many attempts
    const z = browser(base);
    let last = null;
    for (let i = 0; i < 14; i++) last = await z.req('POST', '/api/login', { email: 'limit@example.com', password: 'wrong-pass' });
    ok(last.status === 429, 'login: too many attempts on one e-mail, 429');
  } finally {
    server.close();
    server.store.db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(failed ? `\n${failed} failed.` : '\nAll passed.');
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 2; });
