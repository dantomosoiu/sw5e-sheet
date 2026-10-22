/* SW5E Character Sheet Viewer: class options.
 *
 * Every SW5E class has option lists it picks from as it levels (Scholar Discoveries, Operative
 * Exploits, Berserker Instincts, Fighter Strategies, Guardian Auras, Monastic Vows, Scout Routines,
 * Sentinel Ideals, Consular Force-Empowered Castings), plus maneuvers for superiority users.
 * sw5e.com has no structured data or builder UI for these lists: they exist only in the class's
 * markdown (`### <List>` with `#### <Option>` entries), and how many you know is a column of the
 * class table ("Discoveries", "Strategies Known"…). Archetypes extend a class list ("Gambler
 * Discoveries": "choose from any of the following as well") or have lists of their own.
 *
 * This file reads those into:
 *   { classes: { [className]: { lists: [list], maneuversColumn } },
 *     archetypes: { [archetypeName]: { className, extends: { [listKey]: [option] }, lists: [list] } } }
 *   list   = { key, title, column, options: [option] }      key: the class's list name ("Discoveries")
 *   option = { name, text, prerequisite, minLevel, repeatable, grants: { maneuvers: n } , source }
 */
'use strict';

/** `### Title` sections of a markdown text: [{ title, body }] (level = number of #). */
function clsSections(text, level) {
  const out = [];
  const re = new RegExp(`^${'#'.repeat(level)} (.+)$`, 'gm');
  const heads = [...String(text || '').matchAll(re)];
  heads.forEach((h, i) => {
    const start = h.index + h[0].length;
    let end = i + 1 < heads.length ? heads[i + 1].index : String(text).length;
    // A section ends at the next heading of the same or a higher level.
    const higher = new RegExp(`^#{1,${level - 1}} `, 'm');
    const rest = String(text).slice(start, end);
    const hm = level > 1 ? higher.exec(rest) : null;
    if (hm) end = start + hm.index;
    out.push({ title: h[1].trim(), body: String(text).slice(start, end).trim() });
  });
  return out;
}

const CLS_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
/** An option's prerequisite, minimum level, whether it can be taken more than once, and what it grants. */
function clsOption(name, body, source) {
  // "_**Prerequisite:** Curtain of Unyielding Wind_ or _Rush of the Shyrack_": either of them.
  const pre = /_\*\*Prerequisites?:?\*\*:?\s*([^_\n]+)_((?:\s*or\s*_[^_\n]+_)*)/i.exec(body);
  const anyOf = pre && pre[2] ? [pre[1], ...[...pre[2].matchAll(/_([^_\n]+)_/g)].map((x) => x[1])].map((x) => x.trim().replace(/[.:]$/, '')) : null;
  const prerequisite = pre ? (anyOf ? anyOf.join(' or ') : pre[1].trim().replace(/[.:]$/, '')) : '';
  const lvl = /(\d+)(?:st|nd|rd|th) level/i.exec(prerequisite);
  // "_Incompatible with other conversions_" (Blastsaber, Brightsaber, Disruptorsaber Conversion).
  const inc = /^_Incompatible with other (\w+?)s?_\s*$/im.exec(body);
  const text = body.replace(/_\*\*Prerequisites?:?\*\*:?\s*[^_\n]+_(?:\s*or\s*_[^_\n]+_)*\s*/i, '').replace(/^_Incompatible with other \w+_\s*$/im, '').trim();
  const grants = {};
  const mn = /\blearn (\w+) additional maneuvers?\b/i.exec(text);
  if (mn) grants.maneuvers = CLS_NUM[mn[1].toLowerCase()] || Number(mn[1]) || 0;
  const repeatable = /select (?:this \w+ )?multiple times|can (?:take|choose|select|learn) this \w+ (?:more than once|multiple times|twice)/i.test(text);
  return {
    name, text, prerequisite, anyOf, minLevel: lvl ? Number(lvl[1]) : 0, repeatable,
    // How often: "You can choose this modification twice" → 2; "multiple times, but only once per arm" → per arm.
    limit: !repeatable ? 1 : /\btwice\b/i.test(text) ? 2 : null,
    perArm: /only once per arm/i.test(text), distinctNote: /must choose a different (?:damage )?type/i.test(text),
    incompatible: inc ? inc[1].toLowerCase() : null,
    grants, source,
  };
}

/** Which list a class-table column counts ("Strategies Known" → "Fighter Strategies"). */
function clsColumnFor(columns, title) {
  const words = (s) => String(s).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/)
    .filter((w) => w && !['known', 'options', 'option'].includes(w)).map((w) => w.replace(/(ies|s)$/, ''));
  const tw = new Set(words(title));
  return columns.find((c) => { const cw = words(c); return cw.length && cw.every((w) => tw.has(w)); }) || null;
}

