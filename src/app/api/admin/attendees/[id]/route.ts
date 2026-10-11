import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, reloadPostgrestSchema } from "@/lib/supabase/admin";
import { SHIRT_SIZES } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const SHIRT_SIZE_SET = new Set<string>(SHIRT_SIZES);

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const shirtSize = body?.shirt_size;
  if (typeof shirtSize !== "string" || !SHIRT_SIZE_SET.has(shirtSize)) {
    return NextResponse.json({ error: `shirt_size must be one of ${SHIRT_SIZES.join(", ")}.` }, { status: 400 });
  }

  try {
    // Only attendees who ordered a shirt have a size to change; this never
    // adds a shirt (that would change what they owe).
    const { data, error } = await supabaseAdmin
      .from("attendees")
      .update({ shirt_size: shirtSize })
      .eq("id", params.id)
      .eq("wants_shirt", true)
      .select("id, shirt_size");
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Attendee not found or didn't order a shirt." }, { status: 404 });
    }

    await reloadPostgrestSchema();
    return NextResponse.json({ ok: true, shirt_size: data[0].shirt_size });
  } catch (err) {
    console.error(`PATCH /api/admin/attendees/${params.id} failed:`, err);
    return NextResponse.json({ error: "Could not update that shirt size." }, { status: 500 });
  }
}
