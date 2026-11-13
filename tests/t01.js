// v0.2.5 smoke: load, 0 console errors, 0 HTTP 4xx, zones, evidence via __game,
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
    serviceWorkers: 'block',
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
  const needed = ['Kenney', 'Quaternius', 'hat_my_guy', 'Dylusion', 'CC0', 'CC BY-NC', 'PolyDavid', 'Amiel Goco', 'Naked Singularity', 'Renafox', 'Spellkaze', 'CC BY 4.0'];
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

  // bunker: lab is underground
  await page.evaluate(() => __game.goto('lab'));
  await sleep(400);
  const bunk = await page.evaluate(() => ({
    zone: __game.zone,
    y: __game.player.y,
    bunker: __game.bunker,
    name: !!document.querySelector('canvas'),
  }));
  ok(prefix + 'bunker.zone', bunk.zone === 'lab', bunk);
  ok(prefix + 'bunker.underground', bunk.y < -1 && bunk.bunker.loaded && bunk.bunker.indoors, bunk);

  // entrance at the surface
  const ent = await page.evaluate(() => {
    __game.goto('entrance');
    return { y: __game.player.y, x: __game.player.x, z: __game.player.z, bunker: __game.bunker };
  });
  ok(prefix + 'bunker.entrance.surface', ent.y > -1.2 && ent.y < 0.6, ent);

  // detect-gpu / tier
  const gpu = await page.evaluate(() => ({ gpu: __game.gpu, qualityLow: __game.qualityLow }));
  ok(prefix + 'gpu.present', gpu.gpu && typeof gpu.gpu.tier === 'number', gpu);
  const tier1 = await page.evaluate(() => __game.applyTier(1));
  ok(prefix + 'gpu.tier1.low', tier1.qualityLow === true && tier1.tier === 1, tier1);
  const tier3 = await page.evaluate(() => __game.applyTier(3));
  ok(prefix + 'gpu.tier3.high', tier3.qualityLow === false && tier3.tier === 3, tier3);
  // restore default-ish low for llvmpipe later; apply 2 as silent fallback default
  await page.evaluate(() => __game.applyTier(2));

  // audio unlock + mute (Playwright evaluate may resume AudioContext)
  const au0 = await page.evaluate(async () => {
    const before = { unlocked: __game.audio.unlocked, loops: __game.audio.loops.slice(), muted: __game.audio.muted };
    const okUnlock = await __game.audio.unlock();
    return {
      before,
      okUnlock,
      unlocked: __game.audio.unlocked,
      buffers: __game.audio.buffers.slice(),
      loops: __game.audio.loops.slice(),
      muted: __game.audio.muted,
    };
  });
  R[prefix + 'audio.unlock'] = au0;
  ok(prefix + 'audio.buffers', (au0.buffers || []).includes('ui_click') && (au0.buffers || []).includes('amb_desert'), au0);
  // mute via API then M key
  await page.evaluate(() => __game.audio.setMuted(true));
  const muted = await page.evaluate(() => __game.audio.muted);
  ok(prefix + 'audio.muted', muted === true, muted);
  await page.keyboard.press('KeyM');
  await sleep(150);
  const unmuted = await page.evaluate(() => ({ muted: __game.audio.muted, pressed: document.getElementById('bMute').getAttribute('aria-pressed') }));
  ok(prefix + 'audio.M', unmuted.muted === false && unmuted.pressed === 'false', unmuted);
  // persist: settings key
  const persisted = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('baass.dossier3d.settings.v1') || '{}'); } catch { return {}; }
  });
  ok(prefix + 'audio.persist', persisted.muted === false, persisted);

  // pickup FX (non-silent collect)
  await page.evaluate(() => { __game.goto('lab'); });
  await sleep(200);
  const fx = await page.evaluate(() => {
    // pick an uncollected evidence in lab
    const ids = __game.evidence.filter((id) => !__game.collected.includes(id));
    const id = ids.find((i) => i === 'area-lift') || ids[0];
    const r = __game.collect(id);
    return { r, id, active: __game.pickupFx, collected: __game.collected.slice() };
  });
  ok(prefix + 'pickup.started', fx.r === true && (fx.active === true || fx.collected.includes(fx.id)), fx);
  await sleep(1800);
  const fx2 = await page.evaluate(() => ({
    active: __game.pickupFx,
    sheet: !document.getElementById('sheet').classList.contains('hidden'),
  }));
  ok(prefix + 'pickup.sheet', fx2.sheet === true && fx2.active === false, fx2);
  await page.evaluate(() => { document.getElementById('sheet').classList.add('hidden'); __game.collectSilent && 0; });
  // close sheet properly
  await page.evaluate(() => { const b = document.getElementById('bSheetOk'); if (b) b.click(); });
  await sleep(200);

  // credits include Sketchfab CC BY and Kenney audio

  // collect remaining evidence silently (pickup test already took one)
  const ids = await page.evaluate(() => __game.evidence);
  ok(prefix + 'evidence.count', ids.length === 8, ids);
  for (const id of ids) {
    const r = await page.evaluate((i) => {
      if (__game.collected.includes(i)) return 'already';
      return __game.collectSilent(i);
    }, id);
    ok(prefix + 'collect.' + id, r === true || r === 'already', r);
    await sleep(40);
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
