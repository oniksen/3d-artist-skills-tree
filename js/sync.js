// ============================================================
// Sync — deferred write queue for remote (Firestore) persistence.
// Local mutations are committed to in-memory state immediately by
// the Progress/Streak/Achievements modules; the actual network
// writes are queued here and flushed when the page is left
// (pagehide / visibilitychange to hidden). A compact circular
// indicator in the top bar reflects the sync state.
//
// In local-only mode (FIREBASE_ENABLED=false) Store already writes
// synchronously, so Sync stays idle and the indicator stays hidden.
// ============================================================

const Sync = (() => {
  const MIRROR_KEY = uid => `sts_sync_${uid}`;

  const state = {
    status: 'synced', // 'synced' | 'dirty' | 'syncing' | 'error'
    progress: 0,      // 0..1 while syncing
    dirty: false,
    lastError: null,
  };

  let pending = freshPending();
  let syncInFlight = null;
  let initialized = false;

  function freshPending() {
    return { assessments: {}, progress: {}, streak: null, achievements: [], reset: false };
  }

  function uid() {
    const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;
    return user ? user.uid : null;
  }

  function remote() {
    return typeof Store !== 'undefined' && Store.isFirestore();
  }

  function isDirty() {
    return state.dirty;
  }

  function countOps() {
    let n = Object.keys(pending.assessments).length;
    if (Object.keys(pending.progress).length) n += 1;
    if (pending.streak) n += 1;
    n += pending.achievements.length;
    if (pending.reset) n = 1;
    return n;
  }

  function setDirty() {
    state.dirty = (
      Object.keys(pending.assessments).length > 0 ||
      Object.keys(pending.progress).length > 0 ||
      !!pending.streak ||
      pending.achievements.length > 0 ||
      !!pending.reset
    );
  }

  function notify() {
    Bus.emit('sync:change', {
      status: state.status,
      progress: state.progress,
      dirty: state.dirty,
      error: state.lastError,
    });
  }

  // Mirror: survives a hard crash between a click and the exit flush.
  function mirrorPersist() {
    const id = uid();
    if (remote() && id) {
      try { localStorage.setItem(MIRROR_KEY(id), JSON.stringify(pending)); } catch (_) {}
    }
  }

  function mirrorClear() {
    const id = uid();
    if (remote() && id) {
      try { localStorage.removeItem(MIRROR_KEY(id)); } catch (_) {}
    }
  }

  // --- Enqueue (called synchronously by mutators) ---
  // Remote mode: coalesce into the pending queue, flush on page exit.
  // Local mode: Store writes are already synchronous — write straight through.

  function enqueueAssessment(skillId, assessment) {
    const id = uid();
    if (!remote()) {
      if (id) Store.setAssessment(id, skillId, assessment);
      return;
    }
    pending.assessments[skillId] = assessment;
    afterEnqueue();
  }

  function enqueueProgress(patch) {
    const id = uid();
    if (!remote()) {
      if (id) Store.updateProgress(id, patch);
      return;
    }
    Object.assign(pending.progress, patch);
    afterEnqueue();
  }

  function enqueueStreak(streak) {
    const id = uid();
    if (!remote()) {
      if (id) Store.setStreak(id, streak);
      return;
    }
    pending.streak = streak;
    afterEnqueue();
  }

  function enqueueAchievement(record) {
    const id = uid();
    if (!remote()) {
      if (id) Store.addAchievement(id, record);
      return;
    }
    pending.achievements.push(record);
    afterEnqueue();
  }

  function enqueueReset() {
    const id = uid();
    if (!remote()) {
      if (id) Store.resetProgress(id);
      return;
    }
    pending = freshPending();
    pending.reset = true;
    afterEnqueue();
    mirrorPersist();
  }

  function afterEnqueue() {
    setDirty();
    if (state.status === 'synced') state.status = 'dirty';
    mirrorPersist();
    notify();
  }

  // --- Flush ---

  function flush() {
    if (syncInFlight) return syncInFlight;
    if (!remote()) {
      state.status = 'synced';
      state.progress = state.dirty ? 1 : state.progress;
      state.dirty = false;
      notify();
      return Promise.resolve();
    }
    const id = uid();
    if (!id || (!state.dirty && !Object.keys(pending.assessments).length)) {
      state.status = 'synced';
      state.progress = state.dirty ? 1 : state.progress;
      state.dirty = false;
      notify();
      return Promise.resolve();
    }

    state.status = 'syncing';
    state.progress = 0;
    state.lastError = null;
    notify();

    const total = countOps();
    let done = 0;

    const tick = () => {
      done += 1;
      state.progress = Math.min(1, done / total);
      notify();
    };

    syncInFlight = (async () => {
      const snapshot = {
        assessments: Object.assign({}, pending.assessments),
        progress: Object.assign({}, pending.progress),
        streak: pending.streak,
        achievements: pending.achievements.slice(),
        reset: pending.reset,
      };
      try {
        if (snapshot.reset) {
          await Store.resetProgress(id);
        } else {
          const keys = Object.keys(snapshot.assessments);
          for (const sid of keys) {
            await Store.setAssessment(id, sid, snapshot.assessments[sid]);
            tick();
          }
          if (Object.keys(snapshot.progress).length) {
            await Store.updateProgress(id, snapshot.progress);
            tick();
          }
          if (snapshot.streak) {
            await Store.setStreak(id, snapshot.streak);
            tick();
          }
          for (const rec of snapshot.achievements) {
            await Store.addAchievement(id, rec);
            tick();
          }
        }
        // Drop only what was flushed — keep anything that arrived mid-flush.
        if (snapshot.reset) {
          pending = freshPending();
        } else {
          Object.keys(snapshot.assessments).forEach(sid => delete pending.assessments[sid]);
          Object.keys(snapshot.progress).forEach(k => delete pending.progress[k]);
          if (pending.streak === snapshot.streak) pending.streak = null;
          pending.achievements = pending.achievements.filter(r => !snapshot.achievements.includes(r));
        }
        setDirty();
        if (!state.dirty) mirrorClear();
        else mirrorPersist();
        state.status = state.dirty ? 'dirty' : 'synced';
        state.progress = 1;
      } catch (err) {
        console.warn('[sync] flush failed:', err && (err.code || err.message) || err);
        state.status = 'error';
        state.lastError = err;
      }
      notify();
      syncInFlight = null;
    })();

    return syncInFlight;
  }

  function getState() {
    return {
      status: state.status,
      progress: state.progress,
      dirty: state.dirty,
      error: state.lastError,
    };
  }

  function getPendingProgress() {
    return pending.progress || {};
  }

  function resetSession() {
    pending = freshPending();
    state.status = 'synced';
    state.progress = 0;
    state.dirty = false;
    state.lastError = null;
    syncInFlight = null;
    mirrorClear();
    notify();
  }

  // --- Hooks ---

  function init() {
    if (!initialized) {
      initialized = true;
      window.addEventListener('pagehide', () => { flush(); });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
        else if (state.status === 'error') flush();
      });
      window.addEventListener('online', () => {
        if (state.status === 'error') flush();
      });
    }
    hydrateFromMirror();
  }

  // A previous session may have queued writes that never flushed
  // (e.g. tab killed). Push them to Firestore on next start.
  async function hydrateFromMirror() {
    const id = uid();
    if (!remote() || !id) return;
    let raw = null;
    try { raw = localStorage.getItem(MIRROR_KEY(id)); } catch (_) {}
    if (!raw) return;
    try {
      pending = Object.assign(freshPending(), JSON.parse(raw));
      setDirty();
      state.status = 'dirty';
      mirrorPersist();
      await flush();
    } catch (err) {
      console.warn('[sync] mirror hydration failed:', err);
      mirrorClear();
      pending = freshPending();
      state.dirty = false;
      notify();
    }
  }

  return {
    init,
    flush,
    getState,
    isDirty,
    resetSession,
    getPendingProgress,
    enqueueAssessment,
    enqueueProgress,
    enqueueStreak,
    enqueueAchievement,
    enqueueReset,
  };
})();