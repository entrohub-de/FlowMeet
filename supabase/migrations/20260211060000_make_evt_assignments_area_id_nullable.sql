-- 允许 evt_assignments 表的 area_id 列为 NULL
-- 因为并非所有 assignment 都需要指定特定区域

ALTER TABLE "public"."evt_assignments"
  ALTER COLUMN "area_id" DROP NOT NULL;

-- 同时修改 assigned_by 列，允许 NULL 或者设置默认值
ALTER TABLE "public"."evt_assignments"
  ALTER COLUMN "assigned_by" DROP NOT NULL;

ALTER TABLE "public"."evt_assignments"
  ALTER COLUMN "assigned_by" SET DEFAULT 'system';
