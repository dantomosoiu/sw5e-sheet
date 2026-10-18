/* SW5E Character Sheet Viewer: force and tech powers.
 *
 * Who can cast what, read from SW5E's rules data:
 *   - classes that cast (Consular, Guardian, Sentinel: force; Engineer, Scout: tech): "Force Powers Known",
 *     "Max Power Level" and points columns of the class table; picks in SW5E's own classes[i].forcePowers /
 *     techPowers, which its engine shows;
 *   - archetypes that cast (Marauder, Adept Specialist, Slicer, Rakatan Order…): the same columns in the
 *     archetype's table; picks in classes[i].archetype.forcePowers / techPowers;
 *   - powers that features, options, feats and species give on top ("You learn the *burst* force power,
 *     which does not count against your total powers known", "Choose two tech powers of 1st level… not
 *     included in the number in the Powers Known column", "When you reach 3rd level, you learn and can cast
 *     the *repair droid* tech power once per long rest", Vow of the Devoted). Those become choice slots
 *     (choices.js) through pwGrants below.
 * Casting: a power costs its level + 1 points (at-will powers cost nothing), cast at any level up to the
 * max power level; powers of 6th level and higher once per long rest (archetype casters: 4th).
 */
'use strict';

const PW_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
const pwNum = (w) => (PW_NUM[String(w).toLowerCase()] != null ? PW_NUM[String(w).toLowerCase()] : Number(w) || 0);
const pwOrd = (s) => parseInt(String(s || '').replace(/[^\d]/g, ''), 10) || 0;
const pwArr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const pwTitle = (s) => String(s).replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
/** A power name as written in rule text (*force push*) → SW5E's name ("Force Push"). */
const pwName = (s) => pwTitle(String(s).trim().replace(/\s+/g, ' '));

/** A level list "3rd, 5th, 7th, and 17th" → [3, 5, 7, 17]. */
const pwLevels = (s) => [...String(s || '').matchAll(/(\d+)(?:st|nd|rd|th)/g)].map((x) => Number(x[1]));

/**
 * "Your Max Power Level is 1st. It increases to 2nd at 7th level, 3rd at 13th level, and 4th at 17th level."
 * → the max power level at `level`, or null when the text doesn't say.
 */
function pwTextMaxLevel(text, level) {
  const t = String(text || '').replace(/\s+/g, ' ');
  const m = /Your Max Power Level is (\d)(?:st|nd|rd|th)\.(?: It increases to ([^.]+)\.)?/i.exec(t);
  if (!m) return null;
  let v = Number(m[1]);
  for (const x of String(m[2] || '').matchAll(/(\d)(?:st|nd|rd|th) at (\d+)(?:st|nd|rd|th) level/g)) if (level >= Number(x[2])) v = Number(x[1]);
  return v;
}

/**
 * Powers a text gives besides a class's powers known, as choice-slot grants:
 * [{ kind: 'forcePowers'|'techPowers'|'powers', count, allowed?, fixed?, minLevel?, levelMin?, levelMax?, level?,
 *    addAt?, oncePerRest?, free?, castOnly?, useFeature?, abilities?, castAs?, alignment?, noConcSelf?, fromKnown?, notCounted }]
 *   level      exact power level (feats: "two at-will force powers", "one 1st-level force power")
 *   levelMin/levelMax  a range ("of 1st or 2nd level", "2nd level or lower"); levelMax 'class' = your Max Power Level
 *   fixed      named powers ("You learn the *burst* force power") — allowed lists the names
 *   castOnly   you may cast it (free, once per rest…) but don't learn it: it isn't a power you know
 *   oncePerRest 'longRest' | 'shortRest': cast once, then not again until that rest
 *   useFeature the casts spend the granting feature's own uses ("You can use this feature twice")
 *   free       you can cast it without spending points ('base' or the level: "at 5th level")
 *   abilities  the casting ability the text names ("Wisdom or Charisma (your choice) is your forcecasting modifier")
 *   castAs     'force' | 'tech' | 'either': what the powers count as ("count as tech powers for you")
 * opts.level: the level that "at 7th level" sentences compare against (the class level for class features).
 */
