-- Fix ambiguous reference in get_user_role()
-- Some environments may resolve "user_id" ambiguously between parameter and column.

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  SELECT ur.role
  INTO v_user_role
  FROM public.usr_role AS ur
  WHERE ur.user_id = $1
  LIMIT 1;

  RETURN COALESCE(v_user_role, 'user');
END;
$$;
