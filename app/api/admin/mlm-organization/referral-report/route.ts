import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 紹介実績積算レポートCSV出力
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortType = searchParams.get("sortType") || "clean";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "期間指定が必要です" },
        { status: 400 }
      );
    }

    // 全会員の紹介実績を集計
    const members = await prisma.mlmMember.findMany({
      include: {
        user: {
          select: {
            name: true,
          },
        },
        referrals: {
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          select: {
            id: true,
            memberCode: true,
            user: {
              select: {
                name: true,
              },
            },
            createdAt: true,
          },
        },
      },
    });

    // 集計データ作成
    const reportData = members
      .filter((m) => m.referrals.length > 0)
      .map((m) => ({
        memberCode: m.memberCode,
        memberName: m.user.name,
        referralCount: m.referrals.length,
        referralList: m.referrals
          .map((r) => `${r.memberCode}(${r.user.name})`)
          .join(", "),
        firstReferralDate:
          m.referrals.length > 0
            ? new Date(m.referrals[0].createdAt).toLocaleDateString("ja-JP")
            : "",
        lastReferralDate:
          m.referrals.length > 0
            ? new Date(
                m.referrals[m.referrals.length - 1].createdAt
              ).toLocaleDateString("ja-JP")
            : "",
      }));

    // ソート
    if (sortType === "clean") {
      reportData.sort((a, b) => b.referralCount - a.referralCount);
    } else {
      reportData.sort((a, b) => a.memberCode.localeCompare(b.memberCode));
    }

    // CSV生成
    const headers = [
      "会員コード",
      "氏名",
      "紹介人数",
      "初回紹介日",
      "最終紹介日",
      "紹介者リスト",
    ];

    const rows = reportData.map((r) => [
      r.memberCode,
      r.memberName,
      r.referralCount,
      r.firstReferralDate,
      r.lastReferralDate,
      `"${r.referralList}"`, // カンマ対策でクォート
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = bom + csvContent;

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="referral_report_${startDate}_${endDate}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating referral report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
