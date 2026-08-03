# Build the whole favicon / PWA-icon set from the lyre artwork P'Pao picked (AI-generated,
# approved by P'Aim 30 Jul 2026). Source of truth for the artwork lives in the repo at
# docs/backlog-assets/logo-lyre-source.png so the set can be rebuilt later.
#
#   py -3.14 tools/make_logo_icons.py
#
# Three problems the source has, and what this script does about them:
#
#   1. It is NOT transparent — the background is flat white (measured: corner pixel 254,254,254),
#      so dropping it straight into the app would paint a white box over the #f8f9fa shell bar.
#      A hard white>threshold cut would leave jagged edges, because the art is antialiased line
#      work (measured: 3,219 low-chroma fringe pixels, max distance-from-white 25 — fringe, not a
#      drop shadow). So alpha is built from LOCAL ink strength instead: for each pixel take
#      d = 255 - min(r,g,b) ("how far from white"), take D = the max d in a 7px neighbourhood
#      ("how strong is the ink of the stroke I belong to"), and set alpha = (d - FLOOR)/(D - FLOOR).
#      Stroke interiors get alpha 1.0, half-covered edge pixels get ~0.5, open background gets 0.
#      The colour is then un-premultiplied off white, so an edge pixel keeps the stroke's real
#      colour at partial alpha and the mark looks identical on any background.
#
#   2. It is mostly empty — the art occupies only x 431..976 / y 101..616 of a 1408x768 canvas
#      (~61% of the frame is blank). Shrunk to a 40px header slot untrimmed, the lyre would be
#      tiny. So everything is cropped to the measured alpha bbox and re-padded deliberately.
#
#   3. It is too detailed to survive a 16px tab icon — the strings, the notes and the sparkles
#      all collapse into mush. So a SIMPLIFIED variant (lyre + sun only, staff/notes/sparkles
#      dropped by geometry, strokes thickened to survive the downscale) is used for the small
#      sizes. See SIMPLE_* below.
#
# Nothing here touches app code: the outputs are the same 7 filenames public/ already used.

import numpy as np
from PIL import Image
from scipy import ndimage
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'docs' / 'backlog-assets' / 'logo-lyre-source.png'
OUT = ROOT / 'public'

FLOOR = 8          # d at/below this is background noise (open canvas measures d 0..2)
NEIGH = 7          # local-ink-strength window, px (covers the ~1.5px antialias ramp)
PAD = 0.055        # padding around the mark, as a fraction of the square canvas
MASK_SAFE = 0.80   # maskable icon: mark must fit inside the middle 80% (Android crops a circle)
MASK_BG = (250, 246, 240)   # --cream from src/styles.css:6 — maskable needs an opaque plate


def load_rgba_from_white(path):
    """White-backed artwork -> RGBA with soft, un-premultiplied edges (problem 1 above)."""
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float64)
    d = 255.0 - rgb.min(axis=2)
    D = ndimage.maximum_filter(d, size=NEIGH)
    with np.errstate(divide='ignore', invalid='ignore'):
        a = np.where(D > FLOOR, (d - FLOOR) / np.maximum(D - FLOOR, 1e-6), 0.0)
    a = np.clip(a, 0.0, 1.0)
    # Un-premultiply off white: observed = ink*a + 255*(1-a)  ->  ink = (observed - 255*(1-a))/a
    a3 = a[:, :, None]
    ink = np.where(a3 > 0.004, (rgb - 255.0 * (1.0 - a3)) / np.maximum(a3, 1e-6), 255.0)
    out = np.concatenate([np.clip(ink, 0, 255), (a * 255.0)[:, :, None]], axis=2)
    return Image.fromarray(out.round().astype(np.uint8), 'RGBA')


def trim(img, thresh=2):
    """Crop to the alpha bbox (problem 2 above)."""
    a = np.asarray(img)[:, :, 3]
    ys, xs = np.where(a > thresh)
    return img.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def square(img, size, pad=PAD, bg=None, fit=1.0):
    """Centre the mark on a square canvas, `pad` of the canvas left clear on the tight side."""
    inner = int(round(size * (1 - 2 * pad) * fit))
    w, h = img.size
    s = inner / max(w, h)
    m = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (*bg, 255) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas


# --- the simplified small-size variant (problem 3 above) -----------------------------------------
# The mark is 55 connected components. The lyre (frame + base + its blue strings, which hang off
# the crossbar so they come along in the same component) is by far the largest at 28,064 px,
# x133-413 y183-514 of the 546x515 trimmed master. So "lyre only" = keep the largest component,
# which drops the staff lines, treble clef, note pair, sparkles AND the sun with no hand-tuned
# boxes to go stale.
#
# Why the sun goes too, against the original proposal of "lyre + sun": measured aspect ratios.
# Lyre alone is 280x331 = 0.85, near enough to square that it fills a square icon. Lyre + sun
# stacks to 280x513 = 0.55, so fitting it into 16x16 leaves the lyre about 8 px wide — checked by
# eye at 1x and it is an unreadable blob at every stroke weight. Lyre alone at 16 px still shows
# the frame, the curls and the blue strings. Reported to P'Aim rather than decided silently.
def lyre_only(master):
    a = np.asarray(master)
    alpha = a[:, :, 3]
    lab, n = ndimage.label(alpha > 40)
    counts = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    biggest = int(np.argmax(counts)) + 1
    out = a.copy()
    out[:, :, 3] = np.where(lab == biggest, alpha, 0)
    print(f'  lyre_only: kept 1 of {n} components ({int(counts[biggest - 1])} px)')
    return trim(Image.fromarray(out, 'RGBA'))


