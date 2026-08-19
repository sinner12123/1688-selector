const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

(async () => {
  const kw = process.argv[2] || 'phone case';
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });
  const ctx = await browser.newContext({ userAgent: UA, viewport: null, locale: 'en-US' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const url = 'https://www.aliexpress.com/w/wholesale-' + kw.replace(/\s+/g, '-') + '.html?sortType=total_tranpro_desc';
  console.log('URL:', url);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(12000);
  } catch (e) { console.log('goto error:', e.message.slice(0, 100)); }

  console.log('final URL:', page.url().slice(0, 90));
  console.log('login墙:', /login|signin/i.test(page.url()));

  let itemCount = 0;
  try { itemCount = await page.$$eval('a[href*="/item/"]', (e) => e.length); } catch {}
  console.log('商品链接数:', itemCount);

  const items = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[href*="/item/"]').forEach((a) => {
      const card = a.closest('div') || a;
      const t = card.querySelector('h3, h2, [class*="title"], [class*="subject"]');
      const p = card.querySelector('[class*="price"]');
      if (t && p) out.push({ title: t.textContent.trim().slice(0, 60), price: p.textContent.trim().replace(/\s+/g, ' ') });
    });
    return out.slice(0, 10);
  });
  console.log('提取条数:', items.length);
  items.forEach((i) => console.log(' -', i.price, '|', i.title));

  await browser.close();
  console.log('\nDONE');
})();
