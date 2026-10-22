/* SW5E Character Sheet Viewer: dice roller.
 *
 * Any number marked rollable on the sheet (data-roll="kind|args", see rollable()) opens a roll
 * card in the dice dock: choose advantage/disadvantage, conditional bonuses ("vs melee", "with
 * Cryo Cell"), extra dice and a modifier, then roll. After rolling, all of that can still be
 * changed: dice already rolled keep their numbers, only added dice are rolled. Weapon attacks
 * offer their damage roll (doubled dice on a critical) straight from the result.
 *
 * A roll: { id, char, label, kind: 'd20' | 'dice', rolled, at, mode: 'normal' | 'adv' | 'dis',
 *   dice: [{ id, sides, value, tag, crit?, max? }]   tag: 'd20' | 'base' | 'extra' | 'cond:<label>';
 *                                     crit: the critical hit's extra set; max: counted at its maximum
 *   base: [{ label, value }]            the stat's own modifier(s)
 *   conds: [{ label, bonus, extra: ['1d8'], on }]
 *   custom, next?: { spec, crit }       custom: extra modifier; next: the follow-up (damage) }
 * Uses the viewer's globals (state, buildModel, esc, signed…) at call time; load before viewer.js.
 */
'use strict';

const ROLL_LOG_KEY = 'rolls';
const ROLL_LOG_MAX = 40; // per character (and as many free rolls)
// Critical damage: 'double' rolls the damage dice twice; 'max' counts one set at its maximum and
// rolls the other. Kept until changed (platform.storage, all characters).
const ROLL_SETTINGS_KEY = 'rollSettings';
const rollSettings = { critMode: 'double' };
const DIE_SIDES = [4, 6, 8, 10, 12, 20];
const rollState = { current: null, log: [], open: false, min: false };
let dieSeq = 0;

/** A fair die roll (rejection sampling over crypto random numbers). */
function rollDie(sides) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / sides) * sides;
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return 1 + (buf[0] % sides);
}
const newDie = (sides, tag, rolled) => ({ id: ++dieSeq, sides, tag, value: rolled ? rollDie(sides) : null });
/** A critical hit's extra die: at its maximum ('max' mode) or rolled like the others ('double'). */
const critDie = (sides, tag, rolled) => (rollSettings.critMode === 'max'
  ? { id: ++dieSeq, sides, tag, value: sides, crit: true, max: true }
  : { ...newDie(sides, tag, rolled), crit: true });
/** A condition's extra dice ("+1d8"), doubled on a critical. */
function condDice(roll, cd) {
  const out = [];
  for (const e of cd.extra) {
    for (const d of (parseDice(e) || { dice: [] }).dice) {
      out.push(newDie(d.sides, `cond:${cd.label}`, roll.rolled));
      if (roll.crit) out.push(critDie(d.sides, `cond:${cd.label}`, roll.rolled));
    }
  }
  return out;
}
/**
 * Class resources a roll can spend, offered unticked; ticking one spends it when the roll is made (or right away on a
 * roll already made), unticking gives it back: maneuvers that add the superiority die to an attack or its damage
 * (a superiority die), Force-Empowered Strikes on melee damage (1d8 per force point, up to the Focused Strikes column),
 * Close Call on an attack with the modified weapon (a Potent Aptitude use and its die).
 */
function resourceConds(m, kind, w) {
  if (!m.t) return [];
  const out = [];
  const t = m.t;
  const supLeft = t.lim.supMax - num(t.s.superiorityDiceUsed);
  if (supLeft > 0 && t.lim.supSize) {
    for (const n of arr(m.maneuverNames)) {
      const mv = rulesManeuver(n);
      const d = String((mv && mv.description) || '');
      const fits = kind === 'attack' ? /expend (?:one|a) superiority die to add it to the (?:attack )?roll/i.test(d) : /add the superiority die to the (?:attack's )?damage roll/i.test(d);
      if (fits) out.push({ label: `${n} +${t.lim.supSize}`, bonus: 0, extra: [`1${t.lim.supSize}`], on: false, spend: { op: 'sup', arg: '1', what: 'a superiority die' } });
    }
  }
  const melee = w && !/blaster/i.test(w.weaponClassification || '') && !/ranged/i.test(propsText(w.properties));
  if (kind === 'damage' && melee && arr(m.allFeatures).some((f) => /^Force-Empowered Strikes$/i.test(f.name))) {
    const col = arr(m.classDice).find((d) => /focused strikes/i.test(d.column));
    const max = col ? num(String(col.dice).split('d')[0]) || 1 : 1;
    const left = t.lim.force - num(t.s.forcePointsUsed);
    for (let n = 1; n <= Math.min(max, left); n++) out.push({ label: `Force-Empowered Strikes +${n}d8`, bonus: 0, extra: [`${n}d8`], on: false, group: 'fes', spend: { op: 'force', arg: String(n), what: `${n} force point${n > 1 ? 's' : ''}` } });
  }
  if (kind === 'attack' && w) {
    const cc = arr(m.allFeatures).find((f) => /^Close Call$/i.test(f.name));
    const modified = arr(m.raw && m.raw.classes).flatMap((k) => arr(k.modifiedItems)).filter(Boolean);
    const die = arr(m.classDice).find((d) => /potent aptitude/i.test(d.column));
    const use = t.lim.features.find((f) => /^Potent Aptitude$/i.test(f.name));
    if (cc && die && use && modified.includes(w.name) && num(t.s.featuresTimesUsed[use.name]) < use.maximum) {
      out.push({ label: `Close Call +${die.dice} (after a miss)`, bonus: 0, extra: [die.dice], on: false, spend: { op: 'feat', arg: `${use.name}|1`, what: 'a use of Potent Aptitude' } });
    }
  }
  return out;
}
/** "base 7 vs 4": the two sets of a damage roll with advantage. */
function set2Text(r) {
  const s = (tag) => r.dice.filter((d) => d.tag === tag).reduce((t, d) => t + (d.sign || 1) * num(d.value), 0);
  return `sets ${s('base')} and ${s('adv')}: the higher counts`;
}

// ------------------------------------------------------------- Force Visions: foretelling rolls
/** The character's foretelling numbers (Force Visions), kept with its play state in this browser. */
const foretold = () => arr(state.itemState[state.current] && state.itemState[state.current].foretell);
const hasForesight = (m) => arr(m.allFeatures).some((f) => /roll two d20s and record the numbers rolled/i.test(f.text || f.description || ''));
function foretellButtons(r) {
  if (r.kind !== 'd20' || r.rolled || r.key !== state.current || !foretold().length) return '';
  return `<div class="rl-next"><span class="faint">Force Visions:</span> ${foretold().map((n, i) => `<button class="btn sm" data-rl="foretell" data-arg="${i}" title="Replace this roll with a foretelling roll (before rolling, once per turn)">Use ${n}</button>`).join('')}</div>`;
}
async function useForetold(i) {
  const r = rollState.current;
  const nums = foretold();
  if (!r || r.rolled || nums[i] == null) return;
  const n = nums[i];
  r.dice = r.dice.filter((d) => d.tag !== 'd20').concat([]);
  r.dice.unshift({ ...newDie(20, 'd20', false), value: n });
  r.mode = 'normal';
  r.preset = `Foretold ${n} (Force Visions)`;
  const st = itemStateOf(state.current);
  st.foretell = nums.filter((_, j) => j !== i);
  await saveItemStateFor(state.current, st);
  doRoll();
  refreshTracked(['tracker']);
}

/** Spend (or give back) what a ticked option costs. */
function spendCond(cd, back) {
  if (!cd.spend || !!cd.spent === !back) return;
  cd.spent = !back;
  const [a, b] = String(cd.spend.arg).split('|');
  const arg = cd.spend.op === 'feat' ? `${a}|${back ? -num(b) : num(b)}` : String(back ? -num(cd.spend.arg) : num(cd.spend.arg));
  trackerAction(cd.spend.op, arg).then(() => setStatus(`${cd.label.replace(/ \+.*$/, '')}: ${back ? 'gave back' : 'spent'} ${cd.spend.what}.`));
}

/** "2d6" → [{ sides: 6 } ×2]; "+3" → 3. */
function parseDice(expr) {
  const dice = [];
  let mod = 0;
  const s = String(expr).replace(/\s+/g, '').replace(/−/g, '-');
  if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i.test(s)) return null;
  for (const t of s.match(/[+-]?(\d*d\d+|\d+)/gi)) {
    const sign = t.startsWith('-') ? -1 : 1;
    const body = t.replace(/^[+-]/, '');
    const m = /^(\d*)d(\d+)$/i.exec(body);
    if (m) for (let i = 0; i < (Number(m[1]) || 1); i++) dice.push({ sides: Number(m[2]), sign });
    else mod += sign * Number(body);
  }
  return { dice, mod };
}

