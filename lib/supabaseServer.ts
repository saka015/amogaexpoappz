import config from '@/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = config.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);
