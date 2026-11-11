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
# icons used by the script ("fluent-emoji-flat:fire", "lucide:plane", "circle-flags:jp") -> src/data/icons.json
import re
SETS = {'fluent-emoji-flat', 'circle-flags', 'lucide'}
refs = set(re.findall(r'"((?:%s):[a-z0-9-]+)"' % '|'.join(SETS), json.dumps(ep)))
refs.add('circle-flags:' + iso)
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
