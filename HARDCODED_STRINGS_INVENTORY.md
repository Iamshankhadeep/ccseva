# CCSeva 项目硬编码英文字符串完整清单

**生成日期**: 2025-10-28  
**审查范围**: src 目录下所有 .tsx 组件文件  
**总计硬编码文本数**: 约 40 项

---

## 📋 概览

| 类别 | 数量 | 状态 |
|-----|------|------|
| 已使用 i18n 的文本 | ~200+ | ✅ |
| 硬编码的英文文本 | ~40 | ⚠️ |
| 需要翻译的文本 | 40 | 待处理 |

---

## 📁 按文件统计

### 1. src/components/Dashboard.tsx (26 项硬编码文本)

**文件位置**: `/Users/daozhang/Downloads/ccseva/src/components/Dashboard.tsx`

#### 卡片标题和标签文本

| 硬编码文本 | 行号 | 上下文 | 建议翻译键 | 中文翻译 |
|---------|------|--------|----------|--------|
| "Current Plan" | 324 | 右侧卡片标题 | `dashboard.currentPlanLabel` | 当前方案 |
| "Daily Limit" | 330 | 当前方案卡片 | `dashboard.dailyLimit` | 每日限额 |
| "Tokens/Hour" | 373 | 消耗速率标签 | `dashboard.tokensPerHour` | 代币/小时 |
| "Depletion Time" | 390 | 消耗时间标签 | `dashboard.depletionTime` | 消耗时间 |
| "High Usage" | 414 | 使用量状态标签 | `dashboard.highUsage` | 高使用量 |
| "Moderate Usage" | 416 | 使用量状态标签 | `dashboard.moderateUsage` | 中等使用量 |
| "Normal Usage" | 417 | 使用量状态标签 | `dashboard.normalUsage` | 正常使用量 |
| "Today" | 443 | 今日使用卡片标题 | `dashboard.today` | 今天 |
| "Usage Summary" | 444 | 今日使用卡片副标题 | `dashboard.usageSummary` | 使用摘要 |
| "Tokens" | 450 | 今日使用列表项 | `dashboard.tokens` | 代币 |
| "Cost" | 456 | 今日使用列表项 | `dashboard.cost` | 成本 |
| "This Week" | 491 | 本周统计卡片标题 | `dashboard.thisWeek` | 本周 |
| "7-Day Summary" | 492 | 本周统计卡片副标题 | `dashboard.sevenDaySummary` | 7天摘要 |
| "Total Cost" | 498 | 本周统计列表项 | `dashboard.totalCost` | 总成本 |
| "Total Tokens" | 504 | 本周统计列表项 | `dashboard.totalTokens` | 总代币 |
| "Avg Daily" | 510 | 本周统计列表项 | `dashboard.avgDaily` | 平均每日 |
| "No model usage data available" | 599 | 空状态文本 | `dashboard.noModelDataAvailable` | 无模型使用数据可用 |

#### 工具提示文本 (Tooltip)

| 硬编码文本 | 行号 | 上下文 | 建议翻译键 | 中文翻译 |
|---------|------|--------|----------|--------|
| "🔴 Critical Usage" | 266 | 使用状态工具提示标题 | `dashboard.criticalUsageTooltip` | 🔴 严重使用情况 |
| "🟡 Warning Level" | 268 | 使用状态工具提示标题 | `dashboard.warningLevelTooltip` | 🟡 警告级别 |
| "🟢 Safe Usage" | 269 | 使用状态工具提示标题 | `dashboard.safeUsageTooltip` | 🟢 安全使用 |
| "Over 90% of daily limit used" | 273 | 严重使用状态描述 | `dashboard.over90PercentTooltip` | 已使用90%以上的每日限额 |
| "70-90% of daily limit used" | 275 | 警告使用状态描述 | `dashboard.between70to90PercentTooltip` | 已使用70-90%的每日限额 |
| "Less than 70% of daily limit used" | 276 | 安全使用状态描述 | `dashboard.below70PercentTooltip` | 已使用少于70%的每日限额 |
| "Your detected Claude plan based on daily token limit:" | 319 | 计划检测信息 | `dashboard.planDetectionInfo` | 根据每日代币限额检测到的Claude方案: |
| "Current burn rate - how fast you're consuming your daily token allowance" | 378 | 消耗速率详细信息 | `dashboard.burnRateDetail` | 当前消耗率 - 您消耗每日代币额度的速度 |
| "Estimated time until your daily token limit is reached at current usage rate" | 395 | 消耗时间详细信息 | `dashboard.depletionTimeDetail` | 按当前使用率预计达到每日代币限额的时间 |

