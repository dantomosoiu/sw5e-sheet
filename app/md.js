// Tiny, safe markdown renderer for SW5E text (headings, bold/italic, lists, tables, links).
// All input is HTML-escaped first; only a fixed set of tags is produced.

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function mdInline(s) {
  let t = escHtml(s);
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  t = t.replace(/\*\*\*(\S(?:.*?\S)?)\*\*\*/g, '<strong><em>$1</em></strong>');
  t = t.replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/__(\S(?:.*?\S)?)__/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^\w*])\*(\S(?:.*?\S)?)\*(?!\w)/g, '$1<em>$2</em>');
  t = t.replace(/(^|[^\w])_(\S(?:.*?\S)?)_(?!\w)/g, '$1<em>$2</em>');
  // stray markers left over from unbalanced user text
  t = t.replace(/(^|\s)\*\*(?=\S)/g, '$1').replace(/(^|\s)\*(?=\S)/g, '$1');
  return t;
}

function md(src) {
  if (src == null || src === '') return '';
  const text = String(src)
    .replace(/\\r\\n|\\n/g, '\n') // literal escaped newlines present in some SW5E data
    .replace(/\r\n?/g, '\n')
    .replace(/�/g, '—');
  const lines = text.split('\n');
  const out = [];
  let para = [];
  const flush = () => {
    if (para.length) { out.push('<p>' + para.map(mdInline).join('<br>') + '</p>'); para = []; }
  };
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flush(); continue; }

    let m = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (m) {
      flush();
      const lvl = Math.min(6, m[1].length + 2); // demote: sheet already uses h2/h3
      out.push(`<h${lvl} class="md-h">${mdInline(m[2].replace(/#+\s*$/, ''))}</h${lvl}>`);
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push('<hr>'); continue; }

    if (isTableRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      flush();
      const head = cells(line);
      i += 1;
      const rows = [];
      while (i + 1 < lines.length && isTableRow(lines[i + 1])) { i++; rows.push(cells(lines[i])); }
      out.push('<div class="table-wrap"><table class="md-table"><thead><tr>' +
        head.map((c) => `<th>${mdInline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${mdInline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    m = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
    if (m) {
      flush();
      const ordered = /\d/.test(m[1]);
      const items = [m[2]];
      while (i + 1 < lines.length) {
        const n = lines[i + 1].match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
        if (!n || /\d/.test(n[1]) !== ordered) break;
        items.push(n[2]); i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map((it) => `<li>${mdInline(it)}</li>`).join('') + `</${tag}>`);
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return out.join('');
}
