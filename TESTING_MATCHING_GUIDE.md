# 配对功能测试指南

本指南帮助你快速准备测试数据，以便查看配对卡片和位置功能的效果。

## 方法一：通过应用UI创建测试数据（推荐）

### 步骤1：创建两个测试账号

1. 打开浏览器（建议使用无痕模式或不同浏览器）
2. 访问 `http://localhost:3000/auth/signup`
3. 创建第一个账号：
   - 邮箱：`test1@example.com`
   - 密码：`Test123456`
4. 登录后，完善个人资料：
   - 昵称：`测试用户A`
   - 性别：男
   - 年龄段：25-34
   - 语言：中文,英文
   - 兴趣：技术,创业
   - 目的：社交,学习
   - 行业：互联网

5. 退出登录，创建第二个账号（另一个浏览器或无痕模式）：
   - 邮箱：`test2@example.com`
   - 密码：`Test123456`
   - 昵称：`测试用户B`
   - 性别：女
   - 年龄段：25-34
   - 其他信息类似

### 步骤2：创建测试活动（需要Host权限）

1. 以管理员身份登录
2. 访问 `/host` 页面
3. 创建新活动：
   - 名称：`测试配对活动`
   - 描述：`用于测试配对和位置功能`
   - 时间：选择今天或明天
   - 场地：可选

### 步骤3：让测试用户报名并签到

1. 用账号1登录，访问 `/user/signup`
2. 报名刚创建的测试活动
3. 访问 `/user/checkin`，完成签到
4. 退出，用账号2重复上述步骤

### 步骤4：创建配对

1. 用账号1登录，访问 `/user/matching`
2. 选择测试活动
3. 切换到"发现配对"标签
4. 应该能看到"测试用户B"
5. 点击"发起配对"

6. 用账号2登录，访问 `/user/matching`
7. 切换到"我的配对"标签
8. 应该看到来自"测试用户A"的待处理配对
9. 点击"接受"按钮 ✓

### 步骤5：测试位置功能

现在配对状态是"已接受"，可以看到位置功能了！

**账号1（测试用户A）：**
1. 在配对卡片中找到"我的位置"输入框
2. 输入：`咖啡区靠窗位置`
3. 点击"更新位置"
4. 刷新页面，应该看不到对方位置（因为对方还没更新）

**账号2（测试用户B）：**
1. 访问 `/user/matching`
2. 应该立即看到"对方位置：咖啡区靠窗位置（刚刚）"
3. 在"我的位置"输入框输入：`二楼休息区沙发`
4. 点击"更新位置"

**账号1（测试用户A）：**
1. 刷新页面
2. 应该看到"对方位置：二楼休息区沙发（刚刚）"

✅ 测试完成！

---

## 方法二：通过SQL直接插入（快速但需要数据库访问）

### 前提条件

1. 已经通过UI创建了两个测试账号
2. 有Supabase数据库访问权限

### 步骤1：获取用户ID

在Supabase SQL Editor中运行：

```sql
SELECT id, email FROM auth.users
WHERE email IN ('test1@example.com', 'test2@example.com');
```

复制两个用户的UUID。

### 步骤2：运行测试数据脚本

替换下面SQL中的 `YOUR_USER_ID_1` 和 `YOUR_USER_ID_2` 为实际的UUID，然后运行：

