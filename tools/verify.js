// Checks every Qur'an string in the game against the saved Uthmani source
// (Tanzil text via api.alquran.cloud, edition quran-uthmani).
// Run: node tools/verify.js
const fs = require('fs'), path = require('path'), vm = require('vm');

// Compare in Unicode NFC: mark order (e.g. shadda+fatha vs fatha+shadda) is canonically equivalent.
const N = (t) => String(t).normalize('NFC');
const dir = path.join(__dirname, 'quran-source');
const BISM = N('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ');
const src = {};
for (const f of fs.readdirSync(dir)) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f))).data;
  const add = (s, a, t) => {
    t = N(t.replace(/^﻿/, ''));
    // the API prefixes verse 1 of each surah (except Al-Fatiha) with the basmala; it is not part of the verse
    if (s !== 1 && a === 1 && t.startsWith(BISM)) t = t.slice(BISM.length);
    src[`${s}:${a}`] = t;
  };
  if (d.ayahs) d.ayahs.forEach((a) => add(d.number, a.numberInSurah, a.text));
  else add(d.surah.number, d.numberInSurah, d.text);
}

const win = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/content.js'), 'utf8'), { window: win, Math });
const C = win.QQ_CONTENT;

let errors = 0, checks = 0;
const seen = new Set();
const fail = (m) => { if (seen.has(m)) return; seen.add(m); errors++; console.log('✗', m); };
// Arabic in prompts that is explanation, not a Qur'an quote
const NOT_QUOTES = new Set(['ال', 'عَبْد']);

// 1. every verse matches the source exactly
for (const [k, t] of Object.entries(C.AYAH)) {
  checks++;
  if (src[k] !== N(t)) fail(`AYAH ${k} does not match source:\n   game:   ${t}\n   source: ${src[k]}`);
}

const keyOf = (ref) => (ref ? ref.match(/(\d+:\d+)$/)[1] : null);
const arTokens = (s) => (String(s || '').match(/[؀-ۿً-ٰٟۖ-ۭ]+/g) || [])
  .filter((w) => /[ء-يٱ]/.test(w) && !w.startsWith('ـ') && !NOT_QUOTES.has(w));
const inAyah = (k, s) => {
  checks++;
  if (!C.AYAH[k]) return fail(`unknown ayah ${k}`);
  if (!N(C.AYAH[k]).includes(N(s))) fail(`“${s}” not found in ${k}: ${C.AYAH[k]}`);
};

// 2. every exercise that cites a verse quotes it exactly (25 random runs to cover shuffles)
for (let run = 0; run < 25; run++) for (const u of C.UNITS) for (const l of u.lessons) for (const e of l.steps()) {
  if (e.type === 'tap') {
    checks++;
    const ok = e.byIndex ? e.answers.every((i) => e.words[i]) : e.answers.every((a) => e.words.includes(a));
    if (!ok) fail(`${l.id} tap answers ${e.answers} not in ${e.k}`);
  }
  if (e.type === 'sort') e.items.forEach((it) => { if (it.k) inAyah(it.k, it.t); });
  const k = keyOf(e.quranRef);
  if (k) {
    if (e.bigQ) inAyah(k, e.bigQ);
    arTokens(e.prompt).forEach((w) => inAyah(k, w));
    if (e.type === 'mcq' && !e.correct.startsWith('ـ') && e.options.every((o) => /[؀-ۿ]/.test(o)) && !/ /.test(e.correct) && e.correct.length > 3) inAyah(k, e.correct);
  }
  if (e.type === 'teach' && e.ayah) inAyah(e.ayah, C.AYAH[e.ayah]);
  if (e.type === 'mcq' || e.type === 'listen') {
    checks++;
    if (!e.options.includes(e.correct) || new Set(e.options).size !== e.options.length) fail(`${l.id} bad options: ${e.options}`);
  }
}

// 3. word banks
for (const w of [...C.SUN_WORDS, ...C.MOON_WORDS, ...C.ISM, ...C.FIL, ...C.HARF]) inAyah(w.k, w.t);

// 4. sun/moon classification: the letter right after ٱل
for (const w of C.SUN_WORDS) { checks++; if (!C.SUN.includes(w.t[2])) fail(`${w.t} is not a sun-letter word`); }
for (const w of C.MOON_WORDS) {
  checks++;
  const ch = w.t[2] === 'ْ' ? w.t[3] : w.t[2];
  if (!C.MOON.includes(ch === 'أ' ? 'ء' : ch)) fail(`${w.t} is not a moon-letter word (${ch})`);
}

console.log(errors ? `\n${errors} problem(s) in ${checks} checks` : `✓ All ${checks} Qur’an & content checks passed`);
process.exit(errors ? 1 : 0);
