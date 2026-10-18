# Priya — Part A log (Guardian; tablet frame http://127.0.0.1:8765/dev/phone.html?w=800&h=1000)

Player: Priya. Rules lawyer. Reads the rules text and checks the sheet follows it (forms, force + martial). Plays on a tablet.

## Setup
- Read brief.md and the README (skimmed as a player). Took a quick look at Tomas's log for how the builder behaves (only to save time on navigation; my judgments are my own).

## A1 — Create the character on sw5e.com
- Read the Guardian rules page first (sw5e.com/rules/phb/classes/Guardian): d10, HP 10 + Con at 1st; armor "Light armor, medium armor" (no shields listed!) but the equipment offers "a light or medium physical shield"; weapons all lightweapons + vibroweapons; saves Con + Cha; skills "Choose two from Acrobatics, Athletics, Deception, Insight, Intimidation, Lore, Perception, Persuasion, and Piloting". Level 1: Forcecasting (5 powers known, Force Points = guardian level x 2 "+ your Wisdom or Charisma modifier (your choice)", Max Power Level 1st; Wisdom for light, Charisma for dark, Wis or Cha for universal powers), Channel the Force ("your choice of one from two such effects: Cause Harm or Lend Aid", twice per short/long rest; DC = universal force save DC).
  - (rules) Guardian armor proficiency lists no shields, yet the class equipment gives one. I'll see what the sheet makes of my shield. [rules, low]
- My Characters → round "+" → speed-dial "+" → CHARACTER BUILDER (BETA) (⚙ with a red "!" = unsaved).
- **Species: Togruta** (typed "Tog"). "Wisdom score increases by 2, and your Strength or Dexterity score increases by 1" → dropdown "Choose 1 ability score to increase by 1" → Strength. Traits: Mask of the Wild, **Montral Reception (tremorsense 30 ft)**, **Wild Hunters (proficiency in Survival)**, languages Basic + Togruti. Small inconsistency on the species page: Physical "Height 4'9" +2d8"" vs Size "between 5 and 6 feet tall" (site data, not ours).
- **Class: Guardian** (ADD NEW CLASS → "Guard" → ADD CLASS). Hit points 10 (greyed). Class features Channel the Force, Forcecasting — text only.
  - **No picker for Channel the Force's Cause Harm vs Lend Aid.** I want Lend Aid. WISH (builder gap → extension): a picker for "your choice of one from two effects" (Cause Harm / Lend Aid), shown on the feature's counter. [missing, medium]
  - No class skill choice (2 of 9) anywhere in the builder. WISH (builder gap → extension): class skill picker (2 from the Guardian list) at creation. [missing, high]
  - "CHOOSE FORCE POWERS" dialog: "Filter by Level" (0/1) + "Filter by Alignment"; the list shows only names (no light/dark/universal tag, no concentration, no casting time) unless I expand each row; prerequisites are shown ("FORCE REFLECT Prerequisite: Saber Reflect"). Typing into the Filter by Level select: one click opens it, but picking a level resets the scroll. Picked at-will **Saber Reflect, Saber Ward**; 1st **Battle Precognition, Heal, Heroism** → "5 / 5 Known", other boxes greyed. 
  WISH (builder → extension): power picker with alignment (light/dark/universal), concentration, casting time and the ability each uses visible in the list, so a Guardian can see which powers use Wisdom vs Charisma before choosing. [improvement, medium]
- **Ability scores**: Standard Array by default (15/14/13/12/10/8 dropdowns; a value used once disappears from the others — good). Str 15, Dex 12, Con 14, Int 8, Wis 13, Cha 10. Like Tomas found: the step never shows species bonuses or final scores (I had to know Str 16 / Wis 15 myself).
  WISH (builder → extension): ability step showing base + species + feat = final score and modifier. [improvement, medium]
- **Description**: name "Maasha Vaal (Panel)", Lawful Light, background **Jedi**. VIEW BACKGROUND DETAILS: "Skill Proficiencies: Choose two from Insight, Investigation, Lore, and Persuasion; Tool Proficiencies: Artificer's tools; Languages: One of your choice; Equipment: A copy of the Jedi code, a set of common clothes including a robe, and a belt pouch containing 150 cr"; background feat list (d8): Empathic, Investigator, Loremaster, Charmer, Linguist, Crafter, **Formfighting Dabbler**, Force-Sensitive.
  - Feat **Formfighting Dabbler**: "Increase an ability score of your choice by 1, to a maximum of 20. / You learn one lightsaber form…". The builder offers **no picker for the +1** and **no picker for the form**. No picker for the Jedi's 2 skills or the language either.
  WISH (builder gap → extension): background skill (2 of 4) and language pickers; feat "+1 to an ability of your choice" picker; feat form picker. [missing, high]
  - Personality fields left empty on purpose (A3 in the sheet).
