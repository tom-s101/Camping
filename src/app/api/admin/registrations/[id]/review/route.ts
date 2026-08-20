import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("registrations")
      .update({
        payment_status: action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        reviewer_note: typeof body?.note === "string" ? body.note.slice(0, 500) : null,
      })
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`POST /api/admin/registrations/${params.id}/review failed:`, err);
    return NextResponse.json({ error: "Could not update that registration." }, { status: 500 });
  }
}
