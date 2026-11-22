# Qalam

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

**Buddies:** pick Zaid or Huda. Both are rigged SVG characters drawn from the reference artwork, with 12 animations: idle, wave, jump for joy, talk, sad, think, dance, walk, read, point, sit and sleep. They walk onto the path, cheer, read their books, and react to every answer.

**Start at your level:** during onboarding, children say how much Arabic they already know and take a short placement test. Any locked unit also has a "Jump here?" button that offers a 12-question test with 3 lives; passing it unlocks everything before that unit.

**Layout:** like Duolingo, there are three layouts:
- **Desktop:** a left sidebar with the logo and nav, the path in the middle, and stats, quests and cards on the right.
- **Tablet:** an icon-only sidebar.
- **Phone:** stats along the top and icon tabs along the bottom.

A short guided tour runs on first visit.

**Read aloud:** every Arabic letter, syllable and word in the lessons has a recorded clip (letters are spoken by name). The browser's robotic built-in voice is never used (`assets/audio`, Microsoft's natural-sounding neural Arabic voice "Hamed"), so the speaker buttons work on any phone or browser.

**Teacher & parent corner** (in the game: Teachers in the sidebar, or Profile → Teacher & parent corner):

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
js/mascot.js      Zaid & Huda (rigged SVG; animations in css/mascot.css, preview all moods at tools/mascot-sheet.html)
js/app.js         game engine: state, streaks, quests, sounds, screens, exercises
css/style.css     visual system
tools/verify.js   checks every Qur'an quote against tools/quran-source/
RESEARCH.md       why it's built this way (pedagogy, tajwīd sources, Duolingo research)
```

- **Run locally:** `python3 -m http.server` and open http://localhost:8000. Double-clicking `index.html` also works.
- **Verify the Qur'an text:** `node tools/verify.js`
- **Re-record audio after changing content:** `pip install edge-tts praat-parselmouth`, then `node tools/make-audio.js`. Every clip is trimmed and loudness-levelled. Each short syllable is recorded in four candidate versions (two voices, two speeds), and a vowel check (`tools/vowel_check.py`) keeps one that measures correctly; if none does, the game stays silent rather than teach a wrong sound.
- **Full automated QA:** open `tools/qa.html` while serving the project. It plays all 31 lessons and tests hearts, placement tests, every page, the theme toggle, chests, the shop, the tour and onboarding, then reports any errors.
- **Add a lesson:** add an entry to a unit in `js/content.js`, using the helpers `T` (teach), `MCQ`, `LISTEN`, `MATCH`, `SORT`, `TAP` and `BUILD`. For any Qur'an text, add the verse to `AYAH` and run the verifier.

Qur'an text: Tanzil Uthmani (Ḥafṣ ʿan ʿĀṣim) via api.alquran.cloud. Fonts: Nunito, Dancing Script (logo), Noto Naskh Arabic and Amiri Quran (Google Fonts, SIL OFL).
Icons: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) 3D (MIT licence).
