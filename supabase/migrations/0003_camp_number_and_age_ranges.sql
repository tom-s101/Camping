-- 1. Assign each attendee a permanent, sequential Camp ID (Camp-001, Camp-002, ...)
-- at insert time, so the number shown on the registrant's success page always
-- matches what later appears in the admin Excel export.

create sequence if not exists public.camp_number_seq start 1;

alter table public.attendees
  add column if not exists camp_number int not null default nextval('public.camp_number_seq');

create unique index if not exists attendees_camp_number_idx on public.attendees (camp_number);

-- 2. Youth-specific age brackets: single-year granularity from 13-27, banded
-- elsewhere. NOT VALID so it doesn't fail on any existing rows already using
-- the old bands (0-5, 6-12, 26-40, etc.) -- it only applies to new/changed rows.
alter table public.attendees drop constraint if exists attendees_age_range_check;
alter table public.attendees add constraint attendees_age_range_check check (
  age_range in (
    '0-12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
    '24', '25', '26', '27', '28-35', '36+'
  )
) not valid;

-- 3. submit_registration() now returns the registration id together with the
-- camp_number(s) assigned to its attendees, so the client can show them
-- immediately on the success page.
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
  p_payment_reference text,
  p_payment_proof_path text,
  p_attendees jsonb,
  p_fee_php numeric default 700
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_id uuid;
  v_group_size int;
  v_camp_numbers int[];
begin
  select id into v_registration_id from public.registrations where idempotency_key = p_idempotency_key;
  if v_registration_id is not null then
    select array_agg(camp_number order by camp_number) into v_camp_numbers
    from public.attendees where registration_id = v_registration_id;
    return jsonb_build_object('registration_id', v_registration_id, 'camp_numbers', v_camp_numbers);
  end if;

  select jsonb_array_length(p_attendees) into v_group_size;
  if v_group_size is null or v_group_size < 1 then
    raise exception 'At least one attendee is required';
  end if;
  if length(trim(p_contact_email)) = 0 or p_contact_email not like '%_@_%.__%' then
    raise exception 'A valid contact email is required';
  end if;

  insert into public.registrations (
    idempotency_key, contact_first_name, contact_last_name, contact_email, contact_phone,
    district, church_name, city, group_size, total_amount_php, payment_reference, payment_proof_path
  ) values (
    p_idempotency_key, p_contact_first_name, p_contact_last_name, p_contact_email, p_contact_phone,
    p_district, p_church_name, p_city, v_group_size, p_fee_php * v_group_size, p_payment_reference, p_payment_proof_path
  ) returning id into v_registration_id;

  insert into public.attendees (registration_id, first_name, last_name, age_range, gender)
  select v_registration_id, a->>'first_name', a->>'last_name', a->>'age_range', a->>'gender'
  from jsonb_array_elements(p_attendees) as a;

  select array_agg(camp_number order by camp_number) into v_camp_numbers
  from public.attendees where registration_id = v_registration_id;

  return jsonb_build_object('registration_id', v_registration_id, 'camp_numbers', v_camp_numbers);
end;
$$;

grant execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, text, text, jsonb, numeric) to anon;
