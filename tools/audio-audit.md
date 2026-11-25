# Audio audit — 25 November 2026

## Inventory

- 185 playback clips are mapped in `js/audio-manifest.js`; all have unique file contents.
- 128 are generated Hamed teacher clips, 44 are Quran.com word recitations, and 13 are phrases joined from other clips.
- 28 additional alphabet recordings in `tools/human-audio/alphabet` are not mapped into gameplay. All 28 decode; their durations are 0.73–1.17 s.
- 16 curriculum sounds are intentionally silent (`tools/audio-silent.json`).

## Verified by file inspection

- All 185 files decoded and passed the duration, peak, and silence checks in `tools/audio_test.py --no-asr`.
- Short teacher clips had long quiet tails. The margin trim shortened 140 files, preserving 120 ms around detected speech. A repeat pass found no further trims.
- The 13 joined phrases contained the original quiet tails between words. They were rebuilt from trimmed pieces with 350 ms pauses. For example, `بَ بِ` is now 1.34 s instead of 4.09 s.
- The source map confirms that the full library has **two distinct speakers**. A single-speaker result requires replacing either the teacher clips or the qāriʾ clips with one approved voice source.

## Needs human listening and Arabic review

- This environment does not provide direct audio listening, so naturalness, enthusiasm, precise pronunciation, and speaker identity cannot be certified by ear here.
- Ten generated clips were retained with a speech-recognition score below 0.75: `أَبْ`, `إِنَ`, `بَابٌ`, `دْ`, `رَبِّي`, `عَنْ`, `عِلْم`, `قُلُ`, `لِمْ`, `لْ`. Those deserve first priority in `tools/audio-review.html`.
- The 16 silent entries also need a recorded source if those sounds should be available in the game.

To review by ear, serve the project locally and open `tools/audio-review.html`. Its cards play the exact file used by the game and let a reviewer mark clips for correction.
