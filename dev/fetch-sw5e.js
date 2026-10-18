/* Fetches SW5E's data from its public data service (the one sw5e.com reads) into app/data/sw5e/, the copy that
 * comes with the sheet, and says what changed since the last copy.
 *
 *   node dev/fetch-sw5e.js            rules.json, catalog.json, the rule books and SW5E's credits
 *   node dev/fetch-sw5e.js --check    only say what changed; write nothing
 *
 * Written one entry per line, so a diff shows which classes, features or items SW5E changed. After a change, run
 * `node dev/engine-check.js` and `node dev/regress.js`: SW5E's recorded results were computed with the old data, so
 * record them again if the data the engine reads changed (dev/README.md).
 * SW5E's data is its authors' (app/data/sw5e/README.md), not covered by the sheet's license.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('../app/sw5e-data.js');

const OUT = path.join(__dirname, '..', 'app', 'data', 'sw5e');
const BOOKS = path.join(OUT, 'books');

/** JSON with each entry of the big lists on its own line. */
function linesJson(obj, listsAt) {
  const one = (v) => JSON.stringify(v);
  const list = (a, pad) => (a.length ? `[\n${a.map((x) => pad + '  ' + one(x)).join(',\n')}\n${pad}]` : '[]');
  const parts = Object.entries(obj).map(([k, v]) => {
    if (k === listsAt && v && typeof v === 'object' && !Array.isArray(v)) {
      return `  ${one(k)}: {\n${Object.entries(v).map(([m, a]) => `    ${one(m)}: ${list(a, '    ')}`).join(',\n')}\n  }`;
    }
    return `  ${one(k)}: ${Array.isArray(v) && k === listsAt ? list(v, '  ') : one(v)}`;
  });
  return `{\n${parts.join(',\n')}\n}\n`;
}

const slug = (s) => String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const keyOf = (x) => [x.name, x.className, x.archetypeName, x.sourceName, x.level, x.type].filter((v) => v != null).join(' · ');

/** What changed in one list: names added, removed, changed. */
function listChanges(before, after) {
  const index = (a) => new Map((a || []).map((x, i) => [typeof x === 'object' && x ? keyOf(x) || String(i) : String(i), JSON.stringify(x)]));
  const b = index(before), a = index(after);
  const added = [...a.keys()].filter((k) => !b.has(k));
  const removed = [...b.keys()].filter((k) => !a.has(k));
  const changed = [...a.keys()].filter((k) => b.has(k) && b.get(k) !== a.get(k));
  return { added, removed, changed };
}
function report(label, ch) {
  const n = ch.added.length + ch.removed.length + ch.changed.length;
  if (!n) return 0;
  const few = (xs) => xs.slice(0, 6).join('; ') + (xs.length > 6 ? `; … ${xs.length - 6} more` : '');
  console.log(`${label}: ${[ch.added.length && `${ch.added.length} added (${few(ch.added)})`, ch.removed.length && `${ch.removed.length} removed (${few(ch.removed)})`, ch.changed.length && `${ch.changed.length} changed (${few(ch.changed)})`].filter(Boolean).join(', ')}`);
  return n;
}
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };

async function main() {
  const check = process.argv.includes('--check');
  console.log(`Fetching from ${D.SW5E_API} …`);
  const { rules, catalog } = await D.sw5eFetchRulesAndCatalog();
  const { books, credits } = await D.sw5eFetchBooks();
  const oldRules = readJson(path.join(OUT, 'rules.json'));
  const oldCatalog = readJson(path.join(OUT, 'catalog.json'));
  const oldIndex = readJson(path.join(BOOKS, 'index.json'));

  let changes = 0;
  if (oldRules && oldRules.dataVersion !== rules.dataVersion) console.log(`Data version: ${oldRules.dataVersion} → ${rules.dataVersion}`);
  for (const m of Object.keys(rules.modules)) changes += report(`rules ${m}`, listChanges(oldRules && oldRules.modules[m], rules.modules[m]));
  changes += report('items', listChanges(oldCatalog && oldCatalog.items, catalog.items));
  const bookFiles = {};
  const index = {};
  for (const [key, b] of Object.entries(books)) {
    index[key] = { title: b.title, chapters: [] };
    // Chapters with no text (the handbook's Preface) are left out.
    b.chapters.filter((c) => c.markdown.trim()).forEach((c, i) => {
      const file = `${key}/${String(i).padStart(2, '0')}-${slug(c.name) || 'chapter'}.md`;
      bookFiles[file] = c.markdown.replace(/\r\n?/g, '\n').replace(/\s*$/, '\n');
      index[key].chapters.push({ number: c.number, name: c.name, file });
    });
  }
  for (const [file, text] of Object.entries(bookFiles)) {
    const was = fs.existsSync(path.join(BOOKS, file)) ? fs.readFileSync(path.join(BOOKS, file), 'utf8') : null;
    if (was !== text) { changes++; console.log(`${was == null ? 'new' : 'changed'} book chapter: ${file}`); }
  }
  if (oldIndex) for (const b of Object.values(oldIndex)) for (const c of b.chapters) if (!bookFiles[c.file]) { changes++; console.log(`book chapter gone: ${c.file}`); }
  const creditsText = credits.replace(/\r\n?/g, '\n');
  const oldCredits = fs.existsSync(path.join(OUT, 'credits.md')) ? fs.readFileSync(path.join(OUT, 'credits.md'), 'utf8') : null;
  if (oldCredits !== creditsText) { changes++; console.log(oldCredits == null ? 'new: credits.md' : 'changed: credits.md'); }

  if (!changes) {
    console.log(`No changes: SW5E's data is as kept (version ${rules.dataVersion}).`);
    return 0;
  }
  if (check) { console.log(`${changes} change(s); nothing written (--check).`); return 1; }
  // Same data, new fetch time only: keep the file as it was.
  const keepTime = (old, now, list) => (old && JSON.stringify(old[list]) === JSON.stringify(now[list]) && old.dataVersion === now.dataVersion ? { ...now, fetchedAt: old.fetchedAt } : now);
  fs.mkdirSync(BOOKS, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'rules.json'), linesJson(keepTime(oldRules, rules, 'modules'), 'modules'));
  fs.writeFileSync(path.join(OUT, 'catalog.json'), linesJson(keepTime(oldCatalog, catalog, 'items'), 'items'));
  if (oldIndex) for (const b of Object.values(oldIndex)) for (const c of b.chapters) if (!bookFiles[c.file]) fs.rmSync(path.join(BOOKS, c.file), { force: true });
  for (const [file, text] of Object.entries(bookFiles)) {
    fs.mkdirSync(path.dirname(path.join(BOOKS, file)), { recursive: true });
    fs.writeFileSync(path.join(BOOKS, file), text);
  }
  fs.writeFileSync(path.join(BOOKS, 'index.json'), JSON.stringify(index, null, 1) + '\n');
  fs.writeFileSync(path.join(OUT, 'credits.md'), creditsText);
  console.log(`Wrote app/data/sw5e/ (version ${rules.dataVersion}): ${changes} change(s). Now: node dev/engine-check.js && node dev/regress.js`);
  return 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 2; });
