export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// クロネコヤマト B2クラウド 送り状発行CSV形式
// 参考: ヤマト運輸B2クラウド データ取込 仕様
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids") || ""
    const ids = idsParam.split(",").map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n))

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "idsが必要です" }, { status: 400 })
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: ids.map(BigInt) } },
      include: {
        user: { select: { name: true, phone: true, postalCode: true, address: true } },
        items: { select: { productName: true, quantity: true } },
        shippingLabel: {
          select: {
            recipientName: true, recipientPhone: true,
            recipientPostal: true, recipientAddress: true,
            recipientCompany: true, itemDescription: true, itemCount: true,
            deliveryType: true, trackingNumber: true,
          }
        }
      },
      orderBy: { orderedAt: "asc" },
    })

    // ヤマトB2クラウド CSV ヘッダー（主要フィールド）
    const headers = [
      "お客様管理番号",       // 1: 注文番号
      "荷姿コード",           // 2: 0060=宅急便
      "品名",                 // 3
      "荷物個数",             // 4
      "依頼主コード１",       // 5
      "依頼主名称",           // 6
      "依頼主郵便番号",       // 7
      "依頼主住所１",         // 8
      "依頼主住所２",         // 9
      "依頼主電話番号",       // 10
      "依頼主電話番号枝番",   // 11
      "お届け先コード",       // 12
      "お届け先名称",         // 13
      "お届け先名称（カナ）", // 14
      "お届け先郵便番号",     // 15
      "お届け先住所１",       // 16
      "お届け先住所２",       // 17
      "お届け先電話番号",     // 18
      "お届け先電話番号枝番", // 19
      "配達指定日",           // 20
      "配達指定時間帯コード", // 21
      "お届け先会社名",       // 22
      "メモ",                 // 23
    ]

    // 差出人固定情報
    const SENDER = {
      name:    "CLAIRホールディングス株式会社",
      postal:  "020-0026",
      addr1:   "岩手県盛岡市開運橋通5-6",
      addr2:   "第五菱和ビル5F",
      phone:   "0196813667",
      phoneExt: "",
    }

    const rows = orders.map(o => {
      const sl = o.shippingLabel
      const recipientName    = sl?.recipientName    || o.user.name
      const recipientPhone   = (sl?.recipientPhone  || o.user.phone || "").replace(/-/g, "")
      const recipientPostal  = (sl?.recipientPostal || o.user.postalCode || "").replace(/-/g, "")
      const recipientAddress = sl?.recipientAddress || o.user.address || ""
      const recipientCompany = sl?.recipientCompany || ""
      const itemDesc         = sl?.itemDescription  || o.items.map(i => i.productName).join("・")
      const itemCount        = sl?.itemCount || o.items.reduce((s, i) => s + i.quantity, 0)
      const memo             = o.note ? String(o.note).slice(0, 30) : ""

      // 住所を住所1と住所2に分割（都道府県+市区町村 / 番地以降）
      const addrParts = recipientAddress.split(/(?<=市|区|町|村|郡)/)
      const addr1 = addrParts[0] || recipientAddress
      const addr2 = addrParts.slice(1).join("") || ""

      return [
        o.orderNumber,       // お客様管理番号
        "0060",              // 荷姿コード（宅急便）
        itemDesc.slice(0,25),// 品名
        String(itemCount),   // 荷物個数
        "",                  // 依頼主コード1
        SENDER.name,         // 依頼主名称
        SENDER.postal,       // 依頼主郵便番号
        SENDER.addr1,        // 依頼主住所1
        SENDER.addr2,        // 依頼主住所2
        SENDER.phone,        // 依頼主電話番号
        SENDER.phoneExt,     // 依頼主電話番号枝番
        "",                  // お届け先コード
        recipientName,       // お届け先名称
        "",                  // お届け先名称（カナ）
        recipientPostal,     // お届け先郵便番号
        addr1,               // お届け先住所1
        addr2,               // お届け先住所2
        recipientPhone,      // お届け先電話番号
        "",                  // お届け先電話番号枝番
        "",                  // 配達指定日
        "",                  // 配達指定時間帯コード
        recipientCompany,    // お届け先会社名
        memo,                // メモ
      ]
    })

    // CSV生成（Shift-JIS対応のためUTF-8 BOM付き）
    const csvLines = [headers, ...rows].map(row =>
      row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")
    )
    const csvContent = "\uFEFF" + csvLines.join("\r\n")

    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''yamato_${date}.csv`,
      }
    })
  } catch (error) {
    console.error("Yamato CSV export error:", error)
    return NextResponse.json({ success: false, error: "CSV出力に失敗しました" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
