  create or replace function public.custom_access_token_hook(event jsonb)
  returns jsonb
  language plpgsql
  set search_path = public
  as $$
  declare
    claims jsonb := event->'claims';
    v_user_id uuid := (event->>'user_id')::uuid;  -- renamed to avoid conflict
    user_catalog_data record;
  begin
    -- Fetch data from user_catalog for this user
    select 
      user_catalog_id,
      business_number,
      business_name,
      for_business_number,
      for_business_name
    into user_catalog_data
    from public.user_catalog
    where public.user_catalog.user_id = v_user_id;  -- disambiguated

    -- If a record was found, update claims
    if found then
      -- Ensure app_metadata exists
      if jsonb_typeof(claims->'app_metadata') is null then
        claims := jsonb_set(claims, '{app_metadata}', '{}');
      end if;

      -- Add fields into app_metadata
      claims := jsonb_set(claims, '{app_metadata,user_catalog_id}', to_jsonb(user_catalog_data.user_catalog_id), true);
      claims := jsonb_set(claims, '{user_catalog_id}', to_jsonb(user_catalog_data.user_catalog_id), true);
      claims := jsonb_set(claims, '{user_id}', to_jsonb(user_catalog_data.user_catalog_id), true);

      claims := jsonb_set(claims, '{business_number}', coalesce(to_jsonb(user_catalog_data.business_number), 'null'::jsonb), true);
      claims := jsonb_set(claims, '{business_name}', coalesce(to_jsonb(user_catalog_data.business_name), 'null'::jsonb), true);
      claims := jsonb_set(claims, '{for_business_number}', coalesce(to_jsonb(user_catalog_data.for_business_number), 'null'::jsonb), true);
      claims := jsonb_set(claims, '{for_business_name}', coalesce(to_jsonb(user_catalog_data.for_business_name), 'null'::jsonb), true);

      -- Update claims in the event
      event := jsonb_set(event, '{claims}', claims);
    end if;

    return event;
  end;
  $$;


  -- Allow supabase_auth_admin to execute the hook
  grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

  -- Allow supabase_auth_admin to use the schema
  grant usage on schema public to supabase_auth_admin;

  -- Allow supabase_auth_admin to read from user_catalog
  grant select on table public.user_catalog to supabase_auth_admin;

  -- Also allow 'postgres' role to use the function (used internally by gotrue in self-hosted setup)
  grant execute on function public.custom_access_token_hook(jsonb) to postgres;
  grant usage on schema public to postgres;
  grant select on table public.user_catalog to postgres;

  -- Revoke from untrusted roles
  revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

create policy allow_hook_read on public.user_catalog
for select
to supabase_auth_admin
using (true);