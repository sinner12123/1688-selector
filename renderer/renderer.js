const $ = (sel) => document.querySelector(sel);

const els = {
  statusText: $('#statusText'),
  loginBtn: $('#loginBtn'),
  keyword: $('#keyword'),
  searchBtn: $('#searchBtn'),
  sort: $('#sort'),
  max: $('#max'),
  verified: $('#verified'),
  priceMin: $('#priceMin'),
  priceMax: $('#priceMax'),
  excludeAds: $('#excludeAds'),
  profitToggle: $('#profitToggle'),
  fxRate: $('#fxRate'),
  exportBtn: $('#exportBtn'),
  hint: $('#hint'),
  loading: $('#loading'),
  error: $('#error'),
  results: $('#results'),
  loginModal: $('#loginModal'),
  qrImg: $('#qrImg'),
  loginState: $('#loginState'),
  modalClose: $('#modalClose'),
  proxyBtn: $('#proxyBtn'),
  proxyModal: $('#proxyModal'),
  proxyClose: $('#proxyClose'),
  proxyEnabled: $('#proxyEnabled'),
  proxyType: $('#proxyType'),
  proxyHost: $('#proxyHost'),
  proxyPort: $('#proxyPort'),
  proxyUser: $('#proxyUser'),
  proxyPass: $('#proxyPass'),
  proxySave: $('#proxySave'),
};

let pollTimer = null;
let lastResults = null;
let lastKw = '';

// —— 登录状态 ——
async function refreshStatus() {
  const s = await window.api.getStatus();
  if (s.loggedIn) {
    els.statusText.textContent = `已登录：${s.nick || s.memberId}`;
    els.statusText.className = 'status-text ok';
    els.loginBtn.textContent = '重新登录';
  } else {
    els.statusText.textContent = '未登录';
    els.statusText.className = 'status-text no';
    els.loginBtn.textContent = '扫码登录';
  }
}

// —— 单条商品行 ——
function makeItemRow(it) {
  const row = document.createElement('div');
  row.className = 'item-row';

  const t = document.createElement('div');
  t.className = 'item-title';
  t.textContent = it.title || '(无标题)';
  t.title = it.title || '';
  row.appendChild(t);

  const priceRow = document.createElement('div');
  priceRow.className = 'item-price-row';
  const price = document.createElement('span');
  price.className = 'item-price';
  price.textContent = it.price || '-';
  priceRow.appendChild(price);
  if (it.sub) {
    const sub = document.createElement('span');
    sub.className = 'item-sub';
    sub.textContent = it.sub;
    priceRow.appendChild(sub);
  }
  row.appendChild(priceRow);

  if (it.link) {
    row.style.cursor = 'pointer';
    row.onclick = () => window.api.openExternal(it.link);
  }
  return row;
}

// —— 建列（含占位），返回 body 供后续填充 ——
function makeColumn(grid, title, cur) {
  const col = document.createElement('div');
  col.className = 'column';
  const head = document.createElement('div');
  head.className = 'column-head';
  head.innerHTML = `<b>${title}</b><span class="cur">${cur}</span>`;
  col.appendChild(head);
  const body = document.createElement('div');
  body.className = 'column-body';
  body.innerHTML = '<div class="column-loading">采集中…</div>';
  col.appendChild(body);
  grid.appendChild(col);
  return body;
}

function fillColumn(body, items, error) {
  body.innerHTML = '';
  if (error) {
    const err = document.createElement('div');
    err.className = 'column-error';
    err.textContent = error;
    body.appendChild(err);
    return;
  }
  if (!items || !items.length) {
    const empty = document.createElement('div');
    empty.className = 'column-empty';
    empty.textContent = '无结果';
    body.appendChild(empty);
    return;
  }
  items.forEach((it) => body.appendChild(makeItemRow(it)));
}