function pwGrants(text, opts = {}) {
  const raw = String(text || '').replace(/\r/g, '');
  const t = raw.replace(/\s+/g, ' ');
  const out = [];
  const kindOf = (w) => (/force/i.test(w || '') ? 'forcePowers' : /tech/i.test(w || '') ? 'techPowers' : 'powers');
  // Power names are in *asterisks* (or, now and then, _underscores_).
  const names = (s) => [...String(s).matchAll(/[*_]([^*_]+)[*_]/g)].map((x) => pwName(x[1]));
  const NAMES = '((?:[*_][^*_]+[*_](?:,? (?:and |or )?)?)+)';
  // The casting ability the text names for these powers.
  const ab = /\b((?:Intelligence|Wisdom|Charisma)(?:,? (?:or )?(?:Intelligence|Wisdom|Charisma))*)(?: \(your choice\))? is your (?:force|tech) ?casting (?:ability|modifier) for (?:these powers|this power|them|it)\b/i.exec(t)
    || /\byou can use (Wisdom or Charisma|Intelligence, Wisdom, or Charisma) as your (?:force|tech)casting ability for (?:it|them|this power)\b/i.exec(t);
  const abilities = ab ? ab[1].split(/,? (?:or )?/).map((x) => x.trim()).filter((x) => /^(?:Intelligence|Wisdom|Charisma)$/.test(x)) : null;
  // What a cast-only feature allows: "Once you've used this feature/cast a power using this feature, you must complete a
  // (short or) long rest", "You cannot use it again until you finish a short or long rest", "You can use this feature N times".
  const limitAfter = (from) => {
    const rest = t.slice(from, from + 400);
    let x;
    if ((x = /\b(?:once you(?:'|’)ve (?:used this (?:feature|ability)|cast (?:a|this) power using this feature|done so)|once you have used this ability),? you (?:must complete|cannot use it again until you (?:finish|complete)|can(?:'|’)t (?:do so|use it|cast it) again until you (?:finish|complete)) an? (short or )?long rest/i.exec(rest))
      || (x = /\byou (?:cannot|can(?:'|’)t) (?:use (?:it|this feature)|do so) again until you (?:finish|complete) an? (short or )?long rest/i.exec(rest))) return { oncePerRest: x[1] ? 'shortRest' : 'longRest' };
    if (/\byou can use (?:this feature|these features)(?: a combined)? (?:once|twice|\w+ times)\b|\ba number of times equal to\b/i.test(rest)) return { useFeature: true };
    return {};
  };
  let m;
  let pos = 0;
  for (const s of t.split(/(?<=[.!?])\s+/)) {
    const at = t.indexOf(s, pos);
    pos = at + s.length;
    const once = /\bonce per (?:long rest|day)\b/i.test(s) ? 'longRest' : null;
    const reach = /^(?:- )?when you reach (\d+)(?:st|nd|rd|th) level,?/i.exec(s);
    const minLevel = reach ? Number(reach[1]) : 0;
    const noConcSelf = /no longer requires concentration for you when you target yourself|does not require concentration/i.test(t.slice(at, at + 400));
    // "You learn the *burst* force power, which does not count against your total powers known."
    // "You know the *ion blast* at-will tech power." "- You learn the *alarm* tech power. You can cast it once … without
    // spending tech points, and you regain the ability to do so when you finish a long rest." (a free cast as well)
    // "When you reach 3rd level, you learn and can cast the *curse* force power once per long rest."
    if ((m = new RegExp(`\\byou (?:learn|know)( and can cast)? (?:the )?${NAMES}(?: at-will)? ?(force |tech )?(?:at-will )?powers?\\b`, 'i').exec(s)) && !/your choice of/i.test(s)) {
      const ns = names(m[2]);
      if (!ns.length) continue;
      const g = { kind: kindOf(m[3]), count: ns.length, allowed: ns, fixed: true, minLevel, oncePerRest: m[1] ? once : null, notCounted: true, abilities, noConcSelf };
      out.push(g);
      // "…and can cast it at first level without using tech points. Once you have used this ability, you cannot use it
      // again until you finish a short or long rest." / "You can cast it once … without spending tech points, and you
      // regain the ability to do so when you finish a long rest." / "when you cast this power targeting your beast, you
      // do so without spending tech points".
      const next = t.slice(at, at + s.length + 260);
      let fm;
      if ((fm = /\b(?:and )?(?:you )?can cast (?:it|this power)(?: once)?(?: at (first|1st|\d(?:st|nd|rd|th)) level)?[^.]*?\bwithout (?:spending|expending|using|the use of)[^.]*?(?:force |tech )?points\b([^.]*)/i.exec(next))
        || (fm = /\bwhen you cast this power targeting your (\w+), you do so without spending (?:force |tech )?points/i.exec(next))) {
        const lim = /regain the ability to do so when you finish a long rest/i.test(fm[0]) ? { oncePerRest: 'longRest' }
          : /regain the ability to do so when you finish a short or long rest/i.test(fm[0]) ? { oncePerRest: 'shortRest' } : limitAfter(at + s.length);
        const lv = fm[1] && /^\d|first/i.test(fm[1]) ? (/first/i.test(fm[1]) ? 1 : pwOrd(fm[1])) : 'base';
        out.push({ ...g, fixed: true, castOnly: true, free: lv, ...lim, target: (/targeting your (\w+)/i.exec(fm[0]) || [])[1] || null });
      }
      continue;
    }
    // "you learn your choice of the *encrypted message* or *minor hologram* tech power",
    // "You know your choice of the *turbulence*, *force disarm*, or *slow* at-will force powers",
    // "When you reach 3rd level, you can cast your choice of the *curse*, *dun moch*, or *hex* force power once per day."
    if ((m = new RegExp(`\\byou (learn|know|can cast) your choice of the ${NAMES}(?: at-will)? ?(force |tech )?(?:at-will )?powers?\\b`, 'i').exec(s))) {
      const ns = names(m[2]);
      if (ns.length) out.push({ kind: kindOf(m[3]), count: 1, allowed: ns, minLevel, oncePerRest: once, notCounted: true, abilities, castOnly: /cast/i.test(m[1]), free: /cast/i.test(m[1]) && once ? 'base' : null });
      continue;
    }
    // "You can cast the *telekinesis* force power at 5th level without spending force points. Once you've used this
    // feature, you must complete a long rest before you can use it again."
    // "Once per long rest, you can cast the *battle meditation* force power at its base level without expending force points."
    if ((m = new RegExp(`\\byou can (?:also )?cast the ${NAMES} ?(force |tech )?powers?(?: at (\\d)(?:st|nd|rd|th)[ -]level| at its base level)?[^.]*?\\bwithout (?:spending|expending|using) (?:force |tech )?points\\b`, 'i').exec(s))
      && !/\b(?:as a part of|when you|whenever|while|if you|during that time|you can use your (?:reaction|action) to)\b/i.test(s.slice(0, m.index))) {
      const ns = names(m[1]);
      const lim = once || /^once per long rest/i.test(s) ? { oncePerRest: 'longRest' } : limitAfter(at + s.length);
      if (ns.length) out.push({ kind: kindOf(m[2]), count: ns.length, allowed: ns, fixed: true, minLevel, free: m[3] ? Number(m[3]) : 'base', castOnly: true, notCounted: true, abilities, noConcSelf, ...lim });
      continue;
    }
    // "You can cast one 5th-level tech power of your choice at its base level. … The power counts as a universal force
    // power for you." (Mechu-deru Mastery; once per long rest)
    if ((m = /\byou can cast one (\d)(?:st|nd|rd|th)-level (force |tech )?power of your choice(?: at its base level)?/i.exec(s))) {
      const after = t.slice(at + s.length, at + s.length + 300);
      const as = /power counts as an? (universal force|tech) power for you/i.exec(t.slice(at, at + 500));
      out.push({ kind: kindOf(m[2]), count: 1, level: Number(m[1]), minLevel, free: 'base', notCounted: true, castOnly: true, abilities,
        castAs: as ? (/tech/i.test(as[1]) ? 'tech' : 'force') : null,
        oncePerRest: once || (/until you (?:finish|complete) a long rest/i.test(after) ? 'longRest' : /until you (?:finish|complete) a short or long rest/i.test(after) ? 'shortRest' : null) });
      continue;
    }
    // "Choose one 3rd-level force power that you know as your signature power. You can cast it once at 3rd level without
    // expending force points." (One with the Force; it comes back on a short or long rest)
    if ((m = /\bChoose one (\d)(?:st|nd|rd|th)-level (force |tech )?power that you know as your signature power/i.exec(s))) {
      const after = t.slice(at, at + 400);
      out.push({ kind: kindOf(m[2]), count: 1, level: Number(m[1]), fromKnown: true, free: Number(m[1]), castOnly: true, notCounted: true,
        oncePerRest: /short or long rest/i.test(after) ? 'shortRest' : 'longRest' });
      continue;
    }
    // "You can cast the *sense force* force power once per day." / "Once per day, you can cast the *fear* force power."
    // "When you reach 5th level, you can also cast the *infiltrate* tech power once per day." (Umbaran)
    if ((m = new RegExp(`\\byou can (?:also )?cast the ${NAMES} ?(force |tech )?powers?\\b`, 'i').exec(s)) && once
      && !/\b(?:as a part of|when you|whenever|while|if you|during that time)\b/i.test(s.slice(0, m.index).replace(/^(?:- )?when you reach \d+\w* level,?/i, ''))) {
      const ns = names(m[1]);
      if (ns.length) out.push({ kind: kindOf(m[2]), count: ns.length, allowed: ns, fixed: true, minLevel, free: 'base', oncePerRest: once, castOnly: true, notCounted: true, abilities });
      continue;
    }
    // "As an action, you can activate this augmentation to cast the *infiltrate* tech power targeting yourself" /
    // "While wielding your modified weapon, you can cast the _absorb energy_ tech power": cast with your points.
    if ((m = new RegExp(`\\byou can (?:activate [\\w ]+ to )?cast the ${NAMES} ?(force |tech )?powers?\\b`, 'i').exec(s))
      && !/without (?:spending|expending|using)/i.test(s) && !/\b(?:as a part of|when you|whenever|if you|during that time|instead)\b/i.test(s.slice(0, m.index))) {
      const ns = names(m[1]);
      if (ns.length) out.push({ kind: kindOf(m[2]), count: ns.length, allowed: ns, fixed: true, minLevel, castOnly: true, notCounted: true, abilities, noConcSelf, ...limitAfter(at + s.length) });
    }
  }
  // "Choose two force powers of 1st level." / "of no higher level than your Max Power Level" / "of 1st level or lower".
  // The chosen powers "are not included in the number in the Powers Known column".
  if ((m = /\bChoose (one|two|three) (force|tech) powers of (no higher level than your Max Power Level|(\d)(?:st|nd|rd|th) level( or lower)?)/i.exec(t))) {
    const add = /You learn (?:two|one) additional powers? at ((?:\d+(?:st|nd|rd|th)(?:,? (?:and )?)?)+) level/i.exec(t);
    // "The chosen powers count as tech powers for you" (cast with tech points) / "as universal force powers".
    const as = /chosen powers count as (both universal force powers and tech powers|tech powers|universal force powers)/i.exec(t);
    const castAs = !as ? null : /both/i.test(as[1]) ? 'either' : /tech/i.test(as[1]) ? 'tech' : 'force';
    const g = { kind: kindOf(m[2]), count: pwNum(m[1]), addAt: add ? pwLevels(add[1]).map((l) => ({ level: l, count: /two additional/i.test(add[0]) ? 2 : 1 })) : [], notCounted: true, castAs, replaceOnLevel: /whenever you gain a level in this class, you can choose one of the/i.test(t) };
    if (/max power level/i.test(m[3])) { g.levelMin = 0; g.levelMax = 'class'; } else if (m[5]) { g.levelMin = 0; g.levelMax = Number(m[4]); } else { g.levelMin = Number(m[4]); g.levelMax = Number(m[4]); }
    out.push(g);
    // "At 7th level, you learn two additional force powers of 1st or 2nd level. At 13th level, you learn two force
    // powers of 1st-3rd level" / "At 7th level, you learn two tech powers of 2nd level or lower."
    for (const x of t.matchAll(/At (\d+)(?:st|nd|rd|th) level, you learn (one|two) (?:additional )?(force|tech) powers of (?:(\d)(?:st|nd|rd|th)(?: or |-)(\d)(?:st|nd|rd|th) level|(\d)(?:st|nd|rd|th) level or lower)/gi)) {
      out.push({ kind: kindOf(x[3]), count: pwNum(x[2]), minLevel: Number(x[1]), classLevel: true, levelMin: x[6] ? 0 : Number(x[4]), levelMax: Number(x[6] || x[5]), notCounted: true, castAs });
    }
  }
  // Vow of the Devoted: "You learn 2 force powers of your choice. You learn an additional power at 3rd, 5th…
  // level. … You may only learn universal powers in this way." + "Your Max Power Level is 1st. It increases…"
  if ((m = /\bYou learn (\d+|one|two|three) (force|tech) powers of your choice\. You learn an additional power at ((?:\d+(?:st|nd|rd|th)(?:,? (?:and )?)?)+) level/i.exec(t))) {
    const align = /You may only learn (universal|light side|dark side) powers in this way/i.exec(t);
    out.push({
      kind: kindOf(m[2]), count: pwNum(m[1]), addAt: pwLevels(m[3]).map((l) => ({ level: l, count: 1 })), levelMin: 0,
      levelMax: pwTextMaxLevel(t, opts.level || 0) ?? 'class', alignment: align ? pwTitle(align[1].replace(/ side/i, '')) : null, notCounted: true,
      focus: /cast using your focus points/i.test(t), onceLevels: pwOnceLevels(t),
    });
  }
  return out;
}

/** "You may only cast force powers at 6th, 7th, 8th, and 9th-level once" → [6, 7, 8, 9]; Mechanist: "at 5th, 6th, and 7th-level once, instead of 4th and 5th" → [5, 6, 7]. */
function pwOnceLevels(text) {
  const m = /\bYou may only cast (?:force|tech) powers at ((?:\d+(?:st|nd|rd|th)(?:,? (?:and )?)?)+)-level once\b/i.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? pwLevels(m[1]) : [];
}

/** The highest power level a class/archetype table gives at a level ("3rd" → 3; "—" → 0). */
const pwTableLevel = (v) => pwOrd(v);

/**
 * How a class casts at its level: [{ type: 'force'|'tech', source: 'class'|'archetype', from (name), known,
 * maxLevel, points (table column, before the ability modifier), field ('forcePowers' | 'archetype.forcePowers'),
 * chosen: [name], highOnce (the lowest level castable only once per long rest), potential (max power level at 20) }].
 */
function pwClassCasting(k, modules) {
  const out = [];
  const level = Number(k.levels) || 0;
  const cref = pwArr(modules.classes).find((c) => c.name === k.name);
  const aref = k.archetype && k.archetype.name ? pwArr(modules.archetypes).find((a) => a.name === k.archetype.name) : null;
  if (cref && cref.casterType && cref.casterType !== 'None') {
    const row = (cref.levelChanges || {})[String(level)] || {};
    const type = cref.casterType.toLowerCase();
    const T = cref.casterType;
    // "You may only cast force powers at 4th and 5th-level once" (Guardian, Scout), "5th, 6th, and 7th" (Sentinel)…
    const once = pwOnceLevels(cref.classFeatureText);
    out.push({
      type, source: 'class', from: k.name, known: pwOrd(row[`${T} Powers Known`]), maxLevel: pwTableLevel(row['Max Power Level']),
      points: pwOrd(row[`${T} Points`]), field: `${type}Powers`, chosen: pwArr(k[`${type}Powers`]), onceLevels: once.length ? once : [6, 7, 8, 9],
      highOnce: once.length ? Math.min(...once) : 6, potential: pwTableLevel(((cref.levelChanges || {})['20'] || {})['Max Power Level']),
      level,
    });
  }
  // Archetype casters: a "<Type> Powers Known" column in the archetype's table (Rakatan Order has it although
  // SW5E's data calls it a non-caster).
  const lt = aref && aref.leveledTable;
  if (lt && typeof lt === 'object') {
    const at = (col, lv) => {
      let best = null;
      for (const [l, rows] of Object.entries(lt)) {
        if (Number(l) > lv) continue;
        const r = pwArr(rows).find((x) => x && x.key === col);
        if (r && (!best || Number(l) > best.l)) best = { l: Number(l), v: r.value };
      }
      return best ? best.v : null;
    };
    for (const T of ['Force', 'Tech']) {
      if (at(`${T} Powers Known`, 20) == null) continue;
      const type = T.toLowerCase();
      const once = pwOnceLevels(aref.text);
      // "Improved Techcasting: You know 7 tech powers of your choice, instead of 5…" (Mechanist): the archetype's
      // table replaces the class's casting, and its picks stay in the class's own field.
      const replaces = /\bPowers Known\b[^#]*?\binstead of\b/i.test(aref.text || '') && out.some((c) => c.source === 'class' && c.type === type);
      const minLv = Math.min(...Object.keys(lt).map(Number).filter((l) => pwArr(lt[l]).some((r) => r && r.key === `${T} Powers Known`)));
      if (replaces && level >= minLv) {
        const i = out.findIndex((c) => c.source === 'class' && c.type === type);
        const cls = out[i];
        out.splice(i, 1);
        out.push({
          ...cls, source: 'archetype', from: aref.name, replaces: cls.from, known: pwOrd(at(`${T} Powers Known`, level)), maxLevel: pwTableLevel(at('Max Power Level', level)),
          points: pwOrd(at(`${T} Points`, level)), onceLevels: once.length ? once : cls.onceLevels, highOnce: once.length ? Math.min(...once) : cls.highOnce,
          potential: pwTableLevel(at('Max Power Level', 20)),
        });
        continue;
      }
      if (replaces) continue;
      out.push({
        type, source: 'archetype', from: aref.name, known: pwOrd(at(`${T} Powers Known`, level)), maxLevel: pwTableLevel(at('Max Power Level', level)),
        points: pwOrd(at(`${T} Points`, level)), field: `archetype.${type}Powers`, chosen: pwArr(k.archetype && k.archetype[`${type}Powers`]),
        onceLevels: once.length ? once : [4], highOnce: once.length ? Math.min(...once) : 4, potential: pwTableLevel(at('Max Power Level', 20)), level,
      });
    }
  }
  return out.filter((c) => c.known || c.maxLevel || c.chosen.length);
}

/**
 * Multiclassing: "dividing each class's potential Max Power Level by 9, multiplying the result by the number of
 * levels in that class, adding the results for each class together, and consulting the Multiclass Max Power Level
 * table" (caster level 1-2 → 1st, 3-4 → 2nd … 17+ → 9th). Only with casting from more than one class.
 * Returns { force, tech }: the level you can cast at (null when one class decides).
 */
function pwMulticlassMax(raw, modules) {
  const out = { force: null, tech: null };
  for (const type of ['force', 'tech']) {
    const srcs = pwArr(raw.classes).flatMap((k) => pwClassCasting(k, modules).filter((c) => c.type === type).map((c) => ({ k, c })));
    if (srcs.length < 2) continue;
    const cl = Math.floor(srcs.reduce((t, { k, c }) => t + (c.potential / 9) * (Number(k.levels) || 0), 0) + 1e-9);
    out[type] = cl < 1 ? 0 : Math.min(9, Math.ceil(cl / 2));
  }
  return out;
}

/**
 * The levels of a kind cast only once per long rest: "When determining the number of higher level powers you can cast
 * before needing a long rest, consult the rules for casting in the class in which you have the most levels"
 * (a tie: the stricter rule). [] when nothing of that kind is cast.
 */
function pwHighOnce(raw, modules, kind) {
  const srcs = pwArr(raw.classes).flatMap((k) => pwClassCasting(k, modules).filter((c) => c.type === kind).map((c) => ({ c, lv: Number(k.levels) || 0 })));
  if (!srcs.length) return [];
  srcs.sort((a, b) => b.lv - a.lv || a.c.highOnce - b.c.highOnce);
  return srcs[0].c.onceLevels;
}

/** Points a power costs at a level: at-will 0, else level + 1. */
const pwCost = (level) => (Number(level) > 0 ? Number(level) + 1 : 0);

/** The powers a power needs you to know ("Prerequisite: Force Disarm"), and which of them you don't. */
function pwUnmetPrereq(power, known) {
  const pre = String((power && power.prerequisite) || '').trim();
  if (!pre) return [];
  const have = new Set(pwArr(known).map((n) => String(n).toLowerCase()));
  return pre.split(/\s*(?:,|\band\b)\s*/).map((s) => s.trim()).filter(Boolean).filter((n) => !have.has(n.toLowerCase()));
}

/** The ability a power is cast with: tech → Intelligence; force by alignment (Light: WIS, Dark: CHA, Universal: better). */
function pwAbilities(power, opts = {}) {
  if (!power || power.powerType === 'Tech') return opts.tech || ['Intelligence'];
  const a = power.forceAlignment;
  if (opts.force && opts.force[a]) return opts.force[a];
  return a === 'Light' ? ['Wisdom'] : a === 'Dark' ? ['Charisma'] : ['Wisdom', 'Charisma'];
}

if (typeof module !== 'undefined') module.exports = { pwGrants, pwClassCasting, pwMulticlassMax, pwCost, pwUnmetPrereq, pwAbilities, pwTextMaxLevel, pwName, pwOnceLevels, pwHighOnce };
