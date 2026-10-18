/* Checks the sheet's own rules engine (sw5e-sheet/engine.js) against SW5E's: each character SW5E has computed is
 * computed again by the engine, and every number compared.
 *
 *   node dev/engine-check.js [--show=N] [--field=<path part>] [--case=<name part>]
 *
 * SW5E's results come from:
 *   - the regression cases (dev/regress/cases/): each test character as stored, with the sheet's effects and
 *     without any tweaks, as SW5E computed them when the case was recorded;
 *   - dev/engine/sw5e-results.json: characters made up to cover the rules (classes and levels, species, armor,
 *     weapons, tweaks…), computed by sw5e.com through the extension (dev/engine-record.js in the dev page).
 * Fields the engine doesn't compute yet are counted as "not yet", not as wrong.
 * Needs SW5E's rules and item data in dev/dumps/ (see dev/README.md).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadSheet } = require('./headless');
const { flatten, NUMBER_FIELDS, NUMBER_SKIP } = require('./regress');
const E = require('../sw5e-sheet/engine.js');

const DEV = __dirname;
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** path → value for a computed sheet's numbers (the regression report's "Numbers" part). */
function numbers(complete) {
  const lines = [];
  for (const f of NUMBER_FIELDS) if (complete && complete[f] !== undefined) flatten(complete[f], f, lines, NUMBER_SKIP);
  const out = {};
  for (const l of lines) { const i = l.indexOf(' = '); out[l.slice(0, i)] = l.slice(i + 3); }
  return out;
}

/** The pairs (character → SW5E's numbers) from the regression cases. */
async function casePairs(data) {
  const dir = path.join(DEV, 'regress', 'cases');
  const pairs = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const c = readJson(path.join(dir, f));
    const sheet = loadSheet({ storage: c.storage, now: c.recordedAt });
    await sheet.ready;
    sheet.ctx.__rules = data.rulesText;
    sheet.ctx.__catalog = data.catalogText;
    sheet.get('state.rules = JSON.parse(__rules); setCatalog(JSON.parse(__catalog)); delete globalThis.__rules; delete globalThis.__catalog');
    const state = sheet.get('state');
    const snap = state.snapshots[c.key];
    if (snap.complete) pairs.push({ label: `${c.name}: stored`, raw: snap.raw, sw5e: numbers(snap.complete) });
    const d = state.derived[c.key];
    if (d && sheet.get('needsDerived')(c.key)) {
      const { fx } = sheet.get('derivedInputs')(c.key);
      if (sheet.get('freshComputed')(c.key, fx.raw)) {
        // Plain JSON: the engine runs outside the sheet's context.
        pairs.push({ label: `${c.name}: with effects`, raw: JSON.parse(JSON.stringify(fx.raw)), sw5e: numbers(d.complete) });
        if (d.base) pairs.push({ label: `${c.name}: without tweaks`, raw: JSON.parse(JSON.stringify(fx.baseRaw)), sw5e: numbers(d.base) });
      }
    }
  }
  return pairs;
}

function recordedPairs() {
  const f = path.join(DEV, 'engine', 'sw5e-results.json');
  if (!fs.existsSync(f)) return [];
  return readJson(f).results.map((r) => ({ label: r.label, raw: r.raw, sw5e: r.numbers }));
}

/**
 * Keeps the numbers of a recording (dev/engine-record.js) in dev/engine/sw5e-results.json, and says what SW5E
 * computes differently from the last recording kept (sw5e.com's engine or data changed).
 */
