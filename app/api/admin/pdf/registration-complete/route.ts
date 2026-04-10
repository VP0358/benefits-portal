// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * GET /api/admin/pdf/registration-complete?memberId=123
 * MLM会員の登録完了通知PDFを生成してダウンロード
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((session as any)?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberId = req.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // MLM会員情報を取得（MlmRegistrationも含む）
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { id: BigInt(memberId) },
      include: {
        user: {
          include: {
            mlmRegistration: true
          }
        },
        referrer: {
          include: {
            user: true
          }
        }
      }
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "MLM member not found" }, { status: 404 });
    }

    // PDF生成
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const user = mlmMember.user;
    const reg = user.mlmRegistration;
    const memberCode = mlmMember.memberCode;
    const contractDate = mlmMember.contractDate ? new Date(mlmMember.contractDate).toLocaleDateString('ja-JP') : "-";
    const referrerName = mlmMember.referrer?.user?.name || "-";
    const referrerCode = mlmMember.referrer?.memberCode || "-";

    // 会社情報
    const companyName = "CLAIRホールディングス株式会社";
    const companyAddress = "〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F";
    const companyTel = "TEL：019-681-3667";
    const companyFax = "FAX：050-3385-7788";
    const issueDate = new Date().toLocaleDateString('ja-JP');

    // ヘッダー（郵便番号・住所）
    doc.setFontSize(10);
    doc.text(`〒${user.postalCode || ""}`, 20, 20);
    doc.text(user.address || "", 20, 26);

    // 「重要」マーク
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("重要", 20, 36);

    // 宛名
    doc.setFontSize(14);
    doc.text(`${user.name || ""} 様`, 20, 46);

    // 会員ID（右上）
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`会員ID　${memberCode}`, 140, 46);

    // タイトル
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("登録完了のお知らせ", 70, 60);

    // 本文
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("お申込みいただき誠に有難うございます。下記の通り契約完了を通知致します。", 20, 70);
    doc.text("内容に間違いがないかご確認をお願い致します。今後ともよろしくお願い申し上げます。", 20, 76);

    // 詳細情報
    let y = 90;
    const lineHeight = 8;

    const addField = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 25, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 25, y + 5);
      y += lineHeight + 5;
    };

    addField("会員ID", memberCode);
    addField("氏名", `${user.name || ""} 様`);
    addField("登録住所", `〒${user.postalCode || ""} ${user.address || ""}`);
    
    // 配送先（MlmRegistrationから）
    const deliveryAddr = reg?.deliveryPostalCode
      ? `〒${reg.deliveryPostalCode} ${reg.deliveryAddress || ""}`
      : `〒${user.postalCode || ""} ${user.address || ""}`;
    addField("配送先住所", deliveryAddr);
    
    // 電話番号（mlmMemberのmobileを優先）
    const phone = mlmMember.mobile || user.phone || "";
    addField("連絡先", `TEL ${phone}`);
    
    // 生年月日（MlmMemberから）
    const birthDate = mlmMember.birthDate
      ? new Date(mlmMember.birthDate).toLocaleDateString('ja-JP')
      : "-";
    addField("生年月日", birthDate);
    addField("メールアドレス", user.email || "");
    addField("契約締結日", contractDate);
    addField("紹介者情報", `${referrerCode} ${referrerName} 様`);

    // 口座情報（MlmMemberから取得）
    const bankInfo = mlmMember.bankName && mlmMember.bankAccountNumber
      ? `${mlmMember.bankName}　${mlmMember.branchName || ""}　${mlmMember.accountType || "普通"}　${mlmMember.accountNumber || mlmMember.bankAccountNumber}　${mlmMember.accountHolder || ""}`
      : (reg?.bankName && reg?.bankAccountNumber
        ? `${reg.bankName}　${reg.bankBranch || ""}　${reg.bankAccountType || "普通"}　${reg.bankAccountNumber}　${reg.bankAccountHolder || ""}`
        : "未登録");
    addField("口座情報", bankInfo);

    // マイページ情報
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("マイページ", 25, y);
    doc.setFont("helvetica", "normal");
    doc.text("https://viola-pure.jp/", 25, y + 5);
    doc.text(`ログインID：${memberCode.replace(/-/g, "")}`, 25, y + 10);
    doc.text(`パスワード：**********`, 25, y + 15);

    // フッター（会社情報）
    doc.setFontSize(9);
    doc.text(companyName, 20, 260);
    doc.text(companyAddress, 20, 265);
    doc.text(`${companyTel}　${companyFax}`, 20, 270);
    doc.text(`発行日　　${issueDate}`, 20, 275);

    // PDFをバイナリデータとして生成
    const pdfBlob = doc.output("arraybuffer");

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="registration_${memberCode}.pdf"`
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
