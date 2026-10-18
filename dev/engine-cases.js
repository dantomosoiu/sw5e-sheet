/* Made-up characters that cover SW5E's rules, for checking the sheet's engine against SW5E's: every class at a
 * spread of levels, multiclass pairs, every species, every armor and weapon, every tweak, and edge cases.
 *
 *   node dev/engine-cases.js        writes dev/engine/inputs.json (the same characters every time)
 *
 * dev/engine-record.js (in the dev page) has sw5e.com compute them; dev/engine-check.js compares.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DEV = __dirname;
const rules = JSON.parse(fs.readFileSync(path.join(DEV, 'dumps', 'rules.json'), 'utf8')).modules;
const catalog = JSON.parse(fs.readFileSync(path.join(DEV, 'dumps', 'catalog.json'), 'utf8')).items;

const ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const PRIMARY = {
  Berserker: ['Strength', 'Constitution'], Consular: ['Wisdom', 'Charisma'], Engineer: ['Intelligence', 'Constitution'],
  Fighter: ['Strength', 'Constitution'], Guardian: ['Strength', 'Charisma'], Monk: ['Dexterity', 'Wisdom'],
  Operative: ['Dexterity', 'Intelligence'], Scholar: ['Intelligence', 'Wisdom'], Scout: ['Dexterity', 'Wisdom'],
  Sentinel: ['Dexterity', 'Charisma'],
};
const cls = (name) => rules.classes.find((c) => c.name === name);
const archetypeOf = (name, i = 0) => rules.archetypes.filter((a) => a.className === name)[i];
const powersOf = (type, n) => rules.powers.filter((p) => p.powerType === type).slice(0, n).map((p) => p.name);

/** Standard array, the class's two main abilities first. */
function scoresFor(className, extra = {}) {
  const order = PRIMARY[className] || ['Strength', 'Dexterity'];
  const rest = ABILITIES.filter((a) => !order.includes(a));
  const values = [15, 14, 13, 12, 10, 8];
  const out = {};
  order.concat(rest).forEach((a, i) => { out[a] = values[i]; });
  return { ...out, ...extra };
}

/** A class entry at `levels`: average hit points, its archetype from 3rd, Ability Score Improvements where the table has them. */
function classEntry(name, levels, { first = true, archetype = 0, asiTo = null, hp = null } = {}) {
  const c = cls(name);
  const perLevel = hp || Array.from({ length: first ? levels - 1 : levels }, () => c.hitPointsAtHigherLevelsNumber);
  const asiLevels = Object.entries(c.levelChanges).filter(([l, row]) => Number(l) <= levels && /Ability Score Improvement/i.test(row.Features || '')).length;
  const entry = {
    name, levels, hitPoints: perLevel,
    abilityScoreImprovements: Array.from({ length: asiLevels }, () => ({ type: 'Ability Score Improvement', abilitiesIncreased: [{ name: asiTo || PRIMARY[name][0], value: 2 }] })),
  };
  if (levels >= 3 && archetype != null && archetypeOf(name, archetype)) entry.archetype = { name: archetypeOf(name, archetype).name };
  if (first) entry.skills = c.skillChoicesList.slice(0, c.numSkillChoices);
  if (c.casterType === 'Force') entry.forcePowers = powersOf('Force', 4);
  if (c.casterType === 'Tech') entry.techPowers = powersOf('Tech', 4);
  return entry;
}

