/* Zaid and Huda are illustrated pose sheets, not assembled SVG parts.
 * Keep the public mascot API so lessons and teacher pages can request moods.
 */
(function () {
  'use strict';

  const BUDDIES = {
    zaid: { name: 'Zaid', line: 'I love spotting patterns!' },
    huda: { name: 'Huda', line: 'Every letter is a little friend!' },
  };
  const ACTIVITIES = ['read', 'point', 'wave', 'think', 'happy', 'talk', 'dance'];
  const X = ['0%', '50%', '100%'];
  const Y = ['0%', '50%', '100%'];
  const POSES = {
    idle: [0, 0], nod: [0, 0], walk: [0, 0],
    wave: [1, 0],
    happy: [2, 0], celebrate: [2, 0], dance: [2, 0], clap: [2, 0],
    ball: [2, 0], bubbles: [2, 0], stretching: [2, 0],
    talk: [0, 1], sad: [1, 1], shake: [1, 1],
    think: [2, 1], thinking: [2, 1], cheeky: [2, 1], shrug: [2, 1], listening: [2, 1],
    read: [0, 2], reading: [0, 2], quran: [0, 2], dates: [0, 2],
    point: [1, 2], pointing: [1, 2], writing: [1, 2], watering: [1, 2], painting: [1, 2], detective: [1, 2],
    sit: [2, 2], sleep: [2, 2], napping: [2, 2],
  };
  const frame = (mood) => {
    const [col, row] = POSES[mood] || POSES.idle;
    return `--pose-x:${X[col]};--pose-y:${Y[row]}`;
  };

  function kid(buddy, mood, cls, opts) {
    buddy = BUDDIES[buddy] ? buddy : 'huda';
    const head = opts && opts.headOnly;
    const name = BUDDIES[buddy].name;
    return `<span class="kid ${head ? 'head-only ' : ''}${cls || ''}" data-buddy="${buddy}" data-mood="${mood || 'idle'}" role="img" aria-label="${name}"><span class="kid-art" style="${frame(mood)}" aria-hidden="true"></span></span>`;
  }

  function setMood(root, mood, ms) {
    const el = root && (root.matches && root.matches('.kid') ? root : root.querySelector('.kid'));
    if (!el) return;
    if (el.dataset.mood !== mood) {
      const art = el.querySelector('.kid-art');
      if (art) art.style.cssText = frame(mood);
      el.dataset.mood = mood;
    }
    clearTimeout(el._moodT);
    if (ms) el._moodT = setTimeout(() => { if (el.isConnected) setMood(el, el.dataset.rest || 'idle'); }, ms);
  }

  // Moods change the entire illustrated pose, while CSS adds subtle movement.
  function liven(el, moods, every) {
    if (!el || !moods || !moods.length) return;
    clearTimeout(el._liven);
    const base = every || 3200;
    let i = 0;
    const next = () => {
      el._liven = setTimeout(() => {
        if (!el.isConnected) return;
        i = (i + 1) % moods.length;
        setMood(el, moods[i]);
        next();
      }, base * (0.85 + Math.random() * 0.3));
    };
    next();
  }

  window.QQ_MASCOT = { BUDDIES, kid, setMood, liven, ACTIVITIES };
})();
