create or replace function check_user_existence(user_email text, user_phone text)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    found_user record;
begin
    select u.id, u.email, u.phone, u.email_confirmed_at, u.phone_confirmed_at, u.recovery_token
    into found_user
    from auth.users u
    where u.email = user_email or u.phone = user_phone
    limit 1;

    -- If no user found
    if not found_user.id is not null then
        return 'USER_DOES_NOT_EXIST';
    end if;

    -- Check if unverified
    -- if (found_user.email = user_email and found_user.email_confirmed_at is null) 
    --    or (found_user.phone = user_phone and found_user.phone_confirmed_at is null) then
    --     return 'USER_EXISTS_NOT_VERIFIED';
    -- end if;

    -- If recovery_token is still set, user has NOT completed verification
    if found_user.recovery_token is not null and found_user.recovery_token <> '' then
        return 'USER_EXISTS_NOT_VERIFIED';
    end if;

    -- If verified
    return 'USER_EXISTS_VERIFIED';
end;
$$;