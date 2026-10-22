// Keyboard shortcuts (desktop): Shift + a key, only while nothing is being typed (not in a text box, a list or an
// editable area), and never with Ctrl, Alt or ⌘ (those belong to the browser).
//   Shift + 1 … 0, Q … P   go to a section: each section has its own key (SECTIONS' `key` in viewer.js), the same
//                           for every character; a section the character doesn't have just says so
//   Shift + A … L, Z        actions (SHORTCUT_ACTIONS below; add one there and it shows in the "?" list too)
//   ?                       the list of shortcuts
// Keys are read from KeyboardEvent.code (the key's place on the keyboard), so they work whatever the layout and
// whatever symbol Shift gives on it. Holding Shift for a moment shows each section's key in the section list.
'use strict';

/** Whether `el` takes typing (then Shift + a letter is a capital letter, not a shortcut). */
function typingIn(el) {
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/i.test(el.type || '');
}

/** Go to a section by its id ("combat"): the app's own jump, with the filter cleared if it hides the section. */
function goToSection(id) {
  const sec = document.getElementById('sec-' + id);
  const def = SECTIONS.find((s) => s.id === id);
  if (!sec) {
    setStatus(`${def ? def.title : 'That section'}: not on this character's sheet.`);
    return null;
  }
  if (sec.classList.contains('hidden-by-filter') && state.filter) {
    state.filter = '';
    const fb = document.getElementById('filterBox');
    if (fb) fb.value = '';
    applyFilter('');
  }
  jumpToSection(sec.id);
  return sec;
}
/** Focus `sel` inside a section after jumping there, opening its card if it's closed; false when it isn't there. */
function focusIn(id, sel) {
  const sec = goToSection(id);
  const el = sec && sec.querySelector(sel);
  if (!el) return false;
  const card = el.closest('.card');
  if (card && !el.offsetParent && typeof toggleCard === 'function') toggleCard(card);
  el.focus({ preventScroll: true });
  // Keep it in view (a long section may put it below the window).
  const r = el.getBoundingClientRect();
  if (r.bottom > window.innerHeight - 20 || r.top < pinnedBottom()) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  return true;
}
const currentSnap = () => state.snapshots[state.current] || null;
const needChar = () => { if (currentSnap()) return true; setStatus('Pick or load a character first.'); return false; };

/** The dice dock: open it with the cursor in its "e.g. 2d6+3" box, or close it as Escape does. */
function toggleDiceKey() {
  if (rollState.open) {
    rollState.open = false;
    renderDice(false);
    if (typeof returnFocus === 'function') returnFocus();
    return;
  }
  rollState.open = true;
  renderDice(true);
  const box = document.querySelector('#dice form[data-rl-free] input[name=expr]');
  if (box) box.focus({ preventScroll: true });
}

// [code, label, what it does]. `run` gets the event; it returns nothing.
const SHORTCUT_ACTIONS = [
  ['KeyD', 'Dice roller', 'Open the dice (the cursor is in the box for typing dice) or close them', toggleDiceKey],
  ['KeyH', 'Hit points', 'Combat & Vitals, in the amount box: type, then Enter for damage or Shift + Enter to heal (at 0 HP: the death save)', () => {
    if (!needChar()) return;
    const snap = currentSnap();
    const m = snap.complete ? buildModel(snap) : null;
    const dying = m && m.t && !m.t.hpCurrent;
    if (!focusIn('combat', dying ? '[data-roll="death"]' : '#trackAmount') && !dying) setStatus('No hit points to track for this character yet.');
  }],
  ['KeyS', 'Rest', 'Combat & Vitals, on Short rest (Tab to Long rest); Enter takes it', () => { if (needChar()) focusIn('combat', '[data-track="short"]'); }],
  ['KeyK', 'Conditions', 'Combat & Vitals, in the list of conditions to add', () => { if (needChar() && !focusIn('combat', 'select[data-cond-add]')) setStatus('No conditions list on this sheet.'); }],
  ['KeyG', 'Initiative', 'Roll initiative ("Go")', () => { if (needChar()) startRoll('init'); }],
  ['KeyJ', 'Next round', 'Next combat round (ends what has run out), or Start combat', () => {
    if (!needChar()) return;
    const st = state.itemState[state.current];
    handleAction(st && st.combat ? 'round-next' : 'round-start');
  }],
  ['KeyF', 'Effect received', 'Add an effect someone gave you (a stim, a power)', () => {
    if (!needChar()) return;
    const el = document.querySelector('input[data-eff="name"]');
    if (!el) { setStatus('No effects box on this sheet.'); return; }
    const card = el.closest('.card');
    if (card && !el.offsetParent && typeof toggleCard === 'function') toggleCard(card);
    (card || el).scrollIntoView({ block: 'center', behavior: 'instant' });
    el.focus({ preventScroll: true });
  }],
  ['KeyA', 'Add an item', 'Equipment & Inventory, in the item name box', () => { if (needChar() && !focusIn('equipment', 'input[data-add="name"]')) setStatus('No Add an item box on this sheet.'); }],
  ['KeyL', 'Level up', 'Open Level up (Classes & Progression)', () => {
    if (!needChar()) return;
    const snap = currentSnap();
    const raw = withEdits(snap.raw, editedFields(snap.key));
    if (!state.rules) setStatus("Level up needs SW5E's rules data, which hasn't loaded yet.");
    else if (bdTotalLevel(raw) >= 20) setStatus('Level 20 already: there is no level to add.');
    else handleAction('lvl-open');
  }],
  ['KeyZ', 'Undo', 'Undo the last change to hit points, uses or a rest', () => {
    if (!needChar()) return;
    if (state.undo && state.undo.key === state.current) trackerAction('undo', '');
    else setStatus('Nothing to undo.');
  }],
];
const keyLabel = (code) => code.replace(/^(Digit|Key)/, '');

