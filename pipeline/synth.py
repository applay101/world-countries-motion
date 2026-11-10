# Synth engine: nylon guitar (Karplus-Strong), percussion, reverb and cinematic SFX. Imported by pipeline/mix.py.
import sys, json, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
SR = 48000
rng = np.random.default_rng(11)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)
def mf(m): return 440 * 2 ** ((m - 69) / 12)
def T(d): return np.arange(int(d * SR)) / SR

# ---------------- reverb ----------------
def make_ir(dur=2.2, decay=3.2, bright=6000):
    n = int(dur * SR); t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1) * np.exp(-decay * t)[:, None]
    ir = lp(ir, bright); ir[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0))
IR_HALL = make_ir(2.4, 2.6, 7000); IR_ROOM = make_ir(0.9, 6.5, 5000)
def reverb(st, ir, wet):
    out = np.stack([fftconvolve(st[:, c], ir[:, c])[:len(st)] for c in range(2)], 1)
    return st * (1 - wet * 0.3) + out * wet

# ---------------- nylon guitar (Karplus-Strong, block-vectorised) ----------------
def pluck(m, dur=2.2, vel=1.0, bright=0.5, decay=0.9965):
    f = mf(m); N = int(SR / f); n = int(dur * SR)
    exc = rng.uniform(-1, 1, N)
    exc = lp(exc, 1500 + 5500 * bright, 1)
    pos = int(N * 0.18); exc = exc - np.roll(exc, pos) * 0.6  # pluck position comb
    out = np.empty(n + N); out[:N] = exc; prev = exc.copy(); i = N
    g = decay ** (110 / f) if f > 110 else decay
    while i < n:
        blk = g * 0.5 * (prev + np.concatenate([[prev[-1]], prev[:-1]]))
        L = min(N, n + N - i); out[i:i + L] = blk[:L]; prev = blk; i += N
    y = out[:n] * vel
    body = bp(y, 90, 260) * 0.6 + bp(y, 380, 1200) * 0.25
    y = y + body
    y *= np.minimum(1, np.arange(n) / (0.002 * SR))
    return y

CH = {'Am': [45, 52, 57, 60, 64], 'G': [43, 47, 50, 55, 59, 67], 'F': [41, 48, 53, 57, 60, 65], 'E': [40, 47, 52, 56, 59, 64],
      'Dm': [50, 57, 62, 65], 'C': [48, 52, 55, 60, 64]}
PROG = ['Am', 'G', 'F', 'E']

def place(buf, x, at, pan=0.0):
    i = int(at * SR)
    if i >= len(buf) or i < 0: return
    L = min(len(x), len(buf) - i)
    buf[i:i + L, 0] += x[:L] * (1 - max(0, pan)); buf[i:i + L, 1] += x[:L] * (1 + min(0, pan))

def strum(buf, chord, at, down=True, vel=1.0, spread=0.012, dur=1.6, bright=0.55, mute=False):
    notes = CH[chord] if down else CH[chord][::-1]
    for k, m in enumerate(notes):
        y = pluck(m, dur * (0.35 if mute else 1), vel * (0.8 + 0.2 * rng.random()), bright)
        if mute: y *= np.exp(-np.arange(len(y)) / SR * 18)
        place(buf, y, at + k * spread * (0.8 + 0.4 * rng.random()), pan=(k / len(notes) - 0.5) * 0.4)

def rasgueado(buf, chord, at, vel=1.0):
    for j in range(4):  # four-finger roll
        strum(buf, chord, at + j * 0.035, True, vel * (0.55 + 0.15 * j), spread=0.004, dur=1.2, bright=0.75)

# ---------------- percussion ----------------
def palmas(vel=1.0):
    t = T(0.18); x = np.zeros(len(t))
    for off in (0, 0.007, 0.016):
        i = int(off * SR); b = rng.standard_normal(len(t) - i) * np.exp(-np.arange(len(t) - i) / SR * 45); x[i:] += b
    return bp(x, 900, 5000) * 0.55 * vel
def cajon_low(vel=1.0):
    t = T(0.35); f = 70 + 60 * np.exp(-t * 40)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) + lp(rng.standard_normal(len(t)), 400) * np.exp(-t * 40) * 0.4) * vel
def cajon_slap(vel=1.0):
    t = T(0.2); return (bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t * 35) + np.sin(2 * np.pi * 330 * t) * np.exp(-t * 30) * 0.3) * 0.6 * vel
def shaker(vel=1.0):
    t = T(0.09); return hp(rng.standard_normal(len(t)), 6000) * np.sin(np.pi * t / 0.09) ** 2 * 0.25 * vel

