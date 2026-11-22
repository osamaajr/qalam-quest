"""Synthesise clips with Microsoft's neural Arabic voice (edge-tts).
Called by tools/make-audio.js with a JSON file of {id: text}; writes assets/audio/<id>.mp3.
Needs: pip install edge-tts"""
import asyncio, json, sys, pathlib
import edge_tts

VOICE, RATE = "ar-SA-HamedNeural", "-15%"

async def one(sem, out, id_, text):
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(out / f"{id_}.mp3"))
                return
            except Exception as e:  # network hiccup: retry
                if attempt == 3: print("FAILED", id_, text, e)
                await asyncio.sleep(1 + attempt)

async def main(jobs_file, out_dir):
    jobs = json.loads(pathlib.Path(jobs_file).read_text())
    out = pathlib.Path(out_dir); sem = asyncio.Semaphore(6)
    await asyncio.gather(*(one(sem, out, i, t) for i, t in jobs.items()))
    print(f"{len(jobs)} clips synthesised")

asyncio.run(main(sys.argv[1], sys.argv[2]))
