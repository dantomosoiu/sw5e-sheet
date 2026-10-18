# Mira — Part A log (Consular, desktop sheet http://127.0.0.1:8765/)

Player: Mira. Long-time D&D 5e player, new to SW5E. Lives in powers, force points and concentration; hates re-typing anything.

## Setup
- Read brief.md and README.md (skimmed as a player).

## A1 — Create the character on sw5e.com
- Opened https://sw5e.com/tools/mycharacters, round "+" opens a speed-dial (download / +), "+" opens CHARACTER BUILDER (BETA): Species → Class → Ability Scores → Description → Equipment.
- Species: dropdown is a long lazy-loaded list (Bith … Mon Calamari visible first, no type-to-search). Picked **Kel Dor** (Wis +2, Dex +1, darkvision, necrotic resistance, telepathy 30 ft, Foreign Biology). Full species text shown under the select: good.
- Class: "Add new class" dialog → Consular → Add class. Consular 1: hit points "6" (fixed select), features Force Recovery, Forcecasting; "Force Powers 0 / 9 Known" + CHOOSE FORCE POWERS.
- Force powers dialog: filter by level (0 or 1) and alignment; each power expands to its text (good). BUT ticking a power moves it to the top of the list and the list re-renders under the cursor: my 3rd and 4th clicks hit the wrong rows ("Force Shunt" got ticked instead of Force Push/Pull, Mind Trick missed). Fixed by unticking (via script). 
  WISH (builder, for the extension): power picker that does not reorder under the cursor; with a "chosen" list kept apart. [improvement, medium]
- Picked 9 powers: at-will Guidance, Turbulence, Force Push/Pull, Mind Trick, Spare the Dying; 1st level Heal, Heroism (concentration), Force Propel (prereq Force Push/Pull), Cloud Mind. The builder shows prerequisites inline ("Force PropelPrerequisite: Force Push/Pull" — label run together).
- The builder never tells me what my force points will be, or my casting ability (Wis vs Cha by alignment) while picking powers. As a D&D player I wanted "you'll cast light side with Wisdom, universal with the higher of Wis/Cha".
  WISH: when choosing powers, show casting ability per alignment and the resulting attack/DC + force points. [improvement, low]
- Ability scores: default method is standard array dropdowns ("Choose a method by clicking the ⚙ icon above"). Six dropdowns, each removes used values; picked Str 8, Dex 14, Con 13, Int 10, Wis 15, Cha 12. The step never shows species bonuses or the final scores/modifiers (Kel Dor +2 Wis +1 Dex), so I can't see I end up with Wis 17/18 until the sheet.
  WISH (builder, for the extension): ability step showing base + species + feat = final score and modifier live. [improvement, medium]
- Description: Name "Thirza Vitchess (Panel)", alignment Lawful Balanced, background **Force Adept**. Background details dialog: skills "Choose two from Deception, Insight, Perception, and Persuasion", tools "Two of your choice of artisan's implements, gaming sets, or musical instruments", equipment "common clothes, a sturdy knife, and a belt pouch containing 150 cr", background feat d8 list. Feat dropdown shows names only; text appears after picking. Picked **Empathic** (+1 Wis, Insight proficiency or expertise, action insight vs Deception).
- The builder never asked me to choose the background's 2 skills or 2 tools, nor the Consular's class skills. No step for them at all.
  WISH (builder gap → extension): skill/tool proficiency choices for class and background at creation (with the allowed lists). [missing, high] — will check what the sheet shows in A2.
- Equipment step: "CREDITS: 0", nothing from the class or background is offered (no starting package, no 150 cr from Force Adept). Set credits to 150 via Adjust Credits (Add 150, Apply). Added Vibrostaff (cost 100, weight 4, Equipped) via Add Equipment search — credits not deducted (fine for starting gear, but no way to say "starting equipment" vs "bought").
  WISH (builder gap → extension): starting equipment packages (class + background options a/b) or starting wealth roll, applied in one go. [missing, medium]
