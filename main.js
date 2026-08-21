const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { scrapeEbay, scrapeAmazon, scrapeAliExpress, buildProxy } = require('./scrape.js');
const { zhToEn } = require('./translate.js');

const HOME_1688 = process.env.BB1688_HOME || path.join(os.homedir(), '.1688');
const STATE_FILE = path.join(HOME_1688, 'state.json');
const QR_FILE = path.join(HOME_1688, 'login-qr.png');

// 打包后使用内置 Chromium（extraResources 复制到 resources/ms-playwright）
const bundledBrowsers = path.join(process.resourcesPath, 'ms-playwright');
if (fs.existsSync(path.join(bundledBrowsers, 'chromium-1234')) || fs.existsSync(path.join(bundledBrowsers, 'chromium_headless_shell-1234'))) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = bundledBrowsers;
}

// App 配置（代理等）
const CONFIG_FILE = path.join(os.homedir(), '.1688-selector.json');
const DEFAULT_PROXY = { enabled: false, type: 'http', host: '127.0.0.1', port: '', username: '', password: '' };
function readConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return Object.assign({ proxy: { ...DEFAULT_PROXY } }, c);
  } catch {
    return { proxy: { ...DEFAULT_PROXY } };
  }
}
function writeConfig(c) {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2)); return true; } catch { return false; }
}

// 海外采集缓存（按 平台:关键词，TTL 5 分钟）+ 翻译
const OVERSEAS_CACHE_TTL = 5 * 60 * 1000;
const overseasCache = new Map();
const SCRAPERS = { ebay: scrapeEbay, amazon: scrapeAmazon, aliexpress: scrapeAliExpress };

async function cachedOverseas(platform, keyword, proxy) {
  const key = platform + ':' + keyword;
  const hit = overseasCache.get(key);
  if (hit && Date.now() - hit.ts < OVERSEAS_CACHE_TTL) {
    return { items: hit.items, error: hit.error, cached: true };
  }
  const fn = SCRAPERS[platform];
  const r = await fn(keyword, proxy);
  overseasCache.set(key, { items: r.items, error: r.error, ts: Date.now() });
  return { items: r.items, error: r.error, cached: false };
}

async function overseasHandler(platform, kw) {
  const cfg = readConfig();
  const proxy = buildProxy(cfg.proxy);
  const enKeyword = await zhToEn(kw);
  const r = await cachedOverseas(platform, enKeyword, proxy);
  return { platform, keyword: enKeyword, items: r.items, error: r.error, cached: r.cached };
}

// 解析 1688-cli 命令（打包后优先用内置 cli.js；开发环境退回全局命令）
function resolveCli() {
  if (process.env.BB1688_CLI) return process.env.BB1688_CLI;
  const bundled = path.join(__dirname, 'node_modules', '1688-cli', 'dist', 'cli.js');
  if (fs.existsSync(bundled)) return bundled;
  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env.APPDATA || '', 'npm', '1688.cmd'),
      '1688.cmd',
      '1688',
    ];
    for (const c of candidates) {
      if (c === '1688.cmd' || c === '1688' || fs.existsSync(c)) return c;
    }
  }
  return '1688';
}
const CLI = resolveCli();
const CLI_BUNDLED = CLI.endsWith('.js');

// 解析 node 运行时（打包后用内置 node.exe，开发用系统 node）
function resolveNode() {
  if (process.env.BB1688_NODE) return process.env.BB1688_NODE;
  const bundled = path.join(process.resourcesPath, 'node.exe');
  if (fs.existsSync(bundled)) return bundled;
  return 'node';
}
const NODE = resolveNode();

// 启动日志（排查用）
const LOG_FILE = path.join(__dirname, 'startup.log');
function log(...a) {
  try {
    fs.appendFileSync(LOG_FILE, '[' + new Date().toISOString() + '] ' +
      a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + '\n');
  } catch {}
}
process.on('uncaughtException', (e) => log('uncaughtException:', (e && e.stack) || e));
process.on('unhandledRejection', (e) => log('unhandledRejection:', (e && e.stack) || e));
log('main.js loaded, CLI =', CLI, ', NODE =', NODE, ', NODE_exists =', fs.existsSync(NODE), ', HOME_1688 =', HOME_1688);

