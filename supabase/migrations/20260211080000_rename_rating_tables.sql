-- 将评分相关表从 evt_ 前缀改为 rating_ 前缀
-- 评分功能相对独立，使用 rating_ 前缀更清晰

-- 1. 重命名表
ALTER TABLE IF EXISTS "public"."evt_event_ratings" RENAME TO "rating_events";
ALTER TABLE IF EXISTS "public"."evt_topic_ratings" RENAME TO "rating_topics";
ALTER TABLE IF EXISTS "public"."evt_match_ratings" RENAME TO "rating_matches";
ALTER TABLE IF EXISTS "public"."evt_match_quality_ratings" RENAME TO "rating_match_quality";

-- 2. 更新 rating_events 的约束和索引
ALTER TABLE "public"."rating_events"
  DROP CONSTRAINT IF EXISTS "evt_event_ratings_pkey";
ALTER TABLE "public"."rating_events"
  DROP CONSTRAINT IF EXISTS "evt_event_ratings_event_id_fkey";
ALTER TABLE "public"."rating_events"
  DROP CONSTRAINT IF EXISTS "evt_event_ratings_user_id_fkey";
ALTER TABLE "public"."rating_events"
  DROP CONSTRAINT IF EXISTS "evt_event_ratings_event_user_unique";

DROP INDEX IF EXISTS "public"."evt_event_ratings_pkey";
DROP INDEX IF EXISTS "public"."idx_evt_event_ratings_event_id";
DROP INDEX IF EXISTS "public"."idx_evt_event_ratings_user_id";

CREATE UNIQUE INDEX "rating_events_pkey" ON "public"."rating_events" USING btree (rating_id);
CREATE INDEX "idx_rating_events_event_id" ON "public"."rating_events" USING btree (event_id);
CREATE INDEX "idx_rating_events_user_id" ON "public"."rating_events" USING btree (user_id);

ALTER TABLE "public"."rating_events"
  ADD CONSTRAINT "rating_events_pkey" PRIMARY KEY USING INDEX "rating_events_pkey";
ALTER TABLE "public"."rating_events"
  ADD CONSTRAINT "rating_events_event_id_fkey"
  FOREIGN KEY (event_id) REFERENCES "public"."evt_events"(event_id) ON DELETE CASCADE;
ALTER TABLE "public"."rating_events"
  ADD CONSTRAINT "rating_events_user_id_fkey"
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."rating_events"
  ADD CONSTRAINT "rating_events_event_user_unique"
  UNIQUE (event_id, user_id);

-- 3. 更新 rating_topics 的约束和索引
ALTER TABLE "public"."rating_topics"
  DROP CONSTRAINT IF EXISTS "evt_topic_ratings_pkey";
ALTER TABLE "public"."rating_topics"
  DROP CONSTRAINT IF EXISTS "evt_topic_ratings_topic_id_fkey";
ALTER TABLE "public"."rating_topics"
  DROP CONSTRAINT IF EXISTS "evt_topic_ratings_user_id_fkey";
ALTER TABLE "public"."rating_topics"
  DROP CONSTRAINT IF EXISTS "evt_topic_ratings_topic_user_unique";

DROP INDEX IF EXISTS "public"."evt_topic_ratings_pkey";
DROP INDEX IF EXISTS "public"."idx_evt_topic_ratings_topic_id";
DROP INDEX IF EXISTS "public"."idx_evt_topic_ratings_user_id";

CREATE UNIQUE INDEX "rating_topics_pkey" ON "public"."rating_topics" USING btree (rating_id);
CREATE INDEX "idx_rating_topics_topic_id" ON "public"."rating_topics" USING btree (topic_id);
CREATE INDEX "idx_rating_topics_user_id" ON "public"."rating_topics" USING btree (user_id);

ALTER TABLE "public"."rating_topics"
  ADD CONSTRAINT "rating_topics_pkey" PRIMARY KEY USING INDEX "rating_topics_pkey";
ALTER TABLE "public"."rating_topics"
  ADD CONSTRAINT "rating_topics_topic_id_fkey"
  FOREIGN KEY (topic_id) REFERENCES "public"."evt_conversation_topics"(topic_id) ON DELETE CASCADE;
