"""Briefs for drawing a dedicated picture for every piece of SW5E equipment that isn't used up (art/README.md).

  python dev/art-manifest.py            writes dist/art/batches/<batch>.md (one brief per drawing batch) and prints
                                        what each batch holds and which pictures still have to be drawn
  python dev/art-manifest.py --missing  only lists the dedicated pictures not drawn yet

A dedicated picture is art/equipment/<slug>.svg (symbol i-eq-<slug>), the slug of the item's name ("Duravlex fiber armor" →
duravlex-fiber-armor.svg); enhanced items in tiers ("Jetpack (Champion)", "Fortitude Enhancer Mk II") share their
family's picture (jetpack.svg, fortitude-enhancer.svg), with the tier shown by the tile. Some earlier, general
pictures already show one item exactly (ALIAS below: blaster-pistol.svg is the Blaster pistol); those items are not
drawn again. Item modifications are drawn as their part (part-*.svg) and an effect mark (mark-*.svg), see MODS.
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ITEMS = ROOT / 'art' / 'equipment'
OUT = ROOT / 'dist' / 'art' / 'batches'
CATALOG = json.loads((ROOT / 'app' / 'data' / 'sw5e' / 'catalog.json').read_text(encoding='utf-8'))['items']

CONSUMABLE_CATS = {'Ammunition', 'Explosive', 'Spice', 'AlcoholicBeverage'}
CONSUMABLE_NAMES = {'Medpac', 'Antitoxkit', 'Traumakit', 'Poison', 'Repair kit', 'Emergency battery',
                    'Emergency rations (one day\'s)', 'Field rations (one day\'s)'}
TIERS = r'Basic|Fine|Improved|Superior|Champion|Exceptional|Standard|Premium|Prototype|Advanced|Legendary|Artifact|Novice|Apprentice|Adept|Journeyman|Master|Ancient'


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower().replace("'", '')).strip('-')


def family(name):
    """An enhanced item's family: its name without the tier ("Jetpack (Champion)" → "Jetpack")."""
    n = re.sub(rf'\s*\(({TIERS})\)\s*$', '', name)
    n = re.sub(r'\s+Mk\s+[IVX]+$', '', n)
    n = re.sub(r'^Ring of (Novice|Apprentice|Adept|Journeyman|Master|Ancient) ', 'Ring of ', n)
    return n.strip()


# Earlier pictures that already show exactly this item (not drawn again).
ALIAS = {
    'Blaster pistol': 'blaster-pistol', 'Hold-out': 'blaster-holdout', 'Heavy pistol': 'blaster-heavy-pistol',
    'Blaster carbine': 'blaster-carbine', 'Blaster rifle': 'blaster-rifle', 'Sniper rifle': 'blaster-sniper',
    'Heavy repeater': 'blaster-repeater', 'Shotgun': 'blaster-shotgun', 'Bowcaster': 'bowcaster', 'Rocket launcher': 'launcher',
    'Slugthrower': 'slugthrower', 'Wristblaster': 'wrist-blaster', 'Blaster cannon': 'blaster-cannon',
    'Lightsaber': 'lightsaber', 'Shotosaber': 'lightsaber-shoto', 'Doublesaber': 'lightsaber-double',
    'Crossguard saber': 'lightsaber-crossguard', 'Pikesaber': 'lightsaber-pike', 'Saberwhip': 'lightwhip',
    'Lightaxe': 'lightaxe', 'Lightfist': 'lightfist', 'Vibroblade': 'vibroblade', 'Vibroknife': 'vibroknife',
    'Vibroaxe': 'vibroaxe', 'Vibrohammer': 'vibrohammer', 'Electrostaff': 'electrostaff', 'Vibrospear': 'vibrospear',
    'Riot baton': 'baton', 'Vibrowhip': 'whip', 'Chakram': 'chakram', 'Bolas': 'bolas-net', 'Vibroclaw': 'vibroclaw',
    'Vibroshield': 'vibroshield', 'Heavy physical shield': 'shield-physical', 'Medium shield generator': 'shield-generator',
    'Heavy exoskeleton': 'armor-exo', 'Assault armor': 'armor-heavy', 'Mesh armor': 'armor-medium', 'Fiber armor': 'armor-light',
    'Glowrod': 'glowrod', 'Macrobinoculars': 'macrobinoculars', 'Grappling hook': 'grappling-hook', 'Binders': 'binders',
    'Homing beacon': 'beacon', 'Chronometer': 'chronometer', 'Fusion cutter': 'fusion-cutter', 'Computer spike': 'slicer-spike',
    'Hydrospanner': 'tool', 'Backpack': 'backpack', 'Crate': 'crate', 'Sabacc deck': 'game-cards', 'Chance cubes': 'game-dice',
    'Datapad': 'datapad', 'Holocomm': 'holoprojector', 'Commlink': 'comlink', 'Datacard': 'datacard', 'Holocron': 'holocron',
    'Wristpad': 'wristpad', 'Focus generator': 'focus-generator', 'Jetpack': 'jetpack', 'Respirator': 'breath-mask',
    'Space suit': 'env-suit', 'Stealth field generator': 'stealth-field', 'Power belt': 'belt', 'Sunshades': 'goggles',
    'Oyxgen tank': 'oxygen-tank', 'Forearm prosthesis': 'prosthesis', 'Eye prosthesis': 'cybernetic', "Mechanic's kit": 'toolkit',
    'Clothes, common': 'clothes', 'Tracker utility vest': 'vest', 'Tent, two-person': 'camp', 'Mandoviol': 'instrument',
    'Blueprint': 'blueprint', 'Credit chip': 'credits', 'Vial': 'vial', 'Bottle': 'bottle',
}

