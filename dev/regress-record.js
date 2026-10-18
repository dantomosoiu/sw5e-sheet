// Dev page only (http://127.0.0.1:8765/): records the test characters for `node dev/regress.js`.
//
//   const rec = await import('/dev/regress-record.js'); rec.record();   // then watch rec.progress
//
// Has sw5e.com compute every character that needs it, with its edits and effects (SW5E's own engine, through the
// installed extension; nothing is saved to sw5e.com): the sheet's engine is checked against that. Then writes
// dev/dumps/regress-state.json (git-ignored): the dev storage of those characters, with SW5E's calculations.
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
    await ensureSw5eData();
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
    // SW5E's calculation of each character with its edits and effects (and without the effects, to explain them),
    // kept as the sheet keeps a calculation (state.derived), whatever the sheet's own engine says.
    const sw5eDerived = {};
    for (const key of keys) {
      const name = state.snapshots[key].raw.name;
      progress.running = name;
      if (!needsDerived(key)) { progress.done.push(name); continue; }
      const { fx } = derivedInputs(key);
      const withFx = fx.effects.length > 0;
      try {
        const res = await computeWithSw5e(withFx ? [fx.baseRaw, fx.raw] : [fx.raw], {});
        const r = res.characters[res.characters.length - 1];
        if (!r || !r.complete) throw new Error((r && r.error) || 'sw5e.com computed nothing');
        sw5eDerived[key] = {
          basis: basisOf(fx.raw), complete: r.complete, base: withFx ? res.characters[0].complete : null,
          refs: r.refs, validation: r.validation, error: r.error, at: Date.now(),
        };
        progress.done.push(name);
      } catch (e) {
        progress.failed.push(`${name}: ${e.message}`);
      }
    }
    progress.running = 'saving';
    const st = await platform.storage.get(['snapshots', 'edits', 'history', 'itemState', 'trackers', 'rolls',
      'rollSettings', 'backupInfo']);
    const pick = (o) => Object.fromEntries(keys.filter((k) => o && k in o).map((k) => [k, o[k]]));
    const storage = {
      snapshots: pick(st.snapshots), derived: sw5eDerived, edits: pick(st.edits), history: pick(st.history),
      itemState: pick(st.itemState), trackers: pick(st.trackers),
      rolls: (st.rolls || []).filter((r) => keys.includes(r.key)),
      rollSettings: st.rollSettings || null,
      backupInfo: st.backupInfo ? { count: st.backupInfo.count || null, characters: pick(st.backupInfo.characters) } : null,
      rulesInfo: { dataVersion: state.rules.dataVersion }, catalogInfo: { dataVersion: state.catalog.dataVersion },
    };
    await post('regress-state.json', { recordedAt: Date.now(), keys, failed: progress.failed, storage });
    progress.running = null;
  } catch (e) {
    progress.error = e.message;
  } finally {
    progress.finished = true;
  }
  return progress;
}
