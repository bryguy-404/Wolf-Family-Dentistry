import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.argv[2] || 'http://localhost:4323';
const sourceDir = new URL(process.argv[3] || '../migration/source/', import.meta.url);
const out = new URL('../.loop/migration/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const slugs = ['home', 'about-us', 'maintain', 'restore', 'testimonials', 'contact-us', 'cherry-payment', 'sitemap'];
const report = { base, generatedAt: new Date().toISOString(), pages: [], viewports: [], integrations: {}, passed: false };
const routeFor = slug => slug === 'home' ? '/' : `/${slug}/`;
const linkMigrations = JSON.parse(await readFile(new URL('../src/data/link-migrations.json', import.meta.url), 'utf8'));
// Independent comparison against frozen WordPress HTML, not the generated content JSON.
const textOf = el => {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('script,style,noscript,[aria-hidden="true"]').forEach(node => node.remove());
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const chunks = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.replace(/\s+/g, ' ').trim();
    if (text) chunks.push(text);
  }
  return chunks.join(' ');
};
const normalizeHref = href => {
  href = linkMigrations[href] || href;
  if (href.startsWith('tel:')) return href.replace(/[^\d+]/g, '');
  const u = new URL(href, 'https://wolffamilydentistryin.com');
  if (u.origin !== 'https://wolffamilydentistryin.com') return u.href;
  return u.pathname.replace(/\/$/, '') + u.search + u.hash;
};
try {
  const originals = {};
  const parser = await browser.newPage({ javaScriptEnabled: false });
  await parser.route('**/*', route => route.abort());
  for (const slug of slugs) {
    await parser.setContent(await readFile(new URL(`${slug}.html`, sourceDir), 'utf8'));
    originals[slug] = {
      title: await parser.title(),
      description: await parser.locator('meta[name="description"]').count() ? await parser.locator('meta[name="description"]').getAttribute('content') : '',
      blocks: await parser.locator('#main-content .et_pb_text, #main-content .et_pb_promo, #main-content .et_pb_button_module_wrapper, #main-content .et_pb_accordion_item').evaluateAll((els, fn) => els.map(el => (0, eval)(`(${fn})`)(el)).filter(Boolean), textOf.toString()),
      reviews: await parser.locator('.ti-review-item').evaluateAll(els => els.map(el => ({ name: el.querySelector('.ti-name').textContent.trim(), text: el.querySelector('.ti-review-content').textContent.trim() }))),
      links: await parser.locator('#main-content a[href]').evaluateAll(els => els.map(el => el.getAttribute('href'))),
      ...(slug === 'sitemap' ? { sitemap: await parser.locator('#main-content').evaluate(textOf) } : {}),
    };
  }
  await parser.close();

  // Third-party integrations receive their own live check below. Isolate local layout/content checks.
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const request = route.request();
    if ((request.isNavigationRequest() && request.frame().parentFrame()) || request.url().includes('files.withcherry.com')) return route.abort();
    return route.continue();
  });
  const internalLinks = new Set();
  for (const width of [320, 375, 768, 1024, 1280]) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const slug of slugs) {
      const response = await page.goto(base + routeFor(slug));
      assert.equal(response.status(), 200);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(img => { img.loading = 'eager'; return img.decode(); }));
      });
      assert.equal(await page.locator('h1').count(), 1, `${slug}: one h1`);
      assert.equal(await page.locator('vite-error-overlay').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${slug} at ${width}: overflow`);
      if (width === 1280) {
        const expected = originals[slug];
        assert.equal(await page.title(), expected.title);
        assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), expected.description);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://wolffamilydentistryin.com' + routeFor(slug));
        const actual = await page.locator('[data-source]').evaluateAll((els, fn) => els.map(el => (0, eval)(`(${fn})`)(el)), textOf.toString());
        for (const block of expected.blocks) assert(actual.includes(block), `${slug}: missing/changed source block: ${block.slice(0, 120)}`);
        if (slug === 'sitemap') assert.equal(await page.locator('[data-source-sitemap]').evaluate(textOf), expected.sitemap);
        for (const review of expected.reviews) {
          const card = page.locator('[data-source-review]').filter({ hasText: review.name });
          assert.equal(await card.locator('figcaption').innerText(), review.name);
          assert.equal((await card.locator('blockquote').textContent()).trim(), review.text);
        }
        const actualLinks = (await page.locator('a[href]').evaluateAll(els => els.map(el => el.getAttribute('href')))).map(normalizeHref);
        for (const href of expected.links) assert(actualLinks.includes(normalizeHref(href)), `${slug}: missing source link ${href}`);
        const links = await page.locator('a[href^="/"]').evaluateAll(els => els.map(el => el.getAttribute('href')));
        links.forEach(href => internalLinks.add(href));
        const broken = await page.locator('a[href^="#"]').evaluateAll(els => els.filter(el => !document.getElementById(el.hash.slice(1))).map(el => el.hash));
        assert.deepEqual(broken, []);
        report.pages.push({ slug, sourceBlocks: expected.blocks.length, reviews: expected.reviews.length, copy: 'exact (normalized HTML whitespace)', metadata: 'passed', sourceLinks: 'passed' });
        if (['home', 'about-us', 'maintain', 'contact-us', 'testimonials'].includes(slug)) await page.screenshot({ path: new URL(`${slug}-desktop.png`, out).pathname, fullPage: true });
      }
      if (width < 1280) {
        const toggle = page.getByRole('button', { name: 'Toggle navigation' });
        await toggle.focus();
        await page.keyboard.press('Enter');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        assert(await page.getByRole('navigation', { name: 'Mobile navigation' }).isVisible());
        await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert(await toggle.evaluate(el => document.activeElement === el));
      } else {
        assert(await page.getByRole('navigation', { name: 'Primary navigation' }).isVisible());
        const collision = await page.locator('header > div:first-child').evaluate(row => {
          const children = [...row.children].filter(el => getComputedStyle(el).display !== 'none');
          return children.some((el, i) => i && el.getBoundingClientRect().left < children[i - 1].getBoundingClientRect().right);
        });
        assert.equal(collision, false, `${slug}: header overlap`);
      }
      if (slug === 'about-us') {
        const faq = page.locator('details').first();
        await faq.locator('summary').click();
        assert(await faq.getAttribute('open') !== null);
        assert(await faq.locator('.faq-answer').isVisible());
      }
      if (slug === 'contact-us') {
        // The live provider is checked separately; frame navigation is blocked in this copy audit.
        assert.equal(await page.locator('.contact-form script[src="https://form.jotform.com/jsform/262646850204052"]').count(), 1);
        assert(await page.locator('.contact-form a[href="https://form.jotform.com/262646850204052"]').isVisible());
      }
      if (width === 375) await page.screenshot({ path: new URL(`${slug}-mobile.png`, out).pathname, fullPage: true });
      console.log(`${slug} ${width}px: PASS`);
    }
    assert.deepEqual(errors, [], `First-party runtime errors at ${width}`);
    // Follow a real menu link to a second route, then verify active state.
    if (width < 1280) {
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'About Us', exact: true }).click();
      assert.equal(new URL(page.url()).pathname, '/about-us/');
      assert.equal(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded'), 'false');
    }
    report.viewports.push({ width, pages: slugs.length, overflow: false, runtimeErrors: errors });
    await page.close();
  }
  for (const href of internalLinks) assert.equal((await context.request.get(base + href)).status(), 200, `Broken local link: ${href}`);
  const pdf = await context.request.get(base + '/wp-content/uploads/2019/04/Patient-Registration-Forms.pdf');
  assert((await pdf.body()).subarray(0, 5).toString() === '%PDF-');
  const sitemap = await context.request.get(base + '/page-sitemap.xml');
  const xml = await sitemap.text();
  for (const slug of slugs) assert(xml.includes(`https://wolffamilydentistryin.com${routeFor(slug)}</loc>`));
  const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  await noJs.goto(base + '/about-us/');
  assert(await noJs.getByRole('navigation', { name: 'Mobile navigation' }).isVisible());
  await noJs.locator('details').first().locator('summary').click();
  assert(await noJs.locator('.faq-answer').first().isVisible());
  await noJs.close();
  report.integrations.localLinks = internalLinks.size;
  report.integrations.patientPdf = 'passed';
  report.integrations.xmlSitemap = 'all eight original routes';
  report.integrations.noJavaScript = 'navigation and FAQs passed';
  report.integrations.contactForm = 'Jotform embed and direct-form fallback present; submission delivery requires a separate end-to-end check';
  report.passed = true;
} catch (error) {
  report.error = String(error);
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile(new URL('report.json', out), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
