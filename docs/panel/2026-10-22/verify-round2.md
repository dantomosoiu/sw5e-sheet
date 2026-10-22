# Verification round 2: what round 1 didn't mark fixed (main a82315b)

Scope: the findings that verify-classes.md and verify-feats-species-items.md marked "partly" (41), and the items in their
"New problems seen" sections (27). Checked on main (a82315b) with `node dev/bump-check.js`, the scratchpad's
state-check.js (to start states) and vfsi-eval.js (for the full "Still to choose" list and single rolls), one node
process at a time. I used the decisions current at a82315b: tweaks are "set to" (fixed, effects not applied),
"bump to", or "add"; feature cards show the picks made in Classes & Progression.
Format: `n · verdict · evidence (before → after)`.
(While I worked, someone else left uncommitted changes in app/roller.js (dice dock: plain d20 rolls, tumbling),
info.css, themes.css and viewer.css. None of the roller.js hunks touch the readers, options or roll building used here
(they start at buildRoll's 'dice' case for a bare d20), so the results stand for a82315b.)

Totals: findings: 31 fixed, 10 partly, 0 not fixed, 0 can't check. Earlier new problems: 19 fixed, 3 partly,
5 not fixed.

## Findings (classes, 61-147)

72 · fixed · Path of Ethereality: no permanent "Speeds: Flying speed" any more; the card has [Start Out of Touch], and when started it shows "Speeds Flying speed equal to walking speed" and "30 ft · now 60 ft (doubled: Out of Touch)" for 1 minute. Inquisitor 11: the "Advantage on saving throws against force powers they cast" row is gone (the advantage is only in the feature's text, under its quarry condition)
73 · fixed · Vow of the Sentry + Combat suit: Martial Arts is kept (the "- Unarmed Strike +3 / 1 Kinetic" lines are gone, speed stays 45 ft). Crimson Order + Combat suit: no change from the baseline (Martial Arts and Unarmored Movement kept). With a Light physical shield added, both are dropped (`speed.base 45 → 30 ft`, "- effect: Martial Arts"), as the text says
76 · fixed · Crimson Order Monk 17, Sovereign Protector started: "60 ft → 60 ft · now 120 ft (doubled: Sovereign Protector)"; also `armorClass 16 → 18`, DEX save "mode adv"
78 · fixed · Unnatural Weaponry (INT 18): `Unarmed Strike attack: d20 +3 → +6`, `damage: no dice +2 → d4 +4 · = +4 INT modifier (Unnatural Weaponry)`, table `| +6 | 1d4+4 Kinetic | Intelligence (Unnatural Weaponry) |`
79 · fixed · sent9 Path of Iron, WIS 20, Combat suit: `armorClass 13 → 16`, hover "+2 AC: WIS/CHA instead of DEX · Physical Conditioning"; with the note 'Charisma' (CHA lower): 14 (DEX kept)
85 · partly · Vow of Serenity still changes nothing: Monk 17 shows "Focus short rest 17 / 17" with WIS 16 (expected 18) and with WIS 20 (expected 19). Nothing in 54ca393..a82315b addresses it
91 · fixed · Silver Tongue: the card has "Languages 0 / 2 … [Choose a language… ▾]"; Still to choose lists "Silver Tongue: languages (2 more)" and "Silver Tongue: skill proficiency"
100 · partly · Mutagenic Analysis is still offered nowhere. Scholar 3 and Scholar 6 Geneticist: every `save|…` roll is unchanged (e.g. `Wisdom saving throw: d20 +3 · = +3 modifier`, no option). The reader added in 8586040 (roller.js, d20Options 'save') matches SW5E's sentence when tested alone, so the option is dropped later, probably where it looks up the Critical Analysis ability ("… ability modifier, which is (\w+)" in riderTexts). No regression output contains it ("analyzed by your" appears in no expected file)
101 · fixed · sent9: AC box "Unarmored · vs one attack: Deflection +1d8 (1 force point)"; Double Strike still offered
102 · partly · Vow of the Focused fixed: no note → the better ability (rakatan AC stays 16); note 'Intelligence' with INT 20 → `armorClass 16 → 18`, "+5 AC + WIS/CHA/INT (Vow of the Focused)". Rancor's Discipline not fixed: scholar-test-claude, WIS 20, Discoveries Rancor's Discipline noted 'Wisdom' ("[Wisdom]" shown on the pick): `Chakram attack … option: vs that target (INT, Critical Analysis) +1` (WIS would give +5)
103 · partly · Avatar (Kro Var 17) started: duration fixed ("Active · lasts 1 minute"), resistances listed. The burrow, fly and swim speeds are still only the state's note ("You gain a burrow, fly, and swim speed equal to your movement speed."): no Speeds line appears
112 · fixed · kadro-vos Totem Specialist, Totemic Might started: every weapon damage roll gains `option (on): Totemic Might +1d6` (Blaster rifle, Vibrorapier, Unarmed Strike, also on criticals)
113 · fixed · consular + Rifle Focus on an unproficient Blaster rifle: `damage (critical): d8 d8 +2 · = +2 DEX modifier · Energy · critical`, no Rifle Focus die
115 · fixed · Cybertech Engineer 11 with Cryo Amplifier + Elemental Shielding: "Resistances Resistance to cold damage (amplifiers installed)"; Environmental Shielding noted 'cold' still "(while wearing your spiked armor)"
124 · fixed · Precision Berserker 6, Rage started: `Vibrodagger damage: d4 +6 · = +4 DEX modifier +2 Rage`, no `option (on): Rage Damage` (was offered too, counting twice); Dire vibroblade `d8 +3 · = +1 STR +2 Rage`
127 · fixed · Blurrg's Instinct: "3 miles/hour · 24 miles/day → 6 miles/hour · 48 miles/day · travel pace ×2 (Blurrg's Instinct)"; Bantha's "480 lb ×2", "960 lb ×2"
129 · fixed · Armored Berserker 10, Deflective Layer: no "Customized Armor short rest 1 / 1" counter; AC 17 as before. (A DC chip from an unpicked option is on the card, see new problems)
138 · partly · Now offered: Ballistic Firestorm (`Blaster pistol attack … option: vs targets within 30 feet of you (STR, Firestorm) +1`, same on damage); Shield Mastery (picked through Mastery Strategist, Light physical shield: `Dexterity saving throw … option: vs a power or other harmful effect (Shield Mastery (fighting mastery)) +1`); Niman started (WIS 23): `Lightsaber attack … option: Niman Form +2` and damage +2; Djem So started: STR check and attacks `option: Djem So Form +3`; Shien started: "vs one attack: Shien Form +3"; The Way of the Yerdua started (WIS 16): `Blaster pistol attack … option: The Way of the Yerdua +3`; Focused Augmentation (Biotech 18): concentration save roll `INT modifier (Focused Augmentation) +3`. Still wrong: Crossguard's AC alternative stays when the modified Lightsaber isn't wielded (dice-crossguard with the Lightsaber unequipped: still "13 · 14 vs melee", "only sometimes: armorClass +1 vs melee · Crossguard"); the text says "While wielding your modified lightsaber"
139 · fixed · Armormech 13 (hit points filled to 13 levels), Advanced Power Fist, modified Combat suit worn: `Unarmed Strike attack: d20 +5 · critical on 18–20 (Advanced Power Fist + Juyo Form)` (was 19–20), `damage: d8 +0`
142 · fixed · Boggdo's Instinct, Rage started: "Speeds Flying speed equal to walking speed" (none before starting); Adaptable Armor was already fixed

## Findings (feats, species, items)

7 · fixed · rorrwaak + Durable: `Hit die (d12), at least 6 (Durable): d12 +3` (was `Hit die (d12): d12 +2`, no minimum)
12 · fixed · berserker + Mesh armor, DEX 16, shield: `armorClass 17 → 18` with the feat ("+1 AC: DEX up to +3 in medium armor · Armor Expert feat"); without the feat 17. In a Combat suit (light, already proficient): `speed.base 30 → 35 ft`, "tweak: speed.base +5 · Armor Expert"
16 · fixed · Force Guidance noted 'Athletics': `Athletics (STR): d20 +6 · option: Force Guidance +1`, no permanent tweak (was +6 → +7 and the option on top)
20 · partly · Now counted: "Snappy Interjection short rest 1 / 1", "Investigative Attunement long rest 1 / 1", "Vigorous Virility long rest 1 / 1". Still one pool for Adaptable Fading, Flexible Rending and Versatile Withering ("long rest 3 / 3"), where the text gives two (the attack bonus and the save swap, each "a number of times equal to your proficiency bonus")
28 · fixed · Linguist card: "Linguist Berserker ASI #1+ Intelligence DC 12" (INT 9 + PB 3 = 12)
30 · partly · Now listed: Mariner "Advantage on ability checks and saving throws related to swimming", "Other Hold breath … 7 minutes"; Actor "Advantage on Charisma (Deception) and Charisma (Perfo…"; Haggler "… when attempting to barter or trade"; Climber "… while climbing"; Exalted Awareness "Other Creatures within 60 ft have disadvantage on Dexterity (Stealth) checks made to hide from you". Still only in the text: Specialist's "treat a d20 roll of 9 or lower as a 10" (tool roll `Forgery kit check: d20 +2`, no note), Titan's Power's "ignore the two-handed property" and "When you miss with a melee weapon attack, the creature takes damage equal to your Strength modifier"
36 · fixed · Baragwin: one entry; the card offers "Tool proficiency 0 / 1 armstech's implements or munitions kits" and "Weapon proficiency 0 / 2 two weapons of your choice"; noted "Armstech's implements" → tool `d20 +4`, the weapon picker goes and "Weapon Developers" leaves Still to choose (12 → 7 entries)
43 · fixed · Zilkin `Strength saving throw: d20 −1 → d20 d20 −1 · mode dis · Disadvantage from Puny`; Hutt, Adolescent `Dexterity saving throw: d20 +2 → d20 d20 +2 · mode dis · Disadvantage from Slow and Lethargic`
44 · fixed · Arkanian: "Advantages Advantage on Intelligence, Wisdom, and Charisma saving throws against force and tech powers" (no row before)
45 · fixed · Duros: `Lore (INT): d20 +3 · option: to recall information you have learned (Superior Memory) +3`
49 · fixed · Taung: "Weapon proficiency 0 / 1 one vibroweapon" and "Weapon proficiency 0 / 1 one blaster of your choice" (was one "two vibroweapons or blasters" pick)
50 · fixed · Gank in Assault armor: Speed box "35 ft" with "3.5 miles/hour · 28 miles/day", no "−10 ft (Assault armor: Strength 15)" line
54 · partly · Now listed: Arcona "Advantage on ability checks related to identifying salt or spice…", Thisspiasian "Advantage on saving throw against an effect that would read your thoughts" and "Other Wisdom (Insight) checks against you have disadvantage". Ugor Amorphous Form still not: Advantages has only "Advantage on saving throws against poison"; no grapple advantage on the Advantages row or as an Athletics/Acrobatics option
57 · partly · Counters now: Aleena and Karkarodon "Bite short rest 1 / 1", Barabel/Tiss'shar "Tooth and Nail", Xexto "Split Mind", Quermian "Two Brains", Advozse "Vigilant", Anx "Surgical Strikes", Pantoran "Impose Order". Still none: Diathim (Enthralling Hypnosis), Falleen and Zeltron (Enthralling Pheromones), "once per short or long rest, you can treat a d20 roll of 9 or lower on a Charisma check as a 10"
58 · fixed · Miraluka "Senses Force sight (always on)"; Tarasin "Senses Sense force (always on)"
156 · fixed · Smart Interface (Basic) on Kadro's Blaster rifle: `attack d20 +5 → +4`, `damage d8 +6 → d8 +5` ("−1 Smart Interface (Basic)"); Versatile Frame on a Vibrorapier: "Vibrorapier damage (two-handed): d10 +4", "Finesse, versatile (1d10)"; Brutal Cell on Maasha's Lightsaber: `damage (critical): d6 d6 +4 → d6 d6 d6 +4`; Hydraulic Equalizer on Assault armor, STR 13: `speed.base 20 → 30 ft` "(Strength 13 met)", Speed box "3 miles/hour" with no −10 ft; Absorptive "Damage you take from weapons reduced by 1"; Avoidant "Critical hit range of attacks against you −1"; Reactive "+1 AC against the next attack…"; Lightweight: carried weight 40.75 lb; Vicious Ascendancy Core: "note: Vicious 3: +3 damage when a weapon die rolls its maximum"; Recoil Dampener on a rifle without a strength number: no change (right)
157 · fixed · Tool (Fine) on an armstech: picker "[choose the tool… ▾]"; with Armstech's implements picked: `armstech's implements check: d20 +7 → d20 +11 · +8 proficiency ×2`, Proficiencies "armstech's implements (expertise) · Tool (Fine)"
161 · fixed · Charisma Enhancement (Basic): Still to choose ends with "Charisma Enhancement (Basic): the score the GM lowers by 1 (not Charisma)"
163 · fixed · Iridonian Grav-lev Arm: `Unarmed Strike damage: no dice +0 · Kinetic → d4 −1 · Ion`, table `| +2 | 1d4−1 Ion |`; carrying "240 lb ×2"
168 · fixed · Muon Gold (Fine) parsed as `{"path":"techCasting.maxPoints","rollBonus":"2d4"}` (was no mod and no note); with the roll made as makeEffect does (5): `techCasting.maxPoints 21 → 26`, "Tech points 26 / 26", "Tech points +5 (2d4 rolled)". Spicebrew (Fine): `forceCasting.maxPoints` rollBonus 2d4. (A hand-stored effect with no roll shows "no effect", as expected)
175 · partly · Fixed: Skills Enhancement Package `Stealth (DEX): d20 +7 · option: Skills Enhancement Package +1d4 (proficient skill)`, and its side effect ticked on others; Shock Arm `Unarmed Strike damage: d4 +5 Kinetic → d6 +5 · Lightning`; Automated Adrenal Package "[Strength Adrenal] [Alacrity Adrenal] [Stamina Adrenal]". Still nothing for Sparkles: on a Light pistol (and equipped alone) `Light pistol damage: d4 +5 · …`, no "+1d4" option, while Flashy on a Heavy pistol gets `option: Flashy +1d4 (first hit each round)`

## Earlier "New problems seen" (classes)

C1 Tend the Wounded lead "2d6 acid" · fixed · the card's lead no longer shows "2d6 acid"; "acid" appears only in the side-effects table row 6
C2 Precision rage counted twice · fixed · see 124
C3 Whills hover names blaster pistols · fixed · rifle hover "proficient Proficient: blaster rifles · Flurry of Light"
C4 Weaponmaster's Exploit accepts a Revolver · fixed · "Weaponmaster's Exploit Revolver: not allowed", `Revolver attack: d20 +3` (no proficiency)
C5 Monk "None light armor" · fixed · Vow of the Sentry: "None → light armor · Vow of the Sentry medium armor · Vow of the Sentry"
C6 Ideal of the Contender twice · partly · labels fixed ("Sentinel Ideals feature", "Path of the Forceblade feature"), but sent9 with only Ideal of the Contender picked still has two "effect: Ideal of the Contender · feature" entries and two rows: "Ideal of the Contender Unarmed die +1 step Sentinel Ideals feature" and an empty "Ideal of the Contender Sentinel Ideals feature"
C7 Hovers count an ability increase as the stat's change · not fixed · Monk 20 with Perfect Self: initiative 5 → 6, hover "Without tweaks or effects: 5 → now 6 / +2 DEX · Perfect Self"; AC hover still lists "+2 DEX · Perfect Self"
C8 Ichor Lightning had no damage roll · fixed · `Ichor Lightning damage: d6 +3 · = +3 ability modifier · Necrotic`
C9 Feature languages not asked · fixed · Silver Tongue (91); Jal Shey: Still to choose "Mystical Erudition: languages"
C10 Vengeance counter · partly · with Devastating Critical picked (in the card's new "Vengeance 1 / 1" picker): no counter. Before any pick: "Vengeance short rest 5 / 5" still shown. With Their Power, My Strength picked: two counters, "Vengeance short rest 5 / 5" and "Their Power, My Strength short rest 5 / 5"
C11 Vow of the Focused lowered AC · fixed · see 102 (the better ability until noted)
C12 Brutish Durability not on death saves · not fixed · kadro-vos Fighter 10: saves `option: Brutish Durability +1d8`, but `death: Death saving throw: d20 +0`
C13 Bonded Plates row without "vs melee" · not fixed · "Bonded Plates AC +2 Armormech Modifications feature" (the AC line is right: "only sometimes: armorClass +2 vs melee")
C14 bump-check --full writes to a shared folder · not fixed · dev/bump-check.js:30 `const OUT = path.join(__dirname, '..', 'dist', 'bump-check')`

## Earlier "New problems seen" (feats, species, items)

F1 Unnatural Resilience on every save · fixed · only `death: Death saving throw: d20 +3 · = +3 CON modifier (Unnatural Resilience)`; ability saves have no option
F2 Force Guidance twice · fixed · see 16
F3 Natural weapon die lost a negative STR · fixed · Wookiee STR 8: `Unarmed Strike damage: d4 −1 · = −1 STR modifier`
F4 Weapon hovers list the class's proficiency · fixed · Accuracy Focus Mk IV: hover "5 → now 8 / +3 Attack · Accuracy Focus Mk IV while installed" only
F5 "(capped from +0)" · partly · hovers fixed (Colicoid "+5 AC 17 (Natural Armor) · Natural Armor", Finesse Oscillator "+3 Finesse: attack with the better of STR and DEX"); the Finesse Oscillator's item chip still reads "→ +3 (cap)" twice
F6 Score override breakdown · fixed · "base 8 · set to 16 by a tweak · +2 from Strength Stim (Fine) (temporary): not applied"; STR stays 16 (set to). (Wording, see below)
F7 Gank's Speed box · fixed · see 50
F8 Damage lines name a feature for an ability · fixed · "+5 DEX modifier (Blinding Agility)", "+2 DEX modifier (Finesse Oscillator)", "+3 DEX modifier (Unarmed Combatant)"
F9 Spiritual Techcaster asks twice · fixed · one "+1 to … [Choose an ability…]" picker, no separate casting-ability question
F10 Half-human increases too loose · fixed · halfHumanOf 'Ewok' with nothing recorded: DEX 14 → 16, CON 14 → 15
F11 Adapted Armor resistance before the type · fixed · "Adapted Armor Choose the damage type the GM chose (resistance)", no Resistances row
F12 Tool rows split by case · fixed · armstech + Crafter "Armstech's implements": one row, `Armstech's implements check: d20 +11` (the lowercase proficient row is gone)
F13 Muscled Menace speed hover lists the STR increase · not fixed · berserker (no armor, and in Mesh armor): "30 ft → now 35 ft / +1 STR · Muscled Menace feat (Berserker ASI #1) / +5 Speed · Muscled Menace feat"

## New problems seen

1. Crossguard's "+1 vs melee" applies when the modified lightsaber isn't wielded (dice-crossguard with the Lightsaber unequipped still "13 · 14 vs melee"). Counted under 138.
2. Customized Armor's card shows "Customized Armor Level 10 DC 15 Strength save" with only Deflective Layer picked; the DC is Grappling Line's, an option not taken.
3. Skills Enhancement Package's side effect reads "option (on): Skills Enhancement Package −1d4 (side effect: not proficient) +-1d4" ("+-1d4"), and the roll "d20 −d4(cond:…) −1".
4. Their Power, My Strength gets two counters, "Vengeance" and its own (C10).
5. A tweak without a reason is explained as "= 16 Strength score · no reason given tweak" in the hovers.
6. Test-setup note, not a sheet bug as such: raising `levels` without adding `hitPoints` sends the feature's tweak ("tweaks.unarmed.damageDice.dieSize = 8") but the unarmed strike stays "no dice +1 · = +1 damage bonus" and the attack uses the old PB. With the hit points filled in, it's right (139).
