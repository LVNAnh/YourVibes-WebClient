import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl; 
  const token = request.cookies.get('accesstoken');

    // Bỏ qua các tài nguyên tĩnh và Next.js nội bộ
    if (
      pathname.startsWith("/_next") || // Tài nguyên nội bộ của Next.js
      pathname.startsWith("/static") || // Tài nguyên tĩnh của bạn
      /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|otf|map)$/.test(pathname) // File tĩnh
    ) {
      return NextResponse.next();
    }

  if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgotPassword")) {
    return NextResponse.next();
  }

  // Nếu không có token và đang truy cập trang login thì không redirect lại
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Áp dụng middleware cho tất cả các route
export const config = {
  matcher: "/:path*", // Chặn tất cả các route
};
