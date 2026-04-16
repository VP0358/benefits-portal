// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { getMlmDisplayName } from "@/lib/mlm-display-name";

/**
 * GET: 対象月・支払い方法で対象になるオートシップ有効会員の一覧を返す
 * query:
 *   targetMonth=YYYY-MM  (必須)
 *   paymentMethod=credit_card|bank_transfer|bank_payment|cod|other  (任意: 未指定=全件)
 *
 * 会員詳細の「継続購入設定」に登録されている MlmMember.paymentMethod フィールドで絞り込む
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const targetMonth   = searchParams.get("targetMonth") ?? "";
  const paymentMethod = searchParams.get("paymentMethod") ?? ""; // 空=全件

  if (!targetMonth) {
    return NextResponse.json({ error: "targetMonth は必須です" }, { status: 400 });
  }

  // --- where 条件構築 ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    autoshipEnabled: true,
    status: { not: "withdrawn" },
    autoshipStartDate: { not: null }, // 開始日が設定されていること
  };

  // 支払い方法が指定されている場合のみ絞り込む
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  // オートシップ有効会員を取得
  const allMembers = await prisma.mlmMember.findMany({
    where,
    include: {
      user: {
        select: { name: true, nameKana: true, phone: true, email: true, postalCode: true },
      },
    },
  });

  // 対象月の日付計算
  const [year, month] = targetMonth.split("-").map(Number);
  const targetMonthStart = new Date(`${targetMonth}-01`);
  // 翌月1日
  const nextMonthStart = new Date(year, month, 1);

  // 対象月・停止日・停止月でフィルタ
  const filtered = allMembers.filter(m => {
    // 開始日が対象月より後なら除外
    if (m.autoshipStartDate && m.autoshipStartDate > targetMonthStart) return false;

    // stopDate チェック: 停止日が対象月の翌月より前（= 対象月中に停止）なら除外
    if (m.autoshipStopDate) {
      if (m.autoshipStopDate < nextMonthStart) return false;
    }

    // suspend月チェック
    if (m.autoshipSuspendMonths) {
      const months = m.autoshipSuspendMonths.split(",").map(s => s.trim());
      if (months.includes(targetMonth)) return false;
    }

    return true;
  });

  // 支払い方法の表示ラベル
  const PM_LABELS: Record<string, string> = {
    credit_card:   "クレジットカード",
    bank_transfer: "口座引き落とし",
    bank_payment:  "銀行振込",
    cod:           "代引き",
    other:         "その他",
  };

  return NextResponse.json({
    members: filtered.map(m => ({
      id:               m.id.toString(),
      memberCode:       m.memberCode,
      memberName:       getMlmDisplayName(m.user.name, m.companyName),
      memberPhone:      m.user.phone ?? null,
      memberEmail:      m.user.email ?? null,
      paymentMethod:    m.paymentMethod,
      paymentMethodLabel: PM_LABELS[m.paymentMethod] ?? m.paymentMethod,
      autoshipStartDate: m.autoshipStartDate?.toISOString() ?? null,
      autoshipStopDate:  m.autoshipStopDate?.toISOString() ?? null,
    })),
    total: filtered.length,
  });
}
