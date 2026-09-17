-- 1. Camp shirt add-on: each attendee can opt in with a size, and the fee
-- actually charged is recorded per attendee (so old rows keep whatever they
-- were charged even as pricing tiers change later).
alter table public.attendees add column if not exists wants_shirt boolean not null default false;
alter table public.attendees add column if not exists shirt_size text;
alter table public.attendees add column if not exists fee_php numeric;

alter table public.attendees drop constraint if exists attendees_shirt_size_check;
alter table public.attendees add constraint attendees_shirt_size_check check (
  shirt_size is null or shirt_size in ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL')
);

-- 2. Consent/agreement + payment-confirmation fields, replacing the old
-- upload-a-screenshot flow. Payment is now coordinated entirely through each
-- attendee's District President, so there is nothing to upload or reference.
alter table public.registrations add column if not exists agreed_guidelines boolean not null default false;
alter table public.registrations add column if not exists agreed_refund_policy boolean not null default false;
alter table public.registrations add column if not exists agreed_minor_waiver boolean not null default false;
alter table public.registrations add column if not exists confirmed_payment boolean not null default false;
alter table public.registrations add column if not exists has_minor boolean not null default false;

-- payment_reference / payment_proof_path are no longer collected from new
-- registrations; relax them instead of dropping so historical rows are kept.
alter table public.registrations alter column payment_reference drop not null;
alter table public.registrations alter column payment_proof_path drop not null;

-- 3. Fee calculation, driven entirely by the database server's clock so a
-- registrant's device clock can never be used to get a lower price. Tiers:
--   <= 2026-09-30            : Early Bird  (500 no shirt / 750 w/ shirt)
--   2026-10-01..2026-10-08   : Regular w/ shirt (850) or Standard no shirt (600)
--   >  2026-10-08            : Standard no shirt only (600); shirt add-on closed
create or replace function public.compute_attendee_fee(p_wants_shirt boolean)
returns numeric
language plpgsql
stable
as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  if v_today <= date '2026-09-30' then
    return case when p_wants_shirt then 750 else 500 end;
  elsif v_today <= date '2026-10-08' then
    return case when p_wants_shirt then 850 else 600 end;
  else
    if p_wants_shirt then
      raise exception 'The camp shirt add-on is no longer available; please register without a shirt.';
    end if;
    return 600;
  end if;
end;
$$;

-- 4. submit_registration() rewritten: fee/total is computed server-side from
-- each attendee's shirt choice (ignoring any client-supplied amount), and the
-- required agreement checkboxes are validated again here as a second line of
-- defense even though the UI already gates on them.
drop function if exists public.submit_registration(uuid, text, text, text, text, text, text, text, text, text, jsonb, numeric);

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
  p_agreed_minor_waiver boolean,
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
    (a->>'age_range') = '0-12'
    or ((a->>'age_range') ~ '^[0-9]+$' and (a->>'age_range')::int < 18)
  ) into v_has_minor
  from jsonb_array_elements(p_attendees) as a;

  if v_has_minor and not coalesce(p_agreed_minor_waiver, false) then
    raise exception 'You must confirm the signed parental/guardian waiver for the minor(s) in your group.';
  end if;

  insert into public.registrations (
    idempotency_key, contact_first_name, contact_last_name, contact_email, contact_phone,
    district, church_name, city, group_size, total_amount_php,
    agreed_guidelines, agreed_refund_policy, agreed_minor_waiver, confirmed_payment, has_minor
  ) values (
    p_idempotency_key, p_contact_first_name, p_contact_last_name, p_contact_email, p_contact_phone,
    p_district, p_church_name, p_city, v_group_size, 0,
    coalesce(p_agreed_guidelines, false), coalesce(p_agreed_refund_policy, false),
    coalesce(p_agreed_minor_waiver, false), coalesce(p_confirmed_payment, false), coalesce(v_has_minor, false)
  ) returning id into v_registration_id;

  for v_attendee in select * from jsonb_array_elements(p_attendees)
  loop
    v_age_range := v_attendee->>'age_range';
    v_fee := public.compute_attendee_fee(coalesce((v_attendee->>'wants_shirt')::boolean, false));
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

-- 5. This RPC is now only ever called from the server (the /api/register
-- route, using the service_role key) so it can trigger the confirmation
-- email in the same request. Revoking anon's execute grant means the public
-- anon key -- which is necessarily exposed in the browser -- can no longer
-- be used to call this function directly, bypassing the site's validation.
revoke execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, jsonb) from anon;
revoke execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, jsonb) from public;
grant execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, jsonb) to service_role;
grant execute on function public.compute_attendee_fee(boolean) to service_role;
