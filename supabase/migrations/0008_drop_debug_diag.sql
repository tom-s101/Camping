-- Cleanup: the dashboard-shows-0 issue this diagnostic was added for
-- (0007_debug_diag.sql) turned out to be a stale PostgREST schema/connection
-- cache after a manual data wipe, resolved by reloading it -- not a
-- permissions or code bug. The diagnostic function is no longer needed.
drop function if exists public.debug_diag();
