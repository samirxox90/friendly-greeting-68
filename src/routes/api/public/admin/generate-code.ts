import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateAccessCode } from "@/lib/assets.server";
import { getSessionFromRequest } from "@/lib/session.server";
import { jsonResponse } from "@/lib/http.server";

const inputSchema = z.object({
  scope: z.enum(["main", "admin"]),
  durationMs: z.number().int().min(60_000).max(2_592_000_000),
});

export const Route = createFileRoute("/api/public/admin/generate-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!getSessionFromRequest(request, "admin")) {
          return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
        }

        const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) {
          return jsonResponse({ ok: false, error: "Invalid payload." }, 400);
        }

        const result = await generateAccessCode(parsed.data);
        return jsonResponse({ ok: true, ...result });
      },
    },
  },
});
