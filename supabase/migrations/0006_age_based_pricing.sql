-- Age-based pricing: children 6 and below attend free, ages 7-9 pay half
-- the listed rate, and age 10+ pays the full rate. The camp shirt add-on
-- stays a flat +250 surcharge regardless of age. This replaces the old
-- catch-all '0-12' age bracket with three granular brackets so the fee
-- calculation (and minor detection) can key off them directly.

alter table public.attendees drop constraint if exists attendees_age_range_check;
alter table public.attendees add constraint attendees_age_range_check check (
  age_range in (
    '0-6', '7-9', '10-12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
    '24', '25', '26', '27', '28-35', '36+'
  )
) not valid;

-- compute_attendee_fee() now takes the attendee's age_range too. The base
-- (no-shirt) rate is age-adjusted; the shirt surcharge is flat (250) on top
-- regardless of age, since it's a physical-goods cost, not a camp fee.
drop function if exists public.compute_attendee_fee(boolean);

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
  elsif v_today <= date '2026-10-08' then
    v_base := 600;
  else
    if p_wants_shirt then
      raise exception 'The camp shirt add-on is no longer available; please register without a shirt.';
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

-- submit_registration() rewritten only in body: has_minor now also checks
-- the new child age brackets, and the fee computation passes age_range
-- through to compute_attendee_fee().
create or replace function public.submit_registration(
  p_idempotency_key uuid,
  p_contact_first_name text,
  p_contact_last_name text,
  p_contact_email text,
  p_contact_phone text,
  p_district text,
  p_church_name text,
  p_city text,
  p_agreed_guidelines boolean,
  p_agreed_refund_policy boolean,
  p_waiver_form_path text,
  p_confirmed_payment boolean,
  p_attendees jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_id uuid;
  v_group_size int;
  v_has_minor boolean;
  v_total numeric := 0;
  v_camp_numbers int[];
  v_attendee jsonb;
  v_fee numeric;
  v_age_range text;
begin
  select id into v_registration_id from public.registrations where idempotency_key = p_idempotency_key;
  if v_registration_id is not null then
    select array_agg(camp_number order by camp_number), coalesce(sum(fee_php), 0)
      into v_camp_numbers, v_total
      from public.attendees where registration_id = v_registration_id;
    return jsonb_build_object('registration_id', v_registration_id, 'camp_numbers', v_camp_numbers, 'total_amount_php', v_total);
  end if;

  select jsonb_array_length(p_attendees) into v_group_size;
  if v_group_size is null or v_group_size < 1 then
    raise exception 'At least one attendee is required';
  end if;
  if length(trim(p_contact_email)) = 0 or p_contact_email not like '%_@_%.__%' then
    raise exception 'A valid contact email is required';
  end if;
  if not coalesce(p_agreed_guidelines, false) or not coalesce(p_agreed_refund_policy, false) or not coalesce(p_confirmed_payment, false) then
    raise exception 'You must agree to the camp guidelines, the cancellation/refund policy, and confirm your payment before submitting.';
  end if;

  select bool_or(
    (a->>'age_range') in ('0-6', '7-9', '10-12')
    or ((a->>'age_range') ~ '^[0-9]+$' and (a->>'age_range')::int < 18)
  ) into v_has_minor
  from jsonb_array_elements(p_attendees) as a;

  if v_has_minor and (p_waiver_form_path is null or length(trim(p_waiver_form_path)) = 0) then
    raise exception 'Please upload the signed parental/guardian waiver form for the minor(s) in your group.';
  end if;

  insert into public.registrations (
    idempotency_key, contact_first_name, contact_last_name, contact_email, contact_phone,
    district, church_name, city, group_size, total_amount_php,
    agreed_guidelines, agreed_refund_policy, waiver_form_path, confirmed_payment, has_minor
  ) values (
    p_idempotency_key, p_contact_first_name, p_contact_last_name, p_contact_email, p_contact_phone,
    p_district, p_church_name, p_city, v_group_size, 0,
    coalesce(p_agreed_guidelines, false), coalesce(p_agreed_refund_policy, false),
    nullif(trim(p_waiver_form_path), ''), coalesce(p_confirmed_payment, false), coalesce(v_has_minor, false)
  ) returning id into v_registration_id;

  for v_attendee in select * from jsonb_array_elements(p_attendees)
  loop
    v_age_range := v_attendee->>'age_range';
    v_fee := public.compute_attendee_fee(coalesce((v_attendee->>'wants_shirt')::boolean, false), v_age_range);
    v_total := v_total + v_fee;

    insert into public.attendees (
      registration_id, first_name, last_name, age_range, gender, wants_shirt, shirt_size, fee_php
    ) values (
      v_registration_id,
      v_attendee->>'first_name',
      v_attendee->>'last_name',
      v_age_range,
      v_attendee->>'gender',
      coalesce((v_attendee->>'wants_shirt')::boolean, false),
      nullif(v_attendee->>'shirt_size', ''),
      v_fee
    );
  end loop;

  update public.registrations set total_amount_php = v_total where id = v_registration_id;

  select array_agg(camp_number order by camp_number) into v_camp_numbers
  from public.attendees where registration_id = v_registration_id;

  return jsonb_build_object('registration_id', v_registration_id, 'camp_numbers', v_camp_numbers, 'total_amount_php', v_total);
end;
$$;
