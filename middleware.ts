import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// ドメイン設定
const MEMBER_DOMAIN  = "viola-pure.net";   // 会員サイト
const ADMIN_DOMAIN   = "viola-pure.xyz";   // 管理サイト

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") ?? "";

  // ─────────────────────────────────────────────
  // ① ドメインによるアクセス制限
  // ─────────────────────────────────────────────

  const isMemberDomain = hostname === MEMBER_DOMAIN || hostname === `www.${MEMBER_DOMAIN}`;
  const isAdminDomain  = hostname === ADMIN_DOMAIN  || hostname === `www.${ADMIN_DOMAIN}`;

  // 【会員ドメイン (viola-pure.net)】から /admin にアクセスしようとした場合
  // → /dashboard にリダイレクト
  if (isMemberDomain && pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 【管理ドメイン (viola-pure.xyz)】から /dashboard など会員ページにアクセスしようとした場合
  // → /admin にリダイレクト
  if (isAdminDomain && (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/points") ||
    pathname.startsWith("/orders") ||
    pathname === "/referral" ||
    pathname.startsWith("/referral")
  )) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // 【会員ドメイン (viola-pure.net)】のルート "/" → /dashboard へ
  if (isMemberDomain && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 【管理ドメイン (viola-pure.xyz)】のルート "/" → /admin へ
  if (isAdminDomain && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // ─────────────────────────────────────────────
  // ② 認証チェック（既存ロジック）
  // ─────────────────────────────────────────────

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
  matcher: [
    "/",
    "/dashboard/:path*",
    "/admin/:path*",
    "/points/:path*",
    "/orders/:path*",
    "/referral",
    "/referral/:path*",
  ],
};
