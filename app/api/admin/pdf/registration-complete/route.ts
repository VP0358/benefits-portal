// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

/**
 * GET /api/admin/pdf/registration-complete?memberId=123
 * MLM会員の登録完了通知HTMLを生成（ブラウザ印刷→PDF保存で日本語正常表示）
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

    // MLM会員情報を取得
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { id: BigInt(memberId) },
      include: {
        user: { include: { mlmRegistration: true } },
        referrer: { include: { user: true } }
      }
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "MLM member not found" }, { status: 404 });
    }

    const user = mlmMember.user;
    const reg = user.mlmRegistration;
    const memberCode = mlmMember.memberCode;
    const loginId = memberCode.replace(/-/g, "");

    const contractDate = mlmMember.contractDate
      ? new Date(mlmMember.contractDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
      : "—";
    const birthDate = mlmMember.birthDate
      ? new Date(mlmMember.birthDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
      : "—";
    const referrerName = mlmMember.referrer?.user?.name || "—";
    const referrerCode = mlmMember.referrer?.memberCode || "—";
    const issueDate = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

    // 住所
    const regAddress = `〒${user.postalCode || ""} ${user.address || ""}`;
    const deliveryAddr = reg?.deliveryPostalCode
      ? `〒${reg.deliveryPostalCode} ${reg.deliveryAddress || ""}`
      : regAddress;

    // 電話
    const phone = mlmMember.mobile || user.phone || "—";

    // 口座情報
    const bankLine1 = mlmMember.bankName
      ? `${mlmMember.bankName}　${mlmMember.branchName || ""}`
      : (reg?.bankName ? `${reg.bankName}　${reg.bankBranch || ""}` : "—");
    const bankLine2 = mlmMember.bankName
      ? `${mlmMember.accountType || "普通"}　${mlmMember.accountNumber || ""}　${mlmMember.accountHolder || ""}`
      : (reg?.bankAccountNumber ? `${reg.bankAccountType || "普通"}　${reg.bankAccountNumber}　${reg.bankAccountHolder || ""}` : "");

    // マイページURL & QRコード
    const myPageUrl = "https://viola-pure.jp/";
    const qrDataUrl = await QRCode.toDataURL(myPageUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#1d4ed8", light: "#ffffff" },
    });

    // 会社情報
    const companyName = "CLAIRホールディングス株式会社";
    const companyAddress = "〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F";
    const companyTel = "TEL：019-681-3667";
    const companyFax = "FAX：050-3385-7788";

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登録完了通知書 ${memberCode}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans JP', 'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      font-size: 11pt;
      color: #1f2937;
      background: #f3f4f6;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      padding: 0;
    }

    /* ヘッダー */
    .header {
      background: #1d4ed8;
      color: #fff;
      padding: 14px 24px 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-brand { font-size: 18pt; font-weight: 700; letter-spacing: 1px; }
    .header-sub { font-size: 9pt; opacity: 0.85; margin-top: 2px; }
    .header-date { font-size: 9pt; opacity: 0.85; text-align: right; }

    /* タイトル */
    .title-block {
      text-align: center;
      padding: 18px 24px 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .title-block h1 {
      font-size: 20pt;
      font-weight: 700;
      color: #1d4ed8;
      letter-spacing: 6px;
    }
    .title-block .subtitle {
      font-size: 9pt;
      color: #6b7280;
      letter-spacing: 2px;
      margin-top: 3px;
    }

    /* 宛名 */
    .address-block {
      padding: 14px 28px 0;
    }
    .address-postal { font-size: 10pt; color: #374151; }
    .address-main { font-size: 9.5pt; color: #374151; margin-top: 2px; }
    .address-company { font-size: 11pt; color: #374151; margin-top: 6px; }
    .address-name { font-size: 17pt; font-weight: 700; color: #111827; margin-top: 3px; border-bottom: 1.5px solid #374151; padding-bottom: 3px; display: inline-block; }
    .address-code { font-size: 9pt; color: #6b7280; margin-top: 4px; }

    /* 挨拶文 */
    .greeting {
      padding: 12px 28px;
      font-size: 9.5pt;
      line-height: 1.85;
      color: #374151;
    }

    /* セクション */
    .section { margin: 0 20px 12px; }
    .section-title {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 9.5pt;
      font-weight: 700;
      color: #1d4ed8;
      margin-bottom: 0;
    }
    table.info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    table.info-table tr:nth-child(even) { background: #f9fafb; }
    table.info-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    table.info-table td.label {
      color: #6b7280;
      width: 38%;
      white-space: nowrap;
    }
    table.info-table td.value {
      color: #111827;
      font-weight: 500;
    }

    /* マイページ+QR */
    .mypage-section {
      margin: 0 20px 12px;
    }
    .mypage-inner {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .mypage-table-wrap { flex: 1; }
    .qr-wrap {
      text-align: center;
      min-width: 96px;
    }
    .qr-wrap img { width: 90px; height: 90px; border: 1px solid #bfdbfe; border-radius: 6px; padding: 2px; }
    .qr-label { font-size: 8pt; color: #6b7280; margin-top: 3px; }
    .pw-note {
      font-size: 8.5pt;
      color: #b45309;
      margin-top: 4px;
      padding: 4px 8px;
      background: #fef3c7;
      border-radius: 4px;
    }

    /* フッター */
    .footer {
      margin: 16px 20px 0;
      padding-top: 12px;
      border-top: 1.5px solid #1d4ed8;
      font-size: 9pt;
    }
    .footer-company { font-weight: 700; font-size: 10.5pt; margin-bottom: 3px; }
    .footer-info { color: #4b5563; line-height: 1.7; }

    /* 印刷ボタン（印刷時は非表示） */
    .print-bar {
      background: #1d4ed8;
      padding: 10px 24px;
      text-align: center;
    }
    .print-btn {
      background: #fff;
      color: #1d4ed8;
      border: none;
      border-radius: 6px;
      padding: 8px 28px;
      font-size: 11pt;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .print-btn:hover { background: #eff6ff; }

    @media print {
      body { background: #fff; }
      .print-bar { display: none; }
      .page { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <!-- 印刷ボタン（画面のみ表示） -->
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">
      🖨 印刷 / PDFとして保存
    </button>
  </div>

  <div class="page">
    <!-- ヘッダー -->
    <div class="header">
      <div>
        <div class="header-brand">VIOLA-Pure</div>
        <div class="header-sub">Registration Completion Notice</div>
      </div>
      <div class="header-date">発行日：${issueDate}</div>
    </div>

    <!-- タイトル -->
    <div class="title-block">
      <h1>登録完了通知書</h1>
      <div class="subtitle">VIOLA-Pure 会員登録完了のお知らせ</div>
    </div>

    <!-- 宛名 -->
    <div class="address-block">
      <div class="address-postal">〒${user.postalCode || ""}</div>
      <div class="address-main">${user.address || ""}</div>
      ${mlmMember.companyName ? `<div class="address-company">${mlmMember.companyName}</div>` : ""}
      <div class="address-name">${user.name || ""}　様</div>
      <div class="address-code">会員コード：${memberCode}</div>
    </div>

    <!-- 挨拶文 -->
    <div class="greeting">
      このたびはVIOLA-Pure会員へのご登録をいただき、誠にありがとうございます。<br>
      以下の内容にて登録が完了いたしましたことをお知らせいたします。内容に間違いがないかご確認をお願いいたします。
    </div>

    <!-- 会員情報 -->
    <div class="section">
      <div class="section-title">■ 会員情報</div>
      <table class="info-table">
        <tr><td class="label">会員ID</td><td class="value">${memberCode}</td></tr>
        <tr><td class="label">氏名</td><td class="value">${user.name || "—"}</td></tr>
        <tr><td class="label">登録住所</td><td class="value">${regAddress}</td></tr>
        <tr><td class="label">配送先住所</td><td class="value">${deliveryAddr}</td></tr>
        <tr><td class="label">連絡先（TEL）</td><td class="value">${phone}</td></tr>
        <tr><td class="label">連絡先（FAX）</td><td class="value">—</td></tr>
        <tr><td class="label">生年月日</td><td class="value">${birthDate}</td></tr>
        <tr><td class="label">メールアドレス</td><td class="value">${user.email || "—"}</td></tr>
        <tr><td class="label">契約締結日</td><td class="value">${contractDate}</td></tr>
      </table>
    </div>

    <!-- 紹介者情報 -->
    <div class="section">
      <div class="section-title">■ 紹介者情報</div>
      <table class="info-table">
        <tr><td class="label">紹介者ID</td><td class="value">${referrerCode}</td></tr>
        <tr><td class="label">紹介者氏名</td><td class="value">${referrerName}　様</td></tr>
      </table>
    </div>

    <!-- 口座情報 -->
    <div class="section">
      <div class="section-title">■ 口座情報（報酬振込先）</div>
      <table class="info-table">
        <tr><td class="label">金融機関・支店</td><td class="value">${bankLine1}</td></tr>
        <tr><td class="label">種別・番号・名義</td><td class="value">${bankLine2 || "—"}</td></tr>
      </table>
    </div>

    <!-- マイページログイン情報 -->
    <div class="mypage-section">
      <div class="section-title">■ マイページログイン情報</div>
      <div class="mypage-inner">
        <div class="mypage-table-wrap">
          <table class="info-table">
            <tr><td class="label">マイページURL</td><td class="value">${myPageUrl}</td></tr>
            <tr><td class="label">ログインID（会員ID）</td><td class="value">${loginId}</td></tr>
            <tr><td class="label">初期パスワード</td><td class="value" style="font-size:13pt;font-weight:700;letter-spacing:4px;">0000</td></tr>
          </table>
          <div class="pw-note">※ 初回ログイン後、必ずパスワードを変更してください。</div>
        </div>
        <div class="qr-wrap">
          <img src="${qrDataUrl}" alt="マイページQRコード">
          <div class="qr-label">マイページQR</div>
        </div>
      </div>
    </div>

    <!-- フッター -->
    <div class="footer">
      <div class="footer-company">${companyName}</div>
      <div class="footer-info">
        ${companyAddress}<br>
        ${companyTel}　${companyFax}
      </div>
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
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
