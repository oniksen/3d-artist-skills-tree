async function init() {
  await I18n.loadLang(I18n.getLang());
  await loadData();
  if (!DATA) {
    document.getElementById('skillsContainer').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${I18n.t('failed_to_load')}</p></div>`;
    return;
  }

  document.getElementById('totalSkills').textContent = DATA.skills.length;
  document.getElementById('totalCategories').textContent = getAllCategories().length;
  document.getElementById('totalLevels').textContent = LEVEL_ORDER.length;

  buildLevelNav();
  buildCategoryFilters();
  initSearch();
  initModal();
  initCanvas();
  initLangSwitch();

  selectLevel('junior');
}

async function switchLang(lang) {
  if (lang === I18n.getLang()) return;
  await I18n.setLang(lang);
  await loadData();
  if (!DATA) return;

  document.getElementById('totalSkills').textContent = DATA.skills.length;
  document.getElementById('totalCategories').textContent = getAllCategories().length;
  document.getElementById('totalLevels').textContent = LEVEL_ORDER.length;

  updateStaticText();
  buildLevelNav();
  buildCategoryFilters();
  selectLevel(currentLevel);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function updateStaticText() {
  document.getElementById('siteTitle').textContent = I18n.t('site_title');
  document.getElementById('siteDesc').setAttribute('content', I18n.t('site_description'));
  document.getElementById('heroTitle').textContent = I18n.t('site_title');
  document.getElementById('heroSubtitle').textContent = I18n.t('subtitle');
  document.getElementById('statSkillsLabel').textContent = I18n.t('stat_skills');
  document.getElementById('statCategoriesLabel').textContent = I18n.t('stat_categories');
  document.getElementById('statLevelsLabel').textContent = I18n.t('stat_levels');
  document.getElementById('statMaxDiffLabel').textContent = I18n.t('stat_max_difficulty');
  document.getElementById('searchInput').placeholder = I18n.t('search_placeholder');
  document.getElementById('siteTitle').textContent = I18n.t('site_title');
  document.title = I18n.t('site_title');
}

function initLangSwitch() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === I18n.getLang());
    btn.addEventListener('click', () => switchLang(btn.dataset.lang));
  });
}

document.addEventListener('DOMContentLoaded', init);
