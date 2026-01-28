# FlowMeet Frontend 架构

## 目录结构

```
frontend/
├── app/                          # Next.js App Router
│   ├── (public)/                # 公开路由组
│   │   ├── page.tsx
│   │   ├── auth/
│   │   └── callback/
│   ├── (host)/                  # Host 路由组
│   ├── user/ 或 (event)/        # 参与者路由（待重构）
│   ├── api/                     # Route Handlers
│   ├── globals.css
│   └── layout.tsx
│
├── components/                   # React 组件
│   ├── ui/                      # shadcn 原子组件
│   ├── layout/                  # 布局组件
│   │   └── Navigation.tsx       # 导航栏
│   ├── event/                   # 活动相关业务组件
│   │   ├── StageBanner.tsx
│   │   ├── PresenceCount.tsx
│   │   └── ...
│   └── host/                    # Host 相关业务组件
│
├── features/                     # 功能层 - 页面级别的 hooks + 组件拼装
│   ├── event-live/              # 参与者现场模式
│   │   ├── useEventLive.ts      # 聚合状态 hook
│   │   └── EventLiveView.tsx    # 组件拼装（可选）
│   ├── host-console/            # Host 控制台
│   │   └── useHostConsole.ts
│   └── auth/                    # 认证相关
│       └── useAuth.ts
│
├── lib/                          # 工具库层
│   ├── supabase/
│   │   ├── client.ts            # Supabase 客户端
│   │   └── index.ts
│   ├── api/                     # API 层
│   │   ├── events.ts            # 活动 API
│   │   ├── announcements.ts     # 公告 API
│   │   └── ...
│   ├── realtime/                # Realtime 订阅
│   │   ├── types.ts             # Realtime 事件类型
│   │   └── subscribe.ts         # 订阅函数
│   ├── utils.ts                 # 通用工具
│   └── auth/                    # 认证工具（可选）
│
├── types/                        # TypeScript 类型定义
│   └── domain.ts                # 核心业务实体类型
│
└── stores/                       # 全局状态（可选）
    ├── eventLiveStore.ts
    └── userStore.ts
```

## 分层说明

### 1. **App Layer (app/)**
- Next.js App Router 路由定义
- 路由组用括号隐藏（如 `(public)`、`(host)`）
- 页面级别的布局 (layout.tsx)
- 页面级别的数据获取（可用 Server Components）

### 2. **Components Layer (components/)**
- **ui/**: 原子级别的 UI 组件（button, input 等）
- **layout/**: 全局布局组件（Navigation, Footer, AppShell）
- **event/**: 活动相关的业务组件（按业务域，不按 UI 原子性）
  - StageBanner: 舞台标题区
  - PresenceCount: 在线人数
  - AnnouncementList: 公告列表
  - PollCard: 投票卡片
  - CheckinButton: 签到按钮
- **host/**: Host 相关业务组件
  - StageControls: 舞台控制
  - AnnouncementComposer: 公告编辑器
  - PollControls: 投票控制
  - AttendeeStats: 参与者统计

### 3. **Features Layer (features/)**
- 页面级别的状态管理和组件拼装
- 结合多个业务组件和 hooks
- 聚合业务逻辑
- 例如：
  - `useEventLive` - 订阅活动 realtime + 聚合状态
  - `EventLiveView` - 拼装舞台+公告+投票等组件

### 4. **Lib Layer (lib/)**
- **supabase/**: Supabase 客户端初始化
- **api/**: 数据层，与 Supabase 交互
  - 每个 API 模块对应一个业务实体（events, announcements, polls）
  - 导出类型化的 fetch 函数
- **realtime/**: Realtime 订阅
  - 频道命名规范
  - 事件类型定义
  - 订阅辅助函数
- **utils.ts**: 通用工具（cn, formatDate 等）
- **auth/**: 认证相关工具（requireUser, requireRole）

### 5. **Types Layer (types/)**
- **domain.ts**: 核心业务实体类型
  - Event, Stage, Poll, Announcement, Presence, User
  - 所有 API 层和组件都应该导入这些类型

### 6. **Stores Layer (stores/)** （可选）
- Zustand/MobX 全局状态
- eventLiveStore: 当前活动的聚合状态
- userStore: 用户信息

## 数据流

```
API Layer (lib/api/)
    ↓
Features Layer (features/) 
    ↓
Components (components/)
    ↓
Pages (app/)
```

## 关键规范

### ✅ DO
- 按**业务域**划分组件（event/, host/），不要按 UI 原子性
- 在 `features/` 层编写 hooks 来聚合多个数据源和业务逻辑
- 在 `lib/api/` 层与后端交互
- 在 `types/domain.ts` 中定义业务实体类型
- Realtime 订阅放在 `lib/realtime/` 并通过 hooks 暴露

### ❌ DON'T
- 不要在组件中直接导入 Supabase 客户端
- 不要在 components/ 中处理复杂业务逻辑（应在 features/）
- 不要随意创建顶级文件夹（保持结构清晰）
- 不要混合业务逻辑和 UI（分离关注点）

## 导入路径示例

```typescript
// ✅ 在页面或 feature 中导入
import { useEventLive } from '@/features/event-live/useEventLive';
import { getEvent } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import { cn } from '@/lib/utils';

// ✅ 在业务组件中导入
import { EventHeader } from '@/components/event/EventHeader';

// ❌ 不要这样做
import { supabase } from '@/lib/supabase'; // 直接在组件中使用
```
