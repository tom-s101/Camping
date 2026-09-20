import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

// Next.js patches the global fetch() and stores GET responses in its
// server-side Data Cache. supabase-js never passes a cache option of its
// own, so every read through this client was being cached indefinitely --
// and that cache is keyed per deployment, so the dashboard showed a
// snapshot frozen at deploy time: deleted registrations kept showing up,
// new ones never appeared, and only a redeploy "fixed" it. Neither
// `export const dynamic = "force-dynamic"` on the route nor `cache:
// "no-store"` on the browser's fetch prevents this -- the caching happens
// on the server, underneath the route handler. Opting the client's own
// fetch out of the Data Cache is what actually keeps reads live.
const uncachedFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

// Server-only client using the service role key. Never import this from a
// client component — it bypasses Row Level Security entirely.
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
  global: { fetch: uncachedFetch },
});

// PostgREST keeps its own cached snapshot of the schema and can fall out of
// sync with the live database (see supabase/migrations/0009_*), which then
// silently returns incomplete results with no error -- rows that provably
// exist just don't show up. Call this best-effort after any write so a
// stale cache clears itself instead of quietly hiding real data. It's a
// no-op ping (NOTIFY), safe to call unconditionally and to ignore failures
// from (e.g. before migration 0009 has been applied).
export async function reloadPostgrestSchema() {
  try {
    await supabaseAdmin.rpc("reload_postgrest_schema");
  } catch (err) {
    console.error("reload_postgrest_schema RPC failed:", err);
  }
}
