"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Download, FileText, Printer, ArrowLeft, Package,
  Truck, AlertCircle, RefreshCw, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react"

// ─── 型定義 ──────────────────────────────────────────
interface OrderItem {
  id: number; productCode: string; productName: string
  unitPrice: number; quantity: number; lineAmount: number
}
interface DeliveryOrder {
  id: number; orderNumber: string; orderedAt: string
  paidAt: string | null; slipType: string; slipTypeLabel: string
  paymentMethod: string; paymentMethodLabel: string
  paymentStatus: string; shippingStatus: string
  note: string; noteSlip: string
  subtotalAmount: number; usedPoints: number; totalAmount: number
  memberCode: string; memberName: string; memberKana: string
  memberPhone: string; memberEmail: string
  recipientName: string; recipientCompany: string
  recipientPostal: string; recipientAddress: string; recipientPhone: string
  items: OrderItem[]
  carrier: string; trackingNumber: string
  shippedAt: string | null; itemDescription: string; itemCount: number
}

// ─── 定数 ────────────────────────────────────────────
const COMPANY = {
  name:    "CLAIRホールディングス株式会社",
  postal:  "〒020-0026",
  address: "岩手県盛岡市開運橋通5-6 第五菱和ビル5F",
  phone:   "TEL: 019-681-3667",
  fax:     "FAX: 019-681-3218",
}

