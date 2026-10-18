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
/** A value with its tweak applied: an override replaces it, a bonus adds to it. */
const engTweaked = (value, t) => (engHasOverride(t) ? engNum(t.override) : value + engNum(t.bonus));

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
    const size = engNum(rules.hitDiceDieType);
    if (size) dice[size] = (dice[size] || 0) + levels;
  });
  max += con * level;
  return {
    maximum: engTweaked(max, engTweak(raw, 'hitPoints.maximum')),
    hitDice: Object.keys(dice).map(Number).sort((a, b) => a - b).map((s) => ({ size: `d${s}`, maximum: dice[s] })),
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
  for (const k of classes.slice(1)) for (const p of engArr(k.multiClassProficiencies)) out.push({ name: p, type: 'other' });
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

/** Weapons in hand (equipped) and the unarmed strike, with SW5E's attack and damage bonuses. */
function engWeapons(raw, ctx, scores, pb, profs) {
  const mod = (a) => scores[a].modifier;
  const weaponProfs = profs.filter((p) => p.type === 'weapon' || p.type === 'other').map((p) => p.name);
  const all = engTweak(raw, 'weapon');
  const out = [];
  for (const g of engGear(raw, ctx)) {
    if (!g.entry.equipped || g.entry.category === 'EnhancedItem' || g.item.equipmentCategory !== 'Weapon') continue;
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
      ...it, damageType: it.damageType || 'Unknown', damageDieType: die, quantity: engNum(g.entry.quantity == null ? 1 : g.entry.quantity), index: g.index, isFound: true, equipped: true,
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
/** Force or tech casting: points from each class's table at its own level, the power level from one table or the multiclass sum. */
function engCasting(raw, ctx, scores, pb, kind) {
  const word = kind === 'force' ? 'Force' : 'Tech';
  const casters = engArr(raw.classes).map((k) => ({ k, rules: ctx.classes.get(engLc(k.name)) }))
    .filter((x) => x.rules && x.rules.casterType === word && engNum(x.rules.casterRatio) > 0);
  // A class whose entry lists powers of this kind casts too (an archetype caster such as the Rakatan Order), with
  // no table points of its own: SW5E then gives the ability modifier alone and power level 0.
  const powerNames = engArr(raw.classes).flatMap((k) => engArr(k[`${kind}Powers`]).concat(engArr(k.archetype && k.archetype[`${kind}Powers`])));
  const listsPowers = powerNames.length > 0;
  if (!casters.length && !listsPowers) return false;
  const row = (rules, lv) => (rules.levelChanges || {})[String(Math.max(1, Math.min(20, lv)))] || {};
  const table = casters.reduce((t, x) => t + engNum(row(x.rules, engNum(x.k.levels))[`${word} Points`]), 0);
  let maxPowerLevel;
  if (!casters.length) maxPowerLevel = 0;
  else if (casters.length === 1) {
    const v = row(casters[0].rules, engNum(casters[0].k.levels))['Max Power Level'];
    maxPowerLevel = /\d/.test(String(v || '')) ? engOrdinal(v) : null;
  } else {
    const full = engArr(ctx.mods.classes).find((c) => c.casterType === word && engNum(c.casterRatio) === 1);
    const lv = Math.floor(casters.reduce((t, x) => t + engNum(x.k.levels) * engNum(x.rules.casterRatio), 0) + 1e-9);
    maxPowerLevel = full ? engOrdinal(row(full, lv)['Max Power Level']) : 0;
  }
  const mod = (a) => scores[a].modifier;
  const used = engNum((raw.currentStats || {})[`${kind}PointsUsed`]);
  const powersKnown = powerNames.map((n) => (engArr(ctx.mods.powers).find((p) => p.name === n && p.powerType === word))).filter(Boolean);
  const t = (f) => engTweak(raw, `${kind}Casting.${f}`);
  // At least 1 point (a level 1 Scout, whose table has none yet); a power level SW5E can't read stays null.
  const points = (n) => engTweaked(Math.max(1, n), t('maxPoints'));
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

/** The computed sheet for `raw` (SW5E's character data), in SW5E's shape: only what the engine computes so far. */
function engCompute(raw, ctx) {
  const { level, classText } = engLevels(raw);
  const pb = engTweaked(engProficiencyBonus(ctx, level), engTweak(raw, 'proficiencyBonus'));
  const abilityScores = engAbilities(raw, ctx, pb);
  const dex = abilityScores.Dexterity.modifier;
  const perception = (abilityScores.Wisdom.skills.find((s) => s.name === 'Perception') || {}).modifier;
  const armor = engArmor(raw, ctx, dex);
  const proficiencies = engProficiencies(raw, ctx);
  const stats = raw.currentStats || {};
  return {
    name: raw.name,
    currentLevel: level,
    classText,
    proficiencyBonus: pb,
    abilityScores,
    initiative: engTweaked(dex, engTweak(raw, 'initiative')),
    armorClass: armor.armorClass,
    armorList: armor.armorList,
    passivePerception: engTweaked(10 + engNum(perception), engTweak(raw, 'passivePerception')),
    vision: 'normal',
    speed: engSpeed(raw, ctx, abilityScores, armor.worn),
    hitPoints: engHitPoints(raw, ctx, abilityScores, level),
    conditions: engArr(stats.conditions),
    exhaustion: engNum(stats.exhaustion),
    proficiencies,
    skillAndSaveProficiencies: engSkillAndSaveList(raw, ctx, abilityScores),
    // Galactic Basic, the species language chosen (raw.species.language) and the background's; repeats kept.
    languages: ['Galactic Basic'].concat(raw.species && raw.species.language ? [raw.species.language] : [], engArr(raw.background && raw.background.languages)),
    attunement: engAttunement(raw, ctx, pb),
    weapons: engWeapons(raw, ctx, abilityScores, pb, proficiencies),
    carryingCapacity: engCarrying(abilityScores),
    superiority: false,
    techCasting: engCasting(raw, ctx, abilityScores, pb, 'tech'),
    forceCasting: engCasting(raw, ctx, abilityScores, pb, 'force'),
    experiencePoints: engExperience(raw, ctx, level),
  };
}

if (typeof module !== 'undefined') module.exports = { engContext, engCompute, engTweak, engBaseScores, engArmorValue, ENG_ABILITIES };
