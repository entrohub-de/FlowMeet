-- 创建活动期待表
CREATE TABLE IF NOT EXISTS "public"."evt_expectations" (
  "expectation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT "evt_expectations_pkey" PRIMARY KEY ("expectation_id"),
  CONSTRAINT "evt_expectations_event_id_fkey" FOREIGN KEY ("event_id")
    REFERENCES "public"."evt_events"("event_id") ON DELETE CASCADE,
  CONSTRAINT "evt_expectations_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "evt_expectations_event_user_key" UNIQUE ("event_id", "user_id")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_evt_expectations_event_id"
  ON "public"."evt_expectations" ("event_id");

CREATE INDEX IF NOT EXISTS "idx_evt_expectations_user_id"
  ON "public"."evt_expectations" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_evt_expectations_event_user"
  ON "public"."evt_expectations" ("event_id", "user_id");

-- 启用 RLS
ALTER TABLE "public"."evt_expectations" ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以查看所有期待
CREATE POLICY "Allow users to read all expectations"
  ON "public"."evt_expectations"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS 策略：用户只能创建自己的期待
CREATE POLICY "Allow users to insert their own expectations"
  ON "public"."evt_expectations"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户只能更新自己的期待
CREATE POLICY "Allow users to update their own expectations"
  ON "public"."evt_expectations"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户只能删除自己的期待
CREATE POLICY "Allow users to delete their own expectations"
  ON "public"."evt_expectations"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 授予权限
GRANT ALL ON TABLE "public"."evt_expectations" TO authenticated;
GRANT ALL ON TABLE "public"."evt_expectations" TO service_role;

-- 添加注释
COMMENT ON TABLE "public"."evt_expectations" IS '用户对活动的期待';
COMMENT ON COLUMN "public"."evt_expectations"."expectation_id" IS '期待ID';
COMMENT ON COLUMN "public"."evt_expectations"."event_id" IS '活动ID';
COMMENT ON COLUMN "public"."evt_expectations"."user_id" IS '用户ID';
COMMENT ON COLUMN "public"."evt_expectations"."content" IS '期待内容';
