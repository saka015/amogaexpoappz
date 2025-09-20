(
  (for_business_number = ((current_setting('request.headers'::text, true))::json ->> 'business_number'::text)) 
  OR (for_business_number = (auth.jwt() ->> 'business_number'::text))
  OR (for_business_number = (auth.jwt() ->> 'for_business_number'::text)) 
  OR (business_number = (auth.jwt() ->> 'for_business_number'::text)) -- remove this for update check
  OR (user_id = uid()) 
  OR ((((current_setting('request.headers'::text, true))::json ->> 'user_id'::text))::bigint = user_catalog_id) 
  OR (((current_setting('request.headers'::text, true))::json ->> 'user_role'::text) = 'admin'::text)
)

-- auth.jwt()