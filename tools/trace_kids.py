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
                 face=(645, 604, 742, 704), head_colours='hijab skin mouth'),
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

def dissolve_thin(L, fig, kinds, r=7):
    """Hairline regions (anti-aliased edges: dark rings, pale seams) -> their neighbours' colours.
    Narrow features that ARE in the art (stripes, drawstrings, eyes, brows) use a gentler threshold."""
    keep = np.zeros_like(fig)
    for i in set(L[fig].ravel()) - {-1}:
        rr = 3 if kinds[i] in ('white', 'cream', 'dark') else r
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * rr + 1, 2 * rr + 1))
        m = (L == i).astype(np.uint8)
        keep |= cv2.morphologyEx(m, cv2.MORPH_OPEN, k).astype(bool) & (L == i)
    gone = fig & ~keep
    if gone.any() and keep.any():
        _, (gy, gx) = nd.distance_transform_edt(~keep, return_indices=True)
        L = L.copy(); L[gone] = L[gy[gone], gx[gone]]
    return L

def fit_pill(comp, to_vb, K, b, s):
    """Rotated rounded rectangle fitted to a component (drawstrings, shoe stripes, cargo pockets)."""
    ys, xs = np.where(comp)
    (cx, cy), (w, h), ang = cv2.minAreaRect(np.c_[xs, ys].astype(np.float32))
    if w < h: w, h, ang = h, w, ang + 90                         # long side along the angle
    x, y = to_vb(cx / K + b[0], cy / K + b[1])
    return {'cx': x, 'cy': y, 'w': round(w / K * s, 2), 'h': round(h / K * s, 2), 'a': round(float(ang), 1)}

def fit_brow(comp, to_vb, K, b, s):
    """A brow as one smooth stroked curve: quadratic fitted along its main axis, width = its thickness."""
    ys, xs = np.where(comp); P = np.c_[xs, ys].astype(float); c = P.mean(0)
    u, sv, vt = np.linalg.svd(P - c, full_matrices=False); ax, nx = vt[0], vt[1]
    if ax[0] < 0: ax = -ax
    t = (P - c) @ ax; v = (P - c) @ nx
    co = np.polyfit(t, v, 2); t0, t1 = np.percentile(t, 2), np.percentile(t, 98)
    thick = 2 * float(np.percentile(nd.distance_transform_edt(comp)[comp], 97)) * .95   # true stroke thickness
    f = lambda tt: c + ax * tt + nx * np.polyval(co, tt)
    df = 2 * co[0] * t0 + co[1]
    p0, p2 = f(t0 + thick / 2), f(t1 - thick / 2)                 # pull the ends in by half a stroke (round caps)
    tm = (t0 + t1) / 2; ctrl = c + ax * tm + nx * (np.polyval(co, t0) + (2 * co[0] * t0 + co[1]) * (tm - t0) * 0 + 0)
    # control point of the quadratic Bezier that matches the fitted parabola between the ends
    ta, tb = t0 + thick / 2, t1 - thick / 2; tmid = (ta + tb) / 2
    va, vb_ = np.polyval(co, ta), np.polyval(co, tb); dva = 2 * co[0] * ta + co[1]
    vc = va + dva * (tmid - ta)
    ctrl = c + ax * tmid + nx * vc
    V = lambda q: to_vb(q[0] / K + b[0], q[1] / K + b[1])
    (x0, y0), (x1, y1), (x2, y2) = V(p0), V(ctrl), V(p2)
    return {'d': f'M{x0} {y0}Q{x1} {y1} {x2} {y2}', 'w': round(thick / K * s, 2)}

