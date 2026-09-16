// ============================================================
// Streak — daily study streak (ported from android-skills-tree).
// Tracks active days as local "YYYY-MM-DD" strings. A streak is
// preserved if yesterday is active even when today isn't yet.
// Awarded streak achievements: 7 / 30 / 60 / 100 days.
// ============================================================

const Streak = (() => {
  const STREAK_ACHIEVEMENT_DAYS = [7, 30, 60, 100];

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function getLocalDayString(date = new Date()) {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    return `${y}-${m}-${d}`;
  }

  function parseDayString(day) {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function shiftDay(day, delta) {
    const date = parseDayString(day);
    date.setDate(date.getDate() + delta);
    return getLocalDayString(date);
  }

  function computeStreaks(activeDays, today) {
    const clean = [...new Set(activeDays || [])].filter(d => d && d <= today).sort();
    let longest = 0;
    let run = 0;
    let prev = null;
    for (const d of clean) {
      if (prev === null || shiftDay(prev, 1) === d) run += 1;
      else run = 1;
      if (run > longest) longest = run;
      prev = d;
    }

    const set = new Set(clean);
    let current = 0;
    const start = set.has(today) ? today : set.has(shiftDay(today, -1)) ? shiftDay(today, -1) : null;
    if (start) {
      let cursor = start;
      while (set.has(cursor)) {
        current += 1;
        cursor = shiftDay(cursor, -1);
      }
    }
    return { currentStreak: current, longestStreak: longest };
  }

  async function sync() {
    return syncLocal() || (await getData());
  }

  // Synchronous, optimistic version for the click path: updates the
  // current day's streak from in-memory state, persists via the Sync
  // queue and returns the streak synchronously — no network round-trip.
  function syncLocal() {
    const user = Auth.getCurrentUser();
    if (!user) return null;
    const uid = user.uid;
    const existing = (typeof Progress !== 'undefined') ? Progress.getState().streak : null;
    const streak = existing && typeof existing === 'object'
      ? existing
      : { activeDays: [], lastActiveDate: '', currentStreak: 0, longestStreak: 0, updatedAt: null };
    const today = getLocalDayString();
    if (!(streak.activeDays || []).includes(today)) {
      streak.activeDays = [...(streak.activeDays || []), today];
      streak.lastActiveDate = today;
      const c = computeStreaks(streak.activeDays, today);
      streak.currentStreak = c.currentStreak;
      streak.longestStreak = c.longestStreak;
      streak.updatedAt = new Date().toISOString();
      Progress.setStreak(streak);
      Sync.enqueueStreak(streak);
      Achievements.checkStreak(uid, streak.currentStreak);
    }
    return streak;
  }

  async function getData() {
    const user = Auth.getCurrentUser();
    if (!user) return null;
    const streak = (await Store.getStreak(user.uid)) || {
      activeDays: [],
      lastActiveDate: '',
      currentStreak: 0,
      longestStreak: 0,
      updatedAt: null,
    };
    const today = getLocalDayString();
    const c = computeStreaks(streak.activeDays, today);
    streak.currentStreak = c.currentStreak;
    streak.longestStreak = c.longestStreak;
    return streak;
  }

  function getWeek(streak, today = getLocalDayString()) {
    const set = new Set(streak ? streak.activeDays || [] : []);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = shiftDay(today, -i);
      days.push({ date: day, active: set.has(day), isToday: day === today });
    }
    return days;
  }

  return { getLocalDayString, parseDayString, shiftDay, computeStreaks, sync, syncLocal, getData, getWeek, STREAK_ACHIEVEMENT_DAYS };
})();