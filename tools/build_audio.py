"""Build every sound in the game.  Called by tools/make-audio.js.

Rule: a sound is only used if it is a HUMAN recording or a computer-voice take that passed an
automatic check.  Anything that cannot be verified is left silent (listed in tools/audio-silent.json)
rather than risk teaching a wrong sound.  No trimming, compression or loudness processing is applied
(that degraded the clips before) - only a plain volume change so clips play at a similar level.

  Qur'an words   - the qāriʾ's word-by-word recitation from Quran.com (exact match on letters and
                   vowels against Al-Fātiḥah and Juz ʿAmma).
  Letter names   - spoken form (bā, tā …); several spellings x voices are tried; a take is kept only
                   if speech recognition hears exactly that name.
  Syllables      - kept only if the vowel measures right (and ج measures as a real "j").
  Words          - the take speech recognition understands best (score >= 0.6).
  Spelled groups - (e.g. "كَاف تَا بَا") joined from verified pieces.
Human recordings made in tools/record.html (tools/human-recorded.json) are always kept.

Needs: pip install edge-tts gTTS faster-whisper praat-parselmouth, and ffmpeg.
"""
import asyncio, difflib, hashlib, json, os, re, subprocess, sys, unicodedata, urllib.request, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'assets', 'audio'); CACHE = os.path.join(HERE, '.audio-cache')
sys.path.insert(0, HERE)
from vowel_check import expected, vowel_ok, consonant_ok, vowel_onset   # noqa: E402
HUMAN_DIR = os.path.join(HERE, 'human-audio')

# Warm, expressive "teacher" voices (tried first): Microsoft's multilingual conversational voices.
# Measured on the game's own words/syllables: Brian with an exclamation ("كِتَاب!") at a gentle pace was
# both the liveliest (pitch variety 4.45 st vs 1.87 for the old Arabic voice) and the most accurate.
# A name ending in _x means the text is said with "!" for a warm, encouraging tone.
# ONE teacher voice for everything a child hears (letters, syllables, words): Brian, said with
# encouragement. Several deliveries of the same voice are tried (pace, exclamation) and the first that
# passes the accuracy check is kept, so the voice stays consistent while accuracy is preserved.
# ONE native Arabic teacher voice for everything a child hears (Hamed, Saudi): chosen by audition over 12
# Arabic voices — the liveliest, clear, and one of only three that say ج as a true "j" (measured). Letter names are said with the long vowel stretched like a teacher does.
# No other voices are mixed in (the user heard mixed voices as "the wrong person").
WARM = [('teach', 'ar-SA-HamedNeural', '-8%'), ('teach_s', 'ar-SA-HamedNeural', '-16%'), ('teach_f', 'ar-SA-HamedNeural', '+0%')]
NATIVE = []
VOWEL_REF = {'teach': 'ar-SA-HamedNeural', 'brian': 'ar-SA-HamedNeural', 'andrew': 'ar-SA-HamedNeural', 'hamed': 'ar-SA-HamedNeural'}   # others use Zariyah's
def vref(voice): return VOWEL_REF.get(voice[0].split('_')[0], 'ar-SA-ZariyahNeural')
VOICES = [('zariyah', 'ar-SA-ZariyahNeural', '-10%'), ('zariyah_slow', 'ar-SA-ZariyahNeural', '-30%'),
          ('hamed', 'ar-SA-HamedNeural', '-10%'), ('google', None, None)]
CHAPTERS = [1] + list(range(78, 115))

