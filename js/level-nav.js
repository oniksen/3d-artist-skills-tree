let currentLevel = 'junior';

function buildLevelNav() {
  const nav = document.getElementById('levelNav');
  if (!nav) return;

  nav.innerHTML = LEVEL_ORDER.map((lv, i) => {
    const info = DATA.career_levels[lv];
    const count = getSkillCountForLevel(lv);
    return `
      <div class="level-btn${lv === currentLevel ? ' active' : ''}" data-level="${lv}">
        <span class="level-name">${getLevelLabel(lv)}</span>
        <span class="level-focus">${info?.focus || ''}</span>
        <span class="level-index">${I18n.t('skills_count', { count })}</span>
      </div>`;
  }).join('');

  nav.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectLevel(btn.dataset.level);
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

  container.innerHTML = `
    <div class="level-info-card">
      <div>
        <h3>${LEVEL_ICONS[currentLevel] || ''} ${getLevelLabel(currentLevel)} ${I18n.t('level_focus_suffix')}</h3>
        <p class="focus-text">${info.focus}</p>
        <div class="skill-count-badge">${I18n.t('skills_at_level', { count })}</div>
      </div>
      <div>
        <h3>${I18n.t('must_be_able_to')}</h3>
        <ul>
          ${(info.must_be_able_to || []).map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>
    </div>`;
}
