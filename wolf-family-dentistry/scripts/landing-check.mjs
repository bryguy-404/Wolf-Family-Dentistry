import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = process.argv[2] || 'http://localhost:4326';
const output = new URL('../.loop/landing/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
// Avoid real measurement and isolate layout checks from the third-party map.
await context.route(/https:\/\/(www\.google\.com|www\.googletagmanager\.com|.*google-analytics\.com)\//, route => route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body style="background:#edf1e8;color:#536058;font:15px Arial;padding:25px">Google Maps embed · isolated during automated verification</body></html>'}));
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const report = { widths: [], calls: 0, checks: [] };
try {
 for (const width of [320, 375, 390, 768, 1024, 1440]) {
  await page.setViewportSize({width, height:900});
  await page.goto(`${base}/dentist-la-porte/?utm_source=qa&gclid=qa-check`, {waitUntil:'networkidle'});
  await page.evaluate(async()=>{await document.fonts.ready; for(const img of document.images) { img.loading='eager'; await img.decode(); }});
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('nav, form').count(), 0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth), false, `Overflow at ${width}`);
  assert.equal(await page.locator('video').getAttribute('preload'), 'none');
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.endsWith('.mp4'))), false, 'Video fetched before play');
  assert.equal(await page.locator('.review-card').count(),4);
  assert.equal(await page.locator('[data-call-cta]').evaluateAll(links=>links.every(a=>a.getAttribute('href')==='tel:+12193623730')),true);
  if (width <= 650) { const rect=await page.locator('.mobile-call').boundingBox(); assert.ok(rect && Math.abs(rect.y+rect.height-900)<2); }
  await page.screenshot({path:new URL(`width-${width}.png`,output).pathname,fullPage:true});
  report.widths.push({width,overflow:false,images:'decoded',video:'not fetched before play'});
 }
 // Prevent the dialer during checks, but allow the page handler to observe the click.
 await page.evaluate(()=>document.addEventListener('click', e=>{if(e.target instanceof Element && e.target.closest('a[href^="tel:"]'))e.preventDefault();},true));
 const links=page.locator('[data-call-cta]');
 for(let i=0;i<await links.count();i++) await links.nth(i).dispatchEvent('click');
 report.calls=await links.count();
 assert.equal(await page.evaluate(()=>window.dataLayer.filter(e=>e.event==='phone_call_click').length),report.calls);
 assert.equal(await page.locator('[data-privacy-link]').getAttribute('href'),`${base}/landing-privacy/?utm_source=qa&gclid=qa-check`);
 await page.locator('[data-privacy-link]').click();
 await page.waitForFunction(()=>document.querySelector('#privacy-return')?.href.includes('gclid=qa-check'));
 assert.ok((await page.locator('#privacy-return').getAttribute('href')).includes('gclid=qa-check'));
 await page.locator('#privacy-return').click();
 assert.ok(page.url().includes('utm_source=qa'));
 for(const kw of ['cleaning','general','appointment','unknown','<img src=x onerror=alert(1)>']){
  await page.goto(`${base}/dentist-la-porte/?kw=${encodeURIComponent(kw)}`);
  await page.waitForFunction(()=>Array.isArray(window.dataLayer));
  const title=await page.locator('h1').innerText();
  if(kw==='cleaning')assert.match(title,/Dental cleanings in La Porte/);
  if(kw==='unknown'||kw.startsWith('<'))assert.match(title,/Your family dentist/);
 }
 const schema=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
 assert.equal(schema['@type'],'Dentist');assert.equal(schema.geo.latitude,41.6417991);
 assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, follow');
 await page.locator('video').evaluate(video=>video.play());
 await page.waitForFunction(()=>document.querySelector('video').currentTime>0);
 await page.locator('video').evaluate(video=>{ if(video instanceof HTMLVideoElement) video.pause(); });
 // Verify office hours at boundaries, weekend, winter, and across visitor timezones.
 for(const [date,open] of [['2026-09-29T13:59:00Z',false],['2026-09-29T14:00:00Z',true],['2026-09-29T21:00:00Z',false],['2026-09-30T21:30:00Z',true],['2026-10-01T13:59:00Z',false],['2026-10-01T14:00:00Z',true],['2026-10-01T14:30:00Z',true],['2026-10-01T20:59:00Z',true],['2026-10-01T21:00:00Z',false],['2026-10-01T15:00:00Z',true],['2026-10-01T17:59:00Z',true],['2026-10-01T18:00:00Z',false],['2026-10-01T18:59:00Z',false],['2026-10-01T19:00:00Z',true],['2026-09-29T18:30:00Z',true],['2026-10-02T16:00:00Z',false],['2026-01-05T15:00:00Z',true]]){
  await page.clock.install({time:new Date(date)});
  await page.goto(`${base}/dentist-la-porte/`);
  await page.waitForFunction(()=>Array.isArray(window.dataLayer));
  const status=await page.locator('[data-office-status]').first().textContent();
  assert.equal(status.startsWith('Within'),open,date);
 }
 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});
 const fallback=await noJs.newPage();await fallback.goto(`${base}/dentist-la-porte/`);
 assert.equal(await fallback.locator('[data-call-cta="hero"]').getAttribute('href'),'tel:+12193623730');
 assert.equal(await fallback.locator('h1').count(),1);await noJs.close();
 // Exercise the actual source with test IDs; Google requests remain mocked.
 const trackingContext=await browser.newContext();
 await trackingContext.route('**/*',route=>route.request().url().startsWith(base)&&!route.request().url().includes('/src/scripts/landing')?route.continue():route.fulfill({status:200,body:''}));
 const tracking=await trackingContext.newPage();
 await tracking.goto(`${base}/dentist-la-porte/`);
 const config={PUBLIC_LANDING_GA4_ID:'G-QATEST',PUBLIC_LANDING_ADS_ID:'AW-123456789',PUBLIC_LANDING_ADS_CLICK_LABEL:'test-click',PUBLIC_LANDING_ADS_CALL_LABEL:'test-call'};
 let source=await readFile(new URL('../src/scripts/landing.ts',import.meta.url),'utf8');
 source=source.replace(/import\.meta\.env\.(\w+)/g,(_,key)=>JSON.stringify(config[key]||''));
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/export /g,'');
 await tracking.addScriptTag({content:js});
 await tracking.evaluate(()=>{
   const config=window.dataLayer.find(e=>e[0]==='config'&&e[1]==='AW-123456789/test-call');
   config[2].phone_conversion_callback('(800) 555-0100','+18005550100');
   document.addEventListener('click',e=>e.preventDefault(),true);
 });
 assert.equal(await tracking.locator('[data-call-cta]').evaluateAll(links=>links.every(a=>a.getAttribute('href')==='tel:+18005550100')),true);
 assert.equal(await tracking.locator('[data-phone-number]').evaluateAll(els=>els.every(el=>el.textContent==='(800) 555-0100')),true);
 await tracking.locator('[data-call-cta="hero"]').click();
 assert.equal(await tracking.evaluate(()=>window.dataLayer.filter(e=>e[0]==='event'&&e[1]==='phone_call_click'&&e[2].send_to==='G-QATEST').length),1);
 assert.equal(await tracking.evaluate(()=>window.dataLayer.filter(e=>e[0]==='event'&&e[1]==='conversion'&&e[2].send_to==='AW-123456789/test-click').length),1);
 await trackingContext.close();
 assert.deepEqual(errors,[]);
 report.checks=['one H1; no navigation/forms','all phone targets and click events','UTM and gclid retained through privacy round trip','keyword allowlist','Central Time schedule and daylight-saving dates','Dentist schema and noindex','no-JavaScript call fallback','video playback','mocked GA4 and Ads events; forwarding number updates every dial target','no browser exceptions'];
 await writeFile(new URL('report.json',output),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
