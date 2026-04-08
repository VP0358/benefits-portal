/**
 * 日本の銀行コード・支店コードマスタデータ
 */

export interface Bank {
  code: string
  name: string
  kana: string
}

export interface Branch {
  bankCode: string
  code: string
  name: string
  kana: string
}

/**
 * 主要銀行マスタデータ
 */
export const BANKS: Bank[] = [
  // 都市銀行
  { code: '0001', name: 'みずほ銀行', kana: 'ミズホ' },
  { code: '0005', name: '三菱UFJ銀行', kana: 'ミツビシユ-エフジエイ' },
  { code: '0009', name: '三井住友銀行', kana: 'ミツイスミトモ' },
  { code: '0010', name: 'りそな銀行', kana: 'リソナ' },
  { code: '0017', name: '埼玉りそな銀行', kana: 'サイタマリソナ' },
  
  // 信託銀行
  { code: '0288', name: '三菱UFJ信託銀行', kana: 'ミツビシユ-エフジエイシンタク' },
  { code: '0294', name: 'みずほ信託銀行', kana: 'ミズホシンタク' },
  { code: '0297', name: '三井住友信託銀行', kana: 'ミツイスミトモシンタク' },
  
  // ネット銀行
  { code: '0033', name: 'ジャパンネット銀行', kana: 'ジヤパンネツト' },
  { code: '0034', name: 'セブン銀行', kana: 'セブン' },
  { code: '0035', name: 'ソニー銀行', kana: 'ソニ-' },
  { code: '0036', name: '楽天銀行', kana: 'ラクテン' },
  { code: '0038', name: '住信SBIネット銀行', kana: 'スミシンエスビ-アイネツト' },
  { code: '0039', name: 'auじぶん銀行', kana: 'エ-ユ-ジブン' },
  { code: '0040', name: 'イオン銀行', kana: 'イオン' },
  { code: '0042', name: '大和ネクスト銀行', kana: 'ダイワネクスト' },
  { code: '0043', name: 'ローソン銀行', kana: 'ロ-ソン' },
  { code: '0044', name: 'GMOあおぞらネット銀行', kana: 'ジ-エムオ-アオゾラネツト' },
  { code: '0045', name: 'みんなの銀行', kana: 'ミンナノ' },
  
  // ゆうちょ銀行
  { code: '9900', name: 'ゆうちょ銀行', kana: 'ユウチヨ' },
  
  // 地方銀行（主要行のみ）
  { code: '0116', name: '北海道銀行', kana: 'ホツカイドウ' },
  { code: '0117', name: '青森銀行', kana: 'アオモリ' },
  { code: '0118', name: 'みちのく銀行', kana: 'ミチノク' },
  { code: '0119', name: '秋田銀行', kana: 'アキタ' },
  { code: '0120', name: '北都銀行', kana: 'ホクト' },
  { code: '0121', name: '荘内銀行', kana: 'シヨウナイ' },
  { code: '0122', name: '山形銀行', kana: 'ヤマガタ' },
  { code: '0123', name: '岩手銀行', kana: 'イワテ' },
  { code: '0124', name: '東北銀行', kana: 'トウホク' },
  { code: '0125', name: '七十七銀行', kana: 'シチジユウシチ' },
  { code: '0126', name: '東邦銀行', kana: 'トウホウ' },
  { code: '0128', name: '群馬銀行', kana: 'グンマ' },
  { code: '0129', name: '足利銀行', kana: 'アシカガ' },
  { code: '0130', name: '常陽銀行', kana: 'ジヨウヨウ' },
  { code: '0131', name: '筑波銀行', kana: 'ツクバ' },
  { code: '0133', name: '武蔵野銀行', kana: 'ムサシノ' },
  { code: '0134', name: '千葉銀行', kana: 'チバ' },
  { code: '0135', name: '千葉興業銀行', kana: 'チバコウギヨウ' },
  { code: '0137', name: 'きらぼし銀行', kana: 'キラボシ' },
  { code: '0138', name: '横浜銀行', kana: 'ヨコハマ' },
  { code: '0140', name: '第四北越銀行', kana: 'ダイシホクエツ' },
  { code: '0142', name: '山梨中央銀行', kana: 'ヤマナシチユウオウ' },
  { code: '0143', name: '八十二銀行', kana: 'ハチジユウニ' },
  { code: '0144', name: '北陸銀行', kana: 'ホクリク' },
  { code: '0145', name: '富山銀行', kana: 'トヤマ' },
  { code: '0146', name: '北國銀行', kana: 'ホツコク' },
  { code: '0147', name: '福井銀行', kana: 'フクイ' },
  { code: '0149', name: '静岡銀行', kana: 'シズオカ' },
  { code: '0150', name: 'スルガ銀行', kana: 'スルガ' },
  { code: '0151', name: '清水銀行', kana: 'シミズ' },
  { code: '0152', name: '大垣共立銀行', kana: 'オオガキキヨウリツ' },
  { code: '0153', name: '十六銀行', kana: 'ジユウロク' },
  { code: '0154', name: '三十三銀行', kana: 'サンジユウサン' },
  { code: '0155', name: '百五銀行', kana: 'ヒヤクゴ' },
  { code: '0157', name: '滋賀銀行', kana: 'シガ' },
  { code: '0158', name: '京都銀行', kana: 'キヨウト' },
  { code: '0159', name: '関西みらい銀行', kana: 'カンサイミライ' },
  { code: '0161', name: '池田泉州銀行', kana: 'イケダセンシユウ' },
  { code: '0162', name: '南都銀行', kana: 'ナント' },
  { code: '0163', name: '紀陽銀行', kana: 'キヨウ' },
  { code: '0164', name: '但馬銀行', kana: 'タジマ' },
  { code: '0166', name: '鳥取銀行', kana: 'トツトリ' },
  { code: '0167', name: '山陰合同銀行', kana: 'サンインゴウドウ' },
  { code: '0168', name: '中国銀行', kana: 'チユウゴク' },
  { code: '0169', name: '広島銀行', kana: 'ヒロシマ' },
  { code: '0170', name: '山口銀行', kana: 'ヤマグチ' },
  { code: '0172', name: '阿波銀行', kana: 'アワ' },
  { code: '0173', name: '百十四銀行', kana: 'ヒヤクジユウシ' },
  { code: '0174', name: '伊予銀行', kana: 'イヨ' },
  { code: '0175', name: '四国銀行', kana: 'シコク' },
  { code: '0177', name: '福岡銀行', kana: 'フクオカ' },
  { code: '0178', name: '筑邦銀行', kana: 'チクホウ' },
  { code: '0179', name: '佐賀銀行', kana: 'サガ' },
  { code: '0180', name: '十八親和銀行', kana: 'ジユウハチシンワ' },
  { code: '0182', name: '肥後銀行', kana: 'ヒゴ' },
  { code: '0183', name: '大分銀行', kana: 'オオイタ' },
  { code: '0184', name: '宮崎銀行', kana: 'ミヤザキ' },
  { code: '0185', name: '鹿児島銀行', kana: 'カゴシマ' },
  { code: '0187', name: '琉球銀行', kana: 'リユウキユウ' },
  { code: '0188', name: '沖縄銀行', kana: 'オキナワ' },
]