function importRecording(file) {
  const rec = readJson(file);
  const outFile = path.join(DEV, 'engine', 'sw5e-results.json');
  const before = fs.existsSync(outFile) ? new Map(readJson(outFile).results.map((r) => [r.label, r.numbers])) : new Map();
  const results = [];
  const changed = [];
  const failed = [];
  for (const r of rec.results) {
    if (!r.complete) { failed.push(`${r.label}: ${r.error || 'no result'}`); continue; }
    const nums = numbers(r.complete);
    const old = before.get(r.label);
    if (old) {
      for (const p of new Set(Object.keys(old).concat(Object.keys(nums)))) if (old[p] !== nums[p]) changed.push(`${r.label} · ${p}: ${old[p]} → ${nums[p]}`);
    }
    results.push({ label: r.label, raw: r.raw, numbers: nums });
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  // One character per line: a new recording's changes show per character.
  const lines = results.map((r) => JSON.stringify(r));
  fs.writeFileSync(outFile, `{"recordedAt":${JSON.stringify(rec.recordedAt)},"sw5e":${JSON.stringify(rec.meta || null)},"results":[\n${lines.join(',\n')}\n]}\n`);
  console.log(`${results.length} characters kept in dev/engine/sw5e-results.json${failed.length ? `; ${failed.length} SW5E couldn't compute` : ''}.`);
  for (const f of failed.slice(0, 10)) console.log(`  not computed: ${f}`);
  if (before.size) {
    console.log(changed.length ? `SW5E computes ${changed.length} numbers differently than in the last recording:` : 'SW5E computes the same as in the last recording.');
    for (const c of changed.slice(0, 30)) console.log(`  ${c}`);
    if (changed.length > 30) console.log(`  … ${changed.length - 30} more`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === 'import') { importRecording(args[1] || path.join(DEV, 'dumps', 'engine-sw5e.json')); return 0; }
  const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const show = Number(opt('show', 8));
  const fieldFilter = opt('field', null);
  const caseFilter = opt('case', null);
  const rulesFile = path.join(DEV, 'dumps', 'rules.json');
  const catalogFile = path.join(DEV, 'dumps', 'catalog.json');
  if (!fs.existsSync(rulesFile) || !fs.existsSync(catalogFile)) { console.log('Needs dev/dumps/rules.json and catalog.json (see dev/README.md).'); return 2; }
  const rulesText = fs.readFileSync(rulesFile, 'utf8');
  const catalogText = fs.readFileSync(catalogFile, 'utf8');
  const data = { rules: JSON.parse(rulesText), catalog: JSON.parse(catalogText), rulesText, catalogText };
  const ctx = E.engContext({ rules: data.rules.modules || data.rules, catalog: data.catalog.items || data.catalog });

  let pairs = (await casePairs(data)).concat(recordedPairs());
  if (caseFilter) pairs = pairs.filter((p) => p.label.toLowerCase().includes(caseFilter.toLowerCase()));
  // By group: the field's first part (abilityScores.X.skills → "skills").
  const group = (p) => {
    const x = /^abilityScores\.\w+\.(savingThrow|skills)/.exec(p);
    return x ? x[1] : /^abilityScores\.\w+\.(value|modifier)$/.test(p) ? 'abilities' : p.split(/[.[]/)[0];
  };
  const stats = {};
  const wrong = {};
  const missing = {};
  const showMissing = args.includes('--missing');
  let failed = 0;
  for (const pr of pairs) {
    let got;
    try { got = numbers(E.engCompute(pr.raw, ctx)); } catch (e) { failed++; console.log(`ENGINE FAILED on ${pr.label}: ${e.stack.split('\n').slice(0, 2).join(' ')}`); continue; }
    for (const [p, want] of Object.entries(pr.sw5e)) {
      if (fieldFilter && !p.includes(fieldFilter)) continue;
      const g = group(p);
      const s = stats[g] || (stats[g] = { same: 0, wrong: 0, notYet: 0 });
      if (!(p in got)) { s.notYet++; if (showMissing) (missing[g] || (missing[g] = [])).push(`${pr.label} · ${p}: SW5E ${want}`); continue; }
      if (got[p] === want) { s.same++; continue; }
      s.wrong++;
      (wrong[g] || (wrong[g] = [])).push(`${pr.label} · ${p}: SW5E ${want}, engine ${got[p]}`);
    }
  }
  let same = 0, bad = 0, notYet = 0;
  console.log(`${pairs.length} characters computed by SW5E${failed ? `, ${failed} failed in the engine` : ''}\n`);
  console.log('field group           same   wrong  not yet');
  for (const [g, s] of Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]))) {
    same += s.same; bad += s.wrong; notYet += s.notYet;
    console.log(`${g.padEnd(20)} ${String(s.same).padStart(6)} ${String(s.wrong).padStart(7)} ${String(s.notYet).padStart(8)}`);
  }
  console.log(`${'all'.padEnd(20)} ${String(same).padStart(6)} ${String(bad).padStart(7)} ${String(notYet).padStart(8)}`);
  for (const [g, list] of Object.entries(wrong)) {
    console.log(`\n${g}: ${list.length} wrong`);
    for (const l of list.slice(0, show)) console.log(`  ${l}`);
  }
  for (const [g, list] of Object.entries(missing)) {
    console.log(`
${g}: ${list.length} not computed yet`);
    for (const l of list.slice(0, show)) console.log(`  ${l}`);
  }
  return bad || failed ? 1 : 0;
}

if (require.main === module) main().then((c) => { process.exitCode = c; }, (e) => { console.error(e); process.exitCode = 2; });
module.exports = { numbers, casePairs };