# Upgrades: the item builds on the base's drawing (the same silhouette, visibly better materials and details).
UPGRADES = {
    'Duranium combat suit': 'Combat suit', 'Duravlex fiber armor': 'Fiber armor', 'Fleximetal fiber armor': 'Fiber armor',
    'Neutronium mesh': 'Mesh armor', 'Plastoid composite': 'Composite armor', 'Beskar weave armor': 'Weave armor',
    'Laminanium assault': 'Assault armor', 'Durafiber battle armor': 'Battle armor', 'Durasteel exoskeleton': 'Heavy exoskeleton',
    'Bone light shield': 'Light physical shield', 'Crystadium medium shield': 'Medium physical shield',
    'Quadanium heavy shield': 'Heavy physical shield', 'Heavy carbine': 'Blaster carbine', 'Heavy bowcaster': 'Bowcaster',
    'Heavy shotgun': 'Shotgun', 'Heavy slugpistol': 'Slugpistol', 'Light slugpistol': 'Slugpistol', 'Heavy blaster rifle': 'Blaster rifle',
    'Hand BKG': 'BKG', 'Dire vibroblade': 'Vibroblade', 'Vibrobattleaxe': 'Vibroaxe', 'Light shield generator': 'Medium shield generator',
    'Heavy shield generator': 'Medium shield generator', 'Underwater respirator': 'Respirator', 'Commlink, hands-free': 'Commlink',
    'Light repeater': 'Heavy repeater', 'Doubleshoto': 'Shotosaber', 'Splitshoto': 'Shotosaber', 'Guard shoto': 'Shotosaber',
    'Martial lightsaber': 'Lightsaber', 'Saberstaff': 'Doublesaber', 'Lightsaber pike': 'Pikesaber', 'Electrowhip': 'Vibrowhip',
    'Shock whip': 'Vibrowhip', 'Riot shocker': 'Riot baton', 'Vibrobaton': 'Riot baton', 'Electrohammer': 'Vibrohammer',
    'Electrovoulge': 'Vibrospear', 'Hooked vibroblade': 'Vibroblade', 'Jagged vibroblade': 'Vibroblade',
}
# Weapon lines: what every member shares, in each of its forms (pistol, carbine, rifle, sniper, cannon).
LINES = {
    'Cryo': 'frost: a pale-blue coolant tank and coiled cooling lines, frosted vents, a rime-crusted muzzle',
    'Ion': 'ion: stacked blue capacitor rings around the barrel, insulated grip panels, a forked ion emitter',
    'Incinerator': 'fire: a fuel canister, a heat-shielded barrel with cooling fins, a pilot flame at the nozzle',
    'Disruptor': 'disintegration: a menacing green-lit chamber, three jagged emitter prongs, scorched dark metal',
    'Lightning': 'lightning: exposed copper coils, a tesla-ball emitter with arcs crackling between prongs',
    'Sonic': 'sound: a flared resonator dish or horn at the muzzle, ribbed amplifier rings, a speaker grille',
    'Switch': 'two modes: twin over-under barrels with a big selector switch and a mode light',
    'Shatter': 'kinetic: a segmented crystalline slug chamber, a heavy recoil spring, a blunt reinforced muzzle',
    'Smart': 'targeting: a sensor head with a glowing lens array, a small targeting screen, gyro-stabilised barrel',
}

