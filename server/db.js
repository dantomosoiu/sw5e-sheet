/* The server's database: accounts, sign-in sessions and each account's character backups, in one SQLite file
 * (Node's built-in node:sqlite, so the server needs no packages).
 *
 *   users        an account: e-mail, a password hash (scrypt) and/or a Google account id
 *   sessions     a signed-in browser: the hash of its cookie's token, until it expires
 *   characters   an account's backup of one character: the sheet's own backup format for that character (what
 *                "Back up this character" saves), with a revision number that rises on every write
 *   versions     earlier backups of a character (the last VERSIONS_KEPT), to go back to
 */
'use strict';
const { DatabaseSync } = require('node:sqlite');

const VERSIONS_KEPT = 20;

function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS characters (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      name TEXT,
      summary TEXT,
      rev INTEGER NOT NULL,
      size INTEGER NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, key)
    );
    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      rev INTEGER NOT NULL,
      size INTEGER NOT NULL,
      data TEXT NOT NULL,
      saved_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS versions_by_character ON versions(user_id, key, rev);
    CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions(user_id);
  `);
  const q = (sql) => db.prepare(sql);
  const st = {
    userById: q('SELECT * FROM users WHERE id = ?'),
    userByEmail: q('SELECT * FROM users WHERE email = ?'),
    userByGoogle: q('SELECT * FROM users WHERE google_sub = ?'),
    addUser: q('INSERT INTO users (email, name, password_hash, google_sub, created_at) VALUES (?, ?, ?, ?, ?)'),
    setPassword: q('UPDATE users SET password_hash = ? WHERE id = ?'),
    setGoogle: q('UPDATE users SET google_sub = ? WHERE id = ?'),
    setName: q('UPDATE users SET name = ? WHERE id = ?'),
    seen: q('UPDATE users SET last_seen_at = ? WHERE id = ?'),
    deleteUser: q('DELETE FROM users WHERE id = ?'),
    listUsers: q(`SELECT u.id, u.email, u.name, u.password_hash IS NOT NULL AS has_password, u.google_sub IS NOT NULL AS has_google,
      u.created_at, u.last_seen_at, COUNT(c.key) AS characters, COALESCE(SUM(c.size), 0) AS bytes
      FROM users u LEFT JOIN characters c ON c.user_id = u.id GROUP BY u.id ORDER BY u.id`),
    addSession: q('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
    session: q('SELECT * FROM sessions WHERE token_hash = ?'),
    extendSession: q('UPDATE sessions SET expires_at = ? WHERE token_hash = ?'),
    deleteSession: q('DELETE FROM sessions WHERE token_hash = ?'),
    deleteUserSessions: q('DELETE FROM sessions WHERE user_id = ?'),
    deleteOtherSessions: q('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?'),
    expireSessions: q('DELETE FROM sessions WHERE expires_at < ?'),
    listCharacters: q('SELECT key, name, summary, rev, size, updated_at FROM characters WHERE user_id = ? ORDER BY updated_at DESC'),
    character: q('SELECT * FROM characters WHERE user_id = ? AND key = ?'),
    usage: q('SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM characters WHERE user_id = ?'),
    putCharacter: q(`INSERT INTO characters (user_id, key, name, summary, rev, size, data, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, key) DO UPDATE SET name = excluded.name, summary = excluded.summary, rev = excluded.rev,
      size = excluded.size, data = excluded.data, updated_at = excluded.updated_at`),
    deleteCharacter: q('DELETE FROM characters WHERE user_id = ? AND key = ?'),
    addVersion: q('INSERT INTO versions (user_id, key, rev, size, data, saved_at) VALUES (?, ?, ?, ?, ?, ?)'),
    trimVersions: q(`DELETE FROM versions WHERE user_id = ? AND key = ? AND id NOT IN
      (SELECT id FROM versions WHERE user_id = ? AND key = ? ORDER BY rev DESC LIMIT ${VERSIONS_KEPT})`),
    listVersions: q('SELECT rev, size, saved_at FROM versions WHERE user_id = ? AND key = ? ORDER BY rev DESC'),
    version: q('SELECT * FROM versions WHERE user_id = ? AND key = ? AND rev = ?'),
    deleteVersions: q('DELETE FROM versions WHERE user_id = ? AND key = ?'),
  };

  return {
    db,
    st,
    /** Write a character's backup: the one it replaces becomes a version. Returns the new revision. */
    putCharacter(userId, key, { name, summary, data }, now) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const old = st.character.get(userId, key);
        const rev = old ? old.rev + 1 : 1;
        if (old) {
          st.addVersion.run(userId, key, old.rev, old.size, old.data, old.updated_at);
          st.trimVersions.run(userId, key, userId, key);
        }
        st.putCharacter.run(userId, key, name, summary, rev, Buffer.byteLength(data), data, now);
        db.exec('COMMIT');
        return rev;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    deleteCharacter(userId, key) {
      st.deleteCharacter.run(userId, key);
      st.deleteVersions.run(userId, key);
    },
    /** A copy of the whole database (for backups), made while it runs. */
    backupTo(file) {
      db.prepare('VACUUM INTO ?').run(file);
    },
  };
}

module.exports = { openDb, VERSIONS_KEPT };