const STATS = {
  hitPointsLost: 0, temporaryHitPoints: 0, techPointsUsed: 0, forcePointsUsed: 0, superiorityDiceUsed: 0, hitDiceUsed: {},
  deathSaves: { successes: 0, failures: 0 }, hasInspiration: false, featuresTimesUsed: {}, conditions: [], exhaustion: 0,
  highLevelCasting: { level6: false, level7: false, level8: false, level9: false },
};
function character(label, { classes, species = { name: 'Human', abilityScoreImprovement: { Strength: 1, Dexterity: 1, Constitution: 2 } }, scores, background, equipment = [], tweaks = {}, settings = {}, xp = 0, extra = {} }) {
  return {
    label,
    raw: {
      name: label, builderVersion: '0.7.6', image: '', experiencePoints: xp,
      species: { abilityScoreImprovementSelectedOption: 0, abilityScoreImprovement: {}, ...species },
      classes, baseAbilityScores: scores || scoresFor((classes[0] || {}).name),
      background: background || { name: 'Soldier', feat: { name: 'Tough', type: 'Feat' }, feature: '', skills: ['Athletics', 'Intimidation'] },
      characteristics: { alignment: 'Balanced Neutral' }, credits: 0,
      equipment: equipment.map((e) => (typeof e === 'string' ? { name: e, quantity: 1, category: 'Equipment', equipped: true } : e)),
      currentStats: JSON.parse(JSON.stringify(STATS)), tweaks,
      customProficiencies: [], customLanguages: [], customFeatures: [], customFeats: [], customTechPowers: [], customForcePowers: [], customEquipment: [],
      settings: { isEnforcingForcePrerequisites: false, isFixedHitPoints: false, abilityScoreMethod: 'Manual', ...settings },
      notes: '', ...extra,
    },
  };
}

const out = [];
const add = (c) => out.push(c);

// 1. Every class at a spread of levels (single class), with its archetype and ASIs.
for (const c of rules.classes) {
  for (const lv of [1, 2, 3, 4, 5, 6, 9, 11, 13, 17, 20]) add(character(`${c.name} ${lv}`, { classes: [classEntry(c.name, lv)], xp: 0 }));
}

// 2. Multiclass pairs: casters with casters (multiclass casting), superiority classes, and others.
const PAIRS = [
  ['Consular', 3, 'Sentinel', 3], ['Sentinel', 5, 'Guardian', 4], ['Guardian', 6, 'Consular', 2], ['Engineer', 4, 'Scout', 4],
  ['Scout', 5, 'Engineer', 3], ['Consular', 5, 'Engineer', 5], ['Fighter', 5, 'Scholar', 3], ['Scholar', 4, 'Fighter', 2],
  ['Fighter', 3, 'Operative', 1], ['Operative', 5, 'Scout', 3], ['Berserker', 4, 'Fighter', 4], ['Monk', 4, 'Operative', 2],
  ['Guardian', 3, 'Fighter', 3], ['Sentinel', 2, 'Monk', 6], ['Engineer', 9, 'Fighter', 2], ['Consular', 9, 'Scholar', 3],
  ['Scout', 2, 'Sentinel', 7], ['Berserker', 1, 'Consular', 1],
];
for (const [a, la, b, lb] of PAIRS) add(character(`${a} ${la} / ${b} ${lb}`, { classes: [classEntry(a, la), classEntry(b, lb, { first: false })] }));
add(character('Fighter 2 / Operative 2 / Scholar 2', { classes: [classEntry('Fighter', 2), classEntry('Operative', 2, { first: false }), classEntry('Scholar', 2, { first: false })] }));

// 3. Every species (option 0; increases to choose go to the first abilities offered), as a Fighter 1.
for (const s of rules.species) {
  const opt = (s.abilitiesIncreased || [])[0] || [];
  const chosen = {};
  for (const inc of opt) {
    const list = inc.abilities || [];
    if (list.length > 1) chosen[list[0]] = inc.amount;
    else if (/^Any/.test(list[0] || '')) {
      const n = { 'Any one': 1, 'Any two': 2, 'Any three': 3, 'Any four': 4 }[list[0]] || 1;
      ABILITIES.filter((a) => !(a in chosen)).slice(0, n).forEach((a) => { chosen[a] = inc.amount; });
    }
  }
  add(character(`Species ${s.name}`, { classes: [classEntry('Fighter', 1)], species: { name: s.name, abilityScoreImprovement: chosen } }));
}

