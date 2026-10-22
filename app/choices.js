/* SW5E Character Sheet Viewer: choice slots.
 *
 * Besides a class's own option lists (classes.js), features, options and feats hand out picks from
 * SW5E's other modules: "Choose one of the fighting style options" (Fighter, Guardian, Scout,
 * Fighter's Instinct, Fighting Stylist…), fighting masteries, lightsaber forms ("You gain the
 * Makashi lightsaber form"; Formfighting Dabbler: one, then three, seven…), weapon focuses and
 * supremacies, class/multiclass/splashclass improvements, maneuvers (Superiority Style), and
 * powers ("You know two at-will force powers", Force-Sensitive). sw5e.com can't record any of
 * them and its engine applies none of them.
 *
 * Each such sentence becomes a slot. Picks are stored in the character as
 *   featureChoices = { [slot key]: [{ name, note?, weapons?: [weapon name] }] }
 * (sw5e.com keeps the field). Slot keys read like "Fighter: Fighting Style",
 * "Discoveries: Fighting Style", "Feat: Fighting Stylist #2", "Feat: Fighting Stylist › Formfighting Style".
 */
'use strict';

const chCls = typeof clsTextFeatures !== 'undefined' // eslint-disable-line no-undef
  ? { clsTextFeatures, clsChosenText, clsArchetypeTableAt, clsCountAt, clsBaseName } // eslint-disable-line no-undef
  : require('./classes.js');
// powers.js loads after this file in the viewer: look its functions up when they're used.
const chPw = {
  get pwGrants() { return typeof pwGrants !== 'undefined' ? pwGrants : require('./powers.js').pwGrants; }, // eslint-disable-line no-undef
  get pwClassCasting() { return typeof pwClassCasting !== 'undefined' ? pwClassCasting : require('./powers.js').pwClassCasting; }, // eslint-disable-line no-undef
  get pwUnmetPrereq() { return typeof pwUnmetPrereq !== 'undefined' ? pwUnmetPrereq : require('./powers.js').pwUnmetPrereq; }, // eslint-disable-line no-undef
  get pwMulticlassMax() { return typeof pwMulticlassMax !== 'undefined' ? pwMulticlassMax : require('./powers.js').pwMulticlassMax; }, // eslint-disable-line no-undef
};

// progression.js loads after this file too: a half-human's species with its non-human half's traits (prSpeciesOf).
const chSpeciesOf = (modules, species) => (typeof prSpeciesOf !== 'undefined' ? prSpeciesOf : require('./progression.js').prSpeciesOf)(modules, species || {}); // eslint-disable-line no-undef

/** What can be picked: SW5E module, words used in rule text, whether one pick may be taken twice. */
const CH_KINDS = {
  fightingStyles: { module: 'fightingStyles', word: 'fighting style', title: 'Fighting style' },
  fightingMasteries: { module: 'fightingMasteries', word: 'fighting mastery', title: 'Fighting mastery' },
  lightsaberForms: { module: 'lightsaberForms', word: 'lightsaber form', title: 'Lightsaber form' },
  weaponFocuses: { module: 'weaponFocuses', word: 'weapon focus', title: 'Weapon focus', weapons: true },
  weaponSupremacies: { module: 'weaponSupremacies', word: 'weapon supremacy', title: 'Weapon supremacy', weapons: true },
  classImprovements: { module: 'classImprovements', word: 'class improvement', title: 'Class improvement' },
  multiclassImprovements: { module: 'multiclassImprovements', word: 'multiclass improvement', title: 'Multiclass improvement', otherClass: true },
  splashclassImprovements: { module: 'splashclassImprovements', word: 'splashclass improvement', title: 'Splashclass improvement' },
  maneuvers: { module: 'maneuvers', word: 'maneuver', title: 'Maneuver' },
  forcePowers: { module: 'powers', word: 'force power', title: 'Force power', powerType: 'Force' },
  techPowers: { module: 'powers', word: 'tech power', title: 'Tech power', powerType: 'Tech' },
  powers: { module: 'powers', word: 'power', title: 'Force or tech power' },
  classOptions: { module: null, word: 'option', title: 'Class option' },
};
const CH_PHRASE = {
  'fighting style': 'fightingStyles', 'fighting mastery': 'fightingMasteries', 'weapon focus': 'weaponFocuses',
  'weapon supremacist': 'weaponSupremacies', 'weapon supremacy': 'weaponSupremacies', 'class improvement': 'classImprovements',
  'multiclass improvement': 'multiclassImprovements', 'splashclass improvement': 'splashclassImprovements',
};
const CH_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10 };
const chNum = (w) => (CH_NUM[String(w).toLowerCase()] != null ? CH_NUM[String(w).toLowerCase()] : Number(w) || 0);
const chOrd = (s) => Number(String(s).replace(/\D/g, '')) || 0;
const chArr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const chPick = (p) => (typeof p === 'string' ? { name: p } : p && p.name ? p : null);

/**
 * The picks a text grants: [{ kind, count, allowed?, insteadAny?, steps?, level?, minLevel?,
 * oncePerRest?, requires?, className?, list?, addAt? }] and superiority dice it gives
 * ({ kind: 'superiorityDice', count, steps }). opts.maneuvers: also read "you learn one maneuver"
 * (not for class options: the class's maneuver block counts those already).
 */