// ------------------------------------------------------------- what a roll is for
/**
 * A roll for spec "kind|args" on the current character's model `m`:
 *   check|Ability, save|Ability, skill|Ability|i, init, tool|name|level, attack|i, damage|i[|crit],
 *   tech, force|light, pattack|Power|bonus, maneuver|Kind|Ability, supdie, hitdie|d8, death, dice|2d6+3,
 *   itemheal|count|Item (a medpac or repair kit: dice the size of your Hit Die + Constitution modifier, at least 1)
 */
function buildRoll(m, spec, opts = {}) {
  const [kind, a1, a2, a3, a4, a5] = spec.split('|');
  const c = m.c || {};
  const sc = c.abilityScores || {};
  const pb = num(c.proficiencyBonus);
  const condsAt = (path) => arr(m.alts && m.alts[path]).map((a) => ({ label: a.cond, bonus: a.bonus, extra: a.extra.slice(), on: false }));
  const d20 = (label, value, path, extra = {}) => ({ kind: 'd20', label, base: [{ label: 'modifier', value }], conds: path ? condsAt(path) : [], spec, ...extra });
  switch (kind) {
    case 'check': {
      const r = d20(`${a1} check`, num((sc[a1] || {}).modifier), `abilityScores.${a1}.modifier`);
      // Led by the Force: half proficiency on checks that don't include it.
      const half = arr(m.effects).find((e) => e.halfProf);
      if (half && Math.floor(pb / 2)) r.base.push({ label: `half proficiency (${half.name})`, value: Math.floor(pb / 2) });
      return r;
    }
    case 'save': return d20(`${a1} saving throw`, num(((sc[a1] || {}).savingThrow || {}).modifier), `abilityScores.${a1}.savingThrow.modifier`);
    case 'skill': {
      const k = arr((sc[a1] || {}).skills)[a2] || {};
      const r = d20(`${k.name} (${ABBR[a1]})`, num(k.modifier), `abilityScores.${a1}.skills.${a2}.modifier`);
      // "Whenever you make a Charisma (Persuasion) check related to conducting business, you are considered to have
      // expertise in the Persuasion skill" (Mercantile).
      for (const f of arr(m.allFeatures).concat(typeof bdSpeciesTraitFeatures === 'function' && m.raw ? bdSpeciesTraitFeatures(m) : [])) {
        const x = new RegExp(`check related to ([^,.]+), you are considered to have expertise in the ${k.name} skill`, 'i').exec(f.text || f.description || '');
        if (x && k.proficiency !== 'expertise' && !r.conds.some((c) => c.label.endsWith(`(${f.name})`))) r.conds.push({ label: `${x[1].replace(/^conducting /i, '')} (${f.name})`, bonus: k.proficiency === 'proficient' ? pb : 2 * pb, extra: [], on: false });
      }
      return r;
    }
    case 'init': return d20('Initiative', num(c.initiative), 'initiative');
    case 'tool': {
      const level = a2 || 'proficient';
      const ability = opts.ability || a3 || 'Intelligence';
      const mult = /expert/i.test(level) ? 2 : /half/i.test(level) ? 0.5 : 1;
      const r = d20(`${a1} check`, 0, null, { toolAbility: ability });
      r.base = [{ label: `${ABBR[ability]} modifier`, value: num((sc[ability] || {}).modifier) }, { label: `proficiency${mult === 2 ? ' ×2' : ''}`, value: Math.floor(pb * mult) }];
      return r;
    }
    case 'attack': {
      const w = arr(c.weapons)[a1] || {};
      // Improved Critical and the like: a critical hit on 19–20 (or lower).
      // Increases add up (Improved Critical +1 and Blade Supremacy +1: 18–20); weapon supremacy and modifications
      // widen it only for their weapons.
      const seen = new Set();
      const wider = arr(m.effects).filter((e) => num(e.critRange) > 0 && (!e.critWeapons || e.critWeapons.includes(w.index)) && !seen.has(e.id) && seen.add(e.id));
      const add = wider.reduce((t, e) => t + num(e.critRange), 0);
      const vers = /\bversatile \((\d*d\d+)\)/i.exec(propsText(w.properties));
      const atk = d20(`${w.name} attack`, num(w.attackBonus), `weapons.${a1}.attackBonus`, {
        next: { spec: `damage|${a1}`, two: vers ? vers[1].replace(/^d/, '1d') : null }, critMin: Math.max(2, 20 - add), critFrom: wider.map((e) => e.name).join(' + '),
      });
      atk.conds.push(...resourceConds(m, 'attack', w));
      // A two-handed weapon with a shield equipped (W-149): say so before the roll.
      const hc = typeof handsConflict === 'function' && m.raw ? handsConflict(m.raw) : null;
      const ent = w.index >= 0 ? arr(m.raw && m.raw.equipment)[w.index] : null;
      if (hc && ent && hc.weapons.includes(ent.label || ent.name)) atk.warn = handsWarning(hc);
      return atk;
    }
    case 'damage': { // damage|weapon|crit?|two? (two: the versatile weapon held in two hands)
      const w = arr(c.weapons)[a1] || {};
      const vers = a3 === 'two' && /\bversatile \((\d*)d(\d+)\)/i.exec(propsText(w.properties));
      const n = vers ? (num(vers[1]) || 1) : num(w.damageNumberOfDice);
      const die = vers ? num(vers[2]) : num(w.damageDieType);
      const crit = a2 === 'crit';
      // Class damage riders the player decides on (off by default): Sneak Attack dice, Rage Damage.
      // Rage Damage while raging is already in the weapon's numbers once SW5E has recalculated with the rage;
      // until then it's ticked here (melee Strength weapons only, as the rage applies it).
      const raging = m.snap && tempEffects(m.snap.key).some((e) => e.group === 'state:raging');
      const meleeStr = w.ability === 'Strength' && !/ranged/i.test(`${w.weaponClassification || ''} ${propsText(w.properties)}`);
      const riders = arr(m.classDice).filter((d) => d.rider || /sneak attack/i.test(d.column) || (d.bonus && /rage damage/i.test(d.column)))
        .filter((d) => !(raging && !m.stale && /rage damage/i.test(d.column)))
        .map((d) => ({ label: d.column, bonus: d.bonus || 0, extra: d.dice ? [d.dice] : [], on: !!(raging && m.stale && meleeStr && /rage damage/i.test(d.column)) }));
      const conds = condsAt(`weapons.${a1}.damageBonus`).concat(riders, resourceConds(m, 'damage', w));
      // Weapon Expert: "once per turn when you would roll weapon damage using a blaster, you can choose to have advantage".
      const we = arr(m.feats).concat(arr(m.allFeatures)).find((f) => /when you would roll weapon damage using an? (blaster|lightweapon|vibroweapon)s?, you can choose to have advantage/i.test(f.text || f.description || ''));
      const weKinds = we ? [...String(we.text || we.description).matchAll(/roll weapon damage using an? (blaster|lightweapon|vibroweapon)/gi)].map((x) => x[1].toLowerCase()) : [];
      const dmgAdv = weKinds.some((k) => new RegExp(k, 'i').test(w.weaponClassification || '')) ? we.name : '';
      return {
        kind: 'dice', label: `${w.name} damage${vers ? ' (two-handed)' : ''}${crit ? ' (critical)' : ''}`, spec, crit,
        diceSpec: die > 0 ? Array.from({ length: n }, () => die) : [],
        // The bonus by source ("+4 STR modifier + 2 Rage"). A weapon without dice deals its damage bonus alone: the
        // unarmed strike's "1 + your Strength modifier" is already in it (as the weapons table shows it).
        base: typeof damageParts === 'function' ? damageParts(m, w) : [{ label: 'damage bonus', value: num(w.damageBonus) + num(w.damageDieModifier) }],
        conds,
        damageType: w.damageType && w.damageType !== 'Unknown' ? w.damageType : '',
        minTotal: 0, // a penalty can't make damage negative
        dmgAdv,
        // What the weapon's modifications do when it deals damage (Celerity Oscillator).
        notes: typeof modHitNotes === 'function' ? modHitNotes(m, w) : [],
      };
    }
    case 'tech': {
      const t = c.techCasting || {};
      return d20('Tech attack', num(t.attackModifier), 'techCasting.attackModifier');
    }
    case 'force': {
      const f = c.forceCasting || {};
      return d20(`${titleCase(a1)} force attack`, num(f[`${a1}AttackModifier`]), `forceCasting.${a1}AttackModifier`);
    }
    case 'maneuver': { // maneuver|Physical|Strength: with a superiority tweak to that kind's modifier
      const tw = (typeof supTweaks === 'function' ? supTweaks(m) : {})[`${String(a1).toLowerCase()}Modifier`] || {};
      return d20(`${a1} maneuver attack`, pb + engTweaked(num((sc[a2] || {}).modifier), tw), null);
    }
    case 'pattack': return d20(`${a1} attack`, num(a2), null); // a power cast without SW5E's casting numbers
    case 'supdie': {
      const size = num(String(a1 || (m.t && m.t.lim.supSize) || '').replace(/\D/g, ''));
      return { kind: 'dice', label: 'Superiority die', spec, diceSpec: size ? [size] : [], base: [], conds: [] };
    }
    case 'hitdie': {
      const size = num(String(a1).replace(/\D/g, ''));
      return { kind: 'dice', label: `Hit die (${a1})`, spec, diceSpec: [size], base: [{ label: 'per die', value: num(m.t && m.t.lim.hitDieBonus) }], conds: [] };
    }
    case 'death': return { kind: 'd20', label: 'Death saving throw', spec, base: [], conds: [] };
    case 'pdmg': { // pdmg|force|Heal|2|0|Wisdom: a power's roll (damage, healing, reduction) at a level, with its casting ability
      const p = rulesPower(a2);
      const g = p && plPowerRolls(p, num(a3), charLevel(m))[num(a4)];
      if (!g) return null;
      // The casting ability the power's card used (a roll from before it was in the spec: SW5E's for the power).
      const ability = ABBR[a5] ? a5 : powerNumbers(m, a1, p, {}).ability;
      return {
        kind: 'dice', label: `${p.name}: ${g.label}${num(a3) > num(p.level) ? ` (${ordinal(num(a3))} level)` : ''}`, spec, diceSpec: Array.from({ length: g.n }, () => g.die),
        base: powerRollParts(m, a1, p, g, ability), conds: powerRollConds(m, a1, g), damageType: g.type || '', minTotal: 0, heal: !!g.heal,
      };
    }
    case 'conc': { // conc|DC: the Constitution save to keep concentrating after damage
      const r = d20(`Concentration save (DC ${num(a1)})`, num(((sc.Constitution || {}).savingThrow || {}).modifier), 'abilityScores.Constitution.savingThrow.modifier', { dc: num(a1) });
      // War Caster: "advantage on Constitution saving throws that you make to maintain your concentration".
      const wc = arr(m.allFeatures).find((f) => /advantage on Constitution saving throws (?:that )?you make to maintain (?:your )?concentration/i.test(f.text || f.description || ''));
      if (wc) r.advFrom = wc.name;
      return r;
    }
    case 'itemheal': {
      const size = mainHitDie(m);
      return { kind: 'dice', label: `${a2 || 'Healing'}: healing`, spec, diceSpec: size ? Array.from({ length: Math.max(1, num(a1)) }, () => size) : [],
        base: [{ label: 'Constitution modifier', value: num((sc.Constitution || {}).modifier) }], conds: [], minTotal: 1 };
    }
    case 'featheal': { // featheal|Second Wind|1d10|3|Fighter level: a feature that heals when used
      const p = parseDice(a2);
      if (!p) return null;
      return { kind: 'dice', label: `${a1}: healing`, spec, diceSpec: p.dice.map((d) => d.sides * d.sign), base: [{ label: a4 || 'level', value: num(a3) }], conds: [] };
    }
    case 'dice': {
      const p = parseDice(a1);
      if (!p) return null;
      return { kind: 'dice', label: a1, spec, diceSpec: p.dice.map((d) => d.sides * d.sign), base: p.mod ? [{ label: 'modifier', value: p.mod }] : [], conds: [] };
    }
    default: return null;
  }
}