// 4. Armor: each body armor and shield, at Dexterity 8 and 18, worn by a Fighter (proficient with all armor).
const armors = catalog.filter((i) => i.equipmentCategory === 'Armor');
for (const a of armors) {
  for (const dex of [8, 18]) {
    const eq = [a.name].concat(a.armorClassification === 'Shield' ? ['Mesh armor'] : []);
    add(character(`Armor ${a.name}, Dex ${dex}`, { classes: [classEntry('Fighter', 3)], scores: scoresFor('Fighter', { Dexterity: dex }), equipment: eq }));
  }
}
// Not proficient with heavy armor and shields: a Consular in each kind.
for (const a of ['Mesh armor', 'Assault armor', 'Light physical shield', 'Combat suit']) {
  add(character(`Armor ${a} on a Consular`, { classes: [classEntry('Consular', 3)], equipment: [a] }));
}
add(character('Armor carried, not worn', { classes: [classEntry('Fighter', 3)], equipment: [{ name: 'Assault armor', quantity: 1, category: 'Equipment', equipped: false }] }));
add(character('Two armors and two shields worn', { classes: [classEntry('Fighter', 3)], equipment: ['Mesh armor', 'Assault armor', 'Light physical shield', 'Heavy physical shield'] }));

// 5. Weapons: all of them, eight to a character, on a Fighter (blasters and vibroweapons) and a Consular (simple, lightweapons).
const weapons = catalog.filter((i) => i.equipmentCategory === 'Weapon');
for (let i = 0; i < weapons.length; i += 8) {
  const group = weapons.slice(i, i + 8).map((w) => w.name);
  add(character(`Weapons ${i + 1}-${i + group.length} (Fighter)`, { classes: [classEntry('Fighter', 5)], scores: scoresFor('Fighter', { Dexterity: 16 }), equipment: group }));
  add(character(`Weapons ${i + 1}-${i + group.length} (Consular)`, { classes: [classEntry('Consular', 5)], scores: scoresFor('Consular', { Strength: 12, Dexterity: 14 }), equipment: group }));
}
add(character('Weapons carried, not equipped', { classes: [classEntry('Fighter', 2)], equipment: weapons.slice(0, 4).map((w) => ({ name: w.name, quantity: 1, category: 'Equipment', equipped: false })) }));
add(character('Weapon with its own tweaks', {
  classes: [classEntry('Fighter', 4)],
  equipment: [{ name: 'Blaster rifle', quantity: 1, category: 'Equipment', equipped: true, tweaks: { toHit: { bonus: 2 }, damage: { bonus: 3 } } },
    { name: 'Vibrosword', quantity: 1, category: 'Equipment', equipped: true, tweaks: { toHit: { override: 9 }, damageDice: { dieSize: 12 } } }],
}));

// 6. Tweaks: each path with a bonus, then with an override, on casters and a fighter.
const TWEAK_PATHS = ['armorClass', 'initiative', 'speed.base', 'passivePerception', 'hitPoints.maximum', 'proficiencyBonus',
  'techCasting.saveDC', 'techCasting.attackModifier', 'techCasting.maxPoints', 'techCasting.maxPowerLevel',
  'forceCasting.lightSaveDC', 'forceCasting.darkSaveDC', 'forceCasting.universalSaveDC', 'forceCasting.lightAttackModifier',
  'forceCasting.darkAttackModifier', 'forceCasting.universalAttackModifier', 'forceCasting.maxPoints', 'forceCasting.maxPowerLevel',
  'superiority.maxDice', 'superiority.generalModifier', 'superiority.generalSaveDC', 'superiority.physicalModifier',
  'superiority.physicalSaveDC', 'superiority.mentalModifier', 'superiority.mentalSaveDC', 'weapon.toHit', 'weapon.damage',
  'unarmed.toHit', 'unarmed.damage'];
