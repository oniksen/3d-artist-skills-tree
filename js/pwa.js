(function registerPWA() {
  if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  }
})();