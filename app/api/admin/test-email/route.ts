// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";


import { requireAdmin } from "@/app/api/admin/route-guard";
import { sendWelcomeEmail } from "@/lib/mailer";

/** GET /api/admin/test-email?to=xxx@example.com
 *  管理者のみ：指定アドレスにテストメールを送信 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const to = req.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "?to=メールアドレス を指定してください" }, { status: 400 });
  }

  const result = await sendWelcomeEmail({ to, name: "テストユーザー" });

  if (result.success) {
    return NextResponse.json({ ok: true, message: `${to} にテストメールを送信しました`, id: result.id });
  } else {
    return NextResponse.json({ ok: false, error: String(result.error) }, { status: 500 });
  }
}
