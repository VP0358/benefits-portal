import { NextRequest, NextResponse } from "next/server";

const MEMBER_DOMAIN = "viola-pure.net";
const ADMIN_DOMAIN  = "viola-pure.xyz";

// 認証不要なパス（これらはセッションチェックをスキップ）
const PUBLIC_PATHS = [
  "/login",
  "/admin/login",
  "/register",
  "/api/auth",
  "/api/register",
  "/_next",
  "/favicon",
  "/apple-touch-icon",
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host     = req.headers.get("host") ?? "";
  const hostname = host.replace(/^www\./, "").split(":")[0];

  const isMemberDomain = hostname === MEMBER_DOMAIN;
  const isAdminDomain  = hostname === ADMIN_DOMAIN;

  // ① 公開パスは認証チェックをスキップ
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-next-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ② セッションCookieを直接チェック（auth()は使わない）
  // Next Auth v5 のJWTセッションCookie名
  const sessionCookie =
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  // セッションCookieがない = 未ログイン
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    // /admin/* へのアクセスは /admin/login へ
    if (pathname.startsWith("/admin")) {
      url.pathname = "/admin/login";
    } else {
      url.pathname = "/login";
    }
    return NextResponse.redirect(url);
  }

  // ③ セッションCookieがある場合はJWTをデコードしてroleを取得
  let role: string | undefined;
  try {
    const parts = sessionCookie.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf-8")
      );
      role = payload?.role ?? payload?.user?.role;
    }
  } catch {
    role = undefined;
  }

  // ④ ルート "/" のリダイレクト
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    if (isMemberDomain) {
      url.pathname = "/dashboard";
    } else if (isAdminDomain) {
      url.pathname = "/admin";
    } else {
      url.pathname = role === "admin" ? "/admin" : "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // ⑤ 会員ドメインから /admin へのアクセスをブロック
  if (isMemberDomain && pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ⑥ 管理ドメインから会員ページへのアクセスをブロック
  if (
    isAdminDomain &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/points") ||
      pathname.startsWith("/orders") ||
      pathname === "/referral" ||
      pathname.startsWith("/referral/") ||
      pathname.startsWith("/vp-phone-referrals") ||
      pathname.startsWith("/travel-referrals"))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // ⑦ 管理ルートはadminロールのみ
  if (pathname.startsWith("/admin") && role !== "admin") {
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
    "/profile/:path*",
    "/admin/:path*",
    "/points/:path*",
    "/orders/:path*",
    "/referral",
    "/referral/:path*",
    "/vp-phone-referrals/:path*",
    "/travel-referrals/:path*",
    "/org-chart/:path*",
    "/vp-phone/:path*",
  ],
};
