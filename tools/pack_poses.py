"""Clean and re-pack the illustrated pose sheets.

  python3 tools/pack_poses.py

Source sheets (as generated) live in tools/ref/poses/*.png. Their poses are not evenly placed in the
grid, and the background removal left specks and coloured fringes around them. This script:
  * keeps only real shapes: blobs that are solid (alpha > 110) and at least MIN_AREA px — the figure
    and its "!!"/splash marks — plus their antialiased edge; all loose specks become transparent;
  * cuts every pose out and re-packs it into an evenly spaced grid where each pose stands on the same
    baseline and is centred on the same point (characters: the head; animals: the body), so switching
    pose never makes the art jump, and no pose can bleed into the next cell;
  * writes assets/<kind>/<name>-poses.webp and the matching sheet rules (sizes, head crop) into the
    generated block of css/mascot.css and css/animals.css.
"""
import json, os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools/ref/poses')
MIN_AREA, SOLID, PAD = 150, 110, 14

SHEETS = {  # name: (kind, cols, rows)
    'zaid': ('characters', 3, 3), 'huda': ('characters', 3, 3),
    'hoopoe': ('animals', 2, 2), 'bee': ('animals', 2, 2), 'ant': ('animals', 2, 2), 'camel': ('animals', 2, 2),
    'elephant': ('animals', 2, 2), 'whale': ('animals', 2, 2), 'cow': ('animals', 2, 2),
}


def poses(im, cols, rows):
    a = im[..., 3]
    n, lab, st, cen = cv2.connectedComponentsWithStats((a > SOLID).astype(np.uint8), 8)
    H, W = a.shape
    cells = [[] for _ in range(cols * rows)]
    for i in range(1, n):
        if st[i, 4] < MIN_AREA: continue
        cx, cy = cen[i]
        cells[min(rows - 1, int(cy / H * rows)) * cols + min(cols - 1, int(cx / W * cols))].append(i)
    out = []
    for ids in cells:
        main = max(ids, key=lambda i: st[i, 4])
        keep = np.isin(lab, ids).astype(np.uint8)
        # antialiased edge: original alpha within 2px of a kept shape; everything else goes
        edge = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        rgba = im.copy(); rgba[..., 3] = np.where(edge > 0, a, 0)
        ys, xs = np.where(edge > 0)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        mm = lab == main; mys, mxs = np.where(mm)
        out.append(dict(img=rgba[y0:y1, x0:x1], box=(x0, y0, x1, y1), main=(mxs.min(), mys.min(), mxs.max() + 1, mys.max() + 1), mask=mm))
    return out


def anchor(p, kind):
    """(x, baseline) in sheet pixels: characters centre on the head, animals on the body; both stand on
    the main shape's lowest point."""
    mx0, my0, mx1, my1 = p['main']; m = p['mask']
    if kind == 'characters':
        band = m[my0:my0 + int((my1 - my0) * .3)]        # top 30 % of the figure = head
        xs = np.where(band)[1]
    else:
        xs = np.where(m)[1]
    return float(xs.mean()), float(my1)


def measure(name, kind, cols, rows):
    im = np.array(Image.open(os.path.join(SRC, name + '-poses.png')).convert('RGBA'))
    ps = poses(im, cols, rows)
    ext = []
    for p in ps:
        ax, by = anchor(p, kind); x0, y0, x1, y1 = p['box']
        p['ax'], p['by'] = ax, by
        ext.append((ax - x0, x1 - ax, by - y0, y1 - by))
    half = int(np.ceil(max(max(e[0], e[1]) for e in ext))) + PAD
    up = int(np.ceil(max(e[2] for e in ext))) + PAD
    down = int(np.ceil(max(e[3] for e in ext))) + PAD
    return ps, (half, up, down)


