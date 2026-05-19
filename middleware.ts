import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

// 失効会員がアクセスできない会員ページのプレフィックス
// （/login・/register・/api は除外）
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // リクエストのパスをヘッダーに付与（layout.tsx で利用）
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);

  // 会員ページへのアクセス時のみ lapsed チェックを行う
  const isMemberPage = MEMBER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isMemberPage) return response;

  // セッション取得
  const session = await auth();
  if (!session?.user?.id) return response; // 未ログインは通常リダイレクト（NextAuthに任せる）

  // 管理者はチェック不要
  if ((session.user as { role?: string }).role === "admin") return response;

  // MlmMember の status を DB で確認
  // ※ middleware はエッジで動くが、prisma を直接使えないため
  //   内部 API エンドポイントで確認する
  try {
    const baseUrl = request.nextUrl.origin;
    const checkRes = await fetch(`${baseUrl}/api/my/lapse-check`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });
    if (checkRes.ok) {
      const data = await checkRes.json() as { lapsed?: boolean };
      if (data.lapsed) {
        // 失効済み → ログアウトページへリダイレクト
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