const setPath = (o, p, v) => { const ks = p.split('.'); let x = o; ks.slice(0, -1).forEach((k) => { x = x[k] = x[k] || {}; }); x[ks[ks.length - 1]] = v; return o; };
const tweakClasses = (p) => (/^tech/.test(p) ? [classEntry('Engineer', 5)] : /^force/.test(p) ? [classEntry('Consular', 5)] : /^superiority/.test(p) ? [classEntry('Fighter', 5)] : [classEntry('Fighter', 5)]);
for (const p of TWEAK_PATHS) {
  add(character(`Tweak ${p} +2`, { classes: tweakClasses(p), equipment: ['Blaster pistol'], tweaks: setPath({}, p, { bonus: 2 }) }));
  add(character(`Tweak ${p} = 7`, { classes: tweakClasses(p), equipment: ['Blaster pistol'], tweaks: setPath({}, p, { override: 7 }) }));
}
for (const a of ABILITIES) {
  add(character(`Tweak ${a} score +2, save +1, = 19`, { classes: [classEntry('Fighter', 2)], tweaks: { abilityScores: { [a]: { score: { bonus: 2 }, savingThrowModifier: { bonus: 1 } } } } }));
  add(character(`Tweak ${a} score = 19, save = 4`, { classes: [classEntry('Fighter', 2)], tweaks: { abilityScores: { [a]: { score: { override: 19 }, savingThrowModifier: { override: 4 } } } } }));
  add(character(`Tweak ${a} save proficient`, { classes: [classEntry('Fighter', 2)], tweaks: { abilityScores: { [a]: { savingThrowModifier: { proficiency: 'Proficient' } } } } }));
}
for (const s of rules.skills) {
  add(character(`Tweak ${s.name}: expertise +1`, { classes: [classEntry('Scholar', 3)], tweaks: { abilityScores: { [s.baseAttribute]: { skills: { [s.name]: { proficiency: 'Expertise', bonus: 1 } } } } } }));
  add(character(`Tweak ${s.name}: = 9`, { classes: [classEntry('Scholar', 3)], tweaks: { abilityScores: { [s.baseAttribute]: { skills: { [s.name]: { override: 9 } } } } } }));
}
add(character('Tweak unarmed die d8', { classes: [classEntry('Monk', 3)], tweaks: { unarmed: { damageDice: { dieSize: 8 } } } }));

// 7. Edge cases.
add(character('Fixed hit points', { classes: [classEntry('Fighter', 6, { hp: [1, 2, 3, 4, 5] })], settings: { isFixedHitPoints: true } }));
add(character('Rolled hit points', { classes: [classEntry('Fighter', 6, { hp: [1, 2, 10, 4, 5] })] }));
add(character('Low Constitution', { classes: [classEntry('Scholar', 5)], scores: scoresFor('Scholar', { Constitution: 6 }) }));
add(character('High scores past 20', { classes: [classEntry('Berserker', 20)], scores: scoresFor('Berserker', { Strength: 20, Constitution: 20 }) }));
add(character('Strength 3 and 30', { classes: [classEntry('Fighter', 1)], scores: scoresFor('Fighter', { Strength: 3, Dexterity: 30 }) }));
for (const xp of [0, 299, 300, 2700, 6499, 355000, 400000]) add(character(`XP ${xp} at level 4`, { classes: [classEntry('Fighter', 4)], xp }));
add(character('Feat with an increase at an ASI', { classes: [{ ...classEntry('Fighter', 4), abilityScoreImprovements: [{ type: 'Feat', name: 'Athlete', abilityScoreImprovements: { Dexterity: 1 } }] }] }));
add(character('Background feat with an increase', { classes: [classEntry('Scholar', 2)], background: { name: 'Scientist', feat: { name: 'Techie', type: 'Feat', abilityScoreImprovements: { Intelligence: 1 } }, feature: '', skills: ['Medicine', 'Technology'] } }));
add(character('Expertise in class skills', { classes: [{ ...classEntry('Operative', 3), expertise: ['Stealth', 'Perception'] }] }));
add(character('Custom proficiencies and languages', {
  classes: [classEntry('Fighter', 2)],
  extra: {
    customProficiencies: [{ name: 'Stealth', type: 'Skill', proficiencyLevel: 'proficient' }, { name: 'Lore', type: 'Skill', proficiencyLevel: 'expertise' },
      { name: 'Slicer\'s kit', type: 'Tool', proficiencyLevel: 'proficient' }, { name: 'All lightweapons', type: 'Weapon', proficiencyLevel: 'proficient' }],
    customLanguages: ['Huttese', 'Binary'],
  },
}));
add(character('Encumbered', { classes: [classEntry('Fighter', 1)], scores: scoresFor('Fighter', { Strength: 8 }), equipment: ['Assault armor', 'Heavy physical shield', 'Heavy repeater', { name: 'Power cell', quantity: 60, category: 'Equipment' }] }));
add(character('Enhanced armor and weapon', {
  classes: [classEntry('Fighter', 5)],
  equipment: [{ name: 'Shield (Fine)', quantity: 1, category: 'EnhancedItem', equipped: true }, 'Mesh armor',
    { name: 'Aratech Echo Belt', quantity: 1, category: 'EnhancedItem', attuned: true }],
}));
add(character('Level 0 classes', { classes: [] }));

