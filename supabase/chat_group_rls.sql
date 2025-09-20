(
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(chat_group.chat_group_users_json) AS user_obj
    WHERE (user_obj ->> 'id')::bigint =
      COALESCE(
        (auth.jwt() ->> 'user_id')::bigint,
        ((current_setting('request.headers', true))::json ->> 'user_id')::bigint
      )
  )
  OR (
    ((current_setting('request.headers', true))::json ->> 'user_role') = 'admin'
  )
)


-- auth.jwt()