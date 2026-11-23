/* Qalam — Zaid & Huda, v7: the real character art.
 *
 * The kids are the illustrations from the character board (tools/ref/sami-maryam-sheet.webp), cut out
 * by tools/cut_kids.py and placed by tools/build_kids.py (data in js/kids-data.js). They are never
 * redrawn as shapes. Each mood shows one of the board's poses and moves the WHOLE character
 * (breathing, bobbing, hopping, swaying — css/mascot.css), so they always read as one connected
 * person. Changing mood cross-fades between poses; blinks are painted over the real eyes at random.
 *
 * Public API (unchanged): QQ_MASCOT.kid(buddy, mood, cls, {headOnly}), setMood(el, mood, ms),
 * liven(el, moods, every), BUDDIES.
 */
(function () {
  'use strict';
  const DATA = window.QQ_KIDS || {};
  // resolve sprite paths relative to this script, so pages in sub-folders work too
  const BASE = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/js\/mascot\.js.*$/, '') : ''; })();
  const BUDDIES = {
    zaid: { name: 'Zaid', line: 'I love spotting patterns!' },
    huda: { name: 'Huda', line: 'Every letter is a little friend!' },
  };
  // which board pose each mood uses
  const POSE = {
    zaid: { idle: 'front', wave: 'jump', happy: 'jump', talk: 'front', sad: 'front', think: 'front', cheeky: 'wow', dance: 'jump', walk: 'front', read: 'front', point: 'wow', sit: 'front', sleep: 'front' },
    huda: { idle: 'front', wave: 'cheer', happy: 'cheer', talk: 'front', sad: 'front', think: 'front', cheeky: 'read', dance: 'cheer', walk: 'front', read: 'read', point: 'read', sit: 'front', sleep: 'front' },
  };

  // CSS that shows the right pose for each buddy + mood (generated, so the map lives in one place)
  (function injectPoseRules() {
    const rules = [];
    for (const [b, moods] of Object.entries(POSE)) {
      for (const [m, p] of Object.entries(moods)) rules.push(`.kid[data-buddy="${b}"][data-mood="${m}"] .k-pose[data-pose="${p}"]`);
    }
    const st = document.createElement('style');
    st.textContent = rules.join(',\n') + ' { opacity: 1; visibility: visible; transition-delay: 0s; }';
    document.head.appendChild(st);
  })();

  const Q = `<g class="k-q"><path d="M148 30 Q148 16 160 16 Q172 16 172 27 Q172 35 162 40 L162 46" fill="none" stroke="#1E44D2" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="162" cy="56" r="4.4" fill="#1E44D2"/></g>`;
  const ZZ = `<g class="k-z" fill="#6E7BB8" font-family="Nunito, sans-serif" font-weight="900"><text x="146" y="40" font-size="20">z</text><text x="160" y="24" font-size="14">z</text></g>`;

  function kid(buddy, mood, cls, opts) {
    buddy = BUDDIES[buddy] ? buddy : 'huda';
    const d = DATA[buddy]; const o = opts || {};
    if (!d) return `<svg class="kid ${cls || ''}" viewBox="0 0 200 292"></svg>`;
    const vb = o.headOnly ? d.head.join(' ') : '0 0 200 292';
    const poses = Object.entries(d.poses).map(([name, p]) => `
      <g class="k-pose" data-pose="${name}">
        <image href="${BASE}${p.href}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="none"/>
        <g class="k-lids">${p.eyes.map((e) => `<g class="k-lid"><ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${e.skin}"/><path d="M${e.cx - e.rx * .8} ${e.cy + e.ry * .25} Q${e.cx} ${e.cy + e.ry * .75} ${e.cx + e.rx * .8} ${e.cy + e.ry * .25}" stroke="#2A1810" stroke-width="${(e.rx * .45).toFixed(2)}" fill="none" stroke-linecap="round"/></g>`).join('')}</g>
      </g>`).join('');
    return `<svg class="kid ${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" viewBox="${vb}" role="img" aria-label="${BUDDIES[buddy].name}">
      <ellipse class="k-shadow" cx="100" cy="285" rx="56" ry="6"/>
      <g class="k-all"><g class="k-breath">${poses}</g>${Q}${ZZ}</g>
    </svg>`;
  }

  function setMood(root, mood, ms) {
    const el = root && (root.matches && root.matches('.kid') ? root : root.querySelector('.kid'));
    if (!el) return;
    el.setAttribute('data-mood', mood);
    clearTimeout(el._moodT);
    if (ms) el._moodT = setTimeout(() => el.setAttribute('data-mood', el.dataset.rest || 'idle'), ms);
  }

  // Cycles a kid through moods; the timing wanders a little so two kids never move in lock-step.
  function liven(el, moods, every) {
    if (!el) return;
    let i = 0; const base = every || 3200;
    clearTimeout(el._liven);
    const next = () => {
      el._liven = setTimeout(() => {
        if (!document.body.contains(el)) return;
        i = (i + 1) % moods.length; el.setAttribute('data-mood', moods[i]); next();
      }, base * (0.8 + Math.random() * 0.45));
    };
    next();
  }

  // ---------- life: random blinks and an individual rhythm for every kid on screen ----------
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const life = new WeakMap();
  function tick() {
    const now = performance.now();
    document.querySelectorAll('svg.kid').forEach((k) => {
      let s = life.get(k);
      if (!s) {
        s = { blink: now + 600 + Math.random() * 3000 };
        k.style.setProperty('--ph', (-Math.random() * 6).toFixed(2) + 's');   // own phase
        k.style.setProperty('--sp', (0.92 + Math.random() * 0.16).toFixed(2)); // own tempo
        life.set(k, s);
      }
      if (now > s.blink) {
        k.classList.add('blink'); setTimeout(() => k.classList.remove('blink'), 130);
        if (Math.random() < 0.18) setTimeout(() => { k.classList.add('blink'); setTimeout(() => k.classList.remove('blink'), 120); }, 260);
        s.blink = now + 2300 + Math.random() * 4200;
      }
    });
    setTimeout(tick, 160);
  }
  if (!reduce) setTimeout(tick, 300);

  window.QQ_MASCOT = { BUDDIES, kid, setMood, liven };
})();
