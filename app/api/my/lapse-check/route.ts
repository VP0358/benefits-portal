/**
 * GET /api/my/lapse-check
 *
 * ログイン中の会員の MlmMember.status が "lapsed" かどうかを返す。
 * middleware から呼ばれる軽量エンドポイント。
 *
 * レスポンス: { lapsed: boolean }
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ lapsed: false });
    }

    // 管理者は対象外
    if ((session.user as { role?: string }).role === "admin") {
      return NextResponse.json({ lapsed: false });
    }

    const userId = BigInt(session.user.id);
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      select: { status: true },
    });

    return NextResponse.json({ lapsed: mlmMember?.status === "lapsed" });
  } catch {
    // エラー時は通過させる（可用性優先）
    return NextResponse.json({ lapsed: false });
  }
}
