// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * POST: クレディックス / 三菱UFJファクター から出力されたCSVを直接インポート
 *
 * ★ 照合対象: オートシップ有効会員一覧から「選択した伝票を一括作成」で作られた
 *   Order テーブルの伝票（slipType=autoship）
 *
 * 照合ロジック:
 *   - MUFG固定長TXT: memberCode（会員番号-枝番）→ User.memberCode → Order.userId
 *   - Credix結果CSV:
 *       1次照合: ID(sendid) → MlmMember.creditCardId / creditCardId2 / creditCardId3
 *       2次照合（フォールバック）: 電話番号 → MlmMember.mobile / User.phone
 *       ※ 同一電話番号で複数決済レコードがあっても1会員1伝票として正しく処理
 *
 * 処理内容:
 *   - CSVファイルの支払い完了情報と Order テーブルを照合
 *   - 一致した Order の paidAt（入金日）と paymentStatus=paid をセット
 *   - MlmPurchase が未作成なら作成し、会員を active に更新
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
  //   先頭5バイトが数字のみ かつ カンマが少ない
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

  // ── CSV日時文字列 → Date 変換ヘルパー ──
  function parseCsvDate(str: string): Date | null {
    if (!str || str === "-" || str === "") return null;
    // YYYY/MM/DD HH:MM:SS または YYYY-MM-DD HH:MM:SS 形式
    const m1 = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m1) {
      const [, y, mo, d, h = "0", mi = "0", s = "0"] = m1;
      // JST → UTC
      const jst = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
      return new Date(jst.getTime() - 9 * 60 * 60 * 1000);
    }
    return null;
  }

  // ── 電話番号正規化ヘルパー ──
  function normalizePhone(raw: string): string {
    return raw.replace(/-/g, "").replace(/^\+81/, "0").trim();
  }

  // ── 照合結果マップ ──
  // memberCode → { ok, paidDate } （MUFG・汎用CSV用）
  const resultMap = new Map<string, { ok: boolean; reason?: string; paidDate?: Date }>();
  // sendid → { ok, paidDate } （Credix結果CSV: 1次照合用）
  const credixSendIdMap = new Map<string, { ok: boolean; paidDate?: Date }>();
  // 電話番号 → { ok, paidDate } （Credix結果CSV: 2次照合フォールバック用）
  const credixPhoneMap = new Map<string, { ok: boolean; paidDate?: Date }>();

  let effectivePaymentMethod = paymentMethod;
  let isMufg = false;
  let isCredix = false;

  if (isMufgFixedFormat(uint8)) {
    // ══════════════════════════════════════════════════════════════
    // 三菱UFJファクター 固定長TXT
    // ══════════════════════════════════════════════════════════════
    // 照合キー: tail32[16:22] = 会員番号6桁, tail32[22:24] = 枝番2桁
    // → memberCode = "会員番号-枝番" 例: "128776-01"

    const [ty, tm] = targetMonth.split("-").map(Number);
    const lastDayOfMonth = new Date(ty, tm, 0); // 月末日 00:00 JST
    const paidDateForAll = new Date(lastDayOfMonth.getTime() - 9 * 60 * 60 * 1000);

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
      // U+FFFD (ef bf bd) → '?' 正規化
      const norm: number[] = [];
      let bi = 0;
      while (bi < byteLine.length) {
        if (bi + 2 < byteLine.length &&
            byteLine[bi] === 0xEF && byteLine[bi+1] === 0xBF && byteLine[bi+2] === 0xBD) {
          norm.push(0x3F); bi += 3;
        } else {
          norm.push(byteLine[bi]); bi++;
        }
      }
      if (norm.length < 50) continue;

      const first5 = norm.slice(0, 5).map(b => String.fromCharCode(b)).join("");
      if (first5.startsWith("19") || first5.startsWith("80") ||
          first5.trimStart().startsWith("9") || first5.trim() === "" ||
          !/^\d/.test(first5)) continue;

      // ASCII数字の連続ブロックで末尾32桁を取得
      const normStr = norm.map(b => (b >= 0x30 && b <= 0x39) ? String.fromCharCode(b) : " ").join("");
      const digitBlocks = normStr.match(/\d{20,}/g);
      if (!digitBlocks || digitBlocks.length === 0) continue;
      const tail32 = digitBlocks[digitBlocks.length - 1].slice(0, 32);
      if (tail32.length < 24) continue;

      const memberNoRaw = tail32.slice(16, 22);
      if (!/^\d+$/.test(memberNoRaw)) continue;
      const memberNo = memberNoRaw.replace(/^0+/, "") || "0";
      const branchNoRaw = tail32.slice(22, 24);
      if (!/^\d+$/.test(branchNoRaw)) continue;
      const branchNo    = branchNoRaw; // "01"
      const branchNoInt = String(parseInt(branchNoRaw, 10)); // "1"（フォールバック）
      const memberCodeFull   = `${memberNo}-${branchNo}`;
      const memberCodeNoZero = `${memberNo}-${branchNoInt}`;

      if (!resultMap.has(memberCodeFull)) {
        resultMap.set(memberCodeFull, { ok: true, paidDate: paidDateForAll });
      }
      if (memberCodeFull !== memberCodeNoZero && !resultMap.has(memberCodeNoZero)) {
        resultMap.set(memberCodeNoZero, { ok: true, paidDate: paidDateForAll });
      }
    }

    effectivePaymentMethod = "bank_transfer";
    isMufg = true;
    console.log(`[import-direct] MUFG TXT検出: ${resultMap.size}会員コード抽出`);

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

    const text  = rawText.replace(/^\uFEFF/, "");
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
    if (lines.length < 1) {
      return NextResponse.json({ error: "CSVにデータがありません" }, { status: 400 });
    }

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

    // ──────────────────────────────────────────────────────────────
    // クレディックスCSV判定（3種類対応）
    //   Type A: クレディックスから届く結果CSV → ヘッダーに sendid / id(sendid) を含む
    //           → 電話番号で照合
    //   Type B: システムが出力した送信用CSV → ヘッダーが「顧客ID,会員コード,氏名,...」
    //           → 会員コードで直接照合（送信データをそのまま全件成功として取り込む）
    //   ※ 上記いずれかを isCredixFormat で統合管理
    // ──────────────────────────────────────────────────────────────
    const isCredixResultFormat = header.some(h =>   // Type A: クレディックス結果CSV
      h.includes("sendid") || h.includes("sendpoint") || h.includes("id(sendid)")
    );
    // Type B: 社内出力クレディックスCSV（顧客ID + 会員コード のヘッダーを持つ）
    const isCredixInternalFormat =
      !isCredixResultFormat &&
      header.includes("顧客id") &&
      (header.includes("会員コード") || header.some(h => h.includes("会員コード")));

    const isCredixFormat = isCredixResultFormat || isCredixInternalFormat;

    let codeIdx: number;  // sendid列（Credix結果CSV）or 会員コード列（社内CSV・汎用）
    let resultIdx: number;
    let reasonIdx: number;
    let dateIdx: number;
    let phoneIdx: number = -1; // 電話番号列（Credix結果CSVで使用）
    // 会員コード列（社内クレディックスCSVで使用）
    let memberCodeIdx: number = -1;

    if (isCredixResultFormat) {
      // ★ Credix結果CSV照合方針:
      //   K列(index=10) の ID(sendid) を credixSendIdMap に格納
      //   WC付きID（例: WC14857601）も数字のみID（例: 69823944）も両方対象
      //   DB の MlmMember.creditCardId / creditCardId2 / creditCardId3 と完全一致で照合
      isCredix  = true; // isCredix=trueルート（creditCardId照合）で処理
      codeIdx   = header.findIndex(h => h.includes("sendid") || h === "id(sendid)" || h.includes("id(send)"));
      resultIdx = header.findIndex(h => h.includes("結果") || h.includes("result"));
      dateIdx   = header.findIndex(h =>
        h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") ||
        h.includes("date") || h.includes("datetime")
      );
      phoneIdx  = header.findIndex(h => h.includes("電話番号") || h.includes("phone") || h.includes("tel"));
      if (codeIdx   === -1) codeIdx   = 10;
      if (resultIdx === -1) resultIdx = 4;
      if (dateIdx   === -1) dateIdx   = 3;
      if (phoneIdx  === -1) phoneIdx  = 2;
      reasonIdx = -1;
      console.log(`[import-direct] Credix結果CSV検出: header=[${header.join("|")}]`);
      console.log(`[import-direct] Credix: K列(codeIdx=${codeIdx})=ID(sendid) → creditCardId照合モード (WC付き・数字のみ両方対象)`);
    } else if (isCredixInternalFormat) {
      // isCredix = false のまま（resultMap を使う汎用照合ルートで処理）
      // 社内クレディックスCSV（送信フォーマット）: 会員コード列で直接照合
      memberCodeIdx = header.findIndex(h => h === "会員コード" || h.includes("会員コード"));
      dateIdx       = header.findIndex(h => h.includes("処理年月") || h.includes("日時") || h.includes("date"));
      resultIdx     = -1; // 結果列なし（送信CSVのため全件成功とみなす）
      reasonIdx     = -1;
      codeIdx       = memberCodeIdx >= 0 ? memberCodeIdx : 1; // デフォルト列1
      console.log(`[import-direct] クレディックス社内CSV検出（会員コード照合モード）: header=[${header.join("|")}]`);
      console.log(`[import-direct] memberCodeIdx=${memberCodeIdx}, codeIdx=${codeIdx}, dateIdx=${dateIdx}`);
    } else {
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

    const dataLines = lines.length > 1 ? lines.slice(1) : [];
    let noHeaderMode = false;
    if (!isCredixFormat && codeIdx === -1) {
      const firstVal = headerRaw[0]?.replace(/^"|"$/g, "").trim() ?? "";
      if (/^[0-9]+(-[0-9]+)?$/.test(firstVal)) {
        noHeaderMode = true;
        codeIdx = 0; resultIdx = -1; reasonIdx = -1;
      } else if (dataLines.length > 0) {
        codeIdx = 0; resultIdx = -1; reasonIdx = -1;
      } else {
        return NextResponse.json(
          {
            error: `CSVの形式が正しくありません（会員コード列が見つかりません）。\n検出されたヘッダー列: [${headerRaw.join(", ")}]\n\n対応フォーマット:\n① クレディックスCSV（.csv）: ヘッダーに「ID(sendid)」列を含む形式\n② 三菱UFJファクター固定長TXT（.txt）: ファイル名が SIRR*.txt 等の固定長形式\n③ 汎用CSV: ヘッダーに「会員コード」「code」等の列を含む形式`,
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
      const cols    = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
      if (cols.length === 0) continue;

      const rawDate  = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
      const paidDate = parseCsvDate(rawDate) ?? undefined;

      if (isCredixInternalFormat) {
        // ── 社内クレディックスCSV: 会員コードで resultMap に格納（全件成功扱い） ──
        const rawCode = cols[codeIdx] ?? "";
        if (!rawCode || rawCode === "-") continue;
        if (!resultMap.has(rawCode)) {
          resultMap.set(rawCode, { ok: true, paidDate });
        }
      } else if (isCredixResultFormat) {
        // ── Credix結果CSV: K列(ID(sendid)) を credixSendIdMap へ格納 ──
        //   WC付きID（例: WC14857601）も数字のみID（例: 69823944）も両方対象
        //   DB の MlmMember.creditCardId / creditCardId2 / creditCardId3 と完全一致で照合
        const rawSendId = codeIdx >= 0 ? (cols[codeIdx] ?? "") : "";
        if (!rawSendId || rawSendId === "-") continue;

        // 結果判定（「決済完了」等 → isOk=true）
        let isOk = true;
        if (resultIdx >= 0 && cols[resultIdx] !== undefined && cols[resultIdx] !== "") {
          const rawResult = cols[resultIdx];
          isOk = rawResult.includes("完了") || rawResult.includes("成功") ||
                 rawResult.toUpperCase() === "OK" || rawResult === "0" || rawResult === "1";
        }

        // sendid → credixSendIdMap（同一IDは成功優先で1件のみ登録）
        if (!credixSendIdMap.has(rawSendId)) {
          credixSendIdMap.set(rawSendId, { ok: isOk, paidDate });
        } else if (isOk && !credixSendIdMap.get(rawSendId)!.ok) {
          credixSendIdMap.set(rawSendId, { ok: isOk, paidDate });
        }

        // 電話番号フォールバック用: credixPhoneMapにも格納
        if (phoneIdx >= 0) {
          const rawPhone = cols[phoneIdx] ?? "";
          const phone = normalizePhone(rawPhone);
          if (phone && phone !== "-" && phone.length >= 7 && phone !== "non") {
            if (!credixPhoneMap.has(phone)) {
              credixPhoneMap.set(phone, { ok: isOk, paidDate });
            } else if (isOk && !credixPhoneMap.get(phone)!.ok) {
              credixPhoneMap.set(phone, { ok: isOk, paidDate });
            }
          }
        }
      } else {
        // ── 汎用CSV: 会員コードで照合 ──
        const rawCode = cols[codeIdx] ?? "";
        if (!rawCode || rawCode === "-") continue;
        const result = resultIdx >= 0 ? (cols[resultIdx] ?? "") : "";
        const ok = result === "" || result === "OK" || result === "0" ||
                   result.toLowerCase() === "success" ||
                   result === "1" || result.includes("完了") || result.includes("成功");
        const reason = reasonIdx >= 0 ? (cols[reasonIdx] ?? undefined) : undefined;
        if (ok) {
          resultMap.set(rawCode, { ok, reason, paidDate });
        }
      }
    }

    if (isCredixResultFormat) {
      console.log(`[import-direct] Credix結果CSV: K列(sendid) ${credixSendIdMap.size}件抽出 / 電話番号 ${credixPhoneMap.size}件抽出`);
    } else if (isCredixInternalFormat) {
      console.log(`[import-direct] クレディックス社内CSV: 会員コード ${resultMap.size}件抽出`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ★ 照合対象: Order テーブル（slipType=autoship）
  //   「選択した伝票を一括作成」で作成した伝票に入金日をセットする
  //
  // ★ 重要: orderedAt による月絞り込みは行わない
  //   理由: 一括伝票作成は「今日の日付」で orderedAt が設定されるため、
  //   CSVインポート時の月指定と一致しないことがある。
  //   代わりに paymentStatus=unpaid（未払い）の最新オートシップ伝票を対象とする。
  // ══════════════════════════════════════════════════════════════

  const now = new Date();

  // 対象月の範囲（参考情報・デバッグ用）
  const [year, month] = targetMonth.split("-").map(Number);
  const monthStart    = new Date(year, month - 1, 1);
  const monthEnd      = new Date(year, month, 1);
  const monthStartUtc = new Date(monthStart.getTime() - 9 * 60 * 60 * 1000);
  const monthEndUtc   = new Date(monthEnd.getTime()   - 9 * 60 * 60 * 1000);

  // Order.paymentMethod のマッピング（mlm-members/orders の PM_LABELS と合わせる）
  // MlmMember.paymentMethod: "credit_card" / "bank_transfer"
  // Order.paymentMethod:     "card" / "bank_transfer" （一括作成時のbulkPaymentMethod参照）
  const ORDER_PM_FILTER = effectivePaymentMethod === "bank_transfer"
    ? ["bank_transfer", "振替(銀行)", "振替"]
    : ["card", "credit_card", "カード"];

  let paidCount   = 0;
  let failedCount = 0;
  const matchedOrderIds: string[] = [];
  const unmatchedItems: string[] = [];
  const warnings: string[] = [];

  // ── MUFG / 汎用CSV: memberCode → User.id → Order で照合 ──
  if (!isCredix) {
    const memberCodes = Array.from(resultMap.keys());
    console.log(`[import-direct] MUFG/汎用: 照合対象memberCode ${memberCodes.length}件`);

    for (const memberCode of memberCodes) {
      const entry = resultMap.get(memberCode)!;
      if (!entry.ok) continue;

      // User.memberCode でユーザーを検索
      const user = await prisma.user.findUnique({
        where: { memberCode },
        select: { id: true },
      });

      if (!user) {
        unmatchedItems.push(`${memberCode}(会員未登録)`);
        continue;
      }

      // このユーザーの当月オートシップ Order を取得
      // ★ orderedAt で絞り込まず、paymentStatus=unpaid の最新伝票を優先
      //   ただし作成日が前後2か月以内の伝票に限定（誤適用防止）
      const twoMonthsAgo = new Date(monthStart.getTime() - 60 * 24 * 60 * 60 * 1000);
      const twoMonthsAhead = new Date(monthEnd.getTime() + 60 * 24 * 60 * 60 * 1000);

      const orders = await prisma.order.findMany({
        where: {
          userId:   user.id,
          slipType: "autoship",
          AND: [
            {
              OR: [
                { paymentStatus: "unpaid" },
                { paymentStatus: "pending" },
                { paymentStatus: null },
              ],
            },
            {
              orderedAt: {
                gte: new Date(twoMonthsAgo.getTime() - 9 * 60 * 60 * 1000),
                lt:  new Date(twoMonthsAhead.getTime() - 9 * 60 * 60 * 1000),
              },
            },
            {
              OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })),
            },
          ],
        },
        orderBy: { orderedAt: "desc" },
        take: 1,
      });

      // 未払い伝票がない場合は、支払済みを含む当月伝票も確認
      const targetOrders = orders.length > 0 ? orders : await prisma.order.findMany({
        where: {
          userId:   user.id,
          slipType: "autoship",
          orderedAt: { gte: monthStartUtc, lt: monthEndUtc },
          OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })),
        },
        orderBy: { orderedAt: "desc" },
        take: 1,
      });

      if (targetOrders.length === 0) {
        unmatchedItems.push(`${memberCode}(オートシップ伝票なし)`);
        console.log(`[import-direct] 未照合(オートシップ伝票なし): ${memberCode}`);
        continue;
      }

      // 対象Orderに入金日をセット
      for (const order of targetOrders) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paidAt:        entry.paidDate ?? now,
            paymentStatus: "paid",
          },
        });
        matchedOrderIds.push(order.id.toString());
      }
      paidCount++;

      // MlmPurchase / MlmMember / PointWallet 更新
      await updateMemberAfterPayment(user.id, targetMonth, entry.paidDate ?? now);
    }

  } else {
    // ── Credix結果CSV: 1次=sendid→creditCardId, 2次=電話番号 で照合 ──
    const [ty2, tm2] = targetMonth.split("-").map(Number);
    const tMonthStart = new Date(ty2, tm2 - 1, 1);
    const tMonthEnd   = new Date(ty2, tm2, 1);

    // 全オートシップ有効会員（credit_card）を取得
    const allMlmMembers = await prisma.mlmMember.findMany({
      where: {
        autoshipEnabled: true,
        status: { not: "withdrawn" },
      },
      select: {
        id: true,
        userId: true,
        memberCode: true,
        mobile: true,
        creditCardId:  true,
        creditCardId2: true,
        creditCardId3: true,
        user: {
          select: { phone: true },
        },
      },
    });

    console.log(`[import-direct] Credix: DB会員数 ${allMlmMembers.length}件`);
    console.log(`[import-direct] Credix: CSVからsendid ${credixSendIdMap.size}件 / 電話番号 ${credixPhoneMap.size}件 抽出`);

    // sendid → MlmMember マップを構築（creditCardId 1〜3枠を全てチェック）
    const sendIdToMember = new Map<string, typeof allMlmMembers[0]>();
    for (const m of allMlmMembers) {
      for (const cid of [m.creditCardId, m.creditCardId2, m.creditCardId3]) {
        if (cid && cid.trim() && !sendIdToMember.has(cid.trim())) {
          sendIdToMember.set(cid.trim(), m);
        }
      }
    }
    console.log(`[import-direct] Credix: sendid→会員マップ ${sendIdToMember.size}件構築`);

    // 電話番号 → MlmMember マップを構築（2次フォールバック用）
    const phoneToMember = new Map<string, typeof allMlmMembers[0]>();
    for (const m of allMlmMembers) {
      const ps: string[] = [];
      if (m.mobile)      ps.push(normalizePhone(m.mobile));
      if (m.user?.phone) ps.push(normalizePhone(m.user.phone));
      for (const p of ps) {
        if (p && p.length >= 7 && !phoneToMember.has(p)) {
          phoneToMember.set(p, m);
        }
      }
    }
    console.log(`[import-direct] Credix: 電話番号→会員マップ ${phoneToMember.size}件構築`);

    // 処理済み会員セット（同一会員を重複処理しないため）
    const processedUserIds = new Set<string>();

    // ── ヘルパー: 会員の未払いオートシップ伝票を取得して入金反映 ──
    async function processCredixMember(
      member: typeof allMlmMembers[0],
      paidDate: Date | undefined,
      matchLabel: string
    ): Promise<boolean> {
      const userIdStr = member.userId.toString();
      if (processedUserIds.has(userIdStr)) {
        // 既に処理済み（別のsendidで重複照合）
        return false;
      }

      const twoMonthsAgo2   = new Date(tMonthStart.getTime() - 60 * 24 * 60 * 60 * 1000);
      const twoMonthsAhead2 = new Date(tMonthEnd.getTime()   + 60 * 24 * 60 * 60 * 1000);

      const orders = await prisma.order.findMany({
        where: {
          userId:   member.userId,
          slipType: "autoship",
          AND: [
            {
              OR: [
                { paymentStatus: "unpaid" },
                { paymentStatus: "pending" },
                { paymentStatus: null },
              ],
            },
            {
              orderedAt: {
                gte: new Date(twoMonthsAgo2.getTime() - 9 * 60 * 60 * 1000),
                lt:  new Date(twoMonthsAhead2.getTime() - 9 * 60 * 60 * 1000),
              },
            },
            { OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })) },
          ],
        },
        orderBy: { orderedAt: "desc" },
        take: 1,
      });

      // 未払い伝票がない場合は当月伝票も確認（支払済み含む）
      const targetOrders = orders.length > 0 ? orders : await prisma.order.findMany({
        where: {
          userId:   member.userId,
          slipType: "autoship",
          orderedAt: {
            gte: new Date(tMonthStart.getTime() - 9 * 60 * 60 * 1000),
            lt:  new Date(tMonthEnd.getTime()   - 9 * 60 * 60 * 1000),
          },
          OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })),
        },
        orderBy: { orderedAt: "desc" },
        take: 1,
      });

      if (targetOrders.length === 0) {
        unmatchedItems.push(`${member.memberCode}(${matchLabel}, 伝票なし)`);
        console.log(`[import-direct] Credix未照合(伝票なし): ${member.memberCode} [${matchLabel}]`);
        return false;
      }

      // 処理済みとしてマーク
      processedUserIds.add(userIdStr);

      for (const order of targetOrders) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paidAt:        paidDate ?? now,
            paymentStatus: "paid",
          },
        });
        matchedOrderIds.push(order.id.toString());
      }
      paidCount++;
      await updateMemberAfterPayment(member.userId, targetMonth, paidDate ?? now);
      return true;
    }

    // ── 1次照合: sendid → creditCardId ──
    let matchedBySendId = 0;
    const unmatchedSendIds: string[] = [];

    for (const [sendId, entry] of credixSendIdMap) {
      if (!entry.ok) continue;

      const member = sendIdToMember.get(sendId);
      if (!member) {
        unmatchedSendIds.push(sendId);
        continue;
      }

      const matched = await processCredixMember(member, entry.paidDate, `sendid:${sendId}`);
      if (matched) matchedBySendId++;
    }

    console.log(`[import-direct] Credix: sendid照合 ${matchedBySendId}件成功 / 未照合sendid ${unmatchedSendIds.length}件`);

    // ── 2次照合（フォールバック）: 電話番号 → MlmMember ──
    // sendidで照合できなかった会員 + 処理済みでない会員を電話番号で照合
    let matchedByPhone = 0;

    if (unmatchedSendIds.length > 0 || matchedBySendId === 0) {
      console.log(`[import-direct] Credix: 電話番号フォールバック照合開始 (credixPhoneMap: ${credixPhoneMap.size}件)`);

      for (const [phone, entry] of credixPhoneMap) {
        if (!entry.ok) continue;

        const member = phoneToMember.get(phone);
        if (!member) {
          // sendid照合で処理済みでなければ未照合として記録
          if (!processedUserIds.has(member?.userId?.toString() ?? "")) {
            // phoneToMemberにない場合はunmatchedへ（重複回避）
            if (!unmatchedItems.some(u => u.startsWith(`phone:${phone}`))) {
              unmatchedItems.push(`phone:${phone}(会員未登録)`);
            }
          }
          continue;
        }

        // すでにsendidで処理済みならスキップ
        if (processedUserIds.has(member.userId.toString())) continue;

        const matched = await processCredixMember(member, entry.paidDate, `phone:${phone}`);
        if (matched) matchedByPhone++;
      }

      console.log(`[import-direct] Credix: 電話番号フォールバック ${matchedByPhone}件成功`);
    }

    const totalMatched = matchedBySendId + matchedByPhone;
    console.log(`[import-direct] Credix: 合計照合 ${totalMatched}件 (sendid:${matchedBySendId} + 電話:${matchedByPhone})`);

    if (totalMatched === 0 && credixSendIdMap.size > 0) {
      const sampleSendIds = Array.from(credixSendIdMap.keys()).slice(0, 3);
      warnings.push(`⚠️ sendid照合が0件でした。DBの creditCardId にCSVのID(sendid)が登録されているか確認してください。サンプルsendid: ${sampleSendIds.join(", ")}`);
    }
    if (unmatchedSendIds.length > 0 && unmatchedSendIds.length > matchedBySendId) {
      warnings.push(`⚠️ sendidで照合できなかった件数: ${unmatchedSendIds.length}件 (サンプル: ${unmatchedSendIds.slice(0, 5).join(", ")})`);
    }
  }

  // 未照合の警告メッセージ
  if (unmatchedItems.length > 0) {
    const msg = `⚠️ 照合できなかった件数: ${unmatchedItems.length}件 → ${unmatchedItems.slice(0, 20).join(", ")}`;
    warnings.push(msg);
    console.warn("[import-direct]", msg);
  }

  const fileSize = isMufg ? resultMap.size / 2 : (isCredix ? credixSendIdMap.size : resultMap.size);
  console.log(`[import-direct] 完了: ファイル約${Math.ceil(fileSize)}件 → 入金反映${paidCount}件, 未照合${unmatchedItems.length}件`);

  return NextResponse.json({
    paidCount,
    failedCount,
    matchedOrderCount: matchedOrderIds.length,
    unmatchedCount:    unmatchedItems.length,
    effectivePaymentMethod,
    warnings: warnings.length > 0 ? warnings : undefined,
    _debug: {
      isMufg,
      isCredix,
      isCredixInternalFormat,
      effectivePaymentMethod,
      fileRecordCount: Math.ceil(fileSize),
      mufgMemberMapSize:          isMufg ? resultMap.size : undefined,
      credixSendIdMapSize:        isCredix ? credixSendIdMap.size : undefined,
      credixPhoneMapSize:         isCredix ? credixPhoneMap.size : undefined,
      credixInternalMemberCount:  isCredixInternalFormat ? resultMap.size : undefined,
      paidCount,
      unmatchedCount: unmatchedItems.length,
      unmatchedSample: unmatchedItems.slice(0, 10),
      matchedOrderIds: matchedOrderIds.slice(0, 10),
    },
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
 * 入金確認後の後処理:
 * - MlmPurchase が未作成なら作成
 * - MlmMember.status を active に更新
 * - PointWallet にSAVボーナス付与
 */
async function updateMemberAfterPayment(
  userId: bigint,
  targetMonth: string,
  paidDate: Date
): Promise<void> {
  const UNIT_PRICE    = 16500;
  const POINTS        = 150;
  const AUTOSHIP_BASE = 15000;
  const AUTOSHIP_RATE = 0.05;
  const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE); // 750pt

  try {
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      select: { id: true, savingsPoints: true },
    });
    if (!mlmMember) return;

    // MlmPurchase 重複チェック → 未作成なら作成
    const existing = await prisma.mlmPurchase.findFirst({
      where: {
        mlmMemberId:    mlmMember.id,
        purchaseMonth:  targetMonth,
        purchaseStatus: "autoship",
      },
    });
    if (!existing) {
      await prisma.mlmPurchase.create({
        data: {
          mlmMemberId:    mlmMember.id,
          productCode:    "2000",
          productName:    "VIOLA Pure 翠彩-SUMISAI-",
          quantity:       1,
          unitPrice:      UNIT_PRICE,
          points:         POINTS,
          totalPoints:    POINTS,
          purchaseStatus: "autoship",
          purchaseMonth:  targetMonth,
          purchasedAt:    paidDate,
        },
      });
    }
  } catch (e) {
    console.error(`[import-direct] MlmPurchase作成エラー(userId=${userId}):`, e);
  }

  try {
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (mlmMember) {
      await prisma.mlmMember.update({
        where: { id: mlmMember.id },
        data:  { status: "active" },
      });
    }
  } catch (e) {
    console.error(`[import-direct] MlmMember更新エラー(userId=${userId}):`, e);
  }

  try {
    if (savingsPoints > 0) {
      await prisma.pointWallet.upsert({
        where:  { userId },
        update: {
          externalPointsBalance:  { increment: savingsPoints },
          availablePointsBalance: { increment: savingsPoints },
        },
        create: {
          userId,
          externalPointsBalance:  savingsPoints,
          availablePointsBalance: savingsPoints,
        },
      });
      const mlmMember = await prisma.mlmMember.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (mlmMember) {
        await prisma.mlmMember.update({
          where: { id: mlmMember.id },
          data:  { savingsPoints: { increment: savingsPoints } },
        });
      }
    }
  } catch (e) {
    console.error(`[import-direct] PointWalletエラー(userId=${userId}):`, e);
  }
}

