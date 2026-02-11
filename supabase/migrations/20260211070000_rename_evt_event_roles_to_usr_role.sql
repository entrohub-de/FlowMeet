-- 将 evt_event_roles 重命名为 usr_role
-- 因为用户角色是相对固定的，不属于活动领域

-- 1. 重命名表
ALTER TABLE IF EXISTS "public"."evt_event_roles" RENAME TO "usr_role";

-- 2. 重命名约束和索引
ALTER TABLE "public"."usr_role"
  DROP CONSTRAINT IF EXISTS "evt_event_roles_pkey";
ALTER TABLE "public"."usr_role"
  DROP CONSTRAINT IF EXISTS "evt_event_roles_user_id_key";
ALTER TABLE "public"."usr_role"
  DROP CONSTRAINT IF EXISTS "evt_event_roles_user_id_fkey";

DROP INDEX IF EXISTS "public"."evt_event_roles_pkey";
DROP INDEX IF EXISTS "public"."evt_event_roles_user_id_key";

-- 重新创建索引
CREATE UNIQUE INDEX "usr_role_pkey" ON "public"."usr_role" USING btree (id);
CREATE UNIQUE INDEX "usr_role_user_id_key" ON "public"."usr_role" USING btree (user_id);

-- 重新创建约束
ALTER TABLE "public"."usr_role"
  ADD CONSTRAINT "usr_role_pkey" PRIMARY KEY USING INDEX "usr_role_pkey";
ALTER TABLE "public"."usr_role"
  ADD CONSTRAINT "usr_role_user_id_key" UNIQUE USING INDEX "usr_role_user_id_key";
ALTER TABLE "public"."usr_role"
  ADD CONSTRAINT "usr_role_user_id_fkey"
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. 删除旧的RLS策略
DROP POLICY IF EXISTS "Allow users to insert their role" ON "public"."usr_role";
DROP POLICY IF EXISTS "Allow users to read their role" ON "public"."usr_role";

-- 4. 重新创建RLS策略
CREATE POLICY "Allow users to insert their role"
  ON "public"."usr_role"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Allow users to read their role"
  ON "public"."usr_role"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

-- 5. 更新 get_user_role 函数
CREATE OR REPLACE FUNCTION "public"."get_user_role"(user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM "public"."usr_role" WHERE user_id = $1 LIMIT 1;
  RETURN COALESCE(user_role, 'user');
END;
$function$;

-- 6. 更新注册自动分配角色的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 自动为新用户分配 'user' 角色
  INSERT INTO public.usr_role (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;
