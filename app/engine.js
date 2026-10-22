/* The sheet's own rules engine: a character's numbers from SW5E's character data and rules, computed the way SW5E's
 * engine on sw5e.com does, so the sheet needs no sw5e.com to recalculate. Every result is checked against SW5E's
 * (dev/engine-check.js); the parts it doesn't compute yet are left out of what it returns.
 *
 *   const ctx = engContext({ rules, catalog });   // SW5E's rules modules and item list, indexed once
 *   engCompute(raw, ctx)                          // the computed sheet, in SW5E's shape
 */
'use strict';

const ENG_ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const engArr = (x) => (Array.isArray(x) ? x : []);
const engNum = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : 0);
const engMod = (score) => Math.floor((engNum(score) - 10) / 2);
const engLc = (s) => String(s || '').trim().toLowerCase();

/** Rules modules and items by name, for the lookups the engine makes. */
function engContext({ rules, catalog }) {
  const mods = rules || {};
  const byName = (list) => {
    const m = new Map();
    for (const x of engArr(list)) if (x && x.name && !m.has(engLc(x.name))) m.set(engLc(x.name), x);
    return m;
  };
  return {
    mods,
    classes: byName(mods.classes), archetypes: byName(mods.archetypes), species: byName(mods.species),
    backgrounds: byName(mods.backgrounds), feats: byName(mods.feats), items: byName(catalog),
    skills: engArr(mods.skills).length ? engArr(mods.skills).map((s) => ({ name: s.name, ability: s.baseAttribute })) : [],
    advancement: engArr(mods.characterAdvancements).slice().sort((a, b) => a.level - b.level),
  };
}

/** A tweak at `path` in raw.tweaks: { bonus, override, proficiency, … } or {}. */
function engTweak(raw, path) {
  let o = raw && raw.tweaks;
  for (const k of path.split('.')) o = o && typeof o === 'object' ? o[k] : undefined;
  return o && typeof o === 'object' ? o : {};
}
const engHasOverride = (t) => t.override != null && t.override !== '';
/** The sheet's "bump to" (a floor: at least this much), kept in the tweak beside SW5E's bonus and override. */
const engHasFloor = (t) => t.floor != null && t.floor !== '';
/**
 * A value with its tweak applied: an override replaces it, a bonus adds to it. The sheet's own "bump to" (t.floor, which
 * SW5E's tweaks don't have, so its numbers are unchanged) raises the result to at least that.
 */
const engTweaked = (value, t) => (engHasOverride(t) ? engNum(t.override)
  : engHasFloor(t) ? Math.max(value + engNum(t.bonus), engNum(t.floor)) : value + engNum(t.bonus));

const engProfRank = (p) => { const s = engLc(p); return s.startsWith('exp') ? 2 : s.startsWith('prof') ? 1 : s.startsWith('half') ? 0.5 : 0; };
const engProfWord = (rank) => (rank >= 2 ? 'expertise' : rank >= 1 ? 'proficient' : rank > 0 ? 'half proficient' : 'none');

/** Total level and the text SW5E shows for the classes: "Fighter (Assault Specialist) 3, Operative 1". */
function engLevels(raw) {
  const classes = engArr(raw.classes);
  return {
    level: classes.reduce((t, k) => t + engNum(k.levels), 0),
    classText: classes.map((k) => `${k.name}${k.archetype && k.archetype.name ? ` (${k.archetype.name})` : ''} ${engNum(k.levels)}`).join(', '),
  };
}

function engProficiencyBonus(ctx, level) {
  const row = ctx.advancement.filter((r) => engNum(r.level) <= Math.max(1, level)).pop();
  return row && row.proficiencyBonus != null ? engNum(row.proficiencyBonus) : Math.ceil(Math.max(1, level) / 4) + 1;
}

/** Ability scores before tweaks: base, the species' increases (fixed and chosen), Ability Score Improvements. */
function engBaseScores(raw, ctx) {
  const out = {};
  for (const a of ENG_ABILITIES) out[a] = engNum((raw.baseAbilityScores || {})[a]);
  const sp = raw.species || {};
  const rules = ctx.species.get(engLc(sp.name));
  const option = rules ? engArr(rules.abilitiesIncreased)[engNum(sp.abilityScoreImprovementSelectedOption)] : null;
  // Fixed increases come from the rules; the ones to choose ("Strength or Dexterity") are in the character.
  for (const inc of engArr(option)) {
    const list = engArr(inc.abilities);
    if (list.length === 1 && out[list[0]] != null) out[list[0]] += engNum(inc.amount);
  }
  for (const [a, n] of Object.entries(sp.abilityScoreImprovement || {})) if (out[a] != null) out[a] += engNum(n);
  // Only entries of type "Ability Score Improvement" count (SW5E ignores other types, e.g. a hand-written "ASI",
  // and the increase of a feat taken instead).
  for (const k of engArr(raw.classes)) {
    for (const asi of engArr(k.abilityScoreImprovements)) {
      if (!asi || asi.type !== 'Ability Score Improvement') continue;
      for (const x of engArr(asi.abilitiesIncreased)) if (x && out[x.name] != null) out[x.name] += engNum(x.value);
    }
  }
  // The background feat's own increase is kept with it: { abilityScoreImprovements: { Intelligence: 1 } }.
  for (const [a, n] of Object.entries((raw.background && raw.background.feat && raw.background.feat.abilityScoreImprovements) || {})) {
    if (out[a] != null) out[a] += engNum(n);
  }
  return out;
}

