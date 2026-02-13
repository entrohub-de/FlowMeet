-- Admin管理员账号种子数据
-- 创建一个 admin 角色账号，可访问 /admin 管理页面

BEGIN;

DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT := 'admin@flowmeet.test';
BEGIN
  -- 检查是否已存在
  SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;

  IF admin_user_id IS NULL THEN
    admin_user_id := gen_random_uuid();

    -- 创建auth用户
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      crypt('admin123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', '系统管理员'),
      FALSE, 'authenticated', 'authenticated',
      '', '', '', ''
    );

    -- 创建 identities 记录（Supabase auth 需要）
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      admin_user_id,
      admin_email,
      jsonb_build_object('sub', admin_user_id::text, 'email', admin_email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE '✅ 创建Admin账号：%', admin_email;
  ELSE
    RAISE NOTICE 'ℹ️  Admin账号已存在：%', admin_email;
  END IF;

  -- 设置角色为admin
  INSERT INTO public.usr_role (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  -- 创建profile
  INSERT INTO public.usr_profiles (user_id, nickname, gender, age_group)
  VALUES (admin_user_id, '系统管理员', 'other', '25-34')
  ON CONFLICT (user_id) DO UPDATE SET
    nickname = '系统管理员';

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Admin账号创建成功！';
  RAISE NOTICE '================================';
  RAISE NOTICE '🔐 登录信息：';
  RAISE NOTICE '   邮箱: admin@flowmeet.test';
  RAISE NOTICE '   密码: admin123';
  RAISE NOTICE '   访问: /admin/test/simulator';
  RAISE NOTICE '   用户ID: %', admin_user_id;
  RAISE NOTICE '================================';
END $$;

COMMIT;
