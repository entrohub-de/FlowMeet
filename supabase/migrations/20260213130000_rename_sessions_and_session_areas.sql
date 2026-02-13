-- 重命名表: evt_sessions -> session_flows, evt_session_areas -> session_areas

-- ============================================================================
-- 1) 重命名表（先重命名依赖表）
-- ============================================================================
ALTER TABLE "public"."evt_session_areas" RENAME TO "session_areas";
ALTER TABLE "public"."evt_sessions" RENAME TO "session_flows";

-- ============================================================================
-- 2) 删除旧的外键约束
-- ============================================================================

-- session_areas (原 evt_session_areas) 上的外键
ALTER TABLE "public"."session_areas"
  DROP CONSTRAINT IF EXISTS "evt_session_areas_session_id_fkey";
ALTER TABLE "public"."session_areas"
  DROP CONSTRAINT IF EXISTS "evt_session_areas_area_id_fkey";

-- session_flows (原 evt_sessions) 上的外键
ALTER TABLE "public"."session_flows"
  DROP CONSTRAINT IF EXISTS "evt_sessions_event_id_fkey";

-- 其他表引用 evt_sessions 的外键
ALTER TABLE "public"."evt_assignments"
  DROP CONSTRAINT IF EXISTS "evt_assignments_session_id_fkey";
ALTER TABLE "public"."evt_groups"
  DROP CONSTRAINT IF EXISTS "evt_groups_session_id_fkey";

-- ============================================================================
-- 3) 更新主键和索引名称
-- ============================================================================

-- session_flows (原 evt_sessions)
ALTER TABLE "public"."session_flows" DROP CONSTRAINT IF EXISTS "evt_sessions_pkey";
DROP INDEX IF EXISTS "public"."evt_sessions_pkey";
CREATE UNIQUE INDEX "session_flows_pkey" ON "public"."session_flows" USING btree (session_id);
ALTER TABLE "public"."session_flows" ADD CONSTRAINT "session_flows_pkey"
  PRIMARY KEY USING INDEX "session_flows_pkey";

-- session_areas (原 evt_session_areas)
ALTER TABLE "public"."session_areas" DROP CONSTRAINT IF EXISTS "evt_session_areas_pkey";
DROP INDEX IF EXISTS "public"."evt_session_areas_pkey";
CREATE UNIQUE INDEX "session_areas_pkey" ON "public"."session_areas" USING btree (session_id, area_id);
ALTER TABLE "public"."session_areas" ADD CONSTRAINT "session_areas_pkey"
  PRIMARY KEY USING INDEX "session_areas_pkey";

-- ============================================================================
-- 4) 重新创建外键约束（使用新的约束名称）
-- ============================================================================

-- session_flows.event_id -> evt_events.event_id
ALTER TABLE "public"."session_flows"
  ADD CONSTRAINT "session_flows_event_id_fkey"
  FOREIGN KEY (event_id) REFERENCES "public"."evt_events"(event_id) ON DELETE CASCADE;

-- session_areas.session_id -> session_flows.session_id
ALTER TABLE "public"."session_areas"
  ADD CONSTRAINT "session_areas_session_id_fkey"
  FOREIGN KEY (session_id) REFERENCES "public"."session_flows"(session_id) ON DELETE CASCADE;

-- session_areas.area_id -> evt_areas.area_id
ALTER TABLE "public"."session_areas"
  ADD CONSTRAINT "session_areas_area_id_fkey"
  FOREIGN KEY (area_id) REFERENCES "public"."evt_areas"(area_id) ON DELETE CASCADE;

-- evt_assignments.session_id -> session_flows.session_id
ALTER TABLE "public"."evt_assignments"
  ADD CONSTRAINT "evt_assignments_session_id_fkey"
  FOREIGN KEY (session_id) REFERENCES "public"."session_flows"(session_id) ON DELETE CASCADE;

-- evt_groups.session_id -> session_flows.session_id
ALTER TABLE "public"."evt_groups"
  ADD CONSTRAINT "evt_groups_session_id_fkey"
  FOREIGN KEY (session_id) REFERENCES "public"."session_flows"(session_id) ON DELETE CASCADE;

-- ============================================================================
-- 5) 权限授予
-- ============================================================================
GRANT ALL ON TABLE "public"."session_flows" TO "anon";
GRANT ALL ON TABLE "public"."session_flows" TO "authenticated";
GRANT ALL ON TABLE "public"."session_flows" TO "postgres";
GRANT ALL ON TABLE "public"."session_flows" TO "service_role";

GRANT ALL ON TABLE "public"."session_areas" TO "anon";
GRANT ALL ON TABLE "public"."session_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."session_areas" TO "postgres";
GRANT ALL ON TABLE "public"."session_areas" TO "service_role";
