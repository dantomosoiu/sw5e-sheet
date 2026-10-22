/* SW5E Character Sheet Viewer: rules used at the table — conditions on the character's own rolls and speed, damage
 * against resistances and immunities, the concentration save. Pure functions (no DOM); the viewer and the roller call them.
 */
'use strict';

const PL_DAMAGE_TYPES = ['acid', 'cold', 'energy', 'fire', 'force', 'ion', 'kinetic', 'lightning', 'necrotic', 'poison', 'psychic', 'sonic', 'true'];

// What each condition does to the character's own rolls (SW5E's Conditions): 'adv', 'dis' or 'fail' (automatically fails).
const PL_CONDITION_ROLLS = {
  Blinded: { attack: 'dis' },
  Frightened: { attack: 'dis', check: 'dis' },
  Poisoned: { attack: 'dis', check: 'dis' },
  Prone: { attack: 'dis' },
  Restrained: { attack: 'dis', 'save:Dexterity': 'dis' },
  Invisible: { attack: 'adv' },
  Paralyzed: { 'save:Strength': 'fail', 'save:Dexterity': 'fail' },
  Stunned: { 'save:Strength': 'fail', 'save:Dexterity': 'fail' },
  Unconscious: { 'save:Strength': 'fail', 'save:Dexterity': 'fail' },
  Petrified: { 'save:Strength': 'fail', 'save:Dexterity': 'fail' },
};
// Speed under a condition: a factor of the normal speed (0: can't move).
const PL_CONDITION_SPEED = { Grappled: 0, Restrained: 0, Paralyzed: 0, Stunned: 0, Unconscious: 0, Petrified: 0, Shocked: 0.5 };
// What a condition also notes that the sheet can't apply by itself (shown with it).
const PL_CONDITION_NOTES = {
  Frightened: 'while the source of its fear is in sight', Prone: 'melee attacks; ranged attacks against targets within 30 feet',
  Blinded: 'and fails ability checks that need sight',
};

/**
 * The kinds a roll spec counts as: ['attack'], ['check', 'check:Wisdom'], ['save', 'save:Dexterity'], ['save'] (a death
 * save). A check names its ability when the spec does (a skill's, initiative's Dexterity).
 */
function plRollKinds(spec) {
  const [k, a] = String(spec).split('|');
  if (['attack', 'tech', 'force', 'maneuver', 'pattack'].includes(k)) return ['attack'];
  if (['check', 'skill'].includes(k) && a) return ['check', `check:${a}`];
  if (k === 'init') return ['check', 'check:Dexterity'];
  if (['check', 'skill', 'tool'].includes(k)) return ['check'];
  if (k === 'save') return ['save', `save:${a}`];
  if (k === 'conc') return ['save', 'save:Constitution'];
  if (k === 'death') return ['save'];
  return [];
}

/**
 * Advantage, disadvantage and automatic failure for a roll from the character's conditions and exhaustion:
 * { adv: [why], dis: [why], fail: [why] } (exhaustion: checks from level 1, attacks and saves from 3).
 */
function plRollSources(spec, conditions, exhaustion) {
  const kinds = plRollKinds(spec);
  const out = { adv: [], dis: [], fail: [] };
  for (const c of conditions || []) {
    const eff = PL_CONDITION_ROLLS[c];
    if (!eff) continue;
    for (const k of kinds) if (eff[k]) out[eff[k]].push(c);
  }
  const exh = Number(exhaustion) || 0;
  if ((exh >= 1 && kinds.includes('check')) || (exh >= 3 && (kinds.includes('attack') || kinds.includes('save')))) out.dis.push(`exhaustion ${exh}`);
  return out;
}

/** Speed under conditions and exhaustion: { factor, why } (factor 1: unchanged). */
function plSpeed(conditions, exhaustion) {
  let factor = 1;
  const why = [];
  for (const c of conditions || []) if (PL_CONDITION_SPEED[c] != null && PL_CONDITION_SPEED[c] < factor) { factor = PL_CONDITION_SPEED[c]; why.push(c); }
  const exh = Number(exhaustion) || 0;
  if (exh >= 5) { factor = 0; why.push(`exhaustion ${exh}`); } else if (exh >= 2 && factor > 0.5) { factor = 0.5; why.push(`exhaustion ${exh}`); }
  return { factor, why };
}

