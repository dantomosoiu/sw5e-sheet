/* The demo character: a ready-made character in every copy of the sheet (web, extension, dev page), to try the
 * sheet's features without creating one or bringing one from sw5e.com.
 *
 * It isn't stored like the others: its SW5E data is here, and loadStore adds it to state.snapshots each time
 * (saveStore leaves it out), so a new version of the sheet brings a new version of it. What's done with it here is
 * kept as for any character (edits, play state, effects, history, rolls under DEMO_KEY) and Reset (More ▾) drops
 * that. It never leaves this browser: no Sync to SW5E, no account backup (account.js), not in "Back up all".
 */
'use strict';

const DEMO_KEY = 'demo:sheet';
const isDemoKey = (key) => key === DEMO_KEY;
// When this version of the demo was made: its snapshot's loadedAt, the same in every browser.
const DEMO_AT = Date.UTC(2026, 9, 24);

const DEMO_RAW = {
  name: 'Vessa Tal',
  builderVersion: '0.7.6',
  image: '',
  user: '',
  experiencePoints: 6500,
  species: { name: 'Togruta', abilityScoreImprovementSelectedOption: 0, abilityScoreImprovement: { Strength: 1 } },
  classes: [{
    name: 'Guardian',
    levels: 5,
    hitPoints: [6, 7, 5, 6],
    // Level 4: the Brawny feat (+1 Strength; Athletics, already proficient, becomes expertise).
    abilityScoreImprovements: [{ type: 'Feat', name: 'Brawny' }],
    forcePowers: ['Guidance', 'Saber Reflect', 'Saber Ward', 'Force Leap', 'Saber Throw', 'Battle Insight', 'Heal', 'Heroism',
      'Force Jump', 'Sanctuary', 'Burst of Speed', 'Force Barrier'],
    skills: ['Athletics', 'Perception'],
    archetype: { name: 'Soresu Form' },
    options: { 'Guardian Auras': [{ name: 'Aura of Presence' }] },
  }],
  baseAbilityScores: { Strength: 15, Dexterity: 12, Constitution: 14, Intelligence: 8, Wisdom: 13, Charisma: 10 },
  background: {
    name: 'Jedi', feat: { name: 'Formfighting Dabbler', type: 'Feat', abilityScoreImprovements: { Strength: 1 } }, feature: '',
    skills: ['Insight', 'Persuasion'], languages: ['Huttese'],
  },
  characteristics: {
    alignment: 'Lawful Light',
    'Personality Traits': 'I quote the Jedi Code chapter and verse, and I expect others to keep their word as I keep mine.',
    Ideal: 'Protection. The Force flows through me so that I can stand between the weak and those who would harm them.',
    Bond: 'My master vanished on Ord Mantell; a smuggler\'s trail is my only lead.',
    Flaw: 'I can\'t walk away from someone in trouble, even when the mission depends on it.',
    Gender: 'Female',
    'Place of Birth': 'Shili',
    Age: '24',
    Height: '5\'7"',
    Weight: '130 lb.',
    Hair: '',
    Eyes: 'Blue',
    Skin: 'Orange with white markings',
    Appearance: 'Striped montrals and lekku, a plain brown Jedi robe over Jensaarai plates traded for on Susevfi.',
    Backstory: 'Raised in the Jedi enclave on Shili and trained in Soresu, the form of defence. When her master went '
      + 'missing chasing a smuggling ring on Ord Mantell, Vessa followed alone, with a borrowed lightsaber crystal and '
      + 'a debt to an outfitter who took pity on her.',
  },
  credits: 640,
  equipment: [
    { name: 'Lightsaber', quantity: 1, category: 'Equipment', equipped: true },
    // An enhanced armor is built on a base one (the sheet's base link, linkBase in viewer.js).
    { name: 'Mesh armor', quantity: 1, category: 'Equipment', equipped: true, enhancedBy: 'Jensaarai Armor', baseLink: 'demo-armor' },
    { name: 'Jensaarai Armor', quantity: 1, category: 'EnhancedItem', equipped: true, attuned: true, baseItem: 'Mesh armor', baseLink: 'demo-armor' },
    { name: 'Light physical shield', quantity: 1, category: 'Equipment', equipped: true },
    { name: 'Aratech Echo Belt', quantity: 1, category: 'EnhancedItem', equipped: true, attuned: true },
    { name: 'Vibrodagger', quantity: 1, category: 'Equipment', equipped: false },
    { name: 'Grenade, fragmentation', quantity: 2, category: 'Equipment' },
    { name: 'Medpac', quantity: 3, category: 'Equipment' },
    { name: 'Medpac (Fine)', quantity: 1, category: 'EnhancedItem' },
    { name: 'Strength Stim (Basic)', quantity: 1, category: 'EnhancedItem' },
    { name: 'Alacrity Adrenal (Basic)', quantity: 1, category: 'EnhancedItem' },
    { name: 'Commlink', quantity: 1, category: 'Equipment' },
    { name: 'Backpack', quantity: 1, category: 'Equipment' },
    { name: 'Bedroll', quantity: 1, category: 'Equipment' },
    { name: 'Binders', quantity: 1, category: 'Equipment' },
    { name: 'Field rations (one day\'s)', quantity: 5, category: 'Equipment' },
    { name: 'Glowrod', quantity: 1, category: 'Equipment' },
    { name: 'Clothes, common', quantity: 1, category: 'Equipment' },
  ],
  currentStats: {
    hitPointsLost: 0, temporaryHitPoints: 0, techPointsUsed: 0, forcePointsUsed: 0, superiorityDiceUsed: 0,
    hitDiceUsed: { d10: 0 }, deathSaves: { successes: 0, failures: 0 }, hasInspiration: false,
    featuresTimesUsed: { 'Channel the Force': 0 }, conditions: [], exhaustion: 0,
    highLevelCasting: { level6: false, level7: false, level8: false, level9: false },
  },
  // A tweak of the GM's (its reason is in DEMO_ITEMSTATE).
  tweaks: { abilityScores: { Intelligence: { skills: { Piloting: { bonus: 2 } } } } },
  customProficiencies: [],
  customLanguages: [],
  customFeatures: [],
  customFeats: [],
  customTechPowers: [],
  customForcePowers: [],
  customEquipment: [
    { name: 'Coded datapad (smuggler\'s coordinates)', quantity: 1, equipmentCategory: 'Gear', cost: 0, weight: '0',
      description: 'Taken in the docks ambush on Ord Mantell: the encrypted coordinates of the smugglers\' hideout.' },
    { name: 'Copy of the Jedi Code', quantity: 1, equipmentCategory: 'Gear', cost: 0, weight: 1,
      description: 'Jedi background starting equipment.' },
  ],
  settings: { isEnforcingForcePrerequisites: true, isFixedHitPoints: false, abilityScoreMethod: 'Standard Array' },
  notes: [
    '## The demo character',
    'Vessa is here to try the sheet with: change anything, roll, rest, use her items. It all stays in this browser, '
      + 'and **More ▾ → Reset the demo character** puts her back as she was. She is never synced to sw5e.com or backed '
      + 'up to an account; to keep a character of your own, create one or bring yours from sw5e.com.',
    '',
    '## Things to try',
    '- **Roll**: click any number with a die: an attack (Lightsaber), a save, a skill. The roller offers her bonuses.',
    '- **Take a hit**: Combat & Vitals, type an amount, Damage. Then a Short rest, spending Hit Dice to heal.',
    '- **Defend**: cast Saber Ward, then take kinetic damage by a weapon: her resistance halves it.',
    '- **Cast**: Force Casting, Heroism or Force Barrier: Cast spends her force points.',
    '- **Use an item**: a Medpac or the Strength Stim, on her or on someone else; it shows under Effects.',
    '- **Start a state**: Class Features, Soresu Form or Aura of Presence; End it when it\'s over.',
    '- **Hover a dotted number** to see what changed it (her armor, her aura, a stim, her Strength).',
    '- **Skills**: Athletics is at expertise (the Brawny feat); Piloting has a +2 tweak from the GM, with its reason '
      + '(Settings, Tweaks & Data).',
    '- **Level up** from Class Features, or **Edit** any section.',
    '',
    '## Session 1: Trouble on Ord Mantell',
    '- **Debt: I owe Kessa (Kessa\'s Outfitters) 370 cr** for two Medpacs and the vibrodagger.',
    '- Docks ambush: Soresu Form and Heroism; lost concentration on a failed Constitution save.',
    '- Loot: 150 cr, a Strength Stim, the coded datapad.',
    '',
    '## Session 2: The speeder bike chase',
    '- Ran the smugglers down through the Ord Mantell scrapyards on a borrowed speeder bike.',
    '- GM: +2 to Piloting from now on, for the inspiring flying (a tweak, with its reason).',
    '',
  ].join('\n'),
  featureNotes: { 'channel the force': 'Lend Aid' },
  featureChoices: {
    'Feat: Formfighting Dabbler (Background (Jedi))': [{ name: 'Soresu Form' }],
    'Soresu Form: Form Basics': [{ name: 'Shien Form' }],
    'Guardian: Fighting Style': [{ name: 'Defense Style' }],
  },
};

