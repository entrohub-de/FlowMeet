# FlowMeet

**FlowMeet helps you run smooth, human-friendly networking events — without over-hosting.**

一个专业的线下 Networking 活动管理系统，通过自动配对、节奏控制和弱网可恢复技术，降低主持人操作成本。

🌐 **GitHub**: https://github.com/entrohub-de/FlowMeet.git

---

## 📋 快速开始

### 系统要求

- **后端**：Python 3.8+
- **前端**：Node.js 18+ 和 npm/yarn
- **数据库**：PostgreSQL 12+（可选，开发用 SQLite）
- **缓存**：Redis 6+（可选，开发用内存）

### 项目结构

```
FlowMeet/
├── backend/              # FastAPI 后端
│   ├── src/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── types/
│   │   ├── services/
│   │   └── routes/
│   ├── requirements.txt
│   └── .env.example
├── frontend/             # React 前端
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 启动指南

### 1️⃣ 后端启动

#### 第一步：安装依赖

```bash
cd backend
pip install -r requirements.txt
```

#### 第二步：配置环境

```bash
# 复制配置模板
cp .env.example .env
python -m venv venv
.\venv\Scripts\Activate.ps1

# 编辑 .env 文件
# 重要配置项：
# - DATABASE_URL: PostgreSQL 连接（开发可用 SQLite）
# - REDIS_URL: Redis 连接
# - HOST: 服务器地址（默认 0.0.0.0）
# - PORT: 服务器端口（默认 8000）
```

**最小化配置示例**（开发环境）：

```bash
# .env
DATABASE_URL=sqlite:///./flowmeet.db
REDIS_URL=memory://
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

#### 第三步：启动服务器

```bash
# 开发模式
python -m src.main

# 或使用 uvicorn 直接运行
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

✅ **服务器启动成功**：
- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

---

### 2️⃣ 前端启动

#### 第一步：安装依赖

```bash
cd frontend
npm install
```

#### 第二步：启动开发服务器

```bash
npm run dev
```

✅ **前端启动成功**：
- 本地开发：http://localhost:3000
- 自动代理到后端 API：`/api/*` → `http://localhost:8000/api/*`

#### 第三步：打包生产

```bash
npm run build      # 生成 dist 目录
npm run preview    # 预览生产版本
```

---

## 🏗️ 完整启动示例

### 方案 A：分别启动（推荐开发）

**终端 1 - 后端**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m src.main
# 输出: INFO:     Uvicorn running on http://0.0.0.0:8000
```

**终端 2 - 前端**
```bash
cd frontend
npm install
npm run dev
# 输出: VITE v5.0.8  ready in 500 ms
#       ➜  Local:   http://localhost:3000/
```

### 方案 B：Docker Compose（推荐生产）

```yaml
# docker-compose.yml（待实现）
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: flowmeet
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/flowmeet
      REDIS_URL: redis://redis:6379/0
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## 📖 使用说明

### 参与者流程（手机端）

1. **签到**：输入名字，系统生成参与者 ID
2. **等待**：等待主持人开始轮次和配对
3. **对话**：与配对的参与者进行 2 分钟对话
4. **反馈**：提交对话反馈（1-5 星评分）
5. **循环**：回到等待，进入下一轮

### 主持人流程（Pad/PC）

1. **打开控制台**：访问 `http://localhost:3000?role=host`
2. **监控参与者**：实时查看在线和签到人数
3. **开始轮次**：设置时长（默认 120s），点击"开始轮次"
   - 系统自动配对参与者
   - 参与者收到配对信息
4. **轮次控制**：
   - **暂停**：冻结倒计时
   - **恢复**：继续计时
   - **结束**：参与者进入反馈
5. **观察数据**：参与人数、在线状态、配对信息

---

## 🔧 API 端点速查

### 参与者 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/participant/checkin` | 签到 |
| GET | `/api/participant/state/{id}` | 获取状态 |
| POST | `/api/participant/feedback` | 提交反馈 |
| POST | `/api/participant/heartbeat` | 心跳 |

### 主持人 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/host/round/start` | 开始轮次 |
| POST | `/api/host/round/end` | 结束轮次 |
| POST | `/api/host/round/pause` | 暂停轮次 |
| POST | `/api/host/round/resume` | 恢复轮次 |
| GET | `/api/host/event/{id}/status` | 事件状态 |
| GET | `/api/host/event/{id}/participants` | 参与者列表 |

### 实时 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/realtime/events/{client_id}` | SSE 事件流 |

---

## 🛠️ 故障排查

### 后端问题

**问题**：`ModuleNotFoundError: No module named 'src'`
```bash
# 解决：在项目根目录运行或检查 Python 路径
cd backend
python -m src.main
```

**问题**：`Redis connection refused`
```bash
# 解决：启动 Redis（开发用内存存储替代）
# Windows: redis-server
# 或修改 .env: REDIS_URL=memory://
```

**问题**：`PostgreSQL connection error`
```bash
# 解决：使用 SQLite 替代（开发环境）
# .env: DATABASE_URL=sqlite:///./flowmeet.db
```

### 前端问题

**问题**：`Port 3000 already in use`
```bash
# 解决：改用其他端口
npm run dev -- --port 3001
```

**问题**：`API 连接失败`
```bash
# 检查：后端是否正常运行
curl http://localhost:8000/health
# 应返回: {"status":"healthy","service":"FlowMeet API"}
```

---

## 📚 技术文档

- [后端架构文档](./backend/README.md) - 服务、状态机、API 设计
- [前端架构文档](./frontend/README.md) - 组件、Hooks、状态管理
- [技术设计文档](./README-Tech.md) - MVP 约束和系统设计

---

## ✨ 核心特性

✅ **状态机驱动**：严格的参与者状态流转  
✅ **自动配对**：贪心算法 + 历史记忆  
✅ **实时推送**：SSE 轻量级推送（无 WebSocket）  
✅ **弱网可恢复**：心跳检测 + 状态快照  
✅ **主持人友好**：一屏全局控制  
✅ **客户端倒计时**：避免服务端秒级推送  

---

## 🎯 开发路线图

### ✅ MVP（已实现）
- [x] 状态机设计
- [x] 基础 API 框架
- [x] 前端页面流程
- [x] SSE 实时通信
- [x] 配对引擎
- [x] 在线状态管理

### 📋 下一阶段
- [ ] 数据库模型（SQLAlchemy ORM）
- [ ] 身份认证（JWT）
- [ ] 完整的错误处理
- [ ] 单元和集成测试
- [ ] Docker 容器化
- [ ] 性能优化
- [ ] WebSocket 支持（可选）

---

## 📝 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 💬 问题反馈

遇到问题？请查看：
1. [后端 README](./backend/README.md#后续实现)
2. [前端 README](./frontend/README.md#后续实现)
3. [技术设计文档](./README-Tech.md)
