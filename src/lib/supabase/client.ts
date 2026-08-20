import { createClient } from "@supabase/supabase-js";

// Falls back to a placeholder so the client can be constructed at build/
// import time even before real project credentials are configured; any
// actual request made with the placeholder will simply fail at runtime.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
