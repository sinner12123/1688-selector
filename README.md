# 1688 选品助手（桌面 App）

基于 [1688-cli](https://github.com/superjack2050/1688-cli) 的跨境电商选品桌面应用。
底层复用 1688-cli 的浏览器自动化（真实 Chrome/Chromium 会话），**不调用 1688 官方 API**。

## 功能

- 🔍 关键词搜索 1688 商品（排序 / 数量 / 资质 / 价格区间 / 排除广告位）
- 📋 结果卡片展示：价格、销量、供应商、地区、工厂资质、标签
- 🔗 一键打开商品详情页（系统默认浏览器）
- 📱 扫码登录（内置二维码弹窗，自动刷新）

## 运行

前置条件：已安装 `1688-cli`（`npm i -g 1688-cli`）并已完成一次扫码登录。

```bash
npm install        # 首次运行，安装 Electron
npm start          # 启动桌面应用
```

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
```
