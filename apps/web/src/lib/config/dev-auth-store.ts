import { timingSafeEqual, randomBytes, randomUUID, scrypt } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { type NextResponse } from "next/server";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt);
const DEV_AUTH_COOKIE = "dev_auth_user_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type DevAuthStore = {
  users: DevUserRecord[];
};

export type DevUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  profile: {
    nickname: string;
    youtube_channel_url: string | null;
    avatar_url: string | null;
    onboarding_completed: boolean;
    is_deleted: boolean;
    deleted_at: string | null;
  };
  plan: {
    plan_name: string;
    monthly_recommendation_limit: number;
    monthly_recommendation_used: number;
    renews_at: string | null;
  };
  creator_profile: {
    youtube_experience: string | null;
    categories: string[];
    subscriber_range: string | null;
    upload_frequency: string | null;
    content_goal: string | null;
    preferred_style: string | null;
    onboarding_completed: boolean;
  };
  created_at: string;
  updated_at: string;
};

export class DevAuthStoreError extends Error {
  constructor(
    message: string,
    readonly code: "DUPLICATE_EMAIL" | "DUPLICATE_NICKNAME" | "INVALID_CREDENTIALS" | "NOT_FOUND",
    readonly status: number,
  ) {
    super(message);
    this.name = "DevAuthStoreError";
  }
}

function getStorePath() {
  const cwd = process.cwd();

  if (path.basename(cwd) === "web" && path.basename(path.dirname(cwd)) === "apps") {
    return path.resolve(cwd, "..", "api", "dev-data", "users.json");
  }

  return path.resolve(cwd, "apps", "api", "dev-data", "users.json");
}

function createEmptyStore(): DevAuthStore {
  return { users: [] };
}

async function ensureStoreFile() {
  const storePath = getStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });

  try {
    await readFile(storePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await writeFile(storePath, `${JSON.stringify(createEmptyStore(), null, 2)}\n`, "utf8");
      return;
    }

    throw error;
  }
}

async function readStore(): Promise<DevAuthStore> {
  await ensureStoreFile();

  const raw = await readFile(getStorePath(), "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Partial<DevAuthStore>).users)) {
    const emptyStore = createEmptyStore();
    await writeStore(emptyStore);
    return emptyStore;
  }

  return parsed as DevAuthStore;
}

async function writeStore(store: DevAuthStore) {
  await mkdir(path.dirname(getStorePath()), { recursive: true });
  await writeFile(getStorePath(), `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedKey] = passwordHash.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(storedKey, "hex");

  if (storedBuffer.length !== key.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, key);
}

export function getDevAuthStorePath() {
  return getStorePath();
}

export function toDevAuthUser(user: DevUserRecord) {
  return {
    id: user.id,
    email: user.email,
    profile: user.profile,
    plan: user.plan,
    creator_profile: user.creator_profile,
  };
}

export async function createDevUser(input: { email: string; password: string; nickname: string }) {
  const store = await readStore();
  const email = normalizeEmail(input.email);
  const nickname = input.nickname.trim();

  if (store.users.some((user) => user.email === email)) {
    throw new DevAuthStoreError("Email is already in use.", "DUPLICATE_EMAIL", 409);
  }

  if (store.users.some((user) => user.profile.nickname === nickname)) {
    throw new DevAuthStoreError("Nickname is already in use.", "DUPLICATE_NICKNAME", 409);
  }

  const now = new Date().toISOString();
  const user: DevUserRecord = {
    id: randomUUID(),
    email,
    passwordHash: await hashPassword(input.password),
    profile: {
      nickname,
      youtube_channel_url: null,
      avatar_url: null,
      onboarding_completed: false,
      is_deleted: false,
      deleted_at: null,
    },
    plan: {
      plan_name: "free",
      monthly_recommendation_limit: 5,
      monthly_recommendation_used: 0,
      renews_at: null,
    },
    creator_profile: {
      youtube_experience: null,
      categories: [],
      subscriber_range: null,
      upload_frequency: null,
      content_goal: null,
      preferred_style: null,
      onboarding_completed: false,
    },
    created_at: now,
    updated_at: now,
  };

  store.users.push(user);
  await writeStore(store);
  return user;
}

export async function verifyDevUserLogin(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const store = await readStore();
  const user = store.users.find((candidate) => candidate.email === email);

  if (!user) {
    throw new DevAuthStoreError("Invalid email or password.", "INVALID_CREDENTIALS", 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    throw new DevAuthStoreError("Invalid email or password.", "INVALID_CREDENTIALS", 401);
  }

  return user;
}

export async function getDevUserById(userId: string) {
  const store = await readStore();
  return store.users.find((user) => user.id === userId) ?? null;
}

export async function getDevUserByNickname(nicknameInput: string) {
  const nickname = nicknameInput.trim();
  const store = await readStore();
  return store.users.find((user) => user.profile.nickname === nickname) ?? null;
}

export async function softDeleteDevUser(userId: string) {
  const store = await readStore();
  const user = store.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new DevAuthStoreError("User not found.", "NOT_FOUND", 404);
  }

  const now = new Date().toISOString();
  user.profile.is_deleted = true;
  user.profile.deleted_at = now;
  user.updated_at = now;
  await writeStore(store);
  return user;
}

export async function getDevUserFromCookie() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(DEV_AUTH_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  return getDevUserById(userId);
}

export function setDevAuthCookie(response: NextResponse, userId: string) {
  response.cookies.set({
    name: DEV_AUTH_COOKIE,
    value: userId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearDevAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: DEV_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

