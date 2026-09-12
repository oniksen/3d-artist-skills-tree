// ============================================================
// Toast — lightweight notification layer
// ============================================================
const Toast = (() => {
  function container() {
    return document.getElementById('toastContainer');
  }

  function show(message, type = 'info', persist = false) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-msg">${message}</span>`;
    if (persist) {
      const close = document.createElement('button');
      close.className = 'toast-close';
      close.textContent = '×';
      close.addEventListener('click', () => el.remove());
      el.appendChild(close);
    }
    container().appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, 4500);
    return el;
  }

  function achievement(record) {
    const type = record.type;
    const md = record.metadata || {};
    let text = '';
    if (type === 'streak') text = I18n.t('toast_streak', { days: md.days });
    else if (type === 'level_up') text = I18n.t('toast_level_up', { level: getLevelLabel(md.to_level) });
    else if (type === 'level_master') text = I18n.t('toast_level_master', { level: getLevelLabel(md.level_id) });
    else if (type === 'category_perfect') text = I18n.t('toast_category_perfect', { category: getCategoryLabel(md.category_id) });
    else if (type === 'path_complete') text = I18n.t('toast_path_complete');
    else return;
    const el = show(`${I18n.t('toast_achievement_title')} ${text}`, 'achievement', true);
    el.classList.add('toast-achievement');
  }

  return { show, achievement };
})();

