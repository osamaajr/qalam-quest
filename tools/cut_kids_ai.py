"""AI masks for tools/cut_kids.py (rembg isnet-general-use). Usage: python3 tools/cut_kids_ai.py <work-dir>"""
import sys, os
from PIL import Image
from rembg import remove, new_session
S = sys.argv[1]
board = Image.open('/Users/osamaalnajar/qalam-quest/tools/ref/sami-maryam-sheet.webp').convert('RGB')
BOX = {'zaid-front': (590, 95, 765, 432), 'zaid-jump': (1118, 160, 1345, 432), 'zaid-wow': (1380, 170, 1580, 427),
       'huda-front': (590, 565, 770, 905), 'huda-read': (1150, 628, 1365, 908), 'huda-cheer': (1405, 622, 1612, 908)}
sess = new_session('isnet-general-use')
for k, b in BOX.items():
    crop = board.crop(b)
    big = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)   # model works better on larger input
    out = remove(big, session=sess, post_process_mask=True)
    out.save(f'{S}/cut/{k}.png'); print(k, out.size)
