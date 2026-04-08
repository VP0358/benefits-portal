// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * GET /api/admin/pdf/invoice?orderId=123
 * 注文の納品書PDFを生成してダウンロード
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((session as any)?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // 注文情報を取得
    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      include: {
        user: {
          include: {
            mlmMember: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // PDF生成
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const user = order.user;
    const memberCode = user.mlmMember?.[0]?.memberCode || "-";
    const orderDate = new Date(order.createdAt).toLocaleDateString('ja-JP');
    const orderMonth = new Date(order.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

    // 会社情報
    const companyName = "CLAIRホールディングス株式会社";
    const companyAddress = "〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F";
    const companyTel = "TEL：019-681-3667";
    const companyFax = "FAX：050-3385-7788";
    const companyRegNo = "登録番号 T4400001016001";

    // ヘッダー（郵便番号・住所）
    doc.setFontSize(10);
    doc.text(`〒${user.postalCode || ""}`, 20, 20);
    doc.text(user.address || "", 20, 26);

    // 宛名
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${user.name || ""} 様`, 20, 36);

    // ID番号（右上）
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`ID番号　${memberCode}`, 140, 36);

    // 合計金額（右上、大きく）
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`合計金額(税込)`, 140, 46);
    doc.setFontSize(20);
    doc.text(`¥${order.totalAmount.toLocaleString()}`, 140, 54);

    // タイトル
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("納品書", 90, 68);

    // 交付番号
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`交付No.${order.id.toString()}`, 140, 68);

    // 本文
    doc.setFontSize(10);
    doc.text("ご購入いただき誠にありがとうございます。下記の通り納品致します。", 20, 78);

    // ご注文者情報
    let y = 90;
    doc.setFont("helvetica", "bold");
    doc.text("ご注文者", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${user.name || ""} 様`, 20, y + 5);
    y += 15;

    // 取引情報
    doc.text(`ご注文者ＩＤ`, 20, y);
    doc.text(memberCode, 60, y);
    y += 6;
    doc.text(`ご注文者対象月`, 20, y);
    doc.text(orderMonth, 60, y);
    y += 6;
    doc.text(`取引年月日`, 20, y);
    doc.text(orderDate, 60, y);
    y += 10;

    // 商品明細テーブル
    doc.setFont("helvetica", "bold");
    doc.text("商品", 20, y);
    doc.text("単価", 100, y);
    doc.text("数量", 130, y);
    doc.text("金額", 160, y);
    y += 5;
    doc.line(20, y, 190, y); // 横線
    y += 5;

    doc.setFont("helvetica", "normal");

    let subtotal8 = 0; // 8%対象
    let subtotal10 = 0; // 10%対象
    const shippingFee = 880; // 出荷事務手数料

    // 商品行
    order.items.forEach((item) => {
      const productName = item.product?.name || item.productName;
      const unitPrice = item.unitPrice;
      const quantity = item.quantity;
      const amount = unitPrice * quantity;

      // 税率判定（商品名に※がある場合は8%、ない場合は10%）
      const is8percent = productName.includes("※");
      if (is8percent) {
        subtotal8 += amount;
      } else {
        subtotal10 += amount;
      }

      doc.text(productName, 20, y);
      doc.text(`¥${unitPrice.toLocaleString()}`, 100, y);
      doc.text(quantity.toString(), 130, y);
      doc.text(`¥${amount.toLocaleString()}`, 160, y);
      y += 6;
    });

    // 出荷事務手数料
    doc.text("出荷事務手数料", 20, y);
    doc.text(`¥${shippingFee.toLocaleString()}`, 100, y);
    doc.text("1", 130, y);
    doc.text(`¥${shippingFee.toLocaleString()}`, 160, y);
    subtotal10 += shippingFee;
    y += 8;

    doc.line(20, y, 190, y); // 横線
    y += 6;

    // 商品名の前に「※」は軽減税率(8%)対象商品
    doc.setFontSize(8);
    doc.text("商品名の前に「※」は軽減税率(8％)対象商品", 20, y);
    y += 8;

    // 税計算
    const tax8 = Math.floor(subtotal8 * 0.08);
    const tax10 = Math.floor(subtotal10 * 0.1);

    doc.setFontSize(10);
    doc.text(`※8％対象(外税)`, 120, y);
    doc.text(`¥${subtotal8.toLocaleString()}`, 160, y);
    y += 6;
    doc.text(`※8％消費税(外税)`, 120, y);
    doc.text(`¥${tax8.toLocaleString()}`, 160, y);
    y += 6;
    doc.text(`10％対象(外税)`, 120, y);
    doc.text(`¥${subtotal10.toLocaleString()}`, 160, y);
    y += 6;
    doc.text(`10％消費税(外税)`, 120, y);
    doc.text(`¥${tax10.toLocaleString()}`, 160, y);
    y += 6;

    doc.line(120, y, 190, y); // 横線
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text(`合計金額(税込)`, 120, y);
    doc.text(`¥${order.totalAmount.toLocaleString()}`, 160, y);
    y += 10;

    // 備考
    doc.setFont("helvetica", "bold");
    doc.text("◆備考◆", 20, y);
    doc.setFont("helvetica", "normal");
    if (order.note) {
      doc.text(order.note, 20, y + 5);
    }

    // フッター（会社情報）
    doc.setFontSize(9);
    doc.text(companyName, 20, 260);
    doc.text(companyAddress, 20, 265);
    doc.text(`${companyTel}　${companyFax}`, 20, 270);
    doc.text(companyRegNo, 20, 275);

    // PDFをバイナリデータとして生成
    const pdfBlob = doc.output("arraybuffer");

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice_${order.id}.pdf"`
      }
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
