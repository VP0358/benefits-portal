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
 *   file:          CSV ファイル（省略可: noFile=true の場合はDBから自動取得）
 *   targetMonth:   YYYY-MM
 *   paymentMethod: credit_card | bank_transfer
 *   noFile:        "true" の場合、ファイルなしでDBのオートシップ有効会員を全員取込
 */
export async function POST(request: Request) {
  try {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const formData = await request.formData();
  const file          = formData.get("file") as File | null;
  const targetMonth   = formData.get("targetMonth") as string | null;
  const paymentMethod = formData.get("paymentMethod") as "credit_card" | "bank_transfer" | null;
  const noFile        = formData.get("noFile") === "true";

  if (!targetMonth || !paymentMethod) {
    return NextResponse.json({ error: "targetMonth, paymentMethod は必須です" }, { status: 400 });
  }

  // ── ファイルなしモード: DBのオートシップ有効会員を全員取込 ──
  if (noFile || !file) {
    return await processFromDatabase(targetMonth, paymentMethod);
  }

  // ── ファイル読み込み（バイナリ） ──
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // ── フォーマット自動判定 ──
  // 三菱UFJファクター固定長TXTフォーマット判定:
  //   先頭5バイトが「19100」または「19」+数字 = ヘッダレコード
  //   先頭部分がASCII数字のみで始まり、カンマ区切りでない
  //   ファイル名パターン: SIRRRDRFDL*.txt 等
  function isMufgFixedFormat(buf: Uint8Array): boolean {
    // 先頭5文字が数字のみかチェック
    for (let i = 0; i < Math.min(5, buf.length); i++) {
      if (buf[i] < 0x30 || buf[i] > 0x39) return false; // 0-9以外
    }
    // カンマが少ない（CSV形式でない）ことを確認
    let commaCount = 0;
    for (let i = 0; i < Math.min(200, buf.length); i++) {
      if (buf[i] === 0x2C) commaCount++;
    }
    return commaCount < 3; // カンマが3未満 = 固定長フォーマット
  }

  // ── CSV日時文字列 → Date 変換ヘルパー ──
  // 対応形式: "2026/5/5 15:29" "2026-05-05 15:29:00" 等
  function parseCsvDate(str: string): Date | null {
    if (!str || str === "-" || str === "") return null;
    const m1 = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m1) {
      const [, y, mo, d, h = "0", mi = "0", s = "0"] = m1;
      const jst = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
      return new Date(jst.getTime() - 9 * 60 * 60 * 1000);
    }
    return null;
  }

  // memberCode → { ok, reason, paidDate }
  const resultMap = new Map<string, { ok: boolean; reason?: string; paidDate?: Date }>();

  // 三菱UFJファクター固定長TXTの場合は accountNumber ベースで照合するため別マップを用意
  const mufgAccountMap = new Map<string, { ok: boolean; paidDate?: Date }>();

  if (isMufgFixedFormat(uint8)) {
    // ══════════════════════════════════════════════════════════════
    // 三菱UFJファクター 固定長TXTフォーマット（全銀協準拠）
    // ══════════════════════════════════════════════════════════════
    // 正規化後のフィールド定義:
    //   [0:5]   レコード種別コード
    //             19xxx = ヘッダレコード（スキップ）
    //             80000 = フッタレコード（スキップ）
    //             9     = エンドレコード（スキップ）
    //             それ以外 = データレコード（全行引き落とし成功）
    //   [1:5]   銀行コード（4桁）     ※全銀協データレコード [1:5]
    //   [5:20]  銀行名（15桁）
    //   [20:23] 支店コード（3桁）
    //   [23:38] 支店名（15桁）
    //   [38:42] ダミー（4桁）
    //   [42:43] 口座種別（1桁: 1=普通, 2=当座）
    //   [43:50] 口座番号（7桁）       ← DB の accountNumber と照合
    //   [50:80] 口座名義（30桁）
    //   [80:90] 引落金額（10桁 例: 0000017380 = 17,380円）
    //   [90:91] 新規コード（1桁）
    //   [91:95] 連番（4桁）
    //   [95:103] 顧客番号（8桁）      ← 今回は空欄で送信しているため使用しない
    //
    // ※ このファイルはUTF-8で保存されているが、日本語部分がU+FFFD(ef bf bd=3bytes)に
    //   化けているため、U+FFDFを1バイトの'?'に変換して正規化してから処理する。
    //
    // ※ 照合キー: DB の mlmMember.accountNumber（先頭ゼロ除去後）と
    //   TXTの口座番号（[43:50]の先頭ゼロ除去後）を突き合わせる。

    // 対象月末日を入金日として使用（JST→UTC変換）
    const [ty, tm] = targetMonth.split("-").map(Number);
    const lastDayOfMonth = new Date(ty, tm, 0); // 月末日 00:00 JST
    const paidDateForAll = new Date(lastDayOfMonth.getTime() - 9 * 60 * 60 * 1000);

    // バイト列を CRLF/LF で行分割
    const rawBytes = new Uint8Array(arrayBuffer);
    const byteLines: Uint8Array[] = [];
    let start = 0;
    for (let i = 0; i < rawBytes.length; i++) {
      if (rawBytes[i] === 0x0A) {
        const end = (i > 0 && rawBytes[i-1] === 0x0D) ? i - 1 : i;
        byteLines.push(rawBytes.slice(start, end));
        start = i + 1;
      }
    }
    if (start < rawBytes.length) byteLines.push(rawBytes.slice(start));

    for (const byteLine of byteLines) {
      if (byteLine.length < 50) continue;

      // U+FFFD (ef bf bd = 3bytes) → '?' (1byte) に正規化
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

      // レコード種別コード（先頭5バイト）
      const recType = norm.slice(0, 5).map(b => String.fromCharCode(b)).join("").trim();

      // ヘッダ・フッタ・エンドレコードをスキップ
      if (recType.startsWith("19") || recType.startsWith("80") || recType === "9" ||
          recType === "" || !/^\d{5}$/.test(recType)) continue;

      // 口座番号: [43:50]（7桁、先頭ゼロを除去して照合）
      if (norm.length < 50) continue;
      const acNumRaw = norm.slice(43, 50).map(b => String.fromCharCode(b)).join("").trim();
      if (!acNumRaw || !/^\d+$/.test(acNumRaw)) continue;
      // 先頭ゼロを除去（DBのaccountNumberと合わせる）
      const acNum = acNumRaw.replace(/^0+/, "") || "0";

      // 三菱UFJファクターはファイルに含まれる行が全て引き落とし成功
      // 同一口座番号が複数行ある場合（例: 2商品）は最初の成功を採用
      if (!mufgAccountMap.has(acNum)) {
        mufgAccountMap.set(acNum, { ok: true, paidDate: paidDateForAll });
      }
    }

  } else {
    // ══════════════════════════════════════════════════════════════
    // CSV フォーマット（クレディックス / 汎用）
    // ══════════════════════════════════════════════════════════════

    // Shift-JIS 判定: 0x81-0x9F または 0xE0-0xEF で始まるマルチバイト列を検出
    function looksLikeShiftJis(buf: Uint8Array): boolean {
      for (let i = 0; i < Math.min(buf.length, 4096); i++) {
        const b = buf[i];
        if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xEF)) return true;
      }
      return false;
    }

    // UTF-8 BOM 判定: EF BB BF
    const hasUtf8Bom = uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF;

    let rawText: string;
    if (!hasUtf8Bom && looksLikeShiftJis(uint8)) {
      rawText = new TextDecoder("shift-jis").decode(arrayBuffer);
    } else {
      rawText = new TextDecoder("utf-8").decode(arrayBuffer);
    }

    const text  = rawText.replace(/^\uFEFF/, "");
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
    if (lines.length < 1) {
      return NextResponse.json({ error: "CSVにデータがありません" }, { status: 400 });
    }

    // CSVの列を解析するヘルパー（引用符対応）
    function parseCsvLine(line: string): string[] {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
        else { current += ch; }
      }
      result.push(current.trim());
      return result;
    }

    const headerRaw = parseCsvLine(lines[0]);
    const header    = headerRaw.map(h => h.replace(/^"|"$/g, "").replace(/^\uFEFF/, "").trim().toLowerCase());

    // クレディックスCSV自動判定
    const isCredixFormat = header.some(h =>
      h.includes("sendid") || h.includes("sendpoint") || h.includes("id(sendid)")
    );

    let codeIdx: number;
    let resultIdx: number;
    let reasonIdx: number;
    let dateIdx: number;

    if (isCredixFormat) {
      // クレディックスCSV: "ID(sendid)"列が会員コード
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
      // 汎用フォーマット
      codeIdx = header.findIndex(h =>
        h.includes("会員コード") || h.includes("membercode") || h === "code" ||
        h.includes("会員no") || h.includes("会員番号") || h.includes("member_code") ||
        h.includes("コード") || h.includes("会員") || h.includes("顧客コード") ||
        h.includes("customercode") || h.includes("customer_code") || h === "id" ||
        h.includes("member id") || h.includes("memberid")
      );
      resultIdx = header.findIndex(h =>
        h.includes("結果") || h.includes("result") || h.includes("status") || h.includes("決済")
      );
      dateIdx = header.findIndex(h =>
        h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") ||
        h.includes("date") || h.includes("datetime")
      );
      reasonIdx = header.findIndex(h =>
        h.includes("理由") || h.includes("reason") || h.includes("error") || h.includes("失敗")
      );
    }

    // ヘッダーが1行のみの場合 or 会員コード列が見つからない場合の処理
    const dataLines = lines.length > 1 ? lines.slice(1) : [];
    let noHeaderMode = false;
    if (codeIdx === -1) {
      const firstVal = headerRaw[0]?.replace(/^"|"$/g, "").trim() ?? "";
      if (/^[0-9]+(-[0-9]+)?$/.test(firstVal)) {
        noHeaderMode = true;
        codeIdx = 0; resultIdx = -1; reasonIdx = -1;
      } else if (dataLines.length > 0) {
        codeIdx = 0; resultIdx = -1; reasonIdx = -1;
      } else {
        return NextResponse.json(
          {
            error: `CSVの形式が正しくありません（会員コード列が見つかりません）。\n検出されたヘッダー列: [${headerRaw.join(", ")}]\n\n対応フォーマット:\n① クレディックスCSV（.csv）: ヘッダーに「ID(sendid)」列を含む形式\n② 三菱UFJファクター固定長TXT（.txt）: ファイル名が SIRRRDRFDL*.txt 等の固定長形式\n③ 汎用CSV: ヘッダーに「会員コード」「code」等の列を含む形式`,
            detectedHeaders: headerRaw,
          },
          { status: 400 }
        );
      }
    }

    const effectiveDataLines = noHeaderMode ? lines : dataLines;
    if (effectiveDataLines.length === 0) {
      return NextResponse.json({ error: "CSVにデータ行がありません（ヘッダー行のみ）" }, { status: 400 });
    }

    for (const line of effectiveDataLines) {
      if (!line.trim()) continue;
      const cols       = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
      const memberCode = cols[codeIdx] ?? "";
      if (!memberCode || memberCode === "-") continue;

      let ok     = true;
      let reason: string | undefined = undefined;
      const rawDate  = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
      const paidDate = parseCsvDate(rawDate) ?? undefined;

      if (isCredixFormat) {
        ok = true; // クレディックスCSVは全行が決済成功
      } else {
        const result = cols[resultIdx] ?? "";
        ok = result === "OK" || result === "0" || result.toLowerCase() === "success" ||
             result === "1" || result.includes("完了") || result.includes("成功");
        reason = reasonIdx >= 0 ? (cols[reasonIdx] ?? undefined) : undefined;
      }

      resultMap.set(memberCode, { ok, reason, paidDate });
    }
  } // end CSV format

  // ── 対象会員取得 ──
  // 三菱UFJファクターTXTの場合: accountNumber で照合
  // CSV（クレディックス等）の場合: memberCode で照合
  const isMufg = mufgAccountMap.size > 0;

  let mlmMembers: Awaited<ReturnType<typeof prisma.mlmMember.findMany>>;
  if (isMufg) {
    // mufgAccountMap のキーは先頭ゼロ除去済み口座番号
    const accountNumbers = Array.from(mufgAccountMap.keys());
    // DB の accountNumber は先頭ゼロあり/なしが混在しうるため両方で検索
    const allMembers = await prisma.mlmMember.findMany({
      where: {
        accountNumber: { not: null },
        autoshipEnabled: true,
        status: { not: "withdrawn" },
      },
      include: {
        user: {
          select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
        },
      },
    });
    // 口座番号の先頭ゼロを除去して突き合わせ
    mlmMembers = allMembers.filter(m => {
      const acNorm = (m.accountNumber ?? "").replace(/^0+/, "") || "0";
      return accountNumbers.includes(acNorm);
    });
    // resultMap に accountNumber → { ok, paidDate } を変換して登録
    for (const m of mlmMembers) {
      const acNorm = (m.accountNumber ?? "").replace(/^0+/, "") || "0";
      const mufgEntry = mufgAccountMap.get(acNorm);
      if (mufgEntry) {
        resultMap.set(m.memberCode, { ok: mufgEntry.ok, paidDate: mufgEntry.paidDate });
      }
    }
  } else {
    const memberCodes = Array.from(resultMap.keys());
    mlmMembers = await prisma.mlmMember.findMany({
      where: { memberCode: { in: memberCodes } },
      include: {
        user: {
          select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
        },
      },
    });
  }

  if (mlmMembers.length === 0) {
    return NextResponse.json(
      { error: isMufg
          ? "TXTファイルの口座番号に一致するオートシップ有効会員が見つかりません。口座番号がDBに登録されているか確認してください。"
          : "CSVの会員コードに一致する会員が見つかりません。" },
      { status: 400 }
    );
  }

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
    try {
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
          memberPostal:  m.user.postalCode ?? null,
          memberAddress: m.user.address ?? null,
          bankName:      m.bankName ?? null,
          branchName:    m.branchName ?? null,
          accountType:   m.accountType ?? null,
          accountNumber: m.accountNumber ?? null,
          accountHolder: m.accountHolder ?? null,
          unitPrice:     UNIT_PRICE,
          totalAmount:   UNIT_PRICE,
          points:        POINTS,
        })),
        skipDuplicates: true,
      });
    });
    } catch (txErr) {
      console.error("[import-direct] 伝票作成トランザクションエラー:", txErr);
      return NextResponse.json({ error: `伝票作成に失敗しました: ${txErr instanceof Error ? txErr.message : String(txErr)}` }, { status: 500 });
    }

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

  try {
  await prisma.$transaction(async (tx) => {
    for (const order of run!.orders) {
      const res = resultMap.get(order.memberCode);
      if (!res) continue;

      if (res.ok) {
        // 決済成功: paidAtはCSVの決済日時を優先、なければ現在時刻
        await tx.autoShipOrder.update({
          where: { id: order.id },
          data: { status: "paid", paidAt: res.paidDate ?? now },
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
              purchaseStatus: 'autoship',
              purchaseMonth: targetMonth,
              purchasedAt:  res.paidDate ?? now,
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
  } catch (txErr) {
    console.error("[import-direct] アクティブ反映トランザクションエラー:", txErr);
    return NextResponse.json({ error: `アクティブ反映に失敗しました: ${txErr instanceof Error ? txErr.message : String(txErr)}` }, { status: 500 });
  }

  return NextResponse.json({
    runId:       run.id.toString(),
    paidCount,
    failedCount,
    runCreated,
  }, { status: 200 });

  } catch (unexpectedErr) {
    console.error("[import-direct] 予期しないエラー:", unexpectedErr);
    return NextResponse.json(
      { error: `インポート処理中にエラーが発生しました: ${unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr)}` },
      { status: 500 }
    );
  }
}

/**
 * ファイルなしモード: DBのオートシップ有効会員を対象月・支払方法でフィルタして全員取込
 */
async function processFromDatabase(
  targetMonth: string,
  paymentMethod: "credit_card" | "bank_transfer"
): Promise<Response> {
  const UNIT_PRICE = 16500;
  const POINTS     = 150;
  const now        = new Date();

  const [year, month] = targetMonth.split("-").map(Number);
  const targetMonthStart = new Date(`${targetMonth}-01`);
  const nextMonthStart   = new Date(year, month, 1);

  // オートシップ有効会員を取得
  const allMembers = await prisma.mlmMember.findMany({
    where: {
      autoshipEnabled: true,
      status: { not: "withdrawn" },
      autoshipStartDate: { not: null },
    },
    include: {
      user: {
        select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
      },
    },
  });

  // 対象月・支払方法でフィルタ
  const mlmMembers = allMembers.filter(m => {
    if (m.autoshipStartDate && m.autoshipStartDate > targetMonthStart) return false;
    if (m.autoshipStopDate && m.autoshipStopDate < nextMonthStart) return false;
    if (m.autoshipSuspendMonths) {
      const months = m.autoshipSuspendMonths.split(",").map((s: string) => s.trim());
      if (months.includes(targetMonth)) return false;
    }
    // MlmMember直接フィールドの口座番号で支払方法を判定
    const hasBank = !!(m.accountNumber);
    if (paymentMethod === "bank_transfer") return hasBank;
    return !hasBank;
  });

  if (mlmMembers.length === 0) {
    return NextResponse.json({ error: `対象月 ${targetMonth} / ${paymentMethod} のオートシップ有効会員が見つかりません` }, { status: 400 });
  }

  const memberMap = new Map(mlmMembers.map(m => [m.memberCode, m]));

  // AutoShipRun を取得 or 作成
  let run = await prisma.autoShipRun.findUnique({
    where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
    include: { orders: true },
  });

  let runCreated = false;
  if (!run) {
    runCreated = true;
    try {
    await prisma.$transaction(async (tx) => {
      const newRun = await tx.autoShipRun.create({
        data: {
          targetMonth,
          paymentMethod,
          totalCount:   mlmMembers.length,
          totalAmount:  mlmMembers.length * UNIT_PRICE,
        },
      });

      await tx.autoShipOrder.createMany({
        data: mlmMembers.map(m => ({
          autoShipRunId:  newRun.id,
          mlmMemberId:    m.id,
          targetMonth,
          paymentMethod,
          memberCode:     m.memberCode,
          memberName:     m.user.name,
          memberNameKana: m.user.nameKana ?? null,
          memberPhone:    m.user.phone ?? null,
          memberEmail:    m.user.email ?? null,
          memberPostal:   m.user.postalCode ?? null,
          memberAddress:  m.user.address ?? null,
          bankName:       m.bankName ?? null,
          branchName:     m.branchName ?? null,
          accountType:    m.accountType ?? null,
          accountNumber:  m.accountNumber ?? null,
          accountHolder:  m.accountHolder ?? null,
          unitPrice:      UNIT_PRICE,
          totalAmount:    UNIT_PRICE,
          points:         POINTS,
        })),
        skipDuplicates: true,
      });
    });
    } catch (txErr) {
      console.error("[import-direct/db] 伝票作成トランザクションエラー:", txErr);
      return NextResponse.json({ error: `伝票作成に失敗しました: ${txErr instanceof Error ? txErr.message : String(txErr)}` }, { status: 500 });
    }

    run = await prisma.autoShipRun.findUnique({
      where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
      include: { orders: true },
    });
  }

  if (!run) {
    return NextResponse.json({ error: "伝票の取得に失敗しました" }, { status: 500 });
  }

  // 全注文を決済成功として反映
  let paidCount   = 0;
  let failedCount = 0;

  try {
  await prisma.$transaction(async (tx) => {
    for (const order of run!.orders) {
      const memberRecord = memberMap.get(order.memberCode);
      if (!memberRecord) continue;

      await tx.autoShipOrder.update({
        where: { id: order.id },
        data:  { status: "paid", paidAt: now },
      });

      // MlmPurchase 記録（重複チェック）
      const existingPurchase = await tx.mlmPurchase.findFirst({
        where: { mlmMemberId: order.mlmMemberId, purchaseMonth: targetMonth, productCode: order.productCode },
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
            purchaseStatus: 'autoship',
            purchaseMonth: targetMonth,
            purchasedAt:  now,
          },
        });
      }

      await tx.mlmMember.update({
        where: { id: order.mlmMemberId },
        data:  { status: "active" },
      });

      // SAVボーナス付与
      const AUTOSHIP_BASE = 15000;
      const AUTOSHIP_RATE = 0.05;
      const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE);
      if (savingsPoints > 0) {
        await tx.pointWallet.upsert({
          where: { userId: memberRecord.userId },
          update: {
            externalPointsBalance:  { increment: savingsPoints },
            availablePointsBalance: { increment: savingsPoints },
          },
          create: {
            userId:                 memberRecord.userId,
            externalPointsBalance:  savingsPoints,
            availablePointsBalance: savingsPoints,
          },
        });
        await tx.mlmMember.update({
          where: { id: memberRecord.id },
          data:  { savingsPoints: { increment: savingsPoints } },
        });
      }

      paidCount++;
    }

    await tx.autoShipRun.update({
      where: { id: run!.id },
      data: {
        paidCount,
        failedCount,
        importedAt: now,
        status:     paidCount > 0 ? "imported" : "draft",
      },
    });
  });
  } catch (txErr) {
    console.error("[import-direct/db] アクティブ反映トランザクションエラー:", txErr);
    return NextResponse.json({ error: `アクティブ反映に失敗しました: ${txErr instanceof Error ? txErr.message : String(txErr)}` }, { status: 500 });
  }

  return NextResponse.json({
    runId:      run.id.toString(),
    paidCount,
    failedCount,
    runCreated,
    mode:       "db_auto",
  }, { status: 200 });
}
