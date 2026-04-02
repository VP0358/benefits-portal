import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;

  // 両方のクッキー名を試す（環境によって異なるため）
  let token = await getToken({
    req,
    secret,
    cookieName: "__Secure-authjs.session-token",
  });

  if (!token) {
    token = await getToken({
      req,
      secret,
      cookieName: "authjs.session-token",
    });
  }

  const { pathname } = req.nextUrl;

  // 未ログインなら /login へ
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // 管理者ルート：admin ロールのみ許可
  if (pathname.startsWith("/admin") && token.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/points/:path*", "/orders/:path*"],
};