# The drawing batches: which items each one draws (base items by name; "fam:" an enhanced family; "type:" every
# family of an enhanced type not listed elsewhere).
BATCHES = {
    'e1-cryo-ion-fire-disruptor': ['Cryo pistol', 'Cryo carbine', 'Cryo rifle', 'Cryo cannon', 'Ion pistol', 'Ion carbine', 'Ion rifle',
        'Ion cannon', 'Incinerator pistol', 'Incinerator carbine', 'Incinerator rifle', 'Incinerator sniper', 'Disruptor pistol',
        'Disruptor carbine', 'Disruptor rifle', 'Disruptor sniper', 'Vapor projector', 'Radiation cannon'],
    'e2-lightning-sonic-switch-shatter-smart': ['Lightning pistol', 'Lightning carbine', 'Lightning rifle', 'Lightning cannon', 'ARC caster',
        'Sonic pistol', 'Sonic carbine', 'Sonic rifle', 'Sonic cannon', 'Switch pistol', 'Switch carbine', 'Switch rifle', 'Switch sniper',
        'Switch cannon', 'Shatter pistol', 'Shatter rifle', 'Shatter cannon', 'Smart pistol', 'Smart cannon'],
    'w1-pistols-slug-wrist': ['Light pistol', 'Hand blaster', 'Hand cannon', 'Revolver', 'Slugpistol', 'Light slugpistol', 'Heavy slugpistol',
        'Needler', 'Wrist launcher', 'Wristrifle', 'Shoulder blaster', 'Shoulder cannon', 'Hand BKG', 'Energy slingshot',
        'fam:Charric Pistol', 'fam:Flashy', 'fam:Sparkles', 'fam:Torchy', 'fam:Hewey'],
    'w2-rifles-carbines-shotguns': ['Carbine rifle', 'Heavy carbine', 'Stealth carbine', 'Hunting rifle', 'Cycler rifle', 'Heavy blaster rifle',
        'Beam rifle', 'Affixed Rifle', 'IWS', 'Radrifle', 'Bo-rifle', 'Tranquilizer rifle', 'Subrepeater', 'Light repeater', 'Scattergun',
        'Heavy shotgun', 'Scatter blaster', 'Marksman blaster', 'fam:Charric Rifle', 'fam:AB-75 Bo-Rifle', 'fam:J-19 Bo-Rifle'],
    'w3-heavy-snipers-launchers-bows': ['Anti-materiel blaster', 'Anti-materiel rifle', 'Nightstinger rifle', 'Railgun', 'Repeating blaster',
        'Rotary cannon', 'Chaingun', 'Assault cannon', 'BKG', 'Sentry gun', 'Flechette cannon', 'Grenade launcher', 'Mortar launcher',
        'Torpedo launcher', 'Rocket rifle', 'Heavy bowcaster', 'Lightbow', 'Energy bow', 'Compound bow', 'Shortbow', 'Bolt-thrower',
        'fam:Xerrol Nightstinger Rifle', 'fam:Shotgun Axe'],
    'l1-lightweapons': ['Lightblade', 'Lightclub', 'Lightdagger', 'Lightstaff', 'Sabermace', 'Sicklesaber', 'Lightbaton', 'Lightcutlass',
        'Saberspear', 'Wristsaber', 'Bitesaber', 'Blightsaber', 'Brightsaber', 'Broadsaber', 'Bustersaber', 'Great-saber', 'Guard shoto',
        'Lightfoil', 'Lightkatana', 'Lightnodachi'],
    'l2-lightweapons': ['Martial lightsaber', 'Doubleshoto', 'Dual-phase saber', 'Lightglaive', 'Sith saber', 'Splitsaber', 'Splitshoto',
        'Warsaber', 'Chained lightdagger', 'Claymoresaber', 'Crosssaber', 'Lightring', 'Lightsaber pike', 'Phase knife', 'Retrosaber',
        'Saberaxe', 'Sabergauntlet', 'Saberstaff', 'Sunsaber', 'fam:Darksaber', 'fam:Inquisitor Saber'],
    'v1-vibroweapons': ['Dire vibroblade', 'Doubleblade', 'Doublesword', 'Echostaff', 'Electrobaton', 'Electrohammer', 'Hidden blade', 'Net',
        'Techblade', 'Techstaff', 'Vibrobattleaxe', 'Vibrobuster', 'Vibroflail', 'Vibroglaive', 'Vibrokatana', 'Vibronodachi', 'Vibropike',
        'Vibrorapier', 'Vibrostiletto', 'Vibrosword'],
    'v2-vibroweapons': ['Vibrotonfa', 'War hat', 'Warsword', 'Cesta', 'Chained dagger', 'Disguised blade', 'Disruptorshiv', 'Electrovoulge',
        'Electrowhip', 'Hooked vibroblade', 'Jagged vibroblade', 'Riot shocker', 'Shock whip', 'Vibrobaton', 'Vibroclaymore', 'Vibrolance',
        'Wristblade', 'Neuronic whip'],
    'v3-simple-vibroweapons': ['Diresword', 'Nervebaton', 'Techaxe', 'Vibrodagger', 'Vibrodart', 'Vibroknuckler', 'Vibromace', 'Vibrosabre',
        'Vibrostaff', 'Atlatl', 'Electroprod', 'Mancatcher', 'Stun gauntlet', 'Vibroclaw', 'Vibrocutlass', 'Vibrocutter', 'Saberstaff|vibro',
        'Bo-rifle|vibro',
        'fam:Blaster Chassis', 'fam:Vibroweapon Chassis', 'fam:Lightweapon Chassis'],
    'a1-armor': ['Combat suit', 'Duranium combat suit', 'Duravlex fiber armor', 'Fleximetal fiber armor', 'Composite armor', 'Plastoid composite',
        'Neutronium mesh', 'Weave armor', 'Beskar weave armor', 'Laminanium assault', 'Battle armor', 'Durafiber battle armor',
        'Durasteel exoskeleton', 'fam:Adapted Armor', 'fam:Jensaarai Armor', "fam:Mandalorian Beskar'gam", 'fam:Matrix Armor',
        'fam:Orbalisk Armor', 'fam:Reactive Ultrachrome Armor', "fam:Viir Agathys's Armor", 'fam:Armor Chassis'],
    'a2-shields-chassis': ['Light physical shield', 'Bone light shield', 'Medium physical shield', 'Crystadium medium shield',
        'Quadanium heavy shield', 'Light shield generator', 'Heavy shield generator', 'fam:Verpine Auto-Shielding Unit', 'fam:Shield Chassis',
        'fam:Cloak Chassis', 'fam:Pants Chassis', 'fam:Tunic Chassis', 'fam:Handwraps Chassis', 'fam:Handwraps',
        'fam:Focus Generator Chassis', 'fam:Wristpad Chassis', 'fam:Ship Armor', 'fam:Ship Shield', 'fam:Ship Weapon'],
    'g1-utility': ['Bedroll', 'Blanket', 'Fibercord cable, 50 ft (rolled)', 'Heat generator', 'Mess kit', 'Mirror', 'Ram, portable',
        'Restraining bolt', 'Security spike', 'Shovel', 'Fire extinguisher', 'Gravity generator', 'Holotrace device', 'Holorecorder',
        'Comm jammer', 'Personal translator', 'Pocket scrambler', 'Vocoder mask'],
    'g2-life-support': ['Emergency shelter', 'Underwater respirator', 'Water suit', 'Chemical suit', 'Conductive suit', 'Dampening suit',
        'Diving suit', 'Emergency raft', 'Flame-proof suit', 'Hazard suit', 'Mind-shielding suit', 'Stabilizer suit', 'fam:Flightsuit',
        'fam:Respiration Facilitator', 'fam:Atmospheric Decanting Vessel', 'Commlink, hands-free', 'Code cylinder', 'Stylus pen'],
    'k1-kits': ["Alchemist's kit", 'Archaeologist kit', "Artillerist's kit", 'Bioanalysis kit', "Biochemist's kit", "Brewer's kit",
        "Chef's kit", 'Demolitions kit', 'Disguise kit', 'Forgery kit', 'Munitions kit', "Poisoner's kit", 'Scavenging kit', 'Security kit',
        "Slicer's kit", "Spicer's kit", "Trapper's kit"],
    'k2-implements': ["Armormech's implements", "Armstech's implements", "Artificer's implements", "Artist's implements",
        "Astrotech's implements", "Audiotech's implements", "Biotech's implements", "Constructor's implements", "Cybertech's implements",
        "Gadgeteer's implements", "Geneticist's implements", "Jeweler's implements", "Surveyor's implements", "Synthweaver's implements",
        "Tinker's implements", "Writer's implements"],
    's1-storage-clothing': ['Bottle', 'Camtono', 'Canteen', 'Chest', 'Pitcher', 'Pouch', 'Smugglepack', 'Bucket', 'Flask', 'Hovercart', 'Jug',
        'Pot', 'Sack', 'Tankard', 'Vial', 'Clothes, clandestine', 'Clothes, costume', 'Clothes, dress uniform', 'Clothes, fine',
        "Clothes, traveler's"],
    'c1-data-games-music': ['Credit chip', 'Datacron', 'Repelling wristpad', 'Dejarik set', 'Chatta-ragul set', 'Kirgatz set', 'Pazaak deck',
        'Bandfill', 'Chindinkalu horn', 'Drum', 'Fanfar', 'Fizzz', 'Flute', 'Kloo horn', 'Lute', 'Ommni box', 'Shawm', 'Slitherhorn', 'Traz',
        'Valahorn', 'Xantha'],
    'x1-accessories': ['Ammo-feed belt', 'Bandolier', 'Bipod', 'Friction-grip gear', 'Holster', 'Remote detonator', 'Rocket boots', 'Rocketpack',
        'Tripod', 'Ammo Pouch', 'Propulsion pack', 'Quiver', 'Repulsor pack', 'Shock gloves', 'fam:Aratech Echo Belt',
        'fam:Aratech Sound Dampening Boots', 'fam:Boots of Bounding', 'fam:Boots of Hiding', 'fam:Mag-lock Boots', 'fam:Slipstream Kickers'],
    'x2-named-gear': ['fam:Baragwin Stealth Unit', 'fam:Beemon Cardio-Regulator', 'fam:CNS Strength Enhancer', 'fam:GNS Strength Enhancer',
        'fam:Strength Enhancer', 'fam:Cape of the Orator', 'fam:Circlet of Persistence', 'fam:Cowl of the Professional', 'fam:Darkvision Goggles',
        'fam:Defel Mimicker', 'fam:Dominator Belt', 'fam:Gauntlets of the Warrior', 'fam:Goggles of the Tinkerer', 'fam:Jensaarai Cloak',
        'fam:Jensaarai Headgear', 'fam:Mandalorian Helmet', "fam:Mandalorian Shuk'orok", 'fam:Mantle of the Anomic',
        'fam:Necklace of Determination', 'fam:Pauldron of Retribution', 'fam:Reverse-Engineered Crushgaunts', 'fam:Ring of Force Storing',
        'fam:Ring of Tech Storing', 'fam:Sith Strength Belt', 'fam:Taozin Amulet', 'fam:Vambraces of the Outrider',
        'fam:Wrist-Mounted Grappling Hook'],
    'x3-robes': ["fam:Jedi Padawan's Robe", "fam:Jedi Knight's Robe", "fam:Jedi Master's Robe", "fam:Sith Acolyte's Robe",
        "fam:Sith Warrior's Robe", "fam:Sith Lord's Robe", 'Arm prosthesis', 'Ear prosthesis', 'Facial prosthesis', 'Foot prosthesis',
        'Hand prosthesis', 'Leg prosthesis', 'Throat prosthesis', 'Torso prosthesis'],
    'cy1-cybernetics': 'type:CyberneticAugmentation:0',
    'cy2-cybernetics': 'type:CyberneticAugmentation:1',
    'dr1-droid-parts': 'type:DroidCustomization',
}


