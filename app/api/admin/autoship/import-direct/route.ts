// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * POST: クレディックス / 三菱UFJファクター から出力されたCSVを直接インポート
 *       ・伝票（AutoShipRun）が未作成なら自動作成
 *       ・CSVの結果を取り込み、決済成功会員を当月アクティブに反映
 *
 * FormData:
 *   file:          CSV ファイル
 *   targetMonth:   YYYY-MM
 *   paymentMethod: credit_card | bank_transfer
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const formData = await request.formData();
  const file          = formData.get("file") as File | null;
  const targetMonth   = formData.get("targetMonth") as string | null;
  const paymentMethod = formData.get("paymentMethod") as "credit_card" | "bank_transfer" | null;

  if (!file || !targetMonth || !paymentMethod) {
    return NextResponse.json({ error: "file, targetMonth, paymentMethod は必須です" }, { status: 400 });
  }

  // ── CSV 解析 ──
  const text  = await file.text();
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSVにデータがありません" }, { status: 400 });
  }

  const header    = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const codeIdx   = header.findIndex(h => h.includes("会員") || h.includes("code") || h.includes("コード"));
  const resultIdx = header.findIndex(h => h.includes("結果") || h.includes("result") || h.includes("status"));
  const reasonIdx = header.findIndex(h => h.includes("理由") || h.includes("reason") || h.includes("error"));

  if (codeIdx === -1 || resultIdx === -1) {
    return NextResponse.json(
      { error: "CSVの形式が正しくありません（会員コード・決済結果列が必要）" },
      { status: 400 }
    );
  }

  // memberCode → { ok, reason }
  const resultMap = new Map<string, { ok: boolean; reason?: string }>();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols       = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const memberCode = cols[codeIdx] ?? "";
    const result     = cols[resultIdx] ?? "";
    const reason     = reasonIdx >= 0 ? cols[reasonIdx] : undefined;
    const ok         = result === "OK" || result === "0" || result.toLowerCase() === "success" || result === "1";
    resultMap.set(memberCode, { ok, reason });
  }

  // ── 対象会員取得 ──
  const memberCodes   = Array.from(resultMap.keys());
  const mlmMembers    = await prisma.mlmMember.findMany({
    where: { memberCode: { in: memberCodes } },
    include: {
      user: {
        select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
      },
      mlmRegistration: {
        select: {
          bankName: true, bankBranch: true, bankAccountType: true,
          bankAccountNumber: true, bankAccountHolder: true,
          deliveryPostalCode: true, deliveryAddress: true,
        },
      },
    },
  });

  const memberMap = new Map(mlmMembers.map(m => [m.memberCode, m]));

  const UNIT_PRICE = 16500;
  const POINTS     = 150;
  const now        = new Date();

  // ── 伝票（AutoShipRun）を取得 or 作成 ──
  let run = await prisma.autoShipRun.findUnique({
    where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
    include: { orders: true },
  });

  let runCreated = false;
  if (!run) {
    // 伝票がまだないので新規作成
    runCreated = true;
    await prisma.$transaction(async (tx) => {
      const newRun = await tx.autoShipRun.create({
        data: {
          targetMonth,
          paymentMethod,
          totalCount: mlmMembers.length,
          totalAmount: mlmMembers.length * UNIT_PRICE,
        },
      });

      await tx.autoShipOrder.createMany({
        data: mlmMembers.map(m => ({
          autoShipRunId: newRun.id,
          mlmMemberId:   m.id,
          targetMonth,
          paymentMethod,
          memberCode:    m.memberCode,
          memberName:    m.user.name,
          memberNameKana: m.user.nameKana ?? null,
          memberPhone:   m.user.phone ?? null,
          memberEmail:   m.user.email ?? null,
          memberPostal:  m.mlmRegistration?.deliveryPostalCode ?? m.user.postalCode ?? null,
          memberAddress: m.mlmRegistration?.deliveryAddress ?? m.user.address ?? null,
          bankName:      m.mlmRegistration?.bankName ?? null,
          branchName:    m.mlmRegistration?.bankBranch ?? null,
          accountType:   m.mlmRegistration?.bankAccountType ?? null,
          accountNumber: m.mlmRegistration?.bankAccountNumber ?? null,
          accountHolder: m.mlmRegistration?.bankAccountHolder ?? null,
          unitPrice:     UNIT_PRICE,
          totalAmount:   UNIT_PRICE,
          points:        POINTS,
        })),
        skipDuplicates: true,
      });
    });

    run = await prisma.autoShipRun.findUnique({
      where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
      include: { orders: true },
    });
  }

  if (!run) {
    return NextResponse.json({ error: "伝票の取得に失敗しました" }, { status: 500 });
  }

  // ── 結果を取り込んでアクティブ反映 ──
  let paidCount   = 0;
  let failedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const order of run!.orders) {
      const res = resultMap.get(order.memberCode);
      if (!res) continue;

      if (res.ok) {
        // 決済成功
        await tx.autoShipOrder.update({
          where: { id: order.id },
          data: { status: "paid", paidAt: now },
        });

        // MlmPurchase 記録（重複チェック）
        const existingPurchase = await tx.mlmPurchase.findFirst({
          where: {
            mlmMemberId:   order.mlmMemberId,
            purchaseMonth: targetMonth,
            productCode:   order.productCode,
          },
        });
        if (!existingPurchase) {
          await tx.mlmPurchase.create({
            data: {
              mlmMemberId:  order.mlmMemberId,
              productCode:  order.productCode,
              productName:  order.productName,
              quantity:     order.quantity,
              unitPrice:    order.unitPrice,
              points:       order.points,
              totalPoints:  order.points * order.quantity,
              purchaseMonth: targetMonth,
              purchasedAt:  now,
            },
          });
        }

        // 会員ステータスをアクティブに
        await tx.mlmMember.update({
          where: { id: order.mlmMemberId },
          data:  { status: "active" },
        });

        // SAVボーナス付与（オートシップ時: 15,000円の5% = 750pt 固定）
        const memberRecord = memberMap.get(order.memberCode);
        if (memberRecord) {
          const AUTOSHIP_BASE = 15000;
          const AUTOSHIP_RATE = 0.05;
          const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE); // 750pt
          if (savingsPoints > 0) {
            await tx.pointWallet.upsert({
              where: { userId: memberRecord.userId },
              update: {
                externalPointsBalance: { increment: savingsPoints },
                availablePointsBalance: { increment: savingsPoints },
              },
              create: {
                userId:                memberRecord.userId,
                externalPointsBalance: savingsPoints,
                availablePointsBalance: savingsPoints,
              },
            });
            // MlmMemberの貯金ポイント累計も更新
            await tx.mlmMember.update({
              where: { id: memberRecord.id },
              data: { savingsPoints: { increment: savingsPoints } },
            });
          }
        }

        paidCount++;
      } else {
        // 決済失敗
        await tx.autoShipOrder.update({
          where: { id: order.id },
          data: { status: "failed", failReason: res.reason ?? "決済失敗" },
        });
        failedCount++;
      }
    }

    // Run ステータス更新
    await tx.autoShipRun.update({
      where: { id: run!.id },
      data: {
        paidCount,
        failedCount,
        importedAt: now,
        status:     paidCount + failedCount > 0 ? "imported" : "draft",
      },
    });
  });

  return NextResponse.json({
    runId:       run.id.toString(),
    paidCount,
    failedCount,
    runCreated,
  }, { status: 200 });
}
