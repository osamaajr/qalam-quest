/* Qalam — Zaid & Huda, v4.
 * PERSPECTIVE RULE: always a straight front view. The face is centred on x = 100, the body
 * is symmetrical, and both feet are planted. Every pose is made by moving rig parts, never
 * by turning the character. Drawn from the reference art (tools/ref/reference.png).
 * Rig: k-leg-l · k-leg-r · k-upper { torso · k-head · k-arm-l · k-arm-r }
 * Moods: idle · wave · happy · talk · sad · think · cheeky · dance · walk · read · point · sit · sleep
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

  // Left leg (viewer's left); the right leg is its mirror image, so the pose is symmetrical.
  function leg(c) {
    return `
      <path d="M72 198 H97 L96 256 Q95 263 88 263 H79 Q72 263 71 256 Z" fill="${c.pants}"/>
      <rect x="67" y="218" width="12" height="20" rx="4.5" fill="${c.cargo}" transform="rotate(-5 73 228)"/>
      <g transform="translate(0 12)">
        <path d="M104 252 Q104 237 88 237 H80 Q62 237 57 250 L56 254 Q56 262 64 262 H98 Q104 262 104 256 Z" fill="${c.shoe}"/>
        <path d="M62 242 Q68 238 78 238" stroke="${c.shoeShade}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".5"/>
        <path d="M55 255 H105 Q105 265 97 265 H64 Q55 265 55 258 Z" fill="${c.sole}"/>
        <path d="M74 243 l11 -1.5 M73 249 l12 -1.5" stroke="${c.sole}" stroke-width="3.6" stroke-linecap="round"/>
      </g>`;
  }
  function arm(c, extra) {
    return `
      ${extra || ''}
      <path d="M60 152 Q47 156 45 172 L41 196 Q40 205 50 206 Q59 207 61 198 L67 172 Z" fill="${c.top}"/>
      <path d="M49 162 Q45 178 43 194" stroke="${c.topHi}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".5"/>
      <path d="M40 193 Q50 197 62 195 L61 200 Q59 208 50 207 Q40 206 40 199Z" fill="${c.topShade}"/>
      <path d="M39 204 Q36 216 46 220 Q57 223 61 213 Q63 205 56 201 Q45 198 39 204Z" fill="${c.skin}"/>
      <ellipse cx="60" cy="207" rx="4.2" ry="5.2" fill="${c.skin}"/>
      <path d="M44 215 Q49 218 54 217" stroke="${c.skinShade}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>`;
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

  // Face, centred on x = 100 and mirror-symmetrical.
  function face(c, y) {
    return `
      <g class="k-eyes" fill="${INK}">
        <ellipse cx="83" cy="${y}" rx="6.6" ry="9.6"/><ellipse cx="117" cy="${y}" rx="6.6" ry="9.6"/>
        <circle cx="85.4" cy="${y - 4}" r="2.3" fill="#fff" opacity=".9"/><circle cx="119.4" cy="${y - 4}" r="2.3" fill="#fff" opacity=".9"/>
      </g>
      <g class="k-eyes-happy" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round">
        <path d="M75 ${y + 2} Q83 ${y - 8} 91 ${y + 2}"/><path d="M109 ${y + 2} Q117 ${y - 8} 125 ${y + 2}"/>
      </g>
      <g class="k-eyes-shut" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round">
        <path d="M75 ${y} Q83 ${y + 6} 91 ${y}"/><path d="M109 ${y} Q117 ${y + 6} 125 ${y}"/>
      </g>
      <g class="k-brows" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round">
        <path class="k-brow k-brow-l" d="M73 ${y - 17} Q82 ${y - 24} 92 ${y - 19}"/>
        <path class="k-brow k-brow-r" d="M108 ${y - 19} Q118 ${y - 24} 127 ${y - 17}"/>
      </g>
      <ellipse cx="70" cy="${y + 20}" rx="8" ry="5" fill="#F0604A" opacity=".3"/>
      <ellipse cx="130" cy="${y + 20}" rx="8" ry="5" fill="#F0604A" opacity=".3"/>
      <g class="k-mouths">
        <g class="m m-open"><path d="M82 ${y + 17} Q100 ${y + 15} 118 ${y + 17} Q116 ${y + 39} 100 ${y + 39} Q84 ${y + 39} 82 ${y + 17}Z" fill="${c.mouth}"/><path d="M88 ${y + 31} Q100 ${y + 22} 112 ${y + 31} Q108 ${y + 38} 100 ${y + 38} Q92 ${y + 38} 88 ${y + 31}Z" fill="${c.tongue}"/></g>
        <g class="m m-grin"><path d="M81 ${y + 16} Q100 ${y + 15} 119 ${y + 16} Q117 ${y + 38} 100 ${y + 38} Q83 ${y + 38} 81 ${y + 16}Z" fill="${c.mouth}"/><path d="M82 ${y + 17} Q100 ${y + 16} 118 ${y + 17} Q116 ${y + 24} 100 ${y + 25} Q84 ${y + 24} 82 ${y + 17}Z" fill="${c.teeth}"/></g>
        <path class="m m-smile" d="M86 ${y + 21} Q100 ${y + 33} 114 ${y + 21}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse class="m m-o" cx="100" cy="${y + 26}" rx="6.5" ry="8" fill="${c.mouth}"/>
        <path class="m m-sad" d="M87 ${y + 31} Q100 ${y + 21} 113 ${y + 31}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path class="m m-smirk" d="M87 ${y + 24} Q101 ${y + 30} 115 ${y + 18}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
      </g>`;
  }

  function headZaid(c) {
    return `
      <g fill="${c.hair}">
        <circle cx="50" cy="74" r="22"/><circle cx="56" cy="47" r="22"/><circle cx="78" cy="30" r="25"/><circle cx="100" cy="25" r="25"/>
        <circle cx="122" cy="30" r="25"/><circle cx="144" cy="47" r="22"/><circle cx="150" cy="74" r="22"/>
        <circle cx="48" cy="96" r="13"/><circle cx="152" cy="96" r="13"/>
      </g>
      <path d="M44 66 Q48 56 58 52 M142 52 Q152 56 156 66 M70 32 Q84 25 98 26" stroke="${c.hairHi}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="54" cy="106" r="13" fill="${c.skin}"/><circle cx="146" cy="106" r="13" fill="${c.skin}"/>
      <path d="M51 102 Q56 100 58 107 M149 102 Q144 100 142 107" stroke="${c.skinShade}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M56 98 C56 62 76 46 100 46 C124 46 144 62 144 98 C144 130 124 152 100 152 C76 152 56 130 56 98Z" fill="${c.skin}"/>
      <path d="M53 93 C46 55 70 31 100 31 C130 31 154 55 147 93 C142 74 130 62 116 60 C108 70 92 75 74 73 C65 77 58 84 53 93Z" fill="${c.hair}"/>
      <path d="M76 42 Q90 36 102 38 M116 39 Q130 42 138 52" stroke="${c.hairHi}" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${face(c, 101)}`;
  }
  function headHuda(c) {
    return `
      <path d="M100 24 C62 24 40 52 40 94 C40 120 46 138 42 158 C38 178 28 198 37 212 C46 222 64 216 71 202 L77 172 L124 172 C150 162 160 130 160 94 C160 52 138 24 100 24Z" fill="${c.hijab}"/>
      <path d="M42 158 C38 178 28 198 37 212 C46 222 64 216 71 202 L75 178 C63 182 51 172 42 158Z" fill="${c.hijabShade}"/>
      <path d="M58 140 Q100 172 142 140 L136 162 Q100 182 64 162Z" fill="${c.hijabShade}"/>
      <ellipse cx="100" cy="99" rx="44" ry="47" fill="${c.skin}"/>
      <path d="M55 90 C56 61 75 47 100 47 C125 47 144 61 145 90 C137 67 120 57 100 57 C80 57 63 67 55 90Z" fill="${c.hijab}"/>
      <path d="M64 40 Q82 30 102 31" stroke="${c.hijabHi}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>
      <circle cx="140" cy="152" r="4.5" fill="#FFD23F"/>
      ${face(c, 103)}`;
  }

  function kid(buddy, mood, cls, opts) {
    buddy = P[buddy] ? buddy : 'huda';
    const c = P[buddy];
    const o = opts || {};
    const isHuda = buddy === 'huda';
    const vb = o.headOnly ? '34 14 132 150' : '0 0 200 292';
    const torso = isHuda
      ? `<path d="M62 170 Q64 149 87 147 H113 Q136 149 138 170 L147 211 Q149 220 138 220 H62 Q51 220 53 211 Z" fill="${c.top}"/>
         <path d="M120 156 Q132 176 136 206" stroke="${c.topHi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
         <path d="M53 208 H147 L147 211 Q149 220 138 220 H62 Q51 220 53 211Z" fill="${c.topShade}" opacity=".7"/>`
      : `<path d="M57 170 Q59 147 83 145 H117 Q141 147 143 170 L147 205 Q148 215 137 215 H63 Q52 215 53 205 Z" fill="${c.top}"/>
         <path d="M53 202 H147 L147 206 Q148 215 137 215 H63 Q52 215 53 206 Z" fill="${c.topShade}" opacity=".75"/>
         <path d="M74 184 Q74 179 79 179 H121 Q126 179 126 184 L129 201 H71 Z" fill="${c.topShade}"/>
         <path d="M76 146 Q100 136 124 146 Q114 154 100 154 Q86 154 76 146Z" fill="${c.topShade}"/>
         <path d="M87 146 L100 162 L113 146 Z" fill="${c.skinShade}"/>
         <path d="M92 159 L90 177 M108 159 L110 177" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round"/>
         <path d="M66 160 Q62 176 61 196 M134 160 Q138 176 139 196" stroke="${c.topShade}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".45"/>`;
    return `<svg class="kid ${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" viewBox="${vb}" role="img" aria-label="${c.name}">
      <ellipse class="k-shadow" cx="100" cy="280" rx="54" ry="7"/>
      <g class="k-all">
        <g class="k-leg k-leg-l">${leg(c)}</g>
        <g class="k-leg k-leg-r"><g transform="${MIRROR}">${leg(c)}</g></g>
        <g class="k-upper">
          ${torso}
          <g class="k-head">${isHuda ? headHuda(c) : headZaid(c)}</g>
          <g class="k-arm k-arm-l">${arm(c)}</g>
          <g class="k-arm k-arm-r"><g transform="${MIRROR}">${arm(c, book + sparks)}</g></g>
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
