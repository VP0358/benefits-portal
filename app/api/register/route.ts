import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const schema = z.object({
  name: z.string().min(1).max(100),
  nameKana: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(1).max(30),
  postalCode: z.string().min(1).max(10),
  address: z.string().min(1).max(500),
  referralCode: z.string().optional(), // 紹介者のreferralCode
});

/** ユニークな referralCode を生成 */
async function generateReferralCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  throw new Error("referralCode generation failed");
}

/** ユニークな memberCode を生成 */
async function generateMemberCode(): Promise<string> {
  const count = await prisma.user.count();
  let code = `M${String(count + 1).padStart(4, "0")}`;
  let tries = 0;
  while (await prisma.user.findUnique({ where: { memberCode: code } })) {
    tries++;
    code = `M${String(count + 1 + tries).padStart(4, "0")}`;
  }
  return code;
}

/** GET: 紹介者情報取得（紹介コード確認） */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("ref");
  if (!code) return NextResponse.json({ referrer: null });

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, name: true, memberCode: true },
  });

  if (!referrer) return NextResponse.json({ referrer: null });

  return NextResponse.json({
    referrer: {
      id: referrer.id.toString(),
      name: referrer.name,
      memberCode: referrer.memberCode,
    },
  });
}

/** POST: 新規会員登録（紹介経由） */
export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, nameKana, email, password, phone, postalCode, address, referralCode } = parsed.data;

  // メール重複チェック
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています。" }, { status: 409 });
  }

  // 紹介者取得
  let referrer: { id: bigint } | null = null;
  if (referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
  }

  const passwordHash = await hash(password, 12);
  const memberCode = await generateMemberCode();
  const myReferralCode = await generateReferralCode();

  const user = await prisma.$transaction(async (tx) => {
    // ユーザー作成
    const newUser = await tx.user.create({
      data: {
        name,
        nameKana,
        email,
        passwordHash,
        phone,
        postalCode,
        address,
        memberCode,
        referralCode: myReferralCode,
        status: "active",
      },
    });

    // ポイントウォレット作成
    await tx.pointWallet.create({
      data: { userId: newUser.id },
    });

    // 紹介者との紐づけ
    if (referrer) {
      await tx.userReferral.create({
        data: {
          userId: newUser.id,
          referrerUserId: referrer.id,
          relationType: "direct",
          isActive: true,
          validFrom: new Date(),
        },
      });

      // 紹介履歴記録
      await tx.referralHistory.create({
        data: {
          userId: newUser.id,
          referrerUserId: referrer.id,
          actionType: "add",
          note: "紹介URLからの自動登録",
        },
      });
    }

    return newUser;
  });

  return NextResponse.json({
    id: user.id.toString(),
    memberCode: user.memberCode,
    name: user.name,
    email: user.email,
  }, { status: 201 });
}
