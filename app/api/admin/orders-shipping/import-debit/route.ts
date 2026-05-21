export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// ──────────────────────────────────────────────────────────────────────────────
// 口座振替・クレジット決済 結果ファイル取込
// 対応フォーマット:
//   1) 三菱UFJファクター 全銀協固定長TXT
//   2) クレディックス 結果CSV (ID(sendid) 列)
//   3) 内部簡易CSV (注文番号,入金日,結果)
// ──────────────────────────────────────────────────────────────────────────────

/** CSV日時文字列 → Date 変換ヘルパー（JST→UTC） */
function parseCsvDate(str: string): Date | null {
  if (!str || str === "-" || str === "") return null
  const m = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = m
    const jst = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
    return new Date(jst.getTime() - 9 * 60 * 60 * 1000)
  }
  return null
}

/** 電話番号正規化 */
function normalizePhone(raw: string): string {
  return raw.replace(/-/g, "").replace(/^\+81/, "0").trim()
}

/** CSVライン解析（クオート対応） */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = "" }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

/** 三菱UFJファクター 固定長TXT 判定 */
function isMufgFixedFormat(buf: Uint8Array): boolean {
  for (let i = 0; i < Math.min(5, buf.length); i++) {
    if (buf[i] < 0x30 || buf[i] > 0x39) return false
  }
  let commaCount = 0
  for (let i = 0; i < Math.min(200, buf.length); i++) {
    if (buf[i] === 0x2C) commaCount++
  }
  return commaCount < 3
}

