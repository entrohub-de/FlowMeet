# FlowMeet 部署指南

本文档详细说明如何将 FlowMeet 项目部署到云端。

## 架构概览

- **前端**: Next.js 应用部署到 Vercel
- **后端/数据库**: Supabase 云服务
- **实时通信**: Supabase Realtime (WebSocket)
- **认证**: Supabase Auth

## 前置要求

- [Supabase](https://supabase.com) 账号
- [Vercel](https://vercel.com) 账号
- [Supabase CLI](https://supabase.com/docs/guides/cli) (用于数据库迁移)
- Git 仓库已推送到 GitHub/GitLab/Bitbucket

## 步骤 1: 设置 Supabase 云端项目

### 1.1 创建或使用现有 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 如果还没有项目,点击 **New Project** 创建新项目
3. 填写项目信息:
   - **Name**: FlowMeet (或你喜欢的名称)
   - **Database Password**: 设置一个强密码(请妥善保存)
   - **Region**: 选择离你用户最近的区域(建议: 东京 `ap-northeast-1` 或新加坡 `ap-southeast-1`)
4. 点击 **Create new project**,等待项目初始化完成(约 2 分钟)

### 1.2 获取 Supabase 配置信息

项目创建完成后:

1. 进入 **Settings** → **API**
2. 复制以下信息(后续会用到):
   ```
   Project URL: https://xxxxxxxxxxxx.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 1.3 链接本地项目到云端

在项目根目录下执行:

```bash
cd supabase
supabase link --project-ref your_project_id
```

你可以在 Supabase Dashboard 的 **Settings** → **General** 中找到 `project_id`。

## 步骤 2: 迁移数据库到云端

### 2.1 推送数据库迁移

将本地生成的数据库结构推送到 Supabase 云端:

```bash
cd supabase
supabase db push
```

这会将 `supabase/migrations/20260127185636_initial_schema.sql` 中的表结构应用到云端数据库。

### 2.2 验证数据库迁移

1. 访问 Supabase Dashboard
2. 进入 **Table Editor**
3. 确认以下表已成功创建:
   - `area`
   - `event`
   - `session`
   - `session_area`
   - `user_profile`
   - `participant`
   - `match`

### 2.3 配置数据库认证和授权

在 Supabase Dashboard 中:

1. 进入 **Authentication** → **Providers**
2. 启用 **Email** 认证
3. 配置 **Site URL** 和 **Redirect URLs**(步骤 4 完成后更新)

## 步骤 3: 配置 Vercel 部署

### 3.1 连接 Git 仓库到 Vercel

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New** → **Project**
3. 选择你的 Git 仓库 (FlowMeet)
4. 点击 **Import**

### 3.2 配置项目设置

在 Vercel 项目设置页面:

- **Framework Preset**: Next.js
- **Root Directory**: `frontend` (重要!)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3.3 配置环境变量

在 **Environment Variables** 区域添加:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 你的 Supabase Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你的 Supabase anon key | Production, Preview, Development |

**重要**: 从步骤 1.2 获取这些值。

### 3.4 部署

点击 **Deploy** 开始首次部署。Vercel 会:
- 从 Git 仓库拉取代码
- 安装依赖
- 构建 Next.js 应用
- 部署到全球 CDN

部署完成后,你会获得一个 URL,例如: `https://flowmeet.vercel.app`

## 步骤 4: 配置生产环境 URL

### 4.1 更新 Supabase 认证配置

1. 访问 Supabase Dashboard → **Authentication** → **URL Configuration**
2. 更新以下设置:
   - **Site URL**: `https://your-domain.vercel.app` (你的 Vercel 部署 URL)
   - **Redirect URLs**: 添加以下 URL:
     ```
     https://your-domain.vercel.app/auth/callback
     https://your-domain.vercel.app/**
     ```

### 4.2 配置 Next.js 认证回调

确认 [`frontend/app/(public)/auth/callback/page.tsx`](frontend/app/(public)/auth/callback/page.tsx) 文件存在并正确处理认证回调。

## 步骤 5: 测试部署

### 5.1 测试前端访问

访问你的 Vercel URL: `https://your-domain.vercel.app`

确认:
- 页面正常加载
- 没有控制台错误
- 可以正常注册/登录

### 5.2 测试数据库连接

1. 尝试注册新用户
2. 检查 Supabase Dashboard → **Authentication** → **Users** 中是否有新用户
3. 检查 **Table Editor** 中 `user_profile` 表是否有对应记录

### 5.3 测试实时功能

如果应用使用了 Supabase Realtime:
- 打开两个浏览器窗口
- 测试实时数据同步是否正常工作

## 步骤 6: 配置自定义域名 (可选)

### 6.1 在 Vercel 配置域名

1. 进入 Vercel 项目 → **Settings** → **Domains**
2. 添加你的自定义域名
3. 按照提示配置 DNS 记录

### 6.2 更新 Supabase 认证 URL

将步骤 4.1 中的 URL 更新为自定义域名。

## 步骤 7: 配置生产环境优化 (可选)

### 7.1 配置 Vercel 性能优化

在 `frontend/next.config.js` 中:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 启用图片优化
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
  // 启用 SWC 压缩
  swcMinify: true,
};

export default nextConfig;
```

### 7.2 配置 Supabase 性能优化

1. 启用 **Database** → **Connection Pooling** (推荐 Transaction 模式)
2. 配置 **Database** → **Indexes** 优化查询性能
3. 启用 **Storage** 如果需要文件上传功能

### 7.3 配置监控和日志

在 Vercel:
- 启用 **Integrations** → **Vercel Analytics**
- 配置 **Monitoring** 查看性能指标

在 Supabase:
- 查看 **Reports** → **Database** 监控数据库性能
- 配置 **API** → **Logs** 查看实时日志

## 持续部署

配置完成后,每次推送代码到 Git 主分支时:
1. Vercel 会自动触发部署
2. 新版本会在几分钟内上线
3. 数据库迁移需要手动执行 `supabase db push`

## 数据库迁移工作流

当需要修改数据库结构时:

```bash
# 1. 在本地修改数据库
# 2. 生成迁移文件
cd supabase
supabase db diff -f your_migration_name

# 3. 测试迁移
supabase db reset

# 4. 推送到云端
supabase db push
```

## 回滚

如果部署出现问题:

### 前端回滚
1. 访问 Vercel Dashboard
2. 进入 **Deployments**
3. 选择之前的部署版本
4. 点击 **Promote to Production**

### 数据库回滚
数据库迁移较难回滚,建议:
1. 在生产环境部署前在测试项目中验证
2. 做好数据备份
3. 使用 Supabase 的 **Database** → **Backups** 功能

## 故障排查

### 前端无法连接到 Supabase

检查:
- Vercel 环境变量是否正确设置
- Supabase URL 是否正确
- 网络是否可以访问 Supabase

### 认证回调失败

检查:
- Supabase 认证配置中的 Redirect URLs
- 回调页面是否正确实现
- 浏览器控制台错误信息

### 数据库迁移失败

检查:
- 迁移文件 SQL 语法
- 是否有表依赖问题
- Supabase 数据库日志

## 安全建议

1. **环境变量**: 永远不要将 Supabase URL 和密钥提交到 Git
2. **RLS (Row Level Security)**: 确保所有表都启用了 RLS 并配置了正确的策略
3. **API 密钥**: 只在前端使用 `anon` key,永远不要暴露 `service_role` key
4. **HTTPS**: 确保生产环境使用 HTTPS
5. **CORS**: 在 Supabase 中配置允许的域名

## 成本优化

- Supabase 免费套餐: 500MB 数据库,每月 2GB 传输
- Vercel 免费套餐: 100GB 带宽,无限部署
- 监控使用量并根据需要升级

## 支持

遇到问题?
- [Supabase 文档](https://supabase.com/docs)
- [Vercel 文档](https://vercel.com/docs)
- [项目 Issues](https://github.com/entrohub-de/FlowMeet/issues)

---

部署完成!你的 FlowMeet 应用现在已经在云端运行了 🚀
