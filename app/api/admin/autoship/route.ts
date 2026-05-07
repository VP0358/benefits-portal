// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { getMlmDisplayName } from "@/lib/mlm-display-name";

/** GET: オートシップ実行一覧 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const runs = await prisma.autoShipRun.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: [{ targetMonth: "desc" }, { paymentMethod: "asc" }],
  });

  return NextResponse.json(
    runs.map(r => ({
      id: r.id.toString(),
      targetMonth: r.targetMonth,
      paymentMethod: r.paymentMethod,
      status: r.status,
      totalCount: r.totalCount,
      paidCount: r.paidCount,
      failedCount: r.failedCount,
      totalAmount: r.totalAmount,
      exportedAt: r.exportedAt,
      importedAt: r.importedAt,
      completedAt: r.completedAt,
      note: r.note,
      createdAt: r.createdAt,
      orderCount: r._count.orders,
    }))
  );
}

/** POST: 月次オートシップ伝票を作成（対象会員を自動収集） */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { targetMonth, paymentMethod } = await request.json();
  // targetMonth: "YYYY-MM", paymentMethod: "credit_card" | "bank_transfer"
  if (!targetMonth || !paymentMethod) {
    return NextResponse.json({ error: "targetMonth と paymentMethod は必須です" }, { status: 400 });
  }

  // 既存チェック
  const existing = await prisma.autoShipRun.findUnique({
    where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
  });
  if (existing) {
    return NextResponse.json({ error: "この月・支払い方法の実行はすでに存在します" }, { status: 409 });
  }

  // オートシップ有効なMLM会員を取得
  // autoshipEnabled=true かつ 支払い方法が一致 かつ stopDate未来ornull かつ suspend月でない
  const allMembers = await prisma.mlmMember.findMany({
    where: { autoshipEnabled: true, status: { not: "withdrawn" } },
    include: {
      user: {
        select: {
          name: true, nameKana: true, phone: true, email: true,
          postalCode: true, address: true,
        },
      },
      mlmRegistration: {
        select: {
          bankName: true, bankBranch: true, bankAccountType: true,
          bankAccountNumber: true, bankAccountHolder: true,
          deliveryPostalCode: true, deliveryAddress: true, deliveryName: true,
        },
      },
    },
  });

  // 支払い方法フィルタ（会員の paymentMethod フィールドで判定）
  const targetMonthStart = new Date(`${targetMonth}-01`);
  const filtered = allMembers.filter(m => {
    // stopDate チェック（stopDateが対象月以前なら除外）
    if (m.autoshipStopDate && m.autoshipStopDate <= targetMonthStart) return false;
    // startDate チェック（startDateが入力されていて、対象月より未来なら除外）
    if (m.autoshipStartDate && m.autoshipStartDate > targetMonthStart) return false;
    // suspend月チェック
    if (m.autoshipSuspendMonths) {
      const months = m.autoshipSuspendMonths.split(",").map(s => s.trim());
      if (months.includes(targetMonth)) return false;
    }
    // 支払い方法判定: 会員に設定された paymentMethod で一致を確認
    return m.paymentMethod === paymentMethod;
  });

  if (filtered.length === 0) {
    return NextResponse.json({ error: "対象会員が0件です" }, { status: 400 });
  }

  const UNIT_PRICE = 16500;
  const POINTS = 150;

  // トランザクションで AutoShipRun + AutoShipOrder を一括作成
  const run = await prisma.$transaction(async (tx) => {
    const newRun = await tx.autoShipRun.create({
      data: {
        targetMonth,
        paymentMethod: paymentMethod as "credit_card" | "bank_transfer",
        totalCount: filtered.length,
        totalAmount: filtered.length * UNIT_PRICE,
      },
    });

    await tx.autoShipOrder.createMany({
      data: filtered.map(m => ({
        autoShipRunId: newRun.id,
        mlmMemberId: m.id,
        targetMonth,
        paymentMethod: paymentMethod as "credit_card" | "bank_transfer",
        memberCode: m.memberCode,
        memberName: getMlmDisplayName(m.user.name, m.companyName),
        memberNameKana: m.user.nameKana ?? null,
        memberPhone: m.user.phone ?? null,
        memberEmail: m.user.email ?? null,
        memberPostal: m.mlmRegistration?.deliveryPostalCode ?? m.user.postalCode ?? null,
        memberAddress: m.mlmRegistration?.deliveryAddress ?? m.user.address ?? null,
        bankName: m.mlmRegistration?.bankName ?? null,
        branchName: m.mlmRegistration?.bankBranch ?? null,
        accountType: m.mlmRegistration?.bankAccountType ?? null,
        accountNumber: m.mlmRegistration?.bankAccountNumber ?? null,
        accountHolder: m.mlmRegistration?.bankAccountHolder ?? null,
        unitPrice: UNIT_PRICE,
        totalAmount: UNIT_PRICE,
        points: POINTS,
      })),
    });

    return newRun;
  });

  return NextResponse.json({ id: run.id.toString(), targetMonth, totalCount: filtered.length }, { status: 201 });
}
