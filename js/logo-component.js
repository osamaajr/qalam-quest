/* Qalam logo component (Option 02 — the letter-tile wordmark).
 *
 *   QQLogo.svg({ animate, className })  → SVG markup string
 *   QQLogo.mount(el, { animate })       → renders into an element
 *   QQLogo.icon({ className })          → the single blue "q" tile (app icon)
 *
 * Shapes come from js/logo.js (traced by tools/trace_logo_tiles.py; static files in assets/logo/).
 * With `animate`, each tile falls directly into its final overlapping position from left to right.
 * Covered parts of the traced tiles appear only after the next tile lands. The SVG reserves its full
 * size, so the animation causes no layout shift; reduced motion shows the finished logo immediately.
 */
(function () {
  'use strict';
  const L = () => window.QQ_LOGO;
  const STAGGER = 105, DURATION = 480;
  const APPROACH = ['-12px', '-6px', '0px', '6px', '12px'];

  function tilePaths(t, animated) {
    if (!animated) return `<path d="${t.tile}" fill="${t.fill}"/>`;
    const pieces = t.tile.match(/M[^M]*/g) || [t.tile];
    const main = pieces.reduce((a, b) => b.length > a.length ? b : a);
    const covered = pieces.filter((p) => p !== main).join('');
    const join = (Math.min(t.i + 1, 4) * STAGGER) + DURATION;
    return `<path d="${main}" fill="${t.fill}"/>`
      + (covered ? `<path class="ql-underlap" style="--join:${join}ms" d="${covered}" fill="${t.fill}"/>` : '');
  }

  function svg(opts) {
    const o = opts || {}; const d = L(); if (!d) return '';
    const [, , w, h] = d.viewBox.split(' ').map(Number);
    const animated = !!o.animate;
    const g = (t) => `<g class="ql-tile" data-tile="${t.i}" style="--i:${t.i};--approach:${APPROACH[t.i]}">`
      + tilePaths(t, animated) + `<path d="${t.letter}" fill="#FFFFFF" fill-rule="evenodd"/></g>`;
    return `<svg class="ql-logo ${animated ? 'ql-animate' : ''} ${o.className || ''}" viewBox="0 0 ${w} ${h}" style="aspect-ratio:${w}/${h}" role="img" aria-label="Qalam">`
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
.ql-animate .ql-tile { animation: ql-fall ${DURATION}ms cubic-bezier(.22, .8, .28, 1) calc(var(--i) * ${STAGGER}ms) both; }
.ql-animate .ql-underlap { animation: ql-join 1ms steps(1, end) var(--join) both; }
@keyframes ql-fall {
  0% { opacity: 0; transform: translate(var(--approach), -42px) rotate(-4deg) scale(.92); }
  55% { opacity: 1; transform: translateY(5px) rotate(1.5deg) scale(1.025); }
  78% { transform: translateY(-2px) rotate(-.5deg) scale(.995); }
  100% { opacity: 1; transform: none; }
}
@keyframes ql-join { from { opacity: 0; } to { opacity: 1; } }
.ql-icon { display: block; width: 100%; height: auto; }
@media (prefers-reduced-motion: reduce) {
  .ql-animate .ql-tile, .ql-animate .ql-underlap { animation: none; }
}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.QQLogo = { svg, icon, mount, STAGGER, DURATION };
})();
