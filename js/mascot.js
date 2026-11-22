/* Qalam — Zaid & Huda, v3.
 * Drawn from the reference art in a three-quarter pose: the body is turned slightly to
 * the viewer's right while the face looks out at you. The far arm and leg sit behind the
 * body and are shaded, which gives depth.
 * Rig groups: k-leg-l (far) · k-leg-r (near) · k-upper · k-arm-l (far, behind) · k-head · k-arm-r (near, in front)
 * Moods: idle · wave · happy · talk · sad · think · dance · walk · read · point · sit · sleep · cheeky
 */
(function () {
  'use strict';
  const INK = '#241418';
  const P = {
    zaid: {
      name: 'Zaid', line: 'I love spotting patterns!',
      skin: '#E68544', skinShade: '#C9682E', hair: '#331C1F', hairHi: '#4E2C31',
      top: '#1747D6', topShade: '#0B2FA8', topHi: '#3D67F0', pants: '#2C294A', cargo: '#433F63',
      shoe: '#FFB703', shoeShade: '#E08E00', sole: '#F6E7CF', mouth: '#7E1C2D', tongue: '#FE776C', teeth: '#FFF7E6',
    },
    huda: {
      name: 'Huda', line: 'Every letter is a little friend!',
      skin: '#E68544', skinShade: '#C9682E', hijab: '#7B1F5C', hijabShade: '#5C1444', hijabHi: '#9C3A7B',
      top: '#6ECB95', topShade: '#48A974', topHi: '#93DDB1', pants: '#372B3F', cargo: '#4A3D55',
      shoe: '#66C591', shoeShade: '#3F9F6D', sole: '#F6E7CF', mouth: '#7E1C2D', tongue: '#FE776C', teeth: '#FFF7E6',
    },
  };
  const MIRROR = 'matrix(-1 0 0 1 200 0)';

  // One leg, toe pointing to the viewer's right (the way the body is turned).
  function leg(c, far) {
    const pants = 'M71 198 H97 L96 256 Q95 263 88 263 H79 Q72 263 71 256 Z';
    return `<g transform="matrix(-1 0 0 1 168 0)">
      <path d="${pants}" fill="${c.pants}"/>
      <rect x="85" y="218" width="12" height="20" rx="4.5" fill="${c.cargo}" transform="rotate(5 91 228)"/>
      <g transform="translate(0 12)">
        <path d="M104 252 Q104 237 88 237 H80 Q62 237 57 250 L56 254 Q56 262 64 262 H98 Q104 262 104 256 Z" fill="${c.shoe}"/>
        <path d="M96 238 Q102 242 103 250" stroke="${c.shoeShade}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>
        <path d="M55 255 H105 Q105 265 97 265 H64 Q55 265 55 258 Z" fill="${c.sole}"/>
        <path d="M74 243 l11 -1.5 M73 249 l12 -1.5" stroke="${c.sole}" stroke-width="3.6" stroke-linecap="round"/>
      </g>
      ${far ? `<path d="${pants}" fill="#000" opacity=".16"/><g transform="translate(0 12)"><path d="M104 252 Q104 237 88 237 H80 Q62 237 57 250 L56 254 Q56 262 64 262 H98 Q104 262 104 256 Z" fill="#000" opacity=".12"/></g>` : ''}
    </g>`;
  }
  function arm(c, far, extra) {
    return `
      ${extra || ''}
      <path d="M60 152 Q47 156 45 172 L41 196 Q40 205 50 206 Q59 207 61 198 L67 172 Z" fill="${c.top}"/>
      <path d="M49 162 Q45 178 43 194" stroke="${far ? c.topShade : c.topHi}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".55"/>
      <path d="M40 193 Q50 197 62 195 L61 200 Q59 208 50 207 Q40 206 40 199Z" fill="${c.topShade}"/>
      <path d="M39 204 Q36 216 46 220 Q57 223 61 213 Q63 205 56 201 Q45 198 39 204Z" fill="${c.skin}"/>
      <ellipse cx="60" cy="207" rx="4.2" ry="5.2" fill="${c.skin}"/>
      <path d="M44 215 Q49 218 54 217" stroke="${c.skinShade}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>
      ${far ? '<path d="M60 152 Q47 156 45 172 L41 196 Q40 205 50 206 Q59 207 61 198 L67 172 Z M39 204 Q36 216 46 220 Q57 223 61 213 Q63 205 56 201 Q45 198 39 204Z" fill="#000" opacity=".14"/>' : ''}`;
  }
  const book = `<g class="k-book">
      <rect x="22" y="170" width="38" height="46" rx="6" fill="#FC856B"/>
      <path d="M22 176 Q22 170 28 170 H56 Q60 170 60 174" fill="none" stroke="#FFB4A2" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="22" y="170" width="38" height="46" rx="6" fill="none" stroke="#DE5C3B" stroke-width="2.2"/>
      <rect x="29" y="178" width="24" height="6" rx="3" fill="#FFF3E8" opacity=".6"/>
      <path d="M21 178 h8 M21 188 h8 M21 198 h8" stroke="#FFF3E8" stroke-width="3.6" stroke-linecap="round"/>
    </g>`;
  const sparks = `<g class="k-spark" stroke="#FFB703" stroke-width="6" stroke-linecap="round">
      <path d="M30 236 L22 250"/><path d="M48 242 L48 258"/><path d="M14 224 L2 230"/></g>`;

  // Face: shifted to the viewer's right for the 3/4 turn. The near eye (left) is
  // slightly bigger than the far eye (foreshortening), and both look out at the viewer.
  function face(c, eyeY) {
    return `
      <g class="k-eyes" fill="${INK}">
        <ellipse cx="91" cy="${eyeY}" rx="7" ry="10"/><ellipse cx="126" cy="${eyeY - 2}" rx="5.8" ry="9.2"/>
        <circle cx="93.5" cy="${eyeY - 4}" r="2.4" fill="#fff" opacity=".9"/><circle cx="128" cy="${eyeY - 6}" r="2" fill="#fff" opacity=".9"/>
      </g>
      <g class="k-eyes-happy" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round">
        <path d="M83 ${eyeY + 2} Q91 ${eyeY - 8} 99 ${eyeY + 2}"/><path d="M120 ${eyeY} Q126 ${eyeY - 9} 132 ${eyeY}"/>
      </g>
      <g class="k-eyes-shut" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round">
        <path d="M83 ${eyeY} Q91 ${eyeY + 6} 99 ${eyeY}"/><path d="M120 ${eyeY - 2} Q126 ${eyeY + 4} 132 ${eyeY - 2}"/>
      </g>
      <g class="k-brows" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round">
        <path class="k-brow k-brow-l" d="M80 ${eyeY - 16} Q89 ${eyeY - 23} 100 ${eyeY - 18}"/>
        <path class="k-brow k-brow-r" d="M117 ${eyeY - 20} Q125 ${eyeY - 25} 134 ${eyeY - 20}"/>
      </g>
      <ellipse cx="79" cy="${eyeY + 21}" rx="8.5" ry="5" fill="#F0604A" opacity=".3"/>
      <ellipse cx="137" cy="${eyeY + 18}" rx="6.5" ry="4.5" fill="#F0604A" opacity=".3"/>
      <g class="k-mouths">
        <g class="m m-open"><path d="M93 ${eyeY + 19} Q113 ${eyeY + 17} 131 ${eyeY + 12} Q129 ${eyeY + 39} 111 ${eyeY + 39} Q97 ${eyeY + 38} 93 ${eyeY + 19}Z" fill="${c.mouth}"/><path d="M99 ${eyeY + 31} Q111 ${eyeY + 22} 124 ${eyeY + 28} Q120 ${eyeY + 38} 111 ${eyeY + 38} Q103 ${eyeY + 38} 99 ${eyeY + 31}Z" fill="${c.tongue}"/></g>
        <g class="m m-grin"><path d="M93 ${eyeY + 18} Q113 ${eyeY + 18} 132 ${eyeY + 11} Q129 ${eyeY + 38} 111 ${eyeY + 38} Q97 ${eyeY + 37} 93 ${eyeY + 18}Z" fill="${c.mouth}"/><path d="M94 ${eyeY + 19} Q113 ${eyeY + 19} 131 ${eyeY + 12} Q130 ${eyeY + 20} 113 ${eyeY + 24} Q100 ${eyeY + 26} 94 ${eyeY + 19}Z" fill="${c.teeth}"/></g>
        <path class="m m-smile" d="M97 ${eyeY + 21} Q112 ${eyeY + 33} 128 ${eyeY + 18}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse class="m m-o" cx="112" cy="${eyeY + 26}" rx="6.5" ry="8" fill="${c.mouth}"/>
        <path class="m m-sad" d="M99 ${eyeY + 31} Q112 ${eyeY + 21} 126 ${eyeY + 30}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
      </g>`;
  }

  function headZaid(c) {
    return `
      <g fill="${c.hair}">
        <circle cx="47" cy="76" r="22"/><circle cx="52" cy="49" r="23"/><circle cx="76" cy="30" r="25"/><circle cx="106" cy="25" r="26"/>
        <circle cx="134" cy="32" r="22"/><circle cx="150" cy="54" r="19"/><circle cx="153" cy="76" r="13"/><circle cx="45" cy="98" r="13"/>
      </g>
      <path d="M40 70 Q44 58 54 54 M64 36 Q74 28 88 28" stroke="${c.hairHi}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="56" cy="108" r="13" fill="${c.skin}"/>
      <path d="M53 104 Q58 102 60 109" stroke="${c.skinShade}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M58 98 C58 62 79 46 105 46 C131 46 149 62 149 96 C149 130 131 152 107 152 C81 152 58 130 58 98Z" fill="${c.skin}"/>
      <path d="M55 95 C47 56 72 31 105 31 C136 31 155 51 151 84 C145 68 133 60 121 60 C113 72 94 78 75 76 C66 80 59 87 55 95Z" fill="${c.hair}"/>
      <path d="M78 42 Q92 36 104 39 M118 40 Q132 42 140 52" stroke="${c.hairHi}" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${face(c, 101)}`;
  }
  function headHuda(c) {
    return `
      <path d="M100 24 C60 24 38 52 38 94 C38 120 45 138 41 158 C37 178 26 198 35 212 C44 222 62 216 69 202 L75 172 L128 172 C154 162 164 130 162 94 C160 52 140 24 100 24Z" fill="${c.hijab}"/>
      <path d="M41 158 C37 178 26 198 35 212 C44 222 62 216 69 202 L73 178 C61 182 49 172 41 158Z" fill="${c.hijabShade}"/>
      <path d="M44 74 C46 50 62 34 84 28" stroke="${c.hijabShade}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".5"/>
      <path d="M60 140 Q102 172 144 140 L138 162 Q102 182 66 162Z" fill="${c.hijabShade}"/>
      <ellipse cx="104" cy="99" rx="43" ry="47" fill="${c.skin}"/>
      <path d="M59 90 C60 61 78 47 104 47 C130 47 148 61 148 90 C140 67 124 57 104 57 C84 57 67 67 59 90Z" fill="${c.hijab}"/>
      <path d="M70 40 Q88 30 108 31" stroke="${c.hijabHi}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>
      <circle cx="146" cy="150" r="4.5" fill="#FFD23F"/>
      ${face(c, 103)}`;
  }

  function kid(buddy, mood, cls, opts) {
    buddy = P[buddy] ? buddy : 'huda';
    const c = P[buddy];
    const o = opts || {};
    const isHuda = buddy === 'huda';
    const vb = o.headOnly ? '36 14 132 150' : '0 0 200 292';
    const torso = isHuda
      ? `<path d="M62 170 Q64 149 87 147 H117 Q140 149 142 170 L151 211 Q153 220 142 220 H62 Q51 220 53 211 Z" fill="${c.top}"/>
         <path d="M62 170 Q64 149 87 147 H94 Q76 152 74 176 L70 220 H62 Q51 220 53 211Z" fill="${c.topShade}" opacity=".55"/>
         <path d="M118 160 Q132 176 136 206" stroke="${c.topHi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
         <path d="M53 208 H151 L151 211 Q153 220 142 220 H62 Q51 220 53 211Z" fill="${c.topShade}" opacity=".7"/>`
      : `<path d="M58 170 Q60 147 84 145 H120 Q144 147 146 170 L150 205 Q151 215 140 215 H64 Q53 215 54 205 Z" fill="${c.top}"/>
         <path d="M58 170 Q60 147 84 145 H92 Q76 150 72 172 L68 215 H64 Q53 215 54 205Z" fill="${c.topShade}" opacity=".55"/>
         <path d="M54 202 H150 L150 206 Q151 215 140 215 H64 Q53 215 54 206 Z" fill="${c.topShade}" opacity=".75"/>
         <path d="M84 184 Q84 179 89 179 H131 Q136 179 136 184 L139 201 H81 Z" fill="${c.topShade}"/>
         <path d="M84 146 Q109 136 133 146 Q123 154 109 154 Q95 154 84 146Z" fill="${c.topShade}"/>
         <path d="M96 146 L109 162 L122 146 Z" fill="${c.skinShade}"/>
         <path d="M101 159 L99 177 M117 159 L119 177" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round"/>
         <path d="M128 156 Q138 172 140 198" stroke="${c.topHi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`;
    return `<svg class="kid ${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" viewBox="${vb}" role="img" aria-label="${c.name}">
      <ellipse class="k-shadow" cx="102" cy="280" rx="54" ry="7"/>
      <g class="k-all">
        <g class="k-leg k-leg-l"><g transform="translate(-2 -4)">${leg(c, true)}</g></g>
        <g class="k-leg k-leg-r"><g transform="translate(28 0)">${leg(c, false)}</g></g>
        <g class="k-upper">
          <g class="k-arm k-arm-l">${arm(c, true)}</g>
          ${torso}
          <g class="k-head">${isHuda ? headHuda(c) : headZaid(c)}</g>
          <g class="k-arm k-arm-r"><g transform="${MIRROR}">${arm(c, false, book + sparks)}</g></g>
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

  // Cycles a kid through moods so they never just stand there.
  function liven(el, moods, every) {
    if (!el) return;
    let i = 0;
    clearInterval(el._liven);
    el._liven = setInterval(() => {
      if (!document.body.contains(el)) { clearInterval(el._liven); return; }
      i = (i + 1) % moods.length; el.setAttribute('data-mood', moods[i]);
    }, every || 3200);
  }

  window.QQ_MASCOT = { BUDDIES: P, kid, setMood, liven };
})();
