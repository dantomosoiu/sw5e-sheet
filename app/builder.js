/* SW5E Character Sheet Viewer: building the character here instead of in sw5e.com's builder.
 *
 * Proficiency pickers (class and multiclass skills, Expertise, tools, background skills and languages, species
 * languages, feat ability increases), levelling up, and creating a character. The rules come from progression.js;
 * every pick is written into the fields SW5E's own engine reads (see progression.js), so its numbers include them.
 * Uses the viewer's globals (state, buildModel, withEdits, setEditedFields, esc, chip…) at call time; load it before
 * viewer.js.
 */
'use strict';

const bdModules = () => (state.rules && state.rules.modules) || {};
const bdClassRef = (name) => arr(bdModules().classes).find((c) => c.name === name) || null;
/** The character's species as its traits apply (a half-human's with its non-human half's: progression.js prSpeciesOf). */
const bdSpeciesRef = (raw) => prSpeciesOf(bdModules(), (raw && raw.species) || {});
/** The feats one can take: SW5E's feats list without its rules notes (prIsFeat), each name once. */
const bdFeatList = () => arr(bdModules().feats).filter((f, i, all) => prIsFeat(f) && all.findIndex((x) => x.name === f.name) === i);
const BD_TOOL_CATS = ['Kit', 'Tool', 'GamingSet', 'MusicalInstrument'];
const bdTools = () => (state.catalog ? state.catalog.items.filter((i) => BD_TOOL_CATS.includes(i.equipmentCategory)) : []);
/** Skills picked by the classes (all but class `exceptClass`) and, unless `exceptBg`, the background: a skill is learnt once. */
const bdPickedSkills = (raw, exceptClass = -1, exceptBg = false) => new Set(arr(raw.classes).flatMap((k, i) => (i === exceptClass ? [] : arr(k.skills)))
  .concat(exceptBg ? [] : arr(raw.background && raw.background.skills)));
const bdSkillsKnown = (m) => ABILITIES.flatMap((a) => arr(((m.c.abilityScores || {})[a] || {}).skills).filter((k) => k.proficiency && k.proficiency !== 'none').map((k) => k.name));

// ------------------------------------------------------------- where each kind of pick is kept
// get(raw, arg) → the names chosen; set(raw, arg, names) → the fields to write.
const BD_KINDS = {
  // A class's skill picks (classes[i].skills; arg: the class's index).
  cskill: {
    get: (raw, i) => arr((arr(raw.classes)[i] || {}).skills),
    set: (raw, i, list) => {
      const classes = clone(arr(raw.classes));
      classes[i] = { ...classes[i], skills: list };
      if (!list.length) delete classes[i].skills;
      return { classes };
    },
  },
  // A class's Expertise picks: skills in classes[i].expertise (SW5E's engine applies them); tools, and skills written
  // there before this picker existed, in the Expertise feature's notes (applied by this sheet, classes.js).
  cexp: {
    get: (raw, i) => {
      const own = arr((arr(raw.classes)[i] || {}).expertise);
      return own.concat(bdExpNotePicks(raw).filter((x) => !own.some((y) => y.toLowerCase() === x.toLowerCase())));
    },
    set: (raw, i, list) => {
      const lc = (s) => String(s).toLowerCase();
      const skills = new Set(prSkillList().map(lc));
      const classes = clone(arr(raw.classes));
      classes[i] = { ...classes[i], expertise: list.filter((x) => skills.has(lc(x))) };
      if (!classes[i].expertise.length) delete classes[i].expertise;
      // The notes keep their other words and the tools still picked, and get the tools newly picked.
      const notes = { ...(raw.featureNotes || {}) };
      const was = bdExpNotePicks(raw).map(lc);
      const tokens = clsNoteTokens(notes.expertise).filter((t) => !was.includes(lc(t)) || (!skills.has(lc(t)) && list.some((x) => lc(x) === lc(t))));
      const tools = list.filter((x) => !skills.has(lc(x)) && !tokens.some((t) => lc(t) === lc(x)));
      const text = tools.concat(tokens).join(', ');
      if (text) notes.expertise = text; else delete notes.expertise;
      return { classes, featureNotes: notes };
    },
  },
  bskill: {
    get: (raw) => arr(raw.background && raw.background.skills),
    set: (raw, a, list) => ({ background: { ...(raw.background || {}), skills: list } }),
  },
  blang: {
    get: (raw) => arr(raw.background && raw.background.languages),
    set: (raw, a, list) => ({ background: { ...(raw.background || {}), languages: list } }),
  },
  // Tools: customProficiencies entries marked with where the choice came from (arg).
  tool: {
    get: (raw, from) => arr(raw.customProficiencies).filter((p) => p && p.from === from).map((p) => p.name),
    set: (raw, from, list) => ({
      customProficiencies: arr(raw.customProficiencies).filter((p) => !p || p.from !== from)
        .concat(list.map((name) => ({ name, type: 'tool', proficiencyLevel: 'proficient', from }))),
    }),
  },
  // Languages other than the background's: customLanguages (what SW5E shows), with where each came from in
  // languageChoices { from: [names] } (arg: from).
  lang: {
    get: (raw, from) => arr((raw.languageChoices || {})[from]),
    set: (raw, from, list) => {
      const before = arr((raw.languageChoices || {})[from]);
      const lc = { ...(raw.languageChoices || {}) };
      if (list.length) lc[from] = list; else delete lc[from];
      return { languageChoices: lc, customLanguages: arr(raw.customLanguages).filter((l) => !before.includes(l)).concat(list.filter((l) => !arr(raw.customLanguages).includes(l) || before.includes(l))) };
    },
  },
  // A half-human's non-human half (species.halfHumanOf, the sheet's own). Choosing it records that half's increases as
  // given (SW5E's engine applies them; one of them can then go to another ability) and its language.
  halfof: {
    get: (raw) => (raw.species && raw.species.halfHumanOf ? [raw.species.halfHumanOf] : []),
    set: (raw, a, list) => {
      const species = { ...raw.species, abilityScoreImprovementSelectedOption: 0, abilityScoreImprovement: {} };
      delete species.language;
      if (list.length) {
        species.halfHumanOf = list[list.length - 1];
        const half = bdSpeciesRef({ species });
        for (const p of bdSpeciesIncrease({ species }).picks) if (p.given.length <= p.count) for (const g of p.given) species.abilityScoreImprovement[g] = p.amount;
        if (half && half.language && !/varies|non-verbal/i.test(half.language)) species.language = half.language;
      } else delete species.halfHumanOf;
      return { species };
    },
  },
  // The species' ability increases to choose: pick `arg` (its place in the selected option) of bdSpeciesIncrease.
  spinc: {
    get: (raw, i) => ((bdSpeciesIncrease(raw).picks.find((p) => p.i === num(i)) || {}).chosen || []),
    set: (raw, i, list) => ({ species: { ...raw.species, abilityScoreImprovement: bdSpeciesWithPick(raw, i, list) } }),
  },
  // What a feature card's pickers chose (Force Affinity's Bendu, a trait's "Persuasion or Intimidation"): words of the
  // feature's notes, featureNotes[arg], which classes.js reads. The note's other words stay.
  fnote: {
    get: (raw, key) => clsNoteTokens((raw.featureNotes || {})[key]),
    set: (raw, key, list) => {
      const notes = { ...(raw.featureNotes || {}) };
      if (list.length) notes[key] = list.join(', '); else delete notes[key];
      return { featureNotes: notes };
    },
  },
  // A feat's +1: the background feat's in background.feat.abilityScoreImprovements (SW5E applies it); an ASI feat's
  // in its entry's abilitiesIncreased (arg 'asi|class index|slot'), applied by this sheet (SW5E ignores it); a feat
  // added by hand's (SW5E's customFeats are names only) in featureChoices['Feat: Brawny (Custom feat): +1'] (arg
  // 'custom|<that key>'; choices.js leaves the key alone).
  featinc: {
    get: (raw, a) => {
      if (a === 'bg') return Object.keys((raw.background && raw.background.feat && raw.background.feat.abilityScoreImprovements) || {});
      if (/^custom\|/.test(a)) return arr((raw.featureChoices || {})[a.slice(7)]).map((p) => (typeof p === 'string' ? p : p && p.name)).filter(Boolean);
      const [, ci, j] = a.split('|').map(Number);
      return arr(((arr(raw.classes)[ci] || {}).abilityScoreImprovements || [])[j] && raw.classes[ci].abilityScoreImprovements[j].abilitiesIncreased).map((x) => x.name);
    },
    set: (raw, a, list) => {
      if (a === 'bg') {
        const feat = { ...(raw.background.feat || {}) };
        if (list.length) feat.abilityScoreImprovements = Object.fromEntries(list.map((n) => [n, 1])); else delete feat.abilityScoreImprovements;
        return { background: { ...raw.background, feat } };
      }
      if (/^custom\|/.test(a)) {
        const all = { ...(raw.featureChoices || {}) };
        if (list.length) all[a.slice(7)] = list.map((name) => ({ name })); else delete all[a.slice(7)];
        return { featureChoices: all };
      }
      const [, ci, j] = a.split('|').map(Number);
      const classes = clone(arr(raw.classes));
      const asi = { ...classes[ci].abilityScoreImprovements[j] };
      if (list.length) asi.abilitiesIncreased = list.map((name) => ({ name, value: 1 })); else delete asi.abilitiesIncreased;
      classes[ci].abilityScoreImprovements[j] = asi;
      return { classes };
    },
  },
};

/** Skills and tools named in the Expertise feature's notes ("Stealth + Perception", "Persuasion + Forgery kit"). */
function bdExpNotePicks(raw) {
  const tools = bdTools().map((x) => x.name.toLowerCase());
  return clsNoteTokens((raw.featureNotes || {}).expertise).map((t) => prSkillList().find((s) => s.toLowerCase() === t.toLowerCase())
    || (tools.includes(t.toLowerCase()) || /\b(?:kit|implements|set|tools?|instrument)\b/i.test(t) ? t : null)).filter(Boolean);
}

async function bdSetPick(kind, arg, name, on) {
  const snap = state.snapshots[state.current];
  const k = BD_KINDS[kind];
  if (!snap || !k || !name) return;
  const raw = withEdits(snap.raw, editedFields(snap.key));
  const cur = k.get(raw, arg);
  const same = (x) => String(x).toLowerCase() === String(name).toLowerCase(); // a note may say "stealth"
  const next = on ? (cur.some(same) ? cur : cur.concat(name)) : cur.filter((x) => !same(x));
  if (canonical(next) === canonical(cur)) return;
  const undo = on ? null : rememberForUndo(snap.key, `removed ${name}`, true);
  await setEditedFields(snap, k.set(raw, arg, next));
  setStatus(on ? `Chose ${name}.` : `Removed ${name}.`, '', false, undo);
}

