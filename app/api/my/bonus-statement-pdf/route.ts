export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, UNILEVEL_RATES } from "@/lib/mlm-bonus";

function yen(n: number) {
  return `¥${(n || 0).toLocaleString()}`;
}

/**
 * GET /api/my/bonus-statement-pdf?month=2025-03
 * 指定月のボーナス明細をHTMLで返す（ブラウザ印刷→PDF保存で日本語正常表示）
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = BigInt(session.user.id ?? "0");
    const month = req.nextUrl.searchParams.get("month");
    if (!month) {
      return NextResponse.json({ error: "month is required (YYYY-MM)" }, { status: 400 });
    }

    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!mlmMember) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    // isPublished:true のもののみ取得（管理側で公開済みのものだけ）
    const result = await prisma.bonusResult.findFirst({
      where: {
        mlmMemberId: mlmMember.id,
        bonusMonth: month,
        bonusRun: { status: "confirmed" },
        isPublished: true,
      },
      include: {
        bonusRun: {
          select: { bonusMonth: true, confirmedAt: true, paymentAdjustmentRate: true, note: true },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: "指定月のボーナス明細が見つかりません（未公開または存在しない可能性があります）" }, { status: 404 });
    }

    const rates = UNILEVEL_RATES[result.achievedLevel] ?? UNILEVEL_RATES[0];
    const detail = result.unilevelDetail as Record<string, number> | null;
    const unilevelDetail = detail
      ? Object.entries(detail).map(([depth, amount]) => ({
          depth: Number(depth),
          amount,
          rate: rates[Number(depth) - 1] ?? 0,
        }))
      : [];

    const memberName = mlmMember.companyName || mlmMember.user.name;
    const [year, mon] = month.split("-");
    const confirmedDate = result.bonusRun.confirmedAt
      ? new Date(result.bonusRun.confirmedAt).toLocaleDateString("ja-JP")
      : "—";
    const issueDate = new Date().toLocaleDateString("ja-JP");
    const note = result.bonusRun?.note || "";

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ボーナス明細書 ${month} ${memberName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans JP', 'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      font-size: 10pt;
      color: #1f2937;
      background: #f3f4f6;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
    }
    .header {
      background: #0a1628;
      color: #fff;
      padding: 14px 24px 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-gold { color: #c9a84c; font-size: 16pt; font-weight: 700; }
    .header-sub  { color: rgba(255,255,255,0.7); font-size: 9pt; margin-top: 2px; }
    .header-right { text-align: right; font-size: 9pt; color: rgba(255,255,255,0.6); }

    .title-bar {
      background: #0d1e38;
      color: #e8c96a;
      text-align: center;
      padding: 10px 24px 8px;
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: 4px;
    }
    .title-sub {
      text-align: center;
      padding: 4px 24px 10px;
      font-size: 9pt;
      color: rgba(255,255,255,0.5);
      background: #0d1e38;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      padding: 12px 24px;
      font-size: 9pt;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .info-item { display: flex; gap: 6px; }
    .info-label { color: #6b7280; min-width: 72px; flex-shrink: 0; }
    .info-value { color: #111827; font-weight: 600; }

    .section {
      margin: 12px 20px 0;
    }
    .section-title {
      background: #0d1e38;
      color: #e8c96a;
      padding: 5px 10px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 0;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    table.data-table tr:nth-child(even) { background: #f8f9fa; }
    table.data-table td {
      padding: 5px 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    table.data-table td.label { color: #6b7280; }
    table.data-table td.amount { text-align: right; color: #111827; font-weight: 500; }
    table.data-table td.total  { text-align: right; font-weight: 700; font-size: 10pt; color: #c9a84c; }
    table.data-table td.pay    { text-align: right; font-weight: 700; font-size: 12pt; color: #1d4ed8; }

    .payment-box {
      margin: 12px 20px 0;
      background: #eff6ff;
      border: 2px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 16px;
      text-align: right;
    }
    .payment-label { font-size: 9pt; color: #3b82f6; }
    .payment-value { font-size: 20pt; font-weight: 700; color: #1d4ed8; }

    .unilevel-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    .unilevel-table th {
      background: #1e293b;
      color: #fff;
      padding: 5px 10px;
      text-align: left;
    }
    .unilevel-table th.right { text-align: right; }
    .unilevel-table td { padding: 5px 10px; border-bottom: 1px solid #e5e7eb; }
    .unilevel-table td.right { text-align: right; }

    .note-box {
      margin: 12px 20px 0;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 9pt;
      color: #4b5563;
      background: #f9fafb;
    }

    .footer {
      margin: 16px 20px 0;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      text-align: right;
    }

    .print-bar {
      background: #0a1628;
      padding: 10px 24px;
      text-align: center;
    }
    .print-btn {
      background: #c9a84c;
      color: #0a1628;
      border: none;
      border-radius: 6px;
      padding: 8px 28px;
      font-size: 10pt;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .print-btn:hover { background: #e8c96a; }

    @media print {
      body { background: #fff; }
      .print-bar { display: none; }
      .page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">🖨 PDFとして保存</button>
  </div>
  <div class="page">
    <!-- ヘッダー -->
    <div class="header">
      <div>
        <div class="header-gold">VIOLA Pure</div>
        <div class="header-sub">Bonus Statement / ボーナス明細書</div>
      </div>
      <div class="header-right">発行日：${issueDate}</div>
    </div>

    <!-- タイトル -->
    <div class="title-bar">ボーナス明細書</div>
    <div class="title-sub">${year}年${parseInt(mon)}月度</div>

    <!-- 会員情報 -->
    <div class="info-grid">
      <div class="info-item"><span class="info-label">会員コード</span><span class="info-value">${mlmMember.memberCode}</span></div>
      <div class="info-item"><span class="info-label">氏名</span><span class="info-value">${memberName}</span></div>
      <div class="info-item"><span class="info-label">対象月</span><span class="info-value">${year}年${parseInt(mon)}月度</span></div>
      <div class="info-item"><span class="info-label">確定日</span><span class="info-value">${confirmedDate}</span></div>
      <div class="info-item"><span class="info-label">判定レベル</span><span class="info-value">${LEVEL_LABELS[result.achievedLevel] ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">アクティブ</span><span class="info-value">${result.isActive ? "✓ 達成" : "未達成"}</span></div>
    </div>

    <!-- ボーナス内訳 -->
    <div class="section">
      <div class="section-title">ボーナス内訳</div>
      <table class="data-table">
        <tr><td class="label">ダイレクトボーナス</td><td class="amount">${yen(result.directBonus ?? 0)}</td></tr>
        <tr><td class="label">ユニレベルボーナス</td><td class="amount">${yen(result.unilevelBonus ?? 0)}</td></tr>
        <tr><td class="label">組織構築ボーナス</td><td class="amount">${yen(result.structureBonus ?? 0)}</td></tr>
        <tr><td class="label">貯金ボーナス</td><td class="amount">${yen(result.savingsBonus ?? 0)}</td></tr>
        <tr><td class="label">繰越金</td><td class="amount">${yen(result.carryoverAmount ?? 0)}</td></tr>
        <tr><td class="label">調整金</td><td class="amount">${yen(result.adjustmentAmount ?? 0)}</td></tr>
        <tr><td class="label">別口座</td><td class="amount">${yen(result.otherPositionAmount ?? 0)}</td></tr>
        <tr><td class="label" style="font-weight:600;">支払調整前取得額</td><td class="total">${yen(result.amountBeforeAdjustment ?? 0)}</td></tr>
      </table>
    </div>

    <!-- 控除内訳 -->
    <div class="section">
      <div class="section-title">控除内訳</div>
      <table class="data-table">
        <tr><td class="label">支払調整額（${result.bonusRun?.paymentAdjustmentRate ?? 0}%）</td><td class="amount">−${yen(result.paymentAdjustmentAmount ?? 0)}</td></tr>
        <tr><td class="label">消費税（10%）</td><td class="amount">−${yen(result.consumptionTax ?? 0)}</td></tr>
        <tr><td class="label">源泉所得税（10%）</td><td class="amount">−${yen(result.withholdingTax ?? 0)}</td></tr>
        <tr><td class="label">過不足金</td><td class="amount">−${yen(result.shortageAmount ?? 0)}</td></tr>
        <tr><td class="label">事務手数料</td><td class="amount">−${yen(result.serviceFee ?? 0)}</td></tr>
      </table>
    </div>

    <!-- 支払い金額 -->
    <div class="payment-box">
      <div class="payment-label">お支払い金額</div>
      <div class="payment-value">${yen(result.paymentAmount ?? 0)}</div>
    </div>

    ${unilevelDetail.length > 0 ? `
    <!-- ユニレベル段数内訳 -->
    <div class="section" style="margin-top:12px;">
      <div class="section-title">ユニレベル段数別内訳</div>
      <table class="unilevel-table">
        <thead>
          <tr><th>段数</th><th class="right">算出率</th><th class="right">金額</th></tr>
        </thead>
        <tbody>
          ${unilevelDetail.map(d => `
          <tr>
            <td>${d.depth}段目</td>
            <td class="right">${d.rate}%</td>
            <td class="right">${yen(d.amount)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : ""}

    ${note ? `
    <!-- 備考 -->
    <div class="note-box">
      <strong>備考：</strong>${note}
    </div>` : ""}

    <!-- フッター -->
    <div class="footer">
      <div>CLAIRホールディングス株式会社</div>
      <div>〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F　TEL：019-681-3667</div>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

  } catch (error) {
    console.error("Bonus statement HTML error:", error);
    return NextResponse.json({ error: "生成に失敗しました" }, { status: 500 });
  }
}
