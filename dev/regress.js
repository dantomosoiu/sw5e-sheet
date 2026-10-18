/* Regression check: draws each recorded test character with the viewer's own code (in Node, see dev/headless.js)
 * and compares what the sheet shows with what it showed when the case was accepted.
 *
 *   node dev/regress.js [names…]            compare (exit code 1 when something changed)
 *   node dev/regress.js --update [names…]   accept the current output as expected
 *   node dev/regress.js record [file]       make the cases from a recording (default dev/dumps/regress-state.json,
 *                                           written by dev/regress-record.js in the dev page)
 *   options: --full (print whole diffs, not the first lines of each part), --out=<dir> (write the actual output there)
 *
 * Each case (dev/regress/cases/<name>.json) is one character's stored data: SW5E's copy, the edits, play state,
 * effects and SW5E's calculation of it. Its expected output (dev/regress/expected/<name>.txt) has:
 *   - what the sheet sends to SW5E's engine (tweaks from effects and features), and whether the recorded
 *     calculation still matches it: when it doesn't, the numbers can't be checked until the case is recorded again;
 *   - the numbers SW5E's engine gave (AC, HP, saves, skills, attacks, casting…);
 *   - every roll the sheet offers (to-hit, damage, critical damage, saves, skills…) as the dice card shows it;
 *   - the text of every section of the sheet, with the hover explanation of each changed number.
 * Needs SW5E's rules and item data in dev/dumps/rules.json and catalog.json (git-ignored; recording writes them).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadSheet } = require('./headless');

const DEV = __dirname;
const CASES = path.join(DEV, 'regress', 'cases');
const EXPECTED = path.join(DEV, 'regress', 'expected');
const DUMPS = path.join(DEV, 'dumps');

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const arr = (x) => (Array.isArray(x) ? x : []);

// ------------------------------------------------------------- recording → cases
const GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Account details that must not end up in a case.
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;

/** The cases from a recording: one per character, with sw5e.com ids and the account id replaced by made-up ones. */
function makeCases(file) {
  const rec = readJson(file);
  const st = rec.storage;
  fs.mkdirSync(CASES, { recursive: true });
  const written = [];
  rec.keys.forEach((key, n) => {
    const snap = st.snapshots[key];
    if (!snap) return;
    const name = snap.raw.name || `Character ${n + 1}`;
    const only = (o) => (o && key in o ? { [key]: o[key] } : {});
    const storage = {
      snapshots: only(st.snapshots), derived: only(st.derived), edits: only(st.edits), itemState: only(st.itemState),
      trackers: only(st.trackers),
      // The last few versions are enough for the history card.
      history: st.history && st.history[key] ? { [key]: st.history[key].slice(-3) } : {},
      rolls: (st.rolls || []).filter((r) => r.key === key).slice(-15),
      rollSettings: st.rollSettings, rulesInfo: st.rulesInfo, catalogInfo: st.catalogInfo,
      backupInfo: st.backupInfo ? { count: st.backupInfo.count, characters: only(st.backupInfo.characters) } : null,
      lastCharacter: key,
    };
    let text = JSON.stringify(storage);
    // Ids the account gave: the character's own, the account's (userId), older copies' in the history.
    const ids = new Set();
    const collect = (raw) => { if (raw && raw.id) ids.add(raw.id); if (raw && raw.userId) ids.add(raw.userId); };
    collect(snap.raw);
    for (const h of storage.history[key] || []) collect(h.raw);
    for (const d of Object.values(storage.derived)) for (const x of [d.complete, d.base]) collect(x);
    let i = 0;
    for (const id of ids) {
      const fake = `00000000-0000-4000-8000-${String(n + 1).padStart(6, '0')}${String(++i).padStart(6, '0')}`;
      text = text.split(id).join(fake);
    }
    const data = JSON.parse(text);
    // SW5E's "user" field (the account's display name), wherever it is.
    const scrub = (o) => {
      if (!o || typeof o !== 'object') return;
      if (!Array.isArray(o) && typeof o.user === 'string') o.user = '';
      for (const v of Object.values(o)) scrub(v);
    };
    scrub(data);
    const out = JSON.stringify(data);
    const mail = EMAIL.exec(out);
    if (mail) throw new Error(`${name}: the recording holds what looks like an e-mail address (${mail[0].replace(/^.*@/, '…@')}); not written`);
    const left = [...new Set(out.match(GUID) || [])].filter((g) => !g.startsWith('00000000-0000-4000-8000-'));
    const caseFile = path.join(CASES, `${slug(name)}.json`);
    fs.writeFileSync(caseFile, JSON.stringify({
      format: 'sw5e-sheet-regress-case', name, key: Object.keys(data.snapshots)[0], recordedAt: rec.recordedAt,
      rules: st.rulesInfo, catalog: st.catalogInfo, storage: data,
    }, null, 1) + '\n');
    written.push({ name, file: caseFile, otherIds: left.length });
  });
  return { written, failed: rec.failed || [] };
}