def radial_fit(img, safe=MASK_SAFE):
    """Scale factor that puts every visible pixel inside the safe CIRCLE, not the safe square.
    Android crops a maskable icon to a circle/squircle, so what matters is the mark's furthest
    pixel from centre — using the bbox would either clip it or waste a lot of room."""
    a = np.asarray(img)[:, :, 3]
    ys, xs = np.where(a > 8)
    cy, cx = (a.shape[0] - 1) / 2, (a.shape[1] - 1) / 2
    r = float(np.sqrt((ys - cy) ** 2 + (xs - cx) ** 2).max())
    # square() maps the mark's longest side to `size * fit`, so a source radius r lands at
    # r * size * fit / max(side). Require that <= (safe/2) * size.
    f = (safe / 2) * max(img.size) / r
    print(f'  radial_fit: furthest pixel {r:.0f}px from centre of a {img.size[0]}x{img.size[1]} '
          f'mark -> fit {f:.3f} (bbox-based would have been {safe:.2f})')
    return min(f, 1.0)


def thicken(img, grow):
    """Grow the alpha by `grow` px so hairline strokes still register after a big downscale."""
    a = np.asarray(img)[:, :, 3].astype(np.float64)
    grown = ndimage.maximum_filter(a, size=2 * grow + 1)
    # Refill the grown ring with the nearest existing colour so the stroke keeps its hue.
    rgb = np.asarray(img)[:, :, :3]
    idx = ndimage.distance_transform_edt(a < 40, return_distances=False, return_indices=True)
    filled = rgb[tuple(idx)]
    out = np.concatenate([filled, grown[:, :, None]], axis=2)
    return Image.fromarray(np.clip(out, 0, 255).round().astype(np.uint8), 'RGBA')


def main():
    master = trim(load_rgba_from_white(SRC))
    print(f'master (transparent, trimmed): {master.size[0]}x{master.size[1]}')
    simple = lyre_only(master)
    print(f'simplified (lyre only): {simple.size[0]}x{simple.size[1]} '
          f'aspect {simple.size[0] / simple.size[1]:.2f}')

    # Stroke growth for the small sizes, chosen by looking at a 0 / 4 / 8 / 14 grid at 1x and at
    # 14x nearest-neighbour blow-up (scratchpad try-small.png): with no growth the gold frame goes
    # pale at 16px because the antialiasing spreads one 10px stroke over many part-lit pixels;
    # at 14 the frame swallows the strings and the curls. 4 keeps the frame solid and the strings
    # readable. 32px needs less because the squeeze is half as hard.
    small16 = thicken(simple, 4)
    small32 = thicken(simple, 3)

    jobs = [
        ('favicon-16x16.png', 16, small16, PAD, None, 1.0),
        ('favicon-32x32.png', 32, small32, PAD, None, 1.0),
        ('apple-touch-icon.png', 180, master, PAD, None, 1.0),
        ('android-chrome-192x192.png', 192, master, PAD, None, 1.0),
        ('android-chrome-512x512.png', 512, master, PAD, None, 1.0),
        # Maskable: opaque plate edge-to-edge (a transparent one gets a launcher-chosen colour
        # behind it) and the mark pulled inside the safe circle.
        ('maskable-512.png', 512, master, 0.0, MASK_BG, radial_fit(master)),
    ]
    for name, size, art, pad, bg, fit in jobs:
        img = square(art, size, pad=pad, bg=bg, fit=fit)
        img.save(OUT / name)
        print(f'  wrote {name} {size}x{size}')

    # favicon.ico: all three slots use the simplified lyre — the .ico is only ever shown small
    # (tab, history list, Windows shortcut), so detail that dies at 16 helps nothing at 48.
    # The BASE image must be the LARGEST slot: Pillow's ICO writer silently drops any requested
    # size bigger than the image it was handed (that is how a 3-slot .ico came out with only the
    # 16px slot in it, 757 bytes, first time round). append_images then supplies the exact
    # per-size art so no slot is just a machine downscale of another.
    ico = OUT / 'favicon.ico'
    square(simple, 48).save(ico, sizes=[(48, 48), (32, 32), (16, 16)],
                            append_images=[square(small32, 32), square(small16, 16)])
    print(f'  wrote favicon.ico slots={sorted(Image.open(ico).info["sizes"])}')


if __name__ == '__main__':
    main()
