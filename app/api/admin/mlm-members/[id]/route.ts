export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";


// DELETE: 会員削除（継続購入自動停止 + User含む全データ削除）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let memberId: bigint;
  try {
    memberId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const member = await prisma.mlmMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });
    if (!member) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // ① 継続購入（オートシップ）を停止
      await tx.mlmMember.update({
        where: { id: memberId },
        data: {
          autoshipEnabled: false,
          autoshipStopDate: new Date(),
        },
      });

      // ② ダウンラインの uplineId / referrerId を null にして組織から切り離す
      await tx.mlmMember.updateMany({
        where: { uplineId: memberId },
        data: { uplineId: null },
      });
      await tx.mlmMember.updateMany({
        where: { referrerId: memberId },
        data: { referrerId: null },
      });

      // ③ User を削除（Cascade で MlmMember・PointWallet・Order 等も連鎖削除）
      await tx.user.delete({ where: { id: member.userId } });
    });

    return NextResponse.json({ message: "会員を削除しました" }, { status: 200 });
  } catch (error) {
    console.error("DELETE mlm-member error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}

// PATCH: 会員情報更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let memberId: bigint;
  try {
    memberId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { section, ...data } = body;

    const member = await prisma.mlmMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });
    if (!member) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    if (section === "basic") {
      // 基本情報（User + MlmMember の一部）
      await prisma.$transaction(async (tx) => {
        // User テーブル更新
        const userUpdate: Record<string, unknown> = {};
        if (data.name       !== undefined) userUpdate.name       = data.name;
        if (data.nameKana   !== undefined) userUpdate.nameKana   = data.nameKana || null;
        if (data.email      !== undefined) userUpdate.email      = data.email;
        if (data.phone      !== undefined) userUpdate.phone      = data.phone || null;
        if (data.postalCode !== undefined) userUpdate.postalCode = data.postalCode || null;
        if (data.address    !== undefined) userUpdate.address    = data.address || null;
        // パスワード変更
        if (data.newPassword && data.newPassword.length >= 6) {
          userUpdate.passwordHash = await bcrypt.hash(data.newPassword, 10);
        }
        if (Object.keys(userUpdate).length > 0) {
          await tx.user.update({ where: { id: member.userId }, data: userUpdate });
        }

        // MlmMember テーブル更新
        const memberUpdate: Record<string, unknown> = {};
        if (data.memberType    !== undefined) memberUpdate.memberType   = data.memberType;
        if (data.status        !== undefined) memberUpdate.status       = data.status;
        if (data.contractDate  !== undefined) memberUpdate.contractDate = data.contractDate ? new Date(data.contractDate) : null;
        if (data.companyName   !== undefined) memberUpdate.companyName  = data.companyName || null;
        if (data.companyNameKana !== undefined) memberUpdate.companyNameKana = data.companyNameKana || null;
        if (data.birthDate     !== undefined) memberUpdate.birthDate    = data.birthDate ? new Date(data.birthDate) : null;
        if (data.gender        !== undefined) memberUpdate.gender       = data.gender || null;
        if (data.mobile        !== undefined) memberUpdate.mobile       = data.mobile || null;
        if (data.prefecture    !== undefined) memberUpdate.prefecture   = data.prefecture || null;
        if (data.city          !== undefined) memberUpdate.city         = data.city || null;
        if (data.address1      !== undefined) memberUpdate.address1     = data.address1 || null;
        if (data.address2      !== undefined) memberUpdate.address2     = data.address2 || null;
        if (data.note            !== undefined) memberUpdate.note           = data.note || null;
        if (data.firstPayDate    !== undefined) memberUpdate.firstPayDate   = data.firstPayDate ? new Date(data.firstPayDate) : null;
        // クレジットカード情報（クレディックス）3枠
        if (data.creditCardId    !== undefined) memberUpdate.creditCardId    = data.creditCardId    || null;
        if (data.creditCardExpiry  !== undefined) memberUpdate.creditCardExpiry  = data.creditCardExpiry  || null;
        if (data.creditCardLast4   !== undefined) memberUpdate.creditCardLast4   = data.creditCardLast4   || null;
        if (data.creditCardId2   !== undefined) memberUpdate.creditCardId2   = data.creditCardId2   || null;
        if (data.creditCardExpiry2 !== undefined) memberUpdate.creditCardExpiry2 = data.creditCardExpiry2 || null;
        if (data.creditCardLast4_2 !== undefined) memberUpdate.creditCardLast4_2 = data.creditCardLast4_2 || null;
        if (data.creditCardId3   !== undefined) memberUpdate.creditCardId3   = data.creditCardId3   || null;
        if (data.creditCardExpiry3 !== undefined) memberUpdate.creditCardExpiry3 = data.creditCardExpiry3 || null;
        if (data.creditCardLast4_3 !== undefined) memberUpdate.creditCardLast4_3 = data.creditCardLast4_3 || null;
        if (Object.keys(memberUpdate).length > 0) {
          await tx.mlmMember.update({ where: { id: memberId }, data: memberUpdate });
        }
      });

    } else if (section === "registration") {
      // MlmRegistration (概要書面番号・銀行口座・配送先など)
      const regUpdate: Record<string, unknown> = {};
      if (data.disclosureDocNumber !== undefined) regUpdate.disclosureDocNumber = data.disclosureDocNumber || null;
      if (data.bankCode            !== undefined) regUpdate.bankCode            = data.bankCode || null;
      if (data.bankName            !== undefined) regUpdate.bankName            = data.bankName || null;
      if (data.branchCode          !== undefined) regUpdate.branchCode          = data.branchCode || null;
      if (data.bankBranch          !== undefined) regUpdate.bankBranch          = data.bankBranch || null;
      if (data.bankAccountType     !== undefined) regUpdate.bankAccountType     = data.bankAccountType || null;
      if (data.bankAccountNumber   !== undefined) regUpdate.bankAccountNumber   = data.bankAccountNumber || null;
      if (data.bankAccountHolder   !== undefined) regUpdate.bankAccountHolder   = data.bankAccountHolder || null;
      if (data.deliveryPostalCode  !== undefined) regUpdate.deliveryPostalCode  = data.deliveryPostalCode || null;
      if (data.deliveryAddress     !== undefined) regUpdate.deliveryAddress     = data.deliveryAddress || null;
      if (data.deliveryName        !== undefined) regUpdate.deliveryName        = data.deliveryName || null;
      if (data.deliveryPhone       !== undefined) regUpdate.deliveryPhone       = data.deliveryPhone || null;

      // MlmRegistration が存在しなければ作成
      await prisma.mlmRegistration.upsert({
        where: { userId: member.userId },
        create: { userId: member.userId, ...regUpdate },
        update: regUpdate,
      });

    } else if (section === "bank") {
      // 報酬振込先口座 (MlmMember)
      const bankUpdate: Record<string, unknown> = {};
      if (data.bankCode      !== undefined) bankUpdate.bankCode      = data.bankCode || null;
      if (data.bankName      !== undefined) bankUpdate.bankName      = data.bankName || null;
      if (data.branchCode    !== undefined) bankUpdate.branchCode    = data.branchCode || null;
      if (data.branchName    !== undefined) bankUpdate.branchName    = data.branchName || null;
      if (data.accountType   !== undefined) bankUpdate.accountType   = data.accountType || null;
      if (data.accountNumber !== undefined) bankUpdate.accountNumber = data.accountNumber || null;
      if (data.accountHolder !== undefined) bankUpdate.accountHolder = data.accountHolder || null;
      await prisma.mlmMember.update({ where: { id: memberId }, data: bankUpdate });

    } else if (section === "level") {
      // レベル情報
      const lvUpdate: Record<string, unknown> = {};
      if (data.currentLevel     !== undefined) lvUpdate.currentLevel     = Number(data.currentLevel);
      if (data.titleLevel       !== undefined) lvUpdate.titleLevel       = Number(data.titleLevel);
      if (data.conditionAchieved !== undefined) lvUpdate.conditionAchieved = Boolean(data.conditionAchieved);
      if (data.forceActive      !== undefined) lvUpdate.forceActive      = Boolean(data.forceActive);
      if (data.forceLevel       !== undefined) lvUpdate.forceLevel       = data.forceLevel !== null ? Number(data.forceLevel) : null;
      await prisma.mlmMember.update({ where: { id: memberId }, data: lvUpdate });

    } else if (section === "autoship") {
      // オートシップ設定
      const asUpdate: Record<string, unknown> = {};
      if (data.autoshipEnabled   !== undefined) asUpdate.autoshipEnabled   = Boolean(data.autoshipEnabled);
      if (data.autoshipStartDate !== undefined) asUpdate.autoshipStartDate = data.autoshipStartDate ? new Date(data.autoshipStartDate) : null;
      if (data.autoshipStopDate  !== undefined) asUpdate.autoshipStopDate  = data.autoshipStopDate ? new Date(data.autoshipStopDate) : null;
      if (data.paymentMethod     !== undefined) asUpdate.paymentMethod     = data.paymentMethod;
      if (data.autoshipSuspendMonths !== undefined) asUpdate.autoshipSuspendMonths = data.autoshipSuspendMonths || null;
      await prisma.mlmMember.update({ where: { id: memberId }, data: asUpdate });

    } else if (section === "relations") {
      // 紹介者・直上者変更
      const relUpdate: Record<string, unknown> = {};

      if (data.referrerId !== undefined) {
        if (data.referrerId === null || data.referrerId === "") {
          relUpdate.referrerId = null;
        } else {
          const refId = BigInt(data.referrerId as string);
          if (refId === memberId) {
            return NextResponse.json({ error: "自分自身は紹介者に設定できません" }, { status: 400 });
          }
          const refMember = await prisma.mlmMember.findUnique({ where: { id: refId } });
          if (!refMember) {
            return NextResponse.json({ error: "指定した紹介者が見つかりません" }, { status: 404 });
          }
          relUpdate.referrerId = refId;
        }
      }

      if (data.uplineId !== undefined) {
        if (data.uplineId === null || data.uplineId === "") {
          relUpdate.uplineId = null;
        } else {
          const upId = BigInt(data.uplineId as string);
          if (upId === memberId) {
            return NextResponse.json({ error: "自分自身は直上者に設定できません" }, { status: 400 });
          }
          const upMember = await prisma.mlmMember.findUnique({ where: { id: upId } });
          if (!upMember) {
            return NextResponse.json({ error: "指定した直上者が見つかりません" }, { status: 404 });
          }
          relUpdate.uplineId = upId;
        }
      }

      if (Object.keys(relUpdate).length > 0) {
        await prisma.mlmMember.update({ where: { id: memberId }, data: relUpdate });
      }

    } else {
      return NextResponse.json({ error: "section が不正です" }, { status: 400 });
    }

    return NextResponse.json({ message: "更新しました" }, { status: 200 });
  } catch (error) {
    console.error("PATCH mlm-member error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// GET: 会員詳細（1件）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let memberId: bigint;
  try {
    memberId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const member = await prisma.mlmMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          include: {
            pointWallet: true,
            mlmRegistration: true,
          },
        },
        referrer: { select: { id: true, memberCode: true, companyName: true, user: { select: { name: true } } } },
        upline:   { select: { id: true, memberCode: true, companyName: true, user: { select: { name: true } } } },
        downlines: {
          select: { id: true, memberCode: true, currentLevel: true, status: true, companyName: true, user: { select: { name: true } } },
          take: 20,
        },
      },
    });
    if (!member) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    // BigInt を string に変換してシリアライズ
    const safe = JSON.parse(
      JSON.stringify(member, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
    return NextResponse.json(safe, { status: 200 });
  } catch (error) {
    console.error("GET mlm-member detail error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
