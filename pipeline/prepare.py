"""Merge script.json + build/timing.json into src/data/episode.json and rasterise the flag.

Usage: python pipeline/prepare.py episodes/<id>
"""
import sys, os, json, shutil, subprocess

EP = sys.argv[1].rstrip('/')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = json.load(open(os.path.join(EP, 'script.json')))
tm = json.load(open(os.path.join(EP, 'build', 'timing.json')))
by_id = {s['id']: s for s in tm['segments']}
segs = []
for s in ep['segments']:
    t = by_id[s['id']]
    segs.append({'id': s['id'], 'text': s['text'], 'scene': s['scene'], 'start': t['start'], 'end': t['end'], 'words': t['words']})
OUTRO_TAIL = 3.0
data = {k: v for k, v in ep.items() if k != 'segments'}
data.update(segments=segs, voiceDuration=tm['duration'], duration=round(tm['duration'] + OUTRO_TAIL, 2))
os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)
json.dump(data, open(os.path.join(ROOT, 'src', 'data', 'episode.json'), 'w'), ensure_ascii=False)

iso = ep['country']['iso2']
svg = os.path.join(ROOT, 'node_modules', 'flag-icons', 'flags', '4x3', iso + '.svg')
shutil.copy(svg, os.path.join(ROOT, 'public', 'flag.svg'))
subprocess.run(['rsvg-convert', '-w', '1600', '-h', '1200', svg, '-o', os.path.join(ROOT, 'public', 'flag.png')], check=True)
# other countries named on map scenes (labels, markers or scene.countries) are filled with their own flag when spoken
import re as _re
_norm = lambda x: _re.sub(r'[^a-z]', '', x.lower())
_wa = json.load(open(os.path.join(ROOT, 'node_modules', 'world-atlas', 'countries-50m.json')))['objects']['countries']['geometries']
_fi = json.load(open(os.path.join(ROOT, 'node_modules', 'flag-icons', 'country.json')))
_code = {_norm(c['name']): c['code'] for c in _fi}
ALIAS = {'unitedstates': 'United States of America', 'usa': 'United States of America', 'us': 'United States of America', 'america': 'United States of America',
         'uk': 'United Kingdom', 'britain': 'United Kingdom', 'greatbritain': 'United Kingdom', 'england': 'United Kingdom', 'czechia': 'Czechia', 'czechrepublic': 'Czechia',
         'uae': 'United Arab Emirates', 'emirates': 'United Arab Emirates', 'holland': 'Netherlands', 'turkiye': 'Turkey', 'ivorycoast': "Côte d'Ivoire",
         'congo': 'Dem. Rep. Congo', 'drc': 'Dem. Rep. Congo', 'bosnia': 'Bosnia and Herz.', 'southsudan': 'S. Sudan', 'dominicanrepublic': 'Dominican Rep.',
         'centralafricanrepublic': 'Central African Rep.', 'northkorea': 'North Korea', 'korea': 'South Korea', 'burma': 'Myanmar', 'eswatini': 'eSwatini', 'vaticancity': 'Vatican', 'holysee': 'Vatican'}
FIX_CODE = {'unitedstatesofamerica': 'us', 'unitedkingdom': 'gb', 'russia': 'ru', 'southkorea': 'kr', 'northkorea': 'kp', 'czechia': 'cz', 'demrepcongo': 'cd', 'congo': 'cg',
            'bosniaandherz': 'ba', 'ssudan': 'ss', 'dominicanrep': 'do', 'centralafricanrep': 'cf', 'cotedivoire': 'ci', 'eswatini': 'sz', 'turkey': 'tr', 'iran': 'ir', 'syria': 'sy',
            'vietnam': 'vn', 'laos': 'la', 'bolivia': 'bo', 'venezuela': 've', 'tanzania': 'tz', 'moldova': 'md', 'macedonia': 'mk', 'northmacedonia': 'mk', 'taiwan': 'tw', 'palestine': 'ps',
            'eqguinea': 'gq', 'solomonis': 'sb', 'wsahara': 'eh', 'falklandis': 'fk', 'fraso': 'tf', 'brunei': 'bn', 'capeverde': 'cv', 'cabo verde': 'cv', 'timorleste': 'tl', 'micronesia': 'fm', 'kosovo': 'xk', 'vatican': 'va'}
_byname = {}
for g in _wa:
    n = _norm(g['properties']['name']); cid = str(g.get('id', '')).zfill(3)
    if not g.get('id') and n == 'kosovo': cid = 'XKX'  # no ISO numeric code in world-atlas (MapLayer uses the same id)
    elif not g.get('id'): continue
    code = FIX_CODE.get(n) or _code.get(n)
    if code: _byname[n] = (cid, code, g['properties']['name'])
