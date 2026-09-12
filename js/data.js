let DATA = null;

async function loadData() {
  try {
    const lang = I18n.getLang();
    const [dataResp, subResp] = await Promise.all([
      fetch(`./data/${lang}.json`),
      fetch(`./data/subtopics.${lang}.json`),
    ]);
    const data = await dataResp.json();
    let subtopicsMap = {};
    try {
      subtopicsMap = await subResp.json();
    } catch (e) {
      console.warn('Failed to load subtopics, fallback to empty map', e);
    }
    data.skills = (data.skills || []).map(s => {
      const subs = subtopicsMap[s.id] || [];
      return { ...s, subtopics: subs, maxWeight: s.difficulty || 1 };
    });
    DATA = data;
    return DATA;
  } catch (e) {
    console.error('Failed to load skill data:', e);
    return null;
  }
}

function getSkillSubtopics(skillId) {
  const skill = getSkillById(skillId);
  return skill?.subtopics || [];
}

function getSkillById(id) {
  return DATA?.skills?.find(s => s.id === id) || null;
}

function getSkillsForLevel(level) {
  if (!DATA) return [];
  return DATA.skills.filter(s => {
    const m = DATA.career_matrix.find(r => r.skill_id === s.id);
    if (!m) return s.min_level === level || s.target_level === level;
    return m[level] && m[level] !== 'not_required';
  });
}

function getStatus(skillId, level) {
  const m = DATA?.career_matrix?.find(r => r.skill_id === skillId);
  return m ? (m[level] || 'not_required') : 'not_required';
}

function getAllCategories() {
  if (!DATA) return [];
  return [...new Set(DATA.skills.map(s => s.category))].sort();
}

function getSkillCountForLevel(level) {
  return getSkillsForLevel(level).length;
}
