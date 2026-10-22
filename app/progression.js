/* SW5E Character Sheet Viewer: progression rules (creating a character, levelling up, proficiency choices).
 *
 * Read from SW5E's rules data, written into the fields SW5E's own engine reads (so sw5e.com shows the same):
 *   - skills: classes[i].skills (a class's skill picks; every class's are proficient), classes[i].expertise,
 *     background.skills; the engine adds the starting class's saving throws;
 *   - languages: Galactic Basic + species.language + background.languages, plus customLanguages;
 *   - tools and other proficiencies: customProficiencies [{ name, type: 'tool', proficiencyLevel, from }] (from: where
 *     the choice came from, so its picker can count it; the engine ignores it);
 *   - levels: classes[i] { name, levels, hitPoints: [one per level after the first character level],
 *     abilityScoreImprovements: [{ type: 'Ability Score Improvement', abilitiesIncreased: [{ name, value }] } |
 *     { type: 'Feat', name }] }, in order of the class's ASI levels; settings.isFixedHitPoints uses the table's
 *     average instead of hitPoints;
 *   - a background feat's ability increase: background.feat.abilityScoreImprovements { Ability: 1 }.
 * Pure functions (no DOM); viewer.js and builder.js call them.
 */
'use strict';

const PR_ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const PR_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const prNum = (w) => (PR_NUM[String(w).toLowerCase()] != null ? PR_NUM[String(w).toLowerCase()] : Number(w) || 0);
const prArr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const prSkillList = () => Object.keys(typeof FX_SKILLS !== 'undefined' ? FX_SKILLS : require('./effects.js').FX_SKILLS); // eslint-disable-line no-undef
const prSkillName = (s) => prSkillList().find((k) => k.toLowerCase() === String(s).trim().toLowerCase()) || null;
/** "A, B, C, and D" / "A, B or C" → ['A', 'B', 'C', 'D']. */
const prList = (s) => String(s || '').replace(/\.$/, '').split(/\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+/).map((x) => x.trim()).filter(Boolean);

// ------------------------------------------------------------- skills
/**
 * A skill choice: "Choose two from Athletics, Intimidation, Persuasion, and Piloting", "Choose two skills from …",
 * "Choose any four" → { count, options } (options null: any skill).
 */
function prSkillChoice(text, list) {
  const m = /\bchoose (any )?(\w+)(?: skills?)?(?: from (.+))?/i.exec(String(text || ''));
  if (!m || !prNum(m[2])) return null;
  if (m[1] || !m[3]) return { count: prNum(m[2]), options: null };
  const options = (prArr(list).length ? prArr(list) : prList(m[3])).map(prSkillName).filter(Boolean);
  return { count: prNum(m[2]), options: options.length ? options : null };
}

