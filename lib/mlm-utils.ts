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
 * 例: 123456-01, 123456-02
 * 
 * @param uplineId 上流会員ID。指定すると、上流会員の基準コードを継承
 * @param position ポジション番号。未指定の場合は自動採番
 * @returns 会員コード（例: "123456-01"）
 */
export async function generateMemberCode(
  uplineId?: bigint | null,
  position?: number
): Promise<string> {
  let baseCode: string | undefined = undefined
  
  // 上流会員が指定されている場合、その会員コードから基準コードを取得
  if (uplineId) {
    const upline = await prisma.mlmMember.findUnique({
      where: { id: uplineId },
      select: { memberCode: true }
    })
    if (upline && upline.memberCode) {
      const parsed = parseMemberCode(upline.memberCode)
      baseCode = parsed.baseCode
    }
  }
  // 基準コードが未指定の場合は新規生成
  if (!baseCode) {
    let newBaseCode: string
    let isUnique = false
    
    // ユニークな6桁コードを生成
    while (!isUnique) {
      newBaseCode = generateRandomSixDigits()
      
      // 同じ基準コードが存在しないか確認
      const existing = await prisma.mlmMember.findFirst({
        where: {
          memberCode: {
            startsWith: newBaseCode
          }
        }
      })
      
      if (!existing) {
        isUnique = true
        baseCode = newBaseCode
      }
    }
  }
  
  // ポジション番号が未指定の場合は自動採番
  if (position === undefined) {
    // 同じ基準コードを持つ会員を検索
    const members = await prisma.mlmMember.findMany({
      where: {
        memberCode: {
          startsWith: baseCode
        }
      },
      select: {
        memberCode: true
      },
      orderBy: {
        memberCode: 'desc'
      }
    })
    
    if (members.length === 0) {
      // 最初のポジション
      position = 1
    } else {
      // 最後のポジション番号を取得して+1
      const lastCode = members[0].memberCode
      const lastPosition = parseInt(lastCode.split('-')[1])
      position = lastPosition + 1
    }
  }
  
  // ポジション番号を2桁にゼロパディング
  const positionStr = position.toString().padStart(2, '0')
  
  return `${baseCode}-${positionStr}`
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
