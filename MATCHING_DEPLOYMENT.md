# 1v1配对功能部署指南

本文档说明如何部署和配置1v1智能配对功能。

## 概述

1v1配对功能包括：
- **后端智能匹配算法**：通过 Supabase Edge Function 实现
- **数据库表**：`matches` 和 `match_preferences`
- **前端界面**：配对推荐和管理

## 架构设计

### 后端 API
- **Edge Function**: `get-match-recommendations`
  - 位置：`supabase/functions/get-match-recommendations/`
  - 功能：根据用户资料计算匹配分数，返回排序后的推荐列表
  - 优点：
    - ✅ 保护用户隐私（不暴露完整资料给客户端）
    - ✅ 服务端计算，性能更好
    - ✅ 算法集中管理，易于优化
    - ✅ 可扩展（未来可接入 AI 模型）

### 数据库表
1. **evt_matches**：存储配对关系
   - `match_id`：配对ID
   - `event_id`：活动ID（引用 evt_events）
   - `user1_id`, `user2_id`：配对双方
   - `status`：状态（pending/accepted/declined/completed）

2. **evt_match_preferences**：存储用户配对偏好
   - `preference_id`：偏好ID
   - `event_id`：活动ID（引用 evt_events）
   - `user_id`：用户ID
   - `preferred_topics`, `availability`, `notes`：偏好信息

**注意**：项目使用领域前缀命名规范：
- `evt_` 前缀：活动相关表
- `usr_` 前缀：用户相关表

## 部署步骤

### 1. 应用数据库迁移

```bash
# 进入项目根目录
cd /path/to/flowmeet-org

# 应用迁移（创建 matches 和 match_preferences 表）
supabase db push
```

### 2. 部署 Edge Function

```bash
# 部署匹配推荐函数
supabase functions deploy get-match-recommendations

# 验证部署
supabase functions list
```

### 3. 配置环境变量

Edge Function 会自动获取以下环境变量（无需手动配置）：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 4. 测试 Edge Function

使用 curl 测试：

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/get-match-recommendations \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"eventId": "your-event-id"}'
```

### 5. 前端配置

前端代码已经更新为调用 Edge Function，无需额外配置。

确保 `frontend/lib/supabase/client.ts` 中的 Supabase 配置正确：

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

## 匹配算法说明

### 计分维度（总分100分）

1. **年龄段匹配** (15分)
   - 相同年龄段：15分
   - 相邻年龄段：8分

2. **语言能力** (20分)
   - 每个共同语言：10分（最多20分）

3. **兴趣领域** (25分)
   - 每个共同兴趣：8分（最多25分）

4. **参会目的** (20分)
   - 每个共同目的：10分（最多20分）

5. **行业背景** (20分)
   - 相似行业：10-20分
   - 不同行业（跨界）：5分

### 匹配等级

- **高度匹配** (70-100分)：强烈推荐
- **较好匹配** (50-69分)：推荐
- **一般匹配** (30-49分)：可考虑
- **低匹配度** (0-29分)：较少共同点

## 本地开发

### 启动本地 Supabase

```bash
supabase start
```

### 本地测试 Edge Function

```bash
# 启动函数服务
supabase functions serve get-match-recommendations

# 测试
curl -X POST \
  http://localhost:54321/functions/v1/get-match-recommendations \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"eventId": "test-event-id"}'
```

## 监控和日志

### 查看函数日志

```bash
supabase functions logs get-match-recommendations
```

### 监控指标

在 Supabase Dashboard 中查看：
- 函数调用次数
- 响应时间
- 错误率

## 故障排查

### 问题1：函数返回空数组

**可能原因：**
- 没有已签到的用户
- 所有用户都已配对
- 用户没有填写个人资料

**解决方案：**
1. 检查数据库中是否有 evt_assignments 记录（checked_in = true）
2. 检查 session_flows 和 evt_events 表数据
3. 检查 usr_profiles 表是否有数据
4. 查看函数日志

### 问题2：前端调用失败

**可能原因：**
- 用户未登录
- CORS 配置问题
- 函数未部署

**解决方案：**
1. 确认用户已登录
2. 检查浏览器控制台错误
3. 验证函数已部署：`supabase functions list`

### 问题3：匹配分数计算不准确

**解决方案：**
1. 检查用户是否填写了完整的 preferences
2. 调整算法权重（修改 Edge Function 代码）
3. 重新部署函数

## 性能优化

### 1. 缓存推荐结果

可以在前端或后端添加缓存逻辑：

```typescript
// 示例：前端缓存5分钟
const cacheKey = `recommendations-${eventId}`
const cached = localStorage.getItem(cacheKey)
if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
  return cached.data
}
```

### 2. 数据库索引

迁移文件中已包含必要的索引：
- `idx_evt_matches_event_id`
- `idx_evt_matches_user1_id`
- `idx_evt_matches_user2_id`
- `idx_evt_matches_status`

### 3. 限制推荐数量

在 Edge Function 中添加限制：

```typescript
const recommendations = availableUsers
  .map(user => calculateMatchScore(currentUser, user))
  .sort((a, b) => b.score - a.score)
  .slice(0, 20) // 只返回前20个推荐
```

## 未来改进

### 1. 机器学习推荐

可以收集用户的配对反馈，训练 ML 模型：
- 哪些推荐被接受
- 哪些配对最终完成交流
- 用户偏好模式

### 2. 实时通知

使用 Supabase Realtime 发送配对请求通知：
```typescript
supabase
  .channel('matches')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'matches',
    filter: `user2_id=eq.${userId}`
  }, handleNewMatch)
  .subscribe()
```

### 3. 配对偏好学习

根据用户的历史配对行为，动态调整推荐权重。

## 安全注意事项

1. **RLS 策略**：迁移文件中已包含 Row Level Security 策略
2. **数据脱敏**：Edge Function 只返回必要的公开信息
3. **认证验证**：所有 API 调用都需要验证 JWT Token

## 联系和支持

如有问题，请参考：
- [Supabase Edge Functions 文档](https://supabase.com/docs/guides/functions)
- [项目 Issue Tracker](https://github.com/your-repo/issues)
