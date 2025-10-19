// backend/src/services/storageService.ts
import crypto from "crypto";

const PROVIDER = process.env.STORAGE_PROVIDER ?? "mock";

// S3 envs (ถ้าใช้จริง)
const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_REGION = process.env.S3_REGION ?? "";
const S3_PUBLIC_BASE = process.env.S3_PUBLIC_BASE ?? "";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID ?? "";
const S3_SECRET = process.env.S3_SECRET_ACCESS_KEY ?? "";

// import เฉพาะเมื่อ provider === s3
async function s3Presign(key: string, contentType: string) {
  if (PROVIDER !== "s3") {
    throw new Error("S3_DISABLED: STORAGE_PROVIDER is not 's3'");
  }
  let S3Client, PutObjectCommand, getSignedUrl;
  try {
    ({ S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3"));
    ({ getSignedUrl } = await import("@aws-sdk/s3-request-presigner"));
  } catch {
    throw new Error(
      "S3_MODULES_MISSING: install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner"
    );
  }

  const client = new S3Client({
    region: S3_REGION,
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET },
  });
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
  const publicUrl = `${S3_PUBLIC_BASE}/${key}`.replace(/([^:]\/)\/+/g, "$1");
  return { uploadUrl, publicUrl };
}

export async function presignImageUpload(params: { ext?: string; contentType: string }) {
  const safeExt =
    (params.ext || params.contentType.split("/")[1] || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const key = `ratings/${new Date().toISOString().slice(0, 10)}/${crypto
    .randomBytes(16)
    .toString("hex")}.${safeExt}`;

  if (PROVIDER === "s3") {
    return { key, ...(await s3Presign(key, params.contentType)) };
  }
  // mock mode: ไม่อัปโหลดจริง
  return { key, uploadUrl: null as unknown as string, publicUrl: null as unknown as string };
}
