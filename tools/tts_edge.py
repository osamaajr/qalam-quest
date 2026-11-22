"""Synthesise clips with Microsoft's natural neural Arabic voices (edge-tts).
Called by tools/make-audio.js with a JSON file of {id: text}; writes assets/audio/<id>.mp3.

Every clip is trimmed of dead air and loudness-levelled so it plays instantly and evenly.
Short syllables (e.g. بُ) are recorded as several candidates (two voices x two speeds) and
the first whose vowel passes tools/vowel_check.py is kept; if none pass, no clip is written
and the game stays silent for it rather than teach a wrong sound.
Needs: pip install edge-tts praat-parselmouth, and ffmpeg."""
import asyncio, json, re, sys, pathlib, subprocess, tempfile, os
import edge_tts
sys.path.insert(0, os.path.dirname(__file__))
from vowel_check import expected, vowel_ok, consonant_ok, vowel_onset

# Main voice: Saudi female (Zariyah) - the only voice whose ج measured as a true "j" on every Jeem sound.
MAIN = ("ar-SA-ZariyahNeural", "-15%")
CANDIDATES = [("ar-SA-ZariyahNeural", "-15%"), ("ar-SA-ZariyahNeural", "-30%"), ("ar-SA-HamedNeural", "-15%"), ("ar-AE-FatimaNeural", "-15%"), ("ar-KW-NouraNeural", "-15%"), ("ar-SA-HamedNeural", "-30%")]
THRESH_EXTRA = {"ar-AE-FatimaNeural": (560, 1250), "ar-KW-NouraNeural": (560, 1250)}
CLEAN = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,"
         "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse,"
         "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.08")

def finish(src, dst):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', CLEAN, '-ar', '24000', '-ac', '1', '-b:a', '64k', dst], check=True)

def long_form(text):
    """بُ -> بُو, بِ -> بِي, بَ -> بَا  (only for a single letter + short vowel)"""
    letters = re.sub(r'[\u064B-\u065F\u0670]', '', text)
    if len(letters) != 1: return None
    for mark, ext in (('\u064E', 'ا'), ('\u0650', 'ي'), ('\u064F', 'و')):
        if mark in text and not re.search(r'[\u064B-\u064D]', text): return text + ext
    return None

LETTER_NAMES = set()  # filled from the job list: names get a final sukun so no case ending is added

def say_as(text):
    # a letter name like جِيم is read in pause form (جِيمْ) - never 'jeemun'
    if text in LETTER_NAMES and not text.endswith('\u0652'): return text + '\u0652'
    return text

async def synth(text, voice, rate, dst):
    raw = tempfile.mktemp(suffix='.mp3')
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(raw); break
        except Exception:
            if attempt == 3: raise
            await asyncio.sleep(1 + attempt)
    finish(raw, dst); os.remove(raw)

async def one(sem, out, id_, text):
    async with sem:
        dst = str(out / f"{id_}.mp3")
        try:
            checked = bool(expected(text)) or text.strip()[:1] == 'ج'
            if not checked:
                await synth(say_as(text), *MAIN, dst); return 'ok'
            for voice, rate in CANDIDATES:
                tmp = tempfile.mktemp(suffix='.mp3')
                await synth(say_as(text), voice, rate, tmp)
                if (not expected(text) or vowel_ok(tmp, text, voice)) and consonant_ok(tmp, text):
                    os.replace(tmp, dst); return 'ok'
                os.remove(tmp)
            # Voices often slur a lone short vowel (e.g. جُ comes out as "jeh"). Record the long
            # vowel instead (جُو - which they say correctly) and trim it to a short beat.
            long = long_form(text)
            if long:
                for voice, rate in CANDIDATES:
                    tmp = tempfile.mktemp(suffix='.mp3'); short = tempfile.mktemp(suffix='.mp3')
                    await synth(long, voice, rate, tmp)
                    ok = vowel_ok(tmp, long, voice) and consonant_ok(tmp, text)
                    on = vowel_onset(tmp) if ok else None
                    if on is not None:
                        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-t', f'{on + 0.15:.3f}',
                                        '-af', 'afade=t=out:st=%.3f:d=0.06,apad=pad_dur=0.08' % (on + 0.09), '-ar', '24000', '-ac', '1', '-b:a', '64k', short], check=True)
                        if vowel_ok(short, text, voice) or vowel_ok(short, long, voice):
                            os.replace(short, dst); os.remove(tmp); return 'ok'
                    for f in (tmp, short):
                        if os.path.exists(f): os.remove(f)
            print('SILENT', text); return 'muted'
        except Exception as e:
            print('FAILED', id_, text, e); return 'failed'

async def main(jobs_file, out_dir):
    data = json.loads(pathlib.Path(jobs_file).read_text())
    jobs = data['jobs'] if 'jobs' in data else data
    LETTER_NAMES.update(data.get('names', []))
    out = pathlib.Path(out_dir); sem = asyncio.Semaphore(5)
    res = await asyncio.gather(*(one(sem, out, i, t) for i, t in jobs.items()))
    print(f"{len(jobs)} clips: {res.count('ok')} recorded, {res.count('muted')} left silent (no candidate passed the vowel check), {res.count('failed')} failed")

asyncio.run(main(sys.argv[1], sys.argv[2]))
