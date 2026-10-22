/* What the sheet's text readers make of every SW5E source: each feat, species trait, class and archetype feature,
 * class option, fighting style/mastery, lightsaber form, weapon focus/supremacy, improvement and background feature,
 * read with app/classes.js (clsFeatureEffects, clsFeatureState, clsUsage) as the sheet reads them, at 20th level and
 * with no choices made. One block per source, only what it produces.
 *
 *   node dev/readers.js [--out FILE] [--only feat|species|class|archetype|option|choice|background] [--grep TEXT]
 *
 * Save the output before changing a reader and diff after (git diff --no-index before.txt after.txt): every source
 * whose reading changed shows up, not only the one the change was for.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cls = require('../app/classes.js');

const DATA = path.join(__dirname, '..', 'app', 'data', 'sw5e');
const modules = (() => { const r = JSON.parse(fs.readFileSync(path.join(DATA, 'rules.json'), 'utf8')); return r.modules || r; })();
const catalog = (() => { const c = JSON.parse(fs.readFileSync(path.join(DATA, 'catalog.json'), 'utf8')); return Array.isArray(c) ? c : c.items || Object.values(c); })();
const weaponNames = new Set(catalog.filter((x) => x && x.equipmentCategory === 'Weapon').map((x) => x.name.toLowerCase()));
const isWeapon = (w) => weaponNames.has(String(w).toLowerCase()) || weaponNames.has(String(w).toLowerCase().replace(/s$/, ''));

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const only = arg('--only');
const grep = arg('--grep');
const LEVEL = 20;
const PB = 6;
const MODS = { Strength: 3, Dexterity: 3, Constitution: 3, Intelligence: 3, Wisdom: 3, Charisma: 3 };

const modText = (x) => [x.path, x.bonus != null ? x.bonus : '', x.abilityMod ? `+${[].concat(x.abilityMod).join('/')}` : '', x.capAbility ? `cap ${x.capAbility} ${x.capAt}` : '',
  x.cond ? `[${x.cond}]` : '', x.when ? `when ${JSON.stringify(x.when)}` : '', x.weaponFilter ? `weapons ${JSON.stringify(x.weaponFilter)}` : '', `"${x.label}"`]
  .filter((s) => s !== '').join(' ');

function effectsBlock(text, ctx) {
  const fe = cls.clsFeatureEffects(text, '', ctx);
  const out = [];
  if (fe.mods.length) out.push(...fe.mods.map((x) => `  mod ${modText(x)}`));
  const p = fe.profs;
  if (p.saves.length) out.push(`  save prof ${p.saves.join(', ')}`);
  if (p.skills.length) out.push(`  skill prof ${p.skills.map((s) => `${s.name} (${s.level})`).join(', ')}`);
  if (p.tools.length) out.push(`  tool prof ${p.tools.map((s) => `${s.name} (${s.level})`).join(', ')}`);
  if (p.weapons.length) out.push(`  weapon prof ${p.weapons.join(' | ')}`);
  if (p.armor.length) out.push(`  armor prof ${p.armor.join(' | ')}`);
  const names = (list) => list.map((x) => `${x.kind} ${x.name}`).join(', ');
  if ((p.upgrades || []).length) out.push(`  expertise if already proficient: ${names(p.upgrades)}`);
  for (const c of p.chains || []) {
    const gain = [...c.saves.map((x) => `save ${x}`), ...c.skills.map((x) => `skill ${x.name}`), ...c.tools.map((x) => `tool ${x.name}`), ...c.weapons.map((x) => `weapon ${x}`), ...c.armor.map((x) => `armor ${x}`)];
    out.push(`  if already ${names(c.ifHas)}: ${gain.join(', ') || '(a choice)'}`);
  }
  for (const k of ['critRange', 'halfProf', 'unarmedStep']) if (fe[k]) out.push(`  ${k} ${fe[k]}`);
  for (const k of Object.keys(fe).filter((k) => !['mods', 'profs', 'notes', 'needsChoice', 'asks', 'advantage', 'defenses', 'critRange', 'halfProf', 'unarmedStep'].includes(k))) {
    const v = fe[k];
    if (v && (Array.isArray(v) ? v.length : typeof v !== 'object' || Object.keys(v).length)) out.push(`  ${k} ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
  if (fe.advantage.length) out.push(`  advantage ${fe.advantage.map((a) => [a.kind, a.ability || a.skill].filter(Boolean).join(' ')).join(', ')}`);
  for (const d of fe.defenses) out.push(`  ${d.kind}: ${d.text}`);
  for (const a of fe.asks) out.push(`  ask ${a.kind} ×${a.count} "${a.label}"${a.options ? ` of ${a.options.join(', ')}` : ''}${a.of ? ` (${a.of})` : ''}${a.ifHas ? ` if already ${names(a.ifHas)}` : ''}`);
  if (fe.needsChoice.length) out.push(`  needs ${fe.needsChoice.join('; ')}`);
  return out;
}

function stateBlock(name, text, ctx) {
  const st = cls.clsFeatureState(name, text, { ...ctx, note: '' });
  if (!st) return [];
  const out = [`  state ${st.word || ''}${st.extension ? ' (extends)' : ''} ${st.duration || ''}`.replace(/\s+$/, '')];
  for (const b of st.benefits) out.push(`    benefit ${b.slice(0, 140)}`);
  for (const x of st.mods) out.push(`    mod ${modText(x)}`);
  if (st.advantage.length) out.push(`    advantage ${st.advantage.map((a) => [a.kind, a.ability || a.skill].filter(Boolean).join(' ')).join(', ')}`);
  for (const d of st.defenses) out.push(`    ${d.kind}: ${d.text}`);
  if (st.critRange) out.push(`    critRange ${st.critRange}`);
  return out;
}

function usageLine(text, ctx) {
  const u = cls.clsUsage(text, ctx);
  return u ? [`  uses ${u.maximum === Infinity ? 'unlimited' : u.maximum}/${u.recharge}${u.basis ? ` (${u.basis})` : ''}`] : [];
}

const blocks = [];
function add(kind, name, text, ctx = {}) {
  if (only && kind !== only) return;
  if (grep && !`${name}\n${text}`.toLowerCase().includes(grep.toLowerCase())) return;
  const c = { level: LEVEL, pb: PB, mods: MODS, isWeapon, ...ctx };
  const lines = [...effectsBlock(text, c), ...stateBlock(name, text, c), ...usageLine(text, c)];
  if (lines.length) blocks.push(`## ${kind}: ${name}\n${lines.join('\n')}`);
}

for (const f of modules.feats || []) add('feat', f.name, f.text || '');
for (const s of modules.species || []) {
  for (const t of s.traits || []) {
    if (/^(?:Ability Score Increase|Age|Alignment|Size|Languages?)$/i.test(t.name)) continue;
    add('species', `${s.name} / ${t.name}`, t.description || '');
  }
}
const parsed = cls.parseClassOptions(modules);
for (const c of modules.classes || []) {
  const row = Object.fromEntries(Object.entries((c.levelChanges || {})[String(LEVEL)] || {}));
  for (const f of cls.clsTextFeatures(c.classFeatureText, c.name, 'Class')) add('class', `${c.name} / ${f.name}`, f.text, { row });
  for (const l of (parsed.classes[c.name] || {}).lists || []) for (const o of l.options) add('option', `${c.name} / ${l.key} / ${o.name}`, o.text, { row });
}
for (const a of modules.archetypes || []) {
  const c = (modules.classes || []).find((x) => x.name === a.className) || {};
  const row = ((c.levelChanges || {})[String(LEVEL)]) || {};
  for (const f of cls.clsTextFeatures(a.text, a.name, 'Archetype')) add('archetype', `${a.name} / ${f.name}`, f.text, { row });
  const p = parsed.archetypes[a.name] || {};
  for (const l of p.lists || []) for (const o of l.options) add('option', `${a.name} / ${l.key} / ${o.name}`, o.text, { row });
  for (const [k, opts] of Object.entries(p.extends || {})) for (const o of opts) add('option', `${a.name} / ${k} / ${o.name}`, o.text, { row });
}
for (const k of ['fightingStyles', 'fightingMasteries', 'lightsaberForms', 'weaponFocuses', 'weaponSupremacies', 'classImprovements', 'multiclassImprovements', 'splashclassImprovements']) {
  for (const x of modules[k] || []) add('choice', `${k} / ${x.name}`, x.description || x.text || '');
}
for (const b of modules.backgrounds || []) if (b.featureText) add('background', `${b.name} / ${b.featureName}`, b.featureText);

const text = blocks.join('\n') + '\n';
if (arg('--out')) { fs.writeFileSync(arg('--out'), text); console.log(`${blocks.length} sources with a reading → ${arg('--out')}`); } else process.stdout.write(text);
