create or replace function public.sync_user_to_catalog()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  full_name text := null;
  updated_count int;
begin
  -- Safely extract full_name from raw_user_meta_data, if it exists
  if new.raw_user_meta_data ? 'full_name' then
    full_name := new.raw_user_meta_data ->> 'full_name';
  end if;

    -- Try to update based on either user_id or user_email
  update public.user_catalog
  set
    user_id     = new.id,  -- optional, keeps data consistent if only email matched
    user_email  = new.email,
    user_mobile = new.phone,
    first_name  = full_name,
    business_number = new.email,
    updated_at  = now()
  where user_id = new.id
     or user_email = new.email;

  get diagnostics updated_count = row_count;

  -- If no row was updated, insert new
  if updated_count = 0 then
    insert into public.user_catalog (
      user_id, user_email, user_mobile, first_name, business_number, created_at, updated_at, roles_json
    ) values (
      new.id, new.email, new.phone, full_name, new.email, now(), now(), '["growstoreassistant"]'::jsonb
    );
  end if;

  return new;

  -- insert into public.user_catalog (user_id, user_email, user_mobile, first_name, created_at, updated_at)
  -- values (new.id, new.email, new.phone, full_name, now(), now())
  -- on conflict (user_id)
  -- do update set
  --   user_email = excluded.user_email,
  --   user_mobile = excluded.user_mobile,
  --   first_name = excluded.first_name,
  --   updated_at = now();
  -- return new;
end;
$$;

drop trigger if exists trigger_sync_user_to_catalog on auth.users;

create trigger trigger_sync_user_to_catalog
after insert or update on auth.users
-- after insert on auth.users  -- ❗ Only INSERT, no UPDATE
for each row execute procedure public.sync_user_to_catalog();
