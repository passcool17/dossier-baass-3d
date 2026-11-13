// v0.1.0 smoke: load, 0 console errors, 0 HTTP 4xx, zones, evidence via __game,
// TR-3B, end screen, replay, credits, calls < 100. 412×915 and 915×412.
const { chromium } = require('/workspace/tools3d/node_modules/playwright-core');
const { pathToFileURL } = require('url');
const BASE = process.argv[2] || 'http://127.0.0.1:8780/?t=1';
const SHOTS = process.argv.includes('shots');
const OUT = process.argv.find((a) => a.startsWith('--out='))?.slice(6) || '/workspace/games3d';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = {};
const FAIL = [];
const ok = (k, cond, v) => { R[k] = v === undefined ? !!cond : v; if (!cond) FAIL.push(k + (v !== undefined ? ' = ' + JSON.stringify(v) : '')); };

async function open(browser, w, h) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: true, isMobile: w < 600, deviceScaleFactor: 1, locale: 'fr-CA',
  });
  const page = await ctx.newPage();
  const logs = [];
  const httpBad = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + (e.message || e)));
  page.on('response', (r) => { if (r.status() >= 400) httpBad.push(r.status() + ' ' + r.url()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 120000 });
  await sleep(700);
  return { ctx, page, logs, httpBad };
}

const errorsOf = (logs) => logs.filter((l) => /^error:|^PAGEERROR:/i.test(l) || /failed to load/i.test(l));

