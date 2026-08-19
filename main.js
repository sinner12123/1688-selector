const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { scrapeOverseas } = require('./scrape.js');

const HOME_1688 = process.env.BB1688_HOME || path.join(os.homedir(), '.1688');
const STATE_FILE = path.join(HOME_1688, 'state.json');
const QR_FILE = path.join(HOME_1688, 'login-qr.png');

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

// 解析 1688-cli 命令（优先绝对路径，避免 PATH 依赖）
function resolveCli() {
  if (process.env.BB1688_CLI) return process.env.BB1688_CLI;
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
log('main.js loaded, CLI =', CLI, ', HOME_1688 =', HOME_1688);

// 给含空格的参数加引号
function q(s) {
  s = String(s).replace(/"/g, '');
  return /\s/.test(s) ? `"${s}"` : s;
}

// 执行 CLI：输出重定向到临时文件（避免 pipe、不受输出大小限制）
function runCli(args, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const outFile = path.join(os.tmpdir(), `1688-${id}.json`);
    const errFile = path.join(os.tmpdir(), `1688-${id}.err`);
    const cmd = `"${CLI}" ${args.map(q).join(' ')} > "${outFile}" 2> "${errFile}"`;
    let settled = false;
    let child;
    try {
      child = spawn(cmd, { shell: true, stdio: 'ignore', windowsHide: true });
    } catch (e) {
      resolve({ ok: false, error: String((e && e.message) || e), stdout: '', stderr: '' });
      return;
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch {}
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
  const kw = String(keyword || '').trim();
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
async function doLogin() {
  await runCli(['daemon', 'stop']); // 释放 profile 锁，避免 LOCK_BUSY
  try { fs.unlinkSync(QR_FILE); } catch {}
  const logFile = path.join(HOME_1688, 'login-app.log');
  const errFile = path.join(HOME_1688, 'login-app.err');
  try { if (loginProc) loginProc.kill(); } catch {}
  loginProc = spawn(
    `"${CLI}" login --timeout 900 > "${logFile}" 2> "${errFile}"`,
    { shell: true, stdio: 'ignore', windowsHide: true }
  );
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
    width: 1100,
    height: 760,
    minWidth: 780,
    minHeight: 540,
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
  ipcMain.handle('overseas', (e, kw) => {
    const cfg = readConfig();
    return scrapeOverseas(kw, cfg.proxy);
  });
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
  createWindow();
  log('createWindow() returned');
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((e) => log('whenReady error:', (e && e.stack) || e));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
