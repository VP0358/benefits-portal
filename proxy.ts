import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const MEMBER_DOMAIN = "viola-pure.net";
const ADMIN_DOMAIN  = "viola-pure.xyz";

// 認証不要なパス
const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/_next", "/favicon"];

export default auth(function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host     = req.headers.get("host") ?? "";
  // www. を除去して比較
  const hostname = host.replace(/^www\./, "").split(":")[0];
  const session  = (req as NextRequest & { auth: unknown }).auth as
    { user?: { role?: string } } | null;

  const isMemberDomain = hostname === MEMBER_DOMAIN;
  const isAdminDomain  = hostname === ADMIN_DOMAIN;

  // ① 公開パスはスキップ
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    // ログイン済みで /login → リダイレクト
    if (pathname === "/login" && session?.user) {
      const url = req.nextUrl.clone();
      url.pathname = session.user.role === "admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ② 未ログイン → /login
  if (!session?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ③ ルート "/" のリダイレクト
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    if (isMemberDomain) {
      url.pathname = "/dashboard";
    } else if (isAdminDomain) {
      url.pathname = "/admin";
    } else {
      url.pathname = session.user.role === "admin" ? "/admin" : "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // ④ 会員ドメインから /admin へのアクセスをブロック
  if (isMemberDomain && pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ⑤ 管理ドメインから会員ページへのアクセスをブロック
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

  // ⑥ ロールチェック：管理ルートはadminのみ
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
    "/login",
    "/dashboard/:path*",
    "/admin/:path*",
    "/points/:path*",
    "/orders/:path*",
    "/referral",
    "/referral/:path*",
  ],
};
