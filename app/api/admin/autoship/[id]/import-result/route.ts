// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * POST: 決済会社からの結果CSVを取り込み、アクティブ反映 + MlmPurchase登録
 *
 * CSVフォーマット（クレディックス / 三菱UFJファクター共通の取込フォーマット）:
 * ヘッダー行: 会員コード,決済結果,失敗理由
 * 結果コード: "OK" or "0" = 成功, それ以外 = 失敗
 */
export async function POST(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;

  const run = await prisma.autoShipRun.findUnique({
    where: { id: BigInt(id) },
    include: { orders: true },
  });
  if (!run) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (run.status === "completed") {
    return NextResponse.json({ error: "すでに完了済みです" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "CSVファイルが必要です" }, { status: 400 });

  const text = await file.text();
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());

  // ヘッダー行を解析して列インデックスを特定
  const header = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const codeIdx   = header.findIndex(h => h.includes("会員") || h.includes("code") || h.includes("コード"));
  const resultIdx = header.findIndex(h => h.includes("結果") || h.includes("result") || h.includes("status"));
  const reasonIdx = header.findIndex(h => h.includes("理由") || h.includes("reason") || h.includes("error"));

  if (codeIdx === -1 || resultIdx === -1) {
    return NextResponse.json({ error: "CSVの形式が正しくありません（会員コード・決済結果列が必要）" }, { status: 400 });
  }

  const dataLines = lines.slice(1);

  // 結果マップ: memberCode → { ok: boolean, reason?: string }
  const resultMap = new Map<string, { ok: boolean; reason?: string }>();
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const memberCode = cols[codeIdx] ?? "";
    const result     = cols[resultIdx] ?? "";
    const reason     = reasonIdx >= 0 ? cols[reasonIdx] : undefined;
    const ok = result === "OK" || result === "0" || result.toLowerCase() === "success" || result === "1";
    resultMap.set(memberCode, { ok, reason });
  }

  const now = new Date();
  const targetMonth = run.targetMonth;
  let paidCount = 0;
  let failedCount = 0;

  // 注文ごとにステータス更新
  await prisma.$transaction(async (tx) => {
    for (const order of run.orders) {
      const res = resultMap.get(order.memberCode);
      if (!res) continue; // CSV未記載はスキップ

      if (res.ok) {
        // 決済成功
        await tx.autoShipOrder.update({
          where: { id: order.id },
          data: { status: "paid", paidAt: now },
        });

        // MlmPurchase に記録（アクティブ判定に使用）
        // 同月・同会員の重複を防ぐため、既存チェック後にcreate
        const existingPurchase = await tx.mlmPurchase.findFirst({
          where: {
            mlmMemberId: order.mlmMemberId,
            purchaseMonth: targetMonth,
            productCode: order.productCode,
          },
        });
        if (!existingPurchase) {
          await tx.mlmPurchase.create({
            data: {
              mlmMemberId: order.mlmMemberId,
              productCode: order.productCode,
              productName: order.productName,
              quantity: order.quantity,
              unitPrice: order.unitPrice,
              points: order.points,
              totalPoints: order.points * order.quantity,
              purchaseMonth: targetMonth,
              purchasedAt: now,
            },
          });
        }

        // MlmMember のアクティブ反映
        // ※実際のアクティブ判定はボーナス計算時だが、ここでは status を active に
        await tx.mlmMember.update({
          where: { id: order.mlmMemberId },
          data: { status: "active" },
        });

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

    // AutoShipRun の集計を更新
    await tx.autoShipRun.update({
      where: { id: BigInt(id) },
      data: {
        status: "completed",
        paidCount,
        failedCount,
        importedAt: now,
        completedAt: now,
      },
    });
  });

  return NextResponse.json({
    success: true,
    paidCount,
    failedCount,
    totalProcessed: paidCount + failedCount,
  });
}
