"""Trace the chosen Qalam logo (Option 02 of tools/ref/logo-board.webp) into clean SVG.

  python3 tools/trace_logo_tiles.py

Writes:
  assets/logo/qalam-wordmark.svg   transparent static wordmark (5 tile groups, letters as paths)
  assets/logo/qalam-icon.svg       the single blue q tile (app icon / favicon)
  js/logo.js                       window.QQ_LOGO = { tiles: [...], viewBox, icon } for the animated component
Each tile = one group {fill, tile path, letter path}; tiles partly covered by a neighbour have their
hidden corner rebuilt (from the neighbour's area next to it) so they can move on their own without gaps.
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(__file__))
from vectorize import trace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
board = Image.open(os.path.join(ROOT, 'tools/ref/logo-board.webp')).convert('RGB')
K = 5                                                     # work at 5x for smooth outlines

def load(box):
    crop = board.crop(box)
    return np.asarray(crop.resize((crop.width * K, crop.height * K), Image.LANCZOS)).astype(float)

PAL = {'blue': (11, 75, 211), 'mint': (83, 205, 150), 'coral': (250, 110, 95), 'white': (255, 255, 255), 'bg': (250, 244, 234)}

def classify(rgb):
    names = list(PAL); pal = np.array([PAL[n] for n in names], float)
    lab = ((rgb[:, :, None, :] - pal[None, None]) ** 2).sum(-1).argmin(-1)
    lab = cv2.medianBlur(lab.astype(np.uint8), 7)
    return {n: lab == i for i, n in enumerate(names)}, names

def clean(m, r=2):
    m = nd.binary_opening(m, np.ones((3, 3)), iterations=r)
    return nd.binary_closing(m, np.ones((3, 3)), iterations=r)

def colour(rgb, m):
    return '#%02X%02X%02X' % tuple(np.median(rgb[nd.binary_erosion(m, iterations=6)], 0).astype(int))

def trace_word():
    box = (815, 85, 1505, 310)
    rgb = load(box); masks, _ = classify(rgb)
    H, W = masks['bg'].shape
    tiles = []
    for name in ('blue', 'mint', 'coral'):
        lab, n = nd.label(clean(masks[name]))
        for i in range(1, n + 1):
            m = lab == i
            tiles.append({'col': name, 'm': nd.binary_fill_holes(m), 'a': m.sum()})
    big = max(t['a'] for t in tiles)
    tiles = [t for t in tiles if t['a'] > .3 * big]
    tiles.sort(key=lambda t: np.where(t['m'].any(0))[0].mean())      # left to right: q a l a m
    assert len(tiles) == 5, len(tiles)
    # letters: white inside (the filled outline of) each tile
    white = clean(masks['white'], 1)
    order = [0, 1, 2, 4, 3]                                           # stacking bottom→top: q, a, l, m, a(blue on top)
    top_of = {0: 1, 1: 2, 2: 3, 4: 3}                                 # who covers whom
    out = []
    for k, t in enumerate(tiles):
        vis = t['m']
        full = vis.copy()
        if k in top_of:                                               # rebuild the hidden corner under the neighbour
            nb = tiles[top_of[k]]['m']
            near = nd.binary_dilation(vis, np.ones((3, 3)), iterations=14 * K)
            hull_src = vis | (nb & near)
            pts = np.argwhere(hull_src)[:, ::-1].astype(np.int32)
            hull = np.zeros((H, W), np.uint8); cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)
            # keep the rebuilt area only where the neighbour covers it (exact look at rest)
            full = vis | (hull.astype(bool) & nd.binary_erosion(nb, iterations=2 * K))   # tucked inside the neighbour
        full = nd.binary_fill_holes(full)
        letter = white & nd.binary_fill_holes(vis | full)
        lab, n = nd.label(letter)
        if n > 1:                                                     # the letter is the big white piece
            sizes = nd.sum(letter, lab, range(1, n + 1)); letter = lab == 1 + int(np.argmax(sizes))
        letter = nd.binary_fill_holes(letter) & ~(nd.binary_fill_holes(letter) & ~letter & ~white)
        letter = letter | (nd.binary_fill_holes(letter) & white)
        ys, xs = np.where(vis)
        T = lambda mm, blur=2.4: trace((mm * 255).astype(np.uint8), scale=K, eps=1.8, min_area=300, blur=blur)
        # letters, sub-pixel accurate: how white each pixel is (0 = tile colour, 1 = white), smoothed, cut at .5
        tile_min = np.median(rgb[nd.binary_erosion(vis & ~white, iterations=8)].min(-1))
        wness = (rgb.min(-1) - tile_min) / (255 - tile_min)
        wness = cv2.GaussianBlur(wness.astype(np.float32), (0, 0), .9 * K)
        inside = nd.binary_erosion(nd.binary_fill_holes(vis | full), iterations=2 * K)
        lab2, n2 = nd.label((wness > .5) & inside)
        sizes2 = nd.sum((wness > .5) & inside, lab2, range(1, n2 + 1))
        letter = lab2 == 1 + int(np.argmax(sizes2))
        Tl = lambda mm: trace((mm * 255).astype(np.uint8), scale=K, eps=1.4, min_area=300, blur=1.5)
        out.append({'i': k, 'char': 'qalam'[k], 'fill': colour(rgb, vis), 'tile': T(full, 3.0), 'letter': Tl(letter),
                    'cx': round(xs.mean() / K, 1), 'cy': round(ys.mean() / K, 1)})
    return out, order, (W / K, H / K)

def trace_icon():
    box = (1080, 340, 1228, 484)
    rgb = load(box); masks, _ = classify(rgb)
    lab, n = nd.label(clean(masks['blue'])); sizes = nd.sum(masks['blue'], lab, range(1, n + 1))
    tile = nd.binary_fill_holes(lab == 1 + int(np.argmax(sizes)))
    letter = clean(masks['white'], 1) & tile
    ys, xs = np.where(tile); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
    T = lambda mm, blur, e=1.2: trace((mm * 255).astype(np.uint8), scale=K, offset=(-x0 / K, -y0 / K), eps=e, min_area=300, blur=blur)
    tmin = np.median(rgb[nd.binary_erosion(tile & ~letter, iterations=8)].min(-1))
    wn = cv2.GaussianBlur(((rgb.min(-1) - tmin) / (255 - tmin)).astype(np.float32), (0, 0), .9 * K)
    letter = (wn > .5) & nd.binary_erosion(tile, iterations=2 * K)
    return {'tile': T(tile, 3.0), 'letter': T(letter, 1.5, 1.4), 'fill': colour(rgb, tile), 'w': round((x1 - x0) / K, 1), 'h': round((y1 - y0) / K, 1)}

tiles, order, (W, H) = trace_word()
icon = trace_icon()
# tidy viewBox around the tiles
pad = 4
allx = []; ally = []
vb = f'0 0 {W:.1f} {H:.1f}'
os.makedirs(os.path.join(ROOT, 'assets/logo'), exist_ok=True)
def group(t):
    return f'<g data-tile="{t["i"]}"><path d="{t["tile"]}" fill="{t["fill"]}"/><path d="{t["letter"]}" fill="#FFFFFF" fill-rule="evenodd"/></g>'
word_svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Qalam"><title>Qalam</title>' + ''.join(group(tiles[i]) for i in order) + '</svg>\n'
open(os.path.join(ROOT, 'assets/logo/qalam-wordmark.svg'), 'w').write(word_svg)
icon_svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {icon["w"]} {icon["h"]}" role="img" aria-label="Qalam"><title>Qalam</title>'
            f'<path d="{icon["tile"]}" fill="{icon["fill"]}"/><path d="{icon["letter"]}" fill="#FFFFFF" fill-rule="evenodd"/></svg>\n')
open(os.path.join(ROOT, 'assets/logo/qalam-icon.svg'), 'w').write(icon_svg)
with open(os.path.join(ROOT, 'js/logo.js'), 'w') as fh:
    fh.write('/* generated by tools/trace_logo_tiles.py from tools/ref/logo-board.webp (Option 02) */\nwindow.QQ_LOGO = '
             + json.dumps({'viewBox': vb, 'order': order, 'tiles': tiles, 'icon': icon}, separators=(',', ':')) + ';\n')
print('viewBox', vb, '| tiles', [(t['char'], t['fill']) for t in tiles], '| icon', icon['fill'], icon['w'], icon['h'])
print('sizes KB:', os.path.getsize(os.path.join(ROOT, 'assets/logo/qalam-wordmark.svg')) // 1024, os.path.getsize(os.path.join(ROOT, 'assets/logo/qalam-icon.svg')) // 1024)
