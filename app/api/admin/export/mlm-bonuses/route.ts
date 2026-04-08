// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM

  if (!month) {
    return new Response("対象月を指定してください", { status: 400 });
  }

  // ボーナス計算結果を取得
  const bonusRun = await prisma.bonusRun.findFirst({
    where: { bonusMonth: month },
    include: {
      results: {
        include: {
          mlmMember: {
            include: {
              user: {
                include: {
                  mlmRegistration: true,
                },
              },
            },
          },
        },
        orderBy: { totalBonus: "desc" },
      },
    },
  });

  if (!bonusRun) {
    return new Response("指定された月のボーナス計算結果が見つかりません", { status: 404 });
  }

  const header = [
    "会員コード",
    "氏名",
    "メールアドレス",
    "銀行コード",
    "支店コード",
    "口座種別",
    "口座番号",
    "口座名義",
    "アクティブ",
    "自己購入pt",
    "グループpt",
    "直紹介アクティブ数",
    "達成レベル",
    "旧称号",
    "新称号",
    "ダイレクトボーナス",
    "ユニレベルボーナス",
    "組織構築ボーナス",
    "貯金ボーナス",
    "合計ボーナス",
  ];

  const rows = bonusRun.results
    .filter(r => r.totalBonus > 0) // ボーナスがある会員のみ
    .map(result => {
      const reg = result.mlmMember.user.mlmRegistration;
      const bankInfo = reg ? [
        "", // 銀行コード（未実装）
        "", // 支店コード（未実装）
        reg.bankAccountType ?? "",
        reg.bankAccountNumber ?? "",
        reg.bankAccountHolder ?? "",
      ] : ["", "", "", "", ""];

      return [
        result.mlmMember.memberCode,
        result.mlmMember.user.name,
        result.mlmMember.user.email,
        ...bankInfo,
        result.isActive ? "○" : "×",
        result.selfPurchasePoints,
        result.groupPoints,
        result.directActiveCount,
        result.achievedLevel,
        result.previousTitleLevel,
        result.newTitleLevel,
        result.directBonus,
        result.unilevelBonus,
        result.structureBonus,
        result.savingsBonus,
        result.totalBonus,
      ];
    });

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].map(line => line.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mlm_bonuses_${month}.csv"`,
    },
  });
}
