// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import RegistrationCompletePrint from "./RegistrationCompletePrint"

interface PageProps {
  searchParams: Promise<{ memberId?: string }>
}

export default async function RegistrationCompletePrintPage({ searchParams }: PageProps) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session as any)?.user?.role !== "admin") {
    redirect("/admin/login")
  }

  const { memberId } = await searchParams
  if (!memberId) {
    return <div className="p-8 text-red-600">memberIdパラメータが必要です</div>
  }

  const mlmMember = await prisma.mlmMember.findUnique({
    where: { id: BigInt(memberId) },
    include: {
      user: true,
      referrer: {
        include: { user: true }
      }
    }
  })

  if (!mlmMember) {
    return <div className="p-8 text-red-600">会員が見つかりません</div>
  }

  const user = mlmMember.user
  const memberCode = mlmMember.memberCode

  // 日付フォーマット
  const formatDate = (d: Date | null | undefined) => {
    if (!d) return ""
    return new Date(d).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric"
    })
  }

  const contractDate = formatDate(mlmMember.contractDate)
  const birthDate = mlmMember.birthDate ? formatDate(mlmMember.birthDate) : ""

  const referrerName = mlmMember.referrer?.user?.name || ""
  const referrerCode = mlmMember.referrer?.memberCode || ""
  const issueDate = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric"
  })

  // 口座情報（mlmMemberから取得）
  const bankInfo = mlmMember.bankName
    ? [
        mlmMember.bankCode ? `${mlmMember.bankName}(${mlmMember.bankCode})` : mlmMember.bankName,
        mlmMember.branchName ? `${mlmMember.branchName}(${mlmMember.branchCode || ""})` : "",
        mlmMember.accountType || "",
        mlmMember.accountNumber || "",
        mlmMember.accountHolder || ""
      ].filter(Boolean).join("　")
    : ""

  // ボーナス口座の表示形式（見本: 北陸(0144)　高岡駅前出張所(207)　普通　5002750　ｾﾝﾘﾕｳﾅｵﾐ）
  const bonusAccountLabel = mlmMember.bankName
    ? `ボーナス口座　　${bankInfo}`
    : ""

  // ログインID（会員コードのハイフンを除去）
  const loginId = memberCode.replace(/-/g, "")

  // 郵便番号と住所
  const postalCode = user.postalCode || ""
  const address = user.address || ""
  const phone = user.phone || ""

  const data = {
    memberCode,
    name: user.name || "",
    postalCode,
    address,
    phone,
    fax: "",
    birthDate,
    email: user.email || "",
    mobileEmail: "",
    contractDate,
    referrerCode,
    referrerName,
    bankInfo: bonusAccountLabel,
    loginId,
    issueDate
  }

  return <RegistrationCompletePrint data={data} />
}
