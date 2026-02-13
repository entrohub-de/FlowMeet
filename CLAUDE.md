# CLAUDE.md - FlowMeet 项目规范

## 项目概览

FlowMeet 是一个实时社交活动管理平台（50-200人规模），前端基于 Next.js 15 App Router，后端使用 Supabase（PostgreSQL + Realtime）。

## 技术栈

- **框架**: Next.js 15 (App Router) + React 18 + TypeScript 5 (strict)
- **样式**: Tailwind CSS 3 + shadcn/ui + CSS Variables 设计系统
- **数据库**: Supabase (PostgreSQL + PostgREST + Realtime)
- **包管理**: npm
- **部署**: Vercel
- **i18n**: 自定义 Context API（zh/en）

## 目录结构

```
frontend/
├── app/                # Next.js App Router 路由
│   ├── (public)/       # 公开页面（登录、首页）
│   ├── (host)/         # 主持人后台
│   └── user/           # 参与者页面
├── components/         # 按业务域组织的组件
│   ├── ui/             # shadcn 原子组件
│   ├── event/          # 活动相关
│   ├── matching/       # 1v1 匹配
│   ├── groups/         # 分组
│   └── workflow/       # 工作流/流程
├── features/           # 页面级 hooks 和组合逻辑
├── lib/
│   ├── api/            # Supabase API 调用层
│   ├── i18n/           # 国际化（zh.json / en.json）
│   ├── realtime/       # Realtime 订阅
│   └── supabase/       # Supabase 客户端初始化
├── hooks/              # 自定义 React hooks
└── types/domain.ts     # 核心业务类型（唯一类型定义文件）
```

## 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `EventCard.tsx`, `MatchCard.tsx` |
| API/工具文件 | camelCase | `matching.ts`, `checkin.ts` |
| 目录 | 小写 + 连字符 | `flow-control/`, `host-console/` |
| 函数 | camelCase | `getEvent()`, `useMatching()` |
| 类型/接口 | PascalCase | `Event`, `Profile`, `Match` |
| 数据库表 | 小写 + 下划线 + 前缀 | `evt_events`, `usr_profiles` |

## 代码规范

### 组件
- 交互组件必须标记 `'use client'`
- 每个组件定义独立的 Props 接口（如 `EventCardProps`）
- 仅使用函数组件 + Hooks，禁止 class 组件
- 事件处理使用 `on*` 命名（`onClick`, `onSubmit`）

### 导入
- 使用 `@/` 路径别名（绝对导入优先）
- 导入顺序：外部库 → 内部模块 → 类型

### API 层（lib/api/）
- 所有 Supabase 调用封装在 `lib/api/` 中
- 异步函数，返回类型化数据
- 错误直接 throw，由调用方处理
- 使用 upsert 保证幂等性

```typescript
// 标准 API 模式
export async function getEvent(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('evt_events')
    .select('*')
    .eq('event_id', eventId)
    .single();
  if (error) throw error;
  return data;
}
```

### 样式
- Tailwind 优先，使用 `cn()` 工具函数合并 class
- 通过 CSS Variables 定义设计令牌（颜色、间距、圆角）
- 主色：Vibrant Blue (#5272F7)，强调色：Lime Green (#EBF25C)
- 移动端优先响应式设计

### 国际化
- 使用 `useTranslation()` hook 获取 `t` 函数
- 键名用点分命名空间：`flowMatching.matchScore`
- 支持参数替换：`t('key', { score: 85 })`
- 新增文案需同时更新 `zh.json` 和 `en.json`

### 实时功能
- 使用 Supabase Channels 实现 Presence 和 Broadcast
- Channel 命名：`event:{eventId}:matching:{stepId}`
- Presence 心跳间隔 15 秒
- 组件需处理断线重连和状态恢复

### 类型
- 所有业务类型集中在 `types/domain.ts`
- 不分散定义类型文件

## 常用命令

```bash
cd frontend
npm run dev          # 本地开发
npm run build        # 构建
npm run lint         # ESLint 检查
npm run type-check   # TypeScript 类型检查
npm run check        # lint + type-check
```

## 关键架构决策

1. **无独立后端** — 数据访问通过 Supabase RLS 策略控制
2. **实时优先** — 状态同步依赖 Supabase Realtime Channels
3. **Context API 而非 Redux** — 轻量状态管理（i18n、主题）
4. **业务 Hooks 模式** — 复杂逻辑封装在自定义 hooks 中（`hooks/` 目录）
5. **弱网容错** — 状态可通过 API 重新获取恢复
