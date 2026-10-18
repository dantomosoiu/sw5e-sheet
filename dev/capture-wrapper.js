// Appended after sw5ePageExtract by dev/serve.py to form /dev/capture.js.
// Run on a signed-in sw5e.com page (DevTools console, or Claude in Chrome's javascript tool).
// Downloads one "<name>.sheet-snapshot.json" per character — the same shape the viewer
// stores and exports — to drop into dev/fixtures/.
// Optional: set window.CAPTURE_ONLY = ['Name', ...] first to capture only those characters.
(async () => {
  let res = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    res = JSON.parse(await sw5ePageExtract(JSON.stringify({ mode: 'account' })));
    if (!res.retry) break;
    console.log('[capture]', res.reason);
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!res || res.retry) throw new Error('sw5e.com did not become ready: ' + (res && res.reason));
  const only = window.CAPTURE_ONLY;
  const keyFor = (raw) => (raw.id ? 'id:' + raw.id : raw.localId ? 'local:' + raw.localId
    : 'sw5e:' + String(raw.name || 'Unnamed').toLowerCase().replace(/\s+/g, '-'));
  const fileSafe = (s) => String(s || 'character').replace(/[^\w\- ()']+/g, '').trim().replace(/\s+/g, '_') || 'character';
  const saved = [];
  for (const r of res.characters) {
    if (only && !only.includes(r.raw.name)) continue;
    const snap = {
      format: 'sw5e-sheet-snapshot', version: 1, key: keyFor(r.raw),
      raw: r.raw, complete: r.complete || null, refs: r.refs || null,
      validation: r.validation || null, error: r.error || null,
      source: 'sw5e', loadedAt: Date.now(), meta: res.meta,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' }));
    a.download = fileSafe(r.raw.name) + '.sheet-snapshot.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    saved.push(a.download + (r.error ? ' (error: ' + r.error + ')' : ''));
  }
  return saved;
})();
