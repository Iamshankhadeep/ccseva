# CCSeva 🤖

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/release/Iamshankhadeep/ccseva.svg)](https://github.com/Iamshankhadeep/ccseva/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Iamshankhadeep/ccseva/ci.yml?branch=main)](https://github.com/Iamshankhadeep/ccseva/actions)
[![Downloads](https://img.shields.io/github/downloads/Iamshankhadeep/ccseva/total.svg)](https://github.com/Iamshankhadeep/ccseva/releases)
[![macOS](https://img.shields.io/badge/macOS-10.15%2B-blue)](https://github.com/Iamshankhadeep/ccseva)

一款美观的 macOS 菜单栏应用，用于实时追踪您的 Claude Code 使用情况。监控令牌消耗、成本和使用模式，拥有优雅的界面。

## 截图

<img src="./screenshots/zh/dashboard.png" alt="仪表板 - 中文" width="80%" />
<img src="./screenshots/zh/analytics.png" alt="分析 - 中文" width="80%" />
<img src="./screenshots/zh/terminal.png" alt="终端 - 中文" width="80%" />

## 功能特性

- **实时监控** - 每30秒更新一次令牌使用情况
- **菜单栏集成** - 百分比指示器，使用彩色编码状态
- **智能计划检测** - 自动检测 Pro/Max5/Max20/自定义计划
- **使用分析** - 7天图表、模型分布和趋势分析
- **智能通知** - 在70% 和 90% 阈值处警告，带冷却时间
- **成本追踪** - 每日成本估算和消耗速率计算
- **美观界面** - 渐变设计和玻璃态形态效果
- **多语言支持** - 支持英文和简体中文

## 安装

### 下载（推荐）
从 [GitHub Releases](https://github.com/Iamshankhadeep/ccseva/releases) 下载最新版本：
- **macOS (Apple Silicon)**: `CCSeva-darwin-arm64.dmg`
- **macOS (Intel)**: `CCSeva-darwin-x64.dmg`

### 从源代码构建
```bash
git clone https://github.com/Iamshankhadeep/ccseva.git
cd ccseva
npm install
npm run build
npm start
```

### 开发
```bash
npm run electron-dev  # 热重新加载开发
```

## 使用方法

1. **启动** - CCSeva 出现在菜单栏中
2. **点击** - 查看详细的使用统计信息
3. **右键点击** - 访问刷新和退出选项

应用会自动从 `~/.claude` 目录检测您的 Claude Code 配置，并每30秒更新一次。

## 国际化

CCSeva 支持多种语言：
- **English** - 默认语言
- **简体中文** - 在设置中选择

在应用设置中更改语言后，界面文字会立即更新。

## 系统要求

- macOS 10.15+
- Node.js 18+（从源代码构建时需要）
- 已安装并配置 Claude Code CLI

## 技术栈

- Electron 36 + React 19 + TypeScript 5
- Tailwind CSS 3 + Radix UI 组件
- ccusage 包用于数据集成
- i18next 用于国际化

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 致谢

使用 ❤️ 使用 [Electron](https://electronjs.org)、[React](https://reactjs.org)、[Tailwind CSS](https://tailwindcss.com)、[ccusage](https://github.com/ryoppippi/ccusage) 和 [i18next](https://www.i18next.com) 构建。

---

**注意**: 这是一个非官方的 Claude Code 使用跟踪工具。需要有效的 Claude Code 安装和配置。