function engAbilities(raw, ctx, pb) {
  const base = engBaseScores(raw, ctx);
  const first = ctx.classes.get(engLc((engArr(raw.classes)[0] || {}).name));
  const saveProf = new Set(engArr(first && first.savingThrows));
  // Skill proficiencies the character has chosen: classes, background; Expertise from the classes.
  const skillRank = {};
  const raise = (name, rank) => { const k = engLc(name); skillRank[k] = Math.max(skillRank[k] || 0, rank); };
  for (const k of engArr(raw.classes)) for (const s of engArr(k.skills)) raise(s, 1);
  for (const s of engArr(raw.background && raw.background.skills)) raise(s, 1);
  for (const k of engArr(raw.classes)) for (const s of engArr(k.expertise)) raise(s, 2);
  const out = {};
  for (const a of ENG_ABILITIES) {
    const value = engTweaked(base[a], engTweak(raw, `abilityScores.${a}.score`));
    const mod = engMod(value);
    const st = engTweak(raw, `abilityScores.${a}.savingThrowModifier`);
    const sRank = Math.max(saveProf.has(a) ? 1 : 0, engProfRank(st.proficiency));
    const skills = ctx.skills.filter((s) => s.ability === a).map((s) => {
      const t = engTweak(raw, `abilityScores.${a}.skills.${s.name}`);
      const rank = Math.max(skillRank[engLc(s.name)] || 0, engProfRank(t.proficiency));
      return { name: s.name, modifier: engTweaked(mod + Math.floor(rank * pb), t), proficiency: engProfWord(rank) };
    });
    out[a] = { value, modifier: mod, savingThrow: { modifier: engTweaked(mod + Math.floor(sRank * pb), st), proficiency: engProfWord(sRank) }, skills };
  }
  return out;
}

/** Hit point maximum and hit dice: the first class's first level at its maximum, the rest as recorded per level. */
function engHitPoints(raw, ctx, scores, level) {
  const con = scores.Constitution.modifier;
  let max = 0;
  const dice = {};
  engArr(raw.classes).forEach((k, i) => {
    const rules = ctx.classes.get(engLc(k.name)) || {};
    const levels = engNum(k.levels);
    const fixed = raw.settings && raw.settings.isFixedHitPoints;
    const perLevel = engArr(k.hitPoints).slice(0, i === 0 ? levels - 1 : levels).map((x) => (fixed ? engNum(rules.hitPointsAtHigherLevelsNumber) : engNum(x)));
    if (i === 0 && levels > 0) max += engNum(rules.hitPointsAtFirstLevelNumber);
    max += perLevel.reduce((t, x) => t + x, 0);
    // A class SW5E doesn't know has no die: SW5E writes "dundefined".
    const size = rules.hitDiceDieType != null ? engNum(rules.hitDiceDieType) : 'undefined';
    if (size) dice[size] = (dice[size] || 0) + levels;
  });
  max += con * level;
  return {
    maximum: engTweaked(max, engTweak(raw, 'hitPoints.maximum')),
    hitDice: Object.keys(dice).sort((a, b) => (Number(a) || Infinity) - (Number(b) || Infinity)).map((s) => ({ size: `d${s}`, maximum: dice[s] })),
  };
}

function engExperience(raw, ctx, level) {
  const rows = ctx.advancement;
  const at = (lv) => { const r = rows.find((x) => engNum(x.level) === lv); return r ? engNum(r.experiencePoints) : null; };
  const current = engNum(raw.experiencePoints);
  const prev = at(Math.max(1, level));
  const next = at(level + 1);
  return { previousLevel: prev, current, nextLevel: next != null ? next : prev, isCorrect: prev == null || (current >= prev && (next == null || current < next)) };
}

/** The character's equipment with its catalog entries: [{ entry, item, index }] (items SW5E knows). */
function engGear(raw, ctx) {
  return engArr(raw.equipment).map((entry, index) => ({ entry, index, item: entry && ctx.items.get(engLc(entry.name)) }))
    .filter((g) => g.entry && g.item);
}

/** "13 + Dex modifier (max 2)" → 13 + Dexterity up to 2; "17" → 17; a shield's "+2" → 2. */
function engArmorValue(ac, dex) {
  const m = /^\s*\+?\s*(\d+)\s*(\+\s*Dex(?:terity)? modifier(?:\s*\(max (\d+)\))?)?/i.exec(String(ac || ''));
  if (!m) return 0;
  return engNum(m[1]) + (m[2] ? (m[3] != null ? Math.min(dex, engNum(m[3])) : dex) : 0);
}

/** AC and the armor worn: the best body armor (or 10 + Dex) plus the best shield; SW5E doesn't add enhanced items. */
function engArmor(raw, ctx, dex) {
  const worn = engGear(raw, ctx).filter((g) => g.entry.equipped && g.entry.category !== 'EnhancedItem' && g.item.equipmentCategory === 'Armor');
  const body = worn.filter((g) => g.item.armorClassification !== 'Shield');
  const shields = worn.filter((g) => g.item.armorClassification === 'Shield');
  const base = body.length ? Math.max(...body.map((g) => engArmorValue(g.item.ac, dex))) : 10 + dex;
  const shield = shields.length ? Math.max(...shields.map((g) => engArmorValue(g.item.ac, dex))) : 0;
  return { armorClass: engTweaked(base + shield, engTweak(raw, 'armorClass')), armorList: worn.map((g) => g.item.name), worn };
}

