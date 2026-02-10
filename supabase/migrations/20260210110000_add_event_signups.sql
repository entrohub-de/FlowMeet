-- 创建活动报名表
CREATE TABLE IF NOT EXISTS "public"."evt_signups" (
  "signup_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT "evt_signups_event_id_fkey" FOREIGN KEY ("event_id")
    REFERENCES "public"."evt_events"("event_id") ON DELETE CASCADE,
  CONSTRAINT "evt_signups_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "evt_signups_event_user_key" UNIQUE ("event_id", "user_id")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_evt_signups_event_id"
  ON "public"."evt_signups" ("event_id");

CREATE INDEX IF NOT EXISTS "idx_evt_signups_user_id"
  ON "public"."evt_signups" ("user_id");

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_evt_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evt_signups_updated_at
  BEFORE UPDATE ON "public"."evt_signups"
  FOR EACH ROW
  EXECUTE FUNCTION update_evt_signups_updated_at();

-- 启用 RLS
ALTER TABLE "public"."evt_signups" ENABLE ROW LEVEL SECURITY;

-- RLS 策略：任何人都可以查看报名记录
CREATE POLICY "evt_signups_select"
  ON "public"."evt_signups"
  FOR SELECT
  TO public
  USING (true);

-- RLS 策略：只有登录用户可以报名
CREATE POLICY "evt_signups_insert"
  ON "public"."evt_signups"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户可以取消自己的报名
CREATE POLICY "evt_signups_delete"
  ON "public"."evt_signups"
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 授予权限
GRANT SELECT ON TABLE "public"."evt_signups" TO anon;
GRANT SELECT ON TABLE "public"."evt_signups" TO authenticated;
GRANT INSERT, DELETE ON TABLE "public"."evt_signups" TO authenticated;
GRANT ALL ON TABLE "public"."evt_signups" TO service_role;

-- 添加注释
COMMENT ON TABLE "public"."evt_signups" IS '活动报名记录';
COMMENT ON COLUMN "public"."evt_signups"."signup_id" IS '报名ID';
COMMENT ON COLUMN "public"."evt_signups"."event_id" IS '活动ID';
COMMENT ON COLUMN "public"."evt_signups"."user_id" IS '用户ID';
