export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = "BulkPurchase2026-Viola1000"

// CSVの全購入データ（58件）
const CSV_PURCHASES = [
  { memberCode: "102340-01", name: "荒木　真梨",      month: "2026-02" },
  { memberCode: "104865-01", name: "島内　桃代",      month: "2026-03" },
  { memberCode: "105800-01", name: "國見　昌代",      month: "2026-03" },
  { memberCode: "109055-01", name: "長谷川　浩一",    month: "2026-02" },
  { memberCode: "110034-01", name: "上野　愛子",      month: "2026-03" },
  { memberCode: "114942-01", name: "田中　純子",      month: "2026-04" },
  { memberCode: "137061-01", name: "宇於崎 とも子",   month: "2026-01" },
  { memberCode: "143726-01", name: "末永 あい子",     month: "2026-01" },
  { memberCode: "173846-01", name: "茂木 弥生",       month: "2026-02" },
  { memberCode: "211776-01", name: "村上　美穂子",    month: "2026-02" },
  { memberCode: "214970-01", name: "川西　智惠子",    month: "2026-02" },
  { memberCode: "218136-01", name: "宮本 薫",         month: "2026-01" },
  { memberCode: "242373-01", name: "布施　佳子",      month: "2026-03" },
  { memberCode: "265702-01", name: "須合　恵美子",    month: "2026-03" },
  { memberCode: "265820-01", name: "熊谷　祐代",      month: "2026-03" },
  { memberCode: "270675-01", name: "平田　紗耶",      month: "2026-02" },
  { memberCode: "288606-01", name: "平野　浩子",      month: "2026-03" },
  { memberCode: "288646-01", name: "矢崎　加依",      month: "2026-02" },
  { memberCode: "339129-01", name: "福島　美智代",    month: "2026-02" },
  { memberCode: "341850-01", name: "堀田　紀子",      month: "2026-02" },
  { memberCode: "358845-01", name: "日色　明美",      month: "2026-03" },
  { memberCode: "372649-01", name: "白崎 恵美子",     month: "2026-02" },
  { memberCode: "377796-01", name: "金場　弘枝",      month: "2026-02" },
  { memberCode: "402206-01", name: "中山　幾代",      month: "2026-03" },
  { memberCode: "411021-01", name: "山下　眞知子",    month: "2026-02" },
  { memberCode: "420115-01", name: "東田　恵美子",    month: "2026-03" },
  { memberCode: "424556-01", name: "菊池　敏子",      month: "2026-02" },
  { memberCode: "432767-01", name: "井上　美和",      month: "2026-01" },
  { memberCode: "433894-01", name: "和田 素美",       month: "2025-12" },
  { memberCode: "473791-01", name: "河合 千寿子",     month: "2026-01" },
  { memberCode: "474965-01", name: "小池　イク子",    month: "2026-03" },
  { memberCode: "488957-01", name: "平塚 由香",       month: "2026-02" },
  { memberCode: "537718-01", name: "佐藤　優子",      month: "2026-03" },
  { memberCode: "599013-01", name: "佐藤　すみ子",    month: "2026-03" },
  { memberCode: "606493-01", name: "金子 恭子",       month: "2025-12" },
  { memberCode: "609622-01", name: "片山 真弓",       month: "2026-02" },
  { memberCode: "616326-01", name: "新井　昌子",      month: "2026-02" },
  { memberCode: "644327-01", name: "大塚 祥子",       month: "2026-01" },
  { memberCode: "663837-01", name: "村岸 美鶴帆",     month: "2026-01" },
  { memberCode: "667975-01", name: "竹内　達也",      month: "2026-02" },
  { memberCode: "684290-01", name: "島田　龍太郎",    month: "2026-02" },
  { memberCode: "774781-01", name: "岩崎　愛",        month: "2026-02" },
  { memberCode: "822124-01", name: "中　三千代",      month: "2026-03" },
  { memberCode: "830113-01", name: "白川 洋子",       month: "2026-02" },
  { memberCode: "843472-01", name: "西田 紀代美",     month: "2026-02" },
  { memberCode: "844623-01", name: "奥寺 美里",       month: "2025-12" },
  { memberCode: "864705-01", name: "阿部 暢子",       month: "2026-01" },
  { memberCode: "877844-01", name: "鈴木　令子",      month: "2026-03" },
  { memberCode: "882955-01", name: "佐藤　良子",      month: "2026-03" },
  { memberCode: "884051-01", name: "下山　絢子",      month: "2026-01" },
  { memberCode: "890155-01", name: "林　真一郎",      month: "2026-04" },
  { memberCode: "892808-01", name: "梶原　みゆき",    month: "2026-02" },
  { memberCode: "910334-01", name: "川上　翼",        month: "2026-02" },
  { memberCode: "933955-01", name: "宮本 嘉也",       month: "2026-01" },
  { memberCode: "937445-01", name: "柴田 久美子",     month: "2026-02" },
  { memberCode: "944821-01", name: "田代　芳江",      month: "2026-03" },
  { memberCode: "949540-01", name: "千葉　きみ子",    month: "2026-02" },
  { memberCode: "957092-01", name: "谷澤 美奈子",     month: "2026-01" },
]

