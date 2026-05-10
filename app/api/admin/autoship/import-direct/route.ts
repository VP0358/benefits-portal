// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300 // Vercel最大300秒

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { getMlmDisplayName } from "@/lib/mlm-display-name";

/**
 * POST: クレディックス結果CSVを直接インポート（全面修正版）
 *
 * ═══════════════════════════════════════════════════════════════
 * クレディックス結果CSV フォーマット:
 *   A: IPコード
 *   B: オーダーNo
 *   C: 電話番号
 *   D: 決済日時      ← 伝票作成に使用
 *   E: 結果          ← 伝票作成に使用（成功/失敗判定）
 *   F: 3D認証
 *   G: 取り消し日
 *   H: E-mail
 *   I: 発行ID
 *   J: 発行パスワード
 *   K: ID(sendid)    ← 照合キー（決済ID）
 *   L: SENDPOINT
 *   M: 決済金額      ← 伝票作成に使用
 *   N: 支払回数
 *   O: 処理方式
 *
 * 照合ロジック（要件①〜⑨）:
 *   ① 決済失敗者: CSVに記載されないため、会員DBから判定し失敗者一覧を生成
 *   ② 照合キー: K列（ID(sendid)）のみで判定
 *      - 「WC付き数字」例: WC1485760 → 数字部分「1485760」で比較
 *      - 「数字のみ」例: 69823944
 *   ③ 同一決済IDで複数行ある場合でも、CSVにIDがあれば決済成功者と認定
 *   ④ 会員DBに決済ID①②③があるが、CSVにない → 決済失敗者として一覧表示
 *   ⑤ フォントは別途UI側で対応
 *   ⑥ 会員DB上で頭に「0」がない決済IDがある場合、CSV側の「0」を削除して判定
 *      （両方向正規化: DB側の0も削除、CSV側の0も削除して比較）
 *   ⑦ 成功者・失敗者とも会員IDと名前を含めてレスポンス
 *   ⑧ 判定はK列（ID(sendid)）のみ
 *   ⑨ 伝票作成には「決済日時(D列)」「結果(E列)」「決済金額(M列)」を使用
 * ═══════════════════════════════════════════════════════════════
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

    if (isMufgFixedFormat(uint8)) {
      return await processMufgTxt(arrayBuffer, uint8, targetMonth);
    }

    // ── エンコーディング判定 ──
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

    // ── クレディックス結果CSV判定（K列: ID(sendid) を含む）──
    const isCredixResultFormat = header.some(h =>
      h.includes("sendid") || h.includes("sendpoint") || h.includes("id(sendid)")
    );

    // ── 社内クレディックスCSV ──
    const isCredixInternalFormat =
      !isCredixResultFormat &&
      header.includes("顧客id") &&
      (header.includes("会員コード") || header.some(h => h.includes("会員コード")));

    const dataLines = lines.slice(1).filter(l => l.trim());
    if (dataLines.length === 0) {
      return NextResponse.json({ error: "CSVにデータ行がありません（ヘッダー行のみ）" }, { status: 400 });
    }

    // ══════════════════════════════════════════════════════════════
    // ★ クレディックス結果CSV: K列（ID(sendid)）のみで照合
    // ══════════════════════════════════════════════════════════════
    if (isCredixResultFormat) {
      return await processCredixResultCsv(
        dataLines, header, headerRaw, targetMonth, parseCsvLine
      );
    }

    // ── 社内クレディックスCSV / 汎用CSV ──
    return await processGenericCsvWithLines(
      dataLines, header, headerRaw, targetMonth, paymentMethod,
      isCredixInternalFormat, parseCsvLine
    );

  } catch (unexpectedErr) {
    console.error("[import-direct] 予期しないエラー:", unexpectedErr);
    return NextResponse.json(
      { error: `インポート処理中にエラーが発生しました: ${unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr)}` },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════
// ヘルパー関数
// ══════════════════════════════════════════════════════════════

/** CSV日時文字列 → Date 変換（JST→UTC） */
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

/**
 * 決済ID正規化（先頭0埋め違い廃止版）:
 *
 *   目的: CSVとDB登録値で先頭ゼロの桁数が異なっていても必ず一致させる。
 *
 *   処理手順:
 *     1. WCプレフィックスを除去（例: WC01485760 → 01485760）
 *     2. 先頭ゼロを全て除去（例: 01485760 → 1485760、001485760 → 1485760）
 *     3. 残った数字が1桁以上であれば有効
 *
 *   対応例:
 *     DB登録値  CSV値      → 正規化後（両方）→ 照合結果
 *     01485760  1485760   → 1485760         → ✅ 一致
 *     1485760   01485760  → 1485760         → ✅ 一致
 *     WC1485760 1485760   → 1485760         → ✅ 一致
 *     WC01485760 1485760  → 1485760         → ✅ 一致
 *     69823944  69823944  → 69823944        → ✅ 一致
 *     69823944  069823944 → 69823944        → ✅ 一致
 *
 *   無効とする値（空文字列を返す）:
 *     - 数字以外の文字を含む（WCプレフィックスを除く）
 *     - 空文字列 / "-"
 */
