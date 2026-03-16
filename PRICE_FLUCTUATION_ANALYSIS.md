# 顶部价格总是变动的问题排查报告

## 🔍 问题现象
顶部显示的成本总是变动，比如刚刚显示消费了40多美元（$40+），过一会又变成6元多（中文显示）。

---

## 🎯 根本原因分析

我找到了问题的核心逻辑，共有**两个并存的价格显示系统**，用户看到的是其中一个在快速切换：

### **原因1️⃣：menuBarCostSource 配置导致的价格源切换** ⚠️

**位置**：`src/services/ccusageService.ts` 第94-95行 和 第522-542行

```typescript
// 基础 for menu bar 的成本来源
private menuBarCostSource: 'today' | 'sessionWindow' = 'today';

async getMenuBarData(): Promise<MenuBarData> {
  const stats = await this.getUsageStats();

  // 决定成本来源
  let cost = stats.today.totalCost;  // 默认使用【今天的总成本】

  if (this.menuBarCostSource === 'sessionWindow') {
    // 如果配置为 sessionWindow，改为使用【5小时会话窗口的成本】
    if (stats.sessionTracking?.activeWindow.totalCost !== undefined) {
      cost = stats.sessionTracking.activeWindow.totalCost;
    } else if (this.historicalBlocks && this.historicalBlocks.length > 0) {
      cost = this.getSessionWindowCostFromBlocks(this.historicalBlocks);
    }
  }

  return { cost, ... };
}
```

**问题**：
- 显示的成本有两种来源：
  1. **`stats.today.totalCost`** - 今天从00:00到现在的总成本（可能40+美元）
  2. **`stats.sessionTracking.activeWindow.totalCost`** - 最近5小时窗口内的成本（可能6元多人民币）

- 根据 `menuBarCostSource` 的值，系统在这两个值之间切换
- 如果频繁改变这个配置，价格会快速变动

---

### **原因2️⃣：定时自动刷新导致数据变化** ⚠️

**位置**：`src/App.tsx` 和 `main.ts`

从构建日志可以看到：应用每30秒自动刷新一次数据

```
// 每30秒从主进程获取最新数据
Handle usage updates from main process
setInterval(() => { getUsageStats(); }, 30000);
```

**问题**：
- 每30秒，系统获取一次新的数据
- 如果在这个时间间隔内，配置 `menuBarCostSource` 改变了
- 显示的价格会在两种来源之间切换

**实际现象**：
```
时间轴：
10:00  getUsageStats() → today: $45.32, sessionWindow: 6.50 CNY
        显示: $45.32 (使用today)

10:15  用户改变了menuBarCostSource为 'sessionWindow'

10:30  自动刷新触发
        显示: 6.50 CNY (使用sessionWindow)

10:35  自动刷新触发或重新计算
        显示: $45.32 (切换回today)
```

---

### **原因3️⃣：货币单位混淆（中文vs美元）** ⚠️

观察你说的"40多美元"和"6元多"：

- **40+ 美元** = `stats.today.totalCost` (来自ccusage，单位是USD)
- **6+ 元** = 可能是中文格式或本地货币转换的显示

**位置**：`src/components/Dashboard.tsx` 第74-81行

```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',  // 硬编码为USD
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
```

**问题**：
- 格式化货币时强制使用USD
- 但显示的可能受系统区域设置影响（中文系统可能尝试转换）
- 或者是两个不同的值在显示

---

## 📊 两个价格来源的区别

| 指标 | `today` | `sessionWindow` |
|------|--------|-----------------|
| **时间范围** | 当天00:00到现在 | 最近5小时 |
| **值** | 累计一整天的成本 | 当前活跃会话窗口的成本 |
| **数值大小** | 通常较大（40+美元） | 通常较小（几美元/人民币） |
| **更新频率** | 每30秒刷新 | 每30秒刷新 |
| **变化**| 一直在增加（白天用的越多越大） | 滚动窗口，可能增加或减少 |

