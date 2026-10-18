/* Choice slots, class lists and pick effects for a character, in Node (for checking the rules
 * reading without a browser). Usage:
 *   node dev/choices-check.js <character.json | -e '<json>'> [--effects]
 * with SW5E's rules data from app/data/sw5e/rules.json (or a rules.json given first).
 * The character file may be SW5E's character JSON or a sheet snapshot ({ raw, complete }).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('../app/classes.js');
const H = require('../app/choices.js');
const P = require('../app/powers.js');

const args = process.argv.slice(2);
// A rules file first is optional: the sheet's own copy otherwise.
if (!/^rules.*\.json$/i.test(path.basename(args[0] || ''))) args.unshift(path.join(__dirname, '..', 'app', 'data', 'sw5e', 'rules.json'));
const rules = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const modules = rules.modules || rules;
let raw;
if (args[1] === '-e') raw = JSON.parse(args[2]);
else raw = JSON.parse(fs.readFileSync(args[1], 'utf8'));
if (raw.raw) raw = raw.raw;
const showEffects = args.includes('--effects');

const parsed = C.parseClassOptions(modules);
// The same inputs the sheet gives choiceSlots (choices.js shares them): what the classes and archetypes can cast
// (SW5E's engine isn't run here, so the tables and the multiclass table decide), the class-table rows with
// multiclass improvements, maneuvers and superiority dice the classes have, and the proficiency bonus.
const level = (raw.classes || []).reduce((t, k) => t + (Number(k.levels) || 0), 0);
const pb = Math.ceil(level / 4) + 1;
const rowOf = (k) => H.chClassRow(raw, k, modules);
const casting = H.chCastingLevels(raw, modules);
const cm = H.chClassManeuvers(raw, modules, parsed, rowOf);
const classPowerNames = (raw.classes || []).flatMap((k) => ['forcePowers', 'techPowers'].flatMap((f) => (k[f] || []).concat((k.archetype && k.archetype[f]) || [])));
const res = H.choiceSlots(raw, {
  modules, parsed, casting, pb, rowOf, classManeuvers: cm.names.length, classManeuverMax: cm.max, classManeuverNames: cm.names,
  classDice: H.chClassSupDice(raw, modules), classPowerNames,
});
console.log(`${raw.name || 'Character'}: level ${res.level}; can cast ${JSON.stringify(res.casting)} (classes: ${JSON.stringify(casting)})`);
for (const k of raw.classes || []) {
  const info = H.chClassInfo(k, modules, parsed, { rowOf });
  if (!info) { console.log(`\n${k.name}: no rules`); continue; }
  console.log(`\n${k.name} ${k.levels}${k.archetype ? ` (${k.archetype.name})` : ''}`);
  for (const b of H.chMulticlassBoosts(raw, k, modules)) console.log(`  multiclass improvement: +${b.add} levels (${b.other}) for ${b.columns.join(', ') || 'no table column'}${Object.keys(b.points).length ? `; points ${JSON.stringify(b.points)}` : ''}`);
  for (const l of info.lists) {
    if (!l.max && !l.chosen.length) continue;
    console.log(`  list ${l.title}: ${l.chosen.length}/${l.max}${l.source === 'archetype' ? ` (archetype list, from ${l.minLevel || '?'}${l.swap ? ', swappable' : ''})` : ''} ${l.chosen.map((p) => p.name + (p.item ? ` [item ${p.item + 1}]` : '')).join(', ')}`);
    if (l.mods) console.log(`    modifications: ${l.mods.perItem} slots × ${l.mods.items} ${l.mods.what}${l.mods.item ? ` (${l.mods.item}: ${l.mods.itemNames.join(', ') || 'none chosen'})` : ''}${l.mods.penalty ? '; tech points −1 per modification beyond proficiency bonus' : ''}`);
    for (const p of l.problems || []) console.log(`    ! ${p}`);
    for (const p of l.hints || []) console.log(`    ~ ${p}`);
  }
  if (info.maneuvers) console.log(`  maneuvers: ${info.maneuvers.chosen.length}/${info.maneuvers.max} (${info.maneuvers.sources.join(' + ')})`);
  // Powers known from the class or archetype table (picks in classes[i].forcePowers/techPowers or archetype.*).
  for (const c of P.pwClassCasting(k, modules)) {
    const known = classPowerNames;
    const notes = c.chosen.map((n) => {
      const p = modules.powers.find((x) => x.name.toLowerCase() === String(n).toLowerCase());
      if (!p) return `${n}: not in SW5E's data`;
      const bad = [];
      if (p.powerType.toLowerCase() !== c.type) bad.push(`a ${p.powerType.toLowerCase()} power`);
      if (Number(p.level) > c.maxLevel) bad.push(`level ${p.level} > max ${c.maxLevel}`);
      const pre = P.pwUnmetPrereq(p, known);
      if (pre.length) bad.push(`needs ${pre.join(', ')}`);
      return bad.length ? `${n}: ${bad.join('; ')}` : '';
    }).filter(Boolean);
    const extra = res.slots.filter((s) => s.classFeature && s.given && !s.castOnly && s.owner === k.name)
      .flatMap((s) => s.picks.map((p) => p.name.toLowerCase())).filter((n) => c.chosen.some((x) => String(x).toLowerCase() === n)).length;
    console.log(`  ${c.type} powers (${c.source}: ${c.from}): ${c.chosen.length}/${c.known + extra}${extra ? ` (table ${c.known} + ${extra} given by a feature)` : ''} known, max power level ${c.maxLevel}, ${c.points} points (+ ability modifier), field ${c.field}${c.replaces ? ` (instead of ${c.replaces}'s casting)` : ''}, once per long rest: ${c.onceLevels.map((l) => `${l}th`).join(', ')}`);
    for (const n of notes) console.log(`    ! ${n}`);
  }
}
const multi = P.pwMulticlassMax(raw, modules);
if (multi.force != null || multi.tech != null) console.log(`\nMulticlass max power level: force ${multi.force ?? '-'}, tech ${multi.tech ?? '-'}`);
for (const kind of ['force', 'tech']) { const hl = P.pwHighOnce(raw, modules, kind); if (hl.length) console.log(`${kind} powers once per long rest at: ${hl.join(', ')} (the class with the most levels decides)`); }
console.log('\nSlots:');
for (const s of res.slots) {
  const extra = [s.oncePerRest ? 'once per long rest' : '', s.free != null ? `cast free${s.free !== 'base' ? ` at level ${s.free}` : ''}` : '', s.castAs ? `counts as ${s.castAs}` : '',
    s.levelMax != null ? `levels ${s.levelMin}-${s.levelMax}` : '', s.alignment ? `${s.alignment} only` : '', s.species ? 'species' : '',
    s.castOnly ? 'cast only, not learned' : '', s.useFeature ? `uses ${s.useFeature}` : '', s.oncePerRest === 'shortRest' ? 'back on a short rest' : '',
    s.abilities ? `casting ability ${s.abilities.join('/')}` : '', s.noConcSelf ? 'no concentration on yourself' : '', s.focus ? 'focus points' : ''].filter(Boolean).join(', ');
  console.log(`  [${s.key}] ${s.title} ×${s.count}${s.allowed ? ` (${s.allowed.join(' or ')}${s.insteadAny ? ', or another if known' : ''})` : ''}${extra ? ` (${extra})` : ''}${s.requires ? ` requires ${s.requires}` : ''} — ${s.options.length} options`);
  console.log(`      picks: ${s.picks.map((p) => p.name + (p.auto ? ' (automatic)' : '') + (p.note ? ` [${p.note}]` : '') + (p.weapons && p.weapons.length ? ` {${p.weapons.join(', ')}}` : '')).join(', ') || '—'}`);
  for (const p of s.problems) console.log(`      ! ${p}`);
  if (s.hint) console.log(`      ~ ${s.hint}`);
}
for (const d of res.superiority) console.log(`  superiority dice: ${d.count} ${d.size} from ${d.from}`);
for (const o of res.orphans) console.log(`  stored picks with no slot: [${o}]`);
if (showEffects) {
  console.log('\nEffects of picks:');
  for (const p of H.chPickTexts(res)) {
    const fe = C.clsFeatureEffects(p.text, p.note, { level: res.level, pb });
    const st = C.clsFeatureState(p.name, p.text, { level: res.level, note: p.note });
    const wb = H.chWeaponBenefits(p.text);
    const bits = [
      fe.mods.length ? `mods ${fe.mods.map((x) => x.label).join('; ')}` : '', fe.advantage.length ? `adv ${JSON.stringify(fe.advantage)}` : '',
      fe.defenses.length ? `defenses ${fe.defenses.map((x) => x.text).join('; ')}` : '', fe.unarmedStep ? `unarmed +${fe.unarmedStep} step` : '',
      fe.critRange ? `crit +${fe.critRange}` : '', fe.needsChoice.length ? `needs ${fe.needsChoice.join('; ')}` : '',
      wb.mods.length || wb.critRange ? `weapon ${JSON.stringify(wb)}` : '', st ? `state ${st.word || ''} ${st.duration}` : '',
      fe.profs.weapons.length || fe.profs.skills.length || fe.profs.tools.length ? `profs ${JSON.stringify(fe.profs)}` : '',
    ].filter(Boolean);
    console.log(`  ${p.name} (${p.title}): ${bits.join(' | ') || 'text only'}`);
  }
}
