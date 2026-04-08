import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/savings-bonus-config
 * 貯金ボーナス設定を取得（最新の1件）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await prisma.savingsBonusConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!config) {
      // デフォルト値を返す
      return NextResponse.json({
        config: {
          id: null,
          registrationRate: 20.0,
          autoshipRate: 5.0,
          bonusRate: 3.0,
        },
      });
    }

    return NextResponse.json({
      config: {
        id: config.id.toString(),
        registrationRate: config.registrationRate,
        autoshipRate: config.autoshipRate,
        bonusRate: config.bonusRate,
        createdAt: config.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching savings bonus config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/savings-bonus-config
 * 貯金ボーナス設定を新規作成（履歴として保存）
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { registrationRate, autoshipRate, bonusRate } = body;

    if (
      registrationRate == null ||
      autoshipRate == null ||
      bonusRate == null
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const config = await prisma.savingsBonusConfig.create({
      data: {
        registrationRate: Number(registrationRate),
        autoshipRate: Number(autoshipRate),
        bonusRate: Number(bonusRate),
      },
    });

    return NextResponse.json({
      success: true,
      configId: config.id.toString(),
    });
  } catch (error) {
    console.error("Error creating savings bonus config:", error);
    return NextResponse.json(
      { error: "Failed to create config" },
      { status: 500 }
    );
  }
}
