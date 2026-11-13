"""Fetch real b-roll footage (cities, landscapes, landmarks) from the free Pexels and Pixabay APIs
into the digital library: library/broll/index.json (metadata + credits) and library/broll/previews/ (contact sheets).

The clips themselves are trimmed to <= 12 s, cut to 1920x1080 (no audio) and stored as assets of the GitHub
release "library-broll", so the git repo stays small. Episodes use them with a `footage` scene (see CLAUDE.md).

Usage:
  python pipeline/fetch_broll.py "Kyoto temple" "Swiss Alps" --count 6
  python pipeline/fetch_broll.py --file library/broll/requests.txt        # one query per line, optional "| count"
Options: --count N (per query, default 6), --no-upload (keep files in build/broll, don't touch the release)
Env: PEXELS_API_KEY, PIXABAY_API_KEY (at least one), GH_TOKEN for the release upload (GitHub Actions).

Rules we follow (Pexels/Pixabay API terms): stay far below the rate limits (Pexels 200/h, Pixabay 100/min),
no mass downloads (a handful of clips per query), credit the source and the author (index.json keeps both;
the engine shows a small credit on screen and episodes list them in the description).
"""
import argparse, datetime, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'library', 'broll')
INDEX = os.path.join(LIB, 'index.json')
WORK = os.path.join(ROOT, 'build', 'broll')
REPO = os.environ.get('GITHUB_REPOSITORY', 'applay101/world-countries-motion')
TAG = 'library-broll'
MAX_LEN, MIN_LEN = 12.0, 4.0
UA = {'User-Agent': 'world-countries-motion b-roll library (github.com/%s)' % REPO}


