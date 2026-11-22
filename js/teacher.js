/* Teacher guide: renders every unit, lesson and exercise straight from content.js */
(function () {
  'use strict';
  const C = window.QQ_CONTENT, M = window.QQ_MASCOT;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = (s) => esc(s).replace(/([؀-ۿ][؀-ۿً-ٰٟۖ-ۭ\s]*[؀-ۿً-ٰٟۖ-ۭ]|[؀-ۿ])/g, (m) => `<span class="${/[ٱ۟-ٰۭ]/.test(m) ? 'qr' : 'ar'}">${m}</span>`);
  const TYPE = { teach: 'Teach card', mcq: 'Choose', listen: 'Listen', match: 'Match pairs', sort: 'Sort', tap: 'Tap the word', build: 'Build' };
  function row(e) {
    let q = '', a = '';
    switch (e.type) {
      case 'teach': q = `<b>${rich(e.title)}</b> — ${rich(e.sub || '')}${e.big ? ' ' + rich(e.big) : ''}${e.bigQ ? ' ' + rich(e.bigQ) : ''}${e.bigRow ? ' ' + rich(e.bigRow.join(' ')) : ''}${e.ayah ? ' ' + rich(C.AYAH[e.ayah]) : ''}`; a = e.tip ? rich(e.tip) : ''; break;
      case 'mcq': case 'listen': q = rich(e.type === 'listen' ? e.fallback : e.prompt) + (e.big ? ' ' + rich(e.big) : ''); a = `<span class="ans">${rich(e.correct)}</span> <span class="muted">(also shown: ${rich(e.options.filter((o) => o !== e.correct).join(' · '))})</span>`; break;
      case 'match': q = rich(e.prompt); a = e.pairs.map((p) => `${rich(p[0])} = ${rich(p[1])}`).join(' · '); break;
      case 'sort': q = rich(e.prompt); a = e.buckets.map((b, i) => `<b>${rich(b.label)}:</b> ${rich(e.items.filter((x) => x.b === i).map((x) => x.t).join('  '))}`).join('<br>'); break;
      case 'tap': q = `${rich(e.prompt)}<br>${rich(C.AYAH[e.k])}`; a = `<span class="ans">${rich(e.byIndex ? e.answers.map((i) => e.words[i]).join(' / ') : e.answers.join(' / '))}</span><br>${rich(e.explain || '')}`; break;
      case 'build': q = rich(e.prompt); a = `<span class="ans">${rich(e.target.join(''))}</span> ${e.gloss ? '— ' + rich(e.gloss) : ''}`; break;
    }
    const r = e.quranRef || e.ref || '';
    return `<tr><td><span class="type">${TYPE[e.type]}</span></td><td>${q}</td><td>${a}${r ? `<br><small class="muted">📖 ${esc(r)}</small>` : ''}</td></tr>`;
  }
  let html = `<header>${M.kid('huda', 'wave')}${M.kid('zaid', 'talk')}<div><h1>Qalam · Teacher Guide</h1><p class="muted" style="margin:4px 0 0">Every lesson, answer and Qur’an reference in the game. Built for Didsbury Mosque.</p></div></header>
  <div class="actions noprint"><a class="btn" href="index.html">Open the game</a><button class="btn btn-blue" onclick="window.print()">Print this guide</button></div>
  <div class="panel"><h2>How to use it in class</h2><ul>
    <li><b>Class mode:</b> in the game, tap <b>Me → Teacher &amp; parent corner → Class mode</b>. Mistakes then never stop a lesson (unlimited hearts).</li>
    <li><b>Preview any lesson:</b> switch on <b>Unlock every lesson</b> in the same place.</li>
    <li><b>Homework:</b> share the link. Each lesson takes about 3–5 minutes. Progress is saved on that device only — no accounts, no personal data sent anywhere.</li>
    <li><b>Read aloud:</b> letters, syllables and words use recorded clips of a natural-sounding neural Arabic voice (Microsoft “Hamed”). It is clear for letter names and syllables but is not a Qur’an reciter — please model recitation yourself.</li>
    <li><b>Mixed levels:</b> children who already read can take a short placement test (“Jump here?” on any unit) to skip ahead.</li>
    <li><b>Order:</b> follows the Noorani Qā‘ida path — letters → ḥarakāt → tanwīn → madd → sukūn → shadda → then sun/moon letters, noon rules and first grammar.</li>
  </ul>
  <div class="note"><b>Please check:</b> all tajwīd follows Ḥafṣ ‘an ‘Āṣim. Qur’an text is the Uthmani script from Tanzil (via api.alquran.cloud), checked automatically by <code>tools/verify.js</code>. Simple non-Qur’an practice words (e.g. كَتَبَ, مُعَلِّمَة) are marked without a 📖 reference. Exercises are shuffled each time; the lists below show one sample run.</div></div>`;
  C.UNITS.forEach((u, ui) => {
    html += `<div class="panel c-${u.color}"><div class="unit-head"><h2>Unit ${ui + 1}: ${esc(u.title)} <span class="ar">${esc(u.ar)}</span></h2><p class="muted" style="margin:0">${esc(u.blurb)}</p></div>
      <h3>Key teaching points</h3><ul>${u.guide.map((g) => `<li>${rich(g)}</li>`).join('')}</ul>`;
    u.lessons.forEach((l, li) => {
      const steps = l.steps();
      html += `<h3>Lesson ${li + 1}: ${esc(l.title)} ${l.review ? '🏆 (review)' : ''} <span class="muted" style="font-weight:700;font-size:14px">· ${steps.length} steps</span></h3>
      <table><thead><tr><th style="width:110px">Type</th><th>Question / content</th><th>Answer</th></tr></thead><tbody>${steps.map(row).join('')}</tbody></table>`;
    });
    html += '</div>';
  });
  html += `<div class="panel"><h2>Qur’an verses used</h2><p class="muted">Exact Uthmani text (Ḥafṣ). Waqf marks kept as in the muṣḥaf.</p><table><tbody>${Object.keys(C.AYAH).map((k) => `<tr><td style="width:170px"><b>${esc(C.ref(k))}</b></td><td class="qr" style="text-align:right">${esc(C.AYAH[k])}</td></tr>`).join('')}</tbody></table></div>`;
  document.getElementById('tg').innerHTML = html;
})();
