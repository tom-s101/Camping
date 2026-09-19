import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function serializeError(error: { message: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return null;
  return { message: error.message, code: error.code ?? null, details: error.details ?? null, hint: error.hint ?? null };
}

export async function GET() {
  const result: Record<string, unknown> = {};

  const { data: diag, error: diagError } = await supabaseAdmin.rpc("debug_diag");
  result.sqlLevelDiagnostic = diag ?? null;
  result.sqlLevelDiagnosticError = serializeError(diagError);

  const {
    data: regRows,
    error: regError,
    count: regCount,
  } = await supabaseAdmin.from("registrations").select("id", { count: "exact" });
  result.restStyleSelect = {
    rowsReturned: regRows?.length ?? null,
    exactCount: regCount ?? null,
    error: serializeError(regError),
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  result.deployedEnv = {
    supabaseProjectRef: url.replace(/^https?:\/\//, "").split(".")[0] || null,
    serviceRoleKeyPrefix: serviceKey ? serviceKey.slice(0, 12) : null,
    serviceRoleKeyLength: serviceKey.length || null,
  };

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
