"""Rebuild Qalam's teaching audio with ElevenLabs, keeping only takes that pass the strict check.

Why: a computer voice reading a lone بَ or دْ guesses (letter name, extra vowel, lost sukūn). Here every sound is
asked for by its exact pronunciation (IPA between slashes, which Eleven v4/v3 read) as well as in vowelled Arabic,
several takes are made, and tools/audio/check.py keeps only a take whose heard consonants, vowels and madd match
the target. Qur'an words keep the qāriʾ's recitation. Anything that never passes stays silent and is listed.

Setup (once):
  1. ElevenLabs account (Starter plan or higher: library voices need a paid plan for the API)
  2. put ELEVENLABS_API_KEY=... in a file named .env in the project folder (git-ignored)
  3. python3 -m venv tools/.audio-cache/venv && tools/.audio-cache/venv/bin/pip install -r tools/audio/requirements.txt
Run with tools/.audio-cache/venv/bin/python:
  tools/audio/eleven.py voices            find Arabic teacher voices, make samples, write tools/voice-pick/index.html
  tools/audio/eleven.py pick VOICE_ID     choose the voice (saved in tools/audio/voice.json)
  tools/audio/eleven.py build [--only a,b] [--takes 6] [--dry]   generate, check and install every sound
"""
import hashlib, json, os, re, subprocess, sys, tempfile, time, unicodedata, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'assets', 'audio')
CACHE = os.path.join(ROOT, 'tools', '.audio-cache', 'eleven')
VOICE_FILE = os.path.join(HERE, 'voice.json')
API = 'https://api.elevenlabs.io'
MODELS = ['eleven_v4', 'eleven_v3']

# ---------------------------------------------------------------- the sounds the game needs
def nfc(t): return unicodedata.normalize('NFC', t).strip()
def cid(t): return hashlib.sha1(nfc(t).encode()).hexdigest()[:10]          # same ids as make-audio.js / app.js


def read_json_js(path):
    s = open(path, encoding='utf-8').read(); return json.loads(s[s.index('{'):s.rindex('}') + 1])


def needed():
    man = read_json_js(os.path.join(ROOT, 'js/audio-manifest.js'))
    silent = json.load(open(os.path.join(ROOT, 'tools/audio-silent.json'), encoding='utf-8'))
    src = json.load(open(os.path.join(ROOT, 'tools/audio-sources.json'), encoding='utf-8'))
    items = list(dict.fromkeys(list(man) + list(silent)))
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
    """trim quiet margins (keeping 120 ms), level to a classroom-friendly loudness, small mono mp3 like the rest"""
    af = ('highpass=f=60,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,'
          'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.16,areverse,'
          'loudnorm=I=-16:TP=-1.5:LRA=11,adelay=60,apad=pad_dur=0.12')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ar', '24000', '-ac', '1', '-b:a', '64k', dst], check=True)


# ---------------------------------------------------------------- commands
def cmd_voices():
    """Arabic voices from the voice library, a sample of each saying real lesson sounds, and a page to choose."""
    import check
    found = call('GET', '/v1/shared-voices', query={'language': 'ar', 'page_size': 40, 'sort': 'trending'}).get('voices', [])
    good = [v for v in found if not re.search(r'news|horror|asmr|villain|whisper', json.dumps(v).lower())][:8]
    pick_dir = os.path.join(ROOT, 'tools', 'voice-pick'); os.makedirs(pick_dir, exist_ok=True)
    sample = ['بَ بِ بُ', 'بَا', 'دْ', 'كِتَابٌ']
    cards = []
    for v in good:
        vid = v['voice_id']
        try: call('POST', f"/v1/voices/add/{v['public_owner_id']}/{vid}", {'new_name': 'Qalam · ' + v.get('name', vid)})
        except SystemExit as e: print('  (could not add', v.get('name'), str(e)[:120], ')')
        clips = []
        for i, t in enumerate(sample):
            raw = os.path.join(pick_dir, f'{vid}-{i}.raw.mp3'); fin = os.path.join(pick_dir, f'{vid}-{i}.mp3')
            tts(vid, f'/{to_ipa(check.target(t))}/', 1, MODELS[0], raw); polish(raw, fin); os.remove(raw)
            clips.append((t, os.path.basename(fin), check.check(t, fin)['verdict']))
        cards.append((v, clips))
        print(v.get('name'), vid, [c[2] for c in clips])
    html = ['<!doctype html><meta charset="utf-8"><title>Pick the Qalam voice</title><style>body{font:16px system-ui;margin:24px;max-width:900px}'
            '.v{border:2px solid #ddd;border-radius:14px;padding:12px 16px;margin:12px 0}.ar{font-size:26px;font-family:serif}'
            'code{background:#eee;padding:2px 6px;border-radius:6px}</style><h1>Pick the teacher voice</h1>'
            '<p>Listen, then tell Claude the voice id you like (or run <code>tools/audio/eleven.py pick ID</code>). ✓ = passed the pronunciation check.</p>']
    for v, clips in cards:
        html.append(f"<div class=v><b>{v.get('name')}</b> · {v.get('gender', '')} {v.get('age', '')} {v.get('accent', '')} · <code>{v['voice_id']}</code><br>")
        html += [f"<span class=ar>{t}</span> {'✓' if ok == 'ok' else '✗'} <audio controls src='{f}'></audio><br>" for t, f, ok in clips]
        html.append('</div>')
    open(os.path.join(pick_dir, 'index.html'), 'w').write('\n'.join(html))
    print('open tools/voice-pick/index.html')


