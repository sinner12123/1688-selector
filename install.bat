@echo off
setlocal
title 1688 Selector - 一键安装
cd /d "%~dp0"

echo ============================================
echo   1688 Selector 一键安装
echo   跨境电商选品桌面应用
echo ============================================
echo.

rem ---------- [1/4] Node.js ----------
echo [1/4] 检测 Node.js ...
node -v >nul 2>nul
if errorlevel 1 (
    echo   未检测到 Node.js, 尝试通过 winget 自动安装...
    where winget >nul 2>nul
    if errorlevel 1 (
        echo   [失败] 系统没有 winget, 请手动安装 Node.js LTS:
        echo           https://nodejs.org/
        pause
        exit /b 1
    )
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    rem winget 装完 PATH 不会自动刷新到当前窗口, 手动补常见路径
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%AppData%\npm"
    node -v >nul 2>nul
    if errorlevel 1 (
        echo   [失败] Node.js 已安装但未生效, 请关闭本窗口重新运行 install.bat
        pause
        exit /b 1
    )
)
for /f "delims=" %%v in ('node -v') do echo   已安装 Node.js %%v

rem ---------- [2/4] 1688-cli ----------
echo [2/4] 检测 1688-cli ...
where 1688 >nul 2>nul
if errorlevel 1 (
    echo   未检测到 1688-cli, 正在全局安装 npm 包...
    call npm install -g 1688-cli
    if errorlevel 1 (
        echo   [失败] 1688-cli 安装失败, 请检查网络后重新运行本脚本
        pause
        exit /b 1
    )
)
echo   1688-cli 已就绪

rem ---------- [3/4] 项目依赖 ----------
echo [3/4] 安装项目依赖 Electron...
call npm install
if errorlevel 1 (
    echo   [失败] 依赖安装失败, 请检查网络后重新运行本脚本
    pause
    exit /b 1
)

rem ---------- [4/4] 桌面快捷方式 ----------
echo [4/4] 创建桌面快捷方式...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"
if errorlevel 1 (
    echo   [失败] 快捷方式创建失败, 可手动运行 npm start 启动
) else (
    echo   桌面快捷方式 "1688 Selector" 已创建
)

echo.
echo ============================================
echo   安装完成!
echo   双击桌面 "1688 Selector" 图标即可启动应用
echo   首次使用: 点击右上角 "扫码登录" 完成 1688 登录
echo ============================================
echo.
pause
