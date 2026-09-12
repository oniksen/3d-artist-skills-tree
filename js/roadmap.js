// ============================================================
// Roadmap — skills of the current and next levels that still
// need attention (adapted from android-skills-tree RoadmapClient
// + GapList). Clicking a gap opens the skill modal.
// ============================================================

function getRoadmapGaps() {
  const currentLevelId = Progress.getCurrentLevelId();
  const idx = LEVEL_ORDER.indexOf(currentLevelId);
  const levels = [currentLevelId];
  if (idx !== -1 && idx < LEVEL_ORDER.length - 1) {
    const next = LEVEL_ORDER[idx + 1];
    if (Progress.isLevelUnlocked(next)) levels.push(next);
  }

  const gaps = [];
  levels.forEach(level => {
    Progress.getLevelCategories(level).forEach(cat => {
      Progress.getLevelSkills(level)
        .filter(s => s.category === cat)
        .forEach(skill => {
          const prog = Progress.getSkillProgress(skill.id);
          if (prog.percent < 100) {
            gaps.push({
              skillId: skill.id,
              skillName: skill.name,
              categoryName: getCategoryLabel(cat),
              levelName: getLevelLabel(level),
              currentScore: prog.score,
              maxScore: skill.maxWeight || 1,
              percent: prog.percent,
              critical: prog.done === 0,
            });
          }
        });
    });
  });

  gaps.sort((a, b) =>
    a.percent - b.percent || a.currentScore - b.currentScore
  );
  return { gaps, levels };
}

function renderRoadmap() {
  const page = document.getElementById('roadmapPage');
  if (!page) return;

  const { gaps, levels } = getRoadmapGaps();
  const focusLabel = levels.length
    ? I18n.t('road_focus', { level: getLevelLabel(levels[0]) })
    : '';

  if (!gaps.length) {
    page.innerHTML = `
      <div class="roadmap-head">
        <h1>${I18n.t('road_title')}</h1>
        <p>${I18n.t('road_subtitle')}</p>
        ${focusLabel ? `<span class="roadmap-focus">${focusLabel}</span>` : ''}
      </div>
      <div class="roadmap-all-done">
        <div class="rd-icon">✅</div>
        <p>${I18n.t('road_all_done')}</p>
      </div>`;
    return;
  }

  const rows = gaps.map(g => {
    const pct = Math.min((g.currentScore / g.maxScore) * 100, 100);
    const badgeCls = g.critical ? 'critical' : 'low';
    return `
      <div class="gap-row" data-skill="${g.skillId}">
        <div class="gap-left">
          <span class="gap-badge ${badgeCls}">${g.critical ? '⚠' : '◔'}</span>
          <div class="gap-info">
            <div class="gap-name">${g.skillName}</div>
            <div class="gap-meta">${g.categoryName} · ${g.levelName}</div>
          </div>
        </div>
        <div class="gap-right">
          <span class="gap-score">${g.currentScore}/${g.maxScore}</span>
          <div class="gap-bar">
            <div class="gap-bar-fill ${badgeCls}" style="width:${pct}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  page.innerHTML = `
    <div class="roadmap-head">
      <h1>${I18n.t('road_title')}</h1>
      <p>${I18n.t('road_subtitle')}</p>
      ${focusLabel ? `<span class="roadmap-focus">${focusLabel}</span>` : ''}
    </div>
    <div class="roadmap-list">${rows}</div>
    <div class="roadmap-count">${I18n.t('road_count', { count: gaps.length })}</div>`;

  page.querySelectorAll('.gap-row').forEach(row => {
    row.addEventListener('click', () => {
      openModal(row.dataset.skill);
    });
  });
}