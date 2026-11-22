# Qalam Quest

A Duolingo-style game that teaches children (about 5–12) to read the Arabic of the Qur'an. It starts with the letters and works up through the vowel marks, tajwīd (sun and moon letters, noon rules, ghunna) and first Qur'anic grammar. It was made for the children at Didsbury Mosque, Manchester.

**Play:** open `index.html` in a browser, or use the GitHub Pages link. It works on phones, tablets and computers, and can be added to a phone's home screen.
**Teachers and parents:** open `teacher.html` to see every lesson, answer and Qur'an reference on one printable page.

## What's inside

**7 units and 31 lessons**, each one 2–5 minutes long:

1. **Meet the Letters:** all 28 letters, taught in dot families.
2. **Short Vowels:** fatḥa, kasra and ḍamma.
3. **Tanwīn & Long Vowels**
4. **Sukūn & Shadda**
5. **Sun & Moon Letters**
6. **Noon Rules & Ghunna:** iẓhār, idghām, iqlāb and ikhfāʾ.
7. **Qur'an Word Detectives:** ism/fiʿl/ḥarf, boy and girl words, "whose is it?" endings, and roots.

**7 kinds of exercise:**

- teach cards
- multiple choice
- listen and choose (uses the device's Arabic voice, if it has one)
- match pairs
- sort into buckets (☀️/🌙, ism/fiʿl/ḥarf…)
- tap the word inside a real āyah
- build a word from pieces that join live

**Game features:**

- XP and stars
- a daily streak, with automatic streak freezes
- hearts, plus a free "practise to refill"
- daily quests and a daily chest
- treasure chests on the path
- badges
- combo celebrations
- confetti and sound effects

**Buddies:** pick Zaid or Huda, two original animated kids who guide and react.

**Teacher & parent corner** (in the game, under *Me*):

- Class mode, which gives unlimited hearts
- Unlock every lesson
- the teacher guide
- reset progress

**Privacy:** no accounts and no tracking. Progress is saved only in that browser.

## For developers

The game is plain HTML, CSS and JS, with no build step.

```
index.html        the game
teacher.html      printable teacher guide (generated from the same data)
js/content.js     ALL curriculum: units, lessons, exercises, verified Qur'an text
js/mascot.js      Zaid & Huda (rigged SVG)
js/app.js         game engine: state, streaks, quests, sounds, screens, exercises
css/style.css     visual system
tools/verify.js   checks every Qur'an quote against tools/quran-source/
RESEARCH.md       why it's built this way (pedagogy, tajwīd sources, Duolingo research)
```

- **Run locally:** `python3 -m http.server` and open http://localhost:8000. Double-clicking `index.html` also works.
- **Verify the Qur'an text:** `node tools/verify.js`
- **Add a lesson:** add an entry to a unit in `js/content.js`, using the helpers `T` (teach), `MCQ`, `LISTEN`, `MATCH`, `SORT`, `TAP` and `BUILD`. For any Qur'an text, add the verse to `AYAH` and run the verifier.

Qur'an text: Tanzil Uthmani (Ḥafṣ ʿan ʿĀṣim) via api.alquran.cloud. Fonts: Nunito, Noto Naskh Arabic and Amiri Quran (Google Fonts, SIL OFL).
