function renderSkills() {
  const container = document.getElementById('skillsContainer');
  if (!container) return;

  let skills = getSkillsForLevel(currentLevel);
  skills = filterSkills(skills);

  if (skills.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>${I18n.t('no_skills_found')}</p>
      </div>`;
    return;
  }

  const grouped = {};
  skills.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  const sortedCats = Object.keys(grouped).sort(
    (a, b) => grouped[b].length - grouped[a].length
  );

  container.innerHTML = sortedCats.map(cat => {
    const catSkills = grouped[cat].sort((a, b) => a.difficulty - b.difficulty);
    const isCollapsed = collapsedCategories.has(cat);
    const color = CATEGORY_COLORS[cat] || 'var(--accent)';

    return `
      <div class="category-section">
        <div class="category-header${isCollapsed ? ' collapsed' : ''}" data-cat="${cat}">
          <div class="category-dot" style="background:${color}; color:${color}"></div>
          <h2>${getCategoryLabel(cat)}</h2>
          <span class="cat-count">${catSkills.length}</span>
          <span class="cat-toggle">▼</span>
        </div>
        ${isCollapsed ? '' : `
          <div class="skills-grid">
            ${catSkills.map(s => buildSkillCard(s)).join('')}
          </div>`}
      </div>`;
  }).join('');

  container.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', () => {
      const cat = header.dataset.cat;
      if (collapsedCategories.has(cat)) {
        collapsedCategories.delete(cat);
      } else {
        collapsedCategories.add(cat);
      }
      renderSkills();
    });
  });

  container.querySelectorAll('.skill-card').forEach(card => {
    card.addEventListener('click', () => {
      openModal(card.dataset.id);
    });
  });
}

function buildSkillCard(skill) {
  const status = getStatus(skill.id, currentLevel);
  const color = CATEGORY_COLORS[skill.category] || 'var(--accent)';

  const diffBars = Array.from({ length: 10 }, (_, i) =>
    `<div class="bar-seg${i < skill.difficulty ? ' filled' : ''}"></div>`
  ).join('');

  const prereqs = (skill.prerequisites || []).slice(0, 3);
  const prereqTags = prereqs.map(p => {
    const ps = getSkillById(p);
    return `<span class="prereq-tag" title="${p}">${ps ? ps.name : p}</span>`;
  }).join('');
  const extra = skill.prerequisites.length > 3
    ? `<span class="prereq-tag">+${skill.prerequisites.length - 3}</span>`
    : '';

  return `
    <div class="skill-card" data-id="${skill.id}">
      <div class="skill-top">
        <span class="skill-name">${skill.name}</span>
        <span class="status-badge status-${status}">
          ${status === 'not_required' ? '—' : status}
        </span>
      </div>
      <div class="skill-desc">${skill.description}</div>
      <div class="skill-meta">
        <div class="difficulty-bar diff-${Math.min(skill.difficulty, 10)}">${diffBars}</div>
        <span class="meta-tag">${skill.difficulty}/10</span>
        <span class="meta-tag importance-${skill.importance}">${I18n.t('importance_' + skill.importance) || skill.importance}</span>
        <span class="meta-tag" style="color:${color}">${getCategoryLabel(skill.category)}</span>
      </div>
      ${prereqs.length ? `<div class="prereq-list">${prereqTags}${extra}</div>` : ''}
    </div>`;
}
