// Runs app/classes.js over every class feature, archetype feature and class option and
// reports what it makes of them: effects, uses, states, and the stat-like sentences it doesn't use.
// Usage: node dev/features-report.js [rules.json] [--unhandled[=N]] [--states] [--class=Name] [--examples]
//   (default: the rules data that comes with the sheet, app/data/sw5e/rules.json)
'use strict';
const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, '..', 'app', 'classes.js'));

const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..', 'app', 'data', 'sw5e', 'rules.json');
const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}`)) || '').split('=')[1];
const R = JSON.parse(fs.readFileSync(file, 'utf8')).modules;
const onlyClass = arg('class');

// Everything with rules text: class/archetype features and class options (from classes.js parsing).
const parsed = C.parseClassOptions(R);
const entries = [];
for (const c of R.classes) {
  if (onlyClass && c.name !== onlyClass) continue;
  for (const f of C.clsTextFeatures(c.classFeatureText, c.name, 'Class')) entries.push({ ...f, cls: c.name, kind: 'class feature' });
  for (const l of (parsed.classes[c.name] || { lists: [] }).lists) for (const o of l.options) entries.push({ name: o.name, text: o.text, sourceName: c.name, cls: c.name, kind: l.key, level: o.minLevel || 1 });
}
for (const a of R.archetypes) {
  if (onlyClass && a.className !== onlyClass) continue;
  for (const f of C.clsTextFeatures(a.text, a.name, 'Archetype')) entries.push({ ...f, cls: a.className, kind: 'archetype feature' });
  const ap = parsed.archetypes[a.name] || { extends: {}, lists: [] };
  for (const [key, opts] of Object.entries(ap.extends)) for (const o of opts) entries.push({ name: o.name, text: o.text, sourceName: a.name, cls: a.className, kind: key, level: o.minLevel || 1 });
  for (const l of ap.lists) for (const o of l.options) entries.push({ name: o.name, text: o.text, sourceName: a.name, cls: a.className, kind: l.key, level: o.minLevel || 1 });
}

// Rules resolved at the table (targets, actions, triggers): shown to the player as feature text.
const TABLE_TIME = /\b(?:target|creature|enemy|enemies|ally|allies|as an? (?:bonus )?action|reaction|when(?:ever)? (?:you|a|an|the|it)|if (?:you|a|an|the|it)|on a (?:hit|failed|successful|miss)|until the|for the next|once per|once on each|you can (?:use|spend|expend|choose|take|make|cast|move|add|replace|reroll|roll)|must (?:make|succeed)|saving throw dc is|the dc equals|this damage|the damage|takes? (?:\w+ )?damage|deal(?:s)? (?:\w+ )?damage|hit points? equal|regain|companion|droid|structure|barrier|sentry|turret|decoy|power you cast|powers you cast)\b/i;
const STAT = /\b(bonus|penalty|increases?|decreases?|AC\b|armor class|speed|hit points?|hit point maximum|proficien\w*|expertise|advantage|disadvantage|resistan\w*|immun\w*|saving throws?|save DC|attack rolls?|damage rolls?|additional damage|extra damage|darkvision|blindsight|truesight|reach|critical hit|score|initiative|passive)\b/i;
const sentencesOf = (t) => String(t || '').replace(/\r/g, '').split(/\n+/).flatMap((line) => line.replace(/^\s*- /, '').split(/(?<=\.)\s+(?=[A-Z_*])/)).map((s) => s.trim()).filter(Boolean);
const level20 = { level: 20, pb: 6, mods: { Strength: 3, Dexterity: 3, Constitution: 3, Intelligence: 3, Wisdom: 3, Charisma: 3 }, row: {} };

/** Does a clsFeatureEffects result change or ask for anything? */
const gives = (fx) => fx.mods.length || Object.values(fx.profs).some((x) => x.length) || fx.needsChoice.length
  || fx.advantage.length || fx.defenses.length || fx.critRange || fx.halfProf || fx.unarmedStep;
const states = [];
// "While raging, …" in any feature adds to that state (applied when it starts).
const stateWords = [...new Set(entries.map((e) => C.clsFeatureState(e.name, e.text, level20)).filter((x) => x && x.word).map((x) => x.word))];
const stateLike = [];
let withFx = 0, withUses = 0, withState = 0, tableTime = 0, context = 0, engine = 0;
const unhandled = new Map();
const examples = new Map();
for (const e of entries) {
  const fx = C.clsFeatureEffects(e.text, '', level20);
  const st = C.clsFeatureState(e.name, e.text, level20);
  const use = C.clsUsage(e.text, level20);
  if (gives(fx)) withFx++;
  if (use) withUses++;
  if (st) { withState++; states.push(`${e.sourceName}/${e.name}: ${st.extension ? `adds to "${st.word}"` : st.duration || 'no duration'}; ${st.benefits.length} benefits, ${st.mods.length} mods, ${st.advantage.length} advantages, ${st.defenses.length} defenses`); }
  else if (/\b(?:stance|aura|form|following benefits|for (?:1|one) minute|until the (?:start|end) of your next turn)\b/i.test(e.text) && /\bas an? (?:bonus )?action|use your (?:bonus )?action|reaction\b/i.test(e.text)) stateLike.push(`${e.sourceName}/${e.name}`);
  for (const s of sentencesOf(e.text)) {
    if (!STAT.test(s)) continue;
    // Handled: the sentence alone yields effects, a choice, uses, or is a state benefit.
    if (gives(C.clsFeatureEffects(s, '', level20))) continue;
    if (st && st.benefits.some((b) => b.includes(s.slice(0, 40)))) continue;
    if (/\b(?:can use (?:this feature|it)|once you(?:'|’)ve used|regain (?:all )?(?:expended )?uses|additional use)\b/i.test(s)) continue;
    if (TABLE_TIME.test(s)) { tableTime++; continue; }
    // Read with the sentence before it (scaling, caps) or computed by SW5E (casting, ASI at level-up).
    if (/^(?:this (?:bonus|die|range|radius) increases to|your maximum for (?:this|those|these) scores)/i.test(s)
      || stateWords.some((w) => new RegExp(`^while ${w}\\b`, 'i').test(s))) { context++; continue; }
    if (/^\*\*[\w ]+(?:save dc|attack modifier)\*\* =|when setting the saving throw dc|to a maximum level, which increases|max power level|ability score improvement|increase (?:one|an) ability score|increase two ability scores/i.test(s)) { engine++; continue; }
    if (fx.needsChoice.length && /^choose\b/i.test(s)) { context++; continue; }
    const key = s.toLowerCase().replace(/\d+/g, 'N').replace(/\b(strength|dexterity|constitution|intelligence|wisdom|charisma)\b/g, 'ABIL')
      .replace(/\b(acid|cold|energy|fire|force|ion|kinetic|lightning|necrotic|poison|psychic|sonic|true)\b/g, 'DMG').slice(0, 150);
    unhandled.set(key, (unhandled.get(key) || 0) + 1);
    if (!examples.has(key)) examples.set(key, `${e.sourceName}/${e.name}`);
  }
}
console.log(`${entries.length} features and options${onlyClass ? ' for ' + onlyClass : ''}: ${withFx} with effects/proficiencies/choices, ${withUses} with uses, ${withState} with a state\n`);
if (process.argv.includes('--states')) {
  console.log(`States (${states.length}):`);
  states.forEach((x) => console.log('  ' + x));
  console.log(`
Not detected as a state but worded like one (${stateLike.length}):`);
  stateLike.forEach((x) => console.log('  ' + x));
  console.log('');
}
const n = arg('unhandled');
if (process.argv.some((a) => a.startsWith('--unhandled'))) {
  const top = [...unhandled.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(n) || 120);
  console.log(`${tableTime} stat-like sentences are table-time rules (targets, actions, triggers) and stay as feature text.`);
  console.log(`${context} are read together with the sentence before them; ${engine} are computed by SW5E (casting, ability score improvements).`);
  console.log(`Other stat-like sentences not turned into anything (${unhandled.size} distinct, ${[...unhandled.values()].reduce((t, x) => t + x, 0)} total):`);
  for (const [k, c] of top) console.log(`  ${String(c).padStart(3)}  ${k}${process.argv.includes('--examples') ? `  (${examples.get(k)})` : ''}`);
}
