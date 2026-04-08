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

  const subscriptions = await prisma.travelSubscription.findMany({
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
    },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "サブスクID",
    "会員番号",
    "会員名",
    "メールアドレス",
    "電話番号",
    "プラン名",
    "レベル",
    "料金区分",
    "月額料金",
    "ステータス",
    "強制ステータス",
    "契約開始日",
    "確認日",
    "キャンセル日",
    "備考",
    "作成日時",
  ];

  const pricingTierLabel = (tier: string) => {
    if (tier === "early") return "初回50名";
    if (tier === "standard") return "51名以降";
    return tier;
  };

  const forceStatusLabel = (force: string) => {
    if (force === "forced_active") return "強制有効";
    if (force === "forced_inactive") return "強制無効";
    return "-";
  };

  const rows = subscriptions.map(sub => [
    sub.id.toString(),
    sub.user.memberCode,
    sub.user.name,
    sub.user.email,
    sub.user.phone ?? "",
    sub.planName,
    sub.level,
    pricingTierLabel(sub.pricingTier),
    Number(sub.monthlyFee),
    sub.status,
    forceStatusLabel(sub.forceStatus),
    sub.startedAt?.toISOString().slice(0, 10) ?? "",
    sub.confirmedAt?.toISOString().slice(0, 10) ?? "",
    sub.canceledAt?.toISOString().slice(0, 10) ?? "",
    sub.note ?? "",
    sub.createdAt.toISOString(),
  ]);

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].map(line => line.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="travel_subscriptions_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
