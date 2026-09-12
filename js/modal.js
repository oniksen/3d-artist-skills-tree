function buildProgressSectionHTML(skill) {
  const subs = skill.subtopics || [];
  const prog = Progress.getSkillProgress(skill.id);
  const readonly = Progress.isReadonly();
  const mastered = prog.total > 0 && prog.done === prog.total;

  const rows = subs.map((st, i) => {
    const checked = prog.total > 0 && (Progress.getAssessment(skill.id)?.subtopics?.[i]);
    return `
      <label class="subtopic-row${checked ? ' checked' : ''}">
        <input type="checkbox" data-idx="${i}" ${checked ? 'checked' : ''} ${readonly ? 'disabled' : ''}>
        <span class="subtopic-chk"></span>
        <span class="subtopic-name">${st}</span>
        <span class="subtopic-num">${i + 1}/${subs.length}</span>
      </label>`;
  }).join('');

  return `
    <div class="modal-section skill-progress-section" id="skillProgressSection">
      <div class="progress-section-head">
        <h3>${I18n.t('progress_subtopics')}</h3>
        <div class="skill-score-badge${mastered ? ' mastered' : ''}">
          ${mastered ? I18n.t('progress_mastered') : `${prog.done}/${prog.total}`}
        </div>
      </div>
      ${subs.length ? `<div class="subtopics-list">${rows}</div>` : `<div class="subtopics-empty">${I18n.t('progress_no_subtopics')}</div>`}
      <div class="skill-progress-bar-wrap">
        <div class="skill-progress-bar"><div class="skill-progress-fill" style="width:${prog.percent}%"></div></div>
        <span class="skill-progress-pct">${prog.percent}% · ${prog.score}/${prog.max}</span>
      </div>
      ${readonly ? `<div class="readonly-hint">🔒 ${I18n.t('auth_required_progress')}</div>` : ''}
    </div>`;
}

function bindProgressSectionEvents(skill) {
  const section = document.getElementById('skillProgressSection');
  if (!section) return;
  section.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', async () => {
      const idx = Number(input.dataset.idx);
      await Progress.toggleSubtopic(skill.id, idx);
      section.innerHTML = buildProgressSectionHTML(skill);
      bindProgressSectionEvents(skill);
      refreshAfterProgress();
    });
  });
}

function openModal(skillId) {
  const skill = getSkillById(skillId);
  if (!skill) return;

  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;

  const diffBars = Array.from({ length: 10 }, (_, i) =>
    `<div class="bar-seg${i < skill.difficulty ? ' filled' : ''}"></div>`
  ).join('');

  const statusBadges = LEVEL_ORDER.map(lv => {
    const st = getStatus(skill.id, lv);
    let label;
    if (st === 'not_required') label = '—';
    else if (st === 'develop') label = I18n.t('status_develop');
    else label = I18n.t('status_expert');
    return `<div class="heatmap-cell ${st}">
      <span class="heatmap-label">${getLevelLabel(lv)}</span>${label}
    </div>`;
  }).join('');

  const prereqs = (skill.prerequisites || []).map(p => {
    const ps = getSkillById(p);
    return ps ? ps.name : p;
  });

  const unlocks = (skill.unlocks || []).map(u => {
    const us = getSkillById(u);
    return us ? us.name : u;
  });

  const resources = (skill.resources || []);
  const tools = (skill.tools || []);
  const specializations = (skill.specializations || []);
  const mistakes = (skill.common_mistakes || []);
  const criteria = (skill.acceptance_criteria || []);

  content.innerHTML = `
    <button class="modal-close" id="modalCloseBtn">&times;</button>
    <h2>${skill.name}</h2>
    <div class="modal-id">${skill.id}</div>
    <div class="modal-desc">${skill.description}</div>

    <div class="modal-grid">
      <div class="modal-field">
        <div class="modal-field-label">${I18n.t('modal_category')}</div>
        <div class="modal-field-value" style="color:${CATEGORY_COLORS[skill.category] || 'var(--accent)'}">
          ${getCategoryLabel(skill.category)}
        </div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">${I18n.t('modal_difficulty')}</div>
        <div class="modal-field-value" style="display:flex;align-items:center;gap:8px">
          <div class="difficulty-bar diff-${Math.min(skill.difficulty, 10)}">${diffBars}</div>
          <span>${skill.difficulty}/10</span>
        </div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">${I18n.t('modal_importance')}</div>
        <div class="modal-field-value">${I18n.t('importance_' + skill.importance) || skill.importance}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">${I18n.t('modal_level_range')}</div>
        <div class="modal-field-value">
          ${getLevelLabel(skill.min_level)} → ${getLevelLabel(skill.target_level)}
        </div>
      </div>
    </div>

    ${buildProgressSectionHTML(skill)}

    <div class="modal-section">
      <h3>${I18n.t('modal_career_progression')}</h3>
      <div class="career-heatmap">${statusBadges}</div>
    </div>

    ${prereqs.length ? `
      <div class="modal-section">
        <h3>${I18n.t('modal_prerequisites')}</h3>
        <div class="modal-tags">${prereqs.map(p => `<span class="modal-tag">${p}</span>`).join('')}</div>
      </div>` : ''}

    ${unlocks.length ? `
      <div class="modal-section">
        <h3>${I18n.t('modal_unlocks')}</h3>
        <div class="modal-tags">${unlocks.map(u => `<span class="modal-tag">${u}</span>`).join('')}</div>
      </div>` : ''}

    ${tools.length ? `
      <div class="modal-section">
        <h3>${I18n.t('modal_tools')}</h3>
        <div class="modal-tags">${tools.map(t => `<span class="modal-tag">${t}</span>`).join('')}</div>
      </div>` : ''}

    ${specializations.length ? `
      <div class="modal-section">
        <h3>${I18n.t('modal_specializations')}</h3>
        <div class="modal-tags">${specializations.map(s => `<span class="modal-tag">${s}</span>`).join('')}</div>
      </div>` : ''}

    ${criteria.length ? `
      <div class="modal-section">
        <h3>${I18n.t('modal_acceptance_criteria')}</h3>
        <div class="modal-tags">${criteria.map(c => `<span class="modal-tag">${c}</span>`).join('')}</div>
      </div>` : ''}

    ${mistakes.length ? `
      <div class="modal-section">
        <h3>${I18n.t('modal_common_mistakes')}</h3>
        <div class="modal-tags">${mistakes.map(m => `<span class="modal-tag" style="border-color:rgba(255,107,107,0.3);color:var(--danger)">${m}</span>`).join('')}</div>
      </div>` : ''}

    ${resources.length ? `
      <div class="modal-section">
        <h3>${I18n.t('modal_resources')}</h3>
        <div class="modal-tags">
          ${resources.map(r => `<a href="${r}" target="_blank" rel="noopener" class="modal-tag" style="text-decoration:none;color:var(--accent2)">${r}</a>`).join('')}
        </div>
      </div>` : ''}
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  bindProgressSectionEvents(skill);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function initModal() {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}