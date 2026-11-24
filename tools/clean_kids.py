"""Polish pass over the traced kids (js/kids-vector.js, made by tools/trace_kids.py).

  python3 tools/clean_kids.py            (reads the committed trace, rewrites js/kids-vector.js)

What it does, per kid:
  * every traced shape is rasterised at 8x, cleaned (opening/closing removes notches, specks and
    fringes) and re-traced as smooth curves;
  * the body is made symmetric and centred under the face: the clean right half of the torso is
    mirrored, the left leg is the mirrored right leg (the shoes already are);
  * the traced arms are dropped — js/mascot.js draws real two-segment arms (shoulder + elbow) from the
    `arms` block written here (lengths, widths, colours measured from the trace);
  * joints are rewritten to match.
The original trace is kept as js/kids-vector.raw.js so the pass can be re-run.
"""
import json, os, re, sys
import cv2
import numpy as np
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(__file__))
from vectorize import trace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'js/kids-vector.raw.js')
OUT = os.path.join(ROOT, 'js/kids-vector.js')
if not os.path.exists(RAW):
    os.replace(OUT, RAW)
src = open(RAW).read()
DATA = json.loads(src[src.index('{'):src.rindex('}') + 1])

K = 8; W, H = 200 * K, 292 * K
NUM = re.compile(r'[-+]?\d*\.?\d+(?:e[-+]?\d+)?')


