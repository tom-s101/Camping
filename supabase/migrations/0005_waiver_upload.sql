-- Minors no longer get a "we'll bring a signed form" checkbox -- instead
-- the physical, filled-out parental/guardian waiver is scanned/photographed
-- and uploaded during registration, same as the old payment-proof flow.

alter table public.registrations add column if not exists waiver_form_path text;
alter table public.registrations drop column if exists agreed_minor_waiver;

-- Private bucket for waiver uploads, size/type limits enforced by Supabase
-- Storage itself (not just the browser or the API route). No anon storage
-- policy is needed here: uploads only ever go through /api/upload-waiver,
-- which uses the service_role key and so bypasses storage RLS entirely.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'waiver-forms',
  'waiver-forms',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- submit_registration() rewritten: p_agreed_minor_waiver (boolean) is
-- replaced with p_waiver_form_path (text) -- the path returned by
-- /api/upload-waiver after it validates and stores the file. Still
-- required server-side whenever any attendee is a minor.
drop function if exists public.submit_registration(uuid, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, jsonb);

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
    (a->>'age_range') = '0-12'
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

revoke execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, boolean, boolean, text, boolean, jsonb) from anon;
revoke execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, boolean, boolean, text, boolean, jsonb) from public;
grant execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, boolean, boolean, text, boolean, jsonb) to service_role;
