// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { todayJST } from "@/lib/japan-time"

/**
 * GET /api/admin/orders-shipping/credix-csv?ids=1,2,3
 *
 * 選択した伝票（paymentMethod = "card" / "credit_card"）をクレディックス向けCSVに出力する。
 * クレディックス継続課金CSV仕様に準拠（オートシップ管理の export-csv/route.ts と同形式）。
 *
 * CSV列：
 *   顧客ID, 会員コード, 氏名, 氏名カナ, 電話番号, メールアドレス,
 *   郵便番号, 住所, 商品コード, 商品名, 数量, 単価, 合計金額, 注文番号, 備考
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids") || ""
    const ids = idsParam
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => !isNaN(n))

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "idsが必要です" }, { status: 400 })
    }

    // 伝票取得（カード決済のみ）
    const orders = await prisma.order.findMany({
      where: {
        id: { in: ids.map(BigInt) },
        OR: [
          { paymentMethod: "card" },
          { paymentMethod: "credit_card" },
        ],
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
            phone: true,
            postalCode: true,
            address: true,
            email: true,
            mlmMember: {
              select: {
                memberCode: true,
                memberType: true,
                creditCardId: true,
                companyName: true,
                mobile: true,
                prefecture: true,
                city: true,
                address1: true,
                address2: true,
              },
            },
          },
        },
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            lineAmount: true,
            mlmProduct: { select: { productCode: true } },
          },
        },
        shippingLabel: {
          select: {
            recipientName: true,
            recipientPhone: true,
            recipientPostal: true,
            recipientAddress: true,
          },
        },
      },
      orderBy: { orderedAt: "asc" },
    })

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, error: "対象のカード決済伝票が見つかりません（paymentMethod=card/credit_card の伝票を選択してください）" },
        { status: 404 }
      )
    }

    // CSV エスケープ
    const esc = (val: string | null | undefined): string => {
      const s = String(val ?? "")
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const toRow = (cols: (string | number | null | undefined)[]): string =>
      cols.map(c => esc(String(c ?? ""))).join(",")

    // ヘッダー
    const header = [
      "顧客ID",       // クレディックス登録顧客ID（なければ会員コード）
      "会員コード",
      "氏名",
      "電話番号",
      "メールアドレス",
      "郵便番号",
      "住所",
      "商品コード",
      "商品名",
      "数量",
      "単価",
      "合計金額",
      "注文番号",
      "備考",
    ].join(",")

    const rows = orders.map((order: typeof orders[number]) => {
      const mlm  = order.user.mlmMember
      const user = order.user

      // 顧客ID：MlmMember.creditCardId > 会員コード
      const customerId = mlm?.creditCardId || mlm?.memberCode || user.memberCode

      // 会員コード（mlmMember 優先）
      const memberCode = mlm?.memberCode || user.memberCode

      // 氏名
      const name = user.name || ""

      // 電話番号：mlm.mobile > shippingLabel.recipientPhone > user.phone
      const phone = (
        mlm?.mobile ||
        order.shippingLabel?.recipientPhone ||
        user.phone ||
        ""
      ).replace(/-/g, "")

      // メール
      const email = user.email || ""

      // 郵便番号：shippingLabel > mlm住所 > user.postalCode
      const postal = (
        order.shippingLabel?.recipientPostal ||
        user.postalCode ||
        ""
      ).replace(/-/g, "")

      // 住所：shippingLabel > mlm.prefecture+city+address1+address2 > user.address
      const address =
        order.shippingLabel?.recipientAddress ||
        (mlm ? [mlm.prefecture, mlm.city, mlm.address1, mlm.address2].filter(Boolean).join("") : "") ||
        user.address ||
        ""

      // 商品情報（複数商品は先頭を使用し、品名は結合）
      const firstItem  = order.items[0]
      const productCode = firstItem?.mlmProduct?.productCode || ""
      const productName = order.items.map((i: typeof order.items[number]) => i.productName).join("・") || ""
      const quantity    = order.items.reduce((s: number, i: typeof order.items[number]) => s + i.quantity, 0)
      const unitPrice   = firstItem?.unitPrice || 0
      const totalAmount = order.totalAmount

      // 備考
      const note = order.note || "受注発送伝票"

      return toRow([
        customerId,
        memberCode,
        name,
        phone,
        email,
        postal,
        address,
        productCode,
        productName,
        quantity,
        unitPrice,
        totalAmount,
        order.orderNumber,
        note,
      ])
    })

    // BOM付きUTF-8（Excel で文字化けしない）
    const csvContent = "\uFEFF" + [header, ...rows].join("\r\n")
    const date       = todayJST().replace(/-/g, "")
    const filename   = `credix_${date}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error("Credix CSV export error:", error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: "クレディックスCSV出力に失敗しました", detail: msg },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
