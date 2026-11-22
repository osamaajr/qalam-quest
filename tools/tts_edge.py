"""Synthesise clips with Microsoft's natural neural Arabic voices (edge-tts).
Called by tools/make-audio.js with a JSON file of {id: text}; writes assets/audio/<id>.mp3.

Every clip is trimmed of dead air and loudness-levelled so it plays instantly and evenly.
Short syllables (e.g. بُ) are recorded as several candidates (two voices x two speeds) and
the first whose vowel passes tools/vowel_check.py is kept; if none pass, no clip is written
and the game stays silent for it rather than teach a wrong sound.
Needs: pip install edge-tts praat-parselmouth, and ffmpeg."""
import asyncio, json, sys, pathlib, subprocess, tempfile, os
import edge_tts
sys.path.insert(0, os.path.dirname(__file__))
from vowel_check import expected, vowel_ok

MAIN = ("ar-SA-HamedNeural", "-15%")
CANDIDATES = [("ar-SA-HamedNeural", "-15%"), ("ar-SA-ZariyahNeural", "-15%"), ("ar-SA-HamedNeural", "-35%"), ("ar-SA-ZariyahNeural", "-35%")]
CLEAN = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,"
         "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse,"
         "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.08")

def finish(src, dst):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', CLEAN, '-ar', '24000', '-ac', '1', '-b:a', '64k', dst], check=True)

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
            if not expected(text):
                await synth(text, *MAIN, dst); return 'ok'
            for voice, rate in CANDIDATES:
                tmp = tempfile.mktemp(suffix='.mp3')
                await synth(text, voice, rate, tmp)
                if vowel_ok(tmp, text, voice):
                    os.replace(tmp, dst); return 'ok'
                os.remove(tmp)
            print('SILENT', text); return 'muted'
        except Exception as e:
            print('FAILED', id_, text, e); return 'failed'

async def main(jobs_file, out_dir):
    jobs = json.loads(pathlib.Path(jobs_file).read_text())
    out = pathlib.Path(out_dir); sem = asyncio.Semaphore(5)
    res = await asyncio.gather(*(one(sem, out, i, t) for i, t in jobs.items()))
    print(f"{len(jobs)} clips: {res.count('ok')} recorded, {res.count('muted')} left silent (no candidate passed the vowel check), {res.count('failed')} failed")

asyncio.run(main(sys.argv[1], sys.argv[2]))
