-- 重命名表，添加领域前缀
-- evt_ 表示事件相关表
-- usr_ 表示用户相关表

-- 1. 重命名表（按照依赖关系顺序）

-- 重命名 session_assignment（依赖 session, area）
ALTER TABLE IF EXISTS "public"."session_assignment" RENAME TO "evt_assignments";

-- 重命名 session_area（依赖 session, area）
ALTER TABLE IF EXISTS "public"."session_area" RENAME TO "evt_session_areas";

-- 重命名 session（依赖 event）
ALTER TABLE IF EXISTS "public"."session" RENAME TO "evt_sessions";

-- 重命名 area（依赖 venue）
ALTER TABLE IF EXISTS "public"."area" RENAME TO "evt_areas";

-- 重命名 event（依赖 venue）
ALTER TABLE IF EXISTS "public"."event" RENAME TO "evt_events";

-- 重命名 venue（独立表）
ALTER TABLE IF EXISTS "public"."venue" RENAME TO "evt_venues";

-- 重命名用户相关表
ALTER TABLE IF EXISTS "public"."user_profiles" RENAME TO "usr_profiles";
ALTER TABLE IF EXISTS "public"."user_roles" RENAME TO "evt_event_roles";
ALTER TABLE IF EXISTS "public"."user_preferences" RENAME TO "usr_preferences";


-- 2. 临时删除所有外键约束（稍后重新创建）

-- 删除依赖 evt_areas 的外键
ALTER TABLE "public"."evt_session_areas"
  DROP CONSTRAINT IF EXISTS "session_area_area_id_fkey";
ALTER TABLE "public"."evt_assignments"
  DROP CONSTRAINT IF EXISTS "session_assignment_area_id_fkey";

-- 删除依赖 evt_venues 的外键
ALTER TABLE "public"."evt_areas"
  DROP CONSTRAINT IF EXISTS "area_venue_id_fkey";
ALTER TABLE "public"."evt_events"
  DROP CONSTRAINT IF EXISTS "event_venue_id_fkey";

-- 删除依赖 evt_events 的外键
ALTER TABLE "public"."evt_sessions"
  DROP CONSTRAINT IF EXISTS "session_event_id_fkey";

-- 删除依赖 evt_sessions 的外键
ALTER TABLE "public"."evt_session_areas"
  DROP CONSTRAINT IF EXISTS "session_area_session_id_fkey";
ALTER TABLE "public"."evt_assignments"
  DROP CONSTRAINT IF EXISTS "session_assignment_session_id_fkey";

-- 删除 check constraint
ALTER TABLE "public"."evt_assignments"
  DROP CONSTRAINT IF EXISTS "session_assignment_assigned_by_check";

-- 删除用户相关外键
ALTER TABLE "public"."usr_profiles"
  DROP CONSTRAINT IF EXISTS "user_profiles_user_id_fkey";
ALTER TABLE "public"."evt_event_roles"
  DROP CONSTRAINT IF EXISTS "user_roles_user_id_fkey";
ALTER TABLE "public"."usr_preferences"
  DROP CONSTRAINT IF EXISTS "user_preferences_user_id_fkey";


-- 3. 更新主键和索引名称
-- 注意：必须先删除约束，然后才能删除索引

-- evt_areas
ALTER TABLE "public"."evt_areas" DROP CONSTRAINT IF EXISTS "area_pkey";
DROP INDEX IF EXISTS "public"."area_pkey";
CREATE UNIQUE INDEX "evt_areas_pkey" ON "public"."evt_areas" USING btree (area_id);
ALTER TABLE "public"."evt_areas" ADD CONSTRAINT "evt_areas_pkey" PRIMARY KEY USING INDEX "evt_areas_pkey";

-- evt_events
ALTER TABLE "public"."evt_events" DROP CONSTRAINT IF EXISTS "event_pkey";
DROP INDEX IF EXISTS "public"."event_pkey";
CREATE UNIQUE INDEX "evt_events_pkey" ON "public"."evt_events" USING btree (event_id);
ALTER TABLE "public"."evt_events" ADD CONSTRAINT "evt_events_pkey" PRIMARY KEY USING INDEX "evt_events_pkey";

-- evt_sessions
ALTER TABLE "public"."evt_sessions" DROP CONSTRAINT IF EXISTS "session_pkey";
DROP INDEX IF EXISTS "public"."session_pkey";
CREATE UNIQUE INDEX "evt_sessions_pkey" ON "public"."evt_sessions" USING btree (session_id);
ALTER TABLE "public"."evt_sessions" ADD CONSTRAINT "evt_sessions_pkey" PRIMARY KEY USING INDEX "evt_sessions_pkey";