/**
 * Damage after the character's defenses. `defenses`: [{ kind: 'resistance' | 'immunity' | 'vulnerability', text, from }]
 * as the sheet lists them ("Resistance to kinetic and energy damage"). Only defenses that name the type and add no
 * condition ("…from weapons", "…while raging" is already only listed while raging) apply; the others are mentioned.
 * Returns { amount, applied: [why], maybe: [text] }.
 */
function plDamageAfterDefenses(amount, type, defenses) {
  const t = String(type || '').toLowerCase();
  const out = { amount: Math.max(0, Math.floor(Number(amount) || 0)), applied: [], maybe: [] };
  if (!t || t === 'true') return out;
  let resist = null; let immune = null; let vuln = null;
  for (const d of defenses || []) {
    const m = /^(?:resistance|immun\w*|vulnerab\w*)\s+to\s+(.*?)\bdamage\b(.*)$/i.exec(d.text || '');
    if (!m || !new RegExp(`\\b${t}\\b`, 'i').test(m[1])) continue;
    const conditional = /^\s*(?:from|while|when|if|that|dealt|by|against|of)\b/i.test(m[2]) || /\b(?:chosen|that)\b/i.test(m[1]);
    if (conditional) { out.maybe.push(`${d.text} (${d.from})`); continue; }
    const why = `${d.from}`;
    if (/^immun/i.test(d.text)) immune = immune || why;
    else if (/^vulnerab/i.test(d.text)) vuln = vuln || why;
    else resist = resist || why;
  }
  if (immune) { out.amount = 0; out.applied.push(`immune (${immune})`); return out; }
  if (resist && !vuln) { out.amount = Math.floor(out.amount / 2); out.applied.push(`halved (${resist})`); }
  if (vuln && !resist) { out.amount *= 2; out.applied.push(`doubled (${vuln})`); }
  return out;
}

/** The DC of the Constitution save to keep concentrating after `damage`: 10 or half the damage, whichever is higher. */
const plConcentrationDc = (damage) => Math.max(10, Math.floor((Number(damage) || 0) / 2));

// ------------------------------------------------------------- powers
const PL_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4 };
/** How many of an at-will power's damage steps (5th, 11th, 17th character level) the character has reached. */
const plCantripSteps = (charLevel) => [5, 11, 17].filter((l) => Number(charLevel) >= l).length;
/**
 * The rolls a power's text describes, at `castLevel` for a character of `charLevel`:
 * [{ label, n, die, type, heal, reduce, mod }] ("take 1d6 force damage", "regains … 1d8 + your forcecasting ability
 * modifier", "reduced by 1d6"), with "increases by 1d8 for each slot level above 1st" and the at-will steps added.
 */
