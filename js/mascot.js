/* Qalam — Zaid & Huda, v5 ("3D" redesign).
 *
 * PERSPECTIVE RULE: always a straight front view, face centred on x = 100, body symmetrical,
 * feet planted. Poses come only from moving rig parts, never from turning the character.
 *
 * Look: one light source, upper-left. Every surface is shaded (radial skin, cylindrical limbs and
 * clothes, glossy hair), with soft contact shadows where parts meet, so the kids read as rounded.
 *
 * Rig (viewBox 0 0 200 292):
 *   k-all { k-leg-l { k-shin-l }  k-leg-r { k-shin-r }
 *           k-upper { torso · k-head { k-pupils … } · k-arm-l { k-fore-l } · k-arm-r { k-fore-r } } }
 * Joints: shoulders (66|134,158) · elbows (58|142,190) · hips (87|113,214) · knees (87|113,242)
 *
 * Moods: idle · wave · happy · talk · sad · think · cheeky · dance · walk · read · point · sit · sleep
 * Life: random blinks, eye glances and per-kid timing are driven by the small loop at the bottom.
 */
(function () {
  'use strict';
  const INK = '#2A1A1E';
  const P = {
    zaid: {
      name: 'Zaid', line: 'I love spotting patterns!',
      skinHi: '#F7AE78', skin: '#E58A4E', skinLo: '#C06630', skinAO: '#9C4C22',
      hair: '#2B171A', hairMid: '#3E2328', hairHi: '#6A4048',
      top: '#2457E6', topHi: '#4C7BFF', topLo: '#1438A8', topAO: '#0E2A82',
      pants: '#2D2A4C', pantsHi: '#45416E', pantsLo: '#1C1A33',
      shoe: '#FFB703', shoeHi: '#FFD566', shoeLo: '#D98A00', sole: '#FBF1DF', soleLo: '#D9C7A8',
      iris: '#4A2B1A', irisHi: '#8A5A36',
    },
    huda: {
      name: 'Huda', line: 'Every letter is a little friend!',
      skinHi: '#F7AE78', skin: '#E58A4E', skinLo: '#C06630', skinAO: '#9C4C22',
      scarf: '#8A2468', scarfHi: '#B04A8C', scarfLo: '#5E1446', scarfAO: '#440C32',
      top: '#5FC48E', topHi: '#8FE0B3', topLo: '#3A9E6A', topAO: '#27794F',
      pants: '#3A2E45', pantsHi: '#54456A', pantsLo: '#241C2C',
      shoe: '#5FC48E', shoeHi: '#9BE7BD', shoeLo: '#35966A', sole: '#FBF1DF', soleLo: '#D9C7A8',
      iris: '#3E2416', irisHi: '#86532F',
    },
  };
  const MIRROR = 'matrix(-1 0 0 1 200 0)';
  let uid = 0;

  // ---------- shared paint (per instance, so ids never clash) ----------
  function defs(id, c, huda) {
    const cyl = (name, lo, mid, hi, rev) => {
      const s = rev ? [[0, lo], [.25, mid], [.45, hi], [.7, mid], [1, lo]].map(([o, k]) => [1 - o, k]).reverse() : [[0, lo], [.25, mid], [.45, hi], [.7, mid], [1, lo]];
      return `<linearGradient id="${id}${name}" x1="0" y1="0" x2="1" y2="0">${s.map(([o, k]) => `<stop offset="${o}" stop-color="${k}"/>`).join('')}</linearGradient>`;
    };
    return `<defs>
      <radialGradient id="${id}skin" cx=".42" cy=".36" r=".72"><stop offset="0" stop-color="${c.skinHi}"/><stop offset=".55" stop-color="${c.skin}"/><stop offset="1" stop-color="${c.skinLo}"/></radialGradient>
      <radialGradient id="${id}hand" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${c.skinHi}"/><stop offset=".6" stop-color="${c.skin}"/><stop offset="1" stop-color="${c.skinLo}"/></radialGradient>
      <linearGradient id="${id}neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.skinAO}"/><stop offset=".55" stop-color="${c.skinLo}"/><stop offset="1" stop-color="${c.skin}"/></linearGradient>
      <radialGradient id="${id}blush" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF6F61" stop-opacity=".45"/><stop offset="1" stop-color="#FF6F61" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}iris" cx=".45" cy=".62" r=".6"><stop offset="0" stop-color="${c.irisHi}"/><stop offset=".7" stop-color="${c.iris}"/><stop offset="1" stop-color="#1A0E0A"/></radialGradient>
      <linearGradient id="${id}sclera" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DDE3"/><stop offset=".35" stop-color="#FFFFFF"/></linearGradient>
      <radialGradient id="${id}shadow" cx=".5" cy=".5" r=".5"><stop class="k-sh" offset="0" stop-color="#1C1030" stop-opacity=".34"/><stop class="k-sh" offset=".7" stop-color="#1C1030" stop-opacity=".12"/><stop class="k-sh" offset="1" stop-color="#1C1030" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}ao" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      ${cyl('top', c.topLo, c.top, c.topHi)}${cyl('topR', c.topLo, c.top, c.topHi, true)}
      ${cyl('pants', c.pantsLo, c.pants, c.pantsHi)}${cyl('pantsR', c.pantsLo, c.pants, c.pantsHi, true)}
      <linearGradient id="${id}torso" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.topLo}"/><stop offset=".22" stop-color="${c.top}"/><stop offset=".4" stop-color="${c.topHi}"/><stop offset=".72" stop-color="${c.top}"/><stop offset="1" stop-color="${c.topLo}"/></linearGradient>
      <linearGradient id="${id}shoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.shoeHi}"/><stop offset=".55" stop-color="${c.shoe}"/><stop offset="1" stop-color="${c.shoeLo}"/></linearGradient>
      <linearGradient id="${id}sole" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sole}"/><stop offset="1" stop-color="${c.soleLo}"/></linearGradient>
      ${huda ? `<radialGradient id="${id}scarf" cx=".36" cy=".26" r=".85"><stop offset="0" stop-color="${c.scarfHi}"/><stop offset=".5" stop-color="${c.scarf}"/><stop offset="1" stop-color="${c.scarfLo}"/></radialGradient>
        <linearGradient id="${id}drape" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.scarfLo}"/><stop offset=".3" stop-color="${c.scarf}"/><stop offset=".48" stop-color="${c.scarfHi}"/><stop offset=".75" stop-color="${c.scarf}"/><stop offset="1" stop-color="${c.scarfLo}"/></linearGradient>`
        : `<radialGradient id="${id}curl" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="${c.hairHi}"/><stop offset=".45" stop-color="${c.hairMid}"/><stop offset="1" stop-color="${c.hair}"/></radialGradient>`}
      <clipPath id="${id}face"><path d="${FACE}"/></clipPath>
    </defs>`;
  }

  // ---------- body parts (drawn for the viewer's LEFT side; the right side is mirrored) ----------
  const FACE = 'M100 50 C129 50 147 71 147 100 C147 129 127 150 100 150 C73 150 53 129 53 100 C53 71 71 50 100 50Z';

  function upperArm(id, c, g) {
    return `<ellipse cx="63" cy="161" rx="11.5" ry="12" fill="url(#${id}${g})"/>
      <path d="M64 150 C55 151 50 158 50 168 L51 190 C52 197 64 197 65 190 L72 166 C74 156 71 150 64 150Z" fill="url(#${id}${g})"/>
      <circle cx="58" cy="190" r="7.4" fill="url(#${id}${g})"/>
      <path d="M53 166 Q52 178 53 189" stroke="${c.topHi}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".45"/>`;
  }
  function foreArm(id, c, g, extra) {
    return `<circle cx="58" cy="190" r="7.2" fill="url(#${id}${g})"/>
      <path d="M51 188 C50 182 64 181 65 188 L63 210 C62 216 50 216 50 210Z" fill="url(#${id}${g})"/>
      <rect x="48.5" y="206" width="16" height="7" rx="3.5" fill="${c.topLo}"/>
      <path d="M51 209 h12" stroke="${c.topAO}" stroke-width="1.2" opacity=".6"/>
      ${extra || ''}
      <g class="k-hand">
        <path d="M49 214 C44 216 44 227 50 230 C55 233 63 231 64 224 C65 218 61 213 56 213 C53 213 51 213 49 214Z" fill="url(#${id}hand)"/>
        <path d="M62 216 C67 217 68 222 64 224" fill="url(#${id}hand)" stroke="${c.skinLo}" stroke-width=".9"/>
        <path d="M49 224 Q54 227 59 225" stroke="${c.skinLo}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/>
        <ellipse cx="52" cy="218" rx="3" ry="2" fill="#fff" opacity=".25"/>
      </g>`;
  }
  function thigh(id, c, g) {
    return `<path d="M76 210 H98 L97 240 C97 247 77 247 76 240Z" fill="url(#${id}${g})"/>
      <path d="M80 214 Q79 228 80 240" stroke="${c.pantsHi}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".4"/>`;
  }
  function shin(id, c, g) {
    return `<path d="M77 238 C77 233 97 233 97 238 L96 262 H78Z" fill="url(#${id}${g})"/>
      <path d="M78 258 H96" stroke="${c.pantsLo}" stroke-width="2"/>
      <g class="k-foot">
        <path d="M71 274 C70 262 78 258 87 258 C96 258 103 262 103 274 Z" fill="url(#${id}shoe)"/>
        <path d="M80 262 C83 259 91 259 94 262" stroke="${c.sole}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M81 266 h12 M82 270 h10" stroke="${c.sole}" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>
        <ellipse cx="80" cy="264" rx="4" ry="2.4" fill="#fff" opacity=".35"/>
        <path d="M69 272 H105 C105 279 101 281 96 281 H78 C73 281 69 279 69 272Z" fill="url(#${id}sole)"/>
        <path d="M70 276 H104" stroke="${c.soleLo}" stroke-width="1.2" opacity=".8"/>
      </g>`;
  }

  // ---------- face ----------
  function eye(id, cx, cy, lashes) {
    return `<g>
      <ellipse cx="${cx}" cy="${cy}" rx="9.2" ry="11" fill="url(#${id}sclera)"/>
      <g class="k-pupils"><circle cx="${cx}" cy="${cy + 1.2}" r="7.2" fill="url(#${id}iris)"/><circle cx="${cx}" cy="${cy + 1.6}" r="3.6" fill="#120806"/>
        <circle cx="${cx - 2.6}" cy="${cy - 2.4}" r="2.4" fill="#fff"/><circle cx="${cx + 2.6}" cy="${cy + 4}" r="1.1" fill="#fff" opacity=".85"/></g>
      <path d="M${cx - 10} ${cy - 2} Q${cx} ${cy - 14.5} ${cx + 10} ${cy - 2}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      ${lashes ? `<path d="M${cx + 8.5} ${cy - 5} l3.5 -2.6 M${cx + 6} ${cy - 8.4} l2.6 -3.2" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` : ''}
    </g>`;
  }
  function face(id, c, huda) {
    const y = 103;
    const mouth = (cls, d) => `<g class="m ${cls}">${d}</g>`;
    return `
      <ellipse cx="100" cy="${y - 34}" rx="36" ry="10" fill="url(#${id}ao)" opacity=".55" clip-path="url(#${id}face)"/>
      <g class="k-eyes">${eye(id, 81, y, huda)}<g transform="${MIRROR}">${eye(id, 81, y, huda)}</g></g>
      <g class="k-eyes-happy" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round">
        <path d="M72 ${y + 3} Q81 ${y - 8} 90 ${y + 3}"/><path d="M110 ${y + 3} Q119 ${y - 8} 128 ${y + 3}"/></g>
      <g class="k-eyes-shut" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round">
        <path d="M72 ${y + 1} Q81 ${y + 7} 90 ${y + 1}"/><path d="M110 ${y + 1} Q119 ${y + 7} 128 ${y + 1}"/></g>
      <g class="k-brows" fill="${huda ? '#3A2024' : c.hair}">
        <path class="k-brow k-brow-l" d="M70 ${y - 17} Q80 ${y - 25} 91 ${y - 20} Q92 ${y - 17} 89 ${y - 17} Q80 ${y - 20} 72 ${y - 14} Q69 ${y - 14} 70 ${y - 17}Z"/>
        <path class="k-brow k-brow-r" d="M130 ${y - 17} Q120 ${y - 25} 109 ${y - 20} Q108 ${y - 17} 111 ${y - 17} Q120 ${y - 20} 128 ${y - 14} Q131 ${y - 14} 130 ${y - 17}Z"/>
      </g>
      <path d="M96.5 ${y + 13} Q100 ${y + 17} 103.5 ${y + 13}" stroke="${c.skinLo}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <ellipse cx="99" cy="${y + 9}" rx="2.2" ry="3" fill="#fff" opacity=".18"/>
      <ellipse cx="69" cy="${y + 18}" rx="10" ry="6.5" fill="url(#${id}blush)"/><ellipse cx="131" cy="${y + 18}" rx="10" ry="6.5" fill="url(#${id}blush)"/>
      <g class="k-mouths">
        ${mouth('m-open', `<path d="M86 ${y + 22} Q100 ${y + 20} 114 ${y + 22} Q113 ${y + 40} 100 ${y + 40} Q87 ${y + 40} 86 ${y + 22}Z" fill="#6E1426"/>
          <path d="M88 ${y + 23} Q100 ${y + 21.5} 112 ${y + 23} Q111 ${y + 27} 100 ${y + 27.5} Q89 ${y + 27} 88 ${y + 23}Z" fill="#FFF8EC"/>
          <path d="M91 ${y + 34} Q100 ${y + 28} 109 ${y + 34} Q106 ${y + 39.5} 100 ${y + 39.5} Q94 ${y + 39.5} 91 ${y + 34}Z" fill="#F2706A"/>`)}
        ${mouth('m-grin', `<path d="M85 ${y + 21} Q100 ${y + 20} 115 ${y + 21} Q113 ${y + 36} 100 ${y + 36} Q87 ${y + 36} 85 ${y + 21}Z" fill="#6E1426"/>
          <path d="M86.5 ${y + 21.6} Q100 ${y + 20.6} 113.5 ${y + 21.6} Q112 ${y + 27} 100 ${y + 27.6} Q88 ${y + 27} 86.5 ${y + 21.6}Z" fill="#FFF8EC"/>
          <path d="M93 ${y + 33} Q100 ${y + 30} 107 ${y + 33}" stroke="#F2706A" stroke-width="3" stroke-linecap="round" fill="none"/>`)}
        ${mouth('m-smile', `<path d="M88 ${y + 24} Q100 ${y + 34} 112 ${y + 24}" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`)}
        ${mouth('m-o', `<ellipse cx="100" cy="${y + 29}" rx="6" ry="7.5" fill="#6E1426"/><ellipse cx="100" cy="${y + 33}" rx="3.6" ry="2.6" fill="#F2706A"/>`)}
        ${mouth('m-sad', `<path d="M89 ${y + 33} Q100 ${y + 24} 111 ${y + 33}" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`)}
        ${mouth('m-smirk', `<path d="M88 ${y + 27} Q102 ${y + 32} 114 ${y + 21}" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M112 ${y + 19} q4 2 3 5" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`)}
      </g>`;
  }

  // ---------- heads ----------
  function headZaid(id, c) {
    const curl = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}curl)"/>`;
    const back = [[48, 76, 21], [53, 50, 21], [72, 30, 23], [100, 22, 25], [128, 30, 23], [147, 50, 21], [152, 76, 21], [46, 98, 13], [154, 98, 13]].map(([x, y, r]) => curl(x, y, r)).join('');
    const fringe = [[66, 52, 15], [84, 42, 16], [102, 39, 16], [120, 43, 15], [136, 53, 14], [56, 68, 11], [146, 70, 11]].map(([x, y, r]) => curl(x, y, r)).join('');
    return `
      <g>${back}</g>
      <path d="M60 50 Q66 40 74 38 M126 38 Q136 42 140 50 M90 20 Q100 16 110 20" stroke="${c.hairHi}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M86 138 H114 V160 H86Z" fill="url(#${id}neck)"/>
      <circle cx="53" cy="106" r="11" fill="url(#${id}hand)"/><circle cx="147" cy="106" r="11" fill="url(#${id}hand)"/>
      <path d="M50 102 Q55 99 57 107" stroke="${c.skinLo}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M150 102 Q145 99 143 107" stroke="${c.skinLo}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="${FACE}" fill="url(#${id}skin)"/>
      <path d="M58 118 C64 140 82 150 100 150 C118 150 136 140 142 118 C136 136 120 145 100 145 C80 145 64 136 58 118Z" fill="${c.skinLo}" opacity=".35"/>
      <g clip-path="url(#${id}face)"><path d="M50 74 C60 64 78 70 92 62 C104 70 124 64 150 76 L150 60 L50 60Z" fill="#000" opacity=".16"/></g>
      <g>${fringe}</g>
      <path d="M76 36 Q86 31 96 33 M108 34 Q118 33 126 38" stroke="${c.hairHi}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>
      ${face(id, c, false)}`;
  }
  function headHuda(id, c) {
    return `
      <path d="M100 18 C60 18 38 48 38 92 C38 118 42 138 40 158 C38 178 30 196 38 208 C46 218 64 214 70 200 L76 174 H124 C150 164 162 132 162 92 C162 48 140 18 100 18Z" fill="url(#${id}scarf)"/>
      <path d="M40 158 C38 178 30 196 38 208 C46 218 64 214 70 200 L74 178 C62 182 50 172 40 158Z" fill="${c.scarfLo}"/>
      <path d="M52 186 Q50 198 46 206 M60 182 Q60 194 58 204" stroke="${c.scarfAO}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>
      <ellipse cx="100" cy="100" rx="51" ry="54" fill="${c.scarfAO}" opacity=".55"/>
      <path d="${FACE}" fill="url(#${id}skin)"/>
      <g clip-path="url(#${id}face)"><ellipse cx="100" cy="100" rx="47" ry="50" fill="none" stroke="#000" stroke-width="7" opacity=".14"/></g>
      <path d="M54 92 C55 62 75 46 100 46 C125 46 145 62 146 92 C138 68 121 57 100 57 C79 57 62 68 54 92Z" fill="url(#${id}scarf)"/>
      <path d="M62 34 Q80 23 102 24" stroke="${c.scarfHi}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>
      <path d="M70 30 Q84 25 96 26" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".25"/>
      <path d="M58 142 Q100 176 142 142 L138 164 Q100 186 62 164Z" fill="${c.scarfLo}"/>
      <path d="M70 158 Q100 176 130 158" stroke="${c.scarfAO}" stroke-width="2" fill="none" opacity=".5"/>
      <circle cx="140" cy="150" r="4.4" fill="#FFD23F"/><circle cx="139" cy="148.8" r="1.4" fill="#fff" opacity=".8"/>
      ${face(id, c, true)}`;
  }

  // ---------- torsos ----------
  function torsoZaid(id, c) {
    return `
      <path d="M70 150 Q100 140 130 150 Q143 155 145 172 L148 210 Q148 221 137 221 H63 Q52 221 52 210 L55 172 Q57 155 70 150Z" fill="url(#${id}torso)"/>
      <path d="M76 147 Q100 138 124 147 Q118 160 100 161 Q82 160 76 147Z" fill="${c.topLo}"/>
      <path d="M82 148 Q100 142 118 148 Q112 156 100 156 Q88 156 82 148Z" fill="${c.topAO}"/>
      <path d="M90 154 L89 176 M110 154 L111 176" stroke="#F4F6FF" stroke-width="3.4" stroke-linecap="round"/>
      <rect x="86.6" y="175" width="5" height="6" rx="1.6" fill="#D9DEF2"/><rect x="108.4" y="175" width="5" height="6" rx="1.6" fill="#D9DEF2"/>
      <path d="M73 186 Q73 181 78 181 H122 Q127 181 127 186 L130 204 H70Z" fill="${c.topLo}"/>
      <path d="M73 186 Q73 181 78 181 H122 Q127 181 127 186" stroke="${c.topAO}" stroke-width="1.6" fill="none"/>
      <path d="M52 206 H148 L148 210 Q148 221 137 221 H63 Q52 221 52 210Z" fill="${c.topLo}"/>
      <path d="M56 212 H144" stroke="${c.topAO}" stroke-width="1.2" opacity=".6"/>
      <path d="M64 168 Q61 186 60 204 M136 168 Q139 186 140 204" stroke="${c.topAO}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".35"/>`;
  }
  function torsoHuda(id, c) {
    return `
      <path d="M68 152 Q100 144 132 152 Q142 158 144 176 L150 214 Q151 224 140 224 H60 Q49 224 50 214 L56 176 Q58 158 68 152Z" fill="url(#${id}torso)"/>
      <path d="M50 212 H150 L150 214 Q151 224 140 224 H60 Q49 224 50 214Z" fill="${c.topLo}"/>
      <path d="M80 190 Q78 206 76 220 M120 190 Q122 206 124 220" stroke="${c.topAO}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".35"/>`;
  }

  // ---------- assemble ----------
  const book = `<g class="k-book" transform="translate(-6 -4)">
      <path d="M26 176 H58 Q62 176 62 180 V222 Q62 226 58 226 H26 Z" fill="#E45A3A"/>
      <path d="M26 176 H56 Q60 176 60 180 V220 Q60 224 56 224 H26 Z" fill="#FC856B"/>
      <rect x="26" y="176" width="5" height="48" fill="#D2492C"/>
      <rect x="35" y="184" width="19" height="6" rx="3" fill="#FFF3E8" opacity=".7"/>
      <path d="M36 196 h16 M36 202 h12" stroke="#FFF3E8" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
    </g>`;
  const sparks = `<g class="k-spark" fill="#FFC93C">
      <path d="M34 238 l2.5 -7 2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5z"/><path d="M58 246 l1.6 -4.4 1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6z"/></g>`;

  function kid(buddy, mood, cls, opts) {
    buddy = P[buddy] ? buddy : 'huda';
    const c = P[buddy]; const o = opts || {};
    const huda = buddy === 'huda'; const id = 'k' + (++uid) + '-';
    const vb = o.headOnly ? '34 10 132 152' : '0 0 200 292';
    const leg = (side) => {
      const r = side === 'r'; const g = r ? 'pantsR' : 'pants';
      const d = (s) => (r ? `<g transform="${MIRROR}">${s}</g>` : s);
      return `<g class="k-leg k-leg-${side}">${d(thigh(id, c, g))}<g class="k-shin k-shin-${side}">${d(shin(id, c, g))}</g></g>`;
    };
    const arm = (side) => {
      const r = side === 'r'; const g = r ? 'topR' : 'top';
      const d = (s) => (r ? `<g transform="${MIRROR}">${s}</g>` : s);
      return `<g class="k-arm k-arm-${side}"><g class="k-fore k-fore-${side}">${d(foreArm(id, c, g, r ? book + sparks : ''))}</g>${d(upperArm(id, c, g))}</g>`;
    };
    return `<svg class="kid ${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" viewBox="${vb}" role="img" aria-label="${c.name}">
      ${defs(id, c, huda)}
      <ellipse class="k-shadow" cx="100" cy="282" rx="58" ry="8" style="fill:url(#${id}shadow)"/>
      <g class="k-all">
        ${leg('l')}${leg('r')}
        <g class="k-upper">
          ${huda ? torsoHuda(id, c) : torsoZaid(id, c)}
          <ellipse cx="100" cy="152" rx="30" ry="7" fill="url(#${id}ao)"/>
          <g class="k-head">${huda ? headHuda(id, c) : headZaid(id, c)}</g>
          ${arm('l')}${arm('r')}
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

  // ---------- life: blinks, glances and individual timing for every kid on screen ----------
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const life = new WeakMap();
  function tick() {
    const now = performance.now();
    document.querySelectorAll('svg.kid').forEach((k) => {
      let s = life.get(k);
      if (!s) {
        s = { blink: now + 600 + Math.random() * 3000, look: now + 800 + Math.random() * 2500 };
        k.style.setProperty('--ph', (-Math.random() * 6).toFixed(2) + 's');   // own phase for every looping move
        k.style.setProperty('--sp', (0.92 + Math.random() * 0.16).toFixed(2)); // and a slightly different tempo
        life.set(k, s);
      }
      if (now > s.blink) {
        k.classList.add('blink'); setTimeout(() => k.classList.remove('blink'), 120);
        if (Math.random() < 0.18) setTimeout(() => { k.classList.add('blink'); setTimeout(() => k.classList.remove('blink'), 110); }, 230); // double blink
        s.blink = now + 2200 + Math.random() * 4200;
      }
      if (now > s.look) {
        const away = Math.random() < 0.55;
        k.style.setProperty('--lx', away ? ((Math.random() * 2 - 1) * 2.6).toFixed(1) + 'px' : '0px');
        k.style.setProperty('--ly', away ? ((Math.random() * 2 - 1) * 1.6).toFixed(1) + 'px' : '0px');
        s.look = now + 900 + Math.random() * 2600;
      }
    });
    setTimeout(tick, 160);
  }
  if (!reduce) setTimeout(tick, 300);

  window.QQ_MASCOT = { BUDDIES: P, kid, setMood, liven };
})();
