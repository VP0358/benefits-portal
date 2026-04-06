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
  "/api/site-settings",
  "/_next",
  "/favicon",
  "/apple-touch-icon",
];

/**
 * JWTのペイロード部分をデコードして role を取得する
 * Edge Runtime では Buffer が使えないため atob を使用
 */
function getRoleFromJwt(token: string): string | undefined {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return undefined;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload?.role ?? payload?.user?.role;
  } catch {
    return undefined;
  }
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host     = req.headers.get("host") ?? "";
  const hostname = host.replace(/^www\./, "").split(":")[0];

  const isMemberDomain = hostname === MEMBER_DOMAIN;
  const isAdminDomain  = hostname === ADMIN_DOMAIN;

  // ① 公開パスは認証チェックをスキップ（必ず最初に判定）
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ② セッションCookieを直接チェック（auth()は使わない）
  // NextAuth v5 のJWTセッションCookie名（複数候補）
  const sessionCookie =
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  // セッションCookieがない = 未ログイン → ログインページへ
  if (!sessionCookie) {
    const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return NextResponse.redirect(new URL(loginPath, req.url));
  }

  // ③ JWTをデコードして role を取得
  const role = getRoleFromJwt(sessionCookie);

  // ④ ルート "/" のリダイレクト
  if (pathname === "/") {
    let dest: string;
    if (isMemberDomain) {
      dest = "/dashboard";
    } else if (isAdminDomain) {
      dest = role === "admin" ? "/admin" : "/admin/login";
    } else {
      dest = role === "admin" ? "/admin" : "/dashboard";
    }
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // ⑤ 会員ドメインから /admin へのアクセスをブロック
  if (isMemberDomain && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ⑥ 管理ドメインから会員専用ページへのアクセスをブロック
  //    → /admin/login へ（ループしない安全な送り先）
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
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // ⑦ /admin/* はadminロールのみ許可
  //    role が取れない or admin でない場合は /admin/login へ（ループしない）
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
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
