"""Make new stickers for the digital library with the OpenAI image API (GPT Image).

Each request becomes `lib:<category>-<number>` stickers (library/stickers/, same as Hossein's own stickers),
with a white die-cut border (pipeline/make_sticker.py) and a refreshed numbered preview sheet
(library/stickers/previews/preview-<category>.jpg).

Requests: library/ai-images/requests.txt, one per line:  category | what to draw | count
  e.g.  transport | a red double-decker London bus | 2
Done lines are remembered in library/ai-images/log.json and never generated twice.

Env: OPENAI_API_KEY (required), OPENAI_IMAGE_MODEL (optional; default = newest gpt-image model the key can use),
     OPENAI_IMAGE_QUALITY (low | medium | high, default medium). At most MAX_PER_RUN images per run (cost guard).
"""
import base64, hashlib, json, os, re, subprocess, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STK = os.path.join(ROOT, 'library', 'stickers')
REQ = os.path.join(ROOT, 'library', 'ai-images', 'requests.txt')
LOG = os.path.join(ROOT, 'library', 'ai-images', 'log.json')
MAX_PER_RUN = 20
STYLE = ('A single die-cut sticker illustration of {what}. Bold, clean cartoon style with soft shading, vibrant saturated colours, '
         'the whole subject centred and fully visible, transparent background, no text, no letters, no logos, no watermark, no real people.')
API = 'https://api.openai.com/v1'


def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY'], 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


def pick_model():
    if os.environ.get('OPENAI_IMAGE_MODEL'): return os.environ['OPENAI_IMAGE_MODEL']
    ids = [m['id'] for m in call('/models').get('data', []) if m['id'].startswith('gpt-image')]
    if not ids: sys.exit('ERROR: this API key has no gpt-image model')
    ver = lambda i: [float(x) for x in re.findall(r'\d+(?:\.\d+)?', i)[:1]] or [0]
    ids.sort(key=lambda i: (ver(i), 'mini' not in i, -len(i)), reverse=True)  # newest version, full model, plain name
    print('models available:', ', '.join(ids))
    return ids[0]


def generate(model, what, n):
    body = {'model': model, 'prompt': STYLE.format(what=what), 'n': n, 'size': '1024x1024',
            'background': 'transparent', 'output_format': 'png', 'quality': os.environ.get('OPENAI_IMAGE_QUALITY', 'medium')}
    for drop in ([], ['quality'], ['quality', 'background', 'output_format']):  # older/newer models may not take every option
        b = {k: v for k, v in body.items() if k not in drop}
        try:
            d = call('/images/generations', b)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')[:400]
            if e.code == 400 and drop != ['quality', 'background', 'output_format']:
                print('retrying without', drop or 'quality', '-', msg); continue
            sys.exit('ERROR %s: %s' % (e.code, msg))
    out = []
    for it in d.get('data', []):
        if it.get('b64_json'): out.append(base64.b64decode(it['b64_json']))
        elif it.get('url'):
            with urllib.request.urlopen(it['url'], timeout=120) as r: out.append(r.read())
    return out


def next_num(cat):
    nums = [int(m.group(1)) for f in os.listdir(STK) for m in [re.match(re.escape(cat) + r'-(\d+)\.png$', f)] if m]
    return max(nums, default=0) + 1


def preview(cat):
    from PIL import Image, ImageDraw, ImageFont
    files = sorted(f for f in os.listdir(STK) if re.match(re.escape(cat) + r'-\d+\.png$', f))
    cols, cell = 10, 180
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 26) + 50), (40, 44, 52))
    d = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('DejaVuSans-Bold.ttf', 18); big = ImageFont.truetype('DejaVuSans-Bold.ttf', 28)
    except OSError: font = big = ImageFont.load_default()
    d.text((12, 10), 'lib:%s-NNN  (%d stickers)' % (cat, len(files)), fill=(255, 201, 74), font=big)
    for k, f in enumerate(files):
        x, y = (k % cols) * cell, 50 + (k // cols) * (cell + 26)
        im = Image.open(os.path.join(STK, f)).convert('RGBA'); im.thumbnail((cell - 20, cell - 20))
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2), im)
        d.text((x + 8, y + cell), f[len(cat) + 1:-4], fill=(255, 255, 255), font=font)
    os.makedirs(os.path.join(STK, 'previews'), exist_ok=True)
    sheet.save(os.path.join(STK, 'previews', 'preview-%s.jpg' % cat), quality=85)


def main():
    if not os.environ.get('OPENAI_API_KEY'): sys.exit('ERROR: add the repo secret OPENAI_API_KEY first')
    lines = []
    for line in open(REQ, encoding='utf-8') if os.path.exists(REQ) else []:
        line = line.split('#', 1)[0].strip()
        if not line: continue
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 2 or not parts[0] or not parts[1]: print('skip (need "category | what to draw | count"):', line); continue
        cat = re.sub(r'[^a-z0-9]+', '-', parts[0].lower()).strip('-')
        n = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 1
        lines.append((hashlib.sha1(line.encode()).hexdigest()[:12], cat, parts[1], max(1, min(n, 4))))
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    todo = [l for l in lines if l[0] not in log]
    if not todo: print('nothing new in requests.txt'); return
    model = pick_model(); print('model:', model)
    made, cats = 0, set()
    for h, cat, what, n in todo:
        n = min(n, MAX_PER_RUN - made)
        if n <= 0: print('cost guard: stopping at', MAX_PER_RUN, 'images this run'); break
        imgs = generate(model, what, n); names = []
        for b in imgs:
            name = '%s-%03d' % (cat, next_num(cat))
            tmp = os.path.join('/tmp', name + '.png'); open(tmp, 'wb').write(b)
            subprocess.run([sys.executable, os.path.join(ROOT, 'pipeline', 'make_sticker.py'), tmp, name, what], check=True)
            names.append(name); print('made lib:%s  <- %s' % (name, what))
        made += len(imgs); cats.add(cat)
        log[h] = {'category': cat, 'prompt': what, 'stickers': names, 'model': model}
        json.dump(log, open(LOG, 'w'), indent=1, ensure_ascii=False)
    for c in cats: preview(c)
    print('done: %d new stickers' % made)


if __name__ == '__main__':
    main()
