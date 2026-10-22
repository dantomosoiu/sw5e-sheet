/*
 * Item pictures (art/README.md): which drawing an item gets, its energy colour, a damage badge and its rarity tile.
 * The drawings are <symbol>s in art/items.svg, put in the page once (loadItemArt); itemTile(item) is the HTML.
 *
 * An item is matched by its name first (SW5E's names say what a thing is: "Heavy repeater", "Grenade, cryo"), then by
 * its kind (weapon classification, armor class, equipment category, enhanced item type and subtype); anything else
 * gets a crate. A player can give an energy weapon or crystal its own colour (the ✎ box: item.color).
 */
const ART_SPRITE = 'art/items.svg';

/** Puts the drawings in the page (once). Without them tiles stay empty, which is fine. */
function loadItemArt() {
  if (loadItemArt.done || typeof document === 'undefined' || typeof fetch !== 'function') return loadItemArt.done;
  loadItemArt.done = fetch(ART_SPRITE).then((r) => (r.ok ? r.text() : '')).then((svg) => {
    if (!svg || document.getElementById('item-art')) return;
    const box = document.createElement('div');
    box.id = 'item-art';
    box.hidden = false;
    box.innerHTML = svg;
    document.body.prepend(box);
  }).catch(() => {});
  return loadItemArt.done;
}

