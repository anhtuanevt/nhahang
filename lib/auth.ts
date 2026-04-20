import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(
  payload: object,
  expiresIn: string = "7d"
): Promise<string> {
  const secret = getSecret();
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<any> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<{ sessionId: string; tableId: string; role: string } | null> {
  try {
    // Try Authorization header first
    const authHeader = req.headers.get("authorization");
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      // Try cookie
      token = req.cookies.get("session_token")?.value ?? null;
    }

    if (!token) return null;

    const payload = await verifyToken(token);
    if (
      payload &&
      payload.sessionId &&
      payload.tableId &&
      payload.role === "customer"
    ) {
      return {
        sessionId: payload.sessionId as string,
        tableId: payload.tableId as string,
        role: payload.role as string,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAdminFromRequest(
  req: NextRequest
): Promise<{ role: string } | null> {
  try {
    const token = req.cookies.get("admin_token")?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (payload && payload.role === "admin") {
      return { role: "admin" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getServerFromRequest(
  req: NextRequest
): Promise<{ role: string } | null> {
  try {
    const token = req.cookies.get("server_token")?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (payload && (payload.role === "server" || payload.role === "admin")) {
      return { role: payload.role as string };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getServerOrAdminFromRequest(
  req: NextRequest
): Promise<{ role: string } | null> {
  const serverAuth = await getServerFromRequest(req);
  if (serverAuth) return serverAuth;
  const adminAuth = await getAdminFromRequest(req);
  return adminAuth;
}
