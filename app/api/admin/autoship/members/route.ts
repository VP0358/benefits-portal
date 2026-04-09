// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

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
  const allMembers = await prisma.mlmMember.findMany({
    where: { autoshipEnabled: true, status: { not: "withdrawn" } },
    include: {
      user: {
        select: { name: true, nameKana: true, phone: true, email: true, postalCode: true },
      },
      mlmRegistration: {
        select: { bankAccountNumber: true },
      },
    },
  });

  // 対象月・支払方法でフィルタ
  const filtered = allMembers.filter(m => {
    // stopDate チェック
    if (m.autoshipStopDate && m.autoshipStopDate <= new Date(`${targetMonth}-01`)) return false;
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
      memberName: m.user.name,
      memberPhone: m.user.phone ?? null,
      memberEmail: m.user.email ?? null,
      paymentMethod: paymentMethod,
    })),
    total: filtered.length,
  });
}
