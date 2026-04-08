import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";

/**
 * POST /api/admin/pdf/payment-statement
 * 支払調書PDF作成（A4を4分割、A6フォーマット）
 * 
 * Body: {
 *   bonusMonth: "2026-02",
 *   memberCodes: ["M001", "M002", ...]
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusMonth, memberCodes } = body;

    if (!bonusMonth || !Array.isArray(memberCodes)) {
      return NextResponse.json(
        { error: "bonusMonth and memberCodes array required" },
        { status: 400 }
      );
    }

    // ボーナス結果を取得
    const results = await prisma.bonusResult.findMany({
      where: {
        bonusMonth,
        mlmMember: {
          memberCode: {
            in: memberCodes,
          },
        },
      },
      include: {
        mlmMember: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { mlmMember: { memberCode: "asc" } },
    });

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No payment records found" },
        { status: 404 }
      );
    }

    // PDFを作成（A4サイズ）
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // A4を4分割してA6サイズの支払調書を配置
    // A4: 210mm x 297mm
    // A6: 105mm x 148.5mm (A4の1/4)
    const a6Width = 105;
    const a6Height = 148.5;

    let pageCount = 0;
    let positionOnPage = 0;

    results.forEach((result, index) => {
      // 4枚ごとに新しいページを追加
      if (index > 0 && index % 4 === 0) {
        pdf.addPage();
        positionOnPage = 0;
      }

      // A6サイズの配置位置を計算
      const col = positionOnPage % 2; // 0: 左, 1: 右
      const row = Math.floor(positionOnPage / 2); // 0: 上, 1: 下
      const x = col * a6Width;
      const y = row * a6Height;

      // 支払調書の内容を描画
      pdf.setFontSize(16);
      pdf.text("報酬支払調書", x + 52.5, y + 20, { align: "center" });

      pdf.setFontSize(10);
      const year = bonusMonth.split("-")[0];
      const month = bonusMonth.split("-")[1];
      pdf.text(`${year}年${month}月度`, x + 52.5, y + 30, { align: "center" });

      pdf.setFontSize(9);
      pdf.text(`会員ID: ${result.mlmMember.memberCode}`, x + 10, y + 45);
      pdf.text(`氏名: ${result.mlmMember.user.name}`, x + 10, y + 52);
      
      pdf.text(`支払金額: ¥${result.paymentAmount.toLocaleString()}`, x + 10, y + 65);
      pdf.text(`源泉徴収税額: ¥${Math.abs(result.withholdingTax).toLocaleString()}`, x + 10, y + 72);

      // 区切り線
      pdf.line(x + 10, y + 80, x + 95, y + 80);

      // ボーナス内訳
      pdf.setFontSize(8);
      pdf.text("ボーナス内訳:", x + 10, y + 88);
      pdf.text(`ダイレクト: ¥${result.directBonus.toLocaleString()}`, x + 15, y + 94);
      pdf.text(`ユニレベル: ¥${result.unilevelBonus.toLocaleString()}`, x + 15, y + 100);
      pdf.text(`組織構築: ¥${result.structureBonus.toLocaleString()}`, x + 15, y + 106);
      pdf.text(`貯金: ¥${result.savingsBonus.toLocaleString()}`, x + 15, y + 112);

      // 会社情報
      pdf.setFontSize(7);
      pdf.text("CLAIRホールディングス株式会社", x + 10, y + 130);
      pdf.text("〒020-0026 岩手県盛岡市開運橋通5-6", x + 10, y + 135);
      pdf.text("第五菱和ビル5F", x + 10, y + 139);

      positionOnPage++;
    });

    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="payment_statement_${bonusMonth}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating payment statement PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate payment statement PDF" },
      { status: 500 }
    );
  }
}
