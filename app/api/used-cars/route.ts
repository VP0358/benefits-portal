export const dynamic   = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { sendUsedCarApplicationEmail } from "@/lib/mailer"

const NOTIFY_TO = "info@c-p.link"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      memberId, name, phone, email,
      carType, grade, year, mileage, colors,
      budget, payment, drive, studless, note,
    } = body

    // 必須チェック
    const required: Record<string, string> = {
      name, phone, email, carType, grade, year, mileage, colors, budget, payment,
    }
    for (const [key, val] of Object.entries(required)) {
      if (!val || !String(val).trim()) {
        return NextResponse.json(
          { error: `「${key}」は必須項目です` },
          { status: 400 }
        )
      }
    }

    // メール形式チェック
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 })
    }

    // 管理者通知メール
    await sendUsedCarApplicationEmail({
      to:        NOTIFY_TO,
      isAdmin:   true,
      data: { memberId, name, phone, email, carType, grade, year, mileage, colors, budget, payment, drive, studless, note },
    }).catch(err => console.error("[used-cars] admin mail error:", err))

    // お客様への確認メール
    await sendUsedCarApplicationEmail({
      to:       email,
      isAdmin:  false,
      data: { memberId, name, phone, email, carType, grade, year, mileage, colors, budget, payment, drive, studless, note },
    }).catch(err => console.error("[used-cars] customer mail error:", err))

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error("[used-cars] API error:", err)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
