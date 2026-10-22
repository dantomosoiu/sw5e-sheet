# Panel round 3: classes-a (Berserker, Consular, Engineer, Fighter, Guardian)

Player: classes-a. Area: class features by level, archetypes, fighting styles, fighting masteries, lightsaber forms,
weapon focuses and supremacies, class improvements.

## How I checked

- Sources: SW5E's text in `app/data/sw5e/rules.json`. 975 in all: 51 class features and 43 class-list options
  (Berserker Instincts, Force-Empowered Castings, Fighter Strategies, Guardian Auras), 394 archetype features of the
  69 archetypes of these classes, 382 archetype-list options (about 300 of them Engineer modifications), 32 fighting
  styles, 32 fighting masteries, 20 lightsaber forms, 8 weapon focuses, 8 weapon supremacies and 5 class improvements.
- Every source went through the sheet's own readers (`clsFeatureEffects`, `clsFeatureState`, `chWeaponBenefits`,
  `chGrants`) next to its numeric sentences, to sort them into "no number" and "has a number". Every source with a
  number was then run with `node dev/bump-check.js` (one run at a time, about 170 runs): directly, or one run for a
  whole list of the same pattern (the 32 styles and 32 masteries were each run one by one).
- Level-20 bases: copies of recorded cases changed the way `--js` does and passed to bump-check as a path (kept in the
  session scratchpad, outside the repo): B20 = berserker-test-claude at 20; C20 = consular-test-local at 20 without an
  archetype; E20 = armstech-test-local at 20 without archetype/mods; F20 = berserker-test-claude as a Fighter 20;
  G20 = maasha-vaal-panel at 20 without archetype/auras. Every finding below has a command on a recorded case.
  Note: a base whose levels were raised keeps SW5E's recorded proficiency bonus in `snap.complete`, which choice-slot
  effects read (FINDING 24); the pb-based findings were confirmed on recorded cases at their real level.
- States you switch on (Rage, stances, forms, Force Shield, Totemic Might) can't be started by bump-check: for those I
  called the sheet's own `startFeatureState` headless (dev/headless.js, the loader bump-check uses) and diffed the
  report before/after; FINDING 16 also gives a bump-check command with the effect the sheet stores.
