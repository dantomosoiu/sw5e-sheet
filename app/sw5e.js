// The sheet's calls to sw5e.com: loading the account's characters, SW5E's own calculation (the check on the
// sheet's engine), saving and creating. They go through the platform (platform.js): the browser extension runs
// them in a sw5e.com tab (extension/bridge.js). A plain web page can't reach sw5e.com, so there platform.sw5e is
// null and these fail with a message saying so; the sheet hides the buttons that need them (canReachSw5e).

const canReachSw5e = () => !!(typeof platform !== 'undefined' && platform && platform.sw5e);

async function runOnSw5e(args, opts) {
  if (!canReachSw5e()) throw new Error('sw5e.com can only be reached from the browser extension. Here, characters come from a file (Import file…).');
  return platform.sw5e.run(args, opts || {});
}

/** All characters currently known to sw5e.com (account + local). */
function fetchAllFromSw5e(opts) {
  return runOnSw5e({ mode: 'account' }, opts);
}

/** Run the SW5E engine over raw characters (e.g. imported from a file, or edited). */
function computeWithSw5e(raws, opts) {
  return runOnSw5e({ mode: 'compute', raws }, opts);
}

/** Save a character made in the viewer (raw with a localId, no id) to the account as a new character. */
async function createOnSw5e(raw, opts) {
  const res = await runOnSw5e({ mode: 'create', raw }, opts);
  if (res.error) throw new Error(res.error);
  return res;
}

/**
 * Save play state (currentStats fields) and simple field edits (`fields`: { 'notes' |
 * 'credits' | 'experiencePoints' | 'characteristics.<name>' | 'equipment' |
 * 'customEquipment' | 'tweaks': value }; item lists and tweaks are saved whole) to the account
 * character `id`, provided it still matches `expected` (the raw character the viewer last loaded,
 * changed at `expectedChangedAt`). Resolves to the usual result plus `save: { saved: true }` or
 * `save: { conflict: true }` (nothing saved; characters[0] is the newer server copy).
 * Throws if sw5e.com refuses or doesn't confirm.
 */
async function saveToSw5e({ id, expected, currentStats, fields }, opts) {
  const res = await runOnSw5e({ mode: 'save', id, expected, expectedChangedAt: expected.changedAt, currentStats, fields }, opts);
  if (res.error) throw new Error(res.error);
  return res;
}