// 给参数加引号（全部加，防止 cmd 元字符注入）
function q(s) {
  s = String(s).replace(/"/g, '');
  return `"${s}"`;
}

// 执行 CLI：输出重定向到临时文件（避免 pipe、不受输出大小限制）
function runCli(args, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const outFile = path.join(os.tmpdir(), `1688-${id}.json`);
    const errFile = path.join(os.tmpdir(), `1688-${id}.err`);
    let outFd = -1, errFd = -1;
    let settled = false;
    let child;
    try {
      if (CLI_BUNDLED) {
        outFd = fs.openSync(outFile, 'w');
        errFd = fs.openSync(errFile, 'w');
        child = spawn(NODE, [CLI, ...args], { stdio: ['ignore', outFd, errFd], windowsHide: true });
      } else {
        const cmd = `"${CLI}" ${args.map(q).join(' ')} > "${outFile}" 2> "${errFile}"`;
        child = spawn(cmd, { shell: true, stdio: 'ignore', windowsHide: true });
      }
    } catch (e) {
      if (outFd >= 0) { try { fs.closeSync(outFd); } catch {} }
      if (errFd >= 0) { try { fs.closeSync(errFd); } catch {} }
      resolve({ ok: false, error: String((e && e.message) || e), stdout: '', stderr: '' });
      return;
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch {}
      try { fs.unlinkSync(outFile); } catch {}
      try { fs.unlinkSync(errFile); } catch {}
      resolve({ ok: false, error: '命令执行超时', stdout: '', stderr: '' });
    }, timeoutMs);
    child.on('error', (e) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      resolve({ ok: false, error: String((e && e.message) || e), stdout: '', stderr: '' });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (outFd >= 0) { try { fs.closeSync(outFd); } catch {} }
      if (errFd >= 0) { try { fs.closeSync(errFd); } catch {} }
      let stdout = '', stderr = '';
      try { stdout = fs.readFileSync(outFile, 'utf8'); } catch {}
      try { stderr = fs.readFileSync(errFile, 'utf8'); } catch {}
      try { fs.unlinkSync(outFile); } catch {}
      try { fs.unlinkSync(errFile); } catch {}
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

// 从 state.json 快速读取登录状态（不启动浏览器）
function getStatus() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (s && (s.memberId || s.nick)) {
      return { loggedIn: true, memberId: s.memberId, nick: s.nick, loggedInAt: s.loggedInAt };
    }
  } catch {}
  return { loggedIn: false };
}

