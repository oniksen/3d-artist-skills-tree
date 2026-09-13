function escapePatchNoteText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchLatestPatchNote() {
  const res = await fetch('./patch-notes.json', { cache: 'no-cache' });
  if (!res.ok) return null;
  const data = await res.json();
  const versions = Array.isArray(data?.versions) ? data.versions : [];
  return versions[versions.length - 1] || null;
}

function openLatestPatchNotes(latest) {
  if (!latest || !latest.id) return;

  const lang = (typeof I18n !== 'undefined' && I18n.getLang) ? I18n.getLang() : 'en';
  const pick = (obj) => {
    if (!obj) return undefined;
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj['en'];
  };

  const title = escapePatchNoteText(pick(latest.title));
  const date = escapePatchNoteText(String(latest.date || latest.id));
  const changes = Array.isArray(latest.changes) ? latest.changes : pick(latest.changes) || [];
  const listItems = changes
    .map((c) => `<li>${escapePatchNoteText(c)}</li>`)
    .join('');

  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;

  content.innerHTML = `
    <button class="modal-close" id="patchNotesCloseBtn">&times;</button>
    <h2>${title}</h2>
    <div class="modal-id patch-notes-date">${date}</div>
    <ul class="patch-notes-list">${listItems}</ul>
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  const closeBtn = document.getElementById('patchNotesCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

async function showPatchNotesIfNew() {
  try {
    const latest = await fetchLatestPatchNote();
    if (!latest) return;

    let seenId = null;
    try {
      seenId = localStorage.getItem('patchNotesSeenId');
    } catch (e) { /* ignore */ }
    if (seenId === latest.id) return;

    openLatestPatchNotes(latest);

    try {
      localStorage.setItem('patchNotesSeenId', latest.id);
    } catch (e) { /* ignore */ }
  } catch (e) {
    console.warn('[patch-notes] failed to load:', e && e.message ? e.message : e);
  }
}

async function openPatchNotesButton() {
  try {
    const latest = await fetchLatestPatchNote();
    if (latest) {
      openLatestPatchNotes(latest);
    } else if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show('patch_notes_failed', 'warn');
    }
  } catch (e) {
    console.warn('[patch-notes] failed to load:', e && e.message ? e.message : e);
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show('patch_notes_failed', 'warn');
    }
  }
}

function initPatchNotes() {
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('#patchNotesBtn')) {
      openPatchNotesButton();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPatchNotes);
} else {
  initPatchNotes();
}