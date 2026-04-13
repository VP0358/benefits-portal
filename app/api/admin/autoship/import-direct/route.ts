// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * POST: クレディックス / 三菱UFJファクター から出力されたCSVを直接インポート
 *       ・伝票（AutoShipRun）が未作成なら自動作成
 *       ・CSVの結果を取り込み、決済成功会員を当月アクティブに反映
 *
 * FormData:
 *   file:          CSV ファイル（省略可: noFile=true の場合はDBから自動取得）
 *   targetMonth:   YYYY-MM
 *   paymentMethod: credit_card | bank_transfer
 *   noFile:        "true" の場合、ファイルなしでDBのオートシップ有効会員を全員取込
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const formData = await request.formData();
  const file          = formData.get("file") as File | null;
  const targetMonth   = formData.get("targetMonth") as string | null;
  const paymentMethod = formData.get("paymentMethod") as "credit_card" | "bank_transfer" | null;
  const noFile        = formData.get("noFile") === "true";

  if (!targetMonth || !paymentMethod) {
    return NextResponse.json({ error: "targetMonth, paymentMethod は必須です" }, { status: 400 });
  }

  // ── ファイルなしモード: DBのオートシップ有効会員を全員取込 ──
  if (noFile || !file) {
    return await processFromDatabase(targetMonth, paymentMethod);
  }

  // ── CSV 解析 ──
  const rawText = await file.text();
  // BOM除去（UTF-8 BOM: \ufeff）
  const text  = rawText.replace(/^\uFEFF/, "");
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 1) {
    return NextResponse.json({ error: "CSVにデータがありません" }, { status: 400 });
  }

  // CSVの列を解析するヘルパー（引用符、スペース、BOM対応）
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headerRaw  = parseCsvLine(lines[0]);
  const header     = headerRaw.map(h => h.replace(/^"|"$/g, "").replace(/^\uFEFF/, "").trim().toLowerCase());

  // ── クレディックス / 三菱UFJファクター CSVフォーマット自動判定 ──
  // クレディックスCSV形式:
  //   IPコード,オーダーNo,電話番号,処理日時,結果,3D認証,送信内容,E-mail,送信ID,送信パスワード,ID(sendid),SENDPOINT,処理金額,決済方法,端末種別
  //   col[10]=ID(sendid)=会員コード, ファイル内の全行が決済成功
  const isCredixFormat = header.some(h =>
    h.includes("sendid") || h.includes("sendpoint") || h.includes("id(sendid)")
  );

  let codeIdx: number;
  let resultIdx: number;
  let reasonIdx: number;

  if (isCredixFormat) {
    // クレディックスCSV: "ID(sendid)"列が会員コード
    codeIdx = header.findIndex(h =>
      h.includes("sendid") || h === "id(sendid)" || h.includes("id(send")
    );
    resultIdx = header.findIndex(h => h.includes("結果") || h.includes("result"));
    if (codeIdx   === -1) codeIdx   = 10; // フォールバック: 11列目（0-indexed: 10）
    if (resultIdx === -1) resultIdx = 4;  // フォールバック
    reasonIdx = -1;
  } else {
    // 汎用フォーマット: 会員コード列を広く探す（より多くのパターンに対応）
    codeIdx = header.findIndex(h =>
      h.includes("会員コード") || h.includes("membercode") || h === "code" ||
      h.includes("会員no") || h.includes("会員番号") || h.includes("member_code") ||
      h.includes("コード") || h.includes("会員") || h.includes("顧客コード") ||
      h.includes("customercode") || h.includes("customer_code") || h === "id" ||
      h.includes("member id") || h.includes("memberid")
    );
    resultIdx = header.findIndex(h =>
      h.includes("結果") || h.includes("result") || h.includes("status") || h.includes("決済")
    );
    reasonIdx = header.findIndex(h =>
      h.includes("理由") || h.includes("reason") || h.includes("error") || h.includes("失敗")
    );
  }

  // ヘッダーが1行しかない場合（= データなし）は全行が会員コードとして処理
  const dataLines = lines.length > 1 ? lines.slice(1) : [];

  // 会員コード列が見つからない場合のフォールバック処理
  // → ヘッダー無しCSV（1列目が会員コード）として処理、または全行を会員コードとして扱う
  let noHeaderMode = false;
  if (codeIdx === -1) {
    // ヘッダー行の1列目の値が実際の会員コードっぽいかチェック（数字・ハイフン形式）
    const firstVal = headerRaw[0]?.replace(/^"|"$/g, "").trim() ?? "";
    const looksLikeMemberCode = /^[0-9]+(-[0-9]+)?$/.test(firstVal);

    if (looksLikeMemberCode) {
      // ヘッダーなしCSV：全行（ヘッダー含む）が会員コード
      noHeaderMode = true;
      codeIdx = 0;
      resultIdx = -1;
      reasonIdx = -1;
    } else if (dataLines.length > 0) {
      // データ行の1列目を会員コードとして扱うフォールバック
      // （ヘッダー列名が認識できないが、データは存在する）
      codeIdx = 0;
      resultIdx = -1;
      reasonIdx = -1;
    } else {
      // デバッグ用にヘッダー内容を返す
      return NextResponse.json(
        {
          error: `CSVの形式が正しくありません（会員コード列が見つかりません）。\n検出されたヘッダー列: [${headerRaw.join(", ")}]\nID(sendid)列または会員コード列が必要です。\n\n対応フォーマット:\n① クレディックスCSV: ヘッダーに「ID(sendid)」列を含む形式\n② 汎用CSV: ヘッダーに「会員コード」「code」等の列を含む形式\n③ ヘッダーなしCSV: 1列目が会員コードの形式（ヘッダーなし）`,
          detectedHeaders: headerRaw,
          isCredixFormat,
          hint: "1列目が会員コードのシンプルなCSVであれば、ヘッダーなしで1行目から会員コードを記載してください。",
        },
        { status: 400 }
      );
    }
  }

  // ヘッダーなしモードの場合は全行（lines[0]も含む）をデータとして使用
  const effectiveDataLines = noHeaderMode ? lines : dataLines;

  if (effectiveDataLines.length === 0) {
    return NextResponse.json({ error: "CSVにデータ行がありません（ヘッダー行のみ）" }, { status: 400 });
  }

  // memberCode → { ok, reason }
  const resultMap = new Map<string, { ok: boolean; reason?: string }>();
  for (const line of effectiveDataLines) {
    if (!line.trim()) continue;
    const cols       = parseCsvLine(line).map(c => c.replace(/^"|"$/g, "").trim());
    const memberCode = cols[codeIdx] ?? "";
    if (!memberCode || memberCode === "-" || memberCode === "") continue;

    let ok     = true;
    let reason: string | undefined = undefined;

    if (isCredixFormat) {
      // クレディックスCSVはファイルに含まれる行が全て決済成功
      // （決済失敗は別途エラーファイルで管理）
      ok = true;
    } else {
      const result = cols[resultIdx] ?? "";
      ok = result === "OK" || result === "0" || result.toLowerCase() === "success" || result === "1";
      reason = reasonIdx >= 0 ? (cols[reasonIdx] ?? undefined) : undefined;
    }

    resultMap.set(memberCode, { ok, reason });
  }

  // ── 対象会員取得 ──
  const memberCodes   = Array.from(resultMap.keys());
  const mlmMembers    = await prisma.mlmMember.findMany({
    where: { memberCode: { in: memberCodes } },
    include: {
      user: {
        select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
      },
      mlmRegistration: {
        select: {
          bankName: true, bankBranch: true, bankAccountType: true,
          bankAccountNumber: true, bankAccountHolder: true,
          deliveryPostalCode: true, deliveryAddress: true,
        },
      },
    },
  });

  const memberMap = new Map(mlmMembers.map(m => [m.memberCode, m]));

  const UNIT_PRICE = 16500;
  const POINTS     = 150;
  const now        = new Date();

  // ── 伝票（AutoShipRun）を取得 or 作成 ──
  let run = await prisma.autoShipRun.findUnique({
    where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
    include: { orders: true },
  });

  let runCreated = false;
  if (!run) {
    // 伝票がまだないので新規作成
    runCreated = true;
    await prisma.$transaction(async (tx) => {
      const newRun = await tx.autoShipRun.create({
        data: {
          targetMonth,
          paymentMethod,
          totalCount: mlmMembers.length,
          totalAmount: mlmMembers.length * UNIT_PRICE,
        },
      });

      await tx.autoShipOrder.createMany({
        data: mlmMembers.map(m => ({
          autoShipRunId: newRun.id,
          mlmMemberId:   m.id,
          targetMonth,
          paymentMethod,
          memberCode:    m.memberCode,
          memberName:    m.user.name,
          memberNameKana: m.user.nameKana ?? null,
          memberPhone:   m.user.phone ?? null,
          memberEmail:   m.user.email ?? null,
          memberPostal:  m.mlmRegistration?.deliveryPostalCode ?? m.user.postalCode ?? null,
          memberAddress: m.mlmRegistration?.deliveryAddress ?? m.user.address ?? null,
          bankName:      m.mlmRegistration?.bankName ?? null,
          branchName:    m.mlmRegistration?.bankBranch ?? null,
          accountType:   m.mlmRegistration?.bankAccountType ?? null,
          accountNumber: m.mlmRegistration?.bankAccountNumber ?? null,
          accountHolder: m.mlmRegistration?.bankAccountHolder ?? null,
          unitPrice:     UNIT_PRICE,
          totalAmount:   UNIT_PRICE,
          points:        POINTS,
        })),
        skipDuplicates: true,
      });
    });

    run = await prisma.autoShipRun.findUnique({
      where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
      include: { orders: true },
    });
  }

  if (!run) {
    return NextResponse.json({ error: "伝票の取得に失敗しました" }, { status: 500 });
  }

  // ── 結果を取り込んでアクティブ反映 ──
  let paidCount   = 0;
  let failedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const order of run!.orders) {
      const res = resultMap.get(order.memberCode);
      if (!res) continue;

      if (res.ok) {
        // 決済成功
        await tx.autoShipOrder.update({
          where: { id: order.id },
          data: { status: "paid", paidAt: now },
        });

        // MlmPurchase 記録（重複チェック）
        const existingPurchase = await tx.mlmPurchase.findFirst({
          where: {
            mlmMemberId:   order.mlmMemberId,
            purchaseMonth: targetMonth,
            productCode:   order.productCode,
          },
        });
        if (!existingPurchase) {
          await tx.mlmPurchase.create({
            data: {
              mlmMemberId:  order.mlmMemberId,
              productCode:  order.productCode,
              productName:  order.productName,
              quantity:     order.quantity,
              unitPrice:    order.unitPrice,
              points:       order.points,
              totalPoints:  order.points * order.quantity,
              purchaseMonth: targetMonth,
              purchasedAt:  now,
            },
          });
        }

        // 会員ステータスをアクティブに
        await tx.mlmMember.update({
          where: { id: order.mlmMemberId },
          data:  { status: "active" },
        });

        // SAVボーナス付与（オートシップ時: 15,000円の5% = 750pt 固定）
        const memberRecord = memberMap.get(order.memberCode);
        if (memberRecord) {
          const AUTOSHIP_BASE = 15000;
          const AUTOSHIP_RATE = 0.05;
          const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE); // 750pt
          if (savingsPoints > 0) {
            await tx.pointWallet.upsert({
              where: { userId: memberRecord.userId },
              update: {
                externalPointsBalance: { increment: savingsPoints },
                availablePointsBalance: { increment: savingsPoints },
              },
              create: {
                userId:                memberRecord.userId,
                externalPointsBalance: savingsPoints,
                availablePointsBalance: savingsPoints,
              },
            });
            // MlmMemberの貯金ポイント累計も更新
            await tx.mlmMember.update({
              where: { id: memberRecord.id },
              data: { savingsPoints: { increment: savingsPoints } },
            });
          }
        }

        paidCount++;
      } else {
        // 決済失敗
        await tx.autoShipOrder.update({
          where: { id: order.id },
          data: { status: "failed", failReason: res.reason ?? "決済失敗" },
        });
        failedCount++;
      }
    }

    // Run ステータス更新
    await tx.autoShipRun.update({
      where: { id: run!.id },
      data: {
        paidCount,
        failedCount,
        importedAt: now,
        status:     paidCount + failedCount > 0 ? "imported" : "draft",
      },
    });
  });

  return NextResponse.json({
    runId:       run.id.toString(),
    paidCount,
    failedCount,
    runCreated,
  }, { status: 200 });
}

