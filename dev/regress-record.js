// Dev page only (http://127.0.0.1:8765/): records the test characters for `node dev/regress.js`.
//
//   const rec = await import('/dev/regress-record.js'); rec.record();   // then watch rec.progress
//
// Recalculates every character that needs it with SW5E's engine (through the installed extension; nothing is
// saved to sw5e.com), then writes, all git-ignored:
//   dev/dumps/regress-state.json   the dev storage of those characters
//   dev/dumps/rules.json, catalog.json   SW5E's rules and item data as cached here
// `node dev/regress.js record` turns the state into the cases in dev/regress/cases/ (with ids and accounts
// replaced). Characters protected in dev/bridge-proxy.js are left out, as are names matching `skip`.

export const progress = { running: null, done: [], failed: [], finished: false, error: null };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (name, value) => {
  const res = await fetch(`/dev/dump/${name}`, { method: 'POST', body: JSON.stringify(value) });
  if (!res.ok) throw new Error(`Saving ${name} failed: ${res.status}`);
};

export async function record({ skip = [] } = {}) {
  Object.assign(progress, { running: null, done: [], failed: [], finished: false, error: null });
  try {
    await ensureRules();
    await ensureCatalog();
    const protectedIds = window.__devProtectedIds;
    if (!Array.isArray(protectedIds)) throw new Error("Set localStorage 'sw5e-dev:protectedIds' to your real characters' ids first ('[]' if none; see dev/README.md), then reload the dev page");
    const seen = new Set();
    const keys = Object.keys(state.snapshots).filter((k) => {
      const s = state.snapshots[k];
      if (protectedIds.includes(s.raw.id) || skip.some((x) => s.raw.name === x)) return false;
      // Two copies of the same character (same name): the first is enough.
      if (seen.has(s.raw.name)) return false;
      seen.add(s.raw.name);
      return true;
    });
    for (const key of keys) {
      const name = state.snapshots[key].raw.name;
      progress.running = name;
      while (state.recomputing) await wait(250);
      if (needsDerived(key) && !freshComputed(key, derivedInputs(key).fx.raw)) await recomputeDerived(key);
      while (state.recomputing) await wait(250);
      if (needsDerived(key) && !freshComputed(key, derivedInputs(key).fx.raw)) {
        progress.failed.push(`${name}: ${(recomputeFail[key] && recomputeFail[key].message) || 'not recalculated'}`);
      } else progress.done.push(name);
    }
    progress.running = 'saving';
    const st = await chrome.storage.local.get(['snapshots', 'derived', 'edits', 'history', 'itemState', 'trackers', 'rolls',
      'rollSettings', 'backupInfo', 'rulesInfo', 'catalogInfo', 'catalog']);
    const pick = (o) => Object.fromEntries(keys.filter((k) => o && k in o).map((k) => [k, o[k]]));
    const storage = {
      snapshots: pick(st.snapshots), derived: pick(st.derived), edits: pick(st.edits), history: pick(st.history),
      itemState: pick(st.itemState), trackers: pick(st.trackers),
      rolls: (st.rolls || []).filter((r) => keys.includes(r.key)),
      rollSettings: st.rollSettings || null,
      backupInfo: st.backupInfo ? { count: st.backupInfo.count || null, characters: pick(st.backupInfo.characters) } : null,
      rulesInfo: st.rulesInfo || null, catalogInfo: st.catalogInfo || null,
    };
    await post('regress-state.json', { recordedAt: Date.now(), keys, failed: progress.failed, storage });
    await post('rules.json', state.rules);
    if (st.catalog) await post('catalog.json', st.catalog);
    progress.running = null;
  } catch (e) {
    progress.error = e.message;
  } finally {
    progress.finished = true;
  }
  return progress;
}
