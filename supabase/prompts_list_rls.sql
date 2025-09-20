(
  (for_business_number = ((current_setting('request.headers'::text, true))::json ->> 'business_number'::text)) 
  OR (for_business_number = (auth.jwt() ->> 'business_number'::text))
  OR (for_business_number = (auth.jwt() ->> 'for_business_number'::text)) 
  OR (business_number = (auth.jwt() ->> 'for_business_number'::text))
  -- OR (user_id = auth.uid()) 
  OR (((auth.jwt() ->> 'user_id')::bigint = created_user_id))
  OR (((current_setting('request.headers'::text, true))::json ->> 'user_role'::text) = 'admin'::text)
)

-- auth.jwt()