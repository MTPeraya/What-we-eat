// backend/src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "wwe_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_JWT_SECRET ?? "dev-secret");

// เส้นทางที่ต้องล็อกอินก่อนเข้า
const PROTECTED = ["/rooms/create", "/history", "/reviews", "/profile", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ถ้าไม่ใช่เส้นทางที่ป้องกัน → ปล่อยผ่าน
  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;

  // ไม่มี token → เด้งไป /login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search ? `?${search}` : ""));
    return NextResponse.redirect(url);
  }

  try {
    // ตรวจสอบลายเซ็น JWT (ทำงานได้ใน middleware/edge)
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    // token เสีย/หมดอายุ → ลบ cookie แล้วเด้งไป /login
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search ? `?${search}` : ""));
    const res = NextResponse.redirect(url);
    res.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
    return res;
  }
}

// ให้ middleware ทำงานเฉพาะ path ที่สนใจ (แม่นกว่าเช็คเอง)
export const config = {
  matcher: [
    "/rooms/create/:path*",
    "/history/:path*",
    "/reviews/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
