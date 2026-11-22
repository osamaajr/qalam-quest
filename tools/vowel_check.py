"""Is the vowel in a short syllable clip the one we expect?  Measures F1/F2 with Praat.
Needs: pip install praat-parselmouth, and ffmpeg."""
import re, subprocess, tempfile, os
import numpy as np, parselmouth

# Calibrated on long vowels from each voice (see README): a has a high F1; i has a high F2.
THRESH = {'ar-SA-HamedNeural': (470, 1300), 'ar-SA-ZariyahNeural': (560, 1250)}

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