```sql
-- 设置变量
DO $$
DECLARE
  user_id_1 UUID := 'YOUR_USER_ID_1'; -- 替换为 test1@example.com 的ID
  user_id_2 UUID := 'YOUR_USER_ID_2'; -- 替换为 test2@example.com 的ID
  event_id UUID := gen_random_uuid();
  session_id UUID := gen_random_uuid();
BEGIN
  -- 创建测试活动
  INSERT INTO public.evt_events (event_id, name, description, start_time, end_time)
  VALUES (
    event_id,
    '测试配对活动',
    '用于测试配对和位置功能',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '3 hours'
  );

  -- 创建场次
  INSERT INTO public.evt_sessions (session_id, event_id, name, start_time, end_time)
  VALUES (
    session_id,
    event_id,
    '测试场次',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '3 hours'
  );

  -- 创建用户资料
  INSERT INTO public.usr_profiles (user_id, nickname, gender, age_group)
  VALUES
    (user_id_1, '测试用户A', 'male', '25-34'),
    (user_id_2, '测试用户B', 'female', '25-34')
  ON CONFLICT (user_id) DO UPDATE SET
    nickname = EXCLUDED.nickname,
    gender = EXCLUDED.gender,
    age_group = EXCLUDED.age_group;

  -- 创建用户偏好
  INSERT INTO public.usr_preferences (user_id, languages, interests, purpose, industry_background)
  VALUES
    (user_id_1, '中文,英文', '技术,创业', '社交,学习', '互联网'),
    (user_id_2, '中文,英文', '设计,创业', '社交,合作', '互联网')
  ON CONFLICT (user_id) DO UPDATE SET
    languages = EXCLUDED.languages,
    interests = EXCLUDED.interests,
    purpose = EXCLUDED.purpose,
    industry_background = EXCLUDED.industry_background;

  -- 报名并签到
  INSERT INTO public.evt_assignments (session_id, user_id, checked_in)
  VALUES
    (session_id, user_id_1, true),
    (session_id, user_id_2, true)
  ON CONFLICT (session_id, user_id) DO UPDATE SET
    checked_in = true;

  -- 创建已接受的配对（带位置数据）
  INSERT INTO public.evt_matches (
    event_id,
    user1_id,
    user2_id,
    status,
    user1_location,
    user2_location,
    location_updated_by_user1_at,
    location_updated_by_user2_at
  )
  VALUES (
    event_id,
    user_id_1,
    user_id_2,
    'accepted',
    '咖啡区靠窗位置',
    '二楼休息区沙发',
    NOW() - INTERVAL '5 minutes',
    NOW() - INTERVAL '2 minutes'
  );

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Event ID: %', event_id;
  RAISE NOTICE 'Go to /user/matching to see the match card with locations!';
END $$;
```

### 步骤3：查看效果

1. 用 `test1@example.com` 登录
2. 访问 `/user/matching`
3. 选择"测试配对活动"
4. 应该看到：
   - 配对卡片显示"测试用户B"
   - 状态："已接受"
   - **对方位置：二楼休息区沙发（2分钟前）**
   - **我的位置输入框**

---

## 查看效果的检查清单

✅ 配对卡片显示对方昵称和信息
✅ 状态徽章显示"已接受"（绿色）
✅ 看到"对方位置"区域，显示位置图标
✅ 对方位置文字正确显示
✅ 时间显示"X分钟前"
✅ 看到"我的位置"输入框
✅ 可以输入新位置
✅ 点击"更新位置"按钮成功
✅ 输入框被清空
✅ （刷新后）对方看到我的位置更新

---

## 常见问题

### Q: 看不到配对卡片？
- 确保两个用户都已签到（checked_in = true）
- 确保在正确的活动中查看
- 检查配对状态是否为 'accepted'

### Q: 看不到位置功能？
- 确保配对状态是 'accepted'（不是 pending）
- 确保已运行位置字段的数据库迁移

### Q: 时间显示不对？
- 检查浏览器和服务器时区设置
- 确保 location_updated_at 字段有值

### Q: 位置更新失败？
- 检查浏览器控制台的错误信息
- 确保用户有更新权限（RLS策略）
- 确保位置不超过100字符

---

## 下一步

测试完成后，你可以：

1. **测试不同场景**：
   - Pending状态（应该不显示位置）
   - Completed状态（应该只读显示）
   - 空位置（应该只显示输入框）

2. **测试边界情况**：
   - 输入超长位置（100+字符）
   - 输入空格
   - 快速连续更新

3. **性能测试**：
   - 创建多个配对
   - 查看页面性能

4. **添加Realtime功能**（后续优化）：
   - 位置更新时实时显示
   - 无需刷新页面

---

祝测试顺利！如有问题随时反馈。
