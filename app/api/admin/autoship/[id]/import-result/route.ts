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
  try {
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

  // ── CSV 読み込み（Shift-JIS / UTF-8 両対応） ──
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  function looksLikeShiftJis(buf: Uint8Array): boolean {
    for (let i = 0; i < Math.min(buf.length, 4096); i++) {
      const b = buf[i];
      if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xEF)) return true;
    }
    return false;
  }

  const hasUtf8Bom = uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF;
  let rawText: string;
  if (!hasUtf8Bom && looksLikeShiftJis(uint8)) {
    rawText = new TextDecoder("shift-jis").decode(arrayBuffer);
  } else {
    rawText = new TextDecoder("utf-8").decode(arrayBuffer);
  }

  const text = rawText.replace(/^\uFEFF/, "");
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSVにデータがありません（ヘッダー行のみ）" }, { status: 400 });
  }

  // CSVの列を解析するヘルパー（引用符対応）
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  // ヘッダー行を解析して列インデックスを特定
  const headerRaw = parseCsvLine(lines[0]);
  const header = headerRaw.map(h => h.replace(/^"|"$/g, "").replace(/^\uFEFF/, "").trim().toLowerCase());

  // クレディックスCSV自動判定（ID(sendid) 列を含む形式）
  const isCredixFormat = header.some(h =>
    h.includes("sendid") || h.includes("sendpoint") || h.includes("id(sendid)")
  );

  let codeIdx: number;
  let resultIdx: number;
  let reasonIdx: number;
  let dateIdx: number; // 決済日時列

  if (isCredixFormat) {
    // クレディックスCSV: col[10]=ID(sendid)=会員コード、全行が決済成功
    codeIdx   = header.findIndex(h => h.includes("sendid") || h === "id(sendid)" || h.includes("id(send"));
    resultIdx = header.findIndex(h => h.includes("結果") || h.includes("result"));
    dateIdx   = header.findIndex(h =>
      h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") ||
      h.includes("date") || h.includes("datetime")
    );
    if (codeIdx   === -1) codeIdx   = 10;
    if (resultIdx === -1) resultIdx = 4;
    if (dateIdx   === -1) dateIdx   = 3;  // フォールバック: 4列目（0-indexed: 3）
    reasonIdx = -1;
  } else {
    // 汎用フォーマット
    codeIdx   = header.findIndex(h => h.includes("会員") || h.includes("code") || h.includes("コード"));
    resultIdx = header.findIndex(h => h.includes("結果") || h.includes("result") || h.includes("status"));
    dateIdx   = header.findIndex(h =>
      h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") ||
      h.includes("date") || h.includes("datetime")
    );
    reasonIdx = header.findIndex(h => h.includes("理由") || h.includes("reason") || h.includes("error"));
  }

  if (codeIdx === -1) {
    return NextResponse.json({
      error: `CSVの形式が正しくありません（会員コード列が見つかりません）。検出されたヘッダー: [${headerRaw.join(", ")}]`,
      detectedHeaders: headerRaw,
      isCredixFormat,
    }, { status: 400 });
  }

  const dataLines = lines.slice(1);

  // CSV日時文字列 → Date 変換ヘルパー
  // 対応形式: "2026/5/5 15:29" "2026-05-05 15:29:00" 等
  function parseCsvDate(str: string): Date | null {
    if (!str || str === "-" || str === "") return null;
    const m = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
      // JST → UTC（-9h）で保存
      const jst = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
      return new Date(jst.getTime() - 9 * 60 * 60 * 1000);
    }
    return null;
  }

  // 結果マップ: memberCode → { ok: boolean, reason?: string, paidDate?: Date }
  const resultMap = new Map<string, { ok: boolean; reason?: string; paidDate?: Date }>();
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
    const memberCode = cols[codeIdx] ?? "";
    if (!memberCode || memberCode === "-") continue;

    let ok: boolean;
    let reason: string | undefined;
    // 決済日時をCSVから取得
    const rawDate = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
    const paidDate = parseCsvDate(rawDate) ?? undefined;

    if (isCredixFormat) {
      // クレディックスCSVはファイル内の全行が決済成功
      ok = true;
    } else {
      const result = cols[resultIdx] ?? "";
      // 「決済完了」「OK」「0」「success」「1」「完了」「成功」を成功と判定
      ok = result === "OK" || result === "0" || result.toLowerCase() === "success" ||
           result === "1" || result.includes("完了") || result.includes("成功");
      reason = reasonIdx >= 0 ? (cols[reasonIdx] ?? undefined) : undefined;
    }

    resultMap.set(memberCode, { ok, reason, paidDate });
  }

  const now = new Date();
  const targetMonth = run.targetMonth;
  let paidCount = 0;
  let failedCount = 0;

  // 注文ごとにステータス更新
  try {
  await prisma.$transaction(async (tx) => {
    for (const order of run.orders) {
      const res = resultMap.get(order.memberCode);
      if (!res) continue; // CSV未記載はスキップ

      if (res.ok) {
        // 決済成功: paidAt はCSVの決済日時を優先、なければ現在時刻
        await tx.autoShipOrder.update({
          where: { id: order.id },
          data: { status: "paid", paidAt: res.paidDate ?? now },
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
              purchaseStatus: 'autoship',
              purchaseMonth: targetMonth,
              purchasedAt: res.paidDate ?? now,
            },
          });
        }

        // MlmMember のアクティブ反映
        // ※実際のアクティブ判定はボーナス計算時だが、ここでは status を active に
        await tx.mlmMember.update({
          where: { id: order.mlmMemberId },
          data: { status: "active" },
        });

        // SAVボーナス自動付与（オートシップ支払完了時: 15,000円の5% = 750pt 固定）
        {
          const AUTOSHIP_BASE = 15000;
          const AUTOSHIP_RATE = 0.05;
          const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE); // 750pt

          if (savingsPoints > 0) {
            const member = await tx.mlmMember.findUnique({
              where: { id: order.mlmMemberId },
              select: { userId: true },
            });
            if (member) {
              await tx.pointWallet.upsert({
                where: { userId: member.userId },
                update: {
                  externalPointsBalance: { increment: savingsPoints },
                  availablePointsBalance: { increment: savingsPoints },
                },
                create: {
                  userId: member.userId,
                  externalPointsBalance: savingsPoints,
                  availablePointsBalance: savingsPoints,
                },
              });
              await tx.mlmMember.update({
                where: { id: order.mlmMemberId },
                data: { savingsPoints: { increment: savingsPoints } },
              });
              console.log(`💰 SAVボーナス付与（AS）: 会員${order.memberCode} +${savingsPoints}pt`);
            }
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
  } catch (txErr) {
    console.error("[import-result] トランザクションエラー:", txErr);
    return NextResponse.json({ error: `取り込みに失敗しました: ${txErr instanceof Error ? txErr.message : String(txErr)}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    paidCount,
    failedCount,
    totalProcessed: paidCount + failedCount,
  });

  } catch (unexpectedErr) {
    console.error("[import-result] 予期しないエラー:", unexpectedErr);
    return NextResponse.json(
      { error: `取り込み処理中にエラーが発生しました: ${unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr)}` },
      { status: 500 }
    );
  }
}
