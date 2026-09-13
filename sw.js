'use strict';

const CACHE = 'skill-tree-v14';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-icon-180.png',
  './css/variables.css',
  './css/base.css',
  './css/canvas.css',
  './css/header.css',
  './css/profile.css',
  './css/side-nav.css',
  './css/hero.css',
  './css/controls.css',
  './css/level-nav.css',
  './css/level-info.css',
  './css/progress.css',
  './css/skills.css',
  './css/modal.css',
  './css/streak.css',
  './css/achievements.css',
  './css/dashboard.css',
  './css/roadmap.css',
  './css/auth.css',
  './css/bottom-nav.css',
  './css/toast.css',
  './css/responsive.css',
  './js/icons.js',
  './js/bus.js',
  './js/i18n.js',
  './js/data.js',
  './js/categories.js',
  './js/firebase-config.js',
  './js/store.js',
  './js/store-firestore.js',
  './js/auth.js',
  './js/progress.js',
  './js/achievements.js',
  './js/streak.js',
  './js/canvas.js',
  './js/search.js',
  './js/skills.js',
  './js/modal.js',
  './js/level-nav.js',
  './js/roadmap.js',
  './js/dashboard.js',
  './js/view.js',
  './js/app.js',
  './js/pwa.js',
  './locales/en.json',
  './locales/ru.json',
  './data/en.json',
  './data/subtopics.en.json',
  './data/ru.json',
  './data/subtopics.ru.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
    )
  );
});