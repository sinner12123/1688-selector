# 1688 选品助手（桌面 App）

![icon](assets/icon.png)

基于 [1688-cli](https://github.com/superjack2050/1688-cli) 的跨境电商选品桌面应用。
底层复用 1688-cli 的浏览器自动化（真实 Chrome/Chromium 会话），**不调用 1688 官方 API**。

## 功能

- 🔍 关键词搜索，**四平台价格并列对比**：1688（国内批发价）/ AliExpress / Amazon / eBay
- 🛡️ 海外采集使用反爬虫方案（playwright-extra + puppeteer-extra-plugin-stealth + 真实 Chrome 有头模式，参考 GitHub 开源项目）
- 🌐 **内置代理设置**：支持 HTTP/SOCKS5 代理（Clash/Shadowsocks 等），海外采集走代理节点，无需全局挂 VPN
- 📋 1688 结果展示：价格、销量、供应商、地区、工厂资质、标签
- 🔗 一键打开商品详情页（系统默认浏览器）
- 📱 扫码登录（内置二维码弹窗，自动刷新）

> ⚠️ **海外平台需要海外网络**：国内直连时 Amazon 显示台币(TWD)且时断时续、eBay 连不上、AliExpress 被登录墙拦。**在 App 内「代理设置」里填入你的代理节点（HTTP/SOCKS5）即可**，海外三列会走代理访问。

## 下载（Windows 免安装版）

直接下载便携版 exe，双击即用，无需安装 Node.js / 浏览器：

👉 [GitHub Releases 下载 1688 Selector.exe](https://github.com/sinner12123/1688-selector/releases/latest)

> 首次启动如提示 Windows Defender 拦截，点击「更多信息 → 仍要运行」即可（未签名应用）。

## 一键安装（Windows）

双击 `install.bat`，脚本自动完成：

1. 检测 Node.js —— 缺失则通过 winget 自动安装 Node.js LTS
2. 检测 1688-cli —— 缺失则自动 `npm i -g 1688-cli`
3. 安装项目依赖（Electron）
4. 桌面创建带图标的快捷方式「1688 Selector」

之后双击桌面快捷方式即可启动。

> 需要 Windows 10/11；未安装 winget 时请手动安装 Node.js LTS（https://nodejs.org/）。

## 手动运行

前置条件：已安装 Node.js 与 `1688-cli`（`npm i -g 1688-cli`）并已完成一次扫码登录。

```bash
npm install        # 首次运行，安装 Electron
npm start          # 启动桌面应用
```

## 构建打包（Windows 单文件 exe）

```bash
npm run build      # 产物在 dist/1688 Selector.exe（自动探测 node.exe 与 playwright 浏览器目录）
npm run build:dir  # 仅解包目录 dist/win-unpacked，不压缩 exe（调试用）
```

> 打包脚本 `scripts/build.js` 自动探测 Node 运行时与 `%LOCALAPPDATA%\ms-playwright` 浏览器缓存并打进包内，目标机器无需预装任何环境。
> 探测失败时（如未安装 playwright 浏览器）先执行 `npx playwright install chromium`；也可用环境变量 `NODE_EXE` / `PW_ROOT` 手动指定路径。

> 首次搜索会启动浏览器上下文，约 10–20 秒，属正常现象。

## 说明

- 登录状态读取 `~/.1688/state.json`（即时，不启动浏览器）。
- CLI 输出通过临时文件重定向捕获，避免 pipe 阻塞、不受输出大小限制。
- `main.js` 会在启动时写 `startup.log`（排查用，可删除）。
- `test-cli.js` 是独立的 CLI 调用验证脚本：`node test-cli.js`。

## 目录结构

```
main.js            主进程（窗口 + IPC + CLI 封装）
preload.js         安全桥接（contextBridge 暴露 window.api）
renderer/          前端界面（index.html / style.css / renderer.js）
install.bat        一键安装（检测/安装环境 + 建快捷方式）
create-shortcut.ps1  桌面快捷方式创建脚本
assets/            应用图标（icon.png / icon.ico）
scripts/gen_icon.py  图标生成脚本（Pillow）
```
