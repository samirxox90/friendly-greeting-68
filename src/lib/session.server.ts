import crypto from "node:crypto";

const MAIN_COOKIE = "ff_main_session";
const ADMIN_COOKIE = "ff_admin_session";

type SessionScope = "main" | "admin";

type SessionPayload = {
  scope: SessionScope;
  exp: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "fallback-dev-secret-change-me"
  );
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(scope: SessionScope, expiresAt: Date) {
  const payload: SessionPayload = {
    scope,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined, expectedScope: SessionScope) {
  if (!token) return false;
  const [body, providedSignature] = token.split(".");
  if (!body || !providedSignature) return false;

  const expectedSignature = sign(body);
  if (providedSignature.length !== expectedSignature.length) {
    return false;
  }
  if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload;
    const isNotExpired = payload.exp * 1000 > Date.now();
    return payload.scope === expectedScope && isNotExpired;
  } catch {
    return false;
  }
}

export function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return new Map<string, string>();
  const map = new Map<string, string>();

  cookieHeader.split(";").forEach((segment) => {
    const [rawName, ...rawValue] = segment.trim().split("=");
    if (!rawName || rawValue.length === 0) return;
    map.set(rawName, decodeURIComponent(rawValue.join("=")));
  });

  return map;
}

export function getCookieName(scope: SessionScope) {
  return scope === "admin" ? ADMIN_COOKIE : MAIN_COOKIE;
}

export function createSessionCookie(scope: SessionScope, token: string, expiresAt: Date) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${getCookieName(scope)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function clearSessionCookie(scope: SessionScope) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${getCookieName(scope)}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

export function getSessionFromRequest(request: Request, scope: SessionScope) {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies.get(getCookieName(scope));
  return verifySessionToken(token, scope);
}
