/* Arabic text fixes, applied to everything the app puts on screen (including text added later).
 *
 * 1. Joined letters stay joined. Labels and buttons use letter-spacing, which pulls connected Arabic
 *    letters apart (ا لحُ رُو ف). Any run of Arabic inside a letter-spaced element is wrapped in
 *    <span class="arj"> (letter-spacing: 0) so the Latin text around it keeps its spacing.
 * 2. Tanwīn ḍamm (ٌ) is drawn in Amiri, which has the proper muṣḥaf form (class .tw).
 * Both classes are styled in css/style.css.
 */
(function () {
  'use strict';
  const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const RUN = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+(?:[\s‌‍]+[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+)*/g;
  const TW = /ٌ/;
  const spaced = (el) => { const ls = getComputedStyle(el).letterSpacing; return ls !== 'normal' && parseFloat(ls) !== 0; };

  function fixText(n) {
    const el = n.parentElement;
    if (!el || el.closest('svg, script, style, textarea, input')) return;
    const t = n.nodeValue;
    if (TW.test(t)) el.classList.add('tw');
    if (el.classList.contains('arj') || !spaced(el)) return;
    if (!t.replace(RUN, '').trim()) { el.classList.add('arj'); return; }     // nothing but Arabic: fix the element
    const frag = document.createDocumentFragment(); let last = 0;              // mixed: wrap each Arabic run
    t.replace(RUN, (m, i) => {
      if (i > last) frag.appendChild(document.createTextNode(t.slice(last, i)));
      const s = document.createElement('span'); s.className = 'arj'; s.textContent = m; frag.appendChild(s);
      last = i + m.length; return m;
    });
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    n.replaceWith(frag);
  }
  function scan(root) {
    if (root.nodeType === 3) { if (AR.test(root.nodeValue)) fixText(root); return; }
    if (root.nodeType !== 1) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => AR.test(n.nodeValue) ? 1 : 3 });
    const list = []; for (let n = w.nextNode(); n; n = w.nextNode()) list.push(n);
    list.forEach(fixText);
  }
  function start() {
    scan(document.body);
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(scan))).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
