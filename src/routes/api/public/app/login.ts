import { createFileRoute } from "@tanstack/react-router";
import { createSessionCookie, createSessionToken } from "@/lib/session.server";
import { jsonResponse } from "@/lib/http.server";
import { isPasswordValid } from "@/lib/assets.server";

export const Route = createFileRoute("/api/public/app/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { password?: string };
        const password = String(body.password ?? "").trim();

        if (!password) {
          return jsonResponse({ ok: false, error: "Password is required." }, 400);
        }

        const validation = await isPasswordValid("main", password);
        if (!validation.valid) {
          return jsonResponse({ ok: false, error: "Invalid password." }, 401);
        }

        const token = createSessionToken("main", validation.expiresAt);
        console.info("[auth] app/login success", {
          method: request.method,
          path: new URL(request.url).pathname,
          origin: request.headers.get("origin"),
          expiresAt: validation.expiresAt.toISOString(),
        });
        return jsonResponse(
          { ok: true, expiresAt: validation.expiresAt.toISOString() },
          200,
          { "Set-Cookie": createSessionCookie("main", token, validation.expiresAt) },
        );
      },
    },
  },
});
