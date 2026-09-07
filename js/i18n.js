const I18n = (() => {
  let currentLang = localStorage.getItem('lang') || 'en';
  let uiStrings = {};

  const SUPPORTED = ['en', 'ru'];

  async function loadLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = 'en';
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'en';

    try {
      const resp = await fetch(`./locales/${lang}.json`);
      uiStrings = await resp.json();
    } catch (e) {
      console.warn('Failed to load locale, fallback to en', e);
      const resp = await fetch('./locales/en.json');
      uiStrings = await resp.json();
    }
  }

  function t(key, params) {
    let str = uiStrings[key] || key;
    if (params) {
      Object.keys(params).forEach(k => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
      });
    }
    return str;
  }

  function getLang() {
    return currentLang;
  }

  function setLang(lang) {
    return loadLang(lang);
  }

  function isRu() {
    return currentLang === 'ru';
  }

  return { loadLang, t, getLang, setLang, isRu, SUPPORTED };
})();