- **Equipment**: "CREDITS: 0", nothing offered from the Guardian a/b packages or the Jedi list. Added by hand: Mesh armor (Cost 600, Weight 20; Equipped), Lightsaber (Cost 450, Weight 2.25; no damage/properties shown in the dialog), Light physical shield (Cost 50, **Weight 0**). The Search box needs a second click before typing registers (every time); a double click closes it again. "pack", "packs", "explorer" → "No data available": Priest's/Explorer's packs don't exist, so I'll add the pack contents and the Jedi code/robe in the sheet (A3).
  - Shields search: "shield" finds only enhanced shield generators and "Physical Barrier Mk I…"; I had to guess "light p" to find "Light physical shield".
  - Adjust Credits → Add 150 (Jedi belt pouch) → "Result: 150 Credits" → APPLY.
  WISH (builder gap → extension): starting equipment as the class/background a/b choices (packs unpacked) or a starting-wealth roll (8d4 × 100 cr), credits included. [missing, medium]
- CHARACTER SHEET → sw5e.com sheet "MAASHA VAAL (PANEL) Togruta Guardian 1", 0/300 XP. Checked against the rules:
  - HP 12/12 = 10 + Con 2 ✓. Str 16 (15+1) ✓, Wis 15 (13+2) ✓. Saves Con +4, Cha +2 (proficient) ✓.
  - AC 15 "Mesh armor, Light physical shield" (13 + Dex 1 + shield 1 — assumes shield proficiency).
  - Force: Force Points 4 boxes (2 + Wis 2) ✓; "1st MAX POWER LEVEL", "+4 LIGHT ATTACK MODIFIER", "12 LIGHT SAVE DC" (light only; no universal line although Saber Reflect/Ward are universal).
  - Lightsaber +5, "1d6+3 Energy, Hidden, luminous, versatile (2d4)"; Unarmed +5, 4 Kinetic ✓.
  - **Survival +2: Togruta "Wild Hunters. You have proficiency in the Survival skill." not applied** (should be +4). No skill proficient at all (2 Guardian + 2 Jedi + Survival all missing).
  - Features list has **DARKVISION** although Togruta has no darkvision trait (site data); MONTRAL RECEPTION is there as text.
  - Formfighting Dabbler's +1 not applied anywhere (expected — no picker).
- Character id on sw5e.com: **…** (the builder URL stayed "temp-w0y0m4pqh?isNew=true" until I went back to My Characters; the card then linked to the real id).

## A2 — Bring it into the sheet (tablet frame)
- Opened http://127.0.0.1:8765/dev/phone.html?w=800&h=1000 in a new tab. It showed "Tikk Plonr (Panel)" (Jun's; not touched). Pressed **Load from SW5E** (my sw5e.com tab was on Maasha's page): no notice I could see within 6 s, and the sheet **stayed on Tikk Plonr**. My character was in the selector (12 entries incl. other players' and the owner's). Picked "Maasha Vaal (Panel) — Togruta Guardian 1" by typing "Maasha" in the focused select.
  WISH: after Load from SW5E, open the character whose sw5e.com page I have open (or say "New: Maasha Vaal (Panel) — open it?"). [confusing, medium]
  - First notice after switching: "Recalculated with your changes · 14:27:15" — on a character I had never changed. Wording made me think something had been changed behind my back. [confusing, low]