/** Shift-JIS判定 */
function looksLikeShiftJis(buf: Uint8Array): boolean {
  for (let i = 0; i < Math.min(buf.length, 4096); i++) {
    const b = buf[i]
    if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xEF)) return true
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ success: false, error: "ファイルが選択されていません" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)

    let successCount = 0
    let failCount = 0
    let errorCount = 0
    const errors: string[] = []

    // ══════════════════════════════════════════════════════════════════
    // フォーマット判定
    // ══════════════════════════════════════════════════════════════════

    if (isMufgFixedFormat(uint8)) {
      // ──────────────────────────────────────────────────────────────
      // 三菱UFJファクター 全銀協固定長TXT
      // 口座番号 [42:50] → MlmMember.accountNumber → Order を特定
      // ──────────────────────────────────────────────────────────────
      console.log("[import-debit] 三菱UFJファクター固定長TXTフォーマット検出")

      // 入金日 = 当月末日（JST）
      const now = new Date()
      const nowJST = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      const lastDayOfMonth = new Date(nowJST.getFullYear(), nowJST.getMonth() + 1, 0)
      const paidDateUTC = new Date(
        Date.UTC(lastDayOfMonth.getFullYear(), lastDayOfMonth.getMonth(), lastDayOfMonth.getDate())
          - 9 * 60 * 60 * 1000
      )

      // バイト行分割
      const byteLines: Uint8Array[] = []
      let bStart = 0
      for (let i = 0; i < uint8.length; i++) {
        if (uint8[i] === 0x0A) {
          const end = (i > 0 && uint8[i - 1] === 0x0D) ? i - 1 : i
          byteLines.push(uint8.slice(bStart, end))
          bStart = i + 1
        }
      }
      if (bStart < uint8.length) byteLines.push(uint8.slice(bStart))

      // 口座番号セット収集
      const accountNumbers = new Set<string>()
      for (const byteLine of byteLines) {
        if (byteLine.length < 50) continue
        // U+FFFD 正規化
        const norm: number[] = []
        let bi = 0
        while (bi < byteLine.length) {
          if (bi + 2 < byteLine.length &&
            byteLine[bi] === 0xEF && byteLine[bi + 1] === 0xBF && byteLine[bi + 2] === 0xBD) {
            norm.push(0x3F); bi += 3
          } else { norm.push(byteLine[bi]); bi++ }
        }
        if (norm.length < 90) continue
        const recType = norm.slice(0, 5).map(b => String.fromCharCode(b)).join("").trim()
        if (recType.startsWith("19") || recType.startsWith("80") ||
          recType.trimStart().startsWith("9") || recType.trim() === "" ||
          !/^\d/.test(recType)) continue

        const acNumRaw = norm.slice(42, 50).map(b => String.fromCharCode(b)).join("").trim()
        if (!acNumRaw || !/^\d+$/.test(acNumRaw)) continue
        const acNum = acNumRaw.replace(/^0+/, "") || "0"
        accountNumbers.add(acNum)
      }

      console.log(`[import-debit] MUFG: 口座番号 ${accountNumbers.size}件抽出`)

      if (accountNumbers.size === 0) {
        return NextResponse.json({ success: false, error: "TXTファイルから口座番号を抽出できませんでした" }, { status: 400 })
      }

      // 口座番号でMlmMember検索
      const allMembers = await prisma.mlmMember.findMany({
        where: { accountNumber: { not: null } },
        select: { id: true, memberCode: true, accountNumber: true },
      })
      const matchedMemberIds: bigint[] = []
      for (const m of allMembers) {
        const normalizedAc = (m.accountNumber ?? "").replace(/^0+/, "") || ""
        if (normalizedAc && accountNumbers.has(normalizedAc)) {
          matchedMemberIds.push(m.id)
        }
      }

      console.log(`[import-debit] MUFG: 一致会員 ${matchedMemberIds.length}件`)

      // 対象Orderを検索して更新
      // 口座振替の未払い伝票（slipType=autoship または paymentMethod=bank_transfer）
      for (const memberId of matchedMemberIds) {
        try {
          const orders = await prisma.order.findMany({
            where: {
              mlmMemberId: memberId,
              paymentStatus: "unpaid",
              paymentMethod: { in: ["bank_transfer", "bank_payment", "direct_debit"] },
            },
            orderBy: { orderedAt: "desc" },
          })
          if (orders.length === 0) {
            // 未払いフィルタなしで再検索
            const anyOrders = await prisma.order.findMany({
              where: {
                mlmMemberId: memberId,
                paymentMethod: { in: ["bank_transfer", "bank_payment", "direct_debit"] },
                paidAt: null,
              },
              orderBy: { orderedAt: "desc" },
              take: 5,
            })
            for (const o of anyOrders) {
              await prisma.order.update({
                where: { id: o.id },
                data: { paymentStatus: "paid", paidAt: paidDateUTC, updatedAt: new Date() },
              })
              successCount++
            }
          } else {
            for (const o of orders) {
              await prisma.order.update({
                where: { id: o.id },
                data: { paymentStatus: "paid", paidAt: paidDateUTC, updatedAt: new Date() },
              })
              successCount++
            }
          }
        } catch (e) {
          errors.push(`会員ID ${memberId} の更新エラー`)
          errorCount++
          console.error(e)
        }
      }

      return NextResponse.json({
        success: true,
        format: "mufg_fixed",
        matchedAccounts: accountNumbers.size,
        matchedMembers: matchedMemberIds.length,
        successCount,
        failCount,
        errorCount,
        errors: errors.slice(0, 20),
      })

    } else {
      // CSV フォーマット
      const hasUtf8Bom = uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF
      let rawText: string
      if (!hasUtf8Bom && looksLikeShiftJis(uint8)) {
        rawText = new TextDecoder("shift-jis").decode(arrayBuffer)
      } else {
        rawText = new TextDecoder("utf-8").decode(arrayBuffer)
      }
      const text = rawText.replace(/^\uFEFF/, "")
      const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim())

      if (lines.length < 2) {
        return NextResponse.json({ success: false, error: "CSVにデータがありません（ヘッダー行のみ）" }, { status: 400 })
      }

      const headerRaw = parseCsvLine(lines[0])
      const header = headerRaw.map(h => h.replace(/^"|"$/g, "").replace(/^\uFEFF/, "").trim().toLowerCase())

      // クレディックス結果CSV判定
      const isCredixResultFormat = header.some(h =>
        h.includes("sendid") || h.includes("sendpoint") || h.includes("id(sendid)")
      )

      if (isCredixResultFormat) {
        // ──────────────────────────────────────────────────────────────
        // クレディックス 結果CSV
        // 電話番号 or メール → MlmMember → Order.paidAt 更新
        // ──────────────────────────────────────────────────────────────
        console.log(`[import-debit] クレディックス結果CSV検出: header=[${header.join("|")}]`)

        const resultIdx = header.findIndex(h => h.includes("結果") || h.includes("result"))
        const dateIdx = header.findIndex(h =>
          h.includes("決済日時") || h.includes("処理日時") || h.includes("日時") ||
          h.includes("date") || h.includes("datetime")
        )
        let phoneIdx = header.findIndex(h => h.includes("電話番号") || h.includes("phone") || h.includes("tel"))
        let emailIdx = header.findIndex(h => h.includes("e-mail") || h.includes("email") || h.includes("メール"))
        const sendidIdx = header.findIndex(h => h.includes("sendid") || h === "id(sendid)" || h.includes("id(send)"))

        if (phoneIdx === -1) phoneIdx = 2
        if (emailIdx === -1) emailIdx = 7

        // フォン・メール → 結果マップ構築
        const credixPhoneMap = new Map<string, { ok: boolean; paidDate?: Date }>()
        const credixEmailMap = new Map<string, { ok: boolean; paidDate?: Date }>()

        for (const line of lines.slice(1)) {
          if (!line.trim()) continue
          const cols = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim())

          const rawDate = dateIdx >= 0 ? (cols[dateIdx] ?? "") : ""
          const paidDate = parseCsvDate(rawDate) ?? undefined

          // 結果判定
          let isOk = true
          if (resultIdx >= 0 && cols[resultIdx] !== undefined && cols[resultIdx] !== "") {
            const rawResult = cols[resultIdx]
            isOk = rawResult.includes("完了") || rawResult.includes("成功") ||
              rawResult.toUpperCase() === "OK" || rawResult === "0" || rawResult === "1"
          }
          // K列 (sendid) が数値のみ = 成功
          if (sendidIdx >= 0 && cols[sendidIdx]) {
            const sid = cols[sendidIdx].trim()
            if (/^\d+$/.test(sid)) isOk = true
            else if (sid === "" || sid === "-" || sid === "WC" || /^WC/i.test(sid)) isOk = false
          }

          if (phoneIdx >= 0) {
            const rawPhone = cols[phoneIdx] ?? ""
            const phone = normalizePhone(rawPhone)
            if (phone && phone !== "-" && phone.length >= 7 && phone !== "non") {
              if (!credixPhoneMap.has(phone)) credixPhoneMap.set(phone, { ok: isOk, paidDate })
              else if (isOk && !credixPhoneMap.get(phone)!.ok) credixPhoneMap.set(phone, { ok: isOk, paidDate })
            }
          }
          if (emailIdx >= 0) {
            const rawEmail = (cols[emailIdx] ?? "").toLowerCase().trim()
            if (rawEmail && rawEmail !== "-" && rawEmail !== "non" && rawEmail.includes("@")) {
              if (!credixEmailMap.has(rawEmail)) credixEmailMap.set(rawEmail, { ok: isOk, paidDate })
              else if (isOk && !credixEmailMap.get(rawEmail)!.ok) credixEmailMap.set(rawEmail, { ok: isOk, paidDate })
            }
          }
        }

        console.log(`[import-debit] Credix: 電話番号 ${credixPhoneMap.size}件 / メール ${credixEmailMap.size}件`)

        // MlmMember（クレジットカード登録済み）を取得して照合
        const members = await prisma.mlmMember.findMany({
          where: { creditCardId: { not: null } },
          select: {
            id: true,
            memberCode: true,
            mobile: true,
            creditCardId: true,
            user: { select: { phone: true, email: true } },
          },
        })

        // 一致した会員の未払いOrderを更新
        for (const member of members) {
          const phoneUser = normalizePhone(member.user?.phone ?? "")
          const phoneMobile = normalizePhone(member.mobile ?? "")
          const email = (member.user?.email ?? "").toLowerCase().trim()

          const phoneEntry =
            (phoneUser && credixPhoneMap.has(phoneUser)) ? credixPhoneMap.get(phoneUser)! :
              (phoneMobile && credixPhoneMap.has(phoneMobile)) ? credixPhoneMap.get(phoneMobile)! :
                null
          const emailEntry = (!phoneEntry && email && credixEmailMap.has(email)) ? credixEmailMap.get(email)! : null
          const entry = phoneEntry ?? emailEntry
          if (!entry) continue

          if (!entry.ok) { failCount++; continue }

          try {
            const orders = await prisma.order.findMany({
              where: {
                mlmMemberId: member.id,
                paymentStatus: "unpaid",
                paymentMethod: { in: ["card", "credit_card"] },
              },
              orderBy: { orderedAt: "desc" },
            })
            if (orders.length === 0) {
              // paidAt=null の伝票も対象
              const anyOrders = await prisma.order.findMany({
                where: {
                  mlmMemberId: member.id,
                  paymentMethod: { in: ["card", "credit_card"] },
                  paidAt: null,
                },
                orderBy: { orderedAt: "desc" },
                take: 5,
              })
              for (const o of anyOrders) {
                await prisma.order.update({
                  where: { id: o.id },
                  data: { paymentStatus: "paid", paidAt: entry.paidDate ?? new Date(), updatedAt: new Date() },
                })
                successCount++
              }
            } else {
              for (const o of orders) {
                await prisma.order.update({
                  where: { id: o.id },
                  data: { paymentStatus: "paid", paidAt: entry.paidDate ?? new Date(), updatedAt: new Date() },
                })
                successCount++
              }
            }
          } catch (e) {
            errors.push(`会員 ${member.memberCode} の更新エラー`)
            errorCount++
            console.error(e)
          }
        }

        return NextResponse.json({
          success: true,
          format: "credix_result",
          successCount,
          failCount,
          errorCount,
          errors: errors.slice(0, 20),
        })

      } else {
        // ──────────────────────────────────────────────────────────────
        // 内部簡易CSV: 注文番号, 入金日(YYYY-MM-DD), 結果(paid/unpaid/ng)
        // ──────────────────────────────────────────────────────────────
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (i === 0 && (line.includes("会員") || line.includes("注文") || line.includes("Code"))) continue

          const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
          if (cols.length < 3) continue

          const [orderNumber, paidDateStr, result] = cols

          try {
            const order = await prisma.order.findUnique({ where: { orderNumber } })
            if (!order) {
              errors.push(`行${i + 1}: 注文番号 "${orderNumber}" が見つかりません`)
              errorCount++
              continue
            }

            const isPaid = result === "paid" || result === "0" || result === "success" || result === "成功"

            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: isPaid ? "paid" : "unpaid",
                paidAt: isPaid && paidDateStr
                  ? new Date(paidDateStr.replace(/\//g, "-"))
                  : isPaid ? new Date() : null,
                updatedAt: new Date(),
              }
            })

            if (isPaid) successCount++
            else failCount++
          } catch (e) {
            errors.push(`行${i + 1}: 処理エラー (${orderNumber})`)
            errorCount++
            console.error(e)
          }
        }

        return NextResponse.json({
          success: true,
          format: "simple_csv",
          successCount,
          failCount,
          errorCount,
          errors: errors.slice(0, 20),
        })
      }
    }
  } catch (error) {
    console.error("Debit import error:", error)
    return NextResponse.json({ success: false, error: "ファイルの取込に失敗しました" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
