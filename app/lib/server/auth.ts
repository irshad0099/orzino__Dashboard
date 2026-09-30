import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { getEnv } from "./env";
import { ApiError } from "./http";
import { AdminUser, type AdminUserDoc } from "./models/AdminUser";

export const SESSION_COOKIE = "orzino_admin_session";
const SESSION_HOURS = 12;
const BCRYPT_COST = 12;

const key = () => new TextEncoder().encode(getEnv().AUTH_SECRET);

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict" as const,
  secure: getEnv().isProduction,
  path: "/",
  maxAge: SESSION_HOURS * 60 * 60,
});

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

let dummyHash: Promise<string> | null = null;

/** Same timing-attack defence as any login: a dummy compare when the account doesn't exist. */
export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  const target = hash ?? (await (dummyHash ??= bcrypt.hash("orzino-admin-timing-dummy", BCRYPT_COST)));
  const matches = await bcrypt.compare(password, target);
  return !!hash && matches;
}

export async function startSession(admin: AdminUserDoc): Promise<void> {
  const token = await new SignJWT({ tv: admin.tokenVersion, role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setAudience("admin")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in admin, or null. Re-checks the DB so a bumped tokenVersion is rejected immediately. */
export async function getSessionAdmin(): Promise<AdminUserDoc | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: "admin" });
    if (!payload.sub || !Types.ObjectId.isValid(payload.sub)) return null;
    const admin = await AdminUser.findById(payload.sub);
    if (!admin || admin.tokenVersion !== payload.tv) return null;
    return admin;
  } catch {
    return null; // expired, tampered, or a token signed for a different app entirely
  }
}

export async function requireAdmin(): Promise<AdminUserDoc> {
  const admin = await getSessionAdmin();
  if (!admin) throw new ApiError(401, "not_signed_in", "Please sign in to continue.");
  return admin;
}
