# GM panel review: was the player panel fair, and is the sheet fair at the table?

_2026-10-22, main at 915a21e. Read-only review by a panel of four GM personas. Each one judged on their own first,
then the panel reconciled. Tools: `node dev/bump-check.js`, `node dev/readers.js`, and two scratch scripts run headless
(`probe.js` drives the sheet's own roller and effect functions through `dev/headless.js`; `items-scan.js` runs
`parseItemEffect` over the whole catalog). These live in the session scratchpad, not the repo. One node process ran at a time._

**The panel**
- **Rules-as-written stickler (RAW):** checks every expectation against the exact SW5E sentence.
- **Table pragmatist (TP):** cares about speed, clarity, and not burying the player in prompts.
- **Power-gaming watchdog (PG):** asks whether anything gives more than the text allows.
- **New-player GM (NP):** asks whether anything misleads someone who trusts the sheet.

---

## 1. Verdict on the player panel

**Headline:** the player panel was fair and overwhelmingly correct. Its expectations matched the SW5E text almost
everywhere, and it did not lean toward the player. Where it missed things, it missed *conditions* ("while using
your pack as a focus", "while wielding the totem's object", "while Saber Storm is active"). Those misses, and
some of the fixes made afterwards, are where the sheet now gives more than the rules allow.

**Sample.** 74 of the 175 findings were checked against the SW5E text (`app/data/sw5e/rules.json` and
`catalog.json`), across all five areas. That covers every finding whose rule is debatable. 14 of them were also
re-run with bump-check or the headless probe on today's main.

| Verdict | Count | Findings (index in findings.json) |
|---|---|---|
| Right: the expectation matches the text | 68 | feats 0-3, 5-11, 16-19, 25; species 30-39, 42, 45, 49, 50, 52; classes-b 60, 63-66, 69, 73, 75, 81, 82, 93, 94; classes-a 108-112, 116, 117, 124-126, 133, 143; items 147-149, 154-156, 158-161, 166, 167, 172 |
| Right, but the ruling is a GM's call (accepted with a note) | 3 | 61 and 67 ("your choice" ability, expected the better one); 150 (a "set to" tweak against a stim) |
| Over-read in the player's favour | 1 | 129 (Biochemist's Amplifer/Inhibitor: expected unconditional; the text needs the pack used as a tech focus) |
| Under-read (missed part of the rule) | 2 | 4 (Muscled Menace: the Oversized trait was not checked); 132 (totems: the panel asked for the passives, but did not separate the *invoked* 10-minute benefits from the standing ones) |

Two log lines that are not findings are also wrong:
- `classes-a.md:157` calls Audiotech's Magnifying Device and Shock Mount "OK (+3 attack / DC)". The text says
  "While using your instrument as a tech focus", so that is an over-read.
- `classes-a.md:133` calls Way of Manipulation "no number". In fact Saber Storm has a conditional AC and
  concentration bonus, so that is an under-read. A later reader change now applies it permanently (issue 1).

**Did the fixes over- or under-apply?** The verifiers' logs (`verify-*.md`) are accurate. Every "fixed" item we
re-ran held. The fix wave did introduce over-applications the panel never saw:
- **Saber Storm:** permanent +AC. Commit 6ae062a taught the reader that "if it doesn't already include that
  modifier" is "not a condition", for Artful Dancer.
- **Totem of the Acklay:** permanent STR +2, from the fix for finding 132.
- **Biochemist's Amplifer/Inhibitor:** applied unconditionally, from the fix for finding 129.
- **Dice card (commit 4b1f250):** advantage on any single die, and every die removable after the roll.

The fix wave also under-applies in two places:
- Weapon Expert and Casting Specialist are flagged "can be taken only once".
- A consumed stim does nothing under a "set to" score.

**Per-persona notes (before reconciling)**
- **RAW:** agreed with 71 of 74. Only flagged 129, plus the two log lines above.
- **TP:** agreed with all 74, but wants fewer pre-ticked options and "Still to choose" entries rather than silent defaults.
- **PG:** flagged 129 and 132 as player-favoured, and found most of the issues ranked below by sweeping
  `readers.js` and the catalog for unconditional bonuses whose text has a condition.
- **NP:** focused on what the dice card lets a player do without noticing (issues 3, 4, 7, 9).

---

## 2. Fairness issues, ranked

