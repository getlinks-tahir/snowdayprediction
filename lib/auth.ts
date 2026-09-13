import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

const cookieName = "snowday-admin";
const maxAge = 60 * 60 * 24 * 7;

function secret() {
  return process.env.AUTH_SECRET || "development-only-change-me";
}

function signature(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

export function loginIsValid(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "change-this-before-launch";
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
}

export async function createAdminSession() {
  const expires = Date.now() + maxAge * 1000;
  const data = `admin.${expires}`;
  const store = await cookies();
  store.set(cookieName, `${data}.${signature(data)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function isAdmin() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const [role, expires, receivedSignature] = parts;
  if (Number(expires) < Date.now()) return false;
  return safeEqual(receivedSignature, signature(`${role}.${expires}`));
}