/** The Hit Die size a character has the most of (8 for 3d8 + 2d10; a tie: the larger), as a medpac says. */
function mainHitDie(m) {
  const hp = (m.c || {}).hitPoints || {};
  const dice = arr(m.t ? m.t.lim.hitDice : hp.hitDice).map((d) => ({ sides: num(String(d.size).replace(/\D/g, '')), n: num(d.maximum) }));
  dice.sort((a, b) => b.n - a.n || b.sides - a.sides);
  return dice.length ? dice[0].sides : 0;
}

/** A new roll card (not rolled yet) for a spec. */
function startRoll(spec, opts = {}) {
  const snap = state.snapshots[state.current];
  const m = snap ? buildModel(snap) : { c: {}, alts: {} };
  const r = buildRoll(m, spec, opts);
  if (!r) return setStatus(`Can't roll "${spec.split('|').slice(1).join(' ')}".`, 'error');
  const roll = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), char: snap ? snap.raw.name : '', key: snap ? snap.key : null,
    mode: 'normal', custom: 0, rolled: false, at: null, ...r,
    dice: r.kind === 'd20' ? [newDie(20, 'd20', false)] : arr(r.diceSpec).map((s) => ({ ...newDie(Math.abs(s), 'base', false), sign: s < 0 ? -1 : 1 })),
  };
  if (roll.crit) roll.dice = roll.dice.concat(roll.dice.map((d) => critDie(d.sides, d.tag, false)));
  delete roll.diceSpec;
  // Advantage from features (Feral Impulse: initiative) and active states (Rage: Strength checks
  // and saves), unless chosen otherwise.
  // Advantage from features (Feral Impulse: initiative), active states (Rage: Strength checks and saves) and War Caster;
  // disadvantage from conditions (Poisoned…) and exhaustion; automatic failure (Stunned: Strength and Dexterity
  // saves). Advantage and disadvantage cancel out. Unless chosen otherwise.
  if (!opts.mode && snap && roll.kind === 'd20') {
    const [kind, ab, i] = spec.split('|');
    const skill = kind === 'skill' ? (arr(((m.c.abilityScores || {})[ab] || {}).skills)[i] || {}).name : null;
    const fits = (a) => (kind === 'save' ? a.kind === 'save' && a.ability === ab
      : kind === 'check' ? a.kind === 'check' && a.ability === ab
        : kind === 'skill' ? (a.kind === 'check' && a.ability === ab) || (a.kind === 'skill' && a.skill === skill)
          : kind === 'init' ? a.kind === 'init' || (a.kind === 'check' && a.ability === 'Dexterity')
            : kind === 'attack' ? a.kind === 'attack' && (() => {
              const w = arr(m.c.weapons)[ab] || {};
              const melee = !/blaster/i.test(w.weaponClassification || '') && !/\branged\b/i.test(propsText(w.properties));
              return (!a.melee || melee) && (!a.ability || w.ability === a.ability);
            })() : false);
    const adv = arr(m.effects).filter((e) => arr(e.advantage).some(fits)).map((e) => e.name).slice(0, 1);
    if (roll.advFrom) adv.push(roll.advFrom);
    const src = m.t ? plRollSources(spec, m.t.s.conditions, m.t.s.exhaustion) : { adv: [], dis: [], fail: [] };
    adv.push(...src.adv);
    const dis = src.dis;
    // Armor that's hard to sneak in (Bulky, Obtrusive): disadvantage on Stealth.
    if (skill === 'Stealth' && typeof armorEffectsOf === 'function') dis.push(...armorEffectsOf(m).stealth);
    if (adv.length || dis.length) {
      opts.mode = adv.length && dis.length ? 'normal' : adv.length ? 'adv' : 'dis';
      roll.preset = [adv.length ? `Advantage from ${adv.join(', ')}` : '', dis.length ? `${adv.length ? 'd' : 'D'}isadvantage from ${dis.join(', ')}` : ''].filter(Boolean).join('; ')
        + (adv.length && dis.length ? ': they cancel out' : '');
    }
    if (src.fail.length) roll.autoFail = src.fail.join(', ');
  }
  // Dice that active powers add (Guidance on a check, Battle Meditation on attacks and saves, Target Lock on weapon
  // damage): ticked; one that's used once (Guidance) ends its power when the roll is made with it.
  if (snap && (roll.kind === 'd20' || /^damage\|/.test(spec))) {
    const kinds = /^damage\|/.test(spec) ? ['weapon-damage'] : plRollKinds(spec);
    for (const e of tempEffects(snap.key)) {
      for (const rd of arr(e.riders)) {
        if (!rd.on.some((o) => kinds.includes(o))) continue;
        const label = `${String(e.power || e.name).replace(/ \(concentration\)$/, '')} +${rd.dice}`;
        if (roll.conds.some((c) => c.label === label)) continue;
        roll.conds.push({ label, bonus: 0, extra: [rd.dice], on: false, consume: rd.once ? e.id : null });
        opts.conds = arr(opts.conds).concat(label);
      }
    }
  }
  for (const cd of roll.conds) {
    if (!opts.conds || !opts.conds.includes(cd.label)) continue;
    cd.on = true;
    roll.dice.push(...condDice(roll, cd));
  }
  // "…if you have advantage on the attack roll" / not with disadvantage: Sneak Attack after an attack rolled with disadvantage.
  if (opts.attackMode === 'dis') for (const cd of roll.conds) if (/sneak attack/i.test(cd.label)) cd.blocked = 'not after an attack rolled with disadvantage';
  if (opts.mode) roll.mode = opts.mode;
  if (opts.mode && opts.mode !== 'normal') roll.dice.push(newDie(20, 'd20', false));
  // Roll again: the same dice as the roll it repeats (dice added or taken off after rolling too), modifier and DC.
  if (opts.sameAs) {
    const was = opts.sameAs;
    roll.dice = was.dice.map((d) => ({ ...d, id: ++dieSeq, value: d.max ? d.value : null }));
    roll.mode = was.mode;
    roll.custom = was.custom;
    if (was.dc != null) roll.dc = was.dc;
  }
  rollState.current = roll;
  rollState.open = true;
  rollState.min = false;
  if (opts.now) doRoll();
  else renderDice(true);
}

