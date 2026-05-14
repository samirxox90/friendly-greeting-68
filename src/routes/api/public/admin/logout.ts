import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie } from "@/lib/session.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/public/admin/logout")({
  server: {
    handlers: {
      POST: async () => {
        return jsonResponse({ ok: true }, 200, {
          "Set-Cookie": clearSessionCookie("admin"),
        });
      },
    },
  },
});
