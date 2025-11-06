import { NextResponse } from "next/server";

// Support multiple origins for development and production
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000", 
  "https://what-we-eat.vercel.app",
  process.env.FRONTEND_ORIGIN, // Allow custom origin from env
].filter(Boolean) as string[];

export function withCORS(res: NextResponse, requestOrigin?: string | null) {
  // Use provided origin or fallback to first allowed origin
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0];
  
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  // NOTE: Methods will be overridden per-file to match handler
  if (!res.headers.get("Access-Control-Allow-Methods")) {
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  }
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return res;
}

export function preflight(allowMethods: string, requestOrigin?: string | null) {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Methods", allowMethods);
  return withCORS(res, requestOrigin);
}
