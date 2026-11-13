"""Checks a script.json against the channel's rules before it is pushed (Hossein: every video uses the full toolbox).

Usage: python3 pipeline/check_script.py episodes/<id>/script.json
Prints ✓ / ✗ per rule. Fix every ✗ before pushing (✗ lines say what to change). Exit code 1 if any ✗.
"""
import sys, os, json, re, glob

p = sys.argv[1]
ep = json.load(open(p))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
segs = ep['segments']
sc = [s['scene'] for s in segs]
types = [x.get('type') for x in sc]
PANELS = {'timeline', 'cards', 'bignum', 'bars', 'steps', 'checklist', 'era', 'split', 'journey', 'race', 'morph', 'street'}
hist = (ep.get('theme') or {}).get('map') == 'parchment'
tutorial = any(t in ('steps', 'checklist') for t in types)
ranked = any('rank' in x for x in sc)
words = sum(len(s['text'].split()) for s in segs)
fails = []

def check(ok, good, bad):
    print(('✓ ' + good) if ok else ('✗ ' + bad))
    if not ok: fails.append(bad)

def nplaces(x):
    return len(x.get('markers') or []) + len(x.get('cities') or [])

def flying(x):
    return x.get('type') in ('map', 'cities', 'stats') and not any(x.get(k) for k in ('arcs', 'bubbles', 'columns', 'frames'))

# ---- length ----
if hist:
    check(1300 <= words <= 1900, f'{words} words (history 1,300–1,900)', f'{words} words: history needs 1,300–1,900')
elif len(segs) > 15:
    check(900 <= words <= 1300, f'{words} words (long format 900–1,300)', f'{words} words: long formats need 900–1,300')
else:
    check(550 <= words <= 680, f'{words} words (standard 570–650)', f'{words} words: standard episodes need 570–650')
check(not any(re.search(r'\d', s['text']) for s in segs), 'numbers written as words', 'digits in narration text: write numbers and years as words: ' + ', '.join(s['id'] for s in segs if re.search(r'\d', s['text'])))

# ---- opening, energy ----
check(types[0] in ('globe', 'dive', 'flag', 'hook'), f'opening: {types[0]}', 'segment 0 must be globe, dive, flag or hook')
check(len(segs[0]['text'].split()) <= 24, 'hook is short', f'hook has {len(segs[0]["text"].split())} words: keep it at 12–20')
check(types[-1] == 'outro', 'ends with outro', 'last segment must be {"type":"outro"}')
check(len(sc) > 1 and sc[1].get('type') in ('map', 'stats', 'cities') and nplaces(sc[1]) >= 3, 'segment 1 flies to 3+ places', 'segment 1 must be map/stats/cities with 3+ spoken markers or cities')
good_maps = sum(1 for x in sc if flying(x) and 3 <= nplaces(x) <= 7)
check(good_maps >= 5, f'{good_maps} map/cities scenes with 3–7 places', f'only {good_maps} map/cities scenes with 3–7 markers: need 5+')
check(not any(flying(x) and nplaces(x) < 2 and x.get('type') != 'stats' for x in sc[1:-1]), 'no empty maps', 'a map scene has 0–1 markers: add 3–7 spoken places')
pairs = [f'{segs[i]["id"]}+{segs[i+1]["id"]}' for i in range(len(types) - 1) if types[i] in PANELS and types[i + 1] in PANELS]
check(not pairs, 'no two panels in a row', 'two panel scenes in a row (put a map between): ' + ', '.join(pairs))
check(types.count('bignum') <= 1, 'at most one bignum', 'more than one bignum')

# ---- toolbox: icons, stickers, 3D ----
allj = json.dumps(sc)
custom = sum(len(x.get('pops') or []) for x in sc)
_3D = set(json.load(open(os.path.join(ROOT, 'library', 'fluent-3d', 'index.json'))))
rich = len(re.findall(r'"(?:fluent-3d|lib):[a-z0-9-]+"', allj)) + sum(1 for n in re.findall(r'"fluent-emoji-flat:([a-z0-9-]+)"', allj) if n in _3D)  # flat ones with a 3D twin are upgraded by prepare.py
stickers = len(re.findall(r'"lib:[a-z]+-\d+"', allj))
check(custom >= 4, f'{custom} hand-picked pops', f'only {custom} scene.pops: add 4+ on the key moments (3D or lib: stickers)')
check(rich >= 6, f'{rich} 3D icons / stickers', f'only {rich} fluent-3d:/lib: icons: use 6+ (pops, cards, era icons, markers)')
if hist or any(k in ep['id'] for k in ('travel', 'visa', 'guide', 'move', 'passport', 'residency')):
    check(stickers >= 3, f'{stickers} stickers from Hossein\'s library', f'only {stickers} lib: stickers: history/travel episodes use 3+ (open library/stickers/previews/)')
