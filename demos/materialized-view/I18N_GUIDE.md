# 国际化使用指南

本项目已完成国际化改造，支持中英文切换。

## 功能特性

- ✅ 使用 `react-intl` 实现国际化
- ✅ 支持中文（zh-CN）和英文（en-US）
- ✅ 通过 URL 参数 `language` 控制语言切换
- ✅ 所有页面和组件文案已完全国际化

## 使用方法

### 1. 切换语言

通过在 URL 中添加 `language` 查询参数来切换语言：

**中文界面（默认）：**
```
http://localhost:3000
或
http://localhost:3000?language=zh-CN
```

**英文界面：**
```
http://localhost:3000?language=en-US
```

### 2. 文件结构

```
src/
├── locales/              # 国际化文案文件
│   ├── zh-CN.json       # 中文文案
│   └── en-US.json       # 英文文案
├── components/
│   └── IntlProviderWrapper.tsx  # 国际化 Provider 组件
└── hooks/
    └── useScenarios.ts  # 国际化场景数据的 Hook
```

### 3. 添加新的国际化文案

如需添加新的文案，请在 `src/locales/zh-CN.json` 和 `src/locales/en-US.json` 中添加对应的键值对。

**示例：**

在 `zh-CN.json` 中添加：
```json
{
  "common": {
    "welcome": "欢迎使用"
  }
}
```

在 `en-US.json` 中添加：
```json
{
  "common": {
    "welcome": "Welcome"
  }
}
```

在组件中使用：
```tsx
import { useIntl } from "react-intl";

function MyComponent() {
  const intl = useIntl();
  
  return (
    <div>
      {intl.formatMessage({ id: "common.welcome" })}
    </div>
  );
}
```

### 4. 支持的国际化内容

- ✅ 页面标题和描述
- ✅ 数据集介绍
- ✅ 场景名称和描述
- ✅ SQL 编辑器界面
- ✅ 执行结果面板
- ✅ 表结构展示
- ✅ 所有提示和错误消息

## 技术实现

1. **IntlProvider 包装组件**：从 URL 的 `searchParams` 中读取 `language` 参数，并将其传递给 `react-intl` 的 `IntlProvider`。

2. **动态场景数据**：使用 `useScenarios` 和 `useQueryTypes` hooks 动态获取国际化的场景数据。

3. **组件级国际化**：所有组件使用 `useIntl` hook 获取国际化文案。

## 开发建议

1. 所有用户可见的文案都应该放在国际化文件中，避免硬编码。
2. 国际化 key 应该使用有意义的命名，如 `dataset.title` 而不是 `text1`。
3. 对于带有变量的文案，使用 `formatMessage` 的第二个参数传递变量值。

**示例：**
```tsx
intl.formatMessage(
  { id: "message.queryFailed" },
  { type: queryLabel, error: result.error }
)
```

## 注意事项

- 切换语言后页面会自动重新渲染，显示对应语言的内容
- 默认语言为中文（zh-CN）
- 如果 URL 中的 `language` 参数不是 `zh-CN` 或 `en-US`，将自动使用默认语言（中文）

