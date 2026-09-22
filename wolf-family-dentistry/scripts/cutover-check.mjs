import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:4324';
const audit = new URL('../migration/audit/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('archive-manifest.json', audit), 'utf8'));
const video = JSON.parse(await readFile(new URL('video-manifest.json', audit), 'utf8'));
const expectedCues = (await readFile(new URL('../public/media/wolf-family-dentistry.en.vtt', import.meta.url), 'utf8')).match(/-->/g).length;
const overrides = JSON.parse(await readFile(new URL('../src/data/link-migrations.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
const legacyHosts = ['wolffamilydentistryin.com', 'wolffamilydent.wpengine.com', 'elocallink.tv', 'vid.hellonetcdn.com', 'files.hellonetcdn.com', 'reviews.nextadagency.com', 'nextadagency.com', 'www.cgicompany.com'];
const report = { checkedAt: new Date().toISOString(), base, pages: [], archivedFiles: [], legacyNetworkRequests: [], missingLinks: [], runtimeErrors: [], passed: false };
const normalize = href => {
  href = overrides[href] || href;
  if (href.startsWith('tel:')) return 'tel:' + href.replace(/[^+\d]/g, '');
  const url = new URL(href, 'https://wolffamilydentistryin.com');
  if ([new URL(base).origin, 'https://wolffamilydentistryin.com'].includes(url.origin)) return url.pathname.replace(/\/$/, '') + url.search + url.hash;
  return url.href;
};

try {
  const context = await browser.newContext();
  await context.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    if (legacyHosts.includes(host)) {
      report.legacyNetworkRequests.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.runtimeErrors.push({message: error.message, stack: error.stack}));
  const targetLinks = new Set();
  for (const source of manifest.pages) {
    const path = new URL(source.url).pathname;
    assert.equal((await page.goto(base + path)).status(), 200);
    const links = await page.locator('a[href]').evaluateAll(els => els.map(el => ({ href: el.getAttribute('href'), text: el.textContent.trim() })));
    const actual = new Set(links.map(link => normalize(link.href)));
    const original = [...new Set(source.links.map(normalize))];
    for (const href of original) if (!actual.has(href)) report.missingLinks.push({ path, href });
    links.filter(link => link.href.startsWith('/')).forEach(link => targetLinks.add(link.href));
    const images = await page.locator('img').evaluateAll(async els => Promise.all(els.map(async img => {
      img.loading = 'eager';
      await img.decode();
      return { src: img.getAttribute('src'), width: img.naturalWidth };
    })));
    assert(images.every(image => (image.src.startsWith('/') || image.src.startsWith('https://files.withcherry.com/')) && image.width > 0), JSON.stringify({path,images}));
    report.pages.push({ path, sourceLinkDestinations: original.length, sourceLinksPreserved: original.every(href => actual.has(href)), localImages: images.length });
  }
  assert.deepEqual(report.missingLinks, []);
  for (const href of targetLinks) assert.equal((await context.request.get(base + href)).status(), 200, href);

  // Verify every archived upload and the video assets are actually served byte-for-byte.
  for (const file of [...manifest.files, ...video.files]) {
    const response = await context.request.get(base + file.local);
    assert.equal(response.status(), 200, file.local);
    const hash = createHash('sha256').update(await response.body()).digest('hex');
    assert.equal(hash, file.sha256, `Changed/corrupt archive file: ${file.local}`);
    report.archivedFiles.push({ path: file.local, sha256: hash, status: 200 });
  }

  await page.goto(base + '/');
  const media = page.locator('video');
  await media.evaluate(async element => {
    element.muted = true;
    element.textTracks[0].mode = 'hidden';
    await element.play();
  });
  await page.waitForFunction(() => document.querySelector('video').currentTime > .2);
  await page.waitForFunction(() => document.querySelector('video').textTracks[0].cues?.length > 0);
  report.videoPlayback = await media.evaluate(element => {
    element.pause();
    return { duration: element.duration, width: element.videoWidth, height: element.videoHeight, timePlayed: element.currentTime, captionCues: element.textTracks[0].cues.length, source: element.currentSrc };
  });
  assert.equal(report.videoPlayback.captionCues, expectedCues, 'All original caption cues must parse');
  assert(report.videoPlayback.duration > 60);
  assert.deepEqual(report.legacyNetworkRequests, [], 'New site still requests old-host resources');
  const cherryBaseline = JSON.parse(await readFile(new URL('cherry-check.json', audit), 'utf8')).find(result => result.base === 'https://wolffamilydentistryin.com');
  report.knownProviderErrors = report.runtimeErrors.filter(error => error.stack?.includes('https://files.withcherry.com/widgets/widget.js') && cherryBaseline?.errors.some(original => original.message === error.message));
  report.unexpectedRuntimeErrors = report.runtimeErrors.filter(error => !report.knownProviderErrors.includes(error));
  assert.deepEqual(report.unexpectedRuntimeErrors, []);
  report.uniqueLocalLinkTargets = targetLinks.size;
  report.passed = true;
} catch (error) {
  report.error = String(error);
  process.exitCode = 1;
  console.error(error);
} finally {
  await writeFile(new URL('cutover-report.json', audit), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, pages: report.pages.length, verifiedFiles: report.archivedFiles.length, legacyRequests: report.legacyNetworkRequests, missingLinks: report.missingLinks, video: report.videoPlayback }, null, 2));
  await browser.close();
}
