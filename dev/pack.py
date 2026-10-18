"""Build a release zip of the extension: dist/sw5e-sheet-<version>.zip

Builds dist/extension/ (dev/build.py: the sheet wrapped by extension/) and packs it with the
dev-only `externally_connectable` key removed from manifest.json, so no web page can reach the
extension (the background listener for dev/bridge-proxy.js is then inert). Upload the zip to the
Chrome Web Store, or unzip and "Load unpacked" to test the release build.
Usage: python dev/pack.py
"""
import json
import pathlib
import zipfile

import build

ROOT = build.ROOT
DIST = ROOT / 'dist'
DEV_ONLY_KEYS = ('externally_connectable',)


def main():
    build.build()
    ext = build.OUT
    manifest = json.loads((ext / 'manifest.json').read_text(encoding='utf-8'))
    for key in DEV_ONLY_KEYS:
        manifest.pop(key, None)
    out = DIST / f"sw5e-sheet-{manifest['version']}.zip"
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in sorted(ext.rglob('*')):
            if p.is_dir():
                continue
            rel = p.relative_to(ext).as_posix()
            if rel == 'manifest.json':
                z.writestr(rel, json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
            else:
                z.write(p, rel)
    print(f'Wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
