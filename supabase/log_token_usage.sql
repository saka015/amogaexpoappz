CREATE OR REPLACE FUNCTION log_token_usage( 
    model_name_param text,
    prompt_tokens_param integer,
    completion_tokens_param integer,
    cost_param numeric,
    business_number_param text DEFAULT NULL,
    source_param text DEFAULT NULL,
    user_id_param integer DEFAULT NULL,
    chat_id_param uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.token_usage_logs (
        user_id,
        chat_id,
        model_name,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        business_number,
        cost,
        source
    )
    VALUES (
        user_id_param,
        chat_id_param,
        model_name_param,
        prompt_tokens_param,
        completion_tokens_param,
        prompt_tokens_param + completion_tokens_param,
        business_number_param,
        cost_param,
        source_param
    );
END;
$$;