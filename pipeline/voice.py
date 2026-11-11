"""Narration: Kokoro TTS per sentence -> voice.wav, then Whisper word timestamps -> timing.json.

Usage: python pipeline/voice.py episodes/<id>
Env:   KOKORO_DIR   folder holding kokoro-v1.0.int8.onnx + voices-v1.0.bin (default: models/kokoro)
       WHISPER_MODEL faster-whisper model name or local path (default: small.en)
       ELEVENLABS_API_KEY + ELEVEN_VOICE_ID  when both are set (or script "voice": "eleven:<voice id>"), the narration is
       made with ElevenLabs instead of Kokoro, and its character timestamps give exact word timing (no Whisper needed).
       ELEVEN_MODEL (default eleven_multilingual_v2)
"""
import sys, os, re, json, difflib
import numpy as np, soundfile as sf

EP = sys.argv[1].rstrip('/')
OUT = os.path.join(EP, 'build'); os.makedirs(OUT, exist_ok=True)
ep = json.load(open(os.path.join(EP, 'script.json')))
SR = 24000
GAP_SENT, GAP_SEG = 0.28, 0.65


def sentences(text):
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [p for p in parts if p]


def tts():
    from kokoro_onnx import Kokoro
    kd = os.environ.get('KOKORO_DIR', 'models/kokoro')
    k = Kokoro(os.path.join(kd, 'kokoro-v1.0.int8.onnx'), os.path.join(kd, 'voices-v1.0.bin'))
    voice, speed = ep.get('voice', 'af_heart'), ep.get('speed', 0.96)
    lang = 'en-gb' if voice.startswith('b') else 'en-us'
    audio, t, segs = [], 0.4, []
    audio.append(np.zeros(int(0.4 * SR), np.float32))
    for s in ep['segments']:
        seg = {'id': s['id'], 'start': round(t, 3), 'sents': []}
        for sent in sentences(s['text']):
            # numbers are already written as words in the script, so the voice reads them naturally
            a, sr = k.create(sent, voice=voice, speed=speed, lang=lang)
            assert sr == SR
            a = trim(a.astype(np.float32))
            seg['sents'].append({'text': sent, 'start': round(t, 3), 'end': round(t + len(a) / SR, 3)})
            audio.append(a); t += len(a) / SR
            audio.append(np.zeros(int(GAP_SENT * SR), np.float32)); t += GAP_SENT
        t += GAP_SEG - GAP_SENT
        audio.append(np.zeros(int((GAP_SEG - GAP_SENT) * SR), np.float32))
        seg['end'] = round(seg['sents'][-1]['end'], 3)
        segs.append(seg)
        print('tts', s['id'], round(t, 1), flush=True)
    audio.append(np.zeros(int(1.0 * SR), np.float32))
    wav = np.concatenate(audio)
    sf.write(os.path.join(OUT, 'voice.wav'), wav, SR)
    return segs, wav


def trim(a, thr=0.008):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a
    s, e = max(0, idx[0] - int(0.03 * SR)), min(len(a), idx[-1] + int(0.08 * SR))
    return a[s:e]


def norm(w): return re.sub(r"[^a-z0-9]", '', w.lower())


def align(segs, wav):
    from faster_whisper import WhisperModel
    m = WhisperModel(os.environ.get('WHISPER_MODEL', 'small.en'), device='cpu', compute_type='int8')
    for seg in segs:
        words = []
        for s in seg['sents']:
            a = wav[int(s['start'] * SR):int(s['end'] * SR)]
            a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)
            got = []
            try:
                res, _ = m.transcribe(a16, language='en', word_timestamps=True, beam_size=3, initial_prompt=s['text'])
                for r in res:
                    for w in r.words: got.append((norm(w.word), w.start, w.end))
            except Exception as e:
                print('whisper failed', e)
            script = s['text'].split()
            times = proportional(script, s['end'] - s['start'])
            if got:  # map whisper words onto script words; keep proportional times where unmatched
                sm = difflib.SequenceMatcher(a=[norm(w) for w in script], b=[g[0] for g in got], autojunk=False)
                for blk in sm.get_matching_blocks():
                    for j in range(blk.size):
                        times[blk.a + j] = (got[blk.b + j][1], got[blk.b + j][2])
                times = monotonic(times, s['end'] - s['start'])
            for w, (a0, a1) in zip(script, times):
                words.append({'w': w, 't': round(s['start'] + a0, 3), 'e': round(s['start'] + a1, 3)})
        seg['words'] = words
    return segs


