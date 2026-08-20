import { UPLOAD } from "@/lib/event";

const MAGIC_NUMBERS: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

async function matchesKnownSignature(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (file.type === "image/webp") {
    // RIFF....WEBP
    const riff = String.fromCharCode(...head.slice(0, 4));
    const webp = String.fromCharCode(...head.slice(8, 12));
    return riff === "RIFF" && webp === "WEBP";
  }

  const match = MAGIC_NUMBERS.find((m) => m.mime === file.type);
  if (!match) return false;
  return match.bytes.every((byte, i) => head[i] === byte);
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extensionForMimeType(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? "bin";
}

export async function validateUploadFile(file: File): Promise<string | null> {
  if (file.size === 0) return "That file is empty.";
  if (file.size > UPLOAD.maxBytes) return "File is too large. Maximum size is 2MB.";
  if (!(UPLOAD.acceptedMimeTypes as readonly string[]).includes(file.type)) {
    return "Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF.";
  }
  const signatureOk = await matchesKnownSignature(file);
  if (!signatureOk) {
    return "This file doesn't look like a valid image or PDF. Please upload a real screenshot or receipt.";
  }
  return null;
}