// ------------------------------------------------------------- HTML → text
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–', times: '×', hellip: '…', rarr: '→', larr: '←', minus: '−', bull: '•', deg: '°', frac12: '½' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (all, e) => (e[0] === '#'
  ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  : ENTITIES[e.toLowerCase()] != null ? ENTITIES[e.toLowerCase()] : all));
const BLOCK = new Set('address article aside blockquote br dd details dialog div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section summary table tbody thead tfoot tr ul'.split(' '));
const SKIP = new Set(['script', 'style', 'template', 'svg']);
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'wbr', 'col', 'source']);
const attrsOf = (s) => {
  const out = {};
  for (const x of s.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) out[x[1].toLowerCase()] = decode(x[2] ?? x[3] ?? x[4] ?? '');
  return out;
};
const clip = (t) => (t.length > 220 ? `${t.slice(0, 160)}… [${t.length} chars #${hash(t)}]` : t);

/**
 * The text a player reads, one line per block; form controls as [value], checkboxes [x]/[ ], selects [choice ▾],
 * buttons [label]. `hover(attrs)` gives extra lines for an element (the explanation shown on hover).
 * Collects the roll specs (data-roll) into `rolls`.
 */
function htmlToLines(html, { hover = () => [], rolls = new Set() } = {}) {
  const lines = [];
  let cur = '';
  let pending = [];
  let skip = 0;
  let select = null; let option = null; let textarea = null;
  // Inline elements next to each other ("2,700 XP" + "level 5 at…") read as separate words.
  let soft = false;
  const add = (t) => {
    if (soft && /[\w)%]$/.test(cur) && /^[\w(]/.test(t)) cur += ' ';
    soft = false;
    cur += t;
  };
  const flush = () => {
    const t = cur.replace(/\s+/g, ' ').trim();
    if (t) lines.push(clip(t));
    cur = '';
    for (const p of pending) lines.push(`  ↳ ${clip(p)}`);
    pending = [];
  };
  const stack = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)|</g;
  let x;
  while ((x = re.exec(html))) {
    if (x[0].startsWith('<!--')) continue;
    if (x[4] != null || x[0] === '<') {
      const t = decode(x[4] != null ? x[4] : '<');
      if (skip) continue;
      if (option) option.text += t;
      else if (textarea) textarea.text += t;
      else add(t);
      continue;
    }
    const close = x[1] === '/';
    const tag = x[2].toLowerCase();
    if (close) {
      if (SKIP.has(tag)) { skip = Math.max(0, skip - 1); continue; }
      if (skip) continue;
      const open = stack.lastIndexOf(tag);
      if (open >= 0) stack.splice(open);
      if (tag === 'option' && option && select) { select.options.push(option); option = null; continue; }
      if (tag === 'select' && select) {
        const pick = select.options.find((o) => o.selected) || select.options[0];
        cur += ` [${pick ? pick.text.replace(/\s+/g, ' ').trim() : ''} ▾] `;
        select = null;
        continue;
      }
      if (tag === 'textarea' && textarea) { cur += ` [${textarea.text.replace(/\s+/g, ' ').trim()}] `; textarea = null; continue; }
      if (tag === 'button') { cur += '] '; continue; }
      if (tag === 'td' || tag === 'th') { cur += ' |'; continue; }
      if (BLOCK.has(tag)) flush();
      else soft = true;
      continue;
    }
    if (SKIP.has(tag)) { if (!/\/\s*$/.test(x[3])) skip++; continue; }
    if (skip) continue;
    const a = attrsOf(x[3] || '');
    if (!VOID.has(tag) && !/\/\s*$/.test(x[3])) stack.push(tag);
    if (a['data-roll']) rolls.add(a['data-roll']);
    if (tag === 'select') { select = { options: [] }; continue; }
    if (tag === 'option') { option = { text: '', selected: 'selected' in a }; continue; }
    if (tag === 'textarea') { textarea = { text: '' }; continue; }
    if (BLOCK.has(tag)) flush();
    if (tag === 'td' || tag === 'th') cur += ' ';
    if (tag === 'input') {
      if (a.type === 'hidden') continue;
      cur += a.type === 'checkbox' || a.type === 'radio' ? ` [${'checked' in a ? 'x' : ' '}] ` : ` [${a.value || ''}] `;
    } else if (tag === 'button') cur += ' [';
    else if (tag === 'img' && a.alt) cur += ` ${a.alt} `;
    if (/\bpip\b/.test(a.class || '') && a.title) cur += ` (${a.title}) `;
    pending.push(...hover(a));
  }
  flush();
  return lines;
}

