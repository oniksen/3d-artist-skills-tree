// ============================================================
// Progress — learning-progress model for the 3D skill tree.
// Scored per subtopic: skill score = mastered subtopics / total * maxWeight.
// Level unlocks when every required category of the level reaches
// LEVEL_UNLOCK_THRESHOLD (%). Mirrors the android-skills-tree logic.
// ============================================================

const LEVEL_UNLOCK_THRESHOLD = 80;

const Progress = (() => {
  const state = {
    uid: null,
    progress: null,
    assessments: {},
    streak: null,
    achievements: [],
  };

  let cachedOwnerUid = null;
  let ownerResolvePromise = null;

  // Guest (view-only) mode: resolves the owner account uid from the
  // public pointer doc so guests can READ the owner's progress while
  // remaining unable to modify it (isReadonly() stays true).
  async function resolveOwnerUid() {
    if (cachedOwnerUid !== null) return cachedOwnerUid;
    if (ownerResolvePromise) return ownerResolvePromise;
    ownerResolvePromise = (async () => {
      try {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          const snap = await firebase.firestore().doc('public/owner/main').get();
          const data = snap.exists ? snap.data() : null;
          cachedOwnerUid = (data && data.uid) || null;
        } else {
          cachedOwnerUid = null;
        }
      } catch (_) {
        cachedOwnerUid = null;
      }
      ownerResolvePromise = null;
      return cachedOwnerUid;
    })();
    return ownerResolvePromise;
  }

  function currentUid() {
    const user = Auth.getCurrentUser();
    return user ? user.uid : cachedOwnerUid;
  }

  function isReadonly() {
    return !Auth.getCurrentUser();
  }

  function clampScore(score, maxWeight) {
    const s = Math.max(0, Math.round(score || 0));
    return Math.min(s, maxWeight || 1);
  }

  function clearState() {
    state.uid = null;
    state.progress = null;
    state.assessments = {};
    state.streak = null;
    state.achievements = [];
  }

  async function refresh() {
    const id = Auth.getCurrentUser()
      ? currentUid()
      : await resolveOwnerUid();
    if (!id) {
      clearState();
      return state;
    }
    const [progress, assessments, streak, achievements] = await Promise.all([
      Store.getProgress(id),
      Store.getAssessments(id),
      Store.getStreak(id),
      Store.getAchievements(id),
    ]);
    state.uid = id;
    state.progress = progress;
    state.assessments = assessments || {};
    state.streak = streak;
    state.achievements = achievements || [];
    return state;
  }

  // --- Sync getters (used by render functions) ---

  function getState() {
    return state;
  }

  function hasData() {
    return !!state.progress && !!state.uid;
  }

  function getAssessment(skillId) {
    return state.assessments[skillId] || null;
  }

  function getSkillScore(skillId) {
    const skill = getSkillById(skillId);
    if (!skill) return 0;
    const a = getAssessment(skillId);
    return a ? clampScore(a.score, skill.maxWeight) : 0;
  }

  function isSkillMastered(skillId) {
    const skill = getSkillById(skillId);
    const subs = skill?.subtopics || [];
    if (!subs.length) return false;
    const a = getAssessment(skillId);
    if (!a || !a.subtopics) return false;
    return subs.every((_, i) => !!a.subtopics[i]);
  }

  function getSkillProgress(skillId) {
    const skill = getSkillById(skillId);
    if (!skill) return { total: 0, done: 0, percent: 0, score: 0, max: 0 };
    const subs = skill.subtopics || [];
    const a = getAssessment(skillId);
    const done = subs.filter((_, i) => a && a.subtopics && a.subtopics[i]).length;
    const percent = subs.length ? Math.round((done / subs.length) * 100) : 0;
    return {
      total: subs.length,
      done,
      percent,
      score: clampScore(a?.score || 0, skill.maxWeight),
      max: skill.maxWeight,
    };
  }

  function getLevelSkills(level) {
    return getSkillsForLevel(level);
  }

  function getLevelScore(level) {
    const skills = getLevelSkills(level);
    const total = skills.reduce((s, sk) => s + (sk.maxWeight || 1), 0);
    const done = skills.reduce((s, sk) => s + Math.min(getSkillScore(sk.id), sk.maxWeight || 1), 0);
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { total, done, percent, count: skills.length };
  }

  function getCategoryScore(level, category) {
    const skills = getLevelSkills(level).filter(s => s.category === category);
    const total = skills.reduce((s, sk) => s + (sk.maxWeight || 1), 0);
    const done = skills.reduce((s, sk) => s + Math.min(getSkillScore(sk.id), sk.maxWeight || 1), 0);
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { total, done, percent, count: skills.length };
  }

  function getLevelCategories(level) {
    return [...new Set(getLevelSkills(level).map(s => s.category))];
  }

  function getCurrentLevelId() {
    return state.progress ? state.progress.currentLevelId : LEVEL_ORDER[0];
  }

  function isLevelUnlocked(level) {
    if (isReadonly()) return true;
    return !!(state.progress && (state.progress.unlockedLevelIds || []).includes(level));
  }

  function isLevelPassed(level) {
    if (isReadonly()) return false;
    const curIdx = LEVEL_ORDER.indexOf(getCurrentLevelId());
    return LEVEL_ORDER.indexOf(level) < curIdx;
  }

  function getTotalScore() {
    return state.progress ? state.progress.totalScore : 0;
  }

  async function ensureLoaded() {
    if (!state.progress && currentUid()) {
      await refresh();
    }
  }

  // --- Mutators ---

  async function toggleSubtopic(skillId, idx) {
    const id = currentUid();
    if (!id || isReadonly()) return null;
    await ensureLoaded();
    const skill = getSkillById(skillId);
    const subs = skill?.subtopics || [];
    if (!subs.length) return null;

    const existing = getAssessment(skillId);
    const subtopics = { ...(existing?.subtopics || {}) };
    const becomingNew = !subtopics[idx];
    subtopics[idx] = !subtopics[idx];
    const done = Object.keys(subtopics).filter(k => subtopics[k]).length;
    const score = Math.round((done / subs.length) * (skill.maxWeight || 1));
    const assessment = { score, subtopics, updatedAt: new Date().toISOString() };
    state.assessments[skillId] = assessment;
    state.uid = id;
    await Store.setAssessment(id, skillId, assessment);

    if (becomingNew) {
      try {
        const s = await Streak.sync();
        if (s) state.streak = s;
        Bus.emit('streak:change', s || null);
      } catch (_) {}
    }
    await recalculate();
    Bus.emit('progress:change', { skillId, score });
    return assessment;
  }

  async function recalculate() {
    const id = currentUid();
    if (!id) return;
    await ensureLoaded();
    const totalScore = Object.keys(state.assessments).reduce((sum, sid) => {
      const skill = getSkillById(sid);
      return sum + clampScore(state.assessments[sid].score, skill ? skill.maxWeight : 1);
    }, 0);
    await Store.updateProgress(id, { totalScore });
    if (state.progress) state.progress.totalScore = totalScore;
    await Achievements.evaluateProgress(id);
    await checkLevelUp();
  }

  async function checkLevelUp() {
    const id = currentUid();
    if (!id) return null;
    await ensureLoaded();
    if (!state.progress) return null;
    const cur = state.progress.currentLevelId;
    const curIdx = LEVEL_ORDER.indexOf(cur);
    if (curIdx === -1 || curIdx >= LEVEL_ORDER.length - 1) return null;
    const next = LEVEL_ORDER[curIdx + 1];

    const cats = getLevelCategories(cur);
    if (!cats.length) return null;
    const satisfied =
      cats.every(c => getCategoryScore(cur, c).percent >= LEVEL_UNLOCK_THRESHOLD) &&
      getLevelScore(cur).percent >= LEVEL_UNLOCK_THRESHOLD;
    if (!satisfied) return null;

    const unlocked = [...(state.progress.unlockedLevelIds || [])];
    if (!unlocked.includes(next)) unlocked.push(next);
    await Store.updateProgress(id, { currentLevelId: next, unlockedLevelIds: unlocked });
    state.progress.currentLevelId = next;
    state.progress.unlockedLevelIds = unlocked;

    const result = { fromLevel: cur, toLevel: next };
    await Achievements.evaluateLevelUp(id, result);
    Bus.emit('level:up', result);
    return result;
  }

  async function reset() {
    const id = currentUid();
    if (!id) return;
    await Store.resetProgress(id);
    await refresh();
    Bus.emit('progress:change', { reset: true });
  }

  return {
    refresh,
    isReadonly,
    getState,
    hasData,
    getAssessment,
    getSkillScore,
    isSkillMastered,
    getSkillProgress,
    getLevelSkills,
    getLevelScore,
    getCategoryScore,
    getLevelCategories,
    getCurrentLevelId,
    isLevelUnlocked,
    isLevelPassed,
    getTotalScore,
    toggleSubtopic,
    recalculate,
    checkLevelUp,
    reset,
  };
})();