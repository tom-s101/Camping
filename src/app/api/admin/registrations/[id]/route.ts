import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: registration, error: fetchError } = await supabaseAdmin
      .from("registrations")
      .select("payment_proof_path, waiver_form_path")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!registration) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    if (registration.payment_proof_path) {
      await supabaseAdmin.storage.from("payment-proofs").remove([registration.payment_proof_path]);
    }
    if (registration.waiver_form_path) {
      await supabaseAdmin.storage.from("waiver-forms").remove([registration.waiver_form_path]);
    }

    const { error: deleteError } = await supabaseAdmin.from("registrations").delete().eq("id", params.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/admin/registrations/${params.id} failed:`, err);
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Could not delete that registration: ${message}` }, { status: 500 });
  }
}
