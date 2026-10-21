/*
 * The web version as an app: registers sw.js (offline, installable) and offers a new version when one is ready.
 *
 * Only in the web version, served over https or from localhost: the extension has its own files, and the dev page
 * (SHEET_DB_NAME set by dev/serve.py) always shows the files on disk. A new version waits until the player says
 * Reload (or every sheet tab is closed), so nothing changes under them mid-session.
 */
async function registerOfflineApp() {
  if (platform.name !== 'web' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  if (typeof SHEET_DB_NAME !== 'undefined') return;
  let reg;
  try { reg = await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('Offline use is off:', e); return; }
  const offer = () => {
    if (!navigator.serviceWorker.controller) return; // the first install: nothing older to replace
    if (typeof setStatus === 'function') setStatus('A new version of the sheet is ready.', '', false, { act: 'app-update', label: 'Reload' });
  };
  if (reg.waiting) offer();
  reg.addEventListener('updatefound', () => {
    const next = reg.installing;
    if (next) next.addEventListener('statechange', () => { if (next.state === 'installed') offer(); });
  });
  // A sheet left open for days (an installed app) looks for a new version when it comes back into view.
  let checked = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - checked > 3600e3) {
      checked = Date.now();
      reg.update().catch(() => {});
    }
  });
  registerOfflineApp.reg = reg;
}

/** "Reload" on the new-version notice: the waiting version takes over, then the page reloads with it. */
function updateOfflineApp() {
  const reg = registerOfflineApp.reg;
  if (!reg || !reg.waiting) { location.reload(); return; }
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  reg.waiting.postMessage({ type: 'take-over' });
}

registerOfflineApp();