// Its starting local state: the reason for the GM's tweak above (the Tweaks list shows it, and the number's hover).
const DEMO_ITEMSTATE = {
  charges: {},
  effects: [],
  reasons: {
    'abilityScores.Intelligence.skills.Piloting': '+2 Piloting, a GM award: Vessa flew a borrowed speeder bike through the Ord Mantell '
      + 'scrapyards to run the smugglers down, and the table cheered (session 2)',
  },
  updatedAt: DEMO_AT,
};
// Reasons earlier versions of the demo gave: replaced by this version's (a reason written in the sheet is kept).
const DEMO_OLD_REASONS = ['GM award: the inspiring speeder bike chase through the Ord Mantell scrapyards'];

/** The demo's snapshot, as new: its computed sheet is the engine's, once SW5E's data is loaded (ensureSw5eData). */
function demoSnapshot() {
  const snap = {
    format: 'sw5e-sheet-snapshot', version: 1, key: DEMO_KEY, raw: JSON.parse(JSON.stringify(DEMO_RAW)),
    complete: null, refs: null, validation: null, error: null, source: 'demo', loadedAt: DEMO_AT, meta: { engine: true }, demo: true,
  };
  const ctx = typeof engineCtx === 'function' ? engineCtx() : null;
  if (ctx) {
    const r = engComputeCharacter(JSON.parse(JSON.stringify(DEMO_RAW)), ctx);
    Object.assign(snap, { complete: r.complete || null, refs: r.refs || null, validation: r.validation || null, error: r.error || null });
  }
  return snap;
}

