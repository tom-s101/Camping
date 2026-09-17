# Camp Registration Site

Registration site for a church camp meeting/retreat: a landing page (About/FAQ), a
single-page registration + payment form, and a password-protected `/dashboard`
for admins to review payments and see stats.

Placeholder event details (dates, location, theme, audience, fee) live in
`src/lib/event.ts` — edit that file once the real details are confirmed.

The district/pastor/church list used by the registration form's dropdowns
lives in `src/lib/districts.ts`, transcribed from the Area 2 district
realignment memo. **Two entries there are best-effort reads of text that was
cut off by a page break in the source scan and need to be double-checked:**
"Manresa Company" under QC-1, and "Kaysakat Mission Group" under QC-2. The
"Glenn Lagabon" / "Daniel Dela Paz" single-pastorate pairing is also an
uncertain read — confirm which one is the pastor's name and which is the
church. Edit `src/lib/districts.ts` to correct any of these.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then run
   the files in `supabase/migrations/` **in order** in the project's SQL Editor:
   - `0001_init.sql` creates the `registrations` / `attendees` tables, the
     `submit_registration()` function used for the atomic single-submit, and the
     private `payment-proofs` storage bucket (2MB limit, image/PDF only —
     enforced by Supabase itself, not just the browser).
   - `0002_district_and_payment_update.sql` splits church/district into two
     columns and drops the payment-method column (payment is now handled
     in-person through each attendee's AY leader, so there's no method to
     choose on the site).
   - `0003_camp_number_and_age_ranges.sql` assigns each attendee a permanent,
     sequential Camp ID (Camp-001, Camp-002, ...) at insert time, and updates
     the allowed age brackets to single-year granularity (13-27) for the
     youth camp.
   - `0004_pricing_shirts_agreements.sql` adds the camp-shirt add-on
     (size + per-attendee fee), the guidelines/refund/payment agreement
     checkboxes, a `compute_attendee_fee()` function that prices each
     attendee off the **database server's clock** (early bird / regular /
     standard tiers — see `src/lib/pricing.ts`), and revokes the public
     `anon` role's ability to call `submit_registration()` directly, since
     registration now always goes through the `/api/register` server route
     (needed so it can also trigger the Brevo confirmation email).
   - `0005_waiver_upload.sql` replaces the old "I'll bring a signed waiver"
     checkbox with an actual upload: adds `waiver_form_path` to
     `registrations`, drops the now-unused `agreed_minor_waiver` column, and
     creates a private `waiver-forms` storage bucket (2MB limit, image/PDF
     only, enforced by Supabase itself). `submit_registration()` now requires
     that path whenever any attendee is a minor.

3. **Copy `.env.example` to `.env.local`** and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from Project
     Settings → API in Supabase. (There's no anon key in use — the site only
     talks to Supabase from the server.)
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — the dashboard login. Defaults to
     `Admin` / `area2camp` if unset; **change these before the site goes live.**
   - `SESSION_SECRET` — any long random string, used to sign the admin session
     cookie.
   - `NEXT_PUBLIC_SITE_URL` — the site's real deployed URL. **Set this once you
     know the final domain**, or shared-link previews (Facebook, Messenger,
     iMessage, etc.) won't show the banner image correctly.
   - `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` — for the
     automated registration confirmation email. See **Email (Brevo)** below.

4. **Run it**

   ```bash
   npm run dev
   ```

   Landing page at `/`, registration at `/register`, admin dashboard at
   `/dashboard` (redirects to `/dashboard/login` if not signed in).

## How registration submission works

Payment is coordinated entirely offline through each attendee's District
President, not through the site — there's nothing to upload for payment. The
registration page collects contact info, each attendee (including an
optional camp-shirt add-on and size), the required agreement checkboxes
(camp guidelines, cancellation/transfer policy, a payment-confirmation
checkbox), and a scanned/photographed waiver form upload if the group
includes a minor, then submits it all as a single action:

1. If the group includes a minor, the browser first uploads the waiver file
   to `/api/upload-waiver`, which validates it (size, MIME type, and a
   magic-byte signature check — the same checks the old payment-proof
   upload used) and stores it in the private `waiver-forms` bucket using the
   service role key. A failed upload stops here; nothing is submitted.
2. The browser then posts the rest of the form to `/api/register` (never
   directly to Supabase) — this is what lets the server also fire the
   confirmation email and re-validate everything the client already checked.
3. That route calls the `submit_registration()` Postgres function with the
   Supabase **service role** key. The function computes each attendee's fee
   itself from `now()` (the database server's clock, not the registrant's
   device) via `compute_attendee_fee()`, inserts the registration and every
   attendee in one transaction, and re-checks the required agreement flags
   server-side.
4. A client-generated idempotency key is sent with the request, tied to a
   unique constraint in the database. Retrying after a timeout returns the
   original registration instead of creating a duplicate.
5. On success, the route fires a Brevo transactional email to the
   registrant (best-effort — a failed email never fails the registration
   itself).

### Pricing tiers

Tier cutoffs and prices live in `src/lib/pricing.ts` (client-side estimate
only) and are mirrored in `compute_attendee_fee()` in
`supabase/migrations/0004_pricing_shirts_agreements.sql` (the authoritative
calculation). **Edit both places** if the dates or prices change. The camp
shirt add-on closes automatically once the Regular-rate cutoff passes.

### Parental/guardian waiver

A minor is detected automatically from an attendee's age range (`0-12`, or a
single-year value under 18). Their parent/guardian fills out and signs a
physical waiver form (distributed by the church/district, not the site), and
the registrant uploads a photo or scan of it via `/api/upload-waiver`. The
upload has the same guardrails the old payment-proof upload used: 2MB limit,
JPG/PNG/WEBP/PDF only, magic-byte signature check client- and server-side,
and the size/type limits are also enforced by the Supabase Storage bucket
itself. Admins can view or open the uploaded form from the registration's
row in `/dashboard`, and a `Minor — No Waiver` badge flags any registration
with a minor that hasn't uploaded one yet.

## Email (Brevo)

Registration confirmation emails go through
[Brevo](https://www.brevo.com)'s transactional email API
(`src/lib/brevo.ts`). Setup is entirely on Brevo's dashboard — there's no CLI
or SQL involved:

1. Create a Brevo account (or use an existing one) and verify a sender email
   or domain under **Senders, Domains & Dedicated IPs**.
2. Generate an API key under **SMTP & API → API Keys**.
3. Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (must match a verified sender),
   and `BREVO_SENDER_NAME` in your environment (`.env.local` locally, or your
   host's environment variables in production).
4. If `BREVO_API_KEY` is unset, `/api/register` still works — it just skips
   sending the email (logging a warning) instead of failing the registration.

To confirm your API key works without submitting a real registration, run:

```bash
curl -s -X POST https://api.brevo.com/v3/smtp/email \
  -H "api-key: $BREVO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sender":{"email":"'"$BREVO_SENDER_EMAIL"'","name":"Sanctuary Camp 2026"},"to":[{"email":"you@example.com"}],"subject":"Brevo test","htmlContent":"<p>It works.</p>"}'
```

A `messageId` in the response means it sent; anything else (401/400) means
the key or sender isn't set up correctly yet.

## Known limitations

- The admin login is a single shared username/password, not per-admin
  accounts.
- `/api/register` validates its input server-side but has no rate limiting;
  add one (e.g. at the CDN/edge layer) if abuse becomes a concern.
- Registrations submitted before this update may still have a
  `payment_reference` / `payment_proof_path` on file (from the old
  upload-a-screenshot flow) — the dashboard still displays those for
  historical rows, but new registrations no longer collect either.
