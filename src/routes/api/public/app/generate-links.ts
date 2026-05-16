import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkLinks, generateLinks, generateLinksInputSchema } from "@/lib/assets.server";
import { inspectSessionFromRequest, logSessionDebug } from "@/lib/session.server";
import { jsonResponse } from "@/lib/http.server";

const schema = z.object({
  input: generateLinksInputSchema,
  checkLinks: z.boolean().default(true),
  linkFormat: z.enum(["all", "tabOnly"]).default("all"),
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
        const filteredLinks =
          parsed.data.linkFormat === "tabOnly"
            ? generated.links.filter((item) => {
                const source = `${item.label} ${item.url} ${item.eventType}`.toLowerCase();
                return source.includes("tab");
              })
            : generated.links;

        if (!parsed.data.checkLinks) {
          return jsonResponse({
            ok: true,
            links: filteredLinks,
            generatedCount: filteredLinks.length,
            checkDurationMs: 0,
            totalDurationMs: Date.now() - requestStart,
          });
        }

        const checkStart = Date.now();
        const checked = await checkLinks(filteredLinks.map((item) => item.url));
        const checkDurationMs = Date.now() - checkStart;
        const statusByUrl = new Map(checked.map((item) => [item.url, item]));

        const merged = filteredLinks.map((item) => ({
          ...item,
          check: statusByUrl.get(item.url) ?? { url: item.url, ok: false, status: null },
        }));

        return jsonResponse({
          ok: true,
          links: merged,
          generatedCount: filteredLinks.length,
          checkDurationMs,
          totalDurationMs: Date.now() - requestStart,
        });
      },
    },
  },
});
