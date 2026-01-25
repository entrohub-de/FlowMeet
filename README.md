# FlowMeet

FlowMeet helps you run smooth, human-friendly networking events — without over-hosting.

## 项目简介

FlowMeet 是一个线下 Networking 活动管理系统，专为 50-200 人规模的线下社交活动设计。系统通过技术手段实现自动配对、节奏控制和实时同步，将主持人的组织成本降到最低。

### 核心特性

- **自动配对引擎** - 智能匹配参与者，避免重复配对，优化交流体验
- **实时同步** - 通过 SSE 推送，所有参与者设备实时同步活动状态
- **弱网可恢复** - 支持网络断连后自动恢复，确保活动流畅进行
- **极简主持** - 主持人一屏操作，全场同步响应
- **移动优先** - 参与者通过手机 Web 界面参与，无需安装应用

## 技术栈

### 前端
- **Next.js 14** - React 框架
- **TypeScript** - 类型安全
- **Supabase** - 实时数据同步和认证

### 后端
- **Supabase** - PostgreSQL 数据库 + 实时订阅
- **PostgreSQL** - 主数据存储
- **Redis** (计划中) - 临时状态和在线状态管理

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL
- Supabase CLI (用于本地开发)

### 安装步骤

1. 克隆项目

```bash
git clone https://github.com/entrohub-de/FlowMeet.git
cd FlowMeet
```

2. 配置 Supabase

```bash
# 启动本地 Supabase
cd supabase
supabase start

# 创建本地数据库
createdb meetflow
```

3. 安装前端依赖

```bash
cd frontend
npm install
```

4. 配置环境变量

在 `frontend` 目录下创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 项目结构

```
FlowMeet/
├── frontend/          # Next.js 前端应用
│   ├── app/          # App Router 页面
│   ├── components/   # React 组件
│   └── lib/          # 工具函数和配置
├── supabase/         # Supabase 配置和迁移
│   ├── migrations/   # 数据库迁移文件
│   └── config.toml   # Supabase 配置
├── scripts/          # 工具脚本
└── README-tech.md    # 技术设计文档
```

## 系统架构

### 角色

- **参与者 (Participant)** - 通过手机 Web 参与活动
- **主持人 (Host)** - 通过控制台管理活动流程
- **大屏展示 (Optional)** - 可选的投影展示界面

### 状态机

参与者 UI 状态流转：
```
CHECKIN → WAITING → MATCHED → ENDING → FEEDBACK → WAITING
```

特殊状态：
```
ANY → PAUSED → 恢复到原状态
```

### 实时通信

- 使用 SSE (Server-Sent Events) 进行服务端推送
- REST API 处理 check-in、feedback 等操作
- 支持断线重连和状态恢复

## 开发指南

### 可用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint
```

### 数据库迁移

```bash
# 创建新迁移
supabase migration new migration_name

# 应用迁移
supabase db push

# 重置数据库
supabase db reset
```

## 部署

### 前端部署

推荐使用 Vercel 部署 Next.js 应用：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 数据库部署

推荐使用 Supabase 云服务或其他托管 PostgreSQL 服务。

## 设计原则

### 产品原则
- UI 是流程遥控器，不是社交产品
- 参与者无需学习、无需决策
- 主持人一屏可控全局
- 系统驱动流程，用户不做导航决策

### 技术原则
- 事件驱动 (Event-driven)
- 后端是真相源 (Single Source of Truth)
- 弱网可用、可恢复
- 允许连接断开，但必须可恢复

## 明确不做的功能

- 私聊/聊天功能
- 用户选人功能
- 复杂的个人资料页
- 社交关系图谱

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 文档

- [技术设计文档](README-tech.md) - 详细的技术架构和实现指南
- [API 文档](docs/API.md) (计划中)

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 项目仓库: [https://github.com/entrohub-de/FlowMeet](https://github.com/entrohub-de/FlowMeet)
- 问题反馈: [GitHub Issues](https://github.com/entrohub-de/FlowMeet/issues)

## 致谢

感谢所有为这个项目做出贡献的开发者！

---

**注意**: 本项目目前处于 MVP 开发阶段，部分功能仍在完善中。
