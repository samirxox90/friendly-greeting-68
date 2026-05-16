import { createFileRoute } from "@tanstack/react-router";
import crypto from "node:crypto";
import { z } from "zod";
import { checkLinks, generateLinks, generateLinksInputSchema } from "@/lib/assets.server";
import { inspectSessionFromRequest, logSessionDebug } from "@/lib/session.server";
import { jsonResponse } from "@/lib/http.server";

const schema = z.object({
  input: generateLinksInputSchema,
  checkLinks: z.boolean().default(true),
  linkFormat: z.enum(["all", "tabOnly"]).default("all"),
  mode: z.enum(["sync", "async"]).default("sync"),
});

type LinkResult = Awaited<ReturnType<typeof generateLinks>>["links"][number] & {
  check: { url: string; ok: boolean; status: number | null };
};

type LinkJob = {
  id: string;
  status: "running" | "done" | "error";
  createdAtMs: number;
  startedAtMs: number;
  finishedAtMs: number | null;
  total: number;
  processed: number;
  links: LinkResult[];
  generatedCount: number;
  checkDurationMs: number;
  totalDurationMs: number;
  error: string | null;
};

const jobs = new Map<string, LinkJob>();
const JOB_TTL_MS = 1000 * 60 * 10;

function cleanupExpiredJobs() {
  const now = Date.now();
  jobs.forEach((job, id) => {
    if (now - job.createdAtMs > JOB_TTL_MS) jobs.delete(id);
  });
}

export const Route = createFileRoute("/api/public/app/generate-links")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        cleanupExpiredJobs();
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

        const runJob = async (job?: LinkJob) => {
          const generated = await generateLinks(parsed.data.input);
          const filteredLinks =
            parsed.data.linkFormat === "tabOnly"
              ? generated.links.filter((item) => {
                  const source = `${item.label} ${item.url} ${item.eventType}`.toLowerCase();
                  return source.includes("tab");
                })
              : generated.links;

          if (job) {
            job.total = filteredLinks.length;
            job.generatedCount = filteredLinks.length;
          }

          if (!parsed.data.checkLinks) {
            const noCheckLinks = filteredLinks.map((item) => ({
              ...item,
              check: { url: item.url, ok: true, status: null },
            }));

            return {
              links: noCheckLinks,
              generatedCount: filteredLinks.length,
              checkDurationMs: 0,
              totalDurationMs: Date.now() - requestStart,
            };
          }

          const checkStart = Date.now();
          const checked = await checkLinks(filteredLinks.map((item) => item.url), {
            onProgress: ({ processed, total }) => {
              if (!job) return;
              job.processed = processed;
              job.total = total;
            },
          });
          const checkDurationMs = Date.now() - checkStart;
          const statusByUrl = new Map(checked.map((item) => [item.url, item]));

          const merged = filteredLinks.map((item) => ({
            ...item,
            check: statusByUrl.get(item.url) ?? { url: item.url, ok: false, status: null },
          }));

          return {
            links: merged,
            generatedCount: filteredLinks.length,
            checkDurationMs,
            totalDurationMs: Date.now() - requestStart,
          };
        };

        if (parsed.data.mode === "async") {
          const id = crypto.randomUUID();
          const job: LinkJob = {
            id,
            status: "running",
            createdAtMs: Date.now(),
            startedAtMs: Date.now(),
            finishedAtMs: null,
            total: 0,
            processed: 0,
            links: [],
            generatedCount: 0,
            checkDurationMs: 0,
            totalDurationMs: 0,
            error: null,
          };
          jobs.set(id, job);

          void runJob(job)
            .then((result) => {
              job.status = "done";
              job.finishedAtMs = Date.now();
              job.links = result.links;
              job.generatedCount = result.generatedCount;
              job.checkDurationMs = result.checkDurationMs;
              job.totalDurationMs = result.totalDurationMs;
              job.processed = job.total;
            })
            .catch((error: unknown) => {
              job.status = "error";
              job.finishedAtMs = Date.now();
              job.error = error instanceof Error ? error.message : "Failed to generate links.";
            });

          return jsonResponse({ ok: true, jobId: id });
        }

        const result = await runJob();
        return jsonResponse({
          ok: true,
          links: result.links,
          generatedCount: result.generatedCount,
          checkDurationMs: result.checkDurationMs,
          totalDurationMs: result.totalDurationMs,
        });
      },
      GET: async ({ request }) => {
        cleanupExpiredJobs();
        const sessionDebug = inspectSessionFromRequest(request, "main");
        if (!sessionDebug.authenticated) {
          logSessionDebug(request, "app/generate-links status unauthorized", sessionDebug);
          return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
        }

        const jobId = new URL(request.url).searchParams.get("jobId");
        if (!jobId) {
          return jsonResponse({ ok: false, error: "Missing jobId" }, 400);
        }

        const job = jobs.get(jobId);
        if (!job) {
          return jsonResponse({ ok: false, error: "Run not found or expired." }, 404);
        }

        const elapsedMs = (job.finishedAtMs ?? Date.now()) - job.startedAtMs;
        const estimatedRemainingMs =
          job.status === "running" && job.total > 0 && job.processed > 0
            ? Math.max(0, Math.round((elapsedMs / job.processed) * (job.total - job.processed)))
            : null;

        return jsonResponse({
          ok: true,
          status: job.status,
          processed: job.processed,
          total: job.total,
          elapsedMs,
          estimatedRemainingMs,
          error: job.error,
          links: job.status === "done" ? job.links : undefined,
          generatedCount: job.status === "done" ? job.generatedCount : undefined,
          checkDurationMs: job.status === "done" ? job.checkDurationMs : undefined,
          totalDurationMs: job.status === "done" ? job.totalDurationMs : undefined,
        });
      },
    },
  },
});
