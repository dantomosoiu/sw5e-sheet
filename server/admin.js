/* The server's admin commands, run on the server itself (same settings as server.js: environment or ENV_FILE).
 *
 *   node server/admin.js users                       every account: sign-in ways, characters, space, last seen
 *   node server/admin.js reset-password <e-mail>     a new random password (printed once), every session signed out
 *   node server/admin.js sign-out <e-mail>           every session of the account signed out
 *   node server/admin.js delete-user <e-mail> --yes  the account and all its backups
 *   node server/admin.js backup <file>               a copy of the database, made while the server runs
 *
 * There is no e-mail sending: a player who forgets a password asks the server's owner for a reset.
 */
'use strict';
const path = require('node:path');
const crypto = require('node:crypto');
const { loadConfig } = require('./server');
const { openDb } = require('./db');
const auth = require('./auth');

function main(argv) {
  const [cmd, arg] = argv;
  const cfg = loadConfig();
  const store = openDb(path.join(cfg.dataDir, 'sheet.db'));
  const user = () => {
    const u = arg && store.st.userByEmail.get(arg);
    if (!u) { console.error(`No account with the e-mail "${arg || ''}".`); process.exit(1); }
    return u;
  };
  const when = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') : '-');
  switch (cmd) {
    case 'users': {
      const rows = store.st.listUsers.all();
      for (const r of rows) {
        const ways = [r.has_password ? 'password' : '', r.has_google ? 'Google' : ''].filter(Boolean).join('+') || 'none';
        console.log(`${String(r.id).padStart(4)}  ${r.email}  ${ways}  ${r.characters} characters, ${(r.bytes / 1048576).toFixed(1)} MB`
          + `  created ${when(r.created_at)}  seen ${when(r.last_seen_at)}`);
      }
      console.log(`${rows.length} accounts.`);
      break;
    }
    case 'reset-password': {
      const u = user();
      const password = crypto.randomBytes(9).toString('base64url');
      store.st.setPassword.run(auth.hashPassword(password), u.id);
      store.st.deleteUserSessions.run(u.id);
      console.log(`New password for ${u.email}: ${password}\nGive it to them privately; they can change it under Account.`);
      break;
    }
    case 'sign-out': {
      const u = user();
      store.st.deleteUserSessions.run(u.id);
      console.log(`Signed out every session of ${u.email}.`);
      break;
    }
    case 'delete-user': {
      const u = user();
      if (!argv.includes('--yes')) { console.error(`This deletes ${u.email} and every backup it holds. Add --yes to do it.`); process.exit(1); }
      store.st.deleteUser.run(u.id);
      console.log(`Deleted ${u.email}.`);
      break;
    }
    case 'backup': {
      if (!arg) { console.error('Usage: node server/admin.js backup <file>'); process.exit(1); }
      store.backupTo(path.resolve(arg));
      console.log(`Database copied to ${path.resolve(arg)}.`);
      break;
    }
    default:
      console.log(require('node:fs').readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\* ?|^ \* ?/gm, ''));
  }
  store.db.close();
}

main(process.argv.slice(2));
