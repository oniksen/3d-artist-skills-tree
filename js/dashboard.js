// ============================================================
// Dashboard — LevelProgressCard, QuickStats, StreakCard and
// NextMilestone adapted from android-skills-tree. The "projects"
// stat is replaced by "mastered skills" + "opened levels" since
// the 3D project has no portfolio-project concept. Level-up here
// is driven by the ≥80% per-category threshold. LEVEL_UNLOCK_THRESHOLD
// is a global declared in js/progress.js.
// ============================================================

function pluralize(n, one, few, many) {
  if (I18n.getLang() === 'ru') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }
  return n === 1 ? one : many;
}

function buildLevelProgressCard() {
  const state = Progress.getState();
  const currentId = Progress.getCurrentLevelId();
  const currentLevel = getLevelLabel(currentId);
  const idx = LEVEL_ORDER.indexOf(currentId);
  const next = idx !== -1 && idx < LEVEL_ORDER.length - 1
    ? LEVEL_ORDER[idx + 1]
    : null;

  const score = Progress.getLevelScore(currentId);
  let body;
  if (!next) {
    body = `<p class="dash-max-level" style="font-weight:600;font-size:14px">${I18n.t('dash_max_level')}</p>`;
  } else {
    const fill = Math.min((score.percent / LEVEL_UNLOCK_THRESHOLD) * 100, 100);
    const required = Math.ceil((LEVEL_UNLOCK_THRESHOLD / 100) * score.total);
    const remaining = Math.max(required - score.done, 0);
    body = `
      <div class="dash-bar"><div class="dash-bar-fill" style="width:${fill}%"></div></div>
      <div class="dash-bar-meta">
        <span class="dash-bar-pct">${score.percent}%</span>
        <span class="dash-bar-note">${I18n.t('dash_to_next', { level: getLevelLabel(next), points: remaining })}</span>
      </div>`;
  }

  return `
    <div class="dash-card glow-blue">
      <h2 class="dash-card-title">${I18n.t('dash_current_level')}</h2>
      <p class="dash-current-level${next ? '' : ' dash-max-level'}">${LEVEL_ICONS[currentId] || ''} ${currentLevel}</p>
      ${body}
      <div class="dash-hint">${I18n.t('dash_threshold_hint', { threshold: LEVEL_UNLOCK_THRESHOLD })}</div>
    </div>`;
}

function buildQuickStats() {
  const state = Progress.getState();
  const skills = DATA?.skills || [];
  const totalSkills = skills.length;
  const mastered = skills.filter(s => {
    const prog = Progress.getSkillProgress(s.id);
    return prog.total > 0 && prog.done === prog.total;
  }).length;
  const opened = (state.progress?.unlockedLevelIds || []).length;
  const totalLevels = LEVEL_ORDER.length;

  const masteredPct = totalSkills ? Math.min((mastered / totalSkills) * 100, 100) : 0;
  const openedPct = totalLevels ? Math.min((opened / totalLevels) * 100, 100) : 0;

  return `
    <div class="dash-card glow-purple">
      <h2 class="dash-card-title">${I18n.t('dash_stats_title')}</h2>
      <div class="dash-stat-row">
        <span>${I18n.t('dash_skills_mastered')}</span>
        <span class="dash-stat-value">${mastered}/${totalSkills}</span>
      </div>
      <div class="dash-bar"><div class="dash-bar-fill" style="width:${masteredPct}%"></div></div>
      <div class="dash-stat-row">
        <span>${I18n.t('dash_levels_opened')}</span>
        <span class="dash-stat-value">${opened}/${totalLevels}</span>
      </div>
      <div class="dash-bar"><div class="dash-bar-fill" style="width:${openedPct}%"></div></div>
    </div>`;
}

