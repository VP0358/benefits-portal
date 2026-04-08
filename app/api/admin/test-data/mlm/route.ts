// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { prisma } from "@/lib/prisma";
import { hash } from 'bcryptjs'

// テスト用の名前リスト
const firstNames = [
  '太郎', '次郎', '三郎', '花子', '美咲', '翔太', '健太', '陽子', '智子', '大輔',
  '裕子', '明', '由美', '隆', '恵', '浩', '真由美', '剛', '優子', '誠',
  '直子', '修', '京子', '勇', '愛', '正', '千代', '実', '春菜', '涼太'
]

const lastNames = [
  '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤',
  '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水',
  '山崎', '森', '池田', '橋本', '阿部', '石川', '山下', '中島', '石井', '小川'
]

const prefectures = [
  '東京都', '神奈川県', '大阪府', '愛知県', '埼玉県', '千葉県', '兵庫県', '北海道',
  '福岡県', '静岡県', '茨城県', '広島県', '京都府', '宮城県', '新潟県'
]

const banks = [
  { code: '0001', name: 'みずほ銀行' },
  { code: '0005', name: '三菱UFJ銀行' },
  { code: '0009', name: '三井住友銀行' },
  { code: '0036', name: '楽天銀行' },
  { code: '0038', name: '住信SBIネット銀行' },
]

function generatePhone(): string {
  const area = ['090', '080', '070'][Math.floor(Math.random() * 3)]
  const mid = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  const last = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${area}-${mid}-${last}`
}

function generatePostalCode(): string {
  const first = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  const second = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${first}-${second}`
}

/**
 * POST /api/admin/test-data/mlm
 * MLMテストデータ生成（30名）
 */
export async function POST() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const logs: string[] = []
    
    // 既存テストデータクリーンアップ
    logs.push('🧹 既存テストデータのクリーンアップ...')
    await prisma.mlmMember.deleteMany({
      where: {
        user: {
          email: { endsWith: '@viola-test.local' }
        }
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: { endsWith: '@viola-test.local' }
      }
    })
    logs.push('✅ クリーンアップ完了')

    // パスワードハッシュ生成
    const passwordHash = await hash('test1234', 10)
    
    const createdUsers: any[] = []
    logs.push('\n👥 ユーザー作成開始...')

    // 30名作成
    for (let i = 0; i < 30; i++) {
      const lastName = lastNames[i % lastNames.length]
      const firstName = firstNames[i % firstNames.length]
      const name = `${lastName} ${firstName}`
      const email = `test${String(i + 1).padStart(3, '0')}@viola-test.local`
      
      const prefecture = prefectures[i % prefectures.length]
      const bank = banks[i % banks.length]

      // 基準コード生成
      let baseCode: string
      let position: number

      if (i === 0) {
        baseCode = String(100000 + Math.floor(Math.random() * 900000))
        position = 1
      } else {
        const uplineIndex = Math.floor((i - 1) / 3)
        const upline = createdUsers[uplineIndex]
        baseCode = upline.mlmMember.memberCode.split('-')[0]
        
        const sameBaseCodeCount = createdUsers.filter((u: any) => 
          u.mlmMember.memberCode.startsWith(baseCode)
        ).length
        
        position = sameBaseCodeCount + 1
      }

      const memberCode = `${baseCode}-${String(position).padStart(2, '0')}`

      // User作成
      const user = await prisma.user.create({
        data: {
          memberCode,
          name,
          nameKana: name,
          email,
          passwordHash,
          phone: generatePhone(),
          postalCode: generatePostalCode(),
          address: `${prefecture} テスト市 テスト町 ${i + 1}-${i + 1}`,
          status: 'active',
        },
      })

      // MLM会員作成
      const uplineIndex = i === 0 ? null : Math.floor((i - 1) / 3)
      const uplineId = uplineIndex !== null ? createdUsers[uplineIndex].mlmMember.id : null
      const referrerId = uplineId
      const matrixPosition = i === 0 ? 1 : ((i - 1) % 3) + 1

      const mlmMember = await prisma.mlmMember.create({
        data: {
          userId: user.id,
          memberCode,
          memberType: 'business',
          status: 'active',
          uplineId,
          referrerId,
          matrixPosition,
          currentLevel: Math.floor(i / 3),
          titleLevel: 0,
          contractDate: new Date(),
          paymentMethod: ['credit_card', 'bank_transfer', 'bank_payment'][i % 3] as any,
          bankCode: bank.code,
          bankName: bank.name,
          branchCode: '001',
          branchName: '本店',
          accountType: 'ordinary',
          accountNumber: String(1000000 + i),
          accountHolder: name.replace(/\s/g, ''),
          prefecture,
          city: 'テスト市',
          address1: `テスト町 ${i + 1}-${i + 1}`,
          mobile: generatePhone(),
        },
      })

      createdUsers.push({ user, mlmMember })
      
      const uplineCode = uplineId ? createdUsers[uplineIndex!].mlmMember.memberCode : 'なし'
      logs.push(`  ${i + 1}. ${memberCode} - ${name} (上流: ${uplineCode})`)
    }

    logs.push(`\n✅ ${createdUsers.length}名のユーザー作成完了`)

    // 組織サマリー
    logs.push('\n📊 組織構造サマリー:')
    logs.push(`  総メンバー数: ${createdUsers.length}名`)
    logs.push(`  トップリーダー: ${createdUsers[0].mlmMember.memberCode}`)
    
    const levelCounts: Record<number, number> = {}
    createdUsers.forEach(u => {
      const level = u.mlmMember.currentLevel
      levelCounts[level] = (levelCounts[level] || 0) + 1
    })
    
    logs.push('  レベル別人数:')
    Object.keys(levelCounts).sort().forEach(level => {
      logs.push(`    レベル ${level}: ${levelCounts[Number(level)]}名`)
    })

    logs.push('\n🎉 テストデータ生成完了！')
    logs.push('\n📋 テストアカウントログイン情報:')
    logs.push('  メールアドレス: test001@viola-test.local ~ test030@viola-test.local')
    logs.push('  パスワード: test1234')

    return NextResponse.json({
      message: 'テストデータ生成完了',
      count: createdUsers.length,
      topLeader: createdUsers[0].mlmMember.memberCode,
      logs: logs.join('\n'),
    });
  } catch (error) {
    console.error("Error creating test data:", error);
    return NextResponse.json(
      { error: "テストデータ生成に失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
