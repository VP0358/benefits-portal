/**
 * middleware.ts
 *
 * Edge Runtime で動作する軽量ミドルウェア。
 * ─ Prisma / auth() は import しない（1MB 制限対策）
 *
 * 処理:
 *   1. x-pathname ヘッダーを付与（layout.tsx で利用）
 *   2. 会員ページへのアクセス時、lapsed 会員をブロック
 *      - JWT Cookie から userId を取得（jose で軽量デコード）
 *      - /api/my/lapse-check を内部 fetch で確認
 *      - lapsed なら /login?reason=lapsed へリダイレクト
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// 失効会員がアクセスできない会員ページのプレフィックス
const MEMBER_PATHS = [
  "/dashboard",
  "/announcements",
  "/contact",
  "/insurance",
  "/mlm-autoship",
  "/mlm-bonus",
  "/mlm-bonus-history",
  "/mlm-business",
  "/mlm-org-chart",
  "/mlm-purchase-history",
  "/mlm-referral",
  "/mlm-referrer-list",
  "/mlm-register",
  "/mlm-registration",
  "/mlm-status",
  "/orders",
  "/org-chart",
  "/points",
  "/profile",
  "/referral",
  "/travel-referrals",
  "/used-cars",
  "/vp-phone",
  "/vp-phone-referrals",
];

/** NextAuth の JWT Cookie 名（デフォルト） */
const SESSION_COOKIE = "authjs.session-token";
const SESSION_COOKIE_SECURE = "__Secure-authjs.session-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // リクエストのパスをヘッダーに付与（layout.tsx で利用）
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);

  // 会員ページへのアクセス時のみ lapsed チェックを行う
  const isMemberPage = MEMBER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isMemberPage) return response;

  // ── JWT Cookie から role を取得（Edge 対応・軽量） ──────────────
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return response; // secret 未設定時は通過

  const cookieValue =
    request.cookies.get(SESSION_COOKIE_SECURE)?.value ??
    request.cookies.get(SESSION_COOKIE)?.value;

  if (!cookieValue) return response; // 未ログインは通過（NextAuth のリダイレクトに任せる）

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(cookieValue, secretKey);

    // 管理者はチェック不要
    if ((payload as { role?: string }).role === "admin") return response;

    // user.id がなければスキップ
    if (!(payload as { id?: string }).id) return response;

  } catch {
    // JWT デコード失敗（期限切れ等）は通過させる
    return response;
  }

  // ── /api/my/lapse-check を内部 fetch で確認 ─────────────────────
  try {
    const baseUrl = request.nextUrl.origin;
    const checkRes = await fetch(`${baseUrl}/api/my/lapse-check`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });
    if (checkRes.ok) {
      const data = (await checkRes.json()) as { lapsed?: boolean };
      if (data.lapsed) {
        return NextResponse.redirect(new URL("/login?reason=lapsed", request.url));
      }
    }
  } catch {
    // チェック失敗時は通過させる（可用性優先）
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