def eleven_voice():
    key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    v = ep.get('voice', '')
    vid = v.split(':', 1)[1] if v.startswith('eleven:') else os.environ.get('ELEVEN_VOICE_ID', '').strip()
    return (key, vid) if key and vid else (None, None)


def tts_eleven(key, vid):
    """One request per segment (with the neighbouring text for natural flow); word times from the character alignment."""
    import base64, subprocess, urllib.request
    model = os.environ.get('ELEVEN_MODEL') or 'eleven_multilingual_v2'
    url = f'https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128'
    audio, t, segs = [np.zeros(int(0.4 * SR), np.float32)], 0.4, []
    S = ep['segments']
    for i, s in enumerate(S):
        text = re.sub(r'\s+', ' ', s['text'].strip())
        body = {'text': text, 'model_id': model,
                'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.2, 'use_speaker_boost': True},
                'previous_text': S[i - 1]['text'] if i else None, 'next_text': S[i + 1]['text'] if i + 1 < len(S) else None}
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'xi-api-key': key, 'Content-Type': 'application/json'})
                r = json.load(urllib.request.urlopen(req, timeout=180)); break
            except Exception as e:
                print('elevenlabs retry', attempt, e, flush=True)
                if attempt == 3: raise
                import time; time.sleep(5 * (attempt + 1))
        mp3 = base64.b64decode(r['audio_base64'])
        pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', str(SR), 'pipe:1'], input=mp3, capture_output=True, check=True).stdout
        a = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
        al = r.get('normalized_alignment') or r['alignment']
        ch, cs, ce = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
        # leading silence that the trim removes, so the word times stay in sync
        idx = np.where(np.abs(a) > 0.008)[0]; lead = max(0, idx[0] - int(0.03 * SR)) / SR if len(idx) else 0
        a = trim(a)
        words, cur, w0, w1 = [], '', None, None
        for c, st, en in zip(ch, cs, ce):
            if c.isspace():
                if cur: words.append((cur, w0, w1)); cur = ''
                continue
            if not cur: w0 = st
            cur += c; w1 = en
        if cur: words.append((cur, w0, w1))
        script = text.split(' ')
        if len(words) != len(script): print('warning: word count', len(words), len(script), s['id'])
        seg = {'id': s['id'], 'start': round(t, 3), 'words': []}
        for k, w in enumerate(script):
            _, a0, a1 = words[min(k, len(words) - 1)]
            seg['words'].append({'w': w, 't': round(t + max(0, a0 - lead), 3), 'e': round(t + max(0, a1 - lead), 3)})
        audio.append(a); t += len(a) / SR
        seg['end'] = round(t, 3)
        audio.append(np.zeros(int(GAP_SEG * SR), np.float32)); t += GAP_SEG
        segs.append(seg)
        print('eleven', s['id'], round(t, 1), flush=True)
    audio.append(np.zeros(int(1.0 * SR), np.float32))
    wav = np.concatenate(audio)
    sf.write(os.path.join(OUT, 'voice.wav'), wav, SR)
    return segs, wav


def proportional(words, dur):
    wt = [len(norm(w)) + 2 for w in words]; tot = sum(wt); t = 0; out = []
    for x in wt:
        d = dur * x / tot; out.append((t, t + d)); t += d
    return out


def monotonic(times, dur):
    out, last = [], 0.0
    for a, b in times:
        a = max(a, last); b = max(b, a + 0.05); out.append((a, min(b, dur))); last = a + 0.02
    return out


if __name__ == '__main__':
    key, vid = eleven_voice()
    if key:
        segs, wav = tts_eleven(key, vid)
    else:
        segs, wav = tts()
        segs = align(segs, wav)
    json.dump({'duration': round(len(wav) / SR, 3), 'segments': segs}, open(os.path.join(OUT, 'timing.json'), 'w'), indent=1)
    print('voice ok', round(len(wav) / SR, 1), 's')
