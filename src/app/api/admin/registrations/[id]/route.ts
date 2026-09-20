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

    // Select the deleted row back so we know the delete actually removed
    // something instead of trusting a null error, which Postgres/PostgREST
    // also returns for a delete that matched zero rows.
    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("registrations")
      .delete()
      .eq("id", params.id)
      .select("id");
    if (deleteError) throw deleteError;
    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: "Registration was already removed." }, { status: 404 });
    }

    // Row is already gone; storage cleanup is best-effort so a network
    // hiccup here shouldn't make the client think the delete failed.
    try {
      if (registration.payment_proof_path) {
        await supabaseAdmin.storage.from("payment-proofs").remove([registration.payment_proof_path]);
      }
      if (registration.waiver_form_path) {
        await supabaseAdmin.storage.from("waiver-forms").remove([registration.waiver_form_path]);
      }
    } catch (storageErr) {
      console.error(`Storage cleanup for registration ${params.id} failed:`, storageErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/admin/registrations/${params.id} failed:`, err);
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Could not delete that registration: ${message}` }, { status: 500 });
  }
}
