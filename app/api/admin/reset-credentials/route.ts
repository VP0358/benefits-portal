/**

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

 * 緊急用：ログイン情報を指定の値にリセットするAPI（使用後即削除）
 * POST /api/admin/reset-credentials
 * Body: { secret: "VIOLA_RESET_2024" }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const RESET_SECRET = "VIOLA_RESET_2024";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.secret !== RESET_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const adminHash  = await hash("colors1010", 10);
    const memberHash = await hash("colors1010", 10);

    // 管理者リセット
    const admin = await prisma.admin.upsert({
      where:  { email: "info@c-p.link" },
      update: { passwordHash: adminHash, name: "管理者" },
      create: {
        email:        "info@c-p.link",
        name:         "管理者",
        passwordHash: adminHash,
        role:         "super_admin",
      },
    });

    // 旧メールアドレスのアカウントが残っていれば削除
    await prisma.admin.deleteMany({
      where: { email: { not: "info@c-p.link" } },
    }).catch(() => {});

    // テスト会員リセット（upsert） - memberCodeの重複を避けるため既存チェック
    // まず同じmemberCodeの別ユーザーがいれば削除
    await prisma.user.deleteMany({
      where: {
        memberCode: "M0001",
        email: { not: "support@c-p.link" },
      },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        referralCode: "VIOLA001",
        email: { not: "support@c-p.link" },
      },
    }).catch(() => {});

    const member = await prisma.user.upsert({
      where:  { email: "support@c-p.link" },
      update: { passwordHash: memberHash, status: "active", name: "VIOLAさん" },
      create: {
        memberCode:   "M0001",
        name:         "VIOLAさん",
        email:        "support@c-p.link",
        passwordHash: memberHash,
        status:       "active",
        referralCode: "VIOLA001",
      },
    });

    // PointWalletがなければ作成
    const existingWallet = await prisma.pointWallet.findUnique({
      where: { userId: member.id },
    });
    if (!existingWallet) {
      await prisma.pointWallet.create({
        data: {
          userId:                  member.id,
          autoPointsBalance:       50000,
          manualPointsBalance:     10000,
          externalPointsBalance:   18541,
          availablePointsBalance:  78541,
          usedPointsBalance:       0,
          expiredPointsBalance:    0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "ログイン情報をリセットしました",
      admin:  { email: admin.email,  password: "colors1010" },
      member: { email: member.email, password: "colors1010" },
      memberId: member.id.toString(),
      walletCreated: !existingWallet,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Reset failed", detail: String(e) }, { status: 500 });
  }
}
