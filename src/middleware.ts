import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const isValid = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!isValid) {
    const loginUrl = new URL("/dashboard/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/((?!login).*)", "/api/admin/((?!login).*)"],
};
