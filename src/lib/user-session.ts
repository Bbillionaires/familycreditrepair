import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "fcr_user_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecretKey() {
  const secret = process.env.USER_SESSION_SECRET;
  if (!secret) {
    throw new Error("USER_SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createUserSession(userId: string, sessionVersion: number) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await new SignJWT({ userId, sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function destroyUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifyUserSession(): Promise<{ userId: string; sessionVersion: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string" || typeof payload.sessionVersion !== "number") {
      return null;
    }
    return { userId: payload.userId, sessionVersion: payload.sessionVersion };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
