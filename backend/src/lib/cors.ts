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
 * Check if an origin is a local network IP (for development)
 */
function isLocalNetworkOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    
    // Check for localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    
    // Check for private IP ranges:
    // 192.168.x.x
    // 10.x.x.x
    // 172.16.x.x - 172.31.x.x
    // 169.254.x.x (link-local)
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      const [a, b] = parts;
      if (a === 192 && b === 168) return true; // 192.168.x.x
      if (a === 10) return true; // 10.x.x.x
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.x.x - 172.31.x.x
      if (a === 169 && b === 254) return true; // 169.254.x.x (link-local)
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if an origin is allowed
 */
function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  
  // In development, allow local network IPs
  if (process.env.NODE_ENV === 'development' && isLocalNetworkOrigin(origin)) {
    return true;
  }
  
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
  } else if (requestOrigin) {
    // Origin provided but not in allowed list - log for debugging
    console.warn("[CORS] Origin not allowed:", requestOrigin, "Allowed:", ALLOWED_ORIGINS);
    // In development, allow it anyway to prevent CORS issues
    if (process.env.NODE_ENV === 'development') {
      origin = requestOrigin;
    } else {
      origin = ALLOWED_ORIGINS[0] || "*";
    }
  } else {
    // No origin provided (e.g., same-origin request) - use wildcard or first allowed
    origin = ALLOWED_ORIGINS[0] || "*";
  }
  
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  // NOTE: Methods will be overridden per-file to match handler
  if (!res.headers.get("Access-Control-Allow-Methods")) {
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  }
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, Origin, X-Requested-With"
  );
  res.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  return res;
}

export function preflight(allowMethods: string, requestOrigin?: string | null) {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Methods", allowMethods);
  return withCORS(res, requestOrigin);
}
