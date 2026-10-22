/*
 * Explanations for every way of using the sheet.
 *
 *   Mouse     hovering a changed number (dotted), a rule term (Finesse, Reach…) or any control that explains itself
 *             (a title) shows a tip; titles after a short pause, in the sheet's own style instead of the browser's.
 *   Keyboard  focusing one shows the same tip.
 *   Touch     pressing and holding anything that explains itself opens its explanation in a sheet, with the control's
 *             own action as a button; Explain mode (ⓘ, in the phone strip and More ▾) makes a single tap explain
 *             instead of act, and outlines what can be explained.
 *   Items     a click or tap on an item's picture opens its card: the picture large, its rarity and tier, facts, text.
 *
 * Nothing here changes what the sheet does; it only explains it. Loaded after viewer.js (bumpTip, propertyRule…).
 */
(function () {
  if (typeof document === 'undefined' || globalThis.SHEET_HEADLESS) return;

  // ------------------------------------------------------------- what an element explains
  const textOf = (el) => (el ? String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const short = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  /** What a changed number measures, from its path ("hitPoints.maximum" → "Hit point maximum"), else from the page. */
  function labelFor(el) {
    const path = el.dataset.bump || '';
    const snap = state.snapshots[state.current];
    const m = snap ? buildModel(snap) : null;
    let x;
    if ((x = /^abilityScores\.(\w+)\.skills\.(\d+)/.exec(path)) && m) return `${((((m.c.abilityScores || {})[x[1]] || {}).skills || [])[x[2]] || {}).name || 'Skill'} (${x[1]})`;
    if ((x = /^abilityScores\.(\w+)\.savingThrow/.exec(path))) return `${x[1]} saving throw`;
    if ((x = /^abilityScores\.(\w+)\.score/.exec(path))) return `${x[1]} score`;
    if ((x = /^abilityScores\.(\w+)/.exec(path))) return `${x[1]} modifier`;
    if ((x = /^weapons\.(\d+)\.(\w+)/.exec(path)) && m) {
      const w = arr(m.c.weapons)[x[1]] || {};
      return `${w.name || 'Weapon'} ${/attack/i.test(x[2]) ? 'to hit' : 'damage'}`;
    }
    const named = { 'hitPoints.maximum': 'Hit point maximum', armorClass: 'Armor Class', initiative: 'Initiative', speed: 'Speed',
      passivePerception: 'Passive Perception', proficiencyBonus: 'Proficiency bonus', carryingCapacity: 'Carrying capacity' }[path]
      || ({ techCasting: 'Tech casting', forceCasting: 'Force casting', hitPoints: 'Hit points', speed: 'Speed' })[path.split('.')[0]];
    if (named) return named;
    return labelFromPage(el);
  }
  /** The name of the number a changed value belongs to: its box's label, its row's first cell, its card's title. */
  function labelFromPage(el) {
    const mini = el.closest('.mini-stat');
    if (mini && mini.querySelector('span:last-child')) return textOf(mini.querySelector('span:last-child'));
    const stat = el.closest('.stat');
    if (stat && stat.querySelector('.label')) return textOf(stat.querySelector('.label'));
    const row = el.closest('tr');
    if (row && row.cells && row.cells[0] && !row.cells[0].contains(el)) return textOf(row.cells[0]).split(' · ')[0];
    const ab = el.closest('.ability');
    if (ab && ab.querySelector('.name, h3, b')) return textOf(ab.querySelector('.name, h3, b'));
    const card = el.closest('.card');
    if (card && card.querySelector('.card-head .title')) return textOf(card.querySelector('.card-head .title'));
    return '';
  }
  /** The control a press acts on: a button, link, roll or toggle (for the sheet's "do it" button). */
  const actionOf = (el) => el.closest('button:not([disabled]), a[href], [data-roll], [data-act], [data-inv], [data-rl], input[type="checkbox"], summary');
  const titled = (el) => el.closest('[title], [data-tip-title]');
  const titleText = (el) => el.getAttribute('title') || el.dataset.tipTitle || '';
  /** What there is to say about an element: { title, html, item? } or null. */
  function explain(target) {
    if (!target || !target.closest || target.closest('#infoSheet, .info-banner')) return null;
    const snap = state.snapshots[state.current];
    const tile = target.closest('.art-tile[data-item]');
    if (tile) return { item: tile.dataset.item, custom: tile.dataset.custom === '1', title: tile.dataset.item };
    const bump = target.closest('.bump');
    if (bump && snap) {
      const label = labelFor(bump);
      return { title: `${label ? label + ': ' : ''}${short(textOf(bump), 40)}`, html: bumpTip(buildModel(snap), bump.dataset.bump, { from: bump.dataset.from, to: bump.dataset.to }), source: bump };
    }
    const prop = target.closest('.prop-tip');
    if (prop) {
      const r = propertyRule(prop.dataset.prop, prop.dataset.kind);
      if (r) return { title: r.name, html: `<div class="tip-prop">${md(r.text)}</div>`, source: prop };
    }
    const t = titled(target);
    if (t && t !== document.body && titleText(t)) {
      const name = short(t.getAttribute('aria-label') || textOf(t) || '', 60);
      return { title: name || 'About this', html: `<p>${esc(titleText(t))}</p>`, source: t };
    }
    const roll = target.closest('[data-roll]');
    if (roll) return { title: roll.getAttribute('aria-label') || textOf(roll), html: '<p>Tap to roll it in the dice tray.</p>', source: roll };
    return null;
  }

  // ------------------------------------------------------------- the tip (mouse and keyboard)
  const tip = document.createElement('div');
  tip.id = 'bumpTip';
  tip.hidden = true;
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  function place(box, el) {
    const r = el.getBoundingClientRect();
    const w = box.offsetWidth;
    box.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + window.scrollX}px`;
    const below = r.bottom + box.offsetHeight + 12 < window.innerHeight;
    box.style.top = `${(below ? r.bottom + 6 : r.top - box.offsetHeight - 6) + window.scrollY}px`;
  }
  let shownFor = null;
  function showTip(el, x) {
    if (!x) return;
    tip.innerHTML = x.html ? `${x.source && x.source.classList.contains('bump') ? '' : `<div class="tip-head"><b>${esc(x.title)}</b></div>`}${x.html}` : '';
    if (!tip.innerHTML) return;
    tip.hidden = false;
    place(tip, el);
    shownFor = el;
  }
  function hideTip() { tip.hidden = true; shownFor = null; }
  // A title shows as the sheet's own tip after a pause; the browser's own is held back meanwhile (and put back after).
  let titleTimer = null;
  let parked = null;
  const park = (el) => { if (el.hasAttribute('title')) { el.dataset.tipTitle = el.getAttribute('title'); el.removeAttribute('title'); parked = el; } };
  const unpark = () => { if (parked && parked.dataset.tipTitle != null) { parked.setAttribute('title', parked.dataset.tipTitle); delete parked.dataset.tipTitle; } parked = null; };
  const coarse = () => window.matchMedia && window.matchMedia('(hover: none)').matches;
  document.addEventListener('mouseover', (e) => {
    if (coarse()) return;
    const quick = e.target.closest && e.target.closest('.bump, .prop-tip');
    if (quick) { clearTimeout(titleTimer); showTip(quick, explain(quick)); return; }
    const t = e.target.closest && titled(e.target);
    if (!t || t === shownFor || t.closest('#infoSheet')) return;
    clearTimeout(titleTimer);
    unpark();
    park(t);
    titleTimer = setTimeout(() => showTip(t, explain(t)), 380);
  });
  document.addEventListener('mouseout', (e) => {
    const from = e.target.closest && (e.target.closest('.bump, .prop-tip') || titled(e.target));
    if (!from || (e.relatedTarget && from.contains(e.relatedTarget))) return;
    clearTimeout(titleTimer);
    unpark();
    hideTip();
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!el.matches || coarse()) return;
    if (el.matches('.bump, .prop-tip')) { showTip(el, explain(el)); return; }
    // Titled controls reached with the keyboard (not clicked): after a pause, like hover.
    if (el.matches(':focus-visible') && el.hasAttribute('title')) {
      clearTimeout(titleTimer);
      titleTimer = setTimeout(() => { if (document.activeElement === el) showTip(el, explain(el)); }, 600);
    }
  });
  document.addEventListener('focusout', () => { clearTimeout(titleTimer); hideTip(); });
  window.addEventListener('scroll', () => { if (!tip.hidden) hideTip(); }, { passive: true });

  // ------------------------------------------------------------- the sheet (touch, Explain mode, item cards)
  const sheet = document.createElement('div');
  sheet.id = 'infoSheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'false');
  sheet.setAttribute('aria-labelledby', 'infoTitle');
  document.body.appendChild(sheet);
  const backdrop = document.createElement('div');
  backdrop.className = 'info-backdrop';
  backdrop.hidden = true;
  document.body.appendChild(backdrop);
  let pending = null; // the control the sheet's "do it" button presses
  let opener = null;

  /** An item's card: the picture large, what it is, its numbers and SW5E's text. */
  function itemCard(name, custom) {
    const snap = state.snapshots[state.current];
    const raw = snap ? withEdits(snap.raw, editedFields(snap.key)) : {};
    if (name === 'Unarmed Strike' && snap) {
      const m = buildModel(snap);
      const u = unarmedOf(m);
      const w = arr(m.c.weapons).find((x) => x.name === 'Unarmed Strike') || {};
      const how = { 'unarmed-fist': 'a fist', 'unarmed-martial': "a martial artist's strikes", 'unarmed-claws': 'claws', 'unarmed-bite': 'a bite',
        'unarmed-horns': 'horns or a headbutt', 'unarmed-tail': 'a tail', 'unarmed-stinger': 'a stinger', 'unarmed-droid': 'a metal fist' }[u.artIcon];
      return { head: itemTile(u, 'xl'), title: 'Unarmed Strike', sub: `${raw.species && raw.species.name ? raw.species.name + ': ' : ''}${how}`,
        facts: [['To hit', signed(w.attackBonus)], ['Damage', damageText(w)]].filter(([, v]) => v && v !== '+0' || v === 0), text: '' };
    }
    const own = arr(raw.customEquipment).find((x) => x.name === name);
    const ref = (!custom && catalogIndex && catalogIndex.get(name)) || own || { name };
    const mine = arr(raw.equipment).find((x) => x.name === name) || own;
    const a = itemArt({ ...ref, color: mine && mine.color });
    const kind = ref.equipmentCategory || ref.type ? itemKind(ref) : (custom ? 'Custom item' : '');
    const facts = [
      ref.damageNumberOfDice && ref.damageDieType ? ['Damage', damageText({ ...ref, damageBonus: 0 })] : null,
      ref.ac ? ['Armor class', String(ref.ac)] : null,
      arr(ref.properties).length ? ['Properties', { html: propsHtml(ref.properties, ref.equipmentCategory === 'Armor' ? 'armor' : 'weapon') }] : null,
      ref.weight ? ['Weight', `${ref.weight} lb`] : null,
      ref.cost ? ['Price', `${fmtNum(num(ref.cost))} cr`] : null,
      ref.requiresAttunement ? ['Attunement', 'required'] : null,
      a.tier ? ['Tier', `${a.tier} of 6`] : null,
      mine ? ['You have', `${qtyOf(mine)}${mine.equipped ? ', equipped' : ''}${mine.attuned ? ', attuned' : ''}`] : null,
    ].filter(Boolean);
    return { head: itemTile({ ...ref, color: mine && mine.color }, 'xl'), title: (mine && mine.label) || name, sub: kind, facts, text: ref.description || ref.text || '', rarity: a.rarity };
  }

  function openSheet(x, from) {
    hideTip();
    opener = from || document.activeElement;
    pending = x.source && actionOf(x.source) && !x.item ? actionOf(x.source) : null;
    let body;
    if (x.item) {
      const c = itemCard(x.item, x.custom);
      body = `<div class="info-item${c.rarity ? ` rar-${c.rarity}` : ''}">${c.head}<div><h2 id="infoTitle">${esc(c.title)}</h2>${c.sub ? `<div class="muted">${esc(c.sub)}</div>` : ''}${c.rarity ? `<span class="chip info-rar">${esc(c.rarity)}</span>` : ''}</div></div>
        ${c.facts.length ? `<dl class="info-facts">${c.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v && v.html ? v.html : esc(v)}</dd>`).join('')}</dl>` : ''}
        ${c.text ? `<div class="info-text desc">${md(c.text)}</div>` : ''}`;
    } else {
      body = `<h2 id="infoTitle">${esc(x.title)}</h2><div class="info-body">${x.html}</div>`;
    }
    const doLabel = pending ? short(pending.getAttribute('aria-label') || textOf(pending) || 'Do it', 40) : '';
    sheet.innerHTML = `<div class="info-grip" aria-hidden="true"></div>
      <button class="btn sm info-close" data-info="close" aria-label="Close">✕</button>
      ${body}
      ${pending ? `<div class="info-actions"><button class="btn primary" data-info="do">${esc(doLabel)}</button><button class="btn" data-info="close">Close</button></div>` : ''}`;
    sheet.hidden = false;
    backdrop.hidden = false;
    document.documentElement.classList.add('info-open');
    // Phones: a sheet from the bottom. Wider screens: a card next to what it explains.
    const wide = window.matchMedia('(min-width: 701px)').matches;
    sheet.classList.toggle('docked', !wide);
    if (wide && from) place(sheet, from); else { sheet.style.left = ''; sheet.style.top = ''; }
    requestAnimationFrame(() => sheet.classList.add('in'));
    const first = sheet.querySelector('[data-info="do"], .info-close');
    if (first) first.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('in');
    sheet.hidden = true;
    backdrop.hidden = true;
    document.documentElement.classList.remove('info-open');
    if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true });
    opener = null;
  }
  sheet.addEventListener('click', (e) => {
    const b = e.target.closest('[data-info]');
    if (!b) return;
    if (b.dataset.info === 'do' && pending) {
      const target = pending;
      closeSheet();
      suppressUntil = 0;
      explainSkip = true; // the press goes through, even in Explain mode
      target.click();
      explainSkip = false;
      return;
    }
    closeSheet();
  });
  backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) { closeSheet(); e.stopPropagation(); }
    if (e.key === 'Escape' && explainOn()) setExplain(false);
  }, true);
  // Swipe a docked sheet down to close it.
  let swipe = null;
  sheet.addEventListener('touchstart', (e) => { if (sheet.classList.contains('docked') && sheet.scrollTop <= 0) swipe = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (swipe == null) return;
    const dy = e.touches[0].clientY - swipe;
    sheet.style.transform = dy > 0 ? `translateY(${dy}px)` : '';
  }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (swipe == null) return;
    const dy = (e.changedTouches[0] || {}).clientY - swipe;
    swipe = null;
    sheet.style.transform = '';
    if (dy > 80) closeSheet();
  });

  // Item pictures: a click, tap or Enter opens the item's card.
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('.art-tile[data-item]');
    if (!t || t.closest('#infoSheet') || explainOn()) return;
    e.preventDefault();
    e.stopPropagation();
    openSheet(explain(t), t);
  }, true);
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('.art-tile[data-item]')) { e.preventDefault(); openSheet(explain(t), t); }
  });

  // ------------------------------------------------------------- press and hold
  let hold = null;
  let suppressUntil = 0;
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    const x = explain(e.target);
    if (!x) return;
    const at = { x: e.clientX, y: e.clientY };
    clearTimeout(hold && hold.timer);
    hold = { at, el: e.target, timer: setTimeout(() => {
      hold = null;
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* not allowed */ } }
      suppressUntil = Date.now() + 900; // the click that ends the press doesn't act
      openSheet(explain(e.target) || x, e.target.closest('.bump, .prop-tip, [title], [data-tip-title], [data-roll], .art-tile') || e.target);
    }, 460) };
  }, { passive: true });
  const cancelHold = () => { if (hold) { clearTimeout(hold.timer); hold = null; } };
  document.addEventListener('pointermove', (e) => { if (hold && Math.hypot(e.clientX - hold.at.x, e.clientY - hold.at.y) > 10) cancelHold(); }, { passive: true });
  document.addEventListener('pointerup', cancelHold, { passive: true });
  document.addEventListener('pointercancel', cancelHold, { passive: true });
  window.addEventListener('scroll', cancelHold, { passive: true });
  document.addEventListener('contextmenu', (e) => { if (Date.now() < suppressUntil || (hold && explain(e.target))) e.preventDefault(); });

  // ------------------------------------------------------------- Explain mode
  let explainSkip = false;
  const explainOn = () => document.documentElement.dataset.explain === 'on';
  const banner = document.createElement('div');
  banner.className = 'info-banner';
  banner.hidden = true;
  banner.innerHTML = '<span><b>Explain mode</b> · tap anything outlined to see what it is and why</span><button class="btn sm" data-info-explain="off">Done</button>';
  document.body.appendChild(banner);
  banner.addEventListener('click', (e) => { if (e.target.closest('[data-info-explain]')) setExplain(false); });
  function setExplain(on) {
    if (on) document.documentElement.dataset.explain = 'on'; else delete document.documentElement.dataset.explain;
    banner.hidden = !on;
    document.querySelectorAll('[data-act="explain"]').forEach((b) => { b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); });
  }
  globalThis.toggleExplain = () => setExplain(!explainOn());
  document.addEventListener('click', (e) => {
    // The click that ends a long press lands on whatever is under the finger now (often the backdrop): it does nothing.
    if (Date.now() < suppressUntil) {
      if (!e.target.closest('#infoSheet')) { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    if (!explainOn() || explainSkip || e.target.closest('#infoSheet, .info-banner, [data-act="explain"], .info-backdrop')) return;
    const x = explain(e.target);
    if (!x) return;
    e.preventDefault();
    e.stopPropagation();
    openSheet(x, e.target.closest('.bump, .prop-tip, [title], [data-tip-title], [data-roll], .art-tile') || e.target);
  }, true);

  // ------------------------------------------------------------- a first-time hint on touch screens
  if (coarse()) {
    let seen = null;
    try { seen = localStorage.getItem('hint-explain'); } catch (e) { /* ignore */ }
    if (!seen) {
      setTimeout(() => {
        setStatus('Tip: press and hold a number or button to see what it is and why, or use ⓘ to explain things with a tap.', '', false, { act: 'explain', label: 'Try ⓘ' });
        try { localStorage.setItem('hint-explain', '1'); } catch (e) { /* ignore */ }
      }, 4000);
    }
  }
}());
