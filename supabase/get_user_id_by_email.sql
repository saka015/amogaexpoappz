CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;