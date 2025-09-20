import { z } from 'zod';

export const storeUserSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  user_email: z.string().email("A valid email is required"),
  // user_mobile: z.string().min(10, "A valid mobile number is required"),
  
  // Roles will be an array of strings
  roles_json: z.array(z.string()).min(1, "At least one role is required"),

  // Business info is optional but will be auto-filled
  business_name: z.string().nullish(),
  business_address_1: z.string().nullish(),
  business_address_2: z.string().nullish(),
  business_city: z.string().nullish(),
  business_state: z.string().nullish(),
  business_postcode: z.string().nullish(),
  business_country: z.string().nullish(),

  status: z.enum(["Active","Inactive"])
});

export type StoreUserFormData = z.infer<typeof storeUserSchema>;