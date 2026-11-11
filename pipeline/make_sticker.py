# Turn a photo or drawing into a library sticker: removes the background (rembg, isnet-general-use),
# trims, centres it on a 512x512 transparent canvas, adds a white sticker outline, saves library/stickers/<name>.png
# and records it in library/stickers/index.json.
# Usage: python3 pipeline/make_sticker.py <image> <name> "<what it shows>" [--keep-bg] [--no-outline]
import sys, json, os
import numpy as np
from PIL import Image, ImageFilter

src, name, desc = sys.argv[1], sys.argv[2], sys.argv[3]
keep_bg, outline = '--keep-bg' in sys.argv, '--no-outline' not in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
img = Image.open(src).convert('RGBA')
if not keep_bg and img.getchannel('A').getextrema()[0] == 255:  # opaque image: cut the subject out
    from rembg import remove, new_session
    img = remove(img, session=new_session('isnet-general-use'), post_process_mask=True)
a = np.array(img)
a[..., 3] = np.where(a[..., 3] < 24, 0, a[..., 3])  # drop faint halo pixels
img = Image.fromarray(a)
img = img.crop(img.getbbox())
S, PAD = 512, 36
k = (S - 2 * PAD) / max(img.size)
img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
canvas.paste(img, ((S - img.width) // 2, (S - img.height) // 2), img)
if outline:  # white die-cut border around the alpha shape
    al = canvas.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    border = al.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(1.2))
    white = Image.new('RGBA', (S, S), (255, 255, 255, 255)); white.putalpha(border)
    canvas = Image.alpha_composite(white, canvas)
out = os.path.join(ROOT, 'library', 'stickers', name + '.png')
canvas.save(out, optimize=True)
idx_p = os.path.join(ROOT, 'library', 'stickers', 'index.json')
idx = json.load(open(idx_p)) if os.path.exists(idx_p) else {}
idx[name] = desc
json.dump(idx, open(idx_p, 'w'), ensure_ascii=False, indent=1)
print('saved', out, 'as', 'lib:' + name)