/**
 * ファイルなしモード: DBのオートシップ有効会員を対象月・支払方法でフィルタして全員取込
 */
async function processFromDatabase(
  targetMonth: string,
  paymentMethod: "credit_card" | "bank_transfer"
): Promise<Response> {
  const UNIT_PRICE = 16500;
  const POINTS     = 150;
  const now        = new Date();

  const [year, month] = targetMonth.split("-").map(Number);
  const targetMonthStart = new Date(`${targetMonth}-01`);
  const nextMonthStart   = new Date(year, month, 1);

  // オートシップ有効会員を取得
  const allMembers = await prisma.mlmMember.findMany({
    where: {
      autoshipEnabled: true,
      status: { not: "withdrawn" },
      autoshipStartDate: { not: null },
    },
    include: {
      user: {
        select: { name: true, nameKana: true, phone: true, email: true, postalCode: true, address: true },
      },
      mlmRegistration: {
        select: {
          bankName: true, bankBranch: true, bankAccountType: true,
          bankAccountNumber: true, bankAccountHolder: true,
          deliveryPostalCode: true, deliveryAddress: true,
        },
      },
    },
  });

  // 対象月・支払方法でフィルタ
  const mlmMembers = allMembers.filter(m => {
    if (m.autoshipStartDate && m.autoshipStartDate > targetMonthStart) return false;
    if (m.autoshipStopDate && m.autoshipStopDate < nextMonthStart) return false;
    if (m.autoshipSuspendMonths) {
      const months = m.autoshipSuspendMonths.split(",").map((s: string) => s.trim());
      if (months.includes(targetMonth)) return false;
    }
    const hasBank = !!(m.mlmRegistration?.bankAccountNumber);
    if (paymentMethod === "bank_transfer") return hasBank;
    return !hasBank;
  });

  if (mlmMembers.length === 0) {
    return NextResponse.json({ error: `対象月 ${targetMonth} / ${paymentMethod} のオートシップ有効会員が見つかりません` }, { status: 400 });
  }

  const memberMap = new Map(mlmMembers.map(m => [m.memberCode, m]));

  // AutoShipRun を取得 or 作成
  let run = await prisma.autoShipRun.findUnique({
    where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
    include: { orders: true },
  });

  let runCreated = false;
  if (!run) {
    runCreated = true;
    await prisma.$transaction(async (tx) => {
      const newRun = await tx.autoShipRun.create({
        data: {
          targetMonth,
          paymentMethod,
          totalCount:   mlmMembers.length,
          totalAmount:  mlmMembers.length * UNIT_PRICE,
        },
      });

      await tx.autoShipOrder.createMany({
        data: mlmMembers.map(m => ({
          autoShipRunId:  newRun.id,
          mlmMemberId:    m.id,
          targetMonth,
          paymentMethod,
          memberCode:     m.memberCode,
          memberName:     m.user.name,
          memberNameKana: m.user.nameKana ?? null,
          memberPhone:    m.user.phone ?? null,
          memberEmail:    m.user.email ?? null,
          memberPostal:   m.mlmRegistration?.deliveryPostalCode ?? m.user.postalCode ?? null,
          memberAddress:  m.mlmRegistration?.deliveryAddress ?? m.user.address ?? null,
          bankName:       m.mlmRegistration?.bankName ?? null,
          branchName:     m.mlmRegistration?.bankBranch ?? null,
          accountType:    m.mlmRegistration?.bankAccountType ?? null,
          accountNumber:  m.mlmRegistration?.bankAccountNumber ?? null,
          accountHolder:  m.mlmRegistration?.bankAccountHolder ?? null,
          unitPrice:      UNIT_PRICE,
          totalAmount:    UNIT_PRICE,
          points:         POINTS,
        })),
        skipDuplicates: true,
      });
    });

    run = await prisma.autoShipRun.findUnique({
      where: { targetMonth_paymentMethod: { targetMonth, paymentMethod } },
      include: { orders: true },
    });
  }

  if (!run) {
    return NextResponse.json({ error: "伝票の取得に失敗しました" }, { status: 500 });
  }

  // 全注文を決済成功として反映
  let paidCount   = 0;
  let failedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const order of run!.orders) {
      const memberRecord = memberMap.get(order.memberCode);
      if (!memberRecord) continue;

      await tx.autoShipOrder.update({
        where: { id: order.id },
        data:  { status: "paid", paidAt: now },
      });

      // MlmPurchase 記録（重複チェック）
      const existingPurchase = await tx.mlmPurchase.findFirst({
        where: { mlmMemberId: order.mlmMemberId, purchaseMonth: targetMonth, productCode: order.productCode },
      });
      if (!existingPurchase) {
        await tx.mlmPurchase.create({
          data: {
            mlmMemberId:  order.mlmMemberId,
            productCode:  order.productCode,
            productName:  order.productName,
            quantity:     order.quantity,
            unitPrice:    order.unitPrice,
            points:       order.points,
            totalPoints:  order.points * order.quantity,
            purchaseMonth: targetMonth,
            purchasedAt:  now,
          },
        });
      }

      await tx.mlmMember.update({
        where: { id: order.mlmMemberId },
        data:  { status: "active" },
      });

      // SAVボーナス付与
      const AUTOSHIP_BASE = 15000;
      const AUTOSHIP_RATE = 0.05;
      const savingsPoints = Math.floor(AUTOSHIP_BASE * AUTOSHIP_RATE);
      if (savingsPoints > 0) {
        await tx.pointWallet.upsert({
          where: { userId: memberRecord.userId },
          update: {
            externalPointsBalance:  { increment: savingsPoints },
            availablePointsBalance: { increment: savingsPoints },
          },
          create: {
            userId:                 memberRecord.userId,
            externalPointsBalance:  savingsPoints,
            availablePointsBalance: savingsPoints,
          },
        });
        await tx.mlmMember.update({
          where: { id: memberRecord.id },
          data:  { savingsPoints: { increment: savingsPoints } },
        });
      }

      paidCount++;
    }

    await tx.autoShipRun.update({
      where: { id: run!.id },
      data: {
        paidCount,
        failedCount,
        importedAt: now,
        status:     paidCount > 0 ? "imported" : "draft",
      },
    });
  });

  return NextResponse.json({
    runId:      run.id.toString(),
    paidCount,
    failedCount,
    runCreated,
    mode:       "db_auto",
  }, { status: 200 });
}
