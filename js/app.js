/* Qalam Quest — game engine */
(function () {
  'use strict';
  const C = window.QQ_CONTENT;
  const M = window.QQ_MASCOT;
  const $app = document.getElementById('app');
  const AR_RE = /[؀-ۿ]/;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // wrap Arabic runs inside a latin string so they get the Arabic font
  const rich = (s) => esc(s).replace(/([؀-ۿ][؀-ۿً-ٰٟۖ-ۭ\s]*[؀-ۿً-ٰٟۖ-ۭ]|[؀-ۿ])/g, (m) => `<span class="${/[ٱ۟-ٰۭ]/.test(m) ? 'qr' : 'ar'}">${m}</span>`);
  const isQ = (s) => /[ٱ۟-ۭ]/.test(s); // Uthmani-specific marks → Qur'an font

  // ======================= STATE =======================
  const KEY = 'qalamquest.v1';
  const MAX_HEARTS = 5;
  const HEART_MS = 20 * 60 * 1000;
  const FREEZE_COST = 50, REFILL_COST = 30, MAX_FREEZES = 2;
  const fresh = () => ({
    v: 1, onboarded: false, buddy: 'huda', name: '', dailyGoal: 20,
    xp: 0, gems: 20, hearts: MAX_HEARTS, heartsAt: Date.now(),
    streak: 0, bestStreak: 0, lastDay: null, freezes: 1, frozenDays: [],
    history: {}, done: {}, chests: [], badges: [], quests: null,
    settings: { sound: true, tts: true, classMode: false, unlockAll: false },
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
  // Called on open: protect the streak with freezes, or gently reset it.
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
    { id: 'lessons2', icon: '📚', label: 'Complete 2 lessons', n: 2, m: 'lessons' },
    { id: 'combo5', icon: '⚡', label: 'Get 5 answers in a row', n: 5, m: 'combo' },
    { id: 'acc90', icon: '🎯', label: 'Score 90% or more in a lesson', n: 1, m: 'acc90' },
    { id: 'perfect', icon: '💯', label: 'Finish a lesson with no mistakes', n: 1, m: 'perfect' },
    { id: 'combo8', icon: '🔥', label: 'Get 8 answers in a row', n: 8, m: 'combo' },
    { id: 'lessons3', icon: '🚀', label: 'Complete 3 lessons', n: 3, m: 'lessons' },
  ];
  function ensureQuests() {
    if (S.quests && S.quests.day === today()) return;
    const seed = today().split('-').reduce((a, b) => a * 31 + +b, 7);
    const pool = QUEST_POOL.slice(); const picks = [];
    let x = seed; while (picks.length < 2) { x = (x * 9301 + 49297) % 233280; const i = x % pool.length; picks.push(pool.splice(i, 1)[0]); }
    S.quests = { day: today(), claimedChest: false, list: [{ id: 'goal', icon: '⭐', label: `Earn ${S.dailyGoal} XP`, n: S.dailyGoal, m: 'xp', p: 0 }, ...picks.map((q) => ({ ...q, p: 0 }))] };
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
  const BADGES = [
    { id: 'first', icon: '🌱', name: 'First Steps', desc: 'Finish your first lesson', test: () => S.stats.lessons >= 1 },
    ...C.UNITS.map((u, i) => ({ id: 'unit-' + u.id, icon: ['🔤', '🎵', '🧵', '🛑', '☀️', '👃', '🔍'][i], name: ['Letter Legend', 'Vowel Voyager', 'Stretch Star', 'Stop & Double', 'Sun & Moon', 'Tajwīd Hero', 'Word Detective'][i], desc: `Finish Unit ${i + 1}`, test: () => u.lessons.every((l) => S.done[l.id]) })),
    { id: 'streak3', icon: '🔥', name: 'On Fire', desc: 'Reach a 3-day streak', test: () => S.bestStreak >= 3 },
    { id: 'streak7', icon: '🏅', name: 'Week Warrior', desc: 'Reach a 7-day streak', test: () => S.bestStreak >= 7 },
    { id: 'perfect3', icon: '💯', name: 'Perfectionist', desc: '3 perfect lessons', test: () => S.stats.perfect >= 3 },
    { id: 'combo10', icon: '⚡', name: 'Lightning', desc: '10 right in a row', test: () => S.stats.bestCombo >= 10 },
    { id: 'xp500', icon: '💎', name: 'XP Explorer', desc: 'Earn 500 XP', test: () => S.xp >= 500 },
  ];
  function newBadges() { const n = BADGES.filter((b) => !S.badges.includes(b.id) && b.test()); n.forEach((b) => S.badges.push(b.id)); return n; }

  // ======================= SOUND =======================
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
        case 'badge': [523, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, i * 0.08, 0.25, 'triangle', 0.13)); break;
      }
    },
  };
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* noop */ } };

  // ======================= SPEECH =======================
  let arVoice = null;
  function loadVoices() { if (!window.speechSynthesis) return; const vs = speechSynthesis.getVoices(); arVoice = vs.find((v) => /^ar/i.test(v.lang)) || null; }
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  const canSpeak = () => !!(arVoice && S.settings.tts);
  function speak(text, slow) {
    if (!canSpeak()) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.voice = arVoice; u.lang = arVoice.lang; u.rate = slow ? 0.45 : 0.75; speechSynthesis.speak(u);
  }

  // ======================= ICONS =======================
  const I = {
    flame: '<svg viewBox="0 0 32 32"><path d="M16 2c1 5 7 8 7 15a7 7 0 0 1-14 0c0-3 1.5-5 3-6.5 0 2.5 1 4 2.5 4.5C13 11 14 6 16 2z" fill="currentColor"/><path d="M16 15c.5 2.5 3.5 3.5 3.5 6.5a3.5 3.5 0 0 1-7 0c0-2 1.5-3.5 3.5-6.5z" fill="#FFE08A"/></svg>',
    flameBig: '<svg class="flame" viewBox="0 0 64 64"><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC233"/><stop offset="1" stop-color="#FF7A1A"/></linearGradient></defs><path d="M32 3c2 10 15 16 15 31a15 15 0 0 1-30 0c0-6 3-11 6-14 0 5 2 8 5 9-1-9 1-18 4-26z" fill="url(#fg)"/><path d="M32 30c1 5 7 7 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13z" fill="#FFF0B3"/></svg>',
    gem: '<svg viewBox="0 0 32 32"><path d="M8 5h16l6 8-14 15L2 13z" fill="currentColor"/><path d="M8 5l4 8h8l4-8M2 13h28M12 13l4 15 4-15" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    heart: '<svg viewBox="0 0 32 32"><path d="M16 28S3 20 3 11.5A6.5 6.5 0 0 1 16 8a6.5 6.5 0 0 1 13 3.5C29 20 16 28 16 28z" fill="#FF5A5F"/><ellipse cx="10" cy="11" rx="2.6" ry="1.8" fill="#fff" opacity=".55" transform="rotate(-30 10 11)"/></svg>',
    infinity: '<svg viewBox="0 0 32 32"><path d="M9 11a5 5 0 1 0 0 10c4 0 10-10 14-10a5 5 0 1 1 0 10c-4 0-10-10-14-10z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 32 32"><path d="M16 3l3.9 8 8.8 1.2-6.4 6.1 1.6 8.7L16 22.8 8.1 27l1.6-8.7-6.4-6.1 8.8-1.2z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    starGold: '<svg viewBox="0 0 32 32"><path d="M16 3l3.9 8 8.8 1.2-6.4 6.1 1.6 8.7L16 22.8 8.1 27l1.6-8.7-6.4-6.1 8.8-1.2z" fill="#FFC233" stroke="#E0A100" stroke-width="2" stroke-linejoin="round"/></svg>',
    starGrey: '<svg viewBox="0 0 32 32"><path d="M16 3l3.9 8 8.8 1.2-6.4 6.1 1.6 8.7L16 22.8 8.1 27l1.6-8.7-6.4-6.1 8.8-1.2z" fill="#E5E6EB" stroke="#D0D2DA" stroke-width="2" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 32 32"><path d="M7 17l6 6L25 10" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 32 32"><rect x="7" y="14" width="18" height="14" rx="4" fill="currentColor"/><path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="3.2"/></svg>',
    trophy: '<svg viewBox="0 0 32 32"><path d="M9 4h14v7a7 7 0 0 1-14 0z" fill="currentColor"/><path d="M9 7H4c0 5 3 7 5.5 7M23 7h5c0 5-3 7-5.5 7" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="13" y="18" width="6" height="5" fill="currentColor"/><rect x="9" y="23" width="14" height="5" rx="2" fill="currentColor"/></svg>',
    chest: '<svg viewBox="0 0 64 64"><rect x="8" y="26" width="48" height="30" rx="5" fill="#C9772E"/><rect x="8" y="26" width="48" height="8" fill="#A85E1E"/><path d="M8 26c0-9 7-16 16-16h16c9 0 16 7 16 16z" fill="#E39242"/><rect x="28" y="22" width="8" height="14" rx="2" fill="#FFC233" stroke="#B07B00" stroke-width="2"/><path d="M14 10v46M50 10v46" stroke="#FFC233" stroke-width="4"/></svg>',
    chestOpen: '<svg viewBox="0 0 64 64"><path d="M10 10l44 0-4 16H14z" fill="#E39242" transform="rotate(-12 10 26)"/><rect x="8" y="28" width="48" height="28" rx="5" fill="#C9772E"/><ellipse cx="32" cy="30" rx="22" ry="5" fill="#FFE08A"/><circle cx="24" cy="27" r="4" fill="#3DA9FC"/><circle cx="34" cy="25" r="5" fill="#FFC233"/><circle cx="42" cy="28" r="4" fill="#3DA9FC"/><path d="M14 28v28M50 28v28" stroke="#FFC233" stroke-width="4"/></svg>',
    close: '<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8L8 24" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>',
    speaker: '<svg viewBox="0 0 32 32"><path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/><path d="M21 11c2 2.5 2 7.5 0 10M24.5 8c4 4.5 4 11.5 0 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    turtle: '<svg viewBox="0 0 32 32"><ellipse cx="15" cy="18" rx="9" ry="6.5" fill="currentColor"/><circle cx="26" cy="16" r="3.4" fill="currentColor"/><path d="M8 23l-1.5 3M20 23l1.5 3M10 13l-1-2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 32 32"><path d="M4 7c4-2 8-2 12 1v18c-4-3-8-3-12-1z" fill="currentColor"/><path d="M28 7c-4-2-8-2-12 1v18c4-3 8-3 12-1z" fill="currentColor" opacity=".75"/></svg>',
    home: '<svg viewBox="0 0 32 32"><path d="M4 15L16 5l12 10v11a2 2 0 0 1-2 2h-6v-8h-8v8H6a2 2 0 0 1-2-2z" fill="currentColor"/></svg>',
    quest: '<svg viewBox="0 0 32 32"><rect x="5" y="9" width="22" height="18" rx="4" fill="currentColor"/><path d="M5 15h22" stroke="#fff" stroke-width="2.4"/><rect x="13" y="12" width="6" height="7" rx="1.5" fill="#fff"/><path d="M10 9V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
    user: '<svg viewBox="0 0 32 32"><circle cx="16" cy="11" r="6" fill="currentColor"/><path d="M5 28c1-7 5.5-10 11-10s10 3 11 10z" fill="currentColor"/></svg>',
    snow: '<svg viewBox="0 0 32 32"><path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13M12 5l4 3 4-3M12 27l4-3 4 3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pen: '<svg class="logo-mark" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="9" fill="#2BC48A"/><path d="M10 23l2.5-6.5L21 8l3 3-8.5 8.5z" fill="#fff"/><path d="M10 23l2.5-6.5 4 4z" fill="#FFC233"/><circle cx="21" cy="24" r="2" fill="#fff"/></svg>',
  };

  // ======================= CONFETTI =======================
  function confetti(n = 120) {
    const cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.appendChild(cv);
    const dpr = window.devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const cols = ['#2BC48A', '#8E6CFF', '#3DA9FC', '#FF9F43', '#FFC233', '#FF6FA5'];
    const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 4, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, s: Math.random() < 0.5 }));
    let f = 0;
    (function step() {
      x.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; if (p.s) x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { x.beginPath(); x.arc(0, 0, p.r / 2.4, 0, 7); x.fill(); } x.restore(); });
      if (++f < 160) requestAnimationFrame(step); else cv.remove();
    })();
  }
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  // ======================= FLAT LESSON LIST =======================
  const FLAT = []; C.UNITS.forEach((u, ui) => u.lessons.forEach((l, li) => FLAT.push({ u, ui, l, li })));
  const firstOpen = () => FLAT.find((x) => !S.done[x.l.id]);
  const isUnlocked = (id) => { if (S.settings.unlockAll || S.done[id]) return true; const f = firstOpen(); return f && f.l.id === id; };
  const chestId = (u, i) => `${u.id}-chest-${i}`;

  // ======================= MODAL =======================
  function modal(html, onMount) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal">${html}</div>`;
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    if (onMount) onMount(bg.querySelector('.modal'), close);
    return close;
  }

  // ======================= ONBOARDING =======================
  function onboarding(step = 'welcome') {
    const kid = (b, mood) => M.kid(b, mood);
    let html = '';
    if (step === 'welcome') {
      html = `<div class="onb-body">
        <div class="duo-kids">${kid('zaid', 'wave')}${kid('huda', 'happy')}</div>
        <div class="wordmark">qalam<span>quest</span></div>
        <p>Learn to read the Arabic of the Qur’an — one tiny, fun lesson at a time.</p>
      </div>
      <div class="onb-foot"><button class="btn" data-go="buddy">Get started</button>
      <a class="btn btn-ghost" href="teacher.html">I’m a teacher or parent</a></div>`;
    } else if (step === 'buddy') {
      html = `<div class="onb-body"><h1>Pick your buddy!</h1><p>They’ll guide you on your quest.</p>
        <div class="buddy-pick">${['zaid', 'huda'].map((b) => `<button class="buddy-card ${S.buddy === b ? 'on' : ''}" data-buddy="${b}">${kid(b, S.buddy === b ? 'happy' : 'idle')}<b>${M.BUDDIES[b].name}</b><small>${M.BUDDIES[b].line}</small></button>`).join('')}</div></div>
        <div class="onb-foot"><button class="btn" data-go="name">Continue</button></div>`;
    } else if (step === 'name') {
      const B = M.BUDDIES[S.buddy];
      html = `<div class="onb-body"><div class="speech">${kid(S.buddy, 'talk')}<div class="bubble">Assalāmu ‘alaykum! I’m ${B.name}. What’s your first name?</div></div>
        <input class="name-input" id="nm" maxlength="16" placeholder="Your first name" autocomplete="off" value="${esc(S.name)}">
        <p class="muted" style="font-size:14px">Only saved on this device.</p></div>
        <div class="onb-foot"><button class="btn" data-go="goal">Continue</button></div>`;
    } else if (step === 'goal') {
      html = `<div class="onb-body"><div class="speech">${kid(S.buddy, 'talk')}<div class="bubble">How much do you want to learn each day${S.name ? ', ' + esc(S.name) : ''}?</div></div>
        <div class="goal-list">${[[10, 'Little star', '1 lesson a day'], [20, 'Explorer', '2 lessons a day'], [30, 'Champion', '3 lessons a day']].map(([v, a, b]) => `<button class="goal ${S.dailyGoal === v ? 'on' : ''}" data-goal="${v}"><span>${a}</span><small>${b}</small></button>`).join('')}</div></div>
        <div class="onb-foot"><button class="btn" data-go="ready">Continue</button></div>`;
    } else if (step === 'ready') {
      html = `<div class="onb-body"><div class="speech">${kid(S.buddy, 'happy')}<div class="bubble">Bismillāh! Let’s start with your very first letters!</div></div></div>
        <div class="onb-foot"><button class="btn" data-go="start">Start lesson 1</button></div>`;
    }
    $app.innerHTML = `<div class="onb">${html}</div>`;
    $app.querySelectorAll('[data-buddy]').forEach((b) => b.onclick = () => { Sfx.play('pop'); S.buddy = b.dataset.buddy; save(); onboarding('buddy'); });
    $app.querySelectorAll('[data-goal]').forEach((b) => b.onclick = () => { Sfx.play('select'); S.dailyGoal = +b.dataset.goal; save(); onboarding('goal'); });
    const nm = $app.querySelector('#nm'); if (nm) { nm.focus(); nm.onkeydown = (e) => { if (e.key === 'Enter') $app.querySelector('[data-go]').click(); }; }
    $app.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => {
      Sfx.play('tap');
      if (nm) { S.name = nm.value.trim().slice(0, 16); }
      const g = b.dataset.go;
      if (g === 'start') { S.onboarded = true; save(); startLesson(FLAT[0]); return; }
      save(); onboarding(g);
    });
  }

  // ======================= HOME =======================
  let tab = 'learn';
  function topbar() {
    tickHearts();
    const hearts = S.settings.classMode ? `<span class="stat hearts" style="color:var(--pink)">${I.heart}${I.infinity.replace('viewBox', 'style="width:22px;height:22px" viewBox')}</span>` : `<button class="stat hearts" data-pop="hearts">${I.heart}${S.hearts}</button>`;
    return `<header class="topbar"><div class="logo">${I.pen}<span>qalam</span></div>
      <div class="stats"><button class="stat streak ${S.lastDay === today() ? '' : 'off'}" data-pop="streak">${I.flame}${S.streak}</button>
      <button class="stat gems" data-pop="gems">${I.gem}${S.gems}</button>${hearts}</div></header>`;
  }
  function tabbar() {
    const t = (id, icon, label) => `<button class="tab ${tab === id ? 'on' : ''}" data-tab="${id}">${icon}<span>${label}</span></button>`;
    return `<nav class="tabbar">${t('learn', I.home, 'Learn')}${t('quests', I.quest, 'Quests')}${t('me', I.user, 'Me')}</nav>`;
  }
  function home(scrollToCurrent) {
    ensureQuests();
    let body = '';
    if (tab === 'learn') body = pathView();
    else if (tab === 'quests') body = questsView();
    else body = meView();
    $app.innerHTML = `<div class="shell">${topbar()}<main class="main">${body}</main>${tabbar()}</div>`;
    $app.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { Sfx.play('tap'); tab = b.dataset.tab; home(tab === 'learn'); window.scrollTo(0, 0); });
    $app.querySelectorAll('[data-pop]').forEach((b) => b.onclick = () => { Sfx.play('tap'); statPopup(b.dataset.pop); });
    if (tab === 'learn') bindPath(scrollToCurrent);
    if (tab === 'quests') bindQuests();
    if (tab === 'me') bindMe();
  }

  function pathView() {
    const cur = firstOpen();
    const offs = [0, 52, 78, 52, 0, -52, -78, -52];
    return C.UNITS.map((u, ui) => {
      const items = [];
      u.lessons.forEach((l, li) => {
        items.push({ kind: 'lesson', l, li });
        if (li === 2 || (li === 5 && u.lessons.length > 7)) items.push({ kind: 'chest', id: chestId(u, li), after: l.id });
      });
      let buddyPlaced = false;
      const nodes = items.map((it, k) => {
        const x = offs[k % offs.length];
        let inner = '', cls = '', extra = '';
        if (it.kind === 'chest') {
          const opened = S.chests.includes(it.id); const open = S.done[it.after] || S.settings.unlockAll;
          cls = `chest ${opened ? 'opened' : open ? '' : 'locked'}`; inner = opened ? I.chestOpen : I.chest;
          return `<div class="node-wrap" style="transform:translateX(${x}px)"><button class="node ${cls}" data-chest="${it.id}" data-open="${open ? 1 : 0}" aria-label="Treasure chest">${inner}</button></div>`;
        }
        const done = S.done[it.l.id]; const unlocked = isUnlocked(it.l.id); const isCur = cur && cur.l.id === it.l.id;
        cls = done ? 'done' : unlocked ? '' : 'locked';
        if (isCur) cls += ' current';
        inner = !unlocked ? I.lock : it.l.review ? I.trophy : done ? I.check : I.star;
        if (done) extra = `<div class="node-stars">${[1, 2, 3].map((n) => n <= done.stars ? I.starGold : I.starGrey).join('')}</div>`;
        const bubble = isCur ? `<div class="start-bubble">${S.stats.lessons === 0 ? 'START' : 'START'}</div>` : '';
        let buddy = '';
        if (isCur && !buddyPlaced) { buddyPlaced = true; buddy = `<div class="path-buddy" style="${x >= 0 ? 'right:calc(100% + 34px)' : 'left:calc(100% + 34px)'};top:-30px">${M.kid(S.buddy, 'wave')}</div>`; }
        return `<div class="node-wrap" style="transform:translateX(${x}px)" ${isCur ? 'id="current"' : ''}>${bubble}${buddy}<button class="node ${it.l.review ? 'trophy' : ''} ${cls}" data-lesson="${it.l.id}" aria-label="${esc(it.l.title)}">${inner}</button>${extra}</div>`;
      }).join('');
      return `<section class="unit c-${u.color}"><div class="unit-banner c-${u.color}"><div><div class="u-kicker">Unit ${ui + 1} · <span class="u-ar">${u.ar}</span></div><h2>${esc(u.title)}</h2></div>
        <button class="guide-btn" data-guide="${u.id}" aria-label="Guidebook">${I.book}</button></div>
        <div class="path">${nodes}</div></section>`;
    }).join('') + `<div style="text-align:center;padding:24px 16px 0" class="muted">More units coming soon, in shā’ Allāh ✨</div>`;
  }
  function bindPath(scrollToCurrent) {
    $app.querySelectorAll('[data-lesson]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); Sfx.play('tap'); lessonPop(b); });
    $app.querySelectorAll('[data-chest]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const id = b.dataset.chest;
      if (S.chests.includes(id)) { toast('You already opened this chest!'); return; }
      if (b.dataset.open !== '1') { Sfx.play('soft-wrong'); toast('Finish the lessons before it to open this chest!'); return; }
      openChest(id);
    });
    $app.querySelectorAll('[data-guide]').forEach((b) => b.onclick = () => { Sfx.play('tap'); guidebook(C.UNITS.find((u) => u.id === b.dataset.guide)); });
    if (scrollToCurrent) { const c = document.getElementById('current'); if (c) setTimeout(() => c.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60); }
  }
  function closePops() { document.querySelectorAll('.node-pop').forEach((p) => { p.parentElement.classList.remove('has-pop'); p.remove(); }); }
  function lessonPop(btn) {
    const had = btn.parentElement.querySelector('.node-pop'); closePops(); if (had) return;
    const id = btn.dataset.lesson; const f = FLAT.find((x) => x.l.id === id);
    const unlocked = isUnlocked(id); const done = S.done[id];
    const pop = document.createElement('div');
    pop.className = `node-pop c-${f.u.color} ${unlocked ? '' : 'locked'}`;
    pop.innerHTML = `<h3>${esc(f.l.title)} <span class="ar" style="font-size:.9em;opacity:.85">${f.l.glyphs && AR_RE.test(f.l.glyphs) ? esc(f.l.glyphs) : ''}</span></h3>
      <p>${unlocked ? `Lesson ${f.li + 1} of ${f.u.lessons.length}${done ? ' · best ' + done.best + '%' : ''}` : 'Finish the lessons above to unlock this!'}</p>
      <button class="btn" ${unlocked ? '' : 'disabled'}>${!unlocked ? 'Locked' : done ? 'Practise +5 XP' : 'Start +10 XP'}</button>`;
    pop.style.transform = `translateX(calc(-50% - ${btn.parentElement.style.transform.match(/-?\d+/)[0]}px))`;
    pop.style.animation = 'none';
    btn.parentElement.appendChild(pop); btn.parentElement.classList.add('has-pop');
    pop.onclick = (e) => e.stopPropagation();
    pop.querySelector('.btn').onclick = () => { if (!unlocked) return; Sfx.play('tap'); startLesson(f); };
  }
  function guidebook(u) {
    modal(`<div class="row" style="justify-content:center">${M.kid(S.buddy, 'talk')}</div><h2>Unit guidebook</h2><p><b>${esc(u.title)}</b> · ${esc(u.blurb)}</p>
      <ul>${u.guide.map((g) => `<li>${rich(g)}</li>`).join('')}</ul><button class="btn" data-x>Got it!</button>`, (m, close) => m.querySelector('[data-x]').onclick = () => { Sfx.play('tap'); close(); });
  }
  function statPopup(kind) {
    if (kind === 'streak') {
      modal(`<div class="streak-hero" style="align-self:center;width:120px;height:120px">${I.flameBig.replace('class="flame"', 'class="flame" style="width:110px;height:110px"')}</div>
        <h2>${S.streak} day streak</h2><p>${S.lastDay === today() ? 'You’ve practised today. Mashā’ Allāh!' : 'Do one lesson today to keep your flame going!'}</p>
        ${weekHTML()}<p class="muted" style="font-size:15px">${I.snow.replace('viewBox', 'style="width:18px;height:18px;vertical-align:-3px;color:var(--blue)" viewBox')} Streak freezes: <b>${S.freezes}</b> — they protect your streak if you miss a day.</p>
        <button class="btn" data-x>Keep going</button>`, (m, close) => m.querySelector('[data-x]').onclick = close);
    } else if (kind === 'gems') {
      modal(`<div class="reward-amt" style="align-self:center">${I.gem}${S.gems}</div><h2>Your gems</h2><p>Earn gems from quests, chests and streaks. Spend them in the shop on the “Me” page.</p><button class="btn btn-blue" data-x>Okay</button>`, (m, close) => m.querySelector('[data-x]').onclick = close);
    } else {
      tickHearts();
      const mins = S.hearts < MAX_HEARTS ? Math.ceil((HEART_MS - (Date.now() - S.heartsAt)) / 60000) : 0;
      modal(`<div class="hearts-row">${Array.from({ length: MAX_HEARTS }, (_, i) => I.heart.replace('<svg', `<svg class="${i < S.hearts ? '' : 'empty'}"`)).join('')}</div>
        <h2>${S.hearts === MAX_HEARTS ? 'Full hearts!' : `${S.hearts} hearts`}</h2><p>${S.hearts === MAX_HEARTS ? 'You lose a heart for each mistake. Practise to win them back!' : `Next heart in ${mins} min. Or practise a lesson you’ve finished to refill.`}</p>
        <button class="btn" data-x>Okay</button>`, (m, close) => m.querySelector('[data-x]').onclick = close);
    }
  }
  function weekHTML(popToday) {
    const d = new Date(); const dow = (d.getDay() + 6) % 7; // Monday = 0
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return `<div class="week">${days.map((n, i) => { const ds = addDays(today(), i - dow); const on = S.history[ds] > 0; const fr = S.frozenDays.includes(ds); return `<div class="day ${on ? 'on' : fr ? 'frozen' : ''} ${i === dow ? 'today' : ''} ${popToday && i === dow ? 'pop' : ''}"><span>${n}</span><i></i></div>`; }).join('')}</div>`;
  }

  function questsView() {
    ensureQuests();
    const q = S.quests; const all = q.list.every((x) => x.p >= x.n);
    const xpToday = S.history[today()] || 0;
    return `<div class="page"><div class="speech" style="margin-bottom:8px">${M.kid(S.buddy, all ? 'happy' : 'talk')}<div class="bubble">${all ? 'All quests done! Open your daily chest!' : 'Finish all 3 quests today to win a daily chest!'}</div></div>
      <h1>Daily quests</h1><div class="card">${q.list.map((x) => `<div class="quest ${x.p >= x.n ? 'done' : ''}"><div class="quest-icon">${x.icon}</div><div class="grow"><h4>${esc(x.label)}</h4><div class="bar"><i style="width:${(x.p / x.n) * 100}%"></i><b>${x.p} / ${x.n}</b></div></div><div class="quest-reward">${x.p >= x.n ? I.check.replace('viewBox', 'style="color:var(--green)" viewBox') : I.chest}</div></div>`).join('')}</div>
      <div style="margin-top:16px">${all && !q.claimedChest ? '<button class="btn btn-gold" id="dailyChest">Open daily chest</button>' : all ? '<p class="muted" style="text-align:center">Daily chest opened. New quests tomorrow!</p>' : ''}</div>
      <h2>Today</h2><div class="statgrid"><div class="statbox">${I.star.replace('viewBox', 'style="color:var(--gold)" viewBox')}<div><b>${xpToday} XP</b><small>Goal: ${S.dailyGoal} XP</small></div></div>
      <div class="statbox" style="color:var(--orange)">${I.flame}<div><b style="color:var(--ink)">${S.streak}</b><small>day streak</small></div></div></div>
      <h2>Achievements</h2><div class="badges">${BADGES.map((b) => `<div class="badge ${S.badges.includes(b.id) ? '' : 'locked'}"><div class="b-ico">${b.icon}</div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div></div>`;
  }
  function bindQuests() {
    const b = document.getElementById('dailyChest');
    if (b) b.onclick = () => { S.quests.claimedChest = true; openChest(null, 25); };
  }
  function openChest(id, fixed) {
    const amt = fixed || 10 + Math.floor(Math.random() * 3) * 5;
    modal(`<div class="chest-anim shake" style="align-self:center">${I.chest}</div><h2>Treasure chest!</h2><p>Tap to open…</p>`, (m, close) => {
      Sfx.play('chest');
      setTimeout(() => {
        S.gems += amt; if (id) S.chests.push(id); save();
        m.innerHTML = `<div class="chest-anim open" style="align-self:center">${I.chestOpen}</div><div class="reward-amt" style="align-self:center">${I.gem}+${amt}</div><h2>You found ${amt} gems!</h2><button class="btn btn-blue" data-x>Collect</button>`;
        confetti(80); buzz([20, 40, 20]);
        m.querySelector('[data-x]').onclick = () => { Sfx.play('tap'); close(); home(); };
      }, 1250);
    });
  }

  function meView() {
    const B = M.BUDDIES[S.buddy];
    const acc = S.stats.answered ? Math.round((S.stats.correct / S.stats.answered) * 100) : 0;
    const sw = (k, label, sub) => `<div class="setting"><div><b>${label}</b><small>${sub}</small></div><button class="switch ${S.settings[k] ? 'on' : ''}" data-set="${k}" aria-label="${label}"></button></div>`;
    return `<div class="page"><div class="row"><div style="width:110px">${M.kid(S.buddy, 'wave')}</div><div><h1 style="margin:0">${esc(S.name || 'Quester')}</h1><p class="muted" style="margin:4px 0 0">Buddy: ${B.name} · Goal ${S.dailyGoal} XP/day</p>
      <button class="link-btn" style="padding:8px 0" id="swapBuddy">Switch to ${S.buddy === 'zaid' ? 'Huda' : 'Zaid'}</button></div></div>
      <h2>Statistics</h2><div class="statgrid">
        <div class="statbox" style="color:var(--orange)">${I.flame}<div><b style="color:var(--ink)">${S.streak}</b><small>Day streak (best ${S.bestStreak})</small></div></div>
        <div class="statbox" style="color:var(--gold)">${I.star}<div><b style="color:var(--ink)">${S.xp}</b><small>Total XP</small></div></div>
        <div class="statbox" style="color:var(--green)">${I.check}<div><b style="color:var(--ink)">${Object.keys(S.done).length} / ${FLAT.length}</b><small>Lessons</small></div></div>
        <div class="statbox" style="color:var(--blue)">${I.trophy}<div><b style="color:var(--ink)">${acc}%</b><small>Accuracy</small></div></div></div>
      <h2>Shop</h2><div class="card"><div class="setting"><div class="row">${I.snow.replace('viewBox', 'style="width:40px;height:40px;color:var(--blue)" viewBox')}<div><b>Streak freeze</b><small>Protects your streak for 1 missed day · you have ${S.freezes}/${MAX_FREEZES}</small></div></div>
      <button class="btn btn-blue btn-sm" style="width:auto" id="buyFreeze" ${S.freezes >= MAX_FREEZES ? 'disabled' : ''}>${I.gem.replace('viewBox', 'style="width:18px;height:18px" viewBox')} ${FREEZE_COST}</button></div>
      <div class="setting"><div class="row">${I.heart.replace('viewBox', 'style="width:40px;height:40px" viewBox')}<div><b>Refill hearts</b><small>Get all ${MAX_HEARTS} hearts back</small></div></div>
      <button class="btn btn-blue btn-sm" style="width:auto" id="buyHearts" ${S.hearts >= MAX_HEARTS || S.settings.classMode ? 'disabled' : ''}>${I.gem.replace('viewBox', 'style="width:18px;height:18px" viewBox')} ${REFILL_COST}</button></div></div>
      <h2>Settings</h2><div class="card">${sw('sound', 'Sound effects', 'Dings, pops and fanfares')}${sw('tts', 'Read aloud', arVoice ? 'Uses this device’s Arabic voice' : 'No Arabic voice found on this device')}</div>
      <h2>Teacher & parent corner</h2><div class="card">${sw('classMode', 'Class mode: unlimited hearts', 'Mistakes never stop a lesson — good for class')}${sw('unlockAll', 'Unlock every lesson', 'Jump to any lesson to preview or teach it')}
        <div class="setting"><div><b>Teacher guide</b><small>Every lesson, answer and Qur’an reference on one page</small></div><a class="btn btn-sm btn-purple" style="width:auto" href="teacher.html">Open</a></div>
        <div class="setting"><div><b>Start again</b><small>Erase progress on this device</small></div><button class="btn btn-sm btn-red" style="width:auto" id="reset">Reset</button></div></div>
      <p class="muted" style="text-align:center;font-size:13px;margin-top:24px">Qalam Quest · made for Didsbury Mosque · progress is saved only on this device</p></div>`;
  }
  function bindMe() {
    $app.querySelectorAll('[data-set]').forEach((b) => b.onclick = () => { const k = b.dataset.set; S.settings[k] = !S.settings[k]; save(); Sfx.play('select'); home(); });
    document.getElementById('swapBuddy').onclick = () => { S.buddy = S.buddy === 'zaid' ? 'huda' : 'zaid'; save(); Sfx.play('pop'); home(); };
    document.getElementById('buyFreeze').onclick = () => { if (S.gems < FREEZE_COST) { Sfx.play('soft-wrong'); toast('Not enough gems yet — finish quests to earn more!'); return; } S.gems -= FREEZE_COST; S.freezes++; save(); Sfx.play('chest'); toast('Streak freeze equipped! ❄️'); home(); };
    document.getElementById('buyHearts').onclick = () => { if (S.gems < REFILL_COST) { Sfx.play('soft-wrong'); toast('Not enough gems yet!'); return; } S.gems -= REFILL_COST; S.hearts = MAX_HEARTS; save(); Sfx.play('heart'); home(); };
    document.getElementById('reset').onclick = () => modal(`<h2>Erase all progress?</h2><p>This removes streaks, XP and lessons on this device. It can’t be undone.</p><button class="btn btn-red" data-y>Yes, erase</button><button class="link-btn" data-x>Cancel</button>`, (m, close) => { m.querySelector('[data-x]').onclick = close; m.querySelector('[data-y]').onclick = () => { localStorage.removeItem(KEY); location.reload(); }; });
  }

  // ======================= LESSON ENGINE =======================
  let L = null; // current lesson run
  function startLesson(f, opts = {}) {
    tickHearts();
    if (!S.settings.classMode && S.hearts <= 0 && !opts.practice) { outOfHearts(f, true); return; }
    closePops();
    let steps = f.l.steps();
    if (opts.practice) steps = C.shuffle(steps.filter((s) => s.type !== 'teach')).slice(0, 6);
    // listen exercises fall back to reading when no Arabic voice exists
    steps = steps.map((s) => (s.type === 'listen' && !canSpeak() ? { ...s, type: 'mcq', prompt: s.fallback } : s));
    L = { f, queue: steps, total: steps.length, doneCount: 0, mistakes: 0, graded: 0, correct: 0, combo: 0, bestCombo: 0, comboBonus: 0, start: Date.now(), practice: !!opts.practice, replay: !!S.done[f.l.id], requeues: new Map() };
    $app.innerHTML = `<div class="lesson c-${f.u.color}"><div class="lesson-top"><button class="x-btn" id="quit" aria-label="Quit">${I.close}</button>
      <div class="progress" id="prog"><i style="width:0%"></i></div><div class="lesson-hearts ${S.settings.classMode || L.practice ? 'inf' : ''}" id="lh">${I.heart}<span>${S.settings.classMode || L.practice ? '∞' : S.hearts}</span></div></div>
      <div class="lesson-body" id="lb"></div>
      <div class="lesson-foot" id="foot"><div class="foot-in"><button class="btn" id="check" disabled>Check</button></div></div>
      <div class="sheet" id="sheet"><div class="sheet-in"></div></div></div>`;
    document.getElementById('quit').onclick = () => { Sfx.play('tap'); quitLesson(); };
    document.onkeydown = lessonKeys;
    nextExercise();
  }
  function quitLesson() {
    modal(`${M.kid(S.buddy, 'sad')}<h2>Leave this lesson?</h2><p>Your progress in this lesson won’t be saved.</p><button class="btn" data-x>Keep learning</button><button class="link-btn" style="color:var(--red)" data-y>End lesson</button>`,
      (m, close) => { m.querySelector('[data-x]').onclick = () => { Sfx.play('tap'); close(); }; m.querySelector('[data-y]').onclick = () => { close(); endRun(); home(true); }; });
  }
  function endRun() { L = null; document.onkeydown = null; if (window.speechSynthesis) speechSynthesis.cancel(); }
  function setProgress() {
    const p = document.getElementById('prog'); if (!p) return;
    const pct = (L.doneCount / (L.doneCount + L.queue.length)) * 100;
    p.querySelector('i').style.width = pct + '%';
    p.classList.toggle('hot', L.combo >= 3);
    const old = p.querySelector('.combo-tag'); if (old) old.remove();
    if (L.combo >= 3) p.insertAdjacentHTML('beforeend', `<span class="combo-tag">🔥 ${L.combo} IN A ROW</span>`);
  }
  let EX = null; // current exercise controller
  function nextExercise() {
    setProgress();
    if (!L.queue.length) { finishLesson(); return; }
    const ex = L.queue[0]; window.__qqEx = ex; // exposed for automated play-testing
    const lb = document.getElementById('lb');
    const check = document.getElementById('check');
    const sheet = document.getElementById('sheet'); sheet.className = 'sheet';
    document.getElementById('foot').classList.remove('hidden');
    check.disabled = true; check.textContent = 'Check'; check.className = 'btn';
    lb.innerHTML = ''; const wrap = document.createElement('div'); wrap.className = 'ex'; lb.appendChild(wrap);
    window.scrollTo(0, 0);
    const ctx = { setReady: (v) => (check.disabled = !v), finish: (res) => showFeedback(res, ex) };
    EX = RENDER[ex.type](wrap, ex, ctx);
    if (ex.type === 'teach') { check.disabled = false; check.textContent = 'Continue'; check.onclick = () => { Sfx.play('tap'); L.queue.shift(); L.doneCount++; nextExercise(); }; }
    else if (ex.type === 'match' || ex.type === 'sort') { document.getElementById('foot').classList.add('hidden'); }
    else check.onclick = () => { const r = EX.check(); showFeedback(r, ex); };
  }
  const PRAISE = ['Amazing!', 'Mashā’ Allāh!', 'Brilliant!', 'Great job!', 'You got it!', 'Super!', 'Nailed it!'];
  function showFeedback(r, ex) {
    const graded = !['match', 'sort'].includes(ex.type);
    L.graded++; S.stats.answered++;
    if (r.correct) { L.correct++; S.stats.correct++; L.combo++; L.bestCombo = Math.max(L.bestCombo, L.combo); }
    else { L.mistakes++; L.combo = 0; }
    if (!r.correct && graded) {
      if (!S.settings.classMode && !L.practice) { S.hearts = Math.max(0, S.hearts - 1); S.heartsAt = S.hearts === MAX_HEARTS - 1 ? Date.now() : S.heartsAt; const lh = document.getElementById('lh'); lh.querySelector('span').textContent = S.hearts; lh.classList.remove('lose'); void lh.offsetWidth; lh.classList.add('lose'); }
      const n = L.requeues.get(ex) || 0;
      if (n < 2) { L.requeues.set(ex, n + 1); L.queue.push(ex); }
    }
    L.queue.shift(); L.doneCount++;
    save();
    Sfx.play(r.correct ? 'correct' : 'wrong'); buzz(r.correct ? 12 : [30, 50, 30]);
    if (r.correct && [5, 10, 15, 20].includes(L.combo)) { L.comboBonus = Math.min(5, L.comboBonus + (L.combo === 5 ? 2 : 1)); const c = L.combo; setTimeout(() => comboBurst(c), 250); }
    setProgress();
    const sheet = document.getElementById('sheet');
    const title = r.correct ? (ex.type === 'match' ? 'Perfect pairs!' : ex.type === 'sort' && r.mistakes === 0 ? 'Sorted!' : C.pick(PRAISE)) : ex.type === 'sort' || ex.type === 'match' ? 'Done — good effort!' : 'Not quite!';
    const ok = r.correct || !graded;
    let msg = '';
    if (!r.correct && graded) msg = `Correct answer: ${rich(r.answer)}`;
    if (r.explain) msg += `${msg ? '<br>' : ''}${rich(r.explain)}`;
    if (!graded && r.mistakes) msg = `${r.mistakes} slip${r.mistakes > 1 ? 's' : ''} — keep practising!`;
    sheet.className = `sheet ${ok ? 'ok' : 'bad'}`;
    sheet.querySelector('.sheet-in').innerHTML = `<div class="sheet-head">${M.kid(S.buddy, ok ? 'happy' : 'sad')}<div><h3>${title}</h3>${msg ? `<p>${msg}</p>` : ''}</div></div><button class="btn ${ok ? '' : 'btn-red'}" id="cont">Continue</button>`;
    requestAnimationFrame(() => sheet.classList.add('show'));
    document.getElementById('foot').classList.add('hidden');
    const cont = document.getElementById('cont');
    cont.onclick = () => {
      Sfx.play('tap');
      if (!S.settings.classMode && !L.practice && S.hearts <= 0) { outOfHearts(L.f, false); return; }
      nextExercise();
    };
    cont.focus({ preventScroll: true });
  }
  function comboBurst(n) {
    Sfx.play('combo');
    const d = document.createElement('div'); d.className = 'combo-burst';
    d.innerHTML = `${M.kid(S.buddy, 'happy')}<b>${n} in a row! 🔥</b>`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 1500);
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
      <button class="btn" data-p>Practise to refill ❤️</button><button class="btn btn-blue" data-g ${S.gems < REFILL_COST ? 'disabled' : ''}>Refill · ${REFILL_COST} gems</button><button class="link-btn" data-x>${before ? 'Not now' : 'End lesson'}</button>`,
      (m, close) => {
        m.querySelector('[data-p]').onclick = () => { close(); endRun(); const done = FLAT.filter((x) => S.done[x.l.id]); startLesson(done.length ? C.pick(done) : f, { practice: true }); };
        m.querySelector('[data-g]').onclick = () => { S.gems -= REFILL_COST; S.hearts = MAX_HEARTS; save(); Sfx.play('heart'); close(); if (before) startLesson(f); else { document.getElementById('lh').querySelector('span').textContent = S.hearts; nextExercise(); } };
        m.querySelector('[data-x]').onclick = () => { close(); endRun(); home(true); };
      });
  }

  // ----- exercise renderers -----
  const optLabel = (o, ar) => `<span class="t ${ar ? (isQ(o) ? 'qr' : 'ar') : ''}">${ar ? esc(o) : rich(o)}</span>`;
  const refTag = (r) => (r ? `<span class="ref-tag">📖 ${esc(r)}</span>` : '');
  const speakBtn = (say, cls = '') => (say && canSpeak() ? `<button class="speak ${cls}" data-say="${esc(say)}" aria-label="Listen">${I.speaker}</button>` : '');
  function bindSpeak(w) { w.querySelectorAll('[data-say]').forEach((b) => b.onclick = () => speak(b.dataset.say, b.dataset.slow)); }

  const RENDER = {
    teach(w, ex) {
      let visual = '';
      if (ex.big) visual = `<div class="glyph-card"><div class="g">${esc(ex.big)}</div>${speakBtn(ex.say)}</div>`;
      else if (ex.bigQ) visual = `<div class="glyph-card"><div class="g qr">${esc(ex.bigQ)}</div>${speakBtn(ex.say || ex.bigQ)}</div>`;
      else if (ex.bigRow) visual = `<div class="glyph-row">${ex.bigRow.map((c) => `<span class="chip ${/^[+=→]$/.test(c) ? 'op' : ''}">${esc(c)}</span>`).join('')}</div>${ex.say ? `<div>${speakBtn(ex.say)}</div>` : ''}`;
      else if (ex.ayah) visual = `<div class="ayah-box">${esc(C.AYAH[ex.ayah])}</div>`;
      w.innerHTML = `<span class="ex-kicker">✨ ${esc(ex.kicker || 'NEW')}</span>
        <div class="teach-card">${visual}<h2>${rich(ex.title)}</h2>${ex.sub ? `<p>${rich(ex.sub)}</p>` : ''}${refTag(ex.quranRef)}</div>
        ${ex.tip ? `<div class="tip-row">${M.kid(S.buddy, ex.mood || 'talk')}<div class="bubble">${rich(ex.tip)}</div></div>` : `<div class="tip-row">${M.kid(S.buddy, ex.mood || 'happy')}<div class="bubble">${C.pick(['Look closely!', 'Can you see it?', 'Say it out loud!', 'Easy peasy!'])}</div></div>`}`;
      bindSpeak(w);
      if (ex.say && canSpeak()) setTimeout(() => speak(ex.say), 350);
      return {};
    },
    mcq(w, ex, ctx) {
      const opts = C.shuffle(ex.options);
      const ar = ex.arOptions || opts.every((o) => AR_RE.test(o));
      const cols = ar && opts.every((o) => o.length <= 8);
      w.innerHTML = `<h2 class="ex-prompt">${rich(ex.prompt)}</h2>${refTag(ex.quranRef)}
        ${ex.big ? `<div class="glyph-card"><div class="g ${isQ(ex.big) ? 'qr' : ''}">${esc(ex.big)}</div>${speakBtn(ex.big)}</div>` : ''}
        ${ex.gloss ? `<p class="gloss">“${esc(ex.gloss)}”</p>` : ''}
        <div class="opts ${cols ? 'cols' : ''}">${opts.map((o, i) => `<button class="opt" data-i="${i}" style="position:relative"><span class="k">${i + 1}</span>${optLabel(o, ar)}</button>`).join('')}</div>`;
      bindSpeak(w);
      let sel = -1;
      const choose = (i) => { sel = i; Sfx.play('select'); w.querySelectorAll('.opt').forEach((b, j) => b.classList.toggle('sel', j === i)); ctx.setReady(true); if (ar && canSpeak()) speak(opts[i]); };
      w.querySelectorAll('.opt').forEach((b) => b.onclick = () => choose(+b.dataset.i));
      return {
        key: (n) => n <= opts.length && choose(n - 1),
        check() {
          const ok = opts[sel] === ex.correct;
          w.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; if (opts[j] === ex.correct) b.classList.add('good'); else if (j === sel) b.classList.add('bad'); else b.classList.add('dim'); });
          return { correct: ok, answer: ex.correct, explain: ex.explain };
        },
      };
    },
    listen(w, ex, ctx) {
      const c = RENDER.mcq(w, { ...ex, prompt: ex.prompt, big: null }, ctx);
      w.querySelector('.ex-prompt').insertAdjacentHTML('afterend', `<div class="row" style="justify-content:center;gap:16px"><button class="speak big-speak" data-say="${esc(ex.say)}" aria-label="Play sound">${I.speaker}</button><button class="speak" data-say="${esc(ex.say)}" data-slow="1" aria-label="Play slowly" style="background:var(--gold);box-shadow:0 4px 0 var(--gold-d)">${I.turtle}</button></div>`);
      bindSpeak(w); setTimeout(() => speak(ex.say), 300);
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
        if (b.classList.contains('gone')) return;
        if (a && a.dataset.s === b.dataset.s) { a.classList.remove('sel'); }
        if (a === b) { a = null; return; }
        if (!a || a.dataset.s === b.dataset.s) { a = b; b.classList.add('sel'); Sfx.play('select'); if (b.dataset.s === 'L' && canSpeak() && AR_RE.test(b.textContent)) speak(b.textContent); return; }
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
      w.innerHTML = `<h2 class="ex-prompt">${rich(ex.prompt)}</h2><div class="sort-stage"><span class="sort-left" id="left"></span><div id="cardslot"></div>
        <div class="buckets n${ex.buckets.length}">${ex.buckets.map((b, i) => `<button class="bucket ${b.cls || ''}" data-b="${i}">${rich(b.label)}<span class="cnt">0</span></button>`).join('')}</div></div>`;
      const slot = w.querySelector('#cardslot');
      const show = () => {
        w.querySelector('#left').textContent = `${items.length - k} left`;
        const it = items[k];
        slot.innerHTML = `<div class="sort-card"><div class="g ${it.quran || isQ(it.t) ? 'qr' : 'ar'}">${esc(it.t)}</div>${ex.showGloss || it.gloss ? `<small>${esc(it.gloss || '')}</small>` : ''}${it.k ? `<small>📖 ${esc(C.ref(it.k))}</small>` : ''}</div>`;
        if (canSpeak()) speak(it.t);
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
          const good = ok(sel);
          w.querySelectorAll('.wd').forEach((b, j) => { b.disabled = true; b.classList.remove('sel'); if (ok(j)) b.classList.add('good'); else if (j === sel) b.classList.add('bad'); });
          const answer = ex.byIndex ? ex.answers.map((i) => ex.words[i]).join(' / ') : ex.answers.join(' / ');
          return { correct: good, answer, explain: ex.explain };
        },
      };
    },
    build(w, ex, ctx) {
      const tiles = ex.tiles.map((t, i) => ({ t, i }));
      let line = [];
      w.innerHTML = `<h2 class="ex-prompt">${rich(ex.prompt)}</h2>${ex.gloss ? `<p class="gloss" style="margin:-8px 0 0">“${rich(ex.gloss)}”</p>` : ''}
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
      bank.querySelectorAll('.tile').forEach((b) => b.onclick = () => { const i = +b.dataset.i; if (line.includes(i)) return; Sfx.play('select'); line.push(i); draw(); if (canSpeak()) speak(tiles[i].t); });
      draw();
      return {
        key: (n) => { const b = bank.querySelectorAll('.tile')[n - 1]; if (b) b.click(); },
        check() {
          const got = line.map((i) => tiles[i].t);
          const good = got.length === ex.target.length && got.every((t, i) => t === ex.target[i]);
          lineEl.querySelectorAll('.tile').forEach((b) => b.disabled = true); bank.querySelectorAll('.tile').forEach((b) => b.disabled = true);
          if (canSpeak()) speak(ex.target.join(''));
          return { correct: good, answer: ex.target.join(''), explain: good ? `${ex.target.join('')}${ex.gloss ? ' = ' + ex.gloss : ''}` : '' };
        },
      };
    },
  };

  // ======================= FINISH FLOW =======================
  function finishLesson() {
    const { f } = L;
    const secs = Math.round((Date.now() - L.start) / 1000);
    const acc = L.graded ? Math.round((L.correct / L.graded) * 100) : 100;
    const perfect = L.mistakes === 0;
    const base = L.practice || L.replay ? 5 : 10;
    const xp = base + (perfect ? 5 : 0) + L.comboBonus;
    const stars = acc >= 95 ? 3 : acc >= 75 ? 2 : 1;
    const r = { xp, acc, mistakes: L.mistakes, bestCombo: L.bestCombo, secs, stars, perfect };
    const practice = L.practice;
    // state updates
    S.xp += xp; S.history[today()] = (S.history[today()] || 0) + xp;
    S.stats.lessons++; if (perfect) S.stats.perfect++; S.stats.bestCombo = Math.max(S.stats.bestCombo, L.bestCombo);
    if (practice) { S.hearts = MAX_HEARTS; S.heartsAt = Date.now(); }
    else { const prev = S.done[f.l.id]; S.done[f.l.id] = { stars: Math.max(stars, prev ? prev.stars : 0), best: Math.max(acc, prev ? prev.best : 0) }; }
    let streakUp = null;
    if (S.lastDay !== today()) {
      const from = S.streak; S.streak = S.lastDay && dayDiff(S.lastDay, today()) === 1 ? S.streak + 1 : 1; S.lastDay = today();
      S.bestStreak = Math.max(S.bestStreak, S.streak); streakUp = { from, to: S.streak };
      if (S.streak % 7 === 0 && S.freezes < MAX_FREEZES) { S.freezes++; streakUp.freeze = true; }
      if ([3, 7, 14, 30, 50, 100].includes(S.streak)) { S.gems += S.streak >= 30 ? 50 : 20; streakUp.gems = S.streak >= 30 ? 50 : 20; }
    }
    const quests = bumpQuests(r);
    const badges = newBadges();
    save(); endRun();
    const screens = [(n) => resultScreen(r, f, practice, n)];
    if (streakUp) screens.push((n) => streakScreen(streakUp, n));
    if (quests.length) screens.push((n) => questScreen(quests, n));
    badges.forEach((b) => screens.push((n) => badgeScreen(b, n)));
    let i = 0;
    const next = () => { if (i < screens.length) screens[i++](next); else { tab = 'learn'; home(true); } };
    next();
  }
  function shell(html, btn, onBtn, cls = '') {
    $app.innerHTML = `<div class="result ${cls}"><div class="result-body">${html}</div><button class="btn" id="go">${btn}</button></div>`;
    const go = document.getElementById('go'); go.onclick = () => { Sfx.play('tap'); onBtn(); }; go.focus({ preventScroll: true });
    document.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); document.onkeydown = null; go.click(); } };
  }
  function countUp(el, to, ms = 900) {
    const t0 = performance.now(); let last = -1;
    (function step(t) { if (!el || !el.isConnected) return; const p = Math.min(1, (t - t0) / ms); const v = Math.round(to * (1 - Math.pow(1 - p, 3))); if (v !== last) { el.textContent = v; last = v; if (v % 2 === 0) Sfx.play('tick'); } if (p < 1) requestAnimationFrame(step); })(t0);
  }
  function resultScreen(r, f, practice, next) {
    const mm = `${Math.floor(r.secs / 60)}:${String(r.secs % 60).padStart(2, '0')}`;
    const title = practice ? 'Hearts refilled!' : r.perfect ? 'Perfect lesson!' : 'Lesson complete!';
    shell(`${M.kid(S.buddy, 'happy')}<h1>${title}</h1>
      ${practice ? `<div class="hearts-row">${Array.from({ length: MAX_HEARTS }, () => I.heart).join('')}</div>` : `<div class="stars-big">${[1, 2, 3].map((n) => (n <= r.stars ? I.starGold : I.starGrey)).join('')}</div>`}
      <div class="tiles3"><div class="rtile" style="--c:var(--gold)"><div class="lab">Total XP</div><div class="val">${I.star.replace('viewBox', 'style="color:var(--gold)" viewBox')}<span id="xpv">0</span></div></div>
      <div class="rtile" style="--c:var(--green)"><div class="lab">${r.acc >= 90 ? 'Amazing' : r.acc >= 70 ? 'Good' : 'Accuracy'}</div><div class="val">🎯<span>${r.acc}%</span></div></div>
      <div class="rtile" style="--c:var(--blue)"><div class="lab">${r.secs < 120 ? 'Speedy' : 'Time'}</div><div class="val">⏱<span>${mm}</span></div></div></div>
      ${r.bestCombo >= 5 ? `<p class="muted" style="margin:0">Best combo: ${r.bestCombo} in a row ⚡</p>` : ''}`, 'Continue', next);
    Sfx.play('complete'); confetti(); buzz([20, 60, 20]);
    setTimeout(() => countUp(document.getElementById('xpv'), r.xp), 400);
  }
  // streak, quest and badge screens
  function streakScreen(s, next) {
    shell(`<div class="streak-hero">${I.flameBig}</div><div class="streak-num roll">${s.to}</div><h1 style="color:var(--orange)">day streak!</h1>
      ${weekHTML(true)}<p style="margin:0;font-size:17px;color:var(--ink-2)">${s.to === 1 ? 'Your streak has started! Come back tomorrow to grow it.' : `Mashā’ Allāh — ${s.to} days in a row!`}${s.gems ? `<br><b style="color:var(--blue)">+${s.gems} gems streak bonus!</b>` : ''}${s.freeze ? '<br><b style="color:var(--blue)">+1 free streak freeze ❄️</b>' : ''}</p>`, 'Continue', next);
    Sfx.play('streak'); buzz([30, 30, 60]);
  }
  function questScreen(qs, next) {
    shell(`${M.kid(S.buddy, 'happy')}<h1 style="color:var(--purple)">Quest complete!</h1><div class="card" style="width:100%;text-align:left">${qs.map((q) => `<div class="quest done"><div class="quest-icon">${q.icon}</div><div class="grow"><h4>${esc(q.label)}</h4><div class="bar"><i style="width:100%"></i></div></div><b style="color:var(--blue);display:flex;align-items:center;gap:4px">${I.gem.replace('viewBox', 'style="width:22px;height:22px" viewBox')}+10</b></div>`).join('')}</div>`, 'Continue', next);
    Sfx.play('chest');
  }
  function badgeScreen(b, next) {
    shell(`<div class="badge" style="border:0"><div class="b-ico" style="width:140px;height:140px;font-size:76px;animation:starIn .6s cubic-bezier(.2,1.8,.4,1)">${b.icon}</div></div><h1 style="color:var(--purple)">New badge!</h1><p style="font-size:20px;margin:0"><b>${esc(b.name)}</b></p><p class="muted" style="margin:0">${esc(b.desc)}</p>`, 'Awesome!', next);
    Sfx.play('badge'); confetti(90);
  }
  // ======================= BOOT =======================
  function boot() {
    document.addEventListener('click', closePops);
    load(); tickHearts();
    const s = checkStreak(); save();
    if (!S.onboarded) { onboarding(); return; }
    home(true);
    if (s && s.type === 'frozen') setTimeout(() => modal(`<div style="align-self:center;color:var(--blue)">${I.snow.replace('viewBox', 'style="width:90px;height:90px" viewBox')}</div><h2>Streak saved!</h2><p>A streak freeze protected your ${S.streak}-day streak while you were away. Welcome back!</p><button class="btn btn-blue" data-x>Yay!</button>`, (m, c) => m.querySelector('[data-x]').onclick = c), 400);
    if (s && s.type === 'reset' && s.lost >= 2) setTimeout(() => modal(`${M.kid(S.buddy, 'wave')}<h2>Welcome back!</h2><p>Your ${s.lost}-day streak took a rest. Every day is a fresh start — let’s begin a new one!</p><button class="btn" data-x>Let’s go</button>`, (m, c) => m.querySelector('[data-x]').onclick = c), 400);
  }
  window.QQ_APP = { get state() { return S; } };
  boot();
})();
