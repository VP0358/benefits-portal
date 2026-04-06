import { NextRequest, NextResponse } from "next/server";

const MEMBER_DOMAIN = "viola-pure.net";
const ADMIN_DOMAIN  = "viola-pure.xyz";

// 認証不要なパス
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

/** リクエストに x-pathname を付与して next() する */
function nextWithPathname(req: NextRequest) {
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: reqHeaders } });
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host     = req.headers.get("host") ?? "";
  const hostname = host.replace(/^www\./, "").split(":")[0];

  const isMemberDomain = hostname === MEMBER_DOMAIN;
  const isAdminDomain  = hostname === ADMIN_DOMAIN;

  // ① 公開パスはスキップ（x-pathname を付与してlayoutで使用可能にする）
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return nextWithPathname(req);
  }

  // ② セッションCookieの存在チェック
  // ※ NextAuth v5 はJWTをJWE暗号化するため middleware でroleデコード不可
  // ※ role によるアクセス制御は各ページのlayout.tsx (server component) で実施
  const hasSession =
    !!req.cookies.get("__Secure-next-auth.session-token")?.value ||
    !!req.cookies.get("next-auth.session-token")?.value ||
    !!req.cookies.get("authjs.session-token")?.value ||
    !!req.cookies.get("__Secure-authjs.session-token")?.value;

  // 未ログイン → ログインページへ（ループしない安全な送り先）
  if (!hasSession) {
    const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return NextResponse.redirect(new URL(loginPath, req.url));
  }

  // ③ ルート "/" のリダイレクト（ログイン済み）
  if (pathname === "/") {
    if (isMemberDomain) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (isAdminDomain) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ④ 会員ドメインから /admin へのアクセスをブロック
  if (isMemberDomain && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ⑤ 管理ドメインから会員専用ページへのアクセスをブロック
  //    （ログイン済みなので /admin へ。admin layout側でrole再チェック）
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
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // ログイン済み & 該当なし → x-pathname を付与して通す
  return nextWithPathname(req);
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
