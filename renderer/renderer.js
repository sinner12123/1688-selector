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

// —— 单列渲染 ——
function renderColumn(grid, title, currencyHint, items, error) {
  const col = document.createElement('div');
  col.className = 'column';

  const head = document.createElement('div');
  head.className = 'column-head';
  head.innerHTML = `<b>${title}</b><span class="cur">${currencyHint}</span>`;
  col.appendChild(head);

  if (error) {
    const err = document.createElement('div');
    err.className = 'column-error';
    err.textContent = error;
    col.appendChild(err);
    grid.appendChild(col);
    return;
  }
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'column-empty';
    empty.textContent = '无结果';
    col.appendChild(empty);
    grid.appendChild(col);
    return;
  }
  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    const price = document.createElement('div');
    price.className = 'item-price';
    price.textContent = it.price || '-';
    const t = document.createElement('div');
    t.className = 'item-title';
    t.textContent = it.title || '(无标题)';
    t.title = it.title || '';
    row.append(price, t);
    if (it.sub) {
      const sub = document.createElement('div');
      sub.className = 'item-sub';
      sub.textContent = it.sub;
      row.appendChild(sub);
    }
    if (it.link) {
      row.style.cursor = 'pointer';
      row.onclick = () => window.api.openExternal(it.link);
    }
    col.appendChild(row);
  });
  grid.appendChild(col);
}

// —— 三列对比渲染 ——
function renderComparison(kw, dom, ov) {
  els.results.innerHTML = '';
  const summary = document.createElement('div');
  summary.className = 'results-summary';
  summary.textContent = `关键词「${kw}」 · 三平台价格对比`;
  els.results.appendChild(summary);

  const domItems = (dom.ok ? (dom.offers || []) : []).map((o) => ({
    title: o.title,
    price: (o.price && o.price.text) || '-',
    link: o.url,
    sub: `${(o.demand && o.demand.orderCountText) || '-'} 单 · ${(o.supplier && o.supplier.name) || ''}`,
  }));

  const ovErr = (ov.errors && ov.errors.launch) || null;
  const netBlocked = /ERR_CONNECTION_CLOSED|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_TIMED_OUT|ERR_INTERNET_DISCONNECTED/i;

  if ((ov.errors && (netBlocked.test(ov.errors.ebay || '') || netBlocked.test(ov.errors.amazon || ''))) || netBlocked.test(ovErr || '')) {
    const banner = document.createElement('div');
    banner.className = 'net-banner';
    banner.textContent = '⚠️ 海外平台采集失败：当前网络（国内）无法直连 Amazon/eBay。请挂 VPN/代理后重试。';
    els.results.appendChild(banner);
  }

  const grid = document.createElement('div');
  grid.className = 'compare-grid';
  renderColumn(grid, '1688 国内批发价', '¥ CNY', domItems, dom.ok ? null : (dom.error || '搜索失败'));
  renderColumn(grid, 'AliExpress 速卖通', 'USD', ov.aliexpress || [], (ov.errors && ov.errors.aliexpress) || null);
  renderColumn(grid, 'Amazon 美国站', '价格随地区', ov.amazon || [], (ov.errors && ov.errors.amazon) || null);
  renderColumn(grid, 'eBay 美国站', '价格随地区', ov.ebay || [], (ov.errors && ov.errors.ebay) || null);
  els.results.appendChild(grid);
}

// —— 搜索 ——
async function doSearch() {
  const kw = els.keyword.value.trim();
  if (!kw) { showError('请输入关键词'); return; }
  els.searchBtn.disabled = true;
  els.loading.hidden = false;
  els.error.hidden = true;
  els.hint.hidden = true;
  els.results.innerHTML = '';
  const opts = {
    sort: els.sort.value,
    max: els.max.value,
    verified: els.verified.value,
    priceMin: els.priceMin.value,
    priceMax: els.priceMax.value,
    excludeAds: els.excludeAds.checked,
  };
  try {
    const [domRes, ovRes] = await Promise.allSettled([
      window.api.search(kw, opts),
      window.api.overseas(kw),
    ]);
    els.loading.hidden = true;
    const dom = domRes.status === 'fulfilled' ? domRes.value : { ok: false, error: '1688 搜索失败', offers: [] };
    const ov = ovRes.status === 'fulfilled' ? ovRes.value : { ebay: [], amazon: [], errors: { launch: '采集失败' } };
    renderComparison(kw, dom, ov);
  } catch (e) {
    els.loading.hidden = true;
    showError(String((e && e.message) || e));
  } finally {
    els.searchBtn.disabled = false;
  }
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
    els.loginState.textContent = '启动登录失败';
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

// —— 初始化 ——
refreshStatus();
loadProxy();
