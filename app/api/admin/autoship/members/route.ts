// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { getMlmDisplayName } from "@/lib/mlm-display-name";

/**
 * GET: 対象月・支払い方法で対象になるオートシップ有効会員の一覧を返す
 * query: targetMonth=YYYY-MM, paymentMethod=credit_card|bank_transfer
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const targetMonth  = searchParams.get("targetMonth") ?? "";
  const paymentMethod = searchParams.get("paymentMethod") as "credit_card" | "bank_transfer" | null;

  if (!targetMonth || !paymentMethod) {
    return NextResponse.json({ error: "targetMonth と paymentMethod は必須です" }, { status: 400 });
  }

  // オートシップ有効会員を取得
  // 条件: autoshipEnabled=true かつ 退会でない かつ 開始日あり
  const allMembers = await prisma.mlmMember.findMany({
    where: {
      autoshipEnabled: true,
      status: { not: "withdrawn" },
      autoshipStartDate: { not: null }, // 開始日が設定されていること
    },
    include: {
      user: {
        select: { name: true, nameKana: true, phone: true, email: true, postalCode: true },
      },
      mlmRegistration: {
        select: { bankAccountNumber: true },
      },
    },
  });

  // 対象月の翌月1日を計算（停止日が翌月以降なら当月は有効）
  const [year, month] = targetMonth.split("-").map(Number);
  const targetMonthStart = new Date(`${targetMonth}-01`);
  // 翌月1日 = 停止日がこれ以降なら当月は有効
  const nextMonthStart = new Date(year, month, 1); // month は0-indexedではないので month = 翌月

  // 対象月・支払方法でフィルタ
  const filtered = allMembers.filter(m => {
    // 開始日が対象月より後なら除外
    if (m.autoshipStartDate && m.autoshipStartDate > targetMonthStart) return false;

    // stopDate チェック: 停止日が対象月の翌月より前（= 対象月中に停止）なら除外
    // 停止日が翌月以降なら当月は有効
    if (m.autoshipStopDate) {
      // 停止日 <= 対象月の末日 (= 翌月1日より前) の場合は除外
      if (m.autoshipStopDate < nextMonthStart) return false;
    }
    // 停止日が空欄（null）= 停止予定なし → 継続有効

    // suspend月チェック
    if (m.autoshipSuspendMonths) {
      const months = m.autoshipSuspendMonths.split(",").map(s => s.trim());
      if (months.includes(targetMonth)) return false;
    }
    // 支払い方法判定
    const hasBank = !!(m.mlmRegistration?.bankAccountNumber);
    if (paymentMethod === "bank_transfer") return hasBank;
    return !hasBank;
  });

  return NextResponse.json({
    members: filtered.map(m => ({
      id: m.id.toString(),
      memberCode: m.memberCode,
      memberName: getMlmDisplayName(m.user.name, m.companyName),
      memberPhone: m.user.phone ?? null,
      memberEmail: m.user.email ?? null,
      paymentMethod: paymentMethod,
    })),
    total: filtered.length,
  });
}
