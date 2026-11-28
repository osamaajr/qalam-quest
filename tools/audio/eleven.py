"""Rebuild Qalam's teaching audio with ElevenLabs, keeping only takes that pass the strict check.

Why: a computer voice reading a lone بَ or دْ guesses (letter name, extra vowel, lost sukūn). Here every sound is
asked for by its exact pronunciation (IPA between slashes, which Eleven v4/v3 read) as well as in vowelled Arabic,
several takes are made, and tools/audio/check.py keeps only a take whose heard consonants, vowels and madd match
the target. Qur'an words keep the qāriʾ's recitation. Anything that never passes stays silent and is listed.

Setup (once):
  1. ElevenLabs account (Starter plan or higher: library voices need a paid plan for the API)
  2. put ELEVENLABS_API_KEY=... in a file named .env in the project folder (git-ignored)
  3. python3 -m venv ~/Library/Caches/qalam-audio/venv && ~/Library/Caches/qalam-audio/venv/bin/pip install -r tools/audio/requirements.txt
Run with ~/Library/Caches/qalam-audio/venv/bin/python:
  tools/audio/eleven.py voices            find Arabic teacher voices, make samples, write tools/voice-pick/index.html
  tools/audio/eleven.py pick VOICE_ID     choose the voice (saved in tools/audio/voice.json)
  tools/audio/eleven.py build [--only a,b] [--takes 6] [--dry]   generate, check and install every sound
"""
import hashlib, json, os, re, subprocess, sys, tempfile, time, unicodedata, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'assets', 'audio')
CACHE = os.path.expanduser('~/Library/Caches/qalam-audio/eleven')
VOICE_FILE = os.path.join(HERE, 'voice.json')
API = 'https://api.elevenlabs.io'
MODELS = ['eleven_v4', 'eleven_v3']

# ---------------------------------------------------------------- the sounds the game needs
def nfc(t): return unicodedata.normalize('NFC', t).strip()
def cid(t): return hashlib.sha1(nfc(t).encode()).hexdigest()[:10]          # same ids as make-audio.js / app.js


def read_json_js(path, name='QQ_AUDIO'):
    """the object assigned to window.<name> in a generated .js file ({} if absent)"""
    s = open(path, encoding='utf-8').read()
    m = re.search(r'window\.' + name + r' = (\{.*?\});\n', s, re.S)
    return json.loads(m.group(1)) if m else {}


def needed():
    man = read_json_js(os.path.join(ROOT, 'js/audio-manifest.js'))
    silent = json.load(open(os.path.join(ROOT, 'tools/audio-silent.json'), encoding='utf-8'))
    src = json.load(open(os.path.join(ROOT, 'tools/audio-sources.json'), encoding='utf-8'))
    buddy = read_json_js(os.path.join(ROOT, 'js/audio-manifest.js'), 'QQ_AUDIO_BUDDY')
    items = list(dict.fromkeys(list(man) + [t for m in buddy.values() for t in m] + list(silent)))
    return items, man, src, silent


