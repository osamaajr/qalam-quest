/* Qalam — Qur'anic animal friends.
   Flat, chunky vector animals drawn in the style of the Sami & Maryam board
   (tools/ref/sami-maryam-sheet.webp): solid dark oval eyes, thick dark brows,
   open "D" smiles with a pink tongue, flat fills + one soft shade tone.
   window.QQ_ANIMALS = { LIST, svg(name, { state, cls }) }
   Each animal has ONE signature activity in state "idle" (hoopoe carries a
   letter, bee sips a flower, ant hauls a grain, camel rests and chews,
   elephant sprays water, whale swims and spouts, cow grazes).
   Animation lives in css/animals.css, driven by [data-animal] / [data-state]. */
(function () {
  'use strict';

  var LIST = [
    { key: 'hoopoe',   name: 'Hudhud the Hoopoe', ar: 'هُدْهُد', ref: '27:20',  fact: "Sulaymān's messenger bird, who flew back with news from Saba’." },
    { key: 'bee',      name: 'Nahla the Bee',     ar: 'نَحْلَة', ref: '16:68',  fact: 'Allah inspired the bee to build homes and make healing honey.' },
    { key: 'ant',      name: 'Namla the Ant',     ar: 'نَمْلَة', ref: '27:18',  fact: "A little ant warned her friends to get out of Sulaymān's way." },
    { key: 'camel',    name: 'Jamal the Camel',   ar: 'جَمَل',   ref: '88:17',  fact: '“Do they not look at the camel — how it was created?”' },
    { key: 'elephant', name: 'Feel the Elephant', ar: 'فِيل',    ref: '105:1',  fact: 'Sūrat al-Fīl tells the story of the Year of the Elephant.' },
    { key: 'whale',    name: 'Hoot the Whale',    ar: 'حُوت',    ref: '37:142', fact: 'The whale that swallowed Prophet Yūnus — and safely let him go.' },
    { key: 'cow',      name: 'Baqara the Cow',    ar: 'بَقَرَة', ref: '2:67',   fact: 'Sūrat al-Baqarah, the longest sūrah, is named after a cow.' }
  ];

  // Board palette
  var EYE = '#281810';      // eyes + brows (the board's near-black brown)
  var MOUTH = '#7A2830';    // open mouth
  var TONGUE = '#F08A80';
  var TEETH = '#FFFFFF';
  var MINT = '#5FCB93', MINT_S = '#46AE79', MINT_D = '#3A9866';
  var uid = 0;

  /* ---------- drawing helpers ---------- */

  function E(cx, cy, rx, ry) {
    return 'M' + (cx - rx) + ' ' + cy +
      'A' + rx + ' ' + ry + ' 0 1 0 ' + (cx + rx) + ' ' + cy +
      'A' + rx + ' ' + ry + ' 0 1 0 ' + (cx - rx) + ' ' + cy + 'Z';
  }

  function attrs(o) {
    var s = '';
    if (o.cls) s += ' class="' + o.cls + '"';
    if (o.org) s += ' style="transform-origin:' + o.org + '"';
    if (o.t) s += ' transform="' + o.t + '"';
    return s;
  }

  // A flat shape with ONE soft shade tone: a crescent on the lower-right,
  // made by masking the shape minus a copy nudged up-left.
  // o: { dx, dy, extra (markup clipped inside the shape), cls, org, t }
  function S(d, fill, shade, o) {
    o = o || {};
    var id = 'qa' + (++uid);
    var dx = o.dx == null ? -6 : o.dx, dy = o.dy == null ? -6 : o.dy;
    var s = '<g' + attrs(o) + '><defs>' +
      '<mask id="' + id + 'm" maskUnits="userSpaceOnUse" x="-80" y="-80" width="360" height="360">' +
      '<path d="' + d + '" fill="#fff"/><path d="' + d + '" fill="#000" transform="translate(' + dx + ' ' + dy + ')"/></mask>';
    if (o.extra) s += '<clipPath id="' + id + 'c"><path d="' + d + '"/></clipPath>';
    s += '</defs><path d="' + d + '" fill="' + fill + '"/>';
    if (o.extra) s += '<g clip-path="url(#' + id + 'c)">' + o.extra + '</g>';
    if (shade) s += '<path d="' + d + '" fill="' + shade + '" mask="url(#' + id + 'm)"/>';
    return s + '</g>';
  }

  function line(d, color, w, o) {
    o = o || {};
    return '<path' + attrs(o) + ' d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  // Tall solid ovals (no catch-light) + the thick upward arcs used when happy.
  function eyes(list) {
    var s = '<g class="a-gaze">';
    list.forEach(function (e) {
      var cx = e[0], cy = e[1], rx = e[2] || 5.6, ry = e[3] || 8.4;
      s += '<ellipse class="a-eye" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + EYE + '"/>';
      s += '<path class="a-eh" d="M' + (cx - rx - 1.6) + ' ' + (cy + 2.5) + 'Q' + cx + ' ' + (cy - ry - 2) + ' ' + (cx + rx + 1.6) + ' ' + (cy + 2.5) +
        '" fill="none" stroke="' + EYE + '" stroke-width="' + Math.max(3.6, rx * 0.8) + '" stroke-linecap="round"/>';
    });
    return s + '</g>';
  }

  // Thick, short curved brows. b: [cx, cy, halfWidth, tiltDeg]
  function brows(list, w) {
    return '<g class="a-brows">' + list.map(function (b) {
      var cx = b[0], cy = b[1], hw = b[2] || 6.5, tl = b[3] || 0;
      return '<path d="M' + (cx - hw) + ' ' + (cy + 2.2) + 'Q' + cx + ' ' + (cy - 2.6) + ' ' + (cx + hw) + ' ' + (cy + 2.2) +
        '" transform="rotate(' + tl + ' ' + cx + ' ' + cy + ')" fill="none" stroke="' + EYE + '" stroke-width="' + (w || 4.2) + '" stroke-linecap="round"/>';
    }).join('') + '</g>';
  }

  // The board's open "D" smile: maroon mouth, pink tongue (idle);
  // a bigger laughing one with teeth (happy).
  function dMouth(x, y, w, h, teeth) {
    var id = 'qa' + (++uid) + 'k';
    var d = 'M' + (x - w) + ' ' + y + 'Q' + x + ' ' + (y + w * 0.2) + ' ' + (x + w) + ' ' + y +
      'C' + (x + w) + ' ' + (y + h * 0.78) + ' ' + (x + w * 0.55) + ' ' + (y + h) + ' ' + x + ' ' + (y + h) +
      'C' + (x - w * 0.55) + ' ' + (y + h) + ' ' + (x - w) + ' ' + (y + h * 0.78) + ' ' + (x - w) + ' ' + y + 'Z';
    return '<defs><clipPath id="' + id + '"><path d="' + d + '"/></clipPath></defs>' +
      '<path d="' + d + '" fill="' + MOUTH + '"/>' +
      '<g clip-path="url(#' + id + ')">' +
        (teeth ? '<rect x="' + (x - w - 1) + '" y="' + (y - 2) + '" width="' + (2 * w + 2) + '" height="' + (h * 0.28 + 2) + '" rx="2" fill="' + TEETH + '"/>' : '') +
        '<ellipse cx="' + (x + w * 0.12) + '" cy="' + (y + h * 1.02) + '" rx="' + (w * 0.72) + '" ry="' + (h * 0.48) + '" fill="' + TONGUE + '"/>' +
      '</g>';
  }
  function mouth(x, y, w) {
    w = w || 6;
    return '<g class="a-mouth">' + dMouth(x, y, w, w * 1.15, false) + '</g>' +
      '<g class="a-mo">' + dMouth(x, y - 0.5, w * 1.3, w * 1.55, true) + '</g>';
  }

  function shadow(cx, rx, cls) {
    return '<ellipse class="a-shadow' + (cls ? ' ' + cls : '') + '" cx="' + cx + '" cy="189" rx="' + rx + '" ry="' + Math.max(4, rx * 0.13) + '" fill="rgba(60,30,20,.13)"/>';
  }

  // Stubby rounded leg from y0 down to the ground.
  function legD(x, y0, w) {
    var h = w / 2;
    return 'M' + (x - h) + ' ' + y0 + 'C' + (x - h) + ' ' + (y0 + 20) + ' ' + (x - h + 0.5) + ' 176 ' + (x - h + 0.5) + ' 181' +
      'Q' + (x - h + 0.5) + ' 189 ' + x + ' 189Q' + (x + h - 0.5) + ' 189 ' + (x + h - 0.5) + ' 181' +
      'C' + (x + h - 0.5) + ' 176 ' + (x + h) + ' ' + (y0 + 20) + ' ' + (x + h) + ' ' + y0 + 'Z';
  }
  function leg(x, y0, w, fill, shade, band, o) {
    o = o || {};
    o.dx = o.dx == null ? -4 : o.dx; o.dy = 0;
    if (band) o.extra = '<rect x="' + (x - w) + '" y="179" width="' + (w * 2) + '" height="12" fill="' + band + '"/>';
    return S(legD(x, y0, w), fill, shade, o);
  }

  function mirrorX(d) { // mirror a path's x coords around 100 (absolute commands, x y pairs)
    var i = 0;
    return d.replace(/-?\d+(\.\d+)?/g, function (n) {
      var v = (i++ % 2 === 0) ? (200 - parseFloat(n)) : parseFloat(n);
      return String(Math.round(v * 100) / 100);
    });
  }

  /* ---------- the animals ---------- */

  var DRAW = {};

  // Hoopoe — Sulaymān's messenger, hopping with a sealed letter in its beak.
  DRAW.hoopoe = function () {
    var body = '#EC9548', bodyS = '#CF7838', belly = '#F7C48A', black = '#3A2630', blackS = '#271820', cream = '#FFEBCB';
    var crest = '';
    [-78, -56, -34, -12, 10].forEach(function (a, i) {
      var fd = 'M0 4C-9 -6 -10 -30 -5 -40C-2 -44 3 -44 5 -40C10 -30 9 -6 0 4Z';
      crest += '<g transform="rotate(' + a + ')"><g class="a-feather" style="--fa:' + (i - 2) + '">' +
        S(fd, '#F2A657', '#D9873F', { dx: -3, dy: 0, extra:
          '<rect x="-12" y="-48" width="24" height="12" fill="' + black + '"/><rect x="-12" y="-36.5" width="24" height="4" fill="' + cream + '"/>' }) +
        '</g></g>';
    });
    var wingD = 'M114 119C97 112 74 121 66 139C62 150 66 161 75 161C93 159 109 149 115 134C117 128 117 122 114 119Z';
    var stripes = line('M90 118L110 141', cream, 5) + line('M78 128L98 151', cream, 5) + line('M68 139L88 161', cream, 5);
    var tailD = 'M80 139C63 139 42 148 27 161C23 165 27 171 33 170C51 168 67 162 84 155Z';
    // letter: a rolled scroll with a red wax seal
    var scroll = '<g class="a-scroll" style="transform-origin:166px 96px"><g transform="translate(168 101) scale(1.2) rotate(14) translate(-168 -101)">' +
        S('M150 95L186 95Q190 95 190 101.5Q190 108 186 108L150 108Q146 108 146 101.5Q146 95 150 95Z', '#FFF2DA', '#E9D1A6', { dx: 0, dy: -4 }) +
        '<ellipse cx="149" cy="101.5" rx="3.6" ry="6.5" fill="#E9CFA0"/><ellipse cx="187" cy="101.5" rx="3.6" ry="6.5" fill="#E9CFA0"/>' +
        '<path d="M166 107L163 118L167 115L170 119L170 107Z" fill="#B8323A"/>' +
        S(E(167, 109, 5.8, 5.8), '#D9483B', '#B8323A', { dx: -2, dy: -2 }) +
      '</g></g>';
    return shadow(104, 30) +
      '<g class="a-bob" style="transform-origin:100px 189px">' +
        line('M97 162L95 184M111 162L113 184', '#5A3A3A', 5.5) +
        line('M87 186.5L101 186.5M107 186.5L121 186.5', '#5A3A3A', 5) +
        S(tailD, black, blackS, { cls: 'a-tail', org: '80px 146px', dx: 0, dy: -4,
          extra: line('M45 147L54 170', cream, 5) }) +
        S(E(100, 140, 35, 31), body, bodyS, { dx: -8, dy: -7, extra: '<path d="' + E(114, 152, 20, 18) + '" fill="' + belly + '"/>' }) +
        S(wingD, black, blackS, { cls: 'a-wing', org: '112px 122px', dx: -3, dy: -4, extra: stripes }) +
        '<g class="a-head" style="transform-origin:108px 110px">' +
          '<g class="a-crest" style="transform-origin:92px 56px"><g transform="translate(92 56)">' + crest + '</g></g>' +
          S(E(110, 82, 36, 33), body, bodyS, { dx: -8, dy: -6 }) +
          scroll +
          S('M138 74C153 74 168 83 182 97C183 100 180 102 177 100C164 92 150 91 138 93Z', '#4A3438', '#33232A', { cls: 'a-beak', org: '140px 84px', dx: 0, dy: -3 }) +
          eyes([[106, 81, 5.6, 8.6], [128, 79, 5.4, 8.4]]) +
          brows([[105, 66, 6.8, -6], [128, 64, 6.4, 8]]) +
        '</g>' +
      '</g>';
  };

  // Bee — hovers by a pink flower and dips to sip from it.
  DRAW.bee = function () {
    var yel = '#FFC21A', yelS = '#E8A10C', brown = '#3E2420';
    var wfill = '#DDF1FF', wshade = '#B6DBF4';
    var stripes = '<path d="M30 110Q80 128 132 106L134 119Q80 142 30 123Z" fill="' + brown + '"/>' +
      '<path d="M32 133Q80 150 132 128L134 140Q80 164 32 146Z" fill="' + brown + '"/>';
    var petals = '';
    [0, 72, 144, 216, 288].forEach(function (a) {
      petals += '<g transform="rotate(' + a + ' 152 140)">' + S(E(152, 129, 7.5, 8.5), '#FF8FB3', '#EC6F98', { dx: -3, dy: -2 }) + '</g>';
    });
    var flower = '<g class="a-flower" style="transform-origin:152px 189px">' +
        line('M152 189C152 174 150 162 152 146', MINT_D, 5) +
        S('M152 174C158 162 170 160 176 164C170 173 160 176 152 174Z', MINT, MINT_S, { dx: -2, dy: -3 }) +
        S('M151 180C146 170 136 167 130 170C135 179 144 182 151 180Z', MINT, MINT_S, { dx: -2, dy: -3 }) +
        petals + S(E(152, 140, 6.5, 6.5), yel, yelS, { dx: -2, dy: -2 }) +
      '</g>';
    var pollen = '<circle class="a-pollen a-p1" cx="146" cy="128" r="2.6" fill="#FFD54A"/>' +
      '<circle class="a-pollen a-p2" cx="157" cy="126" r="2.2" fill="#FFD54A"/>' +
      '<circle class="a-pollen a-p3" cx="151" cy="131" r="1.9" fill="#FFE27A"/>';
    return shadow(152, 14) + shadow(80, 22, 'a-bee-shadow') + flower + pollen +
      '<g class="a-bob" style="transform-origin:80px 96px"><g class="a-head" style="transform-origin:80px 130px">' +
        S('M86 64C84 42 70 26 56 30C44 34 46 54 62 64C70 69 80 69 86 64Z', wfill, wshade, { cls: 'a-wing a-wing-l a-wing-2', org: '84px 64px', dx: 2, dy: -3 }) +
        S('M70 66C60 46 40 36 30 44C22 52 32 70 52 74C60 75 66 72 70 66Z', wfill, wshade, { cls: 'a-wing a-wing-l', org: '70px 68px', dx: 2, dy: -4 }) +
        '<g class="a-antenna a-ant-l" style="transform-origin:90px 62px">' + line('M90 62C92 50 98 42 106 38', brown, 4.2) + '<circle cx="108" cy="37" r="5.5" fill="' + brown + '"/></g>' +
        '<g class="a-antenna a-ant-r" style="transform-origin:104px 66px">' + line('M104 66C110 56 118 52 126 52', brown, 4.2) + '<circle cx="128" cy="52" r="5.5" fill="' + brown + '"/></g>' +
        '<path d="M42 116L22 122L42 130Z" fill="' + brown + '" stroke="' + brown + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<ellipse cx="72" cy="137" rx="5" ry="4.5" fill="' + brown + '"/><ellipse cx="92" cy="136" rx="5" ry="4.5" fill="' + brown + '"/>' +
        S(E(80, 96, 43, 41), yel, yelS, { dx: -8, dy: -7, extra: stripes }) +
        S('M90 60C92 36 112 22 124 30C132 38 122 58 102 66C96 68 91 66 90 60Z', wfill, wshade, { cls: 'a-wing a-wing-r', org: '92px 64px', dx: -2, dy: -4 }) +
        eyes([[88, 84, 5.6, 8.4], [111, 82, 5.4, 8.2]]) +
        brows([[87, 69, 6.4, -5], [111, 67, 6.2, 6]]) +
        mouth(103, 96, 8) +
      '</g></g>';
  };

  // Ant — marches in place hauling a golden grain over her head.
  DRAW.ant = function () {
    var c = '#D9573A', cs = '#B8432C', legC = '#7A2A1E', legF = '#5A1D14';
    function legs(list, color, cls) {
      return list.map(function (l, i) {
        return '<g class="a-leg ' + cls + (i ? ' a-legB' : ' a-legA') + '" style="transform-origin:' + l[0] + '">' + line(l[1], color, 5.5) +
          '<ellipse cx="' + l[2] + '" cy="187" rx="5" ry="3" fill="' + color + '"/></g>';
      }).join('');
    }
    var far = [['92px 146px', 'M92 146C86 158 80 170 78 186', 79], ['106px 146px', 'M106 146C110 160 114 172 116 186', 117]];
    var near = [['96px 150px', 'M96 150C90 162 88 174 88 186', 88], ['106px 150px', 'M106 150C112 162 124 172 126 186', 127]];
    return shadow(102, 46) +
      '<g class="a-bob" style="transform-origin:100px 189px">' +
        legs(far, legF, 'a-leg-far') +
        S(E(64, 140, 29, 23), c, cs, { t: 'rotate(-18 64 140)', dx: -6, dy: -6,
          extra: line('M50 120Q42 140 52 162', 'rgba(110,30,10,.16)', 4) }) +
        S(E(88, 145, 9, 7.5), c, cs, { dx: -2, dy: -3 }) +
        S(E(102, 140, 15, 14), c, cs, { dx: -4, dy: -4 }) +
        legs(near, legC, 'a-leg-near') +
        '<g class="a-load" style="transform-origin:128px 76px">' +
          line('M100 134C86 120 86 94 98 70', legC, 6) + '<circle cx="99" cy="68" r="6" fill="' + legC + '"/>' +
          S(E(128, 46, 38, 24), '#F5B630', '#D9941C', { t: 'rotate(-6 128 46)', dx: -6, dy: -6,
            extra: '<path d="M96 42C112 36 140 34 158 40" fill="none" stroke="#FFD873" stroke-width="4" stroke-linecap="round"/>' +
                   '<path d="M128 24C124 34 124 54 130 68" fill="none" stroke="#E7A422" stroke-width="3" stroke-linecap="round"/>' }) +
          line('M114 138C146 136 166 104 158 72', legC, 6) + '<circle cx="157" cy="70" r="6" fill="' + legC + '"/>' +
        '</g>' +
        '<g class="a-head" style="transform-origin:116px 132px">' +
          '<g class="a-antenna a-ant-l" style="transform-origin:146px 86px">' + line('M146 86C156 76 166 72 176 72', legC, 4.2) + '<circle cx="178" cy="72" r="5.5" fill="' + legC + '"/></g>' +
          '<g class="a-antenna a-ant-r" style="transform-origin:150px 94px">' + line('M150 94C162 90 172 92 180 98', legC, 4.2) + '<circle cx="182" cy="99" r="5.5" fill="' + legC + '"/></g>' +
          S(E(128, 104, 30, 28), c, cs, { dx: -7, dy: -6 }) +
          eyes([[119, 101, 5.4, 8.2], [140, 99, 5.2, 8]]) +
          brows([[118, 86, 6.2, -6], [140, 84, 6, 6]]) +
          mouth(132, 113, 8) +
        '</g>' +
      '</g>';
  };

  // Camel — resting with legs folded under, chewing slowly.
  DRAW.camel = function () {
    var c = '#E9A45A', cs = '#CC8540', dk = '#8A5332', muz = '#F7CB90', muzS = '#E3AE70';
    var knee = function (d) { return S(d, '#DE9548', '#C47C38', { dx: -3, dy: -3 }); };
    return shadow(94, 66) +
      '<g class="a-bob" style="transform-origin:96px 189px">' +
        '<g class="a-tail" style="transform-origin:34px 140px">' + line('M36 140C26 146 22 158 24 168', cs, 5.5) +
          S('M24 162C18 166 18 176 24 180C30 176 30 166 24 162Z', dk, null) + '</g>' +
        '<g class="a-body" style="transform-origin:90px 186px">' +
          S('M28 166C26 142 40 124 58 118C64 92 78 78 92 78C108 78 118 96 121 118C139 122 151 140 151 160C151 176 139 186 120 186L46 186C34 186 28 178 28 166Z', c, cs, { dx: -9, dy: -8 }) +
          knee('M38 178C38 168 52 165 66 168C74 171 75 182 68 186L42 186C39 185 38 182 38 178Z') +
          '<path d="M38 180C38 184 40 186 44 186L48 186L48 176C42 175 38 176 38 180Z" fill="' + dk + '"/>' +
          knee('M104 178C104 168 118 165 132 168C140 171 141 182 134 186L108 186C105 185 104 182 104 178Z') +
          '<path d="M104 180C104 184 106 186 110 186L114 186L114 176C108 175 104 176 104 180Z" fill="' + dk + '"/>' +
        '</g>' +
        '<g class="a-head" style="transform-origin:138px 146px">' +
          S('M116 152C118 128 126 108 134 92L164 96C158 112 152 134 150 158Z', c, cs, { dx: -7, dy: 0 }) +
          '<g transform="translate(156 86) scale(1.16) translate(-156 -86)">' +
          '<g class="a-ear a-ear-l" style="transform-origin:140px 62px">' + S(E(136, 56, 6, 10), c, cs, { t: 'rotate(-30 136 56)', dx: -2, dy: -3 }) + '</g>' +
          '<g class="a-ear a-ear-r" style="transform-origin:170px 60px">' + S(E(174, 54, 6, 10), c, cs, { t: 'rotate(30 174 54)', dx: -2, dy: -3 }) + '</g>' +
          S(E(154, 78, 26, 23), c, cs, { dx: -7, dy: -6 }) +
          S('M142 58C141 48 152 45 155 52C159 45 169 49 166 58C161 61 147 62 142 58Z', '#C27434', '#A8622A', { dx: -2, dy: -2 }) +
          eyes([[146, 76, 5.2, 7.8], [166, 74, 5, 7.6]]) +
          brows([[145, 62, 6, -6], [166, 60, 5.8, 8]], 4) +
          S(E(172, 97, 19, 13), muz, muzS, { dx: -4, dy: -4 }) +
          '<ellipse cx="165" cy="91" rx="2.4" ry="1.8" fill="' + dk + '"/><ellipse cx="180" cy="90" rx="2.4" ry="1.8" fill="' + dk + '"/>' +
          '<g class="a-chew" style="transform-origin:172px 100px">' + mouth(172, 98.5, 6.6) + '</g>' +
          '</g>' +
        '</g>' +
      '</g>';
  };

  // Elephant — lifts its trunk and sprays a playful arc of water.
  DRAW.elephant = function () {
    var c = '#94A9DE', cs = '#7A8FC6', tr = '#889ED8', trS = '#7086C2', pink = '#F4A3B4', pinkS = '#E28499', nail = '#F4F1FB';
    var earO = 'M70 60C50 44 18 50 15 81C13 108 37 126 62 114C74 108 78 94 77 80Z';
    var earI = 'M65 68C51 59 30 64 28 83C27 101 44 112 58 105C66 100 70 90 69 79Z';
    function ear(side) {
      var o = side === 'l' ? earO : mirrorX(earO), i = side === 'l' ? earI : mirrorX(earI);
      return '<g class="a-ear a-ear-' + side + '" style="transform-origin:' + (side === 'l' ? '74px 80px' : '126px 80px') + '">' +
        S(o, c, cs, { dx: -6, dy: -6 }) + S(i, pink, pinkS, { dx: -4, dy: -4 }) + '</g>';
    }
    function nails(x) {
      return '<ellipse cx="' + (x - 6) + '" cy="184" rx="3.4" ry="2.6" fill="' + nail + '"/><ellipse cx="' + x + '" cy="185" rx="3.4" ry="2.6" fill="' + nail + '"/><ellipse cx="' + (x + 6) + '" cy="184" rx="3.4" ry="2.6" fill="' + nail + '"/>';
    }
    // water drops along an arc rising up-left from the raised trunk tip
    var arc = [[51, 84, 3.8], [46, 72, 4.4], [40, 61, 4.8], [32, 53, 5], [22, 49, 4.8], [12, 51, 4.4], [4, 58, 4], [-1, 68, 3.6]];
    var spray = '<g class="a-spray">' + arc.map(function (p, i) {
      return '<path class="a-drop a-d' + i + '" d="M' + p[0] + ' ' + (p[1] - p[2] * 1.5) + 'C' + (p[0] + p[2] * 0.6) + ' ' + (p[1] - p[2] * 0.4) + ' ' + (p[0] + p[2]) + ' ' + p[1] + ' ' + p[0] + ' ' + (p[1] + p[2]) +
        'C' + (p[0] - p[2]) + ' ' + p[1] + ' ' + (p[0] - p[2] * 0.6) + ' ' + (p[1] - p[2] * 0.4) + ' ' + p[0] + ' ' + (p[1] - p[2] * 1.5) + 'Z" fill="#8ED4F8"/>';
    }).join('') + '</g>';
    return shadow(100, 46) +
      '<g class="a-bob" style="transform-origin:100px 189px">' +
        S(E(100, 154, 40, 30), c, cs, { dx: -8, dy: -7 }) +
        leg(80, 152, 24, c, cs, null, { cls: 'a-leg a-leg-l', org: '80px 155px' }) + nails(80) +
        leg(120, 152, 24, c, cs, null, { cls: 'a-leg a-leg-r', org: '120px 155px' }) + nails(120) +
        '<g class="a-head" style="transform-origin:100px 124px">' +
          ear('l') + ear('r') +
          S(E(100, 86, 42, 39), c, cs, { dx: -8, dy: -7 }) +
          S('M92 50C91 41 99 38 101 45C104 38 112 42 108 50C104 53 96 53 92 50Z', cs, '#6A7FB6', { dx: -2, dy: -2 }) +
          eyes([[83, 82, 5.8, 8.8], [117, 82, 5.8, 8.8]]) +
          brows([[82, 66, 7, -6], [118, 66, 7, 6]]) +
          mouth(120, 107, 7.4) +
          '<g class="a-trunk" style="transform-origin:100px 100px">' +
            S('M89 96C89 108 90 120 91 132L109 132C110 120 111 108 111 96Z', tr, trS, { dx: -5, dy: 0,
              extra: line('M91 118L109 118', 'rgba(70,90,150,.2)', 2.4) }) +
            '<circle cx="100" cy="130" r="9.4" fill="' + tr + '"/>' +
            '<g class="a-trunk2" style="transform-origin:100px 130px">' +
              S('M91 126C91 140 92 152 94 158C96 164 104 164 106 158C108 152 109 140 109 126Z', tr, trS, { dx: -5, dy: 0,
                extra: line('M92 138L108 138M93 148L107 148', 'rgba(70,90,150,.2)', 2.4) }) +
              '<ellipse cx="97" cy="160" rx="2" ry="1.4" fill="#5B6A99"/><ellipse cx="103" cy="160" rx="2" ry="1.4" fill="#5B6A99"/>' +
            '</g>' +
          '</g>' +
          spray +
        '</g>' +
      '</g>';
  };

  // Whale — glides through the waves, puffing a spout now and then.
  DRAW.whale = function () {
    var c = '#3F7FE3', cs = '#2D64C4', belly = '#FFF1DC', spout = '#BDE8FB', spoutS = '#93D4F4';
    var bodyD = 'M156 116C156 85 131 66 99 66C66 66 44 88 36 112C33 121 31 128 29 134C43 143 60 151 80 155C111 159 140 154 150 141C154 134 156 126 156 116Z';
    var bellyX = '<path d="M30 138C62 134 116 138 160 118L164 172L26 172Z" fill="' + belly + '"/>' +
      line('M70 146C90 150 112 149 130 143', 'rgba(170,120,80,.18)', 2.5) + line('M84 153C100 155 116 154 128 150', 'rgba(170,120,80,.18)', 2.5);
    var wave = 'M14 168C24 155 42 155 55 166C68 177 84 177 98 166C112 155 127 155 141 166C154 177 170 177 182 166C188 161 191 165 190 172L190 184Q190 192 182 192L22 192Q14 192 14 184Z';
    var waveB = 'M22 163C22 156 30 151 40 153C50 155 56 162 66 162C78 162 86 151 100 151C114 151 120 162 134 162C146 162 152 152 164 152C172 152 179 157 179 165L179 180L22 180Z';
    return '<g class="a-wave-back">' + S(waveB, '#A9DFF7', '#8FD0F1', { dx: 0, dy: -4 }) + '</g>' +
      '<g class="a-bob" style="transform-origin:96px 170px"><g transform="translate(4 12)">' +
      '<g class="a-head" style="transform-origin:96px 150px">' +
        '<g class="a-spout" style="transform-origin:104px 70px">' +
          S('M104 72C98 60 98 48 104 34C110 48 110 60 104 72Z', spout, spoutS, { dx: -2, dy: 0 }) +
          S('M99 60C89 54 81 44 81 34C91 38 98 48 99 60Z', spout, spoutS, { dx: -2, dy: 0 }) +
          S('M109 60C119 54 127 44 127 34C117 38 110 48 109 60Z', spout, spoutS, { dx: -2, dy: 0 }) +
          '<circle cx="85" cy="24" r="4" fill="' + spout + '"/><circle cx="123" cy="24" r="4" fill="' + spout + '"/><circle cx="104" cy="22" r="3.5" fill="' + spout + '"/>' +
        '</g>' +
        S('M40 130C31 112 15 104 5 108C11 116 17 124 25 132C13 132 5 138 3 146C15 147 28 143 41 138Z', c, cs, { cls: 'a-tail', org: '38px 134px', dx: -3, dy: -4 }) +
        S(bodyD, c, cs, { dx: -8, dy: -7, extra: bellyX }) +
        S('M100 139C103 151 97 162 84 167C86 157 88 147 92 138Z', cs, '#2455AE', { cls: 'a-fin', org: '96px 140px', dx: -2, dy: -3 }) +
        eyes([[118, 100, 5.8, 8.6], [141, 98, 5.6, 8.4]]) +
        brows([[117, 85, 6.6, -6], [141, 83, 6.4, 7]]) +
        mouth(132, 112, 9) +
      '</g></g></g>' +
      '<g class="a-wave">' + S(wave, '#5FC3EE', '#45AEE0', { dx: 0, dy: -5,
        extra: '<path d="M32 166C38 162 44 162 48 165" fill="none" stroke="#E9F8FF" stroke-width="4" stroke-linecap="round"/>' +
               '<path d="M118 166C124 162 130 162 134 165" fill="none" stroke="#E9F8FF" stroke-width="4" stroke-linecap="round"/>' }) + '</g>';
  };

  // Cow — grazing: lowers her head to a grass tuft, chews, looks up.
  DRAW.cow = function () {
    var w = '#FFF6EA', ws = '#EAD6C0', far = '#F0E2D0', farS = '#DCC7AE', patch = '#5A3426', pink = '#F5A3A0', pinkS = '#E08784',
      horn = '#FFDFA0', hornS = '#E9BE6E', hoof = '#4A2A22';
    var grass = '<g class="a-grass" style="transform-origin:170px 189px">' +
      S('M152 189C150 176 146 166 140 160C150 162 158 172 160 189Z', MINT, MINT_S, { dx: -2, dy: 0 }) +
      S('M160 189C160 172 162 158 168 148C172 160 172 174 170 189Z', MINT, MINT_S, { dx: -2, dy: 0 }) +
      S('M168 189C170 176 176 164 186 158C184 170 180 180 178 189Z', MINT, MINT_S, { dx: -2, dy: 0 }) +
      S('M174 189C178 180 186 174 194 172C190 180 186 186 184 189Z', MINT_S, MINT_D, { dx: -2, dy: 0 }) +
    '</g>';
    var earL = 'M136 76C126 66 112 64 104 70C110 80 124 84 136 82Z';
    var earR = 'M168 74C178 64 192 62 200 68C194 78 180 82 168 80Z';
    return grass + shadow(90, 58) +
      '<g class="a-bob" style="transform-origin:96px 189px"><g class="a-lean" style="transform-origin:40px 189px">' +
        '<g class="a-tail" style="transform-origin:40px 116px">' + line('M42 116C30 122 26 136 28 150', ws, 4.5) +
          S('M28 146C22 150 22 160 28 164C34 160 34 150 28 146Z', patch, null) + '</g>' +
        leg(60, 140, 16, far, farS, hoof, { cls: 'a-leg a-leg-b2', org: '60px 142px' }) +
        leg(118, 140, 16, far, farS, hoof, { cls: 'a-leg a-leg-f2', org: '118px 142px' }) +
        S(E(86, 126, 52, 33), w, ws, { dx: -8, dy: -8,
          extra: '<path d="' + E(66, 114, 17, 13) + '" fill="' + patch + '"/><path d="M104 96C118 94 132 104 130 118C120 124 106 118 102 108Z" fill="' + patch + '"/>' }) +
        leg(48, 142, 18, w, ws, hoof, { cls: 'a-leg a-leg-b1', org: '48px 144px' }) +
        leg(104, 142, 18, w, ws, hoof, { cls: 'a-leg a-leg-f1', org: '104px 144px' }) +
        '<g class="a-head" style="transform-origin:122px 118px">' +
          S('M106 106C116 94 130 88 142 90L152 118C142 128 124 134 110 134Z', w, ws, { dx: -5, dy: -4 }) +
          S('M140 64C134 58 132 48 136 42C142 48 146 54 148 60Z', horn, hornS, { dx: -2, dy: -2 }) +
          S('M162 60C166 52 172 48 178 48C176 56 172 62 166 66Z', horn, hornS, { dx: -2, dy: -2 }) +
          '<g class="a-ear a-ear-l" style="transform-origin:134px 78px">' + S(earL, w, ws, { dx: -3, dy: -3, extra: '<path d="M130 76C122 70 114 70 110 72C114 78 122 80 130 79Z" fill="' + pink + '"/>' }) + '</g>' +
          '<g class="a-ear a-ear-r" style="transform-origin:170px 76px">' + S(earR, w, ws, { dx: -3, dy: -3, extra: '<path d="M174 74C182 68 190 68 194 70C190 76 182 78 174 77Z" fill="' + pink + '"/>' }) + '</g>' +
          S(E(153, 84, 28, 26), w, ws, { dx: -7, dy: -6,
            extra: '<path d="M124 70C128 56 142 52 150 58C150 70 140 78 128 80Z" fill="' + patch + '"/>' }) +
          eyes([[144, 80, 5.2, 7.8], [165, 80, 5, 7.6]]) +
          brows([[143, 66, 6, -6], [165, 66, 5.8, 6]], 4) +
          S(E(156, 104, 21, 14), pink, pinkS, { dx: -4, dy: -4 }) +
          '<ellipse cx="148" cy="99" rx="2.6" ry="3.2" fill="#C2625F"/><ellipse cx="164" cy="99" rx="2.6" ry="3.2" fill="#C2625F"/>' +
          '<g class="a-chew" style="transform-origin:156px 108px">' + mouth(156, 105.5, 6.6) + '</g>' +
        '</g>' +
      '</g></g>';
  };

  function svg(name, opts) {
    opts = opts || {};
    var a = null;
    for (var i = 0; i < LIST.length; i++) if (LIST[i].key === name) a = LIST[i];
    if (!a || !DRAW[name]) return '';
    var state = opts.state === 'happy' || opts.state === 'look' ? opts.state : 'idle';
    return '<svg class="animal' + (opts.cls ? ' ' + opts.cls : '') + '" data-animal="' + name + '" data-state="' + state +
      '" viewBox="0 0 200 200" role="img" aria-label="' + a.name + '" xmlns="http://www.w3.org/2000/svg">' +
      DRAW[name]() + '</svg>';
  }

  window.QQ_ANIMALS = { LIST: LIST, svg: svg };
})();
