// The extension around the sheet (app/, built into it by dev/build.py): the toolbar button, and the dev page's
// way to sw5e.com. The sheet's own page reaches sw5e.com through platform.js and bridge.js.
importScripts('bridge.js');

// Toolbar button: open the sheet. If the current tab is a SW5E character
// page, the viewer opens straight to that character and pulls it from that tab.
chrome.action.onClicked.addListener(async (tab) => {
  const params = new URLSearchParams();
  const url = tab && tab.url ? tab.url : '';
  if (/^https:\/\/(www\.)?sw5e\.com\//.test(url)) {
    params.set('tab', String(tab.id));
    const m = url.match(/\/mycharacters\/([^/?#]+)/);
    if (m) params.set('id', decodeURIComponent(m[1]));
  }
  const q = params.toString();
  await chrome.tabs.create({
    url: chrome.runtime.getURL('index.html' + (q ? '?' + q : '')),
    index: tab && typeof tab.index === 'number' ? tab.index + 1 : undefined,
  });
});

// Dev harness only (dev/bridge-proxy.js): lets the viewer served from 127.0.0.1/localhost
// run the sw5e.com bridge through this extension. Inert in release builds, where
// dev/pack.py strips `externally_connectable` from the manifest so no page can connect.
// Protocol: page posts { op: 'run', argsJson, preferredTabId }; we reply with any number of
// { status } messages, then exactly one { resultJson } or { error }. Payloads are JSON text
// because port messaging drops null-valued properties (see sw5ePageExtract).
//
// Self-reload while developing: before each request we compare the worker's code files on
// disk with the copy loaded at the last (re)load, kept in storage.session, which Chrome
// clears when the extension reloads. If they differ we reply { reloading: true } and
// reload; the page reconnects and sends the request again.
const DEV_CODE_FILES = ['manifest.json', 'background.js', 'bridge.js'];
const devCodeOnDisk = async () => (await Promise.all(DEV_CODE_FILES.map(async (f) => (await fetch(chrome.runtime.getURL(f), { cache: 'no-store' })).text()))).join('|');
async function devCodeIsStale() {
  const disk = await devCodeOnDisk();
  const { devLoadedCode } = await chrome.storage.session.get('devLoadedCode');
  if (devLoadedCode == null) {
    await chrome.storage.session.set({ devLoadedCode: disk });
    return false;
  }
  return devLoadedCode !== disk;
}
// Record the loaded code as soon as the worker starts after a (re)load.
devCodeIsStale().catch(() => {});

chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.name !== 'sw5e-dev-bridge') return port.disconnect();
  port.onMessage.addListener(async (msg) => {
    if (!msg || msg.op !== 'run') return port.postMessage({ error: 'Unknown request' });
    try {
      if (await devCodeIsStale()) {
        port.postMessage({ reloading: true });
        setTimeout(() => chrome.runtime.reload(), 100);
        return;
      }
    } catch (e) { /* can't tell: run with the loaded code */ }
    try {
      const result = await runInSw5e(JSON.parse(msg.argsJson), {
        preferredTabId: msg.preferredTabId,
        onStatus: (status) => port.postMessage({ status }),
      });
      port.postMessage({ resultJson: JSON.stringify(result) });
    } catch (e) {
      port.postMessage({ error: e.message || String(e) });
    }
  });
});
