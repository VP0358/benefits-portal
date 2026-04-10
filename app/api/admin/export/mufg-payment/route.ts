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

/**
 * 三菱UFJファクター口座振替CSV出力
 * 条件: オートシップ有効 AND 支払い方法が口座振替
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM

  if (!month) {
    return new Response("対象月を指定してください", { status: 400 });
  }

  // オートシップ有効 AND 口座振替支払いの会員を取得
  const members = await prisma.mlmMember.findMany({
    where: {
      autoshipEnabled: true,
      paymentMethod: "bank_transfer",
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
          mlmRegistration: true,
        },
      },
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
    return new Response("口座振替決済対象の会員がいません", { status: 400 });
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
    "銀行名",
    "支店名",
    "口座種別",
    "口座番号",
    "口座名義",
    "商品コード",
    "商品名",
    "単価",
    "数量",
    "合計金額",
    "対象月",
  ];

  const rows = activeMembers.map(member => {
    const reg = member.user.mlmRegistration;
    // MlmMember直接格納（CSVインポート）を優先、なければMlmRegistrationを使用
    const bankName = member.bankName || reg?.bankName || "";
    const branchName = member.branchName || reg?.bankBranch || "";
    const accountType = member.accountType || reg?.bankAccountType || "普通";
    const accountNumber = member.accountNumber || reg?.bankAccountNumber || "";
    const accountHolder = member.accountHolder || reg?.bankAccountHolder || "";
    
    return [
      member.user.memberCode,
      member.memberCode,
      member.user.name,
      member.user.nameKana ?? "",
      member.user.email,
      member.user.phone ?? "",
      member.user.postalCode ?? "",
      member.user.address ?? "",
      bankName,
      branchName,
      accountType,
      accountNumber,
      accountHolder,
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
      "Content-Disposition": `attachment; filename="mufg_bank_transfer_${month}.csv"`,
    },
  });
}
