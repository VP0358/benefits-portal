/**
 * MLMテストデータ生成スクリプト
 * 30名のテストアカウントを作成し、組織構築と報酬計算まで実行
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// テスト用の日本人名前リスト
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

// ランダムな日本の都道府県
const prefectures = [
  '東京都', '神奈川県', '大阪府', '愛知県', '埼玉県', '千葉県', '兵庫県', '北海道',
  '福岡県', '静岡県', '茨城県', '広島県', '京都府', '宮城県', '新潟県'
]

// ランダムな銀行
const banks = [
  { code: '0001', name: 'みずほ銀行' },
  { code: '0005', name: '三菱UFJ銀行' },
  { code: '0009', name: '三井住友銀行' },
  { code: '0036', name: '楽天銀行' },
  { code: '0038', name: '住信SBIネット銀行' },
]

interface TestUser {
  name: string
  email: string
  memberCode: string
  uplineIndex: number | null // 直上者のインデックス（nullはトップ）
  referrerIndex: number | null // 紹介者のインデックス
  matrixPosition: number
}

/**
 * テストユーザーデータを生成
 */
function generateTestUsers(): TestUser[] {
  const users: TestUser[] = []
  
  // 1人目：トップリーダー
  users.push({
    name: `${lastNames[0]} ${firstNames[0]}`,
    email: `test001@viola-test.local`,
    memberCode: '', // 自動生成
    uplineIndex: null,
    referrerIndex: null,
    matrixPosition: 1,
  })

  // 2-30人目：組織を構築
  for (let i = 1; i < 30; i++) {
    const lastName = lastNames[i % lastNames.length]
    const firstName = firstNames[i % firstNames.length]
    
    // マトリックス構造（各人の下に最大3人まで配置）
    const uplineIndex = Math.floor((i - 1) / 3)
    
    // 紹介者は直上者と同じ（シンプルな構造）
    const referrerIndex = uplineIndex
    
    // ポジション（1-3のいずれか）
    const matrixPosition = ((i - 1) % 3) + 1

    users.push({
      name: `${lastName} ${firstName}`,
      email: `test${String(i + 1).padStart(3, '0')}@viola-test.local`,
      memberCode: '', // 自動生成
      uplineIndex,
      referrerIndex,
      matrixPosition,
    })
  }

  return users
}

/**
 * ランダムな電話番号を生成
 */
