// Dev only: injected by dev/serve.py after app/platform.js. Gives the dev page (the web version of
// the sheet, which can't reach sw5e.com) platform.sw5e: a call through the installed extension's
// background worker, which runs extension/bridge.js's runInSw5e, so Load from SW5E, Sync and
// Check with sw5e.com work in the dev page. The extension must be installed from dist/extension
// (dev/build.py) with `externally_connectable` (extension/manifest.json); it reloads itself when its
// code changed on disk (see extension/background.js).
//
// Extension id: ?ext=<id> (remembered), else the default unpacked id below.
(function () {
  'use strict';
  const DEFAULT_EXT_ID = 'mfikebeffkcgnkppppccnidnneblggaa';
  const params = new URLSearchParams(location.search);
  if (params.get('ext')) localStorage.setItem('sw5e-dev:extId', params.get('ext'));
  const extId = localStorage.getItem('sw5e-dev:extId') || DEFAULT_EXT_ID;
  // Present when an installed extension lists this origin in externally_connectable.
  const runtime = window.chrome && window.chrome.runtime;

  // Safety net while developing against a real account: the characters listed in localStorage
  // 'sw5e-dev:protectedIds' (a JSON array of sw5e.com ids: your real characters; '[]' if there are
  // none) are never saved from the dev page, nor recorded as test cases (dev/regress-record.js).
  // Until the list is set, nothing is saved or recorded.
  const PROTECTED_IDS = JSON.parse(localStorage.getItem('sw5e-dev:protectedIds') || 'null');
  window.__devProtectedIds = Array.isArray(PROTECTED_IDS) ? PROTECTED_IDS.slice() : null;

  // One request over a fresh port. Resolves 'reloading' when the extension found its code
  // files changed on disk and is reloading itself (see background.js).
  const request = (args, preferredTabId, onStatus) => new Promise((resolve, reject) => {
      if (!runtime || !runtime.connect) {
        reject(new Error('The SW5E Sheet extension is not reachable from this page — is it installed (with externally_connectable) and enabled?'));
        return;
      }
      let port;
      try {
        port = runtime.connect(extId, { name: 'sw5e-dev-bridge' });
      } catch (e) {
        reject(new Error(`Could not connect to extension ${extId}: ${e.message}`));
        return;
      }
      let done = false;
      // The extension bounds each call itself; this only catches a worker that never answers.
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        try { port.disconnect(); } catch (e) { /* gone */ }
        reject(new Error("The extension didn't answer within 3 minutes. Try again; reload it in chrome://extensions if this repeats."));
      }, 180000);
      port.onMessage.addListener((msg) => {
        if (msg.status) { if (onStatus) onStatus(msg.status); return; }
        if (done) return;
        done = true;
        clearTimeout(timer);
        port.disconnect();
        if (msg.reloading) resolve('reloading');
        else if (msg.error) reject(new Error(msg.error));
        else resolve(JSON.parse(msg.resultJson));
      });
      port.onDisconnect.addListener(() => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const err = runtime.lastError && runtime.lastError.message;
        reject(new Error(`Extension ${extId} disconnected${err ? ': ' + err : ''} — reload it in chrome://extensions if bridge.js/background.js changed`));
      });
      // JSON text: port messaging drops null-valued properties.
      port.postMessage({ op: 'run', argsJson: JSON.stringify(args), preferredTabId });
  });

  async function runInSw5eViaExtension(args, { preferredTabId, onStatus } = {}) {
    if (args && args.mode === 'save' && !Array.isArray(PROTECTED_IDS)) {
      throw new Error("Dev guard: saving from the dev page is off until localStorage 'sw5e-dev:protectedIds' lists your real characters ('[]' if none): see dev/README.md.");
    }
    if (args && args.mode === 'save' && PROTECTED_IDS.includes(args.id)) {
      throw new Error(`Dev guard: saving character ${args.id} is blocked in the dev harness (protected id).`);
    }
    const res = await request(args, preferredTabId, onStatus);
    if (res !== 'reloading') return res;
    // The extension is reloading with the new code: reconnect once it's back (a few seconds).
    console.info('[dev-bridge] extension code changed on disk; it is reloading');
    if (onStatus) onStatus('Reloading the extension with the changed code…');
    let lastErr;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const again = await request(args, preferredTabId, onStatus);
        if (again !== 'reloading') return again;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('The extension did not come back after reloading — reload it in chrome://extensions.');
  }
  // Without the extension (another browser, Playwright), the dev page is the plain web version: no sw5e.com.
  if (runtime && runtime.connect) {
    platform.sw5e = { run: runInSw5eViaExtension };
    console.info('[dev-bridge] sw5e.com calls go through extension', extId);
  } else {
    console.info('[dev-bridge] no extension reachable: sw5e.com is off, as in the web version');
  }
}());
