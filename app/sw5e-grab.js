/*
 * "Get characters from sw5e.com" without the extension: the sheet's bookmark (More ▾ → Get characters from
 * sw5e.com…) loads this file into a sw5e.com page the player is signed in on. It reads the account's characters
 * the way the extension's Load does (sw5ePageExtract, from extension/bridge.js: dev/build.py puts it below in
 * dist/web/sw5e-grab.js) and hands them to the sheet:
 *   Send: opens the sheet (?from=sw5e); the sheet says it's ready, gets them with postMessage and says so;
 *   Copy: puts them on the clipboard, for the sheet's Paste (an iPhone's home-screen app has its own storage).
 * Nothing is sent anywhere else, and nothing on sw5e.com is changed.
 */
(function () {
  const script = document.currentScript;
  const SHEET = script && script.src ? new URL('./', script.src).href : window.__sheetUrl;
  const SHEET_ORIGIN = new URL(SHEET).origin;
  const FORMAT = 'sw5e-sheet-from-sw5e';

  // __SW5E_PAGE_EXTRACT__

  const old = document.getElementById('sw5e-sheet-grab');
  if (old) old.remove();
  const box = document.createElement('div');
  box.id = 'sw5e-sheet-grab';
  box.setAttribute('role', 'dialog');
  box.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;'
    + 'width:min(420px,calc(100vw - 32px));padding:14px 16px;border-radius:12px;background:#151a23;color:#e8eaf0;'
    + 'border:2px solid #e8b13e;box-shadow:0 8px 30px rgba(0,0,0,.5);font:15px/1.45 system-ui,sans-serif;';
  document.body.appendChild(box);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const btn = 'margin:10px 8px 0 0;padding:8px 12px;border-radius:8px;border:1px solid #e8b13e;font:inherit;cursor:pointer;';
  function show(html, buttons) {
    box.innerHTML = '<div style="font-weight:600;margin-bottom:6px">SW5E Sheet</div><div>' + html + '</div>';
    for (const [label, fn, primary] of buttons || []) {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = btn + (primary ? 'background:#e8b13e;color:#151a23;' : 'background:transparent;color:#e8eaf0;');
      b.onclick = fn;
      box.appendChild(b);
    }
  }
  const close = ['Close', () => box.remove()];

  if (!/^(www\.)?sw5e\.com$/.test(location.hostname)) {
    show('Open <b>sw5e.com</b> (signed in), then open this bookmark there.', [close]);
    return;
  }

  (async () => {
    show('Reading your characters from sw5e.com…');
    let res = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { res = JSON.parse(await sw5ePageExtract(JSON.stringify({ mode: 'account' }))); } catch (e) { res = { error: e.message }; }
      if (!res.retry) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!res || res.retry || res.error) {
      show('Could not read your characters: ' + esc((res && (res.error || res.reason)) || 'sw5e.com did not get ready') + '.', [close]);
      return;
    }
    const chars = res.characters || [];
    if (!chars.length) {
      show(res.meta && res.meta.loggedIn === false ? 'No characters here: sign in on sw5e.com first.' : 'No characters on this sw5e.com account.', [close]);
      return;
    }
    const payload = { format: FORMAT, version: 1, result: res };
    const names = chars.map((c) => (c.raw && c.raw.name) || 'Unnamed');
    const found = 'Found ' + chars.length + ' character' + (chars.length === 1 ? '' : 's') + ': ' + esc(names.join(', ')) + '.';

    function send() {
      const w = window.open(SHEET + '?from=sw5e', '_blank');
      if (!w) {
        show(found + '<br>The browser didn\'t open the sheet. Use <b>Copy</b>, then <b>Paste</b> in the sheet.', [['Copy', copy, true], close]);
        return;
      }
      show(found + '<br>Sending to the sheet…');
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        show(found + '<br>The sheet didn\'t answer. Use <b>Copy</b>, then in the sheet: More ▾ → Get characters from sw5e.com → <b>Paste</b>.', [['Copy', copy, true], close]);
      }, 30000);
      function onMessage(e) {
        if (e.origin !== SHEET_ORIGIN || e.source !== w || !e.data) return;
        if (e.data.type === 'sw5e-sheet-ready') w.postMessage(payload, SHEET_ORIGIN);
        if (e.data.type === 'sw5e-sheet-received') {
          clearTimeout(timer);
          window.removeEventListener('message', onMessage);
          show('Sent ' + chars.length + ' character' + (chars.length === 1 ? '' : 's') + ' to the sheet. You can close this tab.', [close]);
        }
      }
      window.addEventListener('message', onMessage);
    }
    async function copy() {
      try {
        await navigator.clipboard.writeText(JSON.stringify(payload));
        show('Copied. In the sheet: More ▾ → Get characters from sw5e.com → <b>Paste</b>.', [close]);
      } catch (e) {
        show('Could not copy: ' + esc(e.message), [close]);
      }
    }
    show(found, [['Send to the sheet', send, true], ['Copy', copy], close]);
  })();
})();