-- evt_session_areas
ALTER TABLE "public"."evt_session_areas" DROP CONSTRAINT IF EXISTS "session_area_pkey";
DROP INDEX IF EXISTS "public"."session_area_pkey";
CREATE UNIQUE INDEX "evt_session_areas_pkey" ON "public"."evt_session_areas" USING btree (session_id, area_id);
ALTER TABLE "public"."evt_session_areas" ADD CONSTRAINT "evt_session_areas_pkey" PRIMARY KEY USING INDEX "evt_session_areas_pkey";

-- evt_assignments
ALTER TABLE "public"."evt_assignments" DROP CONSTRAINT IF EXISTS "session_assignment_pkey";
DROP INDEX IF EXISTS "public"."session_assignment_pkey";
DROP INDEX IF EXISTS "public"."idx_session_assignment_area";
DROP INDEX IF EXISTS "public"."idx_session_assignment_checked_in";

CREATE UNIQUE INDEX "evt_assignments_pkey" ON "public"."evt_assignments" USING btree (session_id, user_id);
CREATE INDEX "idx_evt_assignments_area" ON "public"."evt_assignments" USING btree (session_id, area_id);
CREATE INDEX "idx_evt_assignments_checked_in" ON "public"."evt_assignments" USING btree (session_id, checked_in);

ALTER TABLE "public"."evt_assignments" ADD CONSTRAINT "evt_assignments_pkey" PRIMARY KEY USING INDEX "evt_assignments_pkey";

-- evt_venues
ALTER TABLE "public"."evt_venues" DROP CONSTRAINT IF EXISTS "venue_pkey";
DROP INDEX IF EXISTS "public"."venue_pkey";
CREATE UNIQUE INDEX "evt_venues_pkey" ON "public"."evt_venues" USING btree (venue_id);
ALTER TABLE "public"."evt_venues" ADD CONSTRAINT "evt_venues_pkey" PRIMARY KEY USING INDEX "evt_venues_pkey";

-- usr_profiles
ALTER TABLE "public"."usr_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_pkey";
DROP INDEX IF EXISTS "public"."user_profiles_pkey";
CREATE UNIQUE INDEX "usr_profiles_pkey" ON "public"."usr_profiles" USING btree (id);
ALTER TABLE "public"."usr_profiles" ADD CONSTRAINT "usr_profiles_pkey" PRIMARY KEY USING INDEX "usr_profiles_pkey";

-- evt_event_roles
ALTER TABLE "public"."evt_event_roles" DROP CONSTRAINT IF EXISTS "user_roles_pkey";
ALTER TABLE "public"."evt_event_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_key";
DROP INDEX IF EXISTS "public"."user_roles_pkey";
DROP INDEX IF EXISTS "public"."user_roles_user_id_key";

CREATE UNIQUE INDEX "evt_event_roles_pkey" ON "public"."evt_event_roles" USING btree (id);
CREATE UNIQUE INDEX "evt_event_roles_user_id_key" ON "public"."evt_event_roles" USING btree (user_id);

ALTER TABLE "public"."evt_event_roles" ADD CONSTRAINT "evt_event_roles_pkey" PRIMARY KEY USING INDEX "evt_event_roles_pkey";
ALTER TABLE "public"."evt_event_roles" ADD CONSTRAINT "evt_event_roles_user_id_key" UNIQUE USING INDEX "evt_event_roles_user_id_key";

-- usr_preferences
ALTER TABLE "public"."usr_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_pkey";
DROP INDEX IF EXISTS "public"."user_preferences_pkey";
CREATE UNIQUE INDEX "usr_preferences_pkey" ON "public"."usr_preferences" USING btree (id);
ALTER TABLE "public"."usr_preferences" ADD CONSTRAINT "usr_preferences_pkey" PRIMARY KEY USING INDEX "usr_preferences_pkey";


-- 4. 重新创建外键约束（使用新的约束名称）

-- evt_areas 表
ALTER TABLE "public"."evt_areas"
  ADD CONSTRAINT "evt_areas_venue_id_fkey"
  FOREIGN KEY (venue_id) REFERENCES "public"."evt_venues"(venue_id) ON DELETE CASCADE;

-- evt_events 表
ALTER TABLE "public"."evt_events"
  ADD CONSTRAINT "evt_events_venue_id_fkey"
  FOREIGN KEY (venue_id) REFERENCES "public"."evt_venues"(venue_id) ON DELETE CASCADE;

-- evt_sessions 表
ALTER TABLE "public"."evt_sessions"
  ADD CONSTRAINT "evt_sessions_event_id_fkey"
  FOREIGN KEY (event_id) REFERENCES "public"."evt_events"(event_id) ON DELETE CASCADE;

-- evt_session_areas 表
ALTER TABLE "public"."evt_session_areas"
  ADD CONSTRAINT "evt_session_areas_area_id_fkey"
  FOREIGN KEY (area_id) REFERENCES "public"."evt_areas"(area_id) ON DELETE CASCADE;

