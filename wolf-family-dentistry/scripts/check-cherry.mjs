import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const results = [];
try {
  for (const base of ['https://wolffamilydentistryin.com', process.argv[2] || 'http://localhost:4324']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push({ message: error.message, stack: error.stack }));
    await page.goto(base + '/cherry-payment/');
    const region = page.getByRole('region', {name:'See an example of what you could pay'});
    const amount = page.getByRole('textbox', {name:'Example payments for'});
    await amount.waitFor();
    await region.getByRole('button', {name:/for 12 months/}).waitFor({timeout:25000});
    const before = await region.getByRole('button', {name:/for 12 months/}).getAttribute('aria-label');
    await amount.fill('3000');
    await amount.press('Tab');
    await page.waitForFunction(() => {
      const walk = root => [...root.querySelectorAll('*')].flatMap(el => [el, ...(el.shadowRoot ? walk(el.shadowRoot) : [])]);
      return walk(document).some(el => el.getAttribute('aria-label')?.includes('$230.77 for 12 months'));
    }, null, {timeout:25000});
    const after = await region.getByRole('button', {name:/for 12 months/}).getAttribute('aria-label');
    results.push({base,before,after,calculatorUpdated:before !== after,errors});
    await page.close();
  }
} finally {
  await writeFile(new URL('../migration/audit/cherry-check.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
  await browser.close();
}
