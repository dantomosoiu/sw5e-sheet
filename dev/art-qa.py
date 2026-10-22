"""Sanity checks for the sheet's pictures (art/items, art/equipment): symmetry, stray bits, cut-off parts.

  python dev/art-qa.py                       every picture
  python dev/art-qa.py --only eq-combat-suit,armor-*,eq-*-shield    (names as in dev/art.py previews; * = prefix)
  python dev/art-qa.py --flagged             only list the flagged ones (and draw sheets for them)

Each picture is rendered alone, large, on black and on white; the difference gives its exact coverage (glows
included, faint glow left out of the shape). Then:

- symmetry: the shape against its mirror image about its own centre line (1.00 = perfectly symmetric). Front-view
  things (armor, suits, shields, helmets, masks, robes, pairs of gloves or greaves…) are expected to be symmetric:
  below 0.90 they are flagged, and the parts that have no mirror twin are painted red on the review sheet;
- stray bits: separate pieces far from the main shape and too small to be a part of the design (four or more pieces of
  about the same size are a pattern, like a dashed outline or a hex grid, and are only noted);
- cut off: shape touching the canvas edge (a glow or part cropped by the 64-unit box).

A flag a reviewer looked at and kept on purpose (sparks at a cutter's tip, a wrap tunic's crossed front) goes in
art/qa-accepted.txt as `<picture> <outline|detail|stray|edge>: <why>`; it is then listed apart, and the report says
when an accepted flag no longer fires so the line can go.

Writes dist/art/qa/<run>/report.md and sheet-<n>.png (the run folder is printed; --out NAME picks it) (each picture, its mirror difference in red, its score).
Needs Pillow and numpy, and headless Chrome or Edge (as dev/art.py).
"""
import importlib.util
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
QA = ROOT / 'dist' / 'art' / 'qa'  # each run writes to its own folder in here (several reviewers run at once)
spec = importlib.util.spec_from_file_location('art', ROOT / 'dev' / 'art.py')
art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(art)

SIZE = 192       # px per picture when measured
PER_PAGE = 48    # pictures per rendered page (8 x 6)
COLS = 8

# Pictures that face the viewer square-on and should mirror left to right (by name; eq- = one item's picture).
SYMMETRIC = re.compile(r'(armor|armour|-suit\b|suit$|exoskeleton|exo$|shield(?!-generator)|helmet|mask|goggles|visor|robe|cloak|cape|cowl|mantle|'
                       r'vest|tunic|clothes|jetpack|rocketpack|propulsion-pack|repulsor-pack|gloves|greaves|handwraps$|amulet|necklace|'
                       r'beskargam|crushgaunts|circlet|headgear|droid-protocol|chassis$)')
# … except these, which are lopsided on purpose (half-built chassis, single shoulder pieces, side views, worn on one side).
NOT_SYMMETRIC = re.compile(r'(cloak-chassis|pants-chassis|tunic-chassis|handwraps-chassis|blaster-chassis|vibroweapon-chassis|lightweapon-chassis|eq-handwraps$|ship-armor|implements$|-kit$|pauldron|'
                           r'shield-generator|vibroshield|bone-light-shield|crystadium|ship-shield|shoulder|wrist|bracer|vambraces|boots)')


ACCEPTED = ROOT / 'art' / 'qa-accepted.txt'
CHECKS = {'outline', 'detail', 'stray', 'edge'}


