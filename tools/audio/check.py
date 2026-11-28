"""Strict pronunciation check for every Qalam sound.

What a clip SHOULD sound like comes from the Qur'an phonetic script (quran-transcript): consonants, ḥarakāt,
sukūn, shadda and the length of every madd. What it DOES sound like comes from HisnLabs Tajweed v2, a small model
trained on Qur'anic recitation that writes what it hears in that same script. A clip passes only if the consonant
and vowel sequence is identical (a madd may be off by one count).

  python3 tools/audio/check.py                   grade every clip in js/audio-manifest.js
  python3 tools/audio/check.py --only بَ,بُو      grade some

Setup (once):  python3 -m venv ~/Library/Caches/qalam-audio/venv && ~/Library/Caches/qalam-audio/venv/bin/pip install -r tools/audio/requirements.txt
then run with ~/Library/Caches/qalam-audio/venv/bin/python. The model (Apache-2.0, 83 MB) is fetched into ~/Library/Caches/qalam-audio.
"""
import json, os, re, subprocess, sys, unicodedata, urllib.request
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.expanduser('~/Library/Caches/qalam-audio')   # outside iCloud-synced folders: never offloaded
TAJWEED = os.path.join(CACHE, 'tajweed')
MODEL_URL = 'https://huggingface.co/Hisnlabs/tajweed-v2/resolve/main/onnx/model-fp32.onnx'


def _setup():
    if not os.path.exists(os.path.join(TAJWEED, 'imam.py')):
        os.makedirs(CACHE, exist_ok=True)
        subprocess.run(['git', 'clone', '-q', '--depth', '1', 'https://github.com/HisnLabs/tajweed.git', TAJWEED], check=True)
    onnx = os.path.join(TAJWEED, 'onnx', 'model-fp32.onnx')
    if not os.path.exists(onnx):
        os.makedirs(os.path.dirname(onnx), exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, onnx)
    sys.path.insert(0, TAJWEED)


_setup()
import inference, imam                                      # noqa: E402  (HisnLabs Tajweed v2)
from quran_transcript import quran_phonetizer               # noqa: E402

M = imam.default_moshaf()
HARAKAT = 'ًٌٍَُِْ'
SHADDA = 'ّ'
SUKUN = 'ْۡ'
LONG = 'اۦۥ'


def tidy(t):
    """NFC puts a ḥaraka before the shadda; Qur'anic text (and the phonetizer) wants the shadda first."""
    t = unicodedata.normalize('NFC', t).strip()
    return re.sub('([' + HARAKAT + '])' + SHADDA, SHADDA + r'\1', t)


_c = open(os.path.join(ROOT, 'js/content.js'), encoding='utf-8').read()
NAMES = {unicodedata.normalize('NFC', n) for n in re.findall(r"'[^']': '([^']+)'", _c[_c.index('const SAY_NAME'):_c.index('};', _c.index('const SAY_NAME'))])}
BASE = re.compile('[ء-ي]')


def is_drill(parts):
    """letters said one by one (بَ بِ بُ, بَا دَال نُون, بً بٍ بٌ) rather than a phrase whose words join up"""
    one = lambda p: len(BASE.findall(p)) == 1 or (len(BASE.findall(p)) == 2 and p[-1] in 'اوي')   # بَ or بَا بِي بُو
    return len(parts) > 1 and all(p in NAMES or one(p) for p in parts)


def parts_of(t):
    return tidy(t).split()


def target(t):
    """How a teacher says the on-screen text. Every vowel is kept (not the pause form), except: an item that itself
    ends in sukūn (دْ, أَبْ) is said stopped; a word ending in ة is said as on its own (madrasah); letters in a
    drill are said one at a time, each the same way."""
    t = tidy(t)
    if is_drill(t.split()): return ''.join(target(p) for p in t.split())
    if t[-1] in SUKUN or t.endswith('ة'):
        return quran_phonetizer(t, M, remove_spaces=True).phonemes
    o = quran_phonetizer(t + ' أَ', M, remove_spaces=True).phonemes   # a following word stops the pause rules
    assert o.endswith('ء'), o
    return o[:-1]


def pause_form(t):
    return quran_phonetizer(tidy(t), M, remove_spaces=True).phonemes


