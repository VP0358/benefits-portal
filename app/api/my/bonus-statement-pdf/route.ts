export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, UNILEVEL_RATES } from "@/lib/mlm-bonus";
import jsPDF from "jspdf";
import "jspdf-autotable";

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

/**
 * GET /api/my/bonus-statement-pdf?month=2025-03
 * 指定月のボーナス明細PDFを生成
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

    const result = await prisma.bonusResult.findFirst({
      where: {
        mlmMemberId: mlmMember.id,
        bonusMonth: month,
        bonusRun: { status: "confirmed" },
      },
      include: {
        bonusRun: { select: { bonusMonth: true, confirmedAt: true } },
      },
    });

    if (!result) {
      return NextResponse.json({ error: "指定月のボーナス明細が見つかりません" }, { status: 404 });
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

    // ── PDF生成 ──────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // フォント（英字のみ – 日本語はbase64フォント埋め込みが必要だが簡易版で対応）
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;

    // ヘッダー帯
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, pageW, 28, "F");

    doc.setFontSize(16);
    doc.setTextColor(201, 168, 76);
    doc.text("VIOLA Pure", margin, 12);

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Bonus Statement / \u30DC\u30FC\u30CA\u30B9\u660E\u7D30\u66F8", margin, 19);

    doc.setFontSize(10);
    doc.setTextColor(232, 201, 106);
    doc.text(`${month}`, pageW - margin, 19, { align: "right" });

    // 会員情報
    let y = 36;
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`\u4F1A\u54E1\u540D: ${mlmMember.user.name}`, margin, y);
    doc.text(`\u4F1A\u54E1\u30B3\u30FC\u30C9: ${mlmMember.memberCode}`, pageW - margin, y, { align: "right" });
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const confirmedText = result.bonusRun.confirmedAt
      ? `\u78BA\u5B9A\u65E5: ${new Date(result.bonusRun.confirmedAt).toLocaleDateString("ja-JP")}`
      : "\u672A\u78BA\u5B9A";
    doc.text(confirmedText, margin, y);
    doc.text(
      `\u30EC\u30D9\u30EB: ${LEVEL_LABELS[result.achievedLevel] ?? "—"}  /  \u30A2\u30AF\u30C6\u30A3\u30D6: ${result.isActive ? "Yes" : "No"}`,
      pageW - margin, y, { align: "right" }
    );
    y += 8;

    // ── セクション: ボーナス種別 ──
    doc.setFontSize(9);
    doc.setFillColor(201, 168, 76);
    doc.rect(margin, y, contentW, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("\u30DC\u30FC\u30CA\u30B9\u7A2E\u5225", margin + 2, y + 4);
    y += 8;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["\u9805\u76EE", "\u9707\u984D"]],
      body: [
        ["\u30C0\u30A4\u30EC\u30AF\u30C8B", yen(result.directBonus)],
        ["\u30E6\u30CB\u30EC\u30D9\u30EBB", yen(result.unilevelBonus)],
        ["\u30E9\u30F3\u30AF\u30A2\u30C3\u30D7B", yen(result.rankUpBonus)],
        ["\u30B7\u30A7\u30A2B", yen(result.shareBonus)],
        ["\u7D44\u7E54\u69CB\u7BC9B", yen(result.structureBonus)],
        ["\u8CAF\u91D1B", yen(result.savingsBonus)],
        ["\u7E70\u8D8A\u91D1", yen(result.carryoverAmount)],
        ["\u8ABF\u6574\u91D1", yen(result.adjustmentAmount)],
        ["\u4ED6\u30DD\u30B8\u30B7\u30E7\u30F3", yen(result.otherPositionAmount)],
        ["\u7DCF\u652F\u6255\u5831\u9175", yen(result.totalBonus)],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 50, 80], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;

    // ── セクション: 支払い計算 ──
    doc.setFillColor(10, 22, 40);
    doc.rect(margin, y, contentW, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("\u652F\u6255\u3044\u8A08\u7B97", margin + 2, y + 4);
    y += 8;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["\u9805\u76EE", "\u9707\u984D"]],
      body: [
        ["\u652F\u6255\u8ABF\u6574\u524D\u53D6\u5F97\u984D", yen(result.amountBeforeAdjustment)],
        ["\u652F\u6255\u8ABF\u6574\u7387", result.paymentAdjustmentRate != null ? `${result.paymentAdjustmentRate}%` : "—"],
        ["\u652F\u6255\u8ABF\u6574\u984D", yen(result.paymentAdjustmentAmount)],
        ["\u53D6\u5F97\u984D\uFF08\u8ABF\u6574\u5F8C\uFF09", yen(result.finalAmount)],
        ["10%\u6D88\u8CBB\u7A0E\uFF08\u5185\u7A0E\uFF09", yen(result.consumptionTax)],
        ["\u6E90\u6CC9\u6240\u5F97\u7A0E", yen(result.withholdingTax)],
        ["\u904E\u4E0D\u8DB3\u91D1", yen(result.shortageAmount)],
        ["\u4ED6\u30DD\u30B8\u30B7\u30E7\u30F3\u904E\u4E0D\u8DB3", yen(result.otherPositionShortage)],
        ["\u4E8B\u52D9\u624B\u6570\u6599", yen(result.serviceFee)],
        ["\u652F\u6255\u984D", yen(result.paymentAmount)],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 50, 80], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;

    // ── セクション: 組織データ ──
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(51, 65, 85);
    doc.rect(margin, y, contentW, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("\u7D44\u7E54\u30C7\u30FC\u30BF", margin + 2, y + 4);
    y += 8;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["\u9805\u76EE", "\u5024"]],
      body: [
        ["\u30B0\u30EB\u30FC\u30D7ACT\u6570", `${result.groupActiveCount}\u540D`],
        ["\u30B0\u30EB\u30FC\u30D7pt", `${result.groupPoints.toLocaleString()}pt`],
        ["\u6700\u5C0F\u7CFB\u5217pt", `${result.minLinePoints.toLocaleString()}pt`],
        ["\u7CFB\u5217\u6570", `${result.lineCount}`],
        ["\u81EA\u5DF1\u8CFC\u5165pt", `${result.selfPurchasePoints}pt`],
        ["\u76F4\u7D39\u4ECBACTpt", `${result.directActiveCount}\u540D`],
        ["\u8CB4\u91D1pt\uFF08\u7D2F\u8A08\uFF09", `${result.savingsPoints.toLocaleString()}pt`],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 50, 80], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;

    // ── ユニレベル段数内訳 ──
    if (unilevelDetail.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(80, 60, 20);
      doc.rect(margin, y, contentW, 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.text("\u30E6\u30CB\u30EC\u30D9\u30EB\u6BB5\u6570\u5225", margin + 2, y + 4);
      y += 8;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [["\u6BB5", "\u7B97\u51FA\u7387", "\u91D1\u984D"]],
        body: unilevelDetail.map((d) => [
          `${d.depth}\u6BB5\u76EE`,
          `${d.rate}%`,
          yen(d.amount),
        ]),
        theme: "striped",
        headStyles: { fillColor: [80, 60, 20], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40, halign: "right" }, 2: { halign: "right" } },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // フッター
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `VIOLA Pure \u798F\u5229\u539A\u751F\u30DD\u30FC\u30BF\u30EB  |  ${month} \u30DC\u30FC\u30CA\u30B9\u660E\u7D30  |  ${i}/${totalPages}`,
        pageW / 2,
        297 - 8,
        { align: "center" }
      );
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bonus-${month}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (e) {
    console.error("bonus-statement-pdf error:", e);
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 });
  }
}
