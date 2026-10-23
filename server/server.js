/* The sheet's server: serves the web version (dist/web/, built by dev/build.py) and, for players who make an account,
 * keeps a backup of their characters (docs/server.md). The sheet works the same without an account; signed in, every
 * character in the browser is backed up here and can be restored on any device.
 *
 *   node server/server.js          (settings from the environment or an env file, see loadConfig)
 *
 * No packages: Node's own http, crypto and sqlite (Node 22.13 or later).
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { openDb } = require('./db');
const auth = require('./auth');

const ROOT = path.resolve(__dirname, '..');

/**
 * Settings, from the environment (and ENV_FILE, a file of KEY=value lines, if set):
 *   PORT (8780), HOST (127.0.0.1: the proxy in front reaches it; 0.0.0.0 to be reached directly)
 *   PUBLIC_URL      the address players use, e.g. https://sheet.example.com (cookies, Google's redirect)
 *   DATA_DIR        where the database lives (server/data)
 *   STATIC_DIR      the web version to serve (dist/web)
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   Google sign-in (off without them)
 *   ALLOW_SIGNUP    "false" closes new accounts (existing ones still sign in)
 *   TRUST_PROXY     "true" behind a proxy (Caddy): the player's address comes from X-Forwarded-For
 *   MAX_CHARACTERS (300), MAX_ACCOUNT_MB (300), MAX_CHARACTER_MB (15)
 *   ATTEMPTS_PER_ADDRESS (20), ATTEMPTS_PER_EMAIL (10): sign-in and account forms per 15 minutes
 */
