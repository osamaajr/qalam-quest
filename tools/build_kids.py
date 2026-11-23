"""Build the character sprites from the cut-outs (step 2; step 1 is tools/cut_kids.py).

Writes assets/kids/<kid>-<pose>.webp and js/kids-data.js. Every pose of a kid is placed in the game's
200 x 292 viewBox at the same scale with its feet on the same ground line (y = 284), so switching
poses never makes the character jump in size or position. Eye positions are recorded so mascot.js
can paint blinks over the real eyes.

Usage: python3 tools/build_kids.py <work-dir>     (work-dir holds cut/<kid>-<pose>-v2.png)
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = sys.argv[1]
BOARD = Image.open(os.path.join(ROOT, 'tools/ref/sami-maryam-sheet.webp')).convert('RGB')
GROUND, HEIGHT = 284.0, 270.0          # viewBox ground line and the front pose's height
# box: the crop used by cut_kids.py · ground/centre: board pixels · eyes: open eyes to blink (board px)
POSES = {
    'zaid': {
        'front': dict(box=(590, 95, 765, 432), eyes=[(663, 200, 3.9, 7.0), (692.5, 200, 3.9, 7.0)]),
        'jump':  dict(box=(1118, 160, 1345, 432), ground=423, centre=1245),
        'wow':   dict(box=(1380, 170, 1580, 427), centre=1452, eyes=[(1467.5, 262.5, 3.9, 7.0), (1500, 255, 3.9, 7.0)]),
    },
    'huda': {
        'front': dict(box=(590, 565, 770, 905), eyes=[(665, 646.5, 3.9, 7.0), (701, 646.5, 3.9, 7.0)]),
        'read':  dict(box=(1150, 628, 1365, 908), centre=1238, eyes=[(1223.5, 697.5, 3.9, 7.0), (1257.5, 692.5, 3.9, 7.0)]),
        'cheer': dict(box=(1405, 622, 1612, 908), centre=1495),
    },
}

from scipy import ndimage as nd

def find_eyes(img):
    """Open eyes = solid near-black ovals, taller than wide, in the upper half (cut-image pixels)."""
    a = np.asarray(img).astype(int); rgb, al = a[..., :3], a[..., 3] > 200
    dark = al & (rgb.max(-1) < 75)
    lab, n = nd.label(dark); eyes = []
    for i, sl in enumerate(nd.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start; area = (lab[sl] == i).sum()
        if sl[0].stop > img.height * .5 or area < 120: continue
        if 1.25 < h / max(w, 1) < 3 and area > .55 * h * w:
            eyes.append(((sl[1].start + sl[1].stop) / 2, (sl[0].start + sl[0].stop) / 2, w / 2, h / 2))
    eyes.sort(key=lambda e: -e[2] * e[3]); eyes = sorted(eyes[:2])
    return eyes if len(eyes) == 2 else []

def head_width(img, kid):
    """Width of the hair (Zaid) or hijab (Huda) in the top 45 % — the same size in every pose on the board."""
    a = np.asarray(img).astype(int); rgb, al = a[..., :3], a[..., 3] > 200
    ref = np.array([62, 37, 34]) if kid == 'zaid' else np.array([126, 26, 94])
    m = al & (np.sqrt(((rgb - ref) ** 2).sum(-1)) < 55); m[int(img.height * .55):] = False
    lab, n = nd.label(m); sizes = nd.sum(m, lab, range(1, n + 1)); big = lab == 1 + int(np.argmax(sizes))
    xs = np.where(big.any(0))[0]; return xs.max() - xs.min()

def alpha_box(img, box):
    """The cut-out (3x scale, cropped to content) placed back into board pixels."""
    a = np.asarray(img)[..., 3] > 40
    ys, xs = np.where(a)
    return xs.min(), ys.min(), xs.max(), ys.max()

out_dir = os.path.join(ROOT, 'assets/kids'); os.makedirs(out_dir, exist_ok=True)
data = {}
for kid, poses in POSES.items():
    data[kid] = {'poses': {}}
    # the front pose fixes the scale: board pixels -> viewBox units
    front = Image.open(f'{WORK}/cut/{kid}-front-v2.png')
    fb = POSES[kid]['front']['box']
    full = Image.open(f'{WORK}/cut/{kid}-front-v2.png')
    # cut images were cropped to their content; recover that offset from the AI cut (same 3x crop)
    for pose, p in poses.items():
        img = Image.open(f'{WORK}/cut/{kid}-{pose}-v2.png').convert('RGBA')
        b = p['box']
        # where the content sits inside the 3x crop: match the uncropped mask
        crop3 = BOARD.crop(b).resize(((b[2] - b[0]) * 3, (b[3] - b[1]) * 3), Image.LANCZOS)
        # template-match the cut against the crop to find its offset (exact, since it was cut from it)
        rgb = np.asarray(img)[..., :3].astype(int); al = np.asarray(img)[..., 3] > 200
        big = np.asarray(crop3).astype(int)
        ys, xs = np.where(al); sel = slice(0, len(ys), max(1, len(ys) // 400))
        best = None
        for oy in range(0, big.shape[0] - img.height + 1, 1):
            for ox in range(0, big.shape[1] - img.width + 1, 1):
                d = np.abs(big[ys[sel] + oy, xs[sel] + ox] - rgb[ys[sel], xs[sel]]).sum()
                if best is None or d < best[0]: best = (d, ox, oy)
                if d == 0: break
            if best[0] == 0: break
        ox, oy = best[1], best[2]
        left, top = b[0] + ox / 3, b[1] + oy / 3                       # content origin in board px
        w, h = img.width / 3, img.height / 3
        p['left'], p['top'], p['w'], p['h'] = left, top, w, h
    f = poses['front']
    fimg = Image.open(f'{WORK}/cut/{kid}-front-v2.png').convert('RGBA')
    base_scale = HEIGHT / f['h']; fhw = head_width(fimg, kid)
    for pose, p in poses.items():
        img = Image.open(f'{WORK}/cut/{kid}-{pose}-v2.png').convert('RGBA')
        scale = base_scale * fhw / head_width(img, kid)            # every pose at the front pose's head size
        print(kid, pose, 'size x%.2f' % (fhw / head_width(img, kid)))
        ground = p.get('ground', p['top'] + p['h'])                    # feet on the ground unless in the air
        centre = p.get('centre', p['left'] + p['w'] / 2)
        x = 100 + (p['left'] - centre) * scale
        y = GROUND + (p['top'] - ground) * scale
        img = Image.open(f'{WORK}/cut/{kid}-{pose}-v2.png').convert('RGBA')
        px_h = 640                                                      # enough for 2x screens at the largest size
        img = img.resize((round(img.width * px_h / img.height), px_h), Image.LANCZOS)
        name = f'{kid}-{pose}.webp'
        img.save(os.path.join(out_dir, name), 'WEBP', quality=88, method=6)
        eyes = []
        arr = np.asarray(Image.open(f'{WORK}/cut/{kid}-{pose}-v2.png').convert('RGBA'))
        k3 = scale / 3                                                  # cut pixels -> viewBox units
        for ex, ey, rx, ry in find_eyes(Image.open(f'{WORK}/cut/{kid}-{pose}-v2.png').convert('RGBA')):
            sx, sy = int(ex + rx * 2.6), int(ey)
            r, g, bb = arr[sy, sx, :3]
            eyes.append({'cx': round(x + ex * k3, 2), 'cy': round(y + ey * k3, 2), 'rx': round(rx * k3 * 1.35, 2),
                         'ry': round(ry * k3 * 1.22, 2), 'skin': '#%02X%02X%02X' % (r, g, bb)})
        data[kid]['poses'][pose] = {'href': f'assets/kids/{name}', 'x': round(x, 2), 'y': round(y, 2),
                                    'w': round(p['w'] * scale, 2), 'h': round(p['h'] * scale, 2), 'eyes': eyes}
        print(kid, pose, len(eyes), 'eyes', data[kid]['poses'][pose]['x'], data[kid]['poses'][pose]['y'], os.path.getsize(os.path.join(out_dir, name)) // 1024, 'KB')
    # avatar crop: the front pose's head
    fp = data[kid]['poses']['front']
    data[kid]['head'] = [round(fp['x'] + fp['w'] * 0.02, 1), round(fp['y'] - 2, 1), round(fp['w'] * 0.96, 1), round(fp['w'] * 0.96, 1)]

with open(os.path.join(ROOT, 'js/kids-data.js'), 'w') as fh:
    fh.write('/* generated by tools/build_kids.py from the character board */\nwindow.QQ_KIDS = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('wrote js/kids-data.js')
