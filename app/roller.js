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
/** A condition's extra dice ("+1d8"), doubled on a critical (not a critical hit's own extra dice: noDouble). */
function condDice(roll, cd) {
  const out = [];
  for (const e of cd.extra) {
    for (const d of (parseDice(e) || { dice: [] }).dice) {
      // ("−1d4": a die taken off, a side effect's.)
      out.push(d.sign < 0 ? { ...newDie(d.sides, `cond:${cd.label}`, roll.rolled), sign: -1 } : newDie(d.sides, `cond:${cd.label}`, roll.rolled));
      if (roll.crit && !cd.noDouble) out.push(critDie(d.sides, `cond:${cd.label}`, roll.rolled));
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
  // "When you hit a creature with a melee weapon attack, you can expend force points to deal additional damage … The
  // additional damage is 1d8 for each point spent in this way. You can't deal more additional damage than the amount shown
  // in the Focused Strikes column" (Force-Empowered Strikes; "than 2d8", Splashclass Guardian; ranged: Force-Empowered
  // Shots, which also takes a use of Channel the Force).
  if (kind === 'damage' && w) {
    const melee = !isRangedWeapon(w);
    for (const f of riderTexts(m)) {
      const x = /(?:#+ ([A-Z][\w'’ -]+?) )?(?:Once per turn, )?[Ww]hen you hit a creature with a (melee|ranged) weapon attack, you can (?:expend a use of your ([\w ]+?) and )?expend force points to deal additional damage[^.]*\. The additional damage is 1?d(\d+) for each point spent in this way\. You can't deal more (?:additional damage than the amount shown in the ([\w' ]+?) column|than (\d+)d\d+ additional damage)/.exec(f.text);
      if (!x || (x[2] === 'melee') !== melee) continue;
      const col = x[5] && arr(m.classDice).find((d) => d.dice && d.column.toLowerCase() === x[5].toLowerCase());
      const max = x[6] ? num(x[6]) : col ? num(String(col.dice).split('d')[0]) || 1 : 1;
      const left = t.lim.force - num(t.s.forcePointsUsed);
      const name = x[1] || f.name;
      for (let n = 1; n <= Math.min(max, left); n++) {
        out.push({ label: `${name} +${n}d${x[4]}${x[3] ? ` (and a use of ${x[3]})` : ''}`, bonus: 0, extra: [`${n}d${x[4]}`], on: false, group: name, spend: { op: 'force', arg: String(n), what: `${n} force point${n > 1 ? 's' : ''}` } });
      }
    }
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

// ------------------------------------------------------------- damage riders (the weapon damage card)
const wProps = (w) => arr(w && w.properties).map((p) => String(p).toLowerCase().trim());
/** A ranged weapon: a blaster, or a "(range …)" property that isn't thrown (as the engine reads it). */
const isRangedWeapon = (w) => /blaster/i.test((w && w.weaponClassification) || '') || wProps(w).some((p) => /\(range /.test(p) && !p.startsWith('thrown'));
/** Finesse: the property, or given it (Unarmed Combatant's unarmed strikes; Martial Arts' unarmed strikes and monk weapons). */
function isFinesseWeapon(m, w) {
  if (wProps(w).some((p) => p.startsWith('finesse'))) return true;
  if (w.name === 'Unarmed Strike') return arr(m.effects).some((e) => e.unarmedFinesse);
  const ref = typeof catalogIndex !== 'undefined' && catalogIndex && catalogIndex.get(w.name);
  return !!ref && typeof martialArtsOf === 'function' && !!m.raw && martialArtsOf(m.raw).some((x) => x.ma.finesse && x.ma.weapons && clsWeaponMatches(x.ma.weapons.desc, ref));
}
/** The ability the attack uses: Dexterity for a finesse unarmed strike whose Dexterity counts (its finesse tweak). */
/** The ability the attack uses: the one a feature gives it over SW5E's (finesse's Dexterity, Vow of Spirit's Wisdom…). */
function weaponAbility(m, w) {
  const tw = w.name === 'Unarmed Strike' ? arr(m.fx && m.fx.tweaks).filter((t) => t.path === 'unarmed.toHit')
    : arr(m.fx && m.fx.weaponTweaks).filter((t) => t.index === w.index && t.path === 'toHit');
  const t = tw.find((x) => x.mod && (x.mod.ability || x.mod.finesse));
  return t ? t.mod.ability || 'Dexterity' : w.ability;
}
/** The texts of the character's features, species traits and slot picks: [{ name, text }] (a pick: "Operative (splashclass improvement)"). */
function riderTexts(m) {
  const out = [];
  const seen = new Set();
  const list = arr(m.allFeatures).concat(typeof bdSpeciesTraitFeatures === 'function' && m.raw ? bdSpeciesTraitFeatures(m) : [], typeof slotPickFeatures === 'function' && m.raw ? slotPickFeatures(m) : []);
  // Picked class options (Guardian Auras, Scout Routines, Scholar Discoveries).
  if (typeof classChoiceInfo === 'function' && state.rules && m.raw) {
    for (const k of arr(m.raw.classes)) {
      const info = classChoiceInfo(m, k);
      for (const l of (info ? info.lists : [])) for (const p of l.chosen) { const o = l.options.find((x) => x.name === p.name); if (o) list.push({ name: o.name, text: o.text || '' }); }
    }
  }
  for (const f of list) {
    const text = String(f.text || f.description || '').replace(/\s+/g, ' ').trim();
    const key = `${f.name}|${text.slice(0, 80)}`;
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: f.slotKind && f.sourceName ? `${f.name} (${String(f.sourceName).toLowerCase()})` : f.name, text });
  }
  return out;
}
/**
 * Bonuses the player may add to a d20 roll, read from the features' text and offered unticked (kind 'save', 'init',
 * 'attack', or 'damage' for the same sentence's damage half):
 * - saves: "When you make a saving throw caused by an effect you can see, you may gain a bonus to the saving throw equal
 *   to your Intelligence modifier" (Calm and Collected), "… to resist charm and fear effects, you may add your
 *   Intelligence modifier to the roll" (Resolute), "you can spend 2 force points to add your Wisdom or Charisma modifier
 *   (your choice, minimum of one) to the saving throw" (Enlightened Evasion), "roll a d8 and add the die to a saving
 *   throw you make" (Brutish Durability);
 * - initiative: "When you roll initiative, you can choose to add your proficiency bonus to the initiative check";
 * - attacks: "a bonus to the first weapon attack roll you make … equal to your Intelligence modifier" (Sharpshooter's
 *   Routine), "you can add your Intelligence modifier to the attack roll or the damage roll of an attack you make" (Foe
 *   Slayer).
 * Not what helps allies ("you or a friendly creature": auras).
 */
function d20Options(m, kind, ctx = {}) {
  const out = [];
  const pb = num((m.c || {}).proficiencyBonus);
  const mod = (list) => Math.max(...list.map((a) => num((((m.c.abilityScores || {})[a]) || {}).modifier)));
  const abil = (s) => String(s).split(/ or /).filter((a) => ABBR[a]);
  for (const t of riderTexts(m)) {
    let sub = ''; // the option a sentence is under ("#### Calculated Bluff …" in Gambler Discoveries)
    for (const s0 of t.text.split(/(?<=\.)\s+(?=[-A-Z_*#])/)) {
      if (/^#{4,}\s/.test(s0)) sub = headingOf(s0);
      else if (/^#{1,3}\s/.test(s0)) sub = '';
      // One of a list of options to choose from: only one the character picked.
      if (sub && !optionPicked(m, t.name, sub)) continue;
      const s = s0.replace(/^#+\s*[A-Z][\w'’ -]+?\s+(?=When|Whenever|Once|You|If|Your|As|At|Additionally)/, '').replace(/^[-#*_ ]+/, '');
      if (/friendly creature|\ban ally\b|\ballies\b/i.test(s)) continue;
      const label = headingOf(s0) || t.name;
      const spend = (/\bspend (\d+) force points?\b/i.exec(s) || [])[1];
      let x;
      // A form's or stance's benefits ("Until the end of your next turn, …", "While in this stance, …"): only while it's on.
      const stateOnly = /^(?:Before|Until) the end of your next turn\b|^While in this stance\b/i.test(s);
      if (stateOnly && !stateOn(m, t.name)) continue;
      if (stateOnly && (kind === 'attack' || kind === 'damage' || kind === 'check' || kind === 'skill')) {
        const w = ctx.w || {};
        const ab = ctx.ability || w.ability;
        const ranged = /blaster/i.test(w.weaponClassification || '') || arr(w.properties).some((p) => /\(range /i.test(p) && !/^thrown/i.test(String(p).trim()));
        // "… add half your Wisdom or Charisma modifier (your choice, minimum of +1) to one ability check or attack roll you
        // make using Strength" (Djem So Form).
        if ((x = /add half your (\w+) or (\w+) modifier \(your choice, minimum of \+1\) to one ability check or attack roll you make using (\w+)/i.exec(s))
          && kind !== 'damage' && (kind === 'attack' ? ab : ctx.ability) === x[3]) out.push({ label, bonus: Math.max(1, Math.floor(mod([x[1], x[2]]) / 2)), extra: [], on: false });
        // "… you can use Wisdom or Charisma instead of Strength or Dexterity for the attack and damage rolls of your melee
        // weapon attacks" (Niman Form).
        else if (ctx.w && !ranged && (x = /you can use (\w+) or (\w+) instead of Strength or Dexterity for the attack and damage rolls of your melee weapon attacks/i.exec(s)) && mod([x[1], x[2]]) > mod([ab])) {
          out.push({ label, bonus: mod([x[1], x[2]]) - mod([ab]), extra: [], on: false });
        // "While in this stance, you add your Wisdom or Charisma modifier (your choice, minimum of +1) to one ranged weapon
        // attack and damage roll you make each turn" (The Way of the Yerdua).
        } else if (ctx.w && ranged && (x = /you add your (\w+) or (\w+) modifier \(your choice, minimum of \+1\) to one ranged weapon attack and damage roll/i.exec(s))) {
          out.push({ label, bonus: Math.max(1, mod([x[1], x[2]])), extra: [], on: false });
        }
        continue;
      }
      if (kind === 'save') {
        if ((x = /\byou (?:may|can)(?: spend \d+ force points? to)? (?:gain a bonus to the saving throw equal to|add) your ((?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: or (?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))?) modifier( \((?:your choice, )?minimum of (?:one|\+?1)\))?(?: to the (?:roll|saving throw))?/i.exec(s)) && /saving throw/i.test(s) && !/death saving throw/i.test(s)) {
          const cond = (/^When you make a saving throw ((?:caused by|to resist|against)[^,]+),/i.exec(s) || [])[1];
          const b = x[2] ? Math.max(1, mod(abil(x[1]))) : mod(abil(x[1]));
          if (b) out.push({ label: `${cond ? `${cond}: ` : ''}${label}${spend ? ` (${spend} force points)` : ''}`, bonus: b, extra: [], on: false, ...(spend ? { spend: { op: 'force', arg: spend, what: `${spend} force points` } } : {}) });
        } else if ((x = /\broll an? (d\d+) and add the die to a saving throw you make/i.exec(s))) out.push({ label, bonus: 0, extra: [`1${x[1]}`], on: false });
        // "While you are concentrating on a Force power, you have a +2 bonus to your AC and all saving throws" (Enduring Focus).
        else if ((x = /^While you are ([^,]+), you have a \+(\d+) bonus to your AC and all saving throws/i.exec(s))) out.push({ label: `while ${x[1].replace(/ on an? (?:Force|force|tech) power$/, '')} (${label})`, bonus: num(x[2]), extra: [], on: false });
        // "While you are the target of your Critical Analysis feature, you can add half your Critical Analysis ability modifer
        // (minimum of one) to any saving throw you make that doesn't already include that modifier" (Mutagenic Analysis).
        else if ((x = /\bWhile you are ([^,]+), you can add half your ([\w ]+?) modif(?:i)?er \(minimum of one\) to any saving throw you make that doesn't already include that modifier/i.exec(s))) {
          const name = x[2].replace(/ ability$/, '');
          const a = ABBR[x[2]] ? x[2] : (new RegExp(`${name} ability modifier, which is (\\w+)`, 'i').exec(riderTexts(m).map((y) => y.text).join(' ')) || [])[1];
          if (ABBR[a] && ctx.ability !== a) out.push({ label: `while ${x[1].replace(/^the target of your /i, 'analyzed by your ')} (${label})`, bonus: Math.max(1, Math.floor(mod([a]) / 2)), extra: [], on: false });
        }
        // "you can add your shield's AC bonus to any Dexterity saving throw you make against a power or other harmful
        // effect" (Shield Mastery): with a shield equipped.
        else if ((x = /add your shield's AC bonus to any (\w+) saving throw you make (against [^.]+?)\./i.exec(s)) && x[1] === ctx.ability) {
          const sh = arr(m.c.equipment).find((e) => e.equipped && e.equipmentCategory === 'Armor' && /shield/i.test(e.armorClassification || ''));
          const b = sh ? num(String(sh.ac || '').replace(/[^\d-]/g, '')) : 0;
          if (b) out.push({ label: `${x[2].replace(/^against /i, 'vs ')} (${label})`, bonus: b, extra: [], on: false });
        }
      } else if (kind === 'init') {
        if (/When you roll initiative, you can choose to add your proficiency bonus to the initiative check/i.test(s)) out.push({ label, bonus: pb, extra: [], on: false });
        // "You can use your Intelligence modifier instead of your Dexterity modifier when making Initiative checks" (Quick-Witted).
        else if ((x = /You can use your (\w+) modifier instead of your (\w+) modifier when making Initiative checks/i.exec(s)) && ABBR[x[1]] && ABBR[x[2]]) out.push({ label: `${ABBR[x[1]]} instead of ${ABBR[x[2]]} (${label})`, bonus: mod([x[1]]) - mod([x[2]]), extra: [], on: false });
      } else if (kind === 'skill' || kind === 'check') {
        // "You can use your Charisma modifier instead of your Wisdom modifier when making Insight checks" (Force of
        // Personality), "… when making Constitution checks" (Forceful Vigor), "proficiency in Medicine, and you can use your
        // Intelligence modifier instead of your Wisdom modifier for checks made with it" (General Practice).
        const named = kind === 'skill' ? ctx.skill : ctx.ability;
        if ((x = /You can use your (\w+) modifier instead of your (\w+) modifier when making ([\w ]+?) checks/i.exec(s)) && ABBR[x[1]] && ABBR[x[2]] && x[3] === named && x[2] === ctx.ability) {
          out.push({ label: `${ABBR[x[1]]} instead of ${ABBR[x[2]]} (${label})`, bonus: mod([x[1]]) - mod([x[2]]), extra: [], on: false });
        } else if (kind === 'skill' && (x = /proficiency in (\w+), and you can use your (\w+) modifier instead of your (\w+) modifier for checks made with it/i.exec(s)) && x[1] === ctx.skill && ABBR[x[2]] && x[3] === ctx.ability) {
          out.push({ label: `${ABBR[x[2]]} instead of ${ABBR[x[3]]} (${label})`, bonus: mod([x[2]]) - mod([x[3]]), extra: [], on: false });
        } else if (kind === 'skill' && /When you make an ability check with the chosen skill or tool, you can add half your Wisdom or Charisma modifier/i.test(s)
          && new RegExp(`\\b${ctx.skill}\\b`, 'i').test(typeof featureNoteOf === 'function' && m.raw ? featureNoteOf(m.raw, t.name) : '')
          && !arr(m.fx && m.fx.tweaks).some((x) => x.effect && x.effect.name === t.name && x.path.endsWith(`.skills.${ctx.skill}`))) {
          // "… add half your Wisdom or Charisma modifier (your choice, minimum of one)" (Force Guidance; its notes name the skill).
          out.push({ label, bonus: Math.max(1, Math.floor(mod(['Wisdom', 'Charisma']) / 2)), extra: [], on: false });
        // "You can double your proficiency bonus for it when you make an Intelligence (Lore) check to recall information you
        // have learned" (Duros Superior Memory): expertise's extra proficiency, where proficient.
        } else if (kind === 'skill' && (x = /double your proficiency bonus for it when you make an? \w+ \((\w+)\) check (to [^,.]+)/i.exec(s)) && x[1] === ctx.skill && ctx.prof === 'proficient') {
          out.push({ label: `${x[2]} (${label})`, bonus: pb, extra: [], on: false });
        // "When you make an ability check using Charisma, you can choose to instead make the check using your Intelligence or
        // Wisdom modifier (your choice)" (Calculated Bluff).
        } else if ((x = /When you make an ability check using (\w+), you can choose to instead make the check using your (\w+(?: or \w+)?) modifier/i.exec(s)) && x[1] === ctx.ability) {
          const list = x[2].split(/ or /).filter((a) => ABBR[a]);
          const best = list.reduce((b, a) => (mod([a]) > mod([b]) ? a : b), list[0]);
          if (best) out.push({ label: `${ABBR[best]} instead of ${ABBR[x[1]]} (${label})`, bonus: mod([best]) - mod([x[1]]), extra: [], on: false });
        // "When you make a Survival skill check, you may use your Critical Analysis ability modifier instead of your Wisdom
        // modifier" (Survival Expert); "When you make a Strength (Athletics) or Dexterity (Acrobatics) check to grapple …, you
        // can use your Critical Analysis ability modifier instead of Strength or Dexterity" (Mental Prowess). "Your Critical
        // Analysis ability modifier": the one its feature names ("which is Intelligence").
        } else if (kind === 'skill' && ((x = /When you make an? (\w+) skill check, you (?:may|can) use your ([\w ]+?) modifier instead of your (\w+) modifier/i.exec(s)) && x[1] === ctx.skill
          || ((x = /When you make an? \w+ \((\w+)\)(?: or \w+ \((\w+)\))? check (to .+?), you can use your ([\w ]+?) modifier instead of/i.exec(s)) && [x[1], x[2]].includes(ctx.skill) && (x = [x[0], ctx.skill, x[4], ctx.ability, x[3]])))) {
          const a = ABBR[x[2]] ? x[2] : ((new RegExp(`${x[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} modifier, which is (\\w+)`, 'i').exec(riderTexts(m).map((y) => y.text).join(' ')) || [])[1]);
          if (ABBR[a]) out.push({ label: `${x[4] ? `${x[4]}: ` : ''}${ABBR[a]} instead of ${ABBR[ctx.ability]} (${label})`, bonus: mod([a]) - mod([ctx.ability]), extra: [], on: false });
        }
      } else if (kind === 'attack' || kind === 'damage') {
        const w = ctx.w || {};
        const ab = ctx.ability || w.ability;
        if (kind === 'attack' && (x = /a bonus to the first weapon attack roll you make[^.]*? equal to your (\w+) modifier/i.exec(s)) && ABBR[x[1]]) out.push({ label, bonus: mod([x[1]]), extra: [], on: false });
        else if ((x = /you can add your (\w+) modifier to the attack roll or the damage roll of an attack you make/i.exec(s)) && ABBR[x[1]]) out.push({ label, bonus: mod([x[1]]), extra: [], on: false });
        // "your attack and damage rolls made with weapons with the finesse property or blaster weapons against that target may
        // use your Critical Analysis ability modifier, which is Intelligence, instead of Strength or Dexterity" (Critical
        // Analysis); "You can use Intelligence instead of Dexterity for the attack and damage rolls made with weapons with the
        // finesse property or blaster weapons against the target of your Ranger's Quarry" (Mark of the Meticulous).
        else if (ctx.w && (x = /attack and damage rolls made with weapons with the finesse property or blaster weapons (against [^.]+?) may use your [\w ]+?, which is (\w+), instead of|You can use (\w+) instead of (?:Strength or Dexterity|Dexterity or Strength|Dexterity|Strength) for the attack and damage rolls made with weapons with the finesse property or blaster weapons (against [^.]+?)\./i.exec(s))
          && ABBR[x[2] || x[3]] && (ctx.finesse || /blaster/i.test(w.weaponClassification || '')) && mod([classAbility(m, t.name, x[2] || x[3])]) > mod([ab])) {
          const a = classAbility(m, t.name, x[2] || x[3]);
          out.push({ label: `${(x[1] || x[4]).replace(/^against the target of your /i, 'vs ').replace(/^against /i, 'vs ')} (${ABBR[a]}, ${label})`, bonus: mod([a]) - mod([ab]), extra: [], on: false });
        // "You can use your choice of Strength or Dexterity modifier for the attack and damage rolls of blaster weapons
        // against targets within 30 feet of you" (Ballistic Approach: Firestorm).
        } else if (ctx.w && (x = /You can use your choice of (\w+) or (\w+) modifier for the attack and damage rolls of (blaster|vibro|light)\w* weapons (against [^.]+?)\./i.exec(s))
          && new RegExp(x[3], 'i').test(w.weaponClassification || '') && ABBR[x[1]] && ABBR[x[2]] && mod([x[1], x[2]]) > mod([ab])) {
          const a = mod([x[1]]) >= mod([x[2]]) ? x[1] : x[2];
          out.push({ label: `${x[4].replace(/^against /i, 'vs ')} (${ABBR[a]}, ${label})`, bonus: mod([a]) - mod([ab]), extra: [], on: false });
        // "When you make an attack roll using your Strength, you can choose to add half your Constitution modifier to the
        // attack roll" (Adaptable Fading), and its "Alternatively, when you would make an attack roll using Constitution…".
        } else if (kind === 'attack' && (x = /when you (?:would )?make an attack roll using (?:your )?(\w+), you can (?:choose to )?add half your (\w+) modifier to the attack roll/i.exec(s)) && x[1] === ab && ABBR[x[2]]) {
          out.push({ label: `half ${ABBR[x[2]]} (${label})`, bonus: Math.floor(mod([x[2]]) / 2), extra: [], on: false });
        // "You can add half your Charisma modifier (minimum of one) to any weapon damage roll you make against the marked
        // target that doesn't already include that modifier" (Exhibition Specialist).
        } else if ((x = new RegExp(`You can add half your (\\w+) modifier( \\(minimum of one\\))? to any weapon ${kind === 'attack' ? 'attack' : 'damage'} roll you make (against [^.]+?) that doesn't already include that modifier`, 'i').exec(s)) && ABBR[x[1]] && ab !== x[1]) {
          out.push({ label: `${x[3].replace(/^against /i, 'vs ')} (${label})`, bonus: x[2] ? Math.max(1, Math.floor(mod([x[1]]) / 2)) : Math.floor(mod([x[1]]) / 2), extra: [], on: false });
        // "you can expend up to 3 focus points to grant one Echani weapon you touch a bonus to attack and damage rolls when you
        // attack with it. The bonus equals the number of points you spent" (Sharpen the Blade): +1 to +3 on those weapons.
        } else if (ctx.w && (x = /expend up to (\d+) (\w+) points to grant one (\w+) weapon you touch a bonus to attack and damage rolls/i.exec(s))
          && typeof weaponKindsOf === 'function' && m.raw && weaponKindsOf(m.raw).some((k) => k.kind === x[3] && k.names.some((n) => invSameName(n, w.name) || invSameName(n.replace(/s$/, ''), w.name)))) {
          for (let n = 1; n <= num(x[1]); n++) out.push({ label: `${label} (${n} ${x[2]} point${n > 1 ? 's' : ''} when started)`, bonus: n, extra: [], on: false, group: label });
        }
      }
    }
  }
  return out.filter((r) => r.bonus > 0 || r.extra.length).filter((r, i, all) => all.findIndex((y) => y.label === r.label) === i);
}
/**
 * Is an option under a feature's "#### Name" heading the character's? Options to choose from ("Hunter's Prey", "Gambler
 * Discoveries: … you can choose from any of the following"): when the character has picked any (the feature's notes or the
 * classes' picks), only those; sub-sections of a feature that gives all of them (Force-Empowered Self's three effects): yes.
 */
function optionPicked(m, feature, sub) {
  const t = (arr(m.allFeatures).find((f) => f.name === feature) || {});
  const text = String(t.text || t.description || '');
  const picks = arr(m.raw && m.raw.classes).flatMap((k) => Object.values(k.options || {}).flatMap((ps) => arr(ps).map((p) => p && p.name)))
    .concat(typeof featureNoteOf === 'function' && m.raw ? [featureNoteOf(m.raw, feature)] : []).filter(Boolean).join(' | ').toLowerCase();
  if (picks.includes(sub.toLowerCase())) return true;
  // A list to choose from ("choose", "of your choice", "from any of the following"): not picked.
  if (/\bchoose\b|\bof your choice\b|\bfrom (?:any of )?the following\b|\bselect\b/i.test(text.split(/####/)[0])) return false;
  return true;
}
/**
 * The ability a class feature uses, after a substitution the character picked: "You can substitute Wisdom or Charisma
 * (chosen when you study this discipline) for Intelligence for your scholar class features, except for other discoveries
 * and Academic Pursuit features" (Rancor's Discipline, its pick's note naming the ability). The better one ("can").
 */
function classAbility(m, feature, ability) {
  const mod = (a) => num((((m.c.abilityScores || {})[a]) || {}).modifier);
  for (const k of arr(m.raw && m.raw.classes)) {
    for (const p of Object.values(k.options || {}).flatMap((ps) => arr(ps))) {
      const t = riderTexts(m).find((x) => x.name === p.name);
      const x = t && new RegExp(`You can substitute (\\w+) or (\\w+) \\([^)]*\\) for ${ability} for your ${k.name.toLowerCase()} class features`, 'i').exec(t.text);
      if (!x || feature === p.name) continue;
      const chosen = [x[1], x[2]].find((a) => new RegExp(`\\b(?:${a}|${ABBR[a] || a})\\b`, 'i').test(`${p.note || ''} ${typeof featureNoteOf === 'function' ? featureNoteOf(m.raw, p.name) : ''}`));
      if (chosen && mod(chosen) > mod(ability)) return chosen;
    }
  }
  return ability;
}
/** Is a feature's state, form or stance on now ("Niman Form (lightsaber form)" → the started "Niman Form")? */
function stateOn(m, name) {
  const base = String(name).replace(/ \([^)]*\)$/, '').toLowerCase();
  return !!m.snap && tempEffects(m.snap.key).some((e) => String(e.name || '').toLowerCase() === base || String(e.group || '').toLowerCase() === `state:${base}`);
}
/**
 * What the character can add to its AC against one attack, as a reaction or a free roll: "roll a Kinetic Combat die and
 * add it to your AC (no action required)" (Deflection, 1 force point), "roll a d4 and add it to your AC against one
 * attack" (Splashclass Sentinel), "add half your Wisdom or Charisma modifier … to your AC against one attack" (Shien Form,
 * while adopted). ["Deflection +1d8 (1 force point)"]
 */
function acReactions(m) {
  const out = [];
  const mod = (list) => Math.max(...list.map((a) => num((((m.c.abilityScores || {})[a]) || {}).modifier)));
  for (const t of riderTexts(m)) {
    const spend = /\bcosts? 1 force point\b|\bspend 1 force point\b/i.test(t.text) ? ' (1 force point)' : '';
    for (const s0 of t.text.split(/(?<=\.)\s+(?=[-A-Z_*#])/)) {
      let x;
      if ((x = /\broll an? (?:([A-Z][\w' ]+?) die|(d\d+)) and add it to your AC\b/i.exec(s0))) {
        const col = x[1] && arr(m.classDice).find((d) => d.dice && d.column.toLowerCase() === x[1].toLowerCase());
        const dice = col ? col.dice : x[2] ? `1${x[2]}` : '';
        if (dice) out.push(`${headingOf(s0) || t.name} +${dice}${spend}`);
      } else if ((x = /add half your (\w+) or (\w+) modifier \(your choice, minimum of \+1\) to your AC against one attack/i.exec(s0)) && stateOn(m, t.name)) {
        out.push(`${t.name.replace(/ \([^)]*\)$/, '')} +${Math.max(1, Math.floor(mod([x[1], x[2]]) / 2))}`);
      }
    }
  }
  return [...new Set(out)];
}
/** The class level behind a feature's "_**Berserker:** 9th, 13th, and 17th level_" (a class or archetype name). */
function ownerLevel(m, owner) {
  const k = arr(m.raw && m.raw.classes).find((x) => x.name === owner || (x.archetype && x.archetype.name === owner));
  return k ? num(k.levels) : charLevel(m);
}
/** How many of a feature's levels the character has reached (Brutal Critical at 9th, 13th and 17th: 1 to 3). */
function levelsReached(m, text) {
  const h = /_\*\*([^*]+?):\*\* ([^_]+?) level_/.exec(text);
  if (!h) return 1;
  const lv = ownerLevel(m, h[1]);
  return Math.max(1, [...h[2].matchAll(/(\d+)(?:st|nd|rd|th)/g)].filter((x) => num(x[1]) <= lv).length);
}
/** A sentence's own heading: "#### Double Strike When you hit…", "***Double Strike.*** You can roll…". */
function headingOf(s) {
  const x = /^#+\s*([A-Z][\w'’ -]+?)\s+(?=When|Whenever|Once|You|If|Your|As|At|While)/.exec(s) || /^\*{2,3}([^*.]+)\.?\*{2,3}/.exec(s);
  return x ? x[1].trim() : '';
}
/**
 * Extra damage a hit can deal, read from a feature's text, for the weapon damage card: [{ name, label, dice, column,
 * steps, weaponDice, levelOf, ability, melee, ranged, finesseOrRanged, crit, on, spend }]. The wordings:
 * - extra dice on a hit: "you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage"
 *   (Shadow Strike: "The extra damage increases to 2d6 at 11th level"), "the creature takes an extra 1d8 damage"
 *   (Improved Force-Empowered Strikes), "you can deal 1d4 additional damage … as shown in the Ranger's Quarry column"
 *   (the column's die), "roll a Kinetic Combat die and deal additional damage" (Double Strike), "extra damage equal to your
 *   Ranger's Quarry Damage Die" (Mark of the Slayer), "the attack deals an extra 2d6 damage" (Surprise Attack);
 * - a bonus: "additional damage equal to your focus ability modifier (a minimum of +1)" (Guided Strikes), "a bonus to the
 *   first melee weapon damage rolls … equal to your Charisma modifier" (Aura of Hatred), "The extra damage equals your
 *   level" (Fury of the Small);
 * - critical hits: "roll one additional weapon damage die when determining the extra damage for a critical hit with a
 *   melee attack" (Brutal Critical, once per level listed), "roll one of the weapon's damage dice one additional time"
 *   (Savage Attacks), "a bonus to that weapon's damage roll equal to your fighter level" (Devastating Critical).
 * Conditions: "melee weapon attack", "ranged weapon attack", "the attack must use a finesse or a ranged weapon". Ticked at
 * first only when unconditional ("Whenever you hit a creature with a melee weapon attack, …") or on a critical hit.
 * Not read: what allies, companions or powers deal, what a forgone die buys, force points spent per die (resourceConds).
 */
function riderSpecs(name, text) {
  const out = [];
  const sentences = text.split(/(?<=\.)\s+(?=[-A-Z_*#])/);
  const column = (/as shown in the ([A-Z][\w' ]+?) column/.exec(text) || [])[1] || '';
  const spend = /\bcosts? 1 force point\b|\bspend 1 force point\b/i.test(text) ? { op: 'force', arg: '1', what: '1 force point' } : null;
  // The option a sentence belongs to: the last "#### Colossus Slayer …" heading before it (Hunter's Prey lists three).
  let sub = '';
  sentences.forEach((s0, i) => {
    if (/^#{4,}\s/.test(s0)) sub = headingOf(s0);
    else if (/^#{1,3}\s/.test(s0)) sub = '';
    // The sentence without its heading ("#### Aura of Hatred You and…", "***Double Strike.*** You…") or list dash.
    const s = s0.replace(/^#+\s*[A-Z][\w'’ -]+?\s+(?=When|Whenever|Once|You|If|Your|As|At|While)/, '').replace(/^\*{2,3}[^*.]+\.?\*{2,3}\s*/, '').replace(/^[-#*_ ]+/, '');
    const listItem = /^- /.test(s0) || /following benefits/i.test(sentences.slice(Math.max(0, i - 2), i).join(' '));
    if (/\bforgo|\ban ally\b|\ballies\b|\bthe next ally|your ally|companion|turret|droid|\bburst\b|\brapid\b|\bpowers? (?:you cast|that)|expend force points|regain|temporary hit points|\bmodified\b|by the shot|\busing an? [A-Z]\w+ weapon/i.test(s)) return;
    if (/friendly creature/i.test(s) && !/^You and friendly creatures/i.test(s)) return;
    // "Additionally, on a hit, you deal an extra 1d8 damage": the sentence before says which attack.
    const ctx = /^(?:Additionally|On a hit|This)\b/i.test(s) ? `${sentences[i - 1] || ''} ${s}` : s;
    const meleeOnly = /\bmelee (?:weapon )?(?:attack|weapon damage|strike)/i.test(ctx) && !/\branged weapon attack/i.test(ctx);
    const rangedOnly = /\branged weapon attack/i.test(ctx) && !/\bmelee/i.test(ctx);
    // "At 11th level, once per turn, when you hit…": from that level of the class or archetype.
    const minLevel = num((/^At (\d+)(?:st|nd|rd|th) level\b/i.exec(s) || [])[1]);
    const base = { name, sub, melee: meleeOnly, ranged: rangedOnly, finesseOrRanged: /must use a finesse or a ranged weapon/i.test(text), spend: null, minLevel };
    const unconditional = /^Whenever you hit\b/i.test(s) && !/\byou can\b|\bif\b|\bonce\b|\bfirst\b/i.test(s);
    let x;
    // Critical hits.
    if ((x = /roll (one|two|three|\d+) additional weapon damage dic?e? when determining the extra damage for a critical hit with a (melee )?attack/i.exec(s))) {
      out.push({ ...base, crit: true, weaponDice: { one: 1, two: 2, three: 3 }[x[1].toLowerCase()] || num(x[1]), perLevel: true, melee: !!x[2], on: true });
      return;
    }
    if ((x = /When you score a critical hit with a (melee )?weapon attack, you can roll one of the weapon(?:'|’)s damage dice one additional time/i.exec(s))) {
      out.push({ ...base, crit: true, weaponDice: 1, melee: !!x[1], on: true });
      return;
    }
    if ((x = /When you score a critical hit with a (melee )?weapon attack, you gain a bonus to that weapon(?:'|’)s damage roll equal to your (\w+) level/i.exec(s))) {
      out.push({ ...base, crit: true, levelOf: titleCase(x[2]), melee: !!x[1], on: true });
      return;
    }
    if (/critical hit/i.test(s)) return;
    // "you can cause the attack or power to deal extra damage to the creature. The extra damage equals your level."
    if (/\battack\b[^.]*extra damage to the creature/i.test(s) && /^The extra damage equals your level/i.test(sentences[i + 1] || '')) {
      out.push({ ...base, levelOf: '', on: false });
      return;
    }
    if ((x = /\broll an? (?:([A-Z][\w' ]+?) die|(d\d+)) and deal additional damage/i.exec(s))) {
      // Its attack can be in an earlier sentence: "When you hit a creature with a melee weapon attack, you can spend 1 force point".
      const melee = base.melee || /hit a creature with a melee weapon attack, you can (?:spend|expend)/i.test(text);
      out.push({ ...base, melee, dice: x[2] ? `1${x[2]}` : '', column: x[1] || column, label: headingOf(s0), spend, on: false });
      return;
    }
    if (!/\bhit\b|\bfirst (?:ranged |melee )?weapon (?:attack|damage)|\battack deals\b/i.test(s)) return;
    // Extra dice.
    if ((x = /\b(?:deal|deals|takes?) an? extra (\d*d\d+) (?:\w+ )?damage\b|\b(?:deal|deals) (\d*d\d+) additional damage\b/i.exec(s))) {
      // "The extra damage increases to 2d6 at 11th level and 3d6 at 17th level", "This damage increases to 1d10 at 13th level".
      const more = /(?:extra|This) damage increases to [^.]*/i.exec(text);
      const steps = more ? [...more[0].matchAll(/(\d*d\d+) at (\d+)(?:st|nd|rd|th) level/gi)].map((y) => ({ dice: y[1], level: num(y[2]) })) : [];
      out.push({ ...base, dice: (x[1] || x[2]).replace(/^d/, '1d'), column, steps, on: unconditional && !listItem });
      return;
    }
    if ((x = /(?:extra|additional) damage equal to (?:your |the )?([A-Z][\w' ]+?) (?:Damage )?Die\b/i.exec(s))) {
      out.push({ ...base, column: x[1], on: false });
      return;
    }
    // Bonuses.
    if ((x = /(?:additional damage|a bonus to the (?:first )?(?:melee )?weapon damage rolls?[^.]*?) equal to (?:your )?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|focus ability) modifier( \((?:your choice, )?(?:a )?minimum of (?:\+?1|one)\))?/i.exec(s))) {
      out.push({ ...base, ability: x[1], min1: !!x[2], on: false });
    }
  });
  return out;
}
/**
 * The riders for a weapon damage roll, as roll options: riderSpecs over the character's texts (a column's die from the
 * class table), and Rage Damage.
 */
function weaponRiders(m, w, crit, die) {
  const out = [];
  const texts = riderTexts(m);
  const all = texts.map((t) => t.text).join(' ');
  const melee = !isRangedWeapon(w);
  const ability = weaponAbility(m, w);
  const finesse = isFinesseWeapon(m, w);
  const props = wProps(w);
  const unarmed = w.name === 'Unarmed Strike';
  const colDice = (col) => { const d = arr(m.classDice).find((x) => x.dice && x.column.toLowerCase() === String(col).toLowerCase()); return d ? d.dice : ''; };
  const mod = (a) => num((((m.c.abilityScores || {})[a]) || {}).modifier);
  for (const t of texts) {
    for (const r of riderSpecs(t.name, t.text)) {
      if (r.crit && !crit) continue;
      if (r.minLevel && ownerLevel(m, (/_\*\*([^*]+?):\*\*/.exec(t.text) || [])[1]) < r.minLevel) continue;
      if ((r.melee && !melee) || (r.ranged && melee)) continue;
      if (r.finesseOrRanged && !finesse && melee) {
        // "you can deal Sneak Attack damage with any weapon, as long as it does not have the heavy or special properties"
        // (Pugnacity Practice); "you can apply your Sneak Attack damage when you hit with an unarmed strike even if it
        // doesn't have the finesse property" (Disabling Practice).
        const nm = (r.column || r.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const any = new RegExp(`deal ${nm} damage with any weapon, as long as it does not have the (\\w+) or (\\w+) properties`, 'i').exec(all);
        const okAny = any && !props.some((p) => p.startsWith(any[1].toLowerCase()) || p.startsWith(any[2].toLowerCase()));
        const okUnarmed = unarmed && new RegExp(`apply your ${nm} damage when you hit with an unarmed strike`, 'i').test(all);
        if (!okAny && !okUnarmed) continue;
      }
      let dice = (r.column && colDice(r.column)) || r.dice;
      if (r.steps && r.steps.length) {
        const lv = ownerLevel(m, (/_\*\*([^*]+?):\*\*/.exec(t.text) || [])[1]);
        for (const s of r.steps) if (lv >= s.level) dice = s.dice;
      }
      // One option of several ("Hunter's Prey: Colossus Slayer, Giant Killer or Horde Breaker"): only the one picked,
      // when the picks are known (its notes or the archetype's list).
      if (r.sub && !optionPicked(m, t.name, r.sub)) continue;
      const label = r.label || r.sub || t.name;
      if (r.weaponDice) {
        const n = r.weaponDice * (r.perLevel ? levelsReached(m, t.text) : 1);
        if (die > 0) out.push({ label, bonus: 0, extra: [`${n}d${die}`], on: r.on, noDouble: true });
      } else if (r.levelOf != null) {
        const lv = r.levelOf ? ownerLevel(m, r.levelOf) : charLevel(m);
        if (lv) out.push({ label, bonus: lv, extra: [], on: r.on });
      } else if (r.ability) {
        const v = /focus/i.test(r.ability) ? Math.max(mod('Wisdom'), mod('Charisma')) : mod(r.ability);
        const b = r.min1 ? Math.max(1, v) : v;
        if (b) out.push({ label, bonus: b, extra: [], on: r.on });
      } else if (dice) {
        out.push({ label: `${label}${r.spend ? ` (${r.spend.what})` : ''}`, bonus: 0, extra: [dice], on: r.on, ...(r.spend ? { spend: r.spend } : {}) });
      }
    }
  }
  // Weapon focuses on this weapon: "When you score a critical hit with the weapon, you can roll one additional weapon
  // damage die" (Polearm Focus, Rifle Focus).
  if (crit && die > 0 && typeof chPickTexts === 'function' && typeof choiceInfo === 'function' && state.rules && m.raw) {
    const res = choiceInfo(m);
    for (const p of res ? chPickTexts(res) : []) {
      if (!/When you score a critical hit with the weapon, you can roll one additional weapon damage die/i.test(p.text || '')) continue;
      // "… while wielding any of these weapons, if you are proficient with it": the focus applies to this weapon (its
      // other benefits are on it, which the sheet gives only with proficiency).
      const applied = arr(m.fx && m.fx.weaponTweaks).some((t) => t.index === w.index && t.effect && t.effect.name === p.name);
      if (applied && arr(p.weapons).some((n) => weaponIndexByName(m.raw, n) === w.index)) out.push({ label: p.name, bonus: 0, extra: [`1d${die}`], on: true, noDouble: true });
    }
  }
  // A state on now whose benefits say "Your weapon attacks deal an extra 1d6 damage" (Totemic Might): ticked.
  for (const e of m.snap ? tempEffects(m.snap.key).filter((x) => x.source === 'feature') : []) {
    for (const n of arr(e.notes)) {
      const x = /\byour weapon attacks deal an extra (\d*d\d+) (?:\w+ )?damage\b/i.exec(n);
      if (x) out.push({ label: e.name, bonus: 0, extra: [x[1].replace(/^d/, '1d')], on: true });
    }
  }
  // Rage Damage: "When you make a melee weapon attack using Strength, you gain a bonus to the damage roll"; also "to
  // damage rolls from ranged weapon attacks using Strength" (Ballistic Approach) and "when you make a melee weapon attack
  // using Dexterity, you add your rage damage" (Precision Approach). While raging it's ticked, unless the rage already put
  // it in this weapon's numbers (a damage tweak from the raging state, once the numbers are recalculated).
  const rage = arr(m.classDice).find((d) => d.bonus && /rage damage/i.test(d.column));
  if (rage) {
    const raging = !!m.snap && tempEffects(m.snap.key).some((e) => e.group === 'state:raging');
    const fits = (melee && ability === 'Strength') || (!melee && ability === 'Strength' && /rage damage to damage rolls from ranged weapon attacks using Strength/i.test(all))
      || (melee && ability === 'Dexterity' && /melee weapon attack using Dexterity, you add your rage damage/i.test(all));
    const byRage = (t) => t.effect && t.effect.group === 'state:raging' && num(t.bonus);
    const inNumbers = raging && !m.stale && (unarmed ? arr(m.fx && m.fx.tweaks).some((t) => t.path === 'unarmed.damage' && byRage(t))
      : arr(m.fx && m.fx.weaponTweaks).some((t) => t.index === w.index && t.path === 'damage' && byRage(t)) || arr(m.fx && m.fx.tweaks).some((t) => t.path === 'weapon.damage' && byRage(t)));
    if (fits && !inNumbers) out.push({ label: rage.column, bonus: rage.bonus, extra: [], on: raging });
  }
  // The same rider from two texts (a feature and its table): once.
  return out.filter((r, i) => out.findIndex((y) => y.label === r.label) === i);
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
      // Half proficiency on every check, on this ability's (Cunning Intellect: halfProf lists them), or an item's (halfProfChecks).
      const half = arr(m.effects).find((e) => e.halfProf === true || (Array.isArray(e.halfProf) && e.halfProf.includes(a1)) || arr(e.halfProfChecks).includes(a1));
      if (half && Math.floor(pb / 2)) r.base.push({ label: `half proficiency (${half.name})`, value: Math.floor(pb / 2) });
      r.conds.push(...d20Options(m, 'check', { ability: a1 }));
      return r;
    }
    case 'save': {
      const r = d20(`${a1} saving throw`, num(((sc[a1] || {}).savingThrow || {}).modifier), `abilityScores.${a1}.savingThrow.modifier`);
      r.conds.push(...d20Options(m, 'save', { ability: a1 }));
      return r;
    }
    case 'skill': {
      const k = arr((sc[a1] || {}).skills)[a2] || {};
      const r = d20(`${k.name} (${ABBR[a1]})`, num(k.modifier), `abilityScores.${a1}.skills.${a2}.modifier`);
      // Conditional expertise: "Whenever you make a Charisma (Persuasion) check related to conducting business, you are
      // considered to have expertise in the Persuasion skill" (Mercantile), "… check involving smell, …" (Acute Smell),
      // "… an Intelligence (Nature) or Intelligence (Technology) check related to food…, … expertise in the skill",
      // "you are considered to have expertise in Wisdom (Survival) checks made to navigate". Offered with what expertise
      // adds over the skill's own proficiency (half proficiency from Know a Bit counts as already there).
      if (k.proficiency !== 'expertise') {
        const path = `abilityScores.${a1}.skills.${k.name}`;
        const have = k.proficiency === 'proficient' ? pb : arr(m.fx && m.fx.tweaks).filter((t) => t.path === path && ((t.effect && t.effect.halfProf) || (t.mod && t.mod.halfProf))).reduce((s, t) => s + num(t.bonus), 0);
        for (const f of riderTexts(m)) {
          for (const s of f.text.split(/(?<=\.)\s+/)) {
            if (!/\bconsidered to have expertise in\b/i.test(s)) continue;
            const skills = [...s.matchAll(/\(([A-Z][\w ]+?)\)/g), ...s.matchAll(/\b(?:an?|the) ([A-Z]\w+) (?:check|skill)\b/g)].map((x) => x[1]);
            if (!skills.includes(k.name)) continue;
            const cond = (/\bchecks? ((?:related to|involving|against|made to|to)\b.+?)(?:,?\s+you (?:are|can)\b|\.$)/i.exec(s) || [])[1];
            if (!cond || r.conds.some((c) => c.label.endsWith(`(${f.name})`))) continue;
            const label = cond.replace(/^(?:related to|involving|made to)\s+/i, '').replace(/^conducting /i, '');
            r.conds.push({ label: `${label} (${f.name})`, bonus: 2 * pb - have, extra: [], on: false });
          }
        }
      }
      r.conds.push(...d20Options(m, 'skill', { skill: k.name, ability: a1, prof: k.proficiency }));
      return r;
    }
    case 'init': {
      const r = d20('Initiative', num(c.initiative), 'initiative');
      r.conds.push(...d20Options(m, 'init'));
      return r;
    }
    case 'tool': {
      const level = a2 || 'proficient';
      const ability = opts.ability || a3 || 'Intelligence';
      const mult = /expert/i.test(level) ? 2 : /half/i.test(level) ? 0.5 : 1;
      const r = d20(`${a1} check`, 0, null, { toolAbility: ability });
      r.base = [{ label: `${ABBR[ability]} modifier`, value: num((sc[ability] || {}).modifier) }, { label: `proficiency${mult === 2 ? ' ×2' : ''}`, value: Math.floor(pb * mult) }];
      // "Whenever you make an ability check with the chosen kit and you don't have disadvantage on the check, you can treat a
      // d20 roll of 9 or lower as a 10, as long as you spend at least 1 minute on the check" (Specialist, its notes naming
      // the kit): an option that raises the kept d20.
      for (const f of riderTexts(m)) {
        const x = /with the chosen kit and you don't have disadvantage on the check, you can treat a d20 roll of (\d+) or lower as an? (\d+)(, as long as [^.]+)?/i.exec(f.text);
        const kit = x && typeof featureNoteOf === 'function' && m.raw ? featureNoteOf(m.raw, f.name) : '';
        if (x && kit && String(a1).toLowerCase().includes(kit.toLowerCase().replace(/s$/, '').trim())) {
          r.conds.push({ label: `d20 of ${x[1]} or lower counts as ${x[2]}${x[3] ? ` (${x[3].replace(/^, as long as /, '').trim()})` : ''} (${f.name})`, bonus: 0, extra: [], on: false, d20Min: num(x[2]) });
        }
      }
      return r;
    }
    case 'attack': {
      const w = arr(c.weapons)[a1] || {};
      // Improved Critical and the like: a critical hit on 19–20 (or lower).
      // Increases add up (Improved Critical +1 and Blade Supremacy +1: 18–20); weapon supremacy and modifications
      // widen it only for their weapons.
      const seen = new Set();
      // critWeapons: the weapons' indexes, or 'unarmed' ("your critical hit range with unarmed strikes increases by 1").
      // critOn: which attacks ("…with melee weapon attacks using Dexterity").
      const critFits = (e) => !e.critOn || typeof e.critOn !== 'object' || ((!e.critOn.melee || !/blaster/i.test(w.weaponClassification || '')) && (!e.critOn.ability || w.ability === e.critOn.ability));
      const wider = arr(m.effects).filter((e) => num(e.critRange) > 0 && (!e.critWeapons || e.critWeapons.includes(w.name === 'Unarmed Strike' ? 'unarmed' : w.index)) && critFits(e) && !seen.has(e.id) && seen.add(e.id));
      // The weapon's own keen property ("the critical hit range increases by an amount equal to the keen number"),
      // unless a keen modification on it already counts it (its effect's critRange is the weapon's keen number).
      const keen = wider.some((e) => e.keen) ? 0 : num((/\bkeen (\d+)/i.exec(propsText(w.properties)) || [])[1]);
      const add = wider.reduce((t, e) => t + num(e.critRange), 0) + keen;
      const vers = /\bversatile \((\d*d\d+)\)/i.exec(propsText(typeof weaponProps === 'function' ? weaponProps(m, w) : w.properties));
      const atk = d20(`${w.name} attack`, num(w.attackBonus), `weapons.${a1}.attackBonus`, {
        next: { spec: `damage|${a1}`, two: vers ? vers[1].replace(/^d/, '1d') : null }, critMin: Math.max(2, 20 - add),
        critFrom: wider.map((e) => e.name).concat(keen ? [`keen ${keen}`] : []).join(' + '),
      });
      atk.conds.push(...resourceConds(m, 'attack', w), ...d20Options(m, 'attack', { w, ability: weaponAbility(m, w), finesse: isFinesseWeapon(m, w) }));
      // A two-handed weapon with a shield equipped (W-149): say so before the roll.
      const hc = typeof handsConflict === 'function' && m.raw ? handsConflict(m.raw) : null;
      const ent = w.index >= 0 ? arr(m.raw && m.raw.equipment)[w.index] : null;
      if (hc && ent && hc.weapons.includes(ent.label || ent.name)) atk.warn = handsWarning(hc);
      return atk;
    }
    case 'damage': { // damage|weapon|crit?|two? (two: the versatile weapon held in two hands)
      const w = arr(c.weapons)[a1] || {};
      // The weapon's properties with its modifications' (a Versatile Frame's versatile (1d10), a Brutal Cell's brutal 1).
      const props = propsText(typeof weaponProps === 'function' ? weaponProps(m, w) : w.properties);
      const vers = a3 === 'two' && /\bversatile \((\d*)d(\d+)\)/i.exec(props);
      const n = vers ? (num(vers[1]) || 1) : num(w.damageNumberOfDice);
      const die = vers ? num(vers[2]) : num(w.damageDieType);
      const crit = a2 === 'crit';
      // Damage riders from the features' text, for this weapon (Sneak Attack on finesse or ranged weapons, Rage Damage on
      // melee Strength attacks, Ranger's Quarry, critical-hit dice…): weaponRiders.
      const conds = condsAt(`weapons.${a1}.damageBonus`).concat(weaponRiders(m, w, crit, die), resourceConds(m, 'damage', w), d20Options(m, 'damage', { w, ability: weaponAbility(m, w), finesse: isFinesseWeapon(m, w) }));
      // Weapon Expert: "You gain proficiency with all blasters. If you are already proficient with all blasters, instead
      // once per turn when you would roll weapon damage using a blaster, you can choose to have advantage." Already: by
      // the class, species or another feature (all of the kind, or its simple and martial ones), or the feat taken twice.
      const we = arr(m.feats).concat(arr(m.allFeatures)).find((f) => /when you would roll weapon damage using an? (blaster|lightweapon|vibroweapon)s?, you can choose to have advantage/i.test(f.text || f.description || ''));
      const weKinds = we ? [...String(we.text || we.description).matchAll(/roll weapon damage using an? (blaster|lightweapon|vibroweapon)/gi)].map((x) => x[1].toLowerCase()) : [];
      const profNames = arr(c.proficiencies).filter((p) => p && /weapon|other/.test(p.type || '')).map((p) => p.name)
        .concat(arr(m.effects).filter((e) => !we || e.name !== we.name).flatMap((e) => arr(e.weapons))).map((p) => String(p).toLowerCase().trim());
      const twice = we && typeof featNamesOf === 'function' && m.raw ? featNamesOf(m.raw, true).filter((n) => n === we.name).length > 1 : false;
      const allOf = (k) => twice || profNames.includes(`all ${k}s`) || (profNames.includes(`simple ${k}s`) && profNames.includes(`martial ${k}s`));
      const dmgAdv = weKinds.some((k) => new RegExp(k, 'i').test(w.weaponClassification || '') && allOf(k)) ? we.name : '';
      // Dice items add on every hit ("deal an additional 1d10 damage with this enhanced weapon"): rolled with the weapon's.
      const more = typeof weaponExtraDice === 'function' ? weaponExtraDice(m, w) : [];
      const moreDice = more.flatMap((x) => { const p = parseDice(x.dice); return p ? p.dice.map((d) => d.sides) : []; });
      return {
        kind: 'dice', label: `${w.name} damage${vers ? ' (two-handed)' : ''}${crit ? ' (critical)' : ''}`, spec, crit,
        diceSpec: (die > 0 ? Array.from({ length: n }, () => die) : []).concat(moreDice),
        // The bonus by source ("+4 STR modifier + 2 Rage"). A weapon without dice deals its damage bonus alone: the
        // unarmed strike's "1 + your Strength modifier" is already in it (as the weapons table shows it).
        base: typeof damageParts === 'function' ? damageParts(m, w) : [{ label: 'damage bonus', value: num(w.damageBonus) + num(w.damageDieModifier) }],
        conds,
        damageType: typeof weaponDamageType === 'function' ? weaponDamageType(m, w) : w.damageType && w.damageType !== 'Unknown' ? w.damageType : '',
        minTotal: 0, // a penalty can't make damage negative
        dmgAdv,
        // What the weapon's modifications do when it deals damage (Celerity Oscillator); the dice items add.
        notes: (typeof modHitNotes === 'function' ? modHitNotes(m, w) : []).concat(more.map((x) => `${x.from}: +${x.dice}${x.type ? ` ${x.type}` : ''} damage (rolled)`),
          /\bvicious (\d+)/i.test(props) ? [`Vicious ${/\bvicious (\d+)/i.exec(props)[1]}: +${/\bvicious (\d+)/i.exec(props)[1]} damage when a weapon die rolls its maximum`] : []),
        // Brutal N: "When you score a critical hit…, you roll a number of additional weapon damage dice equal to the
        // brutal number" (rolled once, not doubled).
        critExtra: crit && die > 0 ? Array.from({ length: num((/\bbrutal (\d+)/i.exec(props) || [])[1]) }, () => die) : [],
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
      // "When you roll a Hit Die to regain hit points, the minimum number of hit points you can regain from the roll equals
      // twice your Constitution modifier (minimum of 2)" (Durable).
      const dur = riderTexts(m).find((f) => /minimum number of hit points you can regain from the roll equals twice your Constitution modifier/i.test(f.text));
      const min = dur ? Math.max(2, 2 * num((sc.Constitution || {}).modifier)) : undefined;
      return { kind: 'dice', label: `Hit die (${a1})${dur ? `, at least ${min} (${dur.name})` : ''}`, spec, diceSpec: [size], base: [{ label: 'per die', value: num(m.t && m.t.lim.hitDieBonus) }], conds: [], ...(dur ? { minTotal: min } : {}) };
    }
    case 'death': { // "You have advantage on death saving throws" (Self-Sustain); "You can add your Constitution modifier to
      // death saving throws you make" (Unnatural Resilience).
      const r = { kind: 'd20', label: 'Death saving throw', spec, base: [], conds: [] };
      for (const f of riderTexts(m)) {
        if (/\byou have advantage on death saving throws\b/i.test(f.text)) r.advFrom = f.name;
        const x = /\byou can add your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier to death saving throws\b/i.exec(f.text);
        if (x) r.base.push({ label: `${ABBR[x[1]]} modifier (${f.name})`, value: num((sc[x[1]] || {}).modifier) });
        // "…roll a d8 and add the die to a saving throw you make" (Brutish Durability): a death save is one too.
        const y = /\broll an? (d\d+) and add the die to a saving throw you make/i.exec(f.text);
        if (y && !r.conds.some((c) => c.label === f.name)) r.conds.push({ label: f.name, bonus: 0, extra: [`1${y[1]}`], on: false });
      }
      return r;
    }
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
      // "You add your Intelligence modifier to Constitution saving throws you make to maintain concentration" (Focused
      // Augmentation).
      for (const f of riderTexts(m)) {
        const x = /\bYou add your (\w+) modifier to Constitution saving throws you make to maintain concentration/i.exec(f.text);
        if (x && ABBR[x[1]]) r.base.push({ label: `${ABBR[x[1]]} modifier (${f.name})`, value: num((sc[x[1]] || {}).modifier) });
      }
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
      // A plain d20 ("d20", "1d20+3"): a d20 roll of its own (advantage, disadvantage, a DC), nothing of the character's.
      if (!a2 && p.dice.length === 1 && p.dice[0].sides === 20 && p.dice[0].sign > 0) {
        return { kind: 'd20', plain: true, label: `d20${p.mod ? ` ${signed(p.mod)}` : ''}`, spec, base: p.mod ? [{ label: 'modifier', value: p.mod }] : [], conds: [] };
      }
      // dice|1d6+3|Ichor Lightning damage|necrotic: a named roll (a feature's special attack), with its damage type.
      // (Unnamed: plain dice, picked or typed; their name follows the dice as they change.)
      return { kind: 'dice', label: a2 || a1, spec, diceSpec: p.dice.map((d) => d.sides * d.sign), base: p.mod ? [{ label: a2 ? 'ability modifier' : 'modifier', value: p.mod }] : [], conds: [],
        ...(a2 ? {} : { plain: true }), ...(a3 ? { damageType: titleCase(a3), minTotal: 0 } : {}) };
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
    id: rollId(), char: snap ? snap.raw.name : '', key: snap ? snap.key : null,
    mode: 'normal', custom: 0, rolled: false, at: null, ...r,
    dice: r.kind === 'd20' ? [newDie(20, 'd20', false)] : arr(r.diceSpec).map((s) => ({ ...newDie(Math.abs(s), 'base', false), sign: s < 0 ? -1 : 1 })),
  };
  if (roll.crit) roll.dice = roll.dice.concat(roll.dice.map((d) => critDie(d.sides, d.tag, false)), arr(r.critExtra).map((s) => critDie(s, 'base', false)));
  delete roll.critExtra;
  delete roll.diceSpec;
  // Advantage from features (Feral Impulse: initiative) and active states (Rage: Strength checks
  // and saves), unless chosen otherwise.
  // Advantage from features (Feral Impulse: initiative), active states (Rage: Strength checks and saves) and War Caster;
  // disadvantage from conditions (Poisoned…) and exhaustion; automatic failure (Stunned: Strength and Dexterity
  // saves). Advantage and disadvantage cancel out. Unless chosen otherwise.
  if (!opts.mode && snap && roll.kind === 'd20' && !roll.plain) {
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
    // A trait's plain "disadvantage on Strength saving throws" (Zilkin's Puny, a Hutt's Dexterity saves): not one with a
    // condition after it ("… against effects that would deal sonic damage").
    for (const e of arr(m.effects)) {
      for (const d of arr(e.defenses).filter((x) => x.kind === 'disadvantage')) {
        const x = /^(?:Disadvantage on )?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) (saving throws|checks)$/i.exec(String(d.what || d.text || '').trim());
        if (x && ab === titleCase(x[1].toLowerCase()) && (/saving/i.test(x[2]) ? kind === 'save' : kind === 'check' || kind === 'skill') && !dis.includes(e.name)) dis.push(e.name);
      }
    }
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
  if (snap && ((roll.kind === 'd20' && !roll.plain) || /^damage\|/.test(spec))) {
    // (An attack also counts as "an attack roll using" its weapon's ability: a spice's high.)
    const [sk, sa, si] = spec.split('|');
    const skillProf = sk === 'skill' ? (arr(((m.c.abilityScores || {})[sa] || {}).skills)[si] || {}).proficiency : null;
    const kinds = /^damage\|/.test(spec) ? ['weapon-damage'] : plRollKinds(spec)
      .concat(/^attack\|/.test(spec) ? [`attack:${(arr(m.c.weapons)[spec.split('|')[1]] || {}).ability}`] : [])
      // A skill check with or without proficiency (Skills Enhancement Package).
      .concat(skillProf != null ? [skillProf && skillProf !== 'none' ? 'skill:proficient' : 'skill:unproficient'] : []);
    // A weapon's own sometimes-dice (Hewey's charge, Charric vs heavy armor): offered on its damage, not ticked.
    const wIndex = /^damage\|/.test(spec) ? (arr(m.c.weapons)[spec.split('|')[1]] || {}).index : null;
    // (one of the same name, unless applied anyway: m.fx.notStacking)
    const leftOut = new Set(arr(m.fx && m.fx.notStacking).filter((x) => !x.kept).map((x) => x.id));
    for (const e of tempEffects(snap.key).concat(arr(m.effects).filter((x) => x.kind === 'item' && x.active && x.riders)).filter((x) => !leftOut.has(x.id))) {
      for (const rd of arr(e.riders)) {
        if (!rd.on.some((o) => kinds.includes(o))) continue;
        if (rd.weapon && (e.weaponIndex == null || e.weaponIndex !== wIndex)) continue;
        // The dice show beside the label (the card adds them): not in it as well.
        const label = `${String(e.power || e.name).replace(/ \(concentration\)$/, '')}${rd.why ? ` (${rd.why})` : ''}`;
        if (roll.conds.some((c) => c.label === label)) continue;
        roll.conds.push({ label, bonus: 0, extra: [rd.dice], on: false, consume: rd.once ? e.id : null });
        if (!rd.optional) opts.conds = arr(opts.conds).concat(label);
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
    const ids = new Map();
    roll.dice = was.dice.map((d) => { const x = { ...d, id: ++dieSeq, value: d.max ? d.value : null }; ids.set(d.id, x.id); return x; });
    // (A single die's twin, rolled for advantage, stays paired with it.)
    for (const d of roll.dice) if (d.twin) d.twin = ids.get(d.twin);
    if (was.plain) { roll.kind = was.kind; roll.label = was.label; }
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
/**
 * Advantage on any other single die (a plain d6): it's rolled twice ({ twin: the first die's id } on the second) and
 * the higher counts, or the lower with disadvantage. The pair, or [] when there's none.
 */
function twinPair(r) {
  const tw = r.dice.filter((d) => d.twin);
  if (!tw.length) return [];
  const first = r.dice.find((d) => d.id === tw[0].twin);
  return first ? [first, ...tw] : tw;
}
function keptTwin(r) {
  const ds = twinPair(r).filter((d) => d.value != null);
  if (!ds.length) return null;
  return r.mode === 'dis' ? ds.reduce((a, b) => (b.value < a.value ? b : a)) : ds.reduce((a, b) => (b.value > a.value ? b : a));
}
/** The one die a roll has (not counting a twin), or null. */
const loneDie = (r) => { const ds = r.dice.filter((d) => !d.twin); return ds.length === 1 ? ds[0] : null; };
/**
 * Does the card offer advantage / normal / disadvantage? A d20 roll from the sheet always (as it always did); any other
 * roll when it has a single die (a plain d20, a d6…), or already has its two for advantage or disadvantage.
 */
function offersModes(r) {
  if (r.kind === 'd20' && !r.plain) return true;
  if (r.mode && r.mode !== 'normal') return true;
  if (r.crit || r.dmgAdv) return false;
  return r.dice.length === 1;
}
function rollSum(r) {
  const kept = keptD20(r);
  // An option that counts a low d20 as more ("treat a d20 roll of 9 or lower as a 10", Specialist).
  const floor = Math.max(0, ...r.conds.filter((cd) => cd.on && cd.d20Min).map((cd) => num(cd.d20Min)));
  let t = kept ? Math.max(kept.value, floor) : 0;
  // Damage with advantage: the weapon's dice twice, the higher set counts.
  const set = (tag) => r.dice.filter((d) => d.tag === tag && d.value != null).reduce((s, d) => s + (d.sign || 1) * d.value, 0);
  if (r.dice.some((d) => d.tag === 'adv')) t += Math.max(set('base'), set('adv')) - set('base') - set('adv');
  // A single die rolled twice: only the one kept counts.
  const pair = twinPair(r);
  const keep = keptTwin(r);
  for (const d of r.dice) if (d.tag !== 'd20' && d.value != null && (!pair.includes(d) || d === keep)) t += (d.sign || 1) * d.value;
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
 * The dice tumble for a moment before the result shows: each drops, bounces and spins down onto the face with its
 * number (dice3d.js; the numbers are already rolled and saved, this is only how they're shown). No tumbling with
 * reduced motion.
 */
function tumble(r, ids, done) {
  clearTimeout(rollState.tumbleTimer);
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = !ids.length || still || typeof document === 'undefined' || typeof Dice3D === 'undefined' ? 0 : Dice3D.roll(ids);
  if (!ms) { rollState.tumbling = null; done(); landed(new Set(ids)); return; }
  rollState.tumbling = { id: r.id, dice: new Set(ids) };
  renderDice(false);
  rollState.tumbleTimer = setTimeout(() => {
    if (!rollState.tumbling || rollState.tumbling.id !== r.id) return;
    rollState.tumbling = null;
    done();
    landed(new Set(ids));
  }, ms + 40);
}
/** The result just landed: the total and the dice give a small pop. */
function landed(ids) {
  const dock = document.getElementById('dice');
  if (!dock) return;
  for (const el of dock.querySelectorAll('.rl-total, .rl-dice .die')) if (!ids || !el.dataset.die || ids.has(Number(el.dataset.die))) el.classList.add('landed');
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
/**
 * Advantage / normal / disadvantage, before or after rolling: a d20 roll adds or drops a d20; a roll of any other
 * single die adds or drops its twin (rolled now if the roll was made).
 */
function setMode(mode) {
  const r = rollState.current;
  if (!r || r.mode === mode || !offersModes(r)) return;
  const ds = d20s(r);
  const before = new Set(r.dice.map((d) => d.id));
  if (r.kind === 'd20' && (ds.length || !r.plain)) {
    if (mode === 'normal') {
      // Keep the first d20 rolled; drop the one added for advantage/disadvantage.
      r.dice = r.dice.filter((d) => d.tag !== 'd20' || d === ds[0]);
    } else {
      // (A d20 taken off a sheet roll comes back.)
      if (!ds.length) r.dice.unshift(newDie(20, 'd20', r.rolled));
      const first = d20s(r)[0];
      if (d20s(r).length < 2) r.dice.splice(r.dice.indexOf(first) + 1, 0, newDie(20, 'd20', r.rolled));
    }
  } else if (mode === 'normal') {
    r.dice = r.dice.filter((d) => !d.twin);
  } else if (!r.dice.some((d) => d.twin)) {
    const d = loneDie(r);
    if (!d) return;
    r.dice.splice(r.dice.indexOf(d) + 1, 0, { ...newDie(d.sides, d.tag, r.rolled), ...(d.sign < 0 ? { sign: -1 } : {}), twin: d.id });
  }
  r.mode = mode;
  afterAmend(before);
}
function addDice(sides, count = 1) {
  const r = rollState.current;
  if (!r) return;
  const before = new Set(r.dice.map((d) => d.id));
  for (let i = 0; i < count; i++) {
    // The first die of an empty plain roll makes it a d20 roll (a natural 20, a DC) or a roll of dice; a d20 put back
    // on a d20 roll that had lost its own is that roll's d20 again.
    let tag = 'extra';
    if (r.plain && !r.dice.length) { r.kind = sides === 20 ? 'd20' : 'dice'; tag = sides === 20 ? 'd20' : 'base'; }
    else if (sides === 20 && r.kind === 'd20' && !d20s(r).length) tag = 'd20';
    r.dice.push(newDie(sides, tag, r.rolled));
  }
  afterAmend(before);
}
/**
 * Take a die off. The last one leaves an empty card: a new plain roll, not rolled, that the Add buttons fill. The roll
 * it was (a sheet roll's name, modifiers and options, the next step) is done with: rolled, it stays in the log as it
 * last was; not rolled, it's dropped.
 */
function removeDie(id) {
  const r = rollState.current;
  if (!r) return;
  const d = r.dice.find((x) => x.id === Number(id));
  if (!d) return;
  if (r.dice.length === 1) {
    rollState.current = { id: rollId(), char: r.char, key: r.key, kind: 'dice', plain: true, label: 'Plain dice', spec: 'dice|', mode: 'normal',
      custom: 0, rolled: false, at: null, dice: [], base: [], conds: [] };
    renderDice(false);
    return;
  }
  r.dice = r.dice.filter((x) => x !== d);
  if (d.tag === 'd20') {
    if (d20s(r).length < 2) r.mode = 'normal';
  } else if (d.twin || r.dice.some((x) => x.twin === d.id)) {
    // One of a single die's two (advantage): the other is the die now.
    r.dice = r.dice.map((x) => { if (!x.twin) return x; const { twin, ...rest } = x; return rest; }); // eslint-disable-line no-unused-vars
    r.mode = 'normal';
  } else if (d.tag.startsWith('cond:')) {
    const cd = r.conds.find((x) => `cond:${x.label}` === d.tag);
    if (cd && !r.dice.some((x) => x.tag === d.tag)) cd.on = false;
  }
  afterAmend();
}
function toggleCond(i) {
  const r = rollState.current;
  const cd = r && r.conds[i];
  if (!cd) return;
  cd.on = !cd.on;
  const tag = `cond:${cd.label}`;
  const before = new Set(r.dice.map((d) => d.id));
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
  afterAmend(before);
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
/** After a change to the roll. before: the dice it had, so new ones are shown arriving (or, once rolled, tumbling). */
function afterAmend(before) {
  const r = rollState.current;
  const added = r && before ? r.dice.filter((d) => !before.has(d.id)).map((d) => d.id) : [];
  if (r && r.plain) namePlain(r);
  if (r && r.rolled) {
    r.amended = true;
    saveRollLog();
    if (added.length) { tumble(r, added, () => renderDice(false)); return; }
  }
  // New dice roll in.
  if (added.length && typeof Dice3D !== 'undefined') Dice3D.enter(added);
  renderDice(false);
}
const rollId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
/**
 * Plain dice are named after their dice ("2d6 + d4 +3"), and "Roll again" rolls the same. Before rolling, a lone
 * d20 left in a plain roll of dice becomes a d20 roll (a natural 20 shows).
 */
function namePlain(r) {
  if (!r.rolled && r.kind === 'dice' && r.dice.length === 1 && r.dice[0].sides === 20 && (r.dice[0].sign || 1) > 0) {
    r.kind = 'd20';
    r.dice[0].tag = 'd20';
  }
  const groups = [];
  for (const d of r.dice) {
    // (Advantage's second die isn't part of the name.)
    if (d.twin || (d.tag === 'd20' && d !== d20s(r)[0])) continue;
    const k = `${(d.sign || 1) < 0 ? '-' : '+'}${d.sides}`;
    const g = groups.find((x) => x.k === k);
    if (g) g.n++;
    else groups.push({ k, n: 1, sides: d.sides, neg: (d.sign || 1) < 0 });
  }
  const mod = r.base.reduce((t, b) => t + num(b.value), 0);
  const parts = groups.map((g, i) => `${g.neg ? '-' : i ? '+' : ''}${g.n > 1 ? g.n : ''}d${g.sides}`);
  if (!parts.length) { r.label = 'Plain dice'; r.spec = 'dice|'; return; }
  r.spec = `dice|${parts.join('')}${mod ? (mod > 0 ? `+${mod}` : mod) : ''}`;
  r.label = `${parts.join('').replace(/([+-])/g, ' $1 ').replace(/-/g, '−').trim()}${mod ? ` ${signed(mod)}` : ''}`;
}

// ------------------------------------------------------------- dock
/**
 * A die's picture: a canvas that dice3d.js draws the polyhedron on (lit in 3D, its number on the face toward you).
 * size: 'roll' (a die of the roll, with room around it to bounce), 'pick' (the tray), 'add' (the small Add buttons).
 */
function dieCanvas(key, sides, value, size, label = '') {
  return `<canvas class="die-cv" data-key="${esc(key)}" data-sides="${sides}" data-value="${value == null ? '' : value}" data-size="${size}"${label ? ` data-label="${esc(label)}"` : ''} aria-hidden="true"></canvas>`;
}
/** The dice to pick before anything is rolled (and to add to a roll): each a small polyhedron. */
function diceTray(act, title) {
  return DIE_SIDES.map((s) => `<button type="button" class="die-pick s${s}" data-rl="${act}" data-arg="${s}" title="${esc(title(s))}">${dieCanvas(`pick:${act}:${s}`, s, s, act === 'add' ? 'add' : 'pick')}<span>d${s}</span></button>`).join('');
}
function diceText(d) {
  if (d.value == null) return `d${d.sides}`;
  return String(d.value);
}
/** "d20 18 (advantage) + 1d4 Guidance 3 + 3 modifier": each part named and signed. */
function rollBreakdown(r) {
  const parts = [];
  const kept = keptD20(r);
  const modeText = r.mode !== 'normal' ? ` (${r.mode === 'adv' ? 'advantage' : 'disadvantage'})` : '';
  if (kept) parts.push(['+', `d20 ${kept.value}${modeText}`]);
  const pair = twinPair(r);
  const keep = keptTwin(r);
  if (pair.length) parts.push([(pair[0].sign || 1) < 0 ? '−' : '+', `d${pair[0].sides} ${keep ? keep.value : '?'}${modeText}`]);
  // Other dice, grouped by what they are: "2d6 7 (3+4)", "1d8 critical 5", "1d4 Bless 2".
  const groups = [];
  for (const d of r.dice.filter((x) => x.tag !== 'd20' && !pair.includes(x))) {
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
  const modes = offersModes(r) ? `<div class="rl-modes" role="group" aria-label="Advantage">${[['dis', 'Disadvantage'], ['normal', 'Normal'], ['adv', 'Advantage']]
    .map(([v, l]) => `<button class="btn sm${r.mode === v ? ' on' : ''}" data-rl="mode" data-arg="${v}" aria-pressed="${r.mode === v}">${l}</button>`).join('')}${insp}</div>` : '';
  const pair = twinPair(r);
  const keep = keptTwin(r);
  const dice = r.dice.map((d) => {
    // While the dice tumble, nothing gives the result away (which die counts, a natural 20).
    const spin = rolling && isTumbling(r, d);
    const dropped = !rolling && r.rolled && (d.tag === 'd20' ? kept && d !== kept : pair.includes(d) && keep && d !== keep);
    const cls = [d.tag === 'd20' || d.sides === 20 ? 'd20' : 'dx', spin ? 'tumbling' : '', dropped ? 'dropped' : '', d.max ? 'maxed' : '', d.crit ? 'critd' : '',
      !rolling && d.tag === 'd20' && d.value === 20 ? 'nat20' : '', !rolling && d.tag === 'd20' && d.value === 1 ? 'nat1' : ''].filter(Boolean).join(' ');
    const title = `d${d.sides}${d.tag.startsWith('cond:') ? ' · ' + d.tag.slice(5) : ''}${d.crit ? (d.max ? ' · critical, at its maximum' : ' · critical') : ''}${dropped ? ' (not counted)' : ''}`;
    // The die in 3D (dice3d.js; while it tumbles it's already headed for its number); its number for screen readers.
    const face = `<span class="die-3d">${dieCanvas(`die:${d.id}`, d.sides, d.value, 'roll', `d${d.sides}`)}<span class="sr-only">${esc(spin ? '' : diceText(d))}</span></span><small>${d.max ? 'max ' : ''}d${d.sides}</small>`;
    // Every die can be taken off (the last too: the card is then an empty plain roll); a click anywhere on it does.
    return `<button type="button" class="die s${d.sides} ${cls}" data-die="${d.id}" data-rl="remove" data-arg="${d.id}" title="${esc(title)} · click to remove" aria-label="Remove d${d.sides}${d.value != null && !spin ? ` (${d.value})` : ''}">${face}<span class="die-x" aria-hidden="true">×</span></button>`;
  }).join('');
  const conds = r.conds.length ? `<div class="rl-conds">${r.conds.map((cd, i) => `<label class="rl-cond${cd.blocked ? ' blocked' : ''}"${cd.blocked ? ` title="${esc(cd.blocked)}"` : ''}><input type="checkbox" data-rl="cond" data-arg="${i}"${cd.on ? ' checked' : ''}> ${esc(cd.label)} <span class="faint">${[num(cd.bonus) ? signed(cd.bonus) : '', ...cd.extra.map((e) => (/^-/.test(e) ? `−${e.slice(1)}` : '+' + e))].filter(Boolean).join(' ')}${cd.blocked ? ` · ${esc(cd.blocked)}` : ''}</span></label>`).join('')}</div>` : '';
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
    <div class="rl-dice">${dice || '<span class="faint rl-nodice">No dice: add some below for a new roll.</span>'}</div>
    <div class="rl-add"><span class="rl-add-dice">Add ${diceTray('add', (s) => `Add a d${s}${r.rolled ? ' (rolled now)' : ''}`)}</span>
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
    : `<div class="rl-actions"><button class="btn primary" data-rl="roll" data-arg="" id="rlGo"${r.dice.length ? '' : ' disabled title="Add dice to roll"'}>Roll ${esc(r.base.length ? signed(r.base.reduce((t, b) => t + num(b.value), 0)) : '')}</button>
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
      ${r && !rollState.min ? '<button class="btn sm" data-rl="clear" data-arg="" title="Put this roll away and pick plain dice (it stays in the log)">New roll</button>' : ''}
      <button class="btn sm" data-rl="min" data-arg="" title="${rollState.min ? 'Show the whole roll' : 'Make the dice small (the sheet stays clickable)'}" aria-label="${rollState.min ? 'Expand the dice' : 'Minimise the dice'}" aria-expanded="${!rollState.min}">${rollState.min ? '▴' : '▾'}</button>
      <button class="btn sm" data-rl="close" data-arg="" title="Hide the dice (the log is kept)" aria-label="Close the dice">✕</button></div>`;
  if (rollState.min) {
    dock.style.minHeight = '';
    dock.innerHTML = head + (r && r.rolled ? `<button class="dice-mini" data-rl="min" data-arg="">${esc(r.label)}: <b>${isTumbling(r) ? '…' : rollTotal(r)}</b></button>` : '');
    document.body.style.paddingBottom = rollState.open ? `${dock.offsetHeight + 16}px` : '';
    return;
  }
  dock.innerHTML = `${head}
    ${r ? renderRollCard(r) : `<div class="rl-card rl-empty"><p class="faint">Click a number on the sheet (skills, saves, attacks, damage…) to roll it: its bonuses, advantage and extra dice are added for you.</p>
      <div class="rl-tray" role="group" aria-label="Plain dice">${diceTray('pick', (s) => `A plain d${s} roll`)}</div>
      <p class="faint">Or pick dice for a plain roll (a single die can have advantage or disadvantage).</p></div>`}
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
  // The dice themselves: drawn (or kept tumbling) on their canvases.
  if (rollState.open && typeof Dice3D !== 'undefined') Dice3D.paint(dock);
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
    // A plain die picked in the empty dock: a roll of its own, not rolled yet (more dice, advantage, then Roll).
    case 'pick': {
      startRoll(`dice|1d${num(arg)}`, {});
      const p = rollState.current;
      if (p) { namePlain(p); if (typeof Dice3D !== 'undefined') Dice3D.enter(p.dice.map((d) => d.id)); renderDice(true); }
      return undefined;
    }
    case 'clear': rollState.current = null; renderDice(false); return undefined;
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
      const before = new Set(r.dice.map((d) => d.id));
      if (r.dice.some((d) => d.tag === 'adv')) r.dice = r.dice.filter((d) => d.tag !== 'adv');
      else r.dice.push(...r.dice.filter((d) => d.tag === 'base').map((d) => ({ ...newDie(d.sides, 'adv', r.rolled), sign: d.sign })));
      return afterAmend(before);
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
// A die to pick, pointed at: it gives a twirl.
document.addEventListener('mouseover', (e) => {
  const b = e.target.closest && e.target.closest('#dice .die-pick');
  if (!b || (e.relatedTarget && b.contains(e.relatedTarget)) || typeof Dice3D === 'undefined') return;
  const cv = b.querySelector('canvas.die-cv');
  if (cv) Dice3D.spin(cv.dataset.key);
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
