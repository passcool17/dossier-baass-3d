/**
 * Upgrade path: serve v0.2.0 (worktree 6c8de4e) until its SW is installed,
 * then switch the same origin to the current tree (v0.2.2) and reload.
 * Expect: menu boots, __game.version === '0.2.2', 0 console errors,
 * 0 HTTP >= 400 (game origin), cache only dossier-baass-3d-v0.2.2.
 *
 * Usage: node tests/t-sw-upgrade.cjs
 * Optional: UPGRADE_FROM=/tmp/baass-v020 UPGRADE_TO=... PORT=8898
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/workspace/tools3d/node_modules/playwright-core');

const FROM = process.env.UPGRADE_FROM || '/tmp/baass-v020';
const TO = process.env.UPGRADE_TO || path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8898);
const ORIGIN = 'http://127.0.0.1:' + PORT;
const PROFILE = process.env.PROFILE || '/tmp/pw-baass-sw-upgrade-022';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function killPort(port) {
  try { execSync('fuser -k ' + port + '/tcp', { stdio: 'ignore' }); } catch {}
}

function startServer(cwd) {
  killPort(PORT);
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd, stdio: 'ignore', detached: true,
  });
  srv.unref();
  return srv;
}

async function waitServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(ORIGIN + '/data.js', { cache: 'no-store' });
      if (r.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error('server not up on ' + ORIGIN);
}

(async () => {
  if (!fs.existsSync(path.join(FROM, 'sw.js')) || !fs.existsSync(path.join(FROM, 'data.js'))) {
    throw new Error('missing v0.2.0 tree at ' + FROM);
  }
  const fromVer = fs.readFileSync(path.join(FROM, 'data.js'), 'utf8').match(/VERSION = '([^']+)'/)[1];
  const toVer = fs.readFileSync(path.join(TO, 'data.js'), 'utf8').match(/VERSION = '([^']+)'/)[1];
  console.log('FROM', FROM, fromVer, 'TO', TO, toVer);

  execSync('rm -rf ' + PROFILE);
  let srv = startServer(FROM);
  await waitServer();

  const browser = await chromium.launchPersistentContext(PROFILE, {
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
    viewport: { width: 412, height: 915 },
    hasTouch: true, isMobile: true, deviceScaleFactor: 1, locale: 'fr-CA',
  });
  const page = await browser.newPage();
  const errors = [];
  const http = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + (e.message || e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console ' + m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) http.push(r.status() + ' ' + r.url());
  });

  // --- phase 1: install v0.2.0 SW ---
  await page.goto(ORIGIN + '/?t=sw020', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 120000 });
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    return keys.includes('dossier-baass-3d-v' + (window.__game && window.__game.version));
  }, null, { timeout: 30000 });
  await sleep(1500);
  const before = await page.evaluate(async () => {
    const keys = await caches.keys();
    const entries = {};
    for (const k of keys) {
      const c = await caches.open(k);
      entries[k] = (await c.keys()).map((r) => r.url);
    }
    const mood = (entries['dossier-baass-3d-v0.2.0'] || []).filter((u) => /mood\.js/.test(u));
    return { version: __game.version, keys, mood, n: Object.values(entries).flat().length };
  });
  console.log('BEFORE', JSON.stringify(before));
  if (before.version !== fromVer) throw new Error('expected ' + fromVer + ' got ' + before.version);
  if (!before.keys.includes('dossier-baass-3d-v' + fromVer)) throw new Error('old cache missing');

  errors.length = 0;
  http.length = 0;

  // --- phase 2: switch origin to v0.2.2 and reload ---
  try { process.kill(-srv.pid, 'SIGTERM'); } catch {}
  await sleep(300);
  srv = startServer(TO);
  await waitServer();
  const served = await (await fetch(ORIGIN + '/data.js', { cache: 'no-store' })).text();
  const servedVer = served.match(/VERSION = '([^']+)'/)[1];
  console.log('SERVED_AFTER_SWITCH', servedVer);
  if (servedVer !== toVer) throw new Error('server still ' + servedVer);

  await page.goto(ORIGIN + '/?t=sw022&v=upgrade', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game && window.__game.ready && window.__game.version === '0.2.2', null, { timeout: 120000 });
  // Wait until the new SW is controlling, then until only its cache remains.
  await page.waitForFunction(() => {
    const c = navigator.serviceWorker && navigator.serviceWorker.controller;
    return !!(c && /sw\.js\?v=0\.2\.2/.test(c.scriptURL));
  }, null, { timeout: 40000 });
  await page.waitForFunction(() => caches.keys().then((keys) => keys.length === 1 && keys[0] === 'dossier-baass-3d-v0.2.2'), null, { timeout: 40000 });
  await sleep(1200);
  // Re-check after the activate delayed drop (800ms) and any in-flight puts.
  await page.waitForFunction(() => caches.keys().then((keys) => keys.length === 1 && keys[0] === 'dossier-baass-3d-v0.2.2'), null, { timeout: 15000 });

  const after = await page.evaluate(async () => {
    const keys = await caches.keys();
    const entries = {};
    for (const k of keys) {
      const c = await caches.open(k);
      entries[k] = (await c.keys()).map((r) => r.url);
    }
    const urls = entries['dossier-baass-3d-v0.2.2'] || [];
    const menu = document.getElementById('menu');
    const loading = document.getElementById('loading');
    const banner = document.getElementById('banner');
    return {
      version: __game.version,
      ready: __game.ready,
      keys,
      n: urls.length,
      moodUrls: urls.filter((u) => /mood\.js/.test(u)),
      propsUrls: urls.filter((u) => /props\.js/.test(u)),
      dataUrls: urls.filter((u) => /data\.js/.test(u)),
      mainUrls: urls.filter((u) => /main\.js/.test(u)),
      hasOldCache: keys.some((k) => k !== 'dossier-baass-3d-v0.2.2'),
      hasOldJs: urls.some((u) => /[?&]v=0\.2\.[01]/.test(u) && /\.(js|css)$/.test(u)),
      menuHidden: menu ? menu.classList.contains('hidden') : null,
      loadingHidden: loading ? loading.classList.contains('hidden') : null,
      banner: banner ? banner.textContent : null,
    };
  });
  console.log('AFTER', JSON.stringify(after, null, 2));
  console.log('ERRORS', JSON.stringify(errors));
  console.log('HTTP', JSON.stringify(http));

  const fail = [];
  if (after.version !== '0.2.2') fail.push('version=' + after.version);
  if (!after.ready) fail.push('not ready');
  if (after.menuHidden !== false) fail.push('menu not shown');
  if (after.loadingHidden !== true) fail.push('loading still visible');
  if (after.hasOldCache) fail.push('old cache remains ' + after.keys);
  if (after.keys.length !== 1 || after.keys[0] !== 'dossier-baass-3d-v0.2.2') fail.push('caches ' + after.keys);
  if (!after.moodUrls.some((u) => u.includes('mood.js?v=0.2.2'))) fail.push('mood not versioned ' + after.moodUrls);
  if (errors.length) fail.push('errors ' + JSON.stringify(errors));
  const httpGame = http.filter((u) => u.includes(ORIGIN));
  if (httpGame.length) fail.push('http>=400 ' + JSON.stringify(httpGame));
  if (after.banner !== 'plan de recherche, pas une preuve ; histoire fictive') fail.push('banner');

  await browser.close();
  try { process.kill(-srv.pid, 'SIGTERM'); } catch {}
  killPort(PORT);

  if (fail.length) {
    console.error('FAIL', fail);
    process.exit(1);
  }
  console.log('PASS upgrade', fromVer, '->', toVer);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
