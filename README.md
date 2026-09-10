# Camp Registration Site

Registration site for a church camp meeting/retreat: a landing page (About/FAQ), a
single-page registration + payment form, and a password-protected `/dashboard`
for admins to review payments and see stats.

Placeholder event details (dates, location, theme, churches invited, fees, payment
account numbers) live in `src/lib/event.ts` — edit that file once the real details
are confirmed.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then run
   `supabase/migrations/0001_init.sql` in the project's SQL Editor. This creates the
   `registrations` / `attendees` tables, the `submit_registration()` function used
   for the atomic single-submit, and the private `payment-proofs` storage bucket
   (2MB limit, image/PDF only — enforced by Supabase itself, not just the browser).

3. **Copy `.env.example` to `.env.local`** and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
     from Project Settings → API in Supabase.
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — the dashboard login. Defaults to
     `Admin` / `area2camp` if unset; **change these before the site goes live.**
   - `SESSION_SECRET` — any long random string, used to sign the admin session
     cookie.

4. **Run it**

   ```bash
   npm run dev
   ```

   Landing page at `/`, registration at `/register`, admin dashboard at
   `/dashboard` (redirects to `/dashboard/login` if not signed in).

## How registration submission works

The registration page collects everything (contact info, each attendee, payment
method, reference number, and a proof-of-payment file) and submits it as a single
action:

1. The proof file is uploaded to Supabase Storage first (required to get a path
   for the database row).
2. One Postgres RPC call (`submit_registration`) then inserts the registration
   and every attendee in a single transaction — so a partial failure rolls back
   completely instead of leaving orphaned rows.
3. A client-generated idempotency key is sent with both calls, tied to a unique
   constraint in the database. Retrying after a timeout re-uses the same file
   path and returns the original registration instead of creating a duplicate.

## Known limitations

- Upload guardrails check file size (2MB), MIME type, and magic-byte signature
  client-side, and the Supabase Storage bucket itself enforces size/type limits
  server-side regardless of the client. There's no virus-scanning pipeline —
  add one (e.g. a storage webhook to an AV API) if that's needed.
- The admin login is a single shared username/password, not per-admin accounts.
