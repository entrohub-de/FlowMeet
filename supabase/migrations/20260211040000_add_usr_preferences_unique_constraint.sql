-- 为 usr_preferences 添加 user_id 唯一约束
-- 这样可以支持 seed.sql 中的 ON CONFLICT (user_id) 语句

CREATE UNIQUE INDEX IF NOT EXISTS "usr_preferences_user_id_key"
  ON "public"."usr_preferences" USING btree (user_id);

ALTER TABLE "public"."usr_preferences"
  ADD CONSTRAINT "usr_preferences_user_id_key"
  UNIQUE USING INDEX "usr_preferences_user_id_key";
