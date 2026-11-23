/* Qalam — Zaid & Huda, v6: traced from the character board (tools/ref/sami-maryam-sheet.webp).
 *
 * Every shape is drawn in the board's own coordinates (the front-view crops, 350 x 660, centred on
 * x = 175) and scaled into the game's 200 x 292 viewBox by T, so proportions match the board.
 * PERSPECTIVE RULE: straight front view, face centred, symmetrical, feet planted. Poses only move
 * rig parts. Style: flat colour with a soft hint of shade — never heavy 3D (see project memory).
 *
 * Rig (viewBox units): k-all { k-leg-l · k-leg-r · k-upper { torso · k-head · k-arm-l · k-arm-r } }
 *   shoulders 60.4|139.6,142.8 · hips 82.4|117.6,196 · neck 100,132 · waist 100,200
 * Moods: idle · wave · happy · talk · sad · think · cheeky · dance · walk · read · point · sit · sleep
 * Life (random blinks, glances, individual timing) is driven by the loop at the bottom.
 */
(function () {
  'use strict';
  const INK = '#24150F';
  const P = {
    zaid: {
      name: 'Zaid', line: 'I love spotting patterns!',
      skin: '#EC9548', skinLo: '#D27C35', hair: '#3E2522', hairLo: '#311C1A',
      top: '#0F46D6', topLo: '#0A35AE', topHi: '#2A5FE6', pocket: '#0A33A6',
      pants: '#2A2A5C', pantsLo: '#222150', cargo: '#3D3D72',
      shoe: '#F8B500', shoeLo: '#E09E00', stripe: '#FFFFFF', sole: '#F6E9D2',
      mouth: '#8C1D2F', tongue: '#F98A92', teeth: '#FFFFFF', brow: '#3E2522',
    },
    huda: {
      name: 'Huda', line: 'Every letter is a little friend!',
      skin: '#EC9548', skinLo: '#D27C35', hijab: '#7E1A5E', hijabLo: '#661149', hijabHi: '#8E2A6E',
      top: '#6CD4A6', topLo: '#55BE90', topHi: '#86E0B8',
      pants: '#4B1F4F', pantsLo: '#3E1842', cargo: '',
      shoe: '#7C1D5C', shoeLo: '#64134A', stripe: '#FFFFFF', sole: '#F6E9D2',
      mouth: '#8C1D2F', tongue: '#F98A92', teeth: '#FFFFFF', brow: INK,
    },
  };
  const T = 'matrix(0.44 0 0 0.44 23 -0.2)';            // board coordinates -> viewBox
  const W = (s) => `<g transform="${T}">${s}</g>`;
  const WM = (s) => `<g transform="${T}"><g transform="matrix(-1 0 0 1 350 0)">${s}</g></g>`;  // mirrored

  // ---------- legs (viewer's left; the right leg is the mirror) ----------
  function leg(c) {
    return `
      <path d="M80 438 H186 L184 500 Q182 520 175 532 L172 590 Q171 600 160 600 H92 Q80 600 80 588 Z" fill="${c.pants}"/>
      ${c.cargo ? `<rect x="80" y="476" width="50" height="46" rx="12" fill="${c.cargo}" transform="rotate(-6 105 499)"/>` : ''}
      <g class="k-foot">
        <path d="M46 604 Q46 570 84 568 H136 Q168 570 168 602 L168 614 H46 Z" fill="${c.shoe}"/>
        <path d="M150 576 Q166 584 167 604" stroke="${c.shoeLo}" stroke-width="7" fill="none" opacity=".55" stroke-linecap="round"/>
        ${c.cargo ? `<path d="M66 590 L98 584 M70 603 L104 597" stroke="${c.stripe}" stroke-width="9" stroke-linecap="round"/>` : `<path d="M72 592 L108 586" stroke="${c.stripe}" stroke-width="15" stroke-linecap="round"/>`}
        <rect x="42" y="608" width="130" height="24" rx="12" fill="${c.sole}"/>
      </g>`;
  }

  // ---------- arms: chunky sleeve + round hand ----------
  function arm(c, extra) {
    return `
      ${extra || ''}
      <path d="M92 312 Q56 314 46 350 L34 418 Q31 442 60 444 Q86 446 88 424 L102 352 Q104 320 92 312Z" fill="${c.top}"/>
      <path d="M58 340 Q48 380 44 418" stroke="${c.topHi}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>
      <path d="M84 344 Q82 390 80 424" stroke="${c.topLo}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".5"/>
      <circle cx="60" cy="446" r="${c.cargo ? 27 : 31}" fill="${c.skin}"/>
      <path d="M44 456 Q58 470 76 458" stroke="${c.skinLo}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5"/>`;
  }
  const book = `<g class="k-book">
      <rect x="-6" y="378" width="70" height="90" rx="10" fill="#FF7A6B"/>
      <rect x="-6" y="378" width="12" height="90" rx="6" fill="#E85F50"/>
      <path d="M16 396 h34 M16 410 h26" stroke="#FFE7DF" stroke-width="7" stroke-linecap="round"/>
    </g>`;

  // ---------- face (shared shapes; positions differ slightly per buddy) ----------
  function face(c, f) {
    const { lx, rx, ey, by, my, mw } = f;
    const ov = (x) => `<ellipse cx="${x}" cy="${ey}" rx="7.5" ry="13.5"/>`;
    return `
      <g class="k-eyes" fill="${INK}"><g class="k-eye-l">${ov(lx)}</g><g class="k-eye-r">${ov(rx)}</g></g>
      <path class="k-wink" d="M${rx - 14} ${ey + 3} Q${rx} ${ey - 13} ${rx + 14} ${ey + 3}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
      <g class="k-eyes-happy" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round">
        <path d="M${lx - 14} ${ey + 3} Q${lx} ${ey - 13} ${lx + 14} ${ey + 3}"/><path d="M${rx - 14} ${ey + 3} Q${rx} ${ey - 13} ${rx + 14} ${ey + 3}"/></g>
      <g class="k-eyes-shut" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round">
        <path d="M${lx - 13} ${ey} Q${lx} ${ey + 10} ${lx + 13} ${ey}"/><path d="M${rx - 13} ${ey} Q${rx} ${ey + 10} ${rx + 13} ${ey}"/></g>
      <g class="k-brows" fill="none" stroke="${c.brow}" stroke-width="${c.hair ? 10 : 8}" stroke-linecap="round">
        <path class="k-brow k-brow-l" d="M${lx - 17} ${by + 6} Q${lx} ${by - 6} ${lx + 15} ${by + 3}"/>
        <path class="k-brow k-brow-r" d="M${rx - 15} ${by + 3} Q${rx} ${by - 6} ${rx + 17} ${by + 6}"/>
      </g>
      <g class="k-mouths">
        <g class="m m-open"><path d="M${175 - mw} ${my} Q175 ${my + 4} ${175 + mw} ${my} Q${173 + mw} ${my + 56} 175 ${my + 56} Q${177 - mw} ${my + 56} ${175 - mw} ${my}Z" fill="${c.mouth}"/>
          <path d="M${175 - mw * .65} ${my + 38} Q175 ${my + 22} ${175 + mw * .65} ${my + 38} Q${175 + mw * .45} ${my + 54} 175 ${my + 54} Q${175 - mw * .45} ${my + 54} ${175 - mw * .65} ${my + 38}Z" fill="${c.tongue}"/></g>
        <g class="m m-grin"><path d="M${175 - mw} ${my} Q175 ${my + 4} ${175 + mw} ${my} Q${173 + mw} ${my + 50} 175 ${my + 50} Q${177 - mw} ${my + 50} ${175 - mw} ${my}Z" fill="${c.mouth}"/>
          <path d="M${177 - mw} ${my + 2} Q175 ${my + 6} ${173 + mw} ${my + 2} Q${170 + mw} ${my + 15} 175 ${my + 16} Q${180 - mw} ${my + 15} ${177 - mw} ${my + 2}Z" fill="${c.teeth}"/>
          <path d="M${175 - mw * .5} ${my + 38} Q175 ${my + 28} ${175 + mw * .5} ${my + 38} Q${175 + mw * .35} ${my + 48} 175 ${my + 48} Q${175 - mw * .35} ${my + 48} ${175 - mw * .5} ${my + 38}Z" fill="${c.tongue}"/></g>
        <path class="m m-smile" d="M${178 - mw} ${my + 10} Q175 ${my + 40} ${172 + mw} ${my + 10}" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
        <g class="m m-o"><ellipse cx="175" cy="${my + 24}" rx="13" ry="17" fill="${c.mouth}"/><ellipse cx="175" cy="${my + 33}" rx="8" ry="6" fill="${c.tongue}"/></g>
        <path class="m m-sad" d="M${180 - mw} ${my + 34} Q175 ${my + 12} ${170 + mw} ${my + 34}" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
        <path class="m m-smirk" d="M${180 - mw} ${my + 22} Q${178} ${my + 36} ${172 + mw} ${my + 8}" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
      </g>`;
  }

  // ---------- heads ----------
  function headZaid(c) {
    return W(`
      <g fill="${c.hair}">
        <circle cx="112" cy="96" r="62"/><circle cx="216" cy="90" r="62"/><circle cx="164" cy="84" r="50"/>
        <circle cx="62" cy="140" r="46"/><circle cx="280" cy="136" r="43"/><circle cx="50" cy="192" r="28"/><circle cx="298" cy="190" r="26"/>
      </g>
      <path d="M30 196 Q20 150 44 116 M300 128 Q322 160 312 204" stroke="${c.hairLo}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".55"/>
      <circle cx="72" cy="238" r="27" fill="${c.skin}"/><circle cx="278" cy="238" r="27" fill="${c.skin}"/>
      <path d="M175 124 C238 124 264 168 264 216 C264 270 228 302 175 302 C122 302 86 270 86 216 C86 168 112 124 175 124Z" fill="${c.skin}"/>
      <path d="M248 190 C262 250 230 296 175 300 C226 290 252 250 248 190Z" fill="${c.skinLo}" opacity=".45"/>
      <path d="M72 206 Q66 132 110 108 Q175 82 240 108 Q284 132 278 206 Q272 170 260 160 Q252 138 228 140 Q213 126 193 134 Q176 122 158 134 Q138 124 124 138 Q102 138 96 158 Q82 168 72 206Z" fill="${c.hair}"/>
      ${face(c, { lx: 146, rx: 205, ey: 200, by: 160, my: 232, mw: 37 })}`);
  }
  function headHuda(c) {
    return W(`
      <path d="M176 14 C96 14 30 68 30 160 C30 212 44 250 34 292 C26 328 8 360 18 382 C30 402 62 398 74 374 L104 316 L256 316 C292 296 306 244 306 162 C306 72 250 14 176 14Z" fill="${c.hijab}"/>
      <path d="M34 292 C26 328 8 360 18 382 C30 402 62 398 74 374 L96 326 C70 326 48 312 34 292Z" fill="${c.hijabLo}"/>
      <path d="M282 120 C306 180 298 256 256 306" stroke="${c.hijabLo}" stroke-width="12" fill="none" opacity=".45" stroke-linecap="round"/>
      <ellipse cx="177" cy="172" rx="93" ry="98" fill="${c.skin}"/>
      <path d="M254 140 C278 220 246 268 177 270 C236 256 262 214 254 140Z" fill="${c.skinLo}" opacity=".45"/>
      <path d="M62 250 Q177 336 292 250 L286 306 Q177 350 68 306Z" fill="${c.hijab}"/>
      <path d="M76 292 Q177 348 280 292" stroke="${c.hijabLo}" stroke-width="8" fill="none" opacity=".6" stroke-linecap="round"/>
      ${face(c, { lx: 140, rx: 212, ey: 153, by: 114, my: 186, mw: 34 })}`);
  }

  // ---------- torsos ----------
  function torsoZaid(c) {
    return W(`
      <path d="M95 304 Q175 288 255 304 Q286 318 288 352 L293 430 Q294 454 270 454 H80 Q56 454 57 430 L62 352 Q64 318 95 304Z" fill="${c.top}"/>
      <path d="M262 312 Q290 330 291 380 L293 430 Q294 454 270 454 H246 Q272 440 272 400 Z" fill="${c.topLo}" opacity=".55"/>
      <path d="M58 436 H292 Q294 454 270 454 H80 Q56 454 58 436Z" fill="${c.topLo}" opacity=".7"/>
      <path d="M126 392 Q126 382 136 382 H214 Q224 382 224 392 L236 434 H114 Z" fill="${c.pocket}"/>
      <path d="M104 298 Q175 266 246 298 Q256 320 238 334 Q175 356 112 334 Q94 320 104 298Z" fill="${c.top}"/>
      <path d="M104 298 Q175 270 246 298" stroke="${c.topHi}" stroke-width="6" fill="none" opacity=".6" stroke-linecap="round"/><path d="M148 300 L175 326 L202 300 Q175 292 148 300Z" fill="${c.topLo}"/>
      <rect x="148" y="326" width="13" height="48" rx="6.5" fill="#fff"/><rect x="189" y="326" width="13" height="48" rx="6.5" fill="#fff"/>`);
  }
  function torsoHuda(c) {
    return W(`
      <path d="M90 300 Q176 284 262 300 Q298 314 300 352 L305 452 Q306 470 290 470 H62 Q46 470 47 452 L52 352 Q54 314 90 300Z" fill="${c.top}"/>
      <path d="M262 310 Q298 326 300 380 L305 452 Q306 470 290 470 H262 Q284 450 284 400 Z" fill="${c.topLo}" opacity=".6"/>
      <path d="M236 340 Q250 400 248 460" stroke="${c.topLo}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>`);
  }

  // ---------- assemble ----------
  function kid(buddy, mood, cls, opts) {
    buddy = P[buddy] ? buddy : 'huda';
    const c = P[buddy]; const o = opts || {};
    const huda = buddy === 'huda';
    const vb = o.headOnly ? '28 6 144 132' : '0 0 200 292';
    const armL = `<g class="k-arm k-arm-l">${W(arm(c))}</g>`;
    const armR = `<g class="k-arm k-arm-r">${WM(arm(c, book))}
        <g class="k-thumb"><rect x="146.5" y="176" width="10" height="19" rx="5" fill="${c.skin}"/></g></g>`;
    const head = `<g class="k-head">${huda ? headHuda(c) : headZaid(c)}
        <g class="k-q"><path d="M152 18 Q152 6 163 6 Q174 6 174 16 Q174 24 165 28 L165 33" fill="none" stroke="#1E44D2" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="165" cy="43" r="4.2" fill="#1E44D2"/></g>
        <g class="k-rays" stroke="#FFC20E" stroke-width="6" stroke-linecap="round"><path d="M150 14 L156 3"/><path d="M164 25 L176 17"/><path d="M170 41 L184 40"/></g></g>`;
    return `<svg class="kid ${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" viewBox="${vb}" role="img" aria-label="${c.name}">
      <ellipse class="k-shadow" cx="100" cy="285" rx="60" ry="6"/>
      <g class="k-all">
        <g class="k-leg k-leg-l">${W(leg(c))}</g>
        <g class="k-leg k-leg-r">${WM(leg(c))}</g>
        <g class="k-upper">
          ${huda ? torsoHuda(c) : torsoZaid(c)}
          ${head + armL + armR}
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

  // ---------- life: random blinks, glances and individual timing for every kid on screen ----------
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const life = new WeakMap();
  function tick() {
    const now = performance.now();
    document.querySelectorAll('svg.kid').forEach((k) => {
      let s = life.get(k);
      if (!s) {
        s = { blink: now + 500 + Math.random() * 3000, look: now + 900 + Math.random() * 2500 };
        k.style.setProperty('--ph', (-Math.random() * 6).toFixed(2) + 's');
        k.style.setProperty('--sp', (0.92 + Math.random() * 0.16).toFixed(2));
        life.set(k, s);
      }
      if (now > s.blink) {
        k.classList.add('blink'); setTimeout(() => k.classList.remove('blink'), 120);
        if (Math.random() < 0.18) setTimeout(() => { k.classList.add('blink'); setTimeout(() => k.classList.remove('blink'), 110); }, 240);
        s.blink = now + 2200 + Math.random() * 4300;
      }
      if (now > s.look) {
        const away = Math.random() < 0.5;
        k.style.setProperty('--lx', away ? ((Math.random() * 2 - 1) * 2.2).toFixed(1) + 'px' : '0px');
        k.style.setProperty('--ly', away ? ((Math.random() * 2 - 1) * 1.2).toFixed(1) + 'px' : '0px');
        s.look = now + 1000 + Math.random() * 2800;
      }
    });
    setTimeout(tick, 160);
  }
  if (!reduce) setTimeout(tick, 300);

  window.QQ_MASCOT = { BUDDIES: P, kid, setMood, liven };
})();
