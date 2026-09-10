-- Split church/district into two fields, and drop the payment method choice
-- now that payment always goes through the attendee's AY leader (no more
-- GCash/bank transfer selection on the site).

alter table public.registrations add column if not exists district text not null default '';
alter table public.registrations drop column if exists payment_method;

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
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_id uuid;
  v_group_size int;
begin
  select id into v_registration_id from public.registrations where idempotency_key = p_idempotency_key;
  if v_registration_id is not null then
    return v_registration_id;
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

  return v_registration_id;
end;
$$;

grant execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, text, text, jsonb, numeric) to anon;
