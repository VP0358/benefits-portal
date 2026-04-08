// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";


import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// ダウンラインレポートCSV出力
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get("memberCode");
    const type = searchParams.get("type") || "matrix";

    if (!memberCode) {
      return NextResponse.json(
        { error: "会員コードが必要です" },
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

    // ダウンライン取得
    const downlines =
      type === "matrix"
        ? await getMatrixDownlines(targetMember.id)
        : await getUnilevelDownlines(targetMember.id);

    // CSV生成
    const headers = [
      "レベル",
      "会員コード",
      "氏名",
      "ステータス",
      "登録日",
      "現在レベル",
    ];

    const rows = downlines.map((m: any) => [
      m.depth,
      m.memberCode,
      m.name,
      m.status === "active" ? "アクティブ" : "非アクティブ",
      new Date(m.createdAt).toLocaleDateString("ja-JP"),
      m.currentLevel,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = bom + csvContent;

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="downline_report_${memberCode}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating downline report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getMatrixDownlines(memberId: bigint) {
  const result: any[] = [];
  const visited = new Set<string>();

  async function traverse(id: bigint, depth: number) {
    const idStr = id.toString();
    if (visited.has(idStr) || depth > 10) {
      return;
    }
    visited.add(idStr);

    const member = await prisma.mlmMember.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        downlines: true,
      },
    });

    if (member) {
      result.push({
        depth,
        memberCode: member.memberCode,
        name: member.user.name,
        status: member.status,
        createdAt: member.createdAt,
        currentLevel: member.currentLevel,
      });

      for (const child of member.downlines) {
        await traverse(child.id, depth + 1);
      }
    }
  }

  await traverse(memberId, 0);
  return result;
}

async function getUnilevelDownlines(memberId: bigint) {
  const result: any[] = [];
  const visited = new Set<string>();

  async function traverse(id: bigint, depth: number) {
    const idStr = id.toString();
    if (visited.has(idStr) || depth > 10) {
      return;
    }
    visited.add(idStr);

    const member = await prisma.mlmMember.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        referrals: true,
      },
    });

    if (member) {
      result.push({
        depth,
        memberCode: member.memberCode,
        name: member.user.name,
        status: member.status,
        createdAt: member.createdAt,
        currentLevel: member.currentLevel,
      });

      for (const child of member.referrals) {
        await traverse(child.id, depth + 1);
      }
    }
  }

  await traverse(memberId, 0);
  return result;
}
