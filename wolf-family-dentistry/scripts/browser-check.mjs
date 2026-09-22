import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Functional checks and pixel diagnostics. This does not replace the AI gate.
const url = process.argv[2] || 'http://localhost:4321';
const out = new URL('../.loop/', import.meta.url);
await mkdir(out, { recursive: true });
const design = await readFile(new URL('../design/index.html', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
const report = { url, generatedAt: new Date().toISOString(), viewports: [] };
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(async (img) => {
      img.loading = 'eager';
      await img.decode();
    }));
  });
}

try {
  for (const [label, width, height] of [
    ['small-mobile', 320, 900], ['mobile', 375, 900],
    ['tablet', 768, 1000], ['small-desktop', 1024, 900], ['desktop', 1280, 900],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await settle(page);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('main section').count(), 6);
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://wolffamilydentistryin.com/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `${label}: horizontal overflow`);
    const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll((links) => links.filter((link) => !document.getElementById(link.hash.slice(1))).map((link) => link.hash));
    assert.deepEqual(brokenAnchors, []);
    const phoneLinks = await page.locator('a[href^="tel:"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    assert(phoneLinks.length >= 7 && phoneLinks.every((href) => href === 'tel:+12193623730'));
    const screenshot = await page.screenshot({ fullPage: true, path: new URL(`built-${label}.png`, out).pathname });
    const result = { label, width, overflow, imageCount: await page.locator('img').count(), menu: width < 1280 ? 'checked' : 'desktop navigation', errors };

    if (['mobile', 'tablet', 'desktop'].includes(label)) {
      const reference = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      await reference.setContent(design, { waitUntil: 'networkidle' });
      await settle(reference);
      // Verify the frozen reference's CDN actually styled the target.
      assert.equal(await reference.locator('header').evaluate((el) => getComputedStyle(el).position), 'sticky');
      assert.equal(normalize(await page.locator('main').innerText()), normalize(await reference.locator('main').innerText()), 'Page copy must match the supplied mockup');
      const target = await reference.screenshot({ fullPage: true, path: new URL(`target-${label}.png`, out).pathname });
      const a = PNG.sync.read(target), b = PNG.sync.read(screenshot);
      const sharedHeight = Math.min(a.height, b.height);
      const pixels = width * sharedHeight;
      const changed = pixelmatch(a.data.subarray(0, pixels * 4), b.data.subarray(0, pixels * 4), null, width, sharedHeight, { threshold: 0.12 });
      result.pixelMismatchPercent = +(100 * changed / pixels).toFixed(2);
      result.targetHeight = a.height;
      result.builtHeight = b.height;
      await reference.close();
    }

    if (width < 1280) {
      const toggle = page.getByRole('button', { name: 'Toggle navigation' });
      assert(await toggle.isVisible());
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await toggle.focus();
      await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert(await page.getByRole('navigation', { name: 'Mobile navigation' }).isVisible());
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert(await toggle.evaluate((el) => el === document.activeElement));
      await toggle.click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Your Experience', exact: true }).click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(new URL(page.url()).hash, '#experience');
      const targetTop = await page.locator('#experience').evaluate((el) => el.getBoundingClientRect().top);
      const headerHeight = await page.locator('header').evaluate((el) => el.getBoundingClientRect().height);
      assert(targetTop >= headerHeight, 'Anchor target must clear the sticky header');
    } else {
      assert(await page.getByRole('navigation', { name: 'Primary navigation' }).isVisible());
      const overlaps = await page.locator('header > div:first-child').evaluate((row) => {
        const visible = [...row.children].filter((el) => getComputedStyle(el).display !== 'none');
        return visible.some((el, i) => i > 0 && el.getBoundingClientRect().left < visible[i - 1].getBoundingClientRect().right);
      });
      assert.equal(overlaps, false, 'Header elements must not overlap');
    }
    assert.deepEqual(errors, [], `${label}: browser errors`);
    report.viewports.push(result);
    console.log(`${label}: PASS (${result.pixelMismatchPercent ?? 'n/a'}% pixel difference; diagnostic only)`);
    await page.close();
  }
  const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  await noJs.goto(url);
  assert(await noJs.getByRole('navigation', { name: 'Mobile navigation' }).isVisible(), 'Navigation must work without JavaScript');
  await noJs.close();
  report.noJavaScriptNavigation = 'passed';
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = String(error);
  process.exitCode = 1;
  console.error(error);
} finally {
  await writeFile(new URL('browser-report.json', out), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
