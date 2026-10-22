# The sheet's art

Everything here is drawn for this project (no film stills, logos or other people's art), so it can ship with the
sheet under its license. `python dev/art.py` turns it into what the app loads:

- `art/items/<name>.svg`: one picture per kind of item (blaster pistol, lightsaber, medpac…), joined into the sprite
  `app/art/items.svg` (`<symbol id="i-<name>">`). `app/art.js` decides which picture an item gets.
- `art/defs.svg`: filters and gradients every picture may use (`#a-glow`, `#a-glow-lg`, `#a-sheen`, `#a-shade`).
- `app/art/art.css`: the colours (CSS variables, set by the theme and by the item) and the item tiles.
- `app/art/themes/`: each class style's emblem and background art, used by `app/themes.css`.

```
python dev/art.py              # check every picture and build app/art/items.svg
python dev/art.py preview      # dist/art/preview.html + preview.png: every picture, in several themes and tiles
python dev/art.py preview --only blaster-pistol,lightsaber --scale 3 --out some.png
```

## How an item picture is drawn

The look is a **hard-surface prop drawing**: solid shapes with a dark outline, lit from the top left, with a few
crisp highlights, panel lines and glowing energy parts. Think of a well-made game inventory icon or a prop
department's turnaround sheet; used, practical, slightly weathered machinery rather than shiny sci-fi chrome. It must
read at 28 px (silhouette first) and reward a look at 96 px (details).

**File:** `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` with the shapes inside, nothing else at the
top level (no `<style>`, no `<defs>`, no width/height, no `<script>`, no `<image>`, no text). Ids, if needed (a
clipPath), start with the file's name: `id="lightsaber-clip"`.

**Colours come from classes, never hard-coded** (the theme and the item set the variables):

| class | paints | variable | used for |
|---|---|---|---|
| `a-b` | fill | `--ab` | main body: casings, plates, the light parts of metal |
| `a-m` | fill | `--am` | secondary metal: barrels, frames, mechanisms (darker than the body) |
| `a-d` | fill | `--ad` | darkness: grips, recesses, vents, holes, the underside |
| `a-c` | fill | `--ac` | soft goods: leather, cloth, straps, padding |
| `a-x` | fill | `--ax` | the item's own colour: paint, a stripe, a warning band, a coloured panel |
| `a-s` | fill | `--as` | glass and screens (dark) |
| `a-g` | fill | `--ag` | energy: blades, bolts, power cells, lit screens, indicator lights |
| `a-w` | fill | `--aw` | the white-hot core of energy (a blade's core, a lens's spark) |
| `a-o` | stroke | `--ai` | the outline: add it to filled shapes (`class="a-b a-o"`), 1.2 wide |
| `a-oo` | stroke | `--ai` | a heavier outline (1.8) for the outer silhouette of big shapes |
| `a-l` | stroke | `--ah` | a highlight line (1 wide, rounded): rim light along top edges |
| `a-p` | stroke | `--ai` | a panel line or seam (0.8 wide, half opaque) |
| `a-gl` | stroke | `--ag` | a glowing line (1.4 wide): coils, circuit traces, an ECG trace |

**Depth:** lay a copy of a shape with `fill="url(#a-sheen)"` on top for a lit top half, and `fill="url(#a-shade)"`
for a shaded bottom half. Energy gets a soft halo: draw the glowing shape once more, a little larger, with
`class="a-g" filter="url(#a-glow)" opacity=".8"` *under* the crisp one (`#a-glow-lg` for big blades and blasts),
then a thinner `a-w` core on top.

**Composition:**
- Fill the canvas: the item spans 52-58 of the 64 units across its longest side, centred, 3-4 units of air at
  the edges. Long items (rifles, blades, staffs) lie on the diagonal, bottom-left to top-right; pistols and
  compact items sit level, facing right.
- One clear silhouette; no backgrounds, no ground shadows, no frames (the tile adds them).
- 8 to 30 shapes is right; under 4 KB per file. Whole numbers or one decimal.
- Inventive but believable: real props were built from found machine parts. Vary the parts so a pistol, a carbine
  and a rifle differ at a glance, and every lightweapon hilt is its own.

**Must not:** copy a real logo, insignia, emblem or a specific film prop exactly; use a red cross (it's a protected
emblem: medical things get a pulse line, a capsule or a plus on a coloured disc in `a-x`); write text.

**Unarmed strikes** (`unarmed-*`): skin, fur and a droid's plating are `a-x`; the app sets it to the character's own
colour (`unarmedArt` in `app/art.js`: the species' natural-weapon trait picks the picture, its skin or fur colour
words the colour).

## Dedicated pictures (one item each)

`art/equipment/<slug>.svg` is the picture of one SW5E item (or one family of tiered enhanced items: "Jetpack (Champion)"
shares `jetpack.svg`, its tier shows as pips on the tile). Same rules and look as above; on top of that:

- **Draw that item, not its kind.** Read SW5E's facts and text in the batch brief (`python dev/art-manifest.py` writes
  `dist/art/batches/<batch>.md`): what it does, its properties (two-handed, heavy, light, finesse, reach, burst…),
  weight and price tell you its size, bulk and how fancy it is. A 25-credit tool looks cheap and practical; a
  5,000-credit armor looks it.
