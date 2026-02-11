-- 修复 usr_preferences 表的 created_at 列
-- 1. 改为正确的类型: timestamp with time zone
-- 2. 添加默认值: now()

-- 如果表中已有数据，先尝试转换类型
ALTER TABLE "public"."usr_preferences"
  ALTER COLUMN "created_at" TYPE timestamp with time zone
  USING CASE
    WHEN "created_at" IS NULL THEN now()
    WHEN "created_at" = '' THEN now()
    ELSE to_timestamp("created_at", 'YYYY-MM-DD HH24:MI:SS')
  END;

-- 设置默认值
ALTER TABLE "public"."usr_preferences"
  ALTER COLUMN "created_at" SET DEFAULT now();

-- 添加 updated_at 列（如果还没有）
ALTER TABLE "public"."usr_preferences"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
