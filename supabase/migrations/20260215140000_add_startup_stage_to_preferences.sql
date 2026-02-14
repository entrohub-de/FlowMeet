-- Add startup_stage column to usr_preferences
ALTER TABLE "public"."usr_preferences"
  ADD COLUMN IF NOT EXISTS "startup_stage" text;
