# Player panel, round 2: a simulated campaign with full wishlist tracking

You are one player in a panel of five. Each player creates a character, plays a scripted game session with it,
levels it up, plays again, and writes down **every wish**: anything broken, missing, confusing, slow or
surprising, and anything you had to work around. The wishes are merged into one tracked wishlist that decides what
gets built next, so completeness matters more than polish: if you thought "I wish…", it's a wish.

## The product

A Chrome extension, the "SW5E Character Sheet Viewer" (code in `sw5e-sheet/`,
user guide in `sw5e-sheet/README.md`; read the README first, as a player would skim it). It shows a Star Wars 5e
(SW5E) character on one page and lets you edit and play it: play tracker (HP, dice, points, death saves, rests),
inventory and credits, class choices, powers, feature states (Rage…), effects, tweaks, a dice roller.

The owner's direction: **the extension is to become the only place to edit the character**. Its stored copy is the
character's data; sw5e.com is used for rules and mechanics (its rules engine computes every number). Today, rules-heavy
changes (creating a character, levels, multiclassing) still happen in sw5e.com's builder and are brought in with
**Load from SW5E**. Wishes about doing those in the extension are exactly what the owner wants to hear about, with
details: which steps, which choices, what the builder does badly.

## Your environment

- Browser: the Claude-in-Chrome tools (`mcp__claude-in-chrome__*`; load them with ToolSearch in ONE call:
  `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__file_upload`).
  Call `tabs_context_mcp` with `createIfEmpty: true`, then make your own tabs with `tabs_create_mcp`. **Close every
  tab you opened before you finish.** Only one player uses the browser at a time.
