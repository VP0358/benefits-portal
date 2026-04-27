"use client"

import { useEffect } from "react"

interface InvoiceItem {
  id: number
  name: string
  code: string
  unitPrice: number
  quantity: number
  amount: number
  is8percent: boolean
}

interface InvoiceData {
  orderId: string
  orderNumber: string
  memberCode: string
  memberName: string
  postalCode: string
  address: string
  orderDate: string
  orderMonth: string
  items: InvoiceItem[]
  shippingFee: number
  subtotal8: number
  tax8: number
  subtotal10: number
  tax10: number
  totalAmount: number
  note: string
}

interface Props {
  data: InvoiceData
}

export default function InvoicePrint({ data }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const formatYen = (n: number) => `¥${n.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`

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
          position: relative;
          display: flex;
          flex-direction: column;
        }
        @media screen {
          body {
            background: #f0f0f0;
            padding: 20px;
          }
          .print-container {
            background: #fff;
            padding: 15mm;
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
            margin: 60px auto 20px;
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
          .btn-print { background: #2196F3; color: #fff; }
          .btn-close { background: #9e9e9e; color: #fff; }
        }
        @media print {
          .print-btn-bar { display: none !important; }
          body { background: #fff; padding: 0; }
          .print-container { margin: 0; padding: 0; }
        }

        /* ヘッダー部分 */
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4mm;
        }
        .header-address {
          font-size: 11pt;
          line-height: 1.8;
        }
        .header-right {
          text-align: right;
          font-size: 10pt;
          line-height: 2;
        }
        .total-amount-label {
          font-size: 11pt;
          font-weight: bold;
        }
        .total-amount-value {
          font-size: 18pt;
          font-weight: bold;
          color: #000;
        }
        .header-recipient {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 4mm;
        }

        /* タイトル行 */
        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 3mm 0;
          margin: 3mm 0;
        }
        .doc-title {
          font-size: 16pt;
          font-weight: bold;
          text-align: center;
          flex: 1;
        }
        .koufu-no {
          font-size: 10pt;
          white-space: nowrap;
        }

        /* 本文 */
        .doc-body {
          font-size: 10pt;
          margin: 3mm 0;
          line-height: 1.7;
        }

        /* 注文者情報 */
        .order-info {
          display: flex;
          gap: 8mm;
          margin: 3mm 0;
          font-size: 10pt;
          line-height: 1.8;
        }
        .order-info-left {
          flex: 1;
        }
        .order-info-right {
          flex: 1;
          border: 1px solid #999;
          padding: 2mm 3mm;
          font-size: 9.5pt;
        }
        .order-info-right table {
          width: 100%;
          border-collapse: collapse;
        }
        .order-info-right td {
          padding: 1mm 2mm;
        }
        .order-info-right td:first-child {
          white-space: nowrap;
          font-weight: bold;
          width: 35mm;
        }

        /* 商品テーブル */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 3mm 0;
          font-size: 9.5pt;
        }
        .items-table th {
          background: #f0f0f0;
          border: 1px solid #999;
          padding: 2mm 2mm;
          text-align: center;
          font-weight: bold;
        }
        .items-table td {
          border: 1px solid #999;
          padding: 2mm 2mm;
          vertical-align: middle;
        }
        .items-table td.right { text-align: right; }
        .items-table td.center { text-align: center; }
        .items-table .product-name { text-align: left; }

        /* 税計算エリア */
        .tax-section {
          display: flex;
          justify-content: flex-end;
          margin: 2mm 0;
        }
        .tax-table {
          border-collapse: collapse;
          font-size: 9.5pt;
          min-width: 80mm;
        }
        .tax-table td {
          padding: 1.5mm 3mm;
          border: 1px solid #ccc;
        }
        .tax-table td:last-child { text-align: right; }
        .tax-table .total-row td {
          font-weight: bold;
          font-size: 11pt;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
        }

        /* 注記 */
        .tax-note {
          font-size: 8.5pt;
          color: #333;
          margin: 1mm 0;
        }

        /* 備考 */
        .note-section {
          margin: 3mm 0;
          border: 1px solid #ccc;
          padding: 2mm 3mm;
          min-height: 10mm;
          font-size: 9.5pt;
        }
        .note-title {
          font-weight: bold;
          margin-bottom: 1mm;
        }

        /* 会社フッター */
        .company-footer {
          margin-top: auto;
          padding-top: 4mm;
          border-top: 1px solid #666;
          font-size: 8.5pt;
          line-height: 1.7;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .company-info { flex: 1; }
        .reg-number { font-size: 8pt; color: #333; }
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
        {/* ヘッダー上部：住所 ＋ ID番号・合計金額 */}
        <div className="header-top">
          <div>
            <div className="header-address">
              〒{data.postalCode}<br />
              {data.address.replace(/^〒\S+\s*/, "")}
            </div>
            <div className="header-recipient" style={{ marginTop: "3mm" }}>
              {data.memberName} 様
            </div>
          </div>
          <div className="header-right">
            <div>ID番号　{data.memberCode}</div>
            <div className="total-amount-label" style={{ marginTop: "2mm" }}>合計金額(税込)</div>
            <div className="total-amount-value">{formatYen(data.totalAmount)}</div>
          </div>
        </div>

        {/* 本文 */}
        <div className="doc-body">
          ご購入いただき誠にありがとうございます。下記の通り納品致します。
        </div>

        {/* タイトル + 交付No */}
        <div className="title-row">
          <div className="doc-title">納品書</div>
          <div className="koufu-no">交付No.{data.orderNumber}</div>
        </div>

        {/* 注文者情報 */}
        <div className="order-info">
          <div className="order-info-left">
            <div style={{ fontWeight: "bold", marginBottom: "1mm" }}>ご注文者</div>
            <div>{data.memberName} 様</div>
          </div>
          <div className="order-info-right">
            <table>
              <tbody>
                <tr>
                  <td>ご注文者ＩＤ</td>
                  <td>{data.memberCode}</td>
                </tr>
                <tr>
                  <td>ご注文者対象月</td>
                  <td>{data.orderMonth}</td>
                </tr>
                <tr>
                  <td>取引年月日</td>
                  <td>{data.orderDate}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 商品明細テーブル */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: "45%" }}>商品</th>
              <th style={{ width: "18%" }}>単価</th>
              <th style={{ width: "10%" }}>数量</th>
              <th style={{ width: "27%" }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td className="product-name">
                  {item.is8percent ? "※" : ""}{item.name}
                </td>
                <td className="right">{formatYen(item.unitPrice)}</td>
                <td className="center">{item.quantity}</td>
                <td className="right">{formatYen(item.amount)}</td>
              </tr>
            ))}
            <tr>
              <td>出荷事務手数料</td>
              <td className="right">{formatYen(data.shippingFee)}</td>
              <td className="center">1</td>
              <td className="right">{formatYen(data.shippingFee)}</td>
            </tr>
          </tbody>
        </table>

        {/* 注記 */}
        <div className="tax-note">商品名の前に「※」は軽減税率(8％)対象商品</div>

        {/* 税計算 */}
        <div className="tax-section">
          <table className="tax-table">
            <tbody>
              <tr>
                <td>※8％対象(外税)</td>
                <td>{formatYen(data.subtotal8)}</td>
              </tr>
              <tr>
                <td>※8％消費税(外税)</td>
                <td>{formatYen(data.tax8)}</td>
              </tr>
              <tr>
                <td>10％対象(外税)</td>
                <td>{formatYen(data.subtotal10)}</td>
              </tr>
              <tr>
                <td>10％消費税(外税)</td>
                <td>{formatYen(data.tax10)}</td>
              </tr>
              <tr className="total-row">
                <td>合計金額(税込)</td>
                <td>{formatYen(data.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 備考 */}
        <div className="note-section">
          <div className="note-title">◆備考◆</div>
          <div>{data.note}</div>
        </div>

        {/* 会社フッター */}
        <div className="company-footer">
          <div className="company-info">
            CLAIRホールディングス株式会社<br />
            〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F　TEL：019-681-3667　FAX：050-3385-7788
          </div>
          <div className="reg-number">登録番号 T4400001016001</div>
        </div>
      </div>
    </>
  )
}