// ------------------------------------------------------------- rolling and amending
const d20s = (r) => r.dice.filter((d) => d.tag === 'd20');
/** The d20 that counts (highest with advantage, lowest with disadvantage, else the first). */
function keptD20(r) {
  const ds = d20s(r).filter((d) => d.value != null);
  if (!ds.length) return null;
  if (r.mode === 'adv') return ds.reduce((a, b) => (b.value > a.value ? b : a));
  if (r.mode === 'dis') return ds.reduce((a, b) => (b.value < a.value ? b : a));
  return ds[0];
}
function rollSum(r) {
  const kept = keptD20(r);
  let t = kept ? kept.value : 0;
  // Damage with advantage: the weapon's dice twice, the higher set counts.
  const set = (tag) => r.dice.filter((d) => d.tag === tag && d.value != null).reduce((s, d) => s + (d.sign || 1) * d.value, 0);
  if (r.dice.some((d) => d.tag === 'adv')) t += Math.max(set('base'), set('adv')) - set('base') - set('adv');
  for (const d of r.dice) if (d.tag !== 'd20' && d.value != null) t += (d.sign || 1) * d.value;
  for (const b of r.base) t += num(b.value);
  for (const cd of r.conds) if (cd.on) t += num(cd.bonus);
  return t + num(r.custom);
}
/** The result; some rolls count at least something (a medpac heals at least 1). */
const rollTotal = (r) => (r.minTotal != null ? Math.max(r.minTotal, rollSum(r)) : rollSum(r));
/** Roll every die that has no number yet (new rolls, or dice added after the fact). */
function doRoll() {
  const r = rollState.current;
  if (!r) return;
  const fresh = r.dice.filter((d) => d.value == null).map((d) => d.id);
  for (const d of r.dice) if (d.value == null) d.value = rollDie(d.sides);
  for (const c of r.conds) if (c.on && c.spend && !r.rolled) spendCond(c, false);
  // A weapon with the reload property uses a shot.
  if (!r.rolled && r.key === state.current && /^attack\|\d+$/.test(r.spec || '')) weaponFired(num(r.spec.split('|')[1]));
  // A die used once ends its power (Guidance: "The power then ends").
  const used = r.conds.filter((c) => c.on && c.consume && !c.consumed);
  for (const c of used) { c.consumed = true; endEffect(c.consume); }
  if (!r.rolled) {
    r.rolled = true;
    r.at = Date.now();
    rollState.log = capRollLog([r].concat(rollState.log.filter((x) => x.id !== r.id)));
  }
  saveRollLog();
  tumble(r, fresh, () => {
    renderDice('next');
    announceRoll(r);
    // A natural 20 or 1 on a d20 roll: a flash over the page (screen effects).
    const kept = r.kind === 'd20' ? keptD20(r) : null;
    if (kept && typeof fxPulse === 'function') {
      if (kept.value >= (r.critMin || 20)) fxPulse('crit');
      else if (kept.value === 1) fxPulse('fumble');
    }
  });
}
/**
 * The dice tumble for a moment before the result shows: their faces flick through numbers, slowing down, then land
 * (the numbers are already rolled and saved; this is only how they're shown). No tumbling with reduced motion.
 */
