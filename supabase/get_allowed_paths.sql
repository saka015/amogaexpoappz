create or replace function public.get_allowed_paths(
  user_uuid uuid default null,
  user_catalog_id bigint default null
)
returns table(
  page_link text,
  page_name text,
  status text,
  page_icon_name text,
  page_icon_url text
)
language sql
as $$
  select distinct
    p.page_link,
    p.page_name,
    p.status,
    p.page_icon_name,
    p.page_icon_url
  from public.user_catalog u
  cross join public.page_list p
  where 
    (
      (user_uuid is not null and u.user_id = user_uuid)
      or
      (user_catalog_id is not null and u.user_catalog_id = user_catalog_id)
    )
    and exists (
      select 1
      from jsonb_array_elements_text(u.roles_json::jsonb) as ur(role)
      join jsonb_array_elements_text(p.role_json::jsonb) as pr(role)
        on ur.role = pr.role
      limit 1
    )
$$;