// —— 价格解析 & 利润分析 ——
function parsePrice(text) {
  if (!text) return null;
  const s = String(text);
  let m;
  if ((m = s.match(/¥\s*([\d.]+)/))) return { value: parseFloat(m[1]), currency: 'CNY' };
  if ((m = s.match(/TWD\s*([\d.]+)/))) return { value: parseFloat(m[1]), currency: 'TWD' };
  if ((m = s.match(/\$\s*([\d.]+)/))) return { value: parseFloat(m[1]), currency: 'USD' };
  if ((m = s.match(/US\s*\$?\s*([\d.]+)/))) return { value: parseFloat(m[1]), currency: 'USD' };
  if ((m = s.match(/([\d.]+)/))) return { value: parseFloat(m[1]), currency: 'USD' };
  return null;
}
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function renderProfitSummary(results, rate, summaryEl) {
  const toUsd = (p) => (p.currency === 'CNY' ? p.value / rate : p.currency === 'TWD' ? p.value / 32 : p.value);
  const cny = (results.dom || []).map((it) => parsePrice(it.price)).filter(Boolean).map(toUsd);
  const ov = []
    .concat(results.aliexpress || [], results.amazon || [], results.ebay || [])
    .map((it) => parsePrice(it.price)).filter(Boolean).map(toUsd);
  if (!cny.length || !ov.length) return;

  const cnyAvg = avg(cny);
  const ovAvg = avg(ov);
  const ovMin = Math.min.apply(null, ov);
  const margin = ovAvg - cnyAvg;
  const marginPct = (margin / ovAvg) * 100;
  const multiple = ovAvg / cnyAvg;

  const card = document.createElement('div');
  card.className = 'profit-summary';
  card.innerHTML =
    '<div class="profit-title">💰 利润分析（1 USD ≈ ' + rate + ' CNY）</div>' +
    '<div class="profit-stats">' +
    '<div class="profit-stat"><span>1688 均价</span><b>¥' + (cnyAvg * rate).toFixed(1) + '</b><em>≈ $' + cnyAvg.toFixed(2) + '</em></div>' +
    '<div class="profit-stat"><span>海外均价</span><b>$' + ovAvg.toFixed(2) + '</b><em>最低 $' + ovMin.toFixed(2) + '</em></div>' +
    '<div class="profit-stat"><span>价差倍数</span><b>' + multiple.toFixed(1) + 'x</b></div>' +
    '<div class="profit-stat highlight"><span>潜在毛利率</span><b>' + marginPct.toFixed(0) + '%</b></div>' +
    '</div>';
  summaryEl.after(card);
}

// —— 搜索（渐进式：先出占位，各列各自填充）——
async function doSearch() {
  const kw = els.keyword.value.trim();
  if (!kw) { showError('请输入关键词'); return; }
  lastKw = kw;
  els.searchBtn.disabled = true;
  els.error.hidden = true;
  els.hint.hidden = true;
  els.loading.hidden = true;
  els.results.innerHTML = '';

  const summary = document.createElement('div');
  summary.className = 'results-summary';
  summary.textContent = `关键词「${kw}」 · 四平台价格对比`;
  els.results.appendChild(summary);

  const grid = document.createElement('div');
  grid.className = 'compare-grid';
  els.results.appendChild(grid);

  const bodies = {
    dom: makeColumn(grid, '1688 国内批发价', '¥ CNY'),
    aliexpress: makeColumn(grid, 'AliExpress 速卖通', 'USD'),
    amazon: makeColumn(grid, 'Amazon 美国站', '价格随地区'),
    ebay: makeColumn(grid, 'eBay 美国站', '价格随地区'),
  };

  const results = { dom: [], aliexpress: [], amazon: [], ebay: [] };
  lastResults = results;

  const opts = {
    sort: els.sort.value,
    max: els.max.value,
    verified: els.verified.value,
    priceMin: els.priceMin.value,
    priceMax: els.priceMax.value,
    excludeAds: els.excludeAds.checked,
  };

  const pDom = window.api.search(kw, opts);
  const pAli = window.api.overseasAliExpress(kw);
  const pAmz = window.api.overseasAmazon(kw);
  const pEbay = window.api.overseasEbay(kw);

  pDom.then((dom) => {
    const items = dom.ok ? (dom.offers || []).map((o) => ({
      title: o.title,
      price: (o.price && o.price.text) || '-',
      link: o.url,
      sub: `${(o.demand && o.demand.orderCountText) || '-'} 单 · ${(o.supplier && o.supplier.name) || ''}`,
    })) : [];
    results.dom = items;
    fillColumn(bodies.dom, items, dom.ok ? null : (dom.error || '搜索失败'));
  }).catch((e) => fillColumn(bodies.dom, [], String((e && e.message) || e)));

  pAli.then((r) => { results.aliexpress = r.items || []; fillColumn(bodies.aliexpress, r.items, r.error); }).catch((e) => fillColumn(bodies.aliexpress, [], String((e && e.message) || e)));
  pAmz.then((r) => { results.amazon = r.items || []; fillColumn(bodies.amazon, r.items, r.error); }).catch((e) => fillColumn(bodies.amazon, [], String((e && e.message) || e)));
  pEbay.then((r) => { results.ebay = r.items || []; fillColumn(bodies.ebay, r.items, r.error); }).catch((e) => fillColumn(bodies.ebay, [], String((e && e.message) || e)));

  Promise.allSettled([pDom, pAli, pAmz, pEbay]).then(() => {
    els.searchBtn.disabled = false;
    if (els.profitToggle.checked) {
      const rate = parseFloat(els.fxRate.value) || 7.2;
      renderProfitSummary(results, rate, summary);
    }
  });
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

// —— 登录弹窗 ——
async function openLogin() {
  els.loginModal.hidden = false;
  els.qrImg.src = '';
  els.loginState.textContent = '正在生成二维码…';
  const res = await window.api.login();
  if (!res || !res.started) {
    els.loginState.textContent = '启动登录失败：' + (res && res.error ? res.error : '未知错误');
    return;
  }
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const p = await window.api.loginPoll();
    if (p.qr) els.qrImg.src = p.qr;
    if (p.loggedIn) {
      els.loginState.textContent = `登录成功：${p.nick || p.memberId}`;
      clearInterval(pollTimer);
      pollTimer = null;
      await refreshStatus();
      setTimeout(closeLogin, 1200);
    } else {
      els.loginState.textContent = '等待扫码确认…（二维码约 1–2 分钟自动刷新）';
    }
  }, 2500);
}
function closeLogin() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  els.loginModal.hidden = true;
}