const TUMBLE_STEPS = [45, 55, 65, 80, 95, 115, 140, 170];
function tumble(r, ids, done) {
  clearTimeout(rollState.tumbleTimer);
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ids.length || still || typeof document === 'undefined') { rollState.tumbling = null; done(); landed(); return; }
  rollState.tumbling = { id: r.id, dice: new Set(ids) };
  renderDice(false);
  let step = 0;
  const flick = () => {
    if (!rollState.tumbling || rollState.tumbling.id !== r.id) return;
    for (const el of document.querySelectorAll('#dice .die.tumbling b')) el.textContent = String(rollDie(Number(el.dataset.sides)));
    if (step < TUMBLE_STEPS.length) { rollState.tumbleTimer = setTimeout(flick, TUMBLE_STEPS[step++]); return; }
    rollState.tumbling = null;
    done();
    landed();
  };
  flick();
}
/** The result just landed: the total and the dice give a small pop. */
function landed() {
  const dock = document.getElementById('dice');
  if (!dock) return;
  for (const el of dock.querySelectorAll('.rl-total, .rl-dice .die')) el.classList.add('landed');
}
const isTumbling = (r, d) => !!(rollState.tumbling && rollState.tumbling.id === r.id && (!d || rollState.tumbling.dice.has(d.id)));
/** Tell screen readers the result (the dock itself is redrawn on every change). */
function announceRoll(r) {
  let el = document.getElementById('rollAnnounce');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rollAnnounce';
    el.className = 'sr-only';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = `${r.label}: ${rollTotal(r)}`;
}
/** Advantage / normal / disadvantage, before or after rolling (adds or drops a d20 only). */
function setMode(mode) {
  const r = rollState.current;
  if (!r || r.kind !== 'd20' || r.mode === mode) return;
  const ds = d20s(r);
  if (mode === 'normal') {
    // Keep the first d20 rolled; drop the one added for advantage/disadvantage.
    r.dice = r.dice.filter((d) => d.tag !== 'd20' || d === ds[0]);
  } else if (ds.length < 2) {
    r.dice.splice(r.dice.indexOf(ds[0]) + 1, 0, newDie(20, 'd20', r.rolled));
  }
  r.mode = mode;
  afterAmend();
}
function addDice(sides, count = 1) {
  const r = rollState.current;
  if (!r) return;
  for (let i = 0; i < count; i++) r.dice.push(newDie(sides, 'extra', r.rolled));
  afterAmend();
}
function removeDie(id) {
  const r = rollState.current;
  if (!r) return;
  const d = r.dice.find((x) => x.id === Number(id));
  if (!d) return;
  if (d.tag === 'd20') {
    if (d20s(r).length < 2) return;
    r.dice = r.dice.filter((x) => x !== d);
    r.mode = 'normal';
  } else {
    r.dice = r.dice.filter((x) => x !== d);
    if (d.tag.startsWith('cond:')) {
      const cd = r.conds.find((x) => `cond:${x.label}` === d.tag);
      if (cd && !r.dice.some((x) => x.tag === d.tag)) cd.on = false;
    }
  }
  afterAmend();
}
function toggleCond(i) {
  const r = rollState.current;
  const cd = r && r.conds[i];
  if (!cd) return;
  cd.on = !cd.on;
  const tag = `cond:${cd.label}`;
  if (cd.on) r.dice.push(...condDice(r, cd));
  else r.dice = r.dice.filter((d) => d.tag !== tag);
  // One of a group (Force-Empowered Strikes +1d8 / +2d8).
  if (cd.on && cd.group) {
    for (const o of r.conds) {
      if (o === cd || o.group !== cd.group || !o.on) continue;
      o.on = false;
      r.dice = r.dice.filter((d) => d.tag !== `cond:${o.label}`);
      if (r.rolled) spendCond(o, true);
    }
  }
  if (r.rolled) spendCond(cd, !cd.on);
  afterAmend();
}
/**
 * Switch how critical damage counts, remembered from now on. On a critical roll already made,
 * the first set keeps its numbers; the extra set becomes maximums, or is rolled fresh.
 */
function setCritMode(mode) {
  if (!['double', 'max'].includes(mode) || rollSettings.critMode === mode) return;
  rollSettings.critMode = mode;
  try { platform.storage.set({ [ROLL_SETTINGS_KEY]: { ...rollSettings } }); } catch (e) { /* not critical */ }
  const r = rollState.current;
  if (r && r.crit) {
    r.dice = r.dice.map((d) => (d.crit ? (mode === 'max' ? { ...d, value: d.sides, max: true } : { ...d, value: r.rolled ? rollDie(d.sides) : null, max: false }) : d));
    afterAmend();
    return;
  }
  renderDice(false);
}
function afterAmend() {
  const r = rollState.current;
  if (r && r.rolled) {
    r.amended = true;
    saveRollLog();
  }
  renderDice(false);
}

