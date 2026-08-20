// Signed admin session cookie (HMAC-SHA256 via Web Crypto, so it works in
// both the Node and Edge runtimes without extra dependencies).
const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 8 * 60 * 60;

function getSecret() {
  return process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me";
}

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSessionCookieValue(username: string) {
  const payload = JSON.stringify({ u: username, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  const encodedPayload = toBase64Url(new TextEncoder().encode(payload));
  const signature = await hmac(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySessionCookieValue(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return false;
  const expectedSignature = await hmac(encodedPayload);
  if (!timingSafeEqual(expectedSignature, signature)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