def shape(p):
    """(skeleton, madd lengths): a run of one long vowel becomes one symbol plus its count"""
    sk, lens = [], []
    for m in re.finditer(r'(.)\1*', p.replace('ڇ', '')):
        c, n = m.group(1), len(m.group(0))
        if c in LONG: sk.append(c); lens.append(n)
        else: sk.append(c * n)
    return ''.join(sk), lens


def compare(want, heard):
    a, la = shape(want); b, lb = shape(heard)
    if a != b: return 'wrong'
    if len(la) != len(lb) or any(abs(x - y) > 1 for x, y in zip(la, lb)): return 'madd'
    return 'ok'


def pcm16k(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.float32)


LEAD_TEXT = 'قُلْ'   # a real recitation (Quran.com word audio) played first: the model was trained on recitation, and a
                     # lone half-second syllable gives it too little to settle on; after a known word it hears far better
_lead = None


def _lead_pcm():
    global _lead
    if _lead is None:
        cached = os.path.join(CACHE, 'lead.mp3')
        if not os.path.exists(cached):
            s = open(os.path.join(ROOT, 'js/audio-manifest.js'), encoding='utf-8').read()
            man = json.loads(s[s.index('{'):s.rindex('}') + 1])
            subprocess.run(['cp', os.path.join(ROOT, 'assets/audio', man[LEAD_TEXT] + '.mp3'), cached], check=True)
        _lead = np.concatenate([pcm16k(cached), np.zeros(int(16000 * 0.25), np.float32)])
    return _lead


def hear(path, context=True):
    """-> (heard script, mean confidence, symbol times in seconds from the start of the clip)"""
    x = pcm16k(os.path.abspath(path))
    lead = _lead_pcm() if context else np.zeros(0, np.float32)
    cwd = os.getcwd(); os.chdir(TAJWEED)
    try:
        heard, probs, times = inference.hear(np.concatenate([lead, x]), model='onnx/model-fp32.onnx')
    finally:
        os.chdir(cwd)
    off = len(lead) / 16000
    k = 0
    if context:                                   # drop what was heard of the lead word
        while k < len(times) - 1 and times[k] < off - 0.05: k += 1
    return heard[k:], (float(np.mean(probs[k:])) if probs[k:] else 0.0), [t - off for t in times[k:]]


BREATH = 'هحع'


def check(text, path, quran=False, context=True):
    """-> dict(verdict ok|madd|wrong, heard, want, conf, times)"""
    heard, conf, times = hear(path, context)
    wants = [target(text)] + ([pause_form(text)] if quran else [])
    if wants[0].endswith('ه') and tidy(text).endswith('ة'):     # a final ة on its own: a soft h, or t, or barely heard
        wants += [wants[0][:-1] + 'ت', wants[0][:-1] + 'ح', wants[0][:-1]]
    if any(w.endswith('ن') for w in wants):                 # a final nūn (tanwīn, نُون): the model often writes the
        wants += [w[:-1] + 'م' for w in wants if w.endswith('ن')]   # hum as m; both are nasal, it is the vowel before that teaches
    h = heard
    if h and h[-1] in BREATH and not any(w.endswith(h[-1]) for w in wants):   # a breath after the last vowel
        h = h[:-1]
    verdicts = [compare(w, h) for w in wants]
    best = min(range(len(wants)), key=lambda i: ['ok', 'madd', 'wrong'].index(verdicts[i]))
    return dict(verdict=verdicts[best], heard=heard, want=wants[best], conf=round(conf, 3), times=times)


if __name__ == '__main__':
    s = open(os.path.join(ROOT, 'js/audio-manifest.js'), encoding='utf-8').read()
    man = json.loads(s[s.index('{'):s.rindex('}') + 1])
    src = json.load(open(os.path.join(ROOT, 'tools/audio-sources.json'), encoding='utf-8'))
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    rows = []
    for text, cid in man.items():
        if only and text not in only: continue
        kind = (src.get(text) or '').split(' ')[0]
        r = check(text, os.path.join(ROOT, 'assets/audio', cid + '.mp3'), quran=kind == 'qari', context=kind != 'qari')
        r.pop('times'); r.update(text=text, kind=kind); rows.append(r)
        print(f"{r['verdict']:6} {kind:8} {text:14} heard {r['heard']:18} want {r['want']}", flush=True)
    from collections import Counter
    print('\n'.join(f'{k}: {dict(Counter(r["verdict"] for r in rows if r["kind"] == k))}' for k in sorted({r['kind'] for r in rows})))