function chGrants(text, opts = {}) {
  const t = String(text || '').replace(/\r/g, '').replace(/[*_]/g, '').replace(/\s+/g, ' ');
  const out = [];
  let m;
  // "Choose one of the fighting style options" / "Choose two of the multiclass improvement options".
  for (const x of t.matchAll(/\bchoose (one|two|three|four|a) of the (fighting style|fighting mastery|weapon focus|weapon supremacist|weapon supremacy|class improvement|multiclass improvement|splashclass improvement) options\b/gi)) {
    out.push({ kind: CH_PHRASE[x[2].toLowerCase()], count: chNum(x[1]) });
  }
  // Lightsaber forms: a given form ("You gain the Makashi lightsaber form", "your choice of the Shien or
  // Djem So lightsaber form"; "If you already know this form, you can instead choose another"), or any.
  const insteadAny = /if you already know (?:this|the chosen) form, you can instead choose another lightsaber form/i.test(t);
  if ((m = /\byou gain your choice of the ([\w' -]+?) or ([\w' -]+?) lightsaber form\b/i.exec(t))) {
    out.push({ kind: 'lightsaberForms', count: 1, allowed: [`${m[1].trim()} Form`, `${m[2].trim()} Form`], insteadAny });
  } else if ((m = /\byou gain the ([\w' -]+?) lightsaber form\b/i.exec(t))) {
    out.push({ kind: 'lightsaberForms', count: 1, allowed: [`${m[1].trim()} Form`], fixed: true, insteadAny });
  } else if ((m = /\byou (?:learn|gain knowledge of) (one|two|three|\w+) lightsaber forms?\b/i.exec(t))) {
    // "If you already know at least one lightsaber form, you instead learn three lightsaber forms…"
    const steps = [...t.matchAll(/if you already know at least (\w+) lightsaber forms?, you instead learn (\w+|the remaining)(?: lightsaber)? forms?/gi)]
      .map((x) => ({ atLeast: chNum(x[1]), count: /remaining/i.test(x[2]) ? Infinity : chNum(x[2]) }));
    out.push({ kind: 'lightsaberForms', count: chNum(m[1]), steps });
  }
  if (opts.maneuvers) {
    // "You learn one maneuver… If you already know at least one maneuver, you instead learn three maneuvers."
    if ((m = /\byou learn (one|two|three|\w+) maneuvers?\b(?! from| fueled)(?: of your choice)?(?: from those available to the (\w+) class)?/i.exec(t)) && !/additional maneuvers?/i.test(m[0])) {
      const steps = [...t.matchAll(/if you already know at least (\w+) maneuvers?, you instead learn (\w+) maneuvers?/gi)].map((x) => ({ atLeast: chNum(x[1]), count: chNum(x[2]), of: 'maneuvers' }));
      const add = /you learn an additional maneuver at (\d+)(?:st|nd|rd|th) level/i.exec(t);
      out.push({ kind: 'maneuvers', count: chNum(m[1]), steps, className: m[2] || null, addAt: add ? [Number(add[1])] : [] });
    }
    if ((m = /\byou gain (one|two) superiority dic?e\b/i.exec(t))) {
      const steps = [...t.matchAll(/if you already have at least (\w+) superiority dic?e, you instead gain (\w+) additional superiority dice/gi)].map((x) => ({ atLeast: chNum(x[1]), count: chNum(x[2]) }));
      out.push({ kind: 'superiorityDice', count: chNum(m[1]), steps });
    } else if ((m = /\byou have a number of superiority dice equal to your proficiency bonus, which are (d\d+)s?\b/i.exec(t))) {
      out.push({ kind: 'superiorityDice', count: 'pb', size: m[1], recharge: /when you finish a long rest/i.test(t) ? 'longRest' : 'shortRest' });
    }
  }
  // Another class's option list: "You gain one of the Force-Empowered Casting options of your choice from
  // those available to the consular class. You gain an additional option at 11th level."
  if ((m = /\byou gain (one|two) of the ([\w' -]+?) options of your choice from those available to the (\w+) class\b/i.exec(t))) {
    const add = /you gain an additional option at (\d+)(?:st|nd|rd|th) level/i.exec(t);
    out.push({ kind: 'classOptions', count: chNum(m[1]), list: m[2].trim(), className: m[3][0].toUpperCase() + m[3].slice(1).toLowerCase(), addAt: add ? [Number(add[1])] : [] });
  }
  // Powers: "You know two at-will force powers", "When you reach 3rd level, you learn one 1st-level force
  // power, which you can cast once per long rest", "you know one 4th-level tech power…",
  // "You learn one at-will power that requires an attack roll".
  for (const x of t.matchAll(/\b(?:when you reach (\d+)(?:st|nd|rd|th) level, )?you (?:know|learn)(?: and can cast)? (one|two|three) (at-will|\d(?:st|nd|rd|th)-level) (force |tech )?powers?\b([^.]*)/gi)) {
    const kind = /force/i.test(x[4] || '') ? 'forcePowers' : /tech/i.test(x[4] || '') ? 'techPowers' : 'powers';
    const level = /at-will/i.test(x[3]) ? 0 : chOrd(x[3]);
    const rest = x[5] || '';
    out.push({
      kind, count: chNum(x[2]), level, minLevel: x[1] ? Number(x[1]) : 0,
      oncePerRest: /once per long rest/i.test(rest) || /\bcast (?:it |them )?once per long rest/i.test(x[0]) ? 'longRest' : null,
      requires: /requires an attack roll/i.test(rest) ? 'attack' : /requires a saving throw/i.test(rest) ? 'save' : null,
    });
  }
  // Powers given by name or with a level range ("You learn the *burst* force power…", "Choose two tech powers
  // of 1st level…", Vow of the Devoted, species): powers.js.
  if (opts.powers !== false) out.push(...chPw.pwGrants(text, { level: opts.level || 0 }));
  return out;
}

/** Options for a kind: [{ name, text, prerequisite, level?, powerType?, … }]. */
function chOptions(modules, kind, parsed) {
  const k = CH_KINDS[kind];
  if (!k) return [];
  if (kind === 'classOptions') return [];
  return chArr(modules[k.module]).filter((o) => !k.powerType || o.powerType === k.powerType).map((o) => {
    const text = String(o.description || o.text || '');
    const pre = /_\*\*Prerequisites?:?\*\*:?\s*([^_\n]+)_/i.exec(text);
    return {
      ...o, name: o.name, text: text.replace(/_\*\*Prerequisites?:?\*\*:?\s*[^_\n]+_\s*/i, '').trim(),
      prerequisite: o.prerequisite || (pre ? pre[1].trim().replace(/[.:]$/, '') : ''),
    };
  });
}

/** The character's feats, in a fixed order: [{ name, from, n (nth time taken) }]. */
function chFeats(raw) {
  const out = [];
  const add = (name, from) => {
    if (!name) return;
    out.push({ name, from, n: out.filter((f) => f.name === name).length + 1 });
  };
  const bg = raw.background || {};
  if (bg.feat && bg.feat.name) add(bg.feat.name, `Background (${bg.name || ''})`);
  for (const k of chArr(raw.classes)) chArr(k.abilityScoreImprovements).forEach((a, i) => { if (a && a.type === 'Feat') add(a.name, `${k.name} ASI #${i + 1}`); });
  for (const f of chArr(raw.customFeats)) add(typeof f === 'string' ? f : f && f.name, 'Custom feat');
  return out;
}

const CH_ABIL = '(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)';
/**
 * Prerequisites that aren't met: "At least 3 levels in berserker", "No levels in consular", "The ability
 * to cast force powers", "The ability to cast 3rd-level tech powers", "4th level", "Strength 13",
 * "Dexterity, Intelligence, Wisdom, or Charisma 13", "size Small", "Type beast or humanoid", "Durable feat".
 * Unknown wording, or what ctx doesn't say, counts as met. ctx: { classes: { name: level }, level (character),
 * casting: { force, tech } (max power level you can cast: 0 = at-will powers only, -1 = none), scores?: { Strength: 13 },
 * size?: 'Medium', types?: ['humanoid'], feats?: [names taken before] }.
 */
function chUnmet(prerequisite, ctx) {
  const out = [];
  // "Dexterity, Intelligence, Wisdom, or Charisma 13" (any of them) before the list is split at its commas.
  const abilities = [];
  const rest = String(prerequisite || '').replace(new RegExp(`${CH_ABIL}(?:,? (?:or )?${CH_ABIL})* \\d+`, 'g'), (x) => { abilities.push(x); return ''; });
  for (const p of abilities) {
    const min = Number(/(\d+)$/.exec(p)[1]);
    const names = p.match(new RegExp(CH_ABIL, 'g'));
    if (ctx.scores && !names.some((a) => Number(ctx.scores[a]) >= min)) out.push(p);
  }
  for (const part of rest.split(/,\s*|;\s*/)) {
    const p = part.trim();
    let m;
    if (!p) continue;
    if ((m = /^size (\w+)$/i.exec(p))) {
      if (ctx.size && ctx.size.toLowerCase() !== m[1].toLowerCase()) out.push(p);
      continue;
    }
    if ((m = /^type (.+)$/i.exec(p))) {
      if (ctx.types && !m[1].split(/\s+or\s+/i).some((t) => ctx.types.includes(t.trim().toLowerCase()))) out.push(p);
      continue;
    }
    if ((m = /^(.+) feat$/i.exec(p))) {
      if (ctx.feats && !ctx.feats.some((n) => n.toLowerCase() === m[1].trim().toLowerCase())) out.push(p);
      continue;
    }
    if ((m = /at least (\d+) levels? in (\w+)/i.exec(p))) {
      const lv = Object.entries(ctx.classes).find(([n]) => n.toLowerCase() === m[2].toLowerCase());
      if (!lv || lv[1] < Number(m[1])) out.push(p);
    } else if ((m = /^no levels? in (\w+)/i.exec(p))) {
      if (Object.keys(ctx.classes).some((n) => n.toLowerCase() === m[1].toLowerCase())) out.push(p);
    } else if ((m = /ability to cast (?:(\d)(?:st|nd|rd|th)-level )?(force|tech|force or tech) powers/i.exec(p))) {
      const need = m[1] ? Number(m[1]) : 0;
      const ok = m[2].toLowerCase() === 'force or tech' ? Math.max(ctx.casting.force, ctx.casting.tech) >= need : ctx.casting[m[2].toLowerCase()] >= need;
      if (!ok) out.push(p);
    } else if ((m = /^(\d+)(?:st|nd|rd|th) level$/i.exec(p))) {
      if (ctx.level < Number(m[1])) out.push(p);
    }
  }
  return out;
}

/**
 * Every choice slot of a character. ctx: { modules (SW5E rules modules), parsed (parseClassOptions),
 * casting: { force, tech } (max power level the classes and archetypes give; 0 = at-will only, -1 = can't cast),
 * notes (featureNotes), pb, classManeuvers / classManeuverMax / classManeuverNames (maneuvers the classes know, recorded
 * and by their tables), classDice (superiority dice from classes), classPowerNames, skills (proficient skill names),
 * rowOf(k) (a class's table row) }.
 * Returns { slots, superiority: [{ from, count, size }], orphans: [key], level, casting }:
 *   slot = { key, kind, title, from, count, picks: [{ name, note, weapons, auto }], options, allowed, fixed, level,
 *            oncePerRest, requires, order, problems: [text], hint }
 * `order` is when the source was gained (species 0, background feat 1, then by class level: features, option picks,
 * ASI feats; custom feats last): "If you already know at least…" and a feat's prerequisites look only at what came
 * before it.
 */
function choiceSlots(raw, ctx) {
  const modules = ctx.modules || {};
  const parsed = ctx.parsed || { classes: {}, archetypes: {} };
  const stored = raw.featureChoices || {};
  const notes = ctx.notes || raw.featureNotes || {};
  const classes = chArr(raw.classes);
  const level = classes.reduce((t, k) => t + (Number(k.levels) || 0), 0);
  const baseCasting = ctx.casting || { force: -1, tech: -1 };
  // The species' size and creature type ("Your creature type is droid"; humanoid unless a Type trait says otherwise).
  const spRef = raw.species && chSpeciesOf(modules, raw.species);
  const typeTrait = spRef && chArr(spRef.traits).find((t) => /^Type$/i.test(t.name));
  const pctx = {
    classes: Object.fromEntries(classes.map((k) => [k.name, Number(k.levels) || 0])), level, casting: baseCasting, scores: ctx.scores || null,
    size: (spRef && spRef.size) || null,
    types: !spRef ? null : typeTrait ? [...String(typeTrait.description || '').toLowerCase().matchAll(/\b(droid|humanoid|beast|aberration|construct|plant|monstrosity)\b/g)].map((x) => x[1]) : ['humanoid'],
  };
  const slots = [];
  const superiority = [];
  const queue = [];
  const used = new Set(); // stored keys that belong to a slot
  // One text can grant several picks of a kind (Force-Sensitive: two at-will powers, then a 1st-level
  // one): their keys say which.
  const ordinal = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
  const addGrants = (text, base, opts) => {
    const grants = chGrants(text, { ...opts, level: base.lv != null ? base.lv : level });
    grants.forEach((g) => {
      const word = CH_KINDS[g.kind] ? CH_KINDS[g.kind].word : g.kind;
      const sameKind = grants.filter((x) => x.kind === g.kind);
      const tag = g.level != null ? `${g.level ? `level ${g.level}` : 'at-will'} ` : g.minLevel && sameKind.length > 1 ? `from ${ordinal(g.minLevel)} level, ` : g.fixed ? `${g.allowed.join(', ')}: ${g.castOnly ? 'cast, ' : ''}` : '';
      const suffix = sameKind.length > 1 ? ` (${tag}${word})` : '';
      queue.push({ g, base, key: base.key + suffix, alt: base.alt ? base.alt + suffix : null });
    });
  };
  const listOf = (k, listKey) => {
    const cls = parsed.classes[k.name];
    const arch = k.archetype && parsed.archetypes[k.archetype.name];
    const list = (cls && cls.lists.find((l) => l.key === listKey)) || (arch && arch.lists.find((l) => l.key === listKey));
    return list ? { ...list, options: list.options.concat((arch && arch.extends[listKey]) || []) } : null;
  };
  const optionText = (k, listKey, name) => {
    const list = listOf(k, listKey);
    const o = list && list.options.find((x) => x.name === name);
    return o ? o.text : '';
  };
  // The class level a class's n-th ASI comes at ("Ability Score Improvement" in the table's Features column).
  const asiLevel = (k, i) => {
    const cref = chArr(modules.classes).find((x) => x.name === k.name);
    const lv = Object.entries((cref && cref.levelChanges) || {}).filter(([, r]) => /ability score improvement/i.test(String((r && r.Features) || '')))
      .map(([l]) => Number(l)).sort((a, b) => a - b);
    return lv[i] || 4 * (i + 1);
  };
  // The class level at which a list's count first reached n (the n-th pick's earliest level).
  const pickLevel = (k, list, n) => {
    const cref = chArr(modules.classes).find((x) => x.name === k.name);
    if (!list || !list.column || !cref) return Number(k.levels) || 0;
    for (let l = 1; l <= 20; l++) {
      const v = parseInt(String((((cref.levelChanges || {})[String(l)]) || {})[list.column] || '').replace(/[^\d]/g, ''), 10);
      if (v >= n) return l;
    }
    return Number(k.levels) || 0;
  };

  // 1. Class and archetype features at the character's levels.
  const info = {};
  for (const k of classes) {
    const lv = Number(k.levels) || 0;
    const cref = chArr(modules.classes).find((x) => x.name === k.name);
    const aref = k.archetype && k.archetype.name ? chArr(modules.archetypes).find((x) => x.name === k.archetype.name) : null;
    const arch0 = k.archetype && parsed.archetypes[k.archetype.name];
    const feats = (cref ? chCls.clsTextFeatures(cref.classFeatureText, k.name, 'Class') : [])
      .concat(aref ? chCls.clsTextFeatures(aref.text, aref.name, 'Archetype') : []);
    for (const f of feats) {
      if (f.level > lv) continue;
      // Option lists under "####" (Fighter Strategies) are picked separately; "choose one of the
      // following" sub-options count with the one picked in the archetype list, or named in the feature's notes.
      const listPicks = arch0 && arch0.lists.some((l) => l.key === f.name) ? chArr((k.options || {})[f.name]).map((p) => p.name) : [];
      const sub = chCls.clsChosenText(f.text, [notes[chCls.clsBaseName(f.name)] || '', ...listPicks].join(', '));
      const text = sub.choice ? sub.text : String(f.text).split(/^####\s/m)[0]; // option lists, not "#####" sub-headings
      addGrants(text, { key: `${f.sourceName}: ${f.name}`, from: `${f.sourceName} ${f.name}`, label: `${f.sourceName}: ${f.name}`, owner: k.name, lv, k, order: f.level + 0.2, feature: f.name, classFeature: true }, { maneuvers: false });
    }
    // 2. Class options picked (Fighter's Instinct, Style Strategist, the Tactician's "Fighting Style"…), as many as
    // the list allows at this level: a pick beyond that grants nothing yet.
    info[k.name] = chClassInfo(k, modules, parsed, { rowOf: ctx.rowOf });
    for (const [listKey, picks] of Object.entries(k.options || {})) {
      const seen = {};
      const list = listOf(k, listKey);
      const max = info[k.name] ? ((info[k.name].lists.find((l) => l.key === listKey) || {}).max) : null;
      chArr(picks).forEach((p, i) => {
        const n = (seen[p.name] = (seen[p.name] || 0) + 1);
        const o = list && list.options.find((x) => x.name === p.name);
        // Beyond the count, below the option's level, or a non-repeatable option taken again: no grants.
        if ((max != null && i >= max) || (o && o.minLevel > lv) || (o && !o.repeatable && n > 1)) return;
        addGrants(optionText(k, listKey, p.name), {
          key: `${listKey}: ${p.name}${n > 1 ? ` #${n}` : ''}`, from: `${listKey}: ${p.name}${n > 1 ? ` #${n}` : ''}`, owner: k.name, lv, k,
          order: Math.max(pickLevel(k, list, i + 1), (o && o.minLevel) || 0) + 0.4, feature: p.name, classFeature: true,
        }, { maneuvers: false });
      });
    }
  }
  // 3. Feats. Keys name the feat and where it was taken ("Feat: Fighting Stylist (Fighter ASI #2)"), so removing
  // another copy doesn't move picks; picks stored under the older keys ("Feat: Fighting Stylist #2") still count.
  const featRefs = chArr(modules.feats);
  const feats = [];
  for (const f of chFeats(raw)) {
    const ref = featRefs.find((x) => x.name === f.name);
    if (!ref) continue;
    const asi = /^(.+) ASI #(\d+)$/.exec(f.from);
    const k = asi ? classes.find((x) => x.name === asi[1]) : null;
    const when = /^Background/.test(f.from) ? 1 : k ? asiLevel(k, Number(asi[2]) - 1) : 100;
    const n = feats.filter((x) => x.f.name === f.name && x.f.from === f.from).length + 1;
    const base = {
      key: `Feat: ${f.name} (${f.from}${n > 1 ? ` #${n}` : ''})`, alt: `Feat: ${f.name}${f.n > 1 ? ` #${f.n}` : ''}`,
      from: `Feat: ${f.name} (${f.from})`, owner: null, feat: ref, order: when + 0.6, featLevel: when === 100 ? level : Math.min(when, level),
      takenWith: /^Background/.test(f.from) ? { k: classes[0], level: 1, only: true } : k ? { k, level: Math.min(when, Number(k.levels) || 0) } : null,
      featTwice: f.n > 1 && !/you can take this feat multiple times/i.test(ref.text || ''),
    };
    feats.push({ f, ref, base });
    used.add(`${base.key}: +1`); // the +1 of a feat added by hand (builder.js)
    addGrants(ref.text, base, { maneuvers: true });
  }

  // 4. Species traits ("You know the *ion blast* at-will tech power"; "When you reach 3rd level, you learn and
  // can cast the *repair droid* tech power once per long rest").
  const sp = raw.species && chSpeciesOf(modules, raw.species);
  for (const tr of chArr(sp && sp.traits)) {
    // A trait with options (Kiffar Heritage's Sage: "You learn and can cast the *telemetry* force power once per long
    // rest"; sw5e-data.js adds them from the books): only the one chosen in its notes.
    let text = tr.description || '';
    if (chArr(tr.options).length) {
      const full = [text, ...tr.options.map((o) => `#### ${o.name}\n${o.text}`)].join('\n');
      const sub = chCls.clsChosenText(full, notes[chCls.clsBaseName(tr.name)] || '');
      text = sub.choice ? sub.text : text;
    }
    addGrants(text, { key: `Species: ${tr.name}`, from: `${sp.name}: ${tr.name}`, owner: null, species: true, lv: level, order: 0 }, { maneuvers: false });
  }

  // Work through the grants; picks can grant more (Formfighting Style → three forms, Superiority Style → a maneuver).
  const optionsCache = {};
  const optionsOf = (kind) => (optionsCache[kind] = optionsCache[kind] || chOptions(modules, kind, parsed));
  const ATTACK = /\b(?:melee|ranged) (?:force|tech|power|weapon) attack\b|\bmake an? (?:melee |ranged )?(?:force|tech|power|weapon) attack\b/i;
  let guard = 0;
  while (queue.length && guard++ < 500) {
    const { g, base, key, alt } = queue.shift();
    if (g.kind === 'superiorityDice') { superiority.push({ from: base.from, key, order: base.order, ...g }); continue; }
    // "When you reach 3rd level" (feats, species: character level); "At 7th level" in a class feature: class level.
    const lv = base.lv != null ? base.lv : level;
    if (g.minLevel && lv < g.minLevel) continue;
    const powers = /owers$/.test(g.kind);
    const slot = {
      feature: base.feature || null, key, kind: g.kind, title: CH_KINDS[g.kind] ? CH_KINDS[g.kind].title : g.kind, from: base.from, label: base.label || base.from, owner: base.owner, species: !!base.species,
      count: g.count + chArr(g.addAt).reduce((t, a) => t + (typeof a === 'number' ? (lv >= a ? 1 : 0) : (lv >= a.level ? a.count : 0)), 0),
      steps: g.steps || [], allowed: g.allowed || null, order: Math.max(base.order != null ? base.order : 50, g.minLevel ? g.minLevel + 0.2 : 0), feat: base.feat || null,
      fixed: g.fixed && !powers ? g.allowed[0] : null, insteadAny: !!g.insteadAny, level: g.level, oncePerRest: g.oncePerRest || null,
      requires: g.requires || null, className: g.className || null, list: g.list || null, problems: [],
      free: g.free != null ? g.free : null, castAs: g.castAs || null, alignment: g.alignment || null, given: !!(g.fixed && powers), focus: !!g.focus,
      castOnly: !!g.castOnly, useFeature: g.useFeature ? base.feature || null : null, abilities: g.abilities || null, noConcSelf: !!g.noConcSelf,
      onceLevels: g.onceLevels || null, target: g.target || null, fromKnown: !!g.fromKnown, classFeature: !!base.classFeature,
    };
    if (g.kind === 'classOptions') {
      const cls = parsed.classes[g.className];
      const list = cls && cls.lists.find((l) => l.title.toLowerCase().includes(g.list.toLowerCase()) || g.list.toLowerCase().includes(l.title.toLowerCase().replace(/s$/, '')));
      slot.options = list ? list.options : [];
      slot.title = list ? `${g.className} ${list.title.replace(/s$/, '')}` : `${g.className} option`;
    } else slot.options = optionsOf(g.kind);
    if (g.level != null && powers) {
      slot.options = slot.options.filter((p) => Number(p.level) === g.level);
      slot.title = `${g.level === 0 ? 'At-will' : `${ordinal(g.level)}-level`} ${CH_KINDS[g.kind].word}`;
    } else if (g.levelMax != null && powers) {
      // "of no higher level than your Max Power Level" (that class's), "of 1st or 2nd level", "2nd level or lower".
      const casting = base.k ? chPw.pwClassCasting(base.k, modules) : [];
      const max = g.levelMax === 'class' ? casting.reduce((t, c) => Math.max(t, c.maxLevel), 0) : g.levelMax;
      slot.levelMin = g.levelMin || 0;
      slot.levelMax = max;
      slot.options = slot.options.filter((p) => Number(p.level) >= slot.levelMin && Number(p.level) <= max && (!g.alignment || p.forceAlignment === g.alignment));
      slot.title = `${CH_KINDS[g.kind].title}s${g.alignment ? ` (${g.alignment.toLowerCase()})` : ''}, ${slot.levelMin === max ? `${max ? ordinal(max) + ' level' : 'at-will'}` : `${slot.levelMin ? ordinal(slot.levelMin) : 'at-will'} to ${ordinal(max)} level`}`;
    }
    // "Choose one 3rd-level force power that you know as your signature power".
    if (g.fromKnown) {
      const known = new Set(chArr(ctx.classPowerNames).map((n) => String(n).toLowerCase()));
      slot.options = slot.options.filter((p) => known.has(p.name.toLowerCase()));
      slot.title = `Signature ${ordinal(g.level)}-level ${CH_KINDS[g.kind].word} (one you know)`;
    }
    // "an at-will power that requires an attack roll" / "…a saving throw".
    if (g.requires === 'attack') slot.options = slot.options.filter((p) => ATTACK.test(p.description || p.text || ''));
    if (g.requires === 'save') slot.options = slot.options.filter((p) => /\bsaving throw\b/i.test(p.description || p.text || ''));
    if (g.requires) slot.title += ` that requires ${g.requires === 'attack' ? 'an attack roll' : 'a saving throw'}`;
    if (slot.given || (g.allowed && powers)) {
      // Named powers ("You learn the *burst* force power"): SW5E's spelling of each name.
      const all = optionsOf('powers');
      slot.allowed = g.allowed.map((n) => (all.find((p) => p.name.toLowerCase() === n.toLowerCase()) || { name: n }).name);
      slot.options = all.filter((p) => slot.allowed.includes(p.name));
      const types = [...new Set(slot.options.map((p) => p.powerType))];
      if (slot.kind === 'powers' && types.length === 1) slot.kind = types[0] === 'Tech' ? 'techPowers' : 'forcePowers';
      if (slot.given) {
        slot.count = slot.allowed.length;
        slot.title = `${slot.allowed.length > 1 ? 'Powers' : 'Power'} given${slot.oncePerRest ? ', once per long rest' : slot.free != null ? ', cast without points' : ''}`;
      } else slot.title = `One of ${slot.allowed.join(', ')}`;
    }
    const own = stored[key] != null ? key : alt && stored[alt] != null && stored[key] == null ? alt : key;
    used.add(own);
    const picks = chArr(stored[own]).map(chPick).filter(Boolean).map((p) => ({ ...p }));
    if (!picks.length && slot.fixed) picks.push({ name: slot.fixed, auto: true });
    if (!picks.length && slot.given) slot.allowed.forEach((n) => picks.push({ name: n, auto: true }));
    slot.picks = picks;
    slots.push(slot);
    // What the picks grant in turn (maneuvers and dice included: styles and masteries give them).
    picks.forEach((p) => {
      const o = slot.options.find((x) => x.name === p.name);
      if (o) addGrants(o.text, { key: `${key} › ${p.name}`, alt: alt ? `${alt} › ${p.name}` : null, from: `${p.name} (${base.from})`, owner: base.owner, order: slot.order + 0.05 }, { maneuvers: true });
    });
  }

  // Casting up to an order: the classes', plus powers picked in earlier slots (Force-Sensitive's powers count as
  // "the ability to cast force powers" for Improved Force-Sensitive), never the feat's own.
  const powerLevel = (n) => { const p = optionsOf('powers').find((x) => x.name === n); return p ? Number(p.level) || 0 : 0; };
  // Only powers learned in a slot count ("You can cast the *telekinesis* power…" lets you cast it, not learn it), and
  // only picks the slot allows; the Vow of the Devoted counts at its Max Power Level, like a class table.
  const castingBefore = (order, exceptKey, start = baseCasting) => {
    const c = { ...start };
    for (const s of slots) {
      if (!/owers$/.test(s.kind) || s.castOnly || s.order >= order || (exceptKey && s.key.startsWith(exceptKey))) continue;
      for (const p of s.picks) {
        const pw = s.options.find((x) => x.name === p.name);
        if (!pw) continue;
        const kinds = s.castAs === 'either' ? ['force', 'tech'] : s.castAs ? [s.castAs] : [pw.powerType === 'Tech' ? 'tech' : 'force'];
        for (const kd of kinds) c[kd] = Math.max(c[kd], s.focus && s.levelMax != null ? s.levelMax : powerLevel(p.name));
      }
    }
    return c;
  };
  // The classes' casting when a feat was taken: the class it came with at that level (a background feat: the starting
  // class at 1st), the other classes as they are now (the order of levels across classes isn't recorded).
  const castingAt = (taken) => {
    if (!taken) return baseCasting;
    const c = { force: -1, tech: -1 };
    for (const k of classes) {
      if (taken.only && k !== taken.k) continue;
      const lv = k === taken.k ? taken.level : Number(k.levels) || 0;
      for (const src of chPw.pwClassCasting({ ...k, levels: lv }, modules)) if (src.known || src.chosen.length) c[src.type] = Math.max(c[src.type], src.maxLevel);
    }
    return c;
  };
  const casting = castingBefore(Infinity);

  // A feature's own form (Form Basics: Makashi) that you already knew from earlier: choose another there. A form
  // picked later that the feature already gave is the later slot's problem (chosen twice).
  for (const s of slots) {
    if (!s.picks.length || !s.picks[0].auto || !s.fixed) continue;
    const other = slots.find((x) => x !== s && x.kind === s.kind && x.order < s.order && x.picks.some((p) => !p.auto && p.name === s.fixed));
    if (other) {
      s.picks = [];
      s.hint = `You already knew ${s.fixed} (from ${String(other.label || other.from).replace(/\s*\(.*\)$/, '')}): choose another ${CH_KINDS[s.kind].word} here.`;
    }
  }
  // Counts that depend on what you already knew ("If you already know at least three lightsaber forms…"): each
  // earlier slot counts in full (its count, or its picks if more), and the classes' maneuvers by their tables.
  const knownNames = (kind) => new Set(slots.filter((x) => x.kind === kind).flatMap((x) => x.picks.map((p) => p.name)));
  for (const s of slots.filter((x) => x.steps.length).sort((a, b) => a.order - b.order)) {
    let have = slots.filter((x) => x !== s && x.kind === s.kind && x.order < s.order).reduce((t, x) => t + x.count, 0);
    if (s.kind === 'maneuvers') have += Math.max(ctx.classManeuvers || 0, ctx.classManeuverMax || 0);
    for (const st of s.steps) {
      if (have < st.atLeast) continue;
      if (st.count !== Infinity) { s.count = st.count; continue; }
      // "the remaining forms": those not known yet whose prerequisites you meet (Aqinos needs tech casting).
      const known = knownNames(s.kind);
      s.count = s.options.filter((o) => !known.has(o.name) && !chUnmet(o.prerequisite, { ...pctx, casting }).length).length + s.picks.length;
    }
  }
  for (const d of superiority) {
    const have = superiority.filter((x) => x !== d && x.order < d.order).length + (ctx.classDice || 0);
    let n = d.count === 'pb' ? Number(ctx.pb) || Math.ceil(level / 4) + 1 : d.count;
    for (const st of d.steps || []) if (have >= st.atLeast) n = st.count;
    d.count = n;
    // "Your superiority die is a d4… to d6 at 5th level, d8 at 9th, d10 at 13th, d12 at 17th".
    d.size = d.size || (level >= 17 ? 'd12' : level >= 13 ? 'd10' : level >= 9 ? 'd8' : level >= 5 ? 'd6' : 'd4');
    d.recharge = d.recharge || 'shortRest';
  }

  // Problems: too many, unknown, not allowed, chosen twice, prerequisites.
  const lightweapon = classes.some((k) => Object.entries(k.options || {}).some(([lk, ps]) => chArr(ps).some((p) => /no longer need the ability to cast force powers to learn features that grant lightsaber forms/i.test(optionText(k, lk, p.name)))));
  const grantsForms = (text) => chGrants(text, { maneuvers: false, powers: false }).some((g) => g.kind === 'lightsaberForms');
  const waive = (unmet, text) => (lightweapon && grantsForms(text) ? unmet.filter((u) => !/^the ability to cast force powers$/i.test(u.trim())) : unmet);
  const POOL = { forcePowers: 'powers', techPowers: 'powers', powers: 'powers' };
  const pool = (kind) => POOL[kind] || kind;
  const TWICE = ['fightingStyles', 'fightingMasteries', 'lightsaberForms', 'maneuvers', 'powers', 'weaponFocuses', 'weaponSupremacies', 'classImprovements', 'multiclassImprovements', 'splashclassImprovements', 'classOptions'];
  const allPicks = (kind) => slots.filter((s) => pool(s.kind) === pool(kind)).flatMap((s) => s.picks.map((p, i) => ({ s, p, i })));
  const classManeuvers = new Set(chArr(ctx.classManeuverNames));
  const maneuversKnown = new Set([...classManeuvers, ...slots.filter((s) => s.kind === 'maneuvers').flatMap((s) => s.picks.map((p) => p.name))]);
  const powersKnown = chArr(ctx.classPowerNames).concat(slots.filter((x) => /owers$/.test(x.kind) && !x.castOnly).flatMap((x) => x.picks.map((q) => q.name)));
  // "Force-Insensitive: You can not use force powers…" / "Tech-Impaired: You can not use tech powers…".
  const sp0 = raw.species && chSpeciesOf(modules, raw.species);
  const cannot = { force: false, tech: false };
  for (const tr of chArr(sp0 && sp0.traits)) {
    const mm = /\byou can ?not use (force|tech) powers\b/i.exec(tr.description || '');
    if (mm) cannot[mm[1].toLowerCase()] = tr.name;
  }
  for (const s of slots) {
    if (s.picks.length > s.count) s.problems.push(`${s.picks.length} chosen, ${s.count} allowed`);
    s.picks.forEach((p, i) => {
      const o = s.options.find((x) => x.name === p.name);
      if (!o) {
        // A power that exists but doesn't fit this slot: say why (named grant, alignment, level or type, kind of roll).
        const any = /owers$/.test(s.kind) && optionsOf('powers').find((x) => x.name.toLowerCase() === p.name.toLowerCase());
        if (any && s.allowed) s.problems.push(`${p.name}: ${s.from} gives ${s.allowed.join(' or ')}`);
        else if (any && s.alignment && any.forceAlignment !== s.alignment) s.problems.push(`${p.name} is a ${String(any.forceAlignment).toLowerCase()}${/light|dark/i.test(any.forceAlignment) ? ' side' : ''} power: this slot takes ${s.alignment.toLowerCase()} powers only`);
        else if (any) s.problems.push(`${p.name} is ${Number(any.level) ? `a ${ordinal(Number(any.level))}-level` : 'an at-will'} ${any.powerType.toLowerCase()} power: this slot takes ${s.title.charAt(0).toLowerCase()}${s.title.slice(1)}`);
        else if (s.options.length || s.allowed) s.problems.push(`${p.name}: not in SW5E's data`);
        return;
      }
      if (/owers$/.test(s.kind) && cannot[o.powerType === 'Tech' ? 'tech' : 'force']) s.problems.push(`${p.name}: ${cannot[o.powerType === 'Tech' ? 'tech' : 'force']} (you can't use ${o.powerType.toLowerCase()} powers)`);
      if (s.allowed && !s.allowed.includes(p.name)) {
        const knowsAllowed = s.allowed.some((a) => allPicks(s.kind).some((x) => x.s !== s && x.p.name === a));
        if (!s.insteadAny || !knowsAllowed) s.problems.push(`${p.name}: this feature gives ${s.allowed.join(' or ')}${s.insteadAny ? ' (another form only if you already know it)' : ''}`);
      }
      // A feature that gives a named form or power doesn't ask you to meet its prerequisite first (Aqinos Form).
      if (!p.auto) {
        const unmet = waive(chUnmet(o.prerequisite, { ...pctx, casting }), o.text || '');
        if (unmet.length) s.problems.push(`${p.name} needs: ${unmet.join(', ')}`);
      }
      // A power the granting text names doesn't ask for its prerequisite power (specific beats general).
      if (/owers$/.test(s.kind) && o.prerequisite && !p.auto && !(s.allowed && s.allowed.includes(p.name)) && !/ability to cast|\blevel\b/i.test(o.prerequisite)) {
        // "Prerequisite: Force Disarm": you must know that power too (learning both at once is fine).
        const missing = chPw.pwUnmetPrereq(o, powersKnown);
        if (missing.length) s.problems.push(`${p.name} needs ${missing.join(' and ')} (learn it too)`);
      }
      if (s.kind === 'maneuvers' && o.prerequisite) {
        // "Parry maneuver", "Proficiency in Medicine", "Companion".
        for (const part of String(o.prerequisite).split(/,\s*/)) {
          let m;
          if ((m = /^(.+?) maneuver$/i.exec(part.trim())) && m[1].toLowerCase() !== p.name.toLowerCase() && ![...maneuversKnown].some((n) => n.toLowerCase() === m[1].toLowerCase())) s.problems.push(`${p.name} needs the ${m[1]} maneuver`);
          else if ((m = /^proficiency in (.+)$/i.exec(part.trim()))) {
            if (ctx.skills && !ctx.skills.some((n) => n.toLowerCase() === m[1].trim().toLowerCase())) s.problems.push(`${p.name} needs proficiency in ${m[1].trim()}`);
            else if (!ctx.skills) s.hint = `${p.name} needs proficiency in ${m[1].trim()}.`;
          } else if (/^companion$/i.test(part.trim()) && !classes.some((k) => /companion/i.test((k.archetype && k.archetype.name) || ''))) s.hint = `${p.name} needs a companion.`;
        }
      }
      if (!p.auto && !s.castOnly && TWICE.includes(pool(s.kind))) {
        const first = allPicks(s.kind).find((x) => x.p.name === p.name && !(x.s === s && x.i === i) && !x.s.castOnly);
        const name = (x) => (x === s ? 'this slot' : x.from === s.from ? x.key : x.from);
        if (first && !(s.kind === 'classOptions' && o.repeatable)) s.problems.push(`${p.name} is also ${first.p.auto ? 'given by' : 'chosen under'} ${name(first.s)}: it can't be chosen twice`);
      }
      if (/owers$/.test(s.kind) && !s.castOnly && chArr(ctx.classPowerNames).some((n) => String(n).toLowerCase() === p.name.toLowerCase())) {
        // "If a power is granted to you by a class feature… If you already know that power, you may learn an additional power."
        if (p.auto && s.classFeature) s.hint = `${p.name} is also one of your class powers: you may learn an additional power in its place.`;
        else if (!p.auto) s.problems.push(`${p.name} is already one of your class powers`);
      }
      if (s.kind === 'maneuvers' && classManeuvers.has(p.name)) s.problems.push(`${p.name} is already one of your class maneuvers`);
      // Multiclass Improvement: "Choose two of the multiclass improvement options"; each adds the *other* chosen class's levels.
      if (s.kind === 'multiclassImprovements' && !classes.some((k) => k.name === p.name)) s.problems.push(`${p.name}: you have no levels in ${p.name}`);
    });
    if (s.kind === 'lightsaberForms' && s.picks.some((p) => !p.auto) && casting.force < 0 && !lightweapon) s.problems.push('Lightsaber forms need the ability to cast force powers (or Lightweapon Strategist)');
    if (s.kind === 'multiclassImprovements' && classes.length < 2) s.problems.push('Multiclass improvements need a second class');
  }
  // Feats: prerequisites at the level the feat was taken, with what you could cast before it; taken twice.
  for (const { f, ref, base } of feats) {
    // Another feat as a prerequisite ("Tough: Durable feat"): one taken before this one.
    const before = feats.filter((x) => x.base.order < base.order).map((x) => x.f.name);
    const unmet = waive(chUnmet(ref.prerequisite, { ...pctx, level: base.featLevel, feats: before, casting: castingBefore(base.order, base.key, castingAt(base.takenWith)) }), ref.text || '');
    const problems = [];
    if (unmet.length) problems.push(`The feat needs: ${unmet.join(', ')}${/^Background/.test(f.from) && unmet.some((u) => /level/i.test(u)) ? ' (a background feat is taken at 1st level)' : ''}`);
    if (base.featTwice) problems.push(`${f.name} can be taken only once`);
    const mine = slots.filter((s) => s.key === base.key || s.key.startsWith(`${base.key} (`) || s.key.startsWith(`${base.key} ›`));
    for (const s of mine) s.problems.push(...problems);
    if (!mine.length && problems.length) slots.push({ key: base.key, kind: 'feat', title: f.name, from: base.from, owner: null, count: 0, picks: [], options: [], problems, order: base.order, steps: [] });
  }
  // Picks stored for slots the character doesn't have (yet): shown so they aren't lost silently.
  const orphans = Object.keys(stored).filter((k) => !used.has(k) && chArr(stored[k]).length);
  return { slots, superiority, orphans, level, casting };
}

// ------------------------------------------------------------- class tables, shared with the viewer
/**
 * Multiclass Improvement: "Choose two of the multiclass improvement options", each "You can add half your other
 * chosen class's levels (rounded down) to your operative levels when determining your amount of Sneak Attack dice".
 * The other chosen class is the other improvement picked in the same feat (else the class named in the pick's note,
 * else the only other class). Returns [{ add, columns, other, points: { force|tech: n }, key }] for class k.
 */
function chMulticlassBoosts(raw, k, modules) {
  const out = [];
  const ref = chArr(modules.classes).find((x) => x.name === k.name);
  const cols = Object.keys((((ref && ref.levelChanges) || {})['20']) || {});
  const words = (x) => new Set(String(x).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean).map((w) => w.replace(/s$/, '')));
  const classes = chArr(raw.classes);
  for (const [key, list] of Object.entries(raw.featureChoices || {})) {
    if (!/^Feat: Multiclass Improvement\b/.test(key)) continue;
    const picks = chArr(list).map(chPick).filter(Boolean);
    for (const p of picks) {
      if (p.name !== k.name) continue;
      const others = classes.filter((x) => x !== k);
      const pair = picks.find((q) => q !== p && q.name !== p.name && others.some((x) => x.name === q.name));
      const other = (pair && others.find((x) => x.name === pair.name))
        || others.find((x) => p.note && new RegExp(`\\b${x.name}\\b`, 'i').test(p.note)) || (others.length === 1 ? others[0] : null);
      if (!other) continue;
      const opt = chArr(modules.multiclassImprovements).find((x) => x.name === p.name);
      const text = String((opt && opt.description) || '');
      const add = /add half your other chosen class(?:'|’)s levels/i.test(text) ? Math.floor((Number(other.levels) || 0) / 2) : Number(other.levels) || 0;
      const tw = words(text);
      // The table columns the text names: every word of the column is in it ("Sneak Attack", "Rages", "Superiority Dice Size").
      const columns = cols.filter((c) => !['Level', 'Proficiency Bonus', 'Features', 'Max Power Level'].includes(c) && !/Powers Known|Points$/.test(c)
        && [...words(c)].every((w) => tw.has(w) || ['quantity', 'size', 'die', 'dice', 'known'].includes(w)) && [...words(c)].some((w) => tw.has(w) && !['die', 'dice'].includes(w)));
      const points = {};
      let m;
      if ((m = /you gain 1 (force|tech) point for (each|every two) of your other chosen class(?:'|’)s levels/i.exec(text))) {
        points[m[1].toLowerCase()] = /two/i.test(m[2]) ? Math.floor((Number(other.levels) || 0) / 2) : Number(other.levels) || 0;
      }
      out.push({ add, columns, other: other.name, points, key });
    }
  }
  return out;
}
/** A class's table row at its level, with the columns a multiclass improvement reads at a higher level. */
function chClassRow(raw, k, modules) {
  const ref = chArr(modules.classes).find((x) => x.name === k.name);
  const lc = (ref && ref.levelChanges) || {};
  const row = { ...(lc[String(k.levels)] || {}) };
  for (const b of chMulticlassBoosts(raw, k, modules)) {
    for (const col of b.columns) {
      const v = (lc[String(Math.min(20, (Number(k.levels) || 0) + b.add))] || {})[col];
      if (v != null) row[col] = v;
    }
  }
  return row;
}
/** Superiority dice the classes give (class row or archetype table), for "if you already have a superiority die". */
function chClassSupDice(raw, modules) {
  let n = 0;
  for (const k of chArr(raw.classes)) {
    const row = chClassRow(raw, k, modules);
    const col = Object.keys(row).find((c) => /^superiority dice(?: quantity)?$/i.test(c));
    const aref = k.archetype && chArr(modules.archetypes).find((a) => a.name === k.archetype.name);
    // An archetype's own table (Tactical Specialist, Fireteam) replaces the class's.
    const fromArch = chCls.clsArchetypeTableAt(aref, 'Superiority Dice Quantity', Number(k.levels) || 0) || chCls.clsArchetypeTableAt(aref, 'Superiority Dice', Number(k.levels) || 0);
    const v = col ? parseInt(String(row[col]).replace(/[^\d]/g, ''), 10) : NaN;
    n += fromArch || (Number.isFinite(v) ? v : 0);
  }
  return n;
}
/**
 * The highest power level the classes and archetypes let the character cast, by kind (0: at-will only, -1: none):
 * SW5E's computation (engine: { force, tech }) or the class/archetype tables, the multiclass table when two classes
 * cast the same kind. Powers from feats and other slots are added by choiceSlots.
 */
function chCastingLevels(raw, modules, engine = {}) {
  const out = { force: engine.force != null ? engine.force : -1, tech: engine.tech != null ? engine.tech : -1 };
  const multi = chPw.pwMulticlassMax(raw, modules);
  const table = { force: null, tech: null };
  for (const k of chArr(raw.classes)) {
    for (const c of chPw.pwClassCasting(k, modules)) table[c.type] = Math.max(table[c.type] == null ? -1 : table[c.type], multi[c.type] != null ? multi[c.type] : c.maxLevel);
  }
  // SW5E's engine applies the multiclass table to any multiclass character, even when only one class casts: the
  // tables decide wherever a class or archetype casts that kind.
  for (const kind of ['force', 'tech']) if (table[kind] != null) out[kind] = table[kind];
  return out;
}
/** What the classes know of maneuvers: recorded names, and how many their tables (and grants) give. */
function chClassManeuvers(raw, modules, parsed, rowOf) {
  const names = chArr(raw.classes).flatMap((k) => chArr(k.maneuvers).concat(chArr(k.archetype && k.archetype.maneuvers)));
  const max = chArr(raw.classes).reduce((t, k) => { const i = chClassInfo(k, modules, parsed, { rowOf }); return t + ((i && i.maneuvers && i.maneuvers.max) || 0); }, 0);
  return { names, max };
}

/** The texts of everything picked in slots, for the effects pipeline: [{ name, text, note, weapons, kind, key, owner, species }]. */
function chPickTexts(res) {
  const out = [];
  for (const s of res.slots) {
    for (const p of s.picks) {
      const o = s.options.find((x) => x.name === p.name);
      if (o) out.push({ name: p.name, text: o.text, note: p.note || '', weapons: chArr(p.weapons), kind: s.kind, key: s.key, title: s.title, owner: s.owner, species: !!s.species });
    }
  }
  return out;
}

/**
 * Weapon focus/supremacy benefits for the weapons chosen with them: "+1 bonus to the weapon's damage
 * rolls", "+1 bonus to the weapon's attack rolls", "Your critical hit range increases by 1".
 */
function chWeaponBenefits(text) {
  const t = String(text || '').replace(/\s+/g, ' ');
  const mods = [];
  let m;
  // "+1 bonus to the weapon's damage rolls" (focus), "+1 bonus to attack rolls made with this weapon" (modification).
  for (const x of t.matchAll(/\+(\d+) bonus to (the weapon(?:'|’)s )?(damage|attack) rolls( made with this weapon)?/gi)) {
    if (!x[2] && !x[4]) continue;
    mods.push({ path: x[3].toLowerCase() === 'damage' ? 'weapon.damage' : 'weapon.toHit', bonus: Number(x[1]) });
  }
  const crit = (m = /critical hit range increases by (\d+)/i.exec(t)) ? Number(m[1]) : 0;
  return { mods, critRange: crit };
}

/**
 * A lightsaber form as a state: "Each known form can be adopted on your turn by using your bonus
 * action"; most say what happens "until the start of your next turn" (Juyo: critical range +1).
 * Same shape as clsFeatureState's result.
 */
function chFormState(name, text) {
  const t = String(text || '').replace(/\r/g, '');
  const benefits = t.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const plain = t.replace(/\b(?:until|before) the (?:start|end) of your next turn,?\s*/gi, '').replace(/^./gm, (c) => c.toUpperCase());
  const fe = typeof clsFeatureEffects !== 'undefined' ? clsFeatureEffects(plain, '', { level: 0 }) // eslint-disable-line no-undef
    : require('./classes.js').clsFeatureEffects(plain, '', { level: 0 });
  // Until the start of your next turn, unless the form's text says the end (Soresu: "before the end of your next turn").
  const duration = /\b(?:before|until) the end of your next turn\b/i.test(t) ? 'until the end of your next turn' : 'until the start of your next turn';
  return {
    name, word: null, extension: false, form: true, duration, benefits,
    advantage: fe.advantage, mods: fe.mods, defenses: fe.defenses, critRange: fe.critRange,
  };
}

/**
 * What a class picks from its option lists, archetype lists and maneuvers, with counts.
 * Archetype lists of their own count when their intro says how many ("You gain one of the following
 * features of your choice", "Choose one of the following options"); lists used at the table ("create
 * one of the following effects") and the Engineer's modifications (installed in items) don't.
 */
function chClassInfo(k, modules, parsed, extra = {}) {
  const cls = parsed.classes[k.name];
  const ref = chArr(modules.classes).find((c) => c.name === k.name);
  if (!cls || !ref) return null;
  const archName = k.archetype && k.archetype.name;
  const arch = archName ? parsed.archetypes[archName] : null;
  const archRef = archName ? chArr(modules.archetypes).find((a) => a.name === archName) : null;
  const level = Number(k.levels) || 0;
  const picks = k.options || {};
  // The class table row (extra.rowOf: the viewer's, with columns a multiclass improvement reads at a higher level).
  const row = extra.rowOf ? extra.rowOf(k) : ((ref.levelChanges || {})[String(level)] || {});
  const countAt = (column) => { const v = parseInt(String(row[column] || '').replace(/[^\d]/g, ''), 10); return Number.isFinite(v) ? v : 0; };
  const lists = cls.lists.map((l) => ({
    ...l,
    options: l.options.concat((arch && arch.extends[l.key]) || []),
    max: countAt(l.column),
    chosen: chArr(picks[l.key]),
    source: 'class',
  }));

  for (const l of (arch ? arch.lists : [])) {
    // Engineer modifications: installed in a modified item, as many as its slots.
    const mods = /modifications$/i.test(l.key) ? chModInfo(archRef, ref, k, level) : null;
    if (mods) {
      const chosen = chArr(picks[l.key]);
      const mp = chModProblems(l, chosen, mods, level, extra.itemOf ? (i) => extra.itemOf(k, i) : null);
      lists.push({ ...l, max: mods.total, minLevel: 3, swap: true, chosen, source: 'archetype', column: null, mods, problems: mp.problems, hints: mp.hints });
      continue;
    }
    const c = chArchListCount(l, level, archRef);
    if (!c) continue;
    lists.push({ ...l, max: c.count, minLevel: c.level, swap: c.swap, chosen: chArr(picks[l.key]), source: 'archetype', column: null });
  }
  // Options that need another option ("Ride the Wind needs Curtain of Unyielding Wind or Rush of the Shyrack"), in any list.
  const allOptions = lists.flatMap((l) => l.options);
  const allChosen = lists.flatMap((l) => l.chosen);
  for (const l of lists) if (!l.mods) l.problems = chListProblems(l, l.chosen, allOptions, allChosen);
  // Maneuvers: the class table, an archetype's table, and options that grant more.
  const fromArch = chCls.clsArchetypeTableAt(archRef, 'Maneuvers Known', level) || 0;
  const fromClass = cls.maneuversColumn && !fromArch ? countAt(cls.maneuversColumn) : 0;
  const grants = [];
  for (const l of lists) {
    for (const p of l.chosen) {
      const o = l.options.find((x) => x.name === p.name);
      if (o && o.grants && o.grants.maneuvers) grants.push({ name: o.name, n: o.grants.maneuvers });
    }
  }
  const maneuvers = fromClass || fromArch || grants.length ? {
    max: fromClass + fromArch + grants.reduce((t, g) => t + g.n, 0),
    sources: [fromClass ? `${fromClass} from the ${k.name} table` : '', fromArch ? `${fromArch} from ${archName}` : '',
      ...grants.map((g) => `${g.n} from ${g.name}`)].filter(Boolean),
    chosen: chArr(k.maneuvers).concat(chArr(k.archetype && k.archetype.maneuvers)),
  } : null;
  return { level, lists, maneuvers, archetypes: chArr(modules.archetypes).filter((a) => a.className === k.name).map((a) => a.name).sort() };
}

/**
 * An Engineer archetype's modifications: { perItem, items, total, item ('weapon'|'armor'|'lightsaber'|null),
 * what, penalty, itemNames } or null. "Your modified weapon has 4 modification slots… as shown in the
 * Modification Slots column", "At 9th level, you can maintain two modified weapons" (each with its slots;
 * the Artificer's "total modification slots are split across the two items"), and "For each modification
 * installed in excess of your proficiency bonus, your tech point maximum is reduced by 1".
 */
function chModInfo(archRef, classRef, k, level) {
  const raw = String((archRef && archRef.text) || '');
  const t = raw.replace(/\s+/g, ' ');
  if (!/Modification Slots column/i.test(t)) return null;
  const row = ((classRef && classRef.levelChanges) || {})[String(level)] || {};
  const perItem = parseInt(String(row['Modification Slots'] || '').replace(/\D/g, ''), 10) || 0;
  const two = level >= 9 && /At 9th level, you can maintain (?:two|both)\b/i.test(t);
  const split = /total modification slots are split across the two items/i.test(t);
  const item = /modify one unenhanced weapon/i.test(t) ? 'weapon' : /modify one unenhanced suit of armor or shield/i.test(t) ? 'armor'
    : /modify an unenhanced lightsaber/i.test(t) ? 'lightsaber' : null;
  const what = (/^### (Modified [\w' ]+|Gadgeteer Harness|Electronic Warfare Platform|Cyberpad|Cybernetic Augmentations?)\s*$/m.exec(raw) || [])[1] || 'Modified item';
  return {
    perItem, items: item && two ? 2 : 1, total: two && !split ? perItem * 2 : perItem, item, what,
    penalty: /for each modification installed in excess of your proficiency bonus, your tech point maximum is reduced by 1/i.test(t),
    secondShield: /maintain both a modified suit of armor and(?: a)? shield/i.test(t),
    attune: /\brequires attunement\b/i.test(t), // "Your modified weapon is enhanced, requires attunement…"
    itemNames: chArr(k.modifiedItems),
  };
}
/** Does a catalog item fit a modification prerequisite like "Blaster", "Armor", "Physical Shield"? null: can't tell. */
function chItemFits(word, ref) {
  if (!ref) return null;
  const w = String(word).toLowerCase();
  const cls = String(ref.weaponClassification || '');
  const shield = /shield/i.test(ref.armorClassification || '') || ref.type === 'Shield';
  const generator = shield && /generator/i.test(`${ref.name} ${ref.armorClassification || ''}`);
  const props = (ref.properties || []).map((p) => String(p).toLowerCase());
  let m;
  // "Blaster with the strength property", "Vibroweapon with the dexterity property".
  if ((m = /^(.+?) with the ([\w-]+) property$/.exec(w))) {
    const kind = chItemFits(m[1], ref);
    return kind === false ? false : props.some((p) => p.startsWith(m[2]));
  }
  if (/blaster/.test(w)) return /blaster/i.test(cls);
  if (/vibro/.test(w)) return /vibro/i.test(cls);
  if (/light(?:weapon|saber)/.test(w)) return /light/i.test(cls);
  if (/shield generator/.test(w)) return generator;
  if (/physical shield/.test(w)) return shield && !generator;
  if (/shield/.test(w)) return shield;
  if (/^armor$/.test(w)) return (ref.equipmentCategory === 'Armor' || ref.type === 'Armor') && !shield;
  return null;
}
/** Edit distance between two short strings (SW5E's data misspells some prerequisites: "Prothesis"). */
function chDistance(a, b) {
  const x = String(a).toLowerCase();
  const y = String(b).toLowerCase();
  const d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return d[x.length][y.length];
}
/**
 * The parts of a prerequisite that name options of a list: [[name, …]] (each inner list is "any of"), with the
 * rest (levels, item kinds) left over. Whole option names are matched first, longest first, so "Cryo Amplifier, Mk II"
 * isn't split at its comma; "A, B, or C" is any of them; misspellings ("Brawny Arm Prothesis") match within 2 letters.
 */
function chPrereqOptions(prerequisite, options) {
  let rest = String(prerequisite || '');
  const groups = [];
  const names = options.map((o) => o.name).sort((a, b) => b.length - a.length);
  const esc = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // "A, B, or C" / "A or B" lists of option names: any of them.
  const anyList = new RegExp(`((?:${names.map(esc).join('|')})(?:,? (?:or )?(?:${names.map(esc).join('|')}))+)`, 'i');
  let m;
  if (names.length && (m = anyList.exec(rest)) && /\bor\b/i.test(m[1])) {
    groups.push(names.filter((n) => new RegExp(esc(n), 'i').test(m[1])));
    rest = rest.replace(m[1], '');
  }
  for (const n of names) {
    const re = new RegExp(`(?:^|,\\s*)${esc(n)}(?=\\s*(?:,|$))`, 'i');
    if (re.test(rest)) { groups.push([n]); rest = rest.replace(re, ''); }
  }
  const unknown = [];
  for (const part of rest.split(/,\s*/).map((x) => x.trim()).filter(Boolean)) {
    if (/\d+(?:st|nd|rd|th) level/i.test(part)) continue;
    const near = options.map((o) => o.name).find((n) => chDistance(n, part) <= 2);
    if (near) groups.push([near]);
    else unknown.push(part);
  }
  return { groups, rest: unknown };
}
/**
 * Problems with installed modifications: level, prerequisites (another modification on the same item, the item's
 * kind), how often each can be installed (once, twice, once per arm, a different damage type each time),
 * incompatible conversions, which item they go on, too many per item.
 */
function chModProblems(list, chosen, mods, level, itemOf) {
  const out = [];
  const hints = [];
  chosen.forEach((p, i) => {
    const o = list.options.find((x) => x.name === p.name);
    if (!o) return;
    const item = p.item || 0;
    const sameItem = chosen.filter((q) => (q.item || 0) === item);
    if (item >= mods.items) out.push(`${p.name} is on item ${item + 1}, but you have ${mods.items === 1 ? 'one modified item' : `${mods.items} modified items`}${mods.items === 1 ? ' before 9th level' : ''}`);
    if (o.minLevel > level) out.push(`${p.name} needs ${o.minLevel}th level`);
    const pre = chPrereqOptions(o.prerequisite, list.options);
    for (const g of pre.groups) {
      if (!g.some((n) => sameItem.some((q) => q.name === n))) out.push(`${p.name} needs ${g.join(' or ')} installed${mods.items > 1 ? ' on the same item' : ''}`);
    }
    for (const q of pre.rest) {
      const fits = itemOf ? chItemFits(q, itemOf(item)) : null;
      if (fits === false) out.push(`${p.name} needs a ${q.toLowerCase()} as the ${mods.what.toLowerCase()}`);
      else if (fits === null && !/^(?:armor|shield|blaster|vibroweapon|lightweapon|lightsaber|jet pack|physical shield|shield generator|.+ with the [\w-]+ property)$/i.test(q)) hints.push(`${p.name}'s prerequisite "${q}" isn't a modification in SW5E's data`);
    }
    const copies = sameItem.filter((q) => q.name === p.name);
    const limit = o.perArm ? Math.max(1, sameItem.filter((q) => /arm prosthesis/i.test(q.name)).length) : o.limit;
    if (limit && copies.length > limit && copies.indexOf(chosen[i]) === limit) {
      out.push(`${p.name} can be installed ${limit === 1 ? 'once' : limit === 2 ? 'twice' : `${limit} times`}${o.perArm ? ' (once per arm prosthesis)' : ''}${mods.items > 1 ? ' on an item' : ''}`);
    }
    if (o.distinctNote && copies.length > 1 && copies.indexOf(chosen[i]) > 0 && copies.slice(0, copies.indexOf(chosen[i])).some((q) => String(q.note || '').trim().toLowerCase() === String(p.note || '').trim().toLowerCase())) {
      out.push(`${p.name}: choose a different damage type each time (write it in the pick's note)`);
    }
    if (o.incompatible) {
      const other = sameItem.find((q) => q !== chosen[i] && q.name !== p.name && (list.options.find((x) => x.name === q.name) || {}).incompatible === o.incompatible);
      if (other && chosen.indexOf(other) < i) out.push(`${p.name} is incompatible with ${other.name} (other ${o.incompatible}s)`);
    }
  });
  if (mods.items > 1 && mods.total > mods.perItem) {
    for (let it = 0; it < mods.items; it++) {
      const n = chosen.filter((p) => (p.item || 0) === it).length;
      if (n > mods.perItem) out.push(`${n} modifications on item ${it + 1}; it has ${mods.perItem} slots`);
    }
  }
  // Armormech at 9th: "both a modified suit of armor and shield".
  if (mods.items > 1 && mods.secondShield && itemOf) {
    const a = itemOf(0);
    const b = itemOf(1);
    if (a && b && chItemFits('shield', a) === chItemFits('shield', b)) out.push('Your two modified items are a suit of armor and a shield');
  }
  return { problems: [...new Set(out)], hints: [...new Set(hints)] };
}
/** Problems with picks in a class or archetype list: options that need another option of the list ("Ride the Wind needs Curtain of Unyielding Wind or Rush of the Shyrack"). */
function chListProblems(list, chosen, allOptions = list.options, allChosen = chosen) {
  const out = [];
  chosen.forEach((p, i) => {
    const o = list.options.find((x) => x.name === p.name);
    if (o && !o.repeatable && chosen.findIndex((q) => q.name === p.name) !== i) out.push(`${p.name} is chosen twice: it can be taken only once`);
  });
  for (const p of chosen) {
    const o = list.options.find((x) => x.name === p.name);
    if (!o || !o.prerequisite) continue;
    const groups = o.anyOf ? [o.anyOf.map((n) => (allOptions.find((x) => chDistance(x.name, n) <= 2) || { name: n }).name).filter((n) => allOptions.some((x) => x.name === n))].filter((g) => g.length)
      : chPrereqOptions(o.prerequisite, allOptions).groups;
    for (const g of groups) if (!g.some((n) => allChosen.some((q) => q.name === n))) out.push(`${p.name} needs ${g.join(' or ')}`);
  }
  return [...new Set(out)];
}

/**
 * How many picks an archetype's own list gives, from its intro: { count, level, swap } or null.
 * "_**Hunter Technique:** 3rd level_ You gain one of the following features of your choice." → 1 at 3rd.
 */
function chArchListCount(list, level, archRef) {
  const intro = String(list.intro || '').replace(/\s+/g, ' ');
  const lv = /^_\*\*[^*]+:\*\*\s*([^_]+)_/.exec(intro);
  const at = lv ? Math.min(...[...lv[1].matchAll(/(\d+)(?:st|nd|rd|th)/g)].map((x) => Number(x[1]))) : 0;
  if (at && level < at) return null;
  // Effects you choose when you use the feature aren't picks.
  if (/\b(?:create|use|perform|make)\b[^.]*\bone of the following (?:effects|songs)\b|\bchoice of one of the following effects\b|you have (?:three|four) such effects/i.test(intro)) return null;
  const m = /\b(?:you )?(?:gain|choose|learn|select|adopt)(?: from)? (one|two|three) of the following(?: \w+)?(?: of your choice)?\b/i.exec(intro);
  if (!m) return archRef ? chProseCount(list, archRef, level) : null;
  const swap = /\bover the course of a long rest, you can (?:select|choose) a different\b|when you complete a (?:short or )?long rest, you can choose one of the following\b/i.test(intro);
  // "You gain an additional option at 11th and 17th level."
  const more = /\byou gain an additional option at ((?:\d+(?:st|nd|rd|th)(?:,? (?:and )?)?)+) level/i.exec(intro);
  const add = more ? [...more[1].matchAll(/(\d+)/g)].filter((x) => level >= Number(x[1])).length : 0;
  return { count: chNum(m[1]) + add, level: at, swap };
}

/**
 * A list counted in other features' prose: "You learn two totems of your choice" (3rd), "You learn a third
 * totem" (10th); "You know two ammunition enhancements… You gain an additional Ammunition Enhancement
 * option of your choice when you reach certain levels: 7th, 10th…". { count, level, swap } or null.
 */
function chProseCount(list, archRef, level) {
  const noun = String(list.title).replace(/\s+options?$/i, '').replace(/s$/i, '').trim();
  if (!noun) return null;
  const n = noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let count = 0;
  let from = 0;
  let swap = false;
  for (const f of chCls.clsTextFeatures(archRef.text, archRef.name, 'Archetype')) {
    if (f.level > level) continue;
    const t = f.text.replace(/\s+/g, ' ');
    let m;
    if ((m = new RegExp(`\\byou (?:know|learn) (one|two|three|four|five) ${n}s?\\b`, 'i').exec(t))) { count = Math.max(count, chNum(m[1])); from = from || f.level; }
    if ((m = new RegExp(`\\byou learn an? (second|third|fourth|fifth|sixth) ${n}\\b`, 'i').exec(t))) count = Math.max(count, { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 }[m[1].toLowerCase()]);
    if ((m = new RegExp(`\\badditional ${n} options? of your choice when you reach certain levels?[^.]*?((?:\\d+(?:st|nd|rd|th)(?:,? (?:and )?)?)+)`, 'i').exec(t))) count += [...m[1].matchAll(/(\d+)/g)].filter((x) => level >= Number(x[1])).length;
    if (new RegExp(`(?:when you (?:complete|finish) a (?:short or )?long rest|over the course of a long rest)[^.]*replace one ${n}|replace one ${n}[^.]*(?:when you (?:complete|finish) a (?:short or )?long rest|over the course of a long rest)`, 'i').test(t)) swap = true;
  }
  return count ? { count, level: from, swap } : null;
}

if (typeof module !== 'undefined') {
  module.exports = { CH_KINDS, chGrants, chOptions, chFeats, chUnmet, choiceSlots, chPickTexts, chWeaponBenefits, chClassInfo, chArchListCount, chFormState,
    chModInfo, chItemFits, chMulticlassBoosts, chClassRow, chClassSupDice, chCastingLevels, chClassManeuvers };
}