// ------------------------------------------------------------- one character's report
const scalar = (v) => v == null || ['string', 'number', 'boolean'].includes(typeof v);
const show = (v) => (typeof v === 'string' ? JSON.stringify(v.length > 120 ? `${v.slice(0, 100)}…#${hash(v)}` : v) : String(v));
/** path = value lines for the scalar leaves of `o` (arrays of named things by name), skipping keys in `skip`. */
function flatten(o, prefix, out, skip = () => false) {
  if (scalar(o)) { out.push(`${prefix} = ${show(o)}`); return out; }
  if (Array.isArray(o)) {
    if (o.every(scalar)) { out.push(`${prefix} = [${o.map(show).join(', ')}]`); return out; }
    const seen = {};
    o.forEach((v, i) => {
      const nm = v && typeof v === 'object' && typeof v.name === 'string' ? v.name : null;
      const k = nm == null ? String(i) : seen[nm] ? `${nm}#${++seen[nm]}` : ((seen[nm] = 1), nm);
      flatten(v, `${prefix}[${k}]`, out, skip);
    });
    return out;
  }
  const named = /\]$/.test(prefix) && typeof o.name === 'string';
  for (const k of Object.keys(o).sort()) if (!skip(k) && !(named && k === 'name')) flatten(o[k], prefix ? `${prefix}.${k}` : k, out, skip);
  return out;
}
// The computed sheet's numbers and lists (not the text of features and items, which the sections show).
const NUMBER_FIELDS = ['currentLevel', 'classText', 'proficiencyBonus', 'initiative', 'armorClass', 'armorList', 'passivePerception', 'vision',
  'speed', 'hitPoints', 'abilityScores', 'weapons', 'attunement', 'carryingCapacity', 'superiority', 'techCasting', 'forceCasting',
  'proficiencies', 'skillAndSaveProficiencies', 'languages', 'experiencePoints', 'conditions', 'exhaustion'];
// Text, play state (shown in the sections) and SW5E's storage details (eTag, timestamp, enum codes…).
const NUMBER_SKIP_KEYS = new Set(['description', 'text', 'content', 'propertiesMap', 'powersKnown', 'allForcePowers', 'cost', 'weight',
  'current', 'temporary', 'deathSaves', 'resting', 'errorMessage', 'eTag', 'timestamp', 'partitionKey', 'rowKey', 'contentSource',
  'contentType', 'isFound', 'modes', 'ac', 'armorClassification', 'stealthDisadvantage', 'strengthRequirement', 'equipmentCategory']);
const NUMBER_SKIP = (k) => NUMBER_SKIP_KEYS.has(k) || /Enum$|Json$/.test(k);

