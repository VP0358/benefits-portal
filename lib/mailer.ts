import { Resend } from "resend";

// 送信元メールアドレス（Resendで認証済みドメインが必要）
const FROM_ADDRESS = process.env.MAIL_FROM ?? "noreply@viola-pure.net";
const FROM_NAME    = "VIOLA-Pure 福利厚生";

// Resendインスタンスを遅延初期化（ビルド時に RESEND_API_KEY が不要になる）
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

/** 会員登録完了メール */
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const subject = "【VIOLA-Pure】会員登録が完了しました";

  const textBody = `
${name} 様

この度は、VIOLA-Pure福利厚生にご登録ありがとうございます。
たくさんの福利厚生をお使いくださいませ。

Quality Of Life   -人生の質を上げよう-


-----------------------------------------

CLAIRホールディングス株式会社
VIOLA-Pure
〒020-0026
岩手県盛岡市開運橋通5-6第五菱和ビル5F
TEL.019-681-3667
FAX.050-3385-7788
営業時間.10:00-18:00

-----------------------------------------
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f0f7ea;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ea;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- ヘッダー -->
          <tr>
            <td style="background:#1e293b;padding:32px 40px;text-align:center;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">VIOLA-Pure</div>
              <div style="color:#94a3b8;font-size:13px;margin-top:4px;">福利厚生ポータル</div>
            </td>
          </tr>

          <!-- 本文 -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#334155;">${name} 様</p>
              <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.8;">
                この度は、<strong>VIOLA-Pure福利厚生</strong>にご登録ありがとうございます。<br />
                たくさんの福利厚生をお使いくださいませ。
              </p>

              <!-- キャッチコピー -->
              <div style="background:#f0f7ea;border-left:4px solid #4ade80;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
                <p style="margin:0;font-size:15px;color:#166534;font-weight:600;">Quality Of Life</p>
                <p style="margin:4px 0 0;font-size:13px;color:#166534;">-人生の質を上げよう-</p>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px;" />

              <!-- 会社情報 -->
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding-bottom:4px;">
                    <span style="font-size:13px;font-weight:700;color:#1e293b;">CLAIRホールディングス株式会社</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;">
                    <span style="font-size:14px;font-weight:700;color:#1e293b;letter-spacing:1px;">VIOLA-Pure</span>
                  </td>
                </tr>
                <tr><td style="font-size:13px;color:#475569;line-height:1.8;">
                  〒020-0026<br />
                  岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br />
                  TEL: 019-681-3667<br />
                  FAX: 050-3385-7788<br />
                  営業時間: 10:00〜18:00
                </td></tr>
              </table>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 0;" />
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                このメールはVIOLA-Pure福利厚生ポータルより自動送信されています。<br />
                心当たりのない場合はこのメールを破棄してください。
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error("[mailer] sendWelcomeEmail error:", err);
    return { success: false, error: err };
  }
}

/** VP未来phone申し込み完了メール */
export async function sendVpPhoneApplicationEmail({
  to,
  name,
  subject: customSubject,
  htmlBody: customHtml,
  textBody: customText,
}: {
  to: string;
  name: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
}) {
  const subject = customSubject ?? "【VP未来phone】お申し込みありがとうございます";

  const textBody = customText ?? `
${name} 様

この度は、VP未来phoneにお申し込みいただきありがとうございます。

お申し込み内容を確認いたしましたので、ご連絡いたします。

【重要なお知らせ】
事務局よりKYC申請フォームが改めて届きます。
届き次第、フォームのご記入・ご提出をお願いいたします。
KYCの審査が完了しましたら、ご契約手続きを進めてまいります。

ご不明な点がございましたら、お気軽にお問い合わせください。

Quality Of Life   -人生の質を上げよう-


-----------------------------------------

CLAIRホールディングス株式会社
VIOLA-Pure
〒020-0026
岩手県盛岡市開運橋通5-6第五菱和ビル5F
TEL.019-681-3667
FAX.050-3385-7788
営業時間.10:00-18:00

