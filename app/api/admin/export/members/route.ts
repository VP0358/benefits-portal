// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

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

  const users = await prisma.user.findMany({
    where: status ? { status: status as "active" | "suspended" | "invited" } : {},
    include: {
      pointWallet: true,
      referrals: { where: { isActive: true }, include: { referrer: { select: { name: true } } } },
      contracts: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "会員番号", "氏名", "メールアドレス", "ステータス",
    "利用可能ポイント", "自動ポイント", "手動ポイント", "外部ポイント",
    "紹介者名", "有効契約プラン", "登録日時",
  ];

  const rows = users.map(user => [
    user.memberCode,
    user.name,
    user.email,
    user.status,
    user.pointWallet ? Number(user.pointWallet.availablePointsBalance) : 0,
    user.pointWallet ? Number(user.pointWallet.autoPointsBalance) : 0,
    user.pointWallet ? Number(user.pointWallet.manualPointsBalance) : 0,
    user.pointWallet ? Number(user.pointWallet.externalPointsBalance) : 0,
    user.referrals.map(r => r.referrer.name).join("・"),
    user.contracts[0]?.planName ?? "",
    user.createdAt.toISOString(),
  ]);

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].map(line => line.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
