/* Qalam Quest — curriculum data.
 * Every Qur'an string lives in AYAH and is checked against tools/quran-source
 * (Uthmani text, Hafs ‘an ‘Āṣim, from api.alquran.cloud) by tools/verify.js.
 */
(function () {
  'use strict';

  // ---------- Verified Qur'an text (bismillah prefix removed from v1 of each surah) ----------
  const AYAH = {
    '1:1': 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    '1:2': 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
    '1:4': 'مَٰلِكِ يَوْمِ ٱلدِّينِ',
    '1:5': 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    '1:6': 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    '1:7': 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
    '2:2': 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ',
    '2:5': 'أُو۟لَٰٓئِكَ عَلَىٰ هُدًۭى مِّن رَّبِّهِمْ ۖ وَأُو۟لَٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ',
    '96:1': 'ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ',
    '98:4': 'وَمَا تَفَرَّقَ ٱلَّذِينَ أُوتُوا۟ ٱلْكِتَٰبَ إِلَّا مِنۢ بَعْدِ مَا جَآءَتْهُمُ ٱلْبَيِّنَةُ',
    '104:4': 'كَلَّا ۖ لَيُنۢبَذَنَّ فِى ٱلْحُطَمَةِ',
    '106:2': 'إِۦلَٰفِهِمْ رِحْلَةَ ٱلشِّتَآءِ وَٱلصَّيْفِ',
    '106:3': 'فَلْيَعْبُدُوا۟ رَبَّ هَٰذَا ٱلْبَيْتِ',
    '106:4': 'ٱلَّذِىٓ أَطْعَمَهُم مِّن جُوعٍۢ وَءَامَنَهُم مِّنْ خَوْفٍۭ',
    '108:1': 'إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ',
    '108:2': 'فَصَلِّ لِرَبِّكَ وَٱنْحَرْ',
    '108:3': 'إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ',
    '111:2': 'مَآ أَغْنَىٰ عَنْهُ مَالُهُۥ وَمَا كَسَبَ',
    '111:4': 'وَٱمْرَأَتُهُۥ حَمَّالَةَ ٱلْحَطَبِ',
    '111:5': 'فِى جِيدِهَا حَبْلٌۭ مِّن مَّسَدٍۭ',
    '112:1': 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    '112:2': 'ٱللَّهُ ٱلصَّمَدُ',
    '112:3': 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
    '112:4': 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
    '113:1': 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ',
    '113:2': 'مِن شَرِّ مَا خَلَقَ',
    '113:3': 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
    '113:4': 'وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ',
    '113:5': 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    '114:1': 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ',
    '114:4': 'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ',
    '114:6': 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
  };
  const SURAH = { 1: 'Al-Fātiḥah', 2: 'Al-Baqarah', 96: 'Al-‘Alaq', 98: 'Al-Bayyinah', 104: 'Al-Humazah', 106: 'Quraysh', 108: 'Al-Kawthar', 111: 'Al-Masad', 112: 'Al-Ikhlāṣ', 113: 'Al-Falaq', 114: 'An-Nās' };
  const ref = (k) => `${SURAH[k.split(':')[0]]} ${k}`;
  // words of an ayah, dropping waqf signs (ۛ ۖ) which aren't words
  const words = (k) => AYAH[k].split(' ').filter((w) => !/^[ۖ-ۜ]$/.test(w));
  // A Qur'an word: {t, k} where t must appear inside AYAH[k]
  const Q = (t, k, gloss) => ({ t, k, gloss, quran: true });

  // ---------- Letters ----------
  const L = {
    'ا': { n: 'Alif', ar: 'أَلِف', s: 'a long “aa” helper', c: '' },
    'ب': { n: 'Baa', ar: 'بَاء', s: '“b” as in ball', c: 'b' },
    'ت': { n: 'Taa', ar: 'تَاء', s: '“t” as in tap', c: 't' },
    'ث': { n: 'Thaa', ar: 'ثَاء', s: '“th” as in think', c: 'th' },
    'ج': { n: 'Jeem', ar: 'جِيم', s: '“j” as in jam', c: 'j' },
    'ح': { n: 'Ḥaa', ar: 'حَاء', s: 'a breathy “h” from the middle of the throat', c: 'ḥ' },
    'خ': { n: 'Khaa', ar: 'خَاء', s: '“kh” like a gentle snore', c: 'kh' },
    'د': { n: 'Daal', ar: 'دَال', s: '“d” as in dog', c: 'd' },
    'ذ': { n: 'Dhaal', ar: 'ذَال', s: '“th” as in this', c: 'dh' },
    'ر': { n: 'Raa', ar: 'رَاء', s: 'a rolled “r”', c: 'r' },
    'ز': { n: 'Zaay', ar: 'زَاي', s: '“z” as in zoo', c: 'z' },
    'س': { n: 'Seen', ar: 'سِين', s: '“s” as in sun', c: 's' },
    'ش': { n: 'Sheen', ar: 'شِين', s: '“sh” as in ship', c: 'sh' },
    'ص': { n: 'Ṣaad', ar: 'صَاد', s: 'a heavy, deep “s”', c: 'ṣ' },
    'ض': { n: 'Ḍaad', ar: 'ضَاد', s: 'a heavy, deep “d”', c: 'ḍ' },
    'ط': { n: 'Ṭaa', ar: 'طَاء', s: 'a heavy, deep “t”', c: 'ṭ' },
    'ظ': { n: 'Ẓaa', ar: 'ظَاء', s: 'a heavy “th” as in this', c: 'ẓ' },
    'ع': { n: '‘Ayn', ar: 'عَيْن', s: 'a squeezed sound from the middle of the throat', c: '‘' },
    'غ': { n: 'Ghayn', ar: 'غَيْن', s: '“gh” like gargling water', c: 'gh' },
    'ف': { n: 'Faa', ar: 'فَاء', s: '“f” as in fish', c: 'f' },
    'ق': { n: 'Qaaf', ar: 'قَاف', s: 'a deep “q” from the back of the tongue', c: 'q' },
    'ك': { n: 'Kaaf', ar: 'كَاف', s: '“k” as in kite', c: 'k' },
    'ل': { n: 'Laam', ar: 'لَام', s: '“l” as in lion', c: 'l' },
    'م': { n: 'Meem', ar: 'مِيم', s: '“m” as in moon', c: 'm' },
    'ن': { n: 'Noon', ar: 'نُون', s: '“n” as in nest', c: 'n' },
    'ه': { n: 'Haa', ar: 'هَاء', s: 'a soft “h” as in hat', c: 'h' },
    'و': { n: 'Waaw', ar: 'وَاو', s: '“w” as in water', c: 'w' },
    'ي': { n: 'Yaa', ar: 'يَاء', s: '“y” as in yes', c: 'y' },
  };
  const ALL_LETTERS = Object.keys(L);
  const SUN = ['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن'];
  const MOON = ['ء', 'ب', 'ج', 'ح', 'خ', 'ع', 'غ', 'ف', 'ق', 'ك', 'م', 'و', 'ي', 'ه'];

  // ---------- helpers ----------
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const distract = (pool, correct, n) => sample(pool.filter((x) => x !== correct), n);

  const T = (o) => ({ type: 'teach', ...o });
  const MCQ = (prompt, correct, wrong, o = {}) => ({ type: 'mcq', prompt, correct, options: [correct, ...wrong], ...o });
  const LISTEN = (say, correct, wrong, fallback, o = {}) => ({ type: 'listen', say, correct, options: [correct, ...wrong], prompt: 'Tap what you hear', fallback, arOptions: true, ...o });
  const MATCH = (pairs, o = {}) => ({ type: 'match', prompt: 'Tap the matching pairs', pairs, ...o });
  const SORT = (prompt, buckets, items, o = {}) => ({ type: 'sort', prompt, buckets, items: shuffle(items), ...o });
  const TAP = (prompt, k, answers, explain, o = {}) => ({ type: 'tap', prompt, k, ref: ref(k), words: words(k), answers, explain, ...o });
  const BUILD = (prompt, target, extra, o = {}) => ({ type: 'build', prompt, target, tiles: shuffle([...target, ...extra]), ...o });

  // ---------- Unit 1: letters ----------
  function teachLetter(ch, tip) {
    return T({ kicker: 'NEW LETTER', big: ch, title: L[ch].n, sub: `Sounds like ${L[ch].s}`, say: L[ch].ar, tip });
  }
  function letterLesson(group, tips, extras) {
    return () => {
      const s = [];
      group.forEach((ch, i) => {
        s.push(teachLetter(ch, tips[ch]));
        if (i >= 1) {
          const known = group.slice(0, i + 1);
          s.push(MCQ(`Which one is ${L[ch].n}?`, ch, distract(known, ch, Math.min(3, known.length - 1)), { arOptions: true }));
        }
      });
      const g = shuffle(group);
      s.push(MCQ('What is this letter called?', L[g[0]].n, distract(group, g[0], group.length - 1).map((c) => L[c].n), { big: g[0] }));
      s.push(MATCH(group.map((c) => [c, L[c].n])));
      extras().forEach((e) => s.push(e));
      s.push(LISTEN(L[g[1]].ar, g[1], distract(group, g[1], Math.min(3, group.length - 1)), `Which one is ${L[g[1]].n}?`));
      s.push(MCQ('What is this letter called?', L[g[2] || g[0]].n, distract(group, g[2] || g[0], group.length - 1).map((c) => L[c].n), { big: g[2] || g[0] }));
      return s;
    };
  }

  const unit1 = {
    id: 'u1', title: 'Meet the Letters', ar: 'الحُرُوف', color: 'green',
    blurb: 'All 28 letters, learned in families that share a shape.',
    guide: [
      'Arabic is read from RIGHT to LEFT.',
      'Many letters are “families”: same shape, different dots. ب ت ث are all boats!',
      'Dots matter: one dot can change a letter completely.',
      'Six letters never join to the letter after them: ا د ذ ر ز و.',
    ],
    lessons: [
      { id: 'u1l1', title: 'The boat letters', glyphs: 'ا ب ت ث', steps: letterLesson(['ا', 'ب', 'ت', 'ث'], {
        'ا': 'Alif is a tall, straight line — like a stick standing up.',
        'ب': 'A little boat with ONE dot underneath.',
        'ت': 'The same boat — but TWO dots on top!',
        'ث': 'Same boat again — THREE dots on top, like a tiny hat.',
      }, () => [
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['ب', 'ت', 'ث'], title: 'Same shape, different dots', sub: 'ب has 1 dot below · ت has 2 above · ث has 3 above', mood: 'happy' }),
        MCQ('How many dots does ث have?', '3', ['1', '2']),
        MCQ('Where is the dot on ب?', 'Underneath', ['On top', 'Inside'], { big: 'ب' }),
        MCQ('Which one does NOT belong in the boat family?', 'ا', ['ب', 'ت', 'ث'], { arOptions: true }),
      ]) },
      { id: 'u1l2', title: 'The cup letters', glyphs: 'ج ح خ', steps: letterLesson(['ج', 'ح', 'خ'], {
        'ج': 'A cup shape with a dot INSIDE it.',
        'ح': 'The same cup — with NO dot at all.',
        'خ': 'The same cup — with a dot on TOP.',
      }, () => [
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['ج', 'ح', 'خ'], title: 'The cup family', sub: 'Dot inside · no dot · dot on top', mood: 'happy' }),
        MCQ('Which cup letter has NO dot?', 'ح', ['ج', 'خ'], { arOptions: true }),
        MCQ('Which cup letter has a dot on top?', 'خ', ['ج', 'ح'], { arOptions: true }),
      ]) },
      { id: 'u1l3', title: 'Dot or no dot?', glyphs: 'د ذ ر ز', steps: letterLesson(['د', 'ذ', 'ر', 'ز'], {
        'د': 'Daal is a little bent elbow.',
        'ذ': 'Daal + one dot on top = Dhaal.',
        'ر': 'Raa is a little slide going down.',
        'ز': 'Raa + one dot on top = Zaay.',
      }, () => [
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['د', 'ذ', 'ر', 'ز'], title: 'Add a dot, get a new letter!', sub: 'د → ذ   and   ر → ز', mood: 'happy' }),
        MCQ('Add a dot on top of د and you get…', 'ذ', ['ز', 'ر'], { arOptions: true }),
        MCQ('Add a dot on top of ر and you get…', 'ز', ['ذ', 'د'], { arOptions: true }),
      ]) },
      { id: 'u1l4', title: 'Teeth and loops', glyphs: 'س ش ص ض', steps: letterLesson(['س', 'ش', 'ص', 'ض'], {
        'س': 'Seen has three little teeth.',
        'ش': 'Seen + three dots on top = Sheen.',
        'ص': 'Ṣaad has a big loop. It is a heavy letter.',
        'ض': 'Ṣaad + one dot on top = Ḍaad.',
      }, () => [
        MCQ('Which letter is Seen with three dots?', 'ش', ['ص', 'ض'], { arOptions: true }),
        MCQ('Which letter is Ṣaad with one dot?', 'ض', ['ش', 'س'], { arOptions: true }),
      ]) },
      { id: 'u1l5', title: 'Tall loops & throats', glyphs: 'ط ظ ع غ', steps: letterLesson(['ط', 'ظ', 'ع', 'غ'], {
        'ط': 'Ṭaa is a loop with a tall stick.',
        'ظ': 'Ṭaa + one dot = Ẓaa.',
        'ع': '‘Ayn looks like an open mouth. Its sound comes from your throat.',
        'غ': '‘Ayn + one dot on top = Ghayn.',
      }, () => [
        MCQ('Add a dot to ع and you get…', 'غ', ['ظ', 'ط'], { arOptions: true }),
        MCQ('Which letter is Ṭaa with a dot?', 'ظ', ['غ', 'ع'], { arOptions: true }),
      ]) },
      { id: 'u1l6', title: 'Hooks and heads', glyphs: 'ف ق ك ل', steps: letterLesson(['ف', 'ق', 'ك', 'ل'], {
        'ف': 'Faa has a little round head and ONE dot.',
        'ق': 'Qaaf has a deeper tail and TWO dots.',
        'ك': 'Kaaf has a little squiggle inside.',
        'ل': 'Laam is a tall hook — like a hockey stick.',
      }, () => [
        MCQ('ف has one dot. Which similar letter has two?', 'ق', ['ك', 'ل'], { arOptions: true }),
      ]) },
      { id: 'u1l7', title: 'The last five', glyphs: 'م ن ه و ي', steps: letterLesson(['م', 'ن', 'ه', 'و', 'ي'], {
        'م': 'Meem has a little round head and a tail.',
        'ن': 'Noon is a bowl with ONE dot above.',
        'ه': 'Haa is soft and round.',
        'و': 'Waaw looks like a curly comma.',
        'ي': 'Yaa has TWO dots underneath.',
      }, () => [
        MCQ('Which letter has TWO dots underneath?', 'ي', ['ن', 'ب'], { arOptions: true }),
        MCQ('Which letter is a bowl with one dot on top?', 'ن', ['ي', 'ت'], { arOptions: true }),
      ]) },
      { id: 'u1l8', title: 'Dot detective', glyphs: 'أ–ي', review: true, steps: () => {
        const s = [T({ kicker: 'LETTER REVIEW', bigRow: ['ا', 'د', 'ذ', 'ر', 'ز', 'و'], title: 'The “don’t hold hands” letters', sub: 'These 6 never join to the letter that comes after them.', mood: 'talk' })];
        s.push(MCQ('Which letter never joins to the next one?', 'د', ['ب', 'م', 'س'], { arOptions: true }));
        s.push(MCQ('Which letter has 3 dots?', pick(['ث', 'ش']), ['ب', 'ت', 'ن'], { arOptions: true }));
        sample(ALL_LETTERS, 3).forEach((c) => s.push(MCQ(`Which one is ${L[c].n}?`, c, distract(ALL_LETTERS, c, 3), { arOptions: true })));
        s.push(MATCH(sample(ALL_LETTERS, 5).map((c) => [c, L[c].n])));
        s.push(SORT('Sort by dots: is it ABOVE or BELOW?', [{ label: 'Dots above' }, { label: 'Dots below' }],
          [['ت', 0], ['ن', 0], ['ق', 0], ['ش', 0], ['ب', 1], ['ي', 1], ['ج', 1]].map(([t, b]) => ({ t, b }))));
        s.push(MCQ('Odd one out: which is NOT a cup letter?', 'د', ['ج', 'ح', 'خ'], { arOptions: true }));
        const c = pick(ALL_LETTERS);
        s.push(LISTEN(L[c].ar, c, distract(ALL_LETTERS, c, 3), `Which one is ${L[c].n}?`));
        s.push(MATCH(sample(ALL_LETTERS, 5).map((x) => [x, L[x].n])));
        return s;
      } },
    ],
  };

  // ---------- Unit 2: harakat ----------
  const EASY = ['ب', 'ت', 'ن', 'م', 'ل', 'ك', 'س', 'د', 'ر', 'ف', 'ج', 'ق'];
  const V = { a: 'َ', i: 'ِ', u: 'ُ' };
  const syl = (c, v) => c + V[v];
  const tr = (c, v) => L[c].c + v;
  function harakaLesson(v, known, info) {
    return () => {
      const s = [T(info.teach), T(info.teach2)];
      const ls = sample(EASY, 6);
      ls.slice(0, 3).forEach((c) => {
        const wrong = known.length > 1 ? known.filter((x) => x !== v).map((x) => tr(c, x)) : distract(EASY, c, 2).map((x) => tr(x, v));
        s.push(MCQ(`What does ${syl(c, v)} say?`, tr(c, v), wrong.slice(0, 2), { big: syl(c, v) }));
      });
      s.push(MCQ(`Which one says “${tr(ls[3], v)}”?`, syl(ls[3], v), known.length > 1 ? known.filter((x) => x !== v).map((x) => syl(ls[3], x)) : distract(EASY, ls[3], 2).map((x) => syl(x, v)), { arOptions: true }));
      s.push(MATCH(ls.slice(0, 5).map((c) => [syl(c, v), tr(c, v)])));
      s.push(LISTEN(syl(ls[4], v), syl(ls[4], v), known.length > 1 ? known.filter((x) => x !== v).map((x) => syl(ls[4], x)) : distract(EASY, ls[4], 2).map((x) => syl(x, v)), `Which one says “${tr(ls[4], v)}”?`));
      info.words.forEach((w) => s.push(BUILD(`Build the word “${w.say}”`, w.tiles, w.extra, { gloss: w.gloss })));
      s.push(MCQ(info.q.prompt, info.q.correct, info.q.wrong, info.q.o || {}));
      return s;
    };
  }
  const unit2 = {
    id: 'u2', title: 'Short Vowels', ar: 'الحَرَكَات', color: 'purple',
    blurb: 'Fatḥa, kasra and ḍamma — the little marks that make letters talk.',
    guide: [
      'Letters need a vowel mark to make a sound.',
      'Fatḥa ( ـَ ) is a line ABOVE — it says “a”.',
      'Kasra ( ـِ ) is a line BELOW — it says “i”.',
      'Ḍamma ( ـُ ) is a little curl ABOVE — it says “u”.',
    ],
    lessons: [
      { id: 'u2l1', title: 'Fatḥa says “a”', glyphs: 'بَ', steps: harakaLesson('a', ['a'], {
        teach: { kicker: 'NEW MARK', big: 'ـَ', title: 'Fatḥa', sub: 'A little line ON TOP of the letter. It says “a”.', tip: 'Your mouth opens wide for fatḥa — fatḥa means “opening”!', mood: 'talk' },
        teach2: { kicker: 'TRY IT', bigRow: ['بَ', 'تَ', 'مَ'], title: 'ba · ta · ma', sub: 'Letter + fatḥa = a sound!', say: 'بَ تَ مَ' },
        words: [{ say: 'ka-ta-ba', gloss: 'he wrote', tiles: ['كَ', 'تَ', 'بَ'], extra: ['مَ'] }, { say: 'kha-la-qa', gloss: 'he created — from Sūrat al-Falaq (113:2)', tiles: ['خَ', 'لَ', 'قَ'], extra: ['دَ'] }],
        q: { prompt: 'Where does fatḥa sit?', correct: 'On top of the letter', wrong: ['Under the letter', 'Next to the letter'] },
      }) },
      { id: 'u2l2', title: 'Kasra says “i”', glyphs: 'بِ', steps: harakaLesson('i', ['a', 'i'], {
        teach: { kicker: 'NEW MARK', big: 'ـِ', title: 'Kasra', sub: 'A little line UNDER the letter. It says “i”.', tip: 'Kasra pulls your lips into a smile: “bi”, “ti”, “mi”.', mood: 'talk' },
        teach2: { kicker: 'PATTERN SPOTTED!', bigRow: ['بَ', 'بِ'], title: 'ba · bi', sub: 'Same letter — the mark moved from top to bottom!', say: 'بَ بِ', mood: 'happy' },
        words: [{ say: 'sa-mi-‘a', gloss: 'he heard', tiles: ['سَ', 'مِ', 'عَ'], extra: ['بِ'] }, { say: '‘a-li-ma', gloss: 'he knew', tiles: ['عَ', 'لِ', 'مَ'], extra: ['نِ'] }],
        q: { prompt: 'Which mark sits UNDER the letter?', correct: 'Kasra', wrong: ['Fatḥa'] },
      }) },
      { id: 'u2l3', title: 'Ḍamma says “u”', glyphs: 'بُ', steps: harakaLesson('u', ['a', 'i', 'u'], {
        teach: { kicker: 'NEW MARK', big: 'ـُ', title: 'Ḍamma', sub: 'A tiny curl ON TOP — like a mini waaw. It says “u”.', tip: 'Round your lips like you’re blowing a bubble: “bu”!', mood: 'talk' },
        teach2: { kicker: 'PATTERN SPOTTED!', bigRow: ['بَ', 'بِ', 'بُ'], title: 'ba · bi · bu', sub: 'One letter, three sounds!', say: 'بَ بِ بُ', mood: 'happy' },
        words: [{ say: 'ka-ru-ma', gloss: 'he was generous', tiles: ['كَ', 'رُ', 'مَ'], extra: ['رِ'] }, { say: 'ḥa-su-na', gloss: 'it was good', tiles: ['حَ', 'سُ', 'نَ'], extra: ['سِ'] }],
        q: { prompt: 'What does ḍamma look like?', correct: 'A tiny curl on top', wrong: ['A line on top', 'A line underneath'] },
      }) },
      { id: 'u2l4', title: 'Vowel mix-up', glyphs: 'بَ بِ بُ', review: true, steps: () => {
        const s = [];
        const items = sample(EASY, 6).map((c, i) => { const v = ['a', 'i', 'u'][i % 3]; return { t: syl(c, v), b: i % 3 }; });
        s.push(SORT('Which sound does it make?', [{ label: '“a” fatḥa' }, { label: '“i” kasra' }, { label: '“u” ḍamma' }], items));
        sample(EASY, 3).forEach((c) => { const v = pick(['a', 'i', 'u']); s.push(MCQ(`What does ${syl(c, v)} say?`, tr(c, v), ['a', 'i', 'u'].filter((x) => x !== v).map((x) => tr(c, x)), { big: syl(c, v) })); });
        s.push(T({ kicker: 'QUR’AN WORD', bigQ: 'حَسَدَ', title: 'ḥa-sa-da', sub: 'Three letters, three fatḥas — you can read it!', tip: 'From Sūrat al-Falaq (113:5).', quranRef: ref('113:5') }));
        s.push(BUILD('Build the Qur’an word “wa-qa-ba”', ['وَ', 'قَ', 'بَ'], ['قُ', 'بِ'], { gloss: 'it settles (darkness) — Sūrat al-Falaq 113:3' }));
        s.push(MATCH(sample(EASY, 5).map((c, i) => { const v = ['a', 'i', 'u', 'a', 'i'][i]; return [syl(c, v), tr(c, v)]; })));
        const c = pick(EASY); const v = pick(['a', 'i', 'u']);
        s.push(LISTEN(syl(c, v), syl(c, v), ['a', 'i', 'u'].filter((x) => x !== v).map((x) => syl(c, x)), `Which one says “${tr(c, v)}”?`));
        s.push(BUILD('Build “dha-ha-ba”', ['ذَ', 'هَ', 'بَ'], ['ذِ', 'هُ'], { gloss: 'he went' }));
        return s;
      } },
    ],
  };

  // ---------- Unit 3: tanween & madd ----------
  const unit3 = {
    id: 'u3', title: 'Tanwīn & Long Vowels', ar: 'التَّنْوِين وَالمَدّ', color: 'blue',
    blurb: 'Double marks with a hidden “n”, and letters that stretch the sound.',
    guide: [
      'Tanwīn = a DOUBLE vowel mark at the end of a word. It adds a hidden “n”: ـً an · ـٍ in · ـٌ un.',
      'Tanwīn only comes at the END of a word (and only on nouns — Unit 7!).',
      'Madd letters stretch a sound for 2 counts: fatḥa + ا, kasra + ي, ḍamma + و.',
    ],
    lessons: [
      { id: 'u3l1', title: 'Tanwīn: the hidden n', glyphs: 'بٌ بٍ بً', steps: () => [
        T({ kicker: 'NEW MARKS', bigRow: ['بً', 'بٍ', 'بٌ'], title: 'ban · bin · bun', sub: 'Doubled marks add a hidden “n” sound.', tip: 'Fatḥatān (ـً) usually comes with an extra alif you don’t stretch: كِتَابًا', mood: 'talk', say: 'بً بٍ بٌ' }),
        MCQ('What does بٌ say?', 'bun', ['bu', 'bin']),
        MCQ('What does بٍ say?', 'bin', ['bi', 'ban']),
        MCQ('Which one says “dun”?', 'دٌ', ['دُ', 'دٍ'], { arOptions: true }),
        T({ kicker: 'QUR’AN WORD', bigQ: 'أَحَدٌ', title: 'a-ḥa-dun', sub: '“One” — the last word of 112:1. See the double ḍamma?', quranRef: ref('112:1') }),
        MCQ('How do you read أَحَدٌ?', 'a-ḥa-dun', ['a-ḥa-du', 'a-ḥa-din']),
        MATCH([['كٌ', 'kun'], ['مٍ', 'min'], ['نً', 'nan'], ['لٌ', 'lun'], ['رٍ', 'rin']]),
        MCQ('Where does tanwīn appear?', 'At the END of a word', ['At the start', 'In the middle']),
        LISTEN('بٌ', 'بٌ', ['بُ', 'بٍ'], 'Which one says “bun”?'),
        BUILD('Build “ki-taa-bun” (a book)', ['كِ', 'تَا', 'بٌ'], ['بُ'], { gloss: 'a book' }),
      ] },
      { id: 'u3l2', title: 'Stretchy letters', glyphs: 'بَا بِي بُو', steps: () => [
        T({ kicker: 'NEW SKILL', bigRow: ['بَا', 'بِي', 'بُو'], title: 'baa · bee · boo', sub: 'Madd letters stretch the sound for 2 counts.', tip: 'Fatḥa + ا · Kasra + ي · Ḍamma + و', say: 'بَا بِي بُو', mood: 'talk' }),
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['ـَا', 'ـِي', 'ـُو'], title: 'The vowel and its buddy', sub: 'Each short vowel has a matching long letter!', mood: 'happy' }),
        MCQ('Which one is LONG?', 'بَا', ['بَ'], { arOptions: true }),
        MCQ('What does نُو say?', 'noo', ['nu', 'nee']),
        MCQ('Which letter stretches a kasra?', 'ي', ['ا', 'و'], { arOptions: true }),
        MCQ('How long is a madd stretch?', '2 counts', ['1 count', '10 counts']),
        SORT('Short or long?', [{ label: 'Short' }, { label: 'Long (madd)' }], [['بَ', 0], ['مِ', 0], ['تُ', 0], ['مَا', 1], ['فِي', 1], ['نُو', 1]].map(([t, b]) => ({ t, b }))),
        LISTEN('فِي', 'فِي', ['فِ', 'فَا'], 'Which one says “fee”?'),
        BUILD('Build “noo-run” (light)', ['نُو', 'رٌ'], ['نَا', 'رُ'], { gloss: 'light' }),
        T({ kicker: 'QUR’AN WORD', bigQ: 'ٱلدِّينِ', title: 'ad-deen', sub: 'Kasra + ي = a stretchy “ee”. From Al-Fātiḥah 1:4.', quranRef: ref('1:4') }),
      ] },
      { id: 'u3l3', title: 'Long & short challenge', glyphs: 'مَا مِي', review: true, steps: () => [
        MATCH([['مَا', 'maa'], ['مِي', 'mee'], ['مُو', 'moo'], ['مَ', 'ma'], ['مٌ', 'mun']]),
        MCQ('What does قَالَ say?', 'qaa-la', ['qa-la', 'qu-la'], { big: 'قَالَ', gloss: 'he said' }),
        MCQ('Which one says “deen”?', 'دِينٌ', ['دَيْنٌ', 'دُونٌ'], { arOptions: true }),
        SORT('Tanwīn or madd?', [{ label: 'Tanwīn (hidden n)' }, { label: 'Madd (stretch)' }], [['بٌ', 0], ['كٍ', 0], ['رً', 0], ['بُو', 1], ['سَا', 1], ['فِي', 1]].map(([t, b]) => ({ t, b }))),
        BUILD('Build “baa-bun” (a door)', ['بَا', 'بٌ'], ['بُو', 'بِ'], { gloss: 'a door' }),
        LISTEN('سُو', 'سُو', ['سُ', 'سِي'], 'Which one says “soo”?'),
        MCQ('Kasra + ي makes…', 'a long “ee”', ['a hidden “n”', 'no sound']),
        BUILD('Build “qa-la-mun” (a pen)', ['قَ', 'لَ', 'مٌ'], ['مُو'], { gloss: 'a pen — qalam, like Qalam Quest!' }),
      ] },
    ],
  };

  // ---------- Unit 4: sukun & shadda ----------
  const unit4 = {
    id: 'u4', title: 'Sukūn & Shadda', ar: 'السُّكُون وَالشَّدَّة', color: 'orange',
    blurb: 'Stop signs and double letters.',
    guide: [
      'Sukūn ( ـْ ) is a little circle: STOP — the letter has no vowel. مِنْ = min.',
      'Shadda ( ـّ ) is a little “w”: say the letter TWICE — first stopped, then moving. رَبِّ = rab-bi.',
      'Shadda on ن or م = hum through your nose (ghunna). More in Unit 6!',
    ],
    lessons: [
      { id: 'u4l1', title: 'Sukūn: stop!', glyphs: 'مِنْ', steps: () => [
        T({ kicker: 'NEW MARK', big: 'ـْ', title: 'Sukūn', sub: 'A little circle on top means STOP — no vowel.', tip: 'It joins the sound before it: مِنْ = “min”.', mood: 'talk' }),
        T({ kicker: 'TRY IT', bigRow: ['مِنْ', 'قُلْ', 'لَمْ'], title: 'min · qul · lam', sub: 'All three are real Qur’an words!', say: 'مِنْ قُلْ لَمْ' }),
        MCQ('What does مِنْ say?', 'min', ['mi-na', 'mi']),
        MCQ('What does قُلْ say?', 'qul', ['qu-lu', 'qu']),
        MCQ('Which one says “lam”?', 'لَمْ', ['لَمَ', 'لِمْ'], { arOptions: true }),
        MATCH([['أَبْ', 'ab'], ['قُلْ', 'qul'], ['مِنْ', 'min'], ['عَنْ', '‘an'], ['هَلْ', 'hal']]),
        BUILD('Build “ya-lid” — from 112:3', ['يَ', 'لِ', 'دْ'], ['دُ'], { gloss: 'he begets — from Sūrat al-Ikhlāṣ' }),
        LISTEN('قُلْ', 'قُلْ', ['قُلُ', 'قَالَ'], 'Which one says “qul”?'),
        TAP('Tap the word that ENDS with a sukūn', '112:1', ['قُلْ'], 'قُلْ ends with a little circle — say “qul”.'),
      ] },
      { id: 'u4l2', title: 'Shadda: say it twice', glyphs: 'رَبِّ', steps: () => [
        T({ kicker: 'NEW MARK', big: 'ـّ', title: 'Shadda', sub: 'A little “w” on top: say the letter TWICE.', tip: 'بّ = بْ + بَ  →  “bba”', mood: 'talk' }),
        T({ kicker: 'QUR’AN WORD', bigQ: 'رَبِّ', title: 'rab-bi', sub: '“Lord of…” — from Al-Fātiḥah 1:2', quranRef: ref('1:2') }),
        MCQ('How do you read رَبِّ?', 'rab-bi', ['ra-bi', 'rab']),
        MCQ('What does shadda tell you?', 'Say the letter twice', ['Stop the sound', 'Stretch for 2 counts']),
        MCQ('Which one has a shadda?', 'إِنَّ', ['إِنْ', 'إِنَ'], { arOptions: true }),
        MATCH([['ـّ', 'shadda'], ['ـْ', 'sukūn'], ['ـَ', 'fatḥa'], ['ـِ', 'kasra'], ['ـُ', 'ḍamma']]),
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['رَبْ', '+', 'بِ', '=', 'رَبِّ'], title: 'Shadda = sukūn + vowel', sub: 'Two of the same letter squeezed into one!', mood: 'happy' }),
        TAP('Tap a word with a shadda', '108:2', ['فَصَلِّ', 'لِرَبِّكَ'], 'فَصَلِّ and لِرَبِّكَ both have a shadda.'),
        LISTEN('إِنَّ', 'إِنَّ', ['إِنْ', 'أَنَا'], 'Which one says “in-na”?'),
      ] },
      { id: 'u4l3', title: 'Read Al-Ikhlāṣ', glyphs: 'قُلْ', review: true, steps: () => [
        T({ kicker: 'QUR’AN TIME', ayah: '112:1', title: 'You can read this!', sub: 'qul hu-wal-laa-hu a-ḥad', tip: 'Spot the sukūn on قُلْ and the shadda in ٱللَّهُ.', quranRef: ref('112:1') }),
        TAP('Tap the word with a shadda', '112:1', ['ٱللَّهُ'], 'ٱللَّهُ has a shadda on the laam.'),
        TAP('Tap a word that ends with a sukūn', '112:3', ['لَمْ', 'يَلِدْ', 'وَلَمْ', 'يُولَدْ'], 'لَمْ يَلِدْ وَلَمْ يُولَدْ — every word stops with a sukūn!'),
        SORT('Sukūn or shadda?', [{ label: 'Sukūn ـْ' }, { label: 'Shadda ـّ' }], [['مِنْ', 0], ['قُلْ', 0], ['لَمْ', 0], ['رَبِّ', 1], ['إِنَّ', 1], ['ثُمَّ', 1]].map(([t, b]) => ({ t, b }))),
        MCQ('How do you read ثُمَّ?', 'thum-ma', ['thu-ma', 'thum']),
        BUILD('Build “qul” (say!)', ['قُ', 'لْ'], ['لُ', 'قَ']),
        TAP('Tap the word that means “One” (with tanwīn)', '112:1', ['أَحَدٌ'], 'أَحَدٌ — double ḍamma at the end: a-ḥa-dun.'),
      ] },
    ],
  };

  // ---------- Unit 5: sun & moon letters ----------
  const SUN_WORDS = [Q('ٱلشِّتَآءِ', '106:2', 'the winter'), Q('ٱلصَّيْفِ', '106:2', 'the summer'), Q('ٱلرَّحِيمِ', '1:1', 'the Most Merciful'), Q('ٱلدِّينِ', '1:4', 'the Judgement'), Q('ٱلنَّاسِ', '114:1', 'mankind'), Q('ٱلصَّمَدُ', '112:2', 'the Eternal Refuge'), Q('ٱلرَّحْمَٰنِ', '1:1', 'the Entirely Merciful'), Q('ٱلصِّرَٰطَ', '1:6', 'the path'), Q('ٱلضَّآلِّينَ', '1:7', 'those astray'), Q('ٱلنَّفَّٰثَٰتِ', '113:4', 'those who blow (on knots)')];
  const MOON_WORDS = [Q('ٱلْحَمْدُ', '1:2', 'the praise'), Q('ٱلْعَٰلَمِينَ', '1:2', 'the worlds'), Q('ٱلْفَلَقِ', '113:1', 'the daybreak'), Q('ٱلْكَوْثَرَ', '108:1', 'al-Kawthar (abundance)'), Q('ٱلْأَبْتَرُ', '108:3', 'the one cut off'), Q('ٱلْبَيْتِ', '106:3', 'the House (the Ka‘bah)'), Q('ٱلْمُسْتَقِيمَ', '1:6', 'the straight'), Q('ٱلْكِتَٰبُ', '2:2', 'the Book'), Q('ٱلْخَنَّاسِ', '114:4', 'the one who withdraws'), Q('ٱلْجِنَّةِ', '114:6', 'the jinn')];
  const sunMoonItems = (n) => shuffle([...sample(SUN_WORDS, n).map((w) => ({ ...w, b: 0 })), ...sample(MOON_WORDS, n).map((w) => ({ ...w, b: 1 }))]);
  const SM_BUCKETS = [{ label: 'Sun ☀️', cls: 'sun' }, { label: 'Moon 🌙', cls: 'moon' }];
  const unit5 = {
    id: 'u5', title: 'Sun & Moon Letters', ar: 'الحُرُوف الشَّمْسِيَّة وَالقَمَرِيَّة', color: 'gold',
    blurb: 'When do we say the ل in “al-”? The letters decide!',
    guide: [
      'ال means “the”.',
      'Moon letters 🌙 (14): the ل is heard clearly with a sukūn — ٱلْقَمَر “al-qamar”. Remember: اِبْغِ حَجَّكَ وَخَفْ عَقِيمَهُ',
      'Sun letters ☀️ (14): the ل goes silent and the next letter gets a shadda — ٱلشَّمْس “ash-shams”.',
      'Pattern clue: sukūn on the ل? Moon. Shadda on the next letter? Sun!',
    ],
    lessons: [
      { id: 'u5l1', title: 'Moon letters 🌙', glyphs: 'ٱلْقَمَر', steps: () => [
        T({ kicker: 'NEW RULE', big: 'ال', title: '“al-” means “the”', sub: 'كِتَاب = a book  ·  ٱلْكِتَاب = THE book', mood: 'talk' }),
        T({ kicker: 'MOON LETTERS', bigQ: 'ٱلْقَمَرُ', title: 'al-qamar · the moon', sub: 'Before a MOON letter, you can HEAR the ل. It has a sukūn.', tip: 'The moon is bright — so the ل shines clearly!', mood: 'happy' }),
        T({ kicker: 'REMEMBER THEM', bigRow: MOON.slice(0, 7), title: '14 moon letters', sub: 'Memory phrase: اِبْغِ حَجَّكَ وَخَفْ عَقِيمَهُ', tip: 'Every letter in that phrase is a moon letter!' }),
        MCQ('In ٱلْقَمَرُ, do we hear the ل?', 'Yes — clearly', ['No — it’s silent']),
        T({ kicker: 'QUR’AN WORD', bigQ: 'ٱلْحَمْدُ', title: 'al-ḥamdu · the praise', sub: 'ح is a moon letter, so we say “al”. From 1:2.', quranRef: ref('1:2') }),
        MCQ('What sits on the ل before a moon letter?', 'A sukūn ـْ', ['A shadda ـّ', 'Nothing']),
        MCQ('Which of these is a moon letter?', 'ق', ['ش', 'ر', 'ن'], { arOptions: true }),
        TAP('Tap the word with a moon letter after ال', '113:1', ['ٱلْفَلَقِ'], 'ٱلْفَلَقِ — ف is a moon letter: “al-falaq”.'),
        MCQ('How do you read ٱلْكَوْثَرَ?', 'al-kaw-tha-ra', ['ak-kaw-tha-ra', 'a-kaw-tha-ra'], { quranRef: ref('108:1') }),
      ] },
      { id: 'u5l2', title: 'Sun letters ☀️', glyphs: 'ٱلشَّمْس', steps: () => [
        T({ kicker: 'SUN LETTERS', bigQ: 'ٱلشَّمْسُ', title: 'ash-shams · the sun', sub: 'Before a SUN letter, the ل goes silent and the next letter gets a shadda.', tip: 'The sun is so bright the ل disappears!', mood: 'talk' }),
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['ٱلْقَمَر', 'ٱلشَّمْس'], title: 'Sukūn vs shadda', sub: 'Moon: ل has a sukūn · Sun: next letter has a shadda', mood: 'happy' }),
        T({ kicker: 'QUR’AN WORD', bigQ: 'ٱلنَّاسِ', title: 'an-naas · mankind', sub: 'ن is a sun letter — we don’t say “al-naas”!', quranRef: ref('114:1') }),
        MCQ('How do you read ٱلرَّحْمَٰنِ?', 'ar-raḥ-maa-ni', ['al-raḥ-maa-ni', 'a-raḥ-maa-ni'], { quranRef: ref('1:1') }),
        MCQ('Which of these is a sun letter?', 'ش', ['ق', 'ب', 'م'], { arOptions: true }),
        MCQ('In ٱلصَّمَدُ, is the ل heard?', 'No — it’s silent', ['Yes — clearly'], { quranRef: ref('112:2') }),
        TAP('Tap the word with a sun letter after ال', '1:4', ['ٱلدِّينِ'], 'ٱلدِّينِ — د is a sun letter: “ad-deen”.'),
        T({ kicker: 'REMEMBER THEM', bigRow: SUN.slice(0, 7), title: '14 sun letters', sub: 'ت ث د ذ ر ز س ش ص ض ط ظ ل ن', tip: 'Anything that’s not a moon letter is a sun letter!' }),
        SORT('Sun or moon?', SM_BUCKETS, sunMoonItems(3)),
      ] },
      { id: 'u5l3', title: 'Sun & moon sort', glyphs: '☀️🌙', review: true, steps: () => [
        SORT('Sort the Qur’an words: sun or moon?', SM_BUCKETS, sunMoonItems(4)),
        SORT('Sort the letters!', SM_BUCKETS, [...sample(SUN, 4).map((t) => ({ t, b: 0 })), ...sample(MOON.filter((x) => x !== 'ء'), 4).map((t) => ({ t, b: 1 }))]),
        TAP('Tap the word where the ل is silent', '114:1', ['ٱلنَّاسِ'], 'ٱلنَّاسِ — sun letter ن takes a shadda.'),
        TAP('Tap the moon-letter word', '108:3', ['ٱلْأَبْتَرُ'], 'ٱلْأَبْتَرُ — أ is a moon letter.'),
        MCQ('The shadda in ٱلشَّمْس tells you it’s a…', 'Sun letter', ['Moon letter']),
        TAP('Tap a word with a SUN letter', '106:2', ['ٱلشِّتَآءِ', 'وَٱلصَّيْفِ'], 'ٱلشِّتَآءِ (ش) and ٱلصَّيْفِ (ص) both start with sun letters.'),
        MCQ('How many sun letters are there?', '14', ['10', '28']),
      ] },
    ],
  };

  // ---------- Unit 6: noon sakinah, tanween & ghunna ----------
  const unit6 = {
    id: 'u6', title: 'Noon Rules & Ghunna', ar: 'أَحْكَام النُّون السَّاكِنَة', color: 'pink',
    blurb: 'What happens to نْ and tanwīn — clear, merged, flipped or hidden.',
    guide: [
      'Ghunna = a hum through your nose for 2 counts. Always on نّ and مّ.',
      'نْ (noon with sukūn) and tanwīn follow 4 rules, decided by the NEXT letter:',
      'Iẓhār (clear) before the 6 throat letters: ء ه ع ح غ خ',
      'Idghām (merge) before ي ر م ل و ن — “yarmaloon”. With ghunna: ي ن م و. Without ghunna: ل ر. Only between two words.',
      'Iqlāb (flip) before ب: the noon turns into a hidden م. Look for the tiny م!',
      'Ikhfā’ (hide) before the other 15 letters: a soft nasal hum.',
      'All rules here follow the recitation of Ḥafṣ ‘an ‘Āṣim.',
    ],
    lessons: [
      { id: 'u6l1', title: 'Ghunna: the nose hum', glyphs: 'إِنَّ', steps: () => [
        T({ kicker: 'NEW SOUND', bigRow: ['نّ', 'مّ'], title: 'Ghunna', sub: 'When ن or م has a shadda, hum through your nose for 2 counts.', tip: 'Try it: pinch your nose and say “innn” — feel the buzz!', mood: 'talk' }),
        T({ kicker: 'QUR’AN WORD', bigQ: 'إِنَّ', title: 'in-nnna', sub: 'From Al-Kawthar 108:3. Hold the hum: 1… 2…', quranRef: ref('108:3') }),
        MCQ('How long is a ghunna?', '2 counts', ['1 count', '6 counts']),
        MCQ('Which letters get ghunna when they have a shadda?', 'ن and م', ['ب and ت', 'ل and ر']),
        MCQ('Which word has a ghunna?', 'ٱلنَّاسِ', ['قُلْ', 'رَبِّ'], { arOptions: true, quranRef: ref('114:1') }),
        TAP('Tap the word with a ghunna', '108:3', ['إِنَّ'], 'إِنَّ — noon with shadda: hum for 2 counts.'),
        TAP('Tap the word with مّ (meem + shadda)', '111:4', ['حَمَّالَةَ'], 'حَمَّالَةَ — meem with shadda: ghunna!'),
        SORT('Ghunna or not?', [{ label: 'Ghunna 👃' }, { label: 'No ghunna' }], [['إِنَّ', 0], ['ثُمَّ', 0], ['ٱلنَّاسِ', 0], ['رَبِّ', 1], ['قُلْ', 1], ['كَتَبَ', 1]].map(([t, b]) => ({ t, b }))),
      ] },
      { id: 'u6l2', title: 'Iẓhār: say it clearly', glyphs: 'ء ه ع ح غ خ', steps: () => [
        T({ kicker: 'NOON SAKINAH', bigRow: ['نْ', 'ـٌ', 'ـٍ', 'ـً'], title: 'Noon with sukūn & tanwīn', sub: 'Tanwīn has a hidden “n” — so both follow the SAME rules.', mood: 'talk' }),
        T({ kicker: 'RULE 1 · IẒHĀR', bigRow: ['ء', 'ه', 'ع', 'ح', 'غ', 'خ'], title: 'Clear!', sub: 'Before these 6 THROAT letters, say the noon clearly — no extra hum.', tip: 'They all come from your throat. Touch your neck and say them!' }),
        T({ kicker: 'QUR’AN EXAMPLE', bigQ: 'مِّنْ خَوْفٍۭ', title: 'min khawf', sub: 'نْ before خ → clear noon. From Quraysh 106:4.', quranRef: ref('106:4') }),
        MCQ('Which letter makes the noon CLEAR?', 'ع', ['ب', 'ك', 'ر'], { arOptions: true }),
        MCQ('Where do the iẓhār letters come from?', 'The throat', ['The lips', 'The nose']),
        TAP('Tap the noon that is read CLEARLY', '106:4', [5], 'مِّنْ before خَوْفٍ — خ is a throat letter, so the noon is clear.', { byIndex: true }),
        T({ kicker: 'INSIDE A WORD', bigQ: 'أَنْعَمْتَ', title: 'an-‘amta', sub: 'نْ before ع — clear again! From Al-Fātiḥah 1:7.', quranRef: ref('1:7') }),
        SORT('Throat letter (iẓhār) or not?', [{ label: 'Throat letter' }, { label: 'Not throat' }], [['ء', 0], ['ه', 0], ['ح', 0], ['غ', 0], ['ب', 1], ['س', 1], ['م', 1], ['ك', 1]].map(([t, b]) => ({ t, b }))),
      ] },
      { id: 'u6l3', title: 'Idghām: merge!', glyphs: 'يرملون', steps: () => [
        T({ kicker: 'RULE 2 · IDGHĀM', bigRow: ['ي', 'ر', 'م', 'ل', 'و', 'ن'], title: '“Yarmaloon” — merge!', sub: 'Before these 6 letters, the noon melts into the next letter.', tip: 'Memory word: يَرْمَلُونَ', mood: 'talk' }),
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['ي', 'ن', 'م', 'و'], title: 'With ghunna: يَنْمُو', sub: 'Merge AND hum. But with ل and ر — merge with NO hum.', mood: 'happy' }),
        T({ kicker: 'QUR’AN EXAMPLE', bigQ: 'مِّن مَّسَدٍۭ', title: 'mim-masad', sub: 'نْ merges into م with a hum. From Al-Masad 111:5.', tip: 'See the shadda on مَّ? That shows the merge!', quranRef: ref('111:5') }),
        T({ kicker: 'QUR’AN EXAMPLE', bigQ: 'يَكُن لَّهُۥ', title: 'ya-kul-lahu', sub: 'نْ merges into ل with NO hum. From Al-Ikhlāṣ 112:4.', quranRef: ref('112:4') }),
        MCQ('Idghām WITHOUT ghunna happens before…', 'ل and ر', ['ي and و', 'ب and م']),
        MCQ('What happens in مِّن رَّبِّهِمْ?', 'The noon merges into ر — no hum', ['The noon is read clearly', 'The noon becomes م'], { quranRef: ref('2:5') }),
        TAP('Tap the word the noon merges INTO (with ghunna)', '111:5', ['مَّسَدٍۭ'], 'مِّن + مَّسَدٍ → the noon disappears into the م, with a hum.'),
        MCQ('Idghām only happens…', 'Between two words', ['Inside one word']),
        SORT('With ghunna or without?', [{ label: 'With ghunna (ينمو)' }, { label: 'No ghunna (ل ر)' }], [['ي', 0], ['ن', 0], ['م', 0], ['و', 0], ['ل', 1], ['ر', 1]].map(([t, b]) => ({ t, b }))),
      ] },
      { id: 'u6l4', title: 'Iqlāb: the flip', glyphs: 'مِنۢ بَعْدِ', steps: () => [
        T({ kicker: 'RULE 3 · IQLĀB', bigRow: ['نْ', '→', 'م'], title: 'Flip!', sub: 'Before ب, the noon flips into a hidden م — with a hum.', tip: 'Only ONE letter does this: ب', mood: 'talk' }),
        T({ kicker: 'SPOT THE TINY MEEM', bigQ: 'مِنۢ بَعْدِ', title: 'mim ba‘di', sub: 'See the tiny م above the noon? The muṣḥaf shows you the flip! From 98:4.', quranRef: ref('98:4'), mood: 'happy' }),
        MCQ('Which letter causes iqlāb?', 'ب', ['ت', 'ن', 'م'], { arOptions: true }),
        MCQ('In iqlāb, the noon turns into…', 'a hidden م', ['a ل', 'nothing']),
        TAP('Tap the word with iqlāb', '104:4', ['لَيُنۢبَذَنَّ'], 'لَيُنۢبَذَنَّ — نْ before ب, with a tiny م on top.'),
        TAP('Tap the word with the tiny meem', '98:4', ['مِنۢ'], 'مِنۢ is followed by بَعْدِ — iqlāb!'),
        MCQ('Does iqlāb have a ghunna?', 'Yes — 2 counts', ['No']),
      ] },
      { id: 'u6l5', title: 'Ikhfā’ & the big four', glyphs: 'مِن شَرِّ', review: true, steps: () => [
        T({ kicker: 'RULE 4 · IKHFĀ’', bigQ: 'مِن شَرِّ', title: 'Hide!', sub: 'Before the other 15 letters, the noon is half-hidden with a soft hum. From Al-Falaq 113:2.', tip: 'ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك', quranRef: ref('113:2'), mood: 'talk' }),
        MCQ('How many letters make ikhfā’?', '15', ['6', '1']),
        TAP('Tap the noon that is HIDDEN (ikhfā’)', '106:4', [2], 'مِّن before جُوعٍ — ج is an ikhfā’ letter.', { byIndex: true }),
        TAP('Tap the noon that is CLEAR (iẓhār)', '106:4', [5], 'مِّنْ before خَوْفٍ — خ is a throat letter.', { byIndex: true }),
        SORT('Which rule?', [{ label: 'Iẓhār' }, { label: 'Idghām' }, { label: 'Iqlāb' }, { label: 'Ikhfā’' }],
          [['ح', 0], ['ع', 0], ['ي', 1], ['ر', 1], ['ب', 2], ['ش', 3], ['ك', 3], ['ت', 3]].map(([t, b]) => ({ t, b }))),
        MCQ('نْ before ب is…', 'Iqlāb', ['Iẓhār', 'Ikhfā’']),
        MCQ('نْ before ل is…', 'Idghām (no ghunna)', ['Ikhfā’', 'Iẓhār']),
        MCQ('نْ before خ is…', 'Iẓhār', ['Idghām', 'Iqlāb']),
        MATCH([['Iẓhār', 'clear'], ['Idghām', 'merge'], ['Iqlāb', 'flip to م'], ['Ikhfā’', 'hide'], ['Ghunna', 'nose hum']], { latinLeft: true }),
      ] },
    ],
  };

  // ---------- Unit 7: Qur'an grammar ----------
  const ISM = [Q('ٱلنَّاسِ', '114:1', 'mankind'), Q('ٱلْفَلَقِ', '113:1', 'the daybreak'), Q('أَحَدٌ', '112:1', 'one'), Q('ٱلْكِتَٰبُ', '2:2', 'the Book'), Q('ٱلْبَيْتِ', '106:3', 'the House'), Q('ٱلْحَمْدُ', '1:2', 'the praise')];
  const FIL = [Q('خَلَقَ', '113:2', 'he created'), Q('قُلْ', '112:1', 'say!'), Q('نَعْبُدُ', '1:5', 'we worship'), Q('حَسَدَ', '113:5', 'he envied'), Q('يَلِدْ', '112:3', 'he begets'), Q('ٱقْرَأْ', '96:1', 'read!')];
  const HARF = [Q('مِن', '113:2', 'from'), Q('فِى', '113:4', 'in'), Q('عَلَىٰ', '2:5', 'on'), Q('لَمْ', '112:3', 'did not'), Q('إِنَّ', '108:3', 'indeed')];
  const WORD_BUCKETS = [{ label: 'Ism (name)', cls: 'ism' }, { label: 'Fi‘l (action)', cls: 'fil' }, { label: 'Ḥarf (link)', cls: 'harf' }];
  const unit7 = {
    id: 'u7', title: 'Qur’an Word Detectives', ar: 'كَلِمَات القُرْآن', color: 'teal',
    blurb: 'Every word is a name, an action or a link — find out what words are doing!',
    guide: [
      'Every Arabic word is one of 3 types: Ism (a name or thing), Fi‘l (an action with a time), Ḥarf (a little linking word).',
      'Signs of an ism: it can start with ال, end with tanwīn, or have a kasra ending after a ḥarf like مِن.',
      'Words ending in ة are usually feminine (girl words): مُعَلِّم → مُعَلِّمَة.',
      'Little endings tell you WHOSE: ـِي my · ـكَ your · ـهُ his · ـهَا her · ـنَا our · ـهُمْ their.',
      'Most words grow from a 3-letter ROOT: ك ت ب → كَتَبَ wrote · كِتَاب book · كَاتِب writer.',
    ],
    lessons: [
      { id: 'u7l1', title: 'Ism, Fi‘l, Ḥarf', glyphs: 'اسم فعل حرف', steps: () => [
        T({ kicker: 'WORD TYPES', bigRow: ['اِسْم', 'فِعْل', 'حَرْف'], title: 'Three kinds of words', sub: 'Name · Action · Link', tip: 'Every word in the Qur’an is one of these three!', mood: 'talk' }),
        T({ kicker: 'ISM · NAME', bigQ: 'ٱلنَّاسِ', title: 'Ism = a name or a thing', sub: 'People, places, things, ideas. ٱلنَّاسِ = mankind', quranRef: ref('114:1') }),
        T({ kicker: 'FI‘L · ACTION', bigQ: 'خَلَقَ', title: 'Fi‘l = an action', sub: 'A doing word that happens in time. خَلَقَ = he created', quranRef: ref('113:2') }),
        T({ kicker: 'ḤARF · LINK', bigQ: 'مِن', title: 'Ḥarf = a linking word', sub: 'Small words that connect others. مِن = from', quranRef: ref('113:2') }),
        MCQ('خَلَقَ means “he created”. What type of word is it?', 'Fi‘l (action)', ['Ism (name)', 'Ḥarf (link)']),
        MCQ('فِى means “in”. What type of word is it?', 'Ḥarf (link)', ['Fi‘l (action)', 'Ism (name)']),
        TAP('Tap the fi‘l (the action word)', '112:1', ['قُلْ'], 'قُلْ = “say!” — it’s a command, so it’s a fi‘l.'),
        TAP('Tap the ḥarf (linking word)', '113:2', ['مِن'], 'مِن = “from” — a ḥarf that links words.'),
        SORT('Name, action or link?', WORD_BUCKETS, [...sample(ISM, 2).map((w) => ({ ...w, b: 0 })), ...sample(FIL, 2).map((w) => ({ ...w, b: 1 })), ...sample(HARF, 2).map((w) => ({ ...w, b: 2 }))], { showGloss: true }),
      ] },
      { id: 'u7l2', title: 'Clues of an ism', glyphs: 'ال · ـٌ', steps: () => [
        T({ kicker: 'DETECTIVE CLUES', bigRow: ['ٱلْـ', 'ـٌ ـٍ ـً'], title: 'Spot an ism!', sub: 'Starts with ال  OR  ends with tanwīn → it’s an ism!', tip: 'Verbs and ḥarfs never take ال or tanwīn.', mood: 'talk' }),
        MCQ('ٱلْفَلَقِ starts with ال. So it is an…', 'Ism', ['Fi‘l', 'Ḥarf'], { quranRef: ref('113:1') }),
        MCQ('أَحَدٌ ends with tanwīn. So it is an…', 'Ism', ['Fi‘l', 'Ḥarf'], { quranRef: ref('112:1') }),
        TAP('Tap a word with the ال clue', '1:2', ['ٱلْحَمْدُ', 'ٱلْعَٰلَمِينَ'], 'ٱلْحَمْدُ and ٱلْعَٰلَمِينَ both start with ال — both are ism!'),
        TAP('Tap the word with the tanwīn clue', '112:1', ['أَحَدٌ'], 'أَحَدٌ ends with tanwīn — an ism.'),
        T({ kicker: 'CLUE 3', bigQ: 'مِن شَرِّ', title: 'After a ḥarf like مِن', sub: 'The word after مِن gets a kasra — and it’s an ism! شَرِّ = evil', quranRef: ref('113:2') }),
        MCQ('Can a fi‘l start with ال?', 'No, never', ['Yes, always']),
        SORT('Ism or not?', [{ label: 'Ism ✔' }, { label: 'Not an ism' }], [...sample(ISM, 3).map((w) => ({ ...w, b: 0 })), ...sample([...FIL, ...HARF], 3).map((w) => ({ ...w, b: 1 }))], { showGloss: true }),
      ] },
      { id: 'u7l3', title: 'Boy words & girl words', glyphs: 'ـة', steps: () => [
        T({ kicker: 'GENDER', bigRow: ['مُعَلِّم', 'مُعَلِّمَة'], title: 'teacher (m) · teacher (f)', sub: 'Add ة to make the girl version!', tip: 'ة is called tā’ marbūṭa — a round “t”.', mood: 'talk' }),
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['هُوَ', 'هِيَ'], title: 'huwa = he · hiya = she', sub: 'Boy words go with هُوَ, girl words with هِيَ', mood: 'happy' }),
        MCQ('Which one is the girl word?', 'طَالِبَة', ['طَالِب'], { arOptions: true, gloss: 'student' }),
        MCQ('How do you make مُسْلِم feminine?', 'مُسْلِمَة', ['مُسْلِمُو', 'مُسْلِمِي'], { arOptions: true }),
        T({ kicker: 'QUR’AN WORD', bigQ: 'رِحْلَةَ', title: 'riḥla · a journey', sub: 'Ends in ة → a feminine word. From Quraysh 106:2.', quranRef: ref('106:2') }),
        TAP('Tap the word ending in ة', '106:2', ['رِحْلَةَ'], 'رِحْلَةَ ends in ة — feminine.'),
        SORT('Boy word or girl word?', [{ label: 'Masculine (هُوَ)' }, { label: 'Feminine (هِيَ)' }], [['كِتَاب', 0], ['بَيْت', 0], ['مُعَلِّم', 0], ['مَدْرَسَة', 1], ['شَجَرَة', 1], ['مُعَلِّمَة', 1]].map(([t, b]) => ({ t, b }))),
        MCQ('Words ending in ة are usually…', 'Feminine', ['Masculine', 'Verbs']),
      ] },
      { id: 'u7l4', title: 'Whose is it?', glyphs: 'رَبِّي رَبُّنَا', steps: () => [
        T({ kicker: 'LITTLE ENDINGS', bigRow: ['رَبِّي', 'رَبُّكَ', 'رَبُّنَا'], title: 'my Lord · your Lord · our Lord', sub: 'A tiny ending tells you WHOSE.', mood: 'talk' }),
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['ـِي', 'ـكَ', 'ـنَا', 'ـهُ', 'ـهَا'], title: 'my · your · our · his · her', sub: 'Stick them on the end of a word!', mood: 'happy' }),
        MCQ('Which means “our Lord”?', 'رَبُّنَا', ['رَبِّي', 'رَبُّكَ'], { arOptions: true }),
        MCQ('Which means “my Lord”?', 'رَبِّي', ['رَبُّنَا', 'رَبُّهُ'], { arOptions: true }),
        MATCH([['ـِي', 'my'], ['ـكَ', 'your'], ['ـنَا', 'our'], ['ـهُ', 'his'], ['ـهَا', 'her']]),
        TAP('Tap the word that means “your Lord”', '96:1', ['رَبِّكَ'], 'رَبِّكَ = رَبّ + ـكَ (your).'),
        TAP('Tap the word with “her” (ـهَا) at the end', '111:5', ['جِيدِهَا'], 'جِيدِهَا = her neck: جِيد + ـهَا.'),
        MCQ('In مِّن رَّبِّهِمْ, what does ـهِمْ mean?', 'their', ['my', 'your'], { quranRef: ref('2:5') }),
        MCQ('ٱهْدِنَا means “guide us”. Which ending means “us”?', 'ـنَا', ['ـكَ', 'ـهُ'], { arOptions: true, quranRef: ref('1:6') }),
      ] },
      { id: 'u7l5', title: 'Word families (roots)', glyphs: 'ك ت ب', review: true, steps: () => [
        T({ kicker: 'ROOTS', bigRow: ['ك', 'ت', 'ب'], title: 'A 3-letter root', sub: 'Most Arabic words grow from 3 root letters — like a tree!', mood: 'talk' }),
        T({ kicker: 'PATTERN SPOTTED!', bigRow: ['كَتَبَ', 'كِتَاب', 'كَاتِب'], title: 'wrote · book · writer', sub: 'Same root letters ك ت ب — all about WRITING!', mood: 'happy' }),
        MCQ('Which 3 letters are the root of كِتَاب?', 'ك ت ب', ['ك ت ا', 'ت ا ب'], { arOptions: true }),
        MCQ('Odd one out: which is NOT from the ك ت ب family?', 'قَلَم', ['كِتَاب', 'كَتَبَ', 'كَاتِب'], { arOptions: true }),
        T({ kicker: 'QUR’AN ROOT', bigRow: ['خَلَقَ', 'خَالِق'], title: 'Root: خ ل ق', sub: 'he created · Creator', tip: 'خَلَقَ appears in 96:1 and 113:2!', quranRef: ref('113:2') }),
        MCQ('What is the root of خَلَقَ?', 'خ ل ق', ['خ ل', 'ل ق ا'], { arOptions: true }),
        MCQ('نَعْبُدُ (we worship) and عَبْد (servant) share which root?', 'ع ب د', ['ن ع ب', 'ب د ن'], { arOptions: true, quranRef: ref('1:5') }),
        SORT('Which root family?', [{ label: 'ك ت ب (write)' }, { label: 'ع ل م (know)' }], [['كَتَبَ', 0], ['كِتَاب', 0], ['كَاتِب', 0], ['عَلِمَ', 1], ['عِلْم', 1], ['عَالِم', 1]].map(([t, b]) => ({ t, b }))),
        SORT('Final challenge: what type of word?', WORD_BUCKETS, [...sample(ISM, 2).map((w) => ({ ...w, b: 0 })), ...sample(FIL, 2).map((w) => ({ ...w, b: 1 })), ...sample(HARF, 2).map((w) => ({ ...w, b: 2 }))], { showGloss: true }),
      ] },
    ],
  };

  const UNITS = [unit1, unit2, unit3, unit4, unit5, unit6, unit7];

  window.QQ_CONTENT = { UNITS, AYAH, SURAH, L, SUN, MOON, ref, shuffle, sample, pick, SUN_WORDS, MOON_WORDS, ISM, FIL, HARF };
})();
