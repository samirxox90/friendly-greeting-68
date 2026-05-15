import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkLinks, generateLinks, generateLinksInputSchema } from "@/lib/assets.server";
import { inspectSessionFromRequest, logSessionDebug } from "@/lib/session.server";
import { jsonResponse } from "@/lib/http.server";

const schema = z.object({
  input: generateLinksInputSchema,
  checkLinks: z.boolean().default(true),
});

export const Route = createFileRoute("/api/public/app/generate-links")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestStart = Date.now();
        const sessionDebug = inspectSessionFromRequest(request, "main");
        if (!sessionDebug.authenticated) {
          logSessionDebug(request, "app/generate-links unauthorized", sessionDebug);
          return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
        }

        const parsed = schema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) {
          return jsonResponse({ ok: false, error: "Invalid request payload." }, 400);
        }

        const generated = await generateLinks(parsed.data.input);
        if (!parsed.data.checkLinks) {
          return jsonResponse({
            ok: true,
            links: generated.links,
            generatedCount: generated.links.length,
            checkDurationMs: 0,
            totalDurationMs: Date.now() - requestStart,
          });
        }

        const checkStart = Date.now();
        const checked = await checkLinks(generated.links.map((item) => item.url));
        const checkDurationMs = Date.now() - checkStart;
        const statusByUrl = new Map(checked.map((item) => [item.url, item]));

        const merged = generated.links.map((item) => ({
          ...item,
          check: statusByUrl.get(item.url) ?? { url: item.url, ok: false, status: null },
        }));

        return jsonResponse({
          ok: true,
          links: merged,
          generatedCount: generated.links.length,
          checkDurationMs,
          totalDurationMs: Date.now() - requestStart,
        });
      },
    },
  },
});