- Personality left blank on purpose (A3 will do it in the sheet).
- CHARACTER SHEET (sw5e.com): saved as "Thirza Vitchess (Panel)", **id …** ("Kel Dor Consular 1"). Builder numbers: HP 7/7, AC 12, Init +2, Prof +2, Speed 30, Passive Perception 13; Str 8 / Dex 15 / Con 13 / Int 10 / **Wis 17** / Cha 12; saves Wis +5, Cha +3 (proficient), others = mod; Force points 7 boxes; Max power level 1st; "Light attack modifier +5", "Light save DC 13"; Vibrostaff +1, 1d6-1 kinetic, Versatile (2d4); Unarmed strike +1, 0 kinetic.
- BUG (sw5e.com engine): Empathic's "+1 Wisdom" is not applied (Wis 17 = 15 + 2 species, should be 18) and its Insight proficiency isn't applied (Insight +3, not proficient). Feature "EMPATHIC" is listed.
  WISH (rules, extension): apply a background feat's fixed ability increase and skill proficiency (Empathic: +1 Wis, Insight) like class features do — or at least flag it. [rules, high] — check in A2 whether the sheet fixes it.
- Skills: no proficient skill at all. The only way on sw5e.com is clicking a skill → "Tweak Athletics" dialog (Bonus / Override / Proficiency Level). Consular rules page: "Skills: Choose two from Deception, Insight, Intimidation, Investigation, Lore, Medicine, and Persuasion"; equipment "(a) a simple lightweapon or (b) a simple vibroweapon; (a) a scholar's pack, (b) an explorer's pack, or (c) a diplomat's pack"; variant wealth 5d4 x 100 cr. Plan: Lore + Medicine (class), Perception + Persuasion (background), Insight (Empathic). I'll set them in the sheet (A3) rather than as sw5e.com tweaks, to test the extension.