/** A roll as the dice card sets it up: dice, the bonus by source, options to tick, critical range, warnings. */
function rollLine(r) {
  const sgn = (v) => (num(v) < 0 ? `−${Math.abs(num(v))}` : `+${num(v)}`);
  const dice = arr(r.dice).map((d) => `${d.sign < 0 ? '−' : ''}d${d.sides}${d.tag && !['base', 'd20'].includes(d.tag) ? `(${d.tag})` : ''}`).join(' ');
  const total = arr(r.base).reduce((t, b) => t + num(b.value), 0);
  const bits = [`${r.label}: ${dice || 'no dice'} ${sgn(total)}`];
  if (arr(r.base).length) bits.push(`= ${arr(r.base).map((b) => `${sgn(b.value)} ${b.label}`).join(' ')}`);
  if (r.damageType) bits.push(r.damageType);
  if (r.mode && r.mode !== 'normal') bits.push(`mode ${r.mode}`);
  if (r.preset) bits.push(r.preset);
  if (r.autoFail) bits.push(`fails automatically: ${r.autoFail}`);
  if (r.critMin != null && r.critMin < 20) bits.push(`critical on ${r.critMin}–20 (${r.critFrom})`);
  if (r.crit) bits.push('critical');
  for (const c of arr(r.conds)) bits.push(`option${c.on ? ' (on)' : ''}: ${c.label}${num(c.bonus) ? ` ${sgn(c.bonus)}` : ''}${arr(c.extra).length ? ` +${arr(c.extra).join('+')}` : ''}${c.blocked ? ` (${c.blocked})` : ''}`);
  if (r.dmgAdv) bits.push(`damage advantage: ${r.dmgAdv}`);
  if (r.warn) bits.push(`warning: ${String(r.warn).replace(/<[^>]*>/g, '')}`);
  for (const n of arr(r.notes)) bits.push(`note: ${typeof n === 'string' ? n : JSON.stringify(n)}`);
  if (r.next && r.next.two) bits.push(`two-handed: ${r.next.two}`);
  return bits.join(' · ');
}
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function report(sheet, key) {
  const { get } = sheet;
  const state = get('state');
  state.current = key;
  const snap = state.snapshots[key];
  const m = get('buildModel')(snap);
  const L = [`# ${snap.raw.name}`];

  // What goes to SW5E's engine, and whether the recorded calculation is for exactly that.
  const needed = get('needsDerived')(key);
  const { fx } = get('derivedInputs')(key);
  const fresh = !needed || !!get('freshComputed')(key, fx.raw);
  L.push('', "## Sent to SW5E's engine");
  L.push(!needed ? 'Nothing to calculate (no changes or effects): SW5E\'s own numbers'
    : fresh ? 'The recorded calculation matches.'
      : 'OUT OF DATE: the sheet now sends something else than what was recorded, so the numbers below are the old ones. Check the tweaks here, then record the case again (dev/regress-record.js).');
  flatten(fx.raw.tweaks || {}, 'tweaks', L);
  arr(fx.raw.equipment).forEach((it, i) => { if (it && it.tweaks && Object.keys(it.tweaks).length) flatten(it.tweaks, `equipment[${i} ${it.name}].tweaks`, L); });
  if (fx.raw.equipment) L.push(`equipped = [${arr(fx.raw.equipment).filter((it) => it && it.equipped).map((it) => it.name).join(', ')}]`);

  L.push('', "## Numbers (SW5E's engine, with the sheet's edits)");
  for (const f of NUMBER_FIELDS) if (m.c[f] !== undefined) flatten(m.c[f], f, L, NUMBER_SKIP);
  for (const kind of ['force', 'tech']) {
    const k = m.c[`${kind}Casting`];
    if (k && typeof k === 'object') L.push(`${kind}Casting.powersKnown = [${arr(k.powersKnown).map((p) => p.name).join(', ')}]`);
  }

  L.push('', '## Effects and tweaks');
  for (const e of arr(m.effects)) L.push(`effect: ${e.name} · ${e.kind || ''}${e.group ? ` · ${e.group}` : ''}${e.duration ? ` · ${typeof e.duration === 'object' ? JSON.stringify(e.duration) : e.duration}` : ''}`);
  for (const t of arr(m.fx.tweaks)) L.push(`tweak: ${t.path} ${t.bonus >= 0 ? '+' : ''}${t.bonus}${t.fields ? ' ' + JSON.stringify(t.fields) : ''} · ${t.effect ? t.effect.name : ''}`);
  for (const t of arr(m.fx.weaponTweaks)) L.push(`weapon tweak: #${t.index} ${t.path} ${t.bonus >= 0 ? '+' : ''}${t.bonus} · ${t.effect ? t.effect.name : ''}`);
  for (const t of arr(m.fx.conds)) L.push(`only sometimes: ${t.path} ${t.bonus >= 0 ? '+' : ''}${t.bonus} ${t.cond || ''} · ${t.effect ? t.effect.name : ''}`);

  // The sheet as drawn, and the hover text of each number an effect changed.
  const rolls = new Set();
  const hover = (a) => {
    if (a['data-bump'] && a['data-to']) {
      const tip = get('bumpTip')(m, a['data-bump'], { from: a['data-from'], to: a['data-to'] });
      return [`hover ${a['data-bump']}: ${htmlToLines(tip).join(' / ')}`];
    }
    return [];
  };
  const sections = get('SECTIONS').filter((s) => s.when(m));
  const body = [];
  for (const s of sections) {
    body.push('', `## Sheet: ${s.title}`);
    let html;
    try { html = s.render(m); } catch (e) { body.push(`DRAWING FAILED: ${e.message}`); continue; }
    body.push(...htmlToLines(html, { hover, rolls }));
  }

  // Every roll the sheet offers, as the dice card shows it before rolling.
  L.push('', '## Rolls');
  const rollState = get('rollState');
  const specs = [...rolls];
  for (const spec of [...specs]) {
    if (/^attack\|/.test(spec)) {
      const i = spec.split('|')[1];
      for (const d of [`damage|${i}`, `damage|${i}|crit`]) if (!specs.includes(d)) specs.push(d);
    }
  }
  for (const spec of specs) {
    try {
      rollState.current = null;
      get('startRoll')(spec);
      const r = rollState.current;
      if (!r) { L.push(`${spec}: can't roll`); continue; }
      if (r.next && r.next.two && !specs.includes(`damage|${spec.split('|')[1]}||two`)) specs.push(`damage|${spec.split('|')[1]}||two`);
      L.push(`${spec}: ${rollLine(r)}`);
    } catch (e) {
      L.push(`${spec}: ROLL FAILED: ${e.message}`);
    } finally {
      rollState.current = null;
    }
  }
  return L.concat(body).join('\n') + '\n';
}
/** The report for one case file. */
async function runCase(file, data) {
  const c = readJson(file);
  const sheet = loadSheet({ storage: c.storage, now: c.recordedAt || Date.UTC(2026, 0, 1) });
  await sheet.ready;
  sheet.ctx.__rules = data.rules;
  sheet.ctx.__catalog = data.catalog;
  // Parsed inside the sheet's own context, as the extension would have them.
  sheet.get('state.rules = JSON.parse(__rules); setCatalog(JSON.parse(__catalog)); delete globalThis.__rules; delete globalThis.__catalog');
  await sheet.get('loadRollLog()');
  const text = report(sheet, c.key);
  return { name: c.name, text, errors: sheet.errors, info: c };
}

