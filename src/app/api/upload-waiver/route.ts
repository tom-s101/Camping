import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extensionForMimeType, validateUploadFile } from "@/lib/validateUpload";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("file");
  const idempotencyKey = formData.get("idempotencyKey");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || !UUID_RE.test(idempotencyKey)) {
    return NextResponse.json({ error: "Missing or invalid idempotency key." }, { status: 400 });
  }

  // Re-validate server-side -- the browser's own check is a UX convenience,
  // this is the actual security boundary (size, MIME allowlist, and a
  // magic-byte signature check so a renamed/spoofed file is still caught).
  const validationError = await validateUploadFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const path = `${idempotencyKey}/waiver.${extensionForMimeType(file.type)}`;

  try {
    const { error } = await supabaseAdmin.storage
      .from("waiver-forms")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) {
      console.error("Waiver upload to storage failed:", error);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ path }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("POST /api/upload-waiver failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
