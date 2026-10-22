/* What a change does to a character: the sheet's own code (in Node, as dev/regress.js) draws a recorded test
 * character, applies the change, draws it again, and prints what changed: the numbers, the effects and tweaks sent
 * to the rules engine, every roll, and the hover explanation of each changed number.
 *
 *   node dev/bump-check.js <case> --feat "Tough" [--feat …] [--item "Strength Enhancer" [--attune | --equip]] …
 *   node dev/bump-check.js <case> --js '<code>'           any change, see below
 *   node dev/bump-check.js --list                          the recorded characters, with class, species, level
 *
 * <case>: a recorded character (dev/regress/cases/<name>.json: armstech-test-local, kadro-vos-panel…) or a path.
 * Changes, applied in order to the stored character before the second drawing:
 *   --feat NAME              a feat taken at the first class's next improvement (SW5E's {type: 'Feat', name})
 *   --item NAME              an item from SW5E's catalog, carried; add --equip or --attune right after it
 *   --species NAME           another species
 *   --js CODE                JavaScript with `raw` (the character as the sheet shows it: SW5E's character JSON —
 *                            classes, equipment, species, customFeats, tweaks… — with the fields the sheet has edited
 *                            in their place), `edits`, `itemState` (the sheet's own stored data for it), `catalog` (SW5E's
 *                            items) and the helpers addFeat(name, classIndex), addItem(name, { equipped, attuned }).
 * Options: --full prints both reports whole (to dist/bump-check/), not only the lines that changed.
 *          --save NAME keeps the changed character as a regression case (dev/regress/cases/NAME.json); accept its
 *          output with `node dev/regress.js --update NAME` once it's right, so a fixed bug stays fixed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadSheet } = require('./headless');
const { report, diffLines } = require('./regress');

const CASES = path.join(__dirname, 'regress', 'cases');
const CATALOG = path.join(__dirname, '..', 'app', 'data', 'sw5e', 'catalog.json');
const OUT = path.join(__dirname, '..', 'dist', 'bump-check');

function usage(msg) {
  if (msg) console.error(msg);
  console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\* ?/, ''));
  process.exit(2);
}

function readCase(name) {
  const file = fs.existsSync(name) ? name : path.join(CASES, `${name.replace(/\.json$/, '')}.json`);
  if (!fs.existsSync(file)) usage(`No recorded character ${name}; see --list.`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function catalogItems() {
  const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  return Array.isArray(cat) ? cat : cat.items || Object.values(cat);
}

/** The changes from the command line, as one function over the stored character. */
function changesFrom(args, catalog) {
  const steps = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const val = () => { if (i + 1 >= args.length) usage(`${a} needs a value`); return args[++i]; };
    if (a === '--feat') { const n = val(); steps.push((h) => h.addFeat(n)); }
    else if (a === '--item') {
      const n = val();
      const opts = {};
      while (args[i + 1] === '--equip' || args[i + 1] === '--attune') opts[args[++i] === '--equip' ? 'equipped' : 'attuned'] = true;
      steps.push((h) => h.addItem(n, opts));
    } else if (a === '--species') { const n = val(); steps.push((h) => { h.raw.species = { ...(h.raw.species || {}), name: n, abilityScoreImprovement: {} }; }); }
    else if (a === '--js') {
      const code = val();
      steps.push((h) => new Function('raw', 'edits', 'itemState', 'catalog', 'addFeat', 'addItem', code)(h.raw, h.edits, h.itemState, catalog, h.addFeat, h.addItem));
    } else if (a === '--save') val();
    else if (a !== '--full') usage(`Unknown option ${a}`);
  }
  return steps;
}