Severity: **high** means a wrong number shown as right, or an exploit that changes outcomes. **Medium** means it
favours or penalises a side in common play. **Low** means an edge case or wording.

### 1. Saber Storm gives a permanent AC bonus (high, favours the player)
- **Rule:** "while your Saber Storm is active … bonus to your AC equal to your Wisdom or Charisma".
- **Evidence:**
  ```
  node dev/bump-check.js consular-test-local --js "raw.classes[0].archetype={name:'Way of Manipulation'}"
  + armorClass = 15            - armorClass = 12
  + tweak: armorClass +3 · Saber Storm
  + hover armorClass: Without tweaks or effects: 12 → now 15 / +3 AC + WIS/CHA · Saber Storm Way of Manipulation feature
  ```
  There is no [Start Saber Storm] state: the reader dump shows `mod armorClass +Wisdom/Charisma` and no `state`
  line. Cause: `app/classes.js:742` treats "if it doesn't already include that modifier" as unconditional, and
  never sees the "while … active" sentence above the list.
- **Ruling:** make Saber Storm a startable state (an action, 1 minute, 2 uses per short rest). Put the AC bonus and
  the concentration-save bonus inside the state. Never apply them by default.

### 2. Totem Specialist: an invoked STR +2 is permanent, and the standing benefits ignore "wielding or wearing" (high, favours the player)
- **Rule (Acklay):** "invoke the totem as a bonus action. For 10 minutes, … Strength score increases by 2".
- **Rule (all totems):** "You must be wielding or wearing the object to benefit".
- **Evidence:**
  ```
  node dev/bump-check.js kadro-vos-panel --js "raw.classes[0].archetype={name:'Totem Specialist'}; raw.classes[0].options={'Totem Options':[{name:'Totem of the Acklay'},{name:'Totem of the Vornskr'}]}"
  + tweak: abilityScores.Strength.score +2 · Totem of the Acklay
  + carryingCapacity.maxCapacity = 150     - … = 120
  + Nature (INT): d20 d20 +0 · mode adv · Advantage from Totem of the Acklay
  + Survival (WIS): d20 d20 +1 · mode adv · Advantage from Totem of the Vornskr
  ```
  `verify-classes.md` (133) also notes that the condition "isn't modelled".
- **Ruling:**
  - Make each totem's invoked effect a state (Acklay: STR +2 and ×2 carrying for 10 minutes; once per short or
    long rest).
  - Apply the standing benefits only while the object bearing the totem is equipped. As a minimum, add a
    "totem object in hand/worn" toggle that defaults to on, with the condition shown.

