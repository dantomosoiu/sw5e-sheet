// Bridge between the viewer and sw5e.com.
//
// The SW5E site already contains the full rules engine (Vuex getter
// `character/generateCompleteCharacter`) plus all reference data. Instead of
// re-implementing the rules, we run a small function inside an sw5e.com tab
// (MAIN world) that:
//   * makes sure the reference data is loaded,
//   * reads the user's characters (or takes raw characters we pass in, e.g. from a file),
//   * runs the site's engine to produce the computed ("complete") character,
//   * collects the reference entries the sheet needs (maneuvers, feats, species…).
//
// The raw character on sw5e.com stays the source of truth. Saving (mode 'save') goes through
// the site's own `character/saveCharacter`, after checking the server copy hasn't changed.

const SW5E_URL = 'https://sw5e.com/tools/mycharacters';
const SW5E_MATCH = ['https://sw5e.com/*', 'https://www.sw5e.com/*'];

// ---------------------------------------------------------------------------
// Runs inside the sw5e.com page. MUST be self-contained (no outside references).
// ---------------------------------------------------------------------------
async function sw5ePageExtract(argsJson) {
  // Arguments and result cross Chrome's extension messaging as JSON text: its own object
  // serialization silently drops null-valued properties (e.g. tweaks' "override": null),
  // which corrupted characters and broke the save conflict check.
  async function extract(opts) {
    const appEl = document.querySelector('#app');
    const vm = appEl && appEl.__vue__;
    const store = vm && vm.$store;
    if (!store) return { retry: true, reason: 'The SW5E app has not started yet' };

    const S = store.state;
    const G = store.getters;
    const A = store._actions || {};
    const has = (a) => Object.prototype.hasOwnProperty.call(A, a);
    // A request that never settles (an expired sign-in can leave the site waiting forever) fails after `ms`.
    const within = (p, ms, msg) => Promise.race([Promise.resolve(p), new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms))]);
    const NO_ANSWER = "sw5e.com didn't answer. Its sign-in may have expired: open sw5e.com, sign in again if it asks, then try again.";
    const plain = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
    const col = (mod) => {
      const m = S[mod];
      return m && Array.isArray(m[mod]) ? m[mod] : [];
    };

    // 1) Make sure reference data is present (the site fetches it lazily per page).
    //    The fetch is started once per page and shared by retries (kept on window until it
    //    settles), so polling attempts only wait on it instead of re-dispatching everything.
    if (opts.ensureData !== false) {
      if (!window.__sw5eSheetDataFetch) {
        const modules = ['classes', 'archetypes', 'species', 'backgrounds', 'feats', 'features', 'powers',
          'equipment', 'enhancedItems', 'maneuvers', 'conditions', 'fightingStyles', 'fightingMasteries',
          'lightsaberForms', 'classImprovements', 'multiclassImprovements', 'splashclassImprovements',
          'weaponFocuses', 'weaponSupremacies', 'characterAdvancements', 'skills', 'weaponProperties',
          'armorProperties', 'referenceTables'];
        const actions = modules
          .map((m) => m + '/fetch' + m.charAt(0).toUpperCase() + m.slice(1))
          .filter(has);
        window.__sw5eSheetDataFetch = (async () => {
          if (has('dataVersions/fetchDataVersions')) {
            try { await store.dispatch('dataVersions/fetchDataVersions'); } catch (e) { /* offline is fine */ }
          }
          await Promise.allSettled(actions.map((a) => Promise.resolve().then(() => store.dispatch(a))));
        })().finally(() => { window.__sw5eSheetDataFetch = null; });
      }
      await Promise.race([
        window.__sw5eSheetDataFetch,
        new Promise((r) => setTimeout(r, opts.dataWaitMs || 15000)),
      ]);
    }
    if (!col('classes').length || !col('species').length || !col('features').length) {
      return { retry: true, reason: 'Waiting for SW5E reference data to load' };
    }

    // SW5E's reference data version (bumped when the site's rules data changes).
    let dataVersion = null;
    try {
      const dv = ((S.dataVersions && S.dataVersions.dataVersions) || []).find((v) => v.name === 'MASTERVERSION');
      dataVersion = dv ? dv.version : null;
    } catch (e) { /* ignore */ }

    // The item catalog (equipment + enhanced items) for adding items, slimmed: no storage
    // keys, enum/JSON duplicates or empty values.
    if (opts.mode === 'catalog') {
      if (!col('equipment').length || !col('enhancedItems').length) {
        return { retry: true, reason: 'Waiting for the SW5E item lists to load' };
      }
      const SKIP = /^(partitionKey|rowKey|timestamp|eTag|searchableRarity|hasPrerequisite|contentType)$|(Enum|Json|Map)$/;
      const slim = (o) => {
        const out = {};
        for (const [k, v] of Object.entries(o)) {
          if (SKIP.test(k) || v == null || v === '' || v === false || v === 'Unknown' || v === 'None'
            || (Array.isArray(v) && !v.length)) continue;
          out[k] = v;
        }
        return out;
      };
      return {
        catalog: { dataVersion, items: plain(col('equipment')).concat(plain(col('enhancedItems'))).map(slim) },
        meta: { bridge: 9, dataVersion, sourceUrl: location.href, extractedAt: Date.now() },
      };
    }

    // SW5E's rules data (classes, archetypes, features, maneuvers, feats, powers, choice lists…),
    // for the viewer's own editing of class choices. Same slimming as the catalog.
    if (opts.mode === 'rules') {
      const RULES = ['classes', 'archetypes', 'features', 'maneuvers', 'feats', 'fightingStyles', 'fightingMasteries',
        'lightsaberForms', 'weaponFocuses', 'weaponSupremacies', 'classImprovements', 'multiclassImprovements',
        'splashclassImprovements', 'characterAdvancements', 'powers', 'conditions', 'skills', 'referenceTables',
        'backgrounds', 'species', 'weaponProperties', 'armorProperties'];
      if (!col('classes').length || !col('features').length || !col('maneuvers').length || !col('powers').length) {
        return { retry: true, reason: 'Waiting for the SW5E rules data to load' };
      }
      const SKIP = /^(partitionKey|rowKey|timestamp|eTag)$|(Enum|Json)$/;
      const slim = (o) => (Array.isArray(o) ? o.map(slim) : o && typeof o === 'object'
        ? Object.fromEntries(Object.entries(o).filter(([k, v]) => !SKIP.test(k) && v != null && v !== '').map(([k, v]) => [k, slim(v)])) : o);
      // The equipment packs, from the handbook's Equipment chapter ("#### Explorer's Pack" + "Costs 250 credits.
      // Includes …"): not in any data module. Missing (offline, a slow page) is fine: [] then.
      let equipmentPacks = [];
      try {
        let md = ((S.blobs && S.blobs.handbookBlobs) || {}).Equipment;
        if (!md && has('blobs/fetchHandbookBlob')) {
          await within(store.dispatch('blobs/fetchHandbookBlob', 'Equipment'), 10000, NO_ANSWER);
          md = ((S.blobs && S.blobs.handbookBlobs) || {}).Equipment;
        }
        const at = typeof md === 'string' ? md.search(/#+\s*Equipment Packs/i) : -1;
        if (at >= 0) {
          const next = md.indexOf('\n### ', at + 10);
          const sec = md.slice(at, next > 0 ? next : undefined).replace(/\r/g, '');
          for (const m of sec.matchAll(/^#{4,}\s*(.+?)\s*\n+([^\n#]+)/gm)) equipmentPacks.push({ name: m[1].trim(), text: m[2].trim() });
        }
      } catch (e) { equipmentPacks = []; }
      return {
        rules: { dataVersion, modules: { ...Object.fromEntries(RULES.map((k) => [k, slim(plain(col(k)))])), equipmentPacks } },
        meta: { bridge: 13, dataVersion, sourceUrl: location.href, extractedAt: Date.now() },
      };
    }

    // 2) Which characters?
    let raws;
    let save = null;
    if (opts.mode === 'compute') {
      raws = opts.raws || [];
    } else if (opts.mode === 'create') {
      // A character made in the viewer (opts.raw, with a localId and no id): saved to the account as a new character
      // through the site's own action, which posts it and gets its id back (saveCharacterLocally is the confirmation).
      let loggedIn = false;
      try { loggedIn = !!G['authentication/isLoggedIn']; } catch (e) { /* ignore */ }
      if (!loggedIn) return { error: 'Not signed in on sw5e.com. Sign in there, then save again.' };
      const raw = opts.raw;
      if (!raw || !raw.localId || raw.id) return { error: 'Only a character made here can be saved as a new one.' };
      // Once only: a retry (a slow page, a fresh tab) must not create it a second time. If the account already has a
      // character with this localId, that's the one; if the account can't be read, nothing is created.
      try {
        await within(store.dispatch('character/fetchCharacters'), 20000, NO_ANSWER);
      } catch (e) {
        return { error: (e.message === NO_ANSWER ? NO_ANSWER : 'Could not read your sw5e.com characters: ' + e.message) + ' Nothing was created.' };
      }
      const already = ((S.character && S.character.characters) || []).find((c) => c && c.id && c.localId === raw.localId);
      if (already) {
        save = { created: true, existing: true };
        raws = [plain(already)];
      }
      const confirmed = already ? Promise.resolve(already) : new Promise((resolve) => {
        const timer = setTimeout(() => { unsub(); resolve(null); }, 20000);
        const unsub = store.subscribeAction({
          after: (a) => {
            if (a.type === 'character/saveCharacterLocally' && a.payload && a.payload.localId === raw.localId && a.payload.id) {
              clearTimeout(timer); unsub(); resolve(a.payload);
            }
          },
        });
      });
      if (!already) {
        try {
          await within(store.dispatch('character/saveCharacter', Object.assign({}, raw, { id: '' })), 25000, NO_ANSWER);
        } catch (e) {
          if (e.message !== NO_ANSWER) throw e;
        }
      }
      const saved = await confirmed;
      if (!saved) return { error: "sw5e.com didn't confirm the new character within 20 s. Saving again is safe: if it was created, that copy is used rather than a second one." };
      if (!already) {
        save = { created: true };
        raws = [plain(saved)];
      }
    } else if (opts.mode === 'save') {
      // Save opts.currentStats and opts.fields onto the account's character opts.id, then
      // compute the result. The server copy is the base (SW5E is the source of truth); only
      // currentStats and the whitelisted simple fields below change.
      // If it changed on SW5E since the viewer loaded it (opts.expectedChangedAt / opts.expected),
      // nothing is saved and the newer server copy is returned instead (save.conflict).
      // Nothing below may return { retry } once the save is dispatched: retries re-run this.
      // fields: { path: value } for simple fields only. Anything else is refused.
      const fields = opts.fields || {};
      const fieldType = (path) => (path === 'credits' || path === 'experiencePoints' ? 'number'
        : path === 'notes' || /^characteristics\.[^.]+$/.test(path) ? 'string'
          : path === 'equipment' || path === 'customEquipment' ? 'items'
            : path === 'tweaks' ? 'object'
              : path === 'classes' ? 'classes' : path === 'customFeatures' || path === 'customProficiencies' ? 'named'
                : ['featureNotes', 'featureChoices', 'baseAbilityScores', 'settings', 'languageChoices'].includes(path) ? 'object'
                  : path === 'creditLog' || path === 'debts' || path === 'rollLog' ? 'records'
                  : path === 'background' || path === 'species' ? 'namedObject'
                    : ['customLanguages', 'customFeats', 'customTechPowers', 'customForcePowers'].includes(path) ? 'strings'
                      : path === 'name' ? 'string' : null);
      const isItem = (path, it) => it && typeof it === 'object' && typeof it.name === 'string' && it.name
        && Number.isFinite(Number(it.quantity)) && Number(it.quantity) >= 0
        && (path !== 'equipment' || it.category === 'Equipment' || it.category === 'EnhancedItem');
      for (const [path, v] of Object.entries(fields)) {
        const type = fieldType(path);
        if (!type) return { error: 'Saving "' + path + '" is not supported.' };
        const named = (x) => x && typeof x === 'object' && typeof x.name === 'string' && x.name;
        const ok = type === 'items' ? Array.isArray(v) && v.every((it) => isItem(path, it))
          : type === 'classes' ? Array.isArray(v) && v.length > 0 && v.every((k) => named(k) && Number.isFinite(Number(k.levels)) && Number(k.levels) > 0)
          : type === 'named' ? Array.isArray(v) && v.every((x) => named(x))
          : type === 'namedObject' ? !!v && typeof v === 'object' && !Array.isArray(v) && typeof v.name === 'string'
          : type === 'strings' ? Array.isArray(v) && v.every((x) => typeof x === 'string')
          : type === 'records' ? Array.isArray(v) && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))
          : type === 'object' ? !!v && typeof v === 'object' && !Array.isArray(v)
            : typeof v === type && (type !== 'number' || Number.isFinite(v));
        if (!ok) return { error: 'Bad value for "' + path + '".' };
      }
      let loggedIn = false;
      try { loggedIn = !!G['authentication/isLoggedIn']; } catch (e) { /* ignore */ }
      if (!loggedIn) return { error: 'Not signed in on sw5e.com. Sign in there, then save again.' };
      try {
        await within(store.dispatch('character/fetchCharacters'), 20000, NO_ANSWER);
      } catch (e) {
        return { error: e.message === NO_ANSWER ? NO_ANSWER + ' Nothing was changed there.' : 'Could not fetch the latest copy from sw5e.com: ' + e.message };
      }
      const server = ((S.character && S.character.characters) || []).find((c) => c.id === opts.id);
      if (!server) return { error: 'This character is no longer on your sw5e.com account.' };
      // Changed there = newer timestamp AND different content. The site sometimes re-saves a
      // copy that differs only in changedAt, which shouldn't block saving.
      const strip = (c) => {
        const x = plain(c);
        for (const k of ['changedAt', 'builderVersion', 'userId', 'user']) delete x[k];
        return x;
      };
      const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
        ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
      const changedThere = server.changedAt !== opts.expectedChangedAt
        && (!opts.expected || canon(strip(server)) !== canon(strip(opts.expected)));
      if (changedThere) {
        const a = strip(server);
        const b = strip(opts.expected || {});
        const differs = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => canon(a[k]) !== canon(b[k]));
        save = { conflict: true, differs };
        raws = [plain(server)];
      } else {
        const next = plain(server);
        if (opts.currentStats) next.currentStats = Object.assign({}, next.currentStats, opts.currentStats);
        for (const [path, v] of Object.entries(fields)) {
          const [top, sub] = path.split('.');
          if (sub) next[top] = Object.assign({}, next[top], { [sub]: v });
          else next[top] = v;
        }
        // The site saves to its API ~1 s after dispatch and then dispatches saveCharacterLocally
        // with the server's copy: that is the confirmation. Keep this page open until then.
        const confirmed = new Promise((resolve) => {
          const timer = setTimeout(() => { unsub(); resolve(null); }, 20000);
          const unsub = store.subscribeAction({
            after: (a) => {
              if (a.type === 'character/saveCharacterLocally' && a.payload && a.payload.id === opts.id) {
                clearTimeout(timer); unsub(); resolve(a.payload);
              }
            },
          });
        });
        try {
          await within(store.dispatch('character/saveCharacter', next), 25000, NO_ANSWER);
        } catch (e) {
          if (e.message !== NO_ANSWER) throw e;
        }
        const saved = await confirmed;
        if (!saved) {
          return { error: "sw5e.com didn't confirm the save within 20 s. Its sign-in may have expired: open the character there to check, sign in again if it asks, then try again." };
        }
        save = { saved: true };
        raws = [plain(saved)];
      }
    } else {
      let chars = (S.character && S.character.characters) || [];
      let loggedIn = false;
      try { loggedIn = !!G['authentication/isLoggedIn']; } catch (e) { /* ignore */ }
      if (!chars.length && loggedIn && has('character/fetchCharacters')) {
        try { await within(store.dispatch('character/fetchCharacters'), 20000, NO_ANSWER); } catch (e) { /* ignore */ }
        chars = (S.character && S.character.characters) || [];
      }
      const isEmpty = G['character/getIsEmptyCharacter'];
      raws = plain(chars).filter((c) => {
        try { return !(typeof isEmpty === 'function' && isEmpty(c)); } catch (e) { return true; }
      }).filter((c) => c && (c.name || (c.classes && c.classes.length)));
    }

    // 3) Reference lookups.
    const STRIP = /^(partitionKey|rowKey|timestamp|eTag)$|(Enum|Json)$/;
    const clean = (o) => {
      if (Array.isArray(o)) return o.map(clean);
      if (o && typeof o === 'object') {
        const out = {};
        for (const k of Object.keys(o)) if (!STRIP.test(k)) out[k] = clean(o[k]);
        return out;
      }
      return o;
    };
    const find = (mod, name) => {
      if (!name) return null;
      const list = col(mod);
      const n = String(name).trim();
      return list.find((x) => x.name === n) ||
        list.find((x) => String(x.name).toLowerCase() === n.toLowerCase()) || null;
    };
    const lookupAll = (mod, names, pick) => {
      const out = {};
      for (const n of new Set((names || []).filter(Boolean))) {
        const it = find(mod, n);
        if (it) out[n] = clean(pick ? pick(it) : it);
      }
      return out;
    };
    const namesOf = (v) => {
      if (!v) return [];
      if (typeof v === 'string') return [v];
      if (Array.isArray(v)) return v.flatMap(namesOf);
      if (typeof v === 'object' && typeof v.name === 'string') return [v.name];
      return [];
    };
    const KNOWN_CLASS_KEYS = new Set(['name', 'levels', 'hitPoints', 'abilityScoreImprovements', 'archetype',
      'maneuvers', 'forcePowers', 'techPowers']);

    const buildRefs = (raw) => {
      const classes = (raw && raw.classes) || [];
      const featNames = [];
      if (raw.background && raw.background.feat && raw.background.feat.name) featNames.push(raw.background.feat.name);
      for (const c of classes) {
        for (const asi of c.abilityScoreImprovements || []) {
          if (asi && asi.type === 'Feat' && asi.name) featNames.push(asi.name);
        }
      }
      for (const f of raw.customFeats || []) featNames.push(...namesOf(f));

      // Any extra per-class/archetype choices (fighting styles, lightsaber forms, …)
      const choices = {};
      const scan = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (const k of Object.keys(obj)) {
          if (KNOWN_CLASS_KEYS.has(k)) continue;
          const names = namesOf(obj[k]);
          if (!names.length || !col(k).length) continue;
          choices[k] = Object.assign(choices[k] || {}, lookupAll(k, names));
        }
      };
      for (const c of classes) { scan(c); scan(c.archetype); }

      const classRefs = lookupAll('classes', classes.map((c) => c.name), (c) => ({
        name: c.name, summary: c.summary, primaryAbility: c.primaryAbility, hitDiceDieType: c.hitDiceDieType,
        hitPointsAtFirstLevel: c.hitPointsAtFirstLevel, hitPointsAtHigherLevels: c.hitPointsAtHigherLevels,
        armorProficiencies: c.armorProficiencies, weaponProficiencies: c.weaponProficiencies,
        toolProficiencies: c.toolProficiencies, savingThrows: c.savingThrows, skillChoices: c.skillChoices,
        levelChanges: c.levelChanges, casterType: c.casterType, casterRatio: c.casterRatio,
        multiClassProficiencies: c.multiClassProficiencies, archetypeFlavorName: c.archetypeFlavorName,
      }));
      const archRefs = lookupAll('archetypes', classes.map((c) => c.archetype && c.archetype.name), (a) => ({
        name: a.name, className: a.className, casterType: a.casterType, casterRatio: a.casterRatio,
        leveledTable: a.leveledTable,
      }));
      return {
        classes: classRefs,
        archetypes: archRefs,
        species: lookupAll('species', [raw.species && raw.species.name], (s) => ({
          name: s.name, size: s.size, homeworld: s.homeworld, language: s.language, distinctions: s.distinctions,
          skinColorOptions: s.skinColorOptions, hairColorOptions: s.hairColorOptions, eyeColorOptions: s.eyeColorOptions,
          heightAverage: s.heightAverage, heightRollMod: s.heightRollMod, weightAverage: s.weightAverage,
          weightRollMod: s.weightRollMod, traits: s.traits, imageUrls: s.imageUrls,
        })),
        backgrounds: lookupAll('backgrounds', [raw.background && raw.background.name], (b) => ({
          name: b.name, flavorText: b.flavorText, skillProficiencies: b.skillProficiencies,
          toolProficiencies: b.toolProficiencies, languages: b.languages, equipment: b.equipment,
          featureName: b.featureName, featureText: b.featureText, flavorName: b.flavorName,
          flavorDescription: b.flavorDescription,
        })),
        feats: lookupAll('feats', featNames),
        maneuvers: lookupAll('maneuvers', classes.flatMap((c) => namesOf(c.maneuvers).concat(namesOf(c.archetype && c.archetype.maneuvers)))),
        choices,
        conditions: clean(col('conditions').map((c) => ({ name: c.name, description: c.description }))),
      };
    };

    // 4) Run the site's rules engine.
    const gen = G['character/generateCompleteCharacter'];
    const val = G['character/getCharacterValidation'];
    const characters = raws.map((raw) => {
      let complete = null, validation = null, error = null;
      try { validation = plain(typeof val === 'function' ? val(raw) : null); } catch (e) { error = 'Validation failed: ' + e.message; }
      try {
        complete = typeof gen === 'function' ? plain(gen(raw)) : null;
        if (!complete && !error) error = 'The SW5E engine could not build this character' + (validation && validation.message ? ' (' + validation.message + ')' : '');
      } catch (e) {
        error = (error ? error + '; ' : '') + 'Engine error: ' + e.message;
      }
      let refs = null;
      try { refs = buildRefs(raw); } catch (e) { error = (error ? error + '; ' : '') + 'Reference lookup error: ' + e.message; }
      return { raw, complete, validation, refs, error };
    });

    let loggedIn = null;
    try { loggedIn = !!G['authentication/isLoggedIn']; } catch (e) { /* ignore */ }
    // bridge: bump when this page function changes, to tell which copy ran (the extension's
    // copy only updates when the extension is reloaded).
    return { characters, save, meta: { bridge: 14, dataVersion, loggedIn, sourceUrl: location.href, extractedAt: Date.now() } };
  }
  return JSON.stringify(await extract(JSON.parse(argsJson)));
}

