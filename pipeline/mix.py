"""Music bed + scene SFX + narration -> build/mix.wav (48 kHz stereo, about -14 LUFS after ffmpeg loudnorm).

Usage: python pipeline/mix.py episodes/<id>
"""
import sys, os, re, json, unicodedata
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly
sys.path.insert(0, os.path.dirname(__file__))
import synth as A

SR = A.SR
EP = sys.argv[1].rstrip('/')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = json.load(open(os.path.join(ROOT, 'src', 'data', 'episode.json')))
D = ep['duration']; n = int(D * SR)


def norm(s): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode())


def spoken_at(seg, name):
    first = norm(re.split(r'[\s·]+', name)[0])
    for w in seg['words']:
        if norm(w['w']).startswith(first): return w['t']
    return None


# ---------------- music ----------------
def spanish_guitar(D):
    b = 60 / 84; bar = 4 * b
    g = np.zeros((int((D + 4) * SR), 2)); mel = np.zeros_like(g)
    prog = ['Am', 'G', 'F', 'E', 'Dm', 'Am', 'F', 'E']; pat = [0, 3, 2, 4, 3, 2, 4, 3]
    k, t0 = 0, 0.3
    while t0 < D - 3:
        c = prog[k % len(prog)]; notes = A.CH[c]
        A.place(g, A.pluck(notes[0] - (12 if notes[0] > 47 else 0), 3.2, 0.75, 0.3), t0, pan=-0.1)
        for j, idx in enumerate(pat[1:], 1):
            A.place(g, A.pluck(notes[min(idx, len(notes) - 1)], 2.6, 0.42 + 0.08 * (j % 2 == 0), 0.38), t0 + j * b / 2, pan=0.15 * (1 if j % 2 else -1))
        if k % 2 == 1 and k >= 2:
            ph = {'Am': [76, 72], 'G': [74, 71], 'F': [72, 69], 'E': [71, 68], 'Dm': [74, 69]}[c]
            for j, m in enumerate(ph): A.place(mel, A.pluck(m, 2.2, 0.36, 0.6, 0.9975), t0 + (1 + j * 1.5) * b, pan=-0.25)
        k += 1; t0 += bar
    for j, m in enumerate(A.CH['Am'] + [69, 76]): A.place(g, A.pluck(m, 4.0, 0.5, 0.35), D - 3.2 + j * 0.06, pan=(j / 6 - 0.5) * 0.5)
    g, mel = g[:int(D * SR)], mel[:int(D * SR)]
    return A.reverb(g, A.IR_HALL, 0.42) * 0.6 + A.reverb(mel, A.IR_HALL, 0.55) * 0.5


def ambient(D):
    """Warm cinematic pad + soft piano plucks (default bed for any country)."""
    t = np.arange(int(D * SR)) / SR; out = np.zeros((len(t), 2))
    prog = [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62], [40, 47, 52, 55, 59]]
    bar = 6.0
    for k in range(int(D / bar) + 1):
        a = k * bar; ch = prog[k % 4]
        seg = (t >= a) & (t < a + bar + 1.5); tt = t[seg] - a
        env = np.minimum(1, tt / 1.2) * np.minimum(1, np.maximum(0, (bar + 1.5 - tt) / 1.5))
        for m in ch:
            f = A.mf(m)
            for det, pan in ((0.998, -0.4), (1.002, 0.4)):
                w = np.sin(2 * np.pi * f * det * tt) * 0.6 + np.sin(2 * np.pi * 2 * f * det * tt) * 0.15
                out[seg, 0] += w * env * (1 - max(0, pan)) * 0.06; out[seg, 1] += w * env * (1 + min(0, pan)) * 0.06
        for j, m in enumerate([ch[2] + 12, ch[3] + 12, ch[4] + 12, ch[3] + 12]):
            A.place(out, A.pluck(m, 2.5, 0.25, 0.7, 0.997), a + 0.75 + j * 1.5, pan=0.2 * (-1) ** j)
    return A.reverb(A.lp(out, 5000), A.IR_HALL, 0.6)


MUSIC = {'spanish_guitar': spanish_guitar, 'ambient': ambient}

if __name__ == '__main__':
    import soundfile as sf
    vo, vsr = sf.read(os.path.join(EP, 'build', 'voice.wav'), dtype='float32')
    vo = resample_poly(vo, SR, vsr).astype(np.float32)
    VO = np.zeros((n, 2)); L = min(len(vo), n); VO[:L] = vo[:L, None]
    mus = MUSIC.get(ep.get('music', 'ambient'), ambient)(D)
    t = np.arange(n) / SR
    mus = mus[:n] * (np.clip(t / 1.5, 0, 1) * np.clip((D - t) / 1.5, 0, 1))[:, None]

    ev = []
    segs = ep['segments']
    first_map = next(s for s in segs if s['scene'].get('view'))
    ev += [('whoosh_long', 0.0, 0.5), ('boom', 0.15, 0.5)]
    title = spoken_at(segs[0], ep['country']['name'])
    if title: ev += [('impact', title - 0.1, 0.7), ('sparkle', title, 0.5)]
    ev += [('whoosh_long', first_map['start'] - 1.0, 0.7), ('impact', first_map['start'] - 0.4, 0.55)]
    for s in segs[1:]:
        ev.append(('swish', s['start'] - 0.35, 0.45))
        sc = s['scene']
        names = [m[0] for m in sc.get('markers', [])] + [c[0] for c in sc.get('cities', [])] + [l[0] for l in sc.get('labels', []) if (l[3:] or [''])[0] != 'sea']
        for nm in names:
            at = spoken_at(s, nm)
            if at: ev.append(('pop_hi', at - 0.15, 0.3))
        for k, c in enumerate(sc.get('cards', []) if isinstance(sc.get('cards'), list) else []):
            ev.append(('hit', s['start'] + 0.5 + k * 0.5, 0.3))
        for k in range(len(sc.get('events', []))):
            d = s['end'] - s['start']; ev.append(('tick', s['start'] + 0.5 + k * (d - 1.5) / len(sc['events']), 0.45))
    last = segs[-1]; sub = spoken_at(last, 'subscribe')
    if sub: ev += [('pop_hi', sub - 0.1, 0.5), ('ding', sub + 0.2, 0.5)]
    fx = np.zeros((n, 2))
    for name, at, gain in ev:
        s = A.SFX[name]() * gain; j = int(max(0, at) * SR); L = min(len(s), n - j)
        if L > 0: fx[j:j + L] += s[:L]

    def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
    VO = VO / (np.percentile(np.abs(VO), 99.9) + 1e-9) * 0.8
    mus = mus / rms(mus[int(3 * SR):int((D - 3) * SR)]) * 0.04
    fx = fx / (np.percentile(np.abs(fx), 99.95) + 1e-9) * 0.35
    ve = A.lp(np.abs(VO).mean(1), 4, 2); ve = np.clip(ve / (np.percentile(ve, 90) + 1e-9), 0, 1)
    mix = VO + mus * (1 - 0.45 * ve)[:, None] + fx * (1 - 0.3 * ve)[:, None]
    mix = np.tanh(mix / np.max(np.abs(mix)) * 1.1) / np.tanh(1.1) * 0.95
    wavfile.write(os.path.join(EP, 'build', 'mix_raw.wav'), SR, (mix * 32767).astype(np.int16))
    print('mix ok', len(ev), 'sfx')