---

### 2. src/components/LiveMonitoring.tsx (12 项硬编码文本)

**文件位置**: `/Users/daozhang/Downloads/ccseva/src/components/LiveMonitoring.tsx`

| 硬编码文本 | 行号 | 上下文 | 建议翻译键 | 中文翻译 |
|---------|------|--------|----------|--------|
| "Live Monitoring" | 209 | 页面标题 | `liveMonitoring.pageTitle` | 实时监控 |
| "Real-time terminal-style usage tracking" | 210 | 页面副标题 | `liveMonitoring.pageSubtitle` | 实时终端风格使用追踪 |
| "Live Feed" | 266 | 终端部分标题 | `liveMonitoring.liveFeed` | 实时源 |
| "Current Session" | 314 | 会话信息卡片标题 | `liveMonitoring.currentSession` | 当前会话 |
| "Trend" | 342 | 趋势标签 | `liveMonitoring.trend` | 趋势 |
| "Confidence" | 352 | 预测置信度标签 | `liveMonitoring.confidence` | 置信度 |
| "Force Refresh" | 369 | 快速操作按钮 | `liveMonitoring.forceRefresh` | 强制刷新 |
| "Checkpoint" | 378 | 快速操作按钮 | `liveMonitoring.checkpoint` | 检查点 |
| "Clear Logs" | 387 | 快速操作按钮 | `liveMonitoring.clearLogs` | 清空日志 |
| "Waiting for events..." | 293 | 空日志状态文本 | `liveMonitoring.waitingForEvents` | 等待事件... |
| "until reset" | 255 | 时间进度卡片文本 | `liveMonitoring.untilReset` | 直到重置 |
| "Data refreshed" | 162 | 日志条目消息 | `liveMonitoring.dataRefreshed` | 数据已刷新 |

---

### 3. src/components/TerminalView.tsx (6 项硬编码文本)

**文件位置**: `/Users/daozhang/Downloads/ccseva/src/components/TerminalView.tsx`

| 硬编码文本 | 行号 | 上下文 | 建议翻译键 | 中文翻译 |
|---------|------|--------|----------|--------|
| "Auto-detect" | 74 | 计划检测返回值 | `terminalView.autoDetect` | 自动检测 |
| "No reset info" | 40 | 缺少重置信息的默认文本 | `terminalView.noResetInfo` | 无重置信息 |
| "Claude Pro (7K)" | 89 | 计划代币限额标签 | `terminalView.proTokenLimit` | Claude Pro (7K) |
| "Claude Max5 (35K)" | 90 | 计划代币限额标签 | `terminalView.max5TokenLimit` | Claude Max5 (35K) |
| "Claude Max20 (140K)" | 91 | 计划代币限额标签 | `terminalView.max20TokenLimit` | Claude Max20 (140K) |
| "ccmonitor@terminal" | 256 | 终端提示符前缀 | `terminalView.prompt` | ccmonitor@terminal |

---

### 4. src/components/Analytics.tsx (3 项硬编码文本)

**文件位置**: `/Users/daozhang/Downloads/ccseva/src/components/Analytics.tsx`

| 硬编码文本 | 行号 | 上下文 | 建议翻译键 | 中文翻译 |
|---------|------|--------|----------|--------|
| "No data available" | 544 | 图表空状态文本 | `analytics.noDataAvailable` | 无可用数据 |
| "% usage" | 711 | 模型使用百分比标签 | `analytics.percentageUsage` | 使用百分比 |
| "usage" | 711 | 通用使用量标签 | `analytics.usage` | 使用量 |

---

### 5. src/components/SettingsPanel.tsx (2 项硬编码文本)

**文件位置**: `/Users/daozhang/Downloads/ccseva/src/components/SettingsPanel.tsx`

| 硬编码文本 | 行号 | 上下文 | 建议翻译键 | 中文翻译 |
|---------|------|--------|----------|--------|
| "Current detected plan:" | 198 | 计划检测显示标签 | `settingsPanel.detectedPlanLabel` | 当前检测方案: |
| "(tokens/day)" | 200 | 计划限额单位 | `settingsPanel.tokensPerDayUnit` | (代币/天) |

