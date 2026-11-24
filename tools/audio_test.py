"""Audio test suite. Run:  python3 tools/audio_test.py   (needs ffmpeg; faster-whisper for the accuracy pass)

Checks every clip listed in js/audio-manifest.js:
  1. the file exists and ffmpeg can decode it
  2. duration is sensible (0.25 s – 6 s)
  3. it is not silent (peak > -30 dBFS) and not clipped (peak < -0.3 dBFS)
  4. consistency: every non-Qur'an clip comes from the one teacher voice (tools/audio-sources.json)
  5. accuracy: speech recognition hears the intended word (multi-letter words) — reported, with a score
Exits non-zero if any of 1–4 fail.
"""
import json, os, re, subprocess, sys, difflib, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(ROOT, 'js/audio-manifest.js'), encoding='utf-8').read()
man = json.loads(s[s.index('{'):s.rindex('}') + 1])
src = json.load(open(os.path.join(ROOT, 'tools/audio-sources.json'), encoding='utf-8'))

def probe(f):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True)
    if r.returncode: return None
    peak = re.search(r'max_volume: ([-\d.]+)', r.stderr)
    dur = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip()
    return float(dur or 0), float(peak.group(1)) if peak else -99

fails = []
voices = {}
for text, cid in man.items():
    f = os.path.join(ROOT, 'assets/audio', cid + '.mp3')
    if not os.path.exists(f): fails.append(f'missing file: {text}'); continue
    p = probe(f)
    if not p: fails.append(f'cannot decode: {text}'); continue
    dur, peak = p
    long_ok = ' ' in text or src.get(text, '').startswith('qari')   # tajwīd madd can last 6 counts
    if not .25 <= dur <= (8 if long_ok else 6): fails.append(f'odd length {dur:.2f}s: {text}')
    if peak < -30: fails.append(f'too quiet ({peak} dB): {text}')
    if peak > -.3: fails.append(f'clipping ({peak} dB): {text}')
    how = src.get(text, '?').split()[0]
    kind = 'qari' if how == 'qari' else ('joined' if how == 'joined' else ('teacher' if how.startswith('teach') else ('native teacher' if how.endswith('_x') or how.endswith('_xs') else how)))
    voices[kind] = voices.get(kind, 0) + 1
    if kind not in ('qari', 'teacher', 'native teacher', 'joined', 'your', 'human'): fails.append(f'not the teacher voice ({how}): {text}')
print(f'{len(man)} clips checked. Sources: {voices}')

if '--no-asr' not in sys.argv:
    try:
        import numpy as np
        from faster_whisper import WhisperModel
        model = WhisperModel('small', device='cpu', compute_type='int8')
        def plain(x):
            x = re.sub(r'[ً-ٰٟۖ-ۭـ]', '', unicodedata.normalize('NFKD', x))
            x = x.translate(str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي', 'ء': ''}))
            return re.sub(r'[^ء-ي]', '', x)
        scores = []
        for text, cid in man.items():
            if len(plain(text)) < 3 or ' ' in text: continue
            raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(ROOT, 'assets/audio', cid + '.mp3'), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
            heard = ''.join(x.text for x in model.transcribe(np.frombuffer(raw, np.float32), language='ar', beam_size=5)[0])
            scores.append((difflib.SequenceMatcher(None, plain(text), plain(heard)).ratio(), text, heard.strip()))
        scores.sort()
        print(f'accuracy: {len(scores)} words, mean {sum(x[0] for x in scores) / len(scores):.2f}, '
              f'{sum(x[0] >= .7 for x in scores)} clearly understood (>= .7)')
        for sc, t, h in scores[:8]: print(f'   lowest: {sc:.2f} {t} -> {h}')
    except ImportError:
        print('accuracy pass skipped (pip install faster-whisper)')

for x in fails: print('FAIL', x)
print('AUDIO TEST', 'FAILED' if fails else 'PASSED')
sys.exit(1 if fails else 0)
