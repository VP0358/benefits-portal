import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  // ① 全MLM会員の関係値確認
  const members = await prisma.mlmMember.findMany({
    include: {
      user: { select: { name: true, email: true } },
      referrer: { select: { memberCode: true, user: { select: { name: true } } } },
      upline:   { select: { memberCode: true, user: { select: { name: true } } } },
      referrals: { select: { memberCode: true } },
      downlines: { select: { memberCode: true } },
    },
    orderBy: { id: 'asc' }
  });

  console.log('\n========================================');
  console.log('① MLM会員 紹介者・直上者 関係チェック');
  console.log('========================================');
  console.log('総会員数:', members.length, '\n');

  let refOk = 0, refNg = 0;
  for (const m of members) {
    const refOK  = m.referrerId ? !!m.referrer  : true;
    const upOK   = m.uplineId   ? !!m.upline    : true;
    const status = (!refOK || !upOK) ? '⚠️ NG' : '✅ OK';
    if (!refOK || !upOK) refNg++;
    else refOk++;

    console.log(`${status} [${m.memberCode}] ${m.user?.name}`);
    console.log(`   status:${m.status} | level:${m.currentLevel} | contractDate:${m.contractDate?.toISOString().slice(0,10) ?? 'null'} | autoship:${m.autoshipEnabled}`);
    console.log(`   紹介者: ${m.referrerId?.toString() ?? 'null'} ${m.referrer ? '→ '+m.referrer.memberCode+'/'+m.referrer.user?.name : '(なし)'} ${refOK ? '' : '← ID不一致!'}`);
    console.log(`   直上者: ${m.uplineId?.toString()   ?? 'null'} ${m.upline   ? '→ '+m.upline.memberCode  +'/'+m.upline.user?.name   : '(なし)'} ${upOK  ? '' : '← ID不一致!'}`);
    console.log(`   紹介配下:${m.referrals.length}名 / 直下ダウン:${m.downlines.length}名`);
    console.log();
  }
  console.log(`関係値チェック結果: OK=${refOk} / NG=${refNg}`);

  // ② ポイントウォレット確認
  const wallets = await prisma.pointWallet.findMany({
    include: { user: { select: { name: true, memberCode: true } } },
    orderBy: { id: 'asc' }
  });
  console.log('\n========================================');
  console.log('② ポイントウォレット確認');
  console.log('========================================');
  for (const w of wallets) {
    console.log(`[${w.user?.memberCode}] ${w.user?.name} : 自動pt=${w.autoPoints} / 手動pt=${w.manualPoints} / 外部pt=${w.externalPoints} / 利用可能pt=${w.availablePoints} / SAVpt=${w.savingsPoints ?? 0}`);
  }

  // ③ 購入実績（3月分）確認
  const purchases = await prisma.mlmPurchase.findMany({
    where: { purchaseDate: { gte: new Date('2025-03-01'), lt: new Date('2025-04-01') } },
    include: { mlmMember: { select: { memberCode: true, user: { select: { name: true } } } } },
    orderBy: { purchaseDate: 'asc' }
  });
  console.log('\n========================================');
  console.log('③ 3月分 購入実績（mlm_purchases）');
  console.log('========================================');
  console.log('件数:', purchases.length);
  for (const p of purchases) {
    console.log(`[${p.mlmMember?.memberCode}] ${p.mlmMember?.user?.name} | 日付:${p.purchaseDate.toISOString().slice(0,10)} | 数量:${p.quantity} | PV:${p.pv} | isActive:${p.isActive}`);
  }

  // ④ 既存ボーナスラン確認
  const bonusRuns = await prisma.bonusRun.findMany({ orderBy: { bonusMonth: 'desc' }, take: 10 });
  console.log('\n========================================');
  console.log('④ ボーナスラン履歴（直近10件）');
  console.log('========================================');
  if (bonusRuns.length === 0) console.log('なし');
  for (const r of bonusRuns) {
    console.log(`月:${r.bonusMonth} | ステータス:${r.status} | 会員数:${r.totalMembers} | ボーナス総額:${r.totalBonus} | 実行日:${r.createdAt.toISOString().slice(0,10)}`);
  }

  // ⑤ ボーナス設定確認
  const bonusSetting = await prisma.bonusSetting.findFirst();
  console.log('\n========================================');
  console.log('⑤ ボーナス設定');
  console.log('========================================');
  if (bonusSetting) {
    console.log('ダイレクトボーナス金額:', bonusSetting.directBonusAmount);
    console.log('事務手数料:', bonusSetting.serviceFeeAmount);
    console.log('最低振込額:', bonusSetting.minPayoutAmount);
    console.log('オートシップ率:', bonusSetting.autoshipRate + '%');
    console.log('activeThreshold:', bonusSetting.activeThresholdPoints, 'pt');
  } else {
    console.log('⚠️ ボーナス設定なし');
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
