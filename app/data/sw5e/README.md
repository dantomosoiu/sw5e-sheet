# SW5E's data

This folder is a copy of **SW5E** (Star Wars 5th Edition): its rules data, its item list and its rule books.
SW5E is a fan-made Star Wars conversion of fifth edition rules by **Galiphile and the SW5E contributors**, made under
Wizards of the Coast's Fan Content Policy and published at [sw5e.com](https://sw5e.com). Its website and data
service are by Speedreeder, Tyrzaphir and the SW5E website team. The full credits, as SW5E publishes them, are in
[credits.md](credits.md); the sheet shows them under *SW5E rules → Credits*.

This content is SW5E's work, not the sheet's, and **the sheet's license (GPL-3.0) doesn't cover it**. SW5E publishes
it openly (its website's code is public on GitHub: [StarWars5e.Site](https://github.com/sangheili868/StarWars5e.Site)
and [StarWars5e.Core](https://github.com/speedreeder/StarWars5e.Core)), but under no license of its own. Star Wars
belongs to Lucasfilm. The sheet isn't affiliated with SW5E, Lucasfilm, Disney or Wizards of the Coast.

## What's here
- `rules.json`: classes, archetypes, features, maneuvers, feats, fighting styles and masteries, lightsaber forms,
  weapon focuses and supremacies, class/multiclass/splashclass improvements, character advancement, powers,
  conditions, skills, reference tables, backgrounds, species, weapon and armor properties, and the equipment packs
  (read from the handbook's Equipment chapter).
- `catalog.json`: equipment and enhanced items.
- `books/`: the Player's Handbook, Starships of the Galaxy, Wretched Hives, Expanded Content and Variant Rules,
  one markdown file per chapter (`books/index.json` lists them).
- `credits.md`: SW5E's credits.

`rules.json` and `catalog.json` hold `dataVersion` (SW5E's data version), `fetchedAt` and `source`. They are SW5E's
data as its service gives it, with storage keys, duplicate `…Enum`/`…Json` fields and empty values left out, one
entry per line.

## Where it comes from
SW5E's public data service, the one sw5e.com itself reads: `https://sw5eapi.azurewebsites.net/api/` (`class`,
`archetype`, `feature`, … `equipment`, `enhancedItem`, `PlayerHandbookRule`, `StarshipRule`, `WretchedHivesRule`,
`ExpandedContent`, `VariantRule`, `Credit`). `node dev/fetch-sw5e.js` fetches it again and says what changed
(`--check`: only say). The sheet reads it with `app/sw5e-data.js`, which also fetches a newer version by itself
when sw5e.com reports one.