// 商品情報（固定）
const PRODUCT_CODE = "1000"
const PRODUCT_NAME = "[新規]VIOLA Pure 翠彩-SUMISAI-"
const UNIT_PRICE = 15000
const POINTS = 150

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get("token")
  const mode = searchParams.get("mode") || "check"

  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ---- CHECK モード: DBの状態確認 ----
  if (mode === "check") {
    const results = []
    for (const entry of CSV_PURCHASES) {
      const mlmMember = await prisma.mlmMember.findUnique({
        where: { memberCode: entry.memberCode },
        include: {
          user: { select: { name: true } },
          purchases: {
            where: { productCode: PRODUCT_CODE, purchaseMonth: entry.month },
          },
        },
      })

      if (!mlmMember) {
        results.push({
          memberCode: entry.memberCode,
          name: entry.name,
          month: entry.month,
          status: "NO_MLM_MEMBER",
          message: "MlmMemberが存在しない",
        })
      } else if (mlmMember.purchases.length > 0) {
        results.push({
          memberCode: entry.memberCode,
          name: mlmMember.user.name,
          month: entry.month,
          status: "ALREADY_EXISTS",
          message: `購入済み (ID: ${mlmMember.purchases[0].id})`,
        })
      } else {
        results.push({
          memberCode: entry.memberCode,
          name: mlmMember.user.name,
          month: entry.month,
          status: "NEED_CREATE",
          message: "未登録 → 登録が必要",
        })
      }
    }

    const summary = {
      total: results.length,
      alreadyExists: results.filter(r => r.status === "ALREADY_EXISTS").length,
      needCreate: results.filter(r => r.status === "NEED_CREATE").length,
      noMlmMember: results.filter(r => r.status === "NO_MLM_MEMBER").length,
    }

    return NextResponse.json({ mode: "check", summary, results })
  }

  // ---- CREATE モード: 未登録分を一括登録 ----
  if (mode === "create") {
    const created = []
    const skipped = []
    const errors = []

    for (const entry of CSV_PURCHASES) {
      try {
        const mlmMember = await prisma.mlmMember.findUnique({
          where: { memberCode: entry.memberCode },
          include: {
            user: { select: { name: true } },
            purchases: {
              where: { productCode: PRODUCT_CODE, purchaseMonth: entry.month },
            },
          },
        })

        if (!mlmMember) {
          errors.push({
            memberCode: entry.memberCode,
            name: entry.name,
            month: entry.month,
            reason: "MlmMemberが存在しない",
          })
          continue
        }

        if (mlmMember.purchases.length > 0) {
          skipped.push({
            memberCode: entry.memberCode,
            name: mlmMember.user.name,
            month: entry.month,
            reason: "既に購入履歴あり",
          })
          continue
        }

        // 購入月の1日をpurchasedAtとして設定
        const purchasedAt = new Date(`${entry.month}-01T00:00:00.000Z`)

        const purchase = await prisma.mlmPurchase.create({
          data: {
            mlmMemberId: mlmMember.id,
            productCode: PRODUCT_CODE,
            productName: PRODUCT_NAME,
            quantity: 1,
            unitPrice: UNIT_PRICE,
            points: POINTS,
            totalPoints: POINTS,
            purchaseStatus: "one_time",
            purchaseMonth: entry.month,
            purchasedAt,
          },
        })

        created.push({
          memberCode: entry.memberCode,
          name: mlmMember.user.name,
          month: entry.month,
          purchaseId: purchase.id.toString(),
        })
      } catch (err) {
        errors.push({
          memberCode: entry.memberCode,
          name: entry.name,
          month: entry.month,
          reason: String(err),
        })
      }
    }

    return NextResponse.json({
      mode: "create",
      summary: {
        total: CSV_PURCHASES.length,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length,
      },
      created,
      skipped,
      errors,
    })
  }

  return NextResponse.json({ error: "mode must be 'check' or 'create'" }, { status: 400 })
}