function buildStreakCard() {
  const data = Progress.getState().streak;
  const st = data && typeof data === 'object' ? data : {};
  const current = st.currentStreak ? st.currentStreak : 0;
  const longest = st.longestStreak ? st.longestStreak : 0;
  const week = Streak.getWeek(st);

  const daysCells = week.map(d => {
    const label = I18n.t('weekday_' + ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][Streak.parseDayString(d.date).getDay()]);
    const cls = ['dash-day-cell'];
    if (d.active) cls.push('active');
    if (d.isToday && !d.active) cls.push('istoday');
    return `
      <div class="dash-day">
        <span class="dash-day-label${d.isToday ? ' today' : ''}">${label.slice(0, 2)}</span>
        <div class="${cls.join(' ')}">${d.active ? Icons.svg('flame', 12) : ''}</div>
      </div>`;
  }).join('');

  return `
    <div class="dash-card glow-orange">
      <h2 class="dash-card-title">${I18n.t('dash_streak_title')}</h2>
      <div class="dash-streak-head">
        <span class="dash-streak-fire">${Icons.svg('flame', 26)}</span>
        <div>
          <div class="dash-streak-count">${current} ${pluralize(current, I18n.t('streak_day_1'), I18n.t('streak_day_2'), I18n.t('streak_day_5'))}</div>
          <div class="dash-streak-record">${I18n.t('streak_longest')}: ${longest} ${pluralize(longest, I18n.t('streak_day_1'), I18n.t('streak_day_2'), I18n.t('streak_day_5'))}</div>
        </div>
      </div>
      <div class="dash-week">${daysCells}</div>
    </div>`;
}

function buildNextMilestone() {
  const currentId = Progress.getCurrentLevelId();
  const idx = LEVEL_ORDER.indexOf(currentId);
  const next = idx !== -1 && idx < LEVEL_ORDER.length - 1
    ? LEVEL_ORDER[idx + 1]
    : null;

  let items = Progress.getLevelCategories(currentId)
    .map(cat => {
      const score = Progress.getCategoryScore(currentId, cat);
      return {
        cat,
        percent: score.percent,
        done: score.total > 0 && score.percent >= LEVEL_UNLOCK_THRESHOLD,
      };
    })
    .sort((a, b) => a.percent - b.percent);

  const levelScore = Progress.getLevelScore(currentId);
  const couldUnlock = next &&
    items.every(c => c.done) &&
    levelScore.percent >= LEVEL_UNLOCK_THRESHOLD;

  if (couldUnlock) {
    return `
      <div class="dash-ready">
        <div class="dash-ready-title">${Icons.svg('party-popper', 20)} ${I18n.t('dash_ready_title')}</div>
        <div class="dash-ready-body">${I18n.t('dash_ready_body', { level: getLevelLabel(next) })}</div>
      </div>`;
  }

  const list = items.map(it => `
    <li class="dash-milestone-item${it.done ? ' done' : ''}">
      <span class="dash-milestone-check">${it.done ? '✓' : '○'}</span>
      <span>${getCategoryLabel(it.cat)}</span>
      <span class="dash-milestone-pct">${it.percent}%</span>
    </li>`).join('');

  return `
    <div class="dash-card glow-green">
      <h2 class="dash-card-title">${I18n.t('dash_milestone_title', { level: next ? getLevelLabel(next) : '' })}</h2>
      <ul class="dash-milestone-list">${list}</ul>
    </div>`;
}

function renderDashboard() {
  const page = document.getElementById('dashboardPage');
  if (!page) return;
  const readonly = Progress.isReadonly();

  page.innerHTML = `
    <div class="dashboard-head">
      <h1>${I18n.t('dash_title')}</h1>
      <p>${I18n.t('dash_subtitle')}</p>
    </div>
    <div class="dashboard-grid">
      ${buildLevelProgressCard()}
      ${buildQuickStats()}
      ${buildStreakCard()}
      ${buildNextMilestone()}
    </div>
    ${readonly ? `<div class="dashboard-readonly">${Icons.svg('lock', 14)} ${I18n.t('auth_required_progress')}</div>` : ''}`;
}