"use client"

import { useEffect } from "react"

interface PrintData {
  memberCode: string
  name: string
  postalCode: string
  address: string
  phone: string
  fax: string
  birthDate: string
  email: string
  mobileEmail: string
  contractDate: string
  referrerCode: string
  referrerName: string
  bankInfo: string
  loginId: string
  issueDate: string
}

interface Props {
  data: PrintData
}

export default function RegistrationCompletePrint({ data }: Props) {
  useEffect(() => {
    // ページ読み込み後に自動印刷ダイアログを表示
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          width: 100%;
          height: 100%;
        }
        body {
          font-family: "MS Mincho", "Yu Mincho", "Hiragino Mincho ProN", serif;
          font-size: 9pt;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-container {
          width: 186mm;
          max-height: 277mm;
          margin: 0 auto;
          padding: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* 画面表示用スタイル */
        @media screen {
          body {
            background: #f0f0f0;
            padding: 20px;
          }
          .print-container {
            background: #fff;
            padding: 12mm;
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
            margin: 70px auto 20px;
            max-height: none;
          }
          .print-btn-bar {
            display: flex;
            justify-content: center;
            gap: 12px;
            padding: 10px;
            background: #1e3a5f;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
          }
          .print-btn {
            padding: 7px 22px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          }
          .btn-print { background: #2196F3; color: #fff; }
          .btn-close  { background: #9e9e9e; color: #fff; }
        }
        @media print {
          .print-btn-bar { display: none !important; }
          body { background: #fff; padding: 0; }
          .print-container { margin: 0; max-height: none; }
        }

        /* ── ヘッダー ── */
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2mm;
        }
        .header-address {
          font-size: 8.5pt;
          line-height: 1.6;
        }
        .header-right {
          text-align: right;
          font-size: 8.5pt;
          line-height: 1.6;
        }
        .header-important {
          font-size: 13pt;
          font-weight: bold;
          display: inline-block;
          border: 2px solid #000;
          padding: 0.5mm 3mm;
          margin-bottom: 1.5mm;
        }
        .header-recipient {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 1mm;
        }

        /* ── タイトル ── */
        .doc-title {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 2mm 0;
          margin: 2mm 0;
        }

        /* ── 本文 ── */
        .doc-body {
          font-size: 8.5pt;
          margin: 2mm 0;
          line-height: 1.6;
        }

        /* ── 詳細テーブル ── */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 2mm 0;
        }
        .info-table th,
        .info-table td {
          border: 1px solid #999;
          padding: 1.5mm 2.5mm;
          vertical-align: middle;
          font-size: 8.5pt;
        }
        .info-table th {
          background: #f0f0f0;
          font-weight: bold;
          width: 32mm;
          white-space: nowrap;
        }
        .info-table td {
          word-break: break-all;
        }

        /* ── マイページ ── */
        .mypage-section {
          border: 1.5px solid #333;
          padding: 2mm 4mm;
          margin: 2mm 0;
          background: #fafafa;
        }
        .mypage-title {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 1mm;
          border-bottom: 1px solid #ccc;
          padding-bottom: 0.5mm;
        }
        .mypage-info {
          font-size: 8.5pt;
          line-height: 1.8;
        }
        .mypage-url { color: #1a0dab; text-decoration: underline; }
        .mypage-note {
          font-size: 8pt;
          color: #555;
          margin-top: 1.5mm;
          padding-top: 1.5mm;
          border-top: 1px dashed #ccc;
        }
        .pw-highlight {
          font-weight: bold;
          font-size: 10.5pt;
          color: #cc0000;
          letter-spacing: 0.1em;
        }

        /* ── フッター ── */
        .footer-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 2mm;
          padding-top: 2mm;
          border-top: 1px solid #666;
        }
        .company-footer {
          font-size: 8pt;
          line-height: 1.6;
        }
        .issue-date {
          font-size: 8.5pt;
          text-align: right;
          white-space: nowrap;
        }
      `}</style>

      {/* 画面表示ボタンバー */}
      <div className="print-btn-bar">
        <button className="print-btn btn-print" onClick={() => window.print()}>
          🖨️ 印刷
        </button>
        <button className="print-btn btn-close" onClick={() => window.close()}>
          ✕ 閉じる
        </button>
      </div>

      <div className="print-container">
        {/* ── ヘッダー ── */}
        <div className="header-row">
          <div>
            <div className="header-address">
              〒{data.postalCode}<br />
              {data.address.replace(/^〒\S+\s*/, "")}
            </div>
            <div style={{ marginTop: "1.5mm" }}>
              <span className="header-important">重要</span>
            </div>
            <div className="header-recipient" style={{ marginTop: "1mm" }}>
              {data.name} 様
            </div>
          </div>
          <div className="header-right">
            <div style={{ fontWeight: "bold", fontSize: "9pt" }}>CLAIRホールディングス株式会社</div>
            <div>〒020-0026 岩手県盛岡市開運橋通5-6</div>
            <div>第五菱和ビル5F</div>
            <div>TEL：019-681-3667</div>
            <div style={{ marginTop: "1mm" }}>会員ID　{data.memberCode}</div>
          </div>
        </div>

        {/* ── タイトル ── */}
        <div className="doc-title">登録完了のお知らせ</div>

        {/* ── 本文 ── */}
        <div className="doc-body">
          お申込みいただき誠に有難うございます。下記の通り契約完了を通知致します。
          内容に間違いがないかご確認をお願い致します。今後ともよろしくお願い申し上げます。
        </div>

        {/* ── 詳細テーブル ── */}
        <table className="info-table">
          <tbody>
            <tr>
              <th>会員ID</th>
              <td>{data.memberCode}</td>
              <th style={{ width: "28mm" }}>契約締結日</th>
              <td>{data.contractDate}</td>
            </tr>
            <tr>
              <th>氏名</th>
              <td>{data.name} 様</td>
              <th>生年月日</th>
              <td>{data.birthDate}</td>
            </tr>
            <tr>
              <th>登録・配送住所</th>
              <td colSpan={3}>
                〒{data.postalCode}　{data.address.replace(/^〒\S+\s*/, "")}
              </td>
            </tr>
            <tr>
              <th>連絡先</th>
              <td>
                TEL {data.phone}
                {data.fax ? `　　FAX ${data.fax}` : ""}
              </td>
              <th>紹介者</th>
              <td>
                {data.referrerCode && data.referrerName
                  ? `${data.referrerCode} ${data.referrerName} 様`
                  : "―"}
              </td>
            </tr>
            <tr>
              <th>メールアドレス</th>
              <td>{data.email || "―"}</td>
              <th>携帯Eメール</th>
              <td>{data.mobileEmail || "―"}</td>
            </tr>
            {data.bankInfo && (
              <tr>
                <th>口座情報</th>
                <td colSpan={3} style={{ fontSize: "8pt" }}>{data.bankInfo}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── マイページ ── */}
        <div className="mypage-section">
          <div className="mypage-title">マイページ ログイン情報</div>
          <div className="mypage-info">
            URL：<span className="mypage-url">https://viola-pure.xyz/</span>　
            ログインID：<strong>{data.loginId}</strong>（ご自身の会員ID）　
            初期パスワード：<span className="pw-highlight">0000</span>
          </div>
          <div className="mypage-note">
            ※ 初回ログイン後、必ずマイページの「パスワード変更」からご自身でパスワードを変更してください。
          </div>
        </div>

        {/* ── フッター ── */}
        <div className="footer-row">
          <div className="company-footer">
            CLAIRホールディングス株式会社<br />
            〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F<br />
            TEL：019-681-3667　FAX：050-3385-7788
          </div>
          <div className="issue-date">
            発行日　{data.issueDate}
          </div>
        </div>
      </div>
    </>
  )
}
