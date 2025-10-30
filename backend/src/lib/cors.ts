import { NextResponse } from "next/server";

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

export function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  // NOTE: Methods จะถูก override รายไฟล์อีกครั้งให้ตรงกับ handler
  if (!res.headers.get("Access-Control-Allow-Methods")) {
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  }
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return res;
}

export function preflight(allowMethods: string) {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Methods", allowMethods);
  return withCORS(res);
}
