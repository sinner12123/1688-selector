const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const NODE = 'node';
const CLI = path.join(__dirname, 'node_modules', '1688-cli', 'dist', 'cli.js');
const QR_FILE = path.join(os.homedir(), '.1688', 'login-qr.png');

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(NODE, [CLI, ...args], { stdio: 'ignore', windowsHide: true });
    const t = setTimeout(() => { try { child.kill(); } catch {} resolve(); }, 30000);
    child.on('close', () => { clearTimeout(t); resolve(); });
  });
}

(async () => {
  console.log('1) 停止 daemon ...');
  await runCli(['daemon', 'stop']);

  console.log('2) 清理旧二维码 ...');
  try { fs.unlinkSync(QR_FILE); } catch {}

  console.log('3) 启动登录（node + cli.js）...');
  const logFd = fs.openSync(path.join(os.tmpdir(), 'login-test.log'), 'w');
  const errFd = fs.openSync(path.join(os.tmpdir(), 'login-test.err'), 'w');
  const login = spawn(NODE, [CLI, 'login', '--timeout', '900', '--force'], {
    stdio: ['ignore', logFd, errFd],
    windowsHide: true,
  });

  console.log('4) 等待二维码生成（最多 40 秒）...');
  let qrReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (fs.existsSync(QR_FILE) && fs.statSync(QR_FILE).size > 1000) {
      qrReady = true;
      console.log(`   ✅ 二维码已生成 (${(fs.statSync(QR_FILE).size / 1024).toFixed(1)} KB)，耗时 ${i + 1} 秒`);
      break;
    }
  }
  if (!qrReady) {
    console.log('   ❌ 40 秒内未生成二维码');
    console.log('   stderr:', fs.readFileSync(path.join(os.tmpdir(), 'login-test.err'), 'utf8').slice(0, 500));
  }

  console.log('5) 清理登录进程 ...');
  try { login.kill(); } catch {}
  fs.closeSync(logFd);
  fs.closeSync(errFd);
  process.exit(0);
})();
