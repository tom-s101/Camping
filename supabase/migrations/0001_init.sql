-- Camp registration schema.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  contact_first_name text not null,
  contact_last_name text not null,
  contact_email text not null,
  contact_phone text not null,
  church_name text not null,
  city text not null,
  group_size int not null check (group_size >= 1),
  total_amount_php numeric not null check (total_amount_php >= 0),
  payment_method text not null check (payment_method in ('gcash', 'bank_transfer')),
  payment_reference text not null,
  payment_proof_path text not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now()
);

create index if not exists registrations_email_idx on public.registrations (contact_email);
create index if not exists registrations_phone_idx on public.registrations (contact_phone);
create index if not exists registrations_status_idx on public.registrations (payment_status);
create index if not exists registrations_created_idx on public.registrations (created_at desc);

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  age_range text not null check (age_range in ('0-5', '6-12', '13-17', '18-25', '26-40', '41-60', '61+')),
  gender text not null check (gender in ('male', 'female')),
  created_at timestamptz not null default now()
);

create index if not exists attendees_registration_idx on public.attendees (registration_id);

alter table public.registrations enable row level security;
alter table public.attendees enable row level security;
-- No anon policies are defined: the public site never reads/writes these tables
-- directly. All writes go through submit_registration() below (owned by the
-- migration role, which bypasses RLS); all dashboard reads go through the
-- server using the service_role key, which also bypasses RLS.

-- Atomic, idempotent registration submit: one round trip inserts the group
-- record and every attendee in a single transaction, so a partial failure
-- rolls back everything instead of leaving orphaned rows. Retrying the same
-- idempotency_key (e.g. after a client timeout) returns the original id
-- instead of creating a duplicate.
create or replace function public.submit_registration(
  p_idempotency_key uuid,
  p_contact_first_name text,
  p_contact_last_name text,
  p_contact_email text,
  p_contact_phone text,
  p_church_name text,
  p_city text,
  p_payment_method text,
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
    church_name, city, group_size, total_amount_php, payment_method, payment_reference, payment_proof_path
  ) values (
    p_idempotency_key, p_contact_first_name, p_contact_last_name, p_contact_email, p_contact_phone,
    p_church_name, p_city, v_group_size, p_fee_php * v_group_size, p_payment_method, p_payment_reference, p_payment_proof_path
  ) returning id into v_registration_id;

  insert into public.attendees (registration_id, first_name, last_name, age_range, gender)
  select v_registration_id, a->>'first_name', a->>'last_name', a->>'age_range', a->>'gender'
  from jsonb_array_elements(p_attendees) as a;

  return v_registration_id;
end;
$$;

grant execute on function public.submit_registration(uuid, text, text, text, text, text, text, text, text, text, jsonb, numeric) to anon;

-- Storage bucket for payment proof uploads. Private (not public), with the
-- size and mime-type allowlist enforced by Supabase Storage itself so a
-- direct API call (bypassing the site's own client-side checks) is still
-- rejected server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon can upload payment proofs" on storage.objects;
create policy "anon can upload payment proofs"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'payment-proofs');
-- No select/update/delete policy for anon: uploads are write-only from the
-- public site. Admins read proofs via signed URLs generated server-side
-- with the service_role key, which bypasses storage RLS.
