// ============================================================
// Store — async data-access layer (Progress / Streak / Achievements).
// Two implementations with identical async API:
//   LocalStore      — persists to localStorage (used when FIREBASE_ENABLED=false)
//   FirestoreStore  — Firestore-backed (js/store-firestore.js), ready for deploy
// Swapping is transparent for the rest of the app.
// ============================================================

const DATA_KEYS = {
  users: 'sts_users',
  session: 'sts_session',
  userdata: uid => `sts_userdata_${uid}`,
};

const DEFAULT_PROGRESS = () => ({
  currentLevelId: LEVEL_ORDER[0],
  unlockedLevelIds: [LEVEL_ORDER[0]],
  totalScore: 0,
});

const LocalStore = (() => {
  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Failed to parse storage key:', key, e);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to write storage key:', key, e);
    }
  }

  function getData(uid) {
    const data = readJson(DATA_KEYS.userdata(uid), {});
    data.assessments = data.assessments || {};
    data.progress = Object.assign(DEFAULT_PROGRESS(), data.progress || {});
    data.streak = data.streak || null;
    data.achievements = data.achievements || [];
    return data;
  }

  function saveData(uid, data) {
    writeJson(DATA_KEYS.userdata(uid), data);
  }

  return {
    // --- Users ---
    getUsers: () => readJson(DATA_KEYS.users, {}),
    saveUsers: users => writeJson(DATA_KEYS.users, users),
    getSession: () => readJson(DATA_KEYS.session, null),
    setSession: uid => writeJson(DATA_KEYS.session, uid),
    clearSession: () => localStorage.removeItem(DATA_KEYS.session),

    // --- Progress ---
    getProgress: uid => Promise.resolve(getData(uid).progress),
    updateProgress: (uid, patch) => {
      const data = getData(uid);
      data.progress = Object.assign(data.progress, patch);
      saveData(uid, data);
      return Promise.resolve(data.progress);
    },
    getAssessment: (uid, skillId) => {
      const data = getData(uid);
      return Promise.resolve(data.assessments[skillId] || null);
    },
    setAssessment: (uid, skillId, assessment) => {
      const data = getData(uid);
      data.assessments[skillId] = assessment;
      saveData(uid, data);
      return Promise.resolve(assessment);
    },
    getAssessments: uid => Promise.resolve(getData(uid).assessments),

    // --- Streak ---
    getStreak: uid => Promise.resolve(getData(uid).streak),
    setStreak: (uid, streak) => {
      const data = getData(uid);
      data.streak = streak;
      saveData(uid, data);
      return Promise.resolve(streak);
    },

    // --- Achievements ---
    getAchievements: uid => Promise.resolve(getData(uid).achievements),
    addAchievement: (uid, achievement) => {
      const data = getData(uid);
      data.achievements.push(achievement);
      saveData(uid, data);
      return Promise.resolve(achievement);
    },
    resetProgress: uid => {
      const data = getData(uid);
      data.assessments = {};
      data.progress = DEFAULT_PROGRESS();
      const streak = data.streak;
      saveData(uid, data);
      return Promise.resolve({ progress: data.progress, streak });
    },
  };
})();

const Store = (() => {
  function firestoreAvailable() {
    return typeof FIREBASE_ENABLED !== 'undefined' &&
      FIREBASE_ENABLED &&
      typeof firebase !== 'undefined' &&
      typeof firebase.firestore === 'function';
  }

  function impl() {
    if (firestoreAvailable() && typeof FirestoreStore !== 'undefined') {
      return FirestoreStore;
    }
    return LocalStore;
  }

  return {
    isFirestore: () => firestoreAvailable() && typeof FirestoreStore !== 'undefined',

    getUsers: () => impl().getUsers(),
    saveUsers: users => impl().saveUsers(users),
    getSession: () => impl().getSession(),
    setSession: uid => impl().setSession(uid),
    clearSession: () => impl().clearSession(),

    getProgress: uid => impl().getProgress(uid),
    updateProgress: (uid, patch) => impl().updateProgress(uid, patch),
    getAssessment: (uid, skillId) => impl().getAssessment(uid, skillId),
    setAssessment: (uid, skillId, assessment) => impl().setAssessment(uid, skillId, assessment),
    getAssessments: uid => impl().getAssessments(uid),

    getStreak: uid => impl().getStreak(uid),
    setStreak: (uid, streak) => impl().setStreak(uid, streak),

    getAchievements: uid => impl().getAchievements(uid),
    addAchievement: (uid, achievement) => impl().addAchievement(uid, achievement),
    resetProgress: uid => impl().resetProgress(uid),
  };
})();