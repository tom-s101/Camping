-- Temporary diagnostic function used to root-cause a live discrepancy where
-- direct SQL (run as service_role) sees registration rows, but the deployed
-- app's REST-style queries (also as service_role, via supabaseAdmin) do not.
-- Safe to drop once the mismatch is resolved -- see 0008 (if added) for the
-- cleanup, or just run: drop function if exists public.debug_diag();
--
-- security invoker (the default, listed explicitly for clarity) means this
-- runs AS WHATEVER ROLE CALLS IT -- i.e. exactly the same identity/session
-- context that the deployed app's queries run under, unlike the app's own
-- submit_registration()/compute_attendee_fee() which are security definer
-- and therefore always run as the function owner regardless of caller.
create or replace function public.debug_diag()
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_reg_count bigint;
  v_att_count bigint;
  v_search_path text;
  v_jwt_role text;
  v_reg_relkind text;
begin
  select count(*) into v_reg_count from public.registrations;
  select count(*) into v_att_count from public.attendees;
  show search_path into v_search_path;

  begin
    v_jwt_role := current_setting('request.jwt.claims', true)::json ->> 'role';
  exception when others then
    v_jwt_role := null;
  end;

  select relkind into v_reg_relkind
  from pg_class
  where relname = 'registrations' and relnamespace = 'public'::regnamespace;

  return jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'search_path', v_search_path,
    'jwt_role', v_jwt_role,
    'registrations_count', v_reg_count,
    'attendees_count', v_att_count,
    'registrations_relkind', v_reg_relkind
  );
end;
$$;

grant execute on function public.debug_diag() to service_role;
