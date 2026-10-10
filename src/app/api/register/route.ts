import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, reloadPostgrestSchema } from "@/lib/supabase/admin";
import { sendRegistrationConfirmationEmail } from "@/lib/brevo";
import { AGE_RANGES } from "@/lib/event";
import { SHIRT_SIZES } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const MAX_ATTENDEES = 30;
const MAX_TEXT_LENGTH = 200;
const AGE_RANGE_SET = new Set<string>(AGE_RANGES);
const SHIRT_SIZE_SET = new Set<string>(SHIRT_SIZES);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AttendeeInput = {
  first_name: string;
  last_name: string;
  age_range: string;
  gender: string;
  wants_shirt: boolean;
  shirt_size: string | null;
};

function isNonEmptyString(value: unknown, maxLength = MAX_TEXT_LENGTH): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function validateAttendee(a: unknown): a is AttendeeInput {
  if (!a || typeof a !== "object") return false;
  const rec = a as Record<string, unknown>;
  if (!isNonEmptyString(rec.first_name) || !isNonEmptyString(rec.last_name)) return false;
  if (typeof rec.age_range !== "string" || !AGE_RANGE_SET.has(rec.age_range)) return false;
  if (rec.gender !== "male" && rec.gender !== "female") return false;
  if (typeof rec.wants_shirt !== "boolean") return false;
  if (rec.wants_shirt) {
    if (typeof rec.shirt_size !== "string" || !SHIRT_SIZE_SET.has(rec.shirt_size)) return false;
  } else if (rec.shirt_size !== null && rec.shirt_size !== undefined && rec.shirt_size !== "") {
    return false;
  }
  return true;
}

function validateBody(body: unknown) {
  if (!body || typeof body !== "object") return "Invalid request body.";
  const b = body as Record<string, unknown>;

  if (typeof b.idempotencyKey !== "string" || !UUID_RE.test(b.idempotencyKey)) {
    return "Missing or invalid idempotency key.";
  }
  for (const field of ["firstName", "lastName", "email", "phone", "district", "churchName", "city"]) {
    if (!isNonEmptyString(b[field])) return `Missing or invalid field: ${field}.`;
  }
  if (!/^\S+@\S+\.\S+$/.test(b.email as string)) return "Please enter a valid email address.";
  for (const field of ["agreedGuidelines", "agreedRefundPolicy", "confirmedPayment"]) {
    if (b[field] !== true) return "You must agree to all required terms before submitting.";
  }
  if (b.waiverFormPath !== null && !isNonEmptyString(b.waiverFormPath, 300)) {
    return "Missing or invalid waiver form reference.";
  }
  if (!Array.isArray(b.attendees) || b.attendees.length < 1 || b.attendees.length > MAX_ATTENDEES) {
    return "At least one attendee is required.";
  }
  if (!b.attendees.every(validateAttendee)) return "One or more attendees have invalid or missing details.";
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const validationError = validateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const b = body as {
    idempotencyKey: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    district: string;
    churchName: string;
    city: string;
    agreedGuidelines: boolean;
    agreedRefundPolicy: boolean;
    waiverFormPath: string | null;
    confirmedPayment: boolean;
    attendees: AttendeeInput[];
  };

  try {
    const { data, error } = await supabaseAdmin.rpc("submit_registration", {
      p_idempotency_key: b.idempotencyKey,
      p_contact_first_name: b.firstName,
      p_contact_last_name: b.lastName,
      p_contact_email: b.email,
      p_contact_phone: b.phone,
      p_district: b.district,
      p_church_name: b.churchName,
      p_city: b.city,
      p_agreed_guidelines: b.agreedGuidelines,
      p_agreed_refund_policy: b.agreedRefundPolicy,
      p_waiver_form_path: b.waiverFormPath,
      p_confirmed_payment: b.confirmedPayment,
      p_attendees: b.attendees.map((a) => ({
        first_name: a.first_name,
        last_name: a.last_name,
        age_range: a.age_range,
        gender: a.gender,
        wants_shirt: a.wants_shirt,
        shirt_size: a.shirt_size,
      })),
    });

    if (error) {
      console.error("submit_registration RPC failed:", error);
      // Only forward the message for the RPC's own intentional validation
      // errors (Postgres code P0001, from a plain `raise exception` in
      // plpgsql) -- anything else (connection failures, constraint
      // violations, etc.) gets a safe generic message instead of leaking
      // internal error details to the client.
      const message = error.code === "P0001" ? error.message : "Something went wrong. Please try again.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = data as { registration_id: string; camp_numbers: number[]; total_amount_php: number };

    // Best-effort: make sure the admin dashboard's queries can see this new
    // row immediately, even if PostgREST's schema cache has gone stale.
    await reloadPostgrestSchema();

    // Awaited (not fire-and-forget): on serverless platforms the runtime can
    // freeze or tear down right after the response is sent, which would
    // kill an in-flight fetch() to Brevo before it ever left the server.
    // Still best-effort -- a thrown/rejected send is caught here so a Brevo
    // outage never fails the registration itself.
    try {
      await sendRegistrationConfirmationEmail({
        toEmail: b.email,
        toName: `${b.firstName} ${b.lastName}`,
        campNumbers: result.camp_numbers ?? [],
        totalAmountPhp: Number(result.total_amount_php ?? 0),
        district: b.district,
        churchName: b.churchName,
      });
      console.log(`Brevo confirmation email sent to ${b.email} for registration ${result.registration_id}.`);
    } catch (err) {
      console.error("Brevo confirmation email failed:", err);
    }

    return NextResponse.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("POST /api/register failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
