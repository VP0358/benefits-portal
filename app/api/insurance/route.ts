export const dynamic   = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { sendInsuranceApplicationEmail } from "@/lib/mailer"

const DEFAULT_NOTIFY = "info@c-p.link"

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

    // ── 保険種別ごとに管理側設定から通知先メールアドレスを取得 ──
    const isLife = (insuranceType ?? "life") === "life"
    const settingKey = isLife ? "lifeInsuranceSettings" : "nonLifeInsuranceSettings"
    let notifyTo: string[] = [DEFAULT_NOTIFY]
    try {
      const setting = await prisma.siteSetting.findUnique({
        where: { settingKey },
      })
      if (setting?.settingValue) {
        const parsed = JSON.parse(setting.settingValue)
        // notifyEmails（新形式）→ adminEmail（旧形式）の順でフォールバック
        const emails: string[] = Array.isArray(parsed.notifyEmails)
          ? parsed.notifyEmails.filter((e: string) => e && e.trim())
          : parsed.adminEmail
          ? [parsed.adminEmail.trim()]
          : []
        if (emails.length > 0) notifyTo = emails
      }
    } catch { /* 設定取得失敗は無視してデフォルト使用 */ }

    // ログインユーザー取得（任意）
    let userId: bigint | null = null
    try {
      const session = await auth()
      if (session?.user?.id) userId = BigInt(session.user.id)
    } catch { /* セッション取得失敗は無視 */ }

    // DB保存
    await prisma.insuranceApplication.create({
      data: {
        memberId:      memberId || null,
        userId:        userId   || null,
        name,
        phone,
        email,
        agency:        agency.trim(),
        insuranceType: insuranceType || "life",
        products:      products?.length ? JSON.stringify(products) : null,
        schedule1,
        schedule2,
        schedule3,
        note:          note || null,
        status:        "pending",
      },
    })

    const data = {
      memberId: memberId || "",
      name, phone, email, agency: agency.trim(),
      schedule1, schedule2, schedule3,
      insuranceType: insuranceType || "life",
      products: products || [],
      note: note || "",
    }

    // 管理者通知メール（設定された全アドレス）
    await sendInsuranceApplicationEmail({
      to:      notifyTo,
      isAdmin: true,
      data,
    }).catch(e => console.error("[insurance] admin mail error:", e))

    // お客様への確認メール
    await sendInsuranceApplicationEmail({
      to:      email,
      isAdmin: false,
      data,
    }).catch(e => console.error("[insurance] customer mail error:", e))

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error("[insurance] API error:", err)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
