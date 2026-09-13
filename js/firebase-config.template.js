// ============================================================
// Firebase configuration template + guarded initialization.
// This is a TEMPLATE: the apiKey placeholder __FIREBASE_API_KEY__
// is replaced at build time by scripts/inject-firebase-config.js
// using the FIREBASE_API_KEY environment variable (set in the
// hosting environment, e.g. Vercel). Do not commit a real key here.
// The app runs in "cloud mode" when FIREBASE_ENABLED=true and the
// Firebase compat SDK is loaded (see index.html). If the SDK fails
// to load (offline first run, blocked CDN), the app falls back to
// the LocalStore / local Auth fallback so it never hard-crashes.
// The Store interface in js/store.js stays the same.
// ============================================================
const FIREBASE_ENABLED = true;

const FIREBASE_CONFIG = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "d-artist-skills-tree.firebaseapp.com",
  projectId: "d-artist-skills-tree",
  storageBucket: "d-artist-skills-tree.firebasestorage.app",
  messagingSenderId: "1097126167398",
  appId: "1:1097126167398:web:4fe90d4e09690303477ea7",
};

// Firestore document schema:
//   users/{uid}/users              { email, displayName, createdAt }
//   users/{uid}/progress/current   { currentLevelId, unlockedLevelIds:[], totalScore }
//   users/{uid}/assessments/{skillId} { score, subtopics:{[idx]:bool}, updatedAt }
//   users/{uid}/streaks/current    { activeDays:[YYYY-MM-DD], lastActiveDate, currentStreak, longestStreak, updatedAt }
//   users/{uid}/achievements/{autoId} { type, metadata:{}, achievedAt }
const FIRESTORE_SCHEMA = {
  users: {
    root: 'users/{uid}/users',
    progress: 'users/{uid}/progress/current',
    assessments: 'users/{uid}/assessments/{skillId}',
    streaks: 'users/{uid}/streaks/current',
    achievements: 'users/{uid}/achievements/{autoId}',
  },
};

if (typeof firebase !== 'undefined') {
  firebase.initializeApp(FIREBASE_CONFIG);

  firebase
    .firestore()
    .enablePersistence({ synchronizeTabs: true })
    .catch(() => {});

  window.__fbAuthReady = new Promise(resolve => {
    const unsub = firebase.auth().onAuthStateChanged(() => {
      unsub();
      resolve();
    });
  });
}