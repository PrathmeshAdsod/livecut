import { env } from "cloudflare:workers";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function config(key: string) {
  return (env as unknown as Record<string, string | undefined>)[key] ?? "";
}
export function db() {
  if (!env.DB)
    throw new AppError("Storage is unavailable. Please retry shortly.", 503);
  return env.DB;
}
export function random() {
  return (
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "")
  );
}
export async function hash(s: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export function cookie(req: Request, name: string) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + "="))
      ?.slice(name.length + 1) ?? ""
  );
}
export function cookieHeader(
  req: Request,
  name: string,
  value: string,
  maxAge = 604800,
) {
  return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function origin(req: Request) {
  const configured = config("APP_URL");
  return configured ? new URL(configured).origin : new URL(req.url).origin;
}
export function sameOrigin(req: Request) {
  const sent = req.headers.get("origin");
  if (!sent || sent !== origin(req))
    throw new AppError("Request origin could not be verified.", 403);
}
export async function jsonBody(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 16384)
    throw new AppError("Request is too large.", 413);
  const text = await req.text();
  if (text.length > 16384) throw new AppError("Request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("Invalid JSON request.");
  }
}
export async function rate(key: string, max: number, windowSeconds: number) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const id = await hash(key + ":" + bucket);
  const r = await db()
    .prepare(
      "INSERT INTO limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(id, Date.now() + windowSeconds * 2000)
    .first<{ count: number }>();
  if ((r?.count ?? max + 1) > max)
    throw new AppError(
      "Too many attempts. Please wait a moment and try again.",
      429,
    );
}
async function cryptoKey() {
  const secret = config("SESSION_SECRET");
  if (secret.length < 32)
    throw new AppError(
      "Twitch setup needs a SESSION_SECRET of at least 32 characters.",
      503,
    );
  return crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await cryptoKey(),
      new TextEncoder().encode(value),
    ),
  );
  return btoa(String.fromCharCode(...iv, ...bytes));
}
export async function decrypt(value: string) {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, 12) },
      await cryptoKey(),
      bytes.slice(12),
    ),
  );
}
export async function requestJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new AppError(
      response.status === 401
        ? "Twitch authorization expired. Reconnect your channel."
        : response.status === 429
          ? "Twitch is rate limiting requests. Please retry shortly."
          : "Twitch could not complete that request. Check stream and clip permissions.",
      response.status === 401 ? 401 : 502,
    );
  return response.json();
}