// ============================================================
// View — adaptive header, navigation, achievements, auth UI,
// streak badge/popover and hash routing (#/tree, #/achievements, #/login)
// ============================================================
const View = (() => {
  let currentHashView = 'tree';

  // ---------- Header / stats ----------

  function refreshStats() {
    renderScoreChip();
    renderStreakBadge();
    renderUserMenu();
    renderBottomNav();
  }

  function renderScoreChip() {
    const chip = document.getElementById('scoreChip');
    const val = document.getElementById('scoreChipVal');
    if (!chip || !val) return;
    const readonly = Progress.isReadonly();
    chip.classList.toggle('hidden', readonly);
    if (!readonly) val.textContent = Progress.getTotalScore();
  }

  function renderStreakBadge() {
    const badge = document.getElementById('streakBadge');
    if (!badge) return;
    const readonly = Progress.isReadonly();
    badge.classList.toggle('hidden', readonly);
    if (readonly) return;
    const data = Progress.getState().streak;
    const current = data && data.currentStreak ? data.currentStreak : 0;
    badge.innerHTML = `<button class="streak-badge-btn" title="${I18n.t('streak_badge_title')}">🔥 <span>${current}</span></button>`;
    badge.querySelector('button').addEventListener('click', toggleStreakPopover);
  }

  function renderUserMenu() {
    const holder = document.getElementById('userMenu');
    if (!holder) return;
    const user = Auth.getCurrentUser();
    if (!user) {
      holder.innerHTML = `
        <button class="user-menu-btn login" id="userMenuBtn">
          <span class="um-avatar">👤</span>
          <span class="um-label">${I18n.t('auth_login_btn')}</span>
        </button>`;
      holder.querySelector('#userMenuBtn').addEventListener('click', openLogin);
      return;
    }
    const initial = (user.displayName || user.email || 'U').slice(0, 1).toUpperCase();
    holder.innerHTML = `
      <div class="user-menu" id="userMenuRoot">
        <button class="user-menu-btn" id="userMenuBtn">
          <span class="um-avatar">${initial}</span>
          <span class="um-label">${user.displayName || user.email}</span>
        </button>
        <div class="user-menu-dropdown hidden" id="userMenuDropdown">
          <div class="um-header">${user.email}</div>
          <button class="um-item" id="umReset">${I18n.t('auth_reset_progress')}</button>
          <button class="um-item" id="umLogout">${I18n.t('auth_logout')}</button>
        </div>
      </div>`;
    const btn = holder.querySelector('#userMenuBtn');
    const dd = holder.querySelector('#userMenuDropdown');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      dd.classList.toggle('hidden');
    });
    holder.querySelector('#umLogout').addEventListener('click', async () => {
      closeLoginInternal(false);
      await Auth.signOut();
      await Progress.refresh();
      currentLevel = 'junior';
      View.refreshStats();
      buildLevelNav();
      renderLevelInfo();
      renderSkills();
      renderAchievements();
      Toast.show(I18n.t('auth_logged_out'), 'info');
    });
    holder.querySelector('#umReset').addEventListener('click', async () => {
      if (confirm(I18n.t('auth_reset_confirm'))) {
        await Progress.reset();
        currentLevel = Progress.getCurrentLevelId();
        View.refreshStats();
        buildLevelNav();
        renderLevelInfo();
        renderSkills();
        renderAchievements();
        Toast.show(I18n.t('auth_progress_reset'), 'info');
      }
    });
  }

  // ---------- Streak popover ----------

  function toggleStreakPopover() {
    const popover = document.getElementById('streakPopover');
    if (!popover) return;
    const isOpen = !popover.classList.contains('hidden');
    popover.classList.toggle('hidden', isOpen);
    if (!isOpen) {
      const data = Progress.getState().streak;
      const week = Streak.getWeek(data);
      const today = Streak.getLocalDayString();
      const dateLabel = d => {
        const parsed = Streak.parseDayString(d);
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        return I18n.t('weekday_' + days[parsed.getDay()]).slice(0, 3);
      };
      popover.innerHTML = `
        <div class="streak-pop-head">
          <span>${I18n.t('streak_popover_title')}</span>
          <button class="streak-pop-close" id="streakPopClose">×</button>
        </div>
        <div class="streak-week">
          ${week.map(d => `
            <div class="streak-day${d.active ? ' active' : ''}${d.isToday ? ' today' : ''}">
              <span class="sd-date">${dateLabel(d.date)}</span>
              <span class="sd-dot"></span>
            </div>`).join('')}
        </div>
        <div class="streak-stats">
          <div class="ss-item"><span class="ss-val">${data ? data.currentStreak : 0}</span><span class="ss-label">${I18n.t('streak_current')}</span></div>
          <div class="ss-item"><span class="ss-val">${data ? data.longestStreak : 0}</span><span class="ss-label">${I18n.t('streak_longest')}</span></div>
        </div>`;
      const closeBtn = popover.querySelector('#streakPopClose');
      if (closeBtn) closeBtn.addEventListener('click', () => popover.classList.add('hidden'));
      document.addEventListener('click', function out(e) {
        const badge = document.getElementById('streakBadge');
        if (badge && !badge.contains(e.target) && !popover.contains(e.target)) {
          popover.classList.add('hidden');
          document.removeEventListener('click', out);
        }
      });
    }
  }

  // ---------- Bottom nav ----------

  function renderBottomNav() {
    const authBtn = document.getElementById('bottomAuthBtn');
    if (!authBtn) return;
    const user = Auth.getCurrentUser();
    authBtn.classList.toggle('is-logged', !!user);
  }

  // ---------- Auth (login modal) ----------

  let loginMode = 'login';

  function openLogin() {
    loginMode = 'login';
    renderLogin();
    const overlay = document.getElementById('loginOverlay');
    overlay.classList.add('active');
  }

  function closeLoginInternal(resetHash = true) {
    const overlay = document.getElementById('loginOverlay');
    overlay.classList.remove('active');
    if (resetHash && (location.hash === '#/login' || location.hash === '')) {
      history.replaceState(null, '', '#/tree');
    }
  }

  function renderLogin() {
    const content = document.getElementById('loginContent');
    const isSignup = loginMode === 'signup';
    content.innerHTML = `
      <div class="auth-inner">
        <button class="modal-close" id="loginCloseBtn">&times;</button>
        <div class="auth-icon">🎨</div>
        <h2>${isSignup ? I18n.t('auth_signup_title') : I18n.t('auth_login_title')}</h2>
        <p class="auth-sub">${isSignup ? I18n.t('auth_signup_sub') : I18n.t('auth_login_sub')}</p>
        <form class="auth-form" id="authForm">
          <label class="auth-field">
            <span>${I18n.t('auth_email_label')}</span>
            <input type="email" id="authEmail" required autocomplete="email" placeholder="you@example.com">
          </label>
          <label class="auth-field">
            <span>${I18n.t('auth_password_label')}</span>
            <input type="password" id="authPassword" required minlength="6" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="••••••••">
          </label>
          <p class="auth-error hidden" id="authError"></p>
          <button type="submit" class="auth-submit" id="authSubmit">
            ${isSignup ? I18n.t('auth_signup_btn') : I18n.t('auth_login_btn')}
          </button>
        </form>
        <button class="auth-switch" id="authSwitch">
          ${isSignup ? I18n.t('auth_switch_to_login') : I18n.t('auth_switch_to_signup')}
        </button>
      </div>`;
    content.querySelector('#loginCloseBtn').addEventListener('click', () => closeLoginInternal());
    content.querySelector('#authSwitch').addEventListener('click', () => {
      loginMode = isSignup ? 'login' : 'signup';
      renderLogin();
    });
    const form = content.querySelector('#authForm');
    const errBox = content.querySelector('#authError');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = content.querySelector('#authEmail').value;
      const password = content.querySelector('#authPassword').value;
      const btn = content.querySelector('#authSubmit');
      btn.disabled = true;
      btn.textContent = '…';
      errBox.classList.add('hidden');
      try {
        const user = isSignup
          ? await Auth.signUp(email, password)
          : await Auth.signIn(email, password);
        await onAuthChanged(user);
        closeLoginInternal();
        Toast.show(I18n.t('auth_welcome', { name: user.displayName || user.email }), 'success');
      } catch (err) {
        const key = err.message || 'auth_error_generic';
        errBox.textContent = I18n.t(key) || I18n.t('auth_error_generic');
        errBox.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = isSignup ? I18n.t('auth_signup_btn') : I18n.t('auth_login_btn');
      }
    });
  }

  async function onAuthChanged() {
    await Progress.refresh();
    if (!Progress.isReadonly()) {
      const cur = Progress.getCurrentLevelId();
      if (LEVEL_ORDER.includes(cur)) currentLevel = cur;
    }
    refreshStats();
    buildLevelNav();
    renderLevelInfo();
    renderSkills();
    if (currentHashView === 'achievements') renderAchievements();
    else if (currentHashView === 'dashboard') renderDashboard();
    else if (currentHashView === 'roadmap') renderRoadmap();
  }

  // ---------- Router ----------

  function route() {
    const hash = location.hash || '#/tree';
    const parts = hash.replace(/^#?\//, '').split('/');
    const view = parts[0] || 'tree';
    if (view === 'login') {
      openLogin();
      return;
    }
    if (view === 'achievements' || view === 'dashboard' || view === 'roadmap') {
      showView(view);
      return;
    }
    showView('tree');
    const level = parts[1];
    if (level && LEVEL_ORDER.includes(level)) {
      selectLevel(level);
    } else {
      const defaultLevel = Progress.isReadonly() ? 'junior' : Progress.getCurrentLevelId();
      selectLevel(LEVEL_ORDER.includes(defaultLevel) ? defaultLevel : 'junior');
    }
  }

  function showView(name) {
    currentHashView = name;
    const views = {
      tree: 'viewTree',
      roadmap: 'viewRoadmap',
      dashboard: 'viewDashboard',
      achievements: 'viewAchievements',
    };
    Object.keys(views).forEach(key => {
      const el = document.getElementById(views[key]);
      if (el) el.hidden = key !== name;
    });
    if (name === 'achievements') renderAchievements();
    else if (name === 'dashboard') renderDashboard();
    else if (name === 'roadmap') renderRoadmap();
    document.querySelectorAll('#sideNav .side-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === name);
    });
    document.querySelectorAll('#bottomNav .bottom-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
    window.scrollTo({ top: 0 });
  }

  // ---------- Achievements view ----------

  function renderAchievements() {
    const grid = document.getElementById('achievementsGrid');
    const summary = document.getElementById('achSummary');
    if (!grid) return;
    const { defs, groups } = Achievements.getCatalog();
    const earned = Progress.getState().achievements || [];
    const earnedCount = defs.filter(d => earned.some(r => Achievements.matches(d, r))).length;

    summary.innerHTML = `
      <div class="ach-summary-bar">
        <div class="ach-summary-fill" style="width:${defs.length ? Math.round((earnedCount / defs.length) * 100) : 0}%"></div>
      </div>
      <div class="ach-summary-text">${I18n.t('ach_earned_of', { earned: earnedCount, total: defs.length })}</div>`;

    const groupTitles = {
      level_master: I18n.t('ach_group_level_master'),
      level_up: I18n.t('ach_group_level_up'),
      category_perfect: I18n.t('ach_group_categories'),
      path_complete: I18n.t('ach_group_journey'),
      streak: I18n.t('ach_group_streak'),
    };
    const groupIcons = {
      level_master: '👑',
      level_up: '🎉',
      category_perfect: '⭐',
      path_complete: '🏁',
      streak: '🔥',
    };

    grid.innerHTML = groups.map(group => `
      <div class="ach-group">
        <div class="ach-group-head"><span>${groupIcons[group]}</span><span>${groupTitles[group]}</span></div>
        <div class="ach-grid">
          ${defs.filter(d => d.group === group).map(d => buildAchievementCard(d, earned)).join('')}
        </div>
      </div>`).join('');
  }

  function buildAchievementCard(def, earned) {
    const record = earned.find(r => Achievements.matches(def, r));
    const isEarned = !!record;
    let title, condition;
    const p = def.params;
    switch (def.type) {
      case 'level_master':
        title = I18n.t('ach_level_master', { level: getLevelLabel(p.level) });
        condition = I18n.t('cond_level_master', { level: getLevelLabel(p.level) });
        break;
      case 'level_up':
        title = I18n.t('ach_level_up', { level: getLevelLabel(p.level) });
        condition = I18n.t('cond_level_up', { level: getLevelLabel(p.level) });
        break;
      case 'category_perfect':
        title = I18n.t('ach_category_perfect', { category: getCategoryLabel(p.category) });
        condition = I18n.t('cond_category_perfect', { category: getCategoryLabel(p.category) });
        break;
      case 'path_complete':
        title = I18n.t('ach_path_complete');
        condition = I18n.t('cond_path_complete');
        break;
      case 'streak':
        title = I18n.t('ach_streak', { days: p.days });
        condition = I18n.t('cond_streak', { days: p.days });
        break;
      default:
        title = def.id;
        condition = '';
    }
    return `
      <div class="ach-card${isEarned ? ' earned' : ''}" data-id="${def.id}">
        <div class="ach-icon">${def.icon}</div>
        <div class="ach-info">
          <div class="ach-title">${title}</div>
          <div class="ach-cond">${condition}</div>
        </div>
        <div class="ach-state">${isEarned ? I18n.t('ach_earned') : I18n.t('ach_not_earned')}</div>
      </div>`;
  }

  // ---------- Toasts on events ----------

  function achievementToast(record) {
    Toast.achievement(record);
    if (currentHashView === 'achievements') renderAchievements();
  }

  function levelUpToast(result) {
    selectLevel(result.toLevel);
    Toast.show(I18n.t('toast_level_unlocked', { level: getLevelLabel(result.toLevel) }), 'success');
    if (currentHashView === 'achievements') renderAchievements();
  }

  // ---------- Init ----------

  function init() {
    refreshStats();
    document.getElementById('brandBtn').addEventListener('click', () => {
      location.hash = '#/tree';
    });
    document.getElementById('sideBrandBtn').addEventListener('click', () => {
      location.hash = '#/tree';
    });
    document.querySelectorAll('#sideNav .side-nav-link, #bottomNav .bottom-nav-btn[data-view]').forEach(link => {
      link.addEventListener('click', () => {
        location.hash = '#/' + link.dataset.view;
      });
    });
    document.getElementById('bottomAuthBtn').addEventListener('click', () => {
      if (Auth.getCurrentUser()) {
        const btn = document.getElementById('userMenuBtn');
        if (btn) btn.click();
      } else {
        openLogin();
      }
    });
    const loginOverlay = document.getElementById('loginOverlay');
    loginOverlay.addEventListener('click', e => {
      if (e.target === loginOverlay) closeLoginInternal();
    });
    window.addEventListener('hashchange', route);

    document.addEventListener('click', e => {
      document.querySelectorAll('.user-menu-dropdown:not(.hidden)').forEach(dd => {
        if (!e.target.closest('.user-menu')) dd.classList.add('hidden');
      });
    });

    Auth.onAuthChange(user => {
      onAuthChanged(user);
    });
    Bus.on('progress:change', () => {
      refreshAfterProgress();
      if (currentHashView === 'dashboard') renderDashboard();
      else if (currentHashView === 'roadmap') renderRoadmap();
    });
    Bus.on('streak:change', () => {
      refreshStats();
      if (currentHashView === 'dashboard') renderDashboard();
    });
    Bus.on('achievement:new', record => achievementToast(record));
    Bus.on('level:up', result => levelUpToast(result));
  }

  return { init, refreshStats, renderAchievements, renderStreakBadge };
})();