// ------------------------------------------------------------- comparing
/** Line diff (longest common subsequence): [{ op: ' ' | '-' | '+', line }]. */
function diffLines(a, b) {
  const n = a.length, mm = b.length;
  // Trim the common start and end first: the rest is usually small.
  let s = 0;
  while (s < n && s < mm && a[s] === b[s]) s++;
  let e = 0;
  while (e < n - s && e < mm - s && a[n - 1 - e] === b[mm - 1 - e]) e++;
  const A = a.slice(s, n - e), B = b.slice(s, mm - e);
  const W = B.length + 1;
  const dp = new Uint32Array((A.length + 1) * W);
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) {
    dp[i * W + j] = A[i] === B[j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
  }
  const out = a.slice(0, s).map((line) => ({ op: ' ', line }));
  let i = 0, j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) { out.push({ op: ' ', line: A[i] }); i++; j++; }
    else if (j < B.length && (i === A.length || dp[i * W + j + 1] >= dp[(i + 1) * W + j])) out.push({ op: '+', line: B[j++] });
    else out.push({ op: '-', line: A[i++] });
  }
  return out.concat(a.slice(n - e).map((line) => ({ op: ' ', line })));
}
/** The changed lines grouped by report part ("## …"), with the part's name; each old line next to its new one. */
function changesByPart(expected, actual) {
  const d = diffLines(expected.split('\n'), actual.split('\n'));
  const parts = [];
  let part = '';
  let last = null;
  let run = { '-': [], '+': [] };
  const flushRun = () => {
    const n = Math.max(run['-'].length, run['+'].length);
    for (let i = 0; i < n; i++) {
      if (i < run['-'].length) last.lines.push(`- ${run['-'][i]}`);
      if (i < run['+'].length) last.lines.push(`+ ${run['+'][i]}`);
    }
    run = { '-': [], '+': [] };
  };
  for (const x of d) {
    if (x.op === ' ') {
      if (last) flushRun();
      if (x.line.startsWith('## ')) part = x.line.slice(3);
      continue;
    }
    if (!last || last.part !== part) {
      if (last) flushRun();
      parts.push((last = { part, lines: [] }));
    }
    run[x.op].push(x.line);
  }
  if (last) flushRun();
  return parts;
}

