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

// —— 搜索结果渲染 ——
function renderResults(data) {
  els.hint.hidden = true;
  els.error.hidden = true;
  const offers = data.offers || [];
  if (!offers.length) {
    els.results.innerHTML = '<div class="hint">没有找到结果，换个关键词试试。</div>';
    return;
  }
  const summary = document.createElement('div');
  summary.className = 'results-summary';
  summary.textContent = `关键词「${data.keyword || ''}」共返回 ${offers.length} 条（命中 ${data.total ?? offers.length}）`;
  els.results.innerHTML = '';
  els.results.appendChild(summary);

  offers.forEach((o) => {
    const price = (o.price && o.price.text) || '-';
    const sales = (o.demand && o.demand.orderCountText) || (o.turnover || '-');
    const sup = (o.supplier && o.supplier.name) || '-';
    const years = o.supplier && o.supplier.years ? ` · 经营${o.supplier.years}年` : '';
    const loc = o.location ? `${o.location.province || ''}${o.location.city || ''}` : '';
    const factory = o.verified && o.verified.factory;
    const tags = (o.tags || []).slice(0, 4);

    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = o.title || '(无标题)';

    const priceEl = document.createElement('div');
    priceEl.className = 'card-price';
    priceEl.textContent = price;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.innerHTML = '';
    const salesEl = document.createElement('span');
    salesEl.textContent = `销量 ${sales}`;
    meta.appendChild(salesEl);
    if (loc) {
      const locEl = document.createElement('span');
      locEl.textContent = loc;
      meta.appendChild(locEl);
    }
    if (factory) {
      const fEl = document.createElement('span');
      fEl.className = 'badge factory';
      fEl.textContent = '工厂';
      meta.appendChild(fEl);
    }
    if (o.bizType) {
      const bEl = document.createElement('span');
      bEl.textContent = o.bizType;
      meta.appendChild(bEl);
    }

    const supEl = document.createElement('div');
    supEl.className = 'card-supplier';
    supEl.textContent = `供应商：${sup}${years}`;

    const tagsEl = document.createElement('div');
    tagsEl.className = 'card-meta';
    tags.forEach((t) => {
      const tEl = document.createElement('span');
      tEl.className = 'badge';
      tEl.textContent = t;
      tagsEl.appendChild(tEl);
    });

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn-outline';
    openBtn.textContent = '打开商品页 ↗';
    openBtn.onclick = () => o.url && window.api.openExternal(o.url);
    actions.appendChild(openBtn);

    card.append(title, priceEl, meta, supEl, tagsEl, actions);
    els.results.appendChild(card);
  });
}

// —— 搜索 ——
async function doSearch() {
  const kw = els.keyword.value.trim();
  if (!kw) { showError('请输入关键词'); return; }
  els.searchBtn.disabled = true;
  els.loading.hidden = false;
  els.error.hidden = true;
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
    const res = await window.api.search(kw, opts);
    if (res.ok) {
      els.loading.hidden = true;
      renderResults(res);
    } else {
      els.loading.hidden = true;
      showError(res.error || '搜索失败');
    }
  } catch (e) {
    els.loading.hidden = true;
    showError(String(e && e.message || e));
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

// —— 事件绑定 ——
els.searchBtn.addEventListener('click', doSearch);
els.keyword.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
els.loginBtn.addEventListener('click', openLogin);
els.modalClose.addEventListener('click', closeLogin);
els.loginModal.addEventListener('click', (e) => { if (e.target === els.loginModal) closeLogin(); });

// —— 初始化 ——
refreshStatus();