// 8. Play state, custom content, enhanced weapons, archetype casters, several feats, languages.
const played = (label, stats, classes = [classEntry('Fighter', 6), classEntry('Operative', 3, { first: false })]) => {
  const c = character(label, { classes });
  Object.assign(c.raw.currentStats, stats);
  return c;
};
add(played('Play: hurt, temporary HP, inspiration', { hitPointsLost: 17, temporaryHitPoints: 5, hasInspiration: true }));
add(played('Play: hit dice used', { hitDiceUsed: { d10: 3, d8: 2 } }));
add(played('Play: all hit dice used', { hitDiceUsed: { d10: 6, d8: 3 } }));
add(played('Play: death saves, conditions, exhaustion', { hitPointsLost: 76, deathSaves: { successes: 1, failures: 2 }, conditions: ['Poisoned', 'Prone'], exhaustion: 2 }));
add(played('Play: features used', { featuresTimesUsed: { 'Second Wind': 1, 'Action Surge': 1 }, superiorityDiceUsed: 2 }));
add(played('Play: force points used, high-level casting', { forcePointsUsed: 12, highLevelCasting: { level6: true, level7: false, level8: false, level9: false } }, [classEntry('Consular', 13)]));
add(played('Play: tech points used', { techPointsUsed: 7 }, [classEntry('Engineer', 7)]));
add(character('Custom features, feats and powers', {
  classes: [classEntry('Consular', 5)],
  extra: {
    customFeatures: [{ name: 'Old Wound', content: 'Disadvantage on Constitution saves in the cold.' }, { name: 'Family Holocron', content: 'A heirloom.' }],
    customFeats: ['Athlete', 'Durable'], customForcePowers: ['Force Lightning'], customTechPowers: ['Absorb Energy'],
  },
}));
add(character('Custom equipment', {
  classes: [classEntry('Fighter', 2)],
  extra: { customEquipment: [{ name: 'Family blade', quantity: 1, equipmentCategory: 'Weapon', cost: 0, weight: '2', description: 'Heirloom.' }] },
}));
add(character('Enhanced weapon on its base', {
  classes: [classEntry('Fighter', 5)],
  equipment: [{ name: 'Weapon (Fine)', quantity: 1, category: 'EnhancedItem', equipped: true }, 'Vibrosword', { name: 'Armor (Fine)', quantity: 1, category: 'EnhancedItem', equipped: true }, 'Battle armor'],
}));
const ARCH_CASTERS = [['Fighter', 'Adept Specialist', 'force'], ['Operative', 'Beguiler Practice', 'force'], ['Berserker', 'Marauder Approach', 'force'],
  ['Scholar', 'Archaeologist Pursuit', 'force'], ['Monk', 'Aing-Tii Order', 'force'], ['Berserker', 'Industrial Approach', 'tech'],
  ['Fighter', 'Shield Specialist', 'tech'], ['Scout', 'Mechanist Technique', 'tech'], ['Operative', 'Saboteur Practice', 'tech'], ['Scholar', 'Slicer Pursuit', 'tech']];