def cmd_pick(vid):
    json.dump({'voice_id': vid}, open(VOICE_FILE, 'w'), indent=1); print('voice set:', vid)


def cmd_build(only=None, takes=6, dry=False):
    import check
    items, man, src, silent = needed()
    voice = json.load(open(VOICE_FILE))['voice_id'] if os.path.exists(VOICE_FILE) else None
    if not voice and not dry: sys.exit('choose a voice first: tools/audio/eleven.py voices, then pick VOICE_ID')
    os.makedirs(CACHE, exist_ok=True)
    report, new_silent = [], []
    for text in items:
        if only and text not in only: continue
        if (src.get(text) or '').startswith('qari'):            # real recitation stays
            continue
        want = check.target(text); ipa = to_ipa(want)
        parts = check.parts_of(text)
        if check.is_drill(parts):                                   # said one at a time: "ba, bi, bu"
            ipas = [to_ipa(check.target(p)) for p in parts]; ipa = ' '.join(ipas)
            forms = [', '.join(f'/{x}/' for x in ipas), '، '.join(parts), ' ... '.join(f'/{x}/' for x in ipas)]
        else:
            forms = [f'/{ipa}/', check.tidy(text), f'/{ipa}/.']
        print(f'{text:16} /{ipa}/', flush=True)
        if dry: continue
        best = None
        for n in range(takes):
            form, model = forms[n % len(forms)], MODELS[(n // len(forms)) % len(MODELS)]
            raw = os.path.join(CACHE, f'{cid(text)}-{n}.raw.mp3'); fin = os.path.join(CACHE, f'{cid(text)}-{n}.mp3')
            if not os.path.exists(fin):
                tts(voice, form, 1000 + n, model, raw); polish(raw, fin)
            r = check.check(text, fin); r.update(take=n, form=form, model=model, file=fin)
            print(f'   take {n} {model:10} {form:18} {r["verdict"]:5} heard {r["heard"]}', flush=True)
            if r['verdict'] == 'ok' and (not best or best['verdict'] != 'ok' or r['conf'] > best['conf']): best = r
            if best and best['verdict'] == 'ok' and n >= 2: break
        report.append(dict(text=text, ipa=ipa, **{k: v for k, v in (best or {}).items() if k != 'file'}))
        if best and best['verdict'] == 'ok':
            subprocess.run(['cp', best['file'], os.path.join(OUT, cid(text) + '.mp3')], check=True)
            man[nfc(text)] = cid(text)
            src[text] = f"eleven {voice[:8]} take {best['take']} (checked: heard {best['heard']})"
        else:
            man.pop(nfc(text), None); src.pop(text, None); new_silent.append(text)
            print('   ✗ no take passed — left silent for review', flush=True)
    if dry: return
    with open(os.path.join(ROOT, 'js/audio-manifest.js'), 'w', encoding='utf-8') as f:
        f.write('/* generated by tools/make-audio.js + tools/audio/eleven.py */\nwindow.QQ_AUDIO = '
                + json.dumps(man, ensure_ascii=False, separators=(',', ':')) + ';\n')
    json.dump(src, open(os.path.join(ROOT, 'tools/audio-sources.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    keep_silent = [t for t in silent if t not in man]
    json.dump(sorted(set(keep_silent + new_silent)), open(os.path.join(ROOT, 'tools/audio-silent.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(report, open(os.path.join(ROOT, 'tools/audio/report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = sum(1 for r in report if r.get('verdict') == 'ok')
    print(f'\n{ok}/{len(report)} sounds passed; {len(report) - ok} left silent (see tools/audio/report.json)')


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    takes = int(a[a.index('--takes') + 1]) if '--takes' in a else 6
    sys.path.insert(0, HERE)
    {'voices': cmd_voices, 'pick': lambda: cmd_pick(a[1]), 'build': lambda: cmd_build(only, takes, '--dry' in a)}[a[0]]()
