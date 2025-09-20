(
  EXISTS (
    SELECT 1
    FROM chat_group,
         jsonb_array_elements(chat_group.chat_group_users_json) AS user_obj
    WHERE chat_group.id = message.group_id
      AND (user_obj ->> 'id')::bigint =
        COALESCE(
          (auth.jwt() ->> 'user_id')::bigint,
          ((current_setting('request.headers', true))::json ->> 'user_id')::bigint
        )
  )
  OR (
    ((current_setting('request.headers', true))::json ->> 'user_role') = 'admin'
  )
)


-- alow notification messages

(
  (
    EXISTS (
      SELECT
        1
      FROM
        chat_group,
        LATERAL jsonb_array_elements(chat_group.chat_group_users_json) user_obj (value)
      WHERE
        (
          (chat_group.id = message.group_id)
          AND (
            ((user_obj.value ->> 'id'::text))::bigint = COALESCE(
              ((jwt () ->> 'user_id'::text))::bigint,
              (
                (
                  (current_setting('request.headers'::text, true))::json ->> 'user_id'::text
                )
              )::bigint
            )
          )
        )
    )
  )
  OR (
    (
      (current_setting('request.headers'::text, true))::json ->> 'user_role'::text
    ) = 'admin'::text
  )
  OR (
    chat_message_type = 'APP_NOTIFICATION'
  )
  OR (
    chat_message_type NOT IN ('text', 'file')
  )
)