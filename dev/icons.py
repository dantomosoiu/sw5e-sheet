"""Draw the sheet's icon at the sizes phones ask for: app/icons/icon192.png, icon512.png and maskable512.png.

The 16-128 px icons are drawn by hand (crisper at small sizes than a scaled drawing) and aren't written here.

The icon is a rounded gold frame on dark, a gold bar, two grey lines and a blue dot, laid out on a 128-unit grid.
`maskable512.png` is the same icon on a full dark square with room around it, for phones that cut icons into
their own shapes (circles, squircles).

    python dev/icons.py          # writes the three PNGs

Needs Pillow (pip install pillow).
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'app' / 'icons'

DARK = (20, 24, 33, 255)
GOLD = (232, 177, 62, 255)
GREY = (200, 206, 220, 255)
BLUE = (90, 170, 255, 255)
SIZES = (192, 512)
SS = 8  # drawn this many times larger, then scaled down (smooth edges)


def draw(size, maskable=False):
    big = size * SS
    im = Image.new('RGBA', (big, big), DARK if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Maskable icons keep everything inside the middle 80% (the safe zone).
    scale = big / 128 * (0.72 if maskable else 1)
    off = (big - 128 * scale) / 2

    def box(x0, y0, x1, y1):
        return [off + x0 * scale, off + y0 * scale, off + x1 * scale, off + y1 * scale]

    d.rounded_rectangle(box(0, 0, 128, 128), radius=27 * scale, fill=GOLD)
    d.rounded_rectangle(box(8, 8, 120, 120), radius=19 * scale, fill=DARK)
    d.rounded_rectangle(box(31, 36, 98, 47), radius=5.5 * scale, fill=GOLD)
    d.rounded_rectangle(box(31, 59, 78, 70), radius=5.5 * scale, fill=GREY)
    d.rounded_rectangle(box(31, 82, 98, 93), radius=5.5 * scale, fill=GREY)
    d.ellipse(box(78.5, 55.5, 102.5, 79.5), fill=BLUE)
    return im.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        draw(size).save(OUT / f'icon{size}.png', optimize=True)
    draw(512, maskable=True).save(OUT / 'maskable512.png', optimize=True)
    print(f'wrote {len(SIZES) + 1} icons to {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
