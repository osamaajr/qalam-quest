/* Qur'anic animal friends: complete illustrated poses, not assembled SVG shapes.
 * The public svg() name is kept for existing game screens and the preview tool.
 */
(function () {
  'use strict';

  const LIST = [
    { key: 'hoopoe',   name: 'Hudhud the Hoopoe', ar: 'هُدْهُد', ref: '27:20', refLabel: 'An-Naml 27:20', fact: "Sulaymān's messenger bird, who flew back with news from Saba’." },
    { key: 'bee',      name: 'Nahla the Bee',     ar: 'نَحْلَة', ref: '16:68', refLabel: 'An-Nahl 16:68', fact: 'Allah inspired the bee to build homes and make healing honey.' },
    { key: 'ant',      name: 'Namla the Ant',     ar: 'نَمْلَة', ref: '27:18', refLabel: 'An-Naml 27:18', fact: "A little ant warned her friends to get out of Sulaymān's way." },
    { key: 'camel',    name: 'Jamal the Camel',   ar: 'جَمَل',   ref: '88:17', refLabel: 'Al-Ghāshiyah 88:17', fact: '“Do they not look at the camel — how it was created?”' },
    { key: 'elephant', name: 'Feel the Elephant', ar: 'فِيل',    ref: '105:1', refLabel: 'Al-Fīl 105:1', fact: 'Sūrat al-Fīl tells the story of the Year of the Elephant.' },
    { key: 'whale',    name: 'Hoot the Whale',    ar: 'حُوت',    ref: '37:142', refLabel: 'Aṣ-Ṣāffāt 37:142', fact: 'The whale that swallowed Prophet Yūnus — and safely let him go.' },
    { key: 'cow',      name: 'Baqara the Cow',    ar: 'بَقَرَة', ref: '2:67',  refLabel: 'Al-Baqarah 2:67', fact: 'Sūrat al-Baqarah, the longest sūrah, is named after a cow.' }
  ];
  const byKey = Object.fromEntries(LIST.map((a) => [a.key, a]));

  function svg(name, opts = {}) {
    const animal = byKey[name];
    if (!animal) return '';
    const state = ['happy', 'look'].includes(opts.state) ? opts.state : 'idle';
    const cls = opts.cls ? ' ' + opts.cls : '';
    return `<span class="animal${cls}" data-animal="${name}" data-state="${state}" role="img" aria-label="${animal.name}"><span class="animal-body" aria-hidden="true"><span class="animal-frame"></span></span></span>`;
  }

  window.QQ_ANIMALS = { LIST, svg };
})();