os.makedirs(os.path.join(ROOT, 'public', 'flags'), exist_ok=True)
for sg in data['segments']:
    sc = sg['scene']
    if sc.get('type') not in ('map', 'stats', 'cities'): continue
    names = [l[0] for l in sc.get('labels', []) if len(l) < 4 or l[3] != 'sea'] + [m[0] for m in sc.get('markers', [])] + list(sc.get('countries', []))
    found, seen = [], set()
    for nm in names:
        key = _norm(nm.split('·')[0]); key = _norm(ALIAS.get(key, key)) if key in ALIAS else key
        hit = _byname.get(key)
        if not hit or hit[0] == ep['country']['isoNum'] or hit[0] in seen: continue
        seen.add(hit[0]); found.append({'name': nm, 'id': hit[0], 'iso2': hit[1]})
        src = os.path.join(ROOT, 'node_modules', 'flag-icons', 'flags', '4x3', hit[1] + '.svg')
        if os.path.exists(src): shutil.copy(src, os.path.join(ROOT, 'public', 'flags', hit[1] + '.svg'))
    if found: sc['_countries'] = found

# ---- footage scenes: real b-roll from the digital library (library/broll/index.json, clips on the "library-broll" release) ----
_bidx = os.path.join(ROOT, 'library', 'broll', 'index.json')
_broll = {e['id']: e for e in json.load(open(_bidx))} if os.path.exists(_bidx) else {}
credits = []
for sg in data['segments']:
    sc = sg['scene']
    if sc.get('type') != 'footage': continue
    ids = sc.get('clips') or ([sc['clip']] if sc.get('clip') else [])
    out = []
    for cid in ids:
        e = _broll.get(cid)
        if not e: print('WARNING: footage clip not in library/broll/index.json:', cid); continue
        dst = os.path.join(ROOT, 'public', 'broll', e['file']); os.makedirs(os.path.dirname(dst), exist_ok=True)
        local = os.path.join(ROOT, 'build', 'broll', e['file'])
        if not os.path.exists(dst):
            if os.path.exists(local): shutil.copy(local, dst)
            else:
                import urllib.request
                urllib.request.urlretrieve(e['url'], dst)
        src = {'pexels': 'Pexels', 'pixabay': 'Pixabay'}.get(e['source'], e['source'])
        out.append({'src': 'broll/' + e['file'], 'credit': '%s / %s' % (e['author'], src) if e.get('author') else src, 'dur': e['duration']})
        credits.append('%s by %s on %s: %s' % (cid, e.get('author') or 'unknown', src, e.get('page_url', '')))
    if not out: raise SystemExit('footage scene %s has no usable clips' % sg['id'])
    sc['_clips'] = out
if credits:
    data['footageCredits'] = credits
    print('footage credits:', *credits, sep='\n  ')

