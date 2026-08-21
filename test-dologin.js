const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 模拟打包后的 doLogin 精确 spawn
const NODE = 'D:\\新建文件夹\\1688-app\\dist\\win-unpacked\\resources\\node.exe';
const CLI = 'D:\\新建文件夹\\1688-app\\dist\\win-unpacked\\resources\\app\\node_modules\\1688-cli\\dist\\cli.js';
const HOME_1688 = path.join(os.homedir(), '.1688');
const logFile = path.join(HOME_1688, 'login-app.log');
const errFile = path.join(HOME_1688, 'login-app.err');
const QR_FILE = path.join(HOME_1688, 'login-qr.png');

console.log('NODE 存在:', fs.existsSync(NODE));
console.log('CLI 存在:', fs.existsSync(CLI));
console.log('HOME_1688 存在:', fs.existsSync(HOME_1688));

try { fs.unlinkSync(QR_FILE); } catch {}

let outFd, errFd;
try {
  outFd = fs.openSync(logFile, 'w');
  errFd = fs.openSync(errFile, 'w');
  console.log('openSync 成功');
} catch (e) {
  console.log('openSync 失败:', e.message);
  process.exit(1);
}

let child;
try {
  child = spawn(NODE, [CLI, 'login', '--timeout', '900', '--force'], {
    stdio: ['ignore', outFd, errFd],
    windowsHide: true,
  });
  console.log('spawn 返回, pid:', child.pid);
} catch (e) {
  console.log('spawn 抛出异常:', e.message);
  process.exit(1);
}

child.on('error', (e) => {
  console.log('child error 事件:', e.message);
});
child.on('close', (code) => {
  console.log('child close, code:', code);
  try { console.log('stderr:', fs.readFileSync(errFile, 'utf8').slice(0, 300)); } catch {}
});

// 等待二维码
(async () => {
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (fs.existsSync(QR_FILE) && fs.statSync(QR_FILE).size > 1000) {
      console.log('✅ 二维码生成, 耗时', i + 1, '秒');
      break;
    }
  }
  try { child.kill(); } catch {}
  process.exit(0);
})();
