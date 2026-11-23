/* Qalam — Zaid & Huda, v8: vector recreations of the character board, fully rigged.
 *
 * The art is traced shape by shape from the board's front views by tools/trace_kids.py
 * (data: js/kids-vector.js) — the same flat colours and soft two-tone shading as the board — and
 * split into a rig: legs · torso · head (with its own eyes, eyebrows and mouth) · arms.
 * Joint positions come from the data, so every part turns around the right point.
 *
 * Motion lives in css/mascot.css. On top of the moods, an idle kid fidgets now and then (looks
 * around, scratches its head, stretches, taps a foot, hops, sways), blinks and glances at random,
 * and every kid has its own phase and tempo, so no two ever move in lock-step.
 *
 * Moods: idle · wave · happy · talk · sad · think · cheeky · dance · walk · read · point · sit · sleep
 *        + celebrate · nod · shake · shrug · clap
 * Public API: QQ_MASCOT.kid(buddy, mood, cls, {headOnly}), setMood(el, mood, ms), liven(el, moods, every)
 */
(function () {
  'use strict';
  const DATA = window.QQ_KIDV || {};
  const BUDDIES = {
    zaid: { name: 'Zaid', line: 'I love spotting patterns!' },
    huda: { name: 'Huda', line: 'Every letter is a little friend!' },
  };
  const at = (p) => `transform-origin:${p[0]}px ${p[1]}px`;
  const paths = (layers) => layers.map((l) => `<path d="${l.d}" fill="${l.fill}" stroke="${l.fill}" stroke-width=".35" stroke-linejoin="round" fill-rule="evenodd"/>`).join('');

  function face(f, col) {
    const ink = f.eyeFill; const [L, R] = f.eyes; const m = f.mouthBox;
    const eye = (e, side) => `<ellipse class="k-eye k-eye-${side}" cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${ink}"/>`;
    const arcUp = (e) => `M${e.cx - e.rx * 1.9} ${e.cy + e.ry * .35} Q${e.cx} ${e.cy - e.ry * 1.05} ${e.cx + e.rx * 1.9} ${e.cy + e.ry * .35}`;
    const arcDown = (e) => `M${e.cx - e.rx * 1.8} ${e.cy} Q${e.cx} ${e.cy + e.ry * .85} ${e.cx + e.rx * 1.8} ${e.cy}`;
    const sw = (L.rx * 1.05).toFixed(2);
    const brows = f.brows.map((b, i) => `<g class="k-brow k-brow-${i ? 'r' : 'l'}">${paths([b])}</g>`).join('');
    const stroke = (cls, d) => `<path class="m ${cls}" d="${d}" fill="none" stroke="${ink}" stroke-width="${(m.ry * .32).toFixed(2)}" stroke-linecap="round"/>`;
    return `<g class="k-face">
      <g class="k-eyes">${eye(L, 'l')}${eye(R, 'r')}</g>
      <path class="k-wink" d="${arcUp(R)}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>
      <g class="k-eyes-happy" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"><path d="${arcUp(L)}"/><path d="${arcUp(R)}"/></g>
      <g class="k-eyes-shut" fill="none" stroke="${ink}" stroke-width="${(L.rx * .9).toFixed(2)}" stroke-linecap="round"><path d="${arcDown(L)}"/><path d="${arcDown(R)}"/></g>
      ${brows}
      <g class="m m-base" style="${at([m.cx, m.cy])}">${paths(f.mouth)}</g>
      ${stroke('m-smile', `M${m.cx - m.rx * .7} ${m.cy - m.ry * .25} Q${m.cx} ${m.cy + m.ry * .95} ${m.cx + m.rx * .7} ${m.cy - m.ry * .25}`)}
      ${stroke('m-sad', `M${m.cx - m.rx * .55} ${m.cy + m.ry * .55} Q${m.cx} ${m.cy - m.ry * .45} ${m.cx + m.rx * .55} ${m.cy + m.ry * .55}`)}
      ${stroke('m-smirk', `M${m.cx - m.rx * .65} ${m.cy + m.ry * .1} Q${m.cx + m.rx * .1} ${m.cy + m.ry * .75} ${m.cx + m.rx * .72} ${m.cy - m.ry * .45}`)}
      <g class="m m-o"><ellipse cx="${m.cx}" cy="${m.cy + m.ry * .1}" rx="${(m.rx * .36).toFixed(2)}" ry="${(m.ry * .72).toFixed(2)}" fill="${col.mouth}"/><ellipse cx="${m.cx}" cy="${m.cy + m.ry * .45}" rx="${(m.rx * .22).toFixed(2)}" ry="${(m.ry * .22).toFixed(2)}" fill="${col.tongue}"/></g>
    </g>`;
  }

  function kid(buddy, mood, cls, opts) {
    buddy = BUDDIES[buddy] ? buddy : 'huda';
    const d = DATA[buddy]; const o = opts || {};
    if (!d) return `<svg class="kid ${cls || ''}" viewBox="0 0 200 292"></svg>`;
    const J = d.joints; const P = d.parts;
    const vb = o.headOnly ? d.head.join(' ') : '0 0 200 292';
    const [hx, hy] = J.handR;
    const book = `<g class="k-book" transform="rotate(-62 ${hx} ${hy})"><rect x="${hx - 26}" y="${hy - 30}" width="28" height="34" rx="3.5" fill="#FF7A6B"/><rect x="${hx - 26}" y="${hy - 30}" width="5" height="34" rx="2.5" fill="#E85F50"/><path d="M${hx - 17} ${hy - 22} h13 M${hx - 17} ${hy - 16} h9" stroke="#FFE7DF" stroke-width="2.4" stroke-linecap="round"/></g>`;
    const thumb = `<g class="k-thumb" style="${at([hx, hy])}"><rect x="${hx - 3.6}" y="${hy - 15}" width="7.2" height="13" rx="3.6" fill="${d.face.skin}"/></g>`;
    const filler = (p) => `<circle cx="${p[0]}" cy="${p[1] + 3}" r="7.5" fill="${J.sleeve}"/>`;
    const extras = `<g class="k-q"><path d="M150 30 Q150 17 161 17 Q172 17 172 27 Q172 35 163 39 L163 45" fill="none" stroke="#1E44D2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="163" cy="54" r="4.1" fill="#1E44D2"/></g>
      <g class="k-rays" stroke="#FFC20E" stroke-width="5.5" stroke-linecap="round"><path d="M148 22 L154 10"/><path d="M161 33 L172 25"/><path d="M166 48 L179 47"/></g>
      <g class="k-z" fill="#6E7BB8" font-family="Nunito, sans-serif" font-weight="900"><text x="146" y="40" font-size="18">z</text><text x="158" y="25" font-size="13">z</text></g>`;
    return `<svg class="kid ${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" viewBox="${vb}" role="img" aria-label="${BUDDIES[buddy].name}">
      <ellipse class="k-shadow" cx="100" cy="285" rx="56" ry="6"/>
      <g class="k-all">
        <g class="k-leg k-leg-l" style="${at(J.hipL)}">${paths(P.legL)}</g>
        <g class="k-leg k-leg-r" style="${at(J.hipR)}">${paths(P.legR)}</g>
        <g class="k-upper" style="${at(J.waist)}">
          <g class="k-torso">${paths(P.torso)}</g>
          <g class="k-head" style="${at(J.neckP)}">${paths(P.head)}${face(d.face, d.colours)}${extras}</g>
          <g class="k-arm k-arm-l" style="${at(J.shoulderL)}">${filler(J.shoulderL)}${paths(P.armL)}</g>
          <g class="k-arm k-arm-r" style="${at(J.shoulderR)}">${filler(J.shoulderR)}${paths(P.armR)}${book}${thumb}</g>
        </g>
      </g>
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

  // ---------- life: blinks, glances, idle fidgets and an individual rhythm for every kid ----------
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FIDGETS = ['fx-look', 'fx-scratch', 'fx-stretch', 'fx-tap', 'fx-hop', 'fx-sway', 'fx-look'];
  const life = new WeakMap();
  function tick() {
    const now = performance.now();
    document.querySelectorAll('svg.kid').forEach((k) => {
      let s = life.get(k);
      if (!s) {
        s = { blink: now + 600 + Math.random() * 3000, look: now + 900 + Math.random() * 2500, fidget: now + 3500 + Math.random() * 4000 };
        k.style.setProperty('--ph', (-Math.random() * 6).toFixed(2) + 's');
        k.style.setProperty('--sp', (0.92 + Math.random() * 0.16).toFixed(2));
        life.set(k, s);
      }
      if (now > s.blink) {
        k.classList.add('blink'); setTimeout(() => k.classList.remove('blink'), 130);
        if (Math.random() < 0.18) setTimeout(() => { k.classList.add('blink'); setTimeout(() => k.classList.remove('blink'), 120); }, 260);
        s.blink = now + 2300 + Math.random() * 4200;
      }
      if (now > s.look) {
        const away = Math.random() < 0.5;
        k.style.setProperty('--lx', away ? ((Math.random() * 2 - 1) * 1.6).toFixed(1) + 'px' : '0px');
        k.style.setProperty('--ly', away ? ((Math.random() * 2 - 1) * .9).toFixed(1) + 'px' : '0px');
        s.look = now + 1000 + Math.random() * 2800;
      }
      if (now > s.fidget) {
        if (k.getAttribute('data-mood') === 'idle' && !k.closest('.avatar, .avatar-big')) {
          const fx = FIDGETS[(Math.random() * FIDGETS.length) | 0];
          k.classList.add(fx); setTimeout(() => k.classList.remove(fx), 1900);
        }
        s.fidget = now + 4500 + Math.random() * 5500;
      }
    });
    setTimeout(tick, 160);
  }
  if (!reduce) setTimeout(tick, 300);

  window.QQ_MASCOT = { BUDDIES, kid, setMood, liven };
})();
