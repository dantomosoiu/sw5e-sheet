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
 *   mod = { path, bonus | set, cap?, label, cond?, ammo?, fields? }
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
const CONDITIONAL = /\b(?:against|that require|which require|when you|when the|if you|if the|once|until|for the next|melee tech|ranged tech|melee force|ranged force|melee attacks?\b|ranged attacks?\b|made with this enhanced (?!weapon\b)|fired by|grenades?|ammunition|cartridges?|cells?\b|darts?\b|rounds?\b|of powers)/i;
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
  } else if ((m = /^(attack and damage|attack|damage) rolls (?:made )?with (?:this|these) (?:enhanced )?(?:weapon|handwraps|gauntlets?|blade|saber|lightweapon|vibroweapon)s?$/.exec(p)) && ctx.weaponItem) {
    if (m[1] !== 'damage') add('weapon.toHit', 'Attack');
    if (m[1] !== 'attack') add('weapon.damage', 'Damage');
    ctx.target = 'weapon';
  } else if ((m = /^(attack and damage|attack|damage) rolls (?:made )?with your unarmed strikes$/.exec(p))) {
    if (m[1] !== 'damage') add('unarmed.toHit', 'Unarmed attack');
    if (m[1] !== 'attack') add('unarmed.damage', 'Unarmed damage');
  } else if ((m = /^attack rolls and deal an additional (\d+d\d+) (?:\w+ )?damage with (this enhanced weapon|your unarmed strikes)$/.exec(p)) && (m[2] !== 'this enhanced weapon' || ctx.weaponItem)) {
    if (m[2] === 'this enhanced weapon') { add('weapon.toHit', 'Attack'); ctx.target = 'weapon'; } else add('unarmed.toHit', 'Unarmed attack');
    ctx.notes.push(`Extra ${m[1]} damage on a hit with ${m[2] === 'this enhanced weapon' ? 'this weapon' : 'unarmed strikes'}.`);
  } else if ((m = /^damage rolls (?:made )?with weapons(?: and (force|tech) powers)?$/.exec(p))) {
    add('weapon.damage', 'Weapon damage');
    add('unarmed.damage', 'Unarmed damage');
    if (m[1]) ctx.notes.push(`${signedLabel(n)} to damage rolls with ${m[1]} powers.`);
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
    target: 'self',
    notes: [],
  };
  const mods = [];
  const notes = [];
  let duration = '';
  let group = null;
  let m;
  let options = false; // after "choose from the following": modes to pick from, not always on
  for (const raw of fxSentences(text)) {
    const s = raw.replace(ACTIVATION_CLAUSE, '');
    let used = false;
    if (options) { if (TRAIT.test(s)) notes.push(raw); continue; }
    if (/choose (?:one )?(?:from|of) the following/i.test(s)) {
      options = true;
      notes.push(raw);
      continue;
    }
    // Duration and "only one X at a time".
    if (!duration && (m = /(?:lasts? (?:for )?|for the next |for )(\d+|an?|one|ten) (round|minute|hour|day)s?\b/i.exec(s))) {
      const n = fxNum(m[1]);
      duration = `${n} ${m[2].toLowerCase()}${n === 1 ? '' : 's'}`;
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
      if ((m = /dealing an additional (\d+d\d+)/i.exec(s))) ctx.notes.push(`Extra ${m[1]} damage on a hit with that weapon.`);
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
    // Unarmored AC formula: "When you aren't wearing armor, your AC becomes 13 + your Dexterity modifier"
    // (SW5E's unarmored AC is 10 + Dexterity; only the best such formula counts, see fxResolve).
    if ((m = /\b(?:when|while) you (?:aren't|are not) wearing (?:any )?armor, your (?:AC|armor class) (?:becomes|equals|is) (\d+) \+ your Dexterity modifier/i.exec(s))) {
      mods.push({ path: 'armorClass', bonus: Number(m[1]) - 10, acFormula: true, when: { noArmor: true }, label: `AC ${m[1]} + DEX (no armor)` });
      used = true;
    }
    // Hit point maximum.
    if ((m = /(?:hit point maximum (?:increases|is increased)|(?:current and )?maximum hit points (?:increase|are increased)) by (\d+)\b(?! times| for each| per)/i.exec(s))) {
      mods.push({ path: 'hitPoints.maximum', bonus: Number(m[1]), label: `HP max +${m[1]}` });
      used = true;
    }
    // Tech/force point maximums.
    if ((m = /(?:maximum number of |number of )?(tech|force) points? (?:maximum )?(?:increases|is increased) by (\d+)/i.exec(s))) {
      mods.push({ path: `${m[1].toLowerCase()}Casting.maxPoints`, bonus: Number(m[2]), label: `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} points +${m[2]}` });
      used = true;
    }
    // "+N bonus to X" / "-N penalty to Y" (possibly both in one sentence).
    const clauses = [...s.matchAll(/([+\-−])(\d+) (bonus|penalty) to ([^.;]+?)(?=(?:,? and (?:a|an) [+\-−]\d+ (?:bonus|penalty))|[.;]|$)/gi)];
    // "a +1 bonus to attack rolls and a -1 penalty to damage rolls made with this weapon": the
    // ending ("made with this weapon") belongs to every clause.
    const ending = clauses.length > 1 && (/ rolls ((?:made )?with [^.;]+)$/i.exec(clauses[clauses.length - 1][4]) || [])[1];
    for (const cm of clauses) {
      const n = Number(cm[2]) * (cm[3].toLowerCase() === 'penalty' || cm[1] !== '+' ? -1 : 1);
      if (ending && /^(?:attack|damage|attack and damage) rolls$/i.test(cm[4].trim())) cm[4] = `${cm[4].trim()} ${ending}`;
      const phrase = cm[4].replace(/\s*\(.*$/, (x) => (/^\s*\((?:strength|dexterity|constitution|intelligence|wisdom|charisma)\)?/i.test(x) ? x : '')).trim();
      if (CONDITIONAL.test(phrase)) {
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
    if (!used && TRAIT.test(s)) notes.push(raw);
  }
  notes.push(...ctx.notes);
  // Ammunition's bonuses apply while it's carried (and fired); other consumables' when used.
  const activation = ctx.ammo ? 'carry' : isConsumable ? 'use' : item.requiresAttunement ? 'attune' : 'equip';
  if (!mods.length && !notes.length && !(isConsumable && duration)) return null;
  return {
    mods, notes, target: ctx.target, weaponKind: ctx.weaponKind || null, duration, group, activation,
    heals: /regains? [^.]*hit points|temporary hit points/i.test(text),
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
 *           twins: tweaks left out because the sheet applies what they were made for (fxTweakTwins) }.
 */
function fxResolve(effects, baseScores) {
  // fields (override, proficiency, dieSize) are set as they are; bonuses add up.
  const scores = { ...baseScores };
  const tweaks = [];
  const weaponTweaks = [];
  const conds = [];
  const twins = fxTweakTwins(effects);
  for (const eff of effects) {
    if (twins.some((t) => t.effect === eff)) continue;
    for (const mod of eff.mods || []) {
      if (mod.cond) {
        conds.push({ path: mod.path, bonus: mod.bonus, cond: mod.cond, ammo: mod.ammo || null,
          weaponIndex: eff.target === 'weapon' ? eff.weaponIndex : null, effect: eff, mod });
        continue;
      }
      const fields = mod.fields || null;
      // "You can't add more than +3 … from your Dexterity": what the modifier adds over the cap, taken off.
      const capped = mod.capAbility ? -Math.max(0, Math.floor(((Number(scores[mod.capAbility]) || 10) - 10) / 2) - Number(mod.capAt)) : null;
      if (eff.target === 'weapon') {
        if (eff.weaponIndex == null) continue;
        weaponTweaks.push({ index: eff.weaponIndex, path: mod.path.replace(/^weapon\./, ''), bonus: capped != null ? capped : mod.bonus || 0, fields, effect: eff, mod });
        continue;
      }
      let bonus = capped != null ? capped : mod.bonus || 0;
      // "AC equals 10 + Dex + your Constitution modifier": the modifier as it stands after earlier effects
      // (a choice of abilities that isn't made yet uses the best of them; `lowest`: the other one, Bendu's "both").
      if (mod.abilityMod) bonus = (mod.lowest ? Math.min : Math.max)(...[].concat(mod.abilityMod).map((a) => Math.floor(((Number(scores[a]) || 10) - 10) / 2)));
      if (mod.min != null) bonus = Math.max(bonus, mod.min); // "(minimum of +1)"
      const ab = /^abilityScores\.(\w+)\.score$/.exec(mod.path);
      if (ab) {
        const cur = Number(scores[ab[1]]) || 0;
        if (fields && fields.override != null && fields.override !== '') scores[ab[1]] = Number(fields.override);
        else {
          if (mod.set != null) bonus = Math.max(0, mod.set - cur);
          else if (mod.cap != null) bonus = Math.max(0, Math.min(bonus, mod.cap - cur));
          scores[ab[1]] = cur + bonus;
        }
      }
      // A cap that takes nothing off yet, or a fixed AC (a carapace's 17), is kept: the sheet works them out once it has the
      // final scores and AC without effects (viewer.js applyEffects).
      if (bonus || fields || mod.capAbility || mod.acFixed) tweaks.push({ path: mod.path, bonus, fields, effect: eff, mod });
    }
  }
  // Alternative AC formulas (Unarmored Defense, subdermal armor, a species' hide…): only the best one applies; the
  // others are returned as acAlternatives (for saying which one was used).
  const formulas = tweaks.filter((t) => t.mod.acFormula);
  const best = formulas.reduce((a, b) => (!a || b.bonus > a.bonus ? b : a), null);
  return { tweaks: tweaks.filter((t) => !t.mod.acFormula || t === best), weaponTweaks, conds, acAlternatives: formulas.filter((t) => t !== best), twins };
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
