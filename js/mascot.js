/* Qalam Quest — Zaid & Huda.
 * Drawn from the reference art (tools/ref/reference.png) as a rigged SVG:
 * legs, body, head (eyes / brows / mouths) and arms are separate groups so CSS can animate them.
 * Moods: idle · wave · happy · talk · sad · think · dance · walk · read · point · sit · sleep
 */
(function () {
  'use strict';
  const INK = '#281517';
  const P = {
    zaid: {
      name: 'Zaid', line: 'I love spotting patterns!',
      skin: '#E68544', skinShade: '#CF6D31', hair: '#331C1F', hairHi: '#4B2B30',
      top: '#1747D6', topShade: '#0B2FA8', pants: '#2C294A', cargo: '#433F63',
      shoe: '#FFB703', shoeShade: '#E99A00', sole: '#F6E7CF', mouth: '#7E1C2D', tongue: '#FE776C',
    },
    huda: {
      name: 'Huda', line: 'Every letter is a little friend!',
      skin: '#E68544', skinShade: '#CF6D31', hijab: '#7B1F5C', hijabShade: '#5C1444', hijabHi: '#9A3778',
      top: '#6ECB95', topShade: '#4FAF7A', pants: '#372B3F', cargo: '#4A3D55',
      shoe: '#66C591', shoeShade: '#47A774', sole: '#F6E7CF', mouth: '#7E1C2D', tongue: '#FE776C', teeth: '#FFF7E6',
    },
  };
  const MIRROR = 'matrix(-1 0 0 1 200 0)';

  function leg(c) {
    return `
      <path d="M71 198 H97 L95 256 Q94 263 87 263 H78 Q71 263 70 256 Z" fill="${c.pants}"/>
      <rect x="66" y="218" width="13" height="20" rx="4.5" fill="${c.cargo}" transform="rotate(-5 72 228)"/>
      <g transform="translate(0 12)">
      <path d="M104 252 Q104 237 88 237 H80 Q62 237 57 250 L56 254 Q56 262 64 262 H98 Q104 262 104 256 Z" fill="${c.shoe}"/>
      <path d="M60 243 Q66 238 78 238" stroke="${c.shoeShade}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>
      <path d="M55 255 H105 Q105 265 97 265 H64 Q55 265 55 258 Z" fill="${c.sole}"/>
      <path d="M74 243 l11 -1.5 M73 249 l12 -1.5" stroke="${c.sole}" stroke-width="3.6" stroke-linecap="round"/></g>`;
  }
  function arm(c, extra) {
    return `
      ${extra || ''}
      <path d="M60 152 Q47 156 45 172 L41 196 Q40 205 50 206 Q59 207 61 198 L67 172 Z" fill="${c.top}"/>
      <path d="M47 168 Q45 182 43 194" stroke="${c.topShade}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".45"/>
      <path d="M40 193 Q50 197 62 195 L61 200 Q59 208 50 207 Q40 206 40 199Z" fill="${c.topShade}"/>
      <path d="M39 204 Q36 216 46 220 Q57 223 61 213 Q63 205 56 201 Q45 198 39 204Z" fill="${c.skin}"/>
      <ellipse cx="60" cy="207" rx="4.2" ry="5.2" fill="${c.skin}"/>
      <path d="M44 215 Q49 218 54 217" stroke="${c.skinShade}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>`;
  }
  const book = (c) => `<g class="k-book">
      <rect x="27" y="168" width="38" height="46" rx="6" fill="#FC856B"/>
      <rect x="27" y="168" width="38" height="46" rx="6" fill="none" stroke="#E2603F" stroke-width="2.2"/>
      <rect x="33" y="174" width="26" height="6" rx="3" fill="#FFF3E8" opacity=".55"/>
      <path d="M26 176 h8 M26 186 h8 M26 196 h8" stroke="#FFF3E8" stroke-width="3.6" stroke-linecap="round"/>
    </g>`;
  const sparks = `<g class="k-spark" stroke="#FFB703" stroke-width="6" stroke-linecap="round">
      <path d="M30 236 L22 250"/><path d="M48 242 L48 258"/><path d="M14 224 L2 230"/></g>`;

  function face(c, buddy) {
    const eyeY = buddy === 'zaid' ? 100 : 102;
    const brows = buddy === 'zaid'
      ? `<path class="k-brow k-brow-l" d="M70 85 Q79 76 91 81"/><path class="k-brow k-brow-r" d="M110 78 Q121 70 132 77"/>`
      : `<path class="k-brow k-brow-l" d="M70 86 Q79 75 92 81"/><path class="k-brow k-brow-r" d="M111 79 Q124 74 131 63"/>`;
    const mouthDefault = buddy === 'zaid'
      ? `<g class="m m-open"><path d="M82 119 Q102 117 122 112 Q120 139 101 139 Q86 138 82 119Z" fill="${c.mouth}"/><path d="M89 131 Q101 122 115 128 Q111 138 101 138 Q93 138 89 131Z" fill="${c.tongue}"/></g>`
      : `<g class="m m-open"><path d="M82 118 Q102 118 123 111 Q120 138 101 138 Q86 137 82 118Z" fill="${c.mouth}"/><path d="M83 119 Q102 119 122 112 Q121 120 103 124 Q89 126 83 119Z" fill="${c.teeth}"/></g>`;
    return `
      <g class="k-eyes" fill="${INK}">
        <ellipse cx="83" cy="${eyeY}" rx="6.5" ry="9.5"/><ellipse cx="120" cy="${eyeY - 2}" rx="6.5" ry="9.5"/>
        <circle cx="85" cy="${eyeY - 4}" r="2.1" fill="#fff" opacity=".85"/><circle cx="122" cy="${eyeY - 6}" r="2.1" fill="#fff" opacity=".85"/>
      </g>
      <g class="k-eyes-happy" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round">
        <path d="M76 ${eyeY + 2} Q83 ${eyeY - 7} 90 ${eyeY + 2}"/><path d="M113 ${eyeY} Q120 ${eyeY - 9} 127 ${eyeY}"/>
      </g>
      <g class="k-eyes-shut" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round">
        <path d="M76 ${eyeY} Q83 ${eyeY + 5} 90 ${eyeY}"/><path d="M113 ${eyeY - 2} Q120 ${eyeY + 3} 127 ${eyeY - 2}"/>
      </g>
      <g class="k-brows" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round">${brows}</g>
      <ellipse cx="70" cy="121" rx="8" ry="5" fill="#F0604A" opacity=".28"/>
      <ellipse cx="132" cy="118" rx="8" ry="5" fill="#F0604A" opacity=".28"/>
      <g class="k-mouths">
        ${mouthDefault}
        <path class="m m-smile" d="M87 121 Q102 133 118 118" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse class="m m-o" cx="102" cy="126" rx="7" ry="8.5" fill="${c.mouth}"/>
        <path class="m m-sad" d="M88 131 Q102 120 116 130" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
      </g>`;
  }

  function headZaid(c) {
    return `
      <g fill="${c.hair}">
        <circle cx="50" cy="72" r="22"/><circle cx="56" cy="46" r="22"/><circle cx="80" cy="29" r="25"/><circle cx="110" cy="25" r="26"/>
        <circle cx="137" cy="34" r="23"/><circle cx="152" cy="58" r="21"/><circle cx="154" cy="82" r="15"/><circle cx="47" cy="94" r="13"/>
      </g>
      <circle cx="53" cy="106" r="13" fill="${c.skin}"/><circle cx="148" cy="104" r="13" fill="${c.skin}"/>
      <path d="M50 102 Q55 100 57 107" stroke="${c.skinShade}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M151 100 Q146 99 145 106" stroke="${c.skinShade}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M56 98 C56 62 76 46 101 46 C127 46 147 62 147 98 C147 130 127 152 101 152 C75 152 56 130 56 98Z" fill="${c.skin}"/>
      <path d="M53 94 C45 56 70 31 103 31 C134 31 153 51 149 84 C143 68 131 60 119 60 C111 72 92 78 73 76 C64 80 57 86 53 94Z" fill="${c.hair}"/>
      <path d="M70 46 Q84 38 98 41 M114 40 Q128 40 138 50" stroke="${c.hairHi}" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${face(c, 'zaid')}`;
  }
  function headHuda(c) {
    return `
      <path d="M100 24 C62 24 40 52 40 94 C40 120 47 138 43 158 C39 178 28 198 37 212 C46 222 64 216 71 202 L77 172 L126 172 C152 162 162 130 160 94 C158 52 138 24 100 24Z" fill="${c.hijab}"/>
      <path d="M43 158 C39 178 28 198 37 212 C46 222 64 216 71 202 L75 178 C63 182 51 172 43 158Z" fill="${c.hijabShade}"/>
      <path d="M60 140 Q100 172 142 140 L136 162 Q100 182 66 162Z" fill="${c.hijabShade}"/>
      <ellipse cx="101" cy="98" rx="44" ry="47" fill="${c.skin}"/>
      <path d="M55 88 C56 60 75 46 101 46 C127 46 146 60 147 88 C139 66 122 56 101 56 C80 56 63 66 55 88Z" fill="${c.hijab}"/>
      <path d="M66 40 Q84 30 104 31" stroke="${c.hijabHi}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
      ${face(c, 'huda')}`;
  }

  function kid(buddy, mood, cls, opts) {
    buddy = P[buddy] ? buddy : 'huda';
    const c = P[buddy];
    const o = opts || {};
    const isHuda = buddy === 'huda';
    const vb = o.headOnly ? '34 14 132 150' : '0 0 200 292';
    return `<svg class="kid ${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" viewBox="${vb}" role="img" aria-label="${c.name}">
      <ellipse class="k-shadow" cx="100" cy="280" rx="52" ry="7"/>
      <g class="k-all">
        <g class="k-leg k-leg-l">${leg(c)}</g>
        <g class="k-leg k-leg-r"><g transform="${MIRROR}">${leg(c)}</g></g>
        <g class="k-upper">
          ${isHuda
            ? `<path d="M62 170 Q64 149 87 147 H115 Q138 149 140 170 L149 211 Q151 220 140 220 H62 Q51 220 53 211 Z" fill="${c.top}"/><path d="M53 208 H149 L149 211 Q151 220 140 220 H62 Q51 220 53 211Z" fill="${c.topShade}" opacity=".7"/>`
            : `<path d="M58 170 Q60 147 84 145 H118 Q142 147 144 170 L148 205 Q149 215 138 215 H64 Q53 215 54 205 Z" fill="${c.top}"/>
               <path d="M54 202 H148 L148 206 Q149 215 138 215 H64 Q53 215 54 206 Z" fill="${c.topShade}" opacity=".75"/>
               <path d="M75 184 Q75 179 80 179 H122 Q127 179 127 184 L130 201 H72 Z" fill="${c.topShade}"/>
               <path d="M77 146 Q101 136 125 146 Q115 154 101 154 Q87 154 77 146Z" fill="${c.topShade}"/>
               <path d="M88 146 L101 162 L114 146 Z" fill="${c.skinShade}"/>
               <path d="M93 159 L91 177 M109 159 L111 177" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round"/>`}
          <g class="k-head">${isHuda ? headHuda(c) : headZaid(c)}</g>
          <g class="k-arm k-arm-l">${arm(c, book(c))}</g>
          <g class="k-arm k-arm-r"><g transform="${MIRROR}">${arm(c, sparks)}</g></g>
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

  // Cycles a kid through a list of moods so they never just stand there.
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