function normalizeCardId(raw: string): string {
  const s = raw.trim();
  if (!s || s === "-") return "";

  // Step1: WCプレフィックスを除去
  const wcMatch = s.match(/^WC(\d+)$/i);
  const digits = wcMatch ? wcMatch[1] : s;

  // Step2: 数字のみで構成されているか確認
  if (!/^\d+$/.test(digits)) return "";

  // Step3: 先頭ゼロを全て除去（先頭0埋め違いを吸収）
  const stripped = digits.replace(/^0+/, "");

  // Step4: 除去後に1桁以上残っていれば有効（全ゼロの場合は "0" を返す）
  return stripped || "0";
}

/** 決済IDマッチング（先頭0埋め違い廃止: 両方向で先頭ゼロを除去して比較） */
function cardIdMatch(csvId: string, memberCardId: string | null): boolean {
  if (!memberCardId) return false;
  const normCsv    = normalizeCardId(csvId);
  const normMember = normalizeCardId(memberCardId);
  return normCsv !== "" && normMember !== "" && normCsv === normMember;
}

// ══════════════════════════════════════════════════════════════
// ★ クレディックス結果CSV 全面修正処理（要件①〜⑨ 完全実装）
//
// 照合ロジック詳細:
//   - K列（ID(sendid)）の値を normalizeCardId() で正規化:
//       WCプレフィックス除去 → 先頭ゼロ全除去（両方向） → 完全一致比較
//       例: WC01485760 → 1485760、CSV側08772089 → 8772089（DB側08772089も→8772089 → ✅ 一致）
//   - DB側の creditCardId①②③ も同じ normalizeCardId() で変換して比較
//   - 1会員が creditCardId①②③ を複数持つ場合:
//     → 3つのうち「どれか1つでも」CSVのK列IDと一致すれば決済成功
//   - CSVに記載のない会員（creditCardId①②③はあるがCSV未照合）→ 決済失敗
// ══════════════════════════════════════════════════════════════
async function processCredixResultCsv(
  dataLines: string[],
  header: string[],
  _headerRaw: string[],
  targetMonth: string,
  parseCsvLine: (line: string) => string[]
): Promise<Response> {

  // ── 列インデックス取得 ──
  // K列: ID(sendid) ← 照合キー（要件⑧: 判定はこの列のみ）
  const sendidIdx = (() => {
    let i = header.findIndex(h => h === "id(sendid)" || h.includes("sendid"));
    return i === -1 ? 10 : i;
  })();
  // D列: 決済日時（要件⑨）
  const dateIdx = (() => {
    let i = header.findIndex(h =>
      h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") || h.includes("date")
    );
    return i === -1 ? 3 : i;
  })();
  // E列: 結果（要件⑨）
  const resultIdx = (() => {
    let i = header.findIndex(h => h.includes("結果") || h === "result");
    return i === -1 ? 4 : i;
  })();
  // M列: 決済金額（要件⑨）
  const amountIdx = (() => {
    let i = header.findIndex(h => h.includes("決済金額") || h.includes("amount") || h === "金額");
    return i === -1 ? 12 : i;
  })();

  console.log(`[import-direct] Credix結果CSV: sendidIdx=${sendidIdx}, dateIdx=${dateIdx}, resultIdx=${resultIdx}, amountIdx=${amountIdx}`);

  // ── CSV から 正規化決済ID → { resultText, isOk, paidDate, amount } マップを構築 ──
  // 要件③: 同一決済IDで複数行ある場合でも、CSVにIDがあれば決済成功者と認定（成功優先）
  // 要件⑥: normalizeCardId() = WCプレフィックス除去 + 先頭ゼロ全除去（両方向）で照合
  const csvIdMap = new Map<string, {
    rawId: string;
    resultText: string;
    isOk: boolean;
    paidDate: Date | undefined;
    amount: number;
  }>();

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
    if (cols.length === 0) continue;

    const rawId = cols[sendidIdx] ?? "";
    if (!rawId || rawId === "-" || rawId === "") continue;

    // 要件⑥: normalizeCardId() で正規化（WCプレフィックス除去 + 先頭ゼロ全除去）
    const normId = normalizeCardId(rawId);
    if (!normId) {
      console.log(`[import-direct] Credix: K列ID「${rawId}」は有効フォーマット外のためスキップ`);
      continue;
    }

    // E列: 結果テキスト（伝票表示用）
    const resultText = resultIdx >= 0 ? (cols[resultIdx] ?? "") : "";
    // D列: 決済日時
    const rawDate  = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
    const paidDate = parseCsvDate(rawDate) ?? undefined;
    // M列: 決済金額（数字のみ抽出）
    const rawAmount = amountIdx >= 0 ? (cols[amountIdx] ?? "0") : "0";
    const amount = parseInt(rawAmount.replace(/[^0-9]/g, ""), 10) || 0;

    // 要件③: 同一IDは成功優先で登録（CSVにIDが存在 = 成功者）
    // isOk は結果列が明示的に失敗を示す場合のみ false
    let isOk = true;
    if (resultText !== "") {
      const rt = resultText.toLowerCase();
      // 明確な失敗文字列のみ false（それ以外はCSVに記載あり = 成功）
      isOk = !(rt.includes("失敗") || rt.includes("エラー") || rt === "ng" || rt.includes("error"));
    }

    if (!csvIdMap.has(normId)) {
      csvIdMap.set(normId, { rawId, resultText, isOk, paidDate, amount });
    } else if (isOk && !csvIdMap.get(normId)!.isOk) {
      // 同一IDで成功行が後から来たら上書き
      csvIdMap.set(normId, { rawId, resultText, isOk, paidDate, amount });
    }
  }

  console.log(`[import-direct] Credix: CSV決済ID ${csvIdMap.size}件抽出`);

  // ── 対象会員取得: creditCardId①②③ のいずれかが登録されている全会員 ──
  // autoshipEnabled は問わず、決済IDが登録されている会員を全件対象とする
  const allMlmMembers = await prisma.mlmMember.findMany({
    where: {
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
      autoshipEnabled: true,
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

  // ── 会員の決済ID → 会員マップを構築（正規化IDをキーに）──
  // 要件②③④: creditCardId①②③のうちどれか1つでもCSVのK列IDに一致すれば成功
  // 要件⑥: normalizeCardId() で両方向先頭ゼロ除去 → 完全一致比較
  type MemberRow = typeof allMlmMembers[0];
  const cardIdToMember = new Map<string, MemberRow>();
  for (const m of allMlmMembers) {
    for (const cid of [m.creditCardId, m.creditCardId2, m.creditCardId3]) {
      if (!cid) continue;
      const normCid = normalizeCardId(cid);
      if (!normCid) {
        console.log(`[import-direct] Credix: 会員${m.memberCode}の決済ID「${cid}」は正規化後に無効のためスキップ`);
        continue;
      }
      // 同じ正規化IDが複数会員に登録されている場合、最初の会員を優先
      if (!cardIdToMember.has(normCid)) {
        cardIdToMember.set(normCid, m);
      }
    }
  }
  console.log(`[import-direct] Credix: 決済ID→会員マップ ${cardIdToMember.size}件構築`);

  // ── 照合: CSV決済ID → 会員 ──
  const matchedMap = new Map<string, {
    isOk: boolean;
    resultText: string;
    paidDate: Date | undefined;
    amount: number;
    member: MemberRow;
  }>();

  // CSV未照合ID（会員DB未登録）
  const unmatchedCsvIds: { rawId: string; normId: string }[] = [];

  for (const [normId, entry] of csvIdMap) {
    const member = cardIdToMember.get(normId);
    if (!member) {
      unmatchedCsvIds.push({ rawId: entry.rawId, normId });
      continue;
    }
    // 同一会員で複数決済IDがヒットした場合: 成功優先
    const existing = matchedMap.get(member.memberCode);
    if (!existing || (entry.isOk && !existing.isOk)) {
      matchedMap.set(member.memberCode, { ...entry, member });
    }
  }

  // ── 要件①③④: 決済失敗者の判定 ──
  // 「会員DBに決済ID①②③があるが、CSVにIDが1つも存在しない会員」= 決済失敗者
  // ※ matchedMapに入っていない、かつ自分の決済ID①②③がcsvIdMapに1件も存在しない会員
  // ※ member（MemberRow）も保持して AutoShipOrder 保存に使用
  const failedMembers: {
    member: MemberRow;
    memberCode: string;
    memberName: string;
    creditIds: string[];    // DB登録値（正規化前の生の値）
    normCreditIds: string[]; // 正規化後の値（デバッグ用）
  }[] = [];

  for (const m of allMlmMembers) {
    // すでに照合成功（matchedMap）に入っている会員はスキップ
    if (matchedMap.has(m.memberCode)) continue;

    // DB登録の決済ID①②③（生の値）
    const memberCids = [m.creditCardId, m.creditCardId2, m.creditCardId3].filter(Boolean) as string[];
    if (memberCids.length === 0) continue; // 決済IDなし会員は失敗者リストに含めない

    // 正規化した決済IDでCSVと照合（要件⑥: 両方向先頭ゼロ除去 → 完全一致）
    const normCids = memberCids.map(cid => normalizeCardId(cid)).filter(Boolean);

    // CSVの決済IDセットと1つでも一致するか確認
    // 要件④: creditCardId①②③のうちどれか1つでもCSVに存在すれば成功
    const anyMatch = normCids.some(normCid => csvIdMap.has(normCid));

    if (!anyMatch) {
      // 要件①③: CSVにIDなし → 決済失敗者として一覧に追加
      failedMembers.push({
        member:       m,
        memberCode:   m.memberCode,
        memberName:   getMlmDisplayName(m.user.name, m.companyName),
        creditIds:    memberCids,    // UI表示用: DB登録値そのまま
        normCreditIds: normCids,     // デバッグ用: 正規化後値
      });
    }
  }

  console.log(`[import-direct] Credix: 照合結果 成功=${matchedMap.size}件 / 失敗(CSV未記載)=${failedMembers.length}件`);

  const now = new Date();
  let paidCount   = 0;
  let failedCount = 0;
  const warnings: string[] = [];

  if (matchedMap.size === 0) {
    warnings.push("⚠️ 照合が0件でした。MLM会員詳細の「クレジット①②③（クレディックス）」に登録された決済IDとCSVのK列（ID(sendid)）が一致する会員が見つかりませんでした。");
    warnings.push("💡 照合ルール: K列IDはWCプレフィックスを除去し先頭ゼロを除いた数字で比較します（両方向）。例: WC01485760→1485760、CSV側01485760も→1485760として一致します。");
  }

  // ── AutoShipRun を取得または作成 ──
  let autoShipRun = await prisma.autoShipRun.findUnique({
    where: {
      targetMonth_paymentMethod: { targetMonth, paymentMethod: "credit_card" },
    },
  });

  const matchedEntries = Array.from(matchedMap.values());
  const paidEntries    = matchedEntries.filter(e => e.isOk);
  const failedEntries  = matchedEntries.filter(e => !e.isOk);

  // 決済金額合計（M列の値を使用）
  const totalPaidAmount = paidEntries.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 16500), 0);

  if (!autoShipRun) {
    autoShipRun = await prisma.autoShipRun.create({
      data: {
        targetMonth,
        paymentMethod:  "credit_card",
        status:         "completed",
        totalCount:     matchedEntries.length,
        paidCount:      paidEntries.length,
        failedCount:    failedEntries.length,
        totalAmount:    totalPaidAmount,
        importedAt:     now,
        completedAt:    now,
      },
    });
  } else {
    await prisma.autoShipRun.update({
      where: { id: autoShipRun.id },
      data: {
        status:      "completed",
        paidCount:   paidEntries.length,
        failedCount: failedEntries.length,
        totalCount:  matchedEntries.length,
        totalAmount: totalPaidAmount,
        importedAt:  now,
        completedAt: now,
      },
    });
  }

  // ── AutoShipOrder を upsert（照合済み + DB検出失敗者の全会員分）──
  // 今回対象外になった既存 Order は pending に戻す
  if (autoShipRun) {
    // 今回処理する全会員ID（CSV照合成功 + DB検出失敗者）
    const allTargetMemberIds = [
      ...matchedEntries.map(e => e.member.id),
      ...failedMembers.map(f => f.member.id),
    ];
    await prisma.autoShipOrder.updateMany({
      where: {
        autoShipRunId: autoShipRun.id,
        mlmMemberId:   { notIn: allTargetMemberIds },
        status:        { in: ["paid", "failed"] },
      },
      data: {
        status:     "pending",
        paidAt:     null,
        failReason: "再インポートにより取消",
      },
    });
  }

  // ── 要件⑨: 伝票作成に「決済日時」「結果」「決済金額」を保存 ──
  for (const { isOk, resultText, paidDate, amount, member } of matchedMap.values()) {
    const unitPrice   = amount > 0 ? amount : 16500;
    const totalAmount = unitPrice;
    try {
      await prisma.autoShipOrder.upsert({
        where: {
          autoShipRunId_mlmMemberId: {
            autoShipRunId: autoShipRun!.id,
            mlmMemberId:   member.id,
          },
        },
        create: {
          autoShipRunId: autoShipRun!.id,
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
          unitPrice,
          totalAmount,
          points:        150,
          status:        isOk ? "paid" : "failed",
          paidAt:        isOk ? (paidDate ?? now) : null,
          failReason:    isOk ? null : (resultText || "決済失敗"),
        },
        update: {
          unitPrice,
          totalAmount,
          status:     isOk ? "paid" : "failed",
          paidAt:     isOk ? (paidDate ?? now) : null,
          failReason: isOk ? null : (resultText || "決済失敗"),
        },
      });

      if (isOk) {
        paidCount++;
      } else {
        failedCount++;
      }
    } catch (e) {
      console.error(`[import-direct] AutoShipOrder upsertエラー(${member.memberCode}):`, e);
      failedCount++;
    }
  }

  // ── 要件①③: DB検出失敗者（CSV未照合）を AutoShipOrder として保存 ──
  // failedMembers はCSV照合なし → status:"failed", failReason:"CSV照合なし（決済ID未一致）"
  // これにより詳細モーダルの「決済失敗者」テーブルに表示される
  for (const { member, memberName, creditIds } of failedMembers) {
    try {
      await prisma.autoShipOrder.upsert({
        where: {
          autoShipRunId_mlmMemberId: {
            autoShipRunId: autoShipRun!.id,
            mlmMemberId:   member.id,
          },
        },
        create: {
          autoShipRunId:  autoShipRun!.id,
          mlmMemberId:    member.id,
          targetMonth,
          paymentMethod:  "credit_card",
          memberCode:     member.memberCode,
          memberName,
          memberNameKana: member.user.nameKana ?? null,
          memberPhone:    member.mobile ?? member.user.phone ?? null,
          memberEmail:    member.user.email ?? null,
          memberPostal:   member.user.mlmRegistration?.deliveryPostalCode ?? member.user.postalCode ?? null,
          memberAddress:  member.user.mlmRegistration?.deliveryAddress ?? member.user.address ?? null,
          creditCardId:   member.creditCardId ?? null,
          unitPrice:      16500,
          totalAmount:    16500,
          points:         0,
          status:         "failed",
          paidAt:         null,
          // failReason に登録済み決済IDを含めて確認しやすくする
          failReason:     `CSV照合なし（登録決済ID: ${creditIds.join(" / ")}）`,
        },
        update: {
          // 再インポート時は既存 Order の内容を上書き
          status:     "failed",
          paidAt:     null,
          failReason: `CSV照合なし（登録決済ID: ${creditIds.join(" / ")}）`,
        },
      });
      failedCount++;
    } catch (e) {
      console.error(`[import-direct] failedMember upsertエラー(${member.memberCode}):`, e);
    }
  }

  // ── AutoShipRun カウントをDB実値で再計算 ──
  if (autoShipRun) {
    const agg = await prisma.autoShipOrder.aggregate({
      where: { autoShipRunId: autoShipRun.id },
      _count: { id: true },
      _sum:   { totalAmount: true },
    });
    const paidAgg = await prisma.autoShipOrder.aggregate({
      where: { autoShipRunId: autoShipRun.id, status: "paid" },
      _count: { id: true },
    });
    const failedAgg = await prisma.autoShipOrder.aggregate({
      where: { autoShipRunId: autoShipRun.id, status: "failed" },
      _count: { id: true },
    });
    await prisma.autoShipRun.update({
      where: { id: autoShipRun.id },
      data: {
        totalCount:  agg._count.id,
        paidCount:   paidAgg._count.id,
        failedCount: failedAgg._count.id,
        totalAmount: agg._sum.totalAmount ?? 0,
      },
    });
  }

  // ── 後処理: paid 会員に MlmPurchase / PointWallet / MlmMember.status 更新 ──
  await Promise.allSettled(
    paidEntries.map(async ({ paidDate, member }) => {
      await updateMemberAfterPayment(member.userId, targetMonth, paidDate ?? now);
    })
  );

  // ── 要件①③⑦: 失敗者一覧（会員IDと名前付き）をレスポンスに含める ──
  const failedMemberList = failedMembers.map(m => ({
    memberCode:   m.memberCode,
    memberName:   m.memberName,
    creditIds:    m.creditIds,     // DB登録値（生の値）
    normCreditIds: m.normCreditIds, // 正規化後値
  }));

  // ── 要件⑦: 成功者一覧（会員IDと名前付き）もレスポンスに含める ──
  const successMemberList = paidEntries.map(e => ({
    memberCode: e.member.memberCode,
    memberName: getMlmDisplayName(e.member.user.name, e.member.companyName),
    paidDate:   e.paidDate?.toISOString() ?? null,
    amount:     e.amount,
    resultText: e.resultText,
  }));

  console.log(`[import-direct] Credix: 完了 paid=${paidCount}件 failed=${failedCount}件 DB失敗者=${failedMembers.length}件 CSVunmatched=${unmatchedCsvIds.length}件`);

  return NextResponse.json({
    paidCount,
    failedCount,
    matchedCount:           matchedMap.size,
    unmatchedCount:         unmatchedCsvIds.length,
    effectivePaymentMethod: "credit_card",
    runId:                  autoShipRun?.id.toString(),
    // 要件⑦: 成功者・失敗者の詳細一覧
    successMembers:         successMemberList,
    failedMembers:          failedMemberList,  // 要件①③: DB検出の決済失敗者一覧（会員ID・氏名・登録決済ID付き）
    // ② CSV内で会員DBに照合できなかった決済ID一覧（MLM会員詳細への登録を促す）
    unmatchedCsvIds:        unmatchedCsvIds.map(u => ({ rawId: u.rawId, normId: u.normId })),
    warnings:               warnings.length > 0 ? warnings : undefined,
    _debug: {
      csvIdCount:       csvIdMap.size,
      memberCount:      allMlmMembers.length,
      cardIdMapSize:    cardIdToMember.size,
      matchedCount:     matchedMap.size,
      paidCount,
      failedCount,
      csvUnmatchedCount: unmatchedCsvIds.length,
      failedMemberCount: failedMembers.length,
      failedMembersNormIds: failedMembers.slice(0, 10).map(m => ({ code: m.memberCode, normIds: m.normCreditIds })),
    },
  }, { status: 200 });
}