// ------------------------------------------------------------- main
async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')).map((a) => a.split('=')[0]));
  const opt = (k) => { const a = args.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : null; };
  const names = args.filter((a) => !a.startsWith('--'));

  if (names[0] === 'record') {
    const file = names[1] || path.join(DUMPS, 'regress-state.json');
    const { written, failed } = makeCases(file);
    for (const w of written) console.log(`case: ${path.relative(process.cwd(), w.file)}${w.otherIds ? ` (${w.otherIds} other ids kept: SW5E content)` : ''}`);
    for (const f of failed) console.log(`not recalculated when recorded: ${f}`);
    console.log(`${written.length} cases written. Run \`node dev/regress.js\` to see what they change, then --update to accept.`);
    return 0;
  }

  for (const f of ['rules.json', 'catalog.json']) {
    if (!fs.existsSync(path.join(DUMPS, f))) {
      console.log(`Missing dev/dumps/${f}: SW5E's data isn't in the repo. Record it from the dev page (dev/regress-record.js).`);
      return 2;
    }
  }
  const data = { rules: fs.readFileSync(path.join(DUMPS, 'rules.json'), 'utf8'), catalog: fs.readFileSync(path.join(DUMPS, 'catalog.json'), 'utf8') };
  const rulesVersion = (() => { try { return JSON.parse(data.rules).dataVersion; } catch (e) { return null; } })();
  const files = (fs.existsSync(CASES) ? fs.readdirSync(CASES) : []).filter((f) => f.endsWith('.json')).sort()
    .filter((f) => !names.length || names.some((n) => f.includes(slug(n))));
  if (!files.length) { console.log('No cases (dev/regress/cases/). Record some first: see the top of dev/regress.js.'); return 2; }
  fs.mkdirSync(EXPECTED, { recursive: true });
  const outDir = opt('--out');
  if (outDir) fs.mkdirSync(outDir, { recursive: true });

  let changed = 0, stale = 0, added = 0;
  for (const f of files) {
    const r = await runCase(path.join(CASES, f), data);
    const exp = path.join(EXPECTED, f.replace(/\.json$/, '.txt'));
    if (outDir) fs.writeFileSync(path.join(outDir, path.basename(exp)), r.text);
    const outOfDate = /\nOUT OF DATE:/.test(r.text);
    if (outOfDate) stale++;
    const errs = r.errors.length ? ` · ${r.errors.length} console error(s): ${r.errors[0].slice(0, 120)}` : '';
    if (r.info.rules && rulesVersion != null && r.info.rules.dataVersion !== rulesVersion) console.log(`  (${r.name}: recorded with rules data ${r.info.rules.dataVersion}, now ${rulesVersion})`);
    if (flags.has('--update')) {
      fs.writeFileSync(exp, r.text);
      console.log(`accepted ${r.name}${outOfDate ? ' (OUT OF DATE: record it again)' : ''}${errs}`);
      continue;
    }
    if (!fs.existsSync(exp)) { added++; console.log(`new      ${r.name}: no expected output yet (--update to accept)${errs}`); continue; }
    const want = fs.readFileSync(exp, 'utf8');
    if (want === r.text) { console.log(`same     ${r.name}${outOfDate ? ' (OUT OF DATE: record it again)' : ''}${errs}`); continue; }
    changed++;
    const parts = changesByPart(want, r.text);
    console.log(`CHANGED  ${r.name}: ${parts.map((p) => `${p.part || 'start'} (${p.lines.length})`).join(', ')}${errs}`);
    for (const p of parts) {
      console.log(`  ${p.part || 'start'}:`);
      const show = flags.has('--full') ? p.lines : p.lines.slice(0, 12);
      for (const l of show) console.log(`    ${l}`);
      if (show.length < p.lines.length) console.log(`    … ${p.lines.length - show.length} more (--full)`);
    }
  }
  console.log(`\n${files.length} cases: ${changed} changed, ${added} new, ${files.length - changed - added} same${stale ? `; ${stale} out of date (record again)` : ''}.`);
  return changed ? 1 : 0;
}

if (require.main === module) main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 2; });
module.exports = { htmlToLines, diffLines, makeCases, report, flatten, NUMBER_FIELDS, NUMBER_SKIP };
