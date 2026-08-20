const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CLI = path.join(__dirname, 'node_modules', '1688-cli', 'dist', 'cli.js');

const outFile = path.join(os.tmpdir(), 'test-whoami.json');
const errFile = path.join(os.tmpdir(), 'test-whoami.err');
const outFd = fs.openSync(outFile, 'w');
const errFd = fs.openSync(errFile, 'w');

// 模拟新的 runCli：node + cli.js + 文件描述符重定向
const child = spawn('node', [CLI, 'whoami'], {
  stdio: ['ignore', outFd, errFd],
  windowsHide: true,
});

const timer = setTimeout(() => { console.log('超时'); try { child.kill(); } catch {} process.exit(2); }, 60000);
child.on('close', (code) => {
  clearTimeout(timer);
  fs.closeSync(outFd);
  fs.closeSync(errFd);
  console.log('exit:', code);
  try { console.log('stdout:', fs.readFileSync(outFile, 'utf8')); } catch (e) { console.log('stdout 读取失败'); }
  try { console.log('stderr:', fs.readFileSync(errFile, 'utf8').slice(0, 300)); } catch {}
});
