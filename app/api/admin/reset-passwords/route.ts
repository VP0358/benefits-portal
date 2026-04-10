export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/admin/reset-passwords
 * MLM会員全員 or 指定会員のマイページパスワードを初期値「0000」にリセット
 * body: { mode: "all" | "single", memberCode?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session as any)?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mode, memberCode } = body;

    // 「0000」のbcryptハッシュ
    const newHash = await bcrypt.hash("0000", 10);

    if (mode === "single" && memberCode) {
      // 特定会員のみリセット
      const member = await prisma.mlmMember.findUnique({
        where: { memberCode },
        select: { userId: true },
      });
      if (!member) {
        return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
      }
      await prisma.user.update({
        where: { id: member.userId },
        data: { passwordHash: newHash },
      });
      return NextResponse.json({ message: `${memberCode} のパスワードをリセットしました`, count: 1 });
    }

    if (mode === "all") {
      // MLM会員全員のuserIdを取得
      const members = await prisma.mlmMember.findMany({
        select: { userId: true },
      });
      const userIds = members.map(m => m.userId);

      // バッチ更新（100件ずつ）
      const batchSize = 100;
      let updated = 0;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await prisma.user.updateMany({
          where: { id: { in: batch } },
          data: { passwordHash: newHash },
        });
        updated += batch.length;
      }
      return NextResponse.json({
        message: `MLM会員 ${updated} 名のパスワードを「0000」にリセットしました`,
        count: updated,
      });
    }

    return NextResponse.json({ error: "mode が不正です (all | single)" }, { status: 400 });
  } catch (error) {
    console.error("reset-passwords error:", error);
    return NextResponse.json({ error: "リセットに失敗しました" }, { status: 500 });
  }
}

/**
 * GET /api/admin/reset-passwords
 * 現在のMLM会員数を返す（リセット前確認用）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session as any)?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await prisma.mlmMember.count();
  return NextResponse.json({ count });
}
