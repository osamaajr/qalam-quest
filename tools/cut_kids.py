"""Cut the character poses out of the character board (tools/ref/sami-maryam-sheet.webp).
Step 1 of 2 (step 2 is tools/build_kids.py). Needs: pip install "rembg[cpu]" scipy matplotlib
Usage: python3 tools/cut_kids.py <work-dir>   (first run tools/cut_kids_ai.py <work-dir> for the AI masks)
"""
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
S = sys.argv[1]
board = Image.open('/Users/osamaalnajar/qalam-quest/tools/ref/sami-maryam-sheet.webp').convert('RGB')
BOX = {'zaid-front': (590, 95, 765, 432), 'zaid-jump': (1118, 160, 1345, 432), 'zaid-wow': (1380, 170, 1580, 427),
       'huda-front': (590, 565, 770, 905), 'huda-read': (1150, 628, 1365, 908), 'huda-cheer': (1405, 622, 1612, 908)}
for k, b in BOX.items():
    crop = board.crop(b); big = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
    rgb = np.asarray(big).astype(float)
    ai = np.asarray(Image.open(f'{S}/cut/{k}.png'))[..., 3] > 128
    # background colour: median of the crop border
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(edge, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    colour = dist > 48                                   # clearly not paper or the beige ground shadow
    m = colour | ai
    m = nd.binary_closing(m, np.ones((7, 7)), iterations=2)
    m = nd.binary_fill_holes(m)                          # book pages, gaps inside the figure
    # drop specks and the beige shadow blobs (low-saturation, near the bottom, not attached to the figure)
    lab, n = nd.label(m); sizes = nd.sum(m, lab, range(1, n + 1)); main = 1 + int(np.argmax(sizes))
    keep = np.zeros_like(m)
    for i, sz in enumerate(sizes, 1):
        if i == main: keep |= lab == i; continue
        ys, xs = np.where(lab == i); comp = rgb[lab == i]
        sat = (comp.max(1) - comp.min(1)).mean()
        if sz > 400 and sat > 60: keep |= lab == i          # keep coloured accents (yellow spark rays)
    # shave the beige shadow that touches the feet: low saturation + light + bottom 8 %
    h = m.shape[0]; low = np.zeros_like(m); low[int(h * .9):] = True
    satmap = rgb.max(-1) - rgb.min(-1)
    shadow = low & (satmap < 45) & (rgb.mean(-1) > 190) & ~ai
    keep &= ~shadow
    if k == 'huda-read':   # the open book's cream pages (measured on the board, board pixels)
        from matplotlib.path import Path as MPath
        poly = [(1263, 741), (1290, 736.5), (1312, 736), (1352.5, 730.5), (1344.5, 786), (1263, 789)]
        poly = [((x - b[0]) * 3, (y - b[1]) * 3) for x, y in poly]
        yy, xx = np.mgrid[0:h, 0:m.shape[1]]
        keep |= MPath(poly).contains_points(np.c_[xx.ravel(), yy.ravel()]).reshape(m.shape)
    keep = nd.binary_erosion(keep, np.ones((3, 3)), iterations=2)   # trim the paper-coloured halo
    a = Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    out = big.convert('RGBA'); out.putalpha(a)
    out = out.crop(out.getbbox()); out.save(f'{S}/cut/{k}-v2.png'); print(k, out.size)
