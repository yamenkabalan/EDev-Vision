const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
 const requests = [], errors = [];
 page.on('request', r => { if(r.url().includes('NISAR_L2')) requests.push(r.url()); });
 page.on('pageerror', e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/#observatory');
 const area = page.locator('#observatory');
 await area.locator('.wr-map').scrollIntoViewIfNeeded();
 await area.locator('.wr-skeleton').waitFor({state:'hidden',timeout:60000});
 await area.getByRole('radio',{name:'Country',exact:true}).click();
 await area.locator('.pp-fields select').first().selectOption({label:'Chad'});
 await area.locator('.wr-map').scrollIntoViewIfNeeded();
 await page.waitForTimeout(2000);
 const box=await area.locator('.wr-map').boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.4);
 const start=Date.now();
 await page.mouse.wheel(0,-1000);
 await page.waitForTimeout(1200);
 let settled=true;
 try { await page.waitForFunction(()=>document.querySelector('.wr-when')?.textContent.includes('detail loaded'),{},{timeout:45000}); } catch { settled=false; }
 const result={settled,elapsedMs:Date.now()-start,requests:requests.length,unique:new Set(requests).size,errors,status:await area.locator('.wr-when').textContent(),timings:await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('NISAR_L2')).map(r=>({url:r.name,ms:r.duration})))};
 fs.writeFileSync(process.env.REPORT || require('node:path').join(require('node:os').tmpdir(),'radar-before.json'),JSON.stringify(result,null,2));
 await area.locator('.wr-map').screenshot({path:require('node:path').join(require('node:os').tmpdir(),'radar-detail.png')});
 console.log(JSON.stringify({...result,timings:result.timings.slice(-5)}));
 if (!settled || !requests.length || errors.length) throw new Error('NISAR detail did not finish loading cleanly');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