- Numbers vs the builder and the rules:
  - Same as builder: AC 15 "Mesh armor, Light physical shield", HP 12/12, Init +1, Speed 30 ft, Prof +2, Passive Perception 12, Hit dice 1/1d10 "+2 per die spent (Con)". Str 16 "base 15 · +1 from species/ASIs/feats/tweaks", Wis 15 "base 13 · +2". Saves Con +4, Cha +2 ✓.
  - **Force casting** block is better than the builder: Force points 4/4, Max power level 1, "LIGHT SIDE DC 12 attack +4 · DARK SIDE DC 10 attack +2 · UNIVERSAL DC 12 attack +4" ✓ (universal uses Wis, the better of Wis/Cha). Each power with its alignment, Concentration tag, casting time, range, duration and full text. ✓
  - Lightsaber +5, 1d6+3 Energy, Strength, "Simple Lightweapon", "Hidden, luminous, versatile (2d4)" — matches the builder. Unarmed +5, 4 kinetic ✓.
  - Tracker: Force points 4/4, Hit dice (d10) 1/1, **Channel the Force 2/2 "short rest"** ✓ (twice, short or long rest).
  - **Defenses & senses: "SENSES Tremorsense 30 ft"** ✓ (Montral Reception picked up; the builder's sheet didn't show it). Vision "Normal" ✓ — but the Species card still lists a **"Darkvision" trait** (60 ft text) that the Togruta rules page doesn't have. The sheet shows the trait card but doesn't apply it; a player will be confused which is right. [rules, low]
  - Effects "FROM CLASS FEATURES (2)": "Guardian weapon proficiencies — Proficient: All lightweapons / all vibroweapons" and "Channel the Force — Choose one of Cause Harm, Lend Aid". Good that it tells me a choice is pending.
  - **Skills: none proficient. Survival +2** although Togruta "Wild Hunters. You have proficiency in the Survival skill." The sheet reads Montral Reception (tremorsense) from the trait text but not Wild Hunters' skill. Should be +4.
    WISH: species traits that grant a skill proficiency ("You have proficiency in the Survival skill") apply it, like the sheet already does for senses. [bug, high]
  - **Languages: "Galactic Basic" only** — Togruti missing (species: "Galactic Basic and Togruti"), and no way to pick the Jedi's "One of your choice". [bug, medium]
  - Species card shows "Chosen ASI {"Strength":1}" — raw JSON. [bug, low]
  - Mesh armor costs **500 cr** in the sheet, **600** in the builder's Add Equipment dialog. [bug, low]
  - Light physical shield "AC +1 · Shield", **0 lb** (also 0 in the builder). Real shields weigh something; can't verify from the rules page I have open. [rules, low]
  - Shield and proficiency: Proficiencies "Armor: Light armor, medium armor" (no shields) while the shield's +1 is in the AC with no remark. Per 5e-style rules a shield you aren't proficient with gives no AC benefit; either SW5E's Guardian should list shields (its own equipment gives one) or the sheet should warn. [rules, medium]
  - Classes card: "Archetype — none —" dropdown is already offered at level 1 (Guardian Focus is a 3rd-level feature). Let's see later if it warns. 

## A3 — Set up in the sheet
- **Powers.** Reading the sheet's power text I found **Battle Precognition: "your base AC becomes 13 + your Dexterity modifier. This power has no effect if you are wearing armor."** — useless for me in mesh armor; the builder never showed me that text while choosing. Classes & Progression → Guardian 1 → Force powers 5/5 → × on Battle Precognition (removed at once, no confirm, "4 / 5" in orange) → "Learn a force power…" list (every power with its alignment and "(needs X)" prerequisites — nice).
  - I focused the select and typed "Guidance" + Enter: the select **committed on the first letter too**, so I learned **Give Life** *and* Guidance → "6 / 5" in red with "⚠ 6 known, the table gives 5" (good warning). × on Give Life → 5/5: Heal, Heroism, Saber Reflect, Saber Ward, **Guidance**.
  WISH: the "Learn a force power…" select adds a power on every change, so keyboard type-ahead adds the wrong powers. Add only on a deliberate pick (or an Add button / a searchable list). [bug, medium]
  - Each change shows "Opening sw5e.com in a background tab…" although my sw5e.com tab was already open, then "Recalculated with your changes · hh:mm:ss". A free-text change (Channel the Force "Your choices") also triggered a full recalculation.
