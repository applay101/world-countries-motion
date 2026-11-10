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
print('prepared', ep['id'], 'duration', data['duration'])
