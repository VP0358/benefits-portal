// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-reports/statement-pdf?bonusMonth=2026-02&memberCode=XXXX
 * ボーナス明細をHTMLとして返す（印刷/PDF用）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");
  const memberCode = searchParams.get("memberCode");

  if (!bonusMonth || !memberCode) {
    return NextResponse.json({ error: "bonusMonth and memberCode required" }, { status: 400 });
  }

  try {
    // 会員を検索
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { memberCode },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // ボーナス結果を取得
    const result = await prisma.bonusResult.findFirst({
      where: {
        mlmMemberId: mlmMember.id,
        bonusMonth,
      },
      include: {
        bonusRun: {
          select: { note: true, paymentAdjustmentRate: true },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: "Bonus result not found" }, { status: 404 });
    }

    const memberName = mlmMember.companyName || mlmMember.user.name;
    const [year, month] = bonusMonth.split("-");
    const note = result.bonusRun?.note || "";

    const yen = (n: number) => `¥${(n || 0).toLocaleString("ja-JP")}`;

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ボーナス明細書 ${bonusMonth} ${memberName}</title>
<style>
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; font-size: 11pt; margin: 0; padding: 20px; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 16pt; margin: 0 0 4px; }
  .header p { margin: 2px 0; color: #555; font-size: 10pt; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 10pt; }
  .info-item { display: flex; gap: 8px; }
  .info-label { color: #666; min-width: 80px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #2d3748; color: white; padding: 8px; text-align: left; font-size: 10pt; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
  td.amount { text-align: right; }
  td.total { text-align: right; font-weight: bold; font-size: 11pt; }
  .section-title { font-weight: bold; color: #4a5568; margin: 12px 0 6px; font-size: 11pt; border-left: 3px solid #667eea; padding-left: 8px; }
  .note-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f7fafc; font-size: 10pt; color: #555; margin-bottom: 16px; }
  .payment-highlight { background: #ebf8ff; border-radius: 6px; padding: 10px; text-align: right; margin: 12px 0; }
  .payment-highlight .label { color: #2b6cb0; font-size: 10pt; }
  .payment-highlight .value { font-size: 18pt; font-weight: bold; color: #2b6cb0; }
  @media print { body { padding: 0; } button { display: none; } }
</style>
</head>
<body>
<div class="header">
  <h1>ボーナス明細書</h1>
  <p>${year}年${parseInt(month)}月度</p>
</div>

<div class="info-grid">
  <div class="info-item"><span class="info-label">会員コード:</span><span>${memberCode}</span></div>
  <div class="info-item"><span class="info-label">氏名:</span><span>${memberName}</span></div>
  <div class="info-item"><span class="info-label">発行日:</span><span>${new Date().toLocaleDateString("ja-JP")}</span></div>
  <div class="info-item"><span class="info-label">対象月:</span><span>${year}年${parseInt(month)}月度</span></div>
</div>

<div class="section-title">ボーナス内訳</div>
<table>
  <tr><th>項目</th><th style="text-align:right">金額</th></tr>
  <tr><td>ダイレクトボーナス</td><td class="amount">${yen(result.directBonus ?? 0)}</td></tr>
  <tr><td>ユニレベルボーナス</td><td class="amount">${yen(result.unilevelBonus ?? 0)}</td></tr>
  <tr><td>組織構築ボーナス</td><td class="amount">${yen(result.structureBonus ?? 0)}</td></tr>
  <tr><td>貯金ボーナス</td><td class="amount">${yen(result.savingsBonus ?? 0)}</td></tr>
  <tr><td>繰越金</td><td class="amount">${yen(result.carryoverAmount ?? 0)}</td></tr>
  <tr><td>調整金</td><td class="amount">${yen(result.adjustmentAmount ?? 0)}</td></tr>
  <tr><td>別口座</td><td class="amount">${yen(result.otherPositionAmount ?? 0)}</td></tr>
  <tr><td><strong>支払調整前取得額</strong></td><td class="total">${yen(result.amountBeforeAdjustment ?? 0)}</td></tr>
</table>

<div class="section-title">控除内訳</div>
<table>
  <tr><th>項目</th><th style="text-align:right">金額</th></tr>
  <tr><td>支払調整額（${result.bonusRun?.paymentAdjustmentRate ?? 0}%）</td><td class="amount">−${yen(result.paymentAdjustmentAmount ?? 0)}</td></tr>
  <tr><td>消費税（10%）</td><td class="amount">−${yen(result.consumptionTax ?? 0)}</td></tr>
  <tr><td>源泉所得税（10%）</td><td class="amount">−${yen(result.withholdingTax ?? 0)}</td></tr>
  <tr><td>過不足金</td><td class="amount">−${yen(result.shortageAmount ?? 0)}</td></tr>
  <tr><td>事務手数料</td><td class="amount">−${yen(result.serviceFee ?? 0)}</td></tr>
</table>

<div class="payment-highlight">
  <div class="label">お支払い金額</div>
  <div class="value">${yen(result.paymentAmount ?? 0)}</div>
</div>

${note ? `<div class="section-title">備考</div><div class="note-box">${note}</div>` : ""}

<div style="text-align:center; margin-top: 24px; padding: 16px; background: #f7fafc; border-top: 1px solid #e2e8f0;">
  <p style="font-size: 9pt; color: #718096; margin-bottom: 10px;">
    ブラウザの印刷機能（Ctrl+P / Cmd+P）を使用してPDF保存ができます
  </p>
  <button onclick="window.print()" style="padding: 10px 28px; background: #2b6cb0; color: white; border: none; border-radius: 6px; font-size: 11pt; cursor: pointer; font-family: inherit;">
    📄 PDFとして保存
  </button>
</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating statement PDF:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