/** "?": every shortcut, in the same pop-up as the guide and the theme. */
function showShortcuts() {
  let pop = document.getElementById('msgLog');
  const was = pop && pop.dataset.kind;
  if (pop) pop.remove();
  if (was === 'shortcuts') return;
  pop = document.createElement('div');
  pop.id = 'msgLog';
  pop.dataset.kind = 'shortcuts';
  pop.className = 'msg-log guide keys-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Keyboard shortcuts');
  const here = new Set([...document.querySelectorAll('#sheet .section')].map((s) => s.id.replace(/^sec-/, '')));
  const k = (code) => `<span class="keys"><kbd>Shift</kbd> <kbd>${esc(keyLabel(code))}</kbd></span>`;
  let group = null;
  const secRows = SECTIONS.map((s) => {
    const head = s.group !== group ? `<li class="keys-group">${esc(SECTION_GROUPS[s.group] || '')}</li>` : '';
    group = s.group;
    return `${head}<li class="${here.has(s.id) ? '' : 'faint'}">${k(s.key)}<span>${uiIcon(s.id)}${esc(s.title)}</span></li>`;
  }).join('');
  pop.innerHTML = `<div class="msg-head"><b>Keyboard shortcuts</b><button class="btn sm" data-act="shortcuts" aria-label="Close">✕</button></div>
    <p class="faint">While you're not typing in a box. The keys are the same on any keyboard layout (they're the keys' places on a QWERTY keyboard).</p>
    <div class="keys-cols">
      <div><h4>Go to a section</h4><ul class="keys-list">${secRows}</ul></div>
      <div><h4>Actions</h4><ul class="keys-list">${SHORTCUT_ACTIONS.map(([code, label, what]) => `<li>${k(code)}<span><b>${esc(label)}</b><br><small class="faint">${esc(what)}</small></span></li>`).join('')}</ul>
        <h4>Also</h4><ul class="keys-list">
          <li><span class="keys"><kbd>?</kbd></span><span>This list</span></li>
          <li><span class="keys"><kbd>/</kbd></span><span>Filter the sheet</span></li>
          <li><span class="keys"><kbd>Enter</kbd></span><span>In the hit point amount box: Damage (<kbd>Shift</kbd> <kbd>Enter</kbd>: Heal)</span></li>
          <li><span class="keys"><kbd>Shift</kbd> + click</span><span>Roll a number straight away</span></li>
          <li><span class="keys"><kbd>Esc</kbd></span><span>Close the dice, a menu or this list</span></li>
        </ul></div>
    </div>`;
  document.body.appendChild(pop);
  const close = pop.querySelector('[data-act="shortcuts"]');
  if (close) close.focus({ preventScroll: true });
}

if (typeof document !== 'undefined' && document.addEventListener) {
  let shiftTimer = 0;
  const showKeys = (on) => {
    clearTimeout(shiftTimer);
    if (document.documentElement) document.documentElement.classList.toggle('keys-shown', on);
  };
  document.addEventListener('keydown', (e) => {
    // Holding Shift (and nothing else) for a moment shows the section keys beside the section list.
    if (e.key === 'Shift' && !e.repeat && !typingIn(e.target)) { clearTimeout(shiftTimer); shiftTimer = setTimeout(() => showKeys(true), 450); return; }
    if (e.key !== 'Shift') clearTimeout(shiftTimer);
    if (e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented || typingIn(e.target)) return;
    if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) { e.preventDefault(); showShortcuts(); return; }
    if (e.key === 'Escape') {
      const pop = document.getElementById('msgLog');
      if (pop && pop.dataset.kind === 'shortcuts') pop.remove();
      return;
    }
    if (!e.shiftKey) return;
    const sec = SECTIONS.find((s) => s.key === e.code);
    if (sec) {
      e.preventDefault();
      if (needChar()) goToSection(sec.id);
      return;
    }
    const act = SHORTCUT_ACTIONS.find(([code]) => code === e.code);
    if (act) { e.preventDefault(); act[3](e); }
  });
  document.addEventListener('keyup', (e) => { if (e.key === 'Shift') showKeys(false); });
  window.addEventListener('blur', () => showKeys(false));
  // The hit point amount box: Enter takes it as damage, Shift + Enter heals.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target || e.target.id !== 'trackAmount' || e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    if (String(e.target.value).trim() === '') return;
    trackerAction(e.shiftKey ? 'heal' : 'damage', '');
  });
}
