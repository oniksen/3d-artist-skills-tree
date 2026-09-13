// ============================================================
// Auth — authorization layer with a Firebase-shaped API.
// When the Firebase compat SDK is loaded, uses Firebase Auth
// (email/password, persistent session, restricted to the single
// owner account). Otherwise falls back to the legacy local
// (localStorage) implementation so the app degrades gracefully
// and the headless test harness keeps working.
// The rest of the app only uses Auth.* — the swap is transparent.
// ============================================================

const Auth = (() => {
  const ALLOWED_EMAIL = 'zadbanny@gmail.com';
  const listeners = [];

  // --- Engine selection ---

  function firebaseAuth() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      return firebase.auth();
    }
    return null;
  }

  function mapFirebaseUser(user) {
    if (!user) return null;
    const created = user.metadata && user.metadata.creationTime;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || (user.email ? user.email.split('@')[0] : ''),
      createdAt: created ? new Date(created).toISOString() : new Date().toISOString(),
    };
  }

  // --- Shared ---

  function assertAuthChanged() {
    const user = getCurrentUser();
    listeners.forEach(cb => { try { cb(user); } catch (e) { console.error(e); } });
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function firebaseErrorMessage(err) {
    const code = err && err.code ? err.code : '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
      case 'auth/invalid-login-credentials':
        return 'auth_wrong_credentials';
      case 'auth/too-many-requests':
        return 'auth_too_many_requests';
      case 'auth/network-request-failed':
        return 'auth_network_error';
      default:
        return 'auth_error_generic';
    }
  }

  function upsertProfile(user) {
    try {
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        firebase
          .firestore()
          .collection('users')
          .doc(user.uid)
          .set({ email: user.email, displayName: user.displayName, createdAt: user.createdAt }, { merge: true })
          .catch(() => {});
        firebase
          .firestore()
          .doc('public/owner/main')
          .set({ uid: user.uid, displayName: user.displayName, email: user.email, updatedAt: new Date().toISOString() }, { merge: true })
          .catch(() => {});
      }
    } catch (_) {}
  }

  // --- Firebase-backed public API ---

  function getCurrentUser() {
    const fa = firebaseAuth();
    if (fa) return mapFirebaseUser(fa.currentUser);
    return getCurrentUserLocal();
  }

  function onAuthChange(cb) {
    const fa = firebaseAuth();
    if (fa) return fa.onAuthStateChanged((user) => { try { cb(mapFirebaseUser(user)); } catch (e) { console.error(e); } });
    listeners.push(cb);
    return () => { const i = listeners.indexOf(cb); if (i !== -1) listeners.splice(i, 1); };
  }

  async function signIn(email, password) {
    const em = normalizeEmail(email);
    const fa = firebaseAuth();
    if (fa) {
      if (!em || !password) throw new Error('auth_invalid_fields');
      if (em !== ALLOWED_EMAIL) throw new Error('auth_email_not_allowed');
      try {
        const cred = await fa.signInWithEmailAndPassword(em, password);
        const user = mapFirebaseUser(cred.user);
        upsertProfile(user);
        assertAuthChanged();
        return user;
      } catch (err) {
        throw new Error(firebaseErrorMessage(err));
      }
    }
    return signInLocal(email, password);
  }

  async function signUp(email, password) {
    const fa = firebaseAuth();
    if (fa) throw new Error('auth_signup_disabled');
    return signUpLocal(email, password);
  }

  async function signOut() {
    const fa = firebaseAuth();
    if (fa) {
      await fa.signOut();
      assertAuthChanged();
      return null;
    }
    return signOutLocal();
  }

  // --- Legacy local fallback (localStorage) ---

  async function sha256(text) {
    try {
      if (crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* fall through to fallback */ }
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      h1 = ((h1 ^ text.charCodeAt(i)) * 16777619) >>> 0;
      h2 = ((h2 * 31) + text.charCodeAt(i)) >>> 0;
    }
    return `fallback_${h1.toString(16)}_${h2.toString(16)}`;
  }

  function makeUid() {
    return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function getCurrentUserLocal() {
    const uid = Store.getSession();
    if (!uid) return null;
    const users = Store.getUsers();
    const record = users[uid];
    if (!record) return null;
    return { uid, email: record.email, displayName: record.displayName || '', createdAt: record.createdAt };
  }

  async function signUpLocal(email, password) {
    const em = normalizeEmail(email);
    if (!em || !password) throw new Error('auth_invalid_fields');
    if (password.length < 6) throw new Error('auth_password_short');
    const users = Store.getUsers();
    const exists = Object.values(users).some(u => u.email === em);
    if (exists) throw new Error('auth_email_exists');
    const uid = makeUid();
    const hash = await sha256(em + ':' + password);
    const record = {
      uid,
      email: em,
      displayName: em.split('@')[0] || 'User',
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };
    users[uid] = record;
    Store.saveUsers(users);
    await signOutLocal();
    Store.setSession(uid);
    assertAuthChanged();
    return { uid, email: em, displayName: record.displayName, createdAt: record.createdAt };
  }

  async function signInLocal(email, password) {
    const em = normalizeEmail(email);
    const users = Store.getUsers();
    const record = Object.values(users).find(u => u.email === em);
    if (!record) throw new Error('auth_wrong_credentials');
    const hash = await sha256(em + ':' + password);
    if (hash !== record.passwordHash) throw new Error('auth_wrong_credentials');
    Store.setSession(record.uid);
    assertAuthChanged();
    return { uid: record.uid, email: record.email, displayName: record.displayName, createdAt: record.createdAt };
  }

  async function signOutLocal() {
    Store.clearSession();
    assertAuthChanged();
    return null;
  }

  return { signUp, signIn, signOut, getCurrentUser, onAuthChange };
})();