function plPowerRolls(p, castLevel, charLevel) {
  const d = String((p && p.description) || '').replace(/\s+/g, ' ');
  const base = Number(p && p.level) || 0;
  const lvl = Math.max(base, Number(castLevel) || base);
  const out = [];
  const modOf = (s) => /\+\s*your (?:force|tech)casting ability modifier/i.test(s);
  for (const m of d.matchAll(/\b(?:takes?|deals?|dealt|suffers?)\s+(?:an extra\s+|extra\s+|an additional\s+|additional\s+)?(\d+)d(\d+)((?:\s*\+\s*your (?:force|tech)casting ability modifier)?)\s+(acid|cold|energy|fire|force|ion|kinetic|lightning|necrotic|poison|psychic|sonic|true)\s+damage/gi)) {
    out.push({ label: `${m[4].toLowerCase()} damage`, n: Number(m[1]), die: Number(m[2]), type: m[4].toLowerCase(), mod: modOf(m[3]) });
  }
  const h = /\bregains?\s+(?:a number of\s+)?hit points equal to (\d+)d(\d+)((?:\s*\+\s*your (?:force|tech)casting ability modifier)?)/i.exec(d);
  if (h) out.push({ label: 'healing', n: Number(h[1]), die: Number(h[2]), heal: true, mod: modOf(h[3]) });
  const r = /\breduced by (\d+)d(\d+)/i.exec(d);
  if (r) out.push({ label: 'damage reduction', n: Number(r[1]), die: Number(r[2]), reduce: true, mod: false });
  if (!out.length) return out;
  // Higher-level casting: "the damage (healing) increases by 1d8 for each slot level above 1st".
  const up = /\b(damage|healing)[^.]*?increases by (\d+)d(\d+) for each (?:slot )?level above (\d+)/i.exec(d);
  if (up && lvl > Number(up[4])) {
    const g = out.find((x) => (up[1].toLowerCase() === 'healing' ? x.heal : !x.heal && !x.reduce) && x.die === Number(up[3])) || out.find((x) => (up[1].toLowerCase() === 'healing' ? x.heal : !x.heal));
    if (g) g.n += Number(up[2]) * (lvl - Number(up[4]));
  }
  // At-will powers: "This power's damage increases by 1d6 when you reach 5th, 11th, and 17th level" / "by one die".
  const step = plCantripSteps(charLevel);
  if (!base && step) {
    const c = /\bdamage increases by (one die|(\d+)d(\d+)) when you reach 5th/i.exec(d);
    if (c) for (const g of out.filter((x) => !x.heal && !x.reduce)) if (/one die/i.test(c[1]) || g.die === Number(c[3])) g.n += step * (c[2] ? Number(c[2]) : 1);
    // "At 5th level, … the power's damage increases to 2d4 kinetic damage. At 11th level, … 3d4…".
    if (!c) {
      for (const part of d.split(/(?=\bAt (?:5th|11th|17th) level\b)/)) {
        const at = /^At (\d+)th level/.exec(part);
        const to = at && Number(at[1]) <= Number(charLevel) && /\bdamage increases to (\d+)d(\d+)/i.exec(part);
        if (to) for (const g of out.filter((x) => !x.heal && !x.reduce && x.die === Number(to[2]))) g.n = Math.max(g.n, Number(to[1]));
      }
    }
  }
  return out;
}

/**
 * What a power does to whoever it's on, read from its text: { mods, defenses, riders, tempHp, notes, forTarget }.
 * mods: an unarmored AC formula ("your base AC becomes 13 + your Dexterity modifier"); defenses: resistances and
 * immunities; riders: dice added to rolls ("roll a d4 and add the number rolled to one ability check", "an extra 1d6
 * damage … whenever you hit it with a weapon attack"), `once` when "the power then ends"; tempHp: "temporary hit
 * points equal to your forcecasting ability modifier at the start of each of its turns". forTarget: the benefits go to
 * the creature it's cast on ("the creature", "the target") rather than to the caster.
 */
function plPowerEffect(p, charLevel) {
  const d = String((p && p.description) || '').replace(/\s+/g, ' ').replace(/\*\*\*[^*]+\*\*\*.*$/, '');
  const out = { mods: [], defenses: [], riders: [], tempHp: null, notes: [], forTarget: false };
  let m;
  if ((m = /\byour base AC becomes (\d+) \+ your Dexterity modifier/i.exec(d))) {
    out.mods.push({ path: 'armorClass', bonus: Number(m[1]) - 10, acFormula: true, when: { noArmor: true }, label: `AC ${m[1]} + DEX (no armor)` });
  }
  for (const r of d.matchAll(/\b(?:you|the (?:creature|target)) (?:has|have|gains?) resistance (?:to|against) ([^.]*?damage(?: [^.]*?)?)(?=\.|,? and\b|$)/gi)) out.defenses.push({ kind: 'resistance', text: `Resistance to ${r[1]}` });
  for (const r of d.matchAll(/\bis immune to (being (?:charmed|frightened|poisoned|paralyzed|stunned|blinded|deafened)|(?:acid|cold|energy|fire|force|ion|kinetic|lightning|necrotic|poison|psychic|sonic) damage)/gi)) out.defenses.push({ kind: 'immunity', text: `Immune to ${r[1]}` });
  // Dice added to rolls.
  const dieAt = (die) => {
    const up = /die increases[^.]*?to a d(\d+) at 5th level, a d(\d+) at 11th level, and a d(\d+) at 17th level/i.exec(d);
    const s = plCantripSteps(charLevel);
    return up && s ? Number(up[s]) : die;
  };
  for (const r of d.matchAll(/\broll a d(\d+) and add the number rolled to (?:one |the |an )?(ability check|attack roll|saving throw)s?(?: of its choice)?(?: or (?:a |the )?(saving throw|attack roll|ability check)s?)?/gi)) {
    const on = [r[2], r[3]].filter(Boolean).map((x) => (/check/i.test(x) ? 'check' : /attack/i.test(x) ? 'attack' : 'save'));
    out.riders.push({ on, dice: `1d${dieAt(Number(r[1]))}`, once: /\bonce before the power ends\b|\bthe power then ends\b/i.test(d) });
  }
  if ((m = /\bextra (\d+d\d+) damage to the target whenever you hit it with a weapon attack/i.exec(d))) out.riders.push({ on: ['weapon-damage'], dice: m[1], once: false });
  if ((m = /\btemporary hit points equal to your (?:force|tech)casting ability modifier at the start of each of its turns/i.exec(d))) out.tempHp = { each: 'turn' };
  if (/\bimmune to being frightened\b/i.test(d) && !out.defenses.length) out.defenses.push({ kind: 'immunity', text: 'Immune to being frightened' });
  out.forTarget = /\b(?:the (?:creature|target) (?:is|gains|can|has)|a willing creature you touch|you touch one willing creature)\b/i.test(d) && !/\byou (?:deal|have|gain)\b/i.test(d);
  return out;
}

