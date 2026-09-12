// ============================================================
// FirestoreStore — Firestore-backed implementation of the Store
// interface (js/store.js). NOT ACTIVE while FIREBASE_ENABLED=false.
// Requires the Firebase JS SDK + firebase/firestore to be loaded.
// Uses the same document layout described in js/firebase-config.js.
// ============================================================

const FirestoreStore = (() => {
  function fb() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      throw new Error('Firebase SDK is not loaded.');
    }
    return firebase.firestore();
  }

  async function getDoc(path) {
    const snap = await fb().collection(path.split('/')[0]).doc(path.split('/').slice(1).join('/')).get();
    return snap.exists ? snap.data() : null;
  }

  async function setDoc(path, data) {
    await fb().collection(path.split('/')[0]).doc(path.split('/').slice(1).join('/')).set(data, { merge: true });
  }

  async function collectionDocs(path) {
    const snap = await fb().collection(path).get();
    const out = {};
    snap.forEach(d => { out[d.id] = d.data(); });
    return out;
  }

  return {
    getUsers: async () => {
      const snap = await fb().collection('users').get();
      const out = {};
      snap.forEach(d => { out[d.id] = d.data(); });
      return out;
    },
    saveUsers: async seeds => {
      // Local-only user registry; on Firestore this is replaced by Firebase Auth.
      await fb().collection('users').doc(seeds._uid || '_').set(seeds);
    },
    getSession: async () => localStorage.getItem('sts_session'),
    setSession: uid => Promise.resolve(localStorage.setItem('sts_session', uid)),
    clearSession: async () => localStorage.removeItem('sts_session'),

    getProgress: async uid => {
      const data = await getDoc(`users/${uid}/progress/current`);
      return Object.assign({ currentLevelId: LEVEL_ORDER[0], unlockedLevelIds: [LEVEL_ORDER[0]], totalScore: 0 }, data || {});
    },
    updateProgress: async (uid, patch) => {
      await setDoc(`users/${uid}/progress/current`, patch);
      const data = await getDoc(`users/${uid}/progress/current`);
      return Object.assign({ currentLevelId: LEVEL_ORDER[0], unlockedLevelIds: [LEVEL_ORDER[0]], totalScore: 0 }, data || {});
    },
    getAssessment: async (uid, skillId) => getDoc(`users/${uid}/assessments/${skillId}`),
    setAssessment: async (uid, skillId, assessment) => {
      await setDoc(`users/${uid}/assessments/${skillId}`, assessment);
      return assessment;
    },
    getAssessments: async uid => collectionDocs(`users/${uid}/assessments`),

    getStreak: async uid => getDoc(`users/${uid}/streaks/current`),
    setStreak: async (uid, streak) => {
      await setDoc(`users/${uid}/streaks/current`, streak);
      return streak;
    },

    getAchievements: async uid => {
      const docs = await collectionDocs(`users/${uid}/achievements`);
      return Object.values(docs).sort((a, b) => (a.achievedAt < b.achievedAt ? -1 : 1));
    },
    addAchievement: async (uid, achievement) => {
      const col = fb().collection(`users/${uid}/achievements`);
      await col.add(achievement);
      return achievement;
    },
    resetProgress: async uid => {
      const items = await collectionDocs(`users/${uid}/assessments`);
      const batch = fb().batch();
      Object.keys(items).forEach(id => batch.delete(fb().doc(`users/${uid}/assessments/${id}`)));
      await batch.commit();
      const progress = Object.assign({ currentLevelId: LEVEL_ORDER[0], unlockedLevelIds: [LEVEL_ORDER[0]], totalScore: 0 });
      await setDoc(`users/${uid}/progress/current`, progress);
      const streak = await getDoc(`users/${uid}/streaks/current`);
      return { progress, streak };
    },
  };
})();