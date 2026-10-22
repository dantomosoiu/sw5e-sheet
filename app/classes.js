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
    // "_**Scholar:** 2nd and 13th level_", or "***Cybertech Engineering:** 3rd level*".
    const m = /^(?:_\*\*|\*\*\*)[^*]+:\*\*\s*([^_*]+)[_*]\s*/.exec(sec.body);
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
  if (max == null && /once you(?:'|’)ve used (?:this feature|it)|can(?:'|’)t use (?:this feature|it) again until|\b(?:cannot|can(?:'|’)t) do so again until\b/i.test(t)) max = 1;
  // "You have 3 luck points… You regain your expended luck points when you finish a long rest" (Lucky).
  if (max == null && (m = /\byou have (\d+|one|two|three|four|five|six) ([a-z-]+) points\b/i.exec(t)) && !/\b(?:force|tech|focus|hit)$/i.test(m[2])) { max = clsTimes(m[1]); basis = `${m[2]} points`; }
  if (max == null || max <= 0) return null;
  // "You gain an additional use at 5th, 9th, 13th, and 17th level."
  if ((m = /additional use (?:of (?:this feature|it) )?at ((?:\d+(?:st|nd|rd|th)(?:,? (?:and )?)?)+) level/i.exec(t))) {
    max += [...m[1].matchAll(/(\d+)/g)].filter((x) => level >= Number(x[1])).length;
  }
  // "You regain all expended uses when you complete a long rest" decides, even with "short or long rest" said about something
  // else (Splashclass Scholar: a creature's rest).
  const regain = /\bregain (?:all )?(?:expended |spent )?(?:uses|use)\b[^.]*?\b(?:finish|complete)s? a (short or long|long) rest/i.exec(t);
  let recharge = regain ? (/short/i.test(regain[1]) ? 'shortRest' : 'longRest')
    : /(?:finish|complete|completes|finishes) a short or long rest|short or long rest/i.test(t) ? 'shortRest'
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
  const d = String(desc).toLowerCase().replace(/^(?:and|the|a|an|one|two|three)\s+/, '').trim();
  const cls = String(w.weaponClassification || '');
  const tier = /^simple/i.test(cls) ? 'simple' : /^martial/i.test(cls) ? 'martial' : /^exotic/i.test(cls) ? 'exotic' : '';
  const kind = /blaster/i.test(cls) ? 'blaster' : /vibro/i.test(cls) ? 'vibroweapon' : /light/i.test(cls) ? 'lightweapon' : '';
  const props = (w.properties || []).map((p) => String(p).toLowerCase());
  const has = (p) => props.some((x) => x.startsWith(p.trim()));
  // "all simple weapons" is "simple weapons".
  const m = /^(simple|martial|all|exotic)?\s*(blasters?|vibroweapons?|lightweapons?|weapons?)\b(.*)$/.exec(d.replace(/^all (?=simple|martial|exotic)/, ''));
  const name = String(w.name || '').toLowerCase();
  if (!m) return !!name && [name, `${name}s`, `${name}es`].includes(d);
  // "blasters", "all blasters": the simple and martial ones; an exotic weapon needs its own proficiency (Exotic Weapon Training).
  if (m[1] === 'exotic' ? tier !== 'exotic' : tier === 'exotic' || (m[1] && m[1] !== 'all' && m[1] !== tier)) return false;
  if (!/^weapons?$/.test(m[2]) && m[2].replace(/s$/, '') !== kind) return false;
  let x;
  // "blasters that deal sonic damage" (Geonosian Weaponry).
  if ((x = /that deals? (\w+) damage/.exec(m[3])) && String(w.damageType || '').toLowerCase() !== x[1]) return false;
  if ((x = /with the ([\w ,-]+?) propert/.exec(m[3]))) {
    if (!x[1].split(/,\s*|\s+or\s+/).map((s) => s.replace(/^or /, '').trim()).filter(Boolean).some(has)) return false;
  }
  if ((x = /that lack the ([\w ,-]+?) propert/.exec(m[3]))) {
    if (x[1].split(/,\s*|\s+and\s+/).map((s) => s.replace(/^and /, '').trim()).filter(Boolean).some(has)) return false;
  }
  return true;
}

// Something you do to start a state: an action, a bonus action, a reaction, entering it.
const CLS_ACT = /\bas an? (?:bonus )?action\b|\bas a reaction\b|you can enter\b|you can (?:use your )?(?:bonus )?action\b|you can use your reaction\b|\buse (?:your|an?) (?:bonus )?action to\b/i;
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
const clsFx = typeof fxBonusMods !== 'undefined' ? { fxBonusMods, fxCondMods, fxListMods, FX_SKILLS } // eslint-disable-line no-undef
  : (typeof require !== 'undefined' ? require('./effects.js') : {});

// ------------------------------------------------------------- proficiencies
// A grant: "You gain proficiency in…", "You have proficiency with…", "You are proficient in…", "Your mastery of focus
// grants you proficiency in…", "…causes you to gain proficiency in…", "…, and gain proficiency with…".
const CLS_GRANT = /\b(?:you (?:also |then |instead |now )?(?:gain|have) proficiency|you are (?:also )?proficient|(?:grants?|gives?) you proficiency|you to gain proficiency|gain proficiency) (?:in|with) /gi;
const CLS_COUNT_RE = '(a|an|one|two|three|four|five)';
const clsToolWord = (s) => /\b(?:kits?|implements|sets?|instruments?|tools?)\b/i.test(s);
const CLS_WEAPON_KINDS = /^(?:all\s+)?(?:(?:simple|martial|exotic)\s+)?(?:blasters?|vibroweapons?|lightweapons?|weapons?)\b/i;

/**
 * One thing a proficiency grant names: { kind: 'save', names } | { kind: 'skill'|'armor'|'weapon'|'tool', name } |
 * { kind: 'initiative' } | { kind: 'chosen', of } ("the chosen kit": the feat's own pick) | { kind: 'choice', choice }
 * (what the player picks: "two skills of your choice", "one musical instrument", "three blasters or vibroweapons…"),
 * or null (it, them, "the chosen ability", languages…).
 */
function clsProfItem(seg, isWeapon) {
  const s = String(seg).trim().replace(/^(?:in|with)\s+/i, '').replace(/^the\s+/i, '').replace(/[.:]+$/, '').trim();
  const plain = s.replace(/\s+of your choice$/i, '');
  let m;
  if (!plain || /^(?:it|them|this|that|these|those)\b/i.test(plain)) return null;
  if (/^initiative(?: checks| rolls)?$/i.test(plain)) return { kind: 'initiative' };
  if ((m = /^chosen (.+)$/i.exec(plain))) return clsToolWord(m[1]) ? { kind: 'chosen', of: m[1] } : null;
  if (/^(?:all )?saving throws$/i.test(plain)) return { kind: 'save', names: CLS_ABILITIES.slice() };
  if ((m = new RegExp(`^${CLS_ABIL_RE} saving throws?$`, 'i').exec(plain))) return { kind: 'save', names: [clsAbility(m[1])] };
  const sk = clsSkill(plain.replace(/\s+skills?$/i, ''));
  if (sk) return { kind: 'skill', name: sk };
  if (/^(?:light|medium|heavy) armor$|^shields?$/i.test(plain)) return { kind: 'armor', name: plain.toLowerCase() };
  if (/^all armor$/i.test(plain)) return { kind: 'armors', names: ['light armor', 'medium armor', 'heavy armor'] };
  if ((m = new RegExp(`^${CLS_COUNT_RE}\\s+(?:set of |type of |kind of )?(.+)$`, 'i').exec(plain))) {
    const count = clsCount(m[1]);
    const what = m[2];
    if (/\bskills?$/i.test(what)) {
      // "two Intelligence, Wisdom, or Charisma skills": the skills of those abilities.
      const abil = [...what.matchAll(new RegExp(CLS_ABIL_RE, 'gi'))].map((x) => clsAbility(x[1]));
      const of = clsFx.FX_SKILLS || {};
      return { kind: 'choice', choice: { kind: 'skill', count, options: abil.length ? CLS_SKILLS.filter((k) => abil.includes(of[k])) : null, of: s } };
    }
    if (/\bsaving throws?$/i.test(what)) return { kind: 'choice', choice: { kind: 'ability', count, options: CLS_ABILITIES.slice(), of: s } };
    if (/\blanguages?$/i.test(what)) return null;
    if (clsToolWord(what)) return { kind: 'choice', choice: { kind: 'tool', count, options: null, of: s } };
    if (/\b(?:blasters?|vibroweapons?|lightweapons?|weapons?)\b/i.test(what)) return { kind: 'choice', choice: { kind: 'weapon', count, options: null, of: s } };
    return null;
  }
  if (CLS_WEAPON_KINDS.test(plain) || /^improvised weapons?$/i.test(plain)) return { kind: 'weapon', name: plain };
  // A weapon by name, singular or plural ("the vibroaxe", "vibroblades", "blaster pistols").
  if ([plain, plain.replace(/s$/i, ''), plain.replace(/es$/i, '')].some(isWeapon)) return { kind: 'weapon', name: plain };
  // "the lightsaber simple lightweapon": the weapon's name, then what kind it is.
  if ((m = /^(.+?)\s+(?:simple|martial|exotic)\s+(?:blaster|vibroweapon|lightweapon)$/i.exec(plain)) && isWeapon(m[1])) return { kind: 'weapon', name: m[1] };
  if (clsToolWord(plain)) return { kind: 'tool', name: plain };
  return null;
}

/** "light and medium armor", "Strength and Constitution saving throws", "the Insight and Deception skills": the noun is both's. */
function clsProfDistribute(parts) {
  return parts.map((p, i) => {
    const bare = p.replace(/^(?:in|with)\s+/i, '').replace(/^the\s+/i, '').trim();
    const noun = (re) => { const q = parts.slice(i + 1).find((x) => re.test(x)); return q ? re.exec(q)[0] : null; };
    if (/^(?:light|medium|heavy)$/i.test(bare)) { const n = noun(/\barmor$/i); return n ? `${bare} ${n}` : p; }
    if (/^(?:all )?(?:simple|martial)$/i.test(bare)) { const n = noun(/\b(?:blasters?|vibroweapons?|lightweapons?|weapons?)$/i); return n ? `${bare} ${n}` : p; }
    if (clsAbility(bare)) { const n = noun(/\bsaving throws?$/i); return n ? `${bare} ${n}` : p; }
    return p;
  });
}

/** "A, B, or C" (one of them): a choice of skills, saves, or tools (with a counted weapon choice among them: Baragwin). */
function clsProfAlternatives(text, isWeapon) {
  const alts = clsProfDistribute(text.split(/,\s*(?:or\s+)?|\s+or\s+/i).map((x) => x.trim()).filter(Boolean)).map((x) => clsProfItem(x, isWeapon)).filter(Boolean);
  if (alts.length && alts.every((a) => a.kind === 'skill')) return { kind: 'choice', choice: { kind: 'skill', count: 1, options: alts.map((a) => a.name), of: text } };
  if (alts.length && alts.every((a) => a.kind === 'save')) return { kind: 'choice', choice: { kind: 'ability', count: 1, options: alts.flatMap((a) => a.names), of: text } };
  return { kind: 'choice', choice: { kind: 'tool', count: 1, options: null, of: text }, alts };
}

/** Everything a grant's list names, as clsProfItem's items (choices included). */
function clsProfList(text, isWeapon) {
  let x = String(text).replace(/\s*\([^)]*\)/g, '').replace(/[.:;]+$/, '').trim();
  // "all martial light- and vibro- weapons": both kinds.
  x = x.replace(/\b((?:all )?(?:simple |martial )?)light-\s*and vibro-\s*weapons\b/i, '$1lightweapons and $1vibroweapons');
  // A property or damage phrase belongs to its weapon description ("with the burst or rapid property"): kept whole.
  const kept = [];
  x = x.replace(/\b(?:with|that lack) the [\w ,'-]+? propert(?:y|ies)\b|\bthat deals? \w+ damage\b/gi, (p) => `§${kept.push(p) - 1}§`);
  const back = (s) => s.replace(/§(\d+)§/g, (a, i) => kept[Number(i)]);
  const items = [];
  // "your choice of A, B, or C" (to the end, or to the next "and your choice of").
  for (const ch of [...x.matchAll(/(?:^|,?\s+(?:and\s+)?)(?:in\s+|with\s+)?your choice of (?:the\s+)?(.+?)(?=,?\s+and\s+(?:in\s+|with\s+)?your choice of\b|$)/gi)]) {
    items.push(clsProfAlternatives(back(ch[1]), isWeapon));
    x = x.replace(ch[0], ' ');
  }
  x = x.trim().replace(/^,\s*|,\s*$/g, '').trim();
  if (!x) return items;
  let m;
  // "two of the following skills of your choice: A, B, or C"; "two of the Perception, Piloting, Survival, and Acrobatics skills".
  if ((m = new RegExp(`^${CLS_COUNT_RE} of the following skills(?: of your choice)?:?\\s*(.+)$`, 'i').exec(x)) || (m = new RegExp(`^${CLS_COUNT_RE} of the (.+?) skills$`, 'i').exec(x))) {
    items.push({ kind: 'choice', choice: { kind: 'skill', count: clsCount(m[1]), options: CLS_SKILLS.filter((sk) => new RegExp(`\\b${sk}\\b`, 'i').test(m[2])), of: back(x) } });
    return items;
  }
  // "any combination of two skills or tools of your choice"; "a skill and a tool, or two tools".
  if ((m = new RegExp(`^any combination of ${CLS_COUNT_RE} skills or tools`, 'i').exec(x))) { items.push({ kind: 'choice', choice: { kind: 'skilltool', count: clsCount(m[1]), options: null, of: back(x) } }); return items; }
  if (/^an? skill and an? tool,? or two tools$/i.test(x)) { items.push({ kind: 'choice', choice: { kind: 'skilltool', count: 2, options: null, of: 'a skill and a tool, or two tools' } }); return items; }
  // One counted choice: "two Intelligence, Wisdom, or Charisma skills of your choice", "two vibroweapons or blasters…".
  if ((m = new RegExp(`^${CLS_COUNT_RE}\\s+(.+)$`, 'i').exec(x)) && !/,\s|\s+and\s+/i.test(m[2].replace(new RegExp(`^${CLS_ABIL_ANY}(?:,?\\s+(?:or\\s+|and\\s+)?${CLS_ABIL_ANY})*`, 'i'), ''))) {
    const it = clsProfItem(back(x), isWeapon);
    if (it) items.push(it);
    return items;
  }
  // "Persuasion or Deception", "Intelligence or Charisma saving throws", "armstech's implements, munitions kits, or two weapons".
  if (/\s+or\s+/i.test(x) && !/\s+and\s+/i.test(x)) { items.push(clsProfAlternatives(back(x), isWeapon)); return items; }
  const parts = clsProfDistribute(x.split(/,\s*(?:and,?\s+|as well as\s+)?|\s+and\s+|\s+as well as\s+/i).map((s) => back(s).trim()).filter(Boolean));
  for (const p of parts) { const it = clsProfItem(p, isWeapon); if (it) items.push(it); }
  return items;
}

/**
 * Give what a grant's items name (into `into`: { saves, skills, tools, weapons, armor }), choices from the player's
 * picks in the feature's note, and their pickers (asks). opts: { ifHas (a condition: the asks only count when it holds),
 * category (what "the chosen kit" is: "specialist's kit"), pb }. Returns what was granted, [{ kind, name }].
 */
function clsApplyProfList(items, into, picks, isWeapon, out, ask, opts = {}) {
  const got = [];
  const tools = picks.others.filter((x) => !isWeapon(x));
  const weapons = picks.others.filter(isWeapon);
  const conditional = !!opts.ifHas;
  const asked = (a) => { if (a && conditional) a.ifHas = opts.ifHas; return a; };
  const need = (text) => { if (!conditional) out.needsChoice.push(text); };
  const skill = (n) => { into.skills.push({ name: n, level: 'Proficient' }); got.push({ kind: 'skill', name: n }); };
  const tool = (n) => { into.tools.push({ name: n, level: 'proficient' }); got.push({ kind: 'tool', name: n }); };
  const save = (n) => { into.saves.push(n); got.push({ kind: 'save', name: n }); };
  const weapon = (n) => { into.weapons.push(n); got.push({ kind: 'weapon', name: n }); };
  // Weapon choices in one list are one pick ("one vibroweapon and one blaster of your choice": two weapons).
  const wch = items.filter((it) => it.kind === 'choice' && it.choice.kind === 'weapon' && !it.alts);
  if (wch.length > 1) {
    const count = wch.reduce((t, it) => t + it.choice.count, 0);
    const kinds = wch.map((it) => it.choice.of.replace(new RegExp(`^${CLS_COUNT_RE}\\s+`, 'i'), '').replace(/\s+of your choice$/i, '')
      .replace(/\b(blaster|vibroweapon|lightweapon|weapon)$/i, '$1s'));
    items = items.filter((it) => !wch.includes(it)).concat([{ kind: 'choice', choice: { kind: 'weapon', count, options: null, of: `${['', 'one', 'two', 'three', 'four'][count] || count} ${kinds.join(' or ')}` } }]);
  }
  for (const it of items) {
    if (it.kind === 'save') it.names.forEach(save);
    else if (it.kind === 'skill') skill(it.name);
    else if (it.kind === 'armor') { into.armor.push(it.name); got.push({ kind: 'armor', name: it.name }); }
    else if (it.kind === 'armors') it.names.forEach((n) => { into.armor.push(n); got.push({ kind: 'armor', name: n }); });
    else if (it.kind === 'weapon') weapon(it.name);
    else if (it.kind === 'tool') tool(it.name);
    else if (it.kind === 'initiative') {
      // "You are proficient in Initiative checks" (Alert): the proficiency bonus on initiative.
      if (opts.pb) out.mods.push({ path: 'initiative', bonus: opts.pb, label: `Initiative +${opts.pb} (proficient)` });
    } else if (it.kind === 'chosen') {
      // "You gain proficiency with the chosen kit" (Specialist: "Select one type of specialist's kit").
      const of = opts.category || it.of;
      const t = tools.slice(0, 1);
      t.forEach(tool);
      asked(ask('tool', 'Tool proficiency', null, 1, t, of));
      if (!t.length) need(`the ${it.of} (${of})`);
    } else if (it.kind === 'choice') {
      const c = it.choice;
      if (it.alts) {
        // One of several kinds ("Technology or one tool of your choice"; Baragwin's tools or two weapons): what was picked.
        const altSkills = it.alts.filter((a) => a.kind === 'skill').map((a) => a.name);
        const altWeapon = it.alts.find((a) => a.kind === 'choice' && a.choice.kind === 'weapon');
        const altTools = it.alts.filter((a) => a.kind === 'tool' || (a.kind === 'choice' && a.choice.kind === 'tool'));
        const s = picks.skills.filter((k) => altSkills.includes(k)).slice(0, 1);
        const w = altWeapon ? weapons.slice(0, altWeapon.choice.count) : [];
        const t = !s.length && !w.length && altTools.length ? tools.slice(0, 1) : [];
        s.forEach(skill); w.forEach(weapon); t.forEach(tool);
        if (altSkills.length) asked(ask('skill', 'Skill proficiency', altSkills, 1, s, c.of));
        if (altTools.length) asked(ask('tool', 'Tool proficiency', null, 1, t, altTools.map((a) => (a.kind === 'tool' ? a.name : a.choice.of)).join(' or ')));
        if (altWeapon) asked(ask('weapon', 'Weapon proficiency', null, altWeapon.choice.count, w, altWeapon.choice.of));
        if (!s.length && !w.length && !t.length) need(c.of);
        continue;
      }
      if (c.kind === 'skill') {
        const s = picks.skills.filter((k) => !c.options || c.options.includes(k)).slice(0, c.count);
        s.forEach(skill);
        asked(ask('skill', 'Skill proficiency', c.options, c.count, s, c.of));
        if (!s.length) need(c.options && c.options.length <= 6 ? `${c.count > 1 ? `${c.count} of` : 'one of'} ${c.options.join(', ')}` : c.of);
      } else if (c.kind === 'ability') {
        const a = picks.abilities.filter((x) => c.options.includes(x)).slice(0, c.count);
        a.forEach(save);
        asked(ask('ability', 'Saving throw proficiency', c.options, c.count, a, c.of));
        if (!a.length) need(`${c.options.join(' or ')} saving throws`);
      } else if (c.kind === 'tool') {
        const t = tools.slice(0, c.count);
        t.forEach(tool);
        asked(ask('tool', 'Tool proficiency', c.options, c.count, t, c.of));
        if (!t.length) need(c.of);
      } else if (c.kind === 'weapon') {
        const w = weapons.slice(0, c.count);
        w.forEach(weapon);
        asked(ask('weapon', 'Weapon proficiency', null, c.count, w, c.of));
        if (!w.length) need(c.of);
      } else if (c.kind === 'skilltool') {
        const both = picks.skills.concat(tools).slice(0, c.count);
        both.forEach((x) => (clsSkill(x) ? skill(clsSkill(x)) : tool(x)));
        asked(ask('skilltool', 'Skill or tool proficiencies', null, c.count, both, c.of));
        if (!both.length) need(c.of);
      }
    }
  }
  return got;
}

// ------------------------------------------------------------- resistances, immunities, vulnerabilities
const CLS_DEF_KIND = { resistance: 'resistance', resistant: 'resistance', immunity: 'immunity', immune: 'immunity', vulnerability: 'vulnerability', vulnerable: 'vulnerability' };
const CLS_DAMAGE_WORD = '(?:acid|cold|energy|fire|force|ion|kinetic|lightning|necrotic|poison|psychic|sonic|true|disease)';

/**
 * What a sentence makes you resistant, immune or vulnerable to: "You have resistance to necrotic damage", "You are
 * resistant to necrotic, poison, and psychic damage, and are immune to poison and disease", "giving you resistance to
 * fire damage", "…makes you immune to poison and disease", "You are vulnerable to ion damage". Not another creature's
 * ("your portable structures have resistance", "They gain resistance", "Creatures that can't be charmed are immune")
 * and not one that only holds sometimes ("When you expend…, you gain resistance…", "During that time, you also have…",
 * "While raging…"); "While wearing your spiked armor" is kept as `wearing`. [{ kind, what, wearing, allies }].
 */
function clsDefenseClauses(s) {
  const out = [];
  const lead = /\b(you (?:also )?(?:have|gain)|you are(?: also)?|you and (?:your|the|friendly)\b[\w' ,]{0,40}? have|(?:giving|making|makes?|make|grants?|gives?|granting) you|,?\s*and (?:are |have |gain )?)\s*(resistance|immunity|vulnerability|resistant|immune|vulnerable)\s+(?:to|against)\s+/gi;
  // A clause ends at ", and you…", ", and each…" — not inside a list of damage types ("necrotic, poison, and psychic damage").
  const end = new RegExp(`,?\\s+and\\s+(?:are|have|gain|you|resistant|immune|vulnerable|resistance|immunity)\\b|,\\s*and\\s+(?!${CLS_DAMAGE_WORD}(?:,|\\s+(?:and|or)\\b|\\s+damage\\b))|,\\s*(?:which|whenever|when|while|if|letting|until)\\b|\\s+\\(explained|\\s+(?:until|for (?:1|one) minute|for the next)\\b|[.;](?=\\s|$)|$`, 'i');
  let you = false;
  for (const m of s.matchAll(lead)) {
    const before = s.slice(0, m.index);
    if (/^,?\s*and\b/i.test(m[1])) {
      // "…, and are immune to…", "granting you advantage on … and resistance to …": the same "you" goes on.
      // Or after another "you" clause with no condition ("…, you no longer take damage from falling…, and have resistance…").
      const lastSentence = before.replace(/^.*[.;]\s+/, '');
      const youClause = /(?:^|[,;]\s*)you (?!r\b)/i.test(lastSentence) && !/\b(?:when|whenever|if|until|during|while)\b/i.test(lastSentence);
      if (!you && !youClause && !/\b(?:granting|giving) you\b/i.test(before)) continue;
    } else {
      const lastSentence = before.replace(/^.*[.;]\s+/, '');
      if (/\b(?:when|whenever|if|until|during|for the (?:duration|next)|for \d+ minutes?|as an? (?:bonus )?action|while (?!wearing (?:your|this|these)\b|you are wearing (?:your|this)\b))\b/i.test(lastSentence)) { you = false; continue; }
      you = true;
    }
    const rest = s.slice(m.index + m[0].length);
    const e = end.exec(rest);
    let what = rest.slice(0, e ? e.index : undefined).replace(/\s+/g, ' ').trim();
    if (!what || /\bthey\b|\bthem\b/i.test(what)) continue;
    what = what.replace(/^the damage of\b/i, 'damage from').replace(/^the damage\b/i, 'damage').replace(/\bdamage but (\w+) damage\b/i, 'damage except $1 damage');
    const wear = /\bwhile wearing (?:your|this|these) ([\w' -]+?)(?:,|\s+you\b)/i.exec(before.replace(/^.*[.;]\s+/, ''));
    const allies = /\byou and friendly creatures\b/i.test(before) || /^you and /i.test(m[1]);
    out.push({ kind: CLS_DEF_KIND[m[2].toLowerCase()], what, wearing: wear ? wear[1].trim() : null, allies });
  }
  // "You have disadvantage on Strength saving throws, and…", "…on attack rolls and on Wisdom (Perception) checks that rely
  // on sight when you… are in direct sunlight" (its own condition is part of it); not "…, during which you have…".
  for (const m of s.matchAll(/(?:^|[,;]\s*|\bAdditionally,\s*)you have disadvantage on ([^.;]+?)(?=,\s*and\b|\s+\(explained|[.;](?=\s|$)|$)/gi)) {
    const lastSentence = s.slice(0, m.index).replace(/^.*[.;]\s+/, '');
    if (/\b(?:when|whenever|if|until|during|while)\b/i.test(lastSentence) || /^(?:this|that|these|those|it|its)\b/i.test(m[1])) continue;
    out.push({ kind: 'disadvantage', what: m[1].replace(/\s+/g, ' ').trim(), wearing: null, allies: false });
  }
  return out;
}

/** [{ kind, name }] for the fixed things in a list (what an "If you are already proficient in X" names). */
const clsProfNames = (items) => items.flatMap((it) => (it.kind === 'save' ? it.names.map((n) => ({ kind: 'save', name: n }))
  : it.kind === 'armors' ? it.names.map((n) => ({ kind: 'armor', name: n }))
  : ['skill', 'armor', 'weapon', 'tool'].includes(it.kind) ? [{ kind: it.kind, name: it.name }] : []));

/**
 * The proficiencies a sentence grants, into out.profs (choices from the note's picks, their pickers into asks), and
 * the "already proficient" rules, which need the character's other proficiencies (resolved by the sheet):
 *   "If you are already proficient in it, you instead gain expertise in it": the last grant, in profs.upgrades;
 *   "If you are already proficient in light armor…, you also gain proficiency in medium armor", "If you already have
 *   this proficiency, you instead gain proficiency in Intelligence or Charisma saving throws": profs.chains
 *   ({ ifHas: [{ kind, name }], saves, skills, tools, weapons, armor }).
 * st.last: what the previous grant gave; st.category: what "the chosen …" is ("Select one gaming set").
 */
function clsReadProficiencies(s, st, picks, isWeapon, out, ask, opts) {
  // Without a list dash, a "#### Option" heading, or SW5E's "_**Tactical Specialist:** 3rd level_" in front.
  const sen = s.replace(/\r/g, ' ').replace(/^\s*_\*\*[^*]+:\*\*\s*[^_]+_\s*/, '').replace(/^\s*-\s*/, '').replace(/^#+\s*[^#]*?\s(?=You\b)/, '').trim();
  let m;
  if (/^if you are already proficient (?:in|with) (?:it|them|this \w+|that \w+|the chosen [\w' ]+?),? (?:you )?instead gain expertise/i.test(sen)) {
    out.profs.upgrades.push(...st.last.filter((x) => ['skill', 'save', 'tool'].includes(x.kind)));
    return;
  }
  if ((m = /^if you (?:are already proficient (?:in|with) (.+?)|already have (?:this|that|these) proficienc(?:y|ies))(?: when you take this feat)?,\s*(?:you\s+)?(?:also\s+|then\s+|instead\s+)?(?:gain|have) proficiency (?:in|with) (.+?)\.?$/i.exec(sen))) {
    const ifHas = m[1] ? clsProfNames(clsProfList(m[1], isWeapon)) : st.last;
    if (!ifHas.length) return;
    const gain = { saves: [], skills: [], tools: [], weapons: [], armor: [] };
    clsApplyProfList(clsProfList(m[2], isWeapon), gain, picks, isWeapon, out, ask, { ...opts, ifHas });
    out.profs.chains.push({ ifHas, ...gain });
    return;
  }
  if (/^if you\b/i.test(sen)) return; // another condition ("If you are already proficient with light armor, instead while…")
  // "You learn your choice of two languages and your choice of Charisma skill" (Silver Tongue): a skill of that ability.
  if ((m = new RegExp(`\\byou learn [^.]*?\\byour choice of (?:an? |one )?${CLS_ABIL_RE} skill\\b`, 'i').exec(sen))) {
    st.last = clsApplyProfList([{ kind: 'choice', choice: { kind: 'skill', count: 1, options: CLS_SKILLS.filter((k) => (clsFx.FX_SKILLS || {})[k] === clsAbility(m[1])), of: `one ${clsAbility(m[1])} skill` } }], out.profs, picks, isWeapon, out, ask, opts);
    return;
  }
  for (const g of sen.matchAll(CLS_GRANT)) {
    const before = sen.slice(0, g.index);
    // A grant to you that starts a clause, not "fighters gain proficiency" or "a tool you are proficient with".
    const ok = /^gain/i.test(g[0]) ? /,?\s*and\s*$/i.test(before)
      : /^(?:grants?|gives?|you to)\b/i.test(g[0]) || /(?:^|[,:;]|\band|\bAdditionally,?|\bAlso,?)\s*$/i.test(before);
    if (!ok) continue;
    const rest = sen.slice(g.index + g[0].length);
    const end = /\s+if you\b|,\s*(?:and\s+)?(?:you|they|it|which|when|while|but)\b|,?\s+and\s+(?:you|they|it)\b|,\s*and\s+gain\b|\s+which\s+(?:are|is)\b|[.;](?=\s|$)/i.exec(rest);
    const items = clsProfList(end ? rest.slice(0, end.index) : rest, isWeapon);
    st.last = clsApplyProfList(items, out.profs, picks, isWeapon, out, ask, opts);
  }
}

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
  const intro = String(text).split(/^#{4,}\s/m)[0];
  // "While wearing your spiked armor, you gain the effects of the chosen option" (Customized Armor): the option's numbers
  // count while armor is worn (wornGear; set on the mods at the end).
  const wornGear = sub.choice && (/\bwhile wearing your ([\w' ]+), you gain the (?:effects|benefits) of the chosen\b/i.exec(intro) || [])[1];
  if (sub.choice && sub.chosen.length && /\bfor the duration\b/i.test(intro)) {
    // Only during the state: not permanent numbers (the text stays on the card).
    return { mods: [], profs: { saves: [], skills: [], tools: [], weapons: [], armor: [], upgrades: [], chains: [] }, notes: [], needsChoice: [], asks: optionAsk(), advantage: [], critRange: 0, halfProf: false, unarmedStep: 0, defenses: [], passives: {} };
  }
  const t = clsScaleText(sub.text, level);
  // A state's benefits list ("While raging, you gain the following benefits: - …") isn't permanent;
  // other lists ("The Force flows through your body, granting the following benefits: - …") are.
  const sentences = t.replace(/([^\n]*?)([^\n.]*following (?:benefits|effects)[^\n]*)\n((?:\s*- [^\n]*(?:\n|$))+)/gi, (all, before, lead, list) => {
    const prev = before.split(/(?<=\.)\s+/).slice(-2).join(' ');
    return CLS_STATE_CUE.test(lead) || CLS_DURATION.test(prev) ? `${before}\n` : `${before}\n${list.replace(/^\s*- /gm, '')}`;
  }).replace(/\n+/g, ' ').split(/(?<=\.)\s+(?=[A-Z_*])/);
  const picks = clsNoteNames(note);
  const out = {
    mods: [], profs: { saves: [], skills: [], tools: [], weapons: [], armor: [], upgrades: [], chains: [] }, notes: [], needsChoice: [],
    advantage: [], critRange: 0, halfProf: false, unarmedStep: 0, defenses: [], asks: optionAsk(), passives: {},
  };
  const same = (x, a) => x.kind === a.kind && x.label === a.label && String(x.options) === String(a.options);
  const ask = (kind, label, options, count, chosen, of = '') => {
    const a = { kind, label, options: options && options.length ? options : null, count: count || 1, chosen: [...new Set(chosen || [])], of };
    const had = out.asks.find((x) => same(x, a));
    if (had) return had;
    out.asks.push(a);
    return a;
  };
  const isWeapon = typeof ctx.isWeapon === 'function' ? ctx.isWeapon : () => false;
  // Proficiency grants: what the previous one gave ("If you are already proficient in it…"), the proficiency bonus (Alert's
  // initiative; a feat's level is the character's), and what "the chosen kit" is ("Select one type of specialist's kit").
  const profState = { last: [] };
  const pb = Number(ctx.pb) || (level ? Math.ceil(level / 4) + 1 : 0);
  const sel = /\bselect one (?:type of |set of )?([^.]+?)\./i.exec(t);
  const category = sel ? sel[1].trim() : null;
  if (sub.choice && !sub.chosen.length) out.needsChoice.push(`one of ${sub.options.join(', ')}`);
  // Benefit lists of states ("While raging, you gain the following benefits: - …") aren't permanent.
  const permanent = sentences.filter((s) => !/following (?:benefits|effects)/i.test(s) && !/^- /.test(s));
  // Clauses that only say the feature's precondition is met by having the feature/equipment.
  const ALWAYS = /,?\s*\bwhile (?:you are |you're )?(?:not wearing[^,.]*|wearing no[^,.]*|using (?:your|this|a) [\w' ]+? as (?:a|your) (?:tech |force )?focus|wearing (?:your|these|this) (?:[\w']+ ){0,3}?(?:armor|harness|goggles|gloves|pack|implements|shield|suit|helmet|wristpad|platform|instrument|boots|belt)|wearing (?:your|these|this) [\w ]+?|wielding a weapon with which you are proficient)(?=[,.]|\s+(?:you|your)\b|$),?/gi;
  let m;
  // "Choose one from force- or tech-casting" (Casting Specialist), "Choose one from Wisdom or Charisma" (Cunning
  // Forcecaster, Spiritual Techcaster): the pick, for what follows ("+1 bonus to your force or tech save DC…").
  const fromChoice = /\bchoose one from ([\w-]+)(?: or |, )([\w-]+)\b/i.exec(t);
  let castingPick = null;
  if (fromChoice) {
    const abil = [fromChoice[1], fromChoice[2]].map(clsAbility);
    if (abil.every(Boolean)) ask('ability', 'Chosen ability', abil, 1, picks.abilities.filter((a) => abil.includes(a)).slice(0, 1));
    else {
      const opts = [fromChoice[1], fromChoice[2]].map((w) => (/^force/i.test(w) ? 'Force-casting' : /^tech/i.test(w) ? 'Tech-casting' : w));
      castingPick = opts.find((o) => new RegExp(`\\b${o.slice(0, 4)}`, 'i').test(String(note || ''))) || null;
      ask('option', 'Choose one', opts, 1, castingPick ? [castingPick] : []);
      if (!castingPick) out.needsChoice.push(opts.join(' or '));
    }
  }
  // A damage type the player picks: "Choose one of the following damage types: acid, cold, fire, lightning, or sonic".
  // Or any of them: "Choose three damage types other than true damage" (Dewback's Instinct).
  const dtList = /\bchoose (one|two|three) of the following damage types:?\s*([^.]+)/i.exec(t) || /\bchoose (one|two|three) damage types?(?: other than (\w+)(?: damage)?)?\b/i.exec(t);
  const dtOptions = !dtList ? null : /following/i.test(dtList[0]) ? CLS_DAMAGE_TYPES.filter((d) => new RegExp(`\\b${d}\\b`, 'i').test(dtList[2]))
    : CLS_DAMAGE_TYPES.filter((d) => d !== String(dtList[2] || '').toLowerCase());
  const dtPicked = String(note || '').split(/[,;/+&]|\band\b|\bor\b/).map((x) => x.trim().toLowerCase()).filter((x) => CLS_DAMAGE_TYPES.includes(x) || x === 'true');
  if (dtList) ask('damage', 'Damage type', dtOptions, clsCount(dtList[1]), dtPicked.filter((d) => dtOptions.includes(d)));
  const SKILL_ALT = CLS_SKILLS.join('|');
  for (const s0 of permanent) {
    // Wordings of "a bonus to <it> equal to your <ability> modifier", read below: "When you make a Dexterity (Sleight of
    // Hand) check, you gain a bonus to that check equal to…" (Duplicitous Force); "When you make an ability check with the
    // chosen skill or tool, you can add half your Wisdom or Charisma modifier" (Ideal of the Artisan: the skill picked);
    // "You can add your Charisma modifier to your initiative rolls" (Rakish Audacity); "…you can add half your Charisma
    // modifier to your AC as long as it doesn't already include that modifier" (Artful Dancer).
    const s = s0
      .replace(/\byour Critical Analysis (?:ability )?(score|modifi?e?r)\b/gi, (all, w) => `your Intelligence ${/score/i.test(w) ? 'score' : 'modifier'}`)
      .replace(/\bmodifer\b/gi, 'modifier')
      // "…(minimum of +1) if it doesn't already include that modifier": not a condition, the rule against counting it twice.
      .replace(/,?\s*(?:if|as long as) it doesn(?:'|’)t already include (?:that|this|the) modifier/gi, '')
      .replace(new RegExp(`\\bWhen you make an? (?:${CLS_ABIL_ANY} \\()?(${SKILL_ALT})\\)? check, you (?:gain|have) a bonus to that check\\b`, 'i'), (all, sk) => `You gain a bonus to ${clsSkill(sk)} checks`)
      .replace(/\bWhen you make an ability check with the chosen skill(?: or tool)?, you can add (half )?your\b/i, (all, half) => (picks.skills[0] ? `You gain a bonus to ${picks.skills[0]} checks equal to ${half || ''}your` : all))
      .replace(new RegExp(`\\byou (?:can )?add (half )?your ${CLS_ABIL_RE} modifier to (?:your )?(AC|initiative(?: rolls| checks)?)(?: as long as it doesn(?:'|’)t already include that modifier)?`, 'i'),
        (all, half, ab, what) => `you gain a bonus to ${/^AC$/i.test(what) ? 'AC' : 'initiative'} equal to ${half || ''}your ${ab} modifier`);
    // Ideal of the Artisan: which skill (or tool) is the chosen one.
    if (/\bWhen you make an ability check with the chosen skill(?: or tool)?, you can add\b/i.test(s0)) ask('skill', 'Chosen skill', null, 1, picks.skills.slice(0, 1), 'one of your skill proficiencies');
    // Table rows ("| 16 | The creature becomes ravenous. |") aren't the character's sentences.
    if ((s.match(/\|/g) || []).length >= 2) continue;
    const cond = clsArmorCondition(s);
    const core = s.replace(ALWAYS, '');
    const conditional = CLS_CONDITIONAL.test(core);
    // Ability scores: "Your Strength or Dexterity score increases by 2, and your Constitution score
    // increases by 2" / "Your Dexterity and Wisdom or Charisma scores (your choice) increase by 2".
    if (!conditional) {
      const capM = /maximum for (?:this|those|these|that|the chosen) scores? (?:increases by|is now|increases to) (\d+)/i.exec(t);
      for (const am of core.replace(/\s*\(your choice\)/gi, '').matchAll(new RegExp(`\\b(${CLS_ABIL_ANY}(?:,? (?:and|or) ${CLS_ABIL_ANY})*) scores? (?:increases?|increase) by (\\d+)`, 'gi'))) {
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
    // "Your Strength score becomes equal to your Intelligence score" (Mutagenic Transformation, Critical Analysis read above).
    if ((m = new RegExp(`\\byour ${CLS_ABIL_RE} score becomes equal to your ${CLS_ABIL_RE} score`, 'i').exec(s))) {
      out.mods.push({ path: `abilityScores.${clsAbility(m[1])}.score`, setFrom: clsAbility(m[2]), label: `${clsAbility(m[1]).slice(0, 3).toUpperCase()} = ${clsAbility(m[2]).slice(0, 3).toUpperCase()} score` });
    }
    // "When you make a melee weapon attack using Dexterity, you add your rage damage to the damage roll" (Focused Rage, read
    // in a rage): the class table's Rage Damage on those attacks.
    // Only in the rage: "While raging, when you make…" is read when the rage starts (without its "While raging,").
    if (!/^While [a-z]+ing\b/i.test(s) && (m = /\bwhen you make a melee weapon attack using (Strength|Dexterity), you add your rage damage to the damage roll/i.exec(s))) {
      const v = parseInt(String((ctx.row || {})['Rage Damage'] || '').replace(/[^\d]/g, ''), 10);
      if (v) out.mods.push({ path: 'weapon.damage', bonus: v, label: `Melee ${m[1].slice(0, 3).toUpperCase()} damage +${v} (rage damage)`, weaponFilter: { melee: true, ability: clsAbility(m[1]) } });
    }
    // Unarmored AC: "your AC/Armor Class equals 10 + your Dexterity modifier + your Constitution modifier".
    if ((m = new RegExp(`(?:AC|Armor Class) equals 10 \\+ your Dexterity modifier \\+ your ${CLS_ABIL_RE}(?: or ${CLS_ABIL_RE})? modifier`, 'i').exec(s))) {
      const opts = [m[1], m[2]].filter(Boolean).map(clsAbility);
      const chosen = opts.length > 1 ? (opts.find((a) => picks.abilities.includes(a)) || null) : opts[0];
      if (opts.length > 1) ask('ability', 'AC adds', opts, 1, chosen ? [chosen] : []);
      out.mods.push({ path: 'armorClass', abilityMod: chosen || opts, label: `AC + ${chosen ? chosen.slice(0, 3).toUpperCase() : opts.map((a) => a.slice(0, 3).toUpperCase()).join('/')}`, when: cond || { noArmor: true }, acFormula: true });
    }
    // "…you can use your Intelligence modifier instead of your Dexterity modifier when determining your AC" (Instinctive
    // Combatant: in light or medium armor; spiked armor: Constitution while wearing it): the better of the two (acSwap).
    if ((m = new RegExp(`\\buse your ${CLS_ABIL_RE} modifier instead of your Dexterity modifier when determining your (?:AC|Armor Class)`, 'i').exec(s))) {
      const ab = clsAbility(m[1]);
      const when = /\bwearing light or medium armor\b/i.test(s) ? { armor: true, noHeavy: true } : /\bwhile wearing (?:your|this) [\w' ]*armor\b/i.test(s) ? { armor: true } : null;
      out.mods.push({ path: 'armorClass', acSwap: { to: ab, from: 'Dexterity' }, when, label: `AC: ${ab.slice(0, 3).toUpperCase()} instead of DEX` });
    }
    // "Your base AC becomes 13 + your Constitution modifier" (Upheld by the Force): unarmored, instead of 10 + Dexterity.
    if ((m = new RegExp(`\\bbase (?:AC|Armor Class) becomes (\\d+) \\+ your ${CLS_ABIL_RE} modifier`, 'i').exec(s))) {
      const ab = clsAbility(m[2]);
      out.mods.push({ path: 'armorClass', acFrom: { base: Number(m[1]), ability: ab }, acFormula: true, when: { noArmor: true }, label: `AC ${m[1]} + ${ab.slice(0, 3).toUpperCase()}` });
    }
    // "When you aren't wearing armor, your AC is 13 + your Dexterity modifier" (Adapted Hide, Integrated Subdermal Armor; a
    // species' hide, "While you are unarmored or wearing light armor…": in light armor, what it adds over the armor's base).
    if ((m = /\b(While you are unarmored(?: or wearing light armor)?|When you aren't wearing armor|While you aren't wearing armor|When you are not wearing armor), your (?:AC|Armor Class) (?:is|equals|becomes) (\d+) \+ your Dexterity modifier/i.exec(s))) {
      const n = Number(m[2]);
      out.mods.push({ path: 'armorClass', bonus: n - 10, acBase: n, acFormula: true, when: { noArmor: true, orLight: /light armor/i.test(m[1]) }, label: `AC ${n} + DEX` });
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
    if (!conditional && (m = new RegExp(`\\ba bonus to ([^.;]+?) equal to (half )?your ${CLS_ABIL_RE}(?: or ${CLS_ABIL_RE})? modifier(?: \\((?:your choice, )?minimum of (?:\\+?(\\d+)|(one))\\))?`, 'i').exec(core))) {
      const half = !!m[2];
      m = [m[0], m[1], m[3], m[4], m[5] || (m[6] ? '1' : undefined)]; // as before: phrase, the abilities, the minimum
      const opts = [m[2], m[3]].filter(Boolean).map(clsAbility);
      const chosen = opts.length > 1 ? (opts.find((a) => picks.abilities.includes(a)) || null) : opts[0];
      const got = clsFx.fxBonusMods ? clsFx.fxBonusMods(0, m[1], { notes: [] }) : null;
      if (opts.length > 1 && got && got.length) ask('ability', `Bonus to ${m[1].trim()} from`, opts, 1, chosen ? [chosen] : []);
      const ab = chosen ? chosen.slice(0, 3).toUpperCase() : opts.map((a) => a.slice(0, 3).toUpperCase()).join('/');
      for (const x of got || []) out.mods.push({ path: x.path, abilityMod: chosen || opts, ...(half ? { abilityHalf: true } : {}), min: m[4] ? Number(m[4]) : null, label: `${x.label.replace(/ [+\-−]?0$/, '')} + ${half ? 'half ' : ''}${ab}`, when: cond || null });
    }
    // "You gain a +1 bonus to your force or tech save DC and your force or tech attack modifier" (Casting Specialist): the
    // casting type picked.
    if ((m = /\+(\d+) bonus to your force or tech save DC and your force or tech attack modifier/i.exec(s))) {
      const n = Number(m[1]);
      if (castingPick === 'Tech-casting') out.mods.push({ path: 'techCasting.saveDC', bonus: n, label: `Tech save DC +${n}` }, { path: 'techCasting.attackModifier', bonus: n, label: `Tech attack +${n}` });
      if (castingPick === 'Force-casting') {
        for (const k of ['light', 'dark', 'universal']) out.mods.push({ path: `forceCasting.${k}SaveDC`, bonus: n, label: `${k[0].toUpperCase()}${k.slice(1)} force save DC +${n}` }, { path: `forceCasting.${k}AttackModifier`, bonus: n, label: `${k[0].toUpperCase()}${k.slice(1)} force attack +${n}` });
      }
      continue;
    }
    // "+N bonus to <phrase>" (AC, initiative, saves, skills, tech/force attack and DC…), always or only sometimes; not one
    // the sentence takes away ("Traveling at a fast pace no longer imposes a -5 penalty to your passive Wisdom (Perception)").
    const removed = /\b(?:no longer|doesn't|does not|don't|do not|never) (?:impose|imposes|give|gives|grant|grants|suffer|take)\b/i.test(core);
    if (!removed && (!conditional || /\bto (?:the )?(?:melee|ranged) (?:tech|force)|save dc of powers/i.test(core))) {
      // The phrase ends at the next clause: "You have a +1 bonus to AC, and you have advantage on…" (Small and Nimble).
      for (const cm of core.matchAll(/([+\-−])(\d+) (bonus|penalty) to ([^.;]+?)(?=(?:,? and (?:a|an) [+\-−]\d+ (?:bonus|penalty))|,\s*and\s+you\b|[.;]|$)/gi)) {
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
    // Proficiencies ("You gain proficiency in…", "You are proficient with…", "If you are already proficient…").
    clsReadProficiencies(s, profState, picks, isWeapon, out, ask, { pb, category });
    // Expertise: "Choose two of your skill proficiencies… You gain expertise in those skills or tools."
    if (/\byou gain expertise in (?:those|these|the chosen|them)\b/i.test(s)) {
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
    let x;
    // "…with unarmed strikes": those only (critOn). Not for one attack ("…, your critical hit range increases by 1 for that
    // attack": Enforcer) or while something lasts; some attacks only ("with melee weapon attacks using Dexterity"): listed.
    if ((m = /critical hit ranges?(?: with ([\w' ]+?))? increases? by (\d+)/i.exec(s)) && !conditional && !/\bfor (?:that|this|the) attack\b/i.test(s)) {
      const what = String(m[1] || '').replace(/^your /i, '');
      if (!what || /^weapons$/i.test(what)) out.critRange = Math.max(out.critRange, Number(m[2]));
      else if (/^unarmed strikes$/i.test(what)) { out.critRange = Math.max(out.critRange, Number(m[2])); out.critOn = 'unarmed'; }
      // "…with melee weapon attacks using Dexterity" (Battle Anticipation): those weapons (the dice card checks them).
      else if ((x = /^melee weapon attacks using (Strength|Dexterity)$/i.exec(what))) { out.critRange = Math.max(out.critRange, Number(m[2])); out.critOn = { melee: true, ability: clsAbility(x[1]) }; }
      else out.defenses.push({ kind: 'other', text: `Critical hit range +${m[2]} with ${what}` });
    }
    if (!conditional && (m = /(?:score|scores) a critical hit on a roll of (\d+) or 20/i.exec(s))) out.critRange = Math.max(out.critRange, 20 - Number(m[1]));
    // Half proficiency on checks without proficiency (Led by the Force).
    // Or only some: "…to any Strength, Dexterity, or Constitution check you make that doesn't already use your proficiency
    // bonus" (Remarkable Athlete), "…to any Charisma check…" (Social Opportunist), "Whenever you make an ability check that
    // uses your Intelligence, you can add half your proficiency bonus" (Cunning Intellect): halfProf lists the abilities.
    const halfOf = (abilities) => { out.halfProf = out.halfProf === true || !abilities.length ? true : [...new Set((Array.isArray(out.halfProf) ? out.halfProf : []).concat(abilities))]; };
    if ((m = new RegExp(`add half your proficiency bonus to any ((?:${CLS_ABIL_ANY}(?:,? (?:or|and) |,? )?)*)\\s*(?:ability )?check you make that doesn(?:'|’)t already (?:include|use) your proficiency bonus`, 'i').exec(s))) {
      halfOf([...m[1].matchAll(new RegExp(CLS_ABIL_RE, 'gi'))].map((x) => clsAbility(x[1])));
    } else if ((m = new RegExp(`\\bability check that uses your ${CLS_ABIL_RE}, you can add half your proficiency bonus(?: \\(rounded down\\))? if it doesn(?:'|’)t already include your proficiency bonus`, 'i').exec(s))) halfOf([clsAbility(m[1])]);
    // "Your unarmed strike damage increases by one step" (Fists of Fury).
    if (/unarmed strike damage increases by one step|damage die for your unarmed strikes[^.]*increases by one step/i.test(s)) out.unarmedStep = 1;
    // Always-on advantages (the roller pre-selects them) and the rest of the defenses & senses. Gear
    // you switch on ("Activating or deactivating the jetpack requires a bonus action and, while
    // active, you have a flying speed of 30 feet") lists them as "when switched on".
    const toggle = /\b(?:activating or deactivating|toggling)\b[^.]*?\brequires an? (?:bonus )?action,? and,? while (?:it is )?active,\s*/i;
    const switched = toggle.test(core);
    // "You have resistance to necrotic damage, and while exposed to the vacuum of space…": the first part always holds.
    const dcore = core.replace(toggle, '').replace(/,? and (?:while|when|if)\b.*$/i, '');
    // ("…, while leaving your hands free" isn't a condition.)
    if (!/\b(?:when|whenever|if|until|for the next|for 1 minute|while (?!you are not wearing|wearing no|leaving\b))\b/i.test(dcore)) {
      const core = dcore; // eslint-disable-line no-shadow
      const def = (kind, txt) => out.defenses.push({ kind, text: txt.replace(/\s+/g, ' ').trim() + (switched ? ' (when switched on)' : '') });
      for (const am of (switched ? [] : core.matchAll(new RegExp(`\\badvantage on (initiative(?: checks| rolls)?|${CLS_ABIL_ANY} (?:ability )?(?:checks|saving throws)(?:(?:,| and| or) (?:${CLS_ABIL_ANY} )?(?:ability )?(?:checks|saving throws))*)(?! (?:against|that|made|to|involving))`, 'gi')))) {
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
      // "advantage on ability checks and saving throws to avoid being disarmed".
      if ((m = /\badvantage on (ability checks and saving throws (?:to avoid|against|made to)[^.;]+?)(?=[.;]|$)/i.exec(core))) def('advantage', `Advantage on ${m[1]}`);
      if ((m = /\bdarkvision (?:out )?(?:to |with |of )?(?:a range of )?(\d+) feet/i.exec(core))) def('sense', `Darkvision ${m[1]} ft`);
      // "If you already have darkvision, this ideal increases its range by 30 feet" (Ideal of the Hunter): see defensesOf.
      if ((m = /\bif you already have darkvision, [^.]*?increases? its range by (\d+) feet/i.exec(t))) out.darkvisionPlus = Number(m[1]);
      // "advantage on Intelligence (Investigation) checks", "…on Charisma (Deception) and Charisma (Persuasion) checks": every
      // roll of the skill. With more after "checks" ("in that area", "to locate any secret doors", "you make about…") only
      // sometimes: listed with what it says, not on every roll.
      const SK = `(?:${CLS_ABIL_ANY} \\()?(${CLS_SKILLS.join('|')})\\)?`;
      // "…on checks you make with the chosen skill" (Careful Steps): the skill picked for the feature.
      if (/\badvantage on checks you make with the chosen skill\b/i.test(core)) picks.skills.slice(0, 1).forEach((skill) => out.advantage.push({ kind: 'skill', skill }));
      for (const sm of core.matchAll(new RegExp(`\\badvantage on (?:any )?${SK}(?: (?:and|or) (?:any )?${SK})? checks`, 'gi'))) {
        const skills = [sm[1], sm[2]].filter(Boolean).map(clsSkill);
        let after = /^[^.;]*/.exec(core.slice(sm.index + sm[0].length))[0].replace(/,\s*and\b.*$|\s+and\s+(?:you|resistance|advantage)\b.*$/i, '').replace(/,\s*$/, '').trim();
        // "…on Dexterity (Sleight of Hand) checks and Charisma (Deception) checks": the second one too.
        const more = new RegExp(`^and ${SK} checks`, 'i').exec(after);
        if (more) { skills.push(clsSkill(more[1])); after = after.slice(more[0].length).trim(); }
        if (switched || after) def('advantage', `Advantage on ${skills.join(' and ')} checks${after ? ` ${after}` : ''}`);
        else skills.forEach((skill) => out.advantage.push({ kind: 'skill', skill }));
      }
      if ((m = /\b(blindsight|truesight|tremorsense) (?:to a range of |out to |of )?(\d+) feet/i.exec(core))) def('sense', `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]} ft`);
      else if ((m = /\b(blindsight|truesight|tremorsense) (?:out )?to a number of feet equal to (\d+) x your proficiency bonus/i.exec(core))) {
        def('sense', `${m[1][0].toUpperCase()}${m[1].slice(1)} ${ctx.pb ? `${Number(m[2]) * ctx.pb} ft` : `${m[2]} × proficiency bonus ft`}`);
      }
      // "You gain your choice of a climbing or swimming speed equal to your walking speed" (Animalistic Momentum, Athletic):
      // the one picked.
      let speedCore = core;
      if ((m = /\byour choice of an? ((?:climbing|crawling|swimming|flying)(?:,? (?:or )?(?:climbing|crawling|swimming|flying))+) speed (?:equal to your walking speed|of (\d+) feet)/i.exec(core))) {
        const kinds = m[1].split(/,? (?:or )?/).map((k) => k.trim()).filter(Boolean);
        const chosen = kinds.filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(String(note || '')));
        ask('option', 'Speed', kinds, 1, chosen);
        chosen.slice(0, 1).forEach((k) => def('speed', `${k[0].toUpperCase()}${k.slice(1)} speed ${m[2] ? `${m[2]} ft` : 'equal to walking speed'}`));
        if (!chosen.length) out.needsChoice.push(`a ${kinds.join(' or ')} speed`);
        speedCore = core.replace(m[0], '');
      }
      // "a flying speed of 30 feet", "a burrow, fly, and swim speed equal to your movement speed", "swimming and climbing
      // speed equal to your walking speed", "a flying speed equal to half your walking speed". A speed that grows ("Your jet
      // pack's speed increases to 40 feet at 5th level, 50 feet at 9th level…"): at this level.
      const SPEED_KIND = '(?:climbing|swimming|flying|crawling|burrowing|burrow|fly|swim|climb)';
      const kindName = (k) => ({ burrow: 'burrowing', fly: 'flying', swim: 'swimming', climb: 'climbing' }[k.toLowerCase()] || k.toLowerCase());
      const grows = /\bspeed increases to ((?:\d+ feet at \d+(?:st|nd|rd|th) level(?:,? (?:and )?)?)+)/i.exec(t);
      for (const sm of speedCore.matchAll(new RegExp(`\\b(${SPEED_KIND}(?:,? (?:and )?(?:an? )?${SPEED_KIND})*) speeds? (?:of (\\d+) feet|equal (?:to )?(half )?your (?:current )?(?:walking |movement )?speed)`, 'gi'))) {
        let ft = sm[2] ? Number(sm[2]) : 0;
        if (ft && grows) for (const g of grows[1].matchAll(/(\d+) feet at (\d+)(?:st|nd|rd|th) level/gi)) if (level >= Number(g[2])) ft = Math.max(ft, Number(g[1]));
        for (const k of sm[1].split(/,? (?:and )?(?:an? )?/).filter((x) => new RegExp(`^${SPEED_KIND}$`, 'i').test(x))) {
          const name = kindName(k);
          def('speed', `${name[0].toUpperCase()}${name.slice(1)} speed ${ft ? `${ft} ft` : `equal to ${sm[3] ? 'half ' : ''}walking speed`}`);
        }
      }
      // "a swimming speed and a climbing speed equal to your walking speed": both.
      for (const sm of core.matchAll(/\ba (climbing|swimming|flying) speed and an? (?:climbing|swimming|flying) speed (?:of (\d+) feet|equal (?:to )?your (?:walking |movement )?speed)/gi)) def('speed', `${sm[1][0].toUpperCase()}${sm[1].slice(1)} speed ${sm[2] ? sm[2] + ' ft' : 'equal to walking speed'}`);
      if ((m = /\b((?:opportunity |ranged |melee )?attack(?:s| rolls) (?:made )?against you (?:have|are made with|has) disadvantage)/i.exec(core))) def('other', m[1][0].toUpperCase() + m[1].slice(1));
      if ((m = /can(?:'|’)t have disadvantage on ([^.]+)/i.exec(core)) && !/\b(?:creatures?|allies|ally|targets?|they|it)\b[^.]*$/i.test(core.slice(0, m.index))) def('other', `Can't have disadvantage on ${m[1]}`);
    }
    for (const d of clsDefenseClauses(s)) {
      const word = { resistance: 'Resistance to', immunity: 'Immune to', vulnerability: 'Vulnerable to', disadvantage: 'Disadvantage on' }[d.kind];
      const tail = `${d.wearing ? ` (while wearing your ${d.wearing})` : ''}${d.allies ? ' (you and nearby allies)' : ''}`;
      // "resistance to damage of the chosen type", "to that type of damage", "to the chosen damage types": the pick.
      if (/^(?:that (?:type of )?damage(?: type)?|damage of the chosen type|the chosen damage(?: types?)?|the damage types? (?:you )?cho(?:se|ose|sen))$/i.test(d.what)) {
        const types = dtOptions ? dtPicked.filter((x) => dtOptions.includes(x)) : dtPicked;
        if (types.length) out.defenses.push({ kind: d.kind, text: `${word} ${types.join(', ')} damage${tail}` });
        else out.needsChoice.push('the damage type');
        if (!dtList) { const n = /\b(one|two|three) (?:damage )?types?\b/i.exec(t); ask('damage', 'Damage type', CLS_DAMAGE_TYPES, n ? clsCount(n[1]) : 1, types); }
        continue;
      }
      out.defenses.push({ kind: d.kind, text: `${word} ${d.what}${tail}` });
    }
    // Species Darkvision traits describe it without the word (and with an "as if"): "You can see in dim light within 60 feet of you as if it were bright light".
    if ((m = /\bsee in dim light within (\d+) feet of you as if it were bright light/i.exec(core)) && !out.defenses.some((d) => /^Darkvision/.test(d.text))) out.defenses.push({ kind: 'sense', text: `Darkvision ${m[1]} ft` });
    // "…advantage on saving throws against poison, and you have resistance…"; "…on Wisdom and Charisma saving throws against force
    // powers"; "…on Constitution saving throws that you make to maintain your concentration on a power when you take damage"
    // (War Caster: its own "when" is part of it). Not one that holds only after something ("When you…, you have advantage…").
    // Yours ("you have", "Shistavanen have"; not "it has", "a respirator that grants…"), and not for a while ("…until the start
    // of your next turn").
    const advBefore = (i) => core.slice(0, i).replace(/^.*[.;]\s+/, '');
    if ((m = new RegExp(`\\badvantage on ((?:(?:${CLS_ABIL_ANY})(?:,? (?:and|or) ${CLS_ABIL_ANY})* )?saving throws (?:against|made to|that would|that you make to)[^.;]+?)(?=,?\\s+and\\s+(?:you|resistance|when|whenever|if)\\b|\\s+\\(explained|[.;]|$)`, 'i').exec(core))
      && !/\b(?:when|whenever|if|until|during|for the next|for 1 minute|while (?!you are not wearing|wearing no))\b/i.test(advBefore(m.index))
      && (!/\b(?:it|they|creatures?|ally|allies|targets?|that grants)\b/i.test(advBefore(m.index)) || /\byou and\b/i.test(advBefore(m.index)))
      && !/\buntil\b|\bfor (?:1|one|the next) minute\b/i.test(m[1])) {
      out.defenses.push({ kind: 'advantage', text: `Advantage on ${m[1]}` });
    }
    // "You can communicate telepathically with creatures within 30 feet of you" (Kel Dor): a sense, listed.
    if ((m = /\byou can communicate telepathically with (?:any )?creatures? within (\d+) feet of you/i.exec(core))) out.defenses.push({ kind: 'sense', text: `Telepathy ${m[1]} ft` });
    // "You can't be surprised while you are conscious" (Alert).
    if (/\byou can(?:'|’)t be surprised\b/i.test(core)) out.defenses.push({ kind: 'other', text: `Can't be surprised${/while you are conscious/i.test(core) ? ' while conscious' : ''}` });
    // "You ignore the strength property of heavy armor" (Gank): heavy armor too strong for you doesn't slow you (the sheet).
    if (/\byou ignore the strength property of heavy armor\b/i.test(core)) out.ignoreArmorStrength = true;
    // "If you are able to hear, you are aware of the location of any hidden or invisible creature within 10 feet of you"
    // (Blindsense: its "if" is the sense's own condition).
    if ((m = /\byou are aware of the location of any hidden or invisible creature within (\d+) feet of you/i.exec(core))) out.defenses.push({ kind: 'sense', text: `Blindsense ${m[1]} ft${/\bif you are able to hear\b/i.test(core) ? ' (if you can hear)' : ''}` });
    // Hit point maximum: "increases by 1, and it increases by 1 every time you gain a level" (Toughness: from the character's
    // level), "…by 3, and it increases by 1 again whenever you gain a level in this class" (Path of Iron: from the level the
    // feature came at), "…by a number equal to your level, and it increases by 1 every time you gain a level" (Mutagenic
    // Hardiness), "…by an amount equal to twice your level when you gain this feat. Whenever you gain a level thereafter,
    // … by an additional 2" (Durable).
    const charLevel = Number(ctx.charLevel) || level;
    let hp = null;
    if ((m = /\bhit point maximum increases by (\d+),? and it increases by (\d+) (?:again )?(?:every time|whenever) you gain a level( in this class)?/i.exec(s))) {
      const from = m[3] ? (Number(ctx.featureLevel) || Number(m[1])) : 1;
      hp = Number(m[1]) + Number(m[2]) * Math.max(0, (m[3] ? level : charLevel) - from);
    } else if (/\bhit point maximum increases by a number equal to your level,? and it increases by 1 every time you gain a level/i.test(s)) hp = charLevel;
    else if (/\bhit point maximum increases by an amount equal to twice your level when you gain this feat/i.test(s)) hp = 2 * charLevel;
    if (hp) out.mods.push({ path: 'hitPoints.maximum', bonus: hp, label: `HP maximum +${hp}` });
    // "Your maximum attunement increases by 1" (Investigative Attunement): a number of the sheet's, not the engine's.
    if ((m = /\byour maximum attunement increases by (\d+)/i.exec(s))) out.mods.push({ path: 'attunement.maximum', bonus: Number(m[1]), label: `Attunement +${m[1]}` });
    // "You are considered to have advantage when determining your passive Wisdom (Perception) and passive Intelligence
    // (Investigation) scores" (Observant): +5 to each. Passive Perception is the engine's; the others the skills table adds.
    if ((m = /\bconsidered to have advantage when determining your (passive [^.]+?) scores?\b/i.exec(s))) {
      for (const pm of m[1].matchAll(new RegExp(`passive (?:${CLS_ABIL_ANY} \\()?(${CLS_SKILLS.join('|')})\\)?`, 'gi'))) {
        const sk = clsSkill(pm[1]);
        if (sk === 'Perception') out.mods.push({ path: 'passivePerception', bonus: 5, label: 'Passive Perception +5 (advantage)' });
        else out.passives[sk] = 5;
      }
    }
    // "…damage that you take from weapons is reduced by an amount equal to your proficiency bonus" (Defense Mastery): listed,
    // with its condition ("While you are wearing medium or heavy armor with which you are proficient").
    // Not one attack's ("the damage you take from the attack is reduced by 1d10 + …": a reaction).
    if ((m = /\bdamage (?:that )?you take from (?!the\b|that\b|this\b)([\w ]+?) is reduced by (?:an amount equal to )?(your proficiency bonus|\d+(?![\dd]))/i.exec(s))) {
      const n = /\d/.test(m[2]) ? m[2] : pb || 'your proficiency bonus';
      const when = /\bwhile you are wearing (medium or heavy|heavy|medium) armor\b/i.exec(s);
      out.defenses.push({ kind: 'other', text: `Damage from ${m[1]} reduced by ${n}${when ? ` (in ${when[1].toLowerCase()} armor)` : ''}` });
    }
    // "Your unarmed strikes deal 1d4 kinetic damage and have the finesse property" (Zabrak, Unnatural Weaponry), "Your modified
    // armor's unarmed strike deals 1d8 kinetic damage" (power fists).
    if ((m = /\byour (?:modified armor's )?unarmed strikes? deals? (\d+)d(\d+) \w+ damage(,? and (?:have|has) the finesse property)?/i.exec(s))) {
      out.unarmedDie = Math.max(out.unarmedDie || 0, Number(m[2]));
      if (m[3]) out.unarmedFinesse = true;
    }
    // "You can substitute Strength, Constitution, or Intelligence (chosen when you take this vow) for Wisdom or Charisma for
    // your monk class features" (Vow of the Focused): the ability picked, for the class's other features (the sheet).
    if ((m = new RegExp(`\\byou can substitute ((?:${CLS_ABIL_ANY}(?:,? (?:or )?)?)+)\\s*(?:\\([^)]*\\)\\s*)?for ((?:${CLS_ABIL_ANY}(?:,? (?:or )?)?)+) for your (\\w+) class features`, 'i').exec(s))) {
      const opts = [...m[1].matchAll(new RegExp(CLS_ABIL_RE, 'gi'))].map((x) => clsAbility(x[1]));
      const chosen = picks.abilities.filter((a) => opts.includes(a)).slice(0, 1);
      ask('ability', 'Substitute ability', opts, 1, chosen);
      if (chosen.length) out.substitute = { with: chosen[0], for: [...m[2].matchAll(new RegExp(CLS_ABIL_RE, 'gi'))].map((x) => clsAbility(x[1])) };
      else out.needsChoice.push(`the ability to substitute (${opts.join(', ')})`);
    }
    // "You can now gain the benefits of your Martial Arts and Unarmored Movement features while wearing light or medium armor as
    // long as you are not wielding a shield" (Vow of the Sentry, Crimson Armaments): for those features (the sheet).
    if ((m = /\bgain the benefits of your ([\w ]+?) features? while wearing light or medium armor(?: as long as you are not wielding a shield)?/i.exec(s))) {
      out.armorAllows = { features: m[1].split(/,? and |, /).map((x) => x.trim()), when: { noHeavy: true, noShield: /not wielding a shield/i.test(m[0]) } };
    }
    // "You can't add more than +3 when determining your bonus to AC from your Dexterity" (Muscled Menace; a Hutt's Slow and
    // Lethargic), "…to Dexterity saving throws from Dexterity", "…to attack and damage rolls for weapon attacks using
    // Strength" (Puny, Fragile): what the modifier adds over that is taken off (capAbility; resolved with the final scores).
    if ((m = /\bcan.?t add more than \+(\d+)/i.exec(s))) {
      const at = Number(m[1]);
      // AC: where it adds all of the Dexterity modifier (no armor or light armor; medium armor already stops at +2).
      if (/\bbonus to AC from your Dexterity\b/i.test(s)) out.mods.push({ path: 'armorClass', capAbility: 'Dexterity', capAt: at, when: { noArmor: true, orLight: true }, label: `AC: Dexterity counts up to +${at}` });
      if (/\bbonus to Dexterity saving throws from Dexterity\b/i.test(s)) out.mods.push({ path: 'abilityScores.Dexterity.savingThrowModifier', capAbility: 'Dexterity', capAt: at, label: `DEX saves: Dexterity counts up to +${at}` });
      if (/\bbonus to attack and damage rolls for weapon attacks using Strength\b/i.test(s)) {
        for (const p of ['weapon.toHit', 'weapon.damage']) out.mods.push({ path: p, capAbility: 'Strength', capAt: at, weaponFilter: { ability: 'Strength' }, label: `${p === 'weapon.toHit' ? 'Attack' : 'Damage'}: Strength counts up to +${at}` });
      }
    }
  }
  if (wornGear && /\barmor\b/i.test(wornGear)) out.mods = out.mods.map((x) => (x.when ? x : { ...x, when: { armor: true } }));
  // "You learn an additional language and an additional skill proficiency from the above list at 11th level" (Mystical
  // Erudition): one more pick from the same skills.
  if ((m = /\ban additional skill proficiency from the above list at (\d+)(?:st|nd|rd|th) level/i.exec(t)) && level >= Number(m[1])) {
    const a = out.asks.find((x) => x.kind === 'skill' && x.options);
    if (a) {
      a.count += 1;
      const more = picks.skills.filter((sk) => a.options.includes(sk) && !out.profs.skills.some((x) => x.name === sk)).slice(0, 1);
      more.forEach((sk) => { out.profs.skills.push({ name: sk, level: 'Proficient' }); a.chosen.push(sk); });
    }
  }
  // De-duplicate.
  const uniq = (list, key) => list.filter((x, i) => list.findIndex((y) => key(y) === key(x)) === i);
  out.profs.skills = uniq(out.profs.skills, (x) => x.name + x.level);
  out.profs.tools = uniq(out.profs.tools, (x) => x.name.toLowerCase() + x.level);
  out.profs.saves = [...new Set(out.profs.saves)];
  out.advantage = uniq(out.advantage, (x) => x.kind + (x.ability || x.skill || ''));
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
  const leadAt = sentences.findIndex((s) => /\b(?:gain|gaining|granting|grants?|receive) the following (?:benefits|effects)\b/i.test(s));
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
  // "…the following benefits:" or "…the following benefits for 1 minute. You can invoke a totem…" and the list below.
  // Not a list of things you can do ("create one of the following effects": Elemental Attunement).
  const listM = /\b(?:gain|gaining|granting|grants?|receive) the following (?:benefits|effects)[^\n]*\n((?:\s*- .+\n?)+)/i.exec(t);
  if (listM) for (const line of listM[1].split('\n')) if (/^\s*- /.test(line)) benefits.push(line.replace(/^\s*- /, '').trim());
  // Without a list: "During that time, you also have…", "For the duration, …", "Until the start of your next turn, you have…".
  if (!benefits.length) {
    let on = false;
    for (const s of sentences) {
      const bm = /^(?:Additionally, |Also, )?(?:during that time|for the duration|until the (?:start|end) of your next turn|while (?:in )?(?:this|that|the) (?:stance|state|form|focus|mode)|while (?:it is |this is |this ability is )?active)\b,?\s*/i.exec(s);
      if (bm && s.length > bm[0].length) { benefits.push(s.slice(bm[0].length).replace(/^./, (c) => c.toUpperCase())); on = true; }
      // "…you have resistance to cold… You also gain a burrow, fly, and swim speed…" (Avatar): the next one goes on.
      else if (on && /^(?:You also |Additionally, you )/i.test(s)) benefits.push(s.replace(/^Additionally, you/i, 'You').replace(/^You also /i, 'You '));
      else on = false;
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

/**
 * A feature's own numbers for its card: the save DC it states ("…must make a Wisdom saving throw (DC = 8 + your proficiency
 * bonus + your Constitution modifier)") and its damage at a level ("…takes 2d6 sonic damage… The damage increases to 4d6
 * at 5th level"). ctx: { level, pb, mods: { Constitution: 2, … } }. { dc: { value, ability, save }, damage: { dice, type } }
 * or null.
 */
function clsFeatureNumbers(text, ctx) {
  const t = String(text || '').replace(/\s+/g, ' ');
  const out = {};
  let m;
  if ((m = new RegExp(`\\bDC (?:=|equals|of) 8 \\+ your proficiency bonus \\+ your ${CLS_ABIL_RE} modifier`, 'i').exec(t)) && ctx.pb) {
    const ab = clsAbility(m[1]);
    const save = new RegExp(`\\b${CLS_ABIL_RE} saving throw \\((?:save )?DC`, 'i').exec(t);
    out.dc = { value: 8 + Number(ctx.pb) + (Number((ctx.mods || {})[ab]) || 0), ability: ab, save: save ? clsAbility(save[1]) : null };
  }
  if ((m = /\btakes? (\d+d\d+) (\w+) damage\b/i.exec(t))) {
    let dice = m[1];
    const grows = /\bdamage increases to ((?:\d+d\d+ at \d+(?:st|nd|rd|th) level(?:,? (?:and )?)?)+)/i.exec(t);
    if (grows) for (const g of grows[1].matchAll(/(\d+d\d+) at (\d+)(?:st|nd|rd|th) level/gi)) if (Number(ctx.level) >= Number(g[2])) dice = g[1];
    out.damage = { dice, type: m[2].toLowerCase() };
  }
  return out.dc || out.damage ? out : null;
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

if (typeof module !== 'undefined') module.exports = { parseClassOptions, clsSections, clsCountAt, clsColumnFor, clsBaseName, clsArchetypeTableAt, clsArchetypeTableRaw, clsTextFeatures, clsUsage,
  clsFeatureEffects, clsFeatureState, clsFeatureNumbers, clsWeaponMatches, clsJoinProfList, clsNoteNames, clsNoteTokens, clsScaleText, clsChosenText, CLS_DAMAGE_TYPES };