def facts(it):
    bits = [it.get('equipmentCategory') or it.get('type'), it.get('subtype'), it.get('weaponClassification'), it.get('armorClassification')]
    if it.get('damageNumberOfDice'):
        bits.append(f"{it['damageNumberOfDice']}d{it.get('damageDieType')} {it.get('damageType') or ''}".strip())
    if it.get('ac'):
        bits.append(f"AC {it['ac']}")
    if it.get('properties'):
        bits.append(', '.join(p for p in it['properties'] if p))
    if it.get('weight'):
        bits.append(f"{it['weight']} lb")
    if it.get('cost'):
        bits.append(f"{it['cost']} cr")
    return ' · '.join(str(b) for b in bits if b)


def text(it, n=420):
    t = re.sub(r'\s+', ' ', re.sub(r'[_*#>|]', '', str(it.get('description') or it.get('text') or ''))).strip()
    return (t[:n] + '…') if len(t) > n else t


def entries():
    """{ batch: [ {file, title, items: [catalog items], note} ] } and the items that get a dedicated picture."""
    by_name = {}
    for it in CATALOG:
        key = it['name'] + ('|vibro' if 'Vibroweapon' in str(it.get('weaponClassification')) and it['name'] in ('Saberstaff', 'Bo-rifle') else '')
        by_name[key] = it
    fams = defaultdict(list)
    for it in CATALOG:
        if it.get('type') and it['type'] not in ('Consumable', 'ItemModification'):
            fams[(it['type'], family(it['name']))].append(it)
    fam_by_name = {f: (t, f) for (t, f) in fams}
    used = set()
    out = {}
    for batch, spec in BATCHES.items():
        rows = []
        if isinstance(spec, str):
            _, typ, *part = spec.split(':')
            names = sorted(f for (t, f) in fams if t == typ)
            if part:
                half = (len(names) + 1) // 2
                names = names[:half] if part[0] == '0' else names[half:]
            spec = ['fam:' + n for n in names]
        for want in spec:
            if want.startswith('fam:'):
                key = fam_by_name.get(want[4:])
                if not key:
                    print('no family', want, file=sys.stderr)
                    continue
                its = fams[key]
                title = key[1]
            else:
                it = by_name.get(want)
                if not it:
                    print('no item', want, file=sys.stderr)
                    continue
                its = [it]
                title = want
            if title in ALIAS:
                continue
            used.add(title.split('|')[0])
            note = ''
            if title in UPGRADES:
                base = UPGRADES[title]
                note = f'Builds on **{base}** (`{ALIAS.get(base) or slug(base)}.svg`): the same silhouette and construction, visibly upgraded.'
            line = next((k for k in LINES if title.startswith(k + ' ') or title == k), None)
            if line:
                note += f' Member of the **{line}** line: {LINES[line]}.'
            if title.endswith('|vibro'):
                note = (note + ' The vibroweapon of this name (there is also a ' + ('lightweapon' if 'Saber' in title else 'blaster')
                        + ' one, drawn separately): a vibro-bladed version.').strip()
            rows.append({'file': slug(title.replace('|', ' ')) + '.svg', 'title': title.replace('|vibro', ' (vibroweapon)'), 'items': its, 'note': note.strip()})
        out[batch] = rows
    return out, used


