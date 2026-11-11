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
         'centralafricanrepublic': 'Central African Rep.', 'northkorea': 'North Korea', 'korea': 'South Korea', 'burma': 'Myanmar', 'eswatini': 'eSwatini'}
FIX_CODE = {'unitedstatesofamerica': 'us', 'unitedkingdom': 'gb', 'russia': 'ru', 'southkorea': 'kr', 'northkorea': 'kp', 'czechia': 'cz', 'demrepcongo': 'cd', 'congo': 'cg',
            'bosniaandherz': 'ba', 'ssudan': 'ss', 'dominicanrep': 'do', 'centralafricanrep': 'cf', 'cotedivoire': 'ci', 'eswatini': 'sz', 'turkey': 'tr', 'iran': 'ir', 'syria': 'sy',
            'vietnam': 'vn', 'laos': 'la', 'bolivia': 'bo', 'venezuela': 've', 'tanzania': 'tz', 'moldova': 'md', 'macedonia': 'mk', 'northmacedonia': 'mk', 'taiwan': 'tw', 'palestine': 'ps',
            'eqguinea': 'gq', 'solomonis': 'sb', 'wsahara': 'eh', 'falklandis': 'fk', 'fraso': 'tf', 'brunei': 'bn', 'capeverde': 'cv', 'cabo verde': 'cv', 'timorleste': 'tl', 'micronesia': 'fm'}
_byname = {}
for g in _wa:
    n = _norm(g['properties']['name']); cid = str(g.get('id', '')).zfill(3)
    if not g.get('id'): continue
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
json.dump(data, open(os.path.join(ROOT, 'src', 'data', 'episode.json'), 'w'), ensure_ascii=False)

# icons used by the script ("fluent-emoji-flat:fire", "lucide:plane", "circle-flags:jp") -> src/data/icons.json
import re
SETS = {'fluent-emoji-flat', 'circle-flags', 'lucide'}
refs = set(re.findall(r'"((?:%s):[a-z0-9-]+)"' % '|'.join(SETS), json.dumps(ep)))
refs.add('circle-flags:' + iso)
refs.update('circle-flags:' + k for k in json.load(open(os.path.join(ROOT, 'node_modules', '@iconify-json', 'circle-flags', 'icons.json')))['icons'])
refs.update(['fluent-emoji-flat:crossed-swords', 'fluent-emoji-flat:crown', 'fluent-emoji-flat:sailboat', 'fluent-emoji-flat:horse', 'fluent-emoji-flat:classical-building', 'fluent-emoji-flat:scroll'])
packs, icons = {}, {}
for ref in sorted(refs):
    pre, name = ref.split(':')
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
