// 构建打包辅助脚本: 自动探测 NODE_EXE / PW_ROOT, 注入 electron-builder 配置后打包。
// 用法: npm run build           -> electron-builder --win portable
//       npm run build:dir       -> electron-builder --win --dir
// 环境变量 NODE_EXE / PW_ROOT 可覆盖自动探测结果。
//
// 说明: electron-builder 的 ${env.X} 宏在 extraResources.from 里展开不可靠
// (会把绝对路径拼到 projectDir 后面), 所以这里直接改写配置值。
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const tmpCfg = path.join(root, 'package.build.json');

// 1) Node 运行时: 默认就是当前 node.exe
const NODE_EXE = process.env.NODE_EXE || process.execPath;
if (!fs.existsSync(NODE_EXE)) {
  console.error(`[build] NODE_EXE 不存在: ${NODE_EXE}`);
  process.exit(1);
}

// 2) Playwright 浏览器根目录: 自动探测常见位置
const PW_ROOT =
  process.env.PW_ROOT ||
  [process.env.PLAYWRIGHT_BROWSERS_PATH,
   path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright')]
    .filter(Boolean)
    .find((p) => fs.existsSync(p));
if (!PW_ROOT) {
  console.error('[build] 未找到 ms-playwright 浏览器目录。');
  console.error('      请先执行: npx playwright install chromium');
  console.error('      或设置环境变量 PW_ROOT 指向浏览器缓存目录。');
  process.exit(1);
}
console.log('[build] NODE_EXE =', NODE_EXE);
console.log('[build] PW_ROOT  =', PW_ROOT);

// 3) 改写 extraResources 为真实绝对路径 (只写 build 配置, 不是整个 package.json)
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
for (const res of (pkg.build && pkg.build.extraResources) || []) {
  res.from = res.from.replace(/\$\{env\.NODE_EXE\}/g, NODE_EXE)
                     .replace(/\$\{env\.PW_ROOT\}/g, PW_ROOT);
}
fs.writeFileSync(tmpCfg, JSON.stringify(pkg.build, null, 2), 'utf8');

// 4) 调用 electron-builder
const args = process.argv.includes('--dir')
  ? ['electron-builder', '--win', '--dir', '--config', tmpCfg]
  : ['electron-builder', '--win', 'portable', '--config', tmpCfg];
const r = spawnSync('npx', args, { stdio: 'inherit', env: process.env, shell: true });

// 5) 清理临时配置
try { fs.unlinkSync(tmpCfg); } catch {}
process.exit(r.status === null ? 1 : r.status);