/** Speed: 30 ft for everyone (SW5E doesn't read the species); heavy armor without its Strength, or a heavy load, slows. */
function engSpeed(raw, ctx, scores, worn) {
  const str = scores.Strength.value;
  const tooHeavy = worn.some((g) => engArr(g.item.properties).some((p) => { const m = /^strength (\d+)/i.exec(p); return m && str < engNum(m[1]); }));
  const load = engGear(raw, ctx).reduce((t, g) => t + engNum(g.item.weight) * engNum(g.entry.quantity == null ? 1 : g.entry.quantity), 0);
  const slow = Math.max(tooHeavy ? 10 : 0, load > str * 10 ? 20 : 0);
  const base = engTweaked(30 - slow, engTweak(raw, 'speed.base'));
  const miles = (n) => `${Math.round(n * 100) / 100} miles`;
  return { base: `${base} ft`, hour: miles(base / 10), day: miles((base / 10) * 8), special: '' };
}

function engCarrying(scores) {
  const s = scores.Strength.value;
  return { encumbered: s * 5, heavilyEncumbered: s * 10, maxCapacity: s * 15, pushDragLift: s * 30 };
}

function engAttunement(raw, ctx, pb) {
  const all = engArr(raw.equipment);
  return {
    current: all.filter((e) => e && e.attuned).length,
    maximum: pb,
    hasAttunable: all.some((e) => { const it = e && ctx.items.get(engLc(e.name)); return !!(it && it.requiresAttunement); }),
  };
}

/** Proficiencies as SW5E lists them: the first class's weapons and armor, the other classes' multiclass ones, the background's tools. */
function engProficiencies(raw, ctx) {
  const classes = engArr(raw.classes).map((k) => ctx.classes.get(engLc(k.name))).filter(Boolean);
  const out = [];
  const first = classes[0];
  if (first) {
    for (const p of engArr(first.weaponProficiencies)) out.push({ name: p, type: 'weapon' });
    for (const p of engArr(first.armorProficiencies)) out.push({ name: p, type: 'armor' });
  }
  // The other classes' multiclass proficiencies, leaving out what's already listed (in any case).
  for (const k of classes.slice(1)) {
    for (const p of engArr(k.multiClassProficiencies)) if (!out.some((x) => engLc(x.name) === engLc(p))) out.push({ name: p, type: 'other' });
  }
  const bg = ctx.backgrounds.get(engLc(raw.background && raw.background.name));
  if (bg && bg.toolProficiencies) out.push({ name: bg.toolProficiencies, type: 'tool' });
  return out;
}

/** Proficient skills in ability order, the class's saving throws, then saving throws made proficient by a tweak (repeats kept). */
function engSkillAndSaveList(raw, ctx, abilityScores) {
  const skills = ENG_ABILITIES.flatMap((a) => abilityScores[a].skills.filter((s) => s.proficiency !== 'none').map((s) => s.name));
  const first = ctx.classes.get(engLc((engArr(raw.classes)[0] || {}).name));
  const classSaves = ENG_ABILITIES.filter((a) => engArr(first && first.savingThrows).includes(a));
  const tweaked = ENG_ABILITIES.filter((a) => engProfRank(engTweak(raw, `abilityScores.${a}.savingThrowModifier`).proficiency) > 0);
  return skills.concat(classSaves.concat(tweaked).map((a) => `${a} Saving Throws`));
}

/** Does a proficiency ("All blasters", "simple vibroweapons", "techblades") cover this weapon? */
function engWeaponCovered(prof, item) {
  const p = engLc(prof);
  const cls = String(item.weaponClassification || '');
  const m = /^(all|simple|martial|exotic) (blasters|vibroweapons|lightweapons)$/.exec(p);
  if (m) {
    const type = { blasters: 'Blaster', vibroweapons: 'Vibroweapon', lightweapons: 'Lightweapon' }[m[2]];
    // "All" means simple and martial: exotic weapons need their own proficiency.
    return cls.endsWith(type) && (m[1] === 'all' ? !cls.startsWith('Exotic') : cls.toLowerCase().startsWith(m[1]));
  }
  const n = engLc(item.name);
  return p === n || p === `${n}s`;
}

/** "Core" or "ExpandedContent": the stored item list leaves it out; it follows the item's source. */
const engContentType = (it) => it.contentType || (it.contentSource === 'EC' ? 'ExpandedContent' : 'Core');

/**
 * Every weapon in the equipment with SW5E's attack and damage bonuses, and the unarmed strike. SW5E lists the
 * equipped ones (weapons) but gives the others their numbers too (in equipment).
 */
