/* Tiles for SW5E items, as the sheet draws them (app/art.js), for `python dev/art.py items`:
 *   node dev/art-items.js '["Grenade, ion", "Brightsaber"]'   prints the figures' HTML
 * With no names: one item per picture (the first SW5E item that gets it).
 */
'use strict';
const path = require('path');
// Which pictures exist, read from the folders (so drawings not built into the sprite yet show too).
const fs = require('fs');
const stems = (dir) => fs.readdirSync(path.join(__dirname, '..', 'art', dir)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
global.ART_EQUIPMENT = new Set(stems('equipment'));
global.ART_GENERAL = new Set(stems('items'));
const { itemTile, itemArt } = require('../app/art.js');
const items = require(path.join(__dirname, '..', 'app', 'data', 'sw5e', 'catalog.json')).items;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let names = JSON.parse(process.argv[2] || '[]');
if (!names.length) {
  const seen = new Set();
  names = items.filter((it) => { const a = itemArt(it).icon; if (seen.has(a)) return false; seen.add(a); return true; }).map((it) => it.name);
}
const out = names.map((n) => {
  const it = items.find((i) => i.name.toLowerCase() === String(n).toLowerCase());
  if (!it) return `<figure><span class="art-tile xl"></span><figcaption>${esc(n)}: not found</figcaption></figure>`;
  const a = itemArt(it);
  return `<figure>${itemTile(it, 'xl')}<figcaption>${esc(it.name)}<br><small>${esc([a.icon, a.badge, a.glow, a.rarity].filter(Boolean).join(' · '))}</small></figcaption></figure>`;
});
process.stdout.write(out.join(''));
