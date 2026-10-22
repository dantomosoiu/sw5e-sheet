# Panel round 3: classes-b (Monk, Operative, Scholar, Scout, Sentinel; multiclass improvements; backgrounds)

Log: one line per source (OK / no number / FINDING n). Findings at the end.

## Sources

Method: every feature of the five classes is read from the class text the sheet itself uses (`clsTextFeatures`), the
option lists from `parseClassOptions`; the sentences that could change a number were picked out, then checked with
`node dev/bump-check.js` on rakatan-test-local (Monk 5 / Operative 2), scholar-test-claude (Scholar 3) and others
changed with `--js` (levels, archetype, options in `classes[i].options`, choices in `featureNotes`).

### Monk: class features
- Martial Arts (1): FINDING 1 (unarmed strike / monk weapons get neither the finesse/Dexterity nor the Martial Arts die); FINDING 5 (the unarmed strike damage card adds the flat 1 twice)
- Unarmored Defense (1): OK for the choice, armor and shield (16 → 14 with a light shield; CHA chosen → 12); FINDING 2 (the ability modifier ignores increases from later effects: Perfect Self, items)
- Focus (2, 11): OK (Focus uses = Focus Points column: 5 at 5th, 9 at 9th, 20 at 20th); focus DC/attack: no number shown (see note)
- Monastic Vows (2): option list, see below
- Unarmored Movement (3, 9): OK (+15 at 5th, +20 at 9th, +30 at 20th; dropped with a shield)
- Deflect Missiles (3): no number (reaction roll at the table)
- Monastic Order (3): no number
- Ability Score Improvement: no number (engine)
- Slow Fall (4), Extra Attack (5), Stunning Strike (5), Enhanced Strikes (6), Evasion (7), Stillness of Mind (7), Timeless Vessel (15): no number
- Purity of Body (13): OK-ish (listed under Immunities: "Immune to disease and poison and resistant to poison damage"); the poison resistance is not listed under Resistances (low, see FINDING 6)
- Diamond Soul (14): FINDING 3 (proficiency in all saving throws not applied)
- Empty Body (18): FINDING 4 (listed as a permanent "Resistance to all damage", and "but force damage" is dropped)
- Perfect Self (20): OK (DEX +2 and the chosen WIS/CHA +2, maximum 22 respected: 20 → 22; explanation "+2 DEX · Perfect Self Monk feature"); its AC follow-on is FINDING 2

