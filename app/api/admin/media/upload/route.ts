// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/route-guard";
import sharp from "sharp";

const MAX_SIZE = 10 * 1024 * 1024; // 受付上限10MB（圧縮前）
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// 圧縮後の最大サイズ：幅800px・JPEG品質70
const RESIZE_WIDTH = 800;
const JPEG_QUALITY = 70;

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "対応していないファイル形式です（JPEG/PNG/WebP/GIF のみ）" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "ファイルサイズが10MBを超えています" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);

  // sharpで圧縮・リサイズ（幅800px以下・JPEG変換）
  const compressed = await sharp(inputBuffer)
    .resize({ width: RESIZE_WIDTH, withoutEnlargement: true }) // 800px以下にリサイズ
    .jpeg({ quality: JPEG_QUALITY })                            // JPEG圧縮
    .toBuffer();

  const base64 = compressed.toString("base64");
  const publicUrl = `data:image/jpeg;base64,${base64}`;

  return NextResponse.json({ publicUrl, fileName: file.name });
}
