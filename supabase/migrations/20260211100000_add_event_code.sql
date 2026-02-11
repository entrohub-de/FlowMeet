-- 为活动添加短代码字段
-- event_id (UUID) 保留用于系统内部，event_code 用于展示和URL

-- 1. 添加 event_code 字段
ALTER TABLE "public"."evt_events"
  ADD COLUMN IF NOT EXISTS "event_code" TEXT UNIQUE;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS "idx_evt_events_event_code"
  ON "public"."evt_events" ("event_code");

-- 3. 创建函数：生成唯一的 event_code
CREATE OR REPLACE FUNCTION generate_event_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- 生成格式: EVT-XXXXXX (6位随机数字和字母)
    new_code := 'EVT-' || upper(substring(md5(random()::text) from 1 for 6));

    -- 检查是否已存在
    SELECT EXISTS(
      SELECT 1 FROM evt_events WHERE event_code = new_code
    ) INTO code_exists;

    -- 如果不存在，跳出循环
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建触发器：自动生成 event_code
CREATE OR REPLACE FUNCTION auto_generate_event_code()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果 event_code 为空，自动生成
  IF NEW.event_code IS NULL THEN
    NEW.event_code := generate_event_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evt_events_auto_code
  BEFORE INSERT ON "public"."evt_events"
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_event_code();

-- 5. 为现有数据生成 event_code
UPDATE "public"."evt_events"
SET event_code = generate_event_code()
WHERE event_code IS NULL;

-- 6. 设置为 NOT NULL（在生成所有代码后）
ALTER TABLE "public"."evt_events"
  ALTER COLUMN "event_code" SET NOT NULL;

-- 7. 添加注释
COMMENT ON COLUMN "public"."evt_events"."event_code" IS '活动短代码，用于URL和展示（如 EVT-ABC123）';
