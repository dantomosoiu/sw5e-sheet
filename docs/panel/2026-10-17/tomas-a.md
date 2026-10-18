# Tomas — Part A log (Fighter, later Operative multiclass; desktop sheet http://127.0.0.1:8765/)

Player: Tomas. Optimizer. Checks attack bonuses, AC and damage against his own math; wants multiclassing to just work.

## Setup
- Read brief.md and README.md (skimmed as a player).

## A1 — Create the character on sw5e.com
- Read the Fighter rules page first (sw5e.com/rules/phb/classes/Fighter): d10, 10+Con at 1st, all armor, all blasters + vibroweapons, saves Str/Con, skills "Choose two from Acrobatics, Animal Handling, Athletics, Lore, Insight, Intimidation, Perception, and Survival", equipment a/b packages, variant wealth 8d4 x 100 cr. Plan for the multiclass: Dex build (Operative needs Dex 13; Fighter Str or Dex 13).
- My Characters → round "+" → speed-dial (download / +) → "+" → CHARACTER BUILDER (BETA) with a ⚙ that has a red "!" badge (it means "Character has unsaved changes", which I only learnt by opening it).
- Species: the dropdown does filter as I type ("Zab" → Zabrak). Picked **Zabrak**: Con +2, "Str or Dex +1" (dropdown "Choose 1 ability score to increase by 1" → Dexterity), Coercive (Persuasion OR Intimidation), Crafters (one artisan's implements), Second Heart (drop to 1 HP instead of 0, 1/long rest), Toughness (+1 HP per level), Unarmed Combatant (1d4, finesse), languages Basic + Zabraki.
  - The builder only asks for the +1 ability. It never asks me to pick Coercive's skill (Persuasion vs Intimidation) nor Crafters' artisan's implements.
  WISH (builder gap → extension): species choices (Coercive skill, Crafters tool) as pickers, applied as proficiencies. [missing, high]
- Class: ADD NEW CLASS → dialog → typed "Fight" → Fighter → long class text → ADD CLASS. "Fighter 1", "Number of levels in the class 1", HIT POINTS 10 (greyed select), Class features: Fighting Style (text only: "Choose one of the fighting style options, detailed in Chapter 6." — no picker), Second Wind.
  WISH (builder gap → extension): fighting style picker at creation (the sheet has one, check A3). [missing, medium]
  - No class skill choice (2 of 8) anywhere in the Class step.
- Ability scores: default is Standard Array ("Choose a method by clicking the ⚙ icon above"). As an optimizer I want point buy: ⚙ → "Character Builder Settings" (SAVE CHARACTER, "Character has unsaved changes", Hit Points Calculation Manual, Ability Score Calculation Standard Array/Point Buy/Manual, Force Power Prerequisites Enforce, Export…, DELETE CHARACTER) → Point Buy → CLOSE. "Remaining Points: 27".
  - Each score is a dropdown "8 (0 points)… 15 (9 points)"; options I can't afford are hidden (good). But the dropdown list doesn't scroll on the first wheel turn after opening (needed a second scroll to reach 14/15).
  - Bought Str 8, **Dex 15**, **Con 14**, Int 10, Wis 13, Cha 12 → "Remaining Points: 0". The step never shows the species bonus or final scores/modifiers (I have to know Dex 16 / Con 16 myself).
  WISH (builder → extension): ability step showing base + species = final score and modifier live, plus "Operative multiclass needs Dex 13: OK". [improvement, medium]
- Description: Name "Kadro Vos (Panel)", alignment Chaotic Balanced, background **Soldier** (typed "Sold" to filter). VIEW BACKGROUND DETAILS: Skill Proficiencies "Choose two from Athletics, Intimidation, Persuasion, and Piloting"; Tool "One type of gaming set"; Languages "One of your choice"; Equipment "An insignia of rank, a trophy taken from a fallen enemy, a gaming set (one of your choice), a set of common clothes, and a belt pouch containing 100 cr"; background feat d8 list (Brawny, Threatening, Charmer, Ace Pilot, Competitor, Linguist, Weapon Expert, Healer). The feat dropdown shows names only; text appears after picking.
  - Picked feat **Weapon Expert**: "Increase your Strength, Dexterity, or Constitution score by 1… proficiency with all blasters. If you are already proficient… once per turn when you would roll weapon damage using a blaster, you can choose to have advantage" (same for lightweapons and vibroweapons).
  - The builder offers NO choice for Weapon Expert's +1 (Str/Dex/Con), and none for the background's 2 skills, gaming set, or language.
  WISH (builder gap → extension): a feat's "increase X, Y or Z by 1" as a picker, applied to the score. [missing, high]
  WISH (builder gap → extension): background skills (2 of 4), tool and language pickers. [missing, high]
  - Personality fields left empty on purpose (A3 in the sheet).
- Equipment step: "CREDITS: 0", nothing offered from Fighter's a/b packages or the Soldier's list. Added by hand with "+" → Add Equipment dialog (Filter by Category / Type / Search): Mesh armor (Cost 600, Weight 20, Equipped), Blaster rifle (525, 7.5 lb, Equipped), Power cell ×3 (10 cr each; 2 from the rifle option + 1 from the light pistol option), Light pistol (250, 0.5 lb, not equipped), Vibrorapier (150, 3.5 lb, Equipped), Vibrodagger. Credits not deducted (right for starting gear).
  - Every add = "+", click Search (often needs a second click before typing registers), type, pick, (Equipped), ADD: ~6 actions × 6 items. The dialog shows cost/weight/description but no AC, armor type (light/medium?), damage or properties, so I couldn't compare mesh armor vs combat suit without the rules pages.
  - "Explorer's pack" (Fighter option) → "No data available": packs aren't in the list.
  - **CUSTOM ITEMS** "+" exists in the builder: "Add a Custom Item" (Name, Type Gear, Cost, Weight, Quantity, Description). Added "Insignia of rank (Sergeant)", weight 0, description "Soldier background: my old unit's rank insignia." (testing whether it comes into the sheet).
  - CREDITS: 0 → "Adjust Credits" (Add / amount / "Result: …") → +100 (Soldier's belt pouch) → APPLY → CREDITS: 100.
  WISH (builder gap → extension): starting equipment as the class/background a/b choices (one click per option, packs unpacked) or a starting-wealth roll (8d4 × 100 cr). [missing, medium]
- CHARACTER SHEET → it saved by itself (⚙ no longer shows "unsaved changes"; card "Kadro Vos (Panel) — Zabrak Fighter 1" on My Characters). **id …**.
- sw5e.com sheet numbers vs my own math:
  - Str 8 / Dex 16 / Con 16 / Int 10 / Wis 13 / Cha 12 (species +2 Con, +1 Dex applied; Weapon Expert +1 NOT applied anywhere). Saves Str +1, Con +5 (proficient) — correct.
  - **HP 13/13. Mine: 10 + Con 3 + Zabrak Toughness 1 = 14.** BUG (engine): Zabrak Toughness ("Your hit point maximum increases by 1, and it increases by 1 every time you gain a level") not applied.
  - AC 15 "Mesh armor" (I can't check without the armor's stats; the builder never showed them), Init +3, Speed 30, Passive Perception 11, Prof +2.
  - Blaster rifle +5, 1d8+3 Energy, "Power cell (range 105/420), reload 12, two-handed" — +5 = 2 + 3 correct. (Range 105/420? the rules list 100/400; odd.)
  - Vibrorapier +5, 1d8+3 Kinetic, Finesse — correct.
  - **Unarmed strike +1, 0 Kinetic.** BUG (engine): Zabrak "Unarmed Combatant. Your unarmed strikes deal 1d4 kinetic damage and have the finesse property." → should be +5 (Dex 3 + prof 2), 1d4+3.
  - No skill proficient at all (Coercive, Soldier's 2, Fighter's 2 all missing).
  - Features list has DARKVISION although Zabrak has no darkvision trait (check in A2).
  - No fighting style chosen anywhere; "Weapon Expert" damage advantage isn't shown on the weapons.
- (Rules data, sw5e.com) Zabrak's species page lists no darkvision, but the character gets a "Darkvision" trait (60 ft) from sw5e.com's data. I take it as given. [rules, low]

## A2 — Bring it into the sheet (desktop)
- Opened http://127.0.0.1:8765/ in a new tab: it showed "Thirza Vitchess (Panel)" (Mira's; didn't touch). Pressed **Load from SW5E**: top-right "Loaded 5 characters from sw5e.com · 12:58:48", but the sheet **stayed on Thirza**, even though my sw5e.com tab was on Kadro's page. Picked "Kadro Vos (Panel) — Zabrak Fighter 1" from the character dropdown (the list has all 9 characters on this account + local test files, incl. other players'). Then "Recalculating with your active effects…" → "Recalculated with your changes · 12:59:11".
  WISH: after Load from SW5E, switch to the character I just created/opened on sw5e.com (or say "1 new character: Kadro Vos (Panel) — open it?"); today I had to find it in a 9-item list with other players' characters. [confusing, medium]
- Numbers vs builder and vs my own math:
  - Same as the builder: AC 15 "Mesh armor", HP 13/13, Init +3, Speed 30 ft ("3 miles/hour · 24 miles/day"), Prof +2, Passive 11, Hit dice 1/1d10 "+3 per die spent (Con)". Dex 16 "base 15 · +1 from species/ASIs/feats/tweaks", Con 16 "base 14 · +2". Saves Str +1, Con +5. Good tooltips on the bases.
  - AC: inventory row finally tells me "Mesh armor — AC 13 + Dex modifier (max 2) · Medium" → 13 + 2 = 15 ✓ (my Dex +3 is capped; a light armor might have been better — the builder never showed this).
  - Blaster rifle +5 1d8+3 Energy, Dexterity, "Martial Blaster", "Power cell (range 105/420), reload 12, two-handed" ✓. Vibrorapier +5 1d8+3 Kinetic, Finesse ✓.
  - **HP 13, should be 14** (Zabrak Toughness +1/level not applied; the sheet doesn't fix the engine either). [bug/rules, high — HP is wrong]
  - **Unarmed Strike +1, 0 Kinetic, Strength** — Zabrak "Unarmed Combatant: 1d4 kinetic, finesse" not applied → should be +5, 1d4+3 (Dex via finesse). [bug/rules, medium]
  - **Weapon Expert**: the FEATS card shows "+ Strength + Dexterity + Constitution" tags but no way to pick one; none of my scores went up (should be Dex 17 or Con 17). Its "advantage on weapon damage rolls with blasters/vibroweapons once per turn" (I'm already proficient) appears nowhere on the weapons. [missing, high]
  - **Vision: Normal** although the species card lists the Darkvision trait (60 ft). [bug, medium]
  - Proficiencies & Languages: Languages "Galactic Basic" only — Zabraki missing (the Species card even says "Language Zabraki"). Tool row shows the raw sentence "One type of gaming set". Skills: none proficient. [bug, low] / [missing, see A3]
  - Species card: "Chosen ASI {"Dexterity":1}" — raw JSON shown to the player. [bug, low]
  - Background card: Specialty shows a raw Markdown table "Roll a d8 or choose… |d8|Specialty| |:---:|:----------:| |1|Officer|…" instead of a table. [bug, low]
  - Mesh armor costs "500 cr" in the sheet; the builder's Add Equipment dialog said "Cost: 600". One of them is wrong. [bug, low]
- Good: Coercive and Crafters have an orange-outlined "Your choices" box ("What you chose (e.g. Persuasion + Forgery kit)"); the Fighter card has a **Fighting style 0/1** picker with the full style list; Classes & Progression has the archetype list and Fighter Strategies 0/0; Second Wind counter 1/1 "short rest" on the tracker; my builder **custom item "Insignia of rank (Sergeant)" came through** under "Custom items (1)" with a "custom" tag.

## A3 — Set up in the sheet
- **Fighting style**: Classes & Progression → Fighter → "Fighting style 0/1 — Choose a fighting style…" (a plain dropdown of 32 style names, no text). I opened it and typed "Sharp" to jump to Sharpshooter: **typing in the dropdown added "Secured Style" on the "S"** and then Sharpshooter Style → "⚠ 2 chosen, 1 allowed", "2/1" in red. Removed Secured Style with its ×. Now "Fighting style 1/1 — Sharpshooter Style"; clicking the row shows its text (mark a target >30 ft as a bonus action for an opportunity attack with a blaster; ignore/reduce partial cover beyond 30 ft; one-handed grip on a two-handed weapon without an object interaction). No numeric bonus, so nothing to check on the rifle (+5 stays).
  WISH (bug): picking from the style/option dropdown by keyboard adds every option I pass (type-ahead "S" added Secured Style). Add only on Enter/click, or use a searchable list. [bug, medium]
  WISH: show each style's short text in the picker before choosing (as an optimizer I wanted to compare Sharpshooter vs Defense vs Gunning; sw5e.com's fighting-styles page didn't load for me either). [improvement, medium]
- **Coercive / Crafters** (species "Your choices" boxes): typed "Persuasion" and "Tinker's implements". The sheet recalculated ("Recalculated with your changes · 13:01:12") but **Persuasion stayed +1 (not proficient) and no tool was added** — the README says choices written in a feature's notes apply proficiencies; for species traits they don't.
  WISH (bug/missing): species "Your choices" should apply the skill/tool like class features' notes do (Coercive → Persuasion proficiency; Crafters → tool proficiency), or be a picker of the 2 allowed skills. [bug, high]
- **Weapon Expert's +1**: the feat card's "+ Strength / + Dexterity / + Constitution" tags look clickable; clicking just collapses the card. No "Your choices" box on feats either.
- So everything went in as **tweaks** (Settings, Tweaks & Data → "Add a tweak to…" + mode + value + reason + Add), 8 of them: Persuasion proficient ("Zabrak Coercive (chose Persuasion)"), Insight + Perception proficient ("Fighter class skill (chosen at 1st level)"), Intimidation + Piloting proficient ("Soldier background skill"), Dexterity score +1 ("Weapon Expert feat: +1 Dexterity"), **HP maximum +1** ("Zabrak Toughness… not applied by SW5E"), Unarmed: damage die ("Zabrak Unarmed Combatant: 1d4, finesse").
  - Each tweak ≈ 8 actions. Keyboard works in the selects (type "Insight" + Enter), and the add row stays in place after each Add (good, no jumping). Enter in the Reason box does not add (had to click Add). Toast "Added a tweak: Intimidation Proficient. Not synced to SW5E yet."
  - The unarmed "damage die" value box is a number box: typing "1d4" became "14". Typing "4" worked → Unarmed Strike now "+1, 1d4 Kinetic, Strength". There is no tweak for "finesse"/"use Dexterity", so it's still +1 to hit (should be +5) and 1d4 with no +3. I left it (noted in Notes).
  WISH: the damage-die box should accept "1d4"/"d4" (or label it "die size: 4 = d4"). [confusing, low]
  WISH: species traits that change numbers (Toughness +1 HP/level, Unarmed Combatant 1d4 finesse) applied automatically like class features. A flat "+1 HP" tweak is wrong from level 2 on; I'll have to remember to edit it every level. [rules, high]
  WISH: proficiency from the Skills table / a "Choose class skills (2 of 8) / background skills (2 of 4)" picker that fills the reason itself — 5 skill tweaks with typed reasons took ~40 actions. [improvement, high]
  - Result: HP 14/14 (14 in green, underlined), Dex 17 (+3), Passive Perception 13, Insight/Perception +3, Persuasion/Intimidation +3, Piloting +2; Proficiencies → "Skills & saves" lists the 5 skills + Str/Con saves. All correct by my math.
- **Languages and tools**: no way to add Zabraki/Huttese or Tinker's implements/Sabacc deck in Proficiencies & Languages (Tool still reads "One type of gaming set"). Put them in Notes. [missing, medium] (same as other players' wish)
- **Starting equipment** (Equipment & Inventory → Add an item from SW5E): "explorer" → "No SW5E item matches." (no packs). Added free (Pay unticked): Backpack (Storage · 50 cr · 5 lb), Bedroll, Sabacc deck (Gaming Set), Clothes, common, Pouch, Field rations (one day's) ×10 (Utility · 5 cr · 1 lb), Glowrod ×2. Keyboard flow works and is fast: type → ↓ → Enter (pick) → Enter (add); Qty resets to 1 after each add. No custom item for the "trophy from a fallen enemy" → Notes.
- **Carrying capacity**: now "Carried 64 lb — Encumbered" (Encumbered at 40 lb, Str 8) but Speed stays 30 ft everywhere. If the table uses SW5E's variant encumbrance (speed −10 ft when over 5 × Str) the sheet should say so on Speed; if not, "Encumbered" is a scary word with no consequence.
  WISH: say what "Encumbered" means for me (speed −10 ft under the variant rule, or "only if your GM uses variant encumbrance"), and reflect it on Speed when it applies. [rules, low]
- **Personality & Appearance** → Edit: one form (alignment, traits, ideal, bond, flaw, gender, place of birth, age, height, weight, hair, eyes, skin, appearance), Done. Good.
- **Notes** → Edit → wrote what has no place on the sheet (tools, languages, pack, trophy, unarmed finesse, Weapon Expert damage advantage, Toughness reminder) + "## Session 1" heading. Markdown rendered.

## A4 — Cantina: Persuasion, then Insight with advantage
- Skills → clicked the Persuasion row → dice dock "Persuasion (CHA) Kadro Vos (Panel)", Disadvantage/Normal/Advantage, Add +d4…+d20, Modifier, "Roll +3" → d20 **1** → **4**, red "Natural 1" badge, "1 + 3 modifier". (The contact is not impressed.)
- Insight row → Advantage (two d20 boxes) → Roll +3 → **10** / 9 (struck) → **13**, "10 (advantage) + 3 modifier". Recent rolls list keeps both with times. Smooth, 3 clicks each.
- The open dice dock sits over the Equipment search's Qty/Add buttons (bottom right); my first click to close it missed because the dock had moved. Minor.

## A5 — Shopping at Kessa's Outfitters
- Equipment & Inventory → "medpac" → Medpac (Medical · 300 cr · 0.5 lb) + Champion/Exceptional/Fine/Improved/Superior. Qty 2 + Pay → "Pay 600 cr from credits — have 100 cr · standard price 300 cr each" → Add → red "**Not enough credits: 600 cr needed, 100 cr available.**" Nothing added. Clear.
- 20% off (2 × 240 = 480 cr) is still more than my 100 cr. Table ruling: I pay everything I have and owe Kessa the rest. Typed 100 in Pay → Add → **Credits 0 cr**, Medpac ×2 with Use. Any price works: good.
- Class item: **Grenade, fragmentation** (Explosive · 100 cr · 1 lb; 80 cr with the discount) added unpaid; I owe Kessa 380 + 80 = **460 cr** (Notes).
  - Search is a substring match: "fragmentation grenade" → "No SW5E item matches." (SW5E names it "Grenade, fragmentation"). WISH: word-order-free search ("frag gren"). [improvement, low]
  - **Keyboard gotcha**: the first suggestion is already highlighted, so ↓ + Enter picks the SECOND one. With "grenade, frag" I got "Grenade, Fragmentation (Average)" (an enhanced consumable, no price) instead of the plain grenade. With a single result (backpack, bedroll…) it didn't matter. WISH: ↓ from the search box should highlight the first item, or Enter alone should take the highlighted first item (it does — so ↓ shouldn't skip it). [bug, low]
  WISH: a "discount %" next to Pay, and a way to record money owed (debt to Kessa) instead of Notes. [improvement, medium] / [missing, low]

## A6 — Ambush at the docks
- **Initiative**: Combat & Vitals → clicked "+3" on the Initiative card → dock "Initiative" → Roll +3 → d20 7 + 3 = **10**.
- **Round 1 — attack**: Weapons & Attacks → Blaster rifle "+5" → "Blaster rifle attack" → Roll +5 → **natural 1** → 6 ("Natural 1" badge). Miss. The dock still offers a highlighted "**Hit: roll damage**" / "Critical damage" on a natural 1.
  WISH: on a natural 1 say "automatic miss" and don't highlight "Hit: roll damage". [improvement, low]
- **Round 1 — signature feature**: Sharpshooter Style's bonus-action mark on a thug >30 ft away. The sheet has no way to note it (no Start/state for the mark, nothing on the rifle about "opportunity attack if the marked target moves"). Said it at the table. [missing, low]
- **Took 6 kinetic**: Amount 6 → Damage → HP **8/14**, "Undo: Took 6 damage". 
  - My first try failed: the dice dock was open and the "6" I typed into Amount didn't land (Amount stayed empty) → red "Type the amount first, then press Damage." Closing the dock first fixed it. Happened twice (also with Heal 6 later). WISH (bug): typing in the tracker's Amount box while the dice dock is open loses the keystrokes. [bug, medium]
  - **That red error stayed in the top-right status after the successful damage** (and later "Type the amount first, then press Heal." stayed after a successful heal). The status line doesn't change on Damage/Heal success, so the last error/notice just sits there. WISH (bug): clear the error or replace it with "Took 6 damage → 8/14". [bug, medium]
  - Closing the dock by its × is unreliable: the dock is anchored to the bottom and changes height (roll result, recent rolls), so the × moves; twice my click landed on the page under it and **opened a roll for a skill I never wanted** (Lore, then Animal Handling). WISH: keep the dock's × in a fixed spot / don't let a click on the page under a just-closed dock start a roll. [bug, medium]
- **Round 2 — thug crit 13 kinetic**: Amount 13 → Damage → **HP 0/14**, red "0 HP: roll death saves", status "Down to 0 hit points: roll death saves (Death saves → Roll)." Massive-damage check correct (5 left over < 14).
  - **Zabrak Second Heart** ("When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead… until you finish a long rest") is not offered and has no counter. Workaround: Heal 1 → HP **1/14** ("Undo: Healed 1"); I'll remember it's used until a long rest (no counter → Notes).
  WISH: species features with uses get a counter like class features (Second Heart 1/long rest), and dropping to 0 offers "Use Second Heart: drop to 1 HP instead". [missing, high]
  - The status still said "Down to 0 hit points: roll death saves" after I was at 1 HP (and kept saying it for several actions). [same bug as above]
- **Round 2 — my turn**: Second Wind (bonus action, "regain hit points equal to 1d10 + your fighter level"). The tracker row "Second Wind 1/1 short rest" and the Class Features card only have −/+; **no Roll/Use that rolls 1d10+1 and heals**. Workaround: card "−" (→ 0/1), dock → typed "1d10+1" → Roll → 7 + 1 = **8**, then tracker Amount 8 → Heal → HP **9/14**. A typed roll has no "Heal 8" button.
  WISH: Second Wind (and other "regain 1dX + level" features) gets a Use button that spends the use, rolls the healing and offers Heal, like the medpac does. [missing, high]
  - Fighting Style card's "Your choices" box is still orange/empty although the picker below shows Sharpshooter Style 1/1 — looks like something is still missing. [confusing, low]
- **Round 2 — attack**: Blaster rifle → Roll +5 → 7 + 5 = **12** → GM: hit → "Hit: roll damage" → 1d8 **1** + 3 = 4 Energy. **Weapon Expert** (I'm proficient with blasters → "once per turn… choose to have advantage" on weapon damage): the damage roll has no Advantage option. I pressed "+d8" → 7 rolled, but the dock **adds** the dice: "1 + 7 + 3 damage bonus" = 11 ("amended"). The real result is max(1,7) + 3 = **10**; I did that in my head.
  WISH: advantage on damage rolls (roll the weapon dice twice, keep the higher) for Weapon Expert, offered on blasters/vibroweapons once per turn. [missing, medium]
  - (Shift-click on "+5" to roll straight away didn't do anything for me; a plain click + Roll worked.)
- **Round 3**: ally's medpac +6: Amount 6 → Heal → **HP 14/14**, "Undo: Healed 5 (of 6; at maximum)" — nice that it says how much was wasted.
  - Then **my own Medpac on myself** (script): Inventory → Medpac → Use → "On me / On someone else / Cancel" → On me → dock "Medpac: healing" 1d10 **1** + 3 Constitution modifier = 4, "At full hit points: nothing to heal." and the medpac was **consumed anyway** (2 → 1). No warning before spending a 300 cr item at full HP.
  WISH: when using a healing item at full HP, ask first ("You're at full HP — use it anyway?"). [improvement, medium]
  - Not concentrating, so no 4 damage / DC 10 Con save. After the fight nothing to end (no active effects).
- WISH (general): a round/turn tracker that resets "once per turn" things (Weapon Expert damage advantage) and per-turn reminders. [improvement, low]
- WISH: blaster shots per power cell (rifle "reload 12") aren't tracked: two shots fired, cells still 3. As a rifleman I want "shots left 10/12" and a Reload that uses a cell. [improvement, medium]

## A7 — Loot
- **150 credits**: credits box "+50 / −80" → typed "+150" + Enter → **150 cr** (immediately this time). Still owe Kessa 460 cr (Notes).
- **Strength Stim (Basic)**: "strength stim" → first suggestion pre-highlighted → Enter, Enter → added free ("Consumable · Standard", no price) under an "Enhanced Consumable" group with Use.
- **10 power cells**: "power cell" → Enter → Qty 10 → Add → merged into the existing stack: Power cell **13** (13 lb). Good.
- **Coded datapad**: typed "coded datapad with the smuggler's coordinates" → "No SW5E item matches."; Add → red "Choose an item from the S…" cut off under the empty suggestion box. **No custom item in the sheet.**
  - Workaround that WORKED: sw5e.com → Edit character → Equipment → CUSTOM ITEMS "+" → "Coded datapad (smuggler's coordinates)", 0.5 lb, description → ADD → CHARACTER SHEET (saves). Back in the viewer: **Load from SW5E** → ~10 s later "Custom items (2)": Insignia + **Coded datapad (smuggler's coordinates) custom 0.5 lb** came in, and **all my local changes survived** (150 cr, 13 power cells, medpac 1, Strength Stim, personality, tweaks). Very nice merge.
  - During that recalculation the summary briefly showed **HP 13/13 and Passive 11** (values without my tweaks) for ~5 s before going back to 14/14 and 13. Scary for a second. [confusing, low]
  WISH: add a custom item in the sheet itself (name, qty, weight, description) — the builder can do it, so the data format supports it. [missing, high]
  WISH (bug): the red "Choose an item from the S…" message is hidden under the "No SW5E item matches." box. [bug, low]
- I'd also bought a "Pouch" in A3, but the ↓ gotcha (see A5) had given me an **Ammo Pouch** (EC, 15 cr) instead — noticed only now in "Weapon Or Armor Accessory (1)". Removed it with × → "Remove?" confirm (two-step, good) → added Pouch with Enter, Enter. Items 18, 77 lb.

## A8 — Short rest
- HP was already 14/14 (ally medpac + my medpac), so no hit dice to spend. **Short rest** → status "Short rest: regained uses of Second Wind. To heal, roll hit dice ("roll d…" in the tracker)." Second Wind 0/1 → 1/1. Good, and it tells me what came back.
  - My first click on Short rest right after jumping to Combat & Vitals did nothing (the page was still scrolling); same with the first click on the Stealth row in A9. A second click worked. [bug, low]
- Hit die: the grey "roll d10 +3, then Heal" text is the button; clicking "then Heal" does nothing, only the "roll d10" words open "Hit die (d10) — Roll +3". Closed it without rolling (full HP). WISH: make it a real button "Roll d10+3". [confusing, medium]
- Zabrak Second Heart isn't on the tracker, so nothing tells me it's still spent until my long rest.

## A9 — Inspiration, used on Stealth
- "☆ Inspiration" → "★ Inspired" + green "Inspired" chip in the summary. One click.
- Skills → Stealth → dock "Stealth (DEX)" Normal/Advantage, **no "use Inspiration" option**; chose Advantage by hand → 3 / **12** → **15**. Then Combat & Vitals → "★ Inspired" again to spend it (→ "☆ Inspiration").
  WISH: when Inspired, offer "Use Inspiration (advantage)" in the roller and spend it in the same click. [improvement, medium]
  - Toggling Inspiration removed the "Undo: Short rest" button (only the last action is undoable). Fine.

## A10 — Long rest, 300 XP
- **Long rest** → "Long rest: done." (nothing to regain; HP full). It doesn't mention Second Heart coming back (not tracked).
- **XP**: Overview → Edit → "Experience points" (and Credits, "Type a number, or +50 / −80 to add or subtract.") → "+300" → Done → "300 XP · next level at 300 (0 to go)", full bar, and the chip "**You have unused levels. Click below to add more class levels.**" — but there's nothing below to click (builder wording). I grep'd the extension: no level-up or add-class code at all.
  WISH: a **Level up** flow in the extension, multiclass included — for me next session: Fighter 2 (HP 1d10 or 6 + Con + Toughness 1, Action Surge, Combat Superiority: 1 maneuver, 2d4), then **Operative 1 at level 3** (prerequisite Dex 13 check, the multiclass proficiencies an Operative grants, Sneak Attack, Operative's skill pick), then Fighter 3 (specialty + strategy). Until then the chip should say "Level up in sw5e.com's builder (Class → Number of levels / Add new class), then Load from SW5E". [missing, high] / [confusing, high]
- Notes → Edit → appended the session summary (debt to Kessa 460 cr, Second Heart used, loot, 300 XP and my level plan). Markdown renders.

## Praise (what not to break)
- Load from SW5E: numbers identical to the builder; and later **merging a custom item made in the builder into my locally-changed sheet kept every local change** (credits, inventory, tweaks, personality, notes).
- Builder custom items show up in the sheet with a "custom" tag.
- Fighting style picker with the full list, the style's text on click, and the "⚠ 2 chosen, 1 allowed" count check.
- Tweaks: keyboard-friendly selects, the add row stays put, reasons kept, changed numbers in green/underlined; HP 14 and Passive 13 updated right after a tweak.
- Dice dock: advantage with the struck die, natural 1 badge, "Hit: roll damage", "amended" tag when I added a die, recent rolls with times.
- Damage/Heal with Undo; "Healed 5 (of 6; at maximum)" tells me what was wasted; massive-damage rule.
- Medpac Use → On me / On someone else → rolls d10 + Con and heals in one go, decrements the stack.
- Buying: "Not enough credits: 600 cr needed, 100 cr available."; any price in Pay; Qty resets to 1 after each add; stacks merge (power cells 3 + 10 = 13); "Remove?" confirm on ×; type → Enter → Enter adds an item fast.
- Short rest says what came back ("regained uses of Second Wind").
- Personality form in one place; Notes with Markdown; XP "+300" arithmetic.

## Hand-off (end of part A)
- **Character**: **Kadro Vos (Panel)** — Zabrak Fighter 1, Soldier background (Weapon Expert feat), Chaotic Balanced. **sw5e.com id …**. Viewer: http://127.0.0.1:8765/ → select "Kadro Vos (Panel) — Zabrak Fighter 1".
- **Level 1, 300 XP** (level 2 reached; the sheet shows "You have unused levels…"). Plan: Fighter 2 → Operative 1 (level 3) → Fighter 3.
- **HP 14/14** (13 from SW5E + tweak +1 Zabrak Toughness), no temp HP, death saves clear, hit dice 1/1 d10, Second Wind 1/1, Inspiration off (spent on Stealth), exhaustion 0, no active effects. Second Heart: used in Session 1, back after the long rest (tracked nowhere).
- Abilities: Str 8, **Dex 17** (16 + tweak +1 Weapon Expert), Con 16, Int 10, Wis 13, Cha 12. **AC 15** (mesh armor, medium: 13 + Dex max 2), Init +3, Speed 30, Passive Perception 13, Prof +2. Blaster rifle +5 / 1d8+3 energy; Vibrorapier +5 / 1d8+3 kinetic; Unarmed +1 / 1d4 (should be +5 / 1d4+3 finesse — noted).
- **Fighting style**: Sharpshooter Style (picked in the sheet).
- **Tweaks (8, with reasons)**: proficient Persuasion (Coercive), Insight + Perception (Fighter), Intimidation + Piloting (Soldier); Dexterity score +1 (Weapon Expert); HP maximum +1 (Toughness — must become +2 at level 2, +3 at 3…); Unarmed damage die 4 (Unarmed Combatant).
- **Credits 150 cr**. **Owe Kessa 460 cr** (Notes only).
- **Inventory (18 rows, 77 lb — "Encumbered" at 40 lb)**: Blaster rifle (equipped), Vibrorapier (equipped), Light pistol, Vibrodagger, Mesh armor (equipped), Power cell ×13, **Medpac ×1** (one used at full HP), **Grenade, fragmentation ×1**, **Strength Stim (Basic) ×1**, Clothes common, Sabacc deck, Backpack, Pouch, Bedroll, Field rations ×10, Glowrod ×2, custom: Insignia of rank (Sergeant), **Coded datapad (smuggler's coordinates)** (custom item added on sw5e.com, came in through Load from SW5E).
- **Not in the sheet** (Notes only): tools (Tinker's implements, Sabacc deck proficiency), languages (Zabraki, Huttese), trophy, debt to Kessa, Second Heart use, Weapon Expert damage advantage, unarmed finesse.
- **sw5e.com's copy** differs: it has HP 13, Dex 16, no skills, 100 cr, the starting gear + 2 custom items, no personality/notes/tweaks, XP 0. The sheet says "Differs from sw5e.com's copy… Sync to SW5E". I did NOT sync. For part B: levelling happens in sw5e.com's builder; check after Load from SW5E that the local tweaks/inventory/notes/credits/XP survive and that the HP tweak gets bumped for Toughness.
- Browser: closed my two tabs (the sw5e.com tab and the viewer tab).