def brief(batch, rows):
    lines = [f'# Batch {batch}: {len(rows)} pictures', '',
             'One file each in `art/equipment/`, following `art/README.md` (and its "Dedicated pictures" section). Facts and '
             'text are SW5E\'s own: draw the item they describe.', '']
    for r in rows:
        it = r['items'][0]
        tiers = f" ({len(r['items'])} tiers share it)" if len(r['items']) > 1 else ''
        lines.append(f"## `{r['file']}`: {r['title']}{tiers}")
        lines.append(f"- {facts(it)}")
        if r['note']:
            lines.append(f"- {r['note']}")
        if text(it):
            lines.append(f"- SW5E: {text(it)}")
        lines.append('')
    return '\n'.join(lines)


def main():
    out, used = entries()
    have = {p.stem for p in ITEMS.glob('*.svg')}
    if '--missing' in sys.argv:
        for batch, rows in out.items():
            miss = [r['file'] for r in rows if r['file'][:-4] not in have]
            if miss:
                print(f'{batch}: {len(miss)} to draw: {", ".join(miss)}')
        return
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for batch, rows in out.items():
        (OUT / f'{batch}.md').write_text(brief(batch, rows), encoding='utf-8')
        drawn = sum(r['file'][:-4] in have for r in rows)
        total += len(rows)
        print(f'{batch:42} {len(rows):3} pictures ({drawn} drawn)')
    # Everything not used up should be in a batch, an alias, or a tier of a family.
    skipped = []
    for it in CATALOG:
        if it.get('equipmentCategory') and it['equipmentCategory'] not in CONSUMABLE_CATS and it['name'] not in CONSUMABLE_NAMES:
            if it['name'] not in used and it['name'] not in ALIAS:
                skipped.append(it['name'])
        elif it.get('type') and it['type'] not in ('Consumable', 'ItemModification'):
            f = family(it['name'])
            if f not in used and f not in ALIAS and it['name'] not in ALIAS and f not in ('Weapon', 'Armor', 'Shield', 'Focus Generator', 'Wristpad',
                    'Jetpack', 'Rocket Boots', 'Rocketpack', 'Smugglepack', 'Binders', 'Camtono', 'Credit Chip', 'Remote Detonator',
                    'Restraining Bolt', 'Clothes, Clandestine', 'Holocron', 'Datacron', 'Blueprint', 'Tool', 'Bolas', 'Net', 'Grenade Launcher',
                    'Shoulder Cannon', 'Torpedo Launcher'):
                skipped.append(f)
    print(f'{total} pictures in {len(out)} batches; not in any batch: {", ".join(sorted(set(skipped))) or "none"}')


