# Qalam Quest: research notes

This file explains **why the game is built the way it is**: what to teach first, how children learn to read Arabic, and which Duolingo mechanics we borrowed or changed for children. Sources are linked inline. Anything we could not verify is marked.

---

## 1. Teaching order

The game follows the order of the **Noorani Qāʿida**, which most UK mosques use. Editions of the Qāʿida number their lessons differently, but the overall order is the same ([quransheikh.com](https://quransheikh.com/noorani-qaida), [equranschool.com](https://equranschool.com/noorani-qaida-course)):

> single letters → joined letters → ḥarakāt (fatḥa, kasra, ḍamma) → tanwīn → madd (long vowels) → sukūn → shadda → reading Juz ʿAmma

**How the game maps onto this:**

| Unit | Topic | Why it comes here |
|---|---|---|
| 1 | The 28 letters, taught in **shape families** | Letter knowledge is a strong predictor of early Arabic reading ([Frontiers in Psychology 2025](https://www.frontiersin.org/articles/10.3389/fpsyg.2025.1628051/full)) |
| 2 | Fatḥa, kasra, ḍamma | Letters only "talk" once they have a vowel. Syllable awareness predicts reading (same source) |
| 3 | Tanwīn and madd | Follows the Qāʿida order |
| 4 | Sukūn and shadda | Needed to read almost any real Qur'an word |
| 5 | Sun and moon letters | The first tajwīd rule, and the first proper *pattern-spotting* rule |
| 6 | Noon sākinah, tanwīn rules and ghunna | Builds directly on Units 3–5 |
| 7 | First Qur'anic grammar: ism, fiʿl, ḥarf, gender, pronoun endings, roots | Moves from "how do I read it" to "what is this word doing" |

The suggested grammar order (word types, then gender, then pronoun endings, then roots) is our own synthesis from several beginner courses:

- **Understand Quran Academy** starts with ism/fiʿl/ḥarf and attached pronouns, because these are so common in the Qur'an.
- **Madinah Book 1** covers gender and iḍāfa early ([madinaharabic.com](https://www.madinaharabic.com/arabic-language-course/lessons/L001_001.html)).
- The classical signs of an ism come from the **Ājurrūmiyyah** ([fluentarabic.net](https://www.fluentarabic.net/ajrumiyyah-arabic-grammar-1/)): ال, tanwīn, and the kasra (khafḍ) ending.

## 2. How children learn to read Arabic, and what the game does about it

**Dot families.**
- **Research:** Most Arabic letters share a base shape and differ only in the number and position of their dots ([Frontiers 2025](https://www.frontiersin.org/articles/10.3389/fpsyg.2025.1628051/full)).
- **In the game:** Unit 1 teaches letters in families (ب ت ث, ج ح خ, د/ذ, ر/ز…). It uses "PATTERN SPOTTED!" cards and dot-counting questions, so children notice the pattern rather than memorise 28 separate shapes.

**Fully vowelled text.**
- **Research:** Beginners read fully vowelled text, which matches sounds almost one-to-one. The marks also add visual load, though ([PMC9723150](https://pmc.ncbi.nlm.nih.gov/articles/PMC9723150)).
- **In the game:** Each vowel mark gets its own short lesson before they are mixed.

**Roots.**
- **Research:** Awareness of roots and word patterns affects reading from Grades 1–3 ([PMC7538675](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7538675/)).
- **In the game:** Unit 7 ends with word families (ك ت ب, خ ل ق, ع ل م).

**Positional forms.**
- **Research:** Letters change shape when they join ([PMC7497809](https://pmc.ncbi.nlm.nih.gov/articles/PMC7497809)).
- **In the game:** This version only teaches the six letters that never join (ا د ذ ر ز و). The *Build* exercise shows letters joining live as children tap them. A full positional-forms unit is a good next step.

**Short, daily, multisensory practice.**
- **In the game:** Lessons are short, with sound, tapping and building.
- **Caveat:** We found no Arabic-specific studies on this. It is general literacy good practice, so treat it as a sensible assumption rather than proven for Arabic.

## 3. Tajwīd content (riwāya of Ḥafṣ ʿan ʿĀṣim)

**Sun letters (14):** ت ث د ذ ر ز س ش ص ض ط ظ ل ن. The ل of ال is silent and the next letter takes a shadda.

**Moon letters (14):** ء ب ج ح خ ع غ ف ق ك م و ي ه. The ل is pronounced with a sukūn.

- **Moon mnemonic:** اِبْغِ حَجَّكَ وَخَفْ عَقِيمَهُ
- **Source:** both mnemonics come from al-Jamzūrī's *Tuḥfat al-Aṭfāl* ([Wikipedia](https://en.wikipedia.org/wiki/Sun_and_moon_letters), [Tuḥfa text](https://surahquran.com/Tajweed/tohfat-alatfal-en.html)).

**Noon sākinah and tanwīn** ([surahquran.com](https://surahquran.com/Tajweed/noon-sakenah-en.html), [al-dirassa.com](https://al-dirassa.com/en/noon-sakinah-tanween-tajweed)):

- **Iẓhār (clear):** before the 6 throat letters ء ه ع ح غ خ.
- **Idghām (merge):** before the letters of يَرْمَلُونَ.
  - With ghunna: ي ن م و
  - Without ghunna: ل ر
  - It only happens across two words. Inside one word (الدُّنْيَا، بُنْيَانٌ، صِنْوَانٌ، قِنْوَانٌ) the noon is read clearly ([iqranetwork](https://iqranetwork.com/blog/al-ith-haar-al-mutlaq/)).
- **Iqlāb (flip):** before ب. The noon becomes a hidden م with ghunna, and the muṣḥaf marks it with a small م.
- **Ikhfāʾ (hide):** before the remaining 15 letters.
- **Total:** 6 + 6 + 1 + 15 = 28.

**Ghunna on نّ / مّ:** 2 counts ([mishkahacademy](https://mishkahacademy.com/meem-noon-mushaddad/)).
- **Note:** a few sources describe the mushaddad ghunna as "most complete". They mean stronger, not longer. The game uses 2 counts.

**Not yet in the game:** meem sākinah rules (ikhfāʾ shafawī, idghām shafawī, iẓhār shafawī). These are planned as a next unit.

> ⚠️ **Teacher check:** please have a qualified teacher review the tajwīd wording before using it in class.

## 4. Qur'an text: how it was verified

- **The text:** All Qur'an quotations are the Uthmani text of the Tanzil project, fetched from `api.alquran.cloud` (edition `quran-uthmani`). The raw files are saved in `tools/quran-source/`.
- **What the script checks:** `node tools/verify.js`
  - Every verse in the game matches the source exactly (compared in Unicode NFC, so mark order doesn't matter).
  - Every quoted word appears in the verse it cites.
  - Every "tap the word" answer exists in that verse.
  - Every sun- or moon-letter word is classified correctly.
- **Verses used:** Al-Fātiḥah 1–2, 4–7 · Al-Baqarah 2, 5 · Al-ʿAlaq 1 · Al-Bayyinah 4 · Al-Humazah 4 · Quraysh 2–4 · Al-Kawthar 1–3 · Al-Masad 2, 4–5 · Al-Ikhlāṣ 1–4 · Al-Falaq 1–5 · An-Nās 1, 4, 6.

## 5. What makes Duolingo engaging, and what we changed for children

### Mechanics we borrowed

**Streaks**
- **Evidence:** Learners on a 7-day streak are 2.4× more likely to return the next day ([Duolingo blog](https://blog.duolingo.com/improving-the-streak)). They are 3.6× more likely to finish a course; this is correlation, not proof of cause ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)).
- **In the game:** One lesson extends the streak. There is a flame celebration with a week view.

**Streak freezes**
- **Evidence:** Letting learners hold two freezes at once raised daily active learners ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)).
- **In the game:** Freezes are used automatically. Children earn them free every 7 days, and they can also be bought with in-game gems. You can hold at most 2.

**Celebration screens**
- **Evidence:** A milestone animation raised 7-day retention for new learners ([Duolingo design blog](https://blog.duolingo.com/streak-milestone-design-animation/)).
- **In the game:** After a lesson come the lesson-complete stars, a count-up of XP, accuracy and time, then confetti, the streak screen, completed quests and new badges.

**Daily quests**
- **Evidence:** Duolingo shows three a day, ordered from easy to harder ([Duolingo blog](https://blog.duolingo.com/time-spent-learning-well)).
- **In the game:** Three quests a day: the daily XP goal plus two rotating ones. Finishing all three gives a daily chest.

**The single learning path**
- **Evidence:** Duolingo's 2022 redesign gave one guided path, so learners always know where to go ([Duolingo blog](https://blog.duolingo.com/new-duolingo-home-screen-design)).
- **In the game:** One winding path with a bouncing START node and the buddy waving next to it. There are treasure chests on the path and a trophy review at the end of each unit.

**Small doses of new material**
- **Evidence:** Each Duolingo lesson adds only a few new items ([Duolingo blog](https://blog.duolingo.com/right-level-of-difficulty)).
- **In the game:** Three to five new letters or one new rule per lesson.

**Mistake review**
- **In the game:** A wrong answer comes back again at the end of the lesson.

**Combo**
- **In the game:** A "🔥 N IN A ROW" glow on the progress bar, a celebration burst at 5 and 10 in a row, and a combo XP bonus.

**Feel**
- **In the game:**
  - Chunky 3D buttons that press down.
  - A rounded heavy font: Nunito, a free alternative to Duolingo's custom font.
  - Bright unit colours.
  - A bouncy chime for correct answers and a low tone for wrong ones (all made with the Web Audio API, no audio files).
  - Light haptics on phones.
  - A rigged SVG character who blinks, talks, cheers and droops.

**Play before signing up**
- **Evidence:** Duolingo delayed sign-up until after the first lesson. This is reported second-hand ([source](https://taplytics.com/blog/duolingo-ab-test-onboarding)).
- **In the game:** There are no accounts at all. Onboarding is: pick a buddy, enter a first name, pick a daily goal, then the first lesson.

### What we deliberately changed for children

Research on children's apps warns against manipulative design:

- Radesky et al. found manipulative design in about 80% of apps used by 3–5-year-olds ([JAMA Netw Open 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9206186/)).
- The UK ICO **Children's Code** limits nudge techniques ([ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/)).

So the game:

- **Has no guilt.** A broken streak shows "Every day is a fresh start". The buddy is never used to shame.
- **Never sells anything for real money.** Gems are earned by learning only.
- **Never locks a child out of learning.** Out of hearts → a free practice session refills them. Teachers can switch on *Class mode* for unlimited hearts. Duolingo itself found beginners were about 2× as likely to run out of hearts ([Duolingo blog](https://blog.duolingo.com/duolingo-energy/)).
- **Has no leaderboards against strangers and no push notifications.** Reminders are better coming from the teacher or parent.
- **Collects no data.** Progress lives only in the browser on that device.

### Not verified

- Duolingo publishes no official lesson length or "% correct" target. The commonly quoted 85% rule is academic, not a Duolingo figure.
- Exact combo XP numbers vary between sources.