/** Read every class's and archetype's option lists from SW5E's rules modules. */
function parseClassOptions(modules) {
  const out = { classes: {}, archetypes: {} };
  for (const c of modules.classes || []) {
    const columns = [...new Set(Object.values(c.levelChanges || {}).flatMap((row) => Object.keys(row || {})))]
      .filter((k) => !['Level', 'Proficiency Bonus', 'Features'].includes(k));
    const lists = [];
    for (const sec of clsSections(c.classFeatureText, 3)) {
      const opts = clsSections(sec.body, 4);
      const column = clsColumnFor(columns, sec.title);
      // A list: a section of #### options that a table column counts (not e.g. "Forcecasting"'s subsections).
      if (opts.length < 3 || !column) continue;
      lists.push({ key: sec.title, title: sec.title, column, options: opts.map((o) => clsOption(o.title, o.body, c.name)) });
    }
    out.classes[c.name] = { lists, columns, maneuversColumn: columns.includes('Maneuvers Known') ? 'Maneuvers Known' : null };
  }
  for (const a of modules.archetypes || []) {
    const cls = out.classes[a.className];
    const entry = { className: a.className, extends: {}, lists: [] };
    for (const sec of clsSections(a.text, 3)) {
      const opts = clsSections(sec.body, 4);
      // Lists have three or more options; two count when the intro says to pick one (Hunter's Multiattack).
      if (opts.length < 2 || (opts.length === 2 && !/\bone of the following (?:features|options)\b/i.test(sec.body.split(/^#### /m)[0]))) continue;
      // "Gambler Discoveries": "…you can choose from any of the following as well" → adds to the class list.
      const base = cls && cls.lists.find((l) => sec.title.toLowerCase().endsWith(l.key.toLowerCase()) || /as well|in addition to|added to/i.test(sec.body.split('####')[0]) && l.key.split(' ').pop().toLowerCase() === sec.title.split(' ').pop().toLowerCase());
      const options = opts.map((o) => clsOption(o.title, o.body, a.name));
      if (base) entry.extends[base.key] = options;
      else entry.lists.push({ key: sec.title, title: sec.title, column: null, intro: sec.body.split(/^#### /m)[0].trim(), options });
    }
    out.archetypes[a.name] = entry;
  }
  return out;
}

/** How many options of a class list a class level gives (from its table column; "—" = 0). */
function clsCountAt(classRules, levelChanges, list, level) {
  const row = (levelChanges || {})[String(level)] || {};
  const v = parseInt(String(row[list.column] || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(v) ? v : 0;
}

/**
 * The features a class/archetype text describes, with every level they apply at:
 * `### Name` followed by `_**Scholar:** 2nd and 13th level_`. SW5E's feature data files many of
 * these only under their last level (Monk "Focus" at 11 instead of 2) or not at all, so the
 * sheet uses the text to fill in what the engine leaves out.
 */
function clsTextFeatures(text, sourceName, source) {
  const out = [];
  for (const sec of clsSections(text, 3)) {
    const m = /^_\*\*[^*]+:\*\*\s*([^_]+)_\s*/.exec(sec.body);
    if (!m) continue;
    const levels = [...m[1].matchAll(/(\d+)(?:st|nd|rd|th)/g)].map((x) => Number(x[1]));
    if (!levels.length) continue;
    out.push({ name: sec.title, level: Math.min(...levels), levels, text: sec.body.slice(m[0].length).trim(), source, sourceName });
  }
  return out;
}

const CLS_TIMES = { once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const clsTimes = (w) => CLS_TIMES[String(w).toLowerCase()] || Number(w) || 0;
const CLS_ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

/**
 * How many times a feature can be used and when uses come back, read from its text. SW5E's data
 * has no usage for any feature, so this is the only source. ctx: { level (in that class), pb,
 * mods: { Strength: 2, … }, row: that class's table row at its level }.
 * Returns { maximum, recharge: 'shortRest' | 'longRest', basis } or null.
 */
function clsUsage(text, ctx) {
  const t = String(text || '').replace(/\s+/g, ' ');
  const level = Number(ctx.level) || 0;
  let max = null;
  let basis = '';
  let m;
  const perTurn = /\b(?:on each of your turns|per turn|each turn|on the same turn|per round|each round)\b/i;
  // "You can use this feature twice" / "three times" (not "only once on each of your turns").
  for (const s of t.split(/(?<=\.)\s+/)) {
    if (!/\bcan use (?:this feature|these features|it|this ability|this)\b/i.test(s) || /number of times/i.test(s)) continue;
    // Every count in the sentence, each with the level it starts at, if any ("…twice between long rests
    // starting at 13th level and three times between long rests starting at 17th level"; "Starting at
    // 17th level, you can use it twice before a rest, but only once on the same turn").
    const lead = /^starting at (\d+)(?:st|nd|rd|th) level/i.exec(s);
    for (const c of s.matchAll(/\b(once|twice|(\w+) times)\b((?:(?! and )[^,.])*)/gi)) {
      if (perTurn.test(c[0])) continue; // "only once on the same turn" is a per-turn limit, not a pool
      const n = c[1].toLowerCase() === 'once' ? 1 : c[1].toLowerCase() === 'twice' ? 2 : clsTimes(c[2]);
      const from = /starting at (\d+)(?:st|nd|rd|th) level/i.exec(c[3]) || lead;
      if (n && (!from || level >= Number(from[1]))) { max = Math.max(max || 0, n); basis = ''; }
    }
  }
  if ((m = /number of times equal to (half )?your proficiency bonus(,? rounded up|\s*\(rounded up\))?/i.exec(t))) { max = m[1] ? (m[2] ? Math.ceil(ctx.pb / 2) : Math.floor(ctx.pb / 2)) : ctx.pb; basis = m[1] ? `half your proficiency bonus${m[2] ? ', rounded up' : ''}` : 'your proficiency bonus'; }
  else if ((m = new RegExp(`number of times equal to (?:your )?(${CLS_ABILITIES.join('|')}) modifier(?: \\(minimum of (?:once|one|1)\\))?`, 'i').exec(t))) {
    max = Math.max(/minimum/i.test(m[0]) ? 1 : 0, Number((ctx.mods || {})[m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()]) || 0);
    basis = `your ${m[1]} modifier`;
  } else if ((m = /number of times (?:as )?shown (?:for your \w+ level )?in the ([\w' -]+?) column/i.exec(t)) || (m = /number of (?:points|\w+) you have, as shown in the ([\w' -]+?) column/i.exec(t))) {
    const v = String(((ctx.row || {})[m[1]]) || '');
    if (/unlimited/i.test(v)) return { maximum: Infinity, recharge: 'longRest', basis: `${m[1]} column` };
    const n = parseInt(v.replace(/[^\d]/g, ''), 10);
    if (n) { max = n; basis = `${m[1]} column`; }
  }
  if (max == null && /once you(?:'|’)ve used (?:this feature|it)|can(?:'|’)t use (?:this feature|it) again until/i.test(t)) max = 1;
  if (max == null || max <= 0) return null;
  // "You gain an additional use at 5th, 9th, 13th, and 17th level."
  if ((m = /additional use (?:of (?:this feature|it) )?at ((?:\d+(?:st|nd|rd|th)(?:,? (?:and )?)?)+) level/i.exec(t))) {
    max += [...m[1].matchAll(/(\d+)/g)].filter((x) => level >= Number(x[1])).length;
  }
  let recharge = /(?:finish|complete|completes|finishes) a short or long rest|short or long rest/i.test(t) ? 'shortRest'
    : /long rest/i.test(t) ? 'longRest' : null;
  // "Starting at 13th level, you regain the ability to use it after you complete a short or long rest."
  if ((m = /starting at (\d+)(?:st|nd|rd|th) level, you regain the ability to use it after you complete a short or long rest/i.exec(t))) {
    recharge = level >= Number(m[1]) ? 'shortRest' : 'longRest';
  }
  if (!recharge) return null;
  return { maximum: max, recharge, basis };
}

// ------------------------------------------------------------- what features do
// Class/archetype features and chosen options change the character in ways SW5E's engine
// doesn't apply: ability increases, unarmored AC formulas, speed while unarmored, proficiencies
// (saves, skills, tools, weapons described in prose like "martial vibroweapons with the finesse
// property"), and states you switch on (Rage). These read them from the text; the viewer turns
// them into effects (kind 'feature' and, for states, temporary effects).

const CLS_SKILLS = ['Acrobatics', 'Animal Handling', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation',
  'Lore', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Piloting', 'Sleight of Hand', 'Stealth',
  'Survival', 'Technology'];
const CLS_ABIL_RE = '(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)';
const CLS_ABIL_ANY = '(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)';
const clsAbility = (w) => CLS_ABILITIES.find((a) => a.toLowerCase() === String(w).toLowerCase()) || null;
const clsSkill = (w) => CLS_SKILLS.find((s) => s.toLowerCase() === String(w).toLowerCase().trim()) || null;

/** Class proficiency lists split at every comma ("…that lack the dexterity", "heavy", "and two-handed properties"): rejoin. */
function clsJoinProfList(list) {
  const out = [];
  for (const raw of list || []) {
    const s = String(raw).trim();
    if (out.length && !/^(?:simple|martial|all)\b/i.test(s) && /\b(?:that lack|with) the\b/i.test(out[out.length - 1]) && !/propert/i.test(out[out.length - 1])) {
      out[out.length - 1] += `, ${s}`;
    } else out.push(s);
  }
  return out;
}

/** Does a weapon (catalog entry) fit a proficiency like "martial vibroweapons with the finesse property"? */
function clsWeaponMatches(desc, w) {
  const d = String(desc).toLowerCase().replace(/^(?:and|the)\s+/, '').trim();
  const cls = String(w.weaponClassification || '');
  const tier = /^simple/i.test(cls) ? 'simple' : /^martial/i.test(cls) ? 'martial' : '';
  const kind = /blaster/i.test(cls) ? 'blaster' : /vibro/i.test(cls) ? 'vibroweapon' : /light/i.test(cls) ? 'lightweapon' : '';
  const props = (w.properties || []).map((p) => String(p).toLowerCase());
  const has = (p) => props.some((x) => x.startsWith(p.trim()));
  const m = /^(simple|martial|all)?\s*(blasters|vibroweapons|lightweapons|weapons)\b(.*)$/.exec(d);
  if (!m) return !!w.name && (d === String(w.name).toLowerCase() || d === `${String(w.name).toLowerCase()}s`);
  if (m[1] && m[1] !== 'all' && m[1] !== tier) return false;
  if (m[2] !== 'weapons' && m[2].replace(/s$/, '') !== kind) return false;
  let x;
  if ((x = /with the ([\w ,-]+?) propert/.exec(m[3]))) {
    if (!x[1].split(/,\s*|\s+or\s+/).map((s) => s.replace(/^or /, '').trim()).filter(Boolean).some(has)) return false;
  }
  if ((x = /that lack the ([\w ,-]+?) propert/.exec(m[3]))) {
    if (x[1].split(/,\s*|\s+and\s+/).map((s) => s.replace(/^and /, '').trim()).filter(Boolean).some(has)) return false;
  }
  return true;
}

// Something you do to start a state: an action, a bonus action, a reaction, entering it.
const CLS_ACT = /\bas an? (?:bonus )?action\b|\bas a reaction\b|you can enter\b|you can (?:use your )?(?:bonus )?action\b|you can use your reaction\b|\buse your (?:bonus )?action to\b/i;
const CLS_DURATION = /\bfor (?:1|one|10|an?) (?:minute|hour)s?\b|\bfor the next (?:minute|hour)\b/i;
// A sentence that introduces a state's benefits.
const CLS_STATE_CUE = new RegExp(`\\bwhile [a-z]+ing\\b|\\bwhile (?:the target is|you are in|in this|this (?:stance|state|form) is)\\b|until the (?:start|end) of your next turn|${CLS_DURATION.source}|${CLS_ACT.source}`, 'i');
const CLS_CONDITIONAL = /\b(?:when|whenever|if|until|for the next|for 1 minute|as an? (?:bonus )?action|as a reaction|once (?:per|on each)|each time|the first time|while (?!you are not wearing|you aren't wearing|you are wearing no|wearing no))\b/i;
/** Armor conditions in a sentence: { noArmor, noShield, noHeavy } or null. */
function clsArmorCondition(s) {
  if (/not wearing (?:any )?armor or wielding a shield|wearing no armor and not wielding a shield/i.test(s)) return { noArmor: true, noShield: true };
  if (/not wearing (?:any )?armor|wearing no armor/i.test(s)) return { noArmor: true, noShield: /not wielding a shield|or (?:using|wielding) a shield/i.test(s) && !/can use a shield/i.test(s) };
  if (/(?:aren't|not) wearing heavy armor/i.test(s)) return { noHeavy: true };
  return null;
}

/** How many a phrase asks for: "two of the following skills" 2, "a tool" 1. */
const clsCount = (s) => { const m = /\b(a|an|one|two|three|four)\b/i.exec(String(s || '')); return m ? CLS_NUM[m[1].toLowerCase()] : 1; };
const CLS_DAMAGE_TYPES = ['acid', 'cold', 'energy', 'fire', 'force', 'ion', 'kinetic', 'lightning', 'necrotic', 'poison', 'psychic', 'sonic'];

/** A note split into what was written between commas, pluses, slashes… ("Stealth + Perception" → two). */
const clsNoteTokens = (note) => String(note || '').split(/\s*[,+&/;]\s*/).map((s) => s.trim()).filter(Boolean);

/** Names a player wrote in a note: abilities, skills, and the other words (tools, weapons…). */
function clsNoteNames(note) {
  const parts = String(note || '').split(/\s*(?:,|\+|&|\/|;|\band\b|\bor\b)\s*/i).map((s) => s.replace(/[.:]+$/, '').trim()).filter(Boolean);
  return {
    abilities: parts.map(clsAbility).filter(Boolean),
    skills: parts.map(clsSkill).filter(Boolean),
    others: parts.filter((p) => !clsAbility(p) && !clsSkill(p)),
  };
}

/**
 * The text at a level: "a +1 bonus… This bonus increases to +2 at 9th level and +3 at 13th level"
 * becomes "a +2 bonus…" at 9th level (likewise "increases to +2 when you reach 9th level").
 */
function clsScaleText(text, level) {
  return String(text || '').replace(/([+\-−])(\d+) bonus([^.]*\.)\s*This bonus increases to ((?:[+\-−]?\d+ (?:at|when you reach) \d+(?:st|nd|rd|th) level(?:,? (?:and )?)?)+)(?: in this class)?\.?/gi, (all, sign, n, rest, list) => {
    let v = Number(n);
    for (const x of list.matchAll(/[+\-−]?(\d+) (?:at|when you reach) (\d+)(?:st|nd|rd|th) level/gi)) if (level >= Number(x[2])) v = Number(x[1]);
    return `${sign}${v} bonus${rest}`;
  });
}

/**
 * A feature that offers sub-options under "####" headings ("Choose one of the following…", "You
 * gain one of the following features"): the text that applies with the option(s) named in the
 * player's note. Returns { text, options: [name], chosen: [name], choice } (choice false: all apply).
 */
function clsChosenText(text, note) {
  const t = String(text || '').replace(/\r/g, '');
  const parts = t.split(/^#{4,}\s+/m);
  if (parts.length < 2) return { text: t, options: [], chosen: [], choice: false };
  const intro = parts[0];
  const options = parts.slice(1).map((p) => {
    const nl = p.indexOf('\n');
    return { name: (nl < 0 ? p : p.slice(0, nl)).trim(), text: nl < 0 ? '' : p.slice(nl + 1) };
  });
  if (!/\b(?:choose|gain|select|pick|learn|adopt|take) (?:one|1|a single one) (?:of|from) the following\b|\byour choice of one from (?:two|three) such effects\b|\bone of the following (?:features|options|benefits|forms|aspects)\b|\bthe chosen (?:option|feature|benefit)\b/i.test(intro)) {
    return { text: t, options: [], chosen: [], choice: false };
  }
  const n = String(note || '').toLowerCase();
  const words = n.split(/\s*(?:,|\+|&|\/|;|\band\b)\s*/).map((w) => w.trim()).filter((w) => w.length >= 4);
  const chosen = options.filter((o) => {
    const name = o.name.toLowerCase();
    return n.includes(name) || words.some((w) => name.includes(w));
  });
  return { text: [intro, ...chosen.map((o) => o.text)].join('\n'), options: options.map((o) => o.name), chosen: chosen.map((o) => o.name), choice: true };
}

// effects.js's "+N bonus to <phrase>" readers (a global in the browser; required in Node).
const clsFx = typeof fxBonusMods !== 'undefined' ? { fxBonusMods, fxCondMods, fxListMods } // eslint-disable-line no-undef
  : (typeof require !== 'undefined' ? require('./effects.js') : {});

/**
 * The permanent effects of a feature or option at a level, from its text and the player's note.
 * ctx: { level, row (class table row) }. Returns {
 *   mods         numbers (may carry `abilityMod` for "AC = … + that modifier", `when` for armor
 *                conditions, `cond` for "only sometimes" values)
 *   profs        { saves: [ability], skills: [{ name, level }], tools: [{ name, level }], weapons: [desc], armor: [text] }
 *   advantage    [{ kind: 'check'|'save'|'init', ability }]: always rolled with advantage
 *   critRange    how much the weapon critical range grows (19-20: 1)
 *   halfProf     add half proficiency to checks without proficiency (Led by the Force)
 *   unarmedStep  unarmed damage die steps up (Fists of Fury)
 *   defenses     [{ kind: 'resistance'|'immunity'|'advantage'|'sense'|'speed'|'other', text }]
 *   needsChoice  choices still to write in the feature's notes
 *   asks         the same choices as pickers: [{ kind: 'option'|'ability'|'skill'|'tool'|'weapon'|'skilltool'|'expertise'|
 *                'damage', label, options (null: any of the kind), count, chosen: [name], of (the rule's words) }]
 * }
 * ctx.isWeapon(name), if given, tells weapons from tools among the note's other words.
 */
function clsFeatureEffects(text, note, ctx) {
  const level = Number(ctx.level) || 0;
  const sub = clsChosenText(text, note);
  const optionAsk = () => (sub.choice ? [{ kind: 'option', label: 'Choose one', options: sub.options, count: 1, chosen: sub.chosen, of: '' }] : []);
  if (sub.choice && sub.chosen.length && /\bfor the duration\b|\bwhile wearing your [\w' ]+, you gain the (?:effects|benefits) of the chosen\b/i.test(String(text).split(/^#{4,}\s/m)[0])) {
    // Only during the state / while wearing the item: not permanent numbers (the text stays on the card).
    return { mods: [], profs: { saves: [], skills: [], tools: [], weapons: [], armor: [] }, notes: [], needsChoice: [], asks: optionAsk(), advantage: [], critRange: 0, halfProf: false, unarmedStep: 0, defenses: [] };
  }
  const t = clsScaleText(sub.text, level);
  // A state's benefits list ("While raging, you gain the following benefits: - …") isn't permanent;
  // other lists ("The Force flows through your body, granting the following benefits: - …") are.
  const sentences = t.replace(/([^\n]*?)([^\n.]*following benefits[^\n]*)\n((?:\s*- [^\n]*(?:\n|$))+)/gi, (all, before, lead, list) => {
    const prev = before.split(/(?<=\.)\s+/).slice(-2).join(' ');
    return CLS_STATE_CUE.test(lead) || CLS_DURATION.test(prev) ? `${before}\n` : `${before}\n${list.replace(/^\s*- /gm, '')}`;
  }).replace(/\n+/g, ' ').split(/(?<=\.)\s+(?=[A-Z_*])/);
  const picks = clsNoteNames(note);
  const out = {
    mods: [], profs: { saves: [], skills: [], tools: [], weapons: [], armor: [] }, notes: [], needsChoice: [],
    advantage: [], critRange: 0, halfProf: false, unarmedStep: 0, defenses: [], asks: optionAsk(),
  };
  const same = (x, a) => x.kind === a.kind && x.label === a.label && String(x.options) === String(a.options);
  const ask = (kind, label, options, count, chosen, of = '') => {
    const a = { kind, label, options: options && options.length ? options : null, count: count || 1, chosen: [...new Set(chosen || [])], of };
    if (!out.asks.some((x) => same(x, a))) out.asks.push(a);
  };
  const isWeapon = typeof ctx.isWeapon === 'function' ? ctx.isWeapon : () => false;
  if (sub.choice && !sub.chosen.length) out.needsChoice.push(`one of ${sub.options.join(', ')}`);
  // Benefit lists of states ("While raging, you gain the following benefits: - …") aren't permanent.
  const permanent = sentences.filter((s) => !/following benefits/i.test(s) && !/^- /.test(s));
  // Clauses that only say the feature's precondition is met by having the feature/equipment.
  const ALWAYS = /,?\s*\bwhile (?:you are |you're )?(?:not wearing[^,.]*|wearing no[^,.]*|using (?:your|this|a) [\w ]+? as (?:a|your) (?:tech |force )?focus|wearing (?:your|these|this) (?:[\w']+ ){0,3}?(?:armor|harness|goggles|gloves|pack|implements|shield|suit|helmet|wristpad|platform|instrument|boots|belt)|wearing (?:your|these|this) [\w ]+?|wielding a weapon with which you are proficient)(?=[,.]|\s+(?:you|your)\b|$),?/gi;
  let m;
  for (const s of permanent) {
    const cond = clsArmorCondition(s);
    const core = s.replace(ALWAYS, '');
    const conditional = CLS_CONDITIONAL.test(core);
    // Ability scores: "Your Strength or Dexterity score increases by 2, and your Constitution score
    // increases by 2" / "Your Dexterity and Wisdom or Charisma scores (your choice) increase by 2".
    if (!conditional) {
      const capM = /maximum for (?:this|those|these|that|the chosen) scores? (?:increases by|is now|increases to) (\d+)/i.exec(t);
      for (const am of core.matchAll(new RegExp(`\\b(${CLS_ABIL_ANY}(?:,? (?:and|or) ${CLS_ABIL_ANY})*) scores?(?: \\(your choice\\))? (?:increases?|increase) by (\\d+)`, 'gi'))) {
        const n = Number(am[2]);
        const cap = capM ? (/increases by/i.test(capM[0]) ? 20 + Number(capM[1]) : Number(capM[1])) : 20;
        // "A and B or C": A, plus one of B/C.
        for (const group of am[1].split(/,? and /i)) {
          const names = group.split(/,? or /i).map(clsAbility).filter(Boolean);
          let chosen = names;
          if (names.length > 1) {
            chosen = names.filter((a) => picks.abilities.includes(a)).slice(0, 1);
            if (!chosen.length) out.needsChoice.push(`which of ${names.join(' or ')} gets +${n}`);
            ask('ability', `+${n} to`, names, 1, chosen);
          }
          for (const a of chosen) out.mods.push({ path: `abilityScores.${a}.score`, bonus: n, cap, label: `${a.slice(0, 3).toUpperCase()} +${n}` });
        }
      }
    }
    // Unarmored AC: "your AC/Armor Class equals 10 + your Dexterity modifier + your Constitution modifier".
    if ((m = new RegExp(`(?:AC|Armor Class) equals 10 \\+ your Dexterity modifier \\+ your ${CLS_ABIL_RE}(?: or ${CLS_ABIL_RE})? modifier`, 'i').exec(s))) {
      const opts = [m[1], m[2]].filter(Boolean).map(clsAbility);
      const chosen = opts.length > 1 ? (opts.find((a) => picks.abilities.includes(a)) || null) : opts[0];
      if (opts.length > 1) ask('ability', 'AC adds', opts, 1, chosen ? [chosen] : []);
      out.mods.push({ path: 'armorClass', abilityMod: chosen || opts, label: `AC + ${chosen ? chosen.slice(0, 3).toUpperCase() : opts.map((a) => a.slice(0, 3).toUpperCase()).join('/')}`, when: cond || { noArmor: true }, acFormula: true });
    }
    // "Your armor class increases by 1" / "your AC increases by 1".
    if (!conditional && (m = /\b(?:armor class|AC) increases by (\d+)/i.exec(core))) out.mods.push({ path: 'armorClass', bonus: Number(m[1]), label: `AC +${m[1]}`, when: cond || null });
    // Speed while unarmored: "Your speed increases by 10 feet while you are not wearing armor…" (+ the table column).
    if ((m = /\b(?:walking )?speed increases by (\d+) feet/i.exec(s)) && (cond || !conditional)) {
      let n = Number(m[1]);
      const col = /as shown in the ([\w' -]+?) column/i.exec(t);
      const v = col && parseInt(String(((ctx.row || {})[col[1]]) || '').replace(/[^\d]/g, ''), 10);
      if (v) n = v;
      out.mods.push({ path: 'speed.base', bonus: n, label: `Speed +${n} ft`, when: cond || null });
    }
    // "You can add both your Wisdom and Charisma modifier to your maximum number of force points, instead of just one"
    // (Force Affinity: Bendu): SW5E adds the better one, so this adds the other.
    if ((m = new RegExp(`\\badd both your ${CLS_ABIL_RE} and ${CLS_ABIL_RE} modifiers? to your maximum number of (force|tech) points`, 'i').exec(s))) {
      const ab = [clsAbility(m[1]), clsAbility(m[2])];
      const kind = m[3].toLowerCase();
      out.mods.push({ path: `${kind}Casting.maxPoints`, abilityMod: ab, lowest: true, min: 0, label: `${kind === 'force' ? 'Force' : 'Tech'} points + the lower of ${ab.map((a) => a.slice(0, 3).toUpperCase()).join('/')}` });
    }
    // "When you make a weapon attack, you gain a +2 bonus to the damage roll" (Brute Force).
    if ((m = /when you make a (melee |ranged )?weapon attack, you gain a \+(\d+) bonus to the damage roll/i.exec(s))) {
      const n = Number(m[2]);
      out.mods.push({ path: 'weapon.damage', bonus: n, label: `Weapon damage +${n}` });
      if (!/ranged/i.test(m[1] || '')) out.mods.push({ path: 'unarmed.damage', bonus: n, label: `Unarmed damage +${n}` });
    }
    // Saving-throw auras that include you: "Whenever you or a friendly creature within 5 feet of you must make a saving
    // throw, the creature can add your Wisdom modifier to the saving throw" (Aura of Presence): your own saves.
    if ((m = new RegExp(`whenever you or a friendly creature[^.]*? must make a saving throw, (?:the creature|it|they) can add your ${CLS_ABIL_RE} modifier to (?:the|that|its) saving throw`, 'i').exec(s))) {
      const ab = clsAbility(m[1]);
      for (const a of CLS_ABILITIES) out.mods.push({ path: `abilityScores.${a}.savingThrowModifier`, abilityMod: ab, label: `${a.slice(0, 3).toUpperCase()} save + ${ab.slice(0, 3).toUpperCase()}` });
    }
    // "a bonus to AC equal to your Wisdom or Charisma modifier (your choice, minimum of +1)".
    if (!conditional && (m = new RegExp(`\\ba bonus to ([^.;]+?) equal to your ${CLS_ABIL_RE}(?: or ${CLS_ABIL_RE})? modifier(?: \\((?:your choice, )?minimum of \\+?(\\d+)\\))?`, 'i').exec(core))) {
      const opts = [m[2], m[3]].filter(Boolean).map(clsAbility);
      const chosen = opts.length > 1 ? (opts.find((a) => picks.abilities.includes(a)) || null) : opts[0];
      const got = clsFx.fxBonusMods ? clsFx.fxBonusMods(0, m[1], { notes: [] }) : null;
      if (opts.length > 1 && got && got.length) ask('ability', `Bonus to ${m[1].trim()} from`, opts, 1, chosen ? [chosen] : []);
      const ab = chosen ? chosen.slice(0, 3).toUpperCase() : opts.map((a) => a.slice(0, 3).toUpperCase()).join('/');
      for (const x of got || []) out.mods.push({ path: x.path, abilityMod: chosen || opts, min: m[4] ? Number(m[4]) : null, label: `${x.label.replace(/ [+\-−]?0$/, '')} + ${ab}`, when: cond || null });
    }
    // "+N bonus to <phrase>" (AC, initiative, saves, skills, tech/force attack and DC…), always or only sometimes.
    if (!conditional || /\bto (?:the )?(?:melee|ranged) (?:tech|force)|save dc of powers/i.test(core)) {
      for (const cm of core.matchAll(/([+\-−])(\d+) (bonus|penalty) to ([^.;]+?)(?=(?:,? and (?:a|an) [+\-−]\d+ (?:bonus|penalty))|[.;]|$)/gi)) {
        const n = Number(cm[2]) * (cm[3].toLowerCase() === 'penalty' || cm[1] !== '+' ? -1 : 1);
        const phrase = cm[4].trim();
        if (/^the damage roll/i.test(phrase)) continue; // Brute Force, above
        const condMods = clsFx.fxCondMods && clsFx.fxCondMods(n, phrase, {});
        if (condMods && condMods.length) { out.mods.push(...condMods); continue; }
        if (conditional) continue;
        const list = /,|\band\b/.test(phrase) && /tech|force/i.test(phrase) && clsFx.fxListMods ? clsFx.fxListMods(n, phrase) : null;
        const got = list && list.length ? list : clsFx.fxBonusMods ? clsFx.fxBonusMods(n, phrase, { notes: [] }) : null;
        if (got && got.length) out.mods.push(...got.map((x) => (cond ? { ...x, when: cond } : x)));
      }
    }
    // Proficiencies: "You gain proficiency in Wisdom saving throws / heavy armor / martial blasters… / your choice of…"
    // Species traits say "You have proficiency in the Survival skill" / "…with Persuasion or Intimidation (your choice)".
    if ((m = /(?:\bgain|^\s*you have) proficiency (?:in|with) (.+?)(?:\.|$)/i.exec(s)) && !/if you don't already have it|already proficient/i.test(s)) {
      // "your choice of the Insight, Deception, Persuasion, or Sleight of Hand skills": the player picks.
      let rest = m[1].replace(/\(.*?\)/g, '');
      for (const ch of [...rest.matchAll(/your choice of (?:the |a |an )?(.+?)(?=,? and your choice|,? and (?:light|medium|heavy|simple|martial)\b|$)/gi)]) {
        const seg = ch[1];
        const listed = CLS_SKILLS.filter((sk) => new RegExp(`\\b${sk}\\b`, 'i').test(seg));
        const skills = /skill/i.test(seg) || listed.length ? picks.skills.filter((sk) => !listed.length || listed.includes(sk)) : [];
        const tools = /tool|kit|set|instrument|implement/i.test(seg) ? picks.others.filter((x) => !isWeapon(x)) : [];
        skills.forEach((sk) => out.profs.skills.push({ name: sk, level: 'Proficient' }));
        tools.forEach((tl) => out.profs.tools.push({ name: tl, level: 'proficient' }));
        if ((/skill/i.test(seg) || listed.length) && !skills.length) out.needsChoice.push(listed.length ? `one of ${listed.join(', ')}` : 'a skill');
        if (/tool|kit|set|instrument|implement/i.test(seg) && !tools.length) out.needsChoice.push(seg.replace(/ and .*$/, ''));
        if (/skill/i.test(seg) || listed.length) ask('skill', 'Skill proficiency', listed, clsCount(seg), skills);
        if (/tool|kit|set|instrument|implement/i.test(seg)) ask('tool', 'Tool proficiency', null, clsCount(seg), tools, seg.replace(/ and .*$/, ''));
        rest = rest.replace(ch[0], '');
      }
      // "one of the following skills: Intimidation, Persuasion, Stealth, or Perception": only the one(s) picked (the
      // list isn't split up below, where each name would count as a proficiency).
      for (const ch of [...rest.matchAll(/\b(a|an|one|two|three) of the following skills(?: of your choice)?:?\s*([^.;]+)/gi)]) {
        const listed = CLS_SKILLS.filter((sk) => new RegExp(`\\b${sk}\\b`, 'i').test(ch[2]));
        const n = clsCount(ch[1]);
        const chosen = picks.skills.filter((sk) => listed.includes(sk)).slice(0, n);
        chosen.forEach((sk) => out.profs.skills.push({ name: sk, level: 'Proficient' }));
        if (!chosen.length) out.needsChoice.push(`${n > 1 ? `${ch[1]} of` : 'one of'} ${listed.join(', ')}`);
        ask('skill', 'Skill proficiency', listed, n, chosen);
        rest = rest.replace(ch[0], '');
      }
      const items = rest.replace(/^\s*(?:and|the)\s+|\s*,?\s*and\s*$/g, '').split(/,\s*(?:and\s+)?|\s+and\s+(?=(?:your|one|two|three|the|light|medium|heavy|simple|martial|all|\w+(?:'s)? (?:kit|implements|set))\b)/i).map((x) => x.trim()).filter(Boolean);
      for (const it of items) {
        let x;
        // "Strength and Constitution saving throws" (both); "Intelligence or Wisdom saving throws" (one, from the note).
        if ((x = new RegExp(`^(${CLS_ABIL_ANY}(?:,? (?:and|or) ${CLS_ABIL_ANY})*) saving throws?$`, 'i').exec(it))) {
          const names = x[1].split(/,? (?:and|or) /i).map(clsAbility).filter(Boolean);
          if (/ or /i.test(x[1])) {
            const chosen = names.filter((a) => picks.abilities.includes(a)).slice(0, 1);
            chosen.forEach((a) => out.profs.saves.push(a));
            if (!chosen.length) out.needsChoice.push(`${names.join(' or ')} saving throws`);
            ask('ability', 'Saving throw proficiency', names, 1, chosen);
          } else names.forEach((a) => out.profs.saves.push(a));
        } else if (clsSkill(it.replace(/ skill$/i, ''))) out.profs.skills.push({ name: clsSkill(it.replace(/ skill$/i, '')), level: 'Proficient' });
        else if (/ or /i.test(it) && it.split(/,? or /i).every((p) => clsSkill(p.replace(/ skills?$/i, '')))) {
          // "Intimidation or Persuasion": one of them, from the note.
          const listed = it.split(/,? or /i).map((p) => clsSkill(p.replace(/ skills?$/i, '')));
          const chosen = picks.skills.filter((sk) => listed.includes(sk)).slice(0, 1);
          chosen.forEach((sk) => out.profs.skills.push({ name: sk, level: 'Proficient' }));
          if (!chosen.length) out.needsChoice.push(`one of ${listed.join(', ')}`);
          ask('skill', 'Skill proficiency', listed, 1, chosen);
        } else if (/\barmor\b|shields?/i.test(it)) out.profs.armor.push(it);
        else if (/^(?:simple|martial|all)?\s*(?:blasters|vibroweapons|lightweapons|weapons)\b/i.test(it)) out.profs.weapons.push(it);
        else if (/choice|of the following|\b(?:a|one|two|three|any) (?:skills?|tools?)\b|any (?:one|two)/i.test(it)) {
          if (/gain proficiency in (?:a|one|two) (?:skill|tool)/i.test(s)) continue; // read from the note below
          const isTool = /tool|kit|set|instrument|implement/i.test(it);
          const isWeap = !isTool && /blaster|vibroweapon|lightweapon|weapon/i.test(it);
          const listed = CLS_SKILLS.filter((sk) => new RegExp(`\\b${sk}\\b`, 'i').test(it));
          const skills = picks.skills.filter((sk) => /skill/i.test(it) || listed.includes(sk));
          const tools = isTool ? picks.others.filter((x) => !isWeapon(x)) : [];
          const weapons = isWeap ? picks.others.filter((x) => !ctx.isWeapon || isWeapon(x)) : [];
          skills.forEach((sk) => out.profs.skills.push({ name: sk, level: 'Proficient' }));
          tools.forEach((tl) => out.profs.tools.push({ name: tl, level: 'proficient' }));
          weapons.forEach((w) => out.profs.weapons.push(w));
          if (!skills.length && !tools.length && !weapons.length) out.needsChoice.push(it);
          if (/skill/i.test(it) || listed.length) ask('skill', 'Skill proficiency', listed, clsCount(it), skills, it);
          if (isTool) ask('tool', 'Tool proficiency', null, clsCount(it), tools, it);
          if (isWeap) ask('weapon', 'Weapon proficiency', null, clsCount(it), weapons, it);
        } else if (/kit|implements|set|instrument|tools?\b/i.test(it)) out.profs.tools.push({ name: it.replace(/^(?:a |an |the )/i, ''), level: 'proficient' });
      }
    }
    // "You are proficient with improvised weapons" (Brawler Style).
    if (/\byou are proficient with improvised weapons\b/i.test(s)) out.profs.weapons.push('improvised weapons');
    // "You gain proficiency in a skill and a tool, or two tools." (Lifelong Learning): from the note.
    if (/gain proficiency in (?:a|one|two) (?:skill|tool)/i.test(s) && !/gain proficiency (?:in|with) (?!a |one |two )/i.test(s)) {
      // "…one skill, one tool, and one weapon of your choice" (Human Versatility): the weapon among the other words.
      const wp = /\b(a|one|two) weapons?\b/i.exec(s);
      const weapons = wp && ctx.isWeapon ? picks.others.filter(isWeapon) : [];
      const tools = picks.others.filter((x) => !weapons.includes(x));
      picks.skills.forEach((sk) => out.profs.skills.push({ name: sk, level: 'Proficient' }));
      tools.forEach((tl) => out.profs.tools.push({ name: tl, level: 'proficient' }));
      weapons.forEach((w) => out.profs.weapons.push(w));
      if (!picks.skills.length && !picks.others.length) out.needsChoice.push('the skill/tool proficiencies');
      const sk = /\b(a|one|two) skills?\b/i.exec(s);
      const tl = /\b(a|one|two) tools?\b/i.exec(s);
      // "a skill and a tool, or two tools": two picks, skills or tools.
      if (/,? or (?:a|one|two) tools?\b/i.test(s)) ask('skilltool', 'Skill or tool proficiencies', null, 2, picks.skills.concat(picks.others), 'a skill and a tool, or two tools');
      else {
        if (sk) ask('skill', 'Skill proficiency', null, clsCount(sk[0]), picks.skills);
        if (tl) ask('tool', 'Tool proficiency', null, clsCount(tl[0]), tools, 'tool');
        if (wp) ask('weapon', 'Weapon proficiency', null, clsCount(wp[0]), weapons, 'weapons');
      }
    }
    // Expertise: "Choose two of your skill proficiencies… You gain expertise in those skills or tools."
    if (/\bexpertise\b/i.test(s) && /choose|of your choice|those skills/i.test(t) && !/\blevel of proficiency\b/i.test(s)) {
      picks.skills.forEach((sk) => out.profs.skills.push({ name: sk, level: 'Expertise' }));
      picks.others.forEach((tl) => out.profs.tools.push({ name: tl, level: 'expertise' }));
      if (!picks.skills.length && !picks.others.length) out.needsChoice.push('the skills/tools for expertise');
      // How many: "Choose two of your skill proficiencies… At 6th level, you can choose two more".
      const first = /\bchoose (one|two|three) of your (?:skill )?proficiencies\b/i.exec(t);
      if (first) {
        let count = clsCount(first[1]);
        for (const x of t.matchAll(/\bat (\d+)(?:st|nd|rd|th) level, you can choose (another two|two more|another|one more)\b/gi)) if (level >= Number(x[1])) count += /two/i.test(x[2]) ? 2 : 1;
        ask('expertise', 'Expertise', null, count, picks.skills.concat(picks.others));
      }
    }
    // Critical range: "Your critical hit range with weapons increases by 1" / "a critical hit on a roll of 19 or 20".
    if ((m = /critical hit ranges?(?: with weapons)? increases? by (\d+)/i.exec(s))) out.critRange = Math.max(out.critRange, Number(m[1]));
    if (!conditional && (m = /(?:score|scores) a critical hit on a roll of (\d+) or 20/i.exec(s))) out.critRange = Math.max(out.critRange, 20 - Number(m[1]));
    // Half proficiency on checks without proficiency (Led by the Force).
    if (/add half your proficiency bonus to any ability check you make that doesn(?:'|’)t already include your proficiency bonus/i.test(s)) out.halfProf = true;
    // "Your unarmed strike damage increases by one step" (Fists of Fury).
    if (/unarmed strike damage increases by one step|damage die for your unarmed strikes[^.]*increases by one step/i.test(s)) out.unarmedStep = 1;
    // Always-on advantages (the roller pre-selects them) and the rest of the defenses & senses. Gear
    // you switch on ("Activating or deactivating the jetpack requires a bonus action and, while
    // active, you have a flying speed of 30 feet") lists them as "when switched on".
    const toggle = /\b(?:activating or deactivating|toggling)\b[^.]*?\brequires an? (?:bonus )?action,? and,? while (?:it is )?active,\s*/i;
    const switched = toggle.test(core);
    // "You have resistance to necrotic damage, and while exposed to the vacuum of space…": the first part always holds.
    const dcore = core.replace(toggle, '').replace(/,? and (?:while|when|if)\b.*$/i, '');
    if (!/\b(?:when|whenever|if|until|for the next|for 1 minute|while (?!you are not wearing|wearing no))\b/i.test(dcore)) {
      const core = dcore; // eslint-disable-line no-shadow
      const def = (kind, txt) => out.defenses.push({ kind, text: txt.replace(/\s+/g, ' ').trim() + (switched ? ' (when switched on)' : '') });
      for (const am of (switched ? [] : core.matchAll(new RegExp(`\\badvantage on (initiative(?: checks| rolls)?|${CLS_ABIL_ANY} (?:checks|saving throws)(?:(?:,| and| or) (?:${CLS_ABIL_ANY} )?(?:checks|saving throws))*)(?! (?:against|that|made|to|involving))`, 'gi')))) {
        // "…saving throws and Strength (Athletics) checks that involve climbing": only sometimes.
        const after = /^[^.;]*/.exec(core.slice(am.index + am[0].length))[0];
        if (/^[^,]*?\b(?:that|against|involving|to avoid|made to|which)\b/i.test(after)) { def('advantage', `Advantage on ${am[1]}${after.replace(/,.*$/, '')}`); continue; }
        if (/^initiative/i.test(am[1])) { out.advantage.push({ kind: 'init' }); continue; }
        let last = null;
        for (const part of am[1].split(/,| and| or/)) {
          const a = clsAbility((/^\s*(\w+)/.exec(part) || [])[1]) || last;
          last = a;
          if (a) out.advantage.push({ kind: /saving/i.test(part) ? 'save' : 'check', ability: a });
        }
      }
      // "resistance to that damage", "…to the chosen damage types" (Dewback's Instinct): the types are in the notes.
      if ((m = /\b(?:you have|you gain|gain|have) resistance to (?:that (?:type of )?damage(?: type)?|the chosen damage(?: types?)?|the damage types? (?:you )?cho(?:se|ose|sen))\b/i.exec(core))) {
        const types = String(note || '').split(/[,;/+&]|\band\b|\bor\b/).map((x) => x.trim().toLowerCase()).filter((x) => /^(?:acid|cold|energy|fire|force|ion|kinetic|lightning|necrotic|poison|psychic|sonic|true)$/.test(x));
        if (types.length) def('resistance', `Resistance to ${types.join(', ')} damage`);
        else out.needsChoice.push('the damage type');
        const n = /\b(one|two|three) (?:damage )?types?\b/i.exec(t);
        ask('damage', 'Damage type', CLS_DAMAGE_TYPES, n ? clsCount(n[1]) : 1, types);
      } else if ((m = /\b(?:you have|you gain|gain|have) resistance to ([^.]*?damage(?: from [^.,]+)?)/i.exec(core))) def('resistance', `Resistance to ${m[1]}${/\byou and friendly creatures\b/i.test(core) ? ' (you and nearby allies)' : ''}`);
      if ((m = /\b(?:you are|you become|are|makes you) immune to ([^.]+)/i.exec(core)) || (m = /\b(?:gain|have) immunity to ([^.,]+(?:, [^.,]+)*)/i.exec(core))) def('immunity', `Immune to ${m[1]}`);
      if ((m = /\badvantage on ((?:[A-Za-z]+ )?saving throws (?:against|made to|that would)[^.;]+?)(?=[.;]|$)/i.exec(core))) def('advantage', `Advantage on ${m[1]}`);
      // "advantage on ability checks and saving throws to avoid being disarmed".
      if ((m = /\badvantage on (ability checks and saving throws (?:to avoid|against|made to)[^.;]+?)(?=[.;]|$)/i.exec(core))) def('advantage', `Advantage on ${m[1]}`);
      if ((m = /\bdarkvision (?:out )?(?:to |with |of )?(?:a range of )?(\d+) feet/i.exec(core))) def('sense', `Darkvision ${m[1]} ft`);
      // "advantage on Intelligence (Investigation) checks" / "advantage on Stealth checks".
      for (const sm of core.matchAll(new RegExp(`\\badvantage on (?:${CLS_ABIL_ANY} \\()?(${CLS_SKILLS.join('|')})\\)? checks(?! (?:against|that|made|to|involving))`, 'gi'))) {
        if (switched) def('advantage', `Advantage on ${clsSkill(sm[1])} checks`);
        else out.advantage.push({ kind: 'skill', skill: clsSkill(sm[1]) });
      }
      if ((m = /\b(blindsight|truesight|tremorsense) (?:to a range of |out to |of )?(\d+) feet/i.exec(core))) def('sense', `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]} ft`);
      else if ((m = /\b(blindsight|truesight|tremorsense) (?:out )?to a number of feet equal to (\d+) x your proficiency bonus/i.exec(core))) {
        def('sense', `${m[1][0].toUpperCase()}${m[1].slice(1)} ${ctx.pb ? `${Number(m[2]) * ctx.pb} ft` : `${m[2]} × proficiency bonus ft`}`);
      }
      for (const sm of core.matchAll(/\b(climbing|swimming|flying) speed (?:of (\d+) feet|equal (?:to )?your (?:walking |movement )?speed)/gi)) def('speed', `${sm[1][0].toUpperCase()}${sm[1].slice(1)} speed ${sm[2] ? sm[2] + ' ft' : 'equal to walking speed'}`);
      // "a swimming speed and a climbing speed equal to your walking speed": both.
      for (const sm of core.matchAll(/\ba (climbing|swimming|flying) speed and an? (?:climbing|swimming|flying) speed (?:of (\d+) feet|equal (?:to )?your (?:walking |movement )?speed)/gi)) def('speed', `${sm[1][0].toUpperCase()}${sm[1].slice(1)} speed ${sm[2] ? sm[2] + ' ft' : 'equal to walking speed'}`);
      if ((m = /\b((?:opportunity |ranged |melee )?attack(?:s| rolls) (?:made )?against you (?:have|are made with|has) disadvantage)/i.exec(core))) def('other', m[1][0].toUpperCase() + m[1].slice(1));
      if ((m = /can(?:'|’)t have disadvantage on ([^.]+)/i.exec(core)) && !/\b(?:creatures?|allies|ally|targets?|they|it)\b[^.]*$/i.test(core.slice(0, m.index))) def('other', `Can't have disadvantage on ${m[1]}`);
    }
    // Species Darkvision traits describe it without the word (and with an "as if"): "You can see in dim light within 60 feet of you as if it were bright light".
    if ((m = /\bsee in dim light within (\d+) feet of you as if it were bright light/i.exec(core)) && !out.defenses.some((d) => /^Darkvision/.test(d.text))) out.defenses.push({ kind: 'sense', text: `Darkvision ${m[1]} ft` });
  }
  // De-duplicate.
  const uniq = (list, key) => list.filter((x, i) => list.findIndex((y) => key(y) === key(x)) === i);
  out.profs.skills = uniq(out.profs.skills, (x) => x.name + x.level);
  out.profs.tools = uniq(out.profs.tools, (x) => x.name.toLowerCase() + x.level);
  out.profs.saves = [...new Set(out.profs.saves)];
  out.advantage = uniq(out.advantage, (x) => x.kind + (x.ability || ''));
  out.defenses = uniq(out.defenses, (x) => x.text.toLowerCase());
  out.needsChoice = [...new Set(out.needsChoice)];
  return out;
}

/**
 * A state the feature lets you switch on: "While raging, you gain the following benefits: - …",
 * "For the next minute…, you gain the following benefits", "you can use your action to gain the
 * following benefits for 1 minute", "granting the following benefits until the start of your next
 * turn", or an action that lasts a while. ctx: { level, row, note (picks a "####" sub-option) }.
 * Returns { word, duration, benefits: [text], advantage: [{ kind: 'check'|'save'|'init', ability }],
 * mods: [mod (weaponFilter for "melee weapon attack using Strength")], defenses } or null.
 */
function clsFeatureState(name, text, ctx) {
  const sub = clsChosenText(text, ctx.note);
  if (sub.choice && !sub.chosen.length) return null; // the option is picked first (Elemental Paragon)
  const t = clsScaleText(sub.text, Number(ctx.level) || 0);
  const flat = t.replace(/\s+/g, ' ');
  let word = null;
  let m;
  if ((m = /\bWhile ([a-z]+ing)\b,? you gain the following benefits/i.exec(flat))) word = m[1].toLowerCase();
  const timed = /For the next (minute|hour|10 minutes)[^.:]*?, you gain the following benefits/i.exec(flat);
  const sentences = flat.split(/(?<=[.:])\s+(?=[A-Z_*-])/);
  const ACT = CLS_ACT;
  // A benefits list counts when the sentence introducing it is such an act, or follows one that lasts
  // a while ("…for 1 hour. You gain the following benefits:"), not Martial Arts' "while unarmed".
  const leadAt = sentences.findIndex((s) => /\b(?:gain|gaining|granting|grants?|receive) the following benefits\b/i.test(s));
  const lead = leadAt >= 0 ? sentences[leadAt] : '';
  const listed = !!lead && (ACT.test(lead) || (leadAt > 0 && CLS_DURATION.test(sentences[leadAt - 1])) || /\bwhile the target is\b/i.test(lead));
  // "enter a balanced stance for one minute", "take a savage stance… for 1 minute", "become invisible for 1 minute".
  const selfTimed = sentences.find((s) => ACT.test(s) && /\b(?:enter|assume|adopt|take|become|focus|transform)\b[^.]{0,120}?\bfor (?:1|one|10|an?) (?:minute|hour)s?\b/i.test(s));
  const durM = leadAt > 0 && !ACT.test(lead) ? /\bfor (1|one|10|an?) (minute|hour)s?\b/i.exec(sentences[leadAt - 1]) : null;
  const lasts = /(?:lasts?|benefits|effects?|focus|stance|state|rage|form) for (1|one|10|an?) (minute|hour)s?/i.exec(flat)
    || /\bfor (1|one|10|an?) (minute|hour)s?\b/i.exec(selfTimed || '') || durM || /to a maximum (?:duration )?of (1|one|10) (minute|hour)s?/i.exec(flat);
  const nextTurn = /\b(?:benefits|effects?)[^.]{0,40}\buntil the (?:start|end) of your next turn\b|\bUntil the start of your next turn, you (?:have|gain)\b/i.test(flat);
  const activated = ACT.test(flat);
  if (!word && !timed && !listed && !selfTimed && !(lasts && activated) && !(nextTurn && activated)) return null;
  // "While raging, you gain the following benefits" in a feature that doesn't start the rage (Explosive):
  // more benefits for that state, added when it starts.
  const extension = !!word && !activated && !timed;
  const benefits = [];
  const listM = /following benefits[^:]*:\s*\n((?:\s*- .+\n?)+)/i.exec(t);
  if (listM) for (const line of listM[1].split('\n')) if (/^\s*- /.test(line)) benefits.push(line.replace(/^\s*- /, '').trim());
  // Without a list: "During that time, you also have…", "For the duration, …", "Until the start of your next turn, you have…".
  if (!benefits.length) {
    for (const s of sentences) {
      const bm = /^(?:Additionally, |Also, )?(?:during that time|for the duration|until the (?:start|end) of your next turn|while (?:in )?(?:this|that|the) (?:stance|state|form|focus|mode)|while (?:it is |this is )?active)\b,?\s*/i.exec(s);
      if (bm && s.length > bm[0].length) benefits.push(s.slice(bm[0].length).replace(/^./, (c) => c.toUpperCase()));
    }
  }
  const one = (n) => /^(1|one|an?)$/i.test(n);
  const duration = timed ? (timed[1] === 'minute' ? '1 minute' : timed[1] === 'hour' ? '1 hour' : timed[1])
    : nextTurn ? `until your next turn${lasts ? ` (renewable, up to ${one(lasts[1]) ? 1 : lasts[1]} ${lasts[2]}${one(lasts[1]) ? '' : 's'})` : ''}`
      : lasts ? `${one(lasts[1]) ? 1 : lasts[1]} ${lasts[2]}${one(lasts[1]) ? '' : 's'}` : '';
  // The benefits' numbers, advantages and defenses, read like a feature's permanent effects.
  const fe = clsFeatureEffects(benefits.join('\n'), ctx.note || '', ctx);
  const advantage = fe.advantage.slice();
  const mods = fe.mods.slice();
  for (const b of benefits) {
    if ((m = /melee weapon attack using (Strength|Dexterity)[^.]*bonus to the damage roll[^.]*?\bin the ([\w' -]+?) column/i.exec(b))) {
      const v = parseInt(String(((ctx.row || {})[m[2].trim()]) || '').replace(/[^\d]/g, ''), 10);
      if (v) mods.push({ path: 'weapon.damage', bonus: v, label: `Melee ${m[1].slice(0, 3).toUpperCase()} damage +${v}`, weaponFilter: { melee: true, ability: clsAbility(m[1]) } });
    } else if ((m = /melee weapon attack using (Strength|Dexterity), you gain a \+(\d+) bonus to the damage roll/i.exec(b))) {
      const v = Number(m[2]);
      mods.push({ path: 'weapon.damage', bonus: v, label: `Melee ${m[1].slice(0, 3).toUpperCase()} damage +${v}`, weaponFilter: { melee: true, ability: clsAbility(m[1]) } });
    }
  }
  return { name, word, extension, duration: extension ? '' : duration, benefits, advantage, mods, defenses: fe.defenses, critRange: fe.critRange };
}

/** "Malleable Maneuvering (Disc)" → "malleable maneuvering": for matching custom features to options. */
const clsBaseName = (name) => String(name || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/[’']/g, "'").trim().toLowerCase();

/**
 * A level table written only as markdown in an archetype's text (Tactical Specialist's "Tactical Superiority":
 * "Level|Maneuvers Known|Superiority Dice Quantity|" then "| 3rd| 4| 4|"…), in leveledTable's shape
 * ({ "3": [{ key, value }] }), or null. The header may lack its leading bar or have one separator too many.
 */
const clsTextTableCache = new Map();
function clsTextTable(text) {
  const t = String(text || '');
  if (!t || !t.includes('|')) return null;
  if (clsTextTableCache.has(t)) return clsTextTableCache.get(t);
  let out = null;
  const lines = t.replace(/\r/g, '').split('\n');
  for (let i = 0; i + 2 < lines.length && !out; i++) {
    if (!/^\|?\s*Level\s*\|/i.test(lines[i]) || !/^\|?\s*:?-{3,}/.test(lines[i + 1])) continue;
    const head = lines[i].split('|').map((c) => c.trim()).filter(Boolean);
    const rows = {};
    for (let j = i + 2; j < lines.length && /^\|/.test(lines[j]); j++) {
      const cells = lines[j].split('|').slice(1).map((c) => c.trim());
      const lv = parseInt(cells[0], 10);
      if (!lv) continue;
      rows[String(lv)] = head.slice(1).map((key, n) => ({ key, value: cells[n + 1] || '' }));
    }
    if (Object.keys(rows).length) out = rows;
  }
  clsTextTableCache.set(t, out);
  return out;
}

/** The text of an archetype table's column at a class level ("d6", "4"), or null. */
function clsArchetypeTableRaw(archetype, column, level) {
  const t = (archetype && archetype.leveledTable) || clsTextTable(archetype && archetype.text);
  if (!t || typeof t !== 'object') return null;
  let best = null;
  for (const [lvl, rows] of Object.entries(t)) {
    if (Number(lvl) > level) continue;
    const r = (Array.isArray(rows) ? rows : []).find((x) => x && x.key === column);
    if (r && (!best || Number(lvl) > best.lvl)) best = { lvl: Number(lvl), value: r.value };
  }
  return best ? String(best.value).trim() : null;
}

/** A value from an archetype's level table ({ "3": [{ key, value }] }) at a class level. */
function clsArchetypeTableAt(archetype, column, level) {
  const t = (archetype && archetype.leveledTable) || clsTextTable(archetype && archetype.text);
  if (!t || typeof t !== 'object') return null;
  let best = null;
  for (const [lvl, rows] of Object.entries(t)) {
    if (Number(lvl) > level) continue;
    const r = (Array.isArray(rows) ? rows : []).find((x) => x && x.key === column);
    if (r && (!best || Number(lvl) > best.lvl)) best = { lvl: Number(lvl), value: r.value };
  }
  if (!best) return null;
  const v = parseInt(String(best.value).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(v) ? v : null;
}

/**
 * Martial Arts and the like: "Your unarmed strikes and monk weapons gain the finesse property. You can roll a d4 in place
 * of the normal damage of your unarmed strike or monk weapon. This die changes as you gain monk levels, as shown in the
 * Martial Arts column of the monk table", with "monk weapons, which are vibroweapons with which you are proficient that
 * lack the dexterity, heavy, special, and two-handed properties" and "while you … aren't wearing armor or wielding a
 * shield". Returns { finesse, die ('d4'), column ('Martial Arts'), weapons: { name: 'monk weapons', desc: 'vibroweapons
 * that lack the … properties' } | null, noArmor, noShield } or null when the text says none of it.
 */
function clsMartialArts(text) {
  const t = String(text || '').replace(/\s+/g, ' ');
  const fin = /\byour unarmed strikes(?: and ([\w ]+?))? gain the finesse property/i.exec(t);
  const die = /\broll an? (d\d+) in place of the normal damage of your unarmed strike(?: or ([\w ]+?))?\./i.exec(t);
  if (!fin && !die) return null;
  const special = (fin && fin[1]) || (die && die[2]) || '';
  // "monk weapons, which are vibroweapons with which you are proficient that lack the dexterity, heavy, … properties"
  const def = special ? new RegExp(`${special.replace(/s$/, '')}s?, which are ((?:simple |martial )?(?:vibroweapons|blasters|lightweapons)) with which you are proficient( that lack the [\\w ,-]+? properties)?`, 'i').exec(t) : null;
  return {
    finesse: !!fin, die: die ? die[1] : '', column: (/as shown in the ([A-Z][\w' ]+?) column/.exec(t) || [])[1] || '',
    weapons: def ? { name: special, desc: `${def[1]}${def[2] || ''}` } : null,
    noArmor: /\baren't wearing armor\b|\bwearing no armor\b/i.test(t), noShield: /\bor wielding a shield\b|\bnot wielding a shield\b/i.test(t),
  };
}

if (typeof module !== 'undefined') module.exports = { parseClassOptions, clsSections, clsCountAt, clsColumnFor, clsBaseName, clsArchetypeTableAt, clsArchetypeTableRaw, clsTextFeatures, clsUsage,
  clsFeatureEffects, clsFeatureState, clsWeaponMatches, clsJoinProfList, clsNoteNames, clsNoteTokens, clsScaleText, clsChosenText, CLS_DAMAGE_TYPES, clsMartialArts };
