# Forced alignment (torchaudio MMS_FA) of a known transcript to a voiceover. Usage: python align.py audio.wav transcript.txt out.json
import sys, json, torch, torchaudio, uroman as ur
wav, sr = torchaudio.load(sys.argv[1])
wav = torchaudio.functional.resample(wav.mean(0, keepdim=True), sr, 16000)
words = open(sys.argv[2], encoding='utf-8').read().split()
U = ur.Uroman()
def norm(w):
    r = U.romanize_string(w).lower()
    r = ''.join(c for c in r if c in "abcdefghijklmnopqrstuvwxyz'")
    return r or 'a'
rom = [norm(w) for w in words]
bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model(with_star=False); tok = bundle.get_tokenizer(); aligner = bundle.get_aligner()
with torch.inference_mode():
    em, _ = model(wav)
    spans = aligner(em[0], tok(rom))
ratio = wav.size(1) / em.size(1) / 16000
out = []
for w, r, sp in zip(words, rom, spans):
    out.append({'w': w, 'rom': r, 'start': round(sp[0].start * ratio, 3), 'end': round(sp[-1].end * ratio, 3),
                'score': round(float(sum(s.score * len(s) for s in sp) / sum(len(s) for s in sp)), 3)})
json.dump(out, open(sys.argv[3], 'w'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False))
