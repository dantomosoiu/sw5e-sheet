"""Builds the browser extension: dist/extension/, the sheet (app/) wrapped by extension/.

  app/**                  the sheet as it is, with SW5E's data (app/README.md, the user guide, stays out)
  extension/*             the manifest, the background worker, the sw5e.com bridge and the extension's
                          platform.js, which takes the place of app/platform.js
  index.html              app/index.html, with bridge.js loaded just before platform.js

Only changed files are written, and files no longer in the sources are removed, so Chrome can keep the
folder loaded (Load unpacked) while it's rebuilt; a page reload then shows the change. dev/serve.py
rebuilds whenever a source changes, and dev/pack.py zips the result for a release.
Usage: python dev/build.py [--watch]
"""
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / 'app'
EXT = ROOT / 'extension'
OUT = ROOT / 'dist' / 'extension'
APP_LEFT_OUT = {'README.md'}
PLATFORM_TAG = '<script src="platform.js"></script>'
EXT_PAGE_SCRIPTS = '<script src="bridge.js"></script>\n  ' + PLATFORM_TAG


def sources():
    """{ path in the build: source file } (index.html: its text, as built)."""
    files = {}
    for p in sorted(APP.rglob('*')):
        rel = p.relative_to(APP).as_posix()
        if p.is_file() and rel not in APP_LEFT_OUT:
            files[rel] = p
    for p in sorted(EXT.rglob('*')):
        rel = p.relative_to(EXT).as_posix()
        if p.is_file() and rel != 'README.md':
            files[rel] = p  # the extension's platform.js replaces the web one
    html = (APP / 'index.html').read_text(encoding='utf-8')
    if PLATFORM_TAG not in html:
        raise RuntimeError('app/index.html has no ' + PLATFORM_TAG)
    files['index.html'] = html.replace(PLATFORM_TAG, EXT_PAGE_SCRIPTS, 1)
    return files


def build(quiet=False):
    """Brings dist/extension/ up to date. Returns the paths written or removed."""
    files = sources()
    changed = []
    for rel, src in files.items():
        dest = OUT / rel
        data = src.encode('utf-8') if isinstance(src, str) else src.read_bytes()
        if dest.is_file() and dest.read_bytes() == data:
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        changed.append(rel)
    if OUT.exists():
        for p in sorted(OUT.rglob('*'), reverse=True):
            rel = p.relative_to(OUT).as_posix()
            if p.is_file() and rel not in files:
                p.unlink()
                changed.append(rel + ' (removed)')
            elif p.is_dir() and not any(p.iterdir()):
                p.rmdir()
    if changed and not quiet:
        shown = ', '.join(changed[:8]) + (f' and {len(changed) - 8} more' if len(changed) > 8 else '')
        print(f'dist/extension: {shown}')
    return changed


def stamp():
    """Something that changes whenever a source file does (to rebuild only then)."""
    return tuple((p.as_posix(), p.stat().st_mtime_ns, p.stat().st_size)
                 for d in (APP, EXT) for p in sorted(d.rglob('*')) if p.is_file())


def watch(interval=1.0):
    last = None
    while True:
        try:
            now = stamp()
            if now != last:
                build()
                last = now
        except Exception as e:  # a file mid-save: try again next time
            print('dist/extension: not built:', e)
        time.sleep(interval)


if __name__ == '__main__':
    if '--watch' in sys.argv:
        watch()
    else:
        changed = build()
        print(f'dist/extension is up to date ({len(changed)} file(s) written or removed). Load it unpacked in chrome://extensions.')
