// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300 // Vercel最大300秒

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { getMlmDisplayName } from "@/lib/mlm-display-name";

/**
 * POST: クレディックス結果CSVを直接インポート
 *
 * ═══════════════════════════════════════════════════════════════
 * ① クレディックス結果CSV 照合ロジック
 * ═══════════════════════════════════════════════════════════════
 *   CSVフォーマット（クレディックスから届く）:
 *     IPコード, オーダーNo, 電話番号, 決済日時, 結果, 3D認証,
 *     取り消し日, E-mail, 発行ID, 発行パスワード, ID(sendid),
 *     SENDPOINT, 決済金額, 支払回数, 処理方式
 *
 *   ② 照合キー: K列（ID(sendid)）の値
 *       - 「WC付き数字」例: WC1485760
 *       - 「数字のみ」例: 69823944
 *       → 数字部分を正規化して比較
 *
 *   ③ 照合先: MLM会員管理 > MLM会員詳細
 *       MlmMember.creditCardId  （クレジット①）
 *       MlmMember.creditCardId2 （クレジット②）
 *       MlmMember.creditCardId3 （クレジット③）
 *       いずれかが一致する会員を対象とする
 *       記載のない人（全て null）は対象外
 *
 *   ④ 照合後: 金額・購入反映を自動実行
 *       - AutoShipRun が未作成なら自動作成
 *       - AutoShipOrder を upsert（照合済み会員分）
 *       - MlmPurchase 登録・MlmMember.status=active・PointWallet付与
 *
 *   ⑤ 伝票作成: AutoShipOrder を自動作成（照合完了分）
 *
 *   ⑥ 完了後: AutoShipRun.status=completed に更新 → タブに表示
 *
 * ═══════════════════════════════════════════════════════════════
 * 三菱UFJファクター TXT も引き続きサポート（照合ロジック変更なし）
 * ═══════════════════════════════════════════════════════════════
 *
 * FormData:
 *   file:          CSV / TXT ファイル（省略可: noFile=true の場合はDBから自動取得）
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

  // ── フォーマット自動判定: 三菱UFJファクター固定長TXT ──
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
    const m1 = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m1) {
      const [, y, mo, d, h = "0", mi = "0", s = "0"] = m1;
      const jst = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
      return new Date(jst.getTime() - 9 * 60 * 60 * 1000);
    }
    return null;
  }

  // ── 決済ID正規化: WC付き・数字のみ両方を数字部分のみに正規化 ──
  function normalizeCardId(raw: string): string {
    const s = raw.trim();
    // WC数字 → 数字のみ
    const wcMatch = s.match(/^WC(\d+)$/i);
    if (wcMatch) return wcMatch[1];
    // 数字のみ
    if (/^\d+$/.test(s)) return s;
    return s;
  }

  // ── 決済IDが一致するかチェック（両方向） ──
  function cardIdMatch(csvId: string, memberCardId: string | null): boolean {
    if (!memberCardId) return false;
    const normCsv    = normalizeCardId(csvId);
    const normMember = normalizeCardId(memberCardId);
    return normCsv !== "" && normCsv === normMember;
  }

  // ══════════════════════════════════════════════════════════════
  // 三菱UFJファクター 固定長TXT
  // ══════════════════════════════════════════════════════════════
  if (isMufgFixedFormat(uint8)) {
    return await processMufgTxt(arrayBuffer, uint8, targetMonth);
  }

  // ══════════════════════════════════════════════════════════════
  // CSV フォーマット（クレディックス結果CSV / 社内CSV / 汎用CSV）
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
  // クレディックス結果CSV判定
  //   ヘッダーに sendid / id(sendid) / sendpoint を含む
  // ──────────────────────────────────────────────────────────────
  const isCredixResultFormat = header.some(h =>
    h.includes("sendid") || h.includes("sendpoint") || h.includes("id(sendid)")
  );

  // 社内クレディックスCSV（送信用）
  const isCredixInternalFormat =
    !isCredixResultFormat &&
    header.includes("顧客id") &&
    (header.includes("会員コード") || header.some(h => h.includes("会員コード")));

  const dataLines = lines.slice(1).filter(l => l.trim());
  if (dataLines.length === 0) {
    return NextResponse.json({ error: "CSVにデータ行がありません（ヘッダー行のみ）" }, { status: 400 });
  }

  // ══════════════════════════════════════════════════════════════
  // ★ クレディックス結果CSV: K列（ID(sendid)）で照合
  // ══════════════════════════════════════════════════════════════
  if (isCredixResultFormat) {
    // 列インデックス取得
    const codeIdx   = (() => {
      let i = header.findIndex(h => h === "id(sendid)" || h.includes("sendid"));
      if (i === -1) i = 10; // デフォルト K列
      return i;
    })();
    const resultIdx = (() => {
      let i = header.findIndex(h => h.includes("結果") || h === "result");
      if (i === -1) i = 4;
      return i;
    })();
    const dateIdx   = (() => {
      let i = header.findIndex(h =>
        h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") || h.includes("date")
      );
      if (i === -1) i = 3;
      return i;
    })();

    console.log(`[import-direct] Credix結果CSV検出: header=[${header.join("|")}]`);
    console.log(`[import-direct] Credix: codeIdx(K列)=${codeIdx}, resultIdx=${resultIdx}, dateIdx=${dateIdx}`);

    // ── CSV から 決済ID → { isOk, paidDate } マップを構築 ──
    // 同一決済IDに複数行ある場合、成功行を優先
    const csvIdMap = new Map<string, { isOk: boolean; paidDate: Date | undefined }>();

    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
      if (cols.length === 0) continue;

      const rawId = cols[codeIdx] ?? "";
      if (!rawId || rawId === "-" || rawId === "") continue;

      const normId = normalizeCardId(rawId);
      if (!normId) continue;

      // 結果判定
      let isOk = true;
      if (resultIdx >= 0 && cols[resultIdx] !== undefined && cols[resultIdx] !== "") {
        const rawResult = cols[resultIdx];
        isOk = rawResult.includes("完了") || rawResult.includes("成功") ||
               rawResult.toUpperCase() === "OK" || rawResult === "0" || rawResult === "1";
      }

      const rawDate = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
      const paidDate = parseCsvDate(rawDate) ?? undefined;

      // 同一IDは成功優先で登録
      if (!csvIdMap.has(normId)) {
        csvIdMap.set(normId, { isOk, paidDate });
      } else if (isOk && !csvIdMap.get(normId)!.isOk) {
        csvIdMap.set(normId, { isOk, paidDate });
      }
    }

    console.log(`[import-direct] Credix: CSV決済ID ${csvIdMap.size}件抽出`);

    // ── 対象会員取得: creditCardId①②③ のいずれかが登録されている会員 ──
    const allMlmMembers = await prisma.mlmMember.findMany({
      where: {
        autoshipEnabled: true,
        status: { not: "withdrawn" },
        OR: [
          { creditCardId:  { not: null } },
          { creditCardId2: { not: null } },
          { creditCardId3: { not: null } },
        ],
      },
      select: {
        id: true,
        userId: true,
        memberCode: true,
        creditCardId:  true,
        creditCardId2: true,
        creditCardId3: true,
        mobile: true,
        companyName: true,
        autoshipStartDate: true,
        autoshipStopDate: true,
        autoshipSuspendMonths: true,
        user: {
          select: {
            name: true,
            nameKana: true,
            phone: true,
            email: true,
            postalCode: true,
            address: true,
            mlmRegistration: {
              select: {
                deliveryPostalCode: true,
                deliveryAddress: true,
                deliveryName: true,
              },
            },
          },
        },
      },
    });

    console.log(`[import-direct] Credix: creditCardId①②③登録済み会員 ${allMlmMembers.length}件`);

    // ── 会員の決済ID → 会員マップを構築 ──
    // 1つの会員が3枠持つため、各枠の正規化IDをキーにマップ
    type MemberRow = typeof allMlmMembers[0];
    const cardIdToMember = new Map<string, MemberRow>();
    for (const m of allMlmMembers) {
      for (const cid of [m.creditCardId, m.creditCardId2, m.creditCardId3]) {
        if (!cid) continue;
        const normCid = normalizeCardId(cid);
        if (normCid && !cardIdToMember.has(normCid)) {
          cardIdToMember.set(normCid, m);
        }
      }
    }
    console.log(`[import-direct] Credix: 決済ID→会員マップ ${cardIdToMember.size}件構築`);

    // ── 照合: CSV決済ID → 会員 ──
    // memberCode → { isOk, paidDate, member } の結果マップ
    const matchedMap = new Map<string, { isOk: boolean; paidDate: Date | undefined; member: MemberRow }>();

    for (const [normId, entry] of csvIdMap) {
      const member = cardIdToMember.get(normId);
      if (!member) continue;
      // 同一会員で複数決済IDがヒットした場合: 成功優先
      const existing = matchedMap.get(member.memberCode);
      if (!existing || (entry.isOk && !existing.isOk)) {
        matchedMap.set(member.memberCode, { ...entry, member });
      }
    }

    const now = new Date();
    const [ty, tm] = targetMonth.split("-").map(Number);
    const targetMonthStart = new Date(ty, tm - 1, 1);

    let paidCount   = 0;
    let failedCount = 0;
    const unmatchedItems: string[] = [];
    const warnings: string[] = [];

    console.log(`[import-direct] Credix: 照合結果 ${matchedMap.size}件（成功+失敗合計）`);

    if (matchedMap.size === 0) {
      warnings.push("⚠️ 照合が0件でした。MLM会員詳細の「クレジット①②③（クレディックス）」に登録された決済IDとCSVのK列（ID(sendid)）が一致する会員が見つかりませんでした。");
    }

    // ── AutoShipRun を取得または作成 ──
    let autoShipRun = await prisma.autoShipRun.findUnique({
      where: {
        targetMonth_paymentMethod: { targetMonth, paymentMethod: "credit_card" },
      },
    });

    const matchedMembers = Array.from(matchedMap.values());
    const paidMembers    = matchedMembers.filter(m => m.isOk);
    const failedMembers  = matchedMembers.filter(m => !m.isOk);

    if (!autoShipRun) {
      // AutoShipRun を自動作成
      autoShipRun = await prisma.autoShipRun.create({
        data: {
          targetMonth,
          paymentMethod:  "credit_card",
          status:         "completed",
          totalCount:     matchedMembers.length,
          paidCount:      paidMembers.length,
          failedCount:    failedMembers.length,
          totalAmount:    paidMembers.length * 16500,
          importedAt:     now,
          completedAt:    now,
        },
      });
      console.log(`[import-direct] Credix: AutoShipRun 新規作成 id=${autoShipRun.id}`);
    } else {
      // 既存 AutoShipRun を更新
      await prisma.autoShipRun.update({
        where: { id: autoShipRun.id },
        data: {
          status:      "completed",
          paidCount:   { increment: paidMembers.length },
          failedCount: { increment: failedMembers.length },
          totalCount:  { increment: matchedMembers.length },
          totalAmount: { increment: paidMembers.length * 16500 },
          importedAt:  now,
          completedAt: now,
        },
      });
      console.log(`[import-direct] Credix: AutoShipRun 既存更新 id=${autoShipRun.id}`);
    }

    // ── AutoShipOrder を upsert（照合済み会員分） ──
    for (const { isOk, paidDate, member } of matchedMap.values()) {
      try {
        await prisma.autoShipOrder.upsert({
          where: {
            autoShipRunId_mlmMemberId: {
              autoShipRunId: autoShipRun.id,
              mlmMemberId:   member.id,
            },
          },
          create: {
            autoShipRunId: autoShipRun.id,
            mlmMemberId:   member.id,
            targetMonth,
            paymentMethod: "credit_card",
            memberCode:    member.memberCode,
            memberName:    getMlmDisplayName(member.user.name, member.companyName),
            memberNameKana: member.user.nameKana ?? null,
            memberPhone:   member.mobile ?? member.user.phone ?? null,
            memberEmail:   member.user.email ?? null,
            memberPostal:  member.user.mlmRegistration?.deliveryPostalCode ?? member.user.postalCode ?? null,
            memberAddress: member.user.mlmRegistration?.deliveryAddress ?? member.user.address ?? null,
            creditCardId:  member.creditCardId ?? null,
            unitPrice:     16500,
            totalAmount:   16500,
            points:        150,
            status:        isOk ? "paid" : "failed",
            paidAt:        isOk ? (paidDate ?? now) : null,
            failReason:    isOk ? null : "決済失敗",
          },
          update: {
            status:     isOk ? "paid" : "failed",
            paidAt:     isOk ? (paidDate ?? now) : null,
            failReason: isOk ? null : "決済失敗",
          },
        });

        if (isOk) {
          paidCount++;
        } else {
          failedCount++;
          unmatchedItems.push(`${member.memberCode}(決済失敗)`);
        }
      } catch (e) {
        console.error(`[import-direct] AutoShipOrder upsertエラー(${member.memberCode}):`, e);
        failedCount++;
      }
    }

    // CSV にあるが会員未照合のIDを収集（デバッグ用）
    let csvUnmatchedCount = 0;
    for (const normId of csvIdMap.keys()) {
      if (!cardIdToMember.has(normId)) {
        csvUnmatchedCount++;
      }
    }
    if (csvUnmatchedCount > 0) {
      unmatchedItems.push(`CSV内で会員未照合の決済ID: ${csvUnmatchedCount}件`);
    }

    // ── 後処理: paid 会員に MlmPurchase / PointWallet / MlmMember.status 更新 ──
    await Promise.allSettled(
      paidMembers.map(async ({ paidDate, member }) => {
        await updateMemberAfterPayment(member.userId, targetMonth, paidDate ?? now);
      })
    );

    if (unmatchedItems.length > 0) {
      warnings.push(`⚠️ 照合できなかった件数: ${unmatchedItems.length}件 → ${unmatchedItems.slice(0, 20).join(", ")}`);
    }

    console.log(`[import-direct] Credix: 完了 paid=${paidCount}件 failed=${failedCount}件 CSVunmatched=${csvUnmatchedCount}件`);

    return NextResponse.json({
      paidCount,
      failedCount,
      matchedCount:          matchedMap.size,
      unmatchedCount:        unmatchedItems.length,
      effectivePaymentMethod: "credit_card",
      runId:                 autoShipRun.id.toString(),
      warnings:              warnings.length > 0 ? warnings : undefined,
      _debug: {
        csvIdCount:       csvIdMap.size,
        memberCount:      allMlmMembers.length,
        cardIdMapSize:    cardIdToMember.size,
        matchedCount:     matchedMap.size,
        paidCount,
        failedCount,
        csvUnmatchedCount,
        unmatchedSample:  unmatchedItems.slice(0, 10),
      },
    }, { status: 200 });
  }

  // ══════════════════════════════════════════════════════════════
  // 社内クレディックスCSV / 汎用CSV: 会員コード照合
  // ══════════════════════════════════════════════════════════════
  {
    let codeIdx = -1;
    let resultIdx = -1;
    let dateIdx   = -1;
    let reasonIdx = -1;

    if (isCredixInternalFormat) {
      codeIdx   = header.findIndex(h => h === "会員コード" || h.includes("会員コード"));
      dateIdx   = header.findIndex(h => h.includes("処理年月") || h.includes("日時") || h.includes("date"));
      if (codeIdx === -1) codeIdx = 1;
      console.log(`[import-direct] クレディックス社内CSV検出: codeIdx=${codeIdx}, dateIdx=${dateIdx}`);
    } else {
      codeIdx = header.findIndex(h =>
        h.includes("会員コード") || h.includes("membercode") || h === "code" ||
        h.includes("会員no") || h.includes("会員番号") || h.includes("member_code") ||
        h.includes("コード") || h.includes("会員") || h.includes("顧客コード") ||
        h.includes("customercode") || h === "id" || h.includes("memberid")
      );
      resultIdx = header.findIndex(h =>
        h.includes("結果") || h.includes("result") || h.includes("status") || h.includes("決済")
      );
      dateIdx = header.findIndex(h =>
        h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") || h.includes("date")
      );
      reasonIdx = header.findIndex(h =>
        h.includes("理由") || h.includes("reason") || h.includes("error") || h.includes("失敗")
      );

      if (codeIdx === -1) {
        const firstVal = headerRaw[0]?.replace(/^"|"$/g, "").trim() ?? "";
        if (/^[0-9]+(-[0-9]+)?$/.test(firstVal)) {
          codeIdx = 0; resultIdx = -1; reasonIdx = -1;
        } else if (dataLines.length > 0) {
          codeIdx = 0; resultIdx = -1; reasonIdx = -1;
        } else {
          return NextResponse.json(
            {
              error: `CSVの形式が正しくありません（会員コード列が見つかりません）。\n検出されたヘッダー列: [${headerRaw.join(", ")}]\n\n対応フォーマット:\n① クレディックスCSV（.csv）: ヘッダーに「ID(sendid)」列を含む形式\n② 三菱UFJファクター固定長TXT（.txt）: 固定長形式\n③ 汎用CSV: ヘッダーに「会員コード」等の列を含む形式`,
              detectedHeaders: headerRaw,
            },
            { status: 400 }
          );
        }
      }
    }

    const resultMap = new Map<string, { ok: boolean; reason?: string; paidDate?: Date }>();
    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols    = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
      if (cols.length === 0) continue;

      const rawCode = cols[codeIdx] ?? "";
      if (!rawCode || rawCode === "-") continue;

      const rawDate  = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
      const paidDate = parseCsvDate(rawDate) ?? undefined;

      if (isCredixInternalFormat) {
        if (!resultMap.has(rawCode)) {
          resultMap.set(rawCode, { ok: true, paidDate });
        }
      } else {
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

    return await processGenericCsv(resultMap, targetMonth, paymentMethod);
  }

  } catch (unexpectedErr) {
    console.error("[import-direct] 予期しないエラー:", unexpectedErr);
    return NextResponse.json(
      { error: `インポート処理中にエラーが発生しました: ${unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr)}` },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════
// 三菱UFJファクター 固定長TXT 処理
// ══════════════════════════════════════════════════════════════
async function processMufgTxt(
  arrayBuffer: ArrayBuffer,
  _uint8: Uint8Array,
  targetMonth: string
): Promise<Response> {
  const [ty, tm] = targetMonth.split("-").map(Number);
  const lastDayOfMonth = new Date(ty, tm, 0);
  const paidDateForAll = new Date(lastDayOfMonth.getTime() - 9 * 60 * 60 * 1000);

  const rawBytes = new Uint8Array(arrayBuffer);
  const resultMap = new Map<string, { ok: boolean; reason?: string; paidDate?: Date }>();

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

    const normStr = norm.map(b => (b >= 0x30 && b <= 0x39) ? String.fromCharCode(b) : " ").join("");
    const digitBlocks = normStr.match(/\d{20,}/g);
    if (!digitBlocks || digitBlocks.length === 0) continue;
    const tail32 = digitBlocks[digitBlocks.length - 1].slice(0, 32);
    if (tail32.length < 24) continue;

    const memberNoRaw = tail32.slice(16, 22);
    if (!/^\d+$/.test(memberNoRaw)) continue;
    const memberNo    = memberNoRaw.replace(/^0+/, "") || "0";
    const branchNoRaw = tail32.slice(22, 24);
    if (!/^\d+$/.test(branchNoRaw)) continue;
    const branchNo    = branchNoRaw;
    const branchNoInt = String(parseInt(branchNoRaw, 10));
    const memberCodeFull   = `${memberNo}-${branchNo}`;
    const memberCodeNoZero = `${memberNo}-${branchNoInt}`;

    if (!resultMap.has(memberCodeFull)) {
      resultMap.set(memberCodeFull, { ok: true, paidDate: paidDateForAll });
    }
    if (memberCodeFull !== memberCodeNoZero && !resultMap.has(memberCodeNoZero)) {
      resultMap.set(memberCodeNoZero, { ok: true, paidDate: paidDateForAll });
    }
  }

  console.log(`[import-direct] MUFG TXT検出: ${resultMap.size}会員コード抽出`);
  return await processGenericCsv(resultMap, targetMonth, "bank_transfer");
}

// ══════════════════════════════════════════════════════════════
// 汎用CSV（MUFG・社内CSV）: memberCode → Order 照合
// ══════════════════════════════════════════════════════════════
async function processGenericCsv(
  resultMap: Map<string, { ok: boolean; reason?: string; paidDate?: Date }>,
  targetMonth: string,
  paymentMethod: "credit_card" | "bank_transfer"
): Promise<Response> {
  const now = new Date();
  const [year, month] = targetMonth.split("-").map(Number);
  const monthStart    = new Date(year, month - 1, 1);
  const monthEnd      = new Date(year, month, 1);
  const monthStartUtc = new Date(monthStart.getTime() - 9 * 60 * 60 * 1000);
  const monthEndUtc   = new Date(monthEnd.getTime()   - 9 * 60 * 60 * 1000);

  const ORDER_PM_FILTER = paymentMethod === "bank_transfer"
    ? ["bank_transfer", "振替(銀行)", "振替"]
    : ["card", "credit_card", "カード"];

  let paidCount   = 0;
  let failedCount = 0;
  const matchedOrderIds: string[] = [];
  const unmatchedItems:  string[] = [];
  const warnings: string[] = [];
  const effectivePaymentMethod = paymentMethod;

  const memberCodes = Array.from(resultMap.keys());
  console.log(`[import-direct] 汎用/MUFG: 照合対象memberCode ${memberCodes.length}件`);

  for (const memberCode of memberCodes) {
    const entry = resultMap.get(memberCode)!;
    if (!entry.ok) continue;

    const user = await prisma.user.findUnique({
      where: { memberCode },
      select: { id: true },
    });
    if (!user) {
      unmatchedItems.push(`${memberCode}(会員未登録)`);
      continue;
    }

    const twoMonthsAgo   = new Date(monthStart.getTime() - 60 * 24 * 60 * 60 * 1000);
    const twoMonthsAhead = new Date(monthEnd.getTime()   + 60 * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        userId:        user.id,
        slipType:      "autoship",
        paymentStatus: { in: ["unpaid", "pending"] },
        orderedAt: {
          gte: new Date(twoMonthsAgo.getTime() - 9 * 60 * 60 * 1000),
          lt:  new Date(twoMonthsAhead.getTime() - 9 * 60 * 60 * 1000),
        },
        OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })),
      },
      orderBy: { orderedAt: "desc" },
      take: 1,
    });

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
      continue;
    }

    for (const order of targetOrders) {
      await prisma.order.update({
        where: { id: order.id },
        data:  { paidAt: entry.paidDate ?? now, paymentStatus: "paid" },
      });
      matchedOrderIds.push(order.id.toString());
    }
    paidCount++;
    await updateMemberAfterPayment(user.id, targetMonth, entry.paidDate ?? now);
  }

  if (unmatchedItems.length > 0) {
    warnings.push(`⚠️ 照合できなかった件数: ${unmatchedItems.length}件 → ${unmatchedItems.slice(0, 20).join(", ")}`);
  }

  console.log(`[import-direct] 汎用/MUFG完了: paid=${paidCount}件 unmatched=${unmatchedItems.length}件`);

  return NextResponse.json({
    paidCount,
    failedCount,
    matchedOrderCount:     matchedOrderIds.length,
    unmatchedCount:        unmatchedItems.length,
    effectivePaymentMethod,
    warnings:              warnings.length > 0 ? warnings : undefined,
    _debug: {
      memberCodeCount: memberCodes.length,
      paidCount,
      unmatchedCount:  unmatchedItems.length,
      unmatchedSample: unmatchedItems.slice(0, 10),
      matchedOrderIds: matchedOrderIds.slice(0, 10),
    },
  }, { status: 200 });
}

// ══════════════════════════════════════════════════════════════
// 入金後処理: MlmPurchase 登録・MlmMember.status=active・PointWallet付与
// ══════════════════════════════════════════════════════════════
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

  let mlmMemberId: bigint | null = null;
  try {
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!mlmMember) return;
    mlmMemberId = mlmMember.id;
  } catch (e) {
    console.error(`[import-direct] MlmMember取得エラー(userId=${userId}):`, e);
    return;
  }

  // MlmPurchase: 未作成なら作成
  try {
    const existing = await prisma.mlmPurchase.findFirst({
      where: { mlmMemberId, purchaseMonth: targetMonth, purchaseStatus: "autoship" },
    });
    if (!existing) {
      await prisma.mlmPurchase.create({
        data: {
          mlmMemberId,
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

  // MlmMember.status → active / PointWallet / savingsPoints を並列更新
  await Promise.allSettled([
    prisma.mlmMember.update({
      where: { id: mlmMemberId },
      data:  { status: "active" },
    }).catch((e: unknown) => console.error(`[import-direct] MlmMember更新エラー(userId=${userId}):`, e)),

    savingsPoints > 0
      ? prisma.pointWallet.upsert({
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
        }).catch((e: unknown) => console.error(`[import-direct] PointWalletエラー(userId=${userId}):`, e))
      : Promise.resolve(),

    savingsPoints > 0
      ? prisma.mlmMember.update({
          where: { id: mlmMemberId },
          data:  { savingsPoints: { increment: savingsPoints } },
        }).catch((e: unknown) => console.error(`[import-direct] savingsPoints更新エラー(userId=${userId}):`, e))
      : Promise.resolve(),
  ]);
}

// ══════════════════════════════════════════════════════════════
// ファイルなしモード（「当月アクティブ反映」ボタン）
// ══════════════════════════════════════════════════════════════
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
    let orders = await prisma.order.findMany({
      where: {
        userId:    m.userId,
        slipType:  "autoship",
        orderedAt: { gte: monthStartUtc, lt: monthEndUtc },
        OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })),
      },
      orderBy: { orderedAt: "desc" },
    });

    if (orders.length === 0) {
      const extStart = new Date(monthStartUtc.getTime() - 30 * 24 * 60 * 60 * 1000);
      const extEnd   = new Date(monthEndUtc.getTime()   + 30 * 24 * 60 * 60 * 1000);
      orders = await prisma.order.findMany({
        where: {
          userId:        m.userId,
          slipType:      "autoship",
          paymentStatus: { in: ["unpaid", "pending"] },
          orderedAt:     { gte: extStart, lt: extEnd },
          OR: ORDER_PM_FILTER.map(pm => ({ paymentMethod: pm })),
        },
        orderBy: { orderedAt: "desc" },
        take: 1,
      });
    }

    if (orders.length === 0) {
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
