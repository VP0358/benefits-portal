// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import "jspdf-autotable";
import QRCode from "qrcode";

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

    const user = mlmMember.user;
    const reg = user.mlmRegistration;
    const memberCode = mlmMember.memberCode;
    const contractDate = mlmMember.contractDate ? new Date(mlmMember.contractDate).toLocaleDateString('ja-JP') : "-";
    const referrerName = mlmMember.referrer?.user?.name || "-";
    const referrerCode = mlmMember.referrer?.memberCode || "-";

    // マイページURL
    const myPageUrl = "https://viola-pure.jp/";
    const loginId = memberCode.replace(/-/g, "");

    // QRコード（Data URL）を生成
    const qrDataUrl = await QRCode.toDataURL(myPageUrl, {
      width: 120,
      margin: 1,
      color: { dark: "#1d4ed8", light: "#ffffff" },
    });
    // Base64部分だけ抽出
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");

    // 会社情報
    const companyName = "CLAIRホールディングス株式会社";
    const companyAddress = "〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F";
    const companyTel = "TEL：019-681-3667";
    const companyFax = "FAX：050-3385-7788";
    const issueDate = new Date().toLocaleDateString('ja-JP');

    // PDF生成
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const PAGE_W = 210;
    const MARGIN_L = 20;
    const MARGIN_R = 20;
    const COL_W = PAGE_W - MARGIN_L - MARGIN_R;

    // ─── ヘッダー ───────────────────────────
    // 青い帯
    doc.setFillColor(29, 78, 216); // blue-700
    doc.rect(0, 0, PAGE_W, 22, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("VIOLA-Pure", MARGIN_L, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Registration Completion Notice", MARGIN_L, 18);

    // 発行日（右上）
    doc.setFontSize(9);
    doc.text(`発行日: ${issueDate}`, PAGE_W - MARGIN_R, 18, { align: "right" });

    // ─── タイトル ───────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("登録完了通知書", PAGE_W / 2, 34, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("VIOLA-Pure会員様のご登録が完了いたしました。", PAGE_W / 2, 40, { align: "center" });

    // ─── 宛名ブロック ───────────────────────
    let y = 48;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (user.postalCode) doc.text(`〒${user.postalCode}`, MARGIN_L, y);
    if (user.address) doc.text(user.address, MARGIN_L, y + 5);
    y += 13;
    if (mlmMember.companyName) {
      doc.setFontSize(10);
      doc.text(mlmMember.companyName, MARGIN_L, y);
      y += 6;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${user.name || ""}  様`, MARGIN_L, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text(`会員コード: ${memberCode}`, MARGIN_L, y + 6);
    y += 14;

    // ─── 挨拶文 ───────────────────────────
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("このたびはVIOLA-Pure会員へのご登録をいただき、誠にありがとうございます。", MARGIN_L, y);
    y += 5;
    doc.text("以下の内容にて登録が完了いたしましたことをお知らせいたします。内容のご確認をお願いいたします。", MARGIN_L, y);
    y += 9;

    // ─── セクション描画ヘルパー ───────────────
    const drawSectionTitle = (title: string) => {
      doc.setFillColor(239, 246, 255); // blue-50
      doc.roundedRect(MARGIN_L, y - 3, COL_W, 8, 2, 2, "F");
      doc.setDrawColor(147, 197, 253); // blue-300
      doc.roundedRect(MARGIN_L, y - 3, COL_W, 8, 2, 2, "S");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(29, 78, 216);
      doc.text(title, MARGIN_L + 3, y + 2);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      y += 10;
    };

    const drawRow = (label: string, value: string, isAlt = false) => {
      if (isAlt) {
        doc.setFillColor(249, 250, 251);
        doc.rect(MARGIN_L, y - 3, COL_W, 7, "F");
      }
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(label, MARGIN_L + 2, y + 1);
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(value || "-", MARGIN_L + 48, y + 1);
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN_L, y + 4, MARGIN_L + COL_W, y + 4);
      y += 7;
    };

    // ─── 会員情報 ──────────────────────────
    drawSectionTitle("■ 会員情報");
    drawRow("会員ID", memberCode, false);
    drawRow("氏名", `${user.name || ""}`, true);
    drawRow("登録住所", `〒${user.postalCode || ""}  ${user.address || ""}`, false);
    const deliveryAddr = reg?.deliveryPostalCode
      ? `〒${reg.deliveryPostalCode}  ${reg.deliveryAddress || ""}`
      : `〒${user.postalCode || ""}  ${user.address || ""}`;
    drawRow("配送先住所", deliveryAddr, true);
    const phone = mlmMember.mobile || user.phone || "-";
    const faxVal = "-"; // FAX未対応のため
    drawRow("連絡先（TEL）", phone, false);
    drawRow("連絡先（FAX）", faxVal, true);
    const birthDate = mlmMember.birthDate
      ? new Date(mlmMember.birthDate).toLocaleDateString('ja-JP')
      : "-";
    drawRow("生年月日", birthDate, false);
    drawRow("メールアドレス", user.email || "-", true);
    drawRow("契約締結日", contractDate, false);
    y += 2;

    // ─── 紹介者情報 ───────────────────────
    drawSectionTitle("■ 紹介者情報");
    drawRow("紹介者ID", referrerCode, false);
    drawRow("紹介者氏名", `${referrerName} 様`, true);
    y += 2;

    // ─── 口座情報 ─────────────────────────
    drawSectionTitle("■ 口座情報（報酬振込先）");
    const bankInfo1 = mlmMember.bankName ? `${mlmMember.bankName}  ${mlmMember.branchName || ""}` : "-";
    const bankInfo2 = mlmMember.bankName
      ? `${mlmMember.accountType || "普通"}  ${mlmMember.accountNumber || mlmMember.bankAccountNumber || "-"}  ${mlmMember.accountHolder || ""}`
      : "-";
    drawRow("金融機関・支店", bankInfo1, false);
    drawRow("種別・番号・名義", bankInfo2, true);
    y += 2;

    // ─── マイページ情報（右側にQRコード） ──────
    drawSectionTitle("■ マイページログイン情報");

    // QRコード（右側）
    const QR_SIZE = 28;
    const QR_X = MARGIN_L + COL_W - QR_SIZE - 2;
    const QR_Y = y - 4;
    if (qrBase64) {
      doc.addImage(qrBase64, "PNG", QR_X, QR_Y, QR_SIZE, QR_SIZE);
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("マイページQR", QR_X + QR_SIZE / 2, QR_Y + QR_SIZE + 3, { align: "center" });
    }

    // テキスト情報（左側）
    const TEXT_COL_W = COL_W - QR_SIZE - 6;
    const drawRowNarrow = (label: string, value: string, isAlt = false) => {
      if (isAlt) {
        doc.setFillColor(249, 250, 251);
        doc.rect(MARGIN_L, y - 3, TEXT_COL_W, 7, "F");
      }
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(label, MARGIN_L + 2, y + 1);
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(value || "-", MARGIN_L + 48, y + 1);
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN_L, y + 4, MARGIN_L + TEXT_COL_W, y + 4);
      y += 7;
    };

    drawRowNarrow("マイページURL", myPageUrl, false);
    drawRowNarrow("ログインID（会員ID）", loginId, true);
    drawRowNarrow("初期パスワード", "0000", false);

    // 初期パスワード注意書き
    doc.setFontSize(8);
    doc.setTextColor(180, 80, 0);
    doc.text("※ 初回ログイン後、必ずパスワードを変更してください。", MARGIN_L + 2, y + 1);
    y += 8;

    // QRより下に空白を確保
    const afterQR = QR_Y + QR_SIZE + 8;
    if (y < afterQR) y = afterQR;
    y += 4;

    // ─── フッター ─────────────────────────
    doc.setDrawColor(29, 78, 216);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_L, y, MARGIN_L + COL_W, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(companyName, MARGIN_L, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(companyAddress, MARGIN_L, y + 5);
    doc.text(`${companyTel}  ${companyFax}`, MARGIN_L, y + 10);

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
