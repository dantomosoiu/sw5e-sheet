"""The sheet's item pictures (art/README.md): check them, build the sprite, and preview them.

  python dev/art.py                         check art/items/*.svg and write app/art/items.svg
  python dev/art.py check                   only check
  python dev/art.py preview [options]       dist/art/preview.html and a PNG of it (headless Chrome or Edge)
      --only a,b,c        just these pictures (names without .svg; a trailing * matches a prefix: blaster-*)
      --scale N           tile size in px (default 72; 160 to look at details)
      --themes LIST       style:mode pairs, e.g. standard:dark,scholar:light (default: four of them)
      --out FILE          the PNG (default dist/art/preview.png)
      --emblems           the class emblems (app/art/themes/*-emblem.svg) instead of the item pictures
  python dev/art.py items [--names "Grenade, ion;Brightsaber"] [--themes …] [--out FILE]
                                            real SW5E items on their tiles, as the sheet shows them (every picture once
                                            without --names): picture, badge, energy colour and rarity
  python dev/art.py themes [--styles a,b] [--modes dark,light] [--size 1200x820] [--out FILE]
                                            the sheet itself in each class style (its art, colours and pictures):
                                            a copy of the dev page saved as dev/dumps/mock.html (see dev/README.md)

The preview draws every picture on the app's own tiles, with the app's CSS (viewer.css, themes.css, art.css), in
each theme, and once more with each rarity's tile, so what you see is what the sheet shows.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ITEMS = ROOT / 'art' / 'items'
DEFS = ROOT / 'art' / 'defs.svg'
SPRITE = ROOT / 'app' / 'art' / 'items.svg'
OUT = ROOT / 'dist' / 'art'
SVG_NS = 'http://www.w3.org/2000/svg'
ALLOWED_TAGS = {'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'clipPath', 'mask', 'use'}
CLASSES = {'a-b', 'a-m', 'a-d', 'a-c', 'a-x', 'a-s', 'a-g', 'a-w', 'a-o', 'a-oo', 'a-l', 'a-p', 'a-gl'}
SHARED_IDS = {'a-glow', 'a-glow-lg', 'a-sheen', 'a-shade'}
RARITIES = ['standard', 'premium', 'prototype', 'advanced', 'legendary', 'artifact']
CHROMES = [os.environ.get('CHROME', ''), r'C:\Program Files\Google\Chrome\Application\chrome.exe',
           r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
           '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']


def local(tag):
    return tag.split('}', 1)[-1]


def check_file(path):
    """Problems with one picture (empty list: fine)."""
    name = path.stem
    problems = []
    data = path.read_bytes()
    if len(data) > 5200:
        problems.append(f'{len(data)} bytes (keep it under 5 KB)')
    try:
        root = ET.fromstring(data)
    except ET.ParseError as e:
        return [f'not valid XML: {e}']
    if local(root.tag) != 'svg':
        problems.append('the top element must be <svg>')
    if root.get('viewBox') != '0 0 64 64':
        problems.append('viewBox must be "0 0 64 64"')
    for attr in ('width', 'height', 'style'):
        if root.get(attr) is not None:
            problems.append(f'no {attr} on <svg>')
    for el in root.iter():
        tag = local(el.tag)
        if tag not in ALLOWED_TAGS:
            problems.append(f'<{tag}> is not allowed')
        for k, v in el.attrib.items():
            k = local(k)
            if k.startswith('on'):
                problems.append(f'event attribute {k}')
            if k in ('fill', 'stroke') and v not in ('none',) and not re.fullmatch(r'url\(#[\w-]+\)', v):
                problems.append(f'{k}="{v}" on <{tag}>: colours come from classes (art/README.md)')
            if k in ('fill', 'stroke', 'filter', 'clip-path', 'mask') and v.startswith('url('):
                ref = v[5:-1]
                if ref not in SHARED_IDS and not ref.startswith(name + '-'):
                    problems.append(f'{k} refers to #{ref}: use the shared ones or ids starting with "{name}-"')
            if k == 'style' and re.search(r'(fill|stroke|color)\s*:', v):
                problems.append(f'style="{v}": colours come from classes')
            if k == 'id' and not v.startswith(name + '-'):
                problems.append(f'id "{v}" must start with "{name}-"')
            if k == 'class':
                bad = [c for c in v.split() if c not in CLASSES]
                if bad:
                    problems.append(f'unknown class {" ".join(bad)}')
            if k == 'href' and not v.startswith('#'):
                problems.append(f'href="{v}" (no outside references)')
    return problems


def check(quiet=False):
    files = sorted(ITEMS.glob('*.svg'))
    bad = 0
    for f in files:
        problems = check_file(f)
        if problems:
            bad += 1
            print(f'{f.name}:', *('  - ' + p for p in problems), sep='\n')
    if not quiet:
        print(f'{len(files)} pictures, {bad} with problems')
    return bad == 0


def symbol(path):
    """One picture as a <symbol id="i-<name>">."""
    text = path.read_text(encoding='utf-8')
    inner = re.sub(r'^\s*<svg[^>]*>|</svg>\s*$', '', text.strip(), flags=re.S)
    inner = re.sub(r'>\s+<', '><', inner.strip())
    return f'<symbol id="i-{path.stem}" viewBox="0 0 64 64">{inner}</symbol>'


def sprite_text():
    defs = DEFS.read_text(encoding='utf-8')
    defs = re.search(r'<defs>.*</defs>', defs, re.S).group(0)
    defs = re.sub(r'<!--.*?-->', '', defs, flags=re.S)
    defs = re.sub(r'>\s+<', '><', defs)
    symbols = ''.join(symbol(p) for p in sorted(ITEMS.glob('*.svg')))
    return ('<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" '
            'style="position:absolute;width:0;height:0;overflow:hidden">' + defs + symbols + '</svg>\n')


def build():
    ok = check(quiet=True)
    SPRITE.parent.mkdir(parents=True, exist_ok=True)
    text = sprite_text()
    if not SPRITE.exists() or SPRITE.read_text(encoding='utf-8') != text:
        SPRITE.write_text(text, encoding='utf-8', newline='\n')
    n = len(list(ITEMS.glob('*.svg')))
    print(f'app/art/items.svg: {n} pictures, {len(text) // 1024} KB' + ('' if ok else ' (some have problems, see above)'))
    return ok


def select(only):
    names = sorted(p.stem for p in ITEMS.glob('*.svg'))
    if not only:
        return names
    out = []
    for want in only.split(','):
        want = want.strip()
        out += [n for n in names if (n.startswith(want[:-1]) if want.endswith('*') else n == want)]
    return out


def find_chrome():
    for c in CHROMES:
        if c and Path(c).exists():
            return c
    sys.exit('No Chrome or Edge found: set CHROME to its path.')


def page(rel, sprite, style, mode, title, cells, scale):
    return f'''<!doctype html><html data-style="{style}" data-theme="{mode}"><head><meta charset="utf-8">
<link rel="stylesheet" href="{rel}/viewer.css"><link rel="stylesheet" href="{rel}/themes.css"><link rel="stylesheet" href="{rel}/art/art.css">
<style>
  body {{ margin: 0; padding: 10px 14px 14px; font: 12px/1.3 var(--font); }}
  h2 {{ margin: 0 0 8px; font-size: 13px; color: var(--accent); text-transform: uppercase; letter-spacing: .1em; }}
  .grid {{ display: flex; flex-wrap: wrap; gap: 10px; }}
  figure {{ margin: 0; width: {scale + 18}px; display: grid; justify-items: center; gap: 4px; }}
  figcaption {{ color: var(--muted); font-size: 11px; text-align: center; word-break: break-word; }}
  .emb {{ display: grid; place-items: center; }} .emb img {{ width: 100%; height: 100%; }}
</style></head><body>{sprite}<h2>{title}</h2><div class="grid">{cells}</div></body></html>'''


def shoot(html, png, height, chrome):
    src = png.with_suffix('.html')
    src.write_text(html, encoding='utf-8')
    with tempfile.TemporaryDirectory() as prof:
        subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--user-data-dir={prof}',
                        f'--screenshot={png}', f'--window-size=1200,{height}', src.resolve().as_uri()],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
    return png


def preview(args):
    opts = {'only': '', 'scale': '72', 'themes': 'standard:dark,standard:light,engineer:dark,scholar:light', 'out': str(OUT / 'preview.png')}
    emblems = '--emblems' in args
    args = [a for a in args if a != '--emblems']
    for i, a in enumerate(args):
        if a.startswith('--') and a[2:] in opts and i + 1 < len(args):
            opts[a[2:]] = args[i + 1]
    scale = int(opts['scale'])
    themes = [t.split(':') for t in opts['themes'].split(',')]
    out = Path(opts['out']).resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix='art-', dir=OUT))  # its own folder: previews can run side by side
    rel = os.path.relpath(ROOT / 'app', work).replace(os.sep, '/')
    if emblems:
        names = sorted(f.stem for f in (ROOT / 'app' / 'art' / 'themes').glob('*-emblem.svg'))
        sprite = ''
        cell = lambda n, extra='': (f'<figure><div class="emb" style="width:{scale}px;height:{scale}px"><img src="{rel}/art/themes/{n}.svg" alt=""></div>'
                                    f'<figcaption>{n}</figcaption></figure>')
    else:
        names = select(opts['only'])
        sprite = sprite_text()
        # A badge shows in its own colour (art.css .b-<kind>), as in the sheet.
        cell = lambda n, extra='': (f'<figure><span class="art-tile{extra}{" b-" + n[6:] if n.startswith("badge-") else ""}" style="--t:{scale}px"><svg viewBox="0 0 64 64"><use href="#i-{n}"/></svg></span>'
                                    f'<figcaption>{n}</figcaption></figure>')
    if not names:
        sys.exit('No pictures match.')
    chrome = find_chrome()
    per_row = max(1, 1172 // (scale + 28))
    height = lambda count: 44 + -(-count // per_row) * (scale + 36)
    shots = []
    for i, (style, mode) in enumerate(themes):
        html = page(rel, sprite, style, mode, f'{style} · {mode}', ''.join(cell(n) for n in names), scale)
        shots.append(shoot(html, work / f'{i}.png', height(len(names)), chrome))
    if not emblems:
        extra = [cell(names[i % len(names)], f' rar-{r}') for i, r in enumerate(RARITIES)]
        extra += [cell(names[i % len(names)], f' glow-{g}') for i, g in enumerate(['red', 'blue', 'green', 'violet', 'yellow', 'orange', 'cyan', 'white'])]
        html = page(rel, sprite, 'standard', 'dark', 'rarity tiles · energy colours', ''.join(extra), scale)
        shots.append(shoot(html, work / 'extra.png', height(len(extra)), chrome))
    stack(shots, out)
    print(f'{out}: {len(names)} pictures in {len(themes)} themes')


def themes(args):
    opts = {'styles': 'berserker,consular,engineer,fighter,guardian,monk,operative,scholar,scout,sentinel', 'modes': 'dark,light',
            'size': '1200x820', 'out': str(OUT / 'themes.png')}
    for i, a in enumerate(args):
        if a.startswith('--') and a[2:] in opts and i + 1 < len(args):
            opts[a[2:]] = args[i + 1]
    mock = ROOT / 'dev' / 'dumps' / 'mock.html'
    if not mock.exists():
        sys.exit('No dev/dumps/mock.html: save a copy of the dev page first (dev/README.md, "Art").')
    html = mock.read_text(encoding='utf-8')
    base = (ROOT / 'app').resolve().as_uri() + '/'
    html = html.replace('<head>', f'<head><base href="{base}">', 1)
    if 'art/art.css' not in html:
        html = html.replace('<link rel="stylesheet" href="themes.css">', '<link rel="stylesheet" href="themes.css"><link rel="stylesheet" href="art/art.css">', 1)
    if 'class="theme-art"' not in html:
        html = re.sub(r'(<body[^>]*>)', r'<div class="theme-art" aria-hidden="true"></div>', html, count=1)
    if 'class="emblem"' not in html:
        html = html.replace('<img src="icons/icon32.png" alt="">', '<img src="icons/icon32.png" alt=""><span class="emblem" aria-hidden="true"></span>', 1)
    if 'id="i-' not in html and SPRITE.exists():
        html = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + SPRITE.read_text(encoding='utf-8'), html, count=1)
    w, h = opts['size'].split('x')
    OUT.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix='themes-', dir=OUT))
    chrome = find_chrome()
    shots = []
    for style in opts['styles'].split(','):
        for mode in opts['modes'].split(','):
            one = re.sub(r'<html[^>]*>', f'<html lang="en" data-style="{style}" data-theme="{mode}">', html, count=1)
            src = work / f'{style}-{mode}.html'
            src.write_text(one, encoding='utf-8')
            png = work / f'{style}-{mode}.png'
            with tempfile.TemporaryDirectory() as prof:
                subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                                f'--user-data-dir={prof}', f'--screenshot={png}', f'--window-size={w},{h}', src.resolve().as_uri()],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
            shots.append(png)
    stack(shots, Path(opts['out']).resolve())
    print(f'{opts["out"]}: {len(shots)} screens')


def items_preview(args):
    """Real SW5E items on their tiles (dev/art-items.js): --names "Grenade, ion;Brightsaber" (or every picture once)."""
    opts = {'names': '', 'themes': 'standard:dark', 'out': str(OUT / 'items.png')}
    for i, a in enumerate(args):
        if a.startswith('--') and a[2:] in opts and i + 1 < len(args):
            opts[a[2:]] = args[i + 1]
    names = [n.strip() for n in opts['names'].split(';') if n.strip()]
    html_cells = subprocess.run(['node', str(ROOT / 'dev' / 'art-items.js'), json.dumps(names)], capture_output=True, text=True,
                                encoding='utf-8', check=True).stdout
    OUT.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix='items-', dir=OUT))
    rel = os.path.relpath(ROOT / 'app', work).replace(os.sep, '/')
    count = html_cells.count('<figure>')
    shots = []
    for i, (style, mode) in enumerate(t.split(':') for t in opts['themes'].split(',')):
        html = page(rel, sprite_text(), style, mode, f'{style} · {mode}', html_cells, 96).replace('figure {', 'figure { font-size: 10px;', 1)
        shots.append(shoot(html, work / f'{i}.png', 44 + -(-count // 9) * 150, find_chrome()))
    stack(shots, Path(opts['out']).resolve())
    print(f'{opts["out"]}: {count} items')


def stack(pngs, out):
    """The previews one under the other (Pillow), or the first one if Pillow isn't there."""
    try:
        from PIL import Image
    except ImportError:
        out.write_bytes(pngs[0].read_bytes())
        return
    ims = [Image.open(p) for p in pngs if p.exists()]
    w = max(i.width for i in ims)
    sheet = Image.new('RGB', (w, sum(i.height for i in ims)))
    y = 0
    for im in ims:
        sheet.paste(im, (0, y))
        y += im.height
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    if cmd == 'check':
        sys.exit(0 if check() else 1)
    elif cmd == 'preview':
        preview(sys.argv[2:])
    elif cmd == 'themes':
        themes(sys.argv[2:])
    elif cmd == 'items':
        items_preview(sys.argv[2:])
    else:
        sys.exit(0 if build() else 1)
