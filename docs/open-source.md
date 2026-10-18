# Publishing the code: checklist

What has been done towards an open repository, and what's left to decide before it's published.

## Done (2026-10-18)
- **A new repository with a fresh history**, made from the private one by an export that:
  - leaves out the owner's own characters (a sample and a dev fixture);
  - replaces the sw5e.com ids of characters and accounts in the docs;
  - checks every file for e-mail addresses, local paths and ids, and stops if it finds any.
- **No personal ids in the code.** The dev page keeps the characters it must never save or record in the
  browser (`localStorage` `sw5e-dev:protectedIds`). Until that list is set, it saves and records nothing.
- **Test characters with made-up ids.** The regression check's cases are test characters with their sw5e.com
  ids and the account's id replaced (`node dev/regress.js record`). Recording refuses a file that holds an
  e-mail address.

## Decided (2026-10-18)
- **License:** GPL-3.0 (`LICENSE`): changed versions must stay open, as with the SW5e system for Foundry VTT.
- **Author:** the owner's own name and e-mail in the history.
- **The process docs are published:** `docs/panel/`, the wishlist and the class audit, with ids removed. They
  describe simulated players testing on a test account.
- **Own rules engine** for the numbers, checked against SW5E's while it's built and from time to time after
  (see [phone-app.md](phone-app.md)).

## Still to decide
1. **SW5E's text in the test cases.** The cases (`dev/regress/cases/`) hold SW5E's computed sheets, which quote
   feature and item text. SW5E's rules and item data as a whole (`dev/dumps/`) is git-ignored. I found no
   license SW5E publishes for its content, and its Star Wars material belongs to Lucasfilm/Disney. Kept for now
   (short excerpts, and the check needs them). The other options:
   - strip the text from the cases: the check then covers less, because features are read from that text;
   - keep the cases out of the public repository: the check then works only where someone records their own.
2. **sw5e.com.** The extension runs sw5e.com's own code in a sw5e.com tab to load, compute and save characters.
   Before publishing:
   - tell the SW5E team, and ask whether they mind;
   - ask whether their character builder's code is available, which would help the own engine.
3. **Name.** "SW5E" is the community project's name. Check whether the SW5E team is fine with it in the name,
   or pick another.

## Before each push
- `node dev/regress.js`: the check passes.
- Search the change for ids and personal details. The export script does this for the first commit; later
  commits are ordinary, so mind recorded cases and pasted logs.
