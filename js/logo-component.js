/* Qalam logo component (Option 02 — the letter-tile wordmark).
 *
 *   QQLogo.svg({ animate, className })  → SVG markup string
 *   QQLogo.mount(el, { animate })       → renders into an element
 *   QQLogo.icon({ className })          → the single blue "q" tile (app icon)
 *
 * Shapes come from js/logo.js (traced by tools/trace_logo_tiles.py; static files in assets/logo/).
 * Each tile and its letter form one <g>, so they move together. With `animate`, the tiles enter left to
 * right following the storyboard (tools/ref/logo-storyboard.webp): ready → first tile → build →
 * overshoot → settle → hold. Each tile lands around its own base, with a small, controlled rebound;
 * starts are 105 ms apart and the whole entrance takes ~900 ms. The animation runs once per mount (it is
 * plain CSS on freshly inserted markup). The SVG always reserves its full size (viewBox + aspect-ratio),
 * so there is no layout shift; with prefers-reduced-motion the finished logo shows immediately.
 */
(function () {
  'use strict';
  const L = () => window.QQ_LOGO;
  const STAGGER = 105, DURATION = 480;                      // 4 × 105 + 480 = 900 ms
  // The traced artwork overlaps its neighbours. Move whole tiles, including
  // their letters, so the animated and settled cards have visible gaps.
  const TILE_SHIFT = [0, 24, 42, 64, 79];
  const SPACED_WIDTH = 770;

  function visibleTilePath(path) {
    // The trace includes narrow hidden fragments where cards used to overlap.
    // The largest subpath is the complete visible card.
    return (path.match(/M[^M]*/g) || [path]).reduce((a, b) => b.length > a.length ? b : a);
  }

  function svg(opts) {
    const o = opts || {}; const d = L(); if (!d) return '';
    const [, , , h] = d.viewBox.split(' ').map(Number);
    const g = (t) => `<g transform="translate(${TILE_SHIFT[t.i]} 0)"><g class="ql-tile" data-tile="${t.i}" style="--i:${t.i}">`
      + `<path d="${visibleTilePath(t.tile)}" fill="${t.fill}"/><path d="${t.letter}" fill="#FFFFFF" fill-rule="evenodd"/></g></g>`;
    return `<svg class="ql-logo ${o.animate ? 'ql-animate' : ''} ${o.className || ''}" viewBox="0 0 ${SPACED_WIDTH} ${h}" style="aspect-ratio:${SPACED_WIDTH}/${h}" role="img" aria-label="Qalam">`
      + d.order.map((i) => g(d.tiles[i])).join('') + '</svg>';
  }
  function icon(opts) {
    const o = opts || {}; const ic = L() && L().icon; if (!ic) return '';
    return `<svg class="ql-icon ${o.className || ''}" viewBox="0 0 ${ic.w} ${ic.h}" role="img" aria-label="Qalam"><path d="${ic.tile}" fill="${ic.fill}"/><path d="${ic.letter}" fill="#FFFFFF" fill-rule="evenodd"/></svg>`;
  }
  function mount(el, opts) { if (el) el.innerHTML = svg(opts); return el && el.firstElementChild; }

  // styles live with the component
  const css = `
.ql-logo { display: block; width: 100%; height: auto; overflow: visible; }
.ql-logo .ql-tile { transform-box: fill-box; transform-origin: center bottom; }
.ql-animate .ql-tile { animation: ql-land ${DURATION}ms cubic-bezier(.22, .8, .28, 1) calc(var(--i) * ${STAGGER}ms) both; }
@keyframes ql-land {
  0%   { opacity: 0; transform: translateY(24px) rotate(-5deg) scale(.94); }
  25%  { opacity: 1; }
  58%  { transform: translateY(-5px) rotate(2deg) scale(1.02); }
  78%  { transform: translateY(1px) rotate(-.6deg) scale(.995); }
  100% { opacity: 1; transform: none; }
}
.ql-icon { display: block; width: 100%; height: auto; }
@media (prefers-reduced-motion: reduce) { .ql-animate .ql-tile { animation: none; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.QQLogo = { svg, icon, mount, STAGGER, DURATION };
})();