function engWeapons(raw, ctx, scores, pb, profs) {
  const mod = (a) => scores[a].modifier;
  const weaponProfs = profs.filter((p) => p.type === 'weapon' || p.type === 'other').map((p) => p.name);
  const all = engTweak(raw, 'weapon');
  const out = [];
  for (const g of engGear(raw, ctx)) {
    if (g.entry.category === 'EnhancedItem' || g.item.equipmentCategory !== 'Weapon') continue;
    const it = g.item;
    const props = engArr(it.properties).map(engLc);
    // A ranged weapon (a "(range …)" property that isn't thrown) uses Dexterity, finesse the better of the two;
    // SW5E gives exotic weapons Strength, even ranged ones.
    const ranged = !String(it.weaponClassification || '').startsWith('Exotic') && props.some((p) => /\(range /.test(p) && !p.startsWith('thrown'));
    const ability = ranged ? 'Dexterity'
      : props.some((p) => p.startsWith('finesse')) && mod('Dexterity') > mod('Strength') ? 'Dexterity' : 'Strength';
    const own = g.entry.tweaks || {};
    // Proficient by class, or by the weapon's own tweak (expertise: twice).
    const rank = Math.max(weaponProfs.some((p) => engWeaponCovered(p, it)) ? 1 : 0, engProfRank(own.toHit && own.toHit.proficiency));
    const toHit = engTweaked(engTweaked(mod(ability) + Math.floor(rank * pb), all.toHit || {}), own.toHit || {});
    const damage = engTweaked(engTweaked(mod(ability), all.damage || {}), own.damage || {});
    const die = own.damageDice && own.damageDice.dieSize ? engNum(own.damageDice.dieSize) : engNum(it.damageDieType);
    out.push({
      ...ENG_ITEM_DEFAULTS, ...it, contentType: engContentType(it), damageType: it.damageType || 'Unknown', damageDieType: die,
      quantity: g.entry.quantity == null ? 1 : g.entry.quantity, index: g.index, isFound: true, equipped: !!g.entry.equipped,
      attackBonus: toHit, damageBonus: damage, ability, isCustom: false, tweaks: own,
    });
  }
  const un = engTweak(raw, 'unarmed');
  const unDie = un.damageDice && un.damageDice.dieSize ? engNum(un.damageDice.dieSize) : 0;
  out.push({
    name: 'Unarmed Strike', description: null, cost: 0, weight: '0', equipmentCategory: 'Weapon', contentType: 'Core', contentSource: 'PHB',
    damageNumberOfDice: 1, damageType: 'Kinetic', weaponClassification: 'Unarmed',
    damageDieType: unDie, properties: [], propertiesMap: {}, modes: [],
    quantity: 0, index: -1, isFound: true, equipped: true,
    // 1 + Strength; with a damage die set, the die and Strength. Never below 0.
    attackBonus: engTweaked(mod('Strength') + pb, un.toHit || {}),
    damageBonus: engTweaked(Math.max(0, (unDie ? 0 : 1) + mod('Strength')), un.damage || {}),
    ability: 'Strength', isCustom: false, tweaks: un,
  });
  return out;
}

const engOrdinal = (s) => engNum(String(s || '').replace(/\D/g, ''));
/** An archetype's table row at a class level, as { column: value }. */
function engArchetypeRow(arch, lv) {
  const row = arch && arch.leveledTable ? arch.leveledTable[String(Math.max(1, Math.min(20, lv)))] : null;
  return Object.fromEntries(engArr(row).map((c) => [c.key, c.value]));
}
/**
 * Force or tech casting. The casters are the classes that cast (their table at their level) and the archetypes that
 * do (casterRatio above 0: their own table). Points: the tables' points added up, plus the ability modifier (at least 1);
 * SW5E reads an archetype's points only for third-casters (ratio 1/3). Power level: the one caster's table, or with
 * several, the full caster's table at the summed caster level (levels × ratio, rounded). Powers listed without a
 * caster (the Rakatan Order's, custom powers): the modifier alone, power level 0.
 */
function engCasting(raw, ctx, scores, pb, kind) {
  const word = kind === 'force' ? 'Force' : 'Tech';
  const casters = [];
  for (const k of engArr(raw.classes)) {
    const rules = ctx.classes.get(engLc(k.name));
    const lv = engNum(k.levels);
    if (rules && rules.casterType === word && engNum(rules.casterRatio) > 0) {
      const row = (rules.levelChanges || {})[String(Math.max(1, Math.min(20, lv)))] || {};
      casters.push({ lv, ratio: engNum(rules.casterRatio), points: engNum(row[`${word} Points`]), level: row['Max Power Level'] });
    }
    const arch = k.archetype && ctx.archetypes.get(engLc(k.archetype.name));
    if (arch && arch.casterType === word && engNum(arch.casterRatio) > 0) {
      const row = engArchetypeRow(arch, lv);
      const third = Math.abs(engNum(arch.casterRatio) - 1 / 3) < 0.01;
      casters.push({ lv, ratio: engNum(arch.casterRatio), points: third ? engNum(row[`${word} Points`]) : 0, level: row['Max Power Level'] });
    }
  }
  // Each class's powers, then its archetype's (repeats kept), then the custom ones.
  const custom = engArr(raw[kind === 'force' ? 'customForcePowers' : 'customTechPowers']);
  const powerNames = engArr(raw.classes).flatMap((k) => engArr(k[`${kind}Powers`]).concat(engArr(k.archetype && k.archetype[`${kind}Powers`]))).concat(custom);
  if (!casters.length && !powerNames.length) return false;
  const table = casters.reduce((t, x) => t + x.points, 0);
  let maxPowerLevel;
  if (!casters.length) maxPowerLevel = 0;
  else if (casters.length === 1) maxPowerLevel = /\d/.test(String(casters[0].level || '')) ? engOrdinal(casters[0].level) : null;
  else {
    const full = engArr(ctx.mods.classes).find((c) => c.casterType === word && engNum(c.casterRatio) === 1);
    const lv = Math.round(casters.reduce((t, x) => t + x.lv * x.ratio, 0));
    maxPowerLevel = full ? engOrdinal(((full.levelChanges || {})[String(Math.max(1, Math.min(20, lv)))] || {})['Max Power Level']) : 0;
  }
  const mod = (a) => scores[a].modifier;
  const used = engNum((raw.currentStats || {})[`${kind}PointsUsed`]);
  const powersKnown = powerNames.map((n) => (engArr(ctx.mods.powers).find((p) => p.name === n && p.powerType === word))).filter(Boolean)
    .map((p) => ({ prerequisite: null, higherLevelDescription: null, contentType: engContentType(p), ...p }));
  const t = (f) => engTweak(raw, `${kind}Casting.${f}`);
  // With a caster: at least 1 point (a level 1 Scout, whose table has none yet). A power level SW5E can't read stays null.
  const points = (n) => engTweaked(casters.length ? Math.max(1, n) : n, t('maxPoints'));
  const level = engHasOverride(t('maxPowerLevel')) || engNum(t('maxPowerLevel').bonus) || maxPowerLevel != null
    ? engTweaked(engNum(maxPowerLevel), t('maxPowerLevel')) : null;
  if (kind === 'tech') {
    const m = mod('Intelligence');
    return {
      pointsUsed: used, maxPoints: points(table + m), attackModifier: engTweaked(pb + m, t('attackModifier')),
      saveDC: engTweaked(8 + pb + m, t('saveDC')), maxPowerLevel: level, powersKnown,
    };
  }
  const light = mod('Wisdom'), dark = mod('Charisma'), uni = Math.max(light, dark);
  return {
    pointsUsed: used, maxPoints: points(table + uni),
    lightAttackModifier: engTweaked(pb + light, t('lightAttackModifier')), lightSaveDC: engTweaked(8 + pb + light, t('lightSaveDC')),
    darkAttackModifier: engTweaked(pb + dark, t('darkAttackModifier')), darkSaveDC: engTweaked(8 + pb + dark, t('darkSaveDC')),
    universalAttackModifier: engTweaked(pb + uni, t('universalAttackModifier')), universalSaveDC: engTweaked(8 + pb + uni, t('universalSaveDC')),
    maxPowerLevel: level, powersKnown,
  };
}

// The stored item list leaves out empty values; SW5E's items have them all.
const ENG_ITEM_DEFAULTS = {
  description: null, damageNumberOfDice: 0, damageType: 'Unknown', damageDieModifier: 0, weaponClassification: 'Unknown',
  armorClassification: 'Unknown', damageDieType: 0, properties: null, modes: [], ac: null, strengthRequirement: null,
  stealthDisadvantage: false, contentType: 'Core',
};
const ENG_ENHANCED_DEFAULTS = {
  requiresAttunement: false, valueText: null, prerequisite: null, cyberneticAugmentationType: 'None', droidCustomizationType: 'None',
  adventuringGearType: 'None', enhancedArmorType: 'None', consumableType: 'None', focusType: 'None', enhancedShieldType: 'None',
  enhancedWeaponType: 'None', itemModificationType: 'None', valuableType: 'None', contentType: 'Core',
};

/** The equipment as SW5E lists it: each entry with its item's data; weapons in hand with their attack numbers. */
function engEquipment(raw, ctx, weapons) {
  const byIndex = new Map(weapons.filter((w) => w.index >= 0).map((w) => [w.index, w]));
  return engArr(raw.equipment).map((entry, index) => {
    if (!entry) return null;
    const item = ctx.items.get(engLc(entry.name));
    if (!item) return { name: entry.name, quantity: engNum(entry.quantity), index, isFound: false };
    const enhanced = entry.category === 'EnhancedItem' || item.type != null;
    const out = { ...(enhanced ? ENG_ENHANCED_DEFAULTS : ENG_ITEM_DEFAULTS), ...item, contentType: engContentType(item) };
    const w = byIndex.get(index);
    if (w) Object.assign(out, { damageDieType: w.damageDieType, attackBonus: w.attackBonus, damageBonus: w.damageBonus, ability: w.ability, isCustom: false });
    if ('equipped' in entry) out.equipped = entry.equipped;
    if ('attuned' in entry) out.attuned = entry.attuned;
    if (entry.tweaks) out.tweaks = entry.tweaks;
    return Object.assign(out, { quantity: entry.quantity == null ? 1 : entry.quantity, index, isFound: true });
  }).filter(Boolean);
}

/**
 * Features as SW5E lists them (all under combatFeatures): every class's and archetype's features up to its level
 * (a feature written at several levels keeps the latest one reached), in the rules list's own order (SW5E's: Core
 * before Expanded Content, archetypes before classes, by name) sorted by level only; then the species' traits; then
 * the feats (taken at Ability Score Improvements, the background's, then those added by hand).
 */
function engFeatures(raw, ctx) {
  const all = engArr(ctx.mods.features);
  const picked = new Map();
  for (const k of engArr(raw.classes)) {
    const lv = engNum(k.levels);
    const arch = k.archetype && k.archetype.name;
    all.forEach((f, index) => {
      const mine = (f.source === 'Class' && f.sourceName === k.name) || (f.source === 'Archetype' && arch && f.sourceName === arch);
      if (!mine || engNum(f.level) > lv) return;
      const key = `${f.source}|${f.sourceName}|${f.name}`;
      const had = picked.get(key);
      if (!had || engNum(f.level) > engNum(had.f.level)) picked.set(key, { f, index });
    });
  }
  const classFeatures = [...picked.values()].sort((a, b) => engNum(a.f.level) - engNum(b.f.level) || a.index - b.index).map((x) => x.f);
  const species = raw.species && raw.species.name;
  const speciesFeatures = all.filter((f) => f.source === 'Species' && f.sourceName === species);
  const featNames = engArr(raw.classes).flatMap((k) => engArr(k.abilityScoreImprovements).filter((a) => a && a.type === 'Feat').map((a) => a.name))
    .concat(raw.background && raw.background.feat && raw.background.feat.name ? [raw.background.feat.name] : []);
  const feats = featNames.map((n) => ctx.feats.get(engLc(n))).filter(Boolean).map((f) => ({ ...f, customIndex: -1, combat: true }))
    // Feats added by hand (raw.customFeats, by name) come last, numbered.
    .concat(engArr(raw.customFeats).map((n, i) => [ctx.feats.get(engLc(typeof n === 'string' ? n : n && n.name)), i])
      .filter(([f]) => f).map(([f, i]) => ({ ...f, customIndex: i, combat: true })));
  return classFeatures.concat(speciesFeatures).map((f) => ({ metadata: null, ...f, combat: true })).concat(feats);
}

function engBackgroundFeature(raw, ctx) {
  const bg = ctx.backgrounds.get(engLc(raw.background && raw.background.name));
  return bg ? { name: bg.featureName, combat: false, text: bg.featureText } : null;
}

/** Hit points now (the play state SW5E keeps in currentStats) and what a rest works from. */
function engHitPointsNow(raw, hp, scores) {
  const s = raw.currentStats || {};
  const used = s.hitDiceUsed || {};
  const hitDice = hp.hitDice.map((d) => ({ size: d.size, current: d.maximum - engNum(used[d.size]), maximum: d.maximum }));
  // What a long rest gives back: half the character's hit dice (at least one), the largest spent ones first.
  let back = Math.max(1, Math.floor(hp.hitDice.reduce((t, d) => t + d.maximum, 0) / 2));
  const hitDiceRestored = [];
  for (const d of hp.hitDice.slice().sort((a, b) => engNum(b.size.slice(1)) - engNum(a.size.slice(1)))) {
    const n = Math.min(back, engNum(used[d.size]));
    if (n > 0) { hitDiceRestored.push({ size: d.size, numRestored: n }); back -= n; }
  }
  const high = { level6: false, level7: false, level8: false, level9: false, ...(s.highLevelCasting || {}) };
  return {
    current: hp.maximum - engNum(s.hitPointsLost), temporary: engNum(s.temporaryHitPoints), maximum: hp.maximum, hitDice,
    deathSaves: { successes: 0, failures: 0, ...(s.deathSaves || {}) },
    resting: {
      hitDieBonus: scores.Constitution.modifier, numHitDiceUsed: Object.values(used).reduce((t, n) => t + engNum(n), 0), hitDiceRestored,
      techPointsUsed: engNum(s.techPointsUsed), forcePointsUsed: engNum(s.forcePointsUsed), highLevelCasting: high,
      shortRestFeatures: [], longRestFeatures: [],
    },
  };
}

function engExperienceMessage(xp) {
  if (xp.isCorrect) return '';
  return xp.current < engNum(xp.previousLevel) ? 'Experience too low. Increase experience or remove class levels below'
    : 'You have unused levels. Click below to add more class levels.';
}

/**
 * Superiority as SW5E computes it, fitted to its results (it reads like a bug there; the sheet works superiority out
 * itself from the class tables): only from an archetype's own table, read by column position. A Fighter or Scholar
 * with any archetype table gets it (the Adept Specialist's force points become its dice), a Scout only with a
 * superiority column (Deadeye); other classes never do, plain Fighters neither. Dice: the second column. "Size":
 * the first column where the table has a dice-size column, else "0". Modifiers: the best ability of each kind (no
 * proficiency); DCs: 8 + proficiency + it.
 */
function engSuperiority(raw, ctx, scores, pb) {
  let dice = null, size = '0';
  for (const k of engArr(raw.classes)) {
    const arch = k.archetype && ctx.archetypes.get(engLc(k.archetype.name));
    const row = arch && arch.leveledTable && arch.leveledTable[String(Math.max(1, Math.min(20, engNum(k.levels))))];
    if (!row) continue;
    const supColumns = row.some((c) => /Superiority/.test(c.key));
    if (!(['Fighter', 'Scholar'].includes(k.name) || (k.name === 'Scout' && supColumns))) continue;
    dice = (dice || 0) + engNum((row[1] || {}).value);
    if (row.some((c) => c.key === 'Superiority Dice Size')) size = String((row[0] || {}).value || '0');
  }
  if (dice == null) return false;
  const mod = (a) => scores[a].modifier;
  const physical = Math.max(mod('Strength'), mod('Dexterity'));
  const mental = Math.max(mod('Intelligence'), mod('Wisdom'), mod('Charisma'));
  const general = Math.max(physical, mental);
  const t = (f) => engTweak(raw, `superiority.${f}`);
  const maneuvers = engArr(raw.classes).flatMap((k) => engArr(k.maneuvers).concat(engArr(k.archetype && k.archetype.maneuvers)))
    .map((n) => engArr(ctx.mods.maneuvers).find((m) => m.name === n)).filter(Boolean).map((m) => ({ metadata: null, prerequisite: null, ...m }));
  return {
    currentDice: engNum((raw.currentStats || {}).superiorityDiceUsed), maxDice: engTweaked(dice, t('maxDice')),
    diceSize: size,
    physicalModifier: engTweaked(physical, t('physicalModifier')), physicalSaveDC: engTweaked(8 + pb + physical, t('physicalSaveDC')),
    mentalModifier: engTweaked(mental, t('mentalModifier')), mentalSaveDC: engTweaked(8 + pb + mental, t('mentalSaveDC')),
    generalModifier: engTweaked(general, t('generalModifier')), generalSaveDC: engTweaked(8 + pb + general, t('generalSaveDC')),
    maneuvers,
  };
}

/** The computed sheet for `raw` (SW5E's character data), in SW5E's shape. */
function engCompute(raw, ctx) {
  const { level, classText } = engLevels(raw);
  const pb = engTweaked(engProficiencyBonus(ctx, level), engTweak(raw, 'proficiencyBonus'));
  const abilityScores = engAbilities(raw, ctx, pb);
  const dex = abilityScores.Dexterity.modifier;
  const perception = (abilityScores.Wisdom.skills.find((s) => s.name === 'Perception') || {}).modifier;
  const armor = engArmor(raw, ctx, dex);
  const proficiencies = engProficiencies(raw, ctx);
  const stats = raw.currentStats || {};
  const allWeapons = engWeapons(raw, ctx, abilityScores, pb, proficiencies);
  const experiencePoints = engExperience(raw, ctx, level);
  experiencePoints.errorMessage = engExperienceMessage(experiencePoints);
  const forceCasting = engCasting(raw, ctx, abilityScores, pb, 'force');
  const ch = raw.characteristics || {};
  return {
    // What the character says about itself, as it is.
    name: raw.name, builderVersion: raw.builderVersion, image: raw.image, characteristics: ch, tweaks: raw.tweaks || {},
    customProficiencies: engArr(raw.customProficiencies), customLanguages: engArr(raw.customLanguages),
    customFeatures: engArr(raw.customFeatures), customTechPowers: engArr(raw.customTechPowers),
    customForcePowers: engArr(raw.customForcePowers), customEquipment: engArr(raw.customEquipment),
    numCustomFeats: engArr(raw.customFeats).length,
    currentLevel: level,
    classText,
    alignment: ch.alignment,
    species: raw.species && raw.species.name,
    background: raw.background && raw.background.name,
    experiencePoints,
    abilityScores,
    proficiencyBonus: pb,
    initiative: engTweaked(dex, engTweak(raw, 'initiative')),
    armorClass: armor.armorClass,
    armorList: armor.armorList,
    passivePerception: engTweaked(10 + engNum(perception), engTweak(raw, 'passivePerception')),
    inspiration: !!stats.hasInspiration,
    vision: 'normal',
    speed: engSpeed(raw, ctx, abilityScores, armor.worn),
    hitPoints: engHitPointsNow(raw, engHitPoints(raw, ctx, abilityScores, level), abilityScores),
    // The conditions in effect, with their rules text.
    // (Some texts in SW5E's data have "\r\n" written out; SW5E shows them as line breaks.)
    conditions: engArr(stats.conditions).map((n) => {
      const r = engArr(ctx.mods.conditions).find((c) => engLc(c.name) === engLc(n));
      return r ? { name: r.name, description: String(r.description || '').replace(/\\r\\n/g, '\n') } : { name: n };
    }),
    exhaustion: engNum(stats.exhaustion),
    proficiencies,
    skillAndSaveProficiencies: engSkillAndSaveList(raw, ctx, abilityScores),
    // Galactic Basic, the species language chosen (raw.species.language) and the background's; repeats kept.
    languages: ['Galactic Basic'].concat(raw.species && raw.species.language ? [raw.species.language] : [], engArr(raw.background && raw.background.languages)),
    equipment: engEquipment(raw, ctx, allWeapons),
    attunement: engAttunement(raw, ctx, pb),
    weapons: allWeapons.filter((w) => w.equipped),
    credits: engNum(raw.credits),
    carryingCapacity: engCarrying(abilityScores),
    superiority: engSuperiority(raw, ctx, abilityScores, pb),
    highLevelCasting: { level6: false, level7: false, level8: false, level9: false, ...(stats.highLevelCasting || {}) },
    techCasting: engCasting(raw, ctx, abilityScores, pb, 'tech'),
    forceCasting,
    // The custom force powers, then the classes' own lists (not their archetypes').
    allForcePowers: engArr(raw.customForcePowers).concat(engArr(raw.classes).flatMap((k) => engArr(k.forcePowers))),
    combatFeatures: engFeatures(raw, ctx),
    nonCombatFeatures: [],
    backgroundFeature: engBackgroundFeature(raw, ctx),
    settings: raw.settings,
    notes: raw.notes,
  };
}

/**
 * The rules entries the sheet looks up for a character (what the bridge gathers on sw5e.com): its classes and
 * archetypes, species, background, feats, maneuvers, other picks kept in the class entries, and the conditions.
 */
function engRefs(raw, ctx) {
  const mods = ctx.mods;
  const namesOf = (v) => (!v ? [] : typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(namesOf)
    : typeof v === 'object' && typeof v.name === 'string' ? [v.name] : []);
  const find = (mod, name) => {
    const n = String(name || '').trim();
    if (!n) return null;
    const list = engArr(mods[mod]);
    return list.find((x) => x.name === n) || list.find((x) => engLc(x.name) === engLc(n)) || null;
  };
  const lookupAll = (mod, names, pick) => {
    const out = {};
    for (const n of new Set(engArr(names).filter(Boolean))) { const it = find(mod, n); if (it) out[n] = pick ? pick(it) : { ...it }; }
    return out;
  };
  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  const classes = engArr(raw.classes);
  const featNames = [];
  if (raw.background && raw.background.feat && raw.background.feat.name) featNames.push(raw.background.feat.name);
  for (const c of classes) for (const asi of engArr(c.abilityScoreImprovements)) if (asi && asi.type === 'Feat' && asi.name) featNames.push(asi.name);
  for (const f of engArr(raw.customFeats)) featNames.push(...namesOf(f));
  const KNOWN = new Set(['name', 'levels', 'hitPoints', 'abilityScoreImprovements', 'archetype', 'maneuvers', 'forcePowers', 'techPowers']);
  const choices = {};
  const scan = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      if (KNOWN.has(k)) continue;
      const names = namesOf(obj[k]);
      if (!names.length || !engArr(mods[k]).length) continue;
      choices[k] = Object.assign(choices[k] || {}, lookupAll(k, names));
    }
  };
  for (const c of classes) { scan(c); scan(c.archetype); }
  return {
    classes: lookupAll('classes', classes.map((c) => c.name), (c) => pick(c, ['name', 'summary', 'primaryAbility', 'hitDiceDieType',
      'hitPointsAtFirstLevel', 'hitPointsAtHigherLevels', 'armorProficiencies', 'weaponProficiencies', 'toolProficiencies', 'savingThrows',
      'skillChoices', 'levelChanges', 'casterType', 'casterRatio', 'multiClassProficiencies', 'archetypeFlavorName'])),
    archetypes: lookupAll('archetypes', classes.map((c) => c.archetype && c.archetype.name), (a) => pick(a, ['name', 'className', 'casterType', 'casterRatio', 'leveledTable'])),
    species: lookupAll('species', [raw.species && raw.species.name], (s) => pick(s, ['name', 'size', 'homeworld', 'language', 'distinctions',
      'skinColorOptions', 'hairColorOptions', 'eyeColorOptions', 'heightAverage', 'heightRollMod', 'weightAverage', 'weightRollMod', 'traits', 'imageUrls'])),
    backgrounds: lookupAll('backgrounds', [raw.background && raw.background.name], (b) => pick(b, ['name', 'flavorText', 'skillProficiencies',
      'toolProficiencies', 'languages', 'equipment', 'featureName', 'featureText', 'flavorName', 'flavorDescription'])),
    feats: lookupAll('feats', featNames),
    maneuvers: lookupAll('maneuvers', classes.flatMap((c) => namesOf(c.maneuvers).concat(namesOf(c.archetype && c.archetype.maneuvers)))),
    choices,
    conditions: engArr(mods.conditions).map((c) => ({ name: c.name, description: c.description })),
  };
}

