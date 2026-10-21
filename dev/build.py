"""Builds the sheet's two releases from app/:

dist/extension/  the browser extension: the sheet wrapped by extension/
  app/**                  the sheet as it is, with SW5E's data (app/README.md, the user guide, and sw.js, the web
                          version's offline worker, stay out)
  extension/*             the manifest, the background worker, the sw5e.com bridge and the extension's
                          platform.js, which takes the place of app/platform.js
  index.html              app/index.html, with bridge.js loaded just before platform.js

dist/web/        the web version, for any static host (https): app/** as it is, except
  sw.js                   app/sw.js with VERSION (a hash of every other file) and FILES (all of them) filled in,
                          so it keeps them for offline use and a new build is noticed as a new version

Only changed files are written, and files no longer in the sources are removed, so Chrome can keep the
extension folder loaded (Load unpacked) while it's rebuilt; a page reload then shows the change.
dev/serve.py rebuilds whenever a source changes, and dev/pack.py zips the extension for a release.
Usage: python dev/build.py [--watch]
"""
import hashlib
import json
import pathlib
import re
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / 'app'
EXT = ROOT / 'extension'
OUT = ROOT / 'dist' / 'extension'
WEB_OUT = ROOT / 'dist' / 'web'
APP_LEFT_OUT = {'README.md'}
PLATFORM_TAG = '<script src="platform.js"></script>'
EXT_PAGE_SCRIPTS = '<script src="bridge.js"></script>\n  ' + PLATFORM_TAG


def app_files():
    return {p.relative_to(APP).as_posix(): p for p in sorted(APP.rglob('*'))
            if p.is_file() and p.relative_to(APP).as_posix() not in APP_LEFT_OUT}


def sources():
    """The extension: { path in the build: source file } (index.html: its text, as built)."""
    files = app_files()
    files.pop('sw.js', None)
    for p in sorted(EXT.rglob('*')):
        rel = p.relative_to(EXT).as_posix()
        if p.is_file() and rel != 'README.md':
            files[rel] = p  # the extension's platform.js replaces the web one
    html = (APP / 'index.html').read_text(encoding='utf-8')
    if PLATFORM_TAG not in html:
        raise RuntimeError('app/index.html has no ' + PLATFORM_TAG)
    files['index.html'] = html.replace(PLATFORM_TAG, EXT_PAGE_SCRIPTS, 1)
    return files


def web_sources():
    """The web version: app/ as it is, with sw.js told which files to keep and which version they are."""
    files = app_files()
    kept = sorted(rel for rel in files if rel != 'sw.js')
    digest = hashlib.sha256()
    for rel in kept:
        digest.update(rel.encode('utf-8') + b'\0' + files[rel].read_bytes() + b'\0')
    sw = (APP / 'sw.js').read_text(encoding='utf-8')
    sw, n1 = re.subn(r"^const VERSION = '[^']*';$", f"const VERSION = '{digest.hexdigest()[:12]}';", sw, flags=re.M)
    sw, n2 = re.subn(r'^const FILES = \[\];$', 'const FILES = ' + json.dumps(['./'] + kept) + ';', sw, flags=re.M)
    if n1 != 1 or n2 != 1:
        raise RuntimeError("app/sw.js needs the lines const VERSION = '…'; and const FILES = [];")
    files['sw.js'] = sw
    return files


def write_tree(out, files, quiet):
    """Makes `out` hold exactly `files`. Returns the paths written or removed."""
    changed = []
    for rel, src in files.items():
        dest = out / rel
        data = src.encode('utf-8') if isinstance(src, str) else src.read_bytes()
        if dest.is_file() and dest.read_bytes() == data:
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        changed.append(rel)
    if out.exists():
        for p in sorted(out.rglob('*'), reverse=True):
            rel = p.relative_to(out).as_posix()
            if p.is_file() and rel not in files:
                p.unlink()
                changed.append(rel + ' (removed)')
            elif p.is_dir() and not any(p.iterdir()):
                p.rmdir()
    if changed and not quiet:
        shown = ', '.join(changed[:8]) + (f' and {len(changed) - 8} more' if len(changed) > 8 else '')
        print(f'{out.relative_to(ROOT).as_posix()}: {shown}')
    return changed


def build(quiet=False):
    """Brings dist/extension/ up to date. Returns the paths written or removed."""
    return write_tree(OUT, sources(), quiet)


def build_web(quiet=False):
    """Brings dist/web/ up to date. Returns the paths written or removed."""
    return write_tree(WEB_OUT, web_sources(), quiet)


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
                build_web()
                last = now
        except Exception as e:  # a file mid-save: try again next time
            print('dist: not built:', e)
        time.sleep(interval)


if __name__ == '__main__':
    if '--watch' in sys.argv:
        watch()
    else:
        changed = build()
        print(f'dist/extension is up to date ({len(changed)} file(s) written or removed). Load it unpacked in chrome://extensions.')
        changed = build_web()
        print(f'dist/web is up to date ({len(changed)} file(s) written or removed). Put it on any https host.')