-----------------------------------------
`.trim();

  const htmlBody = customHtml ?? `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#e6f7ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e6f7ff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- ヘッダー -->
          <tr>
            <td style="background:#1e293b;padding:32px 40px;text-align:center;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">VIOLA-Pure</div>
              <div style="color:#94a3b8;font-size:13px;margin-top:4px;">VP未来phone お申し込み完了</div>
            </td>
          </tr>

          <!-- 本文 -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#334155;">${name} 様</p>
              <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.8;">
                この度は、<strong>VP未来phone</strong>にお申し込みいただきありがとうございます。<br />
                お申し込み内容を確認いたしましたので、ご連絡いたします。
              </p>

              <!-- KYC重要案内 -->
              <div style="background:#fff7ed;border:2px solid #fb923c;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
                <div style="font-size:14px;font-weight:700;color:#c2410c;margin-bottom:10px;">📋 重要なお知らせ</div>
                <p style="margin:0 0 8px;font-size:14px;color:#7c2d12;line-height:1.8;">
                  事務局より<strong>KYC申請フォーム</strong>が改めて届きます。<br />
                  届き次第、フォームのご記入・ご提出をお願いいたします。
                </p>
                <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
                  KYCの審査が完了しましたら、ご契約手続きを進めてまいります。
                </p>
              </div>

              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.8;">
                ご不明な点がございましたら、お気軽にお問い合わせください。
              </p>

              <!-- キャッチコピー -->
              <div style="background:#f0f7ea;border-left:4px solid #4ade80;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
                <p style="margin:0;font-size:15px;color:#166534;font-weight:600;">Quality Of Life</p>
                <p style="margin:4px 0 0;font-size:13px;color:#166534;">-人生の質を上げよう-</p>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px;" />

              <!-- 会社情報 -->
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding-bottom:4px;">
                    <span style="font-size:13px;font-weight:700;color:#1e293b;">CLAIRホールディングス株式会社</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;">
                    <span style="font-size:14px;font-weight:700;color:#1e293b;letter-spacing:1px;">VIOLA-Pure</span>
                  </td>
                </tr>
                <tr><td style="font-size:13px;color:#475569;line-height:1.8;">
                  〒020-0026<br />
                  岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br />
                  TEL: 019-681-3667<br />
                  FAX: 050-3385-7788<br />
                  営業時間: 10:00〜18:00
                </td></tr>
              </table>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 0;" />
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                このメールはVIOLA-Pure福利厚生ポータルより自動送信されています。<br />
                心当たりのない場合はこのメールを破棄してください。
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error("[mailer] sendVpPhoneApplicationEmail error:", err);
    return { success: false, error: err };
  }
}

/** MLMビジネス会員登録完了メール */
export async function sendMlmWelcomeEmail({
  to,
  name,
  memberCode,
}: {
  to: string;
  name: string;
  memberCode: string;
}) {
  const subject = "【CLAIRホールディングス】MLMビジネス会員登録が完了しました";

  const textBody = `
${name} 様

CLAIRホールディングス株式会社のMLMビジネス会員としてご登録ありがとうございます。

■ 会員番号: ${memberCode}

ご登録いただいたメールアドレスとパスワードでログインいただけます。
以下のURLからログインしてください。

https://benefits-portal.vercel.app/login

ご不明な点がございましたら、下記までお問い合わせください。

Quality Of Life   -人生の質を上げよう-

-----------------------------------------

CLAIRホールディングス株式会社
VIOLA-Pure
〒020-0026
岩手県盛岡市開運橋通5-6第五菱和ビル5F
TEL.019-681-3667
FAX.050-3385-7788
営業時間.10:00-18:00

-----------------------------------------
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- ヘッダー -->
          <tr>
            <td style="background:#065f46;padding:32px 40px;text-align:center;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">VIOLA-Pure</div>
              <div style="color:#6ee7b7;font-size:13px;margin-top:4px;">CLAIRホールディングス株式会社</div>
              <div style="color:#6ee7b7;font-size:12px;margin-top:4px;">MLMビジネス会員 登録完了</div>
            </td>
          </tr>

          <!-- 本文 -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#334155;">${name} 様</p>
              <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.8;">
                この度は、<strong>CLAIRホールディングス株式会社</strong>のMLMビジネス会員にご登録ありがとうございます。
              </p>

              <!-- 会員番号 -->
              <div style="background:#f0fdf4;border:2px solid #34d399;border-radius:12px;padding:20px 24px;margin-bottom:28px;text-align:center;">
                <div style="font-size:12px;color:#059669;font-weight:600;margin-bottom:6px;">あなたの会員番号</div>
                <div style="font-size:28px;font-weight:700;color:#065f46;letter-spacing:3px;">${memberCode}</div>
              </div>

              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.8;">
                ダッシュボードにログインして、組織図の確認・ボーナス履歴の閲覧など各種機能をご利用ください。
              </p>

              <!-- ログインボタン -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="https://benefits-portal.vercel.app/login"
                   style="display:inline-block;background:#065f46;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
                  ログインする →
                </a>
              </div>

              <!-- キャッチコピー -->
              <div style="background:#f0fdf4;border-left:4px solid #34d399;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
                <p style="margin:0;font-size:15px;color:#065f46;font-weight:600;">Quality Of Life</p>
                <p style="margin:4px 0 0;font-size:13px;color:#065f46;">-人生の質を上げよう-</p>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px;" />

              <!-- 会社情報 -->
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding-bottom:4px;">
                    <span style="font-size:13px;font-weight:700;color:#1e293b;">CLAIRホールディングス株式会社</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;">
                    <span style="font-size:14px;font-weight:700;color:#1e293b;letter-spacing:1px;">VIOLA-Pure</span>
                  </td>
                </tr>
                <tr><td style="font-size:13px;color:#475569;line-height:1.8;">
                  〒020-0026<br />
                  岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br />
                  TEL: 019-681-3667<br />
                  FAX: 050-3385-7788<br />
                  営業時間: 10:00〜18:00
                </td></tr>
              </table>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 0;" />
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                このメールはCLAIRホールディングス株式会社より自動送信されています。<br />
                心当たりのない場合はこのメールを破棄してください。
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: `CLAIRホールディングス <${FROM_ADDRESS}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error("[mailer] sendMlmWelcomeEmail error:", err);
    return { success: false, error: err };
  }
}