def nfc(t): return unicodedata.normalize('NFC', t).strip()
def cid(t): return hashlib.sha1(nfc(t).encode()).hexdigest()[:10]
def letters(t): return re.sub(r'[ً-ٰٟۖ-ۭـ\s]', '', t)
def plain(s):
    s = re.sub(r'[ً-ٰٟۖ-ۭـ]', '', unicodedata.normalize('NFKD', s))
    s = s.translate(str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي', 'ء': ''}))
    return re.sub(r'[^ء-ي]', '', s)
def qkey(s):
    s = nfc(s).replace('ۡ', 'ْ').replace('ٱ', 'ا')
    return re.sub(r'[ۖ-ۜ۞-۠ۥۦ۩-۬ـ]', '', s)

def ffmpeg(*a): subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *a], check=True)
def pcm(f):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)
def finish(src, dst):
    """Plain volume change to about -2 dBFS peak; nothing else."""
    peak = float(np.abs(pcm(src)).max() or 1e-6)
    ffmpeg('-i', src, '-af', f'volume={-3.5 - 20 * np.log10(peak):.2f}dB,alimiter=limit=0.8:level=false', '-ac', '1', '-b:a', '96k', dst)

def join_clips(files, dst, gap=.35):
    """Decode every piece, bring them to one format, and join them with short pauses."""
    args, chains, labels = [], [], []
    for i, f in enumerate(files):
        args += ['-i', f]
        chains.append(f'[{i}:a]aresample=24000,aformat=sample_fmts=fltp:channel_layouts=mono[a{i}]')
        labels.append(f'[a{i}]')
        if i < len(files) - 1:
            chains.append(f'anullsrc=r=24000:cl=mono,atrim=0:{gap},aformat=sample_fmts=fltp[g{i}]'); labels.append(f'[g{i}]')
    graph = ';'.join(chains) + ';' + ''.join(labels) + f'concat=n={len(labels)}:v=0:a=1[out]'
    ffmpeg(*args, '-filter_complex', graph, '-map', '[out]', '-ac', '1', '-b:a', '96k', dst)

# ---------- candidates ----------
async def tts(text, voice):
    name, vid, rate = voice
    if '_x' in name: text = text + '!'
    f = os.path.join(CACHE, f'{name}_{cid(text)}.mp3')
    if os.path.exists(f) and os.path.getsize(f) > 1500: return f
    for attempt in range(4):
        try:
            if name == 'google':
                from gtts import gTTS
                gTTS(text, lang='ar').save(f)
            else:
                import edge_tts
                await edge_tts.Communicate(text, vid, rate=rate).save(f)
            return f if os.path.getsize(f) > 1500 else None
        except Exception:
            await asyncio.sleep(1 + attempt)
    return None

_asr = None
def hear(f):
    global _asr
    if _asr is None:
        from faster_whisper import WhisperModel
        _asr = WhisperModel('small', device='cpu', compute_type='int8')
    segs, _ = _asr.transcribe(pcm(f), language='ar', beam_size=5)
    return ''.join(s.text for s in segs)

def quran_index():
    f = os.path.join(HERE, 'quran-words.json')
    if not os.path.exists(f):
        words = []
        for ch in CHAPTERS:
            req = urllib.request.Request(f'https://api.quran.com/api/v4/verses/by_chapter/{ch}?words=true&word_fields=text_uthmani,audio_url&per_page=300', headers={'User-Agent': 'QalamQuest/1.0'})
            for v in json.load(urllib.request.urlopen(req))['verses']:
                for w in v['words']:
                    if w['char_type_name'] == 'word' and w.get('audio_url'):
                        words.append({'key': v['verse_key'], 'pos': w['position'], 'text': w['text_uthmani'], 'audio': w['audio_url']})
            time.sleep(.2)
        json.dump(words, open(f, 'w'), ensure_ascii=False)
    idx = {}
    for w in json.load(open(f)): idx.setdefault(qkey(w['text']), w)
    return idx

def skeleton(s):
    """Consonants of a letter name as recognition writes it: long ā dropped (دَال ~ "دل")."""
    p = plain(s)
    return p[:1] + p[1:].replace('ا', '') if p else p

def name_heard(f, t):
    h = plain(hear(f))
    if not t.startswith('أ') and h.startswith('ا'): h = h[1:]
    return h == plain(t) or skeleton(h) == skeleton(t)

def name_variants(t):
    v = [t]
    if t.endswith('ا'): v += [t[:-1] + 'آ', t + 'ءْ', t + 'ءٌ']
    elif not t.endswith('ْ'): v += [t + 'ْ']
    return v