// ------------------------------------------------------------- dock
function diceText(d) {
  if (d.value == null) return `d${d.sides}`;
  return String(d.value);
}
/** "d20 18 (advantage) + 1d4 Guidance 3 + 3 modifier": each part named and signed. */
function rollBreakdown(r) {
  const parts = [];
  const kept = keptD20(r);
  if (kept) parts.push(['+', `d20 ${kept.value}${r.mode !== 'normal' ? ` (${r.mode === 'adv' ? 'advantage' : 'disadvantage'})` : ''}`]);
  // Other dice, grouped by what they are: "2d6 7 (3+4)", "1d8 critical 5", "1d4 Bless 2".
  const groups = [];
  for (const d of r.dice.filter((x) => x.tag !== 'd20')) {
    const k = [d.tag, d.sides, d.sign || 1, d.crit ? 'c' : ''].join('|');
    let g = groups.find((x) => x.k === k);
    if (!g) groups.push(g = { k, d, vals: [] });
    g.vals.push(d.value);
  }
  for (const { d, vals } of groups) {
    const known = vals.every((v) => v != null);
    const sum = vals.reduce((t, v) => t + num(v), 0);
    const what = `${vals.length}d${d.sides}${d.tag.startsWith('cond:') ? ` ${d.tag.slice(5)}` : d.crit ? (d.max ? ' critical (max)' : ' critical') : ''}`;
    parts.push([d.sign < 0 ? '−' : '+', `${what} ${known ? sum : '?'}${vals.length > 1 && known ? ` (${vals.join('+')})` : ''}`]);
  }
  const add = (v, label) => { if (num(v)) parts.push([num(v) < 0 ? '−' : '+', `${Math.abs(num(v))} ${label}`]); };
  for (const b of r.base) add(b.value, b.label);
  for (const cd of r.conds) if (cd.on) add(cd.bonus, cd.label);
  add(r.custom, 'custom');
  const text = parts.map(([s, p], i) => (i ? ` ${s} ${p}` : `${s === '−' ? '−' : ''}${p}`)).join('');
  return text + (r.minTotal != null && rollSum(r) < r.minTotal ? ` (at least ${r.minTotal})` : '');
}
function renderRollCard(r) {
  const kept = keptD20(r);
  const nat = r.rolled && kept ? kept.value : null;
  const total = rollTotal(r);
  const rolling = isTumbling(r);
  const snap = r.key && r.key === state.current ? state.snapshots[r.key] : null;
  const inspired = r.kind === 'd20' && !r.rolled && snap && snap.complete && buildModel(snap).t.s.hasInspiration;
  const insp = inspired ? `<button class="btn sm" data-rl="insp" data-arg="" title="Spend your Inspiration: advantage on this roll">★ Use Inspiration</button>` : r.inspired ? '<span class="chip good">★ Inspiration used</span>' : '';
  const modes = r.kind === 'd20' ? `<div class="rl-modes" role="group" aria-label="Advantage">${[['dis', 'Disadvantage'], ['normal', 'Normal'], ['adv', 'Advantage']]
    .map(([v, l]) => `<button class="btn sm${r.mode === v ? ' on' : ''}" data-rl="mode" data-arg="${v}" aria-pressed="${r.mode === v}">${l}</button>`).join('')}${insp}</div>` : '';
  const dice = r.dice.map((d) => {
    // While the dice tumble, nothing gives the result away (which d20 counts, a natural 20).
    const spin = rolling && isTumbling(r, d);
    const dropped = !rolling && d.tag === 'd20' && r.rolled && kept && d !== kept;
    const cls = [d.tag === 'd20' ? 'd20' : 'dx', spin ? 'tumbling' : '', dropped ? 'dropped' : '', d.max ? 'maxed' : '', d.crit ? 'critd' : '',
      !rolling && d.tag === 'd20' && d.value === 20 ? 'nat20' : '', !rolling && d.tag === 'd20' && d.value === 1 ? 'nat1' : ''].filter(Boolean).join(' ');
    const removable = d.tag !== 'd20' || d20s(r).length > 1;
    const title = `d${d.sides}${d.tag.startsWith('cond:') ? ' · ' + d.tag.slice(5) : ''}${d.crit ? (d.max ? ' · critical, at its maximum' : ' · critical') : ''}${dropped ? ' (not counted)' : ''}`;
    const face = `<b data-sides="${d.sides}">${esc(spin ? String(rollDie(d.sides)) : diceText(d))}</b><small>${d.max ? 'max ' : ''}d${d.sides}</small>`;
    // A die that can be taken off is a button: a click anywhere on it removes it (× shows that it can).
    return removable
      ? `<button type="button" class="die ${cls}" data-rl="remove" data-arg="${d.id}" title="${esc(title)} · click to remove" aria-label="Remove d${d.sides}${d.value != null && !spin ? ` (${d.value})` : ''}">${face}<span class="die-x" aria-hidden="true">×</span></button>`
      : `<span class="die ${cls}" title="${esc(title)}">${face}</span>`;
  }).join('');
  const conds = r.conds.length ? `<div class="rl-conds">${r.conds.map((cd, i) => `<label class="rl-cond${cd.blocked ? ' blocked' : ''}"${cd.blocked ? ` title="${esc(cd.blocked)}"` : ''}><input type="checkbox" data-rl="cond" data-arg="${i}"${cd.on ? ' checked' : ''}> ${esc(cd.label)} <span class="faint">${[num(cd.bonus) ? signed(cd.bonus) : '', ...cd.extra.map((e) => '+' + e)].filter(Boolean).join(' ')}${cd.blocked ? ` · ${esc(cd.blocked)}` : ''}</span></label>`).join('')}</div>` : '';
  const crit = r.kind === 'd20' && nat != null && nat >= (r.critMin || 20);
  const fumble = r.kind === 'd20' && nat === 1;
  const advSet = r.dice.some((d) => d.tag === 'adv');
  const dmgAdv = r.dmgAdv ? `<div class="rl-next"><button class="btn sm${advSet ? ' on' : ''}" data-rl="dmgadv" data-arg="" aria-pressed="${advSet}" title="${esc(r.dmgAdv)}: roll the weapon's damage dice twice and keep the higher (once per turn)">Advantage (${esc(r.dmgAdv)})</button>${advSet && r.rolled ? ` <span class="faint">${set2Text(r)}</span>` : ''}</div>` : '';
  const critToggle = `<span class="rl-critmode" role="group" aria-label="Critical damage">Critical: ${[['double', 'Double dice'], ['max', 'Max + roll']]
    .map(([v, l]) => `<button class="btn sm${rollSettings.critMode === v ? ' on' : ''}" data-rl="critmode" data-arg="${v}" aria-pressed="${rollSettings.critMode === v}" title="${v === 'double' ? 'Roll the damage dice twice' : 'One set of damage dice at their maximum, plus one set rolled'}">${l}</button>`).join('')}</span>`;
  // A natural 1 on an attack always misses: damage stays offered (a GM may rule otherwise) but isn't the next step.
  const miss = fumble && r.next;
  const two = r.next && r.next.two ? `<button class="btn sm" data-rl="next" data-arg="${crit ? 'crit-two' : 'two'}" title="Versatile: held in two hands">Two-handed (${esc(r.next.two)})</button>` : '';
  const follow = r.next && r.rolled ? `<div class="rl-next${miss ? ' missed' : ''}">${miss ? '<span class="chip bad">Miss (natural 1)</span>' : ''}<button class="btn sm${crit || miss ? '' : ' primary'}" data-rl="next" data-arg="">Hit: roll damage</button><button class="btn sm${crit ? ' primary' : ''}" data-rl="next" data-arg="crit">Critical damage</button>${two}${critToggle}</div>` : '';
  return `<div class="rl-card${r.rolled ? ' rolled' : ''}">
    <div class="rl-title"><b>${esc(r.label)}</b>${r.char ? ` <span class="faint">${esc(r.char)}</span>` : ''}${r.amended ? ' <span class="chip">amended</span>' : ''}</div>
    ${r.toolAbility ? `<label class="rl-ability">Ability <select data-rl="ability">${ABILITIES.map((a) => `<option${a === r.toolAbility ? ' selected' : ''}>${a}</option>`).join('')}</select></label>` : ''}
    ${r.crit ? `<div class="rl-next">${critToggle}</div>` : ''}${r.preset ? `<div class="faint">${esc(r.preset)}</div>` : ''}
    ${r.critMin && r.critMin < 20 ? `<div class="rl-critrange"><span class="chip accent" title="${esc(r.critFrom)}">Critical hit on ${r.critMin}–20</span> <span class="faint">${esc(r.critFrom)}</span></div>` : ''}
    ${r.warn ? `<div class="rl-note warn">${esc(r.warn)}</div>` : ''}${arr(r.notes).map((n) => `<div class="rl-note">${esc(n)}</div>`).join('')}${modes}${conds}${dmgAdv}${foretellButtons(r)}
    <div class="rl-dice">${dice || '<span class="faint">No dice</span>'}</div>
    <div class="rl-add">Add ${DIE_SIDES.map((s) => `<button class="btn sm" data-rl="add" data-arg="${s}" title="Add a d${s}${r.rolled ? ' (rolled now)' : ''}">+d${s}</button>`).join('')}
      <label class="rl-mod">Modifier <input type="number" step="1" data-rl="custom" value="${num(r.custom) || ''}" placeholder="0"></label>
      ${r.kind === 'd20' ? `<label class="rl-mod" title="The number to reach (a save's or check's DC, a target's AC)">DC <input type="number" step="1" data-rl="dc" value="${num(r.dc) || ''}" placeholder="—"></label>` : ''}</div>
    ${r.rolled && rolling
    ? '<div class="rl-result rolling" aria-hidden="true"><span class="rl-total">…</span><span class="faint">Rolling…</span></div>'
    : r.rolled
    ? `<div class="rl-result" tabindex="-1"><span class="rl-total">${total}</span>${r.damageType ? ` <span class="muted">${esc(r.damageType)}</span>` : ''}
        ${crit ? (nat === 20 ? chip('Natural 20', 'good') : `<span class="chip good" title="${esc(r.critFrom)}: critical hit on ${r.critMin}–20">Critical hit (${nat})</span>`) : fumble ? chip('Natural 1', 'bad') : ''}
        ${r.autoFail ? chip(`Automatic failure (${r.autoFail})`, 'bad') : num(r.dc) && r.kind === 'd20' ? chip(total >= num(r.dc) ? `Success (DC ${num(r.dc)})` : `Failure (DC ${num(r.dc)})`, total >= num(r.dc) ? 'good' : 'bad') : ''}
        <button class="btn sm rl-again" data-rl="again" data-arg="" title="Roll the same thing again">Roll again</button>
        <div class="rl-break faint">${esc(rollBreakdown(r))}</div></div>
      ${follow}${applyButtons(r, total, nat)}`
    : `<div class="rl-actions"><button class="btn primary" data-rl="roll" data-arg="" id="rlGo">Roll ${esc(r.base.length ? signed(r.base.reduce((t, b) => t + num(b.value), 0)) : '')}</button>
        <span class="faint hint-kbd">Enter rolls · Shift-click a value to roll straight away</span></div>`}
  </div>`;
}
/**
 * After a hit die, death save or superiority die roll for the character on screen: put the result on the
 * play tracker in one click (heal and spend the die, record the save, spend the die).
 */