if __name__ == '__main__':
    main()


# ------------------------------------------------------------- item modifications: parts and effect marks
# A modification's picture is its part (art/items/mod-<subtype>-<part>.svg: the component it is) with a mark for what
# it does (art/items/mark-<effect>.svg) and a colour of its own (app/art.js modArt). The briefs list each part with
# the modification families that use it, and each mark with the effect words it stands for.
MOD_MARKS = {
    'str': 'Strength: a clenched fist / flexed arm', 'dex': 'Dexterity: a feather or a swift curved arrow',
    'con': 'Constitution: a heart with a pulse', 'int': 'Intelligence: a brain-like circuit node',
    'wis': 'Wisdom: an open eye', 'cha': 'Charisma: a radiant star or speech mark',
    'fade': 'fadecasting / fading: a figure dissolving into dots', 'rend': 'rendcasting / rending: three tearing slashes',
    'wither': 'withercasting / withering: a drooping, wilting sprout', 'range': 'range and accuracy: a crosshair with arrows outward',
    'expand': 'bigger area or more targets: four arrows bursting outward', 'absorb': 'absorbing and resisting: a spiral drawn inward',
    'repel': 'repelling and punishing attackers: a shield with spikes or a rebound arrow', 'store': 'storing and charging: a battery cell with bars',
    'stealth': 'stealth and concealment: an eye with a slash', 'speed': 'speed and agility: double chevrons',
    'power': 'damage and force: a jagged impact star', 'guard': 'reinforcement and safety: a shield with a check-like brace',
    'energy': 'energy, light and dark: a crackling orb', 'skill': 'skills and know-how: an open book with a star',
    'style': 'fighting styles and mastery: crossed blades', 'force': 'the Force: concentric ripples around a dot',
}
MOD_MARK_WORDS = {
    'str': r'strength|brawny', 'dex': r'dexterity|acrobat', 'con': r'constitution', 'int': r'intelligence', 'wis': r'wisdom', 'cha': r'charisma|charmer|silver-tongued|performer',
    'fade': r'fade|fading', 'rend': r'rend', 'wither': r'wither', 'range': r'rang|extend|elongat|distant|seeking|target|pinpoint|precision|accuracy|focus|multispectral|optic|scope',
    'expand': r'expand|enlarg|inflat|increas|amplif|heighten|twinned|duplex|burst', 'absorb': r'absorb|mitigat|dispel|insulat|imperme|dampen',
    'repel': r'repel|reactive|avoidant|barbed|spiked|threaten', 'store': r'stor|access|process|charg|recycl|linger|magazine',
    'stealth': r'silent|obscur|conceal|inconspic|disguis|stealth|clandestine|silencer', 'speed': r'quicken|surg|rapid|agile|lightweight|light\b|flexib|celerity|semiauto|responsive|quick',
    'power': r'brutal|mighty|heavy|vicious|dire|keen|piercing|siege|overload|powered|monomolecular|crippler', 'guard': r'reinforc|bonded|steadfast|balanced|regulat|careful|comfortable|interlock|lock|safety|defensive|guard',
    'energy': r'ion|maser|disrupt|disintegr|burning|ghostfire|bright|lambent|gloom|corruption|biting|crystaliz|electrif|neuraliz',
    'skill': r"'s\b|investigator|naturalist|survivalist|perceptive|empathic|medic|techie", 'style': r'fighting|dueling|mastery|ascendancy|supremacy|training',
    'force': r'ossus|byrothsis|ferricite|phobium|echo|krayt',
}