// ─── 内側コンポーネント（useSearchParams使用） ────────
function DeliveryNoteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const idsParam = searchParams.get("ids") || ""
  const typeParam = searchParams.get("type") || "delivery"

  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [labelStart, setLabelStart] = useState(1)
  const [selectedCarrier, setSelectedCarrier] = useState("yamato")
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [autoOpened, setAutoOpened] = useState(false)
  const [printHTML, setPrintHTML] = useState<string | null>(null)

  // データ取得
  useEffect(() => {
    if (!idsParam) { setError("伝票IDが指定されていません"); setLoading(false); return }
    fetch(`/api/admin/orders-shipping/delivery-note?ids=${idsParam}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setOrders(d.orders)
        else setError(d.error || "取得エラー")
      })
      .catch(() => setError("通信エラー"))
      .finally(() => setLoading(false))
  }, [idsParam])

  // ── 納品書HTML生成（添付サンプルPDF準拠レイアウト） ──
  const buildDeliveryNoteHTML = useCallback((orderList: DeliveryOrder[]) => {
    const pages = orderList.map(o => {
      // 注文日
      const orderedDate = new Date(o.orderedAt)
      const dateStr = `${orderedDate.getFullYear()}年${orderedDate.getMonth()+1}月${orderedDate.getDate()}日`
      // 対象月（orderedAtの年月）
      const targetMonth = `${orderedDate.getFullYear()}年${orderedDate.getMonth()+1}月度`

      // 税率計算
      let subtotal8 = 0
      let subtotal10 = 0
      const SHIPPING_FEE = 880

      const itemRows = o.items.map(item => {
        const is8 = item.productName.startsWith("※")
        if (is8) subtotal8 += item.lineAmount
        else subtotal10 += item.lineAmount
        return `
          <tr>
            <td style="padding:5px 8px;border-bottom:1px solid #d1d5db;font-size:11px;">${item.productName}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #d1d5db;text-align:right;font-size:11px;">¥${item.unitPrice.toLocaleString()}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #d1d5db;text-align:center;font-size:11px;">${item.quantity}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #d1d5db;text-align:right;font-size:11px;">¥${item.lineAmount.toLocaleString()}</td>
          </tr>`
      }).join("")

      // 出荷事務手数料は10%
      subtotal10 += SHIPPING_FEE
      const shippingFeeRow = `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #d1d5db;font-size:11px;">出荷事務手数料</td>
          <td style="padding:5px 8px;border-bottom:1px solid #d1d5db;text-align:right;font-size:11px;">¥${SHIPPING_FEE.toLocaleString()}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #d1d5db;text-align:center;font-size:11px;">1</td>
          <td style="padding:5px 8px;border-bottom:1px solid #d1d5db;text-align:right;font-size:11px;">¥${SHIPPING_FEE.toLocaleString()}</td>
        </tr>`

      const tax8  = Math.floor(subtotal8  * 0.08)
      const tax10 = Math.floor(subtotal10 * 0.10)

      // 交付Noは注文IDを使用
      const kouhuNo = o.id.toString().padStart(9, "0")

      return `
        <div style="page-break-after:always;padding:20px 28px 16px;font-family:'Noto Sans JP','Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;font-size:11px;max-width:720px;margin:0 auto;box-sizing:border-box;color:#111;">

          <!-- 宛先ブロック（左上） -->
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;">〒${o.recipientPostal}</div>
            <div style="font-size:12px;margin:2px 0;">${o.recipientAddress}</div>
            <div style="font-size:18px;font-weight:700;margin:6px 0 2px;">${o.recipientName} 様</div>
            <div style="font-size:11px;color:#374151;">ID番号　${o.memberCode}</div>
          </div>

          <!-- 合計金額（右上に配置） -->
          <div style="text-align:right;margin-bottom:4px;">
            <div style="font-size:13px;font-weight:700;">合計金額(税込)</div>
            <div style="font-size:22px;font-weight:700;">¥${o.totalAmount.toLocaleString()}</div>
          </div>

          <!-- ごあいさつ文 -->
          <div style="font-size:11px;margin-bottom:8px;line-height:1.8;">
            ご購入いただき誠にありがとうございます。<br>
            下記の通り納品致します。
          </div>

          <!-- 中段：ご注文者情報 + 納品書タイトル・交付No -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <!-- 左：ご注文者 -->
            <div style="font-size:11px;line-height:2;">
              <div style="font-weight:700;margin-bottom:2px;">ご注文者</div>
              <div style="font-weight:700;">${o.memberName} 様</div>
              <div style="display:flex;gap:24px;margin-top:4px;">
                <table style="border-collapse:collapse;font-size:11px;">
                  <tr>
                    <td style="padding:2px 8px 2px 0;white-space:nowrap;font-weight:600;">ご注文者ＩＤ</td>
                    <td style="padding:2px 0;">${o.memberCode}</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 8px 2px 0;white-space:nowrap;font-weight:600;">ご注文者対象月</td>
                    <td style="padding:2px 0;">${targetMonth}</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 8px 2px 0;white-space:nowrap;font-weight:600;">取引年月日</td>
                    <td style="padding:2px 0;">${dateStr}</td>
                  </tr>
                </table>
              </div>
            </div>
            <!-- 右：納品書タイトル + 交付No + 会社情報 -->
            <div style="text-align:right;">
              <div style="font-size:22px;font-weight:700;letter-spacing:4px;margin-bottom:2px;">納　品　書</div>
              <div style="font-size:11px;margin-bottom:8px;">交付No.${kouhuNo}</div>
              <div style="font-size:11px;font-weight:700;">${COMPANY.name}</div>
              <div style="font-size:10px;color:#374151;">${COMPANY.postal} ${COMPANY.address}</div>
              <div style="font-size:10px;color:#374151;">${COMPANY.phone}　FAX：050-3385-7788</div>
              <div style="font-size:10px;color:#374151;">登録番号 T4400001016001</div>
            </div>
          </div>

          <!-- 商品明細テーブル -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:4px;border:1px solid #9ca3af;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:5px 8px;text-align:left;font-size:11px;border:1px solid #9ca3af;font-weight:700;">商品</th>
                <th style="padding:5px 8px;text-align:right;font-size:11px;border:1px solid #9ca3af;font-weight:700;width:90px;">単価</th>
                <th style="padding:5px 8px;text-align:center;font-size:11px;border:1px solid #9ca3af;font-weight:700;width:55px;">数量</th>
                <th style="padding:5px 8px;text-align:right;font-size:11px;border:1px solid #9ca3af;font-weight:700;width:100px;">金額</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              ${shippingFeeRow}
            </tbody>
          </table>

          <!-- 軽減税率注記 -->
          <div style="font-size:9px;color:#374151;margin-bottom:6px;">商品名の前に「※」は軽減税率(8％)対象商品</div>

          <!-- 税計算（右寄せ） -->
          <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
            <table style="border-collapse:collapse;font-size:11px;min-width:260px;">
              <tr>
                <td style="padding:3px 10px;text-align:left;border-bottom:1px solid #e5e7eb;">※8％対象(外税)</td>
                <td style="padding:3px 10px;text-align:right;border-bottom:1px solid #e5e7eb;">¥${subtotal8.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:3px 10px;text-align:left;border-bottom:1px solid #e5e7eb;">※8％消費税(外税)</td>
                <td style="padding:3px 10px;text-align:right;border-bottom:1px solid #e5e7eb;">¥${tax8.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:3px 10px;text-align:left;border-bottom:1px solid #e5e7eb;">10％対象(外税)</td>
                <td style="padding:3px 10px;text-align:right;border-bottom:1px solid #e5e7eb;">¥${subtotal10.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:3px 10px;text-align:left;border-bottom:1px solid #9ca3af;">10％消費税(外税)</td>
                <td style="padding:3px 10px;text-align:right;border-bottom:1px solid #9ca3af;">¥${tax10.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:5px 10px;text-align:left;font-weight:700;border-bottom:2px solid #111;">合計金額(税込)</td>
                <td style="padding:5px 10px;text-align:right;font-weight:700;border-bottom:2px solid #111;">¥${o.totalAmount.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <!-- 備考 -->
          <div style="font-size:11px;font-weight:700;margin-bottom:2px;">◆備考◆</div>
          <div style="font-size:11px;min-height:20px;border-top:1px solid #d1d5db;padding-top:4px;">
            ${o.noteSlip || o.note || ""}
          </div>
        </div>
      `
    }).join("")

    return `<!DOCTYPE html><html lang="ja"><head>
      <meta charset="UTF-8">
      <title>納品書</title>
      <style>
        @media print {
          body { margin: 0; }
          @page { margin: 8mm; size: A4; }
        }
        body { font-family: 'Noto Sans JP', 'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; }
      </style>
    </head><body>${pages}</body></html>`
  }, [])

  // ── 領収書HTML生成 ─────────────────────────────────
  const buildReceiptHTML = useCallback((orderList: DeliveryOrder[]) => {
    const pages = orderList.map(o => {
      const dateStr = o.paidAt
        ? new Date(o.paidAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
        : new Date(o.orderedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
      return `
        <div style="page-break-after:always;padding:32px 40px;font-family:'Noto Sans JP','Yu Gothic',sans-serif;font-size:12px;max-width:640px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="font-size:28px;font-weight:700;letter-spacing:8px;margin:0 0 4px;">領　収　書</h1>
            <div style="font-size:11px;color:#9ca3af;">${dateStr}</div>
          </div>
          <div style="margin-bottom:20px;border-bottom:2px solid #1d4ed8;padding-bottom:16px;">
            ${o.recipientCompany ? `<div style="font-size:13px;">${o.recipientCompany}</div>` : ""}
            <div style="font-size:22px;font-weight:700;">${o.recipientName} 様</div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="font-size:13px;color:#6b7280;">金額</div>
            <div style="font-size:32px;font-weight:700;color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:4px;min-width:200px;text-align:right;">
              ¥${o.totalAmount.toLocaleString()} -
            </div>
            <div style="font-size:11px;color:#6b7280;">（税込）</div>
          </div>
          <div style="font-size:12px;color:#374151;margin-bottom:20px;">
            <strong>但し:</strong> ${o.items.map(i => `${i.productName} 代として`).join("、")}
          </div>
          <div style="text-align:right;font-size:12px;border-top:1px solid #e5e7eb;padding-top:16px;margin-bottom:20px;">
            <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${COMPANY.name}</div>
            <div style="color:#6b7280;">${COMPANY.postal} ${COMPANY.address}</div>
            <div style="color:#6b7280;">${COMPANY.phone}</div>
            <div style="margin-top:12px;font-size:13px;color:#1d4ed8;font-weight:600;">（印）</div>
          </div>
          <div style="font-size:10px;color:#9ca3af;text-align:center;border-top:1px dotted #e5e7eb;padding-top:8px;">
            注文番号: ${o.orderNumber}　会員コード: ${o.memberCode}
          </div>
        </div>
      `
    }).join("")

    return `<!DOCTYPE html><html lang="ja"><head>
      <meta charset="UTF-8">
      <title>領収書</title>
      <style>
        @media print { body { margin: 0; } @page { margin: 10mm; size: A4; } }
        body { font-family: 'Noto Sans JP', 'Yu Gothic', 'Hiragino Sans', sans-serif; }
      </style>
    </head><body>${pages}</body></html>`
  }, [])

  // ── 登録完了通知書HTML生成 ──────────────────────────
  const buildRegistrationNoticeHTML = useCallback((orderList: DeliveryOrder[]) => {
    const pages = orderList.map(o => {
      const dateStr = new Date(o.orderedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
      return `
        <div style="page-break-after:always;padding:36px 40px;font-family:'Noto Sans JP','Yu Gothic',sans-serif;font-size:12px;max-width:680px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:32px;border-bottom:3px solid #1d4ed8;padding-bottom:16px;">
            <h1 style="font-size:26px;font-weight:700;color:#1d4ed8;letter-spacing:5px;margin:0 0 4px;">登録完了通知書</h1>
            <div style="font-size:11px;color:#6b7280;letter-spacing:2px;">Registration Completion Notice</div>
          </div>
          <div style="text-align:right;font-size:12px;margin-bottom:24px;color:#374151;">${dateStr}</div>
          <div style="margin-bottom:28px;">
            ${o.recipientCompany ? `<div style="font-size:14px;color:#374151;margin-bottom:2px;">${o.recipientCompany}</div>` : ""}
            <div style="font-size:22px;font-weight:700;border-bottom:2px solid #374151;padding-bottom:6px;display:inline-block;">${o.memberName} 様</div>
            <div style="font-size:11px;color:#6b7280;margin-top:6px;">会員コード: ${o.memberCode}</div>
          </div>
          <div style="font-size:13px;line-height:2.2;margin-bottom:28px;color:#374151;">
            <p style="margin:0 0 8px;">このたびはCLAIR会員へのご登録をいただき、誠にありがとうございます。</p>
            <p style="margin:0;">以下の内容にて登録が完了いたしましたことをお知らせいたします。</p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:12px;">
            <tbody>
              <tr style="background:#eff6ff;">
                <td style="padding:11px 18px;font-weight:600;border:1px solid #bfdbfe;width:38%;color:#1d4ed8;">会員コード</td>
                <td style="padding:11px 18px;border:1px solid #bfdbfe;">${o.memberCode}</td>
              </tr>
              <tr>
                <td style="padding:11px 18px;font-weight:600;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;">お名前</td>
                <td style="padding:11px 18px;border:1px solid #bfdbfe;">${o.memberName}</td>
              </tr>
              <tr style="background:#eff6ff;">
                <td style="padding:11px 18px;font-weight:600;border:1px solid #bfdbfe;color:#1d4ed8;">ご登録種別</td>
                <td style="padding:11px 18px;border:1px solid #bfdbfe;">${o.slipTypeLabel}</td>
              </tr>
              <tr>
                <td style="padding:11px 18px;font-weight:600;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;">ご登録日</td>
                <td style="padding:11px 18px;border:1px solid #bfdbfe;">${dateStr}</td>
              </tr>
              <tr style="background:#eff6ff;">
                <td style="padding:11px 18px;font-weight:600;border:1px solid #bfdbfe;color:#1d4ed8;">お支払方法</td>
                <td style="padding:11px 18px;border:1px solid #bfdbfe;">${o.paymentMethodLabel}</td>
              </tr>
              <tr>
                <td style="padding:11px 18px;font-weight:600;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;">ご注文商品</td>
                <td style="padding:11px 18px;border:1px solid #bfdbfe;">${o.items.map(i => `${i.productName} × ${i.quantity}`).join("、")}</td>
              </tr>
              <tr style="background:#eff6ff;">
                <td style="padding:11px 18px;font-weight:600;border:1px solid #bfdbfe;color:#1d4ed8;">ご請求金額</td>
                <td style="padding:11px 18px;border:1px solid #bfdbfe;font-weight:700;font-size:16px;color:#1d4ed8;">¥${o.totalAmount.toLocaleString()}（税込）</td>
              </tr>
            </tbody>
          </table>
          <div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;font-size:11px;margin-bottom:28px;color:#374151;">
            <strong>お届け先:</strong> 〒${o.recipientPostal}　${o.recipientAddress}
          </div>
          <div style="text-align:right;font-size:12px;border-top:1px solid #e5e7eb;padding-top:18px;">
            <div style="font-weight:700;font-size:15px;margin-bottom:2px;">${COMPANY.name}</div>
            <div style="color:#6b7280;">${COMPANY.postal} ${COMPANY.address}</div>
            <div style="color:#6b7280;">${COMPANY.phone}</div>
          </div>
          ${o.note ? `<div style="margin-top:14px;font-size:11px;color:#6b7280;border-top:1px dotted #e5e7eb;padding-top:10px;">備考: ${o.note}</div>` : ""}
        </div>
      `
    }).join("")

    return `<!DOCTYPE html><html lang="ja"><head>
      <meta charset="UTF-8">
      <title>登録完了通知書</title>
      <style>
        @media print { body { margin: 0; } @page { margin: 10mm; size: A4; } }
        body { font-family: 'Noto Sans JP', 'Yu Gothic', 'Hiragino Sans', sans-serif; }
      </style>
    </head><body>${pages}</body></html>`
  }, [])

  // ── 印刷/PDFウィンドウを開く ──────────────────────────
  const openPrintWindow = useCallback((html: string) => {
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) {
      // ポップアップブロック時はiframeフォールバックを使用
      setPrintHTML(html)
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 600)
  }, [])

  // ── ヤマトCSV出力 ─────────────────────────────────────
  const downloadYamatoCSV = useCallback(() => {
    if (orders.length === 0) { alert("対象伝票がありません"); return }
    const url = `/api/admin/orders-shipping/yamato-csv?ids=${idsParam}`
    const a = document.createElement("a")
    a.href = url
    a.download = `yamato_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }, [orders.length, idsParam])

  // ── ボタンハンドラ ────────────────────────────────────
  const handlePrintDeliveryNote = useCallback(() => {
    if (orders.length === 0) return
    openPrintWindow(buildDeliveryNoteHTML(orders))
  }, [orders, openPrintWindow, buildDeliveryNoteHTML])

  const handlePrintReceipt = useCallback(() => {
    if (orders.length === 0) return
    openPrintWindow(buildReceiptHTML(orders))
  }, [orders, openPrintWindow, buildReceiptHTML])

  const handlePrintRegistrationNotice = useCallback(() => {
    if (orders.length === 0) return
    openPrintWindow(buildRegistrationNoticeHTML(orders))
  }, [orders, openPrintWindow, buildRegistrationNoticeHTML])

  // typeパラメータに応じて自動で印刷ダイアログ表示
  useEffect(() => {
    if (!autoOpened && !loading && orders.length > 0) {
      setAutoOpened(true)
      setTimeout(() => {
        let html = ""
        if (typeParam === "receipt") {
          html = buildReceiptHTML(orders)
        } else {
          // delivery（デフォルト）
          html = buildDeliveryNoteHTML(orders)
        }
        // ポップアップを試みる
        const win = window.open("", "_blank", "width=900,height=700")
        if (win) {
          win.document.write(html)
          win.document.close()
          win.focus()
          setTimeout(() => { win.print() }, 600)
        } else {
          // ポップアップがブロックされた場合: printHTMLステートに設定し
          // IFRAMEを使って印刷
          setPrintHTML(html)
        }
      }, 800)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, orders.length, typeParam])

  // ── ローディング ──────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mr-3" />
      <span className="text-gray-500">データ読み込み中...</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <span className="text-red-500 text-sm">{error}</span>
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
        <ArrowLeft className="w-4 h-4" />戻る
      </button>
    </div>
  )

  // ── 商品集計（出庫リスト用） ────────────────────────────
  const productTotals: Record<string, number> = {}
  orders.forEach(o => o.items.forEach(i => {
    productTotals[i.productName] = (productTotals[i.productName] || 0) + i.quantity
  }))

  return (
    <div className="space-y-4 text-sm">
      {/* ポップアップブロック時のフォールバック印刷用iframe */}
      {printHTML && (
        <iframe
          key={printHTML.slice(0, 50)}
          style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", border: "none", zIndex: 9999, background: "white" }}
          srcDoc={printHTML}
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement
            setTimeout(() => {
              iframe.contentWindow?.print()
            }, 500)
          }}
        />
      )}
      {/* ── タイトル + 戻るボタン ── */}
      <div className="rounded-2xl bg-white border border-stone-100 px-5 py-4 flex items-center justify-between"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#c9a84c" }}>Delivery Note</p>
          <h1 className="text-xl font-bold text-stone-900">納品書・出庫リスト</h1>
          <p className="text-xs text-stone-400 mt-0.5">選択された伝票 <strong className="text-stone-700">{orders.length}</strong> 件</p>
        </div>
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4" />受注発送一覧へ戻る
        </button>
      </div>

      {/* ══════════════════════════════════════════
          ダウンロード・印刷パネル（メイン操作）
      ══════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

        {/* ── 完了セクション & 出庫リスト ── */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-gray-700">完了</span>
          </div>

          {/* ダウンロード・印刷ボタン */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">納品書 ダウンロード・印刷</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={handlePrintDeliveryNote}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 font-medium shadow-sm">
                <Printer className="w-4 h-4 flex-shrink-0" />
                納品書を印刷・PDF保存（{orders.length}件）
              </button>
              <button onClick={handlePrintReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium shadow-sm">
                <FileText className="w-4 h-4 flex-shrink-0" />
                領収書を印刷・PDF保存（{orders.length}件）
              </button>
              <button onClick={handlePrintRegistrationNotice}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 font-medium shadow-sm">
                <FileText className="w-4 h-4 flex-shrink-0" />
                登録完了通知書（{orders.length}件）
              </button>
            </div>
            <p className="text-xs text-gray-400">※ ブラウザの印刷ダイアログで「PDFに保存」を選択するとダウンロードできます</p>
          </div>

          {/* 出庫リスト */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">出庫リスト</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
              {Object.entries(productTotals).map(([name, qty]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-gray-700">{name}</span>
                  <span className="font-semibold text-gray-900 bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{qty}個</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-200 pt-1.5 mt-1">
                <span className="text-gray-500">出荷事務手数料</span>
                <span className="font-semibold text-gray-700">{orders.length}個</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ラベルサイズ詳細 ── */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">ラベルサイズ詳細</h3>
          <div className="flex items-start gap-8">
            {/* 寸法図 */}
            <div className="flex-shrink-0">
              <div className="relative border-2 border-gray-400 rounded flex items-center justify-center bg-white"
                style={{ width: 76, height: 120 }}>
                {/* 横幅ラベル */}
                <div className="absolute -top-4 left-0 right-0 text-center text-xs text-gray-400" style={{ fontSize: 9 }}>210mm</div>
                {/* 高さラベル */}
                <div className="absolute -right-6 top-0 bottom-0 flex items-center text-xs text-gray-400" style={{ fontSize: 9, writingMode: "vertical-rl" }}>297mm</div>
                <div className="border border-dashed border-blue-300 m-2 flex items-center justify-center text-gray-300" style={{ flex: 1, fontSize: 8 }}>
                  <span>42mm×<br/>148mm</span>
                </div>
              </div>
              <div className="text-xs text-gray-400 text-center mt-1" style={{ fontSize: 9 }}>A4ラベル用紙</div>
            </div>

            {/* ラベルグリッド（2列×6行 = 12枚） */}
            <div>
              <div className="grid grid-cols-2 gap-0.5 border border-gray-400 bg-gray-400"
                style={{ width: 128 }}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <div key={n}
                    className={`flex items-center justify-center text-sm font-medium border border-gray-300 
                      ${n < labelStart ? "bg-gray-200 text-gray-300" : n === labelStart ? "bg-blue-100 text-blue-700 font-bold" : "bg-white text-gray-600"}`}
                    style={{ height: 32 }}>
                    {n}
                  </div>
                ))}
              </div>
              {/* 印刷開始位置 */}
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-xs text-gray-500 whitespace-nowrap">印刷開始位置指定</span>
                <input
                  type="number" min={1} max={12} value={labelStart}
                  onChange={e => setLabelStart(Math.min(12, Math.max(1, Number(e.target.value))))}
                  className="border border-gray-300 rounded px-1.5 py-0.5 text-sm w-14 text-center"
                />
                <button
                  onClick={handlePrintDeliveryNote}
                  className="px-3 py-1 bg-gray-200 border border-gray-400 rounded text-xs hover:bg-gray-300 font-medium">
                  ラベル作成
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── アクションボタン群（スクショ準拠） ── */}
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* 配送会社選択 + 配送用CSV出力 */}
            <div className="flex items-center shadow-sm">
              <select
                value={selectedCarrier}
                onChange={e => setSelectedCarrier(e.target.value)}
                className="border border-gray-400 rounded-l px-2.5 py-1.5 text-sm bg-white focus:outline-none">
                <option value="yamato">クロネコヤマト運輸</option>
                <option value="sagawa">佐川急便</option>
                <option value="japan_post">日本郵便</option>
              </select>
              <button
                onClick={downloadYamatoCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white border border-orange-600 rounded-r text-sm hover:bg-orange-600 font-medium transition-colors">
                <Download className="w-3.5 h-3.5" />配送用CSV出力
              </button>
            </div>

            {/* 契約書面用ラベル */}
            <button
              onClick={handlePrintDeliveryNote}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-400 rounded text-sm hover:bg-gray-50 transition-colors">
              <Printer className="w-3.5 h-3.5" />契約書面用ラベル
            </button>

            {/* 登録完了通知書 */}
            <button
              onClick={handlePrintRegistrationNotice}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-400 text-blue-700 rounded text-sm hover:bg-blue-50 font-medium transition-colors">
              <FileText className="w-3.5 h-3.5" />登録完了通知書
            </button>
          </div>

          {/* PDF ダウンロードボタン群 */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-gray-500 font-medium">PDFダウンロード：</span>
            <button onClick={handlePrintDeliveryNote}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium transition-colors">
              <Download className="w-3.5 h-3.5" />納品書
            </button>
            <button onClick={handlePrintReceipt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium transition-colors">
              <Download className="w-3.5 h-3.5" />領収書
            </button>
            <button onClick={handlePrintRegistrationNotice}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 font-medium transition-colors">
              <Download className="w-3.5 h-3.5" />登録完了通知書
            </button>
          </div>

          {/* 注意書き */}
          <div className="text-xs text-red-600 bg-red-50 rounded p-2.5 mb-2 leading-relaxed border border-red-200">
            【配送用CSV出力】【ラベル作成】は同梱処理用のデータではありません。<br />
            同梱対応のデータは、同梱処理画面から【同梱対応:配送用CSV出力】【同梱対応:ラベル作成】を使用してください。
          </div>
          <div className="text-xs text-gray-400 leading-relaxed">
            PDFファイルのご覧には Adobe Reader が必要です。
            お持ちでない方はアドビシステムズ社サイトから無償でお入手いただけます。
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          選択伝票プレビュー一覧
      ══════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="bg-blue-600 px-4 py-2.5 text-white font-semibold text-sm flex items-center gap-2">
          <Package className="w-4 h-4" />
          対象伝票一覧（{orders.length}件）
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-left">
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">注文番号</th>
                <th className="px-3 py-2">注文日</th>
                <th className="px-3 py-2">会員</th>
                <th className="px-3 py-2">お届け先</th>
                <th className="px-3 py-2">商品</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2">支払</th>
                <th className="px-3 py-2">追跡番号</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <>
                  <tr key={o.id}
                    className="border-b border-gray-100 hover:bg-stone-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}>
                    <td className="px-3 py-2 text-gray-400">
                      {expandedOrderId === o.id
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">{o.orderNumber}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{o.orderedAt.slice(0,10)}</td>
                    <td className="px-3 py-2">
                      <div className="text-gray-800 font-medium">{o.memberName}</div>
                      <div className="text-gray-400 font-mono">{o.memberCode}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-gray-700">{o.recipientName}</div>
                      {o.recipientCompany && <div className="text-gray-400">{o.recipientCompany}</div>}
                      <div className="text-gray-400">〒{o.recipientPostal}</div>
                    </td>
                    <td className="px-3 py-2">
                      {o.items.map(i => (
                        <div key={i.id} className="text-gray-700">{i.productName} × <strong>{i.quantity}</strong></div>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800 whitespace-nowrap">
                      ¥{o.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        o.paymentMethod === "card" || o.paymentMethod === "credit_card"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {o.paymentMethodLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-500 text-xs">
                      {o.trackingNumber || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                  {/* 詳細展開行 */}
                  {expandedOrderId === o.id && (
                    <tr key={`${o.id}-detail`}>
                      <td colSpan={9} className="bg-blue-50/40 px-6 py-4 border-b border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <h4 className="font-semibold text-gray-600 mb-2 flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" />商品明細
                            </h4>
                            <table className="w-full">
                              <thead>
                                <tr className="text-gray-400 border-b">
                                  <td className="pb-1">商品名</td>
                                  <td className="pb-1 text-right">単価</td>
                                  <td className="pb-1 text-center">数量</td>
                                  <td className="pb-1 text-right">小計</td>
                                </tr>
                              </thead>
                              <tbody>
                                {o.items.map(i => (
                                  <tr key={i.id} className="border-b border-gray-100">
                                    <td className="py-0.5 text-gray-700">{i.productName}</td>
                                    <td className="py-0.5 text-right text-gray-500">¥{i.unitPrice.toLocaleString()}</td>
                                    <td className="py-0.5 text-center text-gray-500">{i.quantity}</td>
                                    <td className="py-0.5 text-right font-medium">¥{i.lineAmount.toLocaleString()}</td>
                                  </tr>
                                ))}
                                <tr>
                                  <td colSpan={3} className="pt-1 text-right text-gray-500">合計</td>
                                  <td className="pt-1 text-right font-bold text-gray-800">¥{o.totalAmount.toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-600 mb-2 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5" />配送情報
                            </h4>
                            <div className="space-y-0.5 text-gray-700">
                              <div><span className="text-gray-400">宛先：</span>{o.recipientName}</div>
                              <div><span className="text-gray-400">住所：</span>〒{o.recipientPostal} {o.recipientAddress}</div>
                              {o.recipientPhone && <div><span className="text-gray-400">TEL：</span>{o.recipientPhone}</div>}
                              <div><span className="text-gray-400">配送：</span>{{yamato:"ヤマト運輸",sagawa:"佐川急便",japan_post:"日本郵便"}[o.carrier] || o.carrier}</div>
                              {o.trackingNumber && <div><span className="text-gray-400">追跡：</span><span className="font-mono text-blue-600">{o.trackingNumber}</span></div>}
                              {o.shippedAt && <div><span className="text-gray-400">発送日：</span>{o.shippedAt.slice(0,10)}</div>}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── ページコンポーネント（Suspense境界） ────────────
export default function DeliveryNotePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mr-3" />
        <span className="text-gray-500">読み込み中...</span>
      </div>
    }>
      <DeliveryNoteContent />
    </Suspense>
  )
}