/**
 * Add the demo to what's loaded (its snapshot isn't stored: see the top), and its starting local state where it has
 * none. Where it has some (the demo was used before), this version's tweak reasons replace missing ones and the ones an
 * earlier version gave; a reason written in the sheet is kept.
 */
function addDemo(st) {
  st.snapshots[DEMO_KEY] = demoSnapshot();
  if (!st.itemState) return;
  const mine = st.itemState[DEMO_KEY];
  if (!mine) { st.itemState[DEMO_KEY] = JSON.parse(JSON.stringify(DEMO_ITEMSTATE)); return; }
  const reasons = { ...(mine.reasons || {}) };
  let changed = false;
  for (const [k, v] of Object.entries(DEMO_ITEMSTATE.reasons)) {
    if (reasons[k] && !DEMO_OLD_REASONS.includes(reasons[k])) continue;
    if (reasons[k] !== v) { reasons[k] = v; changed = true; }
  }
  if (changed) st.itemState[DEMO_KEY] = { ...mine, reasons };
}

/** The characters that are the user's own: every one but the demo. */
const ownKeys = (snapshots) => Object.keys(snapshots).filter((k) => !isDemoKey(k));

if (typeof module !== 'undefined') module.exports = { DEMO_KEY, DEMO_RAW, DEMO_ITEMSTATE, isDemoKey, demoSnapshot, addDemo, ownKeys };