# ---- automatic icon pops: every map/cities/stats segment gets 2-3 icons on spoken keywords (3D emoji first) ----
AUTO = [  # (spoken word prefixes, icon)
    (['plane', 'flight', 'fly', 'flew', 'airport', 'airline'], 'airplane'), (['train', 'rail', 'shinkansen'], 'high-speed-train'),
    (['ship', 'boat', 'port', 'sail', 'navy', 'fleet'], 'ship'), (['sea', 'ocean', 'coast', 'gulf', 'bay'], 'water-wave'),
    (['money', 'billion', 'trillion', 'dollar', 'euro', 'economy', 'gdp', 'rich', 'wealth', 'trade', 'spend', 'spent'], 'money-bag'),
    (['tourist', 'visitor', 'travel', 'trip', 'holiday'], 'luggage'), (['mountain', 'peak', 'alps', 'himalaya'], 'snow-capped-mountain'),
    (['beach'], 'beach-with-umbrella'), (['island'], 'desert-island'), (['king', 'queen', 'emperor', 'empire', 'crown', 'dynasty', 'royal'], 'crown'),
    (['war', 'battle', 'army', 'armies', 'conquer', 'conquest', 'invade', 'soldier'], 'crossed-swords'), (['castle', 'fortress', 'fort'], 'castle'),
    (['temple', 'ancient', 'ruins', 'monument'], 'classical-building'), (['food', 'cuisine', 'dish', 'eat', 'meal'], 'fork-and-knife-with-plate'),
    (['coffee', 'tea'], 'hot-beverage'), (['wine'], 'wine-glass'), (['record', 'number one', 'best', 'champion', 'winner', 'first'], 'trophy'),
    (['grow', 'grew', 'rising', 'rise', 'boom', 'increase', 'doubled'], 'chart-increasing'), (['people', 'population', 'citizens', 'residents'], 'busts-in-silhouette'),
    (['city', 'cities', 'capital', 'skyline', 'metropolis'], 'cityscape'), (['history', 'histories', 'century', 'centuries'], 'scroll'),
    (['desert', 'sahara', 'dune'], 'camel'), (['forest', 'jungle', 'rainforest'], 'evergreen-tree'), (['river', 'lake', 'water'], 'droplet'),
    (['volcano', 'volcanic', 'eruption'], 'volcano'), (['snow', 'winter', 'ice', 'cold', 'arctic'], 'snowflake'), (['sun', 'sunny', 'summer', 'hot', 'heat'], 'sun'),
    (['rain', 'monsoon', 'storm'], 'cloud-with-rain'), (['football', 'soccer', 'world cup'], 'soccer-ball'), (['music', 'song', 'dance'], 'musical-notes'),
    (['technology', 'tech', 'robot', 'digital', 'internet'], 'robot'), (['space', 'rocket', 'satellite'], 'rocket'), (['oil', 'gas', 'fuel'], 'oil-drum'),
    (['gold', 'silver', 'coin'], 'coin'), (['farm', 'rice', 'wheat', 'harvest', 'crop'], 'sheaf-of-rice'), (['fish', 'fishing'], 'fish'),
    (['festival', 'celebrat', 'party', 'carnival'], 'party-popper'), (['love', 'heart', 'favourite', 'favorite'], 'red-heart'),
    (['why', 'secret', 'mystery', 'question'], 'thinking-face'), (['shock', 'incredible', 'unbelievable', 'insane', 'huge', 'massive'], 'exploding-head'),
    (['world', 'global', 'planet', 'earth'], 'globe-showing-europe-africa'), (['map', 'border', 'borders'], 'world-map'),
    (['language', 'book', 'writing', 'literature', 'poet', 'university', 'school'], 'books'), (['passport', 'visa', 'residency', 'permit'], 'passport-control'),
    (['car', 'cars', 'road', 'highway'], 'automobile'), (['factory', 'industry', 'industrial'], 'factory'), (['bank', 'tax', 'taxes'], 'bank'),
    (['wildlife', 'animal', 'animals', 'safari'], 'lion'), (['elephant'], 'elephant'), (['tiger'], 'tiger'), (['horse', 'cavalry'], 'horse'),
    (['penguin'], 'penguin'), (['whale'], 'spouting-whale'), (['eagle'], 'eagle'), (['dragon'], 'dragon'), (['flower', 'blossom', 'bloom'], 'cherry-blossom'),
    (['stadium', 'olympic', 'olympics'], 'stadium'), (['hospital', 'health', 'doctor'], 'hospital'), (['time', 'hours', 'minutes', 'clock'], 'alarm-clock'),
    (['diamond', 'gem', 'jewel'], 'gem-stone'), (['idea', 'invent', 'invented', 'invention', 'science'], 'light-bulb'), (['film', 'movie', 'cinema'], 'film-projector'),
    (['shop', 'shopping', 'market', 'bazaar'], 'shopping-bags'), (['pizza'], 'pizza'), (['sushi'], 'sushi'), (['pasta', 'spaghetti'], 'spaghetti'),
    (['bread', 'bakery'], 'bread'), (['cheese'], 'cheese-wedge'), (['beer'], 'beer-mug'), (['chocolate'], 'chocolate-bar'), (['olive'], 'olive'),
    (['night', 'stars'], 'night-with-stars'), (['sunrise', 'dawn'], 'sunrise'), (['camp', 'camping', 'hike', 'hiking', 'trek'], 'camping'),
    (['medal', 'gold medal'], '1st-place-medal'), (['flag'], 'triangular-flag'), (['bridge'], 'bridge-at-night'), (['tower', 'skyscraper'], 'tokyo-tower'),
]
_3D = set(json.load(open(os.path.join(ROOT, 'library', 'fluent-3d', 'index.json'))))
POP_TYPES = {'map', 'cities', 'stats'}
# ---- upgrade every flat emoji to its glossy 3D version where one exists (cards, pops, era/split/journey icons, thumb),
# but keep small map markers and route heads flat so they stay crisp ----
def _up3d(o, key=None):
    if key in ('markers', 'routes'): return o
    if isinstance(o, str) and o.startswith('fluent-emoji-flat:') and o.split(':', 1)[1] in _3D: return 'fluent-3d:' + o.split(':', 1)[1]
    if isinstance(o, list): return [_up3d(x) for x in o]
    if isinstance(o, dict): return {k: _up3d(v, k) for k, v in o.items()}
    return o
