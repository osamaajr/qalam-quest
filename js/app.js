/* Qalam Quest — game engine v2 */
(function () {
  'use strict';
  const C = window.QQ_CONTENT;
  const M = window.QQ_MASCOT;
  const $app = document.getElementById('app');
  const AR_RE = /[؀-ۿ]/;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = (s) => esc(s).replace(/([؀-ۿ][؀-ۿً-ٰٟۖ-ۭ\s]*[؀-ۿً-ٰٟۖ-ۭ]|[؀-ۿ])/g, (m) => `<span class="${/[ٱ۟-ٰۭ]/.test(m) ? 'qr' : 'ar'}">${m}</span>`);
  const isQ = (s) => /[ٱ۟-ۭ]/.test(s);
  const IMG = (n, cls = '') => `<img class="ico ${cls}" src="assets/icons/${n}.png" alt="" draggable="false">`;
  let uid = 0;

  // ======================= STATE =======================
  const KEY = 'qalamquest.v1';
  const MAX_HEARTS = 5, HEART_MS = 20 * 60 * 1000;
  const FREEZE_COST = 50, REFILL_COST = 30, MAX_FREEZES = 2;
  const fresh = () => ({
    v: 2, onboarded: false, toured: false, buddy: 'huda', name: '', dailyGoal: 20, level: 0,
    xp: 0, gems: 20, hearts: MAX_HEARTS, heartsAt: Date.now(),
    streak: 0, bestStreak: 0, lastDay: null, freezes: 1, frozenDays: [],
    history: {}, done: {}, chests: [], badges: [], quests: null, joined: Date.now(),
    settings: { sound: true, tts: true, classMode: false, unlockAll: false, theme: 'auto' },
    stats: { lessons: 0, perfect: 0, correct: 0, answered: 0, bestCombo: 0 },
  });
  let S;
  function load() {
    try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); S.settings = Object.assign(fresh().settings, S.settings); S.stats = Object.assign(fresh().stats, S.stats); }
    catch (e) { S = fresh(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } }

  const dayStr = (d) => { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const today = () => dayStr();
  const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
  const addDays = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return dayStr(d); };

  function tickHearts() {
    if (S.hearts >= MAX_HEARTS) { S.heartsAt = Date.now(); return; }
    const gained = Math.floor((Date.now() - S.heartsAt) / HEART_MS);
    if (gained > 0) { S.hearts = Math.min(MAX_HEARTS, S.hearts + gained); S.heartsAt += gained * HEART_MS; }
  }
  function checkStreak() {
    if (!S.lastDay || S.streak === 0) return null;
    const gap = dayDiff(S.lastDay, today());
    if (gap <= 1) return null;
    const missed = gap - 1;
    if (S.freezes >= missed) {
      for (let i = 1; i <= missed; i++) S.frozenDays.push(addDays(S.lastDay, i));
      S.freezes -= missed; S.lastDay = addDays(today(), -1);
      return { type: 'frozen', n: missed };
    }
    const lost = S.streak; S.streak = 0;
    return { type: 'reset', lost };
  }

  // ======================= QUESTS & BADGES =======================
  const QUEST_POOL = [
    { id: 'lessons2', icon: 'books', label: 'Complete 2 lessons', n: 2, m: 'lessons' },
    { id: 'combo5', icon: 'bolt', label: 'Get 5 answers in a row', n: 5, m: 'combo' },
    { id: 'acc90', icon: 'target', label: 'Score 90% or more in a lesson', n: 1, m: 'acc90' },
    { id: 'perfect', icon: 'hundred', label: 'Finish a lesson with no mistakes', n: 1, m: 'perfect' },
    { id: 'combo8', icon: 'fire', label: 'Get 8 answers in a row', n: 8, m: 'combo' },
    { id: 'lessons3', icon: 'rocket', label: 'Complete 3 lessons', n: 3, m: 'lessons' },
  ];
  function ensureQuests() {
    if (S.quests && S.quests.day === today()) return;
    const seed = today().split('-').reduce((a, b) => a * 31 + +b, 7);
    const pool = QUEST_POOL.slice(); const picks = [];
    let x = seed; while (picks.length < 2) { x = (x * 9301 + 49297) % 233280; picks.push(pool.splice(x % pool.length, 1)[0]); }
    S.quests = { day: today(), claimedChest: false, list: [{ id: 'goal', icon: 'glowing-star', label: `Earn ${S.dailyGoal} XP`, n: S.dailyGoal, m: 'xp', p: 0 }, ...picks.map((q) => ({ ...q, p: 0 }))] };
  }
  function bumpQuests(r) {
    ensureQuests(); const done = [];
    S.quests.list.forEach((q) => {
      if (q.p >= q.n) return;
      if (q.m === 'xp') q.p += r.xp;
      if (q.m === 'lessons') q.p += 1;
      if (q.m === 'combo') q.p = Math.max(q.p, r.bestCombo);
      if (q.m === 'acc90' && r.acc >= 90) q.p += 1;
      if (q.m === 'perfect' && r.mistakes === 0) q.p += 1;
      q.p = Math.min(q.p, q.n);
      if (q.p >= q.n) { done.push(q); S.gems += 10; }
    });
    return done;
  }
  const UNIT_BADGE = [['books', 'Letter Legend'], ['notes', 'Vowel Voyager'], ['thread', 'Stretch Star'], ['stop', 'Stop & Double'], ['sun', 'Sun & Moon'], ['nose', 'Tajwīd Hero'], ['magnifier', 'Word Detective']];
  const BADGES = [
    { id: 'first', icon: 'seedling', name: 'First Steps', desc: 'Finish your first lesson', test: () => S.stats.lessons >= 1 },
    ...C.UNITS.map((u, i) => ({ id: 'unit-' + u.id, icon: UNIT_BADGE[i][0], name: UNIT_BADGE[i][1], desc: `Finish Unit ${i + 1}`, test: () => u.lessons.every((l) => S.done[l.id]) })),
    { id: 'streak3', icon: 'fire', name: 'On Fire', desc: 'Reach a 3-day streak', test: () => S.bestStreak >= 3 },
    { id: 'streak7', icon: 'medal', name: 'Week Warrior', desc: 'Reach a 7-day streak', test: () => S.bestStreak >= 7 },
    { id: 'perfect3', icon: 'hundred', name: 'Perfectionist', desc: '3 perfect lessons', test: () => S.stats.perfect >= 3 },
    { id: 'combo10', icon: 'bolt', name: 'Lightning', desc: '10 right in a row', test: () => S.stats.bestCombo >= 10 },
    { id: 'xp500', icon: 'gem', name: 'XP Explorer', desc: 'Earn 500 XP', test: () => S.xp >= 500 },
  ];
  function newBadges() { const n = BADGES.filter((b) => !S.badges.includes(b.id) && b.test()); n.forEach((b) => S.badges.push(b.id)); return n; }

  // ======================= SOUND EFFECTS =======================
  const Sfx = {
    ctx: null,
    ensure() { if (!this.ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) this.ctx = new A(); } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
    tone(f, t, d, type = 'sine', g = 0.18, f2) {
      const c = this.ctx; const o = c.createOscillator(); const v = c.createGain(); const s = c.currentTime + t;
      o.type = type; o.frequency.setValueAtTime(f, s); if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + d);
      v.gain.setValueAtTime(0.0001, s); v.gain.exponentialRampToValueAtTime(g, s + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, s + d);
      o.connect(v).connect(c.destination); o.start(s); o.stop(s + d + 0.05);
    },
    play(name, n) {
      if (!S.settings.sound || !this.ensure()) return;
      const T = (...a) => this.tone(...a);
      switch (name) {
        case 'tap': T(1100, 0, 0.05, 'triangle', 0.07, 900); break;
        case 'select': T(520, 0, 0.08, 'sine', 0.12, 780); break;
        case 'correct': T(659, 0, 0.12, 'triangle', 0.2); T(988, 0.09, 0.28, 'triangle', 0.2); T(1976, 0.09, 0.2, 'sine', 0.05); break;
        case 'wrong': T(311, 0, 0.14, 'square', 0.06, 280); T(233, 0.12, 0.28, 'square', 0.06, 200); break;
        case 'match': T(880 * Math.pow(1.06, n || 0), 0, 0.12, 'triangle', 0.15); T(1320 * Math.pow(1.06, n || 0), 0.05, 0.14, 'sine', 0.06); break;
        case 'soft-wrong': T(260, 0, 0.16, 'triangle', 0.1, 200); break;
        case 'combo': [784, 988, 1175, 1568].forEach((f, i) => T(f, i * 0.06, 0.16, 'triangle', 0.14)); break;
        case 'complete': [523, 659, 784, 1047].forEach((f, i) => T(f, i * 0.11, 0.25, 'triangle', 0.18)); T(1568, 0.48, 0.6, 'sine', 0.08); T(2093, 0.52, 0.6, 'sine', 0.05); break;
        case 'tick': T(1400, 0, 0.03, 'sine', 0.05); break;
        case 'streak': T(220, 0, 0.5, 'sawtooth', 0.04, 880); [659, 831, 988].forEach((f) => T(f, 0.45, 0.7, 'triangle', 0.12)); break;
        case 'chest': T(392, 0, 0.1, 'square', 0.05); T(392, 0.15, 0.1, 'square', 0.05); [784, 1047, 1319, 1568, 2093].forEach((f, i) => T(f, 0.5 + i * 0.07, 0.3, 'triangle', 0.12)); break;
        case 'heart': T(523, 0, 0.12, 'sine', 0.14, 392); break;
        case 'pop': T(300, 0, 0.09, 'sine', 0.16, 900); break;
        case 'whoosh': T(200, 0, 0.25, 'sine', 0.06, 900); break;
        case 'badge': [523, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, i * 0.08, 0.25, 'triangle', 0.13)); break;
      }
    },
  };
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* noop */ } };

  // ======================= READ ALOUD =======================
  // Recorded clips (assets/audio, made by tools/make-audio.js) work everywhere; the
  // browser's own Arabic voice is only a fallback for anything without a clip.
  const AUDIO = window.QQ_AUDIO || {};
  const audioKey = (t) => String(t).normalize('NFC').trim();
  // Only ever our recorded natural-voice clips — never the browser's robotic built-in voice.
  let curAudio = null;
  // A lone letter is spoken by its name (ت → تَاء), which is how children learn it.
  // What the voice should actually say for a piece of on-screen text, or null if nothing sensible:
  // a lone letter → its name (ت → تَاء); spaced root letters (ك ت ب) → their names; mixed English or
  // a bare ending (ـهُ) → nothing. Must match sayable() in tools/make-audio.js.
  const NAMES = C.SAY_NAME;
  // dictionary spellings (تَاء) are said the same way as the spoken name (تَا)
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
  const canSpeak = (t) => S.settings.tts && !!sayable(t) && !!AUDIO[audioKey(sayable(t))];
  function speak(text, slow, btn) {
    if (!S.settings.tts || !text) return;
    text = sayable(text); if (!text) return;
    const id = AUDIO[audioKey(text)];
    if (curAudio) { curAudio.pause(); curAudio = null; }
    if (id) {
      const a = new Audio(`assets/audio/${id}.mp3`);
      a.playbackRate = slow ? 0.65 : 1; a.preservesPitch = true;
      if (btn) { btn.classList.add('playing'); a.onended = a.onpause = a.onerror = () => { if (curAudio === a || !curAudio) btn.classList.remove('playing'); }; }
      a.play().catch(() => { if (btn) btn.classList.remove('playing'); });
      curAudio = a; return;
    }
  }

  // ======================= ART: vector bits, chest, logo =======================
  const V = {
    spark: '<svg viewBox="0 0 24 24" class="nb-spark"><path d="M12 1.5c.6 4.6 2.6 7.6 9 10.5-6.4 2.9-8.4 5.9-9 10.5-.6-4.6-2.6-7.6-9-10.5 6.4-2.9 8.4-5.9 9-10.5z" fill="currentColor"/><path d="M20 1.5c.2 1.5.9 2.4 2.5 3-1.6.6-2.3 1.5-2.5 3-.2-1.5-.9-2.4-2.5-3 1.6-.6 2.3-1.5 2.5-3z" fill="currentColor" opacity=".75"/></svg>',
    close: '<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8L8 24" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>',
    speaker: '<svg viewBox="0 0 32 32"><path d="M4.5 12.5h5.2l7.1-6.2c.8-.7 2.2-.1 2.2 1v21.4c0 1.1-1.4 1.7-2.2 1l-7.1-6.2H4.5a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5z" fill="currentColor"/><path d="M22.5 11.5c2.4 2.6 2.4 6.4 0 9M26 8c4.4 4.6 4.4 11.4 0 16" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 32 32"><path d="M16 3.5l3.8 7.8 8.6 1.2-6.2 6 1.5 8.5L16 23l-7.7 4 1.5-8.5-6.2-6 8.6-1.2z" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 32 32"><path d="M7 17l6 6L25 10" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 32 32"><rect x="7" y="14" width="18" height="14" rx="4.5" fill="currentColor"/><path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="3.4"/></svg>',
    book: '<svg viewBox="0 0 32 32"><path d="M4 7.5c4-2 8-2 11 .8v17.5c-3-2.6-7-2.8-11-.9z" fill="currentColor"/><path d="M28 7.5c-4-2-8-2-11 .8v17.5c3-2.6 7-2.8 11-.9z" fill="currentColor" opacity=".8"/></svg>',
    quran: '<svg viewBox="0 0 32 32"><path d="M3 9c4.5-2.2 9-2 12.2 1.2V27c-3.2-3-7.7-3.3-12.2-1.2z" fill="currentColor"/><path d="M29 9c-4.5-2.2-9-2-12.2 1.2V27c3.2-3 7.7-3.3 12.2-1.2z" fill="currentColor"/><path d="M16 4.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="currentColor"/></svg>',
    pen: '<svg viewBox="0 0 32 32"><path d="M7 25l2.2-6.6L21.4 6.2a2.6 2.6 0 0 1 3.7 0l.7.7a2.6 2.6 0 0 1 0 3.7L13.6 22.8z" fill="currentColor"/><path d="M6 27.5c3.5-1 6-1.4 9-1" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
    trophy: '<svg viewBox="0 0 32 32"><path d="M10 5h12v7.5a6 6 0 0 1-12 0z" fill="currentColor"/><path d="M10 8H6c0 4.2 1.8 6.6 5 7M22 8h4c0 4.2-1.8 6.6-5 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M14 18.5h4v4h-4z" fill="currentColor"/><rect x="10" y="22.5" width="12" height="4.5" rx="2" fill="currentColor"/></svg>',
  };
  // Treasure chest: chunky, front-on and geometric, with a gold frame and a glossy lid.
  function chestSVG(open, cls = '') {
    const id = 'ch' + (++uid);
    const gold = `url(#${id}g)`;
    const frame = (y0, h) => `<rect x="12" y="${y0}" width="10" height="${h}" rx="2" fill="${gold}"/><rect x="78" y="${y0}" width="10" height="${h}" rx="2" fill="${gold}"/>`;
    const spark = (x, y, r) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#FFF6C8"/>`;
    // open: the lid swings back on its hinge, resting on the back rim of the box (no gap)
    const openLid = `<g>
        <path d="M12 46 L19 4 H81 L88 46 Z" fill="#7A3E12"/>
        <path d="M21 10 H79 L84 40 H16 Z" fill="#5E2D0B"/>
        <path d="M18.5 22 H81.5 M17 31 H83" stroke="#4A2207" stroke-width="2"/>
        <path d="M12 46 L19 4 H28 L22 46 Z" fill="${gold}"/><path d="M88 46 L81 4 H72 L78 46 Z" fill="${gold}"/>
        <path d="M17 2 H83 L84.5 9 H15.5 Z" fill="${gold}"/>
      </g>`;
    const treasure = `<g>
        <path d="M15 48 Q20 33 34 31 Q42 25 52 28 Q64 26 70 32 Q82 34 85 48 Z" fill="#F0A000"/>
        <path d="M19 46 Q24 36 35 34 Q43 29 52 31 Q63 29 69 35 Q79 37 81 46 Z" fill="${gold}"/>
        ${[[28, 38], [40, 33], [54, 34], [66, 38], [35, 43], [60, 43], [47, 40], [73, 43]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5.2" ry="2.6" fill="#FFD84A" stroke="#D88A00" stroke-width="1"/>`).join('')}
        <path d="M44 22 L50 16 L56 22 L50 31 Z" fill="#3DB2FF"/><path d="M44 22 L50 16 L50 31 Z" fill="#8FD6FF"/><path d="M44 22 H56" stroke="#1E8FE0" stroke-width="1"/>
        <circle cx="65" cy="29" r="4.4" fill="#FF6FA5"/><circle cx="63.6" cy="27.6" r="1.4" fill="#FFD0E2"/>
        ${spark(30, 24, 4)}${spark(74, 20, 3)}
      </g>`;
    const closedLid = `<g><path d="M17 20 H83 L88 30 H12 Z" fill="#DD8F45"/><rect x="12" y="29" width="76" height="17" rx="2" fill="#C47630"/>${frame(20, 26)}<rect x="10" y="17" width="80" height="6" rx="2.5" fill="${gold}"/></g>`;
    return `<svg class="chest ${cls}" viewBox="0 -16 100 112" aria-hidden="true">
      <defs>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE45C"/><stop offset=".55" stop-color="#FFC21A"/><stop offset="1" stop-color="#F0A000"/></linearGradient>
        <clipPath id="${id}c"><rect x="12" y="16" width="76" height="70" rx="3"/></clipPath>
      </defs>
      <rect x="6" y="80" width="88" height="12" rx="6" fill="rgba(40,24,60,.16)"/>
      ${open ? openLid + treasure : ''}
      <rect x="12" y="44" width="76" height="42" rx="3" fill="#A65F22"/>
      <rect x="22" y="50" width="56" height="13" fill="#8A4A17"/>
      <rect x="22" y="66" width="56" height="13" fill="#8A4A17"/>
      ${frame(44, 42)}
      <rect x="10" y="44" width="80" height="7" rx="2.5" fill="${gold}"/>
      <rect x="10" y="80" width="80" height="6" rx="2.5" fill="${gold}"/>
      ${open ? `<rect x="43" y="47" width="14" height="12" rx="3" fill="${gold}" stroke="#D08A00" stroke-width="1.4"/>` : closedLid}
      ${open ? '' : `<rect x="41" y="38" width="18" height="18" rx="4" fill="${gold}" stroke="#D08A00" stroke-width="1.6"/><circle cx="50" cy="45" r="2.8" fill="#8A4A17"/><path d="M48.6 46.5 h2.8 l.7 5 h-4.2z" fill="#8A4A17"/>
      <g clip-path="url(#${id}c)" opacity=".32"><path d="M30 16 L46 16 L20 96 L4 96Z" fill="#fff"/><path d="M52 16 L58 16 L32 96 L26 96Z" fill="#fff"/></g>`}
    </svg>`;
  }
  // The wordmark (vector, traced from the design in tools/ref/logo-ref.png). With `write`, the word is
  // written left to right, then the gold swoosh flows out of the q into the pen nib.
  function logoSVG(write, cls = '') {
    const id = 'lg' + (++uid); const L = window.QQ_LOGO || { word: '', swoosh: '' };
    return `<svg class="logo ${write ? 'write' : ''} ${cls}" viewBox="40 7 616 314" role="img" aria-label="Qalam">
      <defs>
        <clipPath id="${id}w"><rect class="lg-reveal" x="40" y="0" width="616" height="330"/></clipPath>
        <clipPath id="${id}s"><rect class="lg-reveal-s" x="40" y="180" width="616" height="150"/></clipPath>
      </defs>
      <g clip-path="url(#${id}s)"><path class="lg-swoosh" d="${L.swoosh}" fill-rule="evenodd"/></g>
      <g clip-path="url(#${id}w)"><path class="lg-word" d="${L.word}" fill-rule="evenodd"/></g>
    </svg>`;
  }

  // ======================= CONFETTI / TOAST / MODAL =======================
  function confetti(n = 120) {
    const cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.appendChild(cv);
    const dpr = window.devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const cols = ['#2B59FF', '#8B3DFF', '#13A3F2', '#FF8A00', '#FFB800', '#FF4FA3'];
    const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 160, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, r: Math.random() * 7 + 4, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, s: Math.random() < 0.5 }));
    let f = 0;
    (function step() {
      x.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; if (p.s) x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { x.beginPath(); x.arc(0, 0, p.r / 2.4, 0, 7); x.fill(); } x.restore(); });
      if (++f < 170) requestAnimationFrame(step); else cv.remove();
    })();
  }
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
  function modal(html, onMount) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal">${html}</div>`;
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    if (onMount) onMount(bg.querySelector('.modal'), close);
    return close;
  }

  // ======================= LESSON ORDER =======================
  const FLAT = []; C.UNITS.forEach((u, ui) => u.lessons.forEach((l, li) => FLAT.push({ u, ui, l, li })));
  const firstOpen = () => FLAT.find((x) => !S.done[x.l.id]);
  const isUnlocked = (id) => { if (S.settings.unlockAll || S.done[id]) return true; const f = firstOpen(); return f && f.l.id === id; };
  const unitStarted = (ui) => C.UNITS[ui].lessons.some((l) => isUnlocked(l.id));
  const curUnit = () => { const f = firstOpen(); return f ? f.ui : C.UNITS.length - 1; };
  const chestId = (u, i) => `${u.id}-chest-${i}`;

  // ======================= LAYOUT SHELL =======================
  let tab = 'learn';
  const NAV = [
    { id: 'learn', icon: 'house', label: 'Learn' },
    { id: 'practice', icon: 'practice', label: 'Practice' },
    { id: 'leaderboards', icon: 'shield', label: 'Leaderboards' },
    { id: 'quests', icon: 'scroll', label: 'Quests' },
    { id: 'shop', icon: 'shop', label: 'Shop' },
    { id: 'profile', avatar: true, label: 'Profile' },
    { id: 'more', icon: 'grad', label: 'Teachers', desktopOnly: true },
  ];
  const avatarHTML = (size) => `<span class="avatar" style="width:${size}px;height:${size}px">${M.kid(S.buddy, 'idle', '', { headOnly: true })}</span>`;
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  // Switch theme in one synchronised motion: the new colours sweep out in a circle from the button.
  function setTheme(t, from) {
    const apply = () => { S.settings.theme = t; save(); if (window.__applyTheme) window.__applyTheme(t); render(); };
    Sfx.play('pop');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) { document.documentElement.classList.add('no-anim'); apply(); requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('no-anim'))); return; }
    const r = from ? from.getBoundingClientRect() : { left: innerWidth / 2, top: 0, width: 0, height: 0 };
    document.documentElement.style.setProperty('--vx', r.left + r.width / 2 + 'px');
    document.documentElement.style.setProperty('--vy', r.top + r.height / 2 + 'px');
    // safety net: if the browser never runs the animation (hidden tab, throttled frame), switch anyway
    let done = false; const once = () => { if (!done) { done = true; apply(); } };
    try { document.startViewTransition(once); } catch (e) { once(); }
    setTimeout(once, 700);
  }
  function statsHTML(where) {
    tickHearts();
    const hearts = S.settings.classMode ? `<button class="stat hearts" data-pop="hearts" style="color:var(--pink)">${IMG('heart')}∞</button>` : `<button class="stat hearts" data-pop="hearts">${IMG('heart')}${S.hearts}</button>`;
    return `<div class="statsrow" data-where="${where}">
      <button class="stat streak ${S.lastDay === today() ? '' : 'off'}" data-pop="streak">${IMG('fire')}${S.streak}</button>
      <button class="stat gems" data-pop="gems">${IMG('gem')}${S.gems}</button>${hearts}<button class="theme-toggle" data-theme-toggle aria-label="Switch light or dark mode" title="Light / dark">${IMG(isDark() ? 'sun' : 'moon')}</button></div>`;
  }
  function sidenavHTML() {
    return `<aside class="sidenav"><a class="logo-link" href="#" data-tab="learn" aria-label="Qalam home">${logoSVG(false)}<img class="logo-mini" src="icons/icon-192.png" alt=""></a>
      ${NAV.map((n) => `<button class="nav-item ${tab === n.id ? 'on' : ''}" data-tab="${n.id}">${n.avatar ? avatarHTML(34) : IMG(n.icon)}<span>${n.label}</span></button>`).join('')}
      <div class="side-promo">${M.kid(S.buddy === 'zaid' ? 'huda' : 'zaid', 'read')}<b>Teaching a class?</b><p>Every lesson, answer and Qur’an reference in one place.</p><button class="link-btn" data-tab="more">Teacher corner</button></div></aside>`;
  }
  function mtabsHTML() {
    return `<nav class="mtabs">${NAV.filter((n) => !n.desktopOnly).map((n) => `<button class="mtab ${tab === n.id ? 'on' : ''}" data-tab="${n.id}" aria-label="${n.label}">${n.avatar ? avatarHTML(34) : IMG(n.icon)}</button>`).join('')}</nav>`;
  }
  function rightbarHTML() {
    ensureQuests();
    const q = S.quests;
    const lessonsLeft = Math.max(0, 10 - Object.keys(S.done).length);
    return `<aside class="rightbar">${statsHTML('right')}
      <div class="side-card hero-card"><div class="hc-text"><span class="hc-label">Leaderboards</span><h3>${lessonsLeft ? 'Unlock class leagues!' : 'Class leagues are coming!'}</h3><p>${lessonsLeft ? `Complete ${lessonsLeft} more lesson${lessonsLeft > 1 ? 's' : ''} to start competing with your class.` : 'Soon you can race your classmates each week.'}</p></div>${IMG('shield', 'hc-art')}
        <button class="btn btn-outline" data-tab="leaderboards">Go to leaderboards</button></div>
      <div class="side-card"><h3>Daily Quests <button data-tab="quests">View all</button></h3>${q.list.map(questRow).join('')}</div>
      <div class="side-card"><h3>Your week <span class="hc-label" style="margin:0">${S.streak} day streak</span></h3>${weekHTML()}</div>
      <div class="footer-links"><a href="https://github.com/osamaajr/qalam-quest" target="_blank" rel="noopener">About</a><a href="teacher.html">Teacher guide</a><a href="https://github.com/osamaajr/qalam-quest/blob/main/RESEARCH.md" target="_blank" rel="noopener">Research</a><a href="https://github.com/osamaajr/qalam-quest#readme" target="_blank" rel="noopener">Privacy</a></div>
    </aside>`;
  }
  function render(scrollToCurrent) {
    ensureQuests();
    const page = { learn: pathView, practice: practiceView, leaderboards: leaderView, quests: questsView, shop: shopView, profile: profileView, more: moreView }[tab]();
    $app.innerHTML = `<div class="app">${sidenavHTML()}<div class="center"><header class="mtop">${statsHTML('top')}</header><main class="main">${page}</main></div>${rightbarHTML()}${mtabsHTML()}</div>`;
    $app.querySelectorAll('[data-tab]').forEach((b) => b.onclick = (e) => { e.preventDefault(); Sfx.play('tap'); tab = b.dataset.tab; render(tab === 'learn'); window.scrollTo(0, 0); });
    $app.querySelectorAll('[data-pop]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); Sfx.play('tap'); statPopup(b); });
    $app.querySelectorAll('[data-theme-toggle]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); setTheme(isDark() ? 'light' : 'dark', b); });
    $app.querySelectorAll('.side-card .kid, .page-hero .kid, .wip .kid').forEach((k) => M.liven(k, ['read', 'idle', 'think', 'wave'], 3600));
    $app.querySelectorAll('.side-promo .kid').forEach((k) => M.liven(k, ['read', 'cheeky', 'read', 'wave'], 4200));
    ({ learn: bindPath, quests: bindQuests, shop: bindShop, profile: bindProfile, more: bindMore, practice: bindPractice, leaderboards: () => {} })[tab](scrollToCurrent);
  }

  // ---------- stat popovers ----------
  function statPopup(btn) {
    const kind = btn.dataset.pop;
    const had = document.querySelector(`.stat-pop[data-for="${kind}"]`); closePops(); if (had) return;
    let html = '';
    if (kind === 'streak') html = `<h4>${IMG('fire')} ${S.streak ? `${S.streak} day streak` : 'Start a streak today!'}</h4><p>${S.lastDay === today() ? 'You’ve practised today. Mashā’Allāh!' : 'Do one lesson today to keep your flame going!'}</p>${weekHTML()}<p style="margin:12px 0 0">${IMG('snowflake')} Streak freezes: <b>${S.freezes}/${MAX_FREEZES}</b> — they protect your streak if you miss a day.</p>`;
    else if (kind === 'gems') html = `<h4>${IMG('gem')} ${S.gems} gems</h4><p>Earn gems from quests, chests and streaks. Spend them in the shop.</p><button class="btn btn-sm btn-sky" data-tab-go="shop">Go to shop</button>`;
    else {
      tickHearts();
      const mins = S.hearts < MAX_HEARTS ? Math.ceil((HEART_MS - (Date.now() - S.heartsAt)) / 60000) : 0;
      html = S.settings.classMode ? `<h4>${IMG('heart')} Unlimited hearts</h4><p>Class mode is on — mistakes never stop a lesson.</p>`
        : `<h4>Hearts</h4><div class="hearts-row" style="justify-content:flex-start;margin-bottom:10px">${Array.from({ length: MAX_HEARTS }, (_, i) => IMG('heart', i < S.hearts ? '' : 'off')).join('')}</div><p>${S.hearts === MAX_HEARTS ? 'You have full hearts! You lose one for each mistake.' : `Next heart in ${mins} min — or practise to refill them all.`}</p><button class="btn btn-sm" data-tab-go="practice">Practise to refill</button>`;
    }
    if (window.innerWidth < 768) {
      modal(html + '<button class="btn" data-x>Okay</button>', (m, close) => { m.querySelector('[data-x]').onclick = close; bindGo(m, close); });
      return;
    }
    const pop = document.createElement('div'); pop.className = 'stat-pop'; pop.innerHTML = html; pop.dataset.for = kind;
    pop.onclick = (e) => e.stopPropagation();
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    Object.assign(pop.style, { position: 'fixed', top: r.bottom + 10 + 'px', right: 'auto', left: Math.max(12, Math.min(r.left + r.width / 2 - pop.offsetWidth / 2, innerWidth - pop.offsetWidth - 12)) + 'px' });
    bindGo(pop, closePops);
  }
  function bindGo(root, close) { root.querySelectorAll('[data-tab-go]').forEach((b) => b.onclick = () => { close(); tab = b.dataset.tabGo; render(); }); }
  function closePops() {
    document.querySelectorAll('.stat-pop').forEach((p) => p.remove());
    document.querySelectorAll('.node-pop').forEach((p) => { p.parentElement.classList.remove('has-pop'); p.remove(); });
  }
  function weekHTML(anim) {
    const dow = (new Date().getDay() + 6) % 7; // Monday = 0
    return `<div class="week">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((n, i) => { const ds = addDays(today(), i - dow); const on = S.history[ds] > 0; const fr = S.frozenDays.includes(ds); return `<div class="day ${on ? 'on' : fr ? 'frozen' : ''} ${i === dow ? 'today' : ''} ${anim && i === dow ? 'anim' : ''}"><span>${n}</span><i></i></div>`; }).join('')}</div>`;
  }

  // ======================= LEARN: THE PATH =======================
  const OFFS = [0, 44, 70, 44, 0, -44, -70, -44];
  const DECO = [['huda', ['read', 'idle', 'cheeky', 'wave']], ['zaid', ['dance', 'idle', 'happy', 'cheeky']], ['huda', ['think', 'idle', 'wave', 'dance']], ['zaid', ['read', 'idle', 'think', 'cheeky']], ['huda', ['dance', 'cheeky', 'idle', 'read']], ['zaid', ['wave', 'idle', 'think', 'happy']], ['huda', ['read', 'think', 'cheeky', 'dance']]];
  const KIND = new Map(); // lesson id -> icon type, worked out once from its exercises
  function lessonKind(l) {
    if (l.review) return 'trophy';
    if (!KIND.has(l.id)) { const t = l.steps().map((x) => x.type); KIND.set(l.id, t.includes('tap') ? 'quran' : t.includes('build') ? 'pen' : 'star'); }
    return KIND.get(l.id);
  }
  const ARROW_L = '<svg viewBox="0 0 24 24" class="u-back"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function bannerHTML(ui) {
    const u = C.UNITS[ui];
    return `<div class="unit-banner c-${u.color}" id="ubanner" data-ui="${ui}"><div><div class="u-kicker">${ARROW_L}Unit ${ui + 1} · <span class="u-ar">${esc(u.ar)}</span></div><h2>${esc(u.title)}</h2></div>
      <button class="guide-btn" data-guide="${u.id}" aria-label="Guidebook">${V.book.replace('<svg', '<svg class="ico"')}<span>GUIDEBOOK</span></button></div>`;
  }
  function pathView() {
    const cur = firstOpen();
    const units = C.UNITS.map((u, ui) => {
      const items = [];
      u.lessons.forEach((l, li) => { items.push({ kind: 'lesson', l, li }); if (li === 2 || (li === 5 && u.lessons.length > 7)) items.push({ kind: 'chest', id: chestId(u, li), after: l.id }); });
      const deco = DECO[ui % DECO.length];
      const decoBuddy = deco[0] === S.buddy ? (S.buddy === 'zaid' ? 'huda' : 'zaid') : deco[0];
      // keep the decorative kid well away from the guide standing by the current lesson
      const curK = cur && cur.ui === ui ? items.findIndex((it) => it.kind === 'lesson' && it.l.id === cur.l.id) : -1;
      let decoAt = ui % 2 ? 6 : 2;
      if (curK >= 0 && Math.abs(decoAt - curK) < 3) decoAt = curK + 4 < items.length ? curK + 4 : curK - 4;
      const nodes = items.map((it, k) => {
        const x = OFFS[k % OFFS.length];
        const here = items[decoAt];
        const decoLocked = here && (here.kind === 'chest' ? !(S.done[here.after] || S.settings.unlockAll) : !isUnlocked(here.l.id));
        const decoHTML = k === decoAt ? `<div class="deco-buddy ${decoLocked ? 'locked' : ''}" style="${x > 0 ? 'right' : 'left'}:calc(100% + 64px);top:-86px" data-moods="${deco[1].join(',')}">${M.kid(decoBuddy, deco[1][0])}</div>` : '';
        if (it.kind === 'chest') {
          const opened = S.chests.includes(it.id); const open = S.done[it.after] || S.settings.unlockAll;
          return `<div class="node-wrap" style="transform:translateX(${x}px)">${decoHTML}<button class="chest-node ${opened ? 'opened' : open ? 'ready' : 'locked'}" data-chest="${it.id}" data-open="${open ? 1 : 0}" aria-label="Treasure chest">${chestSVG(opened)}</button></div>`;
        }
        const done = S.done[it.l.id]; const unlocked = isUnlocked(it.l.id); const isCur = cur && cur.l.id === it.l.id;
        const icon = done && !it.l.review ? V.check : V[lessonKind(it.l)];
        const stars = done ? `<div class="node-stars">${[1, 2, 3].map((n) => IMG('star', n <= done.stars ? '' : 'off')).join('')}</div>` : '';
        const ring = isCur ? `<svg class="node-ring" viewBox="0 0 102 96"><ellipse cx="51" cy="48" rx="46" ry="43" stroke="var(--line)"/><path d="M51 5 A46 43 0 1 1 50.9 5" pathLength="100" stroke="var(--c)" stroke-dasharray="100" stroke-dashoffset="${100 - 100 * Math.max(.06, it.li / u.lessons.length)}" stroke-linecap="round"/></svg>` : '';
        const bubble = isCur ? '<div class="start-bubble">START</div>' : '';
        const buddy = isCur ? `<div class="path-buddy walk-in" id="guide" style="${x >= 0 ? 'right:calc(100% + 34px)' : 'left:calc(100% + 34px)'};top:-80px;--from:${x >= 0 ? '-120px' : '120px'}">${M.kid(S.buddy, 'walk', x >= 0 ? '' : 'flip')}</div>` : '';
        return `<div class="node-wrap" style="transform:translateX(${x}px)" ${isCur ? 'id="current"' : ''}>${decoHTML}${bubble}${buddy}<div class="node-box">${ring}<button class="node ${unlocked ? '' : 'locked'} ${isCur ? 'cur' : ''}" data-lesson="${it.l.id}" aria-label="${esc(it.l.title)}">${icon}</button></div>${stars}</div>`;
      }).join('');
      const jump = ui > 0 && !unitStarted(ui) ? `<div class="jump-row"><button class="jump-btn" data-jump="${ui}">${IMG('key')} Jump here?</button></div>` : '';
      const divider = ui > 0 ? `<div class="unit-divider"><span>${esc(u.title)}</span></div>` : '';
      return `<section class="unit c-${u.color}" data-ui="${ui}">${divider}${jump}<div class="path">${nodes}</div></section>`;
    }).join('');
    return `<div class="learn">${bannerHTML(curUnit() > 0 && !cur ? curUnit() : 0)}${units}
      <div class="wip" style="padding-top:0">${M.kid(S.buddy, 'think')}<p>More units are on the way, in shā’ Allāh!</p></div>
      <button class="to-current hidden" id="toCur" aria-label="Back to my lesson"><svg viewBox="0 0 24 24"><path d="M12 4v15M5 12l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>`;
  }
  let pathScroll = null;
  function bindPath(scrollToCurrent) {
    $app.querySelectorAll('[data-lesson]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); Sfx.play('tap'); lessonPop(b); });
    $app.querySelectorAll('[data-chest]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation(); const id = b.dataset.chest;
      if (S.chests.includes(id)) { toast('You already opened this chest!'); return; }
      if (b.dataset.open !== '1') { Sfx.play('soft-wrong'); toast('Finish the lessons before it to open this chest!'); return; }
      openChest(id);
    });
    const bindGuide = () => $app.querySelectorAll('[data-guide]').forEach((b) => b.onclick = () => { Sfx.play('tap'); guidebook(C.UNITS.find((u) => u.id === b.dataset.guide)); });
    bindGuide();
    $app.querySelectorAll('[data-jump]').forEach((b) => b.onclick = () => { Sfx.play('tap'); jumpPrompt(+b.dataset.jump); });
    $app.querySelectorAll('.deco-buddy').forEach((d) => M.liven(d.querySelector('.kid'), d.dataset.moods.split(','), 3800));
    const g = document.getElementById('guide');
    if (g) { const k = g.querySelector('.kid'); setTimeout(() => { k.setAttribute('data-mood', 'wave'); M.liven(k, ['wave', 'idle', 'point', 'cheeky', 'happy', 'idle', 'think', 'dance', 'read', 'idle'], 3200); }, 1400); }
    // the one sticky banner always shows the unit you are looking at; the arrow button brings you back to your lesson
    const banner = document.getElementById('ubanner'), toCur = document.getElementById('toCur'), cur = document.getElementById('current');
    if (pathScroll) window.removeEventListener('scroll', pathScroll);
    pathScroll = () => {
      if (!document.body.contains(banner)) { window.removeEventListener('scroll', pathScroll); return; }
      const edge = banner.getBoundingClientRect().bottom + 30;
      let ui = 0; $app.querySelectorAll('.unit').forEach((sec) => { if (sec.getBoundingClientRect().top < edge) ui = +sec.dataset.ui; });
      if (+banner.dataset.ui !== ui) { const tmp = document.createElement('div'); tmp.innerHTML = bannerHTML(ui); const nb = tmp.firstElementChild; banner.className = nb.className; banner.dataset.ui = ui; banner.innerHTML = nb.innerHTML; bindGuide(); }
      if (cur && toCur) { const r = cur.getBoundingClientRect(); const off = r.bottom < 80 || r.top > innerHeight - 60; toCur.classList.toggle('hidden', !off); toCur.classList.toggle('up', r.bottom < 80); }
    };
    window.addEventListener('scroll', pathScroll, { passive: true });
    if (toCur) toCur.onclick = () => { Sfx.play('tap'); cur && cur.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    if (scrollToCurrent && cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
    setTimeout(pathScroll, 700);
  }
  function lessonPop(btn) {
    const wrap = btn.closest('.node-wrap');
    const had = wrap.querySelector('.node-pop'); closePops(); if (had) return;
    const id = btn.dataset.lesson; const f = FLAT.find((x) => x.l.id === id);
    const unlocked = isUnlocked(id); const done = S.done[id];
    const pop = document.createElement('div');
    pop.className = `node-pop c-${f.u.color} ${unlocked ? '' : 'locked'}`;
    pop.innerHTML = `<h3>${esc(f.l.title)} ${f.l.glyphs && AR_RE.test(f.l.glyphs) ? `<span class="ar" style="font-size:.95em;opacity:.9">${esc(f.l.glyphs)}</span>` : ''}</h3>
      <p>${unlocked ? `Lesson ${f.li + 1} of ${f.u.lessons.length}${done ? ' · best ' + done.best + '%' : ''}` : 'Finish the lessons above to unlock this!'}</p>
      <button class="btn" ${unlocked ? '' : 'disabled'}>${!unlocked ? 'Locked' : done ? 'Practise +5 XP' : 'Start +10 XP'}</button>`;
    const x = +(wrap.style.transform.match(/-?\d+/) || [0])[0];
    pop.style.transform = `translateX(calc(-50% - ${x * 0.6}px))`;
    pop.style.setProperty('--tip', `calc(50% + ${x * 0.6}px)`);
    wrap.appendChild(pop); wrap.classList.add('has-pop');
    pop.onclick = (e) => e.stopPropagation();
    pop.querySelector('.btn').onclick = () => { if (!unlocked) return; Sfx.play('tap'); startLesson(f); };
  }
  function guidebook(u) {
    modal(`${M.kid(S.buddy, 'talk')}<h2>${esc(u.title)}</h2><p>${esc(u.blurb)}</p>
      <ul>${u.guide.map((g) => `<li>${rich(g)}</li>`).join('')}</ul><button class="btn" data-x>Got it!</button>`, (m, close) => { m.querySelector('[data-x]').onclick = () => { Sfx.play('tap'); close(); }; setTimeout(() => M.setMood(m, 'idle'), 2500); });
  }
  function jumpPrompt(ui) {
    const u = C.UNITS[ui];
    modal(`${M.kid(S.buddy, 'think')}<h2>Jump to Unit ${ui + 1}?</h2><p>Pass a short test on everything before <b>${esc(u.title)}</b> and you can skip ahead. You get 3 lives — have a go!</p>
      <button class="btn btn-violet" data-y>Start the test</button><button class="link-btn" data-x>Maybe later</button>`, (m, close) => {
      m.querySelector('[data-x]').onclick = close;
      m.querySelector('[data-y]').onclick = () => { close(); startTest(ui); };
    });
  }

  // ======================= OTHER PAGES =======================
  const questRow = (x) => `<div class="quest ${x.p >= x.n ? 'done' : ''}">${IMG(x.icon)}<div style="flex:1;min-width:0"><h4>${esc(x.label)}</h4><div class="qbar"><div class="bar"><i style="width:${(x.p / x.n) * 100}%"></i><b>${x.p} / ${x.n}</b></div><span class="qprize">${x.p >= x.n ? IMG('gem') : chestSVG(false)}</span></div></div></div>`;
  function questsView() {
    ensureQuests();
    const q = S.quests; const all = q.list.every((x) => x.p >= x.n);
    const xpToday = S.history[today()] || 0;
    return `<div class="page"><div class="page-hero c-violet">${M.kid(S.buddy, all ? 'happy' : 'read')}<div><h1>Daily quests</h1><p>${all ? 'All quests done! Open your daily chest!' : 'Finish all 3 quests today to win a daily chest. New quests every day!'}</p></div></div>
      <div class="card">${q.list.map(questRow).join('')}</div>
      <div style="margin-top:16px">${all && !q.claimedChest ? '<button class="btn btn-gold" id="dailyChest">Open daily chest</button>' : all ? '<p class="muted" style="text-align:center">Daily chest opened. New quests tomorrow!</p>' : ''}</div>
      <h2>Today</h2><div class="statgrid"><div class="statbox">${IMG('glowing-star')}<div><b>${xpToday} XP</b><small>Goal: ${S.dailyGoal} XP</small></div></div>
      <div class="statbox">${IMG('fire')}<div><b>${S.streak}</b><small>day streak</small></div></div></div>
      <h2>Achievements</h2><div class="badges">${BADGES.map(badgeHTML).join('')}</div></div>`;
  }
  const badgeHTML = (b) => `<div class="badge ${S.badges.includes(b.id) ? '' : 'locked'}"><div class="b-ico">${IMG(b.icon)}</div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`;
  function bindQuests() { const b = document.getElementById('dailyChest'); if (b) b.onclick = () => { S.quests.claimedChest = true; openChest(null, 25); }; }
  function openChest(id, fixed) {
    const amt = fixed || 10 + Math.floor(Math.random() * 3) * 5;
    modal(`<div class="chest-big shake">${chestSVG(false)}</div><h2>Treasure chest!</h2><p>What’s inside…?</p>`, (m, close) => {
      Sfx.play('chest');
      setTimeout(() => {
        S.gems += amt; if (id) S.chests.push(id); save();
        m.innerHTML = `<div class="chest-big open">${chestSVG(true)}</div><div class="reward-amt" style="align-self:center">${IMG('gem')}+${amt}</div><h2>You found ${amt} gems!</h2><button class="btn btn-sky" data-x>Collect</button>`;
        confetti(80); buzz([20, 40, 20]);
        m.querySelector('[data-x]').onclick = () => { Sfx.play('tap'); close(); render(); };
      }, 1150);
    });
  }
  function practiceView() {
    const done = FLAT.filter((x) => S.done[x.l.id]);
    return `<div class="page"><div class="page-hero c-orange">${M.kid(S.buddy, 'dance')}<div><h1>Practice</h1><p>Keep your skills sharp and win your hearts back.</p></div></div>
      <div class="card"><div class="setting"><div class="row">${IMG('practice')}<div><b>Quick practice</b><small>${done.length ? '6 questions from lessons you’ve finished · refills hearts · +5 XP' : 'Finish your first lesson to unlock practice'}</small></div></div><button class="btn btn-sm" id="quickPractice" ${done.length ? '' : 'disabled'}>Start</button></div>
      <div class="setting"><div class="row">${IMG('target')}<div><b>Mistakes review</b><small>Practise the questions you got wrong</small></div></div><span class="test-tag">Coming soon</span></div>
      <div class="setting"><div class="row">${IMG('speaker')}<div><b>Listening practice</b><small>Hear a sound, tap the letter</small></div></div><span class="test-tag">Coming soon</span></div></div></div>`;
  }
  function bindPractice() { const b = document.getElementById('quickPractice'); if (b) b.onclick = () => { const done = FLAT.filter((x) => S.done[x.l.id]); startLesson(C.pick(done), { practice: true }); }; }
  function leaderView() {
    return `<div class="page"><div class="wip">${M.kid(S.buddy, 'think')}<span class="tag">${IMG('construction')} Work in progress</span><h1>Leaderboards</h1>
      <p>Soon you’ll be able to compete with your class each week — a friendly race to learn the most!</p>${IMG('trophy').replace('class="ico', 'style="width:90px;height:90px" class="ico')}</div></div>`;
  }
  function shopView() {
    return `<div class="page"><div class="page-hero c-sky">${M.kid(S.buddy, 'happy')}<div><h1>Shop</h1><p>You have ${IMG('gem')} <b>${S.gems}</b> gems to spend.</p></div></div>
      <h2>Power-ups</h2><div class="card">
      <div class="setting"><div class="row">${IMG('snowflake')}<div><b>Streak freeze</b><small>Protects your streak for 1 missed day · you have ${S.freezes}/${MAX_FREEZES}</small></div></div><button class="btn btn-sm btn-sky" id="buyFreeze" ${S.freezes >= MAX_FREEZES ? 'disabled' : ''}>${IMG('gem')} ${FREEZE_COST}</button></div>
      <div class="setting"><div class="row">${IMG('heart')}<div><b>Refill hearts</b><small>Get all ${MAX_HEARTS} hearts back</small></div></div><button class="btn btn-sm btn-sky" id="buyHearts" ${S.hearts >= MAX_HEARTS || S.settings.classMode ? 'disabled' : ''}>${IMG('gem')} ${REFILL_COST}</button></div></div>
      <h2>Buddy outfits</h2><div class="card"><div class="setting"><div class="row">${IMG('crown')}<div><b>Hats, colours & costumes</b><small>Dress up ${M.BUDDIES[S.buddy].name}</small></div></div><span class="test-tag">Coming soon</span></div></div>
      <p class="muted" style="font-size:13px;text-align:center;margin-top:18px">Gems are only earned by learning — nothing here ever costs real money.</p></div>`;
  }
  function bindShop() {
    document.getElementById('buyFreeze').onclick = () => { if (S.gems < FREEZE_COST) { Sfx.play('soft-wrong'); toast('Not enough gems yet — finish quests to earn more!'); return; } S.gems -= FREEZE_COST; S.freezes++; save(); Sfx.play('chest'); toast('Streak freeze equipped! ❄️'); render(); };
    document.getElementById('buyHearts').onclick = () => { if (S.gems < REFILL_COST) { Sfx.play('soft-wrong'); toast('Not enough gems yet!'); return; } S.gems -= REFILL_COST; S.hearts = MAX_HEARTS; save(); Sfx.play('heart'); render(); };
  }
  function profileView() {
    const B = M.BUDDIES[S.buddy];
    const acc = S.stats.answered ? Math.round((S.stats.correct / S.stats.answered) * 100) : 0;
    const joined = new Date(S.joined).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return `<div class="page"><div class="profile-head"><div class="avatar-big">${M.kid(S.buddy, 'idle', '', { headOnly: true })}</div><div><h1>${esc(S.name || 'Quester')}</h1><p class="muted" style="margin:4px 0 0">Joined ${joined} · buddy ${B.name}</p>
      <button class="btn btn-sm btn-ghost" style="margin-top:12px" id="swapBuddy">Switch to ${S.buddy === 'zaid' ? 'Huda' : 'Zaid'}</button></div></div>
      <h2>Statistics</h2><div class="statgrid">
        <div class="statbox">${IMG('fire')}<div><b>${S.streak}</b><small>Day streak (best ${S.bestStreak})</small></div></div>
        <div class="statbox">${IMG('glowing-star')}<div><b>${S.xp}</b><small>Total XP</small></div></div>
        <div class="statbox">${IMG('books')}<div><b>${Object.keys(S.done).length} / ${FLAT.length}</b><small>Lessons</small></div></div>
        <div class="statbox">${IMG('target')}<div><b>${acc}%</b><small>Accuracy</small></div></div></div>
      <h2>Achievements</h2><div class="badges">${BADGES.map(badgeHTML).join('')}</div>
      <h2>Settings</h2><div class="card"><div class="setting"><div><b>Appearance</b><small>Light, dark, or follow this device</small></div><div class="seg">${['auto', 'light', 'dark'].map((t) => `<button class="${S.settings.theme === t ? 'on' : ''}" data-theme-set="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>${switchRow('sound', 'Sound effects', 'Dings, pops and fanfares')}${switchRow('tts', 'Read aloud', 'Hear letters and words in Arabic')}
      <div class="setting"><div><b>Teacher & parent corner</b><small>Class mode, unlock lessons, teacher guide</small></div><button class="btn btn-sm btn-violet" data-tab="more">Open</button></div></div></div>`;
  }
  const switchRow = (k, label, sub) => `<div class="setting"><div><b>${label}</b><small>${sub}</small></div><button class="switch ${S.settings[k] ? 'on' : ''}" data-set="${k}" aria-label="${label}"></button></div>`;
  function bindSwitches() { $app.querySelectorAll('[data-set]').forEach((b) => b.onclick = () => { const k = b.dataset.set; S.settings[k] = !S.settings[k]; save(); Sfx.play('select'); render(); }); }
  function bindProfile() { bindSwitches(); $app.querySelectorAll('[data-theme-set]').forEach((b) => b.onclick = () => setTheme(b.dataset.themeSet, b)); document.getElementById('swapBuddy').onclick = () => { S.buddy = S.buddy === 'zaid' ? 'huda' : 'zaid'; save(); Sfx.play('pop'); render(); }; }
  function moreView() {
    return `<div class="page"><div class="page-hero c-violet">${M.kid(S.buddy === 'zaid' ? 'huda' : 'zaid', 'read')}<div><h1>Teacher & parent corner</h1><p>Tools for using Qalam with a class or at home.</p></div></div>
      <div class="card">${switchRow('classMode', 'Class mode: unlimited hearts', 'Mistakes never stop a lesson — good for class')}${switchRow('unlockAll', 'Unlock every lesson', 'Jump to any lesson to preview or teach it')}
        <div class="setting"><div class="row">${IMG('book')}<div><b>Teacher guide</b><small>Every lesson, answer and Qur’an reference on one printable page</small></div></div><a class="btn btn-sm btn-violet" href="teacher.html">Open</a></div>
        <div class="setting"><div class="row">${IMG('bulb')}<div><b>Show the tour again</b><small>A quick walk-through of the app</small></div></div><button class="btn btn-sm btn-ghost" id="retour">Show</button></div>
        <div class="setting"><div class="row">${IMG('gear')}<div><b>Start again</b><small>Erase progress on this device</small></div></div><button class="btn btn-sm btn-red" id="reset">Reset</button></div></div>
      <p class="muted" style="text-align:center;font-size:13px;margin-top:24px">Qalam · made for Didsbury Mosque · progress is saved only on this device</p></div>`;
  }
  function bindMore() {
    bindSwitches();
    document.getElementById('retour').onclick = () => { tab = 'learn'; render(true); setTimeout(tour, 700); };
    document.getElementById('reset').onclick = () => modal(`<h2>Erase all progress?</h2><p>This removes streaks, XP and lessons on this device. It can’t be undone.</p><button class="btn btn-red" data-y>Yes, erase</button><button class="link-btn" data-x>Cancel</button>`, (m, close) => { m.querySelector('[data-x]').onclick = close; m.querySelector('[data-y]').onclick = () => { localStorage.removeItem(KEY); location.reload(); }; });
  }

  // ======================= ONBOARDING =======================
  const LEVELS = [
    { v: 0, icon: 'seedling', t: 'I’m brand new to Arabic', s: 'Start with the letters' },
    { v: 1, icon: 'books', t: 'I know my letters', s: 'Take a test to skip to the vowels' },
    { v: 4, icon: 'book', t: 'I can read with ḥarakāt', s: 'Test to skip to sun & moon letters' },
    { v: 6, icon: 'moon', t: 'I can read the Qur’an', s: 'Test to skip to Qur’an grammar' },
  ];
  const ONB = ['welcome', 'buddy', 'name', 'level', 'goal'];
  function onboarding(step = 'welcome') {
    const k = (b, mood, cls) => M.kid(b, mood, cls);
    const i = ONB.indexOf(step);
    const top = i > 0 ? `<div class="onb-top"><button class="x-btn" data-back aria-label="Back">${V.close}</button><div class="progress"><i style="width:${(i / (ONB.length - 1)) * 100}%"></i></div></div>` : '';
    let html = '';
    if (step === 'welcome') {
      html = `<div class="onb-body"><div class="duo-kids">${k('zaid', 'wave')}${k('huda', 'happy')}</div>
        <div class="hero-logo">${logoSVG(true)}</div><p>Learn to read the Arabic of the Qur’an — one tiny, fun lesson at a time.</p></div>
        <div class="onb-foot"><button class="btn" data-go="buddy">Get started</button><a class="btn btn-ghost" href="teacher.html">I’m a teacher or parent</a></div>`;
    } else if (step === 'buddy') {
      html = `<div class="onb-body"><h1>Pick your buddy!</h1><p>They’ll guide you on your quest.</p>
        <div class="buddy-pick">${['zaid', 'huda'].map((b) => `<button class="buddy-card ${S.buddy === b ? 'on' : ''}" data-buddy="${b}">${k(b, S.buddy === b ? 'happy' : 'idle')}<b>${M.BUDDIES[b].name}</b><small>${M.BUDDIES[b].line}</small></button>`).join('')}</div></div>
        <div class="onb-foot"><button class="btn" data-go="name">Continue</button></div>`;
    } else if (step === 'name') {
      html = `<div class="onb-body"><div class="speech">${k(S.buddy, 'talk')}<div class="bubble">Assalāmu ‘alaykum! I’m ${M.BUDDIES[S.buddy].name}. What’s your first name?</div></div>
        <input class="name-input" id="nm" maxlength="16" placeholder="Your first name" autocomplete="off" value="${esc(S.name)}">
        <p class="muted" style="font-size:14px">Only saved on this device.</p></div>
        <div class="onb-foot"><button class="btn" data-go="level">Continue</button></div>`;
    } else if (step === 'level') {
      html = `<div class="onb-body"><div class="speech">${k(S.buddy, 'think')}<div class="bubble">How much Arabic do you already know${S.name ? ', ' + esc(S.name) : ''}?</div></div>
        <div class="choice-list">${LEVELS.map((l) => `<button class="choice ${S.level === l.v ? 'on' : ''}" data-level="${l.v}">${IMG(l.icon)}<span>${esc(l.t)}<small>${esc(l.s)}</small></span></button>`).join('')}</div></div>
        <div class="onb-foot"><button class="btn" data-go="goal">Continue</button></div>`;
    } else if (step === 'goal') {
      html = `<div class="onb-body"><div class="speech">${k(S.buddy, 'talk')}<div class="bubble">How much do you want to learn each day?</div></div>
        <div class="choice-list">${[[10, 'seedling', 'Little star', '1 lesson a day · about 5 min'], [20, 'rocket', 'Explorer', '2 lessons a day · about 10 min'], [30, 'crown', 'Champion', '3 lessons a day · about 15 min']].map(([v, ic, a, b]) => `<button class="choice ${S.dailyGoal === v ? 'on' : ''}" data-goal="${v}">${IMG(ic)}<span>${a}<small>${b}</small></span></button>`).join('')}</div></div>
        <div class="onb-foot"><button class="btn" data-go="done">Continue</button></div>`;
    }
    $app.innerHTML = `<div class="onb">${top}${html}</div>`;
    $app.querySelectorAll('.duo-kids .kid').forEach((x, j) => M.liven(x, j ? ['happy', 'dance', 'idle', 'wave'] : ['wave', 'idle', 'dance', 'happy'], 2600));
    const sel = $app.querySelector('.buddy-card.on .kid'); if (sel) setTimeout(() => M.liven(sel, ['dance', 'wave', 'happy'], 2200), 1600);
    $app.querySelectorAll('.speech .kid').forEach((x) => setTimeout(() => x.setAttribute('data-mood', 'idle'), 2400));
    $app.querySelectorAll('[data-buddy]').forEach((b) => b.onclick = () => { Sfx.play('pop'); S.buddy = b.dataset.buddy; save(); onboarding('buddy'); });
    $app.querySelectorAll('[data-goal]').forEach((b) => b.onclick = () => { Sfx.play('select'); S.dailyGoal = +b.dataset.goal; save(); onboarding('goal'); });
    $app.querySelectorAll('[data-level]').forEach((b) => b.onclick = () => { Sfx.play('select'); S.level = +b.dataset.level; save(); onboarding('level'); });
    const back = $app.querySelector('[data-back]'); if (back) back.onclick = () => { Sfx.play('tap'); onboarding(ONB[i - 1]); };
    const nm = $app.querySelector('#nm'); if (nm) { nm.focus(); nm.onkeydown = (e) => { if (e.key === 'Enter') $app.querySelector('[data-go]').click(); }; }
    $app.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => {
      Sfx.play('tap');
      if (nm) S.name = nm.value.trim().slice(0, 16);
      if (b.dataset.go === 'done') { S.onboarded = true; S.quests = null; save(); afterOnboarding(); return; }
      save(); onboarding(b.dataset.go);
    });
  }
  function afterOnboarding() {
    if (S.level > 0) {
      const u = C.UNITS[S.level];
      $app.innerHTML = `<div class="onb"><div class="onb-body"><div class="speech">${M.kid(S.buddy, 'happy')}<div class="bubble">Let’s find your level! Pass a quick test and you’ll jump straight to <b>Unit ${S.level + 1}: ${esc(u.title)}</b>.</div></div></div>
        <div class="onb-foot"><button class="btn btn-violet" id="t">Take the test</button><button class="btn btn-ghost" id="s">Start from the beginning</button></div></div>`;
      document.getElementById('t').onclick = () => { Sfx.play('tap'); startTest(S.level, { thenTour: true }); };
      document.getElementById('s').onclick = () => { Sfx.play('tap'); goHomeWithTour(); };
      return;
    }
    goHomeWithTour();
  }
  function goHomeWithTour() { tab = 'learn'; render(true); if (!S.toured) setTimeout(tour, 900); }

  // ======================= LANDING TOUR =======================
  function visible(sel) { return [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }); }
  function tour() {
    if (document.querySelector('.tour-card')) return;
    const steps = [
      { sel: '#current .node-box', title: 'This is your path', text: 'Tap the glowing button to start a lesson. Each one takes about 3 minutes. Finish one to unlock the next!', mood: 'point' },
      { sel: '.unit-banner .guide-btn', title: 'Unit guidebook', text: 'Stuck? The guidebook explains each unit’s big ideas — great for grown-ups too.', mood: 'read' },
      { sel: '.stat.streak', title: 'Your streak', text: 'Learn every day to grow your flame. Streak freezes protect it if you miss a day.', mood: 'happy' },
      { sel: '.stat.hearts', title: 'Hearts', text: 'You lose a heart for each mistake. Practise to win them back — you can never get stuck.', mood: 'talk' },
      { sel: '[data-tab="quests"]', title: 'Daily quests', text: 'Three fun challenges every day. Finish them all to open a treasure chest!', mood: 'dance' },
      { sel: '[data-tab="profile"]', title: 'Your profile', text: 'See your badges and stats, or switch buddy. Grown-ups will find the teacher corner here too.', mood: 'wave' },
    ].filter((s) => visible(s.sel));
    if (!steps.length) return;
    const spot = document.createElement('div'); spot.className = 'tour-spot';
    const card = document.createElement('div'); card.className = 'tour-card';
    document.body.append(spot, card);
    let i = 0;
    const end = () => { spot.remove(); card.remove(); S.toured = true; save(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place); const c = document.getElementById('current'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    function place() {
      const s = steps[i]; const el = visible(s.sel); if (!el) return;
      const r = el.getBoundingClientRect(); const pad = 10;
      Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const cw = card.offsetWidth, ch = card.offsetHeight;
      let top = r.bottom + pad + 14; if (top + ch > innerHeight - 10) top = Math.max(10, r.top - pad - 14 - ch);
      let left = Math.min(Math.max(10, r.left + r.width / 2 - cw / 2), innerWidth - cw - 10);
      if (r.left < 120 && r.width < 300 && innerWidth > 767) { left = r.right + 24; top = Math.min(Math.max(10, r.top + r.height / 2 - ch / 2), innerHeight - ch - 10); }
      Object.assign(card.style, { left: left + 'px', top: top + 'px' });
    }
    function show() {
      const s = steps[i];
      card.innerHTML = `<div class="t-head">${M.kid(S.buddy, s.mood)}<div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></div>
        <div class="t-foot"><div class="tour-dots">${steps.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div><div style="display:flex;gap:6px"><button class="link-btn" data-skip style="padding:8px">Skip</button><button class="btn btn-sm" data-next>${i === steps.length - 1 ? 'Let’s go!' : 'Next'}</button></div></div>`;
      card.querySelector('[data-skip]').onclick = () => { Sfx.play('tap'); end(); };
      card.querySelector('[data-next]').onclick = () => { Sfx.play('whoosh'); if (++i >= steps.length) end(); else show(); };
      const el = visible(s.sel);
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > innerHeight - 80) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(place, 450); } else place();
    }
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
    show();
  }

  // ======================= LESSON ENGINE =======================
  let L = null;
  function startTest(ui, opts = {}) {
    const pool = [];
    C.UNITS.slice(0, ui).forEach((u) => u.lessons.forEach((l) => { const qs = l.steps().filter((s) => ['mcq', 'listen', 'tap', 'build'].includes(s.type)); pool.push(C.shuffle(qs).slice(0, 2)); }));
    // one question from every lesson first, then fill up to 12
    let steps = C.shuffle(pool.map((p) => p[0]).filter(Boolean));
    const extra = C.shuffle(pool.map((p) => p[1]).filter(Boolean));
    steps = steps.slice(0, 12).concat(extra).slice(0, 12);
    const fake = { u: C.UNITS[ui], ui, l: { id: 'test-' + ui, title: `Jump to Unit ${ui + 1}`, steps: () => steps }, li: 0 };
    startLesson(fake, { test: { ui, lives: 3, thenTour: !!opts.thenTour } });
  }
  function startLesson(f, opts = {}) {
    tickHearts(); closePops();
    if (!S.settings.classMode && S.hearts <= 0 && !opts.practice && !opts.test) { outOfHearts(f, true); return; }
    let steps = f.l.steps();
    if (opts.practice) steps = C.shuffle(steps.filter((s) => s.type !== 'teach')).slice(0, 6);
    steps = steps.map((s) => (s.type === 'listen' && !canSpeak(s.say) ? { ...s, type: 'mcq', prompt: s.fallback } : s));
    const inf = S.settings.classMode || opts.practice;
    L = { f, queue: steps, doneCount: 0, mistakes: 0, graded: 0, correct: 0, combo: 0, bestCombo: 0, comboBonus: 0, start: Date.now(), practice: !!opts.practice, test: opts.test || null, replay: !!S.done[f.l.id], requeues: new Map() };
    const hearts = L.test ? `<span class="test-tag">Test</span><div class="lesson-hearts" id="lh">${IMG('heart')}<span>${L.test.lives}</span></div>` : `<div class="lesson-hearts ${inf ? 'inf' : ''}" id="lh">${IMG('heart')}<span>${inf ? '∞' : S.hearts}</span></div>`;
    $app.innerHTML = `<div class="lesson c-${f.u.color}"><div class="lesson-top"><button class="x-btn" id="quit" aria-label="Quit">${V.close}</button>
      <div class="progress" id="prog"><i style="width:0%"></i></div>${hearts}</div>
      <div class="lesson-body" id="lb"></div>
      <div class="lesson-foot" id="foot"><div class="foot-in"><button class="btn" id="check" disabled>Check</button></div></div>
      <div class="sheet" id="sheet"><div class="sheet-in"></div></div></div>`;
    document.getElementById('quit').onclick = () => { Sfx.play('tap'); quitLesson(); };
    document.onkeydown = lessonKeys;
    window.scrollTo(0, 0);
    nextExercise();
  }
  function quitLesson() {
    const what = L && L.test ? 'test' : 'lesson';
    modal(`${M.kid(S.buddy, 'sad')}<h2>Leave this ${what}?</h2><p>Your progress here won’t be saved.</p><button class="btn" data-x>Keep learning</button><button class="link-btn" style="color:var(--red)" data-y>End ${what}</button>`,
      (m, close) => { m.querySelector('[data-x]').onclick = () => { Sfx.play('tap'); close(); }; m.querySelector('[data-y]').onclick = () => { close(); endRun(); tab = 'learn'; render(true); }; });
  }
  function endRun() { L = null; document.onkeydown = null; if (curAudio) curAudio.pause(); }
  function setProgress() {
    const p = document.getElementById('prog'); if (!p || !L) return;
    p.querySelector('i').style.width = (L.doneCount / (L.doneCount + L.queue.length)) * 100 + '%';
    p.classList.toggle('hot', L.combo >= 3);
    const old = p.querySelector('.combo-tag'); if (old) old.remove();
    if (L.combo >= 3) p.insertAdjacentHTML('beforeend', `<span class="combo-tag">🔥 ${L.combo} IN A ROW</span>`);
  }
  let EX = null;
  function nextExercise() {
    setProgress();
    if (!L.queue.length) { finishLesson(); return; }
    const ex = L.queue[0]; window.__qqEx = ex; // exposed for automated play-testing
    const lb = document.getElementById('lb'), check = document.getElementById('check'), foot = document.getElementById('foot');
    document.getElementById('sheet').className = 'sheet';
    foot.classList.remove('hidden');
    check.disabled = true; check.textContent = 'Check';
    lb.innerHTML = ''; const wrap = document.createElement('div'); wrap.className = 'ex'; lb.appendChild(wrap);
    window.scrollTo(0, 0);
    const ctx = { setReady: (v) => (check.disabled = !v), finish: (res) => showFeedback(res, ex) };
    EX = RENDER[ex.type](wrap, ex, ctx);
    if (ex.type === 'teach') { check.disabled = false; check.textContent = 'Continue'; check.onclick = () => { Sfx.play('tap'); L.queue.shift(); L.doneCount++; nextExercise(); }; }
    else if (ex.type === 'match' || ex.type === 'sort') foot.classList.add('hidden');
    else check.onclick = () => showFeedback(EX.check(), ex);
  }
  const PRAISE = ['Amazing!', 'Mashā’Allāh!', 'Brilliant!', 'Great job!', 'You got it!', 'Super!', 'Nailed it!'];
  function showFeedback(r, ex) {
    if (!L) return; // the lesson already ended (quit or out of hearts) before a delayed result arrived
    const graded = !['match', 'sort'].includes(ex.type);
    L.graded++; S.stats.answered++;
    if (r.correct) { L.correct++; S.stats.correct++; L.combo++; L.bestCombo = Math.max(L.bestCombo, L.combo); }
    else { L.mistakes++; L.combo = 0; }
    const lh = document.getElementById('lh');
    const shakeHeart = () => { lh.classList.remove('lose'); void lh.offsetWidth; lh.classList.add('lose'); };
    if (!r.correct && graded) {
      if (L.test) { L.test.lives--; lh.querySelector('span').textContent = L.test.lives; shakeHeart(); }
      else {
        if (!S.settings.classMode && !L.practice) { S.hearts = Math.max(0, S.hearts - 1); if (S.hearts === MAX_HEARTS - 1) S.heartsAt = Date.now(); lh.querySelector('span').textContent = S.hearts; shakeHeart(); }
        const n = L.requeues.get(ex) || 0;
        if (n < 2) { L.requeues.set(ex, n + 1); L.queue.push(ex); }
      }
    }
    L.queue.shift(); L.doneCount++;
    save();
    Sfx.play(r.correct ? 'correct' : 'wrong'); buzz(r.correct ? 12 : [30, 50, 30]);
    if (r.correct && [5, 10, 15, 20].includes(L.combo)) { L.comboBonus = Math.min(5, L.comboBonus + (L.combo === 5 ? 2 : 1)); const c = L.combo; setTimeout(() => comboBurst(c), 250); }
    setProgress();
    const sheet = document.getElementById('sheet');
    const title = r.correct ? (ex.type === 'match' ? 'Perfect pairs!' : ex.type === 'sort' ? 'Sorted!' : C.pick(PRAISE)) : graded ? 'Not quite!' : 'Done — good effort!';
    const ok = r.correct || !graded;
    let msg = '';
    if (!r.correct && graded) msg = `Correct answer: ${rich(r.answer)}`;
    if (r.explain) msg += `${msg ? '<br>' : ''}${rich(r.explain)}`;
    if (!graded && r.mistakes) msg = `${r.mistakes} slip${r.mistakes > 1 ? 's' : ''} — keep practising!`;
    sheet.className = `sheet ${ok ? 'ok' : 'bad'}`;
    sheet.querySelector('.sheet-in').innerHTML = `<div class="sheet-head">${M.kid(S.buddy, ok ? C.pick(['happy', 'celebrate', 'clap', 'nod', 'happy']) : C.pick(['sad', 'shrug', 'shake']))}<div><h3>${title}</h3>${msg ? `<p>${msg}</p>` : ''}</div></div><button class="btn ${ok ? '' : 'btn-red'}" id="cont">Continue</button>`;
    requestAnimationFrame(() => sheet.classList.add('show'));
    document.getElementById('foot').classList.add('hidden');
    const cont = document.getElementById('cont');
    cont.onclick = () => {
      Sfx.play('tap');
      if (L.test && L.test.lives <= 0) { finishTest(false); return; }
      if (!L.test && !S.settings.classMode && !L.practice && S.hearts <= 0) { outOfHearts(L.f, false); return; }
      nextExercise();
    };
    cont.focus({ preventScroll: true });
  }
  function comboBurst(n) {
    Sfx.play('combo');
    const d = document.createElement('div'); d.className = 'combo-burst';
    d.innerHTML = `${M.kid(S.buddy, 'happy')}<b>${IMG('fire')}${n} in a row!</b>`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 1600);
  }
  function lessonKeys(e) {
    if (document.querySelector('.modal-bg')) return;
    const sheet = document.getElementById('sheet');
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sheet && sheet.classList.contains('show')) document.getElementById('cont').click();
      else { const c = document.getElementById('check'); if (c && !c.disabled && !document.getElementById('foot').classList.contains('hidden')) c.click(); }
    } else if (/^[1-9]$/.test(e.key) && EX && EX.key) EX.key(+e.key);
  }
  function outOfHearts(f, before) {
    modal(`${M.kid(S.buddy, 'think')}<h2>Out of hearts!</h2><p>Every mistake helps you learn. Win your hearts back with a quick practice — or use gems.</p>
      <button class="btn" data-p>Practise to refill ❤️</button><button class="btn btn-sky" data-g ${S.gems < REFILL_COST ? 'disabled' : ''}>Refill · ${REFILL_COST} gems</button><button class="link-btn" data-x>${before ? 'Not now' : 'End lesson'}</button>`,
      (m, close) => {
        m.querySelector('[data-p]').onclick = () => { close(); endRun(); const done = FLAT.filter((x) => S.done[x.l.id]); startLesson(done.length ? C.pick(done) : f, { practice: true }); };
        m.querySelector('[data-g]').onclick = () => { S.gems -= REFILL_COST; S.hearts = MAX_HEARTS; save(); Sfx.play('heart'); close(); if (before) startLesson(f); else { document.getElementById('lh').querySelector('span').textContent = S.hearts; nextExercise(); } };
        m.querySelector('[data-x]').onclick = () => { close(); endRun(); tab = 'learn'; render(true); };
      });
  }

  // ----- exercise renderers -----
  const optLabel = (o, ar) => `<span class="t ${ar ? (isQ(o) ? 'qr' : 'ar') : ''}">${ar ? esc(o) : rich(o)}</span>`;
  const refTag = (r) => (r ? `<span class="ref-tag">${IMG('book')}${esc(r)}</span>` : '');
  const speakBtn = (say, cls = '') => (canSpeak(say) ? `<button class="speak ${cls}" data-say="${esc(say)}" aria-label="Listen">${V.speaker}</button>` : '');
  function bindSpeak(w) { w.querySelectorAll('[data-say]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.say, b.dataset.slow, b); }); }

  const RENDER = {
    teach(w, ex) {
      let visual = '';
      if (ex.big) visual = `<div class="glyph-card"><div class="g">${esc(ex.big)}</div>${speakBtn(ex.say)}</div>`;
      else if (ex.bigQ) visual = `<div class="glyph-card"><div class="g qr">${esc(ex.bigQ)}</div>${speakBtn(ex.say || ex.bigQ)}</div>`;
      else if (ex.bigRow) visual = `<div class="glyph-row">${ex.bigRow.map((c) => `<span class="chip ${/^[+=→]$/.test(c) ? 'op' : ''}">${esc(c)}</span>`).join('')}</div>${ex.say ? `<div>${speakBtn(ex.say)}</div>` : ''}`;
      else if (ex.ayah) visual = `<div class="ayah-box">${esc(C.AYAH[ex.ayah])}</div>`;
      w.innerHTML = `<span class="new-badge ${/PATTERN/.test(ex.kicker || '') ? 'pattern' : /QUR/.test(ex.kicker || '') ? 'quran' : ''}">${V.spark}<b>${esc(ex.kicker || 'NEW')}</b></span>
        <div class="teach-card">${visual}<h2>${rich(ex.title)}</h2>${ex.sub ? `<p>${rich(ex.sub)}</p>` : ''}${refTag(ex.quranRef)}</div>
        <div class="tip-row">${M.kid(S.buddy, ex.mood || 'talk')}<div class="bubble">${ex.tip ? rich(ex.tip) : C.pick(['Look closely!', 'Can you see it?', 'Say it out loud!', 'Easy peasy!'])}</div></div>`;
      bindSpeak(w);
      const k = w.querySelector('.tip-row .kid'); setTimeout(() => k && k.setAttribute('data-mood', ex.mood === 'happy' ? 'dance' : 'idle'), 2600);
      const say = ex.say || ex.bigQ; if (canSpeak(say)) setTimeout(() => speak(say, false, w.querySelector('[data-say]')), 400);
      return {};
    },
    mcq(w, ex, ctx) {
      const opts = C.shuffle(ex.options);
      const ar = ex.arOptions || opts.every((o) => AR_RE.test(o));
      const cols = ar && opts.every((o) => o.length <= 8);
      w.innerHTML = `<h2 class="ex-prompt">${rich(ex.prompt)}</h2>${refTag(ex.quranRef)}
        ${ex.big ? `<div class="glyph-card"><div class="g ${isQ(ex.big) ? 'qr' : ''}">${esc(ex.big)}</div>${speakBtn(ex.big)}</div>` : ''}
        ${ex.gloss ? `<p class="gloss">“${esc(ex.gloss)}”</p>` : ''}
        <div class="opts ${cols ? 'cols' : ''} n${opts.length}">${opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${i + 1}</span>${optLabel(o, ar)}</button>`).join('')}</div>`;
      bindSpeak(w);
      let sel = -1;
      const choose = (i) => { sel = i; Sfx.play('select'); w.querySelectorAll('.opt').forEach((b, j) => b.classList.toggle('sel', j === i)); ctx.setReady(true); if (ar && canSpeak(opts[i])) speak(opts[i]); };
      w.querySelectorAll('.opt').forEach((b) => b.onclick = () => choose(+b.dataset.i));
      return {
        key: (n) => n <= opts.length && choose(n - 1),
        check() {
          w.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; if (opts[j] === ex.correct) b.classList.add('good'); else if (j === sel) b.classList.add('bad'); else b.classList.add('dim'); });
          return { correct: opts[sel] === ex.correct, answer: ex.correct, explain: ex.explain };
        },
      };
    },
    listen(w, ex, ctx) {
      const c = RENDER.mcq(w, { ...ex, big: null }, ctx);
      w.querySelector('.ex-prompt').insertAdjacentHTML('afterend', `<div style="display:flex;justify-content:center;align-items:flex-end;gap:16px"><button class="speak big-speak" data-say="${esc(ex.say)}" aria-label="Play sound">${V.speaker}</button><button class="speak slow-speak" data-say="${esc(ex.say)}" data-slow="1" aria-label="Play slowly">${IMG('turtle')}</button></div>`);
      bindSpeak(w); setTimeout(() => speak(ex.say, false, w.querySelector('.big-speak')), 350);
      return c;
    },
    match(w, ex, ctx) {
      const left = C.shuffle(ex.pairs.map((p, i) => ({ t: p[0], i })));
      const right = C.shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })));
      const isAr = (t) => AR_RE.test(t) && !ex.latinLeft;
      w.innerHTML = `<h2 class="ex-prompt">${rich(ex.prompt)}</h2><div class="match"><div class="col">${left.map((x) => `<button class="mt ${isAr(x.t) ? 'ar' : ''}" data-s="L" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div>
        <div class="col">${right.map((x) => `<button class="mt" data-s="R" data-i="${x.i}">${rich(x.t)}</button>`).join('')}</div></div>`;
      let a = null, mistakes = 0, matched = 0;
      w.querySelectorAll('.mt').forEach((b) => b.onclick = () => {
        if (b.classList.contains('gone') || b.classList.contains('good')) return;
        if (a && a.dataset.s === b.dataset.s) a.classList.remove('sel');
        if (a === b) { a = null; return; }
        if (!a || a.dataset.s === b.dataset.s) { a = b; b.classList.add('sel'); Sfx.play('select'); if (b.dataset.s === 'L' && canSpeak(b.textContent)) speak(b.textContent); return; }
        const x = a, y = b; a = null;
        if (x.dataset.i === y.dataset.i) {
          [x, y].forEach((e) => { e.classList.remove('sel'); e.classList.add('good'); }); Sfx.play('match', matched); buzz(8); matched++;
          setTimeout(() => [x, y].forEach((e) => e.classList.add('gone')), 380);
          if (matched === ex.pairs.length) setTimeout(() => ctx.finish({ correct: mistakes === 0, mistakes }), 600);
        } else {
          mistakes++; Sfx.play('soft-wrong'); buzz(30);
          [x, y].forEach((e) => { e.classList.remove('sel'); e.classList.add('bad'); }); setTimeout(() => [x, y].forEach((e) => e.classList.remove('bad')), 450);
        }
      });
      return {};
    },
    sort(w, ex, ctx) {
      const items = ex.items.slice(); let k = 0, mistakes = 0;
      const counts = ex.buckets.map(() => 0);
      const bIcon = (b) => (b.cls === 'sun' ? IMG('sun') : b.cls === 'moon' ? IMG('moon') : '');
      w.innerHTML = `<h2 class="ex-prompt">${rich(ex.prompt)}</h2><div class="sort-stage"><span class="sort-left" id="left"></span><div id="cardslot"></div>
        <div class="buckets n${ex.buckets.length}">${ex.buckets.map((b, i) => `<button class="bucket ${b.cls || ''}" data-b="${i}">${bIcon(b)}${rich(b.cls === 'sun' ? 'Sun' : b.cls === 'moon' ? 'Moon' : b.label)}<span class="cnt">0</span></button>`).join('')}</div></div>`;
      const slot = w.querySelector('#cardslot');
      const show = () => {
        w.querySelector('#left').textContent = `${items.length - k} left`;
        const it = items[k];
        slot.innerHTML = `<div class="sort-card"><div class="g ${it.quran || isQ(it.t) ? 'qr' : 'ar'}">${esc(it.t)}</div>${it.gloss ? `<small>${esc(it.gloss)}</small>` : ''}${it.k ? `<small>📖 ${esc(C.ref(it.k))}</small>` : ''}</div>`;
        if (canSpeak(it.t)) speak(it.t);
      };
      let busy = false;
      w.querySelectorAll('.bucket').forEach((b) => b.onclick = () => {
        if (busy) return; const it = items[k]; const bi = +b.dataset.b; const card = slot.querySelector('.sort-card');
        if (bi === it.b) {
          busy = true; Sfx.play('match', k); buzz(8); counts[bi]++; b.querySelector('.cnt').textContent = counts[bi]; b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
          card.classList.add('fly-' + Math.min(bi, 3));
          setTimeout(() => { busy = false; k++; if (k >= items.length) ctx.finish({ correct: mistakes === 0, mistakes }); else show(); }, 330);
        } else { mistakes++; Sfx.play('soft-wrong'); buzz(30); card.classList.remove('bad'); void card.offsetWidth; card.classList.add('bad'); }
      });
      show();
      return {};
    },
    tap(w, ex, ctx) {
      w.innerHTML = `<h2 class="ex-prompt">${rich(ex.prompt)}</h2>${refTag(ex.ref)}<div class="ayah-tap">${ex.words.map((t, i) => `<button class="wd" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
      let sel = -1;
      const ok = (i) => (ex.byIndex ? ex.answers.includes(i) : ex.answers.includes(ex.words[i]));
      w.querySelectorAll('.wd').forEach((b) => b.onclick = () => { sel = +b.dataset.i; Sfx.play('select'); w.querySelectorAll('.wd').forEach((x, j) => x.classList.toggle('sel', j === sel)); ctx.setReady(true); });
      return {
        key: (n) => { const b = w.querySelectorAll('.wd')[n - 1]; if (b) b.click(); },
        check() {
          w.querySelectorAll('.wd').forEach((b, j) => { b.disabled = true; b.classList.remove('sel'); if (ok(j)) b.classList.add('good'); else if (j === sel) b.classList.add('bad'); });
          return { correct: ok(sel), answer: ex.byIndex ? ex.answers.map((i) => ex.words[i]).join(' / ') : ex.answers.join(' / '), explain: ex.explain };
        },
      };
    },
    build(w, ex, ctx) {
      const tiles = ex.tiles.map((t, i) => ({ t, i }));
      let line = [];
      w.innerHTML = `<h2 class="ex-prompt">${rich(ex.prompt)}</h2>${ex.gloss ? `<p class="gloss" style="margin-top:-8px">“${rich(ex.gloss)}”</p>` : ''}
        <div class="build-preview" id="pv"></div><div class="build-line" id="line"></div><div class="bank" id="bank">${tiles.map((x) => `<button class="tile" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div>`;
      const pv = w.querySelector('#pv'), lineEl = w.querySelector('#line'), bank = w.querySelector('#bank');
      const draw = () => {
        lineEl.innerHTML = line.map((i) => `<button class="tile" data-l="${i}">${esc(tiles[i].t)}</button>`).join('');
        bank.querySelectorAll('.tile').forEach((b) => b.classList.toggle('used', line.includes(+b.dataset.i)));
        const word = line.map((i) => tiles[i].t).join('');
        pv.textContent = word || 'Tap the pieces in order (right → left)'; pv.classList.toggle('empty', !word);
        ctx.setReady(line.length > 0);
        lineEl.querySelectorAll('[data-l]').forEach((b) => b.onclick = () => { Sfx.play('tap'); line = line.filter((x) => x !== +b.dataset.l); draw(); });
      };
      bank.querySelectorAll('.tile').forEach((b) => b.onclick = () => { const i = +b.dataset.i; if (line.includes(i)) return; Sfx.play('select'); line.push(i); draw(); if (canSpeak(tiles[i].t)) speak(tiles[i].t); });
      draw();
      return {
        key: (n) => { const b = bank.querySelectorAll('.tile')[n - 1]; if (b) b.click(); },
        check() {
          const got = line.map((i) => tiles[i].t);
          const good = got.length === ex.target.length && got.every((t, i) => t === ex.target[i]);
          lineEl.querySelectorAll('.tile').forEach((b) => (b.disabled = true)); bank.querySelectorAll('.tile').forEach((b) => (b.disabled = true));
          if (canSpeak(ex.target.join(''))) speak(ex.target.join(''));
          return { correct: good, answer: ex.target.join(''), explain: good ? `${ex.target.join('')}${ex.gloss ? ' = ' + ex.gloss : ''}` : '' };
        },
      };
    },
  };

  // ======================= FINISH FLOW =======================
  function flow(screens, end) { let i = 0; const next = () => { if (i < screens.length) screens[i++](next); else end(); }; next(); }
  function finishTest(passedArg) {
    const t = L.test;
    const pass = passedArg !== false && t.lives > 0;
    const acc = L.graded ? Math.round((L.correct / L.graded) * 100) : 100;
    if (pass) {
      C.UNITS.slice(0, t.ui).forEach((u) => u.lessons.forEach((l) => { if (!S.done[l.id]) S.done[l.id] = { stars: 1, best: acc, tested: true }; }));
      S.xp += 15; S.history[today()] = (S.history[today()] || 0) + 15;
      if (S.lastDay !== today()) { S.streak = S.lastDay && dayDiff(S.lastDay, today()) === 1 ? S.streak + 1 : 1; S.lastDay = today(); S.bestStreak = Math.max(S.bestStreak, S.streak); }
    }
    const badges = pass ? newBadges() : [];
    save(); endRun();
    const home = () => { if (t.thenTour) goHomeWithTour(); else { tab = 'learn'; render(true); } };
    const screens = [(n) => {
      shellScreen(`${M.kid(S.buddy, pass ? 'happy' : 'think')}<h1 style="color:${pass ? 'var(--violet)' : 'var(--ink)'}">${pass ? `You jumped to Unit ${t.ui + 1}!` : 'Nice try!'}</h1>
        <p style="margin:0;font-size:18px;color:var(--ink-2)">${pass ? `Mashā’Allāh — you already know ${t.ui === 1 ? 'Unit 1' : `Units 1–${t.ui}`}. Welcome to <b>${esc(C.UNITS[t.ui].title)}</b>!` : `That’s okay — ${t.ui > 1 ? 'the earlier units' : 'the letters'} will make you even stronger. You can try the test again any time.`}</p>
        ${pass ? `<div class="tiles3" style="max-width:380px"><div class="rtile" style="--c:var(--gold)"><div class="lab">XP</div><div class="val">${IMG('glowing-star')}15</div></div><div class="rtile" style="--c:var(--blue)"><div class="lab">Score</div><div class="val">${IMG('target')}${acc}%</div></div><div class="rtile" style="--c:var(--violet)"><div class="lab">Unit</div><div class="val">${IMG('key')}${t.ui + 1}</div></div></div>` : ''}`, 'Continue', n);
      if (pass) { Sfx.play('complete'); confetti(); M.liven($app.querySelector('.result .kid'), ['happy', 'dance'], 2000); } else Sfx.play('soft-wrong');
    }];
    badges.forEach((b) => screens.push((n) => badgeScreen(b, n)));
    flow(screens, home);
  }
  function finishLesson() {
    if (L.test) { finishTest(); return; }
    const { f } = L;
    const secs = Math.round((Date.now() - L.start) / 1000);
    const acc = L.graded ? Math.round((L.correct / L.graded) * 100) : 100;
    const perfect = L.mistakes === 0;
    const xp = (L.practice || L.replay ? 5 : 10) + (perfect ? 5 : 0) + L.comboBonus;
    const stars = acc >= 95 ? 3 : acc >= 75 ? 2 : 1;
    const r = { xp, acc, mistakes: L.mistakes, bestCombo: L.bestCombo, secs, stars, perfect };
    const practice = L.practice;
    S.xp += xp; S.history[today()] = (S.history[today()] || 0) + xp;
    S.stats.lessons++; if (perfect) S.stats.perfect++; S.stats.bestCombo = Math.max(S.stats.bestCombo, L.bestCombo);
    if (practice) { S.hearts = MAX_HEARTS; S.heartsAt = Date.now(); }
    else { const prev = S.done[f.l.id]; S.done[f.l.id] = { stars: Math.max(stars, prev ? prev.stars : 0), best: Math.max(acc, prev ? prev.best : 0) }; }
    let streakUp = null;
    if (S.lastDay !== today()) {
      const from = S.streak; S.streak = S.lastDay && dayDiff(S.lastDay, today()) === 1 ? S.streak + 1 : 1; S.lastDay = today();
      S.bestStreak = Math.max(S.bestStreak, S.streak); streakUp = { from, to: S.streak };
      if (S.streak % 7 === 0 && S.freezes < MAX_FREEZES) { S.freezes++; streakUp.freeze = true; }
      if ([3, 7, 14, 30, 50, 100].includes(S.streak)) { const g = S.streak >= 30 ? 50 : 20; S.gems += g; streakUp.gems = g; }
    }
    const quests = bumpQuests(r);
    const badges = newBadges();
    save(); endRun();
    const screens = [(n) => resultScreen(r, practice, n)];
    if (streakUp) screens.push((n) => streakScreen(streakUp, n));
    if (quests.length) screens.push((n) => questScreen(quests, n));
    badges.forEach((b) => screens.push((n) => badgeScreen(b, n)));
    flow(screens, () => { tab = 'learn'; render(true); });
  }
  function shellScreen(html, btn, onBtn) {
    $app.innerHTML = `<div class="result"><div class="result-body">${html}</div><button class="btn" id="go">${btn}</button></div>`;
    const go = document.getElementById('go'); go.onclick = () => { Sfx.play('tap'); document.onkeydown = null; onBtn(); }; go.focus({ preventScroll: true });
    document.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } };
  }
  function countUp(el, to, ms = 900) {
    const t0 = performance.now(); let last = -1;
    (function step(t) { if (!el || !el.isConnected) return; const p = Math.min(1, (t - t0) / ms); const v = Math.round(to * (1 - Math.pow(1 - p, 3))); if (v !== last) { el.textContent = v; last = v; if (v % 2 === 0) Sfx.play('tick'); } if (p < 1) requestAnimationFrame(step); })(t0);
  }
  function resultScreen(r, practice, next) {
    const mm = `${Math.floor(r.secs / 60)}:${String(r.secs % 60).padStart(2, '0')}`;
    shellScreen(`${M.kid(S.buddy, 'happy')}<h1>${practice ? 'Hearts refilled!' : r.perfect ? 'Perfect lesson!' : 'Lesson complete!'}</h1>
      ${practice ? `<div class="hearts-row">${Array.from({ length: MAX_HEARTS }, () => IMG('heart')).join('')}</div>` : `<div class="stars-big">${[1, 2, 3].map((n) => IMG('star', n <= r.stars ? '' : 'off')).join('')}</div>`}
      <div class="tiles3"><div class="rtile" style="--c:var(--gold)"><div class="lab">Total XP</div><div class="val">${IMG('glowing-star')}<span id="xpv">0</span></div></div>
      <div class="rtile" style="--c:var(--blue)"><div class="lab">${r.acc >= 90 ? 'Amazing' : r.acc >= 70 ? 'Good' : 'Accuracy'}</div><div class="val">${IMG('target')}<span>${r.acc}%</span></div></div>
      <div class="rtile" style="--c:var(--violet)"><div class="lab">${r.secs < 150 ? 'Speedy' : 'Time'}</div><div class="val">${IMG('stopwatch')}<span>${mm}</span></div></div></div>
      ${r.bestCombo >= 5 ? `<p class="muted" style="margin:0">Best combo: ${r.bestCombo} in a row ⚡</p>` : ''}`, 'Continue', next);
    Sfx.play('complete'); confetti(); buzz([20, 60, 20]);
    M.liven($app.querySelector('.result .kid'), ['happy', 'dance', 'happy', 'wave'], 1800);
    setTimeout(() => countUp(document.getElementById('xpv'), r.xp), 400);
  }
  function streakScreen(s, next) {
    shellScreen(`<div class="streak-hero">${IMG('fire')}</div><div class="streak-num roll">${s.to}</div><h1 style="color:var(--orange)">day streak!</h1>
      ${weekHTML(true)}<p style="margin:0;font-size:17px;color:var(--ink-2)">${s.to === 1 ? 'Your streak has started! Come back tomorrow to grow it.' : `Mashā’Allāh — ${s.to} days in a row!`}${s.gems ? `<br><b style="color:var(--sky)">+${s.gems} gems streak bonus!</b>` : ''}${s.freeze ? '<br><b style="color:var(--sky)">+1 free streak freeze ❄️</b>' : ''}</p>`, 'Continue', next);
    Sfx.play('streak'); buzz([30, 30, 60]);
  }
  function questScreen(qs, next) {
    shellScreen(`${M.kid(S.buddy, 'dance')}<h1 style="color:var(--violet)">Quest complete!</h1><div class="card" style="width:100%;text-align:left">${qs.map((q) => `<div class="quest done">${IMG(q.icon)}<div style="flex:1"><h4>${esc(q.label)}</h4><div class="bar"><i style="width:100%"></i></div></div><b style="color:var(--sky);display:flex;align-items:center;gap:4px">${IMG('gem')}+10</b></div>`).join('')}</div>`, 'Continue', next);
    Sfx.play('chest');
  }
  function badgeScreen(b, next) {
    shellScreen(`<div class="big-badge">${IMG(b.icon)}</div><h1 style="color:var(--violet)">New badge!</h1><p style="font-size:20px;margin:0"><b>${esc(b.name)}</b></p><p class="muted" style="margin:0">${esc(b.desc)}</p>`, 'Awesome!', next);
    Sfx.play('badge'); confetti(90);
  }

  // ======================= BOOT =======================
  function boot() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    load(); tickHearts();
    document.addEventListener('click', closePops);
    window.addEventListener('scroll', () => document.querySelectorAll('.stat-pop').forEach((p) => p.remove()), { passive: true });
    const s = checkStreak(); save();
    if (!S.onboarded) { onboarding(); return; }
    render(true);
    if (!S.toured) setTimeout(tour, 900);
    if (s && s.type === 'frozen') setTimeout(() => modal(`<div style="align-self:center">${IMG('snowflake').replace('class="ico', 'style="width:96px;height:96px" class="ico')}</div><h2>Streak saved!</h2><p>A streak freeze protected your ${S.streak}-day streak while you were away. Welcome back!</p><button class="btn btn-sky" data-x>Yay!</button>`, (m, c) => (m.querySelector('[data-x]').onclick = c)), 400);
    if (s && s.type === 'reset' && s.lost >= 2) setTimeout(() => modal(`${M.kid(S.buddy, 'wave')}<h2>Welcome back!</h2><p>Your ${s.lost}-day streak took a rest. Every day is a fresh start — let’s begin a new one!</p><button class="btn" data-x>Let’s go</button>`, (m, c) => (m.querySelector('[data-x]').onclick = c)), 400);
  }
  window.QQ_APP = { get state() { return S; }, render, tour, chestSVG };
  boot();
})();
