# 数据库表重命名总结

## 概述
已将数据库表添加领域前缀，以更好地组织和区分不同功能域的表。

## 表名映射

### 事件相关表 (evt_ 前缀)

| 旧表名 | 新表名 | 说明 |
|--------|--------|------|
| `event` | `evt_events` | 活动/事件主表 |
| `session` | `evt_sessions` | 会话表 |
| `area` | `evt_areas` | 区域表 |
| `venue` | `evt_venues` | 场地表 |
| `session_area` | `evt_session_areas` | 会话-区域关联表 |
| `session_assignment` | `evt_assignments` | 会话分配表 |
| `user_roles` | `evt_event_roles` | 活动角色表 |

### 用户相关表 (usr_ 前缀)

| 旧表名 | 新表名 | 说明 |
|--------|--------|------|
| `user_profiles` | `usr_profiles` | 用户资料表 |
| `user_preferences` | `usr_preferences` | 用户偏好设置表 |

## 已修改的文件

### 1. 数据库迁移文件

- **新增**: `supabase/migrations/20260129000000_rename_tables_with_domain_prefix.sql`
  - 重命名所有表
  - 更新所有外键约束
  - 更新所有索引
  - 更新存储函数 `get_user_role`
  - 重新授予权限
  - 重新创建 RLS 策略

- **更新**: `supabase/migrations/20260127185636_initial_schema.sql`
  - 添加注释说明表已被重命名

### 2. TypeScript 代码

#### API 层
- **`frontend/lib/api/events.ts`**
  - ✅ `'events'` → `'evt_events'`

#### 认证相关页面
- **`frontend/app/(public)/login/page.tsx`**
  - ✅ `'user_roles'` → `'evt_event_roles'` (2 处)

- **`frontend/app/(public)/auth/signup/page.tsx`**
  - ✅ `'user_roles'` → `'evt_event_roles'` (1 处)

- **`frontend/app/(public)/auth/callback/page.tsx`**
  - ✅ `'user_roles'` → `'evt_event_roles'` (2 处)

## 迁移步骤

### 开发环境
```bash
# 1. 应用迁移
cd supabase
supabase db push

# 2. 或者如果使用远程数据库
supabase db reset  # 警告：这会清空所有数据！
```

### 生产环境
```bash
# 使用迁移文件逐步应用
supabase db push
```

## 重要说明

1. **向后兼容性**: 此更改不向后兼容，所有引用旧表名的代码都必须更新。

2. **数据保留**: 迁移脚本使用 `RENAME` 操作，会保留所有现有数据。

3. **RLS 策略**: 所有行级安全策略已更新以使用新表名。

4. **外键约束**: 所有外键关系已保持，仅约束名称已更新。

5. **索引**: 所有索引已重建并使用新的命名约定。

## 后续工作

- [ ] 如果有其他服务或脚本引用这些表，需要相应更新
- [ ] 更新任何文档或 API 说明
- [ ] 如果有测试数据或种子文件，需要更新表名
- [ ] 运行完整的测试套件确保功能正常

## 回滚方案

如果需要回滚，可以创建一个反向迁移文件，将表名改回原来的名称。但建议在开发环境充分测试后再应用到生产环境。

## 命名约定

- **evt_**: 事件/活动相关的表
- **usr_**: 用户相关的表
- 表名使用复数形式（如 `evt_events`）以保持一致性
- 关联表使用描述性名称（如 `evt_assignments` 而不是 `evt_session_assignments`）以保持简洁

## 检查清单

- ✅ 数据库迁移文件已创建
- ✅ TypeScript API 调用已更新
- ✅ 存储函数已更新
- ✅ RLS 策略已更新
- ⏳ 测试迁移（待执行）
- ⏳ 验证应用功能（待执行）
