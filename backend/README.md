# 后端目录说明

## 项目结构

```
backend/
├── src/
│   ├── __init__.py
│   ├── main.py                # FastAPI 主应用
│   ├── config.py              # 配置管理
│   ├── types/
│   │   ├── __init__.py
│   │   └── models.py          # Pydantic 模型和枚举
│   ├── services/
│   │   ├── __init__.py
│   │   ├── session_orchestrator.py    # 流程引擎
│   │   ├── matching_engine.py         # 配对引擎
│   │   ├── presence_service.py        # 在线状态
│   │   ├── feedback_service.py        # 反馈服务
│   │   └── realtime_service.py        # SSE 推送
│   └── routes/
│       ├── __init__.py
│       ├── participant.py    # 参与者 API
│       ├── host.py          # 主持人 API
│       └── realtime.py      # SSE 事件流
├── requirements.txt
├── .env.example
└── README.md
```

## 快速开始

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，配置数据库和 Redis

# 运行开发服务器
python -m src.main

# 访问 API 文档
# http://localhost:8000/docs
```

## 核心设计

### 1. 状态机（UIState）
- `CHECKIN`: 签到
- `WAITING`: 等待配对
- `MATCHED`: 对话中
- `ENDING`: 时间即将结束
- `FEEDBACK`: 提交反馈
- `PAUSED`: 暂停（可从任何状态进入）

### 2. 流程引擎（SessionOrchestrator）
- 管理轮次生命周期
- 驱动参与者状态转换
- 唯一的状态修改权限

### 3. 配对引擎（MatchingEngine）
- 贪心算法配对
- 避免本轮重复配对
- 处理奇数落单

### 4. 在线状态（PresenceService）
- 基于 Redis 的 last_seen
- 30 秒无心跳判定为离线
- 支持自动恢复

### 5. 实时推送（RealtimeService）
- SSE（Server-Sent Events）推送
- 异步事件队列
- 支持广播和单播

## API 端点

### Participant API
- `POST /api/participant/checkin` - 签到
- `GET /api/participant/state/{participant_id}` - 获取状态
- `POST /api/participant/feedback` - 提交反馈
- `POST /api/participant/heartbeat` - 心跳

### Host API
- `POST /api/host/round/start` - 开始轮次
- `POST /api/host/round/end` - 结束轮次
- `POST /api/host/round/pause` - 暂停轮次
- `POST /api/host/round/resume` - 恢复轮次
- `GET /api/host/event/{event_id}/status` - 获取事件状态
- `GET /api/host/event/{event_id}/participants` - 获取参与者列表

### Realtime API
- `GET /api/realtime/events/{client_id}` - SSE 事件流

## 事件类型

```
MATCH_ASSIGNED - 配对分配
ROUND_STARTED - 轮次开始
ROUND_ENDED - 轮次结束
ROUND_ENDING_SOON - 轮次即将结束（预警）
EVENT_STATUS_CHANGED - 事件状态变更
RECOVER_STATE - 状态恢复（掉线重连）
```

## 后续实现

- [ ] 数据库模型（SQLAlchemy ORM）
- [ ] 认证和授权（JWT）
- [ ] 错误处理和日志
- [ ] 单元测试和集成测试
- [ ] WebSocket 支持（可选）
- [ ] Docker 容器化
- [ ] CI/CD 流程
