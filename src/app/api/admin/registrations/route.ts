import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  try {
    let query = supabaseAdmin
      .from("registrations")
      .select("*, attendees(*)")
      .order("created_at", { ascending: false });

    if (q) {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      query = query.or(
        `contact_first_name.ilike.${like},contact_last_name.ilike.${like},contact_email.ilike.${like},contact_phone.ilike.${like},church_name.ilike.${like},district.ilike.${like}`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    // Only pre-2026-migration registrations still have a payment_proof_path
    // (uploads were replaced by a payment-confirmation checkbox); skip the
    // storage call entirely for everything else.
    const withSignedUrls = await Promise.all(
      (data ?? []).map(async (registration) => {
        const [paymentProofUrl, waiverFormUrl] = await Promise.all([
          registration.payment_proof_path
            ? supabaseAdmin.storage
                .from("payment-proofs")
                .createSignedUrl(registration.payment_proof_path, 60 * 60)
                .then(({ data: signed }) => signed?.signedUrl ?? null)
            : null,
          registration.waiver_form_path
            ? supabaseAdmin.storage
                .from("waiver-forms")
                .createSignedUrl(registration.waiver_form_path, 60 * 60)
                .then(({ data: signed }) => signed?.signedUrl ?? null)
            : null,
        ]);
        return { ...registration, payment_proof_url: paymentProofUrl, waiver_form_url: waiverFormUrl };
      })
    );

    return NextResponse.json(
      { registrations: withSignedUrls },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/admin/registrations failed:", err);
    return NextResponse.json({ error: "Could not load registrations." }, { status: 500 });
  }
}
