// Every Arabic text the game can say, worked out from the lessons themselves (same rules as sayable() in
// js/app.js), merged into tools/audio/sounds.json, the list tools/audio/eleven.py builds.  node tools/audio/list-sounds.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/content.js'), 'utf8'), { window: win, Math });
const C = win.QQ_CONTENT, AR = /[ء-يٱ]/, key = (t) => String(t).normalize('NFC').trim();
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
for (let run = 0; run < 150; run++) for (const u of C.UNITS) for (const l of u.lessons) for (const e of l.steps()) {
  if (e.type === 'teach') { add(e.say); if (!e.say) add(e.bigQ); }
  if (e.type === 'mcq' || e.type === 'listen') { add(e.say); add(e.big); (e.options || []).forEach(add); }
  if (e.type === 'match') e.pairs.forEach((p) => add(p[0]));
  if (e.type === 'sort') e.items.forEach((i) => add(i.t));
  if (e.type === 'build') { e.tiles.forEach(add); add(e.target.join('')); }
}
const file = path.join(__dirname, 'sounds.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
const all = [...new Set([...old, ...[...texts].sort()])];
fs.writeFileSync(file, JSON.stringify(all, null, 0).replace(/","/g, '",\n"'));
console.log(`${texts.size} texts in the lessons; ${all.length - old.length} new; ${all.length} in sounds.json`);
console.log('new:', all.filter((t) => !old.includes(t)).join(' | '));