- **Channel the Force.** Features → Channel the Force card (2/2 counter, full text of Cause Harm and Lend Aid) → only a free-text "Your choices" box (placeholder "What you chose (e.g. Persuasion + Forgery kit)"). Typed "Lend Aid" → saved. There's **no Use button for Lend Aid** (heal 1 + Wis = 4 HP to a creature, or neutralise poison) or Cause Harm (save DC, damage) — only the counter.
  WISH: Channel the Force as a real choice (Cause Harm / Lend Aid radio, from 3rd level the Focus's extra effect), with a **Use** button per effect that spends a use and shows the numbers: Lend Aid heals "guardian level + Wis mod (min 1)" (on me or someone else), Cause Harm shows the Con save DC (universal force DC) and "guardian level + Cha mod" necrotic. [missing, medium]
- **Feat: Formfighting Dabbler.** Feats → "Choices from your feats · Lightsaber form 0/1 · Feat: Formfighting Dabbler (Background (Jedi))" with a "Choose a lightsaber form…" list (Aqinos Form shows "(needs The ability to cast tech powers)" — prerequisites shown ✓). The frame's native select can't be driven by my tools, so I set it from javascript_tool (workaround; on a real tablet you'd tap it). Picked **Soresu Form** → "1 / 1", row with a "Your choices for it, if any" box and text "The first time you take kinetic, energy, or ion damage from a weapon before the end of your next turn, that damage is reduced by half." An "Adopt Soresu Form" button appeared under Features.
  - (rules) The form text says nothing about how/when you adopt a form (action? bonus action? must I wield a lightweapon?) and the general lightsaber-forms rules aren't anywhere on the sheet; I couldn't open them on sw5e.com either (/rules/phb/customization/lightsaberForms and /characters/lightsaberForms show nothing).
  WISH: show the general form rules (how to adopt, duration, weapon requirement) next to the forms, so I can check "Adopt" follows them. [rules, medium]
  - The feat's **"+1 to an ability score of your choice"**: the card shows a "+ Any" tag, nothing to pick (clicking the tag collapses the card).
  WISH: an ability picker for "+1 to an ability of your choice" on feats (and species), applied to the score. [missing, high]
  - Workaround: Settings → Tweaks → "Wisdom score" add 1, reason "Formfighting Dabbler (Jedi background feat): +1 to an ability of my choice". → Wis 16 (+3): Force points **5/5**, Light DC **13** / attack **+5**, Universal DC 13 / +5, Passive Perception updated. ✓
- **Skills** (none came in): 5 tweaks, each "Add a tweak to…" → skill → "proficient" → reason → Add: Survival (Togruta Wild Hunters), Athletics + Perception (Guardian 2 of 2), Insight + Persuasion (Jedi 2 of 2). Result: Athletics +5, Insight +5, Perception +5 (passive 15), Survival +5, Persuasion +2 ✓. The add row stays in place and keeps focus order — fast with the keyboard, but it's 4 fields × 5 skills (20 actions) for what is a "choose two" at character creation, and the tweak list sorts oddly (Wisdom, Survival, Perception, Insight, Athletics, Persuasion — not by name nor by order added).
  WISH: skill pickers for class ("choose two from …") and background skills, applied as real proficiencies (not tweaks), with the allowed list from the rules. [missing, high]
- **Languages**: no way to add one (Proficiencies shows chips only; the tweak list has no languages). Wrote Togruti + Huttese in Notes.
  WISH: add languages (species languages automatically; "one of your choice" as a picker). [missing, medium]
- **Personality**: Personality → Edit → one form with alignment, traits, ideal, bond, flaw, gender, birthplace, age, height, weight, hair, eyes, skin, appearance → Done. Footer says "Changes stay in this browser until you save them to SW5E" — but the README says the viewer's copy *is* my data; the wording makes it sound temporary. [confusing, low]
  WISH: offer the background's suggested characteristics (the Jedi d8 tables for traits/ideal/bond/flaw) to pick or roll. [improvement, low]
- **Notes**: Edit → Markdown → renders headings and bold lists ✓.
- **Starting equipment** (pack + background gear the builder couldn't add): Equipment → "Add an item from SW5E": Backpack, Bedroll (type → Enter → Enter ✓), Field rations ×10 (searching "ration" lists "Blaster Integration", "Disintegration Core…" before "Field rations" — substring matches ranked before word-start matches), Glowrod, Clothes, common. No explorer's/priest's pack in the list either.
  - **"Jedi code"** → "No SW5E item matches."; Add → red "Choose an item from the S…" partly hidden under the "No SW5E item matches." popup (overlapping texts). The extension has **no custom items** (the builder has).
  WISH: add a custom item in the extension (name, weight, cost, description, qty), for background gear and story items. [missing, high]
  WISH: packs from SW5E's equipment chapter (explorer's, priest's…) added as their contents in one click. [improvement, medium]
  - Each add briefly showed a "TOTALS — AC, attacks and other numbers update when SW5E recalculates with your changes" card that pushes the Items card onto a second row, then disappears (layout jumps while adding). [improvement, low]

## A4 — Cantina: Persuasion, then Insight with advantage
- Before talking, I cast **Guidance** on myself (at-will, Light, Concentration: "Once before the power ends, the target can roll a d4 and add the number rolled to one ability check of its choice. The power then ends."). Force → Guidance → **Cast** → strip chip "◉ Guidance"; Effects: "Guidance (concentration) cast, lasts up to 1 minute, since Sat 14:38 · Concentrating on Guidance." No points spent (at-will) ✓.
  - The Force list: Guidance and the 1st-level powers have Cast; **Saber Ward has no Cast button** although it lasts a round and gives "resistance against kinetic, energy, and ion damage dealt by weapons" — so its resistance can't be put on the sheet. Saber Reflect (reaction) has no button either; its "Attack +5" isn't clickable here.
  WISH: Cast for every power, including at-will defensive ones (Saber Ward → resistance listed under Defenses until the end of my next turn), and Saber Reflect as a reaction that rolls the 1d6 reduction (and the +5 reflect attack). [missing, medium]
- Skills → **Persuasion** row → dice dock "Persuasion (CHA) Maasha Vaal (Panel)", Normal. **No Guidance option in the roller** although I'm concentrating on it; added "+d4" by hand → "Roll +2" → d20 **4**, d4 **4** → **10** (breakdown "4 4 + 2 modifier" — two bare 4s, hard to read which is which).
  WISH: when a buff like Guidance (or Bless-style dice) is active, offer it in the roller ("+1d4 Guidance") and end it when used, since the power says "The power then ends". [improvement, medium]
- Skills → **Insight** → Advantage → Roll +5 → 2 (struck) / **11** → **16** ✓.
- Tapped the strip chip "Guidance" → jumped to Effects → **End** → "No temporary effects." ✓ (I had to remember to end it myself.)
- Small things in the frame: the strip's highlighted section is one behind what's on screen (Skills on screen, "Abilities" highlighted; Personality on screen, "Equipment" highlighted). [bug, low]

## A5 — Kessa's Outfitters: two Medpacs + a class item
- Equipment → "medpac" → suggestions (Medpac · Medical; Medpac (Fine/Improved/…) · Consumable) — **no prices in the suggestion list**. Picked Medpac, Qty 2 → "Medpac Medical · 300 cr · 0.5 lb", "☐ Pay [600] cr from credits — have 150 cr · standard price 300 cr each". Clear.
- Can't afford 600 → Kessa's 20% off = **480 cr**. Ticked Pay, typed 480 → Add → red "**Not enough credits: 480 cr needed, 150 cr available.**" ✓ clear. The sheet can't go below 0 or record a debt, so at the table I paid all I had (Pay 150 → Add): Credits **150 → 0 cr**, Medical: Medpac ×2 with a **Use** button, weight +1 lb. **Owe Kessa 330 cr.**
- Class item: **Vibrodagger** (simple vibroweapon, light, finesse, thrown 20/60 — a backup/throwing blade for a Guardian), standard 50 cr → 40 cr after the discount, on credit: added with Pay unticked (free) → "1d4 Kinetic · Finesse, light, thrown (range 20/60)". **Debt now 370 cr** (to Notes later).
  WISH: let credits go negative or keep a "debts / owed" line (who, how much), so buying on credit at the table is recorded where the credits are. [improvement, low]
  - The inventory row shows the standard cost (Medpac "300 cr"), not what I paid; fine, but a purchase log ("bought 2 Medpacs from Kessa for 480 cr, paid 150") would help settle debts later. [improvement, low]

## A6 — Ambush at the docks
- **Initiative**: Combat & Vitals → "+1" → dock "Initiative" → Roll +1 → 9 + 1 = **10**.
- **Round 1 (me)**: bonus action — Features → Lightsaber forms → **Adopt Soresu Form** → "Active · lasts until the start of your next turn" + End; strip chip "Soresu Form"; Effects "Soresu Form started, lasts until the start of your next turn, since Sat 14:43 · The first time you take kinetic, energy, or ion damage from a weapon before the end of your next turn, that damage is reduced by half."
  - (rules) The sheet says the form lasts **until the start of my next turn**, but its own text says the protection covers damage taken **before the end of my next turn**. One of them is wrong; as written, Soresu should still protect me during my next turn. [rules, medium]
  - It took me a while to find the Adopt button: it's in Features under "Lightsaber forms", below the long Forcecasting text, not near the attacks or the tracker. [improvement, medium — in a fight I want states/forms next to the play tracker]
  - Action — Weapons & Attacks → Lightsaber "+5" → dock "Lightsaber attack" → Roll +5 → **19 + 5 = 24** → "Hit: roll damage" (also "Critical damage", "Critical: Double dice / **Max + roll**" — Max + roll was pre-selected although I never chose it: the choice seems shared by every character in this browser) → "Lightsaber damage" d6 3 + 3 = **6 Energy**.
  - The lightsaber is versatile (2d4): the attack/damage never asks one- or two-handed (I'm one-handed with a shield, so 1d6 is right, but I couldn't pick 2d4 if I dropped the shield).
  WISH: versatile weapons offer "one-handed 1d6 / two-handed 2d4" in the damage roll (and warn two-handed when a shield is equipped). [missing, medium]
  WISH: the critical-damage rule choice should be per character (or say where it was set); SW5E's default is double dice. [confusing, low]
- **Round 1 (thug)**: **6 kinetic damage**. Typed 6 → Damage → HP **6/12**: the sheet took the full 6 although **Soresu Form is active** and its effect is listed right below the tracker. The damage box has no damage type (kinetic/energy…) and no "from a weapon" switch, so it can't apply Soresu's halving (or any resistance).
  WISH: damage entry with a type (and "weapon" or not) that applies active halving/resistance — Soresu (first weapon hit halved, then used up), Saber Ward, species/feature resistances — and says what it did ("6 kinetic → 3 (Soresu Form)"). [bug, high]
  - Workaround: **Undo: Took 6 damage** (✓ worked) → typed 3 → Damage → HP **9/12** ("Undo: Took 3 damage"). Soresu stays "Active" in Effects although its one-time benefit is now spent.
- **Round 2 (me)**: start of my turn → Effects → Soresu **End** → "Soresu Form has ended." Then re-adopted it (bonus action) through the **🔍 filter**: "Soresu" → only the Lightsaber forms card and the feat card stay → Adopt (the filter is the fastest way to reach things on the tablet ✓). Action: filter "Heroism" → "1st level · 2 points" + **Cast** → "**Cast Heroism at 1st level (2 force points). Concentrating.**" Force points **5 → 3** ✓, strip chip "Soresu Form +1".
  - Heroism (touch, willing creature) never asks who the target is, and Effects only says "Concentrating on Heroism." — not "immune to frightened" nor "temp HP = 3 at the start of each of your turns". I had to add the temp HP myself each turn.
  WISH: powers that buff a target ask "on me / on someone else"; on me, Heroism's "temp HP equal to your forcecasting modifier at the start of each of your turns" and "immune to frightened" are shown in Effects/Defenses (ideally a "Start of my turn" button that applies it, and drops the temp HP when the power ends). [missing, medium]
- **Round 2 (thug)**: crit for **13 kinetic**; Soresu halves the first weapon hit → I entered **6** by hand → HP **3/12**. I was concentrating on Heroism: **no concentration prompt** at all (rule: Con save, DC 10 or half the damage, whichever is higher). Rolled it myself: Abilities → Con "Saving throw" → Roll +4 → 17 + 4 = **21** (passed; the roller doesn't know a DC, so it can't say pass/fail).
  WISH: when I take damage while concentrating, prompt "Concentration save DC N" (N = max(10, half the damage)) in the roller, and end the power on a failure. [missing, high]
- **Round 3**: ally's Medpac on me → typed 6 → **Heal** → HP 9/12. Start of my turn: Soresu **End** (my first tap on End didn't register — the row had just moved when the heal notice appeared; second tap worked → "Soresu Form has ended.") and Heroism's 3 temp HP by hand → typed 3 → **Temp HP** → "9/12 · Temp HP 3", strip "9/12+3" ✓.
  - My own Medpac: filter "Medpac" → Medical: Medpac ×2 → **Use** → "On me / On someone else / Cancel" → **On me** → dock "Medpac: healing" d10 **1** + 2 Con = **3** → **Heal 3** → "✓ Healed 3", HP **12/12 +3**, Medpac ×1 ✓ (great flow).
  - (The filter leaves every inventory category header visible with no rows — "Weapon (2)", "Armor (2)"… — the counts don't match what's shown.) [improvement, low]
  - GM: 4 damage + Con save DC 10. Typed 4 → Damage → temp HP took 3, HP **11/12** ✓ (temp HP first, correct). No concentration prompt again; rolled Con save: **2 + 4 = 6 → failed**. Tapped the "Heroism" chip → Effects → **End** → "Heroism (concentration) has ended." ✓
- After the fight: nothing left running (Soresu ended, Heroism ended). HP 11/12, Force points 3/5, Medpac ×1, Channel the Force 2/2 (never had a way to "use" Lend Aid from the sheet).
- Other notes from the fight:
  - The Wisdom card says "+1 from Formfighting Dabbler (Jedi background feat): +1 to an ability of my choice **(temporary)**" — my tweak is permanent; calling it temporary is confusing. [confusing, low]
  - The section strip scrolls itself sideways as I move down the page (to keep the current section visible), so a tap aimed at "Combat" from an earlier glance landed on "Background". [improvement, low]
  - The "Use SW5E's values" link sits right next to Sync in the tracker; one stray tap there would throw away my play state mid-fight. [improvement, low]

## A7 — Loot
- **150 credits**: filter "credits" → only the Credits card → typed "+150" → Apply → 150 cr ✓ ("Credits" dropped out of the "Not synced" list, since 150 is what sw5e.com has — neat). The card showed "0 cr" for a moment until the recalculation finished.
- **Strength Stim (Basic)**: "strength stim" → Strength Stim (Basic) "Consumable · Standard", "Pay 0 cr" (no price in SW5E's data) → Add → new group "Enhanced: Consumable" with **Use** ✓, weight "—", cost "—", source WH.
- **Power cells**: I don't use a blaster → none.
- **"Coded datapad with the smuggler's coordinates"** (story item): can't be added in the extension (no custom items, see A3). Workaround: sw5e.com → Edit Character → Equipment → CUSTOM ITEMS "+" → "Add a Custom Item" (Name, Type Gear, Cost 0, Weight 0, Quantity 1, Description) → ADD; also added "Copy of the Jedi Code" (Jedi starting gear) the same way → CHARACTER SHEET (saved). Back in the viewer → **Load from SW5E** → "Loaded 7 characters from sw5e.com · 14:52:44", "totals not recalculated yet" → "Recalculated with your changes · 14:52:49".
  - Result: "Custom items (2)": Coded datapad (smuggler's coordinates) [custom] 0 lb, Copy of the Jedi Code — and **all my local changes survived** (HP 11/12, force points 3/5, tweaks, credits 150, stim, medpac ×1, notes) ✓.
  - For ~5 s between "Loaded" and "Recalculated", the sheet showed **Force points 2/4 and Passive Perception 12** (numbers without my tweaks) — if I'd glanced then I'd have read wrong numbers. [bug, low]
  WISH (again, high): custom items in the extension — going to sw5e.com's builder for a story item and reloading is 12+ actions and only works because the merge is good. [missing, high]

## A8 — Short rest, hit dice
- HP 11/12, hit dice 1/1 d10, force points 3/5, Channel the Force 2/2.
- **Short rest** → "**Short rest: done. To heal, roll hit dice ("roll d..." in the tracker).**" ✓ tells me what to do next. Force points stayed 3/5 ✓ (Guardian regains them on a long rest only). "Undo: Short rest" offered.
- Tracker "Hit dice (d10) **roll d10 +2**, then Heal" → dock "Hit die (d10)" → Roll +2 → 4 + 2 = **6** ("4 + 2 per die") → "**Heal 6 and spend the d10**" → "✓ Healed 6, spent the die"; HP **12/12**, Hit dice **0/1d10**.
  - I was only 1 HP down: the button spent my only hit die without a word, and the badge says "Healed 6" although only 1 HP was restored (the tracker's own Heal button elsewhere says "Healed x (of y; at maximum)").
  WISH: when spending a hit die, show "1 HP missing" before rolling and say "Healed 1 (of 6)" after; maybe ask before spending the last hit die for 1 HP. [improvement, medium]
  - The "Undo" button kept offering "Undo: Took 4 damage" even after a Load from SW5E and many other changes in between — I wasn't sure what it would undo by then. [confusing, low]

## A9 — Inspiration, used on Stealth
- Tracker "☆ Inspiration" → "★ Inspired" (green). On the tablet strip nothing shows it (the strip lists Soresu/Heroism/Guidance when active, but not Inspiration).
- Skills → **Stealth** → dock "Stealth (DEX)": **no "use Inspiration" option**; chose Advantage by hand → 16 / 6 (struck) → **17**. Back to the tracker → "★ Inspired" → "☆ Inspiration" to spend it.
  WISH: when Inspired, the roller offers "Use Inspiration (advantage)" and spends it in the same tap; show "Inspired" in the phone/tablet strip. [improvement, medium]
  - (rules) Mesh armor shows only "AC 13 + Dex modifier (max 2) · Medium"; its SW5E armor properties (any Stealth disadvantage or Strength requirement) aren't shown, so I couldn't check whether my Stealth roll should have had disadvantage. [rules, low]

## A10 — Long rest, 300 XP
- **Long rest** → "**Long rest: regained 2 force points, 1 hit die.**" → Force points 5/5, Hit dice 1/1 ✓ (half of total, minimum 1 ✓). HP was already 12/12.
- **XP**: Overview → Edit → "Experience points" / "Credits" ("Type a number, or +50 / −80 to add or subtract. Changes stay in this browser until you save them to SW5E.") → "+300" → Done → "300 XP · next level at 300 (0 to go)", full bar, and "**You have unused levels. Click below to add more class levels.**" — there is nothing below to click (builder wording, copied as-is).
  WISH: a **Level up** flow in the extension. For me next: Guardian 2 (HP 1d10 or 6 + Con 2; Force-Empowered Strikes (spend force points for +1d8 per point on a melee hit, max "Focused Strikes" 2d8); **Fighting Style** picker; Force powers known 5 → 7; Force points 4 → 9 with Wis), then Guardian 3 (**Guardian Focus = Form archetype** picker, its lightsaber form + the extra Channel the Force effect, **Guardian Aura** picker (1 known, 5 ft), powers 9). Until then the chip should say "Level up in sw5e.com's builder, then Load from SW5E". [missing, high] / [confusing, high]
- **Notes** → Edit → appended "Session 1" (rolls, **debt to Kessa 370 cr**, Soresu/Heroism, loot, Inspiration, 300 XP). Markdown renders ✓. (A stray line "(now a custom item…)" ended up outside the list because the textarea's last line was empty — my mistake, harmless.)

## Praise (what not to break)
- Force casting block: light / dark / universal DC and attack side by side, each power tagged Light/Dark/Universal and Concentration with full text — much better than the builder.
- Cast spends the right points ("Cast Heroism at 1st level (2 force points). Concentrating."), concentration chips in the strip, Effects lists what's running with "since 14:45", End works.
- Lightsaber form picker with prerequisites ("Aqinos Form (needs The ability to cast tech powers)"); Adopt/End as a state; "Learn a force power…" list with "(needs X)" and the "⚠ 6 known, the table gives 5" check.
- Tremorsense 30 ft picked up from the species text (the builder showed none).
- 🔍 filter on the tablet: "Soresu", "Heroism", "Medpac", "credits" took me straight to the button I needed mid-fight.
- Medpac Use → On me → rolls d10 + Con → Heal N in one tap, decrements the stack; hit die "Heal 6 and spend the d10"; temp HP absorbed first; Undo on damage.
- "Not enough credits: 480 cr needed, 150 cr available." — clear; Pay any price; "+150" arithmetic in the credits box.
- Short rest tells me what to do next ("To heal, roll hit dice…"); long rest says what came back ("regained 2 force points, 1 hit die").
- Load from SW5E after adding custom items on sw5e.com kept every local change (HP, force points, tweaks, credits, inventory, notes) and brought the custom items in with a "custom" tag.
- Tweaks: keyboard-friendly add row, reasons kept, changed numbers underlined/green, skills marked "Proficient".

## Hand-off (end of part A)
- **Character**: **Maasha Vaal (Panel)** — Togruta Guardian 1, Jedi background (feat Formfighting Dabbler → **Soresu Form**), Lawful Light. **sw5e.com id …**. Viewer: http://127.0.0.1:8765/dev/phone.html?w=800&h=1000 → select "Maasha Vaal (Panel) — Togruta Guardian 1".
- **Level 1, 300 XP** (level 2 reached; "You have unused levels…" chip). Plan: Guardian 2 (Fighting Style) → Guardian 3 (Form archetype + aura) → Guardian 4 (ASI).
- **HP 12/12**, no temp HP, death saves clear, **Hit dice 1/1 d10**, **Force points 5/5** (2×level + Wis 3), **Channel the Force 2/2** (Lend Aid, written in its "Your choices" box), Inspiration off (spent on Stealth), exhaustion 0, no active effects.
- Abilities: Str 16, Dex 12, Con 14, Int 8, **Wis 16** (15 + tweak +1 Formfighting Dabbler), Cha 10. **AC 15** (mesh armor 13 + Dex 1 + light physical shield 1), Init +1, Speed 30, Passive Perception 15, Prof +2, Tremorsense 30 ft. Saves Con +4, Cha +2. Light/Universal force DC 13 / attack +5; Dark DC 10 / +2.
- **Powers known (5/5)**: at-will Guidance, Saber Reflect, Saber Ward; 1st Heal, Heroism (Battle Precognition swapped out in the sheet — useless in armor).
- **Lightsaber** +5 / 1d6+3 energy (versatile 2d4); Vibrodagger 1d4 (not equipped); Unarmed +5 / 4.
- **Tweaks (6, with reasons)**: Wisdom score +1 (Formfighting Dabbler); proficient Survival (Togruta Wild Hunters), Athletics + Perception (Guardian), Insight + Persuasion (Jedi).
- **Credits 150 cr**. **Owe Kessa 370 cr** (Notes only).
- **Inventory (13 rows, 51.25 lb)**: Lightsaber (equipped), Vibrodagger, Mesh armor (equipped), Light physical shield (equipped), Clothes common, **Strength Stim (Basic) ×1**, **Medpac ×1**, Backpack, Bedroll, Field rations ×10, Glowrod, custom: **Coded datapad (smuggler's coordinates)**, Copy of the Jedi Code (both custom items added on sw5e.com, came in through Load from SW5E).
- **Not in the sheet** (Notes only): languages Togruti + Huttese (sheet lists only Galactic Basic), debt to Kessa, Lend Aid as a usable effect (only text), Heroism's temp HP / frightened immunity, Soresu halving (applied by hand).
- **sw5e.com's copy** differs: no skills, no tweaks, Wis 15, no personality/notes, starting gear + 2 custom items, 150 cr, XP 0, Battle Precognition still known there. The sheet says "Not synced to SW5E: play state, Class choices, Feature notes, Feature choices, Tweaks, Personality…, Notes, Inventory". **I did NOT sync.** For part B: level in sw5e.com's builder (Guardian 2, 3), Load from SW5E, and check that tweaks, the Guidance/Battle Precognition swap (class choices), Soresu pick, inventory (datapad, stim, medpac), notes, credits, XP survive.
- Browser: closing my two tabs (sw5e.com tab and the viewer frame tab) now.
