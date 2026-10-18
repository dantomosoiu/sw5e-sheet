"""Render docs/wishlist.md from docs/wishlist.json (the tracked wishlist from the player panels).

Edit the JSON (an item's `state`, `resolution`, or new items), then run this to regenerate the Markdown.
States: open, fixed, partly fixed, decision (waiting for the owner), decided, upstream (sw5e.com's own
data or builder), not a bug, works (already there).
Usage: python dev/wishlist.py
"""
import collections
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'docs' / 'wishlist.json'
OUT = ROOT / 'docs' / 'wishlist.md'

PRIORITIES = ['blocker', 'high', 'medium', 'low']
STATES = ['open', 'partly fixed', 'decision', 'fixed', 'decided', 'upstream', 'not a bug', 'works']
DONE = {'fixed', 'decided', 'upstream', 'not a bug', 'works'}
AREAS = {
    'creation': 'Creating a character', 'level-up': 'Levelling up', 'loading-sync': 'Loading and syncing',
    'class-choices': 'Class choices', 'powers': 'Powers', 'combat-tracker': 'Combat and the play tracker',
    'effects-states': 'Effects, states and conditions', 'inventory-credits': 'Inventory and credits',
    'dice-roller': 'Dice roller', 'rests': 'Rests', 'phone-tablet': 'Phone and tablet',
    'navigation-layout': 'Navigation and layout', 'data-backup': 'Data and backups',
    'rules-accuracy': 'Rules accuracy', 'other': 'Other',
}


def cell(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')


def ref_link(ref, logs):
    who, _, step = ref.partition('-')
    part = 'a' if step[:1].upper() == 'A' else 'b'
    return f'[{ref}]({logs}{who.lower()}-{part}.md)'


def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    items = data['items']
    logs = data['rounds'][-1]['logs'].replace('docs/', '', 1)
    out = ['# Wishlist', '',
           '_Generated from `docs/wishlist.json` by `python dev/wishlist.py`: edit the JSON, not this file._', '',
           data['about'].split(' Edit this file')[0], '']
    for rnd in data['rounds']:
        out += [f"**{rnd['id']} ({rnd['date']}).** {rnd['what']} Brief: `{rnd['brief']}`; logs in `{rnd['logs']}`.", '']

    by_state = collections.Counter((i['state'], i['priority']) for i in items)
    out += ['## Status', '', '| State | ' + ' | '.join(p.capitalize() for p in PRIORITIES) + ' | Total |',
            '|---|' + '---:|' * (len(PRIORITIES) + 1)]
    for s in STATES:
        row = [by_state[(s, p)] for p in PRIORITIES]
        if sum(row):
            out.append(f'| {s} | ' + ' | '.join(str(n or '') for n in row) + f' | {sum(row)} |')
    out.append(f'| **all** | ' + ' | '.join(str(sum(by_state[(s, p)] for s in STATES)) for p in PRIORITIES) + f' | {len(items)} |')
    out.append('')

    out += ['## By area', '', '| Area | Still to do | Done | Total |', '|---|---:|---:|---:|']
    for a, label in AREAS.items():
        its = [i for i in items if i['area'] == a]
        if its:
            done = sum(i['state'] in DONE for i in its)
            out.append(f'| [{label}](#{a}) | {len(its) - done} | {done} | {len(its)} |')
    out.append('')

    byid = {i['id']: i for i in items}
    if data.get('themes'):
        out += ['## Proposed next steps', '',
                'What is still open, grouped into pieces of work to choose from (largest player impact first).', '']
        for n, th in enumerate(data['themes'], 1):
            todo = [byid[x] for x in th['items'] if x in byid and byid[x]['state'] not in DONE]
            out += [f"{n}. **{th['name']}**: {len(todo)} open, effort {th['effort']}. {th['why']}", '']
            out += [f"   - [{i['id']}](#{i['id'].lower()}) {i['title']} ({i['priority']})" for i in todo] + ['']

    def order(i):
        return (i['state'] in DONE, STATES.index(i['state']), PRIORITIES.index(i['priority']), list(AREAS).index(i['area']), i['id'])

    out += ['## Index', '', 'Still to do first (open, partly fixed, waiting for a decision), by priority; then what is done.', '',
            '| ID | Priority | State | Title | Kind | Area | Checked | Effort |', '|---|---|---|---|---|---|---|---|']
    for i in sorted(items, key=order):
        v = i['verified']
        out.append(f"| [{i['id']}](#{i['id'].lower()}) | {i['priority']} | {i['state']} | {cell(i['title'])} | {i['kind']} | "
                   f"{i['area']} | {v['status']} | {v['effort']} |")
    out.append('')

    out += ['## Items', '']
    for a, label in AREAS.items():
        its = [i for i in items if i['area'] == a]
        if not its:
            continue
        out += [f'<a id="{a}"></a>', f'### {label}', '']
        for i in sorted(its, key=lambda i: (PRIORITIES.index(i['priority']), i['id'])):
            v = i['verified']
            refs = ', '.join(ref_link(r, logs) for r in i['refs'])
            out += [f'<a id="{i["id"].lower()}"></a>', f"#### {i['id']} {i['title']}", '',
                    f"**{i['state']}** · {i['priority']} · {i['kind']} · reported by {', '.join(i['reporters'])} ({refs})", '',
                    f"> {i['story']}", '',
                    f"- **What they saw:** {i['evidence']}",
                    f"- **To reproduce:** {i['repro']}",
                    f"- **Expected:** {i['expected']}"]
            if i.get('workarounds'):
                out.append(f"- **Workaround used:** {i['workarounds']}")
            out.append(f"- **Checked against the code:** {v['status']}, effort {v['effort']}, `{v['where']}`. {v['note']}")
            if i.get('resolution'):
                commit = f" (`{i['commit']}`)" if i.get('commit') else ''
                out.append(f"- **Resolution:** {i['resolution']}{commit}")
            out.append('')

    for rnd in data['rounds']:
        out += [f"## Panel {rnd['id']} ({rnd['date']})", '', '### Characters', '',
                '| Player | Plays | Device | Character (id on the test account) |', '|---|---|---|---|']
        for p in rnd['players']:
            out.append(f"| {p['player']} | {cell(p['plays'])} | {p['device']} | {cell(p['character']['name'])} `{p['character']['id']}` |")
        out.append('')
        for p in rnd['players']:
            out += [f"#### {p['player']}: {p['character']['name']}", '', f"_{p['style']}._", '',
                    f"**After session 1:** {p['afterSession1']}", '', f"**After session 2:** {p['afterSession2']}", '',
                    '**Blocked or worked around:**', ''] + [f'- {b}' for b in p['blocked']] + [
                    '', '**What worked (keep it):**', ''] + [f'- {x}' for x in p['praise']] + ['']

    OUT.write_text('\n'.join(out), encoding='utf-8', newline='\n')
    print(f'Wrote {OUT.relative_to(ROOT)} ({len(items)} items)')


if __name__ == '__main__':
    main()