def get_json(url, headers=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                time.sleep(30); continue
            raise


def download(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


# ---------- search: normalise both APIs into one candidate shape ----------
def pexels(query, n):
    key = os.environ.get('PEXELS_API_KEY')
    if not key: return []
    q = urllib.parse.urlencode({'query': query, 'orientation': 'landscape', 'size': 'medium', 'per_page': min(40, n * 4)})
    d = get_json('https://api.pexels.com/videos/search?' + q, {'Authorization': key})
    out = []
    for v in d.get('videos', []):
        files = [f for f in v.get('video_files', []) if f.get('width') and f.get('height') and f['width'] >= 1920 and f['width'] > f['height'] and f.get('link')]
        if not files: continue
        f = min(files, key=lambda f: f['width'])  # the smallest file that is still full HD
        out.append({'source': 'pexels', 'source_id': str(v['id']), 'duration': v.get('duration', 0), 'width': f['width'], 'height': f['height'],
                    'download': f['link'], 'page_url': v.get('url'), 'author': (v.get('user') or {}).get('name', ''),
                    'author_url': (v.get('user') or {}).get('url', ''), 'tags': [], 'license': 'Pexels License (free to use, https://www.pexels.com/license/)'})
    return out


def pixabay(query, n):
    key = os.environ.get('PIXABAY_API_KEY')
    if not key: return []
    q = urllib.parse.urlencode({'key': key, 'q': query[:100], 'video_type': 'film', 'safesearch': 'true', 'per_page': max(3, min(50, n * 4)), 'order': 'popular'})
    d = get_json('https://pixabay.com/api/videos/?' + q)
    out = []
    for v in d.get('hits', []):
        vids = v.get('videos', {})
        f = next((vids[k] for k in ('medium', 'large') if vids.get(k, {}).get('url') and vids[k].get('width', 0) >= 1920), None)
        if not f or f['width'] <= f['height']: continue
        out.append({'source': 'pixabay', 'source_id': str(v['id']), 'duration': v.get('duration', 0), 'width': f['width'], 'height': f['height'],
                    'download': f['url'], 'page_url': v.get('pageURL'), 'author': v.get('user', ''),
                    'author_url': 'https://pixabay.com/users/%s-%s/' % (v.get('user', ''), v.get('user_id', '')), 'tags': [t.strip() for t in v.get('tags', '').split(',') if t.strip()],
                    'license': 'Pixabay Content License (free to use, https://pixabay.com/service/license-summary/)'})
    return out


# ---------- download + normalise one clip ----------
def process(c, work):
    cid = '%s-%s' % (c['source'], c['source_id'])
    raw, out, poster = (os.path.join(work, cid + x) for x in ('.src.mp4', '.mp4', '.jpg'))
    if c['download'].startswith('file://'): raw = c['download'][7:]  # local test files
    else: download(c['download'], raw)
    start = 0.5 if c['duration'] > MAX_LEN + 1 else 0.0
    length = min(MAX_LEN, max(MIN_LEN, c['duration'] - start)) if c['duration'] else MAX_LEN
    vf = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(start), '-i', raw, '-t', '%.2f' % length, '-an', '-vf', vf,
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', out], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '%.2f' % min(1.5, length / 2), '-i', out, '-frames:v', '1', '-vf', 'scale=480:270', poster], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip() or length)
    if raw.endswith('.src.mp4') and os.path.exists(raw): os.remove(raw)
    return cid, out, poster, round(dur, 2)


def contact_sheet(entries, query, work):
    """Numbered preview sheet (like the sticker previews) so a script writer can pick a clip by eye."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print('Pillow missing: no contact sheet'); return None
    ims = []
    for e in entries:
        p = os.path.join(work, e['id'] + '.jpg')
        if not os.path.exists(p):  # clip fetched in an earlier run: its poster is on the release
            try: download(e['url'].replace('.mp4', '.jpg'), p)
            except Exception: continue
        ims.append((e, p))
    if not ims: return None
    cols = 3; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 490 + 10, rows * 310 + 60), (12, 18, 32))
    d = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('DejaVuSans-Bold.ttf', 22); big = ImageFont.truetype('DejaVuSans-Bold.ttf', 30)
    except OSError: font = big = ImageFont.load_default()
    d.text((14, 12), 'b-roll: ' + query, fill=(255, 201, 74), font=big)
    for k, (e, p) in enumerate(ims):
        x, y = 10 + (k % cols) * 490, 60 + (k // cols) * 310
        sheet.paste(Image.open(p).convert('RGB').resize((480, 270)), (x, y))
        d.rectangle([x, y, x + 480, y + 30], fill=(0, 0, 0))
        d.text((x + 8, y + 3), '%s  %.0fs  %s' % (e['id'], e['duration'], e['source']), fill=(255, 255, 255), font=font)
    os.makedirs(os.path.join(LIB, 'previews'), exist_ok=True)
    fp = os.path.join(LIB, 'previews', slug(query) + '.jpg')
    sheet.save(fp, quality=85)
    return os.path.relpath(fp, ROOT)


def upload(paths):
    if not paths: return
    if subprocess.run(['gh', 'release', 'view', TAG, '-R', REPO], capture_output=True).returncode != 0:
        subprocess.run(['gh', 'release', 'create', TAG, '-R', REPO, '--title', 'Library: b-roll footage',
                        '--notes', 'Real footage from Pexels and Pixabay (free licences). Credits in library/broll/index.json.'], check=True)
    for k in range(0, len(paths), 10):
        subprocess.run(['gh', 'release', 'upload', TAG, '-R', REPO, '--clobber', *paths[k:k + 10]], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('queries', nargs='*')
    ap.add_argument('--file'); ap.add_argument('--count', type=int, default=6); ap.add_argument('--no-upload', action='store_true')
    a = ap.parse_args()
    jobs = [(q, a.count) for q in a.queries]
    if a.file and os.path.exists(a.file):
        for line in open(a.file, encoding='utf-8'):
            line = line.split('#', 1)[0].strip()
            if not line: continue
            q, _, n = line.partition('|')
            jobs.append((q.strip(), int(n) if n.strip().isdigit() else a.count))
    if not jobs: sys.exit('no queries')
    if not (os.environ.get('PEXELS_API_KEY') or os.environ.get('PIXABAY_API_KEY')):
        sys.exit('ERROR: set PEXELS_API_KEY and/or PIXABAY_API_KEY (repo secrets) first')
    os.makedirs(WORK, exist_ok=True); os.makedirs(LIB, exist_ok=True)
    index = json.load(open(INDEX)) if os.path.exists(INDEX) else []
    have = {e['id'] for e in index}
    done_q = {e['query'] for e in index}
    new_files, today = [], datetime.date.today().isoformat()
    for query, n in jobs:
        n = max(1, min(n, 12))  # never mass-download
        have_for_q = sum(1 for e in index if e['query'] == query)
        if query in done_q and have_for_q >= n:
            print('skip (already in library):', query); continue
        cands = []
        for fn in (pexels, pixabay):
            try: cands += fn(query, n)
            except Exception as e: print('WARNING', fn.__name__, query, e)
        # alternate sources so one query gets variety, prefer clips long enough to cover a segment
        cands = [c for c in cands if '%s-%s' % (c['source'], c['source_id']) not in have and (not c['duration'] or c['duration'] >= MIN_LEN)]
        px = [c for c in cands if c['source'] == 'pexels']; pb = [c for c in cands if c['source'] == 'pixabay']
        mixed = [c for pair in zip(px, pb) for c in pair] + px[len(pb):] + pb[len(px):]
        added = []
        for c in mixed[:max(0, n - have_for_q)]:
            try:
                cid, out, poster, dur = process(c, WORK)
            except Exception as e:
                print('WARNING failed', c['source'], c['source_id'], e); continue
            e = {'id': cid, 'query': query, 'source': c['source'], 'source_id': c['source_id'], 'duration': dur, 'width': 1920, 'height': 1080,
                 'file': cid + '.mp4', 'url': 'https://github.com/%s/releases/download/%s/%s.mp4' % (REPO, TAG, cid), 'poster': cid + '.jpg',
                 'page_url': c['page_url'], 'author': c['author'], 'author_url': c['author_url'], 'tags': c['tags'], 'license': c['license'], 'added': today}
            index.append(e); have.add(cid); added.append(e); new_files += [out, poster]
            print('added', cid, '%.1fs' % dur, 'by', c['author'], '<-', query)
            time.sleep(0.5)
        if added:
            sheet = contact_sheet([x for x in index if x['query'] == query], query, WORK)
            if sheet: print('preview', sheet)
        else:
            print('nothing new for', query)
    if new_files and not a.no_upload:
        upload(new_files)
    index.sort(key=lambda e: (e['query'], e['id']))
    json.dump(index, open(INDEX, 'w'), indent=1, ensure_ascii=False)
    print('library now has %d clips in %d queries' % (len(index), len({e["query"] for e in index})))


if __name__ == '__main__':
    main()
