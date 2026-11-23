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
  const paths = (layers) => layers.map((l) => `<path d="${l.d}" fill="${l.fill}" fill-rule="evenodd"/>`).join('');
  let uid = 0;
  // A part = its smooth silhouette (underlay) + every colour region clipped to that silhouette, so the
  // outline stays smooth and overlapping regions never leave specks or seams.
  function part(p) {
    if (Array.isArray(p)) return paths(p);
    const id = 'kc' + (++uid);
    const free = p.layers.filter((l) => l.noclip), rest = p.layers.filter((l) => !l.noclip);
    const pills = (p.pills || []).map((q) => `<rect x="${q.cx - q.w / 2}" y="${q.cy - q.h / 2}" width="${q.w}" height="${q.h}" rx="${q.rx}" fill="${q.fill}" transform="rotate(${q.a} ${q.cx} ${q.cy})"/>`).join('');
    return `${paths(free)}<clipPath id="${id}"><path d="${p.clip}" fill-rule="evenodd"/></clipPath><g clip-path="url(#${id})">${paths(rest)}${pills}</g>`;
  }

  function face(f, col) {
    const ink = f.eyeFill; const [L, R] = f.eyes; const m = f.mouthBox;
    const eye = (e, side) => `<ellipse class="k-eye k-eye-${side}" cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${ink}"/>`;
    const arcUp = (e) => `M${e.cx - e.rx * 1.9} ${e.cy + e.ry * .35} Q${e.cx} ${e.cy - e.ry * 1.05} ${e.cx + e.rx * 1.9} ${e.cy + e.ry * .35}`;
    const arcDown = (e) => `M${e.cx - e.rx * 1.8} ${e.cy} Q${e.cx} ${e.cy + e.ry * .85} ${e.cx + e.rx * 1.8} ${e.cy}`;
    const sw = (L.rx * 1.05).toFixed(2);
    const brows = f.brows.map((b, i) => `<g class="k-brow k-brow-${i ? 'r' : 'l'}"><path d="${b.d}" fill="none" stroke="${b.stroke}" stroke-width="${b.w}" stroke-linecap="round"/></g>`).join('');
    const stroke = (cls, d) => `<path class="m ${cls}" d="${d}" fill="none" stroke="${ink}" stroke-width="${(m.ry * .32).toFixed(2)}" stroke-linecap="round"/>`;
    return `<g class="k-face">
      <g class="k-eyes">${eye(L, 'l')}${eye(R, 'r')}</g>
      <path class="k-wink" d="${arcUp(R)}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>
      <g class="k-eyes-happy" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"><path d="${arcUp(L)}"/><path d="${arcUp(R)}"/></g>
      <g class="k-eyes-shut" fill="none" stroke="${ink}" stroke-width="${(L.rx * .9).toFixed(2)}" stroke-linecap="round"><path d="${arcDown(L)}"/><path d="${arcDown(R)}"/></g>
      ${brows}
      <g class="m m-base" style="${at([m.cx, m.cy])}">${part(f.mouth)}</g>
      ${stroke('m-smile', `M${m.cx - m.rx * .7} ${m.cy - m.ry * .25} Q${m.cx} ${m.cy + m.ry * .95} ${m.cx + m.rx * .7} ${m.cy - m.ry * .25}`)}
      ${stroke('m-sad', `M${m.cx - m.rx * .55} ${m.cy + m.ry * .55} Q${m.cx} ${m.cy - m.ry * .45} ${m.cx + m.rx * .55} ${m.cy + m.ry * .55}`)}
      ${stroke('m-smirk', `M${m.cx - m.rx * .65} ${m.cy + m.ry * .1} Q${m.cx + m.rx * .1} ${m.cy + m.ry * .75} ${m.cx + m.rx * .72} ${m.cy - m.ry * .45}`)}
      <g class="m m-o"><ellipse cx="${m.cx}" cy="${m.cy + m.ry * .1}" rx="${(m.rx * .36).toFixed(2)}" ry="${(m.ry * .72).toFixed(2)}" fill="${col.mouth}"/><ellipse cx="${m.cx}" cy="${m.cy + m.ry * .45}" rx="${(m.rx * .22).toFixed(2)}" ry="${(m.ry * .22).toFixed(2)}" fill="${col.tongue}"/></g>
    </g>`;
  }

  // ======================= ACTIVITIES =======================
  // One constant, characterful activity per character (like Duolingo's world). Pose angles (degrees at the
  // shoulder; for both arms "inward" = left negative / right positive) live here; the looping motion lives
  // in css/mascot.css. Props are placed from the traced joints so they sit exactly in the hands.
  const ACT = {
    reading:   { L: -26, R: 26 },
    quran:     { L: -24, R: 24 },
    writing:   { L: -46, R: 28 },
    thinking:  { L: 6, R: 104 },
    napping:   { L: 4, R: -4 },
    dua:       { L: -52, R: 52 },
    dates:     { L: -40, R: 28 },
    listening: { L: 4, R: -4 },
    painting:  { L: 4, R: -58 },
    watering:  { L: 4, R: -40 },
    detective: { L: 6, R: 140 },
    bubbles:   { L: 6, R: 138 },
    ball:      { L: 6, R: -16 },
    stretching:{ L: 0, R: 0 },
    pointing:  { L: 6, R: -86 },
  };
  (function injectPoses() {
    const st = document.createElement('style');
    st.textContent = Object.entries(ACT).map(([m, a]) => `.kid[data-mood="${m}"] .k-arm-l { rotate: ${a.L}deg; } .kid[data-mood="${m}"] .k-arm-r { rotate: ${a.R}deg; } .kid[data-act="${m}"]:not([data-mood="${m}"]) .kp { display: none; }`).join('\n');
    document.head.appendChild(st);
  })();
  const R2D = Math.PI / 180;
  function handAt(J, side, deg) {
    const s = J['shoulder' + side], h = J['hand' + side];
    const vx = h[0] - s[0], vy = h[1] - s[1], c = Math.cos(deg * R2D), n = Math.sin(deg * R2D);
    return [s[0] + vx * c - vy * n, s[1] + vx * n + vy * c];
  }
  const f1 = (v) => Math.round(v * 10) / 10;
  // a prop held upright in a hand (placed inside the arm group, so it follows the arm)
  const inHand = (J, side, deg, cls, inner) => { const h = J['hand' + side]; return `<g class="kp ${cls}" transform="translate(${f1(h[0])} ${f1(h[1])}) rotate(${-deg})">${inner}</g>`; };
  const WOOD = '#C8834A', WOODLO = '#A5652F';
  function activityProps(buddy, mood, d) {
    const out = { back: '', front: '', body: '', bodyFront: '', head: '', handL: '', handR: '', handLback: '', handRback: '' };
    const a = ACT[mood]; if (!a) return out;
    const J = d.joints, skin = d.face.skin, z = buddy === 'zaid';
    const HL = handAt(J, 'L', a.L), HR = handAt(J, 'R', a.R);
    const eyesY = (d.face.eyes[0].cy + d.face.eyes[1].cy) / 2, mouth = d.face.mouthBox;
    const top = d.head[1];                                       // top of the head
    switch (mood) {
      case 'reading': {
        const mx = (HL[0] + HR[0]) / 2, my = Math.min(HL[1], HR[1]) - 16;
        const hand = (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${z ? 9.5 : 10.5}" fill="${skin}"/>`;
        out.bodyFront = `<g class="kp p-book" transform="translate(${f1(mx)} ${f1(my)}) scale(1.35)">
          <path d="M-30 -18 Q-15 -23 0 -17 Q15 -23 30 -18 L30 10 Q15 5 0 11 Q-15 5 -30 10Z" fill="#E2584A"/>
          <path d="M-27 -19 Q-13 -24 0 -18 V8 Q-13 3 -27 7Z" fill="#FFF6EC"/><path d="M27 -19 Q13 -24 0 -18 V8 Q13 3 27 7Z" fill="#F2E6D6"/>
          <path d="M-22 -12 h15 M-22 -7 h13 M-22 -2 h15 M7 -12 h15 M7 -7 h12 M7 -2 h14" stroke="#D9C6B2" stroke-width="1.6" stroke-linecap="round"/>
          <g class="p-page"><path d="M0 -18 Q13 -24 27 -19 V7 Q13 3 0 8Z" fill="#FFFDF8"/></g></g>${hand(HL[0] - 4, HL[1] - 4)}${hand(HR[0] + 4, HR[1] - 4)}`;
        break;
      }
      case 'quran': {
        const y = 186;
        out.front = `<g class="kp p-rahl">
          <path d="M70 284 L128 214 M130 284 L72 214" stroke="${WOODLO}" stroke-width="7" stroke-linecap="round"/>
          <path d="M70 284 L128 214 M130 284 L72 214" stroke="${WOOD}" stroke-width="4.4" stroke-linecap="round"/>
          <g class="p-mushaf"><path d="M58 ${y} Q79 ${y - 8} 100 ${y} Q121 ${y - 8} 142 ${y} L136 ${y + 28} Q118 ${y + 22} 100 ${y + 30} Q82 ${y + 22} 64 ${y + 28}Z" fill="#2F8F6B"/>
            <path d="M63 ${y - 1} Q81 ${y - 8} 100 ${y} V${y + 26} Q82 ${y + 19} 67 ${y + 24}Z" fill="#FFF6E2"/><path d="M137 ${y - 1} Q119 ${y - 8} 100 ${y} V${y + 26} Q118 ${y + 19} 133 ${y + 24}Z" fill="#F4E8CF"/>
            <path d="M71 ${y + 5} Q80 ${y + 2} 92 ${y + 5} M71 ${y + 11} Q80 ${y + 8} 92 ${y + 11} M108 ${y + 5} Q120 ${y + 2} 129 ${y + 5} M108 ${y + 11} Q120 ${y + 8} 129 ${y + 11}" stroke="#7E9C8C" stroke-width="1.6" fill="none" stroke-linecap="round"/></g></g>`;
        break;
      }
      case 'writing': {
        out.handL = inHand(J, 'L', a.L, 'p-slate', `<g transform="translate(14 -24)"><rect x="-20" y="-16" width="40" height="34" rx="5" fill="${WOOD}"/><rect x="-16.5" y="-12.5" width="33" height="27" rx="3" fill="#33485C"/>
          <path class="p-letter" d="M-9 -2 Q-9 8 0 8 Q9 8 9 -2" stroke="#F5F2EA" stroke-width="2.6" fill="none" stroke-linecap="round" pathLength="1"/><circle class="p-dot" cx="0" cy="12" r="1.8" fill="#F5F2EA"/></g>`);
        out.handR = inHand(J, 'R', a.R, 'p-pen', `<g transform="rotate(-48)"><rect x="-2.6" y="-26" width="5.2" height="24" rx="2.4" fill="#FFB703"/><path d="M-2.6 -26 L0 -32 L2.6 -26Z" fill="#3C2A20"/><rect x="-2.6" y="-6" width="5.2" height="4" fill="#E08E00"/></g>`);
        break;
      }
      case 'thinking': break;                                   // uses the "?" bubble already in the head
      case 'napping': {
        const blanket = z ? ['#FFB703', '#E89A00', '#FFF2C9'] : ['#B79CF0', '#9A7FD6', '#EDE3FF'];
        out.back = `<g class="kp p-bed"><rect x="6" y="268" width="190" height="16" rx="8" fill="#E6E0F2"/><ellipse cx="38" cy="262" rx="32" ry="15" fill="#FFFFFF"/><ellipse cx="38" cy="268" rx="32" ry="9" fill="#E9E4F4"/></g>`;
        out.front = `<g class="kp p-blanket"><path d="M74 236 Q134 222 197 236 L197 284 H72 Q68 258 74 236Z" fill="${blanket[0]}"/>
          <path d="M74 236 Q134 222 197 236 L197 245 Q134 232 74 245Z" fill="${blanket[2]}"/>
          <path d="M104 252 v26 M128 249 v29 M152 249 v29 M176 251 v27" stroke="${blanket[1]}" stroke-width="3" stroke-linecap="round" opacity=".55"/></g>
          <g class="kp p-zz" fill="none" stroke="#6E7BB8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path class="z1" d="M58 214 H68 L58 225 H68"/><path class="z2" d="M74 198 H81 L74 206 H81"/></g>`;
        break;
      }
      case 'dua': {
        const palm = `<ellipse cx="0" cy="-6" rx="9" ry="6" fill="${skin}"/><ellipse cx="0" cy="-8" rx="6.5" ry="3" fill="#F6B680" opacity=".8"/>`;
        out.handL = inHand(J, 'L', a.L, 'p-palm', palm); out.handR = inHand(J, 'R', a.R, 'p-palm', palm);
        out.front = `<g class="kp p-glow" fill="#FFD66B"><circle class="g1" cx="${f1((HL[0] + HR[0]) / 2 - 6)}" cy="${f1(HL[1] - 22)}" r="2.6"/><circle class="g2" cx="${f1((HL[0] + HR[0]) / 2 + 7)}" cy="${f1(HL[1] - 30)}" r="2"/><circle class="g3" cx="${f1((HL[0] + HR[0]) / 2)}" cy="${f1(HL[1] - 40)}" r="1.6"/></g>`;
        break;
      }
      case 'dates': {
        out.handL = inHand(J, 'L', a.L, 'p-bowl', `<g transform="translate(6 -8)"><path d="M-17 -4 Q-17 12 0 12 Q17 12 17 -4Z" fill="#D9885A"/><path d="M-17 -4 Q0 4 17 -4" stroke="#B86A3E" stroke-width="2" fill="none"/>
          <ellipse cx="-8" cy="-6" rx="5" ry="3.4" fill="#7A3B1E"/><ellipse cx="2" cy="-8" rx="5" ry="3.4" fill="#8E4A26"/><ellipse cx="10" cy="-5" rx="4.6" ry="3.2" fill="#6E3318"/></g>`);
        out.handR = inHand(J, 'R', a.R, 'p-date', `<ellipse cx="-4" cy="-8" rx="4.6" ry="3.4" fill="#7A3B1E"/>`);
        break;
      }
      case 'listening': {
        const hx = 100, w = z ? 50 : 60, ey = eyesY + (z ? 14 : 8);
        out.head = `<g class="kp p-phones"><path d="M${hx - w} ${f1(ey)} Q${hx - w} ${f1(top + 4)} ${hx} ${f1(top + 4)} Q${hx + w} ${f1(top + 4)} ${hx + w} ${f1(ey)}" stroke="#2B2D42" stroke-width="6" fill="none" stroke-linecap="round"/>
          <rect x="${hx - w - 9}" y="${f1(ey - 12)}" width="17" height="25" rx="8" fill="#FF6B6B"/><rect x="${hx + w - 8}" y="${f1(ey - 12)}" width="17" height="25" rx="8" fill="#FF6B6B"/>
          <rect x="${hx - w - 9}" y="${f1(ey - 12)}" width="7" height="25" rx="3.5" fill="#E04F4F"/><rect x="${hx + w + 2}" y="${f1(ey - 12)}" width="7" height="25" rx="3.5" fill="#E04F4F"/></g>`;
        out.front = `<g class="kp p-notes" fill="#2B59FF"><g class="n1"><circle cx="160" cy="70" r="4.5"/><rect x="163" y="50" width="2.6" height="20"/></g><g class="n2"><circle cx="40" cy="60" r="4"/><rect x="42.6" y="42" width="2.4" height="18"/></g></g>`;
        break;
      }
      case 'painting': {
        out.back = `<g class="kp p-easel"><path d="M166 284 L176 150 M196 284 L186 150 M181 160 L181 284" stroke="${WOODLO}" stroke-width="4.4" stroke-linecap="round"/>
          <rect x="157" y="128" width="46" height="52" rx="4" fill="#FFFDF7"/><rect x="157" y="128" width="46" height="52" rx="4" fill="none" stroke="${WOOD}" stroke-width="3.5"/>
          <path class="p-paint" d="M168 150 Q168 166 180 166 Q192 166 192 150" stroke="#FF6B6B" stroke-width="4.4" fill="none" stroke-linecap="round" pathLength="1"/><circle class="p-dot" cx="180" cy="173" r="2.6" fill="#2B59FF"/></g>`;
        out.handR = inHand(J, 'R', a.R, 'p-brush', `<g transform="rotate(38)"><rect x="-2.4" y="-30" width="4.8" height="26" rx="2.2" fill="${WOOD}"/><rect x="-3" y="-34" width="6" height="6" fill="#B8BCC8"/><path d="M-3 -34 Q0 -44 3 -34Z" fill="#FF6B6B"/></g>`);
        break;
      }
      case 'watering': {
        out.back = `<g class="kp p-plant"><path d="M164 266 H196 L192 284 H168Z" fill="#D9885A"/><rect x="161" y="262" width="38" height="7" rx="3" fill="#B86A3E"/>
          <g class="p-sprout"><path d="M180 262 Q180 248 180 240" stroke="#3FA66B" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M180 248 Q168 238 164 242 Q170 252 180 248Z" fill="#5CC98A"/><path d="M180 242 Q192 232 196 236 Q190 246 180 242Z" fill="#4CB97A"/></g></g>`;
        out.handR = inHand(J, 'R', a.R, 'p-can', `<g class="p-cantilt"><path d="M-14 -10 H10 L12 12 H-16Z" fill="#4FA3E0"/><path d="M10 -6 L26 -16 L28 -12 L12 2Z" fill="#3B8ACB"/><path d="M-14 -10 Q-26 0 -16 10" stroke="#3B8ACB" stroke-width="3.4" fill="none"/><rect x="-16" y="-13" width="28" height="4" rx="2" fill="#7BBDEB"/></g>`);
        out.front = `<g class="kp p-drops" fill="#6FC3FF"><ellipse class="d1" cx="${f1(HR[0] + 22)}" cy="${f1(HR[1] - 8)}" rx="1.8" ry="2.8"/><ellipse class="d2" cx="${f1(HR[0] + 26)}" cy="${f1(HR[1] - 4)}" rx="1.8" ry="2.8"/><ellipse class="d3" cx="${f1(HR[0] + 18)}" cy="${f1(HR[1] - 2)}" rx="1.8" ry="2.8"/></g>`;
        break;
      }
      case 'detective': {
        const ex = d.face.eyes[1];
        out.handRback = inHand(J, 'R', a.R, 'p-glass-h', `<path d="M0 0 L${f1(ex.cx - HR[0] - 7)} ${f1(ex.cy - HR[1] + 9)}" stroke="#7A4A2A" stroke-width="5" stroke-linecap="round"/>`);
        out.head = `<g class="kp p-glass"><circle cx="${ex.cx}" cy="${ex.cy}" r="14" fill="#DDF2FF" fill-opacity=".55"/><ellipse cx="${ex.cx}" cy="${ex.cy}" rx="${ex.rx * 1.7}" ry="${ex.ry * 1.6}" fill="${d.face.eyeFill}"/>
          <circle cx="${ex.cx}" cy="${ex.cy}" r="14" fill="none" stroke="#3C2A20" stroke-width="3.6"/><path d="M${ex.cx - 8} ${ex.cy - 6} Q${ex.cx - 5} ${ex.cy - 10} ${ex.cx} ${ex.cy - 11}" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></g>`;
        break;
      }
      case 'bubbles': {
        out.handR = inHand(J, 'R', a.R, 'p-wand', `<path d="M0 0 L${f1(mouth.cx + 14 - HR[0])} ${f1(mouth.cy - 4 - HR[1])}" stroke="#FF8FB1" stroke-width="2.6" stroke-linecap="round"/>`);
        out.head = `<circle class="kp" cx="${f1(mouth.cx + 16)}" cy="${f1(mouth.cy - 6)}" r="7.5" fill="none" stroke="#FF8FB1" stroke-width="3"/>`;
        out.front = `<g class="kp p-bubbles" fill="#DFF3FF" fill-opacity=".55" stroke="#9AD3F5" stroke-width="1.6">${[[1, 11, 0], [2, 8, .9], [3, 13, 1.7], [4, 7, 2.4]].map(([i, r]) => `<circle class="b${i}" cx="${f1(mouth.cx + 26)}" cy="${f1(mouth.cy - 12)}" r="${r}"/>`).join('')}</g>`;
        break;
      }
      case 'ball': {
        out.front = `<g class="kp p-ball" transform="translate(${f1(HR[0])} 0)"><g class="p-bounce"><circle cx="0" cy="${f1(HR[1] + 16)}" r="11" fill="#FF8A3D"/><path d="M-11 ${f1(HR[1] + 16)} Q0 ${f1(HR[1] + 10)} 11 ${f1(HR[1] + 16)} M0 ${f1(HR[1] + 5)} Q-5 ${f1(HR[1] + 16)} 0 ${f1(HR[1] + 27)}" stroke="#C85A1A" stroke-width="1.8" fill="none"/></g></g>
          <ellipse class="kp p-ballshadow" cx="${f1(HR[0])}" cy="285" rx="10" ry="3" fill="rgba(40,20,70,.18)"/>`;
        break;
      }
      default: break;
    }
    return out;
  }

  // Clean shoes in the board's style, measured from the traced right shoe and mirrored for the left.
  function shoe(d, side, buddy) {
    const R = d.shoes.R, w = R.x1 - R.x0, cx = side === 'R' ? (R.x0 + R.x1) / 2 : 200 - (R.x0 + R.x1) / 2;
    const y0 = R.y0, y1 = 284, h = y1 - y0, sT = y1 - h * .34, x0 = cx - w / 2, x1 = cx + w / 2;
    const out = side === 'R' ? 1 : -1;                               // which way is "outside"
    const lo = buddy === 'zaid' ? '#E39A00' : '#5E1445', sole = '#F8E8D4', soleLo = '#E8D2B8';
    const st = buddy === 'zaid'
      ? [0, 1].map((k) => { const sx = cx + out * w * (.02 + .1 * k), sy = y0 + h * (.3 + .17 * k); return `<path d="M${f1(sx - out * w * .2)} ${f1(sy + 2)} L${f1(sx + out * w * .1)} ${f1(sy - 1.5)}" stroke="#FFFFFF" stroke-width="${f1(h * .13)}" stroke-linecap="round"/>`; }).join('')
      : `<path d="M${f1(cx - out * w * .14)} ${f1(y0 + h * .38)} L${f1(cx + out * w * .2)} ${f1(y0 + h * .33)}" stroke="#FFFFFF" stroke-width="${f1(h * .2)}" stroke-linecap="round"/>`;
    return `<g class="k-shoe">
      <path d="M${f1(x0 + 1)} ${f1(sT + 2)} C${f1(x0 + 1)} ${f1(y0 + h * .05)} ${f1(cx - w * .2)} ${f1(y0)} ${f1(cx)} ${f1(y0)} C${f1(cx + w * .2)} ${f1(y0)} ${f1(x1 - 1)} ${f1(y0 + h * .05)} ${f1(x1 - 1)} ${f1(sT + 2)}Z" fill="${R.fill}"/>
      <path d="M${f1(out > 0 ? x1 - 1 : x0 + 1)} ${f1(sT + 2)} C${f1(out > 0 ? x1 - 1 : x0 + 1)} ${f1(y0 + h * .15)} ${f1(cx + out * w * .32)} ${f1(y0 + h * .02)} ${f1(cx + out * w * .22)} ${f1(y0 + h * .02)} C${f1(cx + out * w * .36)} ${f1(y0 + h * .25)} ${f1(cx + out * w * .4)} ${f1(sT)} ${f1(cx + out * w * .36)} ${f1(sT + 2)}Z" fill="${lo}" opacity=".45"/>
      ${st}
      <rect x="${f1(x0 - 1.5)}" y="${f1(sT)}" width="${f1(w + 3)}" height="${f1(y1 - sT)}" rx="${f1((y1 - sT) / 2)}" fill="${sole}"/>
      <rect x="${f1(x0 - 1.5)}" y="${f1(y1 - (y1 - sT) * .4)}" width="${f1(w + 3)}" height="${f1((y1 - sT) * .4)}" rx="${f1((y1 - sT) * .2)}" fill="${soleLo}" opacity=".6"/></g>`;
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
    const filler = (p) => `<circle cx="${p[0] + (p[0] < 100 ? 3 : -3)}" cy="${p[1] + 5}" r="5.5" fill="${J.sleeve}"/>`;   // hidden joint, tucked inside the body
    const A = activityProps(buddy, mood, d);
    const extras = `<g class="k-q"><path d="M150 30 Q150 17 161 17 Q172 17 172 27 Q172 35 163 39 L163 45" fill="none" stroke="#1E44D2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="163" cy="54" r="4.1" fill="#1E44D2"/></g>
      <g class="k-rays" stroke="#FFC20E" stroke-width="5.5" stroke-linecap="round"><path d="M148 22 L154 10"/><path d="M161 33 L172 25"/><path d="M166 48 L179 47"/></g>
      <g class="k-z" fill="none" stroke="#6E7BB8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M146 28 H157 L146 40 H157"/><path d="M160 15 H167 L160 23 H167"/></g>`;
    return `<svg class="kid ${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" data-act="${ACT[mood] ? mood : ''}" viewBox="${vb}" role="img" aria-label="${BUDDIES[buddy].name}">
      <ellipse class="k-shadow" cx="100" cy="285" rx="56" ry="6"/>
      ${A.back}
      <g class="k-all">
        <rect x="${f1(J.hipL[0] - 8)}" y="${f1(J.hipL[1] - 6)}" width="${f1(J.hipR[0] - J.hipL[0] + 16)}" height="26" rx="8" fill="${(P.legL.layers || P.legL)[0].fill}"/>
        <g class="k-leg k-leg-l" style="${at(J.hipL)}">${part(P.legL)}${d.shoes ? shoe(d, 'L', buddy) : ''}</g>
        <g class="k-leg k-leg-r" style="${at(J.hipR)}">${part(P.legR)}${d.shoes ? shoe(d, 'R', buddy) : ''}</g>
        <g class="k-upper" style="${at(J.waist)}">
          <g class="k-torso">${part(P.torso)}</g>
          <g class="k-head" style="${at(J.neckP)}">${part(P.head)}${face(d.face, d.colours)}${extras}${A.head}</g>
          ${A.body}
          <g class="k-arm k-arm-l" style="${at(J.shoulderL)}">${A.handLback}${filler(J.shoulderL)}${part(P.armL)}${A.handL}</g>
          <g class="k-arm k-arm-r" style="${at(J.shoulderR)}">${A.handRback}${filler(J.shoulderR)}${part(P.armR)}${book}${thumb}${A.handR}</g>
          ${A.bodyFront}
        </g>
      </g>
      ${A.front}
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

  window.QQ_MASCOT = { BUDDIES, kid, setMood, liven, ACTIVITIES: Object.keys(ACT) };
})();