def despeckle(L, fig, min_area=700):
    """Small isolated patches of any colour -> the colour around them."""
    small = np.zeros_like(fig)
    for i in set(L[fig].ravel()) - {-1}:
        lab, n = nd.label(L == i)
        if not n: continue
        sizes = nd.sum(L == i, lab, range(1, n + 1))
        small |= np.isin(lab, 1 + np.where(sizes < min_area)[0]) & (lab > 0)
    if small.any():
        good = fig & ~small
        _, (gy, gx) = nd.distance_transform_edt(~good, return_indices=True)
        L = L.copy(); L[small] = L[gy[small], gx[small]]
    return L

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
        if (comp & edge).any() and by[sl].mean() < (by[fig].max() - 22):   # keep only the shoe soles
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
            dark_i = [i for i, k in enumerate(kinds) if k == 'dark']
            good = fig & ~junk & ~(np.isin(L, dark_i) & (by < R['neck']))
            _, (gy, gx) = nd.distance_transform_edt(~good, return_indices=True)
            L[junk] = L[gy[junk], gx[junk]]
        L = np.where(fig, cv2.medianBlur((L + 1).astype(np.uint8), 7).astype(int) - 1, -1)
        hole = fig & (L < 0)
        if hole.any():
            _, (gy, gx) = nd.distance_transform_edt(~(fig & (L >= 0)), return_indices=True)
            L[hole] = L[gy[hole], gx[hole]]
    L0 = L.copy()                                                   # before clean-up: thin stripes still separate
    L = dissolve_thin(L, fig, kinds, r=9)
    # eye-dark specks below the neck (anti-aliased trouser/shoe edges) -> their neighbours
    stray = fig & np.isin(L, [i for i, k in enumerate(kinds) if k == 'dark' and cen[i][0] > cen[i][2] + 8]) & (by > R['neck'] + 10)   # brown ink only, not navy/plum trousers
    if stray.any():
        good = fig & ~stray
        _, (gy, gx) = nd.distance_transform_edt(~good, return_indices=True)
        L[stray] = L[gy[stray], gx[stray]]
    L = despeckle(L, fig)
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
        part[fig & (K_ == 'hijab') & (by < R['hip'])] = 'head'          # (her shoes are the same plum)
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
    T = lambda mask, **kw: trace((mask * 255).astype(np.uint8), scale=scale, offset=offset, eps=1.8, min_area=90, min_thick=4.5, **kw)

    out = {'parts': {}, 'joints': {}, 'face': {}}
    shoes = {}
    shoe_kinds = ['shoe', 'shoelight'] if kid == 'zaid' else ['hijab']
    for side in 'LR':
        lm = (part == 'leg' + side) & fig
        sh = lm & np.isin(K_, shoe_kinds) & (by > R['hip'] + 20)
        ys_, xs_ = np.where(lm); ys2, xs2 = np.where(sh)
        top = ys2.min(); bot = ys_.max()
        x0 = np.percentile(xs_[ys_ > top], 1); x1 = np.percentile(xs_[ys_ > top], 99)
        (X0, Y0), (X1, Y1) = to_vb(x0 / K + b[0], top / K + b[1]), to_vb(x1 / K + b[0], bot / K + b[1])
        main = np.bincount(L[sh].ravel()).argmax()
        shoes[side] = {'x0': X0, 'y0': Y0, 'x1': X1, 'y1': Y1, 'fill': hexc(cen[main])}
        part[lm & (yy > top + 4 * K)] = ''                        # trousers stop just inside the shoe
    out['shoes'] = shoes
    pills = {p: [] for p in ['legL', 'legR', 'torso', 'head', 'armL', 'armR']}
    pill_kinds = ['white'] + (['other'] if kid == 'zaid' else [])
    K0 = np.array(kinds + ['none'])[np.where(L0 >= 0, L0, len(kinds))]
    lab_p, npill = nd.label(fig & (np.isin(K_, pill_kinds) | (K0 == 'white')) & ~np.isin(part, ['head', '']))
    for i, sl in enumerate(nd.find_objects(lab_p), 1):
        comp = lab_p == i
        if comp.sum() < 250: continue
        pp = part[comp][0]; col = np.bincount(L0[comp].ravel()).argmax()
        if pp == '' or (pp.startswith('leg') and kinds[col] == 'white'): continue   # shoe stripes are redrawn
        pieces = [comp]
        if kinds[col] == 'white' and pp.startswith('leg'):          # two stripes touching at a corner: split them
            er = nd.binary_erosion(comp, np.ones((3, 3)), iterations=4); sl2, n2 = nd.label(er)
            if n2 >= 2:
                pieces = [nd.binary_dilation(sl2 == j, np.ones((3, 3)), iterations=4) & comp for j in range(1, n2 + 1) if (sl2 == j).sum() > 60]
        for pc in pieces:
            pl = fit_pill(pc, to_vb, K, b, s); pl['fill'] = hexc(cen[col])
            if kinds[col] == 'white' and pp.startswith('leg'):
                if pl['cy'] > 274: continue                          # sole highlight, not a stripe
                if kid == 'zaid': pl['h'] = min(pl['h'], 4.4)       # his paired stripes (hers is one wide stripe)
            pl['rx'] = round(min(pl['h'] / 2, pl['w'] / 2) * (1 if kinds[col] == 'white' else .45), 2)
            pills[pp].append(pl)
        # repaint what the pill covers with the colour around it, so the traced layer underneath is whole
        ring = nd.binary_dilation(comp, np.ones((3, 3)), iterations=6) & ~nd.binary_dilation(comp, np.ones((3, 3)), iterations=2) & fig
        if ring.any():
            around = np.bincount(L[ring & (L != col)].ravel(), minlength=len(cen)).argmax()
            L[nd.binary_dilation(comp, np.ones((3, 3)), iterations=2) & fig] = around
    K_ = np.array(kinds + ['none'])[np.where(L >= 0, L, len(kinds))]
    for p in ['legL', 'legR', 'torso', 'head', 'armL', 'armR']:
        own = part == p
        mine = np.isin(L, list(set(L[own].ravel()) - {-1}))             # grow only into this part's own colours
        if p in ('torso', 'legL', 'legR'): mine &= ~np.isin(K_, ['skin', 'skinlo'])
        m = (nd.binary_dilation(own, np.ones((3, 3)), iterations=3) & fig & mine) | own
        layers = []
        # the part's own smooth outline: underlay in its main colour, and the clip for every colour on top
        sil = nd.binary_fill_holes(m)
        if p in ('armL', 'armR'): sil = sil | (nd.binary_dilation(sil, np.ones((3, 3)), iterations=6) & nd.binary_dilation(part == 'torso', np.ones((3, 3)), iterations=2))   # overlap the torso only
        edge_ring = sil & ~nd.binary_erosion(sil, np.ones((3, 3)), iterations=4) & own & (L >= 0)
        main = np.bincount(L[edge_ring].ravel(), minlength=len(cen)).argmax()   # underlay = the colour along the part's edge
        if p in ('armL', 'armR'):                                  # an arm's underlay is always its sleeve
            cnt = np.bincount(L[own & (L >= 0)].ravel(), minlength=len(cen))
            for i in np.argsort(-cnt):
                if kinds[i] not in ('skin', 'skinlo', 'tongue'): main = i; break
        r_ = 4 if (p == 'head' and kid == 'huda') else 2               # the hijab's painted edge is rough: smooth it more
        sil = nd.binary_opening(nd.binary_closing(sil, np.ones((5, 5)), iterations=r_), np.ones((5, 5)), iterations=r_ - 1)
        clip = T(sil, blur=9.0 if r_ == 4 else 5.0)
        layers.append({'fill': hexc(cen[main]), 'd': clip})
        if p == 'head':                                            # face skin goes under the features
            face_fill = nd.binary_fill_holes((np.isin(K_, ['skin', 'skinlo']) | feature_wide) & m)
            skin_i = max([i for i, k in enumerate(kinds) if k == 'skin'], key=lambda i: (L == i).sum())
            layers.append({'fill': hexc(cen[skin_i]), 'd': T(face_fill, blur=2.5)})
            m = m & ~feature_wide & ~(inface & np.isin(K_, ['dark', 'white']))
        if p == 'torso':                                           # a solid base so moving arms never open gaps
            base = cv2.convexHull(np.argwhere(m)[:, ::-1].astype(np.int32))
            hull = np.zeros((H, W), np.uint8); cv2.fillConvexPoly(hull, base, 1)
            hull = nd.binary_dilation(hull.astype(bool), np.ones((3, 3)), iterations=5) & nd.binary_dilation(fig, np.ones((3, 3)), iterations=2)
            layers.insert(0, {'fill': hexc(cen[main]), 'd': T(hull & ~(part == 'head'), blur=3.0), 'noclip': True})
        idx = sorted(set(L[m].ravel()) - {-1, main}, key=lambda i: -(m & (L == i)).sum())
        idx = [i for i in idx if kinds[i] not in ('white', 'cream', 'shoelight')]
        if p.startswith('leg'): idx = [i for i in idx if kinds[i] not in ('mint', 'blue', 'skin', 'skinlo', 'tongue')]   # no top-colour specks on the trousers
        for i in idx:
            reg = nd.binary_dilation(m & (L == i), np.ones((3, 3)), iterations=2)   # overlap neighbours: no gaps
            reg = nd.binary_opening(reg, np.ones((3, 3)), iterations=2)
            d = T(reg, blur=3.4)
            if d: layers.append({'fill': hexc(cen[i]), 'd': d})
        out['parts'][p] = {'clip': clip, 'layers': layers, 'pills': pills[p]}
    # features
    def oval(c):
        ys_, xs_ = np.where(c); X = xs_.mean() / K + b[0]; Y = ys_.mean() / K + b[1]
        x, y = to_vb(X, Y)
        return {'cx': x, 'cy': y, 'rx': round((xs_.max() - xs_.min()) / 2 / K * s, 2), 'ry': round((ys_.max() - ys_.min()) / 2 / K * s, 2)}
    out['face']['eyes'] = [oval(c) for c in eyes]
    eye_fill = hexc(cen[np.bincount(L[eyes[0]].ravel()).argmax()]) if eyes else '#24150F'
    out['face']['eyeFill'] = eye_fill
    out['face']['brows'] = []
    for c in brows:
        br = fit_brow(c, to_vb, K, b, s); br['stroke'] = hexc(cen[np.bincount(L[c].ravel()).argmax()]); br['box'] = oval(c)
        out['face']['brows'].append(br)
    mclip = T(nd.binary_fill_holes(mouth), blur=3.0)
    dark_m = np.bincount(L[mouth].ravel()).argmax()
    for i in set(L[mouth].ravel()):                               # the mouth's darkest red is its base
        if kinds[i] == 'mouth' and lum(cen[i]) < lum(cen[dark_m]): dark_m = i
    mlayers = [{'fill': hexc(cen[dark_m]), 'd': mclip}]
    for i in sorted(set(L[mouth].ravel()) - {-1, dark_m}, key=lambda i: -(mouth & (L == i)).sum()):
        reg = nd.binary_opening(mouth & (L == i), np.ones((3, 3)), iterations=2)
        reg = nd.binary_dilation(reg, np.ones((3, 3)), iterations=2)
        d = T(reg, blur=2.5)
        if d: mlayers.append({'fill': hexc(cen[i]), 'd': d})
    out['face']['mouth'] = {'clip': mclip, 'layers': mlayers}; out['face']['mouthBox'] = oval(mouth)
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
    sizes = {p: sum(len(l['d']) for l in v['layers']) for p, v in out['parts'].items()}
    print(kid, 'eyes', len(eyes), 'brows', len(brows), 'mouth layers', len(out['face']['mouth']['layers']), 'pills', {p: len(v) for p, v in pills.items() if v}, 'path chars', sizes)
    return out

data = {k: build(k) for k in RIG}
with open(os.path.join(ROOT, 'js/kids-vector.js'), 'w') as fh:
    fh.write('/* generated by tools/trace_kids.py from the character board */\nwindow.QQ_KIDV = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('wrote js/kids-vector.js', os.path.getsize(os.path.join(ROOT, 'js/kids-vector.js')) // 1024, 'KB')
