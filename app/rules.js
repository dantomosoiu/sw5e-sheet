// SW5E's rule books, read from the copy that comes with the sheet (data/sw5e/books/, fetched from SW5E's data
// service by dev/fetch-sw5e.js), so they work offline. SW5E is its authors' work: see Credits
// (data/sw5e/credits.md) and data/sw5e/README.md.
//
// rules.html#<chapter file> opens a chapter (e.g. #phb/12-appendix-a-conditions.md), #credits the credits,
// #search=<words> a search of every chapter.
'use strict';

const BOOKS = 'data/sw5e/books/';
const texts = new Map();
let index = null;

function initTheme() {
  let t = null;
  try { t = localStorage.getItem('theme'); } catch (e) { /* ignore */ }
  if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  // The style the sheet last showed (themes.css): the player's, or their character's class.
  let style = null;
  try { style = localStorage.getItem('styleShown'); } catch (e) { /* ignore */ }
  if (style) document.documentElement.dataset.style = style;
}

/** SW5E's markdown, made plain for md.js: sidebars (quoted blocks) as ordinary text, entities and layout tags out. */
function cleanMd(src) {
  return String(src || '')
    .replace(/^>\s?/gm, '')
    .replace(/&emsp;|&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/?div[^>]*>/gi, '').replace(/\\columnbreak/g, '');
}

function chapterText(file) {
  if (!texts.has(file)) {
    texts.set(file, fetch(BOOKS + file).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${file}: ${r.status}`))))
      .catch((e) => { texts.delete(file); throw e; }));
  }
  return texts.get(file);
}
const chapters = () => Object.entries(index).flatMap(([key, b]) => b.chapters.map((c) => ({ ...c, key, book: b.title })));

function renderNav(active) {
  document.getElementById('books').innerHTML = Object.entries(index).map(([key, b]) => {
    const open = b.chapters.some((c) => c.file === active);
    return `<details${open ? ' open' : ''}><summary>${escHtml(b.title)}</summary><ul>${b.chapters.map((c) =>
      `<li><a href="#${escHtml(c.file)}"${c.file === active ? ' aria-current="page"' : ''}>${escHtml(c.name)}</a></li>`).join('')}</ul></details>`;
  }).join('') + `<p class="rules-credits-link"><a href="#credits"${active === 'credits' ? ' aria-current="page"' : ''}>Credits</a></p>`;
}

async function showChapter(file) {
  const c = chapters().find((x) => x.file === file);
  if (!c) return showHome();
  const main = document.getElementById('chapter');
  main.innerHTML = '<p class="faint">Loading…</p>';
  try {
    const text = cleanMd(await chapterText(file));
    // Most chapters start with their own title: then it's the page's heading.
    const own = /^\s*#+\s*(.+)/.exec(text);
    const titled = own && own[1].replace(/[^a-z0-9]/gi, '').toLowerCase() === c.name.replace(/[^a-z0-9]/gi, '').toLowerCase();
    main.innerHTML = `<p class="faint rules-where">${escHtml(c.book)}</p><h1>${escHtml(titled ? own[1].trim() : c.name)}</h1>${md(titled ? text.slice(own[0].length) : text)}`;
  } catch (e) {
    main.innerHTML = `<p class="warn-text">Could not open this chapter (${escHtml(e.message)}).</p>`;
  }
  document.title = `${c.name} · ${c.book} · SW5E Rules`;
  renderNav(file);
}

async function showCredits() {
  const main = document.getElementById('chapter');
  let theirs = '';
  try { theirs = md(cleanMd(await (await fetch('data/sw5e/credits.md')).text())); } catch (e) { /* the note above stays */ }
  main.innerHTML = `<h1>Credits</h1>
    <p>These rules are <b>SW5E</b> (Star Wars 5th Edition), a fan-made Star Wars conversion of fifth edition rules by
    Galiphile and the SW5E contributors credited below, made under Wizards of the Coast's Fan Content Policy and
    published at <a href="https://sw5e.com" target="_blank" rel="noopener noreferrer">sw5e.com</a>. The sheet keeps a
    copy of SW5E's books and data, as SW5E's own data service publishes them, so they work offline. They are SW5E's
    work, not the sheet's, and the sheet's license doesn't cover them. Star Wars belongs to Lucasfilm. The sheet isn't
    affiliated with SW5E, Lucasfilm, Disney or Wizards of the Coast.</p>
    <hr>${theirs || '<p class="faint">SW5E\'s credits are in data/sw5e/credits.md.</p>'}`;
  document.title = 'Credits · SW5E Rules';
  renderNav('credits');
}

function showHome() {
  const main = document.getElementById('chapter');
  main.innerHTML = `<h1>SW5E rules</h1>
    <p>SW5E's books, as kept with the sheet: pick a chapter, or search them all. For example the
    <a href="#phb/12-appendix-a-conditions.md">conditions</a>, <a href="#phb/10-combat.md">combat</a> or
    <a href="#phb/11-force-and-tech-casting.md">force- and tech-casting</a>.</p>
    <p class="faint">SW5E is the work of Galiphile and the SW5E contributors: see <a href="#credits">Credits</a>.</p>`;
  document.title = 'SW5E Rules';
  renderNav(null);
}

/** Every chapter with the words in it, with a line around the first. */
async function showSearch(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const main = document.getElementById('chapter');
  if (!words.length) return showHome();
  main.innerHTML = '<p class="faint">Searching…</p>';
  const all = chapters();
  const found = [];
  await Promise.all(all.map(async (c) => {
    const text = cleanMd(await chapterText(c.file).catch(() => ''));
    const low = text.toLowerCase();
    if (!words.every((w) => low.includes(w))) return;
    const at = low.indexOf(words[0]);
    const line = text.slice(Math.max(0, text.lastIndexOf('\n', at) + 1), Math.min(text.length, at + 160)).replace(/[#*_|]/g, ' ').trim();
    found.push({ c, count: low.split(words[0]).length - 1, line });
  }));
  found.sort((a, b) => b.count - a.count);
  main.innerHTML = `<h1>“${escHtml(q)}”</h1>${found.length ? `<ul class="rules-results">${found.map((f) =>
    `<li><a href="#${escHtml(f.c.file)}">${escHtml(f.c.name)}</a> <span class="faint">${escHtml(f.c.book)} · ${f.count}×</span><br>
      <span class="faint">${escHtml(f.line.slice(0, 200))}…</span></li>`).join('')}</ul>` : '<p>Not in the books.</p>'}`;
  document.title = `${q} · SW5E Rules`;
  renderNav(null);
}

function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  window.scrollTo(0, 0);
  if (h === 'credits') return showCredits();
  if (h.startsWith('search=')) {
    document.getElementById('q').value = h.slice(7);
    return showSearch(h.slice(7));
  }
  return h ? showChapter(h) : showHome();
}

async function main() {
  initTheme();
  try {
    index = await (await fetch(BOOKS + 'index.json')).json();
  } catch (e) {
    document.getElementById('chapter').innerHTML = `<p class="warn-text">The books aren't here (${escHtml(e.message)}).</p>`;
    return;
  }
  document.querySelector('.rules-search').addEventListener('submit', (e) => {
    e.preventDefault();
    location.hash = 'search=' + encodeURIComponent(document.getElementById('q').value.trim());
  });
  window.addEventListener('hashchange', route);
  route();
}
main();