- **The sheet (desktop):** http://127.0.0.1:8765/ — the dev copy of the viewer. It behaves like the installed
  extension (loading and recalculating go through the real extension and sw5e.com). Never add `?reset` to this URL
  (it wipes everyone's data).
- **The sheet in a phone/tablet frame:** http://127.0.0.1:8765/dev/phone.html?w=390&h=844 (phone) or `?w=800&h=1000`
  (tablet): the same viewer, same data, at that width. Click inside the frame by coordinates as usual. From
  `javascript_tool`, the viewer's window is `document.getElementById('view').contentWindow`.
- Have only **one viewer page open at a time** (desktop or frame), to keep its storage consistent.
- **sw5e.com** (https://sw5e.com/tools/mycharacters) is signed in to an account made for this testing. Create and edit
  **your own character** there freely (the round "+" button creates one). Never touch other characters: not "Berserker
  Test (Claude)", "Scholar Test (Claude)", "Edit Test (Claude)", nor other panel players' characters. In the viewer, never
  change the owner's real character or the "… Test" characters; select your own character
  by name before every action.
- Do **not** edit any repository file, run git, or restart the dev server. You may read code to check a suspicion
  ("is there really no level-up screen?"), but play as a player: use the UI. `javascript_tool` is for reading state
  (e.g. in the viewer `state.snapshots[state.current]`, `buildModel(...)`) or for a workaround when the UI blocks you
  (say so in the log).
- Be efficient: batch actions with `browser_batch`, take screenshots at `scale: 0.5` unless you need detail, prefer
  `find`/`read_page`/`get_page_text` for reading. If something fails 2–3 times, write it down as a wish and move on.
  Avoid triggering browser alert/confirm dialogs.
- Your log goes in `docs/panel/2026-10-17/<your-first-name>-<part>.md`
  (part `a` or `b`): one line or short paragraph per step, in order, with what you did, what you saw (exact message
  texts, numbers), and `WISH:` lines inline. Write it as you go (create it early, append regularly) so nothing is lost
  if you run out of context.

## What counts as a wish (record all of them)

- **bug**: wrong number, wrong rule, error, lost data, something that didn't do what it said.
- **missing**: something you needed and couldn't do in the extension (say what you did instead).
- **improvement**: it works but is slow, takes too many clicks, or could do more for you.
- **confusing**: you couldn't find it, misread it, or a message/label didn't tell you what you needed.
- **rules**: you're unsure the sheet follows SW5E's rules (quote the rule if you can find it).
Each wish: a short title, a user story ("When I …, I want … so that …"), the step where it happened, what you saw
(evidence), how to reproduce, what you expected, and any workaround. Priority from your seat at the table:
`blocker` (couldn't continue the session), `high` (slowed the table down or got a number wrong), `medium`, `low`.
Also note what worked well (praise), briefly: it tells the owner what not to break.

## The campaign (the GM's script)

Use these events and numbers. Where the script says "roll", roll with the sheet's dice roller and use the result.
If the sheet can't do a step, do it the way you would at a real table (pen and paper, sw5e.com…), note the
workaround, and carry on.

### Part A — character creation and Session 1 ("Trouble on Ord Mantell"), level 1

A1. **Create** a level 1 character for your class (below) on sw5e.com: species, class, ability scores, background,
    skills, equipment/credits, powers if you cast. Name it "<PC name> (Panel)". Note every place the builder was slow,
    unclear or wrong, and which of these steps you'd want in the extension.
A2. **Bring it into the sheet** (desktop or your frame) and check the numbers against the builder (AC, HP, attacks,
    saves, skills, powers).
A3. **Set up** in the sheet: class choices that apply at level 1 (fighting style, powers, maneuvers…), personality,
    notes, starting equipment you still need.
A4. Cantina: the contact wants a **Persuasion** check, then an **Insight** check with advantage (the contact likes you).
A5. Shopping at Kessa's Outfitters: **buy two Medpacs** at the standard price and one item that suits your class.
    If you can't afford it, Kessa gives you 20% off: pay that price.
A6. Ambush at the docks, three rounds. **Roll initiative.**
    Round 1: attack a thug (attack roll, then damage) and use your signature class feature or a power. You take
    **6 kinetic damage**.
    Round 2: a thug lands a critical hit: **13 kinetic damage**. If you drop to 0, make death saves until you're stable
    or healed.
    Round 3: an ally uses a **Medpac on you: you regain 6 HP**. Then use one of **your own Medpacs on yourself**.
    If you're concentrating on a power, you also take **4 damage** and make the **Constitution save (DC 10)**.
    After the fight, end whatever has run out.
A7. Loot: **150 credits**; a **Strength Stim (Basic)**; a **"coded datapad with the smuggler's coordinates"** (a story
    item, not in SW5E's lists); if you use a blaster, **10 power cells**.
A8. **Short rest**: spend hit dice to heal.
A9. The GM gives you **Inspiration** for a good roleplay moment; you use it later on a **Stealth** check.
A10. **Long rest.** The GM awards **300 XP**: record it.
End of part A: in the log, a short hand-off: character name and id, level, HP, credits, notable items, anything
not yet in the sheet.

### Part B — levelling up, Session 2 ("The Smuggler's Hideout"), level 4, wrap-up

Start by reading your part A log. The GM awards XP up to **900** (level 3).
B1. **Level up to 2, then 3** (choose your archetype; see your class below). Try to do it in the extension first; if
    you can't, do it where you can and bring it back. Then check that nothing from Session 1 was lost (HP, hit dice,
    credits, inventory incl. the datapad and medpacs, notes, choices, effects).
B2. Make the new levels' choices (archetype features, powers, maneuvers, options).
B3. Stealth approach: a group **Stealth** check (use your Inspiration if you still have it).
B4. Boss fight, three rounds. **Roll initiative.** Round 1: use your new archetype feature. The boss's blade
    **poisons** you (the Poisoned condition, 1 minute): **8 energy damage + 5 poison damage**. Round 2: a **critical hit
    for 18 kinetic damage**; if you drop, death saves. Use the **Strength Stim (Basic)** on yourself. Round 3: finish
    the boss with your best attack (on a natural 20, roll critical damage). After the fight the poison wears off.
B5. Aftermath: use a **Medpac on an ally** (on someone else). A forced march: **1 level of exhaustion**. Loot: **400
    credits** and an enhanced weapon or armor of your choice from SW5E's list (uncommon or rarer; equip/attune it if it
    makes sense); give **100 credits** to a party member.
B6. **Long rest.** The GM awards XP to **2,700** (level 4).
B7. **Level up to 4**: Ability Score Improvement or a feat (see your class). Same as B1: in the extension if you can.
B8. Wrap-up: put your data back on sw5e.com (**Sync to SW5E**) and check the site's copy; **export a backup**;
    finally play one quick round in the phone frame (take 5 damage, heal 3, roll an attack) if you haven't been
    playing on a phone all along.

## The panel

| Player | Plays | Class path | How they play |
|---|---|---|---|
| **Mira** | a Consular | Consular 1 → 3 (Way of …, your pick) → 4 (feat) | Long-time D&D 5e player, new to SW5E. Desktop. Lives in powers, force points and concentration; hates re-typing anything. |
| **Tomas** | a Fighter who multiclasses | Fighter 1 → Fighter 2 → **Operative 1** at level 3 → **Fighter 3** (archetype) at level 4 | Optimizer. Desktop. Checks attack bonuses, AC and damage against his own math; wants multiclassing to just work. |
| **Jun** | an Engineer | Engineer 1 → 3 (archetype) → 4 (ASI) | Phone-only player: plays the whole sheet in the 390px frame (`/dev/phone.html?w=390&h=844`); does sw5e.com in a normal tab only because it must. Tech powers, tech points. |
| **Priya** | a Guardian | Guardian 1 → 3 (Form archetype or other) → 4 (ASI) | Rules lawyer. Tablet (`/dev/phone.html?w=800&h=1000`). Reads rules text and checks the sheet follows it: forms, force + martial. |
| **Sam** | a Berserker | Berserker 1 → 3 (Approach) → 4 (ASI) | First tabletop RPG ever. Desktop. Relies on the sheet to explain what to do and what a number means; reads every message. Rage, medpacs. |
