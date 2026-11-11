"""ElevenLabs TTS for one-off pieces (any language, e.g. Persian with eleven_v3).
Usage (CI): python tools/tts/tts.py tools/tts/<name>   (reads request.json, writes out/<seg id>.mp3 + out/log.txt)
request.json: {"voice": "<voice id>", "models": ["eleven_v3", "eleven_multilingual_v2"], "segments": [{"id": "s1", "text": "..."}]}
"""
import json, os, sys, urllib.request, urllib.error
d = sys.argv[1]; req = json.load(open(os.path.join(d, 'request.json'), encoding='utf-8'))
key = os.environ['ELEVENLABS_API_KEY']; out = os.path.join(d, 'out'); os.makedirs(out, exist_ok=True)
log = open(os.path.join(out, 'log.txt'), 'w')
models = req.get('models') or ['eleven_v3', 'eleven_multilingual_v2']
for s in req['segments']:
    ok = False
    for m in models:
        body = {'text': s['text'], 'model_id': m}
        if req.get('settings'): body['voice_settings'] = req['settings']
        r = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{req['voice']}?output_format=mp3_44100_128",
                                   data=json.dumps(body).encode(), headers={'xi-api-key': key, 'Content-Type': 'application/json'})
        try:
            data = urllib.request.urlopen(r, timeout=120).read()
            open(os.path.join(out, s['id'] + '.mp3'), 'wb').write(data)
            print(s['id'], 'ok', m, len(data), file=log, flush=True); ok = True; break
        except urllib.error.HTTPError as e:
            print(s['id'], 'fail', m, e.code, e.read()[:300], file=log, flush=True)
        except Exception as e:
            print(s['id'], 'fail', m, repr(e)[:300], file=log, flush=True)
    if not ok: print(s['id'], 'GAVE UP', file=log, flush=True)
log.close(); print(open(os.path.join(out, 'log.txt')).read())
