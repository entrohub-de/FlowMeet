# FlowMeet 快速部署指南

这是一个精简的部署指南,让你在 15 分钟内完成部署。

## 准备工作 (5 分钟)

### 1. 创建 Supabase 项目

访问 [https://supabase.com/dashboard](https://supabase.com/dashboard):
1. 点击 **New Project**
2. 填写项目信息,选择区域(推荐: Tokyo/Singapore)
3. 等待项目初始化完成

### 2. 获取 Supabase 配置

进入 **Settings** → **API**,复制:
- **Project URL**: `https://xxxx.supabase.co`
- **anon key**: `eyJhbGciOiJIUzI1NiIs...`

## 部署数据库 (3 分钟)

### 方法 1: 使用 Supabase CLI (推荐)

在项目根目录执行:

```bash
# 链接到云端项目
cd supabase
supabase link --project-ref your_project_id

# 推送数据库迁移
supabase db push
```

找到 `project_id`:
- 在 Supabase Dashboard 的 **Settings** → **General** → **Reference ID**
- 或从 Project URL 中提取: `https://[project_id].supabase.co`

### 方法 2: 手动导入 SQL (备选)

如果 CLI 不可用:
1. 打开 [supabase/migrations/20260127185636_initial_schema.sql](supabase/migrations/20260127185636_initial_schema.sql)
2. 复制全部内容
3. 在 Supabase Dashboard → **SQL Editor** 中执行

## 部署前端到 Vercel (5 分钟)

### 1. 连接 GitHub 仓库

访问 [https://vercel.com/new](https://vercel.com/new):
1. 选择你的 FlowMeet 仓库
2. 点击 **Import**

### 2. 配置项目

**重要**: 设置以下选项:

- **Framework Preset**: Next.js (通常会自动检测)
- **Root Directory**: `frontend` ← 点击 **Edit** 修改为 `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. 配置环境变量

添加两个环境变量:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | 你的 Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你的 Supabase anon key |

确保选择 **All Environments** (Production, Preview, Development)

### 4. 部署

点击 **Deploy** 按钮,等待 2-3 分钟。

部署完成后,你会获得一个 URL: `https://flowmeet-xxx.vercel.app`

## 配置认证回调 (2 分钟)

在 Supabase Dashboard:
1. 进入 **Authentication** → **URL Configuration**
2. 设置:
   - **Site URL**: `https://your-vercel-url.vercel.app`
   - **Redirect URLs**: 添加:
     ```
     https://your-vercel-url.vercel.app/auth/callback
     https://your-vercel-url.vercel.app/**
     ```

## 验证部署

访问你的 Vercel URL,测试:
- ✅ 页面正常加载
- ✅ 可以注册/登录
- ✅ 数据正确保存到数据库

## 问题排查

### 错误: "Invalid API key"
→ 检查 Vercel 环境变量是否正确设置

### 错误: "supabase is not defined"
→ 检查 `frontend/lib/supabase.ts` 是否存在

### 错误: 认证回调失败
→ 检查 Supabase 的 Redirect URLs 配置

### 错误: Vercel 构建失败
→ 确保 Root Directory 设置为 `frontend`

## 后续配置

部署成功后,查看完整的 [DEPLOYMENT.md](DEPLOYMENT.md) 了解:
- 自定义域名配置
- 性能优化建议
- 监控和日志配置
- 数据库迁移工作流

## 一键命令总结

```bash
# 1. 链接 Supabase
cd supabase
supabase link --project-ref YOUR_PROJECT_ID

# 2. 推送数据库
supabase db push

# 3. Vercel 部署(如果安装了 Vercel CLI)
cd ../frontend
vercel --prod
```

完成!🎉
