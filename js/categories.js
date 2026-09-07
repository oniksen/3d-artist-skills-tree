const CATEGORY_COLORS = {
  art: '#6c5ce7',
  cg: '#00cec9',
  model: '#fd79a8',
  uv: '#fdcb6e',
  bake: '#e17055',
  texture: '#a29bfe',
  material: '#00b894',
  lighting: '#ffeaa7',
  render: '#fab1a0',
  tool_blender: '#ff7675',
  tool_zbrush: '#d63031',
  tool_substance: '#e84393',
  tool_maya: '#74b9ff',
  tool_houdini: '#fdcb6e',
  tool_marvelous: '#55efc4',
  ue: '#dfe6e9',
  production: '#636e72',
  character: '#e056a0',
  environment: '#00b894',
  hard_surface: '#b2bec3',
  weapon: '#d63031',
  vehicle: '#0984e3',
  stylized: '#a29bfe',
  realistic: '#00cec9',
  technical_art: '#6c5ce7',
};

function getCategoryLabel(cat) {
  return I18n.t('cat_' + cat) || cat;
}

const LEVEL_ORDER = [
  'beginner', 'junior', 'junior_plus', 'middle',
  'middle_plus', 'senior', 'lead', 'principal', 'art_director',
];

function getLevelLabel(level) {
  return I18n.t('level_' + level) || level;
}

const LEVEL_ICONS = {
  beginner: '🌱',
  junior: '🎯',
  junior_plus: '⚡',
  middle: '🔥',
  middle_plus: '💎',
  senior: '⭐',
  lead: '👑',
  principal: '🏛️',
  art_director: '🎬',
};