### Monk: Monastic Vows (18)
- Vow of Deflection: no number (reaction roll)
- Vow of the Devoted: no number (powers with focus points)
- Vow of Fate, Vow of Fortitude, Vow of Freedom, Vow of Intuition, Vow of the Limber, Vow of the Nemesis, Vow of Requital, Vow of Restoration, Vow of the Versatile: no number
- Vow of the Fighter: no number itself (a fighting style slot; styles are classes-a's)
- Vow of the Focused: FINDING 13 (low; the substitute ability can't be chosen for Unarmored Defense / focus)
- Vow of the Open Mind: OK (Athletics chosen: proficient, +0 → +6 at 17th, "Vow of the Open Mind Monastic Vows feature")
- Vow of Precision: FINDING 7 (unarmed critical range 19–20 not applied)
- Vow of Serenity: FINDING 8 (focus maximum not raised)
- Vow of Spirit: FINDING 9 (WIS/CHA for unarmed strikes not applied)
- Vow of the Sentry: FINDING 48 (Unarmored Movement dropped in light/medium armor) and FINDING 10 (armor proficiency not shown)

### Monk: orders
- Crimson Order: Crimson Armaments FINDING 48 (speed dropped in armor) and FINDING 10 (light/medium armor proficiency not shown); Crimson Squall no number; Vigilant Sentinel (+10 Perception if you don't move) no number at rest (table-time); Sovereign Protector FINDING 11 (its state applies nothing: AC +2, speed doubled, advantage on DEX saves)
- Echani Order: Echani Weapons (proficiency with two chosen weapon types; Agile Parry +2 AC till next turn; Echani's Shot +1d4): FINDING 12 (no picker for the Echani weapons, no state); One with the Blade, Unerring Accuracy: no number; Sharpen the Blade (+1..+3 to one weapon for a minute): part of FINDING 12
- Matukai Order: Force-Enhanced Strikes, Instinctive Leap, Control the Field: no number; Absorb Damage (resistance to kinetic and energy till next turn, 4 uses): FINDING 14 (low; uses OK, no state with the resistances)
- Nightsister Order: Ichor Lightning: FINDING 15 (low; the ranged focus attack has no attack/damage line); Dark Magick, Mastery of Death, Spirit Blade Assault: no number
- Aing-Tii Order: Forcecasting OK (force points 8 = monk level 5 + WIS 3; DC 14, attack +6); Flow-Walking, Prismatic Step, Iridescent Strikes: no number
- Jal Shey Order: Mystical Erudition OK (Lore, Medicine proficient at 11th) but FINDING 16 (low; the picker stays at 1 at 11th: "Skill proficiency 2 / 1", and a note gives 2 at 5th); Extort Truth, Preternatural Counter, Mercurial Mind, Debilitating Barrage: no number
- Kage Order: Darkness Charges, Disruptive Shock, One With Darkness, Opportunist: no number (table-time)
- Kro Var Order: Elemental Attunement / Adept / Master / Paragon / Avatar: states and table-time effects; Paragon options list their resistances/flying speed when started (OK); Avatar FINDING 14 (its state lists none of its resistances/speeds)
- Kyuzo Order: Intercept OK (Net becomes proficient: +3 → +6) but FINDING 17 (low; explanation reads "Proficient: vibroweapons with the thrown property and they become monk weapons for you"); Scattering Stance, Curved Throw, Relentless Assault: no number (table-time)
- Rakatan Order: Techcasting OK (points/DC/attack worked out by the sheet: 6 points, DC 14, +6 at Monk 5); Focused Tech, Harmonious Rakatan, Tech Mastery: no number
- Teras Kasi Order: Forredari Stance, Steel Hands Form: states (advantage vs charm/fear listed); Matter Over Mind, Spitting Rawl: no number
- Trickster Order: Bumbling Technique OK (Performance proficient: −1 → +2); Clumsy Sway, Luck of the Fool, Comic Frenzy: no number
- Whills Order: Flurry of Light FINDING 18 (proficiency with blaster pistols/rifles, ion pistols/rifles, lightbow not applied: blaster rifle +3, should be +6); The Force is With You, One With the Force: no number; Guided Strikes (+focus modifier to the first ranged and first melee attack each turn): FINDING 19 (low; not offered on the damage card)

### Operative: class features (case built from rakatan-test-local as a plain Operative 9: scratchpad case op9)
- Expertise (1, 6): OK (asks for 2, then 4: "Operative Expertise (4 more)" at 9th; Persuasion expertise from a note works on the Scholar)
- Sneak Attack (1): dice OK (1d6 at 1st, 5d6 at 9th; the Operative multiclass improvement adds half the other class: Monk 5/Op 2 → 2d6); FINDING 20 (offered on every weapon, also unarmed strikes and non-finesse melee weapons)
- Cunning Action, Operative Exploits (list, below), Bad Feeling, Operative Practice, Uncanny Dodge, Evasion, Elusive: no number
- Reliable Talent (11): no number shown (minimum roll on proficient checks; not on the dice card, low, not filed)
- Blindsense (14): FINDING 21 (low; "aware of hidden or invisible creatures within 10 feet" not listed under senses)
- Slippery Mind (15): OK (Wisdom saves proficient: +3 → +9 at 20th)
- Stroke of Luck (20): OK (DEX +2 and INT +2, "+2 DEX · Stroke of Luck Operative feature"; AC and initiative follow)

### Operative: Operative Exploits (11)
- Commander's Exploit: FINDING 10 (medium armor proficiency not shown anywhere: a feature that only gives armor proficiency makes no effect)
- Explorer's Exploit, Fate's Exploit, Freedom's Exploit, Mentor's Exploit, Skill's Exploit, Technologist's Exploit: no number
- Fighter's Exploit: OK (a fighting style slot "Operative Exploits: Fighter's Exploit")
- Guerrilla's Exploit: OK (advantage on saves against exhaustion listed)
- Learner's Exploit: OK (Athletics and Forgery kit proficient)
- Weaponmaster's Exploit: FINDING 22 (no picker for the three weapons; Revolver stays +3 with the weapons written in its note, should be +7)

### Operative: practices
- Acquisitions Practice: Supreme Sneak OK (falling damage resistance listed); Fast and Agile, Deft Hands, Aerial Agility, Thief's Reflexes: no number
- Beguiler Practice: Forcecasting OK (12 points at 9th = table 9 + WIS 3; max level 2; DC 15); Fascinating Display, Mesmerizing Presence, Enthralling Vigor, Distracting Countenance: no number
- Lethality Practice: Bushmaster OK (advantage on initiative: "Advantage from Bushmaster"); Assassinate (uses 1/2/3 by level), Lethal Strikes, Infiltrator, Death Strike: no number
- Sharpshooter Practice: Assume the Position OK (Revolver chosen: +3 → +7, "Assume the Position Sharpshooter Practice feature"); Placed Shots, Head Shot, Distracting Shot, Double Tap: no number
- Bolstering Practice: Articulate Authority, Fireteam Commander, Open Opportunity, Ambush Tactics, Squad Goals: no number
- Disabling Practice: Clinch Strike OK (unarmed die 1 → d4); Skilled Grappler, Human Shield, Kiss the Wall, Neck Snap: no number
- Gunslinger Practice: Dive For Cover, Trick Shooter, Spinning Flourish, Ricochet Shot, Quickdraw: no number
- Maverick Practice: Maverick Superiority OK (4 dice d8, 6 maneuvers at 9th); Know a Bit FINDING 23 (half proficiency from the old proficiency bonus after a level-up: +1 on skills/initiative, +2 on plain checks); Outplayed, Practice Makes Perfect: no number; Flow State: state (can't have disadvantage… listed)
- Performance Practice: Artful Dancer: Performance and the instrument OK; FINDING 24 (half CHA to AC while unarmored not applied); Dazzling Steps, Flexible Body, Dance of Death: no number; Master of Dance FINDING 25 (CHA to initiative not applied)
- Pugnacity Practice: Tools of the Trade OK (Vibrosword 0 → +4, medium armor chip shown); Blitz Attack, Extra Attack, Unrelenting Advance (advantage listed), Razor Focus: no number
- Ruffian Practice: Rakish Audacity FINDING 25 (CHA to initiative not applied); Nimble Step, Panache, Elegant Maneuver, Master Duelist: no number
- Saboteur Practice: Bonus Proficiencies OK (astrotech's implements +6); Techcasting OK (7 points at 9th = 5 + INT 2, level 2, DC 14); Tracker Droid Companion, Powered Ambush, Ion Pulse, Sabotage: no number
- Sawbones Practice: General Practice OK (Medicine proficient; INT instead of WIS not offered, WIS is higher here); Debilitating Strike, Swift Surgery, Dosage Control: no number; Self-Sustain (advantage on death saves): not listed (low, part of FINDING 21)
- Scrapper Practice: Back Blast OK (Revolver +3 → +7); Hostile Negotiations OK (Intimidation proficient, "can't have disadvantage" listed); Upper Hand, Sleight of Foot, Double Tap: no number
- Shadow Killer Practice: Venomous OK (poisoner's kit); Dark Arts, Poisoner, One With the Dark, Shades of Night: no number

### Scholar: class features (scholar-test-claude, Scholar 3 Gambler; levels and pursuit changed with --js)
- Academic Superiority (1): OK (4 dice d4 at 3rd, maneuvers 4 + 2 from Malleable Maneuvering = 6; physical DC 13 DEX, mental/general DC 14 INT)
- Critical Analysis (1): FINDING 26 (the state applies nothing: INT for finesse/blaster attacks against the target is not offered)
- Discovery (2): list, below
- Sage Advice (2, 13): OK (1 use per long rest at 3rd); no number otherwise
- Expertise (3, 10): OK (Persuasion and Forgery kit at expertise: Forgery kit +8 = INT 4 + 2×2)
- Academic Pursuit, Multitasker (5), Adaptable Intellectual (18): no number
- Calm and Collected (14): uses read (five, +1 at 17th); FINDING 27 (low; the +INT to a save against a seen effect is not offered on the save card)
- Knowledge Unbound (20): checked with the parser only (INT +4, maximum 24, same path as Perfect Self/Stroke of Luck which are OK)

### Scholar: Discoveries (23)
- Academic Memory, Adaptive, Ambassador (languages), Expert's Advice, Master's Advice, Lingering Advice, Quick Analysis, Targeted Analysis, Universal Language, Versatile Maneuvers, Tech Amateur, Perfect Maneuver, Reliable Sources: no number
- Clever Applications: low (improvised weapon proficiency/1d6 not shown; improvised weapons are not on the sheet) - no number
- Hardened Mind: OK (advantage vs illusions and psychic resistance listed)
- Lifelong Learning: OK (Persuasion + Forgery kit proficient)
- Malleable Maneuvering: OK (+2 maneuvers known)
- Mental Prowess, Survival Expert (CA modifier for Survival / grapples): FINDING 27 (low; not offered); Survival Expert's poison-save advantage listed OK
- Moderately Armored: FINDING 10 (armor proficiency not shown)
- Rancor's Discipline: FINDING 13 (low; WIS/CHA in place of INT can't be chosen)
- Resolute (+INT to saves vs charm/fear): FINDING 27 (low; not offered on the save card)
- Running on Fumes: OK (advantage vs exhaustion listed)

### Scholar: pursuits
- Gambler Pursuit: Gambler's Aptitude OK (Pazaak + Sleight of Hand, "can't have disadvantage" listed); Risk versus Reward, Lucky Number 7, Tell Me the Odds, Borrowed Luck: no number; discoveries Ace Up Your Sleeve, Against the House, Ante Up, Cold Read, Feeling the Pressure, Take a Chance, The Magic Number: no number; Calculated Bluff FINDING 27 (low; INT/WIS for Charisma checks not offered)
- Physician Pursuit: Medical Practitioner (biochemist's kit + Medicine/Nature): parser OK; Remote Healer, Field Surgeon, Resuscitate, Panacea: no number; discoveries Advanced Remote Healer, Experimental Treatments, From the Brink, Health Advisor, Patient Protector, Surgical Precision: no number at rest; Tend the Wounded FINDING 28 (the patient side-effect table gives the scholar "Resistance to cold and fire damage")
- Politician Pursuit: Silver Tongue FINDING 29 (the Charisma skill and the two languages are never asked for); Motivating Diplomat, Reassemble, Beguiling Presence: no number at rest; Force of Personality: uses OK (3); FINDING 30 (low; lists "Immune to this effect" under Immunities); discoveries Charming Feint, Demanding Leader, Dominating Presence, Influencer, Reliable Words, Tyrant's Ferocity: no number; Social Opportunist FINDING 31 (half proficiency on Charisma checks not applied)
- Tactician Pursuit: Battle Display OK (martial blasters and vibroweapons: Vibrobaton proficient); Tactical Mastery, Fire as One, All-Out Attack: no number; Battlefield Survey FINDING 32 (Stealth always rolled with advantage); discoveries Commander's Armor FINDING 10; Fighting Style (slot), Contingency Plan, Firing Command, Observant Leader, Studied Commander, Tactical Retreat, Unbound Commander: no number
- Archaeologist Pursuit: Studious Excavator FINDING 33 (Lore proficiency missing; tool named "archaeologist kits and in the Lore skill"); Forcecasting: points OK (7 = 3 + INT 4), per-power DC/attack OK (14 / +6 INT) but FINDING 34 (the card's Light/Dark/Universal DC 11 and attack +3, and their attack rolls, use WIS/CHA); Archaic Diagnostics, Force Carving, Psychometric Analysis, Knowledge is Power: no number; discoveries Force Combat Knowledge (simple lightweapons: parser OK), It Belongs in a Museum, Localized Survey, Making This Up As You Go, Telekinetic Ministrations, The Years and the Mileage, Archive Research: no number; Tomb of the Ancients FINDING 35 (low; "Resistance to the triggering damage" listed as permanent)
- Chef Pursuit: Culinary Knowledge (chef's kit + Nature/Survival): parser OK; Emergency Supplements, Balanced Diet, Comfort Food, Heroes' Feast and the 16 chef discoveries: for the food's eaters, no number on the scholar
- Detective Pursuit: Martial Training FINDING 33 (Investigation proficiency missing; martial vibroweapons OK); Intelligent Applications, Extra Attack, Sharp Instincts, Discombobulate: no number; discoveries Athletic (low: always "swimming", the choice of climbing/crawling isn't asked), Brawler Adept (unarmed die step: parser OK), Scrapper's Armor FINDING 10, Fighting Style (slot), Eye for Attire, Eye for Detail, Ear for Deceit, Steady Eye, Thirst for Justice, Unerring Eye: no number
- Explorer Pursuit: Focused Navigator FINDING 36 (Piloting and Survival applied without asking; the note "Perception, Acrobatics" is ignored); Surveyed Area, Field Advantage, Survey Master: no number; Unstoppable Adventurer: low (only the climbing speed listed, swimming missing); discoveries Dungeon Explorer FINDING 32 (Perception always with advantage, "Resistance to damage" listed), Cover Adept, Galactic Explorer, Grappling Hunter, High Ground, No Stone Left Unturned, Versatile Explorer: no number at rest
- Geneticist Pursuit: Genesplicer's Methods OK (Medicine proficient + implements); Mutagenic Analysis: conditional (not offered, FINDING 27); Mutagenic Transformation FINDING 37 (the 1-hour state applies neither the Strength score nor the AC bonus); Geneticist's Resilience: poison resistance listed, poison/disease immunity missing (low, FINDING 6); Chimeric Adaptation: ambiguous (the aspect's benefits "for the duration" of the transformation): treated as not permanent, accepted; discoveries Adapted Hide, Enhanced Musculature, Mutagenic Hardiness, Unnatural Weaponry FINDING 38 (none applied: AC 13+DEX, carrying capacity ×2, HP max +level, unarmed 1d4 with STR/DEX/INT); Icarian Mutation (fly speed), Underground Adaptation (burrow): low, not listed; Predatory Senses: darkvision 60 listed OK; Atmospheric Adaptation: no number
- Occultist Pursuit: Theurgic Research FINDING 33 (Lore and Nature proficiency missing); Curse of Objurgation, Heightened Hex, Voodoo Doll, Toil and Trouble: no number; discoveries Arcane Membrane (advantage on Lore or Nature checks): low, not applied; Savage Sortilege OK (psychic resistance); Supernatural Vigor: for the chosen creature; Evil Eye, Exsanguination, Hexes and Superstitions, Natural Karma: no number
- Slicer Pursuit: Hacker's Disposition FINDING 33 (Technology proficiency missing; tool named "slicer's kits and in the Technology skill"); Techcasting OK (6 points at 3rd = 2 + INT 4); Potent Programming, Redirect Error, System Override, Systems Hijack (no level line): no number; discoveries: no number
- Zoologist Pursuit: Wilderness Expert OK (parser: Animal Handling proficient + advantage); beast companion features: on the companion, no number on the scholar

### Scout: class features (scratchpad case scout9: rakatan-test-local rebuilt as a plain Scout 9)
- Ranger's Quarry (1, 5, 9, 17): die column OK (1d8 at 9th, "Class dice"); state startable; FINDING 39 (the quarry die is never offered on weapon damage, unlike Sneak Attack and the Splashclass Scout's quarry)
- Pathfinder (1): no number at rest (advantage on Survival only while travelling an hour or more: correctly not preselected)
- Techcasting (2): OK (11 points = 9 + INT 2; max level 3; DC 14, +6)
- Fighting Style (2): slot (classes-a checks the styles)
- Scout Routine (3): list, below
- Scout Technique, Extra Attack, Commando, Combat Tech, Supreme Awareness: no number
- Expertise (6, 14): OK (2 at 9th, 4 at 20th)
- Foe Slayer (20): OK (the chosen DEX +2 and INT +2; AC and initiative follow, "+2 DEX · Foe Slayer Scout feature"); the once-per-turn +INT to attack or damage: FINDING 27 (low; not offered)

### Scout: Scout Routines (8)
- Adaptability, Maven's, Mesmer's, Nomad's, Strider's, Warden's Routine: chosen at the start of each turn; no number at rest
- Responder's Routine (+PB to initiative), Sharpshooter's Routine (+INT to the first weapon attack): FINDING 27 (low; not offered on the initiative / attack cards)

### Scout: techniques
- Bulwark Technique: Bonus Proficiencies (heavy armor) FINDING 10; Personal Barrier (barrier HP 2×level+INT): low, no tracker (not filed separately); Mark of the Bulwark, Projected Barrier, Regenerative Shielding: no number; Adaptive Barrier FINDING 35 (lists "Resistance to one type of damage" as the scout's own)
- Hunter Technique: Hunter's Prey / Defensive Tactics / Multiattack / Superior Hunter's Defense: choice lists; Steel Will and Escape the Horde listed OK when chosen (parser); Colossus Slayer's +1d8: not offered (part of FINDING 39); Mark of the Hunter: no number
- Slayer Technique: Bonus Proficiencies FINDING 10; Slayer's Pride OK (advantage vs frightened listed); Mark of the Slayer (+quarry die): FINDING 39; Supernatural Defense, Nemesis, Slayer's Counter: no number
- Stalker Technique: Accomplished Ambusher, Mark of the Stalker, Concealment, Stalker's Flurry, Stalker's Dodge: no number at rest
- Artillerist Technique (and Companion): Bonus Proficiencies (artillerist's implements) parser OK; the rest: no number
- Deadeye Technique: Deadeye Superiority FINDING 40 (superiority die d6 and "Superiority dice 6 4/4" from SW5E's engine quirk; the Deadeye table says d8 at 9th); Mark of the Deadeye, Cover to Cover, Shoot First, Overwatch: no number
- Illusionist Technique, Teleportation Technique (tinker's implements OK), Triage Technique (Medicine OK by parser), Predator Technique (heavy armor: FINDING 10; Predator's Resolve state with advantage on CON saves OK): the rest no number
- Inquisitor Technique: Forcecasting Secrets, Mark of the Inquisitor, Sense Force, Inquisitor's Wrath: no number; Force Resistance FINDING 35 (lists "Resistance to damage" as permanent; it is only against force powers cast by the quarry within 30 ft)
- Mastermind Technique: Instinctive Combatant FINDING 41 (INT instead of DEX for AC in light/medium armor not applied: 14, should be 15 with INT 18); Mark of the Meticulous (INT vs the quarry): FINDING 27 (low); Adaptive Techie, Emergency Planning, Exploit Weakness: no number
- Mechanist Technique (and Companion): Improved Techcasting OK (16 points = 14 + INT 2, max level 4, worked out by the sheet); High Voltage OK (ion and lightning resistance); others no number

### Sentinel: class features (scratchpad case sent9: Sentinel 9)
- Forcecasting (1): OK (30 points = 27 + WIS 3; max level 4; universal DC 15, +7)
- Led by the Force (1): FINDING 23 (same as Know a Bit: +1 from the old proficiency bonus after a level-up, should be +2 at 9th)
- Force-Empowered Self (2): Kinetic Combat die OK (1d8 at 9th, class dice); FINDING 42 (low; Double Strike / Deflection not offered on the damage card / AC, unlike the Guardian's Force-Empowered Strikes)
- Sentinel Ideals (2): list, below
- Sentinel Calling, Extra Attack, Battle Readiness: no number
- Enlightened Evasion (15): conditional (2 force points, +WIS/CHA to a save): FINDING 27 (low)
- Center of the Force (20): same path as Perfect Self (DEX +2, WIS/CHA +2 chosen, maximum 22): parser OK

### Sentinel: Sentinel Ideals (9)
- Ideal of the Agile: OK (climbing and swimming speed listed)
- Ideal of the Artisan: FINDING 43 (half WIS/CHA, minimum 1, on the chosen skill not applied: Stealth stays +7)
- Ideal of the Contender: unarmed die 1 → d4 OK; FINDING 44 (the finesse property is not applied: unarmed +4, should be +7 with DEX 3)
- Ideal of the Fighter: slot (fighting style)
- Ideal of the Hunter: FINDING 45 (with a species darkvision of 60 ft it stays 60, should be 90)
- Ideal of the Steadfast, Ideal of the Tranquil, Ideal of the Vigorous: no number at rest (manifests are table-time)
- Ideal of the Titan: FINDING 10 (medium armor proficiency not shown)

### Sentinel: callings
- Path of Focus, Path of Communion (Ethereal Vision truesight 60 listed), Path of Meditation, Path of Tenacity (Indomitable listed), Path of Witchcraft (Stormcaller state lists flying speed and resistances; Companion: Animal Handling parser OK), Path of Synthesis (Synthetic Understanding asks Technology or a tool: OK), Path of Aggression (Thunderous Momentum listed as one long "Immune to the shocked condition, and each slowed level…" line, low): the rest no number
- Path of Shadows: Shadow Strike FINDING 39 (the extra 1d6 is not offered on damage); Dead Silence, Cloak of Shadows, Shadow Step, Shadow's Wrath: no number
- Path of the Corsair: Bonus Proficiencies OK (demolitions kits + the three blasters from the note: Blaster rifle +3 → +7)
- Path of the Forceblade: Forceblade Bond FINDING 46 (WIS/CHA for the bonded weapon's attack and damage not applied: WIS 20 → still +7 / d8+3 DEX); Phasethrow etc.: no number
- Path of Ethereality: Out of Touch FINDING 35 (flying speed listed as permanent; only during the 1-minute effect); Aberrant Resilience, Event Cascade, Aberrant Self: no number
- Path of Iron: Form Combat Training FINDING 47 (martial light- and vibroweapon proficiency not applied: Vibrosword +0, should be +4); Physical Conditioning FINDING 47 (HP max +3 and +1 per later sentinel level not applied; WIS/CHA for AC in light/medium armor not applied); Enhanced Force-Empowered Self, Follow Through, Kinetic Mastery: no number

### Multiclass improvements (10; scratchpad cases mc-X: Monk 5 / X 3, the improvement added with --js)
- Berserker: OK (Monk 12 / Berserker 3: Rages 3 → 4, Rage Damage +2 → +3, also on the damage card)
- Consular: OK (+5 force points: 15 → 20, "+5 Force points · Multiclass Improvement (Consular) Monk levels"); Force Recovery regain: no number shown
- Engineer: tech points OK (+2: 8 → 10, explained); Potent Aptitude die OK (d4 → d6); FINDING 49 (Potent Aptitude uses stay 2, should be 3 at the boosted level 8)
- Fighter: OK (superiority d4 2/2 → d6 3/3); Second Wind healing: no roll offered (no number)
- Guardian: Focused Strikes OK (2d8 → 3d8, also the Force-Empowered Strikes options); FINDING 49 (Channel the Force uses stay 2, should be 3 at the boosted level 5)
- Monk: OK (Monk 4 / Operative 3: Martial Arts d4 → d6); applies to the class dice chip only (FINDING 1: the die isn't on the unarmed strike)
- Operative: OK (Monk 5 / Op 2 → 2d6 Sneak Attack; Monk 4 / Op 3: 2d6 → 3d6)
- Scholar: OK (superiority d4 4/4 → d6 6/6, maneuvers known 4 → 10)
- Scout: OK (Ranger's Quarry d4 → d6)
- Sentinel: OK (Kinetic Combat d4 → d6)

### Class improvements (my five)
- Monk (heal with 2 focus points), Operative (aim), Scholar (swap a maneuver), Sentinel (Kinetic Combat die with advantage): no number
- Scout: OK (uses 1 per short rest tracked); the Class Improvement feat's +1 ability is the feats area's

### Splashclass improvements (my five; consular-test-local)
- Monk: OK (3 uses = proficiency bonus, long rest)
- Operative: uses OK (3); FINDING 20 (its 1d6 is offered on the Vibrobaton and unarmed strikes, which aren't finesse or ranged)
- Scholar: FINDING 50 (uses 2 OK, but recharge read as "short rest": the text says long rest; "short or long rest" is about the friendly creature)
- Scout: OK (2 uses, long rest; +1d4 offered on weapon damage)
- Sentinel: FINDING 42 (low; Double Strike / Deflection d4 not offered; no use count for the force points spent this way)

### Backgrounds (61)
- Every background feature (Agent "Safe Haven" … Urchin "City of Secrets"): no number (roleplay, contacts, travel pace). Checked the Noble's chosen skills too: Lore and Persuasion proficient once (+2 → +5, −1 → +2), no double count.

### Note on testing
- Cases built in the scratchpad (op9, scout9, sent9, mc-*) keep the recorded SW5E calculation of rakatan-test-local in `snap.complete`; anything the sheet reads from it (the proficiency bonus for half proficiency, base scores for caps) is then stale. Caps were re-checked with a baseline whose `snap.complete` was recomputed by the engine (Knowledge Unbound: 22 → 24 "capped from +4"; Perfect Self 20 → 22). FINDING 23 is the same staleness in the real sheet after a level-up on the sheet.
- A multiclass case needs one hit-point entry per level for the second class; without it the engine refuses the character and the sheet silently keeps the old calculation (no error in the bump-check output). Worth a warning in bump-check.

## Findings (most severe first)

`<cases>` = `C:\Users\danto\AppData\Local\Temp\claude\C--Users-danto-Downloads-sw5e-sheet\957d7dcb-89b1-4b5e-8249-10491f5bf5e2\scratchpad\cb\cases\`
(op9 = Operative 9, scout9 = Scout 9, sent9 = Sentinel 9, mc-X = Monk 5 / X 3, all built from rakatan-test-local;
monk-dex20 = Monk 5 with DEX 20 / WIS 20 and sch-int20 = scholar-test-claude with INT 20, both with the stored calculation recomputed by the engine).

1. **high · Martial Arts not applied** (Monk). "Your unarmed strikes and monk weapons gain the finesse property." / "You can roll a d4 in place of the normal damage of your unarmed strike or monk weapon. This die changes as you gain monk levels…"
   `node dev/bump-check.js rakatan-test-local --js "raw.classes[0].levels=9; raw.classes[0].hitPoints.push(5,5,5,5)"`
   Expected Unarmed Strike +7, 1d8+3, Dexterity. Actual "+4 | 1 Kinetic | Strength" (recorded Monk 5: +3 / 1, should be +6 / 1d6+3); only the "Martial Arts 1d8" chip changes. Code: classes.js clsFeatureEffects has no Martial Arts reader; viewer.js applyEffects sets unarmed die/finesse only from species traits.
2. **high · Unarmored Defense ignores later WIS/CHA increases.** "your AC equals 10 + your Dexterity modifier + your Wisdom or Charisma modifier (your choice)."
   `node dev/bump-check.js <cases>monk-dex20.json --js "raw.classes[0].levels=20; raw.classes[0].hitPoints=Array(19).fill(5); raw.featureNotes={'perfect self':'Wisdom'}"` → AC 21 ("+5 AC + WIS/CHA" from WIS 20), expected 22 (DEX 22, WIS 22). `node dev/bump-check.js rakatan-test-local --item "Wisdom Augment (Champion)" --equip` → WIS 16 → 18, AC stays 16 (expected 17). Code: effects.js fxResolve evaluates abilityMod in effect order (features before Perfect Self, items, temporary effects).
5. **high · Unarmed strike damage card adds the flat 1 twice.** `node dev/bump-check.js rakatan-test-local --js "raw.classes[0].levels=9; raw.classes[0].hitPoints.push(5,5,5,5)"` → table "1 Kinetic", card "no dice +2 · = +1 other (weapon, style…) +1 flat damage" (Scholar STR +1: table 2, card 3). Code: roller.js buildRoll 'damage' adds "flat damage" n when the die is 0; engine.js engWeapons already put the 1 in damageBonus.
23. **high · Half proficiency uses the old proficiency bonus after a level-up** (Know a Bit, Led by the Force). "You can add half your proficiency bonus to any ability check you make that doesn't already include your proficiency bonus."
   `node dev/bump-check.js rakatan-test-local --js "raw.classes[0].levels=8; raw.classes[0].hitPoints.push(5,5,5); raw.classes[1].levels=3; raw.classes[1].hitPoints.push(5); raw.classes[1].archetype={name:'Maverick Practice'}"` → PB 4 but "tweak: initiative +1 · Know a Bit", skills +1, while the plain Strength check card says "+2 half proficiency". Code: viewer.js applyEffects uses complete.proficiencyBonus from snap.complete (SW5E's stored calculation).
36. **high · Focused Navigator gives Piloting and Survival without asking.** "You gain proficiency in two of the Perception, Piloting, Survival, and Acrobatics skills."
   `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].archetype={name:'Explorer Pursuit'}; raw.classes[0].options={Discoveries:[{name:'Dungeon Explorer'}]}; raw.featureNotes['focused navigator']='Perception, Acrobatics'"` → Piloting +4 → +6 and Survival +1 → +3 proficient, Perception not; no picker. Code: clsFeatureEffects ("two of the … skills" not read as a choice).
40. **high · Superiority dice from SW5E's engine quirk.** Deadeye: "…as shown in the Superiority Dice Size column of the Deadeye Superiority table" (d8 at 9th); Scholar: "You have three superiority dice, which are d4s…".
   `node dev/bump-check.js <cases>scout9.json --js "raw.classes[0].archetype={name:'Deadeye Technique'}"` → "Superiority dice 6 4 / 4", die roll d6 (expected d8). `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].archetype={name:'Slicer Pursuit'}"` → "Superiority dice 0 2 / 2", roll "no dice" (expected d4 4/4; Archaeologist: "0 3 / 3"). Code: viewer.js buildTracker prefers c.superiority (engine.js engSuperiority) over the class table.
32. **high · Battlefield Survey / Dungeon Explorer: advantage on every Stealth / Perception roll.** "…have advantage on Dexterity (Stealth) checks in that area." / "You have advantage on Wisdom (Perception) checks and Intelligence (Investigation) checks to locate any secret doors or traps, and you have resistance to damage dealt by traps."
   `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].levels=9; raw.classes[0].hitPoints.push(5,5,5,5,5,5); raw.classes[0].archetype={name:'Tactician Pursuit'}"` → "Stealth (DEX): d20 d20 +3 · mode adv"; Dungeon Explorer → "Perception … mode adv" and "Resistance to damage". Code: clsFeatureEffects skill-advantage and resistance readers.
34. **high · Archaeologist force-casting card shows WIS/CHA DC and attack.** "…+ your Intelligence, Wisdom, or Charisma modifier (your choice) … you use this ability modifier when setting the saving throw DC…"
   `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].archetype={name:'Archaeologist Pursuit', forcePowers:['Saber Throw','Force Push']}"` → card "DC 11 · attack +3" and "Universal force attack: d20 +3"; each power 14 / +6 (INT) OK, points 7 OK. Code: viewer.js force-casting card uses the engine's DCs when ownCasting is partial.
3. **medium · Diamond Soul: proficiency in all saves not applied.** "Your mastery of focus grants you proficiency in all saving throws…" `node dev/bump-check.js rakatan-test-local --js "raw.classes=[raw.classes[0]]; raw.classes[0].levels=20; raw.classes[0].hitPoints=Array(19).fill(5); raw.featureNotes={'perfect self':'Wisdom'}"` → WIS save +4 (expected +10), CON +2 (+8)… Code: proficiency reader needs "gain proficiency".
4. **medium · Empty Body listed as permanent "Resistance to all damage".** "…become invisible for 1 minute. During that time, you also have resistance to all damage but force damage." Same command → "Resistances: Resistance to all damage" always; "but force damage" dropped.
28. **medium · Tend the Wounded's side-effect table gives the scholar cold and fire resistance.** Row 15: "They gain resistance to cold and fire damage." `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].archetype={name:'Physician Pursuit'}; raw.classes[0].options={Discoveries:[{name:'Tend the Wounded'}]}"` → "Resistances: Resistance to cold and fire damage".
35. **medium · Conditional / other-creature defenses listed as permanent.** Inquisitor Force Resistance ("resistance to damage dealt by force powers they cast", listed "Resistance to damage"), Adaptive Barrier (the barrier's, listed "Resistance to one type of damage"), Out of Touch ("for the duration … a flying speed", listed permanently), Tomb of the Ancients ("Resistance to the triggering damage"). `node dev/bump-check.js <cases>scout9.json --js "raw.classes[0].archetype={name:'Inquisitor Technique'}; raw.classes[0].levels=11; raw.classes[0].hitPoints.push(6,6)"`; `node dev/bump-check.js <cases>sent9.json --js "raw.classes[0].archetype={name:'Path of Ethereality'}"`.
48. **medium · Unarmored Movement dropped in armor for Vow of the Sentry / Crimson Armaments.** "you can now gain the benefits of your Martial Arts and Unarmored Movement features while wearing light or medium armor as long as you are not wielding a shield." `node dev/bump-check.js rakatan-test-local --js "raw.classes[0].options={'Monastic Vows':[{name:'Vow of the Sentry'}]}" --item "Combat suit" --equip` → speed 45 → 30 (expected 45).
20. **medium · Sneak Attack (and Splashclass Operative) offered on any weapon.** "…the attack must use a finesse or a ranged weapon." `node dev/bump-check.js consular-test-local --js "raw.customFeats=['Splashclass Improvement']; raw.featureChoices={'Feat: Splashclass Improvement':[{name:'Operative'}]}" --item "Vibrorapier" --equip --item "Vibrobaton" --equip` → offered on Vibrobaton and Unarmed Strike. Code: roller.js damage riders.
26. **medium · Critical Analysis changes nothing.** "…attack and damage rolls made with weapons with the finesse property or blaster weapons against that target may use your Critical Analysis ability modifier, which is Intelligence…" `node dev/bump-check.js <cases>sch-int20.json --js "raw.classes[0].levels=4; raw.classes[0].hitPoints.push(5)"` → Chakram +5 (DEX), no INT option (expected +8 / 1d6+6 vs the target).
11. **medium · Sovereign Protector's state applies nothing** ("following effects": speed doubled, AC +2, advantage on DEX saves). clsFeatureState → benefits [] (looks for "following benefits").
37. **medium · Mutagenic Transformation's state applies nothing** ("Your Strength score becomes equal to your Critical Analysis score", AC + half CA modifier). `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].levels=6; raw.classes[0].hitPoints.push(5,5,5); raw.classes[0].archetype={name:'Geneticist Pursuit'}"`.
38. **medium · Geneticist discoveries apply nothing:** Adapted Hide ("your AC is 13 + your Dexterity modifier"), Enhanced Musculature (carrying capacity doubles), Mutagenic Hardiness (HP max + level), Unnatural Weaponry (unarmed 1d4 with STR/DEX/INT). `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].archetype={name:'Geneticist Pursuit'}; raw.classes[0].options={Discoveries:[{name:'Adapted Hide'},{name:'Enhanced Musculature'},{name:'Mutagenic Hardiness'},{name:'Unnatural Weaponry'}]}; raw.equipment.forEach(e=>{if(e.name==='Fiber armor') e.equipped=false})"` → AC 13 (expected 16), HP, carrying, unarmed unchanged.
47. **medium · Path of Iron: martial light/vibroweapon proficiency, HP +3 (+1 per later level), WIS/CHA AC not applied.** `node dev/bump-check.js <cases>sent9.json --js "raw.classes[0].archetype={name:'Path of Iron'}" --item "Vibrosword" --equip` → Vibrosword +0 (expected +4), HP unchanged (expected +9).
18. **medium · Whills weapons not proficient.** "You gain proficiency in blaster pistols, blaster rifles, ion pistols, ion rifles, and the lightbow…" `node dev/bump-check.js rakatan-test-local --js "raw.classes[0].archetype={name:'Whills Order'}" --item "Blaster rifle" --equip` → +3 (expected +6).
22. **medium · Weaponmaster's Exploit / Echani Weapons can't be chosen.** `node dev/bump-check.js <cases>op9.json --js "raw.classes[0].options={'Operative Exploits':[{name:\"Weaponmaster's Exploit\",note:'Revolver, Vibrosword, Techblade'}]}" --item "Revolver" --equip` → Revolver +3 (expected +7); Echani: Vibrosword +0 (expected +3). (12: Agile Parry +2 AC and Sharpen the Blade have no state.)
24. **medium · Artful Dancer: half CHA to AC not applied.** `node dev/bump-check.js <cases>op9.json --js "raw.classes[0].archetype={name:'Performance Practice'}"` → AC 13 (expected 14).
25. **medium · CHA to initiative not applied** (Rakish Audacity, Master of Dance). `node dev/bump-check.js <cases>op9.json --js "raw.classes[0].archetype={name:'Ruffian Practice'}"` → +3 (expected +5).
41. **medium · Instinctive Combatant: INT for AC not applied.** `node dev/bump-check.js <cases>scout9.json --js "raw.classes[0].archetype={name:'Mastermind Technique'}; raw.baseAbilityScores.Intelligence=18" --item "Combat suit" --equip` → AC 14 (expected 15).
7/8/9. **medium · Vow of Precision / Serenity / Spirit apply nothing.** `node dev/bump-check.js rakatan-test-local --js "raw.classes=[raw.classes[0]]; raw.classes[0].levels=17; raw.classes[0].hitPoints=Array(16).fill(5); raw.classes[0].options={'Monastic Vows':[{name:'Vow of the Sentry'},{name:'Vow of Serenity'},{name:'Vow of Precision'},{name:'Vow of Spirit'},{name:'Vow of the Open Mind',note:'Athletics'}]}"` → no 19–20 critical on unarmed, Focus 17/17 (expected 18), unarmed +6 STR (expected +9 WIS).
46. **medium · Forceblade Bond: WIS/CHA not applied.** `node dev/bump-check.js <cases>sent9.json --js "raw.classes[0].archetype={name:'Path of the Forceblade'}; raw.featureNotes['forceblade bond']='Vibrorapier'; raw.baseAbilityScores.Wisdom=20" --item "Vibrorapier" --equip` → +7 / d8+3 (expected +9 / d8+5).
44. **medium · Ideal of the Contender: finesse not applied** (d4 OK). `node dev/bump-check.js <cases>sent9.json --js "raw.classes[0].options={'Sentinel Ideals':[{name:'Ideal of the Agile'},{name:'Ideal of the Artisan',note:'Stealth'},{name:'Ideal of the Contender'}]}"` → unarmed +4, d4+0 (expected +7, d4+3).
43. **medium · Ideal of the Artisan: half WIS/CHA on the chosen skill not applied** (same command: Stealth unchanged, expected +1).
45. **medium · Ideal of the Hunter: +30 ft to existing darkvision not applied.** `node dev/bump-check.js <cases>sent9.json --species "Twi'lek" --js "raw.classes[0].options={'Sentinel Ideals':[{name:'Ideal of the Hunter'}]}"` → 60 ft (expected 90).
33. **medium · Skill proficiencies after "kits and in the … skill" lost** (Studious Excavator Lore, Hacker's Disposition Technology, Martial Training Investigation, Theurgic Research Lore and Nature). `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].archetype={name:'Archaeologist Pursuit'}"` → tool "archaeologist kits and in the Lore skill", Lore not proficient.
29. **medium · Choices never asked:** Silver Tongue ("your choice of two languages and your choice of Charisma skill"), Athletic (climb/crawl/swim). `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].levels=6; raw.classes[0].hitPoints.push(5,5,5); raw.classes[0].archetype={name:'Politician Pursuit'}"`.
31. **medium · Social Opportunist: half PB on Charisma checks not applied.** `node dev/bump-check.js scholar-test-claude --js "raw.classes[0].archetype={name:'Politician Pursuit'}; raw.classes[0].options={Discoveries:[{name:'Social Opportunist'}]}"` → unchanged (expected +1).
39. **medium · Ranger's Quarry die (and Shadow Strike, Colossus Slayer, Mark of the Slayer) not offered on damage.** `node dev/bump-check.js <cases>scout9.json --item "Blaster rifle" --equip` → no "Ranger's Quarry +1d8" option. Code: viewer.js classDice riders.
49. **medium · Multiclass improvement extra uses not applied** (Engineer Potent Aptitude, Guardian Channel the Force). `node dev/bump-check.js <cases>mc-Engineer.json --js "raw.featureChoices={'Feat: Multiclass Improvement':[{name:'Engineer'}]}" --full` → "Potent Aptitude short rest 2 / 2" (expected 3); Guardian likewise 2 (expected 3). Code: clsUsage uses the class level, not the boosted one.
50. **medium · Splashclass Scholar recharges on a short rest** ("You regain all expended uses when you complete a long rest"). `node dev/bump-check.js consular-test-local --js "raw.customFeats=['Splashclass Improvement']; raw.featureChoices={'Feat: Splashclass Improvement':[{name:'Scholar'}]}"` → "Scholar short rest 2 / 2".
12. **medium · Echani Order weapons, Agile Parry, Sharpen the Blade not available** (see 22).
10. **low · Armor proficiency from features never shown** (Vow of the Sentry, Crimson Armaments, Commander's Exploit, Moderately Armored, Commander's/Scrapper's Armor, Ideal of the Titan, Bulwark/Slayer/Predator heavy armor). `node dev/bump-check.js <cases>op9.json --js "raw.classes[0].options={'Operative Exploits':[{name:\"Commander's Exploit\"}]}"` → nothing. Code: featureEffectEntry returns null for armor-only proficiencies; "light" dropped from "light and medium armor".
6. **low · Text-only defenses missing:** Purity of Body poison resistance (only in the Immunities line), Geneticist's Resilience immunity, Unstoppable Adventurer swimming, Icarian Mutation flying, Underground Adaptation burrowing, Arcane Membrane advantage.
21. **low · Blindsense not listed; Self-Sustain's advantage not on the death save** (`node dev/bump-check.js <cases>op9.json --js "raw.classes[0].archetype={name:'Sawbones Practice'}; raw.classes[0].levels=17; raw.classes[0].hitPoints=Array(16).fill(6)"`).
27. **low · Conditional bonuses not offered on the dice cards:** Calm and Collected, Resolute, Calculated Bluff, Survival Expert, Mental Prowess, Mutagenic Analysis, Responder's / Sharpshooter's Routine, Foe Slayer's +INT, Mark of the Meticulous, Enlightened Evasion.
42. **low · Force-Empowered Self Double Strike / Deflection (and Splashclass Sentinel) not offered** (`node dev/bump-check.js <cases>sent9.json --item "Vibrorapier" --equip`).
13. **low** Vow of the Focused / Rancor's Discipline substitute ability can't be chosen. 14. **low** Absorb Damage has no state; Avatar's state lists nothing. 15. **low** Ichor Lightning has no attack line. 16. **low** Mystical Erudition picker stays at 1 at 11th ("2 / 1"). 17. **low** Kyuzo Intercept explanation wording. 19. **low** Guided Strikes not offered. 30. **low** Force of Personality lists "Immune to this effect".

## Counts
775 sources (67 class features, 69 class options, 339 archetype features, 219 archetype options, 10 multiclass, 5 class and 5 splashclass improvements, 61 backgrounds): OK 93 · no number 587 · with a finding 95 (50 numbered findings: 8 high, 30 medium, 12 low).