for (const [c, a, kind] of ARCH_CASTERS) {
  for (const lv of [3, 7, 13]) {
    const entry = { ...classEntry(c, lv), archetype: { name: a, [`${kind}Powers`]: powersOf(kind === 'force' ? 'Force' : 'Tech', 3) } };
    add(character(`Archetype caster ${a} ${lv}`, { classes: [entry] }));
  }
}
add(character('Archetype caster with a caster class', {
  classes: [{ ...classEntry('Fighter', 5), archetype: { name: 'Adept Specialist', forcePowers: powersOf('Force', 2) } }, classEntry('Consular', 3, { first: false })],
}));
add(character('Feats at three ASIs and the background', {
  classes: [{ ...classEntry('Fighter', 8), abilityScoreImprovements: [{ type: 'Feat', name: 'Tough' }, { type: 'Ability Score Improvement', abilitiesIncreased: [{ name: 'Strength', value: 2 }] }, { type: 'Feat', name: 'Athlete' }, { type: 'Feat', name: 'Durable' }] }],
  background: { name: 'Scientist', feat: { name: 'Techie', type: 'Feat' }, feature: '', skills: ['Medicine', 'Technology'] },
}));
add(character('Languages from species and background', {
  classes: [classEntry('Scholar', 1)], species: { name: 'Bothan', language: 'Bothese', abilityScoreImprovement: {} },
  background: { name: 'Scientist', feat: { name: 'Techie', type: 'Feat' }, feature: '', skills: ['Medicine', 'Technology'], languages: ['Huttese', 'Binary'] },
}));
add(character('Monk with no armor and a Wookiee', { classes: [classEntry('Monk', 6)], species: { name: 'Wookiee', abilityScoreImprovement: {} } }));
// Archetypes with superiority dice of their own, alone and with a class that has them.
for (const [c, a] of [['Berserker', 'Champion Approach'], ['Scout', 'Deadeye Technique'], ['Fighter', 'Fireteam Specialist'], ['Operative', 'Maverick Practice']]) {
  for (const lv of [3, 7, 13]) {
    add(character(`Superiority archetype ${a} ${lv}`, { classes: [{ ...classEntry(c, lv), archetype: { name: a }, maneuvers: ['Precision Attack', 'Rally'] }] }));
  }
}
add(character('Superiority archetype with a Fighter', { classes: [{ ...classEntry('Berserker', 5), archetype: { name: 'Champion Approach' } }, { ...classEntry('Fighter', 3, { first: false }), archetype: { name: 'Assault Specialist' } }] }));
add(character('Superiority archetype with a Scholar', { classes: [{ ...classEntry('Scholar', 4), archetype: { name: 'Slicer Pursuit' } }, { ...classEntry('Operative', 3, { first: false }), archetype: { name: 'Maverick Practice' } }] }));
// SW5E's checks: characters it won't build, or builds with a warning.
add(character('Invalid: no name', { classes: [classEntry('Fighter', 1)], extra: { name: '' } }));
add(character('Invalid: no species', { classes: [classEntry('Fighter', 1)], species: { name: '' } }));
add(character('Invalid: unknown species', { classes: [classEntry('Fighter', 1)], species: { name: 'Gungan' } }));
add(character('Invalid: no background', { classes: [classEntry('Fighter', 1)], background: { name: '', feat: null, feature: '' } }));
add(character('Invalid: no ability scores', { classes: [classEntry('Fighter', 1)], scores: { Strength: 0, Dexterity: 0, Constitution: 0, Intelligence: 0, Wisdom: 0, Charisma: 0 } }));
add(character('Invalid: unknown class', { classes: [{ name: 'Jedi', levels: 2, hitPoints: [5], abilityScoreImprovements: [] }] }));
add(character('Invalid: a class at level 0', { classes: [{ ...classEntry('Fighter', 1), levels: 0 }] }));
add(character('Invalid: hit points missing', { classes: [{ ...classEntry('Fighter', 4), hitPoints: [] }] }));
add(character('Second class takes over first-level hit points', { classes: [classEntry('Operative', 1), classEntry('Berserker', 5, { first: false })] }));

fs.mkdirSync(path.join(DEV, 'engine'), { recursive: true });
fs.writeFileSync(path.join(DEV, 'engine', 'inputs.json'), JSON.stringify({ rulesVersion: null, characters: out }, null, 1) + '\n');
console.log(`${out.length} characters → dev/engine/inputs.json`);
