let activeCategories = new Set();
let searchQuery = '';
let collapsedCategories = new Set(Object.keys(CATEGORY_COLORS));

function buildCategoryFilters() {
  const container = document.getElementById('categoryFilters');
  if (!container) return;

  const cats = getAllCategories();
  container.innerHTML = cats.map(c =>
    `<button class="filter-btn" data-cat="${c}">${getCategoryLabel(c)}</button>`
  ).join('');

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleCategory(btn.dataset.cat);
    });
  });
}

function toggleCategory(cat) {
  if (activeCategories.has(cat)) {
    activeCategories.delete(cat);
  } else {
    activeCategories.add(cat);
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', activeCategories.has(btn.dataset.cat));
  });

  const filterBtn = document.getElementById('searchFilterBtn');
  if (filterBtn) filterBtn.classList.toggle('has-filter', activeCategories.size > 0);

  renderSkills();
}

function initFilterSidebar() {
  const aside = document.getElementById('filterSidebar');
  const btn = document.getElementById('searchFilterBtn');
  const closeBtn = document.getElementById('filterSidebarClose');
  const backdrop = document.getElementById('filterSidebarBackdrop');
  if (!aside || !btn || !closeBtn || !backdrop) return;

  const setState = (open) => {
    aside.classList.toggle('open', open);
    aside.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    aside.toggleAttribute('inert', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  btn.addEventListener('click', () => {
    setState(!aside.classList.contains('open'));
  });
  closeBtn.addEventListener('click', () => setState(false));
  backdrop.addEventListener('click', () => setState(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && aside.classList.contains('open')) setState(false);
  });
  aside.addEventListener('click', e => {
    if (e.target.closest('.filter-btn')) setState(false);
  });
}

function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = input.value.trim();
      renderSkills();
    }, 200);
  });
}

function filterSkills(skills) {
  let result = skills;

  if (activeCategories.size > 0) {
    result = result.filter(s => activeCategories.has(s.category));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      getCategoryLabel(s.category).toLowerCase().includes(q)
    );
  }

  return result;
}
