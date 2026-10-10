-- The dashboard has now twice appeared to be missing rows that provably
-- exist in the database (see 0007/0008): PostgREST keeps its own cached
-- snapshot of the schema/connections and can fall out of sync with the live
-- database -- most often after a change made outside `supabase db push`
-- (the SQL editor, a manual table edit/wipe in the Studio, etc.) -- and will
-- then silently return incomplete results with no error at all, which is
-- indistinguishable from a real bug from the app's side.
--
-- This is Supabase's own documented fix: have Postgres tell PostgREST to
-- reload whenever the schema changes, via NOTIFY on the `pgrst` channel, so
-- this class of bug can't recur silently again.
create or replace function public.pgrst_watch()
returns event_trigger
language plpgsql
as $$
begin
  notify pgrst, 'reload schema';
end;
$$;

drop event trigger if exists pgrst_watch;
create event trigger pgrst_watch
  on ddl_command_end
  execute procedure public.pgrst_watch();

-- Also callable on demand as a cheap, safe self-heal: the app calls this
-- right after writes (new registration, delete, review) so that even a
-- cache staleness with no DDL trigger of its own (e.g. left over from an
-- earlier manual fix that regressed) clears itself up within moments
-- instead of needing another manual "reload schema" click in the Studio.
create or replace function public.reload_postgrest_schema()
returns void
language sql
security definer
set search_path = public
as $$
  select pg_notify('pgrst', 'reload schema');
$$;

grant execute on function public.reload_postgrest_schema() to service_role;
