// ============================================================
// Achievements — catalog + event-driven awarding during learning.
// Types (mirrors android-skills-tree):
//   level_up          — completing a level (≥80% on its categories)
//   level_master      — 100% mastery of a level's required skills
//   category_perfect  — 100% mastery of every skill in a category
//   path_complete     — mastering every level
//   streak_<days>     — 7 / 30 / 60 / 100 day daily-study streaks
// ============================================================

const Achievements = (() => {
  function getCatalog() {
    const defs = [];

    LEVEL_ORDER.forEach((level, i) => {
      defs.push({
        id: `level_master:${level}`,
        type: 'level_master',
        group: 'level_master',
        icon: LEVEL_ICONS[level] || '👑',
        params: { level },
        matches: r => r.type === 'level_master' && r.metadata && r.metadata.level_id === level,
      });
      if (i < LEVEL_ORDER.length - 1) {
        const to = LEVEL_ORDER[i + 1];
        defs.push({
          id: `level_up:${to}`,
          type: 'level_up',
          group: 'level_up',
          icon: '🎉',
          params: { level: to },
          matches: r => r.type === 'level_up' && r.metadata && r.metadata.to_level === to,
        });
      }
    });

    Object.keys(CATEGORY_COLORS).forEach(cat => {
      defs.push({
        id: `category_perfect:${cat}`,
        type: 'category_perfect',
        group: 'category_perfect',
        icon: '⭐',
        params: { category: cat },
        matches: r => r.type === 'category_perfect' && r.metadata && r.metadata.category_id === cat,
      });
    });

    defs.push({
      id: 'path_complete',
      type: 'path_complete',
      group: 'path_complete',
      icon: '🏁',
      params: {},
      matches: r => r.type === 'path_complete',
    });

    Streak.STREAK_ACHIEVEMENT_DAYS.forEach(days => {
      defs.push({
        id: `streak:${days}`,
        type: 'streak',
        group: 'streak',
        icon: '🔥',
        params: { days },
        matches: r => r.type === 'streak' && r.metadata && r.metadata.days === days,
      });
    });

    return { defs, groups: ['level_master', 'level_up', 'category_perfect', 'path_complete', 'streak'] };
  }

  function matches(def, record) {
    return def.matches(record);
  }

  async function grant(uid, type, metadata, matchKey, matchValue) {
    const earned = await Store.getAchievements(uid);
    const existing = earned.find(r => {
      if (r.type !== type) return false;
      if (matchKey) return r.metadata && r.metadata[matchKey] === matchValue;
      return true;
    });
    if (existing) return null;
    const record = { type, metadata: metadata || {}, achievedAt: new Date().toISOString() };
    await Store.addAchievement(uid, record);
    Bus.emit('achievement:new', record);
    return record;
  }

  async function checkStreak(uid, currentStreak) {
    for (const days of Streak.STREAK_ACHIEVEMENT_DAYS) {
      if (currentStreak >= days) {
        await grant(uid, 'streak', { days }, 'days', days);
      }
    }
  }

  async function evaluateLevelUp(uid, { fromLevel, toLevel }) {
    await grant(uid, 'level_up', { from_level: fromLevel, to_level: toLevel }, 'to_level', toLevel);
  }

  async function evaluateProgress(uid) {
    // category_perfect — every skill in a category fully mastered.
    Object.keys(CATEGORY_COLORS).forEach(cat => {
      const skillIds = (DATA?.skills || []).filter(s => s.category === cat).map(s => s.id);
      if (skillIds.length && skillIds.every(id => Progress.isSkillMastered(id))) {
        grant(uid, 'category_perfect', { category_id: cat, category_name: cat }, 'category_id', cat);
      }
    });

    // level_master — every required skill of the level fully mastered.
    LEVEL_ORDER.forEach(level => {
      const score = Progress.getLevelScore(level);
      if (score.count && score.percent === 100) {
        grant(uid, 'level_master', { level_id: level }, 'level_id', level);
      }
    });

    // path_complete — all levels mastered.
    const allMastered = LEVEL_ORDER.every(level => {
      const score = Progress.getLevelScore(level);
      return score.count ? score.percent === 100 : true;
    });
    if (allMastered) {
      grant(uid, 'path_complete', {});
    }
  }

  return { getCatalog, matches, grant, checkStreak, evaluateLevelUp, evaluateProgress };
})();