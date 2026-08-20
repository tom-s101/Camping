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
        `contact_first_name.ilike.${like},contact_last_name.ilike.${like},contact_email.ilike.${like},contact_phone.ilike.${like},church_name.ilike.${like}`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const withSignedUrls = await Promise.all(
      (data ?? []).map(async (registration) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("payment-proofs")
          .createSignedUrl(registration.payment_proof_path, 60 * 60);
        return { ...registration, payment_proof_url: signed?.signedUrl ?? null };
      })
    );

    return NextResponse.json({ registrations: withSignedUrls });
  } catch (err) {
    console.error("GET /api/admin/registrations failed:", err);
    return NextResponse.json({ error: "Could not load registrations." }, { status: 500 });
  }
}
