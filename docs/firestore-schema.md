# Firestore Schema (port target)

This document describes the Firestore layout that `js/store-firestore.js` will
write once `FIREBASE_ENABLED = true` in `js/firebase-config.js`. The local
(offline-first) store writes the same shape into `localStorage` under the
`sts_*` key namespace, so switching backends is sequence-equivalent.

## Collections / Documents

### `users`
- Document ID: **userId** (`userId` collection — one document per registered account).
- Fields:
  - `email: string`
  - `passwordHash: string` (SHA-256 hex, assigned in local mode only)
  - `displayName: string | null`
  - `createdAt: server timestamp`

### `progress`
- Document ID: **`current`** (one progress record per user, keyed by userId).
- Fields:
  - `currentLevelId: string` — the active career level (e.g. `beginner`)
  - `unlockedLevelIds: string[]` — levels unlocked by hitting the ≥80% threshold
  - `totalScore: number` — sum of `min(skillScore, maxWeight)` across assessed skills
  - `updatedAt: server timestamp`

### `assessments`
- Document ID: **skillId** (e.g. `form-factors`, `retopology`).
- Fields:
  - `{userId}: { score, subtopics, updatedAt }` — one embedded map per user, so a
    single document holds every user's state for that skill.
  - Alternative: `assessments/{skillId}/users/{userId}` subcollection. Keep the
    flat map for read efficiency on a single skill; it is deliberate.
- Notes:
  - `score` is `round(doneSubtopics / totalSubtopics * maxWeight)`.
  - Two skills sharing one `taskId` share the same assessment (double-counting is
    prevented by capping at `maxWeight` during totals).

### `streaks`
- Document ID: **`current`** (per user).
- Fields:
  - `activeDays: string[]` — local `YYYY-MM-DD` dates of study activity
  - `lastActiveDate: string`
  - `currentStreak: number`
  - `longestStreak: number`
  - `currentStreakStart: string | null` — first date of the current run
  - `updatedAt: server timestamp`

### `achievements`
- Automatically generated document IDs (autoId per granted achievement).
- Fields:
  - `type: 'level_master' | 'level_up' | 'category_perfect' | 'path_complete' | 'streak'`
  - `metadata: object` — e.g. `{ level_id }`, `{ to_level }`, `{ category_id }`,
    `{ days }`
  - `achievedAt: server timestamp`

## Security rules (suggested)

Server-side (or, when people use their own Cloud Firestore):

```
match /users/{userId} { allow read, write: if request.auth.uid == userId; }
match /progress/current { allow read, write: if request.auth.uid != null; }
match /assessments/{skillId} { allow read, write: if request.auth.uid != null; }
match /streaks/current { allow read, write: if request.auth.uid != null; }
match /achievements/{id} { allow read, write: if request.auth.uid != null; }
```

## Local (localStorage) key namespace

| Key | Content |
| --- | --- |
| `sts_users` | map of userId → { email, passwordHash, displayName } |
| `sts_session` | current userId |
| `sts_userdata_<uid>_progress` | same shape as `progress/current` |
| `sts_userdata_<uid>_assessments` | map skillId → { score, subtopics, updatedAt } |
| `sts_userdata_<uid>_streak` | same shape as `streaks/current` |
| `sts_userdata_<uid>_achievements` | array of granted achievement records |