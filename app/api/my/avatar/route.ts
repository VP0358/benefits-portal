/**
 * POST /api/my/avatar  – プロフィール画像アップロード
 * GET  /api/my/avatar  – 現在のアバターURL取得
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: BigInt(session.user.id) },
    select: { avatarUrl: true },
  });

  return NextResponse.json({ avatarUrl: user?.avatarUrl ?? null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "JPEG/PNG/WebP/GIF のみ対応しています" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "ファイルサイズが5MBを超えています" }, { status: 400 });

  // S3設定がある場合はS3にアップロード
  const s3Bucket = process.env.S3_BUCKET;
  const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
  const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const s3Region = process.env.S3_REGION ?? "ap-northeast-1";
  const s3Endpoint = process.env.S3_ENDPOINT;
  const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  let publicUrl: string;

  if (s3Bucket && s3AccessKeyId && s3SecretAccessKey) {
    // S3にアップロード
    const bytes = await file.arrayBuffer();
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const key = `avatars/user-${session.user.id}-${Date.now()}.${ext}`;

    const endpoint = s3Endpoint ?? `https://s3.${s3Region}.amazonaws.com`;
    const host = s3Endpoint
      ? new URL(s3Endpoint).host
      : `s3.${s3Region}.amazonaws.com`;
    const url = `${endpoint}/${s3Bucket}/${key}`;

    // 簡易署名（v4）
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
    const scope = `${dateStr}/${s3Region}/s3/aws4_request`;

    async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
      const cryptoKey = await crypto.subtle.importKey(
        "raw", key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data)));
    }
    async function sha256hex(data: ArrayBuffer | string): Promise<string> {
      const buf = typeof data === "string" ? new TextEncoder().encode(data).buffer as ArrayBuffer : data as ArrayBuffer;
      const hash = await crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    const bufferUint8 = new Uint8Array(bytes);
    const payloadHash = await sha256hex(bytes);
    const canonicalHeaders = `content-type:${file.type}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${timeStr}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = `PUT\n/${s3Bucket}/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `AWS4-HMAC-SHA256\n${timeStr}\n${scope}\n${await sha256hex(canonicalRequest)}`;

    const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${s3SecretAccessKey}`), dateStr);
    const kRegion = await hmacSha256(kDate, s3Region);
    const kService = await hmacSha256(kRegion, "s3");
    const kSigning = await hmacSha256(kService, "aws4_request");
    const sigBytes = await hmacSha256(kSigning, stringToSign);
    const signature = Array.from(sigBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const authorization = `AWS4-HMAC-SHA256 Credential=${s3AccessKeyId}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}`;

    const s3Res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": timeStr,
        Authorization: authorization,
      },
      body: bufferUint8,
    });

    if (!s3Res.ok) {
      return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
    }

    publicUrl = s3PublicBaseUrl
      ? `${s3PublicBaseUrl}/${key}`
      : `${endpoint}/${s3Bucket}/${key}`;
  } else {
    // S3未設定の場合: base64でDBに保存（開発用 / 小さい画像のみ）
    const bytes = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    publicUrl = `data:${file.type};base64,${base64}`;
  }

  // DBに保存
  await prisma.user.update({
    where: { id: BigInt(session.user.id) },
    data: { avatarUrl: publicUrl },
  });

  return NextResponse.json({ avatarUrl: publicUrl });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: BigInt(session.user.id) },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ success: true });
}
