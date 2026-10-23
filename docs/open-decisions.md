# Open decisions and things to know

Every rules reading that needed a choice, numbered in the order it was made, and what isn't modelled yet (at the
end). An entry is updated when the code changes it; check here before deciding a rules question again.

_2026-10-16. Built without supervision as asked ("continue to steps 3 and 4 unsupervised and validate using the
panel of players as you go. Document any matters that need later decisions or awareness"). Each decision says what
was chosen and the alternative, so it can be changed later. Validation: a panel of five player agents (two classes
each) and a checker re-running every repro. Step 3: 100 findings, 45 after merging, fixed in `1ff126b`. Step 4 (powers):
74 findings, 35 after merging, fixed in `8350aea` and `f3eba28`; decisions 13-22 come from that round._

## Decisions to confirm

1. **Where choices are stored.** Picks from fighting styles, masteries, forms, focuses, supremacies, improvements,
   extra maneuvers and granted powers go in the character as
   `featureChoices = { "<slot key>": [{ name, note?, weapons? }] }` (sw5e.com keeps unknown fields). Keys are readable
   and name the source: "Fighter: Fighting Style", "Feat: Fighting Stylist (Fighter ASI #2)",
   "Feat: Fighting Stylist (Fighter ASI #2) › Formfighting Style". Keys from before the panel fix ("Feat: X #2") are
   still read. If SW5E renames a feature or a feat, or a feat/level is removed, its picks are kept and listed under
   **Stored choices not in use** (Classes section) with a Remove button. *Alternative:* store picks inside their source
   (the ASI entry, the option pick).
   Archetype list picks (Hunter's Prey, totems, Engineer modifications) use the existing `classes[i].options[list]`,
   modified items `classes[i].modifiedItems`, and each modification's item `item: 1`. Class powers stay in SW5E's own
   `classes[i].forcePowers/techPowers` (and `archetype.*`) so its engine keeps listing them.
2. **Order things were gained.** "If you already know at least N…" (Formfighting Dabbler 1 → 3 → 7 → the rest,
   Formfighting Mastery, Superiority Mastery) and feat prerequisites only look at what came before: species, the
   background feat (1st level), then by class level: features, option picks (at the level the list first allowed
   that many), ASI feats (at their ASI's level); custom feats last. Earlier slots count by their count, filled or not (more picks than allowed don't count).
   The order of levels across two classes isn't recorded, so multiclass characters are ordered by class level.
   *Alternative:* record the character level of every pick.
3. **Powers from feats count as "the ability to cast".** For prerequisites like "The ability to cast 3rd-level force
   powers", powers known from earlier feats and slots count at their level (so Force-Sensitive → Improved → Greater →
   Master works for a non-caster); a feat's own powers never count for itself. Forms ("restricted to forcecasters")
   accept any force power known, including Force-Sensitive's. *Alternative:* only class casting counts.
4. **"Counts as" powers.** Aqinos Form's tech powers "count as both universal force powers and tech powers": both
   kinds. Inquisitor's and Artificer's force powers "count as tech powers": tech only (cast with tech points). Path of
   Synthesis' and Way of Technology's tech powers "count as universal force powers": force only.
5. **Superiority dice** from Superiority Style/Mastery and Splashclass Fighter join the class pool; its die is the
   largest of the sizes. *Alternative:* separate pools with their own sizes.
6. **Weapon groups.** Weapon focus/supremacy apply to "blade weapons", "carbines"… but SW5E's data has no weapon groups:
   the player ticks which weapons count. "If you are proficient with it" is checked (since 2026-10-23: a focus on a
   weapon you aren't proficient with gives nothing). *Alternative:* a hand-written group table.
7. **Repeating a choice under a repeated feat.** The same weapon focus, supremacy or class/splashclass improvement
   chosen under two copies of the feat is flagged ("can't be chosen twice") and its bonus counts once. The rules don't
   say; this can be relaxed.
8. **Multiclass Improvement's "other chosen class"** is the other improvement chosen in the same feat ("Choose two of
   the multiclass improvement options"): Berserker + Monk adds half the Monk levels to Rages/Rage Damage and the
   Berserker levels to the Martial Arts die. Falls back to a class named in the pick's note.
9. **Archetypes SW5E's data calls non-casters** (Rakatan Order: casterType None) get their tech points (table +
   the best of Intelligence/Wisdom/Charisma), save DC and attack worked out by the sheet; SW5E's own numbers for them
   are wrong (2 points instead of 6 at Monk 5).
10. **Lightsaber forms** are adopted as a state lasting "until the start of your next turn" (or "the end of your next
    turn" where the form's text says so: Soresu, 2026-10-17); adopting another form
    replaces it. No turn tracking, so End it by hand. **Concentration**: casting a concentration power starts an
    effect that replaces the previous one; damage doesn't end it.
11. **Same benefit twice.** The same modification on two modified items (Bonded Plates on armor and shield,
    Accelerated Movement) counts once unless its note differs (Resistance: fire, Resistance: cold).
12. **Data errors in SW5E's rules** (to report upstream or decide):
    - Biotech prerequisites "Brawny Arm Prothesis" etc. are matched to the right option within two letters.
    - Astrotech prerequisites "Prototype Pulsating Phased Array" and "Target Marking Phased Array" name options that
      don't exist: shown as a hint, not enforced. *Decide what was meant.*
    - Kro Var "Shape the Rainclud" is matched to "Shape the Raincloud".
    - The maneuver "Call to Arms (Improved)" lists itself as its prerequisite (ignored).
    - Tactical Specialist's maneuver table exists only in its text (with a malformed header); it's read from there.

13. **Powers a feature only lets you cast** ("You can cast the *telekinesis* force power at 5th level without spending force
    points", Growing Momentum, Battle Meditation, Inquisitor's Wrath) aren't powers you *know*: they don't meet power
    prerequisites (Knight Speed needs Burst of Speed), don't count as "the ability to cast" for feats, aren't
    duplicates, and stay learnable. Powers you *learn* ("You learn the *burst* force power") count fully. *Alternative:*
    treat any castable power as known.
14. **Feat prerequisites when the feat was taken.** "The ability to cast 3rd-level force powers" is checked with the
    casting the feat's own class had at that ASI (a background feat: the starting class at 1st level), the other
    classes as they are now (the order of levels across classes isn't recorded), plus powers learned from earlier
    feats.
15. **High-level casts in a multiclass** follow the class with the most levels that casts that kind ("consult the rules
    for casting in the class in which you have the most levels"), literally: an Adept Specialist 13 / Consular 7 casts
    4th-level force powers once per long rest, and 5th and 6th freely. A tie takes the stricter rule.
16. **Separate force and tech allowances.** SW5E keeps one set of once-per-rest flags
    (`currentStats.highLevelCasting.level6…9`). The kind of the class with the most casting levels uses them; the other
    kind uses extra keys in the same object (`tech4`, `force5`…), and Making This Up As You Go a second one
    (`level4b`). sw5e.com keeps them; its own sheet only shows level6-9.
17. **Shared uses.** Evil Eye's two powers share one use ("Once you've cast a power using this feature…"); System Override
    and Growing Momentum spend the feature's own uses. Flow-Walking's free *phasestrike* spends Flow-Walking's uses ("You
    can use these features a combined three times", +1 at 9th, 13th and 17th: the feature's own levels), the same pool
    as its Martial Arts/Focus use. A once-per-rest grant whose feature already counts its uses (Telekinetic
    Ministrations) spends that one counter.
18. **"Your choice" casting abilities** (Archaeologist by alignment, Evil Eye, Miraluka, Rakatan, Monk focus): until a
    choice is made they use the best of the allowed abilities and are listed under Still to choose; once chosen, that
    one ability counts for all of the feature's numbers (2026-10-23, after the GM review). Where SW5E itself leaves
    the choice open on every roll, see 104.
19. **A named power with its own prerequisite** (Telekinesis needs Force Throw, Valor needs Resistance) is given
    without asking for the prerequisite (specific beats general). The handbook says you must keep knowing the
    prerequisite to cast the new power; that isn't enforced for given powers.
20. **The Vow of the Devoted** counts as "the ability to cast" at its Max Power Level, like class tables.
21. **Close Quarters / Sniping Caster** accept at-will powers that call for a weapon attack (Lightning Charge, the Strike
    and Shot powers) as "requires an attack roll".
22. **A class feature's power that's also a class pick** raises that class's Powers Known by one ("If you already know
    that power, you may learn an additional power"), rather than asking the player to swap it.
23. **Medpacs and repair kits on yourself** (2026-10-17) roll "dice equal to the size of their Hit Die" + Constitution
    modifier (at least 1) in the dice roller, without spending a Hit Die, as the item text says. With Hit Dice of
    different sizes, the size the character has most of is used; on a tie, the larger (the text doesn't say). The
    item is used up when you press Use, whether or not you then press Heal. Vitapacs give back spent Hit Dice at
    once, of a random size when several sizes were spent (as the text says). Creature type ("beast or humanoid",
    "droid or construct") isn't checked. *Alternative:* ask which die size on a tie.

### From the second player panel (2026-10-17, see docs/wishlist.md)

24. **Load from SW5E merges.** Everything edited here, classes included, is merged three ways against the copy
    last loaded: what only the site changed is taken (a level added in its builder), what only this viewer changed
    is kept (a level added here), lists of names take both sides' additions and removals, and where both changed the
    same thing this viewer's value wins and the load message names the field. (Until levelling up moved here, class
    levels always came from the site.) *Alternative:* ask on every clash.
25. **Effects that end on rests.** A short rest (1 hour) ends temporary effects lasting an hour or less, a long rest
    (8 hours) those lasting 8 hours or less, and concentration (sleep). Durations are read from the effect's text
    ("1 minute", "up to 1 hour", "until the end of your next turn"); effects without one stay until ended. Dropping
    to 0 HP ends concentration and Rage; forms and other states stay (End them by hand). Undo brings them back.
26. **Exhaustion** is explained level by level and the roller applies its disadvantage (ability checks and initiative
    from level 1; attacks and saving throws, death saves included, from level 3; advantage and disadvantage cancel).
    Halved speed (level 2) and speed 0 (level 5) are applied to Speed, and level 4 halves the hit point maximum
    (2026-10-23, after the GM review); level 6 is described, not applied. A long rest removes one level, or what a
    feature says (Frenzy: two).
27. **Force Recovery and similar** ("regain force points equal to half your consular level + your Wisdom or Charisma
    modifier") are offered after a short rest: half the level rounded down (unless the text says up), plus the best
    of the abilities named, at least 1, never more than was spent; the use is marked.
28. **Healing items at full HP**: "On me" says how many HP are missing and is off at full HP; otherwise decision 23
    stands (the item is used up on Use). A hit die rolled at full HP isn't spent.
29. **Keyboard picks.** In the "Add…", "Learn…", "Choose…" and Archetype lists, what the arrow keys or typing land on
    is added only with Enter; leaving the list puts it back. A click or tap in the open list adds at once.
30. *(Replaced by decision 76.)* **Clicks right after a redraw nobody asked for** (a recalculation finished, another tab saved) are ignored for
    0.4 s on the sheet's buttons, with "The sheet just updated: click again", rather than landing on a button that moved.
31. **A natural 1 on an attack** shows Miss and stops suggesting damage, but the damage buttons stay (a GM may rule otherwise).
32. **The archetype** can be chosen from the class level its table names (3rd for every SW5E class).
33. **Species traits** are read from SW5E's species rules (not its features list, which gives Togruta and Zabrak a
    Darkvision their species rules don't have): their skill and tool proficiencies apply (choices from the trait's
    notes), and their senses and defenses are listed; Zabrak Toughness applies (decision 40). Wookiee Hide's AC, Powerful
    Build and species unarmed strikes aren't applied yet (wishlist W-144, W-147, W-150).
34. **What needs a recalculation.** Notes, personality, appearance, feature notes and credits are shown from the
    character itself, so changing them doesn't send the character to sw5e.com again. Until a recalculation arrives,
    the last one is shown (with the banner saying it's being updated), not SW5E's plain copy without tweaks.
35. **Creating and levelling up here** (2026-10-18) write what SW5E's engine reads: classes[i].skills (each class's
    skill picks), classes[i].expertise, background.skills and background.languages, background.feat.abilityScoreImprovements
    (the background feat's +1), species.abilityScoreImprovement and abilityScoreImprovementSelectedOption, hitPoints and
    abilityScoreImprovements as its builder does. What it has no field for: tools are customProficiencies entries
    marked `from` (the picker that chose them); species and other extra languages are customLanguages, with their
    source in a languageChoices field; a feat taken at an ability score improvement keeps its +1 in that entry's
    abilitiesIncreased, applied by this sheet (SW5E's engine ignores it, so sw5e.com shows one point less there).
36. **Levelling up raises XP** to the new character level's threshold when it's lower, as sw5e.com's builder does.
    Multiclassing checks SW5E's ability minimums for the new class and the current ones; the multiclass skill and tool
    (Operative: any one skill and one tool) are picked in the class card afterwards.
37. **The same skill from two sources** isn't offered twice; when a background's list is used up by class skills, any
    other skill can be chosen ("choose a different proficiency of the same kind").
38. **Starting equipment** resolves each phrase against SW5E's items ("simple blaster": a list of simple blasters;
    "a light or medium physical shield": either), worn armor, one shield and weapons are equipped, and what SW5E's
    item list doesn't have (packs, an insignia, a book) becomes a custom item (cost and weight 0, renamable).
    Pack contents aren't in SW5E's data, so packs aren't unpacked (wishlist W-079).
39. **The species' language** (Zabraki, Kel Dor…) is filled in for SW5E's engine, which adds it only when the
    character records it (its builder never does); a character created here records it.
40. **Zabrak Toughness and the like** ("Your hit point maximum increases by 1, and it increases by 1 every time you
    gain a level") apply. A tweak made earlier for the same thing now counts twice: remove the tweak.
41. **An older copy on sw5e.com** (one saved before the copy last loaded here, e.g. a save that failed when its sign-in
    had expired) never replaces this viewer's: Load keeps every field that differs as a change to sync, and says so.
    (Seen in the panel: a Load took Berserker 1 from the server over a Berserker 4 that never reached it.)
42. **Conditions** are play state in SW5E's own currentStats.conditions (it lists them; Sync sends them). The roller
    applies what they do to the character's rolls: Poisoned and Frightened, disadvantage on attacks and checks;
    Blinded and Prone, on attacks; Restrained, on attacks and Dexterity saves; Invisible, advantage on attacks;
    Paralyzed, Stunned, Unconscious and Petrified, Strength and Dexterity saves fail automatically. Advantage and
    disadvantage from all sources (features, states, conditions, exhaustion, War Caster) cancel out. Speed shows its
    value under Grappled, Restrained… (0) and Shocked or exhaustion 2 (halved). Dropping to 0 HP adds Unconscious;
    healing removes it. Prone gives disadvantage on melee attacks; on ranged attacks it's offered as a note ("if the
    target is within 30 feet"), and Frightened's "while the source is in sight" is noted, for the player to choose
    the mode (2026-10-23, after the GM review).
43. **Damage types.** Damage from the tracker can have a type; resistance (halved, rounded down), immunity (0) and
    vulnerability (doubled) apply when the character's defenses name that type without a condition; conditional ones
    ("…from weapons") are mentioned, not applied. True damage is never reduced. *To confirm: SW5E's true damage.*
44. **Concentration.** Damage while concentrating offers the Constitution save (DC 10 or half the damage); War Caster
    and the like give advantage; a failure offers to end the power.
45. **Rounds.** Combat → Start counts rounds; Next round ends effects that have run out: "until the start of your next
    turn" after one round, "the end of your next turn" after two, minutes and hours as 10 rounds a minute. Effects
    started before combat count from round 1.
46. **Species traits with uses** (Second Heart: once per long rest) get counters; at 0 HP, "drop to 1 hit point
    instead" is offered when a use is left.

47. **Power rolls from text.** "Takes 1d6 force damage", "regains hit points equal to 1d8 + your forcecasting
    ability modifier" and "reduced by 1d6" are rollable. Higher-level casting adds "1d8 for each slot level above 1st",
    and at-will damage grows at 5th, 11th and 17th character level ("by 1d6", "by one die", or "increases to 2d4" at
    each step). Damage given as a fixed number, or rolls for several targets, stay text.
48. **Powers on you.** A power whose benefits are yours (Battle Precognition, Saber Ward, Target Lock, Battle
    Meditation) applies them while its effect lasts. One whose benefits go to "the creature" or "the target" (Heroism,
    Guidance) asks **It's on me** first, since you may have cast it on someone else. Battle Precognition's "base AC
    becomes 13 + your Dexterity modifier" is an unarmored AC formula, used only when it's the best. Heroism's
    temporary hit points (your casting modifier) are offered each round, not added by themselves.
49. **Casting options cost points on top.** One option per cast. Twinned costs the power's level (1 at will); the
    others cost what their text says. A cast that costs no points (at will, once per rest, a feature's use) pays only
    the option.
50. **Dice from active powers.** Dice a power adds to every roll of a kind (Battle Meditation on attacks and saves)
    are ticked. Target Lock's 1d6 (only against its target) and Guidance's die ("one ability check of its choice") are
    offered unticked, saying so (2026-10-23, after the GM review). A die used once ends the power when the roll is
    made with it.
51. **Class resources from the dice dock.** Offered unticked on the roll they apply to. Ticking spends: on the roll
    made, or at once on a roll already made (Close Call after a miss); unticking gives it back. Maneuvers count when
    they "add the superiority die" to the attack or its damage; ones that need a save or a choice stay on their
    cards. Force-Empowered Strikes offers +1d8 up to the Focused Strikes column, only on melee weapon damage.
52. **Foretelling rolls** (Force Visions) are play state kept in this browser, rolled on each long rest and listed in
    the tracker. Using one replaces the d20 before rolling; the "once per turn" limit is the player's.
53. **Ashla** (Force Affinity): after a light side power cast at 1st level or higher, a button gives +level hit point
    maximum (and current) for 1 minute. It isn't applied by itself, so a cast on someone else doesn't trigger it.
    A new one replaces the last.
54. **The Way of the Mynock** applies Saber Ward's resistance for the stance's minute and counts the special
    reactions (proficiency bonus); each use rolls Saber Reflect's reduction.
55. **Frenzy** is free the first time after a long rest. Later frenzies add one level of exhaustion when the rage
    ends (End, or the round count running out). A rage ended by dropping to 0 or by a rest doesn't add it; add it
    by hand. Frenzied Approach's "reduce exhaustion by 2" on a long rest was already applied.
56. **Reckless Attack** lasts until your next turn: advantage on melee weapon attacks using Strength, and a note
    that attacks against you have advantage (the sheet doesn't roll enemies' attacks).
57. **Fighting-style marks** are reminders with the style's text and its duration ("until the end of your next
    turn"). Defense Style's damage reduction isn't subtracted by itself (it depends on the attacker).
58. **Channel the Force.** The class effect chosen (Cause Harm or Lend Aid) is written to the feature's notes; the
    form's own effect is added. Use spends a use and shows the save DC (universal force) and the amount ("guardian
    level + Charisma modifier, minimum +1"). Lend Aid offers Heal on yourself.
59. **Infuse Item** is an effect until your next long rest: weapons get attack and damage, armor and shields get AC.
    Infused armor or a shield gives its AC only while it's worn (2026-10-23, after the GM review).
60. **Weapon Expert's damage advantage** rolls the weapon's own dice twice; the higher set counts. Other dice on the
    roll (Sneak Attack, riders) are rolled once.

61. **Custom items** go in `customEquipment` (SW5E's own custom items) with weight, cost and description. Your name
    for an item (`label`) and a note (`notes`) are the sheet's own fields on the entry. They are saved with the
    character; sw5e.com keeps them but doesn't show them.
62. **An enhanced weapon or armor on a base item.** The base is its own entry, marked `enhancedBy`, so SW5E's engine
    computes its damage or AC, and its weight counts. The enhanced entry has `baseItem`. The sheet shows them as one
    row and uses the enhanced name in Weapons & Attacks. They're equipped and removed together; the weapon bonus goes
    to that base. Untying removes a base that was added with it, and keeps one you already carried.
63. **Equipment packs** come from SW5E's handbook (the Equipment chapter, fetched with the rules data). Adding a pack
    adds its contents, merged into stacks you have. Contents not in SW5E's item list become custom items. Starting
    equipment unpacks packs the same way.
64. **Shopping and debts.** Pay takes a discount % and who you buy from. When the credits fall short, you can pay
    what you have and owe the rest, or owe it all. Debts (`debts`: who, how much, what for) are paid back from
    credits or marked settled. What you paid is kept on the row (`paid`).
65. **Credit history** (`creditLog`, the last 50) records every change made in the sheet with its note: the credits
    box, buying, selling, paying back. Changes made on sw5e.com aren't in it.
66. **Selling** defaults to half the standard price, for the number sold; the price can be changed. Selling the last
    enhanced item sells its base with it.
67. **Shots** are play state kept in this browser, per weapon with the reload property. Each attack rolled here uses
    one; −1 is for shots fired without rolling (burst and rapid fire count as several: press it again). Reload takes
    one of the weapon's ammunition from the inventory: the plain item ("Power cell") first, then an enhanced one.
68. **Rarities** use SW5E's names with the usual ones: Standard (common), Premium (uncommon), Prototype (rare),
    Advanced (very rare), Legendary, Artifact.
69. **Armor properties.** Bulky and Obtrusive (or SW5E's stealth-disadvantage flag) give disadvantage on Stealth.
    The roller says "relies on sound" or "relies on sight", and you choose Normal when it doesn't apply. An unmet
    Strength requirement is −10 ft speed, Cumbersome −5; each counts once. SW5E's data gives Mesh armor no properties.
70. **Item search** needs every word, in any order. It ranks the exact name first, then names starting with the
    text, then names whose words start with it; plain items come before enhanced ones and shorter names first. Packs
    are listed with the items.

71. **Species AC traits** ("While you are unarmored or wearing light armor, your AC is 13 + your Dexterity modifier")
    are AC formulas like Unarmored Defense, and only the best one applies. In light armor the formula adds what it
    beats the armor's base by (Combat suit 11: +2). The AC hover lists the formulas not used.
72. **Natural weapons.** A trait's unarmed die is used when it's larger than SW5E's; die steps (Brawler) count from
    it. With finesse, Dexterity replaces Strength when it's better. SW5E's engine adds no negative Strength to unarmed
    damage, so the damage changes by Dex − max(0, Str) and the attack by Dex − Str.
73. **Carrying capacity**: Powerful Build or Brawny doubles it; both together triple it ("If it would already
    double, it instead triples"). Push/drag/lift scales the same way; the variant encumbrance thresholds
    (Strength × 5 and × 10) don't change.
74. **The ability breakdown** lists the species, each Ability Score Improvement (class and level), the background
    feat's +1 and tweaks; anything left over is shown as "other".
75. **Tweaks that count twice.** A tweak is flagged when its reason names a feature or trait the sheet now applies,
    and both add a bonus to the same number (Wookiee Hide on AC, Zabrak Toughness on HP). Removing it is the
    player's choice; the sheet doesn't do it by itself.

76. **The click guard** compares the control under the pointer before and after every redraw. If a different one
    moved there, a click within 24 px in the next 0.7 s is ignored, with a message that keeps the last notice's Undo.
    A click on the same control goes through, so no click is lost to a redraw that changed nothing under the
    pointer. (Replaces decision 30's blanket 0.4 s after background redraws.)
77. **Section jumps are instant** (no smooth scrolling), so a click right after a jump lands where it's aimed.
78. **The highlighted section** is the one crossing a line a quarter of the way down the window, under what's pinned.
    A section you jumped to stays highlighted until you scroll by hand; at the end of the page, it's the last section
    on screen.
79. **The phone strip**: ☰ lists every section and the More menu's main actions. The strip doesn't slide by itself
    within 2 s of touching or swiping it, and it moves without animation.
80. **Notices** last 6 s, 10 s when they have a button (Undo, Roll…), 12 s for errors. Recent messages keeps the last
    15 notices from actions; background recalculation messages aren't in it.
81. **The class table on phones** is a list: each column with this level's value → the next level's.
82. **The dice dock never takes the focus** from a text box outside it (the tracker's Amount) when it opens or
    updates.
83. **A new character is saved to sw5e.com once.** Before creating it, the bridge reads the account's characters. If
    one already has the character's localId (an earlier try that timed out, or a retry in a fresh tab), that copy is
    used, and changes made here since are kept as local changes for Sync. If the account can't be read, nothing is
    created.

84. **Choices are picked, not typed.** A feature's choices (classes.js `asks`: one of its options, an ability, skills,
    tools of a kind, weapons, damage types) get pick lists with a count on its card. The picks are words of the
    feature's notes (`featureNotes`), where the rules reading already looked; the notes box shows the other words, and
    typing there keeps the picks. Notes written before keep working. Species traits get pickers only under their rules
    name (SW5E also lists Human Versatility as "Proficiency").
85. **"One of the following skills: A, B, or C"** gives only the skill picked. Before, every listed skill after the
    first was applied (Gank, Kubaz, Tiss'shar, Umbaran, Xexto, Pyke).
86. **Force Affinity: Bendu** adds the lower of Wisdom and Charisma (at least 0) to force points: SW5E's engine adds the
    higher, as the consular's "your Wisdom or Charisma modifier (your choice)".
87. **Expertise has one picker** (the class card), with skills and the tools you're proficient with. Skills go in
    SW5E's `classes[i].expertise` (its engine applies them); tools stay in the Expertise feature's notes. Skills written
    in the notes earlier count as chosen, and move to the class field at the next change there.
88. **A modified item that requires attunement** ("Your modified weapon is enhanced, requires attunement…") counts one
    attunement slot, without being marked attuned in the inventory.
89. **Modification notes on damage**: a modification's sentence about dealing damage or hitting with the modified
    weapon is shown on its damage roll; nothing is applied (Celerity Oscillator's +10 ft lasts until your next turn).
90. **Lightsaber form rules** come from the PHB's Customization Options chapter: "Each known form can be adopted on your
    turn by using your bonus action", each chosen once, forcecasters only. They name no weapon, so the sheet doesn't
    check one.
91. **Large counters** (more than 12, such as 16 or 20 force points) show a bar instead of pips.

92. **Property explanations** use SW5E's weaponProperties and armorProperties texts (the rules data), matched by the
    property's first words ("power cell (range 50/200)" → Power Cell); armor looks at armor properties first.
93. **Two-handed and a shield**: a shield takes a hand, so an equipped two-handed weapon (or an enhanced weapon on a
    two-handed base) with an equipped shield is flagged: when equipping, as a chip on the weapon row, and on the attack
    roll. Nothing is blocked; shield generators are treated like other shields (SW5E's data has no text saying
    otherwise).
94. **An AC "set to" tweak** is shown next to AC ("set to 14 by a tweak"); equipping armor or a shield while it's there
    says the tweak overrides it. Other "set to" tweaks aren't flagged.
95. **Tweak targets** are grouped (Combat, Ability scores, Saving throws, Skills, Powers, Maneuvers, Weapons), Combat
    first, so typing "AC" in the closed list finds AC.
96. **After a sync**, the notice lists the effects and features this sheet applies that sw5e.com's engine doesn't
    (items, class features read from text, states, picks), with their numbers; up to six, then a count. Long notices
    stay up longer (up to 20 s); all are in Recent messages.

97. **The damage bonus by source**: the ability modifier (no negative Strength on unarmed strikes, as SW5E), each
    effect, feature or tweak on weapon damage by name, and the rest as "other (weapon, style…)" (an enhanced weapon's
    own bonus, a fighting style SW5E applies). While the numbers are being recalculated, or if the parts don't add
    up, it stays one "damage bonus".
98. **Rolls kept with the character**: Sync to SW5E sends its latest 15 rolls as the character's `rollLog` (without
    the unticked options); loading or importing a character adds those rolls to the log. Rolling doesn't count as a
    change to sync by itself: the rolls go with the next sync.

99. **Restoring a version** (version history): its fields (inventory, classes, tweaks, feature notes and choices,
    credits, XP, notes, personality…) become local changes, recorded in the history as "Restored the version of …";
    play state (HP, points, uses) stays as it is. Undo puts the character back; Sync to SW5E sends the restored copy.
    Compare lists the differences field by field (classes and levels, items added or removed, which notes changed).
100. **Backing up one character** writes the same file format as the full backup, holding only that character (with
    its recent rolls); importing it merges like a full backup. The four exports are named by what they hold: Back up
    this character, Back up all characters, Export for sw5e.com, Export SW5E's copy with its numbers. The history card
    shows when this character and all characters were last backed up (and how many characters the full backup held).
101. **The first session guide** is a README section and More ▾ → First session guide (also in the phone ☰): eight
    steps, from loading a character to resting.
102. **The app icon is hidden on phones and tablets** (900 px or narrower), where the strip's ☰ is the menu: it looked
    like one (W-135). Wider screens keep it as the app's mark. *Confirm, or say if the icon should open the ☰ menu
    instead.*

_2026-10-22/23: a GM review of the player panel (`docs/panel/2026-10-22/dm-review.md`) and the owner's decisions on
it._

103. **Tweaks have three modes** (owner, 2026-10-22): **Add** (on top of everything else), **Set to** (exactly that
     number, for every number, ability scores included: effects such as a stim are shown as not applied) and
     **Bump to** (at least that number; stored as the tweak's `floor`, which this sheet reads and sw5e.com's engine
     ignores). The GM review asked for "set to" on ability scores to set the base instead; the owner kept it exact
     ("otherwise it's the same as Bump to") and had each mode explained where it's chosen.
104. **"Your choice" abilities on rolls** (owner, 2026-10-23): where SW5E leaves the ability to the player each time
     (a Consular's, Guardian's or Sentinel's universal force powers: "Wisdom or Charisma (your choice)"; a maneuver's
     ability: Physical STR/DEX/CON, Mental INT/WIS/CHA, General any), the roll uses the best one and the dice card's
     Ability menu switches it; save DCs list the others ("DC 14 (WIS; CHA 13)"). An archetype caster whose choice is
     recorded gets only that one.
105. **Rolled dice are locked** (owner, 2026-10-23): once rolled, the dice and advantage/disadvantage stay; dice,
     bonuses, the modifier and the DC can still be added or changed, and each change is listed on the roll and in the
     log. Advantage on any single die (not only d20s) stays, as it's chosen before rolling.
106. **Same-name effects don't stack:** a second effect with the same name (two of the same calibrator on one weapon)
     is left out, with "apply anyway", as repeated tweaks are.
107. **States worded "while your X is active"** (Saber Storm) are started like other states (Start, a use spent, its
     duration from the text); their benefits apply only while active.
108. **The dice land flat** (owner, 2026-10-23): the table is seen from above, each die settles with the rolled face
     on top and its number upright; a d4 rests point up with its number at the point.

## Not done yet (known gaps)

- **Rakatan Focused Tech** (cast tech powers with focus points, focus maximum −1 until a long rest): the cost isn't
  stated (tech point cost, or 1 per level like the Vow?), so it isn't offered. *Decide the cost.*
- **Mechanist's merged powers** are kept in the class's own `techPowers` (SW5E's engine lists them), but SW5E computes
  Scout points, not Mechanist points: the sheet works its own points out (table + Intelligence).
- **Effects on computed casting.** Bonuses from items or feats to force/tech points, DCs and attacks apply to SW5E's
  numbers; where the sheet computes casting itself (feat-only casters, Rakatan, Mechanist, the Archaeologist's
  Intelligence), they aren't added yet.
- **Rakatan Order and Mechanist tech points** come back on a short or long rest; the tracker refills tech points on a
  short rest already, but the points' maximum comes from the sheet, not from SW5E.
- **Furious Force** checks casting time and concentration; heavy armor isn't checked.
- **Archaeologist's Knowledge is Power**, Chef's Brain Food (temporary points for allies) and Adept Specialist's
  Focused Breathing (force points from Second Wind) aren't modelled.

- **Swapping picks on a rest** (Style Strategist, the Fighter and Scholar class improvements, Malleable Maneuvering,
  Blademaster's Change Up, totems, Chimeric Adaptation, Customized Armor): lists say "can be changed on a rest" where
  the text says so, but there's no rest-time swap flow. Powers aren't limited to "replace one when you gain a level"
  either.
- **Options that only work during a state or while worn** (Chimeric Adaptation during the mutagenic transformation,
  Customized Armor while wearing the spiked armor) are shown as text, not applied; they'd need to join that state /
  the armor condition. Totem passives need "while wielding or wearing the object" too.
- **Titan's Power** ("ignore the two-handed property", damage on a miss) is shown as the feat's text only.
- **Shock Arm's** "better of Strength or Intelligence" uses the better one, with no picker.
- **Force points** use the better of Wisdom and Charisma (as SW5E's engine), with no way to choose the other.
- **Quick cast and use pickers**, and a **Lucky** button on rolls, are wanted but not built.
- **Splashclass Fighter's superiority dice** come back on a long rest, but share the pool that resets on a short rest.
- **Engineer modifications**: "install, replace or remove up to your Intelligence modifier per long rest" isn't
  enforced; prosthesis scores ("Strength score of your Brawny Arm Prosthesis increases by 2") aren't modelled; any
  lightweapon can be the modified lightsaber.
- **Maneuver prerequisites** "Companion" are hints (no companion data); "Proficiency in X" is checked against the
  sheet's skills.
- **Feat prerequisites** about species ("Type humanoid") aren't checked; ASI/feat counts per level are level up's
  (Classes & Progression).
- **Free-text sub-choices** remain notes: Echani weapon types, damage types for Environmental Shielding/Dewback,
  Vow of the Open Mind's skill, Kinetic Mastery's form, One with the Force's signature power…
- **Granted powers cast "as part of" something** (Ataru Form's force jump) stay text; Soresu's saber ward is applied
  by The Way of the Mynock.
- **Channel the Force effects other than Cause Harm and Lend Aid** (Makashi Riposte, Telekinetic Slash…) spend the
  use and show their text; their rolls aren't built.