- **Siblings must differ at a glance.** Every pistol, every light armor, every kit in a batch gets its own
  silhouette and parts, not a recolour. Lay them side by side in the preview and fix any two that could swap.
- **Upgrades build on their base.** When the brief says "Builds on X", start from X's drawing (copy its shapes) and
  keep the silhouette, then show the better version: tougher materials (plating over fabric, layered plates,
  reinforced edges), finer finish (trims, inlays, cleaner panel lines), added parts (extra cells, guards, optics), a
  richer `a-x` colour. Someone who knows X should see "X, but better".
- **Weapon lines share a motif.** The brief describes it (cryo: coolant tank and frost; ion: capacitor rings…). Every
  member of a line shows it in its own form (pistol, carbine, rifle, sniper, cannon), so a cryo rifle and a cryo pistol
  look related, and a cryo rifle and an ion rifle look different.
- **Named and unique items** (Darksaber, Mandalorian helmet, Jedi and Sith robes): evoke the idea with an original
  design; never copy a film prop or emblem.
- **Chassis** (Blaster Chassis, Armor Chassis…) are unfinished frames for crafting: the item's skeleton, open panels,
  exposed wiring and mounting points, maybe a schematic glow.

**Well built** (the user's own check, 2026-10-22): front-view things (armor, suits, clothes, shields, helmets, masks,
robes, pairs) are symmetric left to right, with at most one deliberate one-sided feature that obviously makes sense;
nothing sticks out without a purpose; no detached fragments except clear effects (sparks, glints, motion lines); no
gaps where mirrored halves meet; sheen and shade overlays exactly on their shapes; nothing cut off by the canvas.
`python dev/art-qa.py --only <names> --all-sheets` measures it (symmetry of outline and details, stray bits, edges) and
draws review sheets in `dist/art/qa/<run>/` (red: outline parts with no mirror twin; orange: one-sided details). Run
it before calling a picture done. A flag that is right on purpose (sparks at a tip, motion lines, the top-left light's
glints) goes in `art/qa-accepted.txt` with the reason, one line per picture and check; every other flag gets fixed.

Check them with `python dev/art.py preview --only eq-<prefix>* --scale 160` (item pictures are `eq-<slug>` in
previews) and, as the sheet shows them, `python dev/art.py items --names "Cryo pistol;Ion pistol"`.

## Tiles and colours in the app

Each picture sits on a tile (`.art-tile`, art.css): a rounded square in the theme's panel colour, with an edge
and glow in the item's rarity colour (standard, premium, prototype, advanced, legendary, artifact). `app/art.js` also
sets the energy colour: blaster bolts red, ion blue, cryo pale cyan, incinerator orange, sonic violet, lightning
electric white-blue, a lightweapon's blade one of the classic blade colours chosen from its name (red for Sith
blades), and the theme's accent for screens and lights.