function loadConfig(env = process.env) {
  const e = { ...env };
  if (e.ENV_FILE && fs.existsSync(e.ENV_FILE)) {
    for (const line of fs.readFileSync(e.ENV_FILE, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#') && e[m[1]] === undefined) e[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  const port = Number(e.PORT) || 8780;
  const host = e.HOST || '127.0.0.1';
  const publicUrl = String(e.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, '');
  return {
    port,
    host,
    publicUrl,
    secure: publicUrl.startsWith('https://'),
    dataDir: path.resolve(ROOT, e.DATA_DIR || 'server/data'),
    staticDir: path.resolve(ROOT, e.STATIC_DIR || 'dist/web'),
    googleClientId: e.GOOGLE_CLIENT_ID || '',
    googleClientSecret: e.GOOGLE_CLIENT_SECRET || '',
    allowSignup: e.ALLOW_SIGNUP !== 'false',
    trustProxy: e.TRUST_PROXY === 'true',
    maxCharacters: Number(e.MAX_CHARACTERS) || 300,
    maxAccountBytes: (Number(e.MAX_ACCOUNT_MB) || 300) * 1024 * 1024,
    maxCharacterBytes: (Number(e.MAX_CHARACTER_MB) || 15) * 1024 * 1024,
    attemptsPerAddress: Number(e.ATTEMPTS_PER_ADDRESS) || 20,
    attemptsPerEmail: Number(e.ATTEMPTS_PER_EMAIL) || 10,
  };
}

// ------------------------------------------------------------------ small helpers
class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
const fail = (status, message, extra) => { throw new HttpError(status, message, extra); };

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Attempts per address (and per e-mail) in a window: sign-in and account forms. */
function rateLimiter(max, windowMs) {
  const hits = new Map();
  return (id, now) => {
    const list = (hits.get(id) || []).filter((t) => now - t < windowMs);
    list.push(now);
    hits.set(id, list);
    if (hits.size > 10000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return list.length <= max;
  };
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const publicUser = (u) => (u ? { id: u.id, email: u.email, name: u.name || null, hasPassword: !!u.password_hash, hasGoogle: !!u.google_sub } : null);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};

// ------------------------------------------------------------------ the server
function createServer(cfg, { now = () => Date.now(), fetchImpl = fetch, log = console.log } = {}) {
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  const store = openDb(path.join(cfg.dataDir, 'sheet.db'));
  const google = !!(cfg.googleClientId && cfg.googleClientSecret);
  const perAddress = rateLimiter(cfg.attemptsPerAddress, 15 * 60 * 1000);
  const perEmail = rateLimiter(cfg.attemptsPerEmail, 15 * 60 * 1000);
  const expire = setInterval(() => store.st.expireSessions.run(now()), 3600 * 1000);
  expire.unref();

  const cookie = (name, value, maxAgeS) => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeS}${cfg.secure ? '; Secure' : ''}`;
  const sessionCookie = (token) => cookie('sid', token, auth.SESSION_DAYS * 24 * 3600);
  const clearCookie = (name) => cookie(name, '', 0);

  const addressOf = (req) => (cfg.trustProxy && req.headers['x-forwarded-for']
    ? String(req.headers['x-forwarded-for']).split(',').pop().trim() : req.socket.remoteAddress) || '?';

  function limited(req, email) {
    const t = now();
    if (!perAddress(addressOf(req), t) || (email && !perEmail(String(email).toLowerCase(), t))) {
      fail(429, 'Too many attempts. Wait a few minutes and try again.');
    }
  }

  async function jsonBody(req, limit = 64 * 1024) {
    const text = await readBody(req, limit);
    try { return text ? JSON.parse(text) : {}; } catch (e) { return fail(400, 'Not JSON.'); }
  }

  function send(res, status, body, headers = {}) {
    const text = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
    res.end(text);
  }
  function redirect(res, to, headers = {}) {
    res.writeHead(303, { location: to, 'cache-control': 'no-store', ...headers });
    res.end();
  }

  /** The signed-in user, or a 401. */
  function needUser(req) {
    const u = auth.sessionUser(store, parseCookies(req.headers.cookie).sid, now());
    if (!u) fail(401, 'Sign in first.');
    store.st.seen.run(now(), u.id);
    return u;
  }
  const userOf = (req) => auth.sessionUser(store, parseCookies(req.headers.cookie).sid, now());

  /** A new session for the user: the cookie to set. */
  const signIn = (user) => [sessionCookie(auth.newSession(store, user.id, now()))];

  // A character's backup as the sheet makes it: { format: 'sw5e-sheet-backup', snapshots: { [key]: … }, … }.
  function checkBackup(key, data) {
    if (!data || typeof data !== 'object' || data.format !== 'sw5e-sheet-backup' || !data.snapshots || typeof data.snapshots !== 'object') {
      fail(400, "Not a character backup from the sheet.");
    }
    const keys = Object.keys(data.snapshots);
    if (keys.length !== 1 || keys[0] !== key) fail(400, 'A backup here holds exactly the one character it is for.');
  }

  const routes = [];
  const route = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern}$`), fn });

  route('GET', '/api/me', (req, res) => send(res, 200, { user: publicUser(userOf(req)), google, signup: cfg.allowSignup }));

  route('POST', '/api/register', async (req, res) => {
    const b = await jsonBody(req);
    limited(req, b.email);
    if (!cfg.allowSignup) fail(403, 'New accounts are closed on this server.');
    const email = String(b.email || '').trim();
    const password = String(b.password || '');
    if (!EMAIL_RE.test(email)) fail(400, "That isn't an e-mail address.");
    if (password.length < 8) fail(400, 'Use a password of at least 8 characters.');
    if (password.length > 200) fail(400, 'That password is too long.');
    if (store.st.userByEmail.get(email)) fail(409, 'There is already an account with that e-mail. Sign in instead.');
    const name = String(b.name || '').trim().slice(0, 80) || null;
    const id = Number(store.st.addUser.run(email, name, auth.hashPassword(password), null, now()).lastInsertRowid);
    const user = store.st.userById.get(id);
    send(res, 200, { user: publicUser(user) }, { 'set-cookie': signIn(user) });
  });

  route('POST', '/api/login', async (req, res) => {
    const b = await jsonBody(req);
    limited(req, b.email);
    const user = store.st.userByEmail.get(String(b.email || '').trim());
    const ok = auth.checkPassword(String(b.password || ''), user ? user.password_hash || auth.DUMMY_HASH : auth.DUMMY_HASH);
    if (!user || !user.password_hash || !ok) {
      fail(401, user && !user.password_hash ? 'This account signs in with Google.' : 'Wrong e-mail or password.');
    }
    send(res, 200, { user: publicUser(user) }, { 'set-cookie': signIn(user) });
  });

  route('POST', '/api/logout', (req, res) => {
    const sid = parseCookies(req.headers.cookie).sid;
    if (sid) store.st.deleteSession.run(auth.sha256(sid));
    send(res, 200, { ok: true }, { 'set-cookie': clearCookie('sid') });
  });

  route('POST', '/api/password', async (req, res) => {
    const u = needUser(req);
    const b = await jsonBody(req);
    limited(req, u.email);
    const password = String(b.password || '');
    if (u.password_hash && !auth.checkPassword(String(b.current || ''), u.password_hash)) fail(401, 'The current password is wrong.');
    if (password.length < 8 || password.length > 200) fail(400, 'Use a password of at least 8 characters.');
    store.st.setPassword.run(auth.hashPassword(password), u.id);
    // Other browsers signed in with the old password are signed out.
    store.st.deleteOtherSessions.run(u.id, auth.sha256(parseCookies(req.headers.cookie).sid));
    send(res, 200, { user: publicUser(store.st.userById.get(u.id)) });
  });

  route('POST', '/api/sessions/end-others', (req, res) => {
    const u = needUser(req);
    store.st.deleteOtherSessions.run(u.id, auth.sha256(parseCookies(req.headers.cookie).sid));
    send(res, 200, { ok: true });
  });

  route('POST', '/api/account/delete', async (req, res) => {
    const u = needUser(req);
    const b = await jsonBody(req);
    limited(req, u.email);
    if (u.password_hash ? !auth.checkPassword(String(b.password || ''), u.password_hash)
      : String(b.email || '').trim().toLowerCase() !== u.email.toLowerCase()) {
      fail(401, u.password_hash ? 'The password is wrong.' : "Type the account's e-mail to confirm.");
    }
    store.st.deleteUser.run(u.id);
    log(`account ${u.id} deleted`);
    send(res, 200, { ok: true }, { 'set-cookie': clearCookie('sid') });
  });

  // Google: /api/auth/google starts (link=1: add Google to the signed-in account), the callback finishes.
  route('GET', '/api/auth/google', (req, res, url) => {
    if (!google) fail(404, 'Google sign-in is not set up on this server.');
    const link = url.searchParams.get('link') === '1';
    if (link) needUser(req);
    const state = auth.randomToken();
    const nonce = auth.randomToken();
    redirect(res, auth.googleAuthUrl(cfg, state, nonce), { 'set-cookie': cookie('g_flow', `${state}.${nonce}.${link ? 1 : 0}`, 600) });
  });

  route('GET', '/api/auth/google/callback', async (req, res, url) => {
    let extra = []; // the session cookie, once signed in
    const back = (outcome, message) => redirect(res, `/?account=${outcome}${message ? `&message=${encodeURIComponent(message)}` : ''}`,
      { 'set-cookie': extra.concat(clearCookie('g_flow')) });
    try {
      if (!google) fail(404, 'Google sign-in is not set up on this server.');
      const [state, nonce, link] = String(parseCookies(req.headers.cookie).g_flow || '').split('.');
      if (!state || url.searchParams.get('state') !== state) fail(400, 'The sign-in expired or was started elsewhere. Try again.');
      if (url.searchParams.get('error')) fail(400, 'Google sign-in was cancelled.');
      limited(req);
      const c = await auth.googleClaims(cfg, String(url.searchParams.get('code') || ''), nonce, fetchImpl);
      const byGoogle = store.st.userByGoogle.get(c.sub);
      if (link === '1') {
        const u = needUser(req);
        if (byGoogle && byGoogle.id !== u.id) fail(409, 'That Google account already signs in to another account here.');
        store.st.setGoogle.run(c.sub, u.id);
        return back('google-linked');
      }
      if (byGoogle) { extra = signIn(byGoogle); return back('signed-in'); }
      if (!c.email_verified) fail(400, 'Google says that e-mail is not verified.');
      if (store.st.userByEmail.get(c.email)) {
        // Joining them by e-mail would let anyone who made an account with someone else's e-mail into theirs.
        fail(409, 'An account with this e-mail signs in with a password. Sign in with it, then add Google under Account.');
      }
      if (!cfg.allowSignup) fail(403, 'New accounts are closed on this server.');
      const id = Number(store.st.addUser.run(c.email, c.name, null, c.sub, now()).lastInsertRowid);
      extra = signIn(store.st.userById.get(id));
      return back('signed-in');
    } catch (e) {
      if (!(e instanceof HttpError)) log('google sign-in failed:', e.message);
      return back('error', e instanceof HttpError ? e.message : `Google sign-in failed: ${e.message}`);
    }
  });

  route('POST', '/api/auth/google/unlink', (req, res) => {
    const u = needUser(req);
    if (!u.password_hash) fail(400, 'Set a password first: without Google or a password, the account could not be signed in to.');
    store.st.setGoogle.run(null, u.id);
    send(res, 200, { user: publicUser(store.st.userById.get(u.id)) });
  });

  // Characters
  const charRow = (r) => ({ key: r.key, name: r.name, summary: r.summary, rev: r.rev, size: r.size, updatedAt: r.updated_at });
  route('GET', '/api/characters', (req, res) => {
    const u = needUser(req);
    const usage = store.st.usage.get(u.id);
    send(res, 200, {
      characters: store.st.listCharacters.all(u.id).map(charRow),
      usage: { count: usage.count, bytes: usage.bytes, maxCount: cfg.maxCharacters, maxBytes: cfg.maxAccountBytes },
    });
  });

  route('GET', '/api/characters/([^/]+)', (req, res, url, key) => {
    const u = needUser(req);
    const r = store.st.character.get(u.id, key);
    if (!r) fail(404, 'No backup of that character.');
    send(res, 200, { ...charRow(r), data: JSON.parse(r.data) });
  });

  route('PUT', '/api/characters/([^/]+)', async (req, res, url, key) => {
    const u = needUser(req);
    if (key.length > 300) fail(400, 'That character key is too long.');
    const b = await jsonBody(req, cfg.maxCharacterBytes + 64 * 1024);
    checkBackup(key, b.data);
    const data = JSON.stringify(b.data);
    const size = Buffer.byteLength(data);
    if (size > cfg.maxCharacterBytes) fail(413, 'This character is too large to back up here.');
    const old = store.st.character.get(u.id, key);
    // Written from the backup this browser last saw: if another device wrote since, it gets the newer one to merge.
    const ifRev = b.ifRev == null ? null : Number(b.ifRev);
    if ((old ? old.rev : null) !== ifRev) {
      return send(res, 409, { error: 'Changed on another device.', current: old ? { ...charRow(old), data: JSON.parse(old.data) } : null });
    }
    // The same as what's here (a device that merged and had nothing newer): nothing to write.
    if (old && old.data === data) return send(res, 200, { key, rev: old.rev, updatedAt: old.updated_at });
    const usage = store.st.usage.get(u.id);
    if (!old && usage.count >= cfg.maxCharacters) fail(413, `This account holds its maximum of ${cfg.maxCharacters} characters.`);
    if (usage.bytes - (old ? old.size : 0) + size > cfg.maxAccountBytes) fail(413, 'This account is full.');
    const rev = store.putCharacter(u.id, key, {
      name: String(b.name || '').slice(0, 120) || null, summary: String(b.summary || '').slice(0, 200) || null, data,
    }, now());
    send(res, 200, { key, rev, updatedAt: now() });
  });

  route('DELETE', '/api/characters/([^/]+)', (req, res, url, key) => {
    const u = needUser(req);
    store.deleteCharacter(u.id, key);
    send(res, 200, { ok: true });
  });

  route('GET', '/api/characters/([^/]+)/versions', (req, res, url, key) => {
    const u = needUser(req);
    send(res, 200, { versions: store.st.listVersions.all(u.id, key).map((v) => ({ rev: v.rev, size: v.size, savedAt: v.saved_at })) });
  });

  route('GET', '/api/characters/([^/]+)/versions/(\\d+)', (req, res, url, key, rev) => {
    const u = needUser(req);
    const v = store.st.version.get(u.id, key, Number(rev));
    if (!v) fail(404, 'No such version.');
    send(res, 200, { rev: v.rev, savedAt: v.saved_at, data: JSON.parse(v.data) });
  });

  // ---------------------------------------------------------------- static files
  const staticHeaders = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin',
    'x-frame-options': 'DENY',
  };
  function serveStatic(req, res, url) {
    if (req.method === 'POST' && url.pathname.endsWith('/share-target')) return redirect(res, '/'); // no offline worker yet
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, staticHeaders); return res.end(); }
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch (e) { rel = ''; }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(cfg.staticDir, '.' + rel);
    if (!file.startsWith(cfg.staticDir + path.sep) || rel.includes('\0')) { res.writeHead(404, staticHeaders); return res.end(); }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404, { ...staticHeaders, 'content-type': 'text/plain' }); return res.end('Not found'); }
      const base = path.basename(file);
      // The offline worker and the page are checked on every visit; the rest is fetched once per version by the worker.
      const fresh = ['sw.js', 'index.html', 'rules.html', 'manifest.webmanifest'].includes(base);
      res.writeHead(200, {
        ...staticHeaders,
        'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': stat.size,
        'cache-control': fresh ? 'no-cache' : 'public, max-age=3600',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  // ---------------------------------------------------------------- dispatch
  const server = http.createServer(async (req, res) => {
    const started = now();
    let url;
    try { url = new URL(req.url, cfg.publicUrl); } catch (e) { res.writeHead(400); return res.end(); }
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url);
    try {
      // Changes need the sheet's own header (a form or a page elsewhere can't send it without asking first) and,
      // when the browser says where it comes from, this server's address (PUBLIC_URL's, or the one it was asked at).
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const origin = req.headers.origin;
        const ours = (o) => { try { return o === new URL(cfg.publicUrl).origin || new URL(o).host === req.headers.host; } catch (e) { return false; } };
        if (req.headers['x-sheet'] !== '1' || (origin && !ours(origin))) fail(403, 'Not from the sheet.');
      }
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(url.pathname);
        if (!m) continue;
        let args;
        try { args = m.slice(1).map((x) => decodeURIComponent(x)); } catch (e) { fail(400, 'A malformed address.'); }
        await r.fn(req, res, url, ...args);
        return;
      }
      fail(404, 'No such API.');
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) log('error', req.method, url.pathname, e.stack || e.message);
      if (!res.headersSent) send(res, status, { error: status === 500 ? 'Something went wrong on the server.' : e.message, ...(e.extra || {}) });
      else res.end();
    } finally {
      if (url.pathname.startsWith('/api/')) log(`${req.method} ${url.pathname.replace(/\/api\/characters\/[^/]+/, '/api/characters/…')} ${res.statusCode} ${now() - started}ms`);
    }
  });
  server.store = store;
  return server;
}

if (require.main === module) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    console.error(`Node.js 22.13 or later is needed (its built-in SQLite); this is ${process.versions.node}.`);
    process.exit(1);
  }
  const cfg = loadConfig();
  if (!fs.existsSync(path.join(cfg.staticDir, 'index.html'))) {
    console.error(`No web version in ${cfg.staticDir}: run "python dev/build.py" first (or set STATIC_DIR).`);
    process.exit(1);
  }
  const server = createServer(cfg);
  server.listen(cfg.port, cfg.host, () => {
    console.log(`SW5E sheet server on http://${cfg.host}:${cfg.port}/ for ${cfg.publicUrl}`
      + ` (data: ${cfg.dataDir}; Google sign-in ${cfg.googleClientId && cfg.googleClientSecret ? 'on' : 'off'}; new accounts ${cfg.allowSignup ? 'open' : 'closed'})`);
  });
  const stop = () => server.close(() => { server.store.db.close(); process.exit(0); });
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

module.exports = { createServer, loadConfig };
