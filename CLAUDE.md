# CLAUDE.md - FlowMeet 项目规范

## 项目概览

FlowMeet 是一个实时社交活动管理平台（50-200人规模），前端基于 Next.js 15 App Router，后端使用 Supabase（PostgreSQL + Realtime）。支持活动签到、1v1 匹配、分组讨论、工作流编排、实时主持人控制。

## 技术栈

- **框架**: Next.js 15.5 (App Router) + React 18 + TypeScript 5 (strict)
- **样式**: Tailwind CSS 3.4 + shadcn/ui (Radix UI + CVA) + CSS Variables 设计系统
- **数据库**: Supabase (PostgreSQL + PostgREST + Realtime + Auth + Storage)
- **拖拽**: @dnd-kit/core + @dnd-kit/sortable（工作流步骤排序）
- **图标**: lucide-react
- **通知**: sonner (toast)
- **QR**: qrcode.react (生成) + jsqr (扫描)
- **分析**: PostHog
- **包管理**: npm
- **部署**: Vercel
- **i18n**: 自定义 Context API（zh/en）

## 部署信息

- **GitHub**: https://github.com/entrohub/flowmeet-org
- **部署平台**: Vercel
- **数据库**: Supabase (EU Central - Frankfurt)

## 环境变量

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```

## 目录结构

```
frontend/
├── app/                    # Next.js App Router 路由
│   ├── (public)/           # 公开页面（首页、登录、活动列表、隐私政策）
│   ├── (host)/             # 主持人后台（活动管理、工作流、场地、实时控制）
│   ├── (admin)/            # 管理员后台（用户、活动、主持人、广告管理）
│   ├── user/               # 参与者页面（签到、匹配、分组、评价、连接）
│   ├── api-docs/           # API 文档
│   ├── layout.tsx          # 根布局（Provider 嵌套：PostHog → Auth → Locale）
│   └── globals.css         # 全局样式 + CSS Variables 设计令牌
├── components/             # 按业务域组织的组件（~79 文件）
│   ├── ui/                 # shadcn 原子组件（Button, AlertDialog, Skeleton 等）
│   ├── layout/             # 导航栏、头像等布局组件
│   ├── event/              # 活动卡片、创建/编辑对话框、报名滑动
│   │   └── detail/         # 活动详情子组件（信息、统计、参与者、期望）
│   ├── matching/           # 匹配卡片、推荐、位置共享
│   ├── groups/             # 分组卡片
│   ├── workflow/           # 工作流模块选择、模板库、步骤排序
│   │   └── flow-control/   # 主持人实时控制面板（15+ 子组件）
│   ├── checkin/            # 签到卡片、QR 扫描
│   ├── ratings/            # 评价卡片（活动、匹配质量、话题）
│   ├── expectations/       # 期望表单、标签选择
│   ├── topics/             # 话题卡片、AI 生成按钮
│   ├── ads/                # 广告对话框、横幅
│   └── auth/               # ProfileCompletionGuard, RoleRouteGuard
├── features/               # 页面级 hooks 和组合逻辑
│   ├── host-console/       # useHostConsole, workflowModules
│   ├── event-live/         # useEventLive
│   └── auth/               # useAuth
├── lib/
│   ├── api/                # Supabase API 调用层（30+ 模块）
│   ├── realtime/           # Realtime 订阅、Flow Broadcast、匹配队列
│   ├── i18n/               # 国际化 Context（zh.json / en.json）
│   ├── auth/               # Auth Context
│   ├── supabase/           # Supabase 客户端初始化
│   ├── posthog/            # PostHog Provider + 页面追踪
│   └── utils.ts            # cn(), formatDate 等工具
├── hooks/                  # 自定义 React hooks（useMatching 等）
├── types/domain.ts         # 核心业务类型（唯一类型定义文件）
├── scripts/                # clean-build, postbuild-onedrive
└── public/images/          # Logo、图标等静态资源
```

## 路由结构

### 公开路由 `(public)/`
- `/` — 首页（语言切换）
- `/login` — 登录
- `/auth/signup` — 注册
- `/auth/callback` — OAuth 回调
- `/events` — 公开活动列表
- `/privacy` — 隐私政策

### 主持人路由 `(host)/`（RoleRouteGuard 保护）
- `/host` — 主持人仪表盘
- `/host/event` — 活动列表
- `/host/event/[id]` — 活动详情/编辑
- `/host/workflows` — 工作流模板管理
- `/host/venues` — 场地管理
- `/host/live/flow` — **实时流程控制**（核心页面）
- `/host/live/checkin` — 实时 QR 签到扫描
- `/host/rating` — 评价管理
- `/host/profile` — 主持人资料

### 管理员路由 `(admin)/`
- `/admin` — 管理面板
- `/admin/users` — 用户管理
- `/admin/events` — 活动管理
- `/admin/hosts` — 主持人管理
- `/admin/ads` — 广告管理
- `/admin/test/simulator` — 测试模拟器

### 参与者路由 `user/`
- `/user` — 参与者仪表盘
- `/user/my-events` — 我的活动
- `/user/event` — 活动详情
- `/user/event/[eventId]/preferences` — 活动偏好
- `/user/checkin` — 签到（QR 展示 / 手动码）
- `/user/flow` — **实时匹配/配对流程**
- `/user/matching` — 1v1 匹配浏览
- `/user/groups` — 分组界面
- `/user/profile` — 资料管理
- `/user/topics` — 话题查看
- `/user/expectations` — 设置期望
- `/user/rating` — 活动后评价
- `/user/summary` — 活动回顾
- `/user/connections` — 查看连接
- `/user/venue` — 场地信息

## UI 设计系统

### 色彩

```
主色:   Vibrant Blue  #5272F7  (HSL 231 91% 65%)
强调色: Lime Green    #EBF25C  (HSL 63 85% 65%)
背景:   Warm Gray     #F7F7F5  (light) / #10100E (dark)
前景:   Brand Black   #10100E  (light) / Off-white (dark)
灰阶:   gray-50 ~ gray-900 (CSS Variables)
```

### 字体

- Plus Jakarta Sans（400, 500, 600, 700, 800）

### 移动端优先 

- 触摸目标最小 44×44px（`.touch-target`）
- 触摸反馈：`active:scale-95 transition-transform`（`.touch-feedback`）
- 禁止双击缩放、禁止弹性滚动、禁止点击高亮
- 深色模式通过 CSS Variables 切换（class 策略）

### 自定义动画

- `scan-line` — 扫码线动画
- `scale-in` — 缩放进入
- `matching-pulse` — 匹配脉冲
- `match-celebrate` — 匹配成功庆祝
- `slide-up-fade` — 滑入渐显
- `breathing` — 呼吸灯
- `active-step-pulse` — 当前步骤边框脉冲

## 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `EventCard.tsx`, `MatchCard.tsx` |
| API/工具文件 | camelCase | `matching.ts`, `checkin.ts` |
| 目录 | 小写 + 连字符 | `flow-control/`, `host-console/` |
| 函数 | camelCase | `getEvent()`, `useMatching()` |
| 类型/接口 | PascalCase | `Event`, `Profile`, `Match` |
| 数据库表 | 小写 + 下划线 + 域前缀 | `evt_events`, `usr_profiles` |

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
- 不在组件中硬编码颜色值，始终使用语义化变量
- 移动端优先响应式设计

### 国际化
- 使用 `useTranslation()` hook 获取 `t` 函数
- 键名用点分命名空间：`flowMatching.matchScore`
- 支持参数替换：`t('key', { score: 85 })`
- 新增文案需同时更新 `zh.json` 和 `en.json`

### 实时功能
- 使用 Supabase Channels 实现 Presence 和 Broadcast
- Channel 命名：`event:{eventId}:matching:{stepId}`
- Presence 心跳间隔 15 秒，离线阈值 30 秒
- 组件需处理断线重连和状态恢复
- 主持人操作通过 `broadcastFlowUpdate()` 推送给所有参与者

### 类型
- 所有业务类型集中在 `types/domain.ts`
- 不分散定义类型文件

## 核心业务流程

### 参与者状态机
```
CHECKIN → WAITING → MATCHED → ENDING → FEEDBACK
```

### 数据流（主持人 → 参与者）
```
Host Action → logHostAction() → Update DB → broadcastFlowUpdate() → Channel Broadcast → Participant State Update
```

### 匹配算法
- 约束：当前轮次不重复，最小化前 N 轮重复
- 贪心算法（< 1 秒目标）
- 奇数人数兜底：组成 3 人组
- 实现：`lib/api/matching-algorithm.ts`, `auto-pairing.ts`, `auto-grouping.ts`

## 常用命令

```bash
cd frontend
npm run dev              # 本地开发 (port 3000)
npm run dev:mobile       # 移动端调试 (0.0.0.0)
npm run build            # 构建
npm run lint             # ESLint 检查
npm run type-check       # TypeScript 类型检查
npm run check            # lint + type-check
```

## 关键架构决策

1. **无独立后端** — 数据访问通过 Supabase RLS 策略控制
2. **实时优先** — 状态同步依赖 Supabase Realtime Channels
3. **Context API 而非 Redux** — 轻量状态管理（i18n、Auth、主题）
4. **业务 Hooks 模式** — 复杂逻辑封装在自定义 hooks 中（`hooks/` + `features/`）
5. **弱网容错** — 状态可通过 API 重新获取恢复
6. **域前缀表名** — `evt_*`, `usr_*` 鼓励有界上下文
7. **集中类型定义** — 所有业务类型在 `types/domain.ts` 一个文件
8. **Provider 嵌套顺序** — PostHog → Auth → Locale → Main Content

## 关键文件索引

| 用途 | 路径 |
|------|------|
| 业务类型定义 | `frontend/types/domain.ts` |
| 设计令牌 + 全局样式 | `frontend/app/globals.css` |
| Tailwind 配置 | `frontend/tailwind.config.ts` |
| 根布局 | `frontend/app/layout.tsx` |
| API 层 | `frontend/lib/api/` (30+ 模块) |
| 实时通信 | `frontend/lib/realtime/` |
| 数据库迁移 | `supabase/migrations/` |
| 技术设计文档 | `README-tech.md` |
