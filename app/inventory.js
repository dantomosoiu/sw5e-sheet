// SW5E Character Sheet Viewer — inventory rules: item search, SW5E's rarity names, the base item of an enhanced
// weapon or armor, selling, reloading and armor properties. Pure functions (no DOM, no state), shared with the viewer.

/** SW5E's rarities and the common names GMs use for them. */
const INV_RARITY = { standard: 'common', premium: 'uncommon', prototype: 'rare', advanced: 'very rare', legendary: 'legendary', artifact: 'artifact' };
const INV_RARITY_ORDER = ['standard', 'premium', 'prototype', 'advanced', 'legendary', 'artifact'];
const invRarity = (it) => String((it && (it.rarityText || (Array.isArray(it.rarityOptions) ? it.rarityOptions[0] : ''))) || '').toLowerCase();
/** "Premium (uncommon)"; '' for items without a rarity. */
function invRarityText(it) {
  const r = invRarity(it);
  if (!r) return '';
  const name = r.charAt(0).toUpperCase() + r.slice(1);
  return INV_RARITY[r] && INV_RARITY[r] !== r ? `${name} (${INV_RARITY[r]})` : name;
}
/** At least this rarity ('' = any). */
const invRarityAtLeast = (it, min) => !min || INV_RARITY_ORDER.indexOf(invRarity(it)) >= INV_RARITY_ORDER.indexOf(min);

const invNorm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'");
const invEscRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Items whose name has every word of the query, in any order ("fragmentation grenade" finds "Grenade,
 * fragmentation"). Ranked: the exact name, names that start with the query, names where every word starts a word
 * ("ration" → "Field rations" before "Blaster Integration"), then the rest; plain items before enhanced ones, shorter
 * names first.
 */
function invSearch(items, query, keep) {
  const q = invNorm(query).trim();
  if (!q) return [];
  const words = q.split(/[\s,]+/).filter(Boolean);
  const hits = [];
  for (const it of items || []) {
    if (keep && !keep(it)) continue;
    const n = invNorm(it.name);
    if (!words.every((w) => n.includes(w))) continue;
    const starts = words.every((w) => new RegExp(`(^|[^a-z0-9'])${invEscRe(w)}`).test(n));
    const rank = n === q ? 0 : n.startsWith(q) ? 1 : starts ? 2 : 3;
    hits.push([rank * 2 + (it.equipmentCategory || it.pack ? 0 : 1), it]);
  }
  return hits.sort((a, b) => a[0] - b[0] || a[1].name.length - b[1].name.length || a[1].name.localeCompare(b[1].name)).map((h) => h[1]);
}

/**
 * The plain items an enhanced weapon, armor or shield can be built on, from its subtype: "any", "any blaster",
 * "any medium", "heavy exoskeleton", "nightstinger rifle". [] for other enhanced items.
 */
function invEnhancedBases(ref, items) {
  if (!ref || !['Weapon', 'Armor', 'Shield'].includes(ref.type)) return [];
  const sub = invNorm(ref.subtype || 'any').trim();
  const plain = (items || []).filter((i) => i.equipmentCategory);
  const isShield = (i) => i.armorClassification === 'Shield';
  const pool = ref.type === 'Weapon' ? plain.filter((i) => i.equipmentCategory === 'Weapon')
    : plain.filter((i) => i.equipmentCategory === 'Armor' && (ref.type === 'Shield' ? isShield(i) : !isShield(i)));
  if (!sub || sub === 'any') return pool;
  const kind = /^any (blaster|vibroweapon|lightweapon|light|medium|heavy)s?$/.exec(sub);
  if (kind) {
    return ref.type === 'Weapon' ? pool.filter((i) => new RegExp(kind[1], 'i').test(i.weaponClassification || ''))
      : pool.filter((i) => invNorm(i.armorClassification) === kind[1]);
  }
  // A named item ("nightstinger rifle", "medium shield generator"), or the items whose name has every word of it
  // ("martial lightsaber": the lightsabers).
  const exact = pool.filter((i) => invNorm(i.name) === sub);
  if (exact.length) return exact;
  const words = sub.split(/\s+/).filter((w) => !/^(simple|martial|exotic)$/.test(w));
  return pool.filter((i) => words.every((w) => invNorm(i.name).includes(w)));
}

/** A sale's default price: half the standard price, for the quantity sold. */
const invSellPrice = (cost, qty) => Math.floor((Number(cost) || 0) * (Number(qty) || 1) / 2);

/** "reload 12" and the ammunition it fires ("Power cell (range 105/420)") → { shots, ammo } or null. */
function invReload(w) {
  const props = (w && w.properties) || [];
  const r = props.map((p) => /^reload (\d+)$/i.exec(String(p).trim())).find(Boolean);
  if (!r) return null;
  const a = props.map((p) => /^([a-z ]+?) \(range\b/i.exec(String(p).trim())).find(Boolean);
  return { shots: Number(r[1]), ammo: a ? a[1].replace(/^./, (c) => c.toUpperCase()) : '' };
}
/** The inventory entry that reloads it: the plain item ("Power cell") first, else an enhanced one ("Power Cell (Average)"). */
function invAmmoEntry(entries, ammo) {
  if (!ammo) return -1;
  const a = invNorm(ammo);
  const list = (entries || []).map((e, i) => ({ e, i })).filter(({ e }) => (Number(e.quantity) || (e.quantity == null ? 1 : 0)) > 0);
  const plain = list.find(({ e }) => invNorm(e.name) === a);
  if (plain) return plain.i;
  const other = list.find(({ e }) => invNorm(e.name).startsWith(a + ' ('));
  return other ? other.i : -1;
}

/**
 * What worn armor and shields do beyond AC, from their properties: Bulky / Obtrusive (or SW5E's stealthDisadvantage):
 * disadvantage on Stealth; Strength N: speed −10 when the Strength score is lower; Cumbersome: speed −5.
 * `worn`: catalog entries of the equipped armor and shields. Returns { stealth: [why], speed, speedWhy: [why] }.
 */
function invArmorEffects(worn, strength) {
  const out = { stealth: [], speed: 0, speedWhy: [] };
  for (const a of worn || []) {
    const props = (a.properties || []).map((p) => String(p).trim());
    const bulky = props.some((p) => /^bulky$/i.test(p));
    const obtrusive = props.some((p) => /^obtrusive$/i.test(p));
    if (bulky || obtrusive || a.stealthDisadvantage) out.stealth.push(`${a.name}${bulky ? ' (Bulky: Stealth that relies on sound)' : obtrusive ? ' (Obtrusive: Stealth that relies on sight)' : ''}`);
    const str = props.map((p) => /^strength (\d+)$/i.exec(p)).find(Boolean);
    const need = str ? Number(str[1]) : Number(a.strengthRequirement) || 0;
    if (need && (Number(strength) || 0) < need) out.speedWhy.push(`${a.name}: Strength ${need}`);
    if (props.some((p) => /^cumbersome$/i.test(p))) out.speedWhy.push(`${a.name}: Cumbersome`);
  }
  // Each penalty counts once, however many items have it.
  if (out.speedWhy.some((w) => /Strength \d+$/.test(w))) out.speed -= 10;
  if (out.speedWhy.some((w) => /Cumbersome$/.test(w))) out.speed -= 5;
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    INV_RARITY, INV_RARITY_ORDER, invRarity, invRarityText, invRarityAtLeast, invSearch, invEnhancedBases, invSellPrice,
    invReload, invAmmoEntry, invArmorEffects,
  };
}
