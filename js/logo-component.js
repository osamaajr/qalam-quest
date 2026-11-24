/* Qalam logo component (Option 02 — the letter-tile wordmark).
 *
 *   QQLogo.svg({ animate, className })  → SVG markup string
 *   QQLogo.mount(el, { animate })       → renders into an element
 *   QQLogo.icon({ className })          → the single blue "q" tile (app icon)
 *
 * Shapes come from js/logo.js (traced by tools/trace_logo_tiles.py; static files in assets/logo/).
 * Each tile and its letter form one <g>, so they move together. With `animate`, the tiles enter left to
 * right following the storyboard (tools/ref/logo-storyboard.webp): ready → first tile → build →
 * overshoot → settle → hold. Each tile rises a short way, pops slightly past its pose and settles;
 * starts are 90 ms apart and the whole entrance takes ~820 ms. The animation runs once per mount (it is
 * plain CSS on freshly inserted markup). The SVG always reserves its full size (viewBox + aspect-ratio),
 * so there is no layout shift; with prefers-reduced-motion the finished logo shows immediately.
 */
(function () {
  'use strict';
  const L = () => window.QQ_LOGO;
  const STAGGER = 90, DURATION = 460;                       // 4 × 90 + 460 = 820 ms

  function svg(opts) {
    const o = opts || {}; const d = L(); if (!d) return '';
    const [, , w, h] = d.viewBox.split(' ').map(Number);
    const g = (t) => `<g class="ql-tile" data-tile="${t.i}" style="--i:${t.i};transform-origin:${t.cx}px ${t.cy + 40}px">`
      + `<path d="${t.tile}" fill="${t.fill}"/><path d="${t.letter}" fill="#FFFFFF" fill-rule="evenodd"/></g>`;
    return `<svg class="ql-logo ${o.animate ? 'ql-animate' : ''} ${o.className || ''}" viewBox="${d.viewBox}" style="aspect-ratio:${w}/${h}" role="img" aria-label="Qalam">`
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
.ql-logo .ql-tile { transform-box: view-box; }
.ql-animate .ql-tile { animation: ql-pop ${DURATION}ms cubic-bezier(.3, .7, .4, 1) calc(var(--i) * ${STAGGER}ms) both; }
@keyframes ql-pop {
  0%   { opacity: 0; transform: translateY(26px) scale(.82); }
  35%  { opacity: 1; }
  62%  { transform: translateY(-7px) scale(1.07) rotate(-1.5deg); }
  82%  { transform: translateY(1.5px) scale(.985) rotate(.4deg); }
  100% { opacity: 1; transform: none; }
}
.ql-icon { display: block; width: 100%; height: auto; }
@media (prefers-reduced-motion: reduce) { .ql-animate .ql-tile { animation: none; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.QQLogo = { svg, icon, mount, STAGGER, DURATION };
})();
