# Panel round 3 — feats

Area: every feat in `modules.feats` (119). Tool: `node dev/bump-check.js`, one run at a time.

## Sources checked

Characters used: berserker-test-claude (Human Berserker 5, PB 3, no feats; feat goes to Berserker ASI #1),
consular-test-local / thirza-vitchess-panel (force casters), armstech-test-local / tikk-plonr-panel (tech casters),
others changed with `--js` (levels, scores) when a prerequisite or a test needs it.
A feat's +1 is stored as the ASI entry's `abilitiesIncreased` (what the "Feat ability increases" picker writes);
tests that need the choice set it with `--js "addFeat('X'); raw.classes[0].abilityScoreImprovements[0].abilitiesIncreased=[{name:'…',value:1}]"`.
Other choices (skills, saves, tools) are read from `featureNotes['<feat name lower-case>']`.

| # | Feat | Result | Notes |
|---|------|--------|-------|
| 1 | Ace Pilot | FINDING 1, 2, 3 | +1 INT asked although fixed (F1); Piloting proficient OK (−1 → +2); "instead expertise" not applied when already proficient (F2); vehicle-check expertise not listed (F3) |
| 2 | Acrobat | FINDING 1, 2 | +1 DEX fixed but asked (F1); Acrobatics +2 → +5 OK; expertise-if-proficient (F2) |
| 5 | Animal Handler | FINDING 1, 2 | Animal Handling +1 → +4 OK |
| 11 | Brawny | FINDING 1, 2, 4 | Athletics already proficient: stays +6, should be expertise +9 (F2); carrying capacity ×2 shown (510 lb) but its hover says "now 255" (F4) |
| 12 | Charmer | FINDING 1, 2 | Persuasion 0 → +3 OK |
| 21 | Empathic | FINDING 1, 2 | Insight +1 → +4 OK |
| 38 | Investigator | FINDING 1, 2 | Investigation −1 → +2 OK |
| 39 | Keen Mind | FINDING 1 | cap: INT 20 stays 20 OK (tikk-plonr-panel) |
| 41 | Loremaster | FINDING 1, 2 | Lore −1 → +2 OK |
| 44 | Medic | FINDING 1, 2 | Medicine +1 → +4 OK |
| 47 | Naturalist | FINDING 1, 2, 5 | Nature OK; toxin scan once/long rest tracked; power card says both "Not castable: no tech points" and "Cast (available)" (F5) |
| 49 | Perceptive | FINDING 1, 2 | Perception +1 → +4, passive 11 → 14 OK |
| 50 | Performer | FINDING 1, 2 | Performance 0 → +3 OK |
| 55 | Quick-Fingered | FINDING 1, 2 | Sleight of Hand +2 → +5 OK |
| 60 | Silver-Tongued | FINDING 1, 2 | Deception 0 → +3 OK |
| 63 | Stealthy | FINDING 1, 2 | kadro-vos-panel DEX 17 → 18: init, DEX save/skills, blaster rifle, vibrorapier, finesse unarmed all +1; AC stays 15 (medium armor max +2) OK |
| 67 | Survivalist | FINDING 1, 2, 5 | Survival +1 → +4; alarm once/long rest; same "Not castable" contradiction (F5) |
| 69 | Techie | FINDING 1, 2 | armstech: Technology +3 → +7 OK; repair droid once/long rest OK |
| 70 | Threatening | FINDING 1, 2 | Intimidation already proficient: stays +3, should be expertise +6 (F2) |
| 3 | Actor | FINDING 1, 3 | CHA +1 only; conditional advantage on Deception/Performance when impersonating not listed (F3) |
| 9 | Battle Scarred | FINDING 1 | CON 16 → 17 no derived change OK; "drop to 1 HP" tracked long rest 1/1 OK; 19–20 death save: no number |
| 20 | Durable | FINDING 1, 6 | HP maximum +2 × level never applied (berserker 5: 55 stays 55, expected 65; rorrwaak-panel: 41 → 45 from CON only, expected 53); hit-die minimum 2 × CON mod not shown (F6) |
| 14 | Climber | FINDING 1, 3 | climbing speed = walking listed OK; climbing advantage not listed (F3) |
| 15 | Commando | FINDING 1, 7 | crawling speed not listed in Speeds (F7) |
| 43 | Mariner | FINDING 1, 3 | swimming speed listed OK; swim advantage / hold breath 1 + 2×CON min not listed (F3) |
| 45 | Mobile | OK | speed 30 → 40 ft, hover "+10 Speed · Mobile feat" OK |
| 46 | Muscled Menace | FINDING 1, 8 | speed +5 OK; DEX caps (+3 to AC, +3 to DEX saves) not applied: DEX 18 shows AC 19 / DEX save +4, should be 18 / +3 (F8) |
| 58 | Savage Shorty | FINDING 1, 9 | speed +5 OK; size Small prerequisite not checked (F9) |
| 71 | Tiny Terror | FINDING 1, 9 | speed +5 OK; Puny isn't modelled by the sheet so nothing to lift; size Tiny prerequisite not checked (F9) |
| 24 | Feigned Confidence | FINDING 1 | uses = PB (3), short rest OK |
| 29 | Force of Personality | FINDING 1, 10 | uses = PB long rest OK; Insight with CHA modifier not offered (CHA 18: Insight could be +4, sheet only +1) (F10) |
| 31 | Forceful Vigor | FINDING 1, 10 | uses = PB long rest OK; CON checks with STR modifier not offered (F10) |
| 56 | Quick-Witted | FINDING 1, 10 | uses = PB long rest OK; Initiative with INT modifier not offered (INT 18: +4 vs DEX +2) (F10) |
| 33 | Galvanizing Presence | FINDING 1 | short rest 1/1 OK |
| 34 | Haggler | FINDING 1, 3 | barter advantage not listed (F3) |
| 40 | Linguist | FINDING 1, 11 | three languages of your choice: no picker, not in "Still to choose" (F11) |
| 54 | Promising Commander | FINDING 1 | short rest 1/1 OK |
| 61 | Snappy Interjection | FINDING 1, 12 | "Once per short or long rest" reaction has no use tracker (F12) |
| 72 | Tough | FINDING 1, 9 | CON +1 only (asked, F1); "Durable feat" prerequisite not checked (F9) |
| 85 | Cunning Forcecaster | FINDING 1, 14 | INT as forcecasting ability / force points not applied (consular, INT 19: light DC stays 14, points stay 23; expected 15 / 24); Wisdom-or-Charisma choice not asked (F14) |
| 110 | Spiritual Techcaster | FINDING 13, 14 | "+1 to the chosen ability" has no picker (attributesIncreased is empty) and WIS/CHA as techcasting ability not applied (armstech, WIS 19: DC 15 / points 21 unchanged) (F13, F14) |
| 57 | Resilient | FINDING 13 | no picker at all: neither the +1 nor the saving-throw proficiency is asked or applied, even with featureNotes.resilient = "Dexterity" (F13) |
| 6 | Armor Expert | FINDING 15 | consular (no armor): light armor proficiency parsed but dropped (effect with only armor isn't kept), not in Proficiencies (F15) |
| 19 | Dungeon Delver | FINDING 16, 17 | passive Perception 11 → 6: "no longer imposes a -5 penalty" read as −5 (F16, high); resistance listed as "Resistance to the damage" (traps missing) (F17) |
| 4 | Alert | FINDING 18 | initiative +PB not applied (berserker: +2, expected +5); can't be surprised not listed (F18) |
| 48 | Observant | FINDING 18 | passive Perception/Investigation +5 not applied (berserker passive Perception 11, expected 16) (F18) |
| 37 | Investigative Attunement | FINDING 18 | attunement maximum +1 not applied (3 stays 3, expected 4) (F18) |
| 79 | Casting Specialist | FINDING 19 | only "+1 tech save DC" is read: consular (force) gets no force DC/attack +1 and a "Tech save DC +1" listing; armstech tech DC 15 → 16 OK but tech attack stays +7 (expected +8); force/tech choice not asked (F19) |
| 53 | Practiced | FINDING 20 | no picker/notes box on the Feats card and not in "Still to choose"; only a chip "Choose any combination of two skills or tools…" whose tip says to use the feature's notes in Class Features (feats have none) (F20); with featureNotes.practiced = "Stealth, Medicine" both become proficient OK (but 4 names give 4 proficiencies, no cap) |
| 16 | Competitor | FINDING 20, 21 | placeholder tool "chosen gaming set" added as a proficiency with its own roll (+2); a chosen set ("Pazaak deck") gets expertise (+5) although not already proficient (F21) |
| 17 | Crafter | FINDING 20, 21 | "chosen tool" placeholder proficiency; Tinker's implements → expertise +5, expected proficient +2 (F21) |
| 22 | Entertainer | FINDING 20, 21 | "chosen musical instrument" placeholder; chosen instrument → expertise (F21) |
| 62 | Specialist | FINDING 20, 21 | "chosen kit" placeholder; Forgery kit → expertise (F21); "treat 9 or lower as 10" not on the tool roll (F3) |
| 7 | Athlete | OK* | DEX/STR +1 (choice, so asking is right); rest is movement text. *AC hover lists "+1 DEX · Athlete" though AC doesn't change (F22) |
| 35 | Healer | OK | +1 INT/WIS; healing is for others (traumakit), no number on the sheet |
| 73 | Weapon Expert | FINDING 23 | berserker (all vibroweapons, simple blasters): lightsaber +3 → +6 and blaster rifle +2 → +5 proficient OK; but "damage advantage: Weapon Expert" is offered on the blaster pistol, lightsaber and rifle too, though it is only for kinds you were already fully proficient with (F23, roller.js) |
| 27 | Fighting Stylist | OK | slot "Fighting style 1/1"; Defense Style picked applies (kadro-vos-panel) |
| 25 | Fighting Master | OK | slot "Fighting mastery 0/1" and in Still to choose (options are the classes' areas) |
| 74 | Weapon Focused | OK | slot; armstech-test-local's Blade Focus on the Vibrosword gives damage +1 OK |
| 75 | Weapon Supremacist | OK | slot "Weapon supremacy 0/1" |
| 81 | Class Improvement | OK | slot + "+1" (any) picker |
| 106 | Multiclass Improvement | OK | slot 0/2 (rakatan-test-local shows a pick and its prerequisite check) |
| 111 | Splashclass Improvement | OK | slot 0/1 |
| 84 | Companion Keeper | no number | companion natures aren't in SW5E's data here; the companion isn't modelled |
| 32 | Formfighting Dabbler | OK | maasha-vaal-panel: slot with Soresu Form; forms are adopted, not permanent numbers |
| 30 | Force-Sensitive | OK | 2 at-will + 1st (lvl 3) + 2nd (lvl 5) once/long rest; DCs by alignment: Denounce CHA 11/+3, Push/Pull & Cloud Mind WIS 12/+4; trackers OK |
| 68 | Tech Dabbler | OK | consular-test-local (background feat): at-will ×2, 1st, 2nd; DC/attack 11/+3 (INT 10, PB 3) OK |
| 99 | Improved Force-Sensitive | OK | at-will + 3rd once/long rest; consular 5 meets it |
| 96 | Greater Force-Sensitive | OK | prerequisite flagged on consular 5 ("needs 3rd-level force powers") |
| 101 | Master Force-Sensitive | OK | prerequisite flagged |
| 100 | Improved Tech Dabbler | OK | armstech 9 |
| 97 | Greater Tech Dabbler | OK | armstech 9 |
| 102 | Master Tech Dabbler | OK | armstech 9 |
| 6 | Armor Expert (again) | FINDING 15 | berserker (light + medium proficient), DEX 16 in Mesh armor: AC stays 17 (13+2+2), expected 18 (medium armor +3 with DEX 16); heavy armor proficiency not added |
| 77 | Auditory Dampening | OK | advantage on saves vs sonic damage listed |
| 80 | Chemical Buffer | OK | advantage vs acid listed; "ignore first corroded level" text |
| 90 | Electrical Grounding | OK | advantage vs lightning listed |
| 95 | Force Frustrater | OK | advantage vs force damage listed |
| 98 | Heat Shielded | FINDING 24 | advantage listed OK; text says "Dexterity, Consitution, or Intelligence" but the +1 picker offers only DEX/INT (SW5E's attributesIncreased omits CON) (F24) |
| 103 | Metabolic Tolerance | OK | advantage vs poison listed |
| 104 | Mindful Meditator | OK | advantage vs psychic listed |
| 117 | Vigorous Virility | FINDING 12 | advantage vs necrotic listed; "Once per long rest … remove 1 level of exhaustion" not tracked (F12) |
| 119 | Well-Insulated | OK | advantage vs cold listed |
| 76 | Adaptable Fading | FINDING 10, 12 | one "long rest 3/3" pool, but the text has two separate PB pools (attack, save swap) (F12); "+ half CON modifier" to STR attacks not offered on the attack roll (F10) |
| 94 | Flexible Rending | FINDING 10, 12 | same as Adaptable Fading (half INT/DEX) |
| 116 | Versatile Withering | FINDING 10, 12 | same (half CHA/WIS) |
| 64 | Supreme Accuracy | OK | +1 (choice) only; reroll with advantage is table-time |
| 65 | Supreme Aptitude | OK | same |
| 66 | Supreme Durability | OK | same |
| 8 | Augmented Cyborg | no number | +1 (choice) OK; the augmentation is added as an item |
| 18 | Customized Droid | no number | +1 OK; customization added as an item |
| 59 | Shard Modification | OK | sense force once/long rest, cast only |
| 113 | Total Reconstruction | FINDING 25 | "Immune to poison and disease" listed; resistance to necrotic and poison, vulnerability to ion and disadvantage on saves vs ion/lightning not listed (F25) |
| 89 | Dutifully Deployed | no number | +1 OK; deployment ranks are starship-side |
| 87 | Double-Weapon Casting | OK | +1; prerequisite flagged for a non-caster |
| 114 | Two-Weapon Casting | OK | same |
| 92 | Exotic Weapon Training | FINDING 20 | "proficiency in three exotic weapons": no picker, no chip, nothing in Still to choose (F20) |
| 112 | Titan's Power | FINDING 2 | STR save already proficient: stays +6, expected expertise +9 (F2); "ignore two-handed" doesn't lift the rifle-and-shield warning (low, F3) |
| 115 | Unnatural Resilience | FINDING 2, 26 | CON save already proficient: stays +6, expected +9 (F2); death saving throw stays d20 +0, expected +3 (CON mod) (F26) |
| 78 | Blinding Agility | FINDING 27 | DEX save +2 → +5 OK; OA disadvantage listed OK; finesse not granted: DEX 20 / STR 10, Dire vibroblade stays +3 / +0, expected +8 / +5 (F27) |
| 91 | Exalted Awareness | FINDING 12 | WIS save +1 → +4 OK; "once per short or long rest" sense illusions not tracked (F12) |
| 107 | Overwhelming Presence | OK | CHA save 0 → +3 OK; distract DC (8 + PB + CHA) not shown (low, F3) |
| 86 | Cunning Intellect | FINDING 28 | INT save −1 → +2 OK; "+ half PB to INT checks without proficiency" not applied (INT check / Investigation stay −1, expected 0) (F28) |
| 42 | Lucky | FINDING 12 | 3 luck points (long rest) not tracked at all; feat produces no effect (F12) |
| 10 | Bountiful Luck | no number | spends Lucky's points (reaction for allies) |
| 36 | Inspiring Leader | FINDING 9 | temp HP (level + CHA) for others, no number on own sheet; "Charisma 13" prerequisite not checked (F9) |
| 23 | Fanatic | no number | bonus attack / temp HP on triggers |
| 13 | Class Proficiencies | FINDING 29 | a rules note filed under feats, offered in the feat lists; taken, it makes every weapon proficient ("all weapons within a specific category"): blaster rifle +2 → +5, lightsaber +3 → +6 (F29, high) |
| 26 | Fighting Styles and Masteries | FINDING 29 | rules note offered as a feat (no effect) |
| 93 | Fighting Styles and Masteries (2nd copy) | FINDING 29 | same, listed twice |
| 28 | Force Guidance | FINDING 10, 20 | uses PB/long rest OK; skill/tool choice has no picker (F20); the half WIS/CHA bonus isn't offered on the roll (F10) |
| 51 | Power Adept | FINDING 20 | damage type choice has no picker (F20); "1 counts as 2" not on damage rolls (low) |
| 52 | Power Channeling | no number | casting-time trade |
| 82 | Close Quarters Caster | OK | at-will power slot "requires an attack roll" |
| 83 | Combat Caster | OK | at-will power slot "requires a saving throw" |
| 109 | Sniping Caster | OK | at-will slot |
| 88 | Dual Focused Caster | no number | |
| 105 | Mounted Caster | no number | |
| 108 | Quick Caster | OK | long rest 1/1 tracker |
| 118 | War Caster | FINDING 3 | concentration-save advantage not listed (thirza-vitchess-panel has it, nothing shown) (F3) |
| — | (custom feat path) | FINDING 30 | a feat added by hand (raw.customFeats = ["Brawny"]): its +1 is never asked nor applied (F30) |

## Counts

119 feats checked: 37 OK, 9 no number, 73 with a finding (F1 alone covers the 39 single-ability half-feats).
Extra path checked: feats added by hand (`customFeats`), see F30.

## Findings (most severe first; the F-numbers are the ids used in the table above)

### F16: Dungeon Delver lowers passive Perception by 5 (high)
- SW5E: "Traveling at a fast pace no longer imposes a -5 penalty to your passive Wisdom (Perception) score."
- `node dev/bump-check.js berserker-test-claude --feat "Dungeon Delver"`
- Expected: passive Perception unchanged (11). Actual: `passivePerception = 6`, tweak `passivePerception -5 · Dungeon Delver`, hover "Without tweaks or effects: 11 → now 6 / −5 Passive Perception · Dungeon Delver feat".
- Code: app/classes.js `clsFeatureEffects`. The "+N bonus/penalty to <phrase>" loop reads "-5 penalty to your passive Wisdom (Perception)", and nothing treats "no longer imposes" as a negation.

### F21: Competitor, Crafter, Entertainer, Specialist add a placeholder tool proficiency, and the chosen tool gets expertise (high)
- SW5E (Specialist): "You gain proficiency with the chosen kit. If you are already proficient with it, you instead gain expertise with it." Crafter, Entertainer and Competitor use the same wording for the tool, instrument and gaming set.
- `node dev/bump-check.js berserker-test-claude --feat "Specialist" --js "raw.featureNotes = {specialist: 'Forgery kit'}"`
- Expected: Forgery kit proficient, check d20 +2 (INT −1, PB 3). Actual: "Forgery kit: expertise", check d20 +5 (+6 proficiency ×2). It also adds a proficiency literally named "chosen kit" with its own roll (d20 +2). Without a note the placeholder is still added (`--feat "Competitor"` gives "chosen gaming set check: d20 +2").
- Same for Crafter ("chosen tool", Tinker's implements gets expertise), Entertainer ("chosen musical instrument") and Competitor ("chosen gaming set", Pazaak deck gets expertise).
- Code: app/classes.js `clsFeatureEffects`. The fallback for proficiency items pushes "chosen …" as a tool. The Expertise branch fires because the text has "of your choice" (from "Increase an ability score of your choice") and the sentence "…you instead gain expertise with it" contains "expertise", so every word in the note becomes expertise.

### F23: Weapon Expert offers damage advantage on weapons it should only make you proficient with (high)
- SW5E: "You gain proficiency with all blasters. If you are already proficient with all blasters, instead once per turn when you would roll weapon damage using a blaster, you can choose to have advantage." The same applies to lightweapons and vibroweapons.
- `node dev/bump-check.js berserker-test-claude --feat "Weapon Expert"` (the Berserker has all vibroweapons and only simple blasters)
- Expected: damage advantage only on vibroweapons (Dire vibroblade); blasters and lightweapons become proficient instead. Actual: "damage advantage: Weapon Expert" also appears on the Blaster pistol, and on a lightsaber or blaster rifle when one is added (`--js "addFeat('Weapon Expert'); addItem('Lightsaber',{equipped:true}); addItem('Blaster rifle',{equipped:true})"`). The proficiency itself is right (lightsaber +3 → +6, rifle +2 → +5).
- Code: app/roller.js `case 'damage'` (Weapon Expert). It grants the option for every weapon kind named in the text and doesn't check that the character was already proficient with all weapons of that kind before the feat.

### F29: "Class Proficiencies" (a rules note) is offered as a feat and makes the character proficient with every weapon (high)
- SW5E's feats list holds three rules notes: "Class Proficiencies" ("Certain classes, such as fighters or guardians, gain proficiency in all weapons within a specific category…") and "Fighting Styles and Masteries" (twice).
- `node dev/bump-check.js berserker-test-claude --feat "Class Proficiencies" --item "Blaster rifle" --equip` compared with `node dev/bump-check.js berserker-test-claude --item "Blaster rifle" --equip`
- Expected: not offered as a feat, and no effect. Actual: Blaster rifle attack +5 (+2 without it), with the hover "proficient Proficient: all weapons within a specific category · Class Proficiencies feat". A lightsaber goes from +3 to +6.
- Code: the level-up feat select and the background feat select in app/builder.js list all of `modules.feats`. app/classes.js `clsFeatureEffects` reads "proficiency in all weapons within a specific category" as a weapon proficiency, and `clsWeaponMatches` matches it to every weapon.

### F8: Muscled Menace doesn't apply its +3 Dexterity caps on AC and Dexterity saves (high)
- SW5E: "You can't add more than +3 when determining your bonus to AC from your Dexterity." and "You can't add more than +3 when determing your bonus to Dexterity saving throws from Dexterity."
- `node dev/bump-check.js berserker-test-claude --feat "Muscled Menace" --js "raw.baseAbilityScores.Dexterity = 18"`, and the same command without `--feat`.
- Expected with the feat (DEX 18, +4): AC 18 and DEX save +3. Actual: AC 19 and DEX save +4, the same as the run without the feat. The speed +5 is applied correctly.
- Code: nothing in app/classes.js `clsFeatureEffects` reads "can't add more than +3".

### F2: "If you are already proficient in it, you instead gain expertise" is never applied (medium; 18 skill half-feats and 6 save feats)
- SW5E (Brawny): "You gain proficiency in the Athletics skill. If you are already proficient in it, you instead gain expertise in it." (Titan's Power: "You gain proficiency in Strength saving throws. If you are already proficient in them, you instead gain expertise in them.")
- `node dev/bump-check.js berserker-test-claude --feat "Brawny"` (Athletics already proficient). The same happens with --feat "Threatening", --feat "Titan's Power" and --feat "Unnatural Resilience".
- Expected: Athletics +6 → +9, Intimidation +3 → +6, STR save +6 → +9, CON save +6 → +9. Actual: all unchanged. The effect is listed as "Athletics: proficient" (tweak `{"proficiency":"Proficient"}`). Existing characters show it too: wizard-check-local (class Technology plus the Techie background feat) has Technology +6 instead of +8, and rorrwaak-panel and tikk-plonr-panel needed hand tweaks for it.
- Affects: Ace Pilot, Acrobat, Animal Handler, Brawny, Charmer, Empathic, Investigator, Loremaster, Medic, Naturalist, Perceptive, Performer, Quick-Fingered, Silver-Tongued, Stealthy, Survivalist, Techie, Threatening; Blinding Agility, Cunning Intellect, Exalted Awareness, Overwhelming Presence, Titan's Power, Unnatural Resilience.
- Code: app/classes.js `clsFeatureEffects` skips the "already proficient" sentence, and app/viewer.js `featureEffectEntry` always sends `proficiency: 'Proficient'`.

### F6: Durable's hit point increase is never applied (medium)
- SW5E: "Your hit point maximum increases by an amount equal to twice your level when you gain this feat. Whenever you gain a level thereafter, your hit point maximum increases by an additional 2 hit points." Also: "…the minimum number of hit points you can regain from the roll equals twice your Constitution modifier (minimum of 2)."
- `node dev/bump-check.js berserker-test-claude --feat "Durable"` and `node dev/bump-check.js rorrwaak-panel --js "addFeat('Durable'); raw.classes[0].abilityScoreImprovements[1].abilitiesIncreased=[{name:'Constitution',value:1}]"`
- Expected: Berserker 5 goes from 55 to 65 HP; Rorrwaak (level 4, CON 15 → 16) from 41 to 53. Actual: 55 stays 55; 41 → 45 (from CON only). The hit-die roll shows no minimum.
- Code: app/classes.js `clsFeatureEffects` has no reader for "increases by an amount equal to twice your level". The species "Toughness" reader in viewer.js `derivedInputs` only reads "increases by N, and it increases by N every time you gain a level".

### F18: Alert, Observant and Investigative Attunement are missing their fixed numbers (medium)
- SW5E: Alert: "You are proficient in Initiative checks.." Observant: "You are considered to have advantage when determining your passive Wisdom (Perception) and passive Intelligence (Investigation) scores." Investigative Attunement: "Your maximum attunement increases by 1."
- `node dev/bump-check.js berserker-test-claude --feat "Alert"`, `--feat "Observant"` and `--feat "Investigative Attunement"`
- Expected: initiative +2 → +5; passive Perception 11 → 16 and passive Investigation 9 → 14; attunement maximum 3 → 4. Actual: nothing changes. Alert has no effect at all, and the other two only have their +1.
- Code: app/classes.js `clsFeatureEffects` has no readers for these.

### F19: Casting Specialist only reads "+1 tech save DC" (medium)
- SW5E: "Choose one from force- or tech-casting. … You gain a +1 bonus to your force or tech save DC and your force or tech attack modifier."
- `node dev/bump-check.js consular-test-local --js "raw.classes[0].abilityScoreImprovements=[]; addFeat('Casting Specialist')"` and `node dev/bump-check.js armstech-test-local --feat "Casting Specialist"`
- Expected (consular, force): light/dark/universal DC 14/13/14 → 15/14/15 and attacks +6/+5/+6 → +7/+6/+7. Actual: unchanged, and the effect listed is "Tech save DC +1". On armstech (tech) the DC goes 15 → 16 correctly, but the tech attack stays +7 (expected +8). The sheet never asks for the force/tech choice.
- Code: app/classes.js `clsFeatureEffects` passes "your force or tech save DC and your force or tech attack modifier" to `fxBonusMods`, which returns only techCasting.saveDC.

### F14: Cunning Forcecaster and Spiritual Techcaster don't apply their casting-ability swap (medium)
- SW5E: Cunning Forcecaster: "You can use Intelligence instead of the chosen ability as your forcecasting ability." and "You can add Intelligence instead of the chosen ability when determining your maximum force points." Spiritual Techcaster: "You can use the chosen ability instead of Intelligence as your techcasting ability."
- `node dev/bump-check.js consular-test-local --js "raw.classes[0].abilityScoreImprovements=[]; addFeat('Cunning Forcecaster'); raw.classes[0].abilityScoreImprovements[0].abilitiesIncreased=[{name:'Intelligence',value:1}]; raw.baseAbilityScores.Intelligence=18; raw.featureNotes={'cunning forcecaster':'Wisdom'}"`
- Expected (INT 19 gives +4, above WIS +3): light DC 14 → 15, light attack +6 → +7, force points 23 → 24. Actual: unchanged. Spiritual Techcaster on armstech with WIS 19 (`--js "addFeat('Spiritual Techcaster'); raw.baseAbilityScores.Wisdom=19; raw.featureNotes={'spiritual techcaster':'Wisdom'}"`): tech DC 15, attack +7 and 21 points are unchanged (expected with WIS 20: 17, +9 and 23). The sheet never asks for the Wisdom-or-Charisma choice.

### F13: Resilient and Spiritual Techcaster have no picker for "+1 to the chosen ability", and Resilient's save proficiency never applies (medium)
- SW5E (Resilient): "Choose one ability score. … Increase the chosen ability score by 1, to a maximum of 20. You gain proficiency in saving throws using the chosen ability."
- `node dev/bump-check.js consular-test-local --js "raw.classes[0].abilityScoreImprovements=[]; addFeat('Resilient'); raw.featureNotes={resilient:'Dexterity'}"`
- Expected: a picker, DEX 14 → 15 and DEX save +2 → +5. Actual: nothing changes. There is no "Still to choose" entry and no picker, even with the note.
- Code: app/progression.js `prFeatAbilities` returns nothing for these two feats: SW5E's attributesIncreased is empty for both, and the regex needs "increase your/an/one … score by 1". app/classes.js can't read "saving throws using the chosen ability".

### F15: Armor Expert doesn't apply its armor proficiencies or the medium-armor +3 (medium)
- SW5E: "You gain proficiency with light armor. If you are already proficient with light armor, instead while you are wearing light armor, your speed increases by 5 feet." and "…If you are already proficient with medium armor, instead while you are wearing medium armor, you can add 3, rather than 2, to your AC if you have a Dexterity of 16 or higher…"
- `node dev/bump-check.js consular-test-local --js "raw.classes[0].abilityScoreImprovements=[]; addFeat('Armor Expert')"` and `node dev/bump-check.js berserker-test-claude --feat "Armor Expert" --item "Mesh armor" --equip --js "raw.baseAbilityScores.Dexterity=16"`
- Expected: the consular gains light armor (in Proficiencies). The berserker (light and medium) gains heavy armor and, in Mesh armor with DEX 16, AC 13+3+2 = 18. Actual: no proficiency is listed, and AC stays 17.
- Code: app/viewer.js `featureEffectEntry` returns null when an effect has only armor proficiencies, because its keep test ignores `fe.profs.armor`. So "light armor", which `clsFeatureEffects` does parse, is dropped.

### F1: A fixed +1 is asked for instead of applied (medium; 39 feats)
- SW5E (Tough): "Increase your Constitution score by 1, to a maximum of 20." There is no choice to make.
- `node dev/bump-check.js consular-test-local --feat "Tough"` (or `berserker-test-claude --feat "Brawny"`)
- Expected: CON +1 applied. Actual: "Still to choose … Tough: +1" and, on the Feats card, "Tough: +1 to 0 / 1 … Choose an ability…". Nothing changes until the only option is picked.
- Affects every feat whose increase names one ability: Ace Pilot, Acrobat, Actor, Animal Handler, Battle Scarred, Brawny, Charmer, Climber, Commando, Cunning Forcecaster, Durable, Empathic, Feigned Confidence, Force of Personality, Forceful Vigor, Galvanizing Presence, Haggler, Investigator, Keen Mind, Linguist, Loremaster, Mariner, Medic, Muscled Menace, Naturalist, Perceptive, Performer, Promising Commander, Quick-Fingered, Quick-Witted, Savage Shorty, Silver-Tongued, Snappy Interjection, Stealthy, Survivalist, Techie, Threatening, Tiny Terror, Tough.
- Code: app/builder.js `bdFeatPicks`, `bdFeatIncreaseEffects`, `bdOpenChoices` and the background picker show a picker even when `prFeatAbilities` returns a single ability.

### F30: Feats added by hand never get their +1 (medium)
- `node dev/bump-check.js berserker-test-claude --js "raw.customFeats=['Brawny']"`
- Expected: STR +1, or at least a picker. Actual: the Athletics and carrying-capacity effects apply, but STR stays 16 and nothing is asked.
- Code: app/builder.js `bdFeatPicks`, `bdFeatIncreaseEffects` and `bdOpenChoices` only look at classes[].abilityScoreImprovements and the background feat.

### F20: Feat choices other than the +1 and the choice slots can't be made (medium)
- SW5E (Practiced): "You gain proficiency in any combination of two skills or tools of your choice."
- `node dev/bump-check.js berserker-test-claude --feat "Practiced"`
- Expected: a picker on the feat (class features and species traits have one) and an entry in "Still to choose". Actual: the Feats card has no picker and no notes box, and nothing appears in Still to choose. The only hint is a chip "Choose any combination of two skills or tools of your choice" whose tip says "Write your choice in the feature's notes (Class Features)", but feats have no such notes. The effect only works if featureNotes.practiced is set by hand, and then there is no cap: 4 names give 4 proficiencies.
- Affects: Practiced, Competitor, Crafter, Entertainer, Specialist, Force Guidance, Linguist (F11), Power Adept, Exotic Weapon Training (which has no chip at all), Resilient, Cunning Forcecaster, Spiritual Techcaster, Casting Specialist.
- Code: app/viewer.js `renderFeats` uses `card()` without `featureNoteBox`, and app/builder.js `bdOpenChoices` ignores the feats' needsChoice.

### F10: "Use X instead of Y" and "add half your X modifier" options are not offered (medium)
- SW5E: Quick-Witted: "You can use your Intelligence modifier instead of your Dexterity modifier when making Initiative checks." Force of Personality: "…your Charisma modifier instead of your Wisdom modifier when making Insight checks." Forceful Vigor: "…your Strength modifier instead of your Constitution modifier when making Constitution checks." Adaptable Fading: "When you make an attack roll using your Strength, you can choose to add half your Constitution modifier to the attack roll." Flexible Rending, Versatile Withering and Force Guidance work the same way.
- `node dev/bump-check.js berserker-test-claude --feat "Quick-Witted" --js "raw.baseAbilityScores.Intelligence=18"`
- Expected: initiative +4 (from INT) available, either as the number or as an option on the dice card. Actual: initiative stays +2 and there is no option. The same happens for Insight with CHA 18 (stays +1, could be +4) and for CON checks with STR 20.

### F26: Unnatural Resilience doesn't add the Constitution modifier to death saves (medium)
- SW5E: "You can add your Constitution modifier to death saving throws you make."
- `node dev/bump-check.js berserker-test-claude --feat "Unnatural Resilience"`
- Expected: "Death saving throw: d20 +3". Actual: d20 +0.

### F27: Blinding Agility doesn't grant finesse (medium)
- SW5E: "Weapons that lack the two-handed or special properties are considered to have the finesse property for you."
- `node dev/bump-check.js berserker-test-claude --feat "Blinding Agility" --js "raw.baseAbilityScores.Dexterity=20; raw.baseAbilityScores.Strength=10"`
- Expected: the Dire vibroblade (Dexterity 13, dire 1, versatile) uses DEX: attack +8, damage +5. Actual: it uses STR: +3 and +0.

### F28: Cunning Intellect doesn't add half proficiency to Intelligence checks (medium)
- SW5E: "Whenever you make an ability check that uses your Intelligence, you can add half your proficiency bonus (rounded down) if it doesn't already include your proficiency bonus."
- `node dev/bump-check.js berserker-test-claude --feat "Cunning Intellect"`
- Expected: the INT check and non-proficient INT skills go from −1 to 0. Actual: unchanged. The save proficiency is applied correctly.

### F12: Limited uses aren't tracked, including Lucky's luck points (medium)
- SW5E (Lucky): "You have 3 luck points. … You regain your expended luck points when you finish a long rest."
- `node dev/bump-check.js berserker-test-claude --feat "Lucky"`
- Expected: a "Luck points 3/3 (long rest)" tracker. Actual: nothing; Lucky has no effect at all. Also untracked: Snappy Interjection ("Once per short or long rest"), Investigative Attunement ("Once per long rest"), Vigorous Virility ("Once per long rest, when you complete a short rest") and Exalted Awareness ("…complete a short or long rest before you can use it again"). Adaptable Fading, Flexible Rending and Versatile Withering each have two PB pools but only one tracker.

### F25: Total Reconstruction's resistances, vulnerability and save disadvantage aren't listed (medium)
- SW5E: "You are resistant to necrotic and poison damage, and are immune to poison and disease." and "You are vulnerable to ion damage. Additionally, you have disadvantage on saving throws against effects that would deal ion or lightning damage."
- `node dev/bump-check.js berserker-test-claude --feat "Total Reconstruction"`
- Expected: resistances to necrotic and poison, vulnerability to ion, and a note about the save disadvantage. Actual: only "Immune to poison and disease".

### F4: Brawny's carrying-capacity hover contradicts the number shown (medium: misleading explanation)
- `node dev/bump-check.js berserker-test-claude --js "addFeat('Brawny'); raw.classes[0].abilityScoreImprovements[0].abilitiesIncreased=[{name:'Strength',value:1}]"`
- The sheet shows "510 lb ×2 (Brawny)", which is right, but the hover says "Without tweaks or effects: 240 → now 255 / +1 STR · Brawny feat", with no ×2. Push/drag/lift has the same problem (shows 1020, hover says "now 510"), and so does rorrwaak-panel's "900 lb ×3 (Brawny, Powerful Build)", whose hover says "now 300".

### F22: Explanations call feats "class features", and hovers list a +1 that changes nothing (low)
- `node dev/bump-check.js berserker-test-claude --js "addFeat('Acrobat'); raw.classes[0].abilityScoreImprovements[0].abilitiesIncreased=[{name:'Dexterity',value:1}]"`
- The ability breakdown reads "base 14 · +1 from Acrobat (class feature)", and Combat & Vitals lists feats under "From class features (n)". The AC hover gains "+1 DEX · Acrobat feat" although AC stays 17 (DEX 14 → 15). Code: app/viewer.js `renderAbilities`, kindNote `feature: ' (class feature)'`.

### F17: Dungeon Delver's resistance reads "Resistance to the damage" (low)
- SW5E: "You have resistance to the damage dealt by traps." With the same command as F16, Resistances shows only "Resistance to the damage".

### F5: Feat powers show both "Not castable" and "Cast (available)" on the same card (low)
- SW5E (Naturalist): "You can cast it once, using supplies scavenged around you, without the use of a wristpad and without spending tech points…"
- `node dev/bump-check.js berserker-test-claude --feat "Naturalist"`. The Toxin Scan card shows "Not castable: you have no tech points to cast it with" and "[Cast at 1st level (available)]". Survivalist (alarm) does the same. In app/viewer.js the "Power given" slot (cast with points) is shown beside the once-per-rest slot.

### F9: Feat prerequisites other than level and casting aren't checked (low)
- `node dev/bump-check.js berserker-test-claude --feat "Savage Shorty"` (a Medium Human; needs "Strength 13, size Small"), `--feat "Tough"` (needs "4th level, Durable feat") and `--feat "Inspiring Leader"` (CHA 10; needs "Charisma 13") all give no warning. app/choices.js `chUnmet` only handles levels, class levels and casting.

### F7: Commando's crawling speed isn't listed (low)
- SW5E: "You gain a crawling speed equal to your movement speed." With `--feat "Commando"` there is no Speeds entry, though the climbing and swimming speeds of Climber and Mariner are listed.

### F11: Linguist's three languages aren't asked for (low)
- SW5E: "You learn three languages of your choice." With `--feat "Linguist"` there is no picker and nothing in Still to choose. The cipher DC (INT score + PB) isn't shown either.

### F24: Heat Shielded can't raise Constitution (low)
- SW5E: "Increase your Dexterity, Consitution, or Intelligence score by 1, to a maximum of 20." SW5E's attributesIncreased lists only Dexterity and Intelligence, so the picker offers just those two.

### F3: Conditional and text-only benefits aren't listed (low)
- Ace Pilot (expertise on vehicle Investigation/Perception), Actor (advantage when impersonating), Climber (advantage while climbing), Mariner (swim advantage; hold breath 1 + 2×CON = 7 min), Haggler (barter advantage), War Caster ("advantage on Constitution saving throws that you make to maintain your concentration"; thirza-vitchess-panel has the feat and nothing is listed), Alert (can't be surprised), Exalted Awareness, Specialist (9 → 10 on kit checks), Titan's Power (the sheet still warns about a two-handed weapon with a shield). The parser skips any sentence that contains "when", "while" or "if".