def mod_parts():
    """{ (subtype, part): [family names] } for every item modification."""
    out = defaultdict(set)
    for it in CATALOG:
        if it.get('type') == 'ItemModification':
            f = re.sub(r'\s*\([^)]*\)\s*$', '', it['name'])
            f = re.sub(r'\s+Mk\s+[IVX]+$', '', f).strip()
            out[((it.get('subtype') or '').lower(), f.split()[-1])].add(f)
    return out


def mod_briefs():
    parts = mod_parts()
    groups = {'m1-mod-armor': ['armor'], 'm2-mod-blaster': ['blaster'], 'm3-mod-light-vibro': ['lightweapon', 'vibroweapon'],
              'm4-mod-tech-clothing': ['wristpad', 'focus generator', 'clothing', 'augment']}
    briefs = {}
    for batch, subs in groups.items():
        lines = [f'# Batch {batch}: item modification parts', '',
                 'Each file in `art/items/` is a **part**: the component a modification is (a scope, an oscillator, a weave…), '
                 'drawn as that component on its own, compact, centred, with a connector or mounting point. The app adds '
                 'a corner mark for the effect and paints `a-x` in the family\'s own colour, so give every part a clear '
                 '`a-x` panel or band and keep the corner bottom-right free of important detail.', '']
        for (sub, part), fams in sorted(parts.items()):
            if sub not in subs:
                continue
            name = 'mod-' + slug(sub) + '-' + slug(part)
            sample = sorted(fams)[:8]
            ex = next((it for it in CATALOG if it.get('type') == 'ItemModification' and (it.get('subtype') or '').lower() == sub
                       and it['name'].startswith(sample[0])), None)
            lines.append(f'## `{name}.svg`: a {sub} modification, the {part.lower()} ({len(fams)} families)')
            lines.append(f'- Families: {", ".join(sample)}{" …" if len(fams) > 8 else ""}')
            if ex and text(ex):
                lines.append(f'- SW5E ({ex["name"]}): {text(ex, 300)}')
            lines.append('')
        briefs[batch] = '\n'.join(lines)
    marks = ['# Batch m5-mod-marks: effect marks', '',
             'Small round marks (`art/items/mark-<name>.svg`), shown in a modification tile\'s corner like the damage badges '
             '(`art/items/badge-*.svg`: copy their disc and glow technique exactly): a dark disc, one bold simple glyph in `a-g`/`a-w`, '
             'readable at 16 px. The app sets the colour.', '']
    for k, v in MOD_MARKS.items():
        marks.append(f'## `mark-{k}.svg`: {v}')
    briefs['m5-mod-marks'] = '\n'.join(marks) + '\n'
    return briefs


if __name__ == '__main__' and '--mods' in sys.argv:
    OUT.mkdir(parents=True, exist_ok=True)
    for batch, body in mod_briefs().items():
        (OUT / f'{batch}.md').write_text(body, encoding='utf-8')
        print(batch, body.count('## '), 'pictures')