def load_accepted():
    """{picture: {check: why}} from art/qa-accepted.txt, the flags a reviewer looked at and kept on purpose."""
    out = {}
    for i, line in enumerate(ACCEPTED.read_text(encoding='utf-8').splitlines() if ACCEPTED.exists() else [], 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        head, _, why = line.partition(':')
        parts = head.split()
        if len(parts) != 2 or parts[1] not in CHECKS or not why.strip():
            sys.exit(f'art/qa-accepted.txt line {i}: expected "<picture> <{"|".join(sorted(CHECKS))}>: <why>"')
        out.setdefault(parts[0], {})[parts[1]] = why.strip()
    return out


def clearly_fine(res, check):
    """An accepted flag is only reported as no longer needed with a margin: scores right at a limit flicker from run
    to run with antialiasing."""
    if check == 'outline':
        return res.get('symmetry', 1) >= 0.98
    if check == 'detail':
        return res.get('detail_symmetry', 1) >= 0.95
    if check == 'stray':
        return not res.get('bits')
    return True


def render(names, bg):
    """{name: RGB array} for the pictures, each alone on a plain background of colour `bg`."""
    sprite = art.sprite_text()
    out = {}
    css = (ROOT / 'app' / 'art' / 'art.css').as_uri()
    for start in range(0, len(names), PER_PAGE):
        page = names[start:start + PER_PAGE]
        rows = -(-len(page) // COLS)
        cells = ''.join(f'<div style="width:{SIZE}px;height:{SIZE}px;float:left"><svg viewBox="0 0 64 64" width="{SIZE}" height="{SIZE}">'
                        f'<use href="#i-{n}"/></svg></div>' for n in page)
        html = (f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{css}">'
                f'<style>html,body{{margin:0;background:{bg}}} body{{width:{SIZE * COLS}px}}</style></head><body>{sprite}{cells}</body></html>')
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / 'p.html'
            src.write_text(html, encoding='utf-8')
            png = Path(tmp) / 'p.png'
            subprocess.run([art.find_chrome(), '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                            '--force-device-scale-factor=1', f'--user-data-dir={tmp}/prof', f'--screenshot={png}',
                            f'--window-size={SIZE * COLS},{SIZE * rows}', src.as_uri()],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
            im = np.asarray(Image.open(png).convert('RGB')).astype(np.int16)
        for i, n in enumerate(page):
            r, c = divmod(i, COLS)
            out[n] = im[r * SIZE:(r + 1) * SIZE, c * SIZE:(c + 1) * SIZE]
    return out


def components(mask):
    """Connected pieces of a boolean mask: [(size, (y0, x0, y1, x1), pixels)]."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    out = []
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        stack = [(y, x)]
        seen[y, x] = True
        pts = []
        while stack:
            cy, cx = stack.pop()
            pts.append((cy, cx))
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        a = np.array(pts)
        out.append((len(pts), (a[:, 0].min(), a[:, 1].min(), a[:, 0].max(), a[:, 1].max()), a))
    return sorted(out, key=lambda t: -t[0])


def measure(name, black, white):
    black = black.astype(float)
    white = white.astype(float)
    # Coverage: where black and white renders agree the picture is opaque; the gap is the background showing through.
    alpha = 1 - (white - black).clip(0, 255).mean(axis=2) / 255.0
    solid = alpha > 0.55
    res = {'name': name, 'flags': [], 'notes': []}
    if not solid.any():
        res['flags'].append(('empty', 'nothing drawn'))
        return res, alpha, solid, None
    ys, xs = np.nonzero(solid)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    edge = 2
    if x0 <= edge or y0 <= edge or x1 >= SIZE - 1 - edge or y1 >= SIZE - 1 - edge:
        res['flags'].append(('edge', 'touches the canvas edge (cut off?)'))
    # Symmetry about the shape's own centre line.
    cx = (x0 + x1) / 2
    shift = int(round(SIZE / 2 - cx))
    centred = np.roll(solid, shift, axis=1)
    mirror = centred[:, ::-1]
    inter = (centred & mirror).sum()
    union = (centred | mirror).sum()
    sym = inter / union if union else 1.0
    res['symmetry'] = round(float(sym), 3)
    expected = bool(SYMMETRIC.search(name)) and not NOT_SYMMETRIC.search(name)
    res['expected_symmetric'] = expected
    diff = np.roll(centred & ~mirror, -shift, axis=1)
    if expected and sym < 0.97:
        res['flags'].append(('outline', f'outline not symmetric ({sym:.2f}): parts stick out on one side (red)'))
    # The details inside the outline, against their mirror: a pocket, strap or plate on one side only shows here.
    grey = (black + white) / 2
    cg = np.roll(grey, shift, axis=1)
    both = centred & mirror
    detail = (np.abs(cg - cg[:, ::-1]).mean(axis=2) > 55) & both
    dsym = 1 - detail.sum() / max(1, both.sum())
    res['detail_symmetry'] = round(float(dsym), 3)
    if expected and dsym < 0.93:
        res['flags'].append(('detail', f'details not symmetric ({dsym:.2f}): things on one side only (orange)'))
    diff = (diff, np.roll(detail, -shift, axis=1))
    # Stray bits: small separate pieces apart from the main shape. Four or more pieces of about the same size are a
    # pattern (a dashed outline, a hex grid, shimmer lines), not strays.
    comps = components(solid)
    main = comps[0][0]
    bits = [(size, (bx0 + bx1) // 2, (by0 + by1) // 2) for size, (by0, bx0, by1, bx1), _ in comps[1:]
            if 6 <= size < max(12, main * 0.004)]  # (smaller: antialiasing specks at a blade's tip)
    pattern = [sum(1 for o in bits if 0.6 <= o[0] / b[0] <= 1.67) >= 4 for b in bits]
    res['bits'] = len(bits)
    if any(pattern):
        res['notes'].append(f'a pattern of {sum(pattern)} small pieces (dashes, a grid, shimmer)')
    for (size, x, y), in_pattern in zip(bits, pattern):
        if not in_pattern:
            res['flags'].append(('stray', f'stray bit of {size} px at ({x},{y})'))
    return res, alpha, solid, diff


def main():
    args = sys.argv[1:]
    only = args[args.index('--only') + 1] if '--only' in args else ''
    names = art.select(only)
    files = {('eq-' + p.stem if p.parent.name == 'equipment' else p.stem): p for p, _ in art.pictures()}
    import hashlib
    OUT = QA / (args[args.index('--out') + 1] if '--out' in args else 'run-' + hashlib.sha1(only.encode()).hexdigest()[:8])
    OUT.mkdir(parents=True, exist_ok=True)
    blacks = render(names, '#000')
    whites = render(names, '#fff')
    accepted = load_accepted()
    results = []
    sheets = []
    for n in names:
        res, alpha, solid, diff = measure(n, blacks[n], whites[n])
        ok = accepted.get(n, {})
        res['accepted'] = [(k, f, ok[k]) for k, f in res['flags'] if k in ok]
        res['flags'] = [(k, f) for k, f in res['flags'] if k not in ok]
        res['stale'] = [k for k in ok if k not in {a[0] for a in res['accepted']} and clearly_fine(res, k)]
        results.append(res)
        if res['flags'] or '--all-sheets' in args:
            # Review image: the picture on grey, and its mirror difference in red (expected-symmetric ones).
            im = Image.fromarray(((blacks[n] + whites[n]) / 2).clip(0, 255).astype('uint8'))
            if diff is not None and res.get('expected_symmetric'):
                outline, inner = diff
                orange = Image.new('RGB', im.size, (255, 150, 0))
                im = Image.composite(orange, im, Image.fromarray((inner * 110).astype('uint8')))
                red = Image.new('RGB', im.size, (255, 40, 40))
                im = Image.composite(red, im, Image.fromarray((outline * 170).astype('uint8')))
            d = ImageDraw.Draw(im)
            d.text((4, 2), n, fill=(255, 255, 0))
            d.text((4, SIZE - 14), f"sym {res.get('symmetry', '-')} / detail {res.get('detail_symmetry', '-')}", fill=(255, 255, 0))
            sheets.append(im)
    flagged = [r for r in results if r['flags']]
    kept = [r for r in results if r['accepted']]
    stale = [r for r in results if r['stale']]
    lines = ['# Picture QA', '', f'{len(results)} pictures, {len(flagged)} flagged, {len(kept)} with accepted flags.', '']
    for r in flagged:
        lines.append(f"- **{r['name']}** (symmetry {r.get('symmetry', '-')}{', expected symmetric' if r.get('expected_symmetric') else ''}): "
                     + '; '.join(f for _, f in r['flags']))
    if kept:
        lines += ['', '## Accepted (art/qa-accepted.txt)', '']
        lines += [f"- {r['name']}: " + '; '.join(f'{f}: {why}' for _, f, why in r['accepted']) for r in kept]
    if stale:
        lines += ['', '## No longer flagged (remove from art/qa-accepted.txt)', '']
        lines += [f"- {r['name']} {k}" for r in stale for k in r['stale']]
    (OUT / 'report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    for old in OUT.glob('sheet-*.png'):
        old.unlink()
    for i in range(0, len(sheets), 24):
        group = sheets[i:i + 24]
        cols = 6
        rows = -(-len(group) // cols)
        sheet = Image.new('RGB', (cols * SIZE, rows * SIZE), (20, 20, 20))
        for j, im in enumerate(group):
            sheet.paste(im, ((j % cols) * SIZE, (j // cols) * SIZE))
        sheet.save(OUT / f'sheet-{i // 24 + 1}.png')
    rel = OUT.relative_to(ROOT).as_posix()
    print(f'{len(results)} pictures, {len(flagged)} flagged ({len(kept)} more with accepted flags): {rel}/report.md and '
          f'{-(-len(sheets) // 24)} sheet(s) {rel}/sheet-*.png')
    if '--flagged' in args or len(flagged) <= 40:
        for r in flagged:
            print(f"  {r['name']}: {'; '.join(f for _, f in r['flags'])}")
    for r in stale:
        print(f"  {r['name']}: no longer flagged for {', '.join(r['stale'])}; remove it from art/qa-accepted.txt")


if __name__ == '__main__':
    main()