/** A pick list: what's chosen (with ×) and a list to add from (keyboard picks wait for Enter, see the viewer). */
function bdPickList({ title, from = '', count, chosen, options, kind, arg, word = 'one', hint = '', problem = '' }) {
  const avail = arr(options).filter((o) => !chosen.includes(o));
  return `<div class="cls-list bd-pick"><div class="cls-head"><b>${esc(title)}</b> ${countChip(chosen.length, count)}${from ? ` <span class="faint">${esc(from)}</span>` : ''}</div>
    ${hint ? `<div class="slot-hint">${esc(hint)}</div>` : ''}${problem ? `<div class="slot-problem">${esc(problem)}</div>` : ''}
    <div class="cls-picks bd-chosen">${chosen.map((n) => `<span class="chip">${esc(n)} <button class="die-x-inline" data-act="pick-remove" data-arg="${esc(`${kind}|${arg}|${n}`)}" title="Remove" aria-label="Remove ${esc(n)}">×</button></span>`).join(' ') || '<span class="faint">None chosen yet.</span>'}</div>
    ${chosen.length < count && avail.length ? `<select class="cls-add" data-pick-add="${esc(`${kind}|${arg}`)}" aria-label="Choose: ${esc(title)}"><option value="">Choose ${esc(word)}…</option>${avail.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>` : ''}
  </div>`;
}

/** The species' traits as features ({ name, text }), without the ones every species has (age, size…). */
function bdSpeciesTraitFeatures(m) {
  const sp = bdSpeciesRef(m.raw);
  return arr(sp && sp.traits).filter((t) => !/^(?:Ability Score Increase|Age|Alignment|Size|Speed|Languages?)$/i.test(t.name)).map((t) => ({ name: t.name, text: bdTraitText(m.raw, t), source: 'Species' }));
}
/**
 * A species trait's text with its options ("Kiffar Heritage: … You choose one of the following heritages:", whose
 * options SW5E's data leaves out and sw5e-data.js adds from the books as traits[].options) as "#### Name" sub-options.
 */
const bdTraitFullText = (tr) => [String((tr && tr.description) || ''), ...arr(tr && tr.options).map((o) => `#### ${o.name}\n${o.text}`)].join('\n');
/** What a species trait gives: with options, only the one chosen in its notes (none yet: the intro). */
function bdTraitText(raw, tr) {
  const full = bdTraitFullText(tr);
  if (!arr(tr && tr.options).length) return full;
  const sub = clsChosenText(full, (raw.featureNotes || {})[clsBaseName(tr.name)] || '');
  return sub.choice ? sub.text : full.split(/^####\s/m)[0];
}

// ------------------------------------------------------------- class card: skills, Expertise, tools
/** The proficiency picks of a class (Classes & Progression): its skills (multiclass: the table's), Expertise, tools. */
function bdClassProficiencies(m, k, idx) {
  if (!state.rules) return '';
  const ref = bdClassRef(k.name);
  if (!ref) return '';
  const all = prSkillList();
  const out = [];
  if (idx === 0) {
    const sc = prSkillChoice(ref.skillChoices, ref.skillChoicesList);
    const taken = bdPickedSkills(m.raw, idx);
    if (sc) out.push(bdPickList({ title: 'Skill proficiencies', from: ref.skillChoices, count: sc.count, chosen: arr(k.skills), options: (sc.options || all).filter((s) => !taken.has(s)), kind: 'cskill', arg: idx, word: 'a skill' }));
    for (const [g, grp] of prToolChoices(arr(ref.toolProficiencies).join(', '), bdTools()).entries()) {
      if (grp.fixed) continue;
      out.push(bdPickList({ title: 'Tool proficiency', from: arr(ref.toolProficiencies).join(', '), count: grp.count, chosen: BD_KINDS.tool.get(m.raw, `Class: ${k.name}${g ? ` #${g + 1}` : ''}`),
        options: grp.options, kind: 'tool', arg: `Class: ${k.name}${g ? ` #${g + 1}` : ''}`, word: 'a tool', hint: state.catalog ? '' : 'The tool list comes with SW5E\'s item list (Equipment → Add an item loads it).' }));
    }
  } else {
    const mc = prMulticlassRules(bdModules()).profs[k.name] || {};
    const taken = bdPickedSkills(m.raw, idx);
    if (mc.skills) out.push(bdPickList({ title: 'Multiclass skill', from: mc.skills.any ? 'any skill' : "from the class's skill list", count: mc.skills.count, chosen: arr(k.skills),
      options: (mc.skills.any ? all : (prSkillChoice(ref.skillChoices, ref.skillChoicesList) || {}).options || all).filter((s) => !taken.has(s)), kind: 'cskill', arg: idx, word: 'a skill' }));
    if (mc.tools) {
      const opts = prToolChoices(arr(ref.toolProficiencies).join(', '), bdTools()).flatMap((g) => (g.fixed ? [g.fixed] : g.options));
      out.push(bdPickList({ title: 'Multiclass tool', from: "from the class's list", count: mc.tools.count, chosen: BD_KINDS.tool.get(m.raw, `Class: ${k.name}`),
        options: opts.length ? opts : bdTools().map((x) => x.name), kind: 'tool', arg: `Class: ${k.name}`, word: 'a tool' }));
    }
  }
  const exp = bdExpertisePick(m, k, idx);
  if (exp) out.push(exp);
  return out.length ? `<div class="cls-choices bd-profs">${out.join('')}</div>` : '';
}
/** A class's Expertise picker ("Choose two of your skill proficiencies… At 6th level, you can choose two more"): classes[i].expertise. */
function bdExpertisePick(m, k, idx) {
  const ref = bdClassRef(k.name);
  const exp = ref && clsTextFeatures(ref.classFeatureText, k.name, 'Class').find((f) => /^Expertise$/i.test(f.name));
  if (!exp || exp.level > num(k.levels)) return '';
  const count = exp.levels.filter((l) => l <= num(k.levels)).length * 2;
  const chosen = BD_KINDS.cexp.get(m.raw, idx);
  const known = bdSkillsKnown(m).sort().concat(toolProficiencies(m).sort(), chosen);
  return bdPickList({ title: 'Expertise', from: `${k.name} ${exp.levels.map(ordinal).join(' and ')} level`, count, chosen, options: [...new Set(known)],
    kind: 'cexp', arg: idx, word: 'a skill or tool you know' });
}

// ------------------------------------------------------------- background: skills, tools, languages, feat increase
function bdBackgroundPicks(m) {
  if (!state.rules) return '';
  const bg = m.raw.background || {};
  const ref = arr(bdModules().backgrounds).find((b) => b.name === bg.name);
  if (!ref) return '';
  const out = [];
  const sc = prSkillChoice(ref.skillProficiencies);
  const taken = bdPickedSkills(m.raw, -1, true);
  if (sc) {
    const opts = (sc.options || prSkillList()).filter((s) => !taken.has(s));
    // "If a character would gain the same proficiency from two different sources, they can choose a different proficiency of the same kind instead."
    const short = (sc.options || []).filter((s) => !taken.has(s)).length < sc.count;
    out.push(bdPickList({ title: 'Skill proficiencies', from: ref.skillProficiencies, count: sc.count, chosen: arr(bg.skills), options: short ? prSkillList().filter((s) => !taken.has(s)) : opts, kind: 'bskill', arg: '', word: 'a skill',
      hint: short ? 'You already have some of these from your class: choose any other skill instead.' : '' }));
  }
  for (const [g, grp] of prToolChoices(ref.toolProficiencies, bdTools()).entries()) {
    if (grp.fixed) continue;
    const from = `Background: ${bg.name}${g ? ` #${g + 1}` : ''}`;
    out.push(bdPickList({ title: 'Tool proficiency', from: ref.toolProficiencies, count: grp.count, chosen: BD_KINDS.tool.get(m.raw, from), options: grp.options, kind: 'tool', arg: from, word: 'a tool',
      hint: state.catalog ? '' : 'The tool list comes with SW5E\'s item list (Equipment → Add an item loads it).' }));
  }
  const lc = prLanguageChoices(ref.languages);
  if (lc) out.push(bdPickList({ title: 'Languages', from: ref.languages, count: lc.count, chosen: arr(bg.languages), options: lc.options || prLanguages(bdModules()), kind: 'blang', arg: '', word: 'a language' }));
  const inc = bdFeatIncreases(m.raw).find((x) => x.arg === 'bg' && x.options.length > 1);
  if (inc) out.push(bdPickList({ title: `${inc.name}: +1 to`, from: 'background feat', count: 1, chosen: inc.stored, options: inc.options, kind: 'featinc', arg: 'bg', word: 'an ability' }));
  return out.length ? `<div class="cls-choices bd-profs"><h3>Your choices</h3>${out.join('')}</div>` : '';
}

// ------------------------------------------------------------- species: languages
function bdSpeciesPicks(m) {
  if (!state.rules) return '';
  const sp = bdSpeciesRef(m.raw);
  if (!sp) return '';
  const out = [];
  // Half-human: "Half-humans gain the ability score increases of their non-human half…", its size, speed, languages and
  // traits but those the Half-Human table names.
  if (prIsHalfHuman(sp)) {
    const lostNote = !sp.halfOf ? '' : !sp.lostEntry ? 'The Half-Human table takes no trait away.'
      : `The Half-Human table: no ${sp.lostEntry}${sp.lost.length ? '' : ` (SW5E's ${sp.halfOf} has no trait of that name: ask your GM)`}.`;
    out.push(bdPickList({ title: 'Non-human half', from: 'its ability score increases, size, speed, languages and special traits', count: 1, chosen: BD_KINDS.halfof.get(m.raw),
      options: prHalfHumanHalves(bdModules()).map((s) => s.name).sort(), kind: 'halfof', arg: '', word: 'a species', hint: lostNote }));
  }
  // The ability increases to choose ("your Wisdom or Charisma score increases by 1", "two other ability scores of your
  // choice"): the same picks as when creating the character, kept in species.abilityScoreImprovement.
  const inc = bdSpeciesIncrease(m.raw);
  const asi = arr(sp.traits).find((t) => /^Ability Score Increase$/i.test(t.name));
  const halfAsi = inc.half && arr((arr(bdModules().species).find((s) => s.name === inc.half) || {}).traits).find((t) => /^Ability Score Increase$/i.test(t.name));
  inc.picks.forEach((p, n) => {
    const others = inc.picks.filter((q) => q !== p).flatMap((q) => q.chosen).concat(Object.keys(inc.fixed), Object.keys(inc.all));
    out.push(bdPickList({ title: `Ability score +${p.amount}${inc.half && p.given.length < 6 ? ` (${p.given.join(' or ')})` : ''}`, from: (halfAsi || asi || {}).description || '', count: p.count, chosen: p.chosen,
      options: p.options.filter((a) => !others.includes(a)), kind: 'spinc', arg: p.i, word: 'an ability',
      hint: inc.half && n === 0 ? 'A half-human can put one of these increases on any other ability instead, never on the same ability twice.' : '',
      problem: n === inc.picks.length - 1 ? inc.problems.join(' ') : '' }));
  });
  const tr = arr(sp.traits).find((t) => /^Languages?$/i.test(t.name));
  const lc = tr && prLanguageChoices(tr.description);
  const from = `Species: ${sp.name}`;
  if (lc) out.push(bdPickList({ title: 'Languages', from: tr.description, count: lc.count, chosen: BD_KINDS.lang.get(m.raw, from), options: lc.options || prLanguages(bdModules()), kind: 'lang', arg: from, word: 'a language' }));
  return out.length ? `<div class="cls-choices bd-profs">${out.join('')}</div>` : '';
}

// ------------------------------------------------------------- feats' +1
/** The feats added by hand (customFeats: names) with the featureChoices key of their +1 (choices.js's feat key + ': +1'). */
function bdCustomFeats(raw) {
  const seen = {};
  return arr(raw.customFeats).map((f) => (typeof f === 'string' ? f : f && f.name)).filter(Boolean).map((name) => {
    seen[name] = (seen[name] || 0) + 1;
    return { name, key: `Feat: ${name} (Custom feat${seen[name] > 1 ? ` #${seen[name]}` : ''}): +1` };
  });
}
/**
 * Every feat's +1: the background feat's, the ones taken at an ASI and the ones added by hand: [{ name, from, arg
 * (BD_KINDS.featinc's), ref, options, stored, chosen, auto, engine }]. A +1 that can go to one ability only (Tough:
 * "Increase your Constitution score by 1, to a maximum of 20") is no choice: it applies as is (auto), nothing stored.
 * engine: SW5E's engine applies what's stored (the background feat's).
 */
function bdFeatIncreases(raw) {
  const refs = arr(bdModules().feats);
  const out = [];
  const add = (name, from, arg, engine) => {
    const ref = refs.find((f) => f.name === name);
    const options = prFeatAbilities(ref);
    if (!options.length) return;
    const stored = BD_KINDS.featinc.get(raw, arg);
    const auto = !stored.length && options.length === 1;
    out.push({ name, from, arg, ref, options, stored, chosen: stored.length ? stored : auto ? options.slice() : [], auto, engine });
  };
  const bg = raw.background || {};
  if (bg.feat && bg.feat.name) add(bg.feat.name, 'background feat', 'bg', true);
  arr(raw.classes).forEach((k, ci) => arr(k.abilityScoreImprovements).forEach((a, j) => {
    if (a && a.type === 'Feat' && a.name) add(a.name, `${k.name} ASI #${j + 1}`, `asi|${ci}|${j}`, false);
  }));
  for (const f of bdCustomFeats(raw)) add(f.name, 'added by hand', `custom|${f.key}`, false);
  return out;
}

/** The character's feats, each name once: the background feat, the ones taken at an ASI, the ones added by hand. */
function bdFeatNames(raw) {
  const bg = raw.background || {};
  return [...new Set([bg.feat && bg.feat.name].concat(arr(raw.classes).flatMap((k) => arr(k.abilityScoreImprovements).filter((a) => a && a.type === 'Feat').map((a) => a.name)),
    bdCustomFeats(raw).map((f) => f.name)).filter(Boolean))];
}
/**
 * Languages feats teach: "You learn three languages of your choice" (Linguist) → [{ name, from, count, options, chosen }],
 * kept like the species' (customLanguages, with languageChoices['Feat: Linguist']).
 */
function bdFeatLanguages(raw) {
  const out = [];
  for (const name of bdFeatNames(raw)) {
    const ref = bdFeatList().find((f) => f.name === name);
    const sentence = ref && (/[^.\n]*\blanguages?\b[^.\n]*\bof your choice\b[^.\n]*/i.exec(ref.text || '') || [])[0];
    const lc = sentence && prLanguageChoices(sentence);
    if (lc) out.push({ name, from: `Feat: ${name}`, sentence: sentence.replace(/^\s*-\s*/, '').trim(), count: lc.count, options: lc.options || prLanguages(bdModules()), chosen: BD_KINDS.lang.get(raw, `Feat: ${name}`) });
  }
  return out;
}
/**
 * Languages a class or archetype feature teaches at the class's level: "You learn your choice of two languages" (Silver
 * Tongue), "You learn one language of your choice… You learn an additional language… at 11th level" (Mystical
 * Erudition): [{ name (the feature), from ('Feature: Silver Tongue'), sentence, count, options, chosen, alt }]. "You gain
 * proficiency in one of the following skills… Alternatively, you learn one language of your choice" (Praetorian's Bonus
 * Proficiency): alt, the language instead of the feature's other choice (either one answers it).
 */
function bdFeatureLanguages(raw) {
  const out = [];
  for (const k of arr(raw.classes)) {
    const cref = bdClassRef(k.name);
    const aref = k.archetype && k.archetype.name ? arr(bdModules().archetypes).find((a) => a.name === k.archetype.name) : null;
    const lv = num(k.levels);
    const feats = (cref ? clsTextFeatures(cref.classFeatureText, k.name, 'Class') : []).concat(aref ? clsTextFeatures(aref.text, aref.name, 'Archetype') : []);
    for (const f of feats.filter((x) => x.level <= lv)) {
      const t = String(f.text || '').replace(/\s+/g, ' ');
      const sentence = (/[^.]*\blanguages?\b[^.]*\b(?:of your choice|your choice of)\b[^.]*/i.exec(t) || [])[0];
      if (!sentence) continue;
      const alt = /^\s*alternatively\b/i.test(sentence);
      const two = /\byour choice of (one|two|three|a) languages?\b/i.exec(sentence);
      const lc = two ? { count: prNum(two[1]) || 1, options: null } : prLanguageChoices(sentence);
      if (!lc) continue;
      const more = [...t.matchAll(/\byou learn (?:an additional|another|one more) language\b[^.]*?\bat (\d+)(?:st|nd|rd|th) level/gi)].filter((x) => lv >= Number(x[1])).length;
      out.push({ name: f.name, from: `Feature: ${f.name}`, sentence: sentence.trim(), count: lc.count + more, options: lc.options || prLanguages(bdModules()), chosen: BD_KINDS.lang.get(raw, `Feature: ${f.name}`), alt });
    }
  }
  return out;
}
/**
 * Which of a feat's asks to make: "Choose one from Wisdom or Charisma… Increase the chosen ability score by 1"
 * (Spiritual Techcaster) is the +1 picker's choice, so its ability ask isn't asked again.
 */
const bdFeatAskFilter = (text) => (/\bincrease the chosen ability score\b/i.test(String(text || '')) ? (a) => !(a.options && a.options.length && a.options.every((o) => PR_ABILITIES.includes(o))) : null);
/** A class feature's language picker, for its card (an alternative: only while the feature's other choice isn't made). */
function bdFeatureLanguagePicks(m, name, asks = []) {
  const x = bdFeatureLanguages(m.raw).find((l) => l.name === name);
  if (!x || (x.alt && !x.chosen.length && asks.some((a) => a.chosen.length))) return '';
  return bdPickList({ title: x.alt ? 'Or instead: a language' : 'Languages', from: x.sentence, count: x.count, chosen: x.chosen, options: x.options, kind: 'lang', arg: x.from, word: 'a language' });
}
/**
 * What the class and archetype features still ask (classes.js asks: Silver Tongue's Charisma skill, a tool, weapons, a
 * damage type, an ability), for "Still to choose": [{ name, text }]. A feature whose choices a Classes & Progression
 * picker makes (a list, maneuvers, a slot, Expertise) is listed there already; an alternative language (Praetorian)
 * answers the feature's other choice.
 */
function bdFeatureOpenAsks(m) {
  const out = [];
  const langs = bdFeatureLanguages(m.raw);
  for (const k of arr(m.raw.classes)) {
    const cref = bdClassRef(k.name);
    const aref = k.archetype && k.archetype.name ? arr(bdModules().archetypes).find((a) => a.name === k.archetype.name) : null;
    const feats = (cref ? clsTextFeatures(cref.classFeatureText, k.name, 'Class') : []).concat(aref ? clsTextFeatures(aref.text, aref.name, 'Archetype') : []);
    for (const f of feats.filter((x) => x.level <= num(k.levels))) {
      const card = { name: f.name, text: f.text, source: f.source, sourceName: f.sourceName };
      if (featurePickers(m, card)) continue;
      const lang = langs.find((l) => l.name === f.name && l.alt);
      if (lang && lang.chosen.length) continue;
      const open = openAsks(featureAsks(m, card));
      for (const a of open) out.push({ name: f.name, text: `${a.label.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())}${lang ? ' or a language' : ''}${a.count - a.chosen.length > 1 ? ` (${a.count - a.chosen.length} more)` : ''}` });
    }
  }
  return out;
}
/** A feat's language picker, for its card. */
function bdFeatLanguagePicks(m, name) {
  const x = bdFeatLanguages(m.raw).find((l) => l.name === name);
  return x ? `<div class="cls-choices feat-asks">${bdPickList({ title: 'Languages', from: x.sentence, count: x.count, chosen: x.chosen, options: x.options, kind: 'lang', arg: x.from, word: 'a language' })}</div>` : '';
}
/**
 * A feat's text without the choices the builder's pickers make (its +1, "Choose one ability score" for the chosen
 * ability's +1, the languages it teaches): what's left to write in its notes ('' when nothing: "you can choose to have
 * advantage" is a choice made at the table).
 */
function bdFeatChoiceText(ref) {
  let t = String((ref && ref.text) || '').replace(/[^.\n]*\bincrease (?:your|an|one|the chosen)\b[^.\n]*\bby 1\b[^.\n]*/gi, '');
  if (/\bincrease the chosen ability score\b/i.test((ref && ref.text) || '')) t = t.replace(/\bchoose one (?:ability score|from [^.]+)\./gi, '');
  t = t.replace(/[^.\n]*\blanguages?\b[^.\n]*\bof your choice\b[^.\n]*/gi, '');
  return /\b(?:choose|select) (?:one|two|three|a|an|any)\b|\bof your choice\b/i.test(t) ? t : '';
}

/** The +1 pickers of feats taken at an ASI or added by hand (the background feat's is under Background). */
function bdFeatPicks(m) {
  if (!state.rules) return '';
  const out = bdFeatIncreases(m.raw).filter((x) => x.arg !== 'bg' && x.options.length > 1)
    .map((x) => bdPickList({ title: `${x.name}: +1 to`, from: x.from, count: 1, chosen: x.stored, options: x.options, kind: 'featinc', arg: x.arg, word: 'an ability' }));
  return out.length ? `<div class="cls-choices bd-profs"><h3>Feat ability increases</h3>${out.join('')}</div>` : '';
}

/**
 * What feats' +1 does that SW5E's engine doesn't (it applies the background feat's stored pick only): effects of
 * kind 'feature', like class features (see viewer.js featureEffectsUncached). With it, "You gain proficiency in saving
 * throws using the chosen ability" (Resilient), which follows the same pick.
 */
function bdFeatIncreaseEffects(editedRaw) {
  const out = [];
  for (const x of bdFeatIncreases(editedRaw)) {
    const raise = x.engine && !x.auto ? [] : x.chosen;
    const mods = raise.map((a) => ({ path: `abilityScores.${a}.score`, bonus: 1, cap: 20, label: `${a.slice(0, 3).toUpperCase()} +1` }));
    if (prFeatChosenAbilityUse(x.ref).save) {
      for (const a of x.chosen) mods.push({ path: `abilityScores.${a}.savingThrowModifier`, bonus: 0, fields: { proficiency: 'Proficient' }, label: `${a} saves: proficient` });
    }
    if (mods.length) out.push({ id: `featinc:${x.arg.replace(/^asi\|/, '').replace(/\|/g, ':')}`, kind: 'feature', origin: 'feat', name: x.name, why: `feat (${x.from})`, target: 'self', notes: [], mods });
  }
  return out;
}


// ------------------------------------------------------------- levelling up
// state.levelUp = { key, cls, hpMode: 'avg' | 'roll', hp, asi: 'two' | 'split' | 'feat', a1, a2, feat, archetype }:
// the open "Level up" panel (Classes & Progression), until applied or cancelled.
const bdScores = (m) => Object.fromEntries(ABILITIES.map((a) => [a, num(((m.c.abilityScores || {})[a] || {}).value)]));
const bdTotalLevel = (raw) => arr(raw.classes).reduce((t, k) => t + num(k.levels), 0);

/** The classes the next level can go to: the character's own, and new ones with their multiclass requirements. */
function bdLevelOptions(m) {
  const mods = bdModules();
  const classes = arr(m.raw.classes);
  const scores = bdScores(m);
  const mc = prMulticlassRules(mods);
  const mine = classes.flatMap((k) => prMulticlassUnmet(mc.prereq[k.name], scores).map((u) => `${u} (for ${k.name})`));
  return {
    own: classes.map((k) => ({ name: k.name, levels: num(k.levels) })),
    others: arr(mods.classes).filter((c) => !classes.some((k) => k.name === c.name)).map((c) => ({
      name: c.name, unmet: classes.length ? prMulticlassUnmet(mc.prereq[c.name], scores).map((u) => `${u} (for ${c.name})`).concat(mine) : [],
    })),
  };
}

/** What a class level brings: the table's features and the archetype's, and table columns that change. */
function bdLevelGains(className, level, archetypeName) {
  const ref = bdClassRef(className);
  if (!ref) return { features: [], changes: [] };
  const features = prTableFeatures(ref, level);
  const aref = archetypeName ? arr(bdModules().archetypes).find((a) => a.name === archetypeName) : null;
  if (aref) clsTextFeatures(aref.text, aref.name, 'Archetype').filter((f) => f.levels.includes(level)).forEach((f) => features.push(`${f.name} (${aref.name})`));
  const now = (ref.levelChanges || {})[String(level)] || {};
  const before = (ref.levelChanges || {})[String(level - 1)] || {};
  const blank = (v) => /^[—–-]?$/.test(String(v ?? '').trim());
  const changes = Object.keys(now).filter((c) => !/^(Level|Features|Proficiency Bonus)$/.test(c) && String(now[c]) !== String(before[c] ?? '') && !blank(now[c]))
    .map((c) => `${c}: ${level > 1 && !blank(before[c]) ? `${before[c]} → ` : ''}${now[c]}`);
  return { features: [...new Set(features)].filter((f) => !/^Ability Score Improvement$/i.test(f)), changes };
}

function bdLevelUpButton(m, label = 'Level up') {
  return bdTotalLevel(m.raw) >= 20 || !state.rules ? '' : `<button class="btn sm primary" data-act="lvl-open" title="Add a level: class, hit points, ability score improvement or feat, archetype">${esc(label)}</button>`;
}

/** The Level up panel, at the top of Classes & Progression. */
function bdLevelUpPanel(m) {
  const L = state.levelUp;
  if (!state.rules) return '';
  if (!L || L.key !== m.snap.key) return `<div class="lvl-bar">${bdLevelUpButton(m)}</div>`;
  const opts = bdLevelOptions(m);
  const target = L.cls || (opts.own[0] && opts.own[0].name) || '';
  const own = opts.own.find((o) => o.name === target);
  const other = opts.others.find((o) => o.name === target);
  const ref = bdClassRef(target);
  const newLevel = (own ? own.levels : 0) + 1;
  const total = bdTotalLevel(m.raw) + 1;
  const die = ref ? num(ref.hitDiceDieType) : 0;
  const avg = ref ? num(ref.hitPointsAtHigherLevelsNumber) : 0;
  const fixed = m.raw.settings && m.raw.settings.isFixedHitPoints;
  const con = num(((m.c.abilityScores || {}).Constitution || {}).modifier);
  const first = !opts.own.length;
  const asi = !!ref && prAsiLevels(ref).includes(newLevel);
  const k = arr(m.raw.classes).find((x) => x.name === target);
  const archAt = ref ? archetypeLevel(target) : 99;
  const needArch = newLevel >= archAt && !(k && k.archetype && k.archetype.name);
  const scores = bdScores(m);
  const radio = (field, value, label) => `<label class="lvl-opt"><input type="radio" name="lvl-${field}" data-lvl="${field}" value="${esc(value)}"${String(L[field] ?? '') === String(value) ? ' checked' : ''}> ${label}</label>`;
  const classRadios = opts.own.map((o) => radio('cls', o.name, `${esc(o.name)} ${o.levels} → ${o.levels + 1}`))
    .concat(`<label class="lvl-opt">${opts.own.length ? 'New class' : 'Class'} <select data-lvl="cls"><option value="">${opts.own.length ? '— multiclass —' : '— choose —'}</option>${opts.others.map((o) => `<option value="${esc(o.name)}"${o.name === target ? ' selected' : ''}${o.unmet.length ? ' disabled' : ''}>${esc(o.name)}${o.unmet.length ? ` (needs ${esc(o.unmet.join(', '))})` : ''}</option>`).join('')}</select></label>`);
  const hpBlock = first ? `<p class="faint">First level: ${esc(ref ? ref.hitPointsAtFirstLevel || `${ref.hitDiceDieType} + Constitution` : '—')}.</p>`
    : fixed ? `<p>Fixed hit points (Settings): <b>+${avg}</b> ${con ? `${signed(con)} Con` : ''}</p>`
      : `<div class="lvl-row">${radio('hpMode', 'avg', `Take ${avg}`)}${radio('hpMode', 'roll', `Roll 1d${die}`)}
        ${L.hpMode === 'roll' ? `<input class="lvl-hp" type="number" min="1" max="${die}" data-lvl="hp" value="${esc(L.hp ?? '')}" aria-label="Hit die roll"> <button class="btn sm" data-act="lvl-roll" title="Roll 1d${die}">Roll</button>` : ''}
        <span class="faint">${con ? `${signed(con)} Con per level` : ''}</span></div>`;
  const abilitySelect = (field, plus) => `<select data-lvl="${field}" aria-label="Ability"><option value="">Ability…</option>${ABILITIES.map((a) => `<option value="${a}"${L[field] === a ? ' selected' : ''}${scores[a] + plus > 20 ? ' disabled' : ''}>${a} (${scores[a]})</option>`).join('')}</select>`;
  // Feats already taken, as often as they can be ("You can take this feat twice": Weapon Expert).
  const takenList = arr(m.raw.classes).flatMap((x) => arr(x.abilityScoreImprovements)).filter((a) => a && a.type === 'Feat').map((a) => a.name)
    .concat(m.raw.background && m.raw.background.feat ? [m.raw.background.feat.name] : []);
  const feats = bdFeatList().filter((f) => takenList.filter((n) => n === f.name).length < chFeatLimit(f.text)).sort((a, b) => a.name.localeCompare(b.name));
  const featRef = feats.find((f) => f.name === L.feat);
  const asiBlock = !asi ? '' : `<fieldset class="lvl-set"><legend>Ability Score Improvement (${esc(target)} ${ordinal(newLevel)} level)</legend>
      <div class="lvl-row">${radio('asi', 'two', '+2 to one ability')}${radio('asi', 'split', '+1 to two')}${radio('asi', 'feat', 'A feat')}</div>
      ${L.asi === 'two' ? abilitySelect('a1', 2) : L.asi === 'split' ? `${abilitySelect('a1', 1)} ${abilitySelect('a2', 1)}` : L.asi === 'feat'
        ? `<select data-lvl="feat" aria-label="Feat"><option value="">Feat…</option>${feats.map((f) => `<option${f.name === L.feat ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
          ${featRef ? `<div class="desc lvl-feat">${md(featRef.text || '')}</div>` : ''}` : ''}</fieldset>`;
  const archs = ref ? arr(bdModules().archetypes).filter((a) => a.className === target).map((a) => a.name).sort((a, b) => OLD_RULES.test(a) - OLD_RULES.test(b) || a.localeCompare(b)) : [];
  const archRef = archs.includes(L.archetype) ? arr(bdModules().archetypes).find((a) => a.name === L.archetype) : null;
  const archBlock = needArch ? `<fieldset class="lvl-set"><legend>${esc(titleCase(archetypeWord(target) || 'archetype'))} (${ordinal(archAt)} level)</legend>
      <select data-lvl="archetype" aria-label="Archetype"><option value="">Choose…</option>${archs.map((a) => `<option value="${esc(a)}"${a === L.archetype ? ' selected' : ''}>${esc(a)}${OLD_RULES.test(a) ? ' — older rules' : ''}</option>`).join('')}</select>
      ${archRef ? `<div class="desc lvl-feat">${md(String(archRef.text || '').split(/\n#{2,3} /)[0])}</div>` : '<span class="faint"> You can also choose it later in the class card.</span>'}</fieldset>` : '';
  const gains = bdLevelGains(target, newLevel, (k && k.archetype && k.archetype.name) || L.archetype);
  const mcProfs = !own && !first ? (prMulticlassRules(bdModules()).profs[target] || null) : null;
  return `<div class="card no-toggle lvl-panel" id="levelUp"><div class="card-head"><span class="title">Level up to ${total}</span>
      <button class="btn sm" data-act="lvl-cancel">Cancel</button></div>
    <fieldset class="lvl-set"><legend>Class</legend><div class="lvl-row">${classRadios.join('')}</div>
      ${other && other.unmet.length ? `<div class="slot-problem">Multiclassing needs ${esc(other.unmet.join(', '))}.</div>` : ''}</fieldset>
    ${target ? `<fieldset class="lvl-set"><legend>Hit points (d${die})</legend>${hpBlock}</fieldset>${asiBlock}${archBlock}
    <div class="lvl-gains"><b>${esc(target)} ${ordinal(newLevel)} level brings</b>
      ${gains.features.length ? `<div class="chips">${gains.features.map((f) => chip(f, 'accent')).join('')}</div>` : '<span class="faint"> no new features</span>'}
      ${gains.changes.length ? `<div class="faint lvl-changes">${esc(gains.changes.join(' · '))}</div>` : ''}
      ${mcProfs ? `<div class="faint">Multiclass proficiencies: ${esc([...mcProfs.other, mcProfs.skills ? `${mcProfs.skills.count} skill` : '', mcProfs.tools ? `${mcProfs.tools.count} tool` : ''].filter(Boolean).join(', '))} (pick them in the class card afterwards).</div>` : ''}
      ${total % 4 === 1 && total > 1 ? `<div class="faint">Proficiency bonus +${Math.ceil(total / 4) + 1}.</div>` : ''}</div>
    <p class="ed-err" id="lvlErr" hidden></p>
    <div class="ed-actions"><button class="btn primary" data-act="lvl-apply">Level up: ${esc(target)} ${newLevel}</button>
      <span class="faint">New powers, maneuvers and options are picked in the class card afterwards (their counts update).</span></div>` : ''}
  </div>`;
}

function bdLevelUpOpen() {
  const snap = state.snapshots[state.current];
  if (!snap) return;
  const m = buildModel(snap);
  const first = arr(m.raw.classes)[0];
  state.levelUp = { key: snap.key, cls: first ? first.name : '', hpMode: 'avg', hp: '', asi: 'two' };
  renderAll();
  const el = document.getElementById('levelUp');
  if (el) el.scrollIntoView({ block: 'start' });
}

async function bdLevelUpApply() {
  const L = state.levelUp;
  const snap = state.snapshots[state.current];
  if (!L || !snap || L.key !== snap.key) return;
  const m = buildModel(snap);
  const fail = (msg) => { const el = $('#lvlErr'); if (el) { el.textContent = msg; el.hidden = false; } };
  const opts = bdLevelOptions(m);
  const target = L.cls || (opts.own[0] && opts.own[0].name);
  const ref = bdClassRef(target);
  if (!ref) return fail('Choose the class for this level.');
  const other = opts.others.find((o) => o.name === target);
  if (other && other.unmet.length) return fail(`Multiclassing into ${target} needs ${other.unmet.join(', ')}.`);
  const die = num(ref.hitDiceDieType);
  const hp = L.hpMode === 'roll' ? num(L.hp) : num(ref.hitPointsAtHigherLevelsNumber);
  if (L.hpMode === 'roll' && !(hp >= 1 && hp <= die)) return fail(`Roll the hit die (1–${die}), or take the average.`);
  const res = prAddLevel(m.raw, target, hp, bdModules());
  const k = res.classes.find((x) => x.name === target);
  if (res.asi) {
    const slot = prAsiLevels(ref).indexOf(k.levels);
    let v = null;
    if (L.asi === 'two') v = L.a1 ? { type: 'Ability Score Improvement', abilitiesIncreased: [{ name: L.a1, value: 2 }] } : null;
    else if (L.asi === 'split') v = L.a1 && L.a2 && L.a1 !== L.a2 ? { type: 'Ability Score Improvement', abilitiesIncreased: [{ name: L.a1, value: 1 }, { name: L.a2, value: 1 }] } : null;
    else if (L.asi === 'feat') v = L.feat ? { type: 'Feat', name: L.feat } : null;
    if (!v) return fail(L.asi === 'feat' ? 'Choose the feat.' : L.asi === 'split' ? 'Choose two different abilities.' : 'Choose the ability.');
    while (k.abilityScoreImprovements.length < slot) k.abilityScoreImprovements.push(null);
    k.abilityScoreImprovements[slot] = v;
  }
  if (L.archetype && !(k.archetype && k.archetype.name)) k.archetype = { name: L.archetype };
  const con = num(((m.c.abilityScores || {}).Constitution || {}).modifier);
  const undo = rememberForUndo(snap.key, `level ${res.total} (${target} ${k.levels})`);
  state.levelUp = null;
  await setEditedFields(snap, { classes: res.classes, experiencePoints: res.experiencePoints });
  const gains = bdLevelGains(target, k.levels, k.archetype && k.archetype.name);
  const firstLevel = res.total === 1;
  setStatus(`Level ${res.total}: ${target} ${k.levels}${firstLevel ? '' : `, hit points +${hp + con}`}${gains.features.length ? `; new: ${gains.features.join(', ')}` : ''}. Pick any new powers, maneuvers or options in the class card.`, '', false, undo);
}

// The panel's fields are kept in state.levelUp; a choice redraws the panel.
document.addEventListener('change', (e) => {
  const f = e.target.dataset && e.target.dataset.lvl;
  if (!f || !state.levelUp) return;
  state.levelUp[f] = e.target.value;
  if (f === 'cls') Object.assign(state.levelUp, { archetype: '', a1: '', a2: '', feat: '' });
  if (f !== 'hp') renderAll();
});
document.addEventListener('input', (e) => {
  if (e.target.dataset && e.target.dataset.lvl === 'hp' && state.levelUp) state.levelUp.hp = e.target.value;
});


// ------------------------------------------------------------- creating a character
// state.create = { step, raw (the new character, in SW5E's format), method, equip: { mode, lines, picks, names, wealth } }:
// the "New character" wizard shown instead of the sheet until it's created or cancelled.
const BD_STEPS = [['basics', 'Name & species'], ['class', 'Class'], ['abilities', 'Ability scores'], ['background', 'Background'],
  ['equipment', 'Equipment'], ['details', 'Personality'], ['review', 'Review']];
const BD_NEW = () => ({
  name: '', id: '', builderVersion: '0.0.0', image: '', experiencePoints: 0,
  species: { name: '', abilityScoreImprovementSelectedOption: 0, abilityScoreImprovement: {} }, classes: [],
  baseAbilityScores: { Strength: 0, Dexterity: 0, Constitution: 0, Intelligence: 0, Wisdom: 0, Charisma: 0 }, // standard array: none assigned yet
  background: { name: '', feat: { name: '', type: 'Feat' } },
  characteristics: { alignment: '', 'Personality Traits': '', Ideal: '', Bond: '', Flaw: '', Gender: '', 'Place of Birth': '', Age: '', Height: '', Weight: '', Hair: '', Eyes: '', Skin: '', Appearance: '', Backstory: '' },
  credits: 0, equipment: [], currentStats: { hitPointsLost: 0, temporaryHitPoints: 0, techPointsUsed: 0, forcePointsUsed: 0, superiorityDiceUsed: 0, hitDiceUsed: {}, deathSaves: { successes: 0, failures: 0 }, hasInspiration: false, featuresTimesUsed: {}, conditions: [], exhaustion: 0, highLevelCasting: { level6: false, level7: false, level8: false, level9: false } },
  tweaks: {}, customProficiencies: [], customLanguages: [], customFeatures: [], customFeats: [], customTechPowers: [], customForcePowers: [], customEquipment: [],
  settings: { isEnforcingForcePrerequisites: true, isFixedHitPoints: false, abilityScoreMethod: 'Standard Array' }, notes: '', createdAt: 0, changedAt: 0,
});

function bdCreateOpen() {
  if (!state.rules) {
    setStatus('Creating a character needs SW5E\'s rules data: loading it…');
    ensureRules().then(() => bdCreateOpen()).catch((e) => setStatus(`Could not load SW5E's rules data: ${e.message}`, 'error'));
    return;
  }
  loadCatalogForAdding();
  state.create = { step: 'basics', raw: BD_NEW(), method: 'array', assign: {}, equip: { mode: 'gear', lines: {}, picks: {}, names: {} } };
  renderAll();
  window.scrollTo({ top: 0 });
}

/**
 * The species' ability increases as chosen: { fixed: { Con: 2 } (SW5E's engine applies them), picks: [{ i, count,
 * options, amount, chosen: [...] }], all: { Str: 1, Con: 1 } (an entry SW5E reads as a pick but the text raises whole:
 * kept with the picks in abilityScoreImprovement), missing: { Con: 1 } (the part of `all` not kept there: the sheet
 * applies it) }.
 */
function bdSpeciesIncrease(raw) {
  const ref = arr(bdModules().species).find((s) => s.name === raw.species.name);
  const chosen = raw.species.abilityScoreImprovement || {};
  // A half-human: "Half-humans gain the ability score increases of their non-human half, but they can choose any ability
  // score for one of the options, instead of the given option. Half-humans can not increase the same ability score twice
  // during character creation using this feature." Each of the other half's increases is a pick (SW5E's engine applies
  // none of Half-human's own, which are empty), of any ability; more than one moved is a problem.
  const half = prIsHalfHuman(ref) && raw.species.halfHumanOf ? arr(bdModules().species).find((s) => s.name === raw.species.halfHumanOf) : null;
  if (half) {
    const hopts = prSpeciesIncreases(half);
    const hsel = hopts[num(raw.species.abilityScoreImprovementSelectedOption)] || hopts[0] || { picks: [] };
    let left = Object.entries(chosen);
    const hpicks = hsel.picks.map((p, i) => {
      const any = /^any (\w+)$/i.exec(p.abilities[0] || '');
      const count = any ? prNum(any[1]) || 1 : p.all ? p.abilities.length : 1;
      const mine = left.filter(([, v]) => v === p.amount).slice(0, count).map(([a]) => a);
      left = left.filter(([a]) => !mine.includes(a));
      return { i, count, options: PR_ABILITIES.slice(), given: any ? PR_ABILITIES.slice() : p.abilities, amount: p.amount, chosen: mine };
    });
    // Nothing recorded yet: the half's own increases hold (the sheet applies them; moving one records them all).
    const missing = {};
    if (!Object.keys(chosen).length) {
      for (const p of hpicks.filter((x) => x.given.length <= x.count)) { p.chosen = p.given.slice(); p.auto = true; for (const g of p.given) missing[g] = p.amount; }
    }
    const moved = hpicks.filter((p) => p.chosen.some((a) => !p.given.includes(a)));
    return { options: hopts, fixed: {}, picks: hpicks, all: {}, missing, half: half.name,
      problems: moved.length > 1 ? ['Only one of the increases can go to another ability than the given one.'] : [] };
  }
  const opts = prSpeciesIncreases(ref);
  const sel = opts[num(raw.species.abilityScoreImprovementSelectedOption)] || opts[0] || { picks: [] };
  const fixed = {};
  const all = {};
  const missing = {};
  const picks = [];
  let rest = Object.entries(chosen);
  for (const p of sel.picks.filter((x) => x.all)) {
    for (const a of p.abilities) {
      all[a] = p.amount;
      if (num(chosen[a]) !== p.amount) missing[a] = p.amount;
      rest = rest.filter(([b]) => b !== a);
    }
  }
  sel.picks.forEach((p, i) => {
    const any = /^any (\w+)$/i.exec(p.abilities[0] || '');
    if (p.all) return;
    if (p.abilities.length === 1 && !any) { fixed[p.abilities[0]] = p.amount; return; }
    const count = any ? prNum(any[1]) || 1 : 1;
    const options = any ? PR_ABILITIES.slice() : p.abilities;
    const mine = rest.filter(([a, v]) => v === p.amount && options.includes(a)).slice(0, count).map(([a]) => a);
    rest = rest.filter(([a]) => !mine.includes(a));
    picks.push({ i, count, options, given: options, amount: p.amount, chosen: mine });
  });
  return { options: opts, fixed, picks, all, missing, half: null, problems: [] };
}
/** abilityScoreImprovement with pick `i`'s abilities set to `list` (the other picks and the whole entries kept). */
function bdSpeciesWithPick(raw, i, list) {
  const inc = bdSpeciesIncrease(raw);
  const out = { ...inc.all };
  for (const p of inc.picks) for (const a of (p.i === num(i) ? list : p.chosen)) if (a) out[a] = p.amount;
  return out;
}
/**
 * What the sheet applies of the species' increases that SW5E's engine doesn't (`missing`: "Your Strength, Constitution,
 * and Intelligence scores increase by 1" with only one of Strength/Constitution kept): an effect like a trait's.
 */
function bdSpeciesIncreaseEffects(editedRaw) {
  if (!editedRaw.species || !editedRaw.species.name) return [];
  const miss = Object.entries(bdSpeciesIncrease(editedRaw).missing);
  return miss.length ? [{
    id: 'species:increase', kind: 'feature', origin: 'species trait', name: 'Ability Score Increase', why: `${editedRaw.species.name} trait`, target: 'self', notes: [],
    mods: miss.map(([a, n]) => ({ path: `abilityScores.${a}.score`, bonus: n, label: `${a.slice(0, 3).toUpperCase()} +${n}` })),
  }] : [];
}
/**
 * A background feat as SW5E stores it. A +1 that can go to one ability only (Tough: "Increase your Constitution score
 * by 1") is no choice: it's recorded at once, so SW5E's engine applies it too.
 */
function bdNewBgFeat(name) {
  const inc = prFeatAbilities(arr(bdModules().feats).find((f) => f.name === name));
  return { name, type: 'Feat', ...(inc.length === 1 ? { abilityScoreImprovements: { [inc[0]]: 1 } } : {}) };
}
/** Final ability scores while creating: base + species (fixed and chosen) + the background feat's +1. */
function bdCreateScores(raw) {
  const inc = bdSpeciesIncrease(raw);
  const feat = (raw.background.feat && raw.background.feat.abilityScoreImprovements) || {};
  return Object.fromEntries(PR_ABILITIES.map((a) => {
    const base = num(raw.baseAbilityScores[a]);
    const sp = num(inc.fixed[a]) + num((raw.species.abilityScoreImprovement || {})[a]);
    const total = base + sp + num(feat[a]);
    return [a, { base, species: sp, feat: num(feat[a]), total, mod: Math.floor(total / 2) - 5 }];
  }));
}

/** What still has to be chosen: [{ step, text }]. */
function bdCreateProblems(C) {
  const raw = C.raw;
  const out = [];
  if (!String(raw.name).trim()) out.push({ step: 'basics', text: 'a name' });
  if (!raw.species.name) out.push({ step: 'basics', text: 'a species' });
  else if (prIsHalfHuman(bdSpeciesRef(raw)) && !raw.species.halfHumanOf) out.push({ step: 'basics', text: 'the non-human half' });
  else for (const p of bdSpeciesIncrease(raw).picks) if (p.chosen.length < p.count) out.push({ step: 'basics', text: `the species' +${p.amount} (${p.count - p.chosen.length} more)` });
  const k = raw.classes[0];
  const cref = k && bdClassRef(k.name);
  if (!k) out.push({ step: 'class', text: 'a class' });
  else {
    const sc = cref && prSkillChoice(cref.skillChoices, cref.skillChoicesList);
    if (sc && arr(k.skills).length < sc.count) out.push({ step: 'class', text: `${sc.count - arr(k.skills).length} class skill${sc.count - arr(k.skills).length > 1 ? 's' : ''}` });
    prToolChoices(arr(cref && cref.toolProficiencies).join(', '), bdTools()).forEach((g, i) => {
      if (!g.fixed && BD_KINDS.tool.get(raw, `Class: ${k.name}${i ? ` #${i + 1}` : ''}`).length < g.count) out.push({ step: 'class', text: 'the class tool proficiency' });
    });
  }
  if (C.method === 'array' && Object.values(raw.baseAbilityScores).some((v) => !PR_STANDARD_ARRAY.includes(num(v)))) out.push({ step: 'abilities', text: 'all six scores from the standard array' });
  if (C.method === 'buy' && prPointBuyCost(raw.baseAbilityScores) > PR_POINTS) out.push({ step: 'abilities', text: `point buy within ${PR_POINTS} points` });
  const bref = arr(bdModules().backgrounds).find((b) => b.name === raw.background.name);
  if (!bref) out.push({ step: 'background', text: 'a background' });
  else {
    const sc = prSkillChoice(bref.skillProficiencies);
    if (sc && arr(raw.background.skills).length < sc.count) out.push({ step: 'background', text: 'the background skills' });
    prToolChoices(bref.toolProficiencies, bdTools()).forEach((g, i) => {
      if (!g.fixed && BD_KINDS.tool.get(raw, `Background: ${bref.name}${i ? ` #${i + 1}` : ''}`).length < g.count) out.push({ step: 'background', text: 'the background tool' });
    });
    const lc = prLanguageChoices(bref.languages);
    if (lc && arr(raw.background.languages).length < lc.count) out.push({ step: 'background', text: 'the background languages' });
    if (!raw.background.feat || !raw.background.feat.name) out.push({ step: 'background', text: 'the background feat' });
    else if (bdFeatIncreases(raw).some((x) => x.arg === 'bg' && !x.chosen.length)) out.push({ step: 'background', text: 'the feat\'s +1' });
  }
  return out;
}

const bdOpt = (value, label, cur, extra = '') => `<option value="${esc(value)}"${String(cur) === String(value) ? ' selected' : ''}${extra}>${esc(label)}</option>`;
const bdField = (label, html, hint = '') => `<label class="cr-field"><span>${esc(label)}</span>${html}${hint ? `<small class="faint">${hint}</small>` : ''}</label>`;

function bdCreateStep(C) {
  const raw = C.raw;
  const mods = bdModules();
  switch (C.step) {
    case 'basics': {
      const species = arr(mods.species).filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name));
      const ref = species.find((s) => s.name === raw.species.name);
      const inc = raw.species.name ? bdSpeciesIncrease(raw) : null;
      return `${bdField('Name', `<input data-cr="name" value="${esc(raw.name)}" placeholder="Your character's name" autocomplete="off">`)}
        ${bdField('Species', `<select data-cr="species"><option value="">Choose…</option>${species.map((s) => bdOpt(s.name, s.name, raw.species.name)).join('')}</select>`)}
        ${prIsHalfHuman(ref) ? bdField('Non-human half', `<select data-cr="halfof"><option value="">Choose…</option>${prHalfHumanHalves(mods).map((s) => s.name).sort().map((n) => bdOpt(n, n, raw.species.halfHumanOf || '')).join('')}</select>`,
          'Its ability score increases (one of them may go to another ability), size, speed, languages and special traits, but those the Half-Human table names.') : ''}
        ${inc && inc.options.length > 1 ? bdField('Ability score increase', `<select data-cr="spopt">${inc.options.map((o, i) => bdOpt(i, o.picks.map((p) => `${p.abilities.join(' or ')} +${p.amount}`).join(', '), raw.species.abilityScoreImprovementSelectedOption)).join('')}</select>`) : ''}
        ${inc ? `<div class="cr-inc">${Object.entries({ ...inc.fixed, ...inc.all }).map(([a, n]) => chip(`${a} +${n}`, 'accent')).join(' ')}
          ${inc.picks.map((p) => Array.from({ length: p.count }, (_, j) => `<select data-cr="spinc" data-i="${p.i}" data-j="${j}" aria-label="+${p.amount} to"><option value="">+${p.amount} to…</option>${p.options.map((a) => bdOpt(a, `${a} +${p.amount}`, p.chosen[j] || '', p.chosen.includes(a) && p.chosen[j] !== a ? ' disabled' : '')).join('')}</select>`).join(' ')).join(' ')}</div>` : ''}
        ${ref ? `<div class="cr-about"><b>${esc(ref.name)}</b>${ref.size ? ` · ${esc(ref.size)}` : ''}${ref.language ? ` · speaks ${esc(ref.language)}` : ''}
          <div class="chips">${arr(ref.traits).filter((t) => !/^(Ability Score Increase|Age|Alignment|Size|Languages?)$/i.test(t.name)).map((t) => `<span class="chip" title="${esc(t.description)}">${esc(t.name)}</span>`).join('')}</div>
          ${ref.flavorText ? `<details><summary>About the ${esc(ref.name)}</summary><div class="desc">${md(ref.flavorText)}</div></details>` : ''}</div>` : ''}`;
    }
    case 'class': {
      const k = raw.classes[0];
      const ref = k && bdClassRef(k.name);
      const sc = ref && prSkillChoice(ref.skillChoices, ref.skillChoicesList);
      const chosen = arr(k && k.skills);
      return `${bdField('Class', `<select data-cr="class"><option value="">Choose…</option>${arr(mods.classes).map((c) => bdOpt(c.name, `${c.name} (d${c.hitDiceDieType}, ${c.primaryAbility})`, k ? k.name : '')).join('')}</select>`)}
        ${ref ? `<div class="cr-about"><b>${esc(ref.name)}</b> · hit die d${esc(ref.hitDiceDieType)} · ${esc(ref.hitPointsAtFirstLevel || '')}
          <div class="faint">Saves ${esc(arr(ref.savingThrows).join(', '))} · Armor ${esc(arr(ref.armorProficiencies).join(', '))} · Weapons ${esc(arr(ref.weaponProficiencies).join(', '))}</div>
          ${ref.summary ? `<div class="desc">${md(ref.summary)}</div>` : ''}</div>
          ${sc ? bdPickList({ title: 'Skill proficiencies', from: ref.skillChoices, count: sc.count, chosen, options: (sc.options || prSkillList()).filter((s) => !bdPickedSkills(raw, 0).has(s)), kind: 'crskill', arg: '', word: 'a skill' }) : ''}
          ${prToolChoices(arr(ref.toolProficiencies).join(', '), bdTools()).map((g, i) => (g.fixed ? `<p class="faint">Tool: ${esc(g.fixed)}</p>`
            : bdPickList({ title: 'Tool proficiency', from: arr(ref.toolProficiencies).join(', '), count: g.count, chosen: BD_KINDS.tool.get(raw, `Class: ${k.name}${i ? ` #${i + 1}` : ''}`), options: g.options, kind: 'crtool', arg: `Class: ${k.name}${i ? ` #${i + 1}` : ''}`, word: 'a tool' }))).join('')}
          <p class="faint">Level 1 powers, fighting styles and other class choices are made in the sheet's class card once the character exists.</p>` : ''}`;
    }
    case 'abilities': {
      const scores = bdCreateScores(raw);
      const cost = prPointBuyCost(raw.baseAbilityScores);
      const used = PR_ABILITIES.map((a) => num(raw.baseAbilityScores[a]));
      const cell = (a) => {
        const v = num(raw.baseAbilityScores[a]);
        if (C.method === 'array') {
          return `<select data-cr="score" data-a="${a}" aria-label="${a}"><option value="">—</option>${PR_STANDARD_ARRAY.map((n) => bdOpt(n, n, PR_STANDARD_ARRAY.includes(v) ? v : '',
            used.filter((x, i) => x === n && PR_ABILITIES[i] !== a).length >= PR_STANDARD_ARRAY.filter((x) => x === n).length ? ' disabled' : '')).join('')}</select>`;
        }
        if (C.method === 'buy') return `<button class="btn sm" data-act="cr-buy" data-arg="${a}|-1" ${v <= 8 ? 'disabled' : ''} aria-label="${a} −1">−</button><b class="cr-score">${v}</b><button class="btn sm" data-act="cr-buy" data-arg="${a}|1" ${v >= 15 ? 'disabled' : ''} aria-label="${a} +1">+</button>`;
        return `<input type="number" min="1" max="30" data-cr="score" data-a="${a}" value="${v}" aria-label="${a}">`;
      };
      return `<div class="lvl-row">${[['array', 'Standard array (15, 14, 13, 12, 10, 8)'], ['buy', `Point buy (${PR_POINTS} points)`], ['manual', 'Manual / rolled']].map(([v, l]) => `<label class="lvl-opt"><input type="radio" name="cr-method" data-cr="method" value="${v}"${C.method === v ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</div>
        ${C.method === 'buy' ? `<p class="${cost > PR_POINTS ? 'bad-text' : 'faint'}">Points spent: ${cost == null ? '—' : cost} of ${PR_POINTS}</p>` : ''}
        ${C.method === 'manual' ? '<p><button class="btn sm" data-act="cr-roll">Roll 4d6, drop the lowest (×6)</button> <span class="faint">or type your scores</span></p>' : ''}
        <div class="table-wrap"><table class="cr-scores"><thead><tr><th>Ability</th><th>Base</th><th>Species</th><th>Feat</th><th>Score</th><th>Mod</th></tr></thead><tbody>
        ${PR_ABILITIES.map((a) => `<tr><td>${a}</td><td class="cr-base">${cell(a)}</td><td>${scores[a].species ? signed(scores[a].species) : ''}</td><td>${scores[a].feat ? signed(scores[a].feat) : ''}</td>
          <td><b>${scores[a].total}</b></td><td>${signed(scores[a].mod)}</td></tr>`).join('')}</tbody></table></div>
        ${raw.classes[0] ? `<p class="faint">${esc(raw.classes[0].name)}'s primary ability: ${esc((bdClassRef(raw.classes[0].name) || {}).primaryAbility || '—')}.</p>` : ''}`;
    }
    case 'background': {
      const bgs = arr(mods.backgrounds).filter((b) => b.name).sort((a, b) => a.name.localeCompare(b.name));
      const ref = bgs.find((b) => b.name === raw.background.name);
      if (!ref) return bdField('Background', `<select data-cr="background"><option value="">Choose…</option>${bgs.map((b) => bdOpt(b.name, b.name, '')).join('')}</select>`);
      const sc = prSkillChoice(ref.skillProficiencies);
      const lc = prLanguageChoices(ref.languages);
      const featOpts = arr(ref.featOptions);
      const featRef = arr(mods.feats).find((f) => f.name === (raw.background.feat || {}).name);
      const inc = prFeatAbilities(featRef);
      return `${bdField('Background', `<select data-cr="background">${bgs.map((b) => bdOpt(b.name, b.name, raw.background.name)).join('')}</select>`)}
        ${ref.flavorText ? `<details><summary>About this background</summary><div class="desc">${md(ref.flavorText)}</div></details>` : ''}
        ${sc ? (() => {
          const taken = bdPickedSkills(raw, -1, true);
          const short = (sc.options || []).filter((s) => !taken.has(s)).length < sc.count;
          return bdPickList({ title: 'Skill proficiencies', from: ref.skillProficiencies, count: sc.count, chosen: arr(raw.background.skills), options: (short || !sc.options ? prSkillList() : sc.options).filter((s) => !taken.has(s)),
            kind: 'crbskill', arg: '', word: 'a skill', hint: short ? 'You already have some of these from your class: choose any other skill instead.' : '' });
        })() : ''}
        ${prToolChoices(ref.toolProficiencies, bdTools()).map((g, i) => (g.fixed ? `<p class="faint">Tool: ${esc(g.fixed)}</p>`
          : bdPickList({ title: 'Tool proficiency', from: ref.toolProficiencies, count: g.count, chosen: BD_KINDS.tool.get(raw, `Background: ${ref.name}${i ? ` #${i + 1}` : ''}`), options: g.options, kind: 'crtool', arg: `Background: ${ref.name}${i ? ` #${i + 1}` : ''}`, word: 'a tool' }))).join('')}
        ${lc ? bdPickList({ title: 'Languages', from: ref.languages, count: lc.count, chosen: arr(raw.background.languages), options: lc.options || prLanguages(mods), kind: 'crblang', arg: '', word: 'a language' }) : ref.languages ? `<p class="faint">Languages: ${esc(ref.languages)}</p>` : ''}
        <fieldset class="lvl-set"><legend>Background feat</legend>
          ${featOpts.length ? `<div class="lvl-row">${featOpts.map((f) => `<label class="lvl-opt"><input type="radio" name="cr-feat" data-cr="feat" value="${esc(f.name)}"${f.name === (raw.background.feat || {}).name ? ' checked' : ''}> ${f.roll ? `${f.roll}. ` : ''}${esc(f.name)}</label>`).join('')}</div>
            <button class="btn sm" data-act="cr-feat-roll">Roll d${featOpts.length}</button>` : `<select data-cr="feat"><option value="">Choose…</option>${bdFeatList().map((f) => bdOpt(f.name, f.name, (raw.background.feat || {}).name)).join('')}</select>`}
          ${featRef ? `<div class="desc lvl-feat">${md(featRef.text || '')}</div>` : ''}
          ${inc.length > 1 ? bdPickList({ title: `${featRef.name}: +1 to`, count: 1, chosen: Object.keys(raw.background.feat.abilityScoreImprovements || {}), options: inc, kind: 'crfeatinc', arg: '', word: 'an ability' }) : ''}
          <p class="faint">Choices the feat gives (a form, powers…) are made in the sheet once the character exists.</p></fieldset>
        ${ref.featureName ? `<details><summary>Feature: ${esc(ref.featureName)}</summary><div class="desc">${md(ref.featureText || '')}</div></details>` : ''}`;
    }
    case 'equipment': return bdCreateEquipment(C);
    case 'details': {
      const ref = arr(mods.backgrounds).find((b) => b.name === raw.background.name);
      const ch = prCharacteristics(ref);
      const ta = (key, label, list, rows = 2) => `<div class="cr-char"><div class="cr-char-head"><b>${esc(label)}</b>${list.length ? ` <button class="btn sm" data-act="cr-char-roll" data-arg="${esc(key)}">Roll d${list.length}</button>
          <select data-cr="charpick" data-key="${esc(key)}" aria-label="Pick from the background's list"><option value="">Pick from ${esc(raw.background.name || 'the background')}…</option>${list.map((x) => `<option value="${esc(x.text)}">${x.roll}. ${esc(x.text.slice(0, 90))}</option>`).join('')}</select>` : ''}</div>
        <textarea data-cr="char" data-key="${esc(key)}" rows="${rows}">${esc(raw.characteristics[key] || '')}</textarea></div>`;
      return `${bdField('Alignment', `<select data-cr="alignment"><option value="">—</option>${ALIGNMENTS.map((a) => bdOpt(a, a, raw.characteristics.alignment)).join('')}</select>`)}
        ${ta('Personality Traits', 'Personality traits', ch.traits, 3)}${ta('Ideal', 'Ideal', ch.ideals)}${ta('Bond', 'Bond', ch.bonds)}${ta('Flaw', 'Flaw', ch.flaws)}
        <div class="cr-grid">${PHYSICAL.map((k) => bdField(k, `<input data-cr="char" data-key="${esc(k)}" value="${esc(raw.characteristics[k] || '')}">`)).join('')}</div>
        ${ta('Appearance', 'Appearance', [], 3)}${ta('Backstory', 'Backstory', [], 5)}`;
    }
    case 'review': {
      const probs = bdCreateProblems(C);
      const scores = bdCreateScores(raw);
      const k = raw.classes[0];
      const cref = k && bdClassRef(k.name);
      const hp = cref ? num(cref.hitPointsAtFirstLevelNumber) + scores.Constitution.mod : 0;
      return `${probs.length ? `<div class="banner"><b>Still to choose:</b> ${probs.map((p) => `<button class="linklike" data-act="cr-step" data-arg="${p.step}">${esc(p.text)}</button>`).join(', ')}</div>`
        : '<div class="banner pending info"><b>Everything is chosen.</b> Create the character to see the full sheet; SW5E\'s rules engine computes the numbers.</div>'}
        <dl class="kv"><dt>Name</dt><dd>${esc(raw.name || '—')}</dd><dt>Species</dt><dd>${esc(raw.species.name || '—')}</dd>
          <dt>Class</dt><dd>${esc(k ? `${k.name} 1` : '—')}</dd><dt>Background</dt><dd>${esc(raw.background.name || '—')}${raw.background.feat && raw.background.feat.name ? ` (${esc(raw.background.feat.name)})` : ''}</dd>
          <dt>Abilities</dt><dd>${PR_ABILITIES.map((a) => `${ABBR[a]} ${scores[a].total} (${signed(scores[a].mod)})`).join(' · ')}</dd>
          <dt>Hit points</dt><dd>${hp || '—'}</dd>
          <dt>Skills</dt><dd>${esc(arr(k && k.skills).concat(arr(raw.background.skills)).join(', ') || '—')}</dd>
          <dt>Tools</dt><dd>${esc(arr(raw.customProficiencies).map((p) => p.name).join(', ') || '—')}</dd>
          <dt>Languages</dt><dd>${esc(['Galactic Basic', ...arr(raw.background.languages), ...arr(raw.customLanguages)].join(', '))}</dd>
          <dt>Equipment</dt><dd>${esc(bdCreateItems(C).items.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.name}`).concat(bdCreateItems(C).custom.map((i) => i.name)).join(', ') || '—')}</dd>
          <dt>Credits</dt><dd>${fmtNum(bdCreateItems(C).credits)} cr</dd></dl>
        <p class="faint">The character is kept in this browser (and in backups). Sync to SW5E saves it to your sw5e.com account too.</p>`;
    }
    default: return '';
  }
}

// ------------------------------------------------------------- starting equipment
/** The equipment groups: the class's lines and the background's list. */
function bdCreateEquipLines(C) {
  const k = C.raw.classes[0];
  const cref = k && bdClassRef(k.name);
  const bref = arr(bdModules().backgrounds).find((b) => b.name === C.raw.background.name);
  const lines = arr(cref && cref.equipmentLines).map((l, i) => ({ key: `class:${i}`, from: k.name, options: prEquipmentOptions(l) }));
  if (bref && bref.equipment) lines.push({ key: 'bg', from: bref.name, options: [{ label: '', text: bref.equipment }] });
  return lines;
}
/** What the chosen options give: catalog items, custom items and credits. */
function bdCreateItems(C) {
  const items = state.catalog ? state.catalog.items : [];
  const out = { items: [], custom: [], credits: 0, open: [] };
  if (C.equip.mode === 'wealth') { out.credits = num(C.equip.wealth); return out; }
  for (const line of bdCreateEquipLines(C)) {
    const label = line.options.length > 1 ? (C.equip.lines[line.key] || line.options[0].label) : line.options[0].label;
    const opt = line.options.find((o) => o.label === label) || line.options[0];
    prEquipmentItems(opt.text).forEach((g, gi) => {
      if (g.credits) { out.credits += g.credits; return; }
      const id = `${line.key}:${opt.label}:${gi}`;
      const choice = g.choices.length > 1 ? (C.equip.picks[`${id}:c`] || g.choices[0]) : g.choices[0];
      const r = prResolveEquipment(choice, items);
      const name = r.item || (r.options ? C.equip.picks[id] : null);
      // An equipment pack: what's in it (SW5E's Equipment chapter), else the pack as a custom item.
      const pack = r.custom && !C.equip.names[id] && typeof packByName === 'function' ? packByName(r.custom) : null;
      if (pack) {
        for (const x of packEntries(pack, g.qty)) (x.list === 'equipment' ? out.items : out.custom).push({ name: x.entry.name, quantity: x.entry.quantity });
        return;
      }
      if (r.custom) out.custom.push({ name: C.equip.names[id] || r.custom, quantity: g.qty });
      else if (name) out.items.push({ name, quantity: g.qty });
      else out.open.push(id);
    });
  }
  return out;
}
function bdCreateEquipment(C) {
  const items = state.catalog ? state.catalog.items : [];
  const k = C.raw.classes[0];
  const cref = k && bdClassRef(k.name);
  if (!state.catalog) return '<p class="faint">Loading SW5E\'s item list… <button class="linklike" data-act="catalog-refresh">Try again</button></p>';
  const mode = `<div class="lvl-row"><label class="lvl-opt"><input type="radio" name="cr-eq" data-cr="eqmode" value="gear"${C.equip.mode === 'gear' ? ' checked' : ''}> Starting equipment</label>
    <label class="lvl-opt"><input type="radio" name="cr-eq" data-cr="eqmode" value="wealth"${C.equip.mode === 'wealth' ? ' checked' : ''}> Starting wealth instead${cref && cref.startingWealthVariant ? ` (${esc(cref.startingWealthVariant)})` : ''}</label></div>`;
  if (C.equip.mode === 'wealth') {
    return `${mode}<p>${bdField('Credits', `<input type="number" min="0" data-cr="wealth" value="${esc(C.equip.wealth ?? '')}">`)} ${cref && cref.startingWealthVariant ? `<button class="btn sm" data-act="cr-wealth-roll">Roll ${esc(cref.startingWealthVariant)}</button>` : ''}</p>
      <p class="faint">You get no class or background equipment, and buy your gear in the sheet (Equipment → Add an item, Pay).</p>`;
  }
  const lines = bdCreateEquipLines(C).map((line) => {
    const label = line.options.length > 1 ? (C.equip.lines[line.key] || line.options[0].label) : line.options[0].label;
    const opt = line.options.find((o) => o.label === label) || line.options[0];
    const radios = line.options.length > 1 ? `<div class="lvl-row">${line.options.map((o) => `<label class="lvl-opt"><input type="radio" name="cr-${esc(line.key)}" data-cr="eqline" data-key="${esc(line.key)}" value="${esc(o.label)}"${o.label === label ? ' checked' : ''}> (${esc(o.label)}) ${esc(o.text)}</label>`).join('')}</div>`
      : `<div>${esc(opt.text)}</div>`;
    const resolved = prEquipmentItems(opt.text).map((g, gi) => {
      if (g.credits) return chip(`${g.credits} cr`, 'good');
      const id = `${line.key}:${opt.label}:${gi}`;
      const choice = g.choices.length > 1 ? (C.equip.picks[`${id}:c`] || g.choices[0]) : g.choices[0];
      const alt = g.choices.length > 1 ? `<select data-cr="eqchoice" data-id="${esc(id)}:c">${g.choices.map((c) => bdOpt(c, c, choice)).join('')}</select>` : '';
      const r = prResolveEquipment(choice, items);
      const qty = g.qty > 1 ? `${g.qty}× ` : '';
      if (r.item) return `<span class="cr-item">${alt}${qty}${esc(r.item)}</span>`;
      if (r.options) return `<span class="cr-item">${alt}${qty}<select data-cr="eqpick" data-id="${esc(id)}"><option value="">Choose a ${esc(PR_SINGULAR(choice))}…</option>${r.options.map((n) => bdOpt(n, n, C.equip.picks[id] || '')).join('')}</select></span>`;
      return `<span class="cr-item">${alt}${qty}<input data-cr="eqname" data-id="${esc(id)}" value="${esc(C.equip.names[id] || r.custom)}" title="Not in SW5E's item list: added as a custom item"> <span class="chip">custom</span></span>`;
    }).join(' ');
    return `<div class="cls-list cr-eq"><div class="cls-head"><b>${esc(line.from)}</b></div>${radios}<div class="cr-items">${resolved}</div></div>`;
  }).join('');
  return `${mode}${lines}<p class="faint">Packs and other things SW5E's item list doesn't have become custom items (rename them as you like).</p>`;
}

// ------------------------------------------------------------- the wizard
function bdCreatePage() {
  const C = state.create;
  const at = BD_STEPS.findIndex(([s]) => s === C.step);
  const probs = bdCreateProblems(C);
  return `<div class="card no-toggle cr-page"><div class="card-head"><span class="title">New character${C.raw.name ? `: ${esc(C.raw.name)}` : ''}</span>
      <button class="btn sm" data-act="cr-cancel">Cancel</button></div>
    <nav class="cr-steps">${BD_STEPS.map(([s, l], i) => `<button class="btn sm${s === C.step ? ' on' : ''}" data-act="cr-step" data-arg="${s}" aria-current="${s === C.step ? 'step' : 'false'}">${i + 1}. ${esc(l)}${probs.some((p) => p.step === s) && i < at ? ' ⚠' : ''}</button>`).join('')}</nav>
    <div class="cr-body">${bdCreateStep(C)}</div>
    <div class="ed-actions">${at > 0 ? `<button class="btn" data-act="cr-step" data-arg="${BD_STEPS[at - 1][0]}">Back</button>` : ''}
      ${at < BD_STEPS.length - 1 ? `<button class="btn primary" data-act="cr-step" data-arg="${BD_STEPS[at + 1][0]}">Next: ${esc(BD_STEPS[at + 1][1])}</button>`
        : `<button class="btn primary" data-act="cr-create"${probs.length ? ' title="Some choices are still open; you can make them later in the sheet"' : ''}>Create ${esc(C.raw.name || 'the character')}</button>`}</div>
  </div>`;
}

/** Create: the character as SW5E stores it, computed by its engine, kept in this viewer. */
async function bdCreateFinish() {
  const C = state.create;
  if (!C) return;
  const raw = clone(C.raw);
  if (!String(raw.name).trim()) { C.step = 'basics'; renderAll(); return setStatus('Give the character a name first.', 'error'); }
  if (!raw.classes.length) { C.step = 'class'; renderAll(); return setStatus('Choose a class first.', 'error'); }
  const got = bdCreateItems(C);
  const cat = state.catalog ? state.catalog.items : [];
  raw.equipment = got.items.map((it) => {
    const ref = cat.find((x) => x.name === it.name) || {};
    return { name: it.name, quantity: it.quantity, category: ref.equipmentCategory ? 'Equipment' : 'EnhancedItem', ...(['Weapon', 'Armor'].includes(ref.equipmentCategory) ? { equipped: true } : {}) };
  });
  // Only one armor and one shield worn.
  let armor = false; let shield = false;
  for (const e of raw.equipment) {
    const ref = cat.find((x) => x.name === e.name) || {};
    if (ref.equipmentCategory !== 'Armor') continue;
    const isShield = ref.armorClassification === 'Shield';
    if ((isShield && shield) || (!isShield && armor)) delete e.equipped;
    if (isShield) shield = true; else armor = true;
  }
  raw.customEquipment = got.custom.map((it) => ({ name: it.name, quantity: it.quantity, equipmentCategory: 'Gear', cost: 0, weight: 0, description: 'Starting equipment.' }));
  raw.credits = got.credits;
  raw.settings.abilityScoreMethod = { array: 'Standard Array', buy: 'Point Buy', manual: 'Manual' }[C.method];
  raw.localId = `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  // SW5E's engine adds the species' language only when the character records it (its builder doesn't).
  const spRef = bdSpeciesRef(raw);
  if (spRef && spRef.language && !/varies|non-verbal/i.test(spRef.language)) raw.species.language = spRef.language;
  raw.createdAt = Date.now();
  raw.changedAt = Date.now();
  setStatus('Computing the new character…');
  let res = null;
  try { res = await computeCharacters([raw], { onStatus: (msg) => setStatus(msg, '', true) }); } catch (e) { console.error(e); }
  const keys = addSnapshots(res && res.characters && res.characters[0] ? res.characters : [{ raw, error: 'Could not reach sw5e.com to compute the numbers yet; they appear once it can (Recompute in More ▾).' }], 'created', res && res.meta, 'Created here');
  state.create = null;
  state.current = keys[0];
  await saveStore();
  renderAll();
  window.scrollTo({ top: 0 });
  setStatus(`${raw.name} created. Next: the class card's choices (powers, fighting style…), if any.`);
}

/** Wizard actions. */
function bdCreateAction(act, arg) {
  const C = state.create;
  if (act === 'cr-new') return bdCreateOpen();
  if (!C) return undefined;
  const raw = C.raw;
  switch (act) {
    case 'cr-cancel': state.create = null; renderAll(); return undefined;
    case 'cr-step': C.step = arg; renderAll(); window.scrollTo({ top: 0 }); return undefined;
    case 'cr-create': return bdCreateFinish();
    case 'cr-buy': {
      const [a, d] = arg.split('|');
      const v = num(raw.baseAbilityScores[a]) + num(d);
      if (v >= 8 && v <= 15) raw.baseAbilityScores[a] = v;
      break;
    }
    case 'cr-roll':
      for (const a of PR_ABILITIES) { const r = [1, 2, 3, 4].map(() => rollDie(6)).sort((x, y) => y - x); raw.baseAbilityScores[a] = r[0] + r[1] + r[2]; }
      break;
    case 'cr-feat-roll': {
      const ref = arr(bdModules().backgrounds).find((b) => b.name === raw.background.name);
      const opts = arr(ref && ref.featOptions);
      if (opts.length) raw.background.feat = bdNewBgFeat(opts[rollDie(opts.length) - 1].name);
      break;
    }
    case 'cr-char-roll': {
      const ch = prCharacteristics(arr(bdModules().backgrounds).find((b) => b.name === raw.background.name));
      const list = { 'Personality Traits': ch.traits, Ideal: ch.ideals, Bond: ch.bonds, Flaw: ch.flaws }[arg] || [];
      if (list.length) {
        const x = list[rollDie(list.length) - 1].text;
        raw.characteristics[arg] = arg === 'Personality Traits' && raw.characteristics[arg] && !raw.characteristics[arg].includes(x) ? `${raw.characteristics[arg]} ${x}` : x;
      }
      break;
    }
    case 'cr-wealth-roll': {
      const cref = bdClassRef((raw.classes[0] || {}).name);
      const w = /(\d+)d(\d+)\s*[x×*]\s*(\d+)/i.exec(String(cref && cref.startingWealthVariant));
      if (w) C.equip.wealth = Array.from({ length: Number(w[1]) }, () => rollDie(Number(w[2]))).reduce((t, n) => t + n, 0) * Number(w[3]);
      break;
    }
    default: return undefined;
  }
  renderAll();
  return undefined;
}

/** Pick lists inside the wizard (they write to the draft, not to a saved character). */
function bdCreatePick(kind, arg, name, on) {
  const C = state.create;
  if (!C || !name) return;
  const raw = C.raw;
  const toggle = (list) => (on ? (list.includes(name) ? list : list.concat(name)) : list.filter((x) => x !== name));
  if (kind === 'crskill') raw.classes[0].skills = toggle(arr(raw.classes[0].skills));
  if (kind === 'crbskill') raw.background.skills = toggle(arr(raw.background.skills));
  if (kind === 'crblang') raw.background.languages = toggle(arr(raw.background.languages));
  if (kind === 'crtool') Object.assign(raw, BD_KINDS.tool.set(raw, arg, toggle(BD_KINDS.tool.get(raw, arg))));
  if (kind === 'crfeatinc') {
    const list = toggle(Object.keys(raw.background.feat.abilityScoreImprovements || {}));
    raw.background.feat = { ...raw.background.feat, abilityScoreImprovements: Object.fromEntries(list.slice(-1).map((a) => [a, 1])) };
  }
  renderAll();
}

// The wizard's fields.
document.addEventListener('change', (e) => {
  const f = e.target.dataset && e.target.dataset.cr;
  const C = state.create;
  if (!f || !C) return;
  const raw = C.raw;
  const v = e.target.value;
  const ds = e.target.dataset;
  switch (f) {
    case 'name': raw.name = v; break;
    // An entry the text raises whole (Harch: Strength and Constitution) is recorded at once, so SW5E's engine applies it.
    case 'species': raw.species = { name: v, abilityScoreImprovementSelectedOption: 0, abilityScoreImprovement: {} }; raw.species.abilityScoreImprovement = { ...bdSpeciesIncrease(raw).all }; break;
    case 'spopt': raw.species.abilityScoreImprovementSelectedOption = num(v); raw.species.abilityScoreImprovement = {}; raw.species.abilityScoreImprovement = { ...bdSpeciesIncrease(raw).all }; break;
    case 'halfof': raw.species = BD_KINDS.halfof.set(raw, '', v ? [v] : []).species; break;
    case 'spinc': {
      const inc = bdSpeciesIncrease(raw);
      const p = inc.picks.find((x) => x.i === num(ds.i));
      const chosen = p.chosen.slice();
      chosen[num(ds.j)] = v;
      raw.species.abilityScoreImprovement = bdSpeciesWithPick(raw, p.i, chosen);
      break;
    }
    case 'class': {
      const before = raw.classes[0] && raw.classes[0].name;
      raw.classes = v ? [{ name: v, levels: 1, hitPoints: [], abilityScoreImprovements: [] }] : [];
      if (before) raw.customProficiencies = arr(raw.customProficiencies).filter((p) => !String(p.from || '').startsWith(`Class: ${before}`));
      C.equip.lines = {}; C.equip.picks = {};
      break;
    }
    case 'method':
      C.method = v;
      raw.baseAbilityScores = Object.fromEntries(PR_ABILITIES.map((a) => [a, v === 'array' ? 0 : 8]));
      break;
    case 'score': raw.baseAbilityScores[ds.a] = num(v); break;
    case 'background': {
      const before = raw.background.name;
      raw.background = { name: v, feat: { name: '', type: 'Feat' } };
      if (before) raw.customProficiencies = arr(raw.customProficiencies).filter((p) => !String(p.from || '').startsWith(`Background: ${before}`));
      break;
    }
    case 'feat': raw.background.feat = bdNewBgFeat(v); break;
    case 'eqmode': C.equip.mode = v; break;
    case 'eqline': C.equip.lines[ds.key] = v; break;
    case 'eqchoice': C.equip.picks[ds.id] = v; break;
    case 'eqpick': C.equip.picks[ds.id] = v; break;
    case 'eqname': C.equip.names[ds.id] = v; return;
    case 'wealth': C.equip.wealth = num(v); return;
    case 'alignment': raw.characteristics.alignment = v; return;
    case 'char': raw.characteristics[ds.key] = v; return;
    case 'charpick':
      if (v) raw.characteristics[ds.key] = ds.key === 'Personality Traits' && raw.characteristics[ds.key] && !raw.characteristics[ds.key].includes(v) ? `${raw.characteristics[ds.key]} ${v}` : v;
      break;
    default: return;
  }
  renderAll();
});
document.addEventListener('input', (e) => {
  const f = e.target.dataset && e.target.dataset.cr;
  const C = state.create;
  if (!C || !['name', 'char', 'eqname'].includes(f)) return;
  if (f === 'name') C.raw.name = e.target.value;
  if (f === 'char') C.raw.characteristics[e.target.dataset.key] = e.target.value;
  if (f === 'eqname') C.equip.names[e.target.dataset.id] = e.target.value;
});


// ------------------------------------------------------------- choices still open
/** Everything the character can still choose: [{ sec (section id), text }], for Overview. */
function bdOpenChoices(m) {
  if (!state.rules || !m.has) return [];
  const out = [];
  const add = (sec, text) => out.push({ sec, text });
  const raw = m.raw;
  const mods = bdModules();
  const more = (n) => (n > 1 ? ` (${n} more)` : '');
  arr(raw.classes).forEach((k, idx) => {
    const ref = bdClassRef(k.name);
    if (!ref) return;
    if (idx === 0) {
      const sc = prSkillChoice(ref.skillChoices, ref.skillChoicesList);
      if (sc && arr(k.skills).length < sc.count) add('classes', `${k.name} skills${more(sc.count - arr(k.skills).length)}`);
      prToolChoices(arr(ref.toolProficiencies).join(', '), bdTools()).forEach((g, i) => {
        if (!g.fixed && state.catalog && BD_KINDS.tool.get(raw, `Class: ${k.name}${i ? ` #${i + 1}` : ''}`).length < g.count) add('classes', `${k.name} tool`);
      });
    } else {
      const mc = prMulticlassRules(mods).profs[k.name] || {};
      if (mc.skills && arr(k.skills).length < mc.skills.count) add('classes', `${k.name} multiclass skill`);
      if (mc.tools && BD_KINDS.tool.get(raw, `Class: ${k.name}`).length < mc.tools.count) add('classes', `${k.name} multiclass tool`);
    }
    const exp = clsTextFeatures(ref.classFeatureText, k.name, 'Class').find((f) => /^Expertise$/i.test(f.name));
    if (exp && exp.level <= num(k.levels)) {
      const n = exp.levels.filter((l) => l <= num(k.levels)).length * 2 - arr(k.expertise).length;
      const noted = /\w/.test(featureNoteOf(raw, 'Expertise'));
      if (n > 0 && !noted) add('classes', `${k.name} Expertise${more(n)}`);
    }
    for (const s of prAsiSlots(raw, mods).filter((x) => x.cls === k.name && !x.value)) add('classes', `${k.name} ${ordinal(s.level)} level: ability score improvement or feat`);
    if (num(k.levels) >= archetypeLevel(k.name) && !(k.archetype && k.archetype.name)) add('classes', `${k.name} ${archetypeWord(k.name) || 'archetype'}`);
    const info = classChoiceInfo(m, k);
    for (const l of (info ? info.lists : [])) if (l.chosen.length < l.max) add('classes', `${l.title}${more(l.max - l.chosen.length)}`);
    if (info && info.maneuvers && arr(info.maneuvers.chosen).length < info.maneuvers.max) add('classes', `${k.name} maneuvers${more(info.maneuvers.max - arr(info.maneuvers.chosen).length)}`);
    for (const c of pwClassCasting(k, mods)) {
      const n = c.known - new Set(c.chosen.map((x) => String(x).toLowerCase())).size;
      if (n > 0) add('classes', `${c.from} ${c.type} powers${more(n)}`);
    }
  });
  const res = choiceInfo(m);
  for (const s of (res ? res.slots : [])) {
    if (s.given || s.hint) continue;
    const n = s.count - s.picks.filter((p) => !p.auto).length - (s.fixed ? s.picks.filter((p) => p.auto).length : 0);
    if (n > 0) add(s.owner ? 'classes' : s.species ? 'species' : 'feats', `${s.title}${more(n)} (${String(s.label || s.from).replace(/\s*\(.*\)$/, '')})`);
  }
  const bg = raw.background || {};
  const bref = arr(mods.backgrounds).find((b) => b.name === bg.name);
  if (bref) {
    const sc = prSkillChoice(bref.skillProficiencies);
    if (sc && arr(bg.skills).length < sc.count) add('background', `background skills${more(sc.count - arr(bg.skills).length)}`);
    if (state.catalog) prToolChoices(bref.toolProficiencies, bdTools()).forEach((g, i) => { if (!g.fixed && BD_KINDS.tool.get(raw, `Background: ${bg.name}${i ? ` #${i + 1}` : ''}`).length < g.count) add('background', 'background tool'); });
    const lc = prLanguageChoices(bref.languages);
    if (lc && arr(bg.languages).length < lc.count) add('background', `background languages${more(lc.count - arr(bg.languages).length)}`);
  }
  // Feats' +1 where the feat lets you choose (a +1 to one ability only applies as is).
  for (const x of bdFeatIncreases(raw)) if (!x.chosen.length) add(x.arg === 'bg' ? 'background' : 'feats', `${x.name}: +1`);
  // What else feats ask (classes.js asks: skills, tools, a damage type…; the languages they teach).
  for (const name of bdFeatNames(raw)) {
    const ref = bdFeatList().find((f) => f.name === name);
    if (!ref) continue;
    const keep = bdFeatAskFilter(ref.text);
    for (const a of openAsks(featureAsks(m, { name, text: ref.text || '', source: 'Feat' }).filter((x) => !keep || keep(x)))) add('feats', `${name}: ${a.label.toLowerCase()}${more(a.count - a.chosen.length)}`);
  }
  // What the items in use ask (a side effect's score, Adapted Armor's damage type, a weapon of your choice): in the
  // item's note.
  for (const e of arr(m.effects).filter((x) => x.kind === 'item' && x.active)) for (const c of arr(e.needsChoice)) add('equipment', `${e.name}: ${c}`);
  for (const x of bdFeatureLanguages(raw).filter((l) => !l.alt)) if (x.chosen.length < x.count) add('classes', `${x.name}: languages${more(x.count - x.chosen.length)}`);
  for (const x of bdFeatureOpenAsks(m)) add('classes', `${x.name}: ${x.text}`);
  for (const x of bdFeatLanguages(raw)) if (x.chosen.length < x.count) add('feats', `${x.name}: languages${more(x.count - x.chosen.length)}`);
  const sp = bdSpeciesRef(raw);
  if (prIsHalfHuman(sp) && !sp.halfOf) add('species', 'non-human half');
  const tr = sp && arr(sp.traits).find((t) => /^Languages?$/i.test(t.name));
  const lc = tr && prLanguageChoices(tr.description);
  if (lc && BD_KINDS.lang.get(raw, `Species: ${sp.name}`).length < lc.count) add('species', 'species language');
  // What the species' traits ask (Theelin's Mutation, Kiffar Heritage, Human Versatility's skill, tool and weapon).
  for (const t of bdSpeciesTraitFeatures(m)) {
    for (const a of openAsks(featureAsks(m, t))) add('species', `${t.name}: ${a.label.toLowerCase()}${more(a.count - a.chosen.length)}`);
  }
  if (sp) for (const p of bdSpeciesIncrease(raw).picks) if (p.chosen.length < p.count) add('species', `species +${p.amount}${more(p.count - p.chosen.length)} (${p.given.length < 6 ? p.given.join(' or ') : 'any ability'})`);
  return out;
}
function bdOpenChoicesHtml(m) {
  const list = bdOpenChoices(m);
  if (!list.length) return '';
  return `<div class="open-choices"><b>Still to choose (${list.length}):</b> ${list.map((x) => `<a href="#sec-${x.sec}">${esc(x.text)}</a>`).join(' · ')}</div>`;
}

// ------------------------------------------------------------- reading options before choosing
/**
 * The options behind a pick list, with their text, for "Read them all" (filled when opened):
 * spec 'man|idx' (class maneuvers), 'list|idx|key' (class options), 'slot|key', 'pw|idx|field', 'arch|idx'.
 */
function bdBrowseOptions(m, spec) {
  const [kind, a, ...rest] = spec.split('|');
  const b = rest.join('|');
  const k = arr(m.raw.classes)[num(a)];
  if (kind === 'man') {
    const known = new Set(m.maneuverNames.map((x) => String(x).toLowerCase()));
    return rulesModule('maneuvers').filter((x) => !known.has(x.name.toLowerCase())).sort((x, y) => x.name.localeCompare(y.name))
      .map((x) => ({ name: x.name, note: [x.type, x.prerequisite ? `needs ${x.prerequisite}` : ''].filter(Boolean).join(' · '), text: x.description || '' }));
  }
  if (kind === 'list' && k) {
    const info = classChoiceInfo(m, k);
    const l = info && info.lists.find((x) => x.key === b);
    if (!l) return [];
    const chosen = l.chosen.map((p) => p.name);
    return l.options.filter((o) => o.repeatable || !chosen.includes(o.name)).map((o) => ({ name: o.name, note: [o.minLevel > info.level ? `${ordinal(o.minLevel)} level` : '', o.prerequisite ? `needs ${o.prerequisite}` : '', o.source !== k.name ? o.source : ''].filter(Boolean).join(' · '), text: o.text || '', disabled: o.minLevel > info.level }));
  }
  if (kind === 'slot') {
    const key = [a, ...rest].join('|');
    const s = (choiceInfo(m) || { slots: [] }).slots.find((x) => x.key === key);
    if (!s) return [];
    const chosen = new Set(s.picks.map((p) => p.name));
    return s.options.filter((o) => !chosen.has(o.name)).map((o) => ({ name: o.name, note: o.prerequisite ? `needs ${o.prerequisite}` : '', text: o.text || o.description || '' }));
  }
  if (kind === 'pw' && k) {
    const c = pwClassCasting(k, bdModules()).find((x) => x.field === b);
    if (!c) return [];
    const T = c.type === 'force' ? 'Force' : 'Tech';
    const learned = new Set(['force', 'tech'].flatMap((kd) => knownPowers(m, kd).map((x) => x.name.toLowerCase())));
    return rulesModule('powers').filter((p) => p.powerType === T && num(p.level) <= c.maxLevel && !learned.has(p.name.toLowerCase()))
      .sort((x, y) => num(x.level) - num(y.level) || x.name.localeCompare(y.name))
      .map((p) => ({ name: p.name, note: [num(p.level) ? `${ordinal(num(p.level))} level` : 'at-will', p.forceAlignment && p.forceAlignment !== 'None' ? p.forceAlignment : '', p.concentration ? 'concentration' : '', p.prerequisite ? `needs ${p.prerequisite}` : ''].filter(Boolean).join(' · '), text: p.description || '' }));
  }
  if (kind === 'arch' && k) {
    return arr(bdModules().archetypes).filter((x) => x.className === k.name).sort((x, y) => OLD_RULES.test(x.name) - OLD_RULES.test(y.name) || x.name.localeCompare(y.name))
      .map((x) => ({ name: x.name, note: OLD_RULES.test(x.name) ? 'older rules' : '', text: String(x.text || '').split(/\n#{2,3} /)[0] }));
  }
  return [];
}
/** A collapsed "Read them all" list under a pick list (its content is drawn when it's opened). */
const bdBrowse = (spec, n) => `<details class="bd-browse" data-browse="${esc(spec)}"><summary>Read the options${n != null ? ` (${n})` : ''}</summary><div class="bd-browse-list"></div></details>`;
function bdFillBrowse(d) {
  const snap = state.snapshots[state.current];
  if (!snap || !d.open) return;
  const list = bdBrowseOptions(buildModel(snap), d.dataset.browse);
  d.querySelector('.bd-browse-list').innerHTML = list.map((o) => `<div class="bd-opt"><div class="bd-opt-head"><b>${esc(o.name)}</b>${o.note ? ` <span class="faint">${esc(o.note)}</span>` : ''}
      <button class="btn sm" data-act="browse-add" data-arg="${esc(`${d.dataset.browse}|${o.name}`)}"${o.disabled ? ' disabled' : ''}>Choose</button></div>
      <div class="desc">${md(o.text)}</div></div>`).join('') || '<p class="faint">Nothing left to choose.</p>';
}
document.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('details[data-browse]') && e.target.open) bdFillBrowse(e.target); }, true);
function bdBrowseAdd(arg) {
  const parts = String(arg).split('|');
  const name = parts.pop();
  const [kind, a, ...rest] = parts;
  if (kind === 'man') return addClassChoice(`${a}|__maneuvers`, name);
  if (kind === 'list') return addClassChoice(`${a}|${rest.join('|')}`, name);
  if (kind === 'slot') return addSlotPick([a, ...rest].join('|'), name);
  if (kind === 'pw') return addClassPower(`${a}|${rest.join('|')}`, name);
  if (kind === 'arch') return setArchetype(a, name);
  return undefined;
}

// ------------------------------------------------------------- personality: pick or roll from the background
function bdCharacteristicHelper(m, key) {
  const list = bdCharList(m, key);
  if (!list.length) return '';
  return `<span class="ed-pick"><select data-edpick="${esc(key)}" aria-label="Pick from the background's list"><option value="">Pick from ${esc((m.raw.background || {}).name)}…</option>${list.map((x) => `<option value="${esc(x.text)}">${x.roll}. ${esc(x.text.slice(0, 80))}</option>`).join('')}</select>
    <button class="btn sm" type="button" data-act="ed-roll" data-arg="${esc(key)}">Roll d${list.length}</button></span>`;
}
function bdCharList(m, key) {
  const ch = prCharacteristics(arr(bdModules().backgrounds).find((b) => b.name === (m.raw.background || {}).name));
  return ({ 'Personality Traits': ch.traits, Ideal: ch.ideals, Bond: ch.bonds, Flaw: ch.flaws })[key] || [];
}
function bdPutCharacteristic(key, text) {
  const el = document.querySelector(`form.editor [data-field="characteristics.${CSS.escape(key)}"]`);
  if (!el || !text) return;
  el.value = key === 'Personality Traits' && el.value.trim() && !el.value.includes(text) ? `${el.value.trim()} ${text}` : text;
  if (state.editing) state.editing.draft[`characteristics.${key}`] = el.value;
}
document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.edpick && e.target.value) { bdPutCharacteristic(e.target.dataset.edpick, e.target.value); e.target.value = ''; }
});

/** Actions from builder controls (the viewer's handleAction passes the ones it doesn't know). */
function builderAction(act, arg) {
  if (/^cr-/.test(act)) return bdCreateAction(act, arg);
  if (act === 'browse-add') return bdBrowseAdd(arg);
  if (act === 'ed-roll') {
    const snap = state.snapshots[state.current];
    const list = snap ? bdCharList(buildModel(snap), arg) : [];
    if (list.length) bdPutCharacteristic(arg, list[rollDie(list.length) - 1].text);
    return undefined;
  }
  if (act === 'lvl-open') return bdLevelUpOpen();
  if (act === 'lvl-cancel') { state.levelUp = null; return renderAll(); }
  if (act === 'lvl-apply') return bdLevelUpApply();
  if (act === 'lvl-roll' && state.levelUp) {
    const ref = bdClassRef(state.levelUp.cls);
    if (ref) { state.levelUp.hp = String(rollDie(num(ref.hitDiceDieType))); renderAll(); }
    return undefined;
  }
  if (act === 'pick-remove') {
    const [kind, ...rest] = String(arg).split('|');
    const name = rest.pop();
    return /^cr/.test(kind) ? bdCreatePick(kind, rest.join('|'), name, false) : bdSetPick(kind, rest.join('|'), name, false);
  }
  return undefined;
}
/** A pick list's choice (from the viewer's pick-list handling). */
function builderPick(spec, value) {
  const [kind, ...rest] = String(spec).split('|');
  return /^cr/.test(kind) ? bdCreatePick(kind, rest.join('|'), value, true) : bdSetPick(kind, rest.join('|'), value, true);
}
