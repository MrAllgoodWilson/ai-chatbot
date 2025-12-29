import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();

  const isChatRoute = request.nextUrl.pathname.startsWith("/");

  // Protect chat routes
  if (isChatRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|register|api|_next|favicon.ico).*)"],
};