// ---------------------------------------------------------------------------
// Extension-side helpers
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Overall budget for one load/compute: opening the tab, the site starting up,
// reference data downloading and polling all count against it.
const SW5E_TIMEOUT_MS = 60000;

const isSw5eUrl = (url) => /^https:\/\/(www\.)?sw5e\.com\//.test(url || '');
/** The tab is no longer on sw5e.com (its sign-in page, usually): an error that says so, else null. */
async function leftSw5e(tabId) {
  let url = '';
  try { url = (await chrome.tabs.get(tabId)).url || ''; } catch (e) { return null; }
  if (!url || isSw5eUrl(url)) return null;
  const err = new Error(/login|sign|b2c/i.test(url)
    ? 'sw5e.com asked you to sign in again. Sign in there, then try again.'
    : 'The sw5e.com tab moved to another site. Open sw5e.com, then try again.');
  err.signIn = true;
  return err;
}

async function waitForTabComplete(tabId, deadline) {
  while (Date.now() < deadline) {
    const t = await chrome.tabs.get(tabId);
    if (t.status === 'complete') return t;
    await sleep(300);
  }
  throw new Error('sw5e.com took too long to load');
}

/** Find (or open in the background) a sw5e.com tab. `fresh` skips existing tabs. */
async function acquireSw5eTab(preferredTabId, onStatus, fresh, deadline) {
  if (preferredTabId && !fresh) {
    try {
      const t = await chrome.tabs.get(preferredTabId);
      if (t && isSw5eUrl(t.url)) return { tabId: t.id, created: false };
    } catch (e) { /* tab is gone */ }
  }
  // Discarded (Memory Saver) tabs can't run scripts, so prefer live ones.
  const tabs = fresh ? [] : (await chrome.tabs.query({ url: SW5E_MATCH })).filter((t) => !t.discarded);
  if (tabs.length) {
    const best = tabs.find((t) => /mycharacters/.test(t.url || '')) || tabs[0];
    return { tabId: best.id, created: false };
  }
  onStatus && onStatus('Opening sw5e.com in a background tab…');
  const t = await chrome.tabs.create({ url: SW5E_URL, active: false });
  try {
    await waitForTabComplete(t.id, deadline);
  } catch (e) {
    try { await chrome.tabs.remove(t.id); } catch (e2) { /* ignore */ }
    throw e;
  }
  return { tabId: t.id, created: true };
}

