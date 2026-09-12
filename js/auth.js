// ============================================================
// Auth — local-first authorization with a Firebase-shaped API.
// Users + password hashes live in localStorage; the session is
// a stored uid. When deploying to Firebase, replace this module's
// internals with createUserWithEmailAndPassword /
// signInWithEmailAndPassword / signOut (see js/firebase-config.js).
// The rest of the app only uses Auth.* — the swap is transparent.
// ============================================================

const Auth = (() => {
  const listeners = [];

  async function sha256(text) {
    try {
      if (crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* fall through to fallback */ }
    // Simple deterministic fallback for non-secure contexts.
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      h1 = ((h1 ^ text.charCodeAt(i)) * 16777619) >>> 0;
      h2 = ((h2 * 31) + text.charCodeAt(i)) >>> 0;
    }
    return `fallback_${h1.toString(16)}_${h2.toString(16)}`;
  }

  function assertAuthChanged() {
    const user = getCurrentUser();
    listeners.forEach(cb => { try { cb(user); } catch (e) { console.error(e); } });
  }

  function makeUid() {
    return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function getUsers() {
    return Store.getUsers();
  }

  function getCurrentUser() {
    const uid = Store.getSession();
    if (!uid) return null;
    const users = Store.getUsers();
    const record = users[uid];
    if (!record) return null;
    return { uid, email: record.email, displayName: record.displayName || '', createdAt: record.createdAt };
  }

  function onAuthChange(cb) {
    listeners.push(cb);
    return () => { const i = listeners.indexOf(cb); if (i !== -1) listeners.splice(i, 1); };
  }

  async function signUp(email, password) {
    const em = normalizeEmail(email);
    if (!em || !password) throw new Error('auth_invalid_fields');
    if (password.length < 6) throw new Error('auth_password_short');
    const users = getUsers();
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
    await signOut();
    Store.setSession(uid);
    assertAuthChanged();
    return { uid, email: em, displayName: record.displayName, createdAt: record.createdAt };
  }

  async function signIn(email, password) {
    const em = normalizeEmail(email);
    const users = getUsers();
    const record = Object.values(users).find(u => u.email === em);
    if (!record) throw new Error('auth_wrong_credentials');
    const hash = await sha256(em + ':' + password);
    if (hash !== record.passwordHash) throw new Error('auth_wrong_credentials');
    Store.setSession(record.uid);
    assertAuthChanged();
    return { uid: record.uid, email: record.email, displayName: record.displayName, createdAt: record.createdAt };
  }

  async function signOut() {
    Store.clearSession();
    assertAuthChanged();
    return null;
  }

  return { signUp, signIn, signOut, getCurrentUser, onAuthChange };
})();