import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminConfig, saveAdminConfig } from "@/lib/assets.server";
import { inspectSessionFromRequest, logSessionDebug } from "@/lib/session.server";
import { jsonResponse } from "@/lib/http.server";

const configSchema = z.object({
  mainPassword: z.string().min(3).max(64),
  adminPassword: z.string().min(3).max(64),
  patterns: z.array(
    z.object({
      id: z.string().uuid().optional(),
      region: z.enum(["SG", "NA", "EU"]),
      event_type: z.enum(["TW", "FW", "DW", "O", "MS", "STORE"]),
      label: z.string().min(1).max(100),
      pattern: z.string().min(10).max(500),
      sort_order: z.number().int().min(0).max(9999),
      is_active: z.boolean(),
    }),
  ),
  templates: z.array(
    z.object({
      id: z.string().uuid().optional(),
      event_type: z.enum(["TW", "FW", "DW", "O", "MS"]),
      template_word: z.string().min(1).max(80),
      is_active: z.boolean(),
    }),
  ),
});

export const Route = createFileRoute("/api/public/admin/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const sessionDebug = inspectSessionFromRequest(request, "admin");
        if (!sessionDebug.authenticated) {
          logSessionDebug(request, "admin/config GET unauthorized", sessionDebug);
          return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
        }

        const data = await getAdminConfig();
        return jsonResponse({ ok: true, ...data });
      },
      PUT: async ({ request }) => {
        const sessionDebug = inspectSessionFromRequest(request, "admin");
        if (!sessionDebug.authenticated) {
          logSessionDebug(request, "admin/config PUT unauthorized", sessionDebug);
          return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
        }

        const parsed = configSchema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) {
          return jsonResponse({ ok: false, error: "Invalid payload." }, 400);
        }

        await saveAdminConfig(parsed.data);
        return jsonResponse({ ok: true });
      },
    },
  },
});
