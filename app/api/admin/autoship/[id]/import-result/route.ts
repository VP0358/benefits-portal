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
 * 修正履歴:
 * - prisma.$transaction() ループ処理 → updateMany 一括更新に変更（タイムアウト回避）
 * - status: "imported" → "completed" に修正（AutoShipRunStatus enum に"imported"は存在しない）
 * - MlmPurchase/PointWallet処理をトランザクション外に移動（エラーでロールバックしない）
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
          const end = (i > 0 && uint8[i - 1] === 0x0D) ? i - 1 : i;
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
            byteLine[bi] === 0xEF && byteLine[bi + 1] === 0xBF && byteLine[bi + 2] === 0xBD) {
            norm.push(0x3F);
            bi += 3;
          } else {
            norm.push(byteLine[bi]);
            bi++;
          }
        }
        if (norm.length < 50) continue;

        const recType = norm.slice(0, 5).map(b => String.fromCharCode(b)).join("").trim();
        if (recType.startsWith("19") || recType.startsWith("80") ||
          recType.trimStart().startsWith("9") || recType.trim() === "" ||
          !/^\d/.test(recType)) continue;

        // 口座番号: [42:50]（8桁、先頭ゼロ除去して照合）
        if (norm.length < 90) continue;
        const acNumRaw = norm.slice(42, 50).map(b => String.fromCharCode(b)).join("").trim();
        if (!acNumRaw || !/^\d+$/.test(acNumRaw)) continue;
        const acNum = acNumRaw.replace(/^0+/, "") || "0";

        if (!mufgAccountMap.has(acNum)) {
          mufgAccountMap.set(acNum, { ok: true, paidDate: paidDateForAll });
        }
      }

      // run に紐づく注文の accountNumber と突き合わせ
      const defaultPaidDate = mufgAccountMap.values().next().value?.paidDate ?? paidDateForAll;
      for (const order of run.orders) {
        const acNorm = ((order as any).accountNumber ?? "").replace(/^0+/, "") || "";
        const entry = acNorm ? mufgAccountMap.get(acNorm) : undefined;
        // TXTファイルに含まれる行は全て引き落とし成功
        // accountNumber一致 → そのpaidDate、不一致 → 全件成功（月末日）
        resultMap.set(order.memberCode, {
          ok: true,
          paidDate: entry?.paidDate ?? defaultPaidDate,
        });
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
        const rawCode = cols[codeIdx] ?? "";
        if (!rawCode || rawCode === "-") continue;

        // sendId → memberCode 変換（クレディックスCSV対応）
        const digits = rawCode.startsWith("WC") ? rawCode.slice(2) : rawCode;
        let memberCode: string;
        if (/^\d{8}$/.test(digits)) {
          memberCode = `${digits.slice(0, 6)}-${digits.slice(6)}`;
        } else {
          memberCode = rawCode;
        }

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
    const UNIT_PRICE = 16500;
    const POINTS = 150;
    let paidCount = 0;
    let failedCount = 0;
    const postProcessErrors: string[] = [];

    // ──────────────────────────────────────────────────────────────
    // 第1段階: AutoShipOrder を updateMany で一括更新（タイムアウト回避）
    // ★ prisma.$transaction() + ループ update は5秒タイムアウトを超えるため廃止
    // ──────────────────────────────────────────────────────────────
    try {
      const paidByDate = new Map<string, bigint[]>(); // ISO文字列 → order ids
      const failedOrders: { id: bigint; reason: string }[] = [];

      for (const order of run.orders) {
        const res = resultMap.get(order.memberCode);
        if (!res) {
          // CSVに記載なし → 三菱UFJファクターの場合は全件成功なので全件 paid 扱い
          // CSVフォーマットの場合はスキップ
          continue;
        }
        if (res.ok) {
          const dateKey = (res.paidDate ?? now).toISOString();
          if (!paidByDate.has(dateKey)) paidByDate.set(dateKey, []);
          paidByDate.get(dateKey)!.push(order.id);
          paidCount++;
        } else {
          failedOrders.push({ id: order.id, reason: res.reason ?? "決済失敗" });
          failedCount++;
        }
      }

      // paid: paidDate ごとに updateMany（DB往復を最小化）
      for (const [dateKey, ids] of paidByDate) {
        await prisma.autoShipOrder.updateMany({
          where: { id: { in: ids } },
          data:  { status: "paid", paidAt: new Date(dateKey) },
        });
      }

      // failed: failReason は個別に異なる場合があるため個別 update（件数は少ない）
      for (const fo of failedOrders) {
        await prisma.autoShipOrder.update({
          where: { id: fo.id },
          data:  { status: "failed", failReason: fo.reason },
        });
      }

      // AutoShipRun の集計を更新
      // ★ status: "completed" を使用（"imported" は AutoShipRunStatus enum に存在しない）
      await prisma.autoShipRun.update({
        where: { id: BigInt(id) },
        data: {
          status:      "completed",
          paidCount,
          failedCount,
          importedAt:  now,
          completedAt: now,
        },
      });

    } catch (updateErr) {
      console.error("[import-result] 第1段階 updateMany エラー:", updateErr);
      return NextResponse.json({
        error: `取り込みに失敗しました: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`,
      }, { status: 500 });
    }

    // ──────────────────────────────────────────────────────────────
    // 第2段階: MlmPurchase / MlmMember / PointWallet 更新
    // ★ トランザクション外で処理 → エラーが出ても paidCount は保持される
    // ──────────────────────────────────────────────────────────────
    for (const order of run.orders) {
      const res = resultMap.get(order.memberCode);
      if (!res || !res.ok) continue;

      // MlmPurchase 記録
      try {
        const existingPurchase = await prisma.mlmPurchase.findFirst({
          where: {
            mlmMemberId:   order.mlmMemberId,
            purchaseMonth: targetMonth,
            productCode:   order.productCode ?? "2000",
          },
        });
        if (!existingPurchase) {
          await prisma.mlmPurchase.create({
            data: {
              mlmMemberId:    order.mlmMemberId,
              productCode:    order.productCode    ?? "2000",
              productName:    order.productName    ?? "VIOLA Pure 翠彩-SUMISAI-",
              quantity:       order.quantity       ?? 1,
              unitPrice:      order.unitPrice      ?? UNIT_PRICE,
              points:         order.points         ?? POINTS,
              totalPoints:    (order.points ?? POINTS) * (order.quantity ?? 1),
              purchaseStatus: "autoship",
              purchaseMonth:  targetMonth,
              purchasedAt:    res.paidDate ?? now,
            },
          });
        }
      } catch (e) {
        const msg = `MlmPurchase作成エラー(${order.memberCode}): ${e instanceof Error ? e.message : String(e)}`;
        console.error("[import-result]", msg);
        postProcessErrors.push(msg);
      }

      // MlmMember をアクティブに
      try {
        await prisma.mlmMember.update({
          where: { id: order.mlmMemberId },
          data:  { status: "active" },
        });
      } catch (e) {
        const msg = `MlmMember更新エラー(${order.memberCode}): ${e instanceof Error ? e.message : String(e)}`;
        console.error("[import-result]", msg);
        postProcessErrors.push(msg);
      }

      // SAVボーナス付与（オートシップ: 15,000円の5% = 750pt）
      try {
        const AUTOSHIP_BASE = 15000;
        const AUTOSHIP_RATE = 0.05;
        const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE); // 750pt

        if (savingsPoints > 0) {
          const member = await prisma.mlmMember.findUnique({
            where:  { id: order.mlmMemberId },
            select: { userId: true },
          });
          if (member) {
            await prisma.pointWallet.upsert({
              where:  { userId: member.userId },
              update: {
                externalPointsBalance:  { increment: savingsPoints },
                availablePointsBalance: { increment: savingsPoints },
              },
              create: {
                userId:                 member.userId,
                externalPointsBalance:  savingsPoints,
                availablePointsBalance: savingsPoints,
              },
            });
            await prisma.mlmMember.update({
              where: { id: order.mlmMemberId },
              data:  { savingsPoints: { increment: savingsPoints } },
            });
          }
        }
      } catch (e) {
        const msg = `PointWallet更新エラー(${order.memberCode}): ${e instanceof Error ? e.message : String(e)}`;
        console.error("[import-result]", msg);
        postProcessErrors.push(msg);
      }
    }

    if (postProcessErrors.length > 0) {
      console.warn("[import-result] 後処理エラー一覧:", postProcessErrors);
    }

    return NextResponse.json({
      success:        true,
      paidCount,
      failedCount,
      totalProcessed: paidCount + failedCount,
      warnings:       postProcessErrors.length > 0 ? postProcessErrors : undefined,
    });

  } catch (unexpectedErr) {
    console.error("[import-result] 予期しないエラー:", unexpectedErr);
    return NextResponse.json(
      { error: `取り込み処理中にエラーが発生しました: ${unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr)}` },
      { status: 500 }
    );
  }
}
