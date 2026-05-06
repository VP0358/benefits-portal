export const dynamic   = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { sendInsuranceApplicationEmail } from "@/lib/mailer"

const NOTIFY_TO = "info@c-p.link"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { memberId, name, phone, email, agency, schedule1, schedule2, schedule3, insuranceType, products, note } = body

    if (!name?.trim())      return NextResponse.json({ error: "お名前は必須です" }, { status: 400 })
    if (!phone?.trim())     return NextResponse.json({ error: "電話番号は必須です" }, { status: 400 })
    if (!email?.trim())     return NextResponse.json({ error: "メールアドレスは必須です" }, { status: 400 })
    if (!agency?.trim())    return NextResponse.json({ error: "紹介代理店は必須です" }, { status: 400 })
    if (!schedule1?.trim()) return NextResponse.json({ error: "第1希望日時は必須です" }, { status: 400 })
    if (!schedule2?.trim()) return NextResponse.json({ error: "第2希望日時は必須です" }, { status: 400 })
    if (!schedule3?.trim()) return NextResponse.json({ error: "第3希望日時は必須です" }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 })
    }

    const data = { memberId: memberId || "", name, phone, email, agency: agency.trim(), schedule1, schedule2, schedule3, insuranceType: insuranceType || "life", products: products || [], note: note || "" }

    await sendInsuranceApplicationEmail({ to: NOTIFY_TO, isAdmin: true,  data }).catch(e => console.error("[insurance] admin mail error:", e))
    await sendInsuranceApplicationEmail({ to: email,     isAdmin: false, data }).catch(e => console.error("[insurance] customer mail error:", e))

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error("[insurance] API error:", err)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
