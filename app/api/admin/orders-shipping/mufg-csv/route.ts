// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/admin/orders-shipping/mufg-csv?ids=1,2,3
 *
 * 選択した伝票（paymentMethod = "bank_transfer" / "direct_debit"）を
 * 三菱UFJファクター向け口座振替CSVに出力する。
 *
 * 出力内容（1ファイル・管理用CSV形式）：
 *   SEQ, 銀行コード, 銀行名, 支店コード, 支店名,
 *   口座種別, 口座番号, 口座名義, 引落金額,
 *   会員コード, 氏名, 電話番号, 注文番号, 注文日, 備考
 *
 * 口座情報は MlmMember.bankCode/bankName/branchCode/branchName/
 *            accountType/accountNumber/accountHolder から取得。
 */

// 委託者情報（本番環境では環境変数化推奨）
const CONSIGNER_CODE = process.env.MUFG_CONSIGNER_CODE ?? "1234567890" // 委託者コード（10桁）
const CONSIGNER_NAME = process.env.MUFG_CONSIGNER_NAME ?? "ｸﾚｱｰﾎｰﾙﾃﾞｲﾝｸﾞｽ" // 委託者名（半角カナ）

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

    // 口座振替伝票のみ取得（bank_transfer / direct_debit）
    const orders = await prisma.order.findMany({
      where: {
        id: { in: ids.map(BigInt) },
        OR: [
          { paymentMethod: "bank_transfer" },
          { paymentMethod: "direct_debit" },
        ],
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
            phone: true,
            mlmMember: {
              select: {
                memberCode:    true,
                mobile:        true,
                bankCode:      true,
                bankName:      true,
                branchCode:    true,
                branchName:    true,
                accountType:   true,
                accountNumber: true,
                accountHolder: true,
              },
            },
          },
        },
      },
      orderBy: { orderedAt: "asc" },
    })

    if (orders.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "対象の口座振替伝票が見つかりません（paymentMethod=bank_transfer の伝票を選択してください）",
        },
        { status: 404 }
      )
    }

    // ─── CSV エスケープ ───────────────────────────────────
    const esc = (val: string | null | undefined): string => {
      const s = String(val ?? "")
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const toRow = (cols: (string | number | null | undefined)[]): string =>
      cols.map(c => esc(String(c ?? ""))).join(",")

    // ─── 管理用 CSV 生成 ──────────────────────────────────
    const csvHeader = [
      "SEQ",
      "銀行コード",
      "銀行名",
      "支店コード",
      "支店名",
      "口座種別",
      "口座番号",
      "口座名義",
      "引落金額",
      "会員コード",
      "氏名",
      "電話番号",
      "注文番号",
      "注文日",
      "備考",
    ].join(",")

    const csvRows = orders.map((order: typeof orders[number], idx: number) => {
      const mlm  = order.user.mlmMember
      const user = order.user

      const memberCode  = mlm?.memberCode  || user.memberCode
      const phone       = (mlm?.mobile || user.phone || "").replace(/-/g, "")
      const bankCode    = mlm?.bankCode    || ""
      const bankName    = mlm?.bankName    || ""
      const branchCode  = mlm?.branchCode  || ""
      const branchName  = mlm?.branchName  || ""
      const accountType = mlm?.accountType || "普通"
      const accountNum  = mlm?.accountNumber || ""
      const accountHolder = mlm?.accountHolder || user.name || ""

      return toRow([
        idx + 1,
        bankCode,
        bankName,
        branchCode,
        branchName,
        accountType,
        accountNum,
        accountHolder,
        order.totalAmount,
        memberCode,
        user.name || "",
        phone,
        order.orderNumber,
        order.orderedAt.toISOString().slice(0, 10),
        order.note || "",
      ])
    })

    // ─── 全銀協テキスト形式（別シート/参考用：ヘッダー行として末尾に追記）─
    // 振替日：翌月の26日（当月の場合は当月26日）
    const now          = new Date()
    const transferYYYY = now.getFullYear()
    const transferMM   = String(now.getMonth() + 1).padStart(2, "0")
    const transferDate = `${transferYYYY}${transferMM}26` // YYYYMMDD

    const zenginLines: string[] = []

    // ヘッダーレコード（全銀協形式）
    zenginLines.push(
      [
        "1",                              // データ区分（1=ヘッダー）
        "91",                             // 種別コード（口座振替）
        "0",                              // コード区分
        CONSIGNER_CODE.padEnd(10),        // 委託者コード（10桁）
        CONSIGNER_NAME.padEnd(40),        // 委託者名（全角20文字 or 半角40文字）
        transferDate,                     // 引落指定日（YYYYMMDD）
        "0005",                           // 仕向銀行番号（三菱UFJ）
        "".padEnd(15),                    // 仕向銀行名（15桁）
        "".padEnd(4, "0"),                // 仕向支店番号
        "".padEnd(15),                    // 仕向支店名
        "1",                              // 預金種目（1=普通）
        "".padEnd(7, "0"),                // 口座番号
        "".padEnd(17),                    // ダミー
      ].join("")
    )

    // データレコード
    orders.forEach((order: typeof orders[number], idx: number) => {
      const mlm = order.user.mlmMember
      const seqNo     = String(idx + 1).padStart(4, "0")
      const bankCode  = (mlm?.bankCode   || "0000").slice(0, 4).padEnd(4)
      const branchCode = (mlm?.branchCode || "000").slice(0, 3).padEnd(3)
      const acType    = mlm?.accountType === "当座" ? "2" : "1"
      const acNum     = (mlm?.accountNumber || "").padStart(7, "0").slice(0, 7)
      const acHolder  = (mlm?.accountHolder || order.user.name || "").padEnd(30).slice(0, 30)
      const amount    = String(order.totalAmount).padStart(10, "0")

      zenginLines.push(
        [
          "2",         // データ区分（2=データ）
          bankCode,    // 銀行コード（4桁）
          "".padEnd(15),   // 銀行名（省略可）
          branchCode,  // 支店コード（3桁）
          "".padEnd(15),   // 支店名（省略可）
          "".padEnd(4),    // ダミー
          acType,      // 預金種目（1=普通/2=当座）
          acNum,       // 口座番号（7桁）
          acHolder,    // 口座名義（30桁）
          amount,      // 引落金額（10桁）
          "0",         // 新規コード（0=既存）
          seqNo,       // 顧客番号（4桁）
          "".padEnd(8),    // ダミー
        ].join("")
      )
    })

    // トレーラレコード
    const totalAmount = orders.reduce((s: number, o: typeof orders[number]) => s + o.totalAmount, 0)
    zenginLines.push(
      [
        "8",
        String(orders.length).padStart(6, "0"),
        String(totalAmount).padStart(12, "0"),
        "".padEnd(101),
      ].join("")
    )

    // エンドレコード
    zenginLines.push("9" + "".padEnd(119))

    // ─── 最終CSV：管理用 + 全銀協テキストをセクション区切りで結合 ───
    const separator = "\r\n"
    const csvContent =
      "\uFEFF" +                                          // BOM
      [csvHeader, ...csvRows].join("\r\n") +              // 管理用CSV
      "\r\n\r\n# 全銀協テキスト形式（三菱UFJファクター送信用）\r\n" +
      zenginLines.join("\r\n")                            // 全銀協テキスト

    const date     = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const filename = `mufg_${date}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error("MUFG CSV export error:", error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: "三菱UFJファクターCSV出力に失敗しました", detail: msg },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
