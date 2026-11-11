"""Cut a vertical YouTube Short (<= 58 s, 1080x1920) from a finished episode.

Usage: python pipeline/short.py out/<id>.mp4 build/short_frame.png out/<id>-short.mp4

Picks the hook (segment 0) plus the strongest segments (rank #1, map/cities scenes with many
markers, big numbers), keeps them in story order, and composites them as: blurred full-bleed
background + the episode video in the middle band + the ShortFrame overlay (title + call to action).
script.json can force the choice with "short": {"segments": ["id", ...]}.
"""
import json, subprocess, sys

src, frame, dst = sys.argv[1:4]
ep = json.load(open('src/data/episode.json'))
segs = ep['segments']
MAX = 57.0

def window(i):
    s = segs[i]
    a = 0.0 if i == 0 else max(0.0, s['start'] - 0.2)
    b = segs[i + 1]['start'] - 0.15 if i + 1 < len(segs) else s['end'] + 0.6
    return a, b

def score(i):
    sc = segs[i]['scene']; n = len(sc.get('markers', [])) + len(sc.get('cities', []))
    v = 0.0
    if sc.get('rank') == 1: v += 5
    if sc['type'] in ('map', 'cities') and n >= 3: v += 2 + n * 0.2
    if sc['type'] in ('bignum', 'bars', 'stats'): v += 1.5
    if sc.get('rank'): v += 1
    return v

forced = (ep.get('short') or {}).get('segments')
ids = [s['id'] for s in segs]
if forced:
    chosen = [0] + [ids.index(x) for x in forced if x in ids and ids.index(x) != 0]
else:
    chosen = [0]
    total = window(0)[1] - window(0)[0]
    for i in sorted(range(1, len(segs) - 1), key=score, reverse=True):
        d = window(i)[1] - window(i)[0]
        if total + d <= MAX:
            chosen.append(i); total += d
chosen = sorted(set(chosen))
wins = [window(i) for i in chosen]
total = sum(b - a for a, b in wins)
while total > MAX and len(wins) > 1:  # forced lists can be too long
    a, b = wins.pop(); total -= b - a

# one input per window (fast seek) so ffmpeg never buffers the whole episode in memory
inputs, parts, labels = [], [], ''
for k, (a, b) in enumerate(wins):
    f = 0.12
    inputs += ['-ss', '%.3f' % a, '-t', '%.3f' % (b - a), '-i', src]
    parts.append(f"[{k}:v]setpts=PTS-STARTPTS,fps=30[v{k}]")
    parts.append(f"[{k}:a]asetpts=PTS-STARTPTS,afade=t=in:d={f},afade=t=out:st={b - a - f:.3f}:d={f}[a{k}]")
    labels += f"[v{k}][a{k}]"
n = len(wins)
parts.append(f"{labels}concat=n={n}:v=1:a=1[vc][ac]")
parts.append("[vc]split[sa][sb]")
parts.append("[sa]scale=-2:1920,crop=1080:1920,boxblur=28:4,eq=brightness=-0.18:saturation=1.2[bg]")
parts.append("[sb]scale=1700:-2,crop=1080:ih[fg]")
parts.append("[bg][fg]overlay=0:470[m]")
parts.append(f"[m][{n}:v]overlay=0:0,format=yuv420p[out]")
cmd = ['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-loop', '1', '-framerate', '30', '-t', '%.3f' % total, '-i', frame,
       '-filter_complex', ';'.join(parts), '-map', '[out]', '-map', '[ac]', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
       '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst]
subprocess.run(cmd, check=True)
print('short', dst, 'segments', [segs[i]['id'] for i in chosen][:len(wins)], 'duration %.1f' % total)