function applyChanges(storage, key, steps, catalog) {
  const snap = storage.snapshots[key];
  storage.edits = storage.edits || {};
  storage.itemState = storage.itemState || {};
  const edits = (storage.edits[key] = storage.edits[key] || {});
  // The character as the sheet shows it: a field the sheet has edited (edits.fields.classes…) replaces SW5E's, so
  // reads and writes go to the edited copy when there is one.
  const fields = edits.fields || null;
  const raw = new Proxy(snap.raw, {
    get: (t, k) => (fields && k in fields ? fields[k] : t[k]),
    set: (t, k, v) => { if (fields && k in fields) fields[k] = v; else t[k] = v; return true; },
  });
  const h = {
    raw,
    edits,
    itemState: (storage.itemState[key] = storage.itemState[key] || {}),
    addFeat(name, classIndex = 0) {
      const cls = raw.classes[classIndex];
      if (!cls) throw new Error(`No class ${classIndex}`);
      (cls.abilityScoreImprovements = cls.abilityScoreImprovements || []).push({ type: 'Feat', name });
    },
    addItem(name, opts = {}) {
      const it = catalog.find((x) => x && x.name === name);
      if (!it) throw new Error(`No item "${name}" in SW5E's catalog`);
      // SW5E's catalog: plain equipment has an equipmentCategory, enhanced items a type (AdventuringGear, Weapon…).
      const entry = { name, quantity: 1, category: it.equipmentCategory ? 'Equipment' : 'EnhancedItem' };
      if (opts.equipped) entry.equipped = true;
      if (opts.attuned) entry.attuned = true;
      (raw.equipment = raw.equipment || []).push(entry);
    },
  };
  for (const step of steps) step(h);
}

async function draw(c, storage) {
  const sheet = loadSheet({ storage, now: c.recordedAt || Date.UTC(2026, 0, 1) });
  await sheet.ready;
  await sheet.get('ensureSw5eData()');
  await sheet.get('loadRollLog()');
  return { text: report(sheet, c.key), errors: sheet.errors };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('-h') || args.includes('--help')) usage();
  if (args[0] === '--list') {
    for (const f of fs.readdirSync(CASES).filter((f) => f.endsWith('.json')).sort()) {
      const c = JSON.parse(fs.readFileSync(path.join(CASES, f), 'utf8'));
      const raw = c.storage.snapshots[c.key].raw;
      const classes = (raw.classes || []).map((k) => `${k.name} ${k.levels}`).join(' / ');
      console.log(`${f.replace(/\.json$/, '').padEnd(24)} ${raw.name} · ${(raw.species || {}).name || '?'} · ${classes}`);
    }
    return 0;
  }
  const c = readCase(args[0]);
  const catalog = catalogItems();
  const steps = changesFrom(args.slice(1), catalog);
  if (!steps.length) usage('Give at least one change (--feat, --item, --species, --js).');
  const before = await draw(c, JSON.parse(JSON.stringify(c.storage)));
  const changed = JSON.parse(JSON.stringify(c.storage));
  applyChanges(changed, c.key, steps, catalog);
  const after = await draw(c, changed);
  if (args.includes('--save')) {
    const name = args[args.indexOf('--save') + 1];
    const file = path.join(CASES, `${name}.json`);
    const changes = args.slice(1).filter((x, i, all) => x !== '--save' && all[i - 1] !== '--save' && x !== '--full');
    fs.writeFileSync(file, JSON.stringify({ ...c, name, from: { case: args[0], changes }, storage: changed }, null, 1) + '\n');
    console.log(`Saved as ${path.relative(process.cwd(), file)}; accept it with: node dev/regress.js --update ${name}`);
  }
  if (args.includes('--full')) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'before.txt'), before.text);
    fs.writeFileSync(path.join(OUT, 'after.txt'), after.text);
    console.log(`Both reports: ${path.relative(process.cwd(), OUT)}/before.txt and after.txt`);
  }
  // The changed lines, under the heading of the part they're in.
  const diff = diffLines(before.text.split('\n'), after.text.split('\n'));
  let heading = '';
  let shown = '';
  for (const { op, line } of diff) {
    if (op === ' ') { if (/^## /.test(line)) heading = line; continue; }
    // Not about the numbers: the stored data and history (Settings), and whether SW5E's recorded calculation is current.
    if (/Settings, Tweaks & Data/.test(heading) || /^The sheet's engine computes the numbers/.test(line)) continue;
    if (heading !== shown) { console.log(`\n${heading}`); shown = heading; }
    console.log(`${op} ${line}`);
  }
  if (!diff.some((d) => d.op !== ' ')) console.log('Nothing changed.');
  for (const e of after.errors || []) console.log(`ERROR: ${e}`);
  return 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 2; });
