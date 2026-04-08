import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 購入レポートCSV出力
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get("memberCode");
    const type = searchParams.get("type") || "matrix";
    const startMonth = searchParams.get("startMonth"); // YYYY-MM
    const endMonth = searchParams.get("endMonth");

    if (!memberCode || !startMonth || !endMonth) {
      return NextResponse.json(
        { error: "すべてのパラメータが必要です" },
        { status: 400 }
      );
    }

    const targetMember = await prisma.mlmMember.findUnique({
      where: { memberCode },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "会員が見つかりません" },
        { status: 404 }
      );
    }

    // ダウンラインの会員ID取得
    const downlineIds =
      type === "matrix"
        ? await getMatrixDownlineIds(targetMember.id)
        : await getUnilevelDownlineIds(targetMember.id);

    // 購入データ取得
    const purchases = await prisma.mlmPurchase.findMany({
      where: {
        mlmMemberId: {
          in: downlineIds,
        },
        purchaseMonth: {
          gte: startMonth,
          lte: endMonth,
        },
      },
      include: {
        mlmMember: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ purchaseMonth: "asc" }, { mlmMemberId: "asc" }],
    });

    // CSV生成
    const headers = [
      "購入月",
      "会員コード",
      "氏名",
      "商品コード",
      "商品名",
      "数量",
      "単価",
      "ポイント",
      "合計ポイント",
    ];

    const rows = purchases.map((p) => [
      p.purchaseMonth,
      p.mlmMember.memberCode,
      p.mlmMember.user.name,
      p.productCode,
      p.productName,
      p.quantity,
      p.unitPrice,
      p.points,
      p.totalPoints,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = bom + csvContent;

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="purchase_report_${memberCode}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating purchase report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getMatrixDownlineIds(memberId: bigint): Promise<bigint[]> {
  const result: bigint[] = [];
  const visited = new Set<string>();

  async function traverse(id: bigint) {
    const idStr = id.toString();
    if (visited.has(idStr)) {
      return;
    }
    visited.add(idStr);
    result.push(id);

    const member = await prisma.mlmMember.findUnique({
      where: { id },
      include: {
        downlines: {
          select: {
            id: true,
          },
        },
      },
    });

    if (member) {
      for (const child of member.downlines) {
        await traverse(child.id);
      }
    }
  }

  await traverse(memberId);
  return result;
}

async function getUnilevelDownlineIds(memberId: bigint): Promise<bigint[]> {
  const result: bigint[] = [];
  const visited = new Set<string>();

  async function traverse(id: bigint) {
    const idStr = id.toString();
    if (visited.has(idStr)) {
      return;
    }
    visited.add(idStr);
    result.push(id);

    const member = await prisma.mlmMember.findUnique({
      where: { id },
      include: {
        referrals: {
          select: {
            id: true,
          },
        },
      },
    });

    if (member) {
      for (const child of member.referrals) {
        await traverse(child.id);
      }
    }
  }

  await traverse(memberId);
  return result;
}