function applyButtons(r, total, nat) {
  if (!r.key || r.key !== state.current) return '';
  if (r.applied) return `<div class="rl-next"><span class="chip good">✓ ${esc(r.applied)}</span></div>`;
  const [kind, a1] = r.spec.split('|');
  const snap = state.snapshots[state.current];
  const t = snap && snap.complete ? buildModel(snap).t : null;
  if (!t) return '';
  if (kind === 'hitdie' && t.hdLeft(a1) <= 0) return `<div class="rl-next faint">No ${esc(a1)} hit dice left to spend.</div>`;
  if (kind === 'supdie' && t.lim.supMax - num(t.s.superiorityDiceUsed) <= 0) return '<div class="rl-next faint">No superiority dice left.</div>';
  const btn = (arg, label, title) => `<button class="btn sm primary" data-rl="apply" data-arg="${esc(arg)}" title="${esc(title)}">${esc(label)}</button>`;
  if (kind === 'hitdie') {
    const missing = t.lim.hpMax - t.hpCurrent;
    if (missing <= 0) return '<div class="rl-next faint">At full hit points: nothing to heal (the die isn\'t spent).</div>';
    const heals = Math.min(Math.max(0, total), missing);
    return `<div class="rl-next">${btn(`hdheal|${a1}`, `Heal ${heals}${heals < total ? ` (of ${total})` : ''} and spend the ${a1}`, `Spend one hit die and regain these hit points (${missing} missing)`)}</div>`;
  }
  if (kind === 'supdie') return `<div class="rl-next">${btn('sup|1', 'Spend a superiority die', 'Mark one superiority die used')}</div>`;
  if (kind === 'featheal') {
    const f = t.lim.features.find((x) => x.name === a1);
    if (f && num(t.s.featuresTimesUsed[a1]) >= f.maximum) return `<div class="rl-next faint">No uses of ${esc(a1)} left.</div>`;
    const heals = Math.min(Math.max(0, total), t.lim.hpMax - t.hpCurrent);
    return `<div class="rl-next">${btn(`featheal|${a1}`, `Heal ${heals}${heals < total ? ` (of ${total})` : ''}${f ? ` and spend ${a1}` : ''}`, 'Regain these hit points and mark the use (Combat & Vitals)')}</div>`;
  }
  if (kind === 'pdmg' && r.heal) {
    return t.hpCurrent >= t.lim.hpMax ? '<div class="rl-next faint">At full hit points: nothing to heal (if it\'s on you).</div>'
      : `<div class="rl-next">${btn('heal|', `Heal ${Math.min(total, t.lim.hpMax - t.hpCurrent)} (on me)`, 'Regain these hit points if the power is on you')}</div>`;
  }
  if (kind === 'itemheal') {
    return t.hpCurrent >= t.lim.hpMax ? '<div class="rl-next faint">At full hit points: nothing to heal.</div>'
      : `<div class="rl-next">${btn('heal|', `Heal ${total}`, 'Regain these hit points (Combat & Vitals); no Hit Die is spent')}</div>`;
  }
  if (kind === 'conc') {
    const conc = tempEffects(state.current).find((e) => e.group === 'concentration');
    if (!conc) return '';
    return total >= num(r.dc) && !r.autoFail ? `<div class="rl-next"><span class="chip good">Concentration kept: ${esc(conc.name.replace(/ \(concentration\)$/, ''))}</span></div>`
      : `<div class="rl-next">${btn(`endconc|${conc.id}`, `End concentration on ${conc.name.replace(/ \(concentration\)$/, '')}`, 'The save failed: the power ends')}</div>`;
  }
  if (kind === 'death' && nat != null) {
    return `<div class="rl-next">${nat === 20 ? btn('nat20|', 'Natural 20: regain 1 hit point', 'You regain 1 hit point and your death saves reset')
      : nat === 1 ? btn('dsadd|failures|2', 'Record two failures', 'A natural 1 counts as two failures')
        : total >= 10 ? btn('dsadd|successes|1', 'Record a success', '10 or higher') : btn('dsadd|failures|1', 'Record a failure', 'Lower than 10')}</div>`;
  }
  return '';
}
async function applyRoll(arg) {
  const r = rollState.current;
  if (!r || !r.rolled || r.applied || r.key !== state.current) return;
  const [op, ...rest] = arg.split('|');
  const total = rollTotal(r);
  if (op === 'endconc') {
    await endEffect(rest.join('|'));
    r.applied = 'Concentration ended';
    saveRollLog();
    renderDice(false);
    return undefined;
  }
  const label = await trackerAction(op, rest.join('|'), total);
  r.applied = ['hdheal', 'featheal'].includes(op) ? ((state.undo && state.undo.label) || `Healed ${Math.max(0, total)}`) : op === 'heal' ? ((state.undo && state.undo.label) || `Healed ${total}`)
    : op === 'sup' ? 'Spent' : op === 'nat20' ? 'Back up with 1 hit point' : 'Recorded';
  saveRollLog();
  renderDice(false);
  const s = buildModel(state.snapshots[state.current]).t.s;
  if (op === 'dsadd') setStatus(num(s.deathSaves.failures) >= 3 ? 'Three failed death saves.' : num(s.deathSaves.successes) >= 3 ? 'Three successful death saves: stable.' : `Death saves: ${num(s.deathSaves.successes)} ✓, ${num(s.deathSaves.failures)} ✗.`);
  return label;
}

/** Draw the dock. focus: true = the Roll button, 'next' = what comes after a roll (damage, apply, Roll again). */
function renderDice(focus) {
  let dock = document.getElementById('dice');
  if (!dock) {
    dock = document.createElement('aside');
    dock.id = 'dice';
    dock.setAttribute('aria-label', 'Dice roller');
    document.body.appendChild(dock);
  }
  dock.hidden = !rollState.open;
  if (!rollState.open) { rollState.minH = 0; dock.style.minHeight = ''; }
  dock.classList.toggle('min', rollState.min);
  const r = rollState.current;
  // The log shows this character's rolls (and free rolls).
  const log = rollState.log.filter((x) => !x.key || x.key === state.current);
  const head = `<div class="dice-head"><b>Dice</b>
      <form class="dice-free" data-rl-free><input name="expr" placeholder="e.g. 2d6+3" aria-label="Dice to roll" autocomplete="off"><button class="btn sm" type="submit">Roll</button></form>
      <button class="btn sm" data-rl="min" data-arg="" title="${rollState.min ? 'Show the whole roll' : 'Make the dice small (the sheet stays clickable)'}" aria-label="${rollState.min ? 'Expand the dice' : 'Minimise the dice'}" aria-expanded="${!rollState.min}">${rollState.min ? '▴' : '▾'}</button>
      <button class="btn sm" data-rl="close" data-arg="" title="Hide the dice (the log is kept)" aria-label="Close the dice">✕</button></div>`;
  if (rollState.min) {
    dock.style.minHeight = '';
    dock.innerHTML = head + (r && r.rolled ? `<button class="dice-mini" data-rl="min" data-arg="">${esc(r.label)}: <b>${isTumbling(r) ? '…' : rollTotal(r)}</b></button>` : '');
    document.body.style.paddingBottom = rollState.open ? `${dock.offsetHeight + 16}px` : '';
    return;
  }
  dock.innerHTML = `${head}
    ${r ? renderRollCard(r) : '<p class="faint" style="margin:8px 0">Click a number on the sheet (skills, saves, attacks, damage…) to roll it.</p>'}
    ${log.length ? `<div class="dice-log"><div class="faint">Recent rolls${state.current ? ' for this character' : ''}</div>${log.map((x) => `<button class="log-row${r && x.id === r.id ? ' cur' : ''}" data-rl="open" data-arg="${esc(x.id)}">
      <span>${esc(x.label)}${x.amended ? ' ✎' : ''}</span><b>${rollTotal(x)}</b><span class="faint">${esc(new Date(x.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span></button>`).join('')}</div>` : ''}`;
  document.querySelectorAll('[data-dice-toggle]').forEach((b) => { b.classList.toggle('on', rollState.open); b.setAttribute('aria-expanded', String(rollState.open)); });
  // While open, the dock only grows: its top (and ✕) never moves down, so a click aimed at it can't land on the sheet.
  if (rollState.open) {
    dock.style.minHeight = '';
    rollState.minH = Math.min(Math.max(num(rollState.minH), dock.offsetHeight), window.innerHeight * 0.62);
    dock.style.minHeight = `${rollState.minH}px`;
  }
  // Room under the dock, so the end of the sheet can still be scrolled into view.
  document.body.style.paddingBottom = rollState.open ? `${dock.offsetHeight + 16}px` : '';
  // Never take the focus from a box being typed in outside the dock (the tracker's Amount).
  const ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && !/checkbox|radio|button|submit/.test(ae.type) && !ae.closest('#dice')) focus = false;
  if (focus === true) { const go = document.getElementById('rlGo'); if (go) go.focus({ preventScroll: true }); }
  if (focus === 'next') {
    // The next step (damage, apply) if there is one; never "Roll again", which a second tap would press.
    const next = dock.querySelector('.rl-next .btn.primary, [data-rl="apply"]') || dock.querySelector('.rl-result');
    if (next) next.focus({ preventScroll: true });
  }
}