# ---------------------------------------------------------------- pronunciation → IPA
IPA = {'ء': 'ʔ', 'ب': 'b', 'ت': 't', 'ث': 'θ', 'ج': 'dʒ', 'ح': 'ħ', 'خ': 'x', 'د': 'd', 'ذ': 'ð', 'ر': 'r', 'ز': 'z',
       'س': 's', 'ش': 'ʃ', 'ص': 'sˤ', 'ض': 'dˤ', 'ط': 'tˤ', 'ظ': 'ðˤ', 'ع': 'ʕ', 'غ': 'ɣ', 'ف': 'f', 'ق': 'q', 'ك': 'k',
       'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'j', 'ں': 'ŋ', '۾': 'm'}
VOW = {'َ': 'a', 'ُ': 'u', 'ِ': 'i'}
LONGV = {'ا': 'aː', 'ۦ': 'iː', 'ۥ': 'uː'}
EMPH = set('صضطظقخغ')


def to_ipa(ph):
    """Qur'an phonetic script → IPA. Long-vowel runs become one long vowel; doubled consonants (shadda,
    ghunnah) become a geminate; a vowel after an emphatic letter is backed (ɑ)."""
    out, prev = [], ''
    for m in re.finditer(r'(.)\1*', ph.replace('ڇ', '')):
        c, n = m.group(1), len(m.group(0))
        if c in LONGV:
            v = LONGV[c]
            if out and out[-1] in ('a', 'ɑ', 'i', 'u') and out[-1][0] in (v[0], 'ɑ'): out.pop()
            out.append(('ɑː' if prev in EMPH and v == 'aː' else v))
        elif c in VOW:
            out.append('ɑ' if prev in EMPH and c == 'َ' else VOW[c])
        elif c in IPA:
            out.append(IPA[c] * (2 if n >= 2 else 1)); prev = c
    return ''.join(out)


# ---------------------------------------------------------------- ElevenLabs
def key():
    k = os.environ.get('ELEVENLABS_API_KEY')
    env = os.path.join(ROOT, '.env')
    if not k and os.path.exists(env):
        for line in open(env):
            if line.strip().startswith('ELEVENLABS_API_KEY='): k = line.split('=', 1)[1].strip().strip('"\'')
    if not k: sys.exit('No ElevenLabs key: put ELEVENLABS_API_KEY=... in .env in the project folder.')
    return k


def call(method, path, body=None, query=None, raw=False):
    url = API + path + ('?' + urllib.parse.urlencode(query, doseq=True) if query else '')
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'xi-api-key': key(), 'Content-Type': 'application/json'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read(); return data if raw else json.loads(data or b'{}')
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')[:400]
            if e.code in (429, 500, 502, 503) and attempt < 3: time.sleep(2 + 4 * attempt); continue
            raise SystemExit(f'ElevenLabs {method} {path}: HTTP {e.code} {msg}')


def tts(voice, text, seed, model, out):
    body = {'text': text, 'model_id': model, 'language_code': 'ar', 'seed': seed, 'apply_text_normalization': 'off',
            'voice_settings': {'stability': 0.55, 'similarity_boost': 0.8, 'style': 0.25, 'speed': 0.9, 'use_speaker_boost': True}}
    audio = call('POST', f'/v1/text-to-speech/{voice}', body, {'output_format': 'mp3_44100_128'}, raw=True)
    open(out, 'wb').write(audio)


def polish(src, dst):
    """trim quiet margins (keeping ~120 ms), level to a classroom-friendly loudness, small mono mp3 like the rest.
    Returns False for an empty or broken take."""
    if not os.path.exists(src) or os.path.getsize(src) < 800: return False
    af = ('highpass=f=60,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,'
          'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.16,areverse,'
          'loudnorm=I=-16:TP=-1.5:LRA=11,adelay=60,apad=pad_dur=0.12')
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ar', '24000', '-ac', '1', '-b:a', '64k', dst], capture_output=True)
    return r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 800


MADD_SECONDS = 0.45      # a two-count madd at a calm teaching pace
SHORT_MAX = 0.30          # a short vowel longer than this starts to sound like a madd


def shape(text, path, check):
    """Make the clip say the vowel length the lesson teaches, and end cleanly:
    * cut where the voice stops (drops the breath many voices add) and fade out;
    * if the sound ends in a long vowel (بَا, بُو, بِي) stretch that vowel to two counts, pitch unchanged;
      if it ends in a short vowel that the voice dragged, tighten it.
    Drills (بَ بِ بُ) only get the clean ending."""
    import numpy as np
    y = check.pcm16k(path)
    if len(y) < 1600: return
    e = np.sqrt(np.convolve(y ** 2, np.ones(320) / 320, 'same'))
    loud = np.nonzero(e > e.max() * 0.08)[0]
    if not len(loud) or e.max() <= 1e-6: return                     # a silent take: the checker will reject it
    end = min(len(y), loud.max() + int(0.05 * 16000)) / 16000
    want = check.target(text)
    tempo = None; v0 = None
    if not check.is_drill(check.parts_of(text)) and want[-1] in check.LONG + 'َُِ':
        heard, _, times = check.hear(path)
        vi = [i for i, c in enumerate(heard) if c in 'َُِ']
        if vi:
            v0 = max(0.0, times[vi[-1]] - 0.04)
            cur = end - v0
            goal = MADD_SECONDS if want[-1] in check.LONG else min(cur, SHORT_MAX)
            if cur > 0.06 and abs(cur - goal) > 0.04: tempo = cur / goal
    tmp = path + '.shape.mp3'
    if tempo:
        stages, f = [], tempo
        while f < 0.5: stages.append(0.5); f /= 0.5
        while f > 2.0: stages.append(2.0); f /= 2.0
        stages.append(f)
        at = ','.join(f'atempo={x:.4f}' for x in stages)
        graph = (f'[0]asplit[x][y];[x]atrim=0:{v0:.3f},asetpts=PTS-STARTPTS[a];[y]atrim={v0:.3f}:{end:.3f},asetpts=PTS-STARTPTS,{at}[b];'
                 f'[a][b]concat=n=2:v=0:a=1,areverse,afade=t=in:d=0.06,areverse,apad=pad_dur=0.1[o]')
    else:
        graph = f'[0]atrim=0:{end:.3f},asetpts=PTS-STARTPTS,areverse,afade=t=in:d=0.06,areverse,apad=pad_dur=0.1[o]'
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-filter_complex', graph, '-map', '[o]', '-ar', '24000', '-ac', '1', '-b:a', '64k', tmp], capture_output=True)
    if r.returncode == 0 and os.path.getsize(tmp) > 800: os.replace(tmp, path)


def forms_for(text, check):
    """the texts sent for one sound, tried in turn: exact IPA, vowelled Arabic, IPA with a full stop, Arabic said
    to a child (with "!"). The checker decides which take is right, whatever form produced it."""
    parts = check.parts_of(text)
    if check.is_drill(parts):                                       # said one at a time: "ba, bi, bu"
        ipas = [to_ipa(check.target(p)) for p in parts]
        return ' '.join(ipas), [', '.join(f'/{x}/' for x in ipas), '، '.join(parts), ' ... '.join(f'/{x}/' for x in ipas), '، '.join(parts) + '!']
    ipa = to_ipa(check.target(text)); ar = check.tidy(text)
    return ipa, [f'/{ipa}/', ar, f'/{ipa}/.', ar + '!', f'/{ipa}/!', ar + '،', f'«{ar}»', f'/{ipa}/ ...']


def make(voice, text, check, takes=8, need=1, log=print):
    """Make takes of one sound until `need` pass the check (or `takes` run out). -> (best or None, all results)"""
    ipa, forms = forms_for(text, check)
    d = os.path.join(CACHE, voice); os.makedirs(d, exist_ok=True)
    results, best = [], None
    for n in range(takes):
        form, model = forms[n % len(forms)], MODELS[(n // len(forms)) % len(MODELS)]
        raw = os.path.join(d, f'{cid(text)}-{n}.raw.mp3'); fin = os.path.join(d, f'{cid(text)}-{n}.v2.mp3')
        if not os.path.exists(fin):
            if not os.path.exists(raw): tts(voice, form, 1000 + n, model, raw)    # raw takes are kept: no credit spent twice
            if not polish(raw, fin): log(f'   take {n} {model:10} {form:18} empty'); continue
            shape(text, fin, check)
        r = check.check(text, fin); r.pop('times', None); r.update(take=n, form=form, model=model, file=fin)
        results.append(r)
        log(f'   take {n} {model:10} {form:18} {r["verdict"]:5} heard {r["heard"]}')
        if r['verdict'] == 'ok' and (not best or r['conf'] > best['conf']): best = r
        if sum(x['verdict'] == 'ok' for x in results) >= need: break
    return best, results


# ---------------------------------------------------------------- commands
def cmd_voices(ids=None):
    """Arabic voices from the voice library, a sample of each saying real lesson sounds, and a page to choose."""
    import check
    found = call('GET', '/v1/shared-voices', query={'language': 'ar', 'page_size': 100, 'sort': 'trending'}).get('voices', [])
    if ids:                                                         # a chosen shortlist
        for vid in ids:
            if not any(v['voice_id'] == vid for v in found):
                found += call('GET', '/v1/shared-voices', query={'language': 'ar', 'page_size': 100, 'search': vid}).get('voices', [])
        good = [next(v for v in found if v['voice_id'] == vid) for vid in ids if any(v['voice_id'] == vid for v in found)]
    else:
        good = [v for v in found if not re.search(r'news|horror|asmr|villain|whisper', json.dumps(v).lower())][:8]
    pick_dir = os.path.join(ROOT, 'tools', 'voice-pick'); os.makedirs(pick_dir, exist_ok=True)
    sample = ['بَ بِ بُ', 'بَا', 'بُو', 'دْ', 'أَبْ', 'كِتَابٌ', 'مَدْرَسَة', 'جِيم']
    cards = []
    for v in good:
        vid = v['voice_id']
        try: call('POST', f"/v1/voices/add/{v['public_owner_id']}/{vid}", {'new_name': 'Qalam · ' + v.get('name', vid)[:40]})
        except SystemExit as e:
            if 'already' not in str(e).lower(): print('  (could not add', v.get('name'), str(e)[:160], ')')
        clips, score = [], 0
        print(v.get('name'), vid, flush=True)
        for i, t in enumerate(sample):
            best, res = make(vid, t, check, takes=8, log=lambda m: None)
            show = best or (res[0] if res else None)
            name = f'{vid}-{i}.mp3'
            if show: subprocess.run(['cp', show['file'], os.path.join(pick_dir, name)], check=True)
            score += bool(best)
            clips.append((t, name if show else '', bool(best), len(res)))
            print(f'   {t:10} {"✓" if best else "✗"} after {len(res)} takes', flush=True)
        cards.append((v, clips, score))
    cards.sort(key=lambda c: -c[2])
    html = ['<!doctype html><meta charset="utf-8"><title>Pick the Qalam voice</title><style>body{font:16px system-ui;margin:24px;max-width:960px}'
            '.v{border:2px solid #ddd;border-radius:14px;padding:12px 16px;margin:12px 0}.ar{font-size:26px;font-family:serif;display:inline-block;width:120px}'
            'code{background:#eee;padding:2px 6px;border-radius:6px}.row{display:flex;align-items:center;gap:10px;margin:4px 0}.bad{color:#c00}</style>'
            '<h1>Pick the teacher voice</h1><p>Each voice made up to 8 takes of every sound; ✓ means a take passed the strict pronunciation '
            'check (the clip shown is that take). Listen for warmth and clarity, then tell Claude which voice you like.</p>']
    for v, clips, score in cards:
        html.append(f"<div class=v><h3>{v.get('name')} · {score}/{len(sample)} correct</h3><p>{v.get('gender', '')} · {v.get('age', '').replace('_', ' ')} · {v.get('accent', '')} · <code>{v['voice_id']}</code></p>")
        for t, f, ok, n in clips:
            html.append(f"<div class=row><span class=ar>{t}</span>{'✓' if ok else '<span class=bad>✗ not right yet</span>'} "
                        + (f"<audio controls preload=none src='{f}'></audio>" if f else '') + '</div>')
        html.append('</div>')
    open(os.path.join(pick_dir, 'index.html'), 'w').write('\n'.join(html))
    print('\n'.join(f'{c[0].get("name")}: {c[2]}/{len(sample)}' for c in cards))
    print('open http://localhost:8765/tools/voice-pick/index.html')


def cmd_pick(vid):
    json.dump({'voice_id': vid}, open(VOICE_FILE, 'w'), indent=1); print('voice set:', vid)


BUDDY_DIR = {b: os.path.join(OUT, b) for b in ('zaid', 'huda')}
GAP = 0.35   # pause between the sounds of a drill (بَ ، بِ ، بُ)


def join(files, dst):
    """drills are joined from that voice's verified single sounds, with a short pause between"""
    args, parts = [], []
    for i, f in enumerate(files):
        args += ['-i', f]; parts.append(f'[{i}]aresample=24000,aformat=channel_layouts=mono[s{i}]')
    chain = ''.join(f'[s{i}]' + (f'[g{i}]' if i < len(files) - 1 else '') for i in range(len(files)))
    gaps = ''.join(f'aevalsrc=0:d={GAP}:s=24000[g{i}];' for i in range(len(files) - 1))
    graph = gaps + ';'.join(parts) + f';{chain}concat=n={2 * len(files) - 1}:v=0:a=1[o]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args, '-filter_complex', graph, '-map', '[o]', '-ar', '24000', '-ac', '1', '-b:a', '64k', dst], check=True)


def cmd_build(voices, only=None, takes=12, dry=False):
    """voices: {'zaid': voice_id, 'huda': voice_id}. Every non-Qur'an sound is made in both voices; the game
    plays the one matching the child's buddy (falling back to the other voice)."""
    import check
    items, man, src, silent = needed()
    singles, drills = [], []
    for t in items:
        if (src.get(t) or '').startswith('qari'): continue          # real recitation stays
        (drills if check.is_drill(check.parts_of(t)) else singles).append(t)
    for d_ in drills:                                               # every piece of a drill must exist on its own
        for p in check.parts_of(d_):
            if p not in singles: singles.append(p)
    if only: singles = [t for t in singles if t in only]; drills = [t for t in drills if t in only]
    print(f'{len(singles)} sounds + {len(drills)} drills, voices {voices}', flush=True)
    if dry:
        for t in singles: print(f'  {t:16} /{forms_for(t, check)[0]}/')
        return
    old = json.load(open(os.path.join(HERE, 'build.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'build.json')) else {}
    state = {b: dict(old.get(b, {})) for b in set(old) | set(voices)}   # buddy -> {text: info}; other voices kept
    report = []
    for buddy, vid in voices.items():
        os.makedirs(BUDDY_DIR[buddy], exist_ok=True)
        for t in singles:
            best, res = make(vid, t, check, takes=takes, log=lambda m: None)
            row = dict(buddy=buddy, text=t, ok=bool(best), tries=len(res), heard=(best or (res[0] if res else {})).get('heard', ''),
                       want=check.target(t), candidates=[r['file'] for r in res[:3]])
            report.append(row)
            if best:
                subprocess.run(['cp', best['file'], os.path.join(BUDDY_DIR[buddy], cid(t) + '.mp3')], check=True)
                state[buddy][t] = dict(id=cid(t), how=f"checked: heard {best['heard']}", take=best['take'], form=best['form'])
            else:
                state[buddy].pop(t, None)
            print(f"{buddy} {t:14} {'✓' if best else '✗'} {len(res)} takes  heard {row['heard']}", flush=True)
        for t in drills:
            pieces = check.parts_of(t)
            if all(p in state[buddy] for p in pieces):
                join([os.path.join(BUDDY_DIR[buddy], state[buddy][p]['id'] + '.mp3') for p in pieces], os.path.join(BUDDY_DIR[buddy], cid(t) + '.mp3'))
                state[buddy][t] = dict(id=cid(t), how='joined from checked sounds')
            else:
                state[buddy].pop(t, None)
            print(f"{buddy} {t:14} {'✓ joined' if t in state[buddy] else '✗ a piece is missing'}", flush=True)
        json.dump(state, open(os.path.join(HERE, 'build.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    write_manifest(state, man, src)
    json.dump(report, open(os.path.join(HERE, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    write_review()
    for b in voices:
        n = sum(1 for t in singles + drills if t in state[b]); print(f'{b}: {n}/{len(singles) + len(drills)} sounds ready')


def write_review(report=None):
    """Every sound a voice never got past the checker: copy its first takes next to the review page so they can be
    approved by ear (tools/audio-review.html → "Needs your ear"; `approve <buddy> <text> <take>` installs one).
    Worked out from tools/audio/build.json and the cached takes, so it covers both voices."""
    import glob
    import check
    state = json.load(open(os.path.join(HERE, 'build.json'), encoding='utf-8'))
    items, man, src, _ = needed()
    cand = os.path.join(ROOT, 'tools', 'voice-pick', 'cand'); os.makedirs(cand, exist_ok=True)
    out = []
    for buddy, vid in {'zaid': 'R6nda3uM038xEEKi7GFl', 'huda': 'w4LX7bK479eHGM1k15Em'}.items():
        for t in items:
            if (src.get(t) or '').startswith('qari') or t in state.get(buddy, {}): continue
            if check.is_drill(check.parts_of(t)): continue          # drills follow once their pieces are approved
            takes = sorted(glob.glob(os.path.join(CACHE, vid, f'{cid(t)}-*.v2.mp3')), key=lambda f: int(os.path.basename(f).split('-')[1].split('.')[0]))[:4]
            files = []
            for f in takes:
                n = os.path.basename(f).split('-')[1].split('.')[0]
                name = f'{buddy}-{cid(t)}-{n}.mp3'
                subprocess.run(['cp', f, os.path.join(cand, name)], check=True); files.append('voice-pick/cand/' + name)
            if files: out.append(dict(buddy=buddy, text=t, want=check.target(t), takes=files))
    with open(os.path.join(ROOT, 'tools', 'audio-needs-ear.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(len(out), 'sounds need your ear')


def cmd_approve(buddy, text, take):
    """install a take you approved by ear for a sound the checker could not confirm"""
    vid = {'zaid': 'R6nda3uM038xEEKi7GFl', 'huda': 'w4LX7bK479eHGM1k15Em'}[buddy]
    f = os.path.join(CACHE, vid, f'{cid(text)}-{take}.v2.mp3')
    os.makedirs(BUDDY_DIR[buddy], exist_ok=True)
    subprocess.run(['cp', f, os.path.join(BUDDY_DIR[buddy], cid(text) + '.mp3')], check=True)
    st = json.load(open(os.path.join(HERE, 'build.json'), encoding='utf-8'))
    st.setdefault(buddy, {})[text] = dict(id=cid(text), how='approved by ear', take=int(take))
    json.dump(st, open(os.path.join(HERE, 'build.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    _, man, src, _ = needed(); write_manifest(st, man, src); print('installed', buddy, text, 'take', take)
    import check
    for d_ in needed()[0]:                                          # drills whose pieces are now all there
        pieces = check.parts_of(d_)
        if check.is_drill(pieces) and d_ not in st[buddy] and all(p in st[buddy] for p in pieces):
            join([os.path.join(BUDDY_DIR[buddy], st[buddy][p]['id'] + '.mp3') for p in pieces], os.path.join(BUDDY_DIR[buddy], cid(d_) + '.mp3'))
            st[buddy][d_] = dict(id=cid(d_), how='joined from checked sounds'); print('  joined', d_)
    json.dump(st, open(os.path.join(HERE, 'build.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    write_manifest(st, man, src)


def write_manifest(state, man, src):
    """QQ_AUDIO keeps the Qur'an recitations; QQ_AUDIO_BUDDY has the teacher sounds per buddy voice."""
    quran = {k: v for k, v in man.items() if (src.get(k) or '').startswith('qari')}
    buddy = {b: {nfc(t): i['id'] for t, i in sorted(m.items())} for b, m in state.items()}
    with open(os.path.join(ROOT, 'js/audio-manifest.js'), 'w', encoding='utf-8') as f:
        f.write('/* generated by tools/audio/eleven.py: Qur\'an words = the qāriʾ\'s recitation (assets/audio);\n'
                ' * every other sound in the voice of the child\'s buddy (assets/audio/zaid, assets/audio/huda), each one checked */\n'
                'window.QQ_AUDIO = ' + json.dumps(quran, ensure_ascii=False, separators=(',', ':')) + ';\n'
                'window.QQ_AUDIO_BUDDY = ' + json.dumps(buddy, ensure_ascii=False, separators=(',', ':')) + ';\n')
    srcs = {k: v for k, v in src.items() if (v or '').startswith('qari')}
    for b, m in state.items():
        for t, i in m.items(): srcs.setdefault(t, {}) if False else None
    out = dict(srcs)
    for t in sorted({t for m in state.values() for t in m}):
        out[t] = ' · '.join(f"{b}: {state[b][t]['how']}" for b in state if t in state[b])
    json.dump(out, open(os.path.join(ROOT, 'tools/audio-sources.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    items = needed()[0]
    silent = sorted(t for t in items if t not in quran and not any(t in m for m in state.values()))
    json.dump(silent, open(os.path.join(ROOT, 'tools/audio-silent.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    takes = int(a[a.index('--takes') + 1]) if '--takes' in a else 12
    voices = dict(v.split('=') for v in a[a.index('--voices') + 1].split(',')) if '--voices' in a else \
        {'zaid': 'R6nda3uM038xEEKi7GFl', 'huda': 'w4LX7bK479eHGM1k15Em'}      # Anas for Zaid, Habibah for Huda
    sys.path.insert(0, HERE)
    {'voices': lambda: cmd_voices([x for x in a[1:] if not x.startswith('--')] or None), 'pick': lambda: cmd_pick(a[1]), 'build': lambda: cmd_build(voices, only, takes, '--dry' in a), 'approve': lambda: cmd_approve(a[1], a[2], a[3]), 'review': lambda: write_review()}[a[0]]()