def music(D, bpm, groove_in, end_hit):
    b = 60 / bpm; bar = 4 * b
    gtr = np.zeros((int(D * SR) + SR * 3, 2)); perc = np.zeros_like(gtr); mel = np.zeros_like(gtr)
    # intro: slow arpeggios (Am, E) until groove
    t = 0.15; arp = [0, 2, 3, 4, 3, 2]
    while t < groove_in - 0.2:
        c = 'Am' if int(t / (bar)) % 2 == 0 else 'E'
        for k, idx in enumerate(arp):
            m = CH[c][min(idx, len(CH[c]) - 1)]
            place(gtr, pluck(m, 2.5, 0.55 if k else 0.8, 0.45), t + k * b / 2, pan=0.15)
        t += 3 * b
    # rumba groove: per beat pattern D . D U . U D U  (eighths) with rasgueado on bar starts
    pat = [(0, 'D', 1.0), (1, 'D', 0.55), (1.5, 'U', 0.5), (2, 'D', 0.85), (2.5, 'U', 0.45), (3, 'D', 0.7), (3.5, 'U', 0.55)]
    bars = int((end_hit - groove_in) / bar) + 1
    for k in range(bars):
        t0 = groove_in + k * bar
        if t0 >= end_hit - 0.05: break
        c = PROG[k % 4]
        rasgueado(gtr, c, t0 - 0.06, 0.9)
        for beat, d, v in pat[1:]:
            at = t0 + beat * b
            if at < end_hit - 0.05: strum(gtr, c, at, d == 'D', v, mute=(beat in (1, 3)))
        for beat in range(4):
            at = t0 + beat * b
            if at >= end_hit - 0.05: break
            if beat in (0, 2): place(perc, cajon_low(0.9), at)
            if beat in (1, 3): place(perc, cajon_slap(0.8), at); place(perc, palmas(0.9), at, pan=0.25)
            place(perc, palmas(0.45), at + 0.5 * b, pan=-0.3)
            for s16 in range(4): place(perc, shaker(0.6 if s16 % 2 else 1.0), at + s16 * b / 4, pan=0.4)
        # melody (picado) in later bars
        if k >= 2:
            phrase = {'Am': [76, 74, 72, 71, 72], 'G': [74, 72, 71, 69, 71], 'F': [72, 71, 69, 68, 69], 'E': [71, 69, 68, 65, 64]}[c]
            for j, m in enumerate(phrase):
                at = t0 + (1 + j * 0.5) * b
                if at < end_hit - 0.1: place(mel, pluck(m, 1.4, 0.55, 0.8, 0.9975), at, pan=-0.2)
    # final big chord on the end hit + outro arpeggio
    rasgueado(gtr, 'Am', end_hit - 0.03, 1.2)
    t = end_hit + 1.2
    while t < D - 1.0:
        for k, idx in enumerate([0, 2, 3, 4]):
            place(gtr, pluck(CH['Am'][idx] + (12 if k == 3 else 0), 2.8, 0.45, 0.4), t + k * b / 2, pan=0.1)
        t += 2.2 * b
    n = int(D * SR)
    gtr, perc, mel = gtr[:n], perc[:n], mel[:n]
    gtr = reverb(gtr, IR_ROOM, 0.35); mel = reverb(mel, IR_HALL, 0.45); perc = reverb(perc, IR_ROOM, 0.25)
    return gtr * 0.55 + mel * 0.45 + perc * 0.6

# ---------------- cinematic SFX (stereo) ----------------
def st(x, pan=0.0): return np.stack([x * (1 - max(0, pan)), x * (1 + min(0, pan))], 1)
def wet(x, ir=IR_HALL, w=0.5): return reverb(x if x.ndim == 2 else st(x), ir, w)
def sweep_noise(d, f0, f1, k=28):
    n = int(d * SR); x = rng.standard_normal(n + 4000); out = np.zeros(n)
    for i in range(k):
        a, bb = i * n // k, (i + 1) * n // k; p = i / (k - 1); fc = f0 * (f1 / f0) ** p
        out[a:bb] = bp(x[a:bb + 4000], max(40, fc * 0.55), min(fc * 1.7, 20000))[:bb - a]
    return out
def whoosh(d=0.8, up=True, pan_from=-0.8, pan_to=0.8):
    n = int(d * SR); x = sweep_noise(d, 200 if up else 6000, 6000 if up else 200) * 2.2
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** (1.4 if up else 2.2); x *= e
    pan = np.linspace(pan_from, pan_to, n)
    s = np.stack([x * np.clip(1 - pan, 0, 1), x * np.clip(1 + pan, 0, 1)], 1)
    return wet(s, IR_HALL, 0.35)
def impact(d=2.6, big=1.0):
    t = T(d); f = 32 + 90 * np.exp(-t * 14); sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * 1.3
    crack = bp(rng.standard_normal(len(t)), 150, 3500) * np.exp(-t * 22) * 0.9
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.6
    metal = sum(np.sin(2 * np.pi * fr * t) * np.exp(-t * dc) for fr, dc in ((180, 5), (271, 6), (433, 7))) * 0.12 * big
    x = np.tanh((sub + crack + click + metal) * 1.6)
    return wet(st(x), IR_HALL, 0.45) * big
def boom():
    a = impact(3.5, 1.3); sp = np.zeros(len(a)); sm = sparkle_m(1.2, 3200); i = int(0.05 * SR); sp[i:i + len(sm)] = sm[:len(sp) - i]
    return a + wet(st(sp), IR_HALL, 0.6) * 0.5