## A2 — Bring it into the sheet (desktop)
- Opened http://127.0.0.1:8765/ (it showed "Consular Test (local)" — not mine, didn't touch). Pressed **Load from SW5E**: "Opening sw5e.com in a background tab…", ~5 s later the sheet switched to **Thirza Vitchess (Panel)** by itself ("Recalculated with your changes"). It picked the right character without asking (my sw5e tab was on the Consular rules page, so I guess it took the most recently changed one). Nice, but a bit magic: I didn't choose.
  WISH: when loading from SW5E, show which character will be loaded / let me pick from my sw5e.com list (with 5 players on one account I could have got someone else's). [confusing, medium]
- Numbers vs builder: all match. AC 12 Unarmored, HP 7/7, Init +2, Speed 30 ft, Prof +2, Passive Perception 13, Hit dice 1/1d6 ("+1 per die spent (Con)"), Wis 17 (+3; "base 15 · +2 from species/ASIs/feats/tweaks"), Dex 15 ("base 14 · +1"), saves Wis +5 / Cha +3, Vibrostaff +1 1d6−1 kinetic Versatile (2d4), Unarmed Strike +1 / 0. Force casting: points 7/7, max power level 1, Light DC 13 / attack +5, Dark DC 11 / +3, Universal DC 13 / +5 (good: the sheet shows all three, which the builder doesn't). 9/9 powers with full text, save DC per power ("Wisdom save DC 13" on Mind Trick), Concentration tag, "1st level · 2 points" + Cast. Force Recovery counter 1/1 (long rest). Class table now/next rows. 
- BUG/rules: the Empathic feat card is shown under FEATS (with a "+ Wisdom" tag!) but its +1 Wisdom and Insight proficiency are NOT applied: Wis still 17, Insight +3 "—". Feature text: "Increase your Wisdom score by 1, to a maximum of 20. You gain proficiency in the Insight skill."
  (Same wish as in A1: apply a feat's fixed ASI and granted skill proficiency automatically — confirmed the sheet doesn't fix it either.)
- WISH (bug): Kel Dor languages: species trait says "Galactic Basic and Kel Dor", Proficiencies & Languages lists only "Galactic Basic". [bug, low]
- Vision card says "Normal" though Kel Dor has Darkvision 60 ft; necrotic resistance (Life in the Void) — checking below.
- Background card lists "Skill proficiencies: Choose two from Deception, Insight, Perception, and Persuasion" and "Tool proficiencies: Two of your choice…" as plain text; Proficiencies → Tool shows the raw sentence "Two of your choice of artisan's implements, gaming sets, or musical instruments" as if it were a tool. No picker for either, and no class skill picker.
  (Same wish as in A1, now for the extension: pickers for the class's 2 skills (from the class list), the background's 2 skills and 2 tools, applied as proficiencies like the fighting-style pickers.)
- Combat & Vitals → Effects "FROM CLASS FEATURES (1)": Consular weapon proficiencies (simple lightweapons, simple vibroweapons). Nothing from the species.
- BUG: Kel Dor's species defenses/senses are not listed anywhere: no "Resistance to necrotic damage" (Life in the Void) and Vision says "Normal" instead of Darkvision 60 ft. (Read the code to check my suspicion: classes.js skips a whole trait when its text has "while …" — Life in the Void says "and while exposed to the vacuum of space…"; the darkvision regex needs "darkvision … 60 feet" in one sentence, Kel Dor's text says "you can see in dim light within 60 feet".) [bug, medium]
  WISH: species senses and resistances always shown (Darkvision 60 ft; Resistance: necrotic) so I don't forget them mid-fight. [bug, medium]

## A3 — Set up in the sheet
- Class choices at level 1: Consular has none besides powers (archetype select shows "— none —" + the 12 Ways, Force-Empowered Castings 0/0 at level 1). Powers already chosen in the builder; the sheet's picker shows the same 9/9 with "×" to remove and "Learn a force power…" with prerequisites ("Force Propel … (needs …)"). Good.
- Skills: used **Settings, Tweaks & Data → Add a tweak to…** five times: Lore + Medicine "proficient" (reason "Consular class skill (chosen at 1st level)"), Perception + Persuasion "proficient" ("Force Adept background skill"), Insight "proficient" ("Empathic feat … not applied by SW5E"), and **Wisdom score add 1** ("Empathic feat: +1 Wisdom, not applied by SW5E"). Each = 2 selects + reason + Add (≈5 actions × 6). Result: Wis 18 (+4), Passive Perception 16, Force points 8/8, Proficiencies → Skills & saves "Lore, Insight, Medicine, Perception, Persuasion, Wisdom/Charisma Saving Throws". Works and keeps my reasons.
  - Pressing Enter in the tweak's Reason box does not add the tweak; I had to click Add. WISH: Enter adds the tweak. [improvement, low]
  - The tweak list is not in the order I added them nor alphabetical (Wisdom score sits between Insight and Persuasion).
  WISH: skill proficiency from the Skills table itself (tick the proficiency dot / a "choose class skills (2 of 7)" picker) instead of 6 tweaks with typed reasons; the reason should be filled in by the source ("Consular skill", "Force Adept skill"). [improvement, high — same root as the missing-picker wish]
- Tools & languages: Proficiencies & Languages has no way to add a tool or a language (legend says "✎ = custom proficiency added on the character" but there is no add button). Tool row still reads "Two of your choice of artisan's implements, gaming sets, or musical instruments". Couldn't record my 2 tools (I wanted a gaming set: dice "Chance cubes" + a musical instrument) or the Kel Dor language.
  WISH: add custom proficiencies (tools, languages) in the sheet, and replace the background's "Two of your choice…" sentence with a picker. [missing, medium]
- Starting equipment (Equipment & Inventory → Add an item from SW5E; free unless Pay is ticked): Backpack (Storage, 50 cr, 5 lb), Clothes, common (5 cr, 3 lb), Vibroknife (for the "sturdy knife"; 1d4 kinetic, finesse, light, piercing 1; 1 lb; 225 cr), Pouch. Credits stayed 150. Search-as-you-type with category + price/weight preview + "Pay … cr from credits (have 150 cr · standard price 50 cr each)" is good. A tooltip says "AC, attacks and other numbers update when SW5E recalculates with your changes."
  - "Diplomat's pack" (Consular starting option c) does not exist in the list ("No SW5E item matches." for "diplomat"; "pack" lists Backpack, Jetpack, cybernetic packages…). No custom item option either.
  WISH: starting packs (Diplomat's/Scholar's/Explorer's pack) addable — as a pack that unpacks into its contents — or at least a free-text custom item. [missing, medium]
- Personality & Appearance → Edit: alignment select + traits/ideal/bond/flaw/gender/place of birth/age/height/weight/hair/eyes/skin/appearance in one form, "Markdown works here. Changes stay in this browser until you save them to SW5E." Filled them, Done. Nice single form.
  WISH: offer the background's "Suggested characteristics" d8 tables (Force Adept has them) as pick-or-roll for traits/ideal/bond/flaw. [improvement, low]
- Notes → Edit: wrote what has no place on the sheet (tools Chance cubes + Ommni box, Kel Dor language, Diplomat's pack) and a "Session 1" heading. Markdown rendered (bold, list). Good.
- Check after setup: Insight +6 / Medicine +6 / Perception +6 (passive 16) / Lore +2 / Persuasion +3 (all "Proficient"); Force casting Light DC 14 attack +6, Universal DC 14 +6, Dark DC 11 +3; FP 8/8. All correct for Wis 18.
- Each change shows "Opening sw5e.com in a background tab…" then "Recalculated with your changes · hh:mm:ss" top-right: fine, quick (2–5 s).

## A4 — Cantina: Persuasion, then Insight with advantage
- As a 5e player I cast **Guidance** on myself first (Force Casting → Guidance → Cast): toast "Cast Guidance. Concentrating.", a "Guidance (concentration)" chip under the summary, Effects → Temporary "Guidance (concentration) cast, lasts up to 1 minute, since Sat 12:28 · Concentrating on Guidance" with End. At-will cast cost 0 FP (correct). 
- Clicked the Persuasion row → dice dock "Persuasion (CHA) Thirza Vitchess (Panel)", Normal, "Roll +3". The active Guidance was NOT offered (no "with Guidance +d4"); I added +d4 by hand. Rolled: d20 **18** + d4 **4** + 3 = **25**. Breakdown text reads "18 4 + 3 modifier" (no plus between the dice).
  WISH: an active Guidance (or any "add a d4 to one ability check" power like Battle Insight) is offered in the roller for ability checks and ends itself once used ("Once before the power ends… The power then ends."). [improvement, medium]
  WISH: breakdown "18 + 4 (d4) + 3" instead of "18 4 + 3 modifier". [confusing, low]
- Insight row → Advantage (two d20 shown) → Roll +6: **18** / 4 (struck) → **24**. Smooth; recent rolls list kept both.
- Ended Guidance by hand: Combat & Vitals → Effects → End ("Guidance (concentration) has ended."). The summary chip "Guidance (concentration)" is not clickable on desktop (on phone the strip chip jumps to Effects).
  - The sidebar jump scrolls smoothly; my first click on End landed while the page was still moving (screenshot showed End where it no longer was). Minor.
  WISH: the concentration chip in the summary is clickable on desktop too (jump to Effects / End). [improvement, low]

## A5 — Shopping at Kessa's Outfitters
- Equipment & Inventory → search "medpac": Medpac (Medical) + Champion/Exceptional/Fine/Improved/Superior variants. **Medpac: Medical · 300 cr · 0.5 lb**; "Pay [300] cr from credits — have 150 cr · standard price 300 cr each". Qty 2 + Pay ticked → Pay updates to 600 (total, good). Add → red "Not enough credits: 600 cr needed, 150 cr available." Clear, and nothing was added. 
- Class item: "Focus generator" (Data Recording And Storage · 200 cr · 1 lb, "A focus generator is a handheld object used to help forcecasters learn to focus on their powers.").
- 20% off: 2 × 240 + 160 = 640 cr; I have 150. Even discounted I can't pay. Table workaround: paid all 150 cr for the medpacs (typed 150 in Pay; "any price" works → Credits 0 cr, Medpac ×2 with a Use button), added the focus generator unpaid, and wrote "Owe Kessa 490 cr" in Notes.
  WISH: a way to record a debt / IOU (credits owed to an NPC), or let credits go negative with a warning instead of blocking, so the shop scene doesn't need a Notes workaround. [missing, low]
  WISH: when the purchase is blocked, offer "pay what you have (150) / apply a discount %" right there — at the table I had to work the 20% out myself. A discount % box next to Pay. [improvement, medium]
- Qty 2 and the ticked Pay carried over from the medpac to the next item I picked (focus generator showed "Pay 400"). Easy to buy two by accident. 
  WISH: reset qty/Pay when a different item is chosen. [bug, low]
- The inventory row's Cost shows the list price (Medpac 300 cr) — not what I paid (75 each). Fine, but a "paid" note would help selling later. No "sell" action exists (× just removes).
  WISH: Sell (remove + add credits at a price I choose, default half). [missing, low]
- Focus generator has no Equip/"use as focus" control, so I can't mark it as my focus (it gives no bonus anyway).

## A6 — Ambush at the docks
- **Initiative**: Combat & Vitals → shift-click the Initiative +2 card: d20 **8** + 2 = **10**. Shift-click rolled straight away, but it also made a blue text selection across the stat cards (browser shift-click selection).
  WISH: suppress text selection on shift-click roll targets. [bug, low]
- **Round 1 — attack**: Weapons & Attacks → Vibrostaff "+1" → dock "Vibrostaff attack" → Roll +1: d20 **9** + 1 = **10**, buttons "Hit: roll damage" / "Critical damage" / Critical: Double dice | Max + roll. Hit (GM) → damage d6 **1** − 1 = **0 Kinetic** ("1 – 1 damage bonus").
  - Vibrostaff is Versatile (2d4) but the damage roll only offers the one-handed 1d6; no "two-handed" choice. I fight two-handed with a staff. WISH: versatile weapons offer one-/two-handed damage in the roller. [missing, medium]
  - WISH (rules): is 0 damage on a hit right in SW5E (Str 8 → −1)? I'd expect at least 1 on a hit at many tables; the sheet shows 0 without comment. [rules, low]
  - Only equipped weapons appear in Weapons & Attacks (my unequipped Vibroknife is missing there; must Equip it in inventory first). Fine but surprised me.
- **Round 1 — power**: Force Casting → Heroism → "1st level · 2 points" + Cast → "Cast Heroism at 1st level (2 force points). Concentrating." FP 8 → 6, chip "Heroism (concentration)", Effects → Temporary "Heroism (concentration) cast, lasts up to 1 minute, since Sat 12:34 · Concentrating on Heroism." (Note: I let the script's round have attack + power.)
  - Cast didn't ask who the target is (touch, self or ally). The Heroism effect doesn't mention its benefits (immune to frightened, temp HP = 4 at the start of each of my turns) and never gives the temp HP. WISH: a power cast on myself applies its listed benefits (Heroism: "+4 temp HP at the start of your turn" reminder or one-click, frightened immunity in defenses); ask self/other on cast. [improvement, medium]
- **Took 6 kinetic damage**: Amount 6 → Damage → HP **1/7**, "Undo: Took 6 damage" button appeared, "Differs from sw5e.com's copy. Use SW5E's values · Sync to SW5E".
  - **No concentration check prompt** although I'm concentrating on Heroism. 5e/SW5E: taking damage while concentrating → Con save DC 10 or half the damage. I rolled it myself: Abilities → CON Saving throw (shift-click) → d20 **20** + 1 = **21** ("Natural 20" badge). Held.
  WISH: when I take damage while concentrating, the sheet offers "Concentration save DC 10 (Con +1)" in the dock, and ends the power on a failure. [missing, high]
  - The damage box has no damage type, so my Kel Dor necrotic resistance (and later poison etc.) can't apply. WISH: damage type on Damage (halve on resistance, 0 on immunity, with a note). [improvement, medium]
- **Round 2**: start of my turn, Heroism's temp HP by hand: Amount 4 → Temp HP → "Temp HP 4" (summary "1/7 +4"). Thug crit **13 kinetic** → Damage: temp HP absorbed 4, HP **0/7**, red toast "**Three failed death saves (damage at least your hit point maximum kills outright).**", death saves ✗✗✗, summary chip "Death saves 0✓ 3✗". Rules-wise correct (13 − 4 temp = 9; 1 HP → 0 with 8 left ≥ max 7 = massive damage). A 7-HP d6 caster can't survive this script.
  - GM ruling (script: "If you drop to 0, make death saves"): not dead. Workaround: clicked the three red death-save circles one by one to clear them (each click removes one). Doing that wiped the "Undo: Took 13 damage" button.
  - Even with ✗✗✗ the HP card kept saying "0 HP: roll death saves" — contradictory; a dead character should say so (and maybe offer "GM says no: drop to 0 instead").
  WISH: when massive damage kills outright, say "Dead (massive damage)" on the HP card and offer "Just drop to 0 (GM ruling)" in the toast, rather than me clearing circles by hand and losing Undo. [improvement, medium]
  - WISH (bug): dropping to 0 HP did not end **Heroism (concentration)** (still in Effects and the summary chip). At 0 HP you're unconscious and concentration ends. Ended it by hand (Effects → End → "Heroism (concentration) has ended."). [bug, high]
  - Conditions still "None active (from SW5E)" at 0 HP; I expected Unconscious (and prone). WISH: 0 HP sets Unconscious until healed. [missing, medium]
- **Death save**: Play tracker Roll → dock "Death saving throw" → d20 **7** → "Record a failure" → ✗ 1, "Undo: Death save: a failure". One-click recording: nice.
- **Round 3**: ally's medpac: Amount 6 → Heal → HP **6/7**, death saves cleared, "Undo: Healed 6". (Toast top-right still said "Death saves: 0 ✓, 1 ✗." after the heal — stale message.) WISH: after healing from 0, the toast says "Healed 6 — conscious, death saves reset" instead of the stale death-save count. [bug, low] 
  - Then my own medpac: Inventory → Medpac → Use → "On me" / "On someone else" / Cancel → On me → dock "Medpac: healing" d6 **4** + 1 Constitution modifier = **5** with "Heal 5" → "✓ Healed 1 (of 5; at maximum)". HP **7/7**, Medpac qty 2 → 1, weight updated. Very smooth.
  - Not concentrating any more (Heroism ended at 0 HP), so the script's "4 damage + DC 10 Con save" didn't apply. (Concentration-on-damage prompt already logged as missing in round 1.)
- After the fight: nothing active to end; FP 6/8.
- WISH (Mira's general fight wish): a small **round/turn counter** or "start of my turn" button that applies per-turn things (Heroism temp HP, effect durations in rounds: "lasts up to 1 minute" = 10 rounds). Today durations show wall-clock "since Sat 12:34", which means nothing in combat. [improvement, medium]

## A7 — Loot
- **150 credits**: credits box "+150" + Enter → Credits 0 → **150 cr** (took ~2 s to show; for a moment it still said 0 cr and the box was empty, I almost typed it again).
  WISH: show the new total immediately (or a toast "+150 cr → 150 cr"). [improvement, low]
- **Strength Stim (Basic)**: search → "Strength Stim (Basic) Consumable · Standard", Pay 0 (no price in the list), Add → new group "Enhanced: Consumable" with Use; weight "—", cost "—". Description: "As an action, you can administer this stimpac to a creature within 5 feet… Strength score increases by 2, to a maximum of 20. This effect lasts for 1 hour."
- **"coded datapad with the smuggler's coordinates"**: typed the name → "No SW5E item matches."; Add → red "Choose an item from the S… [list]" (partly hidden under the empty suggestion box). **No custom/free-text item.** Workaround: added SW5E's generic "Datapad" (Data Recording And Storage · 100 cr · 0.5 lb, free) and wrote in Notes that it is the coded datapad. Items can't be renamed or given a note either.
  WISH: add a custom item (name, qty, weight, description/notes, no rules), and let any inventory item carry a personal name/note ("Datapad — smuggler's coordinates"). [missing, high]
  - WISH (bug): the red validation text is overlapped by the "No SW5E item matches." dropdown. [bug, low]
- No blaster → no power cells.
- Notes updated (Done) with the fight summary and the datapad explanation.

## A8 — Short rest
- HP was already 7/7 (medpacs), so spending a hit die would waste it; I didn't. Pressed **Short rest**: toast "Nothing to regain on a short rest. To heal, roll hit dice ("roll d…" in the tracker)."
- **Force Recovery not offered.** Consular 1st level: "When you finish a short rest, you can regain a number of force points equal to half your consular level + your Wisdom or Charisma modifier (your choice, minimum of one). Once you've used this feature, you must complete a long rest before you can use it again." I was at FP 6/8 — this is exactly the moment for it, and the sheet said "Nothing to regain". Workaround: Force Recovery "−" (1/1 → 0/1), then Force points "+" twice (6 → 8) — the counter doesn't give FP by itself. Rules note: half of level 1 = 0 (round down) + Wis 4 = 4 FP, capped at max 8.
  WISH: on Short rest, offer "Use Force Recovery: regain 4 force points (0 + Wis 4)" (and Tech/other short-rest recoveries); spending the counter alone should add the FP. [missing, high]
- Hit die roll: the "roll d6 +1, then Heal" hint next to "Hit dice (d6)" is the button, but it looks like grey helper text; my first two clicks (on the label and just right of the text) did nothing; only a click right on the small "roll d6 +1" words opened "Hit die (d6)" in the dock. Closed it without rolling (full HP).
  WISH: make the hit-die roll a real-looking button (e.g. "Roll d6+1") with a bigger target. [confusing, medium]

## A9 — Inspiration, used on Stealth
- Play tracker "☆ Inspiration" → "★ Inspired" (green), chip "Inspired" in the summary. One click: good.
- Stealth row → dock "Stealth (DEX)", Normal, Roll +2. **The roller doesn't know I'm inspired** (no "use Inspiration" option). Chose Advantage by hand → **11** / **16** → 16 + 2 = **18**. Inspiration stayed on; went back to Combat & Vitals and clicked "★ Inspired" to spend it (→ "☆ Inspiration").
  WISH: when Inspired, the roller offers "Use Inspiration (advantage)" on d20 rolls and spends it in the same click. [improvement, medium]

## A10 — Long rest, 300 XP
- **Long rest**: toast "Long rest: regained uses of Force Recovery." FP 8/8, Force Recovery 1/1, HP 7/7, hit dice 1/1; "Undo: Long rest". Good.
- **XP**: Overview → Edit → "Experience points" + "Credits" form ("Type a number, or +50 / −80 to add or subtract.") → typed **+300** → Done → "300 XP · next level at 300 (0 to go)", bar full. After the recalculation a chip appeared: "**You have unused levels. Click below to add more class levels.**" — but there is nothing below to click in the sheet (this is sw5e.com builder wording; Classes & Progression has no level control, only the "Next (2nd)" table row).
  WISH: replace that chip with what to do here: a **Level up** button (the owner's direction), or at least "Level up in sw5e.com's builder (Class step → Number of levels in the class), then Load from SW5E". [confusing, high]
  WISH (for part B, noted now): level-up flow in the extension — HP (roll or fixed 4+Con for a d6), new powers known 9 → 11, Force-Empowered Casting picks at 2nd, archetype at 3rd. [missing, high]
- Everything from this session is only in the viewer: Play tracker shows "Differs from sw5e.com's copy. Use SW5E's values · Sync to SW5E". I did NOT sync (not part of A).

## Praise (what not to break)
- Load from SW5E found and loaded my new character in ~5 s, numbers identical to the builder.
- Force Casting card: Light/Dark/Universal DC + attack side by side; each power's save DC, concentration tag, points cost and Cast button; prerequisites shown in the picker.
- Cast → FP spent + concentration chip + Effects entry with End; a new concentration power would replace the old one (README).
- Dice dock: advantage/disadvantage with struck die, recent rolls per character, attack → "Hit: roll damage" / "Critical damage", "Natural 20" badge, death save → "Record a failure" in one click.
- Medpac "Use → On me" rolls the healing and heals in one click, reports "Healed 1 (of 5; at maximum)", decrements the stack.
- Damage/Heal/Temp HP with Undo of the last action; temp HP absorbed first; massive-damage rule known.
- Buying: price preview, "Pay … from credits" with any price, clear "Not enough credits: 600 cr needed, 150 cr available."
- Tweaks with reasons, underlined numbers, and the hover tooltip "Without tweaks or effects 3 → now 4 · +1 Wisdom score · Empathic feat: +1 Wisdom, not applied by SW5E · Tweak (not synced to SW5E yet)". Exactly what I want to see.
- Personality form in one place; Notes with Markdown.
- Long rest summary toast; XP "+300" arithmetic in the edit box.

## Hand-off (end of part A)
- **Character**: Thirza Vitchess (Panel) — Kel Dor Consular 1, Force Adept background (Empathic feat), Lawful Balanced. **sw5e.com id …**. Viewer: http://127.0.0.1:8765/ (select "Thirza Vitchess (Panel) — Kel Dor Consular 1").
- **Level 1, 300 XP** (level 2 reached by XP; sheet shows "You have unused levels…").
- **HP 7/7**, no temp HP, death saves clear, hit dice 1/1 d6, **FP 8/8**, Force Recovery 1/1, Inspiration spent (off), exhaustion 0, no active effects/concentration.
- Abilities: Str 8, Dex 15, Con 13, Int 10, **Wis 18** (17 from SW5E + tweak "+1 Empathic"), Cha 12. AC 12, Init +2, Passive Perception 16. Force: Light/Universal DC 14 attack +6, Dark DC 11 +3.
- **Tweaks (6, reasons kept)**: proficient Lore, Medicine (Consular skills), Perception, Persuasion (Force Adept), Insight (Empathic), Wisdom score +1 (Empathic).
- **Powers (9/9)**: at-will Guidance, Turbulence, Spare the Dying, Force Push/Pull, Mind Trick; 1st Heal, Heroism, Force Propel, Cloud Mind.
- **Credits 150 cr**. Owe Kessa 490 cr (Notes only).
- **Inventory (9 items)**: Vibrostaff (equipped), Vibroknife, Clothes common, Focus generator, **Datapad (= the coded datapad with the smuggler's coordinates, explained in Notes)**, **Strength Stim (Basic) ×1**, **Medpac ×1** (one used on myself), Backpack, Pouch. Weight 16 lb.
- **Not in the sheet** (in Notes only): tool proficiencies (Chance cubes, Ommni box), Kel Dor language, Diplomat's pack, the datapad's real name, the debt to Kessa; Kel Dor darkvision 60 ft and necrotic resistance aren't shown either.
- **Not synced to sw5e.com**: the sw5e.com copy is still the fresh level-1 build (no skills, Wis 17, 150 cr, Vibrostaff only, no personality/notes). The sheet says "Differs from sw5e.com's copy". Part B: if levelling on sw5e.com, Load from SW5E should keep the viewer's values ("your own values win") — check that inventory, notes, tweaks and play state survive.
- Closed all my tabs (viewer, sw5e.com, and the blank tab from tabs_context createIfEmpty). The extension's own background sw5e.com tab wasn't in my group.
