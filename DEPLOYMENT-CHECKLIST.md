# FlowMeet 部署检查清单

使用这个清单确保部署过程顺利完成,不遗漏任何关键步骤。

## 🗂️ 准备阶段

- [ ] Git 仓库已推送到 GitHub/GitLab/Bitbucket
- [ ] 拥有 Supabase 账号 (https://supabase.com)
- [ ] 拥有 Vercel 账号 (https://vercel.com)
- [ ] 安装了 Supabase CLI: `npm install -g supabase`
- [ ] 安装了 Vercel CLI (可选): `npm install -g vercel`

## 📊 Supabase 设置

### 创建项目
- [ ] 访问 Supabase Dashboard
- [ ] 创建新项目或使用现有项目
- [ ] 选择合适的区域 (推荐: Tokyo/Singapore)
- [ ] 设置强密码并保存

### 获取配置
- [ ] 进入 Settings → API
- [ ] 复制 Project URL: `https://xxxx.supabase.co`
- [ ] 复制 anon/public key
- [ ] 保存这些信息到安全的地方

### 链接本地项目
- [ ] 在 Settings → General 中找到 Project Reference ID
- [ ] 执行: `cd supabase && supabase link --project-ref YOUR_PROJECT_ID`
- [ ] 验证链接成功

## 🗄️ 数据库迁移

- [ ] 迁移文件已生成: `supabase/migrations/20260127185636_initial_schema.sql`
- [ ] 执行: `supabase db push`
- [ ] 验证推送成功 (无错误信息)
- [ ] 在 Supabase Dashboard → Table Editor 中确认表已创建:
  - [ ] area
  - [ ] event
  - [ ] session
  - [ ] session_area
  - [ ] user_profile
  - [ ] participant
  - [ ] match

## 🔐 认证配置

- [ ] 进入 Authentication → Providers
- [ ] 启用 Email 认证
- [ ] 配置 Email 模板 (可选,使用默认即可)

## 🚀 Vercel 部署

### 导入项目
- [ ] 访问 Vercel Dashboard
- [ ] 点击 Add New → Project
- [ ] 选择 FlowMeet Git 仓库
- [ ] 点击 Import

### 配置设置
- [ ] Framework Preset: Next.js (自动检测)
- [ ] **Root Directory**: 修改为 `frontend`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm install`

### 环境变量
- [ ] 添加 `NEXT_PUBLIC_SUPABASE_URL` (从 Supabase 获取)
- [ ] 添加 `NEXT_PUBLIC_SUPABASE_ANON_KEY` (从 Supabase 获取)
- [ ] 确保选择了 All Environments (Production, Preview, Development)

### 部署
- [ ] 点击 Deploy
- [ ] 等待构建完成 (2-3 分钟)
- [ ] 构建成功,获得 Vercel URL
- [ ] 保存 Vercel URL: `https://your-app.vercel.app`

## 🔗 认证回调配置

- [ ] 回到 Supabase Dashboard
- [ ] 进入 Authentication → URL Configuration
- [ ] 设置 Site URL: `https://your-app.vercel.app`
- [ ] 添加 Redirect URLs:
  - [ ] `https://your-app.vercel.app/auth/callback`
  - [ ] `https://your-app.vercel.app/**`
- [ ] 保存配置

## ✅ 测试验证

### 前端测试
- [ ] 访问 Vercel URL
- [ ] 页面正常加载,无白屏
- [ ] 打开浏览器控制台,无严重错误
- [ ] 样式正常显示

### 认证测试
- [ ] 尝试注册新用户
- [ ] 收到确认邮件 (或根据配置跳过确认)
- [ ] 能够成功登录
- [ ] 登录后跳转正确

### 数据库测试
- [ ] 在 Supabase Dashboard → Authentication → Users 中查看新用户
- [ ] 在 Table Editor → user_profile 中查看用户资料
- [ ] 数据正确保存

### 实时功能测试 (如果使用)
- [ ] 打开两个浏览器窗口/标签页
- [ ] 测试实时数据同步
- [ ] 确认 WebSocket 连接正常

## 🔧 优化配置 (可选但推荐)

### Supabase 优化
- [ ] 启用 Database → Connection Pooling
- [ ] 查看 Database → Performance 优化建议
- [ ] 配置 Database → Indexes (如果需要)

### Vercel 优化
- [ ] 启用 Vercel Analytics
- [ ] 配置 Environment Variables for Preview 分支
- [ ] 设置 Git Integration 自动部署

### 监控设置
- [ ] 在 Vercel 设置错误通知
- [ ] 在 Supabase 查看 API Logs
- [ ] 测试监控是否正常工作

## 📱 自定义域名 (可选)

- [ ] 在 Vercel → Settings → Domains 添加域名
- [ ] 配置 DNS 记录 (A/CNAME)
- [ ] 等待 SSL 证书生成
- [ ] 在 Supabase 更新认证 URL 为自定义域名

## 📝 文档和备份

- [ ] 将 Supabase 配置信息保存到密码管理器
- [ ] 将 Vercel 部署 URL 记录到文档
- [ ] 在 Supabase → Database → Backups 确认自动备份已启用
- [ ] 创建部署日志/笔记

## 🛡️ 安全检查

- [ ] `.env.local` 在 `.gitignore` 中
- [ ] 没有将 Supabase 密钥提交到 Git
- [ ] 所有表启用了 RLS (Row Level Security)
- [ ] 配置了正确的 RLS 策略
- [ ] 生产环境使用 HTTPS
- [ ] 检查 Supabase API 限流设置

## 📊 成本优化

- [ ] 查看 Supabase 使用量配额
- [ ] 查看 Vercel 带宽使用情况
- [ ] 评估是否需要升级套餐
- [ ] 设置使用量警报 (如果支持)

## 🎉 上线

- [ ] 所有测试通过
- [ ] 团队成员已通知
- [ ] 文档已更新
- [ ] 监控系统已设置
- [ ] 备份策略已确认

## 📞 问题处理

如果遇到问题,按以下顺序排查:

1. **Vercel 构建失败**
   - 检查 Root Directory 是否设置为 `frontend`
   - 查看构建日志错误信息
   - 验证 `package.json` 中的依赖

2. **无法连接 Supabase**
   - 验证环境变量是否正确
   - 检查 Supabase 项目是否暂停
   - 查看浏览器控制台错误

3. **认证失败**
   - 检查 Redirect URLs 配置
   - 验证 anon key 是否正确
   - 查看 Supabase Auth Logs

4. **数据库错误**
   - 查看 Supabase Database Logs
   - 验证 RLS 策略
   - 检查迁移是否正确应用

## 🔄 持续部署

配置完成后:
- [ ] 推送到主分支会自动触发 Vercel 部署
- [ ] 设置 Git 保护规则 (可选)
- [ ] 配置 Preview 部署用于测试

## 📚 参考资源

- [Supabase 文档](https://supabase.com/docs)
- [Vercel 文档](https://vercel.com/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [项目完整部署文档](DEPLOYMENT.md)
- [快速部署指南](QUICKSTART-DEPLOY.md)

---

**恭喜!** 完成所有检查项后,你的 FlowMeet 应用已经成功部署到云端! 🎊
