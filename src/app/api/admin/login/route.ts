import { NextResponse } from "next/server";
import { createSessionCookieValue, timingSafeEqual, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

// Placeholder credentials until real ones are set as env vars.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "Admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "area2camp";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const usernameOk = timingSafeEqual(username, ADMIN_USERNAME);
  const passwordOk = timingSafeEqual(password, ADMIN_PASSWORD);
  if (!usernameOk || !passwordOk) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const cookieValue = await createSessionCookieValue(username);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
