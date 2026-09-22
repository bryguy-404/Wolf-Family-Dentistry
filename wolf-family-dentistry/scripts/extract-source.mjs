import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Parse frozen HTML without executing WordPress or third-party scripts.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ javaScriptEnabled: false });
await page.route('**/*', route => route.abort());
const pages = {};
try {
  for (const slug of ['home', 'about-us', 'maintain', 'restore', 'testimonials', 'contact-us', 'cherry-payment', 'sitemap']) {
    await page.setContent(await readFile(new URL(`../migration/source/${slug}.html`, import.meta.url), 'utf8'));
    pages[slug] = await page.evaluate(() => {
      const main = document.querySelector('#main-content');
      const clean = (element) => {
        const copy = element.cloneNode(true);
        copy.querySelectorAll('script,style,link,img,iframe,noscript').forEach(el => el.remove());
        copy.querySelectorAll('*').forEach(el => {
          for (const attr of [...el.attributes]) if (!['href', 'title'].includes(attr.name)) el.removeAttribute(attr.name);
          if (el.tagName === 'A') {
            const href = el.getAttribute('href') || '';
            if (/^(\/|https:\/\/wolffamilydentistryin.com\/)/.test(href)) {
              const url = new URL(href, 'https://wolffamilydentistryin.com');
              el.setAttribute('href', url.pathname + (!url.pathname.endsWith('/') && !url.pathname.split('/').pop().includes('.') ? '/' : '') + url.search + url.hash);
            }
          }
        });
        return copy.innerHTML.trim();
      };
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        modules: [...main.querySelectorAll('.et_pb_module')].map((el, i) => ({
          i, classes: el.className, text: el.textContent.trim(), html: el.innerHTML,
        })),
        text: main.innerText,
        links: [...document.querySelectorAll('a[href]')].map(el => ({ text: el.textContent.trim(), href: el.getAttribute('href') })),
        images: [...main.querySelectorAll('img')].map(el => ({ src: el.getAttribute('src'), alt: el.alt })),
        embeds: [...main.querySelectorAll('iframe')].map(el => ({ src: el.src, title: el.title })),
        forms: [...main.querySelectorAll('form')].map(el => el.outerHTML),
        blocks: [...main.querySelectorAll('.et_pb_module')].map((el, i) => {
          const content = el.querySelector('.et_pb_text_inner') || el;
          const heading = content.querySelector('h1,h2,h3,h4,h5');
          return { id: i, html: clean(content), heading: heading?.textContent.trim() || '' };
        }),
        reviews: [...main.querySelectorAll('.ti-review-item')].map(el => ({
          name: el.querySelector('.ti-name').textContent.trim(),
          text: el.querySelector('.ti-review-content').textContent.trim(),
          stars: el.querySelectorAll('.ti-star').length,
          attribution: el.querySelector('.ti-tooltip').textContent.trim(),
          verification: el.querySelector('.ti-verified-tooltip').textContent.trim(),
        })),
        sitemap: clean(main),
      };
    });
  }
  await writeFile(new URL('../migration/source/extracted.json', import.meta.url), JSON.stringify(pages, null, 2) + '\n');
  await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
  const content = Object.fromEntries(Object.entries(pages).map(([slug, page]) => [slug, {
    title: page.title, description: page.description, canonical: page.canonical,
    blocks: page.blocks, reviews: page.reviews, embeds: page.embeds,
    ...(slug === 'sitemap' ? { html: page.sitemap } : {}),
  }]));
  await writeFile(new URL('../src/data/source-content.json', import.meta.url), JSON.stringify(content, null, 2) + '\n');
  for (const [slug, data] of Object.entries(pages)) {
    console.log(`\nPAGE ${slug} — ${data.title}\n${data.description}`);
    console.log(data.modules.map(m => `${m.i}: ${m.classes}\n${m.text}`).join('\n'));
    console.log('IMAGES', data.images, 'EMBEDS', data.embeds, 'FORMS', data.forms.length);
  }
} finally { await browser.close(); }