ALTER TABLE "public"."rating_topics"
  ADD CONSTRAINT "rating_topics_user_id_fkey"
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."rating_topics"
  ADD CONSTRAINT "rating_topics_topic_user_unique"
  UNIQUE (topic_id, user_id);

-- 4. 更新 rating_matches 的约束和索引
ALTER TABLE "public"."rating_matches"
  DROP CONSTRAINT IF EXISTS "evt_match_ratings_pkey";
ALTER TABLE "public"."rating_matches"
  DROP CONSTRAINT IF EXISTS "evt_match_ratings_match_id_fkey";
ALTER TABLE "public"."rating_matches"
  DROP CONSTRAINT IF EXISTS "evt_match_ratings_rater_user_id_fkey";
ALTER TABLE "public"."rating_matches"
  DROP CONSTRAINT IF EXISTS "evt_match_ratings_match_rater_unique";

DROP INDEX IF EXISTS "public"."evt_match_ratings_pkey";
DROP INDEX IF EXISTS "public"."idx_evt_match_ratings_match_id";
DROP INDEX IF EXISTS "public"."idx_evt_match_ratings_rater";

CREATE UNIQUE INDEX "rating_matches_pkey" ON "public"."rating_matches" USING btree (rating_id);
CREATE INDEX "idx_rating_matches_match_id" ON "public"."rating_matches" USING btree (match_id);
CREATE INDEX "idx_rating_matches_rater" ON "public"."rating_matches" USING btree (rater_user_id);

ALTER TABLE "public"."rating_matches"
  ADD CONSTRAINT "rating_matches_pkey" PRIMARY KEY USING INDEX "rating_matches_pkey";
ALTER TABLE "public"."rating_matches"
  ADD CONSTRAINT "rating_matches_match_id_fkey"
  FOREIGN KEY (match_id) REFERENCES "public"."evt_matches"(match_id) ON DELETE CASCADE;
ALTER TABLE "public"."rating_matches"
  ADD CONSTRAINT "rating_matches_rater_user_id_fkey"
  FOREIGN KEY (rater_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."rating_matches"
  ADD CONSTRAINT "rating_matches_match_rater_unique"
  UNIQUE (match_id, rater_user_id);

-- 5. 更新 rating_match_quality 的约束和索引
ALTER TABLE "public"."rating_match_quality"
  DROP CONSTRAINT IF EXISTS "evt_match_quality_ratings_pkey";
ALTER TABLE "public"."rating_match_quality"
  DROP CONSTRAINT IF EXISTS "evt_match_quality_ratings_event_id_fkey";
ALTER TABLE "public"."rating_match_quality"
  DROP CONSTRAINT IF EXISTS "evt_match_quality_ratings_user_id_fkey";
ALTER TABLE "public"."rating_match_quality"
  DROP CONSTRAINT IF EXISTS "evt_match_quality_ratings_event_user_unique";

DROP INDEX IF EXISTS "public"."evt_match_quality_ratings_pkey";
DROP INDEX IF EXISTS "public"."idx_evt_match_quality_ratings_event_id";
DROP INDEX IF EXISTS "public"."idx_evt_match_quality_ratings_user_id";

CREATE UNIQUE INDEX "rating_match_quality_pkey" ON "public"."rating_match_quality" USING btree (rating_id);
CREATE INDEX "idx_rating_match_quality_event_id" ON "public"."rating_match_quality" USING btree (event_id);
CREATE INDEX "idx_rating_match_quality_user_id" ON "public"."rating_match_quality" USING btree (user_id);

ALTER TABLE "public"."rating_match_quality"
  ADD CONSTRAINT "rating_match_quality_pkey" PRIMARY KEY USING INDEX "rating_match_quality_pkey";
ALTER TABLE "public"."rating_match_quality"
  ADD CONSTRAINT "rating_match_quality_event_id_fkey"
  FOREIGN KEY (event_id) REFERENCES "public"."evt_events"(event_id) ON DELETE CASCADE;
ALTER TABLE "public"."rating_match_quality"
  ADD CONSTRAINT "rating_match_quality_user_id_fkey"
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."rating_match_quality"
  ADD CONSTRAINT "rating_match_quality_event_user_unique"
  UNIQUE (event_id, user_id);

-- 6. 更新 RLS 策略
-- rating_events
DROP POLICY IF EXISTS "Users can insert their own event ratings" ON "public"."rating_events";
DROP POLICY IF EXISTS "Users can read all event ratings" ON "public"."rating_events";
DROP POLICY IF EXISTS "Users can update their own event ratings" ON "public"."rating_events";
DROP POLICY IF EXISTS "Users can delete their own event ratings" ON "public"."rating_events";

CREATE POLICY "Users can insert their own event ratings"
  ON "public"."rating_events"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all event ratings"
  ON "public"."rating_events"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own event ratings"
  ON "public"."rating_events"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event ratings"
  ON "public"."rating_events"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- rating_topics
DROP POLICY IF EXISTS "Users can insert their own topic ratings" ON "public"."rating_topics";
DROP POLICY IF EXISTS "Users can read all topic ratings" ON "public"."rating_topics";
DROP POLICY IF EXISTS "Users can update their own topic ratings" ON "public"."rating_topics";
DROP POLICY IF EXISTS "Users can delete their own topic ratings" ON "public"."rating_topics";

CREATE POLICY "Users can insert their own topic ratings"
  ON "public"."rating_topics"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all topic ratings"
  ON "public"."rating_topics"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own topic ratings"
  ON "public"."rating_topics"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topic ratings"
  ON "public"."rating_topics"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- rating_matches
DROP POLICY IF EXISTS "Users can insert their own match ratings" ON "public"."rating_matches";
DROP POLICY IF EXISTS "Users can read all match ratings" ON "public"."rating_matches";
DROP POLICY IF EXISTS "Users can update their own match ratings" ON "public"."rating_matches";
DROP POLICY IF EXISTS "Users can delete their own match ratings" ON "public"."rating_matches";

CREATE POLICY "Users can insert their own match ratings"
  ON "public"."rating_matches"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rater_user_id);