/**
 * SW5E's check of a character before it computes it: { code, message, isValid }, in SW5E's order. Hit points: one
 * entry per level after the first in the first class, one per level in the others. An unknown species or class passes.
 */
function engValidation(raw) {
  const fail = (code, message) => ({ code, message, isValid: false });
  if (!String(raw.name || '').trim()) return fail(2, 'Missing a name');
  if (!(raw.species && String(raw.species.name || '').trim())) return fail(3, 'Missing a species');
  const classes = engArr(raw.classes);
  if (!classes.length) return fail(4, 'Missing class levels');
  if (classes.some((k, i) => engArr(k.hitPoints).length !== engNum(k.levels) - (i === 0 ? 1 : 0))) return fail(5, 'Missing hit points for a class');
  if (ENG_ABILITIES.some((a) => !(engNum((raw.baseAbilityScores || {})[a]) > 0))) return fail(6, 'Missing an ability score');
  if (!(raw.background && String(raw.background.name || '').trim())) return fail(7, 'Missing a background');
  return { code: 0, message: 'All checks passed', isValid: true };
}

/** What the extension's sw5e.com bridge returns for each character (computeWithSw5e), computed here. */
function engComputeCharacter(raw, ctx) {
  const validation = engValidation(raw);
  if (!validation.isValid) return { raw, complete: null, validation, refs: engRefs(raw, ctx), error: `The sheet's rules engine could not build this character (${validation.message})` };
  return { raw, complete: engCompute(raw, ctx), validation, refs: engRefs(raw, ctx), error: null };
}

