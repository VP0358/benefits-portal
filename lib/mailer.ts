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

// ─────────────────────────────────────────────────────────────
/** 中古車購入申込メール（管理者通知 & お客様確認メール共用） */
// ─────────────────────────────────────────────────────────────
interface UsedCarData {
  memberId: string
  name:     string
  phone:    string
  email:    string
  carType:  string
  grade:    string
  year:     string
  mileage:  string
  colors:   string
  budget:   string
  payment:  string
  drive:    string
  studless: string
  note:     string
}

export async function sendUsedCarApplicationEmail({
  to, isAdmin, data,
}: {
  to: string | string[]
  isAdmin: boolean
  data: UsedCarData
}) {
  const { name, phone, email, carType, grade, year, mileage, colors, budget, payment, drive, studless, note } = data

  const rows = [
    ["希望車種",               carType],
    ["希望グレード",           grade],
    ["希望年式",               year],
    ["希望距離数",             mileage],
    ["希望色（3色程）",        colors],
    ["予算",                   budget],
    ["現金 or ローン",         payment],
    ["駆動式",                 drive  || "未選択"],
    ["スタッドレスタイヤ",     studless || "未選択"],
    ["その他ご要望",           note   || "なし"],
  ]

  // ── 管理者通知メール ──────────────────────────────────
  if (isAdmin) {
    const subject = `【中古車購入申込】${name} 様からのお申し込みが届きました`

    const textBody = `
中古車購入申込フォームに新しいお申し込みが届きました。

────────────────────────────────────
お申込者情報
────────────────────────────────────
お名前       : ${name}
電話番号     : ${phone}
メール       : ${email}
────────────────────────────────────
ご希望条件
────────────────────────────────────
${rows.map(([k, v]) => `${k.padEnd(16, "　")} : ${v}`).join("\n")}
────────────────────────────────────

このメールはVIOLA Pure福利厚生ポータルより自動送信されています。
`.trim()

    const htmlRows = rows.map(([k, v]) => `
      <tr>
        <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;white-space:nowrap;width:160px;">${k}</td>
        <td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${v || "―"}</td>
      </tr>`).join("")

    const htmlBody = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- ヘッダー -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1628 0%,#122444 100%);padding:28px 36px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">🚗</div>
            <div style="color:#c9a84c;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">NEW APPLICATION</div>
            <div style="color:#ffffff;font-size:20px;font-weight:700;">中古車購入申込</div>
            <div style="color:rgba(255,255,255,0.55);font-size:12px;margin-top:4px;">新しいお申し込みが届きました</div>
          </td>
        </tr>
        <!-- お申込者情報 -->
        <tr>
          <td style="padding:28px 36px 20px;">
            <div style="font-size:11px;font-weight:700;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">お申込者情報</div>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr>
                <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;white-space:nowrap;width:160px;">お名前</td>
                <td style="padding:8px 14px;font-size:14px;font-weight:700;color:#0a1628;border:1px solid #e5e7eb;">${name} 様</td>
              </tr>
              <tr>
                <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;">電話番号</td>
                <td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${phone}</td>
              </tr>
              <tr>
                <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;">メールアドレス</td>
                <td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${email}</td>
              </tr>
            </table>
            <div style="font-size:11px;font-weight:700;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">ご希望条件</div>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
              ${htmlRows}
            </table>
          </td>
        </tr>
        <!-- フッター -->
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">このメールはVIOLA Pure福利厚生ポータルより自動送信されています。</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

    const resend = getResend()
    const result = await resend.emails.send({
      from: `VIOLA Pure 中古車 <${FROM_ADDRESS}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    })
    return { success: true, id: result.data?.id }
  }

  // ── お客様確認メール ──────────────────────────────────
  const subject = "【CLAIRホールディングス】中古車購入お申し込みを受け付けました"

  const textBody = `
${name} 様

この度は中古車購入のお申し込みをいただき、誠にありがとうございます。
以下の内容でお申し込みを受け付けました。

────────────────────────────────────
お申し込み内容
────────────────────────────────────
${rows.map(([k, v]) => `${k.padEnd(16, "　")} : ${v}`).join("\n")}
────────────────────────────────────

内容を確認の上、担当者より ${email} 宛にご連絡いたします。
通常2〜3営業日以内にご連絡いたしますので、しばらくお待ちください。

ご不明な点がございましたら、下記までお問い合わせください。

Quality Of Life   -人生の質を上げよう-

-----------------------------------------
CLAIRホールディングス株式会社
〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F
TEL：019-681-3667　FAX：050-3385-7788
営業時間：10:00〜18:00
-----------------------------------------
`.trim()

  const htmlRows2 = rows.map(([k, v]) => `
    <tr>
      <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#fffbf0;border:1px solid #fde68a;white-space:nowrap;width:160px;">${k}</td>
      <td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #fde68a;">${v || "―"}</td>
    </tr>`).join("")

  const htmlBody = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#fdf8f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- ヘッダー -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1628 0%,#c9a84c 100%);padding:28px 36px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🚗</div>
            <div style="color:#fff9e6;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:4px;">USED CAR APPLICATION</div>
            <div style="color:#ffffff;font-size:20px;font-weight:700;">お申し込みありがとうございます</div>
          </td>
        </tr>
        <!-- 本文 -->
        <tr>
          <td style="padding:32px 36px 24px;">
            <p style="margin:0 0 8px;font-size:15px;color:#334155;">${name} 様</p>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.8;">
              この度は中古車購入のお申し込みをいただき、誠にありがとうございます。<br />
              以下の内容でお申し込みを受け付けました。
            </p>
            <!-- お申し込み内容 -->
            <div style="font-size:11px;font-weight:700;color:#a88830;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">📋 お申し込み内容</div>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:28px;">
              ${htmlRows2}
            </table>
            <!-- ご連絡について -->
            <div style="background:#fffbf0;border:2px solid #fde68a;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
              <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">📬 担当者よりご連絡いたします</div>
              <p style="margin:0;font-size:13px;color:#78350f;line-height:1.8;">
                内容確認後、<strong>${email}</strong> 宛にご連絡いたします。<br />
                通常<strong>2〜3営業日以内</strong>にご連絡いたしますので、しばらくお待ちください。
              </p>
            </div>
            <!-- キャッチコピー -->
            <div style="background:#f0f7ea;border-left:4px solid #4ade80;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
              <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">Quality Of Life</p>
              <p style="margin:4px 0 0;font-size:12px;color:#166534;">-人生の質を上げよう-</p>
            </div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;"/>
            <!-- 会社情報 -->
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr><td style="padding-bottom:3px;"><span style="font-size:13px;font-weight:700;color:#1e293b;">CLAIRホールディングス株式会社</span></td></tr>
              <tr><td style="font-size:12px;color:#475569;line-height:1.8;">〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br/>TEL：019-681-3667　FAX：050-3385-7788<br/>営業時間：10:00〜18:00</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 0;"/>
          </td>
        </tr>
        <!-- フッター -->
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">このメールはVIOLA Pure福利厚生ポータルより自動送信されています。<br/>心当たりのない場合はこのメールを破棄してください。</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const resend = getResend()
  const result = await resend.emails.send({
    from: `CLAIRホールディングス株式会社 <${FROM_ADDRESS}>`,
    to,
    subject,
    text: textBody,
    html: htmlBody,
  })
  return { success: true, id: result.data?.id }
}

// ──────────────────────────────────────────────────────────────────────────────
// 保険相談申込メール（生命保険 / 損害保険 共通）
// ──────────────────────────────────────────────────────────────────────────────
export interface InsuranceApplicationData {
  memberId:     string
  name:         string
  phone:        string
  email:        string
  agency:       string                 // 紹介代理店
  schedule1:    string
  schedule2:    string
  schedule3:    string
  insuranceType: "life" | "non_life"   // life=生命保険, non_life=損害保険
  products?:    string[]               // 損害保険のみ：希望商品
  note?:        string
}

export async function sendInsuranceApplicationEmail({
  to, isAdmin, data,
}: {
  to: string | string[]
  isAdmin: boolean
  data: InsuranceApplicationData
}) {
  const { memberId, name, phone, email, agency, schedule1, schedule2, schedule3, insuranceType, products, note } = data
  const isLife = insuranceType === "life"
  const typeName = isLife ? "生命保険" : "損害保険"
  const icon     = isLife ? "🛡️" : "🚗"

  const rows = [
    ["第1希望日時", schedule1],
    ["第2希望日時", schedule2],
    ["第3希望日時", schedule3],
    ...(!isLife && products && products.length > 0 ? [["希望損保商品", products.join("、")]] : []),
    ["備考", note || "なし"],
  ]

  if (isAdmin) {
    const subject = `【${typeName}相談申込】${name} 様からのお申し込みが届きました`
    const textBody = `
${typeName}相談申込フォームに新しいお申し込みが届きました。

────────────────────────────────────
お申込者情報
────────────────────────────────────
会員ID       : ${memberId || "未入力"}
お名前       : ${name}
電話番号     : ${phone}
メール       : ${email}
紹介代理店   : ${agency}
────────────────────────────────────
ご相談希望日程
────────────────────────────────────
${rows.map(([k, v]) => `${String(k).padEnd(16, "　")} : ${v}`).join("\n")}
────────────────────────────────────

このメールはVIOLA Pure福利厚生ポータルより自動送信されています。
`.trim()

    const htmlRows = rows.map(([k, v]) => `
      <tr>
        <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;white-space:nowrap;width:160px;">${k}</td>
        <td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${v || "―"}</td>
      </tr>`).join("")

    const htmlBody = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0a1628 0%,#122444 100%);padding:28px 36px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">${icon}</div>
            <div style="color:#c9a84c;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">NEW APPLICATION</div>
            <div style="color:#ffffff;font-size:20px;font-weight:700;">${typeName}相談申込</div>
            <div style="color:rgba(255,255,255,0.55);font-size:12px;margin-top:4px;">新しいお申し込みが届きました</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 20px;">
            <div style="font-size:11px;font-weight:700;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">お申込者情報</div>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;white-space:nowrap;width:160px;">会員ID</td><td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${memberId || "未入力"}</td></tr>
              <tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;">お名前</td><td style="padding:8px 14px;font-size:14px;font-weight:700;color:#0a1628;border:1px solid #e5e7eb;">${name} 様</td></tr>
              <tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;">電話番号</td><td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${phone}</td></tr>
              <tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;">メールアドレス</td><td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${email}</td></tr>
              <tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;">紹介代理店</td><td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${agency}</td></tr>
            </table>
            <div style="font-size:11px;font-weight:700;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">ご相談希望日程</div>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
              ${htmlRows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">このメールはVIOLA Pure福利厚生ポータルより自動送信されています。</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

    const resend = getResend()
    const result = await resend.emails.send({
      from: `CLAIRホールディングス株式会社 <${FROM_ADDRESS}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    })
    return { success: true, id: result.data?.id }
  } else {
    // お客様確認メール
    const subject = `【${typeName}相談申込】お申し込みを受け付けました`
    const textBody = `
${name} 様

${typeName}のご相談をお申し込みいただきありがとうございます。
以下の内容でお申し込みを受け付けました。

────────────────────────────────────
ご相談希望日程
────────────────────────────────────
${rows.map(([k, v]) => `${String(k).padEnd(16, "　")} : ${v}`).join("\n")}
────────────────────────────────────

※初回ご相談はオンラインでのご相談となります。
日程調整後、担当者よりご連絡いたします。

VIOLA Pure福利厚生ポータル
`.trim()

    const htmlBody = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0a1628 0%,#122444 100%);padding:28px 36px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">${icon}</div>
            <div style="color:#ffffff;font-size:20px;font-weight:700;">${typeName}相談申込</div>
            <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:8px;">お申し込みを受け付けました</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1f2937;">${name} 様</p>
            <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">${typeName}のご相談をお申し込みいただきありがとうございます。<br/>以下の内容でお申し込みを受け付けました。</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              ${rows.map(([k, v]) => `<tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;white-space:nowrap;width:160px;">${k}</td><td style="padding:8px 14px;font-size:13px;color:#1f2937;border:1px solid #e5e7eb;">${v || "―"}</td></tr>`).join("")}
            </table>
            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:14px 18px;font-size:13px;color:#92400e;">
              ※初回ご相談はオンラインでのご相談となります。<br/>日程調整後、担当者よりご連絡いたします。
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">このメールはVIOLA Pure福利厚生ポータルより自動送信されています。<br/>心当たりのない場合はこのメールを破棄してください。</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

    const resend = getResend()
    const result = await resend.emails.send({
      from: `CLAIRホールディングス株式会社 <${FROM_ADDRESS}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    })
    return { success: true, id: result.data?.id }
  }
}