async function runInSw5e(args, opts = {}) {
  try {
    return await runInSw5eTab(args, opts, false);
  } catch (e) {
    // An existing tab can refuse scripts (error page, mid-navigation, sleeping…):
    // retry once in a fresh background tab before giving up.
    if (!e.existingTab) throw e;
    console.warn('sw5e.com tab unusable, retrying in a fresh tab:', e.message);
    return runInSw5eTab(args, opts, true);
  }
}

async function runInSw5eTab(args, { preferredTabId, onStatus, keepTab = false } = {}, fresh) {
  const deadline = Date.now() + SW5E_TIMEOUT_MS;
  const { tabId, created } = await acquireSw5eTab(preferredTabId, onStatus, fresh, deadline);
  try {
    let last = null;
    while (Date.now() < deadline) {
      // Never wait on the page longer than the time we have left.
      const dataWaitMs = Math.max(1000, Math.min(15000, deadline - Date.now() - 500));
      const away = await leftSw5e(tabId);
      if (away) throw away;
      let res;
      try {
        // The page function bounds its own waits; this is the backstop if the page stops answering at all.
        const backstop = Math.max(5000, deadline - Date.now()) + 30000;
        [res] = await Promise.race([
          chrome.scripting.executeScript({
            target: { tabId }, world: 'MAIN', func: sw5ePageExtract, args: [JSON.stringify({ ...args, dataWaitMs })],
          }),
          sleep(backstop).then(() => { throw new Error(`sw5e.com didn't answer within ${Math.round(backstop / 1000)} s. Its sign-in may have expired: open sw5e.com, sign in again if it asks, then try again.`); }),
        ]);
      } catch (e) {
        const away2 = await leftSw5e(tabId);
        if (away2) throw away2;
        const err = /Frame with ID|No tab with id|tab was closed|Tabs cannot be edited/i.test(e.message || '')
          ? new Error('The sw5e.com tab was reloaded or closed while it was working. Try again.') : e;
        if (!created) err.existingTab = true;
        throw err;
      }
      last = res && typeof res.result === 'string' ? JSON.parse(res.result) : null;
      if (last && !last.retry) return last;
      onStatus && onStatus((last && last.reason) || 'Waiting for sw5e.com…');
      await sleep(1000);
    }
    throw new Error(`sw5e.com wasn't ready after ${SW5E_TIMEOUT_MS / 1000} s` + (last && last.reason ? ` (${last.reason})` : ''));
  } finally {
    if (created && !keepTab) { try { await chrome.tabs.remove(tabId); } catch (e) { /* ignore */ } }
  }
}

