# 成本显示模式控制功能实现计划

## 📋 功能需求

在Settings中添加一个新的选项，用户可以控制菜单栏成本的显示方式：

1. **Today (Daily Total)** - 显示从00:00到现在的每日总成本（默认）
2. **Current Session Window (5h)** - 显示最近5小时窗口内的成本
3. **Alternate Every 3 Seconds** - 每3秒在上述两种显示之间轮换

中英文都需要适配。

---

## 🔧 需要修改的文件

### 1️⃣ **翻译文件 - 添加新的i18n键**

**文件**：`src/lib/i18n/locales/en.json`

在 `settingsPanel` 部分添加：
```json
"costDisplayMode": "Cost Display Mode",
"costDisplayModeDesc": "Control how the menu bar cost is displayed",
"modeToday": "Today (Daily Total)",
"modeSessionWindow": "Current Session Window (5h)",
"modeAlternate": "Alternate Every 3 Seconds",
"costDisplayModeDesc": "Rotate between daily total and 5-hour session window costs automatically",
"costDisplayModeInfo": "Currently set to rotate every 3 seconds between Today and Current Session Window"
```

**文件**：`src/lib/i18n/locales/zh.json`

在 `settingsPanel` 部分添加：
```json
"costDisplayMode": "成本显示模式",
"costDisplayModeDesc": "控制菜单栏成本的显示方式",
"modeToday": "今天 (每日总计)",
"modeSessionWindow": "当前会话窗口 (5小时)",
"modeAlternate": "每3秒轮换",
"costDisplayModeInfo": "当前设置为每3秒在\\\"今天\\\"和\\\"当前会话窗口\\\"之间轮换"
```

### 2️⃣ **类型定义 - 修改preferences接口**

**文件**：`src/components/SettingsPanel.tsx` 第14-15行

修改为：
```typescript
// 从这样：
menuBarCostSource?: 'today' | 'sessionWindow';

// 改为：
menuBarCostDisplayMode?: 'today' | 'sessionWindow' | 'alternate';
```

### 3️⃣ **UI组件 - 更新Settings Panel**

**文件**：`src/components/SettingsPanel.tsx` 第288-312行

替换这段代码（Cost Basis部分）为新的实现，添加三个选项。

### 4️⃣ **服务层 - 实现轮换逻辑**

**文件**：`src/services/ccusageService.ts`

修改 `menuBarCostSource` 为 `menuBarCostDisplayMode`

添加轮换逻辑到 `getMenuBarData()` 和 `getEnhancedMenuBarData()` 方法：

```typescript
private getEffectiveCostSource(): 'today' | 'sessionWindow' {
  if (this.menuBarCostDisplayMode === 'alternate') {
    // 每3秒轮换
    const cycleTime = Math.floor(Date.now() / 3000);
    return cycleTime % 2 === 0 ? 'today' : 'sessionWindow';
  }
  return this.menuBarCostDisplayMode;
}
```

### 5️⃣ **App组件 - 更新偏好设置处理**

**文件**：`src/App.tsx`

确保 `menuBarCostDisplayMode` 配置正确传递和更新。

---

## 📊 实现流程详解

### 轮换逻辑工作原理

```javascript
// 轮换周期：3秒
// 时间 → 显示
// 0-2s  → 'today'
// 3-5s  → 'sessionWindow'
// 6-8s  → 'today'
// ...

const cycleTime = Math.floor(Date.now() / 3000);  // 当前3秒周期
return cycleTime % 2 === 0 ? 'today' : 'sessionWindow';
```

### 数据流

```
Settings Panel
    ↓
用户选择显示模式
    ↓
handlePreferenceChange('menuBarCostDisplayMode', value)
    ↓
App.updatePreferences()
    ↓
CCUsageService.updateConfiguration({ menuBarCostDisplayMode: value })
    ↓
getMenuBarData() / getEnhancedMenuBarData()
    ↓
getEffectiveCostSource() 计算应显示的源
    ↓
返回对应的成本值
```

---

## ✅ 实现清单

- [ ] 在en.json添加新的翻译键（5条）
- [ ] 在zh.json添加对应的中文翻译
- [ ] 修改SettingsPanel.tsx中的preferences接口
- [ ] 更新SettingsPanel.tsx的UI部分（替换Cost Basis选择器）
- [ ] 在CCUsageService中添加getEffectiveCostSource()方法
- [ ] 修改getMenuBarData()使用新的逻辑
- [ ] 修改getEnhancedMenuBarData()使用新的逻辑
- [ ] 在App.tsx确保配置正确更新
- [ ] 测试所有三种显示模式
- [ ] 验证轮换间隔正确（3秒）
- [ ] 验证中英文都显示正确

---

## 💡 设计亮点

1. **用户友好**：三种清晰的选项，用户可以选择最适合自己的显示方式
2. **默认合理**：默认为'today'（每日总计），更符合大多数用户期望
3. **可选轮换**：提供自动轮换的选项，满足想同时了解两个指标的用户
4. **多语言**：完全支持中英文
5. **无缝集成**：复用现有的preference系统，无需大改

---

## 🎯 用户看到的效果

### Settings中的显示：
```
📊 Cost Display Mode
   Control how the menu bar cost is displayed

   Display Mode: [Select ▼]
   - Today (Daily Total)
   - Current Session Window (5h)
   - Alternate Every 3 Seconds

   💡 When set to "Alternate Every 3 Seconds", the menu bar
      will automatically rotate between showing today's total
      and the 5-hour session window cost every 3 seconds.
```

### 菜单栏显示：
```
选择'Today'时：
┌─────────────┐
│ 20% | $45.32│
└─────────────┘

选择'Session Window'时：
┌─────────────┐
│ 20% | $6.50 │
└─────────────┘

选择'Alternate'时：
┌─────────────┐
│ 20% | $45.32│  ← 0-3秒
└─────────────┘
  ↓ (3秒后)
┌─────────────┐
│ 20% | $6.50 │  ← 3-6秒
└─────────────┘
  ↓ (3秒后)
┌─────────────┐
│ 20% | $45.32│  ← 6-9秒
└─────────────┘
```

---

## 🧪 测试用例

### 测试1：Today模式
- 设置为'Today'
- 验证菜单栏显示的是每日总成本
- 应该是较大的数字（~40+美元）

### 测试2：Session Window模式
- 设置为'Current Session Window'
- 验证菜单栏显示的是5小时窗口成本
- 应该是较小的数字（~6-7美元）

### 测试3：Alternate模式
- 设置为'Alternate Every 3 Seconds'
- 观察菜单栏成本每3秒切换一次
- 验证中英文都显示正确

### 测试4：语言切换
- 在中文和英文之间切换
- 验证所有文本都正确翻译

---

## 📝 总结

这个功能将完全解决用户看到价格忽高忽低的困惑问题，给用户完全的控制权：
- ✅ 可以选择只看每日总计
- ✅ 可以选择只看5小时窗口
- ✅ 可以选择自动轮换查看两个值
- ✅ 解决了之前"莫名其妙变动"的问题

