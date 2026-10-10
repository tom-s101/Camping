-- After Early Bird, the camp shirt add-on (Regular rate) is only open for a
-- 24-hour window: 2026-10-10 20:00 to 2026-10-11 20:00, Philippine time.
-- Keep SHIRT_OPEN_AT / SHIRT_CUTOFF_AT in src/lib/pricing.ts in sync.

create or replace function public.compute_attendee_fee(p_wants_shirt boolean, p_age_range text)
returns numeric
language plpgsql
stable
as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_base numeric;
  v_multiplier numeric;
  v_shirt_surcharge constant numeric := 250;
begin
  if v_today <= date '2026-09-30' then
    v_base := 500;
  else
    if p_wants_shirt and not (
      now() >= timestamptz '2026-10-10 20:00:00+08'
      and now() < timestamptz '2026-10-11 20:00:00+08'
    ) then
      raise exception 'The camp shirt add-on is only available from October 10, 8:00 PM to October 11, 8:00 PM (PH time); please register without a shirt.';
    end if;
    v_base := 600;
  end if;

  if p_age_range = '0-6' then
    v_multiplier := 0;
  elsif p_age_range = '7-9' then
    v_multiplier := 0.5;
  else
    v_multiplier := 1;
  end if;

  return round(v_base * v_multiplier) + case when p_wants_shirt then v_shirt_surcharge else 0 end;
end;
$$;

grant execute on function public.compute_attendee_fee(boolean, text) to service_role;
