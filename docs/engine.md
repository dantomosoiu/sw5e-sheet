# The rules engine

`app/engine.js` computes a character the way SW5E's engine on sw5e.com does: from SW5E's character data
(the JSON the site stores) and SW5E's rules and item lists (`app/data/sw5e/`), it builds the same computed sheet. The sheet layers its
own rules on top, as effects and tweaks (features and species traits SW5E's engine leaves out, items, states,
conditions). So the engine copies SW5E's behaviour exactly, quirks and apparent bugs included, and anything better
belongs in that layer, where the sheet already explains each change.

```
const ctx = engContext({ rules, catalog });   // SW5E's rules modules and item list, indexed once
engComputeCharacter(raw, ctx)                 // { complete, validation, refs, error }: what the sw5e.com bridge returns
engCompute(raw, ctx)                          // the computed sheet alone
engCheckAgainst(sw5eComplete, ownComplete)    // the numbers that differ
```

## How it's checked
- `node dev/engine-check.js`: every number of every character SW5E has computed for us, computed again. SW5E's
  results come from the regression cases (each test character as stored, with the sheet's effects, and without
  tweaks) and from `dev/engine/sw5e-results.json`: 585 made-up characters (`dev/engine-cases.js`). They cover:
  - every class at 11 levels, multiclass pairs, every species;
  - every armor and weapon, every tweak as a bonus and as an override;
  - every archetype caster and superiority archetype;
  - play state, custom content, characters SW5E refuses, edge cases.
- `--all` compares every field of the computed sheet, the rules references and SW5E's validation. It treats the
  empty values the stored lists leave out as the same, and skips fields the sheet never reads.
- List order is compared too: features, weapons and proficiencies show in SW5E's order.
- Recording again (see `dev/README.md`) also reports what sw5e.com now computes differently. That is the sanity check
  to run from time to time, and whenever the engine grows.
- In use, every character loaded from sw5e.com is compared with sw5e.com's own calculation (Settings, Tweaks & Data
  → Rules engine).

As of 2026-10-23: 607 characters (585 made-up ones and the recorded test characters), all 80,413 numbers and all
353,659 fields the same. (Regression cases made from another case by `dev/bump-check.js --save` aren't compared: SW5E's
stored calculation is the original character's.)

## What SW5E does, as the engine copies it
**Ability scores**
- Base scores, plus the species' fixed increases from the rules, plus the chosen ones stored with the character
  (`species.abilityScoreImprovement`).
- Plus class entries of type "Ability Score Improvement" (any other type, such as a hand-written "ASI", is
  ignored).
- Plus the background feat's `abilityScoreImprovements`. A feat taken at an Ability Score Improvement doesn't add
  its increase.
- Then tweaks: a bonus adds, an override replaces. Scores aren't capped.

**Saving throws and skills**
- Saves are proficient from the first class's list, or from a tweak.
- Skills are proficient from the class picks (`classes[].skills`) and the background's (`background.skills`), or
  from a tweak. `classes[].expertise` gives expertise.
- Custom proficiencies don't count.
- The skill-and-save list holds the proficient skills in ability order, then the class saves, then saves a tweak
  makes proficient (repeats kept).

**Hit points**
- The first class's first level at its maximum, then each level's recorded value (the fixed value with the fixed
  hit points setting), plus Constitution × level, plus tweaks.
- Hit dice are grouped by size. A long rest restores half the hit dice (at least one), the largest spent ones
  first.
- A class SW5E doesn't know gets a "dundefined" die.

**Armor and speed**
- AC: the best body armor's formula ("13 + Dex modifier (max 2)"; 10 + Dex without armor) plus the best shield.
- Enhanced armor and shields aren't added, and proficiency doesn't matter.
- Speed is 30 ft for every species. An armor's "strength N" costs 10 ft when Strength is lower; a load over 10 ×
  Strength costs 20 ft. The two don't add up.
- Carrying capacity is Strength × 5, ×10, ×15 and ×30 for every size. Vision is "normal".

**Weapons**
- Ability: Dexterity for ranged weapons (a "(range …)" property that isn't thrown), the better of the two with
  finesse, otherwise Strength. Exotic weapons always use Strength.
- Proficiency comes from the first class's weapon list and the other classes' multiclass lists.
  - "All X" means simple and martial, never exotic.
  - A weapon's own tweak marked proficient adds the bonus too.
- Every weapon in the equipment gets its numbers; only equipped ones are listed under weapons.
- The unarmed strike: 1 + Strength damage (just Strength once a die size is set), never below 0. Unarmed tweaks
  apply to it; general weapon tweaks don't.

**Casting**
- Points: each casting class's table at its own level, added up, plus the ability modifier (at least 1).
  - Force uses the higher of Wisdom and Charisma; light uses Wisdom, dark uses Charisma.
  - Tech uses Intelligence.
- Archetype casters count with their own table. SW5E reads its points only for third-casters (ratio 1/3).
- Max power level: the single caster's table. With several casters, the full caster's table at the rounded sum of
  levels × ratio. A table cell SW5E can't read gives null.
- Powers listed with no caster (the Rakatan Order's, custom powers) get the modifier alone and power level 0.
- Known powers: each class's, then its archetype's (repeats kept), then the custom ones.

**Superiority**
- Only from an archetype's own table, read by column position: the dice are the second column.
- A Fighter or Scholar gets it with any archetype table, so the Adept Specialist's force points become its dice. A
  Scout only gets it with a superiority column (Deadeye). Other classes, and plain Fighters, get false.
- This looks like a bug in SW5E. The sheet works superiority out itself from the class tables.

**Lists**
- Features: every class's and archetype's features up to its level, keeping the latest entry of one written at
  several levels. They are in the rules list's own order (Core before Expanded Content, archetypes before classes),
  sorted by level only.
- Then the species traits, then the feats: those taken at Ability Score Improvements, the background's, then those
  added by hand.
- Proficiencies:
  - the first class's weapon and armor lists, as written (the Monk's comes out in fragments);
  - the other classes' multiclass lists, without what's already there;
  - the background's tools.
- Languages: Galactic Basic, the species language the character records, then the background's (repeats kept).
- Attunement: as many slots as the proficiency bonus.

**Validation**
- In order: a name (2), a species (3), class levels (4), one hit point entry per level (5), ability scores (6) and
  a background (7).
- An unknown species or class passes.

## Data
The engine reads SW5E's rules and items as they come with the sheet (`app/data/sw5e/`, fetched from SW5E's data
service by `dev/fetch-sw5e.js`), which drop empty values. Fields SW5E sets that the sheet doesn't read aren't
rebuilt: an item's `propertiesMap`, `searchableRarity` and `hasPrerequisite`.

## SW5E's own engine
The code of SW5E's website, its character engine included, is public:
[StarWars5e.Site](https://github.com/sangheili868/StarWars5e.Site), `src/modules/CharacterEngine/` (`generateCharacter.ts`
and the `generate…` files next to it), with no license of its own. `engine.js` was written to give the same results
and is checked against them; that code is the place to read when a result differs.
