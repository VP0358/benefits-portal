// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/route-guard";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "対応していないファイル形式です（JPEG/PNG/WebP/GIF のみ）" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "ファイルサイズが2MBを超えています" }, { status: 400 });

  // Base64に変換してそのままURLとして返す（外部サービス不要）
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const publicUrl = `data:${file.type};base64,${base64}`;

  return NextResponse.json({ publicUrl, fileName: file.name });
}
