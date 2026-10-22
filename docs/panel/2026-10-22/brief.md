# Player panel, round 3: do feats, features and items raise the right numbers?

You are one player in a panel of five. Each player owns one area of the rules (below). For every source in your
area that should change a number on the sheet, check that the sheet changes **exactly** the numbers SW5E's text says,
by the right amount, under the right conditions, **and nothing else**; and that the explanation of each changed number
(the hover tip on desktop, the long-press sheet on touch: the same text) names the right source and why.

The owner asked for this: "validate that feats and other sources of enhancements correctly bump the statuses that they
should." Completeness and accuracy matter more than speed: a wrong number at the table is the worst kind of bug.

## The product

A Star Wars 5e (SW5E) character sheet: a web app (`app/`), also wrapped as a Chrome extension. It computes every number
with its own rules engine (`app/engine.js`, a mirror of SW5E's own engine on sw5e.com) and turns feats, features,
species traits, items, modifications, consumables and tweaks into **effects** that add bonuses on top
(`app/effects.js` reads item text, `app/classes.js`/`app/choices.js` class and species features, `app/viewer.js`
`derivedInputs` gathers them; `fxResolve` combines them). Each changed number is shown with an explanation
(`bumpTip` in `app/viewer.js`: "Without tweaks or effects: 13 → now 15 / +2 AC · Shield (Fine) while equipped").

## Your tool

`node dev/bump-check.js` draws a recorded test character with the sheet's own code (in Node: no browser), applies a
change, draws it again and prints every line that changed: what is sent to the rules engine (tweaks), the numbers
(AC, HP, saves, skills, weapons' attack and damage, casting, speed, initiative, passives, carrying capacity…), the
effects and tweaks with their sources, every roll the dice card offers, and the explanation of each changed number.
Read the top of `dev/bump-check.js` and the "What one change does" part of `dev/README.md` first.

```
node dev/bump-check.js --list
node dev/bump-check.js kadro-vos-panel --item "Strength Enhancer" --attune
node dev/bump-check.js consular-test-local --feat "Tough"
node dev/bump-check.js rorrwaak-panel --species "Bith"
node dev/bump-check.js maasha-vaal-panel --js "raw.classes[0].levels = 8; raw.classes[0].hitPoints.push(7,7,7,7)"   # Guardian 4 → 8
node dev/bump-check.js kadro-vos-panel --feat "Tough" --full      # both whole reports in dist/bump-check/
```
`--js` gets `raw` (the character as the sheet shows it: SW5E's character JSON with the sheet's own edits in place —
`classes[i]` with `levels`, `hitPoints` (one entry per level after the first), `abilityScoreImprovements`,
`archetype`, `options`, `maneuvers`, `expertise`…; `species`, `baseAbilityScores`, `equipment`, `customFeats`,
`tweaks`, `featureChoices`, `featureNotes`), `edits`, `itemState` (the sheet's own data: `itemState.effects` holds
temporary effects such as a used consumable or a cast power), `catalog` (SW5E's items) and `addFeat`/`addItem`.
Some feats and features ask the player to choose (an ability to raise, a skill): the sheet shows "Still to choose…" and
applies nothing until chosen. Find how a choice is stored by reading the code (`featureChoices`, `clsFeatureEffects`
`asks` in `app/classes.js`/`app/choices.js`) and make the choice with `--js`, so you test the effect, not the empty choice.
A fixed amount that needs no choice (a feat that raises Constitution by 1) should apply without asking: if the sheet asks, that's a finding.

SW5E's rules text is bundled: `app/data/sw5e/rules.json` (`modules.feats`, `species`, `classes`, `archetypes`,
`features`, `fightingStyles`, `fightingMasteries`, `lightsaberForms`, `weaponFocuses`, `weaponSupremacies`,
`classImprovements`, `multiclassImprovements`, `backgrounds`, `powers`, `conditions`) and
`app/data/sw5e/catalog.json` (items: plain equipment has `equipmentCategory`, enhanced items a `type`). Read them
with `node -e` and quote the exact sentence you check against.

## Rules for checking

- **Expected vs actual, number by number.** For each source: list every number its text should change (and how),
  run the change, compare. Watch for: missing bumps; wrong amounts; bumps that apply when they shouldn't (needs
  attunement, only while wearing no armor, only vs melee, only for one weapon kind, once per rest…); double counting
  (SW5E's engine already applies some things itself, e.g. ability increases chosen in an improvement, proficiency
  from a background; the sheet must not add them again); things that should stack and don't, or shouldn't and do;
  caps ("to a maximum of 20"); derived numbers that must follow (a higher Dexterity moves AC with light armor,
  initiative, Dexterity saves and skills, finesse and ranged weapons, Stealth/passives, carrying capacity for Strength).
- **Conditional bonuses** ("+1 to AC against ranged attacks") show both values where the stat appears
  ("13 · 14 vs ranged"), or as an option on the dice card: check that too.
- **Explanations.** Every changed number's explanation names the source (the feat, the trait and the species, the
  feature and its class/archetype, the item and whether it's while equipped/attuned) and the amount; temporary ones
  say how long. Wrong, missing or confusing explanations are findings.
- **Text-only effects** (advantage on some checks, resistances, senses, extra actions) should be listed where the
  sheet lists them (Defenses & senses, notes, roll options); a number that should exist and doesn't is a finding.
- Be systematic: go through **every** source in your area, not a sample. Many have no number to change (pure
  roleplay or table-time); list those briefly as "no number" and move on. Use characters of suitable class, level and
  prerequisites (change them with `--js` when needed).
- Do **not** edit any file outside `docs/panel/2026-10-22/`, do not use git, and do not start servers or browsers.
  Run one `bump-check` at a time (the computer is short on memory). Reading code to understand a result is fine.

## Your log and your findings

Write as you go to `docs/panel/2026-10-22/<area>.md` (create it early, append often): one line per source checked
(`OK`, `no number`, or `FINDING n`), then the findings, each with:
- a short title and a severity: `high` (a wrong number shown as right), `medium` (missing bump or misleading
  explanation), `low` (cosmetic, wording);
- the source and the exact SW5E sentence;
- the exact `node dev/bump-check.js …` command that shows it;
- expected vs actual (numbers and explanation text);
- where in the code you think it goes wrong (file and function), if you found it.

When done, reply with: how many sources you checked, how many were OK / no number / findings, and the findings list
(title, severity, command, expected vs actual), most severe first.

## Areas

1. **feats**: every feat in `modules.feats` (119).
2. **species**: every species in `modules.species` (141): ability increases, speed, size, natural weapons and
   unarmed strikes, natural armor / AC formulas, proficiencies, senses, resistances, other numeric traits.
3. **classes-a**: Berserker, Consular, Engineer, Fighter, Guardian: class features by level, archetypes, fighting
   styles, fighting masteries, lightsaber forms, weapon focuses and supremacies, class improvements.
4. **classes-b**: Monk, Operative, Scholar, Scout, Sentinel: the same, plus multiclass improvements and backgrounds'
   features with numbers.
5. **items**: enhanced items (armor, shields, weapons, focuses, adventuring gear, consumables used on yourself),
   item modifications installed in an item, cybernetic augmentations, droid customizations, and the sheet's own
   tweaks (with and without a reason).
