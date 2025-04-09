import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl; 
  const token = request.cookies.get('accesstoken');

    if (
      pathname.startsWith("/_next") || 
      pathname.startsWith("/static") ||
      /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|otf|map)$/.test(pathname) 
    ) {
      return NextResponse.next();
    }

  if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgotPassword")) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
