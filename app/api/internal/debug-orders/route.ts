export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = "Debug2026-Viola"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get("token")
  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Step1: MlmPurchase件数確認
    const count1000 = await prisma.mlmPurchase.count({ where: { productCode: "1000" } })
    const count2000 = await prisma.mlmPurchase.count({ where: { productCode: "2000" } })

    // Step2: MlmProduct確認
    const products = await prisma.mlmProduct.findMany({
      where: { productCode: { in: ["1000", "2000"] } },
      select: { id: true, productCode: true, name: true, price: true, pv: true },
    })

    // Step3: 最初の1件を取得してリレーション確認
    const sample = await prisma.mlmPurchase.findFirst({
      where: { productCode: { in: ["1000", "2000"] } },
      include: {
        mlmMember: {
          include: {
            user: {
              select: {
                id: true,
                memberCode: true,
                name: true,
                phone: true,
                postalCode: true,
                address: true,
                prefecture: true,
                city: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      ok: true,
      count1000,
      count2000,
      products: products.map(p => ({ ...p, id: p.id.toString() })),
      samplePurchaseId: sample?.id.toString() ?? null,
      sampleMemberCode: sample?.mlmMember?.memberCode ?? null,
      sampleUserName: sample?.mlmMember?.user?.name ?? null,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
    }, { status: 500 })
  }
}
