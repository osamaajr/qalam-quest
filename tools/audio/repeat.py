"""A second way to make a sound the voices keep getting wrong said alone (رٌ, قُلُ): the voice says it twice in a
teaching prompt ("قُلْ: قُلُ، قُلُ."), every piece between pauses is cut out and checked, and the best pieces go to
the listening page (tools/audio-review.html → Needs your ear) for approval as takes 100+.

  ~/Library/Caches/qalam-audio/venv/bin/python tools/audio/repeat.py رٌ قُلُ
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import eleven, check                                       # noqa: E402

VOICES = {'zaid': 'R6nda3uM038xEEKi7GFl', 'huda': 'w4LX7bK479eHGM1k15Em'}
PROMPTS = ['قُلْ: {0}، {0}.', '{0}، {0}، {0}.', 'اِقْرَأْ مَعِي: {0}، {0}.', 'هَيَّا: {0}، {0}!']


def pieces(raw):
    """(start, end) in seconds of every stretch of sound between pauses"""
    y = check.pcm16k(raw); e = eleven._env(y); sr = 16000
    loud = e > e.max() * 0.04
    edges = np.nonzero(np.diff(np.concatenate([[0], loud.astype(int), [0]])))[0].reshape(-1, 2)
    out = []
    for a, b in edges:                                      # merge blips closer than 0.12 s (stop closures)
        if out and a - out[-1][1] < 0.12 * sr: out[-1][1] = b
        else: out.append([a, b])
    return [(a / sr, b / sr) for a, b in out if b - a > 0.12 * sr]


def main(texts):
    ear_path = os.path.join(eleven.ROOT, 'tools', 'audio-needs-ear.json')
    ear = []                                                # only what still needs a decision
    cand = os.path.join(eleven.ROOT, 'tools', 'voice-pick', 'cand')
    for text in texts:
        ar = check.tidy(text)
        for buddy, vid in VOICES.items():
            d = os.path.join(eleven.CACHE, vid); found = []
            for n, (model, prompt) in enumerate([(m, p) for p in PROMPTS for m in ('eleven_v4', 'eleven_v3')]):
                raw = os.path.join(d, f'{eleven.cid(text)}-rep{n}.raw.mp3')
                if not os.path.exists(raw): eleven.tts(vid, prompt.format(ar), 2000 + n, model, raw)
                segs = pieces(raw)
                if prompt.startswith(('قُلْ', 'اِقْرَأْ', 'هَيَّا')): segs = segs[1:]   # the prompt word itself
                for k, (a, b) in enumerate(segs):
                    take = 100 + n * 10 + k
                    fin = os.path.join(d, f'{eleven.cid(text)}-{take}{eleven.SUFFIX}.mp3')
                    tmp = fin + '.tmp.mp3'
                    eleven.subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', f'atrim={max(0, a - 0.05):.3f}:{b + 0.08:.3f}', tmp], check=True)
                    if not eleven.polish(tmp, fin, check): continue
                    os.remove(tmp)
                    r = check.check(text, fin)
                    found.append((r['verdict'] == 'ok', r['conf'], take, fin, r['heard']))
                    print(f'{buddy} {text} {model} {prompt.format(ar):22} piece {k}: {r["verdict"]:5} heard {r["heard"]}', flush=True)
            found.sort(key=lambda x: (not x[0], -x[1]))
            files = []
            for ok, conf, take, fin, heard in found[:4]:
                name = f'{buddy}-{eleven.cid(text)}-{take}.mp3'
                eleven.subprocess.run(['cp', fin, os.path.join(cand, name)], check=True); files.append('voice-pick/cand/' + name)
            if files: ear.append(dict(buddy=buddy, text=text, want=check.target(text), takes=files))
    json.dump(ear, open(ear_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(ear), 'sounds need your ear')


if __name__ == '__main__':
    main(sys.argv[1:])
