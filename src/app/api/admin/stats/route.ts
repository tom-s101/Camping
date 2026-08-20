import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: registrations, error } = await supabaseAdmin
      .from("registrations")
      .select("payment_status, total_amount_php, attendees(age_range, gender)");

    if (error) throw error;

    const stats = {
      groups: registrations?.length ?? 0,
      attendees: 0,
      paidGroups: 0,
      paidAttendees: 0,
      paidAmountPhp: 0,
      pendingGroups: 0,
      rejectedGroups: 0,
      byGender: { male: 0, female: 0 } as Record<string, number>,
      byAgeRange: {} as Record<string, number>,
    };

    for (const reg of registrations ?? []) {
      const attendeeCount = reg.attendees?.length ?? 0;
      stats.attendees += attendeeCount;
      if (reg.payment_status === "approved") {
        stats.paidGroups += 1;
        stats.paidAttendees += attendeeCount;
        stats.paidAmountPhp += Number(reg.total_amount_php ?? 0);
      } else if (reg.payment_status === "rejected") {
        stats.rejectedGroups += 1;
      } else {
        stats.pendingGroups += 1;
      }
      for (const attendee of reg.attendees ?? []) {
        if (attendee.gender) stats.byGender[attendee.gender] = (stats.byGender[attendee.gender] ?? 0) + 1;
        if (attendee.age_range) stats.byAgeRange[attendee.age_range] = (stats.byAgeRange[attendee.age_range] ?? 0) + 1;
      }
    }

    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET /api/admin/stats failed:", err);
    return NextResponse.json({ error: "Could not load stats." }, { status: 500 });
  }
}