// [pattern on the lowercased name, picture]; the first that matches wins. Order matters: "grenade launcher" is a
// launcher, not a grenade; "restraining bolt" isn't ammunition.
const ART_BY_NAME = [
  [/unarmed/, 'gloves'],
  [/thermal detonator/, 'thermal-detonator'],
  [/remote detonator|detonator/, 'gadget'],
  [/^repair kit/, 'medpac'],
  [/(antitox|trauma) ?kit/, 'med-kit'],
  [/implements|hydrospanner|spanner|wrench|bipod|tripod/, 'tool'],
  [/\bkit\b/, 'toolkit'],
  [/computer spike|security spike|\bspike\b/, 'slicer-spike'],
  [/rocket boots|boots/, 'boots'],
  [/wrist(blaster|rifle| launcher)|shoulder (blaster|cannon)/, 'wrist-blaster'],
  [/tracker utility vest|\bvest\b/, 'vest'],
  [/space suit|hazard suit|diving suit|water suit|chemical suit|conductive suit|dampening suit|flame-proof suit|mind-shielding suit|stabilizer suit|environment suit|flightsuit/, 'env-suit'],
  [/jetpack|rocketpack|rocket pack|propulsion pack|repulsor pack/, 'jetpack'],
  [/robe\b|robes\b/, 'cloak'],
  [/^clothes|outfit|uniform|costume|garb/, 'clothes'],
  [/deuterium|mummergy|grog|raava|spicebrew|tihaar|tsiraki|vayerbok|brandy|\bale\b|wine|liquor/, 'bottle'],
  [/launcher|bazooka|rocket rifle|mortar|torpedo launcher/, 'launcher'],
  [/restraining bolt|binders|mancatcher/, 'binders'],
  [/\bmines?\b/, 'mine'],
  [/^grenade|\bgrenades?\b/, 'grenade'],
  [/^charge\b|demolition|detonite|breaching/, 'demo-charge'],
  [/^(rocket|missile|torpedo)\b/, 'ammo-rocket'],
  [/power cell|power generator|emergency battery|power pack\b/, 'power-cell'],
  [/^(slug cartridge|flechette|corrosive cartridge|electrifying cartridge|gas cartridge|cartridge)|calibrator|collimator|^cell\b|incendiary cell|cryo cell|deafening cell/, 'ammo-cartridge'],
  [/^(dart|arrow|bolt)\b|deafening dart|electrifying dart|panic dart|^snare$|vibrodart/, 'ammo-dart'],
  [/projector (canister|tank)/, 'ammo-canister'],
  // Lightweapons
  [/sun ?saber|saberstaff|doublesaber|double-?bladed|doubleshoto|split(saber|shoto)|lightstaff|dual-phase/, 'lightsaber-double'],
  [/lightwhip|saberwhip|chained lightdagger/, 'lightwhip'],
  [/lightfist|sabergauntlet|lightring|wristsaber/, 'lightfist'],
  [/lightaxe|saberaxe|sabermace|lightclub|lightbaton/, 'lightaxe'],
  [/pikesaber|lightglaive|saberspear|lightsaber pike/, 'lightsaber-pike'],
  [/shoto|lightdagger|phase knife|bitesaber|lightfoil/, 'lightsaber-shoto'],
  [/crossguard|cross-?saber|claymoresaber|great-?saber|broadsaber|bustersaber|warsaber|lightnodachi/, 'lightsaber-crossguard'],
  [/saber|lightblade|lightkatana|lightcutlass|sicklesaber|sith saber|retrosaber/, 'lightsaber'],
  // Blasters and other ranged weapons
  [/bowcaster|lightbow|energy bow|compound bow|shortbow|slingshot|bolt-thrower/, 'bowcaster'],
  [/sentry gun|assault cannon|blaster cannon|smart cannon|switch cannon|shatter cannon|sonic cannon|radiation cannon|lightning cannon|cryo cannon|ion cannon|flechette cannon/, 'blaster-cannon'],
  [/repeater|rotary|chaingun|\bbkg\b|repeating blaster/, 'blaster-repeater'],
  [/shotgun|scatter/, 'blaster-shotgun'],
  [/sniper|marksman|anti-materiel|nightstinger|railgun|beam rifle/, 'blaster-sniper'],
  [/hold-?out|light pistol/, 'blaster-holdout'],
  [/heavy pistol|hand cannon|hand bkg|heavy slugpistol/, 'blaster-heavy-pistol'],
  [/slug|revolver|needler|dart gun/, 'slugthrower'],
  [/carbine/, 'blaster-carbine'],
  [/pistol|hand blaster|^blaster$/, 'blaster-pistol'],
  [/rifle|\biws\b|vapor projector|arc caster|caster$|incinerator/, 'blaster-rifle'],
  // Melee
  [/electrostaff|techstaff|echostaff|vibrostaff|\bstaff\b/, 'electrostaff'],
  [/whip/, 'whip'],
  [/baton|tonfa|electroprod|riot shocker|nervebaton|club\b/, 'baton'],
  [/chakram|disc\b/, 'chakram'],
  [/bolas|\bnet\b/, 'bolas-net'],
  [/claw|knuckler|stun gauntlet|shock gloves/, 'vibroclaw'],
  [/vibroshield|war hat/, 'vibroshield'],
  [/knife|dagger|stiletto|shiv|hidden blade|wristblade|disguised blade|vibrocutter/, 'vibroknife'],
  [/axe/, 'vibroaxe'],
  [/hammer|mace|flail/, 'vibrohammer'],
  [/spear|(?<!s)pike|lance|glaive|voulge|atlatl/, 'vibrospear'],
  [/vibro|sword|blade|katana|rapier|nodachi|sabre|cutlass|buster|claymore|techblade|diresword/, 'vibroblade'],
  // Armor and shields
  [/shield generator|energy shield|deflector/, 'shield-generator'],
  [/shield/, 'shield-physical'],
  [/exoskeleton|\bexo\b/, 'armor-exo'],
  [/assault armor|battle armor|laminanium|heavy armor/, 'armor-heavy'],
  [/mesh|weave|composite|plastoid|medium armor|beskar/, 'armor-medium'],
  [/combat suit|fiber armor|light armor/, 'armor-light'],
  // Medicine, substances, food
  [/\bstim\b|stimpac/, 'stimpac'],
  [/adrenal/, 'adrenal'],
  [/medpac|kolto pack/, 'medpac'],
  [/antitox|medkit|med kit|first aid/, 'med-kit'],
  [/prosthe/, 'prosthesis'],
  [/spice|glitterstim|giggledust|andris|cilona|karrak|muon gold|yaladai|yarrock/, 'spice'],
  [/poison|toxin|venom|vial|antidote/, 'vial'],
  [/ration|food|meal/, 'rations'],
  // Tech
  [/datapad/, 'datapad'],
  [/holocron|datacron/, 'holocron'],
  [/holo(comm|recorder|projector|trace|net)/, 'holoprojector'],
  [/commlink|comlink|comm jammer|translator|scrambler/, 'comlink'],
  [/code cylinder|credit chip|datacard|data card|data chip/, 'datacard'],
  [/wristpad/, 'wristpad'],
  [/focus generator/, 'focus-generator'],
  [/crystal|kyber|adegan|ilum/, 'kyber-crystal'],
  [/blueprint|schematic/, 'blueprint'],
  [/chronometer|timer/, 'chronometer'],
  [/homing beacon|beacon/, 'beacon'],
  [/fusion cutter|cutter/, 'fusion-cutter'],
  [/glowrod|glow rod|lantern|lamp/, 'glowrod'],
  [/binocular/, 'macrobinoculars'],
  [/grappling|fibercord|cable|rope|line\b/, 'grappling-hook'],
  // Gear worn or carried
  [/stealth field/, 'stealth-field'],
  [/vocoder|respirator|breath mask|rebreather|mask\b/, 'breath-mask'],
  [/oxygen|oyxgen|air tank/, 'oxygen-tank'],
  [/sunshades|goggles|visor|glasses/, 'goggles'],
  [/helmet|helm\b|hood\b|headgear|cap\b/, 'helmet'],
  [/glove|gauntlet/, 'gloves'],
  [/shoes|sandals/, 'boots'],
  [/cloak|cape|robe|poncho|mantle/, 'cloak'],
  [/pauldron|shoulder/, 'pauldron'],
  [/belt|holster|bandolier|quiver|ammo pouch/, 'belt'],
  [/greaves|leggings|trousers/, 'greaves'],
  [/\bring\b/, 'ring'],
  [/amulet|pendant|necklace|talisman|charm/, 'amulet'],
  [/jacket|harness/, 'vest'],
  [/bracer|vambrace|armband/, 'bracer'],
  // Tools and storage
  [/tool\b/, 'tool'],
  [/backpack|smugglepack|pouch|sack|bag\b|satchel/, 'backpack'],
  [/crate|chest|hovercart|container|locker|case\b/, 'crate'],
  [/shelter|tent|bedroll|blanket|raft|sleeping/, 'camp'],
  [/bottle|canteen|flask|jug|pitcher|tankard|pot\b|bucket|camtono/, 'bottle'],
  [/sabacc|pazaak|cards|deck/, 'game-cards'],
  [/chance cubes|dice/, 'game-dice'],
  [/credits?\b/, 'credits'],
];