// ------------------------------------------------------------- multiclassing
/** SW5E's "Multiclassing Prerequisites" and "Multiclassing Proficiencies" tables, by class. */
function prMulticlassRules(modules) {
  const tables = prArr(modules && modules.referenceTables);
  const rows = (name) => {
    const t = tables.find((x) => x.name === name);
    return t ? String(t.content).split(/\r?\n/).map((l) => l.split('|').map((c) => c.trim()).filter(Boolean))
      .filter((cells) => cells.length >= 2 && !/^class$/i.test(cells[0]) && !/^:?-/.test(cells[0])) : [];
  };
  const prereq = {};
  for (const [cls, req] of rows('Multiclassing Prerequisites')) {
    prereq[cls] = req.split(/\s*,\s*/).map((part) => {
      const m = /^(.+?)\s+(\d+)$/.exec(part);
      return m ? { abilities: m[1].split(/\s+or\s+/i).map((a) => a.trim()), min: Number(m[2]) } : null;
    }).filter(Boolean);
  }
  const profs = {};
  for (const [cls, txt] of rows('Multiclassing Proficiencies')) {
    const out = { skills: null, tools: null, other: [] };
    for (const part of txt.split(/\s*,\s*/)) {
      let m;
      if ((m = /^(any|one|two)(?: (one|two))? skills?(?: from the class's (?:skill )?list)?$/i.exec(part))) {
        out.skills = { count: prNum(m[2] || m[1]) || 1, any: /^any/i.test(part) || !/class's/i.test(part) };
      } else if ((m = /^(one|two) tools? from the class's list$/i.exec(part))) out.tools = { count: prNum(m[1]) };
      else if (part) out.other.push(part);
    }
    profs[cls] = out;
  }
  return { prereq, profs };
}
/** The multiclass ability minimums not met: ["Wisdom or Charisma 13"]. */
function prMulticlassUnmet(prereq, scores) {
  return prArr(prereq).filter((r) => !r.abilities.some((a) => Number(scores[a]) >= r.min)).map((r) => `${r.abilities.join(' or ')} ${r.min}`);
}

// ------------------------------------------------------------- tools and languages
const PR_TOOL_KINDS = [
  [/gaming sets?/i, 'GamingSet'], [/musical instruments?|\binstruments?\b/i, 'MusicalInstrument'],
  [/artisan's implements|artisan’s implements/i, 'Tool'], [/specialist's kits?|specialist’s kits?/i, 'Kit'],
];
/**
 * Tool proficiencies a text gives: [{ count, options: [names] }] for choices, [{ fixed: name }] for named tools.
 * "Your choice of demolitions kit, security kit, or slicer's kit", "Two of your choice of artisan's implements,
 * gaming sets, or musical instruments", "One type of gaming set and one set of artisan's implements", "Disguise kit".
 * `tools`: the catalog's tools [{ name, equipmentCategory }].
 */
function prToolChoices(text, tools) {
  const all = prArr(tools);
  const t = String(text || '').trim();
  if (!t || /^none$/i.test(t)) return [];
  const named = (s) => all.filter((x) => new RegExp(`\\b${x.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")}\\b`, 'i').test(s)).map((x) => x.name);
  const kinds = (s) => PR_TOOL_KINDS.filter(([re]) => re.test(s)).flatMap(([, cat]) => all.filter((x) => x.equipmentCategory === cat).map((x) => x.name));
  // Groups: "X, your choice of …", "X and your choice of …", "X and one set of …".
  const parts = t.split(/\s*,\s*(?=(?:your choice|one|two|choose)\b)|\s+and\s+(?=(?:your choice|one|two)\b)/i);
  const out = [];
  for (const p of parts) {
    const count = prNum((/^(one|two|a|an)\b/i.exec(p) || /\bchoose (\w+)\b/i.exec(p) || [])[1] || 0)
      || (/^two\b/i.test(p) ? 2 : 0);
    const choice = /choice|\btypes?\b|\bset of\b|\bany\b|\bor\b|choose|^(?:one|two)\b/i.test(p);
    const options = [...new Set(kinds(p).concat(named(p)))];
    if (!choice) {
      const fixed = named(p);
      // A tool the catalog doesn't name ("Artificer's tools") is still a proficiency.
      (fixed.length ? fixed : [p.replace(/\.$/, '').replace(/^./, (c) => c.toUpperCase())]).forEach((n) => out.push({ fixed: n }));
      continue;
    }
    out.push({ count: count || 1, options: options.length && !/^(?:one|two|any one)(?: of your choice)?\.?$/i.test(p) ? options : all.map((x) => x.name) });
  }
  return out;
}
/** Languages "of your choice" in a text: "Two of your choice" → 2; "one more language of your choice" → 1. */
function prLanguageChoices(text) {
  const t = String(text || '');
  const m = /\b(one|two|three)(?: more| other| additional)?(?: languages?)? of your choice\b/i.exec(t);
  if (m) return { count: prNum(m[1]), options: null };
  const o = /your choice of ([A-Z][^.]*?)(?:\.|$)/.exec(t);
  return o ? { count: 1, options: prList(o[1].replace(/^either\s+/i, '')) } : null;
}
/** Every language SW5E's species data names (for language pickers), Galactic Basic and Binary first. */
function prLanguages(modules) {
  const names = new Set(['Galactic Basic', 'Binary']);
  for (const s of prArr(modules && modules.species)) {
    const l = String(s.language || '').trim();
    if (l && !/varies|non-verbal/i.test(l)) names.add(l);
  }
  return [...names];
}

// ------------------------------------------------------------- levels
/** XP needed for each level (index 0 = level 1). */
function prXpTable(modules) {
  const rows = prArr(modules && modules.characterAdvancements).filter((r) => Number.isFinite(Number(r.level)) && Number.isFinite(Number(r.experiencePoints)));
  return rows.length >= 20 ? rows.slice().sort((a, b) => a.level - b.level).map((r) => Number(r.experiencePoints))
    : [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
}
/** The class levels that give an Ability Score Improvement (its table's Features column). */
function prAsiLevels(classRef) {
  return Object.entries((classRef && classRef.levelChanges) || {})
    .filter(([, row]) => /Ability Score Improvement/i.test(String(row.Features || ''))).map(([l]) => Number(l)).sort((a, b) => a - b);
}
/** The features a class's table lists at a level: ["Danger Sense", "Berserker Approach"]. */
function prTableFeatures(classRef, level) {
  const row = ((classRef && classRef.levelChanges) || {})[String(level)] || {};
  return String(row.Features || '').split(/\s*,\s*/).map((x) => x.trim()).filter((x) => x && x !== '—' && x !== '-');
}
/**
 * The character with one more level in `className` (a new class when it has none): hit points from `hp` (a number:
 * rolled or the table's average) unless the character uses fixed hit points, an empty ASI slot when the class level
 * gives one, and XP raised to the new character level's threshold (as sw5e.com's builder does).
 */
function prAddLevel(raw, className, hp, modules) {
  const classes = prArr(raw.classes).map((k) => ({ ...k }));
  const ref = prArr(modules && modules.classes).find((c) => c.name === className);
  let k = classes.find((x) => x.name === className);
  const first = !classes.length;
  if (!k) {
    k = { name: className, levels: 0, hitPoints: [], abilityScoreImprovements: [] };
    classes.push(k);
  }
  k.levels = Number(k.levels || 0) + 1;
  const fixed = raw.settings && raw.settings.isFixedHitPoints;
  if (!first || k.levels > 1) k.hitPoints = prArr(k.hitPoints).concat(fixed ? (ref ? Number(ref.hitPointsAtHigherLevelsNumber) || 0 : 0) : Number(hp) || 0);
  if (first) k.hitPoints = [];
  k.abilityScoreImprovements = prArr(k.abilityScoreImprovements).slice();
  const total = classes.reduce((t, x) => t + Number(x.levels || 0), 0);
  const xp = prXpTable(modules)[total - 1] || 0;
  return { classes, experiencePoints: Math.max(Number(raw.experiencePoints) || 0, xp), classLevel: k.levels, total, asi: prAsiLevels(ref).includes(k.levels) };
}
/** What the character's ASI slots hold, per class: [{ cls, index, level, value }] in level order. */
function prAsiSlots(raw, modules) {
  const out = [];
  for (const k of prArr(raw.classes)) {
    const ref = prArr(modules && modules.classes).find((c) => c.name === k.name);
    prAsiLevels(ref).filter((l) => l <= Number(k.levels)).forEach((level, index) => out.push({ cls: k.name, index, level, value: prArr(k.abilityScoreImprovements)[index] || null }));
  }
  return out;
}
/** The ability increases of an ASI value (type 'Ability Score Improvement'), as { Strength: 2 }. */
function prAsiIncreases(v) {
  const out = {};
  if (v && /^(?:Ability Score Improvement|ASI)$/.test(v.type)) for (const a of prArr(v.abilitiesIncreased)) if (a && a.name) out[a.name] = (out[a.name] || 0) + (Number(a.value) || 0);
  return out;
}

// ------------------------------------------------------------- feats
/** The abilities named in a phrase: "Dexterity, Consitution, or Intelligence" (SW5E misspells some) → the three. */
const prAbilitiesIn = (s) => PR_ABILITIES.filter((a) => String(s || '').split(/[^A-Za-z]+/).some((w) => w.length >= 6 && w.slice(0, 3).toLowerCase() === a.slice(0, 3).toLowerCase()));
/**
 * The abilities a feat lets you increase by 1, or []. Read from the text, which SW5E's attributesIncreased doesn't
 * always match (Heat Shielded's leaves out the Constitution the text names; Resilient's is empty):
 * "Increase your Dexterity, Consitution, or Intelligence score by 1" → those three; "Increase an ability score of your
 * choice by 1" → all six; "Choose one ability score. … Increase the chosen ability score by 1" → all six; "Choose one
 * from Wisdom or Charisma. … Increase the chosen ability score by 1" → those two.
 */
function prFeatAbilities(featRef) {
  const t = String((featRef && featRef.text) || '').replace(/\s+/g, ' ');
  const m = /\bincrease (your|an|one|the chosen) ([^.]*?)\bscores?(?: of your choice)? by 1\b/i.exec(t);
  if (m && /^the chosen$/i.test(m[1])) {
    const c = /\bchoose one (?:from|of) ([^.]+?)\./i.exec(t);
    return c ? prAbilitiesIn(c[1]) : PR_ABILITIES.slice();
  }
  if (m && /^(?:an|one)$/i.test(m[1]) && /^ability $/i.test(m[2])) return PR_ABILITIES.slice();
  if (m) return prAbilitiesIn(m[2]);
  const a = prArr(featRef && featRef.attributesIncreased).filter(Boolean);
  if (!a.length || !/increase (?:your|an|one)[^.]*?score[^.]*?by 1/i.test(t)) return [];
  return a.some((x) => /^any$/i.test(x)) ? PR_ABILITIES.slice() : a.filter((x) => PR_ABILITIES.includes(x));
}
/** What else follows a feat's chosen ability: "You gain proficiency in saving throws using the chosen ability" → { save: true }. */
function prFeatChosenAbilityUse(featRef) {
  const t = String((featRef && featRef.text) || '').replace(/\s+/g, ' ');
  return { save: /\bproficiency in saving throws using the chosen ability\b/i.test(t) };
}

// ------------------------------------------------------------- ability scores
const PR_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const PR_POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const PR_POINTS = 27;
/** Points spent for scores { Strength: 15, … }, or null when a score is outside 8–15. */
function prPointBuyCost(scores) {
  let t = 0;
  for (const a of PR_ABILITIES) {
    const c = PR_POINT_COST[Number(scores[a])];
    if (c == null) return null;
    t += c;
  }
  return t;
}
/** A species' ability increases: its options ([{ text, picks: [{ abilities: [...], amount }] }]) from SW5E's data. */
function prSpeciesIncreases(speciesRef) {
  return prArr(speciesRef && speciesRef.abilitiesIncreased).map((opt) => ({
    picks: prArr(opt).map((x) => ({ abilities: prArr(x.abilities), amount: Number(x.amount) || 0 })),
  }));
}

// ------------------------------------------------------------- starting equipment
/** A class equipment line "- *(a)* mesh armor or *(b)* a combat suit, …" → [{ label: 'a', text }] (one entry, label '', when it has no options). */
function prEquipmentOptions(line) {
  const t = String(line || '').replace(/^\s*[-*]\s+/, '').trim();
  const parts = [...t.matchAll(/\*\((\w)\)\*\s*(.+?)(?=,?\s*(?:or\s+)?\*\(\w\)\*|$)/g)].map((m) => ({ label: m[1], text: m[2].replace(/,?\s+or\s*$|,\s*$/, '').trim() }));
  return parts.length ? parts : [{ label: '', text: t }];
}
const PR_SINGULAR = (s) => s.replace(/\b(\w+?)(ies)\b$/i, '$1y').replace(/\b(\w+?[^s])s\b$/i, '$1');
/**
 * The items of an equipment text: "a combat suit, blaster rifle or simple blaster, and two power cells" →
 * [{ qty: 1, choices: ['combat suit'] }, { qty: 1, choices: ['blaster rifle', 'simple blaster'] }, { qty: 2, choices: ['power cell'] }].
 * Credits ("a belt pouch containing 100 cr") come back as { credits: 100 } after the pouch.
 */
function prEquipmentItems(text) {
  const out = [];
  for (let p of String(text || '').replace(/\.$/, '').split(/,\s*(?:and\s+)?(?![^()]*\))|\s+and\s+(?![^()]*\))/)) {
    p = p.trim();
    if (!p) continue;
    const cr = /^(.*?)\s+containing\s+(\d[\d,]*)\s*cr\b/i.exec(p);
    if (cr) { if (cr[1].trim()) out.push(...prEquipmentItems(cr[1])); out.push({ credits: Number(cr[2].replace(/,/g, '')) }); continue; }
    const m = /^(a|an|one|two|three|four|five|ten|twenty|\d+)\s+(.+)$/i.exec(p);
    const qty = m ? (prNum(m[1]) || Number(m[1]) || ({ ten: 10, twenty: 20 })[m[1].toLowerCase()] || 1) : 1;
    let rest = (m ? m[2] : p).replace(/^(?:set|sets|type|types|pair|pairs) of\s+/i, '').replace(/^(?:a|an)\s+/i, '');
    const note = /\(([^)]*)\)/.exec(rest);
    rest = rest.replace(/\s*\([^)]*\)/g, '').trim();
    const words = rest.split(/\s+or\s+/i).map((x) => x.replace(/^(?:a|an|set of)\s+/i, '').trim()).filter(Boolean);
    // "light or medium physical shield": "light" takes the noun of the next choice.
    const choices = words.map((w, i) => (i < words.length - 1 && /^(?:light|medium|heavy|simple|martial|exotic)$/i.test(w) && /\s/.test(words[i + 1]) ? `${w} ${words[i + 1].split(/\s+/).slice(1).join(' ')}` : w));
    out.push({ qty, choices, note: note ? note[1] : '' });
  }
  return out;
}
const PR_WEAPON_CATS = [
  [/^simple vibroweapon/i, ['SimpleVibroweapon']], [/^martial vibroweapon/i, ['MartialVibroweapon']], [/^vibroweapon/i, ['SimpleVibroweapon', 'MartialVibroweapon']],
  [/^simple blaster/i, ['SimpleBlaster']], [/^martial blaster/i, ['MartialBlaster']], [/^blaster$/i, ['SimpleBlaster', 'MartialBlaster']],
  [/^simple lightweapon/i, ['SimpleLightweapon']], [/^martial lightweapon/i, ['MartialLightweapon']], [/^lightweapon/i, ['SimpleLightweapon', 'MartialLightweapon']],
];
/**
 * What an equipment phrase is in SW5E's catalog: { item } (one item), { options: [names] } (a kind: "simple blaster",
 * "gaming set"), or { custom } (not in the catalog: packs, an insignia…). `items`: the catalog's (non-enhanced) items.
 */
function prResolveEquipment(phrase, items) {
  const all = prArr(items).filter((i) => i.equipmentCategory);
  // "belt pouch containing the remainder…", "common clothes including a robe": the item, without the description.
  const p = String(phrase || '').trim().replace(/\s+/g, ' ').replace(/\s+(?:containing|including|with)\b.*$/i, '').replace(/^belt pouch$/i, 'pouch');
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'");
  // "Clothes, common" is also "common clothes".
  const names = (i) => [i.name, /^([^,]+),\s*(.+)$/.test(i.name) ? i.name.replace(/^([^,]+),\s*(.+)$/, '$2 $1') : null].filter(Boolean).map(norm);
  for (const cand of [p, PR_SINGULAR(p)]) {
    const hit = all.find((i) => names(i).includes(norm(cand)));
    if (hit) return { item: hit.name };
  }
  const single = PR_SINGULAR(p);
  for (const [re, cats] of PR_WEAPON_CATS) if (re.test(single)) return { options: all.filter((i) => cats.includes(i.weaponClassification)).map((i) => i.name) };
  for (const [re, cat] of PR_TOOL_KINDS) if (re.test(p)) return { options: all.filter((i) => i.equipmentCategory === cat).map((i) => i.name) };
  if (/^tools?\b/i.test(p)) return { options: all.filter((i) => ['Kit', 'Tool', 'GamingSet', 'MusicalInstrument'].includes(i.equipmentCategory)).map((i) => i.name) };
  if (/\bknife\b/i.test(p)) { const k = all.find((i) => /^vibroknife$/i.test(i.name)); if (k) return { item: k.name, note: p }; }
  return { custom: p.replace(/^./, (c) => c.toUpperCase()) };
}

/**
 * An equipment pack's contents (SW5E's Equipment chapter: "Costs 250 credits. Includes a backpack, two glowrods, 10 days
 * of field rations, … and 50 feet of fibercord cable strapped to the side of it.") as [{ qty, item }] for catalog items
 * and [{ qty, custom }] for the rest. "N days of field rations" are N "Field rations (one day's)"; "50 feet of fibercord
 * cable" is one "Fibercord cable, 50 ft (rolled)".
 */
function prPackContents(text, items) {
  const all = prArr(items).filter((i) => i.equipmentCategory);
  const t = String(text || '').replace(/^.*?\bIncludes\s+/i, '').replace(/\s+strapped to [^,.]*/gi, '').replace(/\.\s*$/, '');
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'");
  return prEquipmentItems(t).filter((x) => !x.credits).map((x) => {
    let qty = x.qty;
    let phrase = String(x.choices[0] || '');
    let feet = 0;
    const per = /^(?:days?|meals?) of (.+)$/i.exec(phrase);
    if (per) phrase = per[1];
    const ft = /^(?:feet|foot|ft\.?) of (.+)$/i.exec(phrase);
    if (ft) { feet = qty; qty = 1; phrase = ft[1]; }
    const r = prResolveEquipment(phrase, all);
    if (r.item) return { qty, item: r.item };
    const one = norm(PR_SINGULAR(phrase));
    // "Field rations (one day's)", "Stylus pen", "Fibercord cable, 50 ft (rolled)": the shortest name that starts with it;
    // "Clothes, costume": the part after the comma.
    const starts = all.filter((i) => [norm(phrase), one].some((s) => norm(i.name).startsWith(s + ' ') || norm(i.name).startsWith(s + ',') || norm(i.name).startsWith(s + ' (')))
      .sort((a, b) => a.name.length - b.name.length);
    const tail = all.find((i) => /,\s*/.test(i.name) && [norm(phrase), one].includes(norm(i.name.split(/,\s*/)[1])));
    const hit = starts[0] || tail;
    if (hit) {
      const len = /,\s*(\d+)\s*ft\b/i.exec(hit.name);
      return { qty: feet && len ? Math.max(1, Math.ceil(feet / Number(len[1]))) : qty, item: hit.name };
    }
    return { qty, custom: r.custom || phrase };
  });
}
/** "Costs 250 credits." → 250. */
const prPackCost = (text) => { const m = /\bCosts?\s+([\d,]+)\s*(?:credits|cr)\b/i.exec(String(text || '')); return m ? Number(m[1].replace(/,/g, '')) : 0; };

// ------------------------------------------------------------- background characteristics
/** A background's suggested characteristics: { traits, ideals, bonds, flaws } (each [{ roll, text }]). */
function prCharacteristics(bgRef) {
  const list = (v) => prArr(v).map((x) => ({ roll: Number(x.roll) || 0, text: String(x.description || x.text || '').trim() })).filter((x) => x.text);
  return { traits: list(bgRef && bgRef.personalityTraitOptions), ideals: list(bgRef && bgRef.idealOptions), bonds: list(bgRef && bgRef.bondOptions), flaws: list(bgRef && bgRef.flawOptions) };
}

if (typeof module !== 'undefined') {
  module.exports = {
    PR_ABILITIES, PR_STANDARD_ARRAY, PR_POINT_COST, PR_POINTS, prSkillChoice, prMulticlassRules, prMulticlassUnmet, prToolChoices,
    prLanguageChoices, prLanguages, prXpTable, prAsiLevels, prTableFeatures, prAddLevel, prAsiSlots, prAsiIncreases, prFeatAbilities, prFeatChosenAbilityUse,
    prPointBuyCost, prSpeciesIncreases, prList, prEquipmentOptions, prEquipmentItems, prResolveEquipment, prCharacteristics,
    prPackContents, prPackCost,
  };
}