def polys(d):
    """SVG path (M/C/L/Z only, as written by vectorize.trace) -> list of polygons in K-scaled pixels."""
    out, cur, pos = [], [], None
    for cmd, args in re.findall(r'([MCLZ])([^MCLZ]*)', d):
        v = [float(x) for x in NUM.findall(args)]
        if cmd == 'M':
            if cur: out.append(cur)
            pos = (v[0], v[1]); cur = [pos]
        elif cmd == 'L':
            for i in range(0, len(v), 2): pos = (v[i], v[i + 1]); cur.append(pos)
        elif cmd == 'C':
            for i in range(0, len(v), 6):
                p0 = np.array(pos); p1, p2, p3 = np.array(v[i:i + 2]), np.array(v[i + 2:i + 4]), np.array(v[i + 4:i + 6])
                for t in np.linspace(0, 1, 9)[1:]:
                    q = (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3
                    cur.append((q[0], q[1]))
                pos = (v[i + 4], v[i + 5])
        elif cmd == 'Z':
            if cur: out.append(cur); cur = []
    if cur: out.append(cur)
    return [np.round(np.array(p) * K).astype(np.int32) for p in out if len(p) > 2]


def raster(d):
    m = np.zeros((H, W), np.uint8)
    for p in polys(d):                                   # even-odd: xor every ring
        r = np.zeros((H, W), np.uint8); cv2.fillPoly(r, [p], 1); m ^= r
    return m.astype(bool)


def disc(r):
    r = int(round(r)); y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def smooth(m, r=1.0):
    """remove notches (closing) and specks/fringes (opening); r in viewBox units"""
    k = disc(r * K)
    m = nd.binary_closing(np.pad(m, 40), k)[40:-40, 40:-40]
    m = nd.binary_opening(m, k)
    return nd.binary_fill_holes(m) if m.any() else m


def T(m, blur=3.0, eps=1.6):
    return trace((m * 255).astype(np.uint8), scale=K, eps=eps, min_area=60 * K, blur=blur)


def mirror_half(m, c0, axis):
    """take the right half of a mask (split at x=c0), move the split onto `axis`, mirror it to the left"""
    half = m & (np.arange(W) / K >= c0)[None, :]
    half = np.roll(half, int(round((axis - c0) * K)), axis=1)
    return half | mirror_x(half, axis)


def mirror_x(m, axis):
    a2 = int(round(2 * axis * K)); out = np.zeros_like(m)
    xs = np.arange(W); xd = a2 - xs; ok = (xd >= 0) & (xd < W)
    out[:, xd[ok]] = m[:, xs[ok]]
    return out


def bbox(m):
    ys, xs = np.where(m); return xs.min() / K, ys.min() / K, xs.max() / K, ys.max() / K


def clean_part(p, r=1.0, layer_r=.7, drop=()):
    clipm = smooth(raster(p['clip']), r)
    layers = []
    for i, l in enumerate(p['layers']):
        if l['fill'] in drop: continue
        m = raster(l['d'])
        m = smooth(m, r if i == 0 else layer_r) if m.any() else m
        if i == 0: m = m | clipm
        d = T(m, blur=3.0 if i == 0 else 2.4)
        if d: layers.append({'fill': l['fill'], 'd': d})
    return {'clip': T(clipm), 'layers': layers, 'pills': p.get('pills', [])}


def build(name, d):
    P, J = d['parts'], d['joints']
    face_x = round((d['face']['eyes'][0]['cx'] + d['face']['eyes'][1]['cx']) / 2, 2)
    axis = face_x
    out = dict(d); parts = {}

    # ---- head: smooth every layer; Huda's mint fringe under the hijab goes
    parts['head'] = clean_part(P['head'], r=1.1, layer_r=.8, drop=('#65CEA1',) if name == 'huda' else ())

    # ---- torso: clean, then mirror its clean right half about the face axis
    tc0 = (J['shoulderL'][0] + J['shoulderR'][0]) / 2
    tclip = smooth(raster(P['torso']['clip']), 1.4)
    for l in P['torso']['layers']:
        if l.get('noclip'): tclip |= smooth(raster(l['d']), 1.4)
    tclip = smooth(mirror_half(tclip, tc0, axis), 1.4)
    # rounded shoulders: cut the torso's two top corners round
    bx0, by0, bx1, by1 = bbox(tclip); rr = 15
    yy, xx = np.mgrid[0:H, 0:W] / K
    for cx in (bx0 + rr, bx1 - rr):
        corner = (yy < by0 + rr) & ((xx < bx0 + rr) if cx < axis else (xx > bx1 - rr))
        tclip &= ~(corner & ((xx - cx) ** 2 + (yy - (by0 + rr)) ** 2 > rr * rr))
    # square, slightly rounded shoulders: the torso top is hidden by the head/hood, the sides by the arms
    tl = []
    seen = set()
    for i, l in enumerate(P['torso']['layers']):
        if l.get('noclip') or (i and l['fill'] == P['torso']['layers'][0]['fill']): continue
        if l['fill'] == d['face']['skin']: continue      # neck skin specks
        m = raster(l['d'])
        if not m.any(): continue
        m = smooth(mirror_half(m, tc0, axis), .8) & tclip
        if l['fill'] in seen or not m.any(): continue
        seen.add(l['fill'])
        tl.append({'fill': l['fill'], 'd': T(m, blur=2.6)})
    tl.insert(0, {'fill': P['torso']['layers'][0]['fill'], 'd': T(tclip)})
    shift = axis - tc0
    pills = []
    for q in P['torso'].get('pills', []):
        if q['cx'] >= tc0:                               # keep the right one, mirror it
            a = dict(q, cx=round(q['cx'] + shift, 2)); b = dict(a, cx=round(2 * axis - a['cx'], 2), a=-q.get('a', 0))
            pills += [a, b]
    parts['torso'] = {'clip': T(tclip), 'layers': tl, 'pills': pills}
    x0, y0, x1, y1 = bbox(tclip)

    # ---- legs: clean the right leg, place it under the body, mirror it for the left
    hc0 = (J['hipL'][0] + J['hipR'][0]) / 2
    def leg(p, flip):
        m = smooth(raster(p['clip']), 1.2)
        m = np.roll(m, int(round((axis - hc0) * K)), axis=1)
        layers = []
        for i, l in enumerate(p['layers']):
            if i and l['fill'] in (d['shoes']['R']['fill'],): continue   # the shoe is redrawn
            mm = raster(l['d'])
            if not mm.any(): continue
            mm = np.roll(smooth(mm, 1.2 if i == 0 else .7), int(round((axis - hc0) * K)), axis=1)
            if i == 0: mm |= m
            layers.append((l['fill'], mm))
        if flip:
            m = mirror_x(m, axis); layers = [(f, mirror_x(mm, axis)) for f, mm in layers]
        pl = []
        for q in p.get('pills', []):
            if q['fill'] == d['shoes']['R']['fill']: continue
            cx = q['cx'] + axis - hc0
            pl.append(dict(q, cx=round(2 * axis - cx if flip else cx, 2), a=-q.get('a', 0) if flip else q.get('a', 0)))
        return {'clip': T(m), 'layers': [{'fill': f, 'd': T(mm, blur=2.6)} for f, mm in layers], 'pills': pl}
    parts['legR'] = leg(P['legR'], False)
    parts['legL'] = leg(P['legR'], True)

    # ---- arms (drawn by mascot.js): measured from the trace
    sh_y = J['shoulderR'][1]
    hand = J['handR']; half_w = (x1 - x0) / 2
    arm_w = 19.0 if name == 'zaid' else 17.0
    hand_r = 10.6 if name == 'zaid' else 9.8
    sx = axis + half_w - arm_w * .42                         # shoulder pivot: inside the torso's top corner
    sy = sh_y + arm_w * .42
    hx = axis + half_w + hand_r * .3; hy = hand[1] + 2
    length = float(np.hypot(hx - sx, hy - sy))
    base = float(np.degrees(np.arctan2(-(hx - sx), hy - sy)))     # rest angle from straight down (CSS sense)
    arm_layers = P['armR']['layers']
    shade = next((l['fill'] for l in arm_layers[1:] if l['fill'] not in (d['face']['skin'],) and l['fill'] != arm_layers[0]['fill'] and l['fill'] not in ('#342B4D',)), None)
    out['arms'] = {'w': arm_w, 'hand': hand_r, 'len': round(length, 2), 'upper': round(length * .48, 2),
                   'base': round(-base, 2), 'sleeve': J['sleeve'], 'shade': shade, 'skin': d['face']['skin']}
    jn = dict(J)
    jn['shoulderR'] = [round(sx, 2), round(sy, 2)]; jn['shoulderL'] = [round(2 * axis - sx, 2), round(sy, 2)]
    jn['handR'] = [round(hx, 2), round(hy, 2)]; jn['handL'] = [round(2 * axis - hx, 2), round(hy, 2)]
    jn['hipR'] = [round(J['hipR'][0] + axis - hc0, 2), J['hipR'][1]]; jn['hipL'] = [round(2 * axis - jn['hipR'][0], 2), J['hipL'][1]]
    jn['waist'] = [axis, J['waist'][1]]; jn['neckP'] = [axis, J['neckP'][1]]
    jn['axis'] = axis
    out['joints'] = jn
    out['parts'] = parts
    # shoes: centred on the new leg positions
    sR = dict(d['shoes']['R']); dx = axis - hc0
    sR['x0'] = round(sR['x0'] + dx, 2); sR['x1'] = round(sR['x1'] + dx, 2)
    out['shoes'] = {'R': sR, 'L': dict(sR, x0=round(2 * axis - sR['x1'], 2), x1=round(2 * axis - sR['x0'], 2))}
    out['torsoBox'] = [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)]
    print(name, 'axis', axis, 'torso', out['torsoBox'], 'arms', out['arms'])
    return out


res = {k: build(k, v) for k, v in DATA.items()}
with open(OUT, 'w') as fh:
    fh.write('/* generated by tools/trace_kids.py + tools/clean_kids.py from the character board */\nwindow.QQ_KIDV = '
             + json.dumps(res, separators=(',', ':')) + ';\n')
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
