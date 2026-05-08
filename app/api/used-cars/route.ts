export const dynamic   = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { sendUsedCarApplicationEmail } from "@/lib/mailer"

const DEFAULT_NOTIFY = "info@c-p.link"

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

    // ── 管理側で設定された通知先メールアドレスを取得 ──
    let notifyTo: string[] = [DEFAULT_NOTIFY]
    try {
      const setting = await prisma.siteSetting.findUnique({
        where: { settingKey: "usedCarSettings" },
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
    let referrerId: bigint | null = null
    try {
      const session = await auth()
      if (session?.user?.id) {
        const uid = BigInt(session.user.id)
        userId = uid
        // 紹介者を取得
        const referral = await prisma.userReferral.findFirst({
          where: { userId: uid, isActive: true },
          include: { referrer: { select: { id: true } } },
        })
        if (referral?.referrer) referrerId = referral.referrer.id
      }
    } catch { /* セッション取得失敗は無視 */ }

    // DB保存
    await prisma.usedCarApplication.create({
      data: {
        memberId:   memberId || null,
        userId:     userId   || null,
        name,
        phone,
        email,
        referrerId: referrerId || null,
        carType,
        grade,
        year,
        mileage,
        colors,
        budget,
        payment,
        drive:    drive    || null,
        studless: studless === true || studless === "true",
        note:     note     || null,
        status:   "pending",
      },
    })

    const mailData = { memberId, name, phone, email, carType, grade, year, mileage, colors, budget, payment, drive, studless, note }

    // 管理者通知メール（設定された全アドレス）
    await sendUsedCarApplicationEmail({
      to:      notifyTo,
      isAdmin: true,
      data:    mailData,
    }).catch(err => console.error("[used-cars] admin mail error:", err))

    // お客様への確認メール
    await sendUsedCarApplicationEmail({
      to:      email,
      isAdmin: false,
      data:    mailData,
    }).catch(err => console.error("[used-cars] customer mail error:", err))

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error("[used-cars] API error:", err)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
