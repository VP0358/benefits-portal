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
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: "MS Mincho", "Yu Mincho", "Hiragino Mincho ProN", "Hiragino Mincho Pro", serif;
          font-size: 10pt;
          color: #000;
          background: #fff;
        }
        .print-container {
          width: 180mm;
          min-height: 267mm;
          margin: 0 auto;
          padding: 0;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        /* 画面表示用スタイル */
        @media screen {
          body {
            background: #f0f0f0;
            padding: 20px;
          }
          .print-container {
            background: #fff;
            padding: 15mm;
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
            margin: 20px auto;
          }
          .print-btn-bar {
            display: flex;
            justify-content: center;
            gap: 12px;
            padding: 12px;
            background: #1e3a5f;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
          }
          .print-btn {
            padding: 8px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          }
          .btn-print {
            background: #2196F3;
            color: #fff;
          }
          .btn-close {
            background: #9e9e9e;
            color: #fff;
          }
          body.screen-body {
            padding-top: 60px;
          }
        }
        @media print {
          .print-btn-bar {
            display: none !important;
          }
          body {
            background: #fff;
            padding: 0;
          }
          .print-container {
            margin: 0;
            padding: 0;
          }
        }

        /* ヘッダー部分 */
        .header-address {
          font-size: 11pt;
          margin-bottom: 4mm;
          line-height: 1.8;
        }
        .header-important {
          font-size: 16pt;
          font-weight: bold;
          display: inline-block;
          border: 2px solid #000;
          padding: 1mm 4mm;
          margin-bottom: 3mm;
        }
        .header-recipient {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .header-member-id {
          text-align: right;
          font-size: 10pt;
          margin-top: -8mm;
          margin-bottom: 4mm;
        }

        /* タイトル */
        .doc-title {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 3mm 0;
          margin: 3mm 0;
        }

        /* 本文 */
        .doc-body {
          font-size: 10pt;
          margin: 3mm 0;
          line-height: 1.7;
        }

        /* 詳細情報テーブル */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 3mm 0;
        }
        .info-table th,
        .info-table td {
          border: 1px solid #999;
          padding: 2.5mm 3mm;
          vertical-align: middle;
          font-size: 10pt;
        }
        .info-table th {
          background: #f0f0f0;
          font-weight: bold;
          width: 35mm;
          white-space: nowrap;
        }
        .info-table td {
          word-break: break-all;
        }

        /* マイページセクション */
        .mypage-section {
          border: 2px solid #333;
          padding: 3mm 5mm;
          margin: 4mm 0;
          background: #fafafa;
        }
        .mypage-title {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 2mm;
          border-bottom: 1px solid #ccc;
          padding-bottom: 1mm;
        }
        .mypage-info {
          font-size: 10pt;
          line-height: 2;
        }
        .mypage-url {
          color: #1a0dab;
          text-decoration: underline;
        }

        /* 会社フッター */
        .company-footer {
          margin-top: auto;
          padding-top: 5mm;
          border-top: 1px solid #666;
          font-size: 9pt;
          line-height: 1.7;
        }
        .issue-date {
          text-align: right;
          font-size: 9pt;
          margin-bottom: 2mm;
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
        {/* 宛先ヘッダー */}
        <div className="header-address">
          〒{data.postalCode}<br />
          {data.address.replace(/^〒\S+\s*/, "")}
        </div>

        <div style={{ marginBottom: "3mm" }}>
          <span className="header-important">重要</span>
        </div>

        <div className="header-recipient">
          {data.name} 様
        </div>

        <div className="header-member-id">
          会員ID　{data.memberCode}
        </div>

        {/* タイトル */}
        <div className="doc-title">登録完了のお知らせ</div>

        {/* 本文 */}
        <div className="doc-body">
          お申込みいただき誠に有難うございます。下記の通り契約完了を通知致します。<br />
          内容に間違いがないかご確認をお願い致します。今後ともよろしくお願い申し上げます。
        </div>

        {/* 詳細情報テーブル */}
        <table className="info-table">
          <tbody>
            <tr>
              <th>会員ID</th>
              <td>{data.memberCode}</td>
            </tr>
            <tr>
              <th>氏名</th>
              <td>{data.name} 様</td>
            </tr>
            <tr>
              <th>登録住所</th>
              <td>
                〒{data.postalCode}<br />
                {data.address.replace(/^〒\S+\s*/, "")}
              </td>
            </tr>
            <tr>
              <th>配送先住所</th>
              <td>
                〒{data.postalCode}<br />
                {data.address.replace(/^〒\S+\s*/, "")}
              </td>
            </tr>
            <tr>
              <th>連絡先</th>
              <td>
                TEL {data.phone}
                {data.fax ? `　　　FAX ${data.fax}` : ""}
              </td>
            </tr>
            <tr>
              <th>生年月日</th>
              <td>{data.birthDate}</td>
            </tr>
            <tr>
              <th>メールアドレス</th>
              <td>{data.email}</td>
            </tr>
            <tr>
              <th>携帯Eメール</th>
              <td>{data.mobileEmail}</td>
            </tr>
            <tr>
              <th>契約締結日</th>
              <td>{data.contractDate}</td>
            </tr>
            <tr>
              <th>紹介者情報</th>
              <td>
                {data.referrerCode && data.referrerName
                  ? `${data.referrerCode} ${data.referrerName} 様`
                  : ""}
              </td>
            </tr>
            {data.bankInfo && (
              <tr>
                <th>口座情報</th>
                <td style={{ fontSize: "9pt" }}>{data.bankInfo}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* マイページ */}
        <div className="mypage-section">
          <div className="mypage-title">マイページ</div>
          <div className="mypage-info">
            <span className="mypage-url">https://viola-pure.jp/</span><br />
            ログインID：{data.loginId}<br />
            パスワード：（別途お知らせいたします）
          </div>
        </div>

        {/* 発行日 */}
        <div className="issue-date">
          発行日　　{data.issueDate}
        </div>

        {/* 会社フッター */}
        <div className="company-footer">
          CLAIRホールディングス株式会社<br />
          〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F　TEL：019-681-3667　FAX：050-3385-7788
        </div>
      </div>
    </>
  )
}