async function measure(page, ms = 1200) {
  return page.evaluate(async (dur) => {
    const t0 = performance.now();
    let frames = 0;
    await new Promise((resolve) => {
      const step = (now) => {
        frames++;
        if (now - t0 >= dur) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return {
      fps: Math.round(frames / (dur / 1000)),
      calls: window.__game.calls,
      tris: window.__game.tris,
      gpu: window.__game.gpu,
    };
  }, ms);
}

async function runView(browser, w, h, shots) {
  const prefix = w + 'x' + h + '.';
  const { ctx, page, logs, httpBad } = await open(browser, w, h);
  const err = errorsOf(logs);
  ok(prefix + 'load.ready', await page.evaluate(() => !!__game.ready));
  ok(prefix + 'load.errors', err.length === 0, err);
  ok(prefix + 'load.http', httpBad.length === 0, httpBad);
  ok(prefix + 'banner', await page.evaluate(() => document.getElementById('banner').textContent.includes('plan de recherche')));
  ok(prefix + 'menu', await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden')));

  const menuFit = await page.evaluate(() => {
    const menu = document.getElementById('menu');
    const vh = window.innerHeight, vw = window.innerWidth;
    const mr = menu.getBoundingClientRect();
    const buttons = ['bPlay', 'bHow', 'bCredits'].map((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return {
        id,
        top: +r.top.toFixed(1),
        bottom: +r.bottom.toFixed(1),
        height: +r.height.toFixed(1),
        visible: r.top >= -0.5 && r.bottom <= vh + 0.5 && r.width > 0 && r.height >= 44,
      };
    });
    return {
      vw, vh,
      menuTop: +mr.top.toFixed(1),
      menuBottom: +mr.bottom.toFixed(1),
      menuH: +mr.height.toFixed(1),
      scroll: menu.scrollHeight > menu.clientHeight + 1,
      scrollTop: menu.scrollTop,
      buttons,
      allVisible: buttons.every((b) => b.visible),
    };
  });
  ok(prefix + 'menu.buttonsVisible', menuFit.allVisible && !menuFit.scroll, menuFit);

  const mMenu = await measure(page, 1000);
  R[prefix + 'menu.perf'] = mMenu;
  ok(prefix + 'menu.calls', mMenu.calls < 100, mMenu);

  // credits
  await page.evaluate(() => __game.showCredits());
  await sleep(200);
  const creditText = await page.evaluate(() => document.getElementById('crdList').innerText);
  const needed = ['Kenney', 'Quaternius', 'hat_my_guy', 'Dylusion', 'CC0', 'CC BY-NC'];
  for (const n of needed) ok(prefix + 'credits.' + n, creditText.includes(n), n + ' missing');
  if (shots) await page.screenshot({ path: OUT + '/dossier-baass-3d-credits-' + w + '.png', type: 'png' });

  await page.evaluate(() => { document.getElementById('credits').classList.add('hidden'); });
  await page.evaluate(() => __game.startGame());
  await sleep(400);

  // each zone
  for (const zone of ['ranch', 'hangar', 'lab', 'wreck']) {
    const okz = await page.evaluate((z) => __game.goto(z), zone);
    ok(prefix + 'zone.' + zone + '.goto', okz === true);
    await sleep(350);
    const z = await page.evaluate(() => __game.zone);
    ok(prefix + 'zone.' + zone + '.at', z === zone, z);
    const m = await measure(page, 900);
    R[prefix + 'zone.' + zone] = m;
    ok(prefix + 'zone.' + zone + '.calls', m.calls < 100, m);
    if (shots) await page.screenshot({ path: OUT + '/dossier-baass-3d-' + zone + '-' + w + '.png', type: 'png' });
  }
  ok(prefix + 'wreck.visited', await page.evaluate(() => __game.wreckVisited) === true);

  // collect all evidence
  const ids = await page.evaluate(() => __game.evidence);
  ok(prefix + 'evidence.count', ids.length === 8, ids);
  for (const id of ids) {
    const r = await page.evaluate((i) => __game.collect(i), id);
    ok(prefix + 'collect.' + id, r === true);
    await sleep(80);
    // close sheet
    await page.evaluate(() => {
      const b = document.getElementById('bSheetOk');
      if (b && !document.getElementById('sheet').classList.contains('hidden')) b.click();
    });
    await sleep(80);
  }
  ok(prefix + 'collected.all', (await page.evaluate(() => __game.collected.length)) === 8);

  // evidence card content
  await page.evaluate(() => __game.showSheet('roswell-debris'));
  await sleep(150);
  const card = await page.evaluate(() => ({
    title: document.getElementById('shTitle').textContent,
    quote: document.getElementById('shQuote').textContent,
    page: document.getElementById('shPage').textContent,
    hidden: document.getElementById('sheet').classList.contains('hidden'),
  }));
  ok(prefix + 'card.quote', card.quote.includes('paper thin yet extremely strong'), card);
  ok(prefix + 'card.page', /45/.test(card.page), card.page);
  if (shots) await page.screenshot({ path: OUT + '/dossier-baass-3d-preuve-' + w + '.png', type: 'png' });
  await page.evaluate(() => document.getElementById('bSheetOk').click());

  // TR-3B
  await page.evaluate(() => { __game.goto('hangar'); __game.triggerTR3B(); });
  await sleep(400);
  const st = await page.evaluate(() => __game.tr3bState);
  ok(prefix + 'tr3b.started', st === 'flying' || st === 'hover' || st === 'leaving' || st === 'gone' || __gameWait(st), st);
  function __gameWait() { return false; }
  // wait until seen (hover sets seen)
  await page.waitForFunction(() => window.__game.tr3bSeen === true, null, { timeout: 15000 }).catch(() => {});
  ok(prefix + 'tr3b.seen', await page.evaluate(() => __game.tr3bSeen) === true);
  const mTr = await measure(page, 800);
  R[prefix + 'tr3b'] = mTr;
  ok(prefix + 'tr3b.calls', mTr.calls < 100, mTr);
  if (shots) await page.screenshot({ path: OUT + '/dossier-baass-3d-tr3b-' + w + '.png', type: 'png' });

  // end (may already have fired if all conditions met)
  const already = await page.evaluate(() => __game.ended);
  if (!already) await page.evaluate(() => __game.endRun());
  await sleep(300);
  const res = await page.evaluate(() => ({
    ended: __game.ended,
    shown: !document.getElementById('result').classList.contains('hidden'),
    title: document.getElementById('resTitle').textContent,
    score: document.getElementById('resScore').textContent,
  }));
  ok(prefix + 'end.shown', res.shown && res.ended, res);

  // replay
  await page.click('#bReplay');
  await sleep(400);
  const after = await page.evaluate(() => ({
    collected: __game.collected.length,
    ended: __game.ended,
    running: __game.running,
    zone: __game.zone,
  }));
  ok(prefix + 'replay.reset', after.collected === 0 && after.ended === false && after.running === true, after);

  const err2 = errorsOf(logs);
  ok(prefix + 'end.errors', err2.length === 0, err2);
  ok(prefix + 'end.http', httpBad.length === 0, httpBad);

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  try {
    await runView(browser, 412, 915, SHOTS);
    await runView(browser, 915, 412, SHOTS);
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(R, null, 2));
  if (FAIL.length) {
    console.error('FAIL', FAIL.length);
    FAIL.forEach((f) => console.error(' -', f));
    process.exit(1);
  }
  console.log('PASS');
})().catch((e) => { console.error(e); process.exit(1); });
