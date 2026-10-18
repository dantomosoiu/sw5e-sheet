# Wishlist

_Generated from `docs/wishlist.json` by `python dev/wishlist.py`: edit the JSON, not this file._

Every wish from the player panels, merged, checked against the code, and tracked until it is resolved.

**panel-2 (2026-10-17).** Five player agents each created a level 1 character on sw5e.com, played a scripted session in the sheet, levelled to 3, played a second session, levelled to 4, synced and played a round on a phone. 373 wishes, merged into the items below; two reviewers checked every item against the code. Brief: `docs/panel/2026-10-17/brief.md`; logs in `docs/panel/2026-10-17/`.

## Status

| State | Blocker | High | Medium | Low | Total |
|---|---:|---:|---:|---:|---:|
| fixed | 20 | 37 | 47 | 44 | 148 |
| decided |  |  | 2 | 2 | 4 |
| upstream |  |  | 2 | 2 | 4 |
| not a bug |  | 1 | 1 | 2 | 4 |
| works |  |  |  | 2 | 2 |
| **all** | 20 | 38 | 52 | 52 | 162 |

## By area

| Area | Still to do | Done | Total |
|---|---:|---:|---:|
| [Creating a character](#creation) | 0 | 6 | 6 |
| [Levelling up](#level-up) | 0 | 4 | 4 |
| [Loading and syncing](#loading-sync) | 0 | 13 | 13 |
| [Class choices](#class-choices) | 0 | 19 | 19 |
| [Powers](#powers) | 0 | 6 | 6 |
| [Combat and the play tracker](#combat-tracker) | 0 | 13 | 13 |
| [Effects, states and conditions](#effects-states) | 0 | 14 | 14 |
| [Inventory and credits](#inventory-credits) | 0 | 19 | 19 |
| [Dice roller](#dice-roller) | 0 | 18 | 18 |
| [Rests](#rests) | 0 | 7 | 7 |
| [Phone and tablet](#phone-tablet) | 0 | 6 | 6 |
| [Navigation and layout](#navigation-layout) | 0 | 11 | 11 |
| [Data and backups](#data-backup) | 0 | 3 | 3 |
| [Rules accuracy](#rules-accuracy) | 0 | 16 | 16 |
| [Other](#other) | 0 | 7 | 7 |

## Proposed next steps

What is still open, grouped into pieces of work to choose from (largest player impact first).

1. **Create and level up in the extension**: 0 open, effort XL (several steps; skill/tool/language pickers and feat increases are useful on their own first). The owner's goal (the extension as the only place to edit the character) and the panel's biggest blocker: every player built on sw5e.com, then repaired the result with tweaks and notes, and levelled up there.


2. **Conditions, damage types and concentration**: 0 open, effort L. Every session hit Poisoned, typed damage and concentration; all were handled by hand.


3. **Powers and class resources in play**: 0 open, effort L. Casters and fighters spent turns doing arithmetic the sheet could do: power damage, buffs, Quickened/Twinned costs, resources from the dock.


4. **Inventory: custom items, packs, shopping**: 0 open, effort M–L. Every player had a story item, a pack or a debt that ended up in Notes.


5. **Species rules the engine misses**: 0 open, effort M. Numbers players fixed with tweaks that drift at each level.


6. **Steadier screen**: 0 open, effort L. What is left of the layout shifts: the sheet is redrawn whole.


## Index

Still to do first (open, partly fixed, waiting for a decision), by priority; then what is done.

| ID | Priority | State | Title | Kind | Area | Checked | Effort |
|---|---|---|---|---|---|---|---|
| [W-007](#w-007) | blocker | fixed | Level up in the extension (HP, features, choices, multiclassing) | missing | level-up | missing | XL |
| [W-008](#w-008) | blocker | fixed | Choose ASI (+2 / +1+1) or a feat in the extension | missing | level-up | missing | L |
| [W-009](#w-009) | blocker | fixed | 'You have unused levels. Click below to add more class levels.' points at nothing | confusing | level-up | bug-confirmed | S |
| [W-011](#w-011) | blocker | fixed | Load from SW5E silently discards a level-up made on sw5e.com once any class choice was made in the sheet | bug | loading-sync | bug-confirmed | M |
| [W-012](#w-012) | blocker | fixed | Sync to SW5E hangs forever when the sw5e.com sign-in has expired (no timeout, no message) | bug | loading-sync | bug-confirmed | M |
| [W-024](#w-024) | blocker | fixed | Class and background skill pickers (instead of hand-made proficiency tweaks) | missing | class-choices | missing | L |
| [W-025](#w-025) | blocker | fixed | Add tool and language proficiencies (pickers for 'of your choice') | missing | class-choices | missing | M |
| [W-026](#w-026) | blocker | fixed | Feat ability increases and granted skills aren't applied; choice feats have no picker | bug | class-choices | missing | M |
| [W-027](#w-027) | blocker | fixed | Add/Learn/Choose selects add every option passed while typing or using the arrow keys | bug | class-choices | bug-confirmed | S |
| [W-028](#w-028) | blocker | fixed | Read an option's text before choosing it (powers, styles, maneuvers, strategies, instincts, archetypes) | improvement | class-choices | missing | M |
| [W-049](#w-049) | blocker | fixed | Damage has no type, so resistances and damage reductions never apply | bug | combat-tracker | missing | L |
| [W-050](#w-050) | blocker | fixed | No concentration save prompt when taking damage while concentrating (War Caster's advantage unknown) | missing | combat-tracker | missing | M |
| [W-062](#w-062) | blocker | fixed | Can't set conditions (Poisoned, Prone…) in the sheet | missing | effects-states | missing | L |
| [W-063](#w-063) | blocker | fixed | Exhaustion levels have no explanation and no effect on rolls, speed or HP | rules | effects-states | missing | M |
| [W-076](#w-076) | blocker | fixed | Custom items: add story items and gear that aren't in SW5E's list | missing | inventory-credits | missing | M |
| [W-077](#w-077) | blocker | fixed | Enhanced items aren't tied to a base weapon or armor | bug | inventory-credits | partial | L |
| [W-095](#w-095) | blocker | fixed | Active powers' bonus dice not offered in the roller (Guidance, Target Lock, Battle Meditation) | missing | dice-roller | missing | M |
| [W-096](#w-096) | blocker | fixed | Spend class resources from the dice dock (Force-Empowered Strikes, maneuvers, Close Call) | missing | dice-roller | partial | L |
| [W-126](#w-126) | blocker | fixed | Re-renders and notices shift the layout: clicks are lost or hit the wrong button | bug | navigation-layout | bug-confirmed | L |
| [W-140](#w-140) | blocker | fixed | Species traits that grant or let you choose a skill or tool proficiency aren't applied | bug | rules-accuracy | bug-confirmed | M |
| [W-001](#w-001) | high | fixed | Create the character in the extension (guided, works on a phone) | missing | creation | missing | XL |
| [W-002](#w-002) | high | fixed | Ability score step: show base + species + feat = final score and modifier | improvement | creation | missing | M |
| [W-003](#w-003) | high | fixed | Starting equipment: class/background (a)/(b) choices or a starting-wealth roll | missing | creation | missing | L |
| [W-004](#w-004) | high | fixed | Validation says 'All checks passed' while creation choices are missing | bug | creation | missing | M |
| [W-010](#w-010) | high | fixed | XP line doesn't say which level the XP reaches or how many levels are owed | confusing | level-up | bug-confirmed | S |
| [W-013](#w-013) | high | fixed | Sync to SW5E silently lowers a higher class level on sw5e.com | bug | loading-sync | bug-confirmed | M |
| [W-014](#w-014) | high | fixed | Load from SW5E doesn't switch to the character I just created | confusing | loading-sync | bug-confirmed | S |
| [W-015](#w-015) | high | fixed | Sync status wording misleads; destructive 'Revert' / 'Use SW5E's values' links sit next to everyday buttons | confusing | loading-sync | bug-confirmed | S |
| [W-016](#w-016) | high | fixed | Take sw5e.com's value for one field only ('Use SW5E's' per field in the Not synced banner) | missing | loading-sync | missing | M |
| [W-017](#w-017) | high | fixed | Show what's new after a Load that adds levels | improvement | loading-sync | missing | M |
| [W-029](#w-029) | high | fixed | Multiclass Operative: no pickers for 'any one skill' and 'one tool' | rules | class-choices | missing | M |
| [W-043](#w-043) | high | fixed | Power cards don't roll their damage or healing | missing | powers | partial | M |
| [W-044](#w-044) | high | fixed | Self-buff powers don't ask for a target or apply their effects (Heroism, Battle Precognition) | missing | powers | missing | L |
| [W-045](#w-045) | high | fixed | Cast doesn't offer Force-Empowered Casting options (Quickened, Twinned) or count their points | missing | powers | missing | M |
| [W-051](#w-051) | high | fixed | Round / turn counter: durations in rounds, start-of-turn effects, once-per-turn resets | improvement | combat-tracker | missing | L |
| [W-052](#w-052) | high | fixed | Second Heart (Zabrak) has no counter and isn't offered at 0 HP | missing | combat-tracker | missing | M |
| [W-053](#w-053) | high | fixed | Second Wind: a Use button that rolls 1d10 + level and heals | missing | combat-tracker | missing | S |
| [W-064](#w-064) | high | fixed | Dropping to 0 HP doesn't end concentration or set Unconscious | bug | effects-states | missing | S |
| [W-065](#w-065) | high | fixed | Frenzy (Frenzied Approach) is text only: no option on Start Rage, no free-use or exhaustion tracking | missing | effects-states | missing | M |
| [W-078](#w-078) | high | fixed | Shop: discount %, 'pay what you have', and recording a debt | missing | inventory-credits | partial | M |
| [W-079](#w-079) | high | fixed | Equipment packs (Explorer's, Diplomat's, Priest's) can't be added or unpacked | missing | inventory-credits | missing | M |
| [W-080](#w-080) | high | fixed | SW5E rarity names unexplained; enhanced item search hard to filter | confusing | inventory-credits | partial | S |
| [W-097](#w-097) | high | fixed | Use Inspiration from the roller (and show it in the strip) | improvement | dice-roller | missing | S |
| [W-098](#w-098) | high | fixed | Dice dock: the × moves, the dock covers buttons, and closing it clicks through | bug | dice-roller | bug-confirmed | M |
| [W-099](#w-099) | high | fixed | Roller ignores active conditions and doesn't combine advantage/disadvantage sources | bug | dice-roller | missing | M |
| [W-100](#w-100) | high | fixed | Force Visions (Way of the Seer): no foretelling dice | missing | dice-roller | missing | M |
| [W-113](#w-113) | high | fixed | Long rest doesn't end effects shorter than the rest (Strength Stim, Battle Precognition) | bug | rests | bug-confirmed | S |
| [W-114](#w-114) | high | fixed | Hit-die roll looks like grey helper text and is a tiny target | confusing | rests | exists | S |
| [W-115](#w-115) | high | fixed | Healing at or near full HP wastes a hit die or a medpac without warning | improvement | rests | bug-confirmed | S |
| [W-116](#w-116) | high | fixed | Short rest doesn't offer Force Recovery | missing | rests | missing | S |
| [W-127](#w-127) | high | fixed | Action confirmations vanish or are replaced by the recalculation status | improvement | navigation-layout | partial | M |
| [W-141](#w-141) | high | fixed | Darkvision shows 'Normal', and Kel Dor necrotic resistance isn't shown | bug | rules-accuracy | bug-confirmed | S |
| [W-142](#w-142) | high | fixed | Species languages missing (Kel Dor, Sullestese, Togruti, Shyriiwook) | bug | rules-accuracy | missing | M |
| [W-143](#w-143) | high | fixed | Zabrak Toughness (+1 HP per level) not applied; a flat tweak has to be re-edited every level | rules | rules-accuracy | missing | M |
| [W-144](#w-144) | high | fixed | AC ignores Wookiee Hide (14), and the sheet doesn't say which AC formula it used | bug | rules-accuracy | missing | M |
| [W-146](#w-146) | high | fixed | Aura of Presence isn't added to my own saving throws | rules | rules-accuracy | missing | S |
| [W-156](#w-156) | high | fixed | Clearing a tweak's value deletes the tweak and shifts the rows (typing goes into another tweak) | bug | other | bug-confirmed | S |
| [W-005](#w-005) | medium | fixed | Pick or roll the background's suggested characteristics | improvement | creation | missing | S |
| [W-018](#w-018) | medium | fixed | Numbers without tweaks flash for 3–5 s during every recalculation | bug | loading-sync | bug-confirmed | S |
| [W-030](#w-030) | medium | fixed | 'Your choices' boxes stay orange after the choice is made elsewhere, and appear where there's nothing to choose | confusing | class-choices | bug-confirmed | S |
| [W-031](#w-031) | medium | fixed | Free-text 'Your choices' should be real pickers (choose-one features, Expertise) | improvement | class-choices | missing | M |
| [W-032](#w-032) | medium | fixed | Archetype bonus proficiencies don't show on the Proficiencies card | bug | class-choices | bug-confirmed | S |
| [W-033](#w-033) | medium | fixed | Channel the Force: choose Cause Harm / Lend Aid and use it | missing | class-choices | missing | M |
| [W-034](#w-034) | medium | fixed | Armstech modified weapon and its mods not shown where I attack | improvement | class-choices | missing | S |
| [W-035](#w-035) | medium | fixed | Infuse Item: Start with an item picker, ended by the next long rest | missing | class-choices | missing | M |
| [W-036](#w-036) | medium | fixed | Show the general lightsaber form rules next to Adopt | rules | class-choices | missing | S |
| [W-046](#w-046) | medium | fixed | Saber Ward and Saber Reflect have no Cast / Use | missing | powers | missing | M |
| [W-054](#w-054) | medium | fixed | Start / End buttons for states (Rage, lightsaber forms) in the play tracker | improvement | combat-tracker | missing | S |
| [W-055](#w-055) | medium | fixed | Status after Damage/Heal keeps old errors and death-save messages | bug | combat-tracker | bug-confirmed | S |
| [W-056](#w-056) | medium | fixed | Massive-damage death: clearer 'Dead' state and a 'GM says drop to 0' option | improvement | combat-tracker | bug-confirmed | S |
| [W-057](#w-057) | medium | fixed | Typing in the tracker's Amount box is lost while the dice dock is open | bug | combat-tracker | bug-plausible | S |
| [W-066](#w-066) | medium | fixed | A permanent tweak is labelled '(temporary)' in the ability breakdown | confusing | effects-states | bug-confirmed | S |
| [W-067](#w-067) | medium | fixed | Fighting-style marks (Sharpshooter, Defense Style) have no state or effect | missing | effects-states | missing | M |
| [W-068](#w-068) | medium | fixed | Add a custom temporary effect for things the sheet doesn't know | missing | effects-states | missing | M |
| [W-069](#w-069) | medium | fixed | Force Affinity (Ashla) not applied when casting light side powers | missing | effects-states | missing | M |
| [W-070](#w-070) | medium | fixed | The Way of the Mynock doesn't apply Saber Ward or count its reactions | missing | effects-states | missing | M |
| [W-071](#w-071) | medium | fixed | Reckless Attack has no toggle | improvement | effects-states | missing | M |
| [W-072](#w-072) | medium | fixed | Dewback's Instinct damage types not named under Resistances | bug | effects-states | bug-confirmed | S |
| [W-073](#w-073) | medium | fixed | Soresu Form duration: the sheet says 'start of next turn', the text says 'end of next turn' | rules | effects-states | bug-confirmed | S |
| [W-081](#w-081) | medium | fixed | Add-item error message hidden under the suggestion popup | bug | inventory-credits | bug-confirmed | S |
| [W-082](#w-082) | medium | fixed | Item search: word order, ranking and prices | improvement | inventory-credits | partial | S |
| [W-084](#w-084) | medium | fixed | Credits history with a note per change | improvement | inventory-credits | missing | M |
| [W-085](#w-085) | medium | fixed | Track blaster shots per power cell | improvement | inventory-credits | missing | M |
| [W-087](#w-087) | medium | fixed | Arrow-down skips the pre-highlighted first suggestion | bug | inventory-credits | bug-confirmed | S |
| [W-101](#w-101) | medium | fixed | Natural 1 still highlights 'Hit: roll damage' | confusing | dice-roller | bug-confirmed | S |
| [W-102](#w-102) | medium | fixed | Roll breakdown hard to read (missing '+', dice not named, bonuses lumped) | confusing | dice-roller | bug-confirmed | S |
| [W-103](#w-103) | medium | fixed | Recent rolls aren't kept with the character (lost on reload, separate per page/device) | improvement | dice-roller | bug-confirmed | S |
| [W-104](#w-104) | medium | fixed | Versatile weapons: no two-handed damage option | missing | dice-roller | missing | S |
| [W-105](#w-105) | medium | fixed | Weapon Expert: damage advantage not offered | missing | dice-roller | missing | M |
| [W-106](#w-106) | medium | fixed | Mercantile's conditional expertise not offered on business Persuasion | missing | dice-roller | missing | M |
| [W-117](#w-117) | medium | fixed | Short rest doesn't offer to spend hit dice | improvement | rests | missing | S |
| [W-118](#w-118) | medium | fixed | Frenzied Approach: a long rest should remove 2 exhaustion, not 1 | rules | rests | bug-confirmed | S |
| [W-120](#w-120) | medium | fixed | Phone page scrolls sideways: the long tool-proficiency chip doesn't wrap | bug | phone-tablet | bug-confirmed | S |
| [W-122](#w-122) | medium | fixed | Conditions don't appear in the phone strip | improvement | phone-tablet | missing | S |
| [W-128](#w-128) | medium | fixed | After removing or ending a row, the next row's button slides under the pointer | bug | navigation-layout | bug-confirmed | M |
| [W-129](#w-129) | medium | fixed | Raw data shown on cards (Chosen ASI JSON, background tables as Markdown) | bug | navigation-layout | bug-confirmed | S |
| [W-130](#w-130) | medium | fixed | Section strip on phone/tablet: too few pills, wrong highlight, scrolls under the finger | improvement | navigation-layout | partial | M |
| [W-137](#w-137) | medium | fixed | Restore a version from the local version history | improvement | data-backup | missing | M |
| [W-147](#w-147) | medium | fixed | Species unarmed strikes (Zabrak Unarmed Combatant, Wookiee Claws) not applied | rules | rules-accuracy | missing | M |
| [W-149](#w-149) | medium | fixed | No warning for a two-handed weapon used with a shield | rules | rules-accuracy | missing | S |
| [W-157](#w-157) | medium | fixed | Short 'first session' guide for new players | improvement | other | missing | S |
| [W-158](#w-158) | medium | fixed | Explain weapon properties on hover | improvement | other | missing | S |
| [W-159](#w-159) | medium | fixed | Damage-die tweak: '1d4' becomes 14, and the die can be saved empty | bug | other | bug-confirmed | S |
| [W-160](#w-160) | medium | fixed | No warning when an AC 'set to' tweak overrides armor or a shield | improvement | other | missing | S |
| [W-019](#w-019) | low | fixed | Text-only edits trigger a full sw5e.com recalculation | improvement | loading-sync | bug-confirmed | S |
| [W-020](#w-020) | low | fixed | No clear confirmation after Sync to SW5E | improvement | loading-sync | bug-confirmed | S |
| [W-021](#w-021) | low | fixed | Explain why sw5e.com shows different numbers after a sync | confusing | loading-sync | missing | S |
| [W-022](#w-022) | low | fixed | 'Not synced' banner lists XP although both copies have the same value | confusing | loading-sync | bug-confirmed | S |
| [W-023](#w-023) | low | fixed | 'Recalculated with your changes' on a character I haven't changed | confusing | loading-sync | bug-confirmed | S |
| [W-037](#w-037) | low | fixed | Feature note boxes are one-line inputs that cut off text | improvement | class-choices | partial | S |
| [W-038](#w-038) | low | fixed | Form Basics picker labels: doubled words and a suffix that reads like an unmet prerequisite | confusing | class-choices | bug-confirmed | S |
| [W-039](#w-039) | low | fixed | Archetype list and form list name the lightsaber forms differently | rules | class-choices | missing | S |
| [W-041](#w-041) | low | fixed | Archetype can be picked before 3rd level | rules | class-choices | bug-confirmed | S |
| [W-042](#w-042) | low | fixed | Maneuver with an unmet prerequisite added without a warning on its row | bug | class-choices | bug-confirmed | S |
| [W-047](#w-047) | low | fixed | A feat's power (Techie's Repair Droid) shows as two cards with empty pickers | confusing | powers | bug-confirmed | S |
| [W-048](#w-048) | low | fixed | Known powers listed in the order they were learned | improvement | powers | partial | S |
| [W-058](#w-058) | low | fixed | A counter change wipes the HP Undo | improvement | combat-tracker | bug-confirmed | S |
| [W-060](#w-060) | low | fixed | Force point pips disappear at higher totals | improvement | combat-tracker | partial | S |
| [W-061](#w-061) | low | fixed | Inspiration and Exhaustion buttons have no explanation | confusing | combat-tracker | missing | S |
| [W-074](#w-074) | low | fixed | Maniacal Rage's Intimidation advantage not listed while raging | bug | effects-states | bug-confirmed | S |
| [W-075](#w-075) | low | fixed | Celerity Oscillator's speed boost isn't mentioned after a hit | improvement | effects-states | missing | S |
| [W-088](#w-088) | low | fixed | Qty and Pay carry over to the next item picked | bug | inventory-credits | bug-confirmed | S |
| [W-090](#w-090) | low | fixed | Armor properties (Stealth disadvantage, Strength requirement) not shown or applied | rules | inventory-credits | partial | S |
| [W-091](#w-091) | low | fixed | No Sell action | missing | inventory-credits | missing | S |
| [W-093](#w-093) | low | fixed | An open item Description jumps to another item after the list changes | bug | inventory-credits | bug-confirmed | S |
| [W-107](#w-107) | low | fixed | Shift-click to roll selects page text | bug | dice-roller | bug-confirmed | S |
| [W-108](#w-108) | low | fixed | Sneak Attack offered on an attack rolled with disadvantage | rules | dice-roller | missing | S |
| [W-109](#w-109) | low | fixed | Show the critical range on the attack dock | improvement | dice-roller | partial | S |
| [W-110](#w-110) | low | fixed | 'Roll again' appears exactly where 'Roll' was | improvement | dice-roller | bug-confirmed | S |
| [W-111](#w-111) | low | fixed | DC box in the roller with Success / Failure | improvement | dice-roller | missing | S |
| [W-119](#w-119) | low | fixed | Long rest message reads oddly when only exhaustion changes | confusing | rests | bug-confirmed | S |
| [W-123](#w-123) | low | fixed | Phone notice covers HP and the filter while syncing | improvement | phone-tablet | bug-confirmed | S |
| [W-124](#w-124) | low | fixed | Class table scrolls sideways on the phone | improvement | phone-tablet | partial | S |
| [W-125](#w-125) | low | fixed | Tracker −/+ buttons too small on the phone | improvement | phone-tablet | partial | S |
| [W-131](#w-131) | low | fixed | Concentration chip in the desktop summary isn't clickable | improvement | navigation-layout | missing | S |
| [W-132](#w-132) | low | fixed | Sidebar 'Overview' jump scrolls past the 'Not synced' banner | confusing | navigation-layout | bug-confirmed | S |
| [W-133](#w-133) | low | fixed | Filter leaves empty group headers and always shows the Settings card | improvement | navigation-layout | bug-confirmed | S |
| [W-134](#w-134) | low | fixed | First click right after a sidebar jump is ignored | bug | navigation-layout | bug-plausible | S |
| [W-135](#w-135) | low | fixed | The app icon looks like a ☰ menu button on the phone | confusing | navigation-layout | needs-decision | S |
| [W-136](#w-136) | low | fixed | More ▾ scrolls away on the phone | improvement | navigation-layout | missing | S |
| [W-138](#w-138) | low | fixed | Backup: 'Export all' includes everyone's characters; no per-character backup named as such | improvement | data-backup | missing | S |
| [W-139](#w-139) | low | fixed | 'Last full backup: never' not refreshed after an export | bug | data-backup | bug-confirmed | S |
| [W-150](#w-150) | low | fixed | Carrying capacity ignores Powerful Build and Brawny | bug | rules-accuracy | missing | S |
| [W-151](#w-151) | low | fixed | 0 damage on a hit: is there a minimum in SW5E? | rules | rules-accuracy | not-a-bug | S |
| [W-153](#w-153) | low | fixed | Togruta shows a Darkvision trait that SW5E's species rules don't list | rules | rules-accuracy | sw5e-site | S |
| [W-155](#w-155) | low | fixed | Ability breakdown lumps species, ASI and feat bonuses together | improvement | rules-accuracy | partial | S |
| [W-161](#w-161) | low | fixed | Enter in the tweak Reason box doesn't add the tweak | improvement | other | missing | S |
| [W-162](#w-162) | low | fixed | Tweak target list is one flat 65-entry select | improvement | other | missing | S |
| [W-086](#w-086) | medium | decided | Encumbrance: changes silently, doesn't affect speed, consequence unexplained | bug | inventory-credits | needs-decision | S |
| [W-121](#w-121) | medium | decided | AC disappears from the phone strip while a state is active | improvement | phone-tablet | needs-decision | S |
| [W-040](#w-040) | low | decided | Archetype list has deprecated near-duplicate entries | confusing | class-choices | needs-decision | S |
| [W-092](#w-092) | low | decided | Enter in the item search adds the item straight away | improvement | inventory-credits | needs-decision | S |
| [W-006](#w-006) | medium | upstream | Builder's power picker moves rows under the cursor and hides casting stats | improvement | creation | sw5e-site | M |
| [W-083](#w-083) | medium | upstream | Some items weigh 0 lb (Tinker's implements, light physical shield) | rules | inventory-credits | sw5e-site | S |
| [W-089](#w-089) | low | upstream | Mesh armor price differs: 600 in the builder, 500 cr in the sheet | bug | inventory-credits | sw5e-site | S |
| [W-152](#w-152) | low | upstream | Operative 1's Expertise missing from the builder and sw5e.com's sheet | rules | rules-accuracy | sw5e-site | S |
| [W-145](#w-145) | high | not a bug | Remarkable Athlete (Assault Specialist) not applied | rules | rules-accuracy | not-a-bug | S |
| [W-148](#w-148) | medium | not a bug | Shield AC counted although the Guardian lists no shield proficiency | rules | rules-accuracy | not-a-bug | S |
| [W-059](#w-059) | low | not a bug | Undo offers an old action after a reload or unrelated changes | confusing | combat-tracker | not-a-bug | S |
| [W-112](#w-112) | low | not a bug | Critical-damage rule choice is shared by all characters | confusing | dice-roller | not-a-bug | S |
| [W-094](#w-094) | low | works | Remove × sits right next to Use on consumables, with no confirm | improvement | inventory-credits | exists | S |
| [W-154](#w-154) | low | works | Stimpac 'only one at a time' rule: check it's enforced and shown | rules | rules-accuracy | exists | S |

## Items

<a id="creation"></a>
### Creating a character

<a id="w-001"></a>
#### W-001 Create the character in the extension (guided, works on a phone)

**fixed** · high · missing · reported by Tomas, Jun ([Tomas-A1](panel/2026-10-17/tomas-a.md), [Jun-A1](panel/2026-10-17/jun-a.md))

> When I create a new character, I want the extension to walk me through species, class, ability scores, background, skills/tools/languages and equipment, with every choice as a picker and live numbers, and usable at 390 px, so that I don't build it in sw5e.com's builder in a desktop tab and then repair half of it with tweaks.

- **What they saw:** Builder problems both players hit: the red '!' on the gear only means 'Character has unsaved changes', and you find that out only by opening it. Saving happens silently when you press CHARACTER SHEET. Point Buy is hidden behind the gear. The Add Equipment search needs a second click/tap before typing registers, every time, and the feat dropdown needs a second tap. The equipment dialog shows cost and weight but no AC, armor type, damage, range or properties. 'Explorer's pack' gives 'No data available'. There are no pickers for species choices (Zabrak Coercive, Crafters), the feat's +1, the background's 2 skills/tool/language, the class's 2 skills or the fighting style, and no starting package. Jun (phone-only) also needed a desktop tab. In the builder the power chooser moves checked powers to the top under his finger, an expanded row stays open by position when the level filter changes (Detonator became Overload), and the URL stays 'temp-…?isNew=true' until you go back to My Characters. Afterwards Tomas fixed his Zabrak Fighter with 8 tweaks plus Notes, and Jun his Sullustan Engineer with 7 tweaks. The individual missing steps are tracked separately: W-002 (ability scores), W-003 (equipment), W-024 (skills), W-025 (tools/languages), W-026 (feat increases), W-006 (builder power picker).
- **To reproduce:** sw5e.com My Characters > + > +. Build a Zabrak Fighter (Soldier, Weapon Expert) or a Sullustan Engineer (Scientist, Techie), then Load from SW5E and compare the sheet with the rules.
- **Expected:** One creation flow in the extension that uses SW5E's lists for each choice and shows final scores, HP, AC and attacks live, at phone width too. sw5e.com's rules engine still computes the numbers.
- **Workaround used:** Built it on sw5e.com, used Load from SW5E, then fixed it with tweaks and Notes.
- **Checked against the code:** missing, effort XL, `viewer.js (no creation flow); README 'Your data' section`. No creation flow exists. The viewer only loads finished characters (viewer.js:loadFromSw5e, importFiles), and the README still calls sw5e.com's builder 'the place for rules-heavy changes'. The data a flow would need is already in the cached rules modules (bridge.js:sw5ePageExtract, mode 'rules'): species traits, classes.skillChoicesList/numSkillChoices/equipmentLines/startingWealthVariant/quickBuildText, backgrounds.skillProficiencies/toolProficiencies/languages/equipment/featOptions and the personality tables. The builder problems the players list are sw5e.com's own; they argue for building this. The individual steps are W-002, W-003, W-024, W-025 and W-026.
- **Resolution:** New character wizard (More ▾ → New character…, or the first page): name and species with its increases, class with skills and tools, ability scores (standard array, point buy, manual/rolled) with species and feat bonuses shown, background with skills, tools, languages, feat and its +1, starting equipment or wealth, personality, and a review of what's open. Kept here; 'Save to sw5e.com' creates it on the account (decisions 35-39). (`f7763e7`)

<a id="w-002"></a>
#### W-002 Ability score step: show base + species + feat = final score and modifier

**fixed** · high · improvement · reported by Mira, Jun, Priya, Sam ([Mira-A3](panel/2026-10-17/mira-a.md), [Jun-A4](panel/2026-10-17/jun-a.md), [Priya-A24](panel/2026-10-17/priya-a.md), [Sam-A3](panel/2026-10-17/sam-a.md))

> When I assign ability scores, I want to see base + species + feat = final score and modifier live, with where each bonus comes from (and a hint about which abilities my class wants), so that I know I'll end up with Wis 18 / Int 18 / Str 18 before I commit.

- **What they saw:** The builder's Determine Ability Scores step has only six standard-array dropdowns (15/14/13/12/10/8). None of the bonuses are shown on that step. Mira: Kel Dor +2 Wis/+1 Dex and Empathic +1 Wis. Jun: Sullustan +2 Int/+1 Dex and Techie +1 Int. Priya: Togruta +2 Wis/+1 Str and the feat's +1. Sam: Wookiee +2 Str/+1 Con and Brawny +1 Str. Sam, a first-time player, only learned from the sheet that Str would be 17 (18 with Brawny), and asked for a 'Str then Con' hint for his class. All four checked the final numbers afterwards on the sheet or by mental maths.
- **To reproduce:** sw5e.com builder > Ability Scores > Standard Array, with any species chosen.
- **Expected:** A live final score and modifier for each ability, with every bonus listed by source. Part of the in-extension creation flow (W-001).
- **Workaround used:** Mental maths, or reading the sheet afterwards. Sam followed the class page's 'Quick build' text.
- **Checked against the code:** missing, effort M, `viewer.js:renderAbilities (breakdown only after the fact)`. There's no ability-score step. After the fact, renderAbilities shows 'base N · +X from species/ASIs/feats/tweaks', which lumps all sources into one number. Background-feat increases aren't applied at all (W-026). The rules data for a live breakdown is cached: species 'Ability Score Increase' traits, feat texts, and classes.primaryAbility/quickBuildText for the hint. Build it as part of W-001.
- **Resolution:** The ability score step shows base + species + feat = score and modifier for every method, with the point-buy total. (`f7763e7`)

<a id="w-003"></a>
#### W-003 Starting equipment: class/background (a)/(b) choices or a starting-wealth roll

**fixed** · high · missing · reported by Mira, Jun, Priya, Sam ([Mira-A5](panel/2026-10-17/mira-a.md), [Jun-A5](panel/2026-10-17/jun-a.md), [Priya-A21](panel/2026-10-17/priya-a.md), [Sam-A5](panel/2026-10-17/sam-a.md), [Sam-A6](panel/2026-10-17/sam-a.md))

> When I finish creation, I want the class and background starting equipment offered as their (a)/(b)/(c) choices, with packs unpacked and background credits added, or a starting-wealth roll instead, so that I don't rebuild my kit item by item and I know what I'm allowed for free.

- **What they saw:** For all four, the builder's Equipment step starts at 'CREDITS: 0' and offers nothing from the class or background. Mira (Consular): '(a) a simple lightweapon or (b) a simple vibroweapon; (a) a scholar's pack, (b) an explorer's pack, or (c) a diplomat's pack'. Force Adept gives 'common clothes, a sturdy knife, and a belt pouch containing 150 cr', and the variant wealth is 5d4 x 100 cr. Jun (Engineer): each item took +, two taps on search, typing, scrolling (the plain 'Wristpad' comes after 12+ enhanced variants), Equipped and Add. The blaster pistol dialog showed no damage, range or properties, and the Scientist's 100 cr had to be added by hand. Priya (Guardian): (a) mesh armor / (b) combat suit + light shield, lightweapon + shield / two weapons, priest's / explorer's pack, plus the Jedi's gear and 150 cr. That was about 6 actions per item, and packs give 'No data available'. Sam: the Mercenary's 100 cr went in via Adjust Credits. He also added a 950 cr Vibroaxe for free, and nothing tells you whether that is allowed as starting kit or is cheating (Sam-A6).
- **To reproduce:** sw5e.com builder > Equipment step, for any new character.
- **Expected:** (a)/(b) choices for each line of the class and background lists. Packs are added as their contents and background credits are included. Alternatively, roll starting wealth. Starting-kit items are flagged, so free adds are clearly allowed.
- **Workaround used:** Added items one at a time in the builder and the sheet, typed credits by hand, and followed the class equipment list from memory.
- **Checked against the code:** missing, effort L, `viewer.js:renderBackground (shows ref.equipment as text), addItemFromCatalog`. There's no starting-kit step. renderBackground only prints the background's equipment sentence. Class equipmentLines ('(a)… or (b)…') and startingWealthVariant are in the rules data but never used. Packs aren't in SW5E's item catalog (W-079), so unpacking needs a hand-made contents table. Items can be added free today (the 'Pay' box is optional), but nothing marks them as starting kit, which is Sam's 'is this cheating?' question.
- **Resolution:** Each class line's (a)/(b)/(c) choice and the background's list are resolved to SW5E's items (kinds like 'simple blaster' become a list to pick from, 'light or medium physical shield' either); packs and story items become renamable custom items; credits from 'a pouch containing 100 cr'; or starting wealth with its roll (decision 38). Packs aren't unpacked (W-079). (`f7763e7`)

<a id="w-004"></a>
#### W-004 Validation says 'All checks passed' while creation choices are missing

**fixed** · high · bug · reported by Jun, Sam ([Jun-A8](panel/2026-10-17/jun-a.md), [Sam-A16](panel/2026-10-17/sam-a.md))

> When my new character is missing skills, tools, languages and feat/species bonuses, I want Validation to list what's missing, so that I fix it before playing instead of being told everything is fine.

- **What they saw:** Settings, Tweaks & Data > Record shows 'Validation: All checks passed'. Jun's character at that point had 0 of 3 Engineer skills, 0 of 2 Scientist skills, no tools and no extra languages, and the Techie Int +1 wasn't applied. Sam's was missing Brawny, Menacing, Hide, Claws and the class/background skill choices. In part B, Jun's Validation still said 'All checks passed' while his class level had been silently reverted (W-011). Jun rated it high and Sam low.
- **To reproduce:** Load a fresh builder character, then open Settings, Tweaks & Data > Record.
- **Expected:** Messages such as 'Engineer: choose 3 skills (0 chosen)', 'Scientist: 2 skills, 1 tool, 1 language', 'Techie: Int +1 not applied', 'Mercenary: 2 skills not chosen', 'Brawny: +1 Str not applied'.
- **Workaround used:** Compared by hand.
- **Checked against the code:** missing, effort M, `viewer.js:renderData ('Validation' row shows snap.validation)`. Confirmed. The Record card shows snap.validation.message, which is SW5E's getCharacterValidation run on the site's copy at load time (bridge.js:sw5ePageExtract). It isn't run on the edited copy, although state.derived[key].validation exists and is never shown. The viewer adds no checks of its own. That explains 'All checks passed' while Jun's local class edit held the old level (W-011). Needed: the sheet's own checks (class/background skill counts, tools, languages, feat increases), plus showing the derived validation.
- **Resolution:** The creation review lists what's still to choose, and Overview lists every open choice of an existing character (skills, tools, languages, feat +1s, empty ASIs, archetype, options, maneuvers and powers below their counts), each linking to its section. (`5228760`)

<a id="w-005"></a>
#### W-005 Pick or roll the background's suggested characteristics

**fixed** · medium · improvement · reported by Mira, Jun, Priya, Sam ([Mira-A14](panel/2026-10-17/mira-a.md), [Jun-A40](panel/2026-10-17/jun-a.md), [Priya-A40](panel/2026-10-17/priya-a.md), [Sam-A22](panel/2026-10-17/sam-a.md))

> When I fill in personality, I want to pick or roll from my background's suggested trait, ideal, bond and flaw tables, so that I don't invent and type everything (on a phone keyboard, too).

- **What they saw:** Force Adept, Scientist, Jedi and Mercenary all have SUGGESTED CHARACTERISTICS d8/d6 tables, which only appear in sw5e.com's 'View background details' dialog. Personality & Appearance > Edit has only empty text boxes. Jun typed all four fields on the phone keyboard, and Sam copied text from sw5e.com.
- **To reproduce:** Personality & Appearance > Edit.
- **Expected:** A Pick / roll button for each field, fed from the background's tables.
- **Workaround used:** Typed their own text, or copied it from sw5e.com.
- **Checked against the code:** missing, effort S, `viewer.js:EDITORS.personality / renderEditor`. The Personality editor has only free textareas. The rules data already holds each background's personalityTraitOptions, idealOptions, bondOptions and flawOptions (with roll numbers; checked in dev/dumps/rules.json, e.g. Scientist), so Pick and Roll buttons are cheap to add.
- **Resolution:** Pick or roll each personality trait, ideal, bond and flaw from the background's tables, in the wizard and in the Personality editor. (`5228760`)

<a id="w-006"></a>
#### W-006 Builder's power picker moves rows under the cursor and hides casting stats

**upstream** · medium · improvement · reported by Mira ([Mira-A1](panel/2026-10-17/mira-a.md), [Mira-A2](panel/2026-10-17/mira-a.md))

> When I tick powers while creating a character, I want the list to stay still with chosen powers shown apart, and a header showing my casting ability, attack, DC and force points per alignment, so that each click ticks the power I aimed at and I pick powers that fit my scores.

- **What they saw:** In sw5e.com's Choose Force Powers dialog, a ticked power jumps to the top and the list re-renders. Mira's 3rd and 4th clicks hit the wrong rows: Force Shunt got ticked instead of Force Push/Pull, and Mind Trick was missed. Jun saw the same reshuffle (W-001). The dialog has only level and alignment filters. DC, attack and force points appear only on the finished sheet: Light DC 13 / +5 and Dark DC 11 / +3 at Wis 17, Cha 12. Light = Wis, dark = Cha, universal = either is never explained.
- **To reproduce:** Builder > Class > Consular > Choose Force Powers. Tick Guidance, then Turbulence, then click where Force Push/Pull was.
- **Expected:** In the extension's creation flow: a picker whose rows don't move, a separate 'chosen' list, and a header such as 'Light: Wis +3 → DC 13, attack +5; Dark: Cha +1 → DC 11; Force points 7'.
- **Workaround used:** Unticked the wrong power and ticked the right ones by script. Read the casting stats on the sheet afterwards.
- **Checked against the code:** sw5e-site, effort M, `sw5e.com builder; extension: viewer.js:renderPowerBlocks, renderCasting`. The reshuffling dialog belongs to sw5e.com's builder. In the extension, the class-card picker (renderPowerBlocks) is a static grouped <select> that doesn't move rows, but adding by keyboard has the W-027 bug. Light/dark/universal DC and attack appear only in the Force Casting section (renderCasting), not beside the picker. This argues for a casting header in the creation and level-up flow (W-001, W-007).

<a id="level-up"></a>
### Levelling up

<a id="w-007"></a>
#### W-007 Level up in the extension (HP, features, choices, multiclassing)

**fixed** · blocker · missing · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A40](panel/2026-10-17/mira-a.md), [Mira-B3](panel/2026-10-17/mira-b.md), [Tomas-A24](panel/2026-10-17/tomas-a.md), [Tomas-B2](panel/2026-10-17/tomas-b.md), [Jun-A45](panel/2026-10-17/jun-a.md), [Jun-B3](panel/2026-10-17/jun-b.md), [Priya-A1](panel/2026-10-17/priya-a.md), [Priya-B4](panel/2026-10-17/priya-b.md), [Sam-A48](panel/2026-10-17/sam-a.md), [Sam-B3](panel/2026-10-17/sam-b.md), [Sam-B19](panel/2026-10-17/sam-b.md))

> When my XP reaches a new level, I want a Level up button that walks me through the level in order, so that I never have to rebuild a level in sw5e.com's builder and Load it back (which lost levels for everyone, W-011). The steps: the class to level (a new class with its prerequisite checked); HP rolled or taken as the average, with Con and species bonuses shown; the new features with their text; then that level's choices (powers up to the table count, maneuvers, instincts, fighting style, aura, archetype at 3rd, ASI/feat at 4th).

- **What they saw:** There is no level control anywhere: the players checked Classes & Progression, the More menu and Overview, and Tomas and Sam grepped the code. The class table already shows what's next, e.g. 'Next (2nd): Force-Empowered Casting, Force Shield, 11 powers known, 8 force points' (Mira), 'Next (2): Infuse Item (+1), Tool Expertise, 7' (Jun), 'Next (2nd) +2 Reckless Attack, Berserker Instincts 2' (Sam). The README says sw5e.com's 'builder is still the place for rules-heavy changes (levels, multiclassing…)'.

Builder problems all five hit while levelling 1→2→3→4:
- The 'Number of levels in this class' dropdown needs two clicks.
- It silently sets 'Current Experience' to the level's minimum (300, 900, 2,700). It showed 'Current Experience: 0' first, because the site never got the XP recorded locally.
- The HP dropdown is preset to the average (4/5/6/7) with no roll, and no Con or Toughness shown. 'Hit Points Calculation: Manual' is hidden under the ⚙.
- Force-Empowered Castings, Fighting Style, Guardian Aura and Berserker Instincts have no picker, only text ('You've honed two instincts…').
- A red '!' badge appears on the gear with no explanation.
- There are hidden duplicate 'Character Sheet' buttons (8 of them, Tomas).

Multiclassing (Tomas): ADD NEW CLASS → Operative ran no Dex 13 check and offered no multiclass proficiency picks. It listed no Expertise, and nothing said that Fighter 3 / Operative 1 gets no ASI at level 4.

Cost: about 15 actions across two tabs per level (Tomas). Mira needed 3 builder trips for levels 2–3 and 2 for level 4. Sam, a first-time player, found the instinct picker in the sheet only by himself. Sam-B19 asks for an HP step that explains 'take 7 (average) or roll 1d12, + Con 2 → HP max 14 → 23'.
- **To reproduce:** Set XP to 300 or 900 on a level 1 character, then look for any way to add a level in the sheet.
- **Expected:** A 'Level up' button next to the XP bar, then these steps:
1. Class: an existing one, or a new one with its prerequisite checked (Operative Dex 13, Fighter Str or Dex 13) and the multiclass proficiency pickers.
2. HP: Roll in the dice roller, or Take the average, with Con and Toughness shown along with the new maximum.
3. The new features with their text.
4. The existing pickers for that level's choices, with counts.
5. ASI/feat, only when a class reaches 4/8/….
6. A summary of what changed.
It never changes XP behind the player's back, sw5e.com's rules engine still computes the numbers, and it works in the 390 px layout.
- **Workaround used:** Levelled in sw5e.com's builder, then used Load from SW5E. That only works if you Sync first whenever you have class choices made in the sheet (W-011).
- **Checked against the code:** missing, effort XL, `viewer.js:renderClasses (only the 'Next (n)' table row); README`. Confirmed: there is no level control anywhere. renderClasses shows the next table row read-only. The README sends players to the builder. The data for a flow is present (levelChanges, hitDiceDieType, feature texts, choice slots in choices.js), and the existing pickers could be reused for step 4. It must write classes[i].levels/hitPoints/abilityScoreImprovements in a way that survives Load and Sync; today any local classes edit freezes levels (W-011). HP average and roll could use the roller.
- **Resolution:** Level up (Classes & Progression, or the XP line): class or a new class with SW5E's multiclass minimums, hit points (average or roll), the ASI or a feat, the archetype at its level, and what the level brings; Undo; XP raised to the level's threshold like the builder (decision 36). New powers/maneuvers/options are then picked in the class card. (`f7763e7`)

<a id="w-008"></a>
#### W-008 Choose ASI (+2 / +1+1) or a feat in the extension

**fixed** · blocker · missing · reported by Mira, Jun, Priya, Sam ([Mira-B4](panel/2026-10-17/mira-b.md), [Jun-B4](panel/2026-10-17/jun-b.md), [Priya-B5](panel/2026-10-17/priya-b.md), [Sam-B5](panel/2026-10-17/sam-b.md))

> When I reach 4th level (or 8th, 12th…), I want the Ability Score Improvement card to let me choose +2 to one ability, +1 to two, or a feat (searchable, with its text, prerequisites and own picks), with a preview of the result against my real scores, tweaks and the 20 cap included, so that I don't need the builder and I land where I expect.

- **What they saw:** The sheet shows the ASI card ('Ability Score Improvement · Level 4 · You can increase one ability score by 2…') with only a Notes box (Mira, Jun). The result appears only as a read-only chip, 'Ability score improvements · Ability Score Improvement: Strength +2' (Priya, Sam). Nothing appears under Feats. In the builder, 'Choose an option' → ASI / Feat gives two ability selects with no current scores and no cap warning. The feat list is alphabetical and shows names only; the text appears only after picking (Mira typed 'War' and got 'Exalted Awareness, War Caster'). The builder thinks Int is 17 (Jun) and Str 19 (Sam) because Techie and Brawny exist only as tweaks in the sheet. So Int +2 and Str +2 landed exactly on the 20 cap with no warning. Priya's and Sam's ASI from the builder was then thrown away by Load (W-011).
- **To reproduce:** Level a character to 4, then open Classes / Class Features / Feats in the sheet.
- **Expected:** An ASI/feat picker on the class card at levels 4/8/12/16/19. It shows each score and modifier and the result ('Str 18 → 20: attack +7 → +8, damage +5 → +6') and caps at 20, counting feats and tweaks. Feats are searchable, with text and prerequisites. The card then shows the choice.
- **Workaround used:** Chose in sw5e.com's builder, saved and loaded. Priya and Sam then needed a javascript_tool merge, because Load dropped the result (W-011).
- **Checked against the code:** missing, effort L, `viewer.js:renderClasses (ASIs as read-only chips), featureNoteBox`. Confirmed. ASIs show only as chips from classes[i].abilityScoreImprovements, and the ASI feature card has just the generic notes box (featureNoteBox). There's no picker, preview or 20-cap check. The feat list is in the rules data, and choices.js already handles feat prerequisites and feat slots (choiceSlots step 3), so a picker can reuse those. Writing ASIs to classes[] runs into W-011 until the merge is fixed.
- **Resolution:** The level-up's Ability Score Improvement: +2 to one, +1 to two (abilities that would pass 20 are off) or a feat with its text. (`f7763e7`)

<a id="w-009"></a>
#### W-009 'You have unused levels. Click below to add more class levels.' points at nothing

**fixed** · blocker · confusing · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A39](panel/2026-10-17/mira-a.md), [Tomas-A25](panel/2026-10-17/tomas-a.md), [Jun-A44](panel/2026-10-17/jun-a.md), [Priya-A2](panel/2026-10-17/priya-a.md), [Sam-A47](panel/2026-10-17/sam-a.md))

> When the sheet tells me I have unused levels, I want a Level up button right there (or the real instructions), so that I'm not sent looking for a button that doesn't exist.

- **What they saw:** After Overview > Edit > XP +300, the bar shows '300 XP · next level at 300 (0 to go)' and an orange chip says 'You have unused levels. Click below to add more class levels.' (wording copied from sw5e.com's builder). Clicking the chip does nothing (Sam), and nothing below it is clickable. Classes & Progression only has the 'Next (2nd)' table row. All five hit this in part A, and it reappeared at every level in part B. Jun rated it medium, the others high.
- **To reproduce:** Set XP to the next level's threshold and wait for the recalculation.
- **Expected:** A Level up button (W-007). Until that exists: 'Level up in sw5e.com's builder (Class step > Number of levels), then Load from SW5E', with a link.
- **Workaround used:** None in the sheet. Used the builder in part B.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderOverview (`xp.isCorrect === false && xp.errorMessage`)`. The orange chip is SW5E's engine message xp.errorMessage, printed verbatim ('Click below to add more class levels'). It refers to the builder, not this page, and the chip is a plain span with no action. Until W-007 exists, replace the text with real instructions and a link to the builder.
- **Resolution:** The engine's message is replaced: '900 XP is enough for level 3: 2 levels to take. Add them in sw5e.com's builder (Class, number of levels), then press Load from SW5E', with a link to the character on sw5e.com. A real level-up is W-007. (`3103be9`)

<a id="w-010"></a>
#### W-010 XP line doesn't say which level the XP reaches or how many levels are owed

**fixed** · high · confusing · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-B18](panel/2026-10-17/mira-b.md), [Tomas-B12](panel/2026-10-17/tomas-b.md), [Jun-B8](panel/2026-10-17/jun-b.md), [Priya-B19](panel/2026-10-17/priya-b.md), [Sam-B18](panel/2026-10-17/sam-b.md))

> When my XP passes one or more level thresholds, I want the Overview to say which level I should be and how many levels to take, so that I know to level twice.

- **What they saw:** All five saw it. A level 1 character with 900 XP shows '900 XP · next level at 300 (0 to go)'. At level 2 it shows 'next level at 900 (0 to go)', and at level 3 with 2,700 XP 'next level at 2,700 (0 to go)'. Clicking the chip or 'Level 1' does nothing (Sam). Sam logged it as a bug, Jun as low; the others rated it medium.
- **To reproduce:** Overview > Edit > XP 900 on a level 1 character.
- **Expected:** '900 XP: enough for level 3 (you are level 1, 2 levels to take). Next: level 4 at 2,700', linked to the level-up flow.
- **Workaround used:** Counted the XP table themselves.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderOverview`. renderOverview uses SW5E's xp.nextLevel for the current level and prints `Math.max(0, next - cur)`. With 900 XP at level 1 it says 'next level at 300 (0 to go)'. Nothing computes which level the XP reaches or how many levels are owed. Fix: compute from the XP table (SW5E's thresholds), say 'enough for level 3, 2 levels to take', and link to W-007.
- **Resolution:** The XP line counts from the XP table (SW5E's characterAdvancements): the level the XP reaches, levels owed, and the next level's threshold. (`3103be9`)

<a id="loading-sync"></a>
### Loading and syncing

<a id="w-011"></a>
#### W-011 Load from SW5E silently discards a level-up made on sw5e.com once any class choice was made in the sheet

**fixed** · blocker · bug · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-B1](panel/2026-10-17/mira-b.md), [Mira-B19](panel/2026-10-17/mira-b.md), [Tomas-B1](panel/2026-10-17/tomas-b.md), [Jun-B1](panel/2026-10-17/jun-b.md), [Jun-B2](panel/2026-10-17/jun-b.md), [Priya-B1](panel/2026-10-17/priya-b.md), [Sam-B1](panel/2026-10-17/sam-b.md))

> When I level up in sw5e.com's builder after making any class choice in the sheet (a power, maneuver, instinct or archetype) and press Load from SW5E, I want the new level, HP and ASI to come in and my sheet choices to stay, or at least a warning naming the conflict, so that the documented level-up workflow doesn't silently leave me a level behind.

- **What they saw:** All five hit it, after picking powers (Mira, Jun, Priya), a maneuver (Tomas), or instincts and an archetype (Sam). After Load, the site's raw numbers show for 2–5 s (Jun: Engineer 3, HP 24/24, 3/3d8). Then 'Recalculated with your changes · 17:08:49' puts the sheet back to the old level (Engineer 2, HP 17/17, 2/2d8, 'next level at 900 (0 to go)').

What each player saw:
- Mira: the site had Consular 3, but the sheet still showed 'Level 2', HP 12/12, HD 2/2d6, 'Now (2nd)' and powers 11/11.
- Tomas: the site had Fighter 3; the sheet showed 'Fighter 2, Operative 1 · Level 3', HP 33/33.
- Priya, twice: Guardian 2 went back to 1, and Guardian 4 (hitPoints [6,6,6], ASI Str +2) stayed at 3.
- Sam, twice: Berserker 3 went back to 2, and Berserker 4 + Str +2 stayed at 3.

Cause, which the players read from state: the local 'Class choices' edit stores the whole `classes` value (OBJECT_FIELDS in viewer.js, 'edited as a whole value'). withEdits() lets 'your own values win', so the edit replaces the site's class entry, levels and hitPoints included. Jun's edit, for example, was classes [{Engineer, levels 2, hitPoints [5], … 'Homing Rockets'}].

Nothing on screen says the site's level was ignored. The character select reads 'Kel Dor Consular 3', 'Fighter 3, Operative 1' or 'Wookiee Berserker 3' while the sheet shows the lower level (Mira-B19). The banner only lists 'Class choices', with no hint that this freezes the levels (Jun-B2), and Validation still says 'All checks passed'. There is no good way out. 'Revert to SW5E's copy' wipes tweaks, inventory, notes, XP and personality. Sync pushes the old level back to the site (W-013) and needs a working sign-in (W-012).
- **To reproduce:** 1. Load a character.
2. In Classes & Progression, learn a power or pick a maneuver, instinct or archetype.
3. Without syncing, add a level in sw5e.com's builder and save.
4. Press Load from SW5E. After the recalculation, the sheet is back at the old level.
- **Expected:** Merge the class entries field by field: levels, hitPoints, ASIs (and the archetype if it was set on the site) from sw5e.com; power, option, maneuver and archetype picks from the sheet. If they can't be merged, ask: 'sw5e.com has Consular 3, your copy has Consular 2 because of your class choices. Take the site's levels and keep my picks / Keep mine'. The character select and the sheet always show the same level. At minimum, let me revert just 'Class choices' (W-016).
- **Workaround used:** Sync to SW5E before every builder level-up (Mira, Tomas, Jun and Priya did this in B1), then redo the level in the builder and Load again. That cost about 15 minutes and an extra trip each time. Jun, Priya (B7) and Sam used javascript_tool with the viewer's setEditedFields to drop or patch the class edit. A real player can't do that.
- **Checked against the code:** bug-confirmed, effort M, `viewer.js:OBJECT_FIELDS, withEdits, loadFromSw5e, renderPicker`. Confirmed exactly as the players read it. 'classes' is in OBJECT_FIELDS and is edited as a whole value (editClass clones all of raw.classes). withEdits/setPath replaces raw.classes entirely, so the site's levels, hitPoints and ASIs are hidden. loadFromSw5e/addSnapshots replace snap.raw but never merge or prune edits. renderPicker labels the character from s.complete (the site's computation), which is why the dropdown shows Consular 3 while the sheet shows 2. Fix: merge classes per field on load (levels, hitPoints, abilityScoreImprovements and a site-set archetype from SW5E; picks from the local copy), or detect the conflict and ask.
- **Resolution:** Load merges instead of discarding: class membership, levels, hit points and ASIs always come from sw5e.com (also when shown and synced, so characters already stuck show their real level); other edited fields are merged three ways against the copy last loaded, and clashes keep the local value and are named in the load message. Decision 24. (`3103be9`)

<a id="w-012"></a>
#### W-012 Sync to SW5E hangs forever when the sw5e.com sign-in has expired (no timeout, no message)

**fixed** · blocker · bug · reported by Priya, Sam ([Priya-B2](panel/2026-10-17/priya-b.md), [Priya-B3](panel/2026-10-17/priya-b.md), [Sam-B2](panel/2026-10-17/sam-b.md))

> When my sw5e.com sign-in has expired, or a sync stalls for any reason, I want Sync and Load to time out with a plain message ('Your sw5e.com sign-in expired. Sign in there, then try again. Your data is safe here'), say whether anything reached the site, and offer Cancel, so that I don't sit watching 'Syncing…' for minutes thinking my character is lost.

- **What they saw:** Priya made 4 attempts between 18:11 and 18:23. Each showed 'Syncing…' and 'Opening sw5e.com in a background tab…' for 20 s to more than 3 min. One ended with 'Could not sync to sw5e.com: Frame with ID 0 was removed.' after she navigated her sw5e.com tab; the others never ended. The site's copy stayed unchanged, while Load kept working ('Recalculated with your changes · 18:16:22'). Sam's first sync ever (18:55) ran for 90+ s with no error, timeout or Cancel, and the Revert button disappeared while it ran. Cause, seen by both: the site's own store still says isLoggedIn=true, but every save redirects to sw5e.b2clogin.com 'Sign up or sign in'. The bridge's message 'Not signed in on sw5e.com. Sign in there, then save again.' only checks that flag. Load from SW5E while signed out only said 'Recalculated with your changes · 18:29:22' (Sam). Local edits were kept throughout.
- **To reproduce:** Let the sw5e.com session expire (the builder's CHARACTER SHEET button then redirects to Sign up or sign in). Make a change in the viewer and press Sync to SW5E.
- **Expected:** Detect the failed token refresh or login redirect and show the sign-in message. Time out (e.g. after 60 s) with 'sw5e.com didn't confirm the save; nothing was changed there; try again'. Offer a Cancel button. Never show raw text like 'Frame with ID 0'.
- **Workaround used:** Reload the viewer page to get the Sync button back (data intact). Nothing could be synced, because the panel doesn't sign in.
- **Checked against the code:** bug-confirmed, effort M, `bridge.js:sw5ePageExtract (mode 'save'), runInSw5eTab; dev/bridge-proxy.js`. There are four causes. (1) Sign-in is checked only via the store flag `G['authentication/isLoggedIn']`, which stays true after the token expires. (2) `await store.dispatch('character/saveCharacter', next)` comes before the 20 s confirmation timer. If token refresh redirects or stalls, it never resolves, and runInSw5eTab has no timeout around chrome.scripting.executeScript (its 60 s deadline is only checked between polls). dev/bridge-proxy.js has no timeout either. (3) Navigating the tab surfaces Chrome's raw 'Frame with ID 0 was removed.' (4) viewer.js:saveChangesToSw5e has no Cancel, and renderPending hides Revert while saving.
- **Resolution:** The page function bounds its waits (fetch 20 s, save 25 s + the 20 s confirmation), the extension backstops a page that stops answering, a tab that moved to the sign-in page is reported as 'sw5e.com asked you to sign in again', and Chrome's 'Frame with ID 0 was removed' becomes a readable message. The dev proxy gives up after 3 minutes. No Cancel button yet. (`3103be9`)

<a id="w-013"></a>
#### W-013 Sync to SW5E silently lowers a higher class level on sw5e.com

**fixed** · high · bug · reported by Mira, Tomas ([Mira-B2](panel/2026-10-17/mira-b.md), [Tomas-B11](panel/2026-10-17/tomas-b.md))

> When Sync would overwrite something newer on sw5e.com (like a higher class level), I want it to list what will change ('Consular 3 → Consular 2') and ask first, or merge, so that I don't undo a level-up without knowing.

- **What they saw:** After the Load that ignored the site's new level (W-011), Sync went straight through with no confirmation and no warning. Mira's sync showed 'Synced to sw5e.com · 15:46:14' and 'Same as sw5e.com's copy. Changes are kept here.', and the site then showed 'Kel Dor Consular 2' again (900/900 XP). Tomas's went 'Syncing…' → done, his dropdown changed from 'Fighter 3, Operative 1' to 'Fighter 2, Operative 1', and the site showed HP 33. Both used this on purpose as the only workaround for W-011, then levelled again in the builder.
- **To reproduce:** Make a class choice in the sheet, level up in the builder, press Load, then press Sync, and reload the sw5e.com character page.
- **Expected:** Before syncing, list the fields that would go down or be overwritten on the site and ask: 'Keep sw5e.com's levels / Send mine'. Or merge the levels as in W-011.
- **Workaround used:** Accepted the revert and levelled again in the builder.
- **Checked against the code:** bug-confirmed, effort M, `viewer.js:saveChangesToSw5e; bridge.js:sw5ePageExtract (save)`. The conflict check compares the server copy with `expected: snap.raw`. After a Load, snap.raw is already the site's newer copy, so nothing conflicts, and fields.classes (the stale local classes, W-011) overwrites next.classes whole. Nothing lists the fields that would change or go down before sending. Fix: diff the edited fields against snap.raw (levels especially) and confirm, or merge as in W-011.
- **Resolution:** Sync sends class levels, hit points and ASIs from the site's copy (never older ones), and a conflict merges the newer copy in (decision 24). (`3103be9`)

<a id="w-014"></a>
#### W-014 Load from SW5E doesn't switch to the character I just created

**fixed** · high · confusing · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A7](panel/2026-10-17/mira-a.md), [Tomas-A8](panel/2026-10-17/tomas-a.md), [Jun-A13](panel/2026-10-17/jun-a.md), [Priya-A20](panel/2026-10-17/priya-a.md), [Sam-A8](panel/2026-10-17/sam-a.md))

> When I press Load from SW5E after creating a character on sw5e.com, I want the sheet to switch to that character (the one open in my sw5e.com tab, or the new one), or ask 'New: Kadro Vos (Panel). Open it?', so that I don't load or hunt for someone else's character in a list of 9–12.

- **What they saw:** All five hit it in part A. The status said 'Loaded 5/7/8 characters from sw5e.com', but the sheet stayed on another player's character (Thirza Vitchess, Kadro Vos, Tikk Plonr or Maasha Vaal), even with the new character open in the sw5e.com tab. Mira saw the reverse: 'Consular Test (local)' switched to Thirza by itself after about 5 s, though her sw5e.com tab was on the Consular rules page (it seems to pick the most recently changed character). On the phone, Jun saw 'Opening sw5e.com in a background tab…' disappear with no result message, then a native dropdown of 10 with names cut off ('Kadro Vos (Panel) — Zabrak Figh'). Priya saw no notice within 6 s. In part B, Jun's Load stayed on his own character, which was already selected ('part A's complaint fixed'). So what's left is the case of a new character or another character being selected.
- **To reproduce:** With character X on screen, create character Y on sw5e.com, leave the sw5e.com tab open on Y, and press Load from SW5E.
- **Expected:** Switch to the character open on sw5e.com or the one just created. Otherwise show a lasting notice: 'New: Y. Open'. The result message stays readable on phones.
- **Workaround used:** Picked the character from the dropdown (on the phone, by typing its name).
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:loadFromSw5e; bridge.js:sw5ePageExtract (meta.sourceUrl)`. loadFromSw5e keeps state.current if it was loaded, otherwise falls back to keys[0] (the first character in the site's order). selectId is passed only when the viewer was opened from a sw5e.com tab (main()). preferredTabId picks the tab, never the character. The bridge already returns meta.sourceUrl (the sw5e.com tab's URL) but it's ignored. Newly appeared keys aren't detected either. Mira's switch happened because her 'local:' key became an 'id:' key after saving, so it fell to keys[0]. On phones the result toast fades after 5 s (setStatus).
- **Resolution:** Load switches to the character open in the sw5e.com tab, or else to a character that's new there (the newest), and says so in its message. (`3103be9`)

<a id="w-015"></a>
#### W-015 Sync status wording misleads; destructive 'Revert' / 'Use SW5E's values' links sit next to everyday buttons

**fixed** · high · confusing · reported by Jun, Sam, Priya ([Jun-A41](panel/2026-10-17/jun-a.md), [Sam-A49](panel/2026-10-17/sam-a.md), [Priya-A38](panel/2026-10-17/priya-a.md), [Priya-A46](panel/2026-10-17/priya-a.md))

> When I glance at the sync line or the banner, I want it to say honestly that my changes are saved here and what isn't on sw5e.com yet ('Saved in this browser; not on sw5e.com yet. Sync is optional'). I also want 'Revert to SW5E's copy' and 'Use SW5E's values' kept away from the rest and Sync buttons, with a confirmation listing what I'd lose. That way I neither think my data is unsaved nor wipe a session with a stray tap.

- **What they saw:** Jun (step A8): after a short rest, the tracker line read 'Same as sw5e.com's copy. Changes are kept here.' while 7 tweaks, inventory, notes, personality and credits were not synced. At other times it read 'Differs from sw5e.com's copy. Use SW5E's values · [Sync to SW5E]', with 'Use SW5E's values' right under Short rest / Long rest. Priya: the same link sits next to 'Sync to SW5E' and the rest buttons mid-fight. Sam (new player): the banner 'Not synced to SW5E: play state, Tweaks, Personality Traits, … Inventory, Notes, Credits, XP', with 'Sync to SW5E' and 'Revert to SW5E's copy' side by side, read to him as 'your data isn't saved', and he didn't dare touch either. Priya: the edit-form footer 'Markdown works here. Changes stay in this browser until you save them to SW5E.' contradicts the README (the viewer's copy is the character's data). Jun's part B log praises the new banner, which lists exactly what differs, as much clearer than part A's line. Jun and Sam rated it medium, Priya low.
- **To reproduce:** Change inventory or tweaks and take a short rest, then read the tracker line and the banner. Open Personality > Edit and read the footer.
- **Expected:** Wording such as 'Play state same as sw5e.com; 12 other changes not synced' and 'Saved here. Sync to SW5E is optional; export a backup.' Destructive links moved away from frequent buttons, with a confirmation that lists what would be discarded.
- **Workaround used:** Didn't touch the links.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderTracker (trk-src line), renderPending, renderEditor footer`. The wording is misleading in two places. renderTracker's 'Same as sw5e.com's copy. Changes are kept here.' compares only play state (t.local) and ignores edits. renderEditor's footer 'Changes stay in this browser until you save them to SW5E.' contradicts the README ('this viewer's copy is your character's data'). Both destructive links sit next to everyday buttons, though each has some guard: 'Use SW5E's values' (data-track=sw5e) can be undone ('Reset to SW5E values'), and 'Revert to SW5E's copy' needs a second click ('Really revert?'). Neither says what will be lost.
- **Resolution:** Banner reads 'Saved here; not on sw5e.com yet: …'; the tracker line only appears when HP and uses differ ('saved here, not on sw5e.com yet'); the editor footer and Done message say the data is saved here and Sync is optional. 'Revert to SW5E's copy…' and 'Use sw5e.com's values' are small links set apart, and Revert's confirmation names what it drops. (`3103be9`)

<a id="w-016"></a>
#### W-016 Take sw5e.com's value for one field only ('Use SW5E's' per field in the Not synced banner)

**fixed** · high · missing · reported by Priya ([Priya-B6](panel/2026-10-17/priya-b.md))

> When one field (like Class choices) is out of step with sw5e.com, I want to take the site's value for that field only, so that I don't have to choose between losing everything (Revert) and pushing my stale copy (Sync).

- **What they saw:** The banner lists 'play state, Class choices, Feature notes, Feature choices, Tweaks, Personality…, Notes, Inventory, XP', but its only buttons are 'Sync to SW5E' and 'Revert to SW5E's copy' (all or nothing). Reverting just this field is what would have rescued the lost level in W-011; Jun also asked to 'at minimum revert just Class choices'.
- **To reproduce:** Make several kinds of local changes and look at the banner.
- **Expected:** Each listed field is clickable and shows the difference, with 'Use SW5E's' and 'Keep mine'.
- **Workaround used:** Sync first, then redo the level on the site.
- **Checked against the code:** missing, effort M, `viewer.js:renderPending, discardEdits`. The banner lists field labels (fieldLabel) but offers only Sync or Revert-all (discardEdits deletes state.edits[key] entirely). Reverting one field is easy (delete edits[key].fields[path]); showing the difference per field is the larger part. This would have been the escape from W-011.
- **Resolution:** 'One at a time…' in the banner takes sw5e.com's value for a single field, with Undo. (`5228760`)

<a id="w-017"></a>
#### W-017 Show what's new after a Load that adds levels

**fixed** · high · improvement · reported by Tomas ([Tomas-B9](panel/2026-10-17/tomas-b.md))

> When a Load brings in new levels, I want a 'What's new at level 3' list (HP change, new features, choices still owed, each linked to its picker), so that I don't miss a choice.

- **What they saw:** After the Load, the sheet silently became 'Fighter 2, Operative 1 · Level 3', HP 31, with new tracker rows (Superiority dice, Action Surge, a d8 hit die). It didn't mention the choices now owed: 1 maneuver, 2 Expertise picks, 1 multiclass skill and 1 tool. Tomas had to read the whole page to find them.
- **To reproduce:** Level up on sw5e.com, then Load from SW5E.
- **Expected:** A summary panel or toast: 'Level 3: HP +17 (6 Fighter + 5 Operative + Con), new: Action Surge, Combat Superiority, Sneak Attack, Expertise; to choose: 1 maneuver, Expertise (2), Operative multiclass skill + tool'. The same summary would end the level-up flow (W-007).
- **Workaround used:** Read every card.
- **Checked against the code:** missing, effort M, `viewer.js:loadFromSw5e/addSnapshots`. A Load replaces the snapshot and reports only 'Loaded N characters'. Nothing compares old and new levels or lists new features or owed choices. The pieces exist (missingClassFeatures, choiceSlots counts, countChip '0/1'), so a summary can be computed from the before and after models. It belongs at the end of W-007 too.
- **Resolution:** A Load that brings a level added on sw5e.com says which, and what it brings ('New on sw5e.com: Fighter 4 (new: …)'). (`5228760`)

<a id="w-018"></a>
#### W-018 Numbers without tweaks flash for 3–5 s during every recalculation

**fixed** · medium · bug · reported by Tomas, Priya, Sam ([Tomas-A37](panel/2026-10-17/tomas-a.md), [Priya-A35](panel/2026-10-17/priya-a.md), [Priya-B20](panel/2026-10-17/priya-b.md), [Sam-A9](panel/2026-10-17/sam-a.md))

> When the sheet recalculates (after Load, an XP edit, a sync), I want it to keep showing my last good numbers, so that a glance mid-fight isn't wrong and I don't think my tweaks were lost.

- **What they saw:** Between 'Loaded N characters… (totals not recalculated yet)' and 'Recalculated with your changes', the sheet shows the numbers without tweaks:
- Tomas: HP 13/13 and Passive 11, then 14/14 and 13.
- Priya: Force points 2/4 and Passive Perception 12, then 3/5 and 15. In part B it also happened after an XP edit (FP 4/4 → 5/5, Passive 12 → 15), so it isn't only after Load.
- Sam, looking at Maasha's sheet: FP 4/4 and Passive 12, then 5/5 and 15.
Jun's logs show the same thing: tech points 5/5 instead of 6/6 during an XP recalculation, and AC briefly 13 during a sync.
- **To reproduce:** With tweaks on HP, Perception or an ability, press Load from SW5E or edit XP, and watch the summary and tracker.
- **Expected:** Keep the last computed values until the new ones arrive (or dim them / show 'recalculating').
- **Workaround used:** Wait.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:buildModel (`last` fallback), addSnapshots, recomputeCurrent`. buildModel only uses the last recalculation when `state.derived[key].at > snap.loadedAt`. addSnapshots (Load, Sync) and recomputeCurrent set loadedAt = now. Until the next recomputeDerived finishes, the sheet falls back to SW5E's plain snap.complete, without local tweaks or effects: Jun's AC 13 during a sync, FP 4 vs 5 after Load. Fix: keep the last derived values (dimmed) regardless of loadedAt. Check the 'after an XP edit' reports: an XP edit alone keeps `last`, so they probably followed a Load or a failed recalculation.
- **Resolution:** Until a recalculation arrives, the last one is shown (with the banner saying it's being updated) instead of SW5E's plain copy without tweaks. (`3103be9`)

<a id="w-019"></a>
#### W-019 Text-only edits trigger a full sw5e.com recalculation

**fixed** · low · improvement · reported by Priya, Sam ([Priya-A37](panel/2026-10-17/priya-a.md), [Sam-A23](panel/2026-10-17/sam-a.md))

> When I type a note, personality text or a free-text choice, I want it saved without opening sw5e.com and recalculating, so that the sheet stays calm and fast.

- **What they saw:** Typing 'Lend Aid' in a feature's 'Your choices' box (Priya), or pressing Done on Personality & Appearance (Sam), showed 'Opening sw5e.com in a background tab…' and then 'Recalculated with your changes'. This happened even with a sw5e.com tab already open, and again after every power, tweak and item change (Priya).
- **To reproduce:** Edit any feature note or personality field.
- **Expected:** Free-text changes are saved locally without a recalculation. Reuse an open sw5e.com tab when one is needed.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:recomputeDerived/freshComputed/derivedInputs, setFeatureNote, applyEditor`. The recalculation basis is canonical(fx.raw), the whole edited character including notes, characteristics and featureNotes. needsDerived is true for almost any character (feature effects, tweaks), so every text edit invalidates the cache and recalculates. Fix: drop text-only fields from the basis (featureNotes still matter where they change effects, but those changes show up as tweaks in fx.raw anyway). The 'background tab despite an open tab' part is plausible only: bridge.js:acquireSw5eTab reuses non-discarded sw5e.com tabs, so check whether that tab was discarded or in another profile.
- **Resolution:** Notes, personality/appearance, feature notes and credits are left out of the engine's basis, so editing them doesn't recalculate (decision 34). (`3103be9`)

<a id="w-020"></a>
#### W-020 No clear confirmation after Sync to SW5E

**fixed** · low · improvement · reported by Tomas, Jun ([Tomas-B28](panel/2026-10-17/tomas-b.md), [Jun-B29](panel/2026-10-17/jun-b.md))

> When I press Sync to SW5E, I want a lasting 'Synced to sw5e.com · 16:50 (Tweaks, Class choices, Notes)', so that I know it worked, and what was sent, before I level up on the site.

- **What they saw:** Tomas saw 'Syncing…' → 'Recalculating with your active effects…' → 'Recalculated with your changes · 16:50:49', and only the banner disappearing told him it worked. Jun saw the same sequence; the only confirmation was in Settings > Local version history ('17:39:05 latest · Synced to SW5E'). The Sync in Mira's tracker did show 'Synced to sw5e.com · 15:46:14', so the message exists on one path but not on the banner's.
- **To reproduce:** Make a local change, then press Sync to SW5E in the banner.
- **Expected:** A success message with the time and the fields sent, which stays until tapped on phones.
- **Workaround used:** Reload the sw5e.com sheet to check.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:saveChangesToSw5e (finally → scheduleRecompute), recomputeDerived`. On success the status reads 'Synced to sw5e.com · time'. Then `finally` calls scheduleRecompute, and recomputeDerived overwrites the status about 1–2 s later with its own messages and 'Recalculated with your changes · time'. The banner and the tracker call the same function; Mira saw the message only because no recalculation was needed then. The fields sent aren't listed. Fix: a sticky success notice, and don't let the recalculation status replace it.
- **Resolution:** Progress and success messages of a background recalculation are quiet: they don't replace a message the player's own action gave in the last 15 s, so 'Synced to sw5e.com · time' stays. (`3103be9`)

<a id="w-021"></a>
#### W-021 Explain why sw5e.com shows different numbers after a sync

**fixed** · low · confusing · reported by Tomas, Jun ([Tomas-B29](panel/2026-10-17/tomas-b.md), [Jun-B30](panel/2026-10-17/jun-b.md))

> When I compare sw5e.com's sheet with mine after syncing, I want to know which numbers differ and why, so that I don't think the sync failed or one of them is broken.

- **What they saw:** Tomas, site vs sheet: Blaster rifle 1d8+3 vs 1d8+6 (Brute Force +2, the nightstinger +1); Stealth +5 vs +7 and Perception +3 vs +5 (Expertise from the feature notes); Passive 13 vs 15. Jun: the site shows AC 13 'Combat suit', the sheet 14, because Armor (Fine) is an effect and effects are never sent (per the README). His Armstech modifications aren't on the site either.
- **To reproduce:** Sync, then open the character on sw5e.com.
- **Expected:** After a sync: 'sw5e.com will show different values for: … because it doesn't apply these features/effects (Armor (Fine) AC +1, modifications, tweak reasons)'.
- **Workaround used:** None.
- **Checked against the code:** missing, effort S, `viewer.js:saveChangesToSw5e; README 'Effects are never saved to sw5e.com'`. This is by design: effects and feature effects are local (applyEffects), and only raw fields are sent. Nothing after a sync explains why sw5e.com's numbers differ. The list is easy to build from m.fx.effects (kind item, feature or temporary) and the bumped paths (m.bumps).
- **Resolution:** After a sync the notice says what sw5e.com shows without: 'sw5e.com shows some numbers without what this sheet adds (its engine doesn't apply them): Shield (Fine): AC +1; Strength Enhancer: STR 21; Expertise: Persuasion: expertise…', up to six and a count. Long notices stay up to 20 s and are in Recent messages. (`2f3d31c`)

<a id="w-022"></a>
#### W-022 'Not synced' banner lists XP although both copies have the same value

**fixed** · low · confusing · reported by Tomas ([Tomas-B20](panel/2026-10-17/tomas-b.md))

> When the banner lists what differs from sw5e.com, I want only real differences, so that I know what a sync would change.

- **What they saw:** The builder raised the site's XP to 900, the same as the local 900. After Load, the banner still said 'Not synced to SW5E: … Notes, Credits, XP'.
- **To reproduce:** Edit XP locally, set the same XP on the site (the builder does this when adding levels), then Load.
- **Expected:** Drop fields whose local value now equals the site's.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:loadFromSw5e (no pruneEdits), pruneEdits`. pruneEdits, which drops edits now equal to SW5E's copy, is only called after a sync (saveChangesToSw5e). loadFromSw5e never calls it, so an XP edit of 900 stays listed after the site also reaches 900. Fix: call pruneEdits(key, raw) for each loaded snapshot.
- **Resolution:** Load prunes (and merges) edits for every loaded character, so a field now equal to the site's drops out of the banner. (`3103be9`)

<a id="w-023"></a>
#### W-023 'Recalculated with your changes' on a character I haven't changed

**fixed** · low · confusing · reported by Priya ([Priya-A36](panel/2026-10-17/priya-a.md))

> When I first open a freshly loaded character, I want a neutral message, so that I don't think something was changed behind my back.

- **What they saw:** The first notice for her new, untouched character was 'Recalculated with your changes · 14:27:15'.
- **To reproduce:** Load a new character and select it.
- **Expected:** 'Calculated · time', or say what changed.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:recomputeDerived`. The success message is fixed: 'Recalculated with your changes'. A recalculation runs for any character whose model has effects; feature effects such as class weapon proficiencies exist for nearly everyone, even untouched ones. Fix: word it by cause ('Calculated', or name the edits or effects).
- **Resolution:** The recalculation's message is 'Numbers updated · time', and it's quiet (see W-020). (`3103be9`)

<a id="class-choices"></a>
### Class choices

<a id="w-024"></a>
#### W-024 Class and background skill pickers (instead of hand-made proficiency tweaks)

**fixed** · blocker · missing · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A4](panel/2026-10-17/mira-a.md), [Mira-A11](panel/2026-10-17/mira-a.md), [Tomas-A4](panel/2026-10-17/tomas-a.md), [Jun-A2](panel/2026-10-17/jun-a.md), [Jun-A3](panel/2026-10-17/jun-a.md), [Jun-A9](panel/2026-10-17/jun-a.md), [Priya-A4](panel/2026-10-17/priya-a.md), [Sam-A4](panel/2026-10-17/sam-a.md), [Sam-A17](panel/2026-10-17/sam-a.md))

> When I set up a character, I want a 'choose 2 of 7' class-skill picker and a '2 of 4' background-skill picker on the class and background cards (or a proficiency toggle on the Skills table), limited to the allowed lists, with the source filled in and a warning or expertise when two sources give the same skill, so that my proficiencies are real data instead of 5–7 hand-made tweaks.

- **What they saw:** Every character arrived with no proficient skills, and neither the builder nor the sheet asks for them. Lists the players had to apply by hand:
- Mira: Consular 'Choose two from Deception, Insight, Intimidation, Investigation, Lore, Medicine, and Persuasion', plus Force Adept 2 of 4.
- Tomas: Fighter 'Choose two from Acrobatics, Animal Handling, Athletics, Lore, Insight, Intimidation, Perception, and Survival', plus Soldier 'Athletics, Intimidation, Persuasion, and Piloting'.
- Jun: Engineer 'Choose three from Investigation, Lore, Medicine, Nature, Piloting, and Technology', plus Scientist 'two from Lore, Medicine, Nature, and Technology'. Jun's wishes also ask for the class/background tool and language picks (W-025).
- Priya: Guardian 2 of 9, plus Jedi 'two from Insight, Investigation, Lore, and Persuasion'.
- Sam: Berserker 2 of 6, plus Mercenary 2 of 4. Athletics from the class plus Brawny should make expertise.

Cost: each tweak means Add a tweak to… (type to select) > mode 'proficient' > typed reason > Add, about 5–6 actions. Tomas spent about 40 actions on 5 skills, Priya about 20, and Jun made 7 tweaks. Clicking the proficiency circle on a Skills row only opens the dice dock (Mira, Sam). The tweaks show as 'tweak (not synced to SW5E yet)', not as proficiencies (Jun), and the tweak list sorts oddly (Priya). The Background card shows 'Choose two from Deception, Insight, Perception, and Persuasion' as plain text (Mira).
- **To reproduce:** Create any character on sw5e.com, Load from SW5E, and look at Skills and the class and background cards.
- **Expected:** Pickers like the fighting-style one ('2/2'), applied as proficiencies with automatic reasons ('Consular skill', 'Soldier skill') and synced as normal data. A warning or automatic expertise when two sources give the same skill. Also part of the creation flow (W-001).
- **Workaround used:** 'proficient' / 'expertise' tweaks with typed reasons. They work and show where they come from on hover.
- **Checked against the code:** missing, effort L, `viewer.js:renderSkills, renderBackground; roller.js click handler (row → roll)`. Confirmed missing. The data exists (classes.skillChoicesList/numSkillChoices, backgrounds.skillProficiencies text), but nothing offers picks. Proficiencies can only come from tweaks (addTweak) or feature notes. Clicking a Skills row rolls by design (roller.js document click handler). It needs a storage decision (a field sw5e.com keeps; bridge.js fieldType whitelists only the fields it lists), duplicate-source handling, and sync. Reuse renderSlot's counted-picker UI.
- **Resolution:** Pickers for the class's skills (classes[0].skills), a multiclass skill, and the background's skills (background.skills), which SW5E's engine applies; a skill isn't offered twice (decisions 35, 37). (`f7763e7`)

<a id="w-025"></a>
#### W-025 Add tool and language proficiencies (pickers for 'of your choice')

**fixed** · blocker · missing · reported by Mira, Tomas, Jun, Sam ([Mira-A12](panel/2026-10-17/mira-a.md), [Tomas-A10](panel/2026-10-17/tomas-a.md), [Jun-A10](panel/2026-10-17/jun-a.md), [Sam-A21](panel/2026-10-17/sam-a.md), [Jun-B11](panel/2026-10-17/jun-b.md))

> When my class, background or species gives me tools or languages 'of your choice', I want to pick them (from SW5E's lists, or by typing) in Proficiencies & Languages or on the source card, replacing the raw sentence, so that they're on the sheet and features like Tool Expertise can apply to them.

- **What they saw:** Proficiencies & Languages has no add control, although its legend says '✎ = custom proficiency added on the character'. The tweak list covers only abilities, saves, skills and numbers. The Tool row shows raw sentences as if they were tools: 'Two of your choice of artisan's implements, gaming sets, or musical instruments' (Mira; this chip also makes the phone page scroll sideways, W-120), 'One type of gaming set' (Tomas, Sam), 'One of your choice' (Jun). Jun's class card shows 'Tools Tinker's implements, one of your choice' as plain text. New in part B (Jun-B11, high): Engineer 2's Tool Expertise ('You gain expertise in any tool proficiencies you gain from this class.') has nothing to apply to. Missing species languages are tracked in W-142.
- **To reproduce:** Load any character whose background says 'choose a tool/language' (Force Adept, Soldier, Scientist, Mercenary) and open Proficiencies & Languages.
- **Expected:** Add custom tools and languages, with pickers that replace the 'of your choice' text. Tool proficiencies are recorded, so Tool Expertise applies and tool checks can be rolled with the right bonus.
- **Workaround used:** Written in Notes, e.g. 'Tools (Force Adept): Chance cubes, Ommni box'; 'Tinker's implements, Slicer's kit, Chemist's kit'; 'Sabacc deck'.
- **Checked against the code:** missing, effort M, `viewer.js:renderProficiencies; bridge.js:sw5ePageExtract fieldType`. renderProficiencies displays raw.customProficiencies and customLanguages (hence the ✎ legend) but has no control to add them. 'One of your choice' chips are SW5E's c.proficiencies shown as-is. Syncing them needs the bridge's save whitelist extended: customProficiencies and customLanguages aren't allowed there. Tool Expertise can then read class tools. clsFeatureEffects already gives expertise from notes.
- **Resolution:** Tool pickers for the class, a multiclass class and the background (customProficiencies, marked with their source) and language pickers for the background (background.languages) and species (customLanguages). (`f7763e7`)

<a id="w-026"></a>
#### W-026 Feat ability increases and granted skills aren't applied; choice feats have no picker

**fixed** · blocker · bug · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A6](panel/2026-10-17/mira-a.md), [Tomas-A3](panel/2026-10-17/tomas-a.md), [Jun-A6](panel/2026-10-17/jun-a.md), [Jun-A7](panel/2026-10-17/jun-a.md), [Priya-A5](panel/2026-10-17/priya-a.md), [Sam-A11](panel/2026-10-17/sam-a.md))

> When my feat says 'Increase your Wisdom score by 1' or 'You gain proficiency in the Insight skill', I want the sheet to apply it. When it says 'Strength, Dexterity, or Constitution' or 'an ability score of your choice', I want a picker. That way my scores, DCs, points and skills are right without tweaks.

- **What they saw:** Neither sw5e.com nor the sheet applies a background feat's fixed increases or skills:
- Empathic Wis +1 and Insight (Mira): Wis 17 'base 15 · +2 from species/ASIs/feats/tweaks', Insight +3. Once fixed: Wis 18, FP 8, DC 14, Insight +6.
- Techie Int +1, Technology and the repair droid power (Jun): Int 17 instead of 18, tech attack +5 / DC 13 instead of +6 / 14, 5 tech points instead of 6, Technology +3. Repair droid is missing on sw5e.com's sheet.
- Brawny +1 Str and Athletics (Sam): Str 17, Athletics +3. Sam's wish also covers the Wookiee species traits Menacing (Intimidation) and Claws (1d4); see W-140 and W-147.

Feats that let you choose the ability have no picker anywhere: Weapon Expert 'Increase your Strength, Dexterity, or Constitution score by 1' (Tomas) and Formfighting Dabbler 'Increase an ability score of your choice by 1, to a maximum of 20' (Priya).

The feat cards show '+ Wisdom', '+ Intelligence', '+ Strength + Dexterity + Constitution' or '+ Any' tags that look applied or clickable. Clicking one only collapses the card (Tomas, Priya). Feats have no 'Your choices' box.
- **To reproduce:** Load a character with the Empathic, Techie, Brawny, Weapon Expert or Formfighting Dabbler background feat, then check the ability score and the skill.
- **Expected:** Fixed feat increases and granted skills and powers are applied like class features (or at least flagged 'not applied by SW5E'). Feats that let you choose get an ability picker (max 20), applied like an ASI. The breakdown shows a line such as '+1 from Techie'.
- **Workaround used:** Ability score +1 and proficient/expertise tweaks with reasons.
- **Checked against the code:** missing, effort M, `viewer.js:featureEffects/featureEffectsUncached/choiceEffects, renderFeats`. Feat texts are never run through clsFeatureEffects. featureEffects covers class and archetype features, option picks and slot picks only; defensesOf reads feats only for defenses and advantages. So 'Your Wisdom score increases by 1' and 'proficiency in Insight' from a feat change nothing. The '+ Wisdom' tags in renderFeats are plain chips in the card head, so clicking toggles the card. Fixed increases could reuse clsFeatureEffects with its cap; choice feats need an ability picker. Note clsFeatureEffects already raises needsChoice for 'A or B' abilities.
- **Resolution:** A feat's +1 is a picker: the background feat's goes in background.feat.abilityScoreImprovements (SW5E applies it), an ASI feat's is applied by the sheet; feats' proficiencies and numbers ('You gain proficiency in the Insight skill') apply. (`f7763e7`)

<a id="w-027"></a>
#### W-027 Add/Learn/Choose selects add every option passed while typing or using the arrow keys

**fixed** · blocker · bug · reported by Tomas, Jun, Priya ([Tomas-A11](panel/2026-10-17/tomas-a.md), [Tomas-B6](panel/2026-10-17/tomas-b.md), [Jun-B5](panel/2026-10-17/jun-b.md), [Priya-A12](panel/2026-10-17/priya-a.md), [Priya-B7](panel/2026-10-17/priya-b.md))

> When I pick a power, maneuver, fighting style, aura or archetype by typing its name or using the arrow keys, I want only the option I confirm to be added, so that I don't collect wrong picks (or switch archetype) and have to remove them one by one.

- **What they saw:** Every 'Add…', 'Learn…' and 'Choose…' select in Classes & Progression acts on each change:
- Fighting style (Tomas, part A): typing 'Sharp' added Secured Style and Sharpshooter Style, '⚠ 2 chosen, 1 allowed'.
- Maneuvers, about 130 (Tomas, part B): 'Precision Attack' + Enter added Parry (Improved), Precise Movements and Precision Attack ('3 / 1'). Alt+↓, 'Ret' + Enter added Rally, Reassure and Return Fire ('4 / 2').
- Tech powers (Jun): 'Homing' added Haywire, Hologram and Homing Rockets ('9 / 7'). On the Archetype list, two arrow presses fired change events for 'Armormech Engineering' then 'Armstech Engineering' (caught with a listener).
- Force powers (Priya, part A): 'Guidance' added Give Life and Guidance ('6 / 5').
- Priya, part B: 'Force Leap' added Feedback (Dark), Force Disarm and Force Leap. Guardian Aura 'Aura of Pre' added Aura of Conquest and Aura of Presence ('2 / 1').

Each removal starts a recalculation of about 5 s, and the next row's × slides under the pointer (W-128). Rated medium in part A, raised to high in part B as it hit more lists.
- **To reproduce:** Classes & Progression → 'Add a maneuver…' or 'Learn a force power…' → focus it or press Alt+↓ → type a name → Enter.
- **Expected:** Add only on Enter, a click or an Add button. Better: a searchable list that shows each option's text (W-028).
- **Workaround used:** Remove the extras with ×, or type a single first letter that lands straight on the option. Jun and Priya set the select's value with javascript_tool.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:wireUi document 'change' listener (ds.clsAdd, ds.slotAdd, ds.pwAdd, ds.clsArch)`. The listener adds a pick (addClassChoice, addSlotPick, addClassPower) or sets the archetype (setArchetype) on every change event. In Chrome, a closed <select> fires change on each arrow key or type-ahead match. Each add re-renders (renderAll), refocus puts focus on the new select, and the next keystrokes add again. Fix: commit on Enter, click or blur, or an Add button, or use a combobox.
- **Resolution:** A keyboard change (arrow keys, type-ahead) in the Add/Learn/Choose/Archetype lists waits for Enter; leaving the list puts it back; a click or tap in the open list commits at once (decision 29). (`3103be9`)

<a id="w-028"></a>
#### W-028 Read an option's text before choosing it (powers, styles, maneuvers, strategies, instincts, archetypes)

**fixed** · blocker · improvement · reported by Mira, Tomas, Sam, Priya ([Mira-B16](panel/2026-10-17/mira-b.md), [Tomas-A12](panel/2026-10-17/tomas-a.md), [Tomas-B13](panel/2026-10-17/tomas-b.md), [Sam-B4](panel/2026-10-17/sam-b.md), [Priya-A23](panel/2026-10-17/priya-a.md))

> When I learn a power or choose a fighting style, maneuver, strategy, instinct, Force-Empowered Casting or archetype, I want to read each option's text and tags (level, casting time, concentration, duration, maneuver type, prerequisites) before committing, so that I compare options instead of picking by name and removing it if it's wrong.

- **What they saw:** All the pickers are plain selects of names:
- 'Learn a force power…' shows names, alignment and '(needs …)' only; no concentration or casting time (Priya).
- 'Add from Force-Empowered Castings…'.
- Archetype (12 Ways).
- 'Choose a fighting style…' (32 names).
- 'Add a maneuver…' (about 130).
- 'Add from Fighter Strategies…' (8).
- 'Add from Berserker Instincts…' (9; the options have no title).
The text appears only after adding.

Sam, a first-timer, read sw5e.com's Berserker page in another tab. Tomas learnt what Cover Strategist does only after taking it; sw5e.com's fighting-style pages didn't load, and its Fighter page doesn't list the strategies. Mira chose Battle Precognition, Sanctuary and Way of the Seer from D&D memory. Priya picked Battle Precognition in the builder and only learned on the sheet that it 'has no effect if you are wearing armor'. Sam rated it high, the others medium.
- **To reproduce:** Open any Add/Learn/Choose select in Classes & Progression.
- **Expected:** A searchable list with expandable rows or a preview pane: a one-line summary ('Predator's: speed +10 ft', 'Dewback's: resist 3 damage types while raging'), the full text, the type and prerequisites.
- **Workaround used:** Pick, read, then remove with × if it's wrong. Read sw5e.com in another tab.
- **Checked against the code:** missing, effort M, `viewer.js:renderClassChoices, renderSlot, renderPowerBlocks`. Every Add, Learn or Choose control is a plain <option> list of names with '(needs …)' or level tags. The text appears only in the <details> of a pick after adding. The texts are available (o.text, p.description, mv.description), so a searchable list with a preview pane is a UI build, not a data one.
- **Resolution:** 'Read the options' under each list (maneuvers, class options, slots, powers, archetypes) shows every option's text with a Choose button. (`5228760`)

<a id="w-029"></a>
#### W-029 Multiclass Operative: no pickers for 'any one skill' and 'one tool'

**fixed** · high · rules · reported by Tomas ([Tomas-B10](panel/2026-10-17/tomas-b.md))

> When I multiclass into Operative, I want to pick the skill and tool the multiclass grants, so that they're proficiencies on the sheet instead of tweaks and Notes.

- **What they saw:** SW5E PHB multiclassing table: 'Operative — Light armor, any one skill, one tool from the class's list' (prerequisite Dexterity 13). The sheet's Operative card says only 'Multiclass grants Light armor'. The same card also lists 'Saves Dexterity, Intelligence', 'Tools One specialist's kit of your choice' and the full single-class weapon list, which a multiclass doesn't get. The save numbers themselves are right.
- **To reproduce:** Fighter character + Operative 1 → Classes & Progression → Operative card.
- **Expected:** Pickers for the multiclass skill and tool, applied as proficiencies. Grey out or hide what a multiclass doesn't get (saves, the class's skills, other tools).
- **Workaround used:** A 'Stealth (DEX) proficient' tweak with the reason 'Operative multiclass: any one skill'. The tool (Security kit) went in Notes.
- **Checked against the code:** missing, effort M, `viewer.js:renderClasses (facts row); SW5E data multiClassProficiencies`. SW5E's data for Operative multiClassProficiencies is just ['Light armor'] (dev/dumps/rules.json), so 'any one skill, one tool' isn't in the data, and the card prints that list. The same card prints the full single-class saves, tools and weapons for any class index; only 'Multiclass grants' is added for idx > 0. Weapon effects already use the multiclass list (featureEffectsUncached). It needs a hand-written multiclass table and pickers.
- **Resolution:** A second class gets its multiclass skill and tool pickers from SW5E's Multiclassing Proficiencies table (Operative: any one skill, one tool). (`f7763e7`)

<a id="w-030"></a>
#### W-030 'Your choices' boxes stay orange after the choice is made elsewhere, and appear where there's nothing to choose

**fixed** · medium · confusing · reported by Mira, Tomas, Sam ([Mira-B24](panel/2026-10-17/mira-b.md), [Tomas-A33](panel/2026-10-17/tomas-a.md), [Sam-B21](panel/2026-10-17/sam-b.md))

> When I've picked my fighting style or archetype in Classes & Progression, I want the feature card to show the choice ('Chosen: Frenzied Approach') instead of an orange empty box, and no box on options that have nothing to choose, so that I know what's really left to do.

- **What they saw:** Tomas: the Fighting Style card's 'Your choices' box stays orange and empty, while Fighting styles (1) shows Sharpshooter Style and the picker says 1/1. Mira: the Consular Tradition card stays orange although Way of the Seer is chosen in the Archetype select. Sam: the Berserker Approach card still shows an empty 'What you chose (e.g. Persuasion + Forgery kit)' after he picked Frenzied Approach. Mira: Twinned Power's row offers 'Your choices for it, if any (e.g. Persuasion + Forgery kit)', although it has no choices.
- **To reproduce:** Pick a fighting style or archetype with its picker, then open Class Features.
- **Expected:** Show 'Chosen: … (change in Classes & Progression)' and count the feature as answered. No choices box on options that have no choices.
- **Workaround used:** Ignored them.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:featureNoteBox, renderClassChoices (cls-note inputs)`. featureNoteBox marks the box orange (`asks && !note`) whenever the feature text contains choose, choice or select. It never checks the slot picks (fighting style), the archetype select or the option lists, so Fighting Style, Consular Tradition and Berserker Approach stay orange. renderClassChoices gives every option pick a cls-note input with the 'Persuasion + Forgery kit' placeholder, Twinned Power included.
- **Resolution:** A feature whose choice is made in a picker shows 'Chosen: … · change it in Classes & Progression' (or 'Not chosen yet') with a plain Notes box: slot picks (fighting style, forms), the archetype feature, class option lists named by the feature. Option picks only get a choices box when the option's text asks for a choice. (`3103be9`)

<a id="w-031"></a>
#### W-031 Free-text 'Your choices' should be real pickers (choose-one features, Expertise)

**fixed** · medium · improvement · reported by Mira, Tomas ([Mira-B23](panel/2026-10-17/mira-b.md), [Tomas-B14](panel/2026-10-17/tomas-b.md))

> When a feature says 'choose one of…' or 'choose two of your proficiencies', I want radio buttons or a counted picker limited to the valid options, so that I don't have to type names exactly and a typo or an invalid pick can't slip in.

- **What they saw:** Force Affinity shows the chip 'Choose one of Ashla, Bendu, Bogan' and a free-text box (placeholder 'What you chose (e.g. Persuasion + Forgery kit)'). Typing 'Ashla' cleared the chip (Mira, low). Operative Expertise: typing 'Stealth + Perception' worked (Stealth +7, Perception +5, Passive 15), but nothing says it must be 2 proficient skills or tools, and nothing would flag a misspelling (Tomas, medium). Related free-text choices: Dewback's damage types (W-072), Channel the Force (W-033).
- **To reproduce:** Class Features → Force Affinity or Operative Expertise → Your choices.
- **Expected:** Radio buttons for choose-one features (Bendu could then add the Cha modifier to FP automatically). Expertise as '2 of: Insight, Intimidation, Perception, Persuasion, Piloting, Stealth, [tools]' with a count, like the fighting-style picker.
- **Workaround used:** Typed the names exactly.
- **Checked against the code:** missing, effort M, `classes.js:clsFeatureEffects/clsChosenText (reads notes); viewer.js:featureNoteBox`. Choices are parsed from free text. clsNoteNames picks skill and ability names out of the note, which works for 'Stealth + Perception' as Tomas saw. Nothing limits it to valid options or a count, and a misspelling just leaves the needsChoice chip. Radio buttons or counted pickers could reuse the renderSlot UI. Bendu's Cha to FP isn't modelled.
- **Resolution:** Feature choices are pickers with a count on the feature's card: Force Affinity offers Ashla, Bendu or Bogan (Bendu adds the lower of Wis/Cha to force points: Consular Test 23 → 25), ability increases, 'Persuasion or Intimidation', tools of a kind, weapons, damage types. The picks go into the feature's notes, so earlier notes still work. Expertise is one picker in the class card with skills and proficient tools ('Stealth + Perception' written before shows as chosen). Also fixed: 'one of the following skills: A, B, or C' gave every listed skill. (`5a2f9f6`)

<a id="w-032"></a>
#### W-032 Archetype bonus proficiencies don't show on the Proficiencies card

**fixed** · medium · bug · reported by Jun, Priya ([Jun-B12](panel/2026-10-17/jun-b.md), [Priya-B12](panel/2026-10-17/priya-b.md))

> When my archetype gives me armor or weapon proficiencies (Armstech: medium armor and martial weapons; Soresu Form: heavy armor), I want them listed on the Proficiencies and class cards, so that I know what I can use when the party splits loot.

- **What they saw:** Jun (Armstech Engineering): the Proficiencies card shows 'Armor Light armor' and 'Weapons Simple blasters, simple vibroweapons', and the class card the same. Only Combat > Effects > FROM CLASS FEATURES shows 'Bonus Proficiencies: Proficient: martial blasters · martial vibroweapons · armstech's implements · medium armor'. Priya (Soresu Form): the feature says 'You gain proficiency in heavy armor.', but Proficiencies & Languages and the class card footer still say 'Light armor, medium armor'.
- **To reproduce:** Pick Armstech Engineering or Soresu Form at 3rd level, then open Proficiencies & Languages.
- **Expected:** The Proficiencies card and class card list the archetype's proficiencies, marked with their source.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderProficiencies, renderClasses (armor/weapons facts)`. Feature effects carry e.armor and e.weapons; the Bonus Proficiencies texts parse into these, e.g. Armstech 'medium armor, martial blasters, and martial vibroweapons'. renderProficiencies only adds m.fx.tools, so armor and weapons appear only under Effects (renderEffects featRow). The class card footer prints the class's own ref.armorProficiencies and weaponProficiencies.
- **Resolution:** The Proficiencies card lists armor and weapons from class and archetype features ('medium armor · Bonus Proficiencies'). The class card footer still shows the class's own list. (`3103be9`)

<a id="w-033"></a>
#### W-033 Channel the Force: choose Cause Harm / Lend Aid and use it

**fixed** · medium · missing · reported by Priya ([Priya-A9](panel/2026-10-17/priya-a.md))

> When my class lets me pick a Channel the Force effect, I want a real choice and a Use button per effect that spends a use and shows the healing, damage and DC (on me or someone else), so that the feature works at the table.

- **What they saw:** The builder has text only. In the sheet, the Channel the Force card has a 2/2 counter and a free-text 'Your choices' box (placeholder 'What you chose (e.g. Persuasion + Forgery kit)'), where she typed 'Lend Aid'. There's no Use for Lend Aid ('guardian level + your Wisdom modifier', or neutralise a poison or disease) or for Cause Harm (a Con save at the universal DC, 'guardian level + Charisma modifier' necrotic damage).
- **To reproduce:** Features > Channel the Force.
- **Expected:** A radio choice (plus the Focus's extra effect at 3rd level), and Use buttons that spend a use and roll or show the numbers, on me or someone else. Lend Aid could also end Poisoned (W-062).
- **Workaround used:** A text note, and the counter changed with −.
- **Checked against the code:** missing, effort M, `viewer.js:featureNoteBox; classes.js:clsUsage (2/2 counter)`. There's only the use counter (clsUsage) and the free-text notes box. Nothing models Lend Aid or Cause Harm: no choice, no Use, no healing or damage roll, no DC.
- **Resolution:** Channel the Force asks which effect you start with (Cause Harm or Lend Aid; saved in the feature's notes) and adds your form's effect. Each has a Use button that spends a use and gives the save DC and amount; Lend Aid offers Heal N on yourself. (`9874b1b`)

<a id="w-034"></a>
#### W-034 Armstech modified weapon and its mods not shown where I attack

**fixed** · medium · improvement · reported by Jun ([Jun-B13](panel/2026-10-17/jun-b.md))

> When I fire my Armstech-modified blaster, I want the attack row to show it's modified (mods, attunement), so that I remember what it can do mid-fight.

- **What they saw:** After choosing Blaster pistol with Celerity Oscillator and Expanded Magazine, the Weapons & Attacks row is unchanged ('Blaster pistol +4 1d6+2 Energy'). Attunement stays 0/2, although the rules say 'Your modified weapon is enhanced, requires attunement'. Jun praised the modification picker itself, with its inline prerequisites.
- **To reproduce:** Armstech 3 > Modified Weaponry: Blaster pistol + 2 mods. Open Weapons & Attacks and Equipment.
- **Expected:** 'Blaster pistol (modified · 2 mods)' with the mods' notes, and attunement counted.
- **Workaround used:** None.
- **Checked against the code:** missing, effort S, `viewer.js:renderAttacks, featureEffectsUncached (mod: effects), completeWithEdits (attunement)`. Modification bonuses do land on the modified weapon (featureEffectsUncached adds weapon mods by k.modifiedItems), but renderAttacks shows no 'modified · N mods' marker. Attunement is counted only from inventory items with `attuned` (completeWithEdits), so the modified weapon's 'requires attunement' isn't counted.
- **Resolution:** The modified weapon is marked 'modified' in Weapons & Attacks, with 'Modified Weaponry · attuned · 2 mods' opening the mods and what they do. A modified item that requires attunement counts toward attunement (shown under Attunement). (`5a2f9f6`)

<a id="w-035"></a>
#### W-035 Infuse Item: Start with an item picker, ended by the next long rest

**fixed** · medium · missing · reported by Jun ([Jun-B28](panel/2026-10-17/jun-b.md))

> When I use Infuse Item at the end of a long rest, I want to pick the item and have the +1 applied until my next long rest, so that I don't have to remember it mid-fight.

- **What they saw:** There's only the tracker row 'Infuse Item long rest 1/1', the feature text and Notes. Effects > 'Infuse' gives 'No SW5E item with an effect matches.' A tweak ('Vibrodagger: attack/damage') would be permanent, and the vibrodagger isn't even listed in Weapons & Attacks (not equipped). Jun tapped − on the counter and the infusion was tracked nowhere.
- **To reproduce:** Engineer 2+, take a long rest, try to infuse the vibrodagger.
- **Expected:** Start → a list of unenhanced armor, shields and weapons → +1 AC or +1 attack/damage under Effects until the next long rest. It spends the use.
- **Workaround used:** Tapped − on the counter and remembered it.
- **Checked against the code:** missing, effort M, `viewer.js:LIVE.tracker counter only`. Infuse Item has only the counter from clsUsage. There's no Start with an item picker and no long-rest-limited effect. Ending the effect on a long rest would also need a hook in applyTrackerAction('long'): effects aren't ended by rests today.
- **Resolution:** Infuse Item picks the armor, shield or weapon you carry: +1 AC, or +1 to attack and damage on that weapon (+2 at 10th, +3 at 15th), until the end of your next long rest; it spends the use. (`9874b1b`)

<a id="w-036"></a>
#### W-036 Show the general lightsaber form rules next to Adopt

**fixed** · medium · rules · reported by Priya ([Priya-A14](panel/2026-10-17/priya-a.md))

> When I adopt a lightsaber form, I want to see the general form rules (action type, duration, weapon needed), so that I can check that Adopt follows them.

- **What they saw:** The form card only shows the form's own effect. The general rules aren't on the sheet, and sw5e.com/rules/phb/customization/lightsaberForms and /characters/lightsaberForms showed nothing.
- **To reproduce:** Feats > Lightsaber form > Soresu Form.
- **Expected:** A short 'Lightsaber forms' rules text, or a link, next to the picker and Adopt.
- **Workaround used:** None.
- **Checked against the code:** missing, effort S, `choices.js:chFormState; viewer.js:stateControls`. Only the form's own text is shown. The general form rules aren't in the dumped Customization chapter (dev/dumps/phb), so they'd need a hand-written note or a link. chFormState's comment ('adopted… by using your bonus action') is the only trace in the code.
- **Resolution:** Form cards (next to Adopt) and the form pickers have 'Form rules': adopted on your turn as a bonus action, replaces the form you were in, lasts as its text says, each form chosen once, forcecasters only, no particular weapon in the general rules (PHB chapter 6). (`5a2f9f6`)

<a id="w-037"></a>
#### W-037 Feature note boxes are one-line inputs that cut off text

**fixed** · low · improvement · reported by Mira ([Mira-B25](panel/2026-10-17/mira-b.md))

> When I keep notes in a feature's box (e.g. my foretelling rolls and how I used them), I want it to wrap or grow, so that I can read it back on the card.

- **What they saw:** 'Foretelling rolls: none left (11 used on boss save, 13 on my concentration save)' shows as 'Foretelling rolls: none left (11 used on boss s…' on the Force Visions card.
- **To reproduce:** Type a long note into any feature's 'Your choices' box.
- **Expected:** A textarea that wraps, or the full text shown on the card.
- **Workaround used:** Keep notes short.
- **Checked against the code:** partial, effort S, `viewer.js:featureNoteBox, renderClassChoices/renderSlot (cls-note)`. Notes exist but are single-line <input> elements (feat-note, cls-note), so long text is cut off. A textarea that grows, or showing the full note in the card text, fixes it.
- **Resolution:** Feature note boxes are text areas that grow with their text (up to 12 lines). (`dad1b17`)

<a id="w-038"></a>
#### W-038 Form Basics picker labels: doubled words and a suffix that reads like an unmet prerequisite

**fixed** · low · confusing · reported by Priya ([Priya-B21](panel/2026-10-17/priya-b.md))

> When I pick the second form from Form Basics, I want clear labels, so that I don't think I'm missing a prerequisite.

- **What they saw:** The picker shows 'Lightsaber form 0/1 · Soresu Form Form Basics' and 'You already knew Soresu Form (Feat: Formfighting Dabbler (Background (Jedi))): choose another…'. Every option says '(only if you already know the feature's form)', even though the sheet just said she does.
- **To reproduce:** Pick the Soresu Form archetype on a character who has Formfighting Dabbler → Soresu.
- **Expected:** 'Soresu Form — Form Basics'. Show the condition only when it isn't met.
- **Workaround used:** None needed.
- **Checked against the code:** bug-confirmed, effort S, `choices.js:choiceSlots (`from: ${f.sourceName} ${f.name}`, hint), viewer.js:renderSlot (tag)`. from = `${sourceName} ${name}` gives 'Soresu Form Form Basics'. The hint embeds the nested feat source ('Feat: Formfighting Dabbler (Background (Jedi))'). renderSlot tags every option outside s.allowed with '(only if you already know the feature's form)' even when insteadAny is already met. Fix: check whether the allowed form is known before adding the tag, and use a separator in from.
- **Resolution:** Slots name their source 'Soresu Form: Form Basics'; the hint names the source without the nesting ('from Feat: Formfighting Dabbler'); the '(only if you already know…)' tag is left off once the hint says you do. (`3103be9`)

<a id="w-039"></a>
#### W-039 Archetype list and form list name the lightsaber forms differently

**fixed** · low · rules · reported by Priya ([Priya-B22](panel/2026-10-17/priya-b.md))

> When I compare the Archetype dropdown with the lightsaber form list, I want to understand why there are 'Shien/Djem So Form' and separate 'Shien Form' and 'Djem So Form', so that I pick the right one.

- **What they saw:** The Archetype dropdown has Juyo/Vaapad Form, Shien/Djem So Form and Vonil/Ishu Form. The Form Basics list has 19 separate forms (Djem So, Shien, Juyo, Vaapad, Ishu, Vonil, Bakuuni Hand, Drallig, Trispzest, Twilight…). This comes from SW5E's data, but nothing explains it.
- **To reproduce:** Compare Classes & Progression > Archetype with the Form Basics list.
- **Expected:** A note explaining archetypes vs the forms from chapter 6.
- **Workaround used:** None.
- **Checked against the code:** missing, effort S, `viewer.js:renderClassChoices (archetype select) vs renderSlot (forms)`. Both lists come straight from SW5E's data: archetypes module vs lightsaberForms module. Nothing explains that combined-name archetypes (Shien/Djem So Form) differ from the individual forms. A one-line note is enough.
- **Resolution:** The Guardian's archetype picker explains that the '… Form' archetypes are guardian paths with their own features, and the lightsaber forms you adopt (chapter 6) are separate picks. (`5a2f9f6`)

<a id="w-040"></a>
#### W-040 Archetype list has deprecated near-duplicate entries

**decided** · low · confusing · reported by Jun ([Jun-B7](panel/2026-10-17/jun-b.md))

> When I choose my archetype on a phone, I want one entry per archetype, so that I don't have to guess between 'Cybertech Engineering', '(Depreciated)' and '(Old)'.

- **What they saw:** Engineer Archetype dropdown: … Cybertech Engineering, Cybertech Engineering (Depreciated), Cybertech Engineering (Old), Astrotech Engineering, Astrotech Engineering (Companion) … A phone player can't tell three near-identical names apart.
- **To reproduce:** Engineer → Classes & Progression → Archetype.
- **Expected:** Hide deprecated and old variants, or label them ('older rules, don't pick').
- **Workaround used:** None.
- **Checked against the code:** needs-decision, effort S, `choices.js:chClassInfo (archetypes list)`. chClassInfo lists every archetype of the class from SW5E's data, sorted, with no filtering, so 'Cybertech Engineering (Depreciated)' and '(Old)' appear (the data does contain these names). Options: hide deprecated or old variants unless the character already has one; label them '(older rules)' and sort them last; or keep them as is.
- **Resolution:** Older versions ('(Depreciated)', '(Old)') are kept, sorted last and labelled '— older rules'. (`3103be9`)

<a id="w-041"></a>
#### W-041 Archetype can be picked before 3rd level

**fixed** · low · rules · reported by Sam ([Sam-B20](panel/2026-10-17/sam-b.md))

> When I'm level 2, I want the Archetype select locked or labelled 'from 3rd level', so that I don't pick it early by mistake.

- **What they saw:** At Berserker 2, Classes & Progression shows 'Archetype — none —' with 15 approaches, all selectable. The Berserker Approach comes at 3rd level.
- **To reproduce:** Berserker 2 → Classes & Progression → Archetype.
- **Expected:** Disabled with '(3rd level)', like the greyed-out higher-level instincts.
- **Workaround used:** Waited until 3rd level.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderClassChoices (cls-arch select), setArchetype`. The Archetype select offers every archetype at any level, with no disabled state. Option lists, by contrast, disable options with minLevel above the level. The archetype level is in each class's table Features column ('Berserker Approach' at 3rd), so it can be gated the same way.
- **Resolution:** The Archetype list is disabled ('— at 3rd level —') before the level the class table names, unless one is already set. (`3103be9`)

<a id="w-042"></a>
#### W-042 Maneuver with an unmet prerequisite added without a warning on its row

**fixed** · low · bug · reported by Tomas ([Tomas-B21](panel/2026-10-17/tomas-b.md))

> When a maneuver I add needs another maneuver, I want its row flagged, so that I don't keep an illegal pick.

- **What they saw:** 'Parry (Improved) (needs Parry maneuver)' was added (by the type-ahead bug, W-027) without Parry known. Tomas saw no warning on the row, only the red '3 / 1' count. He removed it quickly, so a warning may have appeared later.
- **To reproduce:** Add 'Parry (Improved)' without Parry.
- **Expected:** 'Needs Parry' shown on the row, as the README describes for prerequisites.
- **Workaround used:** Removed it.
- **Checked against the code:** bug-confirmed, effort S, `choices.js:chClassInfo (maneuvers), viewer.js:renderClassChoices (maneuverBlock)`. Class maneuvers get only a count (chClassInfo returns max, sources and chosen). No problems are computed and maneuverBlock shows none: the prerequisite appears only as a faint 'Prerequisite:' line inside the pick's details. Slot maneuvers do get 'X needs the Y maneuver' (choiceSlots problems), so reuse that check for class maneuvers.
- **Resolution:** A class maneuver whose 'X maneuver' prerequisite isn't known shows 'needs X' on its row. (`3103be9`)

<a id="powers"></a>
### Powers

<a id="w-043"></a>
#### W-043 Power cards don't roll their damage or healing

**fixed** · high · missing · reported by Mira, Jun ([Mira-B7](panel/2026-10-17/mira-b.md), [Jun-A25](panel/2026-10-17/jun-a.md))

> When I cast Turbulence, Heal, Force Throw or Ion Blast, I want the card to roll its dice with my casting modifier and the chosen level (Heal at 2nd = 2d8+4; cantrip scaling), show the save DC or attack with the result, and offer 'Heal N' for healing on myself, so that powers are as quick as weapons.

- **What they saw:** Mira: Turbulence ('take 1d6 force damage') has no Cast and no roll; she typed '1d6' and got 1. Heal: Cast gives 'Cast Heal at 1st level (2 force points).' and no roll. She typed '1d8+4' → 11, but a typed roll has no Heal button (unlike the medpac's roll), so she typed 11 into the tracker as well. Force Throw's '2d8' isn't rollable either. Jun: the Ion Blast card shows 'Dexterity save DC 14' and '…or take 1d4 ion damage' with no roll button, and Electroshock only 'Attack +6'; he typed '1d4' → 2. Weapons, by contrast, are rollable.
- **To reproduce:** Open Force/Tech casting and try to roll Turbulence damage, Heal healing or Ion Blast damage from the card.
- **Expected:** A damage or healing roll from the card: dice taken from the text, the casting modifier, extra dice for higher levels, cantrip scaling at 5th/11th/17th. An attack roll for attack powers. 'Dex save DC 14' shown with the damage. A 'Heal N' button on healing for myself.
- **Workaround used:** Typed formulas in the dice dock and the results into the tracker.
- **Checked against the code:** partial, effort M, `viewer.js:powerRoll, castControls; roller.js:applyButtons`. Power cards roll only the attack (when the text says force/tech attack) and print the save DC (powerRoll). Damage and healing dice aren't parsed, nothing scales with level or cantrip tier, and powers.js has no damage handling. A typed roll in the dock gets no Heal button: applyButtons handles only hitdie, supdie, itemheal and death.
- **Resolution:** Power cards show their damage, healing or damage reduction as a roll ('Damage 1d6 force', 'Healing 1d8+5'), at the level cast (Force Potency, Overcharge Tech) and with at-will damage growing at 5th, 11th and 17th level. Cast offers the roll at the level chosen; a healing roll has Heal N (on me), capped at what you're missing. (`9874b1b`)

<a id="w-044"></a>
#### W-044 Self-buff powers don't ask for a target or apply their effects (Heroism, Battle Precognition)

**fixed** · high · missing · reported by Mira, Priya ([Mira-A25](panel/2026-10-17/mira-a.md), [Mira-B5](panel/2026-10-17/mira-b.md), [Priya-A10](panel/2026-10-17/priya-a.md))

> When I cast a buff such as Heroism or Battle Precognition, I want the sheet to ask 'on me or someone else' and, on me, apply its numbers while it lasts (AC formula, temp HP at the start of each turn, immunities) and list its benefits under Effects, so that I don't fake them with permanent tweaks or type temp HP every turn.

- **What they saw:** Heroism: Cast gives 'Cast Heroism at 1st level (2 force points). Concentrating.', and Effects says only 'Heroism (concentration) cast, lasts up to 1 minute, since Sat 12:34 · Concentrating on Heroism.' It never asks for a target, and the frightened immunity and 'temporary hit points equal to your forcecasting ability modifier at the start of each of its turns' aren't mentioned. Mira typed Temp HP 4 by hand in part A and again in part B rounds 2–3; Priya typed 3 every turn. Battle Precognition (Mira-B5): FP went 16 → 14 and an Effects entry appeared, but AC stayed 12. The rule says 'your base AC becomes 13 + your Dexterity modifier', which is 15 without armor. Battle Meditation's '+d4 to attack rolls and saving throws' isn't offered in the roller either (W-095).
- **To reproduce:** Cast Heroism, or Battle Precognition with no armor, and look at Effects, AC and temp HP.
- **Expected:** A me/someone else choice. On me, the effect carries its numbers like a stim does: AC 15 while it's active; a '+4 temp HP' button or prompt at the start of my turn; the immunity under defenses. Temp HP from the power are removed when it ends.
- **Workaround used:** Typed temp HP every turn. Mira added a permanent 'AC set to 15' tweak, which would have synced, and removed it by hand after the long rest.
- **Checked against the code:** missing, effort L, `viewer.js:castPower`. castPower starts a concentration effect with `mods: []` and the note 'Concentrating on X', or a duration reminder with `mods: []` (Battle Precognition). There's no target choice and no numbers: no AC formula, no per-turn temp HP, no immunity. effects.js parses 'AC becomes 13 + Dex' for items only (parseItemEffect), not powers. It needs a power-effects parser and a me/someone else choice.
- **Resolution:** A power whose benefits are yours applies them while it lasts: Battle Precognition's AC 13 + Dex as an unarmored AC formula, Saber Ward's resistance, Target Lock's and Battle Meditation's dice. One that helps its target (Heroism, Guidance) asks 'It's on me: apply it'. Heroism then makes you immune to being frightened, and its temporary hit points are offered at once and each round. (`9874b1b`)

<a id="w-045"></a>
#### W-045 Cast doesn't offer Force-Empowered Casting options (Quickened, Twinned) or count their points

**fixed** · high · missing · reported by Mira ([Mira-B6](panel/2026-10-17/mira-b.md))

> When I cast a power, I want to add one of my Force-Empowered Casting options with its cost, so that the force points spent are right without extra '−' clicks.

- **What they saw:** The Heroism and Heal level selects only offer '1st level · 2 points | 2nd level · 3 points'. The Force Casting section never mentions Twinned or Quickened (checked in its text: twinned:false, quickened:false). For Quickened Heroism and Quickened Heal, Cast spent 2 points each and Mira pressed Force points '−' twice more each time (14 → 12 → 10, 8 → 6). Those '−' presses also wiped her HP Undo (W-058).
- **To reproduce:** Learn Quickened Power in Classes & Progression, then Cast any power that takes an action.
- **Expected:** A Force-Empowered Casting choice on Cast, listing only the options I've learned, one per power. Its cost is added (Quickened +2, Twinned +the power's level or +1 for an at-will), and the toast names it ('Cast Heroism, Quickened: 4 force points').
- **Workaround used:** Spent the extra points with the tracker's '−'.
- **Checked against the code:** missing, effort M, `viewer.js:castControls, castPower`. Cast offers only the level and its cost (pwCost). Force-Empowered Casting picks (k.options) are never consulted when casting, so the extra points are spent by hand. Those '−' presses also clear Undo (W-058).
- **Resolution:** The Force-Empowered Casting options you know are a select next to Cast, with their cost (Quickened +2, Twinned +the power's level). The cast spends the points on top and says so; an at-will or once-per-rest cast pays only the option. (`9874b1b`)

<a id="w-046"></a>
#### W-046 Saber Ward and Saber Reflect have no Cast / Use

**fixed** · medium · missing · reported by Priya ([Priya-A11](panel/2026-10-17/priya-a.md))

> When I use an at-will defensive power, I want a Cast or Use button, so that its resistance or damage reduction is tracked like other powers.

- **What they saw:** Guidance, Heal and Heroism have Cast. Saber Ward ('Until the end of your next turn, you have resistance against kinetic, energy, and ion damage dealt by weapons') and Saber Reflect (a reaction with a '1d6' reduction and 'Attack +5') have none.
- **To reproduce:** Force section > At-will powers.
- **Expected:** Saber Ward > Cast puts the resistance under Defenses until the end of my next turn. Saber Reflect > Use rolls 1d6 and offers the +5 reflect attack.
- **Workaround used:** Tracked it in her head.
- **Checked against the code:** missing, effort M, `viewer.js:castControls (`if (!x.level) return p.concentration ? … : ''`)`. At-will powers get a Cast button only if they need concentration (Guidance). Saber Ward and Saber Reflect are at-will without concentration, so castControls returns nothing. A Use that starts a timed resistance effect (defenses) and rolls Saber Reflect's 1d6 is needed. Open decisions also list 'Soresu's saber ward' as staying text.
- **Resolution:** At-will powers that last a while or roll something have Cast: Saber Ward applies its resistance for its round, Saber Reflect offers its 1d6 reduction roll. (`9874b1b`)

<a id="w-047"></a>
#### W-047 A feat's power (Techie's Repair Droid) shows as two cards with empty pickers

**fixed** · low · confusing · reported by Jun ([Jun-A35](panel/2026-10-17/jun-a.md), [Jun-A36](panel/2026-10-17/jun-a.md))

> When a feat gives me a fixed power that I can also cast once for free, I want one card with 'Cast (2 points)' and 'Free cast 1/1' and no empty picker under it, so that I don't think I have another power to choose and the phone list stays short.

- **What they saw:** Feats → 'Choices from your feats' shows 'Power given 1/1 · Repair Droid from the feature · [Choose a tech power…]' and 'Power given, once per long rest (once per long rest) 1/1 · Repair Droid · [Choose a tech power…]' ('once per long rest' twice). Tech casting lists two cards: 'Repair Droid · Feat: Techie · 1st level · 2 points [Cast]' and 'Repair Droid · Once per long rest · cast only · [Cast at 1st level (available)]'.
- **To reproduce:** Load a Techie character and open Feats and Tech casting.
- **Expected:** No picker when the count is full. One merged card.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `choices.js:choiceSlots (given slots), viewer.js:renderSlot, knownPowers`. Techie's text produces two given slots: 'Power given' and 'Power given, once per long rest'. renderSlot adds ' (once per long rest)' to a title that already says it, and it shows the select because `full` counts only non-auto picks, so given (auto) picks never fill a slot. knownPowers adds one card per mode (points and once), giving two cards. Fix: count auto picks toward full, and merge the cards by power name.
- **Resolution:** A power the feature gives leaves no picker and the title says 'once per long rest' once; Force/Tech Casting shows one card per power with each way to cast it. (`3103be9`)

<a id="w-048"></a>
#### W-048 Known powers listed in the order they were learned

**fixed** · low · improvement · reported by Priya ([Priya-B26](panel/2026-10-17/priya-b.md))

> When I read my known powers in the Classes card, I want them sorted by level and name, so that I can check them against the table quickly.

- **What they saw:** The list reads Heal, Heroism, Saber Reflect, Saber Ward, Guidance, Force Leap, Force Jump, Saber Throw, Sanctuary, Burst of Speed (the order she learned them).
- **To reproduce:** Learn several powers over two levels and open the Classes card.
- **Expected:** At-will powers first, then 1st level, alphabetical within each.
- **Workaround used:** None.
- **Checked against the code:** partial, effort S, `viewer.js:renderPowerBlocks`. The class-card list renders `chosen` in stored (learned) order. The Force/Tech Casting section already sorts by level and name (renderCasting), so applying the same sort to the class card is a one-liner.
- **Resolution:** The class card lists known powers at-will first, then by level, alphabetical within each. (`5a2f9f6`)

<a id="combat-tracker"></a>
### Combat and the play tracker

<a id="w-049"></a>
#### W-049 Damage has no type, so resistances and damage reductions never apply

**fixed** · blocker · bug · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A27](panel/2026-10-17/mira-a.md), [Tomas-B23](panel/2026-10-17/tomas-b.md), [Jun-A33](panel/2026-10-17/jun-a.md), [Priya-A7](panel/2026-10-17/priya-a.md), [Sam-A36](panel/2026-10-17/sam-a.md), [Sam-B8](panel/2026-10-17/sam-b.md))

> When I take typed damage (kinetic, energy, poison…, sometimes split, like 8 energy + 5 poison), I want to enter the type, and whether it came from a weapon, for each part, so that active resistances, immunities and one-time reductions apply automatically and the toast explains it ('8 energy → 4 (Rage), 5 poison → 2 (Dewback's)').

- **What they saw:** The play tracker has only Amount + Damage / Heal / Temp HP.
- Sam, raging (Defenses: 'Resistance to kinetic and energy damage'): 6 damage → HP 8/14 ('Undo: Took 6 damage'); it should have been 3. In part B, with Rage plus Dewback's (poison, acid, fire), he halved 8 energy → 4, 5 poison → 2 and the crit 18 → 9 by hand.
- Priya, with Soresu Form active ('…that damage is reduced by half'): 6 damage took HP 12 → 6. She pressed Undo and typed 3. Soresu stayed 'Active' after its one-time benefit was used. In part B, in The Way of the Mynock, she halved 8 → 4 and 18 → 9 by hand (W-070).
- Mira's Kel Dor necrotic resistance can never apply (it isn't shown either, W-141).
- Tomas and Jun entered their 13- and 6-point hits untyped.
Priya and Sam rated it high, the others medium or low.
- **To reproduce:** Start Rage (or adopt Soresu Form), type 6, press Damage.
- **Expected:** An optional damage type for each entry, and several entries per hit. Resistance halves, immunity zeroes, vulnerability doubles, and one-time reductions are used up. A note in the toast says what was applied.
- **Workaround used:** Undo and retype, or do the maths before typing.
- **Checked against the code:** missing, effort L, `viewer.js:applyTrackerAction('damage'), renderTracker, defensesOf`. The tracker takes a bare amount. defensesOf knows resistances (Rage's kinetic/energy, Dewback's, forms), but nothing applies them, and one-time reductions (Soresu) aren't consumed. It needs a typed, multi-part damage entry, resolution against active defenses, and a toast explaining it. W-072 must be fixed so Dewback's types are known.
- **Resolution:** The tracker's damage has a type; resistance, immunity and vulnerability apply when the character's defenses name it, conditional ones are mentioned (decision 43). (`3d97d86`)

<a id="w-050"></a>
#### W-050 No concentration save prompt when taking damage while concentrating (War Caster's advantage unknown)

**fixed** · blocker · missing · reported by Mira, Jun, Priya ([Mira-A26](panel/2026-10-17/mira-a.md), [Jun-A21](panel/2026-10-17/jun-a.md), [Priya-A8](panel/2026-10-17/priya-a.md), [Mira-B11](panel/2026-10-17/mira-b.md))

> When I take damage while concentrating, I want the sheet to offer the Constitution save at DC max(10, half the damage), with advantage pre-selected if I have War Caster, and to end the power on a failure, so that I never forget concentration.

- **What they saw:** Mira: with Heroism active, 6 damage took HP 7 → 1 with no prompt; she rolled the save herself (20 + 1 = 21). Jun: with Target Lock active, 6 damage → 4/10, no prompt. He scrolled to Abilities, rolled 7 vs DC 10 (failed), then went chip → Effects → End. Priya: 6 and 4 damage, no prompt. She rolled 21 and then 6 (failed) and ended Heroism by hand; the roller doesn't know a DC, so it can't say pass or fail.

Part B (Mira): still no prompt after 13 or 18 damage. With War Caster ('advantage on Constitution saving throws that you make to maintain your concentration'), the CON save dock still pre-selects 'Normal'. No '(concentration)' alternative shows on the save, and Combat & Vitals has no Defenses entry for it.

The rule: 'Whenever you take damage while you are concentrating, you must make a Constitution saving throw… DC equals 10 or half the damage you take, whichever number is higher.'
- **To reproduce:** Cast a concentration power, then enter damage in the tracker.
- **Expected:** A dock or toast: 'Concentration save DC 10 (Con +1) [Roll]', with War Caster's advantage pre-selected. A failure ends the power ('Target Lock ended'); a success keeps it. The CON save row shows 'adv. to keep concentration (War Caster)'.
- **Workaround used:** Rolled the CON save from Abilities, compared it with the DC by hand, and ended the effect from Effects.
- **Checked against the code:** missing, effort M, `viewer.js:applyTrackerAction('damage'); docs/open-decisions.md #10`. This is the documented decision 10: 'Concentration… damage doesn't end it.' No save prompt or DC exists. War Caster's 'advantage on Constitution saving throws that you make to maintain your concentration' isn't captured either: clsFeatureEffects' advantage regexes exclude 'that…' clauses, so the roller preset (startRoll) stays Normal.
- **Resolution:** Damage while concentrating offers the Constitution save (DC 10 or half the damage) with War Caster's advantage; a failure offers to end the power (decision 44). (`3d97d86`)

<a id="w-051"></a>
#### W-051 Round / turn counter: durations in rounds, start-of-turn effects, once-per-turn resets

**fixed** · high · improvement · reported by Mira, Tomas, Sam ([Mira-A32](panel/2026-10-17/mira-a.md), [Tomas-A34](panel/2026-10-17/tomas-a.md), [Sam-A39](panel/2026-10-17/sam-a.md))

> When I fight, I want a round counter or a 'start of my turn' button that counts durations in rounds, applies start-of-turn effects (Heroism's temp HP), resets once-per-turn features (Weapon Expert, Sneak Attack) and ends marks and states that run out, so that '1 minute' means 10 rounds instead of a wall-clock time.

- **What they saw:** Effects show durations as clock times, which mean nothing in combat: 'lasts up to 1 minute, since Sat 12:34' (Mira), 'Rage · Melee STR damage +2 · started, lasts 1 minute, since Sat 15:23' (Sam). Heroism's per-turn temp HP is manual (Mira). Tomas tracked once-per-turn features (Weapon Expert) and his Sharpshooter mark in his head. Sam, a new player, didn't know when Rage ends, or that it ends early if he neither attacks nor takes damage.
- **To reproduce:** Cast Heroism or Start Rage and play several rounds.
- **Expected:** A round counter with 'Next round' / 'Start of my turn', durations like '10 rounds left', and reminders.
- **Workaround used:** Head and paper. Ended Rage by hand after the fight.
- **Checked against the code:** missing, effort L, `viewer.js:effectWhen (wall-clock 'since Sat 12:34')`. There's no notion of rounds or turns. Effects store startedAt and a duration text and end only with End. Decision 10 says forms must be ended by hand. A round counter would let durations, per-turn temp HP, once-per-turn reminders and form expiry work.
- **Resolution:** Combat → Start counts rounds; Next round ends the effects that have run out (turns, minutes); End combat (decision 45). Once-per-turn uses aren't tracked. (`3d97d86`)

<a id="w-052"></a>
#### W-052 Second Heart (Zabrak) has no counter and isn't offered at 0 HP

**fixed** · high · missing · reported by Tomas ([Tomas-A13](panel/2026-10-17/tomas-a.md))

> When I drop to 0 HP as a Zabrak, I want the sheet to offer 'Use Second Heart: drop to 1 HP instead (1/long rest)' and track the use, so that I don't need Notes or a fake heal.

- **What they saw:** 13 damage at 8 HP gave 'HP 0/14, 0 HP: roll death saves' and the status 'Down to 0 hit points: roll death saves (Death saves → Roll).' Second Heart isn't mentioned and has no tracker counter. Long rest says only 'Long rest: done.'
- **To reproduce:** Zabrak at 8/14 HP: Amount 13 > Damage.
- **Expected:** A 'Second Heart 1/1 (long rest)' counter, and a prompt on dropping to 0 that sets HP to 1 and spends the use.
- **Workaround used:** Heal 1, with the use noted in Notes.
- **Checked against the code:** missing, effort M, `viewer.js:featureUses (`if (f.source !== 'Species')`), applyTrackerAction('damage')`. Species traits are explicitly skipped when building use counters, so Second Heart ('You can't use this feature again until you finish a long rest') gets none. Dropping to 0 offers nothing. Adding species traits to featureUses is S; the 0 HP prompt adds the rest.
- **Resolution:** Species traits with uses get counters (Second Heart: 1, long rest), and at 0 HP 'Use Second Heart: 1 HP instead' is offered (decision 46). (`3d97d86`)

<a id="w-053"></a>
#### W-053 Second Wind: a Use button that rolls 1d10 + level and heals

**fixed** · high · missing · reported by Tomas ([Tomas-A14](panel/2026-10-17/tomas-a.md))

> When I use Second Wind, I want one click to spend the use, roll 1d10 + my fighter level and heal me, as the medpac does, so that the bonus action takes seconds.

- **What they saw:** The tracker row 'Second Wind 1/1 short rest' and the Class Features card have only −/+, with no roll and no heal. A typed '1d10+1' roll in the dock (7 + 1 = 8) has no Heal button, so he healed 8 by hand.
- **To reproduce:** At 1/14 HP, try to use Second Wind from the tracker or the card.
- **Expected:** Second Wind > roll 1d10+1 > 'Heal 8' > use spent.
- **Workaround used:** − on the card, '1d10+1' in the dice dock, then Amount 8 > Heal in the tracker.
- **Checked against the code:** missing, effort S, `viewer.js:counterRow; roller.js:buildRoll/applyButtons`. Second Wind has a counter (clsUsage) but no roll. roller.js supports a 'Heal N' apply for itemheal; a 'feature heal' spec (1d10 + fighter level) that spends the use and heals would follow the same pattern.
- **Resolution:** Healing features ('regain hit points equal to 1d10 + your fighter level') get 'roll 1d10 + 3, then Heal' on their counter (tracker and card); the roller's 'Heal N and spend Second Wind' heals and marks the use. (`3103be9`)

<a id="w-054"></a>
#### W-054 Start / End buttons for states (Rage, lightsaber forms) in the play tracker

**fixed** · medium · improvement · reported by Priya, Sam ([Priya-A15](panel/2026-10-17/priya-a.md), [Sam-A33](panel/2026-10-17/sam-a.md))

> When combat starts, I want Start/Adopt/End buttons for my states next to their counters in Combat & Vitals, so that I don't scroll to Class Features or Feats mid-fight.

- **What they saw:** Sam: the tracker's Rage row only has '●● 2/2 − +'; 'Start Rage' is in Class Features → Rage card, so he had to scroll. Priya: 'Adopt Soresu Form' is under Features > Lightsaber forms, below the long Forcecasting text, and took several scrolls on the tablet. The 🔍 filter ('Soresu') was the fast way.
- **To reproduce:** Combat & Vitals → look for Start Rage or Adopt next to the tracker.
- **Expected:** The available states (forms, Rage…) with Start/Adopt/End next to their counters in Combat & Vitals or Effects.
- **Workaround used:** Scrolled to the card, or used the 🔍 filter.
- **Checked against the code:** missing, effort S, `viewer.js:stateControls (only in featureCard), renderTracker`. Start, Adopt and End come from stateControls, which is rendered only inside feature cards. The tracker rows (counterRow) have no state buttons. stateControls can be reused next to the matching counter.
- **Resolution:** The play tracker has a 'Start or end' row with every state's Start/Adopt/End button (Rage, forms, Force Shield…). (`dad1b17`)

<a id="w-055"></a>
#### W-055 Status after Damage/Heal keeps old errors and death-save messages

**fixed** · medium · bug · reported by Mira, Tomas ([Mira-A31](panel/2026-10-17/mira-a.md), [Tomas-A15](panel/2026-10-17/tomas-a.md))

> When I apply damage or healing, I want the status to show that action's result ('Took 6 damage → 8/14', 'Healed 6: conscious, death saves reset'), so that an old error or death-save toast doesn't make me think it failed.

- **What they saw:** Tomas: the red 'Type the amount first, then press Damage.' stayed after the next, successful damage (HP 8/14). 'Type the amount first, then press Heal.' stayed after a successful heal ('Undo: Healed 5 (of 6; at maximum)'). 'Down to 0 hit points: roll death saves' stayed after he was back at 1 and then 9 HP. Mira: after Heal 6 from 0 HP (death saves 0✓ 1✗), HP was 6/7 and the circles were cleared, but the toast still read 'Death saves: 0 ✓, 1 ✗.'
- **To reproduce:** Press Damage with an empty Amount, then type 6 and press Damage. Or heal from 0 HP after a failed death save.
- **Expected:** Each Damage/Heal replaces the status with its own result.
- **Workaround used:** Read the HP card instead.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:trackerAction`. A successful damage or heal calls setStatus only in two cases: three failures, or dropping to 0. Otherwise the old status ('Type the amount first…', death-save text from roller.js:applyRoll) stays in the top bar, since setStatus only removes the 'fresh' class. Fix: always set a result status (or clear it).
- **Resolution:** Every Damage/Heal/Temp HP sets its own result ('Took 6 damage. HP 8/14.'), replacing an old error or death-save message. (`3103be9`)

<a id="w-056"></a>
#### W-056 Massive-damage death: clearer 'Dead' state and a 'GM says drop to 0' option

**fixed** · medium · improvement · reported by Mira ([Mira-A28](panel/2026-10-17/mira-a.md))

> When the sheet rules me dead from massive damage, I want the HP card to say 'Dead' and the toast to offer 'Just drop to 0 (GM ruling)', so that I don't clear three death-save circles by hand and lose Undo.

- **What they saw:** At HP 1 + 4 temp, a 13-damage crit gave the toast 'Three failed death saves (damage at least your hit point maximum kills outright).', three ✗ and the chip 'Death saves 0✓ 3✗'. The HP card still said '0 HP: roll death saves'. Clearing the three circles one by one removed the 'Undo: Took 13 damage' button.
- **To reproduce:** At 1 HP with a maximum of 7, enter 13 damage.
- **Expected:** 'Dead (massive damage)' on the HP card, and a 'GM ruling: drop to 0' option that keeps Undo.
- **Workaround used:** Clicked each red death-save circle to clear it.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:LIVE.hp, applyTrackerAction('ds'), trackerAction (undo)`. LIVE.hp prints '0 HP: roll death saves' whenever HP is 0, even with three failures. Each death-save dot click goes through applyTrackerAction('ds'), which returns null, and trackerAction then sets state.undo = null. So clearing the circles drops the 'Took 13 damage' undo. A 'GM ruling: drop to 0' action that keeps the undo is missing.
- **Resolution:** After three failures the HP card says 'Dead (three failed death saves)' with 'GM ruling: at 0 HP instead', which clears the failures and can be undone; counter changes no longer drop the damage's Undo (W-058). (`3103be9`)

<a id="w-057"></a>
#### W-057 Typing in the tracker's Amount box is lost while the dice dock is open

**fixed** · medium · bug · reported by Tomas ([Tomas-A16](panel/2026-10-17/tomas-a.md))

> When the dice dock is open and I type damage in the play tracker, I want the number to land in Amount, so that I don't get 'Type the amount first'.

- **What they saw:** With the dock open (after Lore and Animal Handling rolls), he clicked Amount and typed '6'. The box stayed empty, and Damage/Heal said 'Type the amount first, then press Damage/Heal.' This happened twice. With the dock closed, it worked.
- **To reproduce:** Open any roll in the dock, click the tracker's Amount box, type 6 and press Damage.
- **Expected:** The keystrokes go to the Amount box.
- **Workaround used:** Close the dock first.
- **Checked against the code:** bug-plausible, effort S, `viewer.css #dice (fixed, bottom-right, z-index 40); roller.js:renderDice`. Nothing in the code takes keystrokes from #trackAmount: roller.js keydown only handles Enter, Space and Escape. The likely cause is layout. The dock is fixed bottom-right, up to 400 px wide and nearly viewport-tall, z-index 40, so a click 'on' Amount can land on the dock (or its Modifier or free-roll input) when the tracker sits under it. To check: document.activeElement after clicking, and whether #trackAmount's rect intersects #dice.
- **Resolution:** Not reproducible now: Amount takes typing with the dock open, after a check or an attack. The likely trigger, a misclick through the dock's moving ✕, was fixed (the dock only grows while open). The dock also never takes the focus from a box being typed in outside it. (`74a4667`)

<a id="w-058"></a>
#### W-058 A counter change wipes the HP Undo

**fixed** · low · improvement · reported by Mira ([Mira-B22](panel/2026-10-17/mira-b.md))

> When I adjust a counter right after healing, I want Undo to still cover my last HP action (or the counter change too), so that a slip is fixable.

- **What they saw:** After Heal 11 the 'Undo' button was there. Pressing Force points '−' twice (for Quickened, W-045) made it disappear, and the FP change itself couldn't be undone.
- **To reproduce:** Heal any amount, then press Force points '−'.
- **Expected:** Undo keeps the last HP action, or also undoes counter changes.
- **Workaround used:** None needed this time.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:trackerAction (`state.undo = label ? {…} : null`)`. Counter ops (force, tech, sup, hd, feat, ds, exh, insp) return no label from applyTrackerAction, and trackerAction then sets state.undo = null. Any '−' wipes the HP undo, and the counter change itself can't be undone. Fix: keep the previous undo when the label is null, or label counter changes.
- **Resolution:** Undo is a stack (last ten actions per character), and counters, Inspiration, exhaustion and death-save dots are undoable steps with their own labels. (`3103be9`)

<a id="w-059"></a>
#### W-059 Undo offers an old action after a reload or unrelated changes

**not a bug** · low · confusing · reported by Priya ([Priya-A47](panel/2026-10-17/priya-a.md))

> When I see Undo, I want it to be clear what it undoes and when it happened, so that I don't undo something old after a reload.

- **What they saw:** 'Undo: Took 4 damage' was still offered after Load from SW5E, a credits change and adding items.
- **To reproduce:** Take damage, make other changes and Load from SW5E, then look at the tracker.
- **Expected:** Clear Undo after unrelated changes or a reload, or say when the action happened.
- **Workaround used:** Ignored it.
- **Checked against the code:** not-a-bug, effort S, `viewer.js:state.undo (in memory), trackerAction('undo')`. Undo restores only the play-state snapshot taken before that damage. Loads, credits and inventory changes don't touch play state (trackers are stored separately), so undoing it is still correct. state.undo lives in memory and is cleared by a page reload and by a sync. Optional polish (S): show when it happened.

<a id="w-060"></a>
#### W-060 Force point pips disappear at higher totals

**fixed** · low · improvement · reported by Mira ([Mira-B31](panel/2026-10-17/mira-b.md))

> When I glance at the tracker in a fight, I want force points shown as pips or a bar at any total, so that I see at a glance how much I've spent.

- **What they saw:** Force points showed 8 and 12 pips at levels 1–2. At 16/16 and 20/20 (levels 3–4) the row shows only '16 / 16', while hit dice still show pips.
- **To reproduce:** Look at the Force points row with 16 or more max FP.
- **Expected:** A compact bar or pips at any total.
- **Workaround used:** Read the number.
- **Checked against the code:** partial, effort S, `viewer.js:counterRow (`max <= 12` pips)`. Pips are drawn only for pools of 12 or fewer by design, so 16 or 20 FP show just numbers. A compact bar for larger pools is a small CSS and markup change.
- **Resolution:** Counters over 12 (16 or 20 force points, 13 tech points) show a bar of what's left. (`5a2f9f6`)

<a id="w-061"></a>
#### W-061 Inspiration and Exhaustion buttons have no explanation

**fixed** · low · confusing · reported by Sam ([Sam-A45](panel/2026-10-17/sam-a.md))

> When the GM gives me Inspiration or exhaustion, I want a one-line explanation on the button or counter, so that a new player knows what it does.

- **What they saw:** The '☆ Inspiration' / '★ Inspired' button has no title or tooltip, and the Exhaustion '− 0 +' counter has no level text. Sam had to ask the GM.
- **To reproduce:** Hover Inspiration or Exhaustion in the play tracker.
- **Expected:** 'Spend it for advantage on one attack, save or check', and each exhaustion level's effect (see W-063).
- **Workaround used:** Asked the GM.
- **Checked against the code:** missing, effort S, `viewer.js:renderTracker (trk-misc)`. The Inspiration button and the Exhaustion −/+ counter have no title or explanation. The exhaustion level table is in refs.conditions (SW5E data), so a tooltip per level is easy.
- **Resolution:** Inspiration's button says what it does and where to spend it; exhaustion has a tooltip with all six levels and a note with what the current level does. (`3103be9`)

<a id="effects-states"></a>
### Effects, states and conditions

<a id="w-062"></a>
#### W-062 Can't set conditions (Poisoned, Prone…) in the sheet

**fixed** · blocker · missing · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-B8](panel/2026-10-17/mira-b.md), [Tomas-B5](panel/2026-10-17/tomas-b.md), [Jun-A23](panel/2026-10-17/jun-a.md), [Jun-B17](panel/2026-10-17/jun-b.md), [Priya-B9](panel/2026-10-17/priya-b.md), [Sam-B7](panel/2026-10-17/sam-b.md))

> When the boss poisons me (or I'm prone, frightened, restrained…), I want to add the condition with a duration in the sheet, see it as a chip with its rule text in the summary and phone strip, have the roller apply it, and end it with End or when it runs out, so that I don't need sw5e.com or a second device mid-fight.

- **What they saw:** Conditions shows 'None active (from SW5E)' with no add control; renderCombat in viewer.js only reads conditions from sw5e.com. 'Add an effect someone gave you…' with 'Poisoned' gives 'No SW5E item with an effect matches.' Typing 'Poison' lists only the weapon-coating items (Poison, Poison (Average), (Deadly)…). Their text is 'A creature hit by the poisoned weapon must make a DC 14 Constitution saving throw…', not the condition. Tomas and Priya added the Poison item as a stand-in.

Jun, the phone-only player, had to go to the sw5e.com tab → CONDITIONS → Poisoned → CLOSE, then on the phone scroll to the top → More ▾ → Load from SW5E. After the fight he did the reverse: two devices and two loads for one fight.

The sheet already has SW5E's text ('A poisoned creature has disadvantage on attack rolls and ability checks.'), but the attack dock opened on 'Normal' for everyone (W-099). Unconscious at 0 HP is tracked in W-064.
- **To reproduce:** Combat & Vitals → Conditions / Effects → try to add Poisoned.
- **Expected:** A condition picker (Poisoned, Prone, Frightened, Restrained…) with a duration and End. Chips in the summary and phone strip (W-122). Disadvantage pre-selected in the dock, the way advantage is for Rage. Removable by features like Lend Aid.
- **Workaround used:** A stand-in Poison item effect, Jun's sw5e.com conditions + Load, and Disadvantage picked by hand.
- **Checked against the code:** missing, effort L, `viewer.js:renderCombat (conditions from c.conditions only), effectSuggestions`. Conditions are read only from SW5E's computed c.conditions ('None active (from SW5E)'). 'Add an effect' searches only catalog items with effects, so 'Poisoned' finds weapon poisons. The condition texts are in refs.conditions and the rules conditions module. It needs a picker with duration, chips in renderSideSummary and renderMiniVitals, roller presets (startRoll's `fits` handles only advantage today) and End.
- **Resolution:** Conditions are set in the play tracker (SW5E's own currentStats.conditions, which it lists and Sync sends), each with what it does; Unconscious at 0 HP (decision 42). (`3d97d86`)

<a id="w-063"></a>
#### W-063 Exhaustion levels have no explanation and no effect on rolls, speed or HP

**fixed** · blocker · rules · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-B15](panel/2026-10-17/mira-b.md), [Tomas-B16](panel/2026-10-17/tomas-b.md), [Jun-B23](panel/2026-10-17/jun-b.md), [Priya-B10](panel/2026-10-17/priya-b.md), [Sam-B12](panel/2026-10-17/sam-b.md))

> When I gain exhaustion, I want each level's effect shown next to the counter and in the strip, and applied (level 1 disadvantage on ability checks, slower speed at 2, disadvantage on attacks and saves at 3, HP max halved at 4…), so that I play it right.

- **What they saw:** Exhaustion '+' → 1 gives an orange 'Exhaustion 1' chip, but there's no chip in the tablet strip (Priya) and nothing at all in Jun's phone view. The only explanation anywhere is the Long rest tooltip '…exhaustion −1'. For all five, the next Perception or Athletics check opened on 'Normal'. At exhaustion 2, Speed stayed 40 ft (Sam).

The sheet has SW5E's table from sw5e.com: '|1|Disadvantage on ability checks| |2|Speed halved| |3|Disadvantage on attack rolls and saving throws| |4|Hit point maximum halved|…'. Sam quotes sw5e.com/rules/phb/conditions as '2 one slowed level … 5 four slowed levels, 6 death', so check which table applies. The code keeps exhaustion as a counter only (Priya). Priya rated it high, the others medium.
- **To reproduce:** Exhaustion + → open any skill roll.
- **Expected:** Each level's effect shown (chip hover, counter text) and applied: disadvantage pre-selected with a note, speed reduced, HP max halved.
- **Workaround used:** Picked Disadvantage by hand.
- **Checked against the code:** missing, effort M, `viewer.js:applyTrackerAction('exh'), renderMiniVitals, roller.js:startRoll`. Exhaustion is only a counter (0–6, −1 on a long rest). Nothing applies it to rolls, speed or HP. renderMiniVitals (the phone strip) doesn't show it; only the desktop sidebar chip does. SW5E's own data (rules conditions 'Exhaustion') holds the classic table (1 disadvantage on checks, 2 speed halved, 3 disadvantage on attacks/saves, 4 HP max halved, 5 speed 0, 6 death), not the 'slowed' wording Sam quoted. Confirm which table the owner wants.
- **Resolution:** Exhaustion: each level explained, disadvantage applied by the roller, speed shown halved (2) or 0 (5). The halved HP maximum (4) is described, not applied. (`3103be9`)

<a id="w-064"></a>
#### W-064 Dropping to 0 HP doesn't end concentration or set Unconscious

**fixed** · high · bug · reported by Mira, Jun ([Mira-A29](panel/2026-10-17/mira-a.md), [Mira-A30](panel/2026-10-17/mira-a.md), [Jun-A22](panel/2026-10-17/jun-a.md))

> When I drop to 0 HP, I want my concentration power to end and the Unconscious (and Prone) condition shown until I'm healed, so that the sheet and the table agree on my state.

- **What they saw:** Mira: at 0/7 HP, Effects still listed 'Heroism (concentration)', the summary chip stayed, and Conditions said 'None active (from SW5E)'. Jun: with Target Lock active, 13 damage → 0/10 and 'Down to 0 hit points: roll death saves'. The '● Target Lock' chip and Effects entry stayed through the death save and both heals.
- **To reproduce:** Cast a concentration power, then take damage down to 0 HP.
- **Expected:** At 0 HP, concentration ends with a toast ('Target Lock ended: you're unconscious'), and Unconscious (and Prone) is set until healed.
- **Workaround used:** Effects > End by hand.
- **Checked against the code:** missing, effort S, `viewer.js:applyTrackerAction('damage'); docs/open-decisions.md #10`. Damage changes only HP and death saves. Concentration effects (group 'concentration') are never ended, per decision 10. Ending concentration at 0 HP is S. Showing Unconscious and Prone depends on conditions (W-062).
- **Resolution:** Dropping to 0 HP ends concentration and Rage (undoable) and says so. (`3103be9`)

<a id="w-065"></a>
#### W-065 Frenzy (Frenzied Approach) is text only: no option on Start Rage, no free-use or exhaustion tracking

**fixed** · high · missing · reported by Sam ([Sam-B6](panel/2026-10-17/sam-b.md))

> When I rage as a Frenzied Berserker, I want 'Start Rage · with Frenzy' that tracks that the first frenzy per long rest is free and later ones cost 1 exhaustion when the rage ends, so that I don't forget the cost or the bonus-action attack.

- **What they saw:** The Frenzy card has the rule text and an empty Notes box only. The Rage card has a single 'Start Rage (lasts 1 minute)'. There's no counter, no prompt, and no exhaustion when the rage ends.
- **To reproduce:** Pick the Frenzied Approach, then Start Rage.
- **Expected:** A Frenzy choice on Start Rage. A 'free frenzy used' marker that a long rest resets. +1 exhaustion when a later frenzied rage ends. A reminder of the bonus-action attack each turn. (The long-rest exhaustion −2 is W-118.)
- **Workaround used:** Tracked it in his head.
- **Checked against the code:** missing, effort M, `viewer.js:startFeatureState; applyTrackerAction('long')`. Frenzy has no state option, free-use marker or exhaustion on rage end. Its long-rest rule ('reduce your exhaustion level by 2') isn't applied either: applyTrackerAction('long') always does −1.
- **Resolution:** With Frenzied Approach, Rage has 'Rage with Frenzy' next to Start: free the first time after a long rest, then '+1 exhaustion', added when the rage ends. A long rest resets the count. (`9874b1b`)

<a id="w-066"></a>
#### W-066 A permanent tweak is labelled '(temporary)' in the ability breakdown

**fixed** · medium · confusing · reported by Mira, Tomas, Jun, Priya ([Mira-B26](panel/2026-10-17/mira-b.md), [Tomas-B18](panel/2026-10-17/tomas-b.md), [Jun-A34](panel/2026-10-17/jun-a.md), [Priya-A39](panel/2026-10-17/priya-a.md))

> When I read where a number comes from, I want my permanent tweaks labelled as tweaks, not '(temporary)', so that I trust they'll stay.

- **What they saw:** Each player's feat tweak is labelled '(temporary)':
- WIS: 'base 15 · +2 from species/ASIs/feats/tweaks · +1 from Empathic feat: +1 Wisdom, not applied by SW5E (temporary)'. Mira's tweak was even synced to sw5e.com.
- DEX: '… +1 from Weapon Expert feat: +1 Dexterity (builder has no choice for it) (temporary)' (Tomas).
- INT: '… +1 from Techie feat: Int +1 (SW5E doesn't apply it) (temporary)' (Jun).
- WIS: '… +1 from Formfighting Dabbler (Jedi background feat): +1 to an ability of my choice (temporary)' (Priya).
- **To reproduce:** Add an ability-score bonus tweak with a reason, then read that ability's breakdown.
- **Expected:** '(tweak)' or no label. '(temporary)' only for real temporary effects.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderAbilities (`x.effect.kind === 'item' ? '' : ' (temporary)'`)`. Every non-item effect, tweaks and class features included, is labelled '(temporary)'. Fix: label by kind (tweak → '(tweak)', feature → its source, temporary → '(temporary)').
- **Resolution:** The ability breakdown labels by kind: '(tweak)', '(class feature)', '(temporary)'. (`3103be9`)

<a id="w-067"></a>
#### W-067 Fighting-style marks (Sharpshooter, Defense Style) have no state or effect

**fixed** · medium · missing · reported by Tomas, Priya ([Tomas-A32](panel/2026-10-17/tomas-a.md), [Priya-B14](panel/2026-10-17/priya-b.md))

> When I mark a target with my fighting style, I want a 'Mark target' state with its reminder and effect (Sharpshooter: opportunity attack if it moves; Defense: its damage to me reduced by half my Str/Con mod, minimum 1), so that the style matters at the table and I remember it on the enemy's turn.

- **What they saw:** Sharpshooter Style (Tomas): the style text is shown, but there's no Start or state, nothing on the rifle and nothing under Effects. Defense Style (Priya): '…mark a target within 30 feet… damage dealt to you by the target is reduced by… half your Strength or Constitution modifier (minimum of one)' is shown only as text. Only the 'Advantage on Strength checks and Strength saving throws to avoid being moved' part reached Defenses. Tomas rated it low, Priya medium.
- **To reproduce:** Pick Sharpshooter Style or Defense Style and look for a Mark/Start button.
- **Expected:** A Start/End state (ending at the start of my next turn where the rule says so), with the reminder or reduction shown, and the reduction applied by a typed damage box (W-049).
- **Workaround used:** Said it at the table.
- **Checked against the code:** missing, effort M, `classes.js:clsFeatureState; viewer.js:stateControls`. clsFeatureState recognises states that 'gain the following benefits', last a while, or run until next turn with benefits. Defense Style's 'mark a target… until the end of your next turn' matches none, and Sharpshooter's mark likewise, so there's no Start. Only Defense's 'advantage… to avoid being moved' reaches Defenses.
- **Resolution:** Fighting styles that mark a target (Sharpshooter, Defense Style) have 'Mark a target' in the tracker and on their card: an effect with the style's text that lasts until the start or end of your next turn. (`9874b1b`)

<a id="w-068"></a>
#### W-068 Add a custom temporary effect for things the sheet doesn't know

**fixed** · medium · missing · reported by Mira ([Mira-B17](panel/2026-10-17/mira-b.md))

> When a power or the GM gives me a bonus the sheet can't apply, I want to add a named temporary effect ('AC set to 15', 8 h) with End, so that I don't need a permanent tweak that would even sync.

- **What they saw:** 'Add an effect someone gave you, e.g. a stim…' with 'Battle' only offered 'Battle Adrenal Mk I / Mk II' (consumables). There's no free-form effect, so she used an 'AC set to 15' tweak for Battle Precognition and had to delete it after the long rest.
- **To reproduce:** Type any name that isn't an item into 'Add an effect someone gave you…'.
- **Expected:** A 'custom effect' option: name, stat + bonus or set value, duration. It ends with End or on a rest.
- **Workaround used:** A tweak with a reason, removed by hand later.
- **Checked against the code:** missing, effort M, `viewer.js:effectSuggestions/receiveEffect`. 'Add an effect' only lists catalog items that have a parsed effect. A custom effect (name, stat from tweakTargets, bonus or set value, duration) could reuse makeEffect and fxResolve; tempEffects already applies mods.
- **Resolution:** 'Your own effect' (Effects): a name, how long it lasts, and one bonus from the tweak list (or a reminder); it ends like the others. (`3d97d86`)

<a id="w-069"></a>
#### W-069 Force Affinity (Ashla) not applied when casting light side powers

**fixed** · medium · missing · reported by Mira ([Mira-B10](panel/2026-10-17/mira-b.md))

> When I cast a light side power with Ashla, I want the sheet to ask 'me or the target?' and add the power's level to max and current HP for 1 minute, so that I get the benefit without fiddling.

- **What they saw:** She typed 'Ashla' in Force Affinity's 'Your choices', and the chip 'Choose one of Ashla, Bendu, Bogan' disappeared. Casting Heroism and Heal (both light side) left HP at 17/17 and 15/17 with no effect listed. The rule: 'When you successfully cast a light side power, either your or the target's (your choice) hit point maximum and current hit points increase by an amount equal to the power's level. This effect lasts for 1 minute.'
- **To reproduce:** Choose Ashla, then cast Heroism at 1st level.
- **Expected:** A 1-minute effect '+1 max/current HP (Ashla)' on me, or a note for the target.
- **Workaround used:** Skipped it and played with 1 HP less.
- **Checked against the code:** missing, effort M, `viewer.js:castPower`. There's no Force Affinity handling: no code references Ashla, Bendu or Bogan. Casting doesn't look at the alignment of light-side powers or add a +level HP effect.
- **Resolution:** After a light side power cast at 1st level or higher, the message offers 'Ashla: +N HP max on me (1 minute)'. (`9874b1b`)

<a id="w-070"></a>
#### W-070 The Way of the Mynock doesn't apply Saber Ward or count its reactions

**fixed** · medium · missing · reported by Priya ([Priya-B13](panel/2026-10-17/priya-b.md))

> When I start The Way of the Mynock, I want Saber Ward's resistance to weapon kinetic/energy/ion damage listed under Defenses and a 'Saber Reflect reactions' counter, so that the stance actually changes my numbers.

- **What they saw:** Start → 'The Way of the Mynock started, lasts 1 minute' and a strip chip, but Defenses had no resistance and there was no reactions counter. Damage still has no type (W-049), so she entered 8 energy as 4 and 18 kinetic as 9 by hand. This goes beyond part A's damage-type wish: now the sheet itself knows she's in a resistance stance.
- **To reproduce:** Soresu Form 3 → Features → Start The Way of the Mynock → look at Defenses, then take damage.
- **Expected:** The resistance listed while the stance lasts (re-cast each turn as a bonus action), a reactions counter equal to the proficiency bonus, and the damage box applying the resistance by damage type.
- **Workaround used:** Halved the damage in her head before typing it.
- **Checked against the code:** missing, effort M, `viewer.js:startFeatureState; docs/open-decisions.md 'Not done yet'`. The documented gap: 'Granted powers cast "as part of" something (… Soresu's saber ward) stay text.' Starting the stance gives its benefits list but not Saber Ward's resistance, and there's no reactions counter. Applying it to damage also needs W-049.
- **Resolution:** Starting The Way of the Mynock applies Saber Ward's resistance for the minute and adds a Saber Reflect reactions counter (proficiency bonus) under Effects; each 'Use one' rolls Saber Reflect's reduction. (`9874b1b`)

<a id="w-071"></a>
#### W-071 Reckless Attack has no toggle

**fixed** · medium · improvement · reported by Sam ([Sam-B11](panel/2026-10-17/sam-b.md))

> When I decide to attack recklessly, I want a 'Reckless this turn' switch that pre-selects advantage on Str melee attacks and shows 'attacks against you have advantage until your next turn', so that both halves of the trade-off are on screen.

- **What they saw:** The Reckless Attack card is text only. The attack dock offers Disadvantage/Normal/Advantage with no Reckless option.
- **To reproduce:** Berserker 2+ → Class Features → Reckless Attack.
- **Expected:** A per-turn toggle like Start Rage, combined with other sources in the roller (W-099).
- **Workaround used:** Picked Advantage by hand, or Normal when poisoned.
- **Checked against the code:** missing, effort M, `roller.js:startRoll (`fits` covers save/check/skill/init only)`. Reckless Attack's text isn't a recognised state (clsFeatureState), so there's no toggle. Even with one, roller presets only handle saves, checks, skills and initiative, never attacks, so the roller needs to learn attack advantage and the 'attacks against you' note.
- **Resolution:** 'Attack recklessly' in the tracker and on the card: until your next turn, the roller gives advantage on melee weapon attacks using Strength; Effects notes that attacks against you have advantage. (`9874b1b`)

<a id="w-072"></a>
#### W-072 Dewback's Instinct damage types not named under Resistances

**fixed** · medium · bug · reported by Sam ([Sam-B9](panel/2026-10-17/sam-b.md))

> When I rage with Dewback's Instinct, I want Resistances to name my chosen types, so that I know what I resist mid-fight.

- **What they saw:** The instinct's choices box says 'Poison + Acid + Fire'. While raging, Defenses & senses → RESISTANCES shows 'Resistance to kinetic and energy damage' and 'Resistance to the chosen damage'. The Rage effect says 'Dewback's Instinct: While raging, you have resistance to the chosen damage types.' The types are named nowhere.
- **To reproduce:** Add Dewback's Instinct, type three types in its choices box, Start Rage.
- **Expected:** 'Resistance to poison, acid and fire (Dewback's Instinct)', ideally chosen with a 3-of-13 damage-type picker (true damage excluded) instead of free text.
- **Workaround used:** Remembered the types.
- **Checked against the code:** bug-confirmed, effort S, `classes.js:clsFeatureEffects (resistance regexes), viewer.js:startFeatureState`. Dewback's text reads 'While raging, you have resistance to the chosen damage types.' The note-reading branch matches only 'resistance to that (type of) damage'. The generic branch then lazily captures 'the chosen damage', which produces 'Resistance to the chosen damage'; the pick's note ('Poison + Acid + Fire') is ignored. Fix: treat 'the chosen damage types' like 'that damage' (read the note), and add a 3-of-N type picker.
- **Resolution:** 'Resistance to the chosen damage types' is read from the pick's notes: 'Resistance to poison, acid, fire damage'. A damage-type picker would be part of W-031. (`3103be9`)

<a id="w-073"></a>
#### W-073 Soresu Form duration: the sheet says 'start of next turn', the text says 'end of next turn'

**fixed** · medium · rules · reported by Priya ([Priya-A13](panel/2026-10-17/priya-a.md))

> When I adopt a form, I want its duration to match its rules text, so that I know whether it still protects me during my next turn.

- **What they saw:** The badge reads 'Active · lasts until the start of your next turn', and Effects 'started, lasts until the start of your next turn'. The form's own text: 'The first time you take kinetic, energy, or ion damage from a weapon before the end of your next turn…'.
- **To reproduce:** Features > Lightsaber forms > Adopt Soresu Form.
- **Expected:** A duration consistent with SW5E's form rules, or an explanation.
- **Workaround used:** Ended and re-adopted it by hand each turn.
- **Checked against the code:** bug-confirmed, effort S, `choices.js:chFormState (fixed duration); docs/open-decisions.md #10`. chFormState hardcodes duration 'until the start of your next turn' for every form, as decision 10 records, and strips 'before the end of your next turn' from the text. Soresu's own text (SW5E data): 'The first time you take kinetic, energy, or ion damage from a weapon before the end of your next turn, that damage is reduced by half.' Fix: read the start or end phrase from each form's text.
- **Resolution:** A form lasts until the end of your next turn when its text says so (Soresu); decision 10 updated. (`3103be9`)

<a id="w-074"></a>
#### W-074 Maniacal Rage's Intimidation advantage not listed while raging

**fixed** · low · bug · reported by Sam ([Sam-B22](panel/2026-10-17/sam-b.md))

> When I rage as a Frenzied Berserker, I want 'Advantage on Intimidation (Maniacal Rage)' listed with the other advantages and pre-selected, so that I remember it.

- **What they saw:** While raging, Advantages listed Dex saves (Danger Sense), Strength checks and saving throws, cold and climbing, but not Maniacal Rage. The Rage effect text doesn't mention it either.
- **To reproduce:** Frenzied Approach → Start Rage → Defenses & senses.
- **Expected:** Listed, and advantage pre-selected on Intimidation rolls while raging.
- **Workaround used:** Remembered it.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:startFeatureState (sentence loop)`. The engine's feature text starts with the level line '_**Frenzied Approach:** 3rd level_' (no period; checked in dev/dumps/rules.json). startFeatureState collapses whitespace and splits on periods, so the first sentence becomes '_**Frenzied Approach:** 3rd level_ While raging, you have advantage on Charisma (Intimidation) checks.' The `^While raging` test then fails. clsTextFeatures strips that line, but engine features don't go through it. Fix: strip the level line before splitting. Any engine feature whose first sentence is 'While raging…' has the same bug.
- **Resolution:** The level line ('_**Frenzied Approach:** 3rd level_') is stripped before reading 'While raging…' sentences, so Maniacal Rage's advantage joins Rage. (`3103be9`)

<a id="w-075"></a>
#### W-075 Celerity Oscillator's speed boost isn't mentioned after a hit

**fixed** · low · improvement · reported by Jun ([Jun-B15](panel/2026-10-17/jun-b.md))

> When I deal damage with my modified weapon, I want a reminder 'speed +10 ft, no opportunity attacks from that target', so that I use the mod I chose.

- **What they saw:** He hit for 11 energy. Nothing showed on the damage roll, and Speed stayed 30 ft.
- **To reproduce:** Armstech 3 with Celerity Oscillator on the modified weapon: hit and roll damage.
- **Expected:** A note on the damage result, or a short 'until your next turn' effect.
- **Workaround used:** None.
- **Checked against the code:** missing, effort S, `viewer.js:featureEffectsUncached (mod: effects only for weapon bonuses)`. Modification sentences about the modified weapon other than +N attack, damage or crit range are dropped (featureEffectsUncached filters 'this weapon' sentences out). Celerity Oscillator's on-hit rider appears nowhere. It could be a note on the weapon's damage roll (roller.js buildRoll 'damage').
- **Resolution:** The damage roll of the modified weapon notes 'Celerity Oscillator: Once per turn, when you deal damage with your modified weapon, your walking speed increases by 10 feet…'. (`5a2f9f6`)

<a id="inventory-credits"></a>
### Inventory and credits

<a id="w-076"></a>
#### W-076 Custom items: add story items and gear that aren't in SW5E's list

**fixed** · blocker · missing · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A34](panel/2026-10-17/mira-a.md), [Mira-B32](panel/2026-10-17/mira-b.md), [Tomas-A20](panel/2026-10-17/tomas-a.md), [Jun-A14](panel/2026-10-17/jun-a.md), [Jun-B31](panel/2026-10-17/jun-b.md), [Priya-A6](panel/2026-10-17/priya-a.md), [Sam-A40](panel/2026-10-17/sam-a.md))

> When the GM hands me a story item ('coded datapad with the smuggler's coordinates') or I own gear that isn't in SW5E's list (Copy of the Jedi Code, an insignia, a research book), I want to add a custom item with name, qty, weight, cost and description, and to rename or annotate any item, so that my whole inventory lives in the sheet.

- **What they saw:** Typing the name gives 'No SW5E item matches.' Add then shows the red 'Choose an item from the SW5E list (start typing its name).', partly hidden (W-081). The categories are All items, Weapons, Armor, Adventuring gear and Enhanced items, with no custom option, and inventory rows can't be renamed or annotated.

sw5e.com's builder Equipment tab has 'CUSTOM ITEMS +' (Name, Type, Cost, Weight, Quantity, Description), and the viewer already knows a `customEquipment` field. Tomas and Priya added their items there (about 12 actions) and Load brought them in with a 'custom' tag, keeping all local changes (Priya B: 'inventory 11 rows + 2 custom'). Mira and Sam added SW5E's generic 'Datapad' for free and explained it in Notes; Jun kept the datapad, pack and research book in Notes. Sam rated it medium, the others high.
- **To reproduce:** Equipment & Inventory > type a name that isn't in SW5E's list > Add.
- **Expected:** 'Add … as a custom item' in the same row (name, qty, weight, cost, description, category), saved to customEquipment and synced. A personal name or note on any item.
- **Workaround used:** sw5e.com CUSTOM ITEMS, then Load from SW5E. Or a generic item plus an explanation in Notes.
- **Checked against the code:** missing, effort M, `viewer.js:addItemFromCatalog, renderEquipment (custom rows), bridge.js fieldType 'items'`. addItemFromCatalog fails unless the name is in SW5E's catalog. Custom items are already read, shown with a 'custom' chip, editable (qty, equip, remove) and syncable (ITEM_FIELDS includes customEquipment; the bridge accepts it), but nothing creates them. Adding 'Add … as a custom item' with name, qty, weight, cost, category and description is mostly a form. Renaming or annotating any item is extra.
- **Resolution:** Typing a name that isn't in SW5E's list offers 'Add “…” as a custom item' with weight, cost each and description (Pay works as for other items). ✎ on any row gives a custom item's name, weight, cost and description, and any item your own name for it and a note. (`091ba99`)

<a id="w-077"></a>
#### W-077 Enhanced items aren't tied to a base weapon or armor

**fixed** · blocker · bug · reported by Tomas, Jun, Priya, Sam ([Tomas-B4](panel/2026-10-17/tomas-b.md), [Jun-B26](panel/2026-10-17/jun-b.md), [Priya-B16](panel/2026-10-17/priya-b.md), [Sam-B15](panel/2026-10-17/sam-b.md))

> When I loot an enhanced weapon or armor (a named weapon, 'Weapon (Fine)', 'Armor (Fine)', 'any medium armor'), I want to pick or see the base item it is (Nightstinger, Vibroaxe, Combat suit, Mesh armor). It should then show as one item with the base stats, weight and properties plus its bonus, in Weapons & Attacks or as my worn armor, so that I can attack with it, compare loot and not carry phantom duplicates.

- **What they saw:** Tomas (high), Xerrol Nightstinger Rifle (Weapon · Premium): the preview shows only '+1 bonus to damage rolls… advantage on the Dexterity (Stealth) check… silent property', with no damage die, range, properties or weight. Added as Equipped, the inventory row reads 'Enhanced: Weapon (1)', weight '—', cost '—', and it doesn't appear in Weapons & Attacks. Effects shows 'Xerrol Nightstinger Rifle — Damage +1: no effect on [choose a weapon…] while equipped'. He picked Blaster rifle there and got 1d8+4: the nightstinger fired with the blaster rifle's stats.

Sam: Equip on the 'Weapon (Fine)' row left the Vibroaxe at +7 / 1d12+5. The weapon choice is hidden in Combat & Vitals → Effects → From equipment ('Attack +1: no effect · Damage +1: no effect · on [choose a weapon…]'); after picking it, +8 / 1d12+6.

Jun: 'Armor (Fine)' ('You have a +1 bonus to AC while wearing this armor.') raised AC 13 → 14, but it's a separate '— —' row next to the Combat suit.

Priya: Jensaarai Armor (Prototype, attuned) sits apart from her mesh armor, AC 15 → 16 with the mesh still equipped. Its Effects text also shows the Regalia set bonus ('+2 … instead of +1') without the Cloak or Headgear, and you could wear two body armors.
- **To reproduce:** Add Xerrol Nightstinger Rifle, Weapon (Fine), Armor (Fine) or Jensaarai Armor as Equipped, then look at Weapons & Attacks, AC and Effects.
- **Expected:** Ask for the base item when adding or equipping. A named enhanced weapon gets its own attack row with its base weapon's stats plus its bonus. 'Vibroaxe (Fine)' shows in both the inventory and the weapons table. Enhanced armor replaces the worn base armor (weight, AC, properties). Only one body armor at a time. Set bonuses only with the full set. Base stats, weight and rarity shown in the add preview.
- **Workaround used:** Picked the weapon in the Effects select. Left both armors equipped.
- **Checked against the code:** partial, effort L, `viewer.js:itemEffects, renderEffects/effectRow (weapon select), renderAttacks, ownWeapons`. An enhanced weapon's bonus can be applied to a standard weapon chosen in Effects (effectRow's 'on [choose a weapon…]'), but equipping doesn't auto-pick one (itemEffects uses itemTargets only, so 'no effect' until chosen). The enhanced item gets no attack row of its own (renderAttacks lists only SW5E's c.weapons). Enhanced armor adds its AC on top of the worn base armor as a separate row. Nothing limits body armor to one. Set bonuses are parsed as text without checking the set. The add preview (renderAddDetail) has no base stats for enhanced items.
- **Resolution:** An enhanced weapon, armor or shield picks its base item when added or on its row: one you carry, or one from SW5E's list matching its subtype ('any blaster', 'any medium', 'nightstinger rifle'). It's one row with the base's damage or AC, properties and weight. Weapons & Attacks lists the weapon under the enhanced name with its bonus, and equip and remove go together. (`091ba99`)

<a id="w-078"></a>
#### W-078 Shop: discount %, 'pay what you have', and recording a debt

**fixed** · high · missing · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A18](panel/2026-10-17/mira-a.md), [Mira-A19](panel/2026-10-17/mira-a.md), [Tomas-A22](panel/2026-10-17/tomas-a.md), [Jun-A29](panel/2026-10-17/jun-a.md), [Priya-A28](panel/2026-10-17/priya-a.md), [Sam-A31](panel/2026-10-17/sam-a.md))

> When the shopkeeper gives a discount or lets me owe her, I want a discount % next to Pay, 'Pay what you have' / 'Add unpaid' on the not-enough-credits error, and a debt line (or negative credits with a warning), so that the shop scene works without maths and Notes.

- **What they saw:** The script: 2 Medpacs (2 × 300) and one more item, with 20% off if you can't afford it. Everyone was short: 'Not enough credits: 600 cr needed, 150 cr available.' (Mira), '…100 cr available' (Tomas), '480 cr needed, 100 cr available' (Jun), '480 … 150' (Priya), '480 … 50' (Sam). The Pay field is a single total. Players worked out the 20% themselves and still couldn't pay; typing their whole balance into Pay worked ('any price'). Debts went to Notes: 'Owe Kessa 490 cr' (Mira), 460 (Tomas), 420 (Jun), 370 (Priya), 430 (Sam). Item rows show the list price (Medpac 300 cr), not what was paid (Mira, Priya).
- **To reproduce:** With 150 cr: Medpac, Qty 2, Pay ticked, Add.
- **Expected:** A discount % that updates Pay. Buttons on the error: 'Pay 150 (all you have)' and 'Add unpaid'. A debts line in Credits, or negative credits with a warning. Optionally keep what was actually paid.
- **Workaround used:** Typed the balance into Pay, added the rest unpaid, and wrote the debt in Notes.
- **Checked against the code:** partial, effort M, `viewer.js:addItemFromCatalog, adjustCredits, renderAddDetail`. Any price can be typed into Pay. There's no discount %, and on 'Not enough credits' there are no 'Pay what you have' or 'Add unpaid' buttons; the add simply fails. adjustCredits refuses negative credits. There's no debt field (a new local field, or Notes). Rows show the catalog cost, not the price paid.
- **Resolution:** Pay has 'less N %' and 'from' (seller). When the credits fall short, the error offers 'Pay N cr, owe M' and 'Owe all'; Debts under Credits list each debt with Pay back and Settled. Rows show 'paid N' next to the list price. (`091ba99`)

<a id="w-079"></a>
#### W-079 Equipment packs (Explorer's, Diplomat's, Priest's) can't be added or unpacked

**fixed** · high · missing · reported by Mira, Jun, Priya, Sam ([Mira-A13](panel/2026-10-17/mira-a.md), [Jun-A15](panel/2026-10-17/jun-a.md), [Priya-A22](panel/2026-10-17/priya-a.md), [Sam-A25](panel/2026-10-17/sam-a.md))

> When my class gives me an equipment pack, I want to add it in one step and have it unpack into its contents, so that I don't guess and add each piece separately.

- **What they saw:** 'diplomat', 'explorer' and 'Explorer's pack' all give 'No SW5E item matches.' 'pack' finds only Backpack, Jetpack and the cybernetic '…Package' items. The builder says 'No data available'. Players added backpack, bedroll, field rations ×10, glowrod and clothes one at a time, guessing the contents (Sam), or wrote the pack in Notes (Mira, Jun).
- **To reproduce:** Equipment & Inventory > Add an item > 'explorer' or 'diplomat'.
- **Expected:** Packs from SW5E's equipment chapter, added as a pack or unpacked into their contents. Starting equipment (W-003) would use them too.
- **Workaround used:** Added the contents one by one, or wrote the pack in Notes.
- **Checked against the code:** missing, effort M, `viewer.js:addSuggestions (catalog only)`. SW5E's catalog (equipment plus enhancedItems from the bridge) has no packs, which matches 'No data available' on the site, so there's nothing to add or unpack. It needs a hand-written pack contents table from the equipment chapter, shared with W-003.
- **Resolution:** Equipment packs (from SW5E's Equipment chapter) appear in the search with their price. Adding one adds its contents (merged into stacks, custom items for anything not in the list). Starting equipment unpacks them, and a pack kept as a custom item has Unpack. (`091ba99`)

<a id="w-080"></a>
#### W-080 SW5E rarity names unexplained; enhanced item search hard to filter

**fixed** · high · confusing · reported by Mira, Jun, Priya, Sam ([Mira-B27](panel/2026-10-17/mira-b.md), [Jun-B25](panel/2026-10-17/jun-b.md), [Priya-B29](panel/2026-10-17/priya-b.md), [Sam-B14](panel/2026-10-17/sam-b.md))

> When the GM says 'uncommon or rarer', I want the item list to show 'Premium (uncommon)' and let me filter enhanced items by type and minimum rarity, so that I can find legal loot without guessing.

- **What they saw:** Suggestions show only SW5E's rarity words:
- Mira: 'Focus Generator (Fine) · Focus · Premium', '(Improved) · Prototype', '(Superior) · Advanced', 'Chassis (Legendary)'.
- Priya: 'Armor · Prototype', 'Adventuring Gear · Premium/Advanced'.
- Jun: Enhanced items + 'suit' mixes plain 'Combat suit · Armor' and 'Chemical suit · Life Support' (no rarity) with 'Collapsible Suit · Item Modification · Premium'.
- Sam: 'vibroaxe' finds only plain weapons, Enhanced + 'axe' only 'Shotgun Axe · Premium', 'vibroweapon' only chassis variants, and 'weapon' gives '(Champion) · Artifact … (Fine) · Premium …' plus '24 more; keep typing'.
Everyone guessed that Premium = uncommon. Sam rated it medium, the others low.
- **To reproduce:** Equipment → Enhanced items → search for an uncommon weapon or armor.
- **Expected:** Rarity on every enhanced row with its 5e word ('Premium (uncommon)', 'Prototype (rare)'), a tooltip or legend, and filters by item type and minimum rarity.
- **Workaround used:** Guessed.
- **Checked against the code:** partial, effort S, `viewer.js:itemKind, ADD_CATS/inAddCat`. Suggestions show titleCase(type) · titleCase(rarityText) ('Premium', 'Prototype'), with no 5e equivalent or legend. Categories exist (All, Weapons, Armor, Adventuring gear, Enhanced), but there are no type or minimum-rarity filters. Plain items show no rarity at all.
- **Resolution:** Rarities read 'Premium (uncommon)', 'Prototype (rare)'…; Enhanced items has a type filter and 'X or rarer'. (`091ba99`)

<a id="w-081"></a>
#### W-081 Add-item error message hidden under the suggestion popup

**fixed** · medium · bug · reported by Mira, Tomas, Priya, Sam ([Mira-A35](panel/2026-10-17/mira-a.md), [Tomas-A36](panel/2026-10-17/tomas-a.md), [Priya-A48](panel/2026-10-17/priya-a.md), [Sam-A41](panel/2026-10-17/sam-a.md))

> When pressing Add fails, I want to read the whole error, so that I know why nothing happened.

- **What they saw:** Only the beginning of the red message, 'Choose an item from the S…', is visible; the 'No SW5E item matches.' dropdown covers the rest. All four hit it while trying to add the datapad or the Jedi Code.
- **To reproduce:** Type an unknown item name and press Add.
- **Expected:** Close the dropdown or place the error where it can be read. Offer 'Add as custom item' (W-076).
- **Workaround used:** Escape closes the dropdown.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderAddItem/addItemFromCatalog; viewer.css .sugg`. .sugg is absolutely positioned below the name box (z-index 15), and #addErr sits right under the add row, so the open 'No SW5E item matches.' popup covers it. addItemFromCatalog's fail() doesn't close the suggestions (addDraft.closed). Fix: close the popup on failure, or place the error above, and offer 'Add as custom item' (W-076).
- **Resolution:** A failed Add closes the suggestions so the message is readable. (`3103be9`)

<a id="w-082"></a>
#### W-082 Item search: word order, ranking and prices

**fixed** · medium · improvement · reported by Tomas, Jun, Priya, Sam ([Tomas-A35](panel/2026-10-17/tomas-a.md), [Jun-A16](panel/2026-10-17/jun-a.md), [Priya-A27](panel/2026-10-17/priya-a.md), [Sam-A24](panel/2026-10-17/sam-a.md))

> When I search for an item, I want all my words matched in any order, plain items and word-start matches first, and prices in the suggestions, so that I find 'Grenade, fragmentation' or 'Field rations' quickly on any device and can compare costs.

- **What they saw:** 'fragmentation grenade' gives 'No SW5E item matches.', while 'grenade' lists 'Grenade launcher', 'Grenade, corrosive'… (Tomas). 'clothes' lists the clandestine variants before 'Clothes, common', and the builder's 'Wristpad' search lists 12+ variants first (Jun). 'ration' lists 'Blaster Integration', 'Disintegration Core (Mk II–VI)', 'Emergency rations'… before 'Field rations (one day's)' (Priya, Sam). Medpac suggestions show the category but no price until picked (Priya).
- **To reproduce:** Add an item from SW5E → type 'fragmentation grenade', 'clothes' or 'ration'.
- **Expected:** All words matched in any order. Exact, plain and word-start matches ranked first. A price on each suggestion.
- **Workaround used:** Typed SW5E's exact naming, or scrolled the list.
- **Checked against the code:** partial, effort S, `viewer.js:addSuggestions, renderAddSuggestions, renderAddDetail`. The search matches the whole typed text as one substring (`it.name.toLowerCase().includes(q)`), so 'fragmentation grenade' finds nothing and 'ration' also hits 'Integration'. The only ranking is 'name starts with the whole query', then alphabetical. That is why 'Clothes, clandestine…' comes before 'Clothes, common'. Nothing ranks word-start matches or plain items above enhanced ones. Each suggestion shows only itemKind (category and rarity); the price appears only in renderAddDetail after an item is picked. Fix: split the query into words and match them in any order; score exact > plain item > word-start > substring; add priceOf() to each row.
- **Resolution:** Search matches every word in any order ('fragmentation grenade' → 'Grenade, fragmentation'), ranks exact, starts-with and word-start matches and plain items first ('ration' → Field rations), and shows prices in the suggestions. (`091ba99`)

<a id="w-083"></a>
#### W-083 Some items weigh 0 lb (Tinker's implements, light physical shield)

**upstream** · medium · rules · reported by Jun, Priya, Sam ([Jun-A17](panel/2026-10-17/jun-a.md), [Priya-A32](panel/2026-10-17/priya-a.md), [Sam-A28](panel/2026-10-17/sam-a.md))

> When I add tools and shields, I want their real weight, so that carrying capacity is right.

- **What they saw:** 'Tinker's implements Tool · 500 cr · 0 lb' (Jun). 'Light physical shield · Armor · 50 cr · 0 lb' in the add row and the inventory (Sam), and 'Weight: 0' in the builder too (Priya). The players weren't sure what SW5E's data says.
- **To reproduce:** Add Tinker's implements or a Light physical shield.
- **Expected:** Weights from SW5E's equipment tables (check the data).
- **Workaround used:** None.
- **Checked against the code:** sw5e-site, effort S, `viewer.js:renderEquipment, totalWeight (shows SW5E's e.weight)`. SW5E's own item data has the 0: dev/dumps/catalog.json gives Light physical shield weight '0' and Tinker's implements '0' (Medium physical shield is '18'). The builder shows 0 too, and the viewer only displays the data. Report it upstream. Once the PHB weights are confirmed, this argues for a small local correction table applied in mergeEquipment and the catalog.

<a id="w-084"></a>
#### W-084 Credits history with a note per change

**fixed** · medium · improvement · reported by Jun, Priya, Sam ([Jun-B24](panel/2026-10-17/jun-b.md), [Priya-B28](panel/2026-10-17/priya-b.md), [Sam-B25](panel/2026-10-17/sam-b.md))

> When credits change (loot, a gift to a party member, a debt), I want a short log with an optional note per change, so that the money's history lives with the money, not in Notes.

- **What they saw:** All three did +400 (→ 550 cr) and −100 (→ 450 cr). The credits box applies '+n' and '-n' with Enter but keeps no history or reason. The debt to Kessa is still only in Notes.
- **To reproduce:** Change credits a few times, then look for a record.
- **Expected:** A collapsible history (amount, note, date), including debts and loans (W-078).
- **Workaround used:** Wrote it in Notes.
- **Checked against the code:** missing, effort M, `viewer.js:adjustCredits`. adjustCredits only writes the new credits value and a status line; no log is kept. It needs a per-character credits log (amount, optional note, date, balance after), for example in itemState so backups include it. It also needs a note field in the credits form and a collapsible history under Credits. Debts and loans tie in with W-078.
- **Resolution:** The credits box has a 'what for' note, and Credit history lists every change made in the sheet (the box, purchases, sales, paying back) with its note and balance. (`091ba99`)

<a id="w-085"></a>
#### W-085 Track blaster shots per power cell

**fixed** · medium · improvement · reported by Tomas, Jun ([Tomas-A19](panel/2026-10-17/tomas-a.md), [Jun-A32](panel/2026-10-17/jun-a.md))

> When I fire my blaster, I want a shots-left counter for the loaded cell and a Reload that uses a power cell, so that I know when I need to reload.

- **What they saw:** Tomas's blaster rifle shows 'Power cell (range 105/420), reload 12'. After two shots, power cells stayed at 3 and no shot count appears anywhere. Jun's blaster pistol shows 'reload 16', and cells only go down via Use. Tomas rated it medium, Jun low.
- **To reproduce:** Roll two blaster attacks, then look at the inventory and weapon rows.
- **Expected:** A counter per equipped ranged weapon (10/12), with Reload using one power cell.
- **Workaround used:** Tracked it in their heads.
- **Checked against the code:** missing, effort M, `roller.js:buildRoll('attack'); viewer.js:renderEquipment`. There is no ammunition or reload tracking. 'Reload 12' is only a property string, and power cells are ordinary inventory items that go down only through Use. It needs a per-weapon shots counter (in itemState), decremented on each attack roll, and a Reload button that uses one matching ammo item (ammoFits() already matches cells to weapons).
- **Resolution:** Weapons with reload show 'Shots N/12' in Weapons & Attacks. Each attack rolled uses a shot, −1 counts one fired without rolling, and Reload takes a power cell (or cartridge) from the inventory. The last shot offers Reload. (`091ba99`)

<a id="w-086"></a>
#### W-086 Encumbrance: changes silently, doesn't affect speed, consequence unexplained

**decided** · medium · bug · reported by Tomas, Jun ([Tomas-A27](panel/2026-10-17/tomas-a.md), [Jun-A31](panel/2026-10-17/jun-a.md))

> When loot pushes me over a carrying threshold, I want to be told and have my speed adjusted (or be told it only applies with the variant rule), so that the 'Encumbered' warning means something.

- **What they saw:** Tomas (Str 8): 'Carried 64 lb — Encumbered', encumbered at 40 lb, but Speed stays 30 ft everywhere. Jun: adding 10 power cells took him to 41 lb ('CARRIED 41 lb Encumbered · ENCUMBERED AT 40 lb'), with no notice, Speed still 30 ft, and nothing saying what Encumbered does. Tomas logged it as a rules question (low), Jun as a bug (medium).
- **To reproduce:** A Str 8 character: add items past 40 lb.
- **Expected:** A notice 'Now encumbered: speed 20 ft' and Speed updated. Or 'only if your GM uses variant encumbrance', or hide the variant.
- **Workaround used:** Ignored it.
- **Checked against the code:** needs-decision, effort S, `viewer.js:renderCarry`. renderCarry labels the character 'Encumbered' or 'Heavily encumbered' from SW5E's carryingCapacity thresholds (5×/10× Str, the variant encumbrance rule). It applies nothing to speed, gives no notice when a threshold is crossed, and doesn't explain what being encumbered does. Options: (a) apply the variant behind a setting (−10 ft; heavily encumbered: −20 ft plus disadvantage on Str/Dex/Con rolls), with a notice when crossing a threshold; (b) label it 'Variant rule: only if your GM uses it' and explain the effect; (c) hide the thresholds and show only capacity (Str × 15).
- **Resolution:** Labelled as a variant rule, with what it does in the tooltip; nothing is applied to speed (option b). (`3103be9`)

<a id="w-087"></a>
#### W-087 Arrow-down skips the pre-highlighted first suggestion

**fixed** · medium · bug · reported by Tomas ([Tomas-A21](panel/2026-10-17/tomas-a.md))

> When I search for an item and press ↓ then Enter, I want the first result, so that I don't silently get a different item.

- **What they saw:** The first suggestion is already highlighted, so ↓ moves to the second. 'pouch' gave him an Ammo Pouch (EC, 15 cr) instead of a Pouch, which he only noticed in step A7. 'grenade, frag' gave 'Grenade, Fragmentation (Average)' (an enhanced consumable with no price) instead of the plain grenade.
- **To reproduce:** Search 'pouch', press ↓, Enter, Enter.
- **Expected:** ↓ highlights (or keeps) the first item, or the highlight is clearly visible.
- **Workaround used:** Removed the Ammo Pouch and used Enter without ↓.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:wireUi keydown (add-item), ADD_DEFAULTS`. ADD_DEFAULTS has hi: 0, so the first suggestion starts highlighted, and ArrowDown adds 1, moving to the second item; Enter then picks hits[hi]. 'grenade, frag' lists the plain 'Grenade, fragmentation' first and '(Average)' second, so ↓ Enter gives the enhanced one, exactly as reported. Fix: start with no highlight (hi −1, Enter takes the first item), or make ↓ from the input land on item 0. Also make .sugg-item.hi easier to see.
- **Resolution:** The first ↓ keeps the already highlighted first suggestion (items and effects). (`3103be9`)

<a id="w-088"></a>
#### W-088 Qty and Pay carry over to the next item picked

**fixed** · low · bug · reported by Mira, Sam ([Mira-A20](panel/2026-10-17/mira-a.md), [Sam-A27](panel/2026-10-17/sam-a.md))

> When I pick a different item after buying two of something, I want Qty back to 1 and Pay unticked, so that I don't buy two by accident.

- **What they saw:** Mira set Medpac qty 2 with Pay ticked, then picked 'Focus generator': it showed Qty 2 and 'Pay 400' ticked. Sam picked Light physical shield after the medpac attempt and it kept Qty 2 and 'Pay 100 cr'.
- **To reproduce:** Choose an item, set Qty 2 and tick Pay, then choose another item.
- **Expected:** Qty 1, Pay unticked, standard price.
- **Workaround used:** Reset them by hand.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:pickAddItem, wireUi input handler (data-add)`. pickAddItem sets only d.name and d.hi. Qty, Pay and any typed price stay in state.addDraft (so does editing the name), and only addItemFromCatalog resets the draft. A typed custom price carries over too. Fix: reset qty, pay, price, equip and attune whenever a different item is picked.
- **Resolution:** Picking another item resets quantity, Pay, price, equip and attune. (`3103be9`)

<a id="w-089"></a>
#### W-089 Mesh armor price differs: 600 in the builder, 500 cr in the sheet

**upstream** · low · bug · reported by Tomas, Priya ([Tomas-A30](panel/2026-10-17/tomas-a.md), [Priya-A31](panel/2026-10-17/priya-a.md))

> When I compare prices, I want the same number in both places, so that I can trust the shop price.

- **What they saw:** The builder's Add Equipment dialog shows Mesh armor 'Cost: 600'. The sheet's inventory row shows 'Mesh armor … 500 cr'.
- **To reproduce:** Compare the mesh armor price in sw5e.com's Add Equipment with the viewer's inventory.
- **Expected:** One price (check SW5E's list).
- **Workaround used:** None.
- **Checked against the code:** sw5e-site, effort S, `viewer.js:renderEquipment (e.cost), priceOf`. The viewer shows SW5E's own cost field: the catalog dump has Mesh armor cost 500. The 600 comes from sw5e.com's builder dialog. Check the PHB armor table and report the mismatch upstream. If 600 is right, add it to the same correction table as W-083.

<a id="w-090"></a>
#### W-090 Armor properties (Stealth disadvantage, Strength requirement) not shown or applied

**fixed** · low · rules · reported by Tomas, Priya ([Tomas-B22](panel/2026-10-17/tomas-b.md), [Priya-A33](panel/2026-10-17/priya-a.md))

> When I wear armor, I want its properties shown on the row and applied in the roller, so that I know whether my Stealth roll has disadvantage.

- **What they saw:** The Mesh armor row shows only 'AC 13 + Dex modifier (max 2) · Medium'. The builder's description is flavour text, so there are no properties anywhere. The Stealth roll opened on Normal.
- **To reproduce:** Equip an armor → Skills → Stealth.
- **Expected:** 'Stealth disadvantage' or 'no Stealth penalty' (and any Strength requirement) on the armor row, and disadvantage pre-selected on Stealth when it applies.
- **Workaround used:** Assumed no penalty, or looked it up elsewhere.
- **Checked against the code:** partial, effort S, `viewer.js:renderEquipment; roller.js:startRoll`. The inventory row already shows 'Stealth disadvantage', 'Str N' and the properties list when SW5E's data has them (for example Medium physical shield 'Strength 13'). SW5E's data gives Mesh armor no properties (stealthDisadvantage null), so a Normal Stealth roll is correct for mesh armor. Still missing: explanations of SW5E's armor properties (rules.armorProperties: Bulky gives disadvantage on Stealth that relies on sound; Obtrusive does the same for sight with shields; Strength cuts speed by 10), a 'no Stealth penalty' note, and the roller: startRoll never pre-selects disadvantage because of armor.
- **Resolution:** Bulky and Obtrusive armor (and SW5E's stealth-disadvantage flag) give disadvantage on Stealth rolls, saying whether it's sound or sight. An unmet Strength requirement and Cumbersome lower the speed shown. Rows list the properties; SW5E's data gives Mesh armor none. (`091ba99`)

<a id="w-091"></a>
#### W-091 No Sell action

**fixed** · low · missing · reported by Mira ([Mira-A21](panel/2026-10-17/mira-a.md))

> When I sell gear to a shop, I want to remove the item and add credits at a price I choose (default half), so that selling is one action.

- **What they saw:** Inventory rows have only −, +, Equip/Use and × (remove). Cost shows the list price (Medpac 300 cr), not what was paid.
- **To reproduce:** Look for a sell option on any inventory row.
- **Expected:** 'Sell…' with a price, which adds the credits.
- **Workaround used:** × and then a '+n' credits entry by hand.
- **Checked against the code:** missing, effort S, `viewer.js:itemControls, inventoryAction`. Inventory rows have only − / + / Equip / Use / ×. A Sell action would remove one unit and add credits at a price the player chooses (default half of priceOf), with a status line.
- **Resolution:** Sell on every row: how many and the price (half the standard price by default, what you paid shown). The items go, the credits come in, and the sale is in the credit history. (`091ba99`)

<a id="w-092"></a>
#### W-092 Enter in the item search adds the item straight away

**decided** · low · improvement · reported by Sam ([Sam-B24](panel/2026-10-17/sam-b.md))

> When I type an item name and press Enter, I want it to select the suggestion first (showing qty, price and Pay) and only add on a second Enter, so that I don't add or buy something by accident.

- **What they saw:** Typing 'Weapon (Fine)' + Enter added it straight away (Items 11 → 12), without showing the Pay/qty row.
- **To reproduce:** Equipment → Add an item → type a full name → Enter.
- **Expected:** Enter selects; a second Enter (or Add) adds.
- **Workaround used:** Fine for free loot.
- **Checked against the code:** needs-decision, effort S, `viewer.js:wireUi keydown, addSuggestions, renderAddDetail`. Works as designed. The code comment says 'once the name is a SW5E item, Enter … adds it': addSuggestions returns [] for an exact catalog name, so Enter calls addItemFromCatalog. The claim that the Pay row never showed is only half right: renderAddDetail redraws on input, so the Pay row appears the moment the exact name is typed, and Qty is always visible. Options: keep it (fast for free loot); always select first and add on a second Enter; or need a second Enter only when Pay is ticked.
- **Resolution:** Kept: Enter adds an item once its exact SW5E name is typed (fast for loot); the Qty and Pay row is visible meanwhile. (`3103be9`)

<a id="w-093"></a>
#### W-093 An open item Description jumps to another item after the list changes

**fixed** · low · bug · reported by Tomas ([Tomas-B24](panel/2026-10-17/tomas-b.md))

> When an item I had expanded is used up or the list changes, I want the expanded state to stay with that item, so that a random other item doesn't open.

- **What they saw:** He opened the Strength Stim's Description and used the stim up: the Grenade, fragmentation's description was then open. After adding the nightstinger, the Mesh armor's description was open.
- **To reproduce:** Expand an item's Description, then use up its last unit (or add an item above it).
- **Expected:** Keep the open/closed state per item, not per row position.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:captureUi/restoreUi, uiKeys, detailsLabel`. An open <details> is remembered by section + summary text + which occurrence it is. Every item's summary is 'Description', so the open state is tied to the row position, not the item. When an item is used up or added above, it moves to whichever item now sits in that position. Fix: include the item name in the key (a data attribute or a label).
- **Resolution:** An item's open Description is remembered by item name, not by row position. (`3103be9`)

<a id="w-094"></a>
#### W-094 Remove × sits right next to Use on consumables, with no confirm

**works** · low · improvement · reported by Jun ([Jun-B21](panel/2026-10-17/jun-b.md))

> When I use a stim on my phone, I want the remove × set apart from Use (or confirmed, or undoable), so that a slip doesn't delete the item.

- **What they saw:** The Strength Stim row reads '[−] 1 [+] [Use] [×]', with × immediately to the right of Use and no confirmation.
- **To reproduce:** Phone frame → Equipment → any consumable row.
- **Expected:** × set apart, or behind a confirm or undo.
- **Workaround used:** Tapped carefully.
- **Checked against the code:** exists, effort S, `viewer.js:itemControls, inventoryAction('remove')`. Removal already asks first. The first click on × turns it into 'Remove?' (state.confirmRemove), only a second click removes, and the status then offers 'Revert to SW5E's copy'. Jun's 'no confirmation' is wrong; he likely never pressed it. What remains is layout: on phones × sits right next to Use. Move it apart, or add an Undo toast.
- **Resolution:** Removing already asks first ('Remove?'), and now also offers Undo.

<a id="dice-roller"></a>
### Dice roller

<a id="w-095"></a>
#### W-095 Active powers' bonus dice not offered in the roller (Guidance, Target Lock, Battle Meditation)

**fixed** · blocker · missing · reported by Mira, Priya, Jun ([Mira-A15](panel/2026-10-17/mira-a.md), [Priya-A17](panel/2026-10-17/priya-a.md), [Jun-A24](panel/2026-10-17/jun-a.md))

> When a power that adds dice is active, I want the dice dock to offer that die pre-ticked on the right rolls and to end one-shot powers like Guidance once used, so that I neither forget the bonus nor forget to end the power.

- **What they saw:** With Guidance active ('Cast Guidance. Concentrating.'), the Persuasion dock showed only Normal / Roll. Mira added +d4 herself (18 + 4 + 3 = 25), and so did Priya (4 + 4 + 2 = 10). Guidance stayed in Effects until they pressed End, though its text says 'Once before the power ends… The power then ends.' With Target Lock active ('you deal an extra 1d6 damage to the target whenever you hit it with a weapon attack'), the blaster pistol's damage was '8 Energy (6 + 2 damage bonus)' and nothing was offered. Jun tapped +d6 → 9 'amended', and praised being able to add a die after the roll. Battle Meditation's '+d4 to attack rolls and saving throws' isn't offered either (Mira-B5). Jun rated it high, Mira and Priya medium.
- **To reproduce:** Cast Guidance and roll any skill, or cast Target Lock, hit with a weapon and roll damage.
- **Expected:** '+1d4 Guidance' offered on ability checks, ending Guidance once used. '+1d6 Target Lock' ticked on weapon damage, the way Rage damage is. The same for other active powers that add a die to rolls.
- **Workaround used:** Added the die with the +d4 / +d6 buttons, and ended Guidance from Effects.
- **Checked against the code:** missing, effort M, `viewer.js:castPower; roller.js:buildRoll, startRoll`. castPower starts power effects with mods: [] and only a text note, so nothing reaches the roller. The dock's options come only from m.alts (conditional mods of items and features) and from class riders. The Rage-damage rider in buildRoll('damage') is the pattern to copy. Needed: per-power riders read from the power text or a small table (Guidance +1d4 on ability checks, one use, then the effect ends; Target Lock +1d6 on weapon damage; Battle Meditation +1d4 on attacks and saves), pre-ticked on the matching rolls.
- **Resolution:** Dice from active powers are ticked on the rolls they apply to: Guidance's d4 on ability checks (then the power ends), Battle Meditation's d4 on attacks and saves, Target Lock's 1d6 on weapon damage. (`9874b1b`)

<a id="w-096"></a>
#### W-096 Spend class resources from the dice dock (Force-Empowered Strikes, maneuvers, Close Call)

**fixed** · blocker · missing · reported by Priya, Tomas, Jun ([Priya-B8](panel/2026-10-17/priya-b.md), [Tomas-B15](panel/2026-10-17/tomas-b.md), [Jun-B14](panel/2026-10-17/jun-b.md))

> When I use a feature that spends a resource to add a die to an attack or damage roll, I want a toggle in the dock that adds the die and spends the resource in the same click (like the Sneak Attack checkbox), so that I don't add dice by hand and then decrement the tracker somewhere else.

- **What they saw:** Force-Empowered Strikes (Priya, high): 'Hit: roll damage' rolled only 1d6+3 / 1d6+4. The 'Class dice: Focused Strikes 2d8' chip opens a bare '2d8' roll (5 + 5 = 10): not named, no choice of 1 or 2 points, not added to the weapon damage, no FP spent. She pressed FP − twice (9 → 7, 7 → 5) and typed 2d8 in round 3.

Precision Attack / Return Fire (Tomas): the attack dock has +d4…+d20 but no maneuver option, and superiority dice (2/2) are only on the tracker.

Armstech's Close Call on a miss (Jun; a 6 with disadvantage): no option. He tapped +d4 (1 → 7 'amended'), then went to Combat > Potent Aptitude − (2/2 → 1/2).

The damage dock's '☐ Sneak Attack +1d6' checkbox shows the pattern already exists; Tomas praised it.
- **To reproduce:** Guardian 2+: hit with the lightsaber and roll damage. Fighter with Precision Attack: attack with the blaster rifle. Armstech 3: miss with the modified weapon.
- **Expected:** 'Force-Empowered Strikes: +1d8 (1 FP) / +2d8 (2 FP)' on melee damage (same damage type, dice doubled on a crit). '☐ Precision Attack (+d4, spends a superiority die)' on attacks, and Return Fire on damage. 'Close Call: add Potent Aptitude (d4), 2 left' on a miss with the modified weapon. The tracker updates in the same click.
- **Workaround used:** +dN buttons by hand, plus '−' on the tracker.
- **Checked against the code:** partial, effort L, `roller.js:buildRoll('damage'), applyButtons('supdie'); viewer.js:renderCombat (class dice), classDice`. Already there: Sneak Attack, Rage and splash riders as damage checkboxes; a superiority-die roll with 'Spend a superiority die'; class-table chips (Focused Strikes 2d8) that roll bare dice. Missing: riders inside the attack and damage dock that also spend the resource. That means Force-Empowered Strikes (1d8 per FP, up to Focused Strikes, doubled on a crit, spends FP), maneuvers adding the superiority die to attack or damage (Precision Attack, Return Fire), and Close Call (Potent Aptitude added on a miss with the modified weapon). Each should update the tracker in the same click.
- **Resolution:** The dice roller offers what a roll can spend, unticked: maneuvers that add the superiority die to the attack or its damage, Force-Empowered Strikes (+1d8 per force point up to the Focused Strikes column) on melee damage, Close Call with the modified weapon. Ticking one spends it, even after the roll; unticking gives it back. (`9874b1b`)

<a id="w-097"></a>
#### W-097 Use Inspiration from the roller (and show it in the strip)

**fixed** · high · improvement · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-A38](panel/2026-10-17/mira-a.md), [Tomas-A23](panel/2026-10-17/tomas-a.md), [Jun-A27](panel/2026-10-17/jun-a.md), [Priya-A18](panel/2026-10-17/priya-a.md), [Sam-A46](panel/2026-10-17/sam-a.md))

> When I'm Inspired and roll a d20, I want a 'Use Inspiration (advantage)' option in the dock that also spends it, and an 'Inspired' chip in the phone/tablet strip, so that one click does both and I don't forget it.

- **What they saw:** With '★ Inspired' on (and the 'Inspired' chip in the summary), the Stealth dock offered only Disadvantage / Normal / Advantage. All five picked Advantage (11/16 → 18, 3/12 → 15, 14/1 → 16, 16/6 → 17, 9/7 → 10), then went back to Combat & Vitals to turn Inspiration off. The tablet strip shows nothing for Inspiration (Priya).
- **To reproduce:** Turn Inspiration on, then roll Stealth.
- **Expected:** A 'Use Inspiration' option that sets advantage and spends Inspiration, plus an 'Inspired' chip in the strip.
- **Workaround used:** Picked Advantage by hand, then toggled Inspiration off.
- **Checked against the code:** missing, effort S, `viewer.js:applyTrackerAction('insp'), renderMiniVitals; roller.js:renderRollCard`. hasInspiration is only toggled in the tracker and shown as a chip in the desktop summary (renderSideSummary). roller.js never reads it, and renderMiniVitals lists only temporary effects. Add 'Use Inspiration (advantage)' to d20 roll cards that sets advantage and calls trackerAction('insp'), plus an 'Inspired' chip in the strip.
- **Resolution:** '★ Use Inspiration' on a d20 roll card sets advantage and spends it; the phone strip shows ★ while inspired. (`3103be9`)

<a id="w-098"></a>
#### W-098 Dice dock: the × moves, the dock covers buttons, and closing it clicks through

**fixed** · high · bug · reported by Tomas, Priya, Mira, Jun ([Tomas-A17](panel/2026-10-17/tomas-a.md), [Priya-B18](panel/2026-10-17/priya-b.md), [Mira-B12](panel/2026-10-17/mira-b.md), [Jun-A28](panel/2026-10-17/jun-a.md))

> When I close the dice dock or reach for a button behind it, I want the × to stay put, the dock not to cover End/Use/Cast buttons, and closing it not to trigger what's underneath, so that I don't start unwanted rolls or miss End mid-fight.

- **What they saw:** The dock is anchored to the bottom and changes height (result, recent rolls), so its × moves. Tomas twice clicked where the × had been and opened 'Lore (INT)' and 'Animal Handling (WIS)' rolls he never wanted, and Escape only closes the dock when focus is inside it. Priya (tablet): three taps on × missed after the page or dock reflowed, and the dock covered Effects, Conditions and the tracker's Mynock row. Mira (desktop, 1568 px): End on Guidance behind the dock hit the dock, so she pressed Esc and then End. Jun (phone): after ×, a tooltip opened over Medicine ('Without tweaks or effects: 1 → now 3…'). His × also moved up when a damage roll made the dock taller.
- **To reproduce:** Roll an attack and its damage, then click where the × was a moment before. Or scroll Effects so a row sits behind the dock and click End.
- **Expected:** The × stays in a fixed place (a top-anchored dock), and Escape closes the dock from anywhere. The page gets padding while the dock is open, or the dock sits beside the content or can be minimised. No click-through on close.
- **Workaround used:** Esc, and a fresh screenshot before every close.
- **Checked against the code:** bug-confirmed, effort M, `viewer.css:370 (#dice); roller.js:renderDice, keydown handler`. #dice is position: fixed with bottom: 16px and grows upward as the result, damage and recent rolls are added, so the ✕ in .dice-head moves. A click where it used to be lands on the page and starts whatever roll is underneath. After the dock closes, the element under the pointer gets a mouseover, which is the tooltip Jun saw. The dock overlays the page; only body padding-bottom is added. Escape: the handler closes the dock from anywhere except while typing in a field outside it, so 'only when focus is inside' is mostly wrong. Fix: anchor the dock's head at a fixed spot, add a minimise state, and briefly ignore clicks after closing.
- **Resolution:** The dock never shrinks while open (its ✕ can't move down under the pointer), has a ▾ minimise button that leaves one line with the last result, and focus never lands on 'Roll again'. (`3103be9`)

<a id="w-099"></a>
#### W-099 Roller ignores active conditions and doesn't combine advantage/disadvantage sources

**fixed** · high · bug · reported by Jun, Sam ([Jun-B18](panel/2026-10-17/jun-b.md), [Sam-B10](panel/2026-10-17/sam-b.md))

> When I'm Poisoned (or Reckless while poisoned), I want the dock to pre-select the resulting mode and list why ('Reckless: advantage, Poisoned: disadvantage → they cancel, roll one d20'), so that I roll correctly under pressure and learn the rule.

- **What they saw:** Jun had Poisoned loaded from sw5e.com, and Conditions showed 'Poisoned — A poisoned creature has disadvantage on attack rolls and ability checks.' Tapping the blaster's '+4' still opened the dock on 'Normal'; he picked Disadvantage by hand (2 / 19 → 6). Sam: the Vibroaxe attack dock knows neither Reckless Attack nor Poisoned, and he needed the GM to tell him they cancel. Mira, Tomas and Priya also picked Disadvantage by hand while poisoned (W-062). Exhaustion is in W-063 and armor Stealth in W-090. Jun rated it high, Sam medium.
- **To reproduce:** Have Poisoned active (loaded from SW5E) and open any attack. Or be poisoned and use Reckless Attack.
- **Expected:** The mode pre-selected from all active sources, each listed with its reason, the way Rage pre-selects advantage.
- **Workaround used:** Picked the mode by hand after asking the GM.
- **Checked against the code:** missing, effort M, `roller.js:startRoll (fits)`. startRoll pre-selects advantage only, only from the advantage lists of m.effects, and only for save/check/skill/initiative rolls. Attack rolls never get a preset. SW5E's conditions (c.conditions, e.g. Poisoned) are never read, nothing ever pre-selects disadvantage, and there is no 'advantage and disadvantage cancel' logic. Needed: one resolver that collects sources (conditions, states such as Reckless, exhaustion, armor), applies the cancel rule and lists each reason.
- **Resolution:** The roller combines advantage and disadvantage from features, states, conditions, exhaustion and War Caster (they cancel out), and marks automatic failures (Stunned: Strength and Dexterity saves). (`3d97d86`)

<a id="w-100"></a>
#### W-100 Force Visions (Way of the Seer): no foretelling dice

**fixed** · high · missing · reported by Mira ([Mira-B9](panel/2026-10-17/mira-b.md))

> When I finish a long rest, I want the sheet to roll and keep my two foretelling d20s, and the dock to offer 'use foretelling 13' on any d20 roll (mine or someone else's) and cross it off, so that my archetype's main feature works at the table.

- **What they saw:** The Force Visions card has only a 'Your choices' text box (placeholder 'What you chose (e.g. Persuasion + Forgery kit)'). Mira rolled 2d20 in the dock (11, 13) and typed 'Foretelling rolls: 11, 13'. In the fight she used 11 on the boss's Dex save and 13 on her own concentration save, and the dock knew nothing. The long rest ('Long rest: regained 16 HP, 10 force points, one level of exhaustion gone.') didn't refresh them, so she rolled 2d20 again (1, 9) and retyped the note.
- **To reproduce:** Pick Way of the Seer at Consular 3 and take a long rest.
- **Expected:** Two foretelling dice on the tracker, rolled on each long rest. A 'replace with foretelling X' option in the dock (before rolling, once per turn), plus a manual 'used' tick for a creature I can see.
- **Workaround used:** Rolled 2d20 in the dock and kept the numbers in the feature's note box.
- **Checked against the code:** missing, effort M, `viewer.js:featureNoteBox, applyTrackerAction('long'); roller.js:renderRollCard`. SW5E's rules text describes two foretelling d20s rolled after each long rest, but the Force Visions card has only the generic notes box. Needed: a foretelling pool on the tracker, rolled on Long rest; a 'replace with foretelling N' option on d20 roll cards (before rolling, once per turn); and a 'used' tick for another creature's roll.
- **Resolution:** Force Visions rolls two foretelling d20s on each long rest (or Roll 2d20 in the tracker, where they're listed). A d20 roll offers 'Use N' before rolling, which replaces the die and uses that number up. (`9874b1b`)

<a id="w-101"></a>
#### W-101 Natural 1 still highlights 'Hit: roll damage'

**fixed** · medium · confusing · reported by Mira, Tomas, Priya ([Mira-B21](panel/2026-10-17/mira-b.md), [Tomas-A31](panel/2026-10-17/tomas-a.md), [Priya-B23](panel/2026-10-17/priya-b.md))

> When my attack roll is a natural 1, I want the dock to say it's a miss rather than highlight 'Hit: roll damage', so that nobody rolls damage by habit.

- **What they saw:** The red 'Natural 1' badge appears ('3 · Natural 1' for Mira, d20 1 → 6 for Tomas, '6 · Natural 1' for Priya), but the yellow/gold 'Hit: roll damage' default and 'Critical damage' are still offered.
- **To reproduce:** Roll weapon attacks until you get a natural 1.
- **Expected:** 'Miss (natural 1)', with the damage buttons dimmed.
- **Workaround used:** Ignored the button.
- **Checked against the code:** bug-confirmed, effort S, `roller.js:renderRollCard (follow), renderDice('next')`. 'Hit: roll damage' gets the primary style whenever the roll isn't a crit. A natural 1 only adds the 'Natural 1' chip, and renderDice('next') then focuses that primary damage button. In SW5E, as in 5e, a natural 1 on an attack roll always misses. Fix: on a natural 1 show 'Miss (natural 1)', dim the damage buttons and move the focus.
- **Resolution:** A natural 1 on an attack shows 'Miss (natural 1)' and no damage button is the default (decision 31). (`3103be9`)

<a id="w-102"></a>
#### W-102 Roll breakdown hard to read (missing '+', dice not named, bonuses lumped)

**fixed** · medium · confusing · reported by Mira, Priya, Sam ([Mira-A16](panel/2026-10-17/mira-a.md), [Priya-A41](panel/2026-10-17/priya-a.md), [Sam-A34](panel/2026-10-17/sam-a.md))

> When I read a roll's breakdown, I want each die and bonus named ('d20 18 + d4 4 + 3 modifier', '+4 Str +2 Rage'), so that I can check the total and learn what each feature adds.

- **What they saw:** A skill check with +d4 shows '18 4 + 3 modifier' (Mira) and '4 4 + 2 modifier' (Priya). Raging Vibroaxe damage shows '14 Kinetic · 8 + 6 damage bonus'; Sam wants to see '+4 Str +2 Rage'.
- **To reproduce:** Roll a skill with +d4, or roll damage while raging.
- **Expected:** 'd20 18 + d4 4 + 3 modifier', with the damage bonus split by source.
- **Workaround used:** Looked at the dice tiles.
- **Checked against the code:** bug-confirmed, effort S, `roller.js:rollBreakdown`. rollBreakdown puts the kept d20 and the other dice into separate parts joined by spaces, so the extra die gets no '+' ('18 4 + 3 modifier'), and the dice aren't named (d20, d4, condition). On damage, 'damage bonus' is SW5E's single w.damageBonus. The missing '+' and the die names are S. Splitting the damage bonus by source (Str, Rage, Brute Force) needs bumpSources-style data and is M.
- **Resolution:** Every part is named and signed, and a damage roll's bonus is split by source: '1d8 1 + 3 DEX modifier + 2 Brute Force + 1 Xerrol Nightstinger Rifle' (Kadro); Rage and other states, features, items and tweaks by name, the rest as 'other (weapon, style…)'. (`4f0ee1c`)

<a id="w-103"></a>
#### W-103 Recent rolls aren't kept with the character (lost on reload, separate per page/device)

**fixed** · medium · improvement · reported by Mira, Tomas, Priya ([Mira-B30](panel/2026-10-17/mira-b.md), [Tomas-B32](panel/2026-10-17/tomas-b.md), [Priya-B31](panel/2026-10-17/priya-b.md))

> When I reload or switch between desktop and phone during a session, I want my character's recent rolls still there, so that 'what did you roll?' can be answered at the table.

- **What they saw:** Session 1's rolls were gone at the start of part B (Mira, Tomas; Sam noticed it too but logged no wish). In the phone frame, 'Recent rolls for this character' had only the phone's rolls, not the desktop rolls from minutes before: Mira's 'Vibrostaff attack 19'; Tomas's 8 at 16:53 vs the desktop rolls from 16:27–16:34. After a reload, Priya had only the new roll (14 at 18:25); initiative, Stealth, attacks, the 2d8s and damage were gone.
- **To reproduce:** Roll on desktop, then reload or open the phone frame and open the dock.
- **Expected:** The last N rolls stored with the character's data, at least for the last session.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `roller.js:saveRollLog, loadRollLog, ROLL_LOG_MAX`. A plain reload does keep rolls: they are saved to chrome.storage 'rolls' and loaded at startup. The real causes: one log for all characters, capped at 50 (ROLL_LOG_MAX), so five players' rolls push each other out; and each page writes its whole in-memory list with no merge and no onChanged listener. A second open page, or a phone frame loaded earlier, overwrites the other page's rolls. Fix (S): merge on write, cap per character, listen for changes. Rolls across devices need the log stored in the character's data (M).
- **Resolution:** Rolls are merged across tabs and capped per character, and now also kept with the character: Sync to SW5E sends the latest 15 as its rollLog, and loading it elsewhere adds them to the log (tested: Kadro's rolls removed locally came back with Load from SW5E). (`4f0ee1c`)

<a id="w-104"></a>
#### W-104 Versatile weapons: no two-handed damage option

**fixed** · medium · missing · reported by Mira, Priya ([Mira-A23](panel/2026-10-17/mira-a.md), [Priya-A16](panel/2026-10-17/priya-a.md))

> When I swing a versatile weapon two-handed, I want the damage roll to offer its versatile dice (2d4), so that I roll the right dice when I drop my shield.

- **What they saw:** The Vibrostaff shows '1d6−1 Kinetic · Versatile (2d4)', but 'Hit: roll damage' rolled only d6: 1 − 1 = 0 Kinetic (Mira). The Lightsaber is 'versatile (2d4)', but the dock rolled only 1d6+3 (Priya). There's no one-/two-handed choice.
- **To reproduce:** Weapons & Attacks > a versatile weapon > roll > Hit: roll damage.
- **Expected:** A one-handed / two-handed toggle, with a warning for two-handed while a shield is equipped (W-149).
- **Workaround used:** Swapped dice in the dock, or typed 2d4+3.
- **Checked against the code:** missing, effort S, `roller.js:buildRoll('damage')`. The damage roll uses only damageNumberOfDice and damageDieType. 'Versatile (2d4)' is just text in the weapon's properties. Add a one-handed / two-handed toggle that reads the versatile dice from the property, with a warning when a shield is equipped (armorState knows about shields).
- **Resolution:** A versatile weapon's attack offers 'Two-handed (2d4)' next to 'Hit: roll damage', rolling the versatile dice. (`dad1b17`)

<a id="w-105"></a>
#### W-105 Weapon Expert: damage advantage not offered

**fixed** · medium · missing · reported by Tomas ([Tomas-A7](panel/2026-10-17/tomas-a.md))

> When I hit with a blaster or vibroweapon and my feat lets me roll damage with advantage once per turn, I want the roller to roll the weapon dice twice and keep the higher set, so that I don't do it in my head.

- **What they saw:** Weapon Expert says '…once per turn when you would roll weapon damage using a blaster, you can choose to have advantage.' The damage roll has no Advantage option. Pressing +d8 added the die to the sum: '1 + 7 + 3 damage bonus' = 11 ('amended'), while the right result is max(1, 7) + 3 = 10. Nothing about it appears on the weapon rows either.
- **To reproduce:** Attack with the blaster rifle, then Hit: roll damage, then +d8.
- **Expected:** An 'Advantage (Weapon Expert)' option on blaster and vibroweapon damage that keeps the higher set, once per turn (W-051).
- **Workaround used:** Took the higher die in his head.
- **Checked against the code:** missing, effort M, `roller.js:setMode, buildRoll('damage')`. Advantage exists only for d20 rolls (setMode returns unless the roll's kind is 'd20'), and +d8 just adds to the sum. Needed: an advantage mode for weapon damage that rolls the weapon dice twice and keeps the higher set, offered on blaster damage when Weapon Expert's alternative benefit applies (rules text: 'once per turn when you would roll weapon damage using a blaster, you can choose to have advantage').
- **Resolution:** Weapon Expert adds an 'Advantage (Weapon Expert)' button to blaster damage rolls: the weapon's dice are rolled twice and the higher set counts. (`9874b1b`)

<a id="w-106"></a>
#### W-106 Mercantile's conditional expertise not offered on business Persuasion

**fixed** · medium · missing · reported by Jun ([Jun-A26](panel/2026-10-17/jun-a.md))

> When I make a business Persuasion check as a Sullustan, I want 'business (Mercantile): expertise' offered in the roller, so that I get my species bonus.

- **What they saw:** Mercantile: 'Whenever you make a Charisma (Persuasion) check related to conducting business, you are considered to have expertise'. The Persuasion dock shows only Disadvantage/Normal/Advantage and 'Roll +0'. The README says conditional bonuses show as alternatives (e.g. 'vs poison').
- **To reproduce:** Skills → Persuasion on a Sullustan.
- **Expected:** A 'business (Mercantile)' option that adds expertise.
- **Workaround used:** None.
- **Checked against the code:** missing, effort M, `viewer.js:featureEffectsUncached, defensesOf, condAlts`. Species traits are never turned into effects: featureEffectsUncached reads only class and archetype features, and defensesOf reads species text only for defenses and senses. So Mercantile's conditional expertise never becomes a 'business' alternative (fx.conds → m.alts) that the roller could offer.
- **Resolution:** Persuasion checks offer 'business (Mercantile)' with the expertise bonus. (`9874b1b`)

<a id="w-107"></a>
#### W-107 Shift-click to roll selects page text

**fixed** · low · bug · reported by Mira, Sam ([Mira-A22](panel/2026-10-17/mira-a.md), [Sam-A37](panel/2026-10-17/sam-a.md))

> When I shift-click a number to roll straight away, I don't want half the page selected in blue.

- **What they saw:** Shift-clicking Initiative rolled it (8 + 2 = 10) but highlighted the stat cards, and later most of the Play tracker, as a text selection (Mira). Shift-clicking the Vibroaxe '+6' rolled 11 + 6 = 17 and highlighted the weapons table and the Combat & Vitals text (Sam).
- **To reproduce:** Click somewhere, then shift-click Initiative or a to-hit number.
- **Expected:** Roll without a text selection.
- **Workaround used:** Clicked empty space to clear it.
- **Checked against the code:** bug-confirmed, effort S, `roller.js:document click handler; viewer.css:.rollable`. Shift-click rolls straight away (now: e.shiftKey), but nothing stops the browser's own shift-click, which extends the text selection from the last click. There is no preventDefault on shift+mousedown and no user-select: none on .rollable. Fix: preventDefault on shift+mousedown over [data-roll], or clear the selection afterwards.
- **Resolution:** Shift-mousedown on a rollable is prevented, so no text gets selected. (`3103be9`)

<a id="w-108"></a>
#### W-108 Sneak Attack offered on an attack rolled with disadvantage

**fixed** · low · rules · reported by Tomas ([Tomas-B25](panel/2026-10-17/tomas-b.md))

> When I attack with disadvantage, I want the damage dock to flag Sneak Attack as unavailable, so that I don't add damage I'm not owed.

- **What they saw:** Round 3: Disadvantage chosen in the same dock (17/15 → 20), and 'Hit: roll damage' still offered '☐ Sneak Attack +1d6'. The rule: 'You don't need advantage… if another enemy of the target is within 5 feet of it… and you don't have disadvantage on the attack roll.'
- **To reproduce:** Blaster rifle attack with Disadvantage → hit → damage dock.
- **Expected:** Hide or strike out Sneak Attack, or show a hint, when the attack had disadvantage and no advantage.
- **Workaround used:** Left it unticked.
- **Checked against the code:** missing, effort S, `roller.js:handleRl('next'), buildRoll('damage')`. 'Hit: roll damage' passes only the ticked options to the damage roll, not the attack's advantage mode, so the Sneak Attack checkbox can't know the attack had disadvantage. It is unticked by default, so this is a hint, not a wrong number. Pass the mode along and strike out Sneak Attack (with the rule text) when the attack had disadvantage.
- **Resolution:** After an attack rolled with disadvantage, Sneak Attack is dimmed in the damage roll with 'not after an attack rolled with disadvantage' (it can still be ticked). (`dad1b17`)

<a id="w-109"></a>
#### W-109 Show the critical range on the attack dock

**fixed** · low · improvement · reported by Tomas ([Tomas-B27](panel/2026-10-17/tomas-b.md))

> When I roll an attack with Improved Critical, I want the dock to say 'crit 19–20', so that I know a 19 is a crit before I look at the die.

- **What they saw:** Effects shows 'Improved Critical — Critical on 19–20', but the Blaster rifle attack dock says nothing about 19–20 before or after a roll that isn't a crit (he rolled 12).
- **To reproduce:** Assault Specialist → Weapons → Blaster rifle +5.
- **Expected:** 'Crit 19–20' next to the d20.
- **Workaround used:** None.
- **Checked against the code:** partial, effort S, `roller.js:buildRoll('attack'), renderRollCard`. buildRoll('attack') already works out the crit range and its source (Improved Critical and others), but the dock shows it only in the tooltip of the 'Critical hit (19)' chip, after a crit. Show 'Crit 19–20 (Improved Critical)' next to the d20 before rolling.
- **Resolution:** The attack roll says 'Critical hit on 19–20 · Improved Critical' before you roll. (`5a2f9f6`)

<a id="w-110"></a>
#### W-110 'Roll again' appears exactly where 'Roll' was

**fixed** · low · improvement · reported by Jun ([Jun-B16](panel/2026-10-17/jun-b.md))

> When I roll initiative on my phone, I want a double tap not to re-roll, so that my first result stands.

- **What they saw:** After Roll +2 (17 → 19), 'Roll again' appeared in the same spot as 'Roll +2'.
- **To reproduce:** Phone frame: roll initiative and tap twice quickly.
- **Expected:** Move or delay 'Roll again', or ask for confirmation within a second of the first roll.
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `roller.js:renderRollCard (rl-actions), renderDice('next'); viewer.css:#dice`. The dock is anchored to the bottom, so its last row stays put: 'Roll +2' turns into 'Roll again' in the same spot. renderDice('next') also focuses 'Roll again' when a roll has no damage or apply button (initiative), so a double tap or a second Enter rolls again. Move the button, delay it, or don't focus it.
- **Resolution:** 'Roll again' sits next to the result, and focus goes to the next step or the result, never to 'Roll again'. (`3103be9`)

<a id="w-111"></a>
#### W-111 DC box in the roller with Success / Failure

**fixed** · low · improvement · reported by Sam ([Sam-A26](panel/2026-10-17/sam-a.md))

> When the GM says 'DC 15', I want to enter it in the roller and see Success or Failure, so that as a beginner I know what my roll means.

- **What they saw:** Persuasion 16 + 2 = 18 and Insight 14/12 → 15: the dock shows only the total. A known DC would also let the concentration save say pass or fail (W-050).
- **To reproduce:** Roll any check.
- **Expected:** An optional DC field with a result badge.
- **Workaround used:** Asked the GM.
- **Checked against the code:** missing, effort S, `roller.js:renderRollCard`. Roll cards have no DC field. Add an optional DC per card with a Success / Failure badge; it would also let concentration saves say pass or fail (W-050).
- **Resolution:** A DC box on d20 rolls shows Success or Failure. (`3d97d86`)

<a id="w-112"></a>
#### W-112 Critical-damage rule choice is shared by all characters

**not a bug** · low · confusing · reported by Priya ([Priya-A42](panel/2026-10-17/priya-a.md))

> When I roll critical damage, I want the crit rule to be my character's own (or SW5E's default, double dice), so that another player's choice doesn't change my damage.

- **What they saw:** On her new character's first attack, 'Critical: Double dice / Max + roll' already had Max + roll selected. She never chose it.
- **To reproduce:** A new character → weapon attack → critical damage options.
- **Expected:** Default to double dice per character, or say where the choice was set.
- **Workaround used:** Switched it each time.
- **Checked against the code:** not-a-bug, effort S, `roller.js:rollSettings, setCritMode`. Works as designed. The crit choice is stored once for the whole browser (roller.js comment: 'Kept until changed (chrome.storage, all characters)'), and the default is 'double', which is SW5E's rule. The panel shares one browser, so another player's choice showed up. If wanted, store it per character and show where it was set.

<a id="rests"></a>
### Rests

<a id="w-113"></a>
#### W-113 Long rest doesn't end effects shorter than the rest (Strength Stim, Battle Precognition)

**fixed** · high · bug · reported by Mira, Tomas, Jun, Priya, Sam ([Mira-B14](panel/2026-10-17/mira-b.md), [Tomas-B17](panel/2026-10-17/tomas-b.md), [Jun-B27](panel/2026-10-17/jun-b.md), [Priya-B15](panel/2026-10-17/priya-b.md), [Sam-B16](panel/2026-10-17/sam-b.md))

> When I take an 8-hour long rest, I want effects that last 1 minute, 1 hour or 8 hours to end (or the rest notice to ask 'End Strength Stim?'), so that a stale buff doesn't stay on my numbers the next morning.

- **What they saw:** All five used a Strength Stim (Basic) ('lasts 1 hour') and then took a long rest, and the stim stayed active with STR +2: Mira STR +0 instead of −1; Tomas STR 10; Jun's chip still in the strip and Str 10; Priya Str 18 and lightsaber +6; Sam Str 20 and axe +8. Mira's 'Battle Precognition · cast, lasts 8 hours' stayed as well. The rest messages (e.g. 'Long rest: regained 27 HP, uses of Second Wind, Action Surge, one level of exhaustion gone.') say nothing about effects.
- **To reproduce:** Use a Strength Stim on yourself, then take a long rest.
- **Expected:** Effects lasting 8 hours or less end on a long rest (1 hour or less on a short rest) and are listed in the rest notice. Or ask: 'Strength Stim (1 hour) has run out. End it?'
- **Workaround used:** Pressed End on each effect, and removed Mira's AC tweak by hand.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:applyTrackerAction('long'/'short'), restGains`. Rests reset only the tracker counters. Temporary effects (state.itemState[key].effects: stims, powers with a duration, feature states) are never touched, and the rest message doesn't mention them. Fix: a long rest ends effects lasting 8 hours or less (including concentration), a short rest those lasting 1 hour or less, and the message lists what ended (or asks first).
- **Resolution:** Rests end temporary effects that would have run out (short: ≤ 1 hour; long: ≤ 8 hours and concentration) and list them; Undo brings them back (decision 25). (`3103be9`)

<a id="w-114"></a>
#### W-114 Hit-die roll looks like grey helper text and is a tiny target

**fixed** · high · confusing · reported by Mira, Tomas, Sam ([Mira-A37](panel/2026-10-17/mira-a.md), [Tomas-A26](panel/2026-10-17/tomas-a.md), [Sam-A42](panel/2026-10-17/sam-a.md))

> When I want to spend a hit die, I want an obvious 'Roll d10+3' button with a decent hit area, so that I find it and hit it the first time.

- **What they saw:** The grey 'roll d6 +1, then Heal' next to 'Hit dice (d6)' is the button (aria label 'Roll a hit die: roll d6 +1'). Clicks on the label, on 'then Heal' or just to the right of the words did nothing. Only a click exactly on 'roll d6 +1', 'roll d10' or 'roll d12 +2' opened the dock.
- **To reproduce:** Combat & Vitals > Play tracker > click 'Hit dice (d…)' or 'then Heal'.
- **Expected:** A real button with a bigger target.
- **Workaround used:** Clicked exactly on the small words.
- **Checked against the code:** exists, effort S, `viewer.js:renderTracker (counterRow note), rollable`. The roll is there: the faint 'roll d6 +1' inside the 'Hit dice' row note is a rollable span (counterRow note = rollable('hitdie|…') + ', then Heal'). Only those words respond, and they look like helper text. Make it a real button, and give rollables a bigger target on touch screens.
- **Resolution:** Rolls inside counter notes (hit die, Second Wind) are styled as accent-coloured links with a bigger target. (`3103be9`)

<a id="w-115"></a>
#### W-115 Healing at or near full HP wastes a hit die or a medpac without warning

**fixed** · high · improvement · reported by Priya, Sam, Tomas ([Priya-A19](panel/2026-10-17/priya-a.md), [Sam-A43](panel/2026-10-17/sam-a.md), [Tomas-A18](panel/2026-10-17/tomas-a.md), [Sam-A38](panel/2026-10-17/sam-a.md))

> When I'm at or near full HP, I want to see how many HP I'm missing before I roll a hit die or use a medpac, and be warned (or not charged) when little or nothing would be healed, so that I don't waste my only hit die or a 300 cr medpac.

- **What they saw:** Priya rolled her hit die at 11/12 (4 + 2 = 6) and pressed 'Heal 6 and spend the d10'. The badge said '✓ Healed 6, spent the die' → 12/12, so only 1 HP was restored, and hit dice went to 0/1. Sam, at 14/14, was offered 'Heal 6 and spend the d12'. Tomas used Medpac > On me at 14/14: it rolled 1 + 3 = 4, said 'At full hit points: nothing to heal.', and still consumed the medpac (2 → 1). Sam's medpac at 11/14: '✓ Healed 3 (of 12; at maximum)'.
- **To reproduce:** At full HP or 1 HP down: roll a hit die and Heal, or use a Medpac on yourself.
- **Expected:** 'N HP missing' shown before rolling. 'Healed 1 (of 6)' afterwards. Disabled or confirmed at full HP, with no consumption when nothing is healed, and a confirmation before spending the last die for a tiny heal.
- **Workaround used:** Didn't press Heal at full HP.
- **Checked against the code:** bug-confirmed, effort S, `roller.js:applyButtons, applyRoll; viewer.js:applyTrackerAction('hdheal'), useItem`. applyButtons offers 'Heal N and spend the dX' at any HP. 'hdheal' spends the die even when no HP is restored, and the badge says 'Healed {total}', not what was actually healed (Priya: 1 of 6). Medpacs are used up on Use by design (open-decisions #23: 'The item is used up when you press Use, whether or not you then press Heal'); applyButtons says 'At full hit points' only afterwards. Fix: show the HP missing before Use or Roll, disable or confirm at full HP, and report the actual amount healed.
- **Resolution:** A hit die at full HP isn't offered ('nothing to heal; the die isn't spent'); near full it says 'Heal 1 (of 6)' and the badge reports what was healed; Use → 'On me' says how many HP are missing and is off at full HP (decision 28). (`3103be9`)

<a id="w-116"></a>
#### W-116 Short rest doesn't offer Force Recovery

**fixed** · high · missing · reported by Mira ([Mira-A36](panel/2026-10-17/mira-a.md))

> When I finish a short rest with force points spent, I want the sheet to offer Force Recovery (half consular level + Wis or Cha mod, minimum 1) and add the points, so that I don't do it by hand.

- **What they saw:** At FP 6/8 with Force Recovery 1/1, Short rest said: 'Nothing to regain on a short rest. To heal, roll hit dice ('roll d…' in the tracker).' Spending the Force Recovery counter (1 → 0) didn't add any FP. The feature text: 'When you finish a short rest, you can regain a number of force points equal to half your consular level + your Wisdom or Charisma modifier (your choice, minimum of one).'
- **To reproduce:** A Consular with spent FP and Force Recovery available > Short rest.
- **Expected:** 'Use Force Recovery: +4 FP (0 + Wis 4)?'. Spending the use adds the FP.
- **Workaround used:** Force Recovery −, then Force points + twice (6 → 8).
- **Checked against the code:** missing, effort S, `viewer.js:applyTrackerAction('short'), trackerAction`. A short rest resets only tech points, superiority dice and short-rest uses. Force Recovery is just a counter, and spending it adds nothing. Rules text: 'regain a number of force points equal to half your consular level + your Wisdom or Charisma modifier (your choice, minimum of one)'. On a short rest with FP spent, offer 'Use Force Recovery: +N FP', which spends the use and gives back the points.
- **Resolution:** After a short rest, features that give points back are offered: 'Use Force Recovery (+6 force points)' (decision 27). (`3103be9`)

<a id="w-117"></a>
#### W-117 Short rest doesn't offer to spend hit dice

**fixed** · medium · improvement · reported by Jun, Sam ([Jun-A43](panel/2026-10-17/jun-a.md), [Sam-A44](panel/2026-10-17/sam-a.md))

> When I take a short rest while hurt, I want it to ask 'Spend hit dice? (1 left, d12+2) [Roll]', so that a new player doesn't miss healing on a rest.

- **What they saw:** Short rest says 'Nothing to regain on a short rest. To heal, roll hit dice ('roll d…' in the tracker).' (Sam). The button only restores points and uses; spending hit dice is a separate row ('Hit dice (d8) roll d8 +2, then Heal') (Jun). Jun rated it low, Sam medium.
- **To reproduce:** Take damage, then press Short rest.
- **Expected:** Inline hit-dice spending in the rest flow when HP is below max.
- **Workaround used:** Used the 'roll d… ' text on the hit-dice row.
- **Checked against the code:** missing, effort S, `viewer.js:trackerAction('short')`. A short rest only prints 'To heal, roll hit dice ("roll d…" in the tracker)'. When HP is below maximum and hit dice are left, offer an inline 'Spend a hit die? (n left, dX+Con) [Roll]' in the rest message or tracker.
- **Resolution:** After a short rest with HP missing, the message offers 'Roll a hit die (d8)'. (`3103be9`)

<a id="w-118"></a>
#### W-118 Frenzied Approach: a long rest should remove 2 exhaustion, not 1

**fixed** · medium · rules · reported by Sam ([Sam-B17](panel/2026-10-17/sam-b.md))

> When a feature changes the rest rules (Frenzied: a long rest removes 2 exhaustion), I want the Long rest button to apply it and say so, so that I don't carry extra exhaustion.

- **What they saw:** Exhaustion 2 → Long rest → 'Long rest: regained one level of exhaustion gone.' → 1. Frenzy: 'When you finish a long rest, you reduce your exhaustion level by 2, instead of 1.' The Long rest tooltip also says 'exhaustion −1'.
- **To reproduce:** Frenzied Approach, exhaustion 2, Long rest.
- **Expected:** Exhaustion 2 → 0, with the message citing Frenzy.
- **Workaround used:** Lowered exhaustion with − by hand.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:applyTrackerAction('long'), renderTracker (Long rest title)`. The long rest hard-codes exhaustion − 1, and the button tooltip says 'exhaustion −1'. Frenzied Approach's text in SW5E's rules ('When you finish a long rest, you reduce your exhaustion level by 2, instead of 1. Additionally, any effect that removes exhaustion reduces your exhaustion by 1 additional level') is never read. Read it from the archetype and name Frenzy in the rest message.
- **Resolution:** A long rest removes what a feature says (Frenzy: two levels), named in the message and the button's tooltip. (`3103be9`)

<a id="w-119"></a>
#### W-119 Long rest message reads oddly when only exhaustion changes

**fixed** · low · confusing · reported by Sam ([Sam-B23](panel/2026-10-17/sam-b.md))

> When only exhaustion changes on a rest, I want a clear sentence, so that the message reads right.

- **What they saw:** 'Long rest: regained one level of exhaustion gone.'
- **To reproduce:** At full HP and uses, with exhaustion 2, take a long rest.
- **Expected:** 'Long rest: one level of exhaustion gone (nothing else to regain).'
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:restGains`. restGains puts 'regained ' in front of everything, and the exhaustion entry is 'one level of exhaustion gone', which gives 'Long rest: regained one level of exhaustion gone.' Keep the exhaustion clause outside the 'regained' list.
- **Resolution:** 'Long rest: regained 10 HP; 2 levels of exhaustion gone (Frenzy).' (`3103be9`)

<a id="phone-tablet"></a>
### Phone and tablet

<a id="w-120"></a>
#### W-120 Phone page scrolls sideways: the long tool-proficiency chip doesn't wrap

**fixed** · medium · bug · reported by Mira ([Mira-B20](panel/2026-10-17/mira-b.md))

> When I use the sheet on a 390 px phone, I want the page never to scroll horizontally, so that it doesn't wobble when I swipe.

- **What they saw:** In /dev/phone.html?w=390&h=844 there's a horizontal scrollbar under the frame. The viewer document is 554 px wide in a 375 px viewport (scrollWidth 554, clientWidth 375). The culprit is span.chip.rollable 'Two of your choice of artisan's implements, gaming sets, or musical instruments' in Proficiencies & Languages (left 114, right 554), which no overflow container clips. Jun's layout never overflowed at 390 px, but his tool text was the short 'One of your choice'.
- **To reproduce:** Open the phone frame on a character whose background tool is the 'Two of your choice…' sentence (e.g. Force Adept) and check the document's scrollWidth.
- **Expected:** Chips wrap (white-space: normal, max-width: 100%), and the sentence becomes a picker (W-025).
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.css:173,184; viewer.js:renderProficiencies (toolChip)`. .chip is white-space: nowrap. The wrapping rule `:is(.chips, …) > .chip` doesn't reach tool chips, because renderProficiencies nests them as .chips > span.rollable > span.chip. A long tool sentence therefore can't wrap and widens the page. Fix the selector (also cover .rollable > .chip). The tool picker is W-025.
- **Resolution:** Tool chips inside a rollable wrap; no sideways scroll at 390 px. (`3103be9`)

<a id="w-121"></a>
#### W-121 AC disappears from the phone strip while a state is active

**decided** · medium · improvement · reported by Jun ([Jun-A20](panel/2026-10-17/jun-a.md))

> When I'm concentrating or in a state during a fight, I want my AC to stay in the pinned strip, so that I can answer 'does 14 hit?' without scrolling.

- **What they saw:** Without a state the strip shows '♥ 10/10 AC 13'. With Target Lock active it shows '♥ 10/10 ● Target Lock', and AC is gone.
- **To reproduce:** Cast Target Lock on the phone.
- **Expected:** HP, AC and the state chip all visible (e.g. smaller chip text).
- **Workaround used:** Scrolled to Combat.
- **Checked against the code:** needs-decision, effort S, `viewer.css:565; viewer.js:renderMiniVitals`. Deliberate. viewer.css hides AC when something is active: `@media (max-width: 430px) { .mvitals:has(.mstate) .ac { display: none; } }`, with the comment 'Something active: it takes the AC's place on phones'. Options: keep it; shrink the state chip (an icon or a few letters) and keep AC; or put AC and HP on a second line.
- **Resolution:** Kept (a state takes AC's place on phones); Inspiration now shows as a ★ next to HP. (`3103be9`)

<a id="w-122"></a>
#### W-122 Conditions don't appear in the phone strip

**fixed** · medium · improvement · reported by Jun ([Jun-B19](panel/2026-10-17/jun-b.md))

> When I'm Poisoned, I want a chip in the pinned strip, as concentration has, so that I see it on every screen.

- **What they saw:** With Poisoned in Conditions (loaded from sw5e.com), the strip showed only '♥ 11/24 ● Target Lock'. Exhaustion and Inspiration have no strip chip either (W-063, W-097).
- **To reproduce:** Have a condition active on the phone and look at the strip.
- **Expected:** A '● Poisoned' chip that jumps to Conditions.
- **Workaround used:** Remembered it.
- **Checked against the code:** missing, effort S, `viewer.js:renderMiniVitals`. The strip lists only temporary effects. SW5E conditions (c.conditions), exhaustion and Inspiration never reach it. Add chips that link to Conditions in Combat & Vitals.
- **Resolution:** The phone strip shows conditions first (red), then states; the desktop summary lists them too. (`3d97d86`)

<a id="w-123"></a>
#### W-123 Phone notice covers HP and the filter while syncing

**fixed** · low · improvement · reported by Mira ([Mira-B29](panel/2026-10-17/mira-b.md))

> When I sync from my phone, I want the status notice not to cover my HP and the filter, so that I can keep playing.

- **What they saw:** After tapping Sync to SW5E in the phone banner, the notice 'Opening sw5e.com in a background tab…' sat over the strip (♥ HP, 🔍, 🎲) for about 5 s, followed by 'Recalculating with your active effects…'.
- **To reproduce:** In the 390 px frame, change HP and tap Sync to SW5E.
- **Expected:** The notice below the strip, or smaller, never hiding HP.
- **Workaround used:** Waited.
- **Checked against the code:** bug-confirmed, effort S, `viewer.css (≤900px .status)`. On phones the toast is fixed at top: calc(var(--navbar-h) + 8px), which assumes the strip is pinned at the very top. At the top of the page, where the 'Sync to SW5E' banner is tapped, the top bar (position: static) sits above the strip, so the toast lands on the strip and covers HP, 🔍 and 🎲. Position it from the strip's actual bottom edge, or at the bottom of the screen.
- **Resolution:** On phones the notice is placed under the strip's current position, so it never covers HP, 🔍 or 🎲. (`3103be9`)

<a id="w-124"></a>
#### W-124 Class table scrolls sideways on the phone

**fixed** · low · improvement · reported by Jun ([Jun-A38](panel/2026-10-17/jun-a.md))

> When I check my class table on my phone, I want it as a list, so that I don't swipe sideways inside a card.

- **What they saw:** Classes card → Class table: 'PROFICIENCY BONUS | FEATURES | TECH…' is cut off at the right edge with a horizontal scrollbar. The README says 'tables turn into lists' on phones.
- **To reproduce:** Phone frame → Classes & Progression → Class table.
- **Expected:** A list layout ('Now (1): +2 · Techcasting, Potent Aptitude · 6 powers · 2 points…').
- **Workaround used:** Swiped inside the card.
- **Checked against the code:** partial, effort S, `viewer.css (≤560px rules); viewer.js:renderClasses`. Only table.inv and table.tweaks become lists on phones. The Class table in renderClasses is a plain <table> in .table-wrap, so it scrolls sideways; the README's 'tables turn into lists' overstates it. Give it a stacked 'Now (n): … / Next (n+1): …' layout.
- **Resolution:** On phones the class table is a list: each column with this level's value → the next level's. (`74a4667`)

<a id="w-125"></a>
#### W-125 Tracker −/+ buttons too small on the phone

**fixed** · low · improvement · reported by Jun ([Jun-A39](panel/2026-10-17/jun-a.md))

> When I adjust tech points or uses mid-fight, I want thumb-sized buttons, so that I don't mis-tap.

- **What they saw:** The play tracker's −/+ buttons for tech points, hit dice, Potent Aptitude and Repair Droid are about 26 × 22 px in the 390 px frame.
- **To reproduce:** Phone frame → Combat → Play tracker.
- **Expected:** Tap targets of about 44 px.
- **Workaround used:** Tapped carefully.
- **Checked against the code:** partial, effort S, `viewer.css (@media pointer: coarse)`. On real touch screens the tracker buttons are already about 40×32 px (.btn.sm min-height 32px; .trk-btns .btn min-width 40px). The dev phone frame runs with a mouse pointer, so it shows the desktop size (about 26×22). That is still below 44 px: raise .trk-btns .btn (and the death-save dots and hit-die roll) for coarse pointers.
- **Resolution:** At 600 px or less (the phone frame too), the tracker's −/+ buttons are at least 40 × 34 px. (`dad1b17`)

<a id="navigation-layout"></a>
### Navigation and layout

<a id="w-126"></a>
#### W-126 Re-renders and notices shift the layout: clicks are lost or hit the wrong button

**fixed** · blocker · bug · reported by Mira, Tomas, Jun, Priya ([Mira-B13](panel/2026-10-17/mira-b.md), [Tomas-B3](panel/2026-10-17/tomas-b.md), [Jun-A18](panel/2026-10-17/jun-a.md), [Jun-B20](panel/2026-10-17/jun-b.md), [Priya-A43](panel/2026-10-17/priya-a.md), [Priya-A44](panel/2026-10-17/priya-a.md))

> When I click or tap right after a change (while the sheet recalculates, or as a notice appears or fades), I want the click to land on what I aimed at, or be ignored with a visible busy state, so that I don't miss a rest, end the wrong effect or silently change my inventory.

- **What they saw:** Tomas (high): he clicked the Medpac row's 'Use' during a recalculation ('Opening sw5e.com in a background tab…' after ending Poison), and the click landed on '+' because the row had been redrawn. Medpac went 1 → 2 (a free 300 cr item) and weight 0.5 → 1 lb, with no toast and no undo; he only noticed because he zoomed in.

Mira: her first click on Long rest just after 'Recalculated with your changes · 16:02:43' only focused the button (HP stayed 1/17). A click on Load from SW5E was lost the same way earlier.

Jun (phone): after Personality → Done, a recalculation moved the page about 80 px before his tap on Notes Edit. In part B, when 'Down to 0 hit points: roll death saves…' faded, the tracker moved up about 40 px and his tap on death-save 'Roll' landed on 'Temp HP'.

Priya (tablet): Heal, then End on Soresu Form; the first tap was lost. After each item Add, a 'TOTALS — AC, attacks and other numbers update when SW5E recalculates with your changes' card appeared, pushed 'Items' to a second row, then disappeared; it happened again in part B on +400 cr.
- **To reproduce:** Change something that triggers a recalculation (end an effect, add an item, edit XP), then within a second or two click an inventory row's Use/−/+, Long rest or End.
- **Expected:** Don't move or replace buttons under the pointer during a re-render: keep each row and update it in place. Notices float over the content instead of pushing it. Briefly ignore clicks after a redraw, or show a busy state. A toast with Undo for quantity changes ('Medpac 1 → 2 · Undo').
- **Workaround used:** Took a fresh screenshot, clicked again and checked the toast. Tomas pressed − to give back the free medpac.
- **Checked against the code:** bug-confirmed, effort L, `viewer.js:renderAll, renderEquipment (m.stale 'Totals' stat), renderPending, anchorFor/restoreAnchor, inventoryAction('qty')`. Every change redraws the whole sheet (renderAll replaces #sheet innerHTML), and the layout changes during a recalculation. While numbers are stale, renderEquipment puts a 'Totals' card into the credits grid, which pushes 'Items' to a new row and the inventory down, then removes it. The 'Not synced' banner appears at the top. restoreAnchor keeps only the last-used control (from the last 4 s) or the top element in place, so other rows move under the pointer. There is no click guard or busy state, and inventory −/+ changes show no message or Undo. That explains the free medpac. Fix: give Totals a fixed slot outside the grid, update rows in place, briefly ignore clicks after a redraw, and add Undo toasts for inventory changes.
- **Resolution:** The sheet compares the control under the pointer before and after each redraw. A click is ignored only when a different control moved there in the last 0.7 s, and the sheet says so, keeping Undo. A click on the same button is no longer lost. Section jumps are instant, so nothing moves while you aim. (`74a4667`)

<a id="w-127"></a>
#### W-127 Action confirmations vanish or are replaced by the recalculation status

**fixed** · high · improvement · reported by Priya, Jun, Sam, Mira ([Priya-B17](panel/2026-10-17/priya-b.md), [Jun-B22](panel/2026-10-17/jun-b.md), [Sam-B13](panel/2026-10-17/sam-b.md), [Jun-A30](panel/2026-10-17/jun-a.md), [Mira-A33](panel/2026-10-17/mira-a.md), [Jun-A42](panel/2026-10-17/jun-a.md))

> When I buy something, change credits, rest or use a medpac on an ally, I want a confirmation I can read ('Bought 2 × Medpac for 100 cr', 'Used 1 Medpac on someone else (0 left) · Undo'), kept apart from the recalculation status, so that I know it worked without scrolling to check.

- **What they saw:** Medpac → Use → On someone else:
- Priya: the code's message ('Used Medpac on someone else. They regain one die the size of their Hit Die + their Constitution modifier…') was replaced within a second by 'Opening sw5e.com…' and then 'Recalculated with your changes · 18:05:50'.
- Jun: he saw only 'Opening sw5e.com…'.
- Sam: the Medical group simply disappeared, with no message and no Undo (18:46:59). He also wants the ally's healing roll (their Hit Die + Con) offered.
With the 🔍 filter on, the used-up row vanished, which looked like a jump (Jun, Priya).

Other actions:
- Buying with Pay showed only 'Opening sw5e.com…', and credits went to 0 silently (Jun).
- Credits '+150' + Enter emptied the box, but '0 cr' stayed for about 2 s (Mira).
- Short rest took tech points 2/6 → 6/6, but the notice was gone in about 2 s; Long rest showed only 'Long rest: done.' (Jun).
- **To reproduce:** Medpac → Use → On someone else, or buy an item with Pay ticked, and watch the status line.
- **Expected:** Action messages stay visible for a few seconds (until tapped on phones) or in a small message history, separate from the recalculation status: '+150 cr → 150 cr', '+4 tech points'. Undo where possible, and an optional healing roll for the ally.
- **Workaround used:** Scrolled to check credits or HP.
- **Checked against the code:** partial, effort M, `viewer.js:setStatus, recomputeDerived, scheduleRecompute, setEditedFields`. Each action does write a message ('Credits A → B cr', 'Added 2 × Medpac for … cr', 'Used Medpac on someone else. They regain …', short-rest gains). But there is only one status line: setEditedFields and item-state changes schedule a recalculation 1.2 s later, and recomputeDerived passes setStatus as onStatus. So 'Opening sw5e.com…' and then 'Recalculated with your changes · time' overwrite the action's message, and phone toasts last only 5 s. Needed: action messages kept apart from the recalculation status (or a short message history), Undo for item and credit changes, and an optional healing roll for the ally.
- **Resolution:** Notices stay 6 s, 10 s with a button (Undo) and 12 s for errors. Recent messages (More ▾, ☰ on phones) lists the last 15 with their times. Background recalculation messages don't replace an action's notice (W-020). (`74a4667`)

<a id="w-128"></a>
#### W-128 After removing or ending a row, the next row's button slides under the pointer

**fixed** · medium · bug · reported by Jun, Tomas, Priya ([Jun-B6](panel/2026-10-17/jun-b.md), [Tomas-B26](panel/2026-10-17/tomas-b.md), [Priya-B25](panel/2026-10-17/priya-b.md))

> When I remove a power or maneuver or end an effect, I want the next row's × or End not to land exactly under my mouse or thumb (or an Undo), so that a double click doesn't remove or end a second one.

- **What they saw:** After × on Haywire, Hologram's × moved to exactly where Jun had tapped, and after that Homing Rockets'. After Tomas removed a maneuver, the next maneuver's × slid under the mouse (seen 3 times). After End on Poison, the Strength Stim's End button moved under the pointer (Tomas, Priya). Forgetting a power can't be undone (Jun).
- **To reproduce:** Have two temporary effects or two picks, then End or × the first.
- **Expected:** A short click guard after removals, or rows that close up after a delay or with an animation. An Undo notice ('Forgot Haywire · Undo'), or 'End all expired'.
- **Workaround used:** Moved the pointer away before clicking again.
- **Checked against the code:** bug-confirmed, effort M, `viewer.js:removeClassPower, removeClassChoice, endEffect`. Forgetting a power, removing a choice and ending an effect all apply at once and redraw, so the next row's ×/End closes up under the pointer. There is no click guard and no Undo; only the inventory × asks first. The buttons also identify entries by list index (data-arg 'idx|field|i'), so a quick second click on a button that hasn't been redrawn yet can remove a different entry. Add a short guard, an Undo notice, and remove by name.
- **Resolution:** After removing a row or ending an effect, a quick second click on the next row's button (now under the pointer) is ignored with a message, and Undo stays. The same guard as W-126. (`74a4667`)

<a id="w-129"></a>
#### W-129 Raw data shown on cards (Chosen ASI JSON, background tables as Markdown)

**fixed** · medium · bug · reported by Tomas, Jun, Priya ([Tomas-A29](panel/2026-10-17/tomas-a.md), [Jun-A37](panel/2026-10-17/jun-a.md), [Priya-A30](panel/2026-10-17/priya-a.md))

> When I read my species and background cards, I want plain text and rendered tables, so that the sheet looks finished and I can use the tables.

- **What they saw:** The Species card shows 'Chosen ASI {"Dexterity":1}' (Tomas) and 'Chosen ASI {"Strength":1}' (Priya). Background tables appear as raw Markdown: Soldier's Specialty 'Roll a d8… |d8|Specialty| |:---:|:----------:| |1|Officer| …' (Tomas), Scientist's Field of Research '| d8 | Field of Research | |:-----:|:----------| | 1 | Biology | | 2 | Artificial Intelligence | …' (Jun).
- **To reproduce:** Load a Zabrak Soldier or a Scientist and open Species and Background.
- **Expected:** 'Chosen increase: Dexterity +1', and rendered d8 tables (maybe with a picker that stores the choice).
- **Workaround used:** None.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderSpecies, renderBackground; md.js:mdInline`. renderSpecies prints 'Chosen ASI' with JSON.stringify(asi). renderBackground renders the background's table field (ref.flavorDescription) with mdInline, which has no table support (md() has it), so '|d8|Specialty|…' stays raw. Use md() and format the increase ('Dexterity +1'). A picker that stores the rolled or chosen entry would be a follow-up.
- **Resolution:** 'Chosen increase: Dexterity +1'; background fields with Markdown tables are rendered as tables. (`3103be9`)

<a id="w-130"></a>
#### W-130 Section strip on phone/tablet: too few pills, wrong highlight, scrolls under the finger

**fixed** · medium · improvement · reported by Jun, Priya ([Jun-A19](panel/2026-10-17/jun-a.md), [Priya-A34](panel/2026-10-17/priya-a.md))

> When I jump between sections on a phone or tablet, I want a fast way to reach any section, a highlight that matches what's on screen, and a strip that doesn't slide sideways just before I tap, so that I don't swipe a dozen times per fight or land on the wrong section.

- **What they saw:** Jun (390 px): only 2–3 pills fit between the '♥ 10/10 AC 13' chip and 🔍/🎲, and only one ('Overview') while a state chip like '● Target Lock' shows. He swiped the strip about 15 times in session 1, and jumping to Skills highlighted 'Abilities'. Priya (tablet): Skills on screen but 'Abilities' highlighted, Personality on screen but 'Equipment'. The strip auto-scrolls sideways as the page moves, so a tap aimed at 'Combat' landed on 'Background'. Jun rated it medium, Priya low.
- **To reproduce:** Phone frame 390×844 or tablet 800×1000: scroll the page and try to go from Notes to Skills to Equipment to Tech.
- **Expected:** A '☰ sections' menu or a second row. The highlight matches the section on screen. No sideways jump just before a tap.
- **Workaround used:** Swiping the strip. The HP chip jumps to Combat. Checking again before each tap.
- **Checked against the code:** partial, effort M, `viewer.js:setupScrollSpy, renderSidebar; viewer.css (≤900px .side-nav)`. The strip exists as horizontally scrolling pills; there is no sections menu. setupScrollSpy highlights the first section that reaches into a band from 70 px below the top to 45% of the screen height, so the section above the one on screen can stay highlighted. Each time the highlight changes, it smooth-scrolls the strip sideways (strip.scrollTo), moving the pills under the finger. Fix: add a ☰ sections menu, choose the section at the strip's bottom edge, and don't auto-scroll the strip while a touch is in progress.
- **Resolution:** ☰ in the strip lists every section (one tap, no swiping). The highlight is the section at the reading line, or the one jumped to. The strip doesn't slide sideways within 2 s of touching it, and moves without animation. (`74a4667`)

<a id="w-131"></a>
#### W-131 Concentration chip in the desktop summary isn't clickable

**fixed** · low · improvement · reported by Mira ([Mira-A17](panel/2026-10-17/mira-a.md))

> When I see 'Guidance (concentration)' in the summary on desktop, I want clicking it to jump to the effect and its End button, so that I can end it quickly.

- **What they saw:** Clicking the green 'Guidance (concentration)' chip in the desktop summary did nothing, though the README says the phone strip's chip jumps to Effects. The sidebar jump also scrolls smoothly, so her first End click landed while the page was still moving (see W-134).
- **To reproduce:** Cast a concentration power on desktop and click the summary chip.
- **Expected:** Jump to the effect with its End button.
- **Workaround used:** Combat & Vitals > Effects > End.
- **Checked against the code:** missing, effort S, `viewer.js:renderSideSummary`. The desktop summary renders active effects as plain chip() spans. Only the phone strip (renderMiniVitals) makes it a link to #effects. Make the summary chips links to the effect and its End button.
- **Resolution:** Active effects in the desktop summary link to Effects. (`3103be9`)

<a id="w-132"></a>
#### W-132 Sidebar 'Overview' jump scrolls past the 'Not synced' banner

**fixed** · low · confusing · reported by Mira ([Mira-B28](panel/2026-10-17/mira-b.md))

> When I jump to Overview, I want to see the 'Not synced to SW5E: …' banner, so that I notice unsynced class choices before levelling on the site.

- **What they saw:** Clicking Overview in the sidebar puts the Overview card at the top. The banner 'Not synced to SW5E: Class choices, Feature notes, Inventory, Credits, XP · Sync to SW5E · Revert to SW5E's copy' sits above it and is only visible after scrolling up by hand. It matters because unsynced class choices freeze the class level (W-011).
- **To reproduce:** Make any change, then click Overview in the sidebar.
- **Expected:** The jump includes the banner, or the banner is sticky or shown in the summary.
- **Workaround used:** Scrolled to the very top.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderAll (banners before sections), renderSidebar`. The 'Not synced to SW5E' banner is drawn above the first section, and the Overview link targets #sec-overview, so the jump scrolls past the banner. Move the banner into Overview, make it sticky, or point the Overview link at the top of the sheet.
- **Resolution:** The 'not synced' banner is part of the Overview section, so jumping to Overview shows it. (`3103be9`)

<a id="w-133"></a>
#### W-133 Filter leaves empty group headers and always shows the Settings card

**fixed** · low · improvement · reported by Priya ([Priya-A45](panel/2026-10-17/priya-a.md), [Priya-B24](panel/2026-10-17/priya-b.md))

> When I filter for one thing ('Medpac', 'Mynock', 'Lightsaber'), I want only matching groups shown, so that the results fit on screen and the counts make sense.

- **What they saw:** Filter 'Medpac' still showed 'Weapon (2)', 'Armor (2)', 'Clothing (1)'… with column headers and no rows. In part B it happened in Class features too: 'Mynock' left 'Guardian (6)', 'Guardian: Guardian Auras (1)', 'Fighting styles (1)', 'Lightsaber forms (2)' with no rows. The Settings, Tweaks & Data card stays under every filter; on the phone, 'Lightsaber' put it below the results. Jun found the collapsed headers acceptable.
- **To reproduce:** 🔍 'Medpac' or 'Mynock'.
- **Expected:** Hide groups with no matching rows, and hide the Settings card unless it matches.
- **Workaround used:** Scrolled past them.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:applyFilter, visibleText, FILTER_UNITS, renderData`. applyFilter hides only the listed units (.card, tbody tr…). Group <h3> headings and table heads aren't among them, so empty groups keep their headers. The Settings section never disappears because renderData includes the raw and computed character JSON in <details>. visibleText reads closed details too, and that JSON contains every item and feature name, so any query matches. Fix: hide headers whose table has no visible rows, and skip pre.json in visibleText.
- **Resolution:** Headings of groups left empty by the filter are hidden, and the raw JSON is no longer searched, so Settings only shows when it matches. (`3103be9`)

<a id="w-134"></a>
#### W-134 First click right after a sidebar jump is ignored

**fixed** · low · bug · reported by Tomas, Sam ([Tomas-A38](panel/2026-10-17/tomas-a.md), [Sam-A32](panel/2026-10-17/sam-a.md))

> When I jump to a section and click a button, I want the click to work the first time, so that I don't double-click things like rests mid-fight.

- **What they saw:** Tomas: right after jumping to Combat & Vitals, the first click on Short rest did nothing and the second worked. The same happened with the Stealth row after jumping to Skills (the page was still scrolling), and again in part B on Blaster rifle '+5'. Sam: right after Notes → Done, clicking 'Combat & Vitals' in the side list changed the URL to #sec-combat but the page stayed at Notes; the second click scrolled.
- **To reproduce:** Click a sidebar entry, then immediately click a button in that section. Or save a form and then click a side-list entry.
- **Expected:** Clicks land on what's under the pointer (shorter or no smooth scroll), and the side list scrolls on the first click.
- **Workaround used:** Clicked twice.
- **Checked against the code:** bug-plausible, effort S, `viewer.css:49 (html scroll-behavior: smooth); viewer.js:restoreAnchor, recomputeDerived`. Sidebar jumps scroll smoothly. A click made while the page is still moving can press on one element and release over another, and the browser then sends no click (Tomas's 'first click does nothing'). A redraw that finishes during the jump (for example the recalculation after Notes → Done, whose restoreAnchor calls scrollBy instantly) can stop the smooth scroll, which fits Sam's '#sec-combat in the URL but the page stayed'. To check: turn off smooth scrolling for sidebar jumps and retest; skip restoreAnchor while a jump is under way.
- **Resolution:** Section jumps are instant (no smooth scroll that a click could land in), and a background redraw no longer swallows a click on the same button. (`74a4667`)

<a id="w-135"></a>
#### W-135 The app icon looks like a ☰ menu button on the phone

**fixed** · low · confusing · reported by Jun ([Jun-B9](panel/2026-10-17/jun-b.md))

> When I see the striped orange icon at the top left of the phone layout, I want it either to be a sections menu or not to look like one, so that I don't tap it expecting navigation.

- **What they saw:** He tapped it and nothing happened; it's <img src='icons/icon32.png'>.
- **To reproduce:** Phone frame: tap the icon at the top left.
- **Expected:** Make it the sections menu (W-130) or restyle it.
- **Workaround used:** None.
- **Checked against the code:** needs-decision, effort S, `viewer.html (.brand img)`. The icon is a plain <img> (icons/icon32.png), not a control. Options: make it the sections menu (W-130), or restyle or hide it on phones so it doesn't look like ☰.
- **Resolution:** Decided (decision 102, to confirm): on phones and tablets, where the strip's ☰ is the real menu, the app icon is hidden; wider screens keep it. (`679e2ef`)

<a id="w-136"></a>
#### W-136 More ▾ scrolls away on the phone

**fixed** · low · improvement · reported by Jun ([Jun-B10](panel/2026-10-17/jun-b.md))

> When I need Load from SW5E or Export mid-session, I want More ▾ reachable without scrolling to the very top, so that a mis-tap doesn't open something else.

- **What they saw:** Only the strip is pinned; More ▾ scrolls off with the header. His scroll-up didn't reach the top, and his 'More' tap landed on the Insight row and opened the dice dock. Later, the first tap on More ▾ after scrolling up twice did nothing and the second opened it. He needed More ▾ repeatedly mid-fight for the Poisoned workaround (W-062).
- **To reproduce:** Phone frame: scroll down, then try to reach More ▾.
- **Expected:** More ▾ in the pinned strip, or a ⋯ next to 🎲.
- **Workaround used:** Scrolled to the very top first.
- **Checked against the code:** missing, effort S, `viewer.css (≤900px .topbar position: static); viewer.js:renderSidebar`. More ▾ is in the top bar, which scrolls away on phones and tablets; the pinned strip has only 🔍 and 🎲. Add a ⋯ button to the strip that opens the same menu.
- **Resolution:** ☰ in the pinned strip has Load from SW5E, Import, New character, Recent messages, Export all, Compact cards and the theme. (`74a4667`)

<a id="data-backup"></a>
### Data and backups

<a id="w-137"></a>
#### W-137 Restore a version from the local version history

**fixed** · medium · improvement · reported by Jun ([Jun-B32](panel/2026-10-17/jun-b.md))

> When a Load or Sync goes wrong (as level 3 did), I want 'Restore this version' with a comparison, so that I can undo it without files or code.

- **What they saw:** Settings > Local version history ('8 / 25') lists versions such as '17:08:44 Loaded from SW5E' and '17:39:05 Synced to SW5E', each with only 'Export'. When level 3 was undone in B1 (W-011), there was no way back inside the sheet to the 17:08:44 version that had Engineer 3. 'Last full backup: today' doesn't say which characters, or who exported it. Jun couldn't export a backup himself, because a download needs the user's OK.
- **To reproduce:** Settings, Tweaks & Data → Local version history.
- **Expected:** Restore and Compare for each version. The backup line names the characters and the time.
- **Workaround used:** javascript_tool (see W-011).
- **Checked against the code:** missing, effort M, `viewer.js:renderHistoryCard, handleAction('export-version')`. Each version in the history has only Export, which downloads that version's raw data. Add Restore (taken in as the current copy and recorded as a new history entry) and Compare (a diff against the current copy). The 'Last full backup' line could also name the characters and the time.
- **Resolution:** Each version in Local version history has Compare (what differs from the character now: 'Classes: Fighter 2 / Operative 1 → Fighter 3 (Assault Specialist) / Operative 1', 'Credits: 100 → 450', items added or removed…) and Restore (the version's fields become local changes, play state stays, Undo puts it back, Sync sends it). The backup line names this character's last backup and the last full backup with its time and number of characters. (`679e2ef`)

<a id="w-138"></a>
#### W-138 Backup: 'Export all' includes everyone's characters; no per-character backup named as such

**fixed** · low · improvement · reported by Tomas, Priya ([Tomas-B30](panel/2026-10-17/tomas-b.md), [Priya-B32](panel/2026-10-17/priya-b.md))

> When I back up my character, I want a clearly named 'Back up this character' (snapshot, edits, history, reasons, play state) and labels that say what each export contains, so that I don't save or hand around other players' characters and a 1 MB file.

- **What they saw:** Tomas ran More ▾ → Export all (backup): 'Exported a backup of 12 characters.', file 'sw5e-sheet-backup-2026-10-17 1651.json', 1.15 MB, including other players' characters and the owner's. More ▾ also has 'Export SW5E character (.json)' and 'Export sheet snapshot (.json)'. Neither is called a backup, and neither player was sure the snapshot includes edits and history. Priya read in the code that 'Export all' writes every snapshot, tracker, edit and history in the browser; she didn't run it.
- **To reproduce:** More ▾ → look at the three export options.
- **Expected:** 'Back up this character' next to 'Export all', plus clear labels for each export.
- **Workaround used:** Export all.
- **Checked against the code:** missing, effort S, `viewer.js:exportBackup, handleAction('export-raw'/'export-snapshot'); viewer.html menu`. 'Export SW5E character' is SW5E's data with the local edits, but without reasons, effects, play state or history. 'Export sheet snapshot' is only the snapshot: SW5E's copy plus the computed numbers, with none of the local edits, play state, reasons or history. The players were right to doubt it. 'Export all (backup)' writes everything for every character. Add 'Back up this character' (exportBackup limited to one character) and labels that say what each export contains.
- **Resolution:** More ▾ has 'Back up this character' (its data and changes, play state, reasons, effects, history and recent rolls, in a file named after it) and 'Back up all characters'; the other exports are now 'Export for sw5e.com' and 'Export SW5E's copy with its numbers', each with a hover saying what it holds. Importing a character backup restores it. (`679e2ef`)

<a id="w-139"></a>
#### W-139 'Last full backup: never' not refreshed after an export

**fixed** · low · bug · reported by Tomas ([Tomas-B31](panel/2026-10-17/tomas-b.md))

> When I export a backup, I want the Settings card to say 'today' right away, so that I trust the backup happened.

- **What they saw:** Right after 'Exported a backup of 12 characters.', the Settings → Local version history card still said 'Last full backup: never', although state.lastBackup was set. A freshly loaded viewer (the phone frame) said 'today'.
- **To reproduce:** More ▾ → Export all (backup) → look at Settings, Tweaks & Data → Local version history.
- **Expected:** Redraw the card after the export.
- **Workaround used:** Reload.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:exportBackup, renderHistoryCard, wireUi onChanged`. exportBackup sets state.lastBackup and saves it, but the save carries this page's writer stamp, so the onChanged listener ignores it, and nothing redraws the history card. Redraw after the export (refreshTracked or renderAll).
- **Resolution:** The sheet redraws after an export, so 'Last full backup' updates. (`3103be9`)

<a id="rules-accuracy"></a>
### Rules accuracy

<a id="w-140"></a>
#### W-140 Species traits that grant or let you choose a skill or tool proficiency aren't applied

**fixed** · blocker · bug · reported by Priya, Tomas, Sam ([Priya-A3](panel/2026-10-17/priya-a.md), [Tomas-A2](panel/2026-10-17/tomas-a.md), [Sam-A7](panel/2026-10-17/sam-a.md))

> When my species grants a skill or tool proficiency (Togruta Wild Hunters: Survival; Wookiee Menacing: Intimidation) or lets me choose one (Zabrak Coercive: Persuasion or Intimidation; Crafters: one artisan's implements), I want it applied, with a picker for the choice, so that my skills are right without tweaks.

- **What they saw:** Priya: 'Wild Hunters. You have proficiency in the Survival skill.', but Survival is +2 and not proficient (it should be +4), on sw5e.com too. The viewer does read Montral Reception (Tremorsense 30 ft) from trait text, just not this skill.

Tomas: the Coercive and Crafters cards have an orange 'Your choices' box. He typed 'Persuasion' and 'Tinker's implements' and the sheet recalculated (13:01:12), but Persuasion stayed +1 and no tool appeared. The README says notes in a feature's 'Your choices' apply proficiencies, but that doesn't work for species traits. The builder only asks for the species +1 ability.

Sam (umbrella wish): sw5e.com's sheet misses Wookiee Hide AC (11 vs 14), Brawny Str (17 vs 18) and Athletics, Menacing's Intimidation (+0) and Claws (unarmed '+5 4 Kinetic' instead of 1d4+3). The extension should fill in what the engine misses. Details are tracked in W-026, W-144 and W-147.
- **To reproduce:** Load a Togruta (Survival) or Wookiee (Intimidation). On a Zabrak, type 'Persuasion' into Coercive's 'Your choices' and Tab away.
- **Expected:** Fixed species skill and tool proficiencies applied like class features. Species traits with a choice get a picker limited to the allowed options.
- **Workaround used:** Proficient tweaks with reasons; the tool in Notes.
- **Checked against the code:** bug-confirmed, effort M, `viewer.js:featureEffectsUncached, featureNoteBox; classes.js:clsFeatureEffects`. Species traits are never turned into effects: featureEffectsUncached covers class and archetype features and class options only. So the orange 'Your choices' box that featureNoteBox shows on Coercive and Crafters stores the note and does nothing. Even with a species pass, the proficiency parser only matches 'gain proficiency in/with…'. It misses 'You have proficiency in the Survival skill' (Wild Hunters, Menacing) and 'You have proficiency with Persuasion or Intimidation (your choice)' (Coercive). Needed: a species pass, 'have proficiency' patterns, and pickers limited to the allowed options.
- **Resolution:** Species traits' proficiencies apply ('You have proficiency in the Survival skill', Menacing, Pilot; Coercive and Crafters from the trait's notes). The umbrella's other parts are W-143, W-144, W-147, W-150 (decision 33). (`3103be9`)

<a id="w-141"></a>
#### W-141 Darkvision shows 'Normal', and Kel Dor necrotic resistance isn't shown

**fixed** · high · bug · reported by Mira, Tomas, Jun, Sam ([Mira-A9](panel/2026-10-17/mira-a.md), [Tomas-A9](panel/2026-10-17/tomas-a.md), [Jun-A12](panel/2026-10-17/jun-a.md), [Sam-A12](panel/2026-10-17/sam-a.md))

> When my species has darkvision or a resistance, I want Vision to say 'Darkvision 60 ft' and the resistance listed under defenses, so that I don't forget them in a dark hangar or a fight.

- **What they saw:** Combat & Vitals shows 'Vision: Normal' for a Kel Dor, a Zabrak, a Sullustan and a Wookiee. Their Darkvision traits read 'You can see in dim light within 60 feet of you as if it were bright light…', and sw5e.com's feature list also has DARKVISION. Mira found the cause in classes.js: the darkvision regex needs 'darkvision … 60 feet' in one sentence. The defenses parser skips any trait containing 'while', so the Kel Dor's 'Life in the Void. You have resistance to necrotic damage, and while exposed to the vacuum of space…' never shows either. Caveat: Tomas notes sw5e.com's Zabrak species page doesn't mention darkvision, although the character data has the trait. Priya's Togruta has the same data-only trait (W-153), so check which species really have darkvision.
- **To reproduce:** Load a Kel Dor, Sullustan or Wookiee and look at Combat & Vitals > Vision / Effects.
- **Expected:** 'Darkvision 60 ft' under Vision, and 'Resistance to necrotic damage' under defenses.
- **Workaround used:** Remembered them.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderCombat (Vision = c.vision), defensesOf; classes.js:clsFeatureEffects (darkvision regex, while/when filter)`. 'Vision' shows SW5E's c.vision, which says 'normal'. defensesOf does read species trait text, but the darkvision pattern needs the word 'darkvision', and the trait text says 'You can see in dim light within 60 feet…'; the word appears only in the trait name, which isn't passed. Defenses skip any sentence containing while/when/if, and Life in the Void's sentence has 'while exposed…', so the necrotic resistance is dropped too. Caveat: SW5E's species traits list Darkvision for Kel Dor, Sullustan and Wookiee but not Togruta or Zabrak, while its features data lists it for all five; base the fix on the species traits (see W-153).
- **Resolution:** Darkvision is read from the species trait ('see in dim light within 60 feet…') and shown under Senses and as Vision; 'resistance to necrotic damage, and while…' keeps the resistance. (`3103be9`)

<a id="w-142"></a>
#### W-142 Species languages missing (Kel Dor, Sullestese, Togruti, Shyriiwook)

**fixed** · high · bug · reported by Mira, Jun, Priya, Sam ([Mira-A8](panel/2026-10-17/mira-a.md), [Jun-A11](panel/2026-10-17/jun-a.md), [Priya-A25](panel/2026-10-17/priya-a.md), [Sam-A14](panel/2026-10-17/sam-a.md))

> When my species speaks its own language, I want it listed under Languages (Wookiee: Galactic Basic as understood only), so that the sheet is complete and I roleplay correctly.

- **What they saw:** Proficiencies & Languages lists only 'Galactic Basic' for each of these species:
- Kel Dor: 'You can speak, read, and write Galactic Basic and Kel Dor.'
- Sullustan: 'Galactic Basic, Sullestese, and one more language of your choice.'
- Togruta: 'Galactic Basic and Togruti'; the Jedi background adds 'Languages: One of your choice'.
- Wookiee: 'You can speak, read, and write Shyriiwook. You can understand spoken and written Galactic Basic, but your vocal cords do not allow you to speak it.'
Tomas saw Zabraki missing as well (W-025). There is no way to add a language. Jun and Priya rated it medium, Mira and Sam low.
- **To reproduce:** Load any of these species and open Proficiencies & Languages.
- **Expected:** Species languages listed automatically (Wookiee: Shyriiwook, with Galactic Basic marked understand-only), plus pickers for 'of your choice' (W-025).
- **Workaround used:** Written in Notes.
- **Checked against the code:** missing, effort M, `viewer.js:renderProficiencies, renderSpecies`. Languages come only from SW5E's c.languages (here only Galactic Basic) plus raw.customLanguages. The species language (ref.language: Kel Dor, Togruti, Shyriiwook…) appears only in the Species card's 'Language' line, and there is no way to add a language. Add species languages automatically (Wookiee: Galactic Basic marked understand-only) and pickers for 'of your choice' (W-025).
- **Resolution:** The species' language is filled in for SW5E's engine (it adds it only when recorded; created characters record it), and 'one more language of your choice' is a picker (decision 39). (`f7763e7`)

<a id="w-143"></a>
#### W-143 Zabrak Toughness (+1 HP per level) not applied; a flat tweak has to be re-edited every level

**fixed** · high · rules · reported by Tomas ([Tomas-A5](panel/2026-10-17/tomas-a.md), [Tomas-B8](panel/2026-10-17/tomas-b.md))

> When my species raises my HP maximum by 1 per level, I want it applied automatically, so that my HP is right now and after every level-up without editing a tweak.

- **What they saw:** Toughness says 'Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.' The builder and the sheet both show HP 13/13 at level 1 (10 + Con 3); it should be 14. The gap grows with each level: the site's HP was 30 at level 3 (should be 33) and 39 at level 4 (should be 43). Tomas edited his 'HP maximum' bonus tweak 1 → 3 → 4 by hand, and nothing reminded him, although the tweak's own reason says '+1 HP per level'.
- **To reproduce:** Build a Zabrak Fighter 1 with Con 16, level it up on sw5e.com, Load, and compare HP max with class HP + Con × level + level.
- **Expected:** Species traits that scale with level applied like class features, or a tweak that can scale with level.
- **Workaround used:** An 'HP maximum +N' tweak, edited after every level-up.
- **Checked against the code:** missing, effort M, `viewer.js:featureEffectsUncached; classes.js:clsFeatureEffects`. Neither SW5E's engine nor the sheet applies Toughness. Species traits aren't processed, the parser has no pattern for 'hit point maximum increases by 1 … every time you gain a level', and tweaks are flat numbers that don't scale with level. Add a level-scaled HP-maximum effect from species and feat text.
- **Resolution:** 'Your hit point maximum increases by 1, and it increases by 1 every time you gain a level' applies at the character's level (decision 40). (`5228760`)

<a id="w-144"></a>
#### W-144 AC ignores Wookiee Hide (14), and the sheet doesn't say which AC formula it used

**fixed** · high · bug · reported by Sam ([Sam-A10](panel/2026-10-17/sam-a.md), [Sam-A2](panel/2026-10-17/sam-a.md))

> When my species and my class both give an unarmored AC formula, I want AC to use the better one and the hover to list both and mark the one used, so that I trust my AC.

- **What they saw:** Wookiee Hide: 'While you are unarmored or wearing light armor, your AC is 13 + your Dexterity modifier'. Berserker Unarmored Defense is 10 + Dex + Con. With Dex 13 and Con 15, that's Hide 14 vs Unarmored Defense 13. The builder showed AC 11. The sheet shows AC 13 'Unarmored', with the hover 'Without tweaks or effects: 11 → now 13 · +2 AC + CON · Unarmored Defense Berserker feature', and Hide isn't mentioned anywhere. With a light physical shield it should be 15.
- **To reproduce:** Wookiee Berserker, Dex 13, Con 15, no armor: read AC.
- **Expected:** AC 14, with the hover listing both formulas and marking the one used.
- **Workaround used:** An AC +1 tweak 'Wookiee Hide (13 + Dex) is 1 better than Unarmored Defense (10 + Dex + Con)'. At first it was a 'set to' tweak, which then ignored the shield (W-160).
- **Checked against the code:** missing, effort M, `viewer.js:featureEffectsUncached, applyEffects, bumpTip; classes.js:clsFeatureEffects (AC formula)`. Wookiee Hide ('While you are unarmored or wearing light armor, your AC is 13 + your Dexterity modifier') is never read: species traits aren't processed, and the AC-formula parser knows only '10 + Dex + X'. Unarmored Defense is applied as a plain AC change. Needed: collect every AC formula (species, class, armor), use the best one that applies, and list them all in the hover with the one used marked.
- **Resolution:** Species AC traits (Wookiee Hide 13 + Dex, unarmored or in light armor) are AC formulas; the best one counts (Rorrwaak: Hide +3 over Unarmored Defense +2). In light armor the formula adds what it beats the armor by. The AC hover lists the formula that wasn't used. A tweak made for Hide is flagged as counting twice. (`de78015`)

<a id="w-145"></a>
#### W-145 Remarkable Athlete (Assault Specialist) not applied

**not a bug** · high · rules · reported by Tomas ([Tomas-B7](panel/2026-10-17/tomas-b.md))

> When I take Assault Specialist, I want Remarkable Athlete's half proficiency on Str/Dex/Con checks, initiative included, so that my initiative and skills are right.

- **What they saw:** The feature: 'You can add half your proficiency bonus to any Strength, Dexterity, or Constitution check you make that doesn't already use your proficiency bonus.' The sheet still shows Initiative +3 (should be +4), Acrobatics +3 (+4), Sleight of Hand +3 (+4) and Athletics −1 (+0). Effects → From class features lists Brute Force and Improved Critical, but not Remarkable Athlete. sw5e.com's engine doesn't apply it either. The README says half-proficiency features (Led by the Force) are applied.
- **To reproduce:** Fighter 3 with the Assault Specialist archetype: check Initiative and the Str/Dex/Con skills he isn't proficient in.
- **Expected:** Half proficiency (rounded down; +1 at proficiency +2) added to Str/Dex/Con checks without proficiency, initiative included, and listed under Effects.
- **Workaround used:** Noted 'initiative should be +4' in Notes.
- **Checked against the code:** not-a-bug, effort S, `viewer.js:featureEffectsUncached; classes.js:clsFeatureEffects (halfProf), applyEffects`. Tomas is Fighter 3, and SW5E's Assault Specialist text makes Remarkable Athlete a 7th-level feature ('_Assault Specialist: 7th level_'), so Initiative +3 is correct. The card appears only because SW5E's features data lists Remarkable Athlete at levels 3 and 7, a data error the engine passes on. Two problems remain for 7th level: the half-proficiency pattern matches only Led by the Force's 'any ability check' wording, and applyEffects gives half proficiency to all skills, not just Str/Dex/Con ones. Fix both and flag the data error.

<a id="w-146"></a>
#### W-146 Aura of Presence isn't added to my own saving throws

**fixed** · high · rules · reported by Priya ([Priya-B11](panel/2026-10-17/priya-b.md))

> When I have Aura of Presence, I want my saves (and the roller) to include my Wis modifier while I'm conscious, so that I don't forget my best defensive feature.

- **What they saw:** The aura's text: 'Whenever you or a friendly creature within 5 feet of you must make a saving throw, the creature can add your Wisdom modifier to the saving throw.' Her saves stayed Con +4, Cha +2, Str +3/+4. The aura appears only as text under Features; nothing in Defenses or the roller.
- **To reproduce:** Pick Aura of Presence in Classes → Guardian Auras, then look at the saves and roll one.
- **Expected:** Saves show +3, or the roller offers '+3 Aura of Presence' pre-ticked on every save.
- **Workaround used:** Added +3 by hand.
- **Checked against the code:** missing, effort S, `classes.js:clsFeatureEffects; viewer.js:featureEffectsUncached (class options)`. The Guardian Auras pick is processed, but its text ('… the creature can add your Wisdom modifier to the saving throw') matches no pattern; the 'Wisdom modifier' pattern needs 'a bonus to … equal to'. Add it as a bonus on all saves, or a pre-ticked roller option, since the aura works only while you're conscious.
- **Resolution:** 'Whenever you or a friendly creature within 5 feet of you must make a saving throw, the creature can add your Wisdom modifier' adds that modifier to your own six saves (Aura of Presence). (`dad1b17`)

<a id="w-147"></a>
#### W-147 Species unarmed strikes (Zabrak Unarmed Combatant, Wookiee Claws) not applied

**fixed** · medium · rules · reported by Tomas ([Tomas-A6](panel/2026-10-17/tomas-a.md))

> When my species gives my unarmed strikes 1d4 (and finesse), I want the attack line to use them, so that I can trust the number I roll.

- **What they saw:** The Zabrak trait: 'Your unarmed strikes deal 1d4 kinetic damage and have the finesse property.' The sheet shows 'Unarmed Strike +1, 0 Kinetic, Strength'; with finesse and Dex 17 it should be +5 to hit and 1d4+3. A tweak can set the die (now '+1, 1d4 Kinetic'), but nothing can switch the attack to Dex. Sam's Wookiee Claws ('your unarmed strikes deal 1d4 kinetic damage', shown as Unarmed '+5 · 4 Kinetic') is the same kind of trait; it's logged in his feat/species wish (W-026, W-140).
- **To reproduce:** On a Zabrak with Str 8 / Dex 17: Weapons & Attacks > Unarmed Strike.
- **Expected:** +5 to hit, 1d4+3 kinetic, Dexterity.
- **Workaround used:** An 'Unarmed: damage die' tweak set to 4; the rest noted in Notes.
- **Checked against the code:** missing, effort M, `viewer.js:featureEffectsUncached, applyEffects (unarmed)`. Species traits aren't processed. The 'Unarmed: damage die' tweak can set the die, but nothing can make unarmed strikes finesse (use Dex). Needed: a species/feature effect that sets the unarmed die and the finesse ability (+5 to hit, 1d4+3 for Tomas). Wookiee Claws can use the same mechanism.
- **Resolution:** Species natural weapons set the unarmed die (Zabrak and Twi'lek d4, Cathar d6, Wookiee Claws d4). With finesse, the attack and damage use Dexterity when it's better; the Ability column says 'Dexterity (finesse)'. Kadro: +5, 1d4+5 with Brute Force. (`de78015`)

<a id="w-148"></a>
#### W-148 Shield AC counted although the Guardian lists no shield proficiency

**not a bug** · medium · rules · reported by Priya ([Priya-A26](panel/2026-10-17/priya-a.md))

> When I equip a shield, I want the sheet to tell me if I'm not proficient (or the class data to list shields), so that my AC is right by the rules.

- **What they saw:** Guardian proficiencies: 'Armor: Light armor, medium armor' (no shields). Yet the class equipment offers 'a light or medium physical shield'. The sheet's AC is 15 'Mesh armor, Light physical shield', including the shield's +1, with no remark.
- **To reproduce:** Guardian with a Light physical shield equipped.
- **Expected:** Either confirm Guardian shield proficiency in SW5E's data, or show a 'not proficient' warning on the shield.
- **Workaround used:** None.
- **Checked against the code:** not-a-bug, effort S, `viewer.js:canEquip, armorState (no proficiency check)`. Probably correct. No SW5E class lists shields in armorProficiencies (Fighter 'All armor', Guardian 'Light armor, medium armor'), and the Guardian's own starting equipment offers 'a light or medium physical shield'. So shields appear to follow armor weight. Confirm against the PHB Equipment chapter. Separately, the sheet never checks armor or shield proficiency at all; a general 'not proficient' warning would be S.

<a id="w-149"></a>
#### W-149 No warning for a two-handed weapon used with a shield

**fixed** · medium · rules · reported by Sam ([Sam-A35](panel/2026-10-17/sam-a.md))

> When I equip a two-handed weapon and a shield, I want a warning, so that a beginner doesn't break the rules.

- **What they saw:** The Vibroaxe ('heavy, two-handed') and a Light physical shield were equipped at the same time. The attack rolled without comment and AC counted the shield (15). The GM caught it after the round.
- **To reproduce:** Equip the Vibroaxe and a shield, then attack.
- **Expected:** A warning when equipping or attacking.
- **Workaround used:** Unequipped the shield after the fight.
- **Checked against the code:** missing, effort S, `viewer.js:inventoryAction('equip'), armorState; roller.js:buildRoll('attack')`. Nothing checks two-handed weapons against an equipped shield, though armorState already knows when a shield is equipped. Warn when equipping either one and on the attack card.
- **Resolution:** Equipping a shield with a two-handed weapon (or the reverse) says 'Vibroaxe is two-handed and the Light physical shield takes a hand: you can't attack with it while the shield is equipped.' The weapon row gets a 'two-handed + shield' chip and its attack roll the same warning. Nothing is blocked. (`2f3d31c`)

<a id="w-150"></a>
#### W-150 Carrying capacity ignores Powerful Build and Brawny

**fixed** · low · bug · reported by Sam ([Sam-A13](panel/2026-10-17/sam-a.md))

> When I have Powerful Build and Brawny, I want my carrying capacity tripled, so that encumbrance is right.

- **What they saw:** Carrying capacity shows Max 255 lb / Push 510 lb at Str 17 and 270/540 at Str 18. Powerful Build doubles it, and Brawny says 'If it would already double, it instead triples.'
- **To reproduce:** A Wookiee with Brawny → Combat & Vitals → Carrying capacity.
- **Expected:** Max 810 lb at Str 18.
- **Workaround used:** None needed yet.
- **Checked against the code:** missing, effort S, `viewer.js:renderCarry, featureEffectsUncached`. Carrying capacity is SW5E's c.carryingCapacity, which ignores Powerful Build (255 lb = 17 × 15), and species traits aren't processed. Add a ×2 or ×3 effect on carryingCapacity.*; those numbers can already be changed by effects.
- **Resolution:** Powerful Build and Brawny each double carrying capacity and push/drag/lift; together they triple them (Rorrwaak: 300 → 900 lb). The ×3 and its sources are shown next to the numbers. (`de78015`)

<a id="w-151"></a>
#### W-151 0 damage on a hit: is there a minimum in SW5E?

**fixed** · low · rules · reported by Mira ([Mira-A24](panel/2026-10-17/mira-a.md))

> When my hit's damage comes to 0 after a −1 Str modifier, I want to know whether SW5E has a minimum, so that I apply the rule correctly.

- **What they saw:** 'Vibrostaff damage: 1 – 1 damage bonus = 0 Kinetic', shown without comment.
- **To reproduce:** A character with Str 8 hits with a Vibrostaff and rolls a 1.
- **Expected:** Either a minimum of 1, or a note that 0 is correct by the rules.
- **Workaround used:** Used 0.
- **Checked against the code:** not-a-bug, effort S, `roller.js:buildRoll('damage'), rollTotal`. SW5E follows 5e: there's no minimum damage of 1, so 1 − 1 = 0 is correct. A small related gap: the damage roll sets no minimum, so with a −2 modifier and a 1 rolled the dock would show −1. Clamp damage at 0 and show a short note.
- **Resolution:** Not a rules bug (no minimum damage in SW5E); damage rolls now stop at 0 instead of going negative. (`3103be9`)

<a id="w-152"></a>
#### W-152 Operative 1's Expertise missing from the builder and sw5e.com's sheet

**upstream** · low · rules · reported by Tomas ([Tomas-B19](panel/2026-10-17/tomas-b.md))

> When I add Operative 1, I want Expertise listed with Sneak Attack, so that the character data is complete and a future level-up in the extension includes it.

- **What they saw:** The Operative table says '1st: Expertise, Sneak Attack'. The builder's Operative 1 CLASS FEATURES shows only Sneak Attack, and the site's features list has no Expertise. The sheet fills it in ('Expertise — Levels 1, 6 — from class text'), so only the builder and site are wrong. Tomas logged it high at first and lowered it once he saw the sheet's fill-in.
- **To reproduce:** Builder → ADD NEW CLASS → Operative → Class features.
- **Expected:** Keep the sheet's fill-in, and include Expertise in the in-extension level-up (W-007).
- **Workaround used:** The sheet's Expertise 'Your choices' box.
- **Checked against the code:** sw5e-site, effort S, `viewer.js:missingClassFeatures, featureCard ('from class text')`. The sheet already fills in Expertise from the class text (marked 'from class text', with a 'Your choices' box); only sw5e.com's builder and sheet leave it out. Include Expertise in the planned level-up inside the extension (W-007).

<a id="w-153"></a>
#### W-153 Togruta shows a Darkvision trait that SW5E's species rules don't list

**fixed** · low · rules · reported by Priya ([Priya-A29](panel/2026-10-17/priya-a.md))

> When I read my species traits, I want only the traits SW5E's species page lists (or data-only ones flagged), so that I don't wonder whether I have darkvision.

- **What they saw:** The Species card lists a 'Darkvision' trait (with the 60 ft text), but the Togruta rules page has no darkvision. Vision shows 'Normal', which is correct. sw5e.com's feature list has DARKVISION too. Tomas saw the same for Zabrak (W-141), so fixing W-141 must not turn these into real darkvision.
- **To reproduce:** Load a Togruta → Species > Traits (10).
- **Expected:** Hide or flag data-only traits that the species text doesn't grant.
- **Workaround used:** None.
- **Checked against the code:** sw5e-site, effort S, `viewer.js:renderSpecies (m.speciesFeatures before ref.traits)`. In dev/dumps/rules.json, SW5E's species traits for Togruta and Zabrak have no Darkvision, but SW5E's features data lists one for both, and the engine's feature list is what the Species card shows. Cross-check the engine's traits against the species page's traits and flag extras as 'not in the species rules'. W-141's fix must use the species traits.
- **Resolution:** Senses and defenses come from SW5E's species rules, so the data-only Darkvision of Togruta and Zabrak isn't shown (still worth reporting upstream). (`3103be9`)

<a id="w-154"></a>
#### W-154 Stimpac 'only one at a time' rule: check it's enforced and shown

**works** · low · rules · reported by Priya ([Priya-B27](panel/2026-10-17/priya-b.md))

> When I use a second stim while one is active, I want the sheet to replace the older one or refuse, as 'A creature can benefit from only one stimpac at a time' says.

- **What they saw:** The Strength Stim text says 'A creature can benefit from only one stimpac at a time.' Untested, because she had only one stim. The code has a 'replaces … (only one at a time)' message, so it may already work; needs a check.
- **To reproduce:** Use two different stims on yourself.
- **Expected:** The older stim is replaced, with a note.
- **Workaround used:** None.
- **Checked against the code:** exists, effort S, `effects.js (group from 'only one … at a time'); viewer.js:startEffect, useItem, receiveEffect`. Already enforced. effects.js reads 'only one stimpac at a time' into the group 'stimpac', startEffect ends the older effect in the same group, and useItem and receiveEffect say 'It replaces … (only one at a time).' No change needed beyond a test.
- **Resolution:** Already enforced (only one stimpac at a time, with a message).

<a id="w-155"></a>
#### W-155 Ability breakdown lumps species, ASI and feat bonuses together

**fixed** · low · improvement · reported by Priya ([Priya-B30](panel/2026-10-17/priya-b.md))

> When I check my Strength, I want '+1 Togruta, +2 ASI (Guardian 4)' as separate lines, so that I can audit the number.

- **What they saw:** The Str card reads 'base 15 · +3 from species/ASIs/feats/tweaks'.
- **To reproduce:** Abilities → STR on a character with a species bonus and an ASI.
- **Expected:** One line per source.
- **Workaround used:** Worked it out herself.
- **Checked against the code:** partial, effort S, `viewer.js:renderAbilities`. The breakdown shows 'base N' and one lumped '+X from species/ASIs/feats/tweaks'; only effects are listed one by one. Split it using raw.species.abilityScoreImprovement, each class's abilityScoreImprovements (with class and level), feats and tweaks.
- **Resolution:** Each ability score lists its increases one by one: '+2 Wookiee · +2 ASI (Berserker 4) · +1 from Brawny (tweak)', then effects; anything unexplained is 'other'. (`de78015`)

<a id="other"></a>
### Other

<a id="w-156"></a>
#### W-156 Clearing a tweak's value deletes the tweak and shifts the rows (typing goes into another tweak)

**fixed** · high · bug · reported by Sam ([Sam-A29](panel/2026-10-17/sam-a.md))

> When I clear one field of a tweak to change it, I want the tweak kept (or an Undo) and the rows to stay put, so that I don't lose a tweak or overwrite another tweak's reason.

- **What they saw:** Sam cleared the AC tweak's 'Set to 14' value. The AC tweak vanished at once (8 → 7 tweaks), with no message and no undo. The page shifted, and his next typing went into Piloting's reason: 'Mercenary background skill' was replaced with 'Wookiee Hide (13 + Dex) is 1 better than Unarmored Defense…'.
- **To reproduce:** Tweaks table → a 'set to' tweak → select and delete its value → click the same row's Bonus box and type.
- **Expected:** The tweak stays until removed with ×, or a 'Tweak removed · Undo' toast appears. No layout jump.
- **Workaround used:** Restored Piloting's reason by hand and re-added AC as 'add 1'.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:updateTweak, writeTweak, tweakRows; effects.js:fxTweakLeaves`. Clearing 'Set to' makes updateTweak store override: null. fxTweakLeaves counts a value as a tweak only if one of its fields is not an object, and typeof null is 'object', so { override: null } drops out of the list. The row vanishes, the tweak stays stored (with its reason) but can't be removed, the rows shift up, and the next click and typing land in another tweak (Piloting's reason). Fix: treat null as empty, keep the row until × is pressed, and offer Undo.
- **Resolution:** A cleared field keeps the tweak (shown as 'no change' until removed with ×), so rows don't shift. (`3103be9`)

<a id="w-157"></a>
#### W-157 Short 'first session' guide for new players

**fixed** · medium · improvement · reported by Sam ([Sam-A1](panel/2026-10-17/sam-a.md))

> When I open the sheet for my first game ever, I want a short guide (roll a check, attack, take damage, rage, use a medpac, rest), so that I don't have to read a dense feature reference.

- **What they saw:** The README's 'Use' section is a series of very long bullets; the Combat & Vitals / Edit / inventory / Use bullet is one paragraph of about 120 words. From it, Sam picked out only Load from SW5E, Start for Rage, Use for medpacs and 'click a number to roll'.
- **To reproduce:** Open sw5e-sheet/README.md as a new player.
- **Expected:** A 6–8 step 'Your first session' section, or an in-sheet help card.
- **Workaround used:** Read the whole README.
- **Checked against the code:** missing, effort S, `sw5e-sheet/README.md`. There is no beginner guide; the README's 'Use' section is a set of very long bullets. Add a 6–8 step 'Your first session' section (roll a check, attack, take damage, start Rage, use a medpac, rest), or an in-sheet help card.
- **Resolution:** README starts with 'Your first session' (8 steps: get your character, roll, attack, take damage or heal, use a feature, cast a power, use an item, rest), and the same guide is in the sheet: More ▾ (or ☰ on phones) → First session guide. (`679e2ef`)

<a id="w-158"></a>
#### W-158 Explain weapon properties on hover

**fixed** · medium · improvement · reported by Sam ([Sam-A15](panel/2026-10-17/sam-a.md))

> When I see 'heavy, two-handed' or 'versatile (2d4)', I want to hover or tap it to read what it means, so that I learn the rules as a new player.

- **What they saw:** The weapons table shows Vibroaxe 'Dexterity 11, heavy, two-handed' and Vibrospear 'Thrown (range 25/75), versatile (2d4)' with no tooltip. Sam didn't know that two-handed rules out a shield (W-149).
- **To reproduce:** Hover a property in Weapons & Attacks or Equipment.
- **Expected:** A short rule text per property.
- **Workaround used:** None.
- **Checked against the code:** missing, effort S, `viewer.js:renderAttacks, renderEquipment; bridge.js (fetches weaponProperties/armorProperties)`. SW5E's weapon and armor property texts are already downloaded with the rules data (bridge.js fetches them) but never used; the sheet prints only property names. Add hover/tap explanations from that data.
- **Resolution:** Weapon and armor properties in Weapons & Attacks and Equipment explain themselves on hover, focus or tap, from SW5E's rules text ('Two-Handed: A weapon with this property requires two hands to use.'). (`2f3d31c`)

<a id="w-159"></a>
#### W-159 Damage-die tweak: '1d4' becomes 14, and the die can be saved empty

**fixed** · medium · bug · reported by Tomas, Sam ([Tomas-A28](panel/2026-10-17/tomas-a.md), [Sam-A20](panel/2026-10-17/sam-a.md))

> When I set a damage die with a tweak, I want to type '1d4', 'd4' or '4' and have it kept, so that Claws or Unarmed Combatant work on the first try.

- **What they saw:** The Add row's amount box says 'e.g. 1' and is numeric. Typing '1d4' gave 14, and the row showed an empty 'Die' box; typing '4' worked ('1d4 Kinetic') (Tomas). Sam chose 'set to' + 4 and the tweak was added with an EMPTY 'Die' box. The row's tooltip 'Damage die size, e.g. 6 for d6' only appears after adding, and the mode list offers proficient/expertise for a damage die. Sam rated it medium, Tomas low.
- **To reproduce:** Settings, Tweaks & Data → Add a tweak to… Unarmed: damage die → set to → type 1d4 (or 4) → reason → Add.
- **Expected:** The die is saved. The box is labelled as a die size ('d'), accepts d4/1d4/4, and only sensible modes are offered.
- **Workaround used:** Typed 4, or typed it again into the row's Die box.
- **Checked against the code:** bug-confirmed, effort S, `viewer.js:renderTweaks (tw-add), addTweak`. The Add row's amount box is a number input, so typing '1d4' becomes 14. For 'Unarmed: damage die', addTweak stores { override: n } or { bonus: n }, but the tweak row shows and edits the dieSize field ('Die'), which therefore stays empty. Fix: for damage-die targets offer only 'die size', accept d4 / 1d4 / 4, and store dieSize.
- **Resolution:** A damage-die tweak takes 'd4', '1d4' or '4' (the box says 'die, e.g. d4') and stores the die size. (`3103be9`)

<a id="w-160"></a>
#### W-160 No warning when an AC 'set to' tweak overrides armor or a shield

**fixed** · medium · improvement · reported by Sam ([Sam-A30](panel/2026-10-17/sam-a.md))

> When I equip a shield while an AC 'set to' tweak exists, I want a warning, so that my AC doesn't silently ignore the shield.

- **What they saw:** With 'AC set to 14', equipping a Light physical shield (AC +1) left AC at 14. The hover read 'Without tweaks or effects: 12 → now 14 · = 14 AC …'.
- **To reproduce:** Add an AC set-to tweak, then equip a shield.
- **Expected:** A notice: 'your AC tweak overrides the shield's +1'.
- **Workaround used:** Changed the tweak to add +1.
- **Checked against the code:** missing, effort S, `viewer.js:inventoryAction('equip'), renderCombat`. Nothing warns when an AC 'set to' tweak hides an armor or shield change; only the hover shows '= 14'. Warn when equipping, or show 'your AC tweak overrides the shield's +1' next to AC.
- **Resolution:** With an AC 'set to' tweak, AC shows 'set to 14 by a tweak', and equipping armor or a shield says 'Your AC tweak sets AC to 14, so the Light physical shield doesn't change it: change the tweak to a bonus, or remove it.' (`2f3d31c`)

<a id="w-161"></a>
#### W-161 Enter in the tweak Reason box doesn't add the tweak

**fixed** · low · improvement · reported by Mira, Sam ([Mira-A10](panel/2026-10-17/mira-a.md), [Sam-A18](panel/2026-10-17/sam-a.md))

> When I've typed a tweak's reason, I want Enter to add it, so that adding several tweaks is quicker.

- **What they saw:** Settings, Tweaks & Data > Add a tweak to… > fill in > Enter in the Reason box: nothing happened; they had to click Add. Tomas hit the same while making his skill tweaks (W-024).
- **To reproduce:** Fill in a tweak row and press Enter in the Reason field.
- **Expected:** Enter adds the tweak.
- **Workaround used:** Click Add.
- **Checked against the code:** missing, effort S, `viewer.js:wireUi keydown`. The Enter key is handled for the add-item and effect boxes but not for the Add-a-tweak row. Make Enter in the Reason or amount box add the tweak.
- **Resolution:** Enter in the Add-a-tweak amount or reason box adds the tweak. (`3103be9`)

<a id="w-162"></a>
#### W-162 Tweak target list is one flat 65-entry select

**fixed** · low · improvement · reported by Sam ([Sam-A19](panel/2026-10-17/sam-a.md))

> When I pick what to tweak, I want a grouped or searchable list, so that typing 'AC' finds AC.

- **What they saw:** 'Add a tweak to…' is a single flat select of 65 entries. Typing 'AC' selects 'Acrobatics (DEX)', and AC is 17 entries further down.
- **To reproduce:** Add a tweak to… → type AC.
- **Expected:** Optgroups (Abilities / Skills / Combat / Powers / Weapons) or a search box.
- **Workaround used:** Pressed arrow-down 17 times.
- **Checked against the code:** missing, effort S, `viewer.js:tweakTargets, renderTweaks`. The list is one flat select: ability scores, saves and skills first, AC later. Typing 'AC' jumps to 'Acrobatics (DEX)'. Group the options (Combat / Abilities / Saves / Skills / Powers / Weapons), with Combat first, or use a searchable box.
- **Resolution:** The tweak target list is grouped: Combat (AC first), Ability scores, Saving throws, Skills (alphabetical), Powers, Maneuvers, Weapons. Typing 'AC' finds AC. (`2f3d31c`)

## Panel panel-2 (2026-10-17)

### Characters

| Player | Plays | Device | Character (id on the test account) |
|---|---|---|---|
| Mira | Consular 1 → 3 (archetype) → 4 (feat) | desktop | Thirza Vitchess (Panel) `…` |
| Tomas | Fighter 1 → 2 → Operative 1 → Fighter 3 (archetype) | desktop | Kadro Vos (Panel) `…` |
| Jun | Engineer 1 → 3 (archetype) → 4 (ASI) | phone (390 px frame) | Tikk Plonr (Panel) `…` |
| Priya | Guardian 1 → 3 (archetype) → 4 (ASI) | tablet (800 px frame) | Maasha Vaal (Panel) `…` |
| Sam | Berserker 1 → 3 (Approach) → 4 (ASI) | desktop | Rorrwaak (Panel) `…` |

#### Mira: Thirza Vitchess (Panel)

_Long-time D&D 5e player, new to SW5E; lives in powers, force points and concentration._

**After session 1:** Kel Dor Consular 1, Force Adept background (Empathic feat), Lawful Balanced, 300 XP (level 2 reached by XP, not levelled). End of part A: HP 7/7, FP 8/8, hit dice 1/1 d6, Force Recovery 1/1, Inspiration spent, no active effects. Wis 18 (17 from SW5E + tweak for Empathic), AC 12, Init +2, Passive Perception 16, Light/Universal force DC 14 / attack +6. 6 tweaks with reasons: proficient in Lore, Medicine, Perception, Persuasion and Insight, plus Wisdom +1. 9/9 powers: Guidance, Turbulence, Spare the Dying, Force Push/Pull, Mind Trick, Heal, Heroism, Force Propel, Cloud Mind. 150 cr. Inventory: Vibrostaff (equipped), Vibroknife, common clothes, Focus generator, Datapad (Notes say it is the coded datapad with the smuggler's coordinates), Strength Stim (Basic) x1, Medpac x1, Backpack, Pouch. Only in Notes: tools (Chance cubes, Ommni box), the Kel Dor language, a Diplomat's pack and a 490 cr debt to Kessa. Not synced to sw5e.com: the site still has the fresh level-1 build.

**After session 2:** Kel Dor Consular (Way of the Seer) 4, Force Adept background (Empathic), War Caster feat at 4. 2,700 XP, HP 20/22, FP 20/20, HD 4/4 d6, Force Recovery 1/1, Force Shield 2/2, 450 cr. 15 powers (added Battle Precognition, Sanctuary, Battle Meditation, Force Throw, Force Barrier, Sense Emotion), Force-Empowered Castings Twinned + Quickened, Force Affinity Ashla (typed in the feature notes). Focus Generator (Fine) attuned (+1 force attack in the sheet). Medpacs and the Strength Stim are used up. Synced to sw5e.com and the site's copy checked. Getting to level 3 needed a Sync-and-relevel workaround because local class choices froze the level. No backup file was exported.

**Blocked or worked around:**

- A1: no builder step for skill or tool proficiencies. I set the 5 skills as tweaks in the sheet. The 2 tools and the Kel Dor language couldn't be recorded (only in Notes).
- A1/A3: no Diplomat's pack, which isn't in SW5E's item list (only in Notes).
- A5: couldn't pay the discounted price (640 cr for 2 medpacs + focus generator vs 150 cr held). I paid 150 cr, added the focus generator unpaid and recorded a 490 cr debt in Notes, because the sheet blocks negative credits.
- A6 round 2: the scripted crit (13) killed Thirza outright by massive damage in the sheet (HP 1 + 4 temp, max 7). To follow the GM's 'make death saves' I cleared the three failures by hand (which lost Undo).
- A6 round 3: the '4 damage + DC 10 Con save' step didn't apply, because concentration (Heroism) had ended at 0 HP. I ended it by hand since the sheet didn't.
- A7: the coded datapad couldn't be added as itself (no custom items). I used SW5E's generic Datapad plus a note.
- A8: no hit dice spent, because HP was already full after the medpacs. Force Recovery was applied by hand because the short rest didn't offer it.
- B1/B7: levelling up in the extension isn't possible (no level control). Levels 2, 3 and 4 were done in sw5e.com's builder + Load from SW5E. Level 3 needed a Sync-and-relevel workaround because local class choices froze the level.
- B7: the ASI/feat choice can't be made in the extension; chose War Caster in the sw5e.com builder.
- B8: 'Export all (backup)' was not clicked. It saves a file to disk, and downloads need the user's explicit approval, which this panel run can't get. More ▾ shows the option; the version history says 'Last full backup: never'.
- B4: couldn't record the Poisoned condition, Force Visions foretelling rolls, Quickened costs or Ashla's HP bonus in the sheet. I played them by hand: disadvantage picked manually, FP '−' clicks, Ashla skipped.
- B4 round 3: no natural 20 came up (I rolled a natural 1), so critical damage wasn't tested this time.

**What worked (keep it):**

- Load from SW5E found and loaded my brand-new character in about 5 s, and every number matched the builder (AC 12, HP 7, saves, DCs, force points).
- Force Casting card: Light, Dark and Universal DC and attack side by side, plus each power's save DC, Concentration tag, points cost and Cast button. The power picker shows prerequisites ('needs Force Push/Pull').
- Cast spends the force points and shows a concentration chip and an Effects entry with End. The 'Cast Guidance. Concentrating.' toast is clear.
- Dice dock: advantage with the losing die struck through, recent rolls per character, 'Hit: roll damage' / 'Critical damage' after an attack, a 'Natural 20' badge, and death save → 'Record a failure' in one click.
- Medpac Use → 'On me' rolls d6 + Con in the dock, then 'Heal 5' → 'Healed 1 (of 5; at maximum)', and the stack goes down. Very smooth.
- Damage / Heal / Temp HP with Undo of the last action. Temp HP is absorbed first and the massive-damage rule is known.
- Buying shows the price and weight, 'Pay … cr from credits', any price allowed, and a clear 'Not enough credits: 600 cr needed, 150 cr available.'
- Tweaks keep their reasons. Changed numbers are underlined, and the hover tooltip ('Without tweaks or effects 3 → now 4 · +1 Wisdom score · Empathic feat… · Tweak (not synced to SW5E yet)') is exactly what I want.
- Personality & Appearance in one edit form, Notes with Markdown, and the XP box accepts '+300'.
- Long rest toast ('Long rest: regained uses of Force Recovery.') and Undo: Long rest.
- Load from SW5E kept everything from Session 1 across each level-up (when the level wasn't frozen): XP 900 over the site's 300, 6 tweaks with reasons, inventory incl. the datapad, notes, personality; current HP rose with the max (7/7 → 12/12 → 17/17 → 22/22).
- Power and Force-Empowered Casting pickers in the class card: counted against the table (9/11 → 15/15), grouped At-will / 1st / 2nd, prerequisites shown, each pick expands to its rule text, and picks travel to sw5e.com with Sync. Much nicer than the builder's reordering dialog.
- The class table's 'Now / Next' rows tell me exactly what the next level gives.
- Force Shield appeared at level 2 as a 2/2 counter with a Start button; Force Casting shows Light/Dark/Universal DC + attack, the per-power save DC, a level select with point costs, and spends FP on Cast.
- Strength Stim 'Use → On me': STR, Vibrostaff attack and damage, and carrying capacity all updated, the hover explains it ('+2 from Strength Stim (Basic) (temporary)'), Effects shows its duration, and the item is removed.
- Focus Generator (Fine) with Attuned ticked on add: force attack +6 → +7 everywhere, attunement 1/2, 'while attuned' in Effects, with zero typing.
- Long rest toast 'regained 16 HP, 10 force points, one level of exhaustion gone.' with Undo; temp HP absorbed first; 'Undo: Took 18 damage'.
- Sync to SW5E worked every time and the site's copy matched (level, HP, FP, 15 powers, War Caster, 450 cr, attunement 1/2). The 'Not synced to SW5E: Class choices, …' banner lists what's pending.
- Phone frame: strip with ♥ HP and AC, the 🔍 filter jumps straight to the Vibrostaff, the dock slides up, attack → damage in two taps; damage/heal in the tracker didn't make the page jump.

#### Tomas: Kadro Vos (Panel)

_Optimizer; checks attack bonuses, AC and damage; wants multiclassing to just work._

**After session 1:** Zabrak Fighter 1 (Soldier background, Weapon Expert feat, Sharpshooter Style), Chaotic Balanced. 300 XP, so level 2 is reached (plan: Fighter 2, then Operative 1 at level 3, then Fighter 3). HP 14/14 (SW5E says 13, plus a +1 tweak for Zabrak Toughness). AC 15 (mesh armor). Dex 17 (16 plus a +1 tweak for Weapon Expert). Blaster rifle +5 / 1d8+3. Hit dice 1/1 d10, Second Wind 1/1, Inspiration spent. 150 cr, and owes Kessa 460 cr (in Notes only). Inventory: Medpac x1, frag grenade x1, Strength Stim (Basic) x1, Power cell x13, and the coded datapad (a custom item added on sw5e.com that came in through Load from SW5E). 8 tweaks with reasons: 5 skill proficiencies, Dex +1, HP max +1, unarmed die d4. Tools and languages are in Notes only. Nothing has been synced to sw5e.com.

**After session 2:** Zabrak Fighter (Assault Specialist) 3 / Operative 1, 2,700 XP. Sheet: HP 41/43 (play state from the phone round, not synced; the site has 43/43), AC 15, Init +3 (should be +4 with Remarkable Athlete), Passive 15, hit dice 1/1 d8 and 3/3 d10, superiority dice 2/2 d4. Blaster rifle +5 / 1d8+6 (Brute Force +2, plus Xerrol Nightstinger +1 applied to it). Sharpshooter Style, Cover Strategist, maneuvers Precision Attack and Return Fire, Expertise in Stealth and Perception. The multiclass skill (Stealth) is a tweak and the tool (Security kit) is in Notes. 9 tweaks (HP max +4 for Toughness). 450 cr; still owes Kessa 460 cr (Notes). Medpacs and Strength Stim used; Xerrol Nightstinger Rifle equipped; coded datapad kept. Synced to sw5e.com at 16:50, and the backup export was checked.

**Blocked or worked around:**

- A3: couldn't record tools and languages (Zabraki, Huttese, Tinker's implements, Sabacc deck proficiency) anywhere in the sheet; they're in Notes only.
- A5: couldn't afford the purchase even at 20% off (480 cr vs 100 cr). Paid 100 cr, added the grenade unpaid, and recorded the 460 cr debt in Notes because the sheet has no place for debts.
- A6: death saves weren't rolled. Zabrak Second Heart (done by hand as Heal 1) kept me at 1 HP. Not concentrating, so no 4 damage / DC 10 Con save.
- A7: couldn't add the coded datapad in the sheet (no custom items). Added it as a custom item on sw5e.com's builder and brought it in with Load from SW5E.
- A8: no hit dice spent because HP was already 14/14 (the ally's medpac plus my own).
- A10: XP recorded (300), but level-up and multiclassing aren't possible in the extension; left for part B in sw5e.com's builder.
- B1/B7 levelling up (Fighter 2, Operative 1, Fighter 3) couldn't be done in the extension: there is no level-up or add-class flow. Done in sw5e.com's builder, then Load from SW5E.
- B7: after Fighter 3 in the builder, Load from SW5E ignored the new level because a maneuver picked in the sheet had stored the whole classes list as a local edit. Workaround: Sync to SW5E (which un-levelled the site), redo Fighter 3 in the builder, Load again.
- B4: couldn't add the Poisoned condition (no condition picker). Used the 'Poison' item effect as a reminder and chose Disadvantage by hand.
- B4: Second Wind still has no Use/Roll. Spent it with '−', typed 1d10+2 in the dice dock, then Heal.
- B4: Precision Attack can't be spent from the dice dock (not needed this fight).
- B2: the multiclass skill and tool have no pickers. Skill as a tweak (Stealth), tool in Notes (Security kit).
- B5: the Xerrol Nightstinger Rifle can't be used as its own weapon. Applied its +1 damage to the Blaster rifle instead.
- B7: Remarkable Athlete isn't applied (initiative stays +3 instead of +4). Noted in Notes; no workaround.
- B8: I didn't save the backup file to disk (it would write to the user's Downloads). I caught the export's save in the page and checked its JSON contents instead.

**What worked (keep it):**

- Load from SW5E brought in a character whose numbers matched the builder exactly. Later it merged a custom item I made in the builder into my locally changed sheet and kept every local change (credits, inventory, tweaks, personality, notes).
- Custom items from sw5e.com's builder show up in the inventory with a 'custom' tag.
- The fighting style picker has the full list, shows the style's text after picking, and catches over-picks ('⚠ 2 chosen, 1 allowed').
- Tweaks keep their reasons, the add row stays in place after each Add, keyboard works in the selects, and changed numbers turn green and underlined (HP 14, Passive 13).
- Dice dock: advantage with the struck die, 'Natural 1' badge, 'Hit: roll damage' / 'Critical damage', an 'amended' tag when I add a die, and recent rolls with times.
- Damage and Heal with Undo. 'Healed 5 (of 6; at maximum)' tells me what was wasted, and the massive-damage rule is applied.
- Medpac Use → On me / On someone else rolls d10 + Con, heals and decrements the stack in one go.
- Buying is clear: 'Not enough credits: 600 cr needed, 100 cr available.' Pay accepts any price, Qty resets after each add, stacks merge (power cells 3 + 10 = 13), × asks 'Remove?', and type → Enter → Enter adds an item quickly.
- Short rest says what came back ('regained uses of Second Wind…'), and Second Wind has its own counter.
- The Personality form is one place for everything, Notes render Markdown, and the XP box accepts '+300'.
- Load from SW5E after the first builder level-up (Fighter 2 + Operative 1) kept every local change: XP, credits, all 18 items including the custom coded datapad, 8 tweaks with reasons, notes, personality, fighting style. It brought in the new class, HP, hit dice per die size (1/1 d8 and 2/2 d10 as separate tracker rows), the Action Surge counter, superiority dice and the Sneak Attack die.
- Operative's Expertise, missing from SW5E's data, was filled in 'from class text' with a Your choices box. Writing 'Stealth + Perception' there gave correct numbers (Stealth +7, Perception +5, Passive 15) and an Effects line.
- Picking the archetype in the sheet (Assault Specialist) brought in its level-3 features and applied Brute Force (+2 on every weapon and unarmed) and Improved Critical (Effects: 'Critical on 19–20').
- Superiority & Maneuvers section: Physical/Mental/General DCs and attack bonuses correct by my math, maneuver texts shown, and an honest note that sw5e.com doesn't compute superiority.
- Sneak Attack is a checkbox on the damage roll and can be ticked after rolling: the weapon die keeps its number, only the d6 is added ('amended').
- Strength Stim: Use → On me → STR +2 flowed into the unarmed attack, carrying capacity and a sidebar chip; End restored everything.
- The long rest message lists exactly what came back: 'regained 27 HP, uses of Second Wind, Action Surge, one level of exhaustion gone.'
- Credits '+400' / '−100' apply instantly; Medpac 'On someone else' just consumes it.
- Choosing a host weapon for the nightstinger's +1 applied immediately (1d8+4, underlined).
- Sync to SW5E carried tweaks (HP +4, Dex +1, skill proficiencies), maneuvers, archetype, strategy, credits, inventory and custom items to sw5e.com. Export all (backup) contains everything, including tweak reasons and version history.
- Editing a tweak value (HP bonus 1 → 3 → 4) is instant and HP updates within seconds.
- Phone frame: Damage/Heal are one tap each; the 🔍 filter plus the dice bottom sheet made a quick attack easy; it opened on my character.

#### Jun: Tikk Plonr (Panel)

_Plays the whole sheet on a phone; tech powers and tech points._

**After session 1:** Sullustan Engineer 1, Scientist background with the Techie feat, Neutral Light. 300 XP, so ready for level 2 (the sheet shows 'You have unused levels…'). HP 10/10, hit dice 1/1 d8, tech points 6/6, Potent Aptitude 2/2, Repair Droid 1/1, no Inspiration, exhaustion 0, no active effects. Credits 150 cr; owes Kessa 420 cr (only in Notes). Inventory: blaster pistol (equipped), vibrodagger, combat suit (equipped), power cell x17, common clothes, wristpad, datapad, Medpac x1, backpack, Tinker's implements, Strength Stim (Basic) x1. Weight is 41 lb and the sheet says 'Encumbered'. 7 tweaks stand in for missing creation choices: Int +1 from Techie (Int 18, tech attack +6, save DC 14); proficiency in Piloting, Investigation, Medicine, Nature and Lore; expertise in Technology. Powers: Ion Blast, Electroshock, Mending, Target Lock, Kolto Pack, Energy Shield, plus Repair Droid from Techie. Personality and notes are filled in. Kept only in Notes: tools, languages, explorer's pack contents, research book, the coded datapad story item and the debt. Nothing has been synced to sw5e.com yet. Log: docs/panel/2026-10-17/jun-a.md

**After session 2:** Sullustan Engineer (Armstech Engineering) 4, Scientist background with the Techie feat, 2,700 XP, synced to sw5e.com at 17:39. HP 31/31, hit dice 4/4 d8, tech points 13/13, Int 20 (ASI +2 plus the Techie tweak), tech attack +7, save DC 15, AC 14 (Combat suit plus Armor (Fine)). Potent Aptitude 2/2. Infuse Item 0/1: spent on the vibrodagger, but the sheet tracks that nowhere. Repair Droid 1/1, exhaustion 0, no effects or conditions. 10 powers: Ion Blast, Electroshock, Mending, Detonator, Target Lock, Kolto Pack, Energy Shield, Homing Rockets, Shocking Ray, Paralyze Humanoid, plus Repair Droid from Techie. Modified weapon: Blaster pistol with Celerity Oscillator and Expanded Magazine. 450 cr; the 420 cr debt to Kessa is only in Notes. No medpacs or stim left. Weight 40.5 lb, so the sheet says 'Encumbered', but speed is unchanged. 7 tweaks kept. No backup exported. Log: docs/panel/2026-10-17/jun-b.md

**Blocked or worked around:**

- A5: couldn't pay the discounted price (2 Medpacs at 20% off = 480 cr with 100 cr on hand): the sheet blocks with 'Not enough credits'. Paid 100 cr, added 5 power cells for free, and recorded a 420 cr debt to Kessa in Notes.
- A3: couldn't add the Explorer's pack, the research book, tool proficiencies (Tinker's implements, Slicer's kit, Chemist's kit) or languages (Sullestese, Bothese, Binary); all went into Notes. Skills and the Techie Int +1 were only possible as 7 tweaks.
- A7: couldn't add the story item 'coded datapad with the smuggler's coordinates' to the inventory (no custom items); it's in Notes.
- A6 round 3: did not take the 4 damage + DC 10 concentration save, because by the rules my concentration had already ended at 0 HP in round 2. The sheet still showed Target Lock active, which is a bug.
- A6: Ion Blast damage couldn't be rolled from its power card; rolled '1d4' by typing it into the dice dock.
- A8: spent no hit dice: HP was already 10/10 after the medpacs, so the short rest only restored tech points.
- B1/B7: Levelling up in the extension is impossible (no level-up, ASI or feat control). Done in sw5e.com's builder on desktop, then Load from SW5E.
- B1: Level 3 was silently undone by Load from SW5E because of a power learned in the sheet. The UI offers no way out except 'Revert to SW5E's copy' (which loses everything). Recovered with javascript_tool (the sheet's setEditedFields(snap, {classes: snap.raw.classes})).
- B2/B7: Picking from lists with the keyboard commits every option passed, so later picks (archetype mods, powers) were set once via JS to imitate a phone picker.
- B4: Poisoned can't be set in the sheet; done on sw5e.com (CONDITIONS) + Load, and cleared the same way after the fight. Disadvantage chosen by hand.
- B4: The Strength Stim was used after a GM ruling (an ally healed me 6 at 0 HP), because the script's stim use is impossible while unconscious. My round-3 attack and Close Call missed, so an ally finished the boss.
- B6: Infuse Item can't be applied to an item (counter only). Spent the use and tracked the +1 vibrodagger myself.
- B8: Export a backup was not done. 'Export all (backup)' downloads a file, which needs the user's explicit OK in chat; I don't have that as a panel agent.
- B8: Quick phone round skipped, as the script allows (I played all of parts A and B in the 390-px frame).

**What worked (keep it):**

- Dice dock on the phone: tap any skill, save, initiative or attack; Advantage shows both d20s; extra dice can be added after the roll (Target Lock +d6 → 'amended'); custom roll box ('1d4'); recent rolls per character.
- Weapon attack → 'Hit: roll damage' / 'Critical damage' with Double dice / Max + roll is fast and clear.
- Death save → 'Record a success' → 'Death saves: 1 ✓, 0 ✗.'; healing from 0 clears death saves automatically; the message at 0 HP tells you what to do.
- Medpac 'Use' → 'On me / On someone else / Cancel' → rolls d8 + Con → 'Heal 6' → '✓ Healed 4 (of 6; at maximum)' and the count drops: excellent flow.
- The '♥ HP' chip in the strip jumps to Combat & Vitals; the state chip ('● Target Lock') jumps to Effects where End is one tap.
- Casting a power from the card spends tech points, says 'Concentrating', and lists the power under Effects with its duration and start time.
- Short rest restores Engineer tech points (rule correct); Long rest says 'Long rest: done.'; each action has an Undo.
- Add an item from SW5E: exact-match detail line (type, cost, weight), Equipped/Pay options, and stacks merge (power cells 2 → 7 → 17).
- The '+n / −n' syntax works for both credits and XP.
- Tweaks: the add form stays in place under the thumb, each tweak takes a reason, and changed numbers are underlined with a tap-to-explain breakdown.
- Notes support Markdown and render lists nicely; Personality edit fields are comfortable on a phone.
- No horizontal page scroll at 390 px anywhere except the class table; cards and the dock fit the phone width.
- The 'Not synced to SW5E: play state, Inventory, Tweaks, … Class choices' banner says exactly what differs from the site, a big improvement on part A's 'Same as sw5e.com's copy'.
- Load from SW5E stayed on my character this time, and my local data survived builder level-ups: XP, credits, 11 items, notes, personality and 7 tweaks (Int 18 > tech points 8, then 10, then 13 all correct).
- The Classes card is clear: 'Tech powers 6 / 7' in orange, a red '9 / 7 ⚠ 9 known, the table gives 7', the power list grouped by At-will / 1st / 2nd level, 'HP by level 8 (max), 5, 5', and a Now/Next class table.
- Archetype modification picker: 'Armstech Modifications 0 / 4', modified weapon chosen from my inventory, prerequisites shown inline ('Bayonet (needs Blaster)', 'Accuracy Focus (5th level)').
- Death save flow at 0 HP: Roll > 'Record a success' > 'Death saves: 1 ✓, 0 ✗.'; healing clears the saves automatically; massive damage handled correctly.
- Consumables: Use > On me / On someone else / Cancel. The stim applied 'STR +2' with its duration and the sheet jumped to Effects; carrying capacity followed the stim's Str.
- Long rest notice: 'regained 18 HP, 2 tech points, uses of Potent Aptitude, one level of exhaustion gone.'
- Effects provenance: 'FROM EQUIPMENT · Armor (Fine) AC +1 while equipped', 'FROM CLASS FEATURES · Bonus Proficiencies…'.
- The 🔍 filter on the phone took me straight to the Credits box or the Medpac row; +n/−n works for credits and XP.
- State chip > Effects > End is still the quickest way to end concentration or a stim.
- Each power now has a level dropdown next to Cast (ready for upcasting); the dice dock still allows adding dice after the roll ('amended').
- Nothing overflowed horizontally at 390 px all session.

#### Priya: Maasha Vaal (Panel)

_Rules lawyer; reads the rules text and checks the sheet follows it._

**After session 1:** Togruta Guardian 1, Jedi background (Formfighting Dabbler: Soresu Form), Lawful Light. 300 XP, so level 2 is reached and not yet taken. HP 12/12, hit dice 1/1 d10, force points 5/5, Channel the Force 2/2 (Lend Aid, typed in the feature's notes). Str 16, Dex 12, Con 14, Int 8, Wis 16 (tweak +1 from the feat), Cha 10. AC 15, PP 15, tremorsense 30 ft. Powers: Guidance, Saber Reflect, Saber Ward, Heal, Heroism (Battle Precognition swapped out in the sheet). 6 tweaks with reasons (Wis +1; proficiency in Survival, Athletics, Perception, Insight, Persuasion). Credits 150; owes Kessa 370 cr (in Notes only). Inventory has 13 rows, among them a Medpac x1, a Strength Stim (Basic) x1, a Vibrodagger, and custom items for the coded datapad and the Jedi Code (made on sw5e.com and brought in with Load from SW5E). Not synced to sw5e.com. Log: docs/panel/2026-10-17/priya-a.md

**After session 2:** Togruta Guardian (Soresu Form) 4, Jedi background, Lawful Light, 2,700 XP. HP 34/36, hit dice 4/4 d10, force points 11/11, Channel the Force 2/2, The Way of the Mynock 1/1. Str 18 (ASI +2), Wis 16 (tweak). AC 16 (mesh armor + shield + attuned Jensaarai Armor). Lightsaber +6 / 1d6+4. Picks: Defense Style, Aura of Presence, Soresu form (from the feat) and Shien form (from Form Basics), 10 force powers. 450 cr, still owes Kessa 370 cr (in Notes). Medpacs and the Strength Stim are used up. Not synced: sw5e.com's sign-in expired, so the site is missing the archetype, 5 of the powers, the aura, style, form, the Jensaarai Armor and the credits. Level 4 only got into the viewer through a javascript_tool merge.

**Blocked or worked around:**

- A5: couldn't pay Kessa's discounted 480 cr (the sheet only allows paying credits I have). I paid 150, took the Vibrodagger free, and recorded the 370 cr debt in Notes.
- A7: the coded datapad (story item) couldn't be added in the extension, which has no custom items. I added it, plus the Jedi Code, as custom items in sw5e.com's builder and brought them in with Load from SW5E.
- A3: languages (Togruti, the Jedi's chosen language) can't be added in the sheet, so they are in Notes. The feat's +1 ability and the class/background skills had no pickers; I used tweaks.
- A6: Soresu's halving, the concentration saves and Heroism's temp HP had to be applied by hand (Undo + re-enter damage, manual Con save, manual Temp HP).
- A3: the frame's native select (lightsaber form picker) couldn't be driven by my browser tools, so I set it via javascript_tool. That is a tool limitation; a real tablet tap would work.
- B8 Sync to SW5E and checking the site's copy: blocked. sw5e.com's sign-in had expired (the builder redirected to sw5e.b2clogin.com 'Sign up or sign in'), and I don't enter passwords. Sync hung 4 times with no timeout. The site copy has Guardian 4 + ASI from the builder but not the archetype, aura, style, Shien form, 5 of the powers, the Jensaarai Armor or the credits.
- B8 Export a backup: not done. 'Export all (backup)' triggers a file download, which needs the user's explicit OK. I only inspected what it would export.
- B7 level 4 in the extension: not possible (no level-up or ASI flow). Done in sw5e.com's builder. Getting it into the viewer needed a javascript_tool merge of levels, hitPoints and ASIs into the local Class choices, because Load from SW5E discards site level-ups and Sync was hanging.
- B1 level 2 via Load: the first attempt was silently reverted to level 1. Worked around by syncing first and redoing the builder level (UI only).
- B2 learning powers by keyboard: the type-ahead bug added wrong powers and an extra aura. 4 powers (Force Jump, Saber Throw, Sanctuary, Burst of Speed) were set through javascript_tool.
- B4 Poisoned condition: no way to apply it. Used the 'Poison' item effect as a stand-in and picked disadvantage by hand. No natural 20 came up, so critical damage wasn't exercised this session.

**What worked (keep it):**

- The Force casting block shows light, dark and universal DCs and attacks side by side. Each power is tagged Light/Dark/Universal and Concentration and shows its full text, which beats the builder.
- Cast spends the right points ('Cast Heroism at 1st level (2 force points). Concentrating.'). The strip shows concentration chips, Effects lists what is running with 'since 14:45', and End works.
- The lightsaber form picker shows prerequisites ('Aqinos Form (needs The ability to cast tech powers)'). Adopt/End works as a state. 'Learn a force power…' shows '(needs X)' and warns '⚠ 6 known, the table gives 5'.
- Tremorsense 30 ft was picked up from the Togruta trait text (sw5e.com's sheet doesn't show it).
- The 🔍 filter on the tablet ('Soresu', 'Heroism', 'Medpac', 'credits') goes straight to the button I need mid-fight.
- Medpac Use > On me rolls d10 + Con and heals with one more tap, and decrements the stack. The hit die offers 'Heal 6 and spend the d10'. Temp HP absorbs damage first. Undo on damage works.
- 'Not enough credits: 480 cr needed, 150 cr available.' is clear. Pay accepts any price, and '+150' works in the credits box.
- Short rest says what to do next ('To heal, roll hit dice…'). Long rest says what came back ('regained 2 force points, 1 hit die').
- Load from SW5E after adding custom items on sw5e.com kept every local change (HP, force points, tweaks, credits, inventory, notes) and brought the items in with a 'custom' tag.
- The tweak add row is keyboard-friendly and keeps reasons. Changed numbers are underlined in green, and skills show 'Proficient' and appear under Proficiencies.
- The Classes & Progression card at level 3 has archetype, Guardian Auras (with the 'Auras Known' count), Fighting style and the archetype's Form Basics picker. That picker knew I already had Soresu from my feat and asked for another form, exactly as the rule text says. The builder has none of these pickers.
- New features get counters and states by themselves (The Way of the Mynock 1/1, long rest; Start/End with a strip chip).
- Long rest says exactly what came back: 'regained 18 HP, 4 force points, uses of The Way of the Mynock, one level of exhaustion gone'.
- Once a level is in, every number recalculates correctly: HP 36, FP 11 (8 + Wis), hit dice 4d10, Focused Strikes 2d8, Str 18 → lightsaber +6 / 1d6+4.
- Load from SW5E kept every Session 1 thing across three level-ups (credits, custom datapad, notes, tweak reasons, the Soresu pick, the Lend Aid note). Reloading the page during the sync hang lost nothing, and local version history (9/25) is reassuring.
- Strength Stim: Use → On me gave Str 18 with '+2 from Strength Stim (Basic) (temporary)', updating attacks, Athletics and carrying capacity. End restores them.
- Item search shows rarity and 'requires attunement', has an Attuned checkbox at add and an attunement 1/2 counter. Enter picks the first suggestion and also applies credit changes.
- The 🔍 filter is still the fastest way around the sheet on tablet and phone ('Mynock', 'Strength Stim', 'Medpac', 'Unarmed').
- Attack rolls tag a 'Natural 1', and disadvantage shows both dice with the struck one.
- Power prerequisites update live: Force Jump loses '(needs Force Leap)' once Force Leap is learned, and 'X / 10' turns green when the table count is met.

#### Sam: Rorrwaak (Panel)

_First tabletop RPG ever; relies on the sheet to explain things._

**After session 1:** Wookiee Berserker 1, Mercenary background with the Brawny feat, Chaotic Light. At the end of part A: 300 XP (enough for level 2, but there's no way to level up in the sheet), HP 14/14, hit dice 1/1 d12, Rage 2/2, Inspiration spent, no active effects. Str 18 (17 from SW5E plus a Brawny tweak), Dex 13, Con 15, Int 8, Wis 12, Cha 10. AC 14 unarmored (Unarmored Defense plus a +1 tweak for Wookiee Hide; 15 with the shield). Vibroaxe +6 for 1d12+4. Credits 150 cr, and I owe Kessa 430 cr (only in Notes). Notable items: Medpac x1, Strength Stim (Basic) x1, Datapad (the coded datapad with the smuggler's coordinates, explained in Notes), and a Light physical shield that isn't equipped because the axe is two-handed. There are 8 tweaks with reasons: skill proficiencies, Str +1, AC +1 and the Claws d4. Tools, languages, the insignia and the debt exist only in Notes. Nothing is synced to sw5e.com: the site still has the fresh level 1 build.

**After session 2:** Wookiee Berserker (Frenzied Approach) 4, Mercenary/Brawny. Instincts: Dewback's (Poison + Acid + Fire) and Predator's (speed 40). ASI Str +2 → Str 20 (19 from SW5E + the Brawny tweak). HP 39/41, HD 4/4d12, Rage 3/3, exhaustion 0, no effects, 2,700 XP, 450 cr. Weapon (Fine) is on the Vibroaxe (+8, 1d12+6). Medpac and Strength Stim used up. Datapad, 8 tweaks with reasons and notes kept. Levels 3 and 4 only reached the viewer through a javascript_tool merge, because Load from SW5E overwrote them. NOT synced: sw5e.com is signed out and its copy is far behind (Berserker 4 with no archetype, instincts, tweaks or notes, 100 cr, 4 items). No backup file exported. All tabs closed.

**Blocked or worked around:**

- A3: couldn't record the tool proficiency (Sabacc deck) or the languages (Shyriiwook, Huttese) on the sheet. They're in Notes only.
- A3: no Explorer's pack and no insignia in SW5E's item list. I added the pack contents by guesswork; the insignia is in Notes.
- A5: couldn't afford 2 Medpacs even at Kessa's 20% off (480 cr with 50 cr left). I paid 50 cr through the Pay box and recorded the 430 cr debt in Notes.
- A6: I never dropped to 0 HP (Rage resistance halved the 13-point crit to 6), so I didn't make any death saves. I wasn't concentrating, so no Con save either.
- A7: couldn't add the 'coded datapad with the smuggler's coordinates' as a story item. I added the generic Datapad and explained it in Notes. No power cells, since I don't use a blaster.
- A8: I was already at full HP (14/14) when the short rest came, so I didn't spend a hit die. I tested the flow and backed out at the 'Heal 6 and spend the d12' button.
- A10: the sheet can't level up the character (300 XP reached level 2). Left for part B.
- sw5e.com sign-in had expired (redirect to sw5e.b2clogin.com, password autofilled). I don't sign in with passwords, so levelling used the builder on the site's cached copy (signed out). Every CHARACTER SHEET save redirected to sign-in, so whether the levels reached sw5e.com's server is unknown.
- B1 (level 3) and B7 (level 4): Load from SW5E overwrote the site's level-up with my local class choices (no warning). I got the levels in only through a javascript_tool merge with the viewer's setEditedFields, which a real player can't do.
- B4: couldn't record the Poisoned condition in the sheet (no way to add conditions). I handled disadvantage by hand.
- B8 Sync to SW5E: 'Syncing…' hung 90+ s with no error (expired sign-in). Not synced; the site's copy is Berserker 4 with no archetype, instincts, tweaks or notes, 100 cr.
- B8 Export a backup: not done. 'Export all (backup)' downloads a file, which needs the user's explicit OK that I can't get inside the panel run.

**What worked (keep it):**

- Load from SW5E brought the new character in within seconds with numbers identical to the builder, and even fixed the builder's AC 11 by applying Unarmored Defense.
- The hover on changed numbers is a great teacher: 'Without tweaks or effects: 12 → now 15 · +1 AC Wookiee Hide… tweak · +2 AC + CON Unarmored Defense'.
- Start Rage in one click spends a use, adds Rage damage (1d12+6), lists resistance and advantages under Defenses & senses and shows a 'Rage' chip; End removes it all.
- Dice dock: click any number to roll; Advantage shows the struck-through die; attack then 'Hit: roll damage' / 'Critical damage'; recent rolls per character.
- Medpac Use → On me rolls d12 + Con and heals in one click, with the clear 'Healed 3 (of 12; at maximum)'; the stack count goes down.
- Damage/Heal with 'Undo: Took 6 damage' let me fix the forgotten Rage resistance.
- Buying shows the price preview, an editable price, quantity × price and a clear 'Not enough credits: 600 cr needed, 100 cr available.' The credits box accepts +150.
- The rest messages tell me what happened: 'Nothing to regain on a short rest. To heal, roll hit dice…' and 'Long rest: regained uses of Rage.'
- Tweaks keep their reasons, with a toast 'Added a tweak: Intimidation Proficient. Not synced to SW5E yet.'
- Personality is one form in one place, and Notes support Markdown that renders nicely.
- The XP box accepts '+300' arithmetic.
- Load from SW5E brought the level-2 build in cleanly when no class choice had been made locally: HP 23, 2d12 hit dice and the new feature cards, with all Session 1 data (credits, items incl. the datapad, notes, tweaks, XP) kept.
- Class choices: the Berserker Instincts picker counts 0/2 → 2/2 (green) and greys out higher-level options '(7th level)'. Predator's +10 ft applied instantly, and picking an archetype added its cards and put Danger Sense under Defenses at once.
- Start Rage/End: the Rage effect lists Dewback's line, Rage goes to 3/3 at 3rd, and the damage dock has a 'Rage Damage +2' tick box.
- Strength Stim 'Use → On me': Str 20 with a 1-hour effect, and attack/damage update everywhere (+7, 1d12+7 raging).
- Weapon (Fine), once applied to the Vibroaxe, shows 'Attack +1 / Damage +1' chips and the numbers are right (+8, 1d12+6).
- Long rest message 'regained 15 HP, uses of Rage, one level of exhaustion gone' with Undo, and an Exhaustion chip in the side summary.
- Enter applies in the XP and credits boxes; '+400' / '-100' arithmetic is handy.
- Phone frame: live HP/AC strip, section tabs that follow scrolling, one-thumb dice dock; damage/heal/undo work the same as on desktop.
- Nothing was ever lost: through two overwritten level-ups, a hung sync and a page reload, every edit stayed in the viewer.
