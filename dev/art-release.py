"""Release reviewed drawing batches: stage their pictures, rebuild the sprite from committed and staged pictures only.

  python dev/art-release.py w1-pistols-slug-wrist e1-cryo-ion-fire-disruptor …
  python dev/art-release.py m1-mod-armor m5-mod-marks          (modification parts and marks, in art/items)

Each batch's pictures (from dev/art-manifest.py) must exist; they're `git add`ed, then `ART_ONLY_REVIEWED=1 python
dev/art.py build` writes app/art/items.svg and app/art/names.js with every reviewed picture and none still being
drawn. Committing is left to you.
"""
import importlib.util
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('manifest', ROOT / 'dev' / 'art-manifest.py')
manifest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manifest)

batches, _ = manifest.entries()
mods = manifest.mod_briefs()
files = []
for name in sys.argv[1:]:
    if name in batches:
        batch = [ROOT / 'art' / 'equipment' / r['file'] for r in batches[name]]
    elif name in mods:
        batch = [ROOT / 'art' / 'items' / f for f in re.findall(r'^## `([^`]+\.svg)`', mods[name], re.M)]
    else:
        sys.exit(f'No batch {name}. Batches: {", ".join([*batches, *mods])}')
    for p in batch:
        if not p.exists():
            sys.exit(f'{name}: {p.name} is not drawn yet')
        files.append(p)
for p in files:
    data = p.read_bytes()
    if b'\r\n' in data:
        p.write_bytes(data.replace(b'\r\n', b'\n'))
subprocess.run(['git', 'add', '--', *[str(p.relative_to(ROOT)) for p in files]], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / 'dev' / 'art.py'), 'build'], cwd=ROOT, check=True, env={**os.environ, 'ART_ONLY_REVIEWED': '1'})
print(f'{len(files)} pictures staged; app/art/items.svg rebuilt from reviewed pictures.')
