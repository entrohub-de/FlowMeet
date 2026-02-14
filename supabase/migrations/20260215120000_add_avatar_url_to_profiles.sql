-- Add avatar_url column to usr_profiles
alter table "public"."usr_profiles"
  add column "avatar_url" text;
