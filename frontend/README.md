# FlowMeet Frontend

Next.js 前端应用，集成 Supabase 认证功能。

## 项目结构

```
frontend/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── page.tsx          # 登录页面
│   │   │   └── login.module.css   # 登录页样式
│   │   └── signup/
│   │       ├── page.tsx           # 注册页面
│   │       └── signup.module.css   # 注册页样式
│   ├── layout.tsx                 # 根布局
│   ├── page.tsx                   # 主页
│   ├── page.module.css            # 主页样式
│   └── globals.css                # 全局样式
├── lib/
│   └── supabase.ts               # Supabase 客户端配置
├── package.json                   # 项目依赖
├── tsconfig.json                  # TypeScript 配置
├── next.config.js                 # Next.js 配置
├── .env.local                     # 环境变量（本地）
└── .gitignore                     # Git 忽略文件
```

## 功能特性

### ✅ 注册功能 (Auth/Signup)
- 邮箱和密码输入
- 表单验证
  - 邮箱格式校验
  - 密码长度校验（至少 6 个字符）
  - 密码一致性校验
- 使用 Supabase Auth 的 `signUp` 方法
- 错误处理和用户提示
- 成功注册后跳转到登录页

### ✅ 登录功能 (Auth/Login)
- 邮箱和密码输入
- 表单验证
- 使用 Supabase Auth 的 `signInWithPassword` 方法
- 错误处理和用户提示
- 注册成功提示

### ✅ 主页 (Home)
- 欢迎页面
- 快速导航到注册和登录页面

## 安装和运行

### 前提条件
- Node.js 18+
- npm 或 yarn
- 运行中的 Supabase 本地实例

### 安装依赖

```bash
cd frontend
npm install
# 或
yarn install
```

### 开发环境

```bash
npm run dev
# 或
yarn dev
```

应用将在 http://localhost:3000 启动。

### 生产环境

```bash
npm run build
npm start
# 或
yarn build
yarn start
```

### 代码检查

```bash
npm run lint
# 或
yarn lint
```

## 环境变量

创建 `.env.local` 文件（已包含），配置以下变量：

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

**注意**：`NEXT_PUBLIC_` 前缀表示这些变量在浏览器中可用。

## 技术栈

- **Next.js 14** - React 框架
- **React 18** - UI 库
- **TypeScript** - 类型安全
- **Supabase** - 后端即服务 (BaaS)
- **CSS Modules** - 样式隔离

## API 集成

### Supabase Auth

#### 注册
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
```

#### 登录
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

## 页面路由

- `/` - 主页
- `/auth/signup` - 注册页面
- `/auth/login` - 登录页面

## 样式设计

- 现代化渐变背景
- 响应式设计（移动端优化）
- 表单验证反馈
- 平滑动画过渡
- 无障碍设计考虑

## 下一步改进

- [ ] 邮箱确认流程
- [ ] 忘记密码功能
- [ ] 用户资料管理
- [ ] 社交登录集成
- [ ] 两因素认证 (2FA)
- [ ] 会话管理
- [ ] 用户权限管理

## 常见问题

**Q: Supabase 连接失败？**
A: 确保 Supabase 本地实例正在运行 (`supabase start`)，并检查环境变量是否正确设置。

**Q: 端口 3000 已被占用？**
A: 使用 `npm run dev -- -p 3001` 指定不同的端口。

## 许可证

MIT
