export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });
}

export function parseJsonSafe<T>(raw: unknown, fallback: T): T {
  if (raw && typeof raw === "object") return raw as T;
  return fallback;
}