---

### 6. src/App.tsx (1 项硬编码文本)

**文件位置**: `/Users/daozhang/Downloads/ccseva/src/App.tsx`

| 硬编码文本 | 行号 | 上下文 | 建议翻译键 | 中文翻译 |
|---------|------|--------|----------|--------|
| "CCSeva" | 451 | 应用标题/品牌名称 | `app.appName` | CCSeva |

---

### 7. src/components/LoadingScreen.tsx (2 项硬编码文本)

**文件位置**: `/Users/daozhang/Downloads/ccseva/src/components/LoadingScreen.tsx`

| 硬编码文本 | 行号 | 上下文 | 建议翻译键 | 中文翻译 |
|---------|------|--------|----------|--------|
| "CC" | 17 | 加载屏幕徽标文本 | `loadingScreen.logoText` | CC |
| "CCSeva" | 42 | 加载屏幕应用名称 | `loadingScreen.appName` | CCSeva |

---

## 📊 总体统计

### 按组件分布
```
Dashboard.tsx    : 26 项 (65.0%)
LiveMonitoring   : 12 项 (30.0%)
TerminalView     :  6 项 (15.0%)
Analytics.tsx    :  3 项 (7.5%)
SettingsPanel    :  2 项 (5.0%)
App.tsx          :  1 项 (2.5%)
LoadingScreen    :  2 项 (5.0%)
```

### 按类别分布
```
卡片标题和标签         : 17 项
工具提示文本           : 9 项
按钮和操作标签         : 4 项
空状态和默认文本       : 6 项
应用和品牌文本         : 4 项
```

---

## ✅ 检查清单 - 修复步骤

- [ ] **步骤 1**: 在所有相关的 .tsx 文件中添加 `const { t } = useTranslation();` 
- [ ] **步骤 2**: 在 `en.json` 和 `zh.json` 中添加新的翻译键
- [ ] **步骤 3**: 将每个硬编码字符串替换为相应的 `t('key')` 调用
- [ ] **步骤 4**: 验证所有中文翻译的准确性和一致性
- [ ] **步骤 5**: 在实时应用中测试两种语言的显示
- [ ] **步骤 6**: 在应用启动时验证翻译加载正确

---

## 🔄 国际化现状

### 已有国际化系统
- ✅ 使用 `react-i18next` 框架
- ✅ 支持中文 (zh) 和英文 (en) 
- ✅ 翻译文件存储在 `src/lib/i18n/locales/`
- ✅ 现有 200+ 个翻译条目
- ✅ 所有主要 UI 组件已集成 i18n

### 改进空间
- ⚠️ Dashboard 组件有 26 个硬编码字符串
- ⚠️ LiveMonitoring 组件有 12 个硬编码字符串
- ⚠️ 需要统一所有 Brand/App 名称的处理方式

---

## 🎯 优先级建议

### 优先级 1（高）- 用户可见的主要文本
- Dashboard.tsx 的卡片标题和标签（17项）
- LiveMonitoring.tsx 的页面标题和操作按钮（12项）

### 优先级 2（中）- 补充信息和提示
- Dashboard.tsx 的工具提示文本（9项）
- TerminalView.tsx 的终端相关文本（6项）

### 优先级 3（低）- 品牌和技术文本
- App/LoadingScreen 的应用名称（3项）
- Analytics 的技术标签（3项）

---

## 📝 注意事项

1. **品牌名称保留**: "CCSeva" 应该考虑是否需要翻译，建议保持原文
2. **技术术语一致性**: 确保所有技术术语（如 "Tokens", "Burn Rate"）的翻译一致
3. **上下文适配**: 某些文本（如 "Cost", "Tokens"）在不同上下文中可能需要不同翻译
4. **符号和表情**：保留使用的 emoji（如 🔴 🟡 🟢）
5. **单位格式**：保留括号中的单位格式（如 "(tokens/day)"）

---

## 📚 相关文件

| 文件路径 | 说明 |
|---------|------|
| `/src/lib/i18n/locales/en.json` | 英文翻译资源 |
| `/src/lib/i18n/locales/zh.json` | 中文翻译资源 |
| `/src/components/Dashboard.tsx` | 主要仪表板组件 |
| `/src/components/LiveMonitoring.tsx` | 实时监控组件 |
| `/src/App.tsx` | 应用主组件 |

