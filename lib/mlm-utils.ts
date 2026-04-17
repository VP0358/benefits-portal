/**
 * MLM会員管理ユーティリティ関数
 */

import { prisma } from '@/lib/prisma'

/**
 * 6桁のランダム数字を生成
 */
export function generateRandomSixDigits(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * 会員コードを生成（6桁-ポジション番号）
 * 例: 123456-01
 *
 * 新規会員は必ず独自のユニークな6桁ベースコードを新規発行する。
 * uplineId / position は互換性のために引数として残すが使用しない。
 *
 * @returns 会員コード（例: "123456-01"）
 */
export async function generateMemberCode(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _uplineId?: bigint | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _position?: number
): Promise<string> {
  // ユニークな6桁ベースコードを生成（衝突するまでリトライ）
  let baseCode: string = ''
  let isUnique = false

  while (!isUnique) {
    const candidate = generateRandomSixDigits()

    // 同じ6桁コードで始まる会員が存在しないか確認
    const existing = await prisma.mlmMember.findFirst({
      where: { memberCode: { startsWith: candidate + '-' } },
    })

    if (!existing) {
      isUnique = true
      baseCode = candidate
    }
  }

  // ポジションは常に 01 固定（新規登録時は必ず最初の1人）
  return `${baseCode}-01`
}

/**
 * 会員コードから基準コードとポジション番号を抽出
 * @param memberCode 会員コード（例: "123456-01"）
 * @returns { baseCode: "123456", position: 1 }
 */
export function parseMemberCode(memberCode: string): {
  baseCode: string
  position: number
} {
  const parts = memberCode.split('-')
  return {
    baseCode: parts[0],
    position: parseInt(parts[1])
  }
}

/**
 * 同じ基準コードを持つ会員の一覧を取得
 * @param baseCode 基準コード（6桁）
 */
export async function getMembersByBaseCode(baseCode: string) {
  return await prisma.mlmMember.findMany({
    where: {
      memberCode: {
        startsWith: baseCode
      }
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      memberCode: 'asc'
    }
  })
}

/**
 * 紹介者URLを生成
 * @param memberCode 会員コード
 * @returns 紹介者URL
 */
export function generateReferralUrl(memberCode: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://www.viola-pure.xyz'
  return `${baseUrl}/mlm-register?ref=${encodeURIComponent(memberCode)}`
}
