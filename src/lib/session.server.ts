import crypto from "node:crypto";

const MAIN_COOKIE = "ff_main_session";
const ADMIN_COOKIE = "ff_admin_session";

type SessionScope = "main" | "admin";

type SessionPayload = {
  scope: SessionScope;
  exp: number;
};

type SessionValidationDebug = {
  scope: SessionScope;
  cookieName: string;
  hasCookieHeader: boolean;
  hasSessionCookie: boolean;
  hasToken: boolean;
  hasBody: boolean;
  hasSignature: boolean;
  signatureMatches: boolean;
  payloadValid: boolean;
  payloadScope: SessionScope | "unknown";
  scopeMatches: boolean;
  expiresAtMs: number | null;
  notExpired: boolean;
  authenticated: boolean;
  reason:
    | "missing_cookie_header"
    | "missing_session_cookie"
    | "missing_token"
    | "invalid_token_format"
    | "signature_mismatch"
    | "invalid_payload"
    | "scope_mismatch"
    | "expired"
    | "ok";
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

function shouldUseCrossSiteCookieMode(request?: Request) {
  if (!request) return process.env.NODE_ENV === "production";

  const forwardedProto = request.headers.get("x-forwarded-proto")?.toLowerCase();
  if (forwardedProto) {
    return forwardedProto.includes("https");
  }

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export function createSessionCookie(scope: SessionScope, token: string, expiresAt: Date, request?: Request) {
  const isSecure = shouldUseCrossSiteCookieMode(request);
  const secure = isSecure ? "; Secure" : "";
  const sameSite = isSecure ? "None" : "Lax";
  const partitioned = isSecure ? "; Partitioned" : "";
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return `${getCookieName(scope)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}; Expires=${expiresAt.toUTCString()}${secure}${partitioned}`;
}

export function clearSessionCookie(scope: SessionScope, request?: Request) {
  const isSecure = shouldUseCrossSiteCookieMode(request);
  const secure = isSecure ? "; Secure" : "";
  const sameSite = isSecure ? "None" : "Lax";
  const partitioned = isSecure ? "; Partitioned" : "";
  return `${getCookieName(scope)}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}${partitioned}`;
}

export function inspectSessionFromRequest(request: Request, scope: SessionScope): SessionValidationDebug {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieHeader(cookieHeader);
  const cookieName = getCookieName(scope);
  const token = cookies.get(cookieName);

  if (!cookieHeader) {
    return {
      scope,
      cookieName,
      hasCookieHeader: false,
      hasSessionCookie: false,
      hasToken: false,
      hasBody: false,
      hasSignature: false,
      signatureMatches: false,
      payloadValid: false,
      payloadScope: "unknown",
      scopeMatches: false,
      expiresAtMs: null,
      notExpired: false,
      authenticated: false,
      reason: "missing_cookie_header",
    };
  }

  if (!cookies.has(cookieName)) {
    return {
      scope,
      cookieName,
      hasCookieHeader: true,
      hasSessionCookie: false,
      hasToken: false,
      hasBody: false,
      hasSignature: false,
      signatureMatches: false,
      payloadValid: false,
      payloadScope: "unknown",
      scopeMatches: false,
      expiresAtMs: null,
      notExpired: false,
      authenticated: false,
      reason: "missing_session_cookie",
    };
  }

  if (!token) {
    return {
      scope,
      cookieName,
      hasCookieHeader: true,
      hasSessionCookie: true,
      hasToken: false,
      hasBody: false,
      hasSignature: false,
      signatureMatches: false,
      payloadValid: false,
      payloadScope: "unknown",
      scopeMatches: false,
      expiresAtMs: null,
      notExpired: false,
      authenticated: false,
      reason: "missing_token",
    };
  }

  const [body, providedSignature] = token.split(".");
  if (!body || !providedSignature) {
    return {
      scope,
      cookieName,
      hasCookieHeader: true,
      hasSessionCookie: true,
      hasToken: true,
      hasBody: Boolean(body),
      hasSignature: Boolean(providedSignature),
      signatureMatches: false,
      payloadValid: false,
      payloadScope: "unknown",
      scopeMatches: false,
      expiresAtMs: null,
      notExpired: false,
      authenticated: false,
      reason: "invalid_token_format",
    };
  }

  const expectedSignature = sign(body);
  const sameLength = providedSignature.length === expectedSignature.length;
  const signatureMatches =
    sameLength && crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));

  if (!signatureMatches) {
    return {
      scope,
      cookieName,
      hasCookieHeader: true,
      hasSessionCookie: true,
      hasToken: true,
      hasBody: true,
      hasSignature: true,
      signatureMatches: false,
      payloadValid: false,
      payloadScope: "unknown",
      scopeMatches: false,
      expiresAtMs: null,
      notExpired: false,
      authenticated: false,
      reason: "signature_mismatch",
    };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload;
    const expiresAtMs = payload.exp * 1000;
    const notExpired = expiresAtMs > Date.now();
    const scopeMatches = payload.scope === scope;
    const authenticated = scopeMatches && notExpired;

    return {
      scope,
      cookieName,
      hasCookieHeader: true,
      hasSessionCookie: true,
      hasToken: true,
      hasBody: true,
      hasSignature: true,
      signatureMatches: true,
      payloadValid: true,
      payloadScope: payload.scope,
      scopeMatches,
      expiresAtMs,
      notExpired,
      authenticated,
      reason: authenticated ? "ok" : scopeMatches ? "expired" : "scope_mismatch",
    };
  } catch {
    return {
      scope,
      cookieName,
      hasCookieHeader: true,
      hasSessionCookie: true,
      hasToken: true,
      hasBody: true,
      hasSignature: true,
      signatureMatches: true,
      payloadValid: false,
      payloadScope: "unknown",
      scopeMatches: false,
      expiresAtMs: null,
      notExpired: false,
      authenticated: false,
      reason: "invalid_payload",
    };
  }
}

export function logSessionDebug(request: Request, label: string, debug: SessionValidationDebug) {
  console.info(`[auth] ${label}`, {
    method: request.method,
    path: new URL(request.url).pathname,
    origin: request.headers.get("origin"),
    userAgent: request.headers.get("user-agent"),
    ...debug,
  });
}

export function getSessionFromRequest(request: Request, scope: SessionScope) {
  return inspectSessionFromRequest(request, scope).authenticated;
}
