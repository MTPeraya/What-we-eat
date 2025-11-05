import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Cookie name + expiration
export const COOKIE = "wwe_session";
const maxAgeSec = 60 * 60 * 24 * 30; // 30 days
const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET ?? "dev-secret");

// Payload we use
export type AuthToken = {
  sub: string;          // user id
  username: string;
  role: "USER" | "ADMIN";
} & JWTPayload;

// Create session and set cookie (note: cookies() is async in Next 15)
export async function createSession(user: { id: string; username: string; role: "USER" | "ADMIN" }) {
  const token = await new SignJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret);

  const jar = await cookies();
  jar.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  });

  return token;
}

export async function destroySession() {
  const jar = await cookies();
  jar.set({
    name: COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<AuthToken | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: String(payload.sub ?? ""),
      username: String((payload).username ?? ""),
      role: (String((payload).role ?? "USER") as "USER" | "ADMIN"),
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