/** All characters currently known to sw5e.com (account + local). */
function fetchAllFromSw5e(opts) {
  return runInSw5e({ mode: 'account' }, opts);
}

/** Run the SW5E engine over raw characters (e.g. imported from a file, or edited). */
function computeWithSw5e(raws, opts) {
  return runInSw5e({ mode: 'compute', raws }, opts);
}

/** The SW5E item catalog: { catalog: { dataVersion, items }, meta }. */
/** SW5E's rules data: { rules: { dataVersion, modules: { classes: [...], … } }, meta }. */
async function fetchRulesFromSw5e(opts) {
  const res = await runInSw5e({ mode: 'rules' }, opts);
  if (res.error) throw new Error(res.error);
  return res;
}

async function fetchCatalogFromSw5e(opts) {
  const res = await runInSw5e({ mode: 'catalog' }, opts);
  if (res.error) throw new Error(res.error);
  return res;
}

/**
 * Save play state (currentStats fields) and simple field edits (`fields`: { 'notes' |
 * 'credits' | 'experiencePoints' | 'characteristics.<name>' | 'equipment' |
 * 'customEquipment' | 'tweaks': value }; item lists and tweaks are saved whole) to the account
 * character `id`, provided it still
 * matches `expected` (the raw character the viewer last loaded, changed at
 * `expectedChangedAt`). Resolves to the usual result plus `save: { saved: true }` or
 * `save: { conflict: true }` (nothing saved; characters[0] is the newer server copy).
 * Throws if sw5e.com refuses or doesn't confirm.
 */
/** Save a character made in the viewer (raw with a localId, no id) to the account as a new character. */
async function createOnSw5e(raw, opts) {
  const res = await runInSw5e({ mode: 'create', raw }, opts);
  if (res.error) throw new Error(res.error);
  return res;
}

async function saveToSw5e({ id, expected, currentStats, fields }, opts) {
  const res = await runInSw5e({ mode: 'save', id, expected, expectedChangedAt: expected.changedAt, currentStats, fields }, opts);
  if (res.error) throw new Error(res.error);
  return res;
}
