/* Signing in: passwords, sessions and Google sign-in, with Node's own crypto (no packages).
 *
 * Passwords are kept as scrypt hashes ("scrypt$N$r$p$salt$hash"). A session is a random token in an HttpOnly cookie;
 * the database keeps only its SHA-256, so a copy of the database signs no one in. Google sign-in is OpenID Connect's
 * authorization code flow: the browser goes to Google, comes back with a code, and the server exchanges it for an ID
 * token straight from Google (over TLS, with the client secret), so the token's claims are checked but its signature
 * needn't be (OpenID Connect Core 3.1.3.7).
 */
'use strict';
const crypto = require('node:crypto');

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const SESSION_DAYS = 30;
const DAY = 24 * 3600 * 1000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

function checkPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, salt, hash] = parts;
  const want = Buffer.from(hash, 'base64');
  const got = crypto.scryptSync(password, Buffer.from(salt, 'base64'), want.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(want, got);
}

/** The same work as checking a password, for an e-mail with no account: the answer takes as long either way. */
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');

function newSession(store, userId, now) {
  const token = randomToken();
  store.st.addSession.run(sha256(token), userId, now, now + SESSION_DAYS * DAY);
  return token;
}

/** The signed-in user for a session token, or null. A session used in its second half is extended. */
function sessionUser(store, token, now) {
  if (!token) return null;
  const h = sha256(token);
  const s = store.st.session.get(h);
  if (!s) return null;
  if (s.expires_at < now) { store.st.deleteSession.run(h); return null; }
  if (s.expires_at - now < (SESSION_DAYS / 2) * DAY) store.st.extendSession.run(now + SESSION_DAYS * DAY, h);
  return store.st.userById.get(s.user_id) || null;
}

// ------------------------------------------------------------------ Google
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

/** Where to send the browser to sign in with Google. */
function googleAuthUrl(cfg, state, nonce) {
  const u = new URL(GOOGLE_AUTH);
  u.search = new URLSearchParams({
    client_id: cfg.googleClientId,
    redirect_uri: cfg.publicUrl + '/api/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account',
  }).toString();
  return u.href;
}

/** The code Google sent back → the account's claims ({ sub, email, email_verified, name }), checked. */
async function googleClaims(cfg, code, nonce, fetchImpl = fetch) {
  const res = await fetchImpl(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.googleClientId,
      client_secret: cfg.googleClientSecret,
      redirect_uri: cfg.publicUrl + '/api/auth/google/callback',
      grant_type: 'authorization_code',
    }).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id_token) throw new Error('Google refused the sign-in' + (body.error ? ` (${body.error})` : ''));
  const payload = String(body.id_token).split('.')[1];
  const c = JSON.parse(Buffer.from(payload || '', 'base64url').toString('utf8'));
  const now = Date.now() / 1000;
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(c.iss)) throw new Error('not a Google token');
  if (c.aud !== cfg.googleClientId) throw new Error('the token is for another app');
  if (!(c.exp > now)) throw new Error('the token has expired');
  if (c.nonce !== nonce) throw new Error('the sign-in was not started here');
  if (!c.sub || !c.email) throw new Error('Google gave no account id or e-mail');
  return { sub: String(c.sub), email: String(c.email), email_verified: c.email_verified === true || c.email_verified === 'true', name: c.name ? String(c.name) : null };
}

module.exports = { hashPassword, checkPassword, DUMMY_HASH, sha256, randomToken, newSession, sessionUser, googleAuthUrl, googleClaims, SESSION_DAYS, DAY };
