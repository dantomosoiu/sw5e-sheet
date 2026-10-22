/* SW5E Character Sheet Viewer: effects.
 *
 * An effect is anything that changes a character's numbers or grants a trait: an item worn,
 * attuned or installed, a consumable used on the character, or an effect received from someone
 * else (later also maneuvers, powers…). Effects are read from SW5E's own text.
 *
 *   effect = {
 *     source: { kind: 'item' | 'consumable' | 'received' | …, name },
 *     mods:   [mod],          numbers SW5E's engine applies (as tweaks, see below)
 *     notes:  [text],         everything else worth knowing: conditional bonuses, resistances,
 *                             advantage, proficiencies, senses…
 *     target: 'self' | 'weapon' | 'unarmed',  who/what the mods apply to
 *     duration, group         timed effects ("1 hour"); "only one stimpac at a time"
 *   }
 *   mod = { path, bonus | set, cap?, label, cond?, ammo?, fields?, dice?, perLevel?, scoreAs?, acFlat? }
 *     path: a SW5E tweak path (abilityScores.Strength.score, armorClass, speed.base, initiative,
 *           passivePerception, hitPoints.maximum, abilityScores.X.savingThrowModifier,
 *           abilityScores.X.skills.Y, techCasting.saveDC|attackModifier|maxPoints,
 *           forceCasting.lightSaveDC|…, weapon.toHit|damage, unarmed.toHit|damage)
 *     set:  the score becomes N (only raises it); cap: bonus can't take the score above it.
 *     fields: other tweak fields to set as they are (override, proficiency, dieSize): used by
 *           the character's own tweaks, which are effects too (kind 'tweak').
 *     cond: the bonus only applies sometimes ("vs melee", "ranged tech attacks", "with Cryo
 *           Cell (Average)"); it isn't applied, but shown next to the stat as an alternative
 *           value. ammo: for "with <ammunition>", what it's fired from (matched to weapons).
 *     dice: extra damage dice on every hit (path weapon.extraDice / unarmed.extraDice: "deal an
 *           additional 1d10 damage with this enhanced weapon"), with `type` when it has its own.
 *     perLevel: the bonus is this many times the character's level ("equal to your level").
 *     scoreAs: { ability, score }: the number uses the ability as if it were that score, when it's
 *           lower ("your Dexterity score is treated as 15").
 *     acFlat: AC becomes this number, without Dexterity ("Your base AC becomes 19").
 *     Power bonuses (paths forcePowers.damage|healing, techPowers.damage|healing) aren't sent to
 *           the engine: the dice card adds them to power rolls.
 *
 * Mods are applied by adding tweak bonuses to the copy of the character the sheet is computed
 * from, so every number that depends on them (modifiers, saves, skills, attacks, carrying
 * capacity…) is SW5E's own result. They are never saved to sw5e.com.
 */
'use strict';

const FX_ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const FX_ABBR = { Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON', Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA' };
const FX_SKILLS = {
  Athletics: 'Strength', Acrobatics: 'Dexterity', 'Sleight of Hand': 'Dexterity', Stealth: 'Dexterity',
  Investigation: 'Intelligence', Lore: 'Intelligence', Nature: 'Intelligence', Piloting: 'Intelligence', Technology: 'Intelligence',
  'Animal Handling': 'Wisdom', Insight: 'Wisdom', Medicine: 'Wisdom', Perception: 'Wisdom', Survival: 'Wisdom',
  Deception: 'Charisma', Intimidation: 'Charisma', Performance: 'Charisma', Persuasion: 'Charisma',
};
const FX_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20 };
const fxNum = (w) => (/^\d+$/.test(w) ? Number(w) : FX_NUM[String(w).toLowerCase()] || 0);
const fxAbility = (w) => FX_ABILITIES.find((a) => a.toLowerCase() === String(w).toLowerCase());
const ABIL_RE = '(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)';
const SKILL_RE = '(' + Object.keys(FX_SKILLS).join('|') + ')';
const signedLabel = (n) => (n >= 0 ? '+' + n : '−' + Math.abs(n));