for sg in segs: sg['scene'] = _up3d(sg['scene'])
if isinstance(data.get('thumb'), dict): data['thumb'] = _up3d(data['thumb'])
_wn = lambda w: _re.sub(r'[^a-z]', '', w.lower())
for k, sg in enumerate(segs):
    sc = sg['scene']
    if k == 0 or sc.get('type') not in POP_TYPES or sc.get('arcs') or sc.get('bubbles') or sc.get('columns') or sc.get('frames'): continue
    pops = list(sc.get('pops') or [])
    want = 3 if (sg['end'] - sg['start']) > 14 else 2
    if len(pops) >= want: continue
    used_icons = {p[1] for p in pops}
    times = [w['t'] for w in sg['words'] if any(_wn(w['w']).startswith(_wn(p[0])) for p in pops)]
    cand = []
    words = sg['words']
    for wi, w in enumerate(words):
        nw = _wn(w['w'])
        if len(nw) < 3 or w['t'] < sg['start'] + 0.5: continue
        two = nw + _wn(words[wi + 1]['w']) if wi + 1 < len(words) else nw
        for keys, icon in AUTO:
            if any((nw.startswith(_wn(kk)) if ' ' not in kk else two.startswith(_wn(kk))) for kk in keys):
                cand.append((w['t'], w['w'], icon)); break
    for t0, word, icon in cand:
        if len(pops) >= want: break
        if icon in used_icons or any(abs(t0 - tt) < 2.2 for tt in times): continue
        # the cue must be the first time this word is spoken in the segment (the engine cues on the first match)
        if any(_wn(w['w']).startswith(_wn(word)) and w['t'] < t0 - 0.01 for w in words): continue
        name = ('fluent-3d:' + icon) if icon in _3D else ('fluent-emoji-flat:' + icon)
        pops.append([_re.sub(r'[^\w\'-]', '', word), name]); used_icons.add(icon); times.append(t0)
    if pops: sc['pops'] = pops
json.dump(data, open(os.path.join(ROOT, 'src', 'data', 'episode.json'), 'w'), ensure_ascii=False)

# icons used by the script ("fluent-emoji-flat:fire", "lucide:plane", "circle-flags:jp") -> src/data/icons.json
import re
SETS = {'fluent-emoji-flat', 'circle-flags', 'lucide', 'fluent-3d', 'lib'}
PNG_SETS = {'fluent-3d': 'library/fluent-3d', 'lib': 'library/stickers'}  # PNG icons: Microsoft Fluent 3D emoji (MIT) and Hossein's own stickers
refs = set(re.findall(r'"((?:%s):[a-z0-9-]+)"' % '|'.join(SETS), json.dumps([ep, data])))
refs.add('circle-flags:' + iso)
refs.update('circle-flags:' + k for k in json.load(open(os.path.join(ROOT, 'node_modules', '@iconify-json', 'circle-flags', 'icons.json')))['icons'])
refs.update(['fluent-emoji-flat:crossed-swords', 'fluent-emoji-flat:crown', 'fluent-emoji-flat:sailboat', 'fluent-emoji-flat:horse', 'fluent-emoji-flat:classical-building', 'fluent-emoji-flat:scroll'])
packs, icons = {}, {}
for ref in sorted(refs):
    pre, name = ref.split(':')
    if pre in PNG_SETS:  # embed the PNG in an SVG so Icon/SvgIcon draw it like any other icon
        fp = os.path.join(ROOT, PNG_SETS[pre], name + '.png')
        if not os.path.exists(fp): print('WARNING: icon not found', ref); continue
        import base64
        b = base64.b64encode(open(fp, 'rb').read()).decode()
        icons[ref] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%%" height="100%%"><image href="data:image/png;base64,%s" width="256" height="256" preserveAspectRatio="xMidYMid meet"/></svg>' % b
        continue
    if pre not in packs:
        packs[pre] = json.load(open(os.path.join(ROOT, 'node_modules', '@iconify-json', pre, 'icons.json')))
    pk = packs[pre]; nm = name
    while nm not in pk['icons'] and nm in pk.get('aliases', {}):
        nm = pk['aliases'][nm]['parent']
    ic = pk['icons'].get(nm)
    if not ic:
        print('WARNING: icon not found', ref); continue
    w, h = ic.get('width', pk.get('width', 16)), ic.get('height', pk.get('height', 16))
    uid = re.sub(r'[^a-z0-9]', '', ref)
    body = re.sub(r'id="([^"]+)"', lambda m: 'id="%s-%s"' % (uid, m.group(1)), ic['body'])
    body = re.sub(r'url\(#([^)]+)\)', lambda m: 'url(#%s-%s)' % (uid, m.group(1)), body)
    body = re.sub(r'href="#([^"]+)"', lambda m: 'href="#%s-%s"' % (uid, m.group(1)), body)
    icons[ref] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" width="100%%" height="100%%">%s</svg>' % (w, h, body)
json.dump(icons, open(os.path.join(ROOT, 'src', 'data', 'icons.json'), 'w'))
print('prepared', ep['id'], 'duration', data['duration'], 'icons', len(icons))
