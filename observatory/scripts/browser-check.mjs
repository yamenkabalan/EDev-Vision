import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const BASE='http://127.0.0.1:3100';
await mkdir('qa',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
// Exercise automated pan/zoom without requesting public basemap tiles.
// The actual basemap is inspected separately in a stationary visual preview.
async function testPage(options={}) {
  const p=await browser.newPage(options);
  await p.route('https://tile.openstreetmap.org/**',route=>route.abort());
  return p;
}
const results=[];const errors=[];const requests=[];
const page=await testPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
try {
  await page.goto(BASE,{waitUntil:'networkidle'});
  await expect(page.locator('.feed-badge')).toContainText('10 observations loaded',{timeout:25000});
  await expect(page.locator('h1')).toHaveText('Every floodhas a pulse.');
  await expect(page.locator('.earth-fallback')).toHaveCSS('opacity','0',{timeout:15000});
  await page.screenshot({path:'qa/desktop-hero.png'});
  results.push('Live metadata/series loaded; real textured WebGL Earth rendered; no raw HH requested initially.');
  if(requests.some(u=>u.endsWith('/hh.webp')))throw new Error('HH was prefetched.');
  await page.locator('#observatory').scrollIntoViewIfNeeded();
  await expect(page.locator('.main-map-container img.leaflet-image-layer')).toHaveCount(1,{timeout:30000});
  await expect(page.locator('.main-map-container .map-state')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('.metric.water strong')).toHaveText('772.5');
  await expect(page.locator('.metric.vegetation strong')).toHaveText('206.1');
  await expect(page.locator('.chart-water path')).toHaveCount(2);
  await page.screenshot({path:'qa/desktop-observatory.png'});
  await page.selectOption('#acquisition-date','2026-10-24');
  await expect(page.locator('.quality-tag')).toHaveText('VALIDATED');
  await expect(page.locator('.main-map-container .map-state')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('.metric.water strong')).toHaveText('245.7');
  await page.locator('.map-play').click();
  await expect(page.locator('#acquisition-date')).toHaveValue('2026-06-26',{timeout:15000});
  await page.locator('.map-play').click();
  await page.selectOption('#acquisition-date','2026-10-24');
  await page.route('**/2026-06-26/bounds.json',async route=>{await new Promise(r=>setTimeout(r,900));await route.continue().catch(()=>{});});
  await page.selectOption('#acquisition-date','2026-06-26');
  await page.selectOption('#acquisition-date','2026-07-20');
  await page.selectOption('#acquisition-date','2026-10-24');
  await expect(page.locator('.main-map-container img.leaflet-image-layer')).toHaveCount(1);
  await expect(page.locator('.main-map-container img.leaflet-image-layer')).toHaveAttribute('src',/2026-10-24\/class.webp/);
  await page.waitForTimeout(1100);
  await expect(page.locator('.main-map-container img.leaflet-image-layer')).toHaveCount(1);
  await page.getByRole('button',{name:/More layers/}).click();
  await page.getByRole('menuitemradio',{name:/Raw radar \(HH\)/}).click();
  await expect(page.locator('.main-map-container .map-state')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('.main-map-container img.leaflet-image-layer')).toHaveAttribute('src',/2026-10-24\/hh.webp/);
  results.push('Date/stats/quality synchronized, gap splits lines, rapid selection leaves only the latest layer, HH loads on demand.');
  await page.locator('#compare').scrollIntoViewIfNeeded();
  await expect(page.locator('.comparison-frame img.leaflet-image-layer')).toHaveCount(2,{timeout:30000});
  await expect(page.locator('.comparison-frame .map-state')).toHaveCount(0,{timeout:30000});
  await expect(page.getByLabel('First comparison date')).toHaveValue('2026-07-08');
  await expect(page.getByLabel('Second comparison date')).toHaveValue('2026-09-06');
  await expect(page.getByLabel('Historical open water year')).toHaveValue('2025',{timeout:20000});
  await page.getByLabel('Historical open water year').selectOption('2019');
  await expect(page.locator('.gauge-fill.below')).toHaveCount(1);
  await page.getByLabel('Historical open water year').selectOption('2025');
  await expect(page.locator('.gauge-fill.above')).toHaveCount(1);
  async function checkClip(){
    const geometry=await page.locator('.comparison-frame').evaluate(el=>{
      const line=el.querySelector('.swipe-line').getBoundingClientRect();
      const imgs=[...el.querySelectorAll('img.leaflet-image-layer')].map(im=>{const r=im.getBoundingClientRect();const vals=im.style.clipPath.match(/-?\d+(?:\.\d+)?/g).map(Number);return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,clip:vals};});return{cut:line.left,imgs};
    });
    if(geometry.imgs.length!==2)throw new Error('Comparison missing layers.');
    const [a,b]=geometry.imgs;
    expect(Math.abs(a.left-b.left)).toBeLessThan(1);expect(Math.abs(a.top-b.top)).toBeLessThan(1);
    if(geometry.cut>a.left&&geometry.cut<a.right){expect(Math.abs(a.right-a.clip[1]-geometry.cut)).toBeLessThan(2);expect(Math.abs(b.left+b.clip[3]-geometry.cut)).toBeLessThan(2);}
  }
  await page.getByLabel('Comparison divider position').fill('31');await checkClip();
  const rect=await page.locator('.comparison-frame .radar-map').boundingBox();
  await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.55);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.7+70,rect.y+rect.height*.55+35,{steps:8});await page.mouse.up();await checkClip();
  await page.locator('.comparison-frame .leaflet-control-zoom-in').click();await checkClip();
  await page.screenshot({path:'qa/desktop-compare.png'});
  results.push('Two-date swipe loaded both real images; complementary clipping aligned during divider changes, pan and zoom.');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(500);await page.screenshot({path:'qa/mobile-hero.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#observatory').scrollIntoViewIfNeeded();await page.screenshot({path:'qa/mobile-observatory.png'});
  await page.locator('#compare').scrollIntoViewIfNeeded();await checkClip();
  results.push('390px mobile layout has no document overflow; comparison clip remains aligned after resize.');
  const reduced=await testPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await reduced.goto(BASE,{waitUntil:'networkidle'});await expect(reduced.locator('h1')).toBeVisible();
  expect(await reduced.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await reduced.close();results.push('Reduced-motion page remains usable with smooth scrolling disabled.');
  const failed=await testPage({viewport:{width:1280,height:900}});
  await failed.route('**/meta.json',route=>route.fulfill({status:503,body:'unavailable'}));
  await failed.goto(BASE,{waitUntil:'networkidle'});await expect(failed.locator('.feed-badge')).toHaveText('Feed unavailable');await expect(failed.locator('.metric')).toHaveCount(0);
  await failed.unroute('**/meta.json');await failed.getByRole('button',{name:'Retry connection'}).click();await expect(failed.locator('.feed-badge')).toContainText('observations loaded',{timeout:25000});
  await failed.close();results.push('Feed failure produces an explicit error without measurements; retry recovers.');
  const missing=await testPage();
  await missing.route('**/timeseries.json',async route=>{const response=await route.fetch();const rows=await response.json();const row=rows.find(x=>x.date==='2026-07-08');delete row.open_water_km2;row.flooded_veg_km2=0;await route.fulfill({json:rows});});
  await missing.route('**/2026-07-08/class.webp',route=>route.abort());
  await missing.goto(BASE,{waitUntil:'networkidle'});await expect(missing.locator('.feed-badge')).toContainText('observations loaded',{timeout:25000});
  await missing.locator('#observatory').scrollIntoViewIfNeeded();await expect(missing.locator('.metric.water strong')).toHaveText('Unavailable');await expect(missing.locator('.metric.vegetation strong')).toHaveText('0.0');await expect(missing.locator('.main-map-container .map-state')).toContainText('Observation unavailable',{timeout:30000});
  await missing.locator('#compare').scrollIntoViewIfNeeded();await expect(missing.locator('.comparison-frame .map-state')).toContainText('Observation unavailable',{timeout:30000});await expect(missing.locator('.comparison-frame img.leaflet-image-layer')).toHaveCount(0);
  await missing.close();results.push('Missing measurement remains unavailable, zero remains zero; failed raster clears both comparison overlays.');
  expect(errors).toEqual([]);
} catch(e){await page.screenshot({path:'qa/failure.png',fullPage:true}).catch(()=>{});console.error(e);process.exitCode=1;results.push(`FAILED: ${e.message}`);}
finally {await writeFile('qa/results.json',JSON.stringify({results,errors,hhRequests:requests.filter(u=>u.endsWith('/hh.webp'))},null,2));console.log(JSON.stringify({results,errors},null,2));await browser.close();}

