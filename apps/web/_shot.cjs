let chromium;
try { ({ chromium } = require('@playwright/test')); } catch { ({ chromium } = require('playwright')); }
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: '../../docs/superpowers/specs/assets/login.png' });
  console.log('login shot done');
  await browser.close();
})().catch(e => { console.error('SHOT FAIL:', e.message); process.exit(1); });
