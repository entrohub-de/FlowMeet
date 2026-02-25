-- RPC function to get user emails from auth.users (service role only)
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids UUID[])
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT u.id AS user_id, u.email::TEXT AS email
    FROM auth.users u
    WHERE u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service role can call this function
REVOKE ALL ON FUNCTION public.get_user_emails(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_emails(UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_emails(UUID[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails(UUID[]) TO service_role;
