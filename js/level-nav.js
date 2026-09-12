let currentLevel = 'junior';

function getUnlockHint(level) {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx <= 0) return 0;
  const prev = LEVEL_ORDER[idx - 1];
  const score = Progress.getLevelScore(prev);
  return score.percent;
}

function buildLevelNav() {
  const nav = document.getElementById('levelNav');
  if (!nav) return;

  const readonly = Progress.isReadonly();

  nav.innerHTML = LEVEL_ORDER.map((lv, i) => {
    const info = DATA.career_levels[lv];
    const count = getSkillCountForLevel(lv);
    const unlocked = Progress.isLevelUnlocked(lv);
    const passed = Progress.isLevelPassed(lv);
    const isCurrent = Progress.isReadonly() ? lv === currentLevel : lv === Progress.getCurrentLevelId();
    const locked = !readonly && !unlocked;
    const score = Progress.getLevelScore(lv);
    const showBar = !readonly && (passed || (lv === Progress.getCurrentLevelId()));

    const cls = ['level-btn'];
    if (lv === currentLevel) cls.push('active');
    if (passed) cls.push('passed');
    if (isCurrent) cls.push('current');
    if (locked) cls.push('locked');

    return `
      <div class="${cls.join(' ')}" data-level="${lv}">
        <span class="level-name">${passed ? `${Icons.svg('circle-check', 14)} ` : ''}${getLevelLabel(lv)}${locked ? ` ${Icons.svg('lock', 13)}` : ''}</span>
        <span class="level-focus">${info?.focus || ''}</span>
        <span class="level-index">${I18n.t('skills_count', { count })}</span>
        ${showBar ? `
          <div class="level-progress">
            <div class="level-progress-bar"><div class="level-progress-fill" style="width:${score.percent}%"></div></div>
            <span class="level-progress-pct">${score.percent}%</span>
          </div>` : ''}
      </div>`;
  }).join('');

  nav.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.level;
      if (!Progress.isReadonly() && !Progress.isLevelUnlocked(level)) {
        Toast.show(I18n.t('level_locked_hint', {
          level: getLevelLabel(level),
          percent: getUnlockHint(level),
        }), 'warn');
        return;
      }
      selectLevel(level);
    });
  });
}

function selectLevel(level) {
  currentLevel = level;

  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });

  const activeBtn = document.querySelector(`.level-btn[data-level="${level}"]`);
  if (activeBtn) {
    activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  renderLevelInfo();
  renderSkills();
}

function renderLevelInfo() {
  const container = document.getElementById('levelInfo');
  if (!container) return;

  const info = DATA.career_levels[currentLevel];
  if (!info) {
    container.innerHTML = '';
    return;
  }

  const count = getSkillCountForLevel(currentLevel);
  const readonly = Progress.isReadonly();
  const passed = Progress.isLevelPassed(currentLevel);
  const isCurrent = readonly ? currentLevel === 'junior' : currentLevel === Progress.getCurrentLevelId();
  const locked = !readonly && !Progress.isLevelUnlocked(currentLevel);
  const score = Progress.getLevelScore(currentLevel);

  let statusBadge = '';
  if (!readonly) {
    if (locked) {
      statusBadge = `<span class="level-status-badge locked">${Icons.svg('lock', 14)} ${I18n.t('level_status_locked')}</span>`;
    } else if (passed) {
      statusBadge = `<span class="level-status-badge passed">${Icons.svg('circle-check', 14)} ${I18n.t('level_status_passed')}</span>`;
    } else if (isCurrent) {
      statusBadge = `<span class="level-status-badge current">${Icons.svg('play', 14)} ${I18n.t('level_status_in_progress')}</span>`;
    }
  }

  const progressHtml = !readonly ? `
    <div class="level-score-block">
      <div class="level-score-bar"><div class="level-score-fill" style="width:${score.percent}%"></div></div>
      <div class="level-score-meta">
        <span class="level-score-pct">${score.percent}%</span>
        <span class="level-score-pts">${score.done}/${score.total} pts</span>
      </div>
    </div>` : '';

  container.innerHTML = `
    <div class="level-info-card">
      <div>
        <div class="level-info-head">
          <h3>${LEVEL_ICONS[currentLevel] || ''} ${getLevelLabel(currentLevel)} ${I18n.t('level_focus_suffix')}</h3>
          ${statusBadge}
        </div>
        <p class="focus-text">${info.focus}</p>
        <div class="skill-count-badge">${I18n.t('skills_at_level', { count })}</div>
        ${progressHtml}
        ${locked ? `<div class="level-lock-hint">${I18n.t('level_lock_explain', { percent: getUnlockHint(currentLevel), level: getLevelLabel(currentLevel) })}</div>` : ''}
      </div>
      <div>
        <h3>${I18n.t('must_be_able_to')}</h3>
        <ul>
          ${(info.must_be_able_to || []).map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>
    </div>`;
}