import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

// Server-only client using the service role key. Never import this from a
// client component — it bypasses Row Level Security entirely.
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