// Clauses that only say when an item works ("while wearing this armor"): its activation, not a condition.
const ACTIVATION_CLAUSE = /,?\s*\b(?:when you (?:administer|apply|use|consume|drink|inject|eat) (?:this|these|it)[^,.;]*,?|(?:while|whilst) (?:(?:you are |you're )?(?:wearing|wielding|holding|attuned to|using) (?:this|these|the) [^,.;]*|you (?:wear|wield|hold) (?:this|these|it)[^,.;]*|this (?:item|armor|shield|weapon) is (?:worn|equipped|installed)[^,.;]*))/gi;
// Words that make a bonus conditional (applies only sometimes): kept as a note, not applied.
const CONDITIONAL = /\b(?:against|that require|which require|when you|when the|if you|if the|once|until|for the next|melee tech|ranged tech|melee force|ranged force|melee attacks?\b|ranged attacks?\b|made with this enhanced (?!weapon\b)|fired by|grenades?|ammunition|cartridges?|cells?\b|darts?\b|rounds?\b|(?<!focus )generators?\b|of powers)/i;
// Levels of proficiency, in steps ("increases by two steps"). SW5E's engine (and the sheet's) knows proficient and
// expertise; trained, and the masteries above expertise, aren't numbers it has.
const FX_PROF_LADDER = ['none', 'trained', 'proficient', 'expertise', 'mastery', 'high mastery', 'grand mastery'];
const fxProfRank = (p) => { const s = String(p || '').toLowerCase(); return s.startsWith('exp') ? 2 : s.startsWith('prof') ? 1 : 0; };
// What ammunition is called ("this enhanced power cell"): its bonuses are the ammunition's, not a weapon's.
const FX_AMMO = /\b(?:cells?|cartridges?|darts?|ammunition|rockets?|missiles?|torpedo(?:es)?|(?<!focus )generators?|grenades?|rounds?)\b/i;
// Sentences worth keeping as notes even when they carry no number we can apply.
// Stats of the object itself ("binders have an AC of 10 and 5 hit points"), not of the character.
const OBJECT_STATS = /\b(?:has|have) an ac of \d+|\bit has a speed of\b/i;
const TRAIT = /\b(barrier has|resistan(?:ce|t)|immun(?:e|ity)|advantage|disadvantage|proficien(?:t|cy)|darkvision|blindsight|truesight|tremorsense|temporary hit points|regains? [^.]*hit points|can(?:'t|not) be (?:charmed|frightened|surprised)|bonus to|penalty to|speed|saving throws?|AC\b|armor class)\b/i;

/** Split SW5E text into sentences (markdown and "Requires attunement" headers removed). */
function fxSentences(text) {
  return String(text || '')
    .replace(/_\*\*requires attunement[^*]*\*\*_/gi, ' ')
    .replace(/[*_#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The numbers a "+N bonus to <phrase>" (or "-N penalty") gives, as mods. Null when the phrase
 * isn't something the engine can apply unconditionally.
 */
function fxBonusMods(n, phrase, ctx) {
  const p = phrase.toLowerCase().replace(/^(?:your|the|its|their|all of your) /, '').trim();
  const mods = [];
  const add = (path, label) => mods.push({ path, bonus: n, label: `${label} ${signedLabel(n)}` });
  let m;
  if (/^(?:ac|armor class)$/.test(p)) add('armorClass', 'AC');
  else if (/^initiative(?: rolls| checks)?$/.test(p)) add('initiative', 'Initiative');
  else if (/^passive (?:wisdom \()?perception\)?(?: score)?$/.test(p)) add('passivePerception', 'Passive Perception');
  else if (/^(?:all )?saving throws$/.test(p)) FX_ABILITIES.forEach((a) => add(`abilityScores.${a}.savingThrowModifier`, `${FX_ABBR[a]} saves`));
  else if ((m = new RegExp(`^${ABIL_RE}(?:,? (?:and|or) ${ABIL_RE})? saving throws$`, 'i').exec(p))) {
    [m[1], m[2]].filter(Boolean).map(fxAbility).forEach((a) => add(`abilityScores.${a}.savingThrowModifier`, `${FX_ABBR[a]} saves`));
  } else if ((m = new RegExp(`^(?:${ABIL_RE} \\()?${SKILL_RE}\\)? checks$`, 'i').exec(p))) {
    const skill = Object.keys(FX_SKILLS).find((k) => k.toLowerCase() === m[2].toLowerCase());
    add(`abilityScores.${FX_SKILLS[skill]}.skills.${skill}`, skill);
  } else if (/^tech attack rolls$/.test(p)) add('techCasting.attackModifier', 'Tech attack');
  else if (/^tech save dcs?$/.test(p)) add('techCasting.saveDC', 'Tech save DC');
  else if ((m = /^(light |dark |universal )?force (?:power )?attack rolls(?: for (?:force )?powers you cast through this focus generator)?$/.exec(p))) {
    (m[1] ? [m[1].trim()] : ['light', 'dark', 'universal']).forEach((k) => add(`forceCasting.${k}AttackModifier`, `${k[0].toUpperCase() + k.slice(1)} force attack`));
  } else if ((m = /^(light |dark |universal )?force save dcs?$/.exec(p))) {
    (m[1] ? [m[1].trim()] : ['light', 'dark', 'universal']).forEach((k) => add(`forceCasting.${k}SaveDC`, `${k[0].toUpperCase() + k.slice(1)} force save DC`));
  } else if ((m = /^(attack and damage|attack|damage) rolls (?:made )?with (?:this|these) (?:enhanced )?([a-z' -]+?)$/.exec(p)) && ctx.weaponItem && !FX_AMMO.test(m[2])) {
    // "…made with this enhanced weapon / lightsaber / shoulder cannon / shotgun": the item is the weapon.
    if (m[1] !== 'damage') add('weapon.toHit', 'Attack');
    if (m[1] !== 'attack') add('weapon.damage', 'Damage');
    ctx.target = 'weapon';
  } else if ((m = /^(attack and damage|attack|damage) rolls$/.exec(p)) && ctx.weaponMod) {
    // A weapon modification's "Additionally, you gain a +2 bonus to attack rolls" (Multispectral Optics): with that weapon.
    if (m[1] !== 'damage') add('weapon.toHit', 'Attack');
    if (m[1] !== 'attack') add('weapon.damage', 'Damage');
    ctx.target = 'weapon';
  } else if ((m = /^(attack and damage|attack|damage) rolls (?:made )?with your unarmed strikes$/.exec(p))) {
    if (m[1] !== 'damage') add('unarmed.toHit', 'Unarmed attack');
    if (m[1] !== 'attack') add('unarmed.damage', 'Unarmed damage');
  } else if ((m = /^attack rolls and deal an additional (\d+d\d+) (?:\w+ )?damage with (this (?:enhanced )?([a-z' -]+?)|your unarmed strikes)$/.exec(p))
    && (!m[3] || (ctx.weaponItem && !FX_AMMO.test(m[3])))) {
    // "a +3 bonus to attack rolls and deal an additional 1d10 damage with this enhanced weapon": the dice on every hit.
    if (m[3]) { add('weapon.toHit', 'Attack'); ctx.target = 'weapon'; } else add('unarmed.toHit', 'Unarmed attack');
    mods.push({ path: m[3] ? 'weapon.extraDice' : 'unarmed.extraDice', dice: m[1], label: `Damage +${m[1]}` });
  } else if ((m = /^damage rolls (?:made )?with weapons(?: and (force|tech) powers)?$/.exec(p))) {
    add('weapon.damage', 'Weapon damage');
    add('unarmed.damage', 'Unarmed damage');
    if (m[1]) add(`${m[1]}Powers.damage`, `${m[1] === 'force' ? 'Force' : 'Tech'} power damage`);
  } else if ((m = /^(damage and healing|damage|healing) rolls (?:you make )?with (force|tech) powers(?: when using this [\w ]+ as your focus)?$/.exec(p))) {
    // "a +1 bonus to its damage and healing rolls with force powers" (Sorcerer's Adrenal): the dice card adds it.
    const K = m[2] === 'force' ? 'Force' : 'Tech';
    if (m[1] !== 'healing') add(`${m[2]}Powers.damage`, `${K} power damage`);
    if (m[1] !== 'damage') add(`${m[2]}Powers.healing`, `${K} power healing`);
  } else if ((m = /^(?:the )?(tech|force) (?:power )?attack rolls for (?:tech |force )?powers you cast through this [\w ]+$/.exec(p))) {
    if (m[1] === 'tech') add('techCasting.attackModifier', 'Tech attack');
    else ['light', 'dark', 'universal'].forEach((k) => add(`forceCasting.${k}AttackModifier`, `${k[0].toUpperCase() + k.slice(1)} force attack`));
  } else return null;
  return mods;
}

/**
 * A bonus with a condition we can still express as a number: "+1 bonus to AC against melee
 * attacks", "+1 to melee tech attacks", "+1 to the tech save DC of powers that require a Strength
 * or Dexterity saving throw", "+1 to attack rolls made with this enhanced cryo cell", "+2 to
 * saving throws against poison". Mods carry `cond` (and `ammo`); null if not one of these.
 */
function fxCondMods(n, phrase, item) {
  const p = phrase.toLowerCase().replace(/^(?:your|the|its) /, '').replace(/,? which .*$/, '').replace(/\s+while .*$/, '').trim();
  const out = [];
  const add = (path, label, cond, extra) => out.push({ path, bonus: n, label: `${label} ${signedLabel(n)}`, cond, ...(extra || {}) });
  const forces = ['light', 'dark', 'universal'];
  const cap = (k) => k[0].toUpperCase() + k.slice(1);
  let m;
  if ((m = /^(?:ac|armor class) against (melee|ranged)(?: weapon)? attacks$/.exec(p))) add('armorClass', 'AC', `vs ${m[1]}`);
  else if ((m = /^(melee|ranged) (tech|force) (?:power )?attack(?:s| rolls)$/.exec(p))) {
    if (m[2] === 'tech') add('techCasting.attackModifier', 'Tech attack', `${m[1]} tech attacks`);
    else forces.forEach((k) => add(`forceCasting.${k}AttackModifier`, `${cap(k)} force attack`, `${m[1]} force attacks`));
  } else if ((m = new RegExp(`^(tech|force) save dc of powers (?:you cast )?that requires? an? ${ABIL_RE}(?: or ${ABIL_RE})? saving throw$`, 'i').exec(p))) {
    const cond = `powers with ${[m[2], m[3]].filter(Boolean).map((a) => FX_ABBR[fxAbility(a)]).join('/')} saves`;
    if (m[1] === 'tech') add('techCasting.saveDC', 'Tech save DC', cond);
    else forces.forEach((k) => add(`forceCasting.${k}SaveDC`, `${cap(k)} force save DC`, cond));
  } else if ((m = /^(attack and damage|attack|damage) rolls (?:made )?with this (?:enhanced )?(.+)$/.exec(p))
    && (item.type === 'Consumable' || item.equipmentCategory === 'Ammunition') && /cell|cartridge|dart|ammunition|rocket|missile|torpedo|generator/.test(m[2])) {
    const cond = `with ${item.name}`;
    if (m[1] !== 'damage') add('weapon.toHit', 'Attack', cond, { ammo: m[2] });
    if (m[1] !== 'attack') add('weapon.damage', 'Damage', cond, { ammo: m[2] });
  } else if ((m = /^attack rolls and deal an additional (\d+d\d+) (?:\w+ )?damage with this (?:enhanced )?(.+)$/.exec(p))
    && (item.type === 'Consumable' || item.equipmentCategory === 'Ammunition') && /cell|cartridge|dart|ammunition|rocket|missile|torpedo|generator/.test(m[2])) {
    add('weapon.toHit', 'Attack', `with ${item.name}`, { ammo: m[2], extraDamage: m[1] });
  } else if ((m = new RegExp(`^(?:${ABIL_RE}(?:,? (?:and|or) ${ABIL_RE})? )?saving throws against (.+)$`, 'i').exec(p))) {
    const abs = [m[1], m[2]].filter(Boolean).map(fxAbility);
    (abs.length ? abs : FX_ABILITIES).forEach((a) => add(`abilityScores.${a}.savingThrowModifier`, `${FX_ABBR[a]} saves`, `vs ${m[3]}`));
  } else return null;
  return out;
}

/** Tech/force-casting phrasing that lists several things: "a +1 bonus to its tech attack rolls, tech save DC, and …". */
function fxListMods(n, list) {
  const mods = [];
  const l = list.toLowerCase();
  if (/tech attack rolls/.test(l)) mods.push({ path: 'techCasting.attackModifier', bonus: n, label: `Tech attack ${signedLabel(n)}` });
  if (/tech save dc/.test(l)) mods.push({ path: 'techCasting.saveDC', bonus: n, label: `Tech save DC ${signedLabel(n)}` });
  // "…, and damage and healing rolls with tech powers" (Machinist's Catalyzer): the dice card adds it.
  const pw = /\b(damage and healing|damage|healing) rolls with (force|tech) powers/.exec(l);
  if (pw) {
    const K = pw[2] === 'force' ? 'Force' : 'Tech';
    if (pw[1] !== 'healing') mods.push({ path: `${pw[2]}Powers.damage`, bonus: n, label: `${K} power damage ${signedLabel(n)}` });
    if (pw[1] !== 'damage') mods.push({ path: `${pw[2]}Powers.healing`, bonus: n, label: `${K} power healing ${signedLabel(n)}` });
  }
  for (const k of ['light', 'dark', 'universal']) {
    if (new RegExp(`(?:${k} |\\b)force attack rolls`).test(l) && (l.includes(k) || !/light|dark|universal/.test(l))) {
      mods.push({ path: `forceCasting.${k}AttackModifier`, bonus: n, label: `${k[0].toUpperCase() + k.slice(1)} force attack ${signedLabel(n)}` });
    }
    if (new RegExp(`(?:${k} |\\b)force save dc`).test(l) && (l.includes(k) || !/light|dark|universal/.test(l))) {
      mods.push({ path: `forceCasting.${k}SaveDC`, bonus: n, label: `${k[0].toUpperCase() + k.slice(1)} force save DC ${signedLabel(n)}` });
    }
  }
  return mods;
}

/**
 * Read an item's effect on whoever uses/wears it. Returns null for items with none.
 *   { mods, notes, target, duration, group, activation }
 * activation: 'use' (consumables: when used), 'attune' (requires attunement), 'equip'
 * (worn, wielded, installed, used as a focus…).
 */
function parseItemEffect(item) {
  if (!item) return null;
  const text = item.text || item.description || '';
  const isConsumable = item.type === 'Consumable' || ['Explosive', 'Ammunition', 'Spice', 'AlcoholicBeverage'].includes(item.equipmentCategory)
    || /^(medpac|poison|emergency rations)/i.test(item.name || '');
  const ctx = {
    weaponItem: item.type === 'Weapon' || item.type === 'ItemModification' || item.equipmentCategory === 'Weapon' || /\b(?:handwraps|gauntlets?)\b/i.test(item.name || ''),
    // A modification for a weapon (its "attack rolls" are that weapon's).
    weaponMod: item.type === 'ItemModification' && /^(?:blaster|lightweapon|vibroweapon)$/i.test(item.subtype || ''),
    target: 'self',
    notes: [],
  };
  const mods = [];
  const notes = [];
  const riders = [];
  let duration = '';
  let group = null;
  let darkvisionPlus = 0;
  let m;
  let options = false; // after "choose from the following": modes to pick from, not always on
  let requires = null; // a set bonus's other pieces ("While wearing and attuned to this armor and Jensaarai Cloak, …")
  let freeAttune = null;
  for (const raw of fxSentences(text)) {
    let s = raw.replace(ACTIVATION_CLAUSE, '');
    let used = false;
    // Set bonuses (Jensaarai Regalia, Mandalorian Vestments): "While wearing and attuned to this armor, Jensaarai Cloak,
    // and Jensaarai Headgear, this armor now grants a +3 bonus to AC, instead of +2." What the sentence (and the ones
    // after it, until the next set) gives holds only with those items attuned too (`requires`, checked by itemEffects).
    const setM = /^while wearing and attuned to (?:this|these) [a-z]+((?:,? (?:and )?[A-Z][\w'’]*(?: [A-Z][\w'’]*)*)+),\s*(.*)$/.exec(s.replace(/^While/, 'while'));
    if (setM) {
      requires = setM[1].split(/,\s*(?:and\s+)?|\s+and\s+/).map((x) => x.trim()).filter(Boolean);
      s = setM[2];
    } else if (/^[A-Z][\w' ]+ (?:Regalia|Vestments)\.$/.test(s)) continue;
    const before = mods.length;
    // "…this armor now grants a +2 bonus to AC, instead of +1": the difference, with the other pieces.
    if (requires && (m = /\bnow grants? a \+(\d+) bonus to (?:AC|armor class), instead of \+(\d+)/i.exec(s))) {
      const n = Number(m[1]) - Number(m[2]);
      mods.push({ path: 'armorClass', bonus: n, requires, label: `AC +${n} (with ${requires.join(' and ')})` });
      continue;
    }
    // "…this headgear no longer count towards your maximum attunement".
    if (requires && /\bno longer counts? towards your maximum attunement\b/i.test(s)) { freeAttune = requires; continue; }
    if (options) { if (TRAIT.test(s)) notes.push(raw); continue; }
    if (/choose (?:one )?(?:from|of) the following/i.test(s)) {
      options = true;
      notes.push(raw);
      continue;
    }
    // Duration and "only one X at a time".
    // "For the next minute, the creature experiences a high…" (no number: one), before the low's "lasts 1 hour".
    if (!duration && (m = /(?:lasts? (?:for )?|for (?:the next )?)(\d+|an?|one|ten) (round|minute|hour|day)s?\b|\bfor the next (round|minute|hour|day)\b/i.exec(s))) {
      const n = m[1] ? fxNum(m[1]) : 1;
      duration = `${n} ${(m[2] || m[3]).toLowerCase()}${n === 1 ? '' : 's'}`;
    }
    // A spice's or drink's high: "allows them to roll an additional d4 when making an ability check, attack roll, or
    // saving throw using Wisdom": a die the dice card offers on those rolls while it lasts.
    if ((m = new RegExp(`\\ba high that allows them to roll an additional (\\d*)d(\\d+) when making ([^.]+?) using ${ABIL_RE}`, 'i').exec(s))) {
      const a = fxAbility(m[4]);
      const on = [/ability check/i.test(m[3]) ? `check:${a}` : '', /saving throw/i.test(m[3]) ? `save:${a}` : '', /attack roll/i.test(m[3]) ? `attack:${a}` : ''].filter(Boolean);
      riders.push({ on, dice: `${m[1] || 1}d${m[2]}`, once: false });
      ctx.notes.push(`+${m[1] || 1}d${m[2]} on ${m[3].replace(/,? or /, ' or ')} using ${a} (offered on the dice card).`);
    }
    if ((m = /only one (\w+?) at a time/i.exec(s))) { group = m[1].toLowerCase(); used = true; }
    if (OBJECT_STATS.test(s)) continue;
    // Temporary weapon coatings: "you can apply this collimator to one lightweapon …, granting it a +1 bonus to attack and damage rolls".
    if ((m = /apply (?:this|these) [^.]*? to (?:one|a) ([^.,]*?)(?: within \d+ feet)?, granting it a \+(\d+) bonus to (attack and damage|attack|damage) rolls/i.exec(s))) {
      const n = Number(m[2]);
      if (m[3] !== 'damage') mods.push({ path: 'weapon.toHit', bonus: n, label: `Attack +${n}` });
      if (m[3] !== 'attack') mods.push({ path: 'weapon.damage', bonus: n, label: `Damage +${n}` });
      ctx.target = 'weapon';
      ctx.weaponKind = m[1].trim();
      if ((m = /dealing an additional (\d+d\d+)/i.exec(s))) mods.push({ path: 'weapon.extraDice', dice: m[1], label: `Damage +${m[1]}` });
      continue;
    }
    // "When you deal damage with this weapon, you deal an additional 1d6 acid, cold, … damage (chosen by the GM when
    // generating this item)" (Ostrine Edge) / "…, you can roll a d4 and add the result to the total" (Damind Crystal):
    // dice on every hit.
    if (ctx.weaponItem && (m = /^when you deal damage with this weapon, you (?:deal an additional (\d*d\d+) ([^.]*?) ?damage|can roll an? (\d*d\d+) and add the result to the total)/i.exec(s))) {
      const dice = (m[1] || m[3]).replace(/^d/, '1d');
      const type = m[2] ? m[2].replace(/,? or /, ' or ') + (/chosen by the gm/i.test(s) ? ' (the GM chooses)' : '') : '';
      mods.push({ path: 'weapon.extraDice', dice, type, label: `Damage +${dice}${type ? ` ${type}` : ''}` });
      ctx.target = 'weapon';
      continue;
    }
    // Properties a modification gives the armor or weapon it's installed in, the ones that change numbers. Agile: "While
    // wearing armor … with this property, your Dexterity score becomes equal to the agile number" (powered: Strength).
    if ((m = /\bthis armor gains the (agile|powered) (\d+) property/i.exec(s))) {
      const a = m[1].toLowerCase() === 'agile' ? 'Dexterity' : 'Strength';
      mods.push({ path: `abilityScores.${a}.score`, set: Number(m[2]), when: { armor: true }, label: `${FX_ABBR[a]} ${m[2]} (${m[1].toLowerCase()} ${m[2]})` });
      continue;
    }
    if (/^if it already has the (?:agile|powered) property/i.test(s)) continue; // base armor never has them
    // Keen: "the critical hit range increases by an amount equal to the keen number". "This weapon gains the keen 1
    // property. If it already has the keen property, its keen number increases by 1, to a maximum of 3 / increases to 3."
    if ((m = /\bthis weapon gains the keen (\d+) property/i.exec(s))) {
      ctx.keen = { ...(ctx.keen || {}), gain: Number(m[1]) };
      ctx.target = 'weapon';
      continue;
    }
    if ((m = /^if it already has the keen property, its keen number increases (?:by (\d+), to a maximum of (\d+)|to (\d+))/i.exec(s))) {
      ctx.keen = { ...(ctx.keen || {}), ...(m[3] ? { to: Number(m[3]) } : { by: Number(m[1]), max: Number(m[2]) }) };
      continue;
    }
    // Finesse ("you use your choice of your Strength or Dexterity modifier for the attack and damage rolls"), and a
    // blaster's mighty (the same): the better one, worked out on the weapon (itemEffects, fxResolve).
    if ((m = /\bthis weapon gains the (finesse|mighty) property\b/i.exec(s))) {
      const prop = m[1].toLowerCase();
      for (const path of ['weapon.toHit', 'weapon.damage']) mods.push({ path, bonus: 0, property: prop, label: `${prop[0].toUpperCase()}${prop.slice(1)}: ${path === 'weapon.toHit' ? 'attack' : 'damage'} with the better of STR and DEX` });
      ctx.target = 'weapon';
      continue;
    }
    // "Your level of proficiency in Investigation increases by two steps (to proficient, from trained to expertise, …)" /
    // "…in Dexterity saving throws…" / "You gain grand mastery in Investigation": worked out from the proficiency the
    // character has (fxResolve). "These tools" (a tool kit) names no tool: it stays the item's text.
    if ((m = /\byour level of proficiency in (.+?) increases by (one|two|three|four|five|six) steps?\b|\byou (?:gain|have) (grand mastery) in (.+?)(?:\.|$)/i.exec(s))) {
      const what = (m[1] || m[4]).trim();
      const steps = m[3] ? FX_PROF_LADDER.length - 1 : fxNum(m[2]);
      const sk = Object.keys(FX_SKILLS).find((k) => k.toLowerCase() === what.toLowerCase());
      const sv = new RegExp(`^${ABIL_RE} saving throws$`, 'i').exec(what);
      const path = sk ? `abilityScores.${FX_SKILLS[sk]}.skills.${sk}` : sv ? `abilityScores.${fxAbility(sv[1])}.savingThrowModifier` : null;
      if (path) {
        mods.push({ path, bonus: 0, profSteps: steps, label: `${sk || `${FX_ABBR[fxAbility(sv[1])]} saves`}: ${m[3] ? 'grand mastery' : `+${steps} proficiency step${steps === 1 ? '' : 's'}`}` });
        continue;
      }
    }
    // "…you can add half your proficiency bonus (rounded down) to any Intelligence check you make that doesn't already
    // include your proficiency bonus" (Intuitive Facial Prosthesis): its skills without proficiency (fxResolve), and
    // plain Intelligence checks on the dice card (halfProfChecks).
    if ((m = new RegExp(`\\badd half your proficiency bonus(?: \\(rounded down\\))? to any ${ABIL_RE} check you make that doesn(?:'|’)t already include your proficiency bonus`, 'i').exec(s))) {
      const a = fxAbility(m[1]);
      ctx.halfProfChecks = [a];
      for (const sk of Object.keys(FX_SKILLS).filter((k) => FX_SKILLS[k] === a)) mods.push({ path: `abilityScores.${a}.skills.${sk}`, bonus: 0, halfProf: true, label: `${sk}: half proficiency` });
    }
    // "Your unarmed strikes with this arm deal 1d4 ion damage" (Iridonian Grav-lev Arm): the unarmed die, as a species'
    // natural weapons give it, and its damage type (weaponDamageType).
    if ((m = /\byour unarmed strikes(?: with this \w+)? deal (\d+)d(\d+) (\w+) damage/i.exec(s))) {
      ctx.unarmedDie = Number(m[2]);
      ctx.unarmedType = m[3].toLowerCase();
    }
    // A spice's high: "increases their current and maximum tech points by 2d4" (Muon Gold; Spicebrew: force points):
    // rolled when it's used (makeEffect), the maximum goes up by the roll and the current with it.
    if ((m = /\bincreases their current and maximum (tech|force) points by (\d*d\d+)/i.exec(s))) {
      const k = m[1].toLowerCase();
      mods.push({ path: `${k}Casting.maxPoints`, bonus: 0, rollBonus: m[2], label: `${k === 'tech' ? 'Tech' : 'Force'} points +${m[2]}` });
      used = true;
    }
    // "One ability score other than Charisma (chosen by the GM) decreases by 1" (enhancements, augments, packages): the
    // GM's pick is asked for (itemEffects reads it from the item's note).
    if ((m = new RegExp(`\\bone ability score \\(?other than ${ABIL_RE}\\)? (?:\\(chosen by the [GD]M\\)|that is chosen by the [GD]M[^.]*?) decreases by (\\d+)`, 'i').exec(s))) {
      ctx.sideEffect = { except: fxAbility(m[1]), by: Number(m[2]) };
      continue;
    }
    // A class augment ("Fighter Offensive Augment") changes its class's table: "Your Rage damage bonus increases by 1",
    // "Your Sneak Attack damage die increases by one step", "you gain one additional superiority die", "You learn an
    // additional maneuver / Berserker Instinct option", "the radius of your Guardian Auras increases by 5 feet". The
    // column each means is found in the class's table (itemClassRow); only for that class.
    const augClass = (/^(\w+) (?:Offensive|Defensive) Augment$/.exec(item.name || '') || [])[1];
    if (augClass) {
      const boosts = [];
      for (const c of s.split(/,\s*and\s+|;\s*/)) {
        if ((m = /\byour ([\w' -]+?) damage bonus increases by (\d+)/i.exec(c))) boosts.push({ phrase: `${m[1]} damage`, kind: 'add', n: Number(m[2]) });
        else if ((m = /\bthe damage die for your ([\w' -]+?) (?:die )?and ([\w' -]+?) features? increases by one step/i.exec(c))) boosts.push({ phrase: m[1], kind: 'step' }, { phrase: m[2], kind: 'step' });
        else if ((m = /\byour ([\w' -]+?) damage die increases by one step/i.exec(c))) boosts.push({ phrase: m[1], kind: 'step' });
        else if (/\bgain one additional superiority die\b/i.test(c)) {
          boosts.push({ phrase: 'superiority dice quantity', kind: 'add', n: 1 });
          // SW5E's engine counts superiority dice itself when it knows the class's: its tweak too.
          mods.push({ path: 'superiority.maxDice', bonus: 1, forClass: augClass, label: 'Superiority dice +1' });
        } else if ((m = /\bthe radius of your ([\w' -]+?) increases by (\d+) feet/i.exec(c))) boosts.push({ phrase: `${m[1]} radius`, kind: 'feet', n: Number(m[2]) });
        else if ((m = /\byou (?:learn an additional|gain one|gain an additional) ([\w' -]+?)(?: option)?\s*$/i.exec(c.replace(/\.$/, '')))) boosts.push({ phrase: m[1], kind: 'add', n: 1 });
      }
      if (boosts.length) {
        ctx.classBoosts = { cls: augClass, boosts: (ctx.classBoosts ? ctx.classBoosts.boosts : []).concat(boosts) };
        used = true;
        notes.push(raw);
        continue;
      }
    }
    // Extra dice a weapon deals only sometimes: "Once per turn when you hit … you can expend a charge to have the weapon
    // deal an additional 1d8 kinetic damage" (Hewey), "on a hit, if the target is wearing heavy armor, it deals an
    // additional 1d6 lightning damage" (Charric Pistol), "The first time you hit a creature … each round, the creature
    // takes an additional 1d4 damage" (Flashy): an option on the weapon's damage roll, off until ticked.
    if (ctx.weaponItem && !isConsumable && (m = /\b(?:deals?|takes?) an (?:additional|extra) (\d*d\d+)(?: ([a-z]+))? damage\b(?! for each)/i.exec(s))
      && /\bonce per turn\b|\bthe first time\b|\bif the target\b|\broll a 20\b/i.test(s)) {
      const why = /heavy armor/i.test(s) ? 'vs heavy armor' : /first time/i.test(s) ? 'first hit each round' : /roll a 20/i.test(s) ? 'on a 20, or a creature yet to act'
        : `once per turn${/expend a charge/i.test(s) ? ', a charge' : ''}`;
      riders.push({ on: ['weapon-damage'], dice: m[1].replace(/^d/, '1d'), type: m[2] || '', optional: true, weapon: true, why });
      ctx.target = 'weapon';
      ctx.notes.push(raw);
      continue;
    }
    // Ability scores: "your/the target's Strength score increases by 2, to a maximum of 20" /
    // "…, and your maximum for this score increases by 2" / "your Strength score becomes 19".
    for (const am of s.matchAll(new RegExp(`\\b${ABIL_RE} score (?:increases|is increased) by (\\d+)(?:, to a maximum of (\\d+))?(,? and (?:your|its|their) maximum for this score (?:increases|is increased) by (\\d+))?`, 'gi'))) {
      const a = fxAbility(am[1]);
      const n = Number(am[2]);
      const cap = am[3] ? Number(am[3]) : am[5] ? 20 + Number(am[5]) : 20;
      mods.push({ path: `abilityScores.${a}.score`, bonus: n, cap, label: `${FX_ABBR[a]} +${n}` });
      used = true;
    }
    for (const am of s.matchAll(new RegExp(`\\b${ABIL_RE} score (?:becomes|is|changes to) (\\d+)`, 'gi'))) {
      const a = fxAbility(am[1]);
      mods.push({ path: `abilityScores.${a}.score`, set: Number(am[2]), label: `${FX_ABBR[a]} ${am[2]}` });
      used = true;
    }
    // Speed.
    if ((m = /\b(?:walking )?speed (?:increases|is increased) by (\d+) (?:feet|ft)/i.exec(s)) && !CONDITIONAL.test(s.replace(m[0], ''))) {
      mods.push({ path: 'speed.base', bonus: Number(m[1]), label: `Speed +${m[1]} ft` });
      used = true;
    } else if ((m = /\b(?:walking )?speed (?:decreases|is reduced) by (\d+) (?:feet|ft)/i.exec(s)) && !CONDITIONAL.test(s.replace(m[0], ''))) {
      mods.push({ path: 'speed.base', bonus: -Number(m[1]), label: `Speed −${m[1]} ft` });
      used = true;
    }
    // Unarmored AC formula: "When you aren't wearing armor, your AC becomes 13 + your Dexterity modifier", a droid's
    // "When you don't have armor integrated, your AC is 13 + your Dexterity modifier" (Reinforced Chassis)
    // (SW5E's unarmored AC is 10 + Dexterity; only the best such formula counts, see fxResolve).
    if ((m = /\b(?:when|while) you (?:aren't|are not|don't|do not) (?:wearing (?:any )?armor|have (?:any )?armor integrated), your (?:AC|armor class) (?:becomes|equals|is) (\d+) \+ your Dexterity modifier/i.exec(s))) {
      mods.push({ path: 'armorClass', bonus: Number(m[1]) - 10, acFormula: true, when: { noArmor: true }, label: `AC ${m[1]} + DEX (no armor)` });
      used = true;
    }
    // "Your base AC becomes 19" (Droid Dura Plating): 19 instead of 10 + Dexterity, without armor.
    if ((m = /\byour base (?:AC|armor class) becomes (\d+)\b/i.exec(s))) {
      mods.push({ path: 'armorClass', bonus: 0, acFlat: Number(m[1]), acFormula: true, when: { noArmor: true }, label: `AC ${m[1]} (base)` });
      used = true;
    }
    // "When determining your bonus to AC and saving throws from Dexterity, your Dexterity score is treated as 15"
    // (Celerity Leg Prosthesis): the difference, when the score is lower ("If your Dexterity score is already equal to
    // or greater than 15, it has no effect on you"). Heavy armor adds no Dexterity to AC.
    if ((m = new RegExp(`\\bbonus to AC and saving throws from ${ABIL_RE}, your \\1 score is treated as (\\d+)`, 'i').exec(s))) {
      const a = fxAbility(m[1]);
      const scoreAs = { ability: a, score: Number(m[2]) };
      if (a === 'Dexterity') mods.push({ path: 'armorClass', bonus: 0, scoreAs, when: { noHeavy: true }, label: `AC as ${FX_ABBR[a]} ${m[2]}` });
      mods.push({ path: `abilityScores.${a}.savingThrowModifier`, bonus: 0, scoreAs, label: `${FX_ABBR[a]} saves as ${FX_ABBR[a]} ${m[2]}` });
      used = true;
    }
    // Hit point maximum.
    if ((m = /(?:hit point maximum (?:increases|is increased)|(?:current and )?maximum hit points (?:increase|are increased)) by (\d+)\b(?! times| for each| per| every)/i.exec(s))) {
      mods.push({ path: 'hitPoints.maximum', bonus: Number(m[1]), label: `HP max +${m[1]}` });
      used = true;
    } else if ((m = /\bhit point maximum increases by an amount equal to (?:(twice|three times|four times) )?your level, and it increases by (\d+) every time you gain a level/i.exec(s))) {
      // "…by an amount equal to twice your level, and it increases by 2 every time you gain a level" (Bioenhancement Matrix).
      const k = Number(m[2]);
      mods.push({ path: 'hitPoints.maximum', bonus: 0, perLevel: k, label: `HP max +${k} per level` });
      used = true;
    }
    // "If you already have darkvision, these goggles increase its range by 30 feet."
    if ((m = /\bif you already have darkvision, [^.]*?increases? its range by (\d+) feet/i.exec(s))) darkvisionPlus = Number(m[1]);
    // Tech/force point maximums.
    if ((m = /(?:maximum number of |number of )?(tech|force) points? (?:maximum )?(?:increases|is increased) by (\d+)/i.exec(s))) {
      mods.push({ path: `${m[1].toLowerCase()}Casting.maxPoints`, bonus: Number(m[2]), label: `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} points +${m[2]}` });
      used = true;
    }
    // "+N bonus to X" / "-N penalty to Y" (possibly both in one sentence).
    // ("You have a +1 to damage rolls made with this shotgun": no "bonus".)
    const clauses = [...s.matchAll(/([+\-−])(\d+) (?:(bonus|penalty) )?to ([^.;]+?)(?=(?:,? and (?:a|an) [+\-−]\d+ (?:bonus|penalty))|[.;]|$)/gi)];
    // "a +1 bonus to attack rolls and a -1 penalty to damage rolls made with this weapon": the
    // ending ("made with this weapon") belongs to every clause.
    const ending = clauses.length > 1 && (/ rolls ((?:made )?with [^.;]+)$/i.exec(clauses[clauses.length - 1][4]) || [])[1];
    for (const cm of clauses) {
      const n = Number(cm[2]) * (String(cm[3]).toLowerCase() === 'penalty' || cm[1] !== '+' ? -1 : 1);
      if (!cm[3] && !/^(?:attack|damage|attack and damage) rolls\b/i.test(cm[4])) continue; // "+1 to" without "bonus": only rolls
      if (ending && /^(?:attack|damage|attack and damage) rolls$/i.test(cm[4].trim())) cm[4] = `${cm[4].trim()} ${ending}`;
      // "…with this enhanced weapon, and when you hit a creature… takes an extra 1d4" (Torchy) / "…with this weapon,
      // when you attack a creature with it, the creature can't take reactions" (Ghostfire Crystal): the bonus is
      // unconditional, what follows is another effect.
      cm[4] = cm[4].replace(/,\s+(?:and\s+)?when you (?:hit|attack) a creature\b.*$/i, '');
      // "…with this enhanced shoulder cannon, which has the smart (18, +4) property": what the weapon is like.
      if (ctx.weaponItem && !isConsumable) cm[4] = cm[4].replace(/,\s+which\b.*$/i, '');
      const phrase = cm[4].replace(/\s*\(.*$/, (x) => (/^\s*\((?:strength|dexterity|constitution|intelligence|wisdom|charisma)\)?/i.test(x) ? x : '')).trim();
      // An enhanced weapon's "made with this enhanced lightsaber" is the weapon itself, not a condition.
      const condText = ctx.weaponItem && !isConsumable ? phrase.replace(/\bmade with (?:this|these) enhanced [a-z' -]+$/i, (x) => (FX_AMMO.test(x) ? x : 'made with this weapon')) : phrase;
      if (CONDITIONAL.test(condText)) {
        const cond = fxCondMods(n, cm[4], item);
        if (cond) {
          mods.push(...cond);
          used = true;
          if (cond.some((x) => x.ammo)) ctx.ammo = true;
        }
        continue;
      }
      const list = /,|\band\b/.test(phrase) && /tech|force/i.test(phrase) ? fxListMods(n, phrase) : null;
      const got = list && list.length ? list : fxBonusMods(n, phrase, ctx);
      if (got && got.length) { mods.push(...got); used = true; }
    }
    if (requires) for (const x of mods.slice(before)) x.requires = requires;
    if (!used && TRAIT.test(s)) notes.push(raw);
  }
  notes.push(...ctx.notes);
  // Ammunition's bonuses apply while it's carried (and fired); other consumables' when used.
  const activation = ctx.ammo ? 'carry' : isConsumable ? 'use' : item.requiresAttunement ? 'attune' : 'equip';
  if (!mods.length && !notes.length && !riders.length && !darkvisionPlus && !ctx.keen && !freeAttune && !ctx.unarmedDie && !(isConsumable && duration)) return null;
  return {
    mods, notes, target: ctx.target, weaponKind: ctx.weaponKind || null, duration, group, activation,
    heals: /regains? [^.]*hit points|temporary hit points/i.test(text),
    ...(riders.length ? { riders } : {}), ...(darkvisionPlus ? { darkvisionPlus } : {}), ...(ctx.keen ? { keen: ctx.keen } : {}),
    ...(ctx.halfProfChecks ? { halfProfChecks: ctx.halfProfChecks } : {}), ...(ctx.unarmedDie ? { unarmedDie: ctx.unarmedDie, unarmedType: ctx.unarmedType } : {}),
    ...(freeAttune ? { freeAttune } : {}), ...(ctx.sideEffect ? { sideEffect: ctx.sideEffect } : {}), ...(ctx.classBoosts ? { classBoosts: ctx.classBoosts } : {}),
  };
}

// ------------------------------------------------------------- tweaks
// SW5E's "tweaks" (manual adjustments: raw.tweaks, and per-weapon equipment[i].tweaks) are
// treated as effects, so they too are explained wherever they change a number.
const TWEAK_FIELDS = ['bonus', 'override', 'proficiency', 'dieSize'];
/** The adjustments in a tweaks object: [{ path, value }] where value is e.g. { bonus: 1, override: null }. */
function fxTweakLeaves(tweaks, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(tweaks || {})) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    // A cleared field is null: the tweak is still there (shown as "no change") until it's removed.
    if (Object.keys(v).some((f) => TWEAK_FIELDS.includes(f) && (v[f] === null || typeof v[f] !== 'object'))) out.push({ path, value: v });
    out.push(...fxTweakLeaves(Object.fromEntries(Object.entries(v).filter(([, x]) => x && typeof x === 'object')), path));
  }
  return out;
}
/** Does a tweak value change anything? ({ bonus: 0, override: null } doesn't.) */
const fxTweakActive = (v) => !!v && (num0(v.bonus) !== 0 || (v.override != null && v.override !== '') || !!v.proficiency || !!v.dieSize);
const num0 = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

const TWEAK_NAMES = {
  armorClass: 'AC', initiative: 'Initiative', 'speed.base': 'Speed', passivePerception: 'Passive Perception',
  'hitPoints.maximum': 'HP maximum', proficiencyBonus: 'Proficiency bonus',
  'techCasting.saveDC': 'Tech save DC', 'techCasting.attackModifier': 'Tech attack', 'techCasting.maxPoints': 'Tech points',
  'techCasting.maxPowerLevel': 'Tech max power level',
  'forceCasting.lightSaveDC': 'Light force save DC', 'forceCasting.darkSaveDC': 'Dark force save DC', 'forceCasting.universalSaveDC': 'Universal force save DC',
  'forceCasting.lightAttackModifier': 'Light force attack', 'forceCasting.darkAttackModifier': 'Dark force attack', 'forceCasting.universalAttackModifier': 'Universal force attack',
  'forceCasting.maxPoints': 'Force points', 'forceCasting.maxPowerLevel': 'Force max power level',
  'superiority.maxDice': 'Superiority dice', 'superiority.generalModifier': 'General maneuver attack', 'superiority.generalSaveDC': 'General maneuver DC',
  'superiority.physicalModifier': 'Physical maneuver attack', 'superiority.physicalSaveDC': 'Physical maneuver DC',
  'superiority.mentalModifier': 'Mental maneuver attack', 'superiority.mentalSaveDC': 'Mental maneuver DC',
  'weapon.toHit': 'All weapons: attack', 'weapon.damage': 'All weapons: damage',
  'unarmed.toHit': 'Unarmed: attack', 'unarmed.damage': 'Unarmed: damage', 'unarmed.damageDice': 'Unarmed: damage die',
  toHit: 'attack', damage: 'damage', damageDice: 'damage die',
};
/** "Charisma score", "Deception", "DEX saves", "AC"… for a tweak path. */
function fxTweakName(path) {
  let m;
  if ((m = /^abilityScores\.(\w+)\.score$/.exec(path))) return `${m[1]} score`;
  if ((m = /^abilityScores\.(\w+)\.savingThrowModifier$/.exec(path))) return `${m[1]} saving throw`;
  if ((m = /^abilityScores\.\w+\.skills\.(.+)$/.exec(path))) return m[1];
  return TWEAK_NAMES[path] || path;
}
/** "+1", "= 19", "Expertise", "d8" for a tweak value. */
function fxTweakValueText(v) {
  const parts = [];
  if (v.override != null && v.override !== '') parts.push(`= ${v.override}`);
  if (num0(v.bonus)) parts.push(signedLabel(num0(v.bonus)));
  if (v.proficiency) parts.push(String(v.proficiency));
  if (v.dieSize) parts.push(`d${v.dieSize}`);
  return parts.join(', ') || 'no change';
}

/** The label for turning an item's effect on: how it's "equipped" depends on what it is. */
function fxEquipLabel(item) {
  switch (item && item.type) {
    case 'CyberneticAugmentation': case 'DroidCustomization': case 'ItemModification': return 'Installed';
    case 'Focus': return 'Using as focus';
    default: return 'Equipped';
  }
}

/**
 * Concrete tweak bonuses for a list of active effects, in order: "set" becomes the bonus that
 * raises the score to N (if it's lower), "cap" limits a bonus so the score stays at or under it.
 * baseScores: { Strength: 15, … } before any effect. Weapon mods go to `weaponTweaks`
 * (equipment index -> tweaks) when the effect has a weapon target.
 * Conditional mods aren't applied: they're returned in `conds`, for showing as alternatives.
 * Returns { tweaks: [{ path, bonus, effect, mod }], weaponTweaks: [{ index, path, bonus, effect, mod }],
 *           conds: [{ path, bonus, cond, ammo, weaponIndex, effect, mod }], acAlternatives,
 *           dice: [{ dice, type, unarmed, weaponIndex, effect, mod }] (extra damage dice on every hit),
 *           twins: tweaks left out because the sheet applies what they were made for (fxTweakTwins) }.
 */
function fxResolve(effects, baseScores) {
  // fields (override, proficiency, dieSize) are set as they are; bonuses add up.
  const scores = { ...baseScores };
  let tweaks = [];
  const weaponTweaks = [];
  const conds = [];
  const dice = [];
  const later = [];
  const twins = fxTweakTwins(effects);
  const modOf = (a) => Math.floor(((Number(scores[a]) || 10) - 10) / 2);
  for (const eff of effects) {
    if (twins.some((t) => t.effect === eff)) continue;
    for (const mod of eff.mods || []) {
      if (mod.cond) {
        conds.push({ path: mod.path, bonus: mod.bonus, cond: mod.cond, ammo: mod.ammo || null,
          weaponIndex: eff.target === 'weapon' ? eff.weaponIndex : null, effect: eff, mod });
        continue;
      }
      // Extra damage dice on every hit: not a number the engine knows; the weapons table and the dice card add them.
      if (mod.dice) {
        if (eff.target !== 'weapon' || eff.weaponIndex != null) {
          dice.push({ dice: mod.dice, type: mod.type || '', unarmed: /^unarmed\./.test(mod.path), weaponIndex: eff.target === 'weapon' ? eff.weaponIndex : null, effect: eff, mod });
        }
        continue;
      }
      // Proficiency steps and half proficiency: once every other effect's proficiency is known (below).
      if (mod.profSteps || mod.halfProf) { later.push({ eff, mod }); continue; }
      const fields = mod.fields || null;
      // "You can't add more than +3 … from your Dexterity": what the modifier adds over the cap, taken off.
      const capped = mod.capAbility ? -Math.max(0, modOf(mod.capAbility) - Number(mod.capAt)) : null;
      // A weapon's effect can also change the character ("…, and a +2 bonus to damage rolls with force powers").
      if (eff.target === 'weapon' && /^weapon\./.test(mod.path)) {
        if (eff.weaponIndex == null) continue;
        // A weapon that gained finesse: the better modifier instead of the one it used (`swap`, set by itemEffects).
        const wb = capped != null ? capped : mod.swap ? Math.max(0, modOf(mod.swap.to) - modOf(mod.swap.from)) : mod.bonus || 0;
        if (mod.property && !wb) continue;
        weaponTweaks.push({ index: eff.weaponIndex, path: mod.path.replace(/^weapon\./, ''), bonus: wb, fields, effect: eff, mod });
        continue;
      }
      let bonus = capped != null ? capped : mod.bonus || 0;
      // "AC equals 10 + Dex + your Constitution modifier": the modifier as it stands after earlier effects
      // (a choice of abilities that isn't made yet uses the best of them; `lowest`: the other one, Bendu's "both").
      if (mod.abilityMod) bonus = (mod.lowest ? Math.min : Math.max)(...[].concat(mod.abilityMod).map((a) => Math.floor(((Number(scores[a]) || 10) - 10) / 2)));
      if (mod.abilityMod && mod.abilityHalf) bonus = Math.floor(bonus / 2); // "half your Charisma modifier\"
      if (mod.min != null) bonus = Math.max(bonus, mod.min); // "(minimum of +1)"
      // "Your Dexterity score is treated as 15" for AC and saves: what that modifier adds over the score's own.
      if (mod.scoreAs) bonus = Math.max(0, Math.floor((mod.scoreAs.score - 10) / 2) - modOf(mod.scoreAs.ability));
      // "Your base AC becomes 19": over SW5E's 10 + Dexterity.
      if (mod.acFlat != null) bonus = mod.acFlat - 10 - modOf('Dexterity');
      const ab = /^abilityScores\.(\w+)\.score$/.exec(mod.path);
      if (ab) {
        const cur = Number(scores[ab[1]]) || 0;
        if (fields && fields.override != null && fields.override !== '') scores[ab[1]] = Number(fields.override);
        else {
          // "Your Strength score becomes equal to your Intelligence score" (setFrom): the other score as it stands.
          const setTo = mod.setFrom ? Number(scores[mod.setFrom]) || 0 : mod.set;
          if (setTo != null) bonus = Math.max(0, setTo - cur);
          else if (mod.cap != null) bonus = Math.max(0, Math.min(bonus, mod.cap - cur));
          scores[ab[1]] = cur + bonus;
        }
      }
      // A cap that takes nothing off yet, or a fixed AC (a carapace's 17), is kept: the sheet works them out once it has the
      // final scores and AC without effects (viewer.js applyEffects).
      if (bonus || fields || mod.capAbility || mod.acFixed || mod.acSwap || mod.acFrom) tweaks.push({ path: mod.path, bonus, fields, effect: eff, mod });
    }
  }
  // The proficiency a skill or save has: SW5E's (`baseRank`, from the character's classes, background and tweaks) or
  // what an effect gives it. "Increases by two steps": from none to proficient, from proficient to mastery, which
  // counts as expertise (the highest the engine knows); "to trained" changes no number. Half proficiency only where
  // there's none.
  const rankAt = (path, base) => Math.max(fxProfRank(base), ...tweaks.filter((t) => t.path === path && t.fields && t.fields.proficiency).map((t) => fxProfRank(t.fields.proficiency)));
  for (const { eff, mod } of later.filter((x) => x.mod.profSteps)) {
    const from = [0, 2, 3][rankAt(mod.path, mod.baseRank)];
    const level = FX_PROF_LADDER[Math.min(FX_PROF_LADDER.length - 1, from + mod.profSteps)];
    if (FX_PROF_LADDER.indexOf(level) < 2) continue; // trained
    tweaks.push({ path: mod.path, bonus: 0, fields: { proficiency: level === 'proficient' ? 'Proficient' : 'Expertise' }, level, effect: eff, mod });
  }
  for (const { eff, mod } of later.filter((x) => x.mod.halfProf)) if (mod.bonus && !rankAt(mod.path, mod.baseRank)) tweaks.push({ path: mod.path, bonus: mod.bonus, fields: null, effect: eff, mod });
  // Alternative AC formulas (Unarmored Defense, subdermal armor, a species' hide…): only the best one applies; the
  // others are returned as acAlternatives (for saying which one was used).
  const formulas = tweaks.filter((t) => t.mod.acFormula);
  const best = formulas.reduce((a, b) => (!a || b.bonus > a.bonus ? b : a), null);
  // A base AC without Dexterity (Droid Dura Plating) leaves nothing for "your Dexterity is treated as 15" to raise.
  if (best && best.mod.acFlat != null) tweaks = tweaks.filter((t) => !(t.path === 'armorClass' && t.mod.scoreAs));
  return { tweaks: tweaks.filter((t) => !t.mod.acFormula || t === best), weaponTweaks, conds, acAlternatives: formulas.filter((t) => t !== best), twins, dice };
}

/**
 * Tweaks made for something the sheet now applies by itself: the tweak's reason names a feature, trait or item
 * whose effect changes the same number ("Zabrak Toughness: +1 HP per level (not applied by SW5E)" on the HP
 * maximum, where the Toughness trait now adds it; "Wookiee Hide (13 + Dex) is 1 better…" on AC). Applied too, the
 * number would count it twice, so such a tweak is left out unless the player keeps it (the tweak effect's `keep`).
 * Only bonuses add up: a proficiency or a value set ("= 15") is the same set twice. [{ effect, by: [effect] }].
 */
function fxTweakTwins(effects) {
  const words = (s) => String(s || '').toLowerCase().match(/[a-z']{4,}/g) || [];
  const out = [];
  for (const eff of effects) {
    const mod = eff.kind === 'tweak' && !eff.keep && eff.reason && eff.target !== 'weapon' ? (eff.mods || [])[0] : null;
    if (!mod || !Number(mod.bonus) || (mod.fields && mod.fields.override != null && mod.fields.override !== '')) continue;
    const said = new Set(words(eff.reason));
    const by = effects.filter((o, i) => o.kind !== 'tweak' && words(o.name).length && words(o.name).every((w) => said.has(w))
      && (o.mods || []).some((x) => x.path === mod.path && !x.cond && (Number(x.bonus) || x.acFormula || x.abilityMod || x.set != null))
      && effects.findIndex((y) => y.id === o.id) === i);
    if (by.length) out.push({ effect: eff, by });
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = { parseItemEffect, fxResolve, fxTweakTwins, fxSentences, fxEquipLabel, fxTweakLeaves, fxTweakActive, fxTweakName, fxTweakValueText, FX_SKILLS, fxBonusMods, fxCondMods, fxListMods };
}
