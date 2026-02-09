-- 为活动添加签到码字段
-- 添加签到短码字段到 evt_events 表

ALTER TABLE "public"."evt_events"
  ADD COLUMN IF NOT EXISTS "checkin_code" TEXT,
  ADD COLUMN IF NOT EXISTS "checkin_qr_enabled" BOOLEAN DEFAULT true;

-- 为签到码创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "evt_events_checkin_code_key" ON "public"."evt_events" (checkin_code);

-- 创建一个函数来生成随机的6位签到码
CREATE OR REPLACE FUNCTION "public"."generate_checkin_code"()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- 生成6位随机数字码
    code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- 检查是否已存在
    SELECT EXISTS(
      SELECT 1 FROM "public"."evt_events" WHERE checkin_code = code
    ) INTO code_exists;

    -- 如果不存在，跳出循环
    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN code;
END;
$function$;

-- 为现有活动生成签到码
UPDATE "public"."evt_events"
SET checkin_code = "public"."generate_checkin_code"()
WHERE checkin_code IS NULL;

-- 添加注释
COMMENT ON COLUMN "public"."evt_events"."checkin_code" IS '6位数字签到短码';
COMMENT ON COLUMN "public"."evt_events"."checkin_qr_enabled" IS '是否启用二维码签到';