// ══════════════════════════════════════════════════════════════
// 社内クレディックスCSV / 汎用CSV 処理
// ══════════════════════════════════════════════════════════════
async function processGenericCsvWithLines(
  dataLines: string[],
  header: string[],
  headerRaw: string[],
  targetMonth: string,
  paymentMethod: "credit_card" | "bank_transfer",
  isCredixInternalFormat: boolean,
  parseCsvLine: (line: string) => string[]
): Promise<Response> {
  let codeIdx   = -1;
  let resultIdx = -1;
  let dateIdx   = -1;
  let reasonIdx = -1;

  if (isCredixInternalFormat) {
    codeIdx  = header.findIndex(h => h === "会員コード" || h.includes("会員コード"));
    dateIdx  = header.findIndex(h => h.includes("処理年月") || h.includes("日時") || h.includes("date"));
    if (codeIdx === -1) codeIdx = 1;
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
        codeIdx = 0;
      } else if (dataLines.length > 0) {
        codeIdx = 0;
      } else {
        return NextResponse.json(
          { error: `CSVの形式が正しくありません（会員コード列が見つかりません）。検出されたヘッダー: [${headerRaw.join(", ")}]` },
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

    const recType = norm.slice(0, 5).map(b => String.fromCharCode(b)).join("").trim();
    if (recType.startsWith("19") || recType.startsWith("80") ||
        recType.trimStart().startsWith("9") || recType.trim() === "" ||
        !/^\d/.test(recType)) continue;

    if (norm.length < 90) continue;
    const acNumRaw = norm.slice(42, 50).map(b => String.fromCharCode(b)).join("").trim();
    if (!acNumRaw || !/^\d+$/.test(acNumRaw)) continue;
    const acNum = acNumRaw.replace(/^0+/, "") || "0";

    if (!resultMap.has(acNum)) {
      resultMap.set(acNum, { ok: true, paidDate: paidDateForAll });
    }
  }

  return await processGenericCsv(resultMap, targetMonth, "bank_transfer");
}

// ══════════════════════════════════════════════════════════════
// 汎用CSV: 会員コードで照合
// ══════════════════════════════════════════════════════════════
async function processGenericCsv(
  resultMap: Map<string, { ok: boolean; reason?: string; paidDate?: Date }>,
  targetMonth: string,
  paymentMethod: "credit_card" | "bank_transfer"
): Promise<Response> {

  const now = new Date();

  const autoshipMembers = await prisma.mlmMember.findMany({
    where: {
      autoshipEnabled: true,
      status: { not: "withdrawn" },
      paymentMethod: paymentMethod === "bank_transfer" ? "bank_transfer" : "credit_card",
    },
    select: {
      id: true,
      userId: true,
      memberCode: true,
      companyName: true,
      mobile: true,
      autoshipStartDate: true,
      autoshipStopDate: true,
      autoshipSuspendMonths: true,
      bankCode: true,
      bankName: true,
      branchCode: true,
      accountType: true,
      accountNumber: true,
      accountHolder: true,
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

  const paidCodes   = new Set<string>();
  const failedCodes = new Set<string>();
  const paidDates   = new Map<string, Date>();
  const failedReasons = new Map<string, string>();

  for (const [code, res] of resultMap) {
    if (res.ok) {
      paidCodes.add(code);
      if (res.paidDate) paidDates.set(code, res.paidDate);
    } else {
      failedCodes.add(code);
      if (res.reason) failedReasons.set(code, res.reason);
    }
  }

  type GenericMember = typeof autoshipMembers[0];
  const targetMembers = autoshipMembers.filter((m: GenericMember) =>
    paidCodes.has(m.memberCode) || failedCodes.has(m.memberCode)
  );

  const paidMembers   = targetMembers.filter((m: GenericMember) => paidCodes.has(m.memberCode));
  const failedMembers = targetMembers.filter((m: GenericMember) => failedCodes.has(m.memberCode));

  const totalAmount = paidMembers.reduce((sum: number) => sum + 16500, 0);

  let autoShipRun = await prisma.autoShipRun.findUnique({
    where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
  });

  if (!autoShipRun) {
    autoShipRun = await prisma.autoShipRun.create({
      data: {
        targetMonth,
        paymentMethod,
        status:      "completed",
        totalCount:  targetMembers.length,
        paidCount:   paidMembers.length,
        failedCount: failedMembers.length,
        totalAmount,
        importedAt:  now,
        completedAt: now,
      },
    });
  } else {
    await prisma.autoShipRun.update({
      where: { id: autoShipRun.id },
      data: {
        status:      "completed",
        paidCount:   paidMembers.length,
        failedCount: failedMembers.length,
        totalCount:  targetMembers.length,
        totalAmount,
        importedAt:  now,
        completedAt: now,
      },
    });
  }

  for (const m of targetMembers) {
    const isPaid   = paidCodes.has(m.memberCode);
    const paidDate = paidDates.get(m.memberCode) ?? now;
    const reason   = failedReasons.get(m.memberCode) ?? "決済失敗";
    try {
      await prisma.autoShipOrder.upsert({
        where: {
          autoShipRunId_mlmMemberId: {
            autoShipRunId: autoShipRun!.id,
            mlmMemberId:   m.id,
          },
        },
        create: {
          autoShipRunId: autoShipRun!.id,
          mlmMemberId:   m.id,
          targetMonth,
          paymentMethod,
          memberCode:    m.memberCode,
          memberName:    getMlmDisplayName(m.user.name, m.companyName),
          memberNameKana: m.user.nameKana ?? null,
          memberPhone:   m.mobile ?? m.user.phone ?? null,
          memberEmail:   m.user.email ?? null,
          memberPostal:  m.user.mlmRegistration?.deliveryPostalCode ?? m.user.postalCode ?? null,
          memberAddress: m.user.mlmRegistration?.deliveryAddress ?? m.user.address ?? null,
          unitPrice:     16500,
          totalAmount:   16500,
          points:        150,
          status:        isPaid ? "paid" : "failed",
          paidAt:        isPaid ? paidDate : null,
          failReason:    isPaid ? null : reason,
          bankCode:      m.bankCode ?? null,
          bankName:      m.bankName ?? null,
          accountType:   m.accountType ?? null,
          accountNumber: m.accountNumber ?? null,
          accountHolder: m.accountHolder ?? null,
        },
        update: {
          status:     isPaid ? "paid" : "failed",
          paidAt:     isPaid ? paidDate : null,
          failReason: isPaid ? null : reason,
        },
      });
    } catch (e) {
      console.error(`[import-direct] generic upsertエラー(${m.memberCode}):`, e);
    }
  }

  // 後処理: paid 会員に MlmPurchase / PointWallet / MlmMember.status 更新
  await Promise.allSettled(
    paidMembers.map(async (m: GenericMember) => {
      await updateMemberAfterPayment(m.userId, targetMonth, paidDates.get(m.memberCode) ?? now);
    })
  );

  return NextResponse.json({
    paidCount:             paidMembers.length,
    failedCount:           failedMembers.length,
    effectivePaymentMethod: paymentMethod,
    runId:                 autoShipRun?.id.toString(),
  }, { status: 200 });
}

// ══════════════════════════════════════════════════════════════
// DBからの自動取込（ファイルなし）
// ══════════════════════════════════════════════════════════════
async function processFromDatabase(
  targetMonth: string,
  paymentMethod: "credit_card" | "bank_transfer"
): Promise<Response> {
  const now = new Date();

  const autoshipMembers = await prisma.mlmMember.findMany({
    where: {
      autoshipEnabled: true,
      status: { not: "withdrawn" },
    },
    select: {
      id: true,
      userId: true,
      memberCode: true,
      companyName: true,
      mobile: true,
      paymentMethod: true,
      autoshipStartDate: true,
      autoshipStopDate: true,
      autoshipSuspendMonths: true,
      bankCode: true,
      bankName: true,
      branchCode: true,
      accountType: true,
      accountNumber: true,
      accountHolder: true,
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

  let autoShipRun = await prisma.autoShipRun.findUnique({
    where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
  });

  if (!autoShipRun) {
    autoShipRun = await prisma.autoShipRun.create({
      data: {
        targetMonth,
        paymentMethod,
        status:      "completed",
        totalCount:  autoshipMembers.length,
        paidCount:   autoshipMembers.length,
        failedCount: 0,
        totalAmount: autoshipMembers.length * 16500,
        importedAt:  now,
        completedAt: now,
      },
    });
  } else {
    await prisma.autoShipRun.update({
      where: { id: autoShipRun.id },
      data: {
        status:      "completed",
        paidCount:   autoshipMembers.length,
        failedCount: 0,
        totalCount:  autoshipMembers.length,
        totalAmount: autoshipMembers.length * 16500,
        importedAt:  now,
        completedAt: now,
      },
    });
  }

  for (const m of autoshipMembers) {
    try {
      await prisma.autoShipOrder.upsert({
        where: {
          autoShipRunId_mlmMemberId: {
            autoShipRunId: autoShipRun!.id,
            mlmMemberId:   m.id,
          },
        },
        create: {
          autoShipRunId: autoShipRun!.id,
          mlmMemberId:   m.id,
          targetMonth,
          paymentMethod: (m.paymentMethod as "credit_card" | "bank_transfer") ?? paymentMethod,
          memberCode:    m.memberCode,
          memberName:    getMlmDisplayName(m.user.name, m.companyName),
          memberNameKana: m.user.nameKana ?? null,
          memberPhone:   m.mobile ?? m.user.phone ?? null,
          memberEmail:   m.user.email ?? null,
          memberPostal:  m.user.mlmRegistration?.deliveryPostalCode ?? m.user.postalCode ?? null,
          memberAddress: m.user.mlmRegistration?.deliveryAddress ?? m.user.address ?? null,
          unitPrice:     16500,
          totalAmount:   16500,
          points:        150,
          status:        "paid",
          paidAt:        now,
        },
        update: {
          status: "paid",
          paidAt: now,
        },
      });
    } catch (e) {
      console.error(`[import-direct] DB自動取込 upsertエラー(${m.memberCode}):`, e);
    }
  }

  type DbMember = typeof autoshipMembers[0];
  await Promise.allSettled(
    autoshipMembers.map(async (m: DbMember) => {
      await updateMemberAfterPayment(m.userId, targetMonth, now);
    })
  );

  return NextResponse.json({
    paidCount:  autoshipMembers.length,
    failedCount: 0,
    runId:      autoShipRun?.id.toString(),
  }, { status: 200 });
}

// ══════════════════════════════════════════════════════════════
// 後処理: MlmPurchase / PointWallet / MlmMember.status 更新
// ══════════════════════════════════════════════════════════════
async function updateMemberAfterPayment(
  userId: bigint,
  targetMonth: string,
  paidDate: Date
): Promise<void> {
  const AUTOSHIP_BASE = 15000;
  const AUTOSHIP_RATE = 0.05;
  const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE); // 750pt

  try {
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      select: {
        id: true,
        memberCode: true,
        companyName: true,
        user: {
          select: {
            name: true,
            mlmRegistration: { select: { deliveryPostalCode: true, deliveryAddress: true } },
            postalCode: true,
            address: true,
          },
        },
      },
    });
    if (!mlmMember) return;

    // MlmPurchase 登録（重複防止）
    const existingPurchase = await prisma.mlmPurchase.findFirst({
      where: {
        mlmMemberId:   mlmMember.id,
        purchaseMonth: targetMonth,
        productCode:   "2000",
      },
    });
    if (!existingPurchase) {
      await prisma.mlmPurchase.create({
        data: {
          mlmMemberId:    mlmMember.id,
          productCode:    "2000",
          productName:    "VIOLA Pure 翠彩-SUMISAI-",
          quantity:       1,
          unitPrice:      16500,
          points:         150,
          totalPoints:    150,
          purchaseStatus: "autoship",
          purchaseMonth:  targetMonth,
          purchasedAt:    paidDate,
        },
      });
    }

    // MlmMember.status = active + savingsPoints 更新
    await prisma.mlmMember.update({
      where: { id: mlmMember.id },
      data: {
        status: "active",
        savingsPoints: { increment: savingsPoints },
      },
    });

    // PointWallet 付与
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
    }
  } catch (e) {
    console.error(`[import-direct] updateMemberAfterPayment エラー(userId=${userId}):`, e);
  }
}
