// ============================================================
// Theme — three-state theme switcher (light / dark / system).
// Persists the choice in localStorage under the 'theme' key
// (default: 'system'). Applies the effective scheme as
// data-theme="light|dark" on <html> before first paint (see the
// inline script in index.html head) and re-applies it here,
// following OS changes when the user chose "system".
// ============================================================

const Theme = (() => {
  const KEY = 'theme';
  const DARK_BG = '#0a0a0f';
  const LIGHT_BG = '#f6f6fa';
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const modes = ['light', 'dark', 'system'];

  function get() {
    try {
      const val = localStorage.getItem(KEY);
      return modes.includes(val) ? val : 'system';
    } catch (e) {
      return 'system';
    }
  }

  function effective() {
    const mode = get();
    if (mode === 'system') return mq.matches ? 'dark' : 'light';
    return mode;
  }

  function apply() {
    const eff = effective();
    document.documentElement.setAttribute('data-theme', eff);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', eff === 'dark' ? DARK_BG : LIGHT_BG);
    return eff;
  }

  function syncButtons() {
    const mode = get();
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === mode);
    });
  }

  function set(mode) {
    if (!modes.includes(mode)) return;
    try {
      localStorage.setItem(KEY, mode);
    } catch (e) {}
    apply();
    syncButtons();
  }

  function initTitles() {
    refreshTitles();
  }

  function refreshTitles() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      const key = 'theme_' + btn.dataset.theme;
      if (typeof I18n !== 'undefined' && I18n.t) {
        btn.title = I18n.t(key) || key;
      }
    });
  }

  function init() {
    apply();
    syncButtons();
    initTitles();
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => set(btn.dataset.theme));
    });
    mq.addEventListener('change', () => {
      if (get() === 'system') apply();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { get, set, apply, effective, refreshTitles };
})();