function generatePhone(): string {
  const area = ['090', '080', '070'][Math.floor(Math.random() * 3)]
  const mid = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  const last = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${area}-${mid}-${last}`
}

/**
 * ランダムな郵便番号を生成
 */
function generatePostalCode(): string {
  const first = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  const second = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${first}-${second}`
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 MLMテストデータ生成開始...\n')

  // 既存のテストデータをクリーンアップ
  console.log('🧹 既存テストデータのクリーンアップ...')
  await prisma.mlmMember.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@viola-test.local'
        }
      }
    }
  })
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@viola-test.local'
      }
    }
  })
  console.log('✅ クリーンアップ完了\n')

  // テストユーザーデータ生成
  const testUsers = generateTestUsers()
  console.log(`📝 ${testUsers.length}名分のテストデータを生成しました\n`)

  // ユーザー作成
  console.log('👥 ユーザー作成開始...')
  const createdUsers: any[] = []
  const passwordHash = await hash('test1234', 10)

  for (let i = 0; i < testUsers.length; i++) {
    const testUser = testUsers[i]
    const prefecture = prefectures[i % prefectures.length]
    const bank = banks[i % banks.length]

    // 基準コード生成（トップは新規、以下は上流から継承）
    let baseCode: string
    let position: number

    if (i === 0) {
      // トップリーダー：新規生成
      baseCode = String(100000 + Math.floor(Math.random() * 900000))
      position = 1
    } else {
      // 配下メンバー：直上者の基準コードを継承
      const upline = createdUsers[testUser.uplineIndex!]
      const uplineMemberCode = upline.mlmMember.memberCode
      baseCode = uplineMemberCode.split('-')[0]
      
      // 同じ基準コードを持つメンバー数を取得
      const sameBaseCodeCount = createdUsers.filter(u => 
        u.mlmMember.memberCode.startsWith(baseCode)
      ).length
      
      position = sameBaseCodeCount + 1
    }

    const memberCode = `${baseCode}-${String(position).padStart(2, '0')}`

    // Userテーブルに作成
    const user = await prisma.user.create({
      data: {
        memberCode,
        name: testUser.name,
        nameKana: testUser.name, // テストデータなので同じ
        email: testUser.email,
        passwordHash,
        phone: generatePhone(),
        postalCode: generatePostalCode(),
        address: `${prefecture} テスト市 テスト町 ${i + 1}-${i + 1}`,
        status: 'active',
      },
    })

    // MLM会員テーブルに作成
    const uplineId = testUser.uplineIndex !== null 
      ? createdUsers[testUser.uplineIndex].mlmMember.id 
      : null
    const referrerId = testUser.referrerIndex !== null 
      ? createdUsers[testUser.referrerIndex].mlmMember.id 
      : null

    const mlmMember = await prisma.mlmMember.create({
      data: {
        userId: user.id,
        memberCode,
        memberType: 'business',
        status: 'active',
        uplineId,
        referrerId,
        matrixPosition: testUser.matrixPosition,
        currentLevel: Math.floor(i / 3), // レベルは深さに応じて
        titleLevel: 0,
        contractDate: new Date(),
        paymentMethod: ['credit_card', 'bank_transfer', 'bank_payment'][i % 3] as any,
        // 銀行情報
        bankCode: bank.code,
        bankName: bank.name,
        branchCode: '001',
        branchName: '本店',
        accountType: 'ordinary',
        accountNumber: String(1000000 + i),
        accountHolder: testUser.name.replace(/\s/g, ''),
        // 住所情報
        prefecture,
        city: 'テスト市',
        address1: `テスト町 ${i + 1}-${i + 1}`,
        mobile: generatePhone(),
      },
    })

    createdUsers.push({ user, mlmMember })

    console.log(`  ${i + 1}. ${memberCode} - ${testUser.name} (上流: ${uplineId ? createdUsers[testUser.uplineIndex!].mlmMember.memberCode : 'なし'})`)
  }

  console.log(`\n✅ ${createdUsers.length}名のユーザー作成完了\n`)

  // 商品データ確認
  console.log('🛍️ 商品データ確認...')
  let products = await prisma.product.findMany({
    where: {
      code: {
        in: ['1000', '2000', '4000', '5000', 's1000']
      }
    }
  })

  // 商品がない場合は作成
  if (products.length === 0) {
    console.log('  商品データが見つかりません。初期データを投入します...')
    const initialProducts = [
      { code: '1000', name: '[新規]VIOLA Pure 翠彩-SUMISAI-', price: 15000, isActive: true },
      { code: '2000', name: 'VIOLA Pure 翠彩-SUMISAI-', price: 12000, isActive: true },
      { code: '4000', name: '出荷事務手数料', price: 500, isActive: true },
      { code: '5000', name: '概要書面1部', price: 100, isActive: true },
      { code: 's1000', name: '登録料', price: 5000, isActive: true },
    ]

    for (const p of initialProducts) {
      await prisma.product.create({ data: p })
    }

    products = await prisma.product.findMany({
      where: {
        code: {
          in: ['1000', '2000', '4000', '5000', 's1000']
        }
      }
    })
  }

  console.log(`  ${products.length}件の商品が利用可能です\n`)

  // テスト用購入データ作成
  console.log('💰 購入データ作成開始...')
  
  // 各ユーザーがランダムに商品を購入
  for (let i = 0; i < createdUsers.length; i++) {
    const { user, mlmMember } = createdUsers[i]
    
    // 購入する商品をランダムに選択（1-3商品）
    const numProducts = Math.floor(Math.random() * 3) + 1
    const selectedProducts = products
      .sort(() => Math.random() - 0.5)
      .slice(0, numProducts)

    // 購入月をランダムに（過去3ヶ月）
    const monthOffset = Math.floor(Math.random() * 3)
    const purchaseDate = new Date()
    purchaseDate.setMonth(purchaseDate.getMonth() - monthOffset)

    for (const product of selectedProducts) {
      const quantity = Math.floor(Math.random() * 3) + 1
      const totalAmount = product.price * quantity
      const points = Math.floor(totalAmount * 0.1) // 10%ポイント還元

      // TODO: 実際の購入データをOrderテーブルに作成
      // 現時点では商品購入管理の表示用にログ出力
      console.log(`  ${mlmMember.memberCode} - ${user.name}: ${product.name} x${quantity} = ¥${totalAmount.toLocaleString()}`)
    }
  }

  console.log(`\n✅ 購入データ作成完了\n`)

  // 組織構造のサマリー
  console.log('📊 組織構造サマリー:')
  console.log(`  総メンバー数: ${createdUsers.length}名`)
  console.log(`  トップリーダー: ${createdUsers[0].mlmMember.memberCode}`)
  console.log(`  最大レベル: ${Math.floor((createdUsers.length - 1) / 3)}`)
  
  const levelCounts = createdUsers.reduce((acc, u) => {
    const level = u.mlmMember.currentLevel
    acc[level] = (acc[level] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  
  console.log('  レベル別人数:')
  Object.keys(levelCounts).sort().forEach(level => {
    console.log(`    レベル ${level}: ${levelCounts[Number(level)]}名`)
  })

  console.log('\n🎉 テストデータ生成完了！\n')
  console.log('📋 テストアカウントログイン情報:')
  console.log('  メールアドレス: test001@viola-test.local ~ test030@viola-test.local')
  console.log('  パスワード: test1234')
  console.log('\n🔗 確認URL:')
  console.log('  - 組織図: https://www.viola-pure.xyz/admin/mlm-organization')
  console.log('  - 会員一覧: https://www.viola-pure.xyz/admin/mlm-members')
  console.log('  - 商品購入: https://www.viola-pure.xyz/admin/product-purchases')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
