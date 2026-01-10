# FlowMeet
FlowMeet helps you run smooth, human-friendly networking events — without over-hosting.

https://github.com/entrohub-de/FlowMeet.git

# Networking 活动系统 · 技术设计文档（MVP）

> 面向 AI Coder / 工程实现
>
> 目标：在 50–200 人线下 networking 活动中，实现自动配对 + 节奏控制 + 弱网可恢复，并将主持人操作成本降到最低。

---

## 0. 文档目的

本系统用于线下 Networking 活动，通过技术手段分担主持人的组织、配对与节奏控制工作。

本技术文档用于：

* 约束系统架构与状态机
* 指导 AI Coder / 工程同事实现
* 明确 MVP 边界（避免功能膨胀）

---

## 1. 总体设计原则（必须遵守）

### 1.1 产品原则

* UI 是流程遥控器，不是社交产品
* 参与者无需学习、无需决策
* 主持人一屏可控全局
* 系统驱动流程，用户不做导航决策

### 1.2 技术原则

* 事件驱动（Event-driven）
* 后端是真相源（Single Source of Truth）
* 弱网可用、可恢复
* 允许连接断开，但必须可恢复

---

## 2. 系统总体架构（MVP）

```
前端用react，后端用FastAPI

Web Client
 ├─ Participant Web（手机）
 ├─ Host Console（Pad / PC）
 └─ Optional Display（大屏）

Backend（单体优先）
 ├─ REST API
 ├─ Realtime Push（SSE / WebSocket）
 ├─ Session Orchestrator（流程引擎）
 ├─ Matching Engine（配对）
 ├─ Presence Service（在线状态）
 └─ Feedback Service

Data Layer
 ├─ PostgreSQL（主数据）
 └─ Redis（临时状态 / 在线 / 计时）
```

---

## 3. 通信模型

### 3.1 是否必须长连接

* 不强制 WebSocket
* 必须支持服务端主动推送

### 3.2 推荐方案（MVP）

* SSE（Server-Sent Events）作为主推送通道
* REST 用于 check-in、feedback、状态兜底

---

## 4. 状态机设计

### 4.1 参与者 UI 状态机

```
CHECKIN → WAITING → MATCHED → ENDING → FEEDBACK → WAITING
```

特殊状态：

```
ANY → PAUSED → 回到原状态
```

### 4.2 后端下发字段

* ui_state
* round_id
* match_partner
* ends_at（绝对时间戳）

---

## 5. 倒计时设计

* 后端不推秒级倒计时
* 只下发 ends_at
* 客户端本地计算

---

## 6. Realtime 事件协议

### 后端 → 客户端

* EVENT_STATUS_CHANGED
* ROUND_STARTED
* MATCH_ASSIGNED
* ROUND_ENDING_SOON
* ROUND_ENDED
* RECOVER_STATE

### 客户端 → 后端

* CHECKIN_SUBMIT
* FEEDBACK_SUBMIT

---

## 7. 耗电与性能约束

禁止：

* 每秒推送
* 高频心跳
* 大 payload

推荐：

* 仅状态变化推送
* 心跳 ≥ 15s
* visibilitychange 控制刷新

---

## 8. Matching Engine（v1）

硬约束：

* 本轮不重复
* 最近 N 轮尽量不重复
* 尽量避免奇数落单

实现要求：

* 贪心即可
* < 1s 完成

---

## 9. Presence

* Redis 记录 last_seen
* 超过 30s 视为 offline

---

## 10. 主持人权限

* start / end round
* pause / resume
* force repair

约束：

* 所有操作写 HostAction
* 仅 Orchestrator 可改状态

---

## 11. 部署建议

* Frontend：CDN
* Backend：容器服务
* DB：托管 PostgreSQL
* Cache：托管 Redis

---

## 12. 明确不做

* 私聊 / 聊天
* 用户选人
* 复杂资料页
* 社交关系图

---

## 13. 成功标准

* 主持人一次操作，全场同步
* 掉线可恢复
* 网络抖动不影响轮次

---

## 14. 技术总结

这是一个事件驱动的流程控制系统，不是社交 App。
优先级：状态机正确 > 可恢复实时 > 简单可靠 > 再谈优化。
