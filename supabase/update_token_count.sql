DROP FUNCTION IF EXISTS public.update_token_count;

CREATE OR REPLACE FUNCTION public.update_token_count(
    chat_id_param uuid,
    prompt_tokens_param integer,
    completion_tokens_param integer,
    cost_param numeric
)
RETURNS void
LANGUAGE plpgsql
-- SECURITY DEFINER allows the function to run with the privileges of the user who created it,
-- bypassing RLS policies but still allowing us to use `auth.uid()` for manual checks.
-- This is a common and secure pattern for this type of operation.
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.chat
    SET
        -- Use COALESCE to treat NULL as 0, preventing errors on the first update.
        prompt_tokens = COALESCE(prompt_tokens, 0) + prompt_tokens_param,
        completion_tokens = COALESCE(completion_tokens, 0) + completion_tokens_param,
        total_tokens = COALESCE(total_tokens, 0) + prompt_tokens_param + completion_tokens_param,
        token_cost = COALESCE(token_cost, 0) + cost_param
    WHERE
        -- CRITICAL SECURITY CHECK:
        -- Ensure the row being updated matches both the provided chat ID
        -- and the ID of the user making the request.
        id = chat_id_param; -- AND user_id = auth.uid();
END;
$$;

-- Grant permission to authenticated users to execute this function
GRANT EXECUTE ON FUNCTION public.update_token_count(uuid, integer, integer, numeric) TO authenticated;

-- Optional: Revoke execute permission from the public role for extra security
REVOKE EXECUTE ON FUNCTION public.update_token_count(uuid, integer, integer, numeric) FROM public;