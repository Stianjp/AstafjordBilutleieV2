import { NextResponse } from "next/server";

const ADMIN_HOST = "admin.astafjordbilutleie.no";
const PUBLIC_HOST = "astafjordbilutleie.no";

const hasFileExtension = (pathname) => /\.[^/]+$/.test(pathname);

export function middleware(request) {
  const hostHeader = request.headers.get("host") || "";
  const hostname = hostHeader.toLowerCase().split(":")[0];
  const { pathname, search } = request.nextUrl;

  const isAdminHost = hostname === ADMIN_HOST;
  const isPublicHost = hostname === PUBLIC_HOST || hostname === `www.${PUBLIC_HOST}`;
  const isAdminPath = pathname === "/login" || pathname.startsWith("/admin");

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || hasFileExtension(pathname)) {
    return NextResponse.next();
  }

  if (isPublicHost && isAdminPath) {
    const redirectUrl = new URL(`https://${ADMIN_HOST}${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminHost) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (!isAdminPath) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