### 3. The dice card lets a player change a roll after seeing it (high, integrity)
- **Rule:** advantage and disadvantage are decided before the roll. With both, "roll two d20s" and use the lower one (disadvantage).
- **Evidence** (`probe.js berserker-test-claude`, the sheet's own `startRoll` / `doRoll` / `removeDie` / `setMode`):
  ```
  disadvantage roll: dice [14, 18] total 20 → remove the 14 → dice [18], mode normal, total 24, amended: true
  normal roll: [20] total 26 → setMode('adv') → a second d20 is rolled now, mode adv, amended: true
  ```
- **What the code does:**
  - `removeDie` (roller.js:1121) lets any die be taken off after rolling.
  - `setMode` (roller.js:1077) adds or drops dice "before or after rolling".
- **What the record keeps:** the roll is only marked "amended". `rollsForCharacter` (roller.js:1471) drops the
  `preset` reason, and the removed die is gone. So the synced log shows a normal 18, with no trace that it was a
  disadvantage roll.
- **Ruling:** once a d20 roll is made, lock its mode and its d20s. If amending is needed (Lucky, a forgotten
  modifier), keep removed dice in the record as struck-through, and keep the original mode and its reason in the
  log. Lucky gets its own button that adds a d20 and spends a luck point.

### 4. "Advantage" offered on weapon damage, hit dice and superiority dice (medium-high, favours the player)
- **Rule:** advantage on damage exists only where a feature grants it (Weapon Expert: "once per turn … you can choose to have advantage").
- **Evidence:**
  ```
  probe.js berserker-test-claude: offersModes() → damage|0 (Dire vibroblade, 1d8): true; damage|1 (Blaster pistol, 1d6): true;
  hitdie|d12: true; attack|0: true
  ```
  `offersModes` (roller.js:981) returns true for any roll with a single die. This came in with commit 4b1f250,
  after the player panel.
- **Ruling:** show the advantage buttons only on d20 rolls, on plain dice the player built themselves, and where a
  feature grants damage advantage (`r.dmgAdv`).

### 5. Identical effects stack: two of the same calibrator on one weapon (medium-high, favours the player)
- **Rule:** "granting it a +3 bonus to attack rolls and … an additional 1d8 damage" (one calibrator). Same-name
  effects don't combine (PHB, combining effects).
- **Evidence** (`probe.js kadro-vos-panel`, `makeEffect` + `startEffect` with Oscillation Calibrator (Lethal) on the Vibrorapier):
  ```
  0 calibrators: attack +5, 1 damage die;  1: +8, 2 dice;  2: +11, 3 dice
  ```
  `startEffect` (viewer.js:3642) only replaces effects that share a `group` ("only one stimpac at a time"). Items
  without that sentence stack freely, whether received or used.
- **Ruling:** a second copy of the same named effect on the same target should replace the first, or be flagged
  "doesn't stack" and left out (as repeated tweaks are), with "apply anyway".

### 6. Modification bonuses that need a focus or harness apply unconditionally (medium, favours the player)
- **Rules:**
  - "While using your biochemist's pack as a tech focus, you gain a +1 bonus".
  - Audiotech: "While using your instrument as a tech focus" (Magnifying Device, Shock Mount).
  - "While wearing your gadgeteer harness you have immunity to lightning damage".
- **Evidence:**
  ```
  node dev/bump-check.js armstech-test-local --js "raw.classes[0].archetype={name:'Biochem Engineering'}; raw.classes[0].options={'Biochem Modifications':[{name:\"Biochemist's Amplifer\"}]}"
  + techCasting.attackModifier = 9    - … = 7
  + tweak: techCasting.attackModifier +2 · Biochemist's Amplifer
  ```
  The character carries no biochemist's pack at all. `readers.txt` lists Magnifying Device, Shock Mount,
  Biochemist's Amplifer and Biochemist's Inhibitor as plain `mod techCasting.* 3`. Advanced Grounding System is a
  plain "Immune to lightning damage", which the damage tracker then applies (`plDamageAfterDefenses`, play.js:90).
- **Ruling:** apply these only while the modified item is equipped and chosen as the focus. Until that's modelled,
  show them as "only sometimes" alternatives ("Tech attack +7 · +9 with the pack as focus"), as Bonded Plates' "vs
  melee" already is.

### 7. Power dice are pre-ticked: Target Lock on every target, Guidance spent on the first check (medium, both directions)
- **Rules:**
  - Target Lock: "an extra 1d6 damage to the target whenever you hit it".
  - Guidance: "add the number rolled to one ability check of its choice".
- **Evidence:**
  ```
  probe.js berserker-test-claude (a Guidance effect, then an Athletics roll):
  conds: ["Guidance ON"] → after rolling: effects left [] (Guidance ended)
  ```
  roller.js:918 ticks every power rider that isn't `optional` (decision 50).
- **The result:**
  - **Target Lock** adds 1d6 to attacks on creatures that aren't the quarry. This favours the player.
  - **Guidance** is spent on whatever check is rolled first, which takes the choice from the player. This penalises the player.
- **Ruling:** offer both unticked, labelled "vs your Target Lock target" and "Guidance (ends the power)". Pre-tick
  only dice the text makes automatic for every roll of that kind (Battle Meditation, a spice's high).

### 8. "Roll again" reuses a die whose power has ended (medium, favours the player)
- **Evidence:** in the same probe, after Guidance ended, "Roll again"
  (`startRoll(spec, {sameAs, now:true})`) gives dice `["d20:20", "cond:Guidance:2"]` with conds `[]`. The d4
  still counts in the total (28). roller.js:932 copies every die of the earlier roll, including option dice whose
  option no longer exists.
- **Ruling:** "Roll again" should rebuild the options from the current state, and drop dice whose option is gone
  or used up.

### 9. A consumed stim does nothing under a "set to" score (medium, penalises the player)
- **Rule:** "the target's Strength score increases by 2, and its maximum … increases by 2".
- **Evidence:** `dev/regress/expected/dice-set-scores-and-effects.txt:348`: "Strength Stim (Fine) STR +2: set by a
  tweak used, lasts 1 hour". Hovers read "+2 STR · Strength Stim (Fine): not applied, a tweak sets this number".
  The stim is used up.
- **Ruling:** see "Decisions a GM would change" (A). A "set to" on an ability score should set the base, and
  temporary effects still add on top. At least, warn before the item is used ("a tweak sets Strength: this stim
  will do nothing").

### 10. Weapon Expert and Casting Specialist wrongly limited to once (medium, penalises the player)
- **Rules:** "You can take this feat twice." and "You can select this feat twice."
- **Evidence:**
  ```
  node dev/bump-check.js kadro-vos-panel --feat "Weapon Expert"
  + Weapon Expert can be taken only once
  ```
  choices.js:332 only accepts "you can take this feat multiple times".
- **Ruling:** also accept "take/select this feat twice", and allow two copies.

### 11. Prone gives disadvantage on every ranged attack; Frightened always applies (low-medium, penalises the player)
- **Rules:**
  - Prone: "disadvantage on ranged attack rolls against targets within 30 feet".
  - Frightened: "while the source of its fear is within line of sight".
- **Evidence:** `PL_CONDITION_ROLLS` (play.js:13) has `Prone: { attack: 'dis' }` and
  `Frightened: { attack: 'dis', check: 'dis' }`. The note is shown, but the preset applies to every attack and check.
- **Ruling:** presetting melee is right. For ranged attacks while Prone, preset nothing and offer "target within
  30 ft: disadvantage". Frightened is fine as a preset with its note.

### 12. Exhaustion: HP maximum halving (level 4) and death (level 6) not applied (low, favours the player)
- **Rule:** "4 | Hit point maximum halved", "6 | Death".
- **Evidence:** viewer.js:4910 only lists the effects as text. `plSpeed` applies the speed effects (levels 2
  and 5), but nothing touches `hpMax`.
- **Ruling:** halve the HP maximum shown and used by Heal at level 4. At level 6, mark the character dead (with Undo).

### 13. An attack's DC/AC chip ignores natural 1 and natural 20 (low, misleading)
- **Evidence:** roller.js:1318 decides "Success/Failure (DC n)" only on `total >= dc`. A natural 1 can show
  "Miss (natural 1)" and "Success (DC 15)" together.
- **Ruling:** on attacks, a natural 1 always reads Miss and a natural 20 always reads Hit/Critical.

### 14. "Your choice" abilities default to the best one silently (low, favours the player)
- **Applies to:** decision 18, the task's "better one for attacks", and finding 67.
- **Rule (Archaeologist):** "+ your Intelligence, Wisdom, or Charisma modifier (your choice)". It is one choice,
  used for points, DC and attack.
- **Evidence:** the dice-archaeologist-casting case shows "DC 14 · attack +6 (INT)" with no choice recorded.
- **Ruling:** fine as a default, but list it in "Still to choose" until the player records the choice. Use the
  recorded ability everywhere that feature's numbers appear, even when another one would be better for one roll.

### 15. Muscled Menace's Oversized trait isn't applied (low, both directions)
- **Rule:** "Light- and vibro-weapons that lack the dexterity or light property are considered heavy".
- **Evidence:** `readers.txt` shows Muscled Menace with speed and DEX caps only. Oversized also lowers blasters'
  strength numbers.
- **Ruling:** apply both halves, or list Oversized as a note on the weapon rows.

### 16. Smaller items
- **Once per turn is not tracked** (Sneak Attack, Weapon Expert's damage advantage, Ranger's Quarry die). This is
  the table's job; the TP is content.
- **Medpac on mixed Hit Dice takes the larger size on a tie** (decision 23). The text doesn't say; favours the
  player; low.
- **The "Max + roll" critical toggle** (roller.js:1297) is a house rule. It sits on every damage card and is
  remembered per device. Label it "table rule (ask your GM)". The synced roll already marks max dice.
- **Petrified's "resistance to all damage"** isn't applied by the damage tracker (penalises the player, rare).

**Checked and fair:**
- Rage blocks casting and ends concentration.
- Attunement slots are enforced: the button is disabled.
- Stimpacs and adrenals: one at a time.
- Conditional resistances are mentioned, not applied.
- The GM-chosen side effect on augmentations is asked for, not picked by the sheet.
- Two half-proficiency features don't stack: Know a Bit + Cunning Intellect changed no INT skill.
- Deflective Layer isn't applied when the spiked armor isn't worn.
- Rests:
  - Short rest: tech points and short-rest uses.
  - Long rest: full HP, half the hit dice, exhaustion −1 (−2 with Frenzy).
  - Massive damage, damage at 0 HP, and a natural 20/1 on death saves are all right.

---

## 3. Decisions a GM would change

**A. Tweaks "Set to" (fixed; effects not applied on top).**
- **Change:** for ability scores (and probably HP maximum), "set to" should set the *base*. Temporary effects
  (stims, adrenals, powers) still add on top.
- **Keep:** "set to" as a hard override for AC and other derived numbers, where a player usually types the final value.
- **Reason:** a GM who sees a 1-hour stim used up for nothing will rule it applies (issue 9).
- PG accepts this because the stim still respects its own cap and "one stimpac at a time".

**B. "Your choice" abilities use the better one when no choice is made (decisions 18, 86, and this round's).**
- **Keep as a default, but:**
  - surface it in "Still to choose";
  - once chosen, use that ability for all of the feature's numbers;
  - never mix abilities across one feature (issue 14).
- **Decision 86 (Bendu adds the lower of WIS/CHA):** correct, as SW5E's own engine is wrong there. Keep.

**C. Damage riders start unticked except where the text makes them automatic.**
- **Agree for class and species riders.** Improved Force-Empowered Strikes, Brutal Critical, Savage Attacks and
  Devastating Critical are fine pre-ticked.
- **Decision 50 contradicts it for powers.** Target Lock's die only applies to its target, and Guidance is "one
  ability check of its choice". Both should start unticked (issue 7).

**D. A repeated tweak is left out with "apply anyway".**
- **Agree.** It's fair to both sides and visible.
- **Change:** extend the same "doesn't stack, apply anyway" treatment to repeated *effects* with the same name
  (issue 5). Today only tweaks get it.

**E. Decision 6: weapon focus "If you are proficient with it isn't checked".**
- **Outdated:** proficiency is now checked (finding 112 is fixed). Update the decision text.

**F. Decision 3 ("powers from feats count as the ability to cast") and forms accepting Force-Sensitive's at-wills.**
- **The panel splits:**
  - RAW and PG would require class forcecasting for lightsaber forms ("restricted to forcecasters").
  - TP accepts it, because Force-Sensitive → Improved → Greater reads as an intended chain.
- **Recommendation:** keep it for the feat chain. For forms, show "GM's call: forcecaster through a feat" rather
  than accepting silently.

**G. Decision 50 (dice from active powers ticked)** and **the dice-card UI decisions in 4b1f250** (advantage on
any single die; every die removable after rolling).
- **Revisit both** (issues 3, 4, 7, 8). They are the most consequential fairness changes in this round, and none
  of them came from the player panel.

**H. Decision 59: Infuse Item's AC "doesn't check that you're wearing the infused armor".**
- **Change:** apply the AC bonus only while that armor is equipped, as is now done for Armormech modifications
  (finding 113).

**I. Decision 26 / exhaustion.**
- **Apply the HP maximum halving.** A sheet that keeps full HP at exhaustion 4 misleads new players (issue 12).

**J. Decision 42 / Prone.**
- **Split melee from ranged** (issue 11).

---

## Appendix: commands used (beyond those quoted above)

```
node dev/readers.js --out <scratch>/dm/readers.txt                        # 1148 sources
node dev/bump-check.js berserker-test-claude --feat "Armor Expert"        # heavy armor; light/medium listed twice (cosmetic)
node dev/bump-check.js berserker-test-claude --feat "Observant"           # passive 11 → 16, Investigation 9 → 14 (right)
node dev/bump-check.js berserker-test-claude --feat "Dungeon Delver"      # no number changes (right)
node dev/bump-check.js dice-know-a-bit-levelup --feat "Cunning Intellect" # half-PB sources don't stack (right)
node dev/bump-check.js berserker-test-claude --js "…Armored Approach, Deflective Layer, armor unequipped"   # AC 15, no +1 (right)
node dev/bump-check.js rorrwaak-panel --js "…Combat suit + Armor (Fine)"  # Hide 13+DEX +1 = 15 (right: the +1 is an AC bonus)
grep "option (on)" / "Advantage from" over dev/regress/expected/*.txt     # every pre-ticked option and preset in the recorded cases
```
