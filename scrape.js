// 海外价格采集（AliExpress / Amazon / eBay）——按平台独立、可并行
// 反爬方案参考 GitHub 开源项目：
//   - p3nnatr4tion/aliexpress-puppeteer  (真实 Chrome + 有头 + stealth)
//   - sudheer-ranga/aliexpress-product-scraper (mtop API 拦截)
//   - puppeteer-extra-plugin-stealth (隐身)
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function shortErr(e) {
  const m = (e && e.message) || String(e);
  return m.split('\n')[0].slice(0, 200);
}

// 把用户代理配置转成 Playwright 的 proxy 对象
function buildProxy(p) {
  if (!p || !p.enabled || !p.host || !p.port) return null;
  const type = p.type === 'socks5' ? 'socks5' : 'http';
  const server = type + '://' + p.host + ':' + p.port;
  const proxy = { server };
  if (p.username) { proxy.username = p.username; proxy.password = p.password || ''; }
  return proxy;
}

async function launchHeadless() {
  return chromium.launch({ headless: true });
}

async function newRealContext(browser, proxy) {
  const opts = {
    userAgent: UA,
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: { longitude: -74.006, latitude: 40.7128 },
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  };
  if (proxy) opts.proxy = proxy;
  return browser.newContext(opts);
}

// —— 页面级抓取（假设已有打开的 page）——

async function ebayPage(page, keyword) {
  const url = 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(keyword) + '&_sop=12';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const pageTitle = await page.title();
  if (/Error Page|Robot|Access Denied|denied|blocked/i.test(pageTitle)) {
    throw new Error('eBay 拒绝访问（IP 被标记），需住宅 IP');
  }
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

async function amazonPage(page, keyword) {
  const url = 'https://www.amazon.com/s?k=' + encodeURIComponent(keyword);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  const pageTitle = await page.title();
  const blocked = /Robot Check|Enter the characters|sorry|CAPTCHA/i.test(pageTitle) ||
    /captcha|robot-check/i.test(page.url());
  if (blocked) return { items: [], blocked: true };
  const items = await page.$$eval('[data-component-type="s-search-result"]', (els) => els.map((el) => {
    const t = (el.querySelector('h2 span')?.textContent || '').trim();
    let price = (el.querySelector('.a-price .a-offscreen')?.textContent || '').trim();
    if (!price) {
      const whole = (el.querySelector('.a-price .a-price-whole')?.textContent || '').trim().replace(/\.$/, '');
      const frac = (el.querySelector('.a-price .a-price-fraction')?.textContent || '').trim();
      price = whole ? ('$' + whole + (frac ? '.' + frac : '')) : '';
    }
    const link = el.querySelector('h2 a')?.href || '';
    return { title: t, price, link };
  }).filter((x) => x.title && x.price));
  return { items: items.slice(0, 10), blocked: false };
}

// —— 自包含平台抓取（各自管理浏览器，返回 {items, error}）——

async function scrapeEbay(keyword, proxy) {
  let browser;
  try {
    browser = await launchHeadless();
    const ctx = await newRealContext(browser, proxy);
    const page = await ctx.newPage();
    const items = await ebayPage(page, keyword);
    return { items, error: null };
  } catch (e) { return { items: [], error: shortErr(e) }; }
  finally { try { if (browser) await browser.close(); } catch {} }
}

async function scrapeAmazon(keyword, proxy) {
  let browser;
  try {
    browser = await launchHeadless();
    const ctx = await newRealContext(browser, proxy);
    const page = await ctx.newPage();
    const r = await amazonPage(page, keyword);
    return { items: r.items || [], error: r.blocked ? '被反爬拦截（CAPTCHA），请稍后重试' : null };
  } catch (e) { return { items: [], error: shortErr(e) }; }
  finally { try { if (browser) await browser.close(); } catch {} }
}

// AliExpress：登录墙基于 IP 信誉，需真实 Chrome + 有头 + stealth
async function scrapeAliExpress(keyword, proxy) {
  let browser;
  try {
    try {
      browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
      });
    } catch {
      // 无系统 Chrome 时用内置 Chromium + 反检测标志（尽量伪装成真实浏览器）
      browser = await chromium.launch({
        headless: false,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--start-maximized',
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--no-first-run',
          '--no-default-browser-check',
        ],
      });
    }
    const ctxOpts = { userAgent: UA, viewport: null, locale: 'en-US' };
    if (proxy) ctxOpts.proxy = proxy;
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = window.chrome || { runtime: {} };
    });
    const url = 'https://www.aliexpress.com/w/wholesale-' + String(keyword).replace(/\s+/g, '-') + '.html?sortType=total_tranpro_desc';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(9000);
    const blocked = /login|signin/i.test(page.url());
    let items = [];
    if (!blocked) {
      items = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href*="/item/"]').forEach((a) => {
          const card = a.closest('div') || a;
          const t = card.querySelector('h3, h2, [class*="title"], [class*="subject"]');
          const p = card.querySelector('[class*="price"]');
          if (t && p) out.push({ title: t.textContent.trim().slice(0, 60), price: p.textContent.trim().replace(/\s+/g, ' '), link: a.href });
        });
        return out.slice(0, 10);
      });
    }
    return { items, error: blocked ? '被登录墙拦截（IP 信誉），请挂海外节点' : null };
  } catch (e) { return { items: [], error: shortErr(e) }; }
  finally { try { if (browser) await browser.close(); } catch {} }
}

// 组合版（供测试脚本用）：三平台并行
async function scrapeOverseas(keyword, proxyConfig) {
  const proxy = buildProxy(proxyConfig);
  const [ebay, amazon, aliexpress] = await Promise.all([
    scrapeEbay(keyword, proxy),
    scrapeAmazon(keyword, proxy),
    scrapeAliExpress(keyword, proxy),
  ]);
  return {
    ebay: ebay.items, amazon: amazon.items, aliexpress: aliexpress.items,
    errors: { ebay: ebay.error, amazon: amazon.error, aliexpress: aliexpress.error },
  };
}

module.exports = { scrapeEbay, scrapeAmazon, scrapeAliExpress, scrapeOverseas, buildProxy };