async function doSearch(keyword, opts = {}) {
  // 剔除 cmd 元字符，防 shell 注入（dev 模式 runCli 走 cmd 拼接）
  const kw = String(keyword || '').trim().replace(/[&|<>^%!`"'$();\r\n]/g, '');
  if (!kw) return { ok: false, error: '请输入关键词' };
  const max = Math.min(Math.max(parseInt(opts.max, 10) || 20, 1), 100);
  const args = ['search', kw, '--max', String(max), '--json'];
  if (opts.sort) args.push('--sort', opts.sort);
  if (opts.priceMin) args.push('--price-min', String(opts.priceMin));
  if (opts.priceMax) args.push('--price-max', String(opts.priceMax));
  if (opts.verified && opts.verified !== 'any') args.push('--verified', opts.verified);
  if (opts.excludeAds) args.push('--exclude-ads');
  const r = await runCli(args);
  if (!r.ok) {
    return { ok: false, error: (r.stderr || r.stdout || r.error || '').trim() };
  }
  try {
    const j = JSON.parse(r.stdout);
    return { ok: true, keyword: j.keyword, sort: j.sort, total: j.total, offers: j.offers || [] };
  } catch {
    return { ok: false, error: '解析结果失败', raw: (r.stdout || '').slice(0, 500) };
  }
}

let loginProc = null;
let loginFds = { outFd: -1, errFd: -1 };
async function doLogin() {
  await runCli(['daemon', 'stop']); // 释放 profile 锁，避免 LOCK_BUSY
  try { fs.unlinkSync(QR_FILE); } catch {}
  try { fs.unlinkSync(STATE_FILE); } catch {} // 清除旧登录态，避免 --force 后 state.json 残留导致误判"已登录"
  const logFile = path.join(HOME_1688, 'login-app.log');
  const errFile = path.join(HOME_1688, 'login-app.err');
  // 关闭上一次登录的进程与文件句柄
  try { if (loginFds.outFd >= 0) fs.closeSync(loginFds.outFd); } catch {}
  try { if (loginFds.errFd >= 0) fs.closeSync(loginFds.errFd); } catch {}
  loginFds = { outFd: -1, errFd: -1 };
  try { if (loginProc) loginProc.kill(); } catch {}
  try {
    if (CLI_BUNDLED) {
      loginFds.outFd = fs.openSync(logFile, 'w');
      loginFds.errFd = fs.openSync(errFile, 'w');
      loginProc = spawn(NODE, [CLI, 'login', '--timeout', '900', '--force'], {
        stdio: ['ignore', loginFds.outFd, loginFds.errFd],
        windowsHide: true,
      });
    } else {
      loginProc = spawn(
        `"${CLI}" login --timeout 900 --force > "${logFile}" 2> "${errFile}"`,
        { shell: true, stdio: 'ignore', windowsHide: true }
      );
    }
    // spawn 异步失败（如 NODE/CLI 缺失）会走 'error' 事件，必须处理，否则界面永远"正在生成二维码"
    loginProc.on('error', (e) => {
      log('login spawn error:', (e && e.message) || e, '| NODE =', NODE, '| NODE_exists =', fs.existsSync(NODE), '| CLI_exists =', fs.existsSync(CLI));
      try { if (loginFds.outFd >= 0) fs.closeSync(loginFds.outFd); } catch {}
      try { if (loginFds.errFd >= 0) fs.closeSync(loginFds.errFd); } catch {}
      loginFds = { outFd: -1, errFd: -1 };
      loginProc = null;
    });
    // 登录进程结束后释放文件句柄
    loginProc.on('close', () => {
      try { if (loginFds.outFd >= 0) fs.closeSync(loginFds.outFd); } catch {}
      try { if (loginFds.errFd >= 0) fs.closeSync(loginFds.errFd); } catch {}
      loginFds = { outFd: -1, errFd: -1 };
      loginProc = null;
    });
  } catch (e) {
    log('doLogin spawn error:', (e && e.message) || e, '| NODE =', NODE, '| NODE_exists =', fs.existsSync(NODE), '| CLI_exists =', fs.existsSync(CLI));
    return { started: false, error: String((e && e.message) || e) };
  }
  return { started: true, qrFile: QR_FILE };
}
function doLoginPoll() {
  let qr = null;
  try {
    if (fs.existsSync(QR_FILE)) {
      qr = 'data:image/png;base64,' + fs.readFileSync(QR_FILE).toString('base64');
    }
  } catch {}
  return Object.assign({ qr }, getStatus());
}

function createWindow() {
  log('createWindow: start');
  const win = new BrowserWindow({
    width: 1460,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: '1688 选品助手',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.webContents.on('console-message', (_e, _level, message, _line, sourceId) => {
    log('renderer-console:', String(message), sourceId ? ('@' + String(sourceId).split(/[\\/]/).pop()) : '');
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log('did-fail-load:', code, desc, url);
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  log('createWindow: window loaded');
}

app.whenReady().then(() => {
  log('whenReady');
  ipcMain.handle('search', (e, kw, opts) => doSearch(kw, opts));
  ipcMain.handle('getStatus', () => { log('IPC getStatus called (renderer -> main OK)'); return getStatus(); });
  ipcMain.handle('login', () => doLogin());
  ipcMain.handle('loginPoll', () => doLoginPoll());
  ipcMain.handle('overseasEbay', (e, kw) => overseasHandler('ebay', kw));
  ipcMain.handle('overseasAmazon', (e, kw) => overseasHandler('amazon', kw));
  ipcMain.handle('overseasAliExpress', (e, kw) => overseasHandler('aliexpress', kw));
  ipcMain.handle('getProxyConfig', () => readConfig().proxy);
  ipcMain.handle('setProxyConfig', (e, proxy) => {
    const cfg = readConfig();
    cfg.proxy = Object.assign({ ...DEFAULT_PROXY }, proxy || {});
    writeConfig(cfg);
    return readConfig().proxy;
  });
  ipcMain.handle('openExternal', (e, url) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url);
    return true;
  });
  ipcMain.handle('exportCsv', async (e, csvString, defaultName) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '导出 CSV',
        defaultPath: defaultName || '选品对比.csv',
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
      });
      if (canceled || !filePath) return { saved: false };
      fs.writeFileSync(filePath, '\uFEFF' + (csvString || ''), 'utf8');
      return { saved: true, path: filePath };
    } catch (err) {
      return { saved: false, error: String((err && err.message) || err) };
    }
  });
  createWindow();
  log('createWindow() returned');
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((e) => log('whenReady error:', (e && e.stack) || e));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