- "OK" = the numbers and the explanation match SW5E's sentence. "no number" = nothing on the sheet to change
  (table-time, reactions, other creatures, roll rules the sheet doesn't model).

## Log (one line per source)

### Berserker (class)
- Rage (L1): OK — +5 melee STR damage at 20 (weapon + unarmed; "+5 Melee STR damage · Rage started, lasts 1 minute"), adv. STR checks/saves, resistance kinetic/energy; option on ranged weapons: FINDING 36
- Unarmored Defense (L1): OK — AC 10+DEX+CON (14 → 17 with a shield, "AC + CON · Unarmored Defense Berserker feature"); not with Combat suit (15)
- Reckless Attack (L2): OK — no number; control gives adv. on melee STR attacks this turn
- Berserker Instincts (L2): see the list below
- Danger Sense (L3): OK — listed under Advantages
- Berserker Approach (L3/6/10/14), Ability Score Improvement, Extra Attack (L5): no number
- Feral Impulse (L7): OK — initiative rolled with advantage ("Advantage from Feral Impulse")
- Brutal Critical (L9/13/17): FINDING 10
- Relentless Rage (L11), Persistent Rage (L15), Indomitable Might (L18): no number
- Primal Champion (L20): OK — CON +2, STR/DEX +2 asked and applied (STR 16 → 18; carrying capacity, attacks follow)
### Berserker Instincts (17)
- Acklay's: OK (adv. CON saves while raging) · Chirodactyl's: OK (blindsight 30 ft while raging) · Varactyl's: OK (adv. DEX checks while raging)
- Dewback's: OK when the damage types are written on the pick (fire, cold, sonic listed while raging)
- Boggdo's: FINDING 34 · Bantha's: FINDING 19 · Blurrg's: FINDING 19
- Katarn's: OK (climbing speed listed) · Predator's: OK (+10 ft, "Predator's Instinct Berserker Instincts feature")
- Fighter's Instinct: OK (fighting-style slot; Brawler Style → unarmed d4, improvised weapons); explanation FINDING 29
- Fyrnock's: OK (6 uses at 20) · Hawk's, Loth-cat's, Rancor's, Tactician's, Terentatek's, Tracker's: no number
### Berserker archetypes (17)
- Ballistic Approach: Firestorm OK (Heavy repeater proficient, +8); STR for blasters within 30 ft: FINDING 30; Explosive, Rampage, Down Not Out, Brawn: no number
- Cyclone Approach: no number
- Juggernaut Approach: Armored Brute FINDING 12; Unstoppable Force, Raging Bulwark, Overwhelming Cleave, Relentless Assault: no number
- Marauder Approach: Forcecasting OK (21 points = 20 + WIS 1, save DC 15, max level 4); Furious Force FINDING 32; others no number
- Addicted Approach: Slythmonger Savvy OK (brewer's kit); others no number
- Armored Approach: Spiked Armor tool OK, AC FINDING 21; Environmental Shielding FINDING 7; Customized Armor FINDING 21; Spiked Retribution no number
- Beastmaster Approach: Animalistic Momentum FINDING 20; Bestial Fury FINDING 35; Hunter's Call OK (6 uses at 17+); others no number
- Beastmaster Approach (Companion): Bonus Proficiencies OK (Animal Handling +1 → +7); others no number
- Bloodstorm Approach: no number
- Brawling Approach: Fists of Fury OK (unarmed 1 → 1d4+STR), explanation FINDING 29; Enforcer FINDING 3; others no number (the card also lists Cyclone Approach's features: SW5E's feature data)
- Champion Approach: Champion Superiority OK (12 maneuvers, 6 × d12 at 20); The Thrill OK; Furious Influence FINDING 28
- Frenzied Approach: Maniacal Rage OK (Intimidation with adv. while raging); others no number
- Industrial Approach: Techcasting FINDING 2; Industrious Tech FINDING 32
- Precision Approach: Careful Steps OK (Stealth proficient), adv. while raging FINDING 35; Focused Rage, Battle Anticipation FINDING 16
- Warchief Approach: Savage Diplomat OK (Persuasion +0 → +6); others no number

### Fighter (class)
- Fighting Style (L1): OK (slot "Fighter: Fighting Style"; styles below)
- Second Wind (L1): OK (1d10 + 20 at 20) · Action Surge (L2): OK (2 uses at 17+) · Indomitable (L9): OK (3 uses at 17+)
- Combat Superiority (L2): OK (12 maneuvers, 6 × d12 at 20, maneuver DCs) — but FINDING 1 with some archetypes
- Fighter Specialty, ASI, Extra Attack, Greater Extra Attack: no number
- Master of Combat (L20): OK (CON +2, STR/DEX +2 asked; "Master of Combat Fighter feature")
### Fighter Strategies (8)
- Cover, Cunning: no number · Enduring: OK (adv. vs exhaustion) · Mastery: OK (mastery slot)
- Lightweapon: OK (Lightsaber proficient; form slot) · Maneuver: OK (12 → 14) · Skilled: OK (Stealth + poisoner's kit from the pick's note) · Style: OK
### Fighting styles (32, each run on F20)
- Blindfighting: OK (blindsight 10 ft) · Brawler: OK (unarmed d4, improvised weapons), explanation FINDING 29
- Defense, Equilibrium: OK (adv. listed; mark control) · Superiority: OK (+1 die, 1 maneuver) · Formfighting: OK (3 form slots; flags the prerequisite) · Sharpshooter: OK (mark control)
- Area, Assisting, Berserk, Counterstrike, Covert, Disruption, Dual Wield, Duelist, Explosives, Formation, Great Weapon,
  Guerrilla, Gunning, Mounted, Onslaught, Poisoner, Secured, Sentinel, Shield, Snapshot, Split, Spotting, Throwing,
  Twin-Blade, Versatile: no number on the sheet; nothing else changed
### Fighting masteries (32, each run on F20 via Mastery Strategist)
- Blindfighting: FINDING 24 · Brawler: OK (die step), explanation FINDING 29 · Superiority: OK (+2 dice, 3 maneuvers)
- Berserk, Duelist, Explosives, Great Weapon: OK (advantages listed) · Formfighting: OK (forms)
- Shield Mastery: FINDING 30 · Defense Mastery: FINDING 38
- Area, Assisting, Counterstrike, Covert, Disruption, Dual Wield, Equilibrium, Formation, Guerrilla, Gunning, Mounted,
  Onslaught, Poisoner, Secured, Sentinel, Sharpshooter, Snapshot, Split, Spotting, Throwing, Twin-Blade, Versatile: no number
### Fighter archetypes (17)
- Assault Specialist: Brute Force OK (+2/+3/+4 by level, weapons and unarmed); Improved Critical OK; Remarkable Athlete FINDING 17; Brutish Durability FINDING 30; Devastating Critical FINDING 10; Survivor no number
- Blademaster Specialist: Unarmored Defense OK (10+DEX+STR = 15, not with a shield); Adaptive Fighting OK (uses = PB); others no number
- Shield Specialist: Techcasting OK (9 = 10 + INT −1); FINDING 1; others no number
- Tactical Specialist: OK (tool from note; 24 maneuvers, 12 × d12)
- Adept Specialist: Forcecasting OK (21); FINDING 1; others no number
- Demolitions: OK (kit) · Enhancement: OK (Technology, tech power slot) · Exhibition: OK (Charisma skill) · Heavy Weapons: no number · Mounted: OK (Piloting; adv. vs falling off)
- Fireteam Specialist, Fireteam Specialist (Companion): skill OK; FINDING 1
- Praetorian Specialist: Bonus Proficiency OK (Insight); Resilient Retainer FINDING 18
- Totem Specialist: tool OK; Totemic Might FINDING 4; totems FINDING 25; Primal Avatar FINDING 26

### Guardian (class)
- Forcecasting (L1): OK (43 = 40 + WIS 3; DC 17; max level 5)
- Channel the Force (L1): OK (6 uses at 17+; Cause Harm/Lend Aid controls)
- Force-Empowered Strikes (L2): OK (options +1d8 … +6d8, capped by Focused Strikes)
- Fighting Style (L2): OK (slot)
- Guardian Aura (L3): see auras · Guardian Focus (L3/7/15/20): archetype · ASI, Extra Attack: no number
- Force Purity (L6): OK ("Immune to poison and disease")
- Improved Force-Empowered Strikes (L11): FINDING 9
- Cleansing Touch (L14): no number
### Guardian Auras (7)
- Aura of Presence: OK (+WIS to every save, "STR save + WIS · Aura of Presence Guardian Auras feature")
- Aura of Conviction: OK (adv. listed) · Aura of Warding: OK ("Resistance to damage from force powers (you and nearby allies)")
- Aura of Hatred: FINDING 30 · Aura of Conquest, Aura of Protection, Aura of Vigor: no number
### Guardian archetypes (16, each run on G20)
- Form Basics (all): OK (form slot) · "The Way of the …" stances: Start controls, no number except Way of the Yerdua (FINDING 30)
- Masters at 20: Contention, Moderation, Perseverance, Resilience, Aggression, Domination, Ferocity, Determination, Persistence, Deception, the Unorthodox: OK (fixed +2 applied, WIS/CHA or STR/DEX asked; DEX 20 → 22 with the raised maximum); Master of Ferocity started: OK (resistance to all damage, crit 19–20)
- Aqinos Form: Bonus Proficiencies and Master of Adaptation FINDING 11; Techcasting Secrets OK (slots); others no number
- Vonil/Ishu Form, (Companion): Master of Unity FINDING 11; Bonus Proficiencies (Companion) OK (asked); others no number
- Shien/Djem So, Soresu, Juyo/Vaapad, Sokan: Bonus Proficiencies (heavy armor) FINDING 12; Shien Determination OK (Intimidation from note); Juyo Fury OK (initiative adv.); Juyo Vengeance Devastating Critical FINDING 10
- Ysannanite Form: Bonus Proficiencies OK (simple blasters, martial blasters without two-handed)
- Trakata Form: Duplicitous Force FINDING 27
- Niman Form, Makashi, Ataru, Jar'Kai, Shii-Cho: other features no number
### Lightsaber forms (20, each adopted with the sheet's Adopt on maasha-vaal-panel)
- Juyo: OK (crit 19–20 until the start of your next turn) · Niman: FINDING 30
- Djem So, Shien: one-roll half WIS/CHA bonus not offered (in FINDING 30) · Soresu: no number (halves one hit)
- Aqinos, Ataru, Bakuuni Hand, Drallig, Ishu, Jar'Kai, Makashi, Shii-Cho, Sokan, Trakata, Trispzest, Twilight, Vaapad, Vonil, Ysannanite: no number (durations shown right)

### Consular (class)
- Forcecasting (L1): OK (83 = 80 + WIS 3) · Force Recovery: no number
- Force Shield (L2): OK (started: AC 12 → 15, "+3 AC + WIS · Force Shield … until your next turn"; uses = PB)
- Force-Empowered Casting (L2) and its 11 options: no number
- Force Affinity (L3): Bendu OK (+CHA to force points: 83 → 87 with One with the Force); Ashla, Bogan: no number
- One with the Force (L20): OK (WIS +4, asked)
### Consular archetypes (12, each run on C20)
- Way of Balance: Force Resistance FINDING 28 (adv. OK); others no number
- Way of Lightning: Electric Attunement OK; others no number
- Way of Suggestion, Way of the Sage, Way of Confluence, Way of Manipulation, Way of Telekinetics: no number
- Way of Endurance: Upheld by the Force FINDING 8; others no number
- Way of Negation: Enduring Focus FINDING 30; others no number
- Way of Technology: Fundamentals of Mechu-deru FINDING 13 (Technology OK); Techcasting Secrets OK (slots)
- Way of Tutelage: Bonus Proficiencies OK (asked); others no number
- Way of the Seer: Shielded Thoughts FINDING 28; others no number

### Engineer (class)
- Techcasting (L1): OK (44 = 40 + INT 4) · Potent Aptitude (L1): OK (d12, 6 uses at 17+)
- Infuse Item (L2): OK (tikk-plonr-panel: +1 attack/damage on Blaster pistol, "until the end of your next long rest")
- Tool Expertise (L2): FINDING 14 · Engineering Discipline, ASI: no number
- Tech Mastery (L20): OK (CON +2, INT +2; INT 20 → 22)
- Modifications beyond PB: OK (armstech-test-local, 6 mods at PB 4: tech points 21 → 19)
### Engineer archetypes (14, each run on E20)
- Bonus Proficiencies OK: Armormech (tool, medium + heavy armor), Armstech, Gadgeteer, Unstable (asked), Astrotech, Astrotech (Companion), Biochem (Medicine + kits), Biotech, Construction, Cybertech (Depreciated), Cybertech (Old); Audiotech FINDING 37; Artificer FINDING 13
- Cybertech Engineering: FINDING 15
- Construction Engineering: Build and Destroy FINDING 7; others no number
- Biotech Engineering: Focused Augmentation FINDING 30
- All other archetype features: no number
### Engineer modifications (~300)
- Armstech: Accuracy Focus, Amplifying Barrel, Contoured Grip, Neutronium Edge OK (+1/+2/+3 by level on the modified weapon, "Armstech Modifications (Blaster rifle)"); Keen Oscillator OK (weapon crit)
- Armormech: Accelerated Movement, Bonded Plates, Reinforced Underlay and the other "while wearing" ones FINDING 6; Adaptable Armor FINDING 34; Power Fist, Prototype Power Fist, Advanced Power Fist FINDING 31; Resistance OK (asks a type)
- Artificer: Adegan Crystal, Beam Gem Lens OK (+3 at 20 on the lightsaber); Intense Beam OK (crit); Crossguard FINDING 30
- Astrotech: AI Amplifier/Rangefinder OK (+3 vs melee/ranged tech attacks, shown as "only sometimes"); casting controllers OK (DC vs the named saves); Advanced Hardening, Advanced Grounding System, Grounding System, Hardening OK
- Audiotech: Magnifying Device, Shock Mount OK (+3 attack / DC); Rush, Sonar Pulse: only while playing (not applied, right)
- Biochem: Biochemist's Amplifer/Inhibitor FINDING 22; Chemical Counteragents OK (asks a type); Inoculation OK
- Biotech: Integrated Subdermal Armor FINDING 23; Swift Gait Attuner OK (DEX saves +3 → +9); inhibitors/vectors OK (as "only sometimes"); Hardy Torso, Anti-Dazzle, Sound Dampeners OK
- Cybertech: Arakyd Vector OK (+3); Elemental Shielding FINDING 7; Dynamics OK
- Gadgeteer: Darkvision Goggles, Climbing Gloves, Advanced Grounding System, Grounding System OK; Jet Pack FINDING 33
- All other modifications: no number (actions, reactions, other creatures, item stats)

### Weapon focuses (8) and supremacies (8) (feats Weapon Focused / Weapon Supremacist)
- Blade Focus (armstech-test-local): OK (+1 damage on the Vibrosword, "Blade Focus") · Blade Supremacy: OK (+1 attack, crit 18–20 with Juyo)
- All 16: applied without proficiency FINDING 5; the focuses' "one additional weapon damage die" on a crit (Polearm, Rifle) FINDING 10
### Class improvements (5, via the Class Improvement feat)
- Guardian: OK (2 uses = PB at Guardian 4) · Berserker, Consular, Engineer, Fighter: no number

## Counts

975 sources checked: 150 OK, 730 no number, 95 with a finding (39 findings below; 38 in my area + 1 seen while testing).

## Findings

### FINDING 1 — high — Fighter archetypes with a level table replace the Fighter's superiority dice with a misread table
- Sources: Adept Specialist, Shield Specialist, Fireteam Specialist, Fireteam Specialist (Companion) (with the Fighter's Combat Superiority).
- SW5E: Fighter "Superiority Dice … You have two superiority dice, which are d4s, and you earn more at higher levels, as shown in the Superiority Dice Quantity column"; Fireteam "You have four superiority dice, instead of two, and you earn more at higher levels, as shown in the Superiority Dice Quantity column of the Fireteam Superiority table."
- Command: `node dev/bump-check.js kadro-vos-panel --js "raw.classes[0].archetype={name:'Adept Specialist'}"` (also `…{name:'Shield Specialist'}`)
- Expected: Fighter 3: 2 × d4 (Fireteam: 4 × d4); Fighter 20: 6 × d12 (Fireteam 12 × d12).
- Actual: Fighter 3 Adept "Superiority dice 0 3 / 3", Shield "0 2 / 2", die roll "Superiority die: no dice +0"; Fighter 20 Adept "0 20 / 20", Shield "0 10 / 10", Fireteam "0 12 / 12"; a "Superiority & Maneuvers" section with "Max Dice 20, Dice Size 0".
- Where: app/engine.js `engSuperiority` (SW5E's quirk: the archetype table's second column = dice, size "0" without a size column) wins over the sheet's own table-based count.

### FINDING 2 — high — Industrial Approach: 1 tech point instead of half the berserker level + INT
- SW5E: "You have a number of tech points equal to half of your berserker level, as shown in the Tech Points column of the Industrial Approach Techcasting table, + your Intelligence modifier."
- Command: `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].archetype={name:'Industrial Approach'}"`
- Expected: Berserker 5: 3 + INT (−1) = 2; Berserker 20: 10 − 1 = 9.
- Actual: "techCasting.maxPoints = 1", "Tech points 1 / 1" (also 1 at level 20).
- Where: app/engine.js `engCasting`: "SW5E reads an archetype's points only for third-casters (ratio 1/3)"; Industrial Approach is a 1/6 caster. (Marauder, Adept and Shield Specialist, 1/3, are right.)

### FINDING 3 — high — Enforcer gives every weapon a 19–20 critical range, always
- SW5E (Brawling Approach, 14th): "When you would make an unarmed strike or attack with an improvised weapon with advantage, you can choose to forgo the advantage. If you do so, your critical hit range increases by 1 for that attack, and on a hit, you deal maximum damage instead of rolling."
- Command: `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].levels=14; raw.classes[0].hitPoints=Array(13).fill(7); raw.classes[0].archetype={name:'Brawling Approach'}"`
- Expected: no permanent change; at most an option on unarmed/improvised attacks rolled with advantage.
- Actual: "Dire vibroblade attack … critical on 19–20 (Enforcer)", "Blaster pistol attack … critical on 19–20 (Enforcer)", "Other: Critical hit on 19–20 with weapons".
- Where: app/classes.js `clsFeatureEffects`, the "critical hit range … increases by" reader runs on conditional sentences ("If you do so … for that attack").

### FINDING 4 — high — Totemic Might doubles carrying capacity permanently, and does nothing when started
- SW5E (Totem Specialist, 3rd): "As a bonus action, you can gain the following benefits for 1 minute. … - Your carrying capacity and the weight you can push, drag, or lift doubles. … - You have advantage on Strength checks and Strength saving throws. - Your weapon attacks deal an extra 1d6 damage." (1d8 from 10th, Primal Avatar)
- Command: `node dev/bump-check.js kadro-vos-panel --js "raw.classes[0].archetype={name:'Totem Specialist'}"`
- Expected: 120 / 240 lb unchanged until Totemic Might is started; while it lasts: ×2, adv. STR checks/saves, +1d6 weapon damage.
- Actual: never started: "240 lb ×2 (Totemic Might)", "of 240 lb max" (was 120). Started (Start Totemic Might): only the use is spent; no advantage, no extra damage, no benefit notes.
- Where: app/viewer.js `carryFactor` matches any feature's text, states included; app/classes.js `clsFeatureState` finds the benefits list only after "following benefits…:" (here the sentence has no colon).

### FINDING 5 — high — Weapon focuses and supremacies apply to weapons you aren't proficient with
- SW5E (every focus/supremacy): "You gain the following benefits while wielding any of these weapons, if you are proficient with it: - You gain a +1 bonus to the weapon's damage rolls." (supremacies: attack rolls)
- Command: `node dev/bump-check.js consular-test-local --feat "Weapon Focused" --item "Blaster rifle" --equip --js "raw.featureChoices=Object.assign(raw.featureChoices||{}, {'Feat: Weapon Focused (Consular ASI #2)':[{name:'Rifle Focus',weapons:['Blaster rifle']}]})"`
- Expected: a consular (simple lightweapons/vibroweapons) isn't proficient with a blaster rifle: no bonus.
- Actual: "weapon tweak: #0 damage +1 · Rifle Focus", "Blaster rifle damage: d8 +3 · = +2 DEX modifier +1 Rifle Focus" (attack +2: no proficiency).
- Where: app/viewer.js `choiceEffects`, weapon kinds: `chWeaponBenefits` applied to each chosen weapon without a proficiency check.

### FINDING 6 — high — Armormech modifications apply when the modified armor isn't worn
- SW5E: Accelerated Movement "While wearing your modified armor your speed increases by 10 feet."; Bonded Plates "You gain a +1 bonus to AC against melee attacks. This bonus increases to +2 at 9th level and +3 at 13th level."
- Command: `node dev/bump-check.js armstech-test-local --js "raw.equipment.push({name:'Combat suit',quantity:1,category:'Equipment'}); raw.classes[0].archetype={name:'Armormech Engineering'}; raw.classes[0].modifiedItems=['Combat suit']; raw.classes[0].options={'Armormech Modifications':[{name:'Accelerated Movement'},{name:'Bonded Plates'}]}"`
- Expected: the Combat suit is carried, not worn: speed 30 ft, AC 13.
- Actual: "speed.base = 40 ft" ("+10 Speed · Accelerated Movement Armormech Modifications feature"), AC "13 · 15 vs melee". (Same for every "while wearing your modified armor" modification.)
- Where: app/classes.js `clsFeatureEffects` ALWAYS strips "while wearing your modified armor"; app/viewer.js `featureEffectsUncached` only keeps "your modified weapon/lightsaber" sentences off the character, never checks the armor is equipped.

### FINDING 7 — high — Resistances listed that the character doesn't have
- Environmental Shielding (Armored Approach, 6th): "Choose one of the following damage types: acid, cold, fire, lightning, or sonic. While wearing your spiked armor, you have resistance to damage of the chosen type." → shown "Resistances: Resistance to damage" (every type; the type in the notes is ignored).
  `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].levels=6; raw.classes[0].hitPoints.push(7); raw.classes[0].archetype={name:'Armored Approach'}; raw.featureNotes={'environmental shielding':'cold'}"`
- Elemental Shielding (Cybertech modification): "You gain resistance to damage types for which you have a matching amplifier modification installed." → "Resistance to damage".
- Build and Destroy (Construction, 6th): "Your tech powers and weapon attacks gain the siege property, and your portable structures have resistance to kinetic, energy, and ion damage dealt by weapons." → "Resistances: Resistance to kinetic, energy, and ion damage" on the engineer.
  `node dev/bump-check.js armstech-test-local --js "raw.classes[0].archetype={name:'Construction Engineering'}; delete raw.classes[0].options"`
- Expected: cold only (while wearing the spiked armor); only the matching types; nothing for Build and Destroy.
- Where: app/classes.js `clsFeatureEffects`, "resistance to ([^.]*?damage…)" takes "resistance to damage" literally and doesn't look at who has it.

### FINDING 8 — medium — Way of Endurance: Upheld by the Force adds neither hit points nor AC
- SW5E: "- Your hit point maximum increases by 3, and it increases by 1 again whenever you gain a level in this class. - Your base AC becomes 13 + your Constitution modifier."
- Command: `node dev/bump-check.js consular-test-local --js "raw.classes[0].archetype={name:'Way of Endurance'}"`
- Expected (Consular 5, CON +2, no armor): HP 32 → 37; AC 12 → 15.
- Actual: HP 32, AC 12; only the resistance action's counter appears.
- Where: `clsFeatureEffects` has no reader for "hit point maximum increases by" (only species, in `featureEffectsUncached`) or "base AC becomes 13 +".

### FINDING 9 — medium — Improved Force-Empowered Strikes: the extra 1d8 on every melee hit is missing
- SW5E (Guardian 11th): "Whenever you hit a creature with a melee weapon attack, the creature takes an extra 1d8 damage."
- Command: `node dev/bump-check.js maasha-vaal-panel --js "raw.classes[0].levels=11; raw.classes[0].hitPoints.push(6,6,6,6,6,6,6)"`
- Expected: Lightsaber damage d6 + 1d8 + 4.
- Actual: "Lightsaber damage: d6 +4" (only the Force-Empowered Strikes options).

### FINDING 10 — medium — Critical-hit damage features aren't on the critical damage roll
- Brutal Critical (Berserker 9/13/17): "You can roll one additional weapon damage die when determining the extra damage for a critical hit with a melee attack." (two at 13th, three at 17th)
  `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].levels=9; raw.classes[0].hitPoints.push(7,7,7,7)"` → "Dire vibroblade damage (critical): d8 d8 +3" (expected d8 d8 d8 +3).
- Devastating Critical (Assault Specialist 15th; Juyo/Vaapad Vengeance): "When you score a critical hit with a weapon attack, you gain a bonus to that weapon's damage roll equal to your fighter level." → not on the critical roll.
- Polearm/Rifle Focus: "When you score a critical hit with the weapon, you can roll one additional weapon damage die." → not on the roll.

### FINDING 11 — medium — Ability increases and a skill the readers miss (Aqinos, Vonil/Ishu)
- Aqinos Form, Master of Adaptation: "Your Constitution and Wisdom or Charisma (your choice) scores increase by 2. Your maximum for those scores increases by 2." → nothing applied, nothing asked.
- Aqinos Form, Bonus Proficiencies: "You gain proficiency in astrotech's implements and the Technology skill." → only the tool.
  `node dev/bump-check.js maasha-vaal-panel --js "raw.classes[0].archetype={name:'Aqinos Form'}"`
- Vonil/Ishu Form (and Companion), Master of Unity: "Your Strength or Dexterity (your choice) and Constitution scores increase by 2." → CON +2 only, STR/DEX not asked.
  `node dev/bump-check.js maasha-vaal-panel --js "raw.classes[0].levels=20; raw.classes[0].hitPoints=Array(19).fill(6); raw.classes[0].archetype={name:'Vonil/Ishu Form'}; raw.featureNotes={'master of unity':'Strength'}"`
- Where: `clsFeatureEffects` ability regex expects "(your choice)" after "scores"; the proficiency list split loses "the Technology skill" after a tool.

### FINDING 12 — medium — Heavy armor proficiency from a feature is dropped
- SW5E: Juggernaut Armored Brute "You gain proficiency in heavy armor, …"; Shien/Djem So, Soresu, Juyo/Vaapad, Sokan Bonus Proficiencies "You gain proficiency in heavy armor."
- Command: `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].archetype={name:'Juggernaut Approach'}"`
- Expected: Proficiencies → Armor: "Light armor, medium armor, heavy armor · Armored Brute".
- Actual: unchanged ("Light armor medium armor"); no effect for the feature.
- Where: app/viewer.js `featureEffectEntry` returns null when a feature has only `profs.armor` (armor isn't counted in the "changes nothing" test).

### FINDING 13 — medium — Weapon proficiencies written in prose are missed
- Artificer Engineering: "You gain proficiency in artificer's implements, and with the lightsaber simple lightweapon."
  `node dev/bump-check.js armstech-test-local --js "raw.classes[0].archetype={name:'Artificer Engineering'}; delete raw.classes[0].options; raw.equipment.push({name:'Lightsaber',quantity:1,category:'Equipment',equipped:true})"` → "Lightsaber attack: d20 +0" (expected +4: STR 0 + PB 4).
- Way of Technology: "You gain proficiency in the Technology skill, as well as simple blasters."
  `node dev/bump-check.js consular-test-local --item "Blaster pistol" --equip` → "weapons[Blaster pistol].attackBonus = 2" (expected +5: DEX 2 + PB 3).

### FINDING 14 — medium — Engineer class tools: Tinker's implements missing, Tool Expertise not applied
- SW5E: Engineer tools "Tinker's implements, one of your choice"; Tool Expertise (2nd) "You gain expertise in any tool proficiencies you gain from this class."
- Command: `node dev/bump-check.js armstech-test-local --js "raw.customProficiencies=[{name:\"Armstech's implements\",type:'tool',proficiencyLevel:'proficient',from:'Class: Engineer'}]"`
- Expected (Engineer 9, INT +3, PB 4): Tinker's implements and the picked tool listed, both with expertise: +11.
- Actual: no Tinker's implements anywhere; the picked class tool rolls "+7 · = +3 INT modifier +4 proficiency".

### FINDING 15 — medium — Cybertech Engineering: none of its features are read
- SW5E: "Bonus Proficiencies … You gain proficiency in cybertech's implements." (the archetype's text marks levels as `***Cybertech Engineering:** 3rd level*`)
- Command: `node dev/bump-check.js armstech-test-local --js "raw.classes[0].archetype={name:'Cybertech Engineering'}; delete raw.classes[0].options"`
- Expected: cybertech's implements proficient (and the Cyberpad modification slots/penalty).
- Actual: the card lists the features (from SW5E's feature data) but no effect: no tool proficiency.
- Where: app/classes.js `clsTextFeatures` only knows `_**Name:** 3rd level_`.

### FINDING 16 — medium — Precision Approach: Focused Rage and Battle Anticipation not applied while raging
- SW5E: "While raging, when you make a melee weapon attack using Dexterity, you add your rage damage to the damage roll." / "While raging, your critical hit range with melee weapon attacks using Dexterity increases by 1."
- Command (Rage as the sheet stores it after Start Rage): `node dev/bump-check.js berserker-test-claude --js "raw.baseAbilityScores.Dexterity=18; raw.baseAbilityScores.Strength=12; raw.equipment.push({name:'Vibrodagger',quantity:1,category:'Equipment',equipped:true}); raw.classes[0].archetype={name:'Precision Approach'}; raw.classes[0].levels=6; raw.classes[0].hitPoints.push(7); itemState.effects=[{id:'r1',kind:'temporary',source:'feature',name:'Rage',startedAt:Date.UTC(2026,0,1),duration:'1 minute',group:'state:raging',mods:[{path:'weapon.damage',bonus:2,label:'Melee STR damage +2',weaponFilter:{melee:true,ability:'Strength'}}],notes:[],advantage:[{kind:'check',ability:'Strength'},{kind:'save',ability:'Strength'}],defenses:[],critRange:0,target:'self'}]"`
- Expected: Vibrodagger damage d4 +6, critical on 19–20.
- Actual: "Vibrodagger damage: d4 +4 · = +4 DEX modifier", crit 20; the two sentences are only notes.
- Where: app/viewer.js `startFeatureState` reads "While raging…" lines with `clsFeatureEffects`, which has no rage-damage or weapon-specific crit reader, and drops `critRange` of such lines.

### FINDING 17 — medium — Remarkable Athlete not applied
- SW5E (Assault Specialist 7th): "You can add half your proficiency bonus to any Strength, Dexterity, or Constitution check you make that doesn't already use your proficiency bonus."
- Command: `node dev/bump-check.js edit-test-claude --js "raw.classes[0].levels=7; raw.classes[0].hitPoints.push(6,6); raw.classes[0].archetype={name:'Assault Specialist'}"`
- Expected: +1 (half of PB 3, rounded down) on non-proficient STR/DEX/CON skills, checks and initiative.
- Actual: nothing changes.

### FINDING 18 — medium — Resilient Retainer always asks for an Intelligence/Charisma save, and answering adds it
- SW5E: "…you gain proficiency in Wisdom saving throws. If you already have this proficiency, you instead gain proficiency in Intelligence or Charisma saving throws (your choice)."
- Command: `node dev/bump-check.js edit-test-claude --js "raw.classes[0].levels=7; raw.classes[0].hitPoints.push(6,6); raw.classes[0].archetype={name:'Praetorian Specialist'}"`
- Expected (Fighter: STR/CON saves): Wisdom saves only, nothing to choose.
- Actual: "Resilient Retainer Wisdom saves: proficient … Choose Intelligence or Charisma saving throws"; with `raw.featureNotes={'resilient retainer':'Intelligence'}` both WIS and INT become proficient (INT save −1 → +5 at 20).

### FINDING 19 — medium — Bantha's Instinct doesn't double carrying capacity; Blurrg's doesn't double travel pace
- SW5E: Bantha's "Your carrying capacity and the weight you can push, drag, or lift doubles. If it would already double, it instead triples."; Blurrg's "…your travel pace is doubled…"
- Command: `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].levels=7; raw.classes[0].hitPoints.push(7,7); raw.classes[0].options={'Berserker Instincts':[{name:\"Bantha's Instinct\"},{name:\"Blurrg's Instinct\"}]}"`
- Expected: capacity 240 → 480 lb (push 480 → 960); 3 → 6 miles/hour, 24 → 48 miles/day.
- Actual: unchanged.
- Where: `carryFactor` looks at feats, features and species, not picked class options.

### FINDING 20 — medium — Animalistic Momentum: always a swimming speed
- SW5E: "You gain a your choice of a climbing or swimming speed equal to your walking speed."
- Command: `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].levels=6; raw.classes[0].hitPoints.push(7); raw.classes[0].archetype={name:'Beastmaster Approach'}; raw.featureNotes={'animalistic momentum':'climbing'}"`
- Expected: a choice; with "climbing": "Climbing speed equal to walking speed".
- Actual: "Speeds: Swimming speed equal to walking speed", no choice offered, the note ignored.

### FINDING 21 — medium — Armored Approach's spiked armor: AC from CON and Deflective Layer missing
- SW5E: "While wearing your spiked armor, you can use your Constitution modifier instead of your Dexterity modifier when determining your AC."; Customized Armor "#### Deflective Layer Your armor class increases by 1."
- Command: `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].levels=10; raw.classes[0].hitPoints.push(7,7,7,7,7); raw.equipment.find(e=>e.name==='Combat suit').equipped=true; raw.classes[0].archetype={name:'Armored Approach'}; raw.classes[0].options={'Customized Armor':[{name:'Deflective Layer'}]}"`
- Expected (Combat suit 11 + CON 3 instead of DEX 2, shield +2, Deflective Layer +1): AC 17.
- Actual: "armorClass = 15" (17 before, unarmored); also a "Customized Armor short rest 1 / 1" counter (Defensive Field's) whichever option is chosen.

### FINDING 22 — medium — Biochemist's Amplifer/Inhibitor add nothing
- SW5E: "While using your biochemist's pack as a tech focus, you gain a +1 bonus to tech attack rolls. This bonus increases to +2 at 9th level and +3 at 13th level." (Inhibitor: tech save DC)
- Command: `node dev/bump-check.js armstech-test-local --js "raw.classes[0].archetype={name:'Biochem Engineering'}; raw.classes[0].options={'Biochem Modifications':[{name:\"Biochemist's Amplifer\"},{name:\"Biochemist's Inhibitor\"}]}"`
- Expected (Engineer 9): tech attack and save DC +2 (as Audiotech's Magnifying Device/Shock Mount do).
- Actual: no change.
- Where: `clsFeatureEffects` ALWAYS: `using (?:your|this|a) [\w ]+? as … focus` doesn't allow the apostrophe in "biochemist's pack", so the sentence counts as conditional.

### FINDING 23 — medium — Integrated Subdermal Armor: AC 13 + DEX not applied
- SW5E (Biotech): "When you aren't wearing armor, your AC becomes 13 + your Dexterity modifier."
- Command: `node dev/bump-check.js armstech-test-local --js "raw.classes[0].archetype={name:'Biotech Engineering'}; raw.classes[0].options={'Biotech Modifications':[{name:'Integrated Subdermal Armor'}]}"`
- Expected: unarmored AC 13 + DEX 3 = 16.
- Actual: no AC change.

### FINDING 24 — medium — Choice-slot effects use SW5E's last-loaded proficiency bonus after level changes
- SW5E (Blindfighting Mastery): "You gain blindsight out to a number of feet equal to 5 x your proficiency bonus."
- Command: `node dev/bump-check.js kadro-vos-panel --js "raw.classes[0].levels=5; raw.classes[0].hitPoints.push(6,6); raw.classes[0].options['Fighter Strategies']=[{name:'Mastery Strategist'}]; raw.featureChoices=Object.assign(raw.featureChoices||{}, {'Fighter Strategies: Mastery Strategist':[{name:'Blindfighting Mastery'}]})"`
- Expected: proficiencyBonus 2 → 3, blindsight 15 ft.
- Actual: "proficiencyBonus = 3" but "Blindsight 10 ft".
- Where: app/viewer.js `choiceEffects` passes `complete.proficiencyBonus` from `snap.complete` (SW5E's computation when loaded), stale after the sheet's own level edits.

### FINDING 25 — medium — Totem Specialist: the totems' standing benefits aren't applied
- SW5E: e.g. Totem of the Hawk "granting you advantage on Intelligence (Investigation) checks, and darkvision out to a range of 60 feet"; Totem of the Rancor "advantage on saving throws against being poisoned and resistance to poison damage"; Totem of the Sarlacc "expertise in any one tool in which you are proficient".
- Command: `node dev/bump-check.js kadro-vos-panel --js "raw.classes[0].archetype={name:'Totem Specialist'}; raw.classes[0].options={'Totem Options':[{name:'Totem of the Hawk'},{name:'Totem of the Rancor'}]}"`
- Expected: Investigation with advantage, darkvision 60 ft, poison resistance and advantage (while wielding/wearing the totem's object).
- Actual: nothing from the picks (the list is read through its feature, and Totem Creation has no "####" options).

### FINDING 26 — medium — Primal Avatar: every Lore check rolled with advantage
- SW5E: "Lastly, you have advantage on Lore checks you make about tribal cultures."
- Command: `node dev/bump-check.js kadro-vos-panel --js "raw.classes[0].levels=10; raw.classes[0].hitPoints.push(6,6,6,6,6,6,6); raw.classes[0].archetype={name:'Totem Specialist'}"`
- Expected: a note ("Advantage on Lore checks about tribal cultures"), not pre-selected.
- Actual: "Lore (INT): d20 d20 … mode adv · Advantage from Primal Avatar", "Advantages: Advantage on Lore checks".
- Where: `clsFeatureEffects` skill-advantage regex excludes "against/that/made/to/involving" but not "you make about".

### FINDING 27 — medium — Trakata Form, Duplicitous Force: no bonus on Sleight of Hand
- SW5E: "When you make a Dexterity (Sleight of Hand) check, you gain a bonus to that check equal to your Wisdom or Charisma modifier (your choice, minimum of one)."
- Command: `node dev/bump-check.js maasha-vaal-panel --js "raw.classes[0].levels=7; raw.classes[0].hitPoints.push(6,6,6); raw.classes[0].archetype={name:'Trakata Form'}; raw.featureNotes={'duplicitous force':'Wisdom'}"`
- Expected: Sleight of Hand +WIS (+3).
- Actual: unchanged (the "When you make…" sentence counts as conditional).

### FINDING 28 — medium — Resistances not listed
- Way of Balance, Force Resistance (18th): "Additionally, you have resistance against the damage of force powers." (only the advantage is listed)
  `node dev/bump-check.js consular-test-local --js "raw.classes[0].levels=18; raw.classes[0].hitPoints=Array(17).fill(4); raw.classes[0].archetype={name:'Way of Balance'}"`
- Way of the Seer, Shielded Thoughts (14th): "You also have resistance to psychic damage, …"
  `node dev/bump-check.js thirza-vitchess-panel --js "raw.classes[0].levels=14; raw.classes[0].hitPoints=Array(13).fill(4)"`
- Champion Approach, Furious Influence (while raging): "You are resistant to psychic damage." (started Rage: Resistances kinetic and energy only)
- Where: the resistance regex wants "have/gain resistance to"; "resistance against", "also have", "are resistant" and a later "whenever" are missed.

### FINDING 29 — medium — Unarmed die-step explanation names no source and reads backwards
- Sources: Fists of Fury, Brawler Style, Brawler Mastery ("Your unarmed strike damage increases by one step").
- Command: `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].archetype={name:'Brawling Approach'}"`
- Expected: "4 → 1d4+3 · Fists of Fury (Brawling Approach): unarmed die 1 → d4".
- Actual: numbers right ("| +6 | 1d4+3 Kinetic |") but the hover on the damage says "Without tweaks or effects: 4 → now 3 / Changed by the tweaks or effects listed under Settings, Tweaks & Data and Combat & Vitals → Effects."

### FINDING 30 — medium — Conditional bonuses not shown next to the stat or offered on the dice card
- Ballistic Firestorm: "You can use your choice of Strength or Dexterity modifier for the attack and damage rolls of blaster weapons against targets within 30 feet of you."
- Aura of Hatred: "…gain a bonus to the first melee weapon damage rolls you make each round equal to your Charisma modifier (minimum of +1)."
- Shield Mastery: "…you can add your shield's AC bonus to any Dexterity saving throw you make against a power or other harmful effect."
- Way of Negation, Enduring Focus: "While you are concentrating on a Force power, you have a +2 bonus to your AC and all saving throws."
- Artificer Crossguard: "While wielding your modified lightsaber, you gain a +1 bonus to your armor class against melee weapon attacks."
- Niman Form: "Until the end of your next turn, you can use Wisdom or Charisma instead of Strength or Dexterity for the attack and damage rolls of your melee weapon attacks." (Djem So, Shien: half WIS/CHA once)
- Brutish Durability: "Once per round, you can roll a d8 and add the die to a saving throw you make."
- Way of the Yerdua: "…you add your Wisdom or Charisma modifier … to one ranged weapon attack and damage roll you make each turn."
- Biotech Focused Augmentation: "You add your Intelligence modifier to Constitution saving throws you make to maintain concentration."
- Command (one of them): `node dev/bump-check.js maasha-vaal-panel --js "raw.classes[0].options={'Guardian Auras':[{name:'Aura of Hatred'}]}"` (Hatred in place of Presence) → no effect for Hatred, no option on the Lightsaber damage roll.
- Expected: "13 · 15 vs melee"-style alternatives or dice-card options; Actual: nothing (text only on the card).

### FINDING 31 — medium — Armormech power fists: unarmed damage die and crit not applied
- SW5E: Power Fist "Your modified armor's unarmed strike deals 1d4 kinetic damage."; Prototype "1d6"; Advanced "1d8 … Additionally, your critical hit range with your unarmed strikes increases by 1."
- Command: `node dev/bump-check.js armstech-test-local --js "raw.equipment.push({name:'Combat suit',quantity:1,category:'Equipment',equipped:true}); raw.classes[0].archetype={name:'Armormech Engineering'}; raw.classes[0].modifiedItems=['Combat suit']; raw.classes[0].options={'Armormech Modifications':[{name:'Power Fist'}]}"`
- Expected: Unarmed Strike 1d4 + STR while wearing the armor.
- Actual: unchanged.

### FINDING 32 — medium — Furious Force / Industrious Tech: no rage damage on power damage while raging
- SW5E: "While raging, you add your rage damage to damage rolls from force powers you cast that require a force attack or saving throw." (Industrial: tech powers)
- Command (Rage as the sheet stores it): `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].archetype={name:'Marauder Approach'}; raw.classes[0].forcePowers=['Force Push/Pull']; itemState.effects=[{id:'r1',kind:'temporary',source:'feature',name:'Rage',startedAt:Date.UTC(2026,0,1),duration:'1 minute',group:'state:raging',mods:[{path:'weapon.damage',bonus:2,label:'Melee STR damage +2',weaponFilter:{melee:true,ability:'Strength'}}],notes:[],advantage:[],defenses:[],critRange:0,target:'self'}]"`
- Expected: Force Push/Pull damage d4 d4 +2 (Rage Damage +2 at Berserker 5). Actual: "Force Push/Pull: kinetic damage: d4 d4 +0".

### FINDING 33 — low — Jet Pack's flying speed doesn't grow
- SW5E: "Your jet pack's speed increases to 40 feet at 5th level, 50 feet at 9th level, 60 feet at 13th level, 70 feet at 17th level, and 80 feet at 20th level."
- Command: `node dev/bump-check.js armstech-test-local --js "raw.classes[0].archetype={name:'Gadgeteer Engineering'}; raw.classes[0].options={'Gadgeteer Modifications':[{name:'Jet Pack'}]}"`
- Expected (Engineer 9): "Flying speed 50 ft (when switched on)". Actual: "Flying speed 30 ft (when switched on)".

### FINDING 34 — low — Speeds not listed
- Boggdo's Instinct: "While raging you have a flying speed equal to your current walking speed, …" (not listed while raging).
- Adaptable Armor: "…you gain a climbing speed equal to your walking speed, …Additionally, you gain a swim speed equal to your walking speed." (neither listed): `node dev/bump-check.js armstech-test-local --js "raw.equipment.push({name:'Combat suit',quantity:1,category:'Equipment',equipped:true}); raw.classes[0].archetype={name:'Armormech Engineering'}; raw.classes[0].modifiedItems=['Combat suit']; raw.classes[0].options={'Armormech Modifications':[{name:'Adaptable Armor'}]}"`
- Expected: "Speeds: Climbing speed equal to walking speed, Swimming speed equal to walking speed"; Actual: no Speeds line. Boggdo's: found with the sheet's Start Rage (headless), no bump-check command.

### FINDING 35 — low — Advantages while raging only as notes
- Bestial Fury: "While raging, you have advantage on any Wisdom (Perception) or Wisdom (Survival) checks."; Careful Steps: "While raging, you have advantage on checks you make with the chosen skill." → with Rage started (the sheet's Start Rage, headless), Perception/Survival/Stealth not rolled with advantage; Maniacal Rage's "advantage on Charisma (Intimidation) checks" is (the reader needs the plain "advantage on <Ability> (<Skill>) checks").

### FINDING 36 — low — Rage Damage offered on ranged and Dexterity weapons
- SW5E: "When you make a melee weapon attack using Strength, you gain a bonus to the damage roll…"
- Command: `node dev/bump-check.js berserker-test-claude --js "raw.classes[0].archetype={name:'Ballistic Approach'}" --full` (dist/bump-check/before.txt: the base already shows it)
- Actual: "Blaster pistol damage: d6 +2 · = +2 DEX modifier · Energy · option: Rage Damage +2".

### FINDING 37 — low — Audiotech: "three musical instruments" becomes a tool
- SW5E: "You gain proficiency in three musical instruments and audiotech's implements."
- Command: `node dev/bump-check.js armstech-test-local --js "raw.classes[0].archetype={name:'Audiotech Engineering'}; delete raw.classes[0].options"`
- Actual: "tool|three musical instruments|proficient: three musical instruments check: d20 +7" instead of asking for three instruments.

### FINDING 38 — low — Defense Mastery's damage reduction not listed
- SW5E: "While you are wearing medium or heavy armor with which you are proficient, damage that you take from weapons is reduced by an amount equal to your proficiency bonus." → not in Defenses & senses.
- Command: `node dev/bump-check.js kadro-vos-panel --js "raw.classes[0].options['Fighter Strategies']=[{name:'Mastery Strategist'}]; raw.featureChoices=Object.assign(raw.featureChoices||{}, {'Fighter Strategies: Mastery Strategist':[{name:'Defense Mastery'}]})"` → no effect line.

### FINDING 39 — high (outside my area, seen while testing) — Unarmed Strike damage roll is 1 higher than the table
- Command: `node dev/bump-check.js berserker-test-claude --feat "Tough" --full` (dist/bump-check/before.txt)
- Expected: table "4 Kinetic" (1 + STR 3) and the roll 4.
- Actual: "Unarmed Strike damage: no dice +5 · = +3 STR modifier +1 other (weapon, style…) +1 flat damage".
- Where: app/roller.js damage: `damageParts` already contains the flat 1 (as "other") and `{ label: 'flat damage', value: n }` adds it again for weapons without a die.
