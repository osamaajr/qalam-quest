"""Recreate Zaid & Huda as rigged vector characters, traced from the character board.

  python3 tools/trace_kids.py <work-dir>      (work-dir/cut/<kid>-front.png = AI cut-outs from cut_kids_ai.py)

1. Flatten the board's front view into its flat colours (k-means on a texture-smoothed crop).
2. Split every pixel into a rig part using position + colour (head, torso, arms, legs); the face's
   eyes, eyebrows and mouth become separate, controllable pieces.
3. Trace each (part, colour) region into smooth vector paths (tools/vectorize.py) and place them in
   the game's 200 x 292 viewBox (front height 270, feet on y = 284).
Writes js/kids-vector.js. Joint positions are written too, so css/mascot.css rotates the parts
around the right points.
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(__file__))
from vectorize import trace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = sys.argv[1]; K = 6
BOARD = Image.open(os.path.join(ROOT, 'tools/ref/sami-maryam-sheet.webp')).convert('RGB')

# rig geometry in board pixels (measured on the board's front views)
RIG = {
    'zaid': dict(box=(590, 95, 765, 432), neck=249, hip=326, midx=677, armL=640, armR=717,
                 shoulderL=(641, 262), shoulderR=(716, 262), hipL=(660, 330), hipR=(696, 330), neckP=(677, 246),
                 face=(625, 160, 735, 248), head_colours='hair skin mouth tongue'),
    'huda': dict(box=(590, 565, 770, 905), neck=715, hip=805, midx=693, armL=652, armR=733,
                 shoulderL=(653, 728), shoulderR=(732, 728), hipL=(672, 808), hipR=(714, 808), neckP=(684, 712),
                 face=(655, 610, 735, 700), head_colours='hijab skin mouth'),
}

def flat_colours(kid, b):
    crop = BOARD.crop(b); W, H = crop.width * K, crop.height * K
    big = np.asarray(crop.resize((W, H), Image.LANCZOS))
    alpha = np.asarray(Image.open(f'{WORK}/cut/{kid}-front.png').resize((W, H), Image.LANCZOS))[..., 3] > 128
    alpha = nd.binary_erosion(alpha, np.ones((3, 3)), iterations=2)          # drop the paper-coloured rim
    sm = cv2.bilateralFilter(big, 9, 40, 9)
    px = sm[alpha].reshape(-1, 3).astype(np.float32)
    _, lab, cen = cv2.kmeans(px, 14, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, .5), 4, cv2.KMEANS_PP_CENTERS)
    L = np.full(alpha.shape, -1); L[alpha] = lab.ravel()
    L = cv2.medianBlur((L + 1).astype(np.uint8), 7).astype(int) - 1
    L[~alpha] = -1
    # merge tiny colour regions (paper texture, anti-aliasing) into their nearest real neighbour
    alpha = alpha & (L >= 0)
    area = np.bincount(L[alpha].ravel(), minlength=len(cen)); small = area < .006 * alpha.sum()
    bad = alpha & small[np.where(L >= 0, L, 0)]
    if bad.any():
        _, (iy, ix) = nd.distance_transform_edt(bad | ~alpha, return_indices=True)
        good = alpha & ~bad
        _, (gy, gx) = nd.distance_transform_edt(~good, return_indices=True)
        L[bad] = L[gy[bad], gx[bad]]
    L[~alpha] = -1
    # small specks of any colour inside another colour -> absorb (mode filter)
    for _ in range(2):
        L = np.where(alpha, cv2.medianBlur((L + 1).astype(np.uint8), 5).astype(int) - 1, -1)
    return L, cen

def hexc(c): return '#%02X%02X%02X' % tuple(int(v) for v in c)
def sat(c): return float(max(c) - min(c))
def lum(c): return float(np.mean(c))

def kind_of(c, kid):
    """Rough name for a flat colour, used for rig rules."""
    r, g, b = c
    if lum(c) < 85 and sat(c) < 60: return 'dark'                         # eyes, brows, Zaid's hair
    if kid == 'zaid' and r < 90 and g < 60 and b < 60: return 'hair'
    if r > 200 and 120 < g < 175 and b < 110: return 'skin'
    if r > 150 and 80 < g < 130 and 50 < b < 100 and kid == 'zaid' and lum(c) < 140: return 'skinlo'
    if r > 200 and 130 < g < 170 and 100 < b < 140: return 'tongue'
    if 100 < r < 170 and g < 70 and b < 80: return 'mouth'
    if kid == 'huda' and r > 95 and g < 60 and b > 60: return 'hijab'
    if b > 150 and r < 40: return 'blue'
    if lum(c) > 235 and sat(c) < 25: return 'white'
    if kid == 'huda' and g > 180 and r < 130: return 'mint'
    if r > 230 and g > 160 and b < 60: return 'shoe'
    if r > 235 and g > 200 and b < 160: return 'shoelight'
    if lum(c) > 200: return 'cream'
    return 'other'

def build(kid):
    R = RIG[kid]; b = R['box']
    L, cen = flat_colours(kid, b)
    H, W = L.shape
    kinds = [kind_of(c, kid) for c in cen]
    print(kid, list(zip([hexc(c) for c in cen], kinds)))
    yy, xx = np.mgrid[0:H, 0:W]
    bx = xx / K + b[0]; by = yy / K + b[1]                                    # board coords of every pixel
    fig = L >= 0
    # pale rim fragments that touch the outside (paper colour) -> nearest inner colour; shoe soles are kept
    pale = np.array([lum(c) > 215 and sat(c) < 45 for c in cen] + [False])[np.where(L >= 0, L, len(cen))]
    rim_lab, rn = nd.label(pale)
    edge = fig & ~nd.binary_erosion(fig, np.ones((3, 3)), iterations=3)
    for i, sl in enumerate(nd.find_objects(rim_lab), 1):
        comp = rim_lab == i
        if (comp & edge).any() and (by[sl].min() < R['hip'] + 25):
            good = fig & ~pale
            _, (gy, gx) = nd.distance_transform_edt(~good, return_indices=True)
            L[comp] = L[gy[comp], gx[comp]]
    # Huda's hijab: one plum (two near-identical tones only add specks); texture tones -> neighbours
    if kid == 'huda':
        hij = [i for i, k in enumerate(kinds) if k == 'hijab']
        main = max(hij, key=lambda i: (L == i).sum())
        for i in hij: L[L == i] = main
        junk = fig & np.isin(L, [i for i, k in enumerate(kinds) if k == 'other'])
        if junk.any():
            good = fig & ~junk
            _, (gy, gx) = nd.distance_transform_edt(~good, return_indices=True)
            L[junk] = L[gy[junk], gx[junk]]
        L = np.where(fig, cv2.medianBlur((L + 1).astype(np.uint8), 7).astype(int) - 1, -1)
        hole = fig & (L < 0)
        if hole.any():
            _, (gy, gx) = nd.distance_transform_edt(~(fig & (L >= 0)), return_indices=True)
            L[hole] = L[gy[hole], gx[hole]]
    K_ = np.array(kinds + ['none'])[np.where(L >= 0, L, len(kinds))]

    # ---- face features (eyes, brows, mouth) ----
    fx0, fy0, fx1, fy1 = R['face']
    inface = (bx > fx0) & (bx < fx1) & (by > fy0) & (by < fy1)
    dark = (K_ == 'dark') | (K_ == 'hair')
    lab, n = nd.label(dark & inface)
    eyes, brows = [], []
    for i, sl in enumerate(nd.find_objects(lab), 1):
        comp = lab == i; area = comp.sum()
        if area < 200 or comp[sl].shape[0] >= H * .2: continue
        if os.environ.get('DEBUG'): print('  dark comp', kid, sl, area, round((sl[0].stop - sl[0].start) / max(sl[1].stop - sl[1].start, 1), 2))
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if area > 15000: continue                                # the hair mass, not a facial feature
        (eyes if h / max(w, 1) > 1.2 else brows).append((sl[1].start, comp))
    eyes = [c for _, c in sorted(eyes, key=lambda e: e[0])][:2]
    brows = [c for _, c in sorted(brows, key=lambda e: e[0])][:2]
    mouth = inface & np.isin(K_, ['mouth', 'tongue', 'white']) & (by > (fy0 + fy1) / 2)
    mouth = nd.binary_closing(mouth, np.ones((5, 5)))
    ml, mn = nd.label(mouth)
    if mn: mouth = ml == 1 + int(np.argmax(nd.sum(mouth, ml, range(1, mn + 1))))     # the mouth itself, no strays
    feature = mouth.copy()
    for c in eyes + brows: feature |= c
    feature_wide = nd.binary_dilation(feature, np.ones((3, 3)), iterations=5)   # take their soft edges too

    # ---- rig parts ----
    part = np.full((H, W), '', object)
    headcol = np.isin(K_, R['head_colours'].split() + ['dark'])
    if kid == 'zaid':
        part[fig & (by < R['neck']) & (K_ != 'blue') & (K_ != 'white')] = 'head'
        part[fig & (by < R['neck'] - 4)] = 'head'
        hand = fig & np.isin(K_, ['skin', 'skinlo', 'tongue']) & (by >= R['hip'] - 30)   # hands only (not the chin)
        part[hand] = np.where(bx[hand] < R['midx'], 'armL', 'armR')
        rest = fig & (part == '')
        top = rest & (by < R['hip']) | (rest & np.isin(K_, ['blue', 'white']) & (by < R['hip'] + 6))
        part[top & (bx < R['armL'])] = 'armL'; part[top & (bx > R['armR'])] = 'armR'
        part[top & (part == '')] = 'torso'
        legs = fig & (part == '')
        part[legs] = np.where(bx[legs] < R['midx'], 'legL', 'legR')
    else:
        part[fig & (K_ == 'hijab')] = 'head'
        part[fig & (by < R['neck']) & (part == '')] = 'head'
        hand = fig & np.isin(K_, ['skin', 'skinlo', 'tongue']) & (by >= R['hip'] - 40)
        part[hand] = np.where(bx[hand] < R['midx'], 'armL', 'armR')
        rest = fig & (part == '')
        top = rest & (by < R['hip'])
        part[top & (bx < R['armL'])] = 'armL'; part[top & (bx > R['armR'])] = 'armR'
        part[top & (part == '')] = 'torso'
        legs = fig & (part == '')
        part[legs] = np.where(bx[legs] < R['midx'], 'legL', 'legR')

    # ---- placement in the viewBox ----
    ys = np.where(fig.any(1))[0]; top_b, foot_b = ys.min() / K + b[1], ys.max() / K + b[1]
    cx_b = R['neckP'][0]                                             # centre the kid on the neck
    s = 270 / (foot_b - top_b)
    to_vb = lambda X, Y: (round(100 + (X - cx_b) * s, 2), round(284 + (Y - foot_b) * s, 2))
    scale = K / s; offset = (100 + (b[0] - cx_b) * s, 284 + (b[1] - foot_b) * s)
    T = lambda mask, **kw: trace((mask * 255).astype(np.uint8), scale=scale, offset=offset, eps=1.6, min_area=90, min_thick=4.5, **kw)

    out = {'parts': {}, 'joints': {}, 'face': {}}
    for p in ['legL', 'legR', 'torso', 'head', 'armL', 'armR']:
        own = part == p
        mine = np.isin(L, list(set(L[own].ravel()) - {-1}))             # grow only into this part's own colours
        if p in ('torso', 'legL', 'legR'): mine &= ~np.isin(K_, ['skin', 'skinlo'])
        m = (nd.binary_dilation(own, np.ones((3, 3)), iterations=3) & fig & mine) | own
        layers = []
        if p == 'head':                                            # face skin goes under the features
            face_fill = nd.binary_fill_holes((np.isin(K_, ['skin', 'skinlo']) | feature_wide) & m)
            skin_i = max([i for i, k in enumerate(kinds) if k == 'skin'], key=lambda i: (L == i).sum())
            layers.append({'fill': hexc(cen[skin_i]), 'd': T(face_fill & ~nd.binary_erosion(np.zeros_like(m)))})
            m = m & ~feature_wide
        if p == 'torso':                                           # a solid base so moving arms never open gaps
            base = cv2.convexHull(np.argwhere(m)[:, ::-1].astype(np.int32))
            hull = np.zeros((H, W), np.uint8); cv2.fillConvexPoly(hull, base, 1)
            main = np.bincount(L[m].ravel(), minlength=len(cen)).argmax()
            layers.append({'fill': hexc(cen[main]), 'd': T(hull.astype(bool) & ~(part == 'head'))})
        idx = sorted(set(L[m].ravel()) - {-1}, key=lambda i: -(m & (L == i)).sum())
        for i in idx:
            d = T(m & (L == i))
            if d: layers.append({'fill': hexc(cen[i]), 'd': d})
        out['parts'][p] = layers
    # features
    def oval(c):
        ys_, xs_ = np.where(c); X = xs_.mean() / K + b[0]; Y = ys_.mean() / K + b[1]
        x, y = to_vb(X, Y)
        return {'cx': x, 'cy': y, 'rx': round((xs_.max() - xs_.min()) / 2 / K * s, 2), 'ry': round((ys_.max() - ys_.min()) / 2 / K * s, 2)}
    out['face']['eyes'] = [oval(c) for c in eyes]
    eye_fill = hexc(cen[np.bincount(L[eyes[0]].ravel()).argmax()]) if eyes else '#24150F'
    out['face']['eyeFill'] = eye_fill
    out['face']['brows'] = [{'fill': hexc(cen[np.bincount(L[c].ravel()).argmax()]), 'd': T(c), 'box': oval(c)} for c in brows]
    mo = []
    for i in sorted(set(L[mouth].ravel()) - {-1}, key=lambda i: -(mouth & (L == i)).sum()):
        d = T(mouth & (L == i))
        if d: mo.append({'fill': hexc(cen[i]), 'd': d})
    out['face']['mouth'] = mo; out['face']['mouthBox'] = oval(mouth)
    skin_i = max([i for i, k in enumerate(kinds) if k == 'skin'], key=lambda i: (L == i).sum())
    out['face']['skin'] = hexc(cen[skin_i])
    for j in ['shoulderL', 'shoulderR', 'hipL', 'hipR', 'neckP']:
        out['joints'][j] = to_vb(*R[j])
    out['joints']['waist'] = to_vb(R['midx'], R['hip'])
    for side in 'LR':                                            # hand centres (for the book / thumbs-up)
        hm = (part == 'arm' + side) & np.isin(K_, ['skin', 'skinlo'])
        ys_, xs_ = np.where(hm)
        out['joints']['hand' + side] = to_vb(xs_.mean() / K + b[0], ys_.mean() / K + b[1])
    for side in 'LR':                                            # main sleeve colour (shoulder joint filler)
        am = part == 'arm' + side
        sleeve = [i for i in np.argsort(-np.bincount(L[am & (L >= 0)].ravel(), minlength=len(cen))) if kinds[i] not in ('skin', 'skinlo')]
        out['joints']['sleeve'] = hexc(cen[sleeve[0]])
    # avatar crop around the head
    hy = np.where((part == 'head').any(1))[0]; hx = np.where((part == 'head').any(0))[0]
    x0, y0 = to_vb(hx.min() / K + b[0], hy.min() / K + b[1]); x1, y1 = to_vb(hx.max() / K + b[0], hy.max() / K + b[1])
    side = max(x1 - x0, y1 - y0) + 6
    out['head'] = [round((x0 + x1) / 2 - side / 2, 1), round(y0 - 3, 1), round(side, 1), round(side, 1)]
    # colours the CSS/JS needs for drawn expressions
    def first(kd):
        c = [hexc(cen[i]) for i, k in enumerate(kinds) if k == kd]
        return c[0] if c else None
    out['colours'] = {'mouth': first('mouth') or '#7A2230', 'tongue': first('tongue') or '#F0907A', 'ink': eye_fill}
    sizes = {p: sum(len(l['d']) for l in v) for p, v in out['parts'].items()}
    print(kid, 'eyes', len(eyes), 'brows', len(brows), 'mouth layers', len(mo), 'path chars', sizes)
    return out

data = {k: build(k) for k in RIG}
with open(os.path.join(ROOT, 'js/kids-vector.js'), 'w') as fh:
    fh.write('/* generated by tools/trace_kids.py from the character board */\nwindow.QQ_KIDV = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('wrote js/kids-vector.js', os.path.getsize(os.path.join(ROOT, 'js/kids-vector.js')) // 1024, 'KB')
