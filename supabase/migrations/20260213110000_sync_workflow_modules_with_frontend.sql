-- Sync workflow_modules seed data with frontend WORKFLOW_MODULE_LIBRARY.
-- Standardise module_key to use hyphens (matching frontend ids).
-- Add 3 missing modules: networking-speed, industry-cross, closing-share.

-- 1) Update existing keys to match frontend ids
UPDATE public.workflow_modules SET module_key = 'opening-checkin'    WHERE module_key = 'opening_checkin';
UPDATE public.workflow_modules SET module_key = 'opening-intro'     WHERE module_key = 'opening_intro';
UPDATE public.workflow_modules SET module_key = 'networking-free-talk' WHERE module_key = 'networking_free_talk';
UPDATE public.workflow_modules SET module_key = 'group-small'       WHERE module_key = 'group_small_discussion';
UPDATE public.workflow_modules SET module_key = 'industry-peer'     WHERE module_key = 'industry_peer_exchange';
UPDATE public.workflow_modules SET module_key = 'closing-share'     WHERE module_key = 'closing_summary_share';

-- 2) Upsert all 8 modules to match frontend WORKFLOW_MODULE_LIBRARY exactly
INSERT INTO public.workflow_modules (module_key, name, description, module_type, default_duration_minutes, definition, display_order)
VALUES
  ('opening-checkin',      '签到与入场',     '人员到场、破冰准备与分区指引。',           'opening',    20, '{}'::jsonb, 10),
  ('opening-intro',        '开场与规则说明', '主持人说明目标、流程、时间规则。',         'opening',    10, '{}'::jsonb, 20),
  ('networking-free-talk', '自由交流',       '开放走动交流，适合快速建立连接。',         'networking', 25, '{}'::jsonb, 30),
  ('networking-speed',     '快速轮转交流',   '短时多轮对话，提升触达人数。',             'networking', 20, '{}'::jsonb, 35),
  ('group-small',          '小组交流',       '按主题分组讨论，每组输出结论。',           'group',      35, '{}'::jsonb, 40),
  ('industry-peer',        '同行业交流',     '同赛道交流，聚焦行业资源与合作。',         'industry',   30, '{}'::jsonb, 50),
  ('industry-cross',       '跨行业交流',     '不同背景交叉讨论，提升视角多样性。',       'industry',   30, '{}'::jsonb, 55),
  ('closing-share',        '总结分享',       '代表发言与关键收获回顾。',                 'closing',    15, '{}'::jsonb, 60)
ON CONFLICT (module_key) DO UPDATE SET
  name                    = EXCLUDED.name,
  description             = EXCLUDED.description,
  module_type             = EXCLUDED.module_type,
  default_duration_minutes = EXCLUDED.default_duration_minutes,
  display_order           = EXCLUDED.display_order;
