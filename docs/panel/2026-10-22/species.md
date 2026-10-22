# Panel round 3: species

Player: species. Area: every species in `modules.species` (141): ability increases, speed, size, natural weapons and
unarmed strikes, natural armor / AC formulas, proficiencies, senses, resistances, other numeric traits.

## Method

- Baseline `consular-test-local` (Human Consular 5, PB 3, no armor, no weapons, no tweaks; base Str 8 Dex 14 Con 14
  Int 10 Wis 16 Cha 14). Every species was run once, one after the other:
  `node dev/bump-check.js consular-test-local --species "<name>"` (141 runs), then targeted runs with `--item`/`--js`
  for armor, weapons, high scores and choices (commands in the findings). Other cases used: `tikk-plonr-panel` (light
  armor), `kadro-vos-panel` (medium armor), `rorrwaak-panel` (Unarmored Defense).
- Fixed ability increases checked against `abilitiesIncreased` for all 141: all applied, by the right amount, with the
  explanation "base 14 · +2 <Species>". Chosen increases (`species.abilityScoreImprovement`) apply and are explained.
- Every trait that mentions proficiency, advantage, resistance, senses, uses or AC was also fed straight to the sheet's
  readers (`clsFeatureEffects`, `clsUsage` in `app/classes.js`), so the lists in the findings are complete, not samples.
- "no number" traits (roleplay/table-time; nothing for the sheet to compute): Age, Alignment, Languages, Type,
  Amphibious, Hold Breath, Trance/Torpor, Maintenance Mode, Mask of the Wild, Naturally Stealthy, Nimble Escape,
  Nimbleness, Jungle/Forest/Rain Forest Dweller, Prehensile Tail/Feet/Snout, Four/Six-Armed, Long-Limbed (reach; the
  sheet shows none), Strong-Legged (jumps; the sheet shows none), Aggressive, Leonine/Nimble/Rolling Agility,
  Prediction/Precognition/Divination, Intuitive Initiative, Shapechanger, Mimicry, Vocalizer, Foreign Biology,
  Lungless, Celestial Physiology, Wealthy, Organized, Tinker devices, Crude Weapon Specialists,
  Undersized/Pintsized/Oversized (weapon restrictions), Armor Integration, Droid Systems, Rapid Reconstruction,
  Regenerative, Cannibalize, Slow Metabolism, Quick Learner, Shape Self, Defensive Ball, Call for Peace / Grovel /
  Impose Order (actions), Force-/Tech-Insensitive/Impaired (shown under Classes and powers: OK).

## Log (one line per source)

OK = every number right with the right explanation; FINDING n = see below (several when several apply).

