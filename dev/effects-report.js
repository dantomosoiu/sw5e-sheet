// Runs sw5e-sheet/effects.js over SW5E's item catalog and reports what it makes of each item.
// Usage: node dev/effects-report.js dev/dumps/catalog.json [--items] [--unhandled]
//   (dump the catalog from the dev page: see dev/README.md, "Dumps")
'use strict';
const fs = require('fs');
const path = require('path');
const { parseItemEffect, fxSentences } = require(path.join(__dirname, '..', 'sw5e-sheet', 'effects.js'));

const file = process.argv[2];
if (!file) { console.error('usage: node dev/effects-report.js <catalog.json> [--items] [--unhandled]'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const items = data.items || data;
const kind = (i) => i.type || 'Standard ' + i.equipmentCategory;

const byPath = {};
const byKind = {};
let withMods = 0, withNotes = 0, none = 0;
const lines = [];
for (const it of items) {
  const fx = parseItemEffect(it);
  const k = (byKind[kind(it)] = byKind[kind(it)] || { items: 0, mods: 0, notesOnly: 0 });
  k.items++;
  if (!fx) { none++; continue; }
  if (fx.mods.length) { withMods++; k.mods++; } else if (fx.notes.length) { withNotes++; k.notesOnly++; }
  for (const m of fx.mods) {
    const key = (m.cond ? '(conditional) ' : '') + m.path.replace(/(abilityScores\.)\w+/, '$1*').replace(/(skills\.).+/, '$1*').replace(/(forceCasting\.)(light|dark|universal)/, '$1*');
    byPath[key] = (byPath[key] || 0) + 1;
  }
  lines.push(`${it.name} [${kind(it)}; ${fx.activation}${fx.target !== 'self' ? '; on ' + fx.target : ''}${fx.duration ? '; ' + fx.duration : ''}] `
    + `${fx.mods.map((m) => m.label + (m.cap != null ? ` (max ${m.cap})` : '') + (m.cond ? ` [${m.cond}]` : '')).join(', ') || '-'}${fx.notes.length ? ` | ${fx.notes.length} note(s)` : ''}`);
}
console.log(`${items.length} items: ${withMods} with applied bonuses, ${withNotes} with notes only, ${none} with no effect\n`);
console.log('Applied bonuses by stat:');
for (const [p, n] of Object.entries(byPath).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${p}`);
console.log('\nBy item kind (items / with bonuses / notes only):');
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].items - a[1].items)) console.log(`  ${k}: ${v.items} / ${v.mods} / ${v.notesOnly}`);
if (process.argv.includes('--items')) { console.log('\nItems:'); lines.forEach((l) => console.log('  ' + l)); }
if (process.argv.includes('--unhandled')) {
  // Sentences with a number-ish stat phrase that produced no mod: candidates for new rules.
  console.log('\nStat-like sentences kept only as notes:');
  const seen = new Map();
  for (const it of items) {
    const fx = parseItemEffect(it);
    for (const n of (fx && fx.notes) || []) {
      if (!/[+\-−]\d+ (?:bonus|penalty)|score|speed|hit point maximum|AC\b/i.test(n)) continue;
      const key = n.toLowerCase().replace(/\d+/g, 'N').replace(/\b(strength|dexterity|constitution|intelligence|wisdom|charisma)\b/g, 'ABIL').slice(0, 140);
      const e = seen.get(key) || { n: 0, ex: it.name };
      e.n++;
      seen.set(key, e);
    }
  }
  [...seen.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 80).forEach(([k, e]) => console.log(`  ${String(e.n).padStart(3)}  ${k}  (${e.ex})`));
}
void fxSentences;