CREATE POLICY "Users can read all match ratings"
  ON "public"."rating_matches"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own match ratings"
  ON "public"."rating_matches"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = rater_user_id)
  WITH CHECK (auth.uid() = rater_user_id);

CREATE POLICY "Users can delete their own match ratings"
  ON "public"."rating_matches"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() = rater_user_id);

-- rating_match_quality
DROP POLICY IF EXISTS "Users can insert their own match quality ratings" ON "public"."rating_match_quality";
DROP POLICY IF EXISTS "Users can read all match quality ratings" ON "public"."rating_match_quality";
DROP POLICY IF EXISTS "Users can update their own match quality ratings" ON "public"."rating_match_quality";
DROP POLICY IF EXISTS "Users can delete their own match quality ratings" ON "public"."rating_match_quality";

CREATE POLICY "Users can insert their own match quality ratings"
  ON "public"."rating_match_quality"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all match quality ratings"
  ON "public"."rating_match_quality"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own match quality ratings"
  ON "public"."rating_match_quality"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own match quality ratings"
  ON "public"."rating_match_quality"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. 更新权限
GRANT ALL ON TABLE "public"."rating_events" TO authenticated;
GRANT ALL ON TABLE "public"."rating_events" TO service_role;

GRANT ALL ON TABLE "public"."rating_topics" TO authenticated;
GRANT ALL ON TABLE "public"."rating_topics" TO service_role;

GRANT ALL ON TABLE "public"."rating_matches" TO authenticated;
GRANT ALL ON TABLE "public"."rating_matches" TO service_role;

GRANT ALL ON TABLE "public"."rating_match_quality" TO authenticated;
GRANT ALL ON TABLE "public"."rating_match_quality" TO service_role;

-- 8. 添加注释
COMMENT ON TABLE "public"."rating_events" IS '活动评分';
COMMENT ON TABLE "public"."rating_topics" IS '对话话题评分';
COMMENT ON TABLE "public"."rating_matches" IS '配对评分';
COMMENT ON TABLE "public"."rating_match_quality" IS '配对质量评分';