def build(name, kind, cols, rows, cell=None):
    ps, own = measure(name, kind, cols, rows)
    half, up, down = cell or own
    cw, ch = 2 * half, up + down
    sheet = Image.new('RGBA', (cw * cols, ch * rows), (0, 0, 0, 0))
    for k, p in enumerate(ps):
        c, r = k % cols, k // cols
        x0, y0, _, _ = p['box']
        dx = int(round(c * cw + half - (p['ax'] - x0)))
        dy = int(round(r * ch + up - (p['by'] - y0)))
        sheet.alpha_composite(Image.fromarray(p['img']), (dx, dy))
    # premultiplied-safe: colour of fully transparent pixels is irrelevant but keep it neutral
    arr = np.array(sheet); arr[arr[..., 3] == 0, :3] = 0
    sheet = Image.fromarray(arr)
    out = os.path.join(ROOT, 'assets', kind, name + '-poses.webp')
    sheet.save(out, 'WEBP', quality=88, method=6, alpha_quality=100)
    info = {'cols': cols, 'rows': rows, 'cw': cw, 'ch': ch, 'baseline': round(up / ch, 4)}
    if kind == 'characters':                       # head crop for the round nav avatars, from the idle pose
        p = ps[0]; mx0, my0, mx1, my1 = p['main']
        hh = (my1 - my0) * .42                          # hair top to chin
        cols_ = np.where(p['mask'][my0:my0 + int(hh)].any(0))[0]   # head width (hair can be wider than tall)
        hw = cols_.max() - cols_.min() + 1; hx = (cols_.max() + cols_.min()) / 2
        info['head'] = {'cx': round((half + hx - p['ax']) / cw, 4), 'cy': round((up - (p['by'] - my0) + hh / 2) / ch, 4), 'size': round(max(hh, hw) * 1.06 / cw, 4)}
    print(f'{name:9s} {cols}x{rows} cell {cw}x{ch} -> {os.path.relpath(out, ROOT)} {os.path.getsize(out) // 1024} KB')
    return info



def head_crop(a):
    """background-size / -position that fill a round avatar with the idle pose's head"""
    h = a['head']; S, cw, ch = h['size'], a['cw'], a['ch']
    bw, bh = a['cols'] / S, a['rows'] * ch / (S * cw)
    px = (h['cx'] / S - .5) / (bw - 1); py = (h['cy'] * ch / (S * cw) - .5) / (bh - 1)
    return f'background-size: {bw * 100:.1f}% {bh * 100:.1f}%; background-position: {px * 100:.2f}% {py * 100:.2f}%;'


def put(path, rules):
    s = open(path).read(); a, b = '/* @atlas:begin (generated by tools/pack_poses.py) */', '/* @atlas:end */'
    block = a + '\n' + '\n'.join(rules) + '\n' + b
    s = s[:s.index(a)] + block + s[s.index(b) + len(b):] if a in s else block + '\n' + s
    open(path, 'w').write(s)


# Zaid and Huda share one cell size, so at the same CSS width they are drawn at the same scale.
kid_cell = tuple(max(c) for c in zip(*(measure(n, *SHEETS[n])[1] for n in ('zaid', 'huda'))))
atlas = {n: build(n, *v, cell=kid_cell if v[0] == 'characters' else None) for n, v in SHEETS.items()}
kids, animals = [], []
for n, (kind, cols, rows) in SHEETS.items():
    a = atlas[n]; url = f"url('../assets/{kind}/{n}-poses.webp')"
    if kind == 'characters':
        kids.append(f'.kid[data-buddy="{n}"] {{ --atlas: {url}; aspect-ratio: {a["cw"]} / {a["ch"]}; }}')
        kids.append(f'.kid.head-only[data-buddy="{n}"] .kid-art {{ {head_crop(a)} }}')
    else:
        animals.append(f'.animal[data-animal="{n}"] {{ --atlas: {url}; aspect-ratio: {a["cw"]} / {a["ch"]}; }}')
put(os.path.join(ROOT, 'css/mascot.css'), kids)
put(os.path.join(ROOT, 'css/animals.css'), animals)
