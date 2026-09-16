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
  let currentHashView = 'dashboard';

  // ---------- Header / stats ----------

  function refreshStats() {
    renderScoreChip();
    renderStreakBadge();
    renderUserMenu();
    renderSyncIndicator();
  }

  function renderScoreChip() {
    const chip = document.getElementById('scoreChip');
    const val = document.getElementById('scoreChipVal');
    if (!chip || !val) return;
    const readonly = Progress.isReadonly();
    chip.classList.toggle('hidden', readonly && !Progress.hasData());
    if (!(readonly && !Progress.hasData())) val.textContent = Progress.getTotalScore();
  }

  function renderSyncIndicator() {
    const el = document.getElementById('syncIndicator');
    if (!el) return;
    const readonly = Progress.isReadonly();
    const remote = typeof Store !== 'undefined' && Store.isFirestore();
    if (!remote || readonly) {
      el.classList.add('hidden');
      return;
    }
    const s = (typeof Sync !== 'undefined') ? Sync.getState() : { status: 'synced', progress: 0 };
    el.classList.remove('hidden');
    el.classList.remove('is-synced', 'is-dirty', 'is-syncing', 'is-error', 'is-clickable');
    el.classList.add('is-' + s.status);
    if (s.status === 'dirty' || s.status === 'error') el.classList.add('is-clickable');
    const core = document.getElementById('syncCore');
    if (core) {
      if (s.status === 'syncing') {
        core.textContent = Math.round((s.progress || 0) * 100) || '';
      } else if (s.status === 'synced') {
        core.innerHTML = Icons.svg('circle-check', 14);
      } else if (s.status === 'error') {
        core.innerHTML = Icons.svg('triangle-alert', 13);
      } else {
        core.innerHTML = '';
      }
    }
    el.title = I18n.t('sync_' + s.status) || '';
  }

  function updateSyncTip(force) {
    const tip = document.getElementById('syncTip');
    const status = document.getElementById('syncTipStatus');
    const now = document.getElementById('syncNowBtn');
    if (!tip || !status || !now) return;
    const s = (typeof Sync !== 'undefined') ? Sync.getState() : { status: 'synced' };
    if (force && (s.status === 'dirty' || s.status === 'error')) {
      tip.classList.add('visible');
    } else {
      tip.classList.remove('visible');
      return;
    }
    status.textContent = I18n.t('sync_' + s.status);
    now.textContent = I18n.t('sync_now');
  }

  function renderStreakBadge() {
    const badge = document.getElementById('streakBadge');
    if (!badge) return;
    const readonly = Progress.isReadonly();
    badge.classList.toggle('hidden', readonly && !Progress.hasData());
    if (readonly && !Progress.hasData()) {
      const popover = document.getElementById('streakPopover');
      if (popover) popover.classList.add('hidden');
      return;
    }
    const data = Progress.getState().streak;
    const st = data && typeof data === 'object' ? data : {};
    const current = st.currentStreak ? st.currentStreak : 0;
    badge.innerHTML = `<button class="streak-badge-btn" title="${I18n.t('streak_badge_title')}">${Icons.svg('flame', 16)} <span>${current}</span></button>`;
    badge.querySelector('button').addEventListener('click', toggleStreakPopover);
  }

  // Shared builder for the account area (profile + stats + actions). Used by
  // both the desktop user menu dropdown and the compact settings menu.
  function buildAccountBody(user) {
    if (!user) {
      return `
        <div class="um-profile um-profile-guest">
          <div class="um-avatar-ring"><span class="um-big-avatar">${Icons.svg('log-in', 22)}</span></div>
          <div class="um-profile-text">
            <div class="um-name">${I18n.t('auth_login_title')}</div>
            <div class="um-since">${I18n.t('auth_required_progress')}</div>
          </div>
        </div>
        <div class="um-actions">
          <button class="um-item" id="umSignIn" role="menuitem"><span class="um-item-icon">${Icons.svg('log-in', 16)}</span><span>${I18n.t('auth_login_btn')}</span></button>
        </div>`;
    }
    const initial = (user.displayName || user.email || 'U').slice(0, 1).toUpperCase();
    const memberSince = I18n.t('profile_since', {
      date: new Date(user.createdAt).toLocaleDateString(
        I18n.getLang() === 'ru' ? 'ru-RU' : 'en-US',
        { month: 'long', year: 'numeric' }
      ),
    });
    return `
      <div class="um-profile">
        <div class="um-avatar-ring"><span class="um-big-avatar">${initial}</span></div>
        <div class="um-profile-text">
          <div class="um-name">${user.displayName || user.email}</div>
          <div class="um-email">${user.email}</div>
          <div class="um-since">${memberSince}</div>
        </div>
      </div>
      <div class="um-stats">
        <div class="um-stat"><span class="um-stat-icon">${Icons.svg('star', 18)}</span><span class="um-stat-val" data-umstat="score">—</span><span class="um-stat-label">${I18n.t('profile_score')}</span></div>
        <div class="um-stat"><span class="um-stat-icon">${Icons.svg('flame', 18)}</span><span class="um-stat-val" data-umstat="streak">—</span><span class="um-stat-label">${I18n.t('streak_current')}</span></div>
        <div class="um-stat"><span class="um-stat-icon um-stat-level-ico">${Icons.svg('award', 18)}</span><span class="um-stat-val um-stat-level-name">—</span><span class="um-stat-label">${I18n.t('dash_current_level')}</span></div>
      </div>
      <div class="um-actions">
        <button class="um-item" id="umReset" role="menuitem"><span class="um-item-icon">${Icons.svg('refresh-cw', 16)}</span><span>${I18n.t('auth_reset_progress')}</span></button>
        <button class="um-item um-item-danger" id="umLogout" role="menuitem"><span class="um-item-icon">${Icons.svg('log-out', 16)}</span><span>${I18n.t('auth_logout')}</span></button>
      </div>`;
  }

  function refreshUmStats(root) {
    const scoreEl = root.querySelector('[data-umstat="score"]');
    const streakEl = root.querySelector('[data-umstat="streak"]');
    const levelIc = root.querySelector('.um-stat-level-ico');
    const levelNm = root.querySelector('.um-stat-level-name');
    if (!scoreEl || !streakEl) return;
    scoreEl.textContent = Progress.getTotalScore();
    const st = Progress.getState().streak;
    const streakData = st && typeof st === 'object' ? st : {};
    streakEl.textContent = streakData.currentStreak ? streakData.currentStreak : 0;
    if (levelNm) {
      const lv = Progress.getCurrentLevelId();
      levelNm.textContent = getLevelLabel(lv);
    }
  }

  // Binds account actions inside `root`. Returns nothing but wires up the DOM.
  function bindAccountBody(root) {
    const signIn = root.querySelector('#umSignIn');
    if (signIn) {
      signIn.addEventListener('click', openLogin);
      return;
    }
    const logout = root.querySelector('#umLogout');
    if (logout) {
      logout.addEventListener('click', async () => {
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
    }
    const resetBtn = root.querySelector('#umReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
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
  }

  function renderSettingsMenu() {
    const holder = document.getElementById('settingsAccount');
    const avatar = document.getElementById('settingsAvatar');
    const user = Auth.getCurrentUser();
    if (holder) {
      holder.innerHTML = buildAccountBody(user);
      bindAccountBody(holder);
    }
    if (avatar) {
      if (user) {
        const initial = (user.displayName || user.email || 'U').slice(0, 1).toUpperCase();
        avatar.innerHTML = `<span class="settings-initial">${initial}</span>`;
      } else {
        avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="luc"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>`;
      }
    }
  }

  function renderUserMenu() {
    const holder = document.getElementById('userMenu');
    if (!holder) return;
    const user = Auth.getCurrentUser();
    if (!user) {
      holder.innerHTML = `
        <button class="user-menu-btn login" id="userMenuBtn">
          <span class="um-avatar">${Icons.svg('log-in', 16)}</span>
          <span class="um-label">${I18n.t('auth_login_btn')}</span>
        </button>`;
      holder.querySelector('#userMenuBtn').addEventListener('click', openLogin);
      renderSettingsMenu();
      return;
    }
    const initial = (user.displayName || user.email || 'U').slice(0, 1).toUpperCase();
    holder.innerHTML = `
      <div class="user-menu" id="userMenuRoot">
        <button class="user-menu-btn" id="userMenuBtn" aria-haspopup="true" aria-expanded="false">
          <span class="um-avatar">${initial}</span>
          <span class="um-label">${user.displayName || user.email}</span>
        </button>
        <div class="user-menu-dropdown hidden" id="userMenuDropdown" role="menu">
          ${buildAccountBody(user)}
        </div>
      </div>`;
    const btn = holder.querySelector('#userMenuBtn');
    const dd = holder.querySelector('#userMenuDropdown');
    bindAccountBody(dd);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const willOpen = dd.classList.contains('hidden');
      if (willOpen) {
        refreshUmStats(dd);
        const sp = document.getElementById('streakPopover');
        if (sp) sp.classList.add('hidden');
        const sd = document.getElementById('settingsMenuDropdown');
        if (sd) sd.classList.add('hidden');
      }
      dd.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(willOpen));
    });
    renderSettingsMenu();
  }

  // ---------- Streak popover ----------

  function toggleStreakPopover() {
    const popover = document.getElementById('streakPopover');
    if (!popover) return;
    const isOpen = !popover.classList.contains('hidden');
    popover.classList.toggle('hidden', isOpen);
    if (!isOpen) {
      document.querySelectorAll('.user-menu-dropdown').forEach(dd => {
        if (!dd.classList.contains('hidden')) {
          dd.classList.add('hidden');
          const btn = document.querySelector('.user-menu-btn');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
      const sd = document.getElementById('settingsMenuDropdown');
      if (sd && !sd.classList.contains('hidden')) {
        sd.classList.add('hidden');
        const sb = document.getElementById('settingsMenuBtn');
        if (sb) sb.setAttribute('aria-expanded', 'false');
      }
      const data = Progress.getState().streak;
      const st = data && typeof data === 'object' ? data : {};
      const week = Streak.getWeek(st);
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
          <div class="ss-item"><span class="ss-val">${st.currentStreak || 0}</span><span class="ss-label">${I18n.t('streak_current')}</span></div>
          <div class="ss-item"><span class="ss-val">${st.longestStreak || 0}</span><span class="ss-label">${I18n.t('streak_longest')}</span></div>
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

  // ---------- Auth (login modal) ----------

  function openLogin() {
    renderLogin();
    const overlay = document.getElementById('loginOverlay');
    overlay.classList.add('active');
  }

  function closeLoginInternal(resetHash = true) {
    const overlay = document.getElementById('loginOverlay');
    overlay.classList.remove('active');
    if (resetHash && (location.hash === '#/login' || location.hash === '')) {
      history.replaceState(null, '', '#/dashboard');
    }
  }

  function renderLogin() {
    const content = document.getElementById('loginContent');
    content.innerHTML = `
      <div class="auth-inner">
        <button class="modal-close" id="loginCloseBtn">&times;</button>
        <div class="auth-icon">${Icons.svg('palette', 44)}</div>
        <h2>${I18n.t('auth_login_title')}</h2>
        <p class="auth-sub">${I18n.t('auth_login_sub')}</p>
        <form class="auth-form" id="authForm">
          <label class="auth-field">
            <span>${I18n.t('auth_email_label')}</span>
            <input type="email" id="authEmail" required autocomplete="email" placeholder="you@example.com">
          </label>
          <label class="auth-field">
            <span>${I18n.t('auth_password_label')}</span>
            <input type="password" id="authPassword" required minlength="6" autocomplete="current-password" placeholder="••••••••">
          </label>
          <p class="auth-error hidden" id="authError"></p>
          <button type="submit" class="auth-submit" id="authSubmit">
            ${I18n.t('auth_login_btn')}
          </button>
        </form>
      </div>`;
    content.querySelector('#loginCloseBtn').addEventListener('click', () => closeLoginInternal());
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
        const user = await Auth.signIn(email, password);
        await onAuthChanged(user);
        closeLoginInternal();
        Toast.show(I18n.t('auth_welcome', { name: user.displayName || user.email }), 'success');
      } catch (err) {
        const key = err.message || 'auth_error_generic';
        errBox.textContent = I18n.t(key) || I18n.t('auth_error_generic');
        errBox.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = I18n.t('auth_login_btn');
      }
    });
  }

  async function onAuthChanged() {
    if (typeof Sync !== 'undefined') {
      if (Auth.getCurrentUser()) Sync.init();
      else Sync.resetSession();
    }
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
    const hash = location.hash || '#/dashboard';
    const parts = hash.replace(/^#?\//, '').split('/');
    const view = parts[0] || 'dashboard';
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
      const defaultLevel = (Progress.isReadonly() && !Progress.hasData()) ? 'junior' : Progress.getCurrentLevelId();
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
      level_master: Icons.svg('crown', 18),
      level_up: Icons.svg('party-popper', 18),
      category_perfect: Icons.svg('star', 18),
      path_complete: Icons.svg('flag', 18),
      streak: Icons.svg('flame', 18),
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
    const ACH_ICON = { '👑': 'crown', '🎉': 'party-popper', '⭐': 'star', '🏁': 'flag', '🔥': 'flame' };
    const achIconName = ACH_ICON[def.icon];
    const iconSvg = achIconName ? Icons.svg(achIconName, 22) : def.icon;
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
    document.querySelectorAll('#sideNav .side-nav-link, #bottomNav .bottom-nav-btn[data-view]').forEach(link => {
      link.addEventListener('click', () => {
        location.hash = '#/' + link.dataset.view;
      });
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
      const sd = document.getElementById('settingsMenuDropdown');
      const sb = document.getElementById('settingsMenuBtn');
      if (sd && !sd.classList.contains('hidden') && !e.target.closest('.settings-menu')) {
        sd.classList.add('hidden');
        if (sb) sb.setAttribute('aria-expanded', 'false');
      }
      if (e.target.closest('#patchNotesBtnCompact')) {
        if (sd) sd.classList.add('hidden');
      }
    });

    const settingsMenuBtn = document.getElementById('settingsMenuBtn');
    if (settingsMenuBtn) {
      settingsMenuBtn.addEventListener('click', e => {
        e.stopPropagation();
        const dd = document.getElementById('settingsMenuDropdown');
        if (!dd) return;
        const willOpen = dd.classList.contains('hidden');
        if (willOpen) {
          const acc = document.getElementById('settingsAccount');
          if (acc) refreshUmStats(acc);
          const sp = document.getElementById('streakPopover');
          if (sp) sp.classList.add('hidden');
          document.querySelectorAll('.user-menu-dropdown').forEach(d => {
            if (!d.classList.contains('hidden')) {
              d.classList.add('hidden');
              const b = document.querySelector('.user-menu-btn');
              if (b) b.setAttribute('aria-expanded', 'false');
            }
          });
        }
        dd.classList.toggle('hidden');
        settingsMenuBtn.setAttribute('aria-expanded', String(willOpen));
      });
    }

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

    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator && typeof Sync !== 'undefined') {
      syncIndicator.addEventListener('click', () => {
        const s = Sync.getState();
        if (s.status === 'dirty' || s.status === 'error') Sync.flush();
      });
      syncIndicator.addEventListener('mouseenter', () => updateSyncTip(true));
      syncIndicator.addEventListener('mouseleave', () => updateSyncTip(false));
      const syncNow = document.getElementById('syncNowBtn');
      if (syncNow) {
        syncNow.addEventListener('click', e => {
          e.stopPropagation();
          Sync.flush();
        });
      }
    }
    Bus.on('sync:change', () => {
      renderSyncIndicator();
      updateSyncTip(false);
    });
  }

  return { init, refreshStats, renderAchievements, renderStreakBadge, route };
})();