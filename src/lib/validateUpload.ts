// Shared upload validation for the minor waiver form -- used both
// client-side (RegistrationForm, for instant feedback) and server-side
// (/api/upload-waiver, as the real security boundary). Client-side checks
// are a UX convenience only; a request that skips the browser entirely
// still has to pass these same checks on the server.
export const WAIVER_UPLOAD = {
  maxBytes: 2 * 1024 * 1024,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
} as const;

const MAGIC_NUMBERS: { mime: string; bytes: number[] }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extensionForMimeType(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? "bin";
}

async function matchesKnownSignature(file: Blob, mimeType: string): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (mimeType === "image/webp") {
    // RIFF....WEBP
    const riff = String.fromCharCode(...head.slice(0, 4));
    const webp = String.fromCharCode(...head.slice(8, 12));
    return riff === "RIFF" && webp === "WEBP";
  }

  const match = MAGIC_NUMBERS.find((m) => m.mime === mimeType);
  if (!match) return false;
  return match.bytes.every((byte, i) => head[i] === byte);
}

export async function validateUploadFile(file: Blob & { type: string; size: number }): Promise<string | null> {
  if (file.size === 0) return "That file is empty.";
  if (file.size > WAIVER_UPLOAD.maxBytes) return "File is too large. Maximum size is 2MB.";
  if (!(WAIVER_UPLOAD.acceptedMimeTypes as readonly string[]).includes(file.type)) {
    return "Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF.";
  }
  const signatureOk = await matchesKnownSignature(file, file.type);
  if (!signatureOk) {
    return "This file doesn't look like a valid image or PDF. Please upload a clear photo or scan of the signed form.";
  }
  return null;
}
