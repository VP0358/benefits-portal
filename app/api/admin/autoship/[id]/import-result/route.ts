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

  // ── ファイル読み込み ──
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // ── 三菱UFJファクター固定長TXT判定 ──
  // 先頭5バイトが全て数字 かつ カンマが3未満 = 固定長フォーマット
  function isMufgFixedFormat(buf: Uint8Array): boolean {
    for (let i = 0; i < Math.min(5, buf.length); i++) {
      if (buf[i] < 0x30 || buf[i] > 0x39) return false;
    }
    let commaCount = 0;
    for (let i = 0; i < Math.min(200, buf.length); i++) {
      if (buf[i] === 0x2C) commaCount++;
    }
    return commaCount < 3;
  }

  // 結果マップ: memberCode → { ok, reason?, paidDate? }
  const resultMap = new Map<string, { ok: boolean; reason?: string; paidDate?: Date }>();

  // CSV日時文字列 → Date 変換ヘルパー（JST→UTC）
  function parseCsvDate(str: string): Date | null {
    if (!str || str === "-" || str === "") return null;
    const m = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
      const jst = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
      return new Date(jst.getTime() - 9 * 60 * 60 * 1000);
    }
    return null;
  }

  if (isMufgFixedFormat(uint8)) {
    // ══════════════════════════════════════════════════════════════
    // 三菱UFJファクター 固定長TXTフォーマット（全銀協準拠）
    // ══════════════════════════════════════════════════════════════
    // 正規化後フィールド:
    //   [0:5]   レコード種別（19xxx=ヘッダ, 80xxx=フッタ, 9=エンド, 他=データ）
    //   [42:43] 口座種別（1=普通, 2=当座）
    //   [43:50] 口座番号（7桁）← DB の accountNumber と照合
    //   [80:90] 引落金額（10桁）
    // ファイルに含まれる行は全て引き落とし成功

    const [ty, tm] = run.targetMonth.split("-").map(Number);
    const lastDayOfMonth = new Date(ty, tm, 0);
    const paidDateForAll = new Date(lastDayOfMonth.getTime() - 9 * 60 * 60 * 1000);

    // accountNumber → { ok, paidDate } のマップを一時構築
    const mufgAccountMap = new Map<string, { ok: boolean; paidDate: Date }>();

    // CRLF/LF で行分割
    const byteLines: Uint8Array[] = [];
    let bStart = 0;
    for (let i = 0; i < uint8.length; i++) {
      if (uint8[i] === 0x0A) {
        const end = (i > 0 && uint8[i-1] === 0x0D) ? i - 1 : i;
        byteLines.push(uint8.slice(bStart, end));
        bStart = i + 1;
      }
    }
    if (bStart < uint8.length) byteLines.push(uint8.slice(bStart));

    for (const byteLine of byteLines) {
      if (byteLine.length < 50) continue;
      // U+FFFD (ef bf bd) → '?' に正規化
      const norm: number[] = [];
      let bi = 0;
      while (bi < byteLine.length) {
        if (bi + 2 < byteLine.length &&
            byteLine[bi] === 0xEF && byteLine[bi+1] === 0xBF && byteLine[bi+2] === 0xBD) {
          norm.push(0x3F);
          bi += 3;
        } else {
          norm.push(byteLine[bi]);
          bi++;
        }
      }
      if (norm.length < 50) continue;

      const recType = norm.slice(0, 5).map(b => String.fromCharCode(b)).join("").trim();
      if (recType.startsWith("19") || recType.startsWith("80") || recType === "9" ||
          recType === "" || !/^\d{5}$/.test(recType)) continue;

      // 口座番号 [43:50]（先頭ゼロ除去して照合）
      const acNumRaw = norm.slice(43, 50).map(b => String.fromCharCode(b)).join("").trim();
      if (!acNumRaw || !/^\d+$/.test(acNumRaw)) continue;
      const acNum = acNumRaw.replace(/^0+/, "") || "0";

      if (!mufgAccountMap.has(acNum)) {
        mufgAccountMap.set(acNum, { ok: true, paidDate: paidDateForAll });
      }
    }

    // run に紐づく注文の accountNumber と突き合わせ
    // orders には accountNumber が保存されているのでそちらを使う
    for (const order of run.orders) {
      const acNorm = (order.accountNumber ?? "").replace(/^0+/, "") || "0";
      const entry = mufgAccountMap.get(acNorm);
      if (entry) {
        resultMap.set(order.memberCode, { ok: entry.ok, paidDate: entry.paidDate });
      }
    }

  } else {
    // ══════════════════════════════════════════════════════════════
    // CSV フォーマット（クレディックス / 汎用）
    // ══════════════════════════════════════════════════════════════

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

    const headerRaw = parseCsvLine(lines[0]);
    const header = headerRaw.map(h => h.replace(/^"|"$/g, "").replace(/^\uFEFF/, "").trim().toLowerCase());

    // クレディックスCSV自動判定
    const isCredixFormat = header.some(h =>
      h.includes("sendid") || h.includes("sendpoint") || h.includes("id(sendid)")
    );

    let codeIdx: number;
    let resultIdx: number;
    let reasonIdx: number;
    let dateIdx: number;

    if (isCredixFormat) {
      codeIdx   = header.findIndex(h => h.includes("sendid") || h === "id(sendid)" || h.includes("id(send"));
      resultIdx = header.findIndex(h => h.includes("結果") || h.includes("result"));
      dateIdx   = header.findIndex(h =>
        h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") ||
        h.includes("date") || h.includes("datetime")
      );
      if (codeIdx   === -1) codeIdx   = 10;
      if (resultIdx === -1) resultIdx = 4;
      if (dateIdx   === -1) dateIdx   = 3;
      reasonIdx = -1;
    } else {
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

    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
      const memberCode = cols[codeIdx] ?? "";
      if (!memberCode || memberCode === "-") continue;

      let ok: boolean;
      let reason: string | undefined;
      const rawDate = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
      const paidDate = parseCsvDate(rawDate) ?? undefined;

      if (isCredixFormat) {
        ok = true;
      } else {
        const result = cols[resultIdx] ?? "";
        ok = result === "OK" || result === "0" || result.toLowerCase() === "success" ||
             result === "1" || result.includes("完了") || result.includes("成功");
        reason = reasonIdx >= 0 ? (cols[reasonIdx] ?? undefined) : undefined;
      }

      resultMap.set(memberCode, { ok, reason, paidDate });
    }
  } // end CSV format

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
