// Run against the production export: node tests/browser-performance.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [], failed = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => requests.push(r.url()));
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ABORTED')) failed.push({ url: r.url(), error: r.failure()?.errorText }); });
    await page.addInitScript(() => {
      window.longTasks = [];
      new PerformanceObserver(list => window.longTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('video');
    await page.waitForFunction(() => document.querySelector('video')?.playbackRate === 1.5);
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('.wr-map canvas, .wc-map canvas, .wf-map canvas').count(), 0, 'offscreen maps must not initialise during the intro');
    console.log('PASS intro 1.5x; offscreen maps: 0');
    await page.locator('#global').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Satellite', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Satellite', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: 'Hide annual water', exact: true }).count(), 1);
    await page.waitForTimeout(1500);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
      await page.waitForTimeout(300);
    }
    await page.locator('.global-stage').screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'rsynthesis-map-check.png') });
    console.log('PASS default satellite + annual water; 3 zoom cycles');
    await page.locator('#observatory .wr-map').scrollIntoViewIfNeeded();
    await page.waitForSelector('#observatory canvas');
    await page.waitForTimeout(1500);
    for (const name of ['Rain', 'Satellite photo', 'Landsat history', 'Radar water', 'Optical water', 'Floods now', 'NISAR radar']) {
      await page.locator('#observatory').getByRole('radio', { name: new RegExp(name) }).click();
      await page.waitForTimeout(300);
    }
    console.log('PASS all 7 radar controls');
    await page.locator('#observatory').getByRole('radio', { name: /Landsat history/ }).click();
    await page.waitForFunction(() => !document.querySelector('.wr-when')?.textContent.includes('loading'), { timeout: 20000 });
    const beforeOpacity = requests.length;
    for (const opacity of ['45', '75', '95']) await page.getByRole('slider', { name: 'Layer opacity' }).fill(opacity);
    await page.waitForTimeout(700);
    const reloaded = requests.slice(beforeOpacity).filter(url => /\/wmts\/|earthengine|MapServer\/tile/.test(url));
    assert.equal(reloaded.length, 0, 'opacity must not reload tiles');
    console.log('PASS opacity changed 3 times: zero tile requests');
    await page.locator('#compare .wc-frame').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelectorAll('#compare canvas').length === 2);
    await page.locator('#compare select[aria-label="First moment"]').selectOption('2010');
    await page.locator('#compare input[type="range"]').fill('70');
    console.log('PASS compare: 2 maps, date and divider');
    await page.goto(base + '/#future', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#future .wf-options', { timeout: 20000 });
    await page.locator('#future .wf-map').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.wf-map-head p')?.textContent.includes('countries lean'), { timeout: 20000 });
    await page.locator('#future').getByRole('radio', { name: '2029', exact: true }).click();
    await page.locator('#future .wf-map').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.wf-map-head p')?.textContent.includes('in 2029'), { timeout: 20000 });
    console.log('PASS direct Future navigation, probability computation and year change');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ pageErrors: errors, networkFailures: failed.slice(0, 8), longTasks: await page.evaluate(() => window.longTasks), requests: requests.length }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('video')?.playbackRate === 1.5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile overflow');
    console.log('PASS mobile 390px; video 1.5x; no horizontal overflow');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

