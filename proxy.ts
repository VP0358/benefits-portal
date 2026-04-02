import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// ドメイン設定
const MEMBER_DOMAIN = "viola-pure.net"; // 会員サイト
const ADMIN_DOMAIN = "viola-pure.xyz"; // 管理サイト

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") ?? "";
  const session = req.auth;

  const isMemberDomain =
    hostname === MEMBER_DOMAIN || hostname === `www.${MEMBER_DOMAIN}`;
  const isAdminDomain =
    hostname === ADMIN_DOMAIN || hostname === `www.${ADMIN_DOMAIN}`;

  // ─────────────────────────────────────────────
  // ① 認証チェック
  // ─────────────────────────────────────────────

  // 未ログインなら /login へ
  if (!session?.user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // ─────────────────────────────────────────────
  // ② ドメインによるアクセス制限
  // ─────────────────────────────────────────────

  // 【会員ドメイン (viola-pure.net)】から /admin にアクセスしようとした場合
  // → /dashboard にリダイレクト
  if (isMemberDomain && pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 【管理ドメイン (viola-pure.xyz)】から会員ページにアクセスしようとした場合
  // → /admin にリダイレクト
  if (
    isAdminDomain &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/points") ||
      pathname.startsWith("/orders") ||
      pathname === "/referral" ||
      pathname.startsWith("/referral/"))
  ) {
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
  // ③ ロールチェック
  // ─────────────────────────────────────────────

  // 管理者ルート：admin ロールのみ許可
  if (pathname.startsWith("/admin") && session.user.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

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