ALTER TABLE "public"."evt_session_areas"
  ADD CONSTRAINT "evt_session_areas_session_id_fkey"
  FOREIGN KEY (session_id) REFERENCES "public"."evt_sessions"(session_id) ON DELETE CASCADE;

-- evt_assignments 表
ALTER TABLE "public"."evt_assignments"
  ADD CONSTRAINT "evt_assignments_area_id_fkey"
  FOREIGN KEY (area_id) REFERENCES "public"."evt_areas"(area_id);

ALTER TABLE "public"."evt_assignments"
  ADD CONSTRAINT "evt_assignments_session_id_fkey"
  FOREIGN KEY (session_id) REFERENCES "public"."evt_sessions"(session_id) ON DELETE CASCADE;

-- 重新添加 check constraint
ALTER TABLE "public"."evt_assignments"
  ADD CONSTRAINT "evt_assignments_assigned_by_check"
  CHECK (assigned_by = ANY (ARRAY['host'::text, 'system'::text]));

-- usr_profiles 表
ALTER TABLE "public"."usr_profiles"
  ADD CONSTRAINT "usr_profiles_user_id_fkey"
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- evt_event_roles 表
ALTER TABLE "public"."evt_event_roles"
  ADD CONSTRAINT "evt_event_roles_user_id_fkey"
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- usr_preferences 表
ALTER TABLE "public"."usr_preferences"
  ADD CONSTRAINT "usr_preferences_user_id_fkey"
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- 5. 更新存储函数
CREATE OR REPLACE FUNCTION "public"."get_user_role"(user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM "public"."evt_event_roles" WHERE user_id = $1 LIMIT 1;
  RETURN COALESCE(user_role, 'user');
END;
$function$;


-- 6. 权限授予 (保持与原来相同的权限结构)
-- evt_areas
GRANT ALL ON TABLE "public"."evt_areas" TO "anon";
GRANT ALL ON TABLE "public"."evt_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."evt_areas" TO "postgres";
GRANT ALL ON TABLE "public"."evt_areas" TO "service_role";

-- evt_events
GRANT ALL ON TABLE "public"."evt_events" TO "anon";
GRANT ALL ON TABLE "public"."evt_events" TO "authenticated";
GRANT ALL ON TABLE "public"."evt_events" TO "postgres";
GRANT ALL ON TABLE "public"."evt_events" TO "service_role";

-- evt_sessions
GRANT ALL ON TABLE "public"."evt_sessions" TO "anon";
GRANT ALL ON TABLE "public"."evt_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."evt_sessions" TO "postgres";
GRANT ALL ON TABLE "public"."evt_sessions" TO "service_role";

-- evt_session_areas
GRANT ALL ON TABLE "public"."evt_session_areas" TO "anon";
GRANT ALL ON TABLE "public"."evt_session_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."evt_session_areas" TO "postgres";
GRANT ALL ON TABLE "public"."evt_session_areas" TO "service_role";

-- evt_assignments
GRANT ALL ON TABLE "public"."evt_assignments" TO "anon";
GRANT ALL ON TABLE "public"."evt_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."evt_assignments" TO "postgres";
GRANT ALL ON TABLE "public"."evt_assignments" TO "service_role";

-- usr_preferences
GRANT ALL ON TABLE "public"."usr_preferences" TO "anon";
GRANT ALL ON TABLE "public"."usr_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."usr_preferences" TO "postgres";
GRANT ALL ON TABLE "public"."usr_preferences" TO "service_role";

-- usr_profiles
GRANT ALL ON TABLE "public"."usr_profiles" TO "anon";
GRANT ALL ON TABLE "public"."usr_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."usr_profiles" TO "postgres";
GRANT ALL ON TABLE "public"."usr_profiles" TO "service_role";

-- evt_event_roles
GRANT ALL ON TABLE "public"."evt_event_roles" TO "anon";
GRANT ALL ON TABLE "public"."evt_event_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."evt_event_roles" TO "postgres";
GRANT ALL ON TABLE "public"."evt_event_roles" TO "service_role";

-- evt_venues
GRANT ALL ON TABLE "public"."evt_venues" TO "anon";
GRANT ALL ON TABLE "public"."evt_venues" TO "authenticated";
GRANT ALL ON TABLE "public"."evt_venues" TO "postgres";
GRANT ALL ON TABLE "public"."evt_venues" TO "service_role";


-- 7. 重新创建 RLS 策略（如果有的话，这里只有 user_roles 的策略）
DROP POLICY IF EXISTS "Allow users to insert their role" ON "public"."evt_event_roles";
CREATE POLICY "Allow users to insert their role"
  ON "public"."evt_event_roles"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Allow users to read their role" ON "public"."evt_event_roles";
CREATE POLICY "Allow users to read their role"
  ON "public"."evt_event_roles"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));
