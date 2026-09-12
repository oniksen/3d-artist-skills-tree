// ============================================================
// Firebase configuration (deployment target).
// Keep FIREBASE_ENABLED=false to run fully local (localStorage).
// When deploying: fill the config below, load the Firebase SDK
// scripts in index.html and flip FIREBASE_ENABLED to true.
// The Store interface in js/store.js stays the same.
// ============================================================
const FIREBASE_ENABLED = false;

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// Firestore document schema — mirrors the android-skills-tree project:
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