# 前端目录说明

## 项目结构

```
frontend/
├── src/
│   ├── api.js                 # API 客户端封装
│   ├── App.jsx               # 主应用组件
│   ├── main.jsx              # 入口文件
│   ├── index.css             # 全局样式
│   ├── App.css               # 应用容器样式
│   ├── context/
│   │   └── AppContext.jsx    # 全局状态管理
│   ├── hooks/
│   │   ├── useRealtime.js    # SSE 实时事件 Hook
│   │   └── useCountdown.js   # 倒计时 Hook
│   └── pages/
│       ├── CheckInPage.jsx   # 签到页面
│       ├── CheckInPage.css
│       ├── WaitingPage.jsx   # 等待配对页面
│       ├── WaitingPage.css
│       ├── MatchedPage.jsx   # 对话中页面
│       ├── MatchedPage.css
│       ├── FeedbackPage.jsx  # 反馈页面
│       ├── FeedbackPage.css
│       ├── HostConsole.jsx   # 主持人控制台
│       └── HostConsole.css
├── index.html
├── vite.config.js
└── package.json
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（默认 3000 端口）
npm run dev

# 打包生产
npm run build

# 预览生产版本
npm run preview
```

## 核心特性

1. **状态管理**：AppContext 管理全局状态（用户、事件、参与者状态）
2. **实时通信**：useRealtime Hook 订阅 SSE 事件，自动处理状态更新
3. **倒计时**：useCountdown Hook 基于绝对时间戳 ends_at 计算，避免时间不同步
4. **API 客户端**：统一的 API 层，支持 Participant 和 Host 两种角色
5. **响应式设计**：适配手机和平板

## 后续实现

- [ ] 身份认证和授权
- [ ] 本地数据缓存和离线支持
- [ ] 性能优化（代码分割、懒加载）
- [ ] 国际化支持
- [ ] 移动端适配优化