/** Newest first, at most ROLL_LOG_MAX rolls per character (and as many free rolls). */
function capRollLog(list) {
  const per = {};
  return list.slice().sort((a, b) => num(b.at) - num(a.at)).filter((x) => (per[x.key || ''] = (per[x.key || ''] || 0) + 1) <= ROLL_LOG_MAX);
}
/** Join the rolls stored by other pages (another tab, the phone frame) with ours. */
const mergeRolls = (theirs) => {
  const mine = new Set(rollState.log.map((x) => x.id));
  return capRollLog(rollState.log.concat(arr(theirs).filter((x) => x && !mine.has(x.id))));
};
async function saveRollLog() {
  try {
    const d = await platform.storage.get(ROLL_LOG_KEY);
    rollState.log = mergeRolls(d[ROLL_LOG_KEY]);
    await platform.storage.set({ [ROLL_LOG_KEY]: rollState.log });
  } catch (e) { /* not critical */ }
}
// A character's latest rolls also travel with it (W-103): Sync to SW5E sends them as the character's rollLog, and
// loading or importing a character that has one adds them here, so another computer sees them too.
const ROLLS_WITH_CHARACTER = 15;
/** The rolls kept with a character: its latest, without what only the open roll card needs. */
function rollsForCharacter(key) {
  return rollState.log.filter((x) => x.key === key && x.rolled).slice(0, ROLLS_WITH_CHARACTER).map((x) => {
    const { next, notes, warn, preset, ...rest } = x; // eslint-disable-line no-unused-vars
    return { ...rest, conds: arr(x.conds).filter((c) => c.on) };
  });
}
/** Add the rolls that came with a character (loaded from sw5e.com or a file) to the log. */
async function mergeCharacterRolls(key, list) {
  const theirs = arr(list).filter((x) => x && x.id && x.at && x.rolled).map((x) => ({ ...x, key }));
  if (!theirs.length) return;
  const before = rollState.log.length;
  rollState.log = mergeRolls(theirs);
  if (rollState.log.length === before) return;
  await saveRollLog();
  if (rollState.open) renderDice(false);
}
async function loadRollLog() {
  try {
    const d = await platform.storage.get([ROLL_LOG_KEY, ROLL_SETTINGS_KEY]);
    Object.assign(rollSettings, d[ROLL_SETTINGS_KEY] || {});
    // Joined with what's already here (rolls that came with a character before the log was read).
    rollState.log = mergeRolls(d[ROLL_LOG_KEY]);
    dieSeq = Math.max(dieSeq, ...rollState.log.flatMap((x) => arr(x.dice).map((dd) => num(dd.id))));
  } catch (e) { /* ignore */ }
}

/** Mark a value on the sheet as rollable (click: roll card; shift-click: roll now). */
function rollable(spec, html, title) {
  const value = String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return `<span class="rollable" role="button" tabindex="0" data-roll="${esc(spec)}" title="${esc(title || 'Click to roll')}" aria-label="${esc(`${title || 'Roll'}: ${value}`)}">${html}</span>`;
}

function handleRl(act, arg, el) {
  const r = rollState.current;
  switch (act) {
    case 'roll': return doRoll();
    case 'mode': return setMode(arg);
    case 'add': return addDice(Number(arg));
    case 'remove': return removeDie(arg);
    case 'cond': return toggleCond(Number(arg));
    case 'again': if (r) startRoll(r.spec, { mode: r.mode, conds: r.conds.filter((c) => c.on).map((c) => c.label), ability: r.toolAbility, sameAs: r, now: true }); return undefined;
    case 'next':
      if (r && r.next) {
        startRoll(r.next.spec + (/crit/.test(arg) ? '|crit' : '|') + (/two/.test(arg) ? '|two' : ''),
          { conds: r.conds.filter((c) => c.on).map((c) => c.label), now: true, attackMode: r.mode });
      }
      return undefined;
    case 'open': {
      const x = rollState.log.find((l) => l.id === arg);
      if (x) { rollState.current = x; renderDice(false); }
      return undefined;
    }
    case 'close': rollState.open = false; renderDice(false); return returnFocus();
    case 'min': rollState.min = !rollState.min; renderDice(false); return undefined;
    case 'dmgadv': {
      if (!r) return undefined;
      if (r.dice.some((d) => d.tag === 'adv')) r.dice = r.dice.filter((d) => d.tag !== 'adv');
      else r.dice.push(...r.dice.filter((d) => d.tag === 'base').map((d) => ({ ...newDie(d.sides, 'adv', r.rolled), sign: d.sign })));
      return afterAmend();
    }
    case 'foretell': return useForetold(num(arg));
    case 'insp':
      if (!r || r.rolled) return undefined;
      r.inspired = true;
      setMode('adv');
      return trackerAction('insp', '').then(() => renderDice(false));
    case 'critmode': return setCritMode(arg);
    case 'apply': return applyRoll(arg);
    default: return undefined;
  }
}

// Events (the dock and rollable values; the viewer's own handlers ignore these).
document.addEventListener('click', (e) => {
  const rl = e.target.closest('[data-rl]');
  if (rl && rl.closest('#dice') && rl.tagName !== 'INPUT' && rl.tagName !== 'SELECT') {
    e.preventDefault();
    handleRl(rl.dataset.rl, rl.dataset.arg || '', rl);
    return;
  }
  let el = e.target.closest('[data-roll]');
  if (!el && !e.target.closest('button, a, input, select, textarea, .bump')) {
    const row = e.target.closest('.ability .row, #sec-skills tbody tr');
    const rolls = row ? row.querySelectorAll('[data-roll]') : [];
    if (rolls.length === 1) el = rolls[0];
  }
  if (el) { rollOpener = el; startRoll(el.dataset.roll, { now: e.shiftKey }); }
  if (e.target.closest('[data-dice-toggle]')) { rollState.open = !rollState.open; renderDice(false); }
});
document.addEventListener('mousedown', (e) => { if (e.shiftKey && e.target.closest && e.target.closest('[data-roll]')) e.preventDefault(); });
try {
  platform.storage.onChanged((changes) => {
    if (!changes[ROLL_LOG_KEY]) return;
    const before = rollState.log.length;
    rollState.log = mergeRolls(changes[ROLL_LOG_KEY].newValue);
    if (rollState.open && rollState.log.length !== before) renderDice(false);
  });
} catch (e) { /* no storage events */ }
// Where focus goes back to when the dock closes: the number that opened it.
let rollOpener = null;
function returnFocus() {
  if (rollOpener && rollOpener.isConnected) rollOpener.focus({ preventScroll: true });
  rollOpener = null;
}
document.addEventListener('keydown', (e) => {
  const el = e.target.closest && e.target.closest('[data-roll]');
  if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); rollOpener = el; startRoll(el.dataset.roll, { now: e.shiftKey }); }
  // Escape closes the dock (from inside it, or when nothing else is being typed in).
  if (e.key === 'Escape' && rollState.open && (e.target.closest('#dice') || !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
    && !(document.getElementById('moreMenu') && !document.getElementById('moreMenu').hidden)) {
    rollState.open = false;
    renderDice(false);
    returnFocus();
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t.closest || !t.closest('#dice')) return;
  const r = rollState.current;
  if (t.dataset.rl === 'cond') toggleCond(Number(t.dataset.arg));
  if (t.dataset.rl === 'custom' && r) { r.custom = Math.trunc(Number(t.value)) || 0; afterAmend(); }
  if (t.dataset.rl === 'dc' && r) { r.dc = Math.trunc(Number(t.value)) || 0; renderDice(false); }
  if (t.dataset.rl === 'ability' && r) {
    const snap = state.snapshots[state.current];
    const m = buildModel(snap);
    const fresh = buildRoll(m, r.spec, { ability: t.value });
    r.toolAbility = t.value;
    r.base = fresh.base;
    afterAmend();
  }
});
document.addEventListener('submit', (e) => {
  if (!e.target.matches('form[data-rl-free]')) return;
  e.preventDefault();
  const v = e.target.elements.expr.value.trim();
  if (v) startRoll(`dice|${v}`, { now: true });
});
loadRollLog();
