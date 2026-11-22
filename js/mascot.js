/* Qalam Quest — the two buddies, Zaid and Huda.
 * Pure SVG, rigged so CSS can animate arms, head, eyes and mouth.
 * Moods: idle · happy · sad · talk · wave · think
 */
(function () {
  'use strict';
  const INK = '#2B2440';

  const BUDDIES = {
    zaid: {
      name: 'Zaid', pronoun: 'he', colour: '#2BC48A',
      skin: '#C98D62', skinShade: '#B77B52', shirt: '#2BC48A', shirtDark: '#1FA06F', legs: '#3A4A7A',
      line: 'I love spotting patterns!',
    },
    huda: {
      name: 'Huda', pronoun: 'she', colour: '#FF6FA5',
      skin: '#F0BE96', skinShade: '#E2A87E', shirt: '#8E6CFF', shirtDark: '#7350E6', legs: '#5B3FC4',
      hijab: '#FF6FA5', hijabLight: '#FF9CC4', hijabDark: '#E4528A',
      line: 'Every letter is a little friend!',
    },
  };

  function face(b, cx, faceY) {
    return `
      <g class="kid-eyes">
        <ellipse cx="66" cy="${faceY}" rx="5.5" ry="7" fill="${INK}"/>
        <ellipse cx="94" cy="${faceY}" rx="5.5" ry="7" fill="${INK}"/>
        <circle cx="68" cy="${faceY - 3}" r="2.1" fill="#fff"/>
        <circle cx="96" cy="${faceY - 3}" r="2.1" fill="#fff"/>
      </g>
      <g class="kid-eyes-happy" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round">
        <path d="M60 ${faceY + 2} Q66 ${faceY - 6} 72 ${faceY + 2}"/>
        <path d="M88 ${faceY + 2} Q94 ${faceY - 6} 100 ${faceY + 2}"/>
      </g>
      <g class="kid-brows" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round">
        <path class="brow-l" d="M59 ${faceY - 14} Q66 ${faceY - 18} 72 ${faceY - 15}"/>
        <path class="brow-r" d="M88 ${faceY - 15} Q94 ${faceY - 18} 101 ${faceY - 14}"/>
      </g>
      <ellipse cx="56" cy="${faceY + 14}" rx="7" ry="4.5" fill="#FF7A8A" opacity=".45"/>
      <ellipse cx="104" cy="${faceY + 14}" rx="7" ry="4.5" fill="#FF7A8A" opacity=".45"/>
      <g class="kid-mouths">
        <path class="m m-smile" d="M70 ${faceY + 16} Q80 ${faceY + 26} 90 ${faceY + 16}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <g class="m m-open">
          <path d="M67 ${faceY + 14} Q80 ${faceY + 13} 93 ${faceY + 14} Q91 ${faceY + 32} 80 ${faceY + 32} Q69 ${faceY + 32} 67 ${faceY + 14}Z" fill="${INK}"/>
          <path d="M72 ${faceY + 26} Q80 ${faceY + 20} 88 ${faceY + 26} Q84 ${faceY + 31} 80 ${faceY + 31} Q76 ${faceY + 31} 72 ${faceY + 26}Z" fill="#FF7A8A"/>
        </g>
        <path class="m m-sad" d="M71 ${faceY + 24} Q80 ${faceY + 16} 89 ${faceY + 24}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse class="m m-o" cx="80" cy="${faceY + 20}" rx="6" ry="7" fill="${INK}"/>
      </g>`;
  }

  function zaid(b) {
    return `
      <g class="kid-legs">
        <rect x="62" y="156" width="14" height="30" rx="7" fill="${b.legs}"/>
        <rect x="84" y="156" width="14" height="30" rx="7" fill="${b.legs}"/>
        <ellipse cx="67" cy="188" rx="12" ry="6.5" fill="#fff" stroke="#D5D9E5" stroke-width="2"/>
        <ellipse cx="93" cy="188" rx="12" ry="6.5" fill="#fff" stroke="#D5D9E5" stroke-width="2"/>
      </g>
      <g class="kid-arm kid-arm-l"><rect x="36" y="108" width="16" height="44" rx="8" fill="${b.shirt}"/><circle cx="44" cy="153" r="8.5" fill="${b.skin}"/></g>
      <g class="kid-arm kid-arm-r"><rect x="108" y="108" width="16" height="44" rx="8" fill="${b.shirt}"/><circle cx="116" cy="153" r="8.5" fill="${b.skin}"/></g>
      <path d="M48 122 C48 108 60 100 72 100 H88 C100 100 112 108 112 122 V162 C112 167 108 170 103 170 H57 C52 170 48 167 48 162Z" fill="${b.shirt}"/>
      <path d="M68 101 L80 116 L92 101Z" fill="#fff"/>
      <path d="M80 128 l3.5 7 7.7 1.1 -5.6 5.4 1.3 7.6 -6.9 -3.6 -6.9 3.6 1.3 -7.6 -5.6 -5.4 7.7 -1.1Z" fill="#FFD23F"/>
      <g class="kid-head">
        <circle cx="42" cy="68" r="9" fill="${b.skinShade}"/>
        <circle cx="118" cy="68" r="9" fill="${b.skinShade}"/>
        <circle cx="80" cy="64" r="38" fill="${b.skin}"/>
        <g fill="#2B1D16">
          <path d="M42 62 C40 36 58 22 80 22 C102 22 120 36 118 62 C112 50 100 43 80 43 C60 43 48 50 42 62Z"/>
          <circle cx="52" cy="38" r="11"/><circle cx="65" cy="29" r="11"/><circle cx="80" cy="26" r="11"/><circle cx="95" cy="29" r="11"/><circle cx="108" cy="38" r="11"/><circle cx="72" cy="40" r="9"/><circle cx="90" cy="40" r="9"/>
        </g>
        ${face(b, 80, 66)}
      </g>`;
  }

  function huda(b) {
    return `
      <g class="kid-legs">
        <rect x="64" y="160" width="13" height="26" rx="6.5" fill="${b.skinShade}"/>
        <rect x="83" y="160" width="13" height="26" rx="6.5" fill="${b.skinShade}"/>
        <ellipse cx="69" cy="188" rx="12" ry="6.5" fill="#FFD23F" stroke="#E6B800" stroke-width="2"/>
        <ellipse cx="91" cy="188" rx="12" ry="6.5" fill="#FFD23F" stroke="#E6B800" stroke-width="2"/>
      </g>
      <g class="kid-arm kid-arm-l"><rect x="36" y="108" width="16" height="44" rx="8" fill="${b.shirt}"/><circle cx="44" cy="153" r="8.5" fill="${b.skin}"/></g>
      <g class="kid-arm kid-arm-r"><rect x="108" y="108" width="16" height="44" rx="8" fill="${b.shirt}"/><circle cx="116" cy="153" r="8.5" fill="${b.skin}"/></g>
      <path d="M50 118 C50 106 62 100 72 100 H88 C98 100 110 106 110 118 L118 170 C118 174 115 176 111 176 H49 C45 176 42 174 42 170Z" fill="${b.shirt}"/>
      <path d="M46 152 H114 L116 162 H44Z" fill="${b.shirtDark}" opacity=".5"/>
      <g class="kid-head">
        <path d="M34 72 C34 38 54 18 80 18 C106 18 126 38 126 72 C126 100 114 120 80 124 C46 120 34 100 34 72Z" fill="${b.hijab}"/>
        <path d="M46 108 C58 120 102 120 114 108 L116 126 C100 136 60 136 44 126Z" fill="${b.hijabDark}"/>
        <ellipse cx="80" cy="70" rx="31" ry="33" fill="${b.skin}"/>
        <path d="M48 64 C48 42 62 32 80 32 C98 32 112 42 112 64 C106 50 96 43 80 43 C64 43 54 50 48 64Z" fill="${b.hijab}"/>
        <path d="M56 36 C64 28 76 26 86 27" stroke="${b.hijabLight}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <circle cx="108" cy="104" r="4" fill="#FFD23F"/>
        ${face(b, 80, 68)}
      </g>`;
  }

  function kid(buddy, mood, extraClass) {
    const b = BUDDIES[buddy] || BUDDIES.huda;
    const body = buddy === 'zaid' ? zaid(b) : huda(b);
    return `<svg class="kid ${extraClass || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" viewBox="0 0 160 200" role="img" aria-label="${b.name}">
      <ellipse class="kid-shadow" cx="80" cy="194" rx="40" ry="5.5" fill="#000" opacity=".10"/>
      <g class="kid-all">${body}</g>
    </svg>`;
  }

  function setMood(root, mood, ms) {
    const el = root && (root.matches && root.matches('.kid') ? root : root.querySelector('.kid'));
    if (!el) return;
    el.setAttribute('data-mood', mood);
    clearTimeout(el._moodT);
    if (ms) el._moodT = setTimeout(() => el.setAttribute('data-mood', 'idle'), ms);
  }

  window.QQ_MASCOT = { BUDDIES, kid, setMood };
})();