# ---------- human recordings (tools/human-audio) ----------
A_NAMES = {'ب', 'ت', 'ث', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك', 'ل', 'ه', 'و', 'ي'}   # names that begin consonant + ā
PURE_A = {'ب', 'ت', 'ث', 'ح', 'خ', 'ر', 'ط', 'ظ', 'ف', 'ه', 'ي'}                                            # names that are exactly "Xā"

def human_source(t, say_name):
    """(file, label) of a real person saying t, or (None, None)."""
    alpha = os.path.join(HUMAN_DIR, 'alphabet')
    for L, n in say_name.items():                       # a letter name
        if nfc(n) == t and os.path.exists(os.path.join(alpha, L + '.mp3')): return os.path.join(alpha, L + '.mp3'), 'human alphabet'
    cr = os.path.join(HUMAN_DIR, 'words', 'credits.json')
    if os.path.exists(cr):
        c = json.load(open(cr)).get(t)
        if c: return os.path.join(HUMAN_DIR, c['file']), 'human word (' + c['author'][:30] + ')'
    base = letters(t)                                   # بَ / بَا from the human letter name
    if len(base) in (1, 2) and base[0] in A_NAMES and t[1:2] == '\u064E' and not re.search(r'[\u064B-\u064D\u0650-\u0652]', t):
        src = os.path.join(alpha, base[0] + '.mp3')
        if len(base) == 2 and base[1] == 'ا' and base[0] in PURE_A: return src, 'human alphabet (long ā)'
        if len(base) == 1:
            on = vowel_onset(src)
            if on is not None:
                f = os.path.join(CACHE, 'hs_' + cid(t) + '.wav')
                ffmpeg('-i', src, '-t', f'{on + 0.14:.3f}', '-af', f'afade=t=out:st={on + 0.08:.3f}:d=0.06', f)
                return f, 'human alphabet (short)'
    return None, None

def long_form(t):
    """بُ -> بُو, بِ -> بِي, بَ -> بَا (one letter + one short vowel only)."""
    if len(letters(t)) != 1 or re.search(r'[\u064B-\u064D\u0652]', t): return None
    for mark, ext in (('\u064E', 'ا'), ('\u0650', 'ي'), ('\u064F', 'و')):
        if mark in t: return t + ext
    return None

# ---------- main ----------
async def main(job):
    data = json.load(open(job)); texts = [nfc(t) for t in data['texts']]; names = set(nfc(n) for n in data['names']); say_name = data.get('say_name', {})
    os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
    human = json.load(open(os.path.join(HERE, 'human-recorded.json'))) if os.path.exists(os.path.join(HERE, 'human-recorded.json')) else {}
    qidx = quran_index()
    chosen, how, silent = {}, {}, []

    def keep(t, src, label):
        dst = os.path.join(OUT, cid(t) + '.mp3'); finish(src, dst); chosen[t] = cid(t); how[t] = label

    singles = [t for t in texts if ' ' not in t]
    for t in singles:
        if t in human: chosen[t] = human[t]; how[t] = 'your recording'; continue
        # 1. Qur'an word -> the qāriʾ's recitation (authentic tartīl)
        q = qidx.get(qkey(t))
        if q:
            f = os.path.join(CACHE, 'q_' + os.path.basename(q['audio']))
            if not os.path.exists(f):
                req = urllib.request.Request('https://audio.qurancdn.com/' + q['audio'], headers={'User-Agent': 'QalamQuest/1.0'})
                open(f, 'wb').write(urllib.request.urlopen(req).read())
            keep(t, f, f"qari {q['key']}:{q['pos']}"); continue
        # 2. letter name -> the teacher voice, heard as exactly that name (spelling variants too)
        if t in names:
            stretched = re.sub(r'([اوي])', r'\1\1', t, count=1)
            for voice in WARM:                                        # prefer a take speech recognition also confirms
                f = await tts(stretched, voice)
                if f and name_heard(f, t) and consonant_ok(f, t): keep(t, f, f'{voice[0]} stretched (teacher, verified)'); break
            if t in chosen: continue
            f = await tts(stretched, WARM[0])                         # native speaker: trusted for letters ASR can't judge
            if f and consonant_ok(f, t): keep(t, f, f'{WARM[0][0]} stretched (teacher, native)'); continue
            for voices in (WARM, NATIVE):
                for variant in name_variants(t):
                    for voice in voices:
                        f = await tts(variant, voice)
                        if f and name_heard(f, t): keep(t, f, f'{voice[0]} "{variant}" (teacher, verified)'); break
                    if t in chosen: break
                if t in chosen: break
            if t not in chosen: silent.append(t)
            continue
        # 3. short syllable -> the teacher voice; vowel (and ج) must measure right
        if len(letters(t)) <= 2 and expected(t):
            for voice in WARM + NATIVE:
                f = await tts(t, voice)
                if f and vowel_ok(f, t, vref(voice)) and consonant_ok(f, t): keep(t, f, voice[0] + ' (teacher, vowel verified)'); break
            if t not in chosen:                                        # voices slur a lone short vowel: say the long
                lf = long_form(t)                                      # vowel clearly (بُو), trim it to a short beat
                for voice in (WARM if lf else []):
                    f = await tts(lf, voice)
                    if not (f and vowel_ok(f, lf, vref(voice)) and consonant_ok(f, t)): continue
                    on = vowel_onset(f)
                    if on is None: continue
                    short = os.path.join(CACHE, 'short_' + cid(t) + '.mp3')
                    ffmpeg('-i', f, '-t', f'{on + .17:.3f}', '-af', f'afade=t=out:st={on + .1:.3f}:d=0.07', '-ac', '1', short)
                    if vowel_ok(short, lf, vref(voice)): keep(t, short, voice[0] + ' (teacher, long vowel trimmed, verified)'); break
            if t not in chosen: silent.append(t)
            continue
        # 4. word -> the teacher voice, clearly understood
        best = (0, None, None)
        for voice in WARM + NATIVE:
            f = await tts(t, voice)
            if not f: continue
            sc = difflib.SequenceMatcher(None, plain(t), plain(hear(f))).ratio()
            if sc > best[0]: best = (sc, f, voice[0])
            if sc >= 0.75: break
        if best[0] >= 0.4: keep(t, best[1], f'{best[2]} (teacher, heard {best[0]:.2f})')
        else: silent.append(t)

    # 5. spelled/syllable groups -> join verified pieces
    for t in [t for t in texts if ' ' in t]:
        if t in human: chosen[t] = human[t]; how[t] = 'your recording'; continue
        parts = t.split()
        if all(p in chosen for p in parts) and all(p in names or len(letters(p)) <= 2 for p in parts):
            # prefer groups made only of human pieces; computer-voice pieces are still verified ones
            tmp = os.path.join(CACHE, 'joined.mp3'); join_clips([os.path.join(OUT, chosen[p] + '.mp3') for p in parts], tmp)
            keep(t, tmp, 'joined from verified pieces')
        else:
            silent.append(t)   # Qur'an phrases whose tajwīd links words can't be built from separate words

    used = set(chosen.values())
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f[:-4] not in used: os.remove(os.path.join(OUT, f))
    with open(os.path.join(ROOT, 'js', 'audio-manifest.js'), 'w', encoding='utf-8') as fh:
        fh.write('/* generated by tools/make-audio.js */\nwindow.QQ_AUDIO = ' + json.dumps(chosen, ensure_ascii=False, separators=(',', ':')) + ';\n')
    json.dump(sorted(silent), open(os.path.join(HERE, 'audio-silent.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(how, open(os.path.join(HERE, 'audio-sources.json'), 'w'), ensure_ascii=False, indent=1)
    kinds = {}
    for v in how.values(): k = v.split()[0]; kinds[k] = kinds.get(k, 0) + 1
    print(f'{len(chosen)} sounds, {len(silent)} silent. Sources: {kinds}')

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1]))
