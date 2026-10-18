// Dev page only (http://127.0.0.1:8765/): has sw5e.com compute the made-up characters of dev/engine/inputs.json,
// for checking the sheet's own engine against SW5E's (dev/engine-check.js).
//
//   const rec = await import('/dev/engine-record.js'); rec.record();   // then watch rec.progress
//
// Only computes (through the installed extension, in a sw5e.com tab): nothing is saved to sw5e.com. Writes
// dev/dumps/engine-sw5e.json (git-ignored, with SW5E's whole computed sheets); then
// `node dev/engine-check.js import` keeps their numbers in dev/engine/sw5e-results.json.
// Run it again from time to time: the import says what SW5E computes differently since the last recording.

export const progress = { done: 0, total: 0, failed: [], finished: false, error: null };
const BATCH = 20;

export async function record({ only = null } = {}) {
  Object.assign(progress, { done: 0, total: 0, failed: [], finished: false, error: null });
  try {
    const inputs = await (await fetch('/dev/engine/inputs.json', { cache: 'no-store' })).json();
    const list = inputs.characters.filter((c) => !only || c.label.includes(only));
    progress.total = list.length;
    const results = [];
    let meta = null;
    for (let i = 0; i < list.length; i += BATCH) {
      const batch = list.slice(i, i + BATCH);
      let res;
      try {
        res = await computeWithSw5e(batch.map((c) => c.raw), {});
      } catch (e) {
        for (const c of batch) progress.failed.push(`${c.label}: ${e.message}`);
        progress.done += batch.length;
        continue;
      }
      meta = res.meta || meta;
      batch.forEach((c, j) => {
        const r = (res.characters || [])[j] || {};
        if (!r.complete) progress.failed.push(`${c.label}: ${r.error || 'no result'}`);
        results.push({ label: c.label, raw: c.raw, complete: r.complete || null, validation: r.validation || null, refs: r.refs || null, error: r.error || null });
      });
      progress.done += batch.length;
    }
    const body = JSON.stringify({ recordedAt: Date.now(), meta, results });
    const saved = await fetch('/dev/dump/engine-sw5e.json', { method: 'POST', body });
    if (!saved.ok) throw new Error(`Saving failed: ${saved.status}`);
  } catch (e) {
    progress.error = e.message;
  } finally {
    progress.finished = true;
  }
  return progress;
}