- Bith — FINDING 2 (Musician instrument not asked), 24 (Detail Oriented listed as "Advantage on Investigation checks" without "within 5 feet"; Keen Hearing and Smell, Sonic Sensitivity not listed). ASI, Programmer option (+3) OK.
- Bothan — FINDING 2, 3 (Shrewd: Insight and Deception not applied). ASI OK.
- Cathar — FINDING 11 (Cat's Claws: table +5 / 1d6+2, dice card +6 / d6+3). ASI, Silent Step, Darkvision 60, climbing 30 + advantage OK.
- Cerean — OK (Natural Instinct asks Nature/Perception; Second Heart 1/long rest).
- Chiss — FINDING 4 (Martial Proficiency: light/medium armor, heavy pistol, sniper rifle; the trait vanishes), 14 (Tech Resistance). Politically Minded, Darkvision 120 OK.
- Devaronian — FINDING 12 (poison resistance), 14 (Tech Resistance), 24. Curiosity, Silver Tongue ask; Heat Adaptation listed; HP OK.
- Droid, Class I — FINDING 1 (25 ft), 12 (necrotic/poison/psychic resistance, ion vulnerability), 18 (Wis/Cha +1 not prompted), 19 (Knowledge Protocol asks 1 skill, label "Choose or Charisma skills of your choice"). Immunity listed; Force-Insensitive OK.
- Droid, Class II — FINDING 1, 12, 18. Integrated Engineering, Skill Protocol ask OK.
- Droid, Class III — FINDING 1, 12, 18. Knowledge Protocol (Lore) OK.
- Droid, Class IV — FINDING 4 (Martial Protocol: armor and two weapons neither applied nor asked), 12, 18. HP OK.
- Droid, Class V — FINDING 12, 18. Manual Laborer (Athletics + implements ask), Powerful Build ×2 OK.
- Duros — FINDING 3 (Galactic Traveler: Piloting and Lore), 14, 15 (Superior Memory). Navigators, Darkvision 60 OK.
- Ewok — FINDING 1 (25 ft), 3 (Natural Survivalist: Nature and Survival), 24 (Keen Smell). Musical Culture asks; climbing 25 + advantage OK.
- Gamorrean — FINDING 4 (vibroaxe, vibromace, vibrosword), 9 (unarmed: dice card +2, sheet 1), 13 (advantage on Con saves not on the dice card), 21 (Savage Attacks). Toughness +5 at 5th level, explained, OK.
- Gungan — FINDING 4 (light/medium armor, techstaff, vibropike), 13 (Heat Sensitivity), 24 (Flexible). Darkvision, swim 30 OK.
- Human — FINDING 18 (+2/+1/+1 never prompted outside creation). With the picks made: increases, Human Versatility skill/tool/weapon (the vibrosword gets PB), Defiant 1/short rest OK.
- Ithorian — FINDING 29 (Sonic Scream DC and 4d6 not shown). Law of Life (Nature + bioanalysis kit), Call for Peace, Sonic Scream 3/long rest OK.
- Jawa — FINDING 1 (25 ft). Thieving, Tinker, Tech Dabbler powers, Darkvision, Heat Adaptation, Grovel uses OK.
- Kel Dor — FINDING 28 (Telepathy not listed). Necrotic resistance, Darkvision OK.
- Mon Calamari — FINDING 12 (cold resistance; garbled advantage chip), 18. Musical asks; Darkvision, swim OK.
- Nautolan — FINDING 15 (Acute Smell), 24 (Natural Empathy). Hide 12 + Dex (AC 15, explained), Darkvision, swim OK.
- Rodian — FINDING 3 (Stalking Hunter: Survival and Stealth), 24. Darkvision, climbing OK.
- Sith Pureblood — FINDING 18. Keen Senses, Menacing (passive 16, explained), Force-Sensitive powers, Darkvision OK.
- Togruta — FINDING 18. Wild Hunters, Tremorsense 30 OK.
- Trandoshan — FINDING 25 (unarmed damage hover). Hide 12 + Dex, Claws d4, Darkvision, Saving Face uses OK.
- Tusken — FINDING 4 (cycler rifle, vibroaxe), 18. Animal Handler, Survivors of the Sands, Desert Protection, Fearsome Roar 1/long rest, Tech-Impaired OK.
- Twi'lek — FINDING 12 (poison resistance), 24. Unarmed Combatant d4 finesse (+5 / 1d4+2, explained), Elegant Dancers, Charismatic asks, Darkvision OK.
- Weequay — FINDING 18, 21 (Savage Attacks), 24 (Keen Smell). Tanned 13 + Dex, Weapon Training (picks apply: vibrosword +2 with PB) OK.
- Wookiee — FINDING 25. Hide 13 + Dex (also over light armor; dropped in medium armor; beats Unarmored Defense, explained), Claws d4, Menacing, Powerful Build ×2, climbing, Darkvision OK.
- Zabrak — FINDING 18. Toughness +5, Unarmed Combatant, Coercive (pick applies), Crafters, Second Heart OK.
- Abyssin — FINDING 2 (Rugged Survivalist: Survival), 21. Tech-Impaired, HP OK.
- Advozse — FINDING 12 (Lava Dweller fire resistance), 27 (Vigilant uses). Hide 12, Horn d4, Darkvision OK.
- Aing-Tii — FINDING 2 (Wisdom of the Elders: Lore), 14 (Closed Mind). Armored Plates 13 + Dex OK.
- Aleena — FINDING 1 (25 ft), 27 (Bite, Racer's Reflexes uses). Bite d4, Cosmopolitan OK.
- Anomid — FINDING 14, 15 (Agricultural Exports). Tech Savant, Tech Dabbler OK.
- Anx — FINDING 15 (Acute Smell), 27 (Surgical Strikes uses), 29. Anatomical Knowledge, Surgical Strikes d4, Subsonic Bellow 3/long rest OK.
- Anzellan — FINDING 1 (20 ft), 2 (Technician), 7 (Small and Nimble +1 AC), 10 (Puny cap), 13 (Str save disadvantage; Dex save advantage not on the dice card), 16 (Tiny carrying), 18, 24 (Detail Oriented). Crafters, Tinker OK.
- Aqualish — OK (Menacing, Arms Dealers option +6, Darkvision, swim).
- Arcona — FINDING 24 (Keen Smell, Easily Addicted). Hide (no armor) 13 + Dex, Claws d4, Clever asks, Reptilian Senses option OK.
- Ardennian — OK (Darkvision, climbing 25 + advantage).
- Arkanian — FINDING 14 (Honed Mind), 24 (Sunlight Sensitivity), 27 (Arkanian Brilliance). Crafters, Infrared Sight option, Darkvision OK.
- Balosar — FINDING 2 (Spicer: spicer's kit), 12 (poison resistance), 24 (Keen Hearing listed as "Advantage on Perception checks"). Snap Senses uses OK.
- Barabel — FINDING 2 (Hunter: Survival), 27 (Tooth and Nail uses). Hide 13, Tooth and Nail d6, Darkvision OK.
- Baragwin — FINDING 1 (25 ft), 6 (Weapon Developers grants both tools), 24. Hide (no armor) 13, Travelers, Arms Dealers option OK.
- Besalisk — OK (Powerful Build ×2; Long-Limbed no number).
- Caamasi — FINDING 24 (Keen Smell), 29 (Memnii Transfer DC). Diplomatic, Scholarly, Call for Peace, Memnii Transfer uses OK.
- Chadra-Fan — FINDING 1 (25 ft), 24. Tinker, Climb 25, Second Heart OK.
- Chagrian — FINDING 12 (poison resistance). Darkvision, swim OK.
- Chevin — FINDING 2 (Nomadic: Survival), 24. Hide 13, Thick Skull d6 OK.
- Chironian — FINDING 1 (40 ft). Cultured, Hooves and Horns d6, Equine Build ×2, Powerful Charge uses OK.
- Clawdite — FINDING 18. Changeling Instincts asks two of four, Unsettling Visage uses OK.
- Codru-Ji — FINDING 15 (Natural Grappler), 24. Hide 12 OK.
- Colicoid — FINDING 1 (25 ft), 8 (Natural Armor AC 17), 14 (Closed Mind), 18. Acute Senses, Stinger d4, Cannibalize uses OK.
- Culisetto — FINDING 1 (25 ft), 21 (Surprise Attack). Climb 25, Compound Eyes option, Cannibalize/Powerful Leap uses OK.
- Dashade — FINDING 14 (Force Contention), 15 (Heat Dissipation). Claws d6, Menacing, necrotic resistance OK.
- Defel — FINDING 1 (25 ft), 2 (Sneaky: Stealth), 21, 24 (Sunlight Sensitivity). Claws d4 finesse, Miners, Darkvision 120, Hidden Step uses OK.
- Diathim — FINDING 10 (Fragile cap), 13 (Str save disadvantage), 27 (Enthralling Hypnosis). Flight listed; Luminescent Aura start button OK.
- Dowutin, Young — FINDING 24 (Keen Hearing and Smell). Hide 13, Claws, Hunter, Powerful Build OK.
- Draethos — FINDING 4 (Way of the Warrior), 28. Darkvision OK.
- Dug — FINDING 1 (25 ft), 11 (Fisticuffs: table +6, dice card +5), 21 (Fury of the Small). Menacing, Powerful Build, climbing, Courageous OK.
- Echani — FINDING 3 (Combative Culture: Lore and Acrobatics), 11 (Unarmed Combatant: table +5 / 1d6+2, dice card +6 / d6+3), 15 (Allies of the Force), 19 (label "Choose gain proficiency with…"). Martial Upbringing light armor + weapon ask, Echani Art 3/long rest (Wis) OK.
- Esh-Kha — FINDING 18 (Str/Wis +2), 21 (Savage Attacks). Inquisitive, Skill Versatility, Weapon Training, power choice OK.
- Falleen — FINDING 14 (Closed Mind), 27 (Enthralling Pheromones).
- Felucian — FINDING 2 (Stealthy: Stealth). Force-Sensitive powers, HP OK.
- Flesh Raider — FINDING 14, 15 (Hunters), 18. Menacing, Darkvision, Cannibalize OK.
- Gand — FINDING 12 (poison resistance). Exoskeleton 12, HP OK.
- Gank — FINDING 1 (35 ft), 4 (Gank Training armor; the two weapons not asked), 18, 19, 20 (ignores the Strength property of heavy armor: not applied). Athletic, Mercenary Specialization ask OK.
- Geonosian — FINDING 5 (Geonosian Weaponry makes every blaster proficient), 18. Exoskeleton 12, Flight, Crafter OK.
- Givin — FINDING 3 (Stargazer: Piloting and Technology), 15 (Mathematical Savants). Hardened Exterior 13, cold resistance OK.
- Gormak — FINDING 14 (Adaptive Resilience), 19 (the vibroweapon not asked), 24. Claws d4, Technology, tool ask OK.
- Gotal — FINDING 2 (Hunter: Survival), 18, 24. Blindsight 30 OK.
- Gran — FINDING 2 (Reader of Hearts: Insight), 24 (Keen Sight). Toughness +5 OK.
- Half-human — FINDING 23 (no increases, no speed/size, no trait).
- Harch — FINDING 17 (+1 Str, Con, Int: only Int; Str/Con made a pick), 29 (Bite DC). Bite d4 (special 1/short rest), Darkvision, Spider Climb OK.
- Herglic — FINDING 2 (Technician). Toughness, Powerful Build, swim OK.
- Ho'din — FINDING 13 (Cold Sensitivity). Biological Specialists, Crafters, Naturalist, Reptilian Senses, climbing, Second Heart OK.
- Houk — FINDING 21 (Surprise Attack). Ambusher, Toughness, Powerful Build OK.
- Hutt, Adolescent — FINDING 1 (20 ft), 10 (Dex to AC capped at +3), 12 (poison resistance), 13 (Dex save disadvantage), 14 (Closed Mind), 18, 19 (Shrewd Demeanor). Powerful Build OK.
- Iktotchi — FINDING 28. Horns d6, Pilot OK.
- Kage — FINDING 2 (Animal Handler; Weapon Training electroprod, electrostaff), 11 (table +5 / 1d4+2, should be +6 / 1d4+3), 24. Athletic, Darkvision 120 OK.
- Kaleesh — FINDING 2 (Weapon Training: blaster carbine, vibroblade, vibropike, vibrospear), 15 (Tracker), 24. Survival, Darkvision OK.
- Kalleran — FINDING 24 (Flexible, Keen Hearing). Swim, Snap Senses OK.
- Kaminoan — OK (Geneticist, Ultraviolet Sight option, Tech Dabbler).
- Karkarodon — FINDING 27 (Bite uses). Bite d6, swim OK.
- Kiffar — FINDING 14 (Nimble Reflexes), 18 (both increases), 22 (Kiffar Heritage options missing). Tribal Warrior asks, Iron Will OK.
- Killik — FINDING 28. Hardened Carapace 13 OK.
- Klatooinian — FINDING 2 (Enforcer: Intimidation; Wisdom of the Elders: Lore), 17. Toughness, Weapon Training ask OK.
- Kubaz — FINDING 24 (Keen Smell, Sunlight Sensitivity). Deft Hand, Slicer, Darkvision 120 OK.
- Kushiban — FINDING 1 (25 ft), 2 (Stealthy). Hide 12, Grovel uses OK.
- Kyuzo — OK (Darkvision; Long-Limbed/Strong-Legged no number).
- Lannik — FINDING 1 (25 ft), 2 (Wisdom of the Elders), 14 (Closed Mind), 24. Force-Sensitive powers OK.
- Lasat — FINDING 4 (Bo-rifle Training: blaster rifles, bo-rifles, vibrostaffs), 24. Powerful Build, climbing, Darkvision OK.
- Lurmen — FINDING 1 (25 ft), 3 (Natural Healer: Medicine and Nature; only the kit applied). Climbing, Darkvision OK.
- Massassi — OK (Hide 13, Powerful Build, Force Symbiosis choice slot; Oversized no number).
- Mikkian — FINDING 18, 24. Blindsight 30, Bureaucratic asks OK.
- Miraluka — FINDING 28 (Force Sight). Force-Sensitive powers OK.
- Mirialan — FINDING 1 (35 ft), 11 (table +5 / 1d4+2, should be +6 / 1d4+3), 15 (Spiritual), 21. Lore OK.
- Mustafarian — FINDING 12 (Lava Dweller fire resistance), 15 (Refinery Specialist), 18, 20. Hide 12, Darkvision, tool ask OK.
- Muun — FINDING 15 (Finance Savvy). Three Hearts OK.
- Neimoidian — FINDING 3 (Smooth Talker: Deception and Persuasion). Darkvision, Grovel OK.
- Nikto — FINDING 18, 22 (Adaptation options missing). Hide 13, necrotic resistance, Protective Membrane OK.
- Noghri — FINDING 2, 3 (Hunter: Survival and Stealth), 11 (table +5 / 1d4+2, should be +6 / 1d4+3), 24. Powerful Leap uses OK.
- Nothoiin — FINDING 15 (Expert Navigators). Born Pilots, Galactic Traveler, Major Miners ask, Starship Specialists option, Heightened Reflexes OK.
- Ortolan — FINDING 1 (25 ft), 15 (Foragers), 24. Musical (Performance + instrument ask), Grovel OK.
- Pa'lowick — FINDING 15 (Proud Performer), 29. Snout d4, Sonic Scream 3/long rest, swim OK.
- Pantoran — FINDING 2 (Political Guile not asked), 24 (Negotiators listed as "Advantage on Persuasion checks"), 27 (Impose Order). Cultured, Cold Adaptation OK.
- Patrolian — FINDING 1 (25 ft), 2 (Technician), 18. Conniving, Specialist ask, lightning resistance, Darkvision, swim 25 OK.
- Pau'an — FINDING 15 (Hypersensitive Hearing). Authoritative, Cultured, Darkvision 120, Vigilant OK.
- Pyke — FINDING 2 (Spicer). Mercantile asks OK.
- Quarren — FINDING 24 (Keen Hearing), 29. Climb, swim, Darkvision, Ink Cloud 3/long rest OK.
- Quermian — FINDING 24 (Natural Empathy), 27 (Two Brains). Watchful, Diplomatic OK.
- Rakata — FINDING 2 (Technician), 14 (Adaptive Resilience). Claws d6, Darkvision, swim, Force-Insensitive OK.
- Rattataki — FINDING 1 (35 ft), 18. Acrobatic, Intimidating, Unarmed Combatant OK.
- Rishii — FINDING 24 (Keen Hearing and Sight). Flight OK.
- Ryn — FINDING 18 (Int/Cha +2). Con Artist, Eternal Nomads, Musical ask, Darkvision OK.
- Selkath — FINDING 29 (Claws DC). Claws d4 finesse + special 1/short rest, Kolto powers, swim OK.
- Selonian — FINDING 1 (35 ft). Tail and Claw d6, climb/swim 35, Darkvision OK.
- Shistavanen — FINDING 24 (Keen Hearing and Smell). Tooth and Nail d6, Forced March, Darkvision OK.
- Squib — FINDING 1 (25 ft), 15 (Business Savvy), 24. Bite d4 OK.
- Ssi-Ruu — FINDING 1 (35 ft), 2 (Hunter: Survival), 24. Thick Skin 13, Tooth and Nail d6, Force-Insensitive OK.
- Sullustan — FINDING 24 (Keen Hearing). Pilot, Mercantile option, Darkvision OK.
- Talz — OK (Hide 12, Darkvision).
- Tarasin — FINDING 28 (Sa'tosin Sense). Chameleon Skin, Naturalist OK.
- Taung — FINDING 19 (the vibroweapon not asked). Toughness, Claws, Menacing, Relentless Endurance, Force Insensitive OK.
- Theelin — FINDING 18, 22 (Mutation options missing). Expressive, Performer, Skill Versatility OK.
- Thisspiasian — FINDING 24 (Inscrutable). Claws d4, Cultured OK.
- Tiss'shar — FINDING 18, 21, 27 (Tooth and Nail uses). Predatory Talents, Tooth and Nail d6, Darkvision OK.
- Tognath — FINDING 17 (+1 Str, Dex, Con: only Con), 26 ("Immune to most pain"). Exoskeleton 13, necrotic resistance, Primitive Nerves OK.
- Togorian — FINDING 3 (Stealthy Hunter: Survival and Stealth), 18, 21. Claws d6, Toughness OK.
- Toydarian — FINDING 1 (25 ft), 14 (Closed Mind), 15 (Business Savvy), 19 (Shrewd Demeanor). Flight OK.
- Ugnaught — FINDING 1 (25 ft). Bite d6, Crafters, Tinker, acid resistance, Darkvision, Tech Dabbler OK.
- Ugor — FINDING 1 (25 ft), 19 (Galactic Scavengers: a tool called "mechanic's kits or scavenging kits"), 24 (Amorphous Form). Poison resistance + advantage, Darkvision OK.
- Umbaran — FINDING 18, 24 (Sunlight Sensitivity). Specialization ask, Tech Dabbler, Darkvision 120 OK.
- Verpine — OK (Hardened Carapace 13, Tremorsense 30, Crafters).
- Voss — FINDING 4 (Voss Weapon Training: blaster rifle, techblade), 24 (Inscrutable). Mystic Healing, Darkvision OK.
- Vurk — FINDING 1 (35 ft). Athletic, Head Crest d6, swim, Darkvision OK.
- Xexto — FINDING 1 (25 ft), 24 (climbing advantage not listed), 27 (Racer's Reflexes, Split Mind). Dexterous, Fearless, climbing = walking OK.
- Yevetha — OK (Arm Blades d6, Toughness, Mechanical Memory option).
- Zeltron — FINDING 12 (poison resistance), 24 (Natural Empathy), 27 (Enthralling Pheromones). Charismatic asks OK.
- Zilkin — FINDING 1 (20 ft), 7 (+1 AC), 10 (Puny cap), 13, 16 (Tiny carrying), 18. Darkvision, swim 20 OK.
- Zygerrian — FINDING 2 (Reputation for Cruelty: Intimidation, saberwhip, vibrowhip). Acrobatic, Claws d4 finesse, Darkvision OK.

Counts: 141 species checked: 10 OK, 0 no number (every species has at least an ability increase), 131 with at least one
finding.

## Findings

Most severe first. Commands run from the repository root; "table" = Weapons & Attacks, "dice card" = the Rolls lines.

### 1. Species walking speed is never applied (high)
- Source: the Speed trait of 33 species. 25 ft: Droid Class I/II/III, Ewok, Jawa, Aleena, Baragwin, Chadra-Fan,
  Colicoid, Culisetto, Defel, Dug, Kushiban, Lannik, Lurmen, Ortolan, Patrolian, Squib, Toydarian, Ugnaught, Ugor,
  Xexto; 20 ft: Anzellan, Hutt (Adolescent), Zilkin; 35 ft: Gank, Mirialan, Rattataki, Selonian, Ssi-Ruu, Vurk;
  40 ft: Chironian; Half-human ("that of your non-human half"). "Flying/climbing speed equal to your walking speed"
  (Toydarian, Xexto…) inherits the wrong number.
- SW5E: Ewok "Your base walking speed is 25 feet." / Chironian "Your base walking speed is 40 feet."
- `node dev/bump-check.js consular-test-local --species "Ewok"` (also `--species "Chironian" --full`)
- Expected Speed 25 ft (Chironian 40 ft). Actual: no speed line changes; Speed stays "30 ft · 3 miles/hour" while the
  species card right below says 25 (40) feet. No explanation, no warning.
- Code: `app/engine.js` `engSpeed` ("30 ft for everyone (SW5E doesn't read the species)"), and `app/viewer.js`
  `featureEffectsUncached` skips the trait named Speed (`/^(?:Ability Score Increase|Age|Alignment|Size|Speed|Languages?)$/`),
  so no effect adds the difference (a `speed.base` mod of species speed − 30 would, with the trait named in the tip).

### 2. "You are proficient in/with …" proficiencies are ignored (high)
- Source (26 traits, 24 species): Bith Musician; Bothan Shrewd; Abyssin Rugged Survivalist; Aing-Tii, Klatooinian,
  Lannik Wisdom of the Elders; Anzellan, Herglic, Patrolian, Rakata Technician; Balosar, Pyke Spicer; Barabel, Gotal,
  Ssi-Ruu Hunter, Noghri Hunter; Chevin Nomadic; Defel Sneaky; Felucian, Kushiban Stealthy; Gran Reader of Hearts;
  Kage Animal Handler + Weapon Training; Kaleesh Weapon Training; Klatooinian Enforcer; Pantoran Political Guile;
  Zygerrian Reputation for Cruelty.
- SW5E: Barabel Hunter "You are proficient in Survival." / Kage "You are proficient with the electroprod and
  electrostaff." / Pantoran "You are proficient in Persuasion or Deception (your choice)."
- `node dev/bump-check.js consular-test-local --species "Barabel"`
- Expected Survival +6 (Wis +3, PB 3), passive and dice card too, "Hunter · Barabel trait" in the tip. Actual: Survival
  stays +3 (Not proficient); no effect "Hunter" at all; Pantoran's choice is never asked; Bith's instrument never asked.
- Code: `app/classes.js` `clsFeatureEffects`: proficiencies are read only from
  `/(?:\bgain|^\s*you have) proficiency (?:in|with) (.+?)(?:\.|$)/`.

### 3. Two skills joined by "and" are ignored (high)
- Source: Bothan Shrewd, Duros Galactic Traveler, Ewok Natural Survivalist, Rodian Stalking Hunter, Echani Combative
  Culture, Givin Stargazer, Neimoidian Smooth Talker, Togorian Stealthy Hunter, Noghri Hunter, Lurmen Natural Healer
  (gets only the kit).
- SW5E: Rodian "You have proficiency in the Survival and Stealth skills." / Ewok "You have proficiency in Nature and
  Survival." / Lurmen "You have proficiency in the Medicine and Nature skills, and the bioanalysis kit."
- `node dev/bump-check.js consular-test-local --species "Rodian"`
- Expected Survival +6 and Stealth +6 (Dex 16 +3, PB 3), passive Perception unchanged. Actual: both stay +3, no effect.
- Code: `clsFeatureEffects` splits the list on `\s+and\s+(?=(?:your|one|two|three|the|light|medium|heavy|simple|martial|all|…kit|implements|set))`,
  so "Survival and Stealth skills" stays one item that is no skill, armor, weapon or tool.

### 4. Named weapon and armor proficiencies are ignored, and the trait disappears (high)
- Source: Chiss Martial Proficiency, Gungan Martial Proficiency, Draethos Way of the Warrior, Droid IV Martial
  Protocol, Gank Gank Training (armor; the two weapons aren't asked either), Gamorrean Weaponry, Tusken Weaponry,
  Lasat Bo-rifle Training, Voss Weapon Training (and Kage, Kaleesh, Zygerrian under 2).
- SW5E: Tusken "You have proficiency with the cycler rifle and vibroaxe." / Chiss "You have proficiency with light and
  medium armor as well as the heavy pistol and sniper rifle."
- `node dev/bump-check.js consular-test-local --species "Tusken" --item "Vibroaxe" --equip`
- Expected Vibroaxe attack +2 (Str −1 + PB 3), tip "Tusken Weaponry · Tusken trait". Actual: attack −1, no effect;
  Chiss/Gungan/Draethos show no armor proficiency and the trait is not even listed under the features' effects.
- Code: `clsFeatureEffects` only knows class-style weapon groups ("simple blasters…"); "light and medium armor as well
  as the heavy pistol…" becomes one armor string. `app/viewer.js` `featureEffectEntry` returns null when only
  `profs.armor` is set (armor isn't in its emptiness check), so the armor part is dropped too.

### 5. Geonosian Weaponry makes every blaster proficient (high)
- SW5E: Geonosian Weaponry "You have proficiency in blasters that deal sonic damage."
- `node dev/bump-check.js consular-test-local --species "Geonosian" --item "Blaster pistol" --equip`
- Expected Blaster pistol (energy damage) +3 (Dex +3, no PB; a Consular isn't proficient with blasters). Actual +6,
  tip "proficient Proficient: blasters that deal sonic damage · Geonosian Weaponry Geonosian trait"
  (control: `--species "Human"` gives +2).
- Code: `app/classes.js` `clsWeaponMatches`: after "blasters" only "with the … property" / "that lack the …" are
  checked, so "that deal sonic damage" is ignored and every blaster matches.

### 6. Baragwin Weapon Developers grants both tools (high)
- SW5E: "You have proficiency with armstech's implements, munitions kits, or two weapons of your choice."
- `node dev/bump-check.js consular-test-local --species "Baragwin"`
- Expected: one choice among the three (nothing until chosen). Actual: armstech's implements and munitions kits both
  proficient (+4 checks each) and it still asks "Choose or two weapons of your choice".
- Code: `clsFeatureEffects` splits on ", " and reads each "…implements"/"…kits" item as a fixed tool.

### 7. Small and Nimble's +1 AC is missing (high)
- Source: Anzellan, Zilkin. SW5E: "You have a +1 bonus to AC, and you have advantage on Dexterity saving throws."
- `node dev/bump-check.js consular-test-local --species "Zilkin"` (and `--species "Anzellan"`)
- Expected AC 14 (10 + Dex 16 +3, +1), tip "+1 AC · Small and Nimble Zilkin trait". Actual AC 13, no effect (Anzellan:
  12, expected 13).
- Code: `app/viewer.js` `featureEffectsUncached`, species branch: `mods: []`; only Toughness, the "AC is N + Dex" hide
  and the unarmed die are read, so the "+N bonus to AC" reader used for features never runs for species.

### 8. Colicoid Natural Armor (AC 17) is missing (high)
- SW5E: "it gives you a base AC of 17 (your Dexterity modifier doesn't affect this number). You gain no benefit from
  wearing armor, but if you are using a shield, you can apply the shield's bonus as normal."
- `node dev/bump-check.js consular-test-local --species "Colicoid"` and
  `node dev/bump-check.js consular-test-local --species "Colicoid" --item "Mesh armor" --equip`
- Expected AC 17 in both (17 + shield). Actual AC 12 unarmored, 15 in mesh armor.
- Code: nothing reads "base AC of N"; the hide reader in `featureEffectsUncached` wants "your AC is N + your Dexterity modifier".

### 9. Unarmed strike without a damage die: the dice card adds the flat 1 twice (high)
- Source: every species without natural weapons (and every character before a species die applies).
- SW5E (PHB, Combat): "Your unarmed strikes are a weapon with which you are proficient and, unless otherwise
  indicated, they do 1 + your Strength modifier kinetic damage."
- `node dev/bump-check.js consular-test-local --species "Gamorrean"`
- Expected 1 (1 + Str 0). Actual: table "1 Kinetic", dice card "Unarmed Strike damage: no dice +2 · = +1 other (weapon,
  style…) +1 flat damage" (the baseline Human, Str 8: table 0, dice card +1; Zilkin Str 18: table 5, dice card +6).
- Code: `app/engine.js` `engWeapons` already puts the 1 in `damageBonus` (`(unDie ? 0 : 1) + mod('Strength')`);
  `app/roller.js` `buildRoll` case 'damage' adds `{ label: 'flat damage', value: n }` on top, and `damageParts`
  (`app/viewer.js`) calls the engine's 1 "other (weapon, style…)".

### 10. Puny / Fragile Strength cap and Slow and Lethargic Dexterity cap are not applied (high)
- Source: Anzellan, Zilkin (Puny), Diathim (Fragile), Hutt (Slow and Lethargic).
- SW5E: Puny "You have disadvantage on Strength saving throws, and when determining your bonus to attack and damage
  rolls for weapon attacks using Strength, you can't add more than +3." / Hutt "You have disadvantage on Dexterity
  saving throws, and when determining your bonus to AC from your Dexterity, you can't add more than +3."
- `node dev/bump-check.js consular-test-local --species "Zilkin" --js "raw.baseAbilityScores.Strength = 18"` and
  `node dev/bump-check.js consular-test-local --species "Hutt, Adolescent" --js "raw.baseAbilityScores.Dexterity = 18"`
- Expected Zilkin unarmed +6 / 4 (Str capped at +3); Hutt AC 13 (10 + 3). Actual unarmed +7 / 5 (dice card +6, see
  9); Hutt AC 14. Disadvantages: see 13.
- Code: no reader for "can't add more than +N".

### 11. Finesse natural weapons use the old ability scores right after a species change (medium)
- Source: Cat's Claws, Unarmed Combatant, Fisticuffs… (every finesse natural weapon) when the species changes Dex/Str.
- SW5E: Cathar "Your unarmed strikes deal 1d6 kinetic damage and have the finesse property."
- `node dev/bump-check.js consular-test-local --species "Cathar"` and `--species "Dug"`
- Cathar (Dex 16, Str 8): expected +6 / 1d6+3. Actual table +5 / 1d6+2, tip "+3 Finesse: DEX +2 instead of STR"
  (Dex 14, the old score); dice card +6 / d6+3. Dug (Str 10, Dex 15): expected +5; table +6 (tip "+3 Finesse: DEX +2
  instead of STR"), dice card +5. Same for Echani, Kage, Mirialan, Noghri.
- Code: `app/viewer.js` `buildModel` calls `applyEffects` (which takes the scores from `state.derived[key].base`)
  before `engineDerived` refreshes `state.derived[key]`, so the first drawing after a change uses the previous
  scores; the next drawing (the dice card here) is right.

### 12. Resistances worded "resistant to", "resistance against", "giving you resistance" are not listed; vulnerability isn't either (medium)
- Source: Droid I–V (Droid Resistances, Droid Vulnerabilities), Devaronian, Twi'lek, Zeltron, Balosar, Chagrian, Gand,
  Hutt (poison), Mon Calamari (cold), Advozse, Mustafarian (Lava Dweller, fire).
- SW5E: "You are resistant to necrotic, poison, and psychic damage, and are immune to poison and disease." / "You are
  vulnerable to ion damage." / "You have advantage on saving throws against poison, and you have resistance against
  poison damage (explained in chapter 9)." / "giving you resistance to fire damage."
- `node dev/bump-check.js consular-test-local --species "Droid, Class I"` (and `--species "Devaronian"`)
- Expected under Defenses & senses: Resistances necrotic, poison, psychic; Vulnerable to ion; Immune to poison and
  disease. Actual: only "Immunities Immune to poison and disease". Devaronian: no resistance; instead the Advantages
  chip "Advantage on saving throws against poison, and you have resistance against poison damage (explained in chapter 9)".
- Code: `clsFeatureEffects` defenses: `(?:you have|you gain|gain|have) resistance to …`; no "vulnerable" reader.

### 13. Species advantages never reach the dice card; species disadvantages are not shown at all (medium)
- Source: advantage: Gamorrean (Con saves), Anzellan, Zilkin (Dex saves); disadvantage: Anzellan, Zilkin, Diathim
  (Str saves), Hutt (Dex saves), Gungan Heat Sensitivity, Ho'din Cold Sensitivity, Bith Sonic Sensitivity.
- SW5E: Gamorrean "Additionally, you have advantage on Constitution saving throws." / Hutt "You have disadvantage on
  Dexterity saving throws".
- `node dev/bump-check.js consular-test-local --species "Zilkin"`
- Expected Dexterity saving throw preset to advantage ("Advantage from Small and Nimble"), as class features are
  (Rage…); Str save with disadvantage. Actual "save|Dexterity: d20 +3 · = +3 modifier" (normal) while Defenses lists
  "Advantage on Dexterity saving throws"; no disadvantage anywhere (Hutt run of 10: "d20 +4", normal).
- Code: `featureEffectsUncached` species branch sets `advantage: []` (the roller's preset reads `m.effects[].advantage`);
  nothing reads "disadvantage on … saving throws".

### 14. Advantage on two abilities' saves against force/tech powers is not listed (medium)
- Source: Tech Resistance (Chiss, Devaronian, Duros, Anomid), Closed Mind (Aing-Tii, Colicoid, Falleen, Hutt, Lannik,
  Toydarian), Force Contention (Dashade, Flesh Raider), Adaptive Resilience (Gormak, Rakata), Nimble Reflexes (Kiffar),
  Honed Mind (Arkanian).
- SW5E: Chiss "You have advantage on Dexterity and Intelligence saving throws against tech powers."
- `node dev/bump-check.js consular-test-local --species "Chiss"`
- Expected Advantages: "Advantage on Dexterity and Intelligence saving throws against tech powers". Actual: nothing.
- Code: `clsFeatureEffects`: both advantage readers need "<Ability> saving throws" right after "advantage on".

### 15. Conditional expertise is offered on the dice card for only one wording (medium)
- Source (missing): Nautolan, Anx Acute Smell; Duros Superior Memory; Anomid Agricultural Exports; Codru-Ji Natural
  Grappler; Dashade Heat Dissipation; Echani Allies of the Force; Flesh Raider Hunters; Givin Mathematical Savants;
  Kaleesh Tracker; Mirialan Spiritual; Mustafarian Refinery Specialist; Muun Finance Savvy; Nothoiin Expert
  Navigators; Ortolan Foragers; Pa'lowick Proud Performer; Pau'an Hypersensitive Hearing; Squib, Toydarian Business
  Savvy. (12 "check related to X," traits work: Programmer, Arms Dealers, Reptilian Senses, Infrared/Ultraviolet Sight…)
- SW5E: Nautolan "Whenever you make a Wisdom (Perception) check involving smell, you are considered to have expertise
  in the Perception skill."
- `node dev/bump-check.js consular-test-local --species "Nautolan"` (compare `--species "Arcona"`)
- Expected Perception dice card option "smell (Acute Smell) +6". Actual: no option (Arcona gets "sensing heat
  (Reptilian Senses) +6").
- Code: `app/roller.js` `buildRoll` case 'skill': only `check related to ([^,.]+), you are considered to have expertise in the X skill`.

### 16. Tiny size doesn't halve carrying capacity (medium)
- Source: Anzellan, Zilkin. SW5E (PHB, Size and Strength): "For each size category above Medium, double the creature'
  carrying capacity and the amount it can push. drag, or lift. For a Tiny creature, halve these weights."
- `node dev/bump-check.js consular-test-local --species "Zilkin" --js "raw.baseAbilityScores.Strength = 18"`
- Expected capacity 135 lb, push/drag/lift 270 lb (×½, named "Tiny"). Actual 270 / 540.
- Code: `app/viewer.js` `carryFactor`/`renderCarry` know only Powerful Build doubling.

### 17. Harch, Klatooinian, Tognath get one +1 instead of three (medium)
- SW5E: Harch "Your Strength, Constitution, and Intelligence scores increase by 1." (Klatooinian: Str, Con, Wis;
  Tognath: Str, Dex, Con.)
- `node dev/bump-check.js consular-test-local --species "Harch"`
- Expected Str +1, Con +1, Int +1. Actual Int +1 only; "Strength or Constitution +1" becomes a pick (SW5E's data:
  `[{abilities:[Strength, Constitution], amount:1}, {abilities:[Intelligence], amount:1}]`), never prompted (18).
- Code: SW5E's data; `app/engine.js` `engBaseScores` and `app/builder.js` `bdSpeciesIncrease` treat a two-ability entry as "one of".

### 18. Species ability-increase picks are never prompted outside character creation (medium)
- Source: every species with a pick (Human, Droids, Zabrak, Togruta, Sith Pureblood, Kiffar, Esh-Kha, Ryn, Anzellan,
  Zilkin, Hutt, Theelin…).
- SW5E: Droid Class I "Your Intelligence score increases by 2, and your Wisdom or Charisma score increases by 1."
- `node dev/bump-check.js consular-test-local --species "Droid, Class I"`
- Expected "Still to choose: the species' +1 (Wisdom or Charisma)" and a picker under Species. Actual: Still to choose
  lists only "species language"; the Species card has no picker (only "Chosen increase" when set). The +1 just isn't there.
- Code: `app/builder.js` `bdOpenChoices` has no species-increase entry; the pickers exist only in `bdCreateStep('basics')`.

### 19. Choice prompts with the wrong count or wording (medium)
- Knowledge Protocol (Droid I), Shrewd Demeanor (Hutt, Toydarian): "You have proficiency in two Intelligence, Wisdom,
  or Charisma skills of your choice." → picker for 1 skill, any skill, labelled "Choose or Charisma skills of your
  choice" (`--species "Hutt, Adolescent"`). With a note "Lore, Insight" both apply.
- Gormak, Taung: "one vibroweapon and one blaster of your choice" → asks only "one blaster" (`--species "Taung"`).
- Ugor Galactic Scavengers: "You have proficiency in mechanic's kits or scavenging kits (your choice)." → a tool named
  "mechanic's kits or scavenging kits" is made proficient (+3 check) (`--species "Ugor"`).
- Gank Training, Droid IV Martial Protocol: "two vibroweapons or blasters of your choice" not asked (see 4).
- Echani Martial Upbringing: label "Choose gain proficiency with two martial vibroweapons of your choice".
- Code: `clsFeatureEffects` splits the list on commas and "(your choice)" is removed before reading.

### 20. "You ignore the strength property of heavy armor" is not applied (medium)
- Source: Gank, Mustafarian (in their Speed trait). SW5E: "Your base walking speed is 35 feet. You ignore the
  strength property of heavy armor."
- `node dev/bump-check.js consular-test-local --species "Gank" --item "Assault armor" --equip`
- Expected 35 ft. Actual "20 ft · now 10 ft (Assault armor: Strength 15)" (see also X1).
- Code: Speed trait skipped (1); `engSpeed` and `invArmorEffects` apply the Strength property regardless.

### 21. Species damage riders are not on the dice card (medium)
- Source: Savage Attacks (Gamorrean, Weequay, Abyssin, Esh-Kha, Togorian), Surprise Attack (Culisetto, Defel, Houk,
  Mirialan, Rattataki, Tiss'shar), Fury of the Small (Dug).
- SW5E: "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one
  additional time and add it to the extra damage of the critical hit."
- `node dev/bump-check.js consular-test-local --species "Gamorrean" --item "Vibrosword" --equip`
- Expected critical "d6 d6 d6 d6" plus an option "+1d6 Savage Attacks" (Surprise Attack +2d6, Fury of the Small +level,
  like Sneak Attack). Actual "Vibrosword damage (critical): d6 d6 d6 d6 +0", no option.

### 22. Kiffar Heritage, Nikto Adaptation, Theelin Mutation have no options (medium)
- SW5E's species data ends at "You choose one of the following heritages:" / "Choose one of the following
  adaptations:" / "Choose one of the following mutations."; the options (Paladin: armor, electrobaton, a blaster, a
  skill; Nikto: swim 30, claws 1d4, climbing 30, darkvision 60, Survival…; Theelin: darkvision 30, unarmed 1d4 finesse…)
  are only in `app/data/sw5e/books/ec/07-species.md`.
- `node dev/bump-check.js consular-test-local --species "Nikto"`
- Expected a choice (Still to choose) that applies its numbers. Actual: nothing to choose, nothing applied.

### 23. Half-human gets nothing (medium)
- SW5E: "Half-humans gain the ability score increases of their non-human half, but they can choose any ability score
  for one of the options…"; "Your base walking speed is that of your non-human half."
- `node dev/bump-check.js consular-test-local --species "Half-human"`
- Expected a prompt for the other half (increases, size, speed, the trait from `halfHumanTableEntries`). Actual: no
  increase, size blank, 30 ft, only Defiant; nothing in Still to choose.

### 24. Conditional advantages: some listed without their condition, most not listed (low)
- Listed as if always: Bith Detail Oriented → "Advantage on Investigation checks" ("…checks within 5 feet");
  Balosar Keen Hearing → "Advantage on Perception checks" ("…based on hearing"); Pantoran Negotiators → "Advantage on
  Persuasion checks" ("…meant to negotiate terms"). Garbled chips: "Advantage on saving throws against poison, and
  you have resistance against poison damage (explained in chapter 9)" (12).
- Not listed: Keen Smell / Keen Hearing / Keen Sight (and pairs) in ~30 species, Natural Empathy, Flexible, Sunlight
  Sensitivity, Inscrutable, Easily Addicted, Amorphous Form, Anzellan Detail Oriented, Xexto's climbing advantage,
  Gormak's Technology advantage — while "…checks that involve climbing" and "…exhaustion due to extreme heat" are listed.
- `node dev/bump-check.js consular-test-local --species "Bith"` / `--species "Ewok"`
- Code: `clsFeatureEffects` skill-advantage lookahead excludes "against|that|made|to|involving" but not "within",
  "based on", "meant to".

### 25. Natural weapon damage tip names no source and reads as a penalty (low)
- `node dev/bump-check.js consular-test-local --species "Wookiee"`
- Actual tip on damage: "Without tweaks or effects: 1 → now 0 / Changed by the tweaks or effects listed under
  Settings, Tweaks & Data and Combat & Vitals → Effects." Expected: "1 → 1d4 · Claws Wookiee trait" (the die replaces
  the flat 1).

### 26. Tognath: flavor text listed as an immunity (low)
- SW5E Primitive Nerves: "…tognath are immune to most pain, letting them shrug off major injuries. When you take
  damage, you can use your reaction to roll a d12…"
- `node dev/bump-check.js consular-test-local --species "Tognath"` → "Immunities Immune to most pain, letting them
  shrug off major injuries". Expected: no immunity.

### 27. Limited traits without a uses counter (low)
- Aleena Bite and Racer's Reflexes, Barabel/Karkarodon/Tiss'shar bite/claw attack, Arkanian Brilliance, Xexto Racer's
  Reflexes and Split Mind, Quermian Two Brains, Advozse Vigilant, Diathim/Falleen/Zeltron Enthralling (once per short or
  long rest), Anx Surgical Strikes and Pantoran Impose Order (the text has "can�t", so the reader misses it).
- SW5E Aleena: "You cannot do so again until you complete a short or long rest."
- `node dev/bump-check.js consular-test-local --species "Aleena"` → no "Racer's Reflexes short rest 1 / 1" counter
  (Harch's Bite, Defel's Hidden Step get one).
- Code: `clsUsage` wordings.

### 28. Telepathy and constant senses not listed (low)
- Kel Dor, Draethos, Iktotchi, Killik "You can communicate telepathically with creatures within 30 feet of you.";
  Miraluka Force Sight, Tarasin Sa'tosin Sense (constant powers).
- `node dev/bump-check.js consular-test-local --species "Kel Dor"` → Senses only "Darkvision 60 ft". Expected also
  "Telepathy 30 ft".

### 29. Species action traits show uses but not their DC or damage (low)
- Ithorian/Pa'lowick Sonic Scream, Anx Subsonic Bellow ("DC = 8 + your proficiency bonus + your Constitution
  modifier… 2d6 sonic… 4d6 at 5th level"), Quarren Ink Cloud, Harch Bite, Selkath Claws, Caamasi Memnii Transfer.
- `node dev/bump-check.js consular-test-local --species "Ithorian"` → "Sonic Scream long rest 3 / 3" only; expected
  DC 13 and 4d6 at 5th level somewhere (card or dice card).

### X1 (outside my area, found while testing 20). Heavy armor's Strength property slows twice (high)
- SW5E (armor property Strength): "While wearing armor or wielding a shield with this property, your speed is reduced
  by 10 unless your Strength score meets or exceeds the strength number."
- `node dev/bump-check.js consular-test-local --species "Human" --item "Assault armor" --equip`
- Expected 20 ft. Actual "20 ft · now 10 ft (Assault armor: Strength 15)".
- Code: `app/engine.js` `engSpeed` already takes 10 off (`tooHeavy`); `app/viewer.js` `renderCombat` takes
  `armorEffectsOf` (`invArmorEffects`) off again.