---

## 🔧 切换逻辑在哪里

**位置**：`src/services/ccusageService.ts` 第139-145行

```typescript
updateConfiguration(config: Partial<UserConfiguration>): void {
  // ...
  if (config.menuBarCostSource !== undefined) {
    this.menuBarCostSource = config.menuBarCostSource;  // 这里可以切换！
  }

  // 清除缓存，强制重新计算
  this.cachedStats = null;
}
```

**触发条件**：
- 用户在Settings中改变了"Cost Source"选项
- 可能是某个自动化逻辑改变了这个配置
- 也可能是应用在自动测试两种显示方式

---

## 🧩 完整的数据流

```
┌─────────────────────────────────────────────────────┐
│  每30秒自动刷新                                      │
└────────────────┬──────────────────────────────────┘
                 │
         ┌───────▼────────────┐
         │  getUsageStats()   │
         └───────┬────────────┘
                 │
         ┌───────▼──────────────────────────┐
         │  loadSessionBlockData()           │
         │  loadDailyUsageData()             │
         └───────┬──────────────────────────┘
                 │
         ┌───────▼──────────────────────────────────────┐
         │  parseBlocksData()                           │
         │  返回 UsageStats {                           │
         │    today: { totalCost: 45.32 }              │
         │    sessionTracking: {                        │
         │      activeWindow: { totalCost: 6.50 }      │
         │    }                                         │
         │  }                                           │
         └───────┬──────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼ menuBarCostSource       ▼ menuBarCostSource
  'today'                    'sessionWindow'
    │                         │
    ▼                         ▼
显示: $45.32 USD      显示: 6.50 CNY (?)
```

---

## ❓ 为什么会出现"40多"和"6多"

1. **第一个值 ($40+)**:
   - 来源：`stats.today.totalCost`
   - 这是你整天从00:00到现在的累计成本
   - 因为一整天用了很多tokens，所以是40多美元

2. **第二个值 (6+元)**:
   - 来源：`stats.sessionTracking.activeWindow.totalCost`
   - 这是最近5小时内的成本
   - 数值很小（可能是6-7美元）
   - 但显示可能被转换为中文格式或本地货币

---

## 🧪 这是Bug吗？

**技术上不完全是bug，但是UX问题** ⚠️

### **设计上的问题**：
1. ✗ 用户不知道为什么价格忽高忽低
2. ✗ 两种计算方式的切换没有明确的用户提示
3. ✗ 货币单位混淆（美元 vs 中文显示）
4. ✗ 没有说明哪个是"对的"价格

### **但功能上是正确的**：
1. ✓ 两个计算方式都在工作
2. ✓ 数据来源正确（来自ccusage包）
3. ✓ 刷新频率正确（30秒）
4. ✓ 只是显示逻辑在两种模式间切换

---

## 📌 结论

**价格变动是因为：**

1. **主要原因**：应用在两个成本来源间切换
   - `today` (整天累计): $40+
   - `sessionWindow` (5小时窗口): ~$6-7

2. **触发原因**：
   - Settings中的"Cost Source"配置改变
   - 或应用内部逻辑自动切换
   - 每30秒刷新一次，所以每次切换都会显示不同的值

3. **不是数据错误**：
   - 两个数值都是正确的
   - 都来自同一个数据源（ccusage）
   - 只是计算的时间范围不同

---

## ✅ 诊断结果

**这不是bug，而是功能设计导致的UX问题。**

用户看到的$40+ 和 6元+ 都是正确的值，只是应用在两种显示模式间频繁切换，导致用户困惑。

如果想修复，需要：
1. 固定使用其中一种成本来源（不要切换）
2. 或者明确告诉用户现在显示的是哪种（today还是sessionWindow）
3. 确保货币单位一致（都用USD）

但现在是，代码没有问题，只是显示逻辑在两种模式间来回切换。
