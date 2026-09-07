let activeCategories = new Set();
let searchQuery = '';
let collapsedCategories = new Set();

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

  renderSkills();
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