/** A casting option's extra points: "spend 2 additional force points" → 2; Twinned: the power's level (1 at will). */
function plCastingOptionCost(text, powerLevel) {
  const t = String(text || '');
  if (/additional (?:force|tech) points equal to the power's level/i.test(t)) return Math.max(1, Number(powerLevel) || 0);
  const m = /\b(?:spend|expend) (\w+) additional (?:force|tech) points?/i.exec(t) || /\bspend (\w+) (?:force|tech) points?/i.exec(t);
  return m ? (PL_NUM[m[1].toLowerCase()] || Number(m[1]) || 0) : 0;
}

// ------------------------------------------------------------- class features in play
/**
 * A feature's fixed amount: "takes necrotic damage equal to your guardian level + your Charisma modifier (minimum of
 * +1)", "regains hit points equal to your guardian level + your Wisdom modifier". levels: { guardian: 4 }, mods:
 * { Charisma: 2 }. Returns { amount, heal, type } or null.
 */
function plFixedAmount(text, levels, mods) {
  const t = String(text || '').replace(/\s+/g, ' ');
  const m = /\b(?:takes? (\w+) damage|regains? hit points) equal to your (\w+) level \+ your (\w+) modifier( \(minimum of \+1\))?/i.exec(t);
  if (!m) return null;
  const lvl = Number((levels || {})[m[2].toLowerCase()]) || 0;
  const mod = Number((mods || {})[m[3]]) || 0;
  return { amount: lvl + (m[4] ? Math.max(1, mod) : mod), heal: !m[1], type: m[1] ? m[1].toLowerCase() : '' };
}

/**
 * "You can use your bonus action to mark a target…" (fighting styles): { duration, text } for the mark, or null.
 */
function plMark(text) {
  const t = String(text || '').replace(/\s+/g, ' ');
  const i = t.search(/\buse your bonus action to mark a target\b/i);
  if (i < 0) return null;
  const from = t.lastIndexOf('- ', i) > t.lastIndexOf('. ', i) ? t.lastIndexOf('- ', i) + 2 : Math.max(0, t.lastIndexOf('. ', i) + 2);
  const end = t.indexOf(' - ', i);
  const body = t.slice(from, end > 0 ? end : undefined).trim();
  const until = /until the (start|end) of your next turn/i.exec(body);
  const before = /before the (start|end) of your next turn/i.exec(body);
  const w = until || before;
  return { duration: w ? `until the ${w[1].toLowerCase()} of your next turn` : 'until your next turn', text: body };
}

if (typeof module !== 'undefined') {
  module.exports = { PL_DAMAGE_TYPES, PL_CONDITION_ROLLS, PL_CONDITION_SPEED, PL_CONDITION_NOTES, plRollKinds, plRollSources, plSpeed, plDamageAfterDefenses, plConcentrationDc,
    plCantripSteps, plPowerRolls, plPowerEffect, plCastingOptionCost, plFixedAmount, plMark };
}