/**
 * 主要支店データ（各銀行の本店・主要支店のみ）
 */
export const BRANCHES: Branch[] = [
  // みずほ銀行
  { bankCode: '0001', code: '001', name: '本店営業部', kana: 'ホンテンエイギヨウブ' },
  { bankCode: '0001', code: '002', name: '東京営業部', kana: 'トウキヨウエイギヨウブ' },
  
  // 三菱UFJ銀行
  { bankCode: '0005', code: '001', name: '本店', kana: 'ホンテン' },
  { bankCode: '0005', code: '002', name: '丸の内支店', kana: 'マルノウチ' },
  
  // 三井住友銀行
  { bankCode: '0009', code: '001', name: '本店営業部', kana: 'ホンテンエイギヨウブ' },
  { bankCode: '0009', code: '002', name: '東京営業部', kana: 'トウキヨウエイギヨウブ' },
  
  // りそな銀行
  { bankCode: '0010', code: '001', name: '東京営業部', kana: 'トウキヨウエイギヨウブ' },
  
  // 楽天銀行（主要支店）
  { bankCode: '0036', code: '101', name: '本店営業部', kana: 'ホンテンエイギヨウブ' },
  { bankCode: '0036', code: '201', name: 'ロック支店', kana: 'ロツク' },
  { bankCode: '0036', code: '202', name: 'サンバ支店', kana: 'サンバ' },
  
  // ゆうちょ銀行
  { bankCode: '9900', code: '001', name: '本店', kana: 'ホンテン' },
  { bankCode: '9900', code: '008', name: '○○八店', kana: 'ゼロゼロハチテン' },
]

/**
 * 銀行コードから銀行名を取得
 */
export function getBankNameByCode(code: string): string | null {
  const bank = BANKS.find(b => b.code === code)
  return bank ? bank.name : null
}

/**
 * 銀行名から銀行コードを取得
 */
export function getBankCodeByName(name: string): string | null {
  const bank = BANKS.find(b => b.name === name)
  return bank ? bank.code : null
}

/**
 * 支店コードから支店名を取得
 */
export function getBranchNameByCode(bankCode: string, branchCode: string): string | null {
  const branch = BRANCHES.find(b => b.bankCode === bankCode && b.code === branchCode)
  return branch ? branch.name : null
}

/**
 * 支店名から支店コードを取得
 */
export function getBranchCodeByName(bankCode: string, branchName: string): string | null {
  const branch = BRANCHES.find(b => b.bankCode === bankCode && b.name === branchName)
  return branch ? branch.code : null
}

/**
 * 指定銀行の支店一覧を取得
 */
export function getBranchesByBankCode(bankCode: string): Branch[] {
  return BRANCHES.filter(b => b.bankCode === bankCode)
}
