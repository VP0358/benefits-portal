import { Resend } from "resend";

// 送信元メールアドレス（Resendで認証済みドメインが必要）
const FROM_ADDRESS = process.env.MAIL_FROM ?? "noreply@viola-pure.net";
const FROM_NAME    = "VIOLA-Pure 福利厚生";

// Resendインスタンスを遅延初期化（ビルド時に RESEND_API_KEY が不要になる）
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

/** テンプレート変数の置換（{name} など） */
function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

/** 会員登録完了メール（SiteSettingテンプレート対応） */
export async function sendWelcomeEmail({
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
  const vars = { name };
  const subject = customSubject ? replaceVars(customSubject, vars) : "【VIOLA-Pure】会員登録が完了しました";

  const defaultTextBody = `${name} 様

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
-----------------------------------------`;

  const textBody = customText ? replaceVars(customText, vars) : defaultTextBody;

  const defaultHtmlBody = `
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
                <tr><td style="padding-bottom:4px;"><span style="font-size:13px;font-weight:700;color:#1e293b;">CLAIRホールディングス株式会社</span></td></tr>
                <tr><td style="padding-bottom:12px;"><span style="font-size:14px;font-weight:700;color:#1e293b;letter-spacing:1px;">VIOLA-Pure</span></td></tr>
                <tr><td style="font-size:13px;color:#475569;line-height:1.8;">〒020-0026<br />岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br />TEL: 019-681-3667<br />FAX: 050-3385-7788<br />営業時間: 10:00〜18:00</td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 0;" />
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">このメールはVIOLA-Pure福利厚生ポータルより自動送信されています。<br />心当たりのない場合はこのメールを破棄してください。</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const htmlBody = customHtml ? replaceVars(customHtml, vars) : defaultHtmlBody;

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

/** MLMビジネス会員登録完了メール（SiteSettingテンプレート対応） */
export async function sendMlmWelcomeEmail({
  to,
  name,
  memberCode,
  subject: customSubject,
  htmlBody: customHtml,
  textBody: customText,
}: {
  to: string;
  name: string;
  memberCode: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
}) {
  const vars = { name, memberCode };
  const subject = customSubject ? replaceVars(customSubject, vars) : "【CLAIRホールディングス】MLMビジネス会員登録が完了しました";

  const defaultTextBody = `${name} 様

CLAIRホールディングス株式会社のMLMビジネス会員としてご登録ありがとうございます。

■ 会員番号: ${memberCode}

ご登録いただいたメールアドレスとパスワードでログインいただけます。
以下のURLからログインしてください。

https://viola-pure.net/login

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
-----------------------------------------`;

  const textBody = customText ? replaceVars(customText, vars) : defaultTextBody;

  const defaultMlmHtmlBody = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#065f46;padding:32px 40px;text-align:center;">
        <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">VIOLA-Pure</div>
        <div style="color:#6ee7b7;font-size:13px;margin-top:4px;">CLAIRホールディングス株式会社</div>
        <div style="color:#6ee7b7;font-size:12px;margin-top:4px;">MLMビジネス会員 登録完了</div>
      </td></tr>
      <tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:15px;color:#334155;">${name} 様</p>
        <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.8;">この度は、<strong>CLAIRホールディングス株式会社</strong>のMLMビジネス会員にご登録ありがとうございます。</p>
        <div style="background:#f0fdf4;border:2px solid #34d399;border-radius:12px;padding:20px 24px;margin-bottom:28px;text-align:center;">
          <div style="font-size:12px;color:#059669;font-weight:600;margin-bottom:6px;">あなたの会員番号</div>
          <div style="font-size:28px;font-weight:700;color:#065f46;letter-spacing:3px;">${memberCode}</div>
        </div>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.8;">ダッシュボードにログインして、組織図の確認・ボーナス履歴の閲覧など各種機能をご利用ください。</p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="https://viola-pure.net/login" style="display:inline-block;background:#065f46;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">ログインする →</a>
        </div>
        <div style="background:#f0fdf4;border-left:4px solid #34d399;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
          <p style="margin:0;font-size:15px;color:#065f46;font-weight:600;">Quality Of Life</p>
          <p style="margin:4px 0 0;font-size:13px;color:#065f46;">-人生の質を上げよう-</p>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px;" />
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding-bottom:4px;"><span style="font-size:13px;font-weight:700;color:#1e293b;">CLAIRホールディングス株式会社</span></td></tr>
          <tr><td style="padding-bottom:12px;"><span style="font-size:14px;font-weight:700;color:#1e293b;letter-spacing:1px;">VIOLA-Pure</span></td></tr>
          <tr><td style="font-size:13px;color:#475569;line-height:1.8;">〒020-0026<br />岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br />TEL: 019-681-3667<br />FAX: 050-3385-7788<br />営業時間: 10:00〜18:00</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 0;" />
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">このメールはCLAIRホールディングス株式会社より自動送信されています。<br />心当たりのない場合はこのメールを破棄してください。</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();

  const htmlBody = customHtml ? replaceVars(customHtml, vars) : defaultMlmHtmlBody;

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

/** 携帯契約完了メール（SiteSettingテンプレート対応） */
export async function sendMobileContractEmail({
  to,
  name,
  planName,
  contractNumber,
  subject: customSubject,
  htmlBody: customHtml,
  textBody: customText,
}: {
  to: string;
  name: string;
  planName: string;
  contractNumber?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
}) {
  const vars = { name, planName, contractNumber: contractNumber ?? "" };
  const subject = customSubject ? replaceVars(customSubject, vars) : "【VIOLA-Pure】携帯契約が完了しました";

  const defaultTextBody = `${name} 様

この度は、VP未来phone（携帯契約）をご契約いただきありがとうございます。

■ ご契約プラン: ${planName}
${contractNumber ? `■ 契約番号: ${contractNumber}` : ""}

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
-----------------------------------------`;

  const textBody = customText ? replaceVars(customText, vars) : defaultTextBody;

  const defaultHtmlBody = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#e6f7ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e6f7ff;padding:40px 20px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#1e293b;padding:32px 40px;text-align:center;">
        <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">VIOLA-Pure</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px;">VP未来phone 携帯契約完了</div>
      </td></tr>
      <tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:15px;color:#334155;">${name} 様</p>
        <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.8;">この度は、<strong>VP未来phone（携帯契約）</strong>をご契約いただきありがとうございます。</p>
        <div style="background:#f0f9ff;border:2px solid #38bdf8;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <div style="font-size:13px;font-weight:700;color:#0369a1;margin-bottom:8px;">📱 ご契約内容</div>
          <table cellpadding="0" cellspacing="0" style="width:100%;">
            <tr><td style="font-size:13px;color:#334155;padding-bottom:4px;">プラン</td><td style="font-size:14px;font-weight:700;color:#0c4a6e;">${planName}</td></tr>
            ${contractNumber ? `<tr><td style="font-size:13px;color:#334155;">契約番号</td><td style="font-size:13px;color:#334155;">${contractNumber}</td></tr>` : ""}
          </table>
        </div>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.8;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <div style="background:#f0f7ea;border-left:4px solid #4ade80;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
          <p style="margin:0;font-size:15px;color:#166534;font-weight:600;">Quality Of Life</p>
          <p style="margin:4px 0 0;font-size:13px;color:#166534;">-人生の質を上げよう-</p>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px;" />
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding-bottom:4px;"><span style="font-size:13px;font-weight:700;color:#1e293b;">CLAIRホールディングス株式会社</span></td></tr>
          <tr><td style="padding-bottom:12px;"><span style="font-size:14px;font-weight:700;color:#1e293b;letter-spacing:1px;">VIOLA-Pure</span></td></tr>
          <tr><td style="font-size:13px;color:#475569;line-height:1.8;">〒020-0026<br />岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br />TEL: 019-681-3667<br />FAX: 050-3385-7788<br />営業時間: 10:00〜18:00</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 0;" />
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">このメールはVIOLA-Pure福利厚生ポータルより自動送信されています。<br />心当たりのない場合はこのメールを破棄してください。</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();

  const htmlBody = customHtml ? replaceVars(customHtml, vars) : defaultHtmlBody;

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
    console.error("[mailer] sendMobileContractEmail error:", err);
    return { success: false, error: err };
  }
}

/** 旅行サブスク契約完了メール（SiteSettingテンプレート対応） */
export async function sendTravelSubscriptionEmail({
  to,
  name,
  planName,
  subject: customSubject,
  htmlBody: customHtml,
  textBody: customText,
}: {
  to: string;
  name: string;
  planName: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
}) {
  const vars = { name, planName };
  const subject = customSubject ? replaceVars(customSubject, vars) : "【VIOLA-Pure】旅行サブスクへご加入いただきありがとうございます";

  const defaultTextBody = `${name} 様

この度は、VIOLA-Pure 旅行サブスクにご加入いただきありがとうございます。

■ ご加入プラン: ${planName}

ダッシュボードからプランの確認ができます。
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
-----------------------------------------`;

  const textBody = customText ? replaceVars(customText, vars) : defaultTextBody;

  const defaultHtmlBody = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#fdf4ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf4ff;padding:40px 20px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#4c1d95;padding:32px 40px;text-align:center;">
        <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">VIOLA-Pure</div>
        <div style="color:#ddd6fe;font-size:13px;margin-top:4px;">✈️ 旅行サブスク ご加入完了</div>
      </td></tr>
      <tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:15px;color:#334155;">${name} 様</p>
        <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.8;">この度は、<strong>VIOLA-Pure 旅行サブスク</strong>にご加入いただきありがとうございます。</p>
        <div style="background:#faf5ff;border:2px solid #a78bfa;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <div style="font-size:13px;font-weight:700;color:#6d28d9;margin-bottom:8px;">✈️ ご加入プラン</div>
          <div style="font-size:18px;font-weight:700;color:#4c1d95;">${planName}</div>
        </div>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.8;">ダッシュボードからプランの確認ができます。ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <div style="background:#f0f7ea;border-left:4px solid #4ade80;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
          <p style="margin:0;font-size:15px;color:#166534;font-weight:600;">Quality Of Life</p>
          <p style="margin:4px 0 0;font-size:13px;color:#166534;">-人生の質を上げよう-</p>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px;" />
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding-bottom:4px;"><span style="font-size:13px;font-weight:700;color:#1e293b;">CLAIRホールディングス株式会社</span></td></tr>
          <tr><td style="padding-bottom:12px;"><span style="font-size:14px;font-weight:700;color:#1e293b;letter-spacing:1px;">VIOLA-Pure</span></td></tr>
          <tr><td style="font-size:13px;color:#475569;line-height:1.8;">〒020-0026<br />岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br />TEL: 019-681-3667<br />FAX: 050-3385-7788<br />営業時間: 10:00〜18:00</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 0;" />
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">このメールはVIOLA-Pure福利厚生ポータルより自動送信されています。<br />心当たりのない場合はこのメールを破棄してください。</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();

  const htmlBody = customHtml ? replaceVars(customHtml, vars) : defaultHtmlBody;

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
    console.error("[mailer] sendTravelSubscriptionEmail error:", err);
    return { success: false, error: err };
  }
}

/** 相談窓口 受信通知メール（管理者向け） */
export async function sendContactNotificationEmail({
  inquiryId,
  name,
  phone,
  email,
  menuTitle,
  content,
  memberCode,
  notifyTo,
}: {
  inquiryId: string;
  name: string;
  phone?: string;
  email: string;
  menuTitle?: string | null;
  content: string;
  memberCode?: string | null;
  /** 通知先メールアドレス（複数可）。未指定時は CONTACT_NOTIFY_EMAIL 環境変数 → info@c-p.link */
  notifyTo?: string[];
}) {
  // 通知先: 引数 > 環境変数 > デフォルト
  const NOTIFY_TO: string[] =
    notifyTo && notifyTo.length > 0
      ? notifyTo
      : [(process.env.CONTACT_NOTIFY_EMAIL ?? "info@c-p.link")];
  const subject = `【VIOLA Pure 相談窓口】新しいお問い合わせが届きました（${name} 様）`;

  const textBody = `
VIOLA Pure 相談窓口に新しいお問い合わせが届きました。

────────────────────────
受付ID   : ${inquiryId}
氏名     : ${name}
${memberCode ? `会員コード: ${memberCode}` : ""}
電話番号 : ${phone || "未入力"}
メール   : ${email}
${menuTitle ? `メニュー  : ${menuTitle}` : ""}
────────────────────────
【お問い合わせ内容】
${content}
────────────────────────

管理画面から確認・返信できます:
https://www.viola-pure.xyz/admin/contacts

このメールはVIOLA Pure管理システムより自動送信されています。
`.trim();

  const htmlBody = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">

        <!-- ヘッダー -->
        <tr>
          <td style="background:#1e293b;padding:24px 36px;">
            <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">VIOLA Pure</div>
            <div style="color:#94a3b8;font-size:12px;margin-top:3px;">相談窓口 新着通知</div>
          </td>
        </tr>

        <!-- タイトル -->
        <tr>
          <td style="padding:28px 36px 20px;">
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
              <div style="font-size:14px;font-weight:700;color:#92400e;">📬 新しいお問い合わせが届きました</div>
            </div>

            <!-- 送信者情報テーブル -->
            <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <tr style="background:#f8fafc;">
                <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;width:120px;border-bottom:1px solid #e2e8f0;">受付ID</td>
                <td style="padding:10px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${inquiryId}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0;">氏名</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">${name} 様</td>
              </tr>
              ${memberCode ? `<tr style="background:#f8fafc;"><td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">会員コード</td><td style="padding:10px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${memberCode}</td></tr>` : ""}
              <tr ${memberCode ? "" : 'style="background:#f8fafc;"'}>
                <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;${memberCode ? "background:#f8fafc;" : ""}">メールアドレス</td>
                <td style="padding:10px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;"><a href="mailto:${email}" style="color:#2563eb;">${email}</a></td>
              </tr>
              <tr ${memberCode ? "" : 'style="background:#f8fafc;"'}>
                <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;${memberCode ? "" : "background:#f8fafc;"}border-bottom:1px solid #e2e8f0;">電話番号</td>
                <td style="padding:10px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${phone || "未入力"}</td>
              </tr>
              ${menuTitle ? `<tr style="background:#f8fafc;"><td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;">メニュー</td><td style="padding:10px 16px;font-size:13px;color:#1e293b;">${menuTitle}</td></tr>` : ""}
            </table>

            <!-- お問い合わせ内容 -->
            <div style="margin-bottom:24px;">
              <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">お問い合わせ内容</div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;font-size:14px;color:#334155;line-height:1.8;white-space:pre-wrap;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            </div>

            <!-- 管理画面ボタン -->
            <div style="text-align:center;">
              <a href="https://www.viola-pure.xyz/admin/contacts"
                style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:600;">
                管理画面で確認する →
              </a>
            </div>
          </td>
        </tr>

        <!-- フッター -->
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">このメールはVIOLA Pure管理システムより自動送信されています。</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: `VIOLA Pure 相談窓口 <${FROM_ADDRESS}>`,
      to: NOTIFY_TO,   // string[] — Resend は配列対応
      subject,
      text: textBody,
      html: htmlBody,
    });
    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error("[mailer] sendContactNotificationEmail error:", err);
    return { success: false, error: err };
  }
}
