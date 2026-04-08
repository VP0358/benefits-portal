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
  const status = searchParams.get("status");

  const contracts = await prisma.mobileContract.findMany({
    where: status ? { status: status as "pending" | "active" | "canceled" | "suspended" } : {},
    include: {
      user: {
        select: {
          memberCode: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      referrer: {
        select: {
          name: true,
          memberCode: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "契約ID",
    "契約番号",
    "会員番号",
    "会員名",
    "メールアドレス",
    "電話番号",
    "プラン名",
    "月額料金",
    "ステータス",
    "紹介者会員番号",
    "紹介者名",
    "契約開始日",
    "確認日",
    "キャンセル日",
    "備考",
    "作成日時",
  ];

  const rows = contracts.map(contract => [
    contract.id.toString(),
    contract.contractNumber ?? "",
    contract.user.memberCode,
    contract.user.name,
    contract.user.email,
    contract.user.phone ?? "",
    contract.planName,
    Number(contract.monthlyFee),
    contract.status,
    contract.referrer?.memberCode ?? "",
    contract.referrer?.name ?? "",
    contract.startedAt?.toISOString().slice(0, 10) ?? "",
    contract.confirmedAt?.toISOString().slice(0, 10) ?? "",
    contract.canceledAt?.toISOString().slice(0, 10) ?? "",
    contract.note ?? "",
    contract.createdAt.toISOString(),
  ]);

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].map(line => line.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mobile_contracts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
