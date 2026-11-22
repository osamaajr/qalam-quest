"""Acoustic checks on synthesised clips (Praat):
  vowel_ok      - is the vowel of a short syllable the expected a / i / u?
  consonant_ok  - is a word-initial ج a real "j" (affricate), not "g" or "zh"?
Thresholds were calibrated on known recordings (true j ~42-74 ms of friction; g and zh < 25 ms).
Needs: pip install praat-parselmouth, and ffmpeg."""
import re, subprocess, tempfile, os
import numpy as np, parselmouth

# Calibrated on long vowels from each voice (see README): a has a high F1; i has a high F2.
THRESH = {'ar-SA-HamedNeural': (470, 1300), 'ar-SA-ZariyahNeural': (560, 1250), 'ar-AE-FatimaNeural': (560, 1250), 'ar-KW-NouraNeural': (560, 1250)}

def expected(text):
    core = text.strip(); letters = re.sub(r'[ً-ٰٟ]', '', core)
    if ' ' in core or 'ـ' in core or not 1 <= len(letters) <= 2: return None
    if len(letters) == 2:
        if re.search(r'[ً-ٍْ]', core): return None
        return {'ا': 'a', 'ي': 'i', 'ى': 'a', 'و': 'u'}.get(letters[1])
    for marks, v in (('ًَ', 'a'), ('ٍِ', 'i'), ('ٌُ', 'u')):
        if any(c in core for c in marks): return v
    return None

def measure(path):
    wav = tempfile.mktemp(suffix='.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-ac', '1', '-ar', '16000', wav], check=True)
    try:
        snd = parselmouth.Sound(wav); pitch = snd.to_pitch(); inten = snd.to_intensity()
        fm = snd.to_formant_burg(max_number_of_formants=5, maximum_formant=5500)
        top = inten.values.max()
        ts = [t for t in pitch.xs() if pitch.get_value_at_time(t) == pitch.get_value_at_time(t) and (inten.get_value(t) or -99) > top - 12]
        if len(ts) < 3: return None
        ts = ts[len(ts) // 3:]
        return float(np.median([fm.get_value_at_time(1, t) for t in ts])), float(np.median([fm.get_value_at_time(2, t) for t in ts]))
    finally:
        os.remove(wav)

def vowel_ok(path, text, voice):
    want = expected(text)
    if not want: return True
    m = measure(path)
    if not m: return False
    a, i = THRESH[voice]
    got = 'a' if m[0] > a else ('i' if m[1] > i else 'u')
    return got == want


def _onset(path):
    """Friction (ms) of the word-initial consonant: 2.5-7.5 kHz noise before the vowel starts."""
    wav = tempfile.mktemp(suffix='.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-ac', '1', '-ar', '16000', wav], check=True)
    try:
        snd = parselmouth.Sound(wav)
    finally:
        os.remove(wav)
    x = snd.values[0]; sr = 16000; hop = 32; win = 128
    fr = np.array([x[i:i + win] for i in range(0, len(x) - win, hop)])
    if not len(fr): return 0
    e = 10 * np.log10((fr ** 2).mean(1) + 1e-12); emax = e.max()
    spec = np.abs(np.fft.rfft(fr * np.hanning(win), n=256)); fq = np.fft.rfftfreq(256, 1 / sr)
    hi = spec[:, (fq >= 2500) & (fq <= 7500)].sum(1); lo = spec[:, (fq >= 100) & (fq < 1200)].sum(1) + 1e-9
    pitch = snd.to_pitch(time_step=.002)
    def voiced(t): v = pitch.get_value_at_time(t); return v == v
    start = int(np.argmax(e > emax - 35))
    vowel = next((i for i in range(start, len(e)) if voiced(i * hop / sr + .004) and e[i] > emax - 12 and lo[i] > hi[i]), None)
    if vowel is None: return 0
    return 2 * sum(1 for i in range(start, vowel) if hi[i] > lo[i] * 0.8 and e[i] > emax - 40)

def consonant_ok(path, text):
    first = re.sub(r'[\u064B-\u065F\u0670]', '', text.strip())[:1]
    if first == 'ج': return _onset(path) >= 35       # affricate "j", not "g" or "zh"
    return True


def vowel_onset(path):
    """Seconds at which the (loud, voiced) vowel starts."""
    wav = tempfile.mktemp(suffix='.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-ac', '1', '-ar', '16000', wav], check=True)
    try:
        snd = parselmouth.Sound(wav); pitch = snd.to_pitch(time_step=.005); inten = snd.to_intensity(time_step=.005)
        top = inten.values.max()
        for t in pitch.xs():
            v = pitch.get_value_at_time(t)
            if v == v and (inten.get_value(t) or -99) > top - 10: return float(t)
        return None
    finally:
        os.remove(wav)
