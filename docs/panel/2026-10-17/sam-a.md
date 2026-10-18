# Sam — Part A log (Berserker, desktop sheet http://127.0.0.1:8765/)

Player: Sam. First tabletop RPG ever. Desktop. Relies on the sheet to explain what to do and what a number means; reads every message. Rage, medpacs.

## Setup
- Read brief.md and skimmed README.md as a player. README is long and dense for a beginner: a wall of text per bullet. I understood "Load from SW5E", "Combat & Vitals", "Start" for Rage, "Use" for medpacs, "click any number to roll".
  WISH: a short "first session" / getting-started guide (what to click for: roll a check, attack, take damage, rage, use a medpac, rest), separate from the feature reference. [improvement, medium]

## A1 — Create the character on sw5e.com
- First read sw5e.com's Berserker rules page (as a newcomer: what do I even pick?). "Quick build: highest in Strength, then Constitution; choose the mercenary background." Followed that. Berserker 1: Rage (2/long rest, +2 damage), Unarmored Defense (10 + Dex + Con), hit die d12, HP 12 + Con, saves Str/Con, skills "Choose two from Animal Handling, Athletics, Intimidation, Nature, Perception, Survival", equipment "(a) a vibroweapon and a light or medium physical shield or (b) two vibroweapons; (a) two techaxes or (b) two vibrospears; (a) a dungeoneer's pack or (b) an explorer's pack".
- My characters → round "+" button: a coordinate click on it did nothing (twice, also hover); it only opened (speed dial ✕ / + / download) via a script click. Then "+" → CHARACTER BUILDER (BETA): Species → Class → Ability Scores → Description → Equipment.
- Species: typing in the dropdown filters (typed "Wook"). **Wookiee**: Str +2, Con +1, Claws (unarmed 1d4 kinetic), Darkvision 60 ft, **Hide** ("While you are unarmored or wearing light armor, your AC is 13 + your Dexterity modifier"), Menacing (Intimidation proficiency), Powerful Build, Treeclimber (climb 30 ft, advantage on Str saves/Athletics for climbing), languages Shyriiwook (understands but can't speak Basic). Full text shown: good.
  As a first-timer I didn't know Hide and Unarmored Defense compete (13+Dex vs 10+Dex+Con); nobody tells me which one wins.
  WISH: when two AC formulas apply (species Hide vs Berserker Unarmored Defense), show both and which one the sheet uses. [confusing, medium] — check in A2.
- Class: "Add new class" → typed "Bers" → Berserker → long class text in a dialog → ADD CLASS. Berserker 1: "Number of levels in the class 1", Hit points "12" (greyed select), features Rage, Unarmored Defense. **No skill choice at all** (class says choose two).
- Ability scores: default standard array, six dropdowns, each removing used values. Picked Str 15, Dex 13, Con 14, Int 8, Wis 12, Cha 10. Several clicks on the list items missed (the Constitution pick didn't stick the first time). The step never shows the Wookiee +2 Str / +1 Con, or final scores/modifiers.
  WISH (builder → extension): ability step that shows base + species + feat = final score and modifier as I pick, with a "suggested for your class" hint (Str then Con for Berserker). [improvement, medium]
- Description: Name "Rorrwaak (Panel)", alignment **Chaotic Light**, background **Mercenary** (typed "Merc"). VIEW BACKGROUND DETAILS: "Skill Proficiencies: Choose two from Athletics, Investigation, Persuasion, and Piloting · Tool Proficiencies: One type of gaming set · Languages: One of your choice · Equipment: A uniform of your company (traveler's clothes in quality), an insignia of your rank, a gaming set (one of your choice), and a pouch containing the remainder of your last wages (100 cr)", background feat d8: Brawny, Investigator, Charmer, Ace Pilot, Competitor, Linguist, Weapon Expert, Durable. Picked **Brawny** ("Increase your Strength score by 1, to a maximum of 20 · You gain proficiency in the Athletics skill. If you are already proficient in it, you instead gain expertise in it · Your carrying capacity … doubles. If it would already double, it instead triples").
  Again **no step to pick the background's 2 skills, gaming set or language**. I planned: class skills Athletics + Perception, background Persuasion + Piloting, Brawny → Athletics expertise (already proficient), Wookiee → Intimidation, gaming set Sabacc deck, language Galactic Basic? (Wookiees understand Basic already; I'll take Huttese).
  WISH (builder gap → extension): skill/tool/language choices for class, background and species at creation, with the allowed lists, and a warning when two sources give the same skill (Athletics from class + Brawny → expertise). [missing, high]
  Personality left blank in the builder on purpose (A3 does it in the sheet). The background's d8 personality tables are only in the details dialog, not offered as picks.
- Equipment: "CREDITS: 0", nothing from class or background is offered. Adjust Credits → Add 100 → Apply (Mercenary's 100 cr). Add Equipment: the search box needs two clicks before it takes typing (first click after the dialog opens does nothing). Added **Vibroaxe** (Cost 950, Weight 9.25, Equipped), **Vibrospear ×2** (125 each, 4 lb), **Clothes, traveler's** (20 cr, 4 lb; no Equipped box), **Sabacc deck** (150?). Credits not deducted (fine, starting gear). "Explorer" → "No data available": the explorer's pack doesn't exist; insignia and pouch left out.
  WISH (builder gap → extension): starting equipment from the class and background options in one go ((a)/(b) choices), or the "starting wealth 5d4 × 100 cr" roll, and the packs (explorer's pack) as items or unpacked contents. [missing, medium]
  WISH: as a beginner I don't know if a 950 cr Vibroaxe is "allowed" at level 1 for free; the builder should say which items are my starting kit vs bought. [confusing, low]
- CHARACTER SHEET (sw5e.com): saved as "Rorrwaak (Panel)", Wookiee Berserker 1, **id …**. Builder numbers: HP 14/14, XP 0/300, Prof +2, Init +1, **AC 11**, Speed 30, Passive Perception 11; Str 17 (+3) / Dex 13 / Con 15 (+2) / Int 8 / Wis 12 / Cha 10; saves Str +5, Con +4; no skill proficient (Athletics +3, Intimidation +0); Vibroaxe +5, 1d12+3 kinetic ("Dexterity 11, heavy, two-handed"); Unarmed strike +5, 4 kinetic.
  - BUG (sw5e.com engine): **AC 11** is wrong. Unarmored Defense = 10 + 1 + 2 = 13; Wookiee Hide = 13 + 1 = 14 → should be **14**. Neither formula is applied (11 = 10 + Dex).
  - BUG (engine): Brawny's +1 Str not applied (17 = 15 + 2; should be 18 → +4), Athletics not proficient.
  - BUG (engine): Wookiee Menacing (Intimidation proficiency) not applied; Claws (unarmed 1d4) not applied: unarmed shows "4 kinetic" (1 + Str 3), should be 1d4+3.
  WISH (rules, extension): apply species/feat traits the engine misses: Hide AC, Unarmored Defense, Brawny +1 Str & Athletics, Menacing Intimidation, Claws 1d4. [rules, high] — check in A2 what the sheet does.

## A2 — Bring it into the sheet (desktop)
- Opened http://127.0.0.1:8765/ in my own tab: it showed **Maasha Vaal (Panel)** (another player's; didn't touch). Pressed **Load from SW5E**: top right "Loaded 8 characters from sw5e.com · 15:09:28", then "Recalculated with your changes". The sheet **stayed on Maasha Vaal**, although my sw5e.com tab was on my new character. For ~3 s Maasha's numbers showed different values (Force points 4/4, Passive 12, instead of 5/5 and 15) until the recalculation finished: for a moment I thought I had broken someone's sheet.
  WISH: after Load from SW5E, say what's new ("New: Rorrwaak (Panel) — Wookiee Berserker 1 · Open it") or switch to the character I have open on sw5e.com; with 12 characters in the list I had to hunt for mine. [improvement, medium]
  WISH: while a loaded character is being recalculated, show the old numbers (or a "recalculating…" veil), not the site's raw numbers that look like data loss. [confusing, low]
- Picked "Rorrwaak (Panel) — Wookiee Berserker 1" in the character list (12 entries incl. "· file" test characters). Banner "Recalculating with your active effects…" then the sheet. "Same as sw5e.com's copy. Changes are kept here."
- Numbers vs builder:
  - HP 14/14 ✓, Init +1 ✓, Speed 30 ✓, Prof +2 ✓, Passive 11 ✓, Str 17 / Dex 13 / Con 15 / Int 8 / Wis 12 / Cha 10 ✓ ("base 15 · +2 from species/ASIs/feats/tweaks"), saves Str +5 / Con +4 ✓, Vibroaxe +5 1d12+3 ✓, Unarmed +5 4 ✓, Hit dice 1/1d12 "+2 per die spent (Con)".
  - **AC 13 "Unarmored"** (builder said 11): the sheet applies Unarmored Defense; AC hover: "Without tweaks or effects: 11 → now 13 · +2 AC + CON · Unarmored Defense Berserker feature". Nice explanation! But Wookiee **Hide** ("your AC is 13 + your Dexterity modifier" while unarmored) = **14** is not considered. 
  WISH (bug): AC should take the best of the formulas that apply: Hide 13+Dex = 14 beats Unarmored Defense 13; the hover should list both. [bug, high]
  - Brawny: the Feats card shows a "+ Strength" tag, but Str stays 17 and Athletics +3 "—" (not proficient). Menacing: Intimidation +0 "—". Claws: unarmed still "4 Kinetic" (should be 1d4+3).
  WISH (bug): apply the species and feat traits the engine misses: Brawny +1 Str (→18, +4) and Athletics proficiency (expertise if already proficient), Wookiee Menacing (Intimidation proficient), Claws (unarmed 1d4 + Str). The sheet already does this for class features ("Features change the numbers like effects do"). [bug, high]
  - Vision card: "Normal" — Wookiee has Darkvision 60 ft ("You can see in dim light within 60 feet of you as if it were bright light…"). Not shown anywhere.
  WISH (bug): show species senses: Vision "Darkvision 60 ft" for a Wookiee (the text says "see in dim light within 60 feet"). [bug, medium] (same wording issue Mira found for Kel Dor.)
  - Defenses & senses: "Advantage on Constitution saving throws made to avoid exhaustion due to extreme cold", "Advantage on Strength saving throws and Strength (Athletics) checks that involve climbing", "Climbing speed 30 ft". Good, the species did come through here.
  - Carrying capacity: Max 255 lb, Push/drag/lift 510 lb = plain Str 17 × 15. Powerful Build (doubles) and Brawny (then triples) are ignored.
  WISH (bug): apply Powerful Build and Brawny to carrying capacity: ×3 → 765 lb max (810 with Str 18). [bug, low]
  - Proficiencies & Languages: Languages "Galactic Basic" only — Wookiee speaks **Shyriiwook** and only *understands* Basic (can't speak it). Tool: the raw sentence "One type of gaming set". Skills & saves: only Str/Con saving throws.
  WISH (bug): Wookiee languages: list Shyriiwook, and Galactic Basic as "understands, can't speak". [bug, low]
  - Weapons table: Vibroaxe properties "Dexterity 11, heavy, two-handed". As a new player I have no idea what "Dexterity 11" means on an axe (or "heavy", "versatile (2d4)" on the spear), and nothing explains it on hover.
  WISH: hover/tap a weapon property (heavy, two-handed, versatile, thrown, "Dexterity 11") to read what it does. [improvement, medium]
- Class features: **Rage** card "Uses (back on a long rest) Rages column 2/2, − +, Start Rage" with the full text; Unarmored Defense card; Class dice "Rage Damage +2". Classes & Progression: Archetype select (— none — + 15 approaches), Berserker Instincts 0/0 "None chosen yet" with the list (prereqs like "(7th level)"), Class table Now (1st)/Next (2nd). Effects "From class features (2)": Berserker weapon proficiencies; Unarmored Defense "AC + CON". Clear.
- Settings: Validation "All checks passed" (though Brawny/Hide/Menacing aren't applied — "all checks passed" made me think everything was right). Builder version 0.7.6; Local version history 1/25.
  WISH: Validation should flag choices that are not applied ("Brawny: +1 Str and Athletics not applied", "Mercenary: 2 skills not chosen", "Menacing: Intimidation missing") instead of "All checks passed". [confusing, low]

## A3 — Set up in the sheet
- Class choices at level 1: none for a Berserker (Instincts 0/0 until 2nd, archetype at 3rd). Nothing to do; the sheet shows "None chosen yet" and the table says instincts come at 2nd. Fine.
- Skills: first I clicked the little proficiency circle next to Athletics in the Skills table, expecting to tick it: it opened the dice dock ("Athletics (STR) Rorrwaak (Panel)", Roll +3) instead. Closed it (Escape). Found the way only by reading the README: **Settings, Tweaks & Data → Add a tweak to…**.
  WISH: let me mark skill proficiency where the skills are (click the circle → proficient/expertise), or better a "Choose your skills" picker per source: Berserker 2 of (Animal Handling, Athletics, Intimidation, Nature, Perception, Survival), Mercenary 2 of (Athletics, Investigation, Persuasion, Piloting), Wookiee Menacing (auto), Brawny (auto). A newcomer would never look for "Tweaks" at the bottom of Settings. [missing, high]
- Added 8 tweaks, each = pick stat (a 65-entry list) + mode + amount + reason + Add:
  1. Athletics **expertise** — "Berserker class skill + Brawny feat (already proficient, so expertise)"
  2. Perception proficient — "Berserker class skill (chosen at 1st level)"
  3. Persuasion proficient — "Mercenary background skill"
  4. Piloting proficient — "Mercenary background skill"
  5. Intimidation proficient — "Wookiee Menacing trait (not applied by SW5E)"
  6. Strength score add 1 — "Brawny feat: +1 Strength (not applied by SW5E)"
  7. AC set to 14 — "Wookiee Hide: 13 + Dex while unarmored, beats Unarmored Defense (13)"
  8. Unarmed: damage die — "Wookiee Claws: unarmed strikes deal 1d4 (not applied by SW5E)"
  Toasts like "Added a tweak: Intimidation Proficient. Not synced to SW5E yet." Good feedback.
  - WISH: Enter in the Reason box should add the tweak (had to click Add). [improvement, low]
  - The stat list is one flat 65-item select: typing "AC" jumps to "Acrobatics (DEX)"; I had to arrow down 17 entries to reach "AC".
  WISH: group the tweak target list (Abilities / Skills / Combat / Powers / Weapons) or make it searchable; typing "AC" should find AC. [improvement, low]
  - **Unarmed: damage die**: the add row's amount box says "e.g. 1" and only takes numbers; I typed "1d4" and it became "14". With "set to" + 4 the tweak was added but its **Die box stayed empty** (the 4 was lost); I had to type 4 again into the row's "Die" box (its tooltip "Damage die size, e.g. 6 for d6" only shows on the row after adding).
  WISH (bug): when adding a damage-die tweak, the amount should become the die size ("d4") and be kept; accept "1d4"/"d4"; hide modes that make no sense for it (proficient/expertise on a damage die). [bug, medium]
  - Result after recalculation (~3 s each, "Recalculated with your changes · 15:14:17"): **Str 18 (+4)**, **AC 14**, Athletics **+8 Expertise** (passive 18), Intimidation +2, Perception +3 (passive 13), Persuasion +2, Piloting +1, **Vibroaxe +6, 1d12+4**, **Unarmed Strike +6, 1d4+4**. All correct now.
  - Rules worry: AC "set to 14" is a fixed number: if I ever put on armor or a shield it will stay 14. WISH covered above (Hide as a real AC formula). 
- Proficiencies & Languages after the tweaks: "Skills & saves" chips Athletics, Piloting, Perception, Intimidation, Persuasion, Str/Con saves. But **no way to add a tool or a language**: Tool still reads "One type of gaming set" (the background sentence), Languages "Galactic Basic" only. Wanted: Sabacc deck, Shyriiwook, Huttese.
  WISH: add tools and languages in the sheet (a picker for "One type of gaming set" / "One of your choice", and species languages filled in). [missing, medium]
- Personality & Appearance → Edit: one form with Alignment select, Personality Traits, Ideal, Bond, Flaw, Gender, Place of Birth, Age, Height, Weight, Hair, Eyes, Skin, Appearance → Done. Filled all (trait/ideal/bond copied from the Mercenary d8 tables in sw5e.com's background dialog). Easy.
  WISH: offer the background's suggested personality tables (d8 trait, d6 ideal/bond/flaw) to pick or roll right in this form; I had to copy them from sw5e.com's dialog. [improvement, low]
  - WISH: don't recalculate on sw5e.com after saving personality text (it showed "Opening sw5e.com in a background tab…" although no number can change). [improvement, low]
- Starting equipment (Equipment & Inventory → "Add an item from SW5E", free unless Pay is ticked): "explorer" → "No SW5E item matches." (no Explorer's pack); "insignia" → no match; added **Pouch** (Storage · 5 cr · 1 lb, "Pay 5 cr from credits (have 100 cr · standard price 5 cr each)"), **Backpack**, **Bedroll**, **Field rations (one day's) ×10** (Pay box updates to 50 cr for 10 — nice), **Glowrod**. Credits stayed 100. Total weight 44.25 lb "of 270 lb max" (still ignores Powerful Build/Brawny).
  - Typing "ration" lists Blaster Integration, Disintegration Core…, Infiltration Package before "Field rations": substring matches first. WISH: rank names that start with / have a word starting with the typed text first. [improvement, low]
  WISH: kits/packs (Explorer's pack etc.) addable as one item that unpacks into its contents, and a free-text custom item for story items like an insignia. [missing, medium]
  - Also: as a beginner I had to guess what an explorer's pack contains; nothing tells me.
- Notes → Edit (Markdown) — the element-ref click on "Edit" didn't open it, a normal click did. Wrote "Not on the sheet yet" (Sabacc deck, languages, insignia, the explorer's pack contents) and a "Session 1" heading. Rendered nicely.

## A4 — Cantina: Persuasion, then Insight with advantage
- Skills table → clicked the Persuasion row: dice dock "Persuasion (CHA) Rorrwaak (Panel)", Disadvantage / Normal / Advantage, d20, Add +d4…, Modifier, "Roll +2". Rolled: **16 + 2 = 18**. Recent rolls list "Persuasion (CHA) 18 15:17".
- Insight row → Advantage (two d20 shown) → "Roll +1": **14 / ~~12~~ → 15** ("14 (advantage) + 1 modifier"). Clear: the lower die is struck through.
- As a beginner I didn't know whether 18 or 15 was "good"; the GM had to tell me. Fine at a table, but:
  WISH: optional "DC" box in the roller (the GM says "DC 15") that shows Success / Failure. [improvement, low]

## A5 — Shopping at Kessa's Outfitters (2 Medpacs + a Berserker item)
- Credits 100 cr. Add an item → "medpac": Medpac (Medical) plus Medpac (Champion/Exceptional/Fine/Improved/Superior…). Picked **Medpac**: "Medical · 300 cr · 0.5 lb", Qty 2 → "Pay 600 cr from credits (have 100 cr · standard price 300 cr each)". Ticked Pay → Add: red "**Not enough credits: 600 cr needed, 100 cr available.**" Clear.
- 20% off = 480 cr: still can't afford. GM ruling (as at a real table): buy my class item first, then pay what I have for the medpacs and owe Kessa the rest.
- Class item: **Light physical shield** (Armor · 50 cr · 0 lb; Berserker's Unarmored Defense allows a shield). The add row offered "Equipped" + "Pay 100" — **Qty was still 2** from the medpac search, and Pay was still ticked: I almost bought two shields. Set Qty 1, ticked Equipped → Add → credits 50 cr. Inventory: "Light physical shield · AC +1 · Shield · Equipped".
  WISH: reset Qty to 1 (and Pay to unticked) when I pick a different item. [improvement, low]
  - WISH (rules): weight "0 lb" for a Light physical shield looks wrong (SW5E data?); check/fill item weights. [rules, low]
- **AC problem**: AC stayed **14** with the shield. Hover: "Without tweaks or effects: 12 → now 14 · = 14 AC Wookiee Hide… tweak · +2 AC + CON Unarmored Defense". My "set to 14" tweak froze AC. Correct: Hide 13+1 = 14, +1 shield = **15**.
  - Fixing it went wrong: in the AC tweak row I cleared "Set to" (to switch to Bonus +1). **The whole AC tweak vanished instantly** (with its reason, no undo, no message), the rows below moved up and the page shifted, so my next typing (bonus "1" and the new reason) landed in the **Piloting** tweak's reason box, overwriting "Mercenary background skill". Repaired Piloting's reason by hand and re-added AC as "add 1" ("Wookiee Hide (13 + Dex) is 1 better than Unarmored Defense (10 + Dex + Con)"). AC now **15** ("Without tweaks or effects: 12 → now 15 · +1 AC Wookiee Hide… · +2 AC + CON Unarmored Defense"). Correct.
  WISH (bug): emptying a tweak's value must not delete the tweak on the spot (or at least: ask, show "Tweak removed · Undo", and keep the rows from jumping under the cursor). I lost a reason and overwrote another one without noticing. [bug, high]
  WISH: an AC tweak that "sets" AC should warn when armor/shield changes ("your AC tweak overrides the shield's +1"). [improvement, medium]
- Medpacs: Pay box with Kessa's 20% price 480 → "Not enough credits: 480 cr needed, 50 cr available." Then **Pay 50** (all I had) with Qty 2 → bought: **Medpac ×2**, credits **0 cr**. The price box accepting any amount made the partial payment possible. Debt to Kessa **430 cr** written in Notes (nowhere else to put it).
  WISH: record a debt/IOU (or allow negative credits with a warning) so "owe Kessa 430 cr" lives next to credits, not in Notes. [missing, low]
- Inventory now: Vibroaxe (Equipped), Vibrospear ×2, Light physical shield (Equipped), Clothes traveler's, Sabacc deck, **Medpac ×2 (Use)**, Pouch, Backpack, Bedroll, Field rations ×10, Glowrod. 47.25 lb of 270 lb.
- Notes → Edit again: added "Cantina contact: Persuasion 18, Insight 15 (adv)" and "Kessa's Outfitters: … paid 50 cr, **owe Kessa 430 cr**".

## A6 — Ambush at the docks (3 rounds)
- Clicked "Combat & Vitals" in the side list right after saving Notes: the address changed to #sec-combat but **the page didn't move**; a second click worked.
  WISH (bug): side-list links must scroll on the first click, also right after saving a form. [bug, low]
- **Initiative**: clicked the Initiative tile (+1) → dock "Initiative", Roll +1 → **6 + 1 = 7**.
- **Round 1**
  - Rage: as a beginner in a fight I looked at the play tracker first: the Rage row there only has the counter "●● 2/2 − +". The **Start Rage** button is far down in Class Features → Rage card. Clicked it: "Active · lasts 1 minute · End", uses 1/2, chip "Rage" in the side summary, Vibroaxe damage now **1d12+6**, Unarmed **1d4+6**, Defenses & senses: "Resistance to kinetic and energy damage", "Advantage on Strength checks", "Advantage on Strength saving throws". Great that it all switched on at once.
  WISH: put "Start Rage" (and other Start buttons) next to the counter in Combat & Vitals' play tracker, where I am during a fight. [improvement, medium]
  - Attack: Weapons table → "+6" on Vibroaxe → dock "Vibroaxe attack", Roll +6 → **9 + 6 = 15** (GM: hit). "Hit: roll damage" / "Critical damage" buttons, Critical: Double dice / Max + roll. Hit: roll damage → **8 + 6 = 14 kinetic** ("8 + 6 damage bonus").
  WISH: show where the damage bonus comes from in the roll ("+4 Str +2 Rage"), so I learn what Rage does. [improvement, low]
  - **Rules mistake nobody caught**: I have the Light physical shield equipped AND attack with the Vibroaxe ("heavy, two-handed"). You can't use a two-handed weapon with a shield; the sheet happily shows both as Equipped and rolls the attack. The GM pointed it out after the round.
  WISH (rules): warn when a two-handed weapon and a shield are both equipped (or when attacking with a two-handed weapon while a shield is equipped). [rules, medium]
  - Took **6 kinetic damage**: typed 6 → Damage → HP **8/14**, "Undo: Took 6 damage". **Rage resistance was not applied** (should be 3). Only because I read "Resistance to kinetic and energy damage" in Defenses & senses did I notice. Undo → typed 3 → Damage → **HP 11/14**.
  WISH (bug): the damage box should know my resistances: pick a damage type (kinetic/energy/…) and halve automatically while raging (or at least ask "You resist kinetic while raging: take 3?"). As a first-timer I'd have lost 3 HP every hit. [bug, high]
  - Play tracker now says "Differs from sw5e.com's copy. Use SW5E's values · Sync to SW5E".
- **Round 2**: thug crit **13 kinetic** → I halved it myself for Rage → typed 6 → Damage → **HP 5/14** (not 0, so no death saves). My attack: Shift-click on "+6" rolled straight away (**11 + 6 = 17**, hit) — but Shift-click also **selected the text of half the page** (blue highlight everywhere until I clicked elsewhere).
  WISH (bug): Shift-click to roll shouldn't select page text. [bug, low] Hit: roll damage → **8 + 6 = 14 kinetic**.
- **Round 3**: ally's Medpac: typed 6 → Heal → **HP 11/14** ("Undo: Healed 6"). My own Medpac: Equipment → Medpac "Use" → "On me / On someone else / Cancel" → On me → dock "Medpac: healing" d12 **10 + 2 Constitution modifier = 12**, button "Heal 12" → "✓ Healed 3 (of 12; at maximum)" → **HP 14/14**, Medpac ×1 left (0.5 lb). Smooth; the "of 12; at maximum" message is clear.
  WISH: before I use a medpac at 11/14 HP, tell me "you're only missing 3 HP" (I wasted 9 points of a 300 cr medpac). [improvement, low]
  - Not concentrating (Berserkers don't cast): no Con save.
- **After the fight**: Effects → Temporary: "Rage · Melee STR damage +2 · started, lasts 1 minute, since Sat 15:23 · End". Clicked End → chip gone, resistances/advantages gone, damage back to 1d12+4. 
  - "lasts 1 minute, since Sat 15:23" is real-world time; in the game a minute is 10 rounds. As a beginner I don't know how many rounds I have left.
  WISH: a simple round counter / "next round" button that counts down 1-minute effects (Rage 10 rounds) and reminds me that Rage ends if I didn't attack or take damage this turn. [improvement, medium]
  - GM ruling on the shield + two-handed axe: unequipped the shield (Equipment → "Equipped" → "Equip"): AC back to **14**. Kept it in the inventory.

## A7 — Loot
- **150 credits**: credits box "+150" → Apply → **150 cr** (from 0). Easy.
- **Strength Stim (Basic)**: search "strength stim" → Basic/Champion/Exceptional/Fine/Improved/Superior. Basic: "Consumable · Standard", no price shown ("Pay 0"), Description: "…the target's Strength score increases by 2, to a maximum of 20. This effect lasts for 1 hour…". Added free → listed under "Enhanced: Consumable (1)" with Use.
- **Coded datapad with the smuggler's coordinates** (story item): typed the full name → Add → red "Choose an item from the S…" (the rest of the message is hidden under the "No SW5E item matches." popup). No custom item, and an added item can't be renamed or given a note. Workaround: added the generic **Datapad** (Data Recording And Storage · 0.5 lb · 100 cr) and explained it in Notes.
  WISH: custom/story items: a free-text item (name, qty, weight, note) or rename/annotate an SW5E item ("Datapad — coded, with the smuggler's coordinates"). [missing, medium]
  WISH (bug): the error under the item search is covered by the suggestions popup; I could only read "Choose an item from the S". [bug, low]
- No blaster, so no power cells.

## A8 — Short rest (spend hit dice)
- I was already at **14/14** (the medpac in round 3 topped me up), so there was nothing to heal; the script's hit-dice spending didn't apply. Still tried the flow:
  - "Hit dice (d12) roll d12 +2, then Heal": clicking on "Hit dice (d12)" or on "then Heal" did nothing; only a click exactly on the grey words "roll d12 +2" opened the dock "Hit die (d12) · Roll +2". It looks like helper text, not a button.
  WISH: make the hit-die roll a real button ("Roll d12+2") with a bigger target. [confusing, medium]
  - Rolled **4 + 2 = 6** → the dock offered "**Heal 6 and spend the d12**" although I'm at full HP. Didn't click it.
  WISH: at full HP, don't offer "Heal 6 and spend the d12" (or warn "You're at full HP — this would waste the die"). [improvement, medium]
  - **Short rest** → top-right message: "Nothing to regain on a short rest. To heal, roll hit dice ("roll d…" in the tracker)." Clear and helpful. Rage stays 1/2 (long rest only) — correct.
  WISH: Short rest could open a small panel: "Spend hit dice? (1 left, d12+2)" with a Roll button, instead of telling me to find the "roll d…" text. [improvement, medium]

## A9 — Inspiration, used on Stealth
- Play tracker "☆ Inspiration" → "★ Inspired" (green), chip "Inspired" in the side summary. One click.
  - As a first-timer I didn't know what Inspiration does; no tooltip or text on the button (no title, nothing on hover).
  WISH: a one-line explanation on Inspiration ("Spend it to get advantage on one attack, save or check"). Same for Exhaustion levels. [confusing, low]
- Skills → Stealth → dock "Stealth (DEX)", Normal, Roll +1. The roller **doesn't know I'm inspired** (no "Use Inspiration" option). Picked Advantage myself → **9 / ~~7~~ → 9 + 1 = 10**. Inspiration stayed on; went back to Combat & Vitals and clicked "★ Inspired" → "☆ Inspiration" to spend it.
  WISH: when Inspired, the roller offers "Use Inspiration (advantage)" on any d20 roll and spends it in the same click. [improvement, medium]

## A10 — Long rest, 300 XP
- **Long rest** → top right "Long rest: regained uses of Rage." Rage 2/2, HP 14/14, hit dice 1/1, "Undo: Long rest". Good.
- **XP**: Overview → Edit → "Experience points" / "Credits (edited)" form ("Type a number, or +50 / −80 to add or subtract. Changes stay in this browser until you save them to SW5E.") → **+300** → Done → bar full, "300 XP · next level at 300 (0 to go)". After the recalculation an orange chip: "**You have unused levels. Click below to add more class levels.**" Clicking the chip does nothing and there's nothing "below" to click (that's sw5e.com builder wording). As a new player I really didn't know what to do next.
  WISH: replace that chip with a **Level up** button in the sheet (the owner's direction), or at least the real steps: "Level up in sw5e.com's builder (Class → Number of levels), then Load from SW5E". [confusing, high]
  WISH (for part B, noted now): a level-up flow in the extension for a Berserker 2: HP (roll d12 or take 7, + Con), Reckless Attack explained, pick 2 Berserker Instincts; at 3rd the Approach. [missing, high]
- Top banner: "**Not synced to SW5E:** play state, Tweaks, Personality Traits, Ideal, Bond, Flaw, Gender, Place of Birth, Age, Height, Weight, Hair, Eyes, Skin, Appearance, Inventory, Notes, Credits, XP" with "Sync to SW5E" and "Revert to SW5E's copy" side by side; the play tracker also says "Differs from sw5e.com's copy. Use SW5E's values · Sync to SW5E". As a beginner this reads like "your stuff isn't saved!", and "Revert…"/"Use SW5E's values" sit one click away from wiping my session.
  WISH: word it as reassurance first ("Saved in this browser. Not on sw5e.com yet — Sync is optional"), and make Revert/Use SW5E's values ask what will be lost. [confusing, medium]
- Notes → Edit: appended the fight, the loot (**Datapad = the coded datapad with the smuggler's coordinates**), Inspiration on Stealth, long rest + 300 XP.
- I did NOT sync to sw5e.com (not part A).

## Praise (what not to break)
- Load from SW5E brought the brand-new character in within seconds with numbers identical to the builder, and the sheet even fixed the builder's AC (Unarmored Defense applied, with the hover "Without tweaks or effects: 11 → now 13 · +2 AC + CON · Unarmored Defense").
- Hover explanations on changed numbers (AC tooltip listing each tweak/effect with its reason) — exactly what a beginner needs.
- Start Rage: one click spends the use, adds Rage damage to the axe, lists resistance/advantages under Defenses, shows a "Rage" chip; End removes it all.
- Dice dock: click any number to roll, Advantage with the struck-through die, "Hit: roll damage" right after the attack, critical options, recent rolls list.
- Medpac "Use → On me" rolls d12+Con and heals in one click with "Healed 3 (of 12; at maximum)"; stack count goes down.
- Damage / Heal / Undo of the last action ("Undo: Took 6 damage") saved me when I forgot Rage resistance.
- Buying: price preview, editable price, quantity × price, clear "Not enough credits: 600 cr needed, 100 cr available."; credits box with +150.
- Short rest message "Nothing to regain on a short rest. To heal, roll hit dice ('roll d…' in the tracker)." and long rest "regained uses of Rage." tell me what happened.
- Tweaks with reasons and the toast "Added a tweak: Intimidation Proficient. Not synced to SW5E yet."
- Personality form all in one place; Notes with Markdown.

## Hand-off (end of part A)
- **Character**: Rorrwaak (Panel) — Wookiee Berserker 1, Mercenary background (Brawny feat), Chaotic Light. **sw5e.com id …**. Viewer: http://127.0.0.1:8765/ → select "Rorrwaak (Panel) — Wookiee Berserker 1".
- **Level 1, 300 XP** (level 2 reached by XP; sheet shows "You have unused levels…").
- **HP 14/14**, no temp HP, death saves clear, hit dice 1/1 d12, **Rage 2/2**, Inspiration spent (off), exhaustion 0, no active effects.
- Abilities: **Str 18** (17 from SW5E + tweak "+1 Brawny"), Dex 13, Con 15, Int 8, Wis 12, Cha 10. **AC 14** unarmored (Unarmored Defense 13 + tweak +1 for Wookiee Hide; 15 with the shield). Init +1, Passive Perception 13. Vibroaxe +6, 1d12+4 (1d12+6 raging); Unarmed +6, 1d4+4 (Claws tweak).
- **Tweaks (8, reasons kept)**: Athletics expertise (class + Brawny), Perception proficient (class), Persuasion + Piloting proficient (Mercenary), Intimidation proficient (Wookiee Menacing), Strength score +1 (Brawny), AC +1 (Wookiee Hide), Unarmed damage die 4 (Wookiee Claws).
- **Credits 150 cr**. **Owe Kessa 430 cr** (Notes only).
- **Inventory (13 rows)**: Vibroaxe (equipped), Vibrospear ×2, Light physical shield (NOT equipped: two-handed axe), Clothes traveler's, Sabacc deck, **Medpac ×1**, Pouch, Backpack, Bedroll, Field rations ×10, Glowrod, **Datapad (= the coded datapad with the smuggler's coordinates, explained in Notes)**, **Strength Stim (Basic) ×1**.
- **Not in the sheet** (in Notes only): Sabacc deck tool proficiency, languages (Shyriiwook, understands Basic, Huttese), insignia of rank, the datapad's real name, the debt to Kessa. Wookiee Darkvision 60 ft not shown anywhere; Powerful Build/Brawny carrying capacity not applied.
- **Not synced to sw5e.com**: the site's copy is still the fresh level-1 build (100 cr, 4 items, no skills, Str 17, AC 11 there, no personality/notes/XP). Banner lists play state, Tweaks, personality fields, Inventory, Notes, Credits, XP as not synced. Part B: levelling on sw5e.com + Load from SW5E should keep the viewer's values ("your own values win") — check tweaks, inventory (datapad, medpac, stim), notes, credits 150, XP 300.
- Tabs: closing my viewer tab and my sw5e.com tab at the end.
