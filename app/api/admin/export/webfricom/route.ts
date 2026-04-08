import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * ウェブフリコム総合振込データ（固定長120文字/行）
 * フォーマット仕様:
 * - ヘッダー行: 委託者コード (14桁) + 空白 (90桁) + 振込指定日 (8桁) + 空白 (8桁)
 * - データ行: 銀行コード (5桁) + 支店コード (3桁) + 預金種目 (1桁) + 口座番号 (7桁) + 受取人名 (カナ30桁) + 金額 (10桁) + その他
 * - トレーラ行: 件数合計 + 金額合計
 * - エンド行: "9" + 空白
 */

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM

  if (!month) {
    return new Response("対象月を指定してください", { status: 400 });
  }

  // ボーナス計算結果を取得（確定済みのみ）
  const bonusRun = await prisma.bonusRun.findFirst({
    where: { 
      bonusMonth: month,
      status: "confirmed", // 確定済みのみ
    },
    include: {
      results: {
        where: {
          totalBonus: { gt: 0 }, // ボーナスがある人のみ
        },
        include: {
          mlmMember: {
            include: {
              user: {
                include: {
                  mlmRegistration: true,
                },
              },
            },
          },
        },
        orderBy: { mlmMemberId: "asc" },
      },
    },
  });

  if (!bonusRun) {
    return new Response("指定された月の確定済みボーナス計算結果が見つかりません", { status: 404 });
  }

  // 口座情報がない会員を除外
  const validResults = bonusRun.results.filter(result => {
    const reg = result.mlmMember.user.mlmRegistration;
    return reg && reg.bankAccountNumber && reg.bankAccountHolder;
  });

  if (validResults.length === 0) {
    return new Response("振込対象の会員がいません", { status: 400 });
  }

  const lines: string[] = [];

  // ヘッダー行（1行目）
  const委託者コード = "12100000000000"; // 14桁固定
  const振込指定日 = "03250000"; // MMDDYYYY形式（例: 03250000 = 3月25日）
  const headerLine = 委託者コード.padEnd(104, " ") + 振込指定日 + "        "; // 120文字
  lines.push(headerLine);

  let totalCount = 0;
  let totalAmount = 0;

  // データ行（2行目〜）
  for (const result of validResults) {
    const reg = result.mlmMember.user.mlmRegistration;
    if (!reg) continue;

    // 銀行コード・支店コード（未実装の場合は "29900" と "328" をデフォルト）
    const bankCode = "29900".padStart(5, "0"); // 5桁（例: 29900 = ゆうちょ銀行）
    const branchCode = "328".padStart(3, " "); // 3桁（右詰め、左空白）

    // 預金種目: 1=普通, 2=当座, 3=貯蓄
    let accountType = "1";
    if (reg.bankAccountType === "当座") accountType = "2";
    if (reg.bankAccountType === "貯蓄") accountType = "3";

    // 口座番号（7桁右詰め）
    const accountNumber = (reg.bankAccountNumber || "").padStart(7, "0");

    // 受取人名（カナ30桁、左詰め右空白）
    const accountHolder = (reg.bankAccountHolder || "").padEnd(30, " ").slice(0, 30);

    // 金額（10桁右詰め、1000円単位なので末尾3桁は"000"）
    const bonusAmount = Math.floor(result.totalBonus); // 円単位
    const amountStr = String(bonusAmount).padStart(10, "0");

    // 新規コード（常に "1"）
    const newCode = "1";

    // 顧客コード（会員コード、8桁右詰め）
    const memberCode = result.mlmMember.memberCode.replace(/-/g, "").slice(0, 8).padStart(8, "0");

    // ダミーコード（常に "0"）
    const dummyCode = "0";

    // EDI情報（未使用の場合は空白）
    const ediInfo = "".padEnd(20, " ");

    // 振込依頼人名（未使用の場合は空白）
    const clientName = "".padEnd(30, " ");

    // データ行を構築（120文字）
    const dataLine = 
      bankCode + 
      "               " + // 15桁空白
      branchCode + 
      "                   " + // 19桁空白
      memberCode +
      accountHolder.replace(/[^\u0020-\u007E\uFF61-\uFF9F\u30A1-\u30F6\u3041-\u3096]/g, " ") + // 半角カナ・全角カナのみ
      "      " + // 6桁空白
      amountStr + 
      newCode +
      "000000000000" + // 12桁ゼロ
      memberCode.slice(-7) + // 会員コード下7桁
      dummyCode +
      newCode +
      "0        ";

    lines.push(dataLine.slice(0, 120).padEnd(120, " "));

    totalCount++;
    totalAmount += bonusAmount;
  }

  // トレーラ行（最終行 - 1）
  const trailerLine = 
    "8" + 
    String(totalCount).padStart(6, "0") + 
    String(totalAmount).padStart(12, "0") + 
    "".padEnd(101, " ");
  lines.push(trailerLine);

  // エンド行（最終行）
  const endLine = "9".padEnd(120, " ");
  lines.push(endLine);

  // Shift_JIS エンコーディング（ブラウザでは自動変換）
  const text = lines.join("\r\n");

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=shift_jis",
      "Content-Disposition": `attachment; filename="${month.replace("-", "")}.txt"`,
    },
  });
}
