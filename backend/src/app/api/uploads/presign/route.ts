import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { presignImageUpload } from "@/services/storageService";
import { requireAuth } from "@/lib/session";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() { return withCORS(new NextResponse(null, { status: 204 })); }

const Body = z.object({
  mime: z.string().startsWith("image/"),
  ext: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req); // ต้องล็อกอิน (หรือจะให้ guest ก็แก้ตรงนี้)
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return withCORS(NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 }));
    }

    const { key, uploadUrl, publicUrl } = await presignImageUpload({ contentType: parsed.data.mime, ext: parsed.data.ext });
    return withCORS(NextResponse.json({ key, uploadUrl, publicUrl }, { status: 200 }));
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "UNAUTHENTICATED") return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    return withCORS(NextResponse.json({ error: "PRESIGN_FAILED", details: String(e) }, { status: 500 }));
  }
}
