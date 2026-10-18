// SW5E's rules and item data, and its rule books.
//
// They come with the sheet, in data/sw5e/: fetched from SW5E's public data service (the one sw5e.com itself reads)
// by `node dev/fetch-sw5e.js`, which uses the functions below. SW5E is the work of its authors, credited in
// data/sw5e/README.md and NOTICE.md; it isn't covered by the sheet's license. When sw5e.com reports a newer data
// version than the sheet's copy, the sheet fetches the new data from the same service (it answers any site) and
// keeps it in this browser.
//
// The shapes are the ones the sheet keeps (the service's own, with storage keys, duplicate Enum/Json fields and
// empty values left out):
//   rules   { dataVersion, fetchedAt, source, modules: { classes: [...], archetypes, features, …, equipmentPacks } }
//   catalog { dataVersion, fetchedAt, source, items: [equipment…, enhanced items…] }

const SW5E_API = 'https://sw5eapi.azurewebsites.net/api/';
// The rules modules, in the sheet's order, and the service's endpoint for each (as sw5e.com's own store fetches them).
const SW5E_RULES_ENDPOINTS = {
  classes: 'class', archetypes: 'archetype', features: 'feature', maneuvers: 'maneuvers', feats: 'feat',
  fightingStyles: 'fightingStyle', fightingMasteries: 'fightingMastery', lightsaberForms: 'lightsaberForm',
  weaponFocuses: 'weaponFocus', weaponSupremacies: 'weaponSupremacy', classImprovements: 'classImprovement',
  multiclassImprovements: 'multiclassImprovement', splashclassImprovements: 'splashclassImprovement',
  characterAdvancements: 'characterAdvancement', powers: 'power', conditions: 'conditions', skills: 'skills',
  referenceTables: 'referenceTable', backgrounds: 'background', species: 'species', weaponProperties: 'weaponProperty',
  armorProperties: 'armorProperty',
};
// The item list: equipment, then enhanced items.
const SW5E_ITEM_ENDPOINTS = ['equipment', 'enhancedItem'];
// The rule books: key → [endpoint, title]. Each answers its chapters: { chapterName, chapterNumber, contentMarkdown }.
const SW5E_BOOKS = {
  phb: ['PlayerHandbookRule', "Player's Handbook"],
  sotg: ['StarshipRule', 'Starships of the Galaxy'],
  wh: ['WretchedHivesRule', 'Wretched Hives'],
  ec: ['ExpandedContent', 'Expanded Content'],
  variant: ['VariantRule', 'Variant Rules'],
};

const SW5E_RULES_SKIP = /^(partitionKey|rowKey|timestamp|eTag)$|(Enum|Json)$/;
/** A rules entry as the sheet keeps it: no storage keys, Enum/Json duplicates or empty values, at any depth. */
function sw5eSlimRules(o) {
  if (Array.isArray(o)) return o.map(sw5eSlimRules);
  if (!o || typeof o !== 'object') return o;
  return Object.fromEntries(Object.entries(o).filter(([k, v]) => !SW5E_RULES_SKIP.test(k) && v != null && v !== '').map(([k, v]) => [k, sw5eSlimRules(v)]));
}
const SW5E_ITEM_SKIP = /^(partitionKey|rowKey|timestamp|eTag|searchableRarity|hasPrerequisite|contentType)$|(Enum|Json|Map)$/;
/** An item as the sheet keeps it: also without false, "Unknown", "None" and empty lists. */
function sw5eSlimItem(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (SW5E_ITEM_SKIP.test(k) || v == null || v === '' || v === false || v === 'Unknown' || v === 'None' || (Array.isArray(v) && !v.length)) continue;
    out[k] = v;
  }
  return out;
}
/** The equipment packs, from the handbook's Equipment chapter ("#### Explorer's Pack" + "Costs … Includes …"). */
function sw5eEquipmentPacks(md) {
  const at = typeof md === 'string' ? md.search(/#+\s*Equipment Packs/i) : -1;
  if (at < 0) return [];
  const next = md.indexOf('\n### ', at + 10);
  const sec = md.slice(at, next > 0 ? next : undefined).replace(/\r/g, '');
  return [...sec.matchAll(/^#{4,}\s*(.+?)\s*\n+([^\n#]+)/gm)].map((m) => ({ name: m[1].trim(), text: m[2].trim() }));
}

/** One answer of SW5E's data service (`fetchFn`: the page's fetch, or Node's). */
async function sw5eFetch(path, { fetchFn = fetch, text = false } = {}) {
  const res = await fetchFn(SW5E_API + path);
  if (!res.ok) throw new Error(`SW5E's data service answered ${res.status} for ${path}`);
  return text ? res.text() : res.json();
}
/** The service's data version (its MASTERVERSION, as sw5e.com reports it). */
async function sw5eFetchDataVersion(opts) {
  const v = (await sw5eFetch('dataVersion', opts)).find((x) => x.name === 'MASTERVERSION');
  return v ? v.version : null;
}
/** The rules data and the item list, fetched now: { rules, catalog }. */
async function sw5eFetchRulesAndCatalog(opts = {}) {
  const [dataVersion, lists, handbook, items] = await Promise.all([
    sw5eFetchDataVersion(opts),
    Promise.all(Object.values(SW5E_RULES_ENDPOINTS).map((ep) => sw5eFetch(ep, opts))),
    sw5eFetch('PlayerHandbookRule/Equipment.json', opts),
    Promise.all(SW5E_ITEM_ENDPOINTS.map((ep) => sw5eFetch(ep, opts))),
  ]);
  const modules = Object.fromEntries(Object.keys(SW5E_RULES_ENDPOINTS).map((m, i) => [m, sw5eSlimRules(lists[i])]));
  modules.equipmentPacks = sw5eEquipmentPacks(handbook && handbook.contentMarkdown);
  const fetchedAt = Date.now();
  return {
    rules: { dataVersion, fetchedAt, source: SW5E_API, modules },
    catalog: { dataVersion, fetchedAt, source: SW5E_API, items: items.flat().map(sw5eSlimItem) },
  };
}
/** The rule books: { key: { title, chapters: [{ number, name, markdown }] } }, and SW5E's credits (markdown). */
async function sw5eFetchBooks(opts = {}) {
  const books = {};
  for (const [key, [endpoint, title]] of Object.entries(SW5E_BOOKS)) {
    const chapters = await sw5eFetch(endpoint, opts);
    books[key] = {
      title,
      chapters: chapters.map((c) => ({ number: c.chapterNumber, name: c.chapterName, markdown: c.contentMarkdown || '' }))
        .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name)),
    };
  }
  return { books, credits: await sw5eFetch('Credit', { ...opts, text: true }) };
}

/** The copy that comes with the sheet: data/sw5e/<name>.json ('rules' or 'catalog'), read once. */
function sw5eBundled(name) {
  const memo = sw5eBundled.memo || (sw5eBundled.memo = {});
  if (!memo[name]) {
    memo[name] = fetch(`data/sw5e/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`data/sw5e/${name}.json is missing (${r.status})`);
      return r.json();
    }).catch((e) => { delete memo[name]; throw e; });
  }
  return memo[name];
}

if (typeof module !== 'undefined') {
  module.exports = {
    SW5E_API, SW5E_RULES_ENDPOINTS, SW5E_ITEM_ENDPOINTS, SW5E_BOOKS, sw5eSlimRules, sw5eSlimItem, sw5eEquipmentPacks,
    sw5eFetch, sw5eFetchDataVersion, sw5eFetchRulesAndCatalog, sw5eFetchBooks,
  };
}