def hit(d=0.45):
    t = T(d); f = 120 + 500 * np.exp(-t * 60)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) + bp(rng.standard_normal(len(t)), 800, 6000) * np.exp(-t * 60) * 0.7
    return wet(st(np.tanh(x * 1.5) * 0.8), IR_ROOM, 0.4)
def pop_hi():
    t = T(0.14); f = 600 + 1200 * np.exp(-t * 50); return wet(st(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.8), IR_ROOM, 0.3)
def tick():
    t = T(0.12); x = np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 60) + hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 200) * 0.4
    return wet(st(x * 0.6), IR_ROOM, 0.3)
def ding():
    t = T(1.4); out = np.zeros(len(t))
    for off, f in ((0, 1318.5), (0.11, 1760)):
        i = int(off * SR); tt = t[:len(t) - i]
        out[i:] += sum(np.sin(2 * np.pi * f * h * tt) * g for h, g in ((1, 1), (2.01, .3), (3.01, .1))) * np.exp(-tt * 4.5) * 0.45
    return wet(st(out), IR_HALL, 0.4)
def sparkle_m(d=1.0, base=2600):
    n = int(d * SR); out = np.zeros(n)
    for i in range(18):
        s = int(rng.uniform(0, d * 0.75) * SR); f = base * rng.uniform(0.8, 2.4); L = int(0.25 * SR)
        tt = np.arange(L) / SR; b = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 22) * rng.uniform(0.25, 0.6)
        out[s:s + L] += b[:max(0, min(L, n - s))]
    return out
def sparkle():
    a = sparkle_m(); return wet(np.stack([a, np.roll(a, 300)], 1), IR_HALL, 0.6) * 0.8
def riser(d=1.8):
    t = T(d); p = t / d
    nz = hp(rng.standard_normal(len(t)), 1500) * p ** 3 * 0.9          # reverse-cymbal swell
    tone = np.sin(2 * np.pi * np.cumsum(150 + 1500 * p ** 2.5) / SR) * p ** 2 * 0.3
    trem = 1 + 0.3 * np.sin(2 * np.pi * (4 + 18 * p) * t)
    x = (nz + tone) * trem; x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return wet(st(x), IR_HALL, 0.3)
def swish(): return whoosh(0.45, True, 0.3, -0.3) * 0.8
def swoosh_rl(): return whoosh(0.55, True, 0.9, -0.6)
def click():
    t = T(0.05); x = rng.standard_normal(len(t)) * np.exp(-t * 250) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120) * 0.6
    return wet(st(x * 0.9), IR_ROOM, 0.25)
def typing():
    out = np.zeros(int(1.0 * SR))
    for s in np.arange(0, 0.95, 0.1):
        t = T(0.03); c = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 300) * rng.uniform(0.4, 0.9)
        i = int((s + rng.uniform(0, .03)) * SR); out[i:i + len(c)] += c[:len(out) - i]
    return wet(st(out), IR_ROOM, 0.3)
def plane(d=2.9):
    t = T(d); e = np.sin(np.pi * t / d) ** 1.3
    x = lp(rng.standard_normal(len(t)), 900) * 0.9 + np.sin(2 * np.pi * (85 + 25 * t / d) * t) * 0.2 + bp(rng.standard_normal(len(t)), 2000, 5000) * 0.15
    pan = np.linspace(0.7, -0.7, len(t))
    return np.stack([x * e * np.clip(1 - pan, 0, 1), x * e * np.clip(1 + pan, 0, 1)], 1)
SFX = dict(whoosh=lambda: whoosh(0.8) * 0.6, whoosh_long=lambda: whoosh(1.4, True, -0.9, 0.9) * 0.75, whoosh_down=lambda: whoosh(0.9, False, 0.8, -0.8),
           impact=impact, boom=boom, hit=hit, pop_hi=pop_hi, tick=tick, ding=ding, sparkle=sparkle, riser=lambda: riser() * 0.6, swish=swish,
           swoosh_rl=swoosh_rl, click=click, typing=typing, plane=plane)

if __name__ == '__main__':
    ev = json.load(open(sys.argv[1])); D = float(sys.argv[3]); n = int(D * SR)
    mus = music(D, ev['bpm'], ev['groove_in'], ev['end_hit'])
    t = np.arange(n) / SR
    mus *= (np.clip(t / 0.8, 0, 1) * np.clip((D - t) / 1.5, 0, 1))[:, None]
    fx = np.zeros((n, 2))
    for name, at, gain, pan in ev['sfx']:
        s = SFX[name]() * gain
        if pan: s = s * np.array([1 - max(0, pan), 1 + min(0, pan)])
        i = int(at * SR); L = min(len(s), n - i)
        if L > 0: fx[i:i + L] += s[:L]
    env = lp(np.abs(fx).mean(1), 6, 1); duck = 1 - 0.4 * np.clip(env * 3, 0, 1)
    mix = fx * 0.9 + mus * duck[:, None] * 0.85
    peak = np.percentile(np.abs(mix), 99.97); mix = np.tanh(mix / peak * 1.1) / np.tanh(1.1) * 0.9
    mix = np.clip(mix, -0.98, 0.98)
    wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
    print('audio ok', round(float(peak), 3))
