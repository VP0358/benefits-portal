import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// 送信元メールアドレス（Resendで認証済みドメインが必要）
const FROM_ADDRESS = process.env.MAIL_FROM ?? "noreply@viola-pure.net";
const FROM_NAME    = "VIOLA-Pure 福利厚生";

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
