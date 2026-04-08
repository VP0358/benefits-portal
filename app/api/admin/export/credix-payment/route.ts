// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * クレディックス決済CSV出力
 * 条件: オートシップ有効 AND 支払い方法がクレジットカード
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM

  if (!month) {
    return new Response("対象月を指定してください", { status: 400 });
  }

  // オートシップ有効 AND クレジットカード支払いの会員を取得
  const members = await prisma.mlmMember.findMany({
    where: {
      autoshipEnabled: true,
      paymentMethod: "credit_card",
      status: {
        in: ["active", "autoship"], // アクティブまたはオートシップのみステータス
      },
    },
    include: {
      user: {
        select: {
          memberCode: true,
          name: true,
          nameKana: true,
          email: true,
          phone: true,
          postalCode: true,
          address: true,
        },
      },
      mlmRegistration: true,
    },
    orderBy: { memberCode: "asc" },
  });

  // 指定月が休止月リストに含まれている会員を除外
  const activeMembers = members.filter(member => {
    if (!member.autoshipSuspendMonths) return true;
    const suspendMonths = member.autoshipSuspendMonths.split(",").map(m => m.trim());
    return !suspendMonths.includes(month);
  });

  if (activeMembers.length === 0) {
    return new Response("クレジットカード決済対象の会員がいません", { status: 400 });
  }

  const header = [
    "会員コード",
    "会員ID", // MLM会員コード
    "氏名",
    "カナ氏名",
    "メールアドレス",
    "電話番号",
    "郵便番号",
    "住所",
    "商品コード",
    "商品名",
    "単価",
    "数量",
    "合計金額",
    "対象月",
  ];

  const rows = activeMembers.map(member => {
    const reg = member.user.mlmRegistration;
    
    return [
      member.user.memberCode,
      member.memberCode,
      member.user.name,
      member.user.nameKana ?? "",
      member.user.email,
      member.user.phone ?? "",
      member.user.postalCode ?? "",
      member.user.address ?? "",
      "2000", // 商品コード（VIOLA Pure 翠彩-SUMISAI-）
      "VIOLA Pure 翠彩-SUMISAI-",
      "16500", // 単価（税込）
      "1", // 数量
      "16500", // 合計金額
      month,
    ];
  });

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].map(line => line.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="credix_payment_${month}.csv"`,
    },
  });
}