/**
 * ファイルなしモード（「当月アクティブ反映」ボタン）:
 * DBのオートシップ有効会員を対象月・支払方法でフィルタして
 * 当月のオートシップ Order を全て paid にする
 *
 * 伝票がない場合は新規作成する
 */
async function processFromDatabase(
  targetMonth: string,
  paymentMethod: "credit_card" | "bank_transfer"
): Promise<Response> {
  const UNIT_PRICE = 16500;
  const now        = new Date();

  const [year, month] = targetMonth.split("-").map(Number);
  const targetMonthStart = new Date(year, month - 1, 1);
  const nextMonthStart   = new Date(year, month, 1);
  const monthStartUtc    = new Date(targetMonthStart.getTime() - 9 * 60 * 60 * 1000);
  const monthEndUtc      = new Date(nextMonthStart.getTime()   - 9 * 60 * 60 * 1000);

  // オートシップ有効会員を paymentMethod フィールドで絞り込む
  const allMembers = await prisma.mlmMember.findMany({
    where: {
      autoshipEnabled: true,
      status:          { not: "withdrawn" },
      paymentMethod,
    },
    select: {
      id: true,
      userId: true,
      memberCode: true,
      paymentMethod: true,
      autoshipStartDate:     true,
      autoshipStopDate:      true,
      autoshipSuspendMonths: true,
      savingsPoints: true,
      user: {
        select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
      },
    },
  });

  // 対象月・停止日・停止月でフィルタ
  const mlmMembers = allMembers.filter(m => {
    if (m.autoshipStartDate && m.autoshipStartDate > targetMonthStart) return false;
    if (m.autoshipStopDate  && m.autoshipStopDate  < nextMonthStart)   return false;
    if (m.autoshipSuspendMonths) {
      const months = m.autoshipSuspendMonths.split(",").map((s: string) => s.trim());
      if (months.includes(targetMonth)) return false;
    }
    return true;
  });

  if (mlmMembers.length === 0) {
    return NextResponse.json({
      error: `対象月 ${targetMonth} / ${paymentMethod} のオートシップ有効会員が見つかりません`,
    }, { status: 400 });
  }

  const ORDER_PM = paymentMethod === "bank_transfer" ? "bank_transfer" : "card";
  const ORDER_PM_FILTER = paymentMethod === "bank_transfer"
    ? ["bank_transfer", "振替(銀行)", "振替"]
    : ["card", "credit_card", "カード"];

  let paidCount   = 0;
  let failedCount = 0;
  const noOrderMembers: string[] = [];

  for (const m of mlmMembers) {
    // 当月の未払いオートシップ Order を取得（paymentMethod でも絞り込む）
    let orders = await prisma.order.findMany({
      where: {
        userId:    m.userId,
        slipType:  "autoship",
        orderedAt: { gte: monthStartUtc, lt: monthEndUtc },
        OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })),
      },
      orderBy: { orderedAt: "desc" },
    });

    // 当月に伝票がない場合は前後30日も検索（orderedAtが多少ずれていても対応）
    if (orders.length === 0) {
      const extStart = new Date(monthStartUtc.getTime() - 30 * 24 * 60 * 60 * 1000);
      const extEnd   = new Date(monthEndUtc.getTime()   + 30 * 24 * 60 * 60 * 1000);
      orders = await prisma.order.findMany({
        where: {
          userId:    m.userId,
          slipType:  "autoship",
          AND: [
            {
              OR: [
                { paymentStatus: "unpaid" },
                { paymentStatus: "pending" },
                { paymentStatus: null },
              ],
            },
            { orderedAt: { gte: extStart, lt: extEnd } },
            { OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })) },
          ],
        },
        orderBy: { orderedAt: "desc" },
        take: 1,
      });
    }

    if (orders.length === 0) {
      // 伝票がない場合は新規作成（DB自動取込モードのみ許可）
      try {
        await prisma.order.create({
          data: {
            userId:         m.userId,
            orderNumber:    `AS-${targetMonth}-${m.memberCode}-${Date.now()}`,
            status:         "pending",
            slipType:       "autoship",
            paymentMethod:  ORDER_PM,
            paymentStatus:  "paid",
            shippingStatus: "unshipped",
            orderedAt:      targetMonthStart,
            paidAt:         now,
            subtotalAmount: UNIT_PRICE,
            totalAmount:    UNIT_PRICE,
            usedPoints:     0,
          },
        });
        paidCount++;
        await updateMemberAfterPayment(m.userId, targetMonth, now);
      } catch (e) {
        console.error(`[import-direct/db] Order作成エラー(${m.memberCode}):`, e);
        failedCount++;
        noOrderMembers.push(m.memberCode);
      }
      continue;
    }

    // 既存Orderを paid に更新
    for (const order of orders) {
      await prisma.order.update({
        where: { id: order.id },
        data:  { paidAt: now, paymentStatus: "paid" },
      });
    }
    paidCount++;
    await updateMemberAfterPayment(m.userId, targetMonth, now);
  }

  return NextResponse.json({
    paidCount,
    failedCount,
    effectivePaymentMethod: paymentMethod,
    mode: "db_auto",
    ...(noOrderMembers.length > 0 ? { warnings: [`伝票なし(新規作成): ${noOrderMembers.join(", ")}`] } : {}),
  }, { status: 200 });
}
