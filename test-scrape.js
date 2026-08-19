const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function newCtx(browser) {
  return browser.newContext({
    userAgent: UA,
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: { longitude: -74.006, latitude: 40.7128 },
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  });
}

async function scrapeEbay(page, keyword) {
  const url = 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(keyword) + '&_sop=12';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  try { await page.waitForSelector('li.s-item', { timeout: 15000 }); } catch {}
  await page.waitForTimeout(800);
  const items = await page.$$eval('li.s-item', (els) => els.map((el) => {
    const title = (el.querySelector('.s-item__title')?.textContent || '').trim();
    const price = (el.querySelector('.s-item__price')?.textContent || '').trim();
    const link = el.querySelector('.s-item__link')?.href || '';
    return { title, price, link };
  }).filter((x) => x.title && x.price && !/Shop on eBay/i.test(x.title)));
  return items.slice(0, 10);
}

async function scrapeAmazon(page, keyword) {
  const url = 'https://www.amazon.com/s?k=' + encodeURIComponent(keyword);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  const pageTitle = await page.title();
  const isRobot = /Robot Check|Enter the characters|sorry|CAPTCHA/i.test(pageTitle) ||
    /captcha|robot-check/i.test(page.url());
  if (isRobot) {
    return { title: pageTitle, items: [], blocked: true };
  }
  const items = await page.$$eval('[data-component-type="s-search-result"]', (els) => els.map((el) => {
    const t = (el.querySelector('h2 span')?.textContent || '').trim();
    const whole = (el.querySelector('.a-price .a-price-whole')?.textContent || '').trim();
    const frac = (el.querySelector('.a-price .a-price-fraction')?.textContent || '').trim();
    const price = whole ? ('$' + whole + (frac ? '.' + frac : '')) : '';
    const link = el.querySelector('h2 a')?.href || '';
    return { title: t, price, link };
  }).filter((x) => x.title && x.price));
  return { title: pageTitle, items: items.slice(0, 10), blocked: false };
}

(async () => {
  const kw = process.argv[2] || 'phone case';
  console.log('keyword:', kw);
  const browser = await chromium.launch({ headless: true });
  const ctx = await newCtx(browser);
  const page = await ctx.newPage();

  console.log('\n=== eBay ===');
  try {
    const ebay = await scrapeEbay(page, kw);
    console.log('eBay items:', ebay.length);
    ebay.slice(0, 6).forEach((i) => console.log(' -', i.price, '|', i.title.slice(0, 60)));
  } catch (e) { console.log('eBay error:', e.message); }

  console.log('\n=== Amazon ===');
  try {
    const amz = await scrapeAmazon(page, kw);
    console.log('page title:', amz.title, '| blocked:', amz.blocked);
    console.log('Amazon items:', amz.items.length);
    amz.items.slice(0, 6).forEach((i) => console.log(' -', i.price, '|', i.title.slice(0, 60)));
  } catch (e) { console.log('Amazon error:', e.message); }

  await browser.close();
  console.log('\nDONE');
})();
