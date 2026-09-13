// ============================================================
// scripts/inject-firebase-config.js
// Generates js/firebase-config.js from js/firebase-config.template.js,
// replacing the __FIREBASE_API_KEY__ placeholder with the
// FIREBASE_API_KEY environment variable (provided by the hosting
// platform, e.g. Vercel Environment Variables).
// Fails the build loudly if the variable is missing so the app
// never ships with a broken Firebase config.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'js', 'firebase-config.template.js');
const outPath = path.join(root, 'js', 'firebase-config.js');

const apiKey = process.env.FIREBASE_API_KEY;

if (!apiKey) {
  console.error('[inject-firebase-config] FIREBASE_API_KEY env var is not set.');
  process.exit(1);
}

const src = fs.readFileSync(templatePath, 'utf8');
if (!src.includes('__FIREBASE_API_KEY__')) {
  console.error('[inject-firebase-config] Placeholder __FIREBASE_API_KEY__ not found in template.');
  process.exit(1);
}

fs.writeFileSync(outPath, src.split('__FIREBASE_API_KEY__').join(apiKey));
console.log('[inject-firebase-config] js/firebase-config.js generated (apiKey injected).');