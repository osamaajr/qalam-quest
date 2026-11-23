"""Turn flat-colour artwork into smooth SVG paths (used for the logo and the characters).

trace(mask, scale) -> an SVG path 'd' for every region in a binary mask (holes kept, fill-rule evenodd).
Contours are found on an up-scaled mask, simplified, then drawn as Catmull-Rom curves; sharp corners
(e.g. a pen-nib tip) stay sharp.
"""
import math
import cv2
import numpy as np


def _smooth_path(pts, corner_deg=118):
    n = len(pts)
    if n < 3: return ''
    def ang(i):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
        v1, v2 = a - b, c - b
        d = np.linalg.norm(v1) * np.linalg.norm(v2)
        return 180 if d == 0 else math.degrees(math.acos(max(-1, min(1, float(v1 @ v2) / d))))
    sharp = [ang(i) < corner_deg for i in range(n)]
    out = [f'M{pts[0][0]:.1f} {pts[0][1]:.1f}']
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = p1 if sharp[i] else p1 + (p2 - p0) / 6
        c2 = p2 if sharp[(i + 1) % n] else p2 - (p3 - p1) / 6
        if sharp[i] and sharp[(i + 1) % n]: out.append(f'L{p2[0]:.1f} {p2[1]:.1f}')
        else: out.append(f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}')
    return ''.join(out) + 'Z'


def trace(mask, scale=1.0, eps=1.2, min_area=30, offset=(0, 0), corner_deg=118):
    """mask: uint8 (0/255) at the working resolution. Returns path data in output units (pixels / scale)."""
    m = cv2.GaussianBlur(mask, (0, 0), 1.2)
    _, m = cv2.threshold(m, 127, 255, cv2.THRESH_BINARY)
    cnts, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in cnts:
        if abs(cv2.contourArea(c)) < min_area: continue
        a = cv2.approxPolyDP(c, eps, True).reshape(-1, 2).astype(float)
        if len(a) < 3: continue
        a = a / scale + np.array(offset)
        parts.append(_smooth_path(a, corner_deg))
    return ''.join(parts)


def classify(rgb, palette):
    """Label every pixel with the index of the nearest palette colour (rgb: HxWx3 float)."""
    pal = np.array(palette, float)
    d = ((rgb[:, :, None, :] - pal[None, None]) ** 2).sum(-1)
    return d.argmin(-1)
