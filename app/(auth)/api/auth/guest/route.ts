import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { signIn } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const redirectUrl =
    req.nextUrl.searchParams.get("redirectUrl") ?? "/";

  // Check existing session
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  // Already logged in → go home
  if (token) {
    return Response.redirect(new URL("/", req.url));
  }

  // IMPORTANT: return the Response from signIn
  return signIn("guest", {
    redirectTo: redirectUrl,
  });
}