// ------------------------------------------------------------- checking against SW5E's own calculation
// The numbers and lists the sheet shows, as path → value (arrays of named things by name): what the sheet compares
// when a character comes from sw5e.com with SW5E's calculation (the same fields as dev/engine-check.js).
const ENG_CHECK_FIELDS = ['currentLevel', 'classText', 'proficiencyBonus', 'initiative', 'armorClass', 'armorList', 'passivePerception', 'vision',
  'speed', 'hitPoints', 'abilityScores', 'weapons', 'attunement', 'carryingCapacity', 'superiority', 'techCasting', 'forceCasting',
  'proficiencies', 'skillAndSaveProficiencies', 'languages', 'experiencePoints', 'conditions', 'exhaustion'];
const ENG_CHECK_SKIP = new Set(['description', 'text', 'content', 'propertiesMap', 'powersKnown', 'allForcePowers', 'cost', 'weight', 'current',
  'temporary', 'deathSaves', 'resting', 'errorMessage', 'eTag', 'timestamp', 'partitionKey', 'rowKey', 'contentSource', 'contentType', 'isFound',
  'modes', 'ac', 'armorClassification', 'stealthDisadvantage', 'strengthRequirement', 'equipmentCategory']);
function engNumbers(complete) {
  const out = {};
  const scalar = (v) => v == null || ['string', 'number', 'boolean'].includes(typeof v);
  const walk = (o, p) => {
    if (scalar(o)) { out[p] = JSON.stringify(o === undefined ? null : o); return; }
    if (Array.isArray(o)) {
      if (o.every(scalar)) { out[p] = JSON.stringify(o); return; }
      const seen = {};
      o.forEach((v, i) => {
        const nm = v && typeof v === 'object' && typeof v.name === 'string' ? v.name : null;
        const k = nm == null ? String(i) : seen[nm] ? `${nm}#${++seen[nm]}` : ((seen[nm] = 1), nm);
        walk(v, `${p}[${k}]`);
      });
      return;
    }
    const named = /\]$/.test(p) && typeof o.name === 'string';
    for (const k of Object.keys(o).sort()) if (!ENG_CHECK_SKIP.has(k) && !/Enum$|Json$/.test(k) && !(named && k === 'name')) walk(o[k], `${p}.${k}`);
  };
  for (const f of ENG_CHECK_FIELDS) if (complete && complete[f] !== undefined) walk(complete[f], f);
  return out;
}
/** SW5E's calculation against the engine's: { compared, differences: [{ path, sw5e, engine }] }. */
function engCheckAgainst(sw5eComplete, ownComplete) {
  const want = engNumbers(sw5eComplete);
  const got = engNumbers(ownComplete);
  const differences = Object.keys(want).filter((p) => want[p] !== got[p]).map((p) => ({ path: p, sw5e: want[p], engine: p in got ? got[p] : '(none)' }));
  return { compared: Object.keys(want).length, differences };
}

if (typeof module !== 'undefined') {
  module.exports = {
    engContext, engCompute, engComputeCharacter, engRefs, engValidation, engNumbers, engCheckAgainst, engTweak, engBaseScores, engArmorValue, ENG_ABILITIES,
  };
}
