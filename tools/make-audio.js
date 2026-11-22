// Lists every Arabic string the game can speak, then hands them to tools/build_audio.py,
// which records them (human Qur'an recitation where possible, otherwise verified voice takes)
// into assets/audio/*.mp3 and writes js/audio-manifest.js.
// Run:  pip install edge-tts gTTS faster-whisper praat-parselmouth  &&  node tools/make-audio.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/content.js'), 'utf8'), { window: win, Math });
const C = win.QQ_CONTENT;
const AR = /[ء-يٱ]/;
const key = (t) => String(t).normalize('NFC').trim();   // same as audioKey() in js/app.js
// Same rule as sayable() in js/app.js.
const NAMES = C.SAY_NAME;
const FULL = Object.fromEntries(Object.entries(C.L).map(([k, v]) => [String(v.ar).normalize('NFC'), NAMES[k]]));
const sayable = (t) => {
  const k = String(t || '').trim();
  if (!k || /[A-Za-z]/.test(k) || k.startsWith('ـ')) return null;
  if (NAMES[k]) return NAMES[k];
  if (FULL[k]) return FULL[k];
  const parts = k.split(/\s+/);
  if (parts.length > 1 && parts.every((p) => NAMES[p])) return parts.map((p) => NAMES[p]).join(' ');
  return k;
};
const texts = new Set();
const add = (t) => { t = sayable(t); if (t && AR.test(t) && t.split(' ').length <= 4) texts.add(key(t)); };
Object.values(NAMES).forEach(add);
for (let run = 0; run < 120; run++) for (const u of C.UNITS) for (const l of u.lessons) for (const e of l.steps()) {
  if (e.type === 'teach') { add(e.say); if (!e.say) add(e.bigQ); }
  if (e.type === 'mcq' || e.type === 'listen') { add(e.say); add(e.big); e.options.forEach(add); }
  if (e.type === 'match') e.pairs.forEach((p) => add(p[0]));
  if (e.type === 'sort') e.items.forEach((i) => add(i.t));
  if (e.type === 'build') { e.tiles.forEach(add); add(e.target.join('')); }
}
const job = path.join(__dirname, '.audio-job.json');
fs.writeFileSync(job, JSON.stringify({ texts: [...texts].sort(), names: Object.values(NAMES).map(key) }));
execFileSync('python3', [path.join(__dirname, 'build_audio.py'), job], { stdio: 'inherit' });
fs.unlinkSync(job);
