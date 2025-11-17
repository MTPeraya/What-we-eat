import { NextResponse } from "next/server";

// Support multiple origins for development and production
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4001",
  "http://127.0.0.1:4001",
  "https://what-we-eat.vercel.app",
  process.env.FRONTEND_ORIGIN,
].filter(Boolean) as string[];

/**
 * Check if an origin is allowed
 */
function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed => {
    // Exact match
    if (allowed === origin) return true;
    // Support subdomain matching (e.g., *.vercel.app)
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return false;
  });
}

export function withCORS(res: NextResponse, requestOrigin?: string | null) {
  // Check if request origin is allowed, otherwise use first allowed origin
  let origin: string;
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    origin = requestOrigin;
  } else {
    // Fallback to first allowed origin (usually localhost for dev)
    origin = ALLOWED_ORIGINS[0] || "*";
  }
  
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
