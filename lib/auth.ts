import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { kvGet, kvSet, serial } from "./kv";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // scrypt: salt:hash (hex)
  createdAt: string;
}
export type PublicUser = Pick<User, "id" | "email" | "name">;

const USERS = "users"; // key: lowercase email
const COOKIE = "rt_session";
const SESSION_DAYS = 30;

export class AuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/* ---------- passwords ---------- */

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

/* ---------- signed session cookie ---------- */

let cachedSecret: string | null = null;
async function secret(): Promise<string> {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  // Generated once and kept in storage, so no manual setup is needed.
  cachedSecret = await serial(async () => {
    const existing = await kvGet<string>("config", "session-secret");
    if (existing) return existing;
    const s = crypto.randomBytes(32).toString("hex");
    await kvSet("config", "session-secret", s);
    return s;
  });
  return cachedSecret;
}

async function sign(value: string) {
  return crypto.createHmac("sha256", await secret()).update(value).digest("base64url");
}

async function issueSession(user: User) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${Buffer.from(user.email).toString("base64url")}.${exp}`;
  const token = `${payload}.${await sign(payload)}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function currentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailB64, exp, sig] = parts;
  const expected = await sign(`${emailB64}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  const user = await kvGet<User>(USERS, Buffer.from(emailB64, "base64url").toString());
  return user ? { id: user.id, email: user.email, name: user.name } : null;
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

/* ---------- accounts ---------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUp(input: { name: string; email: string; password: string }): Promise<PublicUser> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 80) throw new AuthError("Enter your full name.");
  if (!EMAIL.test(email)) throw new AuthError("Enter a valid email.");
  if (input.password.length < 8) throw new AuthError("Password must be at least 8 characters.");
  const user = await serial(async () => {
    if (await kvGet<User>(USERS, email)) throw new AuthError("An account with this email already exists. Sign in instead.", 409);
    const u: User = {
      id: `usr_${crypto.randomBytes(9).toString("base64url")}`,
      email,
      name,
      passwordHash: hashPassword(input.password),
      createdAt: new Date().toISOString(),
    };
    await kvSet(USERS, email, u);
    return u;
  });
  await issueSession(user);
  return { id: user.id, email: user.email, name: user.name };
}

export async function signIn(input: { email: string; password: string }): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const user = await kvGet<User>(USERS, email);
  // Same message either way, so the form doesn't reveal which emails have accounts.
  if (!user || !checkPassword(input.password, user.passwordHash)) {
    throw new AuthError("Email or password is incorrect.", 401);
  }
  await issueSession(user);
  return { id: user.id, email: user.email, name: user.name };
}
