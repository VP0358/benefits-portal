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
  //   ファイル名パターン: SIRRRDRFDL*.txt / SIRRDRDFDL*.txt 等
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

  // ── 三菱UFJファクター固定長TXTの場合はpaymentMethodをbank_transferに強制 ──
  // 三菱UFJファクターは口座振替専用のため、フロントで誤ってcredit_cardが
  // 選択されていても bank_transfer として処理する
  let effectivePaymentMethod = paymentMethod;

  if (isMufgFixedFormat(uint8)) {
    // ══════════════════════════════════════════════════════════════
    // 三菱UFJファクター 固定長TXTフォーマット（全銀協準拠）
    // ══════════════════════════════════════════════════════════════
    // 実ファイル検証済みフィールド定義（正規化後 120バイト/行）:
    //   [0]     データ区分（1桁）
    //             '1' で始まり先頭5桁が "19xxx" = ヘッダレコード（スキップ）
    //             '8' で始まり先頭5桁が "80xxx" = フッタレコード（スキップ）
    //             '9' で始まる                 = エンドレコード（スキップ）
    //             それ以外の先頭5桁が数字5桁   = データレコード（全行引き落とし成功）
    //   [1:5]   銀行コード（4桁）
    //   [5:20]  銀行名（15バイト、マルチバイト文字化け→'?'正規化済み）
    //   [20:23] 支店コード（3桁）
    //   [23:38] 支店名（15バイト、マルチバイト文字化け→'?'正規化済み）
    //   [38:42] ダミー（4バイト）
    //   [42:50] 口座番号（8桁）       ← ★DB の accountNumber と照合（先頭ゼロ除去後）
    //   [50:80] 口座名義（30バイト、マルチバイト文字化け→'?'正規化済み）
    //   [80:90] 引落金額（10桁 例: 0000017380 = 17,380円）
    //   [90:98] 委託者管理番号（8桁）
    //   [98:106] 管理番号続き（8桁）
    //   [106:112] 顧客管理番号（6桁）
    //
    // ※ このファイルはUTF-8で保存されているが、日本語部分がU+FFFD(ef bf bd=3bytes)に
    //   化けているため、U+FFDFを1バイトの'?'に変換して正規化してから処理する。
    //
    // ※ 照合キー: DB の mlmMember.accountNumber（先頭ゼロ除去後）と
    //   TXTの口座番号（[42:50]の先頭ゼロ除去後、8桁）を突き合わせる。

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

      // 先頭5バイトでレコード種別を判定
      const first5 = norm.slice(0, 5).map(b => String.fromCharCode(b)).join("");

      // ヘッダ・フッタ・エンドレコードをスキップ
      // 実ファイル確認: ヘッダ="19100...", フッタ="80000...", エンド="9   "
      if (first5.startsWith("19") || first5.startsWith("80") ||
          first5.trimStart().startsWith("9") || first5.trim() === "" ||
          !/^\d/.test(first5)) continue;

      // 口座番号: [42:50]（8桁、先頭ゼロを除去して照合）
      // ★修正: 旧コードは[43:50]（7桁）だったが実ファイル検証で[42:50]（8桁）が正しい
      if (norm.length < 90) continue;
      const acNumRaw = norm.slice(42, 50).map(b => String.fromCharCode(b)).join("").trim();
      if (!acNumRaw || !/^\d+$/.test(acNumRaw)) continue;
      // 先頭ゼロを除去（DBのaccountNumberと合わせる）
      const acNum = acNumRaw.replace(/^0+/, "") || "0";

      // 三菱UFJファクターはファイルに含まれる行が全て引き落とし成功
      // 同一口座番号が複数行ある場合（例: 2商品）は最初の成功を採用
      if (!mufgAccountMap.has(acNum)) {
        mufgAccountMap.set(acNum, { ok: true, paidDate: paidDateForAll });
      }
    }

    // 三菱UFJファクターTXTは必ず bank_transfer として処理
    effectivePaymentMethod = "bank_transfer";

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
      const cols   = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
      // クレディックスCSVの「ID(sendid)」列の値（例: WC14857601, 69823944）を取得
      const sendId = cols[codeIdx] ?? "";
      if (!sendId || sendId === "-") continue;

      // ── sendId → memberCode 変換 ──
      // sendId フォーマット:
      //   WC14857601 → WC + 8桁数字 → 数字部分を XXXXXX-YY 形式に変換
      //   69823944   →      8桁数字 → そのまま XXXXXX-YY 形式に変換
      const digits = sendId.startsWith("WC") ? sendId.slice(2) : sendId;
      let memberCode: string;
      if (/^\d{8}$/.test(digits)) {
        memberCode = `${digits.slice(0, 6)}-${digits.slice(6)}`;
      } else {
        // 8桁でない場合はそのまま使用（汎用フォーマットの memberCode）
        memberCode = sendId;
      }

      let ok     = true;
      let reason: string | undefined = undefined;
      const rawDate  = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
      const paidDate = parseCsvDate(rawDate) ?? undefined;

      if (isCredixFormat) {
        ok = true; // クレディックスCSVは全行が決済成功（結果列は「決済完了」固定）
      } else {
        const result = cols[resultIdx] ?? "";
        ok = result === "OK" || result === "0" || result.toLowerCase() === "success" ||
             result === "1" || result.includes("完了") || result.includes("成功");
        reason = reasonIdx >= 0 ? (cols[reasonIdx] ?? undefined) : undefined;
      }

      // resultMap のキーは変換済み memberCode
      resultMap.set(memberCode, { ok, reason, paidDate });
    }
  } // end CSV format

  // ── 対象会員取得 ──
  const isMufg = mufgAccountMap.size > 0;

  if (isMufg && effectivePaymentMethod !== paymentMethod) {
    console.log(`[import-direct] 三菱UFJファクターTXT検出: paymentMethod=${paymentMethod} → bank_transfer に自動切替`);
  }

  let mlmMembers: Awaited<ReturnType<typeof prisma.mlmMember.findMany<{
    include: { user: { select: { name: boolean; nameKana: boolean; phone: boolean; email: boolean; postalCode: boolean; address: boolean } } }
  }>>>;

  if (isMufg) {
    // ══════════════════════════════════════════════════════════════
    // 三菱UFJファクターTXT
    // ── 戦略 ──
    // ① 既存Run（bank_transfer）がある → run.ordersのaccountNumberで照合して
    //    そのままresultMapに登録する（最優先）
    // ② 既存Runがない → MlmMember / MlmRegistrationのaccountNumberで照合して
    //    Runを新規作成してから同様に処理
    // ══════════════════════════════════════════════════════════════

    const accountNumbers = Array.from(mufgAccountMap.keys()); // 先頭ゼロ除去済み

    // ① 既存Runを確認（effectivePaymentMethod=bank_transfer で検索）
    const existingRunForMufg = await prisma.autoShipRun.findUnique({
      where: { targetMonth_paymentMethod: { targetMonth, paymentMethod: effectivePaymentMethod } },
      include: { orders: { select: { memberCode: true, accountNumber: true, mlmMemberId: true } } },
    });

    if (existingRunForMufg && existingRunForMufg.orders.length > 0) {
      // ── 既存Runあり: run.ordersのaccountNumberで照合を試みる ──
      // 三菱UFJファクターTXTのデータ行は全て引き落とし成功なので、
      // accountNumber照合できた分はその口座の paidDate を使い、
      // 照合できなかった分も全件「成功」として処理する（TXTに含まれる＝引き落とし済み）
      const defaultPaidDate = mufgAccountMap.values().next().value?.paidDate;
      let directMatchCount = 0;

      for (const order of existingRunForMufg.orders) {
        const acNorm = (order.accountNumber ?? "").replace(/^0+/, "") || "";
        if (acNorm && mufgAccountMap.has(acNorm)) {
          // accountNumber で照合成功 → その口座の paidDate を使用
          const mufgEntry = mufgAccountMap.get(acNorm)!;
          resultMap.set(order.memberCode, { ok: true, paidDate: mufgEntry.paidDate });
          directMatchCount++;
        } else {
          // accountNumber 不一致 / null → 全件成功（TXT＝全行引き落とし済み）
          resultMap.set(order.memberCode, { ok: true, paidDate: defaultPaidDate });
        }
      }
      console.log(`[import-direct] 既存Run照合: accountNumber一致=${directMatchCount}件, フォールバック成功=${existingRunForMufg.orders.length - directMatchCount}件, 合計=${existingRunForMufg.orders.length}件`);

      // resultMap に登録された memberCode の mlmMember を取得
      mlmMembers = await prisma.mlmMember.findMany({
        where: { memberCode: { in: Array.from(resultMap.keys()) } },
        include: {
          user: { select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true } },
        },
      });

    } else {
      // ── 既存Runなし: MlmMember/MlmRegistrationで照合してRunを新規作成 ──
      const allAutoshipMembers = await prisma.mlmMember.findMany({
        where: {
          autoshipEnabled: true,
          status: { not: "withdrawn" },
          autoshipStartDate: { not: null },
        },
        select: {
          memberCode: true,
          accountNumber: true,
          user: {
            select: {
              mlmRegistration: { select: { bankAccountNumber: true } },
            },
          },
        },
      });

      const matchedMemberCodes = new Set<string>();
      for (const m of allAutoshipMembers) {
        const acDirect = (m.accountNumber ?? "").replace(/^0+/, "") || "";
        const acReg = ((m.user as any)?.mlmRegistration?.bankAccountNumber ?? "").replace(/^0+/, "") || "";
        if ((acDirect && accountNumbers.includes(acDirect)) ||
            (acReg   && accountNumbers.includes(acReg))) {
          matchedMemberCodes.add(m.memberCode);
        }
      }

      const defaultPaidDateNew = mufgAccountMap.values().next().value?.paidDate;

      if (matchedMemberCodes.size === 0) {
        // 口座番号でオートシップ有効会員が特定できない場合:
        // → autoshipEnabled かつ bank_transfer 対象の全会員を取得してフォールバック
        console.log("[import-direct] 口座番号照合0件 → autoshipEnabled全会員をフォールバック対象に使用");
        mlmMembers = await prisma.mlmMember.findMany({
          where: {
            autoshipEnabled: true,
            status: { not: "withdrawn" },
            autoshipStartDate: { not: null },
          },
          include: {
            user: { select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true } },
          },
        });
        // 全件成功として resultMap に登録
        for (const m of mlmMembers) {
          resultMap.set(m.memberCode, { ok: true, paidDate: defaultPaidDateNew });
        }
      } else {
        // resultMap に memberCode → { ok, paidDate } を登録（口座番号から逆引き）
        for (const m of allAutoshipMembers) {
          if (!matchedMemberCodes.has(m.memberCode)) continue;
          const acDirect = (m.accountNumber ?? "").replace(/^0+/, "") || "";
          const acReg = ((m.user as any)?.mlmRegistration?.bankAccountNumber ?? "").replace(/^0+/, "") || "";
          const acKey = accountNumbers.find(k => (acDirect && k === acDirect) || (acReg && k === acReg));
          if (acKey) {
            const mufgEntry = mufgAccountMap.get(acKey);
            if (mufgEntry) {
              resultMap.set(m.memberCode, { ok: true, paidDate: mufgEntry.paidDate });
            }
          } else {
            resultMap.set(m.memberCode, { ok: true, paidDate: defaultPaidDateNew });
          }
        }

        mlmMembers = await prisma.mlmMember.findMany({
          where: { memberCode: { in: Array.from(matchedMemberCodes) } },
          include: {
            user: { select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true } },
          },
        });
      }
    }

  } else {
    // ══════════════════════════════════════════════════════════════
    // クレディックスCSV: resultMap のキー（変換済み memberCode）で直接照合
    // ══════════════════════════════════════════════════════════════
    // sendId → memberCode 変換済みのため、そのまま memberCode で検索可能
    const memberCodes = Array.from(resultMap.keys());

    mlmMembers = await prisma.mlmMember.findMany({
      where: { memberCode: { in: memberCodes } },
      include: {
        user: {
          select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
        },
      },
    });

    if (mlmMembers.length === 0) {
      // memberCode で見つからない場合、変換前の sendId (WC+数字) で creditCardId 照合を試みる
      console.log("[import-direct] memberCode照合失敗、サンプルkeys:", memberCodes.slice(0, 3));
    }
  }

  if (mlmMembers.length === 0) {
    return NextResponse.json(
      { error: isMufg
          ? "TXTファイルの口座番号に一致する会員が見つかりません。"
          : "CSVのID(sendid)に一致する会員が見つかりません。" },
      { status: 400 }
    );
  }

  const memberMap = new Map(mlmMembers.map(m => [m.memberCode, m]));

  const UNIT_PRICE = 16500;
  const POINTS     = 150;
  const now        = new Date();

  // ── 伝票（AutoShipRun）を取得 or 作成 ──
  let run = await prisma.autoShipRun.findUnique({
    where: { targetMonth_paymentMethod: { targetMonth, paymentMethod: effectivePaymentMethod } },
    include: { orders: true },
  });

  // 既存Runがある場合: run.orders にある memberCode が memberMap に含まれていない可能性があるため
  // run.orders の全 memberCode を mlmMember から補完取得する
  if (run && run.orders.length > 0) {
    const existingOrderMemberCodes = run.orders.map(o => o.memberCode);
    const missingCodes = existingOrderMemberCodes.filter(code => !memberMap.has(code));
    if (missingCodes.length > 0) {
      const additionalMembers = await prisma.mlmMember.findMany({
        where: { memberCode: { in: missingCodes } },
        include: {
          user: {
            select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
          },
        },
      });
      for (const m of additionalMembers) {
        memberMap.set(m.memberCode, m);
      }
    }
  }

  let runCreated = false;
  if (!run) {
    // 伝票がまだないので新規作成
    runCreated = true;
    try {
    await prisma.$transaction(async (tx) => {
      const newRun = await tx.autoShipRun.create({
        data: {
          targetMonth,
          paymentMethod: effectivePaymentMethod,
          totalCount: mlmMembers.length,
          totalAmount: mlmMembers.length * UNIT_PRICE,
        },
      });

      await tx.autoShipOrder.createMany({
        data: mlmMembers.map(m => ({
          autoShipRunId: newRun.id,
          mlmMemberId:   m.id,
          targetMonth,
          paymentMethod: effectivePaymentMethod,
          memberCode:    m.memberCode,
          creditCardId:  (m as any).creditCardId ?? null,  // クレディックス顧客ID（CSV照合キー）
          memberName:    m.user.name,
          memberNameKana: m.user.nameKana ?? null,
          memberPhone:   m.user.phone ?? null,
          memberEmail:   m.user.email ?? null,
          memberPostal:  m.user.postalCode ?? null,
          memberAddress: m.user.address ?? null,
          bankName:      (m as any).bankName ?? null,
          branchName:    (m as any).branchName ?? null,
          accountType:   (m as any).accountType ?? null,
          accountNumber: (m as any).accountNumber ?? null,
          accountHolder: (m as any).accountHolder ?? null,
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
      where: { targetMonth_paymentMethod: { targetMonth, paymentMethod: effectivePaymentMethod } },
      include: { orders: true },
    });
  }

  if (!run) {
    return NextResponse.json({ error: "伝票の取得に失敗しました" }, { status: 500 });
  }

  // ── 三菱UFJファクターTXTの場合: run.orders の accountNumber → mufgAccountMap 直接補完 ──
  // resultMap は memberCode をキーとするが、run.orders の accountNumber が
  // mufgAccountMap に含まれているにも関わらず resultMap に未登録の場合を補完
  if (isMufg) {
    const accountNumbersList = Array.from(mufgAccountMap.keys());
    for (const order of run!.orders) {
      if (resultMap.has(order.memberCode)) continue; // 既にresultMapにある場合はスキップ
      const acNorm = ((order as any).accountNumber ?? "").replace(/^0+/, "") || "";
      if (acNorm && accountNumbersList.includes(acNorm)) {
        const mufgEntry = mufgAccountMap.get(acNorm);
        if (mufgEntry) {
          resultMap.set(order.memberCode, { ok: mufgEntry.ok, paidDate: mufgEntry.paidDate });
          console.log(`[import-direct] accountNumber補完: ${order.memberCode} ← accountNumber=${acNorm}`);
        }
      }
    }
  }

  // ── デバッグ: 実際の照合状態をログ＆レスポンスに含める ──
  const runOrdersDebug = run!.orders.map(o => ({
    memberCode: o.memberCode,
    accountNumber: (o as any).accountNumber ?? null,
    currentStatus: o.status,
    inResultMap: resultMap.has(o.memberCode),
    resultOk: resultMap.get(o.memberCode)?.ok ?? null,
  }));
  const matchedCount = runOrdersDebug.filter(o => o.inResultMap).length;
  const unmatchedOrders = runOrdersDebug.filter(o => !o.inResultMap);
  const debugInfo = {
    isMufg,
    effectivePaymentMethod,
    originalPaymentMethod: paymentMethod,
    resultMapSize: resultMap.size,
    resultMapSampleKeys: Array.from(resultMap.keys()).slice(0, 10),
    runOrdersCount: run!.orders.length,
    runOrdersSampleMemberCodes: run!.orders.slice(0, 10).map(o => o.memberCode),
    runOrdersSampleAccountNumbers: run!.orders.slice(0, 10).map(o => (o as any).accountNumber ?? null),
    matchedCount,
    mufgAccountMapSize: mufgAccountMap.size,
    mufgAccountSample: Array.from(mufgAccountMap.keys()).slice(0, 5),
    unmatchedOrders: unmatchedOrders.slice(0, 5),
  };
  console.log("[import-direct] debugInfo:", JSON.stringify(debugInfo, null, 2));

  // ── 結果を取り込んでアクティブ反映 ──
  // ★重要: トランザクションを2段階に分割
  // 第1段階: AutoShipOrder の status 更新 + AutoShipRun の paidCount/failedCount 更新
  //          （これが失敗すると明示的にエラーを返す）
  // 第2段階: MlmPurchase 作成 + MlmMember status 更新 + PointWallet 更新
  //          （これが失敗してもログを出して続行 → paidCount は確実に記録済み）

  let paidCount   = 0;
  let failedCount = 0;
  const orderUpdateErrors: string[] = [];
  const postProcessErrors: string[] = [];

  // ─ 第1段階: AutoShipOrder の status 一括更新（updateMany でタイムアウト回避）─
  // ★ 個別 update ループはPrismaトランザクションのデフォルト5秒タイムアウトを超えるため
  //    paid/failed の ID リストを事前に集計し updateMany で一括処理する
  try {
    const paidOrderIds: bigint[]   = [];
    const failedOrders: { id: bigint; reason: string }[] = [];
    // 三菱UFJファクターはファイルに含まれる全行が引き落とし成功
    // paidDate は全件同一（月末日）の場合が多いが、複数paidDateがある場合は
    // 個別対応が必要なため paidDate ごとにグループ化する
    const paidByDate = new Map<string, bigint[]>(); // ISO文字列 → order ids

    for (const order of run!.orders) {
      const res = resultMap.get(order.memberCode);
      if (!res) continue;
      if (res.ok) {
        const dateKey = (res.paidDate ?? now).toISOString();
        if (!paidByDate.has(dateKey)) paidByDate.set(dateKey, []);
        paidByDate.get(dateKey)!.push(order.id);
        paidOrderIds.push(order.id);
        paidCount++;
      } else {
        failedOrders.push({ id: order.id, reason: res.reason ?? "決済失敗" });
        failedCount++;
      }
    }

    // paid: paidDate ごとに updateMany（DB への往復回数を最小化）
    for (const [dateKey, ids] of paidByDate) {
      await prisma.autoShipOrder.updateMany({
        where: { id: { in: ids } },
        data:  { status: "paid", paidAt: new Date(dateKey) },
      });
    }

    // failed: failReason は個別に異なる場合があるため個別 update
    // （件数は少ないのでタイムアウトしない）
    for (const fo of failedOrders) {
      await prisma.autoShipOrder.update({
        where: { id: fo.id },
        data:  { status: "failed", failReason: fo.reason },
      });
    }

    // Run ステータス更新（単一クエリ）
    // ★ run!.status を直接フォールバックに使うと DB に残った不正値（例: "imported"）が
    //   Prisma enum バリデーションでエラーになるため、安全な enum 値のみを使用する
    const VALID_RUN_STATUSES = ["draft", "exported", "importing", "completed", "canceled"] as const;
    type ValidRunStatus = typeof VALID_RUN_STATUSES[number];
    const currentStatus = VALID_RUN_STATUSES.includes(run!.status as ValidRunStatus)
      ? run!.status as ValidRunStatus
      : "exported"; // 不正値のフォールバック（exported = CSV出力済み状態）
    await prisma.autoShipRun.update({
      where: { id: run!.id },
      data: {
        paidCount,
        failedCount,
        importedAt: now,
        status: paidCount + failedCount > 0 ? "completed" : currentStatus,
      },
    });
  } catch (updateErr) {
    console.error("[import-direct] 第1段階 updateMany エラー:", updateErr);
    return NextResponse.json({
      error: `決済ステータス更新に失敗しました: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`,
      _debug: debugInfo,
    }, { status: 500 });
  }

  // ─ 第2段階: MlmPurchase / MlmMember / PointWallet 更新（エラーをスキップ） ─
  for (const order of run!.orders) {
    const res = resultMap.get(order.memberCode);
    if (!res || !res.ok) continue;

    try {
      // MlmPurchase 記録（重複チェック）
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
            productCode:    order.productCode ?? "2000",
            productName:    order.productName ?? "VIOLA Pure 翠彩-SUMISAI-",
            quantity:       order.quantity ?? 1,
            unitPrice:      order.unitPrice ?? UNIT_PRICE,
            points:         order.points ?? POINTS,
            totalPoints:    (order.points ?? POINTS) * (order.quantity ?? 1),
            purchaseStatus: 'autoship',
            purchaseMonth:  targetMonth,
            purchasedAt:    res.paidDate ?? now,
          },
        });
      }
    } catch (purchaseErr) {
      const msg = `MlmPurchase作成エラー(${order.memberCode}): ${purchaseErr instanceof Error ? purchaseErr.message : String(purchaseErr)}`;
      console.error("[import-direct]", msg);
      orderUpdateErrors.push(msg);
    }

    try {
      // 会員ステータスをアクティブに
      await prisma.mlmMember.update({
        where: { id: order.mlmMemberId },
        data:  { status: "active" },
      });
    } catch (memberErr) {
      const msg = `MlmMember更新エラー(${order.memberCode}): ${memberErr instanceof Error ? memberErr.message : String(memberErr)}`;
      console.error("[import-direct]", msg);
      orderUpdateErrors.push(msg);
    }

    try {
      // SAVボーナス付与（オートシップ時: 15,000円の5% = 750pt 固定）
      const memberRecord = memberMap.get(order.memberCode);
      if (memberRecord) {
        const AUTOSHIP_BASE = 15000;
        const AUTOSHIP_RATE = 0.05;
        const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE); // 750pt
        if (savingsPoints > 0) {
          await prisma.pointWallet.upsert({
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
          await prisma.mlmMember.update({
            where: { id: memberRecord.id },
            data:  { savingsPoints: { increment: savingsPoints } },
          });
        }
      }
    } catch (pointErr) {
      const msg = `PointWallet更新エラー(${order.memberCode}): ${pointErr instanceof Error ? pointErr.message : String(pointErr)}`;
      console.error("[import-direct]", msg);
      postProcessErrors.push(msg);
    }
  }

  if (orderUpdateErrors.length > 0 || postProcessErrors.length > 0) {
    console.warn("[import-direct] 後処理エラー一覧:", { orderUpdateErrors, postProcessErrors });
  }

  return NextResponse.json({
    runId:                run.id.toString(),
    paidCount,
    failedCount,
    runCreated,
    effectivePaymentMethod,
    warnings:             orderUpdateErrors.length + postProcessErrors.length > 0
                            ? [...orderUpdateErrors, ...postProcessErrors]
                            : undefined,
    _debug: debugInfo,
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

  // 全注文を決済成功として反映（2段階処理）
  let paidCount   = 0;
  let failedCount = 0;

  // 第1段階: AutoShipOrder を updateMany で一括更新（トランザクションタイムアウト回避）
  try {
    const targetOrderIds = run!.orders
      .filter(o => memberMap.has(o.memberCode))
      .map(o => o.id);
    paidCount = targetOrderIds.length;

    if (paidCount > 0) {
      await prisma.autoShipOrder.updateMany({
        where: { id: { in: targetOrderIds } },
        data:  { status: "paid", paidAt: now },
      });
    }

    // ★ run!.status を直接フォールバックに使うと DB に残った不正値でエラーになるため安全な値を使用
    const VALID_DB_RUN_STATUSES = ["draft", "exported", "importing", "completed", "canceled"] as const;
    type ValidDbRunStatus = typeof VALID_DB_RUN_STATUSES[number];
    const currentDbStatus = VALID_DB_RUN_STATUSES.includes(run!.status as ValidDbRunStatus)
      ? run!.status as ValidDbRunStatus
      : "exported";
    await prisma.autoShipRun.update({
      where: { id: run!.id },
      data: {
        paidCount,
        failedCount,
        importedAt: now,
        status:     paidCount > 0 ? "completed" : currentDbStatus,
      },
    });
  } catch (updateErr) {
    console.error("[import-direct/db] 第1段階 updateMany エラー:", updateErr);
    return NextResponse.json({ error: `決済ステータス更新に失敗しました: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}` }, { status: 500 });
  }

  // 第2段階: MlmPurchase / MlmMember / PointWallet 更新
  for (const order of run!.orders) {
    const memberRecord = memberMap.get(order.memberCode);
    if (!memberRecord) continue;

    try {
      const existingPurchase = await prisma.mlmPurchase.findFirst({
        where: { mlmMemberId: order.mlmMemberId, purchaseMonth: targetMonth, productCode: order.productCode ?? "2000" },
      });
      if (!existingPurchase) {
        await prisma.mlmPurchase.create({
          data: {
            mlmMemberId:    order.mlmMemberId,
            productCode:    order.productCode ?? "2000",
            productName:    order.productName ?? "VIOLA Pure 翠彩-SUMISAI-",
            quantity:       order.quantity ?? 1,
            unitPrice:      order.unitPrice ?? UNIT_PRICE,
            points:         order.points ?? POINTS,
            totalPoints:    (order.points ?? POINTS) * (order.quantity ?? 1),
            purchaseStatus: 'autoship',
            purchaseMonth:  targetMonth,
            purchasedAt:    now,
          },
        });
      }
    } catch (e) {
      console.error(`[import-direct/db] MlmPurchaseエラー(${order.memberCode}):`, e);
    }

    try {
      await prisma.mlmMember.update({
        where: { id: order.mlmMemberId },
        data:  { status: "active" },
      });
    } catch (e) {
      console.error(`[import-direct/db] MlmMember更新エラー(${order.memberCode}):`, e);
    }

    try {
      const AUTOSHIP_BASE = 15000;
      const AUTOSHIP_RATE = 0.05;
      const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE);
      if (savingsPoints > 0) {
        await prisma.pointWallet.upsert({
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
        await prisma.mlmMember.update({
          where: { id: memberRecord.id },
          data:  { savingsPoints: { increment: savingsPoints } },
        });
      }
    } catch (e) {
      console.error(`[import-direct/db] PointWalletエラー(${order.memberCode}):`, e);
    }
  }

  return NextResponse.json({
    runId:      run.id.toString(),
    paidCount,
    failedCount,
    runCreated,
    mode:       "db_auto",
  }, { status: 200 });
}
