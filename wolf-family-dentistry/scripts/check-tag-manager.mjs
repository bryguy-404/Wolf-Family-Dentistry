import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const output = new URL('../dist/', import.meta.url);
const pages = readdirSync(output, { recursive: true }).filter((file) => file.endsWith('.html'));
assert.ok(pages.length > 0, 'No built HTML pages found to check for Google Tag Manager.');

for (const page of pages) {
  const html = readFileSync(new URL(page, output), 'utf8');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
  const script = head.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1] ?? '';

  assert.ok(
    script.includes('https://www.googletagmanager.com/gtm.js?id=') && script.includes("'GTM-P5SW9TW5'"),
    `${page}: the first head script must load Google Tag Manager GTM-P5SW9TW5.`,
  );
  assert.match(
    body.replace(/<!--[^]*?-->/g, '').trimStart(),
    /^<noscript>\s*<iframe\b[^>]*src="https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-P5SW9TW5"/,
    `${page}: the Google Tag Manager noscript iframe must be first in the body.`,
  );
  assert.equal(
    (html.match(/GTM-P5SW9TW5/g) ?? []).length,
    2,
    `${page}: expected exactly one Google Tag Manager script and one noscript fallback.`,
  );
}

console.log(`Google Tag Manager verified on all ${pages.length} built pages.`);
