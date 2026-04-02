import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"];

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "対応していないファイル形式です（JPEG/PNG/WebP/GIF/ICO のみ）" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "ファイルサイズが5MBを超えています" }, { status: 400 });

  const s3Region = process.env.S3_REGION;
  const s3Bucket = process.env.S3_BUCKET;
  const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
  const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  if (!s3Bucket || !s3AccessKeyId || !s3SecretAccessKey) {
    // S3未設定の場合はダミーURLを返す（開発用）
    const mockUrl = `https://placehold.co/400x400?text=${encodeURIComponent(file.name)}`;
    return NextResponse.json({ publicUrl: mockUrl, fileName: file.name });
  }

  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "bin";
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const client = new S3Client({
      region: s3Region || "ap-northeast-1",
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      credentials: { accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey },
    });

    await client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    }));

    const publicUrl = s3PublicBaseUrl
      ? `${s3PublicBaseUrl}/${fileName}`
      : `https://${s3Bucket}.s3.${s3Region || "ap-northeast-1"}.amazonaws.com/${fileName}`;

    await prisma.mediaFile.create({
      data: {
        fileName,
        originalFileName: file.name,
        contentType: file.type,
        fileSize: BigInt(file.size),
        storageDisk: "s3",
        storagePath: fileName,
        publicUrl,
        uploadedByType: "admin",
        uploadedById: guard.session?.user?.id ? BigInt(guard.session.user.id) : null,
      },
    });

    return NextResponse.json({ publicUrl, fileName });
  } catch (err) {
    console.error("S3 upload error:", err);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
