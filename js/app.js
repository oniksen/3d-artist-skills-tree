async function init() {
  await I18n.loadLang(I18n.getLang());
  await loadData();
  if (!DATA) {
    document.getElementById('skillsContainer').innerHTML =
      `<div class="empty-state"><div class="empty-icon">${Icons.svg('triangle-alert', 28)}</div><p>${I18n.t('failed_to_load')}</p></div>`;
    return;
  }

  document.getElementById('totalSkills').textContent = DATA.skills.length;
  document.getElementById('totalCategories').textContent = getAllCategories().length;
  document.getElementById('totalLevels').textContent = LEVEL_ORDER.length;

  updateStaticText();
  initCanvas();
  initLangSwitch();
  initModal();
  initSearch();

  await Progress.refresh();
  currentLevel = Progress.isReadonly() ? 'junior' : Progress.getCurrentLevelId();

  buildLevelNav();
  buildCategoryFilters();

  View.init();
  View.route();
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
  renderRoadmap();
  renderDashboard();
  View.renderAchievements();
  View.refreshStats();

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
  document.getElementById('brandText').textContent = I18n.t('brand_title');
  document.getElementById('sideBrandText').textContent = I18n.t('brand_title');
  document.getElementById('sideNav').querySelectorAll('.nav-label').forEach(el => {
    const parent = el.closest('.side-nav-link');
    if (parent) {
      el.textContent = I18n.t('nav_' + parent.dataset.view);
    }
  });
  document.querySelectorAll('#bottomNav .bn-label').forEach(el => {
    const parent = el.closest('.bottom-nav-btn');
    if (parent && parent.dataset.view) {
      el.textContent = I18n.t('nav_' + parent.dataset.view);
    }
  });
  document.getElementById('achTitle').textContent = I18n.t('ach_title');
  document.title = I18n.t('site_title');
}

function initLangSwitch() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === I18n.getLang());
    btn.addEventListener('click', () => switchLang(btn.dataset.lang));
  });
}

document.addEventListener('DOMContentLoaded', init);