cards_ok = all(isinstance(c[0], str) and ':' in c[0] for x in sc if x.get('type') == 'cards' for c in x.get('cards', []))
check(cards_ok, 'cards use library icons', 'cards need library icons (fluent-3d:/lib:/fluent-emoji-flat:)')
other = sum(1 for x in sc if x.get('countries') or x.get('arcs') or x.get('bubbles') or x.get('columns') or x.get('routes') or x.get('areas'))
check(other >= 1, 'uses data graphics (countries/arcs/bubbles/columns/routes/areas)', 'no data graphic at all: add arcs, bubbles, columns, routes or highlighted countries on at least one map')

# ---- format-specific ----
if ranked and re.search(r'countr|passport|rank|best|richest|safest|happiest|cheapest', ep['id']):
    check('morph' in types or 'race' in types, 'ranking uses morph/race', 'countdown/ranking: add a `morph` scene (country silhouettes morphing #5→#1) or a `race`')
elif ranked and 'morph' not in types:
    print('· tip: a `morph` scene (silhouettes morphing #5→#1) makes countdowns pop')
if hist:
    check(types.count('era') >= 3, f'{types.count("era")} era cards', 'history: open each act with an `era` card (3+)')
    check(any(x.get('routes') for x in sc), 'history has routes', 'history: add `routes` (conquest/trade roads) on a map')
    check(any(x.get('frames') for x in sc), 'history has a map timelapse', 'history: add a `frames` map timelapse')
    check('street' in types or 'crowd' in types, 'history has street/crowd scene', 'history: add a `street` or `crowd` scene')
    check(ep.get('flagOnMap') is False, 'flagOnMap false', 'history: set "flagOnMap": false')
if tutorial:
    urls = [x.get('url', '') for x in sc if x.get('type') == 'steps']
    off = re.compile(r'(\.gob\.|\.gov|\.gouv\.|europa\.eu|\.go\.|canada\.ca|\.gc\.ca|\.admin\.ch|\.bund\.de|auswaertiges-amt\.de|make-it-in-germany\.com|\.mne\.gov\.pt|policia\.es)')
    check(all(off.search(u) for u in urls if u), 'tutorial urls are official', 'tutorial: steps url must be an official government domain')
    check('check the official' in segs[-1]['text'].lower() or 'official site' in segs[-1]['text'].lower(), 'outro says rules can change', 'tutorial outro must say "rules can change, always check the official site"')

# ---- packaging + variety vs the last 3 episodes ----
th = ep.get('thumb') or {}
_bi = os.path.join(ROOT, 'library', 'broll', 'index.json')
_have = {e['id'] for e in json.load(open(_bi))} if os.path.exists(_bi) else set()
for x in sc:
    if x.get('type') == 'footage':
        ids = x.get('clips') or ([x['clip']] if x.get('clip') else [])
        miss = [c for c in ids if c not in _have]
        check(bool(ids) and not miss and len(ids) <= 3, f'footage clips in the library ({", ".join(ids)})', f'footage scene needs 1–3 clip ids from library/broll/index.json (missing: {miss or "none given"})')

check(bool(th.get('style') and th.get('big')), 'thumb has style + big', 'add a thumb {style, top, big, sub, badge}')
check(len((th.get('big') or '').split()) <= 2 and len((th.get('sub') or '').split()) <= 3, 'thumb text short', 'thumb: big ≤ 2 words, sub ≤ 3 words')
mine = os.path.abspath(os.path.dirname(p))
others = sorted((d for d in glob.glob(os.path.join(ROOT, 'episodes', '*', 'script.json')) if os.path.abspath(os.path.dirname(d)) != mine), key=os.path.getmtime, reverse=True)[:3]
prev = [json.load(open(d)) for d in others]
if prev:
    check(th.get('style') not in [(q.get('thumb') or {}).get('style') for q in prev], 'thumb style new vs last 3', f'thumb style "{th.get("style")}" was used in the last 3 episodes')
    check(types[0] != prev[0]['segments'][0]['scene'].get('type'), 'opening differs from previous episode', f'opening "{types[0]}" same as the previous episode')
    check((ep.get('theme') or {}) != (prev[0].get('theme') or {}), 'look differs from previous episode', 'theme (map + accent) same as the previous episode')

print('\nALL GOOD' if not fails else f'\n{len(fails)} to fix')
sys.exit(1 if fails else 0)