// Enhanced items' kinds (SW5E's type and subtype).
const ART_SLOT = { head: 'helmet', hands: 'gloves', feet: 'boots', back: 'cloak', shoulders: 'pauldron', waist: 'belt', legs: 'greaves',
  finger: 'ring', neck: 'amulet', body: 'vest', forearm: 'bracer', forearms: 'bracer' };
const ART_CONSUMABLE = { ammunition: 'ammo-cartridge', explosive: 'grenade', substance: 'vial', stimpac: 'stimpac', adrenal: 'adrenal',
  medpac: 'medpac', barrier: 'barrier', technology: 'gadget', poison: 'vial' };
const ART_CATEGORY = { Ammunition: 'ammo-cartridge', Explosive: 'grenade', Medical: 'med-kit', Spice: 'spice', AlcoholicBeverage: 'bottle',
  Storage: 'crate', Tool: 'tool', Kit: 'toolkit', Utility: 'gadget', LifeSupport: 'env-suit', Communications: 'comlink',
  DataRecordingAndStorage: 'datacard', Clothing: 'clothes', MusicalInstrument: 'instrument', GamingSet: 'game-cards',
  WeaponOrArmorAccessory: 'belt' };

/** The picture for an item (a name from art/items/). */
function artIcon(it) {
  const name = String((it && it.name) || '').toLowerCase().replace(/[’']/g, "'");
  const type = it && it.type;
  const sub = String((it && it.subtype) || '').toLowerCase();
  // Enhanced items whose kind says more than their name ("Aratech Echo Belt" is a belt; a chassis is its weapon).
  if (/^ship/i.test(type || '')) return 'starship';
  if (type === 'AdventuringGear' && ART_SLOT[sub]) {
    // A worn thing's name may say more than its slot (a jetpack worn on the back, robes on the body).
    const named = ART_BY_NAME.find(([re]) => re.test(name));
    return named ? named[1] : ART_SLOT[sub];
  }
  if (type === 'CyberneticAugmentation') return /arm|hand|leg|foot|limb/.test(name) ? 'prosthesis' : 'cybernetic';
  if (type === 'DroidCustomization') return sub === 'protocol' ? 'droid-protocol' : 'droid-part';
  if (type === 'Focus') return /wristpad/.test(name) || sub === 'tech' && !/generator/.test(name) ? 'wristpad' : /generator/.test(name) ? 'focus-generator' : 'force-focus';
  if (type === 'ItemModification') {
    if (/lightweapon/.test(sub) && /crystal|kyber|adegan|ilum|gem/.test(name)) return 'kyber-crystal';
    for (const [re, icon] of ART_BY_NAME) if (re.test(name) && ['kyber-crystal', 'power-cell'].includes(icon)) return icon;
    return 'mod-chip';
  }
  for (const [re, icon] of ART_BY_NAME) if (re.test(name)) return icon;
  if (type === 'Weapon') {
    const w = String(it.enhancedWeaponType || '');
    if (/lightweapon/i.test(w + sub)) return 'lightsaber';
    if (/blaster/i.test(w + sub)) return 'blaster-rifle';
    return 'vibroblade';
  }
  if (type === 'Armor') return /exo/.test(sub) ? 'armor-exo' : /heavy/.test(sub) ? 'armor-heavy' : 'armor-medium';
  if (type === 'Shield') return /generator/.test(sub + name) ? 'shield-generator' : 'shield-physical';
  if (type === 'Consumable' && ART_CONSUMABLE[sub]) return ART_CONSUMABLE[sub];
  const wc = String((it && it.weaponClassification) || '');
  if (/Lightweapon/.test(wc)) return 'lightsaber';
  if (/Blaster/.test(wc)) return 'blaster-pistol';
  if (/Vibroweapon/.test(wc)) return 'vibroblade';
  const ac = String((it && it.armorClassification) || '');
  if (ac === 'Shield') return 'shield-physical';
  if (ac === 'Heavy') return 'armor-heavy';
  if (ac === 'Medium') return 'armor-medium';
  if (ac === 'Light') return 'armor-light';
  return ART_CATEGORY[it && it.equipmentCategory] || (type === 'AdventuringGear' ? 'gadget' : 'crate');
}

/** What an item does, as a corner badge: ion, cryo, fire… (weapons, ammunition, explosives). */
function artBadge(it, icon) {
  const name = String((it && it.name) || '').toLowerCase();
  const dt = String((it && it.damageType) || '').toLowerCase();
  const kinds = ['blaster', 'lightsaber', 'light', 'vibro', 'ammo', 'grenade', 'mine', 'demo', 'thermal', 'launcher', 'bowcaster', 'slugthrower',
    'wrist', 'electrostaff', 'baton', 'whip', 'chakram', 'bolas', 'power-cell'];
  if (!kinds.some((k) => icon.startsWith(k)) && !/^(Ammunition|Explosive|Weapon)$/.test(String(it && it.equipmentCategory))) return '';
  const rules = [[/\bion\b/, 'ion'], [/cryo|\bcold\b|freez/, 'cryo'], [/incendiar|incinerat|flame|fire|combust/, 'fire'], [/plasma/, 'plasma'],
    [/corrosive|acid/, 'acid'], [/lightning|electrif|electro|shock|arc caster/, 'lightning'], [/sonic|deafening|noisemaker/, 'sonic'],
    [/\bgas\b|poison|toxic|venom/, 'poison'], [/\bstun\b|tranquil/, 'stun'], [/fragmentation|shatter|flechette|frag\b/, 'frag'],
    [/\bflash\b/, 'flash'], [/panic/, 'panic']];
  for (const [re, b] of rules) if (re.test(name)) return b;
  const byType = { ion: 'ion', cold: 'cryo', fire: 'fire', acid: 'acid', lightning: 'lightning', sonic: 'sonic', poison: 'poison' };
  return byType[dt] || '';
}

// The classic blade colours, and the colours a player can choose (the ✎ box).
const ART_BLADES = ['blue', 'green', 'violet', 'yellow', 'cyan', 'orange', 'white'];
const ART_COLORS = ['red', 'blue', 'green', 'violet', 'yellow', 'orange', 'cyan', 'white'];
const artHash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

/** The energy colour: the player's choice, else by what the item is. */
function artGlow(it, icon, badge) {
  if (it && ART_COLORS.includes(it.color)) return it.color;
  const name = String((it && it.name) || '').toLowerCase();
  if (icon.startsWith('lightsaber') || ['lightwhip', 'lightaxe', 'lightfist', 'kyber-crystal'].includes(icon)) {
    if (/darksaber/.test(name)) return 'white';
    if (/sith|blight|dark|crimson|bleed|inquisitor/.test(name)) return 'red';
    if (/sun ?saber|sunsaber/.test(name)) return 'yellow';
    return ART_BLADES[artHash(name) % ART_BLADES.length];
  }
  const byBadge = { ion: 'blue', cryo: 'pale', fire: 'orange', plasma: 'orange', acid: 'green', lightning: 'white', sonic: 'violet', poison: 'green',
    stun: 'cyan', flash: 'white', panic: 'violet', frag: 'red' };
  if (badge && byBadge[badge]) return byBadge[badge];
  if (/radiation|radrifle/.test(name)) return 'yellow';
  if (/heat generator/.test(name)) return 'orange';
  if (/gravity generator/.test(name)) return 'violet';
  if (/vapor projector/.test(name)) return 'accent';
  if (/disruptor/.test(name)) return 'green';
  if (icon.startsWith('blaster') || ['wrist-blaster', 'bowcaster', 'launcher', 'grenade', 'mine', 'demo-charge', 'thermal-detonator'].includes(icon)) return 'red';
  if (['electrostaff', 'baton', 'whip', 'vibroclaw', 'power-cell', 'shield-generator', 'barrier', 'stealth-field'].includes(icon)) return 'cyan';
  if (['stimpac', 'medpac', 'med-kit', 'adrenal', 'unarmed-stinger'].includes(icon)) return 'green';
  if (icon === 'unarmed-droid') return 'cyan';
  if (icon === 'spice') return ['yellow', 'violet', 'cyan', 'orange'][artHash(name) % 4];
  return 'accent';
}
/** The item's own colour (bands, paint): medical teal, explosives' hazard yellow, otherwise the theme's accent. */
const ART_MOD_PAINT = { blaster: 'red', vibroweapon: 'gold', lightweapon: 'blue', armor: 'blue', clothing: 'purple', wristpad: 'accent',
  'focus generator': 'accent', augment: 'green' };
// Items whose own colour is part of what they are (copper coils, purple matrix metal, a fried egg's yolk…).
const ART_PAINT_BY_NAME = [
  [/lightning|arc caster/, 'copper'], [/matrix armor/, 'purple'], [/beskar/, 'white'], [/chef/, 'gold'], [/bioanalysis/, 'green'],
  [/disguise kit/, 'red'], [/poisoner/, 'green'], [/brewer/, 'copper'], [/incinerator/, 'red'], [/orbalisk/, 'green'],
  [/diving suit/, 'gold'], [/flame-proof/, 'white'], [/hazard suit/, 'hazard'], [/chemical suit/, 'white'], [/water suit/, 'blue'],
  [/conductive suit/, 'copper'], [/dampening suit/, 'black'], [/emergency raft/, 'hazard'], [/fire extinguisher/, 'red'],
];
function artPaint(icon, it) {
  if (icon === 'mod-chip') return ART_MOD_PAINT[String((it && it.subtype) || '').toLowerCase()] || 'accent';
  const name = String((it && it.name) || '').toLowerCase();
  const own = ART_PAINT_BY_NAME.find(([re]) => re.test(name));
  if (own) return own[1];
  if (['medpac', 'med-kit', 'stimpac', 'adrenal', 'prosthesis'].includes(icon)) return 'med';
  if (['grenade', 'mine', 'demo-charge', 'ammo-canister', 'ammo-rocket', 'thermal-detonator', 'launcher'].includes(icon)) return 'hazard';
  if (['ammo-cartridge'].includes(icon)) return 'gold';
  return 'accent';
}

// Items with a picture of their own (art/equipment/, listed in art/names.js by dev/art.py): an item uses it, its
// family's ("Jetpack (Champion)" → jetpack), or the picture of its kind above.
const artSlug = (s) => String(s || '').toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ART_TIER_WORDS = ['basic', 'fine', 'improved', 'superior', 'champion', 'exceptional'];
const ART_TIER_RANKS = ['novice', 'apprentice', 'adept', 'journeyman', 'master', 'ancient'];
const ART_ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];
/** An enhanced item's family name: without its tier ("Jetpack (Champion)", "Fortitude Enhancer Mk II"). */
function artFamily(name) {
  return String(name || '').replace(/\s*\((Basic|Fine|Improved|Superior|Champion|Exceptional|Standard|Premium|Prototype|Advanced|Legendary|Artifact|Novice|Apprentice|Adept|Journeyman|Master|Ancient)\)\s*$/i, '')
    .replace(/\s+Mk\s+[IVX]+$/i, '').replace(/^Ring of (Novice|Apprentice|Adept|Journeyman|Master|Ancient) /i, 'Ring of ').trim();
}
/** Its tier, 1-6 (Fine … Exceptional, Mk I … VI, Novice … Ancient), or 0. */
function artTier(name) {
  const n = String(name || '').toLowerCase();
  let m = /\((\w+)\)\s*$/.exec(n);
  if (m && ART_TIER_WORDS.includes(m[1])) return ART_TIER_WORDS.indexOf(m[1]) || 0;
  if (m && ART_TIER_RANKS.includes(m[1])) return ART_TIER_RANKS.indexOf(m[1]) + 1;
  m = /\bmk\s+([ivx]+)$/.exec(n);
  if (m) return ART_ROMAN.indexOf(m[1]) + 1;
  m = /^ring of (novice|apprentice|adept|journeyman|master|ancient) /.exec(n);
  return m ? ART_TIER_RANKS.indexOf(m[1]) + 1 : 0;
}
/** The item's own picture ('eq-<name>'), or ''. */
function artOwn(it) {
  if (typeof ART_EQUIPMENT === 'undefined' || !it || !it.name) return '';
  const own = (s) => (ART_EQUIPMENT.has(s) ? 'eq-' + s : '');
  // Two items share some names (a lightweapon and a vibroweapon Saberstaff): the vibroweapon's is <name>-vibro.
  if (/Vibroweapon/.test(String(it.weaponClassification || '')) && own(artSlug(it.name) + '-vibro')) return own(artSlug(it.name) + '-vibro');
  return own(artSlug(it.name)) || own(artSlug(artFamily(it.name)));
}

// ------------------------------------------------------------- item modifications: part + effect mark + colour
// The words in a modification's name say what it does; the first group that matches gives its mark (art/items/mark-*).
const ART_MOD_MARKS = [
  ['class', /^(berserker|consular|engineer|fighter|guardian|monk|operative|scholar|scout|sentinel)\b/],
  ['str', /strength|brawny/], ['dex', /dexterity|acrobat/], ['con', /constitution/], ['int', /intelligence/], ['wis', /wisdom/],
  ['cha', /charisma|charmer|silver-tongued|performer/],
  ['fade', /fade|fading/], ['rend', /rend/], ['wither', /wither/],
  ['style', /fighting|dueling|mastery|ascendancy|supremacy|training/], ['force', /ossus|byrothsis|ferricite|phobium|echo|krayt/],
  ['stealth', /silent|obscur|conceal|inconspic|disguis|stealth|clandestine|silencer/],
  ['energy', /\bion\b|maser|disrupt|disintegr|burning|ghostfire|bright|lambent|gloom|corruption|biting|crystaliz|electrif|neuraliz/],
  ['absorb', /absorb|mitigat|dispel|insulat|imperme|dampen/], ['repel', /repel|reactive|avoidant|barbed|spiked|threaten/],
  ['store', /stor|access|process|charg|recycl|linger|magazine/],
  ['speed', /quicken|surg|rapid|agile|lightweight|\blight\b|flexib|celerity|semiauto|responsive|quick/],
  ['power', /brutal|mighty|heavy|vicious|dire|keen|piercing|siege|overload|powered|monomolecular|crippler/],
  ['guard', /reinforc|bonded|steadfast|balanced|regulat|careful|comfortable|interlock|lock|safety|defensive|guard/],
  ['range', /rang|extend|elongat|distant|seeking|target|pinpoint|precision|accuracy|focus|multispectral|optic|scope/],
  ['expand', /expand|enlarg|inflat|increas|amplif|heighten|twinned|duplex|burst/],
  ['skill', /'s\b|investigator|naturalist|survivalist|perceptive|empathic|medic|techie/],
];
// Colours for modification families: distinct, rich, readable on the dark tile.
const ART_MOD_COLORS = ['#c8463b', '#d9813a', '#d9b13c', '#8fb43a', '#3fa66a', '#2fa3a0', '#3f8bd0', '#5b63d6', '#8a55c9',
  '#c04f9a', '#b7895a', '#8e9aab'];
/** A modification's picture: { artIcon: its part, mark, axHex: its colour }. */
function modArt(it) {
  const fam = artFamily(it.name).replace(/\s*\([^)]*\)\s*$/, ''); // modifications' tiers have more names (Dueling, Fighting…)
  const sub = artSlug(it.subtype || '');
  const part = artSlug(fam.split(/\s+/).pop());
  const general = typeof ART_GENERAL !== 'undefined' ? ART_GENERAL : null;
  const icon = general && general.has(`mod-${sub}-${part}`) ? `mod-${sub}-${part}` : 'mod-chip';
  const words = fam.toLowerCase().split(/\s+/).slice(0, -1).join(' ') || fam.toLowerCase();
  const hit = ART_MOD_MARKS.find(([, re]) => re.test(words));
  let mark = hit ? hit[0] : '';
  if (mark === 'class') mark = `class-${words.split(' ')[0]}`;
  if (mark && general && !general.has(`mark-${mark}`) && !mark.startsWith('class-')) mark = '';
  return { artIcon: icon, mark, axHex: ART_MOD_COLORS[artHash(fam) % ART_MOD_COLORS.length] };
}

/** Everything the tile needs for an item. `kind` is the general picture, which also decides colours and badges. */
function itemArt(it) {
  if (it && it.type === 'ItemModification' && !it.artIcon) {
    const m = modArt(it);
    const rarity = typeof invRarity === 'function' ? invRarity(it) : String(it.rarityText || '').toLowerCase();
    return { icon: m.artIcon, kind: m.artIcon, badge: '', mark: m.mark, axHex: m.axHex, glow: 'accent', paint: 'accent', tier: artTier(it.name),
      rarity: ['standard', 'premium', 'prototype', 'advanced', 'legendary', 'artifact'].includes(rarity) ? rarity : '' };
  }
  const kind = (it && (it.artKind || it.artIcon)) || artIcon(it || {});
  const icon = (it && it.artIcon) || artOwn(it) || kind;
  const badge = artBadge(it || {}, kind);
  const rarity = typeof invRarity === 'function' ? invRarity(it) : String((it && it.rarityText) || '').toLowerCase();
  return { icon, kind, badge, glow: artGlow(it || {}, kind, badge), paint: artPaint(kind, it), tier: artTier(it && it.name),
    rarity: ['standard', 'premium', 'prototype', 'advanced', 'legendary', 'artifact'].includes(rarity) ? rarity : '' };
}

/**
 * The tile's HTML: size '' (40 px), 'sm', 'lg' or 'xl'. A tile for a named item opens its card on a click, tap or
 * Enter (info.js), unless `opts.inert` (inside another control, e.g. a search suggestion); `opts.custom`: the
 * character's own custom item.
 */
function itemTile(it, size = '', title = '', opts = {}) {
  const a = itemArt(it);
  const cls = ['art-tile', size, a.rarity ? `rar-${a.rarity}` : '', `glow-${a.glow}`, `ax-${a.paint}`].filter(Boolean).join(' ');
  const hex = (it && it.skin) || a.axHex || '';
  const skin = /^#[0-9a-f]{6}$/i.test(hex) ? ` style="--ax:${hex}"` : '';
  const q = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const open = it && it.name && !opts.inert
    ? ` data-item="${q(it.name)}"${opts.custom ? ' data-custom="1"' : ''} role="button" tabindex="0" aria-label="${q(`About ${title || it.name}`)}"`
    : ' aria-hidden="true"';
  return `<span class="${cls}"${open}${skin}${title ? ` title="${q(title)}"` : ''}><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${a.icon}"/></svg>`
    + `${a.badge ? `<svg class="art-badge b-${a.badge}" viewBox="0 0 64 64"><use href="#i-badge-${a.badge}"/></svg>` : ''}`
    + `${a.mark ? `<svg class="art-badge art-mark" viewBox="0 0 64 64"><use href="#i-mark-${a.mark}"/></svg>` : ''}`
    + `${a.tier ? `<i class="art-tier" style="--n:${a.tier}"></i>` : ''}</span>`;
}

// ------------------------------------------------------------- the Unarmed Strike, by species
// What a species strikes with, from its own trait that makes unarmed strikes (SW5E: "Your claws are natural weapons,
// which you can use to make unarmed strikes", "Your unarmed strikes deal 1d4…"); droids strike with a metal fist.
const ART_UNARMED = [
  [/claw|talon|dewclaw|arm blade|tooth and nail/, 'unarmed-claws'],
  [/\bbite\b|teeth|fangs|tusks|jaws/, 'unarmed-bite'],
  [/horn|skull|head crest|snout|hoo(f|ves)/, 'unarmed-horns'],
  [/\btail\b/, 'unarmed-tail'],
  [/stinger/, 'unarmed-stinger'],
  [/unarmed strikes deal/, 'unarmed-martial'],
];
// Colour words in SW5E's skin and fur descriptions ("Pale to dark brown", "Gold to yellow-brown with dark stripes").
const ART_SKIN = [
  ['dark brown', '#5b3a26'], ['dark grey', '#555a62'], ['dark gray', '#555a62'], ['light tones', '#e0b894'], ['dark tones', '#6b4630'],
  ['pale', '#efd0b8'], ['pasty', '#ecd8c8'], ['light', '#e0b894'], ['cream', '#eadcbd'], ['chalk', '#e6e3dc'], ['white', '#e9e5dd'],
  ['tan', '#c4925f'], ['olive', '#8c9a52'], ['chestnut', '#7a4a2c'], ['mahogany', '#6e3326'], ['brown', '#8a5a3a'], ['ebony', '#2e2826'], ['black', '#34302f'],
  ['silver', '#b8c0c8'], ['gray', '#8e939b'], ['grey', '#8e939b'], ['green', '#5fa052'], ['teal', '#3a9e9a'], ['turquoise', '#3fb0aa'], ['cyan', '#46b6c4'],
  ['blue', '#4f86c9'], ['purple', '#8257b8'], ['violet', '#8a5ac0'], ['crimson', '#a8323a'], ['scarlet', '#c03a32'], ['red', '#b7433a'],
  ['salmon', '#e3988a'], ['pink', '#e39aa6'], ['orange', '#d9813a'], ['golden', '#c9a03c'], ['gold', '#c9a03c'], ['yellow', '#d9c04a'],
];
/** The first colour a description names (#hex), or ''. */
function artSkinColor(text) {
  const s = String(text || '').toLowerCase();
  let best = null;
  for (const [w, hex] of ART_SKIN) {
    const i = s.search(new RegExp(`\\b${w}`));
    if (i >= 0 && (!best || i < best.i || (i === best.i && w.length > best.w.length))) best = { i, w, hex };
  }
  return best ? best.hex : '';
}
/**
 * The Unarmed Strike's picture for a species: { artIcon, skin } for itemTile. `ref` is SW5E's species entry (traits,
 * skin and hair colours), `chars` the character's own description (its Skin or Hair, if written down).
 */
function unarmedArt(speciesName, ref, chars) {
  const name = String(speciesName || '');
  const r = ref || {};
  if (/^droid/i.test(name)) return { name: 'Unarmed Strike', artIcon: 'unarmed-droid', skin: artSkinColor((chars || {}).Skin) || '#9aa3ad' };
  const traits = (Array.isArray(r.traits) ? r.traits : []).filter((t) => /natural weapon|unarmed strike/i.test(t.description || ''))
    .map((t) => `${t.name} ${t.description}`).join(' ').toLowerCase();
  const kind = (ART_UNARMED.find(([re]) => re.test(traits)) || [null, 'unarmed-fist'])[1];
  // Furred species strike with fur, so the hair colour; the character's own words first.
  const furry = /\bfur|furry|hair covered|furred/i.test(`${r.distinctions || ''} ${r.skinColorOptions || ''}`);
  const own = furry ? (chars || {}).Hair || (chars || {}).Skin : (chars || {}).Skin;
  const listed = furry ? `${/brown/i.test(r.hairColorOptions || '') ? 'brown' : ''} ${r.hairColorOptions || ''} ${r.skinColorOptions || ''}` : r.skinColorOptions;
  return { name: 'Unarmed Strike', artIcon: kind, skin: artSkinColor(own) || artSkinColor(listed) || '#c99a6b' };
}

if (typeof module !== 'undefined') module.exports = { artIcon, artBadge, artGlow, itemArt, itemTile, unarmedArt, artSkinColor, artFamily, artTier, artSlug, modArt, ART_COLORS };