// —— 代理设置 ——
async function loadProxy() {
  const p = await window.api.getProxyConfig();
  if (!p) return;
  els.proxyEnabled.checked = !!p.enabled;
  els.proxyType.value = p.type === 'socks5' ? 'socks5' : 'http';
  els.proxyHost.value = p.host || '';
  els.proxyPort.value = p.port || '';
  els.proxyUser.value = p.username || '';
  els.proxyPass.value = p.password || '';
  updateProxyBtnLabel(p);
}
function updateProxyBtnLabel(p) {
  const badge = (p && p.enabled && p.host && p.port) ? `（已启用 ${p.host}:${p.port}）` : '';
  els.proxyBtn.textContent = '代理设置' + badge;
}
async function saveProxy() {
  const proxy = {
    enabled: els.proxyEnabled.checked,
    type: els.proxyType.value,
    host: els.proxyHost.value.trim(),
    port: els.proxyPort.value.trim(),
    username: els.proxyUser.value.trim(),
    password: els.proxyPass.value,
  };
  const saved = await window.api.setProxyConfig(proxy);
  updateProxyBtnLabel(saved);
  els.proxyModal.hidden = true;
}
function openProxy() {
  loadProxy();
  els.proxyModal.hidden = false;
}

// —— 导出 CSV ——
function toCsvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function buildCsv() {
  const rows = [['关键词', '平台', '标题', '价格', '链接']];
  const add = (platform, items) => (items || []).forEach((it) => rows.push([lastKw, platform, it.title || '', it.price || '', it.link || '']));
  add('1688', lastResults.dom);
  add('AliExpress', lastResults.aliexpress);
  add('Amazon', lastResults.amazon);
  add('eBay', lastResults.ebay);
  return rows.map((r) => r.map(toCsvCell).join(',')).join('\r\n');
}
async function exportCsv() {
  if (!lastResults) { showError('请先搜索再导出'); return; }
  const csv = buildCsv();
  const safe = String(lastKw || '结果').replace(/[\\/:*?"<>|]/g, '_');
  const r = await window.api.exportCsv(csv, `选品对比_${safe}.csv`);
  if (r && r.saved) {
    els.exportBtn.textContent = '已导出 ✓';
    setTimeout(() => { els.exportBtn.textContent = '导出 CSV'; }, 2000);
  } else if (r && r.error) {
    showError('导出失败：' + r.error);
  }
}

// —— 事件绑定 ——
els.searchBtn.addEventListener('click', doSearch);
els.keyword.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
els.loginBtn.addEventListener('click', openLogin);
els.modalClose.addEventListener('click', closeLogin);
els.loginModal.addEventListener('click', (e) => { if (e.target === els.loginModal) closeLogin(); });
els.proxyBtn.addEventListener('click', openProxy);
els.proxyClose.addEventListener('click', () => { els.proxyModal.hidden = true; });
els.proxySave.addEventListener('click', saveProxy);
els.proxyModal.addEventListener('click', (e) => { if (e.target === els.proxyModal) els.proxyModal.hidden = true; });
els.exportBtn.addEventListener('click', exportCsv);

// —— 初始化 ——
refreshStatus();
loadProxy();
