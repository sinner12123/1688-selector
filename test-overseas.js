const { scrapeOverseas } = require('./scrape.js');
const PROXY = { enabled: true, type: 'socks5', host: '127.0.0.1', port: '10808' };

(async () => {
  const kw = process.argv[2] || 'phone case';
  console.log('关键词:', kw, '| 代理: socks5://127.0.0.1:10808（美国洛杉矶直连）');
  const t0 = Date.now();
  const r = await scrapeOverseas(kw, PROXY);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  for (const [name, key] of [['AliExpress 速卖通', 'aliexpress'], ['Amazon', 'amazon'], ['eBay', 'ebay']]) {
    const items = r[key] || [];
    const err = r.errors && r.errors[key];
    console.log('\n=== ' + name + ' ===');
    console.log('条数:', items.length, '| 错误:', err || '无');
    items.slice(0, 6).forEach((i) => console.log(' -', i.price, '|', (i.title || '').slice(0, 55)));
  }
  console.log('\n总耗时:', dt, '秒');